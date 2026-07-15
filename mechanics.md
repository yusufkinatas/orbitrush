# Orbitrush Mekanikleri

Orbitrush, dikey ekranda yukarı doğru ilerleyen sonsuz bir uzay koşusudur.

## Kontrol ve hareket

- Koşu, sağa-sola tarayan bir launcher içinde başlar. İlk basış oyuncuyu launcher'ın o anki açısından fırlatır.
- Oyuncu bir küredir ve gezegenlerin sabit yörünge çizgileri üzerinde döner.
- Ekrana veya `Space` tuşuna basılı tutulduğunda latch aktif kalır; oyuncu geçerli yörünge bandına girince gezegene kilitlenir.
- Tuş bırakıldığında oyuncu mevcut hareket yönüne teğet biçimde fırlar.
- Kombo arttıkça hem yörüngedeki dönüş hızı hem de gezegenler arasındaki uçuş hızı artar. Oyuncu bıraktığı gezegene, başka bir gezegene kilitlenmeden tekrar tutunamaz.
- Kısa yön noktaları launcher'da, uçuşta ve yörüngede her zaman görünür.
- Latch basılıyken hafif bir ses duyulur; gezegene bağlıyken oyuncu ile gezegen arasında ince bir bağ çizilir.

## Perfect ve Safe Latch

- İlk latch denemesi yakalanmadan kısa süre önce yapılırsa **Perfect Latch** olur.
- Çok erken basılı tutmak veya uçuş sırasında bırakıp tekrar basmak **Safe Latch** olur.
- Perfect Latch komboyu artırır; Safe Latch güvenle kilitler fakat komboyu sıfırlar.

## Kombo ve ödüller

- Kombo süre bazlıdır; süre dolarsa kombo sıfırlanır ancak koşu bitmez.
- Yüksek kombo hareket hızını, skoru, sesleri ve görsel efektleri güçlendirir.
- Gezegen yörüngelerindeki kristaller toplanabilir. Riskli rotalar daha yüksek ödül verir.

## Can ve yeniden doğma

- Her koşu `1` canla başlar.
- Her `x10` Perfect combo eşiğinde oyuncu `+1` can kazanır.
- Oyuncu yanarken ek canı varsa koşu bitmez; bir can harcanır, kombo sıfırlanır ve oyuncu son kilitlendiği gezegenin yörüngesinde yeniden doğar.

## Başarısızlık ve dünya

- Bir gezegene çarpmak veya ekranın dışına çıkmak koşuyu bitirir.
- Gezegenler kurallı biçimde rastgele üretilir ve çoğu durumda oyuncuya birden fazla rota sunar. Gezegen gövdeleri, rota açılarını gereksiz biçimde kapatmayacak kadar küçük ve hafif affedici çarpışma alanlarına sahiptir.
