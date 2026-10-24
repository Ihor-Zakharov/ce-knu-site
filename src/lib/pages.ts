// Структура внутрішніх сторінок (дослідження, НМЗ, документи, випускники, навчання): короткі блоки над повним текстом.
// Факти — лише з src/content/pages/*/research.md і graduates.md; повний текст сторінки лишається нижче без змін.
import type { Lang } from './i18n';

export const UI: Record<Lang, Record<string, string>> = {
  uk: {
    toc: 'На сторінці', full: 'Повний текст', facts: 'Досягнення', dirs: 'Напрями досліджень', group: 'Дослідницька група',
    groupMore: 'Сторінка групи', alumni: 'Випускники', story: 'Історія', docs: 'Документи', books: 'Публікації за роками',
  },
  en: {
    toc: 'On this page', full: 'Full text', facts: 'Achievements', dirs: 'Research areas', group: 'Research group',
    groupMore: 'Group page', alumni: 'Alumni', story: 'Story', docs: 'Documents', books: 'Publications by year',
  },
};

/** Дослідження: головне з research.md у чотирьох картках */
export const RESEARCH_FACTS: Record<Lang, { value: string; label: string }[]> = {
  uk: [
    { value: 'Перший', label: 'в Україні обчислювальний кластер (суперкомп’ютер) для фундаментальних і прикладних наук' },
    { value: '2018', label: 'Державна премія України в галузі науки і техніки: проф. С. Д. Погорілий, доц. Ю. В. Бойко' },
    { value: '5 кластерів', label: 'у першому сегменті Українських академічних грід-ресурсів: КНУ та інститути НАН України' },
    { value: '2018', label: 'Премія Президента України для молодих вчених: А. О. Сальніков, Є. А. Слюсар' },
  ],
  en: [
    { value: 'First', label: 'computing cluster (supercomputer) in Ukraine for fundamental and applied science' },
    { value: '2018', label: 'State Prize of Ukraine in Science and Technology: Prof. S. D. Pohorilyi, Assoc. Prof. Yu. V. Boiko' },
    { value: '5 clusters', label: 'in the first segment of the Ukrainian Academic Grid: KNU and institutes of the NAS of Ukraine' },
    { value: '2018', label: 'President of Ukraine’s Prize for Young Scientists: A. O. Salnikov, Ye. A. Sliusar' },
  ],
};

export const RESEARCH_DIRS: Record<Lang, string[]> = {
  uk: ['Високопродуктивні й розподілені системи', 'Системи цифрового зв’язку', 'Суперкомп’ютери й методологія HPC', 'ШІ та машинне навчання: LLM, NLP, комп’ютерний зір'],
  en: ['High-performance and distributed systems', 'Digital communication systems', 'Supercomputers and HPC methodology', 'AI and machine learning: LLMs, NLP, computer vision'],
};
