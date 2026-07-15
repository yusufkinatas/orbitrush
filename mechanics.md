# Orbitrush Mekanikleri

Orbitrush, dikey ekranda yukarı doğru ilerleyen sonsuz bir uzay koşusudur.

## Kontrol ve hareket

- Oyuncu bir küredir ve gezegenlerin yörünge çizgileri üzerinde döner.
- Her koşu, ekranın altındaki açısı yavaşça sağa-sola salınan bir launcher içinde başlar. İlk basış küreyi launcher'ın o an gösterdiği açıdan fırlatır; başlangıçta bir gezegenin çevresinde dönülmez.
- Ekrana veya `Space` tuşuna basılı tutulduğunda latch aktif kalır; oyuncu geçerli yörünge bandına girince gezegene kilitlenir.
- Tuş bırakıldığında oyuncu mevcut hareket yönüne teğet biçimde fırlar.
- Kürenin gideceği teğet yön, launcher dahil her zaman dört kısa noktayla gösterilir. Gerçek latch tolerans bandı yalnız Developer Helper UI açıkken görünür.
- Basılı tutarken çok hafif bir latch tonu duyulur; bir gezegene bağlanınca ton küçük biçimde değişir. Bağlı küre ile gezegenin merkezi arasında ince, kesikli bir enerji bağı çizilir.
- İlk kez oynayan kullanıcıda launcher'dan fırlatma ve yaklaşırken basılı tutma anlatılır. İlk başarılı latch sonrasında eğitim tamamlanır ve kalıcı olarak gizlenir.
- Kombo arttıkça hem yörüngedeki dönüş hızı hem de gezegenler arasındaki uçuş hızı artar. Oyuncu bıraktığı gezegene, başka bir gezegene kilitlenmeden tekrar tutunamaz.
- Oyun ilerledikçe gezegenler küçülür, gezegen sıraları arasındaki mesafe koşunun ulaştığı en yüksek tempoya göre büyür ve kamera yumuşak biçimde geri çekilir. Böylece yüksek hızda da uçuş süresi ve rota okuma alanı korunur.

## Gezegen türleri

Özel gezegenler ilk bölümde üretilmez; koşu ilerledikçe sırayla açılır ve giderek daha sık görülür.

- **Hızlı gezegen:** Oyuncuyu normalden yaklaşık `%35` daha hızlı döndürür.
- **Hareketli gezegen:** Önceden görülebilen kesikli bir hat üzerinde sağ-sol veya aşağı-yukarı salınır. Oyuncu yörüngedeyken gezegenle birlikte taşınır; bırakırken gezegenin hareketinden küçük bir momentum payı alır.
- **Ters gezegen:** Kilitlenme anında doğal dönüş yönünü tersine çevirir.
- **Kararsız gezegen:** Yörünge yarıçapı düzenli biçimde daralıp genişler; oyuncu ve kristaller aktif yörüngeyi takip eder.
- **Kırılgan gezegen:** Yaklaşık dörtte üç tur dayanır. Süre dolunca parçalanır ve oyuncuyu mevcut teğet yönünde otomatik olarak fırlatır. Zorunlu fırlatma latch'i devreden çıkarır; tekrar kilitlenmek için oyuncunun bırakıp yeniden basması gerekir.
- Özel gezegenler risklerine göre normal gezegenlerden daha yüksek latch skoru verir. Türleri merkezlerindeki sembol ve kendilerine özel renk/hareket ile önceden okunabilir.

## Asteroit kuşağı

- Asteroit kuşakları ilk gezegenlerde çıkmaz; oyuncu temel ritmi öğrendikten sonra gezegen sıraları arasında görünmeye başlar.
- Her kuşak, önceki gezegen sırasından hedeflerden birine çizilen rotanın orta noktasında, ekranda gerçek genişliğiyle işaretlenen geniş bir güvenli koridorla üretilir.
- Demo dengesi için kuşaklardaki asteroit sayısı ve boyutu düşüktür; çarpışma alanı da görünen şekilden bir miktar daha affedicidir. Böylece asteroitler rota kararı yaratır ancak doğru fırlatma açısını gereksiz yere kapatmaz.
- Asteroitler kendi çevrelerinde döner fakat konumları sabittir; böylece rota zorlaşır ancak son anda rastgele kapanmaz.
- Uçuş sırasında bir asteroide temas etmek koşuyu bitirir. Yüksek hızda asteroitlerin içinden atlanmaması için çarpışma, oyuncunun kareler arasındaki bütün hareket çizgisinde kontrol edilir.

## Perfect ve Safe Latch

- İlk latch denemesi yakalanmadan kısa süre önce yapılırsa **Perfect Latch** olur.
- Çok erken basılı tutmak veya uçuş sırasında bırakıp tekrar basmak **Safe Latch** olur.
- Perfect Latch komboyu artırır; Safe Latch güvenle kilitler fakat komboyu sıfırlar.
- Safe Latch, `x5` seviyesinin üstündeki aktif bir komboyu bozarsa normal kilit sesinin altına düşük seviyeli, aşağı inen kısa bir başarısızlık tonu eklenir.

## Kombo ve ödüller

- Kombo süre bazlıdır; süre dolarsa kombo sıfırlanır ancak koşu bitmez.
- Yüksek kombo hareket hızını, skoru, sesleri ve görsel efektleri güçlendirir.
- Kombo eşikleri `x5 IGNITION`, `x10 OVERDRIVE` ve `x15 SUPERNOVA` olarak adlandırılır. Her eşik kürenin koronasını, iz uzunluğunu, parçacıklarını, ekran yıldızlarını ve ses katmanlarını güçlendirir.
- `x10` ve üzerindeki her Perfect Latch kısa bir zaman yavaşlaması ve özel ses vuruşu üretir. `x10` ve `x15` eşiklerinde daha güçlü bir slow-motion kullanılır. Perfect zaman penceresi ve kombo sayacı gerçek zamanla ölçülmeye devam eder; slow-motion bu sayaçları uzatmaz.
- Oyuncu koşuya bir canla başlar ve ulaştığı her `x10` kombo katında bir ek can kazanır. Ek canlar Safe Latch veya kombo süresinin dolmasıyla silinmez.
- Destekleyen telefonlarda bırakma, Safe/Perfect Latch, eşikler, kristal toplama, kırılma ve ölüm için farklı titreşim desenleri çalınır. Haptik desteklenmiyorsa oyun sessizce normal çalışır.

## Kristaller ve görünümler

- Gezegen yörüngelerindeki kristaller hem koşu skorunu artırır hem de toplandıkları anda kalıcı kristal cüzdanına eklenir.
- Cüzdan, sahip olunan görünümler ve kuşanılmış görünüm `localStorage` içinde tek bir sürümlü oyuncu profili olarak saklanır.
- Hazır ve ölüm ekranlarındaki **Görünümler** mağazasında beş kozmetik küre bulunur: ücretsiz `ION CORE`; ardından `SOLAR FLARE` (◆35), `VOID BLOOM` (◆90), `PRISM SHIFT` (◆220) ve `EVENT HORIZON` (◆500).
- Görünümler çekirdek, korona, akresyon halkası ve iz efektlerini değiştirir; oyuncu yarıçapını, hitbox'ı veya oynanış gücünü değiştirmez.

## Başarısızlık ve dünya

- Bir gezegene ya da asteroide çarpmak veya geri çekilmiş kameranın görünür alanının dışına çıkmak ölüm tetikler.
- Oyuncunun ek canı varsa bir can harcanır, kombo sıfırlanır ve küre otomatik olarak en son latch olduğu gezegenin yörüngesine geri yerleştirilir; skor ve o koşuda toplanan kristaller korunur. Son canla ölmek koşuyu bitirir.
- Gezegenler kurallı biçimde rastgele üretilir ve çoğu durumda oyuncuya birden fazla rota sunar.
