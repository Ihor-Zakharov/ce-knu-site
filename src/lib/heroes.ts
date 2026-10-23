// Герої розділів: прилад, аксесуар КІ-Рекса, короткий підзаголовок і репліки маскота.
// Підзаголовки — нова мікрокопія інтерфейсу; основний вміст сторінок лишається в src/content.
import type { Lang } from './i18n';

type L2 = Record<Lang, string>;
export interface Hero {
  ch: string;            // «канал» у шапці героя
  inst: string;          // прилад (див. scripts/instruments.js)
  acc: string;           // аксесуар КІ-Рекса (див. scripts/rex.js)
  lead: L2;
  hud: { top: [string, string]; bot: [string, string] };
  lines: Record<Lang, string[]>;
}

export const HEROES: Record<string, Hero> = {
  news: {
    ch: 'CH 01 · NEWS', inst: 'ticker', acc: 'magnifier',
    lead: { uk: 'Події кафедри: конкурси, відкриті лекції, захисти, нові академії та підручники.', en: 'Department life: competitions, open lectures, defences, new academies and textbooks.' },
    hud: { top: ['LED 9 × N', 'SCROLL 14 col/s'], bot: ['DAILY BYTE', 'RX ●'] },
    lines: { uk: ['Свіжий байт новин!', 'Розслідую нові події…', 'Елементарно, колего'], en: ['A fresh byte of news!', 'Investigating new events…', 'Elementary, colleague'] },
  },
  research: {
    ch: 'CH 02 · RSRC', inst: 'field', acc: 'tube',
    lead: { uk: 'Розподілені й хмарні системи, мережі, штучний інтелект і обробка сигналів — від гіпотези до експерименту.', en: 'Distributed and cloud systems, networks, artificial intelligence and signal processing — from hypothesis to experiment.' },
    hud: { top: ['Δ = <b data-hud="d">0 λ</b>', 'λ = 7,5 CELLS'], bot: ['2 SOURCES · COHERENT', 'MOVE CURSOR'] },
    lines: { uk: ['Інтерференція — краса!', 'Ведіть курсором — зміниться картина', 'Гіпотезу підтверджено'], en: ['Interference is beautiful!', 'Move the cursor to change the pattern', 'Hypothesis confirmed'] },
  },
  'medu-guide': {
    ch: 'CH 03 · EDU', inst: 'fourier', acc: 'book',
    lead: { uk: 'Підручники, посібники й методичні вказівки, написані викладачами кафедри.', en: 'Textbooks, study guides and laboratory manuals written by the department’s staff.' },
    hud: { top: ['N = <b data-hud="n">1</b>', 'k = <b data-hud="k">1</b>'], bot: ['FOURIER SERIES', 'SQUARE WAVE'] },
    lines: { uk: ['Ще одна гармоніка — і буде меандр', 'Конспект готовий!', 'Читаю методичку'], en: ['One more harmonic and it’s a square wave', 'Notes are ready!', 'Reading the lab manual'] },
  },
  entrant: {
    ch: 'CH 04 · ADM', inst: 'spectrum', acc: 'backpack',
    lead: { uk: 'Спеціальність F7 «Комп’ютерна інженерія»: що вивчають, як вступити й ким працюють випускники.', en: 'Speciality F7 “Computer Engineering”: what you study, how to apply and where graduates work.' },
    hud: { top: ['RBW 30 kHz', 'SPAN 5 GHz'], bot: ['F7 · BACHELOR · MASTER · PHD', 'PEAK HOLD'] },
    lines: { uk: ['LET’S CODE!', 'Рюкзак зібрано!', 'До зустрічі на першому курсі'], en: ['LET’S CODE!', 'Backpack packed!', 'See you in the first year'] },
  },
  documents: {
    ch: 'CH 05 · DOCS', inst: 'tape', acc: 'glasses',
    lead: { uk: 'Положення, накази й концепції університету, що регулюють навчання на кафедрі.', en: 'University regulations, orders and concepts that govern studies at the department.' },
    hud: { top: ['READ <b data-hud="byte">0x00</b>', '<b data-hud="bin">00000000</b>'], bot: ['8-TRACK PAPER TAPE', 'UTF-8'] },
    lines: { uk: ['Усе за положенням', 'Читаю дрібний шрифт', 'Біт за бітом'], en: ['Everything by the regulations', 'Reading the fine print', 'Bit by bit'] },
  },
  graduates: {
    ch: 'CH 06 · ALUM', inst: 'array', acc: 'cap',
    lead: { uk: 'Випускники кафедри очолюють представництва світових компаній і будують ІТ-інфраструктуру країни.', en: 'Our alumni lead offices of global companies and build the country’s IT infrastructure.' },
    hud: { top: ['θ = <b data-hud="theta">0°</b>', 'N = 8 · d = λ/2'], bot: ['PHASED ARRAY', 'BEAM STEERING'] },
    lines: { uk: ['Випуск — це лише початок!', 'Промінь — у будь-який куточок світу', 'Шапочку — вгору!'], en: ['Graduation is just the beginning!', 'A beam to any corner of the world', 'Caps up!'] },
  },
  personas: {
    ch: 'CH 07 · STAFF', inst: 'liss', acc: 'pointer',
    lead: { uk: 'Професори, доценти, асистенти й інженери кафедри — усі в одному списку, за посадами.', en: 'Professors, associate and assistant professors and engineers — everyone in one list, by position.' },
    hud: { top: ['X:Y = <b data-hud="ratio">1:2</b>', 'φ → DRIFT'], bot: ['LISSAJOUS', 'X-Y MODE'] },
    lines: { uk: ['Готуюся до лекції', 'Знайдіть викладача за літерою', 'Кожен — своя частота'], en: ['Getting ready for a lecture', 'Find a teacher by letter', 'Everyone has their own frequency'] },
  },
  stateholders: {
    ch: 'CH 08 · EMPL', inst: 'smith', acc: 'tie',
    lead: { uk: 'Співпраця з роботодавцями: практики, спільні лабораторії, авторизовані академії й рада роботодавців.', en: 'Working with employers: internships, joint laboratories, authorised academies and the employers’ council.' },
    hud: { top: ['|Γ| = <b data-hud="g">0</b>', 'VSWR <b data-hud="vswr">1</b>'], bot: ['SMITH CHART', 'Z → 50 Ω MATCHED'] },
    lines: { uk: ['Узгоджуємо імпеданс з бізнесом', 'КСХ = 1, ідеальне узгодження', 'Чекаємо на співпрацю'], en: ['Matching impedance with industry', 'VSWR = 1, a perfect match', 'Looking forward to working together'] },
  },
  studying: {
    ch: 'CH 09 · STUD', inst: 'tess', acc: 'laptop',
    lead: { uk: 'Навчальні плани, програми дисциплін, розклад і графік сесії.', en: 'Curricula, course syllabi, the timetable and the examination schedule.' },
    hud: { top: ['4D · ROT XW', 'W-PERSPECTIVE'], bot: ['TESSERACT', 'MOVE CURSOR'] },
    lines: { uk: ['Компілюю розклад…', 'Вчимося в чотирьох вимірах', 'Ще одна лабораторна!'], en: ['Compiling the timetable…', 'Learning in four dimensions', 'One more lab!'] },
  },
};
