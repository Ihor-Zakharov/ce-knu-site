// Можливості браузера поверх сайту: поділитися сторінкою, скопіювати адресу кафедри, офлайн-режим (service worker),
// економія трафіку для вітрини, привітання в консолі для розробників. Усе — прогресивне покращення: без підтримки нічого не ламається.
const root = document.documentElement;
const uk = root.lang !== 'en';
const BASE = root.dataset.base || '/';
const L = uk
  ? { mailCopy: 'Скопіювати адресу', mailCopied: 'Адресу скопійовано', fail: 'Не вдалося скопіювати' }
  : { mailCopy: 'Copy address', mailCopied: 'Address copied', fail: 'Could not copy' };
const svg = d => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>'),
};

/* ── Тост: короткий статус унизу екрана; читачі екрана озвучують його (role=status) ── */
let toastEl, toastT;
function toast(text) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.append(toastEl); }
  toastEl.textContent = text; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2200);
}

/* ── Копіювання: Clipboard API; у старих браузерах — через тимчасове поле ── */
async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* немає дозволу або API */ }
  const ta = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.append(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove(); return ok;
}

/* ── Адреса кафедри: посилання mailto лишається, поруч — кнопка «скопіювати» ── */
document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
  const addr = a.getAttribute('href').slice(7).split('?')[0];
  if (!a.textContent.includes('@') || a.closest('.mailrow')) return;   // лише там, де адресу видно текстом
  const row = document.createElement('span'); row.className = 'mailrow';
  a.replaceWith(row); row.append(a);
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'mail-copy'; b.innerHTML = ICON.copy; b.setAttribute('aria-label', `${L.mailCopy}: ${addr}`); b.title = L.mailCopy;
  b.addEventListener('click', async () => toast((await copy(addr)) ? L.mailCopied : L.fail));
  row.append(b);
});

/* ── Економія трафіку (Save-Data): вітрина головної не крутиться сама — її можна запустити кнопкою ── */
if (navigator.connection?.saveData) {
  const sc = document.querySelector('.showcase');
  let tries = 0;
  const pause = () => {
    const btn = sc?.querySelector('[data-sc-play]'), cv = sc?.querySelector('canvas');
    if (!btn) return;
    if (cv?.width && btn.getAttribute('aria-pressed') === 'false') { btn.click(); return; }   // вітрина вже запущена — ставимо на паузу
    if (++tries < 40) setTimeout(pause, 150);
  };
  pause();
}

/* ── Офлайн: service worker лише у зібраному сайті; область дії — каталог сайту (на переглядах PR — свій каталог) ── */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => { navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE }).catch(() => {}); });
}

/* ── Для тих, хто відкрив консоль (кольори — з токенів бренду) ── */
const tok = v => getComputedStyle(root).getPropertyValue(v).trim();
console.log(
  uk
    ? '%cКІ-Рекс%c бачить, що ви відкрили консоль.\nТакі люди нам і потрібні: ce.frecs@knu.ua\nПідказка: ↑↑↓↓←→←→BA'
    : '%cKI-Rex%c sees you opened the console.\nThat is exactly who we are looking for: ce.frecs@knu.ua\nHint: ↑↑↓↓←→←→BA',
  `font: 600 14px/1.6 ui-monospace, monospace; color: ${tok('--brand-gold')}; background: ${tok('--brand-wine')}; padding: 2px 8px; border-radius: 4px`,
  'font: 13px/1.6 ui-monospace, monospace',
);
