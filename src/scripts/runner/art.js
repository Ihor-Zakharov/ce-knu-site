// Піксель-арт гри на 404: палітри, пори року, перешкоди, дерева, значки. Тут лише дані й «випікання» спрайтів —
// правила гри лежать у world.js, а малює все це view.js.
// Кожен спрайт — рядки символів, як КІ-Рекс у rex.js: символ = колір, крапка = порожньо.
//   K k e l L s S y Y r A O — кольори теми (токени «Сигналу», таблиця TOKENS);
//   a b c                   — три кольори пори року (SEASONS, для світлої й темної теми).
//
// Щоб перешкоди читалися з першого погляду, у гри дві мітки (CUE):
//   небезпечне — червоний край (r, --signal): шипи, жуки, низ навісних перешкод, боки блоків;
//   корисне    — золото (Y, --gold-ink): пружини, біти, верх блоків, на який можна стати.
// Контраст обох міток з усіма фонами гри перевіряє скрипт (не менш ніж 3:1 у кожній порі року й темі).

/* кольори теми: символ спрайта → токен CSS. view.js читає їх одним знімком і на кожну зміну теми.
   У view.js ці кольори лежать в об'єкті T під тими самими літерами: T.K — чорнило, T.s — тло тощо */
export const TOKENS = {
  K: '--ink',          // чорнило: контури, стрілки підказок, великий рахунок
  k: '--ink-2',        // другорядне чорнило: рахунок у кутку, рядок керування, підписи підказок
  e: '--ink-3',        // найсвітліше чорнило: «HI», пил з-під ніг, стовбури дерев
  l: '--line-strong',  // помітні лінії: земля, дріт, підвіси навісних перешкод
  L: '--line',         // бліді лінії: пагорби й хмари
  s: '--surface',      // тло гри й плашок під написами
  S: '--surface-2',    // корпус блока
  y: '--gold',         // золото: сяйво довкола корисного, іскри, плашка побитого рекорду
  Y: '--gold-ink',     // золото для тексту й «корисних» країв (верх блока, пружина, кільце біта)
  r: '--signal',       // сигнальний червоний: «небезпечні» краї
  A: '--action',       // колір головної дії сайту: круг кнопок ▶, ❙❙, ↻
  O: '--on-action',    // значок на крузі кнопки
};
export const CUE = { hazard: 'r', helper: 'Y' };
// дерева другого плану бліді (світла тема, темна): не сперечаються з перешкодами й КІ-Рексом
export const TREE_ALPHA = [.22, .16];

/* Пори року в порядку гри: зима, весна, сакура, літо, осінь. Кольори a, b, c — пари [світла тема, темна тема].
   wear — що носить КІ-Рекс (аксесуари з rex.js; якщо рядків два — це кадри анімації);
   soil — яким із кольорів підфарбована земля; air — яким кольором летять частинки в кожній темі;
   weather — що летить у повітрі: snow сніг, petal пелюстки, sakura пелюстки із сердечками й іскорками,
             firefly світляки, leaf листя;
   hill — колір далеких пагорбів: блідий відтінок землі цієї пори, щоб тло й земля були однієї гами;
   cloud — свій колір хмар (лише в сакури — рожеві; інакше звичайний колір ліній теми) */
export const SEASONS = [
  {
    id: 'winter',
    wear: ['headset+scarf', 'headset+scarf2'],
    soil: 'b',
    air: ['a', 'b'],
    weather: 'snow',
    hill: ['#DDE8EE', '#232A30'],
    a: ['#6FA5C4', '#8CC4DE'],
    b: ['#B5D2E0', '#E6F2F7'],
    c: ['#3F7896', '#5C9BBB'],
  },
  {
    id: 'spring',
    wear: ['headset+flower'],
    soil: 'a',
    air: ['b', 'b'],
    weather: 'petal',
    hill: ['#E2EBD6', '#252C21'],
    a: ['#69A845', '#86C562'],
    b: ['#E27F9F', '#F2A3BC'],
    c: ['#3E762B', '#4E9438'],
  },
  {
    id: 'sakura',
    wear: ['catset+blush+choker+cuff+bow+sparkle+socks'],
    soil: 'a',
    air: ['a', 'a'],
    weather: 'sakura',
    hill: ['#F3DCE6', '#33252F'],
    cloud: ['#F3DCE6', '#33252F'],
    a: ['#EC96B7', '#F4B0CA'],
    b: ['#C2A2E2', '#B598E4'],
    c: ['#B3467A', '#E27CAA'],
  },
  {
    id: 'summer',
    wear: ['headset+shades'],
    soil: 'a',
    air: ['b', 'b'],
    weather: 'firefly',
    hill: ['#DCE7CF', '#232B1E'],
    a: ['#4C9638', '#62B34C'],
    b: ['#D9A62E', '#F0C85A'],
    c: ['#8E52A6', '#B67BCB'],
  },
  {
    id: 'autumn',
    wear: ['headset+leaf'],
    soil: 'a',
    air: ['a', 'a'],
    weather: 'leaf',
    hill: ['#F0DFCA', '#30261D'],
    a: ['#D5762A', '#EE9140'],
    b: ['#D9A62E', '#F0C85A'],
    c: ['#8A4A22', '#B0683A'],
  },
];

/* спрайти, спільні для всіх пір року */
export const SPR = {
  // блок — «мікросхема»: золотий верх (сюди можна стати), червоні боки (об них КІ-Рекс розбивається)
  block: [
    'YYYYYYYY',
    'rSSSSSSr',
    'rSlSSSSr',
    'rSSSSSSr',
    'rSSSSSSr',
    'rSSSSSSr',
    'rSSSSSSr',
    'rKKKKKKr',
  ],
  // пружина: спокійна й розтиснута (щойно підкинула); золота площадка
  pad: [
    'YYYYYYYY',
    '.K....K.',
    '..KKKK..',
    '.K....K.',
    'KKKKKKKK',
  ],
  padUp: [
    'YYYYYYYY',
    '..K..K..',
    '.K....K.',
    '..K..K..',
    '.K....K.',
    '..K..K..',
    '.K....K.',
    'KKKKKKKK',
  ],
  // біт у золотому кільці — «сфера» для стрибка в повітрі
  bit1: [
    '..YYYYY..',
    '.Y.....Y.',
    'Y...K...Y',
    'Y..KK...Y',
    'Y...K...Y',
    'Y...K...Y',
    'Y..KKK..Y',
    '.Y.....Y.',
    '..YYYYY..',
  ],
  bit0: [
    '..YYYYY..',
    '.Y.....Y.',
    'Y..KKK..Y',
    'Y..K.K..Y',
    'Y..K.K..Y',
    'Y..K.K..Y',
    'Y..KKK..Y',
    '.Y.....Y.',
    '..YYYYY..',
  ],
  // жук (програмний «баг»): червоний, два кадри крил
  bug: [
    '....ll..',
    '...llll.',
    '.rrrrrr.',
    'rsKrKrrr',
    'rKKrrKrr',
    '.rrrrrr.',
    '..K.K.K.',
  ],
  bug2: [
    '........',
    '..llllll',
    '.rrrrrr.',
    'rsKrKrrr',
    'rKKrrKrr',
    '.rrrrrr.',
    '.K.K.K..',
  ],
  cloud: ['...LLLL.....', '.LLLLLLLLL..', 'LLLLLLLLLLLL'],
  // стрілки підказок: «пригнись» і «стрибай»
  down: [
    'K.....K',
    'KK...KK',
    '.KK.KK.',
    '..KKK..',
    '...K...',
  ],
  up: [
    '...K...',
    '..KKK..',
    '.KK.KK.',
    'KK...KK',
    'K.....K',
  ],
};

/* спрайти, що мають свій вигляд у кожної пори року: [зима, весна, сакура, літо, осінь] */
export const SKIN = {
  // шип на землі: крига, їжак, троянда з колючками, будяк, каштан у шкаралупі — у кожного червоний край або червоні голки
  spike: [
    [
      '....r...',
      '...rbr..',
      '...rbr..',
      '..rbbar.',
      '.rrbbar.',
      'rbrbbarr',
      'rbrbaaar',
      'rbabaaar',
    ],
    [
      '........',
      '..r.r.r.',
      '.rkrkrkr',
      'rkekekek',
      'Sekekeke',
      'KSeeeeee',
      'SSSeeeee',
      '.e...e..',
    ],
    [
      'r..r..r.',
      '.raaar..',
      'raabaar.',
      '.abbba..',
      'raabaar.',
      '.raaar..',
      'r..c..r.',
      '...c....',
    ],
    [
      '.r.r.r..',
      'r.ccc.r.',
      '.ccccc..',
      'rcccccr.',
      '.ccccc..',
      'r.aaa.r.',
      '..aaa...',
      '.aaaaa..',
    ],
    [
      '..r..r..',
      'r.rbbr.r',
      '.rbbbbr.',
      'rbbccbbr',
      '.bcbccb.',
      'rbbccbbr',
      '.rbbbbr.',
      'r.r..r.r',
    ],
  ],
  // навісна перешкода: висить на тонкому підвісі, низ — на висоті голови КІ-Рекса (8×11: клітинка й 3 пікселі під нею).
  // Бурульки, кропива, осине гніздо, каштан на гілці; небезпечний низ — червоний
  hang: [
    [
      '.cccccc.',
      'cbbbbaac',
      'cbbabaac',
      'rbbabaar',
      'rbbabaar',
      '.rbabar.',
      '.rbabar.',
      '.rb.bar.',
      '.rb.br..',
      '..r..r..',
      '..r.....',
    ],
    [
      '...cc...',
      '..cbbc..',
      '.caaaac.',
      'raaccaar',
      '.raaaar.',
      'raaccaar',
      '.raaaar.',
      'r.raar.r',
      '..raar..',
      '.r.rr.r.',
      '...r....',
    ],
    [
      '...cc...',
      '..aaaa..',
      '.aabbaa.',
      '.abbbba.',
      'raabbaar',
      'raaaaaar',
      '.raaaar.',
      '.r.rr.r.',
      '..r..r..',
      '...rr...',
      '...r....',
    ],
    [
      '...kk...',
      '..bbbb..',
      '.bbbbbb.',
      '.rrrrrr.',
      'bbbbbbbb',
      'bbbbbbbb',
      'rrrrrrrr',
      'bbbKKbbb',
      'bbbKKbbb',
      '.rrrrrr.',
      '..rbbr..',
    ],
    [
      '...ee...',
      '..aee...',
      '.aaee...',
      '..r..r..',
      'r.rbbr.r',
      '.rbbbbr.',
      'rbbccbbr',
      '.bcbccb.',
      'rbbccbbr',
      '.rbbbbr.',
      'r.r..r.r',
    ],
  ],
  // дерева на другому плані (e — стовбур і гілки)
  tree: [
    [
      '...b......b....',
      '...e..b...e..b.',
      '.b.e..e..e...e.',
      '.e..e.e..e..e..',
      '..e.e.e.e..e...',
      '...ee.ee..e....',
      '....eeee.e.....',
      '.....eeee......',
      '......ee.......',
      '......ee.......',
      '......ee.......',
      '......ee.......',
      '......ee.......',
      '.....eeee......',
    ],
    [
      '.....aaaaa.....',
      '...aaabaaaaa...',
      '..aabaaaaabaa..',
      '.aaaaaaaaaaaaa.',
      '.aabaaaabaaaaa.',
      'aaaaaaaaaaabaaa',
      'aaaaabaaaaaaaaa',
      'aacaaaaaaabaaca',
      '.accaaaaaaaaca.',
      '..caaacaaaacc..',
      '...ccaacccc....',
      '......ee.......',
      '......ee.......',
      '......ee.......',
      '......ee.......',
      '.....eeee......',
    ],
    [
      '....aaa.aaa....',
      '..aabaaaaabaa..',
      '.aaaaabaaaaaaa.',
      'aabaaaaaaabaaaa',
      'aaaaaabaaaaaaba',
      '.aaabaaaaaaaaa.',
      'aaaaaaaabaaaaaa',
      '.abaaaaaaaaaba.',
      '..aaaecaaeaaa..',
      '...ca.ee.eac...',
      '......eee......',
      '......ee.......',
      '......ee.......',
      '......ee.......',
      '......ee.......',
      '.....eeee......',
    ],
    [
      '.....aaaaa.....',
      '...aaaaaaaaa...',
      '..aaaabaaaaaa..',
      '.aaaaaaaaaabaa.',
      '.aabaaaaaaaaaa.',
      'aaaaaaaabaaaaaa',
      'aaaaaaaaaaaaaba',
      'aaaabaaaaaaaaaa',
      '.aaaaaaaaabaaa.',
      '..aaaaaaaaaaa..',
      '...aaaaaaaa....',
      '......ee.......',
      '......ee.......',
      '......ee.......',
      '......ee.......',
      '.....eeee......',
    ],
    [
      '.....aaaaa.....',
      '...aabaaaaba...',
      '..aaaaabaaaaa..',
      '.abaaaaaaacaa.',
      '.aaaabaaaaccab.',
      'aaaaaaaabaaacaa',
      'abaaaaaaaaaaaaa',
      'aacaaabaaaaacaa',
      '.accaaaaaabaca.',
      '..caaacaaaacc..',
      '...ccaacccc....',
      '......ee.......',
      '......ee.......',
      '......ee.......',
      '......ee.......',
      '.....eeee......',
    ],
  ],
  // дрібниці на землі (низькі й пласкі — щоб не сплутати з перешкодою)
  deco: [
    [['.bbb..', 'bbbbbb'], ['..bb', 'bbbb']],
    [['.b.', '.a.', 'aaa'], ['a.a', '.aa']],
    [['.a.', 'aba'], ['a.a'], ['b']],
    [['a..a.', '.a.aa', 'aaaaa'], ['.b.', '.a.', 'a.a']],
    [['.ab.', 'acba'], ['ab'], ['c.a']],
  ],
  // значок пори року: сніжинка, квітка, цвіт сакури, сонце, листок
  icon: [
    [
      '...a...',
      '.a.a.a.',
      '..aaa..',
      'aaaaaaa',
      '..aaa..',
      '.a.a.a.',
      '...a...',
    ],
    [
      '..b.b..',
      '.bbbbb.',
      'bbbybbb',
      '.byyyb.',
      'bbbybbb',
      '.bbbbb.',
      '..b.b..',
    ],
    [
      '..a.a..',
      '.aa.aa.',
      'aaacaaa',
      '.acbca.',
      'aaacaaa',
      '.aa.aa.',
      '..a.a..',
    ],
    [
      '...b...',
      '.b...b.',
      '..bbb..',
      'b.bbb.b',
      '..bbb..',
      '.b...b.',
      '...b...',
    ],
    [
      '...a...',
      '.a.a.a.',
      '.aaaaa.',
      'aaaaaaa',
      '.aaaaa.',
      '...c...',
      '...c...',
    ],
  ],
};

/* частинки пори сакури (крім пелюсток): сердечко й іскорка */
export const HEART = ['#.#', '###', '.#.'];
export const SPARK = ['.#.', '###', '.#.'];
/* цифри 0 і 1 з трьох стовпчиків — на них розсипається КІ-Рекс */
export const DIGIT = [
  ['###', '#.#', '#.#', '#.#', '###'],
  ['.#.', '##.', '.#.', '.#.', '###'],
];

/* Спрайт із рядків → маленьке полотно потрібного масштабу (s пікселів екрана на піксель спрайта).
   Готові полотна потім лише копіюються через drawImage — це значно швидше, ніж щокадру малювати сотні квадратиків. */
export function bake(rows, colors, s) {
  const cv = document.createElement('canvas');
  const w = Math.max(...rows.map(r => r.length));
  cv.width = w * s;
  cv.height = rows.length * s;
  const c = cv.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (colors[ch]) {
      c.fillStyle = colors[ch];
      c.fillRect(x * s, y * s, s, s);
    }
  }));
  return cv;
}
/* те саме для кадру КІ-Рекса: rexFrame() повертає вже готову сітку кольорів */
export function bakeGrid(grid, s) {
  const cv = document.createElement('canvas');
  cv.width = grid[0].length * s;
  cv.height = grid.length * s;
  const c = cv.getContext('2d');
  grid.forEach((row, y) => row.forEach((col, x) => {
    if (col) {
      c.fillStyle = col;
      c.fillRect(x * s, y * s, s, s);
    }
  }));
  return cv;
}
