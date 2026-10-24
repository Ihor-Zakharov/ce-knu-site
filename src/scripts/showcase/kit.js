// Спільне для експонатів вітрини: математика руху, шрифти, кольори, піксельний КІ-Рекс.
import { rexFrame, drawGrid, REX_GRID } from '../rex.js';

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (a, b, v) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
export const easeInOut = u => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const easeOut = u => 1 - Math.pow(1 - clamp(u), 3);
export const easeIn = u => clamp(u) ** 3;
export const hex = (v, n = 2) => '0x' + v.toString(16).toUpperCase().padStart(n, '0');

/** Шрифт приладу (моноширинний «Signal Mono») заданого розміру в CSS-пікселях */
export const mono = (c, size, weight = 500) => { c.font = `${weight} ${Math.round(size * 10) / 10}px "Signal Mono", ui-monospace, monospace`; };
export const sans = (c, size, weight = 500) => { c.font = `${weight} ${Math.round(size * 10) / 10}px "Fixel", system-ui, sans-serif`; };
export const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };

/** М'яке світіння лише в темній темі (у світлій промінь «друкований», без ореолу) */
export const glow = (c, col, color, blur = 6) => { if (col.dark) { c.shadowColor = color; c.shadowBlur = blur; } };
export const noGlow = c => { c.shadowBlur = 0; c.shadowColor = 'transparent'; };

/** Піксельний КІ-Рекс одним кольором (гравюра, чіп-арт, підпис) або у власних кольорах (color = null).
 *  px — розмір пікселя спрайта; (x, y) — лівий верхній кут поля 30×24. */
const frames = new Map();
export function rex(c, x, y, px, color = null, opts = {}) {
  const key = JSON.stringify(opts);
  if (!frames.has(key)) frames.set(key, rexFrame(opts));
  const g = frames.get(key);
  drawGrid(c, color ? g.map(r => r.map(v => (v ? color : null))) : g, px, Math.round(x), Math.round(y));
}
export const REX = REX_GRID;   // { w: 30, h: 24 } — поле спрайта в пікселях спрайта

/** Маска КІ-Рекса: true там, де є піксель (для «даних», які малюють Рекса) */
export function rexMask(opts = {}) { return rexFrame(opts).map(r => r.map(Boolean)); }
