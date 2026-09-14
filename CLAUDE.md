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
- **Vercel**: project `charge-index` under team `soenen-strategies`. Deployed via `vercel deploy --prod` using a token scoped to Jen's account, stored in `../.env.local`. GitHub → Vercel continuous deployment is **not** connected yet — Jen's Vercel account needs a GitHub login connection added via the dashboard (browser OAuth, can't be done via token) before push-to-deploy works. Until then, deploy manually with `vercel deploy --prod --token=$VERCEL_TOKEN`.
- **GitHub**: repo `DonSacchetti/charge-index` — stays under Josh's account through the build (cheap to transfer at handoff), everything else does not.
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

Phase 4 (daily check-in grid) is built and verified locally — see below. Phase 2 (payments) stays deferred until Jen creates the Stripe account.

Phase 4 (daily check-in grid), built 2026-09-14 to Jen's prototype and mockups 03–06:

- **`/track/[sessionId]`** — `page.tsx` loads the session, its entries and notes under RLS and hands them to `check-in.tsx`: five tiles per hour, keyword chips for the level just tapped, day tabs, streak dots, the three daily reflections, Back / Next day. The header rail uses the prototype's `day_count + 2` segments.
- **Writes go straight from the browser to Supabase**, relying on the RLS policies from Phase 1 — no API route in between. `src/hooks/useSaveQueue.ts` serialises writes per key and collapses anything queued to the newest value, so rapid taps on one hour can't land out of order. Failed writes stay visible with a Retry and are re-sent on the browser's `online` event. Reflections save on a 700ms debounce, and flush early on day change, blur, and tab hide.
- **Tapping the selected tile again clears the hour** and deletes the row. This is a deliberate addition — the prototype had no undo, so a mis-tap would have been recorded as real data rather than a skip.
- **The log reopens on the furthest day with anything logged** (`resumeDay()` in `src/lib/progress.ts`), or the next day if that one is full. Not derived from `start_date`, because that needs the client's timezone, which isn't stored anywhere yet.
- **"See my results"** calls the `completeSession` Server Action, which sets `status = 'completed'` and redirects to `/track/[sessionId]/complete`. It's an action rather than a side effect of visiting `/complete` because Next.js prefetches links — a mutating GET could complete a session nobody finished. The completion screen shows session facts only (session, days, hours logged, waking window). Jen's mockup also shows the client their peak window and two upsell cards; that's held back pending a product decision, since it conflicts with "the client never sees analysis."
- **`start_date` now comes from the browser's local date**, stamped at submit in `setup-form.tsx` and accepted within ±1.5 days of server time. Postgres `current_date` is UTC, so an evening setup in Toronto used to start on tomorrow's date.
- **`FieldLabel` requires `htmlFor`.** No form label in the app was linked to its field; TypeScript now enforces it.

## Supabase free tier pauses the project

Free-tier projects pause after about a week without activity. This one was found `INACTIVE` on 2026-09-14 after four idle weeks — the deployed site stayed up while signup and login silently failed. Symptoms: REST calls fail with `TypeError: fetch failed` while the Management API still answers. Check and restore through the Management API with `SUPABASE_ACCESS_TOKEN` from `../.env.local`: `GET https://api.supabase.com/v1/projects/<ref>` shows `status`, and `POST …/restore` brings it back in about three minutes with schema and data intact. The MCP connection in `../.mcp.json` didn't resolve its token in Remote Control sessions, so the Management API and `npx supabase` are the reliable paths.

## Verified how

**Phase 4:** `next build`, `eslint` and `tsc` clean. RLS for the grid's exact calls tested against the live database with two real users (15/15): a first tap inserts, a second on the same hour updates the same row, a non-tier value is rejected by the check constraint, clearing deletes the row; another client cannot insert, overwrite, delete, read, or write reflections in someone else's session, or mark it complete. The UI was then driven in a browser at `localhost:3000`, and Postgres checked after each step: three taps fired in the same tick on one hour stored the last one (10%); a tap-to-clear left no row; a reflection typed and abandoned by switching days before the debounce still saved; a full reload reopened on the furthest day with every tile and reflection restored; filling all 16 hours turned the day green with a ✓ and "1 day complete"; "See my results" set `completed` with 17 entries recorded. No server or console errors. Test data deleted; database back to zero rows.

**Phase 3:** Local `next build` and `eslint` clean. The RLS and trigger checks above ran against the live database with real auth users, created and deleted within the check. The UI flow was driven in a browser at `localhost:3000`: sign in → `/setup` → submit → `/track/[id]`, with the resulting row inspected in Postgres (`wake_time 07:00:00`, `sleep_time 01:00:00`, `day_count 7`, `reminder_pref hourly`) and the page rendering all 18 expected slots, 7 AM through 12 AM. All test users and rows were deleted afterwards; the database is back to zero profiles and zero sessions.
