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
| **19** | E2E Google-Pfad | Playwright mit gemocktem Export oder „connected“-Fixture; CI ohne echte Google-Keys | ✅ merged (#20) |
| **20** | Live-Agent | Kontextbudget sichtbar, bessere Tool-Fehler, optional 1–2 read-only Tools | ✅ merged (#21) |
| **21** | E-Mail-Skelett | Wie Kalender: Opt-in, `external_*`-Aktion, **kein** Versand ohne Freigabe | ✅ merged (#22) |
| **22** | Microsoft Kalender | OAuth + Export analog Google | ✅ merged (#23) |

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

## Phase 5 — Erweiterung (priorisiert)

| # | PR-Thema | Inhalt (kurz) | Erfolgskriterium |
|---|----------|---------------|------------------|
| **23** | E-Mail SMTP-Versand | Nach Entwurf + **manueller** Senden-Button; SMTP-Env; E2E-Mock | ✅ merged (#24) |
| **24** | Kalender extern lesen | Read-only: nächste Termine (verbundener Provider) | ✅ merged (#25) |
| **26** | iCloud Kalender + Mail | CalDAV Export/Lesen; SMTP + IMAP read-only; Einstellungen-Form | ✅ merged (#26) |
| **25** | Multi-Kalender | Google + Microsoft + iCloud parallel | ✅ merged (#27) |
| **27** | E2E Multi-Kalender | Playwright: zwei Mock-Provider, Export-Ziel | CI grün, UI-Assertions aktuell |

Leitplanken Phase 5: weiter **Freigabe vor Wirkung**, Single-User, SQLite.

---

## Phase 6 — Erweiterung

| # | PR-Thema | Inhalt (kurz) | Erfolgskriterium |
|---|----------|---------------|------------------|
| **28** | Sync-Einblicke + Push + CalDAV | Längere read-only Vorschau, Entwurf-Überschneidungen; Web Push (VAPID, Opt-in); generischer CalDAV-Provider | Einstellungen + Tests |

| Thema | Status |
|-------|--------|
| **Sync-Tiefe (read-only)** | `calendarSyncInsightsEnabled`: 60–90 Tage, RRULE-Hinweis, Entwurf-Overlap |
| **Web Push** | `notifyWebPushDueTasks` + VAPID-Env + Service Worker |
| **CalDAV generisch** | Provider `caldav`, eigene Server-URL |
| **Teams / Multi-User** | Bewusst **nicht** Ziel |

---

---

Anpassungen jederzeit — ein Satz reicht, bevor der nächste PR startet.

**Kurzüberblick offene Arbeit:** [NEXT_STEPS.md](./NEXT_STEPS.md) · **Integrationen:** [INTEGRATIONS.md](./INTEGRATIONS.md)
