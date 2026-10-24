// Вітрина головної: шість упізнаваних експонатів комп'ютерної інженерії — ПРОЦЕСОР, ПАМ'ЯТЬ, ЛОГІКА, КОД, МЕРЕЖІ,
// ШІ (машинне навчання); на кожному — КІ-Рекс або знак кафедри. Експонати змінюються самі кожні 5 с. Вибір клавішею
// зупиняє автозміну й показує кнопку «АВТО»; пауза зупиняє весь рух. Без руху — статичні кадри, лише за клавішами.
// Перехід: старий експонат іде вглиб (менший, розфокусований, тане), новий виходить назустріч із розмиття
// на м'якій пружині.
import { REDUCED } from './spring.js';
import { machine } from './showcase/machine.js';
import { clamp } from './showcase/kit.js';
import cpu from './showcase/cpu.js';
import memory from './showcase/memory.js';
import logic from './showcase/logic.js';
import code from './showcase/code.js';
import net from './showcase/net.js';
import ml from './showcase/ml.js';

const EXHIBITS = [cpu, memory, logic, code, net, ml];
const HOLD = 5, TICK = .4, T = 1.2;                      // показ, такт машини, перехід (с)
const soft = (a, b, u) => .5 - .5 * Math.cos(Math.PI * clamp((u - a) / (b - a)));   // синусоїдальний вхід і вихід
const root = document.documentElement;
const css = v => getComputedStyle(root).getPropertyValue(v).trim();
const rgb = h => { const n = parseInt(h.replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);

export function showcase(figure) {
  const cv = figure.querySelector('canvas'), c = cv.getContext('2d');
  const keys = [...figure.querySelectorAll('[data-view]')], names = keys.map(k => k.dataset.name || k.textContent.trim()), n = keys.length;
  const play = figure.querySelector('[data-sc-play]'), autoBtn = figure.querySelector('[data-sc-auto]'), rail = figure.querySelector('.sc-rail');
  const huds = [...figure.querySelectorAll('.scope__hud')], hudEl = Object.fromEntries(['tl', 'tr', 'bl', 'br'].map(k => [k, figure.querySelector(`[data-sc-${k}]`)]));
  const L = root.lang === 'en' ? 'en' : 'uk';
  const env = { m: machine(), col: {}, L, gen: 0 };
  const ex = EXHIBITS.map(f => f(env)), failed = new Set();
  const st = { W: 0, H: 0, D: 1, cap: 2 };
  const layer = () => { const k = document.createElement('canvas'); return { k, c: k.getContext('2d') }; };
  const A = layer(), B = layer(), FILTER = 'filter' in c, small = {};
  let cur = 0, prev = -1, tr = T, shown = 0, auto = !REDUCED, playing = !REDUCED, t = 0, acc = 0, raf = 0, last = 0, seen = false;
  let hudPrev = null, hudCur = null, oops = false, lite = false;   // lite — полегшений перехід, лише якщо звичайний на цій машині гальмує

  function theme() {
    const v = { bg: '--bg', screen: '--screen', surface: '--surface', surface2: '--surface-2', ink: '--ink', ink2: '--ink-2', ink3: '--ink-3', gold: '--gold', goldInk: '--gold-ink', ph: '--phosphor', signal: '--signal', ok: '--ok', line: '--line', lineStrong: '--line-strong' };
    env.col = Object.fromEntries(Object.entries(v).map(([k, p]) => [k, css(p)]));
    env.col.dark = isDark(); env.col.goldRGB = rgb(env.col.gold); env.gen++;
  }
  function size() {
    st.D = Math.min(st.cap, devicePixelRatio || 1); st.W = cv.clientWidth; st.H = cv.clientHeight;   // розмір макета, без transform появи картки
    if (lite && prev >= 0) { tr = T; prev = -1; }                  // знімок старого експоната зітреться разом із шаром — перехід одразу до кінця
    for (const k of [cv, A.k, B.k]) { k.width = Math.round(st.W * st.D); k.height = Math.round(st.H * st.D); }
    env.gen++; draw();
  }

  const safe = (i, f) => { try { f(); } catch (e) { if (!failed.has(i)) { failed.add(i); console.error(e); } } };

  /* один експонат — у свій шар */
  function paint(i, k, dt) {
    k.setTransform(st.D, 0, 0, st.D, 0, 0); k.clearRect(0, 0, st.W, st.H);
    k.save(); let h;
    try { h = ex[i].draw(k, st.W, st.H, t, dt); } catch (e) { if (!failed.has(i)) { failed.add(i); console.error(e); } }
    k.restore();
    return h;
  }

  /* полегшене розмиття (лише в режимі lite): на зменшеній копії шару, у 4–16 разів менше пікселів */
  function soften(src, blur) {
    const f = blur > 3 ? 4 : 2, w = Math.max(1, Math.round(src.width / f)), h = Math.max(1, Math.round(src.height / f));
    const s = small[f] ||= layer();
    if (s.k.width !== w || s.k.height !== h) { s.k.width = w; s.k.height = h; } else s.c.clearRect(0, 0, w, h);
    const r = (blur * st.D - f / 2) / f;
    if (FILTER && r > .2) s.c.filter = `blur(${r.toFixed(2)}px)`;
    s.c.drawImage(src, 0, 0, w, h);
    if (FILTER) s.c.filter = 'none';
    return s.k;
  }
  /* шар експоната на полотно k: прозорість, масштаб від центру, розмиття */
  function put(k, src, alpha, scale, blur) {
    if (alpha < .004) return;
    let img = src;
    k.save(); k.globalAlpha = alpha;
    if (lite) { if (blur > .6) img = soften(src, blur); }
    else if (FILTER && blur > .3) k.filter = `blur(${blur.toFixed(2)}px)`;
    k.translate(st.W / 2, st.H / 2); k.scale(scale, scale); k.drawImage(img, -st.W / 2, -st.H / 2, st.W, st.H);
    k.restore();
  }

  function draw(dt = 0) {
    if (!st.W || !st.H) return;
    const u = tr / T;
    if (prev < 0 || u >= 1) { hud(hudCur = paint(cur, c, dt), cur, 1); return; }
    const ho = lite ? hudPrev : paint(prev, A.c, dt), hi = paint(cur, B.c, dt), o = soft(.04, .8, u), v = clamp((u - .12) / .88);   // у lite старий експонат — знімок у шарі A
    c.setTransform(st.D, 0, 0, st.D, 0, 0); c.clearRect(0, 0, st.W, st.H);
    put(c, A.k, 1 - o, 1 - .05 * o, 10 * o);                                       // старий іде вглиб
    put(c, B.k, soft(.12, .72, u), 1 + .045 * Math.exp(-5 * v) * Math.cos(5.5 * v), 9 * (1 - soft(.12, .85, u)));   // новий — назустріч, 1,045 → 1 з ледь помітним недольотом
    hudCur = hi;
    hud(u < .5 ? ho : hi, u < .5 ? prev : cur, u < .5 ? 1 - soft(0, .42, u) : soft(.58, 1, u));
  }
  /* lite: кадр, що йде, — знімок полотна; далі він лише тане й відступає вглиб, не перемальовується */
  function snap() {
    A.c.setTransform(1, 0, 0, 1, 0, 0); A.c.clearRect(0, 0, A.k.width, A.k.height); A.c.drawImage(cv, 0, 0);
    hudPrev = hudCur;
  }

  const hudLast = {};
  function hud(h, who, op) {
    huds.forEach(el => { el.style.opacity = op; el.style.translate = `0 ${((1 - op) * 3).toFixed(2)}px`; });
    if (!h) return;
    const v = { tl: h.tl ?? '', tr: h.tr ?? '', bl: h.bl ?? '', br: `${h.br ? h.br + ' · ' : ''}${who + 1}/${n}` }, nm = names[who];
    if (hudLast.nm !== nm || hudLast.tl !== v.tl) { const b = document.createElement('b'); b.textContent = nm; hudEl.tl.replaceChildren(b, v.tl ? ' · ' + v.tl : ''); hudLast.nm = nm; hudLast.tl = v.tl; }
    for (const k of ['tr', 'bl', 'br']) if (hudLast[k] !== v[k]) { hudEl[k].textContent = v[k]; hudLast[k] = v[k]; }
  }

  /* прогрес автозміни — волосяна смужка на кнопці паузи (на клавіші наступного експоната вона читалася як другий вибір) */
  function progress() {
    play?.style.setProperty('--p', auto && playing ? Math.min(1, shown / HOLD).toFixed(3) : 0);
  }
  function setAuto(on) {
    auto = on; shown = 0;
    if (autoBtn) autoBtn.hidden = on || REDUCED;
    progress();
  }
  function go(i, manual) {
    i = (i + n) % n;
    if (manual && auto) setAuto(false);
    if (i === cur) return;
    if (prev >= 0 && !lite) { tr = T; prev = -1; }                 // незавершений перехід — одразу до кінця (у lite він іде у знімок)
    if (lite && raf) snap();
    prev = cur; cur = i; shown = 0;
    tr = raf && st.W && st.H ? 0 : T; if (tr >= T) prev = -1;
    safe(cur, () => ex[cur].enter?.(t));
    keys.forEach((k, j) => k.setAttribute('aria-pressed', String(j === cur)));
    reveal(keys[cur]);
    progress();
    if (!raf) draw();
  }
  /* вузька картка (телефон): клавіші — один ряд із гортанням; обрана клавіша доїжджає до середини ряду, сторінка не зсувається */
  function reveal(k) {
    if (!rail || rail.scrollWidth <= rail.clientWidth + 1) return;
    rail.scrollTo({ left: k.offsetLeft - (rail.clientWidth - k.offsetWidth) / 2, behavior: REDUCED ? 'auto' : 'smooth' });
  }

  /* запобіжники лише для критичних випадків (ПК без апаратного прискорення, 4K): за звичайних умов — повна якість.
     Мірило — власний ритм кадрів браузера (base, нижні 10 %), тож браузер, що просто працює на 30 к/с
     (енергозбереження, монітор 30 Гц), повільним не вважається:
     • два переходи поспіль у середньому довші за 33 мс і за 1,8 ритму — наступні переходи полегшені (lite);
     • медіана кадру довша за 33 мс і за 1,8 ритму — полотно переходить на меншу щільність пікселів (2 → 1,5 → 1) */
  const perf = { buf: new Float32Array(90), n: 0, base: 1 / 60, ts: 0, tn: 0, slow: 0 };
  function watch(raw) {
    if (prev >= 0) { perf.ts += raw; perf.tn++; }
    else if (perf.tn) { const m = perf.ts / perf.tn; perf.slow = perf.tn > 12 && m > Math.max(.033, perf.base * 1.8) ? perf.slow + 1 : 0; if (perf.slow >= 2) lite = true; perf.ts = perf.tn = 0; }
    perf.buf[perf.n++ % 90] = raw;
    if (perf.n < 180 || perf.n % 90) return;                         // перші ~1,5 с після старту не рахуються
    const q = [...perf.buf].sort((a, b) => a - b), med = q[45]; perf.base = q[9];
    if (st.D > 1 && med > Math.max(.033, perf.base * 1.8)) { st.cap = st.D > 1.5 ? 1.5 : 1; perf.n = 0; size(); }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);                            // наступний кадр — першим: збій усередині не зупиняє вітрину
    const raw = Math.max(0, (now - last) / 1000) || 0, dt = Math.min(.05, raw); last = now;
    try {
      t += dt; acc += dt;
      while (acc >= TICK) { acc -= TICK; const ev = env.m.tick(); ex.forEach((e, i) => safe(i, () => e.tick?.(ev, t))); }
      if (tr < T) { tr += dt; if (tr >= T) prev = -1; }
      if (auto) { shown += dt; if (shown >= HOLD) go(cur + 1, false); }
      progress();
      draw(dt);
      watch(raw);
    } catch (e) {
      c.reset?.(); tr = T; prev = -1;
      if (!oops) { oops = true; console.error(e); }
    }
  }
  const start = () => { if (!raf && playing && seen && !document.hidden) { last = performance.now(); perf.n = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  keys.forEach((k, j) => k.addEventListener('click', () => go(j, true)));
  figure.querySelector('.scope__keys').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' || !e.target.matches('[data-view]')) return;
    const j = (keys.indexOf(e.target) + (e.key === 'ArrowRight' ? 1 : -1) + n) % n; go(j, true); keys[j].focus();
  });
  autoBtn?.addEventListener('click', () => { setAuto(true); keys[cur].focus(); });
  // краї стрічки клавіш тануть лише там, куди ще можна гортати
  if (rail) {
    const edges = () => { rail.toggleAttribute('data-l', rail.scrollLeft > 2); rail.toggleAttribute('data-r', rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 2); };
    rail.addEventListener('scroll', edges, { passive: true }); new ResizeObserver(edges).observe(rail); edges();
  }
  // свайп по екрану пальцем — сусідній експонат (вертикальне гортання сторінки лишається за браузером: touch-action: pan-y)
  let sx = 0, sy = 0, sid = -1, swiped = false;
  cv.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { sid = e.pointerId; sx = e.clientX; sy = e.clientY; swiped = false; } });
  cv.addEventListener('pointerup', e => {
    if (e.pointerId !== sid) return; sid = -1;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > 1.5 * Math.abs(dy)) { swiped = true; go(cur + (dx < 0 ? 1 : -1), true); }
  });
  cv.addEventListener('pointercancel', () => { sid = -1; });
  cv.addEventListener('click', e => {                               // клік по екрану — «торкнутися» експоната
    if (swiped) { swiped = false; return; }
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * st.W / r.width, y = (e.clientY - r.top) * st.H / r.height;
    if (ex[cur].poke) safe(cur, () => ex[cur].poke(x, y, t)); else { const ev = env.m.tick(); ex.forEach((v, i) => safe(i, () => v.tick?.(ev, t))); }
    if (!raf) draw();
  });
  const PL = L === 'uk' ? ['Пауза', 'Відтворити'] : ['Pause', 'Play'];
  const reflectPlay = () => {
    if (!play) return;
    play.setAttribute('aria-pressed', String(!playing)); play.title = playing ? PL[0] : PL[1];   // ім'я стале («Пауза»), стан — aria-pressed
    play.querySelector('use')?.setAttribute('href', playing ? '#i-pause' : '#i-play');
  };
  play?.addEventListener('click', () => {
    playing = !playing; reflectPlay(); progress();
    if (playing) start(); else { stop(); if (prev >= 0) { tr = T; prev = -1; } draw(); }
  });

  theme();
  document.addEventListener('themechange', () => { theme(); draw(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { theme(); draw(); });   // тема системи без вибору на сайті
  if (REDUCED) { ex.forEach(e => e.still?.()); if (autoBtn) autoBtn.hidden = true; }
  safe(cur, () => ex[cur].enter?.(0));
  reflectPlay(); progress();
  new ResizeObserver(size).observe(cv);
  // у пакеті подій видимості чинна — остання (швидке гортання колесом дає «вийшов, увійшов» одним пакетом)
  new IntersectionObserver(es => { seen = es[es.length - 1].isIntersecting; seen ? start() : stop(); }, { rootMargin: '80px' }).observe(figure);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  addEventListener('pageshow', () => { stop(); start(); });         // повернення кнопкою «Назад» зі збереженої сторінки
  document.fonts?.ready.then(() => { env.gen++; draw(); });
}
