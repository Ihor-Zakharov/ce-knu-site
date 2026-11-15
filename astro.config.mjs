// Конфігурація збирання. Адресу й базовий шлях задають змінні середовища,
// тож один і той самий код збирається і для ce.knu.ua, і для перегляду на GitHub Pages.
//   SITE_URL  — повна адреса сайту (типово https://ce.knu.ua)
//   BASE_PATH — підкаталог, якщо сайт лежить не в корені (типово /)
// (ASTRO_SITE / ASTRO_BASE — те саме; так їх передає Dockerfile)
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import rehypeSite from './src/lib/rehype-site.mjs';
import { EN_SLUG, toEn, fromEn } from './src/lib/routes.mjs';

const site = process.env.SITE_URL || process.env.ASTRO_SITE || 'https://ce.knu.ua';
const base = process.env.BASE_PATH || process.env.ASTRO_BASE || '/';

// карта сайту: без сторінки «без зв'язку» (лише для service worker) і без перенаправлень зі старих англійських адрес
const root = new URL(base.replace(/\/?$/, '/'), site);
const SKIP = new RegExp(`^/(?:offline|en/offline|en/(?:${Object.keys(EN_SLUG).join('|')}))/`);
const pathOf = u => '/' + decodeURI(new URL(u).pathname).slice(root.pathname.length);
// пара мов для hreflang: англійські розділи мають власні назви (/entrant/ ↔ /en/admission/), тож пару будуємо за таблицею
function hreflang(item) {
  const p = pathOf(item.url), en = /^\/en(\/|$)/.test(p);
  const canon = en ? fromEn(p.replace(/^\/en(\/|$)/, '/')) : p;
  if (!item.links?.length && !Object.hasOwn(EN_SLUG, canon.split('/')[1])) return item;   // немає пари іншою мовою
  const abs = path => new URL(encodeURI(path.slice(1)), root).href;
  return { ...item, links: [{ url: abs(canon), lang: 'uk-UA' }, { url: abs('/en' + toEn(canon)), lang: 'en-US' }] };
}

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  i18n: {
    locales: ['uk', 'en'],
    defaultLocale: 'uk',
    routing: { prefixDefaultLocale: false },
  },
  markdown: {
    processor: unified({ rehypePlugins: [[rehypeSite, { base }]] }),
  },
  image: { responsiveStyles: false },
  integrations: [
    sitemap({ i18n: { defaultLocale: 'uk', locales: { uk: 'uk-UA', en: 'en-US' } }, filter: page => !SKIP.test(pathOf(page)), serialize: hreflang }),
  ],
  devToolbar: { enabled: false },
});
