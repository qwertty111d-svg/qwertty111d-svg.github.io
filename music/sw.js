// Offline shell for the PWA. Bump VERSION on every release so phones pick up new files.
const VERSION = 'echo-music-web-1794253966';
const FILES = ['./', 'index.html', 'style.css', 'i18n.js', 'config.js', 'lib/match.mjs', 'api.js', 'player.js', 'app.js', 'logo.svg', 'manifest.webmanifest',
  'fonts/unbounded.css', 'fonts/mono-cyr.woff2', 'fonts/mono-lat.woff2', 'fonts/onest-cyr-400.woff2', 'fonts/onest-cyr-500.woff2', 'fonts/onest-cyr-600.woff2', 'fonts/onest-cyr-700.woff2',
  'fonts/onest-lat-400.woff2', 'fonts/onest-lat-500.woff2', 'fonts/onest-lat-600.woff2', 'fonts/onest-lat-700.woff2', 'icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
