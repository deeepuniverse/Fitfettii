# Fitfetti

Ücretsiz, reklamsız kalori, protein, su, spor ve kardiyo takibi. Telefona uygulama gibi kurulur, internetsiz de çalışır. Kayıtlar yalnızca kullanıcının kendi cihazında saklanır; sunucu yok, hesap yok.

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `index.html` | Uygulamanın tamamı |
| `manifest.webmanifest` | Ad, ikon ve renkler (telefona kurulum için) |
| `sw.js` | Çevrimdışı çalışma. Her güncellemede içindeki `VERSION` değerini artır (`v1` → `v2`). |
| `lang-packs.js` | Türkçe ve İngilizce dışındaki dil paketleri |
| `icons/` | Uygulama ikonları |

## Bedava yayınlama (GitHub Pages)

1. github.com'da ücretsiz hesap aç ve **New repository** ile yeni bir depo oluştur (ör. `fitfetti`, **Public**).
2. **Add file → Upload files** ile bu klasördeki her şeyi (icons klasörü dahil) sürükleyip bırak, **Commit changes**'e bas.
3. **Settings → Pages** bölümünde **Source: Deploy from a branch**, **Branch: main / (root)** seç ve kaydet.
4. Bir iki dakika sonra uygulama `https://KULLANICI-ADIN.github.io/fitfetti/` adresinde yayında olur.

## Telefona kurma

- **iPhone (Safari):** Paylaş düğmesi → **Ana Ekrana Ekle**.
- **Android (Chrome):** Menü → **Uygulamayı yükle** ya da **Ana ekrana ekle**.

## Veriler

- Ürün araması **Open Food Facts** açık veritabanını kullanır (ODbL lisansı; uygulamada kaynak belirtilir).
- Kayıtlar tarayıcıda saklanır. Telefon değişikliğinde **Yedekleme → Yedeği indir**, yeni cihazda **Yedeği yükle**.
- Uygulama tıbbi tavsiye vermez.
