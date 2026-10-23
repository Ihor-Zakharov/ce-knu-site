// Поведінка сайту. Без JS усі сторінки повністю читаються й навігуються;
// скрипт лише додає рух, тему, меню на телефоні, пошук і перегляд фото.
import { REDUCED, FINE, attachPress, attachGlow, moveInk } from './spring.js';
import { perch, paintStatic, rexFrame, drawGrid, REX_GRID } from './rex.js';
import { mountInstruments } from './instruments.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const L = root.lang === 'en' ? 'en' : 'uk';
const BASE = root.dataset.base || '/';
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* приватний режим */ } },
};
const springAnim = 'linear(0, .006, .025 2.8%, .101 6.1%, .539 18.9%, .721 25.3%, .849 31.5%, .937 38.1%, .968 41.8%, .991 45.7%, 1.006 50.1%, 1.015 55%, 1.017 63.9%, 1.001 85.9%, 1)';
const anim = (el, kf, ms = 560, easing = springAnim) => (REDUCED ? null : el.animate(kf, { duration: ms, easing, fill: 'both' }));
const typing = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
root.classList.add('js');

/* ── Тема: коло від кнопки з одним золотим кільцем по краю ───── */
const sysDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
let theme = root.dataset.theme || (sysDark() ? 'dark' : 'light');
const TL = { uk: ['Темна тема', 'Світла тема'], en: ['Dark theme', 'Light theme'] }[L];
function reflectTheme() {
  $$('.theme-toggle').forEach(b => { b.setAttribute('aria-pressed', String(theme === 'dark')); b.setAttribute('aria-label', theme === 'dark' ? TL[1] : TL[0]); b.title = b.getAttribute('aria-label'); });
  $$('meta[name="theme-color"]').forEach(m => m.setAttribute('content', theme === 'dark' ? '#141211' : '#F6F2EA'));
}
reflectTheme();
let vt = null;
function setTheme(btn) {
  theme = theme === 'dark' ? 'light' : 'dark';            // намір фіксуємо одразу: подвійне натискання не губиться
  const next = theme;
  // під час зміни теми CSS-переходи кольорів вимкнено: інакше текст і фони «доганяють» нову тему вже після кола — мигтіння
  const settle = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
  const apply = () => { root.classList.add('theme-switching'); root.dataset.theme = next; store.set('ki-theme', next); reflectTheme(); document.dispatchEvent(new CustomEvent('themechange')); };
  if (vt) { vt.skipTransition(); vt = null; apply(); settle(); return; }   // натиснули під час переходу — без анімації, одразу
  if (!btn || REDUCED || !document.startViewTransition) { apply(); settle(); return; }
  const b = btn.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
  root.style.setProperty('--vt-x', x + 'px'); root.style.setProperty('--vt-y', y + 'px');
  root.style.setProperty('--vt-r', Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 2 + 'px');
  const t = document.startViewTransition(apply); vt = t;
  t.ready.catch(() => {});
  t.finished.finally(() => { if (vt === t) vt = null; settle(); });
}
$$('.theme-toggle').forEach(b => b.addEventListener('click', () => setTheme(b)));
addEventListener('keydown', e => {
  if (e.code !== 'KeyT' || e.metaKey || e.ctrlKey || e.altKey || e.repeat || typing()) return;   // e.code — працює й на українській розкладці
  setTheme($('.hd .theme-toggle'));
});

/* ── Навігація: лінза на пружині під пунктом, що під курсором ── */
const nav = $('.nav');
if (nav) {
  let hideT = 0;
  $$('a', nav).forEach(a => a.addEventListener('pointerenter', () => {
    if (!FINE.matches) return;
    clearTimeout(hideT);
    const first = !nav.classList.contains('is-hover');
    nav.classList.add('is-hover'); moveInk(nav, $('.nav__t', a), { immediate: first });   // лінза — по слову, симетрично
  }));
  nav.addEventListener('pointerleave', () => { hideT = setTimeout(() => nav.classList.remove('is-hover'), 60); });
  $$('a', nav).forEach(a => a.addEventListener('focus', () => { nav.classList.add('is-hover'); moveInk(nav, $('.nav__t', a)); }));
  nav.addEventListener('focusout', e => { if (!nav.contains(e.relatedTarget)) nav.classList.remove('is-hover'); });
}
const hd = $('.hd');
const onScroll = () => hd?.classList.toggle('is-scrolled', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* ── Меню на телефоні й планшеті ─────────────────────────────── */
const menu = $('#menu'), menuBtn = $('.menu-btn');
if (menu && menuBtn) {
  let lastFocus = null;
  const focusables = () => $$('a[href], button:not([disabled])', menu).filter(x => x.offsetParent !== null);
  const open = () => {
    lastFocus = document.activeElement;
    menu.hidden = false; menu.classList.add('is-open'); root.classList.add('menu-open');
    $$('[aria-controls="menu"]').forEach(b => b.setAttribute('aria-expanded', 'true'));
    $('.sheet-menu__close', menu)?.focus();
  };
  const close = ({ restore = true } = {}) => {
    if (menu.hidden) return;
    menu.classList.remove('is-open'); menu.hidden = true; root.classList.remove('menu-open');
    $$('[aria-controls="menu"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    if (restore) (lastFocus || menuBtn).focus();
  };
  menuBtn.addEventListener('click', open);
  $('.sheet-menu__close', menu)?.addEventListener('click', () => close());
  $$('a', menu).forEach(a => a.addEventListener('click', () => close({ restore: false })));
  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') {                                     // фокус не виходить за межі відкритого меню
      const f = focusables(); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  });
  matchMedia('(min-width: 1240px)').addEventListener('change', e => e.matches && close({ restore: false }));
}

/* ── Пошук: статичний індекс Pagefind, завантажується при першому відкритті ── */
const sd = $('#search');
if (sd) {
  const input = $('input', sd), list = $('ul', sd), empty = $('.dlg__empty', sd);
  let pf = null, idx = 0, seq = 0;
  const T = { uk: { hint: 'Введіть щонайменше 2 символи', none: 'Нічого не знайдено', off: 'Пошук з’явиться після збирання сайту' }, en: { hint: 'Type at least 2 characters', none: 'Nothing found', off: 'Search is available in the built site' } }[L];
  const items = () => $$('li a', list);
  const mark = () => { items().forEach((a, i) => a.setAttribute('aria-selected', String(i === idx))); const on = items()[idx]; input.setAttribute('aria-activedescendant', on ? on.id : ''); on?.scrollIntoView({ block: 'nearest' }); };
  async function load() {
    if (pf) return pf;
    try { pf = await import(/* @vite-ignore */ BASE + 'pagefind/pagefind.js'); await pf.options?.({ excerptLength: 22 }); pf.init?.(); }
    catch { pf = false; }
    return pf;
  }
  async function run() {
    const q = input.value.trim(), my = ++seq;
    if (q.length < 2) { list.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); empty.textContent = T.hint; empty.hidden = false; return; }
    const p = await load();
    if (!p) { empty.textContent = T.off; empty.hidden = false; return; }
    const r = await p.debouncedSearch(q, {}, 160); if (!r || my !== seq) return;
    const data = await Promise.all(r.results.slice(0, 10).map(x => x.data()));
    if (my !== seq) return;
    input.setAttribute('aria-expanded', String(data.length > 0));
    list.innerHTML = data.map((d, i) => `<li role="presentation"><a id="sr-${i}" role="option" href="${d.url}"><b>${d.meta?.title ?? d.url}</b><span>${d.excerpt}</span></a></li>`).join('');
    empty.textContent = T.none; empty.hidden = data.length > 0; idx = 0; mark();
  }
  const open = () => {
    if (!sd.open) sd.showModal();
    input.value = ''; list.innerHTML = ''; empty.textContent = T.hint; empty.hidden = false; input.focus(); load();
    anim($('.dlg__card', sd) || sd, [{ opacity: 0, translate: '0 -10px', scale: .97 }, { opacity: 1, translate: '0 0', scale: 1 }], 520);
  };
  $$('[data-search]').forEach(b => b.addEventListener('click', () => { if (menu && !menu.hidden) $('.sheet-menu__close', menu)?.click(); open(); }));
  addEventListener('keydown', e => {
    if (sd.open) return;
    if ((e.code === 'KeyK' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing())) { e.preventDefault(); open(); }
  });
  input.addEventListener('input', run);
  input.addEventListener('keydown', e => {
    const n = items().length; if (!n) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = (idx + 1) % n; mark(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); idx = (idx - 1 + n) % n; mark(); }
    if (e.key === 'Enter') { e.preventDefault(); items()[idx]?.click(); }
  });
  sd.addEventListener('click', e => { if (e.target === sd) sd.close(); });
}

/* ── Натиск і світло — пружини ──────────────────────────────── */
attachPress(document, '.btn, .key, .chip, .menu-btn, .lang-link, .az-bar a', 0.965);
attachGlow(document, '.btn');

/* ── Поява при прокручуванні ────────────────────────────────── */
const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add('in'); io.unobserve(e.target); }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
$$('.rv, .footer').forEach(n => io.observe(n));

/* ── Підвал: діаграма Сміта прокреслюється при появі ────────── */
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent?.append(n); return n; };
$$('.footer__smith').forEach(svg => {
  svg.setAttribute('viewBox', '-1.05 -1.05 2.1 2.1');
  const cp = el('clipPath', { id: 'fsc' }, svg); el('circle', { cx: 0, cy: 0, r: 1 }, cp);
  const gg = el('g', { 'clip-path': 'url(#fsc)' }, svg);
  el('circle', { cx: 0, cy: 0, r: 1 }, svg); el('line', { x1: -1, y1: 0, x2: 1, y2: 0 }, svg);
  [.2, .5, 1, 2, 5].forEach(r => el('circle', { cx: r / (1 + r), cy: 0, r: 1 / (1 + r) }, gg));
  [.2, .5, 1, 2, 5].forEach(x => [1, -1].forEach(s => el('circle', { cx: 1, cy: -s / x, r: 1 / x }, gg)));
  let d = ''; for (let i = 0; i <= 140; i++) { const a = i / 140 * Math.PI * 2.6, r = .62 * (1 - i / 180); d += (i ? 'L' : 'M') + (Math.cos(a) * r).toFixed(3) + ' ' + (Math.sin(a) * r * .9).toFixed(3); }
  el('path', { d, class: 'spiral' }, svg); el('circle', { cx: 0, cy: 0, r: .02, class: 'dot' }, svg);
  $$(':scope > circle:not(.dot), :scope > line, :scope > path, :scope > g > circle', svg).forEach((n, i) => { n.setAttribute('pathLength', '1'); n.classList.add('dr'); n.style.setProperty('--d', i); });
});

/* ── Перегляд фото: з мініатюри, стрілками між фото статті ─── */
const lb = $('#lightbox');
if (lb) {
  const img = $('img', lb), cap = $('[data-lb-cap]', lb);
  const shots = $$('.prose img').filter(i => !i.closest('.mascot'));
  let i = 0;
  // у перегляді — вже стиснене зображення сторінки, а не 5000-піксельний оригінал (оригінал лишається за посиланням)
  const full = im => im.currentSrc || im.src;
  const show = (k, from) => {
    i = (k + shots.length) % shots.length; const s = shots[i];
    img.src = full(s); img.alt = s.alt;
    const text = s.closest('figure')?.querySelector('figcaption')?.textContent || s.alt || '';
    cap.textContent = `${String(i + 1).padStart(2, '0')} / ${String(shots.length).padStart(2, '0')}${text ? ' · ' + text : ''}`;
    if (from) { const a = from.getBoundingClientRect(); requestAnimationFrame(() => { const b = img.getBoundingClientRect(); if (!b.width) return; anim(img, [{ translate: `${a.left + a.width / 2 - (b.left + b.width / 2)}px ${a.top + a.height / 2 - (b.top + b.height / 2)}px`, scale: a.width / b.width, opacity: .6 }, { translate: '0 0', scale: 1, opacity: 1 }], 620); }); }
    else anim(img, [{ opacity: 0, scale: .98 }, { opacity: 1, scale: 1 }], 420);
  };
  shots.forEach((s, k) => {
    s.style.cursor = 'zoom-in';
    (s.closest('a') || s).addEventListener('click', e => { e.preventDefault(); lb.showModal(); root.classList.add('menu-open'); show(k, s); $(shots.length > 1 ? '[data-lb-next]' : '[data-lb-close]', lb).focus(); });
  });
  lb.addEventListener('close', () => root.classList.remove('menu-open'));
  $('[data-lb-prev]', lb).addEventListener('click', () => show(i - 1));
  $('[data-lb-next]', lb).addEventListener('click', () => show(i + 1));
  $('[data-lb-close]', lb).addEventListener('click', () => lb.close());
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1); });
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lightbox__in')) lb.close(); });
  if (shots.length < 2) $$('[data-lb-prev], [data-lb-next]', lb).forEach(b => { b.hidden = true; });
}

/* ── Персоналії: підсвітити людину після переходу за літерою ── */
const az = $('.az-bar');
if (az) {
  $$('a', az).forEach(a => a.addEventListener('click', () => {
    $$('a', az).forEach(x => x.classList.toggle('on', x === a));
    const t = document.getElementById(a.hash.slice(1));
    if (t) { t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); }
  }));
}

/* ── КІ-Рекс: статичні спрайти, «Рекси на приладах» ─────────── */
$$('canvas[data-rex]').forEach(paintStatic);
$$('.perch').forEach(perch);
mountInstruments();
// підказка «рухайте курсором» — лише там, де є курсор
if (!FINE.matches) $$('.inst__hud span').forEach(s => { if (/MOVE CURSOR/.test(s.textContent)) s.textContent = ''; });

/* ── На телефоні прилад з КІ-Рексом — після змісту сторінки, а не перед ним ── */
const dock = $('[data-inst-dock]'), dockable = $('[data-dockable]');
if (dock && dockable) {
  const home = document.createComment('inst'); dockable.before(home);
  // на головній осцилограф стає в текст «Про кафедру» — після абзацу про лабораторії й академії Huawei, Cisco
  const labs = [...document.querySelectorAll('#h-about ~ * .prose > p, [aria-labelledby="h-about"] .prose > p')].find(p => /Huawei, Cisco/.test(p.textContent));
  if (labs && dock.classList.contains('inst-dock--home')) labs.after(dock);
  const place = mq => { if (mq.matches) { dock.hidden = false; dock.append(dockable); } else { home.after(dockable); dock.hidden = true; } };
  const mq = matchMedia('(max-width: 900px)'); place(mq); mq.addEventListener('change', place);
}

/* ── Головна: осцилограф — промінь плавно перетікає між формами сигналу ── */
const scope = $('.scope-home');
if (scope) {
  const main = $('.trace--main', scope), ghost = $('.trace--ghost', scope);
  const keys = $$('.key[data-mode]', scope), label = $('[data-scope-mode]', scope), freq = $('[data-scope-f]', scope), play = $('[data-scope-play]', scope), nextOut = $('[data-scope-next]', scope);
  const DIV_T = 250e-6, DIVS = 10;
  const MODES = {
    sine: { label: 'SIN', cycles: 2, fn: (x, t) => .55 * Math.sin(2 * Math.PI * 2 * x - t) },
    square: { label: 'SQUARE', cycles: 2, fn: (x, t) => { let y = 0; for (let k = 1; k <= 21; k += 2) y += Math.sin(k * (2 * Math.PI * 2 * x - t)) / k; return .45 * y * 4 / Math.PI; } },
    am: { label: 'AM', cycles: 24, fn: (x, t) => .55 * (.55 + .45 * Math.sin(2 * Math.PI * 1.5 * x - t * .5)) * Math.sin(2 * Math.PI * 24 * x - t * 10) },
    chirp: { label: 'CHIRP', cycles: 0, fn: (x, t) => .52 * Math.sin(2 * Math.PI * (x + 3 * x * x) - t) * (1 - .3 * x) },
  };
  const fmtF = m => m.cycles ? (m.cycles / (DIVS * DIV_T) / 1000).toFixed(2).replace('.', L === 'uk' ? ',' : '.') + (L === 'uk' ? ' кГц' : ' kHz') : (L === 'uk' ? '0,4 → 1,6 кГц' : '0.4 → 1.6 kHz');
  const W = 1000, H = 667, order = ['sine', 'square', 'am', 'chirp'], HOLD = 6200;
  const NEXT = L === 'uk' ? 'далі' : 'next', MANUAL = L === 'uk' ? 'ручний режим' : 'manual', SEC = L === 'uk' ? 'с' : 's';
  let from = 'sine', to = 'sine', mt = performance.now(), t0 = performance.now(), raf = 0, auto = !REDUCED, playing = !REDUCED, frozen = performance.now();
  const ease = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const yAt = (x, t, e) => H / 2 - (MODES[from].fn(x, t) * (1 - e) + MODES[to].fn(x, t) * e) * H * .4;
  function path(now) {
    const t = ((playing ? now : frozen) - t0) / 1000 * 1.4, e = ease(Math.min(1, (now - mt) / 1200));
    let d = '';
    for (let px = 0; px <= W; px += 3) d += (px ? 'L' : 'M') + px + ' ' + yAt(px / W, t, e).toFixed(1);
    main.setAttribute('d', d); ghost.setAttribute('d', d);
    return e < 1;
  }
  function frame(now) {
    const morphing = path(now);
    const next = keys.find(k => k.dataset.mode === order[(order.indexOf(to) + 1) % order.length]);
    if (auto && playing) {
      const p = Math.min(1, (now - mt) / HOLD);
      keys.forEach(k => k.style.setProperty('--p', k === next ? p.toFixed(4) : 0));
      nextOut.textContent = `${NEXT} ${MODES[next.dataset.mode].label} · ${Math.max(0, (HOLD - (now - mt)) / 1000).toFixed(1).replace('.', L === 'uk' ? ',' : '.')} ${SEC}`;
      if (now - mt > HOLD) go(next.dataset.mode, false);
    }
    raf = playing || morphing ? requestAnimationFrame(frame) : 0;
  }
  const start = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  function go(m, manual = true) {
    if (manual) { auto = false; keys.forEach(k => k.style.setProperty('--p', 0)); nextOut.textContent = MANUAL; }
    if (m === to && manual) return;
    from = to; to = m; mt = performance.now();
    label.textContent = MODES[m].label; freq.textContent = fmtF(MODES[m]);
    keys.forEach(k => k.setAttribute('aria-pressed', String(k.dataset.mode === m)));
    start();
  }
  keys.forEach(k => k.addEventListener('click', () => go(k.dataset.mode)));
  const PL = L === 'uk' ? ['Пауза', 'Відтворити'] : ['Pause', 'Play'];
  play?.addEventListener('click', () => {
    playing = !playing;
    if (playing) { const d = performance.now() - frozen; t0 += d; mt += d; } else frozen = performance.now();
    play.setAttribute('aria-pressed', String(!playing)); play.setAttribute('aria-label', playing ? PL[0] : PL[1]); play.title = play.getAttribute('aria-label');
    $('use', play).setAttribute('href', playing ? '#i-pause' : '#i-play');
    start();
  });
  if (REDUCED) { play?.setAttribute('aria-pressed', 'true'); $('use', play)?.setAttribute('href', '#i-play'); }
  path(performance.now());
  let seen = false;
  const upd = () => (seen && !document.hidden ? start() : stop());
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; upd(); }, { rootMargin: '80px' }).observe(scope);
  document.addEventListener('visibilitychange', upd);
}

/* ── Пасхалка: ↑↑↓↓←→←→BA — КІ-Рекс пробігає низом екрана ──── */
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
let kq = [];
addEventListener('keydown', e => {
  kq = [...kq, e.code].slice(-KONAMI.length);
  if (kq.join() !== KONAMI.join() || REDUCED) return;
  kq = [];
  const cv = document.createElement('canvas'), PX = 4; cv.width = REX_GRID.w * PX; cv.height = REX_GRID.h * PX;
  cv.setAttribute('aria-hidden', 'true');
  Object.assign(cv.style, { position: 'fixed', left: '0', bottom: '0', zIndex: 300, pointerEvents: 'none', imageRendering: 'pixelated' });
  document.body.append(cv);
  const c = cv.getContext('2d'); let x = -REX_GRID.w * PX, f = 0, last = performance.now();
  const loop = now => { const dt = (now - last) / 1000; last = now; x += dt * 420; f += dt * 12; c.clearRect(0, 0, cv.width, cv.height); drawGrid(c, rexFrame({ legs: Math.floor(f) % 2 ? 1 : 2, acc: 'cap' }), PX); cv.style.transform = `translate(${x}px, ${-Math.abs(Math.sin(f / 2)) * 10}px)`; if (x < innerWidth) requestAnimationFrame(loop); else cv.remove(); };
  requestAnimationFrame(loop);
});

console.log('%cКІ-Рекс%c вітає! Шукаєте сирці? Тут чисті HTML, CSS і трохи JS. ↑↑↓↓←→←→BA', 'font:600 14px sans-serif;color:#5E9B3A', 'font:13px sans-serif');
