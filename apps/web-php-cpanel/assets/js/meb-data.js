/* =========================================================================
 * EvrakPlus Ders Dağıtım Multi Plus v1.0.0 — MEB Müfredat Verileri & Tarayıcı Temel Çözücüsü
 * Tüm TTKB zorunlu/seçmeli çizelgeleri, 11 okul türü, branş/kısa ad kuralları ve
 * çevrimdışı/önizleme temel tarayıcı çözücüsü (Web Worker) burada tutulur.
 * ========================================================================= */
(function (root) {
  'use strict';
  const EP = (root.EP = root.EP || {});

  /* ---------- Tarayıcı Temel Çözücüsü (Sınırlı Mod / Web Worker + Yerel Doğrulama) ---------- */
  function CORE() {
    function make(m) {
      const D = m.D, P = m.P, N = D * P, blocks = m.blocks, classes = m.classes, teachers = m.teachers, rules = m.rules, B = blocks.length, nC = classes.length, nT = teachers.length, nSj = m.nSj, nL = Math.max(1, m.nL);
      const cOcc = new Int32Array(Math.max(1, nC) * N).fill(-1), tOcc = new Int32Array(Math.max(1, nT) * N).fill(-1);
      const tDay = new Int16Array(Math.max(1, nT) * D), lDay = new Int16Array(nL * D), csd = new Int16Array(Math.max(1, nC) * Math.max(1, nSj) * D);
      const pos = new Int32Array(B).fill(-1), lb = new Int16Array(nL);
      for (const b of blocks) lb[b.l]++;
      const partners = Array.from({ length: Math.max(1, nSj) }, () => []);
      for (const pr of rules.pairs || []) {
        const a = pr[0], b = pr[1];
        if (a >= 0 && b >= 0 && a !== b && a < partners.length && b < partners.length) {
          partners[a].push(b); partners[b].push(a);
        }
      }
      const forbid = rules.forbid || {};
      const lunchAfter = rules.noLunch && m.lunchAfter > 0 && m.lunchAfter < P ? m.lunchAfter : 0;
      const cands = blocks.map(b => {
        const r = [], fb = forbid[b.sj] || [];
        for (let d = 0; d < D; d++) {
          for (let p = 0; p + b.len <= P; p++) {
            if (lunchAfter > 0 && b.len > 1 && p < lunchAfter && p + b.len > lunchAfter) continue;
            let ok = true;
            for (let k = 0; k < b.len && ok; k++) {
              const s = d * P + p + k;
              if (classes[b.c][s]) ok = false;
              else if (b.t >= 0 && teachers[b.t].av[s] === 1) ok = false;
              else if (fb.indexOf(p + k) >= 0) ok = false;
            }
            if (ok) r.push(d * P + p);
          }
        }
        return r;
      });
      const allow = cands.map(cs => { const a = new Uint8Array(N); for (const s of cs) a[s] = 1; return a; });
      let W = { tg: 3, bal: 2, noise: 2 };

      function valid(i, s) {
        if (s < 0 || s >= N || !allow[i][s]) return false;
        const b = blocks[i], d = (s / P) | 0, p = s - d * P, L = b.len;
        if (p + L > P) return false;
        const cb = b.c * N;
        for (let k = 0; k < L; k++) if (cOcc[cb + s + k] !== -1) return false;
        if (b.t >= 0) {
          const T = teachers[b.t], tb = b.t * N;
          for (let k = 0; k < L; k++) if (tOcc[tb + s + k] !== -1) return false;
          if (tDay[b.t * D + d] + L > T.dmax) return false;
          if (T.cmax > 0) {
            let run = L;
            for (let q = p - 1; q >= 0 && tOcc[tb + d * P + q] !== -1; q--) run++;
            for (let q = p + L; q < P && tOcc[tb + d * P + q] !== -1; q++) run++;
            if (run > T.cmax) return false;
          }
        }
        if (rules.diff && lb[b.l] <= D && lDay[b.l * D + d] > 0) return false;
        if (b.sj >= 0 && b.sj < partners.length) {
          const pr = partners[b.sj];
          for (let k = 0; k < pr.length; k++) if (csd[(b.c * nSj + pr[k]) * D + d] > 0) return false;
        }
        return true;
      }

      function why(i, s) {
        const b = blocks[i], d = (s / P) | 0, p = s - d * P, L = b.len;
        if (lunchAfter > 0 && L > 1 && p < lunchAfter && p + L > lunchAfter) return 'lunch';
        if (s < 0 || s >= N || !allow[i][s] || p + L > P) return 'allow';
        const cb = b.c * N;
        for (let k = 0; k < L; k++) if (cOcc[cb + s + k] !== -1) return 'cls';
        if (b.t >= 0) {
          const T = teachers[b.t], tb = b.t * N;
          for (let k = 0; k < L; k++) { const x = tOcc[tb + s + k]; if (x !== -1) return 'tch:' + x; }
          if (tDay[b.t * D + d] + L > T.dmax) return 'dmax';
          if (T.cmax > 0) {
            let run = L;
            for (let q = p - 1; q >= 0 && tOcc[tb + d * P + q] !== -1; q--) run++;
            for (let q = p + L; q < P && tOcc[tb + d * P + q] !== -1; q++) run++;
            if (run > T.cmax) return 'cmax';
          }
        }
        if (rules.diff && lb[b.l] <= D && lDay[b.l * D + d] > 0) return 'diff';
        if (b.sj >= 0 && b.sj < partners.length) {
          const pr = partners[b.sj];
          for (let k = 0; k < pr.length; k++) if (csd[(b.c * nSj + pr[k]) * D + d] > 0) return 'pair';
        }
        return '';
      }

      function place(i, s) {
        const b = blocks[i], d = (s / P) | 0;
        for (let k = 0; k < b.len; k++) { cOcc[b.c * N + s + k] = i; if (b.t >= 0) tOcc[b.t * N + s + k] = i; }
        if (b.t >= 0) tDay[b.t * D + d] += b.len;
        lDay[b.l * D + d]++;
        if (b.sj >= 0) csd[(b.c * nSj + b.sj) * D + d]++;
        pos[i] = s;
      }

      function unplace(i) {
        const s = pos[i]; if (s < 0) return;
        const b = blocks[i], d = (s / P) | 0;
        for (let k = 0; k < b.len; k++) { cOcc[b.c * N + s + k] = -1; if (b.t >= 0) tOcc[b.t * N + s + k] = -1; }
        if (b.t >= 0) tDay[b.t * D + d] -= b.len;
        lDay[b.l * D + d]--;
        if (b.sj >= 0) csd[(b.c * nSj + b.sj) * D + d]--;
        pos[i] = -1;
      }

      function gaps(occ, base, d) {
        let f = -1, l = -1, n = 0;
        for (let p = 0; p < P; p++) if (occ[base + d * P + p] !== -1) { if (f < 0) f = p; l = p; n++; }
        return f < 0 ? 0 : l - f + 1 - n;
      }
      function penT(t) {
        if (t < 0) return 0;
        let g = 0, pf = 0; const base = t * N, av = teachers[t].av;
        for (let d = 0; d < D; d++) g += gaps(tOcc, base, d);
        for (let s = 0; s < N; s++) if (av[s] === 2 && tOcc[base + s] !== -1) pf++;
        return g * W.tg + pf * 10;
      }
      function penC(c) { let g = 0; for (let d = 0; d < D; d++) g += gaps(cOcc, c * N, d); return g * 4; }
      function total() { let x = 0; for (let t = 0; t < nT; t++) x += penT(t); for (let c = 0; c < nC; c++) x += penC(c); return x; }

      function score(i, s) {
        const b = blocks[i], d = (s / P) | 0, p = s - d * P;
        let x = Math.random() * W.noise;
        if (b.t >= 0) {
          const av = teachers[b.t].av, tb = b.t * N;
          for (let k = 0; k < b.len; k++) if (av[s + k] === 2) x += 8;
          if (tDay[b.t * D + d] > 0) {
            const adj = (p > 0 && tOcc[tb + s - 1] !== -1) || (p + b.len < P && tOcc[tb + s + b.len] !== -1);
            x += adj ? -W.tg : W.tg * 0.6;
          } else x += W.bal;
        }
        const cb = b.c * N;
        if (!(p === 0 || p + b.len === P || (p > 0 && cOcc[cb + s - 1] !== -1) || (p + b.len < P && cOcc[cb + s + b.len] !== -1))) x += 1;
        return x;
      }

      function solve(o, prog, onBest) {
        let lastB = 0;
        const sendBest = (arr, n, force) => {
          if (!onBest || !arr) return;
          const now = Date.now();
          if (!force && now - lastB < 350) return;
          lastB = now;
          onBest(Array.from(arr), n);
        };
        W = { tg: o.prio === 'gaps' ? 3 : 1, bal: o.prio === 'gaps' ? 2 : 0, noise: 2 };
        const t0 = Date.now(), lim = o.time || 20000, phaseEnd = t0 + Math.max(800, Math.min(4000, lim * 0.35));
        let nodes = 0, bt = 0, budget = 300, restarts = 0, stop = false, lastP = 0, dropped = 0;
        const isFixed = new Uint8Array(B);
        for (const k in (o.fixed || {})) {
          const i = +k, s = o.fixed[k];
          if (i < B && valid(i, s)) { place(i, s); isFixed[i] = 1; } else dropped++;
        }
        const nb = blocks.map((b, i) => {
          const r = [];
          for (let j = 0; j < B; j++) if (j !== i && (blocks[j].c === b.c || (b.t >= 0 && blocks[j].t === b.t))) r.push(j);
          return r;
        });
        const cnt = new Int32Array(B), skip = new Uint8Array(B), hint = o.hint || {};
        const recount = i => { let n = 0; const cs = cands[i]; for (let k = 0; k < cs.length; k++) if (valid(i, cs[k])) n++; cnt[i] = n; return n; };
        let placedN = 0; for (let i = 0; i < B; i++) if (pos[i] !== -1) placedN++;
        for (let i = 0; i < B; i++) if (pos[i] === -1 && recount(i) === 0) skip[i] = 1;
        const byC = Array.from({ length: nC }, () => []); blocks.forEach((b, i) => byC[b.c].push(i));
        const fullC = new Uint8Array(nC);
        for (let c = 0; c < nC; c++) {
          let open = 0, h = 0;
          for (let s = 0; s < N; s++) if (!classes[c][s]) open++;
          for (const j of byC[c]) h += blocks[j].len;
          fullC[c] = h === open && h > 0 ? 1 : 0;
        }
        const cov = new Uint8Array(N);
        function covOk(c) {
          cov.fill(0); const L = byC[c];
          for (let a = 0; a < L.length; a++) {
            const j = L[a]; if (pos[j] !== -1 || skip[j]) continue;
            const cs = cands[j], len = blocks[j].len;
            for (let k = 0; k < cs.length; k++) { const s = cs[k]; if (valid(j, s)) for (let q = 0; q < len; q++) cov[s + q] = 1; }
          }
          const cb = c * N;
          for (let s = 0; s < N; s++) if (!classes[c][s] && cOcc[cb + s] === -1 && !cov[s]) return false;
          return true;
        }
        for (let c = 0; c < nC; c++) if (fullC[c] && !covOk(c)) fullC[c] = 0;
        let best = -1, bestPos = null;
        const cntS = new Int32Array(N);
        function slotPick() {
          let bC = -1, bS = -1, bN = 1e9;
          for (let c = 0; c < nC; c++) {
            if (!fullC[c]) continue;
            cntS.fill(0); const L = byC[c]; let any = false;
            for (let a = 0; a < L.length; a++) {
              const j = L[a]; if (pos[j] !== -1 || skip[j]) continue;
              any = true; const cs = cands[j], len = blocks[j].len;
              for (let k = 0; k < cs.length; k++) { const st = cs[k]; if (valid(j, st)) for (let q = 0; q < len; q++) cntS[st + q]++; }
            }
            if (!any) continue;
            const cb = c * N;
            for (let x = 0; x < N; x++) {
              if (classes[c][x] || cOcc[cb + x] !== -1) continue;
              const n = cntS[x]; if (n < bN) { bN = n; bC = c; bS = x; if (n === 0) return { c, s: x, n: 0 }; }
            }
          }
          return bC < 0 ? null : { c: bC, s: bS, n: bN };
        }
        function dfs() {
          if (stop) return false;
          if ((++nodes & 255) === 0) {
            const now = Date.now();
            if (now > phaseEnd) { stop = true; return false; }
            if (prog && now - lastP > 150) { lastP = now; prog({ placed: Math.max(best, placedN), total: B, nodes, restarts, ms: now - t0 }); }
          }
          if (placedN > best) { best = placedN; bestPos = Int32Array.from(pos); sendBest(bestPos, best); }
          let bi = -1, bc = 1e9;
          for (let i = 0; i < B; i++) {
            if (pos[i] !== -1 || skip[i]) continue;
            const c = cnt[i]; if (c === 0) return false;
            if (c < bc || (c === bc && blocks[i].len > blocks[bi].len)) { bc = c; bi = i; }
          }
          if (bi < 0) return true;
          let opts = null; const sp = slotPick();
          if (sp) {
            if (sp.n === 0) return false;
            if (sp.n < bc) {
              opts = []; const L = byC[sp.c];
              for (let a = 0; a < L.length; a++) {
                const j = L[a]; if (pos[j] !== -1 || skip[j]) continue;
                const len = blocks[j].len, cs = cands[j];
                for (let k = 0; k < cs.length; k++) { const st = cs[k]; if (st <= sp.s && sp.s < st + len && valid(j, st)) opts.push([hint[j] === st ? -1e6 : score(j, st), j, st]); }
              }
            }
          }
          if (!opts) {
            opts = []; const cs = cands[bi];
            for (let k = 0; k < cs.length; k++) { const st = cs[k]; if (valid(bi, st)) opts.push([hint[bi] === st ? -1e6 : score(bi, st), bi, st]); }
          }
          opts.sort((a, b) => a[0] - b[0]);
          for (let v = 0; v < opts.length; v++) {
            const j = opts[v][1], st = opts[v][2], nbs = nb[j];
            place(j, st); placedN++; let dead = false;
            for (let k = 0; k < nbs.length; k++) { const q = nbs[k]; if (pos[q] === -1 && !skip[q] && recount(q) === 0) dead = true; }
            if (!dead && dfs()) return true;
            unplace(j); placedN--;
            for (let k = 0; k < nbs.length; k++) { const q = nbs[k]; if (pos[q] === -1 && !skip[q]) recount(q); }
            if (stop) return false;
            if (++bt > budget) return false;
          }
          return false;
        }
        while (!stop) {
          for (let i = 0; i < B; i++) if (pos[i] === -1 && !skip[i]) recount(i);
          bt = 0;
          if (dfs()) {
            const r = { status: 'ok', pos: Array.from(pos), best: placedN, total: B, nodes, restarts, ms: Date.now() - t0, dropped, skipped: 0 };
            let sk = 0; for (let i = 0; i < B; i++) if (skip[i]) sk++;
            if (sk) { r.status = 'partial'; r.skipped = sk; }
            if (prog) prog({ placed: placedN, total: B, nodes, restarts, ms: r.ms });
            return r;
          }
          for (let i = 0; i < B; i++) if (!isFixed[i] && pos[i] !== -1) { unplace(i); placedN--; }
          restarts++; budget = Math.floor(budget * 1.35) + 50;
        }
        if (bestPos) for (let i = 0; i < B; i++) if (!isFixed[i] && bestPos[i] >= 0 && pos[i] === -1 && valid(i, bestPos[i])) place(i, bestPos[i]);
        const byL = Array.from({ length: nL }, () => []); blocks.forEach((b, i) => byL[b.l].push(i));
        const unpl = []; for (let i = 0; i < B; i++) if (pos[i] === -1 && cands[i].length) unpl.push(i);
        let bestUn = unpl.length, bestP = Int32Array.from(pos);
        sendBest(bestP, B - bestUn, true);
        const tabu = new Int32Array(B); let it = 0; const end = t0 + lim;
        function evictSet(u, st) {
          const b = blocks[u], d = (st / P) | 0, set = new Set();
          for (let k = 0; k < b.len; k++) {
            const x = cOcc[b.c * N + st + k]; if (x >= 0) set.add(x);
            if (b.t >= 0) { const y = tOcc[b.t * N + st + k]; if (y >= 0) set.add(y); }
          }
          if (rules.diff && lb[b.l] <= D) {
            const L = byL[b.l];
            for (let a = 0; a < L.length; a++) { const j = L[a]; if (j !== u && pos[j] >= 0 && ((pos[j] / P) | 0) === d) set.add(j); }
          }
          if (b.sj >= 0 && b.sj < partners.length && partners[b.sj].length) {
            const L = byC[b.c];
            for (let a = 0; a < L.length; a++) { const j = L[a]; if (pos[j] >= 0 && ((pos[j] / P) | 0) === d && partners[b.sj].indexOf(blocks[j].sj) >= 0) set.add(j); }
          }
          return set;
        }
        while (unpl.length && Date.now() < end) {
          it++; const ui = (Math.random() * unpl.length) | 0, u = unpl[ui], cs = cands[u];
          let bSt = -1, bE = null, bV = 1e9;
          for (let k = 0; k < cs.length; k++) {
            const st = cs[k], E = evictSet(u, st); let bad = false, v = Math.random() * 0.6;
            for (const e of E) { if (isFixed[e]) { bad = true; break; } v += 1 + blocks[e].len * 0.2 + (tabu[e] > it ? 4 : 0); }
            if (bad || v >= bV) continue;
            const old = []; for (const e of E) { old.push([e, pos[e]]); unplace(e); }
            const ok = valid(u, st);
            for (let q = old.length - 1; q >= 0; q--) place(old[q][0], old[q][1]);
            if (ok) { bV = v; bSt = st; bE = E; }
          }
          if (bSt < 0) continue;
          for (const e of bE) { unplace(e); unpl.push(e); }
          place(u, bSt); tabu[u] = it + 10; unpl.splice(unpl.indexOf(u), 1);
          for (let k = unpl.length - 1; k >= 0; k--) {
            const j = unpl[k], cj = cands[j]; let bs = -1, bv = 1e9;
            for (let q = 0; q < cj.length; q++) { const st = cj[q]; if (valid(j, st)) { const v = score(j, st); if (v < bv) { bv = v; bs = st; } } }
            if (bs >= 0) { place(j, bs); tabu[j] = it + 10; unpl.splice(k, 1); }
          }
          if (unpl.length < bestUn) { bestUn = unpl.length; bestP = Int32Array.from(pos); sendBest(bestP, B - bestUn, true); }
          if (prog && (it & 15) === 0) {
            const now = Date.now();
            if (now - lastP > 150) { lastP = now; prog({ placed: B - bestUn - countNo(), total: B, nodes: nodes + it, restarts, ms: now - t0 }); }
          }
        }
        function countNo() { let n = 0; for (let i = 0; i < B; i++) if (!cands[i].length) n++; return n; }
        const noC = countNo(), pl = B - bestUn - noC;
        return { status: bestUn === 0 && noC === 0 ? 'ok' : 'partial', pos: Array.from(bestP), best: pl, total: B, nodes: nodes + it, restarts, ms: Date.now() - t0, dropped, skipped: noC };
      }

      function improve(o, start, prog) {
        W = { tg: o.prio === 'gaps' ? 3 : 1, bal: 0, noise: 0 };
        for (let i = 0; i < B; i++) if (start[i] >= 0 && valid(i, start[i])) place(i, start[i]);
        const fixed = new Uint8Array(B); for (const k in (o.fixed || {})) fixed[+k] = 1;
        const sib = blocks.map((b, i) => {
          const r = []; for (let j = 0; j < B; j++) if (j !== i && blocks[j].c === b.c && blocks[j].len === b.len && !fixed[j]) r.push(j); return r;
        });
        const mov = []; for (let i = 0; i < B; i++) if (pos[i] >= 0 && !fixed[i]) mov.push(i);
        const t0 = Date.now(), lim = o.time || 6000, first = total(); let it = 0, lastP = 0;
        while (mov.length && Date.now() - t0 < lim) {
          it++; const i = mov[(Math.random() * mov.length) | 0], b = blocks[i];
          if (Math.random() < 0.4) {
            const old = pos[i]; unplace(i); let bs = old, bv = Infinity; const cs = cands[i];
            for (let k = 0; k < cs.length; k++) { const s = cs[k]; if (!valid(i, s)) continue; place(i, s); const v = penT(b.t) + penC(b.c) + Math.random() * 0.01; unplace(i); if (v < bv) { bv = v; bs = s; } }
            place(i, bs);
          } else {
            const sl = sib[i]; if (!sl.length) continue;
            const j = sl[(Math.random() * sl.length) | 0]; if (pos[j] < 0 || pos[i] < 0) continue;
            const bj = blocks[j], si = pos[i], sj = pos[j];
            const pb = penT(b.t) + (bj.t !== b.t ? penT(bj.t) : 0) + penC(b.c);
            unplace(i); unplace(j); let ok = false;
            if (valid(i, sj)) { place(i, sj); if (valid(j, si)) { place(j, si); ok = true; } else unplace(i); }
            if (ok) { const pa = penT(b.t) + (bj.t !== b.t ? penT(bj.t) : 0) + penC(b.c); if (pa <= pb) continue; unplace(i); unplace(j); }
            place(i, si); place(j, sj);
          }
          if (prog && (it & 127) === 0) { const now = Date.now(); if (now - lastP > 200) { lastP = now; prog({ pen: total(), first, it, ms: now - t0 }); } }
        }
        return { pos: Array.from(pos), pen: total(), first, it, ms: Date.now() - t0 };
      }

      return { valid, why, place, unplace, pos, cands, solve, improve, total, penT, penC };
    }

    function expand(m, choice) {
      var blocks = [], bid = [];
      m.cards.forEach(function (cd, ci) {
        var pat = cd.pats[choice[ci]] || cd.pats[0];
        pat.forEach(function (len, k) {
          blocks.push({ c: cd.c, t: cd.t, len: Math.min(len, m.P), l: cd.l, sj: cd.sj, ci: ci });
          bid.push(cd.id + ':' + k);
        });
      });
      return { blocks: blocks, bid: bid };
    }

    function solveAuto(m, o, prog, onBest) {
      var t0 = Date.now(), lim = o.time || 20000, choice = m.cards.map(function (c) { return c.ch; }), fixedId = o.fixedId || {}, frozen = {}, hintId = Object.assign({}, o.hintId || {}), last = null, round = 0;
      for (var id0 in fixedId) frozen[id0.split(':')[0]] = 1;
      var pre = 0;
      while (pre++ < 50) {
        var ex0 = expand(m, choice), cs0 = make(Object.assign({}, m, ex0)).cands, adv = false;
        ex0.blocks.forEach(function (b, i) {
          var c = m.cards[b.ci];
          if (!cs0[i].length && !frozen[c.id] && choice[b.ci] < c.pats.length - 1 && !adv) { choice[b.ci]++; adv = true; }
        });
        if (!adv) break;
      }
      while (true) {
        round++;
        var ex = expand(m, choice), mm = Object.assign({}, m, ex), fixed = {}, hint = {};
        ex.bid.forEach(function (id, i) { if (fixedId[id] != null) fixed[i] = fixedId[id]; else if (hintId[id] != null) hint[i] = hintId[id]; });
        var rem = lim - (Date.now() - t0), anyAlt = m.cards.some(function (c, ci) { return !frozen[c.id] && choice[ci] < c.pats.length - 1; }), ch = choice.slice();
        var r = make(mm).solve({ prio: o.prio, time: Math.max(500, anyAlt ? Math.max(1500, rem * 0.45) : rem), fixed: fixed, hint: hint }, prog, onBest ? function (pos, n) { onBest(pos, n, ex.bid, ch); } : null);
        r.bid = ex.bid; r.choice = ch; r.rounds = round;
        if (r.status === 'ok') return r;
        if (!last || (r.total - r.best) < (last.total - last.best)) last = r;
        if (Date.now() - t0 > lim - 200 || !anyAlt) return last;
        var un = {}, changed = false;
        r.pos.forEach(function (s, i) { if (s < 0) un[mm.blocks[i].ci] = 1; });
        for (var k in un) {
          var ci = +k, c = m.cards[ci]; if (frozen[c.id]) continue;
          if (choice[ci] < c.pats.length - 1) { choice[ci]++; changed = true; for (var hid in hintId) if (hid.split(':')[0] === c.id) delete hintId[hid]; }
        }
        if (!changed) return last;
        r.pos.forEach(function (s, i) { var cc = mm.blocks[i].ci; if (s >= 0 && choice[cc] === ch[cc]) hintId[ex.bid[i]] = s; });
      }
    }

    return { make: make, expand: expand, solveAuto: solveAuto };
  }

  const CX = CORE();
  const WSRC = 'const CORE=' + CORE.toString() + ';onmessage=function(e){var d=e.data,m=d.m,o=d.o;' +
    'if(d.cmd==="solve"){var r=CORE().solveAuto(m,o,function(p){postMessage({type:"prog",p:p})},function(pos,n,bid,ch){postMessage({type:"best",pos:pos,n:n,bid:bid,choice:ch})});postMessage({type:"done",r:r})}' +
    'if(d.cmd==="improve"){var r2=CORE().make(m).improve(o,o.start,function(p){postMessage({type:"iprog",p:p})});postMessage({type:"idone",r:r2})}' +
    'if(d.cmd==="relax"){var out=[];for(var q=0;q<o.list.length;q++){var ti=o.list[q];var mm=Object.assign({},m,{teachers:m.teachers.map(function(t,i){return i===ti?Object.assign({},t,{av:t.av.map(function(v){return v===1?0:v})}):t})});' +
    'var rr=CORE().make(mm).solve({prio:o.prio,time:o.each,fixed:o.fixed},null);out.push({ti:ti,ok:rr.status==="ok",placed:rr.best,total:rr.total});postMessage({type:"rprog",done:q+1,total:o.list.length})}postMessage({type:"rdone",out:out})}};';
  let WURL = null;
  function newWorker() {
    if (!WURL) WURL = URL.createObjectURL(new Blob([WSRC], { type: 'text/javascript' }));
    return new Worker(WURL);
  }

  /* ---------- Uygulama Sabitleri & 18 Menü ---------- */
  const EVRAKPLUS_LOGIN_URL = 'https://www.evrakplus.com/giris';
  const EVRAKPLUS_SITE_URL = 'https://www.evrakplus.com/';
  const GUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const GK = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const DONEM = ['', '1. Dönem', '2. Dönem', 'Yıllık'];

  const MENUS = [
    ['dashboard', 'Ana Panel'],
    ['school', 'Okul Ayarları'],
    ['teachers', 'Öğretmenler'],
    ['classes', 'Sınıflar ve Şubeler'],
    ['subjects', 'Dersler ve Bloklar'],
    ['assignments', 'Ders Görevlendirmeleri'],
    ['constraints', 'Kural ve Kısıt Yönetimi'],
    ['auto_schedule', 'Dağıtım ve Program'],
    ['timetables', 'Haftalık Ders Programları'],
    ['analytics', 'Analiz ve İstatistikler'],
    ['duty', 'Okul Nöbeti'],
    ['reports', 'Raporlar ve Çıktılar'],
    ['backup_sync', 'Yedekleme ve Senkronizasyon'],
    ['account', 'EvrakPlus Hesabım'],
    ['system', 'Sistem ve Güncellemeler'],
    ['help', 'Yardım ve Destek']
  ];

  /* 32 canlı, birbirinden keskin biçimde ayırt edilen ders rengi: [açık arka plan, canlı vurgu şeridi, koyu arka plan, koyu vurgu] */
  const VIVID_PALETTE = [
    ['#ffd1dc', '#e11d48', '#5c1428', '#fb7185'], // 0  Kırmızı-Pembe
    ['#bae6fd', '#0284c7', '#0c3a5c', '#38bdf8'], // 1  Canlı Gök Mavisi
    ['#bbf7d0', '#16a34a', '#0f4725', '#4ade80'], // 2  Zümrüt Yeşili
    ['#fde68a', '#d97706', '#543408', '#fbbf24'], // 3  Altın Sarısı
    ['#ddd6fe', '#7c3aed', '#341c6b', '#a78bfa'], // 4  Canlı Mor
    ['#fed7aa', '#ea580c', '#5e2609', '#fb923c'], // 5  Turuncu
    ['#99f6e4', '#0d9488', '#0a4440', '#2dd4bf'], // 6  Turkuaz
    ['#f5d0fe', '#c026d3', '#52155c', '#e879f9'], // 7  Fuşya / Eflatun
    ['#d9f99d', '#65a30d', '#2b4709', '#a3e635'], // 8  Limon Yeşili
    ['#c7d2fe', '#4f46e5', '#212266', '#818cf8'], // 9  Çivit Mavisi
    ['#fecaca', '#dc2626', '#5c1616', '#f87171'], // 10 Parlak Kırmızı
    ['#a5f3fc', '#0891b2', '#0b4252', '#22d3ee'], // 11 Camgöbeği
    ['#fbcfe8', '#db2777', '#5c1439', '#f472b6'], // 12 Şeker Pembe
    ['#fef08a', '#ca8a04', '#4d3c07', '#facc15'], // 13 Limon Sarısı
    ['#a7f3d0', '#059669', '#0a4733', '#34d399'], // 14 Nane Yeşili
    ['#bfdbfe', '#2563eb', '#122f6b', '#60a5fa'], // 15 Kobalt Mavi
    ['#e9d5ff', '#9333ea', '#411869', '#c084fc'], // 16 Lavanta Mor
    ['#fdba74', '#c2410c', '#5c2208', '#fb923c'], // 17 Mandalina
    ['#67e8f9', '#0e7490', '#0a3e4d', '#22d3ee'], // 18 Okyanus Camgöbeği
    ['#86efac', '#15803d', '#0d4222', '#4ade80'], // 19 Çimen Yeşili
    ['#fda4af', '#be123c', '#591224', '#fb7185'], // 20 Mercan Kırmızı
    ['#93c5fd', '#1d4ed8', '#112a63', '#60a5fa'], // 21 Kraliyet Mavisi
    ['#fcd34d', '#b45309', '#4f2c07', '#fbbf24'], // 22 Kehribar
    ['#c4b5fd', '#6d28d9', '#2e1663', '#a78bfa'], // 23 Menekşe
    ['#5eead4', '#0f766e', '#083d39', '#2dd4bf'], // 24 Deniz Yeşili
    ['#f0abfc', '#a21caf', '#4d1357', '#e879f9'], // 25 Orkide
    ['#bef264', '#4d7c0f', '#243d08', '#a3e635'], // 26 Fıstık Yeşili
    ['#a5b4fc', '#4338ca', '#1e1d5e', '#818cf8'], // 27 Gece Mavisi
    ['#fca5a5', '#b91c1c', '#541414', '#f87171'], // 28 Yakut
    ['#7dd3fc', '#0369a1', '#0a3754', '#38bdf8'], // 29 Buz Mavisi
    ['#f9a8d4', '#be185d', '#541133', '#f472b6'], // 30 Gül Pembe
    ['#6ee7b7', '#047857', '#083d2c', '#34d399']  // 31 Çam Yeşili
  ];

  const STAFF_ROLES = [
    ['ogretmen', 'Öğretmen'],
    ['mudur_yardimcisi', 'Müdür Yardımcısı (Öğretmen nöbeti tutmaz)'],
    ['mudur', 'Okul Müdürü (Nöbet tutmaz)'],
    ['rehber', 'Rehber Öğretmen / PDR (Nöbetten muaf)']
  ];

  /* MEB Türkiye Yüzyılı Maarif Modeli Zorunlu 8 Kulüp + 5 Ana Tema / EK-4 Sosyal Kulüpler */
  const SOCIAL_CLUB_GROUPS = [
    {
      group: 'Zorunlu Temel Kulüpler (MEB — Tüm Okullarda)',
      mandatory: true,
      clubs: [
        'Kızılay Kulübü',
        'Yeşilay Kulübü',
        'Beyazay Kulübü',
        'Siberay Kulübü',
        'Tarih ve Kültürel Miras Kulübü',
        'Tabiat ve Yaşanabilir Çevre Kulübü',
        'Sağlıklı Yaşam ve Fiziksel Aktivite Kulübü',
        'Yaşam Becerileri Kulübü'
      ]
    },
    {
      group: 'Kültür Dünyamız',
      clubs: [
        'Kültür ve Edebiyat Kulübü',
        'Kütüphanecilik Kulübü',
        'Gezi, Tanıtma ve Turizm Kulübü',
        'Yayın ve İletişim Kulübü',
        'Münazara ve Hitabet Kulübü',
        'Değerler Eğitimi Kulübü',
        'Demokrasi, İnsan Hakları ve Yurttaşlık Kulübü',
        'Felsefe ve Düşünce Eğitimi Kulübü',
        'Yabancı Dil ve Uluslararası Projeler (eTwinning) Kulübü'
      ]
    },
    {
      group: 'Sanat',
      clubs: [
        'Müzik Kulübü',
        'Görsel Sanatlar ve Resim Kulübü',
        'Tiyatro ve Drama Kulübü',
        'Fotoğrafçılık ve Sinema Kulübü',
        'Halk Oyunları Kulübü',
        'Geleneksel El Sanatları Kulübü'
      ]
    },
    {
      group: 'Spor',
      clubs: [
        'Spor Kulübü',
        'Satranç ve Akıl-Zekâ Oyunları Kulübü',
        'İzcilik ve Doğa Sporları Kulübü',
        'Geleneksel Çocuk Oyunları Kulübü'
      ]
    },
    {
      group: 'Bilim ve Teknoloji',
      clubs: [
        'Bilim, Fen ve Teknoloji Kulübü',
        'Bilişim, Robotik Kodlama ve Yapay Zekâ Kulübü',
        'Matematik Kulübü',
        'Havacılık ve Uzay Bilimleri Kulübü',
        'Girişimcilik ve Kariyer Planlama Kulübü',
        'Enerji Verimliliği ve İklim Değişikliği Kulübü'
      ]
    },
    {
      group: 'Doğa, Çevre ve Toplum',
      clubs: [
        'Afet Hazırlık ve Sivil Savunma Kulübü',
        'Trafik Güvenliği ve İlk Yardım Kulübü',
        'Sosyal Dayanışma ve Yardımlaşma Kulübü',
        'Bilinçli Tüketici ve Kooperatifçilik Kulübü',
        'Hayvanları Koruma Kulübü'
      ]
    }
  ];
  const SOCIAL_CLUBS = SOCIAL_CLUB_GROUPS.flatMap(g => g.clubs);

  const ENGINE_META = [
    { id: 'ortools', name: 'Google OR-Tools CP-SAT', role: 'Ana yüksek performanslı CP-SAT motoru' },
    { id: 'timefold', name: 'Timefold Solver', role: 'Alternatif meta-sezgisel & kalite iyileştirme' },
    { id: 'choco', name: 'Choco Solver', role: 'Karmaşık kısıtlar ve etki analizi' },
    { id: 'minizinc', name: 'MiniZinc (Gecode/Chuffed)', role: 'Alternatif CP modelleme altyapısı' },
    { id: 'scip', name: 'SCIP (MILP)', role: 'Matematiksel tamsayılı optimizasyon & dual sınır' },
    { id: 'highs', name: 'HiGHS (MIP/MILP)', role: 'Yüksek hızlı doğrusal/tamsayılı çözücü' }
  ];

  const SOLVER_MODES = [
    ['smart', 'Akıllı Otomatik (Önerilen)'],
    ['single', 'Tek Motor'],
    ['sequential', 'Sıralı (Hızlı → İyileştirici)'],
    ['parallel', 'Paralel (Çoklu Motor Yarışı)'],
    ['hybrid', 'Hibrit (OR-Tools → Timefold)'],
    ['ultimate', 'Ultimate (Tüm Motorlar En İyi Seçim)']
  ];

  const TIME_PRESETS = [
    [10, '10 saniye (hızlı)'],
    [30, '30 saniye'],
    [120, '2 dakika'],
    [300, '5 dakika'],
    [600, '10 dakika'],
    [1800, '30 dakika'],
    [3600, '60 dakika'],
    [0, 'Durdurulana kadar (üst sınır 3 saat)']
  ];

  const ROOM_TYPES = [
    ['classroom', 'Standart Derslik'],
    ['science_lab', 'Fen / Bilim Laboratuvarı'],
    ['computer_lab', 'Bilişim / BT Sınıfı'],
    ['workshop', 'Atölye / Meslek Laboratuvarı'],
    ['gym', 'Spor Salonu'],
    ['music_room', 'Müzik Odası'],
    ['art_room', 'Görsel Sanatlar Atölyesi'],
    ['library', 'Kütüphane / Çok Amaçlı Salon']
  ];

  /* ---------- MEB Haftalık Ders Çizelgeleri (TTKB + Düzenlenebilir Taslaklar) ---------- */
  const SRC = {
    ilk: 'https://ttkb.meb.gov.tr/meb_iys_dosyalar/2026_09/6aba1693eaf3b700797496_%C4%B0lk%C3%B6%C4%9Fretim_Kurumlar%C4%B1_%C4%B0lkokul_ve_Ortaokul_Haftal%C4%B1k_Ders_%C3%87izelgesi_115.pdf',
    iho: 'https://ttkb.meb.gov.tr/meb_iys_dosyalar/2026_09/6aba17a6dc024113739147_%C4%B0mam_Hatip_Ortaokulu_Haftal%C4%B1k_Ders_%C3%87izelgesi_117.pdf',
    lise: 'https://ttkb.meb.gov.tr/meb_iys_dosyalar/2025_05/20144001_202505.pdf',
    aihl: 'https://ttkb.meb.gov.tr/meb_iys_dosyalar/2025_08/05103624_202526.pdf',
    liste: 'https://ttkb.meb.gov.tr/www/haftalik-ders-cizelgeleri/kategori/7'
  };

  const GRP = {
    OZEL: 'Okulun eklediği seçmeli dersler',
    ITB: 'İnsan, Toplum ve Bilim',
    DAD: 'Din, Ahlak ve Değer',
    KSS: 'Kültür, Sanat ve Spor',
    AKD: 'Akademik Çalışmalar',
    TIB: 'Temel İslam Bilimleri',
    TIS: 'Türk İslam Sanatları'
  };

  const POOL_ILK = [
    ['Matematik ve Bilim Uygulamaları', 'ITB', 2, '|2|2|'], ['Okuma Becerileri', 'ITB', 2, '2|2||'], ['Yazarlık ve Yazma Becerileri', 'ITB', 4, '1/2|1/2|1/2|2'], ['Yaşayan Diller ve Lehçeler', 'ITB', 4, '2|2|2|2'],
    ['Yabancı Dil (seçmeli)', 'ITB', 4, '2|2|2|2'], ['Çevre Eğitimi ve İklim Değişikliği', 'ITB', 1, '|2|2|2'], ['“Şehrimiz…”', 'ITB', 1, '1/2|1/2|1/2|2'], ['Hukuk ve Adalet', 'ITB', 1, '|2|2|2'], ['Düşünme Eğitimi', 'ITB', 2, '||1/2|2'],
    ['Robotik Kodlama', 'ITB', 2, '2|2||'], ['Yapay Zekâ Uygulamaları', 'ITB', 2, '||2|2'], ['Proje Tasarımı ve Uygulamaları', 'ITB', 3, '1/2|1/2|1/2|'], ['Okul Temelli Sosyal Sorumluluk Çalışmaları', 'ITB', 3, '|2|2|2'],
    ['Medya Okuryazarlığı', 'ITB', 1, '||2|2'], ['Afet Bilinci', 'ITB', 2, '1/2|1/2|1/2|'], ['Temel Yaşam Becerileri', 'ITB', 2, '1/2|1/2|1/2|2'], ['Türk Sosyal Hayatında Aile', 'ITB', 1, '2|2|2|2'],
    ["Kur'an-ı Kerim", 'DAD', 4, '2|2|2|2'], ['Peygamberimizin Hayatı', 'DAD', 4, '2|2|2|2'], ['Temel Dinî Bilgiler', 'DAD', 2, '1/2|1/2|1/2|2'], ['Kültür ve Medeniyetimize Yön Verenler', 'DAD', 2, '2|2|2|2'], ['Ahlak ve Vatandaşlık Eğitimi', 'DAD', 2, '1/2|1/2|1/2|2'],
    ['Görgü Kuralları ve Nezaket', 'KSS', 2, '2|2|2|2'], ['Müzik (seçmeli)', 'KSS', 4, '1/2|1/2|1/2|2'], ['Spor ve Fiziki Etkinlikler', 'KSS', 4, '2|2|2|2'], ['Oyun ve Oyun Etkinlikleri', 'KSS', 2, '1/2|1/2|1/2|'],
    ['Dijital Sanatlar', 'KSS', 2, '|1/2|1/2|'], ['Masal ve Destanlarımız', 'KSS', 2, '1/2|1/2|1/2|2'], ['Geleneksel Sanatlar', 'KSS', 2, '|1/2|1/2|'], ['Halk Oyunları', 'KSS', 4, '2|2|2|2']
  ];

  const POOL_IHO = [
    ['Matematik ve Bilim Uygulamaları', 'ITB', 2, '|1|1|'], ['Okuma Becerileri', 'ITB', 2, '1|1||'], ['Yazarlık ve Yazma Becerileri', 'ITB', 4, '1|1|1|1'], ['Yaşayan Diller ve Lehçeler', 'ITB', 4, '1|1|1|1/2'],
    ['Yabancı Dil (seçmeli)', 'ITB', 4, '1|1|1|1/2'], ['Çevre Eğitimi ve İklim Değişikliği', 'ITB', 1, '|1|1|1'], ['“Şehrimiz…”', 'ITB', 1, '1|1|1|1'], ['Hukuk ve Adalet', 'ITB', 1, '|1|1|1'], ['Düşünme Eğitimi', 'ITB', 2, '||1|1'],
    ['Robotik Kodlama', 'ITB', 2, '1|1||'], ['Yapay Zekâ Uygulamaları', 'ITB', 2, '||1|1/2'], ['Proje Tasarımı ve Uygulamaları', 'ITB', 3, '1|1|1|'], ['Okul Temelli Sosyal Sorumluluk Çalışmaları', 'ITB', 2, '|1|1|1/2'],
    ['Medya Okuryazarlığı', 'ITB', 1, '||1|1'], ['Afet Bilinci', 'ITB', 2, '1|1|1|'], ['Temel Yaşam Becerileri', 'ITB', 2, '1|1|1|1'], ['Türk Sosyal Hayatında Aile', 'ITB', 1, '1|1|1|1'],
    ["Kur'an-ı Kerim (seçmeli)", 'DAD', 4, '1|1|1|1/2'], ['Kültür ve Medeniyetimize Yön Verenler', 'DAD', 2, '1|1|1|1'], ['Ahlak ve Vatandaşlık Eğitimi', 'DAD', 2, '1|1|1|1'],
    ['Görgü Kuralları ve Nezaket', 'KSS', 2, '1|1|1|1'], ['Müzik (seçmeli)', 'KSS', 4, '1|1|1|1'], ['Spor ve Fiziki Etkinlikler', 'KSS', 4, '1|1|1|1'], ['Oyun ve Oyun Etkinlikleri', 'KSS', 2, '1|1|1|'],
    ['Dijital Sanatlar', 'KSS', 2, '|1|1|'], ['Masal ve Destanlarımız', 'KSS', 2, '1|1|1|1'], ['Geleneksel Sanatlar', 'KSS', 2, '|1|1|'], ['Halk Oyunları', 'KSS', 4, '1|1|1|1']
  ];

  const POOL_AL = [
    ['Seçmeli Matematik', 'AKD', 2, '||6|6'], ['Temel Matematik', 'AKD', 2, '||2|2'], ['Seçmeli Fizik', 'AKD', 2, '||4|4'], ['Seçmeli Kimya', 'AKD', 2, '||4|4'], ['Seçmeli Biyoloji', 'AKD', 2, '||4|4'],
    ['Seçmeli Türk Dili ve Edebiyatı', 'AKD', 2, '||3/5|3/5'], ['Seçmeli Tarih', 'AKD', 1, '||2/4|2/4'], ['Çağdaş Türk ve Dünya Tarihi', 'AKD', 1, '|||2'], ['Seçmeli Coğrafya', 'AKD', 2, '||2/4|2/4'], ['Psikoloji', 'AKD', 1, '||2|2'],
    ['Sosyoloji', 'AKD', 1, '||2|2'], ['Mantık', 'AKD', 1, '||2|2'], ['Seçmeli Birinci Yabancı Dil', 'AKD', 2, '||2/10/12|2/10/12'], ['Hedef Temelli Destek Eğitimi', 'AKD', 1, '|||3/4/5/6'],
    ['Fen Bilimleri Uygulamaları', 'ITB', 2, '||2/3|2/3'], ['Matematik Uygulamaları', 'ITB', 2, '||2/3|2/3'], ['Astronomi ve Uzay Bilimleri', 'ITB', 1, '1/2|1/2|1/2|1/2'], ['Sosyal Bilim Çalışmaları', 'ITB', 2, '2/3|2/3|2/3|2/3'],
    ['Bilişim Teknolojileri ve Yazılım (seçmeli)', 'ITB', 4, '1|1/2/3|1/2/3|1/2/3'], ['Proje Tasarımı ve Uygulamaları', 'ITB', 4, '2/3/4|2/3/4|2/3/4|2/3/4'], ['Düşünme Eğitimi', 'ITB', 1, '1/2|1/2||'],
    ['Demokrasi ve İnsan Hakları', 'ITB', 1, '1/2|1/2|1/2|1/2'], ['Sürdürülebilir Tarım ve Gıda Güvenliği', 'ITB', 1, '|1/2|1/2|'], ['İklim, Çevre ve Yenilikçi Çözümler', 'ITB', 1, '|1/2|1/2|'], ['Temel Hukuk Bilgisi', 'ITB', 1, '|1/2|1/2|1/2'],
    ['Girişimcilik', 'ITB', 1, '||1/2|1/2'], ['Metin Tahlilleri', 'ITB', 2, '1/2|1/2|1/2|'], ['Seçmeli İkinci Yabancı Dil', 'ITB', 4, '1/2/4|1/2/4|1/2/4|1/2/4'], ['Osmanlı Türkçesi', 'ITB', 3, '2|2|2|2'],
    ['Türk Dünyası Coğrafyası', 'ITB', 1, '|1/2|1/2|'], ['Ortak Türk Edebiyatı', 'ITB', 1, '|1/2|1/2|'], ['Ortak Türk Tarihi', 'ITB', 1, '|1/2|1/2|'],
    ["Kur'an-ı Kerim", 'DAD', 4, '2|2|2|2'], ["Kur'an-ı Kerim'in Anlam Dünyası", 'DAD', 2, '||2|2'], ['Peygamberimizin Hayatı', 'DAD', 4, '1/2|1/2|1/2|1/2'], ['Temel Dinî Bilgiler', 'DAD', 2, '1/2|1/2|1/2|1/2'],
    ['Türk Düşünce Tarihi', 'DAD', 1, '|1/2|1/2|1/2'], ['Klasik Ahlak Metinleri', 'DAD', 3, '1/2|1/2|1/2|1/2'],
    ['Adabımuaşeret', 'KSS', 1, '1|1||'], ['Türk Sosyal Hayatında Aile', 'KSS', 1, '1/2|1/2|1/2|1/2'], ['İslam Bilim Tarihi', 'KSS', 1, '1/2|1/2|1/2|1/2'], ['Türk Kültür ve Medeniyet Tarihi', 'KSS', 1, '2|2|2|2'],
    ['İslam Kültür ve Medeniyeti', 'KSS', 1, '1/2|1/2|1/2|1/2'], ['Spor Eğitimi', 'KSS', 3, '1/2/3|1/2/3|1/2|1/2'], ['Sanat Eğitimi', 'KSS', 3, '1/2/3|1/2/3|1/2|1/2']
  ];
  const POOL_FEN = [...POOL_AL.filter(x => !/^Seçmeli (Matematik|Fizik|Kimya|Biyoloji)$|^Temel Matematik$/.test(x[0])), ['Genetik Bilimine Giriş', 'ITB', 1, '||2/3|2/3'], ['Tıp Bilimine Giriş', 'ITB', 1, '||2/3|2/3']];
  const POOL_SBL = POOL_AL.filter(x => !/^Seçmeli (Matematik|Fizik|Kimya|Biyoloji|Tarih|Coğrafya)$|^Temel Matematik$|^Psikoloji$|^Sosyoloji$|^Mantık$|^Çağdaş|^Osmanlı|^Sosyal Bilim/.test(x[0])).concat([['Edebiyat Uygulamaları', 'ITB', 4, '2|2|1/2|2']]);
  const POOL_AIHL = [
    ['Arapça (Metin Mütalaası)', 'TIB', 2, '||1/2|1/2'], ['Fıkhi Okumalar', 'TIB', 1, '||1/2|1/2'], ['Hadis Metinleri', 'TIB', 1, '||1/2|1/2'], ['İslam Ahlakı', 'TIB', 1, '||1|1'], ['İslam Bilim Tarihi', 'TIB', 1, '||1/2|1/2'],
    ['İslam Felsefesi', 'TIB', 1, '||1/2|1/2'], ['İslam Tarihi', 'TIB', 1, '||1/2|1/2'], ["Kur'an Okuma Teknikleri", 'TIB', 2, '||1/2|1/2'], ["Kur'an'ın Ana Konuları", 'TIB', 2, '||1/2|1/2'], ['Mesleki Uygulama', 'TIB', 1, '||1/2|1/2'],
    ['Tasavvuf Kültürü', 'TIB', 1, '||1|1'], ['Tefsir Okumaları', 'TIB', 1, '||1/2|1/2'], ['Klasik Ahlak Metinleri', 'TIB', 2, '||1/2|1/2'],
    ['Dini Musiki', 'TIS', 1, '||1/2|1/2'], ['Ebru', 'TIS', 1, '||1/2|1/2'], ['Hüsnühat', 'TIS', 1, '||1/2|1/2'], ['Tezhip', 'TIS', 1, '||1/2|1/2'],
    ['Seçmeli Matematik', 'AKD', 2, '||3/4/5/6|3/4/5/6'], ['Temel Matematik', 'AKD', 2, '||2|2'], ['Seçmeli Biyoloji', 'AKD', 2, '||2/3/4|2/3/4'], ['Seçmeli Fizik', 'AKD', 2, '||3/4|3/4'], ['Seçmeli Kimya', 'AKD', 2, '||3/4|3/4'],
    ['Seçmeli Türk Dili ve Edebiyatı', 'AKD', 2, '||2/3/4/5|2/3/4/5'], ['Seçmeli Tarih', 'AKD', 1, '|||2/4'], ['Çağdaş Türk ve Dünya Tarihi', 'AKD', 1, '|||2'], ['Seçmeli Coğrafya', 'AKD', 2, '||2/4|2/4'], ['Psikoloji', 'AKD', 1, '||2|2'],
    ['Sosyoloji', 'AKD', 2, '||2|2'], ['Mantık', 'AKD', 1, '||2|2'], ['Seçmeli Birinci Yabancı Dil', 'AKD', 2, '||2/10/12|2/10/12'], ['Hedef Temelli Destek Eğitimi', 'AKD', 1, '|||3/4/5/6'],
    ['Fen Bilimleri Uygulamaları', 'ITB', 2, '||2/3|2/3'], ['Astronomi ve Uzay Bilimleri', 'ITB', 1, '||1/2|1/2'], ['Sosyal Bilim Çalışmaları', 'ITB', 2, '||2/3/4|2/3/4'], ['Bilişim Teknolojileri ve Yazılım (seçmeli)', 'ITB', 4, '||1/2/3|1/2/3'],
    ['Proje Tasarımı ve Uygulamaları', 'ITB', 3, '||2/3/4|2/3/4'], ['Düşünme Eğitimi', 'ITB', 1, '||1|'], ['Demokrasi ve İnsan Hakları', 'ITB', 1, '||1|'], ['Sürdürülebilir Tarım ve Gıda Güvenliği', 'ITB', 1, '||1/2|1/2'],
    ['İklim, Çevre ve Yenilikçi Çözümler', 'ITB', 1, '||1/2|1/2'], ['Temel Hukuk Bilgisi', 'ITB', 1, '||1/2|1/2'], ['Girişimcilik', 'ITB', 1, '||1/2|1/2'], ['Metin Tahlilleri', 'ITB', 2, '||1/2|1/2'],
    ['Seçmeli İkinci Yabancı Dil', 'ITB', 4, '||2/4|2/4'], ['Osmanlı Türkçesi (seçmeli)', 'ITB', 3, '||2|2'], ['Türk Dünyası Coğrafyası', 'ITB', 1, '||1/2|1/2'], ['Ortak Türk Edebiyatı', 'ITB', 1, '||1/2|1/2'],
    ['Ortak Türk Tarihi', 'ITB', 1, '||1/2|1/2'], ['Türk Düşünce Tarihi', 'ITB', 1, '||1/2|1/2'],
    ['Türk Kültür ve Medeniyet Tarihi', 'KSS', 1, '||2/4|2/4'], ['Adabımuaşeret', 'KSS', 1, '||1/2|1/2'], ['Türk Sosyal Hayatında Aile', 'KSS', 1, '||1/2|1/2'], ['Spor Eğitimi', 'KSS', 3, '||1/2/3|1/2/3'], ['Sanat Eğitimi', 'KSS', 3, '||1/2/3|1/2/3']
  ];

  const Z_LISE_ORTAK = (tde, dkab, tar, ink, cog, mat, fiz, kim, biy, fel, yd) => [
    ['Türk Dili ve Edebiyatı', tde], ['Din Kültürü ve Ahlak Bilgisi', dkab], ['Tarih', tar], ['T.C. İnkılap Tarihi ve Atatürkçülük', ink], ['Coğrafya', cog],
    ['Matematik', mat], ['Fizik', fiz], ['Kimya', kim], ['Biyoloji', biy], ['Felsefe', fel], ['Birinci Yabancı Dil', yd]
  ];

  const TYPES = {
    ilk: {
      ad: 'İlkokul ve Ortaokul', kisa: 'İlkokul–Ortaokul', grades: [1, 2, 3, 4, 5, 6, 7, 8], src: SRC.ilk,
      kaynak: 'TTKB 23.09.2026 tarih ve 115 sayılı karar · 2026-2027’den itibaren', officialApproved: false,
      total: [30, 30, 30, 30, 35, 35, 35, 35], sec: [0, 0, 0, 0, 5, 5, 5, 6], P: 7, poolGrades: [5, 6, 7, 8], pool: POOL_ILK, groups: ['ITB', 'DAD', 'KSS'], groupRule: true,
      z: [
        ['Türkçe', [10, 10, 8, 8, 6, 6, 5, 5]], ['Matematik', [5, 5, 5, 5, 5, 5, 5, 5]], ['Hayat Bilgisi', [4, 4, 3, 0, 0, 0, 0, 0]], ['Fen Bilimleri', [0, 0, 3, 3, 4, 4, 4, 4]],
        ['Sosyal Bilgiler', [0, 0, 0, 3, 3, 3, 3, 0]], ['T.C. İnkılap Tarihi ve Atatürkçülük', [0, 0, 0, 0, 0, 0, 0, 2]], ['Yabancı Dil', [0, 2, 2, 2, 3, 3, 4, 4]],
        ['Din Kültürü ve Ahlak Bilgisi', [0, 0, 0, 2, 2, 2, 2, 2]], ['Görsel Sanatlar', [1, 1, 1, 1, 1, 1, 1, 1]], ['Müzik', [1, 1, 1, 1, 1, 1, 1, 1]],
        ['Beden Eğitimi ve Oyun', [5, 5, 5, 2, 0, 0, 0, 0]], ['Beden Eğitimi ve Spor', [0, 0, 0, 0, 2, 2, 2, 2]], ['Teknoloji ve Tasarım', [0, 0, 0, 0, 0, 0, 2, 2]],
        ['Trafik Güvenliği', [0, 0, 0, 1, 0, 0, 0, 0]], ['Bilişim Teknolojileri ve Yazılım', [0, 0, 0, 0, 2, 2, 0, 0]], ['Rehberlik ve Yönlendirme', [0, 0, 0, 0, 1, 1, 1, 1]],
        ['İnsan Hakları, Vatandaşlık ve Demokrasi', [0, 0, 0, 2, 0, 0, 0, 0]], ['Serbest Etkinlikler', [4, 2, 2, 0, 0, 0, 0, 0]]
      ]
    },
    iho: {
      ad: 'İmam Hatip Ortaokulu', kisa: 'İmam Hatip Ortaokulu', grades: [5, 6, 7, 8], src: SRC.iho,
      kaynak: 'TTKB 117 sayılı karar · 2026-2027’den itibaren', officialApproved: false,
      total: [36, 36, 36, 36], sec: [1, 1, 1, 2], P: 8, poolGrades: [5, 6, 7, 8], pool: POOL_IHO, groups: ['ITB', 'DAD', 'KSS'], groupRule: true,
      z: [
        ['Türkçe', [6, 6, 5, 5]], ['Matematik', [5, 5, 5, 5]], ['Fen Bilimleri', [4, 4, 4, 4]], ['Sosyal Bilgiler', [3, 3, 3, 0]],
        ['T.C. İnkılap Tarihi ve Atatürkçülük', [0, 0, 0, 2]], ['Yabancı Dil', [3, 3, 4, 4]], ['Din Kültürü ve Ahlak Bilgisi', [2, 2, 2, 2]],
        ['Görsel Sanatlar', [1, 1, 1, 1]], ['Müzik', [1, 1, 1, 1]], ['Beden Eğitimi ve Spor', [2, 1, 1, 1]], ['Teknoloji ve Tasarım', [0, 0, 1, 2]],
        ['Bilişim Teknolojileri ve Yazılım', [1, 1, 0, 0]], ['Rehberlik ve Yönlendirme', [1, 1, 1, 1]], ["Kur'an-ı Kerim", [2, 2, 2, 2]],
        ['Arapça', [2, 2, 2, 2]], ['Peygamberimizin Hayatı', [2, 2, 2, 2]], ['Temel Dinî Bilgiler', [0, 1, 1, 0]]
      ]
    },
    al: {
      ad: 'Anadolu Lisesi', kisa: 'Anadolu Lisesi', grades: [9, 10, 11, 12], src: SRC.lise,
      kaynak: 'TTKB 2025 tarihli Anadolu/Fen/Sosyal Bilimler Lisesi çizelgeleri', officialApproved: false,
      total: [40, 40, 40, 40], sec: [7, 6, 20, 24], P: 8, poolGrades: [9, 10, 11, 12], pool: POOL_AL, groups: ['AKD', 'ITB', 'DAD', 'KSS'],
      z: [
        ...Z_LISE_ORTAK([5, 5, 5, 5], [2, 2, 2, 2], [2, 2, 2, 0], [0, 0, 0, 2], [2, 2, 0, 0], [6, 6, 0, 0], [2, 2, 0, 0], [2, 2, 0, 0], [2, 2, 0, 0], [0, 2, 2, 0], [4, 4, 4, 4]),
        ['Beden Eğitimi ve Spor', [2, 2, 2, 0]], ['Görsel Sanatlar/Müzik', [2, 2, 2, 0]], ['Beden Eğitimi ve Spor/Görsel Sanatlar/Müzik', [0, 0, 0, 2]],
        ['Sağlık Bilgisi ve Trafik Kültürü', [1, 0, 0, 0]], ['Rehberlik ve Yönlendirme', [1, 1, 1, 1]]
      ]
    },
    fen: {
      ad: 'Fen Lisesi', kisa: 'Fen Lisesi', grades: [9, 10, 11, 12], src: SRC.lise,
      kaynak: 'TTKB 2025 tarihli Anadolu/Fen/Sosyal Bilimler Lisesi çizelgeleri', officialApproved: false,
      total: [40, 40, 40, 40], sec: [5, 4, 4, 8], P: 8, poolGrades: [9, 10, 11, 12], pool: POOL_FEN, groups: ['AKD', 'ITB', 'DAD', 'KSS'], poolNote: true,
      z: [
        ...Z_LISE_ORTAK([5, 5, 5, 5], [2, 2, 2, 2], [2, 2, 2, 0], [0, 0, 0, 2], [2, 2, 0, 0], [6, 6, 6, 6], [2, 2, 4, 4], [2, 2, 4, 4], [2, 2, 4, 4], [0, 2, 2, 0], [4, 4, 4, 4]),
        ['Bilişim Teknolojileri ve Yazılım', [2, 2, 0, 0]], ['Beden Eğitimi ve Spor', [2, 2, 2, 0]], ['Görsel Sanatlar/Müzik', [2, 2, 0, 0]],
        ['Sağlık Bilgisi ve Trafik Kültürü', [1, 0, 0, 0]], ['Rehberlik ve Yönlendirme', [1, 1, 1, 1]]
      ]
    },
    sbl: {
      ad: 'Sosyal Bilimler Lisesi', kisa: 'Sosyal Bilimler Lisesi', grades: [9, 10, 11, 12], src: SRC.lise,
      kaynak: 'TTKB 2025 tarihli Anadolu/Fen/Sosyal Bilimler Lisesi çizelgeleri', officialApproved: false,
      total: [40, 40, 40, 40], sec: [7, 4, 3, 8], P: 8, poolGrades: [9, 10, 11, 12], pool: POOL_SBL, groups: ['AKD', 'ITB', 'DAD', 'KSS'], poolNote: true,
      z: [
        ...Z_LISE_ORTAK([5, 5, 5, 5], [2, 2, 2, 2], [2, 2, 2, 0], [0, 0, 0, 2], [2, 2, 4, 4], [6, 6, 6, 6], [2, 2, 0, 0], [2, 2, 0, 0], [2, 2, 0, 0], [0, 2, 2, 0], [4, 4, 2, 2]),
        ['Türk Kültür ve Medeniyet Tarihi', [0, 0, 2, 0]], ['Çağdaş Türk ve Dünya Tarihi', [0, 0, 0, 2]], ['Beden Eğitimi ve Spor/Görsel Sanatlar/Müzik', [2, 2, 2, 2]],
        ['Sağlık Bilgisi ve Trafik Kültürü', [1, 0, 0, 0]], ['Sosyal Bilim Çalışmaları', [0, 2, 2, 2]], ['Psikoloji', [0, 0, 2, 0]], ['Sosyoloji', [0, 0, 2, 2]],
        ['Sanat Tarihi', [0, 0, 0, 2]], ['Mantık', [0, 0, 2, 0]], ['Osmanlı Türkçesi', [2, 2, 0, 0]], ['Rehberlik ve Yönlendirme', [1, 1, 0, 1]]
      ]
    },
    aihl: {
      ad: 'Anadolu İmam Hatip Lisesi', kisa: 'Anadolu İmam Hatip Lisesi', grades: [9, 10, 11, 12], src: SRC.aihl,
      kaynak: 'TTKB 2025-2026 Anadolu İmam Hatip Lisesi çizelgesi (hazırlık hariç)', officialApproved: false,
      total: [40, 40, 40, 40], sec: [0, 0, 16, 21], P: 8, poolGrades: [9, 10, 11, 12], pool: POOL_AIHL, groups: ['TIB', 'TIS', 'AKD', 'ITB', 'KSS'],
      z: [
        ['Türk Dili ve Edebiyatı', [5, 5, 5, 5]], ['Tarih', [2, 2, 2, 0]], ['T.C. İnkılap Tarihi ve Atatürkçülük', [0, 0, 0, 2]], ['Coğrafya', [2, 2, 0, 0]],
        ['Matematik', [6, 6, 0, 0]], ['Fizik', [2, 2, 0, 0]], ['Kimya', [2, 2, 0, 0]], ['Biyoloji', [2, 2, 0, 0]], ['Felsefe', [0, 2, 2, 0]], ['Yabancı Dil', [5, 2, 2, 2]],
        ['Beden Eğitimi ve Spor/Görsel Sanatlar/Müzik', [2, 1, 1, 0]], ['Sağlık Bilgisi ve Trafik Kültürü', [1, 0, 0, 0]], ['Arapça', [4, 3, 0, 0]],
        ["Kur'an-ı Kerim", [5, 4, 4, 3]], ['Mesleki Arapça', [0, 0, 3, 2]], ['Temel Dinî Bilgiler', [1, 0, 0, 0]], ['Siyer', [0, 2, 0, 0]], ['Fıkıh', [0, 2, 0, 0]],
        ['Tefsir', [0, 0, 2, 0]], ['Dinler Tarihi', [0, 0, 0, 1]], ['Hadis', [0, 2, 0, 0]], ['Akaid', [0, 0, 1, 0]], ['Kelam', [0, 0, 0, 2]],
        ['Hitabet ve Mesleki Uygulama', [0, 0, 2, 0]], ['İslam Kültür ve Medeniyeti', [0, 0, 0, 2]], ['Osmanlı Türkçesi', [0, 1, 0, 0]], ['Rehberlik ve Yönlendirme', [1, 0, 0, 0]]
      ]
    },
    mtal: {
      ad: 'Mesleki ve Teknik Anadolu Lisesi (Düzenlenebilir Taslak)', kisa: 'MTAL', grades: [9, 10, 11, 12], src: SRC.liste,
      kaynak: 'Düzenlenebilir başlangıç taslağı — Resmi TTKB çizelgesi yerine kurum dal saatlerinizi kontrol ediniz', officialApproved: false, isDraft: true,
      total: [40, 40, 40, 40], sec: [4, 4, 4, 4], P: 8, poolGrades: [9, 10, 11, 12], pool: POOL_AL.slice(0, 16), groups: ['AKD', 'ITB', 'KSS'],
      z: [
        ['Türk Dili ve Edebiyatı', [5, 5, 5, 5]], ['Din Kültürü ve Ahlak Bilgisi', [2, 2, 2, 2]], ['Tarih', [2, 2, 0, 0]], ['T.C. İnkılap Tarihi ve Atatürkçülük', [0, 0, 0, 2]],
        ['Coğrafya', [2, 0, 0, 0]], ['Matematik', [5, 5, 0, 0]], ['Fizik', [2, 0, 0, 0]], ['Kimya', [2, 0, 0, 0]], ['Biyoloji', [2, 0, 0, 0]],
        ['Birinci Yabancı Dil', [4, 2, 2, 2]], ['Beden Eğitimi ve Spor', [2, 2, 0, 0]], ['Sağlık Bilgisi ve Trafik Kültürü', [1, 0, 0, 0]],
        ['Mesleki Alan / Atölye Dersleri', [6, 16, 24, 24]], ['Rehberlik ve Yönlendirme', [1, 1, 1, 1]]
      ]
    },
    cpal: {
      ad: 'Çok Programlı Anadolu Lisesi (Düzenlenebilir Taslak)', kisa: 'ÇPAL', grades: [9, 10, 11, 12], src: SRC.liste,
      kaynak: 'Düzenlenebilir başlangıç taslağı — Program türüne göre saatleri düzenleyiniz', officialApproved: false, isDraft: true,
      total: [40, 40, 40, 40], sec: [6, 6, 14, 16], P: 8, poolGrades: [9, 10, 11, 12], pool: POOL_AL, groups: ['AKD', 'ITB', 'DAD', 'KSS'],
      z: [
        ...Z_LISE_ORTAK([5, 5, 5, 5], [2, 2, 2, 2], [2, 2, 2, 0], [0, 0, 0, 2], [2, 2, 0, 0], [6, 6, 0, 0], [2, 2, 0, 0], [2, 2, 0, 0], [2, 2, 0, 0], [0, 2, 2, 0], [4, 4, 4, 4]),
        ['Beden Eğitimi ve Spor', [2, 2, 2, 0]], ['Rehberlik ve Yönlendirme', [1, 1, 1, 1]]
      ]
    },
    ozel_ogretim: {
      ad: 'Özel Öğretim Kurumu (Düzenlenebilir Taslak)', kisa: 'Özel Öğretim', grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], src: SRC.liste,
      kaynak: 'Düzenlenebilir başlangıç taslağı — Kurum haftalık saatlerine göre uyarlayınız', officialApproved: false, isDraft: true,
      total: [35, 35, 35, 35, 40, 40, 40, 40, 40, 40, 40, 40], sec: [0, 0, 0, 0, 6, 6, 6, 6, 8, 8, 12, 12], P: 8, poolGrades: [5, 6, 7, 8], pool: POOL_ILK, groups: ['ITB', 'DAD', 'KSS'],
      z: [
        ['Türkçe', [10, 10, 8, 8, 6, 6, 5, 5, 0, 0, 0, 0]], ['Türk Dili ve Edebiyatı', [0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5]],
        ['Matematik', [5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6]], ['Fen Bilimleri', [0, 0, 3, 3, 4, 4, 4, 4, 0, 0, 0, 0]],
        ['Yabancı Dil', [4, 4, 4, 4, 6, 6, 6, 6, 6, 6, 4, 4]], ['Rehberlik ve Yönlendirme', [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]
      ]
    },
    ozel_egitim: {
      ad: 'Özel Eğitim Kurumu (Düzenlenebilir Taslak)', kisa: 'Özel Eğitim', grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], src: SRC.liste,
      kaynak: 'Düzenlenebilir başlangıç taslağı — BEP ve kademeye göre saatleri düzenleyiniz', officialApproved: false, isDraft: true,
      total: [30, 30, 30, 30, 30, 30, 30, 30, 35, 35, 35, 35], sec: [0, 0, 0, 0, 2, 2, 2, 2, 4, 4, 4, 4], P: 6, poolGrades: [5, 6, 7, 8], pool: POOL_ILK.slice(0, 10), groups: ['ITB', 'KSS'],
      z: [
        ['Türkçe / İletişim Becerileri', [6, 6, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4]], ['Matematik / Günlük Yaşam', [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]],
        ['Bağımsız Yaşam Becerileri', [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]], ['Görsel Sanatlar', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]],
        ['Beden Eğitimi ve Spor', [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]], ['Müzik', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]]
      ]
    }
  };

  const REHB = 'Sınıf rehber öğretmeni';
  const SO_SET = new Set(['Türkçe', 'Matematik', 'Hayat Bilgisi', 'Fen Bilimleri', 'Sosyal Bilgiler', 'Görsel Sanatlar', 'Müzik', 'Beden Eğitimi ve Oyun', 'Trafik Güvenliği', 'İnsan Hakları, Vatandaşlık ve Demokrasi', 'Serbest Etkinlikler']);

  function branchOf(name, grade, type) {
    const n = String(name || '').toLocaleLowerCase('tr'), lise = grade >= 9, ihl = type === 'aihl';
    if (grade <= 4 && SO_SET.has(name)) return 'Sınıf Öğretmenliği';
    if (/rehberlik|hedef temelli/.test(n)) return REHB;
    if (/ikinci yabancı/.test(n)) return 'İkinci Yabancı Dil';
    if (/yabancı dil|ingilizce/.test(n)) return 'İngilizce';
    if (/arapça/.test(n)) return 'Arapça';
    if (/beden|spor|oyun|halk oyunları/.test(n)) return 'Beden Eğitimi';
    if (/mesleki alan|atölye/.test(n)) return 'Meslek / Alan Dersleri';
    if (/siyer|fıkıh|fıkhi|tefsir|hadis|akaid|kelam|dinler tarihi|hitabet|mesleki uygulama|tasavvuf|islam ahlakı|islam felsefesi|islam tarihi|okuma teknikleri|ana konuları/.test(n)) return 'Meslek Dersleri (İHL)';
    if (/kur.an|peygamber|din kültürü|dinî|dini bilgiler|klasik ahlak|ahlak ve vatandaşlık|kültür ve medeniyetimize|islam bilim|islam kültür/.test(n)) return ihl ? 'Meslek Dersleri (İHL)' : 'Din Kültürü';
    if (/dini musiki|müzik/.test(n)) return 'Müzik';
    if (/sanat tarihi|görsel|dijital sanat|geleneksel sanat|sanat eğitimi|ebru|hüsnühat|tezhip/.test(n)) return 'Görsel Sanatlar';
    if (/bilişim|robotik|yapay zek/.test(n)) return 'Bilişim';
    if (/teknoloji ve tasarım|proje tasarımı/.test(n)) return 'Teknoloji Tasarım';
    if (/türk dili ve edebiyatı|metin tahlil|ortak türk edebiyatı|osmanlı|edebiyat uygulamaları/.test(n)) return 'Türk Dili ve Edebiyatı';
    if (/türkçe|okuma beceri|yazarlık|masal|yaşayan diller|medya okuryazar/.test(n)) return 'Türkçe';
    if (/matematik/.test(n)) return 'Matematik';
    if (lise && /fizik|astronomi|fen bilimleri uygulamaları/.test(n)) return 'Fizik';
    if (/kimya/.test(n)) return 'Kimya';
    if (/biyoloji|genetik|tıp bilim|sağlık bilgisi|sürdürülebilir/.test(n)) return 'Biyoloji';
    if (/iklim, çevre|coğrafya/.test(n)) return 'Coğrafya';
    if (/fen bilimleri|çevre eğitimi|afet/.test(n)) return 'Fen Bilimleri';
    if (lise && /felsefe|psikoloji|sosyoloji|mantık|düşünce tarihi|düşünme|demokrasi|temel hukuk|girişimcilik|aile|adabımuaşeret/.test(n)) return 'Felsefe';
    if (lise && /tarih|sosyal bilim/.test(n)) return 'Tarih';
    if (/inkılap|tarih|şehrimiz|hukuk|insan hakları|sosyal|aile|görgü|sorumluluk|yaşam beceri|düşünme/.test(n)) return 'Sosyal Bilgiler';
    return 'Diğer';
  }

  const SHORTS = {
    'Türkçe': 'TRK', 'Matematik': 'MAT', 'Fen Bilimleri': 'FEN', 'Sosyal Bilgiler': 'SOS', 'Yabancı Dil': 'YD',
    'Din Kültürü ve Ahlak Bilgisi': 'DKAB', 'Görsel Sanatlar': 'GRS', 'Müzik': 'MZK', 'Beden Eğitimi ve Spor': 'BES',
    'Beden Eğitimi ve Oyun': 'BEO', 'Hayat Bilgisi': 'HB', 'Türk Dili ve Edebiyatı': 'TDE', "Kur'an-ı Kerim": 'KUR',
    'Rehberlik ve Yönlendirme': 'REH', 'T.C. İnkılap Tarihi ve Atatürkçülük': 'İNK', 'Teknoloji ve Tasarım': 'TT',
    'Bilişim Teknolojileri ve Yazılım': 'BTY', 'Serbest Etkinlikler': 'SE', 'Trafik Güvenliği': 'TRF',
    'Birinci Yabancı Dil': 'YD1', 'Arapça': 'ARP', 'Peygamberimizin Hayatı': 'PH', 'Temel Dinî Bilgiler': 'TDB',
    'Tarih': 'TAR', 'Coğrafya': 'COĞ', 'Fizik': 'FİZ', 'Kimya': 'KİM', 'Biyoloji': 'BİY', 'Felsefe': 'FEL',
    'Sağlık Bilgisi ve Trafik Kültürü': 'SBT', 'Görsel Sanatlar/Müzik': 'GS/M', 'Beden Eğitimi ve Spor/Görsel Sanatlar/Müzik': 'BGM'
  };

  const trSlug = s => String(s || '').toLocaleUpperCase('tr')
    .replace(/[ÇĞİÖŞÜÂÎÛ]/g, c => ({ 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U', 'Â': 'A', 'Î': 'I', 'Û': 'U' }[c]))
    .replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

  function autoShort(name) {
    if (SHORTS[name]) return SHORTS[name];
    const w = String(name || '').replace(/[“”"()…]/g, '').split(/[\s,/]+/).filter(x => x && !/^(ve|ile|da|de)$/i.test(x));
    return (w.length >= 3 ? w.slice(0, 3).map(x => x[0]).join('') : w.length === 2 ? w[0].slice(0, 2) + w[1][0] : (w[0] || 'D').slice(0, 3)).toLocaleUpperCase('tr');
  }

  const BASE_BRANS = [
    'Sınıf Öğretmenliği', 'Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü',
    'Görsel Sanatlar', 'Müzik', 'Beden Eğitimi', 'Bilişim', 'Teknoloji Tasarım', 'Türk Dili ve Edebiyatı',
    'Tarih', 'Coğrafya', 'Fizik', 'Kimya', 'Biyoloji', 'Felsefe', 'Arapça', 'Meslek Dersleri (İHL)',
    'Meslek / Alan Dersleri', 'İkinci Yabancı Dil', 'Rehberlik', 'Özel Eğitim', 'Diğer'
  ];

  const LEGACY = {
    TRK: ['Türkçe', 'TRK', 'Türkçe'], MAT: ['Matematik', 'MAT', 'Matematik'], FEN: ['Fen Bilimleri', 'FEN', 'Fen Bilimleri'], SOS: ['Sosyal Bilgiler', 'SOS', 'Sosyal Bilgiler'],
    INK: ['T.C. İnkılap Tarihi ve Atatürkçülük', 'İNK', 'Sosyal Bilgiler'], ING: ['Yabancı Dil', 'İNG', 'İngilizce'], SYD: ['Yabancı Dil (seçmeli)', 'SYD', 'İngilizce'],
    DKB: ['Din Kültürü ve Ahlak Bilgisi', 'DKB', 'Din Kültürü'], KUR: ["Kur'an-ı Kerim", 'KUR', 'Din Kültürü'], GRS: ['Görsel Sanatlar', 'GRS', 'Görsel Sanatlar'],
    MZK: ['Müzik', 'MZK', 'Müzik'], BES: ['Beden Eğitimi ve Spor', 'BES', 'Beden Eğitimi'], BTY: ['Bilişim Teknolojileri ve Yazılım', 'BTY', 'Bilişim'],
    TKT: ['Teknoloji ve Tasarım', 'TKT', 'Teknoloji Tasarım'], REH: ['Rehberlik ve Yönlendirme', 'REH', REHB],
    MSL: ['Masal ve Destanlarımız', 'MSL', 'Türkçe'], OKB: ['Okuma Becerileri', 'OKB', 'Türkçe'], AVE: ['Ahlak ve Vatandaşlık Eğitimi', 'AVE', 'Din Kültürü'], CEV: ['Çevre Eğitimi ve İklim Değişikliği', 'ÇEV', 'Fen Bilimleri']
  };
  const LEG_SEC = new Set(['SYD', 'KUR', 'MSL', 'OKB', 'AVE', 'CEV']);

  const TPL = {
    5: [['TRK', 6, '2+2+2'], ['MAT', 5, '2+2+1'], ['FEN', 4, '2+2'], ['SOS', 3, '2+1'], ['ING', 3, '2+1'], ['DKB', 2, '2'], ['GRS', 1, '1'], ['MZK', 1, '1'], ['BES', 2, '2'], ['BTY', 2, '2'], ['REH', 1, '1'], ['SYD', 2, '2'], ['KUR', 2, '2'], ['MSL', 1, '1']],
    6: [['TRK', 6, '2+2+2'], ['MAT', 5, '2+2+1'], ['FEN', 4, '2+2'], ['SOS', 3, '2+1'], ['ING', 3, '2+1'], ['DKB', 2, '2'], ['GRS', 1, '1'], ['MZK', 1, '1'], ['BES', 2, '2'], ['BTY', 2, '2'], ['REH', 1, '1'], ['SYD', 2, '2'], ['KUR', 2, '2'], ['OKB', 1, '1']],
    7: [['TRK', 5, '2+2+1'], ['MAT', 5, '2+2+1'], ['FEN', 4, '2+2'], ['SOS', 3, '2+1'], ['ING', 4, '2+2'], ['DKB', 2, '2'], ['GRS', 1, '1'], ['MZK', 1, '1'], ['BES', 2, '2'], ['TKT', 2, '2'], ['REH', 1, '1'], ['SYD', 2, '2'], ['AVE', 2, '2'], ['MSL', 1, '1']],
    8: [['TRK', 5, '2+2+1'], ['MAT', 5, '2+2+1'], ['FEN', 4, '2+2'], ['INK', 2, '2'], ['ING', 4, '2+2'], ['DKB', 2, '2'], ['GRS', 1, '1'], ['MZK', 1, '1'], ['BES', 2, '2'], ['TKT', 2, '2'], ['REH', 1, '1'], ['SYD', 2, '2'], ['KUR', 2, '2'], ['CEV', 2, '2']]
  };

  Object.assign(EP, {
    CORE, CX, WSRC, newWorker,
    EVRAKPLUS_LOGIN_URL, EVRAKPLUS_SITE_URL,
    GUN, GK, DONEM, MENUS, VIVID_PALETTE, STAFF_ROLES, SOCIAL_CLUB_GROUPS, SOCIAL_CLUBS, ENGINE_META, SOLVER_MODES, TIME_PRESETS, ROOM_TYPES,
    SRC, GRP, TYPES, REHB, SO_SET, SHORTS, BASE_BRANS, LEGACY, LEG_SEC, TPL,
    branchOf, autoShort, trSlug
  });
})(typeof window !== 'undefined' ? window : globalThis);
