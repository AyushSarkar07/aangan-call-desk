#!/usr/bin/env bash
# Copies the app's settings from .env.local to Vercel production. Never prints values.
set -euo pipefail
cd "$(dirname "$0")/.."
KEYS=(DATABASE_URL GEMINI_API_KEY GEMINI_MODEL VAANI_WEBHOOK_SECRET TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID TELEGRAM_ESCALATION_CHAT_ID
      TELEGRAM_FRONTDESK_CHAT_ID TELEGRAM_WEBHOOK_SECRET CAL_API_KEY CAL_EVENT_TYPE_ID CAL_ATTENDEE_EMAIL HUBSPOT_TOKEN
      ACCESS_CODE SESSION_SECRET APP_URL VAANI_INR_PER_MIN)
for k in "${KEYS[@]}"; do
  v="$(grep -E "^${k}=" .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true)"
  if [ -z "$v" ]; then echo "skip  $k (empty)"; continue; fi
  printf '%s' "$v" | vercel env add "$k" production --force --sensitive >/dev/null 2>&1 && echo "set   $k" || { echo "FAIL  $k"; exit 1; }
done
