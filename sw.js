// Keeps CuboFácil working without internet once it has been opened.
const CACHE = "cubofacil-v2";
const FILES = ["./", "index.html", "styles.css", "icon.svg", "manifest.webmanifest", "js/app.js", "js/cube.js", "js/guided.js", "js/draw.js", "js/photo.js", "js/validate.js", "js/words.js", "js/view.js", "guia/CuboFacil-guia.pdf"];

self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
// Network first (so updates arrive at once); the saved copy only when there is no connection.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone();
    if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html"))));
});
