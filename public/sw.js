// Online-only service worker.
// This PWA is intentionally NOT offline-capable: every request goes to the
// network and nothing is cached. The SW exists so the app is installable and
// passes PWA install criteria, while always serving fresh, live data.

self.addEventListener("install", () => {
  // Activate immediately without waiting for old SWs.
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  // Remove any caches a previous version might have created, then take control.
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  // Network-only: never serve from cache. If offline, the request simply fails.
  event.respondWith(fetch(event.request))
})
