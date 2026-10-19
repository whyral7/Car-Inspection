// Minimal service worker: makes the app installable on Android.
// No caching yet; offline support and photo-upload retry come in later phases.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Pass-through: let the browser handle every request normally.
});
