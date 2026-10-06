#!/usr/bin/env bash
#
# Dev server against the LOCAL Supabase stack, not Jen's project.
#
# `npm run dev` reads .env.local, which points at the real hosted database —
# fine for looking at real data, wrong for anything that signs up, deletes or
# experiments. This runs the same app against the throwaway local stack, with
# Cloudflare's documented ALWAYS-PASSES Turnstile test keys so the bot check on
# signup and login behaves exactly as it will in production.
#
#   ./scripts/dev-local.sh          # http://localhost:3200
#
# Needs Docker running. Sign-in emails are caught by the local inbox at
# http://localhost:54324 — nothing leaves the machine.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3200}"

if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running — start Docker Desktop first." >&2
  exit 1
fi

npx --yes supabase@latest status >/dev/null 2>&1 || npx --yes supabase@latest start >/dev/null

eval "$(npx --yes supabase@latest status -o env | sed 's/^/export /')"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

# Cloudflare's public test keys: the widget always passes, and the matching
# secret is in supabase/config.toml. Real keys live only in Vercel and in the
# hosted project's auth settings.
export NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"

echo "App:      http://localhost:$PORT"
echo "Database: $NEXT_PUBLIC_SUPABASE_URL"
echo "Inbox:    http://localhost:54324"
exec npx next dev --turbopack -p "$PORT"
