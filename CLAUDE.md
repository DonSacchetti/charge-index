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

Phase 0 (foundations) is live: branded placeholder deployed at `https://charge-index.vercel.app`. Phase 1 (auth + data model + RLS) is next — see the Build Plan for the full phase list and the data model this needs to implement.

