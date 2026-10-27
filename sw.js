// Service Worker: cache-first dos arquivos do próprio app (funcionamento offline após o primeiro carregamento).
const CACHE = "simulados-v1";
const FILES = [
  "./", "./index.html", "./styles.css", "./app.js", "./icon.svg", "./manifest.webmanifest",
  "./modules/csv-parser.js", "./modules/exam-validator.js", "./modules/exam-engine.js",
  "./modules/grading.js", "./modules/storage.js", "./modules/results.js",
  "./examples/simulado-exemplo.csv", "./examples/gabarito-exemplo.json",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
