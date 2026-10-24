// Прилади в героях розділів. Кожен розділ — своє радіофізичне явище:
//   ticker   — новини: світлодіодна матриця, що біжить заголовками
//   lorenz   — дослідження: атрактор Лоренца, детермінований хаос
//   field    — (запасний) інтерференція двох джерел
//   fourier  — НМЗ: меандр, що складається з гармонік ряду Фур'є
//   mobius   — вступникам: стрічка Мебіуса, хвиля після обходу інвертує фазу
//   spectrum — навчання: аналізатор спектра з утриманням піків
//   tape     — документи: перфострічка, що кодує назви документів ASCII
//   chladni  — випускники: фігури Хладні, вузлові лінії стоячих хвиль
//   array    — (запасний) фазована антенна решітка
//   liss     — персоналії: фігури Ліссажу, що перетікають між відношеннями частот
//   nnet     — роботодавцям: нейронна мережа, синхронна хвиля прямого проходу
//   life     — (запасний) «Життя» Конвея
//   tess     — (запасний) тесеракт у 4D-обертанні
//   smith    — (запасний) діаграма Сміта, імпеданс сходиться до узгодження
// Без руху (prefers-reduced-motion) малюється один статичний кадр. Поза екраном — пауза.
import { REDUCED, Spring } from './spring.js';
import { columns } from './dotfont.js';

const root = document.documentElement;
const css = v => getComputedStyle(root).getPropertyValue(v).trim();
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
const TAU = Math.PI * 2;

function mount(cv, make) {
  const c = cv.getContext('2d');
  const st = { W: 0, H: 0, D: 1, t: 0, col: {} };
  const theme = () => { st.col = { ph: css('--phosphor'), gold: css('--gold'), line: css('--line-strong'), grat: css('--grat'), ink3: css('--ink-3'), ink2: css('--ink-2'), bg: css('--bg'), surface: css('--surface'), surface2: css('--surface-2'), wine: '#5E1424', dark: isDark() }; };
  theme();
  const inst = make(c, st, cv);
  let raf = 0, last = 0, seen = false;
  const draw = () => { if (st.W) { c.clearRect(0, 0, st.W, st.H); inst.draw(st.t); } };
  const size = () => { const r = cv.getBoundingClientRect(); st.D = Math.min(2, devicePixelRatio || 1); st.W = r.width; st.H = r.height; cv.width = Math.round(st.W * st.D); cv.height = Math.round(st.H * st.D); c.setTransform(st.D, 0, 0, st.D, 0, 0); inst.resize?.(); draw(); };
  const frame = now => { const dt = Math.min(.05, Math.max(0, (now - last) / 1000) || 0); last = now; st.t += dt; inst.step?.(dt); draw(); raf = requestAnimationFrame(frame); };
  const upd = () => { const want = seen && !document.hidden && !REDUCED; if (want && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } if (!want && raf) { cancelAnimationFrame(raf); raf = 0; } };
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; upd(); }, { rootMargin: '60px' }).observe(cv);
  document.addEventListener('visibilitychange', upd);
  document.addEventListener('themechange', () => { theme(); draw(); });
  new ResizeObserver(size).observe(cv);
  if (REDUCED) st.t = inst.still ?? 2.2;
  inst.redraw = draw;
  return inst;
}
const hud = (el, k, v) => { const n = el?.querySelector(`[data-hud="${k}"]`); if (n && n.textContent !== v) n.textContent = v; };

/* ── Новини: світлодіодне табло ─────────────────────────── */
// Короткі повідомлення шрифтом 5×7 по черзі («НОВИНИ» → «33 НОВИНИ» → дата останньої), кожне
// прокреслюється стовпчиками зліва направо; знизу — справжня гістограма новин за роками.
function ticker(c, st, cv) {
  const box = cv.closest('.inst');
  const now = new Date(), today = [now.getDate(), now.getMonth() + 1].map(n => String(n).padStart(2, '0')).join('.') + '.' + now.getFullYear();
  const msgs = JSON.parse(box.dataset.msgs || '["NEWS"]').map(m => m.replace('{today}', today)).map(m => ({ m, cols: columns(m) }));
  const years = JSON.parse(box.dataset.years || '[]');
  const HOLD = 3.2, WIPE = .7;
  return {
    still: WIPE + .1,
    draw(t) {
      const { W, H, col } = st;
      const span = Math.max(...msgs.map(x => x.cols.length)) + 4;
      const pitch = Math.max(4, Math.min(Math.floor((W - 24) / span), Math.floor(H / 15)));
      const tt = Number.isFinite(t) ? Math.max(0, t) : 0, r = pitch * .38, k = Math.floor(tt / HOLD) % msgs.length, phase = tt % HOLD;
      const { cols } = msgs[k];
      const n = Math.floor((W - 24) / pitch), x0 = (W - n * pitch) / 2 + pitch / 2;
      const y0 = Math.round(H / 2 - 3 * pitch), start = Math.floor((n - cols.length) / 2);
      const lit = Math.floor(Math.min(1, phase / WIPE) * (cols.length + 2));       // скільки стовпців уже «прокреслено»
      for (let i = 0; i < n; i++) {
        const ci = i - start, on = ci >= 0 && ci < cols.length && ci < lit ? cols[ci] : 0;
        for (let y = 0; y < 7; y++) {
          const b = on >> y & 1;
          c.globalAlpha = b ? 1 : (col.dark ? .09 : .12);
          c.fillStyle = b ? col.ph : col.line;
          c.shadowBlur = b && col.dark ? 7 : 0; c.shadowColor = col.ph;
          c.beginPath(); c.arc(x0 + i * pitch, y0 + y * pitch, r, 0, TAU); c.fill();
        }
      }
      c.shadowBlur = 0; c.globalAlpha = 1;
      // гістограма за роками
      if (years.length) {
        const top = y0 + 7 * pitch + pitch * 1.4, bottom = H - 44, h = bottom - top, max = Math.max(...years.map(y => y[1]));
        const bw = Math.min(28, (W - 48) / years.length), gx = (W - bw * years.length) / 2;
        c.font = '500 9.5px "Signal Mono", monospace'; c.textAlign = 'center';
        years.forEach(([yr, cnt], i) => {
          const bh = Math.max(2, cnt / max * h), x = gx + i * bw;
          c.fillStyle = col.gold; c.globalAlpha = .45; c.fillRect(x + 3, bottom - bh, bw - 6, bh);
          c.globalAlpha = .9; c.fillStyle = col.ink3;
          if (years.length < 10 || i % 2 === 0 || i === years.length - 1) c.fillText(String(yr).slice(2), x + bw / 2, bottom + 13);
        });
        c.globalAlpha = 1;
      }
      hud(box, 'msg', `${k + 1}/${msgs.length}`);
    },
  };
}

/* ── Дослідження: інтерференція ───────────────────────────── */
function field(c, st, cv) {
  const box = cv.closest('.inst');
  const sx = new Spring({ value: .66, response: 1.1, damping: .9 }), sy = new Spring({ value: .56, response: 1.1, damping: .9 });
  cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); sx.set(Math.min(.9, Math.max(.1, (e.clientX - r.left) / r.width))); sy.set(Math.min(.85, Math.max(.15, (e.clientY - r.top) / r.height))); });
  cv.addEventListener('pointerleave', () => { sx.set(.66); sy.set(.56); });
  const o = document.createElement('canvas'), oc = o.getContext('2d');
  let img = null, GW = 0, GH = 0;
  const rgb = h => { const n = parseInt((h || '#E2C27F').replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  return {
    resize() { GW = Math.max(60, Math.round(st.W)); GH = Math.max(40, Math.round(st.H)); o.width = GW; o.height = GH; img = oc.createImageData(GW, GH); },
    draw(t) {
      if (!img) this.resize();
      const { W, H, col } = st, ph = rgb(col.ph.startsWith('#') ? col.ph : '#E2C27F');
      const lam = Math.min(W, H) / 9, s1 = [W * .34, H * .46], s2 = [sx.value * W, sy.value * H], k = W / GW;
      // яскраві лінії максимумів: різниця ходу кратна довжині хвилі — сімейство гіпербол з фокусами в джерелах
      const d = img.data;
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const x = i * k, y = j * k, r1 = Math.hypot(x - s1[0], y - s1[1]), r2 = Math.hypot(x - s2[0], y - s2[1]);
        const u = (r1 - r2) / lam, fr = Math.abs(u - Math.round(u));
        const g1x = (x - s1[0]) / (r1 || 1) - (x - s2[0]) / (r2 || 1), g1y = (y - s1[1]) / (r1 || 1) - (y - s2[1]) / (r2 || 1);
        const dist = fr * lam / (Math.hypot(g1x, g1y) + 1e-3);       // відстань у пікселях до найближчої гіперболи
        const edge = Math.min(1, Math.max(0, (Math.min(y, H - y) - 22) / 26));   // під підписами вгорі й унизу лінії згасають
        const a = Math.exp(-((dist / .85) ** 2)) * Math.min(1, (r1 + r2) / lam / 3) * edge;
        const q = (j * GW + i) * 4; d[q] = ph[0]; d[q + 1] = ph[1]; d[q + 2] = ph[2]; d[q + 3] = Math.round(220 * a);
      }
      oc.putImageData(img, 0, 0);
      // фронти хвиль, що розходяться від обох джерел (тонке золото, згасає з відстанню)
      c.lineWidth = 1; c.strokeStyle = col.gold;
      const ph0 = (t * lam * .55) % lam, R = Math.hypot(W, H);
      for (const [x0, y0] of [s1, s2]) for (let r = ph0; r < R; r += lam) {
        c.globalAlpha = Math.max(0, .38 - r / (R * 1.3)); c.beginPath(); c.arc(x0, y0, r, 0, TAU); c.stroke();
      }
      c.globalAlpha = 1;
      if (col.dark) { c.shadowColor = col.ph; c.shadowBlur = 5; }
      c.imageSmoothingEnabled = true; c.drawImage(o, 0, 0, W, H); c.shadowBlur = 0;
      for (const [x, y] of [s1, s2]) { c.fillStyle = col.gold; c.beginPath(); c.arc(x, y, 3.2, 0, TAU); c.fill(); c.strokeStyle = col.gold; c.globalAlpha = .45; c.beginPath(); c.arc(x, y, 8, 0, TAU); c.stroke(); c.globalAlpha = 1; }
      hud(box, 'd', (Math.hypot(s2[0] - s1[0], s2[1] - s1[1]) / lam).toFixed(2).replace('.', ',') + ' λ');
    },
  };
}

/* ── НМЗ: ряд Фур'є ──────────────────────────────────────── */
function fourier(c, st, cv) {
  const box = cv.closest('.inst');
  return {
    still: 9.5,
    draw(t) {
      const { W, H, col } = st;
      const cyc = (t * .32) % 8, N = 1 + Math.floor(cyc), f = Math.min(1, (cyc % 1) * 2.2), fe = f * f * (3 - 2 * f);
      const A = H * .27, mid = H * .52, per = W / 2.2, ph = t * .9;
      const terms = Array.from({ length: N }, (_, i) => 2 * i + 1);
      c.lineWidth = 1;
      // окремі гармоніки — тихо, золотом
      terms.forEach((k, i) => {
        const a = i === N - 1 ? fe : 1;
        c.globalAlpha = .22 * a + .04; c.strokeStyle = col.gold; c.beginPath();
        for (let x = 0; x <= W; x += 3) { const y = mid - A * 4 / Math.PI * Math.sin(k * (TAU * x / per - ph)) / k * a; x ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.stroke();
      });
      // сума — яскравий промінь
      c.globalAlpha = 1; c.strokeStyle = col.ph; c.lineWidth = 2; c.lineJoin = 'round';
      if (col.dark) { c.shadowColor = col.ph; c.shadowBlur = 8; }
      c.beginPath();
      for (let x = 0; x <= W; x += 2) {
        let y = 0; terms.forEach((k, i) => { y += Math.sin(k * (TAU * x / per - ph)) / k * (i === N - 1 ? fe : 1); });
        y = mid - A * 4 / Math.PI * y; x ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke(); c.shadowBlur = 0;
      // ідеальний меандр — пунктиром
      c.setLineDash([2, 5]); c.strokeStyle = col.line; c.lineWidth = 1; c.globalAlpha = .7; c.beginPath();
      for (let x = 0; x <= W; x += 1) { const s = Math.sign(Math.sin(TAU * x / per - ph)) || 1; const y = mid - A * s; x ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
      hud(box, 'n', String(N));
      hud(box, 'k', terms.join(' · '));
    },
  };
}

/* ── Вступникам: аналізатор спектра ───────────────────────── */
function spectrum(c, st, cv) {
  const B = 40, peak = new Float32Array(B), pv = new Float32Array(B);
  let cur = new Float32Array(B);
  return {
    step(dt) { for (let i = 0; i < B; i++) { if (cur[i] >= peak[i]) { peak[i] = cur[i]; pv[i] = 0; } else { pv[i] += dt * .9; peak[i] = Math.max(cur[i], peak[i] - pv[i] * dt); } } },
    draw(t) {
      const { W, H, col } = st;
      const gw = W / B, base = H - 56, top = 40;
      for (let i = 0; i < B; i++) {
        const x = i / B;
        const v = .1 + .75 * Math.exp(-((x - .22 - .05 * Math.sin(t * .7)) ** 2) / .006) + .5 * Math.exp(-((x - .58 - .08 * Math.sin(t * .43)) ** 2) / .012) * (.7 + .3 * Math.sin(t * 2.1)) + .35 * Math.exp(-((x - .83) ** 2) / .003) * (.5 + .5 * Math.sin(t * 3.3 + 1)) + .06 * Math.sin(i * 12.9898 + t * 9) ** 2;
        cur[i] = Math.min(1, v);
        const h = cur[i] * (base - top);
        const g = c.createLinearGradient(0, base - h, 0, base);
        g.addColorStop(0, col.ph); g.addColorStop(1, col.dark ? 'rgba(226,194,127,.15)' : 'rgba(94,20,36,.12)');
        c.fillStyle = g; c.fillRect(i * gw + 1.5, base - h, gw - 3, h);
        c.fillStyle = col.gold; c.fillRect(i * gw + 1.5, base - peak[i] * (base - top) - 3, gw - 3, 2);
      }
      c.fillStyle = col.line; c.fillRect(0, base + 4, W, 1);
      c.font = '500 9.5px "Signal Mono", monospace'; c.fillStyle = col.ink3; c.textAlign = 'center';
      ['0', '1', '2', '3', '4', 'GHz'].forEach((s, i) => c.fillText(s, 18 + i * (W - 36) / 5, base + 19));
    },
    still: 3,
  };
}

/* ── Документи: перфострічка ──────────────────────────────── */
function tape(c, st, cv) {
  const box = cv.closest('.inst');
  const text = (box.dataset.text || 'DOCUMENTS') + ' · ';
  const bytes = [...new TextEncoder().encode(text.normalize('NFC'))];
  return {
    draw(t) {
      const { W, H, col } = st;
      const pitch = Math.max(10, Math.floor(H / 13)), th = pitch * 9.4, ty = (H - th) / 2;
      // стрічка
      c.fillStyle = col.dark ? '#2A2420' : '#FFFDF8'; c.fillRect(0, ty, W, th);
      c.fillStyle = col.line; c.globalAlpha = .5; c.fillRect(0, ty, W, 1); c.fillRect(0, ty + th - 1, W, 1); c.globalAlpha = 1;
      const speed = 26, off = (t * speed) % pitch, i0 = Math.floor(t * speed / pitch);
      const n = Math.ceil(W / pitch) + 2, head = Math.floor(n / 2);
      let readByte = 0;
      for (let j = -1; j < n; j++) {
        const x = j * pitch - off + pitch / 2, b = bytes[(i0 + j) % bytes.length];
        if (j === head) readByte = b;
        for (let bit = 0; bit < 8; bit++) {
          const row = bit < 3 ? bit : bit + 1, y = ty + pitch * .7 + row * pitch;
          if (b >> bit & 1) { c.fillStyle = col.dark ? '#0C0A09' : '#3A322B'; c.beginPath(); c.arc(x, y, pitch * .32, 0, TAU); c.fill(); }
        }
        c.fillStyle = col.dark ? '#0C0A09' : '#3A322B'; c.globalAlpha = .55; c.beginPath(); c.arc(x, ty + pitch * .7 + 3 * pitch, pitch * .15, 0, TAU); c.fill(); c.globalAlpha = 1;
      }
      // зчитувальна головка
      const hx = head * pitch - off + pitch / 2;
      c.fillStyle = col.ph; c.globalAlpha = .16; c.fillRect(hx - pitch / 2, ty - 6, pitch, th + 12); c.globalAlpha = 1;
      c.fillStyle = col.ph; c.fillRect(hx - .75, ty - 10, 1.5, th + 20);
      hud(box, 'byte', '0x' + readByte.toString(16).toUpperCase().padStart(2, '0'));
      hud(box, 'bin', readByte.toString(2).padStart(8, '0'));
    },
  };
}

/* ── Випускники: фазована решітка ─────────────────────────── */
function array(c, st, cv) {
  const box = cv.closest('.inst'), N = 8;
  return {
    draw(t) {
      const { W, H, col } = st;
      const th = Math.sin(t * .45) * .75, cx = W / 2, by = H - 30, sp = Math.min(W / (N + 3), 34), lam = sp * 2;
      // хвильові фронти від елементів з прогресивним зсувом фази
      c.lineWidth = 1;
      for (let e = 0; e < N; e++) {
        const ex = cx + (e - (N - 1) / 2) * sp, dph = -e * sp * Math.sin(th);
        for (let k = 0; k < 9; k++) {
          const r = ((t * 30 + dph) % lam + lam) % lam + k * lam;
          c.globalAlpha = Math.max(0, .2 - r / (H * 5)); c.strokeStyle = col.gold;
          c.beginPath(); c.arc(ex, by, r, Math.PI, TAU); c.stroke();
        }
      }
      // діаграма спрямованості (множник решітки) — яскравий пелюсток
      c.globalAlpha = 1; c.beginPath();
      const R = Math.min(H - 60, W * .46);
      for (let a = 0; a <= 180; a++) {
        // крок λ/2: ψ = π(cos φ − sin θ); головний пелюсток там, де cos φ = sin θ
        const phi = (a / 180) * Math.PI, psi = Math.PI * (Math.cos(phi) - Math.sin(th));
        const den = N * Math.sin(psi / 2), af = Math.abs(den) < 1e-6 ? 1 : Math.abs(Math.sin(N * psi / 2) / den);
        const rr = af * R, x = cx + Math.cos(phi) * rr, y = by - Math.sin(phi) * rr;
        a ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
      c.fillStyle = col.dark ? 'rgba(226,194,127,.10)' : 'rgba(94,20,36,.07)'; c.fill();
      c.strokeStyle = col.ph; c.lineWidth = 1.8; if (col.dark) { c.shadowColor = col.ph; c.shadowBlur = 8; } c.stroke(); c.shadowBlur = 0;
      // елементи
      for (let e = 0; e < N; e++) { const ex = cx + (e - (N - 1) / 2) * sp; c.fillStyle = col.gold; c.fillRect(ex - 4, by, 8, 4); c.fillRect(ex - .5, by - 8, 1, 8); }
      c.fillStyle = col.line; c.fillRect(0, by + 5, W, 1);
      hud(box, 'theta', (Math.asin(Math.sin(th)) * 180 / Math.PI).toFixed(0) + '°');
    },
  };
}

/* ── Випускники: фігури Хладні — вузлові лінії стоячих хвиль на пластині ── */
// f(x, y) = cos(nπx)·cos(mπy) − cos(mπx)·cos(nπy); пісок збирається там, де f = 0.
// Моди (n, m) плавно перетікають одна в одну; лінії світяться, як промінь приладу.
function chladni(c, st, cv) {
  const box = cv.closest('.inst');
  const MODES = [[2, 3], [1, 4], [3, 5], [2, 5], [1, 6], [4, 7], [3, 7], [2, 7], [5, 8]];
  const o = document.createElement('canvas'), oc = o.getContext('2d');
  let img = null, GW = 0, GH = 0, grain = null;
  const rgb = h => { const n = parseInt((h || '#E2C27F').replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const P = Math.PI;
  // значення й градієнт f для моди (n, m)
  const fg = (n, m, x, y, out) => {
    const cnx = Math.cos(n * P * x), cmy = Math.cos(m * P * y), cmx = Math.cos(m * P * x), cny = Math.cos(n * P * y);
    const snx = Math.sin(n * P * x), smy = Math.sin(m * P * y), smx = Math.sin(m * P * x), sny = Math.sin(n * P * y);
    out[0] = cnx * cmy - cmx * cny;
    out[1] = -n * P * snx * cmy + m * P * smx * cny;
    out[2] = -m * P * cnx * smy + n * P * cmx * sny;
  };
  const A = [0, 0, 0], B = [0, 0, 0];
  return {
    still: 1.2,
    resize() {
      const s = Math.min(st.W, st.H) * .8; GW = GH = Math.max(96, Math.round(s / 1.15));
      o.width = GW; o.height = GH; img = oc.createImageData(GW, GH);
      grain = new Float32Array(GW * GH); for (let q = 0; q < grain.length; q++) grain[q] = Math.random();   // «піщинки» — сталий шум
    },
    draw(t) {
      if (!img) this.resize();
      const { W, H, col } = st, ph = rgb(col.ph.startsWith('#') ? col.ph : '#E2C27F');
      const HOLD = 4.4, k = Math.floor(t / HOLD), u = (t % HOLD) / HOLD;
      const e = u < .6 ? 0 : (u - .6) / .4, w = e * e * (3 - 2 * e);
      const [n1, m1] = MODES[k % MODES.length], [n2, m2] = MODES[(k + 1) % MODES.length];
      const d = img.data, width = 1.6 / GW;                       // півширина лінії ≈ 1,6 комірки
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const x = i / (GW - 1), y = j / (GH - 1);
        fg(n1, m1, x, y, A); fg(n2, m2, x, y, B);
        const v = A[0] * (1 - w) + B[0] * w, gx = A[1] * (1 - w) + B[1] * w, gy = A[2] * (1 - w) + B[2] * w;
        const dist = Math.abs(v) / (Math.hypot(gx, gy) + 1e-3);    // відстань до вузлової лінії — лінії рівної товщини
        const g = Math.exp(-((dist / width) ** 2)), q = j * GW + i;
        const a = g > grain[q] * .9 ? Math.min(1, .55 + g * .6) : g * .25;   // пісок: щільно на лінії, зрідка поруч
        d[q * 4] = ph[0]; d[q * 4 + 1] = ph[1]; d[q * 4 + 2] = ph[2]; d[q * 4 + 3] = Math.round(255 * a);
      }
      oc.putImageData(img, 0, 0);
      const s = Math.min(W, H) * .8, x0 = (W - s) / 2, y0 = (H - s) / 2 + 2;
      c.strokeStyle = col.gold; c.globalAlpha = .5; c.lineWidth = 1; c.strokeRect(x0 - .5, y0 - .5, s + 1, s + 1); c.globalAlpha = 1;
      if (col.dark) { c.shadowColor = col.ph; c.shadowBlur = 5; }
      c.imageSmoothingEnabled = true; c.drawImage(o, x0, y0, s, s); c.shadowBlur = 0;
      c.fillStyle = col.gold; c.beginPath(); c.arc(W / 2, y0 + s / 2, 2.2, 0, TAU); c.fill();
      const [n, m] = w < .5 ? [n1, m1] : [n2, m2];
      hud(box, 'mode', `(${n}, ${m})`);
    },
  };
}

/* ── Персоналії: Ліссажу ──────────────────────────────────── */
function liss(c, st, cv) {
  const box = cv.closest('.inst');
  const R = [[1, 2], [3, 2], [3, 4], [5, 4], [2, 3], [1, 1]];
  const a = new Spring({ value: 1, response: 1.6, damping: .9 }), b = new Spring({ value: 2, response: 1.6, damping: .9 });
  let k = 0, next = 4;
  return {
    still: 1,
    step(dt) { next -= dt; if (next <= 0) { k = (k + 1) % R.length; a.set(R[k][0]); b.set(R[k][1]); next = 4.5; hud(box, 'ratio', `${R[k][0]}:${R[k][1]}`); } },
    draw(t) {
      const { W, H, col } = st, cx = W / 2, cy = H / 2 + 4, rx = Math.min(W, H) * .4, ry = rx;
      c.strokeStyle = col.line; c.globalAlpha = .35; c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx - rx - 10, cy); c.lineTo(cx + rx + 10, cy); c.moveTo(cx, cy - ry - 10); c.lineTo(cx, cy + ry + 10); c.stroke();
      c.globalAlpha = 1; c.strokeStyle = col.ph; c.lineWidth = 1.8; c.lineJoin = 'round';
      if (col.dark) { c.shadowColor = col.ph; c.shadowBlur = 8; }
      const ph = t * .5;
      c.beginPath();
      for (let i = 0; i <= 720; i++) { const s = i / 720 * TAU; const x = cx + rx * Math.sin(a.value * s + ph), y = cy + ry * Math.sin(b.value * s); i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke(); c.shadowBlur = 0;
      const s = (t * .9) % TAU; c.fillStyle = col.gold; c.beginPath(); c.arc(cx + rx * Math.sin(a.value * s + ph), cy + ry * Math.sin(b.value * s), 3.5, 0, TAU); c.fill();
    },
  };
}

/* ── Роботодавцям: діаграма Сміта, узгодження ─────────────── */
function smith(c, st, cv) {
  const box = cv.closest('.inst');
  let z0 = [2.6, 1.4], t0 = 0;
  const gamma = (r, x) => { const dr = (r + 1) ** 2 + x * x; return [((r * r + x * x - 1) / dr), (2 * x / dr)]; };
  return {
    still: 3.2,
    draw(t) {
      const { W, H, col } = st, R = Math.min(W, H) * .4, cx = W / 2, cy = H / 2 + 4;
      c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
      c.lineWidth = 1; c.strokeStyle = col.gold;
      [0, .2, .5, 1, 2, 5].forEach(r => { c.globalAlpha = .45; c.beginPath(); c.arc(cx + R * r / (1 + r), cy, R / (1 + r), 0, TAU); c.stroke(); });
      [.2, .5, 1, 2, 5].forEach(x => [1, -1].forEach(s => { c.globalAlpha = .25; c.strokeStyle = col.line; c.beginPath(); c.arc(cx + R, cy - s * R / x, R / x, 0, TAU); c.stroke(); }));
      c.restore();
      c.globalAlpha = .6; c.strokeStyle = col.gold; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.stroke(); c.globalAlpha = 1;
      // траєкторія імпедансу: від випадкової точки спіраллю до центру (Γ → 0)
      const T = 6, k = ((t - t0) % T) / T;
      if (t - t0 > T) { t0 = t; z0 = [.3 + Math.random() * 3.5, (Math.random() - .5) * 4]; }
      c.strokeStyle = col.ph; c.lineWidth = 1.8; if (col.dark) { c.shadowColor = col.ph; c.shadowBlur = 8; }
      c.beginPath();
      let last = [0, 0];
      const steps = Math.max(2, Math.floor(k * 120));
      for (let i = 0; i <= steps; i++) {
        const u = i / 120, e = 1 - Math.pow(1 - Math.min(1, u * 1.25), 3);
        const r = z0[0] + (1 - z0[0]) * e, x = z0[1] * (1 - e) * Math.cos(u * 9);
        const g = gamma(r, x); last = g;
        const px = cx + g[0] * R, py = cy - g[1] * R; i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke(); c.shadowBlur = 0;
      c.fillStyle = col.gold; c.beginPath(); c.arc(cx + last[0] * R, cy - last[1] * R, 4, 0, TAU); c.fill();
      const G = Math.hypot(last[0], last[1]), vswr = (1 + G) / (1 - G || 1e-6);
      hud(box, 'g', G.toFixed(2).replace('.', ','));
      hud(box, 'vswr', (vswr > 20 ? '>20' : vswr.toFixed(2).replace('.', ',')));
    },
  };
}

/* ── Вступникам: стрічка Мебіуса — по ній біжить хвиля, що після обходу інвертує фазу ── */
function mobius(c, st, cv) {
  const yaw = new Spring({ value: .6, response: 1.1, damping: .9 }), pitch = new Spring({ value: .55, response: 1.1, damping: .9 });
  const U = 160;
  const P = (u, v) => { const r = 1 + v / 2 * Math.cos(u / 2); return [r * Math.cos(u), r * Math.sin(u), v / 2 * Math.sin(u / 2)]; };
  cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); yaw.set(.6 + ((e.clientX - r.left) / r.width - .5) * 1.6); pitch.set(.55 + ((e.clientY - r.top) / r.height - .5) * 1.1); });
  cv.addEventListener('pointerleave', () => { yaw.set(.6); pitch.set(.55); });
  let tt = 0;
  const proj = ([x, y, z]) => {
    const { W, H } = st, a = yaw.value + tt * .12, b = pitch.value;
    const X = x * Math.cos(a) - y * Math.sin(a), Y = x * Math.sin(a) + y * Math.cos(a), Z = z;
    const Y2 = Y * Math.cos(b) - Z * Math.sin(b), Z2 = Y * Math.sin(b) + Z * Math.cos(b);
    const s = Math.min(W * .26, H * .36) / (1 + Y2 * .18);
    return [W / 2 + X * s, H / 2 + 4 - Z2 * s * 1.05, Y2];
  };
  const wave = u => .78 * Math.sin(u * 3.5) * Math.cos(u / 2 - Math.floor(u / (Math.PI * 2)) * Math.PI);
  return {
    still: 2,
    draw(t) {
      tt = t; const { col } = st;
      const segs = [];
      for (let i = 0; i < U; i++) { const u = i / U * TAU; const a = proj(P(u, -1)), b = proj(P(u, 1)); segs.push([(a[2] + b[2]) / 2, a, b, i]); }
      segs.sort((p, q) => q[0] - p[0]);
      c.lineWidth = 1;
      for (const [d, a, b, i] of segs) { c.globalAlpha = .12 + .5 * (1 - (d + 1.6) / 3.2); c.strokeStyle = i % 8 ? col.line : col.gold; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      // єдиний край стрічки: обходить її двічі
      c.globalAlpha = .9; c.strokeStyle = col.gold; c.lineWidth = 1.2; c.beginPath();
      for (let i = 0; i <= U * 2; i++) { const p = proj(P(i / U * TAU, 1)); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }
      c.stroke();
      c.strokeStyle = col.ph; c.lineWidth = 1.8; c.shadowColor = col.ph; c.shadowBlur = col.dark ? 8 : 0;
      const head = (t * .9) % (Math.PI * 4);
      c.beginPath();
      for (let i = 0; i <= 260; i++) { const u = head - i / 260 * Math.PI * 1.6, p = proj(P(u, wave(u) * (1 - i / 260))); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }
      c.globalAlpha = 1; c.stroke(); c.shadowBlur = 0;
      const hp = proj(P(head, wave(head)));
      const g = c.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], 12); g.addColorStop(0, col.ph); g.addColorStop(1, 'transparent');
      c.fillStyle = g; c.fillRect(hp[0] - 12, hp[1] - 12, 24, 24);
      hud(cv.closest('.inst'), 'lap', head < TAU ? '1' : '2');
      hud(cv.closest('.inst'), 'phase', head < TAU ? '0°' : '180°');
    },
  };
}

/* ── Роботодавцям: нейронна мережа — синхронна хвиля прямого проходу ── */
// Ваги — товщина й яскравість зв'язків; імпульси біжать від входів до виходів, нейрони спалахують за активацією.
// Курсор біля нейрона підсвічує його зв'язки.
function nnet(c, st, cv) {
  const box = cv.closest('.inst');
  const LAYERS = [4, 7, 7, 5, 2], SEG = 1.7, REST = 1.1;           // секунд на шар і пауза між прикладами
  let nodes = [], edges = [], act = [], shown = [], hl = [], hover = -1, clock = 0, pass = 0, live = [];
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const sine = x => .5 - .5 * Math.cos(Math.PI * x);               // м'яка синусоїдальна крива: повільний старт і фініш
  function build() {
    const { W, H } = st, padX = W * .1, top = 36, bot = H - 36;
    nodes = []; edges = [];
    LAYERS.forEach((n, l) => { for (let i = 0; i < n; i++) nodes.push({ l, x: padX + (W - 2 * padX) * l / (LAYERS.length - 1), y: top + (bot - top) * (n === 1 ? .5 : i / (n - 1)) }); });
    let base = 0;
    for (let l = 0; l < LAYERS.length - 1; l++) {
      const nb = base + LAYERS[l];
      for (let i = 0; i < LAYERS[l]; i++) for (let j = 0; j < LAYERS[l + 1]; j++) edges.push({ a: base + i, b: nb + j, w: rnd() * 2 - 1, l });
      base = nb;
    }
    act = nodes.map(() => 0); shown = nodes.map(() => 0); hl = edges.map(() => 0); newPass();
  }
  function newPass() {                               // новий приклад: які зв'язки «проведуть» сигнал цього разу
    pass++; clock = 0;
    live = edges.map(e => Math.abs(e.w) > .35 && Math.random() < .55);
    nodes.forEach((n, i) => { if (n.l === 0) act[i] = .45 + rnd() * .55; });
  }
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best = -1, bd = 30; nodes.forEach((n, i) => { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = i; } }); hover = best;
  });
  cv.addEventListener('pointerleave', () => { hover = -1; });
  return {
    still: SEG * 1.5,
    resize() { build(); },
    step(dt) {
      if (!nodes.length) build();
      const before = Math.floor(clock / SEG); clock += dt;
      const seg = Math.floor(clock / SEG);
      if (seg > before && before < LAYERS.length - 1) {               // хвиля дійшла до наступного шару — він спалахує
        edges.forEach((e, i) => { if (live[i] && e.l === before) act[e.b] = Math.min(1, act[e.b] + Math.abs(e.w) * .45); });
      }
      if (clock > SEG * (LAYERS.length - 1) + REST) newPass();
      const k = 1 - Math.pow(.03, dt);
      for (let i = 0; i < act.length; i++) { act[i] *= Math.pow(.6, dt); shown[i] += (act[i] - shown[i]) * k; }
      const kh = 1 - Math.pow(.001, dt);
      edges.forEach((e, i) => { hl[i] += ((hover === e.a || hover === e.b ? 1 : 0) - hl[i]) * kh; });
      hud(box, 'pass', String(pass));
    },
    draw() {
      if (!nodes.length) build();
      const { col } = st;
      edges.forEach((e, i) => {
        const A = nodes[e.a], B = nodes[e.b], h = hl[i];
        c.strokeStyle = e.w > 0 ? col.gold : col.line;
        c.globalAlpha = .08 + Math.abs(e.w) * .2 + h * .6; c.lineWidth = .6 + Math.abs(e.w) * .7 + h * .6;
        c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
      });
      // синхронна хвиля: усі імпульси шару рухаються разом
      const seg = Math.floor(clock / SEG), u = (clock % SEG) / SEG;
      if (seg < LAYERS.length - 1) {
        const hd = sine(u), tl = sine(Math.max(0, u - .26)), fade = Math.sin(Math.PI * u);
        c.lineCap = 'round'; if (col.dark) { c.shadowColor = col.ph; c.shadowBlur = 8; }
        edges.forEach((e, i) => {
          if (!live[i] || e.l !== seg) return;
          const A = nodes[e.a], B = nodes[e.b];
          const x0 = A.x + (B.x - A.x) * tl, y0 = A.y + (B.y - A.y) * tl, x1 = A.x + (B.x - A.x) * hd, y1 = A.y + (B.y - A.y) * hd;
          const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col.ph);
          c.globalAlpha = Math.min(1, .25 + fade) * (.5 + Math.abs(e.w) * .5); c.strokeStyle = g; c.lineWidth = 2;
          c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        });
        c.shadowBlur = 0;
      }
      nodes.forEach((n, i) => {
        const v = shown[i], r = 5.5 + v * 2;
        c.globalAlpha = 1; c.fillStyle = col.dark ? '#141211' : '#F1EBE0'; c.beginPath(); c.arc(n.x, n.y, r, 0, TAU); c.fill();
        c.strokeStyle = col.gold; c.lineWidth = 1.2; c.stroke();
        if (v > .02) { c.globalAlpha = Math.min(1, v * 1.2); c.fillStyle = col.ph; if (col.dark) { c.shadowColor = col.ph; c.shadowBlur = 10 * v; } c.beginPath(); c.arc(n.x, n.y, r - 1.6, 0, TAU); c.fill(); c.shadowBlur = 0; }
      });
      c.globalAlpha = 1;
    },
  };
}

/* ── Дослідження: атрактор Лоренца — детермінований хаос ── */
// dx/dt = σ(y − x), dy/dt = x(ρ − z) − y, dz/dt = xy − βz; σ = 10, ρ = 28, β = 8/3.
// Траєкторія будується наживо (Рунге — Кутта 4), повільно обертається; старі ділянки згасають; курсор нахиляє вигляд.
function lorenz(c, st, cv) {
  const box = cv.closest('.inst');
  const S = 10, Rr = 28, B = 8 / 3, N = 2600, DT = .006;
  const pts = []; let p = [0.1, 0, 20], tt = 0;
  const yaw = new Spring({ value: 0, response: 1.2, damping: .9 }), tilt = new Spring({ value: 0, response: 1.2, damping: .9 });
  const f = ([x, y, z]) => [S * (y - x), x * (Rr - z) - y, x * y - B * z];
  const rk = q => { const k1 = f(q), k2 = f(q.map((v, i) => v + k1[i] * DT / 2)), k3 = f(q.map((v, i) => v + k2[i] * DT / 2)), k4 = f(q.map((v, i) => v + k3[i] * DT)); return q.map((v, i) => v + DT / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); };
  for (let i = 0; i < 400; i++) p = rk(p);                          // вихід на атрактор
  for (let i = 0; i < N; i++) { p = rk(p); pts.push(p); }
  cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); yaw.set(((e.clientX - r.left) / r.width - .5) * 1.4); tilt.set(((e.clientY - r.top) / r.height - .5) * .8); });
  cv.addEventListener('pointerleave', () => { yaw.set(0); tilt.set(0); });
  return {
    still: 0,
    step(dt) { for (let i = 0; i < 2; i++) { p = rk(p); pts.push(p); pts.shift(); } tt += dt; },   // 2 кроки на кадр — спокійний темп
    draw() {
      // вигляд «метелика» спереди, ледь погойдується; курсор нахиляє
      const { W, H, col } = st, a = .45 * Math.sin(tt * .06) + yaw.value, b = .12 + tilt.value, s = Math.min(W / 42, (H - 64) / 44), cx = W / 2, cy = H / 2 + 6;
      const pr = ([x, y, z]) => { const X = x * Math.cos(a) - y * Math.sin(a), Y = x * Math.sin(a) + y * Math.cos(a), Z = z - 25; return [cx + X * s, cy - (Z * Math.cos(b) - Y * Math.sin(b)) * s]; };
      c.lineJoin = 'round'; c.lineCap = 'round';
      const CH = 26, step = Math.ceil(pts.length / CH);
      for (let k = 0; k < CH; k++) {                                  // відрізками: що старіше — то блідіше
        const i0 = k * step, i1 = Math.min(pts.length - 1, i0 + step);
        c.globalAlpha = .06 + .94 * (k / (CH - 1)) ** 2; c.strokeStyle = col.ph; c.lineWidth = .9 + .7 * (k / CH);
        if (col.dark && k > CH - 6) { c.shadowColor = col.ph; c.shadowBlur = 6; } else c.shadowBlur = 0;
        c.beginPath(); let q = pr(pts[i0]); c.moveTo(q[0], q[1]);
        for (let i = i0 + 1; i <= i1; i++) { q = pr(pts[i]); c.lineTo(q[0], q[1]); }
        c.stroke();
      }
      c.shadowBlur = 0; c.globalAlpha = 1;
      const hdp = pr(pts[pts.length - 1]), g = c.createRadialGradient(hdp[0], hdp[1], 0, hdp[0], hdp[1], 10);
      g.addColorStop(0, col.ph); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(hdp[0] - 10, hdp[1] - 10, 20, 20);
      c.fillStyle = col.gold; c.beginPath(); c.arc(hdp[0], hdp[1], 2.2, 0, TAU); c.fill();
      hud(box, 'z', p[2].toFixed(1).replace('.', ','));
    },
  };
}

/* ── Роботодавцям: «Життя» Конвея — клітинний автомат B3/S23 (повний за Тюрінгом) ── */
// Планерна рушниця Госпера й рідкий «суп»; живі клітини світяться, відмерлі лишають слід.
// Курсором можна «підсіяти» клітини; коли колонія завмирає — народжується нова.
function life(c, st, cv) {
  const box = cv.closest('.inst');
  const GUN = ['........................O', '......................O.O', '............OO......OO............OO', '...........O...O....OO............OO', 'OO........O.....O...OO', 'OO........O...O.OO....O.O', '..........O.....O.......O', '...........O...O', '............OO'];
  let C = 0, R = 0, cell = 6, a = null, b = null, glow = null, gen = 0, acc = 0, calm = 0, lastPop = 0;
  const idx = (x, y) => ((y + R) % R) * C + ((x + C) % C);
  function seed() {
    a.fill(0); gen = 0; calm = 0;
    for (let q = 0; q < a.length; q++) if (Math.random() < .07) a[q] = 1;
    for (let y = 0; y < Math.min(R, GUN.length + 4); y++) for (let x = 0; x < Math.min(C, 40); x++) a[idx(x, y)] = 0;
    GUN.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'O' && x + 2 < C && y + 2 < R) a[idx(x + 2, y + 2)] = 1; }));
  }
  function step() {
    let pop = 0;
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) n += a[idx(x + dx, y + dy)];
      const q = y * C + x; b[q] = (a[q] ? (n === 2 || n === 3) : n === 3) ? 1 : 0; pop += b[q];
    }
    [a, b] = [b, a]; gen++;
    for (let q = 0; q < a.length; q++) glow[q] = a[q] ? 1 : glow[q] * .82;
    calm = Math.abs(pop - lastPop) < 3 ? calm + 1 : 0; lastPop = pop;
    if (calm > 60 || pop < 8) seed();
    hud(box, 'gen', String(gen)); hud(box, 'pop', String(pop));
  }
  cv.addEventListener('pointermove', e => {
    if (!a) return;
    const r = cv.getBoundingClientRect(), ox = (st.W - C * cell) / 2, oy = (st.H - R * cell) / 2;
    const x = Math.floor((e.clientX - r.left - ox) / cell), y = Math.floor((e.clientY - r.top - oy) / cell);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (Math.random() < .5) a[idx(x + dx, y + dy)] = 1;
  });
  return {
    still: 4,
    resize() {
      cell = Math.max(6, Math.round(Math.min(st.W, st.H) / 38));
      C = Math.max(20, Math.floor((st.W - 24) / cell)); R = Math.max(12, Math.floor((st.H - 64) / cell));   // поле не заходить під підписи
      a = new Uint8Array(C * R); b = new Uint8Array(C * R); glow = new Float32Array(C * R); seed();
      if (REDUCED) for (let i = 0; i < 60; i++) step();
    },
    step(dt) { if (!a) return; acc += dt; while (acc > .11) { step(); acc -= .11; } },
    draw() {
      if (!a) this.resize();
      const { W, H, col } = st, ox = (W - C * cell) / 2, oy = (H - R * cell) / 2, sz = cell - 1.5;
      c.fillStyle = col.line; c.globalAlpha = .35;
      for (let y = 0; y <= R; y++) for (let x = 0; x <= C; x++) c.fillRect(ox + x * cell - .75, oy + y * cell - .75, 1, 1);
      c.globalAlpha = 1; c.fillStyle = col.ph;
      if (col.dark) { c.shadowColor = col.ph; c.shadowBlur = 4; }
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
        const g = glow[y * C + x]; if (g < .06) continue;
        c.globalAlpha = a[y * C + x] ? 1 : g * .32;
        c.beginPath(); c.roundRect(ox + x * cell + .75, oy + y * cell + .75, sz, sz, Math.max(1, sz * .28)); c.fill();
      }
      c.globalAlpha = 1; c.shadowBlur = 0;
    },
  };
}

/* ── (запасний) тесеракт ──────────────────────────────────── */
function tess(c, st, cv) {
  const V = []; for (let i = 0; i < 16; i++) V.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
  const E = []; for (let i = 0; i < 16; i++) for (let k = 0; k < 4; k++) { const j = i ^ (1 << k); if (j > i) E.push([i, j, k]); }
  const ang = { xw: 0, yz: 0, zw: 0 };
  const tilt = new Spring({ value: 0, response: .9, damping: .9 }), tiltY = new Spring({ value: 0, response: .9, damping: .9 });
  cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); tilt.set(((e.clientX - r.left) / r.width - .5) * 1.2); tiltY.set(((e.clientY - r.top) / r.height - .5) * .9); });
  cv.addEventListener('pointerleave', () => { tilt.set(0); tiltY.set(0); });
  const AX = { x: 0, y: 1, z: 2, w: 3 };
  return {
    still: 1.4,
    draw(t) {
      const { W, H, col } = st;
      ang.xw = t * .7; ang.yz = t * .18; ang.zw = t * .09;
      const P = V.map(p => {
        const q = p.slice();
        for (const pl in ang) { const a = ang[pl], i = AX[pl[0]], j = AX[pl[1]], ci = Math.cos(a), si = Math.sin(a); const u = q[i], v = q[j]; q[i] = u * ci - v * si; q[j] = u * si + v * ci; }
        const w = 1 / (2.6 - q[3]); let x = q[0] * w, y = q[1] * w, z = q[2] * w;
        const A = .5 + tilt.value, B = .35 + tiltY.value;
        const x2 = x * Math.cos(A) - z * Math.sin(A), z2 = x * Math.sin(A) + z * Math.cos(A);
        const y2 = y * Math.cos(B) - z2 * Math.sin(B), z3 = y * Math.sin(B) + z2 * Math.cos(B);
        const s = Math.min(W, H) * .56 / (2.4 - z3);   // крайня вершина ≤ 0,46 висоти від центру — влазить у екран
        return [W / 2 + x2 * s, H / 2 + 4 + y2 * s, z3, q[3]];
      });
      const es = E.map(([i, j, k]) => [(P[i][2] + P[j][2]) / 2, i, j, k]).sort((a, b) => a[0] - b[0]);
      c.lineCap = 'round';
      for (const [d, i, j, k] of es) {
        const ww = (P[i][3] + P[j][3]) / 2;
        c.globalAlpha = .25 + .55 * ((d + 1) / 2) * (.6 + .4 * (ww + 1) / 2);
        c.strokeStyle = k === 3 ? col.ph : col.gold; c.lineWidth = k === 3 ? 1.6 : 1.1;
        c.shadowColor = col.ph; c.shadowBlur = k === 3 && col.dark ? 6 : 0;
        c.beginPath(); c.moveTo(P[i][0], P[i][1]); c.lineTo(P[j][0], P[j][1]); c.stroke();
      }
      c.shadowBlur = 0;
      for (const p of P) { c.globalAlpha = .5 + .5 * (p[3] + 1) / 2; c.fillStyle = col.gold; c.beginPath(); c.arc(p[0], p[1], 1.6 + (p[3] + 1), 0, TAU); c.fill(); }
      c.globalAlpha = 1;
    },
  };
}

const KINDS = { ticker, field, fourier, spectrum, tape, array, chladni, liss, smith, tess, mobius, nnet, life, lorenz };
export function mountInstruments() {
  document.querySelectorAll('.inst[data-inst] canvas[data-draw]').forEach(cv => {
    const kind = KINDS[cv.closest('.inst').dataset.inst];
    try { if (kind) mount(cv, kind); } catch (e) { console.error(e); }
  });
}
