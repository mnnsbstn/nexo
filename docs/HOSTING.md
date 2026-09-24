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
| **Öffentliche URL** | `NEXO_PUBLIC_URL` setzen, sobald OAuth, Microsoft/Google-Callbacks oder Web Push genutzt werden |
| **Web Push** | Optional: VAPID-Keys + Opt-in in Einstellungen — nur sinnvoll mit HTTPS und korrekter `NEXO_PUBLIC_URL` |

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
| `NEXO_PUBLIC_URL` | Bei OAuth / Push | Öffentliche Basis-URL **ohne** trailing slash, z. B. `https://nexo.example.com` — Redirects: `{URL}/api/integrations/calendar/...` |
| `NEXO_VAPID_PUBLIC_KEY` | Nur Web Push | Paar mit Private Key; erzeugen: `npx web-push generate-vapid-keys` |
| `NEXO_VAPID_PRIVATE_KEY` | Nur Web Push | Nie committen, nie im Client |
| `NEXO_VAPID_SUBJECT` | Nur Web Push | z. B. `mailto:admin@example.com` (VAPID-Kontakt) |

Kalender (Google/Microsoft/iCloud/CalDAV), SMTP, iCloud Mail: weitere Variablen in [INTEGRATIONS.md](./INTEGRATIONS.md) und [.env.example](../.env.example).

**Nicht in Produktion setzen:** `NEXO_E2E_CALENDAR_MOCK`, `NEXO_E2E_EMAIL_MOCK` (nur Playwright).

Beispiel (nur Struktur — Werte ersetzen):

```bash
DATABASE_URL="file:/var/lib/nexo/prod.db"
NEXO_AUTH_PASSWORD="…"
NEXO_SESSION_SECRET="…lange-zufällige-zeichenkette…"
NEXO_DEMO_MODE=auto
OPENAI_API_KEY="sk-…"
NODE_ENV=production
NEXO_PUBLIC_URL="https://nexo.example.com"
# Optional Web Push (nach Key-Generierung):
# NEXO_VAPID_PUBLIC_KEY="…"
# NEXO_VAPID_PRIVATE_KEY="…"
# NEXO_VAPID_SUBJECT="mailto:admin@example.com"
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
4. Test-Aufgabe anlegen → Reload → noch vorhanden (SQLite-Persistenz)
5. Optional Kalender: `NEXO_PUBLIC_URL` + OAuth-Redirect in Google/Microsoft-Konsole wie in [INTEGRATIONS.md](./INTEGRATIONS.md)
6. Optional Phase 6: **Einstellungen** → Sync-Einblicke / Web Push / CalDAV — Details [MANUAL_TEST.md](./MANUAL_TEST.md) §12–13

Kurz-Check Web Push (wenn VAPID gesetzt):

1. `GET /api/push/vapid-public-key` → `{ "configured": true, "publicKey": "…" }`
2. In der UI: Erinnerungen → Web Push aktivieren → Browser-Berechtigung
3. Heute fällige Aufgabe → **Heute** öffnen → höchstens ein Push pro Kalendertag (Opt-in)

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
| OAuth Redirect mismatch | `NEXO_PUBLIC_URL` falsch oder HTTP statt HTTPS | URL exakt wie in Cloud-Konsole; Proxy-Header prüfen |
| „Web Push nicht konfiguriert“ | VAPID-Env fehlt | Keys setzen, App neu starten; `/api/push/vapid-public-key` prüfen |
| Push kommt nicht an | Kein HTTPS, Permission verweigert, kein Abo | HTTPS, Opt-in in Einstellungen, Service Worker `/sw.js` erreichbar |
| Externe Termine leer | Kein Kalender verbunden / Token abgelaufen | Einstellungen → Verbindung; ggf. erneut verbinden |

## Integrationen (optional)

OAuth, SMTP, iCloud, CalDAV, Sync-Einblicke: [INTEGRATIONS.md](./INTEGRATIONS.md). Tokens und Zugangsdaten in SQLite — nur mit `NEXO_AUTH_PASSWORD` öffentlich hosten.

## Siehe auch

- [README.md](../README.md) — lokal entwickeln
- [MANUAL_TEST.md](./MANUAL_TEST.md) — Funktionstests
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Schichten & Freigaben
