// Гра з КІ-Рексом на сторінці 404: правила й карта (без браузера), клавіші, контрольна точка, гра дотиком.
// У зібраному сайті немає жодних «тестових дверцят»: за грою стежимо лише через сторінку (клас is-on, оголошення
// для екранного читача, пікселі полотна), а час у грі ведемо самі — підставним годинником Playwright, кадр за кадром.
// Усе, що потребує зазирнути всередину світу (карта, фініш, стеля), перевіряємо на самому модулі правил world.js.
import { test, expect, type Page } from '@playwright/test';
// @ts-ignore — модуль гри написано на JS, типів у нього немає
import { createWorld, step, place, takeoff, startSpeed, SEGMENTS, PER_YEAR, TOP, BUG, EV, INTRO, TOUCH_INTRO } from '../src/scripts/runner/world.js';
// @ts-ignore
import { quickCheck, layout, NEED, VIEW } from './runner-solver.mjs';

const STEP = 1 / 120, FRAME = 16;                       // крок фізики гри, с; один кадр підставного годинника, мс
const NOW = new Date('2026-11-15T10:00:00');            // листопад: гра починається з осені (4), далі зима (0)
const AUTUMN = 4, IDLE = { press: false, hold: false, down: false };
const live = (page: Page) => page.locator('[data-runner-live]');
const running = (page: Page) => page.locator('#runner.is-on');
const text = async (page: Page) => (await live(page).textContent()) || '';

/* сторінка з підставним годинником: гра стоїть, доки тест сам не прокрутить кадри */
async function frozen(page: Page) {
  await page.clock.install({ time: NOW });
  await page.goto('/404.html');
  await expect(page.locator('#runner canvas')).toBeVisible();
  await page.waitForFunction(() => (document.querySelector('#runner canvas') as HTMLCanvasElement).width > 300);
  await page.clock.pauseAt(new Date(NOW.getTime() + 10_000));
}
const frames = async (page: Page, n: number) => { for (let i = 0; i < n; i++) await page.clock.runFor(FRAME); };
const until = async (page: Page, re: RegExp, max = 700) => { for (let i = 0; i < max && !re.test(await text(page)); i++) await page.clock.runFor(FRAME); };

/* Проходження першого відрізка карти «за правилом», пораховане на тому самому world.js, що й гра:
   стрибок — у найкращій точці перед шипом чи блоком, «униз» — під навісною, на пружині — нічого, біля біта — ще один стрибок.
   Повертає клавіші з номером кроку, на якому їх натиснути, контрольну точку наступного відрізка й крок, коли пружина вже позаду */
function firstSegment(season: number) {
  const w = createWorld(season), inp = { press: false, hold: false, down: false }, keys: [number, string][] = [];
  let i = 0, done = -1, padDone = 0;
  for (; w.marks[w.mi].n === 0 && !w.dead && i < 120 * 40; i++) {
    let down = false;
    for (let k = 0; k < w.obs.length; k++) {
      const o = w.obs[k];
      if (o.kind === 'gate' && w.dist > o.x - 22 && w.dist < o.x + o.w + 5) down = true;
      if (o.kind === 'orb' && !o.used && !w.pl.ground && w.pl.buffer <= 0 && w.dist + 10 > o.x + 5 && w.dist < o.x + 3) { keys.push([i, 'jump']); inp.press = true; }
      if ((o.kind === 'spike' || o.kind === 'block') && o.cy === 0 && o.cx > done) {
        const next = w.obs[k + 1], end = next && next.kind === o.kind && next.cy === 0 && next.cx - o.cx === 8 ? next : o;   // пару перестрибуємо як одне ціле
        if (w.dist >= takeoff({ x: o.x, w: end.x + end.w - o.x })) { keys.push([i, 'jump']); inp.press = true; done = end.cx; }
        break;
      }
    }
    if (down !== inp.down) { keys.push([i, down ? 'down' : 'up']); inp.down = down; }
    step(w, inp, STEP);
    if (w.ev & EV.PAD) padDone = i + 150;                    // за 1,25 с після пружини КІ-Рекс уже давно на землі
  }
  return { keys, steps: i, dead: w.dead, check: w.check, padDone };
}
const point = (m: any, touch: boolean, score = 0) => ({ s: m.s, n: m.n, x: m.x, score, speed: startSpeed(m.n, touch), touch });

test.describe('гра: правила і карта', () => {
  test('розв’язувач: на найбільшій швидкості кожного року вікна не коротші за норму цього року; пружини безпечні, жуки поодинці', async ({ isMobile }) => {
    test.skip(isMobile, 'рахунок однаковий в обох проєктах — досить одного');
    test.setTimeout(300_000);
    const r = quickCheck();
    expect(r.problems).toEqual([]);
    expect(NEED.keys.J).toEqual([150, 135, 120, 105]);                           // норми, мс: стрибок із клавіатури, 1–4-й рік
    expect(NEED.keys.D).toEqual([200, 180, 160, 140]);                           // «пригнутися»
    expect(NEED.touch.J).toEqual([160, 150, 135, 120]);                          // стрибок дотиком
    for (const mode of ['keys', 'touch']) {
      expect(r.windows[mode].years.length).toBe(SEGMENTS / PER_YEAR);
      for (const y of r.windows[mode].years) {
        expect(y.minJ, `${mode}, рік ${y.year}: стрибок`).toBeGreaterThanOrEqual(NEED[mode].J[y.year - 1]);
        if (mode === 'keys') expect(y.minD, `рік ${y.year}: пригнутися`).toBeGreaterThanOrEqual(NEED.keys.D[y.year - 1]);
      }
      const sp = r.speed[mode];
      expect(sp.dx).toBeLessThanOrEqual(sp.narrow / 4);                          // за крок фізики — менш як чверть найвужчої зони: нічого не «проскакує»
      expect(sp.dh).toBeLessThan(sp.low);
      expect(sp.pad && sp.orb && sp.gate).toBe(true);                            // пружина, біт і навісна спрацьовують і на найбільшій швидкості
    }
    expect(r.speed.touch.see).toBeGreaterThanOrEqual(VIEW.see);                  // на найвужчому телефоні видно 1,2 с траси попереду
    expect(Math.max(r.windows.keys.apex, r.windows.touch.apex)).toBeLessThanOrEqual(TOP + 1e-6);
  });
  test('швидкість: кожна пора року додає той самий відсоток, на межі пір року стрибка немає; дотиком повільніше', () => {
    for (const touch of [false, true]) {
      const k = startSpeed(1, touch) / startSpeed(0, touch);
      expect(k).toBeGreaterThan(1.015);
      expect(k).toBeLessThan(1.03);                                              // крок малий: 1,5–3 % за пору року
      for (let n = 0; n < SEGMENTS; n++) expect(startSpeed(n + 1, touch) / startSpeed(n, touch)).toBeCloseTo(k, 10);
      // справжній світ: перебігаємо кожну межу відрізків і дивимося, на скільки швидкість змінюється за один крок
      const map = createWorld(AUTUMN, { touch, ahead: 1e7 });
      for (const m of map.marks.slice(0, SEGMENTS - 1)) {
        const w = createWorld(AUTUMN, { from: point(m, touch), ahead: 600 });
        w.dist = w.marks[0].end - 5;                                             // «перемотувач»: за 5 U до межі (там перепочинок, перешкод немає)
        let last = 0, jump = 0, crossed = false;
        for (let i = 0; i < 20 && !w.dead; i++) {
          step(w, { ...IDLE }, STEP);
          if (last) jump = Math.max(jump, Math.abs(w.speed - last));
          last = w.speed;
          if (w.ev & EV.SEASON) crossed = true;
        }
        expect(w.dead).toBe(false);
        expect(crossed, `межа після відрізка ${m.n + 1}`).toBe(true);
        expect(jump).toBeLessThan(.01);                                          // U/с за крок: плавно
        expect(Math.abs(w.speed - startSpeed(m.n + 1, touch))).toBeLessThan(.05);
      }
    }
    expect(startSpeed(0)).toBe(54);                                              // з клавіатури: старт як раніше,
    expect(startSpeed(PER_YEAR)).toBeLessThan(62);                               // перший рік близький до колишнього (було 54–58,75),
    expect(startSpeed(SEGMENTS - PER_YEAR)).toBeGreaterThanOrEqual(78);          // четвертий рік — 78–88,5 U/с
    expect(startSpeed(SEGMENTS)).toBeLessThanOrEqual(88.5);
    expect(startSpeed(0, true)).toBe(48);                                        // дотиком: старт як раніше, найбільша швидкість обмежена
    expect(startSpeed(SEGMENTS, true)).toBeLessThanOrEqual((VIEW.min - VIEW.rexX) / VIEW.see);   // видимістю на найвужчому телефоні (84 U за 1,2 с = 70 U/с)
    expect(startSpeed(SEGMENTS, true)).toBeGreaterThan(68);
  });
  test('карта стала: 20 відрізків, щоразу ті самі; перезапуск із контрольної точки — той самий відрізок із тими самими перешкодами', () => {
    for (const touch of [false, true]) {
      const a = createWorld(AUTUMN, { touch, ahead: 1e7 }), b = createWorld(AUTUMN, { touch, ahead: 1e7 });
      expect(a.marks.length).toBe(SEGMENTS);
      expect(a.marks.map((m: any) => m.s)).toEqual(Array.from({ length: SEGMENTS }, (_, n) => (AUTUMN + n) % PER_YEAR));   // осінь, зима, весна, сакура, літо…
      expect(layout(a)).toBe(layout(b));                                         // «перезавантаження сторінки» — та сама карта
      for (const m of a.marks) {
        const cp = point(m, touch, 100 + m.n);
        const r1 = createWorld(AUTUMN, { from: cp, ahead: 1e7 }), r2 = createWorld(AUTUMN, { from: { ...cp }, ahead: 1e7 });
        expect(layout(r1)).toBe(layout(r2));                                     // два падіння поспіль — та сама розкладка
        expect(r1.marks[0]).toMatchObject({ s: m.s, n: m.n, x: m.x });           // пора року й відрізок не змінилися
        expect(Math.floor(r1.dist / 8) + r1.bonus).toBe(cp.score);               // рахунок — як на контрольній точці
        expect(r1.speed).toBe(startSpeed(m.n, touch));                           // швидкість — стартова для цього відрізка
        expect(r1.touch).toBe(touch);
      }
    }
  });
  test('гра дотиком: на всій карті немає перешкод, під якими треба пригинатися; у грі з клавіатури вони є', () => {
    for (let s = 0; s < PER_YEAR; s++) {
      const t = createWorld(s, { touch: true, ahead: 1e7 }), k = createWorld(s, { ahead: 1e7 });
      expect(t.obs.filter((o: any) => o.kind === 'gate' || (o.kind === 'bug' && o.cy === BUG.high))).toEqual([]);
      expect([...new Set(t.obs.map((o: any) => o.kind))].sort()).toEqual(['block', 'bug', 'orb', 'pad', 'spike']);
      expect(k.obs.some((o: any) => o.kind === 'gate')).toBe(true);
      expect(k.obs.some((o: any) => o.kind === 'bug' && o.cy === BUG.high)).toBe(true);
      for (let n = 0; n <= SEGMENTS; n++) expect(startSpeed(n, true)).toBeLessThan(startSpeed(n, false));   // і вона повільніша
    }
    expect(TOUCH_INTRO.length).toBeLessThanOrEqual(INTRO.length);
  });
  test('пружина сама не вбиває: якщо добігти до будь-якої пружини карти й нічого не натискати, КІ-Рекс приземляється на чисту землю', () => {
    for (const touch of [false, true]) {
      const map = createWorld(AUTUMN, { touch, ahead: 1e7 });
      let pads = 0;
      for (const m of map.marks) {
        const fresh = () => createWorld(AUTUMN, { from: point(m, touch), ahead: 6000 });
        const end = fresh().marks[0].end, here = fresh().obs.filter((o: any) => o.kind === 'pad' && o.cx < end);
        for (const pad of here) {
          const w = fresh(); w.dist = pad.x - 36;                                // тест ставить КІ-Рекса на рівну землю перед пружиною
          let launched = false, landed = false;
          for (let i = 0; i < 400 && !w.dead && !landed; i++) { step(w, { ...IDLE }, STEP); if (w.ev & EV.PAD) launched = true; else if (launched && w.ev & EV.LAND) landed = true; }
          expect(w.dead, `відрізок ${m.n + 1}, пружина на ${pad.cx}`).toBe(false);
          expect(launched && landed).toBe(true);
          const gap = Math.min(...w.obs.filter((o: any) => o.kind !== 'pad' && o.kind !== 'orb').map((o: any) => Math.max(o.x - (w.dist + 10), w.dist - (o.x + o.w))));
          expect(gap).toBeGreaterThanOrEqual(10);                                // до найближчої перешкоди — щонайменше довжина КІ-Рекса
          pads++;
        }
      }
      expect(pads).toBeGreaterThan(10);
    }
    expect(INTRO.filter((p: string[]) => p.join('').includes('j')).map((p: string[]) => p.join(''))).toEqual(['j']);   // перша пружина карти стоїть сама-одна
  });
  test('стеля: ні біт, ні пружина, ні стрибок із блока не піднімають КІ-Рекса вище TOP', () => {
    const empty = () => { const w = createWorld(1); w.obs.length = 0; w.queue = []; w.nextX = 1e12; w.marks[0].end = 1e12; return w; };
    const peak = (w: any, n = 400) => { let top = 0; for (let i = 0; i < n && !w.dead; i++) { step(w, { press: true, hold: true, down: false }, STEP); top = Math.max(top, w.pl.h); } return top; };
    for (const h0 of [1, 8, 15, 20, 24, 26.5]) {                                 // біт на будь-якій висоті, «стрибок» затиснуто
      const w = empty(); place(w, ['o', '.', '.'], w.dist + 2); w.pl.h = h0; w.pl.ground = false; w.pl.vy = .5;
      const top = peak(w, 60);
      expect(w.obs[0].used).toBe(true);
      expect(top).toBeLessThanOrEqual(TOP + 1e-6);
    }
    { const w = empty(); place(w, ['j'], w.dist + 30); expect(peak(w)).toBeLessThanOrEqual(TOP + 1e-6); }                                    // пружина
    { const w = empty(); place(w, ['###'], w.dist + 40); const top = peak(w); expect(top).toBeGreaterThan(20); expect(top).toBeLessThanOrEqual(TOP + 1e-6); }   // стрибки з блока
  });
  test('фініш: за останнім, двадцятим відрізком гра закінчується перемогою', () => {
    for (const touch of [false, true]) {
      const map = createWorld(AUTUMN, { touch, ahead: 1e7 }), last = map.marks[SEGMENTS - 1];
      const w = createWorld(AUTUMN, { from: point(last, touch, 500), ahead: 1e7 });
      expect(w.finish).toBe(w.marks[0].end);
      w.dist = w.finish - 20;                                                    // тестовий «перемотувач»: одразу до кінця відрізка
      let win = false;
      for (let i = 0; i < 120 && !w.dead && !w.won; i++) { step(w, { ...IDLE }, STEP); if (w.ev & EV.WIN) win = true; }
      expect(w.dead).toBe(false);
      expect(w.won && win).toBe(true);
    }
  });
});

test.describe('гра: клавіші', () => {
  test('пробіл запускає гру без жодного клацання й не гортає сторінку; фокуса й рамки гра не має', async ({ page }) => {
    await page.goto('/404.html');
    await expect(page.locator('#runner canvas')).toBeVisible();
    await expect(page.locator('#runner')).not.toHaveAttribute('tabindex', /.*/);
    await page.locator('#runner').scrollIntoViewIfNeeded();
    const y = await page.evaluate(() => scrollY);
    await page.keyboard.press('Space');
    await expect(running(page)).toBeVisible();
    expect(await page.evaluate(() => scrollY)).toBe(y);
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    expect(await page.locator('#runner').evaluate(e => getComputedStyle(e).outlineStyle)).toBe('none');
    await page.keyboard.press('KeyP');
    await expect(running(page)).toHaveCount(0);
    await expect(live(page)).toHaveText('Пауза');
  });
  test('пробіл на посиланні й у відкритому пошуку гру не запускає', async ({ page }) => {
    await page.goto('/404.html');
    await expect(page.locator('#runner canvas')).toBeVisible();
    await page.locator('.nf a.btn').first().focus();
    await page.keyboard.press('Space');
    await expect(running(page)).toHaveCount(0);
    await page.evaluate(() => { (document.activeElement as HTMLElement).blur(); scrollTo(0, 0); });
    await page.keyboard.press('/');
    await expect(page.locator('#search')).toHaveAttribute('open', '');
    await page.keyboard.type('a b');
    await expect(page.locator('#search input')).toHaveValue('a b');
    await expect(running(page)).toHaveCount(0);
  });
});

test.describe('гра: перший відрізок і контрольна точка', () => {
  test('пружина й біт не шкодять і не виносять за екран; після падіння гра продовжується з початку того самого відрізка', async ({ page, isMobile }) => {
    const plan = firstSegment(AUTUMN);                              // осінь: так гра почнеться 15 листопада
    expect(plan.dead).toBe(false);
    await frozen(page);
    await page.locator('#runner').scrollIntoViewIfNeeded();
    // Верхні рядки полотна (смуга рахунку) між значком пори року й рахунком мають лишатися порожніми:
    // якби КІ-Рекс вилітав угору, його пікселі з'явилися б тут
    const clean = () => page.evaluate(() => {
      const cv = document.querySelector('#runner canvas') as HTMLCanvasElement, c = cv.getContext('2d')!, k = cv.width / cv.clientWidth;
      const x0 = Math.round(110 * k), wd = Math.round(cv.width * .5) - x0, d = c.getImageData(x0, 0, wd, Math.round(cv.height * .06)).data;
      for (let i = 4; i < d.length; i += 4) if (Math.abs(d[i] - d[0]) + Math.abs(d[i + 1] - d[1]) + Math.abs(d[i + 2] - d[2]) > 6) return false;
      return true;
    });
    await page.keyboard.press('Space');                             // старт; далі — клавіші за планом, кадр за кадром
    let k = 0, afterPad = '';
    for (let f = 0; f * FRAME / 1000 < plan.steps * STEP + .2; f++) {
      for (const upto = (f + 1) * FRAME / 1000 / STEP; k < plan.keys.length && plan.keys[k][0] < upto; k++) {
        const key = plan.keys[k][1];
        if (key === 'jump') await page.keyboard.press('Space'); else if (key === 'down') await page.keyboard.down('ArrowDown'); else await page.keyboard.up('ArrowDown');
      }
      await page.clock.runFor(FRAME);
      if (!isMobile && f % 4 === 0) expect(await clean(), `кадр ${f}: КІ-Рекс у смузі рахунку`).toBe(true);
      if (!afterPad && f * FRAME / 1000 > plan.padDone * STEP) afterPad = await text(page);
    }
    expect(afterPad).toBe('Гра');                                   // на першу пружину план не натискав нічого — і КІ-Рекс цілий
    await expect(live(page)).toHaveText('Зима');                    // другий відрізок почався — контрольну точку збережено
    const deaths: number[] = [];
    for (let retry = 0; retry < 3; retry++) {
      await until(page, /Кінець/);                                  // далі нічого не натискаємо: перша ж перешкода зими
      deaths.push(+(await text(page)).match(/\d+/)![0]);
      await frames(page, 30);                                       // 0,48 с — «ще раз» уже діє
      await page.keyboard.press('Space');
      await frames(page, 2);
      await expect(live(page)).toHaveText(`Продовження: Зима, рахунок ${plan.check.score}`);   // та сама пора року й рахунок контрольної точки
      await expect(running(page)).toBeVisible();
    }
    expect(deaths[0]).toBeGreaterThan(plan.check.score);
    expect(deaths[1]).toBeLessThan(plan.check.score + 25);          // рахунок ішов далі від контрольної точки, а не з нуля
    expect(deaths[2]).toBe(deaths[1]);                              // після кожного перезапуску — та сама перешкода на тому самому місці
  });
});

test.describe('гра: дотик', () => {
  test.beforeEach(({ isMobile }) => { test.skip(!isMobile, 'лише на дотиковому екрані'); });
  const centre = async (page: Page) => { const b = (await page.locator('#runner').boundingBox())!; return { x: b.x + b.width * .3, y: b.y + b.height * .5 }; };
  // перша перешкода гри дотиком — шип за 96 U від старту; на швидкості 48 U/с стрибати треба приблизно на 1,55 с
  const dead = async (page: Page) => /Кінець/.test(await text(page));

  test('торкання — стрибок: без нього КІ-Рекс розбивається об перший шип, з ним — ні', async ({ page }) => {
    await frozen(page);
    const p = await centre(page);
    await page.touchscreen.tap(p.x, p.y); await frames(page, 2);     // старт (торкаємося лівої частини гри: зон немає)
    await expect(running(page)).toBeVisible();
    await frames(page, 150);                                         // 2,4 с без жодного дотику
    expect(await dead(page)).toBe(true);
    await frames(page, 30);
    await page.touchscreen.tap(p.x, p.y); await frames(page, 96);    // ще раз; через 1,55 с — один дотик
    await page.touchscreen.tap(p.x, p.y); await frames(page, 54);
    expect(await dead(page)).toBe(false);
  });
  test('утримання — стрибки один за одним; сторінка під пальцем не гортається', async ({ page }) => {
    await frozen(page);
    const p = await centre(page), cdp = await page.context().newCDPSession(page);
    const touch = (type: string, y = p.y) => cdp.send('Input.dispatchTouchEvent', { type: type as any, touchPoints: type === 'touchEnd' ? [] : [{ x: p.x, y, id: 1 }] });
    await page.touchscreen.tap(p.x, p.y); await frames(page, 2);
    await expect(running(page)).toBeVisible();
    expect(await page.locator('#runner').evaluate(e => getComputedStyle(e).touchAction)).toBe('none');
    const y0 = await page.evaluate(() => scrollY);
    await frames(page, 45);                                          // 0,72 с: КІ-Рекс пробіг близько 35 U
    await touch('touchStart');                                       // палець тримаємо: стрибок одразу й ще один на приземленні (близько 75 U) — він і переносить через шип
    for (let i = 1; i <= 6; i++) { await touch('touchMove', p.y - i * 25); await frames(page, 4); }   // і ведемо пальцем угору, як для гортання
    await frames(page, 90);                                          // разом 2,5 с: шип (96 U) давно позаду
    expect(await dead(page)).toBe(false);
    expect(await page.evaluate(() => scrollY)).toBe(y0);
    await touch('touchEnd');
  });
});
