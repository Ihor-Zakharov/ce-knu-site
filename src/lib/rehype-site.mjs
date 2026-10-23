// Обробка HTML вмісту під час збирання:
//  • одиноке зображення з title → <figure> з <figcaption>;
//  • внутрішні посилання отримують базовий шлях і префікс мови (/en/…);
//  • зовнішні посилання відкриваються в новій вкладці з rel="noopener";
//  • таблиці обгортаються для горизонтальної прокрутки на телефоні.
import { visit, SKIP } from 'unist-util-visit';

const ASSET = /^\/(files|images|licenses)\//;

export default function rehypeSite({ base = '/' } = {}) {
  const b = base.replace(/\/$/, '');
  return (tree, file) => {
    const en = /[\\/]en[\\/][^\\/]+\.md$/.test(file.path || file.history?.[0] || '');
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
          return SKIP;
        }
      }
      if (node.tagName === 'a' && typeof node.properties.href === 'string') {
        let href = node.properties.href;
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
