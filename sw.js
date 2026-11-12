// Service worker de Bohicon Jobs : le site se met toujours à jour en priorité (réseau d'abord),
// et reste consultable avec la dernière version connue si la connexion est coupée.
const CACHE = "bohicon-jobs-v3";
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


// ---------- Notifications push (Firebase Cloud Messaging) ----------
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; }
  catch (err) { d = { notification: { title: "Bohicon Jobs", body: e.data ? e.data.text() : "" } }; }
  const n = d.notification || {};
  const data = d.data || {};
  const titre = n.title || data.title || "Bohicon Jobs";
  const lien = (d.fcmOptions && d.fcmOptions.link) || data.lien || self.registration.scope;
  const options = {
    body: n.body || data.body || "",
    icon: n.icon || "icon-192.png",
    badge: "icon-192.png",
    tag: data.tag || undefined,
    data: { lien }
  };
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(liste => {
      const visible = liste.filter(c => c.visibilityState === "visible");
      if (visible.length){      // le site est ouvert : on affiche le message dans la page
        visible.forEach(c => c.postMessage({ type: "push", payload: { notification: { title: titre, body: options.body }, data: { lien } } }));
        return;
      }
      return self.registration.showNotification(titre, options);
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const lien = (e.notification.data && e.notification.data.lien) || self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(liste => {
      for (const c of liste){
        if (c.url.startsWith(self.registration.scope) && "focus" in c){
          if ("navigate" in c) c.navigate(lien);
          return c.focus();
        }
      }
      return self.clients.openWindow(lien);
    })
  );
});
