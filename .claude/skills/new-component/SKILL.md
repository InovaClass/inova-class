---
name: new-component
description: Add a new shadcn/ui component or a new shared frontend component to this Next.js project, following the repo's shadcn setup, Base UI semantics, and direct-import convention (no barrels). Use when asked to add/install a shadcn component, or to create a new shared component under src/app/components.
---

## Adding a shadcn/ui component

1. Run `pnpm shadcn:add <name>` (wraps `pnpm dlx shadcn@latest add`). Aliases and target paths come from `components.json` (style `base-nova`, base color `neutral`, icon library `lucide`) — components land under `src/app/components/ui/shadcn/`.
2. Before wiring up any interactive part of the new component, check `node_modules/@base-ui/react/docs/react/components/<name>.md` (if it exists) for the primitive's semantics and keyboard behavior — Base UI enforces role/keyboard handling that can differ from other headless kits.
3. If the component (or something using it) needs to render a link that looks like a `Button`, keep it a plain `<a>`/`Link` styled with `buttonVariants(...)` — never render a link through `Button` itself.
4. Don't create or update an `index.ts` barrel: consumers import the component directly from its file through the `@/` alias (e.g. `@/app/components/ui/shadcn/button`).
5. Run `pnpm eslint:check` and `pnpm prettier:check`; add a Vitest unit test (`@testing-library/react`) if the component has non-trivial logic.

## Adding a new shared (non-shadcn) component

Same import/lint/test steps as above (2–5), skipping the `shadcn:add` step. Place the file under `src/app/components` (or `src/app/hooks` / `src/app/helpers` if it's a hook or helper, not UI).
