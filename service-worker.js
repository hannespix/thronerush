// THRONERUSH Service Worker – Offline-Cache
const CACHE = 'thronerush-v372';
const ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './css/style.css',
  './js/game.js',
  './js/pwa.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;
  // Code/Shell (HTML/JS/CSS/Manifest, Navigationen) → NETWORK-FIRST: immer die frische Version,
  // Cache nur als Offline-Fallback. Verhindert, dass altes JS dauerhaft hängenbleibt.
  const isShell = sameOrigin && (
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    /\.(?:js|css|html|webmanifest)$/.test(url.pathname)
  );
  if (isShell) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }
  // Übrige Assets (Icons/Bilder/Fonts) → Cache-first, Netz als Fallback
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      if (res.ok && sameOrigin) caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
