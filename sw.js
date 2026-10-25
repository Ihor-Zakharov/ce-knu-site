const V = 'mvnpgv2g', BASE = '/ce-knu-site/', OFFLINE = BASE + 'offline/';
const SHELL = 'ki-shell-' + V, PAGES = 'ki-pages-' + V, ASSETS = 'ki-assets-' + V;
self.addEventListener('install', e => e.waitUntil((async () => {
  try {
    const c = await caches.open(SHELL), res = await fetch(OFFLINE, { cache: 'reload' });
    if (res.ok) {
      const html = await res.clone().text();
      await c.put(OFFLINE, res);
      const files = [...new Set([...html.matchAll(/(?:href|src)="([^"]*\/_astro\/[^"]+)"/g)].map(m => m[1]))];
      await Promise.all(files.map(f => c.add(f).catch(() => {})));
    }
  } catch (err) { /* без мережі під час встановлення — спробуємо наступного разу */ }
  await self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('ki-') && !k.endsWith('-' + V)) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin || !u.pathname.startsWith(BASE)) return;
  if (u.pathname.startsWith(BASE + 'pr-preview/')) return;          // перегляди PR мають власний service worker
  if (/\.pdf$/i.test(u.pathname) || u.pathname.startsWith(BASE + 'files/')) return;
  if (r.mode === 'navigate') e.respondWith(page(r));
  else if (u.pathname.startsWith(BASE + '_astro/')) e.respondWith(asset(r));
});
async function page(r) {
  try {
    const res = await fetch(r);
    if (res.ok && res.type === 'basic') { const c = await caches.open(PAGES); await c.put(r, res.clone()); trim(PAGES, 40); }
    return res;
  } catch (err) {
    return (await caches.match(r, { ignoreSearch: true })) || (await caches.match(OFFLINE)) || Response.error();
  }
}
async function asset(r) {
  const hit = await caches.match(r);
  if (hit) return hit;
  const res = await fetch(r);
  if (res.ok) { const c = await caches.open(ASSETS); await c.put(r, res.clone()); trim(ASSETS, 160); }
  return res;
}
async function trim(name, max) {
  const c = await caches.open(name), keys = await c.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await c.delete(k);
}
