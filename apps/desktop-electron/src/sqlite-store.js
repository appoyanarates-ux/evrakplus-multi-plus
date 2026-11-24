import fs from 'node:fs';
import path from 'node:path';

async function loadCoreSchema() {
  const packagedUrl = new URL('../packages/core-schema/src/index.js', import.meta.url);
  if (fs.existsSync(packagedUrl)) return import(packagedUrl.href);
  return import('../../../packages/core-schema/src/index.js');
}

let coreSchemaMod = await loadCoreSchema();

let DatabaseSyncCtor = null;
try {
  const sqliteMod = await import('node:sqlite');
  DatabaseSyncCtor = sqliteMod.DatabaseSync;
} catch {
  // Electron 34 (Node 20) gibi node:sqlite olmayan ortamlarda atomik yerel dosya deposuna gec
  DatabaseSyncCtor = null;
}

/**
 * EvrakPlus Yerel Proje Veri Tabanı Deposu.
 * Node 22.5+/24 ortamlarında yerleşik `node:sqlite` (WAL modu),
 * Electron 34 (Node 20) ortamlarında sıfır-bağımlılık atomik yerel JSON-DB kullanır.
 */
export class SqliteProjectStore {
  constructor(dbPath) {
    this.dbPath = dbPath;
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.backend = DatabaseSyncCtor ? 'sqlite' : 'atomic-json';
    if (DatabaseSyncCtor) {
      this.db = new DatabaseSyncCtor(dbPath);
      this._initSchema();
    } else {
      this.jsonPath = dbPath.endsWith('.json') ? dbPath : `${dbPath}.json`;
      this.state = this._loadJsonState();
    }
  }

  _loadJsonState() {
    try {
      if (fs.existsSync(this.jsonPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.jsonPath, 'utf8'));
        return {
          projects: parsed.projects || {},
          solutions: parsed.solutions || {},
          auditLogs: parsed.auditLogs || [],
          syncState: parsed.syncState || {}
        };
      }
    } catch {
      // ignore corrupted cache and start clean
    }
    return { projects: {}, solutions: {}, auditLogs: [], syncState: {} };
  }

  _flushJsonState() {
    const tmp = `${this.jsonPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2), 'utf8');
    fs.renameSync(tmp, this.jsonPath);
  }

  _initSchema() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        schema_version INTEGER NOT NULL,
        revision INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS solution_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        engine TEXT NOT NULL,
        status TEXT NOT NULL,
        quality_score REAL NOT NULL DEFAULT 0,
        elapsed_ms INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        placements_json TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        detail TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  saveProject(rawProject) {
    const { sanitizeBackupJson, validateProjectSchema, migrateProject } = coreSchemaMod;
    const project = migrateProject(rawProject);
    const check = validateProjectSchema(project);
    if (!check.valid) {
      throw new Error(`Proje doğrulama hatası: ${check.errors.join('; ')}`);
    }
    const clean = sanitizeBackupJson(project);
    const now = new Date().toISOString();
    clean.updatedAt = now;

    if (this.db) {
      const stmt = this.db.prepare(`
        INSERT INTO projects (id, name, schema_version, revision, updated_at, payload_json)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          schema_version = excluded.schema_version,
          revision = excluded.revision,
          updated_at = excluded.updated_at,
          payload_json = excluded.payload_json
      `);
      stmt.run(
        clean.id,
        clean.school.name || 'İsimsiz Okul',
        clean.schemaVersion,
        clean.revision || 1,
        now,
        JSON.stringify(clean)
      );
    } else {
      this.state.projects[clean.id] = clean;
      this._flushJsonState();
    }
    this.logAudit('PROJECT_SAVE', `projectId=${clean.id} rev=${clean.revision}`);
    return clean;
  }

  loadProject(projectId) {
    if (this.db) {
      const row = this.db.prepare('SELECT payload_json FROM projects WHERE id = ?').get(projectId);
      return row ? JSON.parse(row.payload_json) : null;
    }
    return this.state.projects[projectId] ? structuredClone(this.state.projects[projectId]) : null;
  }

  listProjects() {
    if (this.db) {
      return this.db.prepare(
        'SELECT id, name, schema_version AS schemaVersion, revision, updated_at AS updatedAt FROM projects ORDER BY updated_at DESC'
      ).all();
    }
    return Object.values(this.state.projects)
      .map(p => ({
        id: p.id,
        name: p.school?.name || 'İsimsiz Okul',
        schemaVersion: p.schemaVersion || 3,
        revision: p.revision || 1,
        updatedAt: p.updatedAt || ''
      }))
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  deleteProject(projectId) {
    let deleted = false;
    if (this.db) {
      const info = this.db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
      deleted = info.changes > 0;
    } else if (this.state.projects[projectId]) {
      delete this.state.projects[projectId];
      delete this.state.solutions[projectId];
      this._flushJsonState();
      deleted = true;
    }
    this.logAudit('PROJECT_DELETE', `projectId=${projectId}`);
    return deleted;
  }

  saveSolutionHistory(projectId, { engine, status, qualityScore = 0, elapsedMs = 0, placements = {} }) {
    const now = new Date().toISOString();
    if (this.db) {
      const info = this.db.prepare(`
        INSERT INTO solution_history (project_id, engine, status, quality_score, elapsed_ms, created_at, placements_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(projectId, engine, status, qualityScore, elapsedMs, now, JSON.stringify(placements));
      return Number(info.lastInsertRowid);
    }
    const list = this.state.solutions[projectId] || [];
    const id = list.length + 1;
    list.unshift({ id, projectId, engine, status, qualityScore, elapsedMs, createdAt: now, placements });
    this.state.solutions[projectId] = list.slice(0, 50);
    this._flushJsonState();
    return id;
  }

  listSolutionHistory(projectId, limit = 20) {
    if (this.db) {
      return this.db.prepare(`
        SELECT id, project_id AS projectId, engine, status, quality_score AS qualityScore,
               elapsed_ms AS elapsedMs, created_at AS createdAt, placements_json AS placementsJson
        FROM solution_history
        WHERE project_id = ?
        ORDER BY id DESC
        LIMIT ?
      `).all(projectId, limit).map(r => ({
        ...r,
        placements: JSON.parse(r.placementsJson),
        placementsJson: undefined
      }));
    }
    return (this.state.solutions[projectId] || []).slice(0, limit);
  }

  logAudit(action, detail = '') {
    const now = new Date().toISOString();
    if (this.db) {
      this.db.prepare('INSERT INTO audit_logs (action, detail, created_at) VALUES (?, ?, ?)').run(action, detail, now);
    } else {
      this.state.auditLogs.push({ action, detail, createdAt: now });
      if (this.state.auditLogs.length > 500) this.state.auditLogs.shift();
      this._flushJsonState();
    }
  }

  setSyncMeta(key, value) {
    const now = new Date().toISOString();
    if (this.db) {
      this.db.prepare(`
        INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run(key, String(value), now);
    } else {
      this.state.syncState[key] = { value: String(value), updatedAt: now };
      this._flushJsonState();
    }
  }

  getSyncMeta(key) {
    if (this.db) {
      const row = this.db.prepare('SELECT value FROM sync_state WHERE key = ?').get(key);
      return row ? row.value : null;
    }
    return this.state.syncState[key]?.value ?? null;
  }

  close() {
    if (this.db) this.db.close();
  }
}
