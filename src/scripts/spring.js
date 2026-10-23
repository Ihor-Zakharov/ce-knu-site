// «Сигнал» — пружинна фізика інтерфейсу. Ядро (Spring, Motion, moveInk) перенесено з cosmos-kit
// (src/js/motion.js) і скорочено під кіт; параметри — response (період, с) і damping (частка
// критичного згасання), як у SwiftUI: 1 — без перельоту, 0.8 — один ледь помітний.

export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const FINE = matchMedia('(hover: hover) and (pointer: fine)');

/* ролі руху: одна таблиця на весь кіт */
export const ROLE = {
  press:   { response: 0.12, damping: 1 },     // палець вниз — одразу
  release: { response: 0.42, damping: 0.72 },  // відпускання — м'який відскок
  hover:   { response: 0.5,  damping: 0.86 },  // підйом при наведенні
  glow:    { response: 0.34, damping: 1 },     // світло доганяє курсор
  ink:     { response: 0.42, damping: 0.82 },  // «крапля» під вкладками
  enter:   { response: 0.6,  damping: 0.9 },   // поява
};

const active = new Set();
let raf = 0, last = 0;
function tick(now) {
  raf = 0;
  const dt = Math.min(0.048, Math.max(0.001, (now - last) / 1000));
  last = now;
  for (const s of active) s._step(dt);
  if (active.size) raf = requestAnimationFrame(tick);
}
function schedule(s) { active.add(s); if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }

export class Spring {
  constructor(o = {}) {
    this.response = o.response ?? 0.42; this.damping = o.damping ?? 0.86;
    this.value = this.target = o.value ?? 0; this.velocity = 0;
    this.epsilon = o.epsilon ?? 0.001; this.onUpdate = o.onUpdate || null;
  }
  set(target, { immediate } = {}) {
    this.target = target;
    if (immediate || REDUCED) return this.snap(target);
    schedule(this); return this;
  }
  snap(v) { this.value = this.target = v; this.velocity = 0; active.delete(this); this.onUpdate?.(v); return this; }
  retune(r, d) { if (r) this.response = r; if (d != null) this.damping = d; return this; }
  _step(dt) {
    const w = (2 * Math.PI) / this.response, k = w * w, c = 2 * this.damping * w;
    const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
    for (let i = 0; i < n; i++) { const a = -k * (this.value - this.target) - c * this.velocity; this.velocity += a * h; this.value += this.velocity * h; }
    const sc = Math.max(1, Math.abs(this.target) * 0.001);
    if (Math.abs(this.velocity) < this.epsilon * 12 * sc && Math.abs(this.value - this.target) < this.epsilon * sc) { this.value = this.target; this.velocity = 0; active.delete(this); }
    this.onUpdate?.(this.value);
  }
}

/* набір пружин, що пишуть лише в transform (без layout) */
export class Motion {
  constructor(el) { this.el = el; this.p = {}; this._dirty = false; }
  _s(name, init) {
    if (!this.p[name]) { const s = new Spring({ value: init, epsilon: name === 's' ? 0.0015 : 0.05 }); s.onUpdate = () => this._apply(); this.p[name] = s; }
    return this.p[name];
  }
  to(values, role = ROLE.hover) {
    for (const [k, v] of Object.entries(values)) this._s(k, k === 's' ? 1 : 0).retune(role.response, role.damping).set(v);
    return this;
  }
  _apply() {
    if (this._dirty) return; this._dirty = true;
    queueMicrotask(() => {
      this._dirty = false;
      const x = this.p.x?.value ?? 0, y = this.p.y?.value ?? 0, s = this.p.s?.value ?? 1;
      this.el.style.translate = x || y ? `${x.toFixed(2)}px ${y.toFixed(2)}px` : '';
      this.el.style.scale = s !== 1 ? s.toFixed(4) : '';
    });
  }
}
const motions = new WeakMap();
export const motionOf = el => { let m = motions.get(el); if (!m) { m = new Motion(el); motions.set(el, m); } return m; };

/* натиск: вниз за пальцем, назад пружиною; ніколи не «перезапускається», а підхоплює швидкість */
export function attachPress(root, selector, depth = 0.965) {
  root.addEventListener('pointerdown', e => {
    if (e.button !== 0 || REDUCED) return;
    const el = e.target.closest(selector);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const m = motionOf(el); m.to({ s: depth }, ROLE.press);
    const up = () => { m.to({ s: 1 }, ROLE.release); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.removeEventListener(t, up)); };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, up));
  }, { passive: true });
}

/* світло за курсором: координати --mx/--my ведуть пружини, тож пляма пливе, а не стрибає */
export function attachGlow(root, selector) {
  if (!FINE.matches || REDUCED) return;
  const state = new WeakMap();
  root.addEventListener('pointermove', e => {
    const el = e.target.closest?.(selector); if (!el) return;
    const r = el.getBoundingClientRect();
    let st = state.get(el);
    if (!st) {
      const write = () => { el.style.setProperty('--mx', st.x.value.toFixed(1) + 'px'); el.style.setProperty('--my', st.y.value.toFixed(1) + 'px'); };
      st = { x: new Spring({ ...ROLE.glow, value: e.clientX - r.left, epsilon: .1 }), y: new Spring({ ...ROLE.glow, value: e.clientY - r.top, epsilon: .1 }) };
      st.x.onUpdate = st.y.onUpdate = write; state.set(el, st); write();
    }
    st.x.set(e.clientX - r.left); st.y.set(e.clientY - r.top);
  }, { passive: true });
}

/* «крапля»: дві кромки на своїх пружинах, ведуча швидша — підсвітка тягнеться і підтягує хвіст */
const inks = new WeakMap();
export function moveInk(group, activeEl, { immediate = false } = {}) {
  const ink = group.querySelector(':scope > .ink'); if (!ink || !activeEl) return;
  const gb = group.getBoundingClientRect(), ab = activeEl.getBoundingClientRect();
  const a = ab.left - gb.left + group.scrollLeft, b = a + ab.width;
  let st = inks.get(ink);
  const write = () => { const lo = Math.min(st.a.value, st.b.value); ink.style.setProperty('--x', lo.toFixed(1) + 'px'); ink.style.setProperty('--w', Math.abs(st.b.value - st.a.value).toFixed(1) + 'px'); };
  if (!st) { st = { a: new Spring({ value: a, epsilon: .05 }), b: new Spring({ value: b, epsilon: .05 }) }; st.a.onUpdate = st.b.onUpdate = write; inks.set(ink, st); immediate = true; }
  const fwd = b > st.b.target;
  st.a.retune(fwd ? 0.46 : 0.28, fwd ? 0.8 : 0.86); st.b.retune(fwd ? 0.28 : 0.46, fwd ? 0.86 : 0.8);
  st.a.set(a, { immediate }); st.b.set(b, { immediate });
  if (immediate) write();
}
