# Things to deal with after the handover

A running list. Nothing here is urgent and nothing here is broken — these are
items found during the handover that deserve attention once the ownership steps
in `HANDOFF.md` are finished. Add to it as things come up; tick them off as they
get done.

Product decisions (what a purchase includes, reminder wording, which plan to pay
for) are **not** here — those live in `HANDOFF.md` section 12.

---

## 1. Turn on leaked-password protection

**Where:** Supabase → Authentication → password security settings.

Supabase can check a new password against public lists of passwords exposed in
other companies' data breaches, and refuse it. It's free and it's a single
toggle. It's currently off.

Worth doing because the people signing up are coaching clients entering real
personal data, and the most common way an account gets broken into is a password
the person already used somewhere that was breached.

**Effort:** one click. **Risk:** none — it only affects passwords chosen from
that point on.

---

## 2. Close off two internal functions from the public API

**What:** `handle_new_user` and `handle_user_email_change` can be called through
the project's API by anyone, signed in or not.

These two run automatically behind the scenes when someone signs up or changes
their email. They were never meant to be callable from outside. Calling one
directly would almost certainly just fail, because it expects to be handed a
new user record that an outside caller can't supply — so this is tidiness, not
an open door. But there's no reason to leave them reachable.

**Fix:** a small migration revoking API access to both. Needs the usual
"tell me what it does and wait for me to agree" step, and a run of
`./scripts/verify-local.sh` afterwards.

**Effort:** small. **Risk:** low, but it is a database change, so it gets tested
on the local copy first.

---

## 3. The other 12 flagged functions — reviewed, nothing to do

Recorded so nobody re-raises it. The same security scan flagged 12 more
functions as callable by signed-in users: `join_team`, `can_start_session`,
`team_progress`, `is_coach`, `is_team_lead`, `is_team_member`, `has_peak_plan`,
`active_round`, `entry_hour_open`, `entry_window_open`, `entry_window_closed`,
`set_session_flag_review`.

**That is how the app is supposed to work.** These are the deliberate helpers
that enforce the access rules — including the team-lead privacy boundary, which
*has* to be a function like this because checking a team's progress means
reading rows the lead isn't allowed to see directly. Each one checks who's
calling before it answers.

**Action: none.** Don't "fix" these.

---

## 4. One function missing a setting (same scan)

`touch_daily_entry` doesn't pin its `search_path`. It's a hardening detail
recommended by Supabase's linter rather than a live problem. Sensible to fold
into the same migration as item 2 rather than doing it on its own.

**Effort:** one line. **Risk:** low.

---

## Where these came from

Items 1–4 are from Supabase's own security linter, run against the live project
on 2026-10-07 during the handover session. **Nothing was at error level, and
nothing was flagged for missing access rules** — the protection around client
data came back clean. Re-running that scan after any database change is a good
habit; ask Claude to check the security advisors.
