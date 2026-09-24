# Nexo

A personal AI that connects your tasks, information, routines, and priorities in one place.

Persönlicher Assistent (MVP) mit Chat, Heute-Ansicht, Aufgaben, Gedächtnis und nachvollziehbaren Freigaben. Standard: Deutsch, Zeitzone `Europe/Berlin`.

## Voraussetzungen

- Node.js 20+
- npm

## Installation

```bash
npm install
cp .env.example .env   # falls noch nicht vorhanden
npx prisma db push
```

## Start (lokal)

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) — Startseite leitet auf **Heute** um.

Produktionsbuild:

```bash
npm run build
npm start
```

## Konfiguration

| Variable | Beschreibung |
|----------|--------------|
| `DATABASE_URL` | SQLite-Pfad, Standard `file:./dev.db` (unter `prisma/`) |
| `NEXO_DEMO_MODE` | `auto` (Standard), `true` oder `false` |
| `OPENAI_API_KEY` | Optional — aktiviert Live-Modus bei `auto`/`false` |
| `OPENAI_BASE_URL` | Optional, compatibles OpenAI-API-Endpoint |
| `OPENAI_MODEL` | Optional, Standard `gpt-4o-mini` |

**Ohne `OPENAI_API_KEY`:** Demo-Modus (Badge in der Navigation). Antworten sind regelbasiert und als **Demo-Antwort** gekennzeichnet. Aufgaben, Gedächtnis und Freigaben sind voll funktional und persistent.

Secrets nur serverseitig in `.env` — nicht committen.

## Tests

```bash
npm test          # Vitest: Datum, Freigaben, Duplikatschutz
npm run lint
npm run build
```

Manuell geprüft (API + Build): Chat → Aktionsvorschlag → Bestätigung → Aufgabe; doppelte Bestätigung idempotent; Erinnerung speichern/löschen; Demo-Status-Endpunkt.

Browser-UI auf Desktop/Mobil: nicht automatisiert in CI; lokal über `npm run dev` testen.

## MVP-Funktionen

- **Chat** — persistent, Demo oder Live-Modell, Aktionskarten mit Bestätigung
- **Heute** — fällig/überfällig/ohne Datum, Prioritätsvorschläge, manuelles Briefing
- **Aufgaben** — CRUD mit Speichern-/Löschbestätigung
- **Gedächtnis** — explizite Erinnerungen, Suche, Herkunft; getrennt vom Chat
- **Einstellungen** — Sprache/Zeitzone, Modus-Hinweis, optional Demo-Seed (`[Demo]`-Präfix)

## Grenzen (MVP)

- Kein Kalender/E-Mail/Messenger, keine Push-Benachrichtigungen
- Fälligkeiten sind In-App-Hinweise, keine Zustellung bei geschlossener App
- Einzelnutzer, keine Auth (nur lokaler Dev-Betrieb vorgesehen)
- Chat-Verlauf löschen: noch nicht implementiert (Erinnerungen bleiben davon unberührt)
- Live-Modell: OpenAI-kompatibles JSON-Format; bei Fehlern Fallback prüfen

Weitere Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md)
