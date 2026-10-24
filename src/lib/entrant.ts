// Сторінка «Вступникам»: перший екран — головне (бал НМТ, місця, роки, гуртожиток, спорт), далі — цикли дисциплін
// і повний текст чинної сторінки (src/content/pages/*/entrant.md) під спойлерами.
// Факти — лише з entrant.md, index.md і research.md; ключі COPY — як у брифі копірайтерів (entrant.*), щоб підставити голосування.
import type { Lang } from './i18n';

export const RULES = 'https://vstup.knu.ua/rules';
export const PLAN = 'https://rex.knu.ua/wp/wp-content/uploads/2023/04/123_BAK_PLAN-2019.pdf';

/** НМТ: вагові коефіцієнти й мінімальний бал (правила прийому 2026, entrant.md) */
export const NMT = { min: 101, lo: 100, hi: 200, subjects: [
  { key: 'math', w: 0.5, def: 170 },
  { key: 'ukr', w: 0.3, def: 165 },
  { key: 'hist', w: 0.2, def: 160 },
] } as const;

/** 40 дисциплін бакалаврату в 7 циклах — кількість і кілька назв для огляду; повний перелік — у спойлері */
export const CYCLES: Record<Lang, { name: string; n: number; some: string[] }[]> = {
  uk: [
    { name: 'Програмування', n: 10, some: ['Системне програмування', 'Програмування вбудованих систем', 'Високопродуктивні обчислення'] },
    { name: 'Фундаментальні', n: 9, some: ['Вища математика', 'Дискретна математика', 'Фізика'] },
    { name: 'Залізо й системне ПЗ', n: 6, some: ['Мікропроцесорна техніка', 'Архітектура комп’ютерів', 'Системне ПЗ'] },
    { name: 'Бази даних', n: 5, some: ['Організація баз даних', 'Сучасні СКБД'] },
    { name: 'Цифрові схеми', n: 4, some: ['Комп’ютерна схемотехніка', 'Комп’ютерна логіка'] },
    { name: 'Мережі', n: 4, some: ['Комп’ютерні мережі', 'Маршрутизація'] },
    { name: 'Обробка інформації', n: 2, some: ['Цифрова обробка сигналів', 'Захист інформації'] },
  ],
  en: [
    { name: 'Programming', n: 10, some: ['System programming', 'Embedded systems programming', 'High-performance computing'] },
    { name: 'Fundamentals', n: 9, some: ['Higher mathematics', 'Discrete mathematics', 'Physics'] },
    { name: 'Hardware and software', n: 6, some: ['Microprocessor engineering', 'Computer architecture', 'System software'] },
    { name: 'Databases', n: 5, some: ['Database organisation', 'Modern DBMS'] },
    { name: 'Digital circuits', n: 4, some: ['Computer circuit design', 'Computer logic'] },
    { name: 'Networks', n: 4, some: ['Computer networks', 'Routing'] },
    { name: 'Information processing', n: 2, some: ['Digital signal processing', 'Information security'] },
  ],
};

export const COPY = {
  uk: {
    meta_description: 'Вступ на F7 «Комп’ютерна інженерія» в КНУ імені Тараса Шевченка: 100 місць, ваги НМТ, 40 дисциплін, гуртожиток. Порахуйте свій бал.',
    eyebrow: 'F7 · Комп’ютерна інженерія',
    h1: 'Вступ на комп’ютерну інженерію',
    lead: 'Схеми, процесори, код і мережі в одній програмі. Порахуйте свій бал НМТ просто тут.',
    cta_rules: 'Правила прийому',
    cta_plan: 'Навчальний план',
    facts: [
      { value: '100', label: 'місць на бакалавраті' },
      { value: '4 + 2', label: 'роки бакалаврату й магістратури' },
      { value: '101', label: 'мінімум з кожного предмета НМТ' },
      { value: 'Гуртожиток', label: 'для студентів з інших міст' },
      { value: '2 роки', label: 'у Військовому інституті: звання офіцера запасу' },
      { value: 'Басейн', label: 'стадіон і спортивний корпус університету' },
    ],
    study_title: 'Що ви вивчатимете',
    study_lead: '40 дисциплін у семи циклах. Найбільший з них, програмування, має десять курсів.',
    cycles: ['Програмування', 'Фундаментальні', 'Залізо й системне ПЗ', 'Бази даних', 'Цифрові схеми', 'Мережі', 'Обробка інформації'],
    why_title: 'Чому саме тут',
    why: [
      { title: 'Залізо й код разом', text: 'Цифрові схеми, процесори й системне програмування в одній програмі.' },
      { title: 'Справжнє обладнання', text: 'Мережева лабораторія Huawei, сервер IBM Power 550, плати Altera DE1 і ReLab.' },
      { title: 'Кафедра з іменем', text: 'Тут створили перший в Україні обчислювальний кластер для науки.' },
    ],
    spoiler_steps: 'Порядок прийому заяв і документів',
    spoiler_courses: 'Усі дисципліни за циклами',
    spoiler_life: 'Що ще дає студентам КНУ',
    band_title: 'Усі деталі вступу в правилах прийому КНУ',
    band_cta: 'Правила прийому',
    // калькулятор
    calc_title: 'Ваш конкурсний бал',
    calc_hud: 'НМТ · F7',
    calc_subjects: { math: 'Математика', ukr: 'Українська мова', hist: 'Історія України' },
    calc_low: 'Нижче мінімуму 101: заяву не допустять до конкурсу.',
    calc_note: 'Сума балів НМТ з вагами 0,5, 0,3 і 0,2. Регіональний, галузевий та інші коефіцієнти КНУ не враховано.',
  },
  en: {
    meta_description: 'Apply to F7 Computer Engineering at Taras Shevchenko National University of Kyiv: 100 places, NMT weights, 40 courses, a dormitory. Work out your score.',
    eyebrow: 'F7 · Computer Engineering',
    h1: 'Study Computer Engineering',
    lead: 'Circuits, processors, code and networks in one programme. Work out your NMT score right here.',
    cta_rules: 'Admission rules',
    cta_plan: 'Curriculum',
    facts: [
      { value: '100', label: 'Bachelor’s places' },
      { value: '4 + 2', label: 'years of Bachelor’s and Master’s' },
      { value: '101', label: 'minimum in each NMT subject' },
      { value: 'Dormitory', label: 'for students from other cities' },
      { value: '2 years', label: 'at the Military Institute: reserve officer' },
      { value: 'Pool', label: 'stadium and the university sports building' },
    ],
    study_title: 'What you will study',
    study_lead: '40 courses in seven cycles. The largest, programming, has ten.',
    cycles: ['Programming', 'Fundamentals', 'Hardware and software', 'Databases', 'Digital circuits', 'Networks', 'Information processing'],
    why_title: 'Why here',
    why: [
      { title: 'Hardware and code together', text: 'Digital circuits, processors and systems programming in one programme.' },
      { title: 'Real equipment', text: 'A Huawei networking lab, an IBM Power 550 server, Altera DE1 boards and ReLab.' },
      { title: 'A department with a record', text: 'It built Ukraine’s first computing cluster for science.' },
    ],
    spoiler_steps: 'How to apply: applications and documents',
    spoiler_courses: 'All courses by cycle',
    spoiler_life: 'What else KNU gives its students',
    band_title: 'Every admission detail is in the KNU rules',
    band_cta: 'Admission rules',
    calc_title: 'Your competitive score',
    calc_hud: 'NMT · F7',
    calc_subjects: { math: 'Mathematics', ukr: 'Ukrainian', hist: 'History of Ukraine' },
    calc_low: 'Below the 101 minimum: the application cannot enter the competition.',
    calc_note: 'NMT scores weighted 0.5, 0.3 and 0.2. Regional, sector and other KNU coefficients are not included.',
  },
} as const;
