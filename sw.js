// Offline support. Bump VERSION when you publish changes so phones pick up the new files.
const VERSION = "v64";
const CORE = ["./", "index.html", "lang-packs.js", "manifest.webmanifest",
  "img/hero.jpg", "img/p1.jpg", "img/p2.jpg", "img/p3.jpg", "img/p4.jpg", "fonts/fonts.css", "fonts/barlow-condensed-latin-600-normal.woff2", "fonts/barlow-condensed-latin-ext-600-normal.woff2", "fonts/barlow-condensed-latin-700-normal.woff2", "fonts/barlow-condensed-latin-ext-700-normal.woff2", "fonts/barlow-condensed-latin-800-normal.woff2", "fonts/barlow-condensed-latin-ext-800-normal.woff2", "fonts/bricolage-grotesque-latin-wght-normal.woff2", "fonts/bricolage-grotesque-latin-ext-wght-normal.woff2", "fonts/figtree-latin-400-normal.woff2", "fonts/figtree-latin-500-normal.woff2", "fonts/figtree-latin-600-normal.woff2", "fonts/figtree-latin-ext-400-normal.woff2", "fonts/figtree-latin-ext-500-normal.woff2", "fonts/figtree-latin-ext-600-normal.woff2", "fonts/jetbrains-mono-latin-500-normal.woff2", "fonts/jetbrains-mono-latin-700-normal.woff2", "fonts/jetbrains-mono-latin-ext-500-normal.woff2", "fonts/jetbrains-mono-latin-ext-700-normal.woff2",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open("core-" + VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => !k.endsWith(VERSION)).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // Food database searches always go to the network (never cached).
  if (url.hostname.endsWith("openfoodfacts.org")) return;
  // Fonts: serve from cache, refresh in the background.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open("fonts-" + VERSION).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // App pages: try the network first so updates arrive, fall back to the cached copy offline.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => {
      caches.open("core-" + VERSION).then(c => c.put("index.html", r.clone()));
      return r;
    }).catch(() => caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
