// Нова новина однією командою: обидва файли (uk і en) у src/content/news/ і фірмова картка прев’ю.
//   npm run news -- "Заголовок українською" ["English title"] [--date 2026-11-01] [--slug moya-novyna]
// Далі — лише Markdown: відкрийте створені файли, напишіть текст, фото покладіть у src/assets/images/news/.
// Перегляд: npm run dev → http://localhost:4321/posts/<slug>/
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const date = opt('--date') ?? new Date().toISOString().slice(0, 10);
let slug = opt('--slug');
const [uk, en] = args;
if (!uk) {
  console.error('Як користуватися:\n  npm run news -- "Заголовок українською" ["English title"] [--date РРРР-ММ-ДД] [--slug latynytseyu]');
  process.exit(1);
}

// адреса латиницею з українського заголовка (транслітерація за постановою КМУ 2010 р., спрощено)
const TR = { а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia' };
slug ??= [...uk.toLowerCase()].map(ch => TR[ch] ?? ch).join('')
  .replace(/['’ʼ`"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error(`Дата має бути у форматі РРРР-ММ-ДД, а не «${date}»`); process.exit(1); }

const q = s => JSON.stringify(s);
const file = (lang, title, summary, body) => `---
title: ${q(title)}
date: ${q(date)}
summary: ${q(summary)}
# cover: "../../../assets/images/news/${slug}.jpg"   # фото-обкладинка (необов’язково): покладіть файл і приберіть «#»
# coverAlt: "Що зображено на фото"
tags: []
---

${body}
`;
const files = {
  uk: file('uk', uk, 'Одне-два речення для списку новин і пошуковиків.', `Текст новини. Звичайний Markdown: **жирний**, [посилання](https://knu.ua), списки:

- перший пункт
- другий пункт

<!-- Фото в тексті: ![Що зображено](../../../assets/images/news/фото.jpg "Підпис під фото") -->`),
  en: file('en', en ?? `TODO: English title for «${uk}»`, 'One or two sentences for the news list and search engines.', `News text in English. Plain Markdown: **bold**, [links](https://knu.ua), lists:

- first item
- second item`),
};

for (const lang of ['uk', 'en']) {
  const p = join(ROOT, 'src/content/news', lang, `${slug}.md`);
  if (existsSync(p)) { console.error(`Уже є: ${p}\nОберіть іншу адресу: --slug ...`); process.exit(1); }
}
for (const lang of ['uk', 'en']) {
  const p = join(ROOT, 'src/content/news', lang, `${slug}.md`);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, files[lang]);
  console.log(`✓ ${p.replace(ROOT + '/', '')}`);
}

// картка прев’ю для соцмереж і месенджерів (потрібен Chromium від Playwright; без нього сторінка візьме картку «Новини»)
const og = spawnSync(process.execPath, [join(ROOT, 'scripts/og.mjs'), `posts/${slug}-`], { cwd: ROOT, stdio: 'inherit' });
if (og.status !== 0) console.log('! Картку прев’ю не створено (немає браузера?): npx playwright install chromium && npm run og -- posts/' + slug);

console.log(`
Далі:
  1. Напишіть текст у src/content/news/uk/${slug}.md і переклад у src/content/news/en/${slug}.md
  2. npm run dev → http://localhost:4321/posts/${slug}/
  3. Якщо змінили заголовок — оновіть картку: npm run og -- posts/${slug}
  4. Гілка content/${slug}, запит на злиття в main`);
