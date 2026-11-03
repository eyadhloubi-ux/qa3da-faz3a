// قعدة فزعة — service worker (شبكة أولاً، والكاش احتياط)
const C = 'faz3a-v2';
const CORE = ['/', '/index.html', '/style.css', '/app.js', '/games.js', '/icon.svg', '/manifest.json', '/fonts/changa-arabic-800-normal.woff2', '/fonts/cairo-arabic-800-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/qr') || u.pathname.startsWith('/stats') || u.pathname.startsWith('/admin')) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('/'))));
});
