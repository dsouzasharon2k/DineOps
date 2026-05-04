/* PlatterOps Service Worker — offline-first shell caching */
const CACHE = 'platterops-v1'
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '')
const withBase = (path) => `${BASE_PATH}/${path}`.replace(/\/{2,}/g, '/')
const OFFLINE_URL = withBase('offline.html')

const PRECACHE_URLS = [
  withBase(''),
  OFFLINE_URL,
  withBase('manifest.json'),
  withBase('favicon.svg'),
]

/* Install: pre-cache the app shell */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  )
})

/* Activate: delete stale caches */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

/* Fetch strategy:
   - API calls  → network-first, fall back to cached response
   - Everything else → cache-first (static shell), fall back to network, then offline page
*/
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin (except our API)
  if (request.method !== 'GET') return

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith(withBase('api/'))) {
    // Network-first for API calls
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Cache-first for the app shell
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((response) => {
            const clone = response.clone()
            caches.open(CACHE).then((c) => c.put(request, clone))
            return response
          })
          .catch(() => caches.match(OFFLINE_URL))
    )
  )
})
