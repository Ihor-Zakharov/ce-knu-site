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
    { y: '1991', t: 'Автоматизація наукових досліджень', d: 'Спеціалізація на кафедрі радіоелектроніки — уперше в Україні комп’ютерні й мережеві технології для фізичного експерименту.' },
    { y: '1996', t: 'Кафедра напівпровідникової електроніки', d: 'Об’єднання з кафедрою фізики напівпровідників; завідувач — професор О. В. Третяк.' },
    { y: '2006', t: 'Завідувач — доцент Ю. В. Бойко', d: '' },
    { y: '2009', t: 'Напрям «Комп’ютерна інженерія»', d: 'На базі спеціалізації почалася підготовка комп’ютерних інженерів.' },
    { y: '2010', t: 'Кафедра комп’ютерної інженерії', d: 'Кафедра отримала сучасну назву.' },
    { y: '2012', t: 'Завідувач — професор С. Д. Погорілий', d: 'Доктор технічних наук.' },
    { y: '2017', t: 'Меморандум з IBM Ukraine', d: 'Кафедра отримала сервер IBM Power 550 з платформою AIX.' },
    { y: '2021', t: 'Завідувач — доцент Ю. В. Бойко', d: '' },
  ],
  en: [
    { y: '1991', t: 'Automation of Scientific Research', d: 'A specialisation at the Department of Radioelectronics — the first in Ukraine to bring computer and network technologies to physical experiments.' },
    { y: '1996', t: 'Department of Semiconductor Electronics', d: 'Merged with the Department of Semiconductor Physics; headed by Professor O. V. Tretiak.' },
    { y: '2006', t: 'Head — Associate Professor Yu. V. Boiko', d: '' },
    { y: '2009', t: 'Computer Engineering programme', d: 'Training of computer engineers began on the basis of the specialisation.' },
    { y: '2010', t: 'Department of Computer Engineering', d: 'The department received its current name.' },
    { y: '2012', t: 'Head — Professor S. D. Pohorilyi', d: 'D.Sc. in Engineering.' },
    { y: '2017', t: 'Memorandum with IBM Ukraine', d: 'The department received an IBM Power 550 server with the AIX platform.' },
    { y: '2021', t: 'Head — Associate Professor Yu. V. Boiko', d: '' },
  ],
};

export const PARTNERS = ['Huawei ICT Academy', 'Cisco Networking Academy', 'Microsoft', 'IBM Ukraine', 'Fortinet Academy', 'Intel', 'MIPS Technologies'];
