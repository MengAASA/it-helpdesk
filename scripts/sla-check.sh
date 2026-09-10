#!/usr/bin/env bash
# Triggers the PHN Helpdesk SLA breach check. Meant to be run on the VPS by cron,
# not on a dev machine — see the crontab line below.
#
# Reads CRON_SECRET straight from the env file on every run, so a rotated secret
# is picked up automatically without touching the crontab. Assumes cron runs on
# the same host as the app (hits localhost) — adjust SLA_CHECK_URL below if the
# app is fronted differently (a separate container, a non-default port, etc).
#
# Install with (adjust the path and interval to taste):
#   */30 * * * * /path/to/repo/scripts/sla-check.sh >> /var/log/phn-helpdesk-sla-check.log 2>&1

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env.local}"
SLA_CHECK_URL="${SLA_CHECK_URL:-http://localhost:3005/phn-helpdesk/api/cron/sla-check}"

if [ ! -f "$ENV_FILE" ]; then
  echo "sla-check: no env file at $ENV_FILE, skipping" >&2
  exit 0
fi

CRON_SECRET="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | head -n1 | cut -d '=' -f2- | tr -d '"'"'"'\r')"

if [ -z "$CRON_SECRET" ]; then
  echo "sla-check: CRON_SECRET not set in $ENV_FILE, skipping" >&2
  exit 0
fi

curl -fsS -X POST -H "X-Cron-Secret: $CRON_SECRET" --max-time 15 "$SLA_CHECK_URL"
echo
