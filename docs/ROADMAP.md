# Nexo — Roadmap (PR-für-PR)

Arbeitsweise: **Ein PR = ein klar abgrenzbarer Schritt.** Du mergst auf `main` → der Agent setzt den nächsten Schritt um (ohne dass du jedes Mal neu nach „next steps“ fragen musst).

| # | PR-Thema | Inhalt (kurz) | Danach testbar |
|---|----------|---------------|----------------|
| **1** | MVP | Chat, Heute, Aufgaben, Gedächtnis, Freigaben | ✅ merged |
| **2** | Test-Readiness | `MANUAL_TEST.md`, Heute „Demnächst (7 Tage)“ | Erste geführte Test-Session |
| **3** | Aufgaben bearbeiten | Inline/Bearbeiten-Dialog (Titel, Datum, Priorität) | MVP-Lücke „bearbeiten“ |
| **4** | Chat leeren | Verlauf löschen mit Bestätigung; Gedächtnis bleibt | Transparenz Datentrennung |
| **5** | Aktivitäten | Kompakte Historie (Chat + Heute), Status-Filter | Freigaben nachvollziehen |
| **6** | Erinnerungen | Bearbeiten + Hinweis bei widersprüchlichen Inhalten | Gedächtnis-Pflege |
| **7** | Tagesplan-Entwurf | Vorschlag aus Chat als bestätigbarer Plan (lokal) | „Plane meinen Tag“ mit Freigabe |
| **8** | Live-Agent | Tool-Loop, Limits, Fehler → verständliche UI | Mit `OPENAI_API_KEY` |
| **9** | Auth (Single-User) | Einfacher Schutz aller APIs | Vor externem Hosting |
| **10** | E2E | Playwright: Chat-Freigabe + Heute | ✅ merged |

Reihenfolge bewusst: erst **testen & Lücken im MVP**, dann **Transparenz**, dann **Intelligenz & Absicherung**.

## Phase 2 (nach MVP)

| # | PR-Thema | Inhalt (kurz) | Danach testbar |
|---|----------|---------------|----------------|
| **11** | CI | GitHub Actions: lint, Vitest, Playwright Chromium | ✅ merged |
| **12** | Hosting-Runbook | Auth, Env, SQLite-Backup, Demo/Live | ✅ merged |
| **13** | Benachrichtigungen | Opt-in, keine Dark Patterns | ✅ merged |
| **14** | Integrationen (Start) | z. B. Kalender-Tool-Skelett, freigabepflichtig | Erster externer Kanal |

Anpassungen an der Reihenfolge jederzeit möglich — ein Satz reicht, bevor der nächste PR startet.
