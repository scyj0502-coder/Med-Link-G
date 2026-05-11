const CACHE_NAME = "med-link-v20";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=20260511h",
  "./app.js?v=20260511h",
  "./manifest.webmanifest?v=20260511h",
  "./data/okayama.json?v=20260511h",
  "./data/kmuh.json?v=20260511h",
  "./data/source-registry.json?v=20260511h",
  "./data/source-sync-status.json?v=20260511h",
  "./data/validation-baseline.json?v=20260511h",
  "./data/change-report.json?v=20260511h",
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
