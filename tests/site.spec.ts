// Критерії 7.1: навігація, перемикання мов, мобільний вигляд, доступність (axe), меню й мови з клавіатури.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TYPICAL = ['/', '/news/', '/personas/', '/entrant/'];
const NAV = ['/news/', '/research/', '/medu-guide/', '/entrant/', '/documents/', '/graduates/', '/personas/', '/stateholders/'];
const both = (p: string) => [p, '/en' + p];
async function firstPost(page: Page, lang = '') {
  await page.goto(lang + '/news/');
  return (await page.locator('.nl-t a').first().getAttribute('href'))!;
}

test.describe('навігація', () => {
  test('кожен пункт головного меню відкриває свою сторінку', async ({ page, isMobile }) => {
    for (const lang of ['', '/en']) {
      for (const p of NAV) {
        await page.goto(lang + '/');
        if (isMobile) { await page.getByRole('button', { name: /Меню|Menu/ }).first().click(); await page.locator(`#menu a[href$="${lang}${p}"]`).click(); }
        else await page.locator(`.nav a[href$="${lang}${p}"]`).click();
        await expect(page).toHaveURL(new RegExp(`${lang}${p}$`));
        await expect(page.locator('h1')).toBeVisible();
        if (!isMobile) await expect(page.locator(`.nav a[href$="${lang}${p}"]`)).toHaveAttribute('aria-current', 'page');
      }
    }
  });
  test('новина відкривається зі списку й має обкладинку або текст', async ({ page }) => {
    const href = await firstPost(page);
    await page.goto(href);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.prose')).not.toBeEmpty();
  });
  test('сторінка 404 існує обома мовами й має гру', async ({ page }) => {
    for (const p of ['/404.html', '/en/404/']) {
      await page.goto(p);
      await expect(page.locator('#runner canvas')).toBeVisible();
    }
  });
});

test.describe('мови', () => {
  for (const p of [...TYPICAL, '/research/']) {
    test(`перемикач мов на ${p} веде на ту саму сторінку іншою мовою`, async ({ page, isMobile }) => {
      await page.goto(p);
      await expect(page.locator('html')).toHaveAttribute('lang', 'uk');
      const open = async () => { if (isMobile) await page.getByRole('button', { name: /Меню|Menu/ }).first().click(); };
      await open();
      await page.locator(isMobile ? '#menu .lang-link' : '.hd .lang-link').click();
      await expect(page).toHaveURL(new RegExp(`/en${p}$`));
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await open();
      await page.locator(isMobile ? '#menu .lang-link' : '.hd .lang-link').click();
      await expect(page).toHaveURL(new RegExp(`${p}$`));
      await expect(page.locator('html')).toHaveAttribute('lang', 'uk');
    });
  }
  test('у кожної новини є переклад', async ({ page }) => {
    await page.goto('/news/');
    const uk = await page.locator('.nl-t a').evaluateAll(as => as.map(a => (a as HTMLAnchorElement).pathname));
    await page.goto('/en/news/');
    const en = await page.locator('.nl-t a').evaluateAll(as => as.map(a => (a as HTMLAnchorElement).pathname.replace(/^\/en/, '')));
    expect(en.sort()).toEqual(uk.sort());
  });
});

test.describe('мобільний вигляд', () => {
  test.use({ viewport: { width: 360, height: 780 } });
  for (const p of TYPICAL.flatMap(both)) {
    test(`без горизонтальної прокрутки на 360 px: ${p}`, async ({ page }) => {
      await page.goto(p);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over).toBeLessThanOrEqual(0);
    });
  }
  test('без горизонтальної прокрутки на 360 px: сторінка новини', async ({ page }) => {
    await page.goto(await firstPost(page));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});

test.describe('клавіатура', () => {
  test('меню відкривається, тримає фокус і закривається Esc', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'меню-кнопка є лише на вузьких екранах');
    await page.goto('/');
    const btn = page.locator('.hd .menu-btn');
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#menu')).toBeVisible();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    for (let i = 0; i < 30; i++) {                // фокус не тікає з відкритого меню
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('#menu'))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('#menu')).toBeHidden();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(btn).toBeFocused();
  });
  test('пункти меню й перемикач мов доступні з клавіатури', async ({ page, isMobile }) => {
    test.skip(isMobile, 'на телефоні — перевірено в тесті меню');
    await page.goto('/');
    const reached = new Set<string>();
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      reached.add(await page.evaluate(() => (document.activeElement as HTMLAnchorElement)?.getAttribute('href') || document.activeElement?.className || ''));
    }
    for (const p of NAV) expect([...reached]).toContain(p);
    expect([...reached]).toContain('/en/');
    await page.locator('.hd .lang-link').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/en\/$/);
  });
});

test.describe('доступність (axe)', () => {
  for (const theme of ['light', 'dark']) {
    for (const p of [...TYPICAL.flatMap(both), 'POST']) {
      test(`${p} · ${theme}: 0 критичних і серйозних порушень`, async ({ page }) => {
        const url = p === 'POST' ? await firstPost(page) : p;
        // контраст міряємо за остаточними кольорами, а не посеред анімації появи (.rv)
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(url + '?theme=' + theme);
        await page.waitForTimeout(300);
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const bad = r.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
        expect(bad.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
      });
    }
  }
});

test.describe('персоналії', () => {
  test('пошук за ім’ям і посада звужують список; «З нами працювали» розгортається', async ({ page }) => {
    await page.goto('/personas/');
    expect(await page.locator('.pl-card').count()).toBeGreaterThanOrEqual(19);
    const rows = page.locator('.pl-list > li:not([hidden])');
    await page.locator('#pf-q').fill('володимирович бойко');
    await expect(rows).toHaveCount(1);
    await expect(page).toHaveURL(/\?q=/);
    await page.locator('#pf-q').fill('');
    await page.locator('.nf__y[data-v="former"]').click();
    await expect(page.locator('details.pl-former')).toHaveAttribute('open', '');
    await expect(page.locator('.pl-group:not([hidden])')).toHaveCount(1);
    await expect(page).toHaveURL(/position=former/);
  });
});

test.describe('новини', () => {
  test('фільтр за роком і темою береться з адреси й скидається', async ({ page }) => {
    await page.goto('/news/?year=2024&topic=awards');
    const shown = page.locator('.nl-list > li:not([hidden])');
    expect(await shown.count()).toBeGreaterThan(0);
    for (const li of await shown.all()) {
      await expect(li).toHaveAttribute('data-year', '2024');
      expect(await li.getAttribute('data-topics')).toContain('awards');
    }
    await expect(page.locator('.nf__t[data-v="awards"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.nf__state [data-nf-reset]').click();
    await expect(page).toHaveURL(/\/news\/$/);
    await expect(shown).toHaveCount(await page.locator('.nl-list > li').count());
  });
});

test.describe('вітрина головної', () => {
  test('шість експонатів; ручний вибір тримається, «АВТО» вмикає автозміну; без помилок', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
    await page.goto('/');
    const sc = page.locator('.showcase');
    await sc.scrollIntoViewIfNeeded();
    const keys = sc.locator('[data-view]'), auto = sc.locator('[data-sc-auto]');
    await expect(keys).toHaveCount(6);
    await expect(auto).toBeHidden();
    for (let i = 0; i < 6; i++) { await keys.nth(i).click(); await expect(keys.nth(i)).toHaveAttribute('aria-pressed', 'true'); await page.waitForTimeout(1200); }
    await expect(auto).toBeVisible();
    await page.waitForTimeout(5500);
    await expect(keys.nth(5)).toHaveAttribute('aria-pressed', 'true');
    await auto.click();
    await expect(auto).toBeHidden();
    await expect(keys.nth(0)).toHaveAttribute('aria-pressed', 'true', { timeout: 7000 });
    expect(errors).toEqual([]);
  });
});
