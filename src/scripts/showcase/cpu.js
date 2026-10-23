// Експонат «ПРОЦЕСОР»: розкрита мікросхема QFP. Чорний епоксидний корпус із золотими виводами, відкрита порожнина,
// у ній кристал на майданчику, золоті ламелі рамки виводів і тонкі дроти розварки. На кристалі — план блоків,
// що «гріються» від команд машини, тактове H-дерево з імпульсом на кожному такті й чіп-арт КІ-Рекса.
// Важкий статичний шар кешується в offscreen-канвасі; динаміка (тепло блоків, імпульс, виводи) — поверх нього.
import { TAU, clamp, lerp, smooth, easeOut, hex, mono, rex } from './kit.js';

const rgbOf = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(x => x + x).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${+a.toFixed(3)})`;
const mix = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
const rng = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

const KEYS = ['L1I', 'L1D', 'REG', 'ALU', 'CU', 'PLL', 'IO'];
const SIDES = ['t', 'b', 'l', 'r'];
const STILL = { L1I: .38, L1D: .16, REG: .95, ALU: .55, CU: .62, PLL: .5, IO: .1 };   // показовий статичний кадр
const STILL_OUT = 0xA5, STILL_ADDR = 0b0101;
const CYC = 2.3, LEAD = .7, FRONT0 = .15, TP = 1.15, PW = .3;   // цикл команди, затримка першого циклу, старт і тривалість проходу фронту (с), ширина імпульсу (частка шляху)

/** Геометрія: усе виводиться з W, H. Корпус разом із виводами — у смузі між HUD, по центру. */
function layout(W, H) {
  const top = 40, bot = H - 36, Th = Math.max(70, bot - top);
  const ar = clamp(1 + (250 - Th) / 420, 1, 1.28), Tw = Math.min(Th * ar, W - 24);
  const cx = W / 2, cy = (top + bot) / 2, ll = Math.max(8, Th * .1);
  const bw = Tw - 2 * ll, bh = Th - 2 * ll, bx = cx - bw / 2, by = cy - bh / 2;
  const ring = Math.max(11, bh * .085), wx = bx + ring, wy = by + ring, ww = bw - 2 * ring, wh = bh - 2 * ring;
  const fl = clamp(Math.min(ww, wh) * .11, 6, 20), mg = fl * 1.6;
  const dx = wx + mg, dy = wy + mg, dw = ww - 2 * mg, dh = wh - 2 * mg, dm = Math.min(dw, dh);
  const pr = clamp(dm * .085, 3.2, 8), ci = pr + 3, core = { x: dx + ci, y: dy + ci, w: dw - 2 * ci, h: dh - 2 * ci };
  const cm = Math.min(core.w, core.h), big = cm >= 70, p = clamp(cm * .034, 1.5, 3.3);
  const nx = clamp(2 * Math.round(bw * .8 / 32), 8, 12), ny = clamp(2 * Math.round(bh * .8 / 32), 6, 12);
  // виводи, ламелі, контактні площадки й дроти: 4 боки
  const pins = {};
  const rc = (vert, e, a0, a1, c, wd) => { const p0 = e + a0, p1 = e + a1, lo = Math.min(p0, p1), len = Math.abs(p1 - p0); return vert ? { x: c - wd / 2, y: lo, w: wd, h: len } : { x: lo, y: c - wd / 2, w: len, h: wd }; };
  const pt = (vert, e, a, c) => (vert ? { x: c, y: e + a } : { x: e + a, y: c });
  for (const side of SIDES) {
    const vert = side === 't' || side === 'b', s = side === 't' || side === 'l' ? -1 : 1, n = vert ? nx : ny;
    const eB = { t: by, b: by + bh, l: bx, r: bx + bw }[side], eW = { t: wy, b: wy + wh, l: wx, r: wx + ww }[side], eD = { t: dy, b: dy + dh, l: dx, r: dx + dw }[side];
    const spanB = vert ? [bx + bw * .1, bw * .8] : [by + bh * .1, bh * .8], spanW = vert ? [wx + ww * .13, ww * .74] : [wy + wh * .13, wh * .74], spanD = vert ? [dx + dw * .07, dw * .86] : [dy + dh * .07, dh * .86];
    const lw = spanB[1] / n * .46, fw = spanW[1] / n * .38;
    pins[side] = Array.from({ length: n }, (_, i) => {
      const cb = spanB[0] + spanB[1] * (i + .5) / n, cw = spanW[0] + spanW[1] * (i + .5) / n, cd = spanD[0] + spanD[1] * (i + .5) / n;
      const tip = pt(vert, eW, -s * fl, cw), pad = pt(vert, eD, -s * pr * .5, cd), fi = (i + .5) / n * 2 - 1;
      const dxv = tip.x - pad.x, dyv = tip.y - pad.y, len = Math.hypot(dxv, dyv) || 1, bow = fi * len * .1;   // дрот прогинається: країні — сильніше
      return { side, i, vert, s, lead: rc(vert, eB, -s * 2, s * ll, cb, lw), fin: rc(vert, eW, 0, -s * fl, cw, fw), tip, pad,
        wire: { x0: pad.x, y0: pad.y, cx: (pad.x + tip.x) / 2 - dyv / len * bow, cy: (pad.y + tip.y) / 2 + dxv / len * bow, x1: tip.x, y1: tip.y }, lw, fw };
    });
  }
  // чіп-арт: Рекс на табличці в куті кристала (піксель спрайта 1 або ½ — на малих екранах)
  const rpx = cm < 62 ? .5 : 1, plw = 22 * rpx + 5, plh = 18 * rpx + 5;
  const plaque = { x: core.x + core.w - plw, y: core.y + core.h - plh, w: plw, h: plh, px: rpx };
  // план блоків (одиниці ядра, проміжок між блоками .08)
  const cu = (u, v) => [core.x + u * core.w, core.y + v * core.h];
  const R = (u, v, w, h) => { const [x, y] = cu(u, v); return { x, y, w: w * core.w, h: h * core.h }; };
  const ioX = core.x + .54 * core.w, ioW = Math.max(4, plaque.x - 3 - ioX), cuH = Math.max(core.h * .12, plaque.y - 3 - (core.y + .54 * core.h));
  const strip = big ? .1 : 0;                                              // смужка під підпис «CE» унизу ліворуч
  const blk = {
    L1I: { ...R(0, 0, .46, .46), lab: 'L1I' }, L1D: { ...R(0, .54, .46, .46 - strip), lab: 'L1D' },
    REG: { ...R(.54, 0, .46, .19), lab: 'REG' }, ALU: { ...R(.54, .23, .46, .23), lab: 'ALU' },
    CU: { x: ioX, y: core.y + .54 * core.h, w: core.x + core.w - ioX, h: cuH, lab: 'CU' },
    IO: { x: ioX, y: plaque.y, w: ioW, h: plaque.h, lab: 'IO' },
  };
  const [pcx, pcy] = cu(.5, .5), pll = { x: pcx, y: pcy, r: clamp(cm * .075, 2.6, 8) };
  // тактове H-дерево: кожне ребро — від батьківського вузла до дочірнього; d — довжина шляху від PLL
  const edges = [], sinks = [];
  const grow = (px, py, lev, d0) => {
    if (lev > 3) return;
    const horiz = lev % 2 === 0, half = (lev < 2 ? .25 : .125) * (horiz ? core.w : core.h);
    for (const sg of [-1, 1]) {
      const qx = px + (horiz ? sg * half : 0), qy = py + (horiz ? 0 : sg * half), e = { x0: px, y0: py, x1: qx, y1: qy, d0, d1: d0 + half };
      if (lev === 3) {                                                       // листок під табличкою Рекса: лінія закінчується на її краї
        if (qx > plaque.x - 1 && qy > plaque.y) { e.y1 = plaque.y - .5; e.rex = true; } else sinks.push({ x: qx, y: qy });
      }
      if (Math.hypot(e.x1 - e.x0, e.y1 - e.y0) > .5) edges.push(e);
      grow(qx, qy, lev + 1, d0 + half);
    }
  };
  grow(pcx, pcy, 0, 0);
  const dTot = .375 * (core.w + core.h);
  edges.forEach(e => { const full = Math.hypot(e.x1 - e.x0, e.y1 - e.y0), orig = e.d1 - e.d0; e.d0 /= dTot; e.d1 = (e.d0 * dTot + (e.rex ? Math.min(full, orig) : orig)) / dTot; });
  return { W, top, bot, x0: bx - ll, x1: bx + bw + ll, bx, by, bw, bh, ll, ring, wx, wy, ww, wh, fl, dx, dy, dw, dh, dm, pr, core, big, p, nx, ny, pins, plaque, blk, pll, edges, sinks, cx, cy };
}

/** Кольори «фізичних» речей і гравіювання кристала; усе — похідне від env.col */
function palette(col) {
  const d = col.dark, gold = rgbOf(col.gold), gi = rgbOf(col.goldInk), ph = rgbOf(col.ph);
  return {
    d, gold, ph, goldHi: mix(gold, [255, 244, 214], .55), goldLo: mix(gold, [48, 28, 8], .5),
    ink: d ? gold : gi,
    die0: d ? [47, 40, 32] : [224, 213, 188], die1: d ? [23, 19, 16] : [183, 165, 128],
    hot: d ? mix(ph, [255, 246, 214], .6) : [255, 233, 172], lead: d ? mix(ph, [255, 246, 214], .5) : ph, plaque: d ? [14, 12, 10] : [74, 61, 44], rexC: mix(gold, [255, 244, 214], .22),
    body0: d ? [46, 40, 35] : [44, 37, 32], body1: d ? [24, 20, 18] : [20, 16, 14], mark: [214, 205, 190],
  };
}

/** Тексторні «гравіювання» блоків кристала: кожен — своя структура, як на мікрофотографії */
const TEX = {
  L1I(c, x, y, w, h, p, P) {                                                  // SRAM: комірки з просвітами-декодерами
    const cs = p * .5; c.fillStyle = rgba(P.ink, .5);
    for (let yy = y + p * .8, r = 0; yy < y + h - p * .5; yy += p, r++) { if (r % 6 === 5) continue; for (let xx = x + p * .8, q = 0; xx < x + w - p * .5; xx += p, q++) if (q % 6 !== 5) c.fillRect(xx, yy, cs, cs); }
  },
  L1D(c, x, y, w, h, p, P) {                                                  // SRAM інакшого кроку: горизонтальні штрихи
    c.fillStyle = rgba(P.ink, .5);
    for (let yy = y + p * .8, r = 0; yy < y + h - p * .5; yy += p * .85, r++) { if (r % 7 === 6) continue; for (let xx = x + p * .6, q = 0; xx < x + w - p * 1.2; xx += p * 1.35, q++) if (q % 5 !== 4) c.fillRect(xx, yy, p * .95, p * .34); }
  },
  REG(c, x, y, w, h, p, P) {                                                  // 8 розрядів: колонки комірок
    const n = 8, cw = w / n; c.strokeStyle = rgba(P.ink, .38); c.lineWidth = .5; c.beginPath();
    for (let i = 1; i < n; i++) { c.moveTo(x + i * cw, y + 1); c.lineTo(x + i * cw, y + h - 1); } c.stroke();
    c.fillStyle = rgba(P.ink, .5);
    for (let i = 0; i < n; i++) for (let yy = y + p * .9; yy < y + h - p * .7; yy += p * 1.15) c.fillRect(x + i * cw + cw * .26, yy, cw * .48, p * .4);
  },
  ALU(c, x, y, w, h, p, P, big) {                                             // знак АЛП (трапеція з виїмкою) і штриховка
    c.save(); c.beginPath();
    c.moveTo(x + .1 * w, y + .12 * h); c.lineTo(x + .4 * w, y + .12 * h); c.lineTo(x + .5 * w, y + .4 * h); c.lineTo(x + .6 * w, y + .12 * h); c.lineTo(x + .9 * w, y + .12 * h);
    c.lineTo(x + .76 * w, y + .88 * h); c.lineTo(x + .24 * w, y + .88 * h); c.closePath();
    c.strokeStyle = rgba(P.ink, .6); c.lineWidth = .6; c.stroke(); c.clip();
    c.strokeStyle = rgba(P.ink, .3); c.lineWidth = .5; c.beginPath();
    for (let k = -h; k < w; k += p * 1.7) { c.moveTo(x + k, y + h); c.lineTo(x + k + h, y); } c.stroke(); c.restore();
  },
  CU(c, x, y, w, h, p, P) {                                                   // «випадкова» логіка: рядки стандартних комірок
    const r = rng(7); c.fillStyle = rgba(P.ink, .46);
    for (let yy = y + p * .7; yy < y + h - p * .8; yy += p * 1.15) { let xx = x + p * .6; while (xx < x + w - p) { const cw = p * (.6 + r() * 2.2); if (r() > .22) c.fillRect(xx, yy, Math.min(cw, x + w - p * .6 - xx), p * .5); xx += cw + p * .4; } }
  },
  IO(c, x, y, w, h, p, P) {                                                   // вихідні буфери: два ряди комірок
    c.fillStyle = rgba(P.ink, .5); const cw = Math.max(1.6, w / 4);
    for (let yy = y + p * .8; yy < y + h - p; yy += p * 1.7) for (let xx = x + p * .7; xx < x + w - cw * .5; xx += cw + p * .5) c.fillRect(xx, yy, cw, p * .8);
  },
};

export default function (env) {
  const m = env.m;
  // власний повільний ритм: один цикл команди — 2,3 с, перший починається ~0,7 с після появи; такт машини (0,4 с) візуально не відстежується
  let lastEv = null, cyc = null, prevCyc = null, lastK = -1, t0 = 0, frozen = false, S = null;
  const bell = (a, s, att, hold, rel) => {                                   // м'який «дзвін»: плавний підйом, пауза, косинусний спад
    a -= s; if (a < 0) return 0; if (a < att) return smooth(0, att, a); if (a < att + hold) return 1;
    const b = (a - att - hold) / rel; return b < 1 ? .5 * (1 + Math.cos(Math.PI * b)) : 0;
  };
  /** Стадії команди: [ключ, початок, наростання, пауза, спад, амплітуда] — вибірка, декодування, регістри, АЛП, запис; блоки гріються по черзі */
  function plan(ev) {
    const op = ev.op, a = [['CLK', 0, .55, .1, .9, .8], ['PLL', .05, .45, .1, .9, .8], ['L1I', .2, .55, .1, 1.1, .7], ['CU', .7, .5, .15, 1.1, .85]];
    const rd = ['REG', 1.0, .45, 0, .6, .5], wr = ['REG', 1.85, .45, .1, 1.1, .9];
    if (op === 'LDI') a.push(['REG', 1.2, .5, .2, 1.1, .85]);
    if (op === 'SHL' || op === 'XOR' || op === 'INC') a.push(rd, ['ALU', 1.3, .5, .2, 1.1, 1], wr);
    if (op === 'ST') a.push(rd, ['L1D', 1.5, .5, .25, 1.1, 1], ['A', 1.55, .5, .25, 1.0, .9]);
    if (op === 'OUT') a.push(rd, ['IO', 1.5, .5, .25, 1.1, 1], ['D', 1.55, .5, .25, 1.0, .9]);
    if (op === 'JMP' || op === 'JNC') a.push(['CU', 1.2, .45, .1, 1.0, 1], ['L1I', 1.6, .5, .1, 1.1, .8]);
    return a;
  }
  const snap = (t, ev) => ({ t, ev, A: m.A, X: m.X, plan: plan(ev) });
  const nowEv = () => lastEv ?? m.last ?? { pc: m.pc, op: 'LDI' };
  const lv = Object.fromEntries(KEYS.map(k => [k, 0])), pD = new Float32Array(8), pA = new Float32Array(4);

  /* ── статичний шар: корпус, порожнина, кристал, дроти ── */
  function build(L, P, W, H, D) {
    const k = document.createElement('canvas'); k.width = Math.round(W * D); k.height = Math.round(H * D);
    const c = k.getContext('2d'); c.setTransform(D, 0, 0, D, 0, 0);
    const { bx, by, bw, bh, ring, ll } = L, gold = P.gold;
    const path = (x, y, w, h, r, ch) => { const q = new Path2D(); q.moveTo(x + ch, y); q.lineTo(x + w - r, y); q.arcTo(x + w, y, x + w, y + r, r); q.lineTo(x + w, y + h - r); q.arcTo(x + w, y + h, x + w - r, y + h, r); q.lineTo(x + r, y + h); q.arcTo(x, y + h, x, y + h - r, r); q.lineTo(x, y + ch); q.closePath(); return q; };
    const chamf = ring * .62;
    // м'яка тінь на екрані
    c.save(); c.shadowColor = P.d ? 'rgba(0,0,0,.7)' : 'rgba(40,28,14,.38)'; c.shadowBlur = Math.max(8, bw * .09); c.shadowOffsetY = Math.max(3, bw * .02);
    c.fillStyle = '#100D0B'; c.fill(path(bx, by, bw, bh, 3, chamf)); c.restore();
    // виводи: золото з відблиском; біля корпусу — тінь, на ступні — світліше
    c.fillStyle = P.d ? 'rgba(0,0,0,.45)' : 'rgba(60,40,16,.2)';
    for (const side of SIDES) for (const q of L.pins[side]) c.fillRect(q.lead.x + 1.2, q.lead.y + 1.8, q.lead.w, q.lead.h);
    for (const side of SIDES) for (const q of L.pins[side]) {
      const { lead: r, vert, s } = q, edge = vert ? (s < 0 ? r.y + r.h : r.y) : (s < 0 ? r.x + r.w : r.x);
      const g = vert ? c.createLinearGradient(0, edge, 0, edge + s * ll) : c.createLinearGradient(edge, 0, edge + s * ll, 0);
      g.addColorStop(0, rgba(P.goldLo, 1)); g.addColorStop(.3, rgba(gold, 1)); g.addColorStop(.62, rgba(mix(gold, P.goldHi, .3), 1)); g.addColorStop(1, rgba(P.goldHi, 1));
      c.fillStyle = g; c.fillRect(r.x, r.y, r.w, r.h);
      c.fillStyle = 'rgba(255,248,226,.34)';                                  // відблиск уздовж осі виводу
      if (vert) c.fillRect(r.x + r.w * .3, r.y, Math.max(.6, r.w * .2), r.h); else c.fillRect(r.x, r.y + r.h * .3, r.w, Math.max(.6, r.h * .2));
      c.fillStyle = 'rgba(0,0,0,.28)';                                        // ребро знизу
      if (vert) c.fillRect(r.x + r.w - .6, r.y, .6, r.h); else c.fillRect(r.x, r.y + r.h - .6, r.w, .6);
    }
    // корпус: темний борт і світліша грань із фаскою
    c.fillStyle = rgba(mix(P.body1, [0, 0, 0], .35), 1); c.fill(path(bx, by, bw, bh, 3, chamf));
    const fg = c.createLinearGradient(bx, by, bx + bw, by + bh); fg.addColorStop(0, rgba(P.body0, 1)); fg.addColorStop(1, rgba(P.body1, 1));
    c.fillStyle = fg; c.fill(path(bx + 1.6, by + 1.6, bw - 3.2, bh - 3.2, 2, chamf - 1));
    const eg = c.createLinearGradient(bx, by, bx + bw, by + bh); eg.addColorStop(0, 'rgba(255,242,215,.42)'); eg.addColorStop(.5, 'rgba(255,242,215,.07)'); eg.addColorStop(1, 'rgba(255,242,215,.14)');
    c.strokeStyle = eg; c.lineWidth = 1; c.stroke(path(bx + .5, by + .5, bw - 1, bh - 1, 3, chamf));
    c.strokeStyle = 'rgba(255,242,215,.07)'; c.stroke(path(bx + 2.1, by + 2.1, bw - 4.2, bh - 4.2, 2, chamf - 1));
    // ключ першого виводу: заглибина біля зрізаного кута; маркування
    const kr = Math.max(1.8, ring * .2), kx = bx + ring * .62, ky = by + ring * .62 + 1;
    const kg = c.createRadialGradient(kx - kr * .3, ky - kr * .3, 0, kx, ky, kr * 1.3); kg.addColorStop(0, 'rgba(0,0,0,.75)'); kg.addColorStop(1, 'rgba(0,0,0,.2)');
    c.fillStyle = kg; c.beginPath(); c.arc(kx, ky, kr, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,242,215,.22)'; c.lineWidth = .6; c.stroke();
    const fs = clamp(ring * .5, 5.4, 9);
    mono(c, fs, 600); c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = rgba(P.mark, .82);
    if ('letterSpacing' in c) c.letterSpacing = (fs * .06).toFixed(2) + 'px';
    c.fillText('KI-01 · KNU', bx + ring * 1.15, by + ring * .52 + .5);
    c.textAlign = 'right'; c.fillStyle = rgba(P.mark, .42); if (L.bw > 140) c.fillText('2643', bx + bw - ring * .6, by + bh - ring * .5);
    if ('letterSpacing' in c) c.letterSpacing = '0px';
    // порожнина: підлога, уступ, внутрішні тіні
    const { wx, wy, ww, wh } = L;
    c.fillStyle = '#0A0807'; c.beginPath(); c.roundRect(wx, wy, ww, wh, 2.5); c.fill();
    const cg = c.createRadialGradient(wx + ww / 2, wy + wh / 2, 0, wx + ww / 2, wy + wh / 2, Math.max(ww, wh) * .62); cg.addColorStop(0, 'rgba(255,236,196,.07)'); cg.addColorStop(1, 'rgba(255,236,196,0)');
    c.fillStyle = cg; c.beginPath(); c.roundRect(wx, wy, ww, wh, 2.5); c.fill();
    c.lineWidth = 1.6; c.strokeStyle = 'rgba(0,0,0,.7)'; c.beginPath(); c.moveTo(wx + 1, wy + wh - 1); c.lineTo(wx + 1, wy + 1); c.lineTo(wx + ww - 1, wy + 1); c.stroke();
    c.lineWidth = .8; c.strokeStyle = rgba(gold, .4); c.beginPath(); c.roundRect(wx - .6, wy - .6, ww + 1.2, wh + 1.2, 3); c.stroke();   // золотий уступ під кришку
    // майданчик під кристал і ребра-перемички до кутів
    const pm = 3.5, px0 = L.dx - pm, py0 = L.dy - pm, pw0 = L.dw + 2 * pm, ph0 = L.dh + 2 * pm;
    c.strokeStyle = rgba(gold, .5); c.lineWidth = Math.max(1, L.fl * .08); c.beginPath();
    for (const [ax, ay, ex, ey] of [[px0, py0, wx + 1, wy + 1], [px0 + pw0, py0, wx + ww - 1, wy + 1], [px0, py0 + ph0, wx + 1, wy + wh - 1], [px0 + pw0, py0 + ph0, wx + ww - 1, wy + wh - 1]]) { c.moveTo(ax, ay); c.lineTo(ex, ey); }
    c.stroke();
    c.fillStyle = rgba(gold, .16); c.strokeStyle = rgba(gold, .62); c.lineWidth = .8; c.beginPath(); c.roundRect(px0, py0, pw0, ph0, 2); c.fill(); c.stroke();
    // ламелі рамки виводів
    for (const side of SIDES) for (const q of L.pins[side]) {
      const f = q.fin, g2 = q.vert ? c.createLinearGradient(f.x, 0, f.x + f.w, 0) : c.createLinearGradient(0, f.y, 0, f.y + f.h);
      g2.addColorStop(0, rgba(P.goldLo, 1)); g2.addColorStop(.45, rgba(P.goldHi, 1)); g2.addColorStop(1, rgba(gold, 1));
      c.fillStyle = g2; c.beginPath(); c.roundRect(f.x, f.y, f.w, f.h, Math.min(f.w, f.h) * .3); c.fill();
    }
    // кристал: підкладка, сяйво, гравірована сітка металу, подвійне кільце-захист
    const { dx, dy, dw, dh, pr, core, p } = L;
    const dg = c.createLinearGradient(dx, dy, dx + dw, dy + dh); dg.addColorStop(0, rgba(P.die0, 1)); dg.addColorStop(1, rgba(P.die1, 1));
    c.fillStyle = dg; c.fillRect(dx, dy, dw, dh);
    c.save(); c.beginPath(); c.rect(dx, dy, dw, dh); c.clip();
    c.strokeStyle = rgba(P.ink, .07); c.lineWidth = .5; c.beginPath();
    for (let x = dx + p; x < dx + dw; x += p * 1.6) { c.moveTo(x, dy); c.lineTo(x, dy + dh); }
    for (let y = dy + p; y < dy + dh; y += p * 1.6) { c.moveTo(dx, y); c.lineTo(dx + dw, y); }
    c.stroke(); c.restore();
    c.strokeStyle = rgba(P.ink, .85); c.lineWidth = .8; c.strokeRect(dx + .4, dy + .4, dw - .8, dh - .8);
    c.strokeStyle = rgba(P.ink, .4); c.lineWidth = .5; c.strokeRect(core.x - 2.2, core.y - 2.2, core.w + 4.4, core.h + 4.4);
    // контактні площадки
    for (const side of SIDES) for (const q of L.pins[side]) {
      const sz = clamp(Math.min(q.fw * 1.1, pr * .8), 2, 4.6);
      c.fillStyle = rgba(P.goldLo, 1); c.fillRect(q.pad.x - sz / 2 - .4, q.pad.y - sz / 2 - .4, sz + .8, sz + .8);
      c.fillStyle = rgba(P.goldHi, 1); c.fillRect(q.pad.x - sz / 2, q.pad.y - sz / 2, sz, sz);
    }
    // блоки
    for (const key of KEYS) {
      const b = L.blk[key]; if (!b) continue;
      c.fillStyle = rgba(P.ink, P.d ? .06 : .08); c.fillRect(b.x, b.y, b.w, b.h);
      c.strokeStyle = rgba(P.ink, .7); c.lineWidth = .7; c.strokeRect(b.x + .35, b.y + .35, b.w - .7, b.h - .7);
      c.save(); c.beginPath(); c.rect(b.x + 1, b.y + 1, b.w - 2, b.h - 2); c.clip();
      mono(c, 5.2, 600); const fit = L.big && b.h >= 12 && c.measureText(b.lab).width + 5 < b.w, off = fit ? (b.h >= 16 ? 8 : 7) : 0;
      TEX[key]?.(c, b.x, b.y + off, b.w, b.h - off, p, P, L.big);
      if (fit) { c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = rgba(P.ink, .85); if ('letterSpacing' in c) c.letterSpacing = '.3px'; c.fillText(b.lab, b.x + 2.5, b.y + 6.4); if ('letterSpacing' in c) c.letterSpacing = '0px'; }
      c.restore();
    }
    // тактове дерево (основа) і листки
    c.strokeStyle = rgba(P.ph, P.d ? .3 : .34); c.lineWidth = .7; c.beginPath();
    for (const e of L.edges) { c.moveTo(e.x0, e.y0); c.lineTo(e.x1, e.y1); } c.stroke();
    c.fillStyle = rgba(P.ph, .55); for (const s of L.sinks) c.fillRect(s.x - 1.1, s.y - 1.1, 2.2, 2.2);
    // PLL — вузол у центрі, з якого розходиться дерево
    const { pll } = L;
    c.fillStyle = rgba(P.die1, 1); c.beginPath(); c.arc(pll.x, pll.y, pll.r + 1.2, 0, TAU); c.fill();
    c.strokeStyle = rgba(P.ink, .85); c.lineWidth = .7; c.beginPath(); c.arc(pll.x, pll.y, pll.r, 0, TAU); c.stroke();
    c.strokeStyle = rgba(P.ink, .5); c.lineWidth = .5; c.beginPath();
    if (pll.r > 4) { for (let i = 0; i <= 16; i++) { const xx = pll.x - pll.r * .62 + pll.r * 1.24 * i / 16, yy = pll.y + Math.sin(i / 16 * TAU) * pll.r * .28; i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } } else { c.arc(pll.x, pll.y, pll.r * .4, 0, TAU); }
    c.stroke();
    // табличка чіп-арту: КІ-Рекс, витравлений золотом
    const pq = L.plaque;
    c.fillStyle = rgba(P.plaque, 1); c.fillRect(pq.x, pq.y, pq.w, pq.h);
    c.strokeStyle = rgba(P.ink, .7); c.lineWidth = .6; c.strokeRect(pq.x + .3, pq.y + .3, pq.w - .6, pq.h - .6);
    L.rexAt = { x: pq.x + 2.5 - 3 * pq.px, y: pq.y + 2.5 - 5 * pq.px };
    rex(c, L.rexAt.x, L.rexAt.y, pq.px, rgba(P.rexC, 1));
    // «CE» — підпис майстра під кеш-пам'яттю даних
    if (L.big) {
      const b = L.blk.L1D, yy = b.y + b.h + 2;
      mono(c, 6.2, 700); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = rgba(P.ink, .6); if ('letterSpacing' in c) c.letterSpacing = '1px';
      c.fillText('CE', core.x + 1, yy + (core.y + core.h - yy) / 2); if ('letterSpacing' in c) c.letterSpacing = '0px';
      c.strokeStyle = rgba(P.ink, .35); c.lineWidth = .5; c.beginPath(); c.moveTo(core.x + 15, yy + (core.y + core.h - yy) / 2); c.lineTo(b.x + b.w, yy + (core.y + core.h - yy) / 2); c.stroke();
    }
    // дроти розварки: тінь (висота над кристалом), золото, кулька на площадці й клин на ламелі
    for (const side of SIDES) for (const q of L.pins[side]) {
      const w = q.wire;
      c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = .9; c.beginPath(); c.moveTo(w.x0 + 1, w.y0 + 1.6); c.quadraticCurveTo(w.cx + 1, w.cy + 1.6, w.x1 + 1, w.y1 + 1.6); c.stroke();
      c.strokeStyle = rgba(mix(gold, P.goldHi, .5), 1); c.lineWidth = .95; c.beginPath(); c.moveTo(w.x0, w.y0); c.quadraticCurveTo(w.cx, w.cy, w.x1, w.y1); c.stroke();
      c.fillStyle = rgba(P.goldHi, 1); c.beginPath(); c.arc(w.x0, w.y0, Math.max(.9, L.pr * .17), 0, TAU); c.fill();
      c.beginPath(); c.arc(w.x1, w.y1, .75, 0, TAU); c.fill();
    }
    annotate(c, L);
    return { k, key: `${W}|${H}|${D}|${env.gen}`, L, P };
  }

  /* креслярські позначки на полях, як на кресленні з паспорта мікросхеми: габарит, крок виводів, тип корпуса */
  function annotate(c, L) {
    const col = env.col, room = L.x0, ink = rgbOf(col.ink3), uk = env.L === 'uk', num = v => String(v).replace('.', uk ? ',' : '.');
    if (room < 44) return;
    const fs = room < 70 ? 7 : 8;
    const arrow = (x, y, dx, dy) => { const a = 3.2, b = 1.3; c.beginPath(); c.moveTo(x, y); c.lineTo(x - dx * a - dy * b, y - dy * a + dx * b); c.lineTo(x - dx * a + dy * b, y - dy * a - dx * b); c.closePath(); c.fill(); };
    c.save(); c.strokeStyle = rgba(ink, .55); c.fillStyle = rgba(ink, .7); c.lineWidth = .6; c.lineCap = 'butt';
    mono(c, fs, 500); if ('letterSpacing' in c) c.letterSpacing = '.4px'; c.textBaseline = 'middle';
    // габарит корпуса по висоті (праворуч)
    const xr = L.x1 + Math.min(18, room * .22), ymm = 10 * L.bh / L.bw, lab = num(+ymm.toFixed(1)) + ' mm';
    c.beginPath(); c.moveTo(L.bx + L.bw + 3, L.by); c.lineTo(xr + 4, L.by); c.moveTo(L.bx + L.bw + 3, L.by + L.bh); c.lineTo(xr + 4, L.by + L.bh); c.moveTo(xr, L.by + 4); c.lineTo(xr, L.by + L.bh - 4); c.stroke();
    arrow(xr, L.by, 0, 1); arrow(xr, L.by + L.bh, 0, -1);
    c.save(); c.translate(xr + fs * .9 + 2, L.by + L.bh / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.fillStyle = rgba(ink, .85); c.fillText(lab, 0, 0); c.restore();
    // крок виводів (ліворуч): дві сусідні ніжки посередині
    const ls = L.pins.l, j = (ls.length >> 1) - 1, y0 = ls[j].lead.y + ls[j].lead.h / 2, y1 = ls[j + 1].lead.y + ls[j + 1].lead.h / 2, xl = L.x0 - Math.min(14, room * .18);
    c.beginPath(); c.moveTo(L.x0 - 2, y0); c.lineTo(xl - 4, y0); c.moveTo(L.x0 - 2, y1); c.lineTo(xl - 4, y1); c.moveTo(xl, y0 - 8); c.lineTo(xl, y1 + 8); c.stroke();
    arrow(xl, y0, 0, 1); arrow(xl, y1, 0, -1);
    c.textAlign = 'right'; c.fillStyle = rgba(ink, .85); c.fillText(num((Math.round(8 / L.nx / .05) * .05).toFixed(2).replace(/0$/, '')) + ' mm', xl - 5, (y0 + y1) / 2);
    // тип корпуса
    c.fillText('QFP-' + (2 * (L.nx + L.ny)), L.x0 - 6, L.by + 6);
    c.restore();
  }

  /* ── динаміка ── */
  const inten = (d, f) => { const x = (f - d) / PW; return x < 0 ? Math.exp(-((x * 2.2) ** 2)) : Math.exp(-x * 1.25); };

  function draw(c, W, H, t, dt) {
    const D = c.getTransform().a || 1, key = `${W}|${H}|${D}|${env.gen}`;
    if (!S || S.key !== key) { const L = layout(W, H), P = palette(env.col); S = build(L, P, W, H, D); }
    const { L, P } = S, { blk, pll } = L, hot = rgba(P.hot, 1), ph = P.ph;
    c.drawImage(S.k, 0, 0, W, H);
    // новий цикл: знімок поточної команди машини (далі машина йде своїм швидким ходом, а погляд — своїм)
    if (!frozen) { const k = Math.floor((t - t0 - LEAD) / CYC); if (k >= 0 && k > lastK) { lastK = k; prevCyc = cyc; cyc = snap(t0 + LEAD + k * CYC, nowEv()); } }
    // стадії -> рівні тепла блоків, виводів і положення фронту тактового імпульсу
    const fronts = [], cycles = frozen ? [] : [prevCyc, cyc].filter(Boolean);
    let clkH = 0, clkU = 0, uD = 0, uA = 0, ripple = [];
    for (const k of KEYS) lv[k] = frozen ? STILL[k] : 0;
    pD.fill(0); pA.fill(0);
    for (const cy of cycles) {
      const age = t - cy.t; if (age < 0 || age > 5) continue;
      const f = (age - FRONT0) / TP; if (f > -.1 && f < 3) fronts.push(f);
      if (age > .1 && age < 1.3) ripple.push((age - .1) / 1.2);
      for (const st of cy.plan) {
        const v = st[5] * bell(age, st[1], st[2], st[3], st[4]); if (v <= 0) continue;
        const k = st[0], u = smooth(0, .55, age - st[1]);
        if (k === 'CLK') { clkH = Math.max(clkH, v); clkU = u; }
        else if (k === 'D') { uD = u; for (let i = 0; i < 8; i++) if (cy.ev.out >> (7 - i) & 1) pD[i] = Math.max(pD[i], v); }
        else if (k === 'A') { uA = u; for (let i = 0; i < 4; i++) if (cy.ev.addr >> (3 - i) & 1) pA[i] = Math.max(pA[i], v); }
        else lv[k] = Math.max(lv[k], v);
      }
    }
    if (frozen) { fronts.push(.6); clkH = .35; clkU = 1; uD = uA = 1; for (let i = 0; i < 8; i++) pD[i] = STILL_OUT >> (7 - i) & 1 ? .7 : 0; for (let i = 0; i < 4; i++) pA[i] = STILL_ADDR >> (3 - i) & 1 ? .7 : 0; }

    // тепло блоків: радіальне світіння зсередини + рамка
    for (const k of KEYS) {
      const b = blk[k]; if (!b) continue;
      const h = Math.pow(lv[k], .8); if (h < .02) continue;
      const gx = b.x + b.w / 2, gy = b.y + b.h / 2, g = c.createRadialGradient(gx, gy, 0, gx, gy, Math.max(b.w, b.h) * .72);
      g.addColorStop(0, rgba(ph, (P.d ? .72 : .9) * h)); g.addColorStop(1, rgba(ph, (P.d ? .38 : .5) * h));
      c.globalCompositeOperation = P.d ? 'screen' : 'multiply'; c.fillStyle = g; c.fillRect(b.x + .7, b.y + .7, b.w - 1.4, b.h - 1.4); c.globalCompositeOperation = 'source-over';
      c.strokeStyle = rgba(ph, .25 + .7 * h); c.lineWidth = 1; c.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    }
    // PLL: серце такту — вузол і кільце-хвиля від нього
    const hp = lv.PLL;
    if (hp > .02) { c.fillStyle = rgba(ph, .35 * hp); c.beginPath(); c.arc(pll.x, pll.y, pll.r, 0, TAU); c.fill(); c.strokeStyle = rgba(ph, .35 + .6 * hp); c.lineWidth = .9; c.beginPath(); c.arc(pll.x, pll.y, pll.r, 0, TAU); c.stroke(); }
    for (const r of ripple) { c.strokeStyle = rgba(ph, (1 - r) ** 1.6 * .5); c.lineWidth = .8; c.beginPath(); c.arc(pll.x, pll.y, pll.r + easeOut(r) * pll.r * 1.9, 0, TAU); c.stroke(); }

    // H-дерево: імпульс плавно біжить від PLL до листків; чотири рівні яскравості — чотири штрихи
    if (fronts.length) {
      const buckets = [[], [], [], []];
      for (const e of L.edges) {
        const n = 3, vx = (e.x1 - e.x0) / n, vy = (e.y1 - e.y0) / n;
        for (let i = 0; i < n; i++) {
          const dm = e.d0 + (e.d1 - e.d0) * (i + .5) / n; let v = 0;
          for (const f of fronts) v = Math.max(v, inten(dm, f));
          if (v < .06) continue;
          buckets[Math.min(3, Math.floor(v * 4))].push(e.x0 + vx * i, e.y0 + vy * i, e.x0 + vx * (i + 1), e.y0 + vy * (i + 1));
        }
      }
      c.lineCap = 'round';
      buckets.forEach((seg, bi) => {
        if (!seg.length) return;
        c.strokeStyle = rgba(ph, .3 + .7 * (bi + .5) / 4); c.lineWidth = 1 + bi * .12;
        if (bi === 3 && P.d) { c.shadowColor = rgba(ph, .9); c.shadowBlur = 5; }
        c.beginPath(); for (let i = 0; i < seg.length; i += 4) { c.moveTo(seg[i], seg[i + 1]); c.lineTo(seg[i + 2], seg[i + 3]); } c.stroke();
        c.shadowBlur = 0; c.shadowColor = 'transparent';
      });
      c.lineCap = 'butt';
    }
    // листки: усі спалахують водночас — дерево збалансоване
    let sinkI = 0; for (const f of fronts) sinkI = Math.max(sinkI, inten(1.04, f));
    if (sinkI > .04) { c.fillStyle = rgba(ph, Math.min(1, sinkI * 1.1)); if (P.d) { c.shadowColor = rgba(ph, .8); c.shadowBlur = 4; } for (const s of L.sinks) c.fillRect(s.x - 1.5, s.y - 1.5, 3, 3); c.shadowBlur = 0; c.shadowColor = 'transparent'; }
    // Рекс «прокидається» від такту
    if (sinkI > .04) { c.globalAlpha = Math.min(.8, sinkI * .75); rex(c, L.rexAt.x, L.rexAt.y, L.plaque.px, hot); c.globalAlpha = 1; }

    // активні виводи: ступінь «тепла» — на кожному виводі, ламелі, дроті й площадці
    const lit = (q, h, u = 1, inward = false) => {
      if (h < .03) return;
      const { lead: r, fin: f, wire: w } = q;   // струм біжить від кристала назовні (вихід) або досередини (вхід)
      let gx = r.x, gy = r.y, gw = r.w, gh = r.h;
      if (q.vert) { gh = r.h * u; gy = (q.s < 0) !== inward ? r.y + r.h - gh : r.y; } else { gw = r.w * u; gx = (q.s < 0) !== inward ? r.x + r.w - gw : r.x; }
      c.fillStyle = rgba(P.lead, Math.min(.95, h * 1.05)); if (P.d) { c.shadowColor = rgba(ph, .8); c.shadowBlur = 5 * h; } c.fillRect(gx, gy, gw, gh); c.shadowBlur = 0; c.shadowColor = 'transparent';
      c.fillStyle = rgba(P.hot, Math.min(.95, h)); c.fillRect(f.x, f.y, f.w, f.h);
      c.strokeStyle = rgba(P.hot, Math.min(1, h * 1.1)); c.lineWidth = 1; c.beginPath(); c.moveTo(w.x0, w.y0); c.quadraticCurveTo(w.cx, w.cy, w.x1, w.y1); c.stroke();
      c.fillStyle = rgba(P.hot, h); c.beginPath(); c.arc(w.x0, w.y0, 1.5, 0, TAU); c.fill();
    };
    const offD = (L.pins.b.length - 8) >> 1, offA = (L.pins.l.length - 4) >> 1;
    for (let i = 0; i < 8; i++) lit(L.pins.b[offD + i], pD[i], uD);
    for (let i = 0; i < 4; i++) lit(L.pins.l[offA + i], pA[i], uA);
    lit(L.pins.t[(L.pins.t.length >> 1) - 1], clkH, clkU, true);

    // ковзний відблиск по корпусу — раз на появу, спокійно (у статичному кадрі — застиглий)
    const u = frozen ? .3 : (t - t0 - 1) / 2.4;
    if (u > -.3 && u < 1.3) {
      const q = frozen ? .5 : Math.sin(clamp(u) * Math.PI) * .9 + .1, cxs = L.bx + L.bw * u, cys = L.by + L.bh * u, hw = L.bw * .2;
      const g = c.createLinearGradient(cxs - hw, cys - hw * .6, cxs + hw, cys + hw * .6); g.addColorStop(0, 'rgba(255,246,222,0)'); g.addColorStop(.5, `rgba(255,246,222,${(P.d ? .22 : .3) * q})`); g.addColorStop(1, 'rgba(255,246,222,0)');
      c.save(); c.beginPath(); c.rect(L.bx, L.by, L.bw, L.bh); c.clip(); c.fillStyle = g; c.fillRect(L.bx, L.by, L.bw, L.bh); c.restore();
    }

    const cy = cyc, e = cy ? cy.ev : nowEv(), A = cy ? cy.A : m.A, X = cy ? cy.X : m.X;   // HUD: команда й регістри зафіксовані на початку циклу
    const hz = env.L === 'uk' ? '0,4' : '0.4', short = W < 286;                           // на найвужчому екрані (360 px) «PC» опущено, щоб рядок не переносився
    return { tl: `${short ? '' : 'PC '}${hex(e.pc)} · ${e.op}`, tr: `CLK ${hz} Hz`, bl: `A = ${hex(A)}`, br: `X = ${hex(X, 1)}` };
  }

  return {
    enter(t) { t0 = t; lastK = -1; cyc = prevCyc = null; },
    tick(ev) { lastEv = ev; },          // лише запам'ятовуємо: візуально за кожним тактом машини (0,4 с) ми не йдемо
    draw,
    still() { frozen = true; cyc = snap(-9, nowEv()); },
  };
}
