// Теми новин: ключ — у фронтматері новини (`tags: [science, awards]`, однаковий в uk і en), назви — тут.
// Нову тему додають сюди й лише сюди; фільтр на сторінці «Новини» підхоплює її сам.
import type { Lang } from './i18n';

export const TOPICS = ['science', 'awards', 'partners', 'events', 'admission', 'study', 'department'] as const;
export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABEL: Record<Topic, Record<Lang, string>> = {
  science: { uk: 'Наука', en: 'Research' },
  awards: { uk: 'Нагороди', en: 'Awards' },
  partners: { uk: 'Партнери', en: 'Partners' },
  events: { uk: 'Конференції й лекції', en: 'Conferences and lectures' },
  admission: { uk: 'Вступ і студенти', en: 'Admission and students' },
  study: { uk: 'Навчальний процес', en: 'Teaching' },
  department: { uk: 'Життя кафедри', en: 'Department life' },
};
