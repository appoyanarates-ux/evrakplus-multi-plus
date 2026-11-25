# DersMatrix Ultimate (by EvrakPlus) — Değişiklik Geçmişi (CHANGELOG)

## [2.3.0] - 2026-11-25

### Yenilikler ve Düzeltmeler
- **MEB TTKB 2025/2026 Haftalık Ders Çizelgeleri & 6 Grupta 26 Okul Türü**:
  - `Okul Ayarları` ekranında tüm okul türleri 6 resmî kategoride gruplandırıldı: *Ortaokul Kurumları (5–8)*, *Genel Ortaöğretim (Anadolu/Fen/SBL + Hazırlık)*, *Özel Program Uygulayan Proje Liseleri (45 sa · Hazırlık + 9–12)*, *Anadolu İmam Hatip Liseleri (9–12 / Hazırlık / Fen-Sosyal Programı)*, *Güzel Sanatlar ve Spor Liseleri* ve *Mesleki/Çok Programlı/Özel Kurumlar*.
  - Yeni resmî çizelgeler eklendi: **Spor Ortaokulu (TTKB 113)**, **Güzel Sanatlar Müzik Ortaokulu (TTKB 114)**, **Hazırlık Sınıfı Bulunan Anadolu/Fen/Sosyal Bilimler/İHL Liseleri**, **Özel Program Uygulayan Anadolu (TTKB 104) / Fen (TTKB 24) / SBL (TTKB 25)**, **Güzel Sanatlar Lisesi Görsel Sanatlar / Tiyatro / Müzik / Türk Müziği (TTKB 06–07)**, **Spor Lisesi (TTKB 102)** ve **Tematik Spor Lisesi (TTKB 103)**.
  - **SBL 11. sınıf Osmanlı Türkçesi** (`[2,2,2,0]`), **Fen Lisesi**, **SBL** ve **AİHL** seçmeli havuzları birebir TTKB kararlarına göre güncellendi; tam **Hazırlık Sınıfı (`grade: 0` → `Hz/A`)** desteği eklendi.
- **Sorunsuz Kurulum & Güncelleme Deneyimi (NSIS Fix)**: İlk kurulum ve uygulama içi güncelleme sırasında çıkan *"DersMatrix Ultimate kapatılamaz / elle kapatın ve Tekrar'a tıklayın"* uyarısı özel NSIS kurulum makrosu (`installer.nsh`) ve gecikmeli temiz kapanış ile tamamen giderildi.
- **Haftalık Ders Programları & Dağıtım — Çift Tıkla Kilit & Sürükleyerek Toplu Kilit Seçimi**:
  - Tek tık işlem menüsü gecikmeli açılarak çift tıkla kilit/kilit açma işleminin tüm program şablonlarında (Sınıf, Öğretmen, Derslik, Sınıf Çarşafı, Öğretmen Çarşafı — hem `Dağıtım ve Program` hem `Haftalık Ders Programları` sayfalarında) kesintisiz çalışması sağlandı.
  - **Toplu kilitleme araçları** `Haftalık Ders Programları` sayfasına da eklendi; toplu seçim modunda sürükleme çakışması kapatıldı, fareyle sürükleyerek çoklu hücre seçme ve tablo kaydırma konumunu (`scrollLeft`) koruma eklendi.
- **Okul Nöbeti — Etkileşimli Aylık Takvim, Gün Kapatma/Açma ve Haftada En Fazla 1 Gün Kuralı**:
  - Bir öğretmen bir takvim haftasında **kesinlikle en fazla 1 gün** nöbet tutar (hem otomatik dağıtımda hem elle düzenlemede doğrulanır).
  - Aylık nöbet sekmesine etkileşimli **Aylık Takvim** eklendi: herhangi bir okul gününe tıklayarak tatil/kapalı ilan edebilir veya açabilirsiniz; nöbet dağıtımı ders programına ve kapalı günlere göre otomatik güncellenir.

## [2.2.2] - 2026-11-25

### Düzeltmeler
- **Ortak Rehberlik Saati Atama Koruması**: `Ortak rehberlik saati` artık `Sınıflar ve Şubeler` ile `Ders Görevlendirmeleri` menülerindeki rehber öğretmen atamalarını kesinlikle değiştirmez; öğretmen kapalıysa, atanmamışsa, iki menüde farklıysa veya kilitli çakışma varsa ayrıntılı uyarı penceresi gösterir.
- **Çift Tıkla Ders Kilitleme / Kilit Açma Düzeltmesi**: Tablo yeniden çizimi (`render()`) nedeniyle yerel `dblclick` olayının yutulması giderildi; tüm program görünümlerinde herhangi bir dolu derse çift tıklamak kilidi anında açıp kapatır.

## [2.2.1] - 2026-11-25

### İyileştirmeler
- **Klasik Üst Menü Çubuğu Kaldırıldı**: Masaüstü uygulamasında üstteki `File Edit View Window Help` menü çubuğu tamamen kaldırıldı (`Menu.setApplicationMenu(null)` + `removeMenu()`).
- **Okul Türü — Ortaokul (5–8. sınıf)**: `İlkokul ve Ortaokul (1–8)` seçeneğinden ilkokul (1–4) çıkarılarak **`Ortaokul (5–8. sınıf)`** (haftalık 35 saat) olarak düzenlendi; diğer tüm okul türleri eksiksiz korundu.
- **Öğretmen Görevlendirmelerinde Düzenlenebilir Haftalık Müsaitlik**: `Ders Görevlendirmeleri → Öğretmen bazında` sekmesindeki öğretmen bilgi kartına doğrudan tıklanarak değiştirilebilen haftalık müsaitlik matrisi eklendi.

## [2.2.0] - 2026-11-25

### Yenilikler ve İyileştirmeler
- **Çift Tıkla Ders Kilitleme/Açma & Toplu Kilit Seçimi**: Dağıtım ve Program şablonlarında herhangi bir derse çift tıklayarak anında kilitleyip açma; `Ctrl+Tık` veya **Toplu Kilit Seçimi** modu ile birden fazla dersi seçip topluca kilitleme, kilidini açma veya tersine çevirme (kilitli→açık, açık→kilitli).
- **Gerçek Masaüstü "Maksimumda Bitir"**: Yerel optimizasyon devam ederken **Maksimumda bitir** düğmesine basıldığında şu ana kadar dağıtılan tüm dersler şablona işlenir, dağıtılmayanlar ise alttaki **Dağıtılamayan dersler** alanına düşer.
- **Sınıf Bazında & Öğretmen Bazında Dağıtılamayan Dersler**: Hangi sınıfın ve hangi öğretmenin hangi derslerinin yerleşmediği, saat sayısı ve çakışma nedenleriyle ayrı sekmelerde (`Sınıfa göre` / `Öğretmene göre` / `Tüm liste`) eksiksiz gösterilir.
- **Canlı 32 Renkli Ders Paleti**: Dersler birbirinden keskin biçimde ayırt edilen canlı renkler ve sol vurgu şeritleriyle hem program şablonunda hem WhatsApp PNG çıktısında gösterilir.
- **Yeni `Okul Nöbeti` Oluşturma Sayfası (Haftalık & Aylık)**:
  - Öğretmenin haftalık ders programına göre **en az dersinin olduğu güne**, **en çok dersinin olduğu güne** veya **dengeli** dağıtım + `0 dersli (boş) güne nöbet verme` kuralı.
  - Her öğretmen için tek tıkla **Nöbet Tutar / Nöbet Tutmaz** anahtarı (Okul Müdürü, Müdür Yardımcıları ve Rehber Öğretmenler otomatik muaf).
  - **Haftalık sabit nöbet** ve **Aylık nöbet çizelgesi** (sabit haftalık veya haftadan haftaya nöbet yeri rotasyonlu, tarih bazında düzenlenebilir) + doğrudan PDF, Yazdır, Excel ve Word çıktıları.
- **Yardım ve Destek ↔ EvrakPlus Hesabım Uyumu**: Uygulama içi EvrakPlus oturum durumu `EvrakPlus Hesabım`, üst çubuk ve `Yardım ve Destek` sayfasında anlık olarak birebir senkronize çalışır.
- **Sadeleştirilmiş Windows Dağıtımı**: Taşınabilir (Portable) sürüm kaldırıldı; yalnızca imzalı bütünlük özetli Windows Kurulum (`DersMatrix-Ultimate-2.2.0-Setup.exe`) yayınlanır.

## [2.1.0] - 2026-11-25

### Yenilikler ve İyileştirmeler
- **Yeni Marka Kimliği (`DersMatrix Ultimate`)**: Uygulama adı, Windows kurulum/taşınabilir EXE (`DersMatrixUltimate.exe`), yeni mavi Windows uygulama ikonu (`icon.ico`), yan menü logosu ve Ana Panel banner görseli eklendi.
- **Gerçek Yerel PDF Çıktısı (`.pdf`) ve Doğrudan Yazdırma**: Masaüstü uygulamasında Chromium `printToPDF` ile gerçek vektörel `.pdf` dosyası kaydetme/açma ve doğrudan yazıcıya gönderme (`Yazdır`); web tarayıcısında yerel PDF/yazdırma penceresi. Üyeler için %100 temiz, üyesiz kullanıcılar için büyük ve küçük **EVRAK PLUS** filigranlı çıktı.
- **Ders Görevlendirmeleri — Görünür Zorunlu Dersler Havuzu ve Manuel Ekleme**: `Sınıf bazında` sekmesinde müfredattaki tüm zorunlu dersler tek tek görünür (Eklendi / Eksik + tek tıkla `+ Ekle`), ayrıca manuel olarak Zorunlu / Seçmeli / Ek ders eklenebilir.
- **Mükerrer Ders Koruması**: Bir sınıfa atanmış olan dersin aynı sınıfa ikinci kez atanması veri modeli ve tüm arayüz formlarında kesin olarak engellendi.
- **Öğretmen Bazında Tikli Zorunlu & Seçmeli Ders Havuzları**: `Ders Görevlendirmeleri → Öğretmen bazında` sekmesine sınıf/arama/branş filtreli **Zorunlu Dersler Havuzu** ve **Seçmeli Dersler Havuzu** eklendi; kutucuğa tik atarak doğrudan atama/boşa çıkarma ve başka öğretmendeki dersi `Devral ⇄` ile mükerrersiz aktarma.
- **Derslikler ve Binalar → Okul Ayarları Altında**: Bağımsız menü kaldırılarak `Okul Ayarları` ekranı içine sekme olarak taşındı (15 sade menü).
- **v2.0.0'dan Kesintisiz Otomatik Güncelleme**: `DersMatrix-Ultimate-2.1.0-Setup.exe` + `SHA256SUMS.txt` ile mevcut `v2.0.0` kurulumları uygulama içinden tek tıkla otomatik güncellenebilir.

## [2.0.0] - 2026-11-25

### Eklenenler
- Uygulama içi kalıcı EvrakPlus oturum penceresi (`persist:evrakplus-auth`), üyesiz büyük/küçük EVRAK PLUS filigranlı çıktılar, SHA-256 doğrulamalı otomatik güncelleyici, MEB 38 sosyal kulüp, idareci nöbet muafiyeti ve etkileşimli öğretmen görevlendirme kartları.

## [1.0.0] - 2026-11-24

### Eklenenler
- **Ortak Veri Modeli (`v3`)**: 11 MEB kurum türü (düzenlenebilir, sürümlü şablonlar), 4 seviyeli kısıt sistemi (`HARD`, `HIGH`, `NORMAL`, `PREFERENCE`), binalar ve geçiş süreleri, derslik/laboratuvar/atölye/spor salonları, ikili eğitim, öğrenci grupları ve eski `Çarşaf` (`v1`/`v2`) projelerinin kayıpsız aktarımı.
- **EvrakPlus Independent Schedule Validator**: Tüm motorlardan bağımsız zorunlu/esnek kural doğrulayıcı, 100 üzerinden ortak kalite puanlama ve PASS 0 Hall gün grubu ön kontrolü.
- **6 Gerçek Optimizasyon Motoru**:
  - Google OR-Tools CP-SAT `9.15.6755` (ana motor, çok çekirdek, solution hint, ara çözüm akışı)
  - Timefold Solver `1.17.0` (gömülü OpenJDK 21, Hard/Medium/Soft score, `@PlanningPin`, warm start)
  - Choco Solver `4.10.18` (ortak gömülü OpenJDK 21, derslik/bina geçiş kısıtları, kısıt etki raporu, çoklu alternatifler)
  - MiniZinc `2.11.0` (Gecode `6.6.0` ve Chuffed `0.14.0`, otomatik `.mzn`/`.dzn`, şeffaf arka plan motor raporlaması)
  - SCIP `9.02` (`PySCIPOpt 5.7.1`, MILP, yük dengeleme, dual bound ve optimality gap)
  - HiGHS `1.16.0` (MIP/MILP, kesin tamsayılı kontrol ve kesirli LP çözümü reddi)
- **EvrakPlus Multi Solver Optimization Engine**: 6 çalışma modu (`smart`, `single`, `sequential`, `parallel`, `hybrid`, `ultimate`), CPU/RAM kontrollü paralellik, PASS 0–7 hattı.
- **Profesyonel Manuel Ders Dağıtımı & 18 Menülü Ortak Arayüz**: Öğretmen/sınıf/gün/saat bazlı kilitleme, anlık çakışma kontrolü, kısmi yeniden dağıtım, çizelge karşılaştırma, undo/redo.
- **Windows Electron Masaüstü Kabuğu**: `contextIsolation/sandbox`, sıkı CSP, yerleşik SQLite veri tabanı, ASAR-dışı gömülü motor yolları, NSIS Setup + Portable yapılandırması.
- **cPanel PHP Web & Mobil PWA**: WordPress'ten izole `.htaccess`, MySQL şeması, güvenli kurulum sihirbazı (`INSTALL.LOCK`), IndexedDB çevrimdışı kuyruk, Background Sync Service Worker.
- **Linux Optimizasyon Sunucusu**: FastAPI, asenkron iş kuyruğu, Bearer auth, Docker Compose + Redis.
- **EvrakPlus Multi Plus Connect (WordPress Eklentisi)**: 8 REST API uç noktası, PKCE S256, Ed25519 imzalı süreli çevrimdışı yetki belgesi, 409 Conflict korumalı bulut senkronizasyonu.
- **Üyelik Kontrollü Raporlama**: 16 rapor türü, A4/A3 dikey/yatay, PDF-HTML/Excel/Word/CSV çıktıları.
- **Güvenli Otomatik Güncelleme**: HTTPS kaynak doğrulaması, SHA-256 bütünlük kontrolü, kullanıcı onayı ve otomatik rollback.
