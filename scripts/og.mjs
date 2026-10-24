// Картки для соцмереж (Open Graph, 1200×630) обома мовами — однаковий фірмовий вигляд усюди:
// головна й розділи → public/og/<розділ>-<мова>.jpg, кожна новина → public/og/posts/<slug>-<мова>.jpg,
// кожна персоналія → public/og/personas/<slug>-<мова>.jpg (slug = назва файлу вмісту).
// Запуск після нових новин чи людей: node scripts/og.mjs  (без картки сторінка бере картку свого розділу)
// Потрібен Playwright (devDependency) і встановлений браузер (npx playwright install chromium).
import { chromium } from '@playwright/test';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/og');
mkdirSync(join(OUT, 'posts'), { recursive: true }); mkdirSync(join(OUT, 'personas'), { recursive: true });
const b64 = f => readFileSync(join(ROOT, f)).toString('base64');
const fixel = b64('src/assets/fonts/FixelVariable.woff2'), mono = b64('src/assets/fonts/SignalMono-Medium.woff2'), emblem = b64('src/assets/emblem.webp');

const CARDS = {
  home: { ch: 'KNU · FRECS', uk: ['Кафедра', 'комп’ютерної інженерії'], en: ['Department of', 'Computer Engineering'] },
  news: { ch: 'CH 01 · NEWS', uk: ['Новини'], en: ['News'] },
  research: { ch: 'CH 02 · RSRC', uk: ['Дослідження'], en: ['Research'] },
  'medu-guide': { ch: 'CH 03 · EDU', uk: ['Навчально-методичне', 'забезпечення'], en: ['Teaching', 'materials'] },
  entrant: { ch: 'CH 04 · ADM', uk: ['Вступникам'], en: ['Admission'] },
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
.ch{position:absolute;left:80px;top:${c.chTop ?? 250}px;font:500 18px/1 M;letter-spacing:.12em;color:#E6D3A3}
h1{position:absolute;left:76px;top:${c.h1Top ?? 290}px;font:300 ${c.size ?? (c[lang].join(' ').length > 26 ? 66 : 84)}px/1.04 F;letter-spacing:-.03em;max-width:${c.wide ? 1000 : 880}px;display:-webkit-box;-webkit-line-clamp:${c.clamp ?? 3};-webkit-box-orient:vertical;overflow:hidden}
.role{position:absolute;left:80px;top:${c.roleTop ?? 400}px;font:400 24px/1.3 F;color:rgb(243 231 211/.8);max-width:960px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.foot{position:absolute;left:80px;bottom:56px;font:400 19px/1 F;color:rgb(243 231 211/.75)}
</style></head><body><div class="g"></div><div class="glow"></div>
<svg class="s" viewBox="-1.05 -1.05 2.1 2.1"><defs><clipPath id="c"><circle cx="0" cy="0" r="1"/></clipPath></defs>${smith()}</svg>
<div class="top"><img src="data:image/webp;base64,${emblem}"><div><b>${lang === 'uk' ? 'Комп’ютерна інженерія' : 'Computer Engineering'}</b><small>ce.knu.ua</small></div></div>
<div class="ch">${c.chs?.[lang] ?? c.ch}</div><h1>${c[lang].join('<br>')}</h1>${c.role?.[lang] ? `<div class="role">${c.role[lang]}</div>` : ''}
<svg class="w" viewBox="0 -30 1200 60" preserveAspectRatio="none"><path d="${wave}"/></svg>
<div class="foot">${sub[lang]}</div></body></html>`;

// новини й персоналії — з фронтматеру файлів вмісту
const front = f => { const m = readFileSync(f, 'utf8').match(/^---\n([\s\S]*?)\n---/); const o = {}; if (m) for (const l of m[1].split('\n')) { const k = l.match(/^(\w+):\s*"?(.*?)"?\s*$/); if (k) o[k[1]] = k[2].replace(/\\"/g, '"'); } return o; };
const esc = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const size = t => (t.length <= 34 ? 76 : t.length <= 70 ? 60 : t.length <= 110 ? 50 : 44);
const JOBS = Object.entries(CARDS).flatMap(([k, c]) => ['uk', 'en'].map(lang => [join(OUT, `${k}-${lang}.jpg`), c, lang]));
for (const lang of ['uk', 'en']) {
  for (const f of readdirSync(join(ROOT, 'src/content/news', lang)).filter(f => f.endsWith('.md'))) {
    const d = front(join(ROOT, 'src/content/news', lang, f)), slug = f.replace(/\.md$/, ''), title = esc(d.title);
    const date = d.date ? d.date.split('-').reverse().join('.') : '';
    JOBS.push([join(OUT, 'posts', `${slug}-${lang}.jpg`), { chs: { [lang]: `${lang === 'uk' ? 'НОВИНИ' : 'NEWS'}${date ? ' · ' + date : ''}` }, [lang]: [title], size: size(d.title ?? ''), clamp: 4, wide: true, chTop: 196, h1Top: 236 }, lang]);
  }
  for (const f of readdirSync(join(ROOT, 'src/content/people', lang)).filter(f => f.endsWith('.md'))) {
    const d = front(join(ROOT, 'src/content/people', lang, f)), slug = f.replace(/\.md$/, '');
    const long = (d.name ?? '').length > 26, fs = long ? 60 : 72;   // два рядки імені або один
    JOBS.push([join(OUT, 'personas', `${slug}-${lang}.jpg`), { chs: { [lang]: lang === 'uk' ? 'ПЕРСОНАЛІЇ' : 'PEOPLE' }, [lang]: [esc(d.name)], size: fs, clamp: 2, role: { [lang]: esc(d.role) }, chTop: 196, h1Top: 236, roleTop: Math.round(236 + (long ? 2 : 1) * fs * 1.04 + 16), wide: true }, lang]);
  }
}

// node scripts/og.mjs posts/<slug>  — лише картки, шлях яких містить цей фрагмент (наприклад, щойно створена новина)
const only = process.argv[2];
if (only) JOBS.splice(0, JOBS.length, ...JOBS.filter(([out]) => out.includes(only)));
const br = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const pg = await br.newPage({ viewport: { width: 1200, height: 630 } });
for (const [out, c, lang] of JOBS) {
  await pg.setContent(html(c, lang), { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: out, type: 'jpeg', quality: 80 });
}
await br.close();
console.log('OG-картки:', JOBS.length);
