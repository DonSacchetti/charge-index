# Setting this up on a new machine

What a laptop needs before anyone can work on this app. Roughly 30–40 minutes,
most of it downloads — **start the downloads first and read the rest while they
run.**

## What you're installing, and why

| Tool | Why it's needed |
|---|---|
| **Node.js** (LTS) | Runs the app and every script. Nothing works without it. |
| **Git** | Gets the code, and sends changes back. |
| **Docker Desktop** | Runs a throwaway copy of the database on this machine, so testing never touches real client data. |
| **Claude Code** | How you change the app. |

## macOS

```bash
# Git usually arrives with Xcode's command line tools. This prompts if missing.
xcode-select --install

# Node — download the macOS LTS installer (pick Apple Silicon or Intel to match
# the machine; Apple menu → About This Mac tells you which):
#   https://nodejs.org

# Docker Desktop — again, match Apple Silicon or Intel:
#   https://www.docker.com/products/docker-desktop

# Claude Code:
#   https://code.claude.com/docs
```

## Windows

```powershell
# Git for Windows:
#   https://git-scm.com/download/win

# Node LTS (Windows installer):
#   https://nodejs.org

# Docker Desktop — needs WSL 2, which its installer sets up. This one may
# require a restart, so do it early:
#   https://www.docker.com/products/docker-desktop

# Claude Code:
#   https://code.claude.com/docs
```

## Then, in order

```bash
# 1. Check the tools are there. Node should be 20 or higher.
node --version
git --version
docker --version

# 2. Get the code.
git clone https://github.com/soenenstrategies-art/charge-index.git
cd charge-index

# 3. Install the app's dependencies. A few minutes the first time.
npm install

# 4. Put the two config files in place, then fill them in. Each file explains
#    where its values come from.
cp docs/env.local.template .env.local
cp docs/claude-settings.local.template.json .claude/settings.local.json

# 5. Prove it works, without touching the live database. Start Docker Desktop
#    first and wait for it to say it's running.
./scripts/verify-local.sh
```

That last command is the real test. It starts a local copy of the database,
applies every migration, serves the app against it and runs 153 access checks.
**The first run pulls the database images and takes several minutes** — it looks
like it's hung and it isn't. A clean run ends with `All checks passed`.

## Then try changing something

```bash
./scripts/dev-local.sh          # the app at http://localhost:3200
```

This runs against the local database with a test bot-check key, so you can sign
up, delete things and experiment freely. Emails land at
`http://localhost:54324` instead of being sent.

`npm run dev` exists too, but it reads `.env.local` and talks to the **real**
database. Use it to look at real data, never to test with.

## If something fails

- **`docker: command not found`, or scripts complain Docker isn't running** —
  open Docker Desktop and wait for it to finish starting.
- **`npm install` fails on permissions** — you're likely in the wrong folder, or
  Node installed for a different user. Check `node --version` works first.
- **`verify-local.sh` hangs on the first run** — it's pulling images. Give it
  five minutes before worrying.
- **Claude Code has no Supabase tools** — the access token in
  `.claude/settings.local.json` is missing or wrong. Everything else still works;
  only the direct database tools are affected.

Whatever the error, paste it into Claude Code and ask. That's what it's for.
