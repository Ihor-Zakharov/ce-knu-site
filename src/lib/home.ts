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
    { y: '2006', t: 'Завідувач: Ю.\u00a0В.\u00a0Бойко', d: '' },
    { y: '2009', t: 'Напрям «Комп’ютерна інженерія»', d: '' },
    { y: '2010', t: 'Кафедра комп’ютерної інженерії', d: '' },
    { y: '2012', t: 'Завідувач: С.\u00a0Д.\u00a0Погорілий', d: '' },
    { y: '2017', t: 'Меморандум з IBM Ukraine', d: '' },
    { y: '2021', t: 'Знову завідувач: Ю.\u00a0В.\u00a0Бойко', d: '' }
  ],
  en: [
    { y: '1991', t: 'Automation of Scientific Research', d: '' },
    { y: '1996', t: 'Departments merged', d: '' },
    { y: '2006', t: 'Head: Yu.\u00a0V.\u00a0Boiko', d: '' },
    { y: '2009', t: 'Computer Engineering programme', d: '' },
    { y: '2010', t: 'Department of Computer Engineering', d: '' },
    { y: '2012', t: 'Head: S.\u00a0D.\u00a0Pohorilyi', d: '' },
    { y: '2017', t: 'Memorandum with IBM Ukraine', d: '' },
    { y: '2021', t: 'Head again: Yu.\u00a0V.\u00a0Boiko', d: '' }
  ],
};


// Де працюють випускники — лише те, що названо на сторінці «Наші випускники» (src/content/pages/*/graduates.md).
// Новий випускник = ще один запис; без людини (лише company) — просто знак компанії. Понад три — стрічка з гортанням.
// photo — ключ у PHOTOS компонента AlumniStrip; say — репліка КІ-Рекса при наведенні.
export interface Alum { company: string; who?: string; role?: string; anchor?: string; photo?: string; say?: string; tag?: string }
export const ALUMNI: Record<Lang, Alum[]> = {
  uk: [
    { company: 'Intel', who: 'Дмитро Калита', role: 'Директор офісу Intel в Україні, 2014–2017', anchor: 'дмитро-калита', photo: 'd_kalita', say: 'Я старший за x86.', tag: '⚡ Апаратні платформи' },
    { company: 'One AI Inc.', who: 'Артем Крамов', role: 'Інженер-дослідник з NLP, One AI, Тель-Авів', anchor: 'крамов-артем-андрійович', photo: 'a_kramov', say: 'Моя мова теж природна.', tag: '🧠 ШІ & Обробка мови' },
    { company: 'Lyft', who: 'Максим Слинько', role: 'Керівник проєктів розробки ПЗ, Lyft', anchor: 'максим-слинько', photo: 'm_slynko', say: 'Lyft не викликаю, я ходжу.', tag: '☁️ Хмарні системи & High-load' },
  ],
  en: [
    { company: 'Intel', who: 'Dmytro Kalyta', role: 'Director of Intel’s Ukraine office, 2014–2017', anchor: 'dmytro-kalyta', photo: 'd_kalita', say: 'I predate x86.', tag: '⚡ Hardware Platforms' },
    { company: 'One AI Inc.', who: 'Artem Kramov', role: 'NLP research engineer, One AI, Tel Aviv', anchor: 'artem-andriiovych-kramov', photo: 'a_kramov', say: 'Roar is natural language.', tag: '🧠 AI & Natural Language' },
    { company: 'Lyft', who: 'Maksym Slynko', role: 'Software project manager, Lyft', anchor: 'maksym-slynko', photo: 'm_slynko', say: 'No Lyft for me. I walk.', tag: '☁️ Cloud Infrastructure' },
  ],
};

// Два профілі підготовки над спільною шкалою рівнів: апаратні платформи — нижня половина, програмні — верхня
export const STACK: Record<Lang, string[]> = {
  uk: ['Транзистор', 'Логіка', 'Процесор', 'Вбудовані', 'ОС', 'Мережі', 'Хмари', 'ШІ'],
  en: ['Transistor', 'Logic', 'Processor', 'Embedded', 'OS', 'Networks', 'Cloud', 'AI'],
};

// Роботодавцям: що вміють випускники — навички, як їх пишуть у вакансіях, від мов опису апаратури до ML.
export const SKILLS: Record<Lang, { g: string; items: string[] }[]> = {
  uk: [
    { g: 'Залізо', items: ['Verilog', 'SystemVerilog', 'VHDL', 'ПЛІС', 'Embedded C', 'Мікроконтролери'] },
    { g: 'Код', items: ['C', 'C++', 'Python', 'C# / .NET', 'Linux', 'SQL'] },
    { g: 'ШІ та дані', items: ['Машинне навчання', 'PyTorch', 'TensorFlow', 'NLP', 'Комп’ютерний зір', 'Аналіз даних'] },
    { g: 'Сигнали й мережі', items: ['ЦОС', 'Відеостримінг', 'Cisco · Huawei', 'Кібербезпека', 'AWS · Azure', 'IoT'] },
  ],
  en: [
    { g: 'Hardware', items: ['Verilog', 'SystemVerilog', 'VHDL', 'FPGA', 'Embedded C', 'Microcontrollers'] },
    { g: 'Code', items: ['C', 'C++', 'Python', 'C# / .NET', 'Linux', 'SQL'] },
    { g: 'AI and data', items: ['Machine learning', 'PyTorch', 'TensorFlow', 'NLP', 'Computer vision', 'Data analysis'] },
    { g: 'Signals and networks', items: ['DSP', 'Video streaming', 'Cisco · Huawei', 'Cybersecurity', 'AWS · Azure', 'IoT'] },
  ],
};

// Лабораторії — «стійка»: кожна лабораторія — блок обладнання (бренд на панелі, індикатори), вибраний висувається й показує фото й опис.
// img — ключ у LAB_IMG головної (фото з тексту «Про кафедру» з тими самими підписами); без фото — ілюстрація КІ-Рекса.
// ReLab: DOU, «Relab — вільна лабораторія робототехніки та мікроелектроніки в КНУ» (03.04.2018; статтю передруковано на rex.knu.ua);
// фото studying/relab.jpg — кадр «Резиденти лабораторії» з тієї ж статті.
export interface Lab { brand: string; name: string; text: string; spec: string[]; img: string; alt: string; pos?: string }   // pos — object-position кадру
export const LABS: Record<Lang, Lab[]> = {
  uk: [
    { brand: 'HUAWEI', name: 'Мережева лабораторія Huawei', text: 'Корпоративні комутатори й маршрутизатори для практикумів і досліджень.', spec: ['Huawei ICT Academy', 'Комутація', 'Маршрутизація'], img: '01', alt: 'Робочі місця та обладнання виробництва компанії HUAWEI' },
    { brand: 'АКАДЕМІЇ', name: 'Cisco, Microsoft, Fortinet', text: 'Партнерські академії: мережі, платформи Microsoft, кібербезпека.', spec: ['Мережі', 'Кібербезпека', 'Програмні платформи'], img: '03', alt: 'Проведення лабораторних робіт доцентом О. В. Барабановим в лабораторії цифрового зв’язку' },
    { brand: 'IBM POWER 550', name: 'Сервер IBM Power 550', text: 'Unix AIX. Передано кафедрі 2017 року за меморандумом з IBM Україна.', spec: ['IBM Power', 'Unix AIX', 'з 2017'], img: 'ibm-1', alt: 'Сервер IBM Power 550, що використовується в навчальному процесі', pos: '86% 50%' },
    { brand: 'ALTERA DE1 · MIPS', name: 'ПЛІС і мікропроцесори', text: 'Altera DE1: цифрова логіка й архітектура. MIPS: цифровий зв’язок.', spec: ['ПЛІС', 'Цифрова логіка', 'Архітектура'], img: '05', alt: 'Експериментальний стенд та збільшене зображення плати ALTERA DE1' },
    { brand: 'RELAB', name: 'ReLab', text: 'Вільна лабораторія робототехніки факультету з 2017 року: паяльники, осцилограф, 3D-принтер.', spec: ['Робототехніка', 'IoT', '3D-друк'], img: 'relab', alt: 'Резидент ReLab паяє плату' },
  ],
  en: [
    { brand: 'HUAWEI', name: 'Huawei network lab', text: 'Enterprise switches and routers for practical classes and research.', spec: ['Huawei ICT Academy', 'Switching', 'Routing'], img: '01', alt: 'Workstations and equipment manufactured by HUAWEI' },
    { brand: 'ACADEMIES', name: 'Cisco, Microsoft, Fortinet', text: 'Partner academies for networking, Microsoft platforms and security.', spec: ['Networks', 'Cybersecurity', 'Software platforms'], img: '03', alt: 'Laboratory classes conducted by Associate Professor O. V. Barabanov in the Digital Communications Laboratory' },
    { brand: 'IBM POWER 550', name: 'IBM Power 550 server', text: 'Runs Unix AIX. Handed over under a 2017 memorandum with IBM Ukraine.', spec: ['IBM Power', 'Unix AIX', 'since 2017'], img: 'ibm-1', alt: 'IBM Power 550 server used in the educational process', pos: '86% 50%' },
    { brand: 'ALTERA DE1 · MIPS', name: 'FPGA and microprocessor lab', text: 'Altera DE1 for logic and architecture, MIPS for digital communications.', spec: ['FPGA', 'Digital logic', 'Architecture'], img: '05', alt: 'Experimental test bench and an enlarged image of the ALTERA DE1 board' },
    { brand: 'RELAB', name: 'ReLab', text: 'The faculty’s open robotics lab since 2017: soldering, an oscilloscope, a 3D printer.', spec: ['Robotics', 'IoT', '3D printing'], img: 'relab', alt: 'A ReLab resident soldering a board' },
  ],
};

/** Тексти головної: три моделі писали наосліп (Opus 5.5, Fable, Codex gpt-6-astra), ті самі три голосували за кожен рядок;
 *  більшість перемагає, нічиї й дрібні правки — редактор. Блок роботодавців — за рішенням арт-директорів. */
const ukSkills = (n: number) => `Усі ${n} ${n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'навички' : 'навичок'} викладають на кафедрі.`;
export const COPY = {
  uk: {
    meta_description: 'Комп’ютерна інженерія в КНУ імені Тараса Шевченка: апаратні системи, програмування й мережі. Випускники з досвідом в Intel, One AI та Lyft.',
    hero_lead: 'Інженери, які розуміють комп’ютер цілком: від транзистора до хмари.',
    hero_cta_primary: 'Вступ 2027',
    hero_cta_secondary: 'Роботодавцям',
    alumni_eyebrow: 'Ким стали наші випускники',
    alumni_link: 'Історії випускників',
    profiles_title: 'Що ви навчитеся будувати',
    profiles_lead: 'Комп’ютерна інженерія: електроніка плюс комп’ютерні науки. Одна програма, два профілі.',
    profile_hw_title: 'Апаратні платформи',
    profile_hw_text: 'Цифрові схеми, мікропроцесори, ПЛІС. Проєктуєте на VHDL і SystemVerilog, перевіряєте на платі.',
    profile_sw_title: 'Програмні платформи',
    profile_sw_text: 'Операційні системи, мережі, бази даних, хмарні платформи. Програмуєте на C++, Python і C#.',
    labs_title: 'Лабораторії та партнери',
    programs_title: 'Програми навчання',
    programs_note: 'Вказано максимальну кількість місць за ліцензією.',
    employers_title: 'Інженери для ваших команд',
    employers_ok: ukSkills,
    employers_plan: 'Навчальний план F7, PDF',
    employers_page: 'Сторінка для роботодавців',
    employers_cta: 'Написати кафедрі',
    employers_mail: 'Співпраця з кафедрою',
    history_title: 'Історія кафедри',
    history_lead: '1991: першими в Україні почали автоматизувати фізичні експерименти комп’ютерами й мережами.',
    about_toggle: 'Докладніше про кафедру',
    band_eyebrow: 'Вступ 2027',
    band_title: 'Технології змінюються. Принципи лишаються.',
    band_cta: 'Як вступити',
  },
  en: {
    meta_description: 'Computer Engineering at Taras Shevchenko National University of Kyiv. Hardware and software. Alumni careers at Intel, One AI and Lyft.',
    hero_lead: 'Engineers who understand the whole computer: transistor to cloud.',
    hero_cta_primary: 'Apply for 2027',
    hero_cta_secondary: 'For employers',
    alumni_eyebrow: 'Where our graduates went',
    alumni_link: 'Alumni stories',
    profiles_title: 'What you will learn to build',
    profiles_lead: 'Computer engineering is electronics plus computer science. One programme, two profiles.',
    profile_hw_title: 'Hardware platforms',
    profile_hw_text: 'Digital circuits, microprocessors, FPGAs. Design in VHDL and SystemVerilog, then test on a board.',
    profile_sw_title: 'Software platforms',
    profile_sw_text: 'Operating systems, networks, databases and cloud. You program in C++, Python and C#.',
    labs_title: 'Labs and partners',
    programs_title: 'Degree programmes',
    programs_note: 'Places shown are licensed intake limits.',
    employers_title: 'Engineers for your team',
    employers_ok: (n: number) => `All ${n} skills are taught at the department.`,
    employers_plan: 'F7 curriculum, PDF',
    employers_page: 'Employers page',
    employers_cta: 'Write to the department',
    employers_mail: 'Working with the department',
    history_title: 'Department history',
    history_lead: '1991: the first in Ukraine to start automating physics experiments with computers and networks.',
    about_toggle: 'About the department',
    band_eyebrow: '2027 admissions',
    band_title: 'Technology changes. Principles stay.',
    band_cta: 'How to apply',
  },
} as const;
