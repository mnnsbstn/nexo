# Nexo — Produktentscheidungen (kurz)

Lebendes Log für wiederkehrende „Warum so?“-Fragen. Kein Ersatz für Issues — nur Kontext für PRs.

| Datum | Entscheidung | Begründung |
|-------|--------------|------------|
| MVP | SQLite, Single-User | Wenig Moving Parts, schneller lokaler MVP |
| MVP | Freigabe vor Schreiben | Modell schlägt vor, Nutzer bestätigt — kein verstecktes Schreiben |
| Phase 2 | CI vor Hosting-Doku | Regressionsnetz vor externem Deploy |
| Phase 3 | Kalender zuerst, E-Mail später | Häufiger Use Case „Termin“; gleiches Muster wiederverwendbar |
| Phase 3 | Google vor Microsoft | Ein Provider end-to-end; zweiter Provider als eigener PR |
| Phase 3 | Export nur nach Freigabe | Entwurf lokal → Bestätigen → optional Google Event |
| Phase 4 (Plan) | ICS-Fallback | Nutzen ohne OAuth; ehrlich als Download, kein Sync |
| Phase 4 | OAuth-Tokens verschlüsselt at rest | SQLite-Datei allein soll keine Klartext-Tokens preisgeben |
| Phase 4 | E2E: `NEXO_E2E_CALENDAR_MOCK=1` | Playwright seedet Verbindung + Mock-Export ohne echte Google-API |
| Phase 4 | Live: Kontextbudget in Chat-Metadaten | Transparenz zu Tool-Runden und History-Limit ohne verstecktes Schreiben |
| Phase 4 | E-Mail nur Entwurf, kein Versand | Gleiches Freigabe-Muster wie Kalender; SMTP/API bewusst später |
| Phase 5 | E-Mail: zwei Schritte | Chat-Freigabe = Entwurf; Versand nur manuell in Einstellungen + Confirm |
| Phase 5 | Kalender lesen read-only | Kein Sync; Live-Agent/Settings zeigen Vorschau, ehrlich gekennzeichnet |
| Phase 4 | Ein Kalender-Provider aktiv | `CalendarConnection` id `default` — Google *oder* Microsoft, kein Parallelbetrieb |
| Phase 4 (Plan) | Kein Multi-Tenant | Nexo bleibt persönlicher Assistent, kein Team-Produkt |

Neue Zeilen bei PRs ergänzen, wenn eine Entscheidung festgezogen wird.
