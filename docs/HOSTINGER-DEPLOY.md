# Nexo auf Hostinger (Node.js)

Nexo ist **keine** statische Site — Deploy über **Node.js** (`next start`), nicht GitHub Pages.

## 1. Voraussetzungen

- Hostinger **Business/Cloud** mit **Node.js**-Website (oder leere Website + Node-Deploy)
- Domain oder Subdomain, z. B. `nexo.deine-domain.de`
- GitHub-Repo `mnnsbstn/nexo` (optional: Git-Auto-Deploy in hPanel)

## 2. Persistente SQLite (wichtig)

Deploy ersetzt den App-Ordner — **DB nicht** unter `hbuilds/` lassen.

1. In hPanel **Dateimanager** (oder SSH): Ordner anlegen, z. B.  
   `/home/DEIN-USER/nexo-data/`
2. **Node.js → Environment variables** (vor dem ersten Deploy setzen):

| Variable | Beispiel / Hinweis |
|----------|-------------------|
| `DATABASE_URL` | `file:/home/DEIN-USER/nexo-data/prod.db` |
| `NODE_ENV` | `production` |
| `NEXO_AUTH_PASSWORD` | starkes Passwort |
| `NEXO_SESSION_SECRET` | ≥ 16 Zeichen, zufällig |
| `NEXO_PUBLIC_URL` | `https://nexo.deine-domain.de` (ohne `/` am Ende) |
| `NEXO_DEMO_MODE` | `true` (ohne OpenAI-Kosten) oder `auto` |

Optional OAuth: `GOOGLE_*`, `MICROSOFT_*` — siehe [INTEGRATIONS.md](./INTEGRATIONS.md).

**Nicht setzen:** `NEXO_E2E_CALENDAR_MOCK`, `NEXO_E2E_EMAIL_MOCK`.

Der Build führt `prisma db push` aus (`npm run build`) — dafür muss `DATABASE_URL` **vor dem Build** gesetzt sein.

## 3. Deploy (Cursor + Hostinger MCP)

1. Hostinger in Cursor verbinden (Plugin / API-Token).
2. Ziel-Domain bestätigen (Deploy **überschreibt** die Site).
3. Deploy aus Repo oder ZIP:
   - **Git:** Branch `main`, Typ `nodejs`, Node **20**, Framework **next**
   - **ZIP:** Quellcode ohne `node_modules`, `.next`, `.git`, `.env`, `*.db`

Build auf dem Server: `npm ci` → `npm run build` → Start `npm run start` (bindet `PORT`).

## 4. Nach dem Deploy

1. `https://DEINE-URL/anmelden` → Login
2. `/heute` lädt
3. Test-Aufgabe anlegen → **nochmal deployen** (optional) → Aufgabe muss **noch da sein** (sonst `DATABASE_URL` prüfen)
4. OAuth: Redirect-URIs in Google/Microsoft = `{NEXO_PUBLIC_URL}/api/integrations/calendar/...`
5. SBSTN-39: Reconnect-Test wie in [MANUAL_TEST.md](./MANUAL_TEST.md) (Staging/Prod ohne Mock)

## 5. Backup

Cron auf dem Server: `scripts/backup-db.sh` mit geladener Env — siehe [HOSTING.md](./HOSTING.md).
