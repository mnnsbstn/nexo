# Nexo — Architektur (MVP)

## Stack

- **Next.js 15** (App Router) — UI + Route Handlers
- **SQLite + Prisma** — persistente Daten
- **Zod** — Tool- und Aktionspayloads
- **OpenAI SDK** (optional) — austauschbarer Modell-Adapter

Wahl: ein Repository, wenig Moving Parts, serverseitige Agent-Logik ohne separates Backend.

## Schichten

| Schicht | Pfad | Rolle |
|---------|------|--------|
| UI | `src/app/*`, `src/components/*` | Deutsch, Navigation, Bestätigungskarten |
| API | `src/app/api/*` | HTTP, keine Secrets im Client |
| Agent | `src/server/agent/*` | Demo- oder Live-Orchestrierung |
| Tools (read) | `src/server/tools/read.ts` | Allowlist: list/get/search/context |
| Vorschläge | `src/server/actions/propose.ts` | `propose_action` → DB, Idempotenz-Key |
| Ausführung | `src/server/actions/execute.ts` | Nur nach Freigabe, Statusmaschine |
| Modell | `src/server/model/provider.ts` | Demo vs. Live |

Das Modell schreibt **nicht** direkt in die DB. Schreibpfad: Vorschlag → `awaiting_confirmation` → Bestätigung → `executing` → `succeeded`/`failed`.

## Agent-Tools (Allowlist)

Lesend (Demo-Agent direkt; Live-Agent über OpenAI Tool-Calls → `agent-tools.ts`):

- `list_tasks` / `get_task`
- `search_memories`
- `get_daily_context`
- `get_calendar_integration_status` / `list_calendar_drafts`
- `list_pending_proposals`
- `propose_action` (legt `ActionProposal` an, max. 4 Tool-Runden)

Live-Modus: begrenzte Chat-Historie, Retries bei transienten API-Fehlern, Demo-Fallback mit Kennzeichnung. Pro Live-Antwort werden genutzte Tool-Runden und History-Kontext in den Nachrichten-Metadaten angezeigt.

## Daten

- `Conversation`, `Message` — Chat
- `Task` — Aufgaben
- `Memory` — persönliches Gedächtnis (`isActive` statt Hard-Delete)
- `ActionProposal` — Freigaben & Aktivitäten
- `DailyBriefing` — manuell aktualisiertes Tagesbriefing
- `UserSettings` — Sprache, Zeitzone

## Sicherheit (MVP)

- API-Keys nur in `.env` auf dem Server
- Keine Speicherung von Secrets als Erinnerung (Heuristik + Ablehnung)
- Optional: `NEXO_AUTH_PASSWORD` schützt UI + alle `/api/*` (Middleware, httpOnly-Session)
- Ohne Passwort: offener lokaler Dev-Modus — nicht für öffentliches Hosting  
- Deploy: [HOSTING.md](./HOSTING.md)
- Erinnerungen: `UserSettings.notifyInAppDueTasks` / `notifyBrowserDueTasks` (Default aus); Browser nur nach expliziter Berechtigung
- Integrationen: [INTEGRATIONS.md](./INTEGRATIONS.md) — `external_calendar_draft`, `ExternalCalendarDraft`, Opt-in `calendarIntegrationEnabled`

## Demo-Modus

Regelbasierte Intents in `demo-agent.ts`. Unterstützte Beispielphrasen sind in der Antwort aufgelistet. Demo-Seed über Einstellungen, klar mit `[Demo]` markiert.
