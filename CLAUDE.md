@AGENTS.md

# Charge Index™ — Soenen Strategies

Client project for Jen Soenen (Soenen Strategies, a time-management coaching business). Built by Josh as a paid engagement, on infrastructure registered to Jen from day one — see "Account ownership" below before touching any external service.

Full product spec, data model, algorithms, and phased build plan: `../Planning/Build Plan.md` (one level up, outside this repo — it's business planning material, not app source). Read that first for anything beyond "how do I run this app."

## Stack

Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4, deployed on Vercel, backed by Supabase (Postgres + Auth), Stripe for payments (not yet wired), Anthropic API for AI insights (not yet wired).

## Brand tokens

Defined in `src/app/globals.css` under `@theme inline`: `navy` `#132449`, `gold` `#c9a96e`, `cream` `#e8e6e0`, plus the five charge-level colors (`level-100` through `level-10`). Fonts: Playfair Display (`font-serif`) for headlines, Nunito (`font-sans`) for body — both wired via `next/font/google` in `src/app/layout.tsx`.

## Account ownership — read before touching Supabase, Vercel, or Stripe

This project runs entirely on accounts registered to Jen, not Josh. Do not use any Supabase/Vercel/Stripe connection that's authenticated as anyone other than Jen's own account for this project — see `../Planning/Build Plan.md` Section 1 for the full reasoning (short version: clean handoff to Jen later, no data/account migration required).

- **Supabase**: project `charge-index`, ref `nwjtxdacyydxerysdbyl`, org "Soenen Strategies", region `ca-central-1`. Access via `.env.local` (this repo, gitignored) for runtime, and a project-scoped MCP connection configured in `../.mcp.json` (one level up) for direct tool access — separate from any other Supabase connection this machine might have.
- **Vercel**: project `charge-index` under team `soenen-strategies`, on the **Hobby** plan. Deploy with `vercel deploy --prod --yes --token=$VERCEL_TOKEN` (token in `../.env.local`). **Deploys only work because the GitHub repo is public.** Hobby doesn't support collaboration on private repos — the commit author must be the Hobby team's owner (Jen), and Josh's commits aren't. The August deploys only succeeded because of a Vercel bug that has since been fixed. On 2026-09-14 deploys went `BLOCKED` ("the commit author doesn't have permission"), and the CLI hangs rather than erroring — poll `GET /v6/deployments?app=charge-index&teamId=…` for the state. Vercel's docs say collaboration is free for public repositories, so Josh made the repo public that day, and deploys went `READY`. **If the repo is ever made private again, deploys will block again** — the alternative is Vercel Pro with Josh as a Developer seat. Do not work around the block by stripping git metadata or authoring commits as Jen. Note Vercel's docs also describe Hobby as non-commercial use only. GitHub → Vercel continuous deployment is not connected.
- **GitHub**: repo `DonSacchetti/charge-index`, **public since 2026-09-14** (see Vercel above) — stays under Josh's account through the build (cheap to transfer at handoff), everything else does not. Because it's public: never commit credentials, `.env*` files or `.vercel/`, and remember everything in this file is readable by anyone. Full history was checked for secrets before it went public — none.
- **Stripe / Anthropic**: not set up yet — deferred to their respective build phases.

## Current status

Phase 0 (foundations) is live: `https://charge-index.vercel.app`.

Phase 1 (auth + data model + RLS) is live and now **fully verified against the real database**: `supabase/migrations/20260818150105_create_initial_schema.sql` — 7 tables, RLS enabled, 15 policies. The `handle_new_user` trigger, which Phase 1 left untested, was confirmed end-to-end on 2026-08-18: a new auth user gets a `profiles` row with `full_name` carried from `raw_user_meta_data` and `role = 'client'`. Also confirmed live, with test users since deleted: a client cannot insert a session under another `client_id` (42501), cannot read another client's session (0 rows), reads 0 rows from `session_analysis` even for their own session, and cannot write `ai_insights` (42501). The service role can read/write both coach-only tables, which is the path Phases 6-9 will use.

Phase 3 (session setup / onboarding) is built and verified locally:

- **Auth** — email/password signup, login, signout (`src/app/auth/actions.ts`), plus `/auth/confirm` for the emailed confirmation link. Email confirmation is ON for this project, so signup lands on a "check your inbox" state rather than straight into the app.
- **Session refresh and route gating** — `src/proxy.ts` (Next.js 16 renamed `middleware` to `proxy`) calling `src/lib/supabase/proxy.ts`. Signed-out requests to anything outside `/`, `/login`, `/signup`, `/auth` 307 to `/login?next=…`. Every page and Server Action re-checks `getUser()` itself; the proxy is the optimistic layer, not the boundary.
- **`/setup`** — the welcome screen from Jen's prototype: first name, wake/bedtime, session label, 5-7 days, reminder preference, plus the "before you start" panel. Creates the `tracking_sessions` row. Email is shown read-only from the account rather than typed, since real auth now owns it. Existing in-progress sessions are listed with a resume link so a second session is never created by accident.
- **`/track/[sessionId]`** — placeholder that renders the session's real generated slots. Phase 4 replaces it with the check-in grid.
- **`src/lib/charge.ts`** — the five levels, their keywords, and reminder copy, verbatim from the prototype. **`src/lib/slots.ts`** — slot generation, wake/bedtime option lists, hour formatting.
- **`src/lib/database.types.ts`** — generated from the live schema (`npx supabase gen types typescript --project-id <ref>`). Regenerate after any migration.

**Slot generation differs from the pseudocode in `../Planning/Build Plan.md` Section 3, on purpose.** The Build Plan's `buildSessionSlots()` treats the bedtime hour as inclusive and breaks for bedtimes past midnight. The prototype — which the Build Plan itself names as the reference implementation — excludes the bedtime hour and wraps past midnight. `src/lib/slots.ts` follows the prototype: wake 6am / bed 10pm gives 16 slots, wake 7am / bed 1am gives 18. Both verified live through the real UI.

Phases 4 (daily check-in grid), 5 (weekly map engine + client results) and 6 (coach view) are built, verified and **live in production** since 2026-09-14. Next: Phase 7 (ideal day, streaks, session comparison). Phase 2 (payments) stays deferred until Jen creates the Stripe account.

Phase 4 (daily check-in grid), built 2026-09-14 to Jen's prototype and mockups 03–06:

- **`/track/[sessionId]`** — `page.tsx` loads the session, its entries and notes under RLS and hands them to `check-in.tsx`: five tiles per hour, keyword chips for the level just tapped, day tabs, streak dots, the three daily reflections, Back / Next day. The header rail uses the prototype's `day_count + 2` segments.
- **Writes go straight from the browser to Supabase**, relying on the RLS policies from Phase 1 — no API route in between. `src/hooks/useSaveQueue.ts` serialises writes per key and collapses anything queued to the newest value, so rapid taps on one hour can't land out of order. Failed writes stay visible with a Retry and are re-sent on the browser's `online` event. Reflections save on a 700ms debounce, and flush early on day change, blur, and tab hide.
- **Tapping the selected tile again clears the hour** and deletes the row. This is a deliberate addition — the prototype had no undo, so a mis-tap would have been recorded as real data rather than a skip.
- **The log reopens on the furthest day with anything logged** (`resumeDay()` in `src/lib/progress.ts`), or the next day if that one is full. Not derived from `start_date`, because that needs the client's timezone, which isn't stored anywhere yet.
- **"See my results"** calls the `completeSession` Server Action, which sets `status = 'completed'` and redirects to `/track/[sessionId]/complete`. It's an action rather than a side effect of visiting `/complete` because Next.js prefetches links — a mutating GET could complete a session nobody finished. The completion screen shows session facts only (session, days, hours logged, waking window). Jen's mockup also shows the client their peak window and two upsell cards; that's held back pending a product decision, since it conflicts with "the client never sees analysis."
- **`start_date` now comes from the browser's local date**, stamped at submit in `setup-form.tsx` and accepted within ±1.5 days of server time. Postgres `current_date` is UTC, so an evening setup in Toronto used to start on tomorrow's date.
- **`FieldLabel` requires `htmlFor`.** No form label in the app was linked to its field; TypeScript now enforces it.

Phase 5 (weekly map engine + client results), built 2026-09-14:

- **`src/lib/weekly-map.ts`** — `computeWeeklyMap()` (per-hour average across answered days, 2dp, `null` for an hour nobody answered) and `findWindows()` (longest unbroken run per band: ≥90 peak, 62–90 collaboration, <38 recovery, on the averaged value). Runs are consecutive by slot *position*, not hour number — the prototype's number sort splits a run across midnight. `formatWindow()` gives "10 AM – 12 PM" or "—". Compute-on-read; no `session_analysis` cache yet, per the Build Plan.
- **Tests:** `npm test` runs Vitest (`vitest.config.mts`, `src/**/*.test.ts`). 16 cases in `weekly-map.test.ts`.
- **Client results screen** (`/track/[sessionId]/complete`), built to mockups 07–10 after Josh's 2026-09-14 decision: the client sees their **peak window**, and nothing deeper. It's computed from the client's own `daily_entries`, which RLS already allows — no policy changed; `session_analysis` and `ai_insights` stay coach-only. Plus the $49 and $249 plan cards: "Book the session" uses Jen's Calendly link from her prototype; "Unlock my plan" is disabled with "Coming soon" until Phase 2 checkout exists. "Edit my entries" returns to the log.
- **`/setup`** lists all of a client's sessions; completed ones link to their results.
- **`src/proxy.ts`** matcher skips all `/_next/*` internals.

Phase 6 (coach view), built 2026-09-14:

- **`/coach`** — every session: client, label, start date, waking hours, hours logged, status. A plain entry point; the full roster (grouping by client, coach notes, bulk export) is Phase 10. Hours are counted in the database with `daily_entries(count)` — fetching rows to count would hit the API's 1,000-row default.
- **`/coach/sessions/[sessionId]`** — the prototype's analysis layer: header, the three window cards (Fully Charged / Dynamic / Recovery, Jen's copy), the charge curve, and client reflections. Ideal day and the zone cards are Phase 7, AI insights Phase 9; the burnout gauge is out of scope.
- **`src/components/ChargeCurve.tsx`** — server-rendered SVG, no chart library. Zone shading at the five tiers (split halfway between them, matching `nearestTier()`); filled dot = answered every day; hollow ring with `n=` = answered on only some days; the line breaks at an hour nobody answered rather than drawing through it; window markers under the axis; legend, per-point tooltips, and a "View the numbers" table.
- **`src/lib/viewer.ts`** — `requireViewer()` / `requireCoach()`. Coach pages 404 for anyone without `role = 'coach'` or `'admin'`, including a client looking at their own session. RLS remains the boundary underneath.
- **`src/lib/session-data.ts`** — `loadSessionAnalysis()`, shared by the client results screen (which renders only `windows.peak`) and the coach view.
- **Role routing:** `/`, sign-in and email confirmation send coaches to `/coach` and clients to `/setup`.

**Making someone a coach.** Signup always creates a client — `handle_new_user` never reads a role from signup metadata, and clients can't change their own role (see Security). Jen should sign up at `/signup` with her own email and password (don't create her account for her), then promote her through the Management API's SQL endpoint with `SUPABASE_ACCESS_TOKEN`:

```sql
update public.profiles set role = 'coach'
where id = (select id from auth.users where email = '<jen''s email>');
```

## Security

**Privilege escalation, found and fixed 2026-09-14** (`supabase/migrations/20260914203306_restrict_profile_updates.sql`). Supabase grants `anon` and `authenticated` write access to every column, leaving RLS as the only gate, and Phase 1's `profiles_update_own` didn't restrict columns. So any signed-up client could `update profiles set role = 'coach'` on their own row — which opened every client's sessions, entries, notes and profiles, plus the coach-only tables — and could set their own `stripe_customer_id`. Proven live with test users before the fix (a test client promoted itself and read another client's "For Jen" note). No real accounts existed, so no data was exposed. Fix: column-level privileges — clients may update `profiles.full_name` and nothing else. Phase 1's verification had tested clients reading each other but never a client changing their own role.

**`scripts/verify-rls.mjs`** — live check of the whole access matrix with throwaway users: self-promotion, client isolation, coach-only and paid tables, and the coach role (27 checks). It creates and deletes real users on the live project. **Run it after any migration or policy change:** `node --env-file=.env.local scripts/verify-rls.mjs`.

**Applying migrations:** the MCP connection hasn't worked in recent sessions, so migrations were applied through the Management API's SQL endpoint, together with their `supabase_migrations.schema_migrations` row in the same transaction, keeping history consistent with the first migration.

Next.js was patched 16.3.1 → 16.3.5 on 2026-09-14 for two critical unauthenticated RCE advisories published after scaffolding (GHSA-2xp9-vwfh-vxw4 in the image optimizer's AVIF handling; GHSA-p293-qw3h-jr36 on Windows hosts), plus sharp and js-yaml advisories. Production wasn't exposed to the image one — no `remotePatterns`, so the optimizer rejects remote URLs (confirmed 400 live), no AVIF in `public/`, no `next/image` — and the Windows one doesn't apply on Vercel. Production has run 16.3.5 since the 2026-09-14 deploy (checked with `window.next.version` on the live site). Run `npm audit` at the start of each session; it was clean in August and not in September.

## Supabase free tier pauses the project

Free-tier projects pause after about a week without activity. This one was found `INACTIVE` on 2026-09-14 after four idle weeks — the deployed site stayed up while signup and login silently failed. Symptoms: REST calls fail with `TypeError: fetch failed` while the Management API still answers. Check and restore through the Management API with `SUPABASE_ACCESS_TOKEN` from `../.env.local`: `GET https://api.supabase.com/v1/projects/<ref>` shows `status`, and `POST …/restore` brings it back in about three minutes with schema and data intact. The MCP connection in `../.mcp.json` didn't resolve its token in Remote Control sessions, so the Management API and `npx supabase` are the reliable paths. For arbitrary SQL, `POST https://api.supabase.com/v1/projects/<ref>/database/query` with `{"query": "…"}`.

**Keep-alive:** `.github/workflows/supabase-keepalive.yml` queries the database through the REST API every three days (repo secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`). If the project is already paused the run fails and GitHub emails the repo owner — a ping can't un-pause it. Manual run: `gh workflow run supabase-keepalive.yml`. Remove it if the project moves to a paid Supabase plan.

## Verified how

**Phase 6:** `tsc`, `eslint`, `next build`, `npm audit` clean; 16/16 unit tests; `scripts/verify-rls.mjs` 27/27. Seeded a coach, a completed client built from Jen's prototype demo data and reflections (some hours skipped on some days, 9 PM skipped every day), and a sparse in-progress client with a 1 AM bedtime. Locally and then on production: the coach landed on `/coach` with both clients and correct hour counts; the completed session showed windows 9 AM – 12 PM / 3–5 PM / 6–9 PM (matching the Phase 5 Postgres parity check), 12 filled dots and 3 hollow `n=4` rings on exactly the partially skipped hours, a gap at 9 PM, and the reflections. The sparse session showed recovery 11 PM – 1 AM joined across midnight and "—" for the empty windows. Signed in as the client: landed on `/setup`, no coach link, all coach URLs 404 with no analysis or reflection text in the response, while their results screen still showed only the peak window. Test accounts deleted.

**Production, 2026-09-14:** deployment `charge-index-m4agk4brm` went `READY`; the live site reports Next.js 16.3.5 and serves the Phase 4 label fix. End-to-end on `charge-index.vercel.app` with a throwaway account: sign in, `/setup`, tap 9 AM 100%, 10 AM 100%, 11 AM 75%, finish from Day 5. The results screen showed "Peak window found 9 AM – 11 AM" and 3 hours; the live database held exactly those three entries and `status = completed`. Account deleted; database back to zero.

**Phase 5:** `tsc`, `eslint`, `next build`, `npm audit` clean; 16/16 unit tests. Parity against the live database: seeded a 5-day session from Jen's prototype demo generator with 8 entries deleted as skips (including one hour skipped every day), then compared the Build Plan's own SQL (`round(avg(energy_pct)::numeric, 2)` grouped by hour) with `computeWeeklyMap()` reading the same rows — 16/16 hours matched, including `null` for the fully skipped hour. Windows came out peak 9 AM – 12 PM, collaboration 3–5 PM, recovery 6–9 PM. In a browser as that client: `/setup` listed the session as Complete and linked to results; the results screen showed "Peak window found 9 AM – 12 PM" and 72 hours; "Book the session" opens Calendly in a new tab; "Unlock my plan" is disabled. Cut to two logged hours with no peak, it showed "—", as in mockup 09. Keep-alive workflow run by hand: success, HTTP 200. Test data deleted; database back to zero.

**Phase 4:** `next build`, `eslint` and `tsc` clean. RLS for the grid's exact calls tested against the live database with two real users (15/15): a first tap inserts, a second on the same hour updates the same row, a non-tier value is rejected by the check constraint, clearing deletes the row; another client cannot insert, overwrite, delete, read, or write reflections in someone else's session, or mark it complete. The UI was then driven in a browser at `localhost:3000`, and Postgres checked after each step: three taps fired in the same tick on one hour stored the last one (10%); a tap-to-clear left no row; a reflection typed and abandoned by switching days before the debounce still saved; a full reload reopened on the furthest day with every tile and reflection restored; filling all 16 hours turned the day green with a ✓ and "1 day complete"; "See my results" set `completed` with 17 entries recorded. No server or console errors. Test data deleted; database back to zero rows.

**Phase 3:** Local `next build` and `eslint` clean. The RLS and trigger checks above ran against the live database with real auth users, created and deleted within the check. The UI flow was driven in a browser at `localhost:3000`: sign in → `/setup` → submit → `/track/[id]`, with the resulting row inspected in Postgres (`wake_time 07:00:00`, `sleep_time 01:00:00`, `day_count 7`, `reminder_pref hourly`) and the page rendering all 18 expected slots, 7 AM through 12 AM. All test users and rows were deleted afterwards; the database is back to zero profiles and zero sessions.
