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
// ноги: 0 — стоїть, 1 — крок урозкид, 2 — ноги разом (проміжна фаза кроку)
const LEGS = [['.......dgg..dgg.......', '.......dd....dd.......'], ['......dgg....dgg......', '.....dd.......dd......'], ['........dggdgg........', '........dd.dd.........']];
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

/* Рекс, що гуляє по краю (верх приладу, лінія над цифрами). Поведінка:
   • ходить між випадковими точками, зупиняється, озирається, кліпає;
   • курсор поруч — зупиняється й дивиться на нього; клік — стрибок (над шапкою) і репліка;
   • згори часом падає світний біт 0/1 — Рекс біжить і з'їдає його (лічильник у браузері: 8 біт = байт);
   • наведення на елемент з data-rex-say (на головній — цифри) — підбігає під нього й коментує;
   • довго ніхто не чіпає — засинає; зміна теми — коментує.
   Без руху (prefers-reduced-motion) — стоїть і лише відповідає на клік. */
export const PERCH_PX = 3;                                    // цілий масштаб: піксель спрайта = 3 px
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* приватний режим */ } } };
export function perch(box) {
  const cv = box.querySelector('canvas'), say = box.querySelector('.perch__say');
  const c = cv.getContext('2d'), acc = box.dataset.acc || null;
  const uk = document.documentElement.lang !== 'en';
  const lines = JSON.parse(box.dataset.lines || '[]');
  const PX = PERCH_PX, CW = GW * PX, CH = GH * PX, HALF = CW / 2;
  cv.width = CW; cv.height = CH; cv.style.width = CW + 'px'; cv.style.height = CH + 'px';
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const maxX = () => Math.max(0, box.clientWidth - CW);
  const clamp = v => Math.min(maxX(), Math.max(0, v));
  let x = clamp(+(box.dataset.start || 24)), target = x, dir = 1, walk = 0, jump = 0, vy = 0, speed = 30;
  let blinkT = 2 + Math.random() * 2, blinking = 0, pause = 1.2, curious = 0, raf = 0, last = 0, li = 0, sayT = 0, seen = false;
  let idle = 0, asleep = false, goal = null, bit = null, bitT = 9 + Math.random() * 8, bits = +store.get('ki-bits') || 0;
  const zz = document.createElement('span'); zz.className = 'perch__z'; zz.textContent = 'z z z'; box.append(zz);

  function speak(text, sec = 2.8) { say.textContent = text; say.classList.add('on'); sayT = sec; render(); }
  function wake() { idle = 0; if (asleep) { asleep = false; zz.classList.remove('on'); pause = .6; } }
  function goTo(px, run, then) { target = clamp(px - HALF); dir = target > x ? 1 : -1; speed = run ? 95 : 30; pause = 0; curious = 0; goal = then || null; }

  function render() {
    c.clearRect(0, 0, CW, CH);
    const moving = pause <= 0 && curious <= 0 && !asleep && Math.abs(target - x) > .5;
    const legs = jump < 0 ? 1 : moving ? (Math.floor(walk) % 2 ? 1 : 2) : 0;
    drawGrid(c, rexFrame({ legs, blink: asleep || blinking > 0, acc, flip: dir < 0 }), PX);
    const px = Math.round(x);                                  // ціла позиція — піксель-арт без розмиття
    cv.style.transform = `translate(${px}px, ${Math.round(jump)}px)`;
    cv.style.zIndex = jump < 0 ? '70' : '';                   // у стрибку — над шапкою; на місці — під нею
    zz.style.left = px + (dir > 0 ? 62 : 6) + 'px';
    if (say.classList.contains('on')) {
      say.style.left = Math.min(Math.max(0, px - 10), Math.max(0, box.clientWidth - say.offsetWidth)) + 'px';
      say.style.transform = `translateY(${Math.round(jump)}px)`;      // репліка завжди над головою — і в стрибку
      say.style.setProperty('--tail', Math.min(Math.max(10, px - parseFloat(say.style.left) + (dir > 0 ? 50 : 26)), say.offsetWidth - 16) + 'px');
    }
  }
  function dropBit() {
    const el = document.createElement('i'); el.className = 'perch__bit'; el.textContent = Math.random() < .5 ? '0' : '1';
    const bx = 20 + Math.random() * Math.max(0, box.clientWidth - 40);
    el.style.left = bx + 'px'; box.append(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('down')));
    bit = { el, x: bx };
    setTimeout(() => { if (bit?.el === el) { wake(); goTo(bx, true, eat); } }, 700);
  }
  function eat() {
    if (!bit) return;
    bit.el.classList.add('eaten'); const el = bit.el; setTimeout(() => el.remove(), 500); bit = null;
    bits++; store.set('ki-bits', bits);
    const n = bits % 8;
    if (!REDUCED) { vy = -170; jump = -.01; }
    speak(n === 0 ? (uk ? `+1 байт! Разом ${bits / 8}` : `+1 byte! ${bits / 8} total`) : (uk ? `+1 біт · ${n}/8` : `+1 bit · ${n}/8`), 2.2);
  }
  function step(dt) {
    idle += dt;
    if (!asleep && idle > 28 && !bit && !goal) { asleep = true; zz.classList.add('on'); pause = 1e9; }
    if (asleep) return;
    if (curious > 0) curious -= dt;
    else if (pause > 0) {
      pause -= dt;
      if (pause <= 0) { goTo(Math.random() * box.clientWidth, false); if (Math.abs(target - x) < 40) target = clamp(x + (x > maxX() / 2 ? -90 : 90)); dir = target > x ? 1 : -1; }
    } else {
      const d = target - x, v = speed * dt;
      if (Math.abs(d) <= v) {
        x = target; pause = 2.4 + Math.random() * 4.5; speed = 30;
        if (goal) { const g = goal; goal = null; g(); } else if (Math.random() < .35) dir *= -1;   // інколи озирається
      } else { x += Math.sign(d) * v; walk += dt * (speed > 40 ? 12 : 6.5); }
    }
    if (jump < 0 || vy) { vy += 1100 * dt; jump = Math.min(0, jump + vy * dt); if (jump === 0) vy = 0; }
    blinkT -= dt; if (blinkT <= 0) { blinking = .13; blinkT = 2.2 + Math.random() * 3.5; }
    if (blinking > 0) blinking -= dt;
    if (sayT > 0) { sayT -= dt; if (sayT <= 0) say.classList.remove('on'); }
    bitT -= dt; if (bitT <= 0 && !bit) { dropBit(); bitT = 14 + Math.random() * 16; }
  }
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    step(dt); render(); raf = requestAnimationFrame(loop);
  }
  const start = () => { if (!raf && !REDUCED) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  cv.addEventListener('click', () => {
    const was = asleep; wake();
    if (!REDUCED && jump === 0) { vy = -480; jump = -.01; }   // ≈105 px угору — у стрибку перекриває шапку
    if (was) speak(uk ? 'А? Я не спав!' : 'Huh? I wasn’t asleep!');
    else if (lines.length) speak(lines[li++ % lines.length]);
    render();
  });
  // курсор поруч — зупиняється й дивиться на нього; будить
  addEventListener('pointermove', e => {
    if (!fine.matches || !raf) return;
    const r = cv.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (Math.abs(e.clientX - cx) < 160 && Math.abs(e.clientY - cy) < 110) { wake(); if (!goal && !bit) { dir = e.clientX >= cx ? 1 : -1; curious = .9; } }
  }, { passive: true });
  // наведення на ціль із data-rex-say — підбігає під неї й коментує
  const scope = box.closest('[data-rex-scope]') || box.parentElement;
  scope.querySelectorAll('[data-rex-say]').forEach(el => el.addEventListener('pointerenter', () => {
    if (!raf || bit) return;
    wake();
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    goTo(r.left + Math.min(r.width / 2, 70) - b.left, true, () => { dir = 1; speak(el.dataset.rexSay, 2.6); });
  }));
  document.addEventListener('themechange', () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    if (seen) { wake(); speak(dark ? (uk ? 'Нічний режим: час кодити' : 'Night mode: time to code') : (uk ? 'Доброго ранку!' : 'Good morning!'), 2.2); }
  });
  new ResizeObserver(() => { x = clamp(x); target = clamp(target); render(); }).observe(box);
  render();
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
