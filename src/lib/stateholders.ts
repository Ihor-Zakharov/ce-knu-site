// Сторінка «Роботодавцям»: перший екран — хто ми, чому нам вірити, що вміють випускники, як написати; повний старий текст — під спойлером.
// Слоти — як у брифі копірайтерів (employers), щоб вибрані голосуванням рядки лягли без змін коду.
// Факти: src/content/pages/*/research.md (премія 2018, перший кластер, грід), graduates.md, index.md.
import type { Lang } from './i18n';

export const MAIL = 'ce.frecs@knu.ua';

/** Підписи над цифрами доказів (мікрокопія інтерфейсу) — у тому самому порядку, що й COPY.proof */
export const PROOF_KICKER: Record<Lang, string[]> = {
  uk: ['Наука', 'Інфраструктура', 'Випускники', 'Лабораторії'],
  en: ['Science', 'Infrastructure', 'Alumni', 'Labs'],
};

export const COPY = {
  uk: {
    meta_description: 'Роботодавцям: випускники кафедри комп’ютерної інженерії КНУ знають ПЛІС і Verilog, C++ і Python, мережі, кібербезпеку й машинне навчання.',
    eyebrow: 'Роботодавцям · F7',
    h1: 'Інженери, які знають і залізо, і код',
    lead: 'Бакалаври, магістри й доктори філософії з комп’ютерної інженерії. Пишіть, якщо шукаєте людей чи партнера для досліджень.',
    cta_mail: 'Написати кафедрі',
    cta_skills: 'Що вміють випускники',
    proof: [
      { value: '2018', label: 'Державна премія України в галузі науки і техніки' },
      { value: 'Перший', label: 'в Україні обчислювальний кластер для науки' },
      { value: 'Intel · Lyft', label: 'та One AI: тут працюють наші випускники' },
      { value: 'Huawei · IBM', label: 'обладнання в лабораторіях, академії Cisco' },
    ],
    skills_title: 'Що вміють випускники',
    skills_note: 'Від мов опису апаратури до машинного навчання: усе в одній програмі F7.',
    ways_title: 'Як працювати з кафедрою',
    ways: [
      { title: 'Впливати на програму', text: 'Надсилайте запитання, пропозиції й рекомендації щодо того, чого вчаться студенти.' },
      { title: 'Досліджувати разом', text: 'Високопродуктивні й розподілені системи, цифровий зв’язок, ШІ та обробка мови.' },
      { title: 'Знайти випускників', text: 'Опишіть у листі, кого шукаєте: стажера, інженера чи дослідника.' },
    ],
    spoiler_letter: 'Повний текст звернення кафедри',
    band_title: 'Шукаєте інженерів чи партнера для досліджень',
    band_cta: 'Написати кафедрі',
  },
  en: {
    meta_description: 'For employers: graduates of the KNU Department of Computer Engineering know FPGAs and Verilog, C++ and Python, networks, security and machine learning.',
    eyebrow: 'For employers · F7',
    h1: 'Engineers who know hardware and code',
    lead: 'Bachelor’s, Master’s and PhD graduates in computer engineering. Write to us if you’re hiring or need a research partner.',
    cta_mail: 'Write to the department',
    cta_skills: 'What graduates know',
    proof: [
      { value: '2018', label: 'State Prize of Ukraine in Science and Technology' },
      { value: 'First', label: 'research computing cluster in Ukraine, built here' },
      { value: 'Intel · Lyft', label: 'and One AI: where our alumni work' },
      { value: 'Huawei · IBM', label: 'equipment in our labs, plus a Cisco academy' },
    ],
    skills_title: 'What graduates know',
    skills_note: 'From hardware description languages to machine learning, in one F7 programme.',
    ways_title: 'Working with the department',
    ways: [
      { title: 'Shape the curriculum', text: 'Send questions, proposals and recommendations about what students learn.' },
      { title: 'Research together', text: 'High-performance and distributed systems, digital communications, AI and NLP.' },
      { title: 'Meet our graduates', text: 'Tell us in an email who you are looking for: an intern, an engineer or a researcher.' },
    ],
    spoiler_letter: 'The department’s full letter to employers',
    band_title: 'Hiring engineers, or need a research partner',
    band_cta: 'Write to us',
  },
} as const;
