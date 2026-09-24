# Nexo — Hosting-Runbook

Leitfaden für ein **Single-User-Deployment** (VPS, PaaS oder Node-Hosting). Nexo ist kein Multi-Tenant-Produkt — ein Passwort, eine SQLite-Datei, ein Prozess.

## Checkliste vor Go-Live

| Punkt | Empfehlung |
|-------|------------|
| **HTTPS** | Pflicht (Reverse Proxy oder Plattform-TLS) |
| **Auth** | `NEXO_AUTH_PASSWORD` setzen — ohne Passwort sind UI und alle `/api/*` offen |
| **Session** | `NEXO_SESSION_SECRET` (≥ 16 Zeichen, zufällig) — nicht vom Passwort ableiten lassen |
| **Datenbank** | Persistenter Pfad für SQLite (Volume), nicht nur Container-FS ohne Volume |
| **Backup** | Regelmäßig `scripts/backup-db.sh` (Cron) |
| **Secrets** | Nur serverseitige Env — nie in Git, nie im Browser |
| **Modus** | Bewusst `NEXO_DEMO_MODE` + `OPENAI_API_KEY` wählen (siehe unten) |

## Umgebungsvariablen (Produktion)

| Variable | Pflicht (hosted) | Hinweis |
|----------|------------------|---------|
| `DATABASE_URL` | Ja | z. B. `file:/data/nexo/prod.db` oder `file:./prod.db` (relativ zu `prisma/`) |
| `NEXO_AUTH_PASSWORD` | Ja (öffentlich) | Single-User-Passwort |
| `NEXO_SESSION_SECRET` | Stark empfohlen | Cookie-HMAC; ohne Secret wird aus Passwort abgeleitet |
| `NEXO_DEMO_MODE` | Nein | `auto` (Standard), `true`/`false` erzwingen Demo bzw. Live-Versuch |
| `OPENAI_API_KEY` | Für Live | OpenAI-kompatibler Anbieter |
| `OPENAI_BASE_URL` | Nein | Default OpenAI |
| `OPENAI_MODEL` | Nein | Default `gpt-4o-mini` |
| `NODE_ENV` | Ja | `production` beim Start |

Beispiel (nur Struktur — Werte ersetzen):

```bash
DATABASE_URL="file:/var/lib/nexo/prod.db"
NEXO_AUTH_PASSWORD="…"
NEXO_SESSION_SECRET="…lange-zufällige-zeichenkette…"
NEXO_DEMO_MODE=auto
OPENAI_API_KEY="sk-…"
NODE_ENV=production
```

Plattformen ohne `.env`-Datei: dieselben Keys im Hosting-Panel setzen (API bei Hostinger o. Ä. oft nicht für alle Node-Env — dann hPanel nutzen).

## Demo vs. Live

Logik in `getModelMode()` (`src/server/model/provider.ts`):

| `NEXO_DEMO_MODE` | `OPENAI_API_KEY` | Ergebnis |
|------------------|------------------|----------|
| `true` | egal | **Demo** (regelbasiert, Badge „Demo“) |
| `false` | gesetzt | **Live** |
| `false` | fehlt | **Demo** (Fallback) |
| `auto` / leer | gesetzt | **Live** |
| `auto` / leer | fehlt | **Demo** |

**Empfehlung öffentlich ohne KI-Kosten:** `NEXO_DEMO_MODE=true` und kein API-Key — Aufgaben/Gedächtnis/Freigaben bleiben voll nutzbar.

**Empfehlung mit Modell:** `NEXO_DEMO_MODE=auto` oder `false` + gültiger Key; Kosten und Datenfluss zum Anbieter beachten.

## Build & Start

```bash
npm ci
npm run db:push          # Schema auf SQLite anwenden (MVP: db push, keine Migrations-Historie)
npm run build
npm run start            # Port über HOST/PORT der Plattform, z. B. -p 3000
```

Erstes Deploy: Verzeichnis für DB anlegen und Schreibrechte prüfen (User des Node-Prozesses).

Health-Smoke nach Deploy:

1. `/anmelden` — Login mit `NEXO_AUTH_PASSWORD`
2. `/heute` — lädt ohne 401
3. Optional: `GET /api/auth/session` mit Session-Cookie (Browser DevTools)

## Auth-Verhalten

- Aktiv, sobald `NEXO_AUTH_PASSWORD` gesetzt ist (`src/middleware.ts`).
- Geschützt: alle Seiten außer `/anmelden`, alle `/api/*` außer `/api/auth/login` und `/api/auth/session`.
- Session: httpOnly-Cookie `nexo_session`, TTL 7 Tage.
- **Lokal ohne Passwort:** Auth aus — nur für Entwicklung im privaten Netz.

## SQLite: Persistenz & Backup

- Datei liegt am Pfad aus `DATABASE_URL` (`file:`-Präfix). Relative Pfade beziehen sich auf **`prisma/`**.
- Produktion: **absoluter Pfad** auf gemountetem Volume, z. B. `file:/var/lib/nexo/prod.db`.
- Vor Updates/Deploy: Backup (App kurz stoppen oder Online-Backup nutzen).

Im Repo:

```bash
./scripts/backup-db.sh              # liest DATABASE_URL aus .env
./scripts/backup-db.sh /pfad/zum/backup
```

Cron-Beispiel (täglich 03:00, Pfade anpassen):

```cron
0 3 * * * cd /opt/nexo && set -a && . ./.env && set +a && ./scripts/backup-db.sh /var/backups/nexo
```

Wiederherstellung: App stoppen, Backup-Datei über die aktive DB kopieren, App starten.

## Sicherheit (kurz)

- Keine Secrets in Erinnerungen speichern (App lehnt Heuristik-Fälle ab).
- API-Keys nie an den Client; nur Server-Env.
- Nach Passwort-Wechsel: neue Sessions nötig (Secret/Passwort ändern invalidiert bestehende Cookies nicht automatisch — bei Kompromiss Secret rotieren und Browser-Cookies löschen).

## Troubleshooting

| Symptom | Ursache | Maßnahme |
|---------|---------|----------|
| 401 auf allen APIs | Auth an, nicht eingeloggt | `/anmelden` |
| Immer Demo-Badge | Kein Key oder `NEXO_DEMO_MODE=true` | Key/Modus prüfen |
| Live schlägt fehl, Demo-Antwort | API-Fehler, Retry erschöpft | Logs, Key, `OPENAI_BASE_URL` |
| Leere DB nach Redeploy | Ephemeres FS ohne Volume | `DATABASE_URL` auf persistentes Volume |
| Prisma-Fehler beim Start | Schema/Datei fehlt | `npm run db:push`, Rechte auf DB-Ordner |

## Google Kalender (optional)

OAuth-Env und Redirect-URI: [INTEGRATIONS.md](./INTEGRATIONS.md). Tokens in SQLite (`CalendarConnection`) — nur mit `NEXO_AUTH_PASSWORD` öffentlich hosten.

## Siehe auch

- [README.md](../README.md) — lokal entwickeln
- [MANUAL_TEST.md](./MANUAL_TEST.md) — Funktionstests
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Schichten & Freigaben
