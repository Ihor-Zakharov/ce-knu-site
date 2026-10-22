# AGENTS.md: ce.knu.ua v2 (Department of Computer Engineering website)

Shared rules for every coding agent (Claude Code, Antigravity, Copilot) and every person on the team.
Keep this file short. Change it only through a PR that the team has approved.

## Project

- Static bilingual site: Ukrainian is the default (URLs at the root `/`), English lives under `/en/`.
- Stack: Astro 7, TypeScript (strict), plain CSS with design tokens. React (`.tsx`) only for
  interactive islands; everything that is just content is an `.astro` component. No Tailwind, no UI kit.
- Runtime: Node 24 (`.nvmrc`). Package manager: npm only; commit `package-lock.json`.
- TypeScript: `typescript` 6.x is used by `astro check`, ESLint and the editor; TypeScript 7
  (`typescript-7`, native compiler) runs `npm run typecheck`. Do not upgrade `typescript` to 7 until
  `@astrojs/check` and `typescript-eslint` support it.
- Hosting: GitHub Pages under a base path (`/ce-knu-site/`), later the department's Apache server at `/`.
  Build every internal link with `src/lib/url.ts` (`localizedUrl`, `translatedUrl`, `withBase`).
  Never write an internal href that starts with `/`.

## Commands

- `docker compose up`: dev server in Docker on http://localhost:4321 (any OS).
- `docker compose up --build site`: production build on Apache on http://localhost:4322.
- `npm ci`, then `npm run dev`: the same dev server without Docker.
- `npm run build`: production build into `dist/`.
- `npm run check`: `astro check` (types in `.astro`, `.ts`, content) plus TypeScript 7; 0 errors required.
- `npm run lint`: ESLint + Stylelint + Prettier check. `npm run format` fixes formatting.
- `npm run validate:html`: html-validate on `dist/` (run after `build`).
- `npm run verify`: lint, check, build and HTML validation in CI order. Run it before calling a task done.

## Repository map

- `src/pages/`: routes only. A page file picks the view and passes data; no markup or styles here.
- `src/views/`: page bodies shared by both languages (`HomePage.astro`).
- `src/layouts/`: `BaseLayout.astro` (html shell, meta, hreflang, skip link, header, footer).
- `src/components/`: reusable UI (`.astro`); React islands go in `src/components/islands/` (`.tsx`).
- `src/i18n/ui.ts`: UI strings for both languages; a key missing in one language is a type error.
- `src/lib/`: helpers (`url.ts`).
- `src/styles/tokens.css`: the ONLY file with raw design values. `global.css`: reset and base styles.
- `public/`: files served as-is (`.htaccess` for Apache, `.nojekyll` for GitHub Pages, icons).
- `scripts/`: project scripts (`docker-dev.sh` starts the dev container).

## How agents work in this repo

- Start from the linked GitHub issue: read its acceptance criteria, state a short plan, then edit.
- Touch only the files the task needs. Do not refactor unrelated code or reformat whole files.
- If a rule here blocks the task, stop and ask the human instead of working around it.
- Before finishing: run `npm run verify` and report the result.

## Code rules

- TypeScript everywhere (`.ts`, `.tsx`, typed `Props` in `.astro`); no `any`, no `@ts-ignore`.
- One component per file, typed `Props` interface, scoped `<style>`, no global side effects.
- React island: `.tsx` in `src/components/islands/`, rendered with `client:visible` or `client:idle`
  (never `client:load` without a reason in the PR). Menu, language switcher and plain content stay
  without JavaScript. Every island adds JS to its page: mention the size in the PR.
- UI text only through `src/i18n/ui.ts`, in both languages in the same PR.
- Images through `astro:assets` (`<Image>`/`<Picture>`) with `alt` in the page language (`alt=""` if decorative).

## Design system rules

- Style only with tokens: `--color-*`, `--space-*`, `--font-*`, `--text-*`, `--leading-*`, `--weight-*`,
  `--size-*`, `--radius-*`, `--duration-*`, `--ease-*`, `--z-*`. No hex/rgb/hsl/oklch values or raw
  font sizes outside `tokens.css` (Stylelint fails the build).
- Adding or changing a token is a `design` PR reviewed by the Designer.
- Motion: CSS transitions and View Transitions only, durations and easings from tokens, always with a
  `prefers-reduced-motion` fallback. No animation library without an approved issue.
- Mobile first. Check widths 360, 768 and 1440 px in both languages.

## Accessibility and performance (WCAG 2.1 AA)

- Semantic HTML first: landmarks, one `h1` per page, ordered headings, skip link, visible focus,
  keyboard-operable menus, correct `lang`, text contrast >= 4.5:1, no information by color only.
- Lighthouse >= 90 in all four categories on mobile and desktop; axe: 0 serious or critical issues.

## Git and pull requests

- Never push to `main` (it is protected). Never force-push a branch someone else uses.
- Branch: `<type>/<issue#>-<short-kebab>`; types `feature`, `fix`, `content`, `design`, `ci`, `test`,
  `docs`, `chore`. Example: `feature/12-news-page`.
- PR title: Conventional Commits in English, lower-case summary in imperative mood:
  `feat(news): add news list page`. Types: `feat`, `fix`, `content`, `style`, `a11y`, `perf`, `test`,
  `ci`, `docs`, `refactor`, `build`, `chore`, `revert`. PRs are squash-merged; the title becomes the commit.
- One issue per PR, linked with `Closes #N`. Keep code PRs under ~400 changed lines.
- Fill in the PR template, including the AI usage section. No AI trailers in commits.

## Definition of done

- Acceptance criteria of the issue met; `npm run verify` passes; CI is green.
- Both languages updated; no hardcoded UI strings; no raw style values.
- At least one teammate approved and every review conversation is resolved.
- The author can explain every changed line, including AI-generated code, at the exam.

## Never

- Commit or paste into an agent: secrets, tokens, `.env*`, passwords, personal data that is not already
  public on the current site.
- Edit `dist/`, `.astro/`, `node_modules/` or the lockfile by hand.
- Disable, skip or loosen lint rules, type checks, tests or CI checks to make a PR pass.
- Add analytics, trackers, external CDNs or fonts, or new npm dependencies without an approved issue.
- Run destructive commands (`git reset --hard`, `git push --force`, `rm -rf` outside `dist/`) without asking.
