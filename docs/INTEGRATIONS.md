# Nexo — Integrationen (Start)

## Kalender (Beta-Skelett)

**Stand:** Entwürfe mit Freigabe, **kein** OAuth, **kein** Export zu Google/Outlook.

### Opt-in

1. **Einstellungen** → „Kalender-Entwürfe erlauben“
2. Im **Chat** (Demo): z. B. `Kalender Termin: Arzt morgen 10 Uhr`
3. **Aktionskarte** mit Badge „Kalender-Entwurf · nicht verbunden“ → Bestätigen
4. Entwurf erscheint unter **Einstellungen** (Liste) und in der DB (`ExternalCalendarDraft`)

### Agent-Tools

| Tool | Typ | Zweck |
|------|-----|--------|
| `get_calendar_integration_status` | read | Aktiv? Verbunden? Hinweistext |
| `propose_action` + `external_calendar_draft` | write (Freigabe) | `scope: external` |

Live-Agent: System-Prompt berücksichtigt `calendarIntegrationEnabled`.

### Nächste Ausbaustufe (nicht in diesem Schritt)

- OAuth (Google/Microsoft)
- Echter Export nach Bestätigung
- E-Mail-Kanal analog, ebenfalls freigabepflichtig
