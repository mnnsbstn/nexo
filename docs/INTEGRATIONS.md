# Nexo — Integrationen

## Kalender (Google)

**Flow:** Opt-in → optional **Google OAuth** → Chat-Entwurf mit Freigabe → Export in Google Kalender (wenn verbunden).

### 1. Opt-in (Entwürfe)

1. **Einstellungen** → „Kalender-Entwürfe erlauben“
2. Im **Chat** (Demo): z. B. `Kalender Termin: Arzt morgen 10 Uhr`
3. **Aktionskarte** → Bestätigen
4. Entwurf in Nexo; mit Google verbunden → zusätzlich Event in Google Kalender

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

Tokens liegen in SQLite (`CalendarConnection`, Single-User). Bei gehostetem Betrieb: Auth (`NEXO_AUTH_PASSWORD`) empfohlen.

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

### Nächste Ausbaustufe

- Microsoft Outlook OAuth
- E-Mail-Kanal analog, freigabepflichtig
