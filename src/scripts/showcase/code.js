// Експонат «КОД»: чистий редактор rex.asm — той самий лістинг LFSR, що виконує машина вітрини.
// Смуга поточного рядка плавно ковзає між рядками, на JMP rex у боковому полі прокреслюється дуга-стрілка
// до мітки, каретка блимає, праворуч — регістри (цифри «перекидаються», змінені спалахують золотом) і стрічка OUT.
// Відсилка до КІ: вкладка rex.asm з піксельним КІ-Рексом (він часом кліпає) і мітка rex: — ціль переходу.
// На низьких екранах (телефон) лістинг стає вікном з автопрокруткою за смугою.
import { clamp, lerp, smooth, easeOut, hex, mono, rr, glow, noGlow, rex } from './kit.js';
import { PROGRAM, machine } from './machine.js';

const N = PROGRAM.length, ROWS = N + 1;                              // рядок 0 — коментар, далі команди
const JMP = PROGRAM.findIndex(p => p.op === 'JMP'), JNC = PROGRAM.findIndex(p => p.op === 'JNC');
const HEAD = PROGRAM.findIndex(p => p.label), LABEL = PROGRAM[HEAD].label;
const POLY = [['; LFSR x', 0], ['8', 1], ['+x', 0], ['4', 1], ['+x', 0], ['3', 1], ['+x', 0], ['2', 1], ['+1', 0]];   // коментар зі справжніми степенями

/* ── кольори теми: рядки '#RRGGBB' → rgba / суміш ── */
const memo = new Map();
const rgb = s => {
  let v = memo.get(s);
  if (!v) {
    if (s[0] === '#') { const h = s.length === 4 ? [...s.slice(1)].map(x => x + x).join('') : s.slice(1); v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
    else v = (s.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
    memo.set(s, v);
  }
  return v;
};
const al = (s, a) => { const [r, g, b] = rgb(s); return `rgba(${r},${g},${b},${clamp(a).toFixed(3)})`; };
const mix = (s, t, u) => { const p = rgb(s), q = rgb(t); return `rgb(${Math.round(lerp(p[0], q[0], u))},${Math.round(lerp(p[1], q[1], u))},${Math.round(lerp(p[2], q[2], u))})`; };

/* ── розбір команд для підсвітки синтаксису ── */
const TOK = PROGRAM.map(p => {
  const out = []; let first = true;
  for (const m of p.txt.matchAll(/0x[0-9A-Fa-f]+|[+-]?\d+|[A-Za-z_]+|[[\],]/g)) {
    const s = m[0]; let k = 'pun';
    if (first) { k = 'op'; first = false; }
    else if (/^(0x|[+-]?\d)/.test(s)) k = 'num';
    else if (s === LABEL) k = 'lab';
    else if (/^[AXC]$/.test(s)) k = 'reg';
    out.push({ s, k, i: m.index });
  }
  return out;
});

/* ── дуга-стрілка в боковому полі: ламана з округленими кутами (старт xs,ys → ліворуч до xl → вертикаллю до ye → праворуч до xe) ── */
function bracket(xs, ys, xl, ye, xe, r, hl) {
  const dir = ye < ys ? -1 : 1, p = [[xs, ys]];
  const arc = (cx, cy, a0, a1) => { for (let i = 0; i <= 6; i++) { const a = lerp(a0, a1, i / 6); p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(xl + r, ys + dir * r, -dir * Math.PI / 2, -dir * Math.PI);
  arc(xl + r, ye - dir * r, dir * Math.PI, dir * Math.PI / 2);
  p.push([xe - hl, ye]);
  const cum = [0]; for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return { p, cum, len: cum[cum.length - 1], xe, ye, hl };
}
function trace(c, A, d) {
  c.beginPath(); c.moveTo(A.p[0][0], A.p[0][1]);
  for (let i = 1; i < A.p.length; i++) {
    if (A.cum[i] <= d) c.lineTo(A.p[i][0], A.p[i][1]);
    else { const u = (d - A.cum[i - 1]) / (A.cum[i] - A.cum[i - 1]); c.lineTo(lerp(A.p[i - 1][0], A.p[i][0], u), lerp(A.p[i - 1][1], A.p[i][1], u)); break; }
  }
}
function pointAt(A, d) {
  for (let i = 1; i < A.p.length; i++) if (A.cum[i] >= d) { const u = (d - A.cum[i - 1]) / ((A.cum[i] - A.cum[i - 1]) || 1); return [lerp(A.p[i - 1][0], A.p[i][0], u), lerp(A.p[i - 1][1], A.p[i][1], u)]; }
  return A.p[A.p.length - 1];
}
function arrowHead(c, A) { c.beginPath(); c.moveTo(A.xe, A.ye); c.lineTo(A.xe - A.hl, A.ye - A.hl * .56); c.lineTo(A.xe - A.hl, A.ye + A.hl * .56); c.closePath(); c.fill(); }

/* ── геометрія: залежить лише від розмірів екрана ── */
function layout(c, W, H) {
  const tiny = H < 250, sc = clamp(H / 342, .5, 1.4);
  const x0 = Math.round(clamp(W * .03, 8, 28)), x1 = W - x0, y0 = tiny ? 36 : 40, y1 = H - (tiny ? 34 : 36);
  const th = tiny ? 18 : Math.round(30 * Math.max(1, sc)), padV = tiny ? 2 : Math.round(8 * Math.max(1, sc));
  const by = y0 + th + padV, free = y1 - y0 - th - 2 * padV;
  let V = ROWS; if (free / ROWS < 12.6) V = Math.max(7, Math.floor(free / 12.6));             // тісно — вікно з прокруткою
  const lh = free / V, fs = Math.min(lh * (tiny ? .68 : .64), 22);
  mono(c, fs); const cw = c.measureText('M').width;
  const gp = Math.round(cw * .9), gx1 = x0 + Math.round(2 * cw + 2 * gp);
  const codeX = gx1 + Math.round(3.4 * cw), instrX = codeX + 6 * cw;
  let cm = 0; for (const [s, sup] of POLY) { mono(c, sup ? fs * .62 : fs); cm += c.measureText(s).width; }
  const need = codeX + (V === ROWS ? Math.max(18.5 * cw, cm) : 18.5 * cw) + 1.6 * cw;
  // панель регістрів
  const pad = Math.round(cw * 1.4), lfs = fs * .82;
  mono(c, lfs, 400); const lcw = c.measureText('M').width;
  const bs = Math.max(4, Math.round(cw * .85)), bg = Math.max(1.5, Math.round(cw * .28 * 2) / 2);
  const panelMin = 2 * pad + 3.4 * lcw + 4 * cw + 1.2 * cw + 8 * bs + 7 * bg;
  let px0 = Math.max(need, x0 + (x1 - x0) * .5); px0 = Math.round(Math.min(px0, x1 - panelMin));
  const rp = Math.min(free / 6.5, lh * 1.5);
  const tx0 = px0 + pad, tx1 = x1 - pad, tn = clamp(Math.floor((tx1 - tx0) / (3.7 * cw)), 3, 8);
  // вкладка
  mono(c, fs * .9); const tw = c.measureText('rex.asm').width;
  const px = tiny ? .5 : 1, iw = 20 * px, pl = Math.round(cw * 1.2), tab = { x: x0 + Math.round(cw * 1.1), w: Math.round(pl * 2 + iw + cw * .7 + tw), px, iw, pl };
  // дуги
  const rc = r => by + (r + .5) * lh, xs = instrX - .8 * cw, rr0 = clamp(cw * .55, 3, 6), hl = clamp(cw * .7, 4, 7);
  const tgt = PROGRAM[JNC].v + 1;
  return {
    tiny, V, x0, x1, y0, y1, th, by, lh, fs, cw, gp, gx1, codeX, instrX, px0, pad, lfs, lcw, bs, bg, rp, tx0, tx1, tn, tab,
    vx: px0 + pad + Math.round(3.4 * lcw), ix: x1 - pad, W,
    jmp: bracket(xs, rc(JMP + 1), gx1 + cw, rc(PROGRAM[JMP].v + 1), codeX - 5, rr0, hl),
    jnc: bracket(xs, rc(JNC + 1), gx1 + 2.1 * cw, rc(tgt), xs, rr0, hl),
  };
}

export default function (env) {
  const L = env.L;
  const S = { pc: 0, A: 0, X: 0, C: 0, cycle: 0, out: [] };                                    // знімок машини на момент останнього такту
  const reg = v => ({ cur: v, prev: v, t0: -9, flash: false });
  const R = { pc: reg('0x00'), A: reg('0x00'), X: reg('0x00'), C: reg('0') };
  const B = { from: 1, to: 1, t0: -9, dur: .18, fr: 1, tr: 1 };                                // смуга: рядки «звідки/куди» й час ковзання
  const SC = { from: 0, to: 0, t0: -9, dur: .32 };                                             // прокрутка вікна (лише тісні екрани)
  const bitsA = new Float32Array(8), bitsX = new Float32Array(4), visit = new Float32Array(N).fill(-99);
  let tapeT = -9, jmpT = -99, jncT = -99, landT = -99, last = null, lastT = -1;
  let G = null, cache = null, key = '', frozen = false;

  const rowAt = t => lerp(B.from, B.to, smooth(0, 1, (t - B.t0) / B.dur));
  const scrollAt = t => lerp(SC.from, SC.to, smooth(0, 1, (t - SC.t0) / SC.dur));
  const heat = (i, t) => Math.pow(Math.max(0, 1 - (t - visit[i]) / 1.5), 1.6);
  // вікно прокрутки: тримається так, щоб було видно весь цикл (мітка rex ... JMP), і зсувається, лише коли смуга виходить за його межі
  const home = row => { const mx = ROWS - (G ? G.V : ROWS); return row < mx ? clamp(row - 1, 0, mx) : mx; };
  const follow = (row, vs) => (row > HEAD || row < vs || row > vs + (G ? G.V : ROWS) - 1 ? home(row) : vs);

  /** Один такт машини → мій стан. snap — без анімації (пауза, ручний крок, still) */
  function step(ev, m, t, snap) {
    const to = ev.pc + 1, from = rowAt(t);
    Object.assign(S, { pc: ev.pc, A: m.A, X: m.X, C: m.C, cycle: m.cycle, out: m.out.slice(-12) });
    B.fr = snap ? to : B.tr; B.tr = to; B.from = snap ? to : from; B.to = to; B.t0 = t; B.dur = .17 + Math.min(.12, Math.abs(to - from) * .012);
    const vs = scrollAt(t), nv = follow(to, SC.to); SC.from = snap ? nv : vs; SC.to = nv; SC.t0 = t;
    visit[ev.pc] = t;
    const nxt = { pc: hex(ev.pc), A: hex(m.A), X: hex(m.X), C: String(m.C) };
    for (const k in nxt) { const r = R[k]; if (r.cur !== nxt[k]) { r.prev = snap ? nxt[k] : r.cur; r.cur = nxt[k]; r.t0 = t; r.flash = k !== 'pc'; } }
    if (snap) { for (let k = 0; k < 8; k++) bitsA[k] = (m.A >> k) & 1; for (let k = 0; k < 4; k++) bitsX[k] = (m.X >> k) & 1; }
    if (ev.out !== undefined) tapeT = snap ? -9 : t;
    const hold = snap ? 1 : 0;                                                                  // у знімку дуга вже прокреслена
    if (ev.op === 'JMP') jmpT = t - hold;
    if (ev.op === 'JNC' && m.pc !== (ev.pc + 1) % N) jncT = t - hold;
    if (last && last.op === 'JMP' && ev.pc === PROGRAM[JMP].v) landT = t - hold * .5;
    last = ev;
  }
  function settle() {
    B.from = B.to; B.fr = B.tr; B.t0 = -9; SC.from = SC.to; SC.t0 = -9;
    for (const k in R) R[k].prev = R[k].cur;
    for (let k = 0; k < 8; k++) bitsA[k] = (S.A >> k) & 1; for (let k = 0; k < 4; k++) bitsX[k] = (S.X >> k) & 1;
    tapeT = jmpT = jncT = landT = -99;
  }

  /* ── статичний шар: картка, вкладки, поле номерів, підписи панелі ── */
  function build(c, W, H, D, col) {
    G = layout(c, W, H);
    SC.from = SC.to = home(B.to);
    cache = cache || document.createElement('canvas'); cache.width = Math.round(W * D); cache.height = Math.round(H * D);
    const k = cache.getContext('2d'); k.setTransform(D, 0, 0, D, 0, 0);
    const g = G, dark = col.dark, cw = g.x1 - g.x0, ch = g.y1 - g.y0, hair = al(col.lineStrong, dark ? .42 : .38);
    k.save(); rr(k, g.x0, g.y0, cw, ch, 9); k.clip();
    k.fillStyle = al(col.surface, dark ? .55 : .8); k.fillRect(g.x0, g.y0, cw, ch);
    k.fillStyle = al(col.ink, dark ? .06 : .05);                                                // смуга вкладок з «вирізом» під активну
    k.beginPath(); k.rect(g.x0, g.y0, cw, g.th); k.roundRect(g.tab.x, g.y0 + 5, g.tab.w, g.th - 5, [6, 6, 0, 0]); k.fill('evenodd');
    k.fillStyle = al(col.ink, dark ? .035 : .03); k.fillRect(g.x0, g.y0 + g.th, g.gx1 - g.x0, ch - g.th);   // поле номерів рядків
    k.fillStyle = hair;
    k.fillRect(g.gx1, g.y0 + g.th, 1, ch - g.th);
    k.fillRect(g.px0, g.y0, 1, ch);                                                             // розділ редактора й панелі
    k.fillRect(g.x0, g.y0 + g.th - 1, g.tab.x - g.x0, 1); k.fillRect(g.tab.x + g.tab.w, g.y0 + g.th - 1, g.x1 - g.tab.x - g.tab.w, 1);
    k.restore();
    rr(k, g.x0 + .5, g.y0 + .5, cw - 1, ch - 1, 9); k.strokeStyle = al(col.lineStrong, dark ? .55 : .6); k.lineWidth = 1; k.stroke();
    // вкладка: золота риска, назва файла
    k.save(); k.beginPath(); k.roundRect(g.tab.x, g.y0 + 5, g.tab.w, g.th - 5, [6, 6, 0, 0]); k.clip(); k.fillStyle = col.gold; k.fillRect(g.tab.x, g.y0 + 5, g.tab.w, 2); k.restore();
    mono(k, g.fs * .9); k.fillStyle = col.ink; k.textAlign = 'left';
    k.fillText('rex.asm', g.tab.x + g.tab.pl + g.tab.iw + g.cw * .7, g.y0 + 5 + (g.th - 5) / 2 + g.fs * .9 * .33);
    // панель: заголовок, підписи регістрів, роздільник, підпис OUT
    k.letterSpacing = `${(g.lfs * .12).toFixed(2)}px`; mono(k, g.lfs * .92, 400); k.fillStyle = col.ink3;
    k.fillText(L === 'uk' ? 'РЕГІСТРИ' : 'REGISTERS', g.px0 + g.pad, g.y0 + g.th / 2 + g.lfs * .92 * .33);
    k.letterSpacing = '0px'; mono(k, g.lfs, 400);
    ['PC', 'A', 'X', 'C'].forEach((s, i) => k.fillText(s, g.px0 + g.pad, g.by + (i + .5) * g.rp + g.lfs * .35));
    k.fillStyle = al(col.lineStrong, dark ? .32 : .3); k.fillRect(g.px0 + g.pad, Math.round(g.by + 4.25 * g.rp), g.ix - g.px0 - g.pad, 1);
    k.fillStyle = col.ink3; k.fillText('OUT', g.px0 + g.pad, g.by + 4.85 * g.rp + g.lfs * .35);
  }

  /* ── значення регістра: змінені цифри «перекидаються» вгору, нова виїжджає знизу, золотий спалах ── */
  function value(c, r, x, cy, t, g, col, tail) {
    const s = r.cur, n = s.length, u = clamp((t - r.t0) / .34), e = easeOut(u), fl = r.flash ? 1 - smooth(0, .95, t - r.t0) : 0;
    const rh = g.rp * .78, pre = n === 4 ? 2 : 0, x0 = x + (n === 1 ? 2 * g.cw : 0), base = cy + g.fs * .35;
    if (fl > .01) { c.fillStyle = al(col.gold, (col.dark ? .26 : .3) * fl); rr(c, x0 - 5, cy - rh / 2, n * g.cw + 10, rh, 5); c.fill(); }
    c.save(); c.beginPath(); c.rect(x0 - 3, cy - rh / 2, n * g.cw + 6, rh); c.clip();
    mono(c, g.fs); c.textAlign = 'left';
    const hot = mix(col.ph, col.dark ? '#FFF4D6' : col.goldInk, fl * .85);
    for (let j = 0; j < n; j++) {
      const cx = x0 + j * g.cw, ch = s[j];
      if (j < pre) { c.fillStyle = col.ink3; c.fillText(ch, cx, base); continue; }
      if (fl > .05) glow(c, col, col.gold, 7 * fl);
      c.fillStyle = hot;
      if (u < 1 && r.prev[j] !== ch) {
        const dy = g.rp * .5;
        c.globalAlpha = 1 - e; c.fillText(r.prev[j], cx, base - e * dy);
        c.globalAlpha = e; c.fillText(ch, cx, base + (1 - e) * dy); c.globalAlpha = 1;
      } else c.fillText(ch, cx, base);
      noGlow(c);
    }
    c.restore();
  }

  return {
    enter(t) { if (frozen) return; const to = S.pc + 1; B.from = B.to = to; B.fr = B.tr = to; if (G) SC.from = SC.to = home(to); settle(); },

    tick(ev, t) { step(ev, env.m, t, t === lastT); },

    still() {
      const f = machine(); let e; do { e = f.tick(); } while (!(f.cycle >= 56 && e.pc === HEAD));
      const stop = f.cycle, m = machine();
      while (m.cycle < stop) { const ev = m.tick(); if (m.cycle > stop - 9) step(ev, m, -.35 - .4 * (stop - m.cycle), true); }
      frozen = true; settle(); jmpT = -.8; landT = -.35;
      R.A.t0 = -.35; R.A.flash = true; R.A.prev = hex((S.A >> 1) & 255);
    },

    draw(c, W, H, t, dt) {
      lastT = t;
      const col = env.col, dark = col.dark, D = c.getTransform().a || 1, sig = `${env.gen}|${W}|${H}|${D}`;
      if (sig !== key) { key = sig; build(c, W, H, D, col); }
      const g = G, { by, lh, fs, cw, V } = g, ph = col.ph, ink2 = col.ink2, ink3 = col.ink3;
      c.drawImage(cache, 0, 0, W, H);

      /* ─ редактор ─ */
      const br = rowAt(t), uB = clamp((t - B.t0) / B.dur), eB = smooth(0, 1, uB), svs = scrollAt(t), moving = uB < 1;
      const KC = { op: col.goldInk, reg: dark ? col.ink : ph, num: ink2, lab: mix(col.gold, col.goldInk, dark ? 0 : .3), pun: ink3 };
      c.save(); c.beginPath(); c.rect(g.x0 + 1, by, g.px0 - g.x0 - 1, V * lh); c.clip(); c.translate(0, -svs * lh);
      const rowTop = r => by + r * lh;
      // смуга поточного рядка
      const pulse = Math.max(0, 1 - (t - B.t0 - B.dur) / .5), bc = by + (br + .5) * lh;
      c.fillStyle = al(ph, (dark ? .13 : .06) + (dark ? .07 : .05) * pulse); c.fillRect(g.x0 + 1, bc - lh / 2, g.px0 - g.x0 - 1, lh);
      c.fillStyle = al(ph, .22); c.fillRect(g.x0 + 1, bc - lh / 2, g.px0 - g.x0 - 1, 1); c.fillRect(g.x0 + 1, bc + lh / 2 - 1, g.px0 - g.x0 - 1, 1);
      c.fillStyle = col.gold; glow(c, col, col.gold, 6); c.fillRect(g.x0 + 1, bc - lh / 2, 2.5, lh); noGlow(c);
      // рядки: слід від виконаних команд, номер, текст із підсвіткою
      for (let r = 0; r < ROWS; r++) {
        const cy = rowTop(r) + lh / 2, base = cy + fs * .35, prox = clamp(1 - Math.abs(r - br)), hot = r ? heat(r - 1, t) : 0;
        if (hot > .02) { c.fillStyle = al(ph, hot * (dark ? .075 : .055)); c.fillRect(g.x0 + 1, rowTop(r), g.px0 - g.x0 - 1, lh); }
        mono(c, fs); c.textAlign = 'right'; c.fillStyle = mix(ink3, col.goldInk, prox); c.globalAlpha = .6 + .4 * prox;
        c.fillText(String(r + 1), g.gx1 - g.gp, base);
        c.textAlign = 'left'; c.globalAlpha = .62 + .38 * Math.max(prox, hot * .6);
        if (!r) {                                                                              // коментар зі степенями
          let x = g.codeX; c.fillStyle = ink3;
          for (const [s, sup] of POLY) { mono(c, sup ? fs * .62 : fs); c.fillText(s, x, base - (sup ? fs * .36 : 0)); x += c.measureText(s).width; }
        } else {
          const ins = r - 1;
          if (ins === HEAD) {                                                                  // мітка rex: на золотій плашці, спалахує при приземленні
            const f = 1 - smooth(0, .8, t - landT);
            c.globalAlpha = 1; c.fillStyle = al(col.gold, (dark ? .15 : .17) + .22 * f); rr(c, g.codeX - 3, cy - lh * .34, (LABEL.length + 1) * cw + 6, lh * .68, 4); c.fill();
            mono(c, fs); c.fillStyle = KC.lab; if (f > .05) glow(c, col, col.gold, 6 * f); c.fillText(LABEL + ':', g.codeX, base); noGlow(c);
            c.globalAlpha = .62 + .38 * Math.max(prox, hot * .6);
          }
          mono(c, fs);
          for (const tk of TOK[ins]) { c.fillStyle = KC[tk.k]; c.fillText(tk.s, g.instrX + tk.i * cw, base); }
        }
        c.globalAlpha = 1;
      }
      // дуги переходів: волосяна траса завжди, золота прокреслюється від команди до мітки
      for (const [A, T0, dur] of [[g.jnc, jncT, .26], [g.jmp, jmpT, .36]]) {
        c.lineCap = 'round'; c.lineJoin = 'round';
        trace(c, A, A.len); c.lineWidth = 1; c.strokeStyle = al(col.lineStrong, dark ? .55 : .6); c.stroke();
        c.fillStyle = al(col.lineStrong, dark ? .6 : .65); arrowHead(c, A);
        const since = t - T0;
        if (since < 0 || since > 2.2) continue;
        const gr = smooth(0, 1, (since - .02) / dur), hold = 1 - smooth(.8, 1.9, since);
        glow(c, col, col.gold, 7); c.strokeStyle = al(col.gold, hold); c.lineWidth = 1.8; trace(c, A, A.len * gr); c.stroke();
        if (gr >= .999) { c.fillStyle = al(col.gold, hold); arrowHead(c, A); }
        else if (gr > 0) { const [px, py] = pointAt(A, A.len * gr); c.fillStyle = col.gold; c.beginPath(); c.arc(px, py, 2.3, 0, 6.2832); c.fill(); }
        noGlow(c);
      }
      // каретка в кінці поточної команди: ковзає разом зі смугою, між рухами м'яко блимає
      const endOf = r => g.instrX + PROGRAM[r - 1].txt.length * cw + cw * .35, cxr = lerp(endOf(B.fr), endOf(B.tr), eB);
      const blink = clamp(.5 + .95 * Math.sin(t * 5.4), .12, 1), ca = moving ? 1 : blink;
      c.fillStyle = al(ph, ca); glow(c, col, ph, 6); c.fillRect(Math.round(cxr * 2) / 2, bc - lh * .34, 1.6, lh * .68); noGlow(c);
      c.restore();

      // вкладка: піксельний КІ-Рекс як іконка файла (раз на кілька секунд кліпає)
      const tb = g.tab, cyT = g.y0 + 5 + (g.th - 5) / 2;
      rex(c, tb.x + tb.pl - 5 * tb.px, cyT - 14 * tb.px, tb.px, null, { blink: dt > 0 && t % 3.9 > 3.72 });

      /* ─ панель регістрів ─ */
      const rp = g.rp, vy = i => by + (i + .5) * rp;
      value(c, R.pc, g.vx, vy(0), t, g, col); value(c, R.A, g.vx, vy(1), t, g, col); value(c, R.X, g.vx, vy(2), t, g, col); value(c, R.C, g.vx, vy(3), t, g, col);
      // індикатори праворуч: смужка PC (де була програма), біти A і X, лампа переносу C
      const f = 1 - Math.exp(-dt * 22);
      for (let k = 0; k < 8; k++) bitsA[k] += (((S.A >> k) & 1) - bitsA[k]) * f;
      for (let k = 0; k < 4; k++) bitsX[k] += (((S.X >> k) & 1) - bitsX[k]) * f;
      const vEnd = g.vx + 4 * cw + cw, bs = g.bs, bgp = g.bg;
      const cellsRow = (arr, n, i) => {
        const w = n * bs + (n - 1) * bgp, x = g.ix - w, y = vy(i) - bs / 2;
        if (x < vEnd) return;
        for (let k = 0; k < n; k++) {
          const cx = x + (n - 1 - k) * (bs + bgp);
          c.fillStyle = al(ink3, .22); rr(c, cx, y, bs, bs, 1.5); c.fill();
          if (arr[k] > .02) { c.fillStyle = al(ph, arr[k]); if (arr[k] > .5) glow(c, col, ph, 4); rr(c, cx, y, bs, bs, 1.5); c.fill(); noGlow(c); }
        }
      };
      cellsRow(bitsA, 8, 1); cellsRow(bitsX, 4, 2);
      { // PC
        const ps = Math.max(3, Math.round(bs * .62)), pg = Math.max(2, Math.round(bs * .5)), w = N * ps + (N - 1) * pg, x = g.ix - w, y = vy(0);
        if (x >= vEnd) for (let i = 0; i < N; i++) {
          const h = i === S.pc ? 1 : heat(i, t), cx = x + i * (ps + pg) + ps / 2;
          c.fillStyle = al(ink3, .26); c.beginPath(); c.arc(cx, y, ps / 2, 0, 6.2832); c.fill();
          if (h > .02) { c.fillStyle = al(col.gold, h); if (h > .6) glow(c, col, col.gold, 5); c.beginPath(); c.arc(cx, y, ps / 2 + h * .6, 0, 6.2832); c.fill(); noGlow(c); }
        }
      }
      { // C — лампа переносу
        const y = vy(3), rad = bs * .5, x = g.ix - rad - (bs - 2 * rad > 0 ? 0 : 0);
        if (x - rad >= vEnd) {
          c.beginPath(); c.arc(x, y, rad, 0, 6.2832);
          if (S.C) { c.fillStyle = col.gold; glow(c, col, col.gold, 8); c.fill(); noGlow(c); }
          else { c.strokeStyle = al(ink3, .55); c.lineWidth = 1; c.stroke(); }
        }
      }

      /* ─ стрічка OUT: новий байт в'їжджає справа, решта зсувається ліворуч ─ */
      {
        const n = g.tn, slot = (g.tx1 - g.tx0) / n, ty = by + 5.7 * rp, base = ty + fs * .35, off = 1 - easeOut(clamp((t - tapeT) / .38));
        const list = S.out.slice(-(n + 1)), fl = 1 - smooth(0, .9, t - tapeT);
        c.fillStyle = al(ink3, .28);                                                           // «лінійка» стрічки: порожні комірки
        for (let q = 0; q < n; q++) c.fillRect(Math.round(g.tx0 + (q + .5) * slot - cw * .9), ty + fs * .62, Math.round(cw * 1.8), 1);
        c.save(); c.beginPath(); c.rect(g.tx0 - 3, ty - rp * .5, g.tx1 - g.tx0 + 6, rp); c.clip();
        mono(c, fs); c.textAlign = 'center';
        for (let q = 0; q < list.length; q++) {
          const k = list.length - 1 - q, pos = n - 1 - k + off, a = lerp(.4, 1, clamp(pos / (n - 1))) * smooth(-.9, .1, pos) * (k ? 1 : 1 - smooth(0, 1, off));
          const cx = g.tx0 + (pos + .5) * slot, w = smooth(n - 1.7, n - 1, pos);
          c.globalAlpha = a; c.fillStyle = k ? mix(ink2, ph, w) : mix(ph, col.dark ? '#FFF4D6' : col.goldInk, fl * .8);
          if (!k && fl > .05) glow(c, col, col.gold, 7 * fl);
          c.fillText(hex(list[q]).slice(2), cx, base); noGlow(c);
          if (w > .02) { c.fillStyle = col.gold; c.globalAlpha = a * w; c.fillRect(cx - cw * .9, ty + fs * .62, cw * 1.8, 1.5); }
        }
        c.restore(); c.globalAlpha = 1; c.textAlign = 'left';
      }

      const lastOut = S.out.length ? S.out[S.out.length - 1] : 0;
      return {
        tl: 'rex.asm · LFSR', tr: 'CYCLE ' + S.cycle,
        bl: V < ROWS ? 'x⁸+x⁴+x³+x²+1' : (L === 'uk' ? '8 біт · 9 команд' : '8-bit · 9 instr'),
        br: 'OUT ' + hex(lastOut),
      };
    },
  };
}
