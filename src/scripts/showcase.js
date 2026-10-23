// Вітрина головної: одна крихітна, але справжня обчислювальна машина й п'ять упізнаваних поглядів на неї —
// ПРОЦЕСОР (корпус і кристал), ПАМ'ЯТЬ (модуль RAM), КОД (асемблер), ЛОГІКА (суматор), МЕРЕЖА (комутатор).
// Стан машини спільний: перемикання — це поворот одного предмета, а не слайди. Погляди змінюються самі кожні 5 с;
// клавіша закріплює погляд на 20 с, пауза зупиняє все. Без руху — статичний кадр процесора.
import { REDUCED } from './spring.js';
import { rexFrame, drawGrid } from './rex.js';

const TAU = Math.PI * 2;
const root = document.documentElement;
const css = v => getComputedStyle(root).getPropertyValue(v).trim();
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
const hex = (v, n = 2) => '0x' + v.toString(16).toUpperCase().padStart(n, '0');

/* ── Машина: 8-бітне ядро, програма — генератор псевдовипадкових чисел (LFSR) ── */
const PROGRAM = [
  { op: 'LDI', a: 'A', v: 0xA5, txt: 'LDI  A, 0xA5' },
  { op: 'LDI', a: 'X', v: 0x00, txt: 'LDI  X, 0' },
  { op: 'SHL', a: 'A', txt: 'SHL  A' },
  { op: 'JNC', v: 5, txt: 'JNC  +2' },
  { op: 'XOR', a: 'A', v: 0x1D, txt: 'XOR  A, 0x1D' },
  { op: 'ST', txt: 'ST   [X], A' },
  { op: 'OUT', txt: 'OUT  A' },
  { op: 'INC', a: 'X', txt: 'INC  X' },
  { op: 'JMP', v: 2, txt: 'JMP  loop' },
];
function machine() {
  const m = { pc: 0, A: 0, X: 0, C: 0, mem: new Uint8Array(16), out: [], cycle: 0, last: null, add: null };
  for (let i = 0; i < 16; i++) m.mem[i] = (i * 37 + 11) & 0xFF;
  m.tick = () => {
    const ins = PROGRAM[m.pc], ev = { pc: m.pc, op: ins.op };
    let next = m.pc + 1;
    m.add = null;
    switch (ins.op) {
      case 'LDI': m[ins.a] = ins.v; break;
      case 'SHL': { const r = m.A << 1; m.C = r > 255 ? 1 : 0; m.add = { a: m.A, b: m.A, s: r & 255 }; m.A = r & 255; break; }
      case 'JNC': if (!m.C) next = ins.v; break;
      case 'XOR': m.A ^= ins.v; break;
      case 'ST': m.mem[m.X & 15] = m.A; ev.addr = m.X & 15; break;
      case 'OUT': m.out.push(m.A); if (m.out.length > 12) m.out.shift(); ev.out = m.A; break;
      case 'INC': m.add = { a: m.X, b: 1, s: (m.X + 1) & 255 }; m.X = (m.X + 1) & 15; break;
      case 'JMP': next = ins.v; break;
    }
    if (!m.add) m.add = { a: m.pc, b: 1, s: (m.pc + 1) & 255 };   // вибірка: лічильник команд + 1 — теж через суматор
    m.pc = next % PROGRAM.length; m.cycle++; m.last = ev;
    return ev;
  };
  return m;
}

/* ── Погляди ─────────────────────────────────────────────── */
function views(ctx) {
  const { c, st, m } = ctx;
  const heat = { ICACHE: 0, DCACHE: 0, REG: 0, ALU: 0, CU: 0, IO: 0, PLL: 0 };
  let lastTick = -9, lastEv = null, chipArt = null;
  const portAct = new Float32Array(24), portLink = Array.from({ length: 24 }, (_, i) => (i * 7) % 5 !== 0);
  let addT = -9, cellT = -9, cellAddr = 0, packets = [];

  function onTick(ev, t) {
    lastTick = t; lastEv = ev; heat.CU = 1; heat.ICACHE = .8; heat.PLL = .6;
    if (['SHL', 'XOR', 'INC'].includes(ev.op)) heat.ALU = 1;
    if (['LDI', 'SHL', 'XOR', 'INC'].includes(ev.op)) heat.REG = .9;
    if (ev.op === 'ST') { heat.DCACHE = 1; cellT = t; cellAddr = ev.addr; }
    if (ev.op === 'OUT') { heat.IO = 1; const p = ev.out % 24; portAct[p] = 1; packets.push({ p, t }); }
    addT = t;
  }
  function decay(dt) {
    for (const k in heat) heat[k] *= Math.pow(.08, dt);
    for (let i = 0; i < 24; i++) portAct[i] *= Math.pow(.05, dt);
    if (Math.random() < dt * 3) { const p = Math.floor(Math.random() * 24); if (portLink[p]) portAct[p] = Math.max(portAct[p], .6); }   // фоновий трафік
    packets = packets.filter(p => ctx.t - p.t < 1.4);
  }
  const col = () => st.col;

  /* ПРОЦЕСОР: корпус із виводами, усередині кристал — блоки, тактове H-дерево, чіп-арт КІ-Рекса */
  function cpu(t) {
    const { W, H } = st, C = col(), S = Math.min(W * .62, (H - 64) * .86), x0 = (W - S) / 2, y0 = (H - S) / 2 + 2;   // з виводами — не заходить під підписи
    // виводи
    const pins = 10, pl = S * .07, pw = S / pins * .42;
    c.fillStyle = C.gold;
    for (let i = 0; i < pins; i++) {
      const p = x0 + S * .12 + (S * .76) * (i + .5) / pins - pw / 2;
      const lit = heat.IO > .2 && i === (lastEv?.out ?? 0) % pins;
      c.globalAlpha = lit ? 1 : .55;
      c.fillRect(p, y0 - pl, pw, pl); c.fillRect(p, y0 + S, pw, pl);
      c.fillRect(x0 - pl, y0 + S * .12 + (S * .76) * (i + .5) / pins - pw / 2, pl, pw); c.fillRect(x0 + S, y0 + S * .12 + (S * .76) * (i + .5) / pins - pw / 2, pl, pw);
    }
    c.globalAlpha = 1;
    // корпус
    c.fillStyle = C.dark ? '#1F1B18' : '#2A2420'; roundRect(x0, y0, S, S, S * .04); c.fill();
    c.fillStyle = C.dark ? 'rgba(255,240,210,.05)' : 'rgba(255,255,255,.06)'; roundRect(x0 + 3, y0 + 3, S - 6, S * .5, S * .035); c.fill();
    c.fillStyle = '#C9BFB1'; c.globalAlpha = .55; c.beginPath(); c.arc(x0 + S * .07, y0 + S * .07, S * .018, 0, TAU); c.fill(); c.globalAlpha = 1;   // ключ «перший вивід»
    c.font = `500 ${Math.max(9, S * .035)}px "Signal Mono", monospace`; c.fillStyle = '#C9BFB1'; c.textAlign = 'left';
    c.fillText('KI-01 · KNU', x0 + S * .12, y0 + S * .095);
    // кристал
    const d = S * .56, dx = x0 + (S - d) / 2, dy = y0 + (S - d) / 2 + S * .02;
    c.fillStyle = C.dark ? '#2A241D' : '#3B332A'; c.fillRect(dx, dy, d, d);
    c.strokeStyle = C.gold; c.globalAlpha = .7; c.lineWidth = 1; c.strokeRect(dx + .5, dy + .5, d - 1, d - 1); c.globalAlpha = 1;
    const B = { ICACHE: [.06, .06, .38, .36], DCACHE: [.06, .58, .38, .36], REG: [.5, .06, .44, .2], ALU: [.5, .32, .44, .3], CU: [.5, .68, .26, .26], PLL: [.8, .68, .14, .12], IO: [.8, .84, .14, .1] };
    for (const [k, [bx, by, bw, bh]] of Object.entries(B)) {
      const X = dx + bx * d, Y = dy + by * d, w = bw * d, h = bh * d, hh = Math.min(1, heat[k]);
      c.fillStyle = C.ph; c.globalAlpha = .1 + hh * .55; c.fillRect(X, Y, w, h); c.globalAlpha = .55 + hh * .45;
      c.strokeStyle = C.gold; c.strokeRect(X + .5, Y + .5, w - 1, h - 1);
      // фактура блоку
      c.globalAlpha = .35 + hh * .4; c.fillStyle = C.gold;
      if (k.endsWith('CACHE')) for (let yy = Y + 4; yy < Y + h - 3; yy += 4) for (let xx = X + 4; xx < X + w - 3; xx += 4) c.fillRect(xx, yy, 1.2, 1.2);
      if (k === 'REG') for (let xx = X + 5; xx < X + w - 3; xx += 6) c.fillRect(xx, Y + 3, 1, h - 6);
      if (k === 'ALU') { c.beginPath(); for (let xx = X - h; xx < X + w; xx += 7) { c.moveTo(Math.max(X, xx), Y + Math.max(0, X - xx)); c.lineTo(Math.min(X + w, xx + h), Y + Math.min(h, X + w - xx)); } c.strokeStyle = C.gold; c.stroke(); }
      if (k === 'CU') for (let yy = Y + 5; yy < Y + h - 3; yy += 5) c.fillRect(X + 4, yy, w - 8, 1);
      if (k === 'PLL') { c.beginPath(); for (let i = 0; i <= 20; i++) { const xx = X + 3 + (w - 6) * i / 20, yy = Y + h / 2 + Math.sin(i / 20 * TAU) * h * .25 * (i < 10 ? 1 : 0) + (i >= 10 ? (i % 10 < 5 ? -1 : 1) * h * .25 : 0); i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); }
      c.globalAlpha = 1;
    }
    // тактове H-дерево від PLL: імпульс розходиться на кожному такті
    const age = t - lastTick, front = age * 5;
    c.strokeStyle = C.ph; c.lineWidth = 1.2;
    const hT = (x, y, len, depth, dist) => {
      if (depth > 4) return;
      const horiz = depth % 2 === 0, a = [x - (horiz ? len : 0), y - (horiz ? 0 : len)], b = [x + (horiz ? len : 0), y + (horiz ? 0 : len)];
      const lit = Math.max(0, 1 - Math.abs(front - dist) * 1.6);
      c.globalAlpha = .14 + lit * .8; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
      hT(a[0], a[1], len / (horiz ? 1.42 : 1.42), depth + 1, dist + 1); hT(b[0], b[1], len / 1.42, depth + 1, dist + 1);
    };
    if (C.dark) { c.shadowColor = C.ph; c.shadowBlur = 5; }
    hT(dx + d / 2, dy + d / 2, d * .2, 0, 0); c.shadowBlur = 0; c.globalAlpha = 1;
    // чіп-арт: крихітний КІ-Рекс, витравлений золотом у куті кристала
    if (!chipArt) chipArt = rexFrame({ legs: 0 });
    const px = Math.max(1, Math.round(d / 120));
    c.globalAlpha = .75; const g = chipArt.map(r => r.map(v => (v ? C.gold : null))); drawGrid(c, g, px, dx + d * .07, dy + d * .58 + d * .36 - 24 * px); c.globalAlpha = 1;
    const ins = PROGRAM[lastEv?.pc ?? 0];
    return { top: ['PC ' + hex(lastEv?.pc ?? 0) + ' · ' + ins.op, 'CLK 2,5 Hz'], bot: [`A = ${hex(m.A)}`, `X = ${hex(m.X, 1)}`] };
  }

  /* ПАМ'ЯТЬ: модуль RAM — плата, чипи, золоті контакти; на кожному чипі — один бітовий шар 16 байтів пам'яті */
  function ram(t) {
    const { W, H } = st, C = col(), bw = W * .86, bh = Math.min(H * .5, bw * .3), x0 = (W - bw) / 2, y0 = (H - bh) / 2 + 6;
    c.fillStyle = C.dark ? '#16331F' : '#2E5A3A'; roundRect(x0, y0, bw, bh, 4); c.fill();                // плата
    c.strokeStyle = C.gold; c.globalAlpha = .35; c.lineWidth = 1; roundRect(x0 + .5, y0 + .5, bw - 1, bh - 1, 4); c.stroke(); c.globalAlpha = 1;
    const fy = y0 + bh - bh * .14, fn = 40;                         // контакти
    c.fillStyle = C.gold;
    for (let i = 0; i < fn; i++) { if (i === 17) continue; const fx = x0 + bw * .03 + (bw * .94) * i / fn; c.globalAlpha = .9; c.fillRect(fx, fy, bw * .94 / fn * .6, bh * .12); }
    c.globalAlpha = 1; c.fillStyle = C.dark ? '#141211' : '#F1EBE0'; c.fillRect(x0 + bw * .03 + (bw * .94) * 17.15 / fn, fy, bw * .94 / fn * .7, bh * .16);   // виріз-ключ
    const chips = 8, cw = bw * .095, ch = bh * .5, gap = (bw * .9 - chips * cw) / (chips - 1), cy = y0 + bh * .14;
    const since = t - cellT;
    for (let k = 0; k < chips; k++) {
      const cx = x0 + bw * .05 + k * (cw + gap);
      c.fillStyle = '#17130F'; c.fillRect(cx, cy, cw, ch);
      c.fillStyle = '#4A423A'; c.fillRect(cx + 1, cy + 1, cw - 2, 2);
      // 16 комірок біта k: сітка 4×4
      const bit = 7 - k, cs = Math.min(cw, ch) / 5.2;
      for (let a = 0; a < 16; a++) {
        const v = (m.mem[a] >> bit) & 1, gx = cx + cw / 2 + (a % 4 - 1.5) * cs * 1.15 - cs / 2, gy = cy + ch / 2 + (Math.floor(a / 4) - 1.5) * cs * 1.15 - cs / 2;
        const hot = a === cellAddr && since < .9 ? 1 - since / .9 : 0;
        c.fillStyle = v ? C.ph : '#4A423A'; c.globalAlpha = v ? .85 : .5;
        if (hot) { c.fillStyle = C.gold; c.globalAlpha = .6 + hot * .4; }
        c.fillRect(gx, gy, cs, cs);
      }
      c.globalAlpha = 1;
    }
    c.font = `500 ${Math.max(9, bh * .07)}px "Signal Mono", monospace`; c.fillStyle = C.gold; c.globalAlpha = .8; c.textAlign = 'left';
    c.fillText('DDR · 16 × 8 bit', x0 + bw * .05, y0 + bh * .1); c.globalAlpha = 1;
    return { top: ['ST [' + hex(cellAddr, 1) + '] ← ' + hex(m.mem[cellAddr]), '16 B · 128 bit'], bot: ['A = ' + hex(m.A), 'X = ' + hex(m.X, 1)] };
  }

  /* КОД: лістинг асемблера, поточна команда підсвічена; праворуч — регістри й вихідний потік */
  function code(t) {
    const { W, H } = st, C = col(), lh = Math.min(22, (H - 70) / PROGRAM.length), x0 = W * .07, y0 = (H - lh * PROGRAM.length) / 2 + 6, fs = Math.max(10, lh * .62);
    c.textAlign = 'left'; c.textBaseline = 'middle';
    const cur = lastEv?.pc ?? 0, glide = Math.min(1, (t - lastTick) * 6);
    c.fillStyle = C.ph; c.globalAlpha = C.dark ? .16 : .1; c.fillRect(x0 - 8, y0 + cur * lh, W * .52, lh); c.globalAlpha = 1;
    PROGRAM.forEach((p, i) => {
      const y = y0 + i * lh + lh / 2, on = i === cur;
      c.font = `500 ${fs}px "Signal Mono", monospace`;
      c.fillStyle = C.ink3; c.fillText(hex(i), x0 + 10, y);
      c.fillStyle = on ? C.ph : C.ink2; c.globalAlpha = on ? 1 : .8; c.fillText(p.txt, x0 + fs * 3.6, y); c.globalAlpha = 1;
      if (i === 2) { c.fillStyle = C.gold; c.fillText('loop:', x0 + W * .36, y); }
      if (on) { c.fillStyle = C.ph; c.globalAlpha = .4 + .6 * glide; c.fillText('▶', x0 - 4, y); c.globalAlpha = 1; }
    });
    // регістри
    const rx = W * .66, ry = y0;
    c.font = `500 ${fs}px "Signal Mono", monospace`;
    [['PC', hex(m.pc)], ['A', hex(m.A)], ['X', hex(m.X, 1)], ['C', String(m.C)]].forEach(([k, v], i) => {
      c.fillStyle = C.ink3; c.fillText(k, rx, ry + i * lh * 1.25 + lh / 2); c.fillStyle = C.gold; c.fillText(v, rx + fs * 2.4, ry + i * lh * 1.25 + lh / 2);
    });
    c.fillStyle = C.ink3; c.fillText('OUT', rx, ry + lh * 5.6);
    c.fillStyle = C.ph; m.out.slice(-6).forEach((v, i) => c.fillText(hex(v).slice(2), rx + i * fs * 1.75, ry + lh * 6.8));
    c.textBaseline = 'alphabetic';
    return { top: ['ASM · LFSR', 'CYCLE ' + m.cycle], bot: ['x⁸ + x⁴ + x³ + x² + 1', 'OUT ' + hex(m.out.at(-1) ?? 0)] };
  }

  /* ЛОГІКА: 8-бітний суматор з послідовним переносом — перенос біжить від молодшого біта до старшого */
  function logic(t) {
    const { W, H } = st, C = col(), op = m.add || { a: 0, b: 0, s: 0 }, n = 8, bw = Math.min(W * .1, 58), gap = (W * .84 - n * bw) / (n - 1), x0 = W * .08, yA = H * .26, yBox = H * .44, bh = H * .2, yS = H * .78;
    const since = t - addT, STEP = .07;
    let carry = 0; const carries = [], sums = [];
    for (let i = 0; i < n; i++) { const a = (op.a >> i) & 1, b = (op.b >> i) & 1, s = a + b + carry; sums[i] = s & 1; carries[i] = carry; carry = s >> 1; }
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `500 ${Math.max(9, bw * .24)}px "Signal Mono", monospace`;
    for (let k = 0; k < n; k++) {
      const i = n - 1 - k, x = x0 + k * (bw + gap), cx = x + bw / 2, reached = since > i * STEP, a = (op.a >> i) & 1, b = (op.b >> i) & 1;
      // входи
      [[a, -bw * .2], [b, bw * .2]].forEach(([v, dxx]) => { c.fillStyle = v ? C.ph : C.line; c.globalAlpha = v ? 1 : .5; c.beginPath(); c.arc(cx + dxx, yA, bw * .09, 0, TAU); c.fill(); c.globalAlpha = .4; c.strokeStyle = C.line; c.beginPath(); c.moveTo(cx + dxx, yA + bw * .1); c.lineTo(cx + dxx, yBox); c.stroke(); });
      // повний суматор
      c.globalAlpha = 1; c.strokeStyle = C.gold; c.lineWidth = 1.2; roundRect(x, yBox, bw, bh, 5); c.stroke();
      c.fillStyle = C.ph; c.globalAlpha = reached ? .16 : .04; roundRect(x, yBox, bw, bh, 5); c.fill(); c.globalAlpha = 1;
      c.fillStyle = C.ink2; c.fillText('Σ', cx, yBox + bh / 2);
      // перенос до старшого розряду
      if (k > 0) {
        const lit = reached && carries[i + 1 <= 7 ? i + 1 : 7] && since < (i + 1) * STEP + .5;
        c.strokeStyle = lit ? C.ph : C.line; c.globalAlpha = lit ? 1 : .5; c.lineWidth = lit ? 1.8 : 1;
        c.beginPath(); c.moveTo(x + bw + gap - 2, yBox + bh * .5); c.lineTo(x + bw + 2, yBox + bh * .5); c.stroke();
        c.globalAlpha = 1; c.lineWidth = 1;
      }
      // сума: до приходу переносу — «глітч»
      const settled = since > (i + 1) * STEP, sv = settled ? sums[i] : ((Math.floor(t * 20) + i) & 1);
      c.fillStyle = sv ? C.ph : C.line; c.globalAlpha = settled ? (sv ? 1 : .5) : .35; c.beginPath(); c.arc(cx, yS, bw * .11, 0, TAU); c.fill(); c.globalAlpha = .4;
      c.strokeStyle = C.line; c.beginPath(); c.moveTo(cx, yBox + bh); c.lineTo(cx, yS - bw * .12); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = C.ink3; c.fillText(String(i), cx, yS + bw * .32);
    }
    c.textBaseline = 'alphabetic';
    return { top: ['RIPPLE-CARRY ADDER · 8 bit', 'Δt ≈ 8 × t_FA'], bot: [`${hex(op.a)} + ${hex(op.b)} = ${hex(op.s)}`, 'ALU'] };
  }

  /* МЕРЕЖА: передня панель комутатора — порти RJ45, світлодіоди лінку й трафіку; байти OUT машини йдуть у мережу */
  function net(t) {
    const { W, H } = st, C = col(), pw = W * .9, ph = Math.min(H * .42, pw * .24), x0 = (W - pw) / 2, y0 = (H - ph) / 2 - 4;
    c.fillStyle = C.dark ? '#1F1B18' : '#2A2420'; roundRect(x0, y0, pw, ph, 5); c.fill();
    c.fillStyle = C.dark ? 'rgba(255,240,210,.04)' : 'rgba(255,255,255,.06)'; c.fillRect(x0 + 3, y0 + 3, pw - 6, ph * .25);
    // вушка стійки
    c.fillStyle = '#4A423A'; [x0 - pw * .025, x0 + pw].forEach(ex => { c.fillRect(ex, y0 + ph * .1, pw * .025, ph * .8); c.fillStyle = '#17130F'; c.beginPath(); c.arc(ex + pw * .0125, y0 + ph * .3, 2, 0, TAU); c.arc(ex + pw * .0125, y0 + ph * .7, 2, 0, TAU); c.fill(); c.fillStyle = '#4A423A'; });
    c.font = `500 ${Math.max(9, ph * .1)}px "Signal Mono", monospace`; c.fillStyle = '#C9BFB1'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText('KI-SW 24', x0 + pw * .025, y0 + ph * .2);
    c.fillStyle = '#9BD487'; c.globalAlpha = .6 + .4 * Math.sin(t * 2) ** 2; c.beginPath(); c.arc(x0 + pw * .04, y0 + ph * .72, 2.6, 0, TAU); c.fill(); c.globalAlpha = 1;   // живлення
    const cols = 12, area = pw * .8, px = x0 + pw * .15, pwid = area / cols * .74, phgt = ph * .27;
    for (let r = 0; r < 2; r++) for (let k = 0; k < cols; k++) {
      const p = r * cols + k, X = px + k * area / cols, Y = y0 + ph * .2 + r * ph * .4;
      // гніздо RJ45: квадрат із «замком»
      c.fillStyle = '#0C0A09'; c.fillRect(X, Y + phgt * .25, pwid, phgt * .75); c.fillRect(X + pwid * .3, Y + phgt * .1, pwid * .4, phgt * .2);
      c.fillStyle = '#B9B3A8'; for (let j = 0; j < 4; j++) c.fillRect(X + pwid * (.2 + j * .17), Y + phgt * .3, pwid * .08, phgt * .14);
      // світлодіоди: зелений — лінк, золотий — активність
      const ly = r ? Y + phgt + 4 : Y - 2;
      c.fillStyle = portLink[p] ? '#9BD487' : '#4A423A'; c.globalAlpha = portLink[p] ? .9 : .6; c.fillRect(X, ly, pwid * .38, 2.5);
      c.fillStyle = C.ph; c.globalAlpha = .25 + Math.min(1, portAct[p]) * .75; if (portAct[p] > .4 && C.dark) { c.shadowColor = C.ph; c.shadowBlur = 6; }
      c.fillRect(X + pwid * .62, ly, pwid * .38, 2.5); c.shadowBlur = 0; c.globalAlpha = 1;
    }
    // кабелі з активних портів і пакети, що по них біжать
    for (let k = 0; k < cols; k++) {
      if (!portLink[12 + k]) continue;
      const X = px + k * area / cols + pwid / 2, Y = y0 + ph, end = H - 18;
      c.strokeStyle = C.line; c.globalAlpha = .5; c.lineWidth = 2; c.beginPath(); c.moveTo(X, Y); c.bezierCurveTo(X, Y + (end - Y) * .6, X + (k - 6) * 6, end - 10, X + (k - 6) * 9, end); c.stroke();
    }
    c.globalAlpha = 1; c.lineWidth = 1;
    for (const pk of packets) {
      const k = pk.p % cols, X = px + k * area / cols + pwid / 2, u = Math.min(1, (t - pk.t) / 1.2), Y = y0 + (pk.p < 12 ? -4 : ph + 4);
      c.fillStyle = C.gold; c.globalAlpha = 1 - u; c.fillRect(X - 4, Y + (pk.p < 12 ? -1 : 1) * u * 30 - 3, 8, 6);
    }
    c.globalAlpha = 1; c.textBaseline = 'alphabetic';
    const up = portLink.filter(Boolean).length;
    return { top: ['24 × 1 GbE · ' + up + ' link up', 'VLAN 10'], bot: ['OUT ' + hex(m.out.at(-1) ?? 0) + ' → port ' + ((m.out.at(-1) ?? 0) % 24 + 1), 'L2 SWITCH'] };
  }

  function roundRect(x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
  return { list: [cpu, ram, code, logic, net], onTick, decay };
}

/* ── Рамка вітрини: автоматична зміна поглядів, клавіші, пауза, перехід «курсором аналізатора» ── */
export function showcase(figure) {
  const cv = figure.querySelector('canvas'), c = cv.getContext('2d');
  const keys = [...figure.querySelectorAll('[data-view]')], play = figure.querySelector('[data-sc-play]'), nextOut = figure.querySelector('[data-sc-next]');
  const hudTL = figure.querySelector('[data-sc-tl]'), hudTR = figure.querySelector('[data-sc-tr]'), hudBL = figure.querySelector('[data-sc-bl]'), hudBR = figure.querySelector('[data-sc-br]');
  const names = keys.map(k => k.textContent.trim());
  const L = root.lang === 'en' ? 'en' : 'uk';
  const st = { W: 0, H: 0, D: 1, col: {} };
  const ctx = { c, st, m: machine(), t: 0 };
  const V = views(ctx);
  const HOLD = 5, PIN = 20, SWEEP = .45, TICK = .4;
  let cur = 0, prev = -1, swT = 9, shown = 0, pinned = 0, playing = !REDUCED, raf = 0, last = 0, acc = 0, seen = false;
  const theme = () => { st.col = { ph: css('--phosphor'), gold: css('--gold'), line: css('--line-strong'), ink2: css('--ink-2'), ink3: css('--ink-3'), dark: isDark() }; };
  const size = () => { const r = cv.getBoundingClientRect(); st.D = Math.min(2, devicePixelRatio || 1); st.W = r.width; st.H = r.height; cv.width = Math.round(st.W * st.D); cv.height = Math.round(st.H * st.D); c.setTransform(st.D, 0, 0, st.D, 0, 0); draw(); };
  function hud(h) { if (!h) return; hudTL.innerHTML = `<b>${names[cur]}</b> · ${h.top[0]}`; hudTR.textContent = h.top[1]; hudBL.textContent = h.bot[0]; hudBR.textContent = `${h.bot[1]} · ${cur + 1}/${names.length}`; }
  function draw() {
    if (!st.W) return;
    c.clearRect(0, 0, st.W, st.H);
    const u = Math.min(1, swT / SWEEP), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, x = st.W * e;
    let h;
    if (prev >= 0 && u < 1) {                                       // перехід: ліворуч від курсора — новий погляд, праворуч — старий
      c.save(); c.beginPath(); c.rect(x, 0, st.W - x, st.H); c.clip(); V.list[prev](ctx.t); c.restore();
      c.save(); c.beginPath(); c.rect(0, 0, x, st.H); c.clip(); h = V.list[cur](ctx.t); c.restore();
      c.fillStyle = st.col.gold; c.globalAlpha = .9; c.fillRect(x - .75, 0, 1.5, st.H); c.globalAlpha = 1;
    } else h = V.list[cur](ctx.t);
    hud(h);
  }
  function go(i, manual) {
    if (i === cur) return;
    prev = cur; cur = (i + names.length) % names.length; swT = REDUCED ? 9 : 0; shown = 0;
    if (manual) pinned = PIN;
    keys.forEach((k, j) => { k.setAttribute('aria-pressed', String(j === cur)); k.style.setProperty('--p', 0); });
    draw();
  }
  function frame(now) {
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000) || 0); last = now;
    if (playing) {
      ctx.t += dt; swT += dt; acc += dt;
      while (acc > TICK) { V.onTick(ctx.m.tick(), ctx.t); acc -= TICK; }
      V.decay(dt);
      if (pinned > 0) pinned -= dt; else shown += dt;
      const nxt = (cur + 1) % names.length;
      keys.forEach((k, j) => k.style.setProperty('--p', j === nxt && pinned <= 0 ? Math.min(1, shown / HOLD).toFixed(3) : 0));
      if (nextOut) nextOut.textContent = pinned > 0 ? (L === 'uk' ? 'закріплено' : 'pinned') : `${L === 'uk' ? 'далі' : 'next'} ${names[nxt]} · ${Math.max(0, HOLD - shown).toFixed(1).replace('.', L === 'uk' ? ',' : '.')} ${L === 'uk' ? 'с' : 's'}`;
      if (shown >= HOLD) go(nxt, false);
    }
    draw();
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf && !REDUCED) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  keys.forEach((k, j) => k.addEventListener('click', () => go(j, true)));
  figure.querySelector('.scope__keys').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const j = (cur + (e.key === 'ArrowRight' ? 1 : -1) + names.length) % names.length; go(j, true); keys[j].focus();
  });
  cv.addEventListener('click', () => { V.onTick(ctx.m.tick(), ctx.t); draw(); });   // клік — один такт машини вручну
  const PL = L === 'uk' ? ['Пауза', 'Відтворити'] : ['Pause', 'Play'];
  play?.addEventListener('click', () => {
    playing = !playing;
    play.setAttribute('aria-pressed', String(!playing)); play.setAttribute('aria-label', playing ? PL[0] : PL[1]); play.title = play.getAttribute('aria-label');
    play.querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
    if (!playing && nextOut) nextOut.textContent = L === 'uk' ? 'пауза' : 'paused';
  });
  if (REDUCED) { play?.setAttribute('aria-pressed', 'true'); play?.querySelector('use')?.setAttribute('href', '#i-play'); for (let i = 0; i < 6; i++) V.onTick(ctx.m.tick(), 0); }
  theme(); document.addEventListener('themechange', () => { theme(); draw(); });
  new ResizeObserver(size).observe(cv);
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; seen && !document.hidden ? start() : stop(); }, { rootMargin: '80px' }).observe(figure);
  document.addEventListener('visibilitychange', () => (seen && !document.hidden ? start() : stop()));
  document.fonts?.ready.then(draw);
}
