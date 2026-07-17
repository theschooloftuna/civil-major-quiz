@AGENTS.md

# civil-major-quiz

> This file is the project constitution. Claude Code reads it at the start of
> every session. Keep it accurate and concise.

## Mission
A short personality-quiz web app: the user answers 7 questions, and the app
recommends which civil engineering major/specialization suits them best out of
7 options, showing the top 3 matches (more if tied) each with a match
percentage.

## Tech stack
- Language / runtime: TypeScript, React 19
- Framework: Next.js 16 (App Router) — see AGENTS.md: this version has
  breaking changes vs. training data, consult `node_modules/next/dist/docs/`
  before writing framework-facing code (routing, data fetching, config).
- Styling: Tailwind CSS v4 + shadcn/ui (`components.json`: style `base-nova`,
  base color `neutral`) built on `@base-ui/react` primitives
- Icons: `@phosphor-icons/react` — in Server Components (the default here),
  import from `@phosphor-icons/react/ssr`, not the root package, or the icon
  will crash (it relies on React Context that isn't available in RSC/SSR).
  Only Client Components (`"use client"`) can import from the root package.
- Testing: Vitest + React Testing Library (jsdom environment)
- Package manager: pnpm

## Design system
Visual style is modeled on [phosphoricons.com](https://phosphoricons.com):
warm paper background, grass-green primary, hard-edged flat shadows. Tokens
live in `src/app/globals.css` (`:root`), fonts are wired in `src/app/layout.tsx`.
- Palette: warm off-white background (`--background` / "ghost"), near-black
  ink foreground (`--foreground` / "stone"), grass-green primary (`--primary`
  `#1fa647`), acid-lime accent (`--accent` `#c4e456`) for highlights/hover.
  Chart colors cycle through green/acid/blue/orange/purple.
- Typography: Manrope (`font-sans`) for body/UI text, IBM Plex Mono
  (`font-mono`) for labels/tags — matches the reference site's uppercase
  monospace labels.
- Shape/shadow language is flat and hard-edged, not soft-shadow Material
  style: crisp 1-2px borders (often `border-foreground`), offset hard shadows
  with no blur (`shadow-hard-sm` / `shadow-hard` / `shadow-hard-lg` utilities
  defined in `globals.css`), mostly sharp-to-small corner radii
  (`--radius: 0.5rem` base). Interactive elements (see `Button`) shed their
  shadow and translate into it on `:active` for a tactile "pressed" feel.
- Light mode only for now — no dark mode/theme toggle is implemented.

## Commands
> The SDD loop relies on these being correct — Implement and Verify run them.
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Build: `pnpm build`
- Test: `pnpm test` (single run, CI-safe) — `pnpm test:watch` for watch mode
- Test (single file): `pnpm test <path/to/file.test.tsx>`
- Lint / format: `pnpm lint`
- Typecheck: `pnpm typecheck`

## Environment variables
The quiz feature persists results to Supabase. Copy `.env.example` to
`.env.local` (gitignored) and fill in real values from your Supabase
project's API settings:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Apply the SQL migrations in `supabase/migrations/` to that project first
(via the Supabase SQL editor or `supabase db push`) — they create the
`quiz_results` table, its RLS policies, and the `quiz_results_public` view
that the app's only public read path uses. Without these env vars set,
quiz submissions still show a result locally but never get a working
`/result/<id>` permalink.

## Architecture rules
- Quiz domain logic (question set, scoring, major-matching, percentage calc)
  lives in `src/lib/`, framework-agnostic and unit-testable — components only
  render state, they don't compute it.
- Generated shadcn/ui primitives live in `src/components/ui/`; app-specific
  composed components (quiz flow, results screen, etc.) go in
  `src/components/`.
- Use the `@/*` path alias (maps to `src/*`) instead of relative parent
  imports (`../../`).
- Server Components by default; add `"use client"` only where interactivity
  (answer selection, quiz progress state) requires it.

## Conventions
- TypeScript strict mode (already on in `tsconfig.json`); no `any`.
- Components: function declarations with named exports (see
  `src/components/ui/button.tsx`).
- Styling: Tailwind utility classes composed through `cn()` from
  `src/lib/utils.ts`; variants via `class-variance-authority` (`cva`).
- Tests colocated as `*.test.tsx` / `*.test.ts` next to the file under test.
- Commit format: `type: summary` (feat/fix/chore/refactor/test/docs), e.g.
  `feat: add quiz results page`.

## Spec-driven development
This project uses the SDD process in `SDD-WORKFLOW.md`. Specs are the source
of truth and live in `specs/<feature-slug>/`. Phases are driven by
`/specify`, `/plan`, `/implement`, and `/verify`.

Rules for you (the agent):
- In Specify and Plan phases, do NOT write implementation code.
- In Implement, stay scoped to the approved plan. If the plan is wrong, stop
  and tell me — do not silently redesign.
- Never mark a feature done until every acceptance criterion in the spec
  passes.

## Out of scope / do not touch
- Don't hand-edit generated files under `src/components/ui/` beyond what the
  `shadcn` CLI produces — re-run the CLI (`pnpm dlx shadcn add <component>`)
  instead where possible.
- Don't remove or weaken the Next.js-version warning at the top of
  `AGENTS.md`.
