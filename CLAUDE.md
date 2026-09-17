@AGENTS.md

# TNF Fantasy Football — architecture notes

Private fantasy football app for a group of friends' weekly 7-a-side matches. Read this before making changes — it captures decisions that aren't obvious from the code alone.

## Stack & key commands

- Next.js 16 (App Router, Server Actions, Turbopack), React 19, TypeScript strict, Tailwind 4, Prisma 6 + PostgreSQL.
- `npm run dev` / `npm run build` / `npm run lint` / `npm run typecheck`
- `npm run test` — Vitest unit tests (scoring engine, no DB)
- `npm run test:integration` — Vitest against a real Postgres (`fantasy7_test`); proves idempotency, scoring-rule versioning, historical-position immunity
- `npx playwright test` — E2E (core journey + security/authz). Needs `PLAYWRIGHT_CHROMIUM_PATH` in this sandbox; not needed on a normal machine after `npx playwright install`.
- `npm run db:seed` — creates admin (random temp password, printed once), initial scoring rules, budget, sample players.

## Two categories of data (critical distinction)

**Source of truth** (hand-entered, never derived): `User`, `Player`, `Match`, `PlayerMatchStat`, `Gameweek`, `FantasyGameweekSquad(Player)`, `Transfer`, `ScoringRuleVersion`/`PositionScoringRule`, `LeagueSettings`.

**Derived** (always recalculable, never hand-edited, never incremented): `FantasyPlayerPoints`, `FantasyTeamGameweekPoints`. League standings and overall totals are computed live from these on read — there is no stored "standings" table.

`src/lib/recalc.ts` is the only code that writes derived rows. It always **deletes-and-recreates or upserts-with-full-replace** — never `existing += new`. This is what makes recalculation idempotent (proven by `src/lib/__tests__/recalc.integration.test.ts`): saving the same match stats twice, or three times, produces byte-identical results.

## The scoring engine

`src/lib/scoring.ts` — `calculatePlayerPoints()` is the **only** place fantasy-point arithmetic happens. Every call site (admin stat entry, recalculation) goes through it. It's a pure function: same inputs → same output, always.

- Non-appearance → 0 points, full stop. No goals/assists/MOTM/result/conceded points regardless of what else is in the input.
- Goals are position-specific (DEF/MID/FWD each have their own `goalPoints`); assists and MOTM are not.
- Goals conceded: `-floor(concededGoals / concededThreshold) * concededPenalty`, per position (all three positions share the same values initially, but the model supports diverging them).
- Captain multiplier is applied **after** computing base points (`finalPoints = basePoints * multiplier`), and is resolved per-manager at the `FantasyTeamGameweekPoints` aggregation step — `FantasyPlayerPoints.basePoints` is deliberately captain-agnostic, since the same player's performance is shared across every manager who picked them, each with their own captain status.

`src/lib/scoring-rules.ts` manages **immutable, versioned** rule snapshots (`ScoringRuleVersion` + `PositionScoringRule`). Editing Game Rules in the admin UI never mutates an existing version — it always creates a brand-new one and flips `isActive`. A `Gameweek` is pinned to whatever version was active **at the moment it was created** (`Gameweek.scoringRuleVersionId`), and that pin never changes afterward, even if the gameweek is later reopened for correction. This is how completed gameweeks stay stable when the admin changes scoring rules later (see the "historical stability" integration test).

## Historical immunity (position & price)

A player's position/price can change at any time via Admin → Players, but that must never rewrite past scoring:

- `PlayerMatchStat.positionAtTime` is captured from `Player.position` the moment stats are entered, and `recalculateMatch()` reads *this* field, never the live `Player.position`. This is the actual source of truth for scoring — it's independent of anyone's fantasy squad.
- `FantasyGameweekSquadPlayer.positionAtTime` / `.priceAtTime` separately freeze what a manager's squad looked like for display/budget-reconstruction purposes (a different concern from scoring).

## Gameweek lifecycle

`OPEN → LOCKED → COMPLETE`, with `LOCKED → OPEN` (unlock) and `COMPLETE → LOCKED` (explicit "reopen for correction") also allowed. **Only one gameweek may be OPEN at a time** — `createGameweekAction` and the `OPEN` transition both reject if another gameweek is already OPEN, because team-saving/snapshot logic needs an unambiguous "the open gameweek" to target.

- `src/lib/gameweek.ts`: `getCurrentGameweek()` picks the single most-relevant gameweek for dashboards (OPEN, else highest-numbered LOCKED, else highest-numbered COMPLETE). `isEditable()` decides whether managers can currently touch their team: blocked while a gameweek is actively `LOCKED`, or `OPEN` past its deadline; allowed when `COMPLETE` or when none exists (managers can always prep for the next cycle once the current one resolves).
- Deadline enforcement happens **server-side** in `saveTeamAction` (`src/app/actions/team.ts`), independent of the client — it re-derives editability from the database on every submit, never trusts anything the client sends about gameweek state.
- On `OPEN → LOCKED`, `autoSnapshotMissingSquads()` (`src/lib/gameweek-lock.ts`) is a safety net: any fantasy team that never explicitly saved during the OPEN window gets a squad snapshot cloned from their current persistent roster (if it's a complete valid 7). Teams with an incomplete roster get no squad and simply score 0 that gameweek.
- On `LOCKED → COMPLETE`, `recalculateGameweekTeamPoints()` runs once more as a final safety net.

## Team building, transfers & captain

`FantasyTeamPlayer` is a manager's **current/persistent** working roster — freely editable while a gameweek is OPEN. `FantasyGameweekSquad(Player)` is the **frozen snapshot** for one specific gameweek, created/updated only while that gameweek is OPEN (or by the lock-time safety net above). Historical scoring always reads from the snapshot, never the live roster.

There's no separate "make a transfer" UI — `saveTeamAction` diffs the new 7-player selection against the previous snapshot for the currently-open gameweek and logs the delta as `Transfer` rows automatically. There are no transfer limits (the spec doesn't call for any); a full squad rebuild each gameweek is allowed.

## Admin Record Stats save flow

`saveMatchStatsAction` (`src/app/actions/admin-record-stats.ts`) always **deletes and recreates** every `PlayerMatchStat` row for a match on save/edit — never patches individual fields — so repeated saves or corrections can't duplicate or accumulate points. Result (WIN/DRAW/LOSS) and goals-conceded are always *derived* from `Match.scoreA/scoreB` + `teamSide`, never entered by the admin directly.

The Record Stats page (`src/app/admin/record-stats/page.tsx`) always resolves to an **explicit** `?match=` URL param (redirecting once if absent) rather than inferring "new vs. existing" from `matches.length` — that inference was unstable: saving a brand-new match changes `matches.length` without changing the URL, which used to silently flip the page's selection out from under an in-flight save and remount the form before its success message ever rendered. Keep this in mind if you touch this page: don't reintroduce URL-less mode inference.

## Auth

Username/password only (no email). Argon2id hashing. Sessions are opaque random tokens (`crypto.randomBytes(32)`, not JWTs) stored in the `Session` table and set as an HTTP-only, `SameSite=Lax` cookie — there's no session-signing secret to manage. `src/lib/auth.ts` has `requireUser()`/`requireAdmin()` (throw `AuthError`, for use inside Server Actions) and `src/lib/guards.ts` has `requirePageUser()`/`requirePageAdmin()` (redirect, for use in page Server Components). Every admin Server Action calls `requireAdmin()` as its first line — never trust a role/id sent from the client.

## Testing layout

- `src/lib/**/*.test.ts` — pure unit tests (Vitest, no DB).
- `src/lib/**/*.integration.test.ts` — Vitest against real Postgres (`fantasy7_test`), run separately via `vitest.integration.config.mts`.
- `tests/e2e/*.spec.ts` — Playwright, against a running dev server. `global-setup.ts` seeds deterministic fixture accounts/players/scoring-baseline independent of the app's own seed script, so the suite is safe to rerun repeatedly without a DB reset.
