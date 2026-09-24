#!/usr/bin/env bash
# API-Smoke für MANUAL_TEST §12–13 (lokal/Staging mit E2E-Mock + VAPID).
# Usage: ./scripts/staging-phase6-smoke.sh [BASE_URL]
set -euo pipefail
BASE="${1:-http://127.0.0.1:3011}"

echo "→ Staging-Smoke gegen $BASE"

curl -sf "$BASE/heute" >/dev/null
echo "✓ Heute lädt"

curl -sf -X PATCH "$BASE/api/settings" \
  -H "Content-Type: application/json" \
  -d '{"calendarIntegrationEnabled":true,"calendarSyncInsightsEnabled":true}' >/dev/null
echo "✓ Kalender + Sync-Einblicke aktiv"

curl -sf -X POST "$BASE/api/e2e/calendar/connection" \
  -H "Content-Type: application/json" \
  -d '{"provider":"google"}' >/dev/null
echo "✓ Mock-Kalender verbunden"

EVENTS=$(curl -sf "$BASE/api/integrations/calendar/events?limit=5")
echo "$EVENTS" | grep -q '"connected":true'
echo "$EVENTS" | grep -q 'syncInsights'
echo "✓ Externe Termine + syncInsights"

VAPID=$(curl -sf "$BASE/api/push/vapid-public-key")
echo "$VAPID" | grep -q '"configured":true'
echo "✓ VAPID konfiguriert"

curl -sf -X PATCH "$BASE/api/settings" \
  -H "Content-Type: application/json" \
  -d '{"notifyWebPushDueTasks":true}' >/dev/null
curl -sf -X POST "$BASE/api/push/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"https://fcm.googleapis.com/fcm/send/staging-smoke","keys":{"p256dh":"staging-p256dh-placeholder-0123456789","auth":"staging-auth-012345"}}' >/dev/null
TODAY=$(TZ=Europe/Berlin date +%Y-%m-%d)
curl -sf -X POST "$BASE/api/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Staging Smoke Push\",\"dueDate\":\"$TODAY\"}" >/dev/null
CHECK=$(curl -sf -X POST "$BASE/api/push/check-due")
echo "$CHECK" | grep -q '"sent":true'
echo "✓ Push check-due (Mock-Versand)"

CAL=$(curl -sf -X POST "$BASE/api/e2e/calendar/connection" \
  -H "Content-Type: application/json" \
  -d '{"provider":"caldav"}')
echo "$CAL" | grep -q caldav
STATUS=$(curl -sf "$BASE/api/integrations/calendar")
echo "$STATUS" | grep -q '"caldavConnected":true'
echo "✓ CalDAV-Fixture verbunden"

echo ""
echo "Staging-Smoke §12–13 (API) erfolgreich."
