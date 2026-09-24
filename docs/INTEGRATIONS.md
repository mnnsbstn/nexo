# Nexo — Integrationen

## Kalender (Google)

**Flow:** Opt-in → optional **Google OAuth** → Chat-Entwurf mit Freigabe → Export in Google Kalender (wenn verbunden).

### 1. Opt-in (Entwürfe)

1. **Einstellungen** → „Kalender-Entwürfe erlauben“
2. Im **Chat** (Demo): z. B. `Kalender Termin: Arzt morgen 10 Uhr`
3. **Aktionskarte** → Bestätigen
4. Entwurf in Nexo; mit Google verbunden → zusätzlich Event in Google Kalender
5. **Ohne Google:** in Einstellungen **Als .ics laden** (Import in Kalender-App deiner Wahl — kein Sync)

### 2. Google OAuth (optional, Server-Env)

In `.env` (nie committen):

| Variable | Zweck |
|----------|--------|
| `GOOGLE_CLIENT_ID` | OAuth Client (Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | Client Secret |
| `NEXO_PUBLIC_URL` | Öffentliche App-URL, z. B. `https://nexo.example.com` oder lokal `http://localhost:3000` |

**Redirect URI** in der Google Console:

`{NEXO_PUBLIC_URL}/api/integrations/calendar/callback`

Dann in **Einstellungen** → **Mit Google verbinden**.

Tokens liegen verschlüsselt in SQLite (`CalendarConnection`, AES-GCM via `NEXO_TOKEN_ENCRYPTION_KEY` oder abgeleitet). Bei gehostetem Betrieb: Auth (`NEXO_AUTH_PASSWORD`) empfohlen.

**Export erneut:** bei `export_failed` in Einstellungen „Export erneut versuchen“ (wenn ein Kalender verbunden ist).

### 2b. Microsoft / Outlook (optional, Server-Env)

| Variable | Zweck |
|----------|--------|
| `MICROSOFT_CLIENT_ID` | App-Registrierung (Entra ID) |
| `MICROSOFT_CLIENT_SECRET` | Client Secret |
| `MICROSOFT_TENANT_ID` | Optional, Standard `common` (Multi-Tenant) |
| `NEXO_PUBLIC_URL` | Wie bei Google |

**Redirect URI** in der App-Registrierung:

`{NEXO_PUBLIC_URL}/api/integrations/calendar/microsoft/callback`

**API-Berechtigung:** `Calendars.ReadWrite`, `User.Read` (delegiert).

In **Einstellungen** → **Mit Microsoft verbinden**. Pro Nexo-Instanz ist **ein** Provider aktiv (Google *oder* Microsoft).

Export erfolgt über **Microsoft Graph** (`POST /me/events`).

### 3. Extern lesen (read-only)

- API: `GET /api/integrations/calendar/events?limit=8&daysAhead=14`
- Nur wenn Kalender-Opt-in **und** Provider verbunden
- Kein Zwei-Wege-Sync — Vorschau der nächsten Termine

### 4. Agent-Tools

| Tool | Typ | Zweck |
|------|-----|--------|
| `get_calendar_integration_status` | read | Aktiv, OAuth konfiguriert, verbunden |
| `list_external_calendar_events` | read | Kommende Termine (Google/Outlook) |
| `list_calendar_drafts` | read | Nexo-Entwürfe |
| `propose_action` + `external_calendar_draft` | write (Freigabe) | `scope: external` |

### Status Entwürfe

| status | Bedeutung |
|--------|-----------|
| `draft` | Nur lokal (Google nicht verbunden) |
| `exported` | Im verbundenen Kalender (`externalEventId`, `exportProvider` google/microsoft) |
| `export_failed` | Export versucht, Fehler in `exportError` |

## E-Mail (Entwürfe + optional SMTP)

**Flow:** Opt-in → Chat-Freigabe speichert Entwurf → **manueller** Versand in Einstellungen (zweiter Schritt, mit Bestätigungsdialog).

### 1. Entwurf (wie Phase 4)

1. **Einstellungen** → „E-Mail-Entwürfe erlauben“
2. Im **Chat** (Demo): z. B. `E-Mail an team@beispiel.de Betreff: Update Nachricht: Kurzer Text`
3. **Aktionskarte** → Bestätigen → Status `saved`

### 2. SMTP-Versand (optional, Server-Env)

| Variable | Zweck |
|----------|--------|
| `SMTP_HOST` | Relay/Provider |
| `SMTP_FROM` | Absender-Adresse |
| `SMTP_PORT` | Optional, Standard `587` |
| `SMTP_USER` / `SMTP_PASS` | Optional, wenn Auth nötig |
| `SMTP_SECURE` | `true` für Port 465 |

In **Einstellungen** bei gespeichertem Entwurf → **E-Mail senden…** (Browser-Bestätigung). Kein Versand aus dem Chat heraus.

| status | Bedeutung |
|--------|-----------|
| `saved` | Bereit zum manuellen Senden |
| `sent` | SMTP-Versand ausgeführt |
| `send_failed` | Fehler in `sendError` |

| Tool | Typ | Zweck |
|------|-----|--------|
| `get_email_integration_status` | read | Opt-in, SMTP konfiguriert? |
| `list_email_drafts` | read | Gespeicherte Entwürfe |
| `propose_action` + `external_email_draft` | write (Freigabe) | `scope: external` |

### Nächste Ausbaustufe (Phase 4)

Siehe [ROADMAP.md](./ROADMAP.md): Microsoft Kalender, optional E-Mail-Versand-Provider.

**E2E (Playwright):** Mit `NEXO_E2E_CALENDAR_MOCK=1` (nur in `playwright.config.ts`) seedet `POST /api/e2e/calendar/connection` eine Fake-Verbindung; der Export liefert Mock-Event-IDs ohne Google-API.
