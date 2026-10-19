# inova.class

A gamified classroom management platform, an alternative to the discontinued Classcraft. Students play as characters in teams, earning experience and losing health according to their behavior and participation, while teachers run quests, boss battles and random events to drive engagement.

Built with [Next.js](https://nextjs.org) (App Router), React, TypeScript and Tailwind CSS, from [next-boilerplate](https://github.com/diasjoaovitor/next-boilerplate).

## Getting Started

Install the dependencies and start the development server (Node version in `.nvmrc`, package manager: pnpm, plus Docker with Compose for the local services):

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the local services (`src/infra/compose.yml`), waits for the database, applies the pending migrations and only then runs `next dev`. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The local settings live in the committed `.env.development`: the Postgres container's credentials (`POSTGRES_*`, read by `compose.yml`) and the `DATABASE_URL` that points at it. There is no `.env`. The git-ignored `.env.local` created by `vercel link` only holds the `VERCEL_OIDC_TOKEN`; never pull the Neon variables into it, since it would take precedence over `.env.development`.

## Deployment

The project is deployed on [Vercel](https://vercel.com) (project `inova-class`), with Postgres from [Neon](https://neon.com) provisioned through the Vercel Marketplace. Pushes to `main` deploy to Production, pull requests get a Preview deployment. To work with the Vercel CLI, run `vercel link` once.

- **Build:** `vercel.json` sets the build command to `pnpm migrations:up && pnpm build`, so the pending migrations are applied before every deployment. It also pins the functions to `gru1` (São Paulo), the database's region.
- **Previews:** each Preview deployment gets its own Neon branch, so the migrations of a pull request never touch the production database.

| Variable                       | Environments        | Set by                                                           |
| ------------------------------ | ------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`                 | Production, Preview | Neon integration (pooled connection, used by the app)            |
| `DATABASE_URL_UNPOOLED`        | Production, Preview | Neon integration (direct connection, used by `drizzle-kit`)      |
| `ENABLE_EXPERIMENTAL_COREPACK` | Production, Preview | Manually (`1`), so the build uses the pnpm from `packageManager` |

## Scripts

| Script                                      | What it does                                            |
| ------------------------------------------- | ------------------------------------------------------- |
| `pnpm dev`                                  | Start the services, migrate and run the dev server      |
| `pnpm build`                                | Create the production build                             |
| `pnpm start`                                | Serve the production build                              |
| `pnpm type-check`                           | Generate route types and type-check with `tsc --noEmit` |
| `pnpm eslint:check` / `pnpm eslint:fix`     | Lint (and auto-fix) with ESLint                         |
| `pnpm prettier:check` / `pnpm prettier:fix` | Check (and rewrite) formatting                          |
| `pnpm test` / `pnpm test:watch`             | Run the Vitest unit tests                               |
| `pnpm test:e2e` / `pnpm test:e2e:ui`        | Run the Playwright end-to-end tests                     |
| `pnpm services:up` / `pnpm services:stop`   | Start (detached) or stop the local services             |
| `pnpm services:down`                        | Remove the local service containers                     |
| `pnpm services:wait:database`               | Wait until the database accepts connections             |
| `pnpm migrations:generate --name <name>`    | Generate a migration from the Drizzle schema            |
| `pnpm migrations:up`                        | Apply the pending migrations                            |
| `pnpm shadcn:add <name>`                    | Add a shadcn/ui component                               |

## Project conventions

The full conventions live in [`AGENTS.md`](./AGENTS.md), and the step-by-step flow from planning to merge is in [`docs/development-workflow.md`](./docs/development-workflow.md); the highlights are below.

### Tooling

- **Package manager:** pnpm only. Versions in `dependencies` and `devDependencies` are pinned exact (install with `pnpm add -E <pkg>`).
- **Node:** version pinned in `.nvmrc` (`lts/krypton`) and, for hosts that ignore `.nvmrc` such as Vercel, in `engines.node` (`24.x`) in `package.json`.
- **React Compiler:** enabled via `reactCompiler: true` in `next.config.ts`.
- **Path alias:** `@/*` resolves to `src/*`.

### Project structure

- `src/app` holds frontend-exclusive code only. Routes live in the `src/app/(pages)` route group (which does not affect the URL), shared components live in `src/app/components`, React hooks in `src/app/hooks` and other helpers in `src/app/helpers`. There are no `index.ts` barrels: modules are imported directly from their files through the `@/` alias.
- Components are grouped by role: `ui/` for visual building blocks (shadcn ones in `ui/shadcn/`), `blocks/` for composed pieces reused across pages (grouped by domain, e.g. `blocks/post/`), `providers/` for context providers and `layouts/` for page shells, whose private parts live in a `_components/` folder next to them.
- Global styles live in `src/app/styles/globals.css`.
- Anything that is not frontend-exclusive, such as `src/tests`, sits directly under `src`, as a sibling of `app`.

### Database

- **Postgres** with **Drizzle ORM** (`drizzle-orm`/`drizzle-kit` on the `1.0.0` release candidate) and the `pg` driver, so the same code runs against the local container and Neon.
- Everything infrastructure-related lives in `src/infra`: `compose.yml` for the local services, `scripts/` for the startup helpers and `database/` for the client (`client.ts`), the schema (`schema.ts`) and the generated migrations (`migrations/`).
- Tables are declared with `snakeCase.table(...)`, so camelCase keys map to snake_case columns.
- Change the schema, then run `pnpm migrations:generate --name <name>` and commit the generated folder. Never edit an applied migration.

### Styling and UI

- **Tailwind CSS v4** through `@tailwindcss/postcss`.
- **shadcn/ui** (style `base-nova`, base color `neutral`, `lucide` icons) on top of [Base UI](https://base-ui.com), with `class-variance-authority` and the `cn()` helper from the `cn` package. It's the component library of choice: reach for a shadcn component before writing one from scratch. Components land in `src/app/components/ui/shadcn/`; add more with `pnpm shadcn:add <name>`.
- **Default colors as they come:** the shadcn tokens and the Tailwind palette aren't retinted. Use the tokens (`bg-background`, `text-muted-foreground`, ...) for surfaces and text, and pick an existing palette color (e.g. `teal-500`) instead of a custom shade.
- **Dark mode** follows the system preference (`prefers-color-scheme`).
- Links that look like buttons stay `<a>`/`Link` elements styled with `buttonVariants(...)`, never rendered through `Button`.

### Linting and formatting

- **ESLint** (flat config) extends `eslint-config-next` and adds the `unicorn`, `simple-import-sort`, `tailwindcss`, `promise` and `prefer-arrow-functions` plugins, plus `@eslint/json` and `@eslint/markdown`.
- **Prettier** with single quotes, no semicolons and no trailing commas. Indentation and whitespace are enforced by `.editorconfig`.
- Scripts: `pnpm eslint:check`, `pnpm eslint:fix`, `pnpm prettier:check`, `pnpm prettier:fix` and `pnpm type-check`.

### Code comments

- Comments only record why a decision was made, ideally with a reference (docs, issue or upstream bug), never what the code does. They are written in English.

### Testing

- **Unit tests:** Vitest with `jsdom` and Testing Library. Run `pnpm test` (once) or `pnpm test:watch`. Only `src/**/*.test.{ts,tsx}` files are picked up.
- **E2E tests:** Playwright (Chromium) in `src/tests/e2e`. Run `pnpm test:e2e` or `pnpm test:e2e:ui`. The dev server starts automatically.
- Only the logic we wrote is tested, not library or framework behavior.

### Git hooks and CI

- **Husky hooks:**
  - `pre-commit` runs `lint-staged` (Prettier, ESLint and `vitest related` on staged files).
  - `commit-msg` adds the emoji prefix and runs `commitlint`.
  - `pre-push` runs `pnpm type-check` and `pnpm test:e2e`.
- **Commit messages** are written in English, in the imperative mood and lowercase, with a semantic prefix, for example `✨ feat: add product page`. Typing `feat: ...` is enough, since the hook adds the emoji.
- **Branches:** work for each issue goes on a new branch named `<scope>/<title>#<issue>`, where `<scope>` is the commit prefix without the emoji, for example `feat/home-page#3`. For very specific work, add an optional target in parentheses (a page, component or other area), for example `fix(card)/focus-ring#7`. Nothing for an issue is committed directly to `main`.
- **Issues** are created from the **Task** template (`.github/ISSUE_TEMPLATE/task.md`). Tick every completed checklist item in the issue body before closing it.
- **GitHub Actions** (`.github/workflows/ci.yml`) runs on every pull request: commitlint, type-check, ESLint, Prettier, unit tests and E2E tests.

### AI assistant setup

- `AGENTS.md` (imported by `CLAUDE.md`) documents the project conventions for coding agents.
- `.mcp.json` configures the `context7` (library docs) and `playwright` MCP servers.
- `.claude/` contains a `new-component` skill for adding shadcn or shared components, a `ui-reviewer` subagent that reviews UI semantics and accessibility, and a `settings.json` that asks for confirmation before every `git commit`.
- `.agents/skills/` holds third-party agent skills (`neon`, `neon-postgres`, installed by the Neon integration), symlinked into `.claude/skills/` and pinned in `skills-lock.json`. They're vendored as they come, so ESLint and Prettier ignore `.agents/`.

#### Context7 API key

`.mcp.json` reads the key from the `CONTEXT7_API_KEY` environment variable (`"Authorization": "Bearer ${CONTEXT7_API_KEY}"`), so it never lands in the repository. Claude Code expands the variable on startup.

1. Generate an API key in the [Context7](https://context7.com) dashboard.
2. Set the variable using one of these options:
   - **Shell (all projects):** export it in your shell profile. In fish, run `set -Ux CONTEXT7_API_KEY <your-key>`. In bash or zsh, add `export CONTEXT7_API_KEY=<your-key>` to `~/.bashrc` or `~/.zshrc`.
   - **This project only:** add it to `.claude/settings.local.json`, which is git-ignored:

     ```json
     {
       "env": {
         "CONTEXT7_API_KEY": "<your-key>"
       }
     }
     ```

3. Restart Claude Code and run `/mcp` to check that `context7` is connected.

Never put the key in `.mcp.json` or in `.claude/settings.json`, since both are committed.

## License

[MIT](./LICENSE)
