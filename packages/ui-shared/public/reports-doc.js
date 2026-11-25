/* =========================================================================
 * EvrakPlus Ders Dağıtım Multi Plus v1.0.0 — Resmi Belge Önizleme ve Çıktı Modülü
 * - Sınıf Programı, Sınıf Çarşaf, Öğretmen Programı, Öğretmen Çarşaf, Okul Nöbeti
 * - Kalite Raporu ve Multi Solver Motor Karşılaştırma Raporu
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
.doc .g .sep{border-left:2px solid #000}.doc .duty td{height:46px;font-size:12.5px}`;

  const upTR = s => String(s || '').toLocaleUpperCase('tr');
  const rep = S => Object.assign({ mudur: '', gecerli: '', sayi: '', kurum: '', myId: '', paper: 'A4' }, S.report || {}, { mudur: S.school.mudur || (S.report || {}).mudur || '' });
  const donemText = S => S.school.year + (S.school.donem && S.school.donem !== 'Yıllık' ? ' ' + S.school.donem : '');
  const myList = S => S.school.myard || [];
  const fmtD = iso => { if (!iso) return '…/…/……'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
  const wday = iso => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); return ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][d.getDay()]; };
  const kurumAdi = S => { const r = rep(S); return r.kurum || S.school.name; };
  const dutyOf = t => ({ d: t.dutyD === '' || t.dutyD == null ? -1 : +t.dutyD, place: t.dutyP || '' });
  const dutyPlaces = S => { const d = S.duty || {}; return d.places && d.places.length ? d.places : ['Bahçe', 'Koridor']; };

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
    const du = dutyOf(t), rh = S.classes.filter(c => EP.rehberOf(S, c) === t.id).map(c => c.name).join(', ');
    const fT = cell => `<b>${EP.esc(EP.cName(S, cell.card.classId))}</b><span>${EP.esc(EP.SS(S, cell.card.subj))}</span>`;
    return `<section class="doc portrait"><div class="ttl">${EP.esc(upTR(kurumAdi(S)))} MÜDÜRLÜĞÜ</div>
      <div class="meta"><div><span>Sayı</span><span>: ${EP.esc(r.sayi)}</span></div><div><span>Öğretmen</span><span>: ${EP.esc(upTR(t.name))}</span></div><div><span>Dönem</span><span>: ${EP.esc(donemText(S))}</span></div><div><span>Toplam Saat</span><span>: ${tot}</span></div></div>
      <div class="meta2"><span>Nöbet Günü: ${du.d >= 0 ? EP.esc(upTR(EP.GUN[du.d])) : '-'}${du.place ? ' / ' + EP.esc(du.place) : ''}</span><span>Sınıf Rehberliği: ${EP.esc(rh || '-')}</span><span>Sosyal Kulüp: ${EP.esc(t.kulup || '-')}</span></div>
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
    const ts = S.teachers.filter(t => dutyOf(t).d >= 0);
    const cell = (d, p) => ts.filter(t => dutyOf(t).d === d && (dutyOf(t).place || pl[0]) === p).map(t => EP.esc(upTR(t.name))).join('<br>');
    return `<section class="doc portrait"><div class="ttl">${EP.esc(upTR(kurumAdi(S)))} MÜDÜRLÜĞÜ<br>${EP.esc(S.school.year)} EĞİTİM ÖĞRETİM YILI ${S.school.donem && S.school.donem !== 'Yıllık' ? EP.esc(upTR(S.school.donem)) + ' ' : ''}ÖĞRETMEN NÖBET ÇİZELGESİ</div>
      <table class="g duty"><thead><tr><th style="width:96px"><b>Gün</b></th>${pl.map(p => `<th><b>${EP.esc(p)}</b></th>`).join('')}<th><b>Nöbetçi İdareci</b></th></tr></thead><tbody>${EP.GUN.slice(0, D).map((g, d) => `<tr><td class="day">${g}</td>${pl.map(p => `<td>${cell(d, p)}</td>`).join('')}<td>${EP.esc(adm[d] || '')}</td></tr>`).join('')}</tbody></table>
      <div class="lt">Öğretmen Listesi:</div><table class="l"><thead><tr><th style="width:26px">S</th><th>Öğretmen</th><th>Branş</th><th>Nöbet Günü</th><th>Nöbet Yeri</th></tr></thead><tbody>${S.teachers.map((t, i) => {
        const du = dutyOf(t);
        return `<tr><td class="c">${i + 1}</td><td>${EP.esc(upTR(t.name))}</td><td>${EP.esc(t.branch || '')}</td><td class="c">${du.d >= 0 ? EP.GUN[du.d] : '-'}</td><td class="c">${du.d >= 0 ? EP.esc(du.place || pl[0]) : '-'}</td></tr>`;
      }).join('')}</tbody></table>
      <p class="note">Nöbet çizelgesi ${fmtD(r.gecerli)} tarihinden itibaren geçerlidir. Nöbetçi öğretmenler, görev yerlerinde ilk ders zilinden önce hazır bulunur.</p><div class="sig">${sigL(S)}${sigR(S)}</div></section>`;
  }

  function dutyAuto(S) {
    const D = +S.school.D, pl = dutyPlaces(S), o = EP.occ(S);
    const cnt = Array.from({ length: D }, () => Array(pl.length).fill(0));
    const per = t => {
      const G = o.tG[t.id] || {}, a = Array(D).fill(0);
      for (const k in G) { const d = +k.split('-')[0]; if (d < D) a[d]++; }
      return a;
    };
    const list = S.teachers.map(t => {
      const a = per(t);
      const open = Array.from({ length: D }, (_, d) => Array.from({ length: +S.school.P }, (_, p) => (t.av || {})[d + '-' + p] !== 1).some(Boolean));
      const days = [...Array(D).keys()].filter(d => a[d] > 0);
      return { t, a, days: days.length ? days : [...Array(D).keys()].filter(d => open[d]) };
    }).filter(x => x.days.length).sort((x, y) => x.days.length - y.days.length);
    let n = 0;
    for (const x of list) {
      const dt = x.days.reduce((b, d) => {
        const s = cnt[d].reduce((u, v) => u + v, 0), sb = cnt[b].reduce((u, v) => u + v, 0);
        return s < sb || (s === sb && x.a[d] > x.a[b]) ? d : b;
      }, x.days[0]);
      const pi = cnt[dt].indexOf(Math.min(...cnt[dt]));
      cnt[dt][pi]++;
      x.t.dutyD = String(dt);
      x.t.dutyP = pl[pi];
      n++;
    }
    return n;
  }

  function docsFor(S, tab, selId) {
    const o = EP.occ(S);
    if (tab === 'cp') return (selId ? S.classes.filter(c => c.id === selId) : S.classes).map(c => docClass(S, c, o)).join('');
    if (tab === 'tp') return (selId ? S.teachers.filter(t => t.id === selId) : S.teachers).map(t => docTeacher(S, t, o)).join('');
    if (tab === 'cs') return docSheet(S, 'c', o);
    if (tab === 'ts') return docSheet(S, 't', o);
    if (tab === 'nb') return docDuty(S);
    return '';
  }

  function docFile(S, body, title) {
    const paper = rep(S).paper === 'A3' ? 'A3' : 'A4';
    return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>${EP.esc(title)}</title><style>${DOC_CSS}
body{margin:0;background:#fff}.doc{width:auto!important;min-height:0!important;page-break-after:always;break-after:page}.doc:last-child{page-break-after:auto}
@page{size:${paper} portrait;margin:8mm}@page land{size:${paper} landscape;margin:6mm}.doc.landscape{page:land}</style></head><body>${body}</body></html>`;
  }

  function csvExport(S) {
    const D = +S.school.D, P = +S.school.P, o = EP.occ(S);
    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    const head = ['', ...EP.GUN.slice(0, D).flatMap(g => Array.from({ length: P }, (_, p) => g + ' ' + (p + 1)))];
    const rows = [head];
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
    return '\uFEFF' + rows.map(r => r.map(q).join(';')).join('\r\n');
  }

  function excelExport(S, tab, selId) {
    const body = docsFor(S, tab, selId);
    return `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>${DOC_CSS}</style></head><body>${body}</body></html>`;
  }

  function wordExport(S, tab, selId) {
    const body = docsFor(S, tab, selId);
    return `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>${DOC_CSS}</style></head><body>${body}</body></html>`;
  }

  function pngCanvas(S, kind, id) {
    const D = +S.school.D, P = +S.school.P, o = EP.occ(S), tm = EP.times(S), SK = Object.keys(S.subjects || {});
    const e = (kind === 't' ? S.teachers : S.classes).find(x => x.id === id);
    if (!e) return null;
    const G = (kind === 't' ? o.tG : o.cG)[id] || {};
    const W = 1080, lw = 150, top = 200, ch = Math.min(150, Math.floor(1500 / P)), Hh = top + P * ch + 90;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
    const x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, Hh);
    x.fillStyle = '#d42a38'; x.fillRect(0, 0, W, 14);
    x.fillStyle = '#14171c'; x.font = '600 46px Rubik, Arial'; x.fillText(kind === 't' ? e.name : e.name + ' sınıfı', 48, 86);
    x.font = '26px Inter, Arial'; x.fillStyle = '#5a616c'; x.fillText(S.school.name + ' · ' + S.school.year + ' · haftalık ders programı', 48, 128);
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
        x.fillStyle = c ? `hsl(${Math.round((i * 137.5 + 18) % 360)} 78% 86%)` : '#f0f1f3';
        x.beginPath(); if (x.roundRect) x.roundRect(cx, cy, w, h, 12); else x.rect(cx, cy, w, h); x.fill();
        if (c) {
          x.fillStyle = '#14171c'; x.textAlign = 'center'; x.font = '700 30px Inter, Arial';
          x.fillText(EP.SS(S, c.card.subj), cx + w / 2, cy + h / 2 - 2);
          x.font = '21px Inter, Arial';
          x.fillText(kind === 't' ? EP.cName(S, c.card.classId) : EP.tShort(S.teachers.find(t => t.id === c.card.teacherId)), cx + w / 2, cy + h / 2 + 28);
        }
      }
    }
    x.textAlign = 'left'; x.font = '18px Inter, Arial'; x.fillStyle = '#8a9099';
    x.fillText('EvrakPlus Ders Dağıtım Multi Plus v1.0.0 ile hazırlandı', 48, Hh - 34);
    return cv;
  }

  const RTABS = [
    ['cp', 'Sınıf Programı'], ['cs', 'Sınıf Çarşaf'], ['tp', 'Öğretmen Programı'],
    ['ts', 'Öğretmen Çarşaf'], ['nb', 'Okul Nöbeti'], ['kq', 'Kalite Raporu'], ['mc', 'Motor Karşılaştırma']
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

  function vEngineCompare(S) {
    const sols = S.solutions || [];
    if (!sols.length) return `<div class="empty">Henüz kaydedilmiş Multi Solver motor karşılaştırması yok. Otomatik Dağıtım veya Multi Solver Merkezi üzerinden çözüm çalıştırın.</div>`;
    return `<div class="card scroll"><h2 style="margin-bottom:8px">Motor Karşılaştırma Raporu</h2>
      <table class="tbl"><thead><tr><th>Motor</th><th>Durum</th><th class="n">Yerleşen</th><th class="n">Sert İhlal</th><th class="n">Kalite Puanı</th><th class="n">Süre</th><th>Açıklama / Arka Uç</th><th></th></tr></thead>
      <tbody>${sols.map((s, idx) => `<tr>
        <td><b>${EP.esc(s.engineName || s.engine)}</b></td>
        <td><span class="pill ${s.isHardValid ? 'ok' : 'err'}">${EP.esc(s.status || '-')}</span></td>
        <td class="n">${s.assignedBlocks || 0}/${s.totalBlocks || 0}</td>
        <td class="n" style="color:${s.hardViolations ? 'var(--err)' : 'var(--ok)'}">${s.hardViolations || 0}</td>
        <td class="n"><b>${s.qualityScore ?? 0}/100</b></td>
        <td class="n">${s.elapsedMs ? (s.elapsedMs / 1000).toFixed(2) + ' sn' : '—'}</td>
        <td class="small muted">${EP.esc(s.backendDisclosure || s.note || '—')}</td>
        <td style="text-align:right">${s.placements ? `<button class="btn sm" data-act="applySol" data-i="${idx}">Programa uygula</button>` : ''}</td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function vRapor(S, H) {
    const tab = S.ui.rtab || 'cp', r = rep(S), o = EP.occ(S), tot = o.m.blocks.length;
    const head = H('Raporlar ve Çıktılar', 'Okulda kullanılan resmi düzende sınıf ve öğretmen programları, çarşaf listeler ve nöbet çizelgesi. Önizleme ücretsizdir; PDF/HTML, Excel, Word, PNG ve toplu dışa aktarımlar ücretsiz EvrakPlus üyeliği ile açılır.',
      `<button class="btn" data-act="exAllDocs">Tüm belgeler tek dosyada</button>`);
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
    if (tab === 'mc') return head + tabs + vEngineCompare(S);
    if (!tot && tab !== 'nb') return head + tabs + sets + '<div class="empty">Önce ders ekleyip dağıtım yapın.</div>';

    let ctl = '', sel = '', extraCard = '';
    if (tab === 'cp' || tab === 'tp') {
      const ents = tab === 'cp' ? S.classes : S.teachers, k = tab === 'cp' ? 'rselc' : 'rselt';
      sel = S.ui[k] || ''; if (sel && !ents.some(e => e.id === sel)) sel = '';
      ctl = `<select data-ui="${k}" aria-label="Seçim"><option value="">Tümü (${ents.length})</option>${ents.map(e => `<option value="${e.id}" ${sel === e.id ? 'selected' : ''}>${EP.esc(e.name)}</option>`).join('')}</select>
        <button class="btn pri" data-act="exDoc">Yazdır / PDF (.html)</button>
        <button class="btn" data-act="exExcel">Excel (.xls)</button>
        <button class="btn" data-act="exWord">Word (.doc)</button>
        <button class="btn" data-act="exPng2" ${sel ? '' : 'disabled title="Önce tek sınıf veya öğretmen seçin"'}>WhatsApp görseli (.png)</button>`;
    } else if (tab === 'cs' || tab === 'ts') {
      ctl = `<button class="btn pri" data-act="exDoc">Yazdır / PDF (.html)</button>
        <button class="btn" data-act="exExcel">Excel (.xls)</button>
        <button class="btn" data-act="exWord">Word (.doc)</button>
        <button class="btn" data-act="exCsv">Çarşaf tablosu (.csv)</button>`;
    } else if (tab === 'nb') {
      const pl = dutyPlaces(S), adm = (S.duty && S.duty.admin) || {}, D = +S.school.D;
      ctl = `<button class="btn pri" data-act="exDoc">Yazdır / PDF (.html)</button>
        <button class="btn" data-act="exWord">Word (.doc)</button>
        <button class="btn" data-act="dutyAuto">Nöbetleri otomatik dağıt</button>
        <button class="btn ghost" data-act="dutyClear">Nöbetleri temizle</button>`;
      extraCard = `<div class="card" style="margin:12px 0"><h2>Nöbet düzenle</h2>
        <p class="small muted" style="margin:4px 0 10px">Otomatik dağıtım öğretmeni dersinin olduğu ve en az nöbetçi bulunan güne, o günün en boş yerine koyar. İstediğiniz satırı elle değiştirebilirsiniz.</p>
        <div class="fields"><datalist id="mylist">${[S.school.mudur, ...myList(S).map(m => m.name)].filter(Boolean).map(n => `<option value="${EP.esc(n)}">`).join('')}</datalist>
          <label class="f" style="grid-column:1/-1">Nöbet yerleri (virgülle)<input data-dplaces="1" value="${EP.esc(pl.join(', '))}"></label>
          ${EP.GUN.slice(0, D).map((g, d) => `<label class="f">${g} nöbetçi idareci<input list="mylist" data-dadmin="${d}" value="${EP.esc(adm[d] || '')}"></label>`).join('')}
        </div>
        <div class="scroll" style="margin-top:12px"><table class="tbl"><thead><tr><th>Öğretmen</th><th>Nöbet günü</th><th>Nöbet yeri</th><th>Sınıf rehberliği</th><th>Sosyal kulüp</th></tr></thead><tbody>
        ${S.teachers.map(t => {
          const du = dutyOf(t);
          return `<tr><td>${EP.esc(t.name)}<br><small class="muted">${EP.esc(t.branch || '')}</small></td>
            <td><select data-t="${t.id}" data-f="dutyD" aria-label="Nöbet günü"><option value="">—</option>${EP.GUN.slice(0, D).map((g, d) => `<option value="${d}" ${du.d === d ? 'selected' : ''}>${g}</option>`).join('')}</select></td>
            <td><select data-t="${t.id}" data-f="dutyP" aria-label="Nöbet yeri">${pl.map(p => `<option ${(du.place || pl[0]) === p ? 'selected' : ''}>${EP.esc(p)}</option>`).join('')}</select></td>
            <td class="small">${EP.esc(S.classes.filter(c => EP.rehberOf(S, c) === t.id).map(c => c.name).join(', ') || '-')}</td>
            <td><input data-t="${t.id}" data-f="kulup" value="${EP.esc(t.kulup || '')}" style="min-width:140px" aria-label="Sosyal kulüp"></td></tr>`;
        }).join('')}</tbody></table></div></div>`;
    }

    const prev = docsFor(S, tab, sel);
    return head + tabs + sets + `<div class="row" style="margin-bottom:12px">${ctl}</div>` + extraCard + `<div class="paperwrap">${prev}</div>`;
  }

  Object.assign(EP, {
    DOC_CSS, RTABS, rep, donemText, myList, dutyOf, dutyPlaces,
    docClass, docTeacher, docSheet, docDuty, dutyAuto, docsFor, docFile,
    csvExport, excelExport, wordExport, pngCanvas, vQuality, vEngineCompare, vRapor
  });
})(typeof window !== 'undefined' ? window : globalThis);
