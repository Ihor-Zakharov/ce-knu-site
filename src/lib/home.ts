// Короткі витяги з тексту головної сторінки (src/content/pages/*/index.md) для карток, хронології й партнерів.
// Повний текст лишається на головній у розділі «Про кафедру».
import type { Lang } from './i18n';

export const PROGRAMS: Record<Lang, { level: string; title: string; years: string; places: string; f: number }[]> = {
  uk: [
    { level: 'Бакалавр', title: 'Інженерія комп’ютерних систем і мереж', years: '4 роки', places: 'до 100', f: 1 },
    { level: 'Магістр', title: 'Комп’ютерні системи та мережі', years: '2 роки', places: 'до 50', f: 2 },
    { level: 'Доктор філософії', title: 'Комп’ютерна інженерія', years: '4 роки', places: 'до 10', f: 3 },
  ],
  en: [
    { level: 'Bachelor', title: 'Computer Systems and Networks Engineering', years: '4 years', places: 'up to 100', f: 1 },
    { level: 'Master', title: 'Computer Systems and Networks', years: '2 years', places: 'up to 50', f: 2 },
    { level: 'Doctor of Philosophy', title: 'Computer Engineering', years: '4 years', places: 'up to 10', f: 3 },
  ],
};

export const HISTORY: Record<Lang, { y: string; t: string; d: string }[]> = {
  uk: [
    { y: '1991', t: 'Автоматизація наукових досліджень', d: '' },
    { y: '1996', t: 'Об’єднання кафедр', d: '' },
    { y: '2006', t: 'Завідувач: Ю. В. Бойко', d: '' },
    { y: '2009', t: 'Напрям «Комп’ютерна інженерія»', d: '' },
    { y: '2010', t: 'Кафедра комп’ютерної інженерії', d: '' },
    { y: '2012', t: 'Завідувач: С. Д. Погорілий', d: '' },
    { y: '2017', t: 'Меморандум з IBM Ukraine', d: '' },
    { y: '2021', t: 'Завідувач: Ю. В. Бойко', d: '' }
  ],
  en: [
    { y: '1991', t: 'Automation of Scientific Research', d: '' },
    { y: '1996', t: 'Departments merged', d: '' },
    { y: '2006', t: 'Head: Yu. V. Boiko', d: '' },
    { y: '2009', t: 'Computer Engineering programme', d: '' },
    { y: '2010', t: 'Department of Computer Engineering', d: '' },
    { y: '2012', t: 'Head: S. D. Pohorilyi', d: '' },
    { y: '2017', t: 'Memorandum with IBM Ukraine', d: '' },
    { y: '2021', t: 'Head: Yu. V. Boiko', d: '' }
  ],
};

export const PARTNERS = ['Huawei ICT Academy', 'Cisco Networking Academy', 'Microsoft', 'IBM Ukraine', 'Fortinet Academy', 'Intel', 'MIPS Technologies'];

// Де працюють випускники — лише те, що названо на сторінці «Наші випускники» (src/content/pages/*/graduates.md).
// Новий випускник = ще один запис; без людини (лише company) — просто знак компанії. Понад три — стрічка з гортанням.
// photo — ключ у PHOTOS компонента AlumniStrip; say — репліка КІ-Рекса при наведенні.
export interface Alum { company: string; who?: string; role?: string; anchor?: string; photo?: string; say?: string }
export const ALUMNI: Record<Lang, Alum[]> = {
  uk: [
    { company: 'Intel', who: 'Дмитро Калита', role: 'директор представництва в Україні, 2014–2017', anchor: 'дмитро-калита', photo: 'd_kalita', say: 'Intel inside' },
    { company: 'One AI Inc.', who: 'Артем Крамов', role: 'інженер-дослідник NLP, Тель-Авів', anchor: 'крамов-артем-андрійович', photo: 'a_kramov', say: 'Per aspera ad astra' },
    { company: 'Lyft', who: 'Максим Слинько', role: 'менеджер програмних проєктів', anchor: 'максим-слинько', photo: 'm_slynko', say: 'Дискретна математика в ділі' },
  ],
  en: [
    { company: 'Intel', who: 'Dmytro Kalyta', role: 'Director of the office in Ukraine, 2014–2017', anchor: 'dmytro-kalyta', photo: 'd_kalita', say: 'Intel inside' },
    { company: 'One AI Inc.', who: 'Artem Kramov', role: 'NLP research engineer, Tel Aviv', anchor: 'artem-andriiovych-kramov', photo: 'a_kramov', say: 'Per aspera ad astra' },
    { company: 'Lyft', who: 'Maksym Slynko', role: 'Software project manager', anchor: 'maksym-slynko', photo: 'm_slynko', say: 'Discrete maths at work' },
  ],
};

// Два профілі підготовки над спільною шкалою рівнів: апаратні платформи — нижня половина, програмні — верхня
export const STACK: Record<Lang, string[]> = {
  uk: ['Транзистор', 'Логіка', 'Процесор', 'Вбудовані', 'ОС', 'Мережі', 'Хмари', 'ШІ'],
  en: ['Transistor', 'Logic', 'Processor', 'Embedded', 'OS', 'Networks', 'Cloud', 'AI'],
};
export const PROFILE_TAGS: Record<Lang, { hw: string[]; sw: string[] }> = {
  uk: {
    hw: ['Цифрова схемотехніка', 'ПЛІС · VHDL', 'Архітектура комп’ютерів', 'Вбудовані системи', 'Цифрова обробка сигналів'],
    sw: ['Системне програмування', 'Операційні системи', 'Комп’ютерні мережі', 'Хмарні платформи', 'Машинне навчання'],
  },
  en: {
    hw: ['Digital circuits', 'FPGA · VHDL', 'Computer architecture', 'Embedded systems', 'Digital signal processing'],
    sw: ['Systems programming', 'Operating systems', 'Computer networks', 'Cloud platforms', 'Machine learning'],
  },
};

// Лабораторії: фото з тексту «Про кафедру» (ключ — у LAB_IMG головної) з тими самими підписами; назви й тексти — COPY.labs_items, той самий порядок
export const LAB_PHOTOS = [
  { img: '01', uk: 'Робочі місця та обладнання виробництва компанії HUAWEI', en: 'Workstations and equipment manufactured by HUAWEI' },
  { img: '03', uk: 'Проведення лабораторних робіт доцентом О. В. Барабановим в лабораторії цифрового зв’язку', en: 'Laboratory classes conducted by Associate Professor O. V. Barabanov in the Digital Communications Laboratory' },
  { img: 'ibm-1', uk: 'Сервер IBM Power 550, що використовується в навчальному процесі', en: 'IBM Power 550 server used in the educational process' },
  { img: '05', uk: 'Експериментальний стенд та збільшене зображення плати ALTERA DE1', en: 'Experimental test bench and an enlarged image of the ALTERA DE1 board' },
] as const;

/** Тексти головної. Писала панель із трьох моделей наосліп, фінал — за більшістю (див. опис PR). */
export const COPY = {
  uk: {
    meta_description: 'Кафедра комп’ютерної інженерії КНУ імені Тараса Шевченка: бакалаврат, магістратура й аспірантура F7. Апаратні й програмні платформи, лабораторії Huawei, Cisco, IBM.',
    hero_lead: 'Електроніка й комп’ютерні науки в одній програмі.',
    hero_cta_primary: 'Вступникам',
    hero_cta_secondary: 'Роботодавцям',
    alumni_eyebrow: 'Де працюють наші випускники',
    alumni_link: 'Історії випускників',
    profiles_title: 'Два профілі підготовки',
    profiles_lead: 'Від схеми на платі до сервісу в мережі: обидві половини комп’ютера.',
    profile_hw_title: 'Апаратні платформи',
    profile_hw_text: 'Цифрові схеми, процесори, ПЛІС і вбудовані системи.',
    profile_sw_title: 'Програмні платформи',
    profile_sw_text: 'Системне програмування, операційні системи, мережі й хмари.',
    labs_title: 'Лабораторії й партнери',
    labs_items: [
      { name: 'Клас Huawei', text: 'Комутація й маршрутизація на обладнанні для великих підприємств.' },
      { name: 'Сервер IBM Power 550', text: 'Unix AIX у навчанні, з 2017 року за меморандумом з IBM Ukraine.' },
      { name: 'Плати Altera DE1', text: 'Цифрова логіка й архітектура комп’ютерів на ПЛІС.' },
      { name: 'Мікропроцесорна лабораторія', text: 'Обладнання MIPS Technologies, з якою кафедра має наукові контакти.' },
    ],
    programs_title: 'Програми',
    programs_note: 'Спеціальність F7 «Комп’ютерна інженерія».',
    employers_title: 'Роботодавцям',
    employers_text: 'Випускники пишуть код і проєктують залізо, будують мережі й пояснюють технічні рішення людям.',
    employers_skills: ['C++ · Python · C#', '.NET · Django', 'Cisco · Huawei · Fortinet', 'AWS · Azure · GCP', 'TensorFlow · PyTorch', 'ПЛІС · VHDL · SystemVerilog', 'Кібербезпека', 'Agile · Scrum'],
    employers_cta: 'Написати кафедрі',
    history_title: 'Історія',
    history_lead: 'З 1991 року: від автоматизації фізичного експерименту до кафедри комп’ютерної інженерії.',
    about_toggle: 'Повний опис кафедри',
    band_eyebrow: 'Вступ 2027',
    band_title: 'Вивчайте комп’ютерну інженерію в КНУ',
    band_cta: 'Про вступ',
  },
  en: {
    meta_description: 'Department of Computer Engineering, Taras Shevchenko National University of Kyiv: Bachelor’s, Master’s and PhD in F7. Hardware and software platforms, Huawei, Cisco and IBM labs.',
    hero_lead: 'Electronics and computer science in one programme.',
    hero_cta_primary: 'Admission',
    hero_cta_secondary: 'Employers',
    alumni_eyebrow: 'Where our alumni work',
    alumni_link: 'Alumni stories',
    profiles_title: 'Two profiles',
    profiles_lead: 'From the circuit board to the networked service: both halves of a computer.',
    profile_hw_title: 'Hardware platforms',
    profile_hw_text: 'Digital circuits, processors, FPGAs and embedded systems.',
    profile_sw_title: 'Software platforms',
    profile_sw_text: 'Systems programming, operating systems, networks and cloud.',
    labs_title: 'Labs and partners',
    labs_items: [
      { name: 'Huawei classroom', text: 'Enterprise switching and routing equipment for labs and research.' },
      { name: 'IBM Power 550 server', text: 'Unix AIX in teaching, under a 2017 memorandum with IBM Ukraine.' },
      { name: 'Altera DE1 boards', text: 'Digital logic and computer architecture on FPGAs.' },
      { name: 'Microprocessor lab', text: 'Equipment from MIPS Technologies, a research contact of the department.' },
    ],
    programs_title: 'Programmes',
    programs_note: 'Speciality F7 Computer Engineering.',
    employers_title: 'For employers',
    employers_text: 'Our graduates write code and design hardware, build networks and explain technical decisions to people.',
    employers_skills: ['C++ · Python · C#', '.NET · Django', 'Cisco · Huawei · Fortinet', 'AWS · Azure · GCP', 'TensorFlow · PyTorch', 'FPGA · VHDL · SystemVerilog', 'Cybersecurity', 'Agile · Scrum'],
    employers_cta: 'Write to us',
    history_title: 'History',
    history_lead: 'Since 1991: from automating physics experiments to a Department of Computer Engineering.',
    about_toggle: 'Full description',
    band_eyebrow: 'Admission 2027',
    band_title: 'Study Computer Engineering at KNU',
    band_cta: 'Admissions',
  },
} as const;
