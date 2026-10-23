// Експонат «МАШИННЕ НАВЧАННЯ»: нейромережа вчиться малювати КІ-Рекса. Дані — піксельний Рекс як хмара точок двох класів
// (піксель Рекса / фон), модель — справжня: RBF-ознаки (грубі й дрібні гаусіани) + логістична регресія, навчена Adam у реальному часі.
// Теплова карта — ймовірність класу, золотий контур — межа рішення p = 0,5; праворуч — крива втрат і схема «ознаки → σ → p».
import { TAU, clamp, lerp, smooth, mono, glow, noGlow } from './kit.js';
import { rexFrame } from '../rex.js';

/* ── Дані: спрайт Рекса, обрізаний по краях, з полями; око — «дірка» (клас 0) ── */
const MARGIN = 2;
const SPR = rexFrame();
const isEye = (col, y) => col === '#111111' || (col === '#FFFFFF' && y < 10);
let [bx0, bx1, by0, by1] = [99, -1, 99, -1];
SPR.forEach((row, y) => row.forEach((col, x) => { if (col) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); } }));
const NX = bx1 - bx0 + 1 + MARGIN * 2, NY = by1 - by0 + 1 + MARGIN * 2, N = NX * NY;
const TW = NX - MARGIN * 2, TH = NY - MARGIN * 2;                // розмір самого спрайта
const LAB = new Uint8Array(N);                                    // 1 — піксель Рекса, 0 — фон
for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
  const sx = i - MARGIN + bx0, sy = j - MARGIN + by0, col = SPR[sy]?.[sx];
  LAB[j * NX + i] = col && !isEye(col, sy) ? 1 : 0;
}
const POS = LAB.reduce((s, v) => s + v, 0);

/* ── Модель: дві сітки гаусових центрів (грубі дають пляму, дрібні — контур), p = σ(b + Σ w·φ). Дані лежать на ґратці,
   тож φ розкладається на множники по осях і епоха коштує кілька десятків тисяч множень ── */
const SETS = [{ kx: 6, ky: 6, sg: 2.4 }, { kx: 20, ky: 18, sg: .85 }];
const RBF = SETS.reduce((s, q) => s + q.kx * q.ky, 0);
const R = 4, HW = NX * R, HH = NY * R;                            // R — відліків карти на піксель даних
const VARIANTS = [1, .8, 1.5];                                    // клік по екрану міняє ширину σ
const LR = .012, B1 = .9, B2 = .99;
const epochAt = te => Math.floor(9.3 * Math.pow(Math.max(0, te - .1), 2.3));   // повільний старт, потім швидше
const EMAX = epochAt(5), YMAX = .72;

const table = (n, k, res, sg) => {                               // G[g][a] = exp(-(x_g - c_a)² / 2σ²)
  const G = new Float32Array(n * res * k), step = n / k;
  for (let g = 0; g < n * res; g++) for (let a = 0; a < k; a++) G[g * k + a] = Math.exp(-(((g + .5) / res - (a + .5) * step) ** 2) / (2 * sg * sg));
  return G;
};

export default function (env) {
  /* модель */
  const S = SETS.map(q => { const n = q.kx * q.ky; return { ...q, n, W: new Float32Array(n), m: new Float32Array(n), v: new Float32Array(n), g: new Float32Array(n), U: new Float32Array(q.ky * NX), V: new Float32Array(q.ky * NX), U2: new Float32Array(q.ky * HW) }; });
  const Z = new Float32Array(N), Rs = new Float32Array(N), F = new Float32Array(HW * HH), hist = new Float32Array(EMAX + 2);
  let bias = 0, mb = 0, vb = 0, ep = 0, loss = Math.LN2, acc = 1 - POS / N, t0 = 0, variant = 0, fixed = false;
  let dirty = true, builtGen = -1, builtEp = -1, paths = null;

  /* кеші малювання */
  const mk = (w, h, read = false) => { const k = document.createElement('canvas'); k.width = w; k.height = h; return { k, c: k.getContext('2d', { willReadFrequently: read }) }; };
  const heat = mk(HW, HH), img = heat.c.createImageData(HW, HH);
  const dots = mk(1, 1), probe = mk(1, 1, true);
  let dotsKey = '', lay = null, palGen = -1;
  const pal = {};
  const colors = () => {                                          // кольори теми в числах (для alpha й ImageData)
    if (palGen === env.gen) return;
    palGen = env.gen;
    for (const k of ['ph', 'gold', 'ink', 'ink2', 'ink3', 'line', 'lineStrong']) {
      probe.c.clearRect(0, 0, 1, 1); probe.c.fillStyle = '#000'; probe.c.fillStyle = env.col[k]; probe.c.fillRect(0, 0, 1, 1);
      const d = probe.c.getImageData(0, 0, 1, 1).data; pal[k] = [d[0], d[1], d[2]];
    }
  };
  const rgba = (k, a) => `rgba(${pal[k][0]},${pal[k][1]},${pal[k][2]},${a < 0 ? 0 : a > 1 ? 1 : +a.toFixed(3)})`;

  function reset(t, v) {
    t0 = t; variant = v; ep = 0; bias = mb = vb = 0; loss = Math.LN2; acc = 1 - POS / N; hist[0] = loss;
    const k = VARIANTS[v % VARIANTS.length];
    for (const s of S) {
      s.W.fill(0); s.m.fill(0); s.v.fill(0);
      s.GX = table(NX, s.kx, 1, s.sg * k); s.GY = table(NY, s.ky, 1, s.sg * k); s.HX = table(NX, s.kx, R, s.sg * k); s.HY = table(NY, s.ky, R, s.sg * k);
    }
    dirty = true; paths = null;
  }

  /* одна епоха: повний прохід по даних, градієнт, Adam */
  function step() {
    Z.fill(bias);
    for (const { kx, ky, GX, GY, W, U } of S) {
      for (let b = 0; b < ky; b++) for (let i = 0; i < NX; i++) { let s = 0; for (let a = 0; a < kx; a++) s += W[b * kx + a] * GX[i * kx + a]; U[b * NX + i] = s; }
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { let s = 0; for (let b = 0; b < ky; b++) s += GY[j * ky + b] * U[b * NX + i]; Z[j * NX + i] += s; }
    }
    let L = 0, ok = 0, gb = 0;
    for (let q = 0; q < N; q++) {
      const z = Z[q], y = LAB[q], p = 1 / (1 + Math.exp(-z)), e = y ? z : -z;
      L += e > -30 ? Math.log1p(Math.exp(-e)) : -e; ok += (p > .5) === !!y;
      Rs[q] = (p - y) / N; gb += Rs[q];
    }
    loss = L / N; acc = ok / N; ep++; hist[ep] = loss;
    const c1 = 1 - Math.pow(B1, ep), c2 = 1 - Math.pow(B2, ep), adam = (m, v, g) => LR * (m / c1) / (Math.sqrt(v / c2) + 1e-8);
    for (const { kx, ky, GX, GY, W, m, v, g, V } of S) {
      V.fill(0);
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const r = Rs[j * NX + i]; for (let b = 0; b < ky; b++) V[b * NX + i] += GY[j * ky + b] * r; }
      for (let b = 0; b < ky; b++) for (let a = 0; a < kx; a++) {
        let s = 0; for (let i = 0; i < NX; i++) s += V[b * NX + i] * GX[i * kx + a];
        const q = b * kx + a;
        m[q] = B1 * m[q] + (1 - B1) * s; v[q] = B2 * v[q] + (1 - B2) * s * s; W[q] -= adam(m[q], v[q]);
      }
    }
    mb = B1 * mb + (1 - B1) * gb; vb = B2 * vb + (1 - B2) * gb * gb; bias -= adam(mb, vb);
  }
  const train = n => { for (let k = 0; k < n && ep < EMAX; k++) step(); dirty = true; };

  /* карта ймовірності p на ґратці HW×HH (R відліків на піксель даних) */
  function field() {
    F.fill(bias);
    for (const { kx, ky, HX, HY, W, U2 } of S) {
      for (let b = 0; b < ky; b++) for (let g = 0; g < HW; g++) { let s = 0; for (let a = 0; a < kx; a++) s += W[b * kx + a] * HX[g * kx + a]; U2[b * HW + g] = s; }
      for (let h = 0; h < HH; h++) for (let g = 0; g < HW; g++) { let s = 0; for (let b = 0; b < ky; b++) s += HY[h * ky + b] * U2[b * HW + g]; F[h * HW + g] += s; }
    }
    for (let q = 0; q < F.length; q++) F[q] = 1 / (1 + Math.exp(-F[q]));
  }
  function paintHeat() {                                          // p → прозорість фосфору
    const [r, g, b] = pal.ph, d = img.data, amax = env.col.dark ? .46 : .36;
    for (let q = 0; q < F.length; q++) { d[q * 4] = r; d[q * 4 + 1] = g; d[q * 4 + 2] = b; d[q * 4 + 3] = 255 * amax * smooth(.34, .8, F[q]); }
    heat.c.putImageData(img, 0, 0);
  }

  /* ізолінії (marching squares) у координатах даних; Path2D кешується до зміни ваг */
  function iso(level) {
    const path = new Path2D(), o = .5 / R, k1 = 1 / R;
    const seg = (x1, y1, x2, y2) => { path.moveTo(x1 * k1 + o, y1 * k1 + o); path.lineTo(x2 * k1 + o, y2 * k1 + o); };
    for (let h = 0; h < HH - 1; h++) for (let g = 0; g < HW - 1; g++) {
      const q = h * HW + g, a = F[q], b = F[q + 1], c = F[q + HW + 1], d = F[q + HW];
      const k = (a > level ? 1 : 0) | (b > level ? 2 : 0) | (c > level ? 4 : 0) | (d > level ? 8 : 0);
      if (k === 0 || k === 15) continue;
      const tx = g + (level - a) / (b - a), ry = h + (level - b) / (c - b), bx = g + (level - d) / (c - d), ly = h + (level - a) / (d - a);   // точки на ребрах
      const mid = (a + b + c + d) / 4 > level;
      switch (k) {
        case 1: case 14: seg(g, ly, tx, h); break;
        case 2: case 13: seg(tx, h, g + 1, ry); break;
        case 3: case 12: seg(g, ly, g + 1, ry); break;
        case 4: case 11: seg(g + 1, ry, bx, h + 1); break;
        case 6: case 9: seg(tx, h, bx, h + 1); break;
        case 7: case 8: seg(g, ly, bx, h + 1); break;
        case 5: if (mid) { seg(tx, h, g + 1, ry); seg(g, ly, bx, h + 1); } else { seg(g, ly, tx, h); seg(g + 1, ry, bx, h + 1); } break;
        case 10: if (mid) { seg(g, ly, tx, h); seg(g + 1, ry, bx, h + 1); } else { seg(tx, h, g + 1, ry); seg(g, ly, bx, h + 1); } break;
      }
    }
    return path;
  }

  /* ── розкладка: поле даних ліворуч, панель праворуч ── */
  function layout(W, H) {
    const small = H < 260, top = small ? 34 : 40, bot = H - (small ? 30 : 36);
    const mx = Math.max(12, W * .04), gap = clamp(W * .05, 14, 40), minPanel = small ? 104 : 150;
    const P = Math.min((bot - top) / NY, (W - 2 * mx - gap - minPanel) / NX);
    const pw = clamp(W * .36, minPanel, 300), tw = NX * P + gap + pw, left = (W - tw) / 2;
    const fy = top + ((bot - top) - NY * P) / 2;
    return { W, H, small, P, fx: left, fy, fw: NX * P, fh: NY * P, px: left + NX * P + gap, pw, fs: clamp(7 + P * .3, 8.2, 12.2) };
  }

  /* ── шар точок (кешується) ── */
  function dotsLayer(Lt, D) {
    const key = `${env.gen}|${Lt.W}|${Lt.H}|${D}`;
    if (key === dotsKey) return;
    dotsKey = key;
    const k = dots.k, c = dots.c; k.width = Math.ceil(Lt.W * D); k.height = Math.ceil(Lt.H * D);
    c.setTransform(D, 0, 0, D, 0, 0); c.clearRect(0, 0, Lt.W, Lt.H);
    const { P, fx, fy } = Lt, r1 = Math.max(1, P * .2), r0 = Math.max(.9, P * .16);
    c.fillStyle = env.col.ph; c.beginPath();
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) if (LAB[j * NX + i]) { const x = fx + (i + .5) * P, y = fy + (j + .5) * P; c.moveTo(x + r1, y); c.arc(x, y, r1, 0, TAU); }
    c.fill();
    c.beginPath();
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) if (!LAB[j * NX + i]) { const x = fx + (i + .5) * P, y = fy + (j + .5) * P; c.moveTo(x + r0, y); c.arc(x, y, r0, 0, TAU); }
    if (P >= 7) { c.strokeStyle = rgba('lineStrong', .8); c.lineWidth = clamp(P * .075, .8, 1.2); c.stroke(); }
    else { c.fillStyle = rgba('lineStrong', .7); c.fill(); }
  }

  /* ── панель: схема, крива втрат, підписи ── */
  function schematic(c, x, y, w, h, Lt, te) {
    const s = clamp(Lt.P / 12, .75, 1.5), r = 3.2 * s, mid = y + h * .4, fs = Lt.fs - .6;
    const cx = [.07, .34, .6, .79, .95].map(u => x + u * w);
    const ins = [mid - h * .17, mid + h * .17], hy = Array.from({ length: 5 }, (_, i) => y + h * .02 + i * h * .76 / 4);
    c.lineWidth = 1;
    // вхід -> RBF
    c.strokeStyle = rgba('lineStrong', .28); c.beginPath();
    for (const a of ins) for (const b of hy) { c.moveTo(cx[0] + r, a); c.lineTo(cx[1] - r, b); }
    c.stroke();
    // RBF -> Σ: товщина й тон — за справжніми вагами кількох центрів
    const fine = S[1], pick = [[4, 4], [7, 13], [9, 9], [12, 6], [14, 15]];
    hy.forEach((v, i) => {
      const wv = fine.W[pick[i][0] * fine.kx + pick[i][1]], a = clamp(Math.abs(wv) / 1.2, 0, 1);
      c.strokeStyle = wv >= 0 ? rgba('ph', .18 + a * .7) : rgba('ink3', .18 + a * .5); c.lineWidth = .8 + a * .9;
      c.beginPath(); c.moveTo(cx[1] + r, v); c.lineTo(cx[2] - r * 1.7, mid); c.stroke();
    });
    c.strokeStyle = rgba('lineStrong', .6); c.lineWidth = 1; c.beginPath();
    c.moveTo(cx[2] + r * 1.7, mid); c.lineTo(cx[3] - r * 1.7, mid); c.moveTo(cx[3] + r * 1.7, mid); c.lineTo(cx[4] - r, mid); c.stroke();
    // вузли
    const node = (px, py, rr, fill) => { c.beginPath(); c.arc(px, py, rr, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } c.strokeStyle = rgba('lineStrong', .9); c.lineWidth = 1; c.stroke(); };
    ins.forEach(v => node(cx[0], v, r)); hy.forEach(v => node(cx[1], v, r));
    node(cx[2], mid, r * 1.7);
    c.beginPath(); c.roundRect(cx[3] - r * 1.7, mid - r * 1.7, r * 3.4, r * 3.4, r * .8); c.stroke();
    c.beginPath();                                                // сигмоїда у квадраті σ
    for (let k = 0; k <= 12; k++) { const u = k / 12 * 2 - 1, px = cx[3] + u * r * 1.2, py = mid - Math.tanh(u * 2.6) * r * .95; k ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.strokeStyle = rgba('ph', .95); c.lineWidth = 1.1; c.stroke();
    // вихід p — заповнюється, коли модель впевнена
    node(cx[4], mid, r * 1.1, rgba('ph', .15 + .85 * clamp((acc - .6) / .4)));
    // підписи
    mono(c, fs); c.fillStyle = env.col.ink3; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const ly = y + h + fs * .2;
    c.fillText('x', cx[0], ly); c.fillText('RBF', cx[1], ly); c.fillText('σ', cx[3], ly); c.fillText('p', cx[4], ly);
    mono(c, fs + 1.5, 600); c.fillStyle = env.col.ink2; c.fillText('Σ', cx[2], mid + (fs + 1.5) * .34);
    // імпульс прямого проходу
    const path = [[cx[0], ins[Math.floor(te / 1.4) % 2]], [cx[1], hy[Math.floor(te / 1.4 * 1.7) % 5]], [cx[2], mid], [cx[3], mid], [cx[4], mid]];
    const u = ((te / 1.4) % 1) * 1.25;
    if (u < 1 && !fixed) {
      const f = u * 4, i = Math.min(3, Math.floor(f)), k = f - i, px = lerp(path[i][0], path[i + 1][0], k), py = lerp(path[i][1], path[i + 1][1], k);
      glow(c, env.col, env.col.gold, 6); c.fillStyle = env.col.gold; c.globalAlpha = Math.sin(Math.PI * u); c.beginPath(); c.arc(px, py, 1.7 * s, 0, TAU); c.fill(); c.globalAlpha = 1; noGlow(c);
    }
  }

  function lossChart(c, x, y, w, h, Lt) {
    const fs = Lt.fs, cl = x + fs * 2.9, cr = x + w - 3, ct = y + fs + 9, cb = y + h - fs - 6;
    mono(c, fs); c.textBaseline = 'alphabetic';
    c.fillStyle = env.col.ink3; c.textAlign = 'left'; c.fillText('LOSS', x, y + fs - 1);
    c.textAlign = 'right'; c.fillText('EPOCH', cr, cb + fs + 5);
    c.fillText('0.7', cl - 5, Math.round(cb - .7 / YMAX * (cb - ct)) + fs * .36); c.fillText('0', cl - 5, cb + fs * .36);
    // осі, ґратка
    c.strokeStyle = rgba('lineStrong', .6); c.lineWidth = 1; c.beginPath();
    c.moveTo(cl + .5, ct - 2); c.lineTo(cl + .5, cb + .5); c.lineTo(cr, cb + .5); c.stroke();
    c.strokeStyle = rgba('lineStrong', .22); c.setLineDash([2, 3]); c.beginPath();
    for (const v of [.7, .35]) { const yy = Math.round(cb - v / YMAX * (cb - ct)) + .5; c.moveTo(cl + 1, yy); c.lineTo(cr, yy); }
    c.stroke(); c.setLineDash([]);
    c.strokeStyle = rgba('lineStrong', .6); c.beginPath();
    for (let e = 0; e <= EMAX; e += 100) { const xx = Math.round(cl + e / EMAX * (cr - cl)) + .5; c.moveTo(xx, cb + .5); c.lineTo(xx, cb + 3.5); }
    c.stroke();
    // крива
    const X = e => cl + e / EMAX * (cr - cl), Y = v => cb - clamp(v / YMAX) * (cb - ct);
    const stride = Math.max(1, Math.floor(ep / 140));
    c.beginPath(); c.moveTo(X(0), Y(hist[0]));
    for (let e = stride; e < ep; e += stride) c.lineTo(X(e), Y(hist[e]));
    c.lineTo(X(ep), Y(hist[ep]));
    c.strokeStyle = env.col.ph; c.lineWidth = 1.5; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
    c.lineTo(X(ep), cb); c.lineTo(X(0), cb); c.closePath(); c.fillStyle = rgba('ph', .09); c.fill();
    // голівка
    const hx = X(ep), hy = Y(hist[ep]);
    c.fillStyle = rgba('ph', .2); c.beginPath(); c.arc(hx, hy, 4.5, 0, TAU); c.fill();
    c.fillStyle = env.col.ph; glow(c, env.col, env.col.ph, 6); c.beginPath(); c.arc(hx, hy, 2.2, 0, TAU); c.fill(); noGlow(c);
  }

  /* нижній блок панелі: назва даних, позначки класів і «ціль» — сам Рекс гравюрою (ті самі мітки, що й у даних) */
  function legend(c, x, y, w, h, Lt, k) {
    const fs = Lt.fs, r = Math.max(2, fs * .3), b2 = y + h - fs * .1, b1 = b2 - fs * 1.55;
    mono(c, fs); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.fillStyle = env.col.ink2; c.fillText(`${env.L === 'uk' ? 'КІ-РЕКС' : 'KI-REX'} · N ${N}`, x, b1);
    c.fillStyle = env.col.ph; c.beginPath(); c.arc(x + r, b2 - fs * .32, r, 0, TAU); c.fill();
    c.fillStyle = env.col.ink3; c.fillText('y=1', x + r * 2 + 5, b2);
    const x2 = x + r * 2 + 5 + fs * 3.6 + 10;
    c.strokeStyle = env.col.lineStrong; c.lineWidth = 1; c.beginPath(); c.arc(x2 + r, b2 - fs * .32, r - .3, 0, TAU); c.stroke();
    c.fillText('y=0', x2 + r * 2 + 5, b2);
    if (!k) return;
    const x0 = x + w - TW * k, y0 = y + h - TH * k;
    c.fillStyle = rgba('ink3', .75); c.beginPath();
    for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) if (LAB[(j + MARGIN) * NX + i + MARGIN]) c.rect(x0 + i * k, y0 + j * k, k, k);
    c.fill();
  }

  return {
    enter(t) { if (!fixed) reset(t, 0); },
    still() { fixed = true; reset(0, 0); train(EMAX); },
    poke(x, y, t) { reset(t, variant + 1); if (fixed) train(EMAX); },
    draw(c, W, H, t) {
      colors();
      const te = fixed ? 5 : Math.max(0, t - t0);
      if (!fixed) { const want = Math.min(EMAX, epochAt(te)); if (ep < want) train(Math.min(30, want - ep)); }
      if (dirty || builtGen !== env.gen || builtEp !== ep) { field(); paintHeat(); paths = null; dirty = false; builtGen = env.gen; builtEp = ep; }
      if (!paths && ep > 0) paths = [.5, .7, .88].map(iso);
      if (!lay || lay.W !== W || lay.H !== H) lay = layout(W, H);
      const Lt = lay, { P, fx, fy, fw, fh } = Lt, D = c.getTransform().a || 1;
      const hold = fixed ? 0 : smooth(3.4, 4.4, te), br = hold * Math.sin(te * TAU / 2.6);
      c.textBaseline = 'alphabetic';

      /* теплова карта */
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(heat.k, fx, fy, fw, fh);
      /* точки двох класів */
      dotsLayer(Lt, D);
      c.globalAlpha = smooth(0, .5, te); c.drawImage(dots.k, 0, 0, Lt.W, Lt.H); c.globalAlpha = 1;
      /* межа рішення */
      if (paths) {
        c.save(); c.translate(fx, fy); c.scale(P, P); c.lineJoin = 'round'; c.lineCap = 'round';
        c.strokeStyle = rgba('ph', .5 + .12 * br); c.lineWidth = .9 / P;
        c.stroke(paths[1]); c.strokeStyle = rgba('ph', .3 + .1 * br); c.stroke(paths[2]);
        c.strokeStyle = env.col.gold; c.lineWidth = (1.35 + .25 * br) / P; glow(c, env.col, env.col.gold, 5 + 3 * br);
        c.stroke(paths[0]); noGlow(c); c.restore();
      }
      /* рамка й лінійка */
      c.strokeStyle = rgba('lineStrong', .55); c.lineWidth = 1; c.strokeRect(Math.round(fx) + .5, Math.round(fy) + .5, Math.round(fw), Math.round(fh));
      c.beginPath();
      const tk = P >= 9 ? 1 : P >= 6 ? 2 : 4;
      for (let i = 0; i <= NX; i += tk) { const xx = Math.round(fx + i * P) + .5, l = i % 5 === 0 ? 4 : 2.2; c.moveTo(xx, Math.round(fy + fh) + 1.5); c.lineTo(xx, Math.round(fy + fh) + 1.5 + l); }
      for (let j = 0; j <= NY; j += tk) { const yy = Math.round(fy + j * P) + .5, l = j % 5 === 0 ? 4 : 2.2; c.moveTo(Math.round(fx) - .5, yy); c.lineTo(Math.round(fx) - .5 - l, yy); }
      c.strokeStyle = rgba('lineStrong', .5); c.stroke();

      /* права панель: схема, крива втрат, нижній блок із «ціллю» (низ — на рівні низу поля) */
      const { px, pw, fs } = Lt, showSch = fh >= 190 && pw >= 170;
      const k = pw > fs * 17 ? Math.max(1, Math.floor(Math.min(P / 7.5, fs * 2.7 / TH) * D) / D) : 0;
      const bh = Math.max(fs * 2.7, k * TH), by = fy + fh - bh, sh = showSch ? fh * .27 : 0;
      if (showSch) schematic(c, px, fy + 2, pw, sh - fs * 1.6, Lt, te);
      const cy0 = fy + (showSch ? sh + fh * .05 : 0);
      lossChart(c, px, cy0, pw, by - fs * 1.7 - cy0, Lt);
      legend(c, px, by, pw, bh, Lt, k);

      const pad = (v, n) => String(v).padStart(n, '0');
      return { tl: `${W < 420 ? 'EP' : 'EPOCH'} ${pad(ep, 3)}`, tr: `${W < 290 ? 'L' : 'LOSS'} ${loss.toFixed(3)}`, bl: `RBF ${RBF} → σ`, br: `ACC ${Math.round(acc * 100)} %` };
    },
  };
}
