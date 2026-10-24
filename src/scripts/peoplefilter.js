// Персоналії: пошук за ім’ям (без різниці регістру, пробілів і виду апострофа; слова в будь-якому порядку) і посада (одна).
// Стан — в адресі (?q=…&position=…). Збіг серед колишніх працівників розгортає «З нами працювали».
export function peopleFilter() {
  const box = document.querySelector('[data-people-filter]');
  if (!box) return;
  const input = box.querySelector('input'), btns = [...box.querySelectorAll('button[data-v]')];
  const groups = [...document.querySelectorAll('.pl-group[data-group]')];
  const rows = groups.flatMap(g => [...g.querySelectorAll('.pl-list > li[data-s]')].map(li => ({ li, g: g.dataset.group, s: li.dataset.s })));
  const state = document.querySelector('[data-pf-state]'), count = state.querySelector('[data-pf-count]');
  const empty = document.querySelector('[data-pf-empty]'), resets = [...document.querySelectorAll('[data-pf-reset]')];
  const [wShown, wOf] = count.dataset.w.split('|');
  const norm = s => s.toLocaleLowerCase(document.documentElement.lang).replace(/[’ʼ'`]/g, '\'').replace(/\s+/g, ' ').trim();
  const p = new URLSearchParams(location.search);
  const st = { q: p.get('q') ?? '', pos: btns.some(b => b.dataset.v === p.get('position')) ? p.get('position') : '' };
  input.value = st.q;

  let timer;
  const write = () => {
    const u = new URL(location.href);
    st.q.trim() ? u.searchParams.set('q', st.q.trim()) : u.searchParams.delete('q');
    st.pos ? u.searchParams.set('position', st.pos) : u.searchParams.delete('position');
    history.replaceState(history.state, '', u);
  };
  const apply = () => {
    const words = norm(st.q).split(' ').filter(Boolean);
    let shown = 0;
    for (const r of rows) {
      const ok = (!st.pos || r.g === st.pos) && words.every(w => r.s.includes(w));
      r.li.hidden = !ok; if (ok) shown++;
    }
    for (const g of groups) {
      const vis = g.querySelector('.pl-list > li:not([hidden])');
      g.hidden = !vis;
      if (g.tagName === 'DETAILS' && vis && (words.length || st.pos === g.dataset.group)) g.open = true;
    }
    btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === st.pos)));
    count.textContent = `${wShown} ${shown} ${wOf} ${rows.length}`;
    empty.hidden = shown > 0;
    resets.forEach(r => { if (r.closest('[data-pf-state]')) r.hidden = !words.length && !st.pos; });
  };

  input.addEventListener('input', () => { st.q = input.value; apply(); clearTimeout(timer); timer = setTimeout(write, 250); });
  btns.forEach(b => b.addEventListener('click', () => { st.pos = b.dataset.v; apply(); write(); }));
  resets.forEach(r => r.addEventListener('click', () => { st.q = ''; st.pos = ''; input.value = ''; apply(); write(); }));

  box.hidden = false; state.hidden = false;
  apply();
}
