// Конфігурація збирання. Адресу й базовий шлях задають змінні середовища,
// тож один і той самий код збирається і для ce.knu.ua, і для перегляду на GitHub Pages.
//   SITE_URL  — повна адреса сайту (типово https://ce.knu.ua)
//   BASE_PATH — підкаталог, якщо сайт лежить не в корені (типово /)
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import rehypeSite from './src/lib/rehype-site.mjs';

const site = process.env.SITE_URL || 'https://ce.knu.ua';
const base = process.env.BASE_PATH || '/';

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
    sitemap({ i18n: { defaultLocale: 'uk', locales: { uk: 'uk-UA', en: 'en-US' } } }),
  ],
  devToolbar: { enabled: false },
});
