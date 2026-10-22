import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// GitHub Pages serves the site from /<repo>/; Docker and the department server use /.
const base = process.env.ASTRO_BASE ?? '/';
const site = process.env.ASTRO_SITE ?? 'https://ce.knu.ua';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  compressHTML: true,
  build: { format: 'directory' },
  i18n: {
    locales: ['uk', 'en'],
    defaultLocale: 'uk',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [react()],
  vite: {
    server: {
      // Docker Desktop on Windows and macOS does not pass file events from bind mounts.
      watch: process.env.ASTRO_DEV_POLLING ? { usePolling: true, interval: 300 } : null,
    },
  },
});
