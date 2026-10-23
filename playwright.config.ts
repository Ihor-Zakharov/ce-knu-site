// Автотести на зібраному сайті (dist/). Перед запуском: npm run build
import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
export default defineConfig({
  testDir: 'tests',
  timeout: 45_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: `npx astro preview --host 127.0.0.1 --port ${PORT}`, port: PORT, reuseExistingServer: !process.env.CI },
});
