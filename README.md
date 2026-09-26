# Charge Index™ · The Peak Plan™

A web app for **Soenen Strategies** (Jen Soenen, Time Strategist). Clients log their energy through their waking hours for five to seven days — the **Charge Index™** — and get their peak windows back. Jen reviews every client's pattern in a coach view and turns it into **The Peak Plan™**: a one-page schedule and a calendar file.

Live at **https://charge-index.vercel.app**.

## What's in it

**For clients** — sign up, set wake time, bedtime and session length, then one tap per hour on a five-level scale (100% Fully Charged → 10% Recharge Needed), with a daily reflection. At the end: their peak window, and the Peak Plan once purchased.

**For Jen** — a roster of every client; per-session analysis (charge curve, peak / collaboration / recovery windows, ideal day, consistency, comparison across a client's sessions); AI-drafted insights; private notes; CSV and ZIP exports.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, row-level security) · Vercel · Claude API (AI insights) · Vitest.

## Running it locally

```bash
npm install
npm run dev
```

Needs a `.env.local` with:

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/server client — row-level security applies |
| `SUPABASE_SERVICE_ROLE_KEY` | Only the scheduled reminder run and the verification scripts |
| `ANTHROPIC_API_KEY` | AI insight drafts (optional — the feature switches off without it) |
| `CRON_SECRET` | Authenticates the scheduled reminder run (optional) |

Credentials are never committed — this repository is public.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `./scripts/verify-local.sh` | Both access checks, against a local Supabase stack (needs Docker) |
| `node --env-file=<control-plane env> scripts/apply-migration.mjs <file>` | Apply a migration to the live database |

The two `verify-*` scripts create throwaway users and sign in as them — the only way to prove the access rules end to end. They refuse to run against the hosted project, because those accounts show up in the real client roster while a run is in progress; `verify-local.sh` starts a local Supabase stack with the same migrations and points both at it. Run it after any change to access rules, routes or migrations.

## Where things are

- `src/app` — routes: client flow (`/setup`, `/track`, `/plan`), coach area (`/coach`), auth, exports, the reminder endpoint
- `src/lib` — the analysis engine (`weekly-map.ts`, `coach-analysis.ts`), Peak Plan and export builders, reminders, AI insights, Supabase clients
- `supabase/migrations` — the schema and every access rule, in order
- `CLAUDE.md` — detailed build notes, decisions and verification history
- `HANDOFF.md` — the runbook for handing the project over to Jen

© Soenen Strategies. All rights reserved.
