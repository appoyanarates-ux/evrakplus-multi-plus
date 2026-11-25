/* =========================================================================
 * EvrakPlus Ders Dağıtım Multi Plus v1.0.0 — Resmi Belge Önizleme ve Çıktı Modülü
 * - Sınıf Programı, Sınıf Çarşaf, Öğretmen Programı, Öğretmen Çarşaf
 * - Okul Nöbeti ve MEB Sosyal Kulüpler (İdareciler öğretmen nöbetinden muaf)
 * - Kalite Raporu
 * - Yazdırılabilir HTML/PDF, Excel (.xls), Word (.doc), Çarşaf CSV, WhatsApp PNG
 * ========================================================================= */
(function (root) {
  'use strict';
  const EP = (root.EP = root.EP || {});

  const DOC_CSS = `.doc{font:12px/1.25 "Times New Roman",Times,serif;color:#000;background:#fff;padding:28px 34px;box-sizing:border-box;text-align:left}
.doc *{box-sizing:border-box}.doc.portrait{width:794px;min-height:1123px}.doc.landscape{width:1123px;min-height:794px;padding:22px 16px}
.doc .ttl{text-align:center;font-weight:700;font-size:14px;margin:0 0 12px;line-height:1.35}
.doc .meta{margin:0 0 10px;font-size:12.5px}.doc .meta div{display:grid;grid-template-columns:150px 1fr}
.doc .meta2{display:flex;gap:30px;margin:6px 0 8px;font-size:12.5px;flex-wrap:wrap}
.doc table{border-collapse:collapse;width:100%}.doc .g{table-layout:fixed}
.doc .g th,.doc .g td{border:1px solid #000;text-align:center;vertical-align:middle;padding:2px 1px}
.doc .g thead th{background:#dde3fb;font-weight:400;font-size:11px;line-height:1.15}.doc .g thead th b{display:block;font-size:13px}
.doc .g td.day{background:#e6e6e6;font-weight:700;text-align:left;padding-left:6px;font-size:12.5px}
.doc .g td{height:42px}.doc .g td b{display:block;font-size:13px}.doc .g td span{font-size:12px}
.doc .lt{font-weight:700;margin-top:14px;font-size:12.5px}.doc .l{margin-top:4px;font-size:11.5px}
.doc .l th{background:#dde3fb;border:1px solid #000;padding:2px 4px}.doc .l td{border:1px solid #000;padding:1px 4px}.doc .l td.c{text-align:center}
.doc .note{margin:18px 0 0 30px}.doc .sig{display:flex;justify-content:space-between;align-items:flex-end;margin-top:26px;gap:20px}.doc .sig .lf{margin-left:60px;line-height:1.5}.doc .sig .r{text-align:center;margin-left:auto;margin-right:20px;line-height:1.5}
.doc.landscape .g{font-size:8.5px}.doc.landscape .g thead th{font-size:7.5px;padding:1px 0}.doc.landscape .g thead th b{font-size:8px}
.doc.landscape .g thead th.dh{background:#d3d3d3;font-size:14px;font-weight:700}
.doc.landscape .g td{height:30px;padding:0 1px;overflow:hidden}.doc.landscape .g td b{font-size:8.5px;white-space:nowrap;overflow:hidden}
.doc.landscape .g td span{font-size:8px;white-space:nowrap;overflow:hidden;display:block}
.doc.landscape .g td.nm{background:#e6e6e6;font-weight:700;font-size:10px;text-align:left;padding-left:3px;white-space:normal;line-height:1.1}
.doc .g .sep{border-left:2px solid #000}.doc .duty td{height:46px;font-size:12.5px}
.doc.wm-on{position:relative;overflow:hidden}
.doc .wm-top{font:700 10px/1.2 Arial,sans-serif;color:#b91c1c;text-align:center;border-bottom:1px dashed #d42a38;padding:3px 0 5px;margin-bottom:8px;letter-spacing:.6px}
.doc .wm-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2}
.doc .wm-big{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%) rotate(-28deg);font:900 72px/1 Arial,sans-serif;color:rgba(212,42,56,.15);white-space:nowrap;letter-spacing:6px}
.doc .wm-q{position:absolute;font:700 15px/1.2 Arial,sans-serif;color:rgba(212,42,56,.22);transform:rotate(-24deg);white-space:nowrap}
.doc .wm-q1{top:14%;left:6%}.doc .wm-q2{top:18%;right:6%}.doc .wm-q3{bottom:24%;left:8%}.doc .wm-q4{bottom:22%;right:8%}
.doc .wm-q5{top:62%;left:34%;font-size:12px;color:rgba(20,23,28,.16)}
.doc .wm-foot{margin-top:22px;padding:12px 10px;border-top:3px solid #d42a38;border-bottom:3px solid #d42a38;background:rgba(212,42,56,.06);text-align:center;font-family:Arial,sans-serif}
.doc .wm-foot .wm-giant{font-size:44px;font-weight:900;color:#d42a38;letter-spacing:5px;line-height:1.05}
.doc .wm-foot .wm-med{font-size:14px;font-weight:700;color:#14171c;margin-top:4px;letter-spacing:1.2px}
.doc .wm-foot .wm-sm{font-size:10px;color:#555;margin-top:4px;letter-spacing:.4px}`;

  const upTR = s => String(s || '').toLocaleUpperCase('tr');
  const normTR = s => String(s || '').trim().toLocaleLowerCase('tr');
  const rep = S => Object.assign({ mudur: '', gecerli: '', sayi: '', kurum: '', myId: '', paper: 'A4' }, S.report || {}, { mudur: S.school.mudur || (S.report || {}).mudur || '' });
  const donemText = S => S.school.year + (S.school.donem && S.school.donem !== 'Yıllık' ? ' ' + S.school.donem : '');
  const myList = S => S.school.myard || [];
  const fmtD = iso => { if (!iso) return '…/…/……'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
  const wday = iso => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); return ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][d.getDay()]; };
  const kurumAdi = S => { const r = rep(S); return r.kurum || S.school.name; };
  const dutyOf = t => ({ d: t.dutyD === '' || t.dutyD == null ? -1 : +t.dutyD, place: t.dutyP || '' });
  const dutyPlaces = S => { const d = S.duty || {}; return d.places && d.places.length ? d.places : ['Bahçe', 'Koridor']; };

  /* Okul Müdürü, Müdür Yardımcıları ve muaf personel öğretmen nöbeti tutmaz */
  function staffAdminKind(S, t) {
    if (!t) return '';
    if (t.role === 'mudur') return 'mudur';
    if (t.role === 'mudur_yardimcisi') return 'mudur_yardimcisi';
    if (t.role === 'rehber') return 'rehber';
    const tn = normTR(t.name);
    if (tn && S.school.mudur && normTR(S.school.mudur) === tn) return 'mudur';
    if (tn && myList(S).some(m => m.name && normTR(m.name) === tn)) return 'mudur_yardimcisi';
    return '';
  }

  function isDutyExempt(S, t) {
    if (!t) return true;
    if (t.dutyExempt) return true;
    const ak = staffAdminKind(S, t);
    return ak === 'mudur' || ak === 'mudur_yardimcisi' || ak === 'rehber';
  }

  function dutyExemptReason(S, t) {
    const ak = staffAdminKind(S, t);
    if (ak === 'mudur') return 'Okul Müdürü (Nöbet tutmaz)';
    if (ak === 'mudur_yardimcisi') return 'Müdür Yardımcısı (Nöbetçi İdareci)';
    if (ak === 'rehber') return 'Rehber Öğretmen (Muaf)';
    if (t && t.dutyExempt) return 'Nöbetten muaf';
    return '';
  }

  /* MEB Resmi Sosyal Kulüpler + Okulun Eklediği Kulüpler Seçenekleri */
  function clubOptions(S, selected) {
    const custom = Array.isArray(S.customClubs) ? S.customClubs.filter(Boolean) : [];
    const allKnown = new Set([...(EP.SOCIAL_CLUBS || []), ...custom]);
    let h = `<option value="">— Kulüp seçilmedi —</option>`;
    if (selected && !allKnown.has(selected)) {
      h += `<option value="${EP.esc(selected)}" selected>${EP.esc(selected)} (Özel)</option>`;
    }
    for (const g of (EP.SOCIAL_CLUB_GROUPS || [])) {
      h += `<optgroup label="${EP.esc(g.group)}">${g.clubs.map(c => `<option value="${EP.esc(c)}" ${selected === c ? 'selected' : ''}>${EP.esc(c)}</option>`).join('')}</optgroup>`;
    }
    if (custom.length) {
      h += `<optgroup label="Okulun Eklediği Kulüpler">${custom.map(c => `<option value="${EP.esc(c)}" ${selected === c ? 'selected' : ''}>${EP.esc(c)}</option>`).join('')}</optgroup>`;
    }
    return h;
  }

  function clubAuto(S) {
    const pool = [...(EP.SOCIAL_CLUBS || []), ...(S.customClubs || [])];
    const used = new Set(S.teachers.map(t => t.kulup).filter(Boolean));
    let n = 0;
    for (const t of S.teachers) {
      const ak = staffAdminKind(S, t);
      if (ak === 'mudur' || ak === 'mudur_yardimcisi') continue;
      if (t.kulup) continue;
      const pick = pool.find(c => !used.has(c)) || pool[n % pool.length];
      if (pick) { t.kulup = pick; used.add(pick); n++; }
    }
    return n;
  }

  function sigL(S) {
    const r = rep(S), m = myList(S).find(x => x.id === r.myId);
    return m && m.name ? `<div class="lf" style="text-align:center">${EP.esc(m.name)}<br>Müdür Yardımcısı</div>` : '';
  }
  function sigR(S) {
    const r = rep(S);
    return `<div class="r">${EP.esc(r.mudur || '………………………')}<br>Okul Müdürü</div>`;
  }
  function timeHead(S, P, sepFirst) {
    const tm = EP.times(S);
    return Array.from({ length: P }, (_, p) => {
      const x = tm[p].split('–');
      return `<th${sepFirst && p === 0 ? ' class="sep"' : ''}><b>${p + 1}</b>${x[0]}<br>${x[1]}</th>`;
    }).join('');
  }
  function rowCells(G, d, P, fmt, sep) {
    let h = '';
    for (let p = 0; p < P; p++) {
      const c = G[d + '-' + p], cl = sep && p === 0 ? ' class="sep"' : '';
      if (c && c.k === 0) {
        const span = Math.max(1, Math.min(c.len, P - p));
        h += `<td colspan="${span}"${cl}>${fmt(c)}</td>`;
        p += span - 1;
      } else if (c) h += `<td${cl}>${fmt(c)}</td>`;
      else h += `<td${cl}></td>`;
    }
    return h;
  }

  function docClass(S, c, o) {
    const D = +S.school.D, P = +S.school.P, G = o.cG[c.id] || {}, r = rep(S);
    const cards = S.cards.filter(x => x.classId === c.id).sort((a, b) => b.hours - a.hours);
    const tot = cards.reduce((a, x) => a + (+x.hours || 0), 0);
    const rh = S.teachers.find(t => t.id === EP.rehberOf(S, c));
    const fC = cell => { const t = S.teachers.find(z => z.id === cell.card.teacherId); return `<b>${EP.esc(EP.SS(S, cell.card.subj))}</b><span>${EP.esc(EP.tShort(t))}</span>`; };
    return `<section class="doc portrait"><div class="ttl">${EP.esc(kurumAdi(S))}<br>Sınıflar Ders Programı</div>
      <div class="meta"><div><span>Sınıf/Grup</span><span>: ${EP.esc(c.name)}</span></div><div><span>Dönem</span><span>: ${EP.esc(donemText(S))}</span></div><div><span>Toplam Saat</span><span>: ${tot}</span></div><div><span>Sınıf Rehber Öğretmeni</span><span>: ${EP.esc(rh ? rh.name : '-')}</span></div></div>
      <table class="g"><colgroup><col style="width:96px"></colgroup><thead><tr><th></th>${timeHead(S, P)}</tr></thead><tbody>${EP.GUN.slice(0, D).map((g, d) => `<tr><td class="day">${g}</td>${rowCells(G, d, P, fC)}</tr>`).join('')}</tbody></table>
      <table class="l"><thead><tr><th style="width:26px">S</th><th style="width:62px">Ders</th><th>Ders Adı</th><th>Öğretmenler</th><th style="width:70px">Yerleşim</th><th style="width:36px">Saat</th></tr></thead><tbody>${cards.map((x, i) => {
        const t = S.teachers.find(z => z.id === x.teacherId);
        return `<tr><td class="c">${i + 1}</td><td>${EP.esc(EP.SS(S, x.subj))}</td><td>${EP.esc(EP.SN(S, x.subj))}</td><td>${EP.esc(t ? upTR(t.name) : '-')}</td><td class="c">${EP.esc(x.pattern)}</td><td class="c">${x.hours}</td></tr>`;
      }).join('')}</tbody></table>
      <p class="note">Yukarıdaki program ${fmtD(r.gecerli)} ${wday(r.gecerli)} gününden itibaren geçerli olacaktır.</p><div class="sig">${sigL(S)}${sigR(S)}</div></section>`;
  }

  function docTeacher(S, t, o) {
    const D = +S.school.D, P = +S.school.P, G = o.tG[t.id] || {}, r = rep(S);
    const cards = S.cards.filter(x => x.teacherId === t.id).sort((a, b) => EP.cName(S, a.classId).localeCompare(EP.cName(S, b.classId), 'tr') || EP.SS(S, a.subj).localeCompare(EP.SS(S, b.subj), 'tr'));
    const tot = cards.reduce((a, x) => a + (+x.hours || 0), 0);
    const exempt = isDutyExempt(S, t);
    const du = dutyOf(t), rh = S.classes.filter(c => EP.rehberOf(S, c) === t.id).map(c => c.name).join(', ');
    const dutyTxt = exempt ? dutyExemptReason(S, t) : (du.d >= 0 ? upTR(EP.GUN[du.d]) + (du.place ? ' / ' + du.place : '') : '-');
    const fT = cell => `<b>${EP.esc(EP.cName(S, cell.card.classId))}</b><span>${EP.esc(EP.SS(S, cell.card.subj))}</span>`;
    return `<section class="doc portrait"><div class="ttl">${EP.esc(upTR(kurumAdi(S)))} MÜDÜRLÜĞÜ</div>
      <div class="meta"><div><span>Sayı</span><span>: ${EP.esc(r.sayi)}</span></div><div><span>Öğretmen</span><span>: ${EP.esc(upTR(t.name))}</span></div><div><span>Dönem</span><span>: ${EP.esc(donemText(S))}</span></div><div><span>Toplam Saat</span><span>: ${tot}</span></div></div>
      <div class="meta2"><span>Nöbet: ${EP.esc(dutyTxt)}</span><span>Sınıf Rehberliği: ${EP.esc(rh || '-')}</span><span>Sosyal Kulüp: ${EP.esc(t.kulup || '-')}</span></div>
      <table class="g"><colgroup><col style="width:96px"></colgroup><thead><tr><th></th>${timeHead(S, P)}</tr></thead><tbody>${EP.GUN.slice(0, D).map((g, d) => `<tr><td class="day">${g}</td>${rowCells(G, d, P, fT)}</tr>`).join('')}</tbody></table>
      <div class="lt">Ders Listesi:</div><table class="l"><thead><tr><th style="width:26px">S</th><th style="width:62px">Ders</th><th>Ders Adı</th><th>Sınıflar</th><th style="width:70px">Yerleşim</th><th style="width:36px">Saat</th></tr></thead><tbody>${cards.map((x, i) => `<tr><td class="c">${i + 1}</td><td>${EP.esc(EP.SS(S, x.subj))}</td><td class="c">${EP.esc(EP.SN(S, x.subj))}</td><td class="c">${EP.esc(EP.cName(S, x.classId))}</td><td class="c">${EP.esc(x.pattern)}</td><td class="c">${x.hours}</td></tr>`).join('')}</tbody></table>
      <p style="margin-top:10px">Yukarıdaki dersler ${fmtD(r.gecerli)} tarihinden itibaren uygulanacaktır. Bilgilerinizi rica ederim.</p>
      <div class="sig"><div class="lf">${fmtD(r.gecerli)}<br>Aslını Aldım<br>${EP.esc(upTR(t.name))}</div>${sigR(S)}</div></section>`;
  }

  function docSheet(S, kind, o) {
    const D = +S.school.D, P = +S.school.P, ents = kind === 'c' ? S.classes : S.teachers;
    const fC = cell => { const t = S.teachers.find(z => z.id === cell.card.teacherId); return `<b>${EP.esc(EP.SS(S, cell.card.subj))}</b><span>${EP.esc(EP.tShort(t))}</span>`; };
    const fT = cell => `<b>${EP.esc(EP.cName(S, cell.card.classId))}</b><span>${EP.esc(EP.SS(S, cell.card.subj))}</span>`;
    const head = `<thead><tr><th rowspan="2" style="width:${kind === 'c' ? 34 : 92}px"></th>${EP.GUN.slice(0, D).map(g => `<th class="dh sep" colspan="${P}">${g}</th>`).join('')}</tr><tr>${EP.GUN.slice(0, D).map(() => timeHead(S, P, true)).join('')}</tr></thead>`;
    const body = ents.map(e => {
      const G = (kind === 'c' ? o.cG : o.tG)[e.id] || {};
      return `<tr><td class="nm">${EP.esc(kind === 'c' ? e.name : upTR(e.name))}</td>${EP.GUN.slice(0, D).map((g, d) => rowCells(G, d, P, kind === 'c' ? fC : fT, true)).join('')}</tr>`;
    }).join('');
    return `<section class="doc landscape"><div class="ttl" style="font-size:15px">${EP.esc(kurumAdi(S))} - ${kind === 'c' ? 'Sınıflar' : 'Öğretmenler'} Ders Programı · ${EP.esc(donemText(S))}</div><table class="g">${head}<tbody>${body}</tbody></table></section>`;
  }

  function docDuty(S) {
    const D = +S.school.D, r = rep(S), pl = dutyPlaces(S), adm = (S.duty && S.duty.admin) || {};
    const ts = S.teachers.filter(t => !isDutyExempt(S, t) && dutyOf(t).d >= 0);
    const cell = (d, p) => ts.filter(t => dutyOf(t).d === d && (dutyOf(t).place || pl[0]) === p).map(t => EP.esc(upTR(t.name))).join('<br>');
    return `<section class="doc portrait"><div class="ttl">${EP.esc(upTR(kurumAdi(S)))} MÜDÜRLÜĞÜ<br>${EP.esc(S.school.year)} EĞİTİM ÖĞRETİM YILI ${S.school.donem && S.school.donem !== 'Yıllık' ? EP.esc(upTR(S.school.donem)) + ' ' : ''}ÖĞRETMEN NÖBET VE SOSYAL KULÜP ÇİZELGESİ</div>
      <table class="g duty"><thead><tr><th style="width:96px"><b>Gün</b></th>${pl.map(p => `<th><b>${EP.esc(p)}</b></th>`).join('')}<th><b>Nöbetçi İdareci</b></th></tr></thead><tbody>${EP.GUN.slice(0, D).map((g, d) => `<tr><td class="day">${g}</td>${pl.map(p => `<td>${cell(d, p)}</td>`).join('')}<td>${EP.esc(adm[d] || '')}</td></tr>`).join('')}</tbody></table>
      <div class="lt">Öğretmen Nöbet ve Sosyal Kulüp Listesi:</div><table class="l"><thead><tr><th style="width:26px">S</th><th>Adı Soyadı</th><th>Branş</th><th>Nöbet Günü</th><th>Nöbet Yeri</th><th>Sosyal Kulüp</th></tr></thead><tbody>${S.teachers.map((t, i) => {
        const exempt = isDutyExempt(S, t), du = dutyOf(t);
        return `<tr><td class="c">${i + 1}</td><td>${EP.esc(upTR(t.name))}</td><td>${EP.esc(t.branch || '')}</td><td class="c">${exempt ? EP.esc(dutyExemptReason(S, t)) : (du.d >= 0 ? EP.GUN[du.d] : '-')}</td><td class="c">${exempt ? '-' : (du.d >= 0 ? EP.esc(du.place || pl[0]) : '-')}</td><td>${EP.esc(t.kulup || '-')}</td></tr>`;
      }).join('')}</tbody></table>
      <p class="note">Nöbet çizelgesi ${fmtD(r.gecerli)} tarihinden itibaren geçerlidir. Okul müdürü ve müdür yardımcıları öğretmen nöbet yerlerinde görevlendirilmez; müdür yardımcıları nöbetçi idareci olarak görev yapar.</p><div class="sig">${sigL(S)}${sigR(S)}</div></section>`;
  }

  const DUTY_STRATEGIES = [
    ['min_lessons', 'En az dersinin olduğu güne (boş gün hariç)'],
    ['max_lessons', 'En çok dersinin olduğu güne'],
    ['balanced', 'Tüm gün ve nöbet yerlerine dengeli dağıt']
  ];
  const AY_AD = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  function teacherDailyLoads(S, o) {
    const D = +S.school.D || 5, occ = o || EP.occ(S), out = {};
    for (const t of S.teachers) {
      const G = occ.tG[t.id] || {}, arr = Array(D).fill(0);
      for (const k in G) { const d = +k.split('-')[0]; if (d >= 0 && d < D) arr[d]++; }
      out[t.id] = arr;
    }
    return out;
  }

  function dutyAuto(S, opts) {
    const D = +S.school.D || 5, pl = dutyPlaces(S), o = EP.occ(S);
    const dCfg = S.duty = Object.assign({ places: pl, admin: {}, strategy: 'min_lessons', avoidZeroDay: true, month: '', monthlyMode: 'rotate', monthly: {} }, S.duty || {});
    const strategy = (opts && opts.strategy) || dCfg.strategy || 'min_lessons';
    const avoidZeroDay = (opts && opts.avoidZeroDay != null) ? Boolean(opts.avoidZeroDay) : (dCfg.avoidZeroDay !== false);
    const loadsByT = teacherDailyLoads(S, o);
    const cnt = Array.from({ length: D }, () => Array(pl.length).fill(0));

    // 1) İdareciler ve nöbet tutmayan (muaf) öğretmenler öğretmen nöbetinden çıkarılır
    for (const t of S.teachers) {
      if (isDutyExempt(S, t)) { t.dutyD = ''; t.dutyP = ''; }
    }

    // 2) Yalnızca nöbet tutacak öğretmenlere ders programına göre nöbet günü ve yeri dağıtılır
    const eligible = S.teachers.filter(t => !isDutyExempt(S, t));
    const list = eligible.map(t => {
      const a = loadsByT[t.id] || Array(D).fill(0);
      const open = Array.from({ length: D }, (_, d) => Array.from({ length: +S.school.P }, (_, p) => (t.av || {})[d + '-' + p] !== 1).some(Boolean));
      const taughtDays = [...Array(D).keys()].filter(d => a[d] > 0);
      const openDays = [...Array(D).keys()].filter(d => open[d]);
      const days = (avoidZeroDay && taughtDays.length) ? taughtDays : (openDays.length ? openDays : [...Array(D).keys()]);
      return { t, a, days };
    }).filter(x => x.days.length).sort((x, y) => x.days.length - y.days.length);

    let n = 0;
    for (const x of list) {
      const dayTotal = d => cnt[d].reduce((u, v) => u + v, 0);
      let bestDay = x.days[0];

      if (strategy === 'min_lessons') {
        // Önce en az dersinin olduğu gün (en az yoğun nöbet günü eşitlik bozar)
        const minL = Math.min(...x.days.map(d => x.a[d]));
        const nearMin = x.days.filter(d => x.a[d] <= minL + 1);
        bestDay = nearMin.reduce((b, d) => {
          if (x.a[d] !== x.a[b]) return x.a[d] < x.a[b] ? d : b;
          return dayTotal(d) < dayTotal(b) ? d : b;
        }, nearMin[0]);
      } else if (strategy === 'max_lessons') {
        // Önce en çok dersinin olduğu gün (en az yoğun nöbet günü eşitlik bozar)
        const maxL = Math.max(...x.days.map(d => x.a[d]));
        const nearMax = x.days.filter(d => x.a[d] >= maxL - 1);
        bestDay = nearMax.reduce((b, d) => {
          if (x.a[d] !== x.a[b]) return x.a[d] > x.a[b] ? d : b;
          return dayTotal(d) < dayTotal(b) ? d : b;
        }, nearMax[0]);
      } else {
        // Dengeli: en az görevli olan gün, eşitlikte dersi olan/yüksek olan gün
        bestDay = x.days.reduce((b, d) => {
          const s = dayTotal(d), sb = dayTotal(b);
          return s < sb || (s === sb && x.a[d] > x.a[b]) ? d : b;
        }, x.days[0]);
      }

      const pi = cnt[bestDay].indexOf(Math.min(...cnt[bestDay]));
      cnt[bestDay][pi]++;
      x.t.dutyD = String(bestDay);
      x.t.dutyP = pl[pi];
      n++;
    }

    // 3) Müdür yardımcıları yalnızca "Nöbetçi İdareci" sütununa dengeli dağıtılır (Okul Müdürü eklenmez)
    const vps = [...new Set([
      ...myList(S).map(m => (m.name || '').trim()).filter(Boolean),
      ...S.teachers.filter(t => t.role === 'mudur_yardimcisi').map(t => (t.name || '').trim()).filter(Boolean)
    ])];
    if (vps.length) {
      dCfg.admin = dCfg.admin || {};
      for (let d = 0; d < D; d++) dCfg.admin[d] = vps[d % vps.length];
    }
    return n;
  }

  function defaultYearMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function buildMonthlyDuty(S, yearMonth, mode) {
    const ym = yearMonth || (S.duty && S.duty.month) || defaultYearMonth();
    const mMode = mode || (S.duty && S.duty.monthlyMode) || 'rotate';
    const [yr, mo] = ym.split('-').map(Number);
    const D = +S.school.D || 5, pl = dutyPlaces(S);
    const adm = (S.duty && S.duty.admin) || {};
    const eligible = S.teachers.filter(t => !isDutyExempt(S, t) && dutyOf(t).d >= 0);

    // Eğer henüz haftalık nöbet dağıtılmadıysa önce haftalık dağıtımı yap
    if (!eligible.length && S.teachers.some(t => !isDutyExempt(S, t))) {
      dutyAuto(S);
    }
    const assigned = S.teachers.filter(t => !isDutyExempt(S, t) && dutyOf(t).d >= 0);
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const rows = [];
    const weekSeen = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(yr, mo - 1, day, 12, 0, 0);
      const jsDow = dt.getDay(); // 0=Sun, 1=Mon...6=Sat
      const d = jsDow === 0 ? 6 : jsDow - 1; // 0=Pzt..5=Cmt, 6=Paz
      if (d >= D) continue;
      const wIdx = weekSeen[d] || 0;
      weekSeen[d] = wIdx + 1;
      const iso = `${yr}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const posts = {};
      for (const p of pl) posts[p] = [];
      for (const t of assigned) {
        const du = dutyOf(t);
        if (du.d !== d) continue;
        const baseIdx = Math.max(0, pl.indexOf(du.place || pl[0]));
        const targetIdx = mMode === 'rotate' ? (baseIdx + wIdx) % pl.length : baseIdx;
        posts[pl[targetIdx]].push(t.name);
      }
      rows.push({ date: iso, dayNum: day, dow: d, weekNum: wIdx + 1, posts, admin: adm[d] || '' });
    }

    S.duty = S.duty || { places: pl, admin: {}, monthly: {} };
    S.duty.month = ym;
    S.duty.monthlyMode = mMode;
    S.duty.monthly = S.duty.monthly || {};
    S.duty.monthly[ym] = rows;
    return rows;
  }

  function docMonthlyDuty(S, yearMonth, opts) {
    const ym = yearMonth || (S.duty && S.duty.month) || defaultYearMonth();
    const [yr, mo] = ym.split('-').map(Number);
    const pl = dutyPlaces(S), r = rep(S), wm = Boolean(opts && opts.watermark);
    const rows = (S.duty && S.duty.monthly && S.duty.monthly[ym]) || buildMonthlyDuty(S, ym);
    const ayLabel = `${AY_AD[(mo || 1) - 1] || ''} ${yr}`.toLocaleUpperCase('tr');
    const html = `<section class="doc portrait"><div class="ttl">${EP.esc(upTR(kurumAdi(S)))} MÜDÜRLÜĞÜ<br>${EP.esc(ayLabel)} AYI ÖĞRETMEN NÖBET ÇİZELGESİ</div>
      <table class="g" style="font-size:11px"><thead><tr><th style="width:82px"><b>Tarih</b></th><th style="width:74px"><b>Gün</b></th>${pl.map(p => `<th><b>${EP.esc(p)}</b></th>`).join('')}<th><b>Nöbetçi İdareci</b></th></tr></thead><tbody>
      ${rows.map(row => `<tr><td style="height:26px">${fmtD(row.date)}</td><td class="day" style="height:26px;font-size:11px">${EP.GUN[row.dow]}</td>${pl.map(p => `<td style="height:26px;font-size:11px">${((row.posts || {})[p] || []).map(nm => EP.esc(upTR(nm))).join(', ')}</td>`).join('')}<td style="height:26px;font-size:11px">${EP.esc(row.admin || '')}</td></tr>`).join('')}
      </tbody></table>
      <p class="note">Yukarıdaki aylık nöbet çizelgesi ${EP.esc(AY_AD[(mo || 1) - 1] || '')} ${yr} ayı boyunca uygulanacaktır. Okul müdürü, müdür yardımcıları ve nöbetten muaf öğretmenler öğretmen nöbet yerlerinde görevlendirilmemiştir.</p>
      <div class="sig">${sigL(S)}${sigR(S)}</div></section>`;
    return decorateWatermark(html, wm);
  }

  function decorateWatermark(html, watermark) {
    if (!watermark || !html) return html;
    const wmOverlay = `<div class="wm-layer" aria-hidden="true">
      <div class="wm-big">EVRAK PLUS</div>
      <div class="wm-q wm-q1">EVRAK PLUS · evrakplus.com</div>
      <div class="wm-q wm-q2">EVRAK PLUS · ÜYESİZ ÇIKTI</div>
      <div class="wm-q wm-q3">EVRAK PLUS · evrakplus.com</div>
      <div class="wm-q wm-q4">EVRAK PLUS · DERS DAĞITIM</div>
      <div class="wm-q wm-q5">evrakplus.com · EVRAK PLUS · evrakplus.com</div>
    </div>`;
    const wmTop = `<div class="wm-top">EVRAK PLUS · evrakplus.com · EVRAK PLUS · evrakplus.com · Ücretsiz EvrakPlus üyeliği ile filigransız çıktı alabilirsiniz</div>`;
    const wmFoot = `<div class="wm-foot">
      <div class="wm-giant">EVRAK PLUS</div>
      <div class="wm-med">EVRAK PLUS · DERS DAĞITIM PROGRAMI · WWW.EVRAKPLUS.COM</div>
      <div class="wm-sm">EVRAK PLUS · evrakplus.com · Ücretsiz üye girişi yaptığınızda bu büyük ve küçük filigran yazıları otomatik kalkar · EVRAK PLUS</div>
    </div>`;
    return html
      .replace(/<section class="doc (portrait|landscape)">/g, `<section class="doc $1 wm-on">${wmOverlay}${wmTop}`)
      .replace(/<\/section>/g, `${wmFoot}</section>`);
  }

  function docsFor(S, tab, selId, opts) {
    const o = EP.occ(S), wm = Boolean(opts && opts.watermark);
    let raw = '';
    if (tab === 'cp') raw = (selId ? S.classes.filter(c => c.id === selId) : S.classes).map(c => docClass(S, c, o)).join('');
    else if (tab === 'tp') raw = (selId ? S.teachers.filter(t => t.id === selId) : S.teachers).map(t => docTeacher(S, t, o)).join('');
    else if (tab === 'cs') raw = docSheet(S, 'c', o);
    else if (tab === 'ts') raw = docSheet(S, 't', o);
    else if (tab === 'nb') raw = docDuty(S);
    return decorateWatermark(raw, wm);
  }

  function docFile(S, body, title) {
    const paper = rep(S).paper === 'A3' ? 'A3' : 'A4';
    return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>${EP.esc(title)}</title><style>${DOC_CSS}
body{margin:0;background:#fff}.doc{width:auto!important;min-height:0!important;page-break-after:always;break-after:page}.doc:last-child{page-break-after:auto}
@page{size:${paper} portrait;margin:8mm}@page land{size:${paper} landscape;margin:6mm}.doc.landscape{page:land}</style></head><body>${body}</body></html>`;
  }

  function csvExport(S, opts) {
    const D = +S.school.D, P = +S.school.P, o = EP.occ(S), wm = Boolean(opts && opts.watermark);
    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    const head = ['', ...EP.GUN.slice(0, D).flatMap(g => Array.from({ length: P }, (_, p) => g + ' ' + (p + 1)))];
    const rows = [];
    if (wm) rows.push(['EVRAK PLUS · www.evrakplus.com · EVRAK PLUS (Ücretsiz üyelik ile bu satır kalkar)']);
    rows.push(head);
    S.classes.forEach(c => {
      const G = o.cG[c.id] || {};
      rows.push([c.name, ...Array.from({ length: D * P }, (_, s) => {
        const x = G[((s / P) | 0) + '-' + (s % P)];
        return x ? EP.SS(S, x.card.subj) + ' ' + EP.tShort(S.teachers.find(t => t.id === x.card.teacherId)) : '';
      })]);
    });
    rows.push([]);
    S.teachers.forEach(t => {
      const G = o.tG[t.id] || {};
      rows.push([t.name, ...Array.from({ length: D * P }, (_, s) => {
        const x = G[((s / P) | 0) + '-' + (s % P)];
        return x ? EP.cName(S, x.card.classId) + ' ' + EP.SS(S, x.card.subj) : '';
      })]);
    });
    if (wm) {
      rows.push([]);
      rows.push(['EVRAK PLUS', 'EVRAK PLUS', 'WWW.EVRAKPLUS.COM', 'EVRAK PLUS DERS DAĞITIM PROGRAMI']);
    }
    return '\uFEFF' + rows.map(r => r.map(q).join(';')).join('\r\n');
  }

  function excelExport(S, tab, selId, opts) {
    const body = docsFor(S, tab, selId, opts);
    return `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>${DOC_CSS}</style></head><body>${body}</body></html>`;
  }

  function wordExport(S, tab, selId, opts) {
    const body = docsFor(S, tab, selId, opts);
    return `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>${DOC_CSS}</style></head><body>${body}</body></html>`;
  }

  function pngCanvas(S, kind, id, opts) {
    const wm = Boolean(opts && opts.watermark);
    const D = +S.school.D, P = +S.school.P, o = EP.occ(S), tm = EP.times(S), SK = Object.keys(S.subjects || {});
    const e = (kind === 't' ? S.teachers : S.classes).find(x => x.id === id);
    if (!e) return null;
    const G = (kind === 't' ? o.tG : o.cG)[id] || {};
    const W = 1080, lw = 150, top = 200, ch = Math.min(150, Math.floor(1500 / P)), footH = wm ? 190 : 90, Hh = top + P * ch + footH;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
    const x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, Hh);
    x.fillStyle = '#d42a38'; x.fillRect(0, 0, W, 14);
    if (wm) {
      x.fillStyle = '#d42a38'; x.font = '700 18px Inter, Arial'; x.textAlign = 'center';
      x.fillText('EVRAK PLUS · www.evrakplus.com · EVRAK PLUS · Ücretsiz üyelikle filigran kalkar', W / 2, 38);
      x.textAlign = 'left';
    }
    x.fillStyle = '#14171c'; x.font = '600 46px Rubik, Arial'; x.fillText(kind === 't' ? e.name : e.name + ' sınıfı', 48, 92);
    x.font = '26px Inter, Arial'; x.fillStyle = '#5a616c'; x.fillText(S.school.name + ' · ' + S.school.year + ' · haftalık ders programı', 48, 134);
    const cw = (W - 48 - lw - 24) / D;
    x.font = '600 24px Inter, Arial'; x.fillStyle = '#14171c';
    EP.GK.slice(0, D).forEach((g, d) => { x.textAlign = 'center'; x.fillText(EP.GUN[d], 48 + lw + d * cw + cw / 2, top - 22); });
    for (let p = 0; p < P; p++) {
      const y = top + p * ch;
      x.textAlign = 'left'; x.fillStyle = '#14171c'; x.font = '600 26px Inter, Arial'; x.fillText((p + 1) + '. ders', 48, y + ch / 2);
      x.font = '19px Inter, Arial'; x.fillStyle = '#5a616c'; x.fillText(tm[p], 48, y + ch / 2 + 28);
      for (let d = 0; d < D; d++) {
        const c = G[d + '-' + p], cx = 48 + lw + d * cw + 4, cy = y + 4, w = cw - 8, h = ch - 8;
        const i = c ? SK.indexOf(c.card.subj) : -1;
        const pal = EP.VIVID_PALETTE || [];
        const bgCol = c ? (i >= 0 && i < pal.length ? pal[i][0] : `hsl(${Math.round((Math.max(0, i) * 137.5 + 18) % 360)} 90% 78%)`) : '#f0f1f3';
        x.fillStyle = bgCol;
        x.beginPath(); if (x.roundRect) x.roundRect(cx, cy, w, h, 12); else x.rect(cx, cy, w, h); x.fill();
        if (c && i >= 0 && i < pal.length) {
          x.fillStyle = pal[i][1];
          x.fillRect(cx, cy + 8, 7, h - 16);
        }
        if (c) {
          x.fillStyle = '#14171c'; x.textAlign = 'center'; x.font = '700 30px Inter, Arial';
          x.fillText(EP.SS(S, c.card.subj), cx + w / 2, cy + h / 2 - 2);
          x.font = '21px Inter, Arial';
          x.fillText(kind === 't' ? EP.cName(S, c.card.classId) : EP.tShort(S.teachers.find(t => t.id === c.card.teacherId)), cx + w / 2, cy + h / 2 + 28);
        }
      }
    }
    if (wm) {
      // Her yere küçük çapraz EVRAK PLUS yazıları
      x.save();
      x.fillStyle = 'rgba(212, 42, 56, 0.16)';
      x.font = '700 24px Inter, Arial';
      x.textAlign = 'center';
      for (let ry = top + 60; ry < Hh - footH; ry += 220) {
        for (let rx = 200; rx < W; rx += 340) {
          x.save(); x.translate(rx, ry); x.rotate(-0.42);
          x.fillText('EVRAK PLUS · evrakplus.com', 0, 0);
          x.restore();
        }
      }
      // Ortada kocaman çapraz EVRAK PLUS
      x.save(); x.translate(W / 2, top + (P * ch) / 2); x.rotate(-0.46);
      x.fillStyle = 'rgba(212, 42, 56, 0.18)';
      x.font = '900 124px Rubik, Arial';
      x.fillText('EVRAK PLUS', 0, 0);
      x.restore();
      x.restore();

      // Altta KOCAMAN EVRAK PLUS bandı
      const by = Hh - footH + 18;
      x.fillStyle = '#fde7e9'; x.fillRect(36, by, W - 72, 148);
      x.fillStyle = '#d42a38'; x.fillRect(36, by, W - 72, 6); x.fillRect(36, by + 142, W - 72, 6);
      x.textAlign = 'center';
      x.fillStyle = '#d42a38'; x.font = '900 72px Rubik, Arial'; x.fillText('EVRAK PLUS', W / 2, by + 78);
      x.fillStyle = '#14171c'; x.font = '700 22px Inter, Arial'; x.fillText('WWW.EVRAKPLUS.COM · EVRAK PLUS DERS DAĞITIM PROGRAMI', W / 2, by + 110);
      x.fillStyle = '#5a616c'; x.font = '500 16px Inter, Arial'; x.fillText('EVRAK PLUS · Ücretsiz üye girişi yaparak bu filigranları kaldırabilirsiniz · EVRAK PLUS', W / 2, by + 134);
    } else {
      x.textAlign = 'left'; x.font = '18px Inter, Arial'; x.fillStyle = '#8a9099';
      x.fillText('DersMatrix Ultimate · EvrakPlus ile hazırlandı', 48, Hh - 34);
    }
    return cv;
  }

  const RTABS = [
    ['cp', 'Sınıf Programı'], ['cs', 'Sınıf Çarşaf'], ['tp', 'Öğretmen Programı'],
    ['ts', 'Öğretmen Çarşaf'], ['nb', 'Okul Nöbeti ve Sosyal Kulüpler'], ['kq', 'Kalite Raporu']
  ];

  function vQuality(S, o, tot) {
    const q = EP.quality(S), D = +S.school.D;
    const g = q.reduce((a, x) => a + x.gaps, 0), pv = q.reduce((a, x) => a + x.pv, 0);
    const lk = Object.values(S.place || {}).filter(x => x.lock).length;
    return `<div class="kpis">
      <div class="kpi"><small>Yerleşen blok</small><b>${tot - o.un.length}/${tot}</b></div>
      <div class="kpi"><small>Öğretmen boş pencereleri</small><b>${g}</b><span>saat, toplam</span></div>
      <div class="kpi"><small>Tercihen boş ihlali</small><b>${pv}</b></div>
      <div class="kpi"><small>Kilitli blok</small><b>${lk}</b></div>
    </div>
    <div class="card scroll"><h2 style="margin-bottom:8px">Öğretmen yük ve boş pencere raporu</h2>
      <table class="tbl"><thead><tr><th>Öğretmen</th><th class="n">Haftalık</th>${EP.GK.slice(0, D).map(x => `<th class="n">${x}</th>`).join('')}<th class="n">Gün</th><th class="n">Boş pencere</th><th class="n">En uzun ardışık</th><th class="n">Tercih ihlali</th></tr></thead>
      <tbody>${q.map(x => `<tr><td><b>${EP.esc(x.t.name)}</b><br><small class="muted">${EP.esc(x.t.branch || '')}</small></td><td class="n">${x.load}</td>${x.per.map(n => `<td class="n" style="color:${n ? 'inherit' : 'var(--mute)'}">${n}</td>`).join('')}<td class="n">${x.days}</td><td class="n" style="color:${x.gaps ? 'var(--warn)' : 'inherit'}">${x.gaps}</td><td class="n" style="color:${x.maxc >= 6 ? 'var(--warn)' : 'inherit'}">${x.maxc}</td><td class="n" style="color:${x.pv ? 'var(--err)' : 'inherit'}">${x.pv}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function vRapor(S, H, isMember) {
    const tab = (S.ui.rtab && RTABS.some(x => x[0] === S.ui.rtab)) ? S.ui.rtab : 'cp';
    const r = rep(S), o = EP.occ(S), tot = o.m.blocks.length;
    const head = H('Raporlar ve Çıktılar', isMember
      ? 'EvrakPlus üyeliğiniz aktif: tüm PDF, Excel, Word ve PNG çıktılarınız tamamen temiz ve filigransız olarak hazırlanır.'
      : 'Üye olmadan da tüm çıktıları alabilirsiniz (üyesiz çıktılarda EVRAK PLUS filigranı yer alır). Ücretsiz EvrakPlus girişi yaparak filigransız temiz çıktı alabilirsiniz.',
      `<button class="btn pri" data-act="exAllPdf">Tüm Belgeleri PDF İndir (.pdf)</button>`);
    const tabs = `<div class="tabs" style="margin-bottom:12px;display:inline-flex">${RTABS.map(x => `<button data-act="rtab" data-v="${x[0]}" class="${tab === x[0] ? 'on' : ''}">${x[1]}</button>`).join('')}</div>`;
    const sets = `<details class="card" style="margin-bottom:12px;padding:12px 16px" ${!r.mudur || !r.gecerli ? 'open' : ''}><summary>Belge bilgileri ve kağıt ayarı ${!r.mudur || !r.gecerli ? '<span class="tag" style="background:var(--warnBg);color:var(--warn)">eksik</span>' : ''}</summary>
      <div class="fields" style="margin-top:10px">
        <label class="f">Kurum adı (başlıkta)<input data-rep="kurum" value="${EP.esc(r.kurum)}" placeholder="${EP.esc(S.school.name)}"></label>
        <label class="f">Okul müdürü<input data-k="school.mudur" value="${EP.esc(r.mudur)}" placeholder="Ad Soyad"></label>
        <label class="f">Düzenleyen müdür yardımcısı<select data-rep="myId"><option value="">— imza yok —</option>${myList(S).map(m => `<option value="${m.id}" ${r.myId === m.id ? 'selected' : ''}>${EP.esc(m.name || '(adsız)')}</option>`).join('')}</select></label>
        <label class="f">Geçerlilik tarihi<input type="date" data-rep="gecerli" value="${EP.esc(r.gecerli)}"></label>
        <label class="f">Sayı<input data-rep="sayi" value="${EP.esc(r.sayi)}"></label>
        <label class="f">Kağıt boyutu<select data-rep="paper"><option value="A4" ${r.paper !== 'A3' ? 'selected' : ''}>A4</option><option value="A3" ${r.paper === 'A3' ? 'selected' : ''}>A3 (Geniş Çarşaf)</option></select></label>
      </div></details>`;

    if (tab === 'kq') return head + tabs + vQuality(S, o, tot);
    if (!tot && tab !== 'nb') return head + tabs + sets + '<div class="empty">Önce ders ekleyip dağıtım yapın.</div>';

    let ctl = '', sel = '', extraCard = '';
    if (tab === 'cp' || tab === 'tp') {
      const ents = tab === 'cp' ? S.classes : S.teachers, k = tab === 'cp' ? 'rselc' : 'rselt';
      sel = S.ui[k] || ''; if (sel && !ents.some(e => e.id === sel)) sel = '';
      ctl = `<select data-ui="${k}" aria-label="Seçim"><option value="">Tümü (${ents.length})</option>${ents.map(e => `<option value="${e.id}" ${sel === e.id ? 'selected' : ''}>${EP.esc(e.name)}</option>`).join('')}</select>
        <button class="btn pri" data-act="exPdf">PDF İndir (.pdf)</button>
        <button class="btn" data-act="exPrint">Yazdır</button>
        <button class="btn" data-act="exExcel">Excel (.xls)</button>
        <button class="btn" data-act="exWord">Word (.doc)</button>
        <button class="btn" data-act="exPng2" ${sel ? '' : 'disabled title="Önce tek sınıf veya öğretmen seçin"'}>WhatsApp görseli (.png)</button>`;
    } else if (tab === 'cs' || tab === 'ts') {
      ctl = `<button class="btn pri" data-act="exPdf">PDF İndir (.pdf)</button>
        <button class="btn" data-act="exPrint">Yazdır</button>
        <button class="btn" data-act="exExcel">Excel (.xls)</button>
        <button class="btn" data-act="exWord">Word (.doc)</button>
        <button class="btn" data-act="exCsv">Çarşaf tablosu (.csv)</button>`;
    } else if (tab === 'nb') {
      const pl = dutyPlaces(S), adm = (S.duty && S.duty.admin) || {}, D = +S.school.D;
      const vpNames = [...new Set([...myList(S).map(m => m.name), ...S.teachers.filter(t => t.role === 'mudur_yardimcisi').map(t => t.name)].filter(Boolean))];
      ctl = `<button class="btn pri" data-act="exPdf">PDF İndir (.pdf)</button>
        <button class="btn" data-act="exPrint">Yazdır</button>
        <button class="btn" data-act="exWord">Word (.doc)</button>
        <button class="btn" data-act="dutyAuto">Nöbetleri otomatik dağıt</button>
        <button class="btn" data-act="clubAuto">Sosyal kulüpleri dağıt</button>
        <button class="btn ghost" data-act="dutyClear">Nöbetleri temizle</button>`;
      extraCard = `<div class="card" style="margin:12px 0"><h2>Nöbet ve Sosyal Kulüp Düzenleme</h2>
        <div class="msg info" style="margin:8px 0 12px"><span class="ic">i</span><div><b>İdareci nöbet kuralı:</b> Okul müdürü ve müdür yardımcıları öğretmenler gibi bahçe/koridor nöbeti tutmaz. Müdür yardımcıları yalnızca <b>Nöbetçi İdareci</b> sütununa atanır; nöbet muafiyeti olan öğretmenler de işaretlenebilir.</div><span></span></div>
        <div class="fields"><datalist id="mylist">${vpNames.map(n => `<option value="${EP.esc(n)}">`).join('')}</datalist>
          <label class="f" style="grid-column:1/-1">Nöbet yerleri (virgülle)<input data-dplaces="1" value="${EP.esc(pl.join(', '))}"></label>
          ${EP.GUN.slice(0, D).map((g, d) => `<label class="f">${g} nöbetçi idareci<input list="mylist" data-dadmin="${d}" value="${EP.esc(adm[d] || '')}" placeholder="Müdür Yardımcısı"></label>`).join('')}
        </div>
        <div class="row" style="margin-top:12px;gap:8px;align-items:flex-end">
          <label class="f" style="flex:1;min-width:220px">Okula özel sosyal kulüp ekle<input id="newClubName" placeholder="ör. Robotik ve Kodlama Kulübü"></label>
          <button class="btn sm" data-act="addClub">Kulüp ekle</button>
        </div>
        <div class="scroll" style="margin-top:12px"><table class="tbl"><thead><tr><th>Öğretmen / İdareci</th><th>Nöbet Muafiyeti</th><th>Nöbet günü</th><th>Nöbet yeri</th><th>Sınıf rehberliği</th><th>Sosyal kulüp (MEB Listesi)</th></tr></thead><tbody>
        ${S.teachers.map(t => {
          const du = dutyOf(t), ak = staffAdminKind(S, t), exempt = isDutyExempt(S, t);
          return `<tr>
            <td><b>${EP.esc(t.name)}</b><br><small class="muted">${EP.esc(t.branch || '')}${ak ? ' · ' + EP.esc(dutyExemptReason(S, t)) : ''}</small></td>
            <td><label class="row small" style="gap:6px;white-space:nowrap"><input type="checkbox" data-t="${t.id}" data-f="dutyExempt" ${exempt ? 'checked' : ''} ${ak ? 'disabled title="İdareci ve rehber öğretmenler otomatik muaftır"' : ''}> ${exempt ? 'Muaf' : 'Nöbet tutar'}</label></td>
            <td>${exempt ? `<span class="small muted">${EP.esc(dutyExemptReason(S, t))}</span>` : `<select data-t="${t.id}" data-f="dutyD" aria-label="Nöbet günü"><option value="">—</option>${EP.GUN.slice(0, D).map((g, d) => `<option value="${d}" ${du.d === d ? 'selected' : ''}>${g}</option>`).join('')}</select>`}</td>
            <td>${exempt ? '<span class="small muted">—</span>' : `<select data-t="${t.id}" data-f="dutyP" aria-label="Nöbet yeri">${pl.map(p => `<option ${(du.place || pl[0]) === p ? 'selected' : ''}>${EP.esc(p)}</option>`).join('')}</select>`}</td>
            <td class="small">${EP.esc(S.classes.filter(c => EP.rehberOf(S, c) === t.id).map(c => c.name).join(', ') || '-')}</td>
            <td><select data-t="${t.id}" data-f="kulup" style="max-width:260px" aria-label="Sosyal kulüp">${clubOptions(S, t.kulup || '')}</select></td>
          </tr>`;
        }).join('')}</tbody></table></div></div>`;
    }

    const prev = docsFor(S, tab, sel, { watermark: !isMember });
    return head + tabs + sets + `<div class="row" style="margin-bottom:12px">${ctl}</div>` + extraCard + `<div class="paperwrap">${prev}</div>`;
  }

  Object.assign(EP, {
    DOC_CSS, RTABS, DUTY_STRATEGIES, AY_AD, rep, donemText, myList, dutyOf, dutyPlaces,
    staffAdminKind, isDutyExempt, dutyExemptReason, clubOptions, clubAuto,
    teacherDailyLoads, defaultYearMonth, buildMonthlyDuty, docMonthlyDuty,
    docClass, docTeacher, docSheet, docDuty, dutyAuto, docsFor, docFile,
    csvExport, excelExport, wordExport, pngCanvas, vQuality, vRapor
  });
})(typeof window !== 'undefined' ? window : globalThis);
