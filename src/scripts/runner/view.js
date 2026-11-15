// Вигляд гри на 404: усе, що стосується пікселів, — тут і в art.js (спрайти й палітри).
// Правил тут немає (вони у world.js), вводу й ходу гри теж (runner.js). runner.js сам нічого не малює:
// щокадру він передає сюди стан гри f, а події світу — через on().
//
// createView(el) → вигляд:
//   size()        переміряти полотно (змінився розмір або довантажився шрифт)
//   theme()       перечитати кольори теми: один знімок на всі шари, разом із тлом
//   vw, rexX      скільки U світу видно завширшки і де стоїть КІ-Рекс (U від лівого краю) — за ними runner.js будує трасу
//   reset()       почався забіг: прибрати ефекти попереднього
//   on(ev, f)     події світу за крок (прапорці EV із world.js): пил, сальто, розсипання
//   cheer()       рекорд побито
//   update(dt, f) крок анімацій і частинок
//   draw(f)       намалювати кадр
// f — стан гри на цей кадр:
//   mode    'idle' | 'run' | 'paused' | 'over' (КІ-Рекс розсипався) | 'won' (карту пройдено)
//   w       світ із world.js (лише читати): dist, speed, pl, obs, marks, mi, check
//   touch   гра дотиком (лише стрибок)
//   score, best, record   рахунок, рекорд, чи побито рекорд у цьому забігу
//   overT   секунд від падіння чи фінішу; ready — уже можна почати знову;
//   from    з якої пори року почнеться наступний забіг
//   line    рядок керування, який зараз треба показувати ('' — сховати)
//   tip     підказка першої пори року: { kind: 'jump' | 'duck' | 'pad' | 'orb' | null, o: перешкода, label: слово }
import { REDUCED } from '../spring.js';
import { rexFrame, REX_GRID } from '../rex.js';
import { CELL, STAND, EV, BIT, PAD_H, PAD_L, TOP, PER_YEAR, YEARS, takeoff, seasonAt } from './world.js';
import { TOKENS, TREE_ALPHA, SEASONS, SPR, SKIN, DIGIT, HEART, SPARK, bake, bakeGrid } from './art.js';

// U (піксель спрайта): стільки світу видно завширшки щонайменше; смуга під землею
const MIN_W = 96;
const STRIP = 7;
// Висота ігрового поля, від землі до дроту: найвища точка ніг КІ-Рекса (TOP), сам він з аксесуаром на голові (23 U)
// і запас 2 U — тож КІ-Рекс ніколи не вилазить у смугу рахунку. HUD — скільки U над дротом треба під значок і рахунок
const PLAY = TOP + 25;
const HUD = 9;
// с: скільки світиться побитий рекорд
const GOLD = 1.6;
// напис, що злітає над з'їденим бітом
const POP = '+0x' + BIT.toString(16);
// з цілого числа — «випадкове», але завжди те саме: так дерева й трава стоять на місцях без жодних масивів
const hash = n => {
  n = Math.imul(n ^ 0x9E3779B9, 0x85EBCA6B);
  n ^= n >>> 13;
  n = Math.imul(n, 0xC2B2AE35);
  return (n ^ (n >>> 16)) >>> 0;
};
const hx = n => '0x' + n.toString(16).toUpperCase().padStart(4, '0');
const rnd = k => (Math.random() - .5) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const font = px => `500 ${px}px "Signal Mono", ui-monospace, monospace`;

export function createView(el) {
  const cv = el.querySelector('canvas');
  const c = cv.getContext('2d');
  // розміри в пікселях екрана; dp — пікселів на U; gy — земля, wy — дріт
  let W = 0;
  let H = 0;
  let D = 1;
  let dp = 0;
  let hp = 2;
  let VW = 0;
  let gy = 0;
  let wy = 0;
  let px0 = 16;
  let cam = 0;
  // поля; радіус кнопки «ще раз»; шрифт рахунку й ширина його знака
  let edge = 12;
  let R = 30;
  let fontPx = 12;
  let chW = 7;
  // рядок керування: текст, розмір шрифту, ширина
  let line = '';
  let linePx = 12;
  let lineW = 0;
  // годинник анімацій; світ, який зараз малюємо
  let time = 0;
  let w = null;
  // «сік»: стиск-розтяг, сальто, шлейф, струс, кліпання
  let sq = 0;
  let spin = 0;
  let spinV = 0;
  let boost = 0;
  let shake = 0;
  let blink = 0;
  let blinkT = 2;
  // спалах рекорду, спалах рахунку за біт, прозорість рядка керування
  let gold = 0;
  let bump = 0;
  let lineA = 0;
  // «+0x10» над з'їденим бітом
  const pop = { t: 0, x: 0, y: 0 };
  // підказка, яку зараз видно: a — прозорість, at — де відштовхнутися
  const tip = { a: 0, kind: '', cx: 0, cy: 0, x: 0, w: 0, at: 0, label: '' };
  let hudSc = -1;
  let hudBest = -1;
  let hudNow = '';
  let hudHi = '';

  /* ── кольори теми й готові спрайти ──────────────────────────
     Усе, що малює гра, бере кольори з одного знімка теми T (і тло теж), тож шари не можуть розійтися між собою */
  const T = {};
  let dark = false;
  let common = null;
  let skins = [];
  let rexes = [];
  let digits = new Map();
  function theme() {
    const cs = getComputedStyle(el);
    for (const k in TOKENS) T[k] = cs.getPropertyValue(TOKENS[k]).trim();
    dark = document.documentElement.dataset.theme === 'dark';
    // спрайти перемалюються новими кольорами, коли знадобляться
    common = null;
    skins = [];
    rexes = [];
    digits = new Map();
  }
  const colors = si => ({ ...T, a: SEASONS[si].a[+dark], b: SEASONS[si].b[+dark], c: SEASONS[si].c[+dark] });
  function shared() {
    if (!common) {
      const s = n => bake(SPR[n], T, dp);
      common = {
        block: s('block'),
        pad: s('pad'),
        padUp: s('padUp'),
        bit: [s('bit0'), s('bit1')],
        bug: [s('bug'), s('bug2')],
        tipUp: s('up'),
        tipDown: s('down'),
      };
    }
    return common;
  }
  // hill — колір далеких пагорбів цієї пори року (art.js); хмари — свої лише в сакури, інакше колір ліній теми
  function skin(si) {
    if (!skins[si]) {
      const col = colors(si);
      const s = k => bake(SKIN[k][si], col, dp);
      const hill = SEASONS[si].hill ? SEASONS[si].hill[+dark] : T.L;
      const cloud = SEASONS[si].cloud ? SEASONS[si].cloud[+dark] : T.L;
      const one = Math.max(1, Math.round(dp * .6));
      skins[si] = {
        spike: s('spike'),
        hang: s('hang'),
        tree: bake(SKIN.tree[si], col, dp * 2),
        deco: SKIN.deco[si].map(d => bake(d, col, dp)),
        icon: bake(SKIN.icon[si], col, hp),
        badge: bake(SKIN.icon[si], col, hp * 2),
        hill,
        cloud: bake(SPR.cloud, { L: cloud }, dp),
        heart: bake(HEART, { '#': col.c }, one),
        spark: bake(SPARK, { '#': col.b }, one),
      };
    }
    return skins[si];
  }
  // кадри КІ-Рекса для пори року: окремий набір на кожен кадр аксесуара (шарф майорить)
  function rex(si) {
    if (!rexes[si]) {
      rexes[si] = SEASONS[si].wear.map(wear => {
        const f = o => bakeGrid(rexFrame({ acc: wear, ...o }), dp);
        return {
          idle: f({}),
          blink: f({ blink: true }),
          run: [f({ legs: 1 }), f({ legs: 2, tail: true })],
          jump: f({ legs: 3 }),
          fall: f({ legs: 4, tail: true }),
          duck: [f({ duck: true, legs: 0 }), f({ duck: true, legs: 1 })],
        };
      });
    }
    return rexes[si];
  }
  function digit(col) {
    const key = col + (Math.random() < .5 ? 0 : 1);
    if (!digits.has(key)) {
      digits.set(key, bake(DIGIT[+key.slice(-1)], { '#': col }, Math.max(1, Math.round(dp * .5))));
    }
    return digits.get(key);
  }

  /* ── частинки: один запас на все (пил, іскри, біти) — нових об'єктів під час гри не створюємо ── */
  const FX = Array.from({ length: 160 }, () => ({ life: 0, max: 1, x: 0, y: 0, vx: 0, vy: 0, g: 0, col: '', img: null }));
  let fxi = 0;
  // x — у світі, y — висота над землею (U); g — гравітація; img — готова картинка (цифра), інакше квадратик кольору col
  function emit(x, y, vx, vy, life, g, col, img = null) {
    const p = FX[fxi];
    fxi = (fxi + 1) % FX.length;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = p.max = life;
    p.g = g;
    p.col = col;
    p.img = img;
  }
  const puff = (n, x, y, col, power) => {
    for (let i = REDUCED ? Math.ceil(n / 3) : n; i > 0; i--) {
      emit(x, y, rnd(power), Math.random() * power * .6, .25 + Math.random() * .3, 90, col);
    }
  };
  /* погода: сніг, пелюстки, світляки, листя; координати — на екрані (U), щоб завжди бути в кадрі */
  const AIR = Array.from({ length: REDUCED ? 10 : 46 }, () => ({ x: 0, y: 0, v: 1, ph: 0, s: 0, life: 0 }));
  function seed(p, fresh, running) {
    // погода живе під дротом: смуга рахунку лишається чистою
    const top = (gy - wy) / dp;
    p.v = .6 + Math.random() * .8;
    p.ph = Math.random() * 6.28;
    p.life = 5 + Math.random() * 7;
    const fromSide = !fresh && running && Math.random() < .6;
    p.x = fromSide ? VW + Math.random() * 8 : Math.random() * (VW + 12);
    // погода — тієї пори року, над чиєю землею летить (у переході — впереміш, див. seasonMix)
    p.s = seasonMix(w.dist - px0 + p.x, p.ph / 6.29);
    p.y = fresh || fromSide || SEASONS[p.s].weather === 'firefly' ? 2 + Math.random() * (top - 2) : top + Math.random() * 4;
  }

  /* ── розмір: піксель спрайта — ціле число пікселів екрана, тож арт не розмивається ── */
  function size() {
    const r = el.getBoundingClientRect();
    D = devicePixelRatio || 1;
    W = Math.round(r.width * D);
    H = Math.round(r.height * D);
    if (!W || !H) return;
    cv.width = W;
    cv.height = H;
    dp = Math.max(2, Math.floor(Math.min(H / (STRIP + PLAY + HUD), W / MIN_W)));
    // піксель значків: 2–3 px CSS
    hp = Math.max(1, Math.round(D * (r.height >= 250 ? 3 : 2)));
    // кнопка «ще раз»: 56–80 px CSS у діаметрі
    R = Math.round(clamp(r.height * .15, 28, 40) * D);
    theme();
    VW = W / dp;
    gy = H - STRIP * dp;
    edge = Math.round(12 * D);
    // дріт («лінія зв'язку») — межа ігрового поля: під ним висять навісні перешкоди, над ним — чиста смуга для рахунку
    wy = gy - Math.max(PLAY, Math.floor((gy - edge - 7 * hp - Math.round(8 * D)) / dp)) * dp;
    // де стоїть КІ-Рекс (лівий край його зони), U від краю
    px0 = Math.round(clamp(VW * .12, 11, 34));
    fontPx = Math.round(clamp(r.height / 17, 12, 15) * D);
    c.font = font(fontPx);
    chW = c.measureText('0').width;
    fitLine(line);
  }
  // рядок керування має вміститися в смузі під землею: на вузькому екрані шрифт трохи менший
  function fitLine(text) {
    line = text;
    c.font = font(fontPx);
    const room = W - 2 * edge;
    const full = c.measureText(line).width;
    linePx = full > room ? Math.max(Math.round(10 * D), Math.floor(fontPx * room / full)) : fontPx;
    c.font = font(linePx);
    lineW = c.measureText(line).width;
  }

  /* ── події й анімації ─────────────────────────────────────── */
  function reset() {
    sq = spin = spinV = boost = shake = gold = bump = pop.t = tip.a = 0;
    for (const p of FX) p.life = 0;
  }
  const cheer = () => {
    gold = GOLD;
  };
  function on(ev, f) {
    const wd = f.w;
    const p = wd.pl;
    const x = wd.dist + STAND.w / 2;
    if (ev & EV.JUMP) {
      sq = .2;
      puff(3, x, p.h, T.e, 26);
    }
    // після сальто приземлення важче: більше пилу й ледь помітний струс
    if (ev & EV.LAND) {
      puff(spinV ? 10 : 6, x, p.h, T.e, spinV ? 60 : 44);
      if (spinV) shake = .07;
      sq = -.24;
      spin = spinV = boost = 0;
    }
    // сальто на весь політ і шлейф
    if (ev & (EV.PAD | EV.ORB)) {
      spin = 0;
      spinV = 6.283 * wd.speed / (ev & EV.PAD ? PAD_L : 40);
      boost = .7;
      sq = .26;
      puff(8, x, p.h + (ev & EV.ORB ? 8 : 0), T.y, 60);
      if (ev & EV.PAD) shake = .06;
      else {
        // з'їдений біт: очки злітають угору, рахунок на мить золотіє
        pop.t = .8;
        pop.x = x;
        pop.y = p.h + 22;
        bump = .3;
      }
    }
    // КІ-Рекс розсипається на біти: кожен третій піксель спрайта стає цифрою 0 або 1 свого кольору
    if (ev & EV.DIE && !REDUCED) {
      let n = 0;
      rexFrame({ acc: SEASONS[wd.marks[wd.mi].s].wear[0], duck: p.duck }).forEach((row, r) => row.forEach((col, i) => {
        if (col && n++ % 3 === 0) {
          emit(
            wd.dist - 8 - REX_GRID.ox + i,
            p.h + 22 - r,
            (i - 15) * 4 + rnd(40) + wd.speed * .25,
            (14 - r) * 4 + 30 + Math.random() * 50,
            .8 + Math.random() * .9,
            170,
            col,
            digit(col),
          );
        }
      }));
      shake = .25;
    }
    // фініш: золоті біти
    if (ev & EV.WIN && !REDUCED) {
      for (let i = 0; i < 40; i++) {
        emit(
          x + rnd(60),
          p.h + 30 + Math.random() * 20,
          rnd(50),
          20 + Math.random() * 60,
          1.2 + Math.random() * 1.2,
          120,
          T.y,
          digit(T.y),
        );
      }
    }
  }
  function update(dt, f) {
    time += dt;
    w = f.w;
    if (f.mode === 'idle' && (blinkT -= dt) <= 0) {
      blink = .13;
      blinkT = 2.2 + Math.random() * 3;
    }
    // «сік» повертається до спокою
    sq = Math.abs(sq) < .02 ? 0 : sq - sq * Math.min(1, dt * 14);
    boost = Math.max(0, boost - dt);
    shake = Math.max(0, shake - dt);
    blink = Math.max(0, blink - dt);
    gold = Math.max(0, gold - dt);
    bump = Math.max(0, bump - dt);
    pop.t = Math.max(0, pop.t - dt);
    if (spinV) {
      spin += spinV * dt;
      if (spin >= 6.283) spin = spinV = 0;
    }
    // підказки з'являються й гаснуть плавно
    lineA += ((f.line ? 1 : 0) - lineA) * Math.min(1, dt * 6);
    if (f.tip.kind) {
      const o = f.tip.o;
      tip.kind = f.tip.kind;
      tip.cx = o.cx;
      tip.cy = o.cy;
      tip.x = o.x;
      tip.w = o.w;
      tip.at = takeoff(o);
      tip.label = f.tip.label;
    }
    tip.a += ((f.tip.kind ? 1 : 0) - tip.a) * Math.min(1, dt * 10);
    // частинки летять
    for (const p of FX) {
      if (p.life > 0) {
        p.life -= dt;
        p.vy -= p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < 0) {
          p.y = 0;
          p.vy *= -.4;
          p.vx *= .6;
        }
      }
    }
    const run = f.mode === 'run';
    const wind = run ? w.speed * .35 : 0;
    const left = w.dist - px0;
    for (const p of AIR) {
      const sway = Math.sin(time * 1.7 + p.ph);
      // перехід між порами проїжджає екраном — і сніжинки за ним поступово стають пелюстками
      p.s = seasonMix(left + p.x, p.ph / 6.29);
      const kind = SEASONS[p.s].weather;
      if (kind === 'firefly') {
        // світляки висять і погойдуються
        p.x -= (1.5 * p.v + wind) * dt;
        p.y += sway * 3 * dt;
      } else {
        p.x -= ((kind === 'leaf' ? 9 : 3) + sway * 4 + wind) * dt;
        p.y -= (kind === 'leaf' ? 11 : kind === 'snow' ? 9 : 6) * p.v * dt;
      }
      if ((p.life -= dt) <= 0 || p.y < 0 || p.x < -3) seed(p, false, run);
    }
  }

  /* ── шари світу (усе в пікселях екрана; cam — лівий край кадру у світі) ──
     Пора року в кожного шматка траси своя. Між сусідніми порами — перехід завдовжки BLEND: на цьому відрізку
     карти земля, тло, трава й погода плавно перетікають з однієї пори в іншу. Перехід стоїть на трасі, як і все інше,
     і їде разом із нею — жодної анімації в часі */
  const X = wx => Math.round(wx * dp) - cam;
  const BLEND = 80;                                        // U траси: ширина переходу між порами року
  const smooth = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  // частка наступної пори в точці траси wx біля шва sx: 0 до переходу, 1 після нього
  const share = (wx, sx) => smooth((wx - sx) / BLEND + .5);
  // пора року для дрібниці (травинка, квітка, сніжинка) в точці траси wx; u — її власне число від 0 до 1.
  // У переході дрібниць наступної пори більшає поступово, від поодиноких до всіх
  function seasonMix(wx, u) {
    for (let i = 1; i < w.marks.length; i++) {
      const sx = w.marks[i].x;
      if (Math.abs(wx - sx) < BLEND / 2) return u < share(wx, sx) ? w.marks[i].s : w.marks[i - 1].s;
    }
    return seasonAt(w, wx);
  }
  const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mixHex = (h1, h2, t) => {
    const a = hexRGB(h1), b = hexRGB(h2);
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(' ')})`;
  };

  // запасні полотна для переходу тла: шар однієї пори (one) і зважена сума шарів (sum)
  let bufs = null;
  function buffers() {
    if (!bufs || bufs[0].cv.width !== W || bufs[0].cv.height !== H) {
      bufs = [0, 1].map(() => {
        const cv2 = document.createElement('canvas');
        cv2.width = W;
        cv2.height = H;
        const g = cv2.getContext('2d');
        g.imageSmoothingEnabled = false;
        return { cv: cv2, g };
      });
    }
    return bufs;
  }
  // малює fn на полотні g лише в смузі екрана від x0 до x1
  function clipped(g, x0, x1, fn) {
    g.save();
    g.beginPath();
    g.rect(x0, 0, x1 - x0, H);
    g.clip();
    fn();
    g.restore();
  }
  // маска ваги пори в смузі z0…z1: від 0 до 1 між x0 і x1 (up) або від 1 до 0 (down), плавно, як share()
  function fade(g, x0, x1, up, z0, z1) {
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    for (let k = 0; k <= 8; k++) gr.addColorStop(k / 8, `rgb(0 0 0 / ${up ? smooth(k / 8) : 1 - smooth(k / 8)})`);
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = gr;
    g.fillRect(z0, 0, z1 - z0, H);
    g.globalCompositeOperation = 'source-over';
  }
  /* Тло: пагорби, хмари й дерева. Між переходами — однієї пори, просто на полотні гри. У смузі переходу
     шари двох пір складаються з вагами (вихід 1 → 0, вхід 0 → 1, сума ваг усюди 1): тло однієї пори
     проступає крізь інше. Запасні полотна працюють лише в цій смузі, тож решта кадру не дорожчає */
  function drawBackdrop() {
    const ms = w.marks, hz = BLEND / 2;
    for (let i = 0; i < ms.length; i++) {
      // чиста ділянка пори i — між її переходами
      const x0 = i ? Math.max(0, X(ms[i].x + hz)) : 0;
      const x1 = i + 1 < ms.length ? Math.min(W, X(ms[i + 1].x - hz)) : W;
      if (x1 > x0) clipped(c, x0, x1, () => drawScenery(c, skin(ms[i].s)));
      if (!i) continue;
      // перехід від пори i - 1 до пори i
      const g0 = X(ms[i].x - hz), g1 = X(ms[i].x + hz);
      const z0 = Math.max(0, g0), z1 = Math.min(W, g1);
      if (z1 <= z0) continue;
      const [one, sum] = buffers();
      sum.g.clearRect(z0, 0, z1 - z0, H);
      for (const [si, up] of [[ms[i - 1].s, false], [ms[i].s, true]]) {
        one.g.clearRect(z0, 0, z1 - z0, H);
        clipped(one.g, z0, z1, () => drawScenery(one.g, skin(si)));
        fade(one.g, g0, g1, up, z0, z1);
        sum.g.globalCompositeOperation = 'lighter';
        sum.g.drawImage(one.cv, z0, 0, z1 - z0, H, z0, 0, z1 - z0, H);
        sum.g.globalCompositeOperation = 'source-over';
      }
      c.drawImage(sum.cv, z0, 0, z1 - z0, H, z0, 0, z1 - z0, H);
    }
    // дріт
    c.globalAlpha = .5;
    c.fillStyle = T.l;
    c.fillRect(0, wy, W, Math.max(1, Math.round(D)));
    c.globalAlpha = 1;
  }
  // пагорби, хмари й дерева однієї пори року sk на полотні g
  function drawScenery(g, sk) {
    // далекі пагорби: стовпчики по 2 U, висота — сума двох синусоїд; їдуть уп'ятеро повільніше за землю
    const cw = 2 * dp;
    const off = Math.round(w.dist * dp * .2);
    g.fillStyle = sk.hill;
    for (let i = Math.floor(off / cw), x = -(off % cw); x < W; i++, x += cw) {
      const h = Math.round(10 + 5 * Math.sin(i * .19) + 3 * Math.sin(i * .053 + 2)) * dp;
      g.fillRect(x, gy - h, cw, h);
    }
    // хмари пливуть самі й ледь відстають від бігу; вище дроту не піднімаються
    const co = w.dist * .08 + time * 1.2;
    const top = Math.min(44, (gy - wy) / dp - 5);
    for (let k = Math.floor(co / 80) - 1; (k * 80 - co) < VW; k++) {
      const r = hash(k);
      g.drawImage(sk.cloud, Math.round((k * 80 + r % 40 - co) * dp), gy - Math.round(Math.min(top, 30 + (r >>> 8) % 12) * dp));
    }
    // дерева — удвічі повільніше за землю; бліді, щоб не сперечалися з перешкодами
    const to = w.dist * .5;
    g.globalAlpha = TREE_ALPHA[+dark];
    for (let k = Math.floor(to / 62) - 1; k * 62 - to < VW; k++) {
      const tx = k * 62 + hash(k * 7 + 3) % 34;
      g.drawImage(sk.tree, Math.round((tx - to) * dp), gy - sk.tree.height);
    }
    g.globalAlpha = 1;
  }
  function drawGround() {
    const px = Math.max(1, Math.round(D));
    const pitch = 14 * dp;
    // земля кожної пори року підфарбована своїм кольором: сніг, трава, листя; у переході колір перетікає в наступний
    c.globalAlpha = .55;
    const soil = si => SEASONS[si][SEASONS[si].soil][+dark];
    for (let i = 0; i < w.marks.length; i++) {
      const x0 = i ? Math.max(0, X(w.marks[i].x + BLEND / 2)) : 0;
      const x1 = i + 1 < w.marks.length ? Math.min(W, X(w.marks[i + 1].x - BLEND / 2)) : W;
      if (x1 > x0) {
        c.fillStyle = soil(w.marks[i].s);
        c.fillRect(x0, gy, x1 - x0, 2 * dp);
      }
      if (!i) continue;
      // перехід: стовпчики по пікселю спрайта, колір — суміш двох пір за share()
      const sx = w.marks[i].x, from = soil(w.marks[i - 1].s), to = soil(w.marks[i].s);
      for (let x = Math.max(0, X(sx - BLEND / 2)); x < Math.min(W, X(sx + BLEND / 2)); x += dp) {
        c.fillStyle = mixHex(from, to, share((x + cam) / dp, sx));
        c.fillRect(x, gy, dp, 2 * dp);
      }
    }
    c.globalAlpha = 1;
    c.fillStyle = T.l;
    c.fillRect(0, gy, W, px);
    c.globalAlpha = .55;
    // штрихи під землею — видно швидкість
    for (let x = -(((cam % pitch) + pitch) % pitch); x < W; x += pitch) c.fillRect(x, gy + 4 * dp, 3 * dp, px);
    c.globalAlpha = 1;
    // трава, замети, листя
    for (let k = Math.floor(cam / dp / 11) - 1; k * 11 < cam / dp + VW; k++) {
      const r = hash(k);
      // через одну: земля не має сперечатися з перешкодами
      if (r % 2) continue;
      const wx = k * 11 + (r >>> 4) % 7;
      const list = skin(seasonMix(wx, (r >>> 16) / 65536)).deco;
      const d = list[(r >>> 8) % list.length];
      c.drawImage(d, X(wx), gy - d.height);
    }
  }
  // м'яке золоте сяйво довкола корисного (пружина, біт): воно ледь пульсує
  function glow(x, y, wd, ht, phase) {
    c.globalAlpha = REDUCED ? .2 : .17 + .11 * Math.sin(time * 5 + phase);
    c.fillStyle = T.y;
    c.fillRect(x - dp, y - dp, wd + 2 * dp, ht + 2 * dp);
    c.globalAlpha = 1;
  }
  // одна перешкода: x, y — лівий верхній кут її клітинки на екрані
  function drawObstacle(o, x, y, sk, cs) {
    const cell = CELL * dp;
    if (o.kind === 'block') c.drawImage(cs.block, x, y);
    else if (o.kind === 'spike') c.drawImage(sk.spike, x, y);
    else if (o.kind === 'gate') {
      // навісна: тонкий підвіс від дроту й сезонний тягар на висоті голови
      const t = Math.max(2, Math.round(2 * D));
      c.fillStyle = T.l;
      c.fillRect(x + Math.round((cell - t) / 2), wy, t, y - wy);
      c.drawImage(sk.hang, x, y);
    } else if (o.kind === 'bug') {
      // жук летить рівно: махає лише крилами
      c.drawImage(cs.bug[Math.floor(time * 12) & 1], x, y + dp);
    } else if (o.kind === 'pad') {
      const pd = o.used ? cs.padUp : cs.pad;
      if (!o.used) glow(x, y + cell - pd.height, cell, pd.height, o.cx);
      c.drawImage(pd, x, y + cell - pd.height);
    } else if (o.kind === 'orb' && !o.used) {
      const b = cs.bit[Math.floor(time * 2.5 + o.cx) & 1];
      const bx = x - Math.round(dp / 2);
      const by = y - Math.round(dp / 2) + Math.round(Math.sin(time * 4 + o.cx) * dp);
      glow(bx, by, b.width, b.height, o.cx);
      c.drawImage(b, bx, by);
    }
  }
  function drawObstacles() {
    const cs = shared();
    for (const o of w.obs) {
      const x = X(o.cx);
      if (x <= W && x >= -2 * CELL * dp) drawObstacle(o, x, gy - (o.cy + CELL) * dp, skin(o.s), cs);
    }
  }
  function drawRex(si, mode) {
    const p = w.pl;
    const sets = rex(si);
    const set = sets[Math.floor(time * 7) % sets.length];
    const foot = Math.floor(w.dist / 7) & 1;
    // на фініші КІ-Рекс радіє: підстрибує на місці (без prefers-reduced-motion)
    const hop = mode === 'won' && !REDUCED ? Math.abs(Math.sin(time * 5.5)) * 9 : 0;
    const still = mode === 'idle' || mode === 'won';
    const img = still
      ? (hop > 2 ? set.jump : blink > 0 ? set.blink : set.idle)
      : !p.ground ? (p.vy > 0 ? set.jump : set.fall) : p.duck ? set.duck[foot] : set.run[foot];
    // на кадрі «ноги разом» тіло на піксель вище
    const lift = Math.round((still ? p.floor + hop : p.h) * dp);
    const bob = mode === 'run' && p.ground && !p.duck && foot ? dp : 0;
    // стовпчик 8 спрайта — лівий край зони зіткнення
    const x = (px0 - 8 - REX_GRID.ox) * dp;
    const y = gy - lift - (REX_GRID.oy + 18) * dp - bob;
    if (REDUCED || (!sq && !spin && !boost)) {
      c.drawImage(img, x, y);
      return;
    }
    // точка під ногами: навколо неї стиск-розтяг
    const cx = (px0 + 5) * dp;
    const fy = gy - lift;
    // шлейф: три бліді копії позаду, потім сам КІ-Рекс
    for (let i = boost > 0 ? 3 : 0; i >= 0; i--) {
      c.save();
      c.globalAlpha = i ? .26 - i * .06 : 1;
      // копії лежать уздовж дуги польоту, але не нижче опори
      c.translate(cx - i * 5 * dp, fy + Math.round(Math.min(i * p.vy * 5, p.h - p.floor) * dp));
      if (spin) {
        c.translate(0, -9 * dp);
        c.rotate(spin - i * .35);
        c.translate(0, 9 * dp);
      }
      c.scale(1 - sq * .6, 1 + sq);
      c.drawImage(img, x - cx, y - fy);
      c.restore();
    }
  }
  function drawParticles() {
    // погода
    for (const p of AIR) {
      const sn = SEASONS[p.s];
      const kind = sn.weather;
      const x = Math.round(p.x * dp);
      const y = gy - Math.round(p.y * dp);
      const tw = Math.sin(time * 3 + p.ph);
      const pick = Math.floor(p.ph * 3) % 6;
      c.fillStyle = sn[kind === 'leaf' ? 'abc'[Math.floor(p.ph) % 3] : sn.air[+dark]][+dark];
      c.globalAlpha = kind === 'firefly' ? .35 + .5 * Math.max(0, tw) : .8;
      if (kind === 'sakura' && pick === 4) {
        // серед пелюсток сакури — сердечка
        c.drawImage(skin(p.s).heart, x, y);
      } else if (kind === 'sakura' && pick === 5) {
        // й іскорки, що мерехтять
        c.globalAlpha = .3 + .6 * Math.max(0, tw);
        c.drawImage(skin(p.s).spark, x, y);
      } else if (kind === 'leaf' || kind === 'sakura') {
        // листок і пелюстка перевертаються
        c.fillRect(x, y, tw > 0 ? 2 * dp : dp, tw > 0 ? dp : 2 * dp);
      } else c.fillRect(x, y, dp, dp);
      // сяйво світляка
      if (kind === 'firefly') {
        c.globalAlpha *= .22;
        c.fillRect(x - dp, y - dp, 3 * dp, 3 * dp);
      }
    }
    // пил, іскри, біти
    for (const p of FX) {
      if (p.life > 0) {
        c.globalAlpha = Math.min(1, p.life / (p.max * .4));
        if (p.img) c.drawImage(p.img, X(p.x), gy - Math.round(p.y * dp) - p.img.height);
        else {
          c.fillStyle = p.col;
          c.fillRect(X(p.x), gy - Math.round(p.y * dp) - dp, dp, dp);
        }
      }
    }
    c.globalAlpha = 1;
  }

  /* ── написи й значки поверх світу ─────────────────────────── */
  // напис на плашці кольору тла: читається поверх дерев, пагорбів і частинок. x, y — середина напису
  function label(text, x, y, px, color, a) {
    // шрифт рівноширинний: ширина — це число знаків
    const tw = text.length * chW * px / fontPx + px;
    const th = Math.round(px * 1.5);
    c.globalAlpha = a * .92;
    c.fillStyle = T.s;
    c.fillRect(Math.round(x - tw / 2), Math.round(y - th / 2), Math.round(tw), th);
    c.globalAlpha = a;
    c.fillStyle = color;
    c.font = font(px);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, Math.round(x), Math.round(y) + Math.round(D));
    c.globalAlpha = 1;
  }
  /* Підказка першої пори року — значок біля перешкоди, але не на ній:
       jump — стрілка вгору над місцем, де найкраще відштовхнутися (перед перешкодою);
       duck — стрілка вниз у проході під навісною;
       pad  — пунктирна дуга польоту, яким підкине пружина;
       orb  — кільце довкола біта, що пульсує; над ним стрілка вгору, а в грі дотиком — друге кільце «торкнися».
     Слово-підпис (якщо є) стоїть під самим дротом */
  function drawTip(touch) {
    if (tip.a <= .02) return;
    const cs = shared();
    const cell = CELL * dp;
    const beat = REDUCED ? .4 : (time * 1.4) % 1;
    const fade = tip.a * (REDUCED ? 1 : Math.min(1, 2.4 * (1 - beat)));
    const up = cs.tipUp;
    const dn = cs.tipDown;
    // над цією точкою стоїть підпис
    let lx = X(tip.cx) + cell / 2;
    if (tip.kind === 'duck') {
      c.globalAlpha = fade;
      c.drawImage(dn, Math.round(lx - dn.width / 2), gy - Math.round((11 - 5 * beat) * dp));
    } else if (tip.kind === 'jump') {
      lx = X(tip.at + STAND.w / 2);
      c.globalAlpha = fade;
      c.drawImage(up, Math.round(lx - up.width / 2), gy - Math.round((22 + 5 * beat) * dp) - up.height);
      // позначка на землі: звідси
      c.globalAlpha = tip.a * .6;
      c.fillStyle = T.K;
      c.fillRect(Math.round(lx - 2 * dp), gy - dp, 4 * dp, dp);
    } else if (tip.kind === 'pad') {
      const x0 = tip.x - STAND.w / 2;
      const march = REDUCED ? 0 : Math.floor(time * 8);
      c.fillStyle = T.Y;
      // точки вздовж дуги; яскрава точка «біжить» уперед
      for (let i = 1; i < 14; i++) {
        const t = i / 14;
        c.globalAlpha = tip.a * ((i - march) % 4 === 0 ? 1 : .55);
        c.fillRect(X(x0 + t * PAD_L) - Math.round(dp / 2), gy - Math.round((4 * PAD_H * t * (1 - t) + 9) * dp), dp, dp);
      }
    } else {
      // near — саме зараз час натискати
      const oy = gy - Math.round((tip.cy + CELL / 2) * dp);
      const near = w.dist + STAND.w > tip.x && w.dist < tip.x + tip.w;
      c.strokeStyle = T.Y;
      c.lineWidth = Math.max(2, Math.round(2 * D)) * (near ? 2 : 1);
      c.globalAlpha = tip.a * (near ? 1 : .85 - .4 * beat);
      c.beginPath();
      c.arc(lx, oy, (6 + 2 * beat) * dp, 0, 6.283);
      c.stroke();
      if (touch) {
        c.globalAlpha *= .6;
        c.beginPath();
        c.arc(lx, oy, (9 + 3 * beat) * dp, 0, 6.283);
        c.stroke();
      } else {
        c.globalAlpha = tip.a;
        c.drawImage(up, Math.round(lx - up.width / 2), oy - 9 * dp - up.height);
      }
    }
    c.globalAlpha = 1;
    if (tip.label) {
      const half = (tip.label.length + 1) * chW / 2 + edge;
      label(tip.label, clamp(lx, half, W - half), wy + Math.round(fontPx * 1.1), fontPx, T.k, tip.a);
    }
  }
  // очки за біт злітають угору й тануть
  function drawPop() {
    if (pop.t > 0) {
      label(
        POP,
        X(pop.x),
        gy - Math.round((pop.y + (REDUCED ? 0 : (.8 - pop.t) * 12)) * dp),
        fontPx,
        T.Y,
        Math.min(1, pop.t * 3),
      );
    }
  }
  // рядок керування — у смузі під землею, де він нічого не затуляє
  function drawLine() {
    if (lineA <= .02 || !line) return;
    const top = gy + 2 * dp + 1;
    c.globalAlpha = lineA;
    // під текстом — чисте тло, без штрихів
    c.fillStyle = T.s;
    c.fillRect(Math.round((W - lineW) / 2) - edge, top, Math.round(lineW) + 2 * edge, H - top);
    c.fillStyle = T.k;
    c.font = font(linePx);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(line, W / 2, Math.round((top + H) / 2) + Math.round(D));
    c.globalAlpha = 1;
  }
  // Рахунок і значок пори року малюються останніми, у смузі над дротом: перешкоди туди не дістають,
  // а все, що туди залетіло (сніг, КІ-Рекс у високому стрибку), пригашує плашка кольору тла
  function drawHud(si, sc, best) {
    const ic = skin(si).icon;
    const mk = w.marks[w.mi];
    const y = edge + Math.round(ic.height / 2);
    c.globalAlpha = .9;
    c.fillStyle = T.s;
    c.fillRect(0, 0, W, wy);
    c.globalAlpha = 1;
    // ліворуч — значок пори року, в якій зараз КІ-Рекс; біля нього чотири позначки років
    // (зафарбовані — поточний і пройдені) і смужка «скільки цієї пори пройдено»
    const bx = edge + ic.width + 3 * hp;
    const bw = 14 * hp;
    const year = Math.floor(mk.n / PER_YEAR);
    c.drawImage(ic, edge, edge);
    for (let i = 0; i < YEARS; i++) {
      c.fillStyle = T.l;
      c.fillRect(bx + i * 4 * hp, edge, 2 * hp, 2 * hp);
      if (i <= year) {
        c.fillStyle = T.k;
        c.fillRect(bx + i * 4 * hp, edge, 2 * hp, 2 * hp);
      } else {
        c.fillStyle = T.s;
        c.fillRect(
          bx + i * 4 * hp + Math.max(1, Math.round(hp / 2)),
          edge + Math.max(1, Math.round(hp / 2)),
          2 * hp - 2 * Math.max(1, Math.round(hp / 2)),
          2 * hp - 2 * Math.max(1, Math.round(hp / 2)),
        );
      }
    }
    c.fillStyle = T.l;
    c.fillRect(bx, edge + 5 * hp, bw, hp);
    c.fillStyle = SEASONS[si].c[+dark];
    c.fillRect(bx, edge + 5 * hp, Math.round(bw * clamp((w.dist - mk.x) / (mk.end - mk.x), 0, 1)), hp);
    // праворуч — рекорд і рахунок шістнадцятковими; якщо поруч зі значком тісно — лише рахунок
    if (sc !== hudSc || best !== hudBest) {
      hudSc = sc;
      hudBest = best;
      hudNow = hx(sc);
      hudHi = 'HI ' + hx(best);
    }
    const xHi = W - edge - Math.round((hudNow.length + 3) * chW);
    const wHi = Math.round(hudHi.length * chW);
    c.font = font(fontPx);
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    c.fillStyle = bump > 0 ? T.Y : T.k;
    c.fillText(hudNow, W - edge, y);
    if (xHi - wHi < bx + bw + edge) return;
    // побито рекорд: під «HI» на мить золота плашка
    if (gold > 0) {
      c.globalAlpha = .3 * Math.min(1, gold * 2);
      c.fillStyle = T.y;
      c.fillRect(xHi - wHi - 4 * D, y - Math.round(fontPx * .8), wHi + 8 * D, Math.round(fontPx * 1.6));
      c.globalAlpha = 1;
    }
    c.fillStyle = gold > 0 ? T.Y : T.e;
    c.fillText(hudHi, xHi, y);
  }
  // кругла кнопка кольору головної дії сайту зі значком: 'play' ▶, 'pause' ❙❙, 'again' ↻. x, y — центр, r — радіус
  function drawButton(x, y, r, kind) {
    c.fillStyle = T.A;
    c.beginPath();
    c.arc(x, y, r, 0, 6.283);
    c.fill();
    c.fillStyle = c.strokeStyle = T.O;
    if (kind === 'play') {
      c.beginPath();
      c.moveTo(x - r * .26, y - r * .42);
      c.lineTo(x + r * .46, y);
      c.lineTo(x - r * .26, y + r * .42);
      c.closePath();
      c.fill();
    } else if (kind === 'pause') {
      c.fillRect(Math.round(x - r * .36), Math.round(y - r * .38), Math.round(r * .26), Math.round(r * .76));
      c.fillRect(Math.round(x + r * .1), Math.round(y - r * .38), Math.round(r * .26), Math.round(r * .76));
    } else {
      // ↻: дуга за годинниковою стрілкою і стрілка на її кінці
      const a = 5.45;
      const q = r * .44;
      const px = x + q * Math.cos(a);
      const py = y + q * Math.sin(a);
      const tx = -Math.sin(a);
      const ty = Math.cos(a);
      const h = r * .3;
      c.lineWidth = r * .15;
      c.lineCap = 'round';
      c.beginPath();
      c.arc(x, y, q, .5, a - .3);
      c.stroke();
      c.beginPath();
      c.moveTo(px + tx * h, py + ty * h);
      c.lineTo(px - Math.cos(a) * h * .8 - tx * h * .35, py - Math.sin(a) * h * .8 - ty * h * .35);
      c.lineTo(px + Math.cos(a) * h * .8 - tx * h * .35, py + Math.sin(a) * h * .8 - ty * h * .35);
      c.closePath();
      c.fill();
    }
  }
  // до старту й на паузі — кнопка посеред поля: ▶ або ❙❙. Кнопки нерухомі: не пульсують і не «дихають»
  function drawState(mode) {
    drawButton(Math.round(W / 2), Math.round(wy + (gy - wy) * .48), Math.round(R * .85), mode === 'idle' ? 'play' : 'pause');
  }
  // після падіння чи фінішу: ↻ у крузі, біля нього значок пори року, з якої почнеться наступний забіг,
  // праворуч — рахунок забігу й рекорд. t — секунд від падіння (плашка з'являється за 0,15 с і далі стоїть нерухомо).
  // title — заголовок над рахунком («Перемога» після фінішу); після падіння його немає
  function drawRestart(sc, best, record, si, t, title) {
    const cy = Math.round(wy + (gy - wy) * .48);
    // розміри шрифту: рахунок, заголовок, рекорд
    const big = Math.round(R * .8);
    const head = Math.round(R * .6);
    const mid = Math.round(R * .46);
    const gap = Math.round(R * .55);
    const pad = Math.round(R * .4);
    // шрифт рівноширинний: ширина — це число знаків
    const sNow = hx(sc);
    const sHi = 'HI ' + hx(best);
    let tw = Math.round(Math.max(sNow.length * chW * big, sHi.length * chW * mid) / fontPx);
    // заголовок міряємо: у слові можуть бути літери не з нашого шрифту
    if (title) {
      c.font = font(head);
      tw = Math.max(tw, Math.ceil(c.measureText(title).width));
    }
    // висота тексту: рядок заголовка (якщо є), рахунок, рекорд; плашка росте, якщо текст вищий за кнопку
    const headH = title ? Math.round(head * .72 + big * .23) : 0;
    const textH = headH + big * .72 + mid * 1.25;
    const half = Math.max(R, Math.round(textH / 2));
    const x0 = Math.round((W - (2 * R + gap + tw)) / 2);
    const bx = x0 + R;
    const tx = x0 + 2 * R + gap;
    c.globalAlpha = REDUCED ? 1 : Math.min(1, t / .15);
    // плашка кольору тла: рахунок читається поверх дерев і перешкод
    c.fillStyle = T.s;
    c.strokeStyle = T.l;
    c.lineWidth = Math.max(1, Math.round(D));
    c.beginPath();
    c.roundRect(x0 - pad + .5, cy - half - pad + .5, 2 * R + gap + tw + 2 * pad, 2 * half + 2 * pad, pad);
    c.fill();
    c.stroke();
    drawButton(bx, cy, R, 'again');
    const ic = skin(si).badge;
    const ix = bx + Math.round(R * .72);
    const iy = cy + Math.round(R * .72);
    c.fillStyle = T.s;
    c.strokeStyle = T.l;
    c.lineWidth = Math.max(1, Math.round(D));
    c.beginPath();
    c.arc(ix, iy, ic.width * .78, 0, 6.283);
    c.fill();
    c.stroke();
    c.drawImage(ic, ix - Math.round(ic.width / 2), iy - Math.round(ic.height / 2));
    const top = cy - Math.round(textH / 2);
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    // заголовок золотий і нерухомий
    if (title) {
      c.font = font(head);
      c.fillStyle = T.Y;
      c.fillText(title, tx, top + Math.round(head * .72));
    }
    c.font = font(big);
    c.fillStyle = T.K;
    c.fillText(sNow, tx, top + headH + Math.round(big * .72));
    // рекорд золотий, якщо щойно побитий
    c.font = font(mid);
    c.fillStyle = record ? T.Y : T.k;
    c.fillText(sHi, tx, top + headH + Math.round(big * .72 + mid * 1.25));
    c.globalAlpha = 1;
  }

  function draw(f) {
    if (!W || !dp) return;
    w = f.w;
    // перший кадр — рядок одразу на місці, далі з'являється плавно
    if (f.line && f.line !== line) {
      fitLine(f.line);
      if (!time) lineA = 1;
    }
    const cur = w.marks[w.mi].s;
    // перший кадр: погода вже в повітрі
    if (!AIR[0].life) {
      for (const p of AIR) seed(p, true, false);
    }
    cam = Math.round(w.dist * dp) - px0 * dp;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    // тло малюємо самі — з того самого знімка теми, що й решту
    c.fillStyle = T.s;
    c.fillRect(0, 0, W, H);
    // струс після удару
    if (shake > 0 && !REDUCED) c.translate(Math.round(rnd(shake * 14 * dp)), Math.round(rnd(shake * 10 * dp)));
    drawBackdrop();
    drawGround();
    drawObstacles();
    drawTip(f.touch);
    if (f.mode !== 'over' || REDUCED) drawRex(cur, f.mode);
    // золоті біти сиплються згори
    if (f.mode === 'won' && !REDUCED && Math.random() < .25) {
      emit(w.dist - px0 + Math.random() * VW, (gy - wy) / dp, rnd(10), -10, 2.2, 30, T.y, digit(T.y));
    }
    drawParticles();
    drawPop();
    c.setTransform(1, 0, 0, 1, 0, 0);
    drawLine();
    drawHud(cur, f.score, f.best);
    if (f.mode === 'idle' || f.mode === 'paused') drawState(f.mode);
    else if (f.mode === 'over' || f.mode === 'won') drawRestart(f.score, f.best, f.record, f.from, f.overT, f.title);
  }

  // playU — висота ігрового поля в U (від землі до дроту): вона не менша за PLAY,
  // тож КІ-Рекс не дістає до смуги рахунку
  return {
    size,
    theme,
    reset,
    on,
    cheer,
    update,
    draw,
    get vw() {
      return VW;
    },
    get rexX() {
      return px0;
    },
    get playU() {
      return (gy - wy) / dp;
    },
  };
}
