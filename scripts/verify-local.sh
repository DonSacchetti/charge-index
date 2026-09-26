#!/usr/bin/env bash
#
# Run both live checks against a LOCAL Supabase stack, never Jen's project.
#
# The checks work by creating real accounts and signing in as them, which is
# the only way to prove the access rules hold end to end. Run against the
# hosted project, those accounts appear in the real client roster for the
# length of the run (Josh saw exactly that on 2026-09-26). So they run here
# instead: same migrations, same policies, a throwaway database.
#
#   ./scripts/verify-local.sh
#
# Needs Docker running. The first run downloads the Supabase images, which
# takes a few minutes; after that it's seconds. Leave the stack up between
# runs, or stop it with `npx supabase stop`.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT=3100

if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running — start Docker Desktop first." >&2
  exit 1
fi

npx --yes supabase@latest status >/dev/null 2>&1 || npx --yes supabase@latest start >/dev/null

# API_URL / ANON_KEY / SERVICE_ROLE_KEY for the local stack.
eval "$(npx --yes supabase@latest status -o env | sed 's/^/export /')"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

echo "Database: $NEXT_PUBLIC_SUPABASE_URL"

npx next dev --turbopack -p "$PORT" >/tmp/charge-index-verify-dev.log 2>&1 &
DEV_PID=$!
trap 'kill $DEV_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  sleep 1
  curl -sf -o /dev/null "http://localhost:$PORT" && break
done

FAILED=0
node scripts/verify-rls.mjs || FAILED=1
node scripts/verify-access.mjs "http://localhost:$PORT" || FAILED=1
exit $FAILED
