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
// ноги: 0 — стоїть, 1 — крок урозкид, 2 — ноги разом (проміжна фаза кроку);
// для гри: 3 — відштовхнувся (ноги позаду), 4 — падає (ноги винесені вперед)
const LEGS = [['.......dgg..dgg.......', '.......dd....dd.......'], ['......dgg....dgg......', '.....dd.......dd......'], ['........dggdgg........', '........dd.dd.........'],
  ['......dgg..dgg........', '.....dd...dd..........'], ['........dgg..dgg......', '..........dd...dd.....']];
const BLINK = { 2: '........dgggggggggd...', 3: '........dggdddgggggd..' };
// хвіст на пів кроку нижче — у бігу чергується зі звичайним, і хвіст «гуляє»
const TAIL = { 8: '........dggggggggdd...', 9: '.......ddggggggd......', 10: '.dd...dgnnnnnnndgd....', 11: '.dggdddgnnyyynndgd....', 12: '..ddggggnnyynnnd......' };
// присідання (гра на 404): голова опущена й винесена вперед, спина горизонтальна, хвіст витягнутий —
// силует 26×11 замість 22×18. Рядки йдуть від 7-го рядка спрайта, x — зсув лівого краю; legs — два кадри кроку
const DUCK = { x: -2, y: 7, px: [
  '...............dddddddd.....', '..............dggggggggd....', '........dddddddggwwkggggd...', 'ddddddddnnnnnndggwkkgggggd..',
  'dgggggggnnnnnndgggggggggggd.', '.ddgggggnnyynndgggggggggggd.', '...dddggnnnyyndggggggwwwwwd.', '......dgbbbbbbdgggggggdwdwd.',
  '.......dgbbbbddggggggggdd...',
], legs: [['......dgg...dgg.............', '.....dd......dd.............'], ['........dggdgg..............', '........dd.dd...............']] };
const PAL = { d: '#1E3416', g: '#5E9B3A', w: '#FFFFFF', k: '#111111', n: '#23305A', y: '#D8B56E', b: '#E9D9A6',
  W: '#5E1424', r: '#A4202A', s: '#B9B3A8', c: '#CFE6F2', G: '#7FD36B', K: '#2A2420', o: '#E6D3A3', p: '#E88FAB', O: '#D97A2B', h: '#FF5FA2' };

// аксесуар: рядки піксель-арту й зсув відносно спрайта; back — малюється за тілом;
// duck — те саме для пози присідання (голова там на 4 пікселі правіше й на 7 нижче)
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
  headset: { x: 9, y: -1, px: ['..kkkkkk..', '.k......k.', 'k........k', 'K........K', 'K.........'], duck: { x: 13, y: 6 } },
  // листоноша: кашкет з козирком і кокардою, сумка через плече з листом, конверт у лапі
  postcap: { x: 9, y: -3, px: ['...nnnnnn...', '..nnnnynnnn.', '.nnnnnnnnnnkk'] },
  bag: { x: 3, y: 8, px: ['.........y', '........y.', '.......y..', 'WWWWWWy...', 'Wwwwww....', 'WwyywW....', 'WWWWWW....'] },
  letter: { x: 16, y: 9, px: ['ooooo', 'onoon', 'ooWoo', 'ooooo'] },   // конверт: клапан «V» і сургучна печатка
  // сезонні, для гри на 404: шарф (два кадри — кінець майорить), квітка за вухом, темні окуляри, кленовий листок
  scarf: { x: 3, y: 7, px: ['or...........', '..rW.........', '....WrrWrrWrr', '.....rrWrrWr.'], duck: { x: 5, y: 7, px: ['or.....', '..rW...', '....WrW', '.....rW', '.....Wr', '.....rW'] } },
  scarf2: { x: 3, y: 9, px: ['....WrrWrrWrr', '..rW.rrWrrWr.', 'or...........'], duck: { x: 5, y: 9, px: ['..rWWrW', 'or...rW', '.....Wr', '.....rW'] } },
  flower: { x: 6, y: 0, px: ['.p.', 'pyp', '.p.'], duck: { x: 10, y: 7 } },
  shades: { x: 10, y: 2, px: ['KKKKKKKK', 'KsKKK...', '.KsK....'], duck: { x: 14, y: 9 } },
  leaf: { x: 11, y: -5, px: ['....O', '.OOOO', 'OOyO.', 'OyOO.', 'WOO..'], duck: { x: 5, y: 6, px: ['.OOO..', 'OyyyOW', '.OOO..'] } },
  // пора сакури в грі — образ «альтушки», рожеве з чорним: гарнітура з котячими вушками (замість звичайної), сердечко-рум'янець,
  // чорний чокер із сердечком, смугаста манжета на лапі, бантик на хвості, іскорка біля ока; socks — смугасті рожево-чорні гетри
  // (це не малюнок, а перефарбування ніг: вони рухаються, тож гетри мають рухатися разом із ними)
  catset: { x: 9, y: -3, px: ['..h....h..', '.hph..hph.', '..hhhhhh..', '.h......h.', 'h........h', 'h........h', 'k.........'], duck: { x: 13, y: 4 } },
  blush: { x: 13, y: 4, px: ['h.h', '.h.'], duck: { x: 17, y: 11 } },
  choker: { x: 9, y: 8, px: ['kkkkkkk', '...h...'], duck: { x: 11, y: 10, px: ['.k', '.k', 'hk', '.k'] } },
  cuff: { x: 15, y: 10, px: ['hkh', 'khk'], duck: { px: [] } },
  bow: { x: 0, y: 7, px: ['h.h', 'hkh', 'h.h'], duck: { x: -2, y: 8 } },
  sparkle: { x: 15, y: 2, px: ['w'], duck: { x: 19, y: 9 } },
  socks: { x: 0, y: 0, px: [], socks: 'hk' },
};

const OX = 3, OY = 5, GW = 30, GH = 24;   // поле з запасом під аксесуари
// duck — поза присідання, tail — хвіст нижче (обидва лише для гри; типові значення дають той самий спрайт, що й раніше)
export function rexFrame({ legs = 0, blink = false, acc = null, flip = false, duck = false, tail = false } = {}) {
  const accs = (Array.isArray(acc) ? acc : String(acc || '').split('+')).map(a => ACC[a]).filter(Boolean).map(a => (duck ? { ...a, ...a.duck } : a));
  const grid = Array.from({ length: GH }, () => Array(GW).fill(null));
  const put = (x, y, ch) => { const gx = flip ? GW - 1 - (x + OX) : x + OX, gy = y + OY; if (PAL[ch] && gy >= 0 && gy < GH && gx >= 0 && gx < GW) grid[gy][gx] = PAL[ch]; };
  const layer = l => l.px.forEach((row, yy) => [...row].forEach((ch, xx) => put(l.x + xx, l.y + yy, ch)));
  // гетри: якщо серед аксесуарів є socks, пікселі ніг (рядки 16–17) фарбуються у смужку двома його кольорами
  const socks = accs.find(a => a.socks), leg = (ch, x, y) => (socks && y >= 16 && ch !== '.' ? socks.socks[(x + y) & 1] : ch);
  accs.filter(a => a.back).forEach(layer);
  if (duck) { layer(DUCK); DUCK.legs[legs % 2].forEach((row, yy) => [...row].forEach((ch, xx) => put(DUCK.x + xx, 16 + yy, leg(ch, xx, 16 + yy)))); }
  else [...REX, ...LEGS[legs]].forEach((row, y) => [...((blink && BLINK[y]) || (tail && TAIL[y]) || row)].forEach((ch, x) => put(x, y, leg(ch, x, y))));
  accs.filter(a => !a.back).forEach(layer);
  return grid;
}
export function drawGrid(c, grid, px, ox = 0, oy = 0) {
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const col = grid[y][x]; if (col) { c.fillStyle = col; c.fillRect(ox + x * px, oy + y * px, px, px); } }
}
export const REX_GRID = { w: GW, h: GH, ox: OX, oy: OY };   // ox, oy — де в полі лежить лівий верхній піксель самого спрайта

/* статичний Рекс у будь-якому <canvas data-rex="аксесуар"> */
export function paintStatic(cv) {
  const px = 3, c = cv.getContext('2d');
  cv.width = GW * px; cv.height = GH * px;
  drawGrid(c, rexFrame({ acc: cv.dataset.rex || null }), px);
}

/* Рекс, що гуляє по краю (верх приладу, лінія над цифрами). Поведінка:
   • ходить між випадковими точками, зупиняється, озирається, кліпає;
   • курсор поруч — зупиняється й дивиться на нього; клік — стрибок (над шапкою) і репліка;
   • лише там, де data-bits (головна): згори часом падає світний біт 0/1 — Рекс біжить, з'їдає його й лічить «n/8»
     (лічильник у браузері; після 8/8 — з нуля, байти не накопичує);
   • часті кліки поспіль — «брязкіт контактів», півтори секунди Рекс не реагує;
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
  let idle = 0, asleep = false, goal = null, bit = null, bitT = 9 + Math.random() * 8, bits = (+store.get('ki-bits') || 0) % 8;
  let hello = box.dataset.hello || '', helloT = 2.4;           // привітання після появи (поява Рекса — 0,9–1,9 с): рушає на 2-й с, говорить на 2,4-й
  if (hello) pause = 2;
  let side = '', drop = 0, failed = false, sayTimer = 0;       // де репліка: '' — над головою, 'r' / 'l' — збоку; drop — зсув донизу
  const feeds = 'bits' in box.dataset;                          // біти падають лише тут (головна)
  let clicks = [], deaf = 0;                                     // часті кліки поспіль — «брязкіт контактів»
  const stick = box.closest('.page__inst'), hd = document.querySelector('.hd');
  const zz = document.createElement('span'); zz.className = 'perch__z'; zz.textContent = 'z z z'; box.append(zz);

  function speak(text, sec = 2.8) {
    say.textContent = text; sayT = sec; pick(); say.classList.add('on'); render();
    if (REDUCED) { clearTimeout(sayTimer); sayTimer = setTimeout(() => say.classList.remove('on'), sec * 1000); }   // без руху цикл не йде — репліку прибирає таймер
  }
  const headerLimit = () => Math.max(0, hd ? hd.getBoundingClientRect().bottom : 0) + 6;
  /* репліка не ховається під липку шапку й не закриває сусідній вміст (кнопки, посилання, текст): над головою, якщо там
     вільно; інакше — збоку від Рекса на рівні голови (праворуч або ліворуч, де вміщається); якщо й збоку тісно — під шапку */
  const SIDE_R = 84, SIDE_L = 6;                                // відступи від лівого краю полотна до репліки збоку
  const CONTENT = 'a, button, input, select, textarea, label, h1, h2, h3, h4, p, li, img, figure';
  function covers(l, t, w, h) {                                 // чи ляже прямокутник на чужий вміст (перевірка в п'яти точках)
    for (const [fx, fy] of [[.08, .25], [.5, .5], [.92, .25], [.08, .8], [.92, .8]]) {
      const px = l + w * fx, py = t + h * fy;
      if (px < 0 || py < 0 || px > innerWidth || py > innerHeight) continue;
      const el = document.elementsFromPoint(px, py).find(e => !box.contains(e));
      if (el && !hd?.contains(el) && el.closest(CONTENT)) return true;
    }
    return false;
  }
  function pick() {
    say.classList.remove('is-r', 'is-l'); say.style.maxWidth = ''; side = ''; drop = 0;
    const w = say.offsetWidth, h = say.offsetHeight, b = box.getBoundingClientRect();
    const limit = headerLimit(), upTop = b.bottom - 66 - h, upLeft = b.left + Math.min(Math.max(0, Math.round(x) - 10), Math.max(0, box.clientWidth - w));
    if (b.bottom - 40 < limit) return;                           // сам Рекс уже під шапкою (сторінку гортають)
    if (upTop >= limit && !covers(upLeft, upTop, w, h)) return;  // над головою вільно
    // збоку можна в 2–3 рядки: 104 px вистачає з одного боку Рекса в будь-якому місці приладу завширшки від 300 px
    const px = Math.round(x), roomR = box.clientWidth - px - SIDE_R, roomL = px + SIDE_L, need = Math.min(w, 104);
    side = roomR >= w ? 'r' : roomL >= w ? 'l' : Math.max(roomR, roomL) >= need ? (roomR >= roomL ? 'r' : 'l') : '';
    if (side) {
      say.classList.add('is-' + side);
      const room = side === 'r' ? roomR : roomL;
      if (room < w) say.style.maxWidth = room + 'px';
    }
    drop = Math.max(0, Math.round(limit - (b.bottom - (side ? 24 : 66) - say.offsetHeight)));   // і все одно не вище за шапку
  }
  function wake() { idle = 0; if (asleep) { asleep = false; zz.classList.remove('on'); pause = .6; } }
  function goTo(px, run, then) { target = clamp(px - HALF); dir = target > x ? 1 : -1; speed = run ? 95 : 30; pause = 0; curious = 0; goal = then || null; }

  function render() {
    c.clearRect(0, 0, CW, CH);
    const moving = pause <= 0 && curious <= 0 && !asleep && !(side && sayT > 0) && Math.abs(target - x) > .5;
    const legs = jump < 0 ? 1 : moving ? (Math.floor(walk) % 2 ? 1 : 2) : 0;
    drawGrid(c, rexFrame({ legs, blink: asleep || blinking > 0, acc, flip: dir < 0 }), PX);
    const px = Math.round(x);                                  // ціла позиція — піксель-арт без розмиття
    cv.style.transform = `translate(${px}px, ${Math.round(jump)}px)`;
    cv.style.zIndex = jump < 0 ? '70' : '';                   // у стрибку — над шапкою; на місці — під нею
    if (stick) stick.style.zIndex = jump < 0 ? '61' : '';     // липка колонка має власний шар — піднімаємо й її
    zz.style.left = px + (dir > 0 ? 62 : 6) + 'px';
    if (say.classList.contains('on')) {
      say.style.left = (side === 'r' ? px + SIDE_R : side === 'l' ? px + SIDE_L - say.offsetWidth : Math.min(Math.max(0, px - 10), Math.max(0, box.clientWidth - say.offsetWidth))) + 'px';
      // у стрибку репліка летить разом із Рексом над шапкою, але не вище 8 px від верху вікна;
      // на місці — звичайний шар сторінки, що прокручується разом із Рексом
      const jumping = jump < 0;
      const top = say.getBoundingClientRect().top - (parseFloat(say.dataset.dy) || 0);
      const dy = jumping ? Math.max(Math.round(jump) + drop, 8 - top) : drop;
      say.dataset.dy = dy; say.style.transform = dy ? `translateY(${dy}px)` : '';
      say.style.zIndex = jumping ? '71' : '';
      // сторінку гортають, і репліка дійшла до шапки — гасне, а не ховається під неї
      if (!jumping && sayT > 0 && top + dy < headerLimit() - 8) { say.classList.remove('on'); sayT = 0; }
      if (!side) say.style.setProperty('--tail', Math.min(Math.max(10, px - parseFloat(say.style.left) + (dir > 0 ? 50 : 26)), say.offsetWidth - 16) + 'px');
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
    bits++;
    if (!REDUCED) { vy = -170; jump = -.01; }
    speak(uk ? `+1 біт · ${bits}/8` : `+1 bit · ${bits}/8`, 2.2);
    if (bits >= 8) bits = 0;                                     // байт зібрано — лічильник з нуля
    store.set('ki-bits', bits);
  }
  function step(dt) {
    idle += dt;
    if (!asleep && idle > 28 && !bit && !goal) { asleep = true; zz.classList.add('on'); pause = 1e9; }
    if (asleep) return;
    if (hello && (helloT -= dt) <= 0) { if (sayT <= 0) speak(hello, 3.2); hello = ''; }
    if (curious > 0) curious -= dt;
    else if (side && sayT > 0) { /* говорить збоку — стоїть на місці, репліка не їде */ }
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
    if (feeds) { bitT -= dt; if (bitT <= 0 && !bit) { dropBit(); bitT = 14 + Math.random() * 16; } }
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);                         // наступний кадр — першим: збій не зупиняє Рекса
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000) || 0); last = now;
    try { step(dt); render(); } catch (e) { if (!failed) { failed = true; console.error(e); } }
  }
  const start = () => { if (!raf && !REDUCED) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  cv.addEventListener('click', () => {
    const now = performance.now();
    if (now < deaf) return;
    clicks = clicks.filter(c => now - c < 2000); clicks.push(now);
    if (clicks.length >= 4) { clicks = []; deaf = now + 1500; wake(); speak(uk ? 'Брязкіт контактів. Чекаю' : 'Switch bounce. Debouncing', 2); return; }
    const was = asleep; wake();
    if (!REDUCED && jump === 0) { vy = -420; jump = -.01; }   // ≈80 px угору — у стрибку перекриває шапку, але не тікає за край екрана
    if (was) speak(uk ? 'Виходжу з режиму сну' : 'Leaving sleep mode');
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
  // і з клавіатури (Tab): та сама репліка; без руху — відповідає з місця
  const comment = el => {
    if (bit) return;
    if (REDUCED) { speak(el.dataset.rexSay, 2.6); return; }
    if (!raf) return;
    wake();
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    goTo(r.left + Math.min(r.width / 2, 70) - b.left, true, () => { dir = 1; speak(el.dataset.rexSay, 2.6); });
  };
  scope.querySelectorAll('[data-rex-say]').forEach(el => { el.addEventListener('pointerenter', () => comment(el)); el.addEventListener('focus', () => comment(el)); });
  document.addEventListener('themechange', () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    if (seen) { wake(); speak(dark ? (uk ? 'Темно. Час кодити' : 'Lights down. Time to code') : (uk ? 'Додаємо світла' : 'Turning up the light'), 2.2); }
  });
  new ResizeObserver(() => { x = clamp(x); target = clamp(target); render(); }).observe(box);
  render();
  const upd = () => (seen && !document.hidden ? start() : stop());
  // у пакеті подій видимості чинна — остання
  new IntersectionObserver(es => { seen = es[es.length - 1].isIntersecting; if (!seen) { say.classList.remove('on'); sayT = 0; } upd(); }).observe(box);
  document.addEventListener('visibilitychange', upd);
  addEventListener('pageshow', upd);
}
