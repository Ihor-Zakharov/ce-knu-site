// Перенесення вмісту чинного сайту (Nikola, reStructuredText) у файли Markdown.
// Запуск: npm run migrate -- <шлях до current-site/ce>   (потрібен pandoc ≥ 3)
// Результат: src/content/{news,pages,people}/uk/*.md, src/assets/images/**, public/files/**.
// Англійські версії (en/) скрипт не чіпає — їх перекладають окремо.

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// чинний сайт: аргумент, або current-site/ce у корені репозиторію команди, або локальна копія поруч
// ../refs/merged/ce — копія з репозиторію керівника + новіші матеріали з живого ce.knu.ua (scripts/fetch-live.py)
const CANDIDATES = [process.argv[2], 'current-site/ce', '../current-site/ce', '../refs/merged/ce', '../refs/ce-knu-site-practice/current-site/ce'].filter(Boolean);
const SRC = resolve(ROOT, CANDIDATES.find(c => existsSync(resolve(ROOT, c, 'conf.py'))) ?? CANDIDATES[0]);
const FILTER = join(ROOT, 'scripts/nikola.lua');
if (!existsSync(join(SRC, 'conf.py'))) throw new Error(`Не знайдено сайт Nikola: ${SRC}`);

// ── метадані Nikola: «.. key: value» на початку файла ──────────────
function parse(file) {
  const text = readFileSync(file, 'utf8');
  const meta = {};
  const lines = text.split('\n');
  let i = 0;
  for (; i < lines.length; i++) {
    const m = lines[i].match(/^\.\. (\w+):(?!:)\s?(.*)$/);
    if (!m) { if (lines[i].trim() === '') continue; break; }
    meta[m[1]] = m[2].trim();
  }
  return { meta, body: lines.slice(i).join('\n') };
}

function toMarkdown(rst) {
  const prepared = rst.replace(/^(\s*)\.\. thumbnail::/gm, '$1.. figure::')
    // ініціал на початку рядка («I. Antoniuk», «А. М. Коновалов») pandoc інакше читає як нумерований список
    .replace(/^(\s*(?:[-*+]\s+)?)(\p{Lu})\.(\s)/gmu, '$1$2\\.$3');
  return execFileSync('pandoc', ['-f', 'rst', '-t', 'gfm+raw_html', '--wrap=none',
    '--shift-heading-level-by=1', '-L', FILTER], { input: prepared, encoding: 'utf8' })
    .replace(/\\&#39;/g, '’').replace(/(\p{L})\\`(\p{L})/gu, '$1’$2').replace(/&#39;/g, '’')
    // залишки rst-посилань, яких pandoc не розпізнав («`Текст <url>`__» одразу після лапок)
    .replace(/\\`([^`<\\]+?)\s*\\<(https?:\/\/[^>\\]+)\\>\\`\\_\\_/g, '[$1]($2)')
    .replace(/\\&amp;/g, '&')                                  // «\&amp;» у джерелі — це просто «&»
    .replace(/\[([^\]]+)\]\(#\)/g, '$1')                        // посилання-заглушки «<#>» — звичайним текстом
    .replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// фото без alt: підпис, інакше найближчий заголовок (для сторінок) або назва новини — «Фото: …»
function fillAlt(md, title, isPage) {
  let heading = null;
  return md.split('\n').map(line => {
    const h = line.match(/^#{1,4}\s+(.+)/); if (h) heading = h[1].replace(/[*_`]/g, '').trim();
    return line.replace(/!\[\]\(([^ )]+)(?: "([^"]*)")?\)/g, (_, p, cap) =>
      `![${(cap || 'Фото: ' + ((isPage && heading) || title).replace(/[.!]+$/, '')).replace(/[[\]]/g, '')}](${p}${cap ? ` "${cap}"` : ''})`);
  }).join('\n');
}

// одиноке фото, що далі на тій самій сторінці є ще раз (у галереї), — дубль: не переносимо
function dropDupes(md) {
  const blocks = md.split('\n\n');
  return blocks.filter((b, i) => { const m = b.trim().match(/^!\[[^\]]*\]\(([^ )]+)[^)]*\)$/); return !m || !blocks.slice(i + 1).some(x => x.includes(m[1])); }).join('\n\n');
}

// /images/a/b.jpg → відносний шлях від src/content/<колекція>/uk/ до src/assets/images
const IMG = '../../../assets/images/';
const relImages = md => md.replace(/\]\(\/images\//g, `](${IMG}`);

const yaml = v => JSON.stringify(v ?? '');
function frontmatter(obj) {
  const lines = Object.entries(obj).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) =>
    Array.isArray(v) ? `${k}: [${v.map(yaml).join(', ')}]` : `${k}: ${typeof v === 'string' ? yaml(v) : v}`);
  return `---\n${lines.join('\n')}\n---\n\n`;
}

const plain = md => md.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s*\(?<https?:\/\/[^>]+>\)?/g, '')
  .replace(/<[^>]+>/g, '').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim();
const clip = (s, n = 220) => s.length > n ? s.slice(0, s.lastIndexOf(' ', n)) + '…' : s;
const date = d => { const [y, m, dd] = (d || '').trim().slice(0, 10).trim().split('-'); return y ? [y, m.padStart(2, '0'), dd.padStart(2, '0')].join('-') : ''; };

// маскот на початку сторінки: перше зображення dino-*.png → у метадані
function takeMascot(md) {
  const m = md.match(/!\[([^\]]*)\]\(\/images\/dino\/(dino-[\w-]+\.png)[^)]*\)\n*/);
  if (!m || md.indexOf(m[0]) > 400) return { md };
  return { md: md.replace(m[0], ''), mascot: IMG + 'dino/' + m[2], mascotAlt: m[1] };
}

const out = (coll, slug, content) => {
  const file = join(ROOT, 'src/content', coll, 'uk', `${slug}.md`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};
const report = { news: 0, pages: 0, people: 0, images: 0, files: 0 };

// ── новини ─────────────────────────────────────────────────────────
for (const f of readdirSync(join(SRC, 'posts')).filter(f => f.endsWith('.rst')).sort()) {
  const { meta, body } = parse(join(SRC, 'posts', f));
  const [teaserPart] = body.split('.. TEASER_END');
  let md = toMarkdown(body);
  const teaser = md.match(/<!-- teaser: \/images\/([^ ]+) -->/);
  md = md.replace(/<!-- teaser:[^>]*-->\n*/g, '');
  const firstImg = md.match(/\]\(\/images\/([^)\s"]+)/);
  const cover = teaser?.[1] || firstImg?.[1];
  const summary = clip(plain(toMarkdown(teaserPart).replace(/<!--[^>]*-->/g, ''))) || clip(plain(md));
  out('news', meta.slug, frontmatter({
    title: meta.title, date: date(meta.date), summary,
    cover: cover && IMG + cover, coverAlt: cover ? meta.title : undefined,
    tags: meta.tags ? meta.tags.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    legacy: `/posts/${meta.slug}/`, source: `posts/${f}`,
  }) + relImages(fillAlt(md, meta.title, false)));
  report.news++;
}

// ── сторінки ───────────────────────────────────────────────────────
// сторінки першого рівня + вкладені (pages/research/llm-memory-group.rst → /research/llm-memory-group/)
const pageFiles = readdirSync(join(SRC, 'pages')).filter(f => f.endsWith('.rst'))
  .concat(readdirSync(join(SRC, 'pages'), { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'personas')
    .flatMap(d => readdirSync(join(SRC, 'pages', d.name)).filter(f => f.endsWith('.rst')).map(f => `${d.name}/${f}`)));
for (const f of pageFiles) {
  const { meta, body } = parse(join(SRC, 'pages', f));
  const parent = f.includes('/') ? f.split('/')[0] + '/' : '';
  let { md, mascot, mascotAlt } = takeMascot(toMarkdown(body));
  // на сторінці «Персоналії» список людей рендерить компонент із колекції people
  if (meta.slug === 'personas') md = '';
  if (meta.slug === 'index') md = md.replace(/!\[[^\]]*\]\(\/images\/dino\/emblem\.png[^)]*\)\n*/, '');
  out('pages', parent + meta.slug, frontmatter({
    title: meta.title, description: clip(plain(md), 160), mascot, mascotAlt,
    legacy: meta.slug === 'index' ? '/' : `/${parent}${meta.slug}/`, source: `pages/${f}`,
  }) + relImages(fillAlt(dropDupes(md), meta.title, true)));
  report.pages++;
}

// ── персоналії: порядок, група й короткий опис — зі списку personas.rst ──
const list = parse(join(SRC, 'pages/personas.rst')).body;
const people = [];
let group = '';
const blocks = list.split(/\n(?=\S)/);
blocks.forEach((b, i) => { if (/^\*{3,}\s*$/.test(b) && i) group = blocks[i - 1].trim(); });
group = '';
for (const [i, b] of blocks.entries()) {
  if (/^\*{3,}\s*$/.test(blocks[i + 1] ?? '')) { group = b.trim(); continue; }
  if (!b.startsWith('.. container:: row')) continue;
  const photo = b.match(/\.\. image:: \/images\/personas\/([\w-]+\.\w+)/)?.[1];
  const link = b.match(/`([^<`]+?)\s*<\/personas\/([\w-]+)\/?>`__/);
  const name = link ? link[1].trim() : b.split('\n').map(s => s.trim()).find(s => s && !s.startsWith('..') && !s.startsWith(':') && !s.startsWith('*'));
  const role = b.match(/^\s+\*(.+)\*\s*$/m)?.[1].trim();
  const slug = link?.[2] || basename(photo || name, '.jpg');
  const clean = name.replace(/^`(.+?)\s*<[^>]*>`__$/, '$1');
  people.push({ slug, name: clean, group, role, photo, hasPage: !!link });
}
// сторінки, яких немає в списку (напр. salnikov), — теж переносимо, але без місця у списку
for (const f of readdirSync(join(SRC, 'pages/personas'))) {
  const slug = basename(f, '.rst');
  if (people.some(p => p.slug === slug)) continue;
  people.push({ slug, name: parse(join(SRC, 'pages/personas', f)).meta.title, group: '', unlisted: true,
    role: readFileSync(join(SRC, 'pages/personas', f), 'utf8').match(/^\s+\*(.+)\*\s*$/m)?.[1].trim(),
    photo: existsSync(join(SRC, 'images/personas', `${slug}.jpg`)) ? `${slug}.jpg` : undefined, hasPage: true });
}
const groups = [...new Set(people.filter(p => !p.unlisted).map(p => p.group))];
people.forEach((p, i) => {
  let md = '';
  const page = join(SRC, 'pages/personas', `${p.slug}.rst`);
  if (existsSync(page)) {
    md = toMarkdown(parse(page).body)
      .replace(/^!\[[^\]]*\]\(\/images\/personas\/[^)]+\)\n+/, '')   // фото — у метадані
      .replace(/^\*[^\n]+\*\n+/, '');                                // посада — у метадані
  }
  out('people', p.slug, frontmatter({
    name: p.name, group: p.group, groupOrder: groups.indexOf(p.group), order: i,
    unlisted: p.unlisted || undefined, role: p.role, photo: p.photo && IMG + 'personas/' + p.photo,
    legacy: p.hasPage ? `/personas/${p.slug}/` : undefined, source: existsSync(page) ? `pages/personas/${p.slug}.rst` : undefined,
  }) + relImages(md));
  report.people++;
});

// ── зображення й документи — як є; стиснення робить збирання (astro:assets) ──
cpSync(join(SRC, 'images'), join(ROOT, 'src/assets/images'), { recursive: true });
cpSync(join(SRC, 'files'), join(ROOT, 'public/files'), { recursive: true });
const count = d => readdirSync(d, { recursive: true, withFileTypes: true }).filter(e => e.isFile()).length;
report.images = count(join(SRC, 'images'));
report.files = count(join(SRC, 'files'));
console.log('Перенесено:', report);
