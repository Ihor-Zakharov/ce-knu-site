// Перевірка повноти перенесення (критерій 7.1 «Повнота вмісту»).
// Запуск після збирання: npm run check:content [-- <шлях до current-site/ce>]
//  1. кожна новина, сторінка й персоналія чинного сайту має сторінку в dist/ обома мовами за старою адресою;
//  2. кожен документ із files/ лежить у dist/files/;
//  3. кожне зображення, вжите на чинному сайті, вжите й у новому вмісті — в обох мовах;
//  4. кожен файл uk/ має переклад en/, і переклад справді англійський;
//  5. у зібраному сайті немає непрацюючих внутрішніх посилань (href/src).
// Код виходу 1, якщо знайдено хоч одну проблему.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// чинний сайт: аргумент, або current-site/ce у корені репозиторію команди, або локальна копія поруч
// ../refs/merged/ce — копія з репозиторію керівника + новіші матеріали з живого ce.knu.ua (scripts/fetch-live.py)
const CANDIDATES = [process.argv[2], 'current-site/ce', '../current-site/ce', '../refs/merged/ce', '../refs/ce-knu-site-practice/current-site/ce'].filter(Boolean);
const OLD = resolve(ROOT, CANDIDATES.find(c => existsSync(resolve(ROOT, c, 'conf.py'))) ?? CANDIDATES[0]);
const DIST = join(ROOT, 'dist');
const CONTENT = join(ROOT, 'src/content');
const BASE = (process.env.BASE_PATH || '/').replace(/\/$/, '');
const problems = [];
const ok = { pages: 0, files: 0, images: 0, translations: 0, links: 0 };
const fail = (kind, msg) => problems.push(`[${kind}] ${msg}`);

if (!existsSync(DIST)) { console.error('Немає dist/ — спершу npm run build'); process.exit(1); }
const hasOld = existsSync(join(OLD, 'conf.py'));
if (!hasOld) console.warn(`! Чинний сайт не знайдено (${OLD}) — перевіряю лише новий вміст і посилання`);

const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const meta = f => Object.fromEntries([...readFileSync(f, 'utf8').matchAll(/^\.\. (\w+):(?!:)\s?(.*)$/gm)].map(m => [m[1], m[2].trim()]));
const page = (lang, p) => join(DIST, lang === 'en' ? 'en' : '', p, 'index.html');

// ── 1. адреси чинного сайту → сторінки нового обома мовами ──
if (hasOld) {
  const urls = [];
  for (const f of readdirSync(join(OLD, 'posts')).filter(f => f.endsWith('.rst'))) urls.push(`posts/${meta(join(OLD, 'posts', f)).slug}`);
  for (const f of readdirSync(join(OLD, 'pages')).filter(f => f.endsWith('.rst'))) { const s = meta(join(OLD, 'pages', f)).slug; urls.push(s === 'index' ? '' : s); }
  for (const d of readdirSync(join(OLD, 'pages'), { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'personas'))
    for (const f of readdirSync(join(OLD, 'pages', d.name)).filter(f => f.endsWith('.rst'))) urls.push(`${d.name}/${meta(join(OLD, 'pages', d.name, f)).slug}`);
  for (const f of readdirSync(join(OLD, 'pages/personas')).filter(f => f.endsWith('.rst'))) urls.push(`personas/${meta(join(OLD, 'pages/personas', f)).slug}`);
  urls.push('news');
  for (const u of urls) for (const lang of ['uk', 'en']) {
    if (existsSync(page(lang, u))) ok.pages++; else fail('сторінка', `${lang === 'en' ? '/en' : ''}/${u}${u ? '/' : ''} — немає`);
  }

  // ── 2. документи ──
  for (const f of walk(join(OLD, 'files'))) {
    const rel = relative(join(OLD, 'files'), f);
    if (existsSync(join(DIST, 'files', rel))) ok.files++; else fail('документ', `/files/${rel} — немає в dist`);
  }

  // ── 3. зображення: усе, що вжито на чинному сайті, вжито й у новому вмісті ──
  const used = new Set();
  for (const f of walk(OLD).filter(f => f.endsWith('.rst'))) for (const m of readFileSync(f, 'utf8').matchAll(/\/images\/([\w./-]+\.(?:jpe?g|png|gif|webp))/gi)) used.add(m[1]);
  const inNew = lang => {
    const s = new Set();
    for (const f of walk(CONTENT).filter(f => f.includes(`/${lang}/`))) for (const m of readFileSync(f, 'utf8').matchAll(/assets\/images\/([\w./-]+\.(?:jpe?g|png|gif|webp))/gi)) s.add(m[1]);
    return s;
  };
  const uk = inNew('uk'), en = inNew('en');
  for (const img of used) {
    if (!existsSync(join(ROOT, 'src/assets/images', img))) { fail('зображення', `${img} — файла немає в src/assets/images`); continue; }
    // емблема в новому дизайні — у шапці й підвалі, а не в тексті
    if (img === 'dino/emblem.png') { ok.images++; continue; }
    const miss = [!uk.has(img) && 'uk', !en.has(img) && 'en'].filter(Boolean);
    if (miss.length) fail('зображення', `${img} — не вжито у вмісті: ${miss.join(', ')}`); else ok.images++;
  }
}

// ── 4. переклади ──
const cyr = s => (s.match(/[а-яіїєґ]/gi) || []).length / Math.max(1, (s.match(/\p{L}/gu) || []).length);
for (const coll of ['news', 'pages', 'people']) {
  const ukDir = join(CONTENT, coll, 'uk');
  for (const f of walk(ukDir).filter(f => f.endsWith('.md')).map(f => relative(ukDir, f))) {
    const en = join(CONTENT, coll, 'en', f);
    if (!existsSync(en)) { fail('переклад', `${coll}/en/${f} — немає`); continue; }
    const body = readFileSync(en, 'utf8').replace(/\]\([^)]*\)/g, '');
    if (cyr(body) > 0.15) fail('переклад', `${coll}/en/${f} — переважно кирилиця (${Math.round(cyr(body) * 100)} %)`); else ok.translations++;
  }
  for (const f of walk(join(CONTENT, coll, 'en')).filter(f => f.endsWith('.md')).map(f => relative(join(CONTENT, coll, 'en'), f))) if (!existsSync(join(ukDir, f))) fail('переклад', `${coll}/en/${f} — немає українського оригіналу`);
}

// ── 5. внутрішні посилання зібраного сайту ──
const htmls = walk(DIST).filter(f => f.endsWith('.html'));
const seen = new Map();
for (const f of htmls) {
  const html = readFileSync(f, 'utf8');
  for (const m of html.matchAll(/\s(?:href|src)="([^"#?]+)[^"]*"/g)) {
    let u = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/.test(u) || !u) continue;
    let target;
    if (u.startsWith('/')) { if (BASE && !u.startsWith(BASE + '/') && u !== BASE) { fail('посилання', `${relative(DIST, f)} → ${u} (без базового шляху ${BASE})`); continue; } target = join(DIST, decodeURI(u.slice(BASE.length))); }
    else target = join(dirname(f), decodeURI(u));
    const key = target;
    if (!seen.has(key)) seen.set(key, existsSync(target) && (statSync(target).isFile() || existsSync(join(target, 'index.html'))));
    if (seen.get(key)) ok.links++; else fail('посилання', `${relative(DIST, f)} → ${u}`);
  }
}

const uniq = [...new Set(problems)];
console.log(`Сторінок за старими адресами: ${ok.pages}; документів: ${ok.files}; зображень: ${ok.images}; перекладів: ${ok.translations}; внутрішніх посилань: ${ok.links}`);
if (uniq.length) { console.log(`\nПроблем: ${uniq.length}`); uniq.slice(0, 200).forEach(p => console.log('  ' + p)); process.exit(1); }
console.log('Повнота вмісту: 100 %, непрацюючих внутрішніх посилань: 0');
