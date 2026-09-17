# TNF Fantasy Football

A private fantasy football app for a group of friends who play weekly 7-a-side football. Fantasy managers pick 7 real players from the group and score points based on how those players actually perform each week.

This is **not** Premier League Fantasy Football — it's a self-hosted, private game for one group.

## Tech stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS 4**
- **PostgreSQL** via **Prisma 6** — designed to work equally well against a local Postgres or a hosted one (e.g. Supabase's Postgres)
- **Argon2id** password hashing, opaque server-side session tokens in HTTP-only cookies
- **Vitest** (unit + integration tests) and **Playwright** (end-to-end tests)

## Local development

### 1. Install dependencies

```bash
npm install
```

> If `npm install` fails with `Cannot read properties of null (reading 'edgesOut')`, that's an unrelated npm/arborist bug — retry with `npm install --legacy-peer-deps`.

### 2. Set up PostgreSQL

You need a running PostgreSQL server. Locally:

```bash
createdb fantasy7        # the app's database
createdb fantasy7_test   # used only by the integration/e2e test suites
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` (and `DIRECT_URL`) to point at your Postgres instance. For a plain local Postgres these are identical; for a pooled host like Supabase, `DATABASE_URL` is the pooled connection the app uses at runtime and `DIRECT_URL` is the direct connection Prisma Migrate needs — see the comments in `.env.example`.

### 4. Run migrations and seed data

```bash
npx prisma migrate dev
npm run db:seed
```

Seeding creates:
- The initial scoring rules (matching the spec's default point values)
- League budget setting (£100m)
- ~16 sample real-life players so the team builder isn't empty
- One `ADMIN` account, username `admin`, with a **randomly generated temporary password printed to the console**. You'll be asked to set a permanent password on first login.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up a manager account, or log in as `admin` with the credentials printed by the seed script.

## Testing

```bash
npm run test              # unit tests (scoring engine, formation validation) — no DB needed
npm run test:integration  # integration tests against a real Postgres (fantasy7_test) — proves
                           # idempotent recalculation, scoring-rule versioning, and immunity to
                           # later player-position edits, all at the database layer
npx playwright test       # end-to-end tests against a running dev server (starts one automatically
                           # if none is already listening on :3000) — covers the full manager/admin
                           # journey and security/authorization boundaries
```

Before running `test:integration`, apply migrations to the test database once:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fantasy7_test?schema=public" npx prisma migrate deploy
```

The Playwright suite creates its own deterministic fixture accounts and players via `tests/e2e/global-setup.ts` (independent of the app's own random-password admin seed), and is safe to run repeatedly against the same database — each run picks fresh, non-colliding gameweek numbers and usernames, and resets scoring rules to a known baseline first.

> In this sandboxed dev environment, Playwright's own browser download is blocked; a pre-installed Chromium is used instead via `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npx playwright test`. On a normal machine, just run `npx playwright install` once and drop that env var.

## Other commands

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run build        # production build
npm run db:studio   # Prisma Studio (browse the database)
```

## Deployment

This app is a standard Next.js app and deploys to Vercel (or any Node host) with a Postgres database (e.g. Supabase, Neon, RDS):

1. Provision a Postgres database and set `DATABASE_URL` and `DIRECT_URL` as environment variables on your host (see `.env.example` — on a pooled host like Supabase these are two different connection strings; on a plain Postgres host they're identical).
2. Run `npx prisma migrate deploy` against that database (as a one-off, from your own machine or a deploy step — not on every build).
3. Run `npm run db:seed` once to create the initial admin account, scoring rules, and league settings — **note the printed admin temporary password**, since it's only shown once.
4. Deploy the app (`npm run build && npm run start`, or connect the repo to Vercel).

Never commit real secrets. `.env` is git-ignored; use your hosting platform's environment variable settings for `DATABASE_URL`/`DIRECT_URL` in production.

## Project structure

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture write-up (data model, scoring engine, gameweek lifecycle, historical-data guarantees, and key business rules). Short version:

- `src/lib/scoring.ts` — the **one and only** place fantasy-point math happens (pure, unit-tested)
- `src/lib/recalc.ts` — recalculation engine: replaces derived rows from source data, never increments
- `src/lib/scoring-rules.ts` — immutable, versioned scoring-rule snapshots
- `src/app/actions/*` — Server Actions (all mutations; every one enforces its own authorization)
- `src/app/admin/*` — admin-only pages, guarded by `requirePageAdmin()`
- `prisma/schema.prisma` — data model, with inline comments explaining historical-snapshot design decisions
