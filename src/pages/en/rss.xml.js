import { feed } from '../../lib/rss';
export const GET = ({ site }) => feed('en', site);
