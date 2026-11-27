// Wåle Arcade – lagrer portalen på telefonen så den virker uten nett.
// Bytt tallet under når du vil tvinge fram en ny versjon.
const VERSJON = "wale-arcade-v2";
const FILER = ["./", "./index.html", "./manifest.json", "./ikon-192.png", "./ikon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSJON).then(c => c.addAll(FILER)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(navn => Promise.all(navn.filter(n => n !== VERSJON).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Selve siden: prøv nett først (så du får nye oppdateringer), ellers lagret versjon
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(svar => { const kopi = svar.clone(); caches.open(VERSJON).then(c => c.put("./index.html", kopi)); return svar; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Ikoner, skrift og annet: bruk lagret versjon med en gang, og oppdater i bakgrunnen
  const lagres = url.origin === location.origin ||
                 url.hostname.endsWith("vercel.app") ||
                 url.hostname.includes("fonts.g");
  if (!lagres) return;

  e.respondWith(
    caches.open(VERSJON).then(async c => {
      const lagret = await c.match(req);
      const hent = fetch(req).then(svar => {
        if (svar && (svar.ok || svar.type === "opaque")) c.put(req, svar.clone());
        return svar;
      }).catch(() => lagret || Response.error());
      return lagret || hent;
    })
  );
});
