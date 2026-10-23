// Картки для соцмереж (Open Graph, 1200×630) для головної й розділів обома мовами.
// Запуск локально після зміни назв розділів: node scripts/og.mjs  → public/og/<розділ>-<мова>.jpg
// Потрібен Playwright (devDependency) і встановлений браузер (npx playwright install chromium).
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/og');
mkdirSync(OUT, { recursive: true });
const b64 = f => readFileSync(join(ROOT, f)).toString('base64');
const fixel = b64('src/assets/fonts/FixelVariable.woff2'), mono = b64('src/assets/fonts/SignalMono-Medium.woff2'), emblem = b64('src/assets/emblem.webp');

const CARDS = {
  home: { ch: 'KNU · FRECS', uk: ['Кафедра', 'комп’ютерної інженерії'], en: ['Department of', 'Computer Engineering'] },
  news: { ch: 'CH 01 · NEWS', uk: ['Новини'], en: ['News'] },
  research: { ch: 'CH 02 · RSRC', uk: ['Дослідження'], en: ['Research'] },
  'medu-guide': { ch: 'CH 03 · EDU', uk: ['Навчально-методичне', 'забезпечення'], en: ['Teaching', 'materials'] },
  entrant: { ch: 'CH 04 · ADM', uk: ['Абітурієнту'], en: ['For applicants'] },
  documents: { ch: 'CH 05 · DOCS', uk: ['Нормативні', 'документи'], en: ['Regulations'] },
  graduates: { ch: 'CH 06 · ALUM', uk: ['Наші випускники'], en: ['Our alumni'] },
  personas: { ch: 'CH 07 · STAFF', uk: ['Персоналії'], en: ['People'] },
  stateholders: { ch: 'CH 08 · EMPL', uk: ['Роботодавцям'], en: ['For employers'] },
  studying: { ch: 'CH 09 · STUD', uk: ['Навчальна', 'робота'], en: ['Studies'] },
};
const sub = { uk: 'Київський національний університет імені Тараса Шевченка', en: 'Taras Shevchenko National University of Kyiv' };
// діаграма Сміта золотом праворуч — той самий мотив, що в підвалі сайту
const smith = () => { let s = '<circle cx="0" cy="0" r="1"/><line x1="-1" y1="0" x2="1" y2="0"/>'; [.2, .5, 1, 2, 5].forEach(r => { s += `<circle cx="${r / (1 + r)}" cy="0" r="${1 / (1 + r)}"/>`; }); [.2, .5, 1, 2, 5].forEach(x => [1, -1].forEach(k => { s += `<circle cx="1" cy="${-k / x}" r="${1 / x}" clip-path="url(#c)"/>`; })); return s; };
let wave = 'M0 0'; for (let i = 0; i <= 300; i++) wave += ` L${i * 4} ${(Math.sin(i / 300 * Math.PI * 6) * 26).toFixed(1)}`;
const html = (c, lang) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:F;src:url(data:font/woff2;base64,${fixel})}@font-face{font-family:M;src:url(data:font/woff2;base64,${mono})}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:#2A0A12;color:#F3E7D3;font-family:F;position:relative;overflow:hidden}
.g{position:absolute;inset:0;background-image:linear-gradient(rgb(230 211 163/.06) 1px,transparent 1px),linear-gradient(90deg,rgb(230 211 163/.06) 1px,transparent 1px);background-size:48px 48px}
.glow{position:absolute;inset:0;background:radial-gradient(60% 70% at 80% 40%,rgb(226 194 127/.16),transparent 65%)}
svg.s{position:absolute;right:-150px;top:-60px;width:700px;height:700px;opacity:.28}svg.s *{fill:none;stroke:#E6D3A3;stroke-width:.004}
svg.w{position:absolute;left:80px;bottom:120px;width:1040px;height:60px;overflow:visible}svg.w path{fill:none;stroke:#E2C27F;stroke-width:2.5;filter:drop-shadow(0 0 6px rgb(226 194 127/.6))}
.top{position:absolute;left:80px;top:72px;display:flex;align-items:center;gap:22px}.top img{width:84px;height:84px;border-radius:50%}
.top b{display:block;font:500 28px/1.15 F}.top small{display:block;font:500 15px/1.3 M;letter-spacing:.08em;color:#E6D3A3;margin-top:6px;text-transform:uppercase}
.ch{position:absolute;left:80px;top:250px;font:500 18px/1 M;letter-spacing:.12em;color:#E6D3A3}
h1{position:absolute;left:76px;top:290px;font:300 ${c[lang].join(' ').length > 26 ? 66 : 84}px/1.02 F;letter-spacing:-.03em;max-width:880px}
.foot{position:absolute;left:80px;bottom:56px;font:400 19px/1 F;color:rgb(243 231 211/.75)}
</style></head><body><div class="g"></div><div class="glow"></div>
<svg class="s" viewBox="-1.05 -1.05 2.1 2.1"><defs><clipPath id="c"><circle cx="0" cy="0" r="1"/></clipPath></defs>${smith()}</svg>
<div class="top"><img src="data:image/webp;base64,${emblem}"><div><b>${lang === 'uk' ? 'Комп’ютерна інженерія' : 'Computer Engineering'}</b><small>ce.knu.ua</small></div></div>
<div class="ch">${c.ch}</div><h1>${c[lang].join('<br>')}</h1>
<svg class="w" viewBox="0 -30 1200 60" preserveAspectRatio="none"><path d="${wave}"/></svg>
<div class="foot">${sub[lang]}</div></body></html>`;

const br = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const pg = await br.newPage({ viewport: { width: 1200, height: 630 } });
for (const [k, c] of Object.entries(CARDS)) for (const lang of ['uk', 'en']) {
  await pg.setContent(html(c, lang), { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: join(OUT, `${k}-${lang}.jpg`), type: 'jpeg', quality: 86 });
}
await br.close();
console.log('OG-картки:', Object.keys(CARDS).length * 2);
