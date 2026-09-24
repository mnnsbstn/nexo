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

In **Einstellungen** → **Mit Microsoft verbinden**. Mehrere Provider parallel möglich — **Export-Ziel** wählen.

Export erfolgt über **Microsoft Graph** (`POST /me/events`).

### 2c. iCloud Kalender + Mail (optional, ohne Server-OAuth)

Keine `.env`-Keys nötig. In **Einstellungen** → **Mit iCloud verbinden**:

| Eingabe | Zweck |
|---------|--------|
| Apple-ID (E-Mail) | CalDAV + SMTP/IMAP Benutzername |
| App-spezifisches Passwort | Von [appleid.apple.com](https://account.apple.com/account/manage) — **nicht** das normale Apple-Passwort |

Ein Klick verbindet **Kalender (CalDAV)** und **Mail (SMTP-Versand + IMAP read-only)**. Credentials liegen verschlüsselt in SQLite (`CalendarConnection` + `EmailConnection`).

- Kalender-Export: CalDAV `https://caldav.icloud.com`
- Mail-Versand: `smtp.mail.me.com:587` (manuell in Einstellungen, wie SMTP-.env)
- Posteingang-Vorschau: IMAP read-only in Einstellungen (kein Sync)

Mehrere Kalender können **parallel** verbunden sein; in Einstellungen wählst du das **Export-Ziel**. iCloud-Mail bleibt an `EmailConnection` gekoppelt.

### 2d. CalDAV (generisch)

In **Einstellungen** → **CalDAV verbinden**: Server-URL (z. B. Nextcloud `/remote.php/dav`), Benutzername, Passwort/App-Token. Export/Lesen wie iCloud, Provider `caldav`.

### 3. Extern lesen (read-only)

- API: `GET /api/integrations/calendar/events?limit=8&daysAhead=14`
- Nur wenn Kalender-Opt-in **und** Provider verbunden
- Kein Zwei-Wege-Sync — Vorschau der nächsten Termine
- **Sync-Einblicke** (Opt-in `calendarSyncInsightsEnabled`): bis 90 Tage, wiederkehrende Termine, Hinweise bei Überschneidungen mit Nexo-Entwürfen (`syncInsights` in API-Antwort)

### 3b. Web Push (fällige Aufgaben)

- Opt-in: Einstellungen → **Web Push (Heute)** + **Push auf diesem Gerät aktivieren**
- Server-Env: `NEXO_VAPID_PUBLIC_KEY`, `NEXO_VAPID_PRIVATE_KEY`, `NEXO_VAPID_SUBJECT` (siehe `.env.example`)
- Max. **ein** Push pro Tag bei fälligen/überfälligen Aufgaben — kein Marketing-Blast

### 4. Agent-Tools

| Tool | Typ | Zweck |
|------|-----|--------|
| `get_calendar_integration_status` | read | Aktiv, OAuth konfiguriert, verbunden |
| `list_external_calendar_events` | read | Kommende Termine (Google/Outlook/iCloud) |
| `list_external_inbox_messages` | read | iCloud Posteingang (read-only) |
| `list_calendar_drafts` | read | Nexo-Entwürfe |
| `propose_action` + `external_calendar_draft` | write (Freigabe) | `scope: external` |

### Status Entwürfe

| status | Bedeutung |
|--------|-----------|
| `draft` | Nur lokal (Google nicht verbunden) |
| `exported` | Im verbundenen Kalender (`externalEventId`, `exportProvider` google/microsoft/icloud) |
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

**Alternativ iCloud:** Wenn iCloud verbunden ist und kein SMTP in `.env` gesetzt ist, nutzt Nexo automatisch iCloud SMTP mit der gespeicherten Apple-ID.

API Posteingang: `GET /api/integrations/email/messages?limit=8`

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
