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
export interface Lab { brand: string; name: string; text: string; spec: string[]; img: string; alt: string }
export const LABS: Record<Lang, Lab[]> = {
  uk: [
    { brand: 'HUAWEI', name: 'Мережева лабораторія Huawei', text: 'Комутація й маршрутизація на обладнанні Huawei для мереж великих підприємств: лабораторні практикуми й дослідження.', spec: ['Huawei ICT Academy', 'Комутація', 'Маршрутизація'], img: '01', alt: 'Робочі місця та обладнання виробництва компанії HUAWEI' },
    { brand: 'CISCO · MICROSOFT · FORTINET', name: 'Академії вендорів', text: 'На кафедрі працюють Cisco Networking Academy, академії Microsoft і Fortinet.', spec: ['Мережі', 'Кібербезпека', 'Програмні платформи'], img: '03', alt: 'Проведення лабораторних робіт доцентом О. В. Барабановим в лабораторії цифрового зв’язку' },
    { brand: 'IBM POWER 550', name: 'Сервер IBM Power 550', text: 'Unix AIX у навчанні. Сервер передано кафедрі за меморандумом з IBM Ukraine 2017 року.', spec: ['IBM Power', 'Unix AIX', 'з 2017'], img: 'ibm-1', alt: 'Сервер IBM Power 550, що використовується в навчальному процесі' },
    { brand: 'ALTERA DE1 · MIPS', name: 'ПЛІС і мікропроцесори', text: 'Плати Altera DE1 для цифрової логіки й архітектури комп’ютерів, обладнання MIPS Technologies у лабораторії цифрового зв’язку.', spec: ['ПЛІС', 'Цифрова логіка', 'Архітектура'], img: '05', alt: 'Експериментальний стенд та збільшене зображення плати ALTERA DE1' },
    { brand: 'RELAB', name: 'ReLab', text: 'Вільна лабораторія робототехніки й мікроелектроніки факультету з 2017 року: паяльні станції, осцилограф, 3D-принтер, мікроконтролери й датчики. Старші студенти навчають молодших.', spec: ['Робототехніка', 'IoT', '3D-друк'], img: 'relab', alt: 'Резидент ReLab паяє плату' },
  ],
  en: [
    { brand: 'HUAWEI', name: 'Huawei networking lab', text: 'Switching and routing on Huawei enterprise equipment, used for lab classes and research.', spec: ['Huawei ICT Academy', 'Switching', 'Routing'], img: '01', alt: 'Workstations and equipment manufactured by HUAWEI' },
    { brand: 'CISCO · MICROSOFT · FORTINET', name: 'Vendor academies', text: 'Cisco Networking Academy, Microsoft and Fortinet academies run at the department.', spec: ['Networks', 'Cybersecurity', 'Software platforms'], img: '03', alt: 'Laboratory classes conducted by Associate Professor O. V. Barabanov in the Digital Communications Laboratory' },
    { brand: 'IBM POWER 550', name: 'IBM Power 550 server', text: 'Unix AIX in teaching. The server came to the department under a 2017 memorandum with IBM Ukraine.', spec: ['IBM Power', 'Unix AIX', 'since 2017'], img: 'ibm-1', alt: 'IBM Power 550 server used in the educational process' },
    { brand: 'ALTERA DE1 · MIPS', name: 'FPGAs and microprocessors', text: 'Altera DE1 boards for digital logic and computer architecture, MIPS Technologies equipment in the digital communications lab.', spec: ['FPGA', 'Digital logic', 'Architecture'], img: '05', alt: 'Experimental test bench and an enlarged image of the ALTERA DE1 board' },
    { brand: 'RELAB', name: 'ReLab', text: 'The faculty’s open robotics and microelectronics lab since 2017: soldering stations, an oscilloscope, a 3D printer, microcontrollers and sensors. Senior students teach the juniors.', spec: ['Robotics', 'IoT', '3D printing'], img: 'relab', alt: 'A ReLab resident soldering a board' },
  ],
};

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
    programs_title: 'Програми',
    programs_note: 'Спеціальність F7 «Комп’ютерна інженерія»',
    employers_title: 'Інженер, який бачить систему цілком',
    employers_text: 'Від Verilog до PyTorch: ваші вимоги з однієї вакансії вивчають в одній програмі.',
    employers_cta: 'Написати кафедрі',
    employers_pick: 'Що вміють випускники',
    employers_ok: 'Усьому цьому вчать на кафедрі',
    employers_mail: 'Співпраця з кафедрою',
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
    programs_title: 'Programmes',
    programs_note: 'Speciality F7 Computer Engineering',
    employers_title: 'Engineers who see the whole system',
    employers_text: 'Verilog or PyTorch, networks or embedded C: the skills in your job post are taught in one programme.',
    employers_cta: 'Write to the department',
    employers_pick: 'What our graduates know',
    employers_ok: 'The department teaches all of it',
    employers_mail: 'Working with the department',
    history_title: 'History',
    history_lead: 'Since 1991: from automating physics experiments to a Department of Computer Engineering.',
    about_toggle: 'Full description',
    band_eyebrow: 'Admission 2027',
    band_title: 'Study Computer Engineering at KNU',
    band_cta: 'Admissions',
  },
} as const;
