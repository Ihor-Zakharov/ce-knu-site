// Обробка HTML вмісту під час збирання:
//  • одиноке зображення з title → <figure> з <figcaption>;
//  • внутрішні посилання отримують базовий шлях і префікс мови (/en/…);
//  • домени без схеми («manf.org.ua») отримують https://;
//  • зовнішні посилання відкриваються в новій вкладці з rel="noopener";
//  • таблиці обгортаються для горизонтальної прокрутки на телефоні;
//  • курсивний абзац, що повторює підпис щойно оформленого фото, прибирається (підпис лишається у figcaption);
//  • посилання в пунктах списку отримують data-meta («PDF», «univ.kiev.ua») — тип і джерело документа в реєстрах;
//  • <!-- fold --> перед заголовком згортає розділ у <details>: заголовок стає підписом, поруч — кількість фото чи записів;
//    <!-- fold: Підпис --> згортає все від наступного заголовка до кінця батьківського розділу під власним підписом;
//  • <!-- sections --> у файлі: кожен розділ ## стає <section class="sec"> (реєстри, історії випускників).
import { visit, SKIP } from 'unist-util-visit';

const ASSET = /^\/(files|images|licenses)\//;
// на чинному сайті частина посилань — домени без схеми («manf.org.ua»); браузер вважає їх відносними
const BARE_DOMAIN = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:org|com|net|edu|gov|info|io|ua)(?:\/\S*)?$/i;

const MARK = /^<!--\s*(fold|sections)\b:?\s*([\s\S]*?)\s*-->$/;
const mark = n => n?.type === 'raw' && MARK.exec(n.value.trim());
const blank = n => n.type === 'text' && !n.value.trim();
const level = n => n?.type === 'element' && /^h[1-6]$/.test(n.tagName) ? +n.tagName[1] : 0;
const text = n => n.type === 'text' ? n.value : (n.children ?? []).map(text).join('');
const el = (tagName, className, children, props = {}) => ({ type: 'element', tagName, properties: { className, ...props }, children });
const count = (n, tag) => (n.tagName === tag ? 1 : 0) + (n.children ?? []).reduce((a, c) => a + count(c, tag), 0);
const plural = (n, one, few, many) => { const d = n % 10, h = n % 100; return d === 1 && h !== 11 ? one : d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many; };
function foldMeta(nodes, en, custom) {
  const box = { children: nodes };
  const img = count(box, 'img'), li = count(box, 'li');
  if (custom) { const min = Math.max(1, Math.round(nodes.map(text).join(' ').split(/\s+/).length / 180)); return en ? `${min} min read` : `${min} хв читання`; }
  if (img) return en ? `${img} photo${img > 1 ? 's' : ''}` : `${img} фото`;
  if (li) return en ? `${li} entr${li > 1 ? 'ies' : 'y'}` : `${li} ${plural(li, 'запис', 'записи', 'записів')}`;
  return '';
}
// згортання: коментар-позначка + заголовок і все до наступного заголовка того самого (або для власного підпису — вищого) рівня
function folds(children, en) {
  for (let i = 0; i < children.length; i++) {
    const m = mark(children[i]);
    if (!m || m[1] !== 'fold') { if (children[i].children) folds(children[i].children, en); continue; }
    let h = i + 1; while (h < children.length && blank(children[h])) h++;
    const lv = level(children[h]), custom = m[2];
    if (!lv) { children.splice(i, 1); i--; continue; }
    let end = h + 1; while (end < children.length && !(level(children[end]) && (custom ? level(children[end]) < lv : level(children[end]) <= lv)) && !mark(children[end])) end++;
    const body = children.slice(h, end), meta = foldMeta(body, en, custom);
    const head = custom ? [el('span', ['fold__t'], [{ type: 'text', value: custom }])] : [body.shift()];
    const summary = el('summary', undefined, [...head, ...(meta ? [el('span', ['fold__m'], [{ type: 'text', value: meta }])] : [])]);
    children.splice(i, end - i, el('details', ['fold'], [summary, el('div', ['fold__body'], body)]));
  }
}
// розділи: кожен ## (або згорнутий ##) з усім, що йде після нього, — у <section class="sec">
function sections(children) {
  const out = []; let cur = null;
  const isHead = n => level(n) === 2 || (n.tagName === 'details' && level(n.children?.[0]?.children?.[0]) === 2);
  for (const n of children) {
    if (mark(n)) continue;
    if (isHead(n)) { cur = el('section', ['sec'], []); out.push(cur); }
    (cur ? cur.children : out).push(n);
  }
  return out;
}

export default function rehypeSite({ base = '/' } = {}) {
  const b = base.replace(/\/$/, '');
  return (tree, file) => {
    const en = /[\\/]en[\\/][^\\/]+\.md$/.test(file.path || file.history?.[0] || '');
    const marks = tree.children.filter(mark).map(n => mark(n)[1]);
    if (marks.length) {
      folds(tree.children, en);
      if (marks.includes('sections')) tree.children = sections(tree.children);
    }
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'p' && parent && node.children.filter(c => !(c.type === 'text' && !c.value.trim())).length === 1) {
        const only = node.children.find(c => c.type === 'element');
        const img = only?.tagName === 'img' ? only : only?.tagName === 'a' && only.children.length === 1 && only.children[0].tagName === 'img' ? only.children[0] : null;
        if (img?.properties.title) {
          const caption = img.properties.title;
          delete img.properties.title;
          parent.children[index] = {
            type: 'element', tagName: 'figure', properties: { className: ['fig'] },
            children: [only, { type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: caption }] }],
          };
          // на чинному сайті підпис часто повторено курсивним абзацом одразу під фото
          let j = index + 1; while (j < parent.children.length && blank(parent.children[j])) j++;
          const dup = parent.children[j];
          if (dup?.tagName === 'p' && dup.children.filter(c => !blank(c)).length === 1 && dup.children.find(c => !blank(c))?.tagName === 'em' && text(dup).trim() === String(caption).trim()) parent.children.splice(index + 1, j - index);
          return SKIP;
        }
      }
      if (node.tagName === 'a' && typeof node.properties.href === 'string') {
        let href = node.properties.href;
        if (BARE_DOMAIN.test(href)) href = node.properties.href = 'https://' + href;
        if (parent?.tagName === 'li') {
          const meta = [/\.pdf(?:$|[?#])/i.test(href) && 'PDF', /^https?:\/\//.test(href) && new URL(href).hostname.replace(/^www\./, '')].filter(Boolean).join(' · ');
          if (meta) node.properties.dataMeta = meta;
        }
        if (/^https?:\/\//.test(href)) {
          node.properties.target = '_blank';
          node.properties.rel = ['noopener'];
        } else if (href.startsWith('/') && !href.startsWith('//')) {
          if (!ASSET.test(href)) {
            const [path, hash = ''] = href.split('#');
            href = (path.endsWith('/') || /\.\w+$/.test(path) ? path : path + '/') + (hash ? '#' + hash : '');
            if (en) href = '/en' + (href === '/' ? '/' : href);
          }
          node.properties.href = b + href;
        }
      }
      if (node.tagName === 'img') {
        node.properties.loading ??= 'lazy';
        node.properties.decoding = 'async';
      }
      if (node.tagName === 'table' && parent?.properties?.className?.[0] !== 'table') {
        parent.children[index] = { type: 'element', tagName: 'div', properties: { className: ['table'], tabIndex: 0, role: 'region', ariaLabel: 'Таблиця' }, children: [node] };
        return SKIP;
      }
    });
  };
}
