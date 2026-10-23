// Мови, адреси й тексти інтерфейсу. Вміст сторінок — у src/content, тут лише «обв'язка».
export type Lang = 'uk' | 'en';
export const LANGS: Lang[] = ['uk', 'en'];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Адреса сторінки з урахуванням мови й базового шляху: url('en', '/news/') → /en/news/ */
export function url(lang: Lang, path = '/') {
  const p = path.startsWith('/') ? path : '/' + path;
  return BASE + (lang === 'en' ? '/en' : '') + p;
}
/** Файл із public/ (документи PDF тощо) */
export const asset = (path: string) => BASE + (path.startsWith('/') ? path : '/' + path);

/** Ключ мови з параметра маршруту [...lang] */
export const langOf = (p?: string): Lang => (p === 'en' ? 'en' : 'uk');
export const langParams = () => [{ params: { lang: undefined } }, { params: { lang: 'en' } }];

/** Шлях без мовного префікса — щоб перемикач мов вів на ту саму сторінку іншою мовою */
export function stripLang(pathname: string) {
  const p = pathname.startsWith(BASE) ? pathname.slice(BASE.length) || '/' : pathname;
  return p.replace(/^\/en(\/|$)/, '/');
}

export const NAV = [
  { path: '/news/', uk: 'Новини', en: 'News', ch: 'NEWS' },
  { path: '/research/', uk: 'Дослідження', en: 'Research', ch: 'RSRC' },
  { path: '/medu-guide/', uk: 'НМЗ', en: 'Materials', ch: 'EDU', title: { uk: 'Навчально-методичне забезпечення', en: 'Teaching materials' } },
  { path: '/entrant/', uk: 'Вступникам', en: 'Admission', ch: 'ADM' },
  { path: '/documents/', uk: 'Документи', en: 'Regulations', ch: 'DOCS' },
  { path: '/graduates/', uk: 'Випускники', en: 'Alumni', ch: 'ALUM' },
  { path: '/personas/', uk: 'Персоналії', en: 'People', ch: 'STAFF' },
  { path: '/stateholders/', uk: 'Роботодавцям', en: 'Employers', ch: 'EMPL' },
] as const;

export const T = {
  uk: {
    dept: 'Кафедра комп’ютерної інженерії',
    deptShort: 'Комп’ютерна інженерія',
    faculty: 'Факультет радіофізики, електроніки та комп’ютерних систем',
    uni: 'Київський національний університет імені Тараса Шевченка',
    uniShort: 'КНУ імені Тараса Шевченка',
    skip: 'Перейти до вмісту',
    menu: 'Меню', close: 'Закрити',
    search: 'Пошук', searchPh: 'Пошук новин, сторінок, людей…', searchEmpty: 'Нічого не знайдено', searchHint: 'Введіть щонайменше 2 символи',
    themeDark: 'Темна тема', themeLight: 'Світла тема',
    langName: 'Українська', other: 'English', otherShort: 'EN', switchLang: 'English version',
    home: 'Головна', news: 'Новини', allNews: 'Усі новини', readMore: 'Читати',
    people: 'Персоналії', toProfile: 'Профіль',
    published: 'Опубліковано', back: 'Назад до новин', prev: 'Попередня', next: 'Наступна',
    onPage: 'На сторінці', contacts: 'Контакти', sections: 'Розділи', about: 'Про сайт',
    address: 'просп. Академіка Глушкова, 4г, Київ, 03022',
    studying: 'Навчання', rss: 'RSS-стрічка', sitemap: 'Мапа сайту',
    footNote: 'Кафедра комп’ютерної інженерії факультету радіофізики, електроніки та комп’ютерних систем.',
    made: 'Сайт зроблено студентами кафедри',
    azLabel: 'Алфавітний покажчик', azJump: 'Перейти до літери',
    peopleCount: (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'людина' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'людини' : 'людей'}`,
    newsCount: (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'новина' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'новини' : 'новин'}`,
    year: 'Рік', allYears: 'Усі роки',
    notFound: 'Сторінку не знайдено', notFoundLead: 'Лінію обірвано: такої адреси на сайті немає. Поки шукаєте потрібне — допоможіть КІ-Рексу перестрибнути через резистори.',
    toHome: 'На головну', play: 'Грати',
    lightboxClose: 'Закрити перегляд', lightboxPrev: 'Попереднє фото', lightboxNext: 'Наступне фото',
    photo: 'Фото', figure: 'Рис.',
  },
  en: {
    dept: 'Department of Computer Engineering',
    deptShort: 'Computer Engineering',
    faculty: 'Faculty of Radiophysics, Electronics and Computer Systems',
    uni: 'Taras Shevchenko National University of Kyiv',
    uniShort: 'Taras Shevchenko National University of Kyiv',
    skip: 'Skip to content',
    menu: 'Menu', close: 'Close',
    search: 'Search', searchPh: 'Search news, pages, people…', searchEmpty: 'Nothing found', searchHint: 'Type at least 2 characters',
    themeDark: 'Dark theme', themeLight: 'Light theme',
    langName: 'English', other: 'Українська', otherShort: 'UA', switchLang: 'Українська версія',
    home: 'Home', news: 'News', allNews: 'All news', readMore: 'Read',
    people: 'People', toProfile: 'Profile',
    published: 'Published', back: 'Back to news', prev: 'Previous', next: 'Next',
    onPage: 'On this page', contacts: 'Contacts', sections: 'Sections', about: 'About',
    address: '4g Akademika Hlushkova Ave, Kyiv 03022, Ukraine',
    studying: 'Studies', rss: 'RSS feed', sitemap: 'Sitemap',
    footNote: 'Department of Computer Engineering, Faculty of Radiophysics, Electronics and Computer Systems.',
    made: 'Built by the department’s students',
    azLabel: 'Alphabetical index', azJump: 'Jump to letter',
    peopleCount: (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`,
    newsCount: (n: number) => `${n} ${n === 1 ? 'story' : 'stories'}`,
    year: 'Year', allYears: 'All years',
    notFound: 'Page not found', notFoundLead: 'The line is broken: this address does not exist. While you look for what you need, help KI-Rex jump over the resistors.',
    toHome: 'Home', play: 'Play',
    lightboxClose: 'Close viewer', lightboxPrev: 'Previous photo', lightboxNext: 'Next photo',
    photo: 'Photo', figure: 'Fig.',
  },
} as const;

export const fmtDate = (d: Date, lang: Lang) =>
  d.toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
