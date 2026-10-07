# Handing Charge Index™ over to Jen

This is the runbook for the day the app becomes fully yours. It's written to be followed in order — the order matters, because a few steps lock you out if done backwards.

Anything marked **(together)** is a step to do with Josh at your side. Everything else you can do alone, now or later.

Nothing in this file is secret, and it never should be: **this repository is public.**

---

## Where things stand

You already have an **admin account** (`soenenstrategies@gmail.com`), created on 2026-09-17. That means:

- You see every client at `/coach` — their sessions, daily logs, analysis, notes and exports.
- You see every **Peak Plan** without paying for it. Admin and coach accounts skip the purchase check entirely, which is why your account shows no purchases and still opens the full plan.
- You see the **Companies** side, which is the corporate product and is kept separate from your individual clients.

Nothing below needs to be done to keep the app running. It's all about moving the last pieces of control from Josh to you.

---

## 1. Reset the password on every account **(together)**

Josh created these under your email so they were yours from day one, but he knows the passwords. Change them all first, before anything else — every later step depends on you holding these.

| Account | What it is |
|---|---|
| **Supabase** | The database and all sign-ins. Project `charge-index`. |
| **Vercel** | Where the app runs. Team `soenen-strategies`. |
| **Cloudflare** | Only the bot check on signup and login (step 3). |
| **GitHub** | Where the code lives (step 5). |

Stripe and the email provider are different — you create those yourself, later (steps 7 and 8).

## 2. Put the app on your own address **(together)**

Right now the app lives at `charge-index.vercel.app`. To serve it from your own domain:

1. **Vercel** → the project → Domains → add the address you want (e.g. `app.soenenstrategies.com`).
2. Vercel shows you a DNS record. Create it at whoever you bought the domain from.
3. **Supabase** → Authentication → URL Configuration → set **Site URL** to the new address and add it to the **Redirect URLs** list.

Step 3 is the one people forget. Skip it and sign-up confirmation emails keep pointing at the old address, so new clients click a link that doesn't sign them in.

**Your website and the app are two different things.** Three separate pieces get
called "the domain", and keeping them apart makes everything else make sense:

- **The domain name** — `soenenstrategies.com`. You own it, registered through Wix.
- **DNS** — the directory saying which address points where. Also at Wix, because
  that's where your nameservers point.
- **Hosting** — what actually runs. Two different ones: `www` is your Wix website,
  `app` is this application on Vercel.

Adding `app.soenenstrategies.com` is one CNAME record in Wix's DNS panel. It's a
signpost, not a move — nothing is copied to Wix, and your website at `www` is
completely untouched.

**⚠️ If you ever move your website to Squarespace (or anywhere else):** moving a
site usually means moving the nameservers, and **the `app` record will not come
with them**. The app's custom address would quietly stop working — the app itself
keeps running, but `app.soenenstrategies.com` stops resolving. Recreate the same
CNAME at the new DNS host and it comes straight back. Worth telling whoever does
the migration, before they do it.

 Neither Wix nor Squarespace can host this app — website builders serve finished pages, and this one runs code: it signs people in and keeps them signed in, reads and writes a database with per-person access rules, generates calendar files and exports on demand, and runs a scheduled job. The arrangement that works: your site stays exactly where it is and links out to the app on your own subdomain. Visitors see one brand; underneath, the marketing site and the app stay separate, which is also what lets you redesign one without breaking the other.

## 3. Switch on the bot check **(together)**

The app has Cloudflare Turnstile built in — the "confirm you're human" box — but it's dormant until two keys exist. It stops bots creating junk accounts, which otherwise fill your client list and burn through your sign-up email allowance.

1. **Cloudflare** → Turnstile → add a widget for your domain. It gives you a **site key** and a **secret key**.
2. The **site key** goes in **Vercel** → the project → Settings → Environment Variables, named `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
3. The **secret key** goes in **Supabase** → Authentication → Attack Protection → enable CAPTCHA, provider **Turnstile**, and paste it there.
4. Redeploy in Vercel, then load the signup page and check the box appears.

**Set both or neither.** A secret in Supabase with no site key in Vercel locks everyone out of signup *and* login, including you. A site key with no secret shows the box but nothing checks it.

The box appears on **login as well as signup**, on purpose: once Supabase has a CAPTCHA enabled it requires one on every sign-in, so it has to be on both.

## 4. Replace every key created during the build **(together)**

Keys made while Josh held your accounts should all be replaced. For each one: create the new key, update it where it's used, redeploy, confirm the site still works, *then* delete the old one. In that order — deleting first takes the site down.

| Key | Create it at | Used by |
|---|---|---|
| Supabase publishable (anon) key | Supabase → Project Settings → API | Vercel env `NEXT_PUBLIC_SUPABASE_ANON_KEY`, GitHub secret `SUPABASE_ANON_KEY` |
| Supabase service role (secret) key | Supabase → Project Settings → API | Vercel env `SUPABASE_SERVICE_ROLE_KEY` |
| Supabase access token | Supabase → Account → Access Tokens | Josh's tooling — **revoke his, create your own** |
| Vercel token | Vercel → Account Settings → Tokens | Josh's tooling — **revoke his** |
| Cron secret | Any long random string | Vercel env `CRON_SECRET` and GitHub secret `CRON_SECRET` |

The service role key deserves a note: it bypasses every access rule in the database. It belongs in Vercel and on your own machine, and nowhere else — not in an email, not in a chat, not in this repository.

## 5. Take ownership of the code **(together)**

**This step is done.** Recorded here so you know what was done and how it was checked.

1. ~~Transfer the GitHub repository to your own GitHub account.~~ **Done.** It now lives at `soenenstrategies-art/charge-index`, under your account, with the whole build history.
2. ~~Check the repository's **Actions secrets** survived the move.~~ **Done for the two that are in use** — the keep-alive job ran on schedule under your ownership on 2026-10-04 and succeeded, which only works if `SUPABASE_URL` and `SUPABASE_ANON_KEY` are both there. `CRON_SECRET` still has to be added when reminders are switched on (step 8).
3. ~~In **Vercel**, connect the project to the repository using **your** GitHub login.~~ **Done 2026-10-07.** Pushing to `main` now deploys on its own.

**What that means day to day:** you ask Claude for a change, it pushes to `main`, and Vercel deploys it. There is no token to keep and no deploy command to run. If a deploy ever needs checking, the Vercel dashboard is the place — Claude Code in a cloud session cannot reach Vercel or Supabase over the network, so it can confirm the push but not the deploy.

**About the repository being public.** Vercel's free Hobby plan only deploys commits authored by the account owner — unless the repository is public. That's why it was made public during the build. Once you own it and are the only one committing, you can make it private again. If someone else will keep working on it, it either stays public or you move to Vercel Pro. Vercel's own terms also describe Hobby as non-commercial use, which is worth settling before you charge real money.

## 6. Set up your own Claude Code **(together)**

This is what lets you keep changing the app without a developer.

Full step-by-step for a fresh laptop, including what to install and in what
order, is in **`docs/new-machine-setup.md`**. In short:

1. Install Node, Git, Docker Desktop, and Claude Code — signed in as you.
2. `git clone` the repository, then `npm install`.
3. Copy the two template files into place:
   ```bash
   cp docs/env.local.template .env.local
   cp docs/claude-settings.local.template.json .claude/settings.local.json
   ```
   Then fill in the values each file describes. Both are gitignored and must never be committed.
4. Run `./scripts/verify-local.sh` once. 153 checks against a throwaway copy of the database — if it ends with "All checks passed", the machine is set up correctly.
5. Paste the starting prompt from **`docs/first-session-prompt.md`** as your first message.

Claude reads `CLAUDE.md` automatically every time you open this folder, so every session starts knowing how the app is built and why. `docs/first-session-prompt.md` is only needed once.

## 7. Take payments **(together)**

1. Create your **Stripe** account and start in **Test Mode** — no business verification needed to build against it.
2. **(together)** Build the checkout against Test Mode (Build Plan Phase 2).
3. Complete Stripe's business and banking verification to reach **Live Mode**.
4. **(together)** Add the live keys and webhook signing secret to Vercel, then do one supervised real purchase.

Until this is done, "Unlock my plan" stays locked and no client can buy a Peak Plan. Corporate seats are already independent of Stripe — you open those by hand (step 9), which is how a company can pay you by invoice today.

## 8. Switch on reminders (optional, later)

Reminders are built and deployed but dormant. They need an email provider account (Resend or Postmark), the sender wired in, and the steps at the top of `.github/workflows/reminders.yml`.

The same provider fixes a second thing. Supabase's built-in email sender manages only 2–3 messages an hour and its wording can't be changed on the free plan, which is why a new client currently has to open their confirmation link **in the same browser they signed up in**. Once a provider exists: point Supabase's SMTP settings at it, then **(together)** change the confirmation email's link to `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` so it works on any device.

## 9. How the corporate side works

This is the part that didn't exist when the first handover notes were written. It lives under **Companies** in your coach navigation, deliberately separate from your individual clients.

**The shape:** a **company** has one or more **teams**. A team has a **lead** and its members. A team runs **rounds** — one stretch of tracking each. A round produces one **team Peak Plan**.

**Setting one up:**

1. Add the company, then add a team inside it.
2. The team gets two links. Send the **lead link** first — it's single use, and whoever opens it becomes the team lead.
3. **Seats stay at zero until you set them.** That's the payment gate: the member link refuses everyone while seats are 0. Once the company has paid you, set the number of seats and the lead distributes the member link themselves. The lead counts as a seat.
4. Start a round when the team is ready to track.
5. When the round has enough data, you press **Release to the lead**. Nothing is automatic — the plan reaches the lead only when you decide it does.

**The privacy line, which is the whole point of the design:**

- A **team lead** sees each member's *progress* — how many hours they've logged, and whether they've been flagged — and the released team plan. The lead **never** sees any individual's energy levels, their curve, their notes, or their own Peak Plan.
- A **member** sees only their own data, exactly like any individual client.
- **You** see everything.

A member is **flagged** to the lead when they log the same level for five hours straight on two days — the signal that something's wrong, and deliberately the only judgement the lead ever sees.

The released plan is **stored** at the moment you release it, not recalculated on the fly. So a plan a company has been given can't quietly shift underneath them if someone logs more hours afterwards. "Rebuild from the latest data" replaces it on purpose; "Take it back" removes the lead's access immediately.

## 10. Clear out the build's test data **(together, last)**

These exist only because of the build and shouldn't be in your records. Josh's account goes **last**, because several steps above need an admin who isn't you in case something goes wrong.

| What | Why it's there |
|---|---|
| `qa-...@example.com` (Quinn Tester) | A QA account, with **two Peak Plan purchases that were never paid for** |
| `demo-lead@`, `demo-member1@`, `demo-member2@example.com` | The seeded corporate team Josh used to walk you through the flow |
| Company **"Test Company 1"** and its teams | The same walkthrough |
| `sacchettijosh@gmail.com` (Joshua Sacchetti) | Josh's build account — admin access, 2 sessions and **1 unpaid Peak Plan purchase** |

If you ever see a client you don't recognise — anything named "ZZ TEST", or an `@example.com` address — tell your developer. It shouldn't happen: the verification scripts refuse to run against your live database (see below), which is exactly why that rule exists.

## 11. Check everything still works **(together)**

1. Sign up as a brand-new test client, set up a session, log a few hours.
2. As admin, open that client from `/coach` and look at their session.
3. Open a Peak Plan, and download the calendar file and a CSV.
4. Open **Companies** and confirm a team's progress view shows hours only, never levels.
5. **(together)** Run both automated checks:
   ```bash
   ./scripts/verify-local.sh
   ```
   That's 153 checks covering who can open which screen and read which data. It runs against a throwaway copy of the database on the developer's machine, **never your live project** — so no test accounts ever appear in your client list.
6. Delete the test client from step 1.

## 12. Decisions still waiting for you

These are in the build notes rather than here, because they're product questions, not handover steps: what a Peak Plan purchase includes, the reminder times and wording, and whether to move off the free Vercel and Supabase plans before you start charging.

One is worth flagging now: **Supabase's free plan pauses a database after about a week of no activity**, which silently breaks sign-ins while the site still appears to load. A small scheduled job (`.github/workflows/supabase-keepalive.yml`) keeps it awake. Leave it in place unless you upgrade.
