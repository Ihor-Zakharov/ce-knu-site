// Експонат «ЛОГІКА»: однобітний повний суматор на вентилях — креслення з повільним сигналом.
// Входи A, B, Cin → XOR, XOR, AND, AND, OR → виходи S і Cout (світлодіоди). Вхід перемикається кодом Грея;
// по провіднику біжить яскравий фронт зміни, вентиль відповідає із затримкою, далі фронт біжить його виходом.
// Креслення рахується в «одиницях схеми» (масштабується від W і H), штамп із КІ-Рексом — у правому нижньому куті аркуша.
import { clamp, lerp, smooth, mono, rex, rexMask, glow, noGlow } from './kit.js';

const V = 124;                                   // швидкість фронту, одиниць схеми за секунду (≈ 0,23·W: 135 px/с на 606 px)
const DLY = { xor: .22, and: .16, or: .16 };     // затримки вентилів, с
const FIRST = .75, GAP = 1.65, SLOW = 3.6, POKE_GAP = 2.2;   // перша зміна після enter, період перших трьох змін, далі — спокійніше (прохід сигналу ≈ 3,5 с), пауза після кліку
const GW = 48, GH = 40, PIN = 10;                // вентиль: ширина, висота, півкрок виводів
const BC = 12;                                   // вигин задньої дуги OR/XOR (глибина ≈ 9)
const RAD = 5, HOP = 4;                          // заокруглення поворотів, радіус «містка» над перетином
const BB = { x0: 2, y0: 22, x1: 464, y1: 246 };  // габарит креслення
const IX = 46, LEDX = 424, LEDR = 6.5;           // кінець площадки входу, вісь і радіус світлодіодів

/* ── логіка ──────────────────────────────────────────────────────────── */
const FN = { xor: (a, b) => a ^ b, and: (a, b) => a & b, or: (a, b) => a | b };
const CYC = [5, 1, 3, 2, 0, 4, 6, 7];            // код Грея (A·4+B·2+Cin): 101 001 011 010 000 100 110 111; в 111 входимо з 110
const BIT = { 4: 'A', 2: 'B', 1: 'C' };

/* ── геометрія вентилів ──────────────────────────────────────────────── */
// x задньої дуги OR/XOR на висоті dy від центру (кубічна крива Без'є, бісекція)
const backX = dy => {
  const Y = t => { const u = 1 - t; return -20 * u * u * u - 27 * u * u * t + 27 * u * t * t + 20 * t * t * t; };
  let a = 0, b = .5;
  for (let i = 0; i < 28; i++) { const m = (a + b) / 2; if (Y(m) > -dy) b = m; else a = m; }
  const t = (a + b) / 2; return 3 * t * (1 - t) * BC;
};
const XB = backX(PIN);

const GATES = {
  u1: { t: 'xor', x: 118, y: 56, in: ['A', 'B'], out: 'X1', cap: 'XOR' },
  u2: { t: 'and', x: 118, y: 196, in: ['A', 'B'], out: 'G1', cap: 'AND' },
  u3: { t: 'xor', x: 244, y: 56, in: ['X1', 'C'], out: 'S', cap: 'XOR' },
  u4: { t: 'and', x: 244, y: 128, in: ['X1', 'C'], out: 'G2', cap: 'AND' },
  u5: { t: 'or', x: 336, y: 162, in: ['G2', 'G1'], out: 'CO', cap: 'OR' },
};
for (const g of Object.values(GATES)) {
  const px = g.t === 'and' ? g.x : g.x + XB - (g.t === 'xor' ? 6 : 0);
  g.pin = [[px, g.y - PIN], [px, g.y + PIN]]; g.tip = [g.x + GW, g.y];
  g.path = gatePath(g.t, g.x, g.y); g.arc = g.t === 'xor' ? backArc(g.x - 6, g.y) : null; g.lit = 0; g.pv = [0, 0]; g.cur = 0;
}
function backArc(x, y) { const p = new Path2D(); p.moveTo(x, y - GH / 2); p.bezierCurveTo(x + BC, y - 9, x + BC, y + 9, x, y + GH / 2); return p; }
function gatePath(type, x, y) {
  const p = new Path2D(), h = GH / 2, w = GW;
  if (type === 'and') {                           // «D»: пласка спинка, півеліптичний ніс
    const f = w * .5, rx = w - f, k = .5523;
    p.moveTo(x, y - h); p.lineTo(x + f, y - h);
    p.bezierCurveTo(x + f + k * rx, y - h, x + w, y - k * h, x + w, y);
    p.bezierCurveTo(x + w, y + k * h, x + f + k * rx, y + h, x + f, y + h);
    p.lineTo(x, y + h); p.closePath();
  } else {                                        // OR/XOR: увігнута спинка й гострий ніс
    p.moveTo(x, y - h);
    p.bezierCurveTo(x + w * .46, y - h, x + w * .82, y - h * .42, x + w, y);
    p.bezierCurveTo(x + w * .82, y + h * .42, x + w * .46, y + h, x, y + h);
    p.bezierCurveTo(x + BC, y + 9, x + BC, y - 9, x, y - h); p.closePath();
  }
  return p;
}

/* ── провідники: ламані з заокругленими поворотами й «місточками» над перетинами ── */
// точка [x, y] або [x, y, 1] — різкий кут (вузол розгалуження, там стоїть крапка)
const P = (g, k) => GATES[g].pin[k];
const NETS = {
  A: { src: 'in', y: 30, paths: [
    { pts: [[IX, 30], [92, 30], [92, P('u2', 0)[1]], P('u2', 0)], sink: 'u2.0' },
    { at: [92, P('u1', 0)[1]], pts: [[92, P('u1', 0)[1]], P('u1', 0)], sink: 'u1.0', dot: 1 }] },
  B: { src: 'in', y: 82, paths: [
    { pts: [[IX, 82], [70, 82, 1], [70, P('u2', 1)[1]], P('u2', 1)], sink: 'u2.1' },
    { at: [70, 82], pts: [[70, 82], [70, P('u1', 1)[1]], P('u1', 1)], sink: 'u1.1', dot: 1 }] },
  C: { src: 'in', y: 236, paths: [
    { pts: [[IX, 236], [214, 236], [214, P('u3', 1)[1]], P('u3', 1)], sink: 'u3.1' },
    { at: [214, P('u4', 1)[1]], pts: [[214, P('u4', 1)[1]], P('u4', 1)], sink: 'u4.1', dot: 1 }] },
  X1: { paths: [
    { pts: [GATES.u1.tip, [188, 56, 1], [188, P('u3', 0)[1]], P('u3', 0)], sink: 'u3.0' },
    { at: [188, 56], pts: [[188, 56], [188, P('u4', 0)[1]], P('u4', 0)], sink: 'u4.0', dot: 1 }] },
  S: { paths: [{ pts: [GATES.u3.tip, [LEDX - LEDR, 56]], sink: 'led.S' }] },
  G2: { paths: [{ pts: [GATES.u4.tip, [314, 128], [314, P('u5', 0)[1]], P('u5', 0)], sink: 'u5.0' }] },
  G1: { paths: [{ pts: [GATES.u2.tip, [314, 196], [314, P('u5', 1)[1]], P('u5', 1)], sink: 'u5.1' }] },
  CO: { paths: [{ pts: [GATES.u5.tip, [LEDX - LEDR, 162]], sink: 'led.C' }] },
};
const INPUT_PAD = { A: [37, 30], B: [37, 82], C: [37, 236] };
const LEDS = { S: [LEDX, 56], C: [LEDX, 162] };

// щільна ламана зі «місточками» (hops: x-координати над вертикалями інших мереж) і кумулятивною довжиною
function dense(cs, hops) {
  const n = cs.length, seg = [], out = [[cs[0][0], cs[0][1]]];
  for (let i = 0; i < n - 1; i++) { const [x0, y0] = cs[i], [x1, y1] = cs[i + 1]; seg.push({ dx: Math.sign(x1 - x0), dy: Math.sign(y1 - y0), len: Math.abs(x1 - x0) + Math.abs(y1 - y0) }); }
  const r = cs.map((q, i) => (i === 0 || i === n - 1 || q[2] ? 0 : Math.min(RAD, seg[i - 1].len / 2, seg[i].len / 2)));
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = cs[i], s = seg[i], b = s.len - r[i + 1];
    if (s.dy === 0) for (const hx of (hops[i] || []).sort((p, q) => (p - q) * s.dx))      // місток: півколо над перетином
      for (let k = 0; k <= 14; k++) { const th = Math.PI * (s.dx > 0 ? 1 - k / 14 : k / 14); out.push([hx + HOP * Math.cos(th), y0 - HOP * Math.sin(th)]); }
    out.push([x0 + s.dx * b, y0 + s.dy * b]);
    if (r[i + 1] > 0) {                                                                  // заокруглений поворот
      const rr = r[i + 1], t = seg[i + 1], [cx, cy] = cs[i + 1];
      const ox = cx - s.dx * rr + t.dx * rr, oy = cy - s.dy * rr + t.dy * rr, a0 = Math.atan2(-t.dy, -t.dx), a1 = Math.atan2(s.dy, s.dx);
      let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      for (let k = 1; k <= 8; k++) out.push([ox + rr * Math.cos(a0 + d * k / 8), oy + rr * Math.sin(a0 + d * k / 8)]);
    }
  }
  let d = 0; return out.map((q, i) => { if (i) d += Math.hypot(q[0] - out[i - 1][0], q[1] - out[i - 1][1]); return { x: q[0], y: q[1], d }; });
}
// з пересічень: горизонталі однієї мережі, що перетинають вертикалі іншої, отримують місток
function buildNets() {
  const flat = [];
  for (const [id, net] of Object.entries(NETS)) for (const pa of net.paths) for (let i = 0; i < pa.pts.length - 1; i++) flat.push({ id, pa, i, a: pa.pts[i], b: pa.pts[i + 1] });
  for (const [id, net] of Object.entries(NETS)) {
    net.id = id; net.sinks = []; net.dots = [];
    net.paths.forEach((pa, pi) => {
      const hops = {};
      pa.pts.slice(0, -1).forEach((a, i) => {
        const b = pa.pts[i + 1];
        if (a[1] !== b[1]) return;
        for (const o of flat) if (o.id !== id && o.a[0] === o.b[0] && o.a[0] > Math.min(a[0], b[0]) + HOP + 4 && o.a[0] < Math.max(a[0], b[0]) - HOP - 4 && a[1] > Math.min(o.a[1], o.b[1]) + 1 && a[1] < Math.max(o.a[1], o.b[1]) - 1) (hops[i] ||= []).push(o.a[0]);
      });
      pa.p = dense(pa.pts, hops); pa.len = pa.p.at(-1).d;
      if (pi === 0) pa.off = 0;
      else {                                      // розгалуження: відстань від джерела до вузла на батьківській ламаній
        const par = net.paths[0]; let best = 1e9, d0 = 0;
        for (let k = 0; k < par.p.length - 1; k++) {          // проєкція вузла на сегменти батьківської ламаної
          const u = par.p[k], v = par.p[k + 1], sx = v.x - u.x, sy = v.y - u.y, l2 = sx * sx + sy * sy || 1;
          const f = clamp(((pa.at[0] - u.x) * sx + (pa.at[1] - u.y) * sy) / l2), dd = Math.hypot(u.x + sx * f - pa.at[0], u.y + sy * f - pa.at[1]);
          if (dd < best - 1e-6) { best = dd; d0 = u.d + (v.d - u.d) * f; }
        }
        pa.off = par.off + d0; net.dots.push({ x: pa.at[0], y: pa.at[1], d: pa.off });
      }
      const [g, pin] = pa.sink.split('.'); net.sinks.push({ g, pin: +pin || 0, d: pa.off + pa.len, led: g === 'led' ? pin : null });
    });
  }
}
buildNets();
const NET_ORDER = ['A', 'B', 'C', 'X1', 'S', 'G2', 'G1', 'CO'];

/* ── малювання ───────────────────────────────────────────────────────── */
function strokeRange(c, p, a, b) {                // фрагмент ламаної від відстані a до b
  if (b <= a) return;
  let i = 0; while (i < p.length - 2 && p[i + 1].d < a) i++;
  const at = (k, d) => { const u = p[k], v = p[k + 1], f = v.d > u.d ? (d - u.d) / (v.d - u.d) : 0; return [u.x + (v.x - u.x) * f, u.y + (v.y - u.y) * f]; };
  const s = at(i, a); c.beginPath(); c.moveTo(s[0], s[1]);
  for (let k = i + 1; k < p.length; k++) {
    if (p[k].d >= b) { const e = at(k - 1, b); c.lineTo(e[0], e[1]); break; }
    c.lineTo(p[k].x, p[k].y);
  }
  c.stroke();
}
// піксельний габарит КІ-Рекса (для центрування підпису)
let rexBox = null;
function rexBounds() {
  if (rexBox) return rexBox;
  const m = rexMask(); let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
  m.forEach((row, y) => row.forEach((v, x) => { if (v) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }));
  return (rexBox = { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
}

export default function (env) {
  const gates = GATES;
  let inp, state, queue, nextAuto = Infinity, calm = false, calmT = 0, lastDt = 1, lay = null, nFlip = 0;

  /* стан: усталені значення за входами, без подій у польоті */
  function settle(a = inp.A, b = inp.B, cin = inp.C) {
    inp = { A: a, B: b, C: cin };
    const x1 = a ^ b, g1 = a & b, s = x1 ^ cin, g2 = x1 & cin;
    const val = { A: a, B: b, C: cin, X1: x1, G1: g1, S: s, G2: g2, CO: g1 | g2 };
    state = Object.fromEntries(NET_ORDER.map(id => [id, { base: val[id], ev: [] }]));
    for (const g of Object.values(gates)) { g.pv = g.in.map(id => val[id]); g.cur = val[g.out]; }
    queue = [];
  }
  const code = () => inp.A * 4 + inp.B * 2 + inp.C;

  function emit(id, t0, val) {                    // зміна мережі в її джерелі в момент t0
    const net = NETS[id], st = state[id];
    st.ev.push({ t0, val }); if (st.ev.length > 6) st.base = st.ev.shift().val;
    for (const s of net.sinks) if (s.g !== 'led') queue.push({ time: t0 + s.d / V, g: s.g, pin: s.pin, val });
    queue.sort((p, q) => p.time - q.time);
  }
  function run(t) {                               // обробити події до моменту t
    while (queue.length && queue[0].time <= t) {
      const q = queue.shift(), g = gates[q.g];
      g.pv[q.pin] = q.val;
      const nv = FN[g.t](g.pv[0], g.pv[1]);
      if (nv !== g.cur) { g.cur = nv; emit(g.out, q.time + DLY[g.t], nv); }
    }
  }
  function flip(id, T) { inp[id] ^= 1; emit(id, T, inp[id]); }
  function walk(T) { const nx = CYC[(CYC.indexOf(code()) + 1) % 8]; flip(BIT[code() ^ nx], T); }

  /* значення мережі в точці на відстані d від джерела; плавний рівень 0…1 для елементів-споживачів */
  function valueAt(id, d, t) { let v = state[id].base; for (const e of state[id].ev) if (e.t0 + d / V <= t) v = e.val; return v; }
  function level(id, d, t, tau) {
    const st = state[id]; let from = st.base, to = st.base, ts = -1e9;
    for (const e of st.ev) {
      const ta = e.t0 + d / V; if (ta > t) break;
      from = lerp(from, to, smooth(0, 1, (ta - ts) / tau)); to = e.val; ts = ta;
    }
    return lerp(from, to, smooth(0, 1, (t - ts) / tau));
  }
  const sinkD = id => NETS[id].sinks.find(s => s.led).d;

  /* розкладка: масштаб креслення s і зсув; аркуш-рамка; штамп */
  function fit(W, H) {
    if (lay && lay.W === W && lay.H === H) return lay;
    const m = W < 420 ? 8 : 14, fx0 = m, fx1 = W - m, fy0 = 38, fy1 = H - 35, fw = fx1 - fx0, fh = fy1 - fy0;
    const mx = clamp(W * .03, 8, 26), my = clamp(fh * .05, 8, 16);
    const bw = BB.x1 - BB.x0, bh = BB.y1 - BB.y0, s = Math.min((fw - 2 * mx) / bw, (fh - 2 * my) / bh);
    const ox = fx0 + (fw - bw * s) / 2 - BB.x0 * s, oy = fy0 + (fh - bh * s) / 2 - BB.y0 * s;
    // штамп: не заходить на провідники (вертикаль AND1 → OR) і світлодіод Cout
    const clear = ox + 314 * s + 14, kBase = clamp(W / 560, .8, 1.5), ks = clamp(Math.min(kBase, (fx1 - clear) / 118), .56, 1.5);
    return (lay = { W, H, s, ox, oy, fx0, fx1, fy0, fy1, ks });
  }

  function label(c, txt, sub, x, y, fs, align) {  // підпис моно-шрифтом із підрядковим індексом
    c.textAlign = 'left'; mono(c, fs); const w1 = c.measureText(txt).width; mono(c, fs * .68); const w2 = sub ? c.measureText(sub).width : 0;
    const x0 = align === 'r' ? x - w1 - w2 : x;
    mono(c, fs); c.fillText(txt, x0, y);
    if (sub) { mono(c, fs * .68); c.fillText(sub, x0 + w1 + .4, y + fs * .26); }
  }

  function sheet(c, col, L) {                     // рамка аркуша з поділками; штамп у куті
    const { fx0, fx1, fy0, fy1, ks } = lay;
    c.save(); c.strokeStyle = col.lineStrong; c.lineWidth = 1; c.globalAlpha = col.dark ? .5 : .55;
    c.strokeRect(fx0 + .5, fy0 + .5, fx1 - fx0 - 1, fy1 - fy0 - 1);
    c.beginPath();                                // поділки зон по краях
    for (const f of [.25, .5, .75]) {
      const x = Math.round(fx0 + (fx1 - fx0) * f) + .5, y = Math.round(fy0 + (fy1 - fy0) * f) + .5;
      c.moveTo(x, fy0 + 1); c.lineTo(x, fy0 + 4); c.moveTo(x, fy1 - 1); c.lineTo(x, fy1 - 4);
      c.moveTo(fx0 + 1, y); c.lineTo(fx0 + 4, y); c.moveTo(fx1 - 1, y); c.lineTo(fx1 - 4, y);
    }
    c.stroke(); c.restore();
    // штамп (title block): КІ-Рекс — підпис розробника, шифр, назва
    const w = 118 * ks, h = 36 * ks, x0 = fx1 - w, y0 = fy1 - h, cl = 34 * ks, r1 = 19 * ks, cm = 42 * ks;
    c.save(); c.strokeStyle = col.lineStrong; c.lineWidth = 1; c.globalAlpha = .8;
    c.strokeRect(Math.round(x0) + .5, Math.round(y0) + .5, Math.round(w) - 1, Math.round(h) - 1);
    c.beginPath();
    const vx = Math.round(x0 + cl) + .5, hy = Math.round(y0 + r1) + .5, mx2 = Math.round(x0 + cl + cm) + .5;
    c.moveTo(vx, y0); c.lineTo(vx, fy1); c.moveTo(vx, hy); c.lineTo(fx1, hy); c.moveTo(mx2, hy); c.lineTo(mx2, fy1);
    c.stroke(); c.restore();
    const rb = rexBounds(), px = ks >= 1.45 ? 2 : 1;
    rex(c, x0 + (cl - rb.w * px) / 2 - rb.x0 * px, y0 + (h - rb.h * px) / 2 - rb.y0 * px, px, col.gold);
    c.textBaseline = 'middle'; c.textAlign = 'left';
    const f1 = 8.6 * ks, f2 = 7.2 * ks, px0 = x0 + cl + 6 * ks;
    mono(c, f1, 500); c.fillStyle = col.ink; c.fillText(L === 'uk' ? 'СУМАТОР' : 'FULL ADDER', px0, y0 + r1 / 2 + .5);
    mono(c, f2, 500); c.fillStyle = col.ink2; c.fillText('КІ-01', px0, (hy + fy1) / 2 + .5);
    c.fillStyle = col.ink3; c.fillText('1:1', mx2 + 6 * ks, (hy + fy1) / 2 + .5);
  }

  settle(1, 0, 1);
  return {
    enter(t) {
      settle(1, 0, 1);
      nextAuto = calm ? Infinity : t + FIRST; calmT = t; nFlip = 0;
    },
    still() { calm = true; settle(1, 0, 1); nextAuto = Infinity; },
    poke(x, y, t) {
      if (!lay) return;
      const { s, ox, oy } = lay; let best = null, bd = 1e9;
      for (const [id, [px, py]] of Object.entries(INPUT_PAD)) { const d = Math.hypot(x - (ox + px * s), y - (oy + py * s)); if (d < bd) { bd = d; best = id; } }
      if (bd < 64 * s + 14) flip(best, t); else walk(t);
      nextAuto = calm ? Infinity : t + POKE_GAP;
      if (lastDt === 0) settle();                // пауза або без руху — показати результат одразу
    },

    draw(c, W, H, t, dt) {
      lastDt = dt;
      const col = env.col, L = env.L, { s, ox, oy } = fit(W, H);
      if (calm && t > calmT + .02) { calm = false; nextAuto = t + FIRST; nFlip = 0; }
      while (nextAuto <= t) { walk(nextAuto); nextAuto += ++nFlip < 3 ? GAP : SLOW; }
      run(t);

      const cOn = col.ph, cOff = col.lineStrong, lw = clamp(1 + .25 * s, 1, 1.4), gw = clamp(1.1 + .2 * s, 1.1, 1.5);
      sheet(c, col, L);

      c.save(); c.translate(ox, oy); c.scale(s, s);
      c.lineJoin = 'round'; c.lineCap = 'butt';
      /* провідники: старий колір, за фронтом — новий; на фронті яскравий «комета» */
      c.lineWidth = lw / s;
      const heads = [];
      for (const id of NET_ORDER) {
        const net = NETS[id], st = state[id];
        for (const pa of net.paths) {
          c.strokeStyle = st.base ? cOn : cOff; strokeRange(c, pa.p, 0, pa.len);
          for (const e of st.ev) {
            const f = (t - e.t0) * V - pa.off; if (f <= 0) continue;
            c.strokeStyle = e.val ? cOn : cOff; strokeRange(c, pa.p, 0, Math.min(f, pa.len));
            if (f < pa.len + 14) heads.push({ pa, f });
          }
        }
      }
      for (const { pa, f } of heads) {            // фронт: золота «комета», що тане, і яскрава іскра
        c.strokeStyle = col.gold; const N = 7, Ln = 26;
        for (let i = 0; i < N; i++) {
          const u = 1 - i / N; c.globalAlpha = Math.pow(u, 1.7) * .95; c.lineWidth = (lw + .9 * u) / s;
          strokeRange(c, pa.p, clamp(f - (i + 1) * Ln / N, 0, pa.len), clamp(f - i * Ln / N, 0, pa.len));
        }
        c.globalAlpha = 1;
        if (f < pa.len) {
          const p = pa.p; let i = 0; while (i < p.length - 2 && p[i + 1].d < f) i++;
          const u = p[i + 1].d > p[i].d ? (f - p[i].d) / (p[i + 1].d - p[i].d) : 0, hx = lerp(p[i].x, p[i + 1].x, u), hy = lerp(p[i].y, p[i + 1].y, u);
          glow(c, col, col.gold, 8); c.fillStyle = col.dark ? col.ink : col.gold; c.beginPath(); c.arc(hx, hy, 2.1 / s, 0, 6.2832); c.fill(); noGlow(c);
          if (!col.dark) { c.strokeStyle = col.ph; c.lineWidth = .7 / s; c.stroke(); }
        }
      }
      /* вузли розгалужень */
      for (const id of NET_ORDER) for (const d of NETS[id].dots) { c.fillStyle = valueAt(id, d.d, t) ? cOn : cOff; c.beginPath(); c.arc(d.x, d.y, 2.5, 0, 6.2832); c.fill(); }

      /* вентилі: контур — гравюра, заливка фосфором, коли вихід = 1 */
      c.lineWidth = gw / s;
      for (const g of Object.values(gates)) {
        const lv = level(g.out, 0, t, .26);
        c.globalAlpha = lv * (col.dark ? .17 : .075); c.fillStyle = cOn; c.fill(g.path); c.globalAlpha = 1;
        c.strokeStyle = col.ink2; c.stroke(g.path); if (g.arc) c.stroke(g.arc);
      }
      c.restore();

      /* площадки входів і світлодіоди виходів (екранні пікселі) */
      const fs = clamp(11.4 * s, 9, 16), pad = clamp(17 * s, 13, 24);
      c.textBaseline = 'middle'; c.textAlign = 'center';
      for (const [id, [px, py]] of Object.entries(INPUT_PAD)) {
        const lv = level(id, 0, t, .2), x = ox + px * s, y = oy + py * s;
        c.lineWidth = 1.1;
        c.beginPath(); c.roundRect(x - pad / 2, y - pad / 2, pad, pad, 3); c.strokeStyle = col.ink2; c.fillStyle = cOn;
        c.globalAlpha = lv; c.fill(); c.globalAlpha = 1; c.stroke();
        mono(c, clamp(pad * .62, 8, 14), 500); c.fillStyle = lv > .5 ? col.bg : col.ink2; c.fillText(String(inp[id]), x, y + .5);
        c.fillStyle = col.ink; c.textAlign = 'left';
        label(c, id === 'C' ? 'C' : id, id === 'C' ? 'in' : '', x - pad / 2 - 8 * Math.max(.7, s), y, fs, 'r'); c.textAlign = 'center';
      }
      for (const [id, [lx, ly]] of Object.entries(LEDS)) {
        const net = id === 'S' ? 'S' : 'CO', lv = level(net, sinkD(net), t, .32), x = ox + lx * s, y = oy + ly * s, r = LEDR * s;
        c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.lineWidth = 1.2; c.strokeStyle = col.ink2; c.stroke();
        if (lv > .01) {
          c.globalAlpha = lv * .25; c.fillStyle = cOn; c.beginPath(); c.arc(x, y, r * 1.7, 0, 6.2832); c.fill();
          c.globalAlpha = lv; glow(c, col, col.ph, 9); c.beginPath(); c.arc(x, y, r * .72, 0, 6.2832); c.fill(); noGlow(c); c.globalAlpha = 1;
        }
        c.fillStyle = col.ink; c.textAlign = 'left';
        label(c, id === 'S' ? 'S' : 'C', id === 'S' ? '' : 'out', x + r + 8 * Math.max(.7, s), y, fs, 'l');
      }
      /* позначення вентилів над ними */
      if (s > .62) {
        mono(c, clamp(8 * s, 7, 11)); c.fillStyle = col.ink3; c.textAlign = 'center';
        for (const g of Object.values(gates)) c.fillText(g.cap, ox + (g.x + GW / 2) * s, oy + (g.y - GH / 2 - 7) * s);
      }

      const a = inp, so = valueAt('S', sinkD('S'), t), co = valueAt('CO', sinkD('CO'), t);
      return { tl: 'FULL ADDER', tr: `A B Cin = ${a.A} ${a.B} ${a.C}`, bl: `S = ${so} · Cout = ${co}`, br: 't_pd 3 gates' };
    },
  };
}
export const __dbg = () => ({ NETS, GATES });
