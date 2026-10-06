# Your first Claude Code session

Open this project folder in Claude Code and paste the prompt below as your very
first message. It tells Claude what this project is, what it must never do, and
asks it to check the state of things before touching anything.

You only need this once. After that, Claude reads `CLAUDE.md` automatically
every time you open the folder, so it always starts with the full picture.

---

## Paste this

```
This is Charge Index™ / The Peak Plan™, my own product. I'm Jen Soenen of
Soenen Strategies — I'm the owner, not a developer, so explain things in plain
language and tell me what you're about to do before you do it.

Read CLAUDE.md in this folder first: it's the full working record of how the app
is built and why. Then read HANDOFF.md, which is the runbook for everything
that was still being handed over to me.

Ground rules for this project, which matter more than speed:

1. Every account is mine — Supabase, Vercel, GitHub, Cloudflare, Stripe. Never
   use anyone else's login or API key, including a personal one you find on this
   machine.
2. The GitHub repository is public. Never commit a key, a token, a .env file,
   or .claude/settings.local.json. If you think a secret may have been
   committed, stop and tell me immediately.
3. This app holds real clients' personal data. Never run a test that creates or
   deletes accounts against the live database. Use ./scripts/dev-local.sh and
   ./scripts/verify-local.sh, which run against a throwaway copy on this
   machine. Both refuse to touch the live project unless deliberately
   overridden — don't override them.
4. Before you change the database, tell me what the change is in one sentence
   and wait for me to agree. Migrations are hard to undo.
5. When something is done, say plainly whether you actually verified it or not.

To start: tell me the current state of the app — what's live, what's switched
off, and what still needs a decision from me. Don't change anything yet.
```

---

## Two things worth knowing about Claude Code

**It can read your database and your deployments.** The `.mcp.json` file in this
folder connects it to your Supabase project, but only once your access token is
in `.claude/settings.local.json` (see `docs/claude-settings.local.template.json`).
Without that token the connection simply doesn't appear — nothing breaks.

**It asks before running commands.** If you're ever unsure about something it
wants to do, say no and ask it to explain first. "Explain what that does and
what happens if it goes wrong" is a reasonable thing to ask every time.
