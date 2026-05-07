const CACHE_NAME = "med-link-v9";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=20260507d",
  "./app.js?v=20260507d",
  "./manifest.webmanifest?v=20260507d",
  "./data/kmuh.json?v=20260507d",
  "./data/source-registry.json?v=20260507d",
  "./data/source-sync-status.json?v=20260507d",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() =>
      caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
    )
  );
});
