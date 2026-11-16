// Treadmark service worker.
// - Pages: always from the network; when that fails (no signal) show /offline.html instead of the
//   browser's error page. Pages are never cached, so nobody sees someone else's data or stale credits.
// - /_next/static (code, styles, fonts), /icons and the logo in /brand/web: cache first. Bump CACHE when
//   an icon or logo file changes; the rest get new URLs whenever their content does.
// Photo and checklist uploads that fail offline are kept in the page's own outbox (IndexedDB) and
// sent when the app is next open and online.
const CACHE = "treadmark-v6";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/brand/web/treadmark-lockup-small-color.svg", "/brand/web/treadmark-lockup-small-reverse.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/brand/web/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
