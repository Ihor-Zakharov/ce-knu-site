export const languages = {
  uk: 'Українська',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'uk';

const uk = {
  'site.name': 'Кафедра комп’ютерної інженерії',
  'site.university': 'Київський національний університет імені Тараса Шевченка',
  'site.description':
    'Кафедра комп’ютерної інженерії факультету радіофізики, електроніки та комп’ютерних систем КНУ імені Тараса Шевченка.',
  'nav.skip': 'Перейти до основного вмісту',
  'nav.home': 'Головна',
  'lang.label': 'Мова сайту',
  'home.title': 'Сайт у розробці',
  'home.lead': 'Тут з’явиться нова версія сайту кафедри. Поки що відкрийте',
  'home.currentSite': 'чинний сайт',
  'notFound.title': 'Сторінку не знайдено',
  'notFound.text': 'Можливо, сторінку перенесли або адресу введено з помилкою.',
  'notFound.home': 'На головну',
} as const;

export type UiKey = keyof typeof uk;

// Every language must define every key: a missing translation is a type error in `npm run check`.
export const ui: Record<Lang, Record<UiKey, string>> = {
  uk,
  en: {
    'site.name': 'Department of Computer Engineering',
    'site.university': 'Taras Shevchenko National University of Kyiv',
    'site.description':
      'Department of Computer Engineering, Faculty of Radiophysics, Electronics and Computer Systems, Taras Shevchenko National University of Kyiv.',
    'nav.skip': 'Skip to main content',
    'nav.home': 'Home',
    'lang.label': 'Site language',
    'home.title': 'Site under construction',
    'home.lead': 'The new department website will appear here. Meanwhile, visit',
    'home.currentSite': 'the current site',
    'notFound.title': 'Page not found',
    'notFound.text': 'The page may have moved, or the address has a typo.',
    'notFound.home': 'Back to home',
  },
};

export function isLang(value: string | undefined): value is Lang {
  return value !== undefined && Object.hasOwn(languages, value);
}

export function toLang(locale: string | undefined): Lang {
  return isLang(locale) ? locale : defaultLang;
}

export function useTranslations(lang: Lang): (key: UiKey) => string {
  return (key) => ui[lang][key];
}
