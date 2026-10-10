# LemonList

Demonlist / Pointercrate alternative for a local Geometry Dash community, covering demons starting from Easy Demons.

## Project Configuration

- **Language**: TypeScript
- **Framework**: SvelteKit (Svelte 5) with `@sveltejs/adapter-node` (deployed on a regular VPS as a Node server)
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, sveltekit-adapter, ai-tools, tailwindcss, drizzle, better-auth

## Product Overview

- A Demon list **starting from Easy Demons**: unlike classic lists that only rank the hardest demons, the lowest difficulty included is Easy Demon.
- Two lists: **Main List** (verified levels) and **Future List** (levels ready to be verified but not placed yet).
- Players rate how _engaging_ a level was; only players who beat the level can rate, and the final engagement is built from all ratings.
- Both the original in-game rating and a custom difficulty are stored to put difficulty in perspective.
- Standard demon list features: user accounts with manual verification (anti-impersonation), admin accounts, admin tools (place/move levels, set difficulty, manage players, ban/unban), records/completions.
- Design: friendly, not strict and not "AI-looking"; Geometry Dash-style visuals are welcome.

## Tech Decisions

- Auth: **Better Auth** (`src/lib/server/auth.ts`); never write auth from scratch. Regenerate its schema with `pnpm auth:schema`.
    - Email + password with required email verification, `username` plugin (login by email or username), change email (old address confirms, new address verifies), password reset, account deletion (password + email confirmation).
    - Pages call Better Auth through the client (`src/lib/auth-client.ts`), not `auth.api` in form actions, so requests go through `/api/auth` and get Better Auth's rate limiting and origin checks.
    - Signed-in user is in `locals.user` (set in `src/hooks.server.ts`) and exposed to pages as `data.user` by the root layout. `/dashboard/*` requires a session; the `(guest)` route group redirects signed-in users away.
- Email: **nodemailer** (`src/lib/server/mail.ts`). If `SMTP_URL` is empty, emails are printed to the server console (development).
- Database: **SQLite via Drizzle ORM** (`better-sqlite3`), code in `src/lib/server/db`. Schema changes: `pnpm db:push` (dev) or `db:generate` + `db:migrate`.
- Media (avatars, level previews): **local disk on the VPS** (no S3/R2/CDN; this is a small local community project, don't overcomplicate). Keep uploads outside `build/` and `static/` in a configurable directory, served through a server route, with size/type validation.
- Styling: **Tailwind CSS** (stylesheet: `src/routes/layout.css`).
- General rule: prefer a library over hand-written code, except where a library would be overhead or the task is trivial.
- Env vars are declared in `src/env.ts` and live in `.env` (see `.env.example`): `DATABASE_URL`, `ORIGIN`, `BETTER_AUTH_SECRET`, `SMTP_URL`, `MAIL_FROM`.
- UI: a faithful Geometry Dash look (inspired by GDBrowser by GDColon). Textures and sprites in `static/gd` are extracted from the game resources (background, ground, floor line, GJ_button_01-06, GJ_square01, icons, difficulty faces, default cube); Pusab and the list frame come from the GDBrowser archive. Reference them through `sprite()`/`difficultySprite()` in `src/lib/gd.ts`. Design classes live in `src/routes/layout.css` (`gd-title`, `gd-gold`, `gd-box`, `gd-dark`, `gd-light`, `gd-input`, `gd-label`, `gd-press`); use `GdButton` for buttons and `GdList` for framed brown lists. Prefer GD sprites over icon libraries.
- Data shapes for the list (levels, records, players, difficulties) live in `src/lib/list.ts`. Until the real schema exists, pages get **placeholder data** from `src/lib/server/placeholders.ts` through their `+page.server.ts` loads; replace those functions with DB queries returning the same shapes. Images use placehold.co placeholders (`src/lib/format.ts`).
- Not yet implemented: the DB schema for the demon list itself, admin roles/tools, manual account verification, upload handling, record submission and rating (their forms are UI-only templates).

## Commands

- `pnpm dev` - dev server
- `pnpm build` - production build (outputs Node server to `build/`, run with `node build`)
- `pnpm check` - svelte-check type checking (must pass with zero errors)
- `pnpm lint` - prettier check + eslint
- `pnpm format` - prettier write

## Code Style (mandatory)

TypeScript:

- Strings use `''` (escape inner quotes as `\'`). Use template literals only when interpolating; if the variable is at the very start or end, concatenate instead.
- No semicolons (except when several statements share one line).
- 4 spaces for indentation.
- PascalCase for classes/enums/enum members; camelCase for variables.
- Procedural style preferred over OOP; use OOP only when it clearly fits better.
- Use `const` wherever possible (mind Svelte `<script>` rules where `let` vs `const` changes SSR/reactivity behavior).
- Multi-line arrays/objects when large: one element per line, 1 indent level, always a trailing comma.
- Every `if` uses braces and is never inline:
    ```ts
    if (condition) {
        ...
    }
    ```
- Zero type errors. Never rely on knowing the runtime type; narrow `unknown`/union types with explicit checks.
- Check existence explicitly (`x === undefined`, `x === null`), never `!x`.

JSON:

- 4 spaces indentation.
- Arrays/objects with 0-3 small elements go inline (objects with spaces inside braces: `{ "a": 1 }`); everything else is multi-line with 1 indent level.

## Workflow Notes

- Run `pnpm check` and `pnpm lint` before finishing a task.
- Prefix shell commands with `rtk` (see the global RTK instructions).

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
