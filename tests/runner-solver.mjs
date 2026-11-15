// Розв'язувач карти гри з КІ-Рексом: перевіряє на справжньому world.js усі правила, за якими складено карту.
// Запуск: node tests/runner-solver.mjs  — друкує таблицю «відрізок → швидкість, перешкоди, найменше вікно» для обох режимів
// і проходить обидві карти ботом від старту до фінішу (кілька хвилин). Тест tests/runner.spec.ts бере звідси швидку частину.
// Правила (код виходу 1, якщо хоч одне порушено):
//   • вікна (скільки часу гравець має на дію) міряємо на найбільшій швидкості відрізка; що далі рік, то швидший біг
//     і коротше дозволене вікно. З клавіатури на стрибок — щонайменше 150 / 135 / 120 / 105 мс (1–4-й рік),
//     на «пригнутися» — 200 / 180 / 160 / 140 мс; у грі дотиком на стрибок — 160 / 150 / 135 / 120 мс;
//   • швидкість: за крок фізики КІ-Рекс зсувається значно менше за найвужчу зону перешкоди (нічого не «проскакує»),
//     пружина, біт і навісна спрацьовують і на найбільшій швидкості; у грі дотиком на найвужчому екрані
//     видно щонайменше 1,2 с траси попереду;
//   • жуки: шаблон розв'язується із зоною жука, збільшеною на 2 U з кожного боку; до сусідніх перешкод — не менш як довжина стрибка;
//     двох жуків поспіль не буває; на першому відрізку їх немає; у грі дотиком — лише низькі;
//   • пружини: перед кожною 5 порожніх клітинок, перша пружина карти стоїть сама; якщо після неї нічого не натискати,
//     КІ-Рекс приземляється щонайменше за 10 U від найближчої перешкоди; сама пружина не вбиває за жодного моменту стрибка;
//   • КІ-Рекс ніколи не піднімається вище TOP, навіть якщо тиснути «стрибок» щокроку;
//   • карта стала: дві побудови однакові, перезапуск із контрольної точки щоразу дає ті самі перешкоди;
//   • бот із переглядом уперед проходить усі 20 відрізків в обох режимах із будь-якої стартової пори року.
import { fileURLToPath } from 'node:url';
import * as W from '../src/scripts/runner/world.js';
const { createWorld, step, place, segment, startSpeed, score, CELL, JUMP_L, JUMP_H, TOP, BUG, STAND, DUCK, SEGMENTS, PER_YEAR, EV } = W;
const DT = 1 / 120, X0 = 160, MS = 1000 / 120;
// найменші дозволені вікна, мс, для кожного з чотирьох років карти (J — стрибок, D — пригнутися)
export const NEED = {
  keys: { J: [150, 135, 120, 105], D: [200, 180, 160, 140] },
  touch: { J: [160, 150, 135, 120], D: [0, 0, 0, 0] },
};
export const BUG_MARGIN = 2, PAD_CLEAR = 10;
// видимість: найвужче поле в U (MIN_W у view.js), де на ньому стоїть КІ-Рекс (лівий край його зони) і скільки секунд траси має бути видно
export const VIEW = { min: 96, rexX: 12, see: 1.2 };
const YEARS = SEGMENTS / PER_YEAR;
const CAP = 36;
export const NAMES = ['winter', 'spring', 'sakura', 'summer', 'autumn'];
// «номер відрізка» (дробовий), на якому швидкість дорівнює v: швидкість росте як speed0 · grow^n
const speedN = (v, touch) => Math.log(v / startSpeed(0, touch)) / Math.log(startSpeed(1, touch) / startSpeed(0, touch));
let problems = [];
const fail = msg => { problems.push(msg); };

/* ── бот із переглядом уперед: клонує світ і шукає «нічого / стрибок / вниз» на кожні 4 кроки так, щоб вижити ── */
const TICK = 4;
export function clone(w) {
  return { ...w, pl: { ...w.pl }, obs: w.obs.map(o => ({ ...o })), pool: [], marks: w.marks.map(m => ({ ...m })), queue: w.queue.slice() };
}
const keyOf = w => { const p = w.pl; let u = ''; for (const o of w.obs) if (o.kind === 'orb' || o.kind === 'pad') u += o.used ? 1 : 0; return `${Math.round(p.h * 4)}|${Math.round(p.vy * 20)}|${+p.ground}${+p.lock}|${Math.ceil(p.buffer * 60)}|${Math.ceil(p.coyote * 60)}|${u}`; };
function plan(w0, { ahead = 200, budget = 30000 } = {}) {
  const horizon = Math.ceil(ahead / (Math.max(40, w0.speed) * DT * TICK)), order = w0.touch ? 'NJ' : 'NJD';
  const dead = new Set(), path = []; let best = [], nodes = 0;
  function dfs(w, d) {
    if (d > best.length) best = path.slice();
    if (d === horizon) return true;
    const k = d + '|' + keyOf(w);
    if (dead.has(k) || nodes++ > budget) return false;
    for (const a of order) {
      const c = clone(w), inp = { press: a === 'J', hold: false, down: a === 'D' };
      let ok = true;
      for (let i = 0; i < TICK && ok; i++) { step(c, inp, DT); ok = !c.dead; }
      if (!ok) continue;
      path.push(a);
      if (dfs(c, d + 1)) return true;
      path.pop();
    }
    dead.add(k);
    return false;
  }
  return dfs(w0, 0) ? path.slice() : best;
}
/* проходить карту від старту: повертає світ наприкінці (w.won — дійшов до фінішу), найвищу точку й час */
export function playthrough(start, touch, maxSeconds = 600) {
  const w = createWorld(start, { touch }), inp = { press: false, hold: false, down: false };
  let sub = 0, down = false, next = null, apex = 0, n = 0;
  for (; n < 120 * maxSeconds && !w.dead && !w.won; n++) {
    inp.hold = false; inp.press = false;
    if (next !== null) { if (next === 'J') inp.press = inp.hold = true; inp.down = next === 'D'; down = inp.down; next = null; }   // дія діє з наступного кроку, як і в грі
    else inp.down = down;
    if (sub === 0) { const c = clone(w); step(c, { ...inp }, DT); if (!c.dead) { const a = plan(c)[0] || 'N'; next = a; if (a !== 'D' && down) { down = false; } } }
    sub = (sub + 1) % TICK;
    step(w, inp, DT); apex = Math.max(apex, w.pl.h);
  }
  return { w, apex, seconds: n / 120 };
}

/* a world that holds one pattern at a pinned speed */
function fixed(rows, s, v, touch, margin = true) {
  const w = createWorld(s, { touch });
  w.obs.length = 0; w.queue = []; w.nextX = 1e12; w.marks[0].n = speedN(v, touch); w.marks[0].end = 1e15;
  place(w, rows, X0, s);
  if (margin) for (const o of w.obs) if (o.kind === 'bug') { o.x -= BUG_MARGIN; o.w += 2 * BUG_MARGIN; o.y -= BUG_MARGIN; o.h += 2 * BUG_MARGIN; }
  return w;
}
/* One action sequence (decisions every TICK steps) that survives when executed 0..S steps late.
   acts — allowed actions; maxActs — at most this many actions (a press, or one unbroken duck); inDuck — a duck is already going on */
function robust(w0, horizon, acts, S, maxActs = 99, inDuck = false, TICK = 2) {   // тут TICK — свій, дрібніший: 2 кроки
  const dead = new Set(), path = []; let nodes = 0;
  const actAt = i => (i < 0 ? 'N' : path[Math.floor(i / TICK)]);
  function dfs(ws, d, used, prev) {
    if (d >= horizon) return true;
    const k = d + '#' + used + prev + '#' + ws.map(keyOf).join('#');
    if (dead.has(k) || nodes++ > 120000) return false;
    for (const a of acts) {
      const u = used + (a === 'J' || (a === 'D' && prev !== 'D') ? 1 : 0);
      if (u > maxActs) continue;
      path.push(a);
      const cs = ws.map(clone); let ok = true;
      for (let s = 0; s <= S && ok; s++) for (let j = 0; j < TICK && ok; j++) {
        const i = d * TICK + j - s, act = actAt(i);
        step(cs[s], { press: act === 'J' && i >= 0 && i % TICK === 0, hold: false, down: act === 'D' || (i < 0 && inDuck) }, DT);
        ok = !cs[s].dead;
      }
      if (ok && dfs(cs, d + 1, u, a)) return true;
      path.pop();
    }
    dead.add(k); return false;
  }
  const ws = []; for (let s = 0; s <= S; s++) ws.push(clone(w0));
  return dfs(ws, 0, 0, inDuck ? 'D' : 'N') ? { path: path.slice(), TICK } : null;
}
/* the actions of a path: [{ type: 'J' | 'D', d: tick it starts at, n: ticks it lasts }] */
const actions = path => { const out = []; path.forEach((a, d) => { if (a === 'J') out.push({ type: 'J', d, n: 1 }); else if (a === 'D') { const l = out[out.length - 1]; if (l && l.type === 'D' && l.d + l.n === d) l.n++; else out.push({ type: 'D', d, n: 1 }); } }); return out; };
const cache = new Map();
export { analyse };
const SLACK = 4;                                       // what follows an action must itself be doable with at least SLACK steps (33 ms) of slack
/* Timing windows of a pattern at speed v.
   First a comfortable solution with the fewest actions is found (jump presses, ducks). Then, action by action: every moment at which
   the action can be made so that the rest is still passable with the remaining actions (they may shift) — the window is the longest
   unbroken stretch of such moments around the solution. The action is fixed in the middle of its window, then the next one is measured. */
function analyse(rows, s, v, touch) {
  const key = rows.join('/') + '|' + v.toFixed(2) + '|' + touch;
  if (cache.has(key)) return cache.get(key);
  const w0 = fixed(rows, s, v, touch), steps = Math.ceil((X0 + rows[0].length * CELL + 64) / (v * DT)), TICK = 2;   // рішення — кожні 2 кроки
  const acts = !touch && /[vM]/.test(rows.join('')) ? 'NJD' : 'NJ', H = t => Math.ceil((steps - t) / TICK);
  const ev = [], out = { ok: true, J: [], D: [], apex: 0, pads: [] };
  const advance = (w, a, b, extra) => {                // play steps [a, b) with the fixed events (plus an extra input); null if Rex dies
    const inp = { press: false, hold: false, down: false };
    for (let i = a; i < b; i++) {
      inp.press = false; inp.down = false;
      for (const e of ev) { if (e.type === 'J' ? e.t === i : e.t0 <= i && i <= e.t1) { if (e.type === 'J') inp.press = true; else inp.down = true; } }
      if (extra) extra(i, inp);
      step(w, inp, DT);
      if (w.dead) return null;
    }
    return w;
  };
  const solve = (w, t, max, inDuck) => { for (const S of [12, 8, 4, 0]) { const r = robust(w, H(t), acts, S, max, inDuck); if (r) return { ...r, S }; } return null; };
  const first = solve(clone(w0), 0, 99, false);
  if (!first) { out.ok = false; cache.set(key, out); return out; }
  const total = actions(first.path).length;
  let from = 0, base = clone(w0), sol = first;
  for (let k = 0; k < total; k++) {
    const act = actions(sol.path)[0], left = total - 1 - k;
    if (!act) break;
    const type = act.type, tNom = from + act.d * TICK + Math.floor(sol.S / 2), a0 = Math.max(from, tNom - 76), b0 = tNom + 52;
    const after = t => advance(clone(base), from, t + (type === 'J' ? 1 : 4), (i, inp) => { if (type === 'J') { if (i === t) inp.press = true; } else if (i >= t) inp.down = true; });
    const works = t => { if (t < from) return false; const w = after(t); return !!w && !!robust(w, H(t), acts, SLACK, left, type === 'D'); };
    let best = null, cur = null;
    for (let t = a0; t <= b0; t += 4) { if (works(t)) { if (!cur) cur = { a: t, b: t }; else cur.b = t; if (!best || cur.b - cur.a > best.b - best.a || (cur.a <= tNom && tNom <= cur.b && cur.b - cur.a >= best.b - best.a)) best = cur; } else cur = null; }
    if (!best) { out.ok = false; break; }
    best = { ...best };
    const capped = best.a <= a0 || best.b >= b0;
    for (let i = 0; i < 3 && works(best.a - 1); i++) best.a--;          // refine both edges to a single step
    for (let i = 0; i < 3 && works(best.b + 1); i++) best.b++;
    const t = Math.round((best.a + best.b) / 2), at0 = advance(clone(base), from, t);
    let near = null;                                   // which obstacle the action is for
    if (type === 'J' && !at0.pl.ground) for (const o of at0.obs) if (o.kind === 'orb' && !o.used && o.x < at0.dist + STAND.w + 14 && o.x + o.w > at0.dist) near = o;
    if (!near) for (const o of at0.obs) if ((type === 'D' ? ['gate', 'bug'] : ['spike', 'block', 'bug']).includes(o.kind) && o.x + o.w > at0.dist + (type === 'D' ? 0 : STAND.w) && (!near || o.x < near.x)) near = o;
    out[type].push({ ms: Math.round((best.b - best.a + 1) * MS), capped, at: near ? `${near.kind}@col${Math.round((near.cx - X0) / CELL)}` : '?' });
    if (type === 'J') { ev.push({ type: 'J', t }); from = t + 1; }
    else {                                             // a duck is held until the continuation no longer needs it (plus the slack)
      const cont = robust(after(t), H(t + 4), acts, SLACK, left, true); let n = 0; while (cont.path[n] === 'D') n++;
      ev.push({ type: 'D', t0: t, t1: t + 3 + n * TICK + SLACK }); from = t + 4 + n * TICK + SLACK;
    }
    base = advance(clone(w0), 0, from);
    if (!base) { out.ok = false; break; }
    if (left) { sol = solve(clone(base), from, left, false); if (!sol) { out.ok = false; break; } }
  }
  if (!out.ok) { cache.set(key, out); return out; }
  // the whole comfortable solution once more: apex and passive pad landings
  { const w = clone(w0), inp = { press: false, hold: false, down: false }; let padAt = -1;
    for (let i = 0; i < steps; i++) {
      inp.press = false; inp.down = false;
      for (const e of ev) { if (e.type === 'J' ? e.t === i : e.t0 <= i && i <= e.t1) { if (e.type === 'J') inp.press = true; else inp.down = true; } }
      step(w, inp, DT); out.apex = Math.max(out.apex, w.pl.h);
      if (w.dead) { out.ok = false; break; }
      if (w.ev & EV.PAD) padAt = i;
      if (w.ev & EV.LAND && padAt >= 0) {          // passive landing after a pad: distance from Rex to the nearest hazard on either side
        if (ev.some(e => (e.type === 'J' ? e.t > padAt && e.t <= i : e.t1 > padAt && e.t0 <= i))) out.padInput = true;
        let clear = 1e9; for (const o of w.obs) if (o.kind !== 'pad' && o.kind !== 'orb') clear = Math.min(clear, Math.max(o.x - (w.dist + STAND.w), w.dist - (o.x + o.w)));
        out.pads.push(clear); padAt = -1;
      }
    } }
  // nobody can push Rex above TOP: press jump on every single step
  { const w = clone(fixed(rows, s, v, touch, false)), inp = { press: true, hold: true, down: false }; for (let i = 0; i < steps && !w.dead; i++) { inp.press = true; step(w, inp, DT); out.apex = Math.max(out.apex, w.pl.h); } }
  cache.set(key, out); return out;
}

/* ── таблиця однієї карти: найменше вікно на кожному відрізку (на його найбільшій швидкості) проти норми свого року ── */
export function table(start, touch, print) {
  const mode = touch ? 'touch' : 'keys', need = NEED[mode];
  const rowsOut = []; let worstJ = 1e9, worstD = 1e9, apex = 0;
  const years = Array.from({ length: YEARS }, () => ({ J: 1e9, D: 1e9 }));
  for (let n = 0; n < SEGMENTS; n++) {
    const s = (start + n) % PER_YEAR, y = Math.floor(n / PER_YEAR), pats = segment(n, s, touch), v0 = startSpeed(n, touch), v1 = startSpeed(n + 1, touch);
    let minJ = null, minD = null, count = 0;
    for (const p of pats) {
      count += p.join('').replace(/\./g, '').length;
      const a = analyse(p, s, v1, touch);
      if (!a.ok) { fail(`${mode} segment ${n + 1} (${NAMES[s]}): pattern ${p.join(' / ')} has no solution with margins at ${v1.toFixed(1)} U/s`); continue; }
      apex = Math.max(apex, a.apex);
      for (const j of a.J) if (!minJ || j.ms < minJ.ms) minJ = { ...j, p };
      for (const d of a.D) if (!minD || d.ms < minD.ms) minD = { ...d, p };
      if (a.padInput) fail(`${mode} segment ${n + 1}: pattern ${p.join(' / ')} needs input during a pad flight`);
      for (const c of a.pads) if (c < PAD_CLEAR) fail(`${mode} segment ${n + 1}: pattern ${p.join(' / ')}: passive pad landing only ${c.toFixed(1)} U from a hazard`);
    }
    if (minJ && minJ.ms < need.J[y]) fail(`${mode} segment ${n + 1} (Y${y + 1} ${NAMES[s]}): jump window ${minJ.ms} ms < ${need.J[y]} at ${minJ.at} in ${minJ.p.join(' / ')}`);
    if (minD && minD.ms < need.D[y]) fail(`${mode} segment ${n + 1} (Y${y + 1} ${NAMES[s]}): duck window ${minD.ms} ms < ${need.D[y]} at ${minD.at} in ${minD.p.join(' / ')}`);
    if (minJ) { worstJ = Math.min(worstJ, minJ.ms); years[y].J = Math.min(years[y].J, minJ.ms); }
    if (minD) { worstD = Math.min(worstD, minD.ms); years[y].D = Math.min(years[y].D, minD.ms); }
    const f = x => (x ? `${String(x.ms).padStart(3)}${x.capped ? '+' : ' '} ms  ${x.at.padEnd(11)} in ${x.p.join(' / ')}` : '—');
    const speed = `${v0.toFixed(1)}–${v1.toFixed(1)} U/s (+${((v1 / v0 - 1) * 100).toFixed(1)} %)`;
    const floor = `need ${need.J[y]}${touch ? '' : '/' + need.D[y]}`;
    rowsOut.push(`${String(n + 1).padStart(2)} | Y${y + 1} ${NAMES[s].padEnd(6)} | ${speed} | ${floor.padEnd(12)} | ${String(pats.length).padStart(2)} patterns, ${String(count).padStart(2)} obstacles | jump: ${f(minJ)}${touch ? '' : `  | duck: ${f(minD)}`}`);
  }
  if (print) console.log(rowsOut.join('\n'));
  return { worstJ, worstD, apex, years };
}


/* кожен шаблон, що може трапитися в році y (хоч би з якої пори року почалася карта), на найбільшій швидкості цього року:
   найгірший випадок для норми року. Розгін буває лише на першому відрізку, тож його міряємо на швидкості кінця першого відрізка */
export function worstWindows(touch) {
  const intro = touch ? W.TOUCH_INTRO : W.INTRO, name = touch ? 'touch' : 'keys', need = NEED[name];
  const years = []; let apex = 0, patterns = 0;
  for (let y = 0; y < YEARS; y++) {
    const v = startSpeed((y + 1) * PER_YEAR, touch), list = [];
    for (let s = 0; s < PER_YEAR; s++) for (const p of new Set(segment(y * PER_YEAR + 1, s, touch))) list.push([s, p, v]);
    if (y === 0) for (const p of intro) list.push([0, p, startSpeed(1, touch)]);
    const out = { year: y + 1, speed: v, patterns: list.length, minJ: 1e9, minD: 1e9, needJ: need.J[y], needD: need.D[y] };
    for (const [s, p, vp] of list) {
      const a = analyse(p, s, vp, touch); patterns++;
      if (!a.ok) { fail(`${name} Y${y + 1}: ${p.join(' / ')} has no comfortable solution at ${vp.toFixed(1)} U/s`); continue; }
      for (const j of a.J) { out.minJ = Math.min(out.minJ, j.ms); if (j.ms < need.J[y]) fail(`${name} Y${y + 1}: jump window ${j.ms} ms < ${need.J[y]} at ${j.at} in ${p.join(' / ')} at ${vp.toFixed(1)} U/s`); }
      for (const j of a.D) { out.minD = Math.min(out.minD, j.ms); if (j.ms < need.D[y]) fail(`${name} Y${y + 1}: duck window ${j.ms} ms < ${need.D[y]} at ${j.at} in ${p.join(' / ')} at ${vp.toFixed(1)} U/s`); }
      if (a.padInput) fail(`${name} Y${y + 1}: ${p.join(' / ')} needs input during a pad flight`);
      for (const c of a.pads) if (c < PAD_CLEAR) fail(`${name} Y${y + 1}: ${p.join(' / ')}: passive pad landing only ${c.toFixed(1)} U from a hazard`);
      apex = Math.max(apex, a.apex);
    }
    years.push(out);
  }
  if (apex > TOP + 1e-6) fail(`${name}: apex ${apex} above TOP`);
  return { patterns, years, apex };
}
/* швидкість не ламає гру. dx — зсув за крок фізики на найбільшій швидкості: він має бути щонайменше вчетверо менший за найвужчу
   зону перешкоди, а найбільший зсув по висоті за крок — менший за найнижчу зону. Пружина, біт і навісна спрацьовують і на цій швидкості.
   Видимість: на найвужчому екрані попереду КІ-Рекса має бути видно щонайменше VIEW.see секунд траси (для гри дотиком це правило, бо
   вузький екран — це телефон; для клавіатури рахуємо, від якої ширини поля воно виконується) */
export function speedRules(touch) {
  const name = touch ? 'touch' : 'keys', top = startSpeed(SEGMENTS, touch), dx = top * DT;
  const probe = createWorld(0); probe.obs.length = 0; place(probe, ['M', 'o', '^'], 0); place(probe, ['v', '.', 'm'], 40); place(probe, ['#j'], 80);
  const narrow = Math.min(...probe.obs.map(o => o.w)), low = Math.min(...probe.obs.map(o => o.h));
  if (dx > narrow / 4) fail(`${name}: step ${dx.toFixed(2)} U at ${top.toFixed(1)} U/s is more than a quarter of the narrowest hitbox (${narrow} U)`);
  // найбільший зсув по висоті за крок: стрибок, а на вершині — «вниз» (різке падіння)
  let dh = 0;
  { const w = fixed(['.'], 0, top, false), inp = { press: true, hold: false, down: false }; let last = 0;
    for (let i = 0; i < 240; i++) { step(w, inp, DT); if (w.pl.h < last) inp.down = true; dh = Math.max(dh, Math.abs(w.pl.h - last)); last = w.pl.h; } }
  if (dh >= low) fail(`${name}: Rex moves ${dh.toFixed(2)} U up or down in one step, the lowest hitbox is ${low} U`);
  // пружина, біт, навісна на найбільшій швидкості: подія має статися
  const seen = (rows, play, flag) => { const w = fixed(rows, 0, top, touch, false), inp = { press: false, hold: false, down: false }, o = w.obs[0]; let ev = 0;
    for (let i = 0; i < 480 && !w.dead; i++) { play(w, inp, o); step(w, inp, DT); ev |= w.ev; } return !w.dead && !!(ev & flag); };
  const pad = seen(['j'], () => {}, EV.PAD);
  // біт: стрибок із землі перед ним, далі натискання, щойно КІ-Рекс торкнувся його зони
  const orb = seen(['.o..', '....', '....'], (w, inp, o) => { inp.press = w.pl.ground ? w.dist >= o.x - 30 && w.dist < o.x - 20 : !o.used && w.dist + STAND.w > o.x + 2; }, EV.ORB);
  const gate = touch || seen(['v', '.', '.'], (w, inp) => { inp.down = true; }, EV.GATE);
  if (!pad) fail(`${name}: the pad does not launch at ${top.toFixed(1)} U/s`);
  if (!orb) fail(`${name}: the orb does not give a second jump at ${top.toFixed(1)} U/s`);
  if (!gate) fail(`${name}: the gate is not passed (or not counted) at ${top.toFixed(1)} U/s`);
  const ahead = VIEW.min - VIEW.rexX, see = ahead / top, minView = Math.ceil(top * VIEW.see / (1 - .12));
  if (touch && see < VIEW.see) fail(`touch: at ${top.toFixed(1)} U/s only ${see.toFixed(2)} s of track is visible ahead on the narrowest screen (${ahead} U), need ${VIEW.see}`);
  return { top, dx, narrow, dh, low, pad, orb, gate, ahead, see, minView };
}
/* правила шаблонів, які видно без гри: жуки поодинці, у грі дотиком нічого «під пригнутися», розгін перед пружиною, перша пружина сама */
export function patternRules(touch) {
  const [intro, levels] = touch ? [W.TOUCH_INTRO, W.TOUCH_LEVELS] : [W.INTRO, W.LEVELS], mode = touch ? 'touch' : 'keys';
  let firstPad = null;
  for (const p of [...intro, ...levels.flat()]) {
    const txt = p.join(''), ground = p[p.length - 1];
    if (/m/i.test(txt) && (p.length !== 1 || p[0].length !== 1)) fail(`${mode}: bug pattern is not a single isolated bug: ${p.join(' / ')}`);
    if (touch && /[vM]/.test(txt)) fail(`touch: duck-only obstacle in ${p.join(' / ')}`);
    for (let c = 0; c < ground.length; c++) if (ground[c] === 'j') {
      if (!firstPad) firstPad = p;
      for (let k = Math.max(0, c - 5); k < c; k++) if (p.some(r => r[k] !== '.')) fail(`${mode}: no clean run-up before the pad in ${p.join(' / ')}`);
    }
  }
  if (intro.some(p => /m/i.test(p.join('')))) fail(`${mode}: a bug in the first segment`);
  if (!firstPad || firstPad.join('') !== 'j' || !intro.includes(firstPad)) fail(`${mode}: the first pad of the map is not a lone tutorial pad`);
  let deaths = 0, launches = 0;                        // самотня пружина не вбиває, хоч би коли гравець стрибнув біля неї
  for (const v of [startSpeed(0, touch), startSpeed(SEGMENTS, touch)]) for (let t = 0; t < 420; t++) {
    const w = fixed(['j'], 1, v, touch), inp = { press: false, hold: false, down: false }; let pad = false;
    for (let i = 0; i < 520 && !w.dead; i++) { inp.press = i === t; step(w, inp, DT); if (w.ev & EV.PAD) pad = true; }
    if (w.dead) deaths++; if (pad) launches++;
  }
  if (deaths) fail(`${mode}: a lone pad killed Rex in ${deaths} of 840 jump timings`);
  return { deaths, launches };
}
export const layout = w => w.obs.map(o => `${o.kind}:${o.cx}:${o.cy}`).join(' ');
/* побудована карта: сталість, контрольні точки, жуки; повертає короткий підсумок */
export function mapRules(start, touch) {
  const name = `${touch ? 'touch' : 'keys '} start ${NAMES[start]}`;
  const a = createWorld(start, { touch, ahead: 1e7 }), b = createWorld(start, { touch, ahead: 1e7 });
  if (layout(a) !== layout(b)) fail(`${name}: two builds of the map differ`);
  if (a.marks.length !== SEGMENTS || a.finish === Infinity) fail(`${name}: map has ${a.marks.length} segments`);
  for (const m of a.marks) {                           // перезапуск із контрольної точки: щоразу те саме, і та сама послідовність перешкод, що й на карті
    const cp = { s: m.s, n: m.n, x: m.x, score: 0, speed: startSpeed(m.n, touch), touch };
    const r1 = createWorld(start, { from: cp, ahead: 1e7 }), r2 = createWorld(start, { from: { ...cp }, ahead: 1e7 });
    if (layout(r1) !== layout(r2)) fail(`${name}: two restarts of segment ${m.n + 1} differ`);
    const rel = (w, mk) => { const o = w.obs.filter(q => q.cx >= mk.x && q.cx < mk.end); return o.map(q => `${q.kind}:${q.cx - o[0].cx}:${q.cy}`).join(' '); };
    if (rel(a, m) !== rel(r1, r1.marks[0])) fail(`${name}: restart of segment ${m.n + 1} is not the same obstacle sequence as in the map`);
  }
  const obs = a.obs.slice().sort((p, q) => p.x - q.x); let bugs = 0, minGap = 1e9;
  obs.forEach((o, i) => {
    if (o.kind !== 'bug') return; bugs++;
    if (o.cx < a.marks[0].end) fail(`${name}: bug in the first segment`);
    if (touch && o.cy === BUG.high) fail(`${name}: high-lane bug`);
    for (const nb of [obs[i - 1], obs[i + 1]]) if (nb) { if (nb.kind === 'bug') fail(`${name}: two bugs in a row`); minGap = Math.min(minGap, nb.x > o.x ? nb.x - (o.x + o.w) : o.x - (nb.x + nb.w)); }
  });
  if (bugs && minGap < JUMP_L) fail(`${name}: bug only ${minGap} U from another obstacle`);
  if (touch && obs.some(o => o.kind === 'gate')) fail(`${name}: gate in the touch map`);
  return { name, obstacles: a.obs.length, bugs, minGap, length: Math.round(a.finish) };
}
/* усе, крім проходження ботом: для тесту. Повертає список порушень (порожній — усе гаразд) і зведення */
export function quickCheck() {
  problems = [];
  const out = { windows: {}, speed: {}, maps: [] };
  for (const touch of [false, true]) {
    const mode = touch ? 'touch' : 'keys';
    out.windows[mode] = worstWindows(touch); out.speed[mode] = speedRules(touch); patternRules(touch);
    for (let s = 0; s < PER_YEAR; s++) out.maps.push(mapRules(s, touch));
  }
  return { problems: problems.slice(), ...out };
}

/* ── запуск із командного рядка: повний звіт ── */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  problems = [];
  const today = W.seasonNow();
  for (const touch of [false, true]) {
    console.log(`\n== ${touch ? 'TOUCH map (tap / hold, jump only)' : 'KEYBOARD map (jump + duck)'}, starting in ${NAMES[today]}: smallest timing window per segment, at the segment's top speed ==`);
    console.log(' # | year season | speed (step per season)    | floor, ms    | content                    | smallest window: ms, obstacle, pattern');
    const t = table(today, touch, true), need = NEED[touch ? 'touch' : 'keys'];
    console.log(`smallest jump window per year: ${t.years.map((y, i) => `Y${i + 1} ${y.J} ms (need ${need.J[i]})`).join(', ')}`);
    if (!touch) console.log(`smallest duck window per year: ${t.years.map((y, i) => `Y${i + 1} ${y.D} ms (need ${need.D[i]})`).join(', ')}`);
    console.log(`highest point of Rex's feet ${t.apex.toFixed(1)} U (ceiling ${TOP})`);
  }
  console.log('\n== every pattern a year can contain, at the top speed of that year (the worst case for any start season) ==');
  for (const touch of [false, true]) {
    const r = worstWindows(touch);
    for (const y of r.years) console.log(`${touch ? 'touch' : 'keys '} Y${y.year}: ${String(y.patterns).padStart(2)} patterns at ${y.speed.toFixed(1)} U/s: smallest jump window ${y.minJ} ms (need ${y.needJ})${touch ? '' : `, smallest duck window ${y.minD} ms (need ${y.needD})`}`);
    console.log(`${touch ? 'touch' : 'keys '} apex ${r.apex.toFixed(1)} U`);
  }
  console.log('\n== speed: steps per physics tick, triggers and visibility at the top speed ==');
  for (const touch of [false, true]) {
    const r = speedRules(touch);
    console.log(`${touch ? 'touch' : 'keys '} top ${r.top.toFixed(1)} U/s: ${r.dx.toFixed(3)} U per step (narrowest hitbox ${r.narrow} U, so Rex's ${STAND.w} U zone overlaps it for ${Math.floor((STAND.w + r.narrow) / r.dx)} steps); largest height change per step ${r.dh.toFixed(2)} U (lowest hitbox ${r.low} U); pad ${r.pad ? 'launches' : 'FAILS'}, orb ${r.orb ? 'works' : 'FAILS'}${touch ? '' : `, gate ${r.gate ? 'counted' : 'FAILS'}`}`);
    console.log(`${touch ? 'touch' : 'keys '} visibility on the narrowest view (${VIEW.min} U wide, Rex at ${VIEW.rexX} U): ${r.ahead} U ahead = ${r.see.toFixed(2)} s at top speed${touch ? ` (need ${VIEW.see})` : `; ${VIEW.see} s needs a view of ${r.minView} U or wider`}`);
  }
  console.log('\n== pattern rules ==');
  for (const touch of [false, true]) { const r = patternRules(touch); console.log(`${touch ? 'touch' : 'keys '} pads: run-up clean, first pad alone; a lone pad: ${r.deaths} deaths in 840 jump timings (${r.launches} launches, the rest flew over it)`); }
  const probe = createWorld(0); probe.obs.length = 0; place(probe, ['m'], 0); place(probe, ['M'], 80);
  const [lo, hi] = probe.obs;
  console.log(`bug hitbox ${lo.w}x${lo.h} U = ${Math.round(lo.w * lo.h / 28 * 100)} % of the 28 px body; low lane ${lo.y}..${lo.y + lo.h} U (jump apex ${JUMP_H} U: ${JUMP_H - lo.y - lo.h} U to spare), high lane ${hi.y}..${hi.y + hi.h} U (ducking Rex ${DUCK.h} U: ${hi.y - DUCK.h} U to spare; standing ${STAND.h} U is hit); solved with +${BUG_MARGIN} U on every side`);
  console.log('\n== generated maps: determinism, checkpoints, bugs, and a full playthrough by the bot ==');
  for (const touch of [false, true]) for (let start = 0; start < PER_YEAR; start++) {
    const before = problems.length, m = mapRules(start, touch), r = playthrough(start, touch);
    if (!r.w.won) fail(`${m.name}: bot ${r.w.dead ? 'died' : 'timed out'} in segment ${r.w.marks[r.w.mi].n + 1} at ${r.w.hit ? r.w.hit.kind : '?'}`);
    if (r.apex > TOP + 1e-6) fail(`${m.name}: apex ${r.apex}`);
    console.log(`${problems.length > before ? 'FAIL' : 'ok  '} ${m.name.padEnd(19)}: ${m.obstacles} obstacles, ${m.bugs} bugs (nearest neighbour ${m.bugs ? m.minGap + ' U' : 'none'}), map length ${m.length} U; bot finished in ${r.seconds.toFixed(0)} s, score ${score(r.w)}, apex ${r.apex.toFixed(1)} U`);
  }
  for (const p of problems) console.log('FAIL ' + p);
  console.log(problems.length ? `\n${problems.length} PROBLEMS` : '\nALL RULES HOLD');
  process.exit(problems.length ? 1 : 0);
}
