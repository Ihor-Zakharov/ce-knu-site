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
    ch: 'CH 01 · NEWS', inst: 'ticker', acc: 'postcap+bag+letter',
    lead: { uk: 'Відкриті лекції, конкурси та захисти дисертацій.', en: 'Open lectures, competitions and thesis defences.' },
    hud: { top: ['LED 5×7 · MSG <b data-hud="msg">1/2</b>', 'DAILY BYTE'], bot: ['KI-REX NEWS', 'RX ●'] },
    lines: { uk: ['Байт свіжих подій', 'Тримаю в полі зору', 'Є сигнал для новини'], en: ['A byte of news', 'Keeping news in focus', 'Picking up a news signal'] },
  },
  research: {
    ch: 'CH 02 · RSRC', inst: 'lorenz', acc: 'tube',
    lead: { uk: 'Високопродуктивні обчислення, цифровий зв’язок і штучний інтелект.', en: 'High-performance computing, digital communications and artificial intelligence.' },
    hud: { top: ['σ 10 · ρ 28 · β 8/3', 'z = <b data-hud="z">0</b>'], bot: ['LORENZ ATTRACTOR', 'MOVE CURSOR'] },
    lines: { uk: ['Хаос, але детермінований', 'Одне крило, потім друге', 'Звіряю з експериментом'], en: ['Chaos, but deterministic', 'One wing, then the other', 'Checking the experiment'] },
  },
  'medu-guide': {
    ch: 'CH 03 · EDU', inst: 'fourier', acc: 'book',
    lead: { uk: 'Підручники й посібники співробітників кафедри.', en: 'Textbooks and teaching materials by department staff.' },
    hud: { top: ['N = <b data-hud="n">1</b>', 'k = <b data-hud="k">1</b>'], bot: ['FOURIER SERIES', 'SQUARE WAVE'] },
    lines: { uk: ['Ще одну гармоніку?', 'Меандр майже зійшовся', 'Читаю між гармоніками'], en: ['One more harmonic?', 'Almost a square wave', 'Reading between harmonics'] },
  },
  entrant: {
    ch: 'CH 04 · ADM', inst: 'mobius', acc: 'backpack',
    lead: { uk: 'Програмування, цифрові схеми й мережеві технології.', en: 'Programming, digital circuits and network technologies.' },
    hud: { top: ['LAP <b data-hud="lap">1</b> / 2', 'φ = <b data-hud="phase">0°</b>'], bot: ['MÖBIUS STRIP', 'MOVE CURSOR'] },
    lines: { uk: ['Рюкзак зібрано', 'Код починається з тебе', 'На Мебіусі немає тупиків'], en: ['Backpack packed', 'The code starts with you', 'Möbius: no dead ends'] },
  },
  documents: {
    ch: 'CH 05 · DOCS', inst: 'tape', acc: 'glasses',
    lead: { uk: 'Статут, положення та етичний кодекс університету.', en: 'The university’s statute, regulations and code of ethics.' },
    hud: { top: ['READ <b data-hud="byte">0x00</b>', '<b data-hud="bin">00000000</b>'], bot: ['8-TRACK PAPER TAPE', 'UTF-8'] },
    lines: { uk: ['Читаю дрібний шрифт', 'Читаю по біту', 'Усе за протоколом'], en: ['Reading the fine print', 'Reading bit by bit', 'Following the protocol'] },
  },
  graduates: {
    ch: 'CH 06 · ALUM', inst: 'chladni', acc: 'cap',
    lead: { uk: 'Досвід і поради випускників кафедри.', en: 'Experience and advice from department alumni.' },
    hud: { top: ['MODE (n, m) = <b data-hud="mode">(2, 3)</b>', 'f = 0'], bot: ['CHLADNI FIGURES', 'STANDING WAVES'] },
    lines: { uk: ['Диплом є. Пошук триває.', 'Тримаю курс на знання', 'Шапка вгору, сигнал теж'], en: ['Degree earned. Still curious', 'Steering towards knowledge', 'Caps up, signal up'] },
  },
  personas: {
    ch: 'CH 07 · STAFF', inst: 'liss', acc: 'pointer',
    lead: { uk: 'Викладачі та співробітники кафедри.', en: 'The department’s academic and support staff.' },
    hud: { top: ['X:Y = <b data-hud="ratio">1:2</b>', 'φ → DRIFT'], bot: ['LISSAJOUS', 'X-Y MODE'] },
    lines: { uk: ['Готуюся до лекції', 'У кожного своя частота', 'Сьогодні в режимі X–Y'], en: ['Getting ready to lecture', 'A frequency for everyone', 'In X–Y mode today'] },
  },
  stateholders: {
    ch: 'CH 08 · EMPL', inst: 'nnet', acc: 'tie',
    lead: { uk: 'Знання випускників і пропозиції щодо змісту освіти.', en: 'Graduate skills and suggestions for educational content.' },
    hud: { top: ['4 · 7 · 7 · 5 · 2', 'PASS <b data-hud="pass">0</b>'], bot: ['NEURAL NETWORK · FORWARD PASS', 'MOVE CURSOR'] },
    lines: { uk: ['Звіряємо протоколи', 'Знайдемо спільну частоту', 'Краватка є, мережа навчена'], en: ['Comparing protocols', 'Finding a shared frequency', 'Tie on, network trained'] },
  },
  studying: {
    ch: 'CH 09 · STUD', inst: 'spectrum', acc: 'laptop',
    lead: { uk: 'Навчальні плани, робочі програми та розклад занять.', en: 'Curricula, course syllabi and class timetables.' },
    hud: { top: ['RBW 30 kHz', 'SPAN 5 GHz'], bot: ['SPECTRUM ANALYZER', 'PEAK HOLD'] },
    lines: { uk: ['Компілюю розклад', 'Лабораторна на горизонті', 'Сесія на піку'], en: ['Compiling the timetable', 'A lab on the horizon', 'Exams at their peak'] },
  },
};
