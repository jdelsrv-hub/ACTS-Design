// Bump CACHE on every release so phones drop the old files.
const CACHE = 'predict-v1';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/backup.js', 'js/memory.js', 'js/mixer.js', 'js/settings.js', 'js/speech.js',
  'js/spelling.js', 'js/storage.js', 'js/text.js', 'js/wordlist.js', 'js/vendor/double-metaphone.js',
  'data/words.txt',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));

self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== 'GET' || !(url.origin === location.origin || FONT_HOSTS.includes(url.hostname))) return;
  e.respondWith(caches.match(request, { ignoreSearch: url.origin === location.origin }).then(hit => hit || fetch(request).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(request, copy)); }
    return res;
  })));
});
