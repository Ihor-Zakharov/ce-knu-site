// Service worker сайту: офлайн-режим. Сторінки — спершу з мережі (відвідані зберігаються для перегляду без зв'язку,
// без мережі й без копії — сторінка «Немає зв'язку» з грою КІ-Рекса); файли з хешем у назві (/_astro/) — з кешу.
// Версія = момент збирання: новий деплой ставить новий кеш і прибирає старий. PDF і документи не кешуються.
import type { APIRoute } from 'astro';
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');
const VERSION = Date.now().toString(36);
const code = `
const V = '${VERSION}', BASE = '${BASE}', OFFLINE = BASE + 'offline/';
const SHELL = 'ki-shell-' + V, PAGES = 'ki-pages-' + V, ASSETS = 'ki-assets-' + V;
self.addEventListener('install', e => e.waitUntil((async () => {
  try {
    const c = await caches.open(SHELL), res = await fetch(OFFLINE, { cache: 'reload' });
    if (res.ok) {
      const html = await res.clone().text();
      await c.put(OFFLINE, res);
      const files = [...new Set([...html.matchAll(/(?:href|src)="([^"]*\\/_astro\\/[^"]+)"/g)].map(m => m[1]))];
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
  if (/\\.pdf$/i.test(u.pathname) || u.pathname.startsWith(BASE + 'files/')) return;
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
`;
export const GET: APIRoute = () => new Response(code.trimStart(), { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
