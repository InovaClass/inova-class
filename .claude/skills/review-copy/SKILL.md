---
name: review-copy
description: Review the text in the code — identifier naming, comments, test descriptions, UI copy and metadata, and the docs — for spelling, grammar, consistency and the project's conventions, and report findings to accept. Use when asked to review naming, comments, wording or copy in a file, a diff or the whole project.
---

Talk to the user in pt-BR. Report findings and propose exact replacements; apply only the ones the user accepts.

## Scope

Work on what the user names: a path, the current diff (`git diff main...HEAD` plus uncommitted changes), or the whole project. For the whole project, cover `src/`, the configuration files at the root, `.github/`, `.claude/` (except the vendored skills symlinked from `.agents/`), `.husky/`, `docs/`, `AGENTS.md` and `README.md`, and skip generated or vendored code (`.next`, `.agents`, `node_modules`, `pnpm-lock.yaml`, `src/infra/database/migrations/`). Components copied from a registry (`src/app/components/ui/shadcn/`, `ui/8bit/`) are only checked for UI copy we added, not for their upstream naming. Read the files before reporting.

The code, comments and docs are in English; the UI copy, metadata and email templates are in pt-BR. Check each text in its own language.

## Check

1. **Spelling**: typos in identifiers, comments, strings and docs, in both languages, including pt-BR diacritics (`não`, never `nao`).
2. **Naming**:
   - Correct English, including each word of a compound identifier and its grammatical number.
   - The name says what the thing is or does, at the level of the caller: no vague names (`data`, `handle`, `info`, `temp`) where a specific one fits, and no names that lie about the type or the behavior.
   - Consistent patterns across the codebase: `get*` for lookups, `is*`/`has*` for booleans, `use*` only for hooks, `<domain>Model` for models, components in PascalCase, files in kebab-case, `action.ts` only for files with `'use server'` (see Project structure in `AGENTS.md`).
   - The same concept has the same name everywhere (e.g. `teacher` vs `professor` in code, `user` vs `account`), in code, tests and docs.
3. **Comments**: grammar, and the project rule from `AGENTS.md`: a comment only records why a decision was made, ideally with a reference; flag comments that explain what the code does or how it works, and comments that are stale (the reason no longer applies or the reference is gone).
4. **Test descriptions**: grammar, and whether each `describe`/`test` reads as a sentence that states the expected behavior (`test('maps credential errors to UnauthorizedError')`), consistent in tense and person within a file.
5. **UI copy, metadata and emails (pt-BR)**: grammar and standard pt-BR, tone (direct, informal "você", consistent across pages), the same term for the same thing everywhere (e.g. "entrar" vs "login", "turma", "professor"), error messages that say what happened and what to do next (`message` + `action`, see `src/infra/errors.ts`), accessible names (`aria-label`, alt text) that describe the purpose, and page titles in metadata (the root layout's `title.template` adds `| inova.class`).
6. **Docs** (`AGENTS.md`, `README.md`, `docs/`, issue templates): grammar, consistency with the code (paths, script names and file names that still exist), consistency between `AGENTS.md` and `README.md`, and the Documentation Rules in `AGENTS.md`.

## Report

Group findings by severity, most severe first:

- **Erro**: typos, grammar mistakes, names or comments that are wrong or misleading, docs that contradict the code.
- **Melhoria**: unclear or inconsistent naming, comments that break the project rule, test descriptions that don't state the behavior.
- **Sugestão**: optional wording.

For each finding: `path:line`, the current text, the proposed text and a one-line reason. Mark renames of exported symbols or files, since they touch other files; list where they're used. Skip categories with no findings.

Then ask which findings to apply. Apply renames across every usage (code, tests, docs), then run `pnpm type-check`, `pnpm eslint:check`, `pnpm prettier:check` and `pnpm test`.
