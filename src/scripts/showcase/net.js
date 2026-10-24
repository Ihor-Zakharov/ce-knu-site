// МЕРЕЖІ: схема в стилі режиму симуляції (Cisco Packet Tracer, Huawei eNSP), але з власними гравірованими позначками.
// ПК «REX-PC» (на моніторі — КІ-Рекс) надсилає ping на ce.knu.ua: конверт перескакує хоп за хопом найкоротшим маршрутом
// (дерево SPF — золотом), сервер відповідає; на 2,6 с лінк падає (✕, пунктир), по мережі йде LSA, R1 перераховує Дейкстру
// хвилею за відстанню, і наступний ping іде вже новим маршрутом. Далі лінк тихо піднімається — історія повторюється.
import { TAU, clamp, lerp, smooth, easeOut, mono, rr, glow, noGlow, rex } from './kit.js';

const PC = 0, SW = 1, R1 = 2, SRV = 7, N = 8;
// вузли в одиницях сітки: діагоналі рівно 45°, решта — 0° і 90°; координати x, y задає профіль розкладки (див. layout)
const NODES = [
  { k: 'pc', n: 'REX-PC' },
  { k: 'sw', n: 'KI-SW', lab: 's' },
  { k: 'r', n: 'KI-R1', lab: 'nw' },
  { k: 'r', n: 'KI-R2', lab: 'n' },
  { k: 'r', n: 'KI-R3', lab: 's' },
  { k: 'r', n: 'KI-R4', lab: 'n' },
  { k: 'r', n: 'KI-R5', lab: 's' },
  { k: 'srv', n: 'ce.knu.ua', lab: 'se' },
];
// просторий профіль (стіл) і щільний (телефон): a — ПК-комутатор, b — комутатор-R1, d — діагональ і піввисоти, R — «рейка»
const PROF = [{ a: 2, b: 1.7, d: 1.5, R: 3 }, { a: 1.8, b: 1.5, d: 1.1, R: 2.5 }];
const grid = ({ a, b, d, R }) => [[0, d], [a, d], [a + b, d], [a + b + d, 0], [a + b + d, 2 * d], [a + b + d + R, 0], [a + b + d + R, 2 * d], [a + b + 2 * d + R, d]];
// лінк: [від, до, вартість OSPF, зсув підпису вартості по x, по y]; вартості підібрано без нічиїх у Дейкстрі
const LINKS = [[0, 1, 1, 0, -1], [1, 2, 1, 0, -1], [2, 3, 2, -1, -1], [2, 4, 3, -1, 1], [3, 4, 2, 1, 0],
  [3, 5, 2, 0, -1], [4, 6, 3, 0, 1], [5, 6, 3, 1, 0], [5, 7, 1, 1, -1], [6, 7, 1, 1, 1]];
const LOOP = 9;
const CUES = [[.5, 'ping'], [2.5, 'fail'], [2.95, 'ping'], [5.9, 'heal'], [6.7, 'ping']];   // сценарій історії, с
const K = .075;                                                   // секунд хвилі SPF на одиницю вартості
const REF = 52;                                                   // «еталонний» піксель сітки: швидкість руху не залежить від розміру

/* Дейкстра від кореня по живих лінках: відстані, батьківський вузол і лінк */
function dijkstra(root, down) {
  const dist = Array(N).fill(Infinity), pn = Array(N).fill(-1), pl = Array(N).fill(-1), done = Array(N).fill(false);
  dist[root] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < N; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0) break;
    done[u] = true;
    LINKS.forEach(([a, b, w], li) => {
      if (down[li]) return;
      const v = a === u ? b : b === u ? a : -1;
      if (v < 0 || done[v] || dist[u] + w >= dist[v]) return;
      dist[v] = dist[u] + w; pn[v] = u; pl[v] = li;
    });
  }
  return { dist, pn, pl };
}
function chain(s, n) { const L = [], V = [n]; while (s.pn[n] >= 0) { L.push(s.pl[n]); n = s.pn[n]; V.push(n); } return { L, V }; }
/* маршрут ПК → сервер у дереві SPF: лінки, вузли, ланцюжок маршрутизаторів для HUD */
function route(s) {
  if (s.dist[SRV] === Infinity || s.dist[PC] === Infinity) return { ok: false, L: new Set(), V: new Set(), rs: [] };
  const a = chain(s, PC), b = chain(s, SRV), path = [...a.V, ...b.V.slice(0, -1).reverse()];
  return { ok: true, L: new Set([...a.L, ...b.L]), V: new Set(path), rs: path.filter(n => NODES[n].k === 'r').map(n => 'R' + (n - 1)) };
}
const GD = grid(PROF[0]);                                         // еталонна сітка — від неї залежить лише темп руху
const maxFin = d => Math.max(...d.filter(v => v < Infinity));
const seg = (px, py, ax, ay, bx, by) => {                         // відстань від точки до відрізка
  const dx = bx - ax, dy = by - ay, u = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - ax - u * dx, py - ay - u * dy);
};

export default function (env) {
  let G = null, gk = '', frozen = false;
  let T, cyc0, ci, down, xv, spf, rt, wave, pending, lsa, pk, last, sendAt, scriptLink, rings, badges, lost, hot, srvLed, nod;

  function reset() {
    T = 0; cyc0 = 0; ci = 0; down = Array(LINKS.length).fill(false); xv = Array(LINKS.length).fill(0);
    spf = dijkstra(R1, down); rt = route(spf); wave = pending = lsa = pk = null;
    last = { ttl: 64, ms: null, lost: false }; sendAt = Infinity; scriptLink = -1; rings = []; badges = []; lost = [];
    hot = Array.from({ length: N }, (_, i) => (rt.V.has(i) ? 1 : 0)); srvLed = 0; nod = -9;
  }
  reset();

  const ring = (n, c, k, dur) => rings.push({ n, c, k, dur, t0: T });
  const badge = (n, kind) => badges.push({ n, kind, t0: T });

  /* лінк падає або підіймається: ✕, кільця на кінцях, LSA біжить до R1, потім хвиля SPF */
  function setLink(l, up) {
    down[l] = !up;
    const [a, b] = LINKS[l], e = spf.dist[a] <= spf.dist[b] ? a : b;
    ring(a, up ? 'ok' : 'signal', 9, .6); ring(b, up ? 'ok' : 'signal', 9, .6);
    if (pending) return;
    const V = spf.dist[e] < Infinity ? chain(spf, e).V : [e];
    lsa = { V, t0: T, dur: clamp((V.length - 1) * .17, .22, .5), c: up ? 'ok' : 'signal' };
    pending = { at: T + lsa.dur };
  }
  function startWave() {
    const A = spf, B = dijkstra(R1, down), mx = maxFin(B.dist);
    wave = { t0: T, A, rtA: rt, ringed: Array(N).fill(0), ready: (B.dist[SRV] < Infinity ? B.dist[SRV] : mx) * K, span: mx * K + .7 };
    spf = B; rt = route(B); pending = lsa = null;
  }
  const converging = () => !!pending || (wave && T - wave.t0 < wave.ready);

  /* лінк маршруту, що падає: найближчий до сервера між маршрутизаторами, якщо є обхід */
  function pickFail() {
    const a = chain(spf, SRV).L;
    for (const l of a) {
      const [x, y] = LINKS[l];
      if (NODES[x].k !== 'r' || NODES[y].k !== 'r') continue;
      const d = down.slice(); d[l] = true;
      if (dijkstra(R1, d).dist[SRV] < Infinity) return l;
    }
    return -1;
  }
  function cue(w) {
    if (w === 'ping') sendAt = Math.min(sendAt, T);
    else if (w === 'fail') { const l = pickFail(); if (l >= 0 && !down[l]) { scriptLink = l; setLink(l, false); } }
    else if (w === 'heal' && scriptLink >= 0) { if (down[scriptLink]) setLink(scriptLink, true); scriptLink = -1; }
  }

  /* ping: один конверт за раз; на кожному вузлі наступний хоп обирається за живим графом */
  function sendPing() { pk = { node: PC, next: -1, link: -1, u: 0, dur: 1, dwell: .05, ttl: 64, cost: 0, back: false }; ring(PC, 'gold', 7, .4); }
  const hopDur = (a, b, back) => {
    const A = GD[a], B = GD[b], len = Math.hypot(A[0] - B[0] - (a === PC || b === PC ? .5 * (a === PC ? -1 : 1) : 0), A[1] - B[1]) * REF;
    return back ? .035 + len / 2300 : .06 + len / 1300;
  };
  function lose(p) { lost.push({ n: p.node, nx: p.next, u: p.u, t0: T }); pk = null; last.lost = true; sendAt = T + 1.1; }
  function arrive(p) {
    p.node = p.next; p.next = -1; p.u = 0; p.dwell = .015;
    if (!p.back) p.cost += LINKS[p.link][2];
    if (NODES[p.node].k === 'r') { p.ttl--; ring(p.node, 'gold', 7, .42); }
    if (p.node === SRV && !p.back) { p.back = true; p.ttl = 64; p.dwell = .12; srvLed = 1; badge(SRV, 'ok'); }
    else if (p.node === PC && p.back) { last = { ttl: p.ttl, ms: Math.round(p.cost * 1.75), lost: false }; badge(PC, 'ok'); nod = T; pk = null; }
  }
  function pktStep(dt) {
    const p = pk;
    if (!p) return;
    if (p.next < 0) {
      if (p.dwell > 0) { p.dwell -= dt; return; }
      if (NODES[p.node].k === 'r' && converging()) return;      // маршрутизатор ще перераховує — пакет чекає
      const d = dijkstra(p.back ? PC : SRV, down), nx = d.pn[p.node];
      if (nx < 0) { lose(p); return; }
      p.next = nx; p.link = d.pl[p.node]; p.u = 0; p.dur = hopDur(p.node, nx, p.back);
    }
    if (down[p.link]) { lose(p); return; }
    p.u += dt / p.dur;
    if (p.u >= 1) arrive(p);
  }

  function step(dt) {
    T += dt;
    if (T - cyc0 >= LOOP) { cyc0 += LOOP; ci = 0; }
    while (ci < CUES.length && T - cyc0 >= CUES[ci][0]) cue(CUES[ci++][1]);
    if (pending && T >= pending.at) startWave();
    if (wave) {
      const tau = T - wave.t0;
      for (let v = 0; v < N; v++) if (!wave.ringed[v] && spf.dist[v] < Infinity && spf.dist[v] * K <= tau) { wave.ringed[v] = 1; if (v !== PC && v !== SW) ring(v, 'ph', v === R1 ? -1 : 6, v === R1 ? .75 : .5); }
      if (tau > wave.span) wave = null;
    }
    for (let i = 0; i < N; i++) { const g = rt.V.has(i) && !converging() ? 1 : 0; hot[i] += clamp(g - hot[i], -5 * dt, 5 * dt); }
    for (let i = 0; i < LINKS.length; i++) xv[i] += clamp((down[i] ? 1 : 0) - xv[i], -dt / .25, dt / .25);
    srvLed = Math.max(0, srvLed - dt / .9);
    if (!pk && T >= sendAt) { sendPing(); sendAt = Infinity; }
    pktStep(dt);
    rings = rings.filter(r => T - r.t0 < r.dur); badges = badges.filter(b => T - b.t0 < 1.1); lost = lost.filter(l => T - l.t0 < .9);
  }

  /* показовий кадр для prefers-reduced-motion: лінк обірвано, новий маршрут підсвічено, конверт на півдорозі */
  function pose() {
    reset();
    for (let g = 0; g < 1500 && !(pk && !pk.back && pk.node === 4 && pk.next === 6 && pk.u > .5); g++) step(1 / 60);
  }

  /* ───── розкладка: масштаб від W і H, діагоналі рівно 45°; на вузьких екранах — щільний профіль ───── */
  function fit(c, W, H, p) {
    const T0 = H < 260 ? 36 : 42, B0 = H - (H < 260 ? 32 : 38), wu = p.a + p.b + 2 * p.d + p.R;
    let u = 30, r, fs, pxr, mw, mh, rp;
    const dims = () => {
      r = clamp(u * .27, 6.5, 12.5); fs = clamp(r * .9, 8.5, 10); pxr = r >= 10 ? 2 : 1; mw = 22 * pxr + 14; mh = 18 * pxr + 12;
      mono(c, fs); rp = Math.max(r * .95 + 3, c.measureText('ce.knu.ua').width - r * .55 + 3);
    };
    for (let i = 0; i < 4; i++) { dims(); u = Math.min((W - 28 - mw / 2 - rp) / wu, (B0 - T0 - 2 * (r + 5 + fs)) / (2 * p.d), 68); }
    dims();
    return { p, u, r, fs, pxr, mw, mh, rp, T0, B0, wu };
  }
  function layout(c, W, H) {
    let f = fit(c, W, H, PROF[0]);
    if (f.u < 40) { const g = fit(c, W, H, PROF[1]); if (g.u > f.u) f = g; }
    const { p, u, r, fs, pxr, mw, mh, rp, T0, B0, wu } = f;
    const ox = (W - (mw / 2 + wu * u + rp)) / 2 + mw / 2, oy = T0 + (B0 - T0 - 2 * p.d * u - 2 * (r + 5 + fs)) / 2 + r + 5 + fs;
    const P = grid(p).map(([x, y]) => ({ x: ox + x * u, y: oy + y * u }));
    const A = P.map((q, i) => (i === PC ? { x: q.x + mw / 2 + 5, y: q.y } : q));
    return { u, r, fs, pxr, mw, mh, P, A, sw: { w: r * 2.8, h: r * 1.5 }, sv: { w: r * 2.1, h: r * 3 }, ew: r * 1.15 + 3, costs: u >= 34 };
  }

  /* ───── малювання ───── */
  const pos = p => {
    const a = G.A[p.node];
    if (p.next < 0) return { x: a.x, y: a.y, d: 0 };
    const b = G.A[p.next], e = p.u * p.u * (3 - 2 * p.u), x = lerp(a.x, b.x, e), y = lerp(a.y, b.y, e);
    return { x, y, d: Math.min(Math.hypot(x - a.x, y - a.y), Math.hypot(x - b.x, y - b.y)) };
  };
  const rgba = (a, o) => `rgba(${a[0]},${a[1]},${a[2]},${o})`;

  function envelope(c, col, x, y, s, color, a) {
    const w = G.ew * s, h = w * .68;
    c.globalAlpha = a; c.fillStyle = color;
    glow(c, col, color, 7); rr(c, x - w / 2, y - h / 2, w, h, 1.4); c.fill(); noGlow(c);
    c.globalCompositeOperation = 'destination-out'; c.lineWidth = Math.max(1, w * .1); c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - w / 2 + 1.3, y - h / 2 + 1.3); c.lineTo(x, y + h * .06); c.lineTo(x + w / 2 - 1.3, y - h / 2 + 1.3); c.stroke();
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  }
  const hole = (c, fn) => { c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.beginPath(); fn(); c.fill(); c.globalCompositeOperation = 'source-over'; };

  function shape(c, i, g = 0) {                                     // контур позначки вузла (для вирізу і обводки)
    const { x, y } = G.P[i], k = NODES[i].k, r = G.r;
    if (k === 'r') c.arc(x, y, r + g, 0, TAU);
    else if (k === 'sw') c.roundRect(x - G.sw.w / 2 - g, y - G.sw.h / 2 - g, G.sw.w + 2 * g, G.sw.h + 2 * g, 3 + g);
    else if (k === 'srv') c.roundRect(x - G.sv.w / 2 - g, y - G.sv.h / 2 - g, G.sv.w + 2 * g, G.sv.h + 2 * g, 2.5 + g);
    else c.roundRect(x - G.mw / 2 - g, y - G.mh / 2 - g, G.mw + 2 * g, G.mh + 2 * g, 4 + g);
  }
  const arrow = (c, x, y, dx, dy, h) => {                           // стрілка з вістрям у (x, y), напрям (dx, dy)
    c.moveTo(x - dx * h * 1.4 - dy * h, y - dy * h * 1.4 + dx * h); c.lineTo(x, y); c.lineTo(x - dx * h * 1.4 + dy * h, y - dy * h * 1.4 - dx * h);
  };

  function drawLinks(c, col) {
    const tau = wave ? T - wave.t0 : 99, P = G.P;
    c.lineCap = 'round'; c.lineJoin = 'round';
    LINKS.forEach(([a, b], i) => {                                  // основа: сіра волосяна лінія, обірвана — пунктир
      const dn = xv[i];
      c.strokeStyle = col.lineStrong; c.globalAlpha = lerp(.8, .5, dn); c.lineWidth = 1.2;
      c.setLineDash(dn > .02 ? [3.5, 4.5] : []);
      c.beginPath(); c.moveTo(P[a].x, P[a].y); c.lineTo(P[b].x, P[b].y); c.stroke();
    });
    c.setLineDash([]); c.globalAlpha = 1;
    // дерево SPF: золото ростe від батька до дитини за відстанню; старе дерево на початку хвилі згасає
    const thin = (s, k, p, a) => {
      c.beginPath();
      for (let v = 0; v < N; v++) {
        const par = s.pn[v];
        if (par < 0 || down[s.pl[v]]) continue;
        const tp = s.dist[par] * K, tv = s.dist[v] * K, q = p === null ? 1 : clamp((tau - tp) / (tv - tp));
        if (q <= 0) continue;
        c.moveTo(P[par].x, P[par].y); c.lineTo(lerp(P[par].x, P[v].x, q), lerp(P[par].y, P[v].y, q));
      }
      c.strokeStyle = col.gold; c.globalAlpha = a; c.lineWidth = 1.5; c.stroke(); c.globalAlpha = 1;
    };
    const boldPath = r => { c.beginPath(); for (const l of r.L) { if (down[l]) continue; const [a, b] = LINKS[l]; c.moveTo(P[a].x, P[a].y); c.lineTo(P[b].x, P[b].y); } };
    const bold = (r, a) => {
      if (a < .02 || !r.L.size) return;
      boldPath(r); c.strokeStyle = col.gold; c.lineWidth = 2.5; c.globalAlpha = a * .9; glow(c, col, col.gold, 3.5); c.stroke(); noGlow(c); c.globalAlpha = 1;
    };
    if (wave && tau < .3) { const g = 1 - smooth(0, .22, tau); thin(wave.A, 0, null, g * .85); bold(wave.rtA, g); }
    thin(spf, 0, wave ? tau : null, .85);
    bold(rt, wave ? smooth(wave.ready, wave.ready + .3, tau) : 1);
    if (wave) {                                                     // «головка» хвилі на кінцях галузей, що ростуть
      for (let v = 0; v < N; v++) {
        const par = spf.pn[v];
        if (par < 0) continue;
        const tp = spf.dist[par] * K, tv = spf.dist[v] * K, q = (tau - tp) / (tv - tp);
        if (q <= 0 || q >= 1) continue;
        glow(c, col, col.ph, 6); c.fillStyle = col.ph; c.beginPath(); c.arc(lerp(P[par].x, P[v].x, q), lerp(P[par].y, P[v].y, q), 2.2, 0, TAU); c.fill(); noGlow(c);
      }
    }
    if (lsa) {                                                      // LSA: крапка біжить від кінця обірваного лінка до R1
      const u = clamp((T - lsa.t0) / lsa.dur), f = u * (lsa.V.length - 1), i = Math.min(lsa.V.length - 2, Math.floor(f));
      if (lsa.V.length > 1) {
        const a = P[lsa.V[i]], b = P[lsa.V[i + 1]], e = smooth(0, 1, f - i), colr = col[lsa.c];
        glow(c, col, colr, 6); c.fillStyle = colr; c.beginPath(); c.arc(lerp(a.x, b.x, e), lerp(a.y, b.y, e), 2.6, 0, TAU); c.fill(); noGlow(c);
      }
    }
  }

  function drawNodes(c, col) {
    const { r, P } = G;
    for (let i = 0; i < N; i++) {                                   // виріз під позначкою, щоб лінії не просвічували
      hole(c, () => shape(c, i, 3.5));
    }
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 0; i < N; i++) {
      const { x, y } = P[i], k = NODES[i].k, h = hot[i];
      c.lineWidth = 1.3; c.strokeStyle = col.ink2;
      if (k === 'pc') drawPC(c, col);
      c.beginPath(); shape(c, i); c.stroke();
      if (h > .02) { c.globalAlpha = h; c.strokeStyle = col.gold; c.lineWidth = 2; c.beginPath(); shape(c, i); c.stroke(); c.globalAlpha = 1; }
      c.strokeStyle = col.ink2; c.lineWidth = 1.2; c.beginPath();
      if (k === 'r') {                                              // маршрутизатор: коло, горизонтальні стрілки назовні, вертикальні досередини
        const a = r * .26, b = r * .7, hd = r * .2;
        for (const s of [-1, 1]) {
          c.moveTo(x + s * a, y); c.lineTo(x + s * b, y); arrow(c, x + s * b, y, s, 0, hd);
          c.moveTo(x, y + s * b); c.lineTo(x, y + s * a); arrow(c, x, y + s * a, 0, -s, hd);
        }
      } else if (k === 'sw') {                                      // комутатор: дві протилежні стрілки
        const w = G.sw.w * .3, hd = r * .2, o = G.sw.h * .2;
        c.moveTo(x - w, y - o); c.lineTo(x + w, y - o); arrow(c, x + w, y - o, 1, 0, hd);
        c.moveTo(x + w, y + o); c.lineTo(x - w, y + o); arrow(c, x - w, y + o, -1, 0, hd);
      } else if (k === 'srv') {                                     // сервер: три блоки зі щілиною і світлодіодом
        const { w, h: hh } = G.sv;
        for (let j = 1; j < 3; j++) { c.moveTo(x - w / 2, y - hh / 2 + hh * j / 3); c.lineTo(x + w / 2, y - hh / 2 + hh * j / 3); }
        for (let j = 0; j < 3; j++) { const yy = y - hh / 2 + hh * (j + .5) / 3; c.moveTo(x - w * .32, yy); c.lineTo(x + w * .02, yy); }
      }
      c.stroke();
      if (k === 'srv') {
        const { w, h: hh } = G.sv, yy = y - hh / 2 + hh / 6, lx = x + w * .28;
        c.fillStyle = col.ink3; c.beginPath(); for (let j = 1; j < 3; j++) { const y2 = y - hh / 2 + hh * (j + .5) / 3; c.moveTo(lx + 1.2, y2); c.arc(lx, y2, 1.2, 0, TAU); } c.fill();
        c.fillStyle = srvLed > .02 ? col.ok : col.ink3; c.globalAlpha = srvLed > .02 ? .45 + .55 * srvLed : 1;
        if (srvLed > .02) glow(c, col, col.ok, 6);
        c.beginPath(); c.arc(lx, yy, 1.5, 0, TAU); c.fill(); noGlow(c); c.globalAlpha = 1;
      }
    }
  }

  function drawPC(c, col) {
    const { x, y } = G.P[PC], { mw, mh, pxr } = G, ix = x - mw / 2 + 3, iy = y - mh / 2 + 3, iw = mw - 6, ih = mh - 6;
    c.fillStyle = col.dark ? '#090706' : col.ink; c.beginPath(); c.roundRect(ix, iy, iw, ih, 1.5); c.fill();
    const blink = (T + .8) % 3.6 < .14 || T - nod < .22, bob = T - nod < .2 && T - nod >= 0 ? -pxr : 0;
    rex(c, ix + (iw - 22 * pxr) / 2 - 3 * pxr, iy + (ih - 18 * pxr) / 2 - 5 * pxr + bob, pxr, null, { blink });
    c.strokeStyle = col.ink2; c.lineWidth = 1.3; c.beginPath();    // підставка
    c.moveTo(x, y + mh / 2); c.lineTo(x, y + mh / 2 + 4); c.moveTo(x - mw * .2, y + mh / 2 + 4.5); c.lineTo(x + mw * .2, y + mh / 2 + 4.5); c.stroke();
  }

  function drawLabels(c, col) {
    const { P, r, fs } = G, g = r + 5;
    mono(c, fs, 500); c.lineJoin = 'round';
    const text = (str, x, y) => {                                   // підпис з вирізом-ореолом, щоб лінії й кільця не різали літери
      c.globalCompositeOperation = 'destination-out'; c.lineWidth = 3.5; c.strokeStyle = '#000'; c.strokeText(str, x, y);
      c.globalCompositeOperation = 'source-over'; c.fillText(str, x, y);
    };
    NODES.forEach((n, i) => {
      const { x, y } = P[i], on = hot[i] > .5;
      c.fillStyle = i === SRV ? col.goldInk : on ? col.ink2 : col.ink3;
      if (n.lab === 'n') { c.textAlign = 'center'; text(n.n, x, y - g); }
      else if (n.lab === 'nw') { c.textAlign = 'right'; text(n.n, x - 1, y - g); }
      else if (n.lab === 's') { c.textAlign = 'center'; text(n.n, x, y + g + fs * .8); }
      else if (n.lab === 'se') { c.textAlign = 'left'; text(n.n, x - r * .55, y + G.sv.h / 2 + 5 + fs * .8); }
      else { c.textAlign = 'center'; text(n.n, x, y + G.mh / 2 + 12 + fs * .8); }
    });
    if (G.costs) {                                                  // вартості OSPF — дрібно біля лінків
      mono(c, fs - 1.5, 500); c.textAlign = 'center'; c.textBaseline = 'middle';
      LINKS.forEach(([a, b, w, ox, oy], i) => {
        const al = (1 - xv[i]) * .85;
        if (al < .03) return;
        const k = ox && oy ? 6.5 : 8;
        c.fillStyle = col.ink3; c.globalAlpha = al;
        c.fillText(String(w), (P[a].x + P[b].x) / 2 + ox * k, (P[a].y + P[b].y) / 2 + oy * k);
      });
      c.globalAlpha = 1; c.textBaseline = 'alphabetic';
    }
  }

  function drawBase(c, col) {
    const { P } = G;
    LINKS.forEach(([a, b], i) => {                                  // ✕ на обірваному лінку
      const v = xv[i];
      if (v < .02) return;
      const x = (P[a].x + P[b].x) / 2, y = (P[a].y + P[b].y) / 2, s = easeOut(v) * (1 + .25 * Math.sin(Math.PI * clamp(v * 1.2))), k = 3.4 * s;
      hole(c, () => c.arc(x, y, 7.5 * s, 0, TAU));
      c.strokeStyle = col.signal; c.lineWidth = 1.8; c.lineCap = 'round'; c.globalAlpha = Math.min(1, v * 1.4);
      c.beginPath(); c.moveTo(x - k, y - k); c.lineTo(x + k, y + k); c.moveTo(x + k, y - k); c.lineTo(x - k, y + k); c.stroke(); c.globalAlpha = 1;
    });
    for (const g of rings) {                                        // кільця: SPF, пакет у вузлі, обрив лінка
      const u = (T - g.t0) / g.dur, e = easeOut(u), colr = col[g.c], n = G.P[g.n];
      c.strokeStyle = colr; c.globalAlpha = Math.pow(1 - u, 1.5) * (g.k < 0 ? .4 : g.c === 'gold' ? .75 : .85); c.lineWidth = g.k < 0 ? 1 : 1.3;
      if (g.c === 'ph') glow(c, col, colr, 6);
      c.beginPath();
      if (g.k < 0) c.arc(n.x, n.y, lerp(G.r + 3, G.u * 1.3, e), 0, TAU);   // початок хвилі: коло від R1 на всю схему
      else shape(c, g.n, 2.5 + g.k * e);
      c.stroke(); noGlow(c);
      if (g.c === 'ph' && g.k >= 0) { c.fillStyle = colr; c.globalAlpha = Math.pow(1 - u, 1.6) * .2; c.beginPath(); shape(c, g.n, 0); c.fill(); }   // вузол «спалахує» всередині
      c.globalAlpha = 1;
    }
  }
  function drawTop(c, col) {
    for (const b of badges) {                                       // зелена галочка при відповіді
      const age = T - b.t0, s = age < .26 ? easeOut(age / .26) * (1 + .2 * Math.sin(Math.PI * age / .26)) : 1, a = age > .75 ? 1 - (age - .75) / .35 : 1;
      const n = b.n, base = G.P[n], bx = base.x + (n === PC ? G.mw / 2 : G.sv.w / 2) + 1, by = base.y - (n === PC ? G.mh / 2 : G.sv.h / 2) - 2, br = Math.max(5.2, G.r * .6) * s;
      c.globalAlpha = a; c.fillStyle = col.ok; glow(c, col, col.ok, 6); c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill(); noGlow(c);
      c.globalCompositeOperation = 'destination-out'; c.lineWidth = Math.max(1.3, br * .26); c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(bx - br * .42, by + br * .02); c.lineTo(bx - br * .1, by + br * .36); c.lineTo(bx + br * .46, by - br * .3); c.stroke();
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }
    for (const l of lost) {                                         // втрачений пакет
      const a = G.A[l.n], b = l.nx >= 0 ? G.A[l.nx] : a, e = l.u * l.u * (3 - 2 * l.u), x = lerp(a.x, b.x, e), y = lerp(a.y, b.y, e), u = (T - l.t0) / .9;
      c.strokeStyle = col.signal; c.globalAlpha = 1 - u; c.lineWidth = 1.8; c.lineCap = 'round'; const k = 3 + 3 * easeOut(u);
      c.beginPath(); c.moveTo(x - k, y - k); c.lineTo(x + k, y + k); c.moveTo(x + k, y - k); c.lineTo(x - k, y + k); c.stroke(); c.globalAlpha = 1;
    }
    if (pk) {                                                       // конверт: золотий — запит, зелений — відповідь
      const p = pos(pk), f = smooth(0, G.r * 1.6, p.d), lift = pk.next >= 0 ? Math.sin(Math.PI * clamp(pk.u)) : 0, sc = lerp(.8, 1, f) * (1 + .2 * lift);
      const w = G.ew * sc + 5, h = w * .68 + 1;
      hole(c, () => c.roundRect(p.x - w / 2, p.y - h / 2, w, h, 3));
      envelope(c, col, p.x, p.y, sc, pk.back ? col.ok : col.gold, 1);
    }
  }

  return {
    enter() { frozen ? pose() : reset(); },
    still() { frozen = true; pose(); },
    draw(c, W, H, t, dt) {
      const col = env.col, key = `${W}x${H}:${env.gen}`;
      if (key !== gk) { G = layout(c, W, H); gk = key; }
      if (!frozen) { let rest = Math.min(dt, .1); while (rest > 1e-6) { const s = Math.min(rest, 1 / 60); step(s); rest -= s; } }
      drawLinks(c, col); drawNodes(c, col); drawBase(c, col); drawLabels(c, col); drawTop(c, col);
      const live = pk ? pk.ttl : last.ttl;
      const bl = converging() ? (pending ? 'OSPF · LSA' : 'OSPF · SPF') : rt.ok ? 'OSPF · ' + rt.rs.join(' → ') : 'OSPF · NO ROUTE';
      return { tl: W < 300 ? 'ce.knu.ua' : 'PING ce.knu.ua', tr: `TTL ${live} · ${last.lost ? 'TIMEOUT' : (last.ms ?? '--') + ' ms'}`, bl, br: 'ICMP' };
    },
    poke(x, y) {
      if (!G || frozen) return;
      const P = G.P[PC];
      if (Math.abs(x - P.x) < G.mw / 2 + 4 && Math.abs(y - P.y) < G.mh / 2 + 4) { if (!pk) sendAt = T; return; }
      let best = -1, bd = 15;
      LINKS.forEach(([a, b], i) => { const d = seg(x, y, G.P[a].x, G.P[a].y, G.P[b].x, G.P[b].y); if (d < bd) { bd = d; best = i; } });
      if (best < 0) return;
      setLink(best, down[best]);
      if (scriptLink === best) scriptLink = -1;
      if (!pk) sendAt = Math.min(sendAt, T + .9);
    },
  };
}
