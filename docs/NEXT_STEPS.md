# Nexo — Nächste Schritte

Stand nach **Phase 3** (Kalender-Entwurf, Google OAuth, E2E). Die verbindliche PR-Reihenfolge steht in **[ROADMAP.md](./ROADMAP.md) — Phase 4**.

## Als Nächstes (empfohlen)

1. **Schritt 18 — Kalender härten** — Export-Fehler in der UI, optional ICS-Fallback, Tokens nicht im Klartext in SQLite (Key aus `NEXO_SESSION_SECRET` o. Ä.)
2. **Schritt 19 — E2E Export-Pfad** — CI-sicher testen, ohne Google Cloud Credentials im Repo
3. **Schritt 20 — Live-Agent** — verständliche Fehler, Kontextlimits kommunizieren

## Danach

4. **E-Mail-Skelett** (Opt-in + Freigabe, wie Kalender Beta)
5. **Microsoft Kalender** (zweiter Provider)

## Erledigt (Kurz)

Auth, Chat leeren, Aktivitäten, Erinnerungen bearbeiten, Tagesplan, Live-Agent-Basis, CI, Hosting-Runbook, Opt-in-Erinnerungen, Kalender-Entwürfe, Google OAuth/Export, E2E Kern + Kalender.

## Manuell testen

- [MANUAL_TEST.md](./MANUAL_TEST.md)
- Google Kalender: [INTEGRATIONS.md](./INTEGRATIONS.md) + `.env.example`
