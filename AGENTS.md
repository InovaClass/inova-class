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
- Server code is layered, and imports only flow down: `app` → `models` → `infra`, with `constants` usable by every layer.
  - `src/models/<domain>-model/` holds the business rules of one domain: `model.ts` exports `<domain>Model` (an object of async functions) and is the only file that touches `infra`; `schema.ts` holds its Zod schemas, each followed by its input type (`export type SignUpInput = z.input<typeof signUpSchema>`), and imports nothing server-only, so client forms import it directly. Form state types (`FormState<SignUpInput>`) stay in the route's `action.ts`, since `schema.ts` doesn't touch `infra`; any other file (`errors.ts`, `constants.ts`, `utils.ts`) is added when the domain needs it. A model validates its own input (`schema.parse(input)`) and throws `infra/errors.ts` errors, never framework or library ones. Functions that need the request take its `headers` (and any route) as arguments instead of reading `next/headers`, so integration tests can call them.
  - `src/infra/` holds the technical pieces: `auth.ts` (the Better Auth config), `database/`, `email/`, `errors.ts` (`AppError` and its subclasses, with a user-facing `message` and `action`), `form-action.ts` (the wrapper every form's Server Action goes through, see Forms; not a Server Action itself) and `session.ts` (`getSession()`, cached per request with `React.cache`).
  - `src/constants/<topic>.ts` holds values shared across layers (e.g. `USER_ROLES`, the password length bounds that both the Zod schemas and Better Auth use).
  - Not created yet, add each with its first use: `src/repositories/<domain>-repository/` for queries on our own Drizzle tables once a model needs more than one or two (#8), and `src/dtos/<domain>-dto.ts` for what a page or API may expose of an entity, decided per viewer (#6). `src/types/` only for types shared across layers.
- `actions.ts`/`action.ts` with `'use server'` is only for mutations called from the client. A function a Server Component calls to read data is not a Server Action: name its file `data.ts`.
- Routes are grouped under `src/app/(pages)` (a route group, so it doesn't affect the URL).
- Shared frontend code lives in `src/app/components`, React hooks in `src/app/hooks` and other helpers in `src/app/helpers` (create them when the first one is needed). The `lib` alias in `components.json` points to `src/app/lib`, which doesn't exist: if the shadcn CLI ever creates something there, keep it in `lib` or move it to `helpers` case by case.
- There are no `index.ts` barrels: import each module directly from its file through the `@/` alias (e.g. `@/app/components/ui/shadcn/button`). Barrels cause circular imports, give two import paths for the same module and make Vite/Vitest load every re-exported module.
- `src/app/components` groups components by role: `ui/` for visual building blocks (shadcn ones under `ui/shadcn/`, the 8bitcn ports under `ui/8bit/`, our own under `ui/custom/`), `blocks/` for composed pieces reused across pages, grouped by domain (e.g. `blocks/post/`; a block that belongs to no domain stays directly in `blocks/`), `providers/` for context providers without UI of their own and `layouts/` for page shells.
- A layout lives in its own folder (`layouts/<name>/index.tsx`), with the parts only it uses in a private `_components/` folder next to it. Code outside the layout imports only `layouts/<name>`, never its `_components/`. The same goes for a route: parts used by a single page live in a `_components/` folder next to it. Parts shared only by the pages of one route group live in the group's own `_components/` (e.g. `(pages)/(auth)/_components/`) and are imported only by pages inside that group. A helper that isn't a component or a form's action (e.g. `(pages)/(auth)/google-notice.ts`) sits at the root of the route or group it serves, not in `_components/` nor in `src/app/helpers`, which is for helpers shared across the app.
- `favicon.ico` stays directly in `src/app/`, not nested in a route group.
- React Compiler is enabled (`reactCompiler: true` in `next.config.ts`, `babel-plugin-react-compiler` devDependency).

### Database & local services

- Postgres with **Drizzle ORM** and the `pg` (node-postgres) driver, so the same code runs against the local container and Neon in preview/production. `drizzle-orm` and `drizzle-kit` are on the `1.0.0` release candidate (installed from the `@rc` tag, as the current Drizzle docs do): check the types in `node_modules/drizzle-orm` before reaching for a v0 API (e.g. `drizzle()` no longer takes `schema`, and the config has no `casing`).
- Infrastructure lives in `src/infra`: `compose.yml` declares the local services (Docker Compose, not `docker-compose.yml`): `database` (Postgres) and `mail` (Mailpit, SMTP on `1025`, UI and API on `8025`). `scripts/` holds the startup helpers, `database/` holds `client.ts`, `schema.ts` and the generated `migrations/`, `auth.ts` the Better Auth config and `email/` the mailer and templates. A piece stays a single file until it needs a second one; `scripts/` is a folder because its files run on their own. `drizzle.config.ts` stays at the root, where `drizzle-kit` looks for it.
- Tables are declared with `snakeCase.table(...)` from `drizzle-orm/pg-core`, so camelCase keys map to snake_case columns.
- Schema changes go through `pnpm migrations:generate --name <name>`, and the generated folder is committed. Don't edit a migration that was already applied; generate a new one.
- `pnpm dev` is the startup script: `services:up` → `services:wait:database` → `migrations:up` → `next dev`. The compose services have no healthcheck because readiness is the wait script's job. Playwright's `webServer` (and so the pre-push hook and CI) goes through the same `pnpm dev`, so CI needs no service container.
- Local settings live in the committed `.env.development` (only local-only values: the containers' credentials and URLs, plus a `BETTER_AUTH_SECRET` that no hosted environment uses; never a hosted secret). There is no `.env`/`.env.example`. The compose services read it through `env_file`, so the `POSTGRES_*` values are declared once there; `DATABASE_URL` repeats them literally (`process.loadEnvFile` doesn't expand variables), so keep both in sync. `drizzle.config.ts` and the wait script load `.env.development` only when `DATABASE_URL` isn't already set, so hosted environments keep their injected value. `drizzle.config.ts` prefers `DATABASE_URL_UNPOOLED` (Neon's direct connection) over the pooled `DATABASE_URL`.
- The git-ignored `.env.local` (created by `vercel link`) holds the `VERCEL_OIDC_TOKEN` and, optionally, your own `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` for Google sign-in. Don't `vercel env pull` the Neon variables into it: `.env.local` takes precedence over `.env.development`, so `next dev` would hit Neon. The Neon integration is connected to Production and Preview only, not Development.

### Forms

- Forms use **TanStack Form** (`@tanstack/react-form`) for client-side validation, with the model's **Zod** schema, and submit to **Server Actions**. Not `react-hook-form` (no Server Action integration) and not `@tanstack/react-form-nextjs` (its `createServerValidate` returns the raw `FormData` instead of the schema output and its `mergeForm` doesn't map server errors to fields).
- A form lives in the route's `_components/`: `action.ts` (`'use server'`) and `<name>-form.tsx` (`'use client'`). The schema comes from `src/models/<domain>-model/schema.ts`. It only declares rules and messages for Zod, so it has no unit test of its own: the forms' e2e tests cover what the user sees.
- `action.ts` wraps the model call in `formAction(formData, async (input) => ...)` (`src/infra/form-action.ts`) and returns `formSuccess(message)` or calls `redirect()`. The wrapper turns whatever the model throws into the `FormState` the form renders:
  - a `ZodError` becomes `errors` (the first message per field);
  - an `AppError` becomes `message` + `action` for the whole form. A business rule that belongs to one field is thrown as a `ZodError` with that `path`;
  - anything else is logged and shown as a generic message, so the user never sees an error boundary for a failed submit;
  - `redirect()`/`notFound()` are rethrown (`unstable_rethrow`).

  It also echoes the submitted values back to refill the form after a post without JavaScript, except any field whose name contains `password` (so name password fields that way), and gives every result a unique `id`, so a repeated identical error still updates the UI.

- The client form calls `useFormAction({ schema, defaultValues, action })` (`src/app/hooks/use-form-action.ts`) and renders the `Form` and `Field` it returns: `<Form {...formProps}>`, a `<Field name=... label=... />` per field (`name` is typed by the schema's keys), `<FormMessage state={state} announcement={announcement} />` and `<SubmitButton pending={pending}>`. `Form` and `Field` are `ActionForm`/`ActionField` (`src/app/components/ui/custom/action-form.tsx`), declared at module level and fed through context: a component created inside the hook would remount its input on every render. `FormCard` (adapted from 8bitcn's `login-form` block), `FormField`, `FormMessage` and `SubmitButton` live in `src/app/components/ui/custom/`; `FormField` only renders what it gets, so it also works outside TanStack. Pages build notices (e.g. from `?error=`) with `formError(...)`/`formSuccess(...)` and pass them as `initialState`.
- How it behaves, so don't "simplify" it away:
  - The `<form>` keeps `action={dispatch}`, so it still posts to the Server Action without JavaScript. With JavaScript, `onSubmit` prevents the native submit, validates on the client and dispatches inside `startTransition`; nothing resets the form.
  - The schema validates the whole form on every change (`validators.onChange`), so errors never go stale. A field only shows its errors once it was left (`isBlurred`) or the form was submitted, and the blur that moves focus to the submit button is skipped, since revealing errors there would shift the button under the pointer.
  - Server field errors are read from the action state during render (so they're in the HTML of a no-JavaScript post too) and each one hides once its field is edited.
  - After a failed submit (client or server) the focus goes to the first invalid field from an effect, after the commit that adds its `aria-invalid` and error description, and `FormMessage` also reads out the first field error (`announcement`), since focusing the field that already has focus announces nothing. A visible form message (success, an `AppError`, or one rendered with the page such as an expired link) takes the focus. `FormMessage` is a live region that stays mounted (`sr-only` while empty); `SubmitButton` uses `focusableWhenDisabled` so focus survives the pending state; that sets `aria-disabled` instead of `disabled`, so it styles the `aria-disabled:` state itself, and it shows the 8bit `Spinner` while pending. `FormMessage` turns the live region `sr-only` whenever there's no visible message, not with `empty:sr-only`, since the announcement alone would add a gap to the form.
  - `FormField` builds its ids with `useId`, so two forms on a page never share an `id`. In e2e tests, check a field error with `toHaveAccessibleDescription` on the field rather than `getByText`, which also matches the announcement.

### Auth & email

- **Better Auth** (`src/infra/auth.ts`) with `drizzleAdapter` from `@better-auth/drizzle-adapter/relations-v2` (the plain export targets Drizzle v0), `usePlural` and `generateId: 'uuid'`. Its tables live in `src/infra/database/schema.ts`, hand-written in the `snakeCase.table` style: when a Better Auth plugin or option adds fields, run `pnpm dlx auth@latest generate --config src/infra/auth.ts --output <scratch file>`, port the diff by hand and generate a migration. Never point `--output` at `schema.ts`.
- `role` (`teacher` | `student`) is an `additionalField` with `input: false` and `defaultValue: 'teacher'`: Better Auth rejects it from any request body, even server-side calls, so the role of a new account comes only from the server flow that creates it. The model wraps a student sign-up in `withSignUpRole('student', ...)` (an `AsyncLocalStorage` in `src/infra/auth.ts`) and `databaseHooks.user.create.before` applies it; for Google, a `before` hook on `/sign-in/social` copies it into the OAuth state with `addOAuthServerContext`, which the callback request reads back with `getOAuthState()`. An account created without it (e.g. a direct request to `/api/auth/sign-up/email`) is a teacher. Never read the role from `additionalData` or the request body.
- `/cadastro` is the role choice; `/cadastro/professor` and `/cadastro/aluno` are the sign-up pages. Every account has a valid, verified email, students included; students also have a `username` (Better Auth `username` plugin, rules in `src/constants/user.ts`, stored in lowercase). `/entrar` serves both roles with a single "E-mail ou usuário" field: a value with `@` signs in by email, any other by username, and every credential failure shows the same copy. `mustChangePassword` (`input: false`) marks an account with a temporary password: the sign-in action sends the user to `/alterar-senha`, which sets a new password without asking for the current one and clears the flag.
- `baseURL` is dynamic (`allowedHosts`), so each Preview URL works without `BETTER_AUTH_URL`. Only this project's hosts are listed; never add `*.vercel.app`, which would trust any Vercel deployment.
- Google sign-in (`socialProviders.google`) is enabled only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set; pages check `isGoogleSignInEnabled` and hide "Continuar com Google" without them, so tests and CI never need the credentials. `disableImplicitSignUp` keeps Google from creating an account on `/entrar`: only a sign-up page passes a `signUpRole` (which turns on `requestSignUp`), so the user always picks the role. `mapProfileToUser` drops the Google picture, so a Google account keeps only what the sign-up form would collect (name and email). Account linking is Better Auth's default for every role (Google links only when both sides verified the same email). The callback's `?error=` lands on the page with `?origem=google` and is shown by the Google form itself (`googleNoticeFrom` in `(pages)/(auth)/google-notice.ts`), so a new attempt replaces it; on each sign-up page the Google form is a child of the sign-up form, which hides it after an email sign-up, since Google can't link to the still unverified account. On Vercel, `oAuthProxy` sends Previews through the production callback (`OAUTH_PROXY_SECRET`, the same in Production and Preview), since Google doesn't accept wildcard redirect URIs; locally Google uses its own `localhost` redirect URI, so the plugin is off and the proxy secret never leaves Vercel. The Google Cloud setup is in `README.md` (#44).
- `src/models/authentication-model/` wraps `auth.api.*` (sign-up, sign-in, password reset): the auth pages' actions call it with `headers: await headers()` (the dynamic `baseURL` and rate limiting need the request host/IP), and `nextCookies()` stays the last plugin so those actions can set cookies. Its `errors.ts` maps the Better Auth error codes we expect to `UnauthorizedError`/`ValidationError` copy; a code without copy stays an unexpected error. Pages read the session with `getSession()` from `src/infra/session.ts`. `src/app/api/auth/[...all]/route.ts` serves the links sent by email (verification, password reset).
- Emails are sent with `nodemailer` over SMTP (`src/infra/email/mailer.ts`): Resend's SMTP (`smtp.resend.com`, the API key as password, sending as `nao-responda@` the integration's `RESEND_EMAIL_DOMAIN`) when `RESEND_API_KEY` is set, else `SMTP_URL` (Mailpit). The transporter is created per send, so importing the module never needs the variables (`next build`, the Better Auth CLI). Auth emails are scheduled with `after()` so their timing doesn't reveal whether an account exists.
- The Resend integration (domain `inovaclass.diasjoaovitor.com.br`, region `sa-east-1`) is connected to Production and Preview only (`vercel integration add resend/resend-email -e production -e preview --no-env-pull`): pulling `RESEND_API_KEY` into `.env.local` would make local runs send real email.
- Tests read emails from Mailpit through `orchestrator.waitForLinkSentTo(email)` (`src/tests/orchestrator.ts`), and turn on a temporary password with `orchestrator.requirePasswordChange(email)` until the teacher flow that issues one exists (#10).

### Deployment

- Vercel project `inova-class` (scope `diasjoaovitors-projects`), linked to the GitHub repository: `main` deploys to Production, pull requests to Preview. Production is served at `inovaclass.diasjoaovitor.com.br` (a `CNAME` at Registro.br; the apex hosts another site, so never point it at Vercel), and `inova-class.vercel.app` redirects to it. Changing the production domain means updating `PRODUCTION_URL` and `allowedHosts` in `src/infra/auth.ts` and the Google OAuth client. Postgres is Neon, provisioned through the Vercel Marketplace (`vercel integration add neon`), in `gru1`.
- `vercel.json` holds the Vercel settings: the build command `pnpm migrations:up && pnpm build` (migrations run before every deployment, not in the `build` script, so a local `pnpm build` never migrates) and `regions: ["gru1"]`, which keeps the functions next to the database.
- Each Preview deployment gets its own Neon branch, so a pull request's migrations never reach the production database.
- The Marketplace integrations also installed agent skills (`neon` and `neon-postgres` from Neon; `resend`, `resend-cli`, `react-email`, `email-best-practices` and `agent-email-inbox` from Resend): they live in `.agents/skills/`, are symlinked into `.claude/skills/` and pinned in `skills-lock.json`. They're third-party files, committed as they come and ignored by ESLint (`globalIgnores`) and Prettier (`.prettierignore`); don't edit or reformat them.
- Hosted environment variables (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `ENABLE_EXPERIMENTAL_COREPACK`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_EMAIL_DOMAIN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_PROXY_SECRET`) are listed in the Deployment section of `README.md`; keep that table in sync when adding one.

### Linting & formatting

- ESLint uses native flat config (`eslint.config.mjs`), extending the `core-web-vitals`/`typescript` configs from `eslint-config-next`, plus `eslint-plugin-unicorn`, `eslint-plugin-simple-import-sort`, `eslint-plugin-tailwindcss`, `eslint-plugin-promise`, `eslint-plugin-prefer-arrow-functions`, `eslint-config-prettier`, and `@eslint/json`/`@eslint/markdown` for JSON/Markdown files. Markdown files use the `gfm` language with `frontmatter: 'yaml'`, so the frontmatter of issue templates (or any Markdown content) isn't parsed as Markdown. `eslint-plugin-tailwindcss` rule docs are in `node_modules/eslint-plugin-tailwindcss/docs/rules/` — check there before overriding a Tailwind lint rule.
- `eslint-plugin-unicorn@74` declares a peer of `eslint >=10.4`, but the project stays on ESLint 9 (`9.39.5`). The peer is unmet (`pnpm peers check` reports it, and depending on the pnpm version install warns `Issues with peer dependencies found`), but `pnpm eslint:check` passes. Don't bump one without validating the other.
- `next lint` no longer exists (removed in Next.js 16). Use `pnpm eslint:check` / `pnpm eslint:fix` and `pnpm prettier:check` / `pnpm prettier:fix`.
- `pnpm type-check` runs `next typegen` first: globals such as `LayoutProps` are generated into `.next/types`, so a clean checkout (CI, fresh clone) fails `tsc --noEmit` without it.
- The `review-copy` skill (`.claude/skills/review-copy/`) reviews the text in the code (naming, comments, test descriptions, UI copy, docs); use it on a diff before opening a pull request.
- Prettier style: single quotes, no semicolons, no trailing commas (`.prettierrc`).
- Base indentation/whitespace rules (2 spaces, LF, trim trailing whitespace, final newline) are enforced editor-side via `.editorconfig`.

### Code comments

- Comments only record **why** a decision was made, ideally with a reference (docs link, issue number, upstream bug). Never write comments that explain what the code does or how it works.
- Default to no comment. Add one only for a non-obvious choice that someone might "fix" by mistake.
- Write comments in English.

### Git hooks (husky)

- `pre-commit`: runs `lint-staged` (`lint-staged.config.js`) — prettier + eslint + `vitest related --project unit --passWithNoTests` scoped per staged file type, invoked directly via `pnpm exec` rather than through `package.json` scripts.
- `commit-msg`: auto-prepends the emoji prefix from the Commit Rules below based on the leading word (e.g. `feat: ...` → `✨ feat: ...`), then runs `commitlint` (`commitlint-config-emoji-convention`). You can type the plain word and let the hook add the emoji.
- `pre-push`: runs `pnpm type-check`, `pnpm test:integration` and `pnpm test:e2e` (full Playwright suite).

### Testing

- Unit tests: **Vitest** (`vitest.config.mts`, project `unit`), `jsdom` environment, native Vite `resolve.tsconfigPaths` (no `vite-tsconfig-paths` plugin needed). Picks up `src/**/*.test.{ts,tsx}` outside `src/tests`, next to the code they test. Component tests use `@testing-library/react` / `@testing-library/dom`. `vitest.setup.ts` (`setupFiles`) runs Testing Library's `cleanup` after every test, so test files don't repeat `afterEach(cleanup)`.
- Integration tests: Vitest project `integration` (`node` environment, files run one at a time), in `src/tests/integration/`, mirroring the layer they test (e.g. `models/authentication-model.test.ts`). They call models against the local Postgres and Mailpit, so `pnpm test:integration` starts the services and migrates first. `src/tests/integration/setup.ts` loads `.env.development` and replaces `after()` from `next/server`, which only works inside a Next.js request, with a plain call. Shared test helpers (`newUser()`, `newStudent()`, `newEmail()`, `newUsername()`, `newPassword()`, reading Mailpit) live in `src/tests/orchestrator.ts`, used by integration and e2e tests alike. Use unique data per test instead of clearing the database: test data comes from `@faker-js/faker` (`fakerPT_BR`) through the orchestrator, except emails and usernames, which carry a UUID so they never repeat, and literal values that are the point of the test (e.g. an invalid email).
- E2E tests: **Playwright** (`playwright.config.ts`), tests live in `src/tests/e2e`, single `chromium` project, `webServer` auto-starts `pnpm dev` against `http://localhost:3000`. Failure artifacts go to `test-results/` (git- and ESLint-ignored). There are no global retries: a known flaky test gets `test.describe.configure({ retries })` in its own `describe`, with a comment linking the issue that tracks it.
- Only test logic we wrote (filtering, lookups, mappings, transforms, a model's rules and error mapping). Don't test library or framework behavior (e.g. a component that only passes props or HTML through, a Zod schema's `trim`/`min`/`max` and the messages we hand it, `Link` routing), and drop a test whose main cost is a mock needed only to render. Prefer a unit test; add an e2e test only for what a unit test can't cover.
- Older issues may ask for tests that break the rule above. Skip them without asking, and list them as dropped in the closing comment.
- Scripts: `pnpm test` (unit, run once) / `pnpm test:watch` (unit, watch mode) / `pnpm test:integration` (services + migrations + integration) / `pnpm test:e2e` (e2e) / `pnpm test:e2e:ui` (e2e, Playwright UI mode). `lint-staged` runs `vitest related --project unit`, so commits never need the services.
- CI (`.github/workflows/ci.yml`, triggered on `pull_request`) runs, in order: `commitlint` over the PR's commit range, `pnpm type-check`, `pnpm eslint:check`, `pnpm prettier:check`, `pnpm test`, `pnpm test:integration`, then installs Chromium (`pnpm exec playwright install --with-deps chromium`) and runs `pnpm test:e2e`.

### Styling & UI

- Tailwind CSS v4 (`@tailwindcss/postcss` only — no `autoprefixer`/`postcss`, v4 uses Lightning CSS internally). Global styles live in `src/app/styles/globals.css`, which also imports `tw-animate-css` and the shadcn base stylesheet (`shadcn/tailwind.css`).
- Dark mode follows the system preference: the `dark:` variant is bound to `prefers-color-scheme` (`@custom-variant dark (@media (prefers-color-scheme: dark))`) and the dark tokens are redefined on `:root` inside the same media query, instead of shadcn's `.dark` class. A project that needs a manual theme toggle switches both to a class (e.g. with `next-themes`).
- Visual identity is retro 8-bit pixel art, full retro: every text (headings, body, labels, inputs) uses `Press Start 2P` (`next/font/google`, which covers the Latin-1 glyphs Portuguese needs), mapped to `--font-sans`, `--font-mono` and `--font-heading`, and `html` applies the `retro` utility. Don't mix in a modern font (e.g. Geist) for body text; use `text-xs`/`text-sm` and `leading-relaxed` for long copy instead, as the 8bitcn blocks do. `globals.css` adds the `retro` (pixel font), `pixelated` (`image-rendering`) and `pixel-border` (notched frame drawn by `::before`/`::after` outside the element, colored by `--pixel-border`) utilities.
- Game tokens live in `globals.css` next to the shadcn ones, for both themes, as Tailwind palette colors (500 in light, 400 in dark): `--hp`, `--xp`, `--coin` and one per character class (`--class-warrior`, `--class-mage`, `--class-healer`), exposed as `bg-hp`, `text-coin`, `bg-class-mage`, ... Use them for game values instead of picking a palette color per screen.
- `src/app/components/ui/8bit/` holds components ported from [8bitcn](https://github.com/theorcdev/8bitcn-ui) (MIT) as wrappers over our `base-nova` shadcn components: `button`, `card`, `input` and `label` so far, plus `spinner`, a standalone SVG upstream with no shadcn counterpart. 8bitcn is built on Radix and `@/lib/utils`, so never install it with `pnpm shadcn:add @8bitcn/...`: port each component by hand onto Base UI (`render` instead of `asChild`) and the `cn` package, only when a feature needs it, and keep the credit comment at the top of the file. Add the underlying shadcn component first if it's missing, and port only the parts that change: the rest is imported from `ui/shadcn/` (e.g. `CardTitle`). The 8bit `font` variant defaults to `retro`, as upstream. Because the pixel frame covers the area a `ring-*` would draw on, 8bit components show focus with an `outline` offset past the frame.
- Prefer [8bitcn blocks](https://www.8bitcn.com/docs/blocks) (auth forms, menus, leaderboards, quest logs, dialogues, 404 pages, ...): before building a page or section, check whether a block covers it and start from it instead of composing from scratch. Read its source from the registry (`https://8bitcn.com/r/<block>.json`, the `content` of each file), never install it with the CLI, and port it like an 8bit component: onto our `ui/8bit/` and `ui/shadcn/` components (port any missing 8bit component first), Base UI, `cn`, arrow functions and pt-BR copy, with a credit comment linking the block's docs page. Keep its structure, sizes and spacing, and change only what our conventions or the feature require (Server Actions, accessibility, our tokens). A ported block lives in `blocks/<domain>/` when pages of different route groups use it, else in the `_components/` of the route or route group that uses it (e.g. `login-form` became `ui/custom/form-card.tsx`, a generic piece every form uses).
- Don't retint the default colors: keep the shadcn tokens in `globals.css` (`neutral` base color) and Tailwind's palette as they come, and pick an existing palette color instead of a custom shade (e.g. `teal-500`, not a tinted `oklch(...)`). Prefer the shadcn tokens (`bg-background`, `text-muted-foreground`, `border-border`, ...) for surfaces and text, so both themes stay consistent. Where CSS variables can't be read (a canvas, `ImageResponse`), copy the palette value and name it in a comment.
- **shadcn/ui** (`components.json`, style `base-nova`, base color `neutral`, icon library `lucide`) is the component library: reach for a shadcn component before writing one from scratch. `Button` and `Card` are in place so far (`src/app/components/ui/shadcn/{button,card}.tsx`). Add components with `pnpm shadcn:add <name>` (wraps `pnpm dlx shadcn@latest add`) — aliases and target paths are in `components.json`. Components from other shadcn registries are added the same way (`pnpm shadcn:add @<registry>/<name> --path src/app/components/ui/<registry>`), after declaring the registry in `components.json`; pin any dependency the CLI installs with `^`.
- Links that need to look like a `Button` (e.g. external CTAs) must stay plain `<a>`/`Link` elements styled with the exported `buttonVariants(...)` helper (`linkButtonVariants(...)` from `ui/8bit/button` for the 8-bit look), not `Button` itself — Base UI's `Button` enforces button semantics (`role="button"`, keyboard handling) and its own docs say not to render links through it.
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
