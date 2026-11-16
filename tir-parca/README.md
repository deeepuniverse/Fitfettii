# TORKA — Tır Parça Mağazası (demo)

Tır, çekici ve dorse yedek parçası satan statik e-ticaret sitesi. Sunucu gerekmez; `index.html`'i herhangi bir statik barındırmaya (GitHub Pages, Netlify) koymak yeterli.

## Dosyalar
| Dosya | İçerik |
|---|---|
| `index.html` | Sayfa iskeleti (üst şerit, başlık, sepet çekmecesi, alt bilgi) |
| `styles.css` | Tasarım: kraft kâğıt + grafit + reflektif sarı-yeşil, açık/koyu tema |
| `app.js` | Sayfalar, arama, garaj, sepet, ödeme. En üstteki `CFG` bloğundan WhatsApp numarası, kargo saati ve eşiği, havale indirimi ayarlanır |
| `data.js` | Demo katalog (46 parça, 9 marka, 10 sistem). Gerçek stok/fiyat verinizle değiştirin |
| `fonts/` | Yerel fontlar (OFL lisanslı) |

## Özellikler (50 rakip sitenin incelenmesinden)
- **Tek arama kutusu:** OEM no, rakip referans no, TORKA kodu, şasi no (VIN) ya da parça adı. Türü kendisi algılar.
- **Parça haritası:** tır çizimindeki bölgeye dokun, o sistemin parçaları açılsın.
- **Garajım:** araç kaydet; her parçada "uyumlu / uyumsuz" etiketi.
- **Dürüst menşe etiketi:** OES / Muadil / Revizyon.
- **Türkiye'ye özel:** KDV dahil/hariç anahtarı, havale %3 indirim, peşin fiyatına 3 taksit, WhatsApp'tan sor (OEM no hazır yazılı), 16:00 kargo geri sayımı, ücretsiz kargo çubuğu, desi notu, bireysel/kurumsal (VKN) fatura.
- **Filo/servis:** kod listesi yapıştırarak hızlı sipariş, cari hesap başvurusu.

## Canlıya geçmeden önce
- Gerçek ödeme (iyzico / PayTR) ve sipariş kaydı için bir arka uç gerekir; şu an ödeme adımı demodur.
- `CFG.whatsapp`, telefon, adres, MERSİS/KEP bilgilerini doldurun.
- Çapraz referans numaraları örnektir; gerçek veriyle değiştirin.
