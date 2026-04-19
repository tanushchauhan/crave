#!/usr/bin/env bash
# Load repo .env and run Supabase CLI: link → db push → functions deploy → optional secrets.
# Requires: SUPABASE_ACCESS_TOKEN, and either SUPABASE_PROJECT_REF or SUPABASE_URL (https://<ref>.supabase.co).
# Docs: docs/supabase.md
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-$ROOT/.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  echo "Loaded: $ENV_FILE"
else
  echo "No $ENV_FILE — copy .env.example to .env and fill values." >&2
  exit 1
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN (Supabase dashboard → Account → Access Tokens)." >&2
  exit 1
fi
export SUPABASE_ACCESS_TOKEN

if [[ -z "${SUPABASE_PROJECT_REF:-}" && -n "${SUPABASE_URL:-}" ]]; then
  if [[ "$SUPABASE_URL" =~ https://([a-z0-9]+)\.supabase\.co ]]; then
    SUPABASE_PROJECT_REF="${BASH_REMATCH[1]}"
    export SUPABASE_PROJECT_REF
    echo "Derived SUPABASE_PROJECT_REF=$SUPABASE_PROJECT_REF from SUPABASE_URL"
  fi
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "Set SUPABASE_PROJECT_REF or a SUPABASE_URL like https://<ref>.supabase.co" >&2
  exit 1
fi

if command -v supabase &>/dev/null; then
  SUPABASE_BIN=(supabase)
else
  echo "Using: npx supabase@latest (install global CLI: https://supabase.com/docs/guides/cli)"
  SUPABASE_BIN=(npx --yes supabase@latest)
fi

echo "== supabase link =="
"${SUPABASE_BIN[@]}" link --project-ref "$SUPABASE_PROJECT_REF"

echo "== supabase db push =="
"${SUPABASE_BIN[@]}" db push --yes

echo "== supabase functions deploy =="
for fn_dir in "$ROOT"/supabase/functions/*/; do
  [[ -d "$fn_dir" ]] || continue
  name="$(basename "$fn_dir")"
  echo "-- deploy: $name"
  "${SUPABASE_BIN[@]}" functions deploy "$name"
done

# Optional: push Edge secrets from .env (hosted CLI rejects names starting with SUPABASE_).
SVC_KEY="${CRAVE_SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"
if [[ -n "${CRAVE_INTERNAL_SECRET:-}" || -n "$SVC_KEY" || -n "${CRAVE_AWS_API_BASE:-}" ]]; then
  echo "== supabase secrets set (from .env) =="
  ARGS=()
  [[ -n "${CRAVE_INTERNAL_SECRET:-}" ]] && ARGS+=(CRAVE_INTERNAL_SECRET="$CRAVE_INTERNAL_SECRET")
  [[ -n "$SVC_KEY" ]] && ARGS+=(CRAVE_SERVICE_ROLE_KEY="$SVC_KEY")
  # match-receipt-items stage 3: calls crave-bedrock-proxy POST /internal/embeddings/text (same secret header).
  [[ -n "${CRAVE_AWS_API_BASE:-}" ]] && ARGS+=(CRAVE_AWS_API_BASE="$CRAVE_AWS_API_BASE")
  if ((${#ARGS[@]})); then
    "${SUPABASE_BIN[@]}" secrets set "${ARGS[@]}"
  fi
else
  echo "Skipping secrets set (set CRAVE_INTERNAL_SECRET, CRAVE_AWS_API_BASE, and SUPABASE_SERVICE_ROLE_KEY or CRAVE_SERVICE_ROLE_KEY in .env)."
fi

echo "Done. Verify: ${SUPABASE_BIN[*]} functions list"
echo "Reminder: hosted Auth → URL configuration must allow your Expo / Next dev origins (see docs/client-env.md)."
