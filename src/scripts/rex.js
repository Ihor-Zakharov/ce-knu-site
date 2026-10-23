// КІ-Рекс — піксельний маскот. Базовий спрайт 22×18 з UI-кіту + аксесуари розділів
// (шапочка випускника, лупа, рюкзак, краватка, книга, пробірка, ноутбук, указка, окуляри).
// Малюється на <canvas>; без JS канвасів просто немає — сторінка від цього не залежить.
import { REDUCED } from './spring.js';

const REX = [
  '.........dddddddd.....', '........dggggggggd....', '........dggwwkggggd...', '........dggwkkgggggd..',
  '........dgggggggggggd.', '........dgggggggggggd.', '........dggggggwwwwwd.', '........dgggggggdwdwd.',
  '..d.....dggggggggdd...', '..dd...ddggggggd......', '..dgd.dgnnnnnnndgd....', '..dggddgnnyyynndgd....',
  '...dggggnnyynnnd......', '....dgggnnnyynnd......', '.....dggbbbbbbd.......', '......dggbbbbd........',
];
const LEGS = [['.......dgg..dgg.......', '.......dd....dd.......'], ['........dgg.dg........', '........dd..dd........'], ['.......dgg...dg.......', '.......dd....dd.......']];
const BLINK = { 2: '........dgggggggggd...', 3: '........dggdddgggggd..' };
const PAL = { d: '#1E3416', g: '#5E9B3A', w: '#FFFFFF', k: '#111111', n: '#23305A', y: '#D8B56E', b: '#E9D9A6',
  W: '#5E1424', r: '#A4202A', s: '#B9B3A8', c: '#CFE6F2', G: '#7FD36B', K: '#2A2420', o: '#E6D3A3' };

// аксесуар: рядки піксель-арту й зсув відносно спрайта; back — малюється за тілом
const ACC = {
  cap: { x: 6, y: -3, px: ['...oWWWWWo...', 'WWWWWWWWWWWWy', 'oooWWWWWWWooy', '...WWWWWWW..y', '............y'] },
  glasses: { x: 10, y: 1, px: ['.kkk..', 'k...kk', 'k...k.', '.kkk..'] },
  magnifier: { x: 19, y: 6, px: ['..sss..', '.scccs.', 'sccwccs', 'scccccs', '.scccs.', '..sss..', '.WW....', 'WW.....'] },
  backpack: { x: 2, y: 9, back: true, px: ['.WWW.', 'WWWWW', 'WyyWW', 'WWWWW', 'WWWWW', '.WWW.'] },
  tie: { x: 10, y: 10, px: ['w..w', '.rr.', '.rr.', '.rr.', '..r.'] },
  book: { x: 14, y: 10, px: ['WWWWWW', 'Wooooy', 'Wooooy', 'WWWWWW'] },
  tube: { x: 18, y: 3, px: ['.c.', '...', 'c.c', 's.s', 's.s', 'sGs', 'sGs', '.s.'] },
  laptop: { x: 14, y: 10, px: ['.KKKKKK', '.KKyKKK', '.KKKKKK', 'ssssssss'] },
  pointer: { x: 15, y: 4, px: ['......y', '.....y.', '....y..', '...y...', '..y....', '.y.....', 'K......'] },
  headset: { x: 9, y: -1, px: ['..kkkkkk..', '.k......k.', 'k........k', 'K........K', 'K.........'] },
};

const OX = 3, OY = 5, GW = 30, GH = 24;   // поле з запасом під аксесуари
export function rexFrame({ legs = 0, blink = false, acc = null, flip = false } = {}) {
  const grid = Array.from({ length: GH }, () => Array(GW).fill(null));
  const put = (x, y, ch) => { const gx = flip ? GW - 1 - (x + OX) : x + OX, gy = y + OY; if (PAL[ch] && gy >= 0 && gy < GH && gx >= 0 && gx < GW) grid[gy][gx] = PAL[ch]; };
  const a = acc && ACC[acc];
  const layer = l => l.px.forEach((row, yy) => [...row].forEach((ch, xx) => put(l.x + xx, l.y + yy, ch)));
  if (a?.back) layer(a);
  [...REX, ...LEGS[legs]].forEach((row, y) => [...(blink && BLINK[y] ? BLINK[y] : row)].forEach((ch, x) => put(x, y, ch)));
  if (a && !a.back) layer(a);
  return grid;
}
export function drawGrid(c, grid, px, ox = 0, oy = 0) {
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const col = grid[y][x]; if (col) { c.fillStyle = col; c.fillRect(ox + x * px, oy + y * px, px, px); } }
}
export const REX_GRID = { w: GW, h: GH };

/* статичний Рекс у будь-якому <canvas data-rex="аксесуар"> */
export function paintStatic(cv) {
  const px = 3, c = cv.getContext('2d');
  cv.width = GW * px; cv.height = GH * px;
  drawGrid(c, rexFrame({ acc: cv.dataset.rex || null }), px);
}

/* Рекс, що гуляє по верхньому краю приладу: ходить, кліпає, на клік підстрибує й каже репліку */
export function perch(box) {
  const cv = box.querySelector('canvas'), say = box.querySelector('.perch__say');
  const c = cv.getContext('2d'), acc = box.dataset.acc || null;
  const lines = JSON.parse(box.dataset.lines || '[]');
  const PX = 3, CW = GW * PX, CH = GH * PX;
  cv.width = CW; cv.height = CH;
  let x = 24, target = 24, dir = 1, walk = 0, jump = 0, vy = 0, blinkT = 2.5, blinking = 0, pause = 1.5, raf = 0, last = 0, li = 0, sayT = 0;
  const maxX = () => Math.max(0, box.clientWidth - CW + 6);
  function render() {
    c.clearRect(0, 0, CW, CH);
    const moving = Math.abs(target - x) > 1 && !pause;
    const legs = jump < 0 ? 0 : moving ? (Math.floor(walk) % 2 ? 1 : 2) : 0;
    drawGrid(c, rexFrame({ legs, blink: blinking > 0, acc, flip: dir < 0 }), PX);
    cv.style.transform = `translate(${x.toFixed(1)}px, ${jump.toFixed(1)}px)`;
    say.style.left = Math.min(x, Math.max(0, box.clientWidth - say.offsetWidth)) + 'px';
  }
  function step(dt) {
    if (pause > 0) { pause -= dt; if (pause <= 0) { target = 12 + Math.random() * (maxX() - 12); dir = target > x ? 1 : -1; } }
    else {
      const d = target - x, v = 34 * dt;
      if (Math.abs(d) <= v) { x = target; pause = 2.5 + Math.random() * 4; } else { x += Math.sign(d) * v; walk += dt * 7; }
    }
    if (jump < 0 || vy) { vy += 900 * dt; jump = Math.min(0, jump + vy * dt); if (jump === 0) vy = 0; }
    blinkT -= dt; if (blinkT <= 0) { blinking = .14; blinkT = 2.5 + Math.random() * 3; }
    if (blinking > 0) blinking -= dt;
    if (sayT > 0) { sayT -= dt; if (sayT <= 0) say.classList.remove('on'); }
  }
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    step(dt); render(); raf = requestAnimationFrame(loop);
  }
  const start = () => { if (!raf && !REDUCED) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  cv.addEventListener('click', () => {
    if (!REDUCED) { vy = -260; jump = -.01; }
    if (lines.length) { say.textContent = lines[li++ % lines.length]; say.classList.add('on'); sayT = 2.6; }
    if (REDUCED) render();
  });
  cv.setAttribute('role', 'img');
  render();
  let seen = false;
  const upd = () => (seen && !document.hidden ? start() : stop());
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; upd(); }).observe(box);
  document.addEventListener('visibilitychange', upd);
}

/* раннер для сторінки 404 — з кіту: фіксований крок 1/120 с, «час койота», буфер стрибка */
export function runner(el, txt) {
  const cv = el.querySelector('canvas'), c = cv.getContext('2d'), live = el.querySelector('[data-runner-live]');
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* приватний режим */ } } };
  const OB = [
    { w: 5, h: 7, px: ['gg.gg', '.ygy.', '.yry.', '.ygy.', '.yry.', '.ygy.', 'gg.gg'] },
    { w: 5, h: 7, px: ['..g..', '..g..', 'ggggg', '.....', 'ggggg', '..g..', '..g..'] },
    { w: 5, h: 5, px: ['k...k', '.kkk.', 'krrrk', 'rkrkr', '.kkk.'], fly: true },
  ];
  const OPAL = { g: '#8C8478', y: '#D8B56E', r: '#A4202A', k: '#2A2420' };
  let W, H, D, P, ground, st, best = +store.get('ki-best') || 0, raf = 0, acc = 0, last = 0;
  const STEP = 1 / 120;
  const reset = () => ({ mode: 'idle', y: 0, vy: 0, onGround: true, coyote: 0, buffer: 0, holding: false, t: 0, speed: 0, obs: [], next: .9, score: 0, frame: 0, dust: [] });
  st = reset();
  const size = () => { const r = el.getBoundingClientRect(); D = devicePixelRatio || 1; W = r.width; H = r.height; cv.width = Math.round(W * D); cv.height = Math.round(H * D); c.setTransform(D, 0, 0, D, 0, 0); P = Math.max(2, Math.floor(H / 56)); ground = H - 30; draw(); };
  const G = () => P * 340, JUMP = () => P * 92, MAXF = () => P * 150;
  function press() {
    if (st.mode !== 'run') { st = reset(); st.mode = 'run'; st.speed = P * 58; live.textContent = txt.start; kick(); return; }
    st.buffer = .11; st.holding = true;
  }
  // коротке натискання — стрибок на повній гравітації (≈12 пікселів спрайта, вище за будь-яку перешкоду);
  // утримання зменшує гравітацію на підйомі — до ≈22 пікселів
  const release = () => { st.holding = false; };
  function update(dt) {
    if (st.mode !== 'run') return;
    st.t += dt; st.speed = Math.min(P * 132, P * 58 + st.t * P * 1.4); st.score += dt * st.speed / P / 6;
    st.buffer = Math.max(0, st.buffer - dt); st.coyote = st.onGround ? .09 : Math.max(0, st.coyote - dt);
    if (st.buffer > 0 && st.coyote > 0) { st.vy = -JUMP(); st.onGround = false; st.coyote = 0; st.buffer = 0; }
    st.vy = Math.min(MAXF(), st.vy + G() * (st.vy < 0 && st.holding ? .55 : 1) * dt);
    st.y += st.vy * dt;
    if (st.y >= 0) { if (!st.onGround && st.vy > P * 40) for (let i = 0; i < 5; i++) st.dust.push({ x: 40 + 9 * P, y: ground, vx: (Math.random() - .5) * P * 40, vy: -Math.random() * P * 30, l: .35 }); st.y = 0; st.vy = 0; st.onGround = true; }
    else st.onGround = false;
    st.next -= dt;
    if (st.next <= 0) { const k = st.t < 8 ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3); st.obs.push({ k, x: W + 10 }); const gap = 1.05 - Math.min(.45, st.t * .008); st.next = gap + Math.random() * .7; }
    st.obs.forEach(o => { o.x -= st.speed * dt; }); st.obs = st.obs.filter(o => o.x > -10 * P);
    st.dust.forEach(p => { p.x += p.vx * dt - st.speed * dt * .5; p.y += p.vy * dt; p.vy += G() * .3 * dt; p.l -= dt; }); st.dust = st.dust.filter(p => p.l > 0);
    const rx = 40 + (6 + OX) * P, ry = ground - 17 * P + st.y, rw = 9 * P, rh = 15 * P;
    for (const o of st.obs) { const ob = OB[o.k]; const oy = ob.fly ? ground - 16 * P : ground - ob.h * P; if (o.x + P < rx + rw && o.x + (ob.w - 1) * P > rx && oy + P < ry + rh && oy + (ob.h - 1) * P > ry) { st.mode = 'over'; best = Math.max(best, Math.floor(st.score)); store.set('ki-best', best); live.textContent = txt.over(Math.floor(st.score), best); } }
    st.frame += dt * st.speed / (P * 9);
  }
  function draw() {
    if (!W) return;
    c.clearRect(0, 0, W, H);
    const line = css('--line-strong'), ink3 = css('--ink-3');
    c.fillStyle = line; c.fillRect(0, ground, W, 1);
    const off = (st.t * st.speed) % (P * 14); c.globalAlpha = .6;
    for (let x = -off; x < W; x += P * 14) c.fillRect(x, ground + P * 2, P * 3, 1);
    c.globalAlpha = 1;
    for (const o of st.obs) { const ob = OB[o.k], oy = ob.fly ? ground - 16 * P + Math.sin(st.t * 8 + o.x / 30) * P : ground - ob.h * P; ob.px.forEach((row, yy) => [...row].forEach((ch, x) => { if (OPAL[ch]) { c.fillStyle = OPAL[ch]; c.fillRect(Math.round(o.x + x * P), Math.round(oy + yy * P), P, P); } })); }
    c.fillStyle = ink3; st.dust.forEach(p => { c.globalAlpha = Math.max(0, p.l * 2.4); c.fillRect(p.x, p.y, P * .8, P * .8); }); c.globalAlpha = 1;
    const f = st.mode === 'run' ? (st.onGround ? (Math.floor(st.frame) % 2 ? 1 : 2) : 0) : 0;
    drawGrid(c, rexFrame({ legs: f, acc: 'headset' }), P, 40, Math.round(ground - (18 + OY) * P + st.y));
    c.font = `500 ${Math.max(11, P * 4)}px "Signal Mono", monospace`; c.fillStyle = ink3; c.textAlign = 'right';
    const hx = n => '0x' + Math.floor(n).toString(16).toUpperCase().padStart(4, '0');
    c.fillText(`HI ${hx(best)}   ${hx(st.score)}`, W - 16, 26);
    c.textAlign = 'center'; c.fillStyle = css('--ink-2');
    if (st.mode === 'idle') c.fillText(txt.idle, W / 2, H / 2 - 8);
    if (st.mode === 'over') c.fillText(txt.again, W / 2, H / 2 - 8);
    if (st.mode === 'paused') c.fillText(txt.paused, W / 2, H / 2 - 8);
  }
  function loop(now) {
    raf = 0; acc += Math.min(.1, (now - last) / 1000); last = now;
    let n = 0; while (acc >= STEP && n++ < 8) { update(STEP); acc -= STEP; }
    draw(); if (st.mode === 'run') raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf) { last = performance.now(); acc = 0; raf = requestAnimationFrame(loop); } }
  const pause = () => { if (st.mode === 'run') { st.mode = 'paused'; draw(); } };
  const resume = () => { if (st.mode === 'paused') { st.mode = 'run'; kick(); } };
  const jumpKey = e => e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW';
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.focus({ preventScroll: true }); st.mode === 'paused' ? resume() : press(); });
  addEventListener('pointerup', release); addEventListener('pointercancel', release);
  el.addEventListener('keydown', e => {
    if (jumpKey(e)) { e.preventDefault(); if (e.repeat) return; st.mode === 'paused' ? resume() : press(); }
    if (e.code === 'KeyP' || e.key === 'Escape') { st.mode === 'paused' ? resume() : pause(); }
  });
  el.addEventListener('keyup', e => { if (jumpKey(e)) release(); });
  el.addEventListener('blur', pause); document.addEventListener('visibilitychange', () => document.hidden && pause());
  new IntersectionObserver(([e]) => { if (!e.isIntersecting) pause(); }).observe(el);
  // розмір міряємо після появи й на кожну зміну — канвас не розмивається під час анімації входу
  new ResizeObserver(size).observe(el); document.addEventListener('themechange', draw);
  document.fonts?.ready.then(size);
}
