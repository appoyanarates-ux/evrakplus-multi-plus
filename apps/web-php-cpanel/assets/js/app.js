/* =========================================================================
 * EvrakPlus Ders Dağıtım Multi Plus v1.0.0 — Tam Kapsamlı 18 Menülü Arayüz
 * - Referans Çarşaf arayüzünün %100 etkileşimli özelliklerini korur
 * - Masaüstü Electron (window.evrakplusBridge) ve Web API üzerinden 6 gerçek
 *   optimizasyon motorunu (OR-Tools, Timefold, Choco, MiniZinc, SCIP, HiGHS) yönetir
 * - Bağımsız tarayıcı önizlemesinde sınırlı tarayıcı çözücüsünü şeffaf biçimde sunar
 * ========================================================================= */
(function () {
  'use strict';
  const EP = window.EP;
  const $ = s => document.querySelector(s);
  const esc = EP.esc;
  const uid = EP.uid;
  const GUN = EP.GUN;
  const GK = EP.GK;

  const LS = 'evrakplus.multiplus.ui.v3';
  const LH = 'evrakplus.multiplus.hist.v3';
  const LOCK_SVG = '<svg class="lk-ico" viewBox="0 0 12 12" aria-label="kilitli"><rect x="2" y="5" width="8" height="6" rx="1.5" fill="currentColor"/><path d="M4 5V3.6a2 2 0 0 1 4 0V5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';

  const bridge = window.evrakplusBridge || null;
  const webApi = window.EVRAKPLUS_WEB_API || null;

  let S = null;
  let step = 'auto_schedule';
  let pc = [];
  let undo = [];
  let redo = [];
  let sel = '';
  let unQ = '';
  let running = null; // null | 'native' | 'full' | 'fill' | 'improve' | 'relax'
  let live = {};
  let relax = null;
  let wk = null;
  let pop = null;
  let drag = null;
  let runCtx = null;
  let deferredInstall = null;
  let engineHealth = [];
  let sysInfo = null;
  let authUser = null; // null = ücretsiz yerel kullanım (üyelik çıkışı kilitli)
  let bulkMode = false;
  const bulkSel = new Set();
  let bulkDrag = null;
  let suppressNextCellClickAt = 0;
  let nativeStopMode = null; // null | 'stop' | 'maxFinish'
  let lastCellClick = null;
  let cellClickTimer = null;
  let lastDblToggleAt = 0;

  /* ---------- Canlı ve Birbirinden Belirgin Ders Renkleri ---------- */
  let SK = [];
  let BRANS = [];
  let colorN = -1;
  const colorStyle = document.createElement('style');
  document.head.appendChild(colorStyle);

  function syncSubj() {
    SK = Object.keys(S.subjects || {});
    BRANS = [...new Set([
      ...EP.BASE_BRANS,
      ...SK.map(k => EP.SB(S, k)).filter(b => b && b !== EP.REHB),
      ...(S.teachers || []).map(t => t.branch).filter(Boolean)
    ])];
    if (SK.length !== colorN) {
      colorN = SK.length;
      const pal = EP.VIVID_PALETTE || [];
      colorStyle.textContent = SK.map((k, i) => {
        if (i < pal.length) {
          const [lbg, lbd, dbg, dbd] = pal[i];
          return `.c${i}{background:light-dark(${lbg},${dbg})!important;border-left-color:light-dark(${lbd},${dbd})!important;color:light-dark(#0f172a,#f8fafc)!important}`;
        }
        const h = Math.round(((i - pal.length) * 137.508 + 24) % 360);
        return `.c${i}{background:light-dark(hsl(${h} 92% 76%),hsl(${h} 58% 30%))!important;border-left-color:light-dark(hsl(${h} 85% 42%),hsl(${h} 82% 66%))!important;color:light-dark(#0f172a,#f8fafc)!important}`;
      }).join('');
    }
  }
  const colorOf = k => 'c' + Math.max(0, SK.indexOf(k));
  const SN = k => EP.SN(S, k);
  const SS = k => EP.SS(S, k);
  const SB = k => EP.SB(S, k);
  const cName = id => EP.cName(S, id);
  const tName = t => EP.tName(t);
  const tShort = t => EP.tShort(t);

  /* ---------- Tema, Sol Menü, Kayıt, Geçmiş & Geri Al ---------- */
  function applyTheme(t) {
    const root = document.documentElement;
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
    else root.removeAttribute('data-theme');
    const isDark = t === 'dark' || (t !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const tb = $('#bToggleTheme');
    if (tb) {
      tb.textContent = isDark ? '☀️' : '🌙';
      tb.title = isDark ? 'Açık temaya geç' : 'Koyu temaya geç';
    }
  }

  function applySideCollapsed() {
    const collapsed = Boolean(S && S.ui && S.ui.sideCollapsed);
    const appEl = document.querySelector('.app');
    if (appEl) appEl.classList.toggle('side-collapsed', collapsed);
    const btn = $('#bToggleSide');
    if (btn) {
      btn.textContent = collapsed ? '☰ Menü' : '☰';
      btn.title = collapsed ? 'Sol menüyü aç' : 'Sol menüyü gizle (geniş ekran)';
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
  }

  function loadLocal() {
    try {
      const j = localStorage.getItem(LS);
      if (j) {
        const o = JSON.parse(j);
        if (o && o.school) return EP.migrateState(o);
      }
    } catch (_) {}
    return null;
  }

  let saveT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      S.updatedAt = new Date().toISOString();
      S.revision = Number(S.revision || 1) + 1;
      try {
        const hasNativePlans = Boolean(bridge && typeof bridge.saveSavedPlan === 'function');
        const lsState = (hasNativePlans && Array.isArray(S.savedPlans) && S.savedPlans.length > 5)
          ? Object.assign({}, S, { savedPlans: S.savedPlans.slice(0, 5) })
          : S;
        localStorage.setItem(LS, JSON.stringify(lsState));
      } catch (_) {
        try {
          const slim = Object.assign({}, S, { savedPlans: (S.savedPlans || []).slice(0, 3) });
          localStorage.setItem(LS, JSON.stringify(slim));
        } catch (__) {}
      }
      if (bridge && typeof bridge.saveProject === 'function') {
        try { bridge.saveProject(EP.stateToV3Project(S)).catch(() => {}); } catch (_) {}
      }
    }, 350);
  }

  function hist(label) {
    try {
      const h = JSON.parse(localStorage.getItem(LH) || '[]');
      h.unshift({ at: Date.now(), label, json: JSON.stringify(S) });
      localStorage.setItem(LH, JSON.stringify(h.slice(0, 8)));
    } catch (_) {}
  }
  function getHist() {
    try { return JSON.parse(localStorage.getItem(LH) || '[]'); } catch (_) { return []; }
  }
  function snap() {
    undo.push(JSON.stringify(S));
    if (undo.length > 40) undo.shift();
    redo = [];
  }
  function commit() { save(); render(); }

  /* ---------- Bildirim, Modal & EvrakPlus Üyelik Kapısı ---------- */
  function toast(t, ms) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = t;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), ms || Math.max(3200, Math.min(9000, t.length * 45)));
  }

  function ask(msg, ok) {
    return new Promise(res => {
      const M = $('#modalRoot');
      M.innerHTML = `<div class="modal"><div class="box"><h2>Emin misiniz?</h2><p>${esc(msg)}</p><div class="row" style="justify-content:flex-end"><button class="btn" id="mNo">Vazgeç</button><button class="btn pri" id="mOk">${esc(ok || 'Evet')}</button></div></div></div>`;
      $('#mNo').addEventListener('click', () => { M.innerHTML = ''; res(false); });
      $('#mOk').addEventListener('click', () => { M.innerHTML = ''; res(true); });
    });
  }

  function askChoice(title, msg, opts) {
    return new Promise(res => {
      const M = $('#modalRoot');
      M.innerHTML = `<div class="modal"><div class="box"><h2>${esc(title)}</h2><p>${esc(msg)}</p><div class="row" style="justify-content:flex-end">${opts.map((o, i) => `<button class="btn ${o.pri ? 'pri' : ''}" data-ch="${i}">${esc(o.label)}</button>`).join('')}</div></div></div>`;
      M.querySelectorAll('[data-ch]').forEach(b => b.addEventListener('click', () => { M.innerHTML = ''; res(opts[+b.dataset.ch].v); }));
    });
  }

  function warnAsk(title, items, ok) {
    return new Promise(res => {
      const M = $('#modalRoot');
      M.innerHTML = `<div class="modal"><div class="box"><h2>${esc(title)}</h2><ul style="margin:8px 0 12px 18px;line-height:1.5">${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="small muted">Yine de devam ederseniz dağıtım bu dersleri yerleştiremeyebilir; “Dağıtılamayan dersler” bölümünde nedenleri görünür.</p><div class="row" style="justify-content:flex-end"><button class="btn" id="mNo">Vazgeç</button><button class="btn pri" id="mOk">${esc(ok || 'Yine de devam et')}</button></div></div></div>`;
      $('#mNo').addEventListener('click', () => { M.innerHTML = ''; res(false); });
      $('#mOk').addEventListener('click', () => { M.innerHTML = ''; res(true); });
    });
  }

  function showText(title, txt) {
    const M = $('#modalRoot');
    M.innerHTML = `<div class="modal"><div class="box"><h2>${esc(title)}</h2><p class="small muted">İçeriği kopyalayabilirsiniz.</p><textarea readonly id="mTxt"></textarea><div class="row" style="justify-content:flex-end"><button class="btn" id="mCp">Kopyala</button><button class="btn pri" id="mX">Kapat</button></div></div></div>`;
    $('#mTxt').value = txt;
    $('#mX').addEventListener('click', () => { M.innerHTML = ''; });
    $('#mCp').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(txt); toast('Kopyalandı.'); }
      catch (_) { $('#mTxt').select(); toast('Seçildi; Ctrl+C ile kopyalayın.'); }
    });
  }

  function showImg(cv, name) {
    const M = $('#modalRoot');
    const url = cv.toDataURL('image/png');
    M.innerHTML = `<div class="modal"><div class="box"><h2>${esc(name)}</h2><img src="${url}" alt="Program görseli" style="width:100%;border-radius:10px;border:1px solid var(--line)"><div class="row" style="justify-content:flex-end"><a class="btn pri" href="${url}" download="${esc(name)}.png">PNG İndir</a><button class="btn" id="mX">Kapat</button></div></div></div>`;
    $('#mX').addEventListener('click', () => { M.innerHTML = ''; });
  }

  const APP_VER = (bridge && bridge.appVersion) || '2.6.0';
  let updateInfo = null;
  let updateProgress = null;
  const isMember = () => Boolean(authUser && (authUser.loggedIn || authUser.entitlementValid));

  function browserPrintHtml(html) {
    const ifr = document.createElement('iframe');
    ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(ifr);
    const cleanup = () => { setTimeout(() => { try { ifr.remove(); } catch (_) {} }, 1500); };
    ifr.onload = () => {
      try {
        ifr.contentWindow.focus();
        ifr.contentWindow.print();
      } catch (_) {
        const w = window.open('', '_blank');
        if (w) { w.document.open(); w.document.write(html); w.document.close(); setTimeout(() => w.print(), 250); }
      }
      cleanup();
    };
    ifr.srcdoc = html;
  }

  async function exportReportPdf(html, title, landscape) {
    const safeTitle = String(title || 'DersMatrix-Program').replace(/[\\/:*?"<>|]+/g, '').trim() || 'DersMatrix-Program';
    if (bridge && typeof bridge.exportPdf === 'function') {
      toast('PDF dosyası hazırlanıyor…');
      try {
        const res = await bridge.exportPdf({
          html,
          defaultFilename: safeTitle + '.pdf',
          landscape: Boolean(landscape),
          paperSize: EP.rep(S).paper === 'A3' ? 'A3' : 'A4'
        });
        if (res && res.ok) toast('PDF belgesi kaydedildi ve açıldı.');
        else if (res && !res.canceled) toast('PDF oluşturulamadı.');
      } catch (err) {
        toast('PDF hatası: ' + (err && err.message ? err.message : String(err)));
      }
      return;
    }
    browserPrintHtml(html);
    toast('Yazdırma / PDF kaydetme penceresi açıldı (Hedef: PDF olarak kaydet).');
  }

  async function printReportNow(html, landscape) {
    if (bridge && typeof bridge.printHtml === 'function') {
      toast('Yazıcı penceresi açılıyor…');
      try {
        const res = await bridge.printHtml({ html, landscape: Boolean(landscape) });
        if (res && res.ok) toast('Yazdırma işi yazıcıya gönderildi.');
        else if (res && res.error && !res.canceled && !/cancel/i.test(res.error)) toast('Yazdırma uyarısı: ' + res.error);
      } catch (err) {
        toast('Yazdırma hatası: ' + (err && err.message ? err.message : String(err)));
      }
      return;
    }
    browserPrintHtml(html);
  }

  function renderUpdateBanner() {
    const b = $('#banner');
    if (!b) return;
    if (updateProgress) {
      b.innerHTML = `<div class="upd-banner"><span>${esc(updateProgress.message || 'Güncelleme indiriliyor…')}</span><div class="bar" style="width:220px;margin:0"><i style="width:${updateProgress.percent || 0}%;background:var(--ok)"></i></div></div>`;
      return;
    }
    if (updateInfo && updateInfo.updateAvailable) {
      b.innerHTML = `<div class="upd-banner"><span>Yeni sürüm hazır: <b>v${esc(updateInfo.latestVersion)}</b> (Mevcut: v${esc(APP_VER)})</span><div class="row"><button class="btn sm pri" data-act="installUpdate">Şimdi Güncelle ve Kur</button><button class="btn sm ghost" data-act="dismissUpdate">Sonra</button></div></div>`;
    }
  }

  async function doEvrakPlusLogin() {
    if (bridge && typeof bridge.startAuth === 'function') {
      toast('EvrakPlus giriş penceresi açılıyor… Giriş yaptığınızda otomatik tanınacaktır.');
      const st = await bridge.startAuth();
      if (st && st.loggedIn) {
        authUser = st;
        render();
        toast(`EvrakPlus girişi tamamlandı: ${st.displayName || st.username} — Filigransız çıktı aktif!`);
        return true;
      }
      return false;
    }
    window.open(EP.EVRAKPLUS_LOGIN_URL, '_blank', 'noopener,noreferrer');
    return false;
  }

  async function doEvrakPlusLogout() {
    if (bridge && typeof bridge.logoutAuth === 'function') {
      await bridge.logoutAuth();
    }
    authUser = null;
    render();
    toast('EvrakPlus oturumu kapatıldı.');
  }

  async function refreshEvrakPlusAuth(silent) {
    if (bridge && typeof bridge.getAuthStatus === 'function') {
      try {
        const st = await bridge.getAuthStatus();
        authUser = st && st.loggedIn ? st : null;
        render();
        if (!silent) toast(authUser ? `Oturum aktif: ${authUser.displayName || authUser.username}` : 'Aktif EvrakPlus oturumu bulunamadı. Uygulama içinden giriş yapın.');
        return Boolean(authUser);
      } catch (_) {}
    } else if (typeof location !== 'undefined' && /evrakplus\.com$/i.test(location.hostname)) {
      try {
        const r = await fetch('/wp-json/evrakplus-multi-plus/v1/auth/me', { credentials: 'include' });
        if (r.ok) {
          const data = await r.json();
          if (data && data.user) {
            authUser = { loggedIn: true, entitlementValid: true, username: data.user.username || data.user.name, displayName: data.user.name || data.user.username };
            render();
            return true;
          }
        }
      } catch (_) {}
    }
    return false;
  }

  function resolveExportMode(actionLabel) {
    if (isMember()) return Promise.resolve('clean');
    return new Promise(res => {
      const M = $('#modalRoot');
      M.innerHTML = `<div class="modal"><div class="box">
        <h2>${esc(actionLabel)}</h2>
        <p>Üye olmadan da çıktı alabilirsiniz; üyesiz çıktılarda belgenin her yerinde büyük ve küçük <b>EVRAK PLUS</b> filigran yazıları yer alır.</p>
        <div class="msg info"><span class="ic">i</span><div>Ücretsiz EvrakPlus hesabınızla giriş yaptığınızda filigranlar otomatik kalkar ve <b>tamamen temiz resmi çıktı</b> alırsınız.</div><span></span></div>
        <div class="row" style="justify-content:flex-end;gap:8px;flex-wrap:wrap">
          <button class="btn ghost" id="mExpCancel">Vazgeç</button>
          <button class="btn" id="mExpGuest">Üye Olmadan Filigranlı İndir</button>
          <button class="btn pri" id="mExpLogin">EvrakPlus ile Giriş Yap (Filigransız)</button>
        </div>
      </div></div>`;
      $('#mExpCancel').addEventListener('click', () => { M.innerHTML = ''; res(null); });
      $('#mExpGuest').addEventListener('click', () => { M.innerHTML = ''; res('watermarked'); });
      $('#mExpLogin').addEventListener('click', async () => {
        M.innerHTML = '';
        const ok = await doEvrakPlusLogin();
        res(ok ? 'clean' : null);
      });
    });
  }

  function requireCloudMembership(actionLabel) {
    if (isMember()) return true;
    const M = $('#modalRoot');
    M.innerHTML = `<div class="modal"><div class="box">
      <h2>Ücretsiz EvrakPlus üyeliği gerekli</h2>
      <p><b>${esc(actionLabel)}</b> için ücretsiz EvrakPlus hesabınızla giriş yapın.</p>
      <div class="row" style="justify-content:flex-end">
        <button class="btn ghost" id="mLater">Daha Sonra</button>
        <button class="btn pri" id="mLogin">EvrakPlus ile Giriş Yap</button>
      </div>
    </div></div>`;
    $('#mLater').addEventListener('click', () => { M.innerHTML = ''; });
    $('#mLogin').addEventListener('click', () => { M.innerHTML = ''; doEvrakPlusLogin(); });
    return false;
  }

  function downloadBlob(name, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(name + ' indirildi.');
  }
  const fileName = ext => (S.school.name || 'program').replace(/[\\/:*?"<>|]+/g, '').trim() + '.' + ext;
  const projJson = () => JSON.stringify(EP.sanitizeExportProject(S), null, 2);

  /* ---------- Ortak UI Yardımcıları ---------- */
  const H = (t, d, act = '') => `<div class="head"><div><h1>${t}</h1><p>${d}</p></div><div class="row">${act}</div></div>`;
  const fmtN = n => n == null ? '—' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' B' : String(n);
  const fmtMs = ms => ms == null ? '—' : ms < 1000 ? ms + ' ms' : (ms / 1000).toFixed(1) + ' sn';
  const MODE_TAG = { brans: ['Branş', 'okBg', 'ok'], rehber: ['Rehber öğretmen', 'soft', 'mute'], ek: ['Branş dışı (tanımlı)', 'warnBg', 'warn'], dis: ['Branş dışı', 'errBg', 'err'] };

  function modeTag(card) {
    const m = EP.tMode(S, card);
    if (!m) return '<span class="tag" style="background:var(--errBg);color:var(--err)">Öğretmen yok</span>';
    const x = MODE_TAG[m];
    return `<span class="tag" style="background:var(--${x[1]});color:var(--${x[2]})">${x[0]}</span>`;
  }

  function assignMsg(r) {
    return r.n
      ? `${r.n} derse öğretmen atandı${r.ek ? ` (${r.ek} tanesi branş dışı)` : ''}.${r.miss ? ` ${r.miss} ders boşta: uygun branş öğretmeni yok veya yükü dolu.` : ''}`
      : (r.miss ? `${r.miss} ders için uygun öğretmen bulunamadı.` : 'Atanacak boş ders yok.');
  }

  function matrix(kind, o) {
    const D = +S.school.D, P = +S.school.P, tm = EP.times(S);
    const st = (d, p) => (kind === 'cls' || kind === 'room') ? ((o.closed || []).includes(d + '-' + p) ? 1 : 0) : ((o.av || {})[d + '-' + p] || 0);
    const lab = ['Müsait', 'Kapalı', 'Tercihen boş'];
    return `<table class="mx"><thead><tr><th style="width:84px"></th>${GUN.slice(0, D).map((g, d) => `<th data-act="mxDay" data-kind="${kind}" data-id="${o.id}" data-d="${d}" title="Tüm günü değiştir">${g}</th>`).join('')}</tr></thead><tbody>
      ${Array.from({ length: P }, (_, p) => `<tr><th data-act="mxRow" data-kind="${kind}" data-id="${o.id}" data-p="${p}" style="text-align:left">${p + 1}. ders<br><small class="muted">${(tm[p] || '').split('–')[0]}</small></th>${GUN.slice(0, D).map((g, d) => {
        const v = st(d, p);
        return `<td class="k${v}" data-act="mx" data-kind="${kind}" data-id="${o.id}" data-d="${d}" data-p="${p}">${kind === 'cls' || kind === 'room' ? (v ? 'Kapalı' : 'Açık') : lab[v]}</td>`;
      }).join('')}</tr>`).join('')}</tbody></table>
      <p class="small muted" style="margin-top:8px">${kind === 'cls' || kind === 'room' ? 'Hücreye tıklayarak saati açın veya kapatın.' : 'Tıkladıkça Müsait → Kapalı → Tercihen boş sırasıyla değişir. “Tercihen boş” kesin yasak değildir; motor mümkünse boş bırakır.'} Gün veya ders başlığına tıklamak tüm satır/sütunu değiştirir.</p>`;
  }

  function patChips(pats, h, attrs) {
    return `<div class="row" style="gap:4px;flex-wrap:wrap">${EP.partitions(h).map(p => {
      const i = pats.indexOf(p);
      return `<button class="btn sm ${i >= 0 ? 'pri' : ''}" ${attrs} data-p="${p}" aria-pressed="${i >= 0}">${i >= 0 && pats.length > 1 ? (i + 1) + '. ' : ''}${p}</button>`;
    }).join('')}</div>`;
  }

  function blkSelect(c) {
    const h = +c.hours || 1, e = EP.effCfg(S, c), g = EP.blkCfg(S, c.subj, h);
    const cur = c.bmode === 'auto' ? 'auto' : c.bmode === 'fixed' ? 'f:' + ((c.bpats || [])[0] || '') : 'inherit';
    const gtxt = g.mode === 'auto' ? 'otomatik' : 'sabit ' + g.pats[0];
    return `<select data-card="${c.id}" data-f="blk" style="max-width:195px" aria-label="Blok düzeni">
      <option value="inherit" ${cur === 'inherit' ? 'selected' : ''}>Ders ayarı (${esc(gtxt)})</option>
      ${EP.minPats(h) > 1 ? `<option value="auto" ${cur === 'auto' ? 'selected' : ''}>Çoklu: en az 2 tip</option>` : ''}
      ${EP.partitions(h).map(p => `<option value="f:${p}" ${cur === 'f:' + p ? 'selected' : ''}>Sabit ${p}</option>`).join('')}
    </select>
    ${e.own && e.mode === 'auto' ? `<div style="margin-top:5px">${patChips(e.pats, h, `data-act="cardPat" data-id="${c.id}"`)}</div>` : ''}
    ${e.mode === 'auto' ? `<div class="small muted" style="margin-top:3px">Kullanılan: <b>${esc(c.pattern)}</b>${e.own ? ' · sınıfa özel' : ' · ' + esc(e.pats.join(' → '))}</div>` : e.own ? '<div class="small muted" style="margin-top:3px">sınıfa özel</div>' : ''}`;
  }

  function tOptions(card) {
    const L = EP.loads(S), br = SB(card.subj);
    const lab = t => `${esc(t.name)} (${L[t.id] || 0}/${EP.openOf(S, t).tot})${card.teacherId !== t.id && EP.tcViolation(S, t, card) ? ' · sınır aşılır' : ''}`;
    const selAttr = t => card.teacherId === t.id ? 'selected' : '';
    const a = S.teachers.filter(t => br === EP.REHB || t.branch === br);
    const b = S.teachers.filter(t => !a.includes(t) && (t.extra || []).includes(card.subj));
    const c = S.teachers.filter(t => !a.includes(t) && !b.includes(t));
    const og = (l, ts) => ts.length ? `<optgroup label="${l}">${ts.map(t => `<option value="${t.id}" ${selAttr(t)}>${lab(t)}</option>`).join('')}</optgroup>` : '';
    return `<option value="">— Öğretmen seç —</option>` + og(br === EP.REHB ? 'Tüm öğretmenler (rehber)' : 'Branş öğretmenleri (' + esc(br) + ')', a) + og('Branş dışı okutabilenler', b) + og('Diğer öğretmenler (branş dışı atanır)', c);
  }

  function cardRow(c, showClass, showAdv) {
    const coOpts = `<option value="">— Yok (Tek öğretmen) —</option>` + S.teachers.filter(t => t.id !== c.teacherId).map(t => `<option value="${t.id}" ${c.coTeacherId === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
    const advCell = showAdv ? `<td>
        <select data-card="${c.id}" data-f="coTeacherId" style="max-width:165px;margin-bottom:4px" title="Bölünmüş / Atölye dersi için 2. eş öğretmen" aria-label="2. Eş öğretmen">${coOpts}</select>
        <input data-card="${c.id}" data-f="syncGroup" value="${esc(c.syncGroup || '')}" placeholder="Ortak grup (ör. 11-Sec-A)" title="Aynı grup adını taşıyan farklı şubelerin seçmeli dersleri aynı saatte eş zamanlı yerleşir" style="width:165px;min-height:30px;padding:3px 7px;font-size:12px">
      </td>` : '';
    return `<tr>${showClass ? `<td>${esc(cName(c.classId))}</td>` : ''}
      <td><span class="tag ${colorOf(c.subj)}">${esc(SS(c.subj))}</span> ${esc(SN(c.subj))}${showClass ? `<br><small class="muted">${c.kind === 'secmeli' ? 'Seçmeli' : c.kind === 'ek' ? 'Ek / branş dışı' : 'Zorunlu'}</small>` : ''}${c.syncGroup ? `<br><span class="tag" style="background:var(--okBg);color:var(--ok)">Ortak: ${esc(c.syncGroup)}</span>` : ''}</td>
      <td class="n"><input type="number" min="1" max="12" data-card="${c.id}" data-f="hours" value="${c.hours}" style="width:56px;padding:0 6px" aria-label="Haftalık saat"></td>
      <td style="max-width:175px">${blkSelect(c).replace('<select ', '<select style="max-width:168px" ')}</td>
      <td><select data-card="${c.id}" data-f="teacherId" style="max-width:205px" aria-label="Öğretmen">${tOptions(c)}</select><div style="margin-top:4px">${modeTag(c)}</div></td>
      ${advCell}
      <td><select data-card="${c.id}" data-f="roomId" style="max-width:110px" aria-label="Derslik"><option value="">Varsayılan</option>${(S.rooms || []).map(r => `<option value="${r.id}" ${c.roomId === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></td>
      <td style="text-align:right"><button class="btn sm ghost" data-act="delCard" data-id="${c.id}">Sil</button></td></tr>`;
  }
  const TH_CARD = (cls, adv) => `<thead><tr>${cls ? '<th>Sınıf</th>' : ''}<th>Ders</th><th class="n">Saat</th><th>Blok</th><th>Öğretmen</th>${adv ? '<th>2. Eş Öğretmen / Ortak Blok</th>' : ''}<th>Derslik</th><th></th></tr></thead>`;

  /* =========================================================================
   * 18 MENÜ GÖRÜNÜMLERİ
   * ========================================================================= */

  /* 1. Ana Panel */
  function vDashboard() {
    const o = EP.occ(S), tot = o.m.blocks.length, pl = tot - o.un.length, errs = pc.filter(x => x.lvl === 'err').length;
    const totHrs = S.cards.reduce((a, c) => a + (+c.hours || 0), 0);
    const rt = bridge ? 'Windows Masaüstü Uygulaması' : webApi ? 'Web Uygulaması' : 'Çevrimdışı Önizleme';
    const dutyAssigned = S.teachers.filter(t => !EP.isDutyExempt(S, t) && EP.dutyOf(t).d >= 0).length;
    const dutyExemptCount = S.teachers.filter(t => EP.isDutyExempt(S, t)).length;
    const clubAssigned = S.teachers.filter(t => Boolean(t.kulup)).length;
    return H('Ana Panel', 'DersMatrix Ultimate — Okulunuzun haftalık ders dağıtım özeti, PASS 0 ön kontrol durumu ve hızlı işlemler.',
      `<button class="btn pri" data-step="auto_schedule">Dağıtıma Git</button><button class="btn" data-act="demo">Örnek Okul</button><button class="btn" data-act="demoX">Çakışmalı Örnek</button>`) +
      `<div class="hero-banner"><img src="./assets/dersmatrix-banner.jpg" alt="DersMatrix Ultimate · Profesyonel Haftalık Ders Dağıtım Sistemi by EvrakPlus"></div>
      <div class="kpis">
        <div class="kpi"><small>Şube / Sınıf</small><b>${S.classes.length}</b><span>${(S.rooms || []).length} derslik · ${(S.buildings || []).length} bina</span></div>
        <div class="kpi"><small>Öğretmen</small><b>${S.teachers.length}</b><span>${totHrs} haftalık ders saati</span></div>
        <div class="kpi"><small>Yerleşen Blok</small><b>${pl} / ${tot}</b><span>${o.un.length ? o.un.length + ' yerleşmeyen' : 'Program tam'}</span></div>
        <div class="kpi"><small>PASS 0 Ön Kontrol</small><b style="color:${errs ? 'var(--err)' : 'var(--ok)'}">${errs ? errs + ' Çakışma' : 'Temiz'}</b><span>${pc.filter(x => x.lvl === 'warn').length} uyarı</span></div>
      </div>
      <div class="grid2">
        <div class="card">
          <h2>Hızlı İşlemler</h2>
          <p class="small muted" style="margin:6px 0 12px">Çalışma ortamı: <b>${esc(rt)}</b></p>
          <div class="row">
            <button class="btn pri" data-step="school">1. Okul &amp; Zil Ayarları</button>
            <button class="btn" data-step="classes">2. Sınıflar</button>
            <button class="btn" data-step="teachers">3. Öğretmenler</button>
            <button class="btn" data-step="assignments">4. Sınıf Dersleri</button>
            <button class="btn" data-step="auto_schedule">5. Dağıtım ve Program</button>
            <button class="btn" data-step="reports">6. Resmi Çıktılar</button>
          </div>
        </div>
        <div class="card">
          <h2>Okul Nöbeti ve Sosyal Kulüpler</h2>
          <p class="small muted" style="margin:6px 0 10px">MEB zorunlu 8 kulüp ve tematik sosyal kulüpler ile idareci muafiyetli nöbet çizelgesi.</p>
          <div class="tray">
            <span class="pill ok">Nöbet atanmış: ${dutyAssigned}</span>
            <span class="pill">İdareci / Muaf: ${dutyExemptCount}</span>
            <span class="pill">Kulüp atanmış: ${clubAssigned}</span>
          </div>
          <div class="row" style="margin-top:12px"><button class="btn sm" data-act="goDutyTab">Nöbet ve Kulüp Düzenle</button></div>
        </div>
      </div>
      <div class="card" style="margin-top:14px"><h2>PASS 0 Ön Kontrol Özeti</h2><div class="diag" style="margin-top:10px">${diagHtml()}</div></div>`;
  }

  /* 2. Okul Ayarları */
  function adminCard() {
    const s = S.school, my = EP.myList(S);
    return `<div class="card" style="margin-top:14px"><h2>Dönem Tarihleri ve Ek Nöbetçi İdareciler</h2>
      <p class="small muted" style="margin-top:4px">Okul Müdürü ve Müdür Yardımcısı bilgilerini yukarıdaki karttan girebilirsiniz; burada dönem tarihlerini ve nöbet çizelgesinde görev alacak diğer müdür yardımcılarını tanımlayın.</p>
      <div class="fields" style="margin-top:12px">
        <label class="f">Dönem<select data-k="school.donem">${EP.DONEM.map(v => `<option value="${v}" ${(s.donem || '') === v ? 'selected' : ''}>${v || '— seçilmedi —'}</option>`).join('')}</select></label>
        <label class="f">Dönem başlangıcı<input type="date" data-k="school.donemBas" value="${esc(s.donemBas || '')}"></label>
        <label class="f">Dönem bitişi<input type="date" data-k="school.donemBit" value="${esc(s.donemBit || '')}"></label>
      </div>
      <h3 style="margin:14px 0 6px">Diğer müdür yardımcıları (Nöbetçi İdareci listesi)</h3>
      ${my.length ? `<div class="diag" style="gap:6px">${my.map(m => `<div class="row" style="gap:8px">
        <input data-my="${m.id}" data-f="name" value="${esc(m.name)}" placeholder="Ad Soyad" style="max-width:240px">
        <input data-my="${m.id}" data-f="gorev" value="${esc(m.gorev || '')}" placeholder="Görev alanı (ör. ders programı, nöbet)" style="max-width:300px">
        <button class="btn sm ghost" data-act="myDel" data-id="${m.id}">Sil</button></div>`).join('')}</div>` : '<p class="small muted">İsteğe bağlı olarak ek müdür yardımcıları ekleyebilirsiniz.</p>'}
      <button class="btn sm" data-act="myAdd" style="margin-top:8px">Müdür yardımcısı ekle</button></div>`;
  }

  function roomsContent() {
    const blds = S.buildings || [], rms = S.rooms || [], opR = S.ui.openRoom || '';
    return `<div class="row" style="justify-content:flex-end;margin-bottom:12px">
        <button class="btn pri" data-act="addRoom">Derslik / Lab ekle</button>
        <button class="btn" data-act="addBld">Bina ekle</button>
      </div>
      <div class="card scroll" style="margin-bottom:14px"><h2>Binalar ve Bina Geçiş Süreleri</h2>
        <p class="small muted" style="margin-top:4px">Çoklu bina geçiş sürelerini (ders boşluğu) buradan belirleyebilirsiniz.</p>
        <table class="tbl" style="margin-top:8px"><thead><tr><th>Bina Adı</th><th>Kod</th>${blds.map(b => `<th class="n">→ ${esc(b.code || b.name)} (ders boşluğu)</th>`).join('')}<th></th></tr></thead><tbody>
        ${blds.map(b => `<tr>
          <td><input data-bld="${b.id}" data-f="name" value="${esc(b.name)}" style="max-width:200px"></td>
          <td><input data-bld="${b.id}" data-f="code" value="${esc(b.code || '')}" style="width:70px"></td>
          ${blds.map(b2 => b2.id === b.id ? '<td class="n muted">0</td>' : `<td class="n"><input type="number" min="0" max="4" data-btr="${b.id}|${b2.id}" value="${(b.transitionPeriods || {})[b2.id] || 0}" style="width:62px"></td>`).join('')}
          <td style="text-align:right"><button class="btn sm ghost" data-act="delBld" data-id="${b.id}" ${blds.length <= 1 ? 'disabled' : ''}>Sil</button></td>
        </tr>`).join('')}</tbody></table></div>
      <div class="card scroll"><h2>Derslikler, Laboratuvarlar ve Atölyeler (${rms.length})</h2>
        <p class="small muted" style="margin-top:4px">Özel laboratuvar, spor salonu, atölye kapasiteleri ve kapalı saatlerini yönetin.</p>
        <table class="tbl" style="margin-top:8px"><thead><tr><th>Derslik Adı</th><th>Tür</th><th>Bina</th><th class="n">Kapasite</th><th></th></tr></thead><tbody>
        ${rms.map(r => `<tr>
          <td><input data-room="${r.id}" data-f="name" value="${esc(r.name)}"></td>
          <td><select data-room="${r.id}" data-f="type">${EP.ROOM_TYPES.map(([k, l]) => `<option value="${k}" ${r.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
          <td><select data-room="${r.id}" data-f="buildingId">${blds.map(b => `<option value="${b.id}" ${r.buildingId === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></td>
          <td class="n"><input type="number" min="1" max="300" data-room="${r.id}" data-f="capacity" value="${r.capacity || 30}" style="width:74px"></td>
          <td style="text-align:right;white-space:nowrap"><button class="btn sm ghost" data-act="roomSlots" data-id="${r.id}">${opR === r.id ? 'Kapat' : 'Saatler'}</button> <button class="btn sm ghost" data-act="delRoom" data-id="${r.id}">Sil</button></td>
        </tr>${opR === r.id ? `<tr><td colspan="5">${matrix('room', r)}</td></tr>` : ''}`).join('')}</tbody></table></div>`;
  }

  function vOkul() {
    const s = S.school, tm = EP.times(S), T = EP.typeOf(S), stab = S.ui.stab === 'rooms' ? 'rooms' : 'genel';
    const hasCustomTimes = Array.isArray(s.customTimes) && s.customTimes.some(x => x && (x.start || x.end));
    const head = H('Okul Ayarları', 'Okul adı, okul müdürü, müdür yardımcısı, ders/zil saatleri ve derslik ayarlarını tek merkezden belirleyin; tüm raporlarda ve çıktılarda otomatik kullanılır.');
    const tabs = `<div class="tabs" style="margin-bottom:14px;display:inline-flex">
      <button data-act="stab" data-v="genel" class="${stab === 'genel' ? 'on' : ''}">Genel Bilgiler, Zil ve Yönetim</button>
      <button data-act="stab" data-v="rooms" class="${stab === 'rooms' ? 'on' : ''}">Derslikler ve Binalar (${(S.rooms || []).length} derslik · ${(S.buildings || []).length} bina)</button>
    </div>`;
    if (stab === 'rooms') return head + tabs + roomsContent();
    return head + tabs +
      `<div class="grid2"><div class="card"><h2>Kurum, Yönetim ve Okul Türü</h2><div class="fields" style="margin-top:12px">
        <label class="f">Okul adı<input data-k="school.name" value="${esc(s.name)}" placeholder="ör. Atatürk Anadolu Lisesi"></label>
        <label class="f">Eğitim yılı<input data-k="school.year" value="${esc(s.year)}"></label>
        <label class="f">Okul müdürü adı<input data-k="school.mudur" value="${esc(s.mudur || '')}" placeholder="Ad Soyad"></label>
        <label class="f">Müdür yardımcısı adı<input data-k="school.mudurYardimcisi" value="${esc(s.mudurYardimcisi || '')}" placeholder="Ad Soyad"></label>
        <label class="f" style="grid-column:1/-1">Okul türü<select data-k="school.type">${(EP.TYPE_GROUPS || []).map(grp => `<optgroup label="${esc(grp.label)}">${grp.types.filter(k => EP.TYPES[k]).map(k => { const t = EP.TYPES[k]; return `<option value="${k}" ${s.type === k ? 'selected' : ''}>${esc(t.ad)} (${EP.gradeRange(t.grades)} · ${[...new Set(t.total)].join('/')} sa)</option>`; }).join('')}</optgroup>`).join('')}<optgroup label="Özel / Şablonsuz"><option value="" ${!T ? 'selected' : ''}>Diğer / şablonsuz</option></optgroup></select></label>
        <label class="f">Eğitim düzeni<select data-k="school.educationMode"><option value="full_day" ${s.educationMode !== 'dual_shift' ? 'selected' : ''}>Tam gün</option><option value="dual_shift" ${s.educationMode === 'dual_shift' ? 'selected' : ''}>İkili öğretim (Sabahçı / Öğlenci)</option></select></label>
        <label class="f">Gün sayısı<select data-k="school.D">${[5, 6].map(v => `<option ${+s.D === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="f">Günlük ders sayısı<input type="number" min="1" max="12" data-k="school.P" value="${s.P}"></label>
      </div>
      ${T ? `<div class="msg ${T.isDraft ? 'warn' : 'info'}" style="margin-top:12px"><span class="ic">${T.isDraft ? '!' : 'i'}</span><div><b>${esc(T.ad)}</b>: haftalık ${[...new Set(T.total)].join('/')} saat. ${T.P !== +s.P ? `Önerilen günlük ders sayısı ${T.P}.` : 'Günlük ders sayısı uygun.'}<div class="sug">${esc(T.kaynak)} · <a href="${T.src}" target="_blank" rel="noopener">TTKB Kaynağı</a></div></div>${T.P !== +s.P ? `<button class="btn sm" data-act="applyP">${T.P} yap</button>` : '<span></span>'}</div>` : ''}</div>
      <div class="card">
        <div class="row" style="justify-content:space-between">
          <h2>Okul Zil ve Ders Saatleri</h2>
          ${hasCustomTimes ? '<button class="btn sm ghost" data-act="resetCustomTimes">Otomatik saatlere sıfırla</button>' : ''}
        </div>
        <div class="fields" style="margin-top:10px">
          <label class="f">İlk ders<input type="time" data-k="school.start" value="${esc(s.start)}"></label>
          <label class="f">Ders süresi (dk)<input type="number" data-k="school.len" value="${s.len}"></label>
          <label class="f">Teneffüs (dk)<input type="number" data-k="school.brk" value="${s.brk}"></label>
          <label class="f">Öğle arası şu dersten sonra<input type="number" data-k="school.lunchAfter" value="${s.lunchAfter}"></label>
          <label class="f">Öğle arası (dk)<input type="number" data-k="school.lunchLen" value="${s.lunchLen}"></label>
          ${s.educationMode === 'dual_shift' ? `
          <label class="f">Sabahçı ilk ders<input type="time" data-k="school.morningStart" value="${esc(s.morningStart || '07:30')}"></label>
          <label class="f">Öğlenci ilk ders<input type="time" data-k="school.afternoonStart" value="${esc(s.afternoonStart || '13:00')}"></label>` : ''}
        </div>
        ${s.educationMode === 'dual_shift' ? `<div class="msg info" style="margin:10px 0 6px"><span class="ic">i</span><div><b>İkili Öğretim Aktif:</b> Sabahçı sınıflar <b>${esc(EP.times(S, 'morning')[0] || '')}</b>, Öğlenci sınıflar <b>${esc(EP.times(S, 'afternoon')[0] || '')}</b> saatinde başlar; sınıf çıktılarında her devrenin kendi zil saati görünür.</div><span></span></div>` : ''}
        <p class="small muted" style="margin:10px 0 6px">Her dersin başlangıç ve bitiş saatini aşağıdan tek tek özelleştirebilirsiniz (program şablonlarında, PDF/Yazdır belgelerinde ve WhatsApp görsellerinde birebir görünür):</p>
        <div style="border:1px solid var(--line);border-radius:10px;padding:6px 8px">
          <table class="tbl"><thead><tr><th style="width:74px">Ders</th><th>Başlangıç</th><th>Bitiş</th></tr></thead><tbody>
          ${tm.map((rng, p) => {
            const parts = rng.split('–');
            return `<tr><td><b>${p + 1}. ders</b></td>
              <td><input type="time" data-ctime="${p}|start" value="${esc(parts[0] || '')}" style="min-height:32px;padding:4px 8px"></td>
              <td><input type="time" data-ctime="${p}|end" value="${esc(parts[1] || '')}" style="min-height:32px;padding:4px 8px"></td></tr>`;
          }).join('')}
          </tbody></table>
        </div>
      </div></div>` + adminCard();
  }

  /* 3. Öğretmenler */
  function catalogEntries() {
    const T = EP.typeOf(S), out = [], seen = new Set();
    const rng = a => a.length ? EP.gradeRange(a) : '';
    const push = (grp, name, grades) => {
      if (!grades.length) return;
      const g = grades[0], so = g >= 1 && g <= 4 && EP.SO_SET.has(name), key = EP.findSubj(S, name, so) || EP.trSlug(name) + (so ? '_SO' : '');
      if (seen.has(key)) return; seen.add(key);
      out.push({ grp, key, name, grade: g, label: name + ' (' + rng(grades) + (so ? ', sınıf öğretmeni' : '') + ')', branch: S.subjects[key] ? S.subjects[key][2] : EP.branchOf(name, g, S.school.type) });
    };
    if (T) {
      for (const r of T.z) {
        const gs = T.grades.filter((g, i) => r[1][i] > 0);
        if (EP.SO_SET.has(r[0]) && gs.some(g => g >= 1 && g <= 4) && gs.some(g => g > 4)) { push('Zorunlu dersler', r[0], gs.filter(g => g >= 1 && g <= 4)); push('Zorunlu dersler', r[0], gs.filter(g => g > 4)); }
        else push('Zorunlu dersler', r[0], gs);
      }
      for (const r of T.pool) {
        const gs = T.poolGrades.filter((g, i) => (r[3].split('|')[i] || '') !== '');
        push('Seçmeli · ' + EP.GRP[r[1]], r[0], gs);
      }
    }
    for (const k of SK) if (!seen.has(k)) { seen.add(k); out.push({ grp: 'Okulun diğer dersleri', key: k, name: SN(k), grade: 9, label: SN(k), branch: SB(k) }); }
    return out;
  }

  function ruleDesc(r) {
    const who = r.who === 'all' ? 'Tüm öğretmenler' : (r.ids || []).map(id => { const t = S.teachers.find(x => x.id === id); return t ? t.name : '?'; }).join(', ') || 'öğretmen seçilmedi';
    return { who, txt: `bir sınıfta en fazla ${r.max} saat ${EP.SCOPE[r.scope]} ders` };
  }

  function extraBlock(t) {
    const ents = catalogEntries(), groups = [...new Set(ents.map(e => e.grp))], have = new Set(t.extra || []);
    const stateOf = e => e.branch === t.branch ? 'kendi branşı' : have.has(e.key) ? 'eklendi' : '';
    const opts = groups.map(g => `<optgroup label="${esc(g)}">${ents.filter(e => e.grp === g).map(e => { const st = stateOf(e); return `<option value="${esc(e.key)}|${e.grade}|${esc(e.name)}" ${st ? 'disabled' : ''}>${esc(e.label)} · ${esc(e.branch)}${st ? ' · ' + st : ''}</option>`; }).join('')}</optgroup>`).join('');
    const myRules = S.rules.filter(r => r.type === 'tclass' && (r.who === 'all' || (r.ids || []).includes(t.id)));
    return `<div class="card" style="background:var(--soft);border:0;margin-bottom:14px">
      <h3>Branş dışı okutabileceği dersler</h3>
      <p class="small muted" style="margin:4px 0 10px">Branş öğretmeni yetmediğinde otomatik atama bu derslerde bu öğretmeni kullanır.</p>
      <div class="tray">${(t.extra || []).map(k => `<span class="chip ${colorOf(k)}">${esc(SN(k))} <button class="btn sm ghost" style="min-height:22px;padding:0 6px" data-act="exDel" data-id="${t.id}" data-k="${k}">×</button></span>`).join('') || '<span class="small muted">Henüz yok.</span>'}
      ${(t.extra || []).length ? `<button class="btn sm ghost" data-act="exClear" data-id="${t.id}">Tümünü kaldır</button>` : ''}</div>
      <div class="row" style="margin-top:10px"><select id="exSel" style="max-width:420px">${opts}</select><button class="btn sm" data-act="exAdd" data-id="${t.id}">Tek ekle</button></div>
      <details style="margin-top:10px"><summary>Toplu seç ve ekle</summary>
        <div class="row" style="margin:8px 0"><input id="exQ" placeholder="Ders ara…" style="max-width:260px"><button class="btn sm ghost" data-act="exAll">Görünenleri işaretle</button><button class="btn sm ghost" data-act="exNone">İşaretleri kaldır</button></div>
        <div id="exBox" style="max-height:280px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:8px 12px;background:var(--paper)">${groups.map(g => `<div class="exg"><b class="small" style="display:block;margin:8px 0 4px">${esc(g)}</b>${ents.filter(e => e.grp === g).map(e => { const st = stateOf(e); return `<label class="exi row small" style="gap:8px;min-height:28px;${st ? 'opacity:.5' : ''}" data-q="${esc(e.label.toLocaleLowerCase('tr'))}"><input type="checkbox" class="exChk" value="${esc(e.key)}|${e.grade}|${esc(e.name)}" ${st ? 'disabled' : ''}>${esc(e.label)} <span class="muted">· ${esc(e.branch)}${st ? ' · ' + st : ''}</span></label>`; }).join('')}</div>`).join('')}</div>
        <button class="btn sm pri" data-act="exBulk" data-id="${t.id}" style="margin-top:8px">İşaretlenenleri ekle</button>
      </details>
      <h3 style="margin-top:16px">Sınıf başına ders sınırı</h3>
      ${myRules.length ? `<div class="diag" style="gap:6px;margin-top:6px">${myRules.map(r => { const d = ruleDesc(r); return `<div class="row" style="justify-content:space-between;background:var(--paper);border-radius:9px;padding:6px 10px"><span class="small">${r.who === 'all' ? '<span class="tag" style="background:var(--soft)">Toplu</span> ' : ''}${esc(d.txt)}${r.on ? '' : ' <span class="muted">(kapalı)</span>'}</span>${r.who === 'all' ? '' : `<button class="btn sm ghost" data-act="tcOne" data-id="${r.id}" data-t="${t.id}">Kaldır</button>`}</div>`; }).join('')}</div>` : '<p class="small muted" style="margin-top:4px">Bu öğretmene sınır uygulanmıyor.</p>'}
      <div class="row" style="margin-top:8px"><select id="tcScopeT">${Object.entries(EP.SCOPE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><select id="tcMaxT">${[1, 2, 3, 4, 5, 6].map(n => `<option ${n === 2 ? 'selected' : ''}>${n}</option>`).join('')}</select><button class="btn sm" data-act="tcAddT" data-id="${t.id}">Bu öğretmene sınır ekle</button></div>
    </div>`;
  }

  /* ---------- Modern Öğretmen Ders Görevlendirme Bileşeni (3. ve 7. Menü Ortak) ---------- */
  let dragCardId = null;

  function teacherAssignCardHtml(c, draggable) {
    const mode = EP.tMode(S, c);
    const kindLbl = c.kind === 'secmeli' ? 'Seçmeli' : c.kind === 'ek' ? 'Ek' : 'Zorunlu';
    const isExt = mode === 'dis' || mode === 'ek';
    return `<div class="acard" data-acard="${c.id}" ${draggable ? `draggable="true" data-drag-card="${c.id}"` : ''}>
      <div class="acard-top">
        <div class="acard-title">
          <span class="acard-cls">${esc(cName(c.classId))}</span>
          <span class="tag ${colorOf(c.subj)}">${esc(SS(c.subj))}</span>
          <span class="acard-name" title="${esc(SN(c.subj))}">${esc(SN(c.subj))}</span>
        </div>
        <button class="btn sm ghost" style="min-height:28px;padding:0 7px;color:var(--err)" data-act="delCardConfirm" data-id="${c.id}" title="Dersi sınıftan tamamen sil">×</button>
      </div>
      <div class="acard-meta">
        <span>${kindLbl}</span>
        <span>·</span>
        <span>${c.hours} saat (${esc(c.pattern)})</span>
        ${isExt ? `<span class="tag" style="background:var(--warnBg);color:var(--warn)">${mode === 'ek' ? 'Branş dışı (tanımlı)' : 'Branş dışı'}</span>` : ''}
      </div>
      <div class="acard-ctrls">
        <label class="f">Saat<input type="number" min="1" max="12" data-card="${c.id}" data-f="hours" value="${c.hours}" aria-label="Haftalık saat"></label>
        <label class="f">Blok düzeni${blkSelect(c)}</label>
      </div>
      <div class="acard-foot">
        <select data-card="${c.id}" data-f="teacherId" title="Başka öğretmene aktar" aria-label="Öğretmen aktar">${tOptions(c)}</select>
        <button class="btn sm" data-act="swapCardModal" data-id="${c.id}" title="Başka bir öğretmenin dersiyle yer değiştir">Takas ⇄</button>
        <button class="btn sm ghost" data-act="unassignCard" data-id="${c.id}" title="Öğretmen atamasını kaldır (ders sınıfta kalır)">Boşa çıkar</button>
      </div>
    </div>`;
  }

  function teacherAssignSection(t, opts) {
    const o = opts || {};
    const myCards = S.cards.filter(c => c.teacherId === t.id).sort((a, b) => cName(a.classId).localeCompare(cName(b.classId), 'tr') || SN(a.subj).localeCompare(SN(b.subj), 'tr'));
    const totH = myCards.reduce((a, c) => a + (+c.hours || 0), 0);
    const openH = EP.openOf(S, t).tot;
    const capH = Math.min(+t.wmax || 30, openH);
    const bransH = myCards.filter(c => ['brans', 'rehber'].includes(EP.tMode(S, c))).reduce((a, c) => a + (+c.hours || 0), 0);
    const disH = totH - bransH;
    const clsCount = new Set(myCards.map(c => c.classId)).size;
    const pct = capH ? Math.min(100, Math.round(100 * totH / capH)) : 0;
    const barColor = totH > openH ? 'var(--err)' : totH >= capH && totH > 0 ? 'var(--warn)' : 'var(--ok)';

    const unassigned = S.cards.filter(c => !c.teacherId).sort((a, b) => {
      const am = SB(a.subj) === t.branch ? 0 : (t.extra || []).includes(a.subj) ? 1 : 2;
      const bm = SB(b.subj) === t.branch ? 0 : (t.extra || []).includes(b.subj) ? 1 : 2;
      return am - bm || cName(a.classId).localeCompare(cName(b.classId), 'tr');
    });
    const firstClsId = S.classes[0] ? S.classes[0].id : '';
    const subjOpts = [...SK].sort((a, b) => SN(a).localeCompare(SN(b), 'tr')).map(k => {
      const dup = firstClsId && EP.findClassSubjCard(S, firstClsId, k);
      return `<option value="${k}" ${dup ? 'disabled' : ''}>${esc(SN(k))} · ${esc(SB(k))}${dup ? ' (Sınıfta zaten var)' : ''}</option>`;
    }).join('');

    return `<div style="margin-top:${o.standalone ? '0' : '18px'}">
      <div class="load-meter">
        <div class="row" style="justify-content:space-between">
          <div>
            <b style="font-size:15px">Atanan Dersler · ${totH} / ${openH} saat</b>
            <div class="small muted" style="margin-top:2px">${myCards.length} ders kartı · ${clsCount} farklı şube · Branş: ${bransH} sa${disH ? ` · Branş dışı: ${disH} sa` : ''}${o.draggable ? ' · Kartı soldaki başka öğretmenin üzerine sürükleyerek aktarabilirsiniz.' : ''}</div>
          </div>
          <div class="row">
            ${o.standalone
              ? `<button class="btn sm" data-act="goFix" data-go="teachers" data-id="${t.id}">Müsaitlik &amp; Profili Aç →</button>`
              : `<button class="btn sm pri" data-act="goTAssign" data-id="${t.id}">7. Görevlendirmelerde Yönet →</button>`}
          </div>
        </div>
        <div class="bar"><i style="width:${pct}%;background:${barColor}"></i></div>
      </div>

      ${myCards.length
        ? `<div class="acard-grid">${myCards.map(c => teacherAssignCardHtml(c, !!o.draggable)).join('')}</div>`
        : '<div class="empty" style="margin-top:10px">Bu öğretmene henüz ders atanmadı. Aşağıdan boştaki bir dersi devralabilir veya yeni ders ekleyebilirsiniz.</div>'}

      <div class="grid2" style="margin-top:14px">
        <div class="card" style="background:var(--soft);border:0;padding:14px">
          <h3>Boştaki derslerden devral (${unassigned.length})</h3>
          <p class="small muted" style="margin:3px 0 10px">Öğretmenin branşına uyan dersler en üstte listelenir.</p>
          ${unassigned.length
            ? `<div class="diag" style="gap:6px;max-height:220px;overflow:auto">${unassigned.slice(0, 20).map(u => {
                const match = SB(u.subj) === t.branch;
                return `<div class="row" style="justify-content:space-between;background:var(--paper);border:1px solid ${match ? 'var(--ok)' : 'var(--line)'};border-radius:9px;padding:6px 10px">
                  <span class="small"><b>${esc(cName(u.classId))}</b> · <span class="tag ${colorOf(u.subj)}">${esc(SS(u.subj))}</span> ${esc(SN(u.subj))} (${u.hours} sa)</span>
                  <button class="btn sm ${match ? 'pri' : ''}" data-act="claimCard" data-id="${u.id}" data-t="${t.id}">+ Üzerine Al</button>
                </div>`;
              }).join('')}</div>`
            : '<p class="small muted">Şu an öğretmensiz boş ders kartı yok.</p>'}
        </div>

        <div class="card" style="background:var(--soft);border:0;padding:14px">
          <h3>Bu öğretmene yeni ders ekle</h3>
          <p class="small muted" style="margin:3px 0 10px">Seçtiğiniz sınıfa yeni ders kartı oluşturur ve doğrudan bu öğretmene atar.</p>
          <div class="fields">
            <label class="f">Sınıf<select id="tqaC_${t.id}" data-tqac="${t.id}">${S.classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
            <label class="f">Ders<select id="tqaS_${t.id}">${subjOpts}</select></label>
            <label class="f">Haftalık saat<input type="number" id="tqaH_${t.id}" min="1" max="12" value="2"></label>
            <label class="f">Tür<select id="tqaK_${t.id}"><option value="zorunlu">Zorunlu</option><option value="secmeli">Seçmeli</option><option value="ek">Ek / Branş dışı</option></select></label>
          </div>
          <button class="btn sm pri" data-act="tQuickAdd" data-id="${t.id}" style="margin-top:10px" ${S.classes.length ? '' : 'disabled'}>Oluştur ve Öğretmene Ata</button>
        </div>
      </div>
    </div>`;
  }

  function openSwapCardModal(cardId) {
    const src = S.cards.find(c => c.id === cardId);
    if (!src) return;
    const srcT = S.teachers.find(t => t.id === src.teacherId);
    const L = EP.loads(S);
    const others = S.cards
      .filter(c => c.id !== src.id && c.teacherId && c.teacherId !== src.teacherId)
      .sort((a, b) => {
        const as = SB(a.subj) === SB(src.subj) ? 0 : 1;
        const bs = SB(b.subj) === SB(src.subj) ? 0 : 1;
        return as - bs || cName(a.classId).localeCompare(cName(b.classId), 'tr');
      });

    const M = $('#modalRoot');
    M.innerHTML = `<div class="modal"><div class="box" style="width:min(640px,100%)">
      <h2>Ders Yer Değiştirme (Takas ⇄)</h2>
      <div class="msg info"><span class="ic">⇄</span><div>
        <b>Seçilen ders:</b> ${esc(cName(src.classId))} · <span class="tag ${colorOf(src.subj)}">${esc(SS(src.subj))}</span> ${esc(SN(src.subj))} (${src.hours} sa) — <b>${esc(tName(srcT))}</b>
      </div><span></span></div>
      <input id="swapQ" placeholder="Sınıf, ders veya öğretmen ara…" style="width:100%">
      <div id="swapList" class="diag" style="max-height:360px;overflow:auto;gap:6px">
        ${others.length ? others.map(o => {
          const ot = S.teachers.find(t => t.id === o.teacherId);
          const sameBr = SB(o.subj) === SB(src.subj);
          const srcNew = (L[src.teacherId] || 0) - (+src.hours) + (+o.hours);
          const oNew = (L[o.teacherId] || 0) - (+o.hours) + (+src.hours);
          const q = [cName(o.classId), SN(o.subj), SS(o.subj), ot ? ot.name : ''].join(' ').toLocaleLowerCase('tr');
          return `<div class="swap-item swi" data-q="${esc(q)}">
            <div>
              <div><b>${esc(cName(o.classId))}</b> · <span class="tag ${colorOf(o.subj)}">${esc(SS(o.subj))}</span> ${esc(SN(o.subj))} (${o.hours} sa) ${sameBr ? '<span class="tag" style="background:var(--okBg);color:var(--ok)">Aynı branş</span>' : ''}</div>
              <div class="small muted" style="margin-top:3px">${esc(tName(ot))} · Takas sonrası yükler: ${esc(tShort(srcT))} ${L[src.teacherId] || 0}→<b>${srcNew}</b> sa · ${esc(tShort(ot))} ${L[o.teacherId] || 0}→<b>${oNew}</b> sa</div>
            </div>
            <button class="btn sm pri" data-swap-go="${o.id}">Yer Değiştir ⇄</button>
          </div>`;
        }).join('') : '<p class="small muted">Yer değiştirilebilecek başka öğretmen dersi bulunamadı.</p>'}
      </div>
      <div class="row" style="justify-content:flex-end"><button class="btn" id="mSwapClose">Kapat</button></div>
    </div></div>`;

    $('#mSwapClose').addEventListener('click', () => { M.innerHTML = ''; });
    const qInp = $('#swapQ');
    if (qInp) {
      qInp.addEventListener('input', () => {
        const q = qInp.value.toLocaleLowerCase('tr').trim();
        M.querySelectorAll('.swi').forEach(row => { row.style.display = !q || row.dataset.q.includes(q) ? '' : 'none'; });
      });
    }
    M.querySelectorAll('[data-swap-go]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dst = S.cards.find(c => c.id === btn.dataset.swapGo);
        if (!dst) return;
        snap();
        const tmpT = src.teacherId;
        src.teacherId = dst.teacherId;
        dst.teacherId = tmpT;
        const { bad } = EP.placedCore(S);
        bad.filter(b => b.split(':')[0] === src.id || b.split(':')[0] === dst.id).forEach(b => delete S.place[b]);
        M.innerHTML = '';
        commit();
        toast(`${cName(src.classId)} ${SS(src.subj)} ⇄ ${cName(dst.classId)} ${SS(dst.subj)} öğretmenleri yer değiştirildi.`);
      });
    });
  }

  function vOgretmen() {
    const L = EP.loads(S);
    const t = S.teachers.find(x => x.id === S.ui.tsel) || S.teachers[0];
    const list = S.teachers.map(x => {
      const o = EP.openOf(S, x).tot, l = L[x.id] || 0, cls = l > o ? 'err' : l === o && l ? 'warn' : 'ok';
      const ak = EP.staffAdminKind(S, x);
      const roleTag = ak === 'mudur' ? ' · Okul Müdürü' : ak === 'mudur_yardimcisi' ? ' · Müdür Yrd.' : ak === 'rehber' ? ' · PDR' : '';
      return `<div class="tl ${t && t.id === x.id ? 'on' : ''}" data-act="tsel" data-id="${x.id}" data-drop-t="${x.id}"><div><b>${esc(x.name)}</b><small>${esc(x.branch || 'Branş yok')}${roleTag}${(x.extra || []).length ? ' · +' + x.extra.length + ' branş dışı' : ''}</small></div><span class="pill ${cls}">${l}/${o} sa</span></div>`;
    }).join('');
    const pl = EP.dutyPlaces(S);
    const tAdmin = t ? EP.staffAdminKind(S, t) : '';
    const tExempt = t ? EP.isDutyExempt(S, t) : false;
    return H('Öğretmenler ve müsaitlik', 'Branşı, unvan/nöbet muafiyetini, sosyal kulübü, müsaitlik matrisini ve öğretmene atanan dersleri (ekleme, düzenleme, aktarma, takas) buradan yönetin.',
      `<button class="btn pri" data-act="addT">Öğretmen ekle</button><button class="btn" data-act="importTeachers">Excel / e-Okul'dan Aktar</button><button class="btn" data-act="bulkT">Branşa göre eksikleri ekle</button>`) +
      (S.teachers.length ? `<div class="board" style="grid-template-columns:300px minmax(0,1fr)"><div class="tlist">${list}</div>${t ? `<div class="card">
        <div class="row" style="justify-content:space-between"><h2>${esc(t.name)}</h2><button class="btn sm ghost" data-act="delT" data-id="${t.id}">Öğretmeni sil</button></div>
        <div class="fields" style="margin:12px 0">
          <label class="f">Ad soyad<input data-t="${t.id}" data-f="name" value="${esc(t.name)}"></label>
          <label class="f">Kısa ad<input data-t="${t.id}" data-f="short" value="${esc(t.short)}" placeholder="${esc(tShort(t))}"></label>
          <label class="f">Branş<select data-t="${t.id}" data-f="branch">${BRANS.map(b => `<option ${t.branch === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>
          <label class="f">Görev / Unvan<select data-t="${t.id}" data-f="role">${EP.STAFF_ROLES.map(([k, l]) => `<option value="${k}" ${(t.role || 'ogretmen') === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
          <label class="f">Günlük en fazla ders<input type="number" min="1" max="12" data-t="${t.id}" data-f="dmax" value="${t.dmax}"></label>
          <label class="f">En fazla ardışık (0 = sınırsız)<input type="number" min="0" max="12" data-t="${t.id}" data-f="cmax" value="${t.cmax}"></label>
          <label class="f">Haftalık üst sınır<input type="number" min="1" max="60" data-t="${t.id}" data-f="wmax" value="${t.wmax || 30}"></label>
          <label class="f">Nöbet durumu<span class="row small" style="min-height:40px;padding:0 8px;border:1px solid var(--line);border-radius:9px"><input type="checkbox" data-t="${t.id}" data-f="dutyExempt" ${tExempt ? 'checked' : ''} ${tAdmin ? 'disabled' : ''}> ${tExempt ? esc(EP.dutyExemptReason(S, t)) : 'Öğretmen nöbeti tutar'}</span></label>
          ${tExempt ? '' : `<label class="f">Nöbet günü<select data-t="${t.id}" data-f="dutyD"><option value="">—</option>${GUN.slice(0, +S.school.D).map((g, d) => `<option value="${d}" ${EP.dutyOf(t).d === d ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
          <label class="f">Nöbet yeri<select data-t="${t.id}" data-f="dutyP">${pl.map(p => `<option ${(t.dutyP || pl[0]) === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>`}
          <label class="f" style="grid-column:span 2">Sosyal kulüp (MEB Listesi)<select data-t="${t.id}" data-f="kulup">${EP.clubOptions(S, t.kulup || '')}</select></label>
        </div>
        ${extraBlock(t)}
        ${matrix('t', t)}
        ${teacherAssignSection(t, { standalone: false, draggable: true })}
      </div>` : ''}</div>` : '<div class="empty">Henüz öğretmen yok.</div>');
  }

  /* 4. Sınıflar ve Şubeler */
  function vSinif() {
    const op = S.ui.openCls, T = EP.typeOf(S), G = T ? T.grades : [5, 6, 7, 8];
    return H('Sınıflar ve şubeler', `Şubeleri ekleyin. Toplu eklemede ${T ? esc(T.ad) + ' çizelgesindeki' : 'şablondaki'} zorunlu dersler kendiliğinden eklenir ve öğretmenler otomatik atanır.`,
      `<button class="btn pri" data-act="bulkCls">Toplu sınıf ekle</button><button class="btn" data-act="importClasses">Excel / e-Okul'dan Aktar</button><button class="btn" data-act="addCls">Tek şube ekle</button><button class="btn" data-act="rehAuto">Rehber öğretmenleri dağıt</button>`) +
      `<div class="card" style="display:${S.ui.bulk ? 'block' : 'none'};margin-bottom:16px"><h2>Toplu sınıf ekle</h2><div class="fields" style="margin-top:12px">
        ${G.map(g => `<label class="f">${EP.gradeLabel(g)} şube sayısı<input type="number" min="0" max="20" value="${S.classes.some(c => c.grade === g) ? 0 : 1}" id="bg${g}"></label>`).join('')}
      </div><div class="row" style="margin-top:12px"><button class="btn pri" data-act="bulkGo">Ekle ve zorunlu dersleri oluştur</button><button class="btn ghost" data-act="bulkCls">Vazgeç</button></div></div>` +
      (S.classes.length ? `<div class="card scroll"><table class="tbl"><thead><tr><th>Şube</th><th class="n">Düzey</th><th>Devre</th><th>Ana Derslik</th><th class="n">Ders/Çizelge</th><th class="n">Açık</th><th>Rehber öğretmen</th><th>Durum</th><th></th></tr></thead><tbody>${S.classes.map(c => {
        const st = EP.clsStat(S, c), o = EP.classOpen(S, c).tot, rh = EP.rehberOf(S, c);
        return `<tr>
          <td><input data-cls="${c.id}" data-f="name" value="${esc(c.name)}" style="width:92px"></td>
          <td class="n"><input type="number" min="0" max="12" data-cls="${c.id}" data-f="grade" value="${c.grade}" title="0 = Hazırlık Sınıfı" style="width:62px">${+c.grade === 0 ? '<div class="small muted">Hazırlık</div>' : ''}</td>
          <td><select data-cls="${c.id}" data-f="shift"><option value="full" ${c.shift === 'full' ? 'selected' : ''}>Tam gün</option><option value="morning" ${c.shift === 'morning' ? 'selected' : ''}>Sabahçı</option><option value="afternoon" ${c.shift === 'afternoon' ? 'selected' : ''}>Öğlenci</option></select></td>
          <td><select data-cls="${c.id}" data-f="homeRoomId" style="max-width:140px"><option value="">—</option>${(S.rooms || []).map(r => `<option value="${r.id}" ${c.homeRoomId === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></td>
          <td class="n">${st.tot}${st.tg ? '/' + st.tg : ''}</td>
          <td class="n">${o}</td>
          <td><select data-cls="${c.id}" data-f="rehber" style="max-width:190px"><option value="">${rh && !c.rehber ? 'Otomatik: ' + esc(tName(S.teachers.find(t => t.id === rh))) : '— Seçilmedi —'}</option>${S.teachers.map(t => `<option value="${t.id}" ${c.rehber === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></td>
          <td>${st.tot > o ? '<span class="tag" style="background:var(--errBg);color:var(--err)">Sığmıyor</span>' : st.tg && st.tot < st.tg ? `<span class="tag" style="background:var(--warnBg);color:var(--warn)">${st.tg - st.tot} eksik</span>` : '<span class="tag" style="background:var(--okBg);color:var(--ok)">Uygun</span>'}</td>
          <td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="goCls" data-id="${c.id}">Dersler</button> <button class="btn sm ghost" data-act="clsSlots" data-id="${c.id}">${op === c.id ? 'Kapat' : 'Saatler'}</button> <button class="btn sm ghost" data-act="delCls" data-id="${c.id}">Sil</button></td>
        </tr>${op === c.id ? `<tr><td colspan="9">${matrix('cls', c)}</td></tr>` : ''}`;
      }).join('')}</tbody></table></div>` : '<div class="empty">Henüz şube yok. “Toplu sınıf ekle” ile başlayın.</div>');
  }

  /* 5. Dersler ve Bloklar (4 Sekmeli Tam Havuz) */
  function customHours(x) { return [...new Set(Object.values(x.hrs || {}).flatMap(EP.hrsList))].sort((a, b) => a - b); }
  function gradesWith(x, h) { return Object.keys(x.hrs || {}).map(Number).filter(g => EP.hrsList(x.hrs[g]).includes(h)).sort((a, b) => a - b); }
  const rngG = a => {
    if (!a || !a.length) return '—';
    const hasHz = a.includes(0);
    const nums = a.filter(g => g !== 0);
    const parts = [];
    if (hasHz) parts.push('Hazırlık');
    if (nums.length) parts.push((nums.length > 1 && nums.every((g, i) => !i || g === nums[i - 1] + 1) ? nums[0] + '–' + nums.at(-1) : nums.join(', ')) + '. sınıf');
    return parts.join(', ');
  };
  function catalogNames() { const T = EP.typeOf(S); return new Set(T ? [...T.z.map(r => r[0]), ...T.pool.map(r => r[0])] : []); }
  function cdDraft(kind) { const d = S.ui.cd; if (d && d.kind === kind) return d; return (S.ui.cd = { kind, name: '', short: '', branch: '', times: 1, hrs: {}, blk: {}, edit: null }); }
  function bGet(sc, id, h) { if (sc === 'g') return (S.blk || {})[id + '|' + h] || null; return ((S.ui.cd || {}).blk || {})[h] || null; }
  function bEff(sc, id, h) { return sc === 'g' ? EP.blkCfgN(S, id, h) : { mode: S.blkMode || 'fixed', pats: EP.autoDefault(h) }; }
  function bSet(sc, id, h, v) {
    if (sc === 'g') { S.blk = S.blk || {}; const k = id + '|' + h; if (v) S.blk[k] = v; else delete S.blk[k]; return EP.syncAll(S, c => EP.blkKey(S, c.subj, +c.hours) === k && !c.bmode); }
    const d = S.ui.cd; d.blk = d.blk || {}; if (v) d.blk[h] = v; else delete d.blk[h]; return 0;
  }
  function blkSummary(name, h) { const c = EP.blkCfgN(S, name, h); return c.mode === 'auto' ? c.pats.join(' → ') : c.pats[0]; }
  function blkCtl(sc, id, h, own, eff) {
    const mode = own ? own.mode : 'inherit', show = own || eff, gm = S.blkMode || 'fixed', A = `data-bsc="${sc}" data-bid="${esc(id)}" data-h="${h}"`;
    return `<div class="row" style="gap:6px;align-items:center;flex-wrap:wrap"><select ${A} style="width:auto"><option value="inherit" ${mode === 'inherit' ? 'selected' : ''}>Genel kural (${gm === 'auto' ? 'otomatik' : 'sabit'})</option><option value="fixed" ${mode === 'fixed' ? 'selected' : ''}>Sabit</option>${EP.minPats(h) > 1 ? `<option value="auto" ${mode === 'auto' ? 'selected' : ''}>Otomatik (en az 2 tip)</option>` : ''}</select>
      <div class="row" style="gap:4px;flex-wrap:wrap">${EP.partitions(h).map(p => { const i = show.pats.indexOf(p), on = show.mode === 'auto' ? i >= 0 : i === 0; return `<button class="btn sm ${on ? 'pri' : ''}" data-act="bchip" ${A} data-p="${p}" aria-pressed="${on}">${on && show.mode === 'auto' && show.pats.length > 1 ? (i + 1) + '. ' : ''}${p}</button>`; }).join('')}</div></div>`;
  }

  function customForm(kind) {
    const T = EP.typeOf(S), d = cdDraft(kind), hs = customHours(d), sec = kind === 'secmeli';
    return `<div class="card" style="margin-top:12px"><h2>${d.edit ? 'Dersi düzenle' : sec ? 'Seçmeli ders ekle' : 'Zorunlu ders ekle'}</h2>
      <p class="small muted" style="margin:4px 0 10px">${sec ? 'Eklenen ders “Okulun eklediği seçmeli dersler” grubunda görünür. İki seçenek için 1/2 yazın.' : 'Eklenen ders “Sınıflara ekle” ve “Eksik zorunlu dersleri ekle” ile sınıflara gelir.'}</p>
      <div class="fields">
        <label class="f">Ders adı<input data-cd="name" value="${esc(d.name)}" ${d.edit ? 'readonly' : ''} placeholder="${sec ? 'ör. Satranç' : 'ör. Değerler Eğitimi'}"></label>
        <label class="f">Kısa ad<input data-cd="short" value="${esc(d.short)}" placeholder="otomatik"></label>
        <label class="f">Branş<input data-cd="branch" list="brlist" value="${esc(d.branch)}" placeholder="ör. Matematik"></label>
        ${sec ? `<label class="f">Kaç kez alınabilir<input type="number" min="1" max="4" data-cd="times" value="${d.times || 1}"></label>` : ''}
      </div>
      <h3 style="margin:12px 0 6px">Haftalık ders saati</h3>
      <div class="row" style="gap:8px;flex-wrap:wrap">${T.grades.map(g => `<label class="f" style="width:88px">${EP.gradeLabel(g)}<input data-cd="h" data-g="${g}" value="${esc(d.hrs[g] || '')}" placeholder="–"></label>`).join('')}</div>
      <h3 style="margin:14px 0 6px">Ders blokları</h3>
      ${hs.length ? `<div class="diag" style="gap:8px">${hs.map(h => `<div class="row" style="gap:10px;align-items:center"><b style="width:70px">${h} saat</b><span class="small muted" style="width:110px">${esc(rngG(gradesWith(d, h)))}</span>${blkCtl('d', '', h, bGet('d', '', h), bEff('d', '', h))}</div>`).join('')}</div>` : '<p class="small muted">Önce en az bir sınıf için saat yazın.</p>'}
      <datalist id="brlist">${BRANS.concat([EP.REHB]).map(b => `<option value="${esc(b)}">`).join('')}</datalist>
      <div class="row" style="margin-top:14px"><button class="btn pri" data-act="cdSave">${d.edit ? 'Değişiklikleri kaydet' : 'Dersi ekle'}</button>${d.edit || d.name || Object.keys(d.hrs).length ? '<button class="btn ghost" data-act="cdCancel">Vazgeç</button>' : ''}</div></div>`;
  }

  function customList(kind) {
    const T = EP.typeOf(S), xs = (S.custom || []).filter(x => x.kind === kind); if (!xs.length) return '';
    return `<div class="card scroll" style="margin-top:12px"><h2>Okulun eklediği ${kind === 'secmeli' ? 'seçmeli' : 'zorunlu'} dersler</h2>
      <table class="tbl" style="margin-top:8px"><thead><tr><th>Ders</th><th>Branş</th>${T.grades.map(g => `<th class="n">${EP.gradeShort(g)}</th>`).join('')}<th>Bloklar</th><th class="n">Kart</th><th></th></tr></thead><tbody>${xs.map(x => {
        const k = EP.findSubj(S, x.name, false), n = k ? S.cards.filter(c => c.subj === k).length : 0;
        return `<tr><td>${k ? `<span class="tag ${colorOf(k)}">${esc(SS(k))}</span> ` : ''}${esc(x.name)}${kind === 'secmeli' ? ` <span class="muted">(${x.times || 1})</span>` : ''}</td>
          <td class="small muted">${esc(k ? SB(k) : x.branch)}</td>${T.grades.map(g => `<td class="n" style="color:${x.hrs[g] ? 'inherit' : 'var(--line)'}">${esc(x.hrs[g] || '–')}</td>`).join('')}
          <td class="small">${customHours(x).map(h => `${h} sa: <b>${esc(blkSummary(x.name, h))}</b>`).join('<br>')}</td><td class="n">${n}</td>
          <td><div class="row" style="gap:4px;flex-wrap:nowrap">${kind === 'zorunlu' ? `<button class="btn sm" data-act="cdApply" data-id="${x.id}">Sınıflara ekle</button>` : ''}<button class="btn sm" data-act="cdEdit" data-id="${x.id}">Düzenle</button><button class="btn sm ghost" data-act="cdDel" data-id="${x.id}">Sil</button></div></td></tr>`;
      }).join('')}</tbody></table></div>`;
  }

  function blkSections() {
    const T = EP.typeOf(S), sec = [], seen = new Set();
    const add = (arr, name, h, grades) => { const k = name + '|' + h; if (seen.has(k)) return; seen.add(k); arr.push({ name, h, grades, k }); };
    if (T) {
      const z = []; for (const r of T.z) for (const h of [...new Set(r[1].filter(x => x > 0))].sort((a, b) => a - b)) add(z, r[0], h, T.grades.filter((g, i) => r[1][i] === h));
      sec.push({ id: 'z', t: 'Zorunlu dersler', sub: T.ad, rows: z });
      const s = []; for (const r of T.pool) { const per = r[3].split('|'); for (const h of [...new Set(per.flatMap(EP.hrsList))].sort((a, b) => a - b)) add(s, r[0], h, T.poolGrades.filter((g, i) => EP.hrsList(per[i]).includes(h))); }
      sec.push({ id: 's', t: 'Seçmeli dersler', sub: T.ad, rows: s });
    }
    const cu = []; for (const x of S.custom || []) for (const h of customHours(x)) add(cu, x.name, h, gradesWith(x, h));
    if (cu.length) sec.push({ id: 'c', t: 'Okulun eklediği dersler', sub: 'elle eklenen zorunlu ve seçmeli', rows: cu });
    const ot = []; for (const c of S.cards) add(ot, EP.nameOf(S, c.subj), +c.hours, []);
    for (const r of ot) r.grades = [...new Set(S.cards.filter(c => EP.blkKey(S, c.subj, +c.hours) === r.k).map(c => (S.classes.find(x => x.id === c.classId) || {}).grade).filter(g => g != null))].sort((a, b) => a - b);
    if (ot.length) sec.push({ id: 'o', t: 'Diğer dersler', sub: 'ek veya saati değiştirilmiş kartlar', rows: ot });
    return sec;
  }

  function blocksTab() {
    const gm = S.blkMode || 'fixed', autoN = S.cards.filter(c => EP.effCfg(S, c).mode === 'auto').length, used = {}, ov = {};
    for (const c of S.cards) { const k = EP.blkKey(S, c.subj, +c.hours); used[k] = (used[k] || 0) + 1; if (c.bmode) ov[k] = (ov[k] || 0) + 1; }
    const onlyUsed = !!S.ui.bused, secs = blkSections();
    return `<div class="card" style="margin-bottom:12px"><h2>Genel blok kuralı</h2><p class="small muted" style="margin-top:4px">Derse veya sınıfa özel ayar yoksa bu kural geçerlidir. Şu an ${autoN} ders kartı otomatik blokta.</p>
      <div class="row" style="margin-top:10px"><button class="btn ${gm === 'fixed' ? 'pri' : ''}" data-act="blkMode" data-v="fixed">Sabit: her ders tercih edilen bloğuyla</button><button class="btn ${gm === 'auto' ? 'pri' : ''}" data-act="blkMode" data-v="auto">Otomatik: sığmazsa küçük bloklara böl</button></div></div>
      <div class="row" style="margin-bottom:10px;gap:10px"><input id="bQ" placeholder="Ders ara…" style="max-width:260px"><label class="row small" style="gap:6px;cursor:pointer"><input type="checkbox" data-ui="bused" ${onlyUsed ? 'checked' : ''}> Yalnız okulda kullanılan dersler</label></div>
      ${secs.map(sc => {
        const rows = sc.rows.filter(r => !onlyUsed || used[r.k]);
        return `<details class="card scroll" style="margin-bottom:12px" ${sc.id !== 'o' || !secs.some(x => x.id === 'z') ? 'open' : ''}><summary><b>${esc(sc.t)}</b> <span class="small muted">· ${esc(sc.sub)} · ${rows.length} satır</span></summary>
        ${rows.length ? `<table class="tbl" style="margin-top:8px"><thead><tr><th>Ders</th><th class="n">Saat</th><th>Sınıflar</th><th class="n">Kart</th><th>Blok modu ve tipleri</th><th>Sınıfa özel</th></tr></thead><tbody>${rows.map(r => {
          const key = EP.findSubj(S, r.name, false) || EP.findSubj(S, r.name, true);
          return `<tr class="bqi" data-q="${esc(r.name.toLocaleLowerCase('tr'))}"><td>${key ? `<span class="tag ${colorOf(key)}">${esc(SS(key))}</span> ` : ''}${esc(r.name)}</td><td class="n">${r.h}</td><td class="small muted" style="white-space:nowrap">${esc(rngG(r.grades))}</td><td class="n">${used[r.k] || '<span class="muted">–</span>'}</td>
          <td>${blkCtl('g', r.name, r.h, bGet('g', r.name, r.h), EP.blkCfgN(S, r.name, r.h))}</td><td>${ov[r.k] ? `${ov[r.k]} kart <button class="btn sm ghost" data-act="blkReset" data-k="${esc(r.k)}">Ders ayarına döndür</button>` : '<span class="muted small">—</span>'}</td></tr>`;
        }).join('')}</tbody></table>` : '<p class="small muted" style="padding:8px 0">Bu grupta okulda kullanılan ders yok.</p>'}</details>`;
      }).join('')}`;
  }

  function subjList() {
    const used = {}; for (const c of S.cards) used[c.subj] = (used[c.subj] || 0) + 1;
    const keys = [...SK].sort((a, b) => SN(a).localeCompare(SN(b), 'tr'));
    return `<datalist id="brlist">${BRANS.concat([EP.REHB]).map(b => `<option value="${esc(b)}">`).join('')}</datalist>
      <div class="card" style="margin-bottom:12px"><h2>Yeni ders ekle</h2><div class="fields" style="margin-top:10px">
        <label class="f">Ders adı<input id="nsN" placeholder="ör. Matematik Etüdü"></label><label class="f">Kısa ad<input id="nsS" placeholder="otomatik"></label><label class="f">Branş<input id="nsB" list="brlist" placeholder="ör. Matematik"></label></div>
        <button class="btn pri" data-act="subjAdd" style="margin-top:12px">Dersi ekle</button></div>
      <div class="card scroll"><table class="tbl"><thead><tr><th>Ders adı</th><th>Kısa ad</th><th>Branş</th><th class="n">Kart</th><th></th></tr></thead><tbody>${keys.map(k => `<tr>
        <td><input data-subj="${k}" data-i="0" value="${esc(SN(k))}" style="min-width:220px"></td>
        <td><input data-subj="${k}" data-i="1" value="${esc(SS(k))}" style="width:90px"></td>
        <td><input data-subj="${k}" data-i="2" value="${esc(SB(k))}" list="brlist" style="min-width:190px"></td>
        <td class="n">${used[k] || 0}</td>
        <td style="text-align:right"><button class="btn sm ghost" data-act="subjDel" data-id="${k}" ${used[k] ? 'disabled title="Kartlarda kullanılıyor"' : ''}>Sil</button></td></tr>`).join('')}</tbody></table></div>`;
  }

  function vHavuz() {
    const T = EP.typeOf(S), tab = S.ui.htab || 'z';
    const tabs = `<div class="tabs" style="margin-bottom:14px;display:inline-flex">${[['z', 'Zorunlu dersler'], ['s', 'Seçmeli ders havuzu'], ['b', 'Ders blokları'], ['o', 'Okulun ders listesi']].map(x => `<button data-act="htab" data-v="${x[0]}" class="${tab === x[0] ? 'on' : ''}">${x[1]}</button>`).join('')}</div>`;
    const head = H('Dersler ve Bloklar', T ? `${esc(T.ad)} haftalık ders çizelgesi ve blok yapısı. Kaynak: <a href="${T.src}" target="_blank" rel="noopener">${esc(T.kaynak)}</a>.` : 'Okul türü seçilmedi; Okul Ayarları adımından seçin veya kendi derslerinizi ekleyin.');
    if (tab === 'o') return head + tabs + subjList();
    if (tab === 'b') return head + tabs + blocksTab();
    if (!T) return head + tabs + '<div class="empty">Bu sekme için Okul Ayarları ekranından okul türü seçin.</div>';
    if (tab === 'z') {
      const G = T.grades, zt = G.map((g, i) => T.z.reduce((a, r) => a + (r[0] === 'Serbest Etkinlikler' ? 0 : r[1][i]), 0));
      return head + tabs + `<div class="card scroll"><table class="tbl"><thead><tr><th>Zorunlu ders</th><th>Varsayılan branş</th>${G.map(g => `<th class="n">${EP.gradeLabel(g)}</th>`).join('')}</tr></thead><tbody>
        ${T.z.map(r => { const fg = G.find((g, i) => r[1][i] > 0); return `<tr><td>${esc(r[0])}</td><td class="small muted">${esc(EP.branchOf(r[0], fg != null ? fg : G[0], S.school.type))}</td>${r[1].map(h => `<td class="n" style="color:${h ? 'inherit' : 'var(--line)'}">${h || '–'}</td>`).join('')}</tr>`; }).join('')}
        <tr><td><b>Zorunlu ders toplamı</b></td><td></td>${zt.map(v => `<td class="n"><b>${v}</b></td>`).join('')}</tr>
        <tr><td><b>Seçmeli ders saati</b></td><td></td>${T.sec.map(v => `<td class="n"><b>${v || '–'}</b></td>`).join('')}</tr>
        <tr><td><b>Toplam ders saati</b></td><td></td>${T.total.map(v => `<td class="n"><b>${v}</b></td>`).join('')}</tr></tbody></table></div>` + customList('zorunlu') + customForm('zorunlu');
    }
    const PG = T.poolGrades;
    return head + tabs + (T.poolNote ? '<div class="msg warn" style="margin-bottom:12px"><span class="ic">!</span><div>Bu türün seçmeli saat seçenekleri Anadolu Lisesi çizelgesinden uyarlanmıştır; kullanmadan önce kaynağa bakın.</div><span></span></div>' : '') +
      `<p class="small muted" style="margin-bottom:10px">Seçmeli saat sınırı: ${PG.map(g => `${EP.gradeLabel(g)} ${EP.secLimit(T, g)}`).join(', ')}.</p>` +
      T.groups.map(gk => {
        const rows = T.pool.filter(r => r[1] === gk); if (!rows.length) return '';
        return `<div class="card scroll" style="margin-bottom:12px"><h3 style="margin-bottom:6px">${EP.GRP[gk]}</h3><table class="tbl"><thead><tr><th>Ders</th><th>Varsayılan branş</th>${PG.map(g => `<th class="n">${EP.gradeLabel(g)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r[0])} <span class="muted">(${r[2]})</span></td><td class="small muted">${esc(EP.branchOf(r[0], PG[0], S.school.type))}</td>${r[3].split('|').map(o => `<td class="n" style="color:${o ? 'inherit' : 'var(--line)'}">${o ? o.split('/').join(' / ') : '–'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      }).join('') + customList('secmeli') + customForm('secmeli');
  }

  /* 6. Ders Görevlendirmeleri (Sınıf Bazında · Öğretmen Bazında + Havuzlar · Tüm Kartlar) */
  function classPanel(c, T) {
    const st = EP.clsStat(S, c), cards = S.cards.filter(x => x.classId === c.id);
    const z = cards.filter(x => x.kind === 'zorunlu'), s = cards.filter(x => x.kind === 'secmeli'), e = cards.filter(x => x.kind === 'ek');
    const zCatalog = EP.zFor(S, T, c.grade);
    const missingZ = zCatalog.filter(item => {
      const so = c.grade >= 1 && c.grade <= 4 && EP.SO_SET.has(item.name);
      const k = EP.findSubj(S, item.name, so) || EP.trSlug(item.name) + (so ? '_SO' : '');
      return !EP.findClassSubjCard(S, c.id, k);
    });
    const pool = EP.poolFor(S, T, c.grade);
    const showAdv = Boolean(S.ui.showAdvCards) || cards.some(x => x.coTeacherId || x.syncGroup);
    const pill = (l, v, okv) => `<span class="pill ${okv === undefined ? '' : okv ? 'ok' : 'warn'}">${l}: ${v}</span>`;
    const tbl = (rows, empty) => rows.length ? `<div class="scroll"><table class="tbl">${TH_CARD(false, showAdv)}<tbody>${rows.map(x => cardRow(x, false, showAdv)).join('')}</tbody></table></div>` : `<p class="small muted" style="padding:6px 0">${empty}</p>`;
    const subjOpts = [...SK].sort((a, b) => SN(a).localeCompare(SN(b), 'tr')).map(k => {
      const ex = EP.findClassSubjCard(S, c.id, k);
      return `<option value="${k}" ${ex ? 'disabled' : ''}>${esc(SN(k))} · ${esc(SB(k))}${ex ? ' (Bu sınıfta zaten atanmış)' : ''}</option>`;
    }).join('');
    return `<div class="card"><div class="row" style="justify-content:space-between"><div><h2>${esc(c.name)}</h2><p class="small muted" style="margin-top:4px">${EP.gradeLabel(c.grade)} · ${T ? esc(T.ad) : 'okul türü yok'} · Aynı sınıfa aynı ders iki kez atanamaz</p></div>
      <div class="row">${pill('Toplam', st.tot + (st.tg ? '/' + st.tg : ''), st.tg ? st.tot === st.tg : undefined)}${pill('Zorunlu', st.z)}${st.lim ? pill('Seçmeli', st.s + '/' + st.lim, st.s === st.lim) : ''}${st.e ? pill('Ek', st.e) : ''}</div></div>
      <div class="row" style="margin:12px 0;justify-content:space-between">
        <div class="row">
          <button class="btn sm ${missingZ.length ? 'pri' : ''}" data-act="tplMissing" data-id="${c.id}">Eksik zorunlu dersleri ekle${missingZ.length ? ` (${missingZ.length})` : ''}</button>
          ${s.length ? `<button class="btn sm" data-act="copySec" data-id="${c.id}">Seçmelileri ${EP.gradeLabel(c.grade)} diğer şubelerine kopyala</button><button class="btn sm ghost" data-act="clearSec" data-id="${c.id}">Seçmelileri temizle</button>` : ''}
        </div>
        <label class="row small" style="gap:6px;cursor:pointer" title="Bölünmüş atölye dersleri için 2. eş öğretmen ve ortak seçmeli blok grubu sütununu göster"><input type="checkbox" data-ui="showAdvCards" ${showAdv ? 'checked' : ''}> Eş Öğretmen / Ortak Blok</label>
      </div>
      <h3>Sınıftaki zorunlu dersler (${z.length})</h3>${tbl(z, 'Zorunlu ders yok. Aşağıdaki zorunlu dersler havuzundan tek tek veya “Eksik zorunlu dersleri ekle” ile toplu ekleyebilirsiniz.')}
      <h3 style="margin-top:14px">Seçmeli dersler${st.lim ? ` · ${st.s}/${st.lim} saat` : ''}</h3>
      ${st.lim ? `<div class="bar" style="margin:6px 0 8px"><i style="width:${Math.min(100, Math.round(100 * st.s / st.lim))}%;background:${st.s > st.lim ? 'var(--err)' : st.s === st.lim ? 'var(--ok)' : 'var(--warn)'}"></i></div>` : ''}
      ${tbl(s, st.lim ? 'Aşağıdaki havuzdan seçmeli ders ekleyin.' : 'Bu sınıf düzeyinde çizelgede seçmeli ders saati yok.')}
      ${e.length ? `<h3 style="margin-top:14px">Ek ve branş dışı dersler</h3>${tbl(e, '')}` : ''}</div>

      ${zCatalog.length ? `<div class="card"><h2>Zorunlu dersler havuzu · ${EP.gradeLabel(c.grade)}</h2>
        <p class="small muted" style="margin:4px 0 12px">${c.name} şubesine ait tüm zorunlu dersleri burada görebilir, tek tıkla ekleyebilir veya çıkarabilirsiniz. Zaten ekli olan ders ikinci kez eklenemez.</p>
        <div class="grid2">${zCatalog.map(item => {
          const so = c.grade >= 1 && c.grade <= 4 && EP.SO_SET.has(item.name);
          const k = EP.findSubj(S, item.name, so) || EP.trSlug(item.name) + (so ? '_SO' : '');
          const cur = EP.findClassSubjCard(S, c.id, k);
          const tch = cur && cur.teacherId ? S.teachers.find(x => x.id === cur.teacherId) : null;
          const br = S.subjects[k] ? SB(k) : EP.branchOf(item.name, c.grade, S.school.type);
          return `<div class="pool-row ${cur ? 'mine' : ''}">
            <div style="min-width:0">
              <div style="font-weight:600">${esc(item.name)} <span class="muted small">· ${item.hours} sa</span></div>
              <div class="small muted">${esc(br)}${cur ? (tch ? ' · Atalı: ' + esc(tShort(tch)) : ' · Öğretmensiz') : ' · Henüz eklenmedi'}</div>
            </div>
            <div class="row" style="gap:4px;flex-wrap:nowrap">
              ${cur
                ? `<span class="pill ok">✓ Eklendi</span><button class="btn sm ghost" data-act="delCard" data-id="${cur.id}" title="Sınıftan kaldır">×</button>`
                : `<button class="btn sm pri" data-act="zorOneAdd" data-id="${c.id}" data-n="${esc(item.name)}" data-h="${item.hours}">+ Ekle (${item.hours} sa)</button>`}
            </div>
          </div>`;
        }).join('')}</div></div>` : ''}

      ${pool.length ? `<div class="card"><h2>Seçmeli ders havuzu · ${EP.gradeLabel(c.grade)}</h2>
        <p class="small muted" style="margin:4px 0 12px">Saat düğmesine basınca ders eklenir.${T.groupRule ? ' Ortaokulda üç gruptan en az birer ders seçilmesi önerilir.' : ''}</p>
        <div class="grid2">${[...T.groups, 'OZEL'].map(gk => {
          const items = pool.filter(p => p.grp === gk); if (!items.length) return '';
          const pk = p => EP.findSubj(S, p.name, false) || EP.trSlug(p.name);
          const n = items.filter(p => { const fc = EP.findClassSubjCard(S, c.id, pk(p)); return fc && fc.kind === 'secmeli'; }).length;
          return `<div><h3 style="margin-bottom:8px">${EP.GRP[gk]} ${T.groupRule && gk !== 'OZEL' ? `<span class="tag" style="background:var(--${n ? 'okBg' : 'warnBg'});color:var(--${n ? 'ok' : 'warn'})">${n ? n + ' seçili' : 'seçilmedi'}</span>` : ''}</h3>
            <div class="diag" style="gap:6px">${items.map(p => {
              const k = pk(p), cur = EP.findClassSubjCard(S, c.id, k), isOtherKind = cur && cur.kind !== 'secmeli';
              return `<div class="row" style="justify-content:space-between;padding:6px 10px;border:1px solid ${cur ? 'var(--ok)' : 'var(--line)'};border-radius:9px;background:${cur ? 'var(--okBg)' : 'var(--paper)'}"><span style="font-size:13.5px">${esc(p.name)} <span class="muted small">(${p.times})${isOtherKind ? ' · Zorunlu ekli' : ''}</span></span>
                <span class="row" style="gap:4px">${isOtherKind ? '<span class="pill">Zaten ekli</span>' : p.opts.map(o => `<button class="btn sm ${cur && +cur.hours === o ? 'pri' : ''}" data-act="secAdd" data-id="${c.id}" data-n="${esc(p.name)}" data-h="${o}">${o} sa</button>`).join('') + (cur ? `<button class="btn sm ghost" data-act="delCard" data-id="${cur.id}">×</button>` : '')}</span></div>`;
            }).join('')}</div></div>`;
        }).join('')}</div></div>` : ''}

      <div class="card"><h2>Manuel ders ekle (Zorunlu / Seçmeli / Ek)</h2>
        <p class="small muted" style="margin:4px 0 10px">Listeden bir ders seçebilir veya yeni ders adı yazarak <b>zorunlu</b>, <b>seçmeli</b> ya da <b>ek</b> ders olarak bu sınıfa manuel ekleyebilirsiniz. Bu sınıfa zaten atanmış dersler tekrar eklenemez.</p>
        <div class="fields" style="margin-top:10px">
          <label class="f">Ders türü<select id="ekKind"><option value="zorunlu" selected>Zorunlu ders</option><option value="secmeli">Seçmeli ders</option><option value="ek">Ek / Branş dışı ders</option></select></label>
          <label class="f">Ders<select id="ekS"><option value="__new">— Yeni ders adı yaz —</option>${subjOpts}</select></label>
          <label class="f">Yeni ders adı<input id="ekN" placeholder="ör. Matematik Etüdü veya Değerler"></label>
          <label class="f">Branşı<input id="ekB" list="brlist2" placeholder="ör. Matematik"></label>
          <label class="f">Haftalık saat<input type="number" id="ekH" value="2" min="1" max="12"></label>
          <label class="f">Öğretmen<select id="ekT"><option value="">Otomatik (kurala göre)</option>${S.teachers.map(t => `<option value="${t.id}">${esc(t.name)} · ${esc(t.branch || '')}</option>`).join('')}</select></label>
        </div>
        <datalist id="brlist2">${BRANS.map(b => `<option value="${esc(b)}">`).join('')}</datalist>
        <button class="btn pri" data-act="ekAdd" data-id="${c.id}" style="margin-top:12px">Dersi sınıfa ekle</button></div>`;
  }

  function teacherPoolSection(t) {
    const T = EP.typeOf(S);
    const clsFilter = S.ui.tpCls || '';
    const onlyBranch = Boolean(S.ui.tpOnlyBranch);
    const hideOther = Boolean(S.ui.tpHideOther);
    const q = (S.ui.tpQ || '').toLocaleLowerCase('tr').trim();
    const targetClasses = clsFilter ? S.classes.filter(c => c.id === clsFilter) : S.classes;
    const extraSet = new Set(t.extra || []);

    const isBranchMatch = (subjKey, branchName) => {
      if (branchName === EP.REHB) return true;
      if (t.branch && branchName === t.branch) return true;
      if (subjKey && extraSet.has(subjKey)) return true;
      return false;
    };

    const zorItems = [];
    const secItems = [];

    for (const c of targetClasses) {
      const seenZ = new Set();
      const seenS = new Set();

      // 1) Mevcut sınıf kartları (Zorunlu & Seçmeli)
      for (const cd of S.cards.filter(x => x.classId === c.id)) {
        const nm = SN(cd.subj), br = SB(cd.subj);
        const item = {
          classId: c.id, className: c.name, grade: c.grade,
          subj: cd.subj, name: nm, short: SS(cd.subj), branch: br,
          hours: +cd.hours || 1, kind: cd.kind || 'zorunlu',
          card: cd, match: isBranchMatch(cd.subj, br), fromCatalog: false
        };
        if (cd.kind === 'secmeli') {
          seenS.add(cd.subj); seenS.add(nm.toLocaleLowerCase('tr'));
          secItems.push(item);
        } else {
          seenZ.add(cd.subj); seenZ.add(nm.toLocaleLowerCase('tr'));
          zorItems.push(item);
        }
      }

      // 2) Müfredatta olup henüz sınıfa eklenmemiş zorunlu dersler
      for (const z of EP.zFor(S, T, c.grade)) {
        const so = c.grade >= 1 && c.grade <= 4 && EP.SO_SET.has(z.name);
        const k = EP.findSubj(S, z.name, so) || EP.trSlug(z.name) + (so ? '_SO' : '');
        if (seenZ.has(k) || seenZ.has(z.name.toLocaleLowerCase('tr')) || EP.findClassSubjCard(S, c.id, k)) continue;
        const br = S.subjects[k] ? SB(k) : EP.branchOf(z.name, c.grade, S.school.type);
        zorItems.push({
          classId: c.id, className: c.name, grade: c.grade,
          subj: k, name: z.name, short: S.subjects[k] ? SS(k) : EP.autoShort(z.name), branch: br,
          hours: z.hours, kind: 'zorunlu',
          card: null, match: isBranchMatch(k, br), fromCatalog: true
        });
      }

      // 3) Müfredatta olup henüz sınıfa eklenmemiş seçmeli havuz dersleri
      const secLim = EP.secLimit(T, c.grade);
      if (secLim > 0 || clsFilter) {
        for (const p of EP.poolFor(S, T, c.grade)) {
          const k = EP.findSubj(S, p.name, false) || EP.trSlug(p.name);
          if (seenS.has(k) || seenS.has(p.name.toLocaleLowerCase('tr')) || EP.findClassSubjCard(S, c.id, k)) continue;
          const br = S.subjects[k] ? SB(k) : EP.branchOf(p.name, c.grade, S.school.type);
          const match = isBranchMatch(k, br);
          // Tüm sınıflar seçiliyse seçmeli katalogdan branşa uygunları göster, tek sınıf seçiliyse hepsini göster
          if (!clsFilter && !match && !q) continue;
          secItems.push({
            classId: c.id, className: c.name, grade: c.grade,
            subj: k, name: p.name, short: S.subjects[k] ? SS(k) : EP.autoShort(p.name), branch: br,
            hours: p.opts[0] || 2, kind: 'secmeli',
            card: null, match, fromCatalog: true
          });
        }
      }
    }

    const filterAndSort = items => items.filter(it => {
      if (onlyBranch && !it.match) return false;
      const owner = it.card && it.card.teacherId ? it.card.teacherId : '';
      if (hideOther && owner && owner !== t.id) return false;
      if (q) {
        const hay = (it.className + ' ' + it.name + ' ' + it.short + ' ' + it.branch).toLocaleLowerCase('tr');
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const aMine = a.card && a.card.teacherId === t.id ? 0 : 1;
      const bMine = b.card && b.card.teacherId === t.id ? 0 : 1;
      const aMatch = a.match ? 0 : 1;
      const bMatch = b.match ? 0 : 1;
      const aFree = !a.card || !a.card.teacherId ? 0 : 1;
      const bFree = !b.card || !b.card.teacherId ? 0 : 1;
      return aMine - bMine || aMatch - bMatch || aFree - bFree || a.className.localeCompare(b.className, 'tr') || a.name.localeCompare(b.name, 'tr');
    });

    const zList = filterAndSort(zorItems);
    const sList = filterAndSort(secItems);

    const renderPoolRow = it => {
      const ownerId = it.card && it.card.teacherId ? it.card.teacherId : '';
      const isMine = ownerId === t.id;
      const isOther = Boolean(ownerId && ownerId !== t.id);
      const otherT = isOther ? S.teachers.find(x => x.id === ownerId) : null;
      const rowCls = isMine ? 'mine' : isOther ? 'other' : '';
      const searchStr = (it.className + ' ' + it.name + ' ' + it.short + ' ' + it.branch).toLocaleLowerCase('tr');
      return `<div class="pool-row tpool-row ${rowCls}" data-q="${esc(searchStr)}">
        <label class="pool-lbl">
          <input type="checkbox" data-tpool="1" data-tid="${t.id}" data-cid="${it.classId}" data-subj="${esc(it.subj)}" data-name="${esc(it.name)}" data-h="${it.hours}" data-kind="${it.kind}" data-card-id="${it.card ? it.card.id : ''}" ${isMine ? 'checked' : ''} ${isOther ? 'disabled' : ''}>
          <span class="pool-cls">${esc(it.className)}</span>
          <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            <b>${esc(it.name)}</b> <span class="small muted">· ${it.hours} sa</span>
            ${it.match ? ' <span class="tag" style="background:var(--okBg);color:var(--ok)">Branş</span>' : ''}
            ${it.fromCatalog ? ' <span class="tag" style="background:var(--soft);color:var(--mute)">Sınıfa yeni eklenir</span>' : ''}
          </span>
        </label>
        <div class="row" style="gap:4px;flex-wrap:nowrap">
          ${isMine ? '<span class="pill ok">Atandı</span>'
            : isOther ? `<span class="small muted">${esc(tShort(otherT))}</span><button class="btn sm" data-act="takeOverCard" data-id="${it.card.id}" data-t="${t.id}" title="Diğer öğretmenden bu öğretmene aktar">Devral ⇄</button>`
            : '<span class="small muted">Boşta</span>'}
        </div>
      </div>`;
    };

    return `<div class="card" style="margin-top:16px;background:var(--soft);border:0;padding:16px">
      <div class="row" style="justify-content:space-between;margin-bottom:10px">
        <div>
          <h2>Ders Havuzlarından Tik Atarak Öğretmene Ata</h2>
          <p class="small muted" style="margin-top:3px">Kutucuğa tik attığınızda ders <b>${esc(t.name)}</b> üzerine atanır; tiki kaldırdığınızda öğretmen boşa çıkar. Başka öğretmende olan dersler mükerrer atanmaz, isterseniz <b>Devral ⇄</b> ile aktarabilirsiniz.</p>
        </div>
      </div>
      <div class="row" style="margin-bottom:12px;gap:10px">
        <select data-ui="tpCls" style="max-width:190px"><option value="">Tüm sınıflar (${S.classes.length})</option>${S.classes.map(c => `<option value="${c.id}" ${clsFilter === c.id ? 'selected' : ''}>${esc(c.name)} (${EP.gradeLabel(c.grade)})</option>`).join('')}</select>
        <input id="tpQ" value="${esc(S.ui.tpQ || '')}" placeholder="Ders, sınıf veya branş ara…" style="max-width:240px">
        <label class="row small" style="gap:6px;cursor:pointer"><input type="checkbox" data-ui="tpOnlyBranch" ${onlyBranch ? 'checked' : ''}> Sadece branşıma uygun</label>
        <label class="row small" style="gap:6px;cursor:pointer"><input type="checkbox" data-ui="tpHideOther" ${hideOther ? 'checked' : ''}> Başka öğretmendekileri gizle</label>
      </div>
      <div class="grid2">
        <div class="card" style="padding:12px 14px">
          <div class="row" style="justify-content:space-between;margin-bottom:8px">
            <h3>Zorunlu Dersler Havuzu</h3>
            <span class="pill">${zList.length} ders</span>
          </div>
          <div class="pool-box">${zList.length ? zList.map(renderPoolRow).join('') : '<p class="small muted">Filtreye uyan zorunlu ders yok.</p>'}</div>
        </div>
        <div class="card" style="padding:12px 14px">
          <div class="row" style="justify-content:space-between;margin-bottom:8px">
            <h3>Seçmeli Dersler Havuzu</h3>
            <span class="pill">${sList.length} ders</span>
          </div>
          <p class="small muted" style="margin-bottom:8px">${clsFilter ? 'Seçilen sınıfın tüm MEB seçmeli havuzu listelenir.' : 'Mevcut seçmeli dersler + öğretmenin branşına uyan seçmeli havuz dersleri gösterilir; tümünü görmek için yukarıdan bir sınıf seçin.'}</p>
          <div class="pool-box">${sList.length ? sList.map(renderPoolRow).join('') : '<p class="small muted">Filtreye uyan seçmeli ders yok.</p>'}</div>
        </div>
      </div>
    </div>`;
  }

  function vKartBody() {
    const cf = S.ui.cf, tf = S.ui.tf, only = S.ui.only, kf = S.ui.kf || '';
    const rows = S.cards.filter(c => (!cf || c.classId === cf) && (!tf || c.teacherId === tf) && (!only || !c.teacherId) && (!kf || (kf === 'dis' ? ['dis', 'ek'].includes(EP.tMode(S, c)) : c.kind === kf)));
    const tot = S.cards.reduce((a, c) => a + (+c.hours || 0), 0);
    const nb = S.cards.reduce((a, c) => a + EP.parsePat(c.pattern, c.hours).length, 0);
    const dis = S.cards.filter(c => ['dis', 'ek'].includes(EP.tMode(S, c))).length;
    return `<div class="kpis">
      <div class="kpi"><small>Kart</small><b>${S.cards.length}</b></div>
      <div class="kpi"><small>Toplam saat</small><b>${tot}</b></div>
      <div class="kpi"><small>Yerleşecek blok</small><b>${nb}</b></div>
      <div class="kpi"><small>Öğretmensiz</small><b style="color:${S.cards.some(c => !c.teacherId) ? 'var(--err)' : 'inherit'}">${S.cards.filter(c => !c.teacherId).length}</b></div>
      <div class="kpi"><small>Branş dışı atama</small><b>${dis}</b></div></div>
      <div class="row" style="margin-bottom:12px">
        <select data-ui="cf"><option value="">Tüm sınıflar</option>${S.classes.map(c => `<option value="${c.id}" ${cf === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <select data-ui="tf"><option value="">Tüm öğretmenler</option>${S.teachers.map(t => `<option value="${t.id}" ${tf === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
        <select data-ui="kf"><option value="">Tüm türler</option><option value="zorunlu" ${kf === 'zorunlu' ? 'selected' : ''}>Zorunlu</option><option value="secmeli" ${kf === 'secmeli' ? 'selected' : ''}>Seçmeli</option><option value="ek" ${kf === 'ek' ? 'selected' : ''}>Ek</option><option value="dis" ${kf === 'dis' ? 'selected' : ''}>Branş dışı atananlar</option></select>
        <label class="row small" style="gap:6px"><input type="checkbox" data-ui="only" ${only ? 'checked' : ''}> Sadece öğretmensizler</label>
        <label class="row small" style="gap:6px;margin-left:auto"><input type="checkbox" data-ui="showAdvCards" ${S.ui.showAdvCards ? 'checked' : ''}> Eş Öğretmen / Ortak Blok</label></div>
      ${rows.length ? `<div class="card scroll" style="padding:6px"><table class="tbl">${TH_CARD(true, Boolean(S.ui.showAdvCards) || rows.some(x => x.coTeacherId || x.syncGroup))}<tbody>${rows.map(c => cardRow(c, true, Boolean(S.ui.showAdvCards) || rows.some(x => x.coTeacherId || x.syncGroup))).join('')}</tbody></table></div>` : '<div class="empty">Gösterilecek ders kartı yok.</div>'}`;
  }

  function vDersler() {
    const T = EP.typeOf(S), tab = S.ui.dtab || 'sinif';
    const head = H('Ders Görevlendirmeleri', 'Sınıf bazında, öğretmen bazında (ekleme, düzenleme, sürükle-bırak aktarma ve takas) veya tüm ders kartları olarak görevlendirmeleri yönetin.',
      `<label class="f">Otomatik öğretmen atama<select data-ui="amode"><option value="brans_ek" ${S.ui.amode === 'brans_ek' ? 'selected' : ''}>Branş, yoksa branş dışı</option><option value="brans" ${S.ui.amode === 'brans' ? 'selected' : ''}>Yalnızca branş</option><option value="off" ${S.ui.amode === 'off' ? 'selected' : ''}>Kapalı (elle seçerim)</option></select></label><button class="btn pri" data-act="autoAssign">Boştaki derslere ata</button>`);
    const tabs = `<div class="tabs" style="margin-bottom:14px;display:inline-flex">
      <button data-act="dtab" data-v="sinif" class="${tab === 'sinif' ? 'on' : ''}">Sınıf bazında</button>
      <button data-act="dtab" data-v="ogretmen" class="${tab === 'ogretmen' ? 'on' : ''}">Öğretmen bazında</button>
      <button data-act="dtab" data-v="tum" class="${tab === 'tum' ? 'on' : ''}">Tüm ders kartları</button>
    </div>`;

    if (tab === 'tum') return head + tabs + vKartBody();

    if (tab === 'ogretmen') {
      if (!S.teachers.length) return head + tabs + '<div class="empty">Önce Öğretmenler adımında öğretmen ekleyin.</div>';
      const L = EP.loads(S), t = S.teachers.find(x => x.id === S.ui.tsel) || S.teachers[0];
      const tq = (S.ui.tAssignQ || '').toLocaleLowerCase('tr').trim();
      const tList = S.teachers.map(x => {
        const op = EP.openOf(S, x).tot, ld = L[x.id] || 0, cls = ld > op ? 'err' : ld === op && ld ? 'warn' : 'ok';
        const q = (x.name + ' ' + (x.branch || '')).toLocaleLowerCase('tr');
        const cnt = S.cards.filter(c => c.teacherId === x.id).length;
        return `<div class="tl tassign-item ${x.id === t.id ? 'on' : ''}" data-act="tsel" data-id="${x.id}" data-drop-t="${x.id}" data-q="${esc(q)}" ${tq && !q.includes(tq) ? 'style="display:none"' : ''}>
          <div><b>${esc(x.name)}</b><small>${esc(x.branch || 'Branş yok')} · ${cnt} kart</small></div>
          <span class="pill ${cls}">${ld}/${op} sa</span>
        </div>`;
      }).join('');
      const opT = EP.openOf(S, t).tot;
      const totSlotsT = (+S.school.D || 5) * (+S.school.P || 7);
      const closedT = Object.values(t.av || {}).filter(v => v === 1).length;
      const prefT = Object.values(t.av || {}).filter(v => v === 2).length;
      return head + tabs + `<div class="board" style="grid-template-columns:300px minmax(0,1fr)">
        <div>
          <input id="tAssignQ" value="${esc(S.ui.tAssignQ || '')}" placeholder="Öğretmen veya branş ara…" style="width:100%;margin-bottom:8px">
          <div class="tlist">${tList}</div>
        </div>
        <div class="card">
          <div class="row" style="justify-content:space-between;margin-bottom:4px">
            <div><h2>${esc(t.name)}</h2><p class="small muted" style="margin-top:2px">${esc(t.branch || 'Branş yok')}${(t.extra || []).length ? ' · Branş dışı tanımlı: ' + (t.extra || []).map(k => SS(k)).join(', ') : ''}</p></div>
            <span class="pill ${((L[t.id] || 0) > opT) ? 'err' : 'ok'}">${L[t.id] || 0} / ${opT} saat</span>
          </div>
          <details class="card" open style="background:var(--soft);border:0;margin:12px 0;padding:12px 14px">
            <summary><b>Haftalık Müsaitlik Durumu</b> <span class="small muted">· Açık: ${opT}/${totSlotsT} saat${closedT ? ` · Kapalı: ${closedT}` : ''}${prefT ? ` · Tercihen boş: ${prefT}` : ''} · Hücreye, güne veya derse tıklayarak anında değiştirin</span></summary>
            <div style="margin-top:10px">${matrix('t', t)}</div>
          </details>
          ${teacherAssignSection(t, { standalone: true, draggable: true })}
          ${teacherPoolSection(t)}
        </div>
      </div>`;
    }

    if (!S.classes.length) return head + tabs + '<div class="empty">Önce Sınıflar ve Şubeler adımında şube ekleyin.</div>';
    const c = S.classes.find(x => x.id === S.ui.csel) || S.classes[0];
    const list = S.classes.map(x => {
      const st = EP.clsStat(S, x), ok = (!st.tg || st.tot === st.tg) && (!st.lim || st.s === st.lim) && !st.noT;
      return `<div class="tl ${x.id === c.id ? 'on' : ''}" data-act="csel" data-id="${x.id}"><div><b>${esc(x.name)}</b><small>${st.tot}${st.tg ? '/' + st.tg : ''} saat${st.lim ? ` · seçmeli ${st.s}/${st.lim}` : ''}${st.noT ? ` · ${st.noT} öğretmensiz` : ''}</small></div><span class="pill ${ok ? 'ok' : 'warn'}">${ok ? 'Tamam' : 'Eksik'}</span></div>`;
    }).join('');
    return head + tabs + `<div class="board" style="grid-template-columns:260px minmax(0,1fr)"><div class="tlist">${list}</div><div class="diag" style="gap:14px">${classPanel(c, T)}</div></div>`;
  }

  /* 8. Kural ve Kısıt Yönetimi */
  function tclassSection() {
    const rs = S.rules.filter(r => r.type === 'tclass'), viol = EP.tcAll(S);
    return `<div class="card" style="margin-top:16px"><div class="row" style="justify-content:space-between"><div><h2>Sınıf başına öğretmen ders sınırı</h2><p class="small muted" style="margin-top:4px">Örnek: “Bir öğretmen bir sınıfta en fazla 2 saat branş dışı ders alabilir.”</p></div>
      ${viol.length ? `<button class="btn pri" data-act="tcFix">Sınırı aşan ${viol.length} dersi yeniden ata</button>` : ''}</div>
      ${rs.length ? `<div class="diag" style="margin:12px 0">${rs.map(r => {
        const d = ruleDesc(r);
        return `<div class="msg ${r.on ? '' : 'info'}" style="align-items:center"><button class="sw ${r.on ? 'on' : ''}" data-act="ruleTog" data-id="${r.id}"></button>
          <div><b>${esc(d.who)}</b><div class="row small" style="gap:6px;margin-top:4px">Bir sınıfta en fazla <select data-rule="${r.id}" data-f="max" style="min-height:34px">${[1, 2, 3, 4, 5, 6, 8, 10].map(n => `<option ${+r.max === n ? 'selected' : ''}>${n}</option>`).join('')}</select> saat <select data-rule="${r.id}" data-f="scope" style="min-height:34px">${Object.entries(EP.SCOPE).map(([k, v]) => `<option value="${k}" ${r.scope === k ? 'selected' : ''}>${v}</option>`).join('')}</select> ders</div></div>
          <button class="btn sm ghost" data-act="ruleDel" data-id="${r.id}">Sil</button></div>`;
      }).join('')}</div>` : '<p class="small muted" style="margin:10px 0">Henüz sınır kuralı yok.</p>'}
      <div class="card" style="background:var(--soft);border:0"><h3>Yeni sınır</h3><div class="fields" style="margin-top:10px">
        <label class="f">Kapsam<select id="tcScope">${Object.entries(EP.SCOPE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
        <label class="f">Bir sınıfta en fazla (saat)<select id="tcMax">${[1, 2, 3, 4, 5, 6].map(n => `<option ${n === 2 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="f">Uygulanacak öğretmenler<select id="tcWho"><option value="all">Tüm öğretmenler (toplu)</option><option value="sel">Aşağıda işaretlenenler</option></select></label>
      </div>
      <div class="tray" style="margin-top:10px">${S.teachers.map(t => `<label class="chip" style="font-weight:500"><input type="checkbox" class="tcChk" value="${t.id}"> ${esc(t.name)}</label>`).join('')}</div>
      <button class="btn pri" data-act="tcAdd" style="margin-top:12px">Kuralı ekle</button></div></div>`;
  }

  function vKural() {
    const P = +S.school.P;
    const desc = r => r.type === 'diff' ? 'Aynı dersin blokları farklı günlere dağılsın (ör. Matematik 2+2+1 → üç ayrı gün).'
      : r.type === 'lunch' ? `Blok dersler öğle arasından (${S.school.lunchAfter}. ders sonrası) bölünmesin.`
      : r.type === 'forbid' ? `${SN(r.a)} şu derslere gelmesin: ${(r.periods || []).map(p => (+p + 1) + '.').join(', ') || '—'}`
      : `${SN(r.a)} ile ${SN(r.b)} aynı sınıfta aynı güne düşmesin.`;
    const title = r => r.type === 'diff' ? 'Farklı gün kuralı' : r.type === 'lunch' ? 'Öğle arası blok koruması' : r.type === 'forbid' ? 'Saat yasağı' : 'Aynı gün olmasın';
    return H('Kural ve Kısıt Yönetimi', '4 seviyeli kısıt önceliklerini (HARD / HIGH / NORMAL / PREFERENCE) ve özel dağıtım kurallarını tek tıkla yönetin.') +
      `<div class="card"><div class="diag">${S.rules.filter(r => r.type !== 'tclass').map(r => `<div class="msg ${r.on ? '' : 'info'}" style="align-items:center">
        <button class="sw ${r.on ? 'on' : ''}" data-act="ruleTog" data-id="${r.id}"></button>
        <div><b>${title(r)}</b><div class="small">${esc(desc(r))}</div></div>
        <div class="row" style="gap:6px">
          <select data-rule="${r.id}" data-f="level" style="min-height:34px;font-size:12.5px">
            ${[['HARD', 'Zorunlu (HARD)'], ['HIGH', 'Yüksek (HIGH)'], ['NORMAL', 'Normal'], ['PREFERENCE', 'Tercih']].map(([k, l]) => `<option value="${k}" ${(r.level || 'HARD') === k ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          ${r.type === 'diff' || r.type === 'lunch' ? '' : `<button class="btn sm ghost" data-act="ruleDel" data-id="${r.id}">Sil</button>`}
        </div></div>`).join('')}</div></div>
      <div class="grid2" style="margin-top:16px">
        <div class="card"><h2>Saat yasağı ekle</h2><p class="small muted" style="margin:6px 0 10px">Örnek: Beden Eğitimi ilk derse gelmesin.</p>
          <div class="fields"><label class="f">Ders<select id="rfA">${SK.map(k => `<option value="${k}" ${k === 'BES' ? 'selected' : ''}>${esc(SN(k))}</option>`).join('')}</select></label></div>
          <div class="row" style="margin:10px 0">${Array.from({ length: P }, (_, p) => `<label class="chip"><input type="checkbox" class="rfP" value="${p}"> ${p + 1}. ders</label>`).join('')}</div>
          <button class="btn pri" data-act="ruleForbid">Kuralı ekle</button></div>
        <div class="card"><h2>Aynı gün olmasın</h2><p class="small muted" style="margin:6px 0 10px">Örnek: Matematik ile Fen Bilimleri aynı sınıfta aynı güne düşmesin.</p>
          <div class="fields">
            <label class="f">Ders 1<select id="rpA">${SK.map(k => `<option value="${k}" ${k === 'MAT' ? 'selected' : ''}>${esc(SN(k))}</option>`).join('')}</select></label>
            <label class="f">Ders 2<select id="rpB">${SK.map(k => `<option value="${k}" ${k === 'FEN' ? 'selected' : ''}>${esc(SN(k))}</option>`).join('')}</select></label>
          </div>
          <button class="btn pri" data-act="rulePair" style="margin-top:12px">Kuralı ekle</button></div>
      </div>` + tclassSection();
  }

  /* ---------- Ortak Etkileşimli Program Panosu (Dağıtım + Manuel + Çarşaf) ---------- */
  function diagHtml() {
    if (!pc.length) return `<div class="msg ok"><span class="ic">✓</span><div><b>Ön kontrol temiz.</b> Kapasite, blok, kilit ve gün grubu (Hall) kontrollerinde çelişki bulunmadı.</div><span></span></div>`;
    return pc.map(x => `<div class="msg ${x.lvl}"><span class="ic">${x.lvl === 'info' ? 'i' : '!'}</span><div><div>${x.msg}${x.grp ? ' <span class="tag" style="background:var(--paper)">gün grubu kontrolü</span>' : ''}</div>${x.sug ? `<div class="sug">${x.sug}</div>` : ''}</div>${x.go ? `<button class="btn sm" data-act="goFix" data-go="${x.go}" data-id="${x.id || ''}">Düzelt</button>` : '<span></span>'}</div>`).join('');
  }

  function relaxHtml() {
    if (!relax) return '';
    if (relax.run) return `<div class="sug">Deneniyor: ${relax.done || 0}/${relax.total}</div>`;
    const ok = relax.out.filter(x => x.ok);
    return `<div class="sug">${ok.length ? 'Şu öğretmenlerden birinin kapalı saatleri açılırsa program tam yerleşiyor: <b>' + ok.map(x => esc(S.teachers[x.ti] ? S.teachers[x.ti].name : '?')).join(', ') + '</b>. Önce 1–2 gün açıp yeniden deneyin.' : 'Tek bir öğretmeni açmak yetmedi. Birden fazla öğretmenin kapalı günlerini azaltın veya kuralları gevşetin.'}</div>`;
  }

  function rehCard(c) { return S.cards.find(x => x.classId === c.id && SB(x.subj) === EP.REHB); }
  function rehSlotState() { const r = S.rehSlot || {}; return { d: r.d == null ? 0 : +r.d, p: r.p == null ? Math.min(4, +S.school.P - 1) : +r.p, cls: r.cls && r.cls.length ? r.cls : S.classes.map(c => c.id) }; }

  function rehSlotCard(open) {
    if (!S.classes.length) return '';
    const st = rehSlotState(), P = +S.school.P;
    return `<details class="card" style="margin-bottom:12px;padding:12px 16px" ${open ? 'open' : ''}><summary><b>Ortak rehberlik saati</b> <span class="small muted">· seçilen sınıfların rehberlik dersini mevcut rehber öğretmenleriyle aynı gün ve saate kilitler</span></summary>
      <p class="small muted" style="margin:8px 0">Sınıflar ve Şubeler ile Ders Görevlendirmeleri menülerinde belirlediğiniz rehber öğretmenler <b>kesinlikle değiştirilmez</b>; seçilen saatte öğretmen kapalıysa veya çakışma varsa uyarı verilir.</p>
      <div class="row" style="gap:10px;align-items:flex-end;flex-wrap:wrap">
        <label class="f" style="width:145px">Gün<select id="rsD">${GUN.slice(0, +S.school.D).map((g, i) => `<option value="${i}" ${st.d === i ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
        <label class="f" style="width:120px">Ders saati<select id="rsP">${Array.from({ length: P }, (_, i) => `<option value="${i}" ${st.p === i ? 'selected' : ''}>${i + 1}. ders</option>`).join('')}</select></label>
        <div class="row" style="gap:6px;flex-wrap:wrap">${S.classes.map(c => {
          const cd = rehCard(c), tid = (cd && cd.teacherId) || c.rehber || '', t = S.teachers.find(x => x.id === tid);
          return `<label class="chip"><input type="checkbox" class="rsC" value="${c.id}" ${st.cls.includes(c.id) ? 'checked' : ''}> ${esc(c.name)}${t ? ` <span class="muted">· ${esc(tShort(t))}</span>` : ' <span class="muted" style="color:var(--err)">· atanmamış</span>'}</label>`;
        }).join('')}</div>
        <button class="btn pri" data-act="rehSlot">Yerleştir ve kilitle</button>
      </div></details>`;
  }

  function cellHtml(cell, kind, key, ed, closed, pref, tag) {
    const P = +S.school.P, x = key.split('-').map(Number), s = x[0] * P + x[1];
    let cls = 'cell', inner = '', act = `data-act="cell" data-kind="${kind}" data-key="${key}" data-ent="${tag}"`;
    if (cell) {
      const cd = cell.card, t = S.teachers.find(z => z.id === cd.teacherId);
      const t2 = cd.coTeacherId && cd.coTeacherId !== cd.teacherId ? S.teachers.find(z => z.id === cd.coTeacherId) : null;
      cls += ' ' + colorOf(cd.subj) + (cell.k ? ' cont' : '');
      if (cell.lock) cls += ' lk';
      inner = `<span class="s">${esc(SS(cd.subj))}${cell.k ? '' : cell.len > 1 ? ' <small>×' + cell.len + '</small>' : ''}</span>${cell.k ? '' : `<span class="x">${kind === 'c' ? esc(tShort(t)) + (t2 ? '+' + esc(tShort(t2)) : '') : esc(cName(cd.classId))}</span>`}${cell.lock && !cell.k ? LOCK_SVG : ''}`;
      act += ` data-id="${cell.id}" data-k="${cell.k}"${!cell.lock && !running && !bulkMode ? ' draggable="true"' : ''}`;
      if (ed && sel === cell.id) cls += ' sel';
      if (ed && cell.k === 0 && ed.sw.has(cell.id)) cls += ' swp';
      if (bulkSel.has(cell.id)) cls += ' bsel';
    } else if (closed) cls += ' closed';
    if (ed && ed.tg.has(s) && !cell) cls += ' tgt';
    if (pref && !closed) cls += ' pref';
    return `<td class="${cls}" ${act} tabindex="0">${inner}</td>`;
  }

  function grid1(o, kind, ent, ed) {
    const D = +S.school.D, P = +S.school.P, tm = EP.times(S, kind === 'c' ? ent.shift : undefined), G = (kind === 'c' ? o.cG : kind === 't' ? o.tG : o.rG)[ent.id] || {};
    const rel = ed && (kind === 'c' ? S.classes[ed.m.blocks[ed.i].c]?.id === ent.id : kind === 't' ? (S.teachers[ed.m.blocks[ed.i].t] || {}).id === ent.id : false);
    const dayHead = (g, d) => {
      const allClosed = Array.from({ length: P }, (_, p) => slotClosed(kind, ent, d + '-' + p)).every(Boolean);
      return `<th data-daytoggle="1" data-kind="${kind}" data-ent="${ent.id}" data-d="${d}" style="cursor:pointer;user-select:none" title="Bu günü kapatmak veya açmak için çift tıklayın">${g}${allClosed ? ' <span class="tag" style="background:var(--errBg);color:var(--err);font-size:10px;padding:1px 5px">Kapalı</span>' : ''}</th>`;
    };
    return `<table class="tt"><thead><tr><th class="pl"></th>${GUN.slice(0, D).map((g, d) => dayHead(g, d)).join('')}</tr></thead><tbody>
      ${Array.from({ length: P }, (_, p) => `<tr><th class="pl"><b>${p + 1}. ders</b><small>${tm[p] || ''}</small></th>${GUN.slice(0, D).map((g, d) => {
        const key = d + '-' + p;
        const closed = (kind === 'c' || kind === 'r') ? (ent.closed || []).includes(key) : (ent.av || {})[key] === 1;
        const pref = kind === 't' && (ent.av || {})[key] === 2;
        return cellHtml(G[key], kind, key, rel ? ed : null, closed, pref, ent.id);
      }).join('')}</tr>`).join('')}</tbody></table>`;
  }

  function sheet(o, kind, ed) {
    const D = +S.school.D, P = +S.school.P, ents = kind === 'c' ? S.classes : S.teachers, L = EP.loads(S);
    const relId = ed ? (kind === 'c' ? S.classes[ed.m.blocks[ed.i].c]?.id : (S.teachers[ed.m.blocks[ed.i].t] || {}).id) : null;
    return `<table class="sh"><thead><tr><th></th>${GUN.slice(0, D).map(g => `<th class="dh" colspan="${P}">${g}</th>`).join('')}</tr><tr><th></th>${GUN.slice(0, D).map(() => Array.from({ length: P }, (_, p) => `<th${p === 0 ? ' class="dh"' : ''}>${p + 1}</th>`).join('')).join('')}</tr></thead><tbody>
      ${ents.map(e => {
        const G = (kind === 'c' ? o.cG : o.tG)[e.id] || {};
        return `<tr><td class="nm">${esc(e.name)}<small>${kind === 'c' ? EP.classHours(S, e.id) + ' saat' : (L[e.id] || 0) + ' saat · ' + esc(e.branch || '')}</small></td>${Array.from({ length: D * P }, (_, s) => {
          const d = (s / P) | 0, p = s % P, key = d + '-' + p, cell = G[key];
          const closed = kind === 'c' ? (e.closed || []).includes(key) : (e.av || {})[key] === 1;
          const pref = kind === 't' && (e.av || {})[key] === 2;
          let cls = p === 0 ? 'd0' : '', inner = '', act = `data-act="cell" data-kind="${kind}" data-key="${key}" data-ent="${e.id}"`;
          if (cell) {
            cls += ' ' + colorOf(cell.card.subj) + (cell.lock ? ' lk' : '');
            inner = (kind === 'c' ? esc(SS(cell.card.subj)) : esc(cName(cell.card.classId))) + (cell.lock && !cell.k ? '·' : '');
            act += ` data-id="${cell.id}" data-k="${cell.k}"${!cell.lock && !running && !bulkMode ? ' draggable="true"' : ''}`;
            if (sel === cell.id) cls += ' sel';
            if (ed && e.id === relId && cell.k === 0 && ed.sw.has(cell.id)) cls += ' swp';
            if (bulkSel.has(cell.id)) cls += ' bsel';
          } else if (closed) cls += ' closed';
          if (ed && e.id === relId && !cell && ed.tg.has(s)) cls += ' tgt';
          if (pref && !closed && !cell) cls += ' pref';
          return `<td class="${cls}" ${act}>${inner}</td>`;
        }).join('')}</tr>`;
      }).join('')}</tbody></table>`;
  }

  function selPanel(o, ed) {
    if (!ed) return `<div class="card"><h3>Elle düzenleme &amp; Kilitleme</h3><p class="small muted" style="margin-top:6px"><b>Çift tık:</b> dersi anında kilitle / kilidi aç.<br><b>Sol tık:</b> işlem menüsü · <b>Sağ tık (boş hücre):</b> ders ekle · <b>Ctrl+Tık / Toplu Kilit Seçimi:</b> birden fazla dersi seçip topluca kilitle veya aç · <b>Sürükle-bırak</b> ile taşı.</p></div>`;
    const cd = EP.cardMap(S).get(sel.split(':')[0]), t = S.teachers.find(x => x.id === cd.teacherId), pl = S.place[sel], b = ed.m.blocks[ed.i];
    return `<div class="card"><span class="tag ${colorOf(cd.subj)}">${esc(SS(cd.subj))}</span><h3 style="margin-top:8px">${esc(SN(cd.subj))}</h3>
      <p class="small muted" style="margin:4px 0 10px">${esc(cName(cd.classId))} · ${esc(tName(t))} · ${b.len} saatlik blok<br>${pl ? GUN[pl.d] + ', ' + (pl.p + 1) + '. ders' : 'Yerleşmemiş'} · ${ed.tg.size} boş yer, ${ed.sw.size} yer değiştirme</p>
      <div class="row">${pl ? `<button class="btn sm" data-act="lock">${pl.lock ? 'Kilidi aç' : 'Kilitle'}</button><button class="btn sm" data-act="unplace">Programdan çıkar</button>` : ''}<button class="btn sm ghost" data-act="desel">Seçimi bırak</button></div></div>`;
  }

  function trayHtml(o) {
    if (!o.un.length) return `<div class="card"><h3>Yerleşmeyen dersler</h3><p class="small muted" style="margin-top:6px">Hepsi yerleşik.</p></div>`;
    const cm = EP.cardMap(S), qq = unQ.toLocaleLowerCase('tr').trim();
    return `<div class="card"><h3>Yerleşmeyen dersler · ${o.un.length}</h3>
      <p class="small muted" style="margin:4px 0 10px">Birini seçip yeşil hücreye tıklayın ya da sürükleyip bırakın.</p>
      <input id="unQ" value="${esc(unQ)}" placeholder="Ara: sınıf, ders veya öğretmen" style="margin-bottom:6px;width:100%"><div id="unN" class="small muted" style="margin-bottom:6px"></div>
      <div class="tray">${o.un.map(i => {
        const id = o.m.bid[i], cd = cm.get(id.split(':')[0]), t = S.teachers.find(z => z.id === cd.teacherId);
        const q = [cName(cd.classId), SN(cd.subj), SS(cd.subj), t ? t.name : 'öğretmensiz'].join(' ').toLocaleLowerCase('tr');
        return `<button class="chip unq ${colorOf(cd.subj)} ${sel === id ? 'on' : ''}" data-act="pick" data-id="${id}" data-q="${esc(q)}" title="${esc(SN(cd.subj) + ' · ' + (t ? t.name : 'öğretmensiz'))}" ${qq && !q.includes(qq) ? 'style="display:none"' : ''} draggable="true">${esc(cName(cd.classId))} ${esc(SS(cd.subj))} ×${o.m.blocks[i].len}</button>`;
      }).join('')}</div></div>`;
  }

  function board(o, includeRoom) {
    const v = S.ui.view || 'sinif';
    const isC = v === 'sinif' || v === 'csh', isR = v === 'room';
    const ents = isR ? (S.rooms || []) : isC ? S.classes : S.teachers;
    if (!ents.length) return '<div class="empty">Önce sınıf, öğretmen veya derslik ekleyin.</div>';
    const ent = ents.find(e => e.id === S.ui.ent) || ents[0];
    const ed = sel ? EP.editInfoFor(S, sel) : null;
    const viewList = [['sinif', 'Sınıf'], ['ogr', 'Öğretmen'], ['csh', 'Sınıf çarşafı'], ['tsh', 'Öğretmen çarşafı']];
    if (includeRoom) viewList.push(['room', 'Derslik']);
    const tabs = `<div class="row" style="justify-content:space-between;margin-bottom:12px"><div class="tabs">${viewList.map(t => `<button data-act="view" data-v="${t[0]}" class="${v === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
      <div class="row">
        ${v === 'sinif' || v === 'ogr' || v === 'room' ? `<select data-ui="ent">${ents.map(e => `<option value="${e.id}" ${e.id === ent.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select>` : ''}
        <button class="btn sm ${bulkMode || bulkSel.size ? 'pri' : ''}" data-act="toggleBulkLock" title="Kilitli veya açık dersleri seçip topluca kilitleyin/açın">${bulkMode ? '✓ Toplu Kilit Seçimi Açık' : 'Toplu Kilit Seçimi'}${bulkSel.size ? ` (${bulkSel.size})` : ''}</button>
      </div></div>`;
    let bulkBar = '';
    if (bulkMode || bulkSel.size > 0) {
      const selIds = [...bulkSel].filter(id => Boolean(S.place[id]));
      const lkCnt = selIds.filter(id => S.place[id].lock).length;
      const ulCnt = selIds.length - lkCnt;
      bulkBar = `<div class="bulk-bar">
        <span class="small"><b>Toplu Kilit Seçimi:</b> ${selIds.length} ders seçili (${lkCnt} kilitli · ${ulCnt} açık) — tablodan derslere tıklayarak seçin.</span>
        <div class="row" style="gap:6px">
          <button class="btn sm pri" data-act="bulkToggleSel" ${selIds.length ? '' : 'disabled'} title="Seçili kilitlileri açar, açıkları kilitler">Seçilenleri Tersine Çevir (Kilitli↔Açık)</button>
          <button class="btn sm" data-act="bulkLockSel" data-v="1" ${ulCnt ? '' : 'disabled'}>Seçilenleri Kilitle (${ulCnt})</button>
          <button class="btn sm" data-act="bulkLockSel" data-v="0" ${lkCnt ? '' : 'disabled'}>Kilidi Aç (${lkCnt})</button>
          <button class="btn sm ghost" data-act="bulkSelectVis" data-v="unlocked">Açıkları Seç</button>
          <button class="btn sm ghost" data-act="bulkSelectVis" data-v="locked">Kilitlileri Seç</button>
          <button class="btn sm ghost" data-act="bulkClearSel">Temizle</button>
        </div>
      </div>`;
    }
    const g = (v === 'sinif' || v === 'ogr' || v === 'room') ? grid1(o, v === 'sinif' ? 'c' : v === 'ogr' ? 't' : 'r', ent, ed) : sheet(o, isC ? 'c' : 't', ed);
    const legend = `<div class="legend" style="margin-top:10px"><span><i style="background:repeating-linear-gradient(135deg,var(--closed) 0 2px,transparent 2px 6px)"></i>Kapalı saat</span><span><i style="box-shadow:inset 0 0 0 2px var(--warn)"></i>Tercihen boş</span><span><i style="background:var(--okBg);box-shadow:inset 0 0 0 2px var(--ok)"></i>Taşınabilir</span><span><i style="box-shadow:inset 0 0 0 3px var(--ok)"></i>Yer değiştirilebilir</span><span><i style="background:#dc2626"></i>Kilitli (Çift tıkla değiştir)</span><span><i style="box-shadow:inset 0 0 0 3px #2563eb"></i>Toplu seçim</span></div>`;
    return `<div class="board-stack"><div class="card">${tabs}${bulkBar}<div class="scroll">${g}</div>${legend}</div><div class="grid2" style="align-items:start">${selPanel(o, ed)}${trayHtml(o)}</div></div>`;
  }

  function reasonsHtml(o) {
    if (!o.un.length || running) return '';
    const { m, c } = EP.placedCore(S), cm = EP.cardMap(S), D = +S.school.D, P = +S.school.P;
    const Lnk = (txt, attrs) => `<a href="#" class="lnk" ${attrs}>${txt}</a>`;
    const entries = [];

    for (const i of o.un) {
      const id = m.bid[i], b = m.blocks[i], cd = cm.get(id.split(':')[0]);
      if (!cd) continue;
      const cls = S.classes[b.c], t = b.t >= 0 ? S.teachers[b.t] : null, links = [];
      let msg = '';
      if (!t) {
        msg = 'Bu derse öğretmen atanmamış; öğretmensiz ders yerleştirilmez.';
        links.push(Lnk('Öğretmen ata →', `data-act="goCls" data-id="${cls.id}"`));
      } else {
        const cs = c.cands[i];
        if (!cs.length) {
          let tc = 0, cc = 0, fb = 0;
          for (let d = 0; d < D; d++) for (let p = 0; p + b.len <= P; p++) {
            let rc = false, rt = false;
            for (let k = 0; k < b.len; k++) { const key = d + '-' + (p + k); if ((cls.closed || []).includes(key)) rc = true; if ((t.av || {})[key] === 1) rt = true; }
            if (rt) tc++; if (rc) cc++; if (!rt && !rc) fb++;
          }
          const parts = [tc && `${tc} başlangıçta öğretmen kapalı`, cc && `${cc} tanesinde sınıf kapalı`, fb && `${fb} tanesinde saat yasağı / öğle kuralı var`].filter(Boolean);
          msg = `Bu ${b.len} saatlik blok için uygun saat yok: ${parts.join(', ')}.`;
          links.push(Lnk(esc(t.name) + ' müsaitliği →', `data-act="goFix" data-go="teachers" data-id="${t.id}"`), Lnk(esc(cls.name) + ' saatleri →', `data-act="goFix" data-go="classes" data-id="${cls.id}"`));
        } else {
          const cnt = {}, top = {};
          for (const s of cs) { const w = c.why(i, s), k = w.startsWith('tch:') ? 'tch' : w; cnt[k] = (cnt[k] || 0) + 1; if (k === 'tch') { const nm = S.classes[m.blocks[+w.slice(4)].c].name; top[nm] = (top[nm] || 0) + 1; } }
          const tt = Object.entries(top).sort((a, b2) => b2[1] - a[1]).slice(0, 2).map(x => x[0]).join(', ');
          const parts = [cnt.cls && `${cnt.cls} sınıfta başka ders var`, cnt.tch && `${cnt.tch} öğretmen başka sınıfta (${esc(tt)})`, cnt.dmax && `${cnt.dmax} günlük sınır`, cnt.cmax && `${cnt.cmax} ardışık sınır`, cnt.diff && `${cnt.diff} farklı gün kuralı`, cnt.pair && `${cnt.pair} aynı gün olmasın`, cnt.lunch && `${cnt.lunch} öğle arası`].filter(Boolean);
          msg = cnt[''] ? `${cnt['']} boş yer var; “Dağıtılmayanları dağıt” ile yerleştirilebilir.` : `${cs.length} olası saatin tamamı dolu: ${parts.join(', ')}.`;
          links.push(Lnk('Dersi seç →', `data-act="pick" data-id="${id}"`), Lnk(esc(t.name) + ' →', `data-act="goFix" data-go="teachers" data-id="${t.id}"`));
        }
      }
      entries.push({ id, cls, t, cd, len: b.len, msg, links });
    }

    const totHours = entries.reduce((a, x) => a + x.len, 0);
    const byClass = new Map();
    const byTeacher = new Map();
    for (const en of entries) {
      const ck = en.cls.id;
      if (!byClass.has(ck)) byClass.set(ck, { cls: en.cls, items: [], hours: 0 });
      const cg = byClass.get(ck); cg.items.push(en); cg.hours += en.len;

      const tk = en.t ? en.t.id : '__none__';
      if (!byTeacher.has(tk)) byTeacher.set(tk, { t: en.t, items: [], hours: 0 });
      const tg = byTeacher.get(tk); tg.items.push(en); tg.hours += en.len;
    }

    const utab = S.ui.unTab || 'class';
    const tabs = `<div class="tabs" style="margin:10px 0 12px;display:inline-flex">
      <button data-act="unTab" data-v="class" class="${utab === 'class' ? 'on' : ''}">Sınıfa göre (${byClass.size} sınıf)</button>
      <button data-act="unTab" data-v="teacher" class="${utab === 'teacher' ? 'on' : ''}">Öğretmene göre (${byTeacher.size} öğretmen)</button>
      <button data-act="unTab" data-v="all" class="${utab === 'all' ? 'on' : ''}">Tüm liste (${entries.length} blok)</button>
    </div>`;

    let body = '';
    if (utab === 'class') {
      const groups = [...byClass.values()].sort((a, b) => a.cls.name.localeCompare(b.cls.name, 'tr'));
      body = `<div class="grid2">${groups.map(g => `<div class="card" style="background:var(--soft);border:0;padding:12px 14px">
        <div class="row" style="justify-content:space-between;margin-bottom:8px">
          <h3>${esc(g.cls.name)}</h3>
          <span class="pill err">${g.items.length} blok · ${g.hours} saat</span>
        </div>
        <div class="diag" style="gap:6px">${g.items.map(en => `<div class="msg warn" style="padding:8px 10px"><span class="ic">!</span><div>
          <b><span class="tag ${colorOf(en.cd.subj)}">${esc(SS(en.cd.subj))}</span> ${esc(SN(en.cd.subj))} · ${en.len} sa</b>
          <span class="small muted"> — ${esc(en.t ? en.t.name : 'Öğretmen atanmamış')}</span>
          <div class="sug">${en.msg}</div>
          <div class="row small" style="gap:12px;margin-top:4px">${en.links.join('')}</div>
        </div><span></span></div>`).join('')}</div>
      </div>`).join('')}</div>`;
    } else if (utab === 'teacher') {
      const groups = [...byTeacher.values()].sort((a, b) => {
        if (!a.t) return -1; if (!b.t) return 1;
        return a.t.name.localeCompare(b.t.name, 'tr');
      });
      body = `<div class="grid2">${groups.map(g => `<div class="card" style="background:var(--soft);border:0;padding:12px 14px">
        <div class="row" style="justify-content:space-between;margin-bottom:8px">
          <div><h3>${esc(g.t ? g.t.name : 'Öğretmen Atanmamış Dersler')}</h3>${g.t ? `<small class="muted">${esc(g.t.branch || '')}</small>` : ''}</div>
          <span class="pill err">${g.items.length} blok · ${g.hours} saat</span>
        </div>
        <div class="diag" style="gap:6px">${g.items.map(en => `<div class="msg warn" style="padding:8px 10px"><span class="ic">!</span><div>
          <b>${esc(en.cls.name)}</b> · <span class="tag ${colorOf(en.cd.subj)}">${esc(SS(en.cd.subj))}</span> <b>${esc(SN(en.cd.subj))} · ${en.len} sa</b>
          <div class="sug">${en.msg}</div>
          <div class="row small" style="gap:12px;margin-top:4px">${en.links.join('')}</div>
        </div><span></span></div>`).join('')}</div>
      </div>`).join('')}</div>`;
    } else {
      body = `<div class="diag">${entries.map(en => `<div class="msg warn"><span class="ic">!</span><div><b>${esc(en.cls.name)} · <span class="tag ${colorOf(en.cd.subj)}">${esc(SS(en.cd.subj))}</span> ${esc(SN(en.cd.subj))} · ${en.len} saat</b> <span class="small muted">${esc(en.t ? en.t.name : 'öğretmen yok')}</span><div class="sug">${en.msg}</div><div class="row small" style="gap:14px;margin-top:6px">${en.links.join('')}</div></div><span></span></div>`).join('')}</div>`;
    }

    return `<div class="card" style="margin-top:16px" id="reasons">
      <div class="row" style="justify-content:space-between">
        <div>
          <h2>Dağıtılamayan Dersler · ${entries.length} blok (${totHours} saat)</h2>
          <p class="small muted" style="margin-top:3px">${byClass.size} sınıf · ${byTeacher.size} öğretmen etkilendi. Hangi sınıfın veya öğretmenin hangi dersinin yerleşmediğini sekmelerden inceleyin.</p>
        </div>
      </div>
      ${tabs}${body}
    </div>`;
  }

  /* 9. Dağıtım ve Program (Otomatik Dağıtım + Elle Düzenleme + Toplu Kilitleme tek ekranda) */
  function lockToolsCard() {
    const lk = EP.lockedIds(S).length;
    return `<details class="card" style="margin-bottom:12px;padding:12px 16px"><summary><b>Toplu kilitleme araçları</b> <span class="small muted">· ${lk} kilitli blok · öğretmen, sınıf veya gün bazlı toplu kilitleme</span></summary>
      <div class="row" style="gap:8px;align-items:flex-end;margin-top:10px">
        <label class="f">Öğretmen<select id="lkT"><option value="">— seçin —</option>${S.teachers.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label>
        <button class="btn sm" data-act="lockByT" data-v="1">Kilitle</button><button class="btn sm ghost" data-act="lockByT" data-v="0">Aç</button>
        <label class="f">Sınıf<select id="lkC"><option value="">— seçin —</option>${S.classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
        <button class="btn sm" data-act="lockByC" data-v="1">Kilitle</button><button class="btn sm ghost" data-act="lockByC" data-v="0">Aç</button>
        <label class="f">Gün<select id="lkD">${GUN.slice(0, +S.school.D).map((g, i) => `<option value="${i}">${g}</option>`).join('')}</select></label>
        <button class="btn sm" data-act="lockByD" data-v="1">Kilitle</button><button class="btn sm ghost" data-act="lockByD" data-v="0">Aç</button>
        <button class="btn sm ghost" data-act="unlockAll" ${lk ? '' : 'disabled'}>Tüm Kilitleri Aç (${lk})</button>
      </div></details>`;
  }

  function savedPlansCard(compact) {
    const plans = Array.isArray(S.savedPlans) ? S.savedPlans : [];
    const inner = `<div class="row" style="gap:8px;align-items:flex-end;margin-top:10px;flex-wrap:wrap">
        <label class="f" style="flex:1;min-width:220px">Dağıtım adı<input id="spName_${compact ? 'd' : 'p'}" placeholder="ör. 1. Dönem Kesin Program, Alternatif A"></label>
        <label class="f" style="flex:1;min-width:180px">Not (isteğe bağlı)<input id="spNote_${compact ? 'd' : 'p'}" placeholder="ör. Sıfır boşluk, Cuma boş"></label>
        <button class="btn pri" data-act="savePlanNow" data-src="${compact ? 'd' : 'p'}">Mevcut Dağıtımı Kaydet</button>
        ${plans.length ? `<button class="btn" data-act="comparePlans" title="Kayıtlı dağıtımları yan yana karşılaştır">Karşılaştır</button>` : ''}
      </div>
      ${plans.length ? `<div class="scroll" style="margin-top:12px"><table class="tbl"><thead><tr><th>Kayıt Adı</th><th>Tarih</th><th class="n">Yerleşen</th><th class="n">Kilitli</th><th style="text-align:right">İşlemler</th></tr></thead><tbody>
        ${plans.map(sp => `<tr>
          <td><b>${esc(sp.name)}</b>${sp.note ? `<br><small class="muted">${esc(sp.note)}</small>` : ''}</td>
          <td class="small muted">${new Date(sp.savedAt).toLocaleString('tr-TR')}</td>
          <td class="n"><b>${sp.placed}</b>/${sp.total}</td>
          <td class="n">${sp.locked || 0}</td>
          <td style="text-align:right;white-space:nowrap">
            <button class="btn sm pri" data-act="loadSavedPlan" data-id="${sp.id}" title="Bu kayıtlı dağıtımı programa geri yükle">Uygula</button>
            <button class="btn sm" data-act="dlSavedPlan" data-id="${sp.id}" title="Bu dağıtımı JSON dosyası olarak indir">İndir</button>
            <button class="btn sm ghost" data-act="delSavedPlan" data-id="${sp.id}">Sil</button>
          </td>
        </tr>`).join('')}
      </tbody></table></div>` : '<p class="small muted" style="margin-top:10px">Henüz kayıtlı dağıtım yok. Beğendiğiniz bir ders dağıtımını ad vererek kaydedip dilediğiniz zaman tek tıkla geri yükleyebilirsiniz.</p>'}`;
    if (compact) {
      return `<details class="card" style="margin-bottom:12px;padding:12px 16px" ${plans.length ? '' : ''}><summary><b>Kayıtlı ders dağıtımları (${plans.length})</b> <span class="small muted">· yaptığınız dağıtımları ad vererek saklayın ve sonradan tek tıkla geri yükleyin</span></summary>${inner}</details>`;
    }
    return `<div class="card" style="margin-top:14px"><h2>Kayıtlı Ders Dağıtımları (${plans.length})</h2>
      <p class="small muted" style="margin-top:4px">Farklı dağıtım senaryolarını adlandırıp kaydedin; istediğiniz zaman programa geri yükleyin veya ayrı JSON dosyası olarak paylaşın.</p>${inner}</div>`;
  }

  function vDagitim() {
    const o = EP.occ(S), tot = o.m.blocks.length, pl = tot - o.un.length, L = S.last;
    const errs = pc.filter(x => x.lvl === 'err').length;
    const warns = pc.filter(x => x.lvl === 'warn').length;
    const lkCnt = EP.lockedIds(S).length;
    const plansCnt = Array.isArray(S.savedPlans) ? S.savedPlans.length : 0;
    const dtool = S.ui.dtool || (errs ? 'diag' : '');

    const eng = `<div class="card" style="margin-bottom:10px;padding:12px 16px">
      <div class="row" style="justify-content:space-between">
        <div class="row" style="gap:6px">
          <button class="btn sm pri" data-act="solve" ${running || !tot ? 'disabled' : ''}>Baştan dağıt</button>
          <button class="btn sm" data-act="fill" ${running || !o.un.length ? 'disabled' : ''}>Dağıtılmayanları dağıt</button>
          <button class="btn sm" data-act="improve" ${running || o.un.length || !tot ? 'disabled' : ''}>İyileştir</button>
          <button class="btn sm" data-act="stop" ${running ? '' : 'disabled'}>Durdur</button>
          <button class="btn sm" data-act="maxFinish" ${running ? '' : 'disabled'} title="Şu ana kadar dağıtılan dersleri şablona işler ve bitirir; yerleşmeyenler altta listelenir">Maksimumda bitir</button>
          <button class="btn sm" data-act="quickSavePlan" ${running || !pl ? 'disabled' : ''} title="Mevcut ders dağıtımını kayıtlı dağıtımlar listesine ekler (Ctrl+S)">Dağıtımı Kaydet</button>
          <button class="btn sm ghost" data-act="clearPlan" ${running || !pl ? 'disabled' : ''}>Temizle</button>
          <button class="btn sm ghost" data-act="verify">Kontrol et</button>
        </div>
        <div class="row" style="gap:6px">
          <select data-ui="prio" style="min-height:34px;font-size:13px" aria-label="Öncelik" title="Dağıtım önceliği"><option value="gaps" ${S.ui.prio === 'gaps' ? 'selected' : ''}>Boşlukları azalt</option><option value="bal" ${S.ui.prio === 'bal' ? 'selected' : ''}>Dengeli dağıt</option></select>
          <select data-ui="time" style="min-height:34px;font-size:13px" aria-label="Süre sınırı" title="Süre sınırı">${EP.TIME_PRESETS.map(([v, l]) => `<option value="${v}" ${+S.ui.time === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
      </div>
      <div class="stats" style="margin-top:8px;padding-top:8px">
        <div><small>Yerleşen blok</small><b id="kPl">${running ? (live.placed || 0) : pl} / ${tot}</b><div class="bar"><i id="kBar" style="width:${tot ? Math.round(100 * (running ? (live.placed || 0) : pl) / tot) : 0}%"></i></div></div>
        <div><small>Yerleşmeyen</small><b id="kUn" style="color:${o.un.length && !running ? 'var(--err)' : 'inherit'}">${running ? Math.max(0, tot - (live.placed || 0)) : o.un.length}</b></div>
        <div><small>Kalite / Durum</small><b id="kNd">${running ? 'Optimize ediliyor…' : (L && L.qualityScore != null ? L.qualityScore + '/100' : (pl === tot && tot ? 'Tam' : '—'))}</b></div>
        <div><small>Süre</small><b id="kMs">${running ? fmtMs(live.ms) : L ? fmtMs(L.ms) : '—'}</b> <span id="kSt" class="small muted">${L && !running ? esc(L.note || '') : (running ? 'En iyi program aranıyor…' : '')}</span></div>
      </div></div>`;

    const toolBar = `<div class="dtools">
      <button class="btn sm ${errs ? 'err-pill' : ''} ${dtool === 'diag' ? 'on' : ''}" data-act="dtool" data-v="diag">Ön Kontrol: ${errs ? errs + ' çakışma' : warns ? 'çakışma yok, ' + warns + ' uyarı' : 'temiz ✓'}</button>
      <button class="btn sm ${dtool === 'reh' ? 'on' : ''}" data-act="dtool" data-v="reh">Ortak Rehberlik Saati</button>
      <button class="btn sm ${dtool === 'lock' ? 'on' : ''}" data-act="dtool" data-v="lock">Toplu Kilitleme (${lkCnt})</button>
      <button class="btn sm ${dtool === 'saved' ? 'on' : ''}" data-act="dtool" data-v="saved">Kayıtlı Dağıtımlar (${plansCnt})</button>
      ${plansCnt ? `<button class="btn sm ghost" data-act="comparePlans">Karşılaştır</button>` : ''}
    </div>`;

    let activePanel = '';
    if (dtool === 'diag') {
      activePanel = `<div class="card" id="diagBox" style="margin-bottom:12px;padding:12px 16px"><div class="diag">${diagHtml()}
        ${(errs || (L && L.status === 'partial')) ? `<div class="msg info"><span class="ic">?</span><div><b>Hangi öğretmenin kapalı saatini açarsam çözülür?</b><div class="sug">Kapalı saati olan her öğretmen için kısa deneme yapılarak sorunu tek başına çözen öğretmenler bulunur.</div>${relaxHtml()}</div><button class="btn sm" data-act="relax" ${running ? 'disabled' : ''}>Öneri bul</button></div>` : ''}
      </div></div>`;
    } else if (dtool === 'reh') {
      activePanel = rehSlotCard(true);
    } else if (dtool === 'lock') {
      activePanel = lockToolsCard().replace('<details class="card"', '<details class="card" open');
    } else if (dtool === 'saved') {
      activePanel = savedPlansCard(true).replace('<details class="card"', '<details class="card" open');
    }

    return H('Dağıtım ve Program', 'Dolu derse çift tıklayarak kilitleyin/açın; gün başlığına çift tıklayarak o günü kapatın/açın; boş hücreye çift tıklayarak o saati kapatın/açın.') +
      eng + toolBar + activePanel + board(o, true) + reasonsHtml(o);
  }

  /* 12. Haftalık Ders Programları */
  function vTimetables() {
    const o = EP.occ(S);
    return H('Haftalık Ders Programları', 'Sınıf, öğretmen, derslik ve tam çarşaf görünümleri. Gün başlığına çift tıklayarak günü kapatıp açabilir, boş hücreye çift tıklayarak saati kapatıp açabilir, dolu derse çift tıklayarak kilitleyebilirsiniz.',
      `<button class="btn pri" data-step="reports">Resmi Belge Önizle / Yazdır</button>`) + lockToolsCard() + board(o, true);
  }

  /* 13. Analiz ve İstatistikler */
  function vAnalytics() {
    const o = EP.occ(S), tot = o.m.blocks.length;
    return H('Analiz ve İstatistikler', 'Öğretmen günlük yük dağılımı, boş pencere analizi, ardışık ders sayıları ve sınıf çizelge uyumu.') +
      EP.vQuality(S, o, tot) +
      `<div class="card scroll" style="margin-top:14px"><h2 style="margin-bottom:8px">Sınıf Doluluk ve Çizelge Uyumu</h2>
        <table class="tbl"><thead><tr><th>Şube</th><th class="n">Düzey</th><th class="n">Zorunlu</th><th class="n">Seçmeli</th><th class="n">Toplam</th><th class="n">Açık Saat</th><th class="n">Öğretmensiz</th></tr></thead><tbody>
        ${S.classes.map(c => { const st = EP.clsStat(S, c); return `<tr><td><b>${esc(c.name)}</b></td><td class="n">${EP.gradeShort(c.grade)}</td><td class="n">${st.z}</td><td class="n">${st.s}${st.lim ? '/' + st.lim : ''}</td><td class="n"><b>${st.tot}</b>${st.tg ? '/' + st.tg : ''}</td><td class="n">${EP.classOpen(S, c).tot}</td><td class="n" style="color:${st.noT ? 'var(--err)' : 'inherit'}">${st.noT}</td></tr>`; }).join('')}
        </tbody></table></div>`;
  }

  /* 11. Okul Nöbeti (Haftalık & Aylık Nöbet Oluşturma) */
  function vDuty() {
    const D = +S.school.D || 5, pl = EP.dutyPlaces(S), dCfg = S.duty || {};
    const adm = dCfg.admin || {}, strategy = dCfg.strategy || 'max_lessons';
    const avoidZeroDay = dCfg.avoidZeroDay !== false;
    const dtab = S.ui.dutyTab === 'monthly' ? 'monthly' : 'weekly';
    const ym = dCfg.month || EP.defaultYearMonth();
    const mMode = dCfg.monthlyMode || 'rotate';
    const o = EP.occ(S), loadsByT = EP.teacherDailyLoads(S, o);
    const vpNames = [...new Set([S.school.mudurYardimcisi, ...EP.myList(S).map(m => m.name), ...S.teachers.filter(t => t.role === 'mudur_yardimcisi').map(t => t.name)].filter(Boolean))];
    const eligibleCount = S.teachers.filter(t => !EP.isDutyExempt(S, t)).length;
    const exemptCount = S.teachers.length - eligibleCount;
    const assignedCount = S.teachers.filter(t => !EP.isDutyExempt(S, t) && EP.dutyOf(t).d >= 0).length;

    const head = H('Okul Nöbeti Oluşturma', 'Öğretmenlerin haftalık ders programına göre (en az dersli gün, en çok dersli gün veya dengeli) haftalık ve aylık nöbet çizelgesi oluşturun. Nöbet tutar/tutmaz ayarını tek tıkla yönetin.',
      `<button class="btn pri" data-act="dutyAuto">Haftalık Nöbeti Oluştur</button><button class="btn" data-act="buildMonthlyDuty">Aylık Nöbeti Oluştur</button><button class="btn" data-act="clubAuto">Sosyal Kulüpleri Dağıt</button>`);

    const tabs = `<div class="tabs" style="margin-bottom:14px;display:inline-flex">
      <button data-act="dutyTab" data-v="weekly" class="${dtab === 'weekly' ? 'on' : ''}">Haftalık Nöbet (Sabit Haftalık)</button>
      <button data-act="dutyTab" data-v="monthly" class="${dtab === 'monthly' ? 'on' : ''}">Aylık Nöbet Çizelgesi (${esc(ym)})</button>
    </div>`;

    const kpis = `<div class="kpis">
      <div class="kpi"><small>Nöbet Tutan Öğretmen</small><b>${eligibleCount}</b><span>${assignedCount} kişiye gün atandı</span></div>
      <div class="kpi"><small>Nöbet Tutmayan / Muaf</small><b>${exemptCount}</b><span>Okul müdürü, müdür yrd. &amp; muaf</span></div>
      <div class="kpi"><small>Nöbet Yeri</small><b>${pl.length}</b><span>${esc(pl.join(', '))}</span></div>
      <div class="kpi"><small>Dağıtım Kuralı</small><b style="font-size:15px">${strategy === 'min_lessons' ? 'En az dersli gün' : strategy === 'max_lessons' ? 'En çok dersli gün' : 'Dengeli'}</b><span>${avoidZeroDay ? 'Boş güne verilmez' : 'Tüm açık günler'}</span></div>
    </div>`;

    const settingsCard = `<div class="card" style="margin-bottom:14px">
      <h2>Nöbet Ayarları, Yerler ve Dağıtım Kuralı</h2>
      <div class="fields" style="margin-top:12px">
        <label class="f" style="grid-column:span 2">Nöbet yerleri (virgülle ayırın)<input data-dplaces="1" value="${esc(pl.join(', '))}" placeholder="Bahçe, 1. Kat Koridor, 2. Kat Koridor, Zemin Kat"></label>
        <label class="f" style="grid-column:span 2">Öğretmen ders programına göre dağıtım kuralı<select data-dutycfg="strategy">${EP.DUTY_STRATEGIES.map(([k, l]) => `<option value="${k}" ${strategy === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <label class="f" style="grid-column:span 2">Boş gün kuralı<span class="row small" style="min-height:40px;padding:0 10px;border:1px solid var(--line);border-radius:9px"><input type="checkbox" data-dutycfg="avoidZeroDay" ${avoidZeroDay ? 'checked' : ''}> 0 dersli (boş) gününe nöbet verme</span></label>
      </div>
      <h3 style="margin:14px 0 8px">Günlük Nöbetçi İdareciler (Müdür Yardımcıları)</h3>
      <div class="fields"><datalist id="mylistDuty">${vpNames.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
        ${GUN.slice(0, D).map((g, d) => `<label class="f">${g}<input list="mylistDuty" data-dadmin="${d}" value="${esc(adm[d] || '')}" placeholder="Müdür Yardımcısı"></label>`).join('')}
      </div>
    </div>`;

    if (dtab === 'monthly') {
      const mRows = (dCfg.monthly && dCfg.monthly[ym]) || EP.buildMonthlyDuty(S, ym, mMode);
      const [yr, mo] = ym.split('-').map(Number);
      const ayTxt = `${(EP.AY_AD || [])[(mo || 1) - 1] || ''} ${yr}`;
      const reassignClosed = dCfg.reassignClosedDay !== false;
      const openRowsCount = mRows.filter(r => !r.closed).length;
      const closedRowsCount = mRows.filter(r => r.closed).length;
      const rowByDate = new Map(mRows.map(r => [r.date, r]));
      const firstDowJs = new Date(yr, mo - 1, 1, 12, 0, 0).getDay(); // 0=Paz..6=Cmt
      const leadEmpty = firstDowJs === 0 ? 6 : firstDowJs - 1;
      const daysInMo = new Date(yr, mo, 0).getDate();
      const calCells = [];
      for (let i = 0; i < leadEmpty; i++) calCells.push('<div class="dcal-day empty"></div>');
      for (let day = 1; day <= daysInMo; day++) {
        const dt = new Date(yr, mo - 1, day, 12, 0, 0);
        const jsDow = dt.getDay();
        const dow = jsDow === 0 ? 6 : jsDow - 1;
        const iso = `${yr}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const row = rowByDate.get(iso);
        if (dow >= D || !row) {
          calCells.push(`<button type="button" class="dcal-day wknd" disabled><div class="dn"><span>${day}</span><span class="small muted">Tatil</span></div><div class="ds">Hafta sonu</div></button>`);
        } else if (row.closed) {
          calCells.push(`<button type="button" class="dcal-day closed" data-act="toggleDutyDate" data-id="${iso}" title="Günü tekrar açmak için tıklayın"><div class="dn"><span>${day}</span><span class="tag" style="background:var(--errBg);color:var(--err)">Kapalı</span></div><div class="ds">Tatil / Kapalı · Açmak için tıkla</div></button>`);
        } else {
          const tCnt = Object.values(row.posts || {}).reduce((a, arr) => a + (arr || []).length, 0);
          calCells.push(`<button type="button" class="dcal-day" data-act="toggleDutyDate" data-id="${iso}" title="Bu günü kapatmak (tatil yapmak) için tıklayın"><div class="dn"><span>${day}</span><span class="tag" style="background:var(--okBg);color:var(--ok)">${tCnt} kişi</span></div><div class="ds">${row.admin ? esc(row.admin) : 'Açık okul günü'}</div></button>`);
        }
      }

      const monthlyCard = `<div class="card" style="margin-bottom:14px">
        <div class="row" style="justify-content:space-between;margin-bottom:10px">
          <div>
            <h2>${esc(ayTxt)} Aylık Nöbet Takvimi (${openRowsCount} açık · ${closedRowsCount} kapalı gün)</h2>
            <p class="small muted" style="margin-top:3px">Takvimde herhangi bir okul gününe tıklayarak o günü <b>kapatabilir</b> (resmî tatil, ara tatil, kar tatili vb.) veya tekrar <b>açabilirsiniz</b>. <b>Kesin kural:</b> Bir öğretmen bir takvim haftasında <b>en fazla 1 gün</b> nöbet tutar.</p>
          </div>
          <div class="row">
            <button class="btn sm" data-act="applyMebHolidays" title="Bu aydaki resmî bayram ve MEB ara tatil günlerini otomatik kapalı işaretle">MEB Resmî Tatillerini İşle</button>
            ${closedRowsCount ? `<button class="btn sm ghost" data-act="clearMonthClosed">Bu Aydaki Kapalı Günleri Aç (${closedRowsCount})</button>` : ''}
            <button class="btn pri" data-act="exMonthlyPdf">Aylık PDF İndir (.pdf)</button>
            <button class="btn" data-act="exMonthlyPrint">Yazdır</button>
            <button class="btn" data-act="exMonthlyWord">Word (.doc)</button>
          </div>
        </div>
        <div class="row" style="margin-bottom:10px;gap:10px;align-items:flex-end;flex-wrap:wrap">
          <label class="f" style="width:180px">Ay / Yıl seçin<input type="month" data-dutycfg="month" value="${esc(ym)}"></label>
          <label class="f" style="min-width:260px">Aylık dağıtım biçimi<select data-dutycfg="monthlyMode">
            <option value="rotate" ${mMode === 'rotate' ? 'selected' : ''}>Haftadan haftaya nöbet yerlerini döndür (Adil rotasyon)</option>
            <option value="fixed" ${mMode === 'fixed' ? 'selected' : ''}>Her hafta aynı gün ve aynı nöbet yeri (Sabit)</option>
          </select></label>
          <label class="f" style="min-width:290px">Kapalı gün kuralı<span class="row small" style="min-height:40px;padding:0 10px;border:1px solid var(--line);border-radius:9px"><input type="checkbox" data-dutycfg="reassignClosedDay" ${reassignClosed ? 'checked' : ''}> Günü kapanan öğretmeni o haftanın uygun açık gününe kaydır</span></label>
          <button class="btn pri" data-act="buildMonthlyDuty">Aylık Çizelgeyi Yeniden Dağıt</button>
        </div>
        <div class="dcal">
          ${['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map(g => `<div class="dcal-hd">${g}</div>`).join('')}
          ${calCells.join('')}
        </div>
      </div>
      <div class="card scroll">
        <div class="row" style="justify-content:space-between;margin-bottom:10px">
          <div>
            <h2>${esc(ayTxt)} Günlük Nöbet Dağılım Tablosu</h2>
            <p class="small muted" style="margin-top:2px">Hücreleri elle düzenleyebilirsiniz; aynı takvim haftasında bir öğretmene ikinci kez nöbet yazılması otomatik engellenir.</p>
          </div>
        </div>
        <table class="tbl"><thead><tr><th style="width:110px">Tarih</th><th style="width:105px">Gün</th>${pl.map(p => `<th>${esc(p)}</th>`).join('')}<th>Nöbetçi İdareci</th><th style="width:86px">Durum</th></tr></thead><tbody>
        ${mRows.map((row, rIdx) => row.closed
          ? `<tr style="opacity:.65;background:var(--soft)">
              <td><b>${esc(row.date.split('-').reverse().join('.'))}</b></td>
              <td>${GUN[row.dow]} <span class="small muted">(${row.weekNum}. hf)</span></td>
              <td colspan="${pl.length + 1}" class="small" style="color:var(--err);font-weight:600">KAPALI / TATİL GÜNÜ — Bu güne nöbet dağıtılmaz</td>
              <td><button class="btn sm ghost" data-act="toggleDutyDate" data-id="${row.date}">Günü Aç</button></td>
            </tr>`
          : `<tr>
              <td><b>${esc(row.date.split('-').reverse().join('.'))}</b></td>
              <td>${GUN[row.dow]} <span class="small muted">(${row.weekNum}. hf)</span></td>
              ${pl.map(p => `<td><input data-mcell="${esc(ym)}|${rIdx}|${esc(p)}" value="${esc(((row.posts || {})[p] || []).join(', '))}" style="width:100%;min-width:130px"></td>`).join('')}
              <td><input data-madmin="${esc(ym)}|${rIdx}" value="${esc(row.admin || '')}" style="width:100%;min-width:120px"></td>
              <td><button class="btn sm ghost" data-act="toggleDutyDate" data-id="${row.date}" title="Günü kapat (tatil yap)">Kapat</button></td>
            </tr>`).join('')}
        </tbody></table>
      </div>`;
      return head + tabs + kpis + settingsCard + monthlyCard;
    }

    // Haftalık Nöbet Görünümü
    const tsDuty = S.teachers.filter(t => !EP.isDutyExempt(S, t) && EP.dutyOf(t).d >= 0);
    const cellNames = (d, p) => tsDuty.filter(t => EP.dutyOf(t).d === d && (EP.dutyOf(t).place || pl[0]) === p).map(t => `<span class="tag" style="background:var(--okBg);color:var(--ok);margin:2px">${esc(t.name)}</span>`).join('') || '<span class="small muted">—</span>';

    const weeklyGrid = `<div class="card scroll" style="margin-bottom:14px">
      <div class="row" style="justify-content:space-between;margin-bottom:10px">
        <div>
          <h2>Haftalık Sabit Nöbet Tablosu</h2>
          <p class="small muted" style="margin-top:2px">Her hafta aynı gün ve nöbet yerinde uygulanacak çizelge.</p>
        </div>
        <div class="row">
          <button class="btn pri" data-act="exDutyPdf">Haftalık PDF İndir (.pdf)</button>
          <button class="btn" data-act="exDutyPrint">Yazdır</button>
          <button class="btn" data-act="exDutyWord">Word (.doc)</button>
          <button class="btn ghost" data-act="dutyClear">Nöbetleri Temizle</button>
        </div>
      </div>
      <table class="tbl"><thead><tr><th style="width:120px">Gün</th>${pl.map(p => `<th>${esc(p)}</th>`).join('')}<th>Nöbetçi İdareci</th></tr></thead><tbody>
      ${GUN.slice(0, D).map((g, d) => `<tr><td><b>${g}</b></td>${pl.map(p => `<td>${cellNames(d, p)}</td>`).join('')}<td><b>${esc(adm[d] || '—')}</b></td></tr>`).join('')}
      </tbody></table>
    </div>`;

    const staffTable = `<div class="card scroll">
      <h2>Öğretmen Nöbet Tutar / Tutmaz Listesi ve Ders Yoğunlukları (${S.teachers.length})</h2>
      <p class="small muted" style="margin:4px 0 10px">Okul müdürü, müdür yardımcıları ve rehber öğretmenler otomatik muaftır. Diğer öğretmenler için <b>Nöbet Tutar / Tutmaz</b> anahtarını tek tıkla değiştirebilirsiniz. Yeşil etiket öğretmenin en az dersli gününü, sarı etiket en çok dersli gününü gösterir.</p>
      <table class="tbl"><thead><tr><th>Öğretmen / İdareci</th><th>Nöbet Durumu</th><th>Ders Programı (Günlük Ders)</th><th>Nöbet Günü</th><th>Nöbet Yeri</th><th>Sosyal Kulüp</th></tr></thead><tbody>
      ${S.teachers.map(t => {
        const du = EP.dutyOf(t), ak = EP.staffAdminKind(S, t), exempt = EP.isDutyExempt(S, t);
        const dl = loadsByT[t.id] || Array(D).fill(0);
        const pos = dl.filter(n => n > 0);
        const minV = pos.length ? Math.min(...pos) : -1;
        const maxV = pos.length ? Math.max(...pos) : -1;
        const chips = dl.map((n, di) => {
          const cls = n === 0 ? 'z' : n === minV ? 'min' : n === maxV ? 'max' : '';
          return `<span class="duty-day-chip ${cls}" title="${GUN[di]}: ${n} saat ders">${GK[di]}:${n}</span>`;
        }).join(' ');
        return `<tr>
          <td><b>${esc(t.name)}</b><br><small class="muted">${esc(t.branch || '')}${ak ? ' · ' + esc(EP.dutyExemptReason(S, t)) : ''}</small></td>
          <td>
            <div class="row" style="gap:8px;flex-wrap:nowrap">
              <button class="sw ${exempt ? '' : 'on'}" data-act="toggleDutyExempt" data-id="${t.id}" ${ak ? 'disabled title="İdareci ve rehber öğretmenler otomatik muaftır"' : 'title="Nöbet Tutar / Nöbet Tutmaz değiştir"'}></button>
              <span class="pill ${exempt ? 'warn' : 'ok'}">${exempt ? 'Nöbet Tutmaz' : 'Nöbet Tutar'}</span>
            </div>
          </td>
          <td><div class="row" style="gap:4px">${chips}</div></td>
          <td>${exempt ? `<span class="small muted">${esc(EP.dutyExemptReason(S, t))}</span>` : `<select data-t="${t.id}" data-f="dutyD"><option value="">— Seçilmedi —</option>${GUN.slice(0, D).map((g, d) => `<option value="${d}" ${du.d === d ? 'selected' : ''}>${g} (${dl[d]} ders)</option>`).join('')}</select>`}</td>
          <td>${exempt ? '<span class="small muted">—</span>' : `<select data-t="${t.id}" data-f="dutyP">${pl.map(p => `<option ${(du.place || pl[0]) === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>`}</td>
          <td><select data-t="${t.id}" data-f="kulup" style="max-width:220px">${EP.clubOptions(S, t.kulup || '')}</select></td>
        </tr>`;
      }).join('')}</tbody></table>
    </div>`;

    return head + tabs + kpis + settingsCard + weeklyGrid + staffTable;
  }

  /* 12. Raporlar ve Çıktılar -> EP.vRapor(S, H) */

  /* 15. Yedekleme ve Senkronizasyon */
  function vProje() {
    const h = getHist();
    return H('Yedekleme ve Senkronizasyon', 'Yerel JSON yedekleme ve geri yükleme tamamen ücretsiz ve girişsizdir. Hem eski Çarşaf (v2) hem DersMatrix Ultimate (v3) dosyalarını kayıpsız açar.') +
      `<div class="grid2">
        <div class="card"><h2>Yerel Dosya (Ücretsiz · Girişsiz)</h2>
          <div class="row" style="margin-top:12px">
            <button class="btn pri" data-act="saveJson">Proje dosyasını indir (.json)</button>
            <label class="btn">Proje dosyası aç<input type="file" accept=".json,application/json" id="openFile" hidden></label>
            <button class="btn ghost" data-act="copyJson">JSON’u kopyala</button>
          </div>
          <label class="f" style="margin-top:14px">Proje (senaryo) adı<input data-k="school.name" value="${esc(S.school.name)}"></label>
        </div>
        <div class="card"><h2>Yeni Başlangıç &amp; Örnekler</h2>
          <div class="row" style="margin-top:12px">
            <button class="btn" data-act="newEmpty">Boş proje</button>
            <button class="btn" data-act="demo">Örnek okul</button>
            <button class="btn" data-act="demoX">Çakışmalı örnek</button>
          </div>
          <p class="small muted" style="margin-top:10px">“Çakışmalı örnek”, tek tek öğretmenlere bakınca sorunsuz görünen ama Çarşamba–Cuma gün grubunda öğretmen yetmeyen bir okuldur.</p>
        </div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="row" style="justify-content:space-between">
          <div><h2>EvrakPlus Bulut Senkronizasyonu</h2><p class="small muted" style="margin-top:4px">Masaüstü, Web ve Mobil cihazlarınız arasında senkronizasyon için ücretsiz EvrakPlus hesabınızla giriş yapın.</p></div>
          <button class="btn" data-act="cloudSync">Buluta Senkronize Et</button>
        </div>
      </div>
      ${savedPlansCard(false)}
      <div class="card" style="margin-top:14px"><h2>Otomatik Yerel Geçmiş (Son 8 Kayıt)</h2>
        ${h.length ? `<table class="tbl" style="margin-top:8px"><tbody>${h.map((x, i) => `<tr><td>${new Date(x.at).toLocaleString('tr-TR')}</td><td>${esc(x.label)}</td><td style="text-align:right"><button class="btn sm" data-act="restore" data-i="${i}">Geri yükle</button></td></tr>`).join('')}</tbody></table>` : '<p class="small muted" style="margin-top:6px">Henüz kayıt yok.</p>'}
      </div>`;
  }

  /* 14. EvrakPlus Hesabım */
  function vAccount() {
    const logged = isMember();
    return H('EvrakPlus Hesabım', 'Tüm yerel okul planlama, ders dağıtımı, JSON yedekleme ve filigranlı çıktı alma girişsizdir. Ücretsiz EvrakPlus girişiyle tüm çıktılarınız tamamen temiz ve filigransız olur.') +
      `<div class="grid2">
        <div class="card"><h2>Oturum Durumu</h2>
          <p class="small muted" style="margin:8px 0 14px">${logged
            ? `<span class="pill ok">Üye Girişi Aktif</span> &nbsp;<b>${esc(authUser.displayName || authUser.username || 'EvrakPlus Üyesi')}</b> — Tüm çıktılarınız filigransız ve temizdir.`
            : 'Şu an giriş yapılmadı. Üyesiz çıktılarda EVRAK PLUS filigranı görünür. Uygulama içinden giriş yaptığınızda oturumunuz otomatik kaydedilir.'}</p>
          <div class="row">
            ${logged
              ? `<button class="btn" data-act="refreshAuth">Oturumu Doğrula</button><button class="btn ghost" data-act="logoutAuth">Çıkış Yap</button>`
              : `<button class="btn pri" data-act="openLogin">EvrakPlus ile Giriş Yap / Üye Ol</button><button class="btn" data-act="refreshAuth">Oturumu Kontrol Et</button>`}
          </div>
        </div>
        <div class="card"><h2>Özellik Erişimi</h2>
          <table class="tbl" style="margin-top:8px"><tbody>
            <tr><td>Okul, öğretmen, sınıf, ders ve kurallar</td><td><span class="pill ok">Girişsiz Ücretsiz</span></td></tr>
            <tr><td>Otomatik ve manuel ders dağıtımı</td><td><span class="pill ok">Girişsiz Ücretsiz</span></td></tr>
            <tr><td>PDF, Excel, Word, PNG, CSV çıktıları</td><td><span class="pill ${logged ? 'ok' : 'warn'}">${logged ? 'Filigransız Temiz' : 'Filigranlı Ücretsiz'}</span></td></tr>
            <tr><td>Filigransız Resmi Çıktı &amp; Bulut Senkronizasyonu</td><td><span class="pill ok">Ücretsiz EvrakPlus Üyeliği</span></td></tr>
          </tbody></table>
        </div>
      </div>`;
  }

  /* 15. Sistem ve Güncellemeler */
  function vSystem() {
    const info = sysInfo;
    const upd = updateInfo;
    return H('Sistem ve Güncellemeler', 'Uygulama sürümü, otomatik güncelleme ve görünüm ayarları.') +
      `<div class="grid2">
        <div class="card"><h2>Görünüm ve Tema</h2>
          <div class="row" style="margin-top:12px">
            <button class="btn ${(S.ui.theme || 'auto') === 'auto' ? 'pri' : ''}" data-act="setTheme" data-v="auto">Sistem Varsayılanı</button>
            <button class="btn ${S.ui.theme === 'light' ? 'pri' : ''}" data-act="setTheme" data-v="light">Açık Tema</button>
            <button class="btn ${S.ui.theme === 'dark' ? 'pri' : ''}" data-act="setTheme" data-v="dark">Koyu Tema</button>
          </div>
        </div>
        <div class="card"><h2>Uygulama ve Otomatik Güncelleme</h2>
          <table class="tbl" style="margin-top:8px"><tbody>
            <tr><td>Uygulama Sürümü</td><td><b>v${esc(APP_VER)}</b></td></tr>
            <tr><td>Çalışma Ortamı</td><td>${bridge ? 'Windows Masaüstü Uygulaması' : webApi ? 'Web Uygulaması' : 'Tarayıcı Önizleme'}</td></tr>
            ${info ? `<tr><td>İşlemci / Bellek</td><td>${info.cpus} çekirdek · ${info.freeMemGB}/${info.totalMemGB} GB RAM</td></tr>` : ''}
            <tr><td>Güncelleme Durumu</td><td>${updateProgress ? esc(updateProgress.message) : upd ? (upd.updateAvailable ? `<span class="pill ok">Yeni sürüm hazır: v${esc(upd.latestVersion)}</span>` : (upd.error ? `<span class="small muted">${esc(upd.error)}</span>` : `<span class="pill ok">Güncel (v${esc(upd.latestVersion || APP_VER)})</span>`)) : '<span class="small muted">Henüz kontrol edilmedi</span>'}</td></tr>
          </tbody></table>
          ${updateProgress ? `<div class="bar" style="margin-top:10px"><i style="width:${updateProgress.percent || 0}%;background:var(--ok)"></i></div>` : ''}
          <div class="row" style="margin-top:12px">
            ${bridge ? `<button class="btn" data-act="checkUpdate" ${updateProgress ? 'disabled' : ''}>Güncellemeleri Denetle</button>` : ''}
            ${bridge && upd && upd.updateAvailable ? `<button class="btn pri" data-act="installUpdate" ${updateProgress ? 'disabled' : ''}>v${esc(upd.latestVersion)} İndir ve Kur</button>` : ''}
            <a class="btn sm ghost" href="${EP.EVRAKPLUS_SITE_URL}" target="_blank" rel="noopener">evrakplus.com</a>
          </div>
        </div>
      </div>`;
  }

  /* 16. Yardım ve Destek */
  function vHelp() {
    const logged = isMember();
    return H('Yardım ve Destek', 'Kısayollar, hızlı kullanım rehberi ve EvrakPlus hesap bağlantıları.') +
      `<div class="grid2">
        <div class="card"><h2>Klavye &amp; Fare Kısayolları</h2>
          <table class="tbl" style="margin-top:8px"><tbody>
            <tr><td><b>Çift tık (dolu hücre)</b></td><td>Dersi anında kilitle / kilidi aç</td></tr>
            <tr><td><b>Ctrl + Tık / Toplu Kilit Seçimi</b></td><td>Birden fazla dersi seçip topluca kilitle veya kilidini aç</td></tr>
            <tr><td><b>Sol tık (dolu hücre)</b></td><td>İşlem menüsü: kilitle, öğretmen değiştir, çıkar veya sil</td></tr>
            <tr><td><b>Sağ tık (boş hücre)</b></td><td>O sınıfın zorunlu/seçmeli derslerini blok seçerek yerleştir</td></tr>
            <tr><td><b>Sürükle-Bırak</b></td><td>Dersi yeşil boş hücreye taşı veya yeşil çerçeveli dersle yer değiştir</td></tr>
            <tr><td><b>Ctrl + Z / Ctrl + Y</b></td><td>40 adımlı Geri Al / Yinele</td></tr>
            <tr><td><b>Esc</b></td><td>Açık pencere, menü veya seçimi kapat</td></tr>
          </tbody></table>
        </div>
        <div class="card"><h2>EvrakPlus Hesap ve Destek</h2>
          ${logged
            ? `<div class="msg ok" style="margin:10px 0 12px"><span class="ic">✓</span><div><b>EvrakPlus Üye Girişi Aktif</b><div class="sug">${esc(authUser.displayName || authUser.username || 'EvrakPlus Üyesi')} — Tüm PDF, Word, Excel ve PNG çıktılarınız filigransız ve temizdir.</div></div><span></span></div>`
            : `<p class="small muted" style="margin:8px 0 12px">Henüz giriş yapılmadı. Ücretsiz EvrakPlus hesabınızla giriş yaptığınızda tüm çıktılarınız otomatik olarak filigransız olur.</p>`}
          <div class="diag" style="margin-top:10px">
            ${logged
              ? `<button class="btn pri" data-step="account">EvrakPlus Hesabım'a Git</button><button class="btn ghost" data-act="logoutAuth">Oturumu Kapat</button>`
              : `<button class="btn pri" data-act="openLogin">EvrakPlus ile Giriş Yap / Üye Ol</button>`}
            <a class="btn" href="${EP.EVRAKPLUS_SITE_URL}" target="_blank" rel="noopener">EvrakPlus Ana Sayfa (evrakplus.com)</a>
          </div>
        </div>
      </div>`;
  }

  /* =========================================================================
   * YÜZEN BAĞLAM MENÜSÜ (#pop) & SAĞ TIK DERS EKLEME MENÜSÜ (addMenuHtml)
   * ========================================================================= */
  const popEl = document.createElement('div'); popEl.id = 'pop'; document.body.appendChild(popEl);
  function closePop() { pop = null; popEl.innerHTML = ''; popEl.className = ''; }
  function entOf(kind, id) { return kind === 'c' ? S.classes.find(x => x.id === id) : kind === 't' ? S.teachers.find(x => x.id === id) : (S.rooms || []).find(x => x.id === id); }
  function slotClosed(kind, e, key) { return (kind === 'c' || kind === 'r') ? (e.closed || []).includes(key) : (e.av || {})[key] === 1; }

  function pmEntries(cls) {
    const T = EP.typeOf(S), g = cls.grade, cards = S.cards.filter(x => x.classId === cls.id), out = { z: [], s: [], e: [] }, seen = new Set();
    const so = n => g >= 1 && g <= 4 && EP.SO_SET.has(n);
    for (const z of EP.zFor(S, T, g)) { const k = EP.findSubj(S, z.name, so(z.name)), cd = k && cards.find(x => x.subj === k && x.kind !== 'secmeli'); if (cd) seen.add(cd.id); out.z.push({ name: z.name, hours: [z.hours], kind: 'zorunlu', card: cd || null }); }
    for (const p of EP.poolFor(S, T, g)) { const k = EP.findSubj(S, p.name, false), cd = k && cards.find(x => x.subj === k && x.kind === 'secmeli'); if (cd) seen.add(cd.id); out.s.push({ name: p.name, hours: p.opts, kind: 'secmeli', card: cd || null }); }
    for (const cd of cards) if (!seen.has(cd.id)) (cd.kind === 'secmeli' ? out.s : cd.kind === 'zorunlu' ? out.z : out.e).push({ name: SN(cd.subj), hours: [+cd.hours], kind: cd.kind, card: cd });
    return out;
  }

  function addMenuHtml() {
    const P = +S.school.P, x = pop.key.split('-').map(Number), s0 = x[0] * P + x[1], e = entOf(pop.kind, pop.ent);
    if (!e || pop.kind === 'r') return '';
    const head = `<div><b>${esc(e.name)}</b> <span class="small muted">· ${GUN[x[0]]}, ${x[1] + 1}. ders</span><div class="small muted">Ders ekle veya yerleştir</div></div>`;
    if (slotClosed(pop.kind, e, pop.key)) return head + `<p class="small muted">Bu saat kapalı. Ders eklemek için önce saati açın.</p><button class="btn sm" data-act="pSlot">Bu saati aç</button>`;
    const o = EP.occ(S);
    const cls = pop.kind === 'c' ? e : S.classes.find(c => c.id === pop.cls), tch = pop.kind === 't' ? e : null;
    let h = head;
    if (tch) {
      h += `<label class="f">Sınıf<select data-pcls="1"><option value="">— sınıf seçin —</option>${S.classes.map(c => { const f = (o.cG[c.id] || {})[pop.key]; return `<option value="${c.id}" ${pop.cls === c.id ? 'selected' : ''} ${f ? 'disabled' : ''}>${esc(c.name)}${f ? ' · dolu (' + esc(SS(f.card.subj)) + ')' : ''}</option>`; }).join('')}</select></label>`;
      if (!cls) return h + '<p class="small muted">Bu saat boş olan bir sınıf seçin.</p>';
    }
    if ((o.cG[cls.id] || {})[pop.key]) return h + `<p class="small muted">${esc(cls.name)} sınıfının bu saati dolu.</p>`;
    const { m, c } = EP.placedCore(S), E = pmEntries(cls), st = EP.clsStat(S, cls);
    const row = en => {
      const cd = en.card, q = (en.name + ' ' + (cd ? SS(cd.subj) : '')).toLocaleLowerCase('tr'); let body = '';
      if (cd) {
        const t = S.teachers.find(z => z.id === cd.teacherId), parts = EP.parsePat(cd.pattern, cd.hours), other = tch && cd.teacherId && cd.teacherId !== tch.id;
        const chips = parts.map((len, k) => {
          const id = cd.id + ':' + k, i = m.bid.indexOf(id); if (i < 0) return '';
          if (c.pos[i] >= 0) { const pl = S.place[id]; return `<span class="tag" style="background:var(--soft)">×${len} ✓ ${pl ? GUN[pl.d].slice(0, 3) + ' ' + (pl.p + 1) : ''}</span>`; }
          if (!cd.teacherId) return `<span class="tag" style="background:var(--warnBg);color:var(--warn)">×${len} öğretmensiz</span>`;
          if (!other && c.valid(i, s0)) return `<button class="btn sm pri" data-act="pmPlace" data-id="${id}" style="width:auto">×${len} buraya</button>`;
          const why = other ? 'Bu ders başka öğretmende' : EP.whyAt(S, m, c, i, s0);
          const closedT = t && !other && Array.from({ length: len }, (_, q2) => x[0] + '-' + (x[1] + q2)).some(kk => (t.av || {})[kk] === 1);
          return `<button class="btn sm" disabled style="width:auto">×${len} buraya</button><div class="small" style="width:100%;color:var(--err)">Yerleşmez: ${esc(why)}.</div>${closedT ? `<button class="btn sm" data-act="pmOpenT" data-id="${id}" style="width:auto">${esc(tName(t))} için saati aç ve yerleştir</button>` : ''}`;
        }).join('');
        const alt = EP.effPats(S, cd).filter(p => p !== cd.pattern);
        body = `<div class="small muted">${esc(cd.pattern)} · ${cd.hours} sa · ${esc(t ? tShort(t) : 'öğretmensiz')}</div><div class="row" style="gap:4px;flex-wrap:wrap;margin-top:4px">${chips}${alt.map(p => `<button class="btn sm ghost" data-act="pmPat" data-id="${cd.id}" data-p="${p}" style="width:auto">→ ${p}</button>`).join('')}</div>`;
      } else {
        const btns = en.hours.map(hh => {
          const tmp = { subj: EP.findSubj(S, en.name, cls.grade >= 1 && cls.grade <= 4 && EP.SO_SET.has(en.name)) || en.name, hours: hh };
          return EP.effPats(S, tmp).map(p => `<button class="btn sm" data-act="pmAdd" data-n="${esc(en.name)}" data-kind="${en.kind}" data-h="${hh}" data-p="${p}" style="width:auto">${en.hours.length > 1 || EP.effPats(S, tmp).length > 1 ? hh + ' sa · ' : ''}${p}</button>`).join('');
        }).join('');
        body = `<div class="row" style="gap:4px;flex-wrap:wrap;margin-top:4px">${btns}</div>`;
      }
      return `<div class="pmi" data-q="${esc(q)}" style="border-top:1px solid var(--line);padding:6px 0"><div><b style="font-size:13.5px">${esc(en.name)}</b>${cd ? '' : ' <span class="small muted">· sınıfta yok</span>'}</div>${body}</div>`;
    };
    const sec = (t, arr, extra) => arr.length ? `<div class="pms"><div style="font-weight:600;margin-top:6px">${t}${extra || ''}</div>${arr.map(row).join('')}</div>` : '';
    const ord = a => a.slice().sort((p, q) => (q.card ? 1 : 0) - (p.card ? 1 : 0));
    return h + `<label class="row small" style="gap:6px;cursor:pointer"><input type="checkbox" data-ui="pmLock" ${S.ui.pmLock ? 'checked' : ''}> Yerleştirirken kilitle</label>
      <input id="pmQ" placeholder="Ders ara…" value="${esc(pop.q || '')}">` +
      sec('Zorunlu dersler', ord(E.z)) + sec('Seçmeli dersler', ord(E.s), st.lim ? ` <span class="small muted">· ${st.s}/${st.lim} saat</span>` : '') + sec('Ek ve branş dışı', E.e);
  }

  function pmFilter() {
    const q = (pop && pop.q || '').toLocaleLowerCase('tr').trim();
    popEl.querySelectorAll('.pmi').forEach(r => { r.style.display = !q || r.dataset.q.includes(q) ? '' : 'none'; });
    popEl.querySelectorAll('.pms').forEach(s => { s.style.display = [...s.querySelectorAll('.pmi')].some(r => r.style.display !== 'none') ? '' : 'none'; });
  }

  function renderPop() {
    if (!pop || !['auto_schedule', 'manual_schedule', 'timetables'].includes(step)) { popEl.innerHTML = ''; popEl.className = ''; return; }
    const td = document.querySelector(`td[data-act="cell"][data-key="${pop.key}"][data-ent="${pop.ent}"]`);
    if (!td) { closePop(); return; }
    const P = +S.school.P, x = pop.key.split('-').map(Number), e = entOf(pop.kind, pop.ent);
    if (!e) { closePop(); return; }
    let h = '';
    if (pop.add) {
      h = addMenuHtml();
      popEl.className = 'pop wide';
      popEl.innerHTML = h + `<button class="btn sm ghost" data-act="pClose">Kapat</button>`;
      pmFilter();
    } else if (pop.id && S.place[pop.id]) {
      const cd = EP.cardMap(S).get(pop.id.split(':')[0]), pl = S.place[pop.id], len = EP.parsePat(cd.pattern, cd.hours)[+pop.id.split(':')[1]] || 1, t = S.teachers.find(z => z.id === cd.teacherId);
      h = `<div><span class="tag ${colorOf(cd.subj)}">${esc(SS(cd.subj))}</span> <b>${esc(SN(cd.subj))}</b><div class="small muted">${esc(cName(cd.classId))} · ${esc(tName(t))}<br>${GUN[pl.d]}, ${pl.p + 1}${len > 1 ? '–' + (pl.p + len) : ''}. ders${pl.lock ? ' · kilitli' : ''}</div></div>
        <button class="btn sm" data-act="pLock">${pl.lock ? 'Kilidi aç' : 'Kilitle'}</button>
        <label class="f">Öğretmeni değiştir<select data-pt="${cd.id}">${tOptions(cd)}</select></label>
        <button class="btn sm" data-act="pUnplace">Programdan çıkar (yerleşmeyenlere)</button>
        <button class="btn sm" data-act="pDelCard" style="color:var(--err)">Dersi tamamen sil</button>
        <p class="small muted">Taşımak için yeşil hücreye tıklayın ya da dersi sürükleyin.</p>`;
      popEl.className = 'pop';
      popEl.innerHTML = h + `<button class="btn sm ghost" data-act="pClose">Kapat</button>`;
    } else {
      const closed = slotClosed(pop.kind, e, pop.key), dayKeys = Array.from({ length: P }, (_, p) => x[0] + '-' + p), dayClosed = dayKeys.every(k => slotClosed(pop.kind, e, k));
      let fits = '';
      if (!closed && pop.kind !== 'r') {
        const { m, c } = EP.placedCore(S), s0 = x[0] * P + x[1], list = [];
        m.bid.forEach((id, i) => {
          if (c.pos[i] >= 0) return;
          const b = m.blocks[i], rel = pop.kind === 'c' ? S.classes[b.c].id === pop.ent : (b.t >= 0 && S.teachers[b.t].id === pop.ent);
          if (rel && c.valid(i, s0)) list.push([id, b]);
        });
        const cm = EP.cardMap(S);
        fits = list.length ? `<div class="small muted">Buraya yerleştirilebilecek dersler</div>${list.slice(0, 8).map(([id, b]) => { const cd = cm.get(id.split(':')[0]); return `<button class="btn sm ${colorOf(cd.subj)}" data-act="pPlace" data-id="${id}">${esc(cName(cd.classId))} ${esc(SS(cd.subj))} ×${b.len}</button>`; }).join('')}`
          : `<p class="small muted">Buraya sığan yerleşmemiş ders yok.</p>`;
      }
      h = `<div><b>${esc(e.name)}</b><div class="small muted">${GUN[x[0]]}, ${x[1] + 1}. ders · ${closed ? 'kapalı' : 'boş'}</div></div>
        <button class="btn sm" data-act="pSlot">${closed ? 'Bu saati aç' : 'Bu saati kapat'}</button>
        <button class="btn sm" data-act="pDay">${dayClosed ? GUN[x[0]] + ' gününü aç' : GUN[x[0]] + ' gününü kapat'}</button>
        ${!closed && pop.kind !== 'r' ? '<button class="btn sm" data-act="pmOpen">Ders ekle… (sağ tık)</button>' : ''}${fits}`;
      popEl.className = 'pop';
      popEl.innerHTML = h + `<button class="btn sm ghost" data-act="pClose">Kapat</button>`;
    }
    const r = td.getBoundingClientRect(), w = pop.add ? 390 : 305;
    let left = r.left + window.scrollX;
    if (left + w > window.scrollX + document.documentElement.clientWidth - 8) left = window.scrollX + document.documentElement.clientWidth - w - 8;
    popEl.style.left = Math.max(8, left) + 'px';
    popEl.style.top = (r.bottom + window.scrollY + 6) + 'px';
  }

  async function guardLock(ids, okLabel) {
    const items = EP.impactFor(S, ids);
    if (!items.length) return true;
    const goOk = await warnAsk('Bu kilit kapalı saat kurallarıyla çakışıyor', items, okLabel);
    if (!goOk && undo.length) { S = JSON.parse(undo.pop()); sel = ''; closePop(); commit(); toast('Vazgeçildi; değişiklik geri alındı.'); }
    return goOk;
  }

  /* =========================================================================
   * 6 GERÇEK MOTOR ÇAĞRILARI (Desktop/Web API) & SINIRLI TARAYICI YEDEĞİ
   * ========================================================================= */
  function upLive() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const tot = live.total || 1;
    set('kPl', (live.placed || 0) + ' / ' + (live.total || 0));
    set('kUn', Math.max(0, (live.total || 0) - (live.placed || 0)));
    set('kNd', 'Optimize ediliyor…');
    set('kMs', fmtMs(live.ms));
    const b = document.getElementById('kBar');
    if (b) b.style.width = Math.min(100, Math.round(100 * (live.placed || 0) / tot)) + '%';
  }

  function applyMaxFinishPartial(bestPlacements, elapsedMs) {
    const m = EP.buildModel(S), tot = m.blocks.length;
    const lockOf = {};
    for (const k in S.place) if (S.place[k].lock) lockOf[k] = 1;

    if (bestPlacements && Object.keys(bestPlacements).length > 0) {
      snap();
      const cnt = EP.applyV3SolutionToState(S, { placements: bestPlacements }, true);
      S.last = {
        status: cnt >= tot ? 'ok' : 'partial',
        ms: elapsedMs || live.ms || 0,
        note: `Maksimumda bitirildi: ${cnt}/${tot} blok`
      };
      running = null;
      runCtx = null;
      hist('Maksimumda bitirildi');
      commit();
      toast(`Maksimumda bitirildi: ${cnt}/${tot} blok şablona işlendi.` + (tot > cnt ? ` ${tot - cnt} blok dağıtılamayanlar alanında listelendi.` : ''));
      return;
    }

    // Henüz ara çözüm gelmediyse (erken durdurma veya çakışmalı okul) kilitlileri koruyarak sığan maksimum dersleri anında şablona işle
    const fh = fixedHint(m, 'full');
    const r = EP.CORE().make(m).solve({ prio: S.ui.prio || 'gaps', time: 1800, fixed: fh.fixed }, null);
    applyBrowserResult(m, r.pos, lockOf, {
      status: r.best >= tot ? 'ok' : 'partial',
      ms: (elapsedMs || live.ms || 0) + (r.ms || 0),
      note: `Maksimumda bitirildi: ${r.best}/${tot} blok`
    }, m.bid, null);
    hist('Maksimumda bitirildi');
    toast(`Maksimumda bitirildi: ${r.best}/${tot} blok şablona işlendi.` + (tot > r.best ? ` ${tot - r.best} blok dağıtılamayanlar alanında listelendi.` : ''));
  }

  async function runNativeSolve(kind, overrideOpts) {
    const o = EP.occ(S), tot = o.m.blocks.length;
    if (!tot) { toast('Dağıtılacak ders bloğu yok.'); return; }
    closePop(); sel = '';
    running = 'native';
    nativeStopMode = null;
    const mode = (overrideOpts && overrideOpts.mode) || 'smart';
    const timeLimitSeconds = Number(S.ui.time || 30) || 10800;
    const t0 = Date.now();
    live = { placed: 0, total: tot, ms: 0, bestPlacements: null, status: 'En iyi program aranıyor…' };
    render();
    const timer = setInterval(() => { if (running === 'native') { live.ms = Date.now() - t0; upLive(); } }, 400);

    try {
      const v3Proj = EP.stateToV3Project(S, { mode: kind, useHints: kind !== 'full' });
      const opts = {
        mode,
        timeLimitSeconds,
        objectivePriority: S.ui.prio || 'gaps',
        useHints: kind !== 'full'
      };
      let res = null;
      if (bridge && typeof bridge.solve === 'function') {
        res = await bridge.solve(v3Proj, opts);
      } else if (webApi) {
        const r = await fetch(`${webApi}?route=solver/solve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.EVRAKPLUS_CSRF || '' },
          body: JSON.stringify({ project: v3Proj, options: opts })
        });
        res = await r.json();
      }

      clearInterval(timer);
      if (nativeStopMode === 'maxFinish') {
        // maxFinish düğmesi zaten şablona işledi
        nativeStopMode = null;
        return;
      }
      if (nativeStopMode === 'stop') {
        nativeStopMode = null;
        running = null;
        render();
        return;
      }
      running = null;
      if (!res) { render(); toast('Dağıtım yanıtı alınamadı.'); return; }

      const best = res.bestResult;
      if (best && best.placements && Object.keys(best.placements).length > 0) {
        snap();
        const count = EP.applyV3SolutionToState(S, best, true);
        const score = best.evaluation?.qualityScore ?? 0;
        const hardV = best.evaluation?.validation?.hardViolationCount ?? 0;
        S.last = {
          status: count >= tot && hardV === 0 ? 'ok' : 'partial',
          ms: res.elapsedMs || (Date.now() - t0),
          qualityScore: score,
          note: count >= tot && hardV === 0 ? 'Tamamlandı' : `${tot - count} blok yerleşemedi`
        };
        hist('Dağıtım tamamlandı');
        commit();
        toast(`Program ${fmtMs(S.last.ms)} içinde hazırlandı: ${count}/${tot} blok, kalite ${score}/100.`);
      } else {
        // Tam çözüm bulunamadıysa (ör. çakışmalı okul) sığan maksimum dersleri şablona işle ki dağıtılamayanlar açıkça görünsün
        applyMaxFinishPartial(live.bestPlacements, Date.now() - t0);
      }
    } catch (err) {
      clearInterval(timer);
      if (nativeStopMode === 'maxFinish') { nativeStopMode = null; return; }
      running = null;
      render();
      toast('Dağıtım hatası: ' + (err && err.message ? err.message : String(err)));
    }
  }

  function fixedHint(m, kind) {
    const o = { fixed: {}, hint: {}, fixedId: {}, hintId: {} };
    m.bid.forEach((id, i) => {
      const pl = S.place[id]; if (!pl || pl.d >= m.D) return;
      const s = pl.d * m.P + pl.p;
      if (pl.lock || kind === 'fill') { o.fixed[i] = s; o.fixedId[id] = s; }
      else if (kind !== 'full') { o.hint[i] = s; o.hintId[id] = s; }
    });
    return o;
  }

  function applyBrowserResult(m, pos, lockOf, info, bid, choice) {
    snap(); bid = bid || m.bid; let pcN = 0;
    if (choice && m.cards) m.cards.forEach((c, ci) => { const p = c.pats[choice[ci]]; if (!p) return; const ps = p.join('+'), cd = S.cards.find(x => x.id === c.id); if (cd && cd.pattern !== ps) { cd.pattern = ps; pcN++; } });
    const np = {};
    pos.forEach((s, i) => { if (s >= 0) np[bid[i]] = { d: (s / m.P) | 0, p: s % m.P, lock: !!lockOf[bid[i]] }; });
    S.place = np; info.patChanged = pcN; S.last = info; running = null;
    if (wk) { wk.terminate(); wk = null; }
    runCtx = null; commit();
  }

  function runBrowserSolve(kind) {
    const m = EP.buildModel(S); if (!m.blocks.length) return;
    const fh = fixedHint(m, kind); closePop();
    if (kind === 'full') { const fr = new Set(Object.keys(fh.fixedId).map(x => x.split(':')[0])); m.cards.forEach(c => { if (!fr.has(c.id)) c.ch = 0; }); }
    if (wk) wk.terminate();
    wk = EP.newWorker(); running = kind;
    live = { placed: 0, total: m.blocks.length, nodes: 0, restarts: 0, ms: 0 }; sel = '';
    const lockOf = {}; for (const k in S.place) if (S.place[k].lock) lockOf[k] = 1;
    runCtx = { m, lockOf, best: null }; render();
    const limitMs = Math.min(180000, Math.max(5000, (+S.ui.time || 20) * 1000));
    wk.onmessage = e => {
      const d = e.data;
      if (d.type === 'prog') { live = d.p; upLive(); }
      if (d.type === 'best' && runCtx) runCtx.best = { pos: d.pos, n: d.n, bid: d.bid, choice: d.choice };
      if (d.type === 'done') {
        const r = d.r;
        if (kind === 'fill' && r.status !== 'ok' && runCtx && !runCtx.soft) {
          runCtx.soft = true; const fh2 = fixedHint(m, 'soft');
          wk.postMessage({ cmd: 'solve', m, o: { time: limitMs, prio: S.ui.prio, fixedId: fh2.fixedId, hintId: fh2.hintId } });
          return;
        }
        applyBrowserResult(m, r.pos, lockOf, {
          status: r.status, ms: r.ms, nodes: r.nodes, restarts: r.restarts,
          note: r.status === 'ok' ? 'Tamamlandı' : `${r.total - r.best} blok yerleşemedi`
        }, r.bid, r.choice);
        hist(r.status === 'ok' ? 'Dağıtım tamamlandı' : 'Kısmi dağıtım');
        toast(r.status === 'ok' ? `Program ${fmtMs(r.ms)} içinde tam yerleşti.` : `${r.total - r.best} blok yerleşemedi.`);
      }
    };
    wk.postMessage({ cmd: 'solve', m, o: { time: kind === 'fill' ? Math.min(4000, limitMs) : limitMs, prio: S.ui.prio, fixedId: fh.fixedId, hintId: fh.hintId } });
  }

  function runSolve(kind) {
    if (bridge || webApi) runNativeSolve(kind);
    else runBrowserSolve(kind);
  }

  function runImprove() {
    if (bridge || webApi) { runNativeSolve('improve', { mode: 'hybrid' }); return; }
    const m = EP.buildModel(S), start = m.bid.map(id => { const pl = S.place[id]; return pl ? pl.d * m.P + pl.p : -1; });
    const lf = {}; m.bid.forEach((id, i) => { if (S.place[id] && S.place[id].lock) lf[i] = 1; });
    if (wk) wk.terminate(); wk = EP.newWorker(); running = 'improve'; sel = ''; render();
    wk.onmessage = e => {
      const d = e.data;
      if (d.type === 'iprog') { const el = $('#kSt'); if (el) el.textContent = `Ceza ${d.p.first} → ${d.p.pen}`; const ms = $('#kMs'); if (ms) ms.textContent = fmtMs(d.p.ms); }
      if (d.type === 'idone') {
        const r = d.r; snap(); const np = {};
        r.pos.forEach((s, i) => { if (s >= 0) np[m.bid[i]] = { d: (s / m.P) | 0, p: s % m.P, lock: !!(S.place[m.bid[i]] || {}).lock }; });
        S.place = np; S.last = Object.assign({}, S.last || {}, { ms: r.ms, note: `İyileştirme: ceza ${r.first} → ${r.pen}` });
        running = null; wk.terminate(); wk = null; commit();
        toast(r.pen < r.first ? `Program iyileşti: ceza ${r.first} → ${r.pen}.` : 'Daha iyi düzen bulunamadı.');
      }
    };
    wk.postMessage({ cmd: 'improve', m, o: { time: 6000, prio: S.ui.prio, fixed: lf, start } });
  }

  function runRelax() {
    const m = EP.buildModel(S);
    const list = S.teachers.map((t, i) => [i, Object.values(t.av || {}).filter(v => v === 1).length]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 12).map(x => x[0]);
    if (!list.length) { toast('Kapalı saati olan öğretmen yok.'); return; }
    const fx = {}; m.bid.forEach((id, i) => { const pl = S.place[id]; if (pl && pl.lock) fx[i] = pl.d * m.P + pl.p; });
    if (wk) wk.terminate(); wk = EP.newWorker(); running = 'relax'; relax = { run: true, done: 0, total: list.length }; render();
    wk.onmessage = e => {
      const d = e.data;
      if (d.type === 'rprog') { relax.done = d.done; render(); }
      if (d.type === 'rdone') { relax = { run: false, out: d.out }; running = null; wk.terminate(); wk = null; render(); }
    };
    wk.postMessage({ cmd: 'relax', m, o: { list, each: 2500, prio: S.ui.prio, fixed: fx } });
  }

  /* ---------- Ortak Rehberlik Saati (Salt-Okunur Atama Korumalı) & Yardımcı İşlemler ---------- */
  function toggleCellLockQuick(bid) {
    if (!bid || !S.place[bid]) return;
    const now = Date.now();
    if (now - lastDblToggleAt < 250) return;
    lastDblToggleAt = now;
    lastCellClick = null;
    snap();
    S.place[bid].lock = !S.place[bid].lock;
    const isLocked = S.place[bid].lock;
    const cd = EP.cardMap(S).get(bid.split(':')[0]);
    sel = '';
    closePop();
    commit();
    toast(`${cd ? cName(cd.classId) + ' ' + SS(cd.subj) : 'Ders'} ${isLocked ? 'kilitlendi' : 'kilidi açıldı'}.`);
  }

  async function toggleEntityDayQuick(kind, entId, d) {
    const e = entOf(kind, entId);
    if (!e) return;
    const now = Date.now();
    if (now - lastDblToggleAt < 250) return;
    lastDblToggleAt = now;
    lastCellClick = null;
    const P = +S.school.P || 7;
    const keys = Array.from({ length: P }, (_, p) => d + '-' + p);
    const allClosed = keys.every(k => slotClosed(kind, e, k));
    const kd = kind === 'c' ? 'cls' : kind === 'r' ? 'room' : 't';
    const pre = kd !== 'room' ? new Set(EP.lockedInClosed(S, kd, entId).map(x => x.k)) : new Set();
    snap();
    if (kind === 'c' || kind === 'r') {
      const cl = new Set(e.closed || []);
      keys.forEach(k => (allClosed ? cl.delete(k) : cl.add(k)));
      e.closed = [...cl];
    } else {
      e.av = e.av || {};
      keys.forEach(k => { if (allClosed) { if (e.av[k] === 1) delete e.av[k]; } else e.av[k] = 1; });
    }
    if (!allClosed) {
      const hit = kd !== 'room' ? EP.lockedInClosed(S, kd, entId).filter(x => !pre.has(x.k)) : [];
      if (hit.length) {
        commit();
        const goOk = await warnAsk(`${GUN[d]} gününde kilitli ders var`, hit.map(x => x.txt + ' kilitli'), 'Yine de günü kapat ve kilitli dersleri çıkar');
        if (!goOk) { S = JSON.parse(undo.pop()); commit(); toast('Vazgeçildi.'); return; }
        hit.forEach(x => delete S.place[x.k]);
      }
      const { bad } = EP.placedCore(S);
      bad.forEach(b => delete S.place[b]);
    }
    sel = '';
    closePop();
    commit();
    toast(`${e.name} · ${GUN[d]} günü ${allClosed ? 'açıldı' : 'kapatıldı'}.`);
  }

  async function toggleEntitySlotQuick(kind, entId, key) {
    const e = entOf(kind, entId);
    if (!e) return;
    const now = Date.now();
    if (now - lastDblToggleAt < 250) return;
    lastDblToggleAt = now;
    lastCellClick = null;
    const wasClosed = slotClosed(kind, e, key);
    snap();
    if (kind === 'c' || kind === 'r') {
      const cl = new Set(e.closed || []);
      if (wasClosed) cl.delete(key); else cl.add(key);
      e.closed = [...cl];
    } else {
      e.av = e.av || {};
      if (wasClosed) { if (e.av[key] === 1) delete e.av[key]; } else e.av[key] = 1;
    }
    sel = '';
    closePop();
    commit();
    const x = key.split('-').map(Number);
    toast(`${e.name} · ${GUN[x[0]]} ${x[1] + 1}. ders ${wasClosed ? 'açıldı' : 'kapatıldı'}.`);
  }

  function saveCurrentPlanSnapshot(customName, customNote) {
    const o = EP.occ(S), tot = o.m.blocks.length, pl = tot - o.un.length;
    if (!pl) { toast('Kaydedilecek yerleşmiş ders yok; önce dağıtım yapın.'); return null; }
    S.savedPlans = Array.isArray(S.savedPlans) ? S.savedPlans : [];
    const autoName = `${S.school.name || 'Program'} · Dağıtım #${S.savedPlans.length + 1}`;
    const cardPatterns = {};
    for (const c of S.cards || []) cardPatterns[c.id] = c.pattern;
    const entry = {
      id: uid(),
      name: (customName || '').trim() || autoName,
      note: (customNote || '').trim(),
      savedAt: new Date().toISOString(),
      placed: pl,
      total: tot,
      locked: EP.lockedIds(S).length,
      place: JSON.parse(JSON.stringify(S.place || {})),
      cardPatterns
    };
    S.savedPlans.unshift(entry);
    const maxPlans = (bridge && typeof bridge.saveSavedPlan === 'function') ? 100 : 30;
    if (S.savedPlans.length > maxPlans) S.savedPlans = S.savedPlans.slice(0, maxPlans);
    if (bridge && typeof bridge.saveSavedPlan === 'function') {
      try { bridge.saveSavedPlan(S.id || 'default', entry).catch(() => {}); } catch (_) {}
    }
    return entry;
  }

  function openComparePlansModal() {
    const plans = Array.isArray(S.savedPlans) ? S.savedPlans : [];
    if (!plans.length) { toast('Karşılaştırmak için önce en az 1 dağıtım kaydedin.'); return; }
    const curPlan = {
      id: '__current__',
      name: 'Mevcut Aktif Program',
      savedAt: S.updatedAt || new Date().toISOString(),
      place: S.place || {},
      cardPatterns: Object.fromEntries((S.cards || []).map(c => [c.id, c.pattern]))
    };
    const allOpts = [curPlan, ...plans];
    let selA = plans.length >= 2 ? plans[0].id : '__current__';
    let selB = plans.length >= 2 ? plans[1].id : plans[0].id;

    const M = $('#modalRoot');
    const draw = () => {
      const pA = allOpts.find(x => x.id === selA) || allOpts[0];
      const pB = allOpts.find(x => x.id === selB) || allOpts[allOpts.length - 1];
      const cmp = EP.compareSavedPlans(S, pA, pB);
      const A = cmp.a, B = cmp.b;
      const winCell = (av, bv, higherBetter) => {
        if (av === bv) return ['', ''];
        const aWin = higherBetter ? av > bv : av < bv;
        return [
          aWin ? ' style="color:var(--ok);font-weight:700"' : '',
          !aWin ? ' style="color:var(--ok);font-weight:700"' : ''
        ];
      };
      const [cP1, cP2] = winCell(A.placed, B.placed, true);
      const [cG1, cG2] = winCell(A.teacherGaps, B.teacherGaps, false);
      const [cF1, cF2] = winCell(A.teacherFreeDays, B.teacherFreeDays, true);
      const [cS1, cS2] = winCell(A.classSpread, B.classSpread, false);
      const [cQ1, cQ2] = winCell(A.score, B.score, true);

      M.innerHTML = `<div class="modal"><div class="box" style="width:min(720px,100%)">
        <h2>Kayıtlı Dağıtımları Karşılaştır</h2>
        <p class="small muted">İki ders dağıtımını yerleşim oranı, öğretmen ara boşlukları (pencere), boş gün sayısı ve kalite puanı açısından yan yana inceleyin.</p>
        <div class="grid2" style="gap:10px;margin:10px 0">
          <label class="f">1. Dağıtım (A)<select id="cmpSelA">${allOpts.map(x => `<option value="${esc(x.id)}" ${x.id === pA.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
          <label class="f">2. Dağıtım (B)<select id="cmpSelB">${allOpts.map(x => `<option value="${esc(x.id)}" ${x.id === pB.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        </div>
        <div class="scroll"><table class="tbl">
          <thead><tr><th>Ölçüt</th><th class="n">${esc(A.name)}</th><th class="n">${esc(B.name)}</th></tr></thead>
          <tbody>
            <tr><td><b>Yerleşen / Toplam Blok</b></td><td class="n"${cP1}>${A.placed} / ${A.total}</td><td class="n"${cP2}>${B.placed} / ${B.total}</td></tr>
            <tr><td><b>Dağıtılamayan Blok</b></td><td class="n">${A.unplaced}</td><td class="n">${B.unplaced}</td></tr>
            <tr><td><b>Kilitli Blok</b></td><td class="n">${A.locked}</td><td class="n">${B.locked}</td></tr>
            <tr><td><b>Öğretmen Ara Boşluğu (Pencere · az = iyi)</b></td><td class="n"${cG1}>${A.teacherGaps} saat</td><td class="n"${cG2}>${B.teacherGaps} saat</td></tr>
            <tr><td><b>Öğretmen Toplam Boş Günü (çok = iyi)</b></td><td class="n"${cF1}>${A.teacherFreeDays} gün</td><td class="n"${cF2}>${B.teacherFreeDays} gün</td></tr>
            <tr><td><b>Sınıf Gün Dağılım Farkı (az = dengeli)</b></td><td class="n"${cS1}>${A.classSpread}</td><td class="n"${cS2}>${B.classSpread}</td></tr>
            <tr><td><b>Genel Kalite Puanı</b></td><td class="n"${cQ1}><b>${A.score} / 100</b>${cmp.winner === 'A' ? ' <span class="pill ok">Önde</span>' : ''}</td><td class="n"${cQ2}><b>${B.score} / 100</b>${cmp.winner === 'B' ? ' <span class="pill ok">Önde</span>' : ''}</td></tr>
          </tbody>
        </table></div>
        <div class="row" style="justify-content:flex-end;margin-top:12px">
          ${pA.id !== '__current__' ? `<button class="btn" id="cmpApplyA">A'yı Uygula</button>` : ''}
          ${pB.id !== '__current__' ? `<button class="btn pri" id="cmpApplyB">B'yi Uygula</button>` : ''}
          <button class="btn ghost" id="cmpClose">Kapat</button>
        </div>
      </div></div>`;
      $('#cmpSelA').addEventListener('change', e => { selA = e.target.value; draw(); });
      $('#cmpSelB').addEventListener('change', e => { selB = e.target.value; draw(); });
      $('#cmpClose').addEventListener('click', () => { M.innerHTML = ''; });
      const applyById = pid => {
        const sp = plans.find(x => x.id === pid);
        if (!sp) return;
        snap();
        if (sp.cardPatterns) for (const c of S.cards || []) if (sp.cardPatterns[c.id]) c.pattern = sp.cardPatterns[c.id];
        S.place = JSON.parse(JSON.stringify(sp.place || {}));
        const { bad } = EP.placedCore(S);
        bad.forEach(b => delete S.place[b]);
        S.last = { status: bad.length ? 'partial' : 'ok', ms: 0, note: `Kayıtlı dağıtım yüklendi: ${sp.name}` };
        M.innerHTML = '';
        commit();
        toast(`"${sp.name}" programa uygulandı.`);
      };
      $('#cmpApplyA')?.addEventListener('click', () => applyById(pA.id));
      $('#cmpApplyB')?.addEventListener('click', () => applyById(pB.id));
    };
    draw();
  }

  function openBulkImportModal(mode) {
    const isT = mode === 'teachers';
    const M = $('#modalRoot');
    let parsed = [];
    const sampleCsv = isT
      ? '\uFEFFAd Soyad;Branş;Görev;Nöbet\nAhmet Yılmaz;Matematik;Öğretmen;Evet\nAyşe Kaya;Türkçe;Öğretmen;Evet\nMehmet Demir;Fen Bilimleri;Müdür Yardımcısı;Hayır\nZeynep Ak;Rehberlik;Rehberlik;Hayır'
      : '\uFEFFŞube;Sınıf Düzeyi;Rehber Öğretmen;Devre\n5/A;5;Ahmet Yılmaz;Tam gün\n5/B;5;Ayşe Kaya;Tam gün\n6/A;6;;Tam gün\n6/B;6;;Tam gün';

    M.innerHTML = `<div class="modal"><div class="box" style="width:min(760px,100%)">
      <h2>${isT ? "Excel / e-Okul'dan Toplu Öğretmen İçe Aktar" : "Excel / e-Okul'dan Toplu Şube İçe Aktar"}</h2>
      <p class="small muted">${isT
        ? 'Excel veya e-Okul listenizden satırları doğrudan kopyalayıp yapıştırın ya da .csv/.txt dosyası yükleyin. Sütun sırası: <b>Ad Soyad · Branş · Görev (isteğe bağlı) · Nöbet (Evet/Hayır)</b>'
        : 'Excel veya e-Okul şube listenizi yapıştırın ya da .csv/.txt yükleyin. Sütun sırası: <b>Şube Adı (ör. 5/A, Hz/A) · Sınıf Düzeyi (isteğe bağlı) · Rehber Öğretmen · Devre</b>'}</p>
      <div class="row" style="gap:8px;margin:8px 0">
        <label class="btn sm" style="cursor:pointer">Dosya Seç (.csv / .txt)<input type="file" id="biFile" accept=".csv,.tsv,.txt,text/csv,text/plain" style="display:none"></label>
        <button class="btn sm ghost" id="biTpl">Örnek Excel/CSV Şablonu İndir</button>
        ${!isT ? `<label class="row small" style="margin-left:auto;gap:6px"><input type="checkbox" id="biApplyTpl" checked> Okul türü zorunlu derslerini ekle ve öğretmen ata</label>` : ''}
      </div>
      <textarea id="biText" rows="6" style="width:100%;font-family:var(--mono);font-size:12px" placeholder="${isT ? 'Ahmet Yılmaz\tMatematik\nAyşe Kaya\tTürkçe' : '5/A\t5\n5/B\t5\n6/A\t6'}"></textarea>
      <div id="biPrev" style="margin-top:10px;max-height:240px;overflow:auto"></div>
      <div class="row" style="justify-content:space-between;margin-top:12px">
        <span class="small muted" id="biCount">Veri yapıştırın veya dosya seçin.</span>
        <div class="row">
          <button class="btn" id="biCancel">Vazgeç</button>
          <button class="btn pri" id="biGo" disabled>İçe Aktar</button>
        </div>
      </div>
    </div></div>`;

    const refresh = () => {
      const txt = ($('#biText') || {}).value || '';
      parsed = isT ? EP.parseBulkTeachers(txt, S) : EP.parseBulkClasses(txt, S);
      const fresh = parsed.filter(r => !r.duplicate);
      const dups = parsed.length - fresh.length;
      const btn = $('#biGo');
      if (btn) {
        btn.disabled = !fresh.length;
        btn.textContent = fresh.length ? `${fresh.length} ${isT ? 'Öğretmeni' : 'Şubeyi'} Ekle` : 'İçe Aktar';
      }
      $('#biCount').textContent = parsed.length
        ? `${fresh.length} yeni kayıt eklenecek${dups ? ` · ${dups} mükerrer kayıt atlanacak` : ''}.`
        : 'Veri yapıştırın veya dosya seçin.';
      if (!parsed.length) { $('#biPrev').innerHTML = ''; return; }
      $('#biPrev').innerHTML = isT
        ? `<table class="tbl"><thead><tr><th>Ad Soyad</th><th>Branş</th><th>Görev</th><th>Nöbet</th><th>Durum</th></tr></thead><tbody>${parsed.map(r => `<tr style="${r.duplicate ? 'opacity:.55' : ''}"><td><b>${esc(r.name)}</b></td><td>${esc(r.branch)}</td><td class="small">${esc((EP.STAFF_ROLES.find(x => x[0] === r.role) || [])[1] || r.role)}</td><td class="small">${r.dutyExempt ? 'Muaf' : 'Tutar'}</td><td>${r.duplicate ? '<span class="tag" style="background:var(--warnBg);color:var(--warn)">Zaten var</span>' : '<span class="tag" style="background:var(--okBg);color:var(--ok)">Yeni</span>'}</td></tr>`).join('')}</tbody></table>`
        : `<table class="tbl"><thead><tr><th>Şube</th><th class="n">Düzey</th><th>Rehber Öğretmen</th><th>Devre</th><th>Durum</th></tr></thead><tbody>${parsed.map(r => `<tr style="${r.duplicate ? 'opacity:.55' : ''}"><td><b>${esc(r.name)}</b></td><td class="n">${esc(EP.gradeLabel(r.grade))}</td><td class="small">${esc(r.rehberName || '—')}</td><td class="small">${r.shift === 'morning' ? 'Sabahçı' : r.shift === 'afternoon' ? 'Öğlenci' : 'Tam gün'}</td><td>${r.duplicate ? '<span class="tag" style="background:var(--warnBg);color:var(--warn)">Zaten var</span>' : '<span class="tag" style="background:var(--okBg);color:var(--ok)">Yeni</span>'}</td></tr>`).join('')}</tbody></table>`;
    };

    $('#biText').addEventListener('input', refresh);
    $('#biFile').addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      $('#biText').value = await f.text();
      refresh();
    });
    $('#biTpl').addEventListener('click', () => {
      downloadBlob(isT ? 'ornek-ogretmen-listesi.csv' : 'ornek-sube-listesi.csv', sampleCsv, 'text/csv;charset=utf-8');
    });
    $('#biCancel').addEventListener('click', () => { M.innerHTML = ''; });
    $('#biGo').addEventListener('click', () => {
      const fresh = parsed.filter(r => !r.duplicate);
      if (!fresh.length) return;
      snap();
      if (isT) {
        let lastId = '';
        for (const r of fresh) {
          const nt = { id: uid(), name: r.name, short: '', branch: r.branch, role: r.role, dutyExempt: r.dutyExempt, dmax: 7, cmax: 4, wmax: 30, av: {}, extra: [], dutyD: '', dutyP: '', kulup: '' };
          S.teachers.push(nt);
          lastId = nt.id;
        }
        if (lastId) S.ui.tsel = lastId;
        M.innerHTML = '';
        commit();
        toast(`${fresh.length} öğretmen başarıyla içe aktarıldı.`);
      } else {
        const applyTpl = Boolean($('#biApplyTpl') && $('#biApplyTpl').checked);
        const made = [];
        for (const r of fresh) {
          const nc = { id: uid(), name: r.name, grade: r.grade, shift: r.shift, studentCount: 28, homeRoomId: '', closed: [], rehber: r.rehberId || '' };
          S.classes.push(nc);
          EP.closeExtra(S, nc);
          if (applyTpl) made.push(...EP.applyTemplate(S, nc, true));
          if (r.rehberId) EP.setRehber(S, nc, r.rehberId);
        }
        if (applyTpl && made.length) {
          if (S.ui.amode !== 'off') EP.assignCards(S, made);
          EP.rehberAuto(S);
        }
        M.innerHTML = '';
        commit();
        toast(`${fresh.length} şube başarıyla içe aktarıldı${applyTpl && made.length ? ` (${made.length} zorunlu ders oluşturuldu)` : ''}.`);
      }
    });
  }

  function checkRehSlot(d, p, clsIds) {
    const P = +S.school.P;
    const cls = clsIds.map(id => S.classes.find(c => c.id === id)).filter(Boolean);
    const o = EP.occ(S);
    const usedTeachers = new Map();
    const valid = [];
    const fail = [];

    for (const c of cls) {
      const cd = rehCard(c);
      if (!cd) {
        fail.push(`${c.name}: Ders Görevlendirmeleri menüsünde rehberlik dersi tanımlı değil.`);
        continue;
      }
      const cardTid = cd.teacherId && S.teachers.some(x => x.id === cd.teacherId) ? cd.teacherId : '';
      const clsTid = c.rehber && S.teachers.some(x => x.id === c.rehber) ? c.rehber : '';
      if (cardTid && clsTid && cardTid !== clsTid) {
        const t1 = S.teachers.find(x => x.id === cardTid), t2 = S.teachers.find(x => x.id === clsTid);
        fail.push(`${c.name}: Ders Görevlendirmeleri (${t1.name}) ile Sınıflar ve Şubeler (${t2.name}) rehber öğretmeni uyuşmuyor; önce eşitleyin.`);
        continue;
      }
      if (!cardTid) {
        if (clsTid) {
          const t2 = S.teachers.find(x => x.id === clsTid);
          fail.push(`${c.name}: Sınıflar menüsünde rehber öğretmen (${t2.name}) seçili ancak Ders Görevlendirmeleri'ndeki rehberlik dersine atanmamış.`);
        } else {
          fail.push(`${c.name}: Rehber öğretmen atanmamış. Önce Sınıflar ve Şubeler / Ders Görevlendirmeleri menüsünden atayın.`);
        }
        continue;
      }
      const t = S.teachers.find(x => x.id === cardTid);
      if (usedTeachers.has(t.id)) {
        fail.push(`${c.name} (${t.name}): Aynı öğretmen aynı saatte iki sınıfta (${usedTeachers.get(t.id)} ve ${c.name}) rehberlik dersine giremez.`);
        continue;
      }
      const len = EP.parsePat(cd.pattern, cd.hours)[0] || 1;
      if (p + len > P) {
        fail.push(`${c.name} (${t.name}): ${p + 1}. ders saatine ${len} saatlik blok sığmıyor.`);
        continue;
      }

      let slotErr = '';
      for (let k = 0; k < len; k++) {
        const kk = d + '-' + (p + k);
        if ((c.closed || []).includes(kk)) {
          slotErr = `${c.name}: ${GUN[d]} ${p + k + 1}. ders saati sınıfa kapalı.`;
          break;
        }
        if ((t.av || {})[kk] === 1) {
          slotErr = `${c.name} (${t.name}): Öğretmen ${GUN[d]} ${p + k + 1}. ders saatinde kapalı / müsait değil.`;
          break;
        }
        const ownBlockId = cd.id + ':0';
        for (const cell of [(o.cG[c.id] || {})[kk], (o.tG[t.id] || {})[kk]]) {
          if (!cell || cell.id === ownBlockId) continue;
          if (cell.lock) {
            slotErr = `${c.name} (${t.name}): ${GUN[d]} ${p + k + 1}. ders saatinde kilitli ders çakışması var (${cName(cell.card.classId)} ${SS(cell.card.subj)}).`;
            break;
          }
        }
        if (slotErr) break;
      }
      if (slotErr) {
        fail.push(slotErr);
        continue;
      }

      usedTeachers.set(t.id, c.name);
      valid.push({ c, cd, t, len });
    }
    return { valid, fail };
  }

  function applyRehSlot(d, p, validList) {
    const res = { ok: [], moved: 0 };
    const mine = new Set(validList.map(v => v.cd.id + ':0'));
    const o = EP.occ(S);
    for (const v of validList) {
      for (let k = 0; k < v.len; k++) {
        const kk = d + '-' + (p + k);
        for (const cell of [(o.cG[v.c.id] || {})[kk], (o.tG[v.t.id] || {})[kk]]) {
          if (!cell || mine.has(cell.id) || cell.lock) continue;
          if (S.place[cell.id]) { delete S.place[cell.id]; res.moved++; }
        }
      }
    }
    for (const v of validList) {
      for (const k in S.place) if (k.split(':')[0] === v.cd.id) delete S.place[k];
      S.place[v.cd.id + ':0'] = { d, p, lock: true };
      res.ok.push(v.c);
    }
    const { bad } = EP.placedCore(S);
    for (const b of bad) { delete S.place[b]; res.moved++; }
    return res;
  }

  function showRehWarningModal(title, items, okLabel) {
    return new Promise(res => {
      const M = $('#modalRoot');
      M.innerHTML = `<div class="modal"><div class="box" style="width:min(580px,100%)">
        <h2>${esc(title)}</h2>
        <p class="small muted">Sınıflar ve Şubeler ile Ders Görevlendirmeleri menülerindeki rehber öğretmen atamalarınız <b>kesinlikle değiştirilmez</b>. Aşağıdaki koşullar sağlanmadı:</p>
        <ul style="margin:8px 0 12px 18px;line-height:1.55">${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="row" style="justify-content:flex-end">
          <button class="btn" id="mRehNo">${okLabel ? 'Vazgeç' : 'Tamam'}</button>
          ${okLabel ? `<button class="btn pri" id="mRehOk">${esc(okLabel)}</button>` : ''}
        </div>
      </div></div>`;
      $('#mRehNo').addEventListener('click', () => { M.innerHTML = ''; res(false); });
      if (okLabel) $('#mRehOk').addEventListener('click', () => { M.innerHTML = ''; res(true); });
    });
  }

  function placeHere(cardId) {
    const P = +S.school.P, x = pop.key.split('-').map(Number), s0 = x[0] * P + x[1], { m, c } = EP.placedCore(S);
    let why = '';
    const ids = m.bid.map((id, i) => [id, i]).filter(([id, i]) => id.split(':')[0] === cardId && c.pos[i] < 0).sort((a, b) => m.blocks[b[1]].len - m.blocks[a[1]].len);
    for (const [id, i] of ids) {
      if (m.blocks[i].t < 0) { why = 'öğretmen atanmadı'; continue; }
      if (c.valid(i, s0)) { S.place[id] = { d: x[0], p: x[1], lock: false }; return { ok: true, len: m.blocks[i].len }; }
      why = why || EP.whyAt(S, m, c, i, s0);
    }
    return { ok: false, why };
  }

  function moveTo(id, key, targetId, ent) {
    const P = +S.school.P, x = key.split('-').map(Number), s = x[0] * P + x[1], ed = EP.editInfoFor(S, id);
    if (!ed) return false;
    const b = ed.m.blocks[ed.i];
    if (!(ent === S.classes[b.c].id || (b.t >= 0 && ent === S.teachers[b.t].id))) return false;
    if (targetId && ed.sw.has(targetId)) {
      const a = S.place[id], ts = ed.sw.get(targetId);
      snap(); S.place[targetId] = { d: a.d, p: a.p, lock: !!(S.place[targetId] || {}).lock };
      S.place[id] = { d: (ts / P) | 0, p: ts % P, lock: !!a.lock };
      return true;
    }
    if (!targetId && ed.tg.has(s)) { snap(); S.place[id] = { d: x[0], p: x[1], lock: !!(S.place[id] || {}).lock }; return true; }
    return false;
  }

  function cycleMx(kind, id, keys, force) {
    const o = kind === 'cls' ? S.classes.find(c => c.id === id) : kind === 'room' ? (S.rooms || []).find(r => r.id === id) : S.teachers.find(t => t.id === id);
    if (!o) return;
    if (kind === 'cls' || kind === 'room') {
      const set = new Set(o.closed || []), all = keys.every(k => set.has(k));
      keys.forEach(k => { if (force === 'row' || force === 'day') { all ? set.delete(k) : set.add(k); } else set.has(k) ? set.delete(k) : set.add(k); });
      o.closed = [...set];
    } else {
      o.av = o.av || {};
      if (force) { const all = keys.every(k => o.av[k] === 1); keys.forEach(k => { if (all) delete o.av[k]; else o.av[k] = 1; }); }
      else keys.forEach(k => { const v = ((o.av[k] || 0) + 1) % 3; if (v) o.av[k] = v; else delete o.av[k]; });
    }
  }

  function setPath(path, val) { const k = path.split('.'); let o = S; for (let i = 0; i < k.length - 1; i++) o = o[k[i]]; o[k.at(-1)] = val; }
  function go(s) {
    closePop();
    if (s === 'rooms') { S.ui.stab = 'rooms'; s = 'school'; }
    step = s;
    try { history.replaceState(null, '', '#' + s); } catch (_) { location.hash = s; }
    sel = '';
    render();
    window.scrollTo(0, 0);
  }

  /* =========================================================================
   * ANA RENDER DÖNGÜSÜ
   * ========================================================================= */
  function statPill() {
    const p = $('#topStatus'), o = EP.occ(S), tot = o.m.blocks.length, un = o.un.length;
    if (running) { p.className = 'pill warn'; p.textContent = running === 'improve' ? 'İyileştiriliyor…' : running === 'relax' ? 'Öneri aranıyor…' : 'Dağıtılıyor…'; return; }
    if (pc.some(x => x.lvl === 'err')) { p.className = 'pill err'; p.textContent = 'Çakışma var'; return; }
    if (tot && !un) { p.className = 'pill ok'; p.textContent = 'Program tam: ' + tot + '/' + tot + ' blok'; return; }
    p.className = 'pill'; p.textContent = tot ? `${tot - un}/${tot} blok yerleşik` : 'Veri bekleniyor';
  }

  function render() {
    syncSubj();
    pc = EP.precheck(S);
    applyTheme(S.ui.theme || 'auto');
    applySideCollapsed();

    const menuGroups = { 0: 'Kurulum', 7: 'Program & Analiz', 10: 'Yönetim & Çıktı', 12: 'Sistem' };
    $('#sideMenu').innerHTML = EP.MENUS.map((m, i) => (menuGroups[i] ? `<div class="menu-grp">${menuGroups[i]}</div>` : '') + `<a href="#${m[0]}" class="${step === m[0] ? 'on' : ''}" data-step="${m[0]}"><i>${i + 1}</i><span>${m[1]}</span>${m[0] === 'auto_schedule' && pc.some(x => x.lvl === 'err') ? '<b class="dot" title="Çakışma var"></b>' : ''}</a>`).join('');
    $('#topSchoolName').textContent = S.school.name + ' · ' + S.school.year + (S.school.donem && S.school.donem !== 'Yıllık' ? ' · ' + S.school.donem : '');
    const rtEl = $('#topRuntime');
    rtEl.textContent = isMember() ? ('Üye: ' + (authUser.displayName || authUser.username)) : (bridge ? 'Masaüstü' : webApi ? 'Web' : 'Çevrimdışı');
    rtEl.className = 'pill ' + (isMember() ? 'ok' : bridge ? 'ok' : webApi ? 'warn' : '');
    $('#bUndo').disabled = !undo.length;
    $('#bRedo').disabled = !redo.length;
    statPill();

    document.querySelectorAll('#mobNav button').forEach(b => b.classList.toggle('on', b.dataset.nav === step));

    const views = {
      dashboard: vDashboard, school: vOkul, teachers: vOgretmen, classes: vSinif,
      subjects: vHavuz, rooms: () => { S.ui.stab = 'rooms'; return vOkul(); }, assignments: vDersler, constraints: vKural,
      auto_schedule: vDagitim, timetables: vTimetables, analytics: vAnalytics, duty: vDuty,
      reports: () => EP.vRapor(S, H, isMember()), backup_sync: vProje, account: vAccount,
      system: vSystem, help: vHelp
    };
    const prevScrolls = [...document.querySelectorAll('#view .scroll')].map(el => [el.scrollLeft, el.scrollTop]);
    $('#view').innerHTML = (views[step] || vDagitim)();
    const nextScrolls = document.querySelectorAll('#view .scroll');
    prevScrolls.forEach(([sl, st], idx) => {
      if (nextScrolls[idx]) { nextScrolls[idx].scrollLeft = sl; nextScrolls[idx].scrollTop = st; }
    });
    renderUpdateBanner();
    renderPop();
  }

  /* =========================================================================
   * OLAY YÖNETİCİLERİ (100% Delegated — Zero Inline JS)
   * ========================================================================= */
  document.addEventListener('click', async e => {
    const mob = e.target.closest('#mobNav button[data-nav]');
    if (mob) { go(mob.dataset.nav); return; }
    const st = e.target.closest('[data-step]');
    if (st) { e.preventDefault(); go(st.dataset.step); return; }
    if (pop && !e.target.closest('#pop') && !e.target.closest('td.cell,.sh td[data-act]')) closePop();

    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.tagName === 'A') e.preventDefault();
    const act = a.dataset.act, id = a.dataset.id;

    switch (act) {
      case 'toggleSide':
        S.ui.sideCollapsed = !S.ui.sideCollapsed;
        save();
        applySideCollapsed();
        break;
      case 'toggleTheme': {
        const cur = S.ui.theme || 'auto';
        const isDark = cur === 'dark' || (cur !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        S.ui.theme = isDark ? 'light' : 'dark';
        save();
        applyTheme(S.ui.theme);
        toast(S.ui.theme === 'dark' ? 'Koyu tema açıldı.' : 'Açık tema açıldı.');
      } break;
      case 'dtool':
        S.ui.dtool = S.ui.dtool === a.dataset.v ? '' : a.dataset.v;
        save();
        render();
        break;
      case 'undo': if (undo.length) { redo.push(JSON.stringify(S)); S = JSON.parse(undo.pop()); sel = ''; commit(); } break;
      case 'redo': if (redo.length) { undo.push(JSON.stringify(S)); S = JSON.parse(redo.pop()); sel = ''; commit(); } break;
      case 'saveJson': downloadBlob(fileName('json'), projJson(), 'application/json'); break;
      case 'copyJson': showText('Proje JSON', projJson()); break;
      case 'solve': runSolve('full'); break;
      case 'fill': runSolve('fill'); break;
      case 'improve': runImprove(); break;
      case 'relax': runRelax(); break;
      case 'goDutyTab': go('duty'); break;
      case 'unTab': S.ui.unTab = a.dataset.v; render(); break;
      case 'dutyTab': S.ui.dutyTab = a.dataset.v; render(); break;
      case 'toggleBulkLock':
        bulkMode = !bulkMode;
        if (!bulkMode) bulkSel.clear();
        closePop(); sel = ''; render();
        break;
      case 'bulkClearSel': bulkSel.clear(); bulkMode = false; render(); break;
      case 'bulkSelectVis': {
        const wantLock = a.dataset.v === 'locked';
        const seen = new Set();
        document.querySelectorAll('td[data-act="cell"][data-id]').forEach(td => {
          const bid = td.dataset.id;
          if (!bid || seen.has(bid) || !S.place[bid]) return;
          seen.add(bid);
          if (Boolean(S.place[bid].lock) === wantLock) bulkSel.add(bid);
        });
        bulkMode = true; render();
      } break;
      case 'bulkLockSel': {
        const lockVal = a.dataset.v === '1';
        const ids = [...bulkSel].filter(bid => Boolean(S.place[bid]));
        if (!ids.length) break;
        snap();
        let n = 0;
        for (const bid of ids) {
          if (Boolean(S.place[bid].lock) !== lockVal) { S.place[bid].lock = lockVal; n++; }
        }
        bulkSel.clear();
        commit();
        toast(`${n} ders ${lockVal ? 'kilitlendi' : 'kilidi açıldı'}.`);
      } break;
      case 'bulkToggleSel': {
        const ids = [...bulkSel].filter(bid => Boolean(S.place[bid]));
        if (!ids.length) break;
        snap();
        let lk = 0, ul = 0;
        for (const bid of ids) {
          S.place[bid].lock = !S.place[bid].lock;
          if (S.place[bid].lock) lk++; else ul++;
        }
        bulkSel.clear();
        commit();
        toast(`Toplu işlem tamamlandı: ${lk} ders kilitlendi, ${ul} dersin kilidi açıldı.`);
      } break;
      case 'goTAssign': S.ui.tsel = id; S.ui.dtab = 'ogretmen'; go('assignments'); break;
      case 'swapCardModal': openSwapCardModal(id); break;
      case 'unassignCard': {
        const c = S.cards.find(x => x.id === id); if (!c) break;
        snap(); c.teacherId = ''; EP.dropPlace(S, c.id); commit();
        toast(`${cName(c.classId)} ${SN(c.subj)} öğretmenden çıkarıldı (boştaki derslere alındı).`);
      } break;
      case 'claimCard':
      case 'takeOverCard': {
        const c = S.cards.find(x => x.id === id), t = S.teachers.find(x => x.id === a.dataset.t);
        if (!c || !t) break;
        snap(); c.teacherId = t.id;
        if (SB(c.subj) === EP.REHB) { const cl = S.classes.find(x => x.id === c.classId); if (cl) cl.rehber = t.id; }
        const { bad } = EP.placedCore(S);
        bad.filter(b => b.split(':')[0] === c.id).forEach(b => delete S.place[b]);
        const v = EP.tcViolation(S, t, c);
        commit();
        toast(`${cName(c.classId)} ${SN(c.subj)} → ${t.name} üzerine alındı.` + (v ? ` Uyarı: sınıf sınırı aşıldı (${v.h}/${v.r.max}).` : ''));
      } break;
      case 'tQuickAdd': {
        const t = S.teachers.find(x => x.id === id);
        const cid = ($('#tqaC_' + id) || {}).value, sj = ($('#tqaS_' + id) || {}).value;
        const h = Math.max(1, Math.min(12, +($('#tqaH_' + id) || {}).value || 2));
        const kind = ($('#tqaK_' + id) || {}).value || 'zorunlu';
        if (!t || !cid || !sj) { toast('Sınıf ve ders seçin.'); break; }
        if (EP.findClassSubjCard(S, cid, sj)) {
          toast(`${cName(cid)} sınıfına ${SN(sj)} dersi zaten atanmış! Aynı sınıfa aynı ders ikinci kez atanamaz.`);
          break;
        }
        snap();
        const nc = EP.newCard(S, cid, sj, h, kind);
        if (!nc) { toast('Bu sınıfa bu ders zaten atanmış.'); break; }
        nc.teacherId = t.id;
        commit();
        toast(`${cName(cid)} ${SN(sj)} (${h} sa) oluşturuldu ve ${t.name} üzerine atandı.`);
      } break;
      case 'delCardConfirm': {
        const c = S.cards.find(x => x.id === id); if (!c) break;
        if (await ask(`${cName(c.classId)} ${SN(c.subj)} (${c.hours} sa) dersi sınıftan tamamen silinecek.`, 'Sil')) {
          snap(); S.cards = S.cards.filter(x => x.id !== id); EP.dropPlace(S, id); commit(); toast('Ders silindi.');
        }
      } break;
      case 'stop':
        nativeStopMode = 'stop';
        if (bridge && typeof bridge.cancelSolve === 'function') bridge.cancelSolve().catch(() => {});
        if (wk) { wk.terminate(); wk = null; }
        running = null; runCtx = null; if (relax && relax.run) relax = null;
        toast('Durduruldu; önceki program korundu.'); render();
        break;
      case 'verify': {
        const { bad } = EP.placedCore(S), o = EP.occ(S);
        if (bad.length) { snap(); bad.forEach(b => delete S.place[b]); commit(); toast(`${bad.length} geçersiz yerleşim boşa alındı.`); }
        else toast(o.un.length ? `Program geçerli; ${o.un.length} blok henüz yerleşmemiş.` : 'Program geçerli: çakışma yok, tüm dersler yerleşik.');
      } break;
      case 'view': S.ui.view = a.dataset.v; sel = ''; save(); render(); break;
      case 'cell': {
        if (running) break;
        const key = a.dataset.key, tid = a.dataset.id || '', ent = a.dataset.ent, kind = a.dataset.kind;
        if (Date.now() - suppressNextCellClickAt < 250) break;
        if (tid && (bulkMode || e.ctrlKey || e.metaKey)) {
          if (cellClickTimer) { clearTimeout(cellClickTimer); cellClickTimer = null; }
          if (bulkSel.has(tid)) bulkSel.delete(tid); else bulkSel.add(tid);
          lastCellClick = null; sel = ''; closePop(); render();
          break;
        }
        const now = Date.now();
        if (tid && S.place[tid] && (e.detail >= 2 || (lastCellClick && lastCellClick.id === tid && lastCellClick.ent === ent && (now - lastCellClick.at) <= 550))) {
          if (cellClickTimer) { clearTimeout(cellClickTimer); cellClickTimer = null; }
          toggleCellLockQuick(tid);
          break;
        }
        if (sel && tid !== sel && moveTo(sel, key, tid, ent)) {
          if (cellClickTimer) { clearTimeout(cellClickTimer); cellClickTimer = null; }
          lastCellClick = null; sel = ''; closePop(); commit(); toast('Ders taşındı.');
          break;
        }
        if (tid && S.place[tid]) {
          lastCellClick = { id: tid, ent, key, at: now };
          if (cellClickTimer) clearTimeout(cellClickTimer);
          cellClickTimer = setTimeout(() => {
            cellClickTimer = null;
            if (tid === sel && pop && pop.id === tid) { sel = ''; closePop(); render(); }
            else { sel = tid; pop = { key, ent, kind, id: tid }; render(); }
          }, 230);
          break;
        }
        if (!tid && (e.detail >= 2 || (lastCellClick && !lastCellClick.id && lastCellClick.ent === ent && lastCellClick.key === key && (now - lastCellClick.at) <= 550))) {
          if (cellClickTimer) { clearTimeout(cellClickTimer); cellClickTimer = null; }
          toggleEntitySlotQuick(kind, ent, key);
          break;
        }
        lastCellClick = { id: '', ent, key, at: now };
        if (cellClickTimer) clearTimeout(cellClickTimer);
        cellClickTimer = setTimeout(() => {
          cellClickTimer = null;
          sel = ''; pop = { key, ent, kind, id: '' }; render();
        }, 230);
      } break;
      case 'pClose': closePop(); break;
      case 'pmOpen': if (pop) { pop.add = true; pop.id = ''; pop.cls = pop.cls || ''; sel = ''; renderPop(); } break;
      case 'pmPlace': if (pop) {
        const x = pop.key.split('-').map(Number); snap(); S.place[id] = { d: x[0], p: x[1], lock: !!S.ui.pmLock }; sel = ''; closePop(); commit();
        if (!await guardLock([id], S.ui.pmLock ? 'Yine de kilitle' : 'Yine de yerleştir')) break;
        toast(S.ui.pmLock ? 'Blok yerleştirildi ve kilitlendi.' : 'Blok yerleştirildi.');
      } break;
      case 'pmOpenT': if (pop) {
        const x = pop.key.split('-').map(Number), cd = S.cards.find(z => z.id === id.split(':')[0]), t = cd && S.teachers.find(z => z.id === cd.teacherId);
        if (!t) break;
        const len = EP.parsePat(cd.pattern, cd.hours)[+id.split(':')[1]] || 1;
        snap(); t.av = t.av || {};
        for (let q = 0; q < len; q++) { const kk = x[0] + '-' + (x[1] + q); if (t.av[kk] === 1) delete t.av[kk]; }
        S.place[id] = { d: x[0], p: x[1], lock: !!S.ui.pmLock };
        const { bad } = EP.placedCore(S);
        if (bad.includes(id)) { S = JSON.parse(undo.pop()); closePop(); commit(); toast('Saat açılsa da yerleşmiyor; değişiklik geri alındı.'); break; }
        sel = ''; closePop(); commit();
        if (!await guardLock([id], 'Yine de devam et')) break;
        toast(`${t.name} için saat açıldı ve ders yerleştirildi.`);
      } break;
      case 'pmPat': {
        const cd = S.cards.find(z => z.id === id); if (!cd) break;
        snap(); cd.pattern = a.dataset.p; EP.dropPlace(S, cd.id);
        if (!EP.effCfg(S, cd).own && EP.effCfg(S, cd).mode !== 'auto') { cd.bmode = 'fixed'; cd.bpats = [a.dataset.p]; }
        commit(); toast(`Blok ${a.dataset.p} yapıldı.`);
      } break;
      case 'pmAdd': if (pop) {
        const tch = pop.kind === 't' ? entOf('t', pop.ent) : null, cls = pop.kind === 'c' ? entOf('c', pop.ent) : S.classes.find(c => c.id === pop.cls);
        if (!cls) break;
        const k0 = EP.findSubj(S, a.dataset.n, cls.grade >= 1 && cls.grade <= 4 && EP.SO_SET.has(a.dataset.n));
        if (k0 && EP.findClassSubjCard(S, cls.id, k0)) {
          toast(`${cls.name} sınıfına ${a.dataset.n} dersi zaten atanmış!`);
          break;
        }
        snap(); const k = EP.ensureSubj(S, a.dataset.n, cls.grade), h = +a.dataset.h, kind = a.dataset.kind; syncSubj();
        const nc = EP.newCard(S, cls.id, k, h, kind);
        if (!nc) { toast(`${cls.name} sınıfına ${a.dataset.n} dersi zaten atanmış!`); break; }
        nc.pattern = a.dataset.p;
        if (!EP.effPats(S, nc).includes(nc.pattern)) { nc.bmode = 'fixed'; nc.bpats = [nc.pattern]; }
        if (tch) nc.teacherId = tch.id; else if (S.ui.amode !== 'off') EP.assignCards(S, [nc]);
        const r = placeHere(nc.id);
        if (r.ok && S.ui.pmLock) for (const kk in S.place) if (kk.split(':')[0] === nc.id) S.place[kk].lock = true;
        closePop(); sel = ''; commit();
        if (r.ok && !await guardLock(Object.keys(S.place).filter(kk => kk.split(':')[0] === nc.id), 'Yine de ekle')) break;
        toast(`${cls.name} ${a.dataset.n} eklendi${r.ok ? ' ve yerleştirildi.' : ' (yerleşmeyenlere alındı).'}`);
      } break;
      case 'pLock': if (pop && S.place[pop.id]) { snap(); const pid = pop.id; S.place[pid].lock = !S.place[pid].lock; const on = S.place[pid].lock; commit(); if (on) await guardLock([pid], 'Yine de kilitle'); } break;
      case 'pUnplace': if (pop && S.place[pop.id]) { snap(); delete S.place[pop.id]; sel = ''; closePop(); commit(); toast('Ders programdan çıkarıldı.'); } break;
      case 'pDelCard': if (pop && pop.id) {
        const cid = pop.id.split(':')[0], cd = EP.cardMap(S).get(cid);
        if (await ask(`${cName(cd.classId)} ${SN(cd.subj)} dersi tamamen silinecek.`, 'Sil')) { snap(); S.cards = S.cards.filter(c => c.id !== cid); EP.dropPlace(S, cid); sel = ''; closePop(); commit(); }
      } break;
      case 'pSlot': if (pop) {
        const e2 = entOf(pop.kind, pop.ent); snap();
        if (pop.kind === 'c' || pop.kind === 'r') { const set = new Set(e2.closed || []); set.has(pop.key) ? set.delete(pop.key) : set.add(pop.key); e2.closed = [...set]; }
        else { e2.av = e2.av || {}; if (e2.av[pop.key] === 1) delete e2.av[pop.key]; else e2.av[pop.key] = 1; }
        commit();
      } break;
      case 'pDay': if (pop) {
        const e2 = entOf(pop.kind, pop.ent), d0 = +pop.key.split('-')[0], P = +S.school.P, keys = Array.from({ length: P }, (_, p) => d0 + '-' + p);
        const allC = keys.every(k => slotClosed(pop.kind, e2, k)), o2 = EP.occ(S), G = (pop.kind === 'c' ? o2.cG : pop.kind === 't' ? o2.tG : o2.rG)[e2.id] || {};
        const ids = [...new Set(keys.map(k => G[k] && G[k].id).filter(Boolean))];
        if (!allC && ids.length && !await ask(`${e2.name} için ${GUN[d0]} kapatılacak; ${ids.length} ders programdan çıkarılacak.`, 'Günü kapat')) break;
        snap();
        if (pop.kind === 'c' || pop.kind === 'r') { const set = new Set(e2.closed || []); keys.forEach(k => allC ? set.delete(k) : set.add(k)); e2.closed = [...set]; }
        else { e2.av = e2.av || {}; keys.forEach(k => { if (allC) delete e2.av[k]; else e2.av[k] = 1; }); }
        if (!allC) ids.forEach(x => delete S.place[x]);
        commit(); toast(allC ? GUN[d0] + ' açıldı.' : GUN[d0] + ' kapatıldı.');
      } break;
      case 'pPlace': if (pop) { const x = pop.key.split('-').map(Number); snap(); S.place[id] = { d: x[0], p: x[1], lock: false }; sel = ''; closePop(); commit(); await guardLock([id], 'Yine de yerleştir'); } break;
      case 'maxFinish':
        if (running === 'native') {
          nativeStopMode = 'maxFinish';
          let bestFromCancel = null;
          if (bridge && typeof bridge.cancelSolve === 'function') {
            try { bestFromCancel = await bridge.cancelSolve(); } catch (_) {}
          }
          const pl = (bestFromCancel && bestFromCancel.placements && Object.keys(bestFromCancel.placements).length > 0)
            ? bestFromCancel.placements
            : live.bestPlacements;
          applyMaxFinishPartial(pl, live.ms);
        } else if (runCtx && runCtx.best) {
          const b = runCtx.best, tot = runCtx.m.blocks.length;
          applyBrowserResult(runCtx.m, b.pos, runCtx.lockOf, { status: b.n >= tot ? 'ok' : 'partial', ms: live.ms, nodes: live.nodes, restarts: live.restarts, note: `Maksimumda bitirildi: ${b.n}/${tot}` }, b.bid, b.choice);
          hist('Maksimumda bitirildi'); toast(`Maksimumda bitirildi: ${b.n}/${tot} blok şablona işlendi.`);
        } else if (running) {
          if (wk) { wk.terminate(); wk = null; }
          applyMaxFinishPartial(null, live.ms);
        } else {
          toast('Şu an çalışan bir dağıtım yok.');
        }
        break;
      case 'clearPlan': {
        const n = Object.keys(S.place).length, lk = EP.lockedIds(S).length;
        const v = await askChoice('Dağıtımı temizle', `${n} yerleşik blok var${lk ? `, ${lk} tanesi kilitli` : ''}.`, [{ label: 'Vazgeç', v: null }, ...(lk ? [{ label: 'Kilitliler kalsın', v: 'keep' }] : []), { label: 'Hepsini temizle', v: 'all', pri: true }]);
        if (!v) break;
        snap(); if (v === 'keep') { for (const k in S.place) if (!S.place[k].lock) delete S.place[k]; } else S.place = {};
        S.last = null; sel = ''; closePop(); hist('Dağıtım temizlendi'); commit(); toast('Dağıtım temizlendi.');
      } break;
      case 'rehSlot': {
        const d = +$('#rsD').value, p2 = +$('#rsP').value, ids = [...document.querySelectorAll('.rsC:checked')].map(x => x.value);
        if (!ids.length) { toast('En az bir sınıf seçin.'); break; }
        const chk = checkRehSlot(d, p2, ids);
        if (chk.fail.length) {
          if (!chk.valid.length) {
            await showRehWarningModal('Ortak rehberlik saati yerleştirilemedi', chk.fail, null);
            break;
          }
          const okGo = await showRehWarningModal(
            `Bazı sınıflar ${GUN[d]} ${p2 + 1}. derse yerleştirilemiyor`,
            chk.fail,
            `Yalnızca uygun ${chk.valid.length} sınıfı yerleştir ve kilitle`
          );
          if (!okGo) break;
        }
        snap();
        S.rehSlot = { d, p: p2, cls: ids };
        const r = applyRehSlot(d, p2, chk.valid);
        sel = ''; closePop(); commit();
        toast(`${r.ok.length} sınıfın rehberlik dersi mevcut rehber öğretmenleriyle ${GUN[d]} ${p2 + 1}. saate kilitlendi.`);
      } break;
      case 'rehAuto': { snap(); const n = EP.rehberAuto(S); const { bad } = EP.placedCore(S); bad.forEach(b => delete S.place[b]); commit(); toast(`${n} şubenin rehber öğretmeni güncellendi.`); } break;
      case 'pick': sel = sel === id ? '' : id; closePop(); render(); break;
      case 'desel': sel = ''; render(); break;
      case 'lock': if (S.place[sel]) { snap(); const pid = sel; S.place[pid].lock = !S.place[pid].lock; const on = S.place[pid].lock; commit(); if (on) await guardLock([pid], 'Yine de kilitle'); } break;
      case 'unplace': if (S.place[sel]) { snap(); delete S.place[sel]; commit(); } break;
      case 'unlockAll': snap(); for (const k in S.place) S.place[k].lock = false; commit(); toast('Tüm kilitler açıldı.'); break;
      case 'lockByT': case 'lockByC': case 'lockByD': {
        const lockVal = a.dataset.v === '1', cm = EP.cardMap(S); let n = 0;
        const target = act === 'lockByT' ? $('#lkT').value : act === 'lockByC' ? $('#lkC').value : $('#lkD').value;
        if (target === '') { toast('Önce seçim yapın.'); break; }
        snap();
        for (const [k, pl] of Object.entries(S.place)) {
          const cd = cm.get(k.split(':')[0]); if (!cd) continue;
          const match = (act === 'lockByT' && cd.teacherId === target) || (act === 'lockByC' && cd.classId === target) || (act === 'lockByD' && pl.d === +target);
          if (match) { pl.lock = lockVal; n++; }
        }
        commit(); toast(`${n} blok ${lockVal ? 'kilitlendi' : 'kilidi açıldı'}.`);
      } break;
      case 'applySol': {
        const s0 = (S.solutions || [])[+a.dataset.i];
        if (!s0 || !s0.placements) break;
        snap(); const cnt = EP.applyV3SolutionToState(S, s0, false);
        S.last = { status: s0.isHardValid ? 'ok' : 'partial', ms: s0.elapsedMs, engineName: s0.engineName, note: `${s0.engineName} çözümü uygulandı (${s0.qualityScore}/100)` };
        commit(); toast(`${s0.engineName} çözümü (${cnt} blok) programa uygulandı.`);
      } break;
      case 'goFix': if (a.dataset.go === 'teachers' && a.dataset.id) S.ui.tsel = a.dataset.id; if (a.dataset.go === 'classes' && a.dataset.id) S.ui.openCls = a.dataset.id; go(a.dataset.go); break;
      case 'goCls': S.ui.csel = id; S.ui.dtab = 'sinif'; go('assignments'); break;
      case 'bulkCls': S.ui.bulk = !S.ui.bulk; render(); break;
      case 'bulkGo': {
        snap(); const T = EP.typeOf(S), G = T ? T.grades : [5, 6, 7, 8], ex = new Set(S.classes.map(c => c.name)), made = [];
        for (const g of G) {
          const n = +($('#bg' + g) || {}).value || 0; let k = 0, mg = 0;
          while (mg < n && k < 26) {
            const nm = (g === 0 ? 'Hz/' : g + '/') + String.fromCharCode(65 + k++); if (ex.has(nm)) continue;
            const c = { id: uid(), name: nm, grade: g, shift: 'full', studentCount: 28, homeRoomId: '', closed: [] };
            S.classes.push(c); EP.closeExtra(S, c); made.push(...(T ? EP.applyTemplate(S, c, false) : [])); mg++;
          }
        }
        syncSubj(); const r = S.ui.amode === 'off' ? null : EP.assignCards(S, made); S.ui.bulk = false; commit();
        toast('Şubeler ve zorunlu dersler oluşturuldu. ' + (r ? assignMsg(r) : ''));
      } break;
      case 'addCls': { const T = EP.typeOf(S), g0 = T && T.grades.length ? T.grades[0] : 5; snap(); S.classes.push({ id: uid(), name: 'Yeni şube', grade: g0, shift: 'full', studentCount: 28, homeRoomId: '', closed: [] }); commit(); } break;
      case 'tplMissing': {
        const c = S.classes.find(x => x.id === id);
        if (!EP.typeOf(S) || EP.gIdx(EP.typeOf(S), c.grade) < 0) { toast('Bu sınıf düzeyi için çizelge yok.'); break; }
        snap(); const made = EP.applyTemplate(S, c, true); syncSubj();
        const r = S.ui.amode === 'off' ? null : EP.assignCards(S, made); commit();
        toast(made.length ? made.length + ' zorunlu ders eklendi. ' + (r ? assignMsg(r) : '') : 'Eksik zorunlu ders yok.');
      } break;
      case 'delCls': if (await ask('Şube ve tüm ders kartları silinecek.', 'Sil')) { snap(); S.classes = S.classes.filter(c => c.id !== id); S.cards = S.cards.filter(c => c.classId !== id); commit(); } break;
      case 'clsSlots': S.ui.openCls = S.ui.openCls === id ? '' : id; render(); break;
      case 'roomSlots': S.ui.openRoom = S.ui.openRoom === id ? '' : id; render(); break;
      case 'addBld': snap(); S.buildings.push({ id: uid(), name: 'Ek Bina ' + (S.buildings.length + 1), code: 'B' + (S.buildings.length + 1), transitionPeriods: {} }); commit(); break;
      case 'delBld': if (S.buildings.length > 1) { snap(); S.buildings = S.buildings.filter(b => b.id !== id); commit(); } break;
      case 'addRoom': snap(); S.rooms.push({ id: uid(), name: 'Derslik ' + (101 + S.rooms.length), type: 'classroom', buildingId: (S.buildings[0] || {}).id || '', capacity: 32, closed: [] }); commit(); break;
      case 'delRoom': snap(); S.rooms = S.rooms.filter(r => r.id !== id); commit(); break;
      case 'mx': case 'mxDay': case 'mxRow': {
        snap(); const kd = a.dataset.kind;
        const keys = act === 'mx' ? [a.dataset.d + '-' + a.dataset.p] : act === 'mxDay' ? Array.from({ length: +S.school.P }, (_, p) => a.dataset.d + '-' + p) : Array.from({ length: +S.school.D }, (_, d) => d + '-' + a.dataset.p);
        const pre = kd !== 'room' ? new Set(EP.lockedInClosed(S, kd, id).map(x => x.k)) : new Set();
        cycleMx(kd, id, keys, act === 'mx' ? undefined : act === 'mxDay' ? 'day' : 'row');
        const hit = kd !== 'room' ? EP.lockedInClosed(S, kd, id).filter(x => !pre.has(x.k)) : [];
        if (hit.length) {
          commit();
          const goOk = await warnAsk('Kapattığınız saatte kilitli ders var', hit.map(x => x.txt + ' kilitli'), 'Yine de kapat ve dersi çıkar');
          if (!goOk) { S = JSON.parse(undo.pop()); commit(); toast('Vazgeçildi.'); break; }
          hit.forEach(x => delete S.place[x.k]); commit(); toast(hit.length + ' kilitli ders çıkarıldı.'); break;
        }
        commit();
      } break;
      case 'tsel': S.ui.tsel = id; render(); break;
      case 'addT': snap(); { const t = { id: uid(), name: 'Yeni Öğretmen', short: '', branch: BRANS[0], dmin: 0, dmax: +S.school.P, cmax: 0, wmax: 30, av: {}, extra: [], dutyD: '', dutyP: '', kulup: '' }; S.teachers.push(t); S.ui.tsel = t.id; commit(); } break;
      case 'bulkT': {
        snap(); let n = 0; const hrs = {}, cls = {};
        for (const c of S.cards) { const br = SB(c.subj); if (!br || br === EP.REHB) continue; hrs[br] = (hrs[br] || 0) + (+c.hours || 0); (cls[br] = cls[br] || new Set()).add(c.classId); }
        for (const br in hrs) {
          const have = S.teachers.filter(t => t.branch === br).length;
          const need = br === 'Sınıf Öğretmenliği' ? cls[br].size : Math.ceil(hrs[br] / 27);
          for (let k = have; k < need; k++) { S.teachers.push({ id: uid(), name: (br === 'Sınıf Öğretmenliği' ? 'Sınıf' : br) + ' Öğretmeni ' + (k + 1), short: '', branch: br, dmin: 0, dmax: +S.school.P, cmax: 0, wmax: 30, av: {}, extra: [] }); n++; }
        }
        commit(); toast(n ? n + ' öğretmen eklendi.' : 'Her branşta yeterli öğretmen var.');
      } break;
      case 'delT': if (await ask('Öğretmen silinecek; dersleri öğretmensiz kalacak.', 'Sil')) { snap(); S.teachers = S.teachers.filter(t => t.id !== id); S.cards.forEach(c => { if (c.teacherId === id) c.teacherId = ''; }); commit(); } break;
      case 'autoAssign': { snap(); const r = EP.assignCards(S, S.cards, S.ui.amode === 'off' ? 'brans_ek' : S.ui.amode); commit(); toast(assignMsg(r)); } break;
      case 'stab': S.ui.stab = a.dataset.v; render(); break;
      case 'dtab': S.ui.dtab = a.dataset.v; render(); break;
      case 'htab': S.ui.htab = a.dataset.v; render(); break;
      case 'rtab': S.ui.rtab = a.dataset.v; render(); break;
      case 'csel': S.ui.csel = id; render(); break;
      case 'applyP': { const T = EP.typeOf(S); if (T) { snap(); S.school.P = T.P; commit(); } } break;
      case 'zorOneAdd': {
        const c = S.classes.find(x => x.id === id); if (!c) break;
        const h = Math.max(1, +a.dataset.h || 2), k = EP.ensureSubj(S, a.dataset.n, c.grade); syncSubj();
        if (EP.findClassSubjCard(S, id, k)) {
          toast(`${c.name} sınıfına ${a.dataset.n} dersi zaten ekli!`);
          break;
        }
        snap();
        const nc = EP.newCard(S, id, k, h, 'zorunlu');
        if (nc && S.ui.amode !== 'off') EP.assignCards(S, [nc]);
        commit();
        toast(`${c.name} için ${a.dataset.n} (${h} sa) zorunlu ders olarak eklendi.`);
      } break;
      case 'secAdd': {
        const c = S.classes.find(x => x.id === id), h = +a.dataset.h, k = EP.ensureSubj(S, a.dataset.n, c.grade); syncSubj();
        const cur = EP.findClassSubjCard(S, id, k);
        if (cur && cur.kind !== 'secmeli') {
          toast(`${c.name} sınıfında ${a.dataset.n} zaten zorunlu/ek ders olarak atanmış! Aynı sınıfa aynı ders iki kez atanamaz.`);
          break;
        }
        snap();
        if (cur) { cur.hours = h; cur.pattern = EP.patFor(h); commit(); break; }
        const nc = EP.newCard(S, id, k, h, 'secmeli'); if (nc && S.ui.amode !== 'off') EP.assignCards(S, [nc]); commit();
        toast(`${a.dataset.n} eklendi (${h} sa).`);
      } break;
      case 'copySec': {
        const c = S.classes.find(x => x.id === id), src = S.cards.filter(x => x.classId === id && x.kind === 'secmeli'), others = S.classes.filter(x => x.grade === c.grade && x.id !== id);
        if (!others.length) { toast('Bu düzeyde başka şube yok.'); break; }
        if (!await ask(`${others.map(x => x.name).join(', ')} şubelerinin seçmelileri ${c.name} ile aynı yapılacak.`, 'Kopyala')) break;
        snap(); const gone = new Set(others.map(x => x.id)), del = new Set(S.cards.filter(x => gone.has(x.classId) && x.kind === 'secmeli').map(x => x.id));
        S.cards = S.cards.filter(x => !del.has(x.id)); for (const k in S.place) if (del.has(k.split(':')[0])) delete S.place[k];
        const made = [];
        for (const o of others) for (const x of src) {
          if (EP.findClassSubjCard(S, o.id, x.subj)) continue;
          const nc = EP.newCard(S, o.id, x.subj, x.hours, 'secmeli');
          if (!nc) continue;
          if (x.bmode) { nc.bmode = x.bmode; nc.bpats = (x.bpats || []).slice(); nc.pattern = EP.effPats(S, nc)[0]; }
          made.push(nc);
        }
        const r = S.ui.amode === 'off' ? null : EP.assignCards(S, made); commit();
        toast(others.length + ' şubeye kopyalandı. ' + (r ? assignMsg(r) : ''));
      } break;
      case 'clearSec': if (await ask('Bu şubenin tüm seçmeli dersleri silinecek.', 'Sil')) { snap(); const del = new Set(S.cards.filter(x => x.classId === id && x.kind === 'secmeli').map(x => x.id)); S.cards = S.cards.filter(x => !del.has(x.id)); for (const k in S.place) if (del.has(k.split(':')[0])) delete S.place[k]; commit(); } break;
      case 'ekAdd': {
        const c = S.classes.find(x => x.id === id); if (!c) break;
        let k = $('#ekS').value;
        const h = Math.max(1, Math.min(12, +$('#ekH').value || 1));
        const kind = ($('#ekKind') && $('#ekKind').value) || 'zorunlu';
        if (k === '__new') {
          const nm = $('#ekN').value.trim();
          if (!nm) { toast('Yeni dersin adını yazın.'); break; }
          const existingKey = EP.findSubj(S, nm, c.grade >= 1 && c.grade <= 4 && EP.SO_SET.has(nm));
          if (existingKey && EP.findClassSubjCard(S, id, existingKey)) {
            toast(`${c.name} sınıfına ${nm} dersi zaten atanmış! Aynı sınıfa aynı ders iki kez atanamaz.`);
            break;
          }
          snap(); k = EP.ensureSubj(S, nm, c.grade); const br = $('#ekB').value.trim(); if (br) S.subjects[k][2] = br; syncSubj();
        } else {
          if (EP.findClassSubjCard(S, id, k)) {
            toast(`${c.name} sınıfına ${SN(k)} dersi zaten atanmış! Aynı sınıfa aynı ders iki kez atanamaz.`);
            break;
          }
          snap();
        }
        const nc = EP.newCard(S, id, k, h, kind);
        if (!nc) { toast(`${c.name} sınıfına ${SN(k)} dersi zaten atanmış!`); break; }
        const tsel = $('#ekT').value;
        if (tsel) nc.teacherId = tsel; else if (S.ui.amode !== 'off') EP.assignCards(S, [nc]);
        commit(); toast(`${c.name} için ${SN(k)} (${kind === 'zorunlu' ? 'Zorunlu' : kind === 'secmeli' ? 'Seçmeli' : 'Ek'} · ${h} sa) eklendi.`);
      } break;
      case 'subjAdd': { const nm = $('#nsN').value.trim(); if (!nm) { toast('Ders adı yazın.'); break; } snap(); const k = EP.ensureSubj(S, nm, 9); const sh = $('#nsS').value.trim(), br = $('#nsB').value.trim(); if (sh) S.subjects[k][1] = sh; if (br) S.subjects[k][2] = br; commit(); toast(nm + ' eklendi.'); } break;
      case 'subjDel': if (!S.cards.some(c => c.subj === id) && await ask(SN(id) + ' silinecek.', 'Sil')) { snap(); delete S.subjects[id]; S.teachers.forEach(t => { t.extra = (t.extra || []).filter(x => x !== id); }); S.rules = S.rules.filter(r => r.a !== id && r.b !== id); commit(); } break;
      case 'exAdd': case 'exBulk': {
        const t = S.teachers.find(x => x.id === id);
        const vals = act === 'exAdd' ? [$('#exSel') && $('#exSel').value].filter(Boolean) : [...document.querySelectorAll('.exChk:checked')].map(x => x.value);
        if (!vals.length) { toast('Ders seçin.'); break; }
        snap(); const ks = vals.map(v => { const [k, g, ...n] = v.split('|'); return S.subjects[k] ? k : EP.ensureSubj(S, n.join('|'), +g); }); syncSubj();
        t.extra = [...new Set([...(t.extra || []), ...ks])].filter(k => SB(k) !== t.branch); commit(); toast(ks.length + ' ders eklendi.');
      } break;
      case 'exClear': if (await ask('Branş dışı ders listesi boşaltılacak.', 'Boşalt')) { snap(); S.teachers.find(x => x.id === id).extra = []; commit(); } break;
      case 'exAll': document.querySelectorAll('.exi').forEach(l => { if (l.style.display !== 'none') { const c = l.querySelector('input'); if (!c.disabled) c.checked = true; } }); break;
      case 'exNone': document.querySelectorAll('.exChk').forEach(c => { c.checked = false; }); break;
      case 'exDel': { const t = S.teachers.find(x => x.id === id); snap(); t.extra = (t.extra || []).filter(x => x !== a.dataset.k); commit(); } break;
      case 'delCard': snap(); S.cards = S.cards.filter(c => c.id !== id); EP.dropPlace(S, id); commit(); break;
      case 'ruleTog': snap(); { const r = S.rules.find(x => x.id === id); r.on = !r.on; commit(); } break;
      case 'ruleDel': snap(); S.rules = S.rules.filter(x => x.id !== id); commit(); break;
      case 'ruleForbid': { const ps = [...document.querySelectorAll('.rfP:checked')].map(x => +x.value); if (!ps.length) { toast('En az bir saat seçin.'); break; } snap(); S.rules.push({ id: uid(), type: 'forbid', on: true, level: 'HARD', a: $('#rfA').value, periods: ps }); commit(); } break;
      case 'rulePair': { const x = $('#rpA').value, y = $('#rpB').value; if (x === y) { toast('İki farklı ders seçin.'); break; } snap(); S.rules.push({ id: uid(), type: 'pair', on: true, level: 'HIGH', a: x, b: y }); commit(); } break;
      case 'tcAdd': { const who = $('#tcWho').value, ids = [...document.querySelectorAll('.tcChk:checked')].map(x => x.value); if (who === 'sel' && !ids.length) { toast('En az bir öğretmen işaretleyin.'); break; } snap(); S.rules.push({ id: uid(), type: 'tclass', on: true, scope: $('#tcScope').value, max: +$('#tcMax').value, who, ids: who === 'all' ? [] : ids }); commit(); } break;
      case 'tcAddT': snap(); S.rules.push({ id: uid(), type: 'tclass', on: true, scope: $('#tcScopeT').value, max: +$('#tcMaxT').value, who: 'sel', ids: [id] }); commit(); break;
      case 'tcOne': { const r = S.rules.find(x => x.id === id); snap(); r.ids = (r.ids || []).filter(x => x !== a.dataset.t); if (!r.ids.length) S.rules = S.rules.filter(x => x.id !== id); commit(); } break;
      case 'tcFix': {
        snap(); const v = EP.tcAll(S), old = new Map();
        for (const x of v) if (!old.has(x.c.id)) { old.set(x.c.id, x.c.teacherId); x.c.teacherId = ''; }
        const cards = S.cards.filter(c => old.has(c.id)); EP.assignCards(S, cards, S.ui.amode === 'off' ? 'brans_ek' : S.ui.amode);
        let kept = 0; for (const c of cards) if (!c.teacherId) { c.teacherId = old.get(c.id); kept++; }
        commit(); toast(`${cards.length - kept} ders yeniden atandı.`);
      } break;
      case 'blkMode': snap(); S.blkMode = a.dataset.v; EP.syncAll(S, c => !c.bmode && !(S.blk || {})[EP.blkKey(S, c.subj, +c.hours)]); commit(); break;
      case 'cardPat': {
        const c = S.cards.find(x => x.id === a.dataset.id), p2 = a.dataset.p; if (!c || c.bmode !== 'auto') break;
        const h = +c.hours, ps = (c.bpats || []).slice(), i = ps.indexOf(p2);
        if (i >= 0) { if (ps.length <= EP.minPats(h)) { toast('En az 2 blok tipi seçili kalmalı.'); break; } ps.splice(i, 1); } else ps.push(p2);
        snap(); c.bpats = ps; EP.syncPattern(S, c); commit();
      } break;
      case 'bchip': {
        const sc = a.dataset.bsc, bid = a.dataset.bid, h = +a.dataset.h, p2 = a.dataset.p;
        let cur = bGet(sc, bid, h); cur = cur ? { mode: cur.mode, pats: cur.pats.slice() } : (() => { const g = bEff(sc, bid, h); return { mode: g.mode, pats: g.pats.slice() }; })();
        if (cur.mode === 'fixed') cur.pats = [p2, ...cur.pats.filter(x => x !== p2)];
        else { const i = cur.pats.indexOf(p2); if (i >= 0) { if (cur.pats.length <= EP.minPats(h)) { toast('En az 2 blok tipi seçili kalmalı.'); break; } cur.pats.splice(i, 1); } else cur.pats.push(p2); }
        if (sc === 'g') { snap(); bSet(sc, bid, h, cur); commit(); } else { bSet(sc, bid, h, cur); save(); render(); }
      } break;
      case 'blkReset': { const k = a.dataset.k; snap(); for (const c of S.cards) if (EP.blkKey(S, c.subj, +c.hours) === k && c.bmode) { delete c.bmode; delete c.bpats; EP.syncPattern(S, c); } commit(); } break;
      case 'cdCancel': S.ui.cd = null; save(); render(); break;
      case 'cdEdit': {
        const x = (S.custom || []).find(y => y.id === id); if (!x) break;
        const blk = {}; for (const h of customHours(x)) { const b = (S.blk || {})[x.name + '|' + h]; if (b) blk[h] = { mode: b.mode, pats: b.pats.slice() }; }
        const k = EP.findSubj(S, x.name, false);
        S.ui.cd = { kind: x.kind, name: x.name, short: k ? SS(k) : x.short || '', branch: k ? SB(k) : x.branch || '', times: x.times || 1, hrs: Object.assign({}, x.hrs), blk, edit: x.id };
        save(); render();
      } break;
      case 'cdSave': {
        const d = S.ui.cd; if (!d) break; const nm = (d.name || '').trim();
        if (!nm) { toast('Ders adı yazın.'); break; }
        if (!Object.keys(d.hrs).length) { toast('En az bir sınıf için saat yazın.'); break; }
        if (!d.edit && (catalogNames().has(nm) || (S.custom || []).some(x => x.name === nm))) { toast(nm + ' zaten var.'); break; }
        snap(); S.custom = S.custom || []; const k = EP.ensureSubj(S, nm, 9);
        if (d.short && d.short.trim()) S.subjects[k][1] = d.short.trim();
        if (d.branch && d.branch.trim()) S.subjects[k][2] = d.branch.trim();
        syncSubj();
        let x = d.edit && S.custom.find(y => y.id === d.edit);
        if (!x) { x = { id: uid() }; S.custom.push(x); }
        Object.assign(x, { name: nm, kind: d.kind, short: SS(k), branch: SB(k), times: d.times || 1, hrs: Object.assign({}, d.hrs) });
        S.blk = S.blk || {};
        for (const h of customHours(x)) { if (d.blk && d.blk[h]) S.blk[nm + '|' + h] = { mode: d.blk[h].mode, pats: d.blk[h].pats.slice() }; else delete S.blk[nm + '|' + h]; }
        EP.syncAll(S, c => EP.nameOf(S, c.subj) === nm && !c.bmode); S.ui.cd = null; commit(); toast(nm + ' kaydedildi.');
      } break;
      case 'cdApply': {
        const x = (S.custom || []).find(y => y.id === id); if (!x) break;
        snap(); const k = EP.ensureSubj(S, x.name, 9); syncSubj(); let n = 0;
        for (const c of S.classes) { const h = +x.hrs[c.grade]; if (!h || S.cards.some(y => y.classId === c.id && y.subj === k)) continue; EP.newCard(S, c.id, k, h, 'zorunlu'); n++; }
        commit(); toast(n ? `${x.name} ${n} sınıfa eklendi.` : 'Eklenecek sınıf yok.');
      } break;
      case 'cdDel': {
        const x = (S.custom || []).find(y => y.id === id); if (!x) break;
        snap(); const k = EP.findSubj(S, x.name, false), rm = k ? S.cards.filter(c => c.subj === k && c.kind === x.kind) : [];
        for (const c of rm) EP.dropPlace(S, c.id);
        S.cards = S.cards.filter(c => !rm.includes(c)); S.custom = S.custom.filter(y => y !== x);
        if (S.ui.cd && S.ui.cd.edit === x.id) S.ui.cd = null; commit();
      } break;
      case 'myAdd': snap(); S.school.myard = EP.myList(S); S.school.myard.push({ id: uid(), name: '', gorev: '' }); commit(); break;
      case 'myDel': snap(); S.school.myard = EP.myList(S).filter(m => m.id !== id); if (S.report && S.report.myId === id) S.report.myId = ''; commit(); break;
      case 'dutyAuto': snap(); { const n = EP.dutyAuto(S); commit(); toast(n + ' öğretmene ders programına göre haftalık nöbet verildi (idareciler ve nöbet tutmayanlar hariç tutuldu).'); } break;
      case 'toggleDutyExempt': {
        const t = S.teachers.find(x => x.id === id);
        if (!t || EP.staffAdminKind(S, t)) break;
        snap();
        t.dutyExempt = !t.dutyExempt;
        if (t.dutyExempt) { t.dutyD = ''; t.dutyP = ''; }
        commit();
        toast(`${t.name}: ${t.dutyExempt ? 'Nöbet Tutmaz (Muaf)' : 'Nöbet Tutar'} olarak güncellendi.`);
      } break;
      case 'buildMonthlyDuty': {
        const ym = (S.duty && S.duty.month) || EP.defaultYearMonth();
        const mode = (S.duty && S.duty.monthlyMode) || 'rotate';
        snap();
        const rows = EP.buildMonthlyDuty(S, ym, mode);
        S.ui.dutyTab = 'monthly';
        commit();
        const openN = rows.filter(r => !r.closed).length;
        toast(`${ym} için ${openN} açık okul gününde (haftada max 1 gün/öğretmen) aylık nöbet oluşturuldu.`);
      } break;
      case 'toggleDutyDate': {
        if (!id) break;
        snap();
        const closedNow = EP.toggleDutyClosedDate(S, id);
        S.ui.dutyTab = 'monthly';
        commit();
        toast(`${id.split('-').reverse().join('.')} ${closedNow ? 'kapatıldı (tatil)' : 'tekrar açıldı'} ve aylık nöbet kurala göre yeniden dağıtıldı.`);
      } break;
      case 'applyMebHolidays': {
        const ym = (S.duty && S.duty.month) || EP.defaultYearMonth();
        snap();
        const res = EP.applyMebHolidaysForMonth(S, ym);
        commit();
        if (!res.total) toast(`${ym} ayında kayıtlı MEB resmî tatil veya ara tatil günü bulunmuyor.`);
        else toast(`${res.total} MEB tatil günü kontrol edildi (${res.added} yeni gün takvimde kapatıldı).`);
      } break;
      case 'clearMonthClosed': {
        const ym = (S.duty && S.duty.month) || EP.defaultYearMonth();
        snap();
        const cnt = EP.clearMonthClosedDates(S, ym);
        commit();
        toast(`${cnt} kapalı gün açıldı ve aylık nöbet yeniden dağıtıldı.`);
      } break;
      case 'exDutyPdf': case 'exDutyPrint': case 'exDutyWord': {
        const label = act === 'exDutyWord' ? 'Haftalık nöbet Word (.doc)' : act === 'exDutyPrint' ? 'Haftalık nöbet yazdırma' : 'Haftalık nöbet PDF (.pdf)';
        const mode = await resolveExportMode(label);
        if (!mode) break;
        const wm = mode !== 'clean', title = S.school.name + ' Haftalik Nobet';
        const body = EP.docsFor(S, 'nb', '', { watermark: wm });
        if (act === 'exDutyWord') downloadBlob(title.replace(/[\\/:*?"<>|]+/g, '') + '.doc', `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>${EP.DOC_CSS}</style></head><body>${body}</body></html>`, 'application/msword;charset=utf-8');
        else if (act === 'exDutyPrint') await printReportNow(EP.docFile(S, body, title), false);
        else await exportReportPdf(EP.docFile(S, body, title), title, false);
      } break;
      case 'exMonthlyPdf': case 'exMonthlyPrint': case 'exMonthlyExcel': case 'exMonthlyWord': {
        const label = act === 'exMonthlyExcel' ? 'Aylık nöbet Excel (.xls)' : act === 'exMonthlyWord' ? 'Aylık nöbet Word (.doc)' : act === 'exMonthlyPrint' ? 'Aylık nöbet yazdırma' : 'Aylık nöbet PDF (.pdf)';
        const mode = await resolveExportMode(label);
        if (!mode) break;
        const wm = mode !== 'clean', ym = (S.duty && S.duty.month) || EP.defaultYearMonth();
        const title = `${S.school.name} Aylik Nobet ${ym}`;
        const body = EP.docMonthlyDuty(S, ym, { watermark: wm });
        if (act === 'exMonthlyExcel') downloadBlob(title.replace(/[\\/:*?"<>|]+/g, '') + '.xls', `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>${EP.DOC_CSS}</style></head><body>${body}</body></html>`, 'application/vnd.ms-excel;charset=utf-8');
        else if (act === 'exMonthlyWord') downloadBlob(title.replace(/[\\/:*?"<>|]+/g, '') + '.doc', `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>${EP.DOC_CSS}</style></head><body>${body}</body></html>`, 'application/msword;charset=utf-8');
        else if (act === 'exMonthlyPrint') await printReportNow(EP.docFile(S, body, title), false);
        else await exportReportPdf(EP.docFile(S, body, title), title, false);
      } break;
      case 'clubAuto': snap(); { const n = EP.clubAuto(S); commit(); toast(n ? n + ' öğretmene MEB sosyal kulüp atandı.' : 'Tüm öğretmenlerin kulübü zaten tanımlı.'); } break;
      case 'addClub': {
        const inp = $('#newClubName'), nm = inp ? inp.value.trim() : '';
        if (!nm) { toast('Kulüp adını yazın.'); break; }
        snap(); S.customClubs = S.customClubs || [];
        if (!S.customClubs.includes(nm) && !(EP.SOCIAL_CLUBS || []).includes(nm)) S.customClubs.push(nm);
        commit(); toast(nm + ' kulüp listesine eklendi.');
      } break;
      case 'dutyClear': if (await ask('Tüm öğretmenlerin nöbet günü silinecek.', 'Temizle')) { snap(); S.teachers.forEach(t => { t.dutyD = ''; t.dutyP = ''; }); commit(); } break;
      /* Çıktılar (Gerçek PDF + Doğrudan Yazdırma + Excel/Word/CSV/PNG · Üyeler temiz, Üyesizler EVRAK PLUS filigranlı) */
      case 'exPdf': case 'exAllPdf': case 'exDoc': case 'exAllDocs': {
        const isAll = act === 'exAllPdf' || act === 'exAllDocs';
        const mode = await resolveExportMode(isAll ? 'Tüm belgeleri PDF olarak indirme' : 'PDF belgesi indirme');
        if (!mode) break;
        const wm = mode !== 'clean', tab = S.ui.rtab || 'cp';
        let body, title, isLandscape = false;
        if (isAll) {
          body = ['cp', 'cs', 'tp', 'ts', 'nb', 'ek'].map(t => EP.docsFor(S, t, '', { watermark: wm })).join('');
          title = S.school.name + ' tum belgeler';
        } else {
          const selId = tab === 'cp' ? S.ui.rselc : tab === 'tp' ? S.ui.rselt : '';
          body = EP.docsFor(S, tab, selId || '', { watermark: wm });
          title = S.school.name + ' ' + ((EP.RTABS.find(x => x[0] === tab) || [])[1] || 'program');
          isLandscape = tab === 'cs' || tab === 'ts';
        }
        await exportReportPdf(EP.docFile(S, body, title), title, isLandscape);
      } break;
      case 'exPrint': {
        const mode = await resolveExportMode('Doğrudan yazdırma');
        if (!mode) break;
        const wm = mode !== 'clean', tab = S.ui.rtab || 'cp';
        const selId = tab === 'cp' ? S.ui.rselc : tab === 'tp' ? S.ui.rselt : '';
        const body = EP.docsFor(S, tab, selId || '', { watermark: wm });
        const title = S.school.name + ' ' + ((EP.RTABS.find(x => x[0] === tab) || [])[1] || 'program');
        const isLandscape = tab === 'cs' || tab === 'ts';
        await printReportNow(EP.docFile(S, body, title), isLandscape);
      } break;
      case 'exExcel': {
        const mode = await resolveExportMode('Excel (.xls) dışa aktarma');
        if (!mode) break;
        const tab = S.ui.rtab || 'cp', selId = tab === 'cp' ? S.ui.rselc : tab === 'tp' ? S.ui.rselt : '';
        downloadBlob(fileName('xls'), EP.excelExport(S, tab, selId || '', { watermark: mode !== 'clean' }), 'application/vnd.ms-excel;charset=utf-8');
      } break;
      case 'exWord': {
        const mode = await resolveExportMode('Word (.doc) dışa aktarma');
        if (!mode) break;
        const tab = S.ui.rtab || 'cp', selId = tab === 'cp' ? S.ui.rselc : tab === 'tp' ? S.ui.rselt : '';
        downloadBlob(fileName('doc'), EP.wordExport(S, tab, selId || '', { watermark: mode !== 'clean' }), 'application/msword;charset=utf-8');
      } break;
      case 'exCsv': {
        const mode = await resolveExportMode('Çarşaf CSV dışa aktarma');
        if (!mode) break;
        downloadBlob(fileName('csv').replace('.csv', ' carsaf.csv'), EP.csvExport(S, { watermark: mode !== 'clean' }), 'text/csv;charset=utf-8');
      } break;
      case 'quickSavePlan': {
        const entry = saveCurrentPlanSnapshot('', S.last && S.last.note ? S.last.note : '');
        if (!entry) break;
        S.ui.dtool = 'saved';
        commit();
        toast(`"${entry.name}" (${entry.placed}/${entry.total} blok) kaydedildi.`);
      } break;
      case 'savePlanNow': {
        const src = a.dataset.src || 'd';
        const nmEl = $('#spName_' + src), ntEl = $('#spNote_' + src);
        const entry = saveCurrentPlanSnapshot(nmEl ? nmEl.value : '', ntEl ? ntEl.value : '');
        if (!entry) break;
        commit();
        toast(`"${entry.name}" kayıtlı dağıtımlara eklendi.`);
      } break;
      case 'loadSavedPlan': {
        const sp = (S.savedPlans || []).find(x => x.id === id);
        if (!sp) break;
        if (!await ask(`"${sp.name}" (${sp.placed}/${sp.total} blok) mevcut ders programına geri yüklenecek.`, 'Uygula')) break;
        snap();
        if (sp.cardPatterns) {
          for (const c of S.cards || []) {
            if (sp.cardPatterns[c.id]) c.pattern = sp.cardPatterns[c.id];
          }
        }
        S.place = JSON.parse(JSON.stringify(sp.place || {}));
        const { bad } = EP.placedCore(S);
        bad.forEach(b => delete S.place[b]);
        S.last = { status: bad.length ? 'partial' : 'ok', ms: 0, note: `Kayıtlı dağıtım yüklendi: ${sp.name}` };
        step = 'auto_schedule';
        commit();
        toast(`"${sp.name}" programa geri yüklendi.`);
      } break;
      case 'dlSavedPlan': {
        const sp = (S.savedPlans || []).find(x => x.id === id);
        if (!sp) break;
        const clone = JSON.parse(JSON.stringify(S));
        clone.place = JSON.parse(JSON.stringify(sp.place || {}));
        if (sp.cardPatterns) for (const c of clone.cards || []) if (sp.cardPatterns[c.id]) c.pattern = sp.cardPatterns[c.id];
        const safeNm = (sp.name || 'dagitim').replace(/[\\/:*?"<>|]+/g, '').trim() || 'dagitim';
        downloadBlob(safeNm + '.json', JSON.stringify(EP.stateToV3Project(clone), null, 2), 'application/json');
      } break;
      case 'importTeachers': openBulkImportModal('teachers'); break;
      case 'importClasses': openBulkImportModal('classes'); break;
      case 'comparePlans': openComparePlansModal(); break;
      case 'delSavedPlan': {
        const sp = (S.savedPlans || []).find(x => x.id === id);
        if (!sp) break;
        if (!await ask(`"${sp.name}" kayıtlı dağıtımı silinecek.`, 'Sil')) break;
        snap();
        S.savedPlans = (S.savedPlans || []).filter(x => x.id !== id);
        if (bridge && typeof bridge.deleteSavedPlan === 'function') {
          try { bridge.deleteSavedPlan(id).catch(() => {}); } catch (_) {}
        }
        commit();
        toast('Kayıtlı dağıtım silindi.');
      } break;
      case 'resetCustomTimes': {
        snap();
        S.school.customTimes = [];
        commit();
        toast('Ders saatleri otomatik hesaplamaya sıfırlandı.');
      } break;
      case 'waSingle': {
        const kind = a.dataset.kind === 't' ? 't' : 'c';
        const mode = await resolveExportMode(kind === 't' ? 'Öğretmen WhatsApp görseli (PNG)' : 'Sınıf WhatsApp görseli (PNG)');
        if (!mode) break;
        const list = kind === 't' ? S.teachers : S.classes;
        const uiKey = kind === 't' ? 'waTch' : 'waCls';
        const targetId = (S.ui[uiKey] && list.some(x => x.id === S.ui[uiKey])) ? S.ui[uiKey] : (list[0] ? list[0].id : '');
        if (!targetId) { toast(kind === 't' ? 'Öğretmen bulunamadı.' : 'Sınıf bulunamadı.'); break; }
        const cv = EP.pngCanvas(S, kind, targetId, { watermark: mode !== 'clean' });
        if (!cv) break;
        const nm = (list.find(x => x.id === targetId) || {}).name || 'program';
        showImg(cv, `${kind === 't' ? 'Ogretmen' : 'Sinif'}-${nm}`);
      } break;
      case 'waBatch': {
        const kind = a.dataset.kind === 't' ? 't' : 'c';
        const list = kind === 't' ? S.teachers : S.classes;
        if (!list.length) { toast(kind === 't' ? 'Öğretmen bulunamadı.' : 'Sınıf bulunamadı.'); break; }
        const mode = await resolveExportMode(kind === 't' ? `Tüm öğretmenler (${list.length}) WhatsApp görselleri` : `Tüm sınıflar (${list.length}) WhatsApp görselleri`);
        if (!mode) break;
        const safeSchool = String(S.school.name || 'DersMatrix').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'DersMatrix';
        const subName = `${safeSchool}-${kind === 't' ? 'Ogretmenler' : 'Siniflar'}-WhatsApp`;
        toast(`${list.length} adet WhatsApp PNG görseli hazırlanıyor…`);
        const prepared = [];
        const usedNames = new Set();
        for (const ent of list) {
          const cv = EP.pngCanvas(S, kind, ent.id, { watermark: mode !== 'clean' });
          if (!cv) continue;
          const baseSafe = String(ent.name || 'program').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'program';
          let fname = `${kind === 't' ? 'Ogretmen' : 'Sinif'}-${baseSafe}.png`;
          let idx = 2;
          while (usedNames.has(fname.toLowerCase())) {
            fname = `${kind === 't' ? 'Ogretmen' : 'Sinif'}-${baseSafe}-${idx++}.png`;
          }
          usedNames.add(fname.toLowerCase());
          prepared.push({ name: fname, dataUrl: cv.toDataURL('image/png') });
        }
        if (!prepared.length) { toast('Görsel üretilemedi.'); break; }

        if (bridge && typeof bridge.savePngBatch === 'function') {
          try {
            const res = await bridge.savePngBatch({ folderName: subName, files: prepared });
            if (res && res.ok) toast(`${res.count} adet WhatsApp görseli klasöre kaydedildi: ${res.dir}`);
            else if (res && !res.canceled) toast('Görseller klasöre kaydedilemedi.');
          } catch (err) {
            toast('Klasöre kaydetme hatası: ' + (err && err.message ? err.message : String(err)));
          }
          break;
        }

        const zipEntries = prepared.map(item => {
          const b64 = item.dataUrl.split(',')[1] || '';
          const bin = atob(b64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          return { name: item.name, data: bytes };
        });
        const zipBytes = EP.buildZipBytes(zipEntries);
        downloadBlob(`${subName}.zip`, zipBytes, 'application/zip');
        toast(`${prepared.length} adet ${kind === 't' ? 'öğretmen' : 'sınıf'} WhatsApp görseli tek ZIP arşivi olarak indirildi.`);
      } break;
      case 'exPng2': {
        const mode = await resolveExportMode('WhatsApp PNG görseli oluşturma');
        if (!mode) break;
        const tab = S.ui.rtab, kind = tab === 'cp' ? 'c' : 't', id2 = tab === 'cp' ? S.ui.rselc : S.ui.rselt;
        if (!id2) break;
        const cv = EP.pngCanvas(S, kind, id2, { watermark: mode !== 'clean' }); if (!cv) break;
        const nm = ((kind === 't' ? S.teachers : S.classes).find(x => x.id === id2) || {}).name || 'program';
        showImg(cv, nm);
      } break;
      case 'cloudSync': requireCloudMembership('EvrakPlus Bulut Senkronizasyonu'); break;
      case 'openLogin': await doEvrakPlusLogin(); break;
      case 'refreshAuth': await refreshEvrakPlusAuth(false); break;
      case 'logoutAuth': await doEvrakPlusLogout(); break;
      case 'checkUpdate': {
        if (!bridge || typeof bridge.checkUpdate !== 'function') break;
        toast('Güncellemeler kontrol ediliyor…');
        updateInfo = await bridge.checkUpdate();
        render();
        if (updateInfo && updateInfo.updateAvailable) toast(`Yeni sürüm mevcut: v${updateInfo.latestVersion}!`);
        else if (updateInfo && updateInfo.error) toast('Güncelleme kontrolü: ' + updateInfo.error);
        else toast(`Uygulamanız güncel (v${APP_VER}).`);
      } break;
      case 'installUpdate': {
        if (!bridge || typeof bridge.downloadAndInstallUpdate !== 'function') break;
        try {
          updateProgress = { percent: 1, message: 'Güncelleme başlatılıyor…' };
          render();
          await bridge.downloadAndInstallUpdate(updateInfo);
        } catch (err) {
          updateProgress = null;
          render();
          toast('Güncelleme hatası: ' + (err && err.message ? err.message : String(err)));
        }
      } break;
      case 'dismissUpdate': updateInfo = Object.assign({}, updateInfo, { updateAvailable: false }); $('#banner').innerHTML = ''; render(); break;
      case 'setTheme': S.ui.theme = a.dataset.v; save(); render(); break;
      case 'newEmpty': if (await ask('Mevcut proje kapanacak. Önce JSON yedek aldığınızdan emin olun.', 'Boş proje aç')) { snap(); S = EP.blank(); hist('Boş proje'); step = 'school'; commit(); } break;
      case 'demo': case 'demoX': if (await ask('Mevcut projenin yerine örnek okul yüklenecek.', 'Yükle')) { snap(); S = EP.demo(act === 'demoX'); relax = null; hist(act === 'demoX' ? 'Çakışmalı örnek' : 'Örnek okul'); step = 'auto_schedule'; commit(); if (act === 'demo' && !bridge && !webApi) runBrowserSolve('full'); } break;
      case 'restore': { const h = getHist()[+a.dataset.i]; if (h && await ask('Bu kayıt geri yüklenecek.', 'Geri yükle')) { snap(); S = EP.migrateState(JSON.parse(h.json)); commit(); toast('Geri yüklendi.'); } } break;
    }
  });

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.id === 'openFile' && el.files && el.files[0]) {
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const o = JSON.parse(fr.result);
          if (!o || !o.school || (!Array.isArray(o.cards) && !Array.isArray(o.assignments))) throw 0;
          snap(); S = EP.migrateState(o); hist('Dosya açıldı: ' + el.files[0].name); step = 'auto_schedule'; commit(); toast('Proje başarıyla açıldı.');
        } catch (_) { toast('Geçerli bir Çarşaf (v2) veya DersMatrix Ultimate (v3) JSON dosyası değil.'); }
      };
      fr.readAsText(el.files[0]); return;
    }
    if (el.dataset.ctime) {
      const [pStr, field] = el.dataset.ctime.split('|');
      const p = +pStr;
      if (Number.isInteger(p) && p >= 0) {
        snap();
        const base = EP.autoTimes(S);
        S.school.customTimes = Array.isArray(S.school.customTimes) ? S.school.customTimes.slice() : [];
        for (let i = 0; i < base.length; i++) {
          if (!S.school.customTimes[i]) S.school.customTimes[i] = { start: base[i].start, end: base[i].end };
        }
        S.school.customTimes[p][field] = el.value;
        commit();
      }
      return;
    }
    if (el.dataset.k) {
      snap(); let v = el.value;
      if (el.dataset.k === 'school.type') { S.school.type = v; commit(); const T = EP.typeOf(S); if (T && T.P !== +S.school.P) toast(`${T.ad} seçildi. Önerilen günlük ders sayısı ${T.P}.`); return; }
      if (el.type === 'number' || el.dataset.k === 'school.D') v = Math.max(0, +v || 0);
      if (el.dataset.k === 'school.P') v = Math.min(12, Math.max(1, v));
      setPath(el.dataset.k, v); commit(); return;
    }
    if (el.dataset.tqac) {
      const tid = el.dataset.tqac, cid = el.value, selEl = $('#tqaS_' + tid);
      if (selEl) {
        const opts = [...SK].sort((a, b) => SN(a).localeCompare(SN(b), 'tr')).map(k => {
          const dup = cid && EP.findClassSubjCard(S, cid, k);
          return `<option value="${k}" ${dup ? 'disabled' : ''}>${esc(SN(k))} · ${esc(SB(k))}${dup ? ' (Sınıfta zaten var)' : ''}</option>`;
        }).join('');
        selEl.innerHTML = opts;
        const firstFree = [...selEl.options].find(o => !o.disabled);
        if (firstFree) selEl.value = firstFree.value;
      }
      return;
    }
    if (el.dataset.tpool) {
      const tid = el.dataset.tid, cid = el.dataset.cid, nm = el.dataset.name, h = Math.max(1, +el.dataset.h || 2), kind = el.dataset.kind || 'zorunlu';
      const t = S.teachers.find(x => x.id === tid), c = S.classes.find(x => x.id === cid);
      if (!t || !c) return;
      const existingCard = (el.dataset.cardId && S.cards.find(x => x.id === el.dataset.cardId)) || EP.findClassSubjCard(S, cid, el.dataset.subj);
      if (el.checked) {
        if (existingCard && existingCard.teacherId && existingCard.teacherId !== t.id) {
          el.checked = false;
          toast(`${c.name} ${SN(existingCard.subj)} başka öğretmende; aktarmak için “Devral ⇄” düğmesini kullanın.`);
          return;
        }
        snap();
        let card = existingCard;
        if (!card) {
          const k = EP.ensureSubj(S, nm, c.grade); syncSubj();
          card = EP.newCard(S, cid, k, h, kind);
        }
        if (card) {
          card.teacherId = t.id;
          if (SB(card.subj) === EP.REHB) c.rehber = t.id;
          const v = EP.tcViolation(S, t, card);
          commit();
          toast(`${c.name} ${SN(card.subj)} (${card.hours} sa) → ${t.name} üzerine atandı.` + (v ? ` Sınır uyarısı: ${v.h}/${v.r.max}.` : ''));
        }
      } else {
        if (existingCard && existingCard.teacherId === t.id) {
          snap();
          existingCard.teacherId = '';
          EP.dropPlace(S, existingCard.id);
          commit();
          toast(`${c.name} ${SN(existingCard.subj)} öğretmenden çıkarıldı (sınıfta boşa alındı).`);
        }
      }
      return;
    }
    if (el.dataset.ui) {
      S.ui[el.dataset.ui] = el.type === 'checkbox' ? el.checked : el.value;
      if (el.dataset.ui === 'time') S.ui.time = +el.value;
      save(); if (el.dataset.ui === 'ent') sel = ''; render(); return;
    }
    if (el.dataset.t) {
      const t = S.teachers.find(x => x.id === el.dataset.t); if (!t) return; snap();
      if (el.type === 'checkbox') {
        t[el.dataset.f] = el.checked;
        if (el.dataset.f === 'dutyExempt' && el.checked) { t.dutyD = ''; t.dutyP = ''; }
      } else {
        t[el.dataset.f] = el.type === 'number' ? (+el.value || 0) : el.value;
        if (el.dataset.f === 'role') {
          const isEx = t.role !== 'ogretmen';
          t.dutyExempt = isEx;
          if (isEx) { t.dutyD = ''; t.dutyP = ''; }
        }
      }
      commit(); return;
    }
    if (el.dataset.cls) {
      const c = S.classes.find(x => x.id === el.dataset.cls); if (!c) return; snap();
      if (el.dataset.f === 'rehber') { EP.setRehber(S, c, el.value); const { bad } = EP.placedCore(S); bad.forEach(b => delete S.place[b]); commit(); return; }
      c[el.dataset.f] = el.dataset.f === 'grade' ? Math.max(0, Math.min(12, el.value === '' ? c.grade : +el.value)) : el.value; commit(); return;
    }
    if (el.dataset.bld) { const b = S.buildings.find(x => x.id === el.dataset.bld); if (b) { snap(); b[el.dataset.f] = el.value; commit(); } return; }
    if (el.dataset.btr) { const [b1, b2] = el.dataset.btr.split('|'); const b = S.buildings.find(x => x.id === b1); if (b) { snap(); b.transitionPeriods = b.transitionPeriods || {}; b.transitionPeriods[b2] = Math.max(0, +el.value || 0); commit(); } return; }
    if (el.dataset.room) { const r = S.rooms.find(x => x.id === el.dataset.room); if (r) { snap(); r[el.dataset.f] = el.type === 'number' ? Math.max(1, +el.value || 30) : el.value; commit(); } return; }
    if (el.dataset.rep) { snap(); S.report = S.report || {}; S.report[el.dataset.rep] = el.value; commit(); return; }
    if (el.dataset.dplaces) { snap(); S.duty = S.duty || { admin: {} }; S.duty.places = el.value.split(',').map(x => x.trim()).filter(Boolean); commit(); return; }
    if (el.dataset.dadmin != null) { snap(); S.duty = S.duty || { places: [] }; S.duty.admin = S.duty.admin || {}; S.duty.admin[el.dataset.dadmin] = el.value; commit(); return; }
    if (el.dataset.dutycfg) {
      snap();
      S.duty = S.duty || { places: ['Bahçe', 'Koridor'], admin: {}, closedDates: [], monthly: {} };
      const f = el.dataset.dutycfg;
      S.duty[f] = el.type === 'checkbox' ? el.checked : el.value;
      if (['month', 'monthlyMode', 'reassignClosedDay', 'strategy', 'avoidZeroDay'].includes(f)) {
        EP.buildMonthlyDuty(S, S.duty.month || EP.defaultYearMonth(), S.duty.monthlyMode || 'rotate');
      }
      commit(); return;
    }
    if (el.dataset.mcell) {
      const [ym, rIdxStr, place] = el.dataset.mcell.split('|');
      const rIdx = +rIdxStr;
      const rows = S.duty && S.duty.monthly && S.duty.monthly[ym];
      const row = rows && rows[rIdx];
      if (row) {
        const nextNames = el.value.split(',').map(x => x.trim()).filter(Boolean);
        const dup = EP.checkMonthlyWeekDup(rows, rIdx, place, nextNames);
        if (dup) {
          toast(`Kural uyarısı: ${dup.name} bu hafta (${GUN[dup.dow]} ${dup.date.split('-').reverse().join('.')}) zaten nöbetçi! Bir öğretmen haftada en fazla 1 gün nöbet tutabilir.`);
          el.value = ((row.posts || {})[place] || []).join(', ');
          return;
        }
        snap();
        row.posts = row.posts || {};
        row.posts[place] = nextNames;
        save();
      }
      return;
    }
    if (el.dataset.madmin) {
      const [ym, rIdxStr] = el.dataset.madmin.split('|');
      const rows = S.duty && S.duty.monthly && S.duty.monthly[ym];
      const row = rows && rows[+rIdxStr];
      if (row) { snap(); row.admin = el.value; save(); }
      return;
    }
    if (el.dataset.pcls) { if (pop) { pop.cls = el.value; renderPop(); } return; }
    if (el.dataset.pt) {
      const c = S.cards.find(x => x.id === el.dataset.pt); if (!c) return;
      snap(); c.teacherId = el.value;
      const { bad } = EP.placedCore(S); bad.filter(b => b.split(':')[0] === c.id).forEach(b => delete S.place[b]);
      commit(); toast('Öğretmen değiştirildi.'); return;
    }
    if (el.dataset.rule) { const r = S.rules.find(x => x.id === el.dataset.rule); if (!r) return; snap(); r[el.dataset.f] = el.dataset.f === 'max' ? +el.value : el.value; commit(); return; }
    if (el.dataset.subj) { const k = el.dataset.subj, i = +el.dataset.i, v = el.value.trim(); if (!v || !S.subjects[k]) { render(); return; } snap(); S.subjects[k][i] = v; commit(); return; }
    if (el.dataset.bsc) {
      const sc = el.dataset.bsc, bid = el.dataset.bid, h = +el.dataset.h, v = el.value;
      if (sc === 'g') snap();
      let nv = null;
      if (v !== 'inherit') { const old = bGet(sc, bid, h) || bEff(sc, bid, h); nv = { mode: v, pats: v === 'auto' ? EP.ensure2((old.mode === 'auto' ? old.pats : [old.pats[0]]).slice(), h) : old.pats.slice() }; }
      bSet(sc, bid, h, nv); if (sc === 'g') commit(); else { save(); render(); } return;
    }
    if (el.dataset.cd) {
      const d = S.ui.cd, f = el.dataset.cd; if (!d) return;
      if (f === 'h') {
        const v = el.value.trim().replace(/\s+/g, '');
        if (v && !/^\d+(\/\d+)*$/.test(v)) { toast('Saati 2 veya 1/2 biçiminde yazın.'); render(); return; }
        if (v) d.hrs[el.dataset.g] = v; else delete d.hrs[el.dataset.g];
      } else d[f] = f === 'times' ? Math.max(1, +el.value || 1) : el.value;
      save(); render(); return;
    }
    if (el.dataset.my) { snap(); const m = EP.myList(S).find(x => x.id === el.dataset.my); if (m) m[el.dataset.f] = el.value; commit(); return; }
    if (el.dataset.card && el.dataset.f === 'blk') {
      const c = S.cards.find(x => x.id === el.dataset.card); snap(); const v = el.value, h = +c.hours;
      if (v === 'inherit') { delete c.bmode; delete c.bpats; }
      else if (v === 'auto') { c.bmode = 'auto'; const g = EP.blkCfg(S, c.subj, h); c.bpats = EP.ensure2((g.mode === 'auto' ? g.pats : [c.pattern]).slice(), h); }
      else { c.bmode = 'fixed'; c.bpats = [v.slice(2)]; }
      EP.syncPattern(S, c); if (c.bmode === 'fixed' && c.pattern !== c.bpats[0]) { c.pattern = c.bpats[0]; EP.dropPlace(S, c.id); }
      commit(); return;
    }
    if (el.dataset.card) {
      const c = S.cards.find(x => x.id === el.dataset.card); if (!c) return; snap(); const f = el.dataset.f;
      if (f === 'teacherId' && SB(c.subj) === EP.REHB && el.value) { const cl = S.classes.find(x => x.id === c.classId); if (cl) cl.rehber = el.value; }
      c[f] = f === 'hours' ? (+el.value || 1) : el.value;
      if (f === 'teacherId') {
        const { bad } = EP.placedCore(S);
        const mine = bad.filter(b => b.split(':')[0] === c.id);
        mine.forEach(b => delete S.place[b]);
        const t = S.teachers.find(x => x.id === el.value), v = t && EP.tcViolation(S, t, c);
        if (t) toast(`${cName(c.classId)} ${SS(c.subj)} → ${t.name} olarak güncellendi.` + (mine.length ? ' Çakışan yerleşim boşa alındı.' : '') + (v ? ` Sınır uyarısı: ${v.h}/${v.r.max}.` : ''));
      }
      if (f === 'hours') { if (c.bmode && !(c.bpats || []).some(p => EP.patSum(p) === +c.hours)) { delete c.bmode; delete c.bpats; } EP.syncPattern(S, c); }
      commit();
    }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'pmQ') { if (pop) pop.q = e.target.value; pmFilter(); return; }
    if (e.target.id === 'unQ') {
      unQ = e.target.value; const q = unQ.toLocaleLowerCase('tr').trim(); let n = 0, t = 0;
      document.querySelectorAll('.unq').forEach(b => { t++; const v = !q || b.dataset.q.includes(q); b.style.display = v ? '' : 'none'; if (v) n++; });
      const c = $('#unN'); if (c) c.textContent = q ? `${n} / ${t} gösteriliyor` : '';
      return;
    }
    if (e.target.id === 'tpQ') {
      S.ui.tpQ = e.target.value;
      const q = e.target.value.toLocaleLowerCase('tr').trim();
      document.querySelectorAll('.tpool-row').forEach(r => { r.style.display = !q || r.dataset.q.includes(q) ? '' : 'none'; });
      return;
    }
    if (e.target.id === 'tAssignQ') {
      S.ui.tAssignQ = e.target.value;
      const q = e.target.value.toLocaleLowerCase('tr').trim();
      document.querySelectorAll('.tassign-item').forEach(r => { r.style.display = !q || r.dataset.q.includes(q) ? '' : 'none'; });
      return;
    }
    if (e.target.id === 'bQ') { const q = e.target.value.toLocaleLowerCase('tr').trim(); document.querySelectorAll('.bqi').forEach(r => { r.style.display = !q || r.dataset.q.includes(q) ? '' : 'none'; }); return; }
    if (e.target.id === 'exQ') {
      const q = e.target.value.toLocaleLowerCase('tr').trim();
      document.querySelectorAll('.exi').forEach(l => { l.style.display = !q || l.dataset.q.includes(q) ? '' : 'none'; });
      document.querySelectorAll('.exg').forEach(g => { g.style.display = [...g.querySelectorAll('.exi')].some(l => l.style.display !== 'none') ? '' : 'none'; });
    }
  });

  /* Sürükle-Bırak (Program Panosu + Öğretmenler Arası Ders Aktarma) & Sağ Tık */
  document.addEventListener('dragstart', e => {
    const ac = e.target.closest && e.target.closest('[data-drag-card]');
    if (ac && !e.target.closest('input,select,button')) {
      dragCardId = ac.dataset.dragCard;
      ac.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragCardId); } catch (_) {}
      return;
    }
    const el = e.target.closest && e.target.closest('[draggable="true"][data-id]');
    if (!el || running) return;
    const id = el.dataset.id, off = +(el.dataset.k || 0), ed = EP.editInfoFor(S, id);
    if (!ed) { e.preventDefault(); return; }
    drag = { id, off, ed }; closePop(); e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', id); } catch (_) {}
    const P = +S.school.P, b = ed.m.blocks[ed.i], cid = S.classes[b.c].id, tid = b.t >= 0 ? S.teachers[b.t].id : null;
    setTimeout(() => document.querySelectorAll('td[data-act="cell"]').forEach(td => {
      const ent = td.dataset.ent; if (ent !== cid && ent !== tid) return;
      const x = td.dataset.key.split('-').map(Number), p0 = x[1] - off;
      if (td.dataset.id && td.dataset.id !== id) { if (ed.sw.has(td.dataset.id)) td.classList.add('dswp'); return; }
      if (p0 < 0 || td.classList.contains('closed')) return;
      if (ed.tg.has(x[0] * P + p0)) td.classList.add('dtgt');
    }), 0);
  });
  document.addEventListener('dragover', e => {
    if (dragCardId) {
      const tl = e.target.closest && e.target.closest('.tl[data-drop-t]');
      if (tl) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; tl.classList.add('drop-over'); return; }
    }
    if (drag && e.target.closest('td.dtgt,td.dswp')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  });
  document.addEventListener('dragleave', e => {
    const tl = e.target.closest && e.target.closest('.tl.drop-over');
    if (tl && !tl.contains(e.relatedTarget)) tl.classList.remove('drop-over');
  });
  document.addEventListener('drop', e => {
    if (dragCardId) {
      const tl = e.target.closest && e.target.closest('.tl[data-drop-t]');
      if (tl) {
        e.preventDefault();
        const cid = dragCardId, tid = tl.dataset.dropT;
        dragCardId = null;
        document.querySelectorAll('.drop-over,.dragging').forEach(x => x.classList.remove('drop-over', 'dragging'));
        const card = S.cards.find(c => c.id === cid), tgt = S.teachers.find(t => t.id === tid);
        if (card && tgt && card.teacherId !== tgt.id) {
          snap();
          card.teacherId = tgt.id;
          const { bad } = EP.placedCore(S);
          bad.filter(b => b.split(':')[0] === card.id).forEach(b => delete S.place[b]);
          S.ui.tsel = tgt.id;
          commit();
          toast(`${cName(card.classId)} ${SN(card.subj)} → ${tgt.name} öğretmenine aktarıldı.`);
        }
        return;
      }
    }
    const td = e.target.closest('td.dtgt,td.dswp'); if (!drag || !td) return; e.preventDefault();
    const x = td.dataset.key.split('-').map(Number);
    const ok = td.classList.contains('dswp') ? moveTo(drag.id, td.dataset.key, td.dataset.id, td.dataset.ent) : moveTo(drag.id, x[0] + '-' + (x[1] - drag.off), '', td.dataset.ent);
    drag = null; sel = ''; if (ok) { commit(); toast('Ders taşındı.'); } else render();
  });
  document.addEventListener('dragend', () => {
    drag = null; dragCardId = null;
    document.querySelectorAll('.dtgt,.dswp,.drop-over,.dragging').forEach(x => x.classList.remove('dtgt', 'dswp', 'drop-over', 'dragging'));
  });

  /* Toplu Kilit Seçimi sürükleyerek tarama (click-and-drag seçim) */
  function markBulkDom(bid, on) {
    document.querySelectorAll(`td[data-act="cell"][data-id="${CSS.escape ? CSS.escape(bid) : bid}"]`).forEach(el => {
      el.classList.toggle('bsel', on);
    });
  }
  document.addEventListener('mousedown', e => {
    if (!bulkMode || running || e.button !== 0) return;
    const td = e.target.closest && e.target.closest('td[data-act="cell"][data-id]');
    if (!td) return;
    const bid = td.dataset.id;
    if (!bid || !S.place[bid]) return;
    e.preventDefault();
    const add = !bulkSel.has(bid);
    if (add) bulkSel.add(bid); else bulkSel.delete(bid);
    markBulkDom(bid, add);
    bulkDrag = { add, visited: new Set([bid]) };
  });
  document.addEventListener('mouseover', e => {
    if (!bulkDrag || !bulkMode || running) return;
    const td = e.target.closest && e.target.closest('td[data-act="cell"][data-id]');
    if (!td) return;
    const bid = td.dataset.id;
    if (!bid || !S.place[bid] || bulkDrag.visited.has(bid)) return;
    bulkDrag.visited.add(bid);
    if (bulkDrag.add) bulkSel.add(bid); else bulkSel.delete(bid);
    markBulkDom(bid, bulkDrag.add);
  });
  document.addEventListener('mouseup', () => {
    if (!bulkDrag) return;
    bulkDrag = null;
    suppressNextCellClickAt = Date.now();
    sel = '';
    closePop();
    render();
  });

  /* Çift tık: gün başlığı -> günü kapat/aç; boş hücre -> saati kapat/aç; dolu ders -> kilitle/kilidi aç */
  document.addEventListener('dblclick', e => {
    if (running) return;
    const thDay = e.target.closest && e.target.closest('th[data-daytoggle="1"]');
    if (thDay) {
      e.preventDefault();
      if (cellClickTimer) { clearTimeout(cellClickTimer); cellClickTimer = null; }
      toggleEntityDayQuick(thDay.dataset.kind, thDay.dataset.ent, +thDay.dataset.d);
      return;
    }
    const td = e.target.closest && e.target.closest('td[data-act="cell"]');
    if (!td || bulkMode) return;
    const bid = td.dataset.id || '';
    e.preventDefault();
    if (cellClickTimer) { clearTimeout(cellClickTimer); cellClickTimer = null; }
    if (bid && S.place[bid]) {
      toggleCellLockQuick(bid);
    } else if (!bid && td.dataset.key && td.dataset.ent) {
      toggleEntitySlotQuick(td.dataset.kind, td.dataset.ent, td.dataset.key);
    }
  });

  document.addEventListener('contextmenu', e => {
    const td = e.target.closest && e.target.closest('td[data-act="cell"]');
    if (!td || !['auto_schedule', 'manual_schedule', 'timetables'].includes(step) || running) return;
    e.preventDefault();
    const key = td.dataset.key, ent = td.dataset.ent, kind = td.dataset.kind, id = td.dataset.id || '';
    if (id) { sel = id; pop = { key, ent, kind, id }; }
    else { sel = ''; pop = { key, ent, kind, id: '', add: true, cls: '', q: '' }; }
    render();
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.target.closest('input,textarea,select')) {
      if (e.key === 'z') { e.preventDefault(); $('#bUndo').click(); }
      if (e.key === 'y') { e.preventDefault(); $('#bRedo').click(); }
      if (e.key.toLowerCase() === 'b') { e.preventDefault(); $('#bToggleSide')?.click(); }
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (step === 'auto_schedule' || step === 'timetables') {
          const entry = saveCurrentPlanSnapshot('', S.last && S.last.note ? S.last.note : '');
          if (entry) { commit(); toast(`"${entry.name}" hızlı kaydedildi.`); }
        } else {
          save(); toast('Değişiklikler yerel olarak kaydedildi.');
        }
      }
    }
    if (e.key === 'Escape') {
      if ($('#modalRoot').innerHTML) { $('#modalRoot').innerHTML = ''; return; }
      if (pop) { closePop(); return; }
      if (sel) { sel = ''; render(); }
    }
    if (e.key === 'Enter' && e.target.matches('td.cell')) e.target.click();
  });

  window.addEventListener('resize', () => { if (pop) renderPop(); });
  window.addEventListener('hashchange', () => {
    const h = location.hash.slice(1);
    if (EP.MENUS.some(m => m[0] === h) && h !== step) { step = h; sel = ''; render(); }
  });

  /* Çoklu Sekme Uyarısı (BroadcastChannel) */
  try {
    const bc = new BroadcastChannel('evrakplus-multi-plus');
    bc.onmessage = e => {
      if (e.data === 'merhaba') bc.postMessage('buradayim');
      if (e.data === 'merhaba' || e.data === 'buradayim') {
        $('#banner').innerHTML = '<div class="banner">DersMatrix Ultimate başka bir sekmede de açık. İki sekme aynı yerel kaydı kullanır ve birbirinin üzerine yazabilir; birini kapatın.</div>';
      }
    };
    bc.postMessage('merhaba');
  } catch (_) {}

  /* PWA Yükleme Desteği */
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredInstall = e;
    const b = $('#btnInstallPwa'); if (b) b.style.display = 'inline-flex';
  });
  $('#btnInstallPwa')?.addEventListener('click', async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    $('#btnInstallPwa').style.display = 'none';
  });

  /* Electron Canlı Motor, Oturum ve Güncelleme Dinleyicileri */
  if (bridge && typeof bridge.onSolverProgress === 'function') {
    bridge.onSolverProgress(({ engineId, progress }) => {
      if (running === 'native') {
        live.engine = engineId;
        if (progress && progress.assignedBlocks != null) live.placed = progress.assignedBlocks;
        if (progress && progress.bestPlacements && Object.keys(progress.bestPlacements).length > 0) {
          live.bestPlacements = progress.bestPlacements;
          live.placed = Object.keys(progress.bestPlacements).length;
        }
        if (progress && progress.message) live.status = progress.message;
        upLive();
      }
    });
  }
  if (bridge && typeof bridge.onAuthChanged === 'function') {
    bridge.onAuthChanged(st => {
      authUser = st && st.loggedIn ? st : null;
      render();
    });
  }
  if (bridge && typeof bridge.onUpdaterEvent === 'function') {
    bridge.onUpdaterEvent(ev => {
      if (!ev) return;
      if (ev.type === 'available' && ev.info) {
        updateInfo = ev.info;
        renderUpdateBanner();
        if (step === 'system') render();
      } else if (ev.type === 'progress' || ev.type === 'verifying' || ev.type === 'ready') {
        updateProgress = { percent: ev.percent || 0, message: ev.message || '' };
        renderUpdateBanner();
        if (step === 'system') render();
      }
    });
  }

  /* Başlangıç */
  async function init() {
    let saved = loadLocal();
    if (!saved && bridge && typeof bridge.listProjects === 'function') {
      try {
        const list = await bridge.listProjects();
        if (Array.isArray(list) && list.length) {
          const loaded = await bridge.loadProject(list[0].id);
          if (loaded) saved = EP.migrateState(loaded);
        }
      } catch (_) {}
    }
    S = EP.migrateState(saved || EP.demo(false));
    if (bridge && typeof bridge.listSavedPlans === 'function') {
      try {
        const pid = S.id || 'default';
        const dbPlans = await bridge.listSavedPlans(pid);
        const byId = new Map();
        for (const p of (Array.isArray(dbPlans) ? dbPlans : [])) byId.set(p.id, p);
        for (const lp of (Array.isArray(S.savedPlans) ? S.savedPlans : [])) {
          if (lp && lp.id && !byId.has(lp.id)) {
            byId.set(lp.id, lp);
            if (typeof bridge.saveSavedPlan === 'function') {
              bridge.saveSavedPlan(pid, lp).catch(() => {});
            }
          }
        }
        S.savedPlans = [...byId.values()].sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')));
      } catch (_) {}
    }
    syncSubj();
    const h0 = location.hash.slice(1);
    step = EP.MENUS.some(m => m[0] === h0) ? h0 : 'auto_schedule';
    render();

    if (!saved) {
      hist('Örnek okul');
      if (!bridge && !webApi) runBrowserSolve('full');
    }
    if (bridge && typeof bridge.getSystemInfo === 'function') {
      bridge.getSystemInfo().then(info => { sysInfo = info; if (step === 'system') render(); }).catch(() => {});
    }
    refreshEvrakPlusAuth(true);
  }

  init();
})();
