// Структуровані дані schema.org (JSON-LD) для пошуковиків.
import { T, url, type Lang } from './i18n';
import { ALUMNI, PROGRAMS, SKILLS } from './home';

const abs = (path: string, site: URL) => new URL(path, site).href;
const BASE = import.meta.env.BASE_URL;

export const orgId = (site: URL) => abs(url('uk', '/'), site) + '#org';

/** Кафедра як навчальний підрозділ університету + сайт із пошуком */
export function orgLd(lang: Lang, site: URL) {
  const t = T[lang], home = abs(url(lang, '/'), site);
  return [
    {
      '@context': 'https://schema.org', '@type': 'EducationalOrganization', '@id': orgId(site),
      name: t.dept, alternateName: lang === 'uk' ? 'Кафедра КІ ФРЕКС КНУ' : 'KNU Computer Engineering', url: home,
      logo: abs(BASE + 'logo.png', site), email: 'ce.frecs@knu.ua',
      address: { '@type': 'PostalAddress', streetAddress: lang === 'uk' ? 'просп. Академіка Глушкова, 4г' : '4g Akademika Hlushkova Ave', addressLocality: lang === 'uk' ? 'Київ' : 'Kyiv', postalCode: '03022', addressCountry: 'UA' },
      parentOrganization: {
        '@type': 'EducationalOrganization', name: t.faculty, url: 'https://rex.knu.ua/',
        parentOrganization: { '@type': 'CollegeOrUniversity', name: t.uni, url: 'https://knu.ua/' },
      },
      knowsAbout: SKILLS[lang].flatMap(g => g.items),
      alumni: alumniLd(lang, site),
    },
    {
      '@context': 'https://schema.org', '@type': 'WebSite', '@id': home + '#website', url: home, name: t.dept,
      inLanguage: lang === 'uk' ? 'uk-UA' : 'en-US', publisher: { '@id': orgId(site) },
      potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: home + '?q={search_term_string}' }, 'query-input': 'required name=search_term_string' },
    },
  ];
}

export function breadcrumbLd(lang: Lang, items: { name: string; path: string }[], site: URL) {
  const all = [{ name: T[lang].home, path: '/' }, ...items];
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: all.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(url(lang, c.path), site) })),
  };
}

export function articleLd(o: { lang: Lang; title: string; description: string; path: string; date: Date; image?: string; site: URL }) {
  const u = abs(url(o.lang, o.path), o.site);
  return {
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: o.title.slice(0, 110), description: o.description,
    datePublished: o.date.toISOString(), dateModified: o.date.toISOString(), inLanguage: o.lang === 'uk' ? 'uk-UA' : 'en-US',
    mainEntityOfPage: u, url: u, image: o.image ? [abs(o.image, o.site)] : undefined,
    author: { '@type': 'Organization', '@id': orgId(o.site), name: T[o.lang].dept },
    publisher: { '@type': 'Organization', '@id': orgId(o.site), name: T[o.lang].dept, logo: { '@type': 'ImageObject', url: abs(BASE + 'logo.png', o.site) } },
  };
}

export function personLd(o: { lang: Lang; name: string; role: string; path: string; image?: string; site: URL }) {
  return {
    '@context': 'https://schema.org', '@type': 'Person', name: o.name, jobTitle: o.role || undefined,
    url: abs(url(o.lang, o.path), o.site), image: o.image ? abs(o.image, o.site) : undefined,
    worksFor: { '@type': 'EducationalOrganization', '@id': orgId(o.site), name: T[o.lang].dept },
  };
}

/** Випускники зі сторінки «Наші випускники»: посада з роками — минула (лише опис), без років — поточна (jobTitle + worksFor) */
function alumniLd(lang: Lang, site: URL) {
  const page = abs(url(lang, '/graduates/'), site);
  return ALUMNI[lang].filter(a => a.who).map(a => {
    const past = /\d{4}\s*[–-]\s*\d{4}/.test(a.role ?? '');
    const brand = a.company.replace(/\s+(Inc\.|LLC|Ltd\.?)$/, '');
    const title = (a.role ?? '').split(/,\s*/).filter(x => x !== brand).join(', ');
    return {
      '@type': 'Person', name: a.who, url: a.anchor ? `${page}#${a.anchor}` : page,
      ...(past ? { description: a.role } : { jobTitle: title, worksFor: { '@type': 'Organization', name: a.company } }),
    };
  });
}

/** Три освітні програми спеціальності F7: рівень, тривалість, ліцензований обсяг набору */
export function programsLd(lang: Lang, site: URL) {
  const page = abs(url(lang, '/entrant/'), site);
  const credential = { uk: ['Бакалавр', 'Магістр', 'Доктор філософії'], en: ['Bachelor’s degree', 'Master’s degree', 'Doctor of Philosophy (PhD)'] }[lang];
  return PROGRAMS[lang].map((p, i) => ({
    '@context': 'https://schema.org', '@type': 'EducationalOccupationalProgram',
    name: `${p.title} (${p.level})`, url: page,
    educationalCredentialAwarded: credential[i],
    timeToComplete: `P${parseInt(p.years, 10)}Y`,
    maximumEnrollment: parseInt(p.places.replace(/\D+/g, ''), 10),
    occupationalCategory: lang === 'uk' ? 'F7 Комп’ютерна інженерія' : 'F7 Computer Engineering',
    provider: { '@type': 'EducationalOrganization', '@id': orgId(site), name: T[lang].dept },
  }));
}
