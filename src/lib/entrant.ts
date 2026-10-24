// Сторінка «Вступникам»: перший екран — головне (місця, роки, дисципліни, гуртожиток, спорт), далі — цикли дисциплін
// і повний текст чинної сторінки (src/content/pages/*/entrant.md) під спойлерами.
// Факти — лише з entrant.md, index.md і research.md; ключі COPY — як у брифі копірайтерів (entrant.*), щоб підставити голосування.
import type { Lang } from './i18n';

export const RULES = 'https://vstup.knu.ua/rules';
export const PLAN = 'https://rex.knu.ua/wp/wp-content/uploads/2023/04/123_BAK_PLAN-2019.pdf';

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

/** Тексти: три моделі писали наосліп, ті самі три голосували (більшість; правила НМТ не згадуємо — вони змінюються). */
export const COPY = {
  uk: {
    meta_description: 'Комп’ютерна інженерія в КНУ імені Тараса Шевченка: 40 курсів, FPGA, мережі Huawei і Cisco, перший суперкомп’ютер України. Правила вступу і план.',
    eyebrow: 'F7 · Комп’ютерна інженерія',
    h1: 'Від транзистора до суперкомп’ютера',
    lead: 'Кафедра першого суперкомп’ютера України. 40 дисциплін: цифрові схеми, мережі, UNIX, паралельні обчислення.',
    cta_rules: 'Правила вступу',
    cta_plan: 'Навчальний план',
    facts: [
      { value: 'до 100', label: 'місць на бакалавраті за ліцензією' },
      { value: '4 + 2', label: 'роки бакалаврату й магістратури' },
      { value: '40', label: 'дисциплін у семи циклах' },
      { value: 'Гуртожиток', label: 'для студентів з інших міст' },
      { value: '2 роки', label: 'військова підготовка: звання офіцера запасу' },
      { value: 'Басейн', label: 'спорткомплекс із залами та стадіоном' },
    ],
    study_title: '40 дисциплін у 7 циклах',
    study_lead: 'Ви навчитеся проєктувати пристрій, писати для нього код і під’єднувати його до мережі.',
    cycles: ['Програмування', 'Математика й фізика', 'Комп’ютерні системи', 'Бази даних', 'Цифрова схемотехніка', 'Мережі', 'Безпека й сигнали'],
    why_title: 'Інженерія на практиці',
    why: [
      { title: 'Залізо у ваших руках', text: 'Комутатори Huawei, плати FPGA, сервер IBM Power. У ReLab старші студенти вчать молодших.' },
      { title: 'Нейромережі й мовні моделі', text: 'Їх досліджує кафедра. Студенти доповідають на конференціях у Німеччині й Фінляндії.' },
      { title: 'Кар’єри випускників', text: 'Intel: директор офісу в Україні. One AI: дослідження NLP. Lyft: програмні проєкти.' },
    ],
    spoiler_steps: 'Порядок вступу: заяви та документи',
    spoiler_courses: 'Усі 40 дисциплін за циклами',
    spoiler_life: 'Життя в КНУ поза парами',
    band_title: 'Оберіть нас першим пріоритетом',
    band_cta: 'Як вступити',
  },
  en: {
    meta_description: 'Computer engineering at Taras Shevchenko National University of Kyiv: 40 courses in 4 years, FPGA, Huawei and Cisco labs, Ukraine’s first supercomputer.',
    eyebrow: 'F7 · Computer Engineering',
    h1: 'From transistor to supercomputer',
    lead: 'Ukraine’s first supercomputer was built here. 40 courses: circuits, networks, UNIX, parallel computing.',
    cta_rules: 'Admission rules',
    cta_plan: 'Curriculum',
    facts: [
      { value: 'up to 100', label: 'licensed bachelor’s places' },
      { value: '4 + 2', label: 'years of Bachelor’s and Master’s' },
      { value: '40', label: 'courses in seven cycles' },
      { value: 'Halls', label: 'of residence for students from other cities' },
      { value: '2 years', label: 'military training, rank of reserve officer' },
      { value: 'Pool', label: 'sports centre with halls and a stadium' },
    ],
    study_title: '40 courses in 7 cycles',
    study_lead: 'You’ll learn to design a device, write its code and connect it to a network.',
    cycles: ['Programming', 'Maths and physics', 'Computer systems', 'Databases', 'Digital circuit design', 'Networking', 'Security and signals'],
    why_title: 'Engineering in practice',
    why: [
      { title: 'Hardware in your hands', text: 'Huawei switches, FPGA boards, an IBM Power server. In ReLab senior students teach juniors.' },
      { title: 'AI and language models', text: 'The department researches both. Students present at conferences in Germany and Finland.' },
      { title: 'Graduates at work', text: 'Intel: head of the Ukraine office. One AI: NLP research. Lyft: software projects.' },
    ],
    spoiler_steps: 'Full application process and documents',
    spoiler_courses: 'All 40 courses by cycle',
    spoiler_life: 'Life at KNU beyond lectures',
    band_title: 'Put us down as priority 1',
    band_cta: 'How to apply',
  },
} as const;
