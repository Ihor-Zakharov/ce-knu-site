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
    { y: '2006', t: 'Завідувач — Ю. В. Бойко', d: '' },
    { y: '2009', t: 'Напрям «Комп’ютерна інженерія»', d: '' },
    { y: '2010', t: 'Кафедра комп’ютерної інженерії', d: '' },
    { y: '2012', t: 'Завідувач — С. Д. Погорілий', d: '' },
    { y: '2017', t: 'Меморандум з IBM Ukraine', d: '' },
    { y: '2021', t: 'Завідувач — Ю. В. Бойко', d: '' }
  ],
  en: [
    { y: '1991', t: 'Automation of Scientific Research', d: '' },
    { y: '1996', t: 'Departments merged', d: '' },
    { y: '2006', t: 'Head — Yu. V. Boiko', d: '' },
    { y: '2009', t: 'Computer Engineering programme', d: '' },
    { y: '2010', t: 'Department of Computer Engineering', d: '' },
    { y: '2012', t: 'Head — S. D. Pohorilyi', d: '' },
    { y: '2017', t: 'Memorandum with IBM Ukraine', d: '' },
    { y: '2021', t: 'Head — Yu. V. Boiko', d: '' }
  ],
};

export const PARTNERS = ['Huawei ICT Academy', 'Cisco Networking Academy', 'Microsoft', 'IBM Ukraine', 'Fortinet Academy', 'Intel', 'MIPS Technologies'];

// Компанії випускників — лише ті, що названо на сторінці «Наші випускники» (src/content/pages/*/graduates.md)
export const ALUMNI: Record<Lang, { company: string; who: string; role: string; anchor: string; photo: string }[]> = {
  uk: [
    { company: 'Intel', who: 'Дмитро Калита', role: 'директор представництва в Україні, 2014–2017', anchor: 'дмитро-калита', photo: 'd_kalita' },
    { company: 'One AI Inc.', who: 'Артем Крамов', role: 'інженер-дослідник NLP, Тель-Авів', anchor: 'крамов-артем-андрійович', photo: 'a_kramov' },
    { company: 'Lyft', who: 'Максим Слинько', role: 'менеджер програмних проєктів', anchor: 'максим-слинько', photo: 'm_slynko' },
  ],
  en: [
    { company: 'Intel', who: 'Dmytro Kalyta', role: 'Director of the office in Ukraine, 2014–2017', anchor: 'dmytro-kalyta', photo: 'd_kalita' },
    { company: 'One AI Inc.', who: 'Artem Kramov', role: 'NLP research engineer, Tel Aviv', anchor: 'artem-andriiovych-kramov', photo: 'a_kramov' },
    { company: 'Lyft', who: 'Maksym Slynko', role: 'Software project manager', anchor: 'maksym-slynko', photo: 'm_slynko' },
  ],
};
