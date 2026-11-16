/* TORKA — tır parça mağazası (statik, hash yönlendirmeli tek sayfa uygulama) */
(function () {
  "use strict";

  // ---------- Ayarlar (canlıya geçerken değiştirin) ----------
  const CFG = {
    whatsapp: "905000000000",   // TODO: gerçek WhatsApp hattı
    cutoffHour: 16,             // hafta içi aynı gün kargo kesim saati
    satCutoffHour: 13,
    freeShip: 2500,             // ücretsiz kargo eşiği (TL)
    shipFee: 189,
    havale: 0.03,               // havale/EFT indirimi
    vat: 0.20,
  };

  const { brands, categories, makers, products } = window.TORKA;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const app = $("#app");
  const byId = Object.fromEntries(products.map(p => [p.id, p]));
  const catById = Object.fromEntries(categories.map(c => [c.id, c]));
  const brandById = Object.fromEntries(brands.map(b => [b.id, b]));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const trLower = s => String(s).toLocaleLowerCase("tr-TR");
  const norm = s => trLower(s).replace(/[ıi̇]/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");

  // ---------- Kalıcı durum (tarayıcıda) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("torka:" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("torka:" + k, JSON.stringify(v)); } catch (e) { /* gizli mod vb. */ } },
  };
  const state = {
    cart: store.get("cart", {}),             // { id: qty }
    garage: store.get("garage", []),         // [{ id, brand, model, year, plate }]
    active: store.get("active", null),       // garaj id
    vatIncl: store.get("vatIncl", true),
    theme: store.get("theme", null),
  };
  const save = () => { store.set("cart", state.cart); store.set("garage", state.garage); store.set("active", state.active); store.set("vatIncl", state.vatIncl); };

  // ---------- Biçimlendirme ----------
  const nf = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const shown = p => state.vatIncl ? p : p / (1 + CFG.vat);
  const tl = p => nf.format(shown(p)) + " ₺";
  const vatNote = () => state.vatIncl ? "KDV dahil" : "+KDV";

  // ---------- SVG çizimleri (her kategori için teknik çizim) ----------
  const ICON = {
    motor: '<rect x="14" y="22" width="36" height="26" rx="2"/><path d="M20 22v-8h24v8M26 14v-4h12v4M50 30h6v10h-6M14 34H8M22 48v6M42 48v6"/><circle cx="32" cy="35" r="6"/>',
    fren: '<circle cx="30" cy="34" r="20"/><circle cx="30" cy="34" r="6"/><path d="M30 14v4M30 50v4M10 34h4M46 34h4"/><path d="M42 16c10 4 14 12 14 18s-4 14-14 18" stroke-width="6" opacity=".9"/>',
    havali: '<rect x="10" y="24" width="38" height="22" rx="11"/><path d="M48 35h8M52 29v12M18 24v-6h8v6M29 46v6"/><circle cx="22" cy="35" r="3"/>',
    sanziman: '<circle cx="32" cy="32" r="10"/><path d="M32 12v6M32 46v6M12 32h6M46 32h6M18 18l4 4M42 42l4 4M18 46l4-4M42 22l4-4"/><circle cx="32" cy="32" r="17"/>',
    suspansiyon: '<path d="M20 10h24M20 54h24"/><path d="M24 14c0 4 16 4 16 8s-16 4-16 8 16 4 16 8-16 4-16 8 16 4 16 8"/><path d="M32 10v-4M32 54v4"/>',
    filtre: '<rect x="18" y="12" width="28" height="40" rx="4"/><path d="M18 20h28M18 44h28M24 20v24M30 20v24M36 20v24M42 20v24"/><circle cx="32" cy="8" r="3"/>',
    elektrik: '<path d="M36 6 18 36h12l-4 22 20-32H34z"/>',
    sogutma: '<rect x="8" y="12" width="48" height="40" rx="2"/><path d="M8 20h48M8 28h48M8 36h48M8 44h48"/><circle cx="32" cy="32" r="9" fill="var(--paper-2)"/><path d="M32 23v18M23 32h18"/>',
    kabin: '<path d="M12 50V20a8 8 0 0 1 8-8h22l10 14v24z"/><path d="M18 18h20l6 10H18z"/><rect x="52" y="22" width="6" height="14" rx="2"/><path d="M12 42h40"/>',
    egzoz: '<rect x="8" y="24" width="30" height="18" rx="9"/><path d="M38 33h12c4 0 6-2 6-6V10"/><path d="M14 24v18M32 24v18"/>',
  };
  const icon = (cat, w = 64) => `<svg viewBox="0 0 64 64" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[cat] || ICON.motor}</svg>`;

  // ---------- Garaj & uyum ----------
  const activeTruck = () => state.garage.find(t => t.id === state.active) || null;
  const truckLabel = t => `${brandById[t.brand]?.name || t.brand} ${t.model}${t.year ? " · " + t.year : ""}`;
  function fitStatus(p) {
    const t = activeTruck();
    if (!t) return { cls: "na", txt: "Uyum için garajına tır ekle" };
    return p.fits.includes(t.brand)
      ? { cls: "yes", txt: `✓ ${brandById[t.brand].name} ${t.model} ile uyumlu` }
      : { cls: "no", txt: `✕ ${brandById[t.brand].name} ${t.model} ile uyumsuz` };
  }

  // ---------- Kesim saati / teslim tarihi ----------
  function cutoffInfo(now = new Date()) {
    const d = now.getDay();
    const h = d === 6 ? CFG.satCutoffHour : CFG.cutoffHour;
    const cut = new Date(now); cut.setHours(h, 0, 0, 0);
    const open = d !== 0 && now < cut;
    return { open, ms: cut - now };
  }
  function deliveryDate(now = new Date()) {
    const d = new Date(now);
    const { open } = cutoffInfo(now);
    let add = open ? 1 : 2;
    while (add > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) add--; }
    return d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  }
  function tickCutoff() {
    const el = $("#cutoff");
    const c = cutoffInfo();
    if (c.open) {
      const s = Math.floor(c.ms / 1000), hh = String(Math.floor(s / 3600)).padStart(2, "0"), mm = String(Math.floor(s % 3600 / 60)).padStart(2, "0"), ss = String(s % 60).padStart(2, "0");
      el.innerHTML = `Aynı gün kargo için kalan süre: <b>${hh}:${mm}:${ss}</b>`;
    } else {
      el.innerHTML = `Şimdi verilen siparişler <b>sonraki iş günü</b> kargoda`;
    }
  }

  // ---------- Arama: türü algıla + eşleştir ----------
  const VIN_WMI = { WDB: "mercedes", WDF: "mercedes", W1T: "mercedes", YV2: "volvo", YS2: "scania", WMA: "man", XLR: "daf", ZCF: "iveco", VF6: "renault", VF7: "renault" };
  function detectKind(q) {
    const s = q.trim().toUpperCase();
    if (!s) return null;
    if (/^TK-?\d{3,}/.test(s)) return { k: "TORKA KODU", t: "code" };
    if (/^[A-HJ-NPR-Z0-9]{17}$/.test(s)) return { k: "ŞASİ NO", t: "vin", brand: VIN_WMI[s.slice(0, 3)] || null };
    const digits = (s.match(/\d/g) || []).length;
    if (digits >= 3 && digits / s.replace(/\s/g, "").length > 0.45) return { k: "OEM / REF NO", t: "oem" };
    return { k: "PARÇA ADI", t: "text" };
  }
  function search(q, limit = 60) {
    const k = detectKind(q);
    if (!k) return [];
    if (k.t === "vin") return k.brand ? products.filter(p => p.fits.includes(k.brand)).slice(0, limit) : [];
    const words = norm(q).split(/\s+/).filter(w => w.length > 1);
    const compact = norm(q).replace(/[\s.\-/]/g, "");
    const scored = products.map(p => {
      const hay = norm([p.id, p.name, p.sub, p.maker, catById[p.cat].name, p.oem, p.feat, ...p.fits.map(f => brandById[f].name)].join(" "));
      const oemC = norm(p.oem + p.id).replace(/[\s.\-/]/g, "");
      let s = 0;
      if (compact.length >= 3 && oemC.includes(compact)) s += 10;
      for (const w of words) { if (hay.includes(w)) s += norm(p.name).includes(w) ? 3 : 1; else if (k.t === "text") s -= 2; }
      return [s, p];
    }).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]);
    // Numara tam eşleştiyse gevşek kelime eşleşmelerini gösterme
    if (scored.length && scored[0][0] >= 10) return scored.filter(([s]) => s >= 10).slice(0, limit).map(([, p]) => p);
    return scored.slice(0, limit).map(([, p]) => p);
  }

  // ---------- Bileşenler ----------
  const originTag = p => `<span class="tag ${p.origin === "OES" ? "oes" : p.origin === "Muadil" ? "muadil" : "rev"}" title="${esc(ORIGIN_HELP[p.origin])}">${p.origin}</span>`;
  const ORIGIN_HELP = {
    OES: "Araç üreticisine fabrikada parça veren markanın ürünü",
    Muadil: "Bağımsız üreticinin, orijinal ölçülere uygun ürünü",
    Revizyon: "Fabrikada yenilenmiş, test edilmiş ve garantili parça",
  };
  const stockHtml = p => p.stock <= 5
    ? `<div class="stock low"><i></i>Son ${p.stock} adet · ${p.warehouse}</div>`
    : `<div class="stock"><i></i>${p.stock > 50 ? "50+" : p.stock} stokta · ${p.warehouse}</div>`;
  function card(p) {
    const f = fitStatus(p);
    const disc = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
    return `<article class="card">
      <a class="fig" href="#/urun/${p.id}" aria-label="${esc(p.name)}">
        <div class="tags">${originTag(p)}</div>${disc ? `<span class="disc">−%${disc}</span>` : ""}
        ${icon(p.cat)}
      </a>
      <div class="meta"><span>${esc(p.maker)}</span><span>${p.id}</span></div>
      <div class="body">
        <a class="ttl" href="#/urun/${p.id}">${esc(p.name)}</a>
        <div class="oem" title="OEM / çapraz referans">OEM ${esc(p.oem)}</div>
        <div class="fit ${f.cls}">${f.txt}</div>
      </div>
      <div class="foot">
        <div><div class="price">${p.old ? `<s>${tl(p.old)}</s>` : ""}${tl(p.price)}</div>${stockHtml(p)}</div>
        <button class="add" data-add="${p.id}" aria-label="${esc(p.name)} sepete ekle">+</button>
      </div>
    </article>`;
  }
  const countIn = cat => products.filter(p => p.cat === cat).length;

  // ---------- Kamyon haritası (imza öğe) ----------
  const ZONES = {
    cab: { t: "Kabin & Elektrik", cats: ["kabin", "elektrik"] },
    engine: { t: "Motor, Filtre & Soğutma", cats: ["motor", "filtre", "sogutma"] },
    drivetrain: { t: "Şanzıman & Egzoz", cats: ["sanziman", "egzoz"] },
    chassis: { t: "Süspansiyon & Havalı Sistem", cats: ["suspansiyon", "havali"] },
    wheels: { t: "Fren Sistemi", cats: ["fren"] },
  };
  function truckSvg() {
    const z = (id, shape) => `<g class="zone" data-zone="${id}" tabindex="0" role="button" aria-label="${ZONES[id].t}">${shape}</g>`;
    const wheel = (cx) => `<circle class="fillp stroke" cx="${cx}" cy="246" r="31"/><circle class="thin" cx="${cx}" cy="246" r="19"/><circle class="pin" cx="${cx}" cy="246" r="5"/>`;
    return `<svg viewBox="0 0 600 300" role="img" aria-label="Tır şeması: bir bölgeye dokunarak parçaları gör">
      <!-- zemin çizgisi -->
      <path class="thin" d="M10 278H590" stroke-dasharray="4 6"/>
      <!-- isabet bölgeleri -->
      ${z("cab", '<rect class="hit" x="404" y="22" width="162" height="150" rx="8"/>')}
      ${z("engine", '<rect class="hit" x="418" y="172" width="148" height="40" rx="6"/>')}
      ${z("drivetrain", '<rect class="hit" x="268" y="180" width="150" height="50" rx="6"/>')}
      ${z("chassis", '<rect class="hit" x="36" y="176" width="232" height="44" rx="6"/>')}
      <!-- çizim -->
      <g pointer-events="none">
        <path class="fillp stroke" d="M410 212V70q0-16 16-16h100q16 0 19 15l14 80 3 63z"/>
        <path class="stroke" d="M410 56q30-34 112-20l6 18"/>
        <rect class="thin" x="424" y="70" width="66" height="34" rx="3"/>
        <path class="stroke" d="M518 68l24 4 12 66h-36z"/>
        <rect class="thin" x="424" y="112" width="74" height="86" rx="3"/>
        <path class="thin" d="M488 152h8"/>
        <rect class="fillp stroke" x="548" y="174" width="16" height="10" rx="2"/>
        <rect class="fillp stroke" x="396" y="22" width="9" height="78" rx="3"/>
        <rect class="fillp stroke" x="30" y="204" width="536" height="14" rx="2"/>
        <rect class="fillp stroke" x="140" y="188" width="104" height="14" rx="3"/>
        <circle class="thin" cx="192" cy="195" r="4"/>
        <rect class="fillp stroke" x="300" y="182" width="84" height="32" rx="8"/>
        <path class="thin" d="M310 190h64M310 198h64"/>
        <rect class="fillp stroke" x="384" y="214" width="28" height="18" rx="3"/>
        <path class="stroke" d="M384 223H210" stroke-dasharray="10 4"/>
        <path class="stroke" d="M86 246a44 44 0 0 1 88 0M166 246a44 44 0 0 1 88 0M446 246a44 44 0 0 1 88 0" opacity=".5"/>
        <path class="thin" d="M100 218v-10M240 218v-10"/>
      </g>
      ${z("wheels", `<circle class="hit" cx="130" cy="246" r="38"/><circle class="hit" cx="210" cy="246" r="38"/><circle class="hit" cx="490" cy="246" r="38"/>`)}
      <g pointer-events="none">${wheel(130)}${wheel(210)}${wheel(490)}</g>
      <!-- etiketler -->
      <g pointer-events="none">
        <path class="thin" d="M480 22v-12h70"/><text class="callout" x="482" y="8">01 KABİN</text>
        <path class="thin" d="M560 196h24v-40"/><text class="callout" x="540" y="148">02 MOTOR</text>
        <path class="thin" d="M342 182v-40h-20"/><text class="callout" x="250" y="138">03 AKTARMA</text>
        <path class="thin" d="M70 204v-50h20"/><text class="callout" x="50" y="146">04 ŞASİ</text>
        <path class="thin" d="M210 280v12h40"/><text class="callout" x="254" y="296">05 FREN</text>
      </g>
    </svg>`;
  }
  function bindTruck(root) {
    const info = $(".zone-info", root);
    const pick = id => {
      $$(".zone", root).forEach(g => g.classList.toggle("on", g.dataset.zone === id));
      const zz = ZONES[id];
      const n = products.filter(p => zz.cats.includes(p.cat)).length;
      info.innerHTML = `<div><div class="zt">${zz.t}</div><div class="zs">${zz.cats.map(c => catById[c].name).join(" · ")} — ${n} parça</div></div>
        <a class="btn pri sm" href="#/katalog?cat=${zz.cats.join(",")}">Parçaları gör →</a>`;
    };
    $$(".zone", root).forEach(g => {
      g.addEventListener("click", () => pick(g.dataset.zone));
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(g.dataset.zone); } });
      g.addEventListener("mouseenter", () => pick(g.dataset.zone));
    });
    pick("wheels");
  }

  // ---------- Sayfalar ----------
  function pageHome() {
    const best = [0, 20, 5, 12, 2, 29, 37, 9].map(i => products[i]);
    app.innerHTML = `
    <section class="hero"><div class="wrap">
      <div>
        <div class="eyebrow">Tır · Çekici · Dorse parçası</div>
        <h1>Numarayı yaz,<br><em>parçan yola</em><br>çıksın.</h1>
        <p class="lede">OEM numarası, rakip referans kodu, şasi numarası ya da sadece "ön balata". Ne bildiğini yaz; aracına uyup uymadığını, stoğu ve teslim gününü hemen gör.</p>
        <form class="hero-search" id="heroSearch" autocomplete="off">
          <label class="sr" for="hq">Parça ara</label>
          <input id="hq" placeholder="ör. HU 12 140 x  ·  YV2RT40A…" spellcheck="false">
          <button type="submit">Bul</button>
        </form>
        <div class="detect" id="detect" aria-live="polite"></div>
        <div class="try">Dene:
          <button data-try="HU 12 140 x">HU 12 140 x</button>
          <button data-try="YV2RT40A5LB123456">Volvo şasi no</button>
          <button data-try="körük">körük</button>
          <button data-try="TK-1006">TK-1006</button>
        </div>
      </div>
      <div class="truckmap" id="truckmap">
        <div class="cap"><span>Parça haritası</span><span>Bir bölgeye dokun</span></div>
        ${truckSvg()}
        <div class="zone-info panel"></div>
      </div>
    </div></section>

    <div class="proof-band"><div class="wrap proof">
      <div><b>${brands.length} marka</b><span>${categories.length} sistem, tek katalog</span></div>
      <div><b>16:00</b><span>'ya kadar aynı gün kargo</span></div>
      <div><b>24 ay</b><span>garanti (OES ürünlerde)</span></div>
      <div><b>14 gün</b><span>koşulsuz iade</span></div>
      <div><b>2 depo</b><span>İstanbul · Ankara</span></div>
    </div></div>

    <section class="sec"><div class="wrap">
      <div class="sec-hd"><div><div class="eyebrow">Marka</div><h2>Tırına göre alışveriş</h2></div><span class="mono" style="font-size:12px;color:var(--ink-3)">Yetkili bayi değiliz · uyumlu parça satarız</span></div>
      <div class="brands">${brands.map(b => `<a href="#/katalog?brand=${b.id}">${esc(b.name.replace(" Trucks", ""))}<small>${products.filter(p => p.fits.includes(b.id)).length} parça</small></a>`).join("")}</div>
    </div></section>

    <section class="sec" style="padding-top:0"><div class="wrap">
      <div class="sec-hd"><div><div class="eyebrow">Sistem</div><h2>Kategoriler</h2></div><a class="link" href="#/katalog">Tüm parçalar →</a></div>
      <div class="catgrid">${categories.map((c, i) => `<a class="cat" href="#/katalog?cat=${c.id}">
        <span class="num">${String(i + 1).padStart(2, "0")}</span><span class="cnt">${countIn(c.id)}</span>
        ${icon(c.id)}
        <div><div class="nm">${c.name}</div><div class="sub">${c.subs.slice(0, 3).join(", ")}…</div></div></a>`).join("")}</div>
    </div></section>

    <section class="sec" style="padding-top:0"><div class="wrap">
      <div class="panel garage-box" id="garageHome"></div>
    </div></section>

    <section class="sec" style="padding-top:0"><div class="wrap">
      <div class="sec-hd"><div><div class="eyebrow">Bu hafta</div><h2>En çok sipariş edilenler</h2></div><a class="link" href="#/katalog">Hepsini gör →</a></div>
      <div class="grid">${best.map(card).join("")}</div>
    </div></section>

    <section class="sec" style="padding-top:0"><div class="wrap split">
      ${kitBox()}
      <div class="helpbox">
        <div class="eyebrow" style="color:#16181A">Bulamadın mı?</div>
        <h2>Fotoğrafını çek,<br>usta bulsun.</h2>
        <p>Eski parçanın üzerindeki numaranın ya da ruhsattaki şasi numarasının fotoğrafını WhatsApp'tan gönder. Parça uzmanımız mesai saatinde 15 dakika içinde fiyat ve uyumlu kodu yazar.</p>
        <div class="field"><label for="helpVin">Şasi no veya parça açıklaması</label><input id="helpVin" placeholder="ör. 2019 Actros 1845, sol ön far"></div>
        <a class="btn wa" id="helpWa" href="#" target="_blank" rel="noopener">WhatsApp'tan gönder</a>
      </div>
    </div></section>

    <section class="sec" style="padding-top:0"><div class="wrap">${fleetBlock()}</div></section>`;

    bindTruck($("#truckmap"));
    renderGarage($("#garageHome"));
    const hq = $("#hq"), det = $("#detect");
    const upd = () => {
      const k = detectKind(hq.value);
      if (!k) { det.innerHTML = ""; return; }
      if (k.t === "vin") det.innerHTML = k.brand ? `<b>${k.k}</b> → ${brandById[k.brand].name} tanındı. Enter'a bas, uyumlu parçaları ve garaja eklemeyi göster.` : `<b>${k.k}</b> → Üretici kodu tanınmadı. WhatsApp'tan gönder, biz bakalım.`;
      else det.innerHTML = `<b>${k.k}</b> olarak arıyorum · ${search(hq.value).length} sonuç`;
    };
    hq.addEventListener("input", upd);
    $("#heroSearch").addEventListener("submit", e => { e.preventDefault(); goSearch(hq.value); });
    $$("[data-try]").forEach(b => b.addEventListener("click", () => { hq.value = b.dataset.try; upd(); hq.focus(); }));
    const helpWa = $("#helpWa"), helpVin = $("#helpVin");
    const setHelp = () => helpWa.href = waLink(`Merhaba, parça arıyorum: ${helpVin.value || "(fotoğraf ekleyeceğim)"}`);
    helpVin.addEventListener("input", setHelp); setHelp();
  }

  const KIT = ["TK-1021", "TK-1022", "TK-1023", "TK-1006"], KIT_DISC = 0.08;
  function kitBox() {
    const kit = KIT.map(id => byId[id]);
    const sum = kit.reduce((a, p) => a + p.price, 0);
    const kitPrice = sum * (1 - KIT_DISC);
    return `<div class="panel kit">
      <div class="eyebrow">Hazır set · %8 avantaj</div>
      <h2>Periyodik bakım seti</h2>
      <p style="margin:0;color:var(--ink-2)">Her 60–100 bin km'de değişen dört filtre, tek tıkla. Aracına uyanları biz seçiyoruz.</p>
      <ul>${kit.map(p => `<li><span>${esc(p.name)}</span><span>${tl(p.price)}</span></li>`).join("")}</ul>
      <div style="display:flex;justify-content:space-between;align-items:end;gap:10px;flex-wrap:wrap">
        <div class="price"><s>${tl(sum)}</s>${tl(kitPrice)} <small>${vatNote()}</small></div>
        <button class="btn pri" data-kit="${kit.map(p => p.id).join(",")}">Seti sepete ekle</button>
      </div>
    </div>`;
  }

  function fleetBlock() {
    return `<div class="fleet">
      <div class="fl">
        <div class="eyebrow">Filo · Servis · Bayi</div>
        <h2>5 araçtan büyük filolara<br>cari hesap ve net fiyat</h2>
        <ul class="checks">
          <li>Kod listesini yapıştır, tek seferde sipariş ver</li>
          <li>30 / 60 gün vadeli cari hesap, toplu e-Fatura</li>
          <li>Plaka bazında parça geçmişi ve bakım hatırlatma</li>
          <li>Size özel parça uzmanı ve WhatsApp hattı</li>
        </ul>
        <a class="btn dark" href="#/filo">Filo hesabı başvurusu</a>
        <a class="btn" href="#/hizli" style="margin-left:6px">Hızlı sipariş</a>
      </div>
      <div class="fr">
        <div><b>01</b><span>Başvuru formunu doldur (2 dk)</span></div>
        <div><b>02</b><span>Vergi levhanı yükle, 1 iş gününde onay</span></div>
        <div><b>03</b><span>Filo fiyatların hesabında görünür</span></div>
        <div style="border:0"><b>04</b><span>Siparişler cari hesabına yazılır</span></div>
      </div>
    </div>`;
  }

  function renderGarage(box) {
    const brandOpts = brands.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join("");
    const years = Array.from({ length: 20 }, (_, i) => 2026 - i);
    box.innerHTML = `
      <div class="gl">
        <div class="eyebrow" style="color:#85837D">Garajım</div>
        <h2>Tırını kaydet,<br>sadece uyan<br>parçayı gör.</h2>
        <p>Kaydettiğin araç seçiliyken her parçada uyumlu / uyumsuz etiketi görürsün. Bilgiler sadece bu cihazda saklanır.</p>
      </div>
      <div class="gr">
        <div class="trucks" id="truckList">${state.garage.length ? state.garage.map(t => `
          <span class="truck-pill ${t.id === state.active ? "act" : ""}">
            <button data-act="${t.id}" style="width:auto;padding:0 4px;font-weight:600" aria-label="Bu aracı seç">${esc(truckLabel(t))}${t.plate ? ` · <span class="mono">${esc(t.plate)}</span>` : ""}</button>
            <button data-del="${t.id}" aria-label="Aracı sil">✕</button>
          </span>`).join("") : `<span style="color:var(--ink-3);font-size:14px">Henüz araç yok. İlkini ekle:</span>`}</div>
        <form id="garageForm" class="steps">
          <div class="field"><label for="gBrand">1 · Marka</label><select id="gBrand" required><option value="">Seç…</option>${brandOpts}</select></div>
          <div class="field"><label for="gModel">2 · Seri / model</label><select id="gModel" required disabled><option value="">Önce marka</option></select></div>
          <div class="field"><label for="gYear">3 · Model yılı</label><select id="gYear"><option value="">Bilmiyorum</option>${years.map(y => `<option>${y}</option>`).join("")}</select></div>
          <div class="field" style="grid-column:1/-1"><label for="gPlate">Plaka (isteğe bağlı)</label><input id="gPlate" placeholder="34 ABC 123" maxlength="12"></div>
          <div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" type="submit">Garaja ekle</button>${activeTruck() ? `<a class="btn" href="#/katalog?fit=1">Uyumlu parçaları gör</a>` : ""}</div>
        </form>
      </div>`;
    const gb = $("#gBrand", box), gm = $("#gModel", box);
    gb.addEventListener("change", () => {
      const b = brandById[gb.value];
      gm.disabled = !b;
      gm.innerHTML = b ? b.models.map(m => `<option>${esc(m)}</option>`).join("") : `<option value="">Önce marka</option>`;
    });
    $("#garageForm", box).addEventListener("submit", e => {
      e.preventDefault();
      if (!gb.value) return;
      addTruck({ brand: gb.value, model: gm.value, year: $("#gYear", box).value, plate: $("#gPlate", box).value.trim().toUpperCase() });
      renderGarage(box);
    });
    $$("[data-act]", box).forEach(b => b.addEventListener("click", () => { state.active = b.dataset.act; save(); refreshChrome(); renderGarage(box); toast(`<b>${esc(truckLabel(activeTruck()))}</b> seçildi`); }));
    $$("[data-del]", box).forEach(b => b.addEventListener("click", () => {
      state.garage = state.garage.filter(t => t.id !== b.dataset.del);
      if (state.active === b.dataset.del) state.active = state.garage[0]?.id || null;
      save(); refreshChrome(); renderGarage(box);
    }));
  }
  function addTruck(t) {
    t.id = "g" + Date.now().toString(36);
    state.garage.push(t); state.active = t.id; save(); refreshChrome();
    toast(`<b>${esc(truckLabel(t))}</b> garaja eklendi`);
  }

  function pageGarage() {
    app.innerHTML = `<div class="wrap"><div class="crumbs"><a href="#/">Ana sayfa</a>/<span>Garajım</span></div>
      <div class="panel garage-box" id="gbox" style="margin:10px 0 40px"></div></div>`;
    renderGarage($("#gbox"));
  }

  // Katalog: ?cat=a,b&brand=x&q=..&fit=1&maker=..&origin=..&sort=..
  function pageCatalog(params) {
    const cats = (params.get("cat") || "").split(",").filter(Boolean);
    const brand = params.get("brand") || "";
    const q = params.get("q") || "";
    const fitOnly = params.get("fit") === "1";
    const mk = (params.get("maker") || "").split(",").filter(Boolean);
    const org = (params.get("origin") || "").split(",").filter(Boolean);
    const inStock = params.get("stok") === "1";
    const sort = params.get("sort") || "rel";
    const t = activeTruck();
    const kind = q ? detectKind(q) : null;

    let list = q ? search(q, 999) : products.slice();
    const base = list.slice();
    if (cats.length) list = list.filter(p => cats.includes(p.cat));
    if (brand) list = list.filter(p => p.fits.includes(brand));
    if (fitOnly && t) list = list.filter(p => p.fits.includes(t.brand));
    if (mk.length) list = list.filter(p => mk.includes(p.maker));
    if (org.length) list = list.filter(p => org.includes(p.origin));
    if (inStock) list = list.filter(p => p.stock > 5);
    if (sort === "asc") list.sort((a, b) => a.price - b.price);
    if (sort === "desc") list.sort((a, b) => b.price - a.price);
    if (sort === "pop") list.sort((a, b) => b.reviews - a.reviews);

    const link = (patch) => {
      const p = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => (v === "" || v == null) ? p.delete(k) : p.set(k, v));
      return "#/katalog?" + p.toString();
    };
    const toggle = (key, arr, v) => link({ [key]: (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]).join(",") });
    const title = q ? `“${esc(q)}”` : cats.length === 1 ? catById[cats[0]].name : brand ? brandById[brand].name + " parçaları" : cats.length ? cats.map(c => catById[c].name).join(" + ") : "Tüm parçalar";
    const chips = [
      ...cats.map(c => [catById[c].name, toggle("cat", cats, c)]),
      ...(brand ? [[brandById[brand].name, link({ brand: "" })]] : []),
      ...(q ? [["Arama: " + q, link({ q: "" })]] : []),
      ...(fitOnly ? [["Sadece garajımdaki araca uyan", link({ fit: "" })]] : []),
      ...mk.map(m => [m, toggle("maker", mk, m)]),
      ...org.map(o => [o, toggle("origin", org, o)]),
      ...(inStock ? [["Stoku bol", link({ stok: "" })]] : []),
    ];
    const vinNote = kind && kind.t === "vin" ? `<div class="panel" style="padding:14px;margin-bottom:14px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
        <div><b>Şasi no:</b> <span class="mono">${esc(q.toUpperCase())}</span> → ${kind.brand ? `<b>${brandById[kind.brand].name}</b> olarak tanındı. Liste bu markaya uyan parçalarla sınırlandı.` : "üretici tanınmadı."}</div>
        ${kind.brand ? `<button class="btn pri sm" id="vinAdd">Garaja ekle</button>` : `<a class="btn wa sm" href="${waLink("Şasi no: " + q)}" target="_blank" rel="noopener">WhatsApp'tan sor</a>`}
      </div>` : "";

    app.innerHTML = `<div class="wrap">
      <div class="crumbs"><a href="#/">Ana sayfa</a>/<a href="#/katalog">Katalog</a>${cats.length === 1 ? `/<span>${catById[cats[0]].name}</span>` : ""}</div>
      <div class="sec-hd" style="margin:8px 0 18px"><h2 style="margin:0">${title}</h2>
        ${t ? `<a class="chip-btn" href="${link({ fit: fitOnly ? "" : "1" })}"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:${fitOnly ? "var(--ok)" : "var(--ink-3)"}"></span>${fitOnly ? "Uyanlar gösteriliyor" : "Sadece " + esc(truckLabel(t)) + " uyanlar"}</a>` : `<a class="chip-btn" href="#/garaj">+ Garajına tır ekle, uyumu gör</a>`}
      </div>
      ${vinNote}
      <div class="catalog">
        <aside class="facets" id="facets" aria-label="Filtreler">
          <div style="display:flex;justify-content:space-between;align-items:center" class="filter-toggle"><h3>Filtreler</h3><button class="icon-btn" id="closeFacets" aria-label="Filtreleri kapat">✕</button></div>
          <div class="panel facet"><h4>Kategori</h4>${categories.map(c => `<label><input type="checkbox" data-href="${toggle("cat", cats, c.id)}" ${cats.includes(c.id) ? "checked" : ""}>${c.name}<span>${base.filter(p => p.cat === c.id).length}</span></label>`).join("")}</div>
          <div class="panel facet"><h4>Uyumlu marka</h4>${brands.map(b => `<label><input type="radio" name="br" data-href="${link({ brand: brand === b.id ? "" : b.id })}" ${brand === b.id ? "checked" : ""}>${esc(b.name)}<span>${base.filter(p => p.fits.includes(b.id)).length}</span></label>`).join("")}</div>
          <div class="panel facet"><h4>Menşe</h4>${["OES", "Muadil", "Revizyon"].map(o => `<label title="${esc(ORIGIN_HELP[o])}"><input type="checkbox" data-href="${toggle("origin", org, o)}" ${org.includes(o) ? "checked" : ""}>${o}<span>${base.filter(p => p.origin === o).length}</span></label>`).join("")}
            <a class="link" style="font-size:12px" href="#/bilgi/mense">Bu etiketler ne demek?</a></div>
          <div class="panel facet"><h4>Üretici</h4>${makers.map(m => `<label><input type="checkbox" data-href="${toggle("maker", mk, m)}" ${mk.includes(m) ? "checked" : ""}>${esc(m)}<span>${base.filter(p => p.maker === m).length}</span></label>`).join("")}</div>
          <div class="panel facet"><h4>Stok</h4><label><input type="checkbox" data-href="${link({ stok: inStock ? "" : "1" })}" ${inStock ? "checked" : ""}>Stoku bol olanlar</label></div>
        </aside>
        <div>
          <div class="toolbar">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <button class="btn sm filter-toggle" id="openFacets">Filtrele${chips.length ? ` (${chips.length})` : ""}</button>
              <span class="mono" style="font-size:13px">${list.length} parça</span>
              <div class="active-filters">${chips.map(([l, h]) => `<button data-href="${h}">${esc(l)} ✕</button>`).join("")}</div>
            </div>
            <label><span class="sr">Sırala</span><select id="sort">
              <option value="rel" ${sort === "rel" ? "selected" : ""}>Önerilen</option>
              <option value="pop" ${sort === "pop" ? "selected" : ""}>En çok satan</option>
              <option value="asc" ${sort === "asc" ? "selected" : ""}>Fiyat: artan</option>
              <option value="desc" ${sort === "desc" ? "selected" : ""}>Fiyat: azalan</option>
            </select></label>
          </div>
          ${list.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">${list.map(card).join("")}</div>` :
            `<div class="panel empty-state"><h3>Eşleşen parça yok</h3><p style="color:var(--ink-2)">Filtreleri azalt ya da parça numarasını WhatsApp'tan gönder; stokta olmayan parçayı da 1–3 günde tedarik ediyoruz.</p>
             <a class="btn wa" target="_blank" rel="noopener" href="${waLink("Parça arıyorum: " + (q || title))}">WhatsApp'tan sor</a></div>`}
        </div>
      </div></div>`;

    $$("[data-href]").forEach(el => el.addEventListener(el.tagName === "INPUT" ? "change" : "click", () => location.hash = el.dataset.href));
    $("#sort").addEventListener("change", e => location.hash = link({ sort: e.target.value === "rel" ? "" : e.target.value }));
    const fc = $("#facets");
    $("#openFacets").addEventListener("click", () => fc.classList.add("open"));
    $("#closeFacets").addEventListener("click", () => fc.classList.remove("open"));
    const va = $("#vinAdd");
    if (va) va.addEventListener("click", () => { addTruck({ brand: kind.brand, model: brandById[kind.brand].models[0], year: "", plate: "", vin: q.toUpperCase() }); route(); });
  }

  function pageProduct(id) {
    const p = byId[id];
    if (!p) return pageNotFound();
    const c = catById[p.cat];
    const f = fitStatus(p);
    const related = products.filter(x => x.id !== p.id && (x.cat === p.cat || x.fits.some(b => p.fits.includes(b)))).slice(0, 4);
    const crossRefs = [
      [p.maker, p.oem],
      ...p.fits.slice(0, 3).map(b => [brandById[b].name + " (OE)", `${brandById[b].name.slice(0, 2).toUpperCase()} ${p.id.slice(3)}-${(p.price % 997).toString().padStart(3, "0")}`]),
      ["TORKA", p.id],
    ];
    app.innerHTML = `<div class="wrap">
      <div class="crumbs"><a href="#/">Ana sayfa</a>/<a href="#/katalog?cat=${c.id}">${c.name}</a>/<span>${esc(p.sub)}</span></div>
      <div class="pdp">
        <div>
          <div class="panel pdp-fig"><span class="dim t">${p.id} · ${esc(p.maker)}</span><span class="dim b">≈ ${p.weight} kg</span>${icon(p.cat, 260)}</div>
        </div>
        <div>
          <div class="codes">${originTag(p)}<span class="tag">${esc(p.maker)}</span><span class="tag">★ ${p.rating} · ${p.reviews} değerlendirme</span></div>
          <h1>${esc(p.name)}</h1>
          <div class="oem" style="font:500 14px var(--f-mono);display:flex;align-items:center;flex-wrap:wrap;gap:6px">OEM ${esc(p.oem)}<button class="copy" data-copy="${esc(p.oem)}">kopyala</button></div>
          <div class="panel buy">
            <div class="fitbar ${f.cls}"><span>${f.txt}</span>${f.cls === "na" ? `<a class="link" href="#/garaj">Tır ekle</a>` : `<a class="link" href="#/garaj">Değiştir</a>`}</div>
            <div class="pricebox">
              <div>${p.old ? `<s class="mono" style="color:var(--ink-3)">${tl(p.old)}</s>` : ""}<div class="price">${tl(p.price)}</div>
                <div class="alt">${vatNote()} · Havale/EFT ile <b>${tl(p.price * (1 - CFG.havale))}</b></div>
                <div class="alt">Peşin fiyatına 3 × ${tl(p.price / 3)}</div></div>
              <div style="text-align:right">${stockHtml(p)}</div>
            </div>
            <div class="buyrow">
              <div class="qty"><button data-q="-1" aria-label="Azalt">−</button><input id="qty" type="number" min="1" max="${p.stock}" value="1" aria-label="Adet"><button data-q="1" aria-label="Arttır">+</button></div>
              <button class="btn pri" id="addMain">Sepete ekle</button>
            </div>
            <div class="ship">
              <div><span class="k">Teslimat</span><span>${p.warehouse} deposundan · tahmini <b>${deliveryDate()}</b></span></div>
              <div><span class="k">Kargo</span><span>${nf.format(CFG.freeShip)} ₺ üzeri ücretsiz${p.weight > 25 ? " · Ağır/hacimli parça: desi farkı sipariş onayında bildirilir" : ""}</span></div>
              <div><span class="k">İade</span><span>14 gün, montaj yapılmamış ve ambalajı açılmamış parçalarda</span></div>
              <div><span class="k">Fatura</span><span>e-Fatura / e-Arşiv · kurumsal faturaya VKN ile</span></div>
            </div>
            <a class="btn wa block" target="_blank" rel="noopener" href="${waLink(`Merhaba, ${p.id} (${p.name}, OEM ${p.oem}) hakkında bilgi almak istiyorum.`)}">Bu parçayı WhatsApp'tan sor</a>
          </div>
        </div>
      </div>
      <div class="tabs" role="tablist">
        <button class="on" data-tab="spec" role="tab">Teknik bilgi</button>
        <button data-tab="xref" role="tab">Çapraz referans</button>
        <button data-tab="fit" role="tab">Uyumlu araçlar</button>
        <button data-tab="faq" role="tab">Montaj notu</button>
      </div>
      <div class="tabpane" id="tabpane"></div>
      <div class="sec-hd"><div><div class="eyebrow">Birlikte bakılanlar</div><h2>Benzer parçalar</h2></div></div>
      <div class="grid" style="margin-bottom:40px">${related.map(card).join("")}</div>
    </div>`;

    const panes = {
      spec: `<table class="spec">
        <tr><th>Parça kodu</th><td class="mono">${p.id}</td></tr>
        <tr><th>Kategori</th><td>${c.name} › ${esc(p.sub)}</td></tr>
        <tr><th>Üretici</th><td>${esc(p.maker)}</td></tr>
        <tr><th>Menşe</th><td>${p.origin} — ${ORIGIN_HELP[p.origin]}</td></tr>
        <tr><th>Öne çıkan</th><td>${esc(p.feat)}</td></tr>
        <tr><th>Ağırlık</th><td class="mono">${p.weight} kg</td></tr>
        <tr><th>Garanti</th><td>${p.origin === "Muadil" ? "12 ay" : "24 ay"}</td></tr></table>`,
      xref: `<p style="color:var(--ink-2);margin-top:0">Eski parçanın üzerindeki numaralardan biri aşağıdakilerle eşleşiyorsa bu parça doğru parçadır. (Demo verisi: numaralar örnektir.)</p>
        <table class="spec">${crossRefs.map(([a, b]) => `<tr><th>${esc(a)}</th><td class="mono">${esc(b)}<button class="copy" data-copy="${esc(b)}">kopyala</button></td></tr>`).join("")}</table>`,
      fit: `<table class="spec"><tr><th>Marka</th><td><b>Seri / model</b></td></tr>${p.fits.map(b => `<tr><th>${esc(brandById[b].name)}</th><td>${brandById[b].models.join(", ")}</td></tr>`).join("")}</table>
        <p style="font-size:13px;color:var(--ink-3)">Emin değil misin? Şasi numaranı WhatsApp'tan gönder, kontrol edelim.</p>`,
      faq: `<div style="max-width:70ch;display:grid;gap:10px;color:var(--ink-2)">
        <p style="margin:0"><b style="color:var(--ink)">Montajı kim yapar?</b> Anlaşmalı servislerimizde montaj randevusu WhatsApp'tan alınabilir. Kendi ustan takıyorsa teknik föyü sipariş ile birlikte gönderiyoruz.</p>
        <p style="margin:0"><b style="color:var(--ink)">Tork değerleri?</b> Üretici föyündeki değerler geçerlidir. ${c.id === "fren" ? "Balata/disk değişiminde aks başına iki taraf birlikte değiştirilmelidir." : ""}</p>
        <p style="margin:0"><b style="color:var(--ink)">Eski parça iadesi?</b> ${p.origin === "Revizyon" ? "Revizyon parçalarda eski parça (göbek) 30 gün içinde iade edilirse depozito iade edilir." : "Gerekmez."}</p></div>`,
    };
    const tp = $("#tabpane");
    const show = k => { tp.innerHTML = panes[k]; $$(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === k)); bindCopy(tp); };
    $$(".tabs button").forEach(b => b.addEventListener("click", () => show(b.dataset.tab)));
    show("spec");
    bindCopy(app);
    const qi = $("#qty");
    $$("[data-q]").forEach(b => b.addEventListener("click", () => { qi.value = Math.max(1, Math.min(p.stock, (+qi.value || 1) + +b.dataset.q)); }));
    $("#addMain").addEventListener("click", () => addToCart(p.id, Math.max(1, +qi.value || 1)));
  }

  function pageQuick() {
    app.innerHTML = `<div class="wrap">
      <div class="crumbs"><a href="#/">Ana sayfa</a>/<span>Hızlı sipariş</span></div>
      <div class="sec-hd"><div><div class="eyebrow">Servis & filo için</div><h2>Kod listesini yapıştır</h2></div></div>
      <div class="split" style="margin-bottom:40px">
        <div class="panel" style="padding:20px;display:grid;gap:12px">
          <div class="field"><label for="ql">Her satıra bir kod ve adet</label>
            <textarea id="ql" spellcheck="false" placeholder="TK-1001 2&#10;HU 12 140 x 4&#10;TB 1374 x 1"></textarea>
            <span class="hint">TORKA kodu, OEM numarası ya da üretici numarası olabilir. Adet yazmazsan 1 sayılır. Excel'den kopyalayabilirsin.</span></div>
          <button class="btn pri" id="qbtn">Kontrol et</button>
        </div>
        <div class="panel" style="padding:20px" id="qres"><p style="color:var(--ink-3);margin:0">Sonuçlar burada görünecek.</p></div>
      </div></div>`;
    $("#qbtn").addEventListener("click", () => {
      const lines = $("#ql").value.split(/\n/).map(s => s.trim()).filter(Boolean);
      const rows = lines.map(l => {
        const m = l.match(/^(.*?)[\s;,\t]+(\d{1,4})$/);
        const code = (m ? m[1] : l).trim(), qty = m ? +m[2] : 1;
        const hit = byId[code.toUpperCase()] || search(code, 1)[0] || null;
        return { code, qty, hit };
      });
      const ok = rows.filter(r => r.hit);
      $("#qres").innerHTML = rows.length ? `<table class="spec">${rows.map(r => `<tr><th class="mono">${esc(r.code)}</th><td>${r.hit ? `✓ ${esc(r.hit.name)} <span class="mono">× ${r.qty}</span><br><small class="mono">${r.hit.id} · ${tl(r.hit.price * r.qty)}</small>` : `<span style="color:var(--warn)">✕ Bulunamadı</span> · <a class="link" target="_blank" rel="noopener" href="${waLink("Bu kodu arıyorum: " + r.code)}">sor</a>`}</td></tr>`).join("")}</table>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;gap:10px;flex-wrap:wrap"><span class="mono">${ok.length}/${rows.length} bulundu</span><button class="btn pri" id="qadd" ${ok.length ? "" : "disabled"}>Bulunanları sepete ekle</button></div>`
        : `<p style="margin:0;color:var(--ink-3)">Önce kod yaz.</p>`;
      const qa = $("#qadd");
      if (qa) qa.addEventListener("click", () => { ok.forEach(r => addToCart(r.hit.id, r.qty, true)); openCart(); });
    });
  }

  function pageFleet() {
    app.innerHTML = `<div class="wrap">
      <div class="crumbs"><a href="#/">Ana sayfa</a>/<span>Filo & servis hesabı</span></div>
      <div style="margin:10px 0 24px">${fleetBlock()}</div>
      <form class="panel" id="fleetForm" style="padding:22px;display:grid;gap:12px;margin-bottom:40px;max-width:760px">
        <h3>Başvuru</h3>
        <div class="row2"><div class="field"><label for="ff1">Firma ünvanı</label><input id="ff1" required></div><div class="field"><label for="ff2">Vergi no (VKN)</label><input id="ff2" inputmode="numeric" pattern="\\d{10}" title="10 haneli vergi numarası" required></div></div>
        <div class="row2"><div class="field"><label for="ff3">Yetkili kişi</label><input id="ff3" required></div><div class="field"><label for="ff4">Telefon</label><input id="ff4" type="tel" required></div></div>
        <div class="row2"><div class="field"><label for="ff5">Araç sayısı</label><select id="ff5"><option>5–20</option><option>21–100</option><option>100+</option><option>Servis / bayi</option></select></div><div class="field"><label for="ff6">Ağırlıklı marka</label><select id="ff6">${brands.map(b => `<option>${esc(b.name)}</option>`).join("")}</select></div></div>
        <button class="btn pri" type="submit">Başvuruyu gönder</button>
        <span class="hint" style="font-size:12px;color:var(--ink-3)">Demo: form bir yere gönderilmez.</span>
      </form></div>`;
    $("#fleetForm").addEventListener("submit", e => { e.preventDefault(); e.target.innerHTML = `<div class="done"><div class="ok">✓</div><h2>Başvurun alındı</h2><p class="lede">1 iş günü içinde parça uzmanımız seni arayacak.</p><a class="btn" href="#/">Ana sayfaya dön</a></div>`; });
  }

  const INFO = {
    kargo: ["Kargo ve teslimat", `Hafta içi ${CFG.cutoffHour}:00, cumartesi ${CFG.satCutoffHour}:00'e kadar verilen ve stokta olan siparişler aynı gün kargoya verilir. ${nf.format(CFG.freeShip)} ₺ üzeri siparişlerde kargo ücretsizdir; altında ${CFG.shipFee} ₺. Tampon, radyatör, DPF gibi hacimli parçalarda desi farkı sipariş onayında bildirilir; kabul etmezsen sipariş ücretsiz iptal edilir.`],
    iade: ["14 gün iade", "Montajı yapılmamış, ambalajı açılmamış parçaları teslimden itibaren 14 gün içinde iade edebilirsin. Elektronik parçalarda (sensör, ECU) ambalaj açıldıysa iade kabul edilmez; bu ürün sayfasında ayrıca belirtilir. Yanlış parça bizim hatamızsa iade kargosu bizden."],
    garanti: ["Garanti", "OES ve revizyon parçalarda 24 ay, muadil parçalarda 12 ay garanti verilir. Garanti, montajın yetkin bir servis tarafından yapıldığının faturayla belgelenmesi koşuluyla geçerlidir."],
    mense: ["Parça menşe etiketleri", "Her ürüne dürüst bir menşe etiketi koyuyoruz. <b>OES</b>: araç üreticisine fabrikada parça veren markanın aynı ürünü (ör. Bosch, Knorr-Bremse, WABCO). <b>Muadil</b>: bağımsız üreticinin, orijinal ölçü ve standartlara uygun ürünü; daha uygun fiyatlıdır. <b>Revizyon</b>: fabrikada sökülüp yenilenmiş, test edilmiş ve garantili parça; çoğunda eski parçayı iade edince depozito geri ödenir. Araç üreticisinin kendi ambalajındaki parçalar ayrıca <b>Orijinal</b> olarak etiketlenir."],
  };
  function pageInfo(k) {
    const i = INFO[k]; if (!i) return pageNotFound();
    app.innerHTML = `<div class="wrap"><div class="crumbs"><a href="#/">Ana sayfa</a>/<span>${i[0]}</span></div>
      <div class="panel" style="padding:26px;max-width:760px;margin:10px 0 40px"><h2 style="margin-bottom:14px">${i[0]}</h2><p class="lede" style="max-width:none">${i[1]}</p></div></div>`;
  }

  function pageCheckout() {
    const lines = cartLines();
    if (!lines.length) { app.innerHTML = `<div class="wrap"><div class="panel empty-state" style="margin:30px 0"><h3>Sepetin boş</h3><a class="btn pri" href="#/katalog">Parçalara göz at</a></div></div>`; return; }
    app.innerHTML = `<div class="wrap">
      <div class="crumbs"><a href="#/">Ana sayfa</a>/<span>Ödeme</span></div>
      <form class="checkout" id="coForm" novalidate>
        <div>
          <div class="panel co-step"><h3><span class="n">1</span>Fatura</h3>
            <div class="seg" role="group" aria-label="Fatura tipi"><button type="button" class="on" data-inv="b">Bireysel</button><button type="button" data-inv="k">Kurumsal</button></div>
            <div class="row2"><div class="field"><label for="c1">Ad soyad</label><input id="c1" required autocomplete="name"></div><div class="field"><label for="c2">Telefon</label><input id="c2" type="tel" required autocomplete="tel" placeholder="05xx xxx xx xx"></div></div>
            <div class="row2" id="corp" hidden style="margin-top:12px"><div class="field"><label for="c3">Firma ünvanı</label><input id="c3"></div><div class="field"><label for="c4">Vergi dairesi / VKN</label><input id="c4" placeholder="Kadıköy / 1234567890"></div></div>
            <div class="field" style="margin-top:12px"><label for="c5">E-posta (e-Arşiv fatura için)</label><input id="c5" type="email" required autocomplete="email"></div>
          </div>
          <div class="panel co-step"><h3><span class="n">2</span>Teslimat</h3>
            <div class="row2"><div class="field"><label for="c6">İl</label><input id="c6" required></div><div class="field"><label for="c7">İlçe</label><input id="c7" required></div></div>
            <div class="field" style="margin-top:12px"><label for="c8">Adres</label><input id="c8" required autocomplete="street-address" placeholder="Mahalle, sokak, no — sanayi sitesi ise blok/dükkan no"></div>
          </div>
          <div class="panel co-step"><h3><span class="n">3</span>Ödeme</h3>
            <div class="payopt">
              <label><input type="radio" name="pay" value="kart" checked><span><b>Kredi / banka kartı</b><small>3D Secure · peşin fiyatına 3 taksit, 6–9 taksit vade farkıyla</small></span><span class="badge">3 TAKSİT</span></label>
              <label><input type="radio" name="pay" value="havale"><span><b>Havale / EFT</b><small>IBAN sipariş sonrası gösterilir · ödeme gelince kargolanır</small></span><span class="badge">−%3</span></label>
              <label><input type="radio" name="pay" value="cari"><span><b>Cari hesap (filo)</b><small>Sadece onaylı filo/servis hesapları</small></span><span class="badge">VADELİ</span></label>
            </div>
            <label style="display:flex;gap:8px;align-items:flex-start;margin-top:14px;font-size:14px"><input type="checkbox" id="agree" required style="margin-top:4px">Ön bilgilendirme formunu ve mesafeli satış sözleşmesini okudum, onaylıyorum.</label>
          </div>
        </div>
        <aside class="panel summary" id="coSum"></aside>
      </form></div>`;
    const f = $("#coForm");
    $$("[data-inv]").forEach(b => b.addEventListener("click", () => {
      $$("[data-inv]").forEach(x => x.classList.toggle("on", x === b));
      $("#corp").hidden = b.dataset.inv !== "k";
      $("#c3").required = $("#c4").required = b.dataset.inv === "k";
    }));
    const renderSum = () => {
      const pay = f.pay.value, t = totals(pay);
      $("#coSum").innerHTML = `<h3>Sipariş özeti</h3>
        ${lines.map(l => `<div class="sumrow"><span>${l.qty} × ${esc(l.p.name)}</span><span class="mono">${tl(l.p.price * l.qty)}</span></div>`).join("")}
        <div class="ticks" style="margin:6px 0"></div>
        ${t.kit ? `<div class="sumrow" style="color:var(--ok)"><span>Bakım seti indirimi</span><span class="mono">−${tl(t.kit)}</span></div>` : ""}
        <div class="sumrow"><span>Ara toplam</span><span class="mono">${tl(t.sub)}</span></div>
        ${t.disc ? `<div class="sumrow" style="color:var(--ok)"><span>Havale indirimi</span><span class="mono">−${tl(t.disc)}</span></div>` : ""}
        <div class="sumrow"><span>Kargo</span><span class="mono">${t.ship ? tl(t.ship) : "Ücretsiz"}</span></div>
        <div class="sumrow big"><span>Toplam</span><span>${tl(t.total)}</span></div>
        <div class="mono" style="font-size:12px;color:var(--ink-3)">${vatNote()} · Tahmini teslim: ${deliveryDate()}</div>
        <button class="btn pri block" type="submit">Siparişi onayla</button>
        <div style="font-size:12px;color:var(--ink-3)">Demo mağaza: ödeme alınmaz, sipariş oluşturulmaz.</div>`;
    };
    f.addEventListener("change", e => { if (e.target.name === "pay") renderSum(); });
    renderSum();
    f.addEventListener("submit", e => {
      e.preventDefault();
      const bad = $$("input[required]", f).find(i => !i.closest("[hidden]") && !(i.type === "checkbox" ? i.checked : i.value.trim()) || (i.type === "email" && i.value && !i.checkValidity()));
      if (bad) { bad.focus(); bad.style.borderColor = "var(--warn)"; toast("Eksik alanı doldur: <b>" + esc(($(`label[for=${bad.id}]`)?.textContent) || "onay") + "</b>"); return; }
      const pay = f.pay.value;
      const no = "TK" + Date.now().toString().slice(-8);
      const total = totals(pay).total;
      state.cart = {}; save(); refreshChrome();
      app.innerHTML = `<div class="wrap"><div class="done">
        <div class="ok">✓</div><div class="eyebrow">Sipariş no <span class="mono">${no}</span></div>
        <h2>Siparişin alındı</h2>
        <p class="lede">${pay === "havale" ? `Toplam <b>${tl(total)}</b>. Açıklamaya sipariş numaranı yazarak IBAN'a gönder; ödeme gelince kargolanır.` : `Toplam <b>${tl(total)}</b>. Kargo takip numarası SMS ile gelecek. Tahmini teslim: <b>${deliveryDate()}</b>.`}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><a class="btn pri" href="#/">Alışverişe dön</a><a class="btn wa" target="_blank" rel="noopener" href="${waLink("Sipariş " + no + " hakkında")}">WhatsApp destek</a></div>
        <p style="font-size:12px;color:var(--ink-3)">Demo: gerçek ödeme alınmadı.</p></div></div>`;
      scrollTo(0, 0);
    });
  }

  function pageNotFound() {
    app.innerHTML = `<div class="wrap"><div class="panel empty-state" style="margin:30px 0"><h2>Sayfa bulunamadı</h2><p><a class="btn pri" href="#/">Ana sayfa</a></p></div></div>`;
  }

  // ---------- Sepet ----------
  function cartLines() { return Object.entries(state.cart).filter(([id]) => byId[id]).map(([id, qty]) => ({ p: byId[id], qty })); }
  function totals(pay) {
    const gross = cartLines().reduce((a, l) => a + l.p.price * l.qty, 0);
    // Bakım seti: setin tüm parçaları sepetteyse, tam set sayısı kadar %8 indirim
    const sets = Math.min(...KIT.map(id => state.cart[id] || 0));
    const kit = sets > 0 ? sets * KIT.reduce((a, id) => a + byId[id].price, 0) * KIT_DISC : 0;
    const sub = gross - kit;
    const disc = pay === "havale" ? sub * CFG.havale : 0;
    const ship = sub >= CFG.freeShip || sub === 0 ? 0 : CFG.shipFee;
    return { gross, kit, sub, disc, ship, total: sub - disc + ship };
  }
  function addToCart(id, n = 1, quiet) {
    const p = byId[id]; if (!p) return;
    const cur = state.cart[id] || 0;
    state.cart[id] = Math.min(p.stock, cur + n);
    save(); refreshChrome(); renderCart();
    if (!quiet) toast(`<b>${esc(p.name)}</b> sepete eklendi <button class="link" style="color:var(--hi)" id="tOpen">Sepeti aç</button>`, () => { const b = $("#tOpen"); if (b) b.onclick = openCart; });
    if (cur + n > p.stock) toast(`Stokta ${p.stock} adet var, sepete ${p.stock} eklendi`);
  }
  function renderCart() {
    const lines = cartLines(), t = totals();
    $("#cartBody").innerHTML = lines.length ? lines.map(l => `
      <div class="line">
        <a class="thumb" href="#/urun/${l.p.id}">${icon(l.p.cat)}</a>
        <div><div class="nm">${esc(l.p.name)}</div><div class="sm">${l.p.id} · ${esc(l.p.maker)}</div>
          <div class="qty"><button data-dec="${l.p.id}" aria-label="Azalt">−</button><input value="${l.qty}" readonly aria-label="Adet"><button data-inc="${l.p.id}" aria-label="Arttır">+</button></div></div>
        <div style="text-align:right"><div class="mono" style="font-weight:700">${tl(l.p.price * l.qty)}</div><button class="link" style="font-size:12px" data-rm="${l.p.id}">Kaldır</button></div>
      </div>`).join("") : `<div class="empty-state"><p style="color:var(--ink-2)">Sepetin boş.</p><a class="btn pri" href="#/katalog">Parçalara göz at</a></div>`;
    const left = CFG.freeShip - t.sub;
    $("#cartFoot").innerHTML = lines.length ? `
      <div class="freeship">${left > 0 ? `Ücretsiz kargoya <b>${nf.format(state.vatIncl ? left : left / (1 + CFG.vat))} ₺</b> kaldı` : `<b>Kargo ücretsiz</b> ✓`}<div class="bar"><i style="width:${Math.min(100, t.sub / CFG.freeShip * 100)}%"></i></div></div>
      ${t.kit ? `<div class="sumrow" style="color:var(--ok)"><span>Bakım seti indirimi</span><span class="mono">−${tl(t.kit)}</span></div>` : ""}
      <div class="sumrow"><span>Ara toplam</span><span class="mono">${tl(t.sub)}</span></div>
      <div class="sumrow"><span>Kargo</span><span class="mono">${t.ship ? tl(t.ship) : "Ücretsiz"}</span></div>
      <div class="sumrow big"><span>Toplam</span><span>${tl(t.total)}</span></div>
      <div class="mono" style="font-size:12px;color:var(--ink-3)">${vatNote()} · Havale/EFT ile ${tl(t.sub * (1 - CFG.havale) + t.ship)}</div>
      <a class="btn pri block" href="#/odeme" id="toCheckout">Ödemeye geç</a>
      <a class="btn wa block" target="_blank" rel="noopener" href="${waLink("Sipariş vermek istiyorum:\n" + lines.map(l => `${l.qty} × ${l.p.id} ${l.p.name}`).join("\n"))}">WhatsApp ile sipariş ver</a>` : "";
    $$("[data-inc]").forEach(b => b.onclick = () => addToCart(b.dataset.inc, 1, true));
    $$("[data-dec]").forEach(b => b.onclick = () => { const id = b.dataset.dec; state.cart[id]--; if (state.cart[id] <= 0) delete state.cart[id]; save(); refreshChrome(); renderCart(); });
    $$("[data-rm]").forEach(b => b.onclick = () => { delete state.cart[b.dataset.rm]; save(); refreshChrome(); renderCart(); });
    const tc = $("#toCheckout"); if (tc) tc.onclick = closeCart;
  }
  function openCart() { renderCart(); $("#drawer").classList.add("open"); $("#drawer").setAttribute("aria-hidden", "false"); $("#scrim").classList.add("open"); $("#closeCart").focus(); }
  function closeCart() { $("#drawer").classList.remove("open"); $("#drawer").setAttribute("aria-hidden", "true"); $("#scrim").classList.remove("open"); }

  // ---------- Ortak parçalar ----------
  function waLink(text) { return `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(text)}`; }
  let toastT;
  function toast(html, after) { const t = $("#toast"); t.innerHTML = html; t.classList.add("show"); after && after(); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200); }
  function bindCopy(root) {
    $$("[data-copy]", root).forEach(b => b.onclick = () => {
      (navigator.clipboard?.writeText(b.dataset.copy) || Promise.reject()).then(() => toast("Kopyalandı: <b>" + esc(b.dataset.copy) + "</b>"), () => toast(esc(b.dataset.copy)));
    });
  }
  function refreshChrome() {
    $("#cartCount").textContent = Object.values(state.cart).reduce((a, b) => a + b, 0);
    const t = activeTruck();
    $("#garageChip").classList.toggle("set", !!t);
    $("#garageLbl").textContent = t ? truckLabel(t) : "Garajım";
    $("#vatBtn").textContent = state.vatIncl ? "KDV DAHİL" : "KDV HARİÇ";
  }
  function goSearch(q) { q = q.trim(); if (!q) return; const k = detectKind(q); if (k.t === "code" && byId[q.toUpperCase()]) location.hash = "#/urun/" + q.toUpperCase(); else location.hash = "#/katalog?q=" + encodeURIComponent(q); }

  // Üst arama + öneriler
  function bindOmni() {
    const f = $("#omni"), q = $("#q"), sg = $("#sugg"), kind = $("#kind");
    let idx = -1;
    const render = () => {
      const k = detectKind(q.value);
      kind.textContent = k ? k.k : "ARA"; kind.classList.toggle("on", !!k);
      if (!q.value.trim()) { sg.hidden = true; return; }
      const res = search(q.value, 6);
      idx = -1;
      sg.innerHTML = res.length ? res.map(p => `<a href="#/urun/${p.id}" role="option"><span>${esc(p.name)}</span><span class="s-oem mono">${p.id} · OEM ${esc(p.oem)}</span><span class="s-price">${tl(p.price)}</span></a>`).join("") + `<a href="#/katalog?q=${encodeURIComponent(q.value)}"><b>Tüm sonuçları gör →</b></a>`
        : `<div class="empty">Eşleşme yok. <a class="link" target="_blank" rel="noopener" href="${waLink("Parça arıyorum: " + q.value)}">WhatsApp'tan sor</a></div>`;
      sg.hidden = false;
    };
    q.addEventListener("input", render);
    q.addEventListener("focus", render);
    q.addEventListener("keydown", e => {
      const items = $$("a", sg);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); idx = (idx + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; items.forEach((a, i) => a.classList.toggle("act", i === idx)); }
      else if (e.key === "Enter" && idx >= 0 && items[idx]) { e.preventDefault(); location.hash = items[idx].getAttribute("href"); sg.hidden = true; q.blur(); }
      else if (e.key === "Escape") sg.hidden = true;
    });
    document.addEventListener("click", e => { if (!f.contains(e.target)) sg.hidden = true; });
    sg.addEventListener("click", () => { sg.hidden = true; });
    f.addEventListener("submit", e => { e.preventDefault(); sg.hidden = true; goSearch(q.value); q.blur(); });
  }

  // ---------- Yönlendirme ----------
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    const [path, qs] = h.split("?");
    const params = new URLSearchParams(qs || "");
    const seg = path.split("/");
    $$("#catNav a").forEach(a => a.classList.toggle("on", seg[0] === "katalog" && params.get("cat") === a.dataset.cat));
    if (!path) pageHome();
    else if (seg[0] === "katalog") pageCatalog(params);
    else if (seg[0] === "urun") pageProduct(seg[1]);
    else if (seg[0] === "garaj") pageGarage();
    else if (seg[0] === "odeme") pageCheckout();
    else if (seg[0] === "hizli") pageQuick();
    else if (seg[0] === "filo") pageFleet();
    else if (seg[0] === "bilgi") pageInfo(seg[1]);
    else pageNotFound();
    const t = seg[0] === "urun" && byId[seg[1]] ? byId[seg[1]].name : seg[0] === "katalog" ? "Katalog" : "";
    document.title = t ? `${t} · TORKA Tır Parça` : "TORKA Tır Parça";
    scrollTo(0, 0);
  }

  // ---------- Başlat ----------
  function applyTheme() { if (state.theme) document.documentElement.dataset.theme = state.theme; else delete document.documentElement.dataset.theme; }
  applyTheme();
  $("#catNav").innerHTML = `<a href="#/katalog" class="hot" data-cat="">Tümü</a>` + categories.map(c => `<a href="#/katalog?cat=${c.id}" data-cat="${c.id}">${c.name}</a>`).join("");
  $("#yr").textContent = new Date().getFullYear();
  $("#fab").href = waLink("Merhaba, parça hakkında bilgi almak istiyorum.");
  $("#cartBtn").addEventListener("click", openCart);
  $("#closeCart").addEventListener("click", closeCart);
  $("#scrim").addEventListener("click", closeCart);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeCart(); });
  $("#themeBtn").addEventListener("click", () => {
    const dark = state.theme ? state.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    state.theme = dark ? "light" : "dark"; store.set("theme", state.theme); applyTheme();
  });
  $("#vatBtn").addEventListener("click", () => { state.vatIncl = !state.vatIncl; save(); refreshChrome(); route(); renderCart(); toast(state.vatIncl ? "Fiyatlar <b>KDV dahil</b>" : "Fiyatlar <b>KDV hariç</b> (+%20)"); });
  // Dinamik içerikteki sepete ekle / set butonları
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-add]"); if (a) { addToCart(a.dataset.add); return; }
    const k = e.target.closest("[data-kit]"); if (k) { k.dataset.kit.split(",").forEach(id => addToCart(id, 1, true)); openCart(); }
  });
  bindOmni();
  refreshChrome();
  tickCutoff(); setInterval(tickCutoff, 1000);
  window.addEventListener("hashchange", route);
  route();
})();
