<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Conventions

### Scope

This is **inova.class**, a gamified classroom management platform (an alternative to Classcraft), started from [next-boilerplate](https://github.com/diasjoaovitor/next-boilerplate). Choices outside the toolchain and the UI layer (database, ORM, auth, data fetching, state management, hosting) are made per task and recorded in the issue that introduces them. The one opinion on the UI side is **shadcn/ui** as the component library, with its theme and Tailwind's default palette kept as they come (see Styling & UI).

### Package manager

- Use **pnpm** only (not npm/yarn).
- Versions are pinned exact (no `^`/`~`) only for `dependencies` and `devDependencies` in `package.json`, no exceptions there. Install new deps with `pnpm add -E <pkg>` (or `pnpm add -D -E <pkg>` for dev deps) — never hand-edit version strings.
- `-E` only takes effect when no version is given. `pnpm add -E <pkg>@<version>` (or `@latest`) and packages already in `package.json` still get a `^`. In those cases, remove the carets right after (`sed -i -E 's/"\^([0-9])/"\1/' package.json`) and run `pnpm install`.
- The exact-version rule does not apply to MCP servers (`.mcp.json`) or `package.json` scripts, which may use `@latest` (e.g. `pnpm dlx shadcn@latest`, `pnpm dlx @playwright/mcp@latest`). They must still run through pnpm, never `npx`.
- Node version is pinned in `.nvmrc` (`lts/krypton`) for local use and in `engines.node` (`24.x`) in `package.json` for hosts that ignore `.nvmrc` (e.g. Vercel). Keep both on the same major.
- On Vercel, set `ENABLE_EXPERIMENTAL_COREPACK=1` (Production and Preview) so the build uses the exact pnpm version from `packageManager`; without it Vercel picks pnpm from the lockfile version.
- `@/*` resolves to `src/*` (`tsconfig.json`).

### Project structure

- `src/app` holds frontend-exclusive content only — there's no top-level `src/components` or `src/helpers`, that shared code lives under `src/app` instead.
- Anything that isn't frontend-exclusive (e.g. `src/tests`, and any future non-frontend folder) lives directly under `src`, as a sibling of `app`, not nested inside it.
- Routes are grouped under `src/app/(pages)` (a route group, so it doesn't affect the URL).
- Shared frontend code lives in `src/app/components`, React hooks in `src/app/hooks` and other helpers in `src/app/helpers` (create them when the first one is needed). The `lib` alias in `components.json` points to `src/app/lib`, which doesn't exist: if the shadcn CLI ever creates something there, keep it in `lib` or move it to `helpers` case by case.
- There are no `index.ts` barrels: import each module directly from its file through the `@/` alias (e.g. `@/app/components/ui/shadcn/button`). Barrels cause circular imports, give two import paths for the same module and make Vite/Vitest load every re-exported module.
- `src/app/components` groups components by role: `ui/` for visual building blocks (shadcn ones under `ui/shadcn/`, our own under `ui/custom/`), `blocks/` for composed pieces reused across pages, grouped by domain (e.g. `blocks/post/`; a block that belongs to no domain stays directly in `blocks/`), `providers/` for context providers without UI of their own and `layouts/` for page shells.
- A layout lives in its own folder (`layouts/<name>/index.tsx`), with the parts only it uses in a private `_components/` folder next to it. Code outside the layout imports only `layouts/<name>`, never its `_components/`. The same goes for a route: parts used by a single page live in a `_components/` folder next to it.
- `favicon.ico` stays directly in `src/app/`, not nested in a route group.
- React Compiler is enabled (`reactCompiler: true` in `next.config.ts`, `babel-plugin-react-compiler` devDependency).

### Database & local services

- Postgres with **Drizzle ORM** and the `pg` (node-postgres) driver, so the same code runs against the local container and Neon in preview/production. `drizzle-orm` and `drizzle-kit` are on the `1.0.0` release candidate (installed from the `@rc` tag, as the current Drizzle docs do): check the types in `node_modules/drizzle-orm` before reaching for a v0 API (e.g. `drizzle()` no longer takes `schema`, and the config has no `casing`).
- Infrastructure lives in `src/infra`: `compose.yml` declares the local services (Docker Compose, not `docker-compose.yml`), `scripts/` holds the startup helpers and `database/` holds `client.ts`, `schema.ts` and the generated `migrations/`. `drizzle.config.ts` stays at the root, where `drizzle-kit` looks for it.
- Tables are declared with `snakeCase.table(...)` from `drizzle-orm/pg-core`, so camelCase keys map to snake_case columns.
- Schema changes go through `pnpm migrations:generate --name <name>`, and the generated folder is committed. Don't edit a migration that was already applied; generate a new one.
- `pnpm dev` is the startup script: `services:up` → `services:wait:database` → `migrations:up` → `next dev`. The compose services have no healthcheck because readiness is the wait script's job. Playwright's `webServer` (and so the pre-push hook and CI) goes through the same `pnpm dev`, so CI needs no service container.
- Local settings live in the committed `.env.development` (only the local container's credentials, no secrets). There is no `.env`/`.env.example`. The compose services read it through `env_file`, so the `POSTGRES_*` values are declared once there; `DATABASE_URL` repeats them literally (`process.loadEnvFile` doesn't expand variables), so keep both in sync. `drizzle.config.ts` and the wait script load `.env.development` only when `DATABASE_URL` isn't already set, so hosted environments keep their injected value. `drizzle.config.ts` prefers `DATABASE_URL_UNPOOLED` (Neon's direct connection) over the pooled `DATABASE_URL`.
- The git-ignored `.env.local` (created by `vercel link`) holds only the `VERCEL_OIDC_TOKEN`. Don't `vercel env pull` the Neon variables into it: `.env.local` takes precedence over `.env.development`, so `next dev` would hit Neon. The Neon integration is connected to Production and Preview only, not Development.

### Deployment

- Vercel project `inova-class` (scope `diasjoaovitors-projects`), linked to the GitHub repository: `main` deploys to Production, pull requests to Preview. Postgres is Neon, provisioned through the Vercel Marketplace (`vercel integration add neon`), in `gru1`.
- `vercel.json` holds the Vercel settings: the build command `pnpm migrations:up && pnpm build` (migrations run before every deployment, not in the `build` script, so a local `pnpm build` never migrates) and `regions: ["gru1"]`, which keeps the functions next to the database.
- Each Preview deployment gets its own Neon branch, so a pull request's migrations never reach the production database.
- Hosted environment variables (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `ENABLE_EXPERIMENTAL_COREPACK`) are listed in the Deployment section of `README.md`; keep that table in sync when adding one.

### Linting & formatting

- ESLint uses native flat config (`eslint.config.mjs`), extending the `core-web-vitals`/`typescript` configs from `eslint-config-next`, plus `eslint-plugin-unicorn`, `eslint-plugin-simple-import-sort`, `eslint-plugin-tailwindcss`, `eslint-plugin-promise`, `eslint-plugin-prefer-arrow-functions`, `eslint-config-prettier`, and `@eslint/json`/`@eslint/markdown` for JSON/Markdown files. Markdown files use the `gfm` language with `frontmatter: 'yaml'`, so the frontmatter of issue templates (or any Markdown content) isn't parsed as Markdown. `eslint-plugin-tailwindcss` rule docs are in `node_modules/eslint-plugin-tailwindcss/docs/rules/` — check there before overriding a Tailwind lint rule.
- `eslint-plugin-unicorn@74` declares a peer of `eslint >=10.4`, but the project stays on ESLint 9 (`9.39.5`). The peer is unmet (`pnpm peers check` reports it, and depending on the pnpm version install warns `Issues with peer dependencies found`), but `pnpm eslint:check` passes. Don't bump one without validating the other.
- `next lint` no longer exists (removed in Next.js 16). Use `pnpm eslint:check` / `pnpm eslint:fix` and `pnpm prettier:check` / `pnpm prettier:fix`.
- `pnpm type-check` runs `next typegen` first: globals such as `LayoutProps` are generated into `.next/types`, so a clean checkout (CI, fresh clone) fails `tsc --noEmit` without it.
- Prettier style: single quotes, no semicolons, no trailing commas (`.prettierrc`).
- Base indentation/whitespace rules (2 spaces, LF, trim trailing whitespace, final newline) are enforced editor-side via `.editorconfig`.

### Code comments

- Comments only record **why** a decision was made, ideally with a reference (docs link, issue number, upstream bug). Never write comments that explain what the code does or how it works.
- Default to no comment. Add one only for a non-obvious choice that someone might "fix" by mistake.
- Write comments in English.

### Git hooks (husky)

- `pre-commit`: runs `lint-staged` (`lint-staged.config.js`) — prettier + eslint + `vitest related --passWithNoTests` scoped per staged file type, invoked directly via `pnpm exec` rather than through `package.json` scripts.
- `commit-msg`: auto-prepends the emoji prefix from the Commit Rules below based on the leading word (e.g. `feat: ...` → `✨ feat: ...`), then runs `commitlint` (`commitlint-config-emoji-convention`). You can type the plain word and let the hook add the emoji.
- `pre-push`: runs `pnpm type-check` and `pnpm test:e2e` (full Playwright suite).

### Testing

- Unit tests: **Vitest** (`vitest.config.mts`), `jsdom` environment, native Vite `resolve.tsconfigPaths` (no `vite-tsconfig-paths` plugin needed). Only picks up `src/**/*.test.{ts,tsx}`. Component tests use `@testing-library/react` / `@testing-library/dom`. `vitest.setup.ts` (`setupFiles`) runs Testing Library's `cleanup` after every test, so test files don't repeat `afterEach(cleanup)`.
- E2E tests: **Playwright** (`playwright.config.ts`), tests live in `src/tests/e2e`, single `chromium` project, `webServer` auto-starts `pnpm dev` against `http://localhost:3000`. Failure artifacts go to `test-results/` (git- and ESLint-ignored). There are no global retries: a known flaky test gets `test.describe.configure({ retries })` in its own `describe`, with a comment linking the issue that tracks it.
- Only test logic we wrote (filtering, lookups, mappings, transforms). Don't test library or framework behavior (e.g. a component that only passes props or HTML through, schema defaults, `Link` routing), and drop a test whose main cost is a mock needed only to render. Prefer a unit test; add an e2e test only for what a unit test can't cover.
- Scripts: `pnpm test` (unit, run once) / `pnpm test:watch` (unit, watch mode) / `pnpm test:e2e` (e2e) / `pnpm test:e2e:ui` (e2e, Playwright UI mode).
- CI (`.github/workflows/ci.yml`, triggered on `pull_request`) runs, in order: `commitlint` over the PR's commit range, `pnpm type-check`, `pnpm eslint:check`, `pnpm prettier:check`, `pnpm test`, then installs Chromium (`pnpm exec playwright install --with-deps chromium`) and runs `pnpm test:e2e`.

### Styling & UI

- Tailwind CSS v4 (`@tailwindcss/postcss` only — no `autoprefixer`/`postcss`, v4 uses Lightning CSS internally). Global styles live in `src/app/styles/globals.css`, which also imports `tw-animate-css` and the shadcn base stylesheet (`shadcn/tailwind.css`).
- Dark mode follows the system preference: the `dark:` variant is bound to `prefers-color-scheme` (`@custom-variant dark (@media (prefers-color-scheme: dark))`) and the dark tokens are redefined on `:root` inside the same media query, instead of shadcn's `.dark` class. A project that needs a manual theme toggle switches both to a class (e.g. with `next-themes`).
- Don't retint the default colors: keep the shadcn tokens in `globals.css` (`neutral` base color) and Tailwind's palette as they come, and pick an existing palette color instead of a custom shade (e.g. `teal-500`, not a tinted `oklch(...)`). Prefer the shadcn tokens (`bg-background`, `text-muted-foreground`, `border-border`, ...) for surfaces and text, so both themes stay consistent. Where CSS variables can't be read (a canvas, `ImageResponse`), copy the palette value and name it in a comment.
- **shadcn/ui** (`components.json`, style `base-nova`, base color `neutral`, icon library `lucide`) is the component library: reach for a shadcn component before writing one from scratch. `Button` and `Card` are in place so far (`src/app/components/ui/shadcn/{button,card}.tsx`). Add components with `pnpm shadcn:add <name>` (wraps `pnpm dlx shadcn@latest add`) — aliases and target paths are in `components.json`. Components from other shadcn registries are added the same way (`pnpm shadcn:add @<registry>/<name> --path src/app/components/ui/<registry>`), after declaring the registry in `components.json`; pin any dependency the CLI installs with `^`.
- Links that need to look like a `Button` (e.g. external CTAs) must stay plain `<a>`/`Link` elements styled with the exported `buttonVariants(...)` helper, not `Button` itself — Base UI's `Button` enforces button semantics (`role="button"`, keyboard handling) and its own docs say not to render links through it.
- Supporting libs: `@base-ui/react` (headless primitives), `class-variance-authority` for variant styling, `cn` for the `cn()` class-merging helper (imported directly from the `cn` package, as the shadcn components do; there is no `lib/utils.ts` re-export, see https://ui.shadcn.com/docs/changelog/2026-09-cn), `lucide-react` for icons. Before wiring up a Base UI primitive, check its docs in `node_modules/@base-ui/react/docs/react/` (`components/`, `utils/`, `handbook/`) for its semantics/keyboard behavior — component APIs there may differ from other headless UI kits.

## Development Workflow

The end-to-end flow (planning, issues, branches, commits, pull requests and closing) is described in [`docs/development-workflow.md`](./docs/development-workflow.md). Follow it for any issue.

## Branch Rules

Work for an issue is committed on a new branch, never directly on `main`. Branch names follow `<scope>/<title>#<issue>`, or `<scope>(<target>)/<title>#<issue>` when the work is very specific:

- `<scope>` is one of the semantic prefixes from the Commit Rules below, without the emoji (`feat`, `fix`, `docs`, `chore`, ...).
- `(<target>)` is optional: the page, component or other specific area the work touches (e.g. `home`, `card`).
- `<title>` is a short, lowercase, hyphen-separated summary in English.
- `#<issue>` is the number of the associated issue.

Examples: `feat/home-page#3`, `fix(card)/focus-ring#7`. Parentheses and `#` are special characters in shells, so quote the branch name in commands (e.g. `git switch -c 'fix(card)/focus-ring#7'`).

## Issue Rules

Before closing an issue, tick every completed checklist item (`- [x]`) in its body, e.g. with `gh issue edit <number> --body-file <file>`. Don't close an issue that still has unchecked items unless they were dropped or moved, and say so in the closing comment.

## Documentation Rules

`AGENTS.md` and `README.md` record only project conventions: what to do, where things live and how to handle a given case. Answers to the user's one-off questions (e.g. "why don't we use X?") stay in the conversation and are not written into them. Keep a "why" only when it prevents a likely mistaken "fix". If a change touches a convention, update both files in the same branch.

## Task Rules

Never start working on a task on your own, even when asked to move on to the next one or in auto/agentic mode. First present a summary of the plan (the issue, branch name, steps, files touched and any open decisions) and wait for explicit approval before creating the branch, installing dependencies or editing code. Read-only investigation (issues, docs, code) needs no approval.

## Commit Rules

Never run `git commit` on your own, even in auto/agentic mode. Only propose a commit message when the user asks for one, and create the commit only after explicit approval of that message.

Commit messages must be in English and follow this format:

- Use the following semantic prefixes: `🎉 init, ✨ feat, 🐛 fix, 📚 docs, 💎 style, 📦 refactor, 🚀 perf, 🚨 test, 🛠 build, ⚙️ ci, ♻️ chore, 🗑 revert`
- The message must be in the imperative mood and in lowercase.
- Write the commit body.
- Reference an associated issue by number, if it exists, using the format `Issue: #<number>`.

Example:

```text
✨ feat: add product page

Add the new product page for the product listing with the following features:
- Create a new product
- Update a product
- Delete a product

Issue: #1
```
