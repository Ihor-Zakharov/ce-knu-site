// Сторінка «Роботодавцям»: перший екран — хто ми, чому нам вірити, що вміють випускники, як написати; повний старий текст — під спойлером.
// Слоти — як у брифі копірайтерів (employers), щоб вибрані голосуванням рядки лягли без змін коду.
// Факти: src/content/pages/*/research.md (премія 2018, перший кластер, грід), graduates.md, index.md.
import type { Lang } from './i18n';

export const MAIL = 'ce.frecs@knu.ua';

/** Підписи над цифрами доказів (мікрокопія інтерфейсу) — у тому самому порядку, що й COPY.proof */
export const PROOF_KICKER: Record<Lang, string[]> = {
  uk: ['Інфраструктура', 'Наука', 'Академії', 'Випускники'],
  en: ['Infrastructure', 'Science', 'Academies', 'Alumni'],
};

/** Тексти: три моделі писали наосліп, ті самі три голосували (більшість; кнопка контакту — дія, а не адреса). */
export const COPY = {
  uk: {
    meta_description: 'Випускники кафедри комп’ютерної інженерії КНУ знають Verilog, FPGA, Embedded C, Python, ML і мережі. Пропозиції щодо навчання: ce.frecs@knu.ua.',
    eyebrow: 'Роботодавцям',
    h1: 'Інженери, які пишуть на Verilog і Python',
    lead: 'Схеми, код і мережі в одній програмі КНУ. Підкажіть кафедрі, чого вчити студентів далі.',
    cta_mail: 'Написати кафедрі',
    cta_skills: 'Навички випускників',
    proof: [
      { value: 'Перший в Україні', label: 'суперкомп’ютер для науки збудувала наша кафедра' },
      { value: '2 лауреати', label: 'Державної премії України в галузі науки і техніки' },
      { value: '4 академії', label: 'Huawei ICT, Cisco, Microsoft і Fortinet' },
      { value: 'Intel, Lyft', label: 'і One AI: де працювали наші випускники' },
    ],
    skills_title: 'Що вміють наші випускники',
    skills_note: 'І вміють пояснити технічне рішення науковцю, інженеру й нефахівцю.',
    ways_title: 'Як працювати з кафедрою',
    ways: [
      { title: 'Впливайте на програму', text: 'Питання, пропозиції й рекомендації щодо навчання надсилайте на ce.frecs@knu.ua.' },
      { title: 'Наймайте випускників', text: 'Вони працюють розробниками й QA-інженерами, у вбудованих системах, HPC і мережах.' },
      { title: 'Підпишіть меморандум', text: 'Як IBM Україна 2017 року. У нашій лабораторії працює сервер IBM Power 550 з AIX.' },
    ],
    spoiler_letter: 'Повний лист кафедри до роботодавців',
    band_title: 'Опишіть інженера, якого вам бракує',
    band_cta: 'Написати кафедрі',
  },
  en: {
    meta_description: 'Graduates of KNU’s Department of Computer Engineering know Verilog, FPGA, Embedded C, Python, ML and networking. Write to us at ce.frecs@knu.ua.',
    eyebrow: 'For employers',
    h1: 'Engineers who write both Verilog and Python',
    lead: 'Circuits, code and networks in one KNU programme. Tell us what students should learn next.',
    cta_mail: 'Email the department',
    cta_skills: 'See graduate skills',
    proof: [
      { value: 'Ukraine’s first', label: 'supercomputer for science was built here' },
      { value: '2 laureates', label: 'of Ukraine’s State Prize in Science and Technology' },
      { value: '4 academies', label: 'Huawei ICT, Cisco, Microsoft and Fortinet' },
      { value: 'Intel, Lyft', label: 'and One AI: where our graduates have worked' },
    ],
    skills_title: 'What our graduates can do',
    skills_note: 'And they can explain technical decisions to scientists, engineers and non-specialists.',
    ways_title: 'How to work with us',
    ways: [
      { title: 'Shape the curriculum', text: 'Send questions, proposals and recommendations on the curriculum to ce.frecs@knu.ua.' },
      { title: 'Hire our graduates', text: 'They work as software and QA engineers, and in embedded systems, HPC and networking.' },
      { title: 'Sign a memorandum', text: 'As IBM Ukraine did in 2017. Our lab runs an IBM Power 550 on AIX.' },
    ],
    spoiler_letter: 'The department’s full letter to employers',
    band_title: 'Describe the engineer you can’t find',
    band_cta: 'Write to us',
  },
} as const;
