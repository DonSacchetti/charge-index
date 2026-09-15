# Handing Charge Index™ over to Jen

This is the runbook for the day the app becomes fully yours. It's written to be followed in order. Anything marked **(developer)** is a step Josh — or your own Claude Code session — does with you.

Nothing in this file is secret, and it never should be: this repository is public.

---

## 1. Take control of your accounts

Josh created these under your email address so everything was yours from day one. Reset the password on each one first, before anything else:

- **Supabase** — the database and sign-ins (project `charge-index`)
- **Vercel** — where the app runs (team `soenen-strategies`)
- **Anthropic Console** — only if it has been created by then (powers AI insight drafts)
- **Email provider** (Resend or Postmark) — only if it has been created by then (powers reminders)

Stripe is different: you create that account yourself (step 7).

## 2. Make yourself the coach

Signing up only ever creates a client account — nobody can make themselves a coach from the website.

1. Go to **https://charge-index.vercel.app/signup** and create your account with your own email and password.
2. **(developer)** Promote it to coach with one statement in Supabase's SQL editor:
   ```sql
   update public.profiles set role = 'coach'
   where id = (select id from auth.users where email = 'YOUR EMAIL HERE');
   ```
3. Sign in again. You'll land on your client roster at `/coach`.

## 3. Set up your own Claude Code

The project's full working notes live in `CLAUDE.md`, which Claude Code reads automatically when you open this folder — a fresh session picks up where the build left off.

1. Install Claude Code and sign in with your own Anthropic account: **https://code.claude.com/docs**
2. Open this project folder in it.
3. Connect Supabase and Vercel using **your own logins**, following the connector instructions in those docs.

## 4. Replace every key created during the build **(developer)**

Keys created while Josh held your accounts should all be replaced. For each: create a new one, update it where it's used, then delete the old one.

| Key | Where it's created | Where it's used |
|---|---|---|
| Supabase anon (publishable) key | Supabase → Project Settings → API | Vercel env `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Supabase service role (secret) key | Supabase → Project Settings → API | Vercel env `SUPABASE_SERVICE_ROLE_KEY` (if reminders are on) |
| Supabase personal access token | Supabase → Account → Access Tokens | Build tooling only — revoke it |
| Vercel token | Vercel → Account → Tokens | Build tooling only — revoke it |
| Anthropic API key | Anthropic Console → API Keys | Vercel env `ANTHROPIC_API_KEY` |
| Cron secret | Any long random string | Vercel env `CRON_SECRET` and GitHub secret `CRON_SECRET` |
| Email provider key | Your email provider | Vercel env (when reminders are wired up) |

Then **redeploy** in Vercel so the app picks up the new values, and confirm the site still signs in.

## 5. Move billing to your card

- **Anthropic:** add your card and remove Josh's.
- **Vercel:** nothing to move while on the free Hobby plan (see step 9).
- **Supabase:** nothing to move on the free plan.

## 6. Take ownership of the code

1. **(developer)** Transfer the GitHub repository `DonSacchetti/charge-index` to a GitHub account you control.
2. Check the repository's Actions secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and later `CRON_SECRET`, `APP_URL`) are still present; re-add any that aren't.
3. In Vercel, connect the project to the repository with **your** GitHub login, so every change pushed to it deploys automatically.

**About the repository being public.** Vercel's free plan only deploys code whose author is the account owner, unless the repository is public — which is why it was made public during the build. Once you own the repository and are the only person committing to it, you can make it private again. If someone else will keep working on it, it either stays public or you move to Vercel Pro.

## 7. Take payments **(with developer)**

1. Create your Stripe account and start in **Test Mode** — no verification needed.
2. **(developer)** Build the checkout (Build Plan Phase 2) against Test Mode.
3. Complete Stripe's business and banking verification for **Live Mode**.
4. **(developer)** Add the live keys and webhook signing secret to Vercel, then run one supervised real purchase together.

Until this is done the "Unlock my plan" button stays locked, and no client can reach a Peak Plan.

## 8. Use your own address (optional)

To serve the app from `app.soenenstrategies.com`:

1. Vercel → the project → Domains → add `app.soenenstrategies.com`, and create the DNS record Vercel shows you at your domain registrar.
2. **(developer)** Supabase → Authentication → URL Configuration: set the site URL to the new address and add it to the redirect list — otherwise sign-up confirmation emails point at the old one.
3. **(developer)** Update `APP_URL` in Vercel (and the GitHub secret) if reminders are on.

## 9. Things to know

**What's switched off, and what switches it on**

| Feature | Needs |
|---|---|
| AI insight drafts | An Anthropic API key in Vercel (`ANTHROPIC_API_KEY`), then redeploy |
| Reminders | An email provider account, the sender wired in, and the steps at the top of `.github/workflows/reminders.yml` |
| Peak Plan purchases | Stripe (step 7) |

**Sign-up emails.** Supabase's built-in email sender manages only 2–3 messages an hour, which limits how many people can sign up per hour, and on the free plan its email wording can't be changed. For now, a new client has to open the confirmation link **in the same browser they signed up in**. Once an email provider exists: point Supabase Authentication's SMTP settings at it, then **(developer)** change the confirmation email's link to `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` so it works on any device.

**The free plans.** Vercel's own documentation describes its Hobby plan as for non-commercial, personal use. It's worth deciding before launch whether to move to Pro. Supabase's free plan pauses a database after about a week without activity — a small scheduled job (`.github/workflows/supabase-keepalive.yml`) prevents that; remove it if you upgrade.

**Decisions still waiting for you** are listed in the build notes: whether peak windows should need a minimum amount of data, which thresholds the ideal day and the windows should share, what a Peak Plan purchase covers, and reminder times and wording.

## 10. Check everything works

1. Sign up as a test client, set up a session, and log a few hours.
2. As coach, open that client from `/coach` and look at their session.
3. **(developer)** Run both live checks — they create and remove their own test accounts:
   ```bash
   node --env-file=.env.local scripts/verify-rls.mjs
   node --env-file=.env.local scripts/verify-access.mjs https://charge-index.vercel.app
   ```
4. Delete the test client.
