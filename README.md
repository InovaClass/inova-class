# inova.class

A gamified classroom management platform, an alternative to the discontinued Classcraft. Students play as characters in teams, earning experience and losing health according to their behavior and participation, while teachers run quests, boss battles and random events to drive engagement.

Built with [Next.js](https://nextjs.org) (App Router), React, TypeScript and Tailwind CSS, from [next-boilerplate](https://github.com/diasjoaovitor/next-boilerplate).

## Getting Started

Install the dependencies and start the development server (Node version in `.nvmrc`, package manager: pnpm, plus Docker with Compose for the local services):

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the local services (`src/infra/compose.yml`: Postgres and [Mailpit](https://mailpit.axllent.org)), waits for the database, applies the pending migrations and only then runs `next dev`. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. Every email the app sends locally (account verification, password reset) is caught by Mailpit, at [http://localhost:8025](http://localhost:8025).

The local settings live in the committed `.env.development`, all of them local-only values: the Postgres container's credentials (`POSTGRES_*`, read by `compose.yml`), the `DATABASE_URL` that points at it, a `BETTER_AUTH_SECRET` used only by local runs and the Mailpit `SMTP_URL`. There is no `.env`. The git-ignored `.env.local` created by `vercel link` holds the `VERCEL_OIDC_TOKEN` and, optionally, the Google credentials (see [Google sign-in](#google-sign-in)); never pull the Neon variables into it, since it would take precedence over `.env.development`.

## Deployment

The project is deployed on [Vercel](https://vercel.com) (project `inova-class`), with Postgres from [Neon](https://neon.com) provisioned through the Vercel Marketplace. Pushes to `main` deploy to Production, pull requests get a Preview deployment. To work with the Vercel CLI, run `vercel link` once.

- **Build:** `vercel.json` sets the build command to `pnpm migrations:up && pnpm build`, so the pending migrations are applied before every deployment. It also pins the functions to `gru1` (São Paulo), the database's region.
- **Previews:** each Preview deployment gets its own Neon branch, so the migrations of a pull request never touch the production database.
- **Email:** [Resend](https://resend.com), provisioned through the Vercel Marketplace for Production and Preview only, sends the auth emails over SMTP.

| Variable                       | Environments        | Set by                                                              |
| ------------------------------ | ------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`                 | Production, Preview | Neon integration (pooled connection, used by the app)               |
| `DATABASE_URL_UNPOOLED`        | Production, Preview | Neon integration (direct connection, used by `drizzle-kit`)         |
| `ENABLE_EXPERIMENTAL_COREPACK` | Production, Preview | Manually (`1`), so the build uses the pnpm from `packageManager`    |
| `BETTER_AUTH_SECRET`           | Production, Preview | Manually (sensitive, `openssl rand -base64 32`)                     |
| `RESEND_API_KEY`               | Production, Preview | Resend integration (also the SMTP password)                         |
| `RESEND_EMAIL_DOMAIN`          | Production, Preview | Resend integration (`inovaclass.diasjoaovitor.com.br`, sender)      |
| `GOOGLE_CLIENT_ID`             | Production, Preview | Manually, from the Google Cloud OAuth client                        |
| `GOOGLE_CLIENT_SECRET`         | Production, Preview | Manually (sensitive), from the Google Cloud OAuth client            |
| `OAUTH_PROXY_SECRET`           | Production, Preview | Manually (sensitive, `openssl rand -base64 32`), same value in both |

### Google sign-in

The "Continuar com Google" button only shows up when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set, so the app runs without them. To set them up (#44):

1. Create a project in the [Google Cloud console](https://console.cloud.google.com).
2. In Google Auth Platform, configure the consent screen: user type **External**, app name, support email, the authorized domain `diasjoaovitor.com.br` and only the `openid`, `email` and `profile` scopes. Then **Publish app**: in _Testing_ mode only the listed test users can sign in.
3. Create an OAuth client (_Web application_) with the origins `http://localhost:3000` and `https://inova-class.vercel.app`, and the redirect URIs `http://localhost:3000/api/auth/callback/google` and `https://inova-class.vercel.app/api/auth/callback/google`.
4. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `OAUTH_PROXY_SECRET` to Vercel for Production and Preview (`vercel env add <name> production`, then `preview`). To use Google locally, add the first two to `.env.local`, never to `.env.development`.

Google doesn't accept wildcard redirect URIs, so Preview deployments sign in through the production callback with Better Auth's [OAuth proxy](https://www.better-auth.com/docs/plugins/oauth-proxy), which needs the same `OAUTH_PROXY_SECRET` in Production and Preview.

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
| `pnpm test:integration`                     | Start the services, migrate and run integration tests   |
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
- Components are grouped by role: `ui/` for visual building blocks (shadcn ones in `ui/shadcn/`, the 8bitcn ports in `ui/8bit/`), `blocks/` for composed pieces reused across pages (grouped by domain, e.g. `blocks/post/`), `providers/` for context providers and `layouts/` for page shells, whose private parts live in a `_components/` folder next to them. Parts shared only by the pages of one route group live in that group's `_components/` (e.g. `(pages)/(auth)/_components/`), while a helper that isn't a component or a form's action sits at the root of the route or group it serves.
- Global styles live in `src/app/styles/globals.css`.
- Anything that is not frontend-exclusive, such as `src/tests`, sits directly under `src`, as a sibling of `app`.
- Server code is layered and imports only flow down, `app` → `models` → `infra`:
  - `src/models/<domain>-model/`: business rules (`model.ts`) and Zod schemas (`schema.ts`, also imported by client forms). A model validates its input and throws the errors from `src/infra/errors.ts`.
  - `src/infra/`: auth, database, email, the error classes, the wrapper every form's Server Action goes through (`form-action.ts`) and the per-request session (`session.ts`).
  - `src/constants/`: values shared across layers, such as user roles and password bounds.
  - `src/repositories/` and `src/dtos/` are added with their first use.
- `action.ts` (`'use server'`) is only for mutations; a Server Component's data reads go in `data.ts`.

### Forms

- **TanStack Form** with the model's **Zod** schema, submitted to **Server Actions**. Each form has an `action.ts` and a `<name>-form.tsx` in its route's `_components/`.
- The action wraps the model call in `formAction` (`src/infra/form-action.ts`), which turns validation errors into field errors, `AppError`s into a form message with what to do next, and anything unexpected into a generic message.
- The client form renders the `Form` and `Field` returned by `useFormAction` (`src/app/hooks/use-form-action.ts`), plus `FormMessage` and `SubmitButton`; the page wraps it in `FormCard`. All of them live in `src/app/components/ui/custom/`. Forms still work without JavaScript, validate on the client when it's available and show server errors on the field they belong to.

### Database

- **Postgres** with **Drizzle ORM** (`drizzle-orm`/`drizzle-kit` on the `1.0.0` release candidate) and the `pg` driver, so the same code runs against the local container and Neon.
- Everything infrastructure-related lives in `src/infra`: `compose.yml` for the local services, `scripts/` for the startup helpers and `database/` for the client (`client.ts`), the schema (`schema.ts`) and the generated migrations (`migrations/`).
- Tables are declared with `snakeCase.table(...)`, so camelCase keys map to snake_case columns.
- Change the schema, then run `pnpm migrations:generate --name <name>` and commit the generated folder. Never edit an applied migration.

### Auth and email

- **Better Auth** with the Drizzle adapter (`relations-v2`, since Drizzle is on `1.0.0`). The config lives in `src/infra/auth.ts` and its tables (`users`, `sessions`, `accounts`, `verifications`) in `src/infra/database/schema.ts`, written by hand in our `snakeCase.table` style from the output of `pnpm dlx auth@latest generate`.
- Every account has a fixed `role` (`teacher` or `student`) that the client can never set: public sign-up only creates teachers.
- Google sign-in is optional (see [Google sign-in](#google-sign-in)). Signing in with Google never creates an account, only the sign-up page does, and Google links to an existing account only when both sides verified the same email.
- The auth pages (`/cadastro`, `/entrar`, `/esqueci-a-senha`, `/redefinir-senha`) call the `authenticationModel` (which wraps `auth.api`) from Server Actions; `src/app/api/auth/[...all]` serves the links sent by email.
- Emails go out over SMTP with `nodemailer` (`src/infra/email/`): Mailpit locally, Resend's SMTP when `RESEND_API_KEY` is set.

### Styling and UI

- **Tailwind CSS v4** through `@tailwindcss/postcss`.
- **shadcn/ui** (style `base-nova`, base color `neutral`, `lucide` icons) on top of [Base UI](https://base-ui.com), with `class-variance-authority` and the `cn()` helper from the `cn` package. It's the component library of choice: reach for a shadcn component before writing one from scratch. Components land in `src/app/components/ui/shadcn/`; add more with `pnpm shadcn:add <name>`.
- **Default colors as they come:** the shadcn tokens and the Tailwind palette aren't retinted. Use the tokens (`bg-background`, `text-muted-foreground`, ...) for surfaces and text, and pick an existing palette color (e.g. `teal-500`) instead of a custom shade.
- **Retro 8-bit identity, full retro:** `Press Start 2P` for every text (`--font-sans`, `--font-mono` and `--font-heading`), with no modern font mixed in, plus the `retro`, `pixelated` and `pixel-border` utilities in `globals.css`.
- **Game tokens** `--hp`, `--xp`, `--coin`, `--class-warrior`, `--class-mage` and `--class-healer` (Tailwind palette colors, both themes), used as `bg-hp`, `text-coin`, ...
- **8-bit components** in `src/app/components/ui/8bit/` are hand-ported from [8bitcn](https://github.com/theorcdev/8bitcn-ui) (MIT) onto our shadcn components and Base UI, with a credit comment in each file. 8bitcn is built on Radix, so it's never installed through the shadcn CLI.
- **8bitcn blocks first:** before building a page or section, check the [8bitcn blocks](https://www.8bitcn.com/docs/blocks) and port the matching one (source at `https://8bitcn.com/r/<block>.json`) onto our components and conventions, keeping its structure and spacing.
- **Dark mode** follows the system preference (`prefers-color-scheme`).
- Links that look like buttons stay `<a>`/`Link` elements styled with `buttonVariants(...)`, never rendered through `Button`.

### Linting and formatting

- **ESLint** (flat config) extends `eslint-config-next` and adds the `unicorn`, `simple-import-sort`, `tailwindcss`, `promise` and `prefer-arrow-functions` plugins, plus `@eslint/json` and `@eslint/markdown`.
- **Prettier** with single quotes, no semicolons and no trailing commas. Indentation and whitespace are enforced by `.editorconfig`.
- Scripts: `pnpm eslint:check`, `pnpm eslint:fix`, `pnpm prettier:check`, `pnpm prettier:fix` and `pnpm type-check`.

### Code comments

- Comments only record why a decision was made, ideally with a reference (docs, issue or upstream bug), never what the code does. They are written in English.

### Testing

- **Unit tests:** Vitest with `jsdom` and Testing Library, next to the code they test. Run `pnpm test` (once) or `pnpm test:watch`.
- **Integration tests:** Vitest in `node`, in `src/tests/integration`, calling the models against the local Postgres and Mailpit. Run `pnpm test:integration`, which starts the services first. Shared helpers, including the test data generated with [Faker](https://fakerjs.dev), live in `src/tests/orchestrator.ts`.
- **E2E tests:** Playwright (Chromium) in `src/tests/e2e`. Run `pnpm test:e2e` or `pnpm test:e2e:ui`. The dev server starts automatically. Tests that need an email read it from Mailpit through the orchestrator.
- Only the logic we wrote is tested, not library or framework behavior.

### Git hooks and CI

- **Husky hooks:**
  - `pre-commit` runs `lint-staged` (Prettier, ESLint and `vitest related` on staged files).
  - `commit-msg` adds the emoji prefix and runs `commitlint`.
  - `pre-push` runs `pnpm type-check`, `pnpm test:integration` and `pnpm test:e2e`.
- **Commit messages** are written in English, in the imperative mood and lowercase, with a semantic prefix, for example `✨ feat: add product page`. Typing `feat: ...` is enough, since the hook adds the emoji.
- **Branches:** work for each issue goes on a new branch named `<scope>/<title>#<issue>`, where `<scope>` is the commit prefix without the emoji, for example `feat/home-page#3`. For very specific work, add an optional target in parentheses (a page, component or other area), for example `fix(card)/focus-ring#7`. Nothing for an issue is committed directly to `main`.
- **Issues** are created from the **Task** template (`.github/ISSUE_TEMPLATE/task.md`). Tick every completed checklist item in the issue body before closing it.
- **GitHub Actions** (`.github/workflows/ci.yml`) runs on every pull request: commitlint, type-check, ESLint, Prettier, unit, integration and E2E tests.

### AI assistant setup

- `AGENTS.md` (imported by `CLAUDE.md`) documents the project conventions for coding agents.
- `.mcp.json` configures the `context7` (library docs) and `playwright` MCP servers.
- `.claude/` contains a `new-component` skill for adding shadcn or shared components, a `review-copy` skill that reviews naming, comments, test descriptions and UI copy, a `ui-reviewer` subagent that reviews UI semantics and accessibility, and a `settings.json` that asks for confirmation before every `git commit`.
- `.agents/skills/` holds third-party agent skills installed by the Marketplace integrations (`neon` and `neon-postgres` by Neon; `resend`, `resend-cli`, `react-email`, `email-best-practices` and `agent-email-inbox` by Resend), symlinked into `.claude/skills/` and pinned in `skills-lock.json`. They're vendored as they come, so ESLint and Prettier ignore `.agents/`.

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
