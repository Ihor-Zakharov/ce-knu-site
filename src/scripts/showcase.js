// Вітрина головної: шість упізнаваних експонатів комп'ютерної інженерії — ПРОЦЕСОР, ПАМ'ЯТЬ, ЛОГІКА, КОД, МЕРЕЖІ,
// МАШИННЕ НАВЧАННЯ; на кожному — КІ-Рекс або знак кафедри. Експонати змінюються самі кожні 5 с. Вибір клавішею
// зупиняє автозміну й показує кнопку «АВТО»; пауза зупиняє весь рух. Без руху — статичні кадри, лише за клавішами.
// Перехід: кадр розсипається на пікселі, пікселі стають світлодіодами табло, золота хвиля перемикає їх
// на новий експонат, і він збирається назад — так оновлюється кадровий буфер.
import { REDUCED } from './spring.js';
import { machine } from './showcase/machine.js';
import { clamp, smooth, lerp } from './showcase/kit.js';
import cpu from './showcase/cpu.js';
import memory from './showcase/memory.js';
import logic from './showcase/logic.js';
import code from './showcase/code.js';
import net from './showcase/net.js';
import ml from './showcase/ml.js';

const EXHIBITS = [cpu, memory, logic, code, net, ml];
const HOLD = 5, TICK = .4, T = 1.1, P1 = .36, P2 = .62;   // показ, такт машини, перехід (с) і його фази
const root = document.documentElement;
const css = v => getComputedStyle(root).getPropertyValue(v).trim();
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
const rgb = h => { const n = parseInt(h.replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };

export function showcase(figure) {
  const cv = figure.querySelector('canvas'), c = cv.getContext('2d');
  const keys = [...figure.querySelectorAll('[data-view]')], names = keys.map(k => k.dataset.name || k.textContent.trim()), n = keys.length;
  const play = figure.querySelector('[data-sc-play]'), autoBtn = figure.querySelector('[data-sc-auto]');
  const huds = [...figure.querySelectorAll('.scope__hud')], hudEl = Object.fromEntries(['tl', 'tr', 'bl', 'br'].map(k => [k, figure.querySelector(`[data-sc-${k}]`)]));
  const L = root.lang === 'en' ? 'en' : 'uk';
  const env = { m: machine(), col: {}, L, gen: 0 };
  const ex = EXHIBITS.map(f => f(env)), failed = new Set();
  const st = { W: 0, H: 0, D: 1 };
  const layer = () => { const k = document.createElement('canvas'); return { k, c: k.getContext('2d') }; };
  const A = layer(), B = layer(), M = document.createElement('canvas'), mc = M.getContext('2d', { willReadFrequently: true });
  let cur = 0, prev = -1, tr = T, dir = 1, shown = 0, auto = !REDUCED, playing = !REDUCED, t = 0, acc = 0, raf = 0, last = 0, seen = false, nextKey = -1;

  function theme() {
    const v = { bg: '--bg', screen: '--screen', surface: '--surface', surface2: '--surface-2', ink: '--ink', ink2: '--ink-2', ink3: '--ink-3', gold: '--gold', goldInk: '--gold-ink', ph: '--phosphor', signal: '--signal', ok: '--ok', line: '--line', lineStrong: '--line-strong' };
    env.col = Object.fromEntries(Object.entries(v).map(([k, p]) => [k, css(p)]));
    env.col.dark = isDark(); env.col.goldRGB = rgb(env.col.gold); env.gen++;
  }
  function size() {
    const r = cv.getBoundingClientRect();
    st.D = Math.min(2, devicePixelRatio || 1); st.W = r.width; st.H = r.height;
    for (const k of [cv, A.k, B.k]) { k.width = Math.round(st.W * st.D); k.height = Math.round(st.H * st.D); }
    M.width = Math.ceil(st.W / 2); M.height = Math.ceil(st.H / 2);
    env.gen++; draw();
  }

  /* один експонат — у свій шар */
  function paint(i, k, dt) {
    k.setTransform(st.D, 0, 0, st.D, 0, 0); k.clearRect(0, 0, st.W, st.H);
    k.save(); let h;
    try { h = ex[i].draw(k, st.W, st.H, t, dt); } catch (e) { if (!failed.has(i)) { failed.add(i); console.error(e); } }
    k.restore();
    return h;
  }

  /* кадр → сітка комірок b×b: середній колір і непрозорість (з premultiplied alpha) */
  function sample(src, b) {
    mc.clearRect(0, 0, M.width, M.height); mc.drawImage(src, 0, 0, M.width, M.height);
    const d = mc.getImageData(0, 0, M.width, M.height).data, cols = Math.ceil(st.W / b), rows = Math.ceil(st.H / b), cell = b / 2;
    const s = new Float32Array(cols * rows * 5);
    for (let y = 0; y < M.height; y++) {
      const ry = Math.min(rows - 1, Math.floor(y / cell)) * cols;
      for (let x = 0; x < M.width; x++) {
        const p = (y * M.width + x) * 4, a = d[p + 3] / 255, q = (ry + Math.min(cols - 1, Math.floor(x / cell))) * 5;
        s[q] += d[p] * a; s[q + 1] += d[p + 1] * a; s[q + 2] += d[p + 2] * a; s[q + 3] += a; s[q + 4]++;
      }
    }
    return { s, cols, rows };
  }
  const cellColor = (s, q, mix = 0) => {
    const a = s[q + 3], k = a > 0 ? 1 / a : 0, g = env.col.goldRGB;
    const r = lerp(s[q] * k, g[0], mix), gg = lerp(s[q + 1] * k, g[1], mix), bb = lerp(s[q + 2] * k, g[2], mix);
    return [r | 0, gg | 0, bb | 0, Math.min(1, Math.pow(a / Math.max(1, s[q + 4]), .6) * 1.3)];
  };
  /* комірки: k = 0 — суцільна мозаїка квадратів, k = 1 — круглі світлодіоди табло */
  function cells(smp, b, k, wave = null, other = null) {
    const { s, cols, rows } = smp;
    if (k > 0) {                                                    // вимкнені світлодіоди — фон табло
      c.fillStyle = env.col.line; c.globalAlpha = k * (env.col.dark ? .9 : .75); c.beginPath();
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const r = b * .3; c.moveTo((i + .5) * b + r, (j + .5) * b); c.arc((i + .5) * b, (j + .5) * b, r, 0, Math.PI * 2); }
      c.fill(); c.globalAlpha = 1;
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const q = (j * cols + i) * 5;
      let src = s, bump = 0;
      if (wave !== null) {                                          // хвиля: до фронту — старий кадр, після — новий
        const pos = (dir > 0 ? i / cols : 1 - i / cols) * .78 + j / rows * .22, local = clamp((wave * 1.3 - pos) / .3);
        bump = Math.sin(Math.PI * local); if (local > .5) src = other;
      }
      const [r, g, bb, a0] = cellColor(src, q, bump * .7), a = Math.max(a0, bump * .4);
      if (a < .025) continue;
      const sz = (k ? b * lerp(1, .72, k) : b + .6) * (1 + bump * .38), rad = sz / 2 * k;
      c.fillStyle = `rgba(${r},${g},${bb},${a.toFixed(3)})`;
      if (rad < .5) c.fillRect((i + .5) * b - sz / 2, (j + .5) * b - sz / 2, sz, sz);
      else { c.beginPath(); c.roundRect((i + .5) * b - sz / 2, (j + .5) * b - sz / 2, sz, sz, rad); c.fill(); }
    }
  }

  function draw(dt = 0) {
    if (!st.W) return;
    const u = tr / T;
    if (prev < 0 || u >= 1) { hud(paint(cur, c, dt), cur, 1); return; }
    c.setTransform(st.D, 0, 0, st.D, 0, 0); c.clearRect(0, 0, st.W, st.H);
    const big = Math.max(9, Math.min(st.W, st.H) / 17);
    let h, who;
    if (u < P1) {                                                   // 1. старий кадр розсипається
      const e = (u / P1) ** 2, b = lerp(1, big, e);
      h = paint(prev, A.c, dt); who = prev;
      if (b < 1.6) c.drawImage(A.k, 0, 0, st.W, st.H); else cells(sample(A.k, b), b, smooth(.2, 1, e));
    } else if (u < P2) {                                            // 2. хвиля перемикає світлодіоди
      h = paint(prev, A.c, dt); const hc = paint(cur, B.c, dt), w = (u - P1) / (P2 - P1);
      if (w > .5) { h = hc; who = cur; } else who = prev;
      cells(sample(A.k, big), big, 1, w, sample(B.k, big).s);
    } else {                                                        // 3. новий кадр збирається
      const e = (1 - (u - P2) / (1 - P2)) ** 2, b = lerp(1, big, e);
      h = paint(cur, B.c, dt); who = cur;
      if (b < 1.6) c.drawImage(B.k, 0, 0, st.W, st.H); else cells(sample(B.k, b), b, smooth(.2, 1, e));
    }
    hud(h, who, u < P1 ? 1 - smooth(0, P1, u) : u < P2 ? 0 : smooth(P2, 1, u));
  }

  const hudLast = {};
  function hud(h, who, op) {
    huds.forEach(el => { el.style.opacity = op; el.style.translate = `0 ${((1 - op) * 3).toFixed(2)}px`; });
    if (!h) return;
    const v = { tl: h.tl ?? '', tr: h.tr ?? '', bl: h.bl ?? '', br: `${h.br ? h.br + ' · ' : ''}${who + 1}/${n}` }, nm = names[who];
    if (hudLast.nm !== nm || hudLast.tl !== v.tl) { const b = document.createElement('b'); b.textContent = nm; hudEl.tl.replaceChildren(b, v.tl ? ' · ' + v.tl : ''); hudLast.nm = nm; hudLast.tl = v.tl; }
    for (const k of ['tr', 'bl', 'br']) if (hudLast[k] !== v[k]) { hudEl[k].textContent = v[k]; hudLast[k] = v[k]; }
  }

  /* прогрес до наступного експоната — волосяна смужка на його клавіші */
  function progress() {
    const nk = auto ? (cur + 1) % n : -1;
    if (nk !== nextKey) { if (nextKey >= 0) keys[nextKey].style.setProperty('--p', 0); nextKey = nk; }
    if (nk >= 0) keys[nk].style.setProperty('--p', Math.min(1, shown / HOLD).toFixed(3));
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
    dir = manual ? (i > cur ? 1 : -1) : 1;
    prev = cur; cur = i; shown = 0;
    tr = playing ? 0 : T; if (tr >= T) prev = -1;
    ex[cur].enter?.(t);
    keys.forEach((k, j) => k.setAttribute('aria-pressed', String(j === cur)));
    progress();
    if (!raf) draw();
  }

  function frame(now) {
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000) || 0); last = now;
    t += dt; acc += dt;
    while (acc >= TICK) { acc -= TICK; const ev = env.m.tick(); ex.forEach(e => e.tick?.(ev, t)); }
    if (tr < T) { tr += dt; if (tr >= T) prev = -1; }
    if (auto) { shown += dt; if (shown >= HOLD) go(cur + 1, false); }
    progress();
    draw(dt);
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf && playing && seen && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  keys.forEach((k, j) => k.addEventListener('click', () => go(j, true)));
  figure.querySelector('.scope__keys').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' || !e.target.matches('[data-view]')) return;
    const j = (cur + (e.key === 'ArrowRight' ? 1 : -1) + n) % n; go(j, true); keys[j].focus();
  });
  autoBtn?.addEventListener('click', () => { setAuto(true); keys[cur].focus(); });
  cv.addEventListener('click', e => {                               // клік по екрану — «торкнутися» експоната
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (ex[cur].poke) ex[cur].poke(x, y, t); else { const ev = env.m.tick(); ex.forEach(v => v.tick?.(ev, t)); }
    if (!raf) draw();
  });
  const PL = L === 'uk' ? ['Пауза', 'Відтворити'] : ['Pause', 'Play'];
  const reflectPlay = () => {
    if (!play) return;
    play.setAttribute('aria-pressed', String(!playing)); play.setAttribute('aria-label', playing ? PL[0] : PL[1]); play.title = play.getAttribute('aria-label');
    play.querySelector('use')?.setAttribute('href', playing ? '#i-pause' : '#i-play');
  };
  play?.addEventListener('click', () => { playing = !playing; reflectPlay(); playing ? start() : (stop(), draw()); });

  theme();
  document.addEventListener('themechange', () => { theme(); draw(); });
  if (REDUCED) { ex.forEach(e => e.still?.()); if (autoBtn) autoBtn.hidden = true; }
  ex[cur].enter?.(0);
  reflectPlay(); progress();
  new ResizeObserver(size).observe(cv);
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; seen ? start() : stop(); }, { rootMargin: '80px' }).observe(figure);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  document.fonts?.ready.then(() => { env.gen++; draw(); });
}
