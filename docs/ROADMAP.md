# Nexo — Roadmap (PR-für-PR)

Arbeitsweise: **Ein PR = ein klar abgrenzbarer Schritt.** Du mergst auf `main` → der Agent setzt den nächsten Schritt um (ohne dass du jedes Mal neu nach „next steps“ fragen musst).

## Phase 1 — MVP ✅

| # | PR-Thema | Status |
|---|----------|--------|
| 1–10 | MVP bis E2E | ✅ merged (Details im Git-Verlauf / frühere PRs) |

Kern: Chat, Heute, Aufgaben, Gedächtnis, Freigaben, Auth, Demo/Live-Agent, Playwright-Basis.

## Phase 2 — Betrieb & Vertrauen ✅

| # | PR-Thema | Status |
|---|----------|--------|
| **11** | CI (GitHub Actions) | ✅ merged |
| **12** | Hosting-Runbook | ✅ merged |
| **13** | Benachrichtigungen (Opt-in) | ✅ merged |
| **14** | Kalender-Skelett (Entwürfe) | ✅ merged |

## Phase 3 — Integrationen & Tests ✅

| # | PR-Thema | Status |
|---|----------|--------|
| **15** | E2E Kalender-Entwurf | ✅ merged |
| **16** | Google OAuth + Export | ✅ merged |
| **17** | Roadmap Phase 4 | ✅ (dieser PR) |

---

## Phase 4 — Nächste PRs (priorisiert)

Reihenfolge ist Vorschlag; ein Satz genügt zum Umstellen.

| # | PR-Thema | Inhalt (kurz) | Erfolgskriterium |
|---|----------|---------------|------------------|
| **18** | Kalender härten | Token-Sicherheit (Verschlüsselung at rest), Export-Fehler in UI, `.ics`-Download ohne OAuth | ✅ merged (#19) |
| **19** | E2E Google-Pfad | Playwright mit gemocktem Export oder „connected“-Fixture; CI ohne echte Google-Keys | Grüner CI-Check |
| **20** | Live-Agent | Kontextbudget sichtbar, bessere Tool-Fehler, optional 1–2 read-only Tools | Live-Chat robuster |
| **21** | E-Mail-Skelett | Wie Kalender: Opt-in, `external_*`-Aktion, **kein** Versand ohne Freigabe | Erster E-Mail-Entwurf |
| **22** | Microsoft Kalender | OAuth + Export analog Google | Outlook-Event nach Freigabe |

### Bewusst **nicht** in Phase 4

- Multi-User / Teams
- Push ohne Opt-in oder Hintergrund-Sync
- Automatisches Schreiben ohne Freigabe-Karte
- Vollständige Kalender-Synchronisation (lesen aller externen Termine)

### Leitplanken (bleiben)

- **Freigabe** für jede schreibende externe Wirkung
- **Ehrliche UX** (Demo, „nicht verbunden“, Export-Status)
- **Single-User**, SQLite, optional Auth vor Hosting

---

Anpassungen jederzeit — ein Satz reicht, bevor der nächste PR startet.

**Kurzüberblick offene Arbeit:** [NEXT_STEPS.md](./NEXT_STEPS.md) · **Integrationen:** [INTEGRATIONS.md](./INTEGRATIONS.md)
