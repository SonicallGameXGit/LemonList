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
- **Mobile is a first-class target.** Every new page, component or interaction must be designed and checked for phones too (about 360-400px wide: no horizontal scroll, touch-friendly targets, layouts that stack, nothing that only works with a mouse or hover). If something has no intuitive mobile version or has pitfalls on touch screens, don't guess: tell the user and discuss it before or while implementing.

## Tech Decisions

- Auth: **Better Auth** (`src/lib/server/auth.ts`); never write auth from scratch. Regenerate its schema with `pnpm auth:schema`.
    - Email + password with required email verification, `username` plugin (login by email or username), change email (old address confirms, new address verifies), password reset, account deletion (password + email confirmation).
    - Pages call Better Auth through the client (`src/lib/auth-client.ts`), not `auth.api` in form actions, so requests go through `/api/auth` and get Better Auth's rate limiting and origin checks.
    - Signed-in user is in `locals.user` (set in `src/hooks.server.ts`) and exposed to pages as `data.user` by the root layout (with `avatarUrl` and `accountVerified`). `/dashboard/*` requires a session; the `(guest)` route group redirects signed-in users away.
    - `admin` plugin: `role`, `banned`, `banReason`, `banExpires` on users (banned users can't sign in and are hidden from the list). Extra user fields (`additionalFields`, `input: false`, so only the server sets them): `avatar` (media key) and `accountVerified` (manual verification). Never use Better Auth's `image` field, clients can set it to any URL.
- Email: **nodemailer** (`src/lib/server/mail.ts`). If `SMTP_URL` is empty, emails are printed to the server console (development).
- Database: **SQLite via Drizzle ORM** (`better-sqlite3`), code in `src/lib/server/db`. Schema changes: `pnpm db:push` (dev) or `db:generate` + `db:migrate`. Never pass `--force` to `db:push`: it auto-accepts data-loss statements (it once emptied the `user` table). drizzle-kit 0.31 is patched (`patches/`, `pnpm patch`): its SQLite introspection gave every table the check constraints of all tables, so `push` tried to rebuild every table and failed on duplicate indexes. Its push runs statements without a transaction, a failed push leaves the ones before the error applied.
    - Players are the user accounts. List tables in `schema.ts`: `difficulty` (our own meter, `position` 1 = easiest), `level` (`position` null = Future List, `futurePosition` orders the Future List with 1 = hardest, null on the Main List and for levels that just joined it, they sort last; `gameDifficulty` is the `GameDifficulty` enum, `listDifficultyId` null = N/A), `record` (every submission with its status), `rating` (engagement, one per player and level), `list_change` (Main List history, keeps `level_name` after a level is deleted), `level_submission` (levels players beat that aren't on the list, `status` reuses `RecordStatus`, `level_id` is the level made from it).
    - Derived values are computed, not stored: points (`pointsFor(position)`), engagement (average of ratings), record counts, leaderboard and ranks (players with equal points share a rank).
    - All list queries live in `src/lib/server/list.ts` and return the shapes from `src/lib/list.ts`. They hide banned players and only count `approved` records; a player's best record per level wins.
    - Difficulties: the in-game rating is the `GameDifficulty` enum (`src/lib/list.ts`, faces `static/gd/difficulties/<value>.png` from the game's `diffIcon_*` sprites). Our own meter lives in the `difficulty` table with uploaded faces (`MediaKind.DifficultyFace`) and is managed by admins on `/admin/difficulties` (add, rename, replace face, drag to reorder, delete; levels of a deleted difficulty become N/A). `pnpm difficulties` adds the Demons In Between set (30 difficulties, names in `src/lib/dib.ts`, faces in `scripts/dib`, extracted from the mod) and skips existing names. Show faces with `DifficultyFace` and `gameDifficultyRef`/`levelDifficultyRef`/`naDifficultyRef` from `src/lib/gd.ts`.
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
- Level submissions: players send a level they beat that isn't on the list on `/dashboard/submit-level` (`LevelForm` with `submission`: completion video, raw footage, notes, a suggested LemonList difficulty; up to 5 pending per player). Admins review them on `/admin/submissions` (the "Levels" tab): `/admin/submissions/[id]` is the regular level form filled from the submission, accepting (`acceptLevelSubmission`) creates the level, moves the player's preview to it and turns the completion into a record (approved if the account is verified; pending submissions of the same level by others become pending records; no record for the verifier). Rejecting or withdrawing deletes the uploaded preview.
- Level lookup: the "Fetch" button of `LevelForm` calls `GET /api/levels/lookup?id=<level ID>` (signed-in users, shares the 5 second cooldown of the icon kit lookup). `src/lib/server/level-lookup.ts` asks the GD servers (`getGJLevels21`, `fetchGameLevel` in `gd-servers.ts`: name, creator, rating; unrated levels are N/A), the Demon Ladder (`gdladder.com/api/levels/<id>`, `Rating` or `DefaultRating` is the tier) and the in-game thumbnails (`levelthumbs.prevter.me/thumbnail/<id>`). The tier becomes a Demons In Between difficulty with the mod's own table (`src/lib/dib.ts`, rounded tier; the hardcoded top 1 is Infinite Demon), matched to our meter by name. The `gameThumbnail` checkbox makes the server download the thumbnail as the preview when nothing is uploaded (`formPreview` in `level-form.ts`). The ID field also takes a name: anything that isn't a number turns Fetch into Search, `GET /api/levels/search?q=<name>` (`searchLevels`, `searchGameLevels`, same cooldown) returns the first 5 online levels (marked if they're on the list) shown as a dropdown under the field (arrow keys, Escape, outside clicks close it). Picking one puts its ID in the field and looks it up; levels of the player's last search skip the cooldown once (the servers already sent them, only the ladder and thumbnails are asked).
- Admin pages under `/admin` (records review, level submissions, players, add/edit level). Admins reorder the Main List by dragging the arrow handle (`sortable` attachment in `src/lib/sortable.ts`: pointer events, the row moves only vertically, held where it was grabbed, others slide aside, the page scrolls near the screen edges; SortableJS was dropped because it can't lock the axis) or with the arrow keys; `placeLevel` shifts the other levels and writes `list_change`. The Future List (`/levels/future`) is reordered the same way (`moveFutureLevel` renumbers it, no history); both pages send moves through `src/lib/move-level.ts`. Placing a level on the Main List clears its Future List place. Moves can take our difficulties along (`src/lib/difficulty-shuffle.ts`, used by both the page and the server): the faces stay at their places and the levels between the old and new place move through them (N/A levels are skipped). If a move would change any, `MoveDialog` lists every change and asks "Move only" or "Move and change" (the move action gets `difficulties=on`).
- Icon kit (`/dashboard/icon-kit`, a GD-style garage): instead of uploading an avatar, players pick an icon of every mode (cube, ship, ball, UFO, wave, robot, spider, swing, jetpack), the colors (the game's 107, primary/secondary/glow) and glow. The last picked mode is shown, like on game leaderboards. Saving stores the kit as JSON in `user.iconKit` and renders the shown icon (sharp, server) into the regular avatar; profiles show the whole kit.
    - `pnpm icons "<Geometry Dash>/Resources"` extracts the icons from the game into `static/gd/icons/<mode>/<id>.png` (frames repacked in one column), `static/gd/icons/manifest.json` (frames, robot/spider idle poses) and the garage buttons into `static/gd/garage`. Rerun after game updates that add icons.
    - "Auto-Apply" copies the kit of a game account: `src/lib/server/gd-servers.ts` asks the Geometry Dash servers (boomlings.com, `getGJUsers20` for the account and shown mode, `getGJUserInfo20` for the icons, colors and glow; requests must have an empty User-Agent or they get 403). It only fills the garage, the player still saves. One lookup per player every 5 seconds, the servers ban spamming IPs.
    - `src/lib/icons.ts` composes icons into SVG (layers, tints, poses; no SvelteKit imports), `src/lib/icon-kit.ts` loads and validates the manifest and kits, `src/lib/server/icons.ts` renders a kit to PNG. Show icons with `GdIcon`. The manifest is too big for page data: the garage loads it in the browser, the server reads it with `event.fetch`.
- Pagination: Main List, Future List, admin Records, Levels (submissions), Players and Difficulties show 25 per page, the dashboard's "Your submissions" 5. The page is `?page=N` (`src/lib/pagination.ts`: `paginate` clamps it, `pageHref` keeps the rest of the query), shown with `Pagination` (its `anchor` scrolls to the list, give `GdList` that `id`). Lists the page already has whole (Main, Future, Difficulties: drag and drop, client search) are sliced in the browser, drag indexes are offset by the page; the others page in SQL (`limit`/`offset` plus a count). Dragging only works within a page: the arrow keys cross pages, the level form sets any Main List place.
- `LevelRow` lays out by its own width (container queries), so it works in narrow columns; `details`/`actions` snippets replace its stats and View button (the dashboard's submissions use them). Players (not admins) get `RequestLevel` above both lists, linking to the level submission page.
- Icons: the diamond is List points, the star is engagement (rating), the check is records.
- Changelogs (`/changelogs`, the newest 2 on the landing page): Markdown files in `changelogs/` named by version, `N.0.md` is a major update and `N.M.md` its minor updates, with a front matter of `title` and `date` (`YYYY-MM-DD`). `src/lib/server/changelogs.ts` bundles them (`import.meta.glob`), renders them with **marked** and sorts them by version; a bad name, front matter or a minor update without its major one fails at startup. `ChangelogMajor` shows a major update, its minor ones open below it as a tree (closed by default). How to write them: see Writing Changelogs below.
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

## Writing Changelogs

When asked to write news, a changelog or a "what's new" for an update (or for the latest work), do the whole job yourself: find what changed, choose Major or Minor, pick the version and write the text. Don't ask the user to decide unless the request is really unclear.

1. **Find what changed.** Read the newest files in `changelogs/` (highest versions and their dates) to see what is already told, then `git log` and the diffs of the commits after it (or the work the user points at). Check the code when a commit message is vague; never describe a feature you didn't confirm.
2. **Skip what players can't notice**: refactors, tooling, dependencies, docs, code style. Internal work only gets an entry when it fixed something that was broken for players or admins.
3. **Choose the type by what players see, not by the size of the code.** Ask "will people notice this at a glance, and does it change what they can do or see on the site?" A few lines can be a major, a huge rewrite can be a minor or nothing.
    - **Major** (`N.0.md`, N = the highest major + 1): anything visible to everyone right away that gives them something new to do or see: a new page, section, block on the home page or system (records, the icon kit, level submissions, the changelogs themselves). Also a batch of changes that together change how the site is used or looks. Example: the Changelogs page was little code, but anyone opening the site finds it at once and can now read every past and future update, so it is a major.
    - **Minor** (`N.M.md`, the newest major's N and its highest M + 1): changes to things that already exist, which people only notice when they use that feature: improvements, extra options, admin-only tweaks and fixes. Fixes are minors even when they are important or critical, most people never notice them. A minor always belongs to the newest major, even when it is about an older feature.
    - When unsure, imagine a player opening the site after a week away: if they would spot it and wonder "what's this?", it's a major; if they'd never notice, it's a minor.
4. **Group sensibly.** One file is one update the players see, not one commit: merge related commits into one entry, split unrelated work into separate files (a major plus minors when a big feature came with separate fixes). Number the files in the order the work landed.
5. **Never renumber or delete** existing files, and don't rewrite old entries (fixing a typo or a wrong fact is fine).

File format, look at the existing files as examples:

```md
---
title: Level submissions
date: 2026-10-12
---

One or two sentences about what the update brings and why it matters (majors only).

- One change per bullet
```

- `title`: 1-4 words in sentence case, naming the feature or the fix (`Icon Kit`, `Moving levels fixed`). Quote it if it contains a colon.
- `date`: `YYYY-MM-DD`, the day the update went live (the date of its last commit).
- Majors: a short intro paragraph, then 3-6 bullets. **Bold** the names of the main new things, a few per major at most.
- Minors: 1-4 bullets only, no intro, no bold unless it names a new button or page.
- Write for players, not developers: friendly and plain English, "you" for players, "admins" for admin features. No file names, function names, libraries, commit hashes or code. Use the names the UI shows (Main List, Future List, Fetch, Auto-Apply...).
- Bullets start with a capital letter and have no final period. A fix starts with "Fixed" and says what was broken from the user's side ("Fixed levels not moving after...").
- Only paragraphs, lists, bold and links to our own pages; no headings, images or HTML.

Then run `pnpm format` (Markdown is checked by `pnpm lint`) and open `/changelogs` if a dev server is running to see that it renders.

## Workflow Notes

- Run `pnpm check` and `pnpm lint` before finishing a task.
- Check UI changes at phone width as well as on desktop (see the mobile rule in Product Overview).
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
