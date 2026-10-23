// /sitemap.xml — стара адреса карти сайту (Nikola); веде на індекс, що його генерує @astrojs/sitemap
import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ site }) => new Response(
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${new URL(import.meta.env.BASE_URL.replace(/\/?$/, '/') + 'sitemap-0.xml', site).href}</loc></sitemap></sitemapindex>\n`,
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
);
