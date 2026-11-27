# DersMatrix Ultimate (by EvrakPlus) — Değişiklik Geçmişi (CHANGELOG)

## [2.7.1] - 2026-11-27

### 16 Menü Tasarım ve Kullanışlılık (UX) Cilası *(İlk ~1.2 MB Akıllı Mini Yama!)*
- **Sıfır Yatay Taşmalı Kurulum Tabloları (`4. Sınıflar ve Şubeler` & `6. Ders Görevlendirmeleri`)**: Tam gün okullarda gereksiz `Devre` sütunu otomatik gizlendi, `Blok` / `Öğretmen` / `Derslik` sütunları ve sol şube listesi optimize edildi; kesilen `Saat` / `Sil` butonları ve kırpılan açılır kutular tamamen düzeltildi.
- **Kaydırmasız Tam Sol Menü & Vektör Tema İkonu**: 16 menünün tamamı standart `900 px` ekranda kaydırma çubuğu olmadan tek bakışta görünür hâle getirildi; üst çubuktaki tema düğmesi vektör SVG ay/güneş ikonuna geçirildi.
- **`3. Öğretmenler` Anlık Arama & 3 Alt Sekme**: Sol öğretmen listesinin tepesine anlık **öğretmen / branş arama kutusu** eklendi; sağ detay paneli **Profil & Nöbet · Müsaitlik Matrisi · Atanan Dersler** sekmelerine bölünerek sayfa uzunluğu üçte bire indirildi.
- **`9. Haftalık Ders Programları` Hızlı Geçiş (`◀ / ▶`)**: Sınıf, öğretmen ve derslik programları arasında açılır menüyü tekrar açmadan tek tıkla ileri/geri gezme okları eklendi; `Toplu Kilitleme` düğmesi `Dağıtım ve Program` ile tek tipe getirildi.
- **`10. Analiz ve İstatistikler` Etkileşimli Boş Pencere Rozetleri**: Öğretmen boş pencereleri renkli rozetlerle (`0` yeşil · `1–2` kehribar · `3+` kırmızı) vurgulandı; öğretmen adına tıklayınca doğrudan haftalık programına geçiş ve tek tık `Kalite Raporu / Yazdır` düğmesi eklendi.
- **`11. Okul Nöbeti` İlk Ekranda Görünen Çizelge & `12. Raporlar` Simetri**: Nöbet ayarları açılır-kapanır özet çubuğuna alınarak nöbet tablosu hemen ekrana taşındı; `Raporlar` ekranındaki Sınıflar / Öğretmenler WhatsApp PNG kutuları simetrik hizalandı ve alttaki gereksiz pasif buton kaldırıldı.
- **Saf Türkçe Dil & Güncel İçerik Cilası**: `Ana Panel`'de *Program Ön Kontrolü* ve tikli kurulum adımları, `Kural Yönetimi`'nde saf Türkçe öncelik adları, `EvrakPlus Hesabım`'da eski `Excel/CSV` metninin düzeltilmesi, `Sistem` ekranında altyapı kartı ve `Yardım` ekranında eksik tüm kısayollar (`Ctrl+B`, `Ctrl+S`, gün/saat çift tık) + 5 Adımda Hızlı Başlangıç eklendi.

## [2.7.0] - 2026-11-27

### Akıllı Mini Yama (~1–2 MB Hızlı Güncelleme Sistemi)
- **~1–2 MB Hızlı Mini Yama (`DersMatrix-Patch-X.Y.Z.zip`)**: Arayüz ve uygulama kodu güncellemelerinde artık tüm ~243 MB kurulum paketini indirmeye gerek kalmadı. Kurulu masaüstü uygulaması yalnızca değişen arayüz ve çekirdek dosyalarını içeren ~1–2 MB boyutundaki mini yama paketini indirir, SHA-256 doğrulamasından geçirir, terminal penceresi açmadan günceller ve yaklaşık 2 saniye içinde yeni sürümle otomatik olarak yeniden açılır.
- **Otomatik Geri Alma (Rollback) & Tam Kurulum Yedeği**: Güncelleme sırasında beklenmedik bir dosya hatası olursa önceki çalışan dosyalar `.bak` yedeğinden otomatik geri yüklenir. Electron motor sürümü değiştiğinde veya kurulum klasörü salt-okunur (yönetici izni gerektiren) olduğunda sistem sorunsuz biçimde tam kurulum paketine (`Setup.exe`) geçer.
- **Güncelleme Bildirimi İyileştirmesi**: Üst güncelleme bandında ve `Sistem ve Güncellemeler` ekranında artık paket boyutu ve **`Hızlı Mini Yama · X.X MB`** / **`Hızlı Güncelle`** bilgisi açıkça gösterilir.

## [2.6.1] - 2026-11-27

### Hata Düzeltmesi ve Kullanım İyileştirmesi
- **Tarih Girişi & Takvim Seçimi Düzeltmesi**: `Geçerlilik tarihi` ve dönem tarih alanlarında yıl yazılırken (`0002` gibi eksik yıl) ekranın erken yenilenip odağı koparması ve `Belge bilgileri ve kağıt ayarı` panelinin kapanması sorunu giderildi.
- **Yerinde Önizleme Güncellemesi & Tek Tık "Bugün"**: Takvimden veya klavyeden seçilen tarih artık paneli kapatmadan anında alttaki belge önizlemesine yansır; tarih alanının yanına tek tıkla bugünün tarihini dolduran **Bugün** düğmesi eklendi.

## [2.6.0] - 2026-11-27

### Tasarım ve Kullanışlılık (UX) Yenilemesi
- **Kurumsal Mavi Tema & Tek Tık Koyu/Açık Tema (`🌙/☀️`)**: Ana vurgu rengi DersMatrix logo ve banner kimliğiyle uyumlu Kurumsal Mavi (`#1a56db` / koyu temada `#4f8cff`) olarak yenilendi; kırmızı yalnızca hata/silme/kilit durumlarına ayrıldı. Üst çubuğa tek tık açık/koyu tema değiştirme düğmesi eklendi.
- **Kırpılmayan Ana Panel Banner'ı & Sağ-Alt Bildirimler**: Ana Panel banner altındaki *"by EvrakPlus"* yazısının kesilmesi giderildi; bildirim kutuları (`toast`) ortadaki butonları kapatmaması için sağ alt köşeye alındı.
- **İlk Ekranda Görünen Dağıtım Şablonu**: `Dağıtım ve Program` sayfasındaki 4 üst akordeon tek satırlık kompakt 4 butonlu araç çubuğuna (*Ön Kontrol · Ortak Rehberlik · Toplu Kilitleme · Kayıtlı Dağıtımlar*) dönüştürüldü; program şablonu sayfa açılır açılmaz ekranda görünür.
- **Gruplu & İnce Koyu Sol Menü + Klavye Kısayolları**: Sol menü 4 gruba (*Kurulum · Program & Analiz · Yönetim & Çıktı · Sistem*) ayrıldı, koyu temaya uyumlu ince kaydırma çubuğu eklendi, kapanış geçişi keskinleştirildi ve `Ctrl+B` (menü aç/kapa) ile `Ctrl+S` (hızlı dağıtım kaydet) kısayolları eklendi.
- **`Ders Görevlendirmeleri`, `Okul Ayarları` ve `Raporlar` Sadeleştirmesi**: `2. Eş Öğretmen / Ortak Blok` sütunu isteğe bağlı anahtara bağlanarak tablo yatay taşması giderildi; zil saatleri tablosunun iç kaydırması ve tekrar eden yönetici kutuları kaldırıldı; `Raporlar ve Çıktılar` ekranında canlı A4 önizleme hemen görünür hâle getirildi.

## [2.5.2] - 2026-11-27

### Hata Düzeltmesi
- **Uygulama İçi Otomatik Güncelleme Başlatma Düzeltmesi**: Güncelleme indirildikten sonra `cmd.exe` tırnak kaçış hatası nedeniyle terminal penceresinin anlık açılıp kapanması ve kurulum sihirbazının başlamaması sorunu tamamen giderildi. Kurulum sihirbazı artık terminal açmadan doğrudan `shell.openPath` (Windows `ShellExecute`) ile başlatılır.

## [2.5.1] - 2026-11-27

### Arayüz ve Kullanım İyileştirmeleri
- **Açılır-Kapanır Sol Menü**: Sol menü başlığına **`«`** gizleme düğmesi, üst çubuğa ise **`☰` / `☰ Menü`** aç/kapa düğmesi eklendi. Menü gizlendiğinde içerik alanı tam genişliğe (`max-width: none`) yayılır ve tercih otomatik hatırlanır.
- **Tam Genişlik Program Şablonları**: Hem **Dağıtım ve Program** hem de **Haftalık Ders Programları** sayfalarında şablonların sağında yer alan *Elle düzenleme & Kilitleme* ile *Yerleşmeyen dersler* kartları **şablonların altına** (2 sütunlu düzenli görünümde) taşındı; sınıf, öğretmen ve çarşaf şablonları artık tüm ekran genişliğini kullanır.

## [2.5.0] - 2026-11-26

### Yenilikler ve Büyük İyileştirmeler
- **%39 Daha Küçük Kurulum Paketi (`398.4 MB → ~243 MB`, 6/6 Gömülü Motor Korunarak)**:
  - `jlink` özel minimal Java 21 Runtime (`328.5 MB → 48.5 MB`) ve gömülü Python önbellek/test temizliğiyle çalışma ortamı yarıya yakın küçültüldü; **OR-Tools, Timefold, Choco, MiniZinc, SCIP ve HiGHS** motorlarının tamamı çevrimdışı gömülü olarak korundu ve doğrulandı.
  - Diferansiyel (delta) güncelleme için `.blockmap` metadata algılama ve dağıtım desteği eklendi.
- **Toplu WhatsApp Görselleri — Masaüstünde Tek Klasöre / Web'de Tek ZIP'e Kaydetme**:
  - `Raporlar ve Çıktılar` ekranında *"Tüm Sınıflar"* veya *"Tüm Öğretmenler"* toplu WhatsApp PNG indirmede masaüstünde hedef klasör seçilip tüm PNG'ler tek seferde o klasöre kaydedilir ve klasör açılır; web sürümünde ise UTF-8 Türkçe dosya adlarını koruyan tek bir `.zip` arşivi indirilir.
- **Excel / e-Okul'dan Toplu Öğretmen & Şube İçe Aktarım Sihirbazı**:
  - `Öğretmenler` ve `Sınıflar ve Şubeler` sayfalarına kopyala-yapıştır veya `.csv`/`.txt` dosya yüklemeli toplu içe aktarım, örnek Excel/CSV şablonu indirme, otomatik Türkçe branş/unvan/Hazırlık sınıfı (`Hz/A`) eşleştirme ve mükerrer kayıt kontrolü eklendi.
- **SQLite Kayıtlı Ders Dağıtımları & Yan Yana Karşılaştırma**:
  - Kayıtlı dağıtımlar masaüstünde `localStorage` sınırına takılmadan yerel SQLite veritabanına (`saved_plans`) saklanır.
  - **Karşılaştır** penceresiyle herhangi iki dağıtım yerleşim oranı, öğretmen ara boşluğu (pencere), boş gün sayısı, sınıf gün dengesi ve genel kalite puanı açısından yan yana kıyaslanabilir.
- **Otomatik Ek Ders Ön Hesap Özeti (`Raporlar ve Çıktılar → Ek Ders Özeti`)**:
  - Öğretmenlerin ders saati, maaş karşılığı, gündüz ek dersi, 10 saate 1 hazırlık ve planlama, sınıf rehberliği/sosyal kulüp (+2) ve okul nöbeti (+3) hesaplarıyla otomatik haftalık/aylık Ek Ders ön raporu ve PDF/Yazdır/Word çıktısı eklendi.
- **MEB Resmî Tatil & Ara Tatil Otomatik İşleme (Aylık Nöbet Takvimi)**:
  - `Okul Nöbeti → Aylık Nöbet` sekmesine resmî bayramları ve 2025/2026–2026/2027 MEB ara/yarıyıl tatillerini tek tıkla takvimde kapatan **MEB Resmî Tatillerini İşle** düğmesi eklendi.
- **Lise & Büyük Okul Desteği (İki Öğretmenli Dersler, Ortak Seçmeli Blokları & İkili Öğretim Zil Saatleri)**:
  - `Ders Görevlendirmeleri`'nde ders kartlarına **2. Eş Öğretmen** (bölünmüş/atölye dersi) ve **Ortak Blok Grubu** (`parallelGroupId`) desteği eklendi; yükler ve program görünümleri her iki öğretmene otomatik yansır.
  - `Okul Ayarları`'nda **İkili Öğretim (Sabahçı / Öğlenci)** seçildiğinde devre bazlı ayrı zil saatleri (`Sabahçı İlk Ders`, `Öğlenci İlk Ders`) programlara ve çıktılara otomatik yansır.
- **Gerçek Chromium/Electron E2E Test Kalkanı & Tek Komut Otomasyon**:
  - 7 temel kullanıcı akışını gerçek Chromium penceresinde otomatik doğrulayan E2E test paketi (`tests/e2e/ui-flows.test.js`) ve tek komutlu web senkronizasyon/sürüm scripti (`scripts/sync-and-bump.ps1`) eklendi.

## [2.4.0] - 2026-11-26

### Yenilikler ve Düzeltmeler
- **Raporlar ve Çıktılar — Yazdır Düzeltmesi & Ayrı WhatsApp Görselleri (.png)**:
  - Masaüstü uygulamasında **Yazdır** düğmesinin Windows yazıcı penceresini açmama sorunu giderildi (`printHtmlDirect` artık görünür ve odaklanmış ana pencereye bağlı baskı penceresiyle sistem yazıcı diyalogunu doğrudan tetikler).
  - Kullanılmayan **Excel (.xls)** dışa aktarma düğmeleri kaldırıldı.
  - **Sınıflar** ve **Öğretmenler** için ayrı ayrı **WhatsApp Görseli (.png)** kartı eklendi: tek sınıf / tek öğretmen indirme veya tüm sınıflar / tüm öğretmenler toplu PNG indirme.
- **Kayıtlı Ders Dağıtımları (Anlık Görüntü Kaydet & Tekrar Kullan)**:
  - Hem **Dağıtım ve Program** hem de **Yedekleme ve Senkronizasyon** sayfalarına yapılan ders dağıtımını adlandırarak kaydetme, daha sonra tek tıkla geri yükleme (`Uygula`), ayrı JSON olarak indirme ve silme özelliği eklendi.
- **Haftalık Ders Programları — Çift Tıkla Gün ve Saat Kapatma / Açma**:
  - Program şablonlarında herhangi bir **gün başlığına** (`Pazartesi`..`Cumartesi`) çift tıklayarak tüm günü kapatıp açma; boş veya kapalı bir hücreye çift tıklayarak o tek ders saatini kapatıp açma; dolu derse çift tıklayarak kilitleme/kilit açma özelliği eklendi.
- **Okul Ayarları — İdare Bilgileri & Özelleştirilebilir Zil / Ders Saatleri**:
  - `Okul Ayarları` sayfasına öne çıkarılmış **Okul Adı**, **Okul Müdürü**, **Müdür Yardımcısı** alanları ile her ders saati için ayrı ayrı düzenlenebilir **Okul Zil ve Ders Saatleri** tablosu eklendi.
  - Girilen okul adı, müdür, müdür yardımcısı ve özel zil saatleri tüm program görünümleri, PDF, Yazdır, Word, Nöbet Çizelgesi ve WhatsApp PNG görsellerinde otomatik kullanılır.
- **Okul Nöbeti — En Yoğun Gün + Yığılmasız Eşit Haftalık Dağıtım**:
  - Haftalık otomatik nöbet algoritması min-maliyetli maksimum akış (SPFA) ile yenilendi: öğretmenleri en çok derslerinin olduğu günlere atarken aynı zamanda haftanın açık günlerine **yığılma olmadan eşit sayıda** dağıtır (ör. 7 öğretmen / 5 gün → `[2, 2, 1, 1, 1]`).

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
