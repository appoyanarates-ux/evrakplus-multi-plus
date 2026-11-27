const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const uiIndex = path.resolve(__dirname, '..', '..', 'packages', 'ui-shared', 'public', 'index.html');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1360,
    height: 860,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      partition: 'e2e-memory-' + Date.now()
    }
  });

  const errors = [];
  win.webContents.on('console-message', (_ev, level, message) => {
    if (level >= 3) errors.push(message);
  });

  try {
    await win.loadFile(uiIndex);
    await new Promise(r => setTimeout(r, 900));

    const results = await win.webContents.executeJavaScript(`(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const out = [];
      const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT FAIL: ' + msg); };

      // Wait until initial demo & browser solve finishes (up to 6s)
      for (let i = 0; i < 40; i++) {
        if (document.querySelector('td[data-act="cell"][data-id]')) break;
        await wait(150);
      }

      // 1. Okul Ayarları -> özel isim, müdür, müdür yrd, özel zil saati -> Raporlara yansıma + Excel yok
      document.querySelector('a[data-step="school"]').click();
      await wait(150);
      const setInput = (sel, val) => {
        const el = document.querySelector(sel);
        assert(el, 'Input not found: ' + sel);
        el.value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setInput('input[data-k="school.name"]', 'E2E Atatürk Ortaokulu');
      setInput('input[data-k="school.mudur"]', 'Kemal Yılmaz');
      setInput('input[data-k="school.mudurYardimcisi"]', 'Selma Demir');
      setInput('input[data-ctime="0|start"]', '08:20');
      setInput('input[data-ctime="0|end"]', '09:00');
      await wait(150);
      document.querySelector('a[data-step="reports"]').click();
      await wait(200);
      const repText = document.querySelector('#view').innerHTML;
      assert(repText.includes('E2E Atatürk Ortaokulu'), 'Okul adı raporda görünmeli');
      assert(repText.includes('Kemal Yılmaz'), 'Okul müdürü raporda görünmeli');
      assert(repText.includes('Selma Demir'), 'Müdür yardımcısı raporda görünmeli');
      assert(repText.includes('08:20') && repText.includes('09:00'), 'Özel zil saati raporda görünmeli');
      assert(!document.querySelector('[data-act="exExcel"]'), 'Excel butonu olmamalı');
      assert(document.querySelector('[data-act="waSingle"][data-kind="c"]'), 'Sınıf WhatsApp PNG butonu olmalı');
      assert(document.querySelector('[data-act="waSingle"][data-kind="t"]'), 'Öğretmen WhatsApp PNG butonu olmalı');
      out.push('Flow 1 OK: School settings + custom bell times + Reports + No Excel');

      // 2. Excel/e-Okul Toplu Öğretmen İçe Aktarım
      document.querySelector('a[data-step="teachers"]').click();
      await wait(150);
      const beforeT = document.querySelectorAll('.tlist .tl').length;
      document.querySelector('[data-act="importTeachers"]').click();
      await wait(120);
      const biText = document.querySelector('#biText');
      assert(biText, 'Bulk import modal textarea must open');
      biText.value = 'Ad Soyad;Branş;Görev;Nöbet\\nE2E Yeni Öğretmen;Matematik;Öğretmen;Evet\\nE2E Rehber Hoca;Rehberlik;Rehberlik;Hayır';
      biText.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(100);
      document.querySelector('#biGo').click();
      await wait(150);
      const afterT = document.querySelectorAll('.tlist .tl').length;
      assert(afterT === beforeT + 2, '2 yeni öğretmen eklenmeli (' + beforeT + ' -> ' + afterT + ')');
      out.push('Flow 2 OK: Excel/e-Okul bulk teacher import');

      // 3. Haftalık Ders Programları -> Çift tıkla dolu ders kilitleme & açma
      document.querySelector('a[data-step="timetables"]').click();
      await wait(200);
      const filledTd = document.querySelector('td[data-act="cell"][data-id]');
      assert(filledTd, 'En az bir yerleşmiş ders hücresi olmalı');
      const bid = filledTd.dataset.id;
      const wasLocked = filledTd.classList.contains('lk');
      filledTd.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await wait(300);
      const afterLockTd = document.querySelector('td[data-act="cell"][data-id="' + bid + '"]');
      assert(afterLockTd && afterLockTd.classList.contains('lk') === !wasLocked, 'Çift tık kilidi değiştirmeli');
      afterLockTd.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await wait(300);
      const afterUnlockTd = document.querySelector('td[data-act="cell"][data-id="' + bid + '"]');
      assert(afterUnlockTd && afterUnlockTd.classList.contains('lk') === wasLocked, 'İkinci çift tık kilidi geri almalı');
      out.push('Flow 3 OK: Double-click lock & unlock on timetable cell');

      // 4. Haftalık Ders Programları -> Çift tıkla gün başlığı kapat/aç
      const dayTh = document.querySelector('th[data-daytoggle="1"]');
      assert(dayTh, 'Gün başlığı data-daytoggle="1" bulunmalı');
      const dayIdx = dayTh.dataset.d;
      dayTh.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await wait(300);
      const closedDayTh = document.querySelector('th[data-daytoggle="1"][data-d="' + dayIdx + '"]');
      assert(closedDayTh && closedDayTh.textContent.includes('Kapalı'), 'Çift tıkla gün kapatılmalı');
      closedDayTh.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await wait(300);
      const reopenedDayTh = document.querySelector('th[data-daytoggle="1"][data-d="' + dayIdx + '"]');
      assert(reopenedDayTh && !reopenedDayTh.textContent.includes('Kapalı'), 'Tekrar çift tıkla gün açılmalı');
      out.push('Flow 4 OK: Double-click day header close & reopen');

      // 5. Dağıtım ve Program -> Dağıtımı Kaydet + Yan Yana Karşılaştır
      document.querySelector('a[data-step="auto_schedule"]').click();
      await wait(200);
      const quickSave = document.querySelector('[data-act="quickSavePlan"]');
      assert(quickSave, 'Dağıtımı Kaydet butonu olmalı');
      quickSave.click();
      await wait(200);
      const cmpBtn = document.querySelector('[data-act="comparePlans"]');
      assert(cmpBtn, 'Karşılaştır butonu görünmeli');
      cmpBtn.click();
      await wait(150);
      assert(document.querySelector('#cmpSelA') && document.querySelector('#cmpSelB'), 'Karşılaştırma modalı açılmalı');
      document.querySelector('#cmpClose').click();
      await wait(100);
      out.push('Flow 5 OK: Save plan snapshot + side-by-side comparison modal');

      // 6. Okul Nöbeti -> Haftalık otomatik dağıtım + Aylık takvim gün kapat/aç + MEB tatilleri
      document.querySelector('a[data-step="duty"]').click();
      await wait(150);
      document.querySelector('[data-act="dutyAuto"]').click();
      await wait(200);
      document.querySelector('[data-act="dutyTab"][data-v="monthly"]').click();
      await wait(200);
      assert(document.querySelector('[data-act="applyMebHolidays"]'), 'MEB Resmî Tatillerini İşle butonu bulunmalı');
      const calBtn = document.querySelector('[data-act="toggleDutyDate"]');
      assert(calBtn, 'Aylık takvim günü bulunmalı');
      const iso = calBtn.dataset.id;
      const wasClosed = calBtn.classList.contains('closed');
      calBtn.click();
      await wait(150);
      const calAfter = document.querySelector('[data-act="toggleDutyDate"][data-id="' + iso + '"]');
      assert(calAfter && calAfter.classList.contains('closed') === !wasClosed, 'Aylık takvim günü açılıp kapanmalı');
      out.push('Flow 6 OK: Weekly duty auto + Monthly calendar day toggle + MEB holidays');

      // 7. Gerçek Canvas WhatsApp PNG + Ek Ders Özeti sekmesi doğrulaması
      document.querySelector('a[data-step="reports"]').click();
      await wait(150);
      const ekTab = document.querySelector('[data-act="rtab"][data-v="ek"]');
      assert(ekTab, 'Ek Ders Özeti sekmesi bulunmalı');
      ekTab.click();
      await wait(150);
      assert(document.querySelector('#view').innerHTML.includes('EK DERS ÖN HESAP ÖZETİ'), 'Ek Ders belgesi render edilmeli');
      document.querySelector('[data-act="rtab"][data-v="cp"]').click();
      await wait(150);
      const firstClsId = document.querySelector('select[data-ui="waCls"] option')?.value;
      const firstTchId = document.querySelector('select[data-ui="waTch"] option')?.value;
      assert(firstClsId && firstTchId, 'Sınıf ve öğretmen WhatsApp seçimleri dolu olmalı');
      document.querySelector('[data-act="waSingle"][data-kind="c"]').click();
      await wait(120);
      const guestBtn = document.querySelector('#mExpGuest');
      if (guestBtn) { guestBtn.click(); await wait(180); }
      const img = document.querySelector('#modalRoot img');
      assert(img && img.src.startsWith('data:image/png;base64,') && img.src.length > 5000, 'Gerçek Sınıf WhatsApp PNG üretilmeli');
      document.querySelector('#mX').click();
      await wait(100);
      out.push('Flow 7 OK: Real Chromium canvas WhatsApp PNG generation');

      // 8. Açılır-Kapanır Sol Menü + Şablon Altı Açıklama Düzeni (.board-stack)
      const toggleBtn = document.querySelector('#bToggleSide');
      const appEl = document.querySelector('.app');
      assert(toggleBtn && appEl, 'Sol menü aç/kapa düğmesi bulunmalı');
      assert(!appEl.classList.contains('side-collapsed'), 'Başlangıçta menü açık olmalı');
      toggleBtn.click();
      await wait(120);
      assert(appEl.classList.contains('side-collapsed'), 'Tıklandığında sol menü kapanmalı');
      toggleBtn.click();
      await wait(120);
      assert(!appEl.classList.contains('side-collapsed'), 'Tekrar tıklandığında sol menü açılmalı');
      document.querySelector('a[data-step="timetables"]').click();
      await wait(150);
      const bs = document.querySelector('.board-stack');
      assert(bs && bs.children.length === 2, 'Şablon tam genişlik üstte, açıklama+yerleşmeyenler altta olmalı');
      const rTop = bs.children[0].getBoundingClientRect();
      const rBot = bs.children[1].getBoundingClientRect();
      assert(rBot.top >= rTop.bottom - 2, 'Açıklama ve yerleşmeyenler şablonun altında konumlanmalı');
      out.push('Flow 8 OK: Collapsible sidebar + stacked full-width timetable layout');

      return { ok: true, flows: out };
    })()`);

    console.log(JSON.stringify({ ...results, consoleErrors: errors }));
    app.exit(0);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err && err.message ? err.message : String(err), consoleErrors: errors }));
    app.exit(1);
  }
});
