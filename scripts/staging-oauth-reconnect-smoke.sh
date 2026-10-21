#!/usr/bin/env bash
# Staging-Smoke: OAuth Reconnect-Flow (abgelaufene Tokens).
# Voraussetzung: App mit NEXO_E2E_CALENDAR_MOCK=1 + OAuth-Env (wie Playwright).
# Usage: ./scripts/staging-oauth-reconnect-smoke.sh [BASE_URL]
set -euo pipefail
BASE="${1:-http://127.0.0.1:3012}"

echo "→ OAuth-Reconnect-Smoke gegen $BASE"

curl -sf "$BASE/heute" >/dev/null
echo "✓ App erreichbar"

curl -sf -X POST "$BASE/api/e2e/calendar/oauth-stale" >/dev/null
echo "✓ Stale-OAuth-Fixture gesetzt"

CAL=$(curl -sf "$BASE/api/integrations/calendar")
echo "$CAL" | grep -q '"googleConnected":true'
echo "$CAL" | grep -q '"microsoftConnected":true'
echo "$CAL" | grep -q 'reconnect_required'
echo "$CAL" | grep -q 'refresh_failed'
echo "✓ oauthHealth: Google reconnect_required, Microsoft refresh_failed"

curl -sf -X PATCH "$BASE/api/settings" \
  -H "Content-Type: application/json" \
  -d '{"emailIntegrationEnabled":true,"calendarIntegrationEnabled":true}' >/dev/null

INBOX=$(curl -sf "$BASE/api/integrations/email/messages?limit=3")
echo "$INBOX" | grep -q '"connected":true'
echo "$INBOX" | grep -qi 'erneut verbinden'
echo "✓ Outlook-Posteingang: verbunden + Reconnect-Hinweis (Microsoft stale)"

curl -sf -X DELETE "$BASE/api/e2e/calendar/oauth-stale" >/dev/null
echo "✓ Fixture aufgeräumt"

echo ""
echo "OAuth-Reconnect-Staging-Smoke erfolgreich."
