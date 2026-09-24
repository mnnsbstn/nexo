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

**Export erneut:** bei `export_failed` in Einstellungen „Export erneut versuchen“ (wenn Google verbunden).

### 3. Agent-Tools

| Tool | Typ | Zweck |
|------|-----|--------|
| `get_calendar_integration_status` | read | Aktiv, OAuth konfiguriert, verbunden |
| `propose_action` + `external_calendar_draft` | write (Freigabe) | `scope: external` |

### Status Entwürfe

| status | Bedeutung |
|--------|-----------|
| `draft` | Nur lokal (Google nicht verbunden) |
| `exported` | In Google Kalender (`externalEventId`) |
| `export_failed` | Export versucht, Fehler in `exportError` |

### Nächste Ausbaustufe (Phase 4)

Siehe [ROADMAP.md](./ROADMAP.md): Kalender härten (ICS, Token), E2E Export, Microsoft OAuth, E-Mail-Skelett.
