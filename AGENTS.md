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
- Both the original in-game rating and a custom difficulty are stored to put difficulty in perspective. Both can be N/A, and the in-game rating goes below Easy Demon (Auto to Insane) so underrated levels can be on the list.
- Standard demon list features: user accounts with manual verification (anti-impersonation), admin accounts, admin tools (place/move levels, set difficulty, manage players, ban/unban), records/completions.
- Design: friendly, not strict and not "AI-looking"; Geometry Dash-style visuals are welcome.

## Tech Decisions

- Auth: **Better Auth** (`src/lib/server/auth.ts`); never write auth from scratch. Regenerate its schema with `pnpm auth:schema`.
    - Email + password with required email verification, `username` plugin (login by email or username), change email (old address confirms, new address verifies), password reset, account deletion (password + email confirmation).
    - Pages call Better Auth through the client (`src/lib/auth-client.ts`), not `auth.api` in form actions, so requests go through `/api/auth` and get Better Auth's rate limiting and origin checks.
    - Signed-in user is in `locals.user` (set in `src/hooks.server.ts`) and exposed to pages as `data.user` by the root layout (with `avatarUrl` and `accountVerified`). `/dashboard/*` requires a session; the `(guest)` route group redirects signed-in users away.
    - `admin` plugin: `role`, `banned`, `banReason`, `banExpires` on users (banned users can't sign in and are hidden from the list). Extra user fields (`additionalFields`, `input: false`, so only the server sets them): `avatar` (media key) and `accountVerified` (manual verification). Never use Better Auth's `image` field, clients can set it to any URL.
- Email: **nodemailer** (`src/lib/server/mail.ts`). If `SMTP_URL` is empty, emails are printed to the server console (development).
- Database: **SQLite via Drizzle ORM** (`better-sqlite3`), code in `src/lib/server/db`. Schema changes: `pnpm db:push` (dev) or `db:generate` + `db:migrate`. Never pass `--force` to `db:push`: it auto-accepts data-loss statements (it once emptied the `user` table). drizzle-kit 0.31 is patched (`patches/`, `pnpm patch`): its SQLite introspection gave every table the check constraints of all tables, so `push` tried to rebuild every table and failed on duplicate indexes. Its push runs statements without a transaction, a failed push leaves the ones before the error applied.
    - Players are the user accounts. List tables in `schema.ts`: `difficulty` (our own meter, `position` 1 = easiest), `level` (`position` null = Future List, `futurePosition` orders the Future List with 1 = hardest, null on the Main List and for levels that just joined it, they sort last; `gameDifficulty` is the `GameDifficulty` enum, `listDifficultyId` null = N/A), `record` (every submission with its status), `rating` (engagement, one per player and level), `list_change` (Main List history, keeps `level_name` after a level is deleted).
    - Derived values are computed, not stored: points (`pointsFor(position)`), engagement (average of ratings), record counts, leaderboard and ranks (players with equal points share a rank).
    - All list queries live in `src/lib/server/list.ts` and return the shapes from `src/lib/list.ts`. They hide banned players and only count `approved` records; a player's best record per level wins.
    - Difficulties: the in-game rating is the `GameDifficulty` enum (`src/lib/list.ts`, faces `static/gd/difficulties/<value>.png` from the game's `diffIcon_*` sprites). Our own meter lives in the `difficulty` table with uploaded faces (`MediaKind.DifficultyFace`) and is managed by admins on `/admin/difficulties` (add, rename, replace face, drag to reorder, delete; levels of a deleted difficulty become N/A). `pnpm difficulties` adds the Demons In Between set (30 difficulties, faces in `scripts/dib`, extracted from the mod) and skips existing names. Show faces with `DifficultyFace` and `gameDifficultyRef`/`levelDifficultyRef`/`naDifficultyRef` from `src/lib/gd.ts`.
    - `pnpm db:seed` fills the DB with sample data (players with the password `lemonlist`, levels with generated previews, records, ratings, history). It refuses if levels exist; `pnpm db:seed --reset` deletes ALL list data and the sample players first.
- Media (avatars, level previews): **local disk on the VPS** (no S3/R2/CDN; this is a small local community project, don't overcomplicate), in `MEDIA_DIR` (default `media`), served by `src/routes/media/[...key]/+server.ts`.
    - `src/lib/server/media.ts`: `saveImage(kind, bytes)` validates (size, PNG/JPEG/WebP), re-encodes to WebP with **sharp** (resizes, strips metadata) and returns a random key to store in the DB; `deleteMedia`, `mediaUrl`, `avatarUrl`, `levelThumbnailUrl`. `src/lib/server/media-store.ts` is the same without SvelteKit imports, for scripts.
    - Fallbacks: no avatar shows `gd/cube-default.png`; a level without a preview shows the YouTube thumbnail of its video, otherwise `gd/preview-default.png` (regenerate with `pnpm exec tsx scripts/default-preview.ts`).
- Styling: **Tailwind CSS** (stylesheet: `src/routes/layout.css`).
- General rule: prefer a library over hand-written code, except where a library would be overhead or the task is trivial.
- Env vars are declared in `src/env.ts` and live in `.env` (see `.env.example`): `DATABASE_URL`, `ORIGIN`, `BETTER_AUTH_SECRET`, `SMTP_URL`, `MAIL_FROM`, `MEDIA_DIR`.
- UI: a faithful Geometry Dash look (inspired by GDBrowser by GDColon). Textures and sprites in `static/gd` are extracted from the game resources (background, ground, floor line, GJ_button_01-06, GJ_square01, icons, difficulty faces, default cube); Pusab and the list frame come from the GDBrowser archive. Reference them through `sprite()`/`gameDifficultyRef()` in `src/lib/gd.ts`. Design classes live in `src/routes/layout.css` (`gd-title`, `gd-gold`, `gd-box`, `gd-dark`, `gd-light`, `gd-input`, `gd-label`, `gd-press`); use `GdButton` for buttons and `GdList` for framed brown lists. Prefer GD sprites over icon libraries.
- Data shapes for the list (levels, records, players, difficulties) live in `src/lib/list.ts`; pages get them from `src/lib/server/list.ts` through their `+page.server.ts` loads.
- Interactions are form actions (`use:enhance`) validated with **valibot** helpers from `src/lib/server/forms.ts` (every action returns `{ action, error, success }`). Mutations live in `src/lib/server/list-actions.ts` (throw `ActionError` for user-facing errors). Actions must call `requireUser`/`requireAdmin` (`src/lib/server/access.ts`) themselves, layout loads don't protect actions.
- Admins: `role` contains `admin` (Better Auth admin plugin). Make the first admin with `pnpm admin <username or email>` (`--remove`, `--list`); after that admins manage roles on `/admin/players`. Roles and bans go through `authClient.admin` (bans sign the player out); account verification and avatar removal are form actions. Records of unverified accounts can't be approved.
- Admin pages under `/admin` (records review, players, add/edit level). Admins reorder the Main List by dragging the arrow handle (SortableJS, `src/lib/sortable.ts`) or with the arrow keys; `placeLevel` shifts the other levels and writes `list_change`. The Future List (`/levels/future`) is reordered the same way (`moveFutureLevel` renumbers it, no history); both pages send moves through `src/lib/move-level.ts`. Placing a level on the Main List clears its Future List place.
- Icon kit (`/dashboard/icon-kit`, a GD-style garage): instead of uploading an avatar, players pick an icon of every mode (cube, ship, ball, UFO, wave, robot, spider, swing, jetpack), the colors (the game's 107, primary/secondary/glow) and glow. The last picked mode is shown, like on game leaderboards. Saving stores the kit as JSON in `user.iconKit` and renders the shown icon (sharp, server) into the regular avatar; profiles show the whole kit.
    - `pnpm icons "<Geometry Dash>/Resources"` extracts the icons from the game into `static/gd/icons/<mode>/<id>.png` (frames repacked in one column), `static/gd/icons/manifest.json` (frames, robot/spider idle poses) and the garage buttons into `static/gd/garage`. Rerun after game updates that add icons.
    - "Auto-Apply" copies the kit of a game account: `src/lib/server/gd-servers.ts` asks the Geometry Dash servers (boomlings.com, `getGJUsers20` for the account and shown mode, `getGJUserInfo20` for the icons, colors and glow; requests must have an empty User-Agent or they get 403). It only fills the garage, the player still saves. One lookup per player every 5 seconds, the servers ban spamming IPs.
    - `src/lib/icons.ts` composes icons into SVG (layers, tints, poses; no SvelteKit imports), `src/lib/icon-kit.ts` loads and validates the manifest and kits, `src/lib/server/icons.ts` renders a kit to PNG. Show icons with `GdIcon`. The manifest is too big for page data: the garage loads it in the browser, the server reads it with `event.fetch`.
- Uploads: production needs `BODY_SIZE_LIMIT=10M` for adapter-node (default 512K), previews can be up to 8 MB.

## Commands

- `pnpm dev` - dev server
- `pnpm build` - production build (outputs Node server to `build/`, run with `node build`)
- `pnpm check` - svelte-check type checking (must pass with zero errors)
- `pnpm lint` - prettier check + eslint
- `pnpm format` - prettier write
- `pnpm db:seed` - sample data for development (`--reset` replaces all list data)
- `pnpm admin <username or email>` - make a player an admin (`--remove`, `--list`)
- `pnpm difficulties` - add the Demons In Between difficulties to our own meter
- `pnpm icons "<Geometry Dash>/Resources"` - extract the player icons from the game for the icon kit

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
