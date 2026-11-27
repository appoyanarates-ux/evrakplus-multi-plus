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
  const rep = S => Object.assign(
    { mudur: '', gecerli: '', sayi: '', kurum: '', myId: '', paper: 'A4' },
    S.report || {},
    {
      mudur: S.school.mudur || (S.report || {}).mudur || '',
      mudurYardimcisi: S.school.mudurYardimcisi || ''
    }
  );
  const donemText = S => S.school.year + (S.school.donem && S.school.donem !== 'Yıllık' ? ' ' + S.school.donem : '');
  const myList = S => S.school.myard || [];
  const defaultVicePrincipalName = S => {
    const r = rep(S);
    const chosen = myList(S).find(x => x.id === r.myId);
    if (chosen && chosen.name) return chosen.name;
    if (S.school && S.school.mudurYardimcisi && S.school.mudurYardimcisi.trim()) return S.school.mudurYardimcisi.trim();
    const firstListed = myList(S).find(x => x && x.name && x.name.trim());
    return firstListed ? firstListed.name.trim() : '';
  };
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
    if (tn && S.school.mudurYardimcisi && normTR(S.school.mudurYardimcisi) === tn) return 'mudur_yardimcisi';
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
    const nm = defaultVicePrincipalName(S);
    return nm ? `<div class="lf" style="text-align:center">${EP.esc(nm)}<br>Müdür Yardımcısı</div>` : '';
  }
  function sigR(S) {
    const r = rep(S);
    return `<div class="r">${EP.esc(r.mudur || '………………………')}<br>Okul Müdürü</div>`;
  }
  function timeHead(S, P, sepFirst, shift) {
    const tm = EP.times(S, shift);
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
    const fC = cell => {
      const t = S.teachers.find(z => z.id === cell.card.teacherId);
      const t2 = cell.card.coTeacherId && cell.card.coTeacherId !== cell.card.teacherId ? S.teachers.find(z => z.id === cell.card.coTeacherId) : null;
      return `<b>${EP.esc(EP.SS(S, cell.card.subj))}</b><span>${EP.esc(EP.tShort(t))}${t2 ? '+' + EP.esc(EP.tShort(t2)) : ''}</span>`;
    };
    return `<section class="doc portrait"><div class="ttl">${EP.esc(kurumAdi(S))}<br>Sınıflar Ders Programı</div>
      <div class="meta"><div><span>Sınıf/Grup</span><span>: ${EP.esc(c.name)}</span></div><div><span>Dönem</span><span>: ${EP.esc(donemText(S))}</span></div><div><span>Toplam Saat</span><span>: ${tot}</span></div><div><span>Sınıf Rehber Öğretmeni</span><span>: ${EP.esc(rh ? rh.name : '-')}</span></div></div>
      <table class="g"><colgroup><col style="width:96px"></colgroup><thead><tr><th></th>${timeHead(S, P, false, c.shift)}</tr></thead><tbody>${EP.GUN.slice(0, D).map((g, d) => `<tr><td class="day">${g}</td>${rowCells(G, d, P, fC)}</tr>`).join('')}</tbody></table>
      <table class="l"><thead><tr><th style="width:26px">S</th><th style="width:62px">Ders</th><th>Ders Adı</th><th>Öğretmenler</th><th style="width:70px">Yerleşim</th><th style="width:36px">Saat</th></tr></thead><tbody>${cards.map((x, i) => {
        const t = S.teachers.find(z => z.id === x.teacherId);
        const t2 = x.coTeacherId && x.coTeacherId !== x.teacherId ? S.teachers.find(z => z.id === x.coTeacherId) : null;
        const tNames = t ? (upTR(t.name) + (t2 ? ' + ' + upTR(t2.name) : '')) : '-';
        return `<tr><td class="c">${i + 1}</td><td>${EP.esc(EP.SS(S, x.subj))}</td><td>${EP.esc(EP.SN(S, x.subj))}</td><td>${EP.esc(tNames)}</td><td class="c">${EP.esc(x.pattern)}</td><td class="c">${x.hours}</td></tr>`;
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
      <div class="sig"><div class="lf">${fmtD(r.gecerli)}<br>Aslını Aldım<br>${EP.esc(upTR(t.name))}</div>${sigL(S)}${sigR(S)}</div></section>`;
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
    return `<section class="doc landscape"><div class="ttl" style="font-size:15px">${EP.esc(kurumAdi(S))} - ${kind === 'c' ? 'Sınıflar' : 'Öğretmenler'} Ders Programı · ${EP.esc(donemText(S))}</div><table class="g">${head}<tbody>${body}</tbody></table><div class="sig" style="margin-top:10px">${sigL(S)}${sigR(S)}</div></section>`;
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
    ['max_lessons', 'En yoğun (en çok dersli) gününe — eşit ve yığılmasız'],
    ['min_lessons', 'En az dersli gününe — eşit ve yığılmasız (boş gün hariç)'],
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

  /* Min-Cost Max-Flow ile yığılmasız, katmanlı (eşit kapasiteli) ve ders yoğunluğuna göre optimal gün eşleştirme */
  function assignBalancedDutyDays(eligible, loadsByT, D, P, strategy, avoidZeroDay) {
    const M = eligible.length;
    if (!M || D <= 0) return [];
    const SRC = 0, T_OFF = 1, D_OFF = 1 + M, SNK = 1 + M + D, V = SNK + 1;
    const adj = Array.from({ length: V }, () => []);
    const addEdge = (u, v, cap, cost) => {
      const a = { to: v, rev: adj[v].length, cap, cost };
      const b = { to: u, rev: adj[u].length, cap: 0, cost: -cost };
      adj[u].push(a);
      adj[v].push(b);
    };

    for (let i = 0; i < M; i++) {
      addEdge(SRC, T_OFF + i, 1, 0);
      const t = eligible[i];
      const a = loadsByT[t.id] || Array(D).fill(0);
      const open = Array.from({ length: D }, (_, d) => Array.from({ length: P }, (_, p) => (t.av || {})[d + '-' + p] !== 1).some(Boolean));
      const hasTaught = a.some(v => v > 0);
      const hasOpen = open.some(Boolean);

      for (let d = 0; d < D; d++) {
        let penalty = 0;
        if (hasOpen && !open[d]) penalty += 1000000;
        else if (avoidZeroDay && hasTaught && a[d] === 0) penalty += 500000;

        let sc = 0;
        if (strategy === 'max_lessons') sc = a[d] * 100;
        else if (strategy === 'min_lessons') sc = a[d] > 0 ? (30 - Math.min(29, a[d])) * 100 : 0;
        else sc = (a[d] > 0 ? 500 : 0) + a[d] * 10;

        addEdge(T_OFF + i, D_OFF + d, 1, penalty - sc);
      }
    }

    // Her gün için katmanlı (layer) kapasite kenarları:
    // Katman 0 (her güne 1. kişi): 0 ceza; Katman 1 (2. kişi): +100.000; Katman 2 (3. kişi): +200.000 ...
    // Böylece örn. 7 öğretmen 5 güne mutlaka [2,2,1,1,1] şeklinde yığılmasız ve en yoğun günlerine dağıtılır.
    const layers = M;
    for (let d = 0; d < D; d++) {
      for (let k = 0; k < layers; k++) {
        addEdge(D_OFF + d, SNK, 1, k * 100000);
      }
    }

    const INF = 1e15;
    const dist = new Float64Array(V);
    const prevV = new Int32Array(V);
    const prevE = new Int32Array(V);
    const inQ = new Uint8Array(V);

    for (let flow = 0; flow < M; flow++) {
      dist.fill(INF);
      prevV.fill(-1);
      prevE.fill(-1);
      inQ.fill(0);
      dist[SRC] = 0;
      const q = [SRC];
      inQ[SRC] = 1;
      for (let head = 0; head < q.length; head++) {
        const u = q[head];
        inQ[u] = 0;
        const edges = adj[u];
        for (let ei = 0; ei < edges.length; ei++) {
          const e = edges[ei];
          if (e.cap > 0 && dist[u] + e.cost < dist[e.to]) {
            dist[e.to] = dist[u] + e.cost;
            prevV[e.to] = u;
            prevE[e.to] = ei;
            if (!inQ[e.to]) { q.push(e.to); inQ[e.to] = 1; }
          }
        }
      }
      if (prevV[SNK] === -1) break;
      let cur = SNK;
      while (cur !== SRC) {
        const u = prevV[cur], ei = prevE[cur];
        const e = adj[u][ei];
        e.cap -= 1;
        adj[e.to][e.rev].cap += 1;
        cur = u;
      }
    }

    const assignedDay = Array(M).fill(-1);
    for (let i = 0; i < M; i++) {
      for (const e of adj[T_OFF + i]) {
        if (e.to >= D_OFF && e.to < SNK && e.cap === 0) {
          assignedDay[i] = e.to - D_OFF;
          break;
        }
      }
    }
    return assignedDay;
  }

  function dutyAuto(S, opts) {
    const D = +S.school.D || 5, P = +S.school.P || 7, pl = dutyPlaces(S), o = EP.occ(S);
    const dCfg = S.duty = Object.assign({ places: pl, admin: {}, strategy: 'max_lessons', avoidZeroDay: true, reassignClosedDay: true, closedDates: [], month: '', monthlyMode: 'rotate', monthly: {} }, S.duty || {});
    const strategy = (opts && opts.strategy) || dCfg.strategy || 'max_lessons';
    const avoidZeroDay = (opts && opts.avoidZeroDay != null) ? Boolean(opts.avoidZeroDay) : (dCfg.avoidZeroDay !== false);
    const loadsByT = teacherDailyLoads(S, o);
    const cnt = Array.from({ length: D }, () => Array(pl.length).fill(0));

    // 1) İdareciler ve nöbet tutmayan (muaf) öğretmenler öğretmen nöbetinden çıkarılır
    for (const t of S.teachers) {
      if (isDutyExempt(S, t)) { t.dutyD = ''; t.dutyP = ''; }
    }

    // 2) Yalnızca nöbet tutacak öğretmenlere yığılmasız, eşit ve ders yoğunluğuna göre optimal dağıtım (haftada max 1 gün)
    const eligible = S.teachers.filter(t => !isDutyExempt(S, t));
    const daysAssigned = assignBalancedDutyDays(eligible, loadsByT, D, P, strategy, avoidZeroDay);

    let n = 0;
    for (let i = 0; i < eligible.length; i++) {
      const bestDay = daysAssigned[i];
      if (bestDay < 0 || bestDay >= D) continue;
      const pi = cnt[bestDay].indexOf(Math.min(...cnt[bestDay]));
      cnt[bestDay][pi]++;
      eligible[i].dutyD = String(bestDay);
      eligible[i].dutyP = pl[pi];
      n++;
    }

    // 3) Müdür yardımcıları yalnızca "Nöbetçi İdareci" sütununa dengeli dağıtılır (Okul Müdürü eklenmez)
    const vps = [...new Set([
      ...(S.school && S.school.mudurYardimcisi ? [S.school.mudurYardimcisi.trim()] : []),
      ...myList(S).map(m => (m.name || '').trim()).filter(Boolean),
      ...S.teachers.filter(t => t.role === 'mudur_yardimcisi').map(t => (t.name || '').trim()).filter(Boolean)
    ].filter(Boolean))];
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

  function dutyClosedSet(S) {
    return new Set(Array.isArray(S.duty && S.duty.closedDates) ? S.duty.closedDates : []);
  }

  function isoOfDate(dt) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  function weekMondayKey(yr, mo, day) {
    const dt = new Date(yr, mo - 1, day, 12, 0, 0);
    const jsDow = dt.getDay();
    const diff = jsDow === 0 ? -6 : 1 - jsDow;
    dt.setDate(dt.getDate() + diff);
    return isoOfDate(dt);
  }

  function pickDayForTeacher(S, t, candDays, loadsByT, dayLoadCnt, strategy, avoidZeroDay) {
    if (!candDays.length) return -1;
    const D = +S.school.D || 5, P = +S.school.P || 7;
    const a = loadsByT[t.id] || Array(D).fill(0);
    const open = d => Array.from({ length: P }, (_, p) => (t.av || {})[d + '-' + p] !== 1).some(Boolean);
    const taught = candDays.filter(d => a[d] > 0);
    const openCands = candDays.filter(open);
    const days = (avoidZeroDay && taught.length) ? taught : (openCands.length ? openCands : candDays);
    if (!days.length) return -1;
    const tot = d => (dayLoadCnt[d] || 0);
    if (strategy === 'min_lessons') {
      const minL = Math.min(...days.map(d => a[d]));
      const near = days.filter(d => a[d] <= minL + 1);
      return near.reduce((b, d) => (a[d] !== a[b] ? (a[d] < a[b] ? d : b) : (tot(d) < tot(b) ? d : b)), near[0]);
    }
    if (strategy === 'max_lessons') {
      const maxL = Math.max(...days.map(d => a[d]));
      const near = days.filter(d => a[d] >= maxL - 1);
      return near.reduce((b, d) => (a[d] !== a[b] ? (a[d] > a[b] ? d : b) : (tot(d) < tot(b) ? d : b)), near[0]);
    }
    return days.reduce((b, d) => {
      const s = tot(d), sb = tot(b);
      return s < sb || (s === sb && a[d] > a[b]) ? d : b;
    }, days[0]);
  }

  function buildMonthlyDuty(S, yearMonth, mode) {
    const ym = yearMonth || (S.duty && S.duty.month) || defaultYearMonth();
    const mMode = mode || (S.duty && S.duty.monthlyMode) || 'rotate';
    const [yr, mo] = ym.split('-').map(Number);
    const D = +S.school.D || 5, pl = dutyPlaces(S);
    S.duty = Object.assign({ places: pl, admin: {}, strategy: 'min_lessons', avoidZeroDay: true, reassignClosedDay: true, closedDates: [], month: ym, monthlyMode: mMode, monthly: {} }, S.duty || {});
    if (!Array.isArray(S.duty.closedDates)) S.duty.closedDates = [];
    const closedSet = new Set(S.duty.closedDates);
    const strategy = S.duty.strategy || 'min_lessons';
    const avoidZeroDay = S.duty.avoidZeroDay !== false;
    const reassignClosed = S.duty.reassignClosedDay !== false;
    const adm = S.duty.admin || {};

    // Eğer henüz haftalık nöbet dağıtılmadıysa önce ders programına göre haftalık dağıtımı yap
    const preAssigned = S.teachers.filter(t => !isDutyExempt(S, t) && dutyOf(t).d >= 0);
    if (!preAssigned.length && S.teachers.some(t => !isDutyExempt(S, t))) {
      dutyAuto(S);
    }

    const loadsByT = teacherDailyLoads(S, EP.occ(S));
    const eligible = S.teachers.filter(t => !isDutyExempt(S, t));
    const daysInMonth = new Date(yr, mo, 0).getDate();

    // 1) Ayın tüm okul günlerini (Pzt..D) takvim haftalarına göre grupla
    const rows = [];
    const weekOrder = [];
    const weekMap = new Map();

    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(yr, mo - 1, day, 12, 0, 0);
      const jsDow = dt.getDay(); // 0=Paz, 1=Pzt..6=Cmt
      const d = jsDow === 0 ? 6 : jsDow - 1;
      if (d >= D) continue;
      const iso = `${yr}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const wKey = weekMondayKey(yr, mo, day);
      if (!weekMap.has(wKey)) {
        weekOrder.push(wKey);
        weekMap.set(wKey, []);
      }
      const posts = {};
      for (const p of pl) posts[p] = [];
      const isClosed = closedSet.has(iso);
      const row = {
        date: iso,
        dayNum: day,
        dow: d,
        weekKey: wKey,
        weekNum: weekOrder.indexOf(wKey) + 1,
        closed: isClosed,
        posts,
        admin: isClosed ? '' : (adm[d] || '')
      };
      rows.push(row);
      weekMap.get(wKey).push(row);
    }

    // 2) Her takvim haftası için KESİN KURAL: Bir öğretmen haftada EN FAZLA 1 GÜN nöbet tutar!
    weekOrder.forEach((wKey, wIdx) => {
      const wRows = weekMap.get(wKey) || [];
      const openRows = wRows.filter(r => !r.closed);
      if (!openRows.length) return;
      const openByDow = new Map(openRows.map(r => [r.dow, r]));
      const usedInWeek = new Set(); // Bu haftada nöbet verilen öğretmen ID'leri (en fazla 1 gün!)
      const dayLoadCnt = {};
      const postLoad = {};
      for (const r of openRows) {
        dayLoadCnt[r.dow] = 0;
        postLoad[r.dow] = pl.map(() => 0);
      }

      // Aşama A: Haftalık nöbet günü bu haftada AÇIK olan öğretmenleri yerleştir
      const deferred = [];
      for (const t of eligible) {
        if (usedInWeek.has(t.id)) continue;
        const du = dutyOf(t);
        if (du.d >= 0 && openByDow.has(du.d)) {
          const targetRow = openByDow.get(du.d);
          const baseIdx = Math.max(0, pl.indexOf(du.place || pl[0]));
          const pi = mMode === 'rotate' ? (baseIdx + wIdx) % pl.length : baseIdx;
          targetRow.posts[pl[pi]].push(t.name);
          usedInWeek.add(t.id);
          dayLoadCnt[du.d]++;
          postLoad[du.d][pi]++;
        } else {
          deferred.push(t);
        }
      }

      // Aşama B: Günü kapalı/tatile denk gelen (veya haftalık günü atanmamış) öğretmenleri,
      // seçenek açıksa bu haftanın ders programına uygun BAŞKA bir açık gününe kaydır (yine haftada max 1 gün!)
      if (reassignClosed && deferred.length) {
        const openDows = openRows.map(r => r.dow);
        for (const t of deferred) {
          if (usedInWeek.has(t.id)) continue;
          const bestD = pickDayForTeacher(S, t, openDows, loadsByT, dayLoadCnt, strategy, avoidZeroDay);
          if (bestD < 0 || !openByDow.has(bestD)) continue;
          const targetRow = openByDow.get(bestD);
          const pArr = postLoad[bestD];
          const minP = Math.min(...pArr);
          const pi = pArr.indexOf(minP);
          targetRow.posts[pl[pi]].push(t.name);
          usedInWeek.add(t.id);
          dayLoadCnt[bestD]++;
          pArr[pi]++;
        }
      }
    });

    S.duty.month = ym;
    S.duty.monthlyMode = mMode;
    S.duty.monthly = S.duty.monthly || {};
    S.duty.monthly[ym] = rows;
    return rows;
  }

  function toggleDutyClosedDate(S, iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    S.duty = Object.assign({ places: dutyPlaces(S), admin: {}, closedDates: [], monthly: {} }, S.duty || {});
    if (!Array.isArray(S.duty.closedDates)) S.duty.closedDates = [];
    const idx = S.duty.closedDates.indexOf(iso);
    let closedNow = false;
    if (idx >= 0) {
      S.duty.closedDates.splice(idx, 1);
      closedNow = false;
    } else {
      S.duty.closedDates.push(iso);
      S.duty.closedDates.sort();
      closedNow = true;
    }
    const ym = iso.slice(0, 7);
    buildMonthlyDuty(S, ym, S.duty.monthlyMode || 'rotate');
    return closedNow;
  }

  function clearMonthClosedDates(S, ym) {
    if (!S.duty || !Array.isArray(S.duty.closedDates)) return 0;
    const before = S.duty.closedDates.length;
    S.duty.closedDates = S.duty.closedDates.filter(d => !String(d).startsWith(ym + '-'));
    const removed = before - S.duty.closedDates.length;
    buildMonthlyDuty(S, ym, S.duty.monthlyMode || 'rotate');
    return removed;
  }

  /* MEB Resmî Tatil & Ara Tatil Kataloğu (Yıllık Sabit + 2025/2026–2026/2027) */
  const FIXED_TR_HOLIDAYS = {
    '01-01': 'Yılbaşı',
    '04-23': '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı',
    '05-01': 'Emek ve Dayanışma Günü',
    '05-19': '19 Mayıs Atatürk’ü Anma, Gençlik ve Spor Bayramı',
    '07-15': '15 Temmuz Demokrasi ve Millî Birlik Günü',
    '08-30': '30 Ağustos Zafer Bayramı',
    '10-29': '29 Ekim Cumhuriyet Bayramı'
  };
  const MEB_BREAK_RANGES = [
    ['2025-11-10', '2025-11-14', '1. Dönem Ara Tatili'],
    ['2026-01-19', '2026-01-30', 'Yarıyıl Tatili'],
    ['2026-03-16', '2026-03-20', '2. Dönem Ara Tatili'],
    ['2026-05-27', '2026-05-30', 'Kurban Bayramı'],
    ['2026-11-09', '2026-11-13', '1. Dönem Ara Tatili'],
    ['2027-01-18', '2027-01-29', 'Yarıyıl Tatili'],
    ['2027-03-15', '2027-03-19', '2. Dönem Ara Tatili']
  ];

  function mebHolidaysForMonth(ym) {
    const [yr, mo] = String(ym || defaultYearMonth()).split('-').map(Number);
    if (!yr || !mo) return [];
    const daysInMo = new Date(yr, mo, 0).getDate();
    const hits = [];
    for (let day = 1; day <= daysInMo; day++) {
      const mmdd = `${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const iso = `${yr}-${mmdd}`;
      if (FIXED_TR_HOLIDAYS[mmdd]) {
        hits.push({ date: iso, label: FIXED_TR_HOLIDAYS[mmdd] });
        continue;
      }
      const brk = MEB_BREAK_RANGES.find(([s, e]) => iso >= s && iso <= e);
      if (brk) hits.push({ date: iso, label: brk[2] });
    }
    return hits;
  }

  function applyMebHolidaysForMonth(S, yearMonth) {
    const ym = yearMonth || (S.duty && S.duty.month) || defaultYearMonth();
    const hits = mebHolidaysForMonth(ym);
    S.duty = Object.assign({ places: dutyPlaces(S), admin: {}, closedDates: [], monthly: {} }, S.duty || {});
    if (!Array.isArray(S.duty.closedDates)) S.duty.closedDates = [];
    const set = new Set(S.duty.closedDates);
    let added = 0;
    for (const h of hits) {
      if (!set.has(h.date)) { set.add(h.date); added++; }
    }
    S.duty.closedDates = [...set].sort();
    buildMonthlyDuty(S, ym, S.duty.monthlyMode || 'rotate');
    return { total: hits.length, added, items: hits };
  }

  /* MEB Haftalık / Aylık Otomatik Ek Ders Ön Hesap Özeti */
  function computeEkDers(S) {
    const L = EP.loads(S);
    const rows = (S.teachers || []).map(t => {
      const ak = staffAdminKind(S, t);
      const dersSaati = Number(L[t.id] || 0);
      const isVocational = /meslek|alan|atölye/i.test(t.branch || '');
      const isSinifOgr = /sınıf öğretmenliği/i.test(t.branch || '');
      const maasKarsiligi = (ak === 'mudur' || ak === 'mudur_yardimcisi')
        ? 6
        : ak === 'rehber'
          ? 0
          : isVocational ? 20 : isSinifOgr ? 18 : 15;
      const gunduzEkDers = ak === 'rehber'
        ? 18
        : (ak === 'mudur' ? 25 : ak === 'mudur_yardimcisi' ? 19 : Math.max(0, dersSaati - maasKarsiligi));
      const hazirlikPlanlama = (ak === 'mudur' || ak === 'mudur_yardimcisi' || ak === 'rehber')
        ? 0
        : Math.floor(dersSaati / 10);
      const hasRehberlik = (S.classes || []).some(c => EP.rehberOf(S, c) === t.id);
      const hasKulup = Boolean(t.kulup && String(t.kulup).trim());
      const rehberlikKulup = (ak === 'mudur' || ak === 'mudur_yardimcisi' || ak === 'rehber')
        ? 0
        : ((hasRehberlik || hasKulup) ? 2 : 0);
      const hasDuty = !isDutyExempt(S, t) && dutyOf(t).d >= 0;
      const nobetEkDers = hasDuty ? 3 : 0;
      const haftalikToplam = gunduzEkDers + hazirlikPlanlama + rehberlikKulup + nobetEkDers;
      const aylikTahmini = haftalikToplam * 4;
      return {
        teacher: t,
        adminKind: ak,
        dersSaati,
        maasKarsiligi,
        gunduzEkDers,
        hazirlikPlanlama,
        rehberlikKulup,
        nobetEkDers,
        haftalikToplam,
        aylikTahmini
      };
    });
    const totals = rows.reduce((acc, r) => {
      acc.dersSaati += r.dersSaati;
      acc.gunduzEkDers += r.gunduzEkDers;
      acc.hazirlikPlanlama += r.hazirlikPlanlama;
      acc.rehberlikKulup += r.rehberlikKulup;
      acc.nobetEkDers += r.nobetEkDers;
      acc.haftalikToplam += r.haftalikToplam;
      acc.aylikTahmini += r.aylikTahmini;
      return acc;
    }, { dersSaati: 0, gunduzEkDers: 0, hazirlikPlanlama: 0, rehberlikKulup: 0, nobetEkDers: 0, haftalikToplam: 0, aylikTahmini: 0 });
    return { rows, totals };
  }

  function docEkDers(S) {
    const r = rep(S), { rows, totals } = computeEkDers(S);
    return `<section class="doc portrait"><div class="ttl">${EP.esc(upTR(kurumAdi(S)))} MÜDÜRLÜĞÜ<br>${EP.esc(S.school.year)} EĞİTİM ÖĞRETİM YILI HAFTALIK / AYLIK EK DERS ÖN HESAP ÖZETİ</div>
      <div class="meta"><div><span>Dönem</span><span>: ${EP.esc(donemText(S))}</span></div><div><span>Personel Sayısı</span><span>: ${rows.length}</span></div><div><span>Geçerlilik</span><span>: ${fmtD(r.gecerli)}</span></div><div><span>Haftalık Toplam Ek Ders</span><span>: ${totals.haftalikToplam} saat</span></div></div>
      <table class="l" style="margin-top:8px">
        <thead><tr>
          <th style="width:24px">S</th><th>Adı Soyadı</th><th>Branş / Görev</th>
          <th style="width:44px">Ders</th><th style="width:44px">Maaş</th><th style="width:48px">Ek Ders</th>
          <th style="width:44px">Haz.Pl.</th><th style="width:48px">Reh/Klp</th><th style="width:44px">Nöbet</th>
          <th style="width:52px">Haftalık</th><th style="width:54px">Aylık (×4)</th>
        </tr></thead>
        <tbody>
          ${rows.map((x, i) => `<tr>
            <td class="c">${i + 1}</td>
            <td><b>${EP.esc(upTR(x.teacher.name))}</b></td>
            <td>${EP.esc(x.teacher.branch || '')}${x.adminKind ? ' · ' + EP.esc(dutyExemptReason(S, x.teacher)) : ''}</td>
            <td class="c">${x.dersSaati}</td>
            <td class="c">${x.maasKarsiligi}</td>
            <td class="c">${x.gunduzEkDers}</td>
            <td class="c">${x.hazirlikPlanlama}</td>
            <td class="c">${x.rehberlikKulup}</td>
            <td class="c">${x.nobetEkDers}</td>
            <td class="c"><b>${x.haftalikToplam}</b></td>
            <td class="c"><b>${x.aylikTahmini}</b></td>
          </tr>`).join('')}
          <tr style="background:#f2f4f7;font-weight:700">
            <td colspan="3" style="text-align:right">GENEL TOPLAM</td>
            <td class="c">${totals.dersSaati}</td>
            <td class="c">—</td>
            <td class="c">${totals.gunduzEkDers}</td>
            <td class="c">${totals.hazirlikPlanlama}</td>
            <td class="c">${totals.rehberlikKulup}</td>
            <td class="c">${totals.nobetEkDers}</td>
            <td class="c">${totals.haftalikToplam}</td>
            <td class="c">${totals.aylikTahmini}</td>
          </tr>
        </tbody>
      </table>
      <p class="note">Bu tablo bilgilendirme amaçlı MEB ek ders ön hesap özetidir: Kültür branşları 15 sa, Meslek/Alan 20 sa, Sınıf Öğretmenliği 18 sa maaş karşılığı; her 10 fiilî ders saatine 1 saat Hazırlık ve Planlama; Sınıf Rehberliği veya Sosyal Kulüp görevi için +2 saat; fiilî okul nöbeti için +3 saat esas alınmıştır. KBS kesin tahakkuk öncesi idarece kontrol edilmelidir.</p>
      <div class="sig">${sigL(S)}${sigR(S)}</div></section>`;
  }

  function checkMonthlyWeekDup(rows, rowIdx, place, names) {
    const row = rows && rows[rowIdx];
    if (!row || !Array.isArray(names) || !names.length) return null;
    const norm = s => String(s || '').trim().toLocaleLowerCase('tr');
    const seenSelf = new Set();
    for (const nm of names) {
      const k = norm(nm);
      if (!k) continue;
      if (seenSelf.has(k)) return { name: nm, date: row.date, dow: row.dow, sameDay: true };
      seenSelf.add(k);
    }
    const wKey = row.weekKey || String(row.weekNum);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.closed) continue;
      if ((r.weekKey || String(r.weekNum)) !== wKey) continue;
      for (const [p, arr] of Object.entries(r.posts || {})) {
        if (i === rowIdx && p === place) continue;
        for (const ex of (arr || [])) {
          const ek = norm(ex);
          if (ek && seenSelf.has(ek)) {
            return { name: ex, date: r.date, dow: r.dow, sameDay: i === rowIdx };
          }
        }
      }
    }
    return null;
  }

  function docMonthlyDuty(S, yearMonth, opts) {
    const ym = yearMonth || (S.duty && S.duty.month) || defaultYearMonth();
    const [yr, mo] = ym.split('-').map(Number);
    const pl = dutyPlaces(S), r = rep(S), wm = Boolean(opts && opts.watermark);
    const rows = (S.duty && S.duty.monthly && S.duty.monthly[ym]) || buildMonthlyDuty(S, ym);
    const ayLabel = `${AY_AD[(mo || 1) - 1] || ''} ${yr}`.toLocaleUpperCase('tr');
    const html = `<section class="doc portrait"><div class="ttl">${EP.esc(upTR(kurumAdi(S)))} MÜDÜRLÜĞÜ<br>${EP.esc(ayLabel)} AYI ÖĞRETMEN NÖBET ÇİZELGESİ</div>
      <table class="g" style="font-size:11px"><thead><tr><th style="width:82px"><b>Tarih</b></th><th style="width:74px"><b>Gün</b></th>${pl.map(p => `<th><b>${EP.esc(p)}</b></th>`).join('')}<th><b>Nöbetçi İdareci</b></th></tr></thead><tbody>
      ${rows.map(row => row.closed
        ? `<tr style="background:#f5f5f5;color:#777"><td style="height:24px">${fmtD(row.date)}</td><td class="day" style="height:24px;font-size:11px">${EP.GUN[row.dow]}</td><td colspan="${pl.length + 1}" style="height:24px;font-size:11px;font-style:italic">KAPALI / TATİL GÜNÜ (Nöbet yazılmaz)</td></tr>`
        : `<tr><td style="height:26px">${fmtD(row.date)}</td><td class="day" style="height:26px;font-size:11px">${EP.GUN[row.dow]}</td>${pl.map(p => `<td style="height:26px;font-size:11px">${((row.posts || {})[p] || []).map(nm => EP.esc(upTR(nm))).join(', ')}</td>`).join('')}<td style="height:26px;font-size:11px">${EP.esc(row.admin || '')}</td></tr>`).join('')}
      </tbody></table>
      <p class="note">Yukarıdaki aylık nöbet çizelgesi ${EP.esc(AY_AD[(mo || 1) - 1] || '')} ${yr} ayı boyunca uygulanacaktır. Her öğretmen bir haftada en fazla 1 gün nöbet tutar; kapalı/tatil günlerine nöbet yazılmaz. Okul müdürü, müdür yardımcıları ve nöbetten muaf öğretmenler öğretmen nöbet yerlerinde görevlendirilmemiştir.</p>
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
    else if (tab === 'ek') raw = docEkDers(S);
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
    const mgrParts = [S.school.mudur ? 'Okul Müdürü: ' + S.school.mudur : '', defaultVicePrincipalName(S) ? 'Md. Yrd.: ' + defaultVicePrincipalName(S) : ''].filter(Boolean).join(' · ');
    x.font = '24px Inter, Arial'; x.fillStyle = '#5a616c'; x.fillText(kurumAdi(S) + ' · ' + donemText(S) + ' · haftalık ders programı', 48, 130);
    if (mgrParts) {
      x.font = '19px Inter, Arial'; x.fillStyle = '#6c7380'; x.fillText(mgrParts, 48, 160);
    }
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
    ['ts', 'Öğretmen Çarşaf'], ['nb', 'Okul Nöbeti ve Sosyal Kulüpler'], ['ek', 'Ek Ders Özeti'], ['kq', 'Kalite Raporu']
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
      <tbody>${q.map(x => {
        const gapPill = x.gaps === 0 ? 'ok' : x.gaps <= 2 ? 'warn' : 'err';
        return `<tr><td><button type="button" class="tlink" data-act="openTeacherTT" data-id="${EP.esc(x.t.id)}" title="Bu öğretmenin haftalık ders programını aç">${EP.esc(x.t.name)}</button><br><small class="muted">${EP.esc(x.t.branch || '')}</small></td><td class="n"><b>${x.load}</b></td>${x.per.map(n => `<td class="n" style="color:${n ? 'inherit' : 'var(--mute)'}">${n}</td>`).join('')}<td class="n">${x.days}</td><td class="n"><span class="pill ${gapPill}">${x.gaps}</span></td><td class="n" style="color:${x.maxc >= 6 ? 'var(--warn)' : 'inherit'}">${x.maxc}</td><td class="n" style="color:${x.pv ? 'var(--err)' : 'inherit'}">${x.pv}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }

  function vRapor(S, H, isMember) {
    const tab = (S.ui.rtab && RTABS.some(x => x[0] === S.ui.rtab)) ? S.ui.rtab : 'cp';
    const r = rep(S), o = EP.occ(S), tot = o.m.blocks.length;
    const head = H('Raporlar ve Çıktılar', isMember
      ? 'EvrakPlus üyeliğiniz aktif: tüm PDF, Yazdır, Word ve WhatsApp PNG çıktılarınız tamamen temiz ve filigransız olarak hazırlanır.'
      : 'Üye olmadan da tüm çıktıları alabilirsiniz (üyesiz çıktılarda EVRAK PLUS filigranı yer alır). Ücretsiz EvrakPlus girişi yaparak filigransız temiz çıktı alabilirsiniz.',
      `<button class="btn pri" data-act="exAllPdf">Tüm Belgeleri PDF İndir (.pdf)</button>`);
    const tabs = `<div class="tabs" style="margin-bottom:12px;display:inline-flex">${RTABS.map(x => `<button data-act="rtab" data-v="${x[0]}" class="${tab === x[0] ? 'on' : ''}">${x[1]}</button>`).join('')}</div>`;
    const vpCur = defaultVicePrincipalName(S);
    const sets = `<details class="card" id="repSets" data-details-ui="repSetsOpen" style="margin-bottom:12px;padding:12px 16px" ${S.ui.repSetsOpen ? 'open' : ''}><summary>Belge bilgileri ve kağıt ayarı <span class="small muted">· Okul Ayarları’ndan otomatik gelir</span> ${!r.mudur || !r.gecerli ? '<span class="tag" style="background:var(--warnBg);color:var(--warn)">eksik</span>' : ''}</summary>
      <div class="fields" style="margin-top:10px">
        <label class="f">Kurum adı (başlıkta)<input data-rep="kurum" value="${EP.esc(r.kurum)}" placeholder="${EP.esc(S.school.name)}"></label>
        <label class="f">Okul müdürü<input data-k="school.mudur" value="${EP.esc(r.mudur)}" placeholder="Ad Soyad"></label>
        <label class="f">Müdür yardımcısı (imza)<input data-k="school.mudurYardimcisi" value="${EP.esc(S.school.mudurYardimcisi || '')}" placeholder="${EP.esc(vpCur || 'Ad Soyad')}"></label>
        <label class="f">Geçerlilik tarihi<div class="row" style="gap:6px;flex-wrap:nowrap"><input type="date" min="2000-01-01" max="2099-12-31" data-rep="gecerli" value="${EP.esc(r.gecerli)}" style="flex:1;min-width:130px"><button type="button" class="btn sm ghost" data-act="setRepToday" title="Bugünün tarihini yaz">Bugün</button></div></label>
        <label class="f">Sayı<input data-rep="sayi" value="${EP.esc(r.sayi)}"></label>
        <label class="f">Kağıt boyutu<select data-rep="paper"><option value="A4" ${r.paper !== 'A3' ? 'selected' : ''}>A4</option><option value="A3" ${r.paper === 'A3' ? 'selected' : ''}>A3 (Geniş Çarşaf)</option></select></label>
      </div></details>`;

    if (tab === 'kq') return head + tabs + vQuality(S, o, tot);
    if (!tot && tab !== 'nb' && tab !== 'ek') return head + tabs + sets + '<div class="empty">Önce ders ekleyip dağıtım yapın.</div>';

    // Sınıflar ve Öğretmenler için ayrı ayrı WhatsApp Görseli kartı
    const waClsId = S.ui.waCls && S.classes.some(c => c.id === S.ui.waCls) ? S.ui.waCls : (S.classes[0] ? S.classes[0].id : '');
    const waTchId = S.ui.waTch && S.teachers.some(t => t.id === S.ui.waTch) ? S.ui.waTch : (S.teachers[0] ? S.teachers[0].id : '');
    const waCard = tab !== 'nb' ? `<div class="card" style="margin-bottom:12px;padding:12px 16px">
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <div>
          <h3 style="margin:0">WhatsApp Görselleri (.png) — Sınıflar ve Öğretmenler Ayrı Ayrı</h3>
          <p class="small muted" style="margin-top:2px">Sınıf veya öğretmen programlarını yüksek çözünürlüklü, renkli WhatsApp paylaşım görseli (PNG) olarak tek tek indirin ya da toplu olarak tek klasöre / ZIP arşivine kaydedin.</p>
        </div>
      </div>
      <div class="grid2" style="gap:10px">
        <div class="wa-box">
          <div><b class="small" style="display:block;margin-bottom:4px">Sınıflar WhatsApp Görseli</b>
            <select data-ui="waCls" style="width:100%">${S.classes.map(c => `<option value="${c.id}" ${waClsId === c.id ? 'selected' : ''}>${EP.esc(c.name)}</option>`).join('')}</select>
          </div>
          <div class="row" style="gap:6px">
            <button class="btn sm" data-act="waSingle" data-kind="c" ${waClsId ? '' : 'disabled'}>Sınıf Görseli (.png)</button>
            <button class="btn sm ghost" data-act="waBatch" data-kind="c" ${S.classes.length ? '' : 'disabled'}>Tüm Sınıflar (${S.classes.length})</button>
          </div>
        </div>
        <div class="wa-box">
          <div><b class="small" style="display:block;margin-bottom:4px">Öğretmenler WhatsApp Görseli</b>
            <select data-ui="waTch" style="width:100%">${S.teachers.map(t => `<option value="${t.id}" ${waTchId === t.id ? 'selected' : ''}>${EP.esc(t.name)}</option>`).join('')}</select>
          </div>
          <div class="row" style="gap:6px">
            <button class="btn sm" data-act="waSingle" data-kind="t" ${waTchId ? '' : 'disabled'}>Öğretmen Görseli (.png)</button>
            <button class="btn sm ghost" data-act="waBatch" data-kind="t" ${S.teachers.length ? '' : 'disabled'}>Tüm Öğretmenler (${S.teachers.length})</button>
          </div>
        </div>
      </div>
    </div>` : '';

    let ctl = '', sel = '', extraCard = '';
    if (tab === 'cp' || tab === 'tp') {
      const ents = tab === 'cp' ? S.classes : S.teachers, k = tab === 'cp' ? 'rselc' : 'rselt';
      sel = S.ui[k] || ''; if (sel && !ents.some(e => e.id === sel)) sel = '';
      ctl = `<select data-ui="${k}" aria-label="Seçim"><option value="">Tümü (${ents.length})</option>${ents.map(e => `<option value="${e.id}" ${sel === e.id ? 'selected' : ''}>${EP.esc(e.name)}</option>`).join('')}</select>
        <button class="btn pri" data-act="exPdf">PDF İndir (.pdf)</button>
        <button class="btn" data-act="exPrint">Yazdır</button>
        <button class="btn" data-act="exWord">Word (.doc)</button>`;
    } else if (tab === 'cs' || tab === 'ts') {
      ctl = `<button class="btn pri" data-act="exPdf">PDF İndir (.pdf)</button>
        <button class="btn" data-act="exPrint">Yazdır</button>
        <button class="btn" data-act="exWord">Word (.doc)</button>
        <button class="btn" data-act="exCsv">Çarşaf tablosu (.csv)</button>`;
    } else if (tab === 'ek') {
      ctl = `<button class="btn pri" data-act="exPdf">Ek Ders PDF İndir (.pdf)</button>
        <button class="btn" data-act="exPrint">Yazdır</button>
        <button class="btn" data-act="exWord">Word (.doc)</button>`;
    } else if (tab === 'nb') {
      const pl = dutyPlaces(S), adm = (S.duty && S.duty.admin) || {}, D = +S.school.D;
      const vpNames = [...new Set([...myList(S).map(m => m.name), S.school.mudurYardimcisi, ...S.teachers.filter(t => t.role === 'mudur_yardimcisi').map(t => t.name)].filter(Boolean))];
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
    return head + tabs + sets + waCard + `<div class="row" style="margin-bottom:12px">${ctl}</div>` + extraCard + `<div class="paperwrap">${prev}</div>`;
  }

  /* Sıfır bağımlılıklı PKZIP (store / UTF-8) arşiv üretici — Web toplu WhatsApp PNG ZIP indirme */
  let _crcTable = null;
  function crc32(bytes) {
    if (!_crcTable) {
      _crcTable = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        _crcTable[i] = c >>> 0;
      }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc = _crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function encodeUtf8(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(String(str));
    const s = unescape(encodeURIComponent(String(str)));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function buildZipBytes(entries) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const now = new Date();
    const dosTime = ((now.getHours() & 31) << 11) | ((now.getMinutes() & 63) << 5) | ((now.getSeconds() >> 1) & 31);
    const dosDate = (((Math.max(1980, now.getFullYear()) - 1980) & 127) << 9) | (((now.getMonth() + 1) & 15) << 5) | (now.getDate() & 31);

    for (const ent of entries || []) {
      const nameBytes = encodeUtf8(ent.name || 'dosya.bin');
      const data = ent.data instanceof Uint8Array ? ent.data : new Uint8Array(ent.data || []);
      const crc = crc32(data);
      const size = data.length;

      const lfh = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(lfh.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true); // UTF-8 filename flag
      lv.setUint16(8, 0, true); // store (PNG already compressed)
      lv.setUint16(10, dosTime, true);
      lv.setUint16(12, dosDate, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      lfh.set(nameBytes, 30);

      localParts.push(lfh, data);

      const cdh = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cdh.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, dosTime, true);
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      cdh.set(nameBytes, 46);
      centralParts.push(cdh);

      offset += lfh.length + data.length;
    }

    const cdSize = centralParts.reduce((a, b) => a + b.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, centralParts.length, true);
    ev.setUint16(10, centralParts.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    const totalLen = offset + cdSize + eocd.length;
    const out = new Uint8Array(totalLen);
    let pos = 0;
    for (const p of localParts) { out.set(p, pos); pos += p.length; }
    for (const p of centralParts) { out.set(p, pos); pos += p.length; }
    out.set(eocd, pos);
    return out;
  }

  /* Kayıtlı Dağıtım Metrik Değerlendirme & Yan Yana Karşılaştırma */
  function evaluateSavedPlan(S, plan) {
    const D = +S.school.D || 5, P = +S.school.P || 7;
    const simCards = (S.cards || []).map(c => (
      plan && plan.cardPatterns && plan.cardPatterns[c.id]
        ? Object.assign({}, c, { pattern: plan.cardPatterns[c.id] })
        : c
    ));
    const simState = Object.assign({}, S, {
      cards: simCards,
      place: (plan && plan.place) || {}
    });
    const o = EP.occ(simState);
    const total = o.m.blocks.length;
    const unplaced = o.un.length;
    const placed = Math.max(0, total - unplaced);
    const locked = Object.values(simState.place).filter(x => x && x.lock).length;

    let teacherGaps = 0;
    let teacherFreeDays = 0;
    let activeTeachers = 0;
    for (const t of S.teachers || []) {
      const G = o.tG[t.id] || {};
      let hasAny = false;
      let freeD = 0;
      for (let d = 0; d < D; d++) {
        let first = -1, last = -1, cnt = 0;
        for (let p = 0; p < P; p++) {
          if (G[d + '-' + p]) {
            if (first < 0) first = p;
            last = p;
            cnt++;
          }
        }
        if (cnt > 0) {
          hasAny = true;
          teacherGaps += (last - first + 1 - cnt);
        } else {
          freeD++;
        }
      }
      if (hasAny) {
        activeTeachers++;
        teacherFreeDays += freeD;
      }
    }

    let classSpread = 0;
    for (const c of S.classes || []) {
      const G = o.cG[c.id] || {};
      const dayCnts = [];
      for (let d = 0; d < D; d++) {
        let cnt = 0;
        for (let p = 0; p < P; p++) if (G[d + '-' + p]) cnt++;
        dayCnts.push(cnt);
      }
      if (dayCnts.some(x => x > 0)) {
        classSpread += Math.max(...dayCnts) - Math.min(...dayCnts);
      }
    }

    const cov = total ? (placed / total) : 1;
    const rawScore = (cov * 100) - (teacherGaps * 0.8) - (classSpread * 0.4) + Math.min(8, teacherFreeDays * 0.25);
    const score = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));
    return {
      id: plan && plan.id ? plan.id : '',
      name: (plan && plan.name) || 'Mevcut Program',
      savedAt: (plan && plan.savedAt) || '',
      placed,
      total,
      unplaced,
      locked,
      teacherGaps,
      teacherFreeDays,
      activeTeachers,
      classSpread,
      score
    };
  }

  function compareSavedPlans(S, planA, planB) {
    const a = evaluateSavedPlan(S, planA);
    const b = evaluateSavedPlan(S, planB);
    const winner = a.score > b.score ? 'A' : b.score > a.score ? 'B' : 'tie';
    return { a, b, winner };
  }

  Object.assign(EP, {
    DOC_CSS, RTABS, DUTY_STRATEGIES, AY_AD, rep, donemText, myList, dutyOf, dutyPlaces,
    staffAdminKind, isDutyExempt, dutyExemptReason, clubOptions, clubAuto,
    teacherDailyLoads, defaultYearMonth, dutyClosedSet, toggleDutyClosedDate, clearMonthClosedDates, mebHolidaysForMonth, applyMebHolidaysForMonth, checkMonthlyWeekDup, buildMonthlyDuty, docMonthlyDuty,
    computeEkDers, docEkDers, docClass, docTeacher, docSheet, docDuty, dutyAuto, docsFor, docFile,
    csvExport, excelExport, wordExport, pngCanvas, buildZipBytes, evaluateSavedPlan, compareSavedPlans, vQuality, vRapor
  });
})(typeof window !== 'undefined' ? window : globalThis);
