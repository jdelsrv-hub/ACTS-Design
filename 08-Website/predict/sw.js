// Bump CACHE on every release so phones drop the old files.
const CACHE = 'predict-v5';
// No 'index.html': the host redirects it to './', and a redirect can't be cached for a page load.
const SHELL = [
  './', 'styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/backup.js', 'js/memory.js', 'js/mixer.js', 'js/pager.js', 'js/panels.js', 'js/settings.js', 'js/speech.js',
  'js/spelling.js', 'js/storage.js', 'js/text.js', 'js/wordlist.js', 'js/vendor/double-metaphone.js',
  'data/words.txt',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// cache: 'reload' skips the browser's HTTP cache, so a new release never precaches old files.
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())));

// The font is cached only when first used, not in SHELL, so it moves to the new cache, or an offline open would lose it.
self.addEventListener('activate', e => e.waitUntil((async () => {
  const keep = await caches.open(CACHE);
  for (const key of await caches.keys()) {
    if (key === CACHE) continue;
    // A failed copy (quota on opaque responses, a missing match) must never stop the old caches going or clients.claim().
    try {
      const old = await caches.open(key);
      for (const request of await old.keys()) {
        if (FONT_HOSTS.includes(new URL(request.url).hostname)) await keep.put(request, await old.match(request)).catch(() => {});
      }
    } catch {}
    await caches.delete(key);
  }
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);
  const font = FONT_HOSTS.includes(url.hostname);
  if (request.method !== 'GET' || !(url.origin === location.origin || font)) return;
  e.respondWith(caches.match(request, { ignoreSearch: url.origin === location.origin }).then(hit => hit || fetch(request).then(res => {
    // An opaque response could be an error page we can't see, so only the fonts are trusted that way.
    if (res.ok || (font && res.type === 'opaque')) {
      const copy = res.clone();
      e.waitUntil(caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {}));
    }
    return res;
  })));
});
