// Колекції вмісту. Кожен файл — окрема новина, сторінка чи людина; мова — підкаталог uk/ або en/.
// Схема перевіряється під час збирання: пропущене обов'язкове поле зупиняє збирання з поясненням.
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// id = «uk/назва-файла» без зміни регістру: адреси новин чинного сайту збережено (/posts/FortiNet/)
const generateId = ({ entry }: { entry: string }) => entry.replace(/\.md$/, '');
const loader = (dir: string) => glob({ pattern: '{uk,en}/*.md', base: `./src/content/${dir}`, generateId });

const news = defineCollection({
  loader: loader('news'),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().default(''),
    cover: image().optional(),
    coverAlt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    legacy: z.string().optional(),
    source: z.string().optional(),
  }),
});

const pages = defineCollection({
  loader: loader('pages'),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string().default(''),
    mascot: image().optional(),
    mascotAlt: z.string().optional(),
    legacy: z.string().optional(),
    source: z.string().optional(),
  }),
});

const people = defineCollection({
  loader: loader('people'),
  schema: ({ image }) => z.object({
    name: z.string(),
    group: z.string().default(''),
    groupOrder: z.number().default(99),
    order: z.number().default(99),
    role: z.string().default(''),
    photo: image().optional(),
    unlisted: z.boolean().default(false),
    legacy: z.string().optional(),
    source: z.string().optional(),
  }),
});

export const collections = { news, pages, people };
