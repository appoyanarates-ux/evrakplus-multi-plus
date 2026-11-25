# DersMatrix Ultimate (by EvrakPlus) — Değişiklik Geçmişi (CHANGELOG)

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
