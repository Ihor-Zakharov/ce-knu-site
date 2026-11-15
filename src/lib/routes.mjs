// Англійські адреси розділів: адреса збігається з назвою розділу в англійському меню
// (Admission → /en/admission/, а не /en/entrant/). Українські адреси — як на чинному сайті ce.knu.ua.
// У коді шляхи завжди канонічні (українські): url('en', '/entrant/') сам дає /en/admission/.
// Звичайний JS (.mjs), щоб таблицю читали й сторінки (TS), і rehype-site.mjs, і astro.config.mjs, і тести.

/** канонічний (український) сегмент → англійський */
export const EN_SLUG = {
  'medu-guide': 'materials',
  entrant: 'admission',
  documents: 'regulations',
  graduates: 'alumni',
  personas: 'people',
  stateholders: 'employers',
  studying: 'studies',
};
const UK_SLUG = Object.fromEntries(Object.entries(EN_SLUG).map(([uk, en]) => [en, uk]));

/** перший сегмент шляху за таблицею: '/personas/boiko/' → '/people/boiko/' */
const swap = (path, table) => path.replace(/^\/([^/#?]+)/, (seg, s) => (Object.hasOwn(table, s) ? '/' + table[s] : seg));
/** канонічний шлях → англійський (без префікса /en) */
export const toEn = path => swap(path, EN_SLUG);
/** англійський шлях (без префікса /en) → канонічний */
export const fromEn = path => swap(path, UK_SLUG);
