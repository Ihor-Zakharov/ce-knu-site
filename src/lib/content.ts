// Доступ до колекцій з урахуванням мови.
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { Lang } from './i18n';

export const slugOf = (id: string) => id.split('/').slice(1).join('/');

export async function news(lang: Lang) {
  const all = await getCollection('news', e => e.id.startsWith(lang + '/') && !e.data.draft);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}
export const page = (lang: Lang, slug: string) => getEntry('pages', `${lang}/${slug}`);
export async function people(lang: Lang) {
  const all = await getCollection('people', e => e.id.startsWith(lang + '/'));
  return all.sort((a, b) => a.data.order - b.data.order);
}
export type News = CollectionEntry<'news'>;
/** Справжнє фото новини: на чинному сайті частина оголошень має «обкладинкою» емблему — це заглушка, не фото; логотип чи таблиця (coverFit: contain) — теж не фото */
export const photo = (n: News) => (n.data.cover && n.data.coverFit === 'cover' && !/\/emblem\./.test(n.data.cover.src) ? n.data.cover : undefined);
export type Person = CollectionEntry<'people'>;
