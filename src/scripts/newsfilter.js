// Фільтр новин: рік (один) і тема (одна), стан — у адресі (?year=2024&topic=awards), тож вибірку можна надіслати посиланням.
// Лічильник кожного варіанта = новини з ним за вибором у другому вимірі (тема — у вибраному році, рік — у вибраній темі);
// які лічильники видно, задає data-counts на .nf. Тема без новин у вибраному році — приглушена й неактивна.
// Без JS — увесь архів і якорі на роки.
export function newsFilter() {
  const box = document.querySelector('[data-news-filter]');
  if (!box) return;
  const items = [...document.querySelectorAll('.nl-list > li[data-year]')].map(li => ({ li, y: li.dataset.year, t: li.dataset.topics.split(' ').filter(Boolean) }));
  const groups = [...document.querySelectorAll('.nl-year[data-year]')];
  const btns = [...box.querySelectorAll('button[data-f]')];
  const sum = box.querySelector('.nf__sum'), sumV = box.querySelector('[data-nf-sum]');
  const state = document.querySelector('[data-nf-state]'), count = state.querySelector('[data-nf-count]');
  const empty = document.querySelector('[data-nf-empty]'), resets = [...document.querySelectorAll('[data-nf-reset]')];
  const [wShown, wOf] = count.dataset.w.split('|');
  const has = (f, v) => btns.some(b => b.dataset.f === f && b.dataset.v === v);
  const st = { year: '', topic: '' };
  const q = new URLSearchParams(location.search);
  if (has('year', q.get('year'))) st.year = q.get('year');
  if (has('topic', q.get('topic'))) st.topic = q.get('topic');

  const inY = (it, y) => !y || it.y === y, inT = (it, k) => !k || it.t.includes(k);
  const n = (y, k) => items.filter(it => inY(it, y) && inT(it, k)).length;

  const apply = (write) => {
    if (st.topic && !n(st.year, st.topic)) st.topic = '';   // тема спорожніла після зміни року — назад до «Усі»
    let shown = 0;
    for (const it of items) { const ok = inY(it, st.year) && inT(it, st.topic); it.li.hidden = !ok; if (ok) shown++; }
    for (const g of groups) {
      const vis = g.querySelectorAll('.nl-list > li:not([hidden])').length, c = g.querySelector('[data-ycount]'), total = +c.dataset.ycount;
      g.hidden = !vis;
      c.dataset.orig ??= c.textContent;
      c.textContent = vis < total ? `${vis} ${c.dataset.w} ${total}` : c.dataset.orig;
    }
    for (const b of btns) {
      const year = b.dataset.f === 'year', c = year ? n(b.dataset.v, st.topic) : n(st.year, b.dataset.v);
      const on = b.dataset.v === st[b.dataset.f], off = !year && !c && !on;
      b.setAttribute('aria-pressed', String(on));
      off ? b.setAttribute('aria-disabled', 'true') : b.removeAttribute('aria-disabled');
      const el = b.querySelector('[data-n]'); if (el) el.textContent = c ? String(c) : '';
    }
    const label = f => btns.find(b => b.dataset.f === f && b.dataset.v === st[f]).dataset.t;
    sumV.textContent = `${label('year')} · ${label('topic')}`;
    count.textContent = `${wShown} ${shown} ${wOf} ${items.length}`;
    empty.hidden = shown > 0;
    resets.forEach(r => { if (r.closest('[data-nf-state]')) r.hidden = !st.year && !st.topic; });
    if (write) {
      const u = new URL(location.href);
      for (const k of ['year', 'topic']) st[k] ? u.searchParams.set(k, st[k]) : u.searchParams.delete(k);
      history.replaceState(history.state, '', u);
    }
    // перемикач мови веде на той самий вибір в іншій мові (ключі тем однакові)
    document.querySelectorAll('a.lang-link').forEach(a => { const u = new URL(a.href, location.href); u.search = location.search; a.href = u.href; });
  };

  btns.forEach(b => b.addEventListener('click', () => {
    if (b.getAttribute('aria-disabled') === 'true') return;
    st[b.dataset.f] = b.dataset.v;
    apply(true);
  }));
  resets.forEach(r => r.addEventListener('click', () => { st.year = ''; st.topic = ''; apply(true); }));
  // телефон: фільтр згорнуто в один рядок «Фільтр · поточний вибір»
  sum.addEventListener('click', () => {
    const open = sum.getAttribute('aria-expanded') !== 'true';
    sum.setAttribute('aria-expanded', String(open));
    box.toggleAttribute('data-open', open);
  });

  document.querySelector('.nl-years')?.setAttribute('hidden', '');   // якорі років замінює фільтр
  box.hidden = false; state.hidden = false;
  apply(q.has('year') || q.has('topic'));   // невідомі й порожні значення прибираємо з адреси
}
