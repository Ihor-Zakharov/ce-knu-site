// Внутрішні сторінки: поточний розділ у змісті, якорі всередині згорнутих розділів, друк, пошук у реєстрах.
// Без JS усе відкрите й видиме: панель пошуку з'являється лише тут.
const norm = s => s.toLowerCase().replace(/[’ʼ'`]/g, "'").replace(/\s+/g, ' ').trim();

export function pages() {
  const root = document.querySelector('[data-pg]');
  if (!root) return;

  // якір у згорнутий розділ: спершу розгорнути, потім показати
  const reveal = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const t = id ? document.getElementById(id) : null;
    const d = t?.closest('details:not([open])');
    if (d) { d.open = true; t.scrollIntoView(); }
  };
  reveal();
  addEventListener('hashchange', reveal);
  addEventListener('beforeprint', () => root.querySelectorAll('details.fold').forEach(d => { d.open = true; }));

  // зміст на телефоні закривається після переходу
  const tocM = root.querySelector('.pg-toc-m');
  tocM?.addEventListener('click', e => { if (e.target.closest('a')) tocM.open = false; });

  // поточний розділ у змісті ліворуч
  const links = [...root.querySelectorAll('.pg-toc a')];
  if (links.length) {
    const heads = links.map(a => document.getElementById(decodeURIComponent(a.hash.slice(1))));
    let raf = 0;
    const mark = () => {
      raf = 0;
      const i = Math.max(0, heads.findLastIndex(h => h && h.getBoundingClientRect().top < 140));
      links.forEach((a, j) => { if (j === i) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    };
    addEventListener('scroll', () => { raf ||= requestAnimationFrame(mark); }, { passive: true });
    mark();
  }

  // реєстр (документи, НМЗ): пошук за назвою чи автором і рік; стан — в адресі (?q=…&year=…)
  const form = root.querySelector('[data-reg]');
  const list = root.querySelector('[data-reg-list]');
  if (!form || !list) return;
  const q = form.querySelector('[data-reg-q]'), y = form.querySelector('[data-reg-y]');
  const n = form.querySelector('[data-reg-n]'), empty = list.querySelector('[data-reg-empty]');
  const resets = [...root.querySelectorAll('[data-reg-reset]')];
  const items = [...list.querySelectorAll('.sec li')].map(li => ({ li, sec: li.closest('.sec'), text: norm(li.textContent) }));
  const yearOf = sec => sec.querySelector('h2')?.textContent.trim() ?? '';
  const folds = [...list.querySelectorAll('details.fold')];
  const auto = new Set();   // розгорнуті пошуком — згорнути назад, коли пошук очищено
  const total = items.length, tpl = form.dataset.shown;
  const params = new URLSearchParams(location.search);
  q.value = params.get('q') ?? '';
  if (y && [...y.options].some(o => o.value === params.get('year'))) y.value = params.get('year');

  const apply = () => {
    const words = norm(q.value).split(' ').filter(Boolean), yr = y?.value ?? '';
    let shown = 0;
    for (const it of items) {
      const ok = words.every(w => it.text.includes(w)) && (!yr || yearOf(it.sec) === yr);
      it.li.hidden = !ok; if (ok) shown++;
    }
    for (const d of folds) {
      const hit = (words.length || yr) && d.querySelector('li:not([hidden])');
      if (hit && !d.open) { d.open = true; auto.add(d); }
      else if (!words.length && !yr && auto.has(d)) { d.open = false; auto.delete(d); }
    }
    const active = words.length > 0 || !!yr;
    list.classList.toggle('is-filtered', active);
    n.textContent = active ? tpl.replace('{n}', shown).replace('{t}', total) : '';
    resets.forEach(b => { b.hidden = !active; });
    empty.hidden = shown > 0;
    const url = new URL(location.href);
    url.searchParams.delete('q'); url.searchParams.delete('year');
    if (q.value.trim()) url.searchParams.set('q', q.value.trim());
    if (yr) url.searchParams.set('year', yr);
    history.replaceState(history.state, '', url);
  };
  let t;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 120); });
  y?.addEventListener('change', apply);
  resets.forEach(b => b.addEventListener('click', () => { q.value = ''; if (y) y.value = ''; apply(); q.focus(); }));
  form.hidden = false;
  apply();
}
