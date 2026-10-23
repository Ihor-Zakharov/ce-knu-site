// Експонат «ПАМ'ЯТЬ»: модуль оперативної пам'яті DDR5 «KI-RAM». Його вміст — зображення: вісім мікросхем утворюють
// одне растрове поле світлодіодних комірок, і контролер швидкими пакетами (burst) записує в нього піксельного КІ-Рекса.
// Історія за 5 с: випадкові дані -> запис рядок за рядком (контакти блимають пакетами, комірки спалахують золотом)
// -> хвиля читання/регенерації проходить полем, Рекс лишається. Клік — хвиля читання від місця дотику.
import { clamp, lerp, smooth, hex, mono, rr, rexMask } from './kit.js';
import { rexFrame } from '../rex.js';

/* Рекс без порожніх країв: комірка світиться (контур трохи приглушений), зіниця — нуль, щоб силует мав характер */
const LEVEL = { '#1E3416': .6, '#23305A': .8, '#E9D9A6': .92, '#FFFFFF': .5 };   // контур приглушено, сорочка й зуби — проміжні рівні
const SP = (() => {
  const m = rexMask(), fr = rexFrame();
  let x0 = 99, x1 = -1, y0 = 99, y1 = -1;
  m.forEach((r, y) => r.forEach((v, x) => { if (v) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }));
  const w = x1 - x0 + 1, h = y1 - y0 + 1, bits = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = fr[y + y0][x + x0];
    bits[y * w + x] = !m[y + y0][x + x0] || px === '#111111' ? 0 : y < 4 && px === '#FFFFFF' ? .4 : (LEVEL[px] ?? 1);
  }
  return { w, h, bits };
})();

const NR = 20;                               // рядків у полі: порожній рядок над Рексом і під ним
const T0 = .9, ROW = .085, BF = .62;         // початок запису, період рядка, частка рядка на сам пакет
const W0 = 3.15, WD = 1.05, WP = 4.4;        // перша хвиля читання, її тривалість, період наступних
const STILL = W0 + WD / 2, BASE = 0x1F00;    // кадр без руху: хвиля посередині; адреса першого рядка

const prng = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rgbOf = s => { const n = parseInt(String(s).replace('#', '').slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, u) => a.map((v, i) => Math.round(lerp(v, b[i], u)));
const css = a => `rgb(${a[0]},${a[1]},${a[2]})`;
const rgba = (a, o) => `rgba(${a[0]},${a[1]},${a[2]},${o})`;
const snap = (v, D) => Math.round(v * D) / D;

export default function (env) {
  let t0 = 0, epoch = 0, frozen = false, g = null, d = null, dirty = true, pokes = [];
  let wc = new Float32Array(1);

  /* ── геометрія й статичний шар (плата, мікросхеми, контакти) — кешується ── */
  function build(W, H, D) {
    const col = env.col, dark = col.dark, gold = col.goldRGB;
    const availH = Math.max(80, H - 76), Mw = Math.min(W * .88, availH * 3.2);
    const gm = Mw * .022, gap = Mw * .011, cw = (Mw - 2 * gm - 7 * gap) / 8, padX = Math.max(2, cw * .05);
    // стовпців на мікросхему: 13 — тулуб і голова Рекса (13 стовпців) вміщаються рівно в одну мікросхему, хвіст лягає в сусідню;
    // на малих екранах — менше стовпців, зате крупніші комірки
    const pH = Math.max(1.5, (availH / 1.7 - 2 * padX) / NR);
    let p = 3, nc = 13;
    for (const n of [13, 10, 8, 6]) { nc = n; p = Math.min((cw - 2 * padX) / nc, pH); if (p >= 3.1) break; }
    p = Math.max(1.4, snap(p, D));
    const NC = nc * 8, chH = NR * p + 2 * padX, tm = chH * .14, fh = clamp(chH * .17, 8, 24), Mh = tm + chH + chH * .42 + fh;
    const mx = snap((W - Mw) / 2, D), my = snap(H / 2 + 2 - Mh / 2, D), padY = padX;
    const chipX = Array.from({ length: 8 }, (_, k) => mx + gm + k * (cw + gap));
    const colX = new Float32Array(NC), rowY = new Float32Array(NR);
    const cy = my + tm, s = Math.max(1.2, snap(p * .74, D));
    for (let c = 0; c < NC; c++) colX[c] = snap(chipX[c / nc | 0] + (cw - nc * p) / 2 + (c % nc) * p + (p - s) / 2, D);
    for (let r = 0; r < NR; r++) rowY[r] = snap(cy + (chH - NR * p) / 2 + r * p + (p - s) / 2, D);
    const fyTop = my + Mh - fh;
    // золоті контакти з вирізом-ключем
    const nx = mx + Mw * .43, nw = Math.max(3, Mw * .011), pitch = Math.max(4.4, Mw / 58), fw = pitch * .66;
    const fx0 = mx + gm * .7, nf0 = Math.floor((Mw - gm * 1.4) / pitch), fingers = [];
    for (let i = 0; i < nf0; i++) {
      const x = fx0 + i * pitch + (pitch - fw) / 2;
      if (x + fw > nx - nw / 2 - pitch * .35 && x < nx + nw / 2 + pitch * .35) continue;
      fingers.push({ x: snap(x, D), xc: x + fw / 2 });
    }
    const fLeft = chipX[0] + (cw - nc * p) / 2, fWide = chipX[7] + (cw + nc * p) / 2 - fLeft;
    fingers.forEach(f => { const u = (f.xc - fLeft) / fWide * NC; f.c = clamp(Math.floor(u), 0, NC - 1); f.ca = clamp(Math.floor(u - .5), 0, NC - 1); f.cb = clamp(Math.ceil(u + .5) - 1, f.ca, NC - 1); });
    const nf = fingers.length;

    const L = document.createElement('canvas'); L.width = Math.round(W * D); L.height = Math.round(H * D);
    const x = L.getContext('2d'); x.setTransform(D, 0, 0, D, 0, 0);

    /* плата: контур з фасками внизу, текстоліт, ефект об'єму */
    const rad = Math.min(4, Mh * .025), chm = fh * .3, board = new Path2D();
    board.moveTo(mx + rad, my); board.lineTo(mx + Mw - rad, my); board.quadraticCurveTo(mx + Mw, my, mx + Mw, my + rad);
    board.lineTo(mx + Mw, my + Mh - chm); board.lineTo(mx + Mw - chm, my + Mh); board.lineTo(mx + chm, my + Mh); board.lineTo(mx, my + Mh - chm);
    board.lineTo(mx, my + rad); board.quadraticCurveTo(mx, my, mx + rad, my); board.closePath();
    const pcbTop = dark ? '#1F6A41' : '#3E8A59', pcbBot = dark ? '#134A2C' : '#2C6F45', pcbEdge = dark ? '#0B2E1B' : '#1D4D30';
    x.save();
    if (!dark) { x.shadowColor = 'rgba(40,30,18,.30)'; x.shadowBlur = Math.max(8, Mh * .1); x.shadowOffsetY = Mh * .035; }
    const gr = x.createLinearGradient(0, my, 0, my + Mh); gr.addColorStop(0, pcbTop); gr.addColorStop(1, pcbBot);
    x.fillStyle = gr; x.fill(board); x.restore();
    const sh = x.createLinearGradient(mx, my, mx + Mw, my + Mh); sh.addColorStop(0, 'rgba(255,255,255,.10)'); sh.addColorStop(.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.10)');
    x.fillStyle = sh; x.fill(board);
    x.lineWidth = 1; x.strokeStyle = pcbEdge; x.stroke(board);
    x.save(); x.clip(board); x.strokeStyle = dark ? 'rgba(150,235,185,.20)' : 'rgba(255,255,255,.26)'; x.strokeRect(mx + 1.5, my + 1.5, Mw - 3, Mh - 3); x.restore();

    /* доріжки: чотири лінії від низу кожної мікросхеми до своїх контактів, зі зламом 45° */
    const traces = [], gn = Math.max(1, Math.floor(nf / 8)), lw = Math.max(.7, Mh / 220), chB = cy + chH;
    for (let k = 0; k < 8; k++) {
      const pth = new Path2D(), cxk = chipX[k] + cw / 2, sp = clamp(cw * .09, 1.8, 4.2);
      for (let j = 0; j < 4; j++) {
        const f = fingers[Math.min(nf - 1, Math.floor(k * nf / 8) + Math.round(j * (gn - 1) / 3))], xs = cxk + (j - 1.5) * sp, ye = fyTop - 1.5;
        const yj = chB + 2.5 + j * sp * .9, dx = Math.abs(f.xc - xs), yd = Math.min(yj + dx, ye - 2);
        pth.moveTo(xs, chB); pth.lineTo(xs, yj); pth.lineTo(f.xc, yd); pth.lineTo(f.xc, ye);
      }
      traces.push(pth);
    }
    x.lineWidth = lw; x.lineJoin = 'round'; x.strokeStyle = dark ? 'rgba(170,240,200,.15)' : 'rgba(255,255,255,.2)';
    traces.forEach(q => x.stroke(q));

    /* дрібні деталі в смузі між мікросхемами й контактами: SPD, PMIC, конденсатори */
    const sy = chB, sH = fyTop - chB, mid = sy + sH / 2, u = Math.max(1, Mh / 190);
    const smd = (px, py, w, h, c, o = 1) => { x.globalAlpha = o; x.fillStyle = c; x.fillRect(snap(px, D), snap(py, D), w, h); x.globalAlpha = 1; };
    const ic = (px, py, w, h) => {                            // корпус з ніжками
      x.strokeStyle = 'rgba(214,190,130,.75)'; x.lineWidth = Math.max(.6, u * .7);
      x.beginPath(); for (let i = 1; i < 4; i++) { const q = px + w * i / 4; x.moveTo(q, py - u * 1.4); x.lineTo(q, py + h + u * 1.4); } x.stroke();
      smd(px, py, w, h, '#101213'); smd(px + 1, py + 1, w - 2, 1, 'rgba(255,255,255,.12)');
    };
    const spdX = mx + Mw * .335, pmX = mx + Mw * .5;
    ic(spdX, mid - u * 4, u * 14, u * 8);                        // SPD
    ic(pmX, mid - u * 6, u * 22, u * 12);                        // PMIC
    smd(pmX + u * 3, mid - u * 3.4, u * 1.8, u * 1.8, 'rgba(255,255,255,.35)');
    for (let i = 0; i < 6; i++) { const cx = mx + Mw * (.63 + i * .042); smd(cx, mid - u * 2.8, u * 3, u * 5.6, '#C9B58A', .85); smd(cx, mid - u * 2.8, u * .9, u * 5.6, '#7A6A48', .9); }
    for (let i = 0; i < 4; i++) smd(mx + Mw * (.905 + i * .017), mid - u * 1.6, u * 2.2, u * 3.2, '#101213', .9);

    /* етикетка модуля — відсилка до КІ */
    const lw2 = Mw * .235, lh = clamp(sH * .62, 10, 24), lx = snap(mx + Mw * .065, D), ly = snap(mid - lh / 2, D), noTr = new Path2D();
    noTr.rect(0, 0, W, H); noTr.rect(lx, ly, lw2, lh);
    x.save(); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 2; x.shadowOffsetY = 1;
    x.fillStyle = dark ? '#CDC4AF' : '#EDE6D4'; rr(x, lx, ly, lw2, lh, 1.6); x.fill(); x.restore();
    x.fillStyle = css(gold); x.fillRect(lx + lh * .28, ly + lh * .2, Math.max(1.2, lh * .07), lh * .6);
    const fs = clamp(lh * .46, 5.8, 10); mono(x, fs, 700); x.fillStyle = dark ? '#2A2012' : col.ph; x.textBaseline = 'middle'; x.textAlign = 'left';
    x.fillText('KI-RAM · DDR5', lx + lh * .6, ly + lh / 2 + .5); x.textBaseline = 'alphabetic';

    /* мікросхеми й вимкнені комірки */
    const ledOff = rgba(dark ? rgbOf(col.ph) : mix(gold, [255, 214, 128], .62), dark ? .13 : .2);
    for (let k = 0; k < 8; k++) {
      const X = chipX[k];
      x.save(); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 3; x.shadowOffsetY = 1.2;
      const cg = x.createLinearGradient(0, cy, 0, cy + chH); cg.addColorStop(0, '#1B1D1E'); cg.addColorStop(1, '#0B0C0D');
      x.fillStyle = cg; rr(x, X, cy, cw, chH, 2); x.fill(); x.restore();
      x.lineWidth = 1; x.strokeStyle = dark ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.12)'; rr(x, X + .5, cy + .5, cw - 1, chH - 1, 2); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.arc(X + cw * .09, cy + Math.max(2, padY * .55), Math.max(.7, cw * .014), 0, 7); x.fill();
    }
    x.fillStyle = ledOff;
    for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) x.fillRect(colX[c], rowY[r], s, s);

    /* контакти: золото з м'яким градієнтом */
    const fg = x.createLinearGradient(0, fyTop, 0, my + Mh); fg.addColorStop(0, css(mix(gold, [255, 255, 255], .28))); fg.addColorStop(1, css(mix(gold, [0, 0, 0], .12)));
    x.fillStyle = fg; fingers.forEach(f => x.fillRect(f.x, fyTop, fw, fh));
    x.fillStyle = 'rgba(0,0,0,.22)'; fingers.forEach(f => x.fillRect(f.x + fw - Math.max(.6, fw * .12), fyTop, Math.max(.6, fw * .12), fh));
    // кільця біля бічних вирізів
    const nr = Math.max(3, Mh * .04), ny = my + Mh * .66;
    x.strokeStyle = css(gold); x.globalAlpha = .7; x.lineWidth = Math.max(.8, Mh / 190);
    [mx, mx + Mw].forEach(q => { x.beginPath(); x.arc(q, ny, nr + 2.2, 0, 7); x.stroke(); }); x.globalAlpha = 1;

    /* вирізи: бічні напівкола й ключ між контактами (справжні дірки — крізь них видно екран) */
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000';
    [mx, mx + Mw].forEach(q => { x.beginPath(); x.arc(q, ny, nr, 0, 7); x.fill(); });
    rr(x, nx - nw / 2, my + Mh - fh * .72, nw, fh * .72 + 2, [0, 0, 0, 0]); x.fill();
    x.beginPath(); x.arc(nx, my + Mh - fh * .72, nw / 2, Math.PI, 0); x.fill();
    x.globalCompositeOperation = 'source-over';

    return { key: `${env.gen}|${W}|${H}|${D}`, W, H, D, L, mx, my, Mw, Mh, cw, cy, chH, chipX, nc, NC, p, s, colX, rowY, fingers, nf, fyTop, fh, fw, traces, lw, noTr,
      ox: nc === 13 ? 4 * nc - 6 : Math.floor((NC - SP.w) / 2), oy: Math.floor((NR - SP.h) / 2),
      led: dark ? env.col.ph : css(mix(gold, [255, 214, 128], .62)), hot: css(mix(gold, [255, 255, 255], dark ? .6 : .74)), gold: css(gold), goldRGB: gold };
  }

  /* ── дані: випадковий вміст, фінальний Рекс і розклад запису ── */
  function fill() {
    const { NC, ox, oy, nf, fingers } = g, n = NR * NC, R = prng(0xC0FFEE + epoch * 977);
    const o = { NC, fin: new Float32Array(n), nb: new Uint8Array(n), nl: new Float32Array(n), tf: new Float32Array(n), tw: new Float32Array(n), fb: new Uint8Array(NR * nf), fcol: new Uint8Array(nf) };
    for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
      const i = r * NC + c, sr = r - oy, sc = c - ox;
      o.fin[i] = sr >= 0 && sr < SP.h && sc >= 0 && sc < SP.w ? SP.bits[sr * SP.w + sc] : 0;
      o.nb[i] = R() < .46 ? 1 : 0; o.nl[i] = .36 + R() * .3; o.tf[i] = R() < .24 ? R() * T0 * .9 : -1;
      o.tw[i] = T0 + r * ROW + c / NC * ROW * BF;
    }
    fingers.forEach((f, k) => { for (let r = 0; r < NR; r++) for (let c = f.ca; c <= f.cb; c++) if (o.fin[r * NC + c] > 0) { o.fb[r * nf + k] = 1; o.fcol[k] = 1; } });
    return o;
  }

  /* хвилі читання: періодична (то вправо, то вліво) і від кліка */
  function waves(tt) {
    const { NC } = g, sg = Math.max(1, NC * .013);
    if (wc.length !== NC) wc = new Float32Array(NC); else wc.fill(0);
    const put = (xw, dir, amp) => { for (let c = 0; c < NC; c++) { const dd = (c - xw) * dir; wc[c] = Math.max(wc[c], amp * (dd < 0 ? Math.exp(dd / (sg * 3.6)) : Math.exp(-dd * dd / (2 * sg * sg)))); } };
    if (tt >= W0) {
      const k = Math.floor((tt - W0) / WP), u = (tt - W0 - k * WP) / WD;
      if (u < 1) { const e = smooth(0, 1, u), fwd = k % 2 === 0; put(fwd ? lerp(-6, NC + 6, e) : lerp(NC + 6, -6, e), fwd ? 1 : -1, 1); }
    }
    for (const q of pokes) {
      const rad = (tt - q.t) * NC * 1.1;
      if (rad < 0 || rad > NC * .95) continue;
      const amp = (1 - rad / (NC * .95)) * .95;
      put(q.c - rad, -1, amp); put(q.c + rad, 1, amp);
    }
  }

  const ev = (tt) => tt < T0 ? { w: 'ACT', a: BASE } : tt < T0 + NR * ROW + .05 ? { w: 'WRITE', a: BASE + clamp(Math.floor((tt - T0) / ROW), 0, NR - 1) * 0x40 } : null;

  return {
    enter(t) { if (frozen) return; t0 = t; epoch++; dirty = true; pokes = []; },
    still() { frozen = true; },
    poke(x, y, t) {
      if (!g || frozen) return;
      const c = clamp((x - g.colX[0]) / g.p, 0, g.NC - 1), tt = t - t0;
      pokes = pokes.filter(q => tt - q.t < 1.4).slice(-2); pokes.push({ c, t: tt });
    },
    draw(c, W, H, t) {
      const D = c.getTransform().a || 1;
      if (!g || g.key !== `${env.gen}|${W}|${H}|${D}`) { g = build(W, H, D); dirty = true; }
      if (dirty || !d || d.NC !== g.NC) { d = fill(); dirty = false; }
      const tt = frozen ? STILL : Math.max(0, t - t0), { NC, nc, p, s, colX, rowY, chipX, cw, cy, chH, fingers, nf } = g;
      c.drawImage(g.L, 0, 0, W, H);
      waves(tt);

      /* доріжки: пульс у мікросхемі, на яку зараз іде пакет, і хвиля під час читання */
      const ra = (tt - T0) / ROW, writing = ra >= -.5 && ra < NR + 1;
      c.save(); c.clip(g.noTr, 'evenodd'); c.lineWidth = g.lw * 1.15; c.lineJoin = 'round'; c.strokeStyle = g.gold;
      for (let k = 0; k < 8; k++) {
        let a = wc[Math.min(NC - 1, k * nc + (nc >> 1))] * .55;
        if (writing) for (let r = Math.max(0, Math.floor(ra) - 1); r <= Math.min(NR - 1, Math.floor(ra)); r++) {
          const age = tt - (T0 + r * ROW + k / 8 * ROW * BF); if (age >= 0) a = Math.max(a, .7 * Math.exp(-age / .09));
        }
        if (a > .04) { c.globalAlpha = a; c.stroke(g.traces[k]); }
      }
      c.restore();

      /* активний рядок: смуга крізь усі мікросхеми, шлейф з двох рядків, лінія в проміжках */
      if (writing) {
        const rc = Math.floor(ra), headC = clamp((ra - rc) / BF, 0, 1) * NC;
        for (let r = Math.max(0, rc - 2); r <= Math.min(NR - 1, rc); r++) {
          const age = ra - r, a = (age < 1 ? 1 : Math.exp(-(age - 1) * 1.7)) * smooth(-.5, .3, ra) * (1 - smooth(NR - .2, NR + 1, ra)), y = rowY[r] - (p - s) / 2;
          c.fillStyle = g.gold;
          for (let k = 0; k < 8; k++) {
            const x0 = colX[k * nc] - (p - s) / 2 - 1.2, w = nc * p + 2.4;
            c.globalAlpha = .13 * a; c.fillRect(x0, y, w, p);
            if (r === rc) { const hw = clamp(headC - k * nc, 0, nc) * p; c.globalAlpha = .2; c.fillRect(x0, y, hw + (hw > 0 ? 1.2 : 0), p); }
          }
          c.globalAlpha = .5 * a; c.fillRect(chipX[0], y + p / 2 - .5, chipX[7] + cw - chipX[0], 1);
        }
      }

      /* комірки */
      const dark = env.col.dark, bigS = s * 1.8;
      for (let r = 0; r < NR; r++) {
        const y = rowY[r];
        for (let q = 0; q < NC; q++) {
          const i = r * NC + q, w = wc[q], twi = d.tw[i], fin = d.fin[i];
          let a = d.nb[i] ? d.nl[i] : 0; const tf = d.tf[i];
          if (tf >= 0 && tt > tf) a = lerp(a, d.nb[i] ? 0 : d.nl[i], smooth(tf, tf + .14, tt));
          let lvl = a, fl = 0;
          if (tt >= twi) { lvl = lerp(a, fin, smooth(twi, twi + .05, tt)); if (fin && tt - twi < 2) fl = Math.exp(-(tt - twi) / .3) * smooth(twi, twi + .02, tt); }
          if (lvl < .02 && w < .03) continue;
          const pop = (fl * fl * .55 + w * lvl * .3) * p * .22, al = Math.max(lvl, w * .62), x = colX[q] - pop, sz = s + 2 * pop;
          if (dark && lvl > .5) { c.globalAlpha = .07 * lvl; c.fillStyle = g.led; c.fillRect(colX[q] - s * .45, y - s * .45, s * 1.9, s * 1.9); }
          c.globalAlpha = al; c.fillStyle = g.led; c.fillRect(x, y - pop, sz, sz);
          const hot = Math.max(fl, w * (lvl * .8 + .2));
          if (hot > .03) { c.globalAlpha = hot; c.fillStyle = g.hot; c.fillRect(x, y - pop, sz, sz); }
        }
      }

      /* контакти: пакети даних під час запису, відлуння хвилі під час читання */
      c.fillStyle = g.hot;
      for (let k = 0; k < nf; k++) {
        const f = fingers[k]; let b = wc[f.c] * (d.fcol[k] ? 1 : .22);
        if (writing) for (let r = Math.max(0, Math.floor(ra) - 1); r <= Math.min(NR - 1, Math.floor(ra)); r++) {
          const age = tt - (T0 + r * ROW); if (age < 0) continue;
          const h = ((k * 73856093) ^ (r * 19349663)) >>> 0, bit = d.fb[r * nf + k] ? 1 : (h % 100 < 9 ? .55 : 0);
          b = Math.max(b, bit * Math.exp(-age / .075));
        } else if (tt > T0 - .3 && tt < T0 - .1 && ((k * 2654435761) >>> 0) % 100 < 30) b = Math.max(b, .65);
        if (b > .04) { c.globalAlpha = Math.min(1, b) * .92; c.fillRect(f.x, g.fyTop, g.fw, g.fh); }
      }
      c.globalAlpha = 1;

      const e = ev(tt); let tl;
      if (e) tl = `${e.w} ${hex(e.a, 4)}`;
      else {
        const wmax = Math.max(...wc), cmax = wc.indexOf(wmax);
        tl = wmax > .25 ? `READ ${hex(BASE + (cmax / nc | 0) * 0x40, 4)}` : `REFRESH ${hex(BASE + (NR - 1) * 0x40, 4)}`;
      }
      return { tl, tr: 'DDR5-6400', bl: 'BURST 8 × 64 bit', br: '8 × 16 Gb' };
    },
  };
}
