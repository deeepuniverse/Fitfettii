// TORKA — demo katalog verisi.
// Fiyatlar, stoklar ve OEM numaraları örnektir; gerçek satışa geçmeden önce kendi ERP/stok verinizle değiştirin.

window.TORKA = (function () {
  const brands = [
    { id: "mercedes", name: "Mercedes-Benz", models: ["Actros MP4", "Actros MP5", "Axor", "Arocs"] },
    { id: "volvo", name: "Volvo", models: ["FH4", "FH5", "FM", "FMX"] },
    { id: "scania", name: "Scania", models: ["R Serisi", "S Serisi", "G Serisi", "P Serisi"] },
    { id: "man", name: "MAN", models: ["TGX", "TGS", "TGA", "TGM"] },
    { id: "daf", name: "DAF", models: ["XF 106", "XG", "CF", "LF"] },
    { id: "iveco", name: "Iveco", models: ["S-Way", "Stralis", "Trakker", "Eurocargo"] },
    { id: "renault", name: "Renault Trucks", models: ["T", "C", "K", "Premium"] },
    { id: "ford", name: "Ford Trucks", models: ["F-MAX", "Cargo 1846", "Cargo 3542"] },
    { id: "bmc", name: "BMC", models: ["Tuğra", "Pro 1142", "Fatih"] },
  ];

  // Kategori: id, ad, kamyon üzerindeki bölge (SVG haritası ile eşleşir), alt kategoriler
  const categories = [
    { id: "motor", name: "Motor", zone: "engine", subs: ["Piston & Segman", "Conta Takımı", "Turbo", "Enjektör", "Su Pompası"] },
    { id: "fren", name: "Fren Sistemi", zone: "wheels", subs: ["Balata", "Disk", "Kampana", "Fren Körüğü", "Kaliper"] },
    { id: "havali", name: "Havalı Sistem", zone: "chassis", subs: ["Kurutucu Filtre", "Kompresör", "Valf", "Hava Tankı"] },
    { id: "sanziman", name: "Şanzıman & Debriyaj", zone: "drivetrain", subs: ["Debriyaj Seti", "Baskı", "Rulman", "Vites Servosu"] },
    { id: "suspansiyon", name: "Süspansiyon", zone: "chassis", subs: ["Körük", "Amortisör", "Makas", "Rot & Z-Rot"] },
    { id: "filtre", name: "Filtre & Bakım", zone: "engine", subs: ["Yağ Filtresi", "Yakıt Filtresi", "Hava Filtresi", "Polen Filtresi", "AdBlue Filtresi"] },
    { id: "elektrik", name: "Elektrik & Aydınlatma", zone: "cab", subs: ["Far", "Stop", "Alternatör", "Marş Motoru", "Sensör"] },
    { id: "sogutma", name: "Soğutma", zone: "engine", subs: ["Radyatör", "İntercooler", "Fan Kavrama", "Termostat"] },
    { id: "kabin", name: "Kabin & Kaporta", zone: "cab", subs: ["Ayna", "Tampon", "Kabin Amortisörü", "Silecek"] },
    { id: "egzoz", name: "Egzoz & AdBlue", zone: "drivetrain", subs: ["AdBlue Pompası", "NOx Sensörü", "DPF", "Susturucu"] },
  ];

  const makers = ["Bosch", "Knorr-Bremse", "WABCO", "MANN-FILTER", "SACHS", "febi", "Diesel Technic", "MAHLE", "HELLA", "Continental", "Behr", "Textar"];

  // [ad, kategori, alt kat., üretici, fiyat TL, stok, uyumlu markalar, OEM ref, öne çıkan özellik]
  const raw = [
    ["Disk Fren Balata Seti (Ön Aks)", "fren", "Balata", "Textar", 4850, 34, ["mercedes", "man", "daf"], "29202 / 29253", "R90 sertifikalı, aşınma sensörlü"],
    ["Fren Diski 430×45 mm", "fren", "Disk", "Knorr-Bremse", 6920, 12, ["volvo", "renault"], "K 012 345 · 21 040 ...", "Havalandırmalı, dengelenmiş"],
    ["Fren Körüğü Tip 24/24 (Yaylı)", "fren", "Fren Körüğü", "WABCO", 3780, 21, ["mercedes", "man", "scania", "daf", "iveco"], "925 xxx 0 · TP 24/24", "Uzun stroklu, korozyona dirençli"],
    ["Fren Kaliperi SN7 Revizyonlu", "fren", "Kaliper", "Knorr-Bremse", 18450, 4, ["daf", "iveco", "ford"], "K0xx 6xx · SN7", "Revizyon + 2 yıl garanti"],
    ["Kampana 410×220", "fren", "Kampana", "febi", 5260, 9, ["bmc", "ford"], "FEB 0xx 410", "Dorse/çekici uyumlu"],
    ["Hava Kurutucu Filtre Kartuşu", "havali", "Kurutucu Filtre", "MANN-FILTER", 1240, 88, ["mercedes", "volvo", "scania", "man", "daf", "iveco", "renault", "ford", "bmc"], "TB 1374 x", "Yağ ayırıcılı, M39×1.5"],
    ["Hava Kompresörü 2 Silindir 720 cc", "havali", "Kompresör", "Knorr-Bremse", 32900, 3, ["mercedes"], "LP 4985 / A 457 ...", "Fabrika revizyonlu"],
    ["Dört Devre Koruma Valfi", "havali", "Valf", "WABCO", 4410, 15, ["man", "daf", "volvo"], "934 702 ...", "Entegre basınç sınırlayıcı"],
    ["Debriyaj Seti 430 mm (Disk+Baskı)", "sanziman", "Debriyaj Seti", "SACHS", 21750, 7, ["mercedes", "man"], "3400 700 ...", "Organik balata, 4 yay"],
    ["Debriyaj Rulmanı Pnömatik", "sanziman", "Rulman", "SACHS", 3980, 18, ["scania", "volvo"], "3100 000 ...", "Kendinden ayarlı"],
    ["Vites Servo Silindiri", "sanziman", "Vites Servosu", "WABCO", 9640, 5, ["mercedes"], "421 365 ...", "G211/G281 şanzıman"],
    ["Havalı Körük Arka Aks (Pistonlu)", "suspansiyon", "Körük", "Continental", 2890, 46, ["mercedes", "daf", "man"], "4881 NP 02", "Çelik piston, 1 yıl garanti"],
    ["Kabin Amortisörü Ön", "kabin", "Kabin Amortisörü", "SACHS", 1690, 31, ["volvo", "renault"], "SA 3122 ...", "Gazlı, 2'li takım fiyatı"],
    ["Amortisör Arka Aks", "suspansiyon", "Amortisör", "SACHS", 3240, 26, ["scania"], "SA 3135 ...", "Ağır yük valf ayarı"],
    ["Z-Rot (Reaksiyon Kolu)", "suspansiyon", "Rot & Z-Rot", "febi", 2460, 19, ["mercedes", "man", "iveco"], "FEB 3xx Z", "Kauçuk burç dahil"],
    ["Turbo Şarj VGT", "motor", "Turbo", "MAHLE", 46800, 2, ["volvo", "renault"], "228 TC ...", "D13 motor, aktüatörlü"],
    ["Piston-Segman Seti Ø130", "motor", "Piston & Segman", "MAHLE", 15900, 6, ["mercedes"], "001 PI ...", "OM 471 · tek silindir"],
    ["Silindir Kapak Contası", "motor", "Conta Takımı", "febi", 2180, 22, ["daf", "scania"], "FEB 4xx CK", "Çok katmanlı çelik"],
    ["Enjektör Common Rail", "motor", "Enjektör", "Bosch", 14250, 8, ["man", "iveco", "daf"], "0 445 120 ...", "Bosch Exchange revizyon"],
    ["Su Pompası", "motor", "Su Pompası", "Diesel Technic", 3870, 14, ["mercedes", "bmc"], "DT 4.6x...", "Contalı, kasnaklı"],
    ["Yağ Filtresi", "filtre", "Yağ Filtresi", "MANN-FILTER", 560, 240, ["mercedes", "man", "daf", "scania"], "HU 12 140 x", "Metal içermeyen eko filtre"],
    ["Yakıt Filtresi Su Ayırıcılı", "filtre", "Yakıt Filtresi", "MANN-FILTER", 890, 170, ["volvo", "renault", "scania"], "PL 420 x", "Su seviye sensörlü"],
    ["Hava Filtresi Ana Eleman", "filtre", "Hava Filtresi", "MANN-FILTER", 1380, 96, ["mercedes", "volvo", "daf", "iveco"], "C 37 1530", "Nano lif teknolojisi"],
    ["AdBlue Filtre Elemanı", "filtre", "AdBlue Filtresi", "MAHLE", 640, 64, ["mercedes", "man", "daf", "volvo"], "LX AD ...", "Euro 6 uyumlu"],
    ["Periyodik Bakım Seti 4'lü", "filtre", "Yağ Filtresi", "MANN-FILTER", 3290, 40, ["mercedes", "ford"], "SET-OM471", "Yağ+yakıt+hava+kurutucu"],
    ["LED Far Sol (H7 Yuvalı)", "elektrik", "Far", "HELLA", 11450, 6, ["daf"], "1EX 3xx ...", "E-onaylı, gündüz ışıklı"],
    ["LED Stop Lambası 7 Fonksiyonlu", "elektrik", "Stop", "HELLA", 2840, 33, ["mercedes", "volvo", "scania", "man", "daf", "iveco", "renault", "ford", "bmc"], "2VP 3xx ...", "24V, dinamik sinyal"],
    ["Alternatör 28V 120A", "elektrik", "Alternatör", "Bosch", 12890, 7, ["scania", "volvo"], "0 124 555 ...", "Regülatörlü"],
    ["Marş Motoru 24V 6.0 kW", "elektrik", "Marş Motoru", "Bosch", 15640, 5, ["man", "mercedes"], "0 001 261 ...", "Yeni, değişimsiz"],
    ["ABS Sensörü (Düz)", "elektrik", "Sensör", "WABCO", 1180, 75, ["mercedes", "volvo", "scania", "man", "daf", "iveco", "renault"], "441 032 ...", "Kablo 1.0 m"],
    ["Radyatör Alüminyum", "sogutma", "Radyatör", "Behr", 17200, 3, ["scania"], "8MK 376 ...", "Çerçeveli, sızdırmazlık testli"],
    ["İntercooler", "sogutma", "İntercooler", "Behr", 13950, 4, ["mercedes"], "8ML 376 ...", "Actros MP4/MP5"],
    ["Fan Kavraması Viskoz", "sogutma", "Fan Kavrama", "Behr", 8760, 9, ["volvo", "renault", "daf"], "8MV 376 ...", "Elektronik kontrollü"],
    ["Termostat 83°C", "sogutma", "Termostat", "MAHLE", 990, 52, ["man", "iveco", "bmc"], "TX 1xx 83D", "Contalı"],
    ["Ayna Camı Isıtmalı (Sağ)", "kabin", "Ayna", "Diesel Technic", 780, 58, ["mercedes", "man", "daf"], "DT 2.73x...", "Elektrikli ayar soketi"],
    ["Ön Tampon Orta Parça", "kabin", "Tampon", "Diesel Technic", 7350, 3, ["volvo"], "DT 6.7x...", "Astarlı, boyaya hazır"],
    ["Silecek Süpürgesi 650 mm", "kabin", "Silecek", "Bosch", 420, 130, ["mercedes", "volvo", "scania", "man", "daf", "iveco", "renault", "ford", "bmc"], "3 397 018 ...", "Twin, adaptörlü"],
    ["AdBlue Pompa Modülü", "egzoz", "AdBlue Pompası", "Bosch", 23400, 2, ["daf", "iveco", "man"], "0 444 042 ...", "Denoxtronic 2.2"],
    ["NOx Sensörü (Çıkış)", "egzoz", "NOx Sensörü", "Continental", 9850, 10, ["mercedes", "volvo", "scania", "daf"], "5WK9 ...", "Euro 6, kalibre"],
    ["DPF Partikül Filtresi", "egzoz", "DPF", "Diesel Technic", 38900, 1, ["man"], "DT 3.18x...", "Kanallar temizlenmiş, test raporlu"],
    ["Susturucu Gövdesi", "egzoz", "Susturucu", "febi", 16450, 2, ["ford", "bmc"], "FEB 6xx SU", "Paslanmaz iç boru"],
    ["Rot Başı Sol", "suspansiyon", "Rot & Z-Rot", "febi", 1340, 47, ["scania", "volvo", "daf"], "FEB 1xx RB", "Gresörlüklü"],
    ["Makas Burcu Seti", "suspansiyon", "Makas", "Diesel Technic", 960, 66, ["bmc", "ford", "mercedes"], "DT 1.2x...", "Poliüretan, 4 adet"],
    ["Hava Tankı 40 L", "havali", "Hava Tankı", "WABCO", 5620, 6, ["daf", "man", "iveco"], "950 xxx ...", "Alüminyum, tahliye valfli"],
    ["Polen Filtresi Aktif Karbonlu", "filtre", "Polen Filtresi", "MANN-FILTER", 480, 115, ["volvo", "scania", "daf"], "CUK 3xxx", "Koku filtreli"],
    ["Krank Keçesi Arka", "motor", "Conta Takımı", "Diesel Technic", 1120, 37, ["scania", "renault"], "DT 1.1x...", "PTFE dudaklı"],
  ];

  const products = raw.map((r, i) => {
    const [name, cat, sub, maker, price, stock, fits, oem, feat] = r;
    const id = "TK-" + String(1001 + i);
    // Deterministik yardımcı değerler (rastgele değil — her yüklemede aynı)
    const old = i % 4 === 0 ? Math.round(price * 1.18 / 10) * 10 : null;
    const rating = (4.2 + ((i * 7) % 8) / 10).toFixed(1);
    const reviews = 8 + ((i * 37) % 140);
    const weight = (0.3 + ((i * 13) % 90) / 3).toFixed(1);
    // Menşe etiketi: dürüstçe belirtilir (araştırma: her şeye "orijinal" yazmak güveni düşürür)
    const origin = /revizyon/i.test(feat + name) ? "Revizyon"
      : ["febi", "Diesel Technic"].includes(maker) ? "Muadil"
      : "OES"; // Original Equipment Supplier: üreticinin fabrikaya verdiği marka
    const warehouse = i % 3 === 0 ? "Ankara" : "İstanbul";
    return { id, name, cat, sub, maker, price, old, stock, fits, oem, feat, rating, reviews, weight, origin, warehouse };
  });

  return { brands, categories, makers, products };
})();
