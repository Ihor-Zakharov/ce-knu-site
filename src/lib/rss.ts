import rss from '@astrojs/rss';
import { T, url, type Lang } from './i18n';
import { news, slugOf } from './content';

export async function feed(lang: Lang, site: URL) {
  const list = await news(lang);
  return rss({
    title: `${T[lang].news} · ${T[lang].dept}`,
    description: T[lang].footNote,
    site,
    items: list.map(n => ({ title: n.data.title, pubDate: n.data.date, description: n.data.summary, link: url(lang, `/posts/${slugOf(n.id)}/`) })),
    customData: `<language>${lang === 'uk' ? 'uk-UA' : 'en-US'}</language>`,
  });
}
