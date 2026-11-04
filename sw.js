// Service worker de Bohicon Jobs : le site se met toujours à jour en priorité (réseau d'abord),
// et reste consultable avec la dernière version connue si la connexion est coupée.
const CACHE = "bohicon-jobs-v2";
const FICHIERS = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "promo1.jpg", "promo2.jpg", "promo3.jpg"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FICHIERS.map(f => c.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;   // Firebase, polices : pas touchés
  if (req.cache === "no-store" || req.headers.get("range")) return;   // vérifications de mise à jour : jamais mises en cache
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok){ const copie = res.clone(); caches.open(CACHE).then(c => c.put(req, copie)); }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match("index.html") : undefined)))
  );
});
