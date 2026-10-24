// Внутрішні сторінки (дослідження, НМЗ, документи, випускники, навчання): підписи інтерфейсу й короткі маргіналії.
// Факти — лише з src/content/pages/*/research.md; сам текст сторінок — у Markdown.
import type { Lang } from './i18n';

export const UI: Record<Lang, Record<string, string>> = {
  uk: {
    toc: 'На сторінці', group: 'Дослідницька група', groupMore: 'Склад, проєкт і дипломні роботи', awards: 'Відзнаки',
    find: 'Пошук', findDocs: 'Назва документа', findBooks: 'Автор або назва', year: 'Рік', allYears: 'Усі роки',
    reset: 'Скинути', empty: 'Нічого не знайдено. Змініть запит або рік.', shown: 'Знайдено: {n} з {t}',
  },
  en: {
    toc: 'On this page', group: 'Research group', groupMore: 'Members, project and theses', awards: 'Awards',
    find: 'Search', findDocs: 'Document title', findBooks: 'Author or title', year: 'Year', allYears: 'All years',
    reset: 'Reset', empty: 'Nothing found. Change the query or the year.', shown: 'Found: {n} of {t}',
  },
};

/** Дослідження: відзнаки за роками — маргіналія поруч із розділом «Премії» */
export const RESEARCH_AWARDS: Record<Lang, { year: string; title: string; who: string }[]> = {
  uk: [
    { year: '2018', title: 'Державна премія України в галузі науки і техніки', who: 'проф. С. Д. Погорілий, доц. Ю. В. Бойко' },
    { year: '2018', title: 'Премія Президента України для молодих вчених', who: 'А. О. Сальніков, Є. А. Слюсар' },
  ],
  en: [
    { year: '2018', title: 'State Prize of Ukraine in Science and Technology', who: 'Prof. S. D. Pohorilyi, Assoc. Prof. Yu. V. Boiko' },
    { year: '2018', title: 'President of Ukraine’s Prize for Young Scientists', who: 'A. O. Salnikov, Ye. A. Sliusar' },
  ],
};
