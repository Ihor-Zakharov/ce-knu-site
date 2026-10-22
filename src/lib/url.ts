import { getRelativeLocaleUrl } from 'astro:i18n';
import { defaultLang, languages, type Lang } from '@/i18n/ui';

// The site lives under a base path on GitHub Pages (/<repo>/), so internal links must never
// start with a bare "/". Build them with these helpers instead.

const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

/** URL of a file from `public/` or another path outside the language tree. */
export function withBase(path: string): string {
  return base + path.replace(/^\//, '');
}

/** URL of a page in the given language, e.g. `localizedUrl('en', 'news/')` -> `/en/news/`. */
export function localizedUrl(lang: Lang, path = ''): string {
  return getRelativeLocaleUrl(lang, path.replace(/^\//, ''));
}

/** Path of the current page without the base and the language prefix. */
export function pathWithoutLang(pathname: string): string {
  let rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, '');
  for (const lang of Object.keys(languages)) {
    if (lang === defaultLang) continue;
    if (rest === lang || rest.startsWith(`${lang}/`)) {
      rest = rest.slice(lang.length + 1);
      break;
    }
  }
  return rest;
}

/** The same page in another language. */
export function translatedUrl(pathname: string, lang: Lang): string {
  return localizedUrl(lang, pathWithoutLang(pathname));
}
