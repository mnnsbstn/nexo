# Nexo — Erste Test-Session (≈20 Min.)

Lokal starten: `npm run dev` → [http://localhost:3000](http://localhost:3000)

Badge **Demo** in der Navigation = regelbasierte Antworten (kein `OPENAI_API_KEY`).

## 1. Aufgabe per Formular (Persistenz)

1. **Aufgaben** → Titel „Test Persistenz“, optional Datum heute → **Speichern**
2. Seite neu laden (F5)
3. **Erwartung:** Aufgabe ist noch da

## 1b. Aufgabe bearbeiten

1. Bei „Test Persistenz“ → **Bearbeiten** → Titel anpassen → **Änderungen speichern**
2. Seite neu laden
3. **Erwartung:** Geänderter Titel bleibt; optional Datum leeren → „Ohne Datum“

## 2. Chat → Freigabe → Aufgabe

1. **Chat** → senden: `Erstelle eine Aufgabe: Termin vereinbaren, morgen um 10 Uhr.`
2. **Erwartung:** Demo-Antwort + Aktionskarte („Nur lokal in Nexo“)
3. **Bestätigen**
4. **Aufgaben** → Aufgabe „Termin vereinbaren“
5. **Heute** → Abschnitt **Demnächst (7 Tage)** zeigt die Aufgabe (nicht unter „Heute fällig“, wenn Fälligkeit morgen ist)
6. **Briefing aktualisieren** → Text erwähnt deine echten Nexo-Daten (kein Kalender)

## 3. Ablehnen ändert nichts

1. Chat: `Erstelle eine Aufgabe: Soll nicht existieren, heute`
2. **Ablehnen**
3. **Aufgaben** → Titel „Soll nicht existieren“ **nicht** vorhanden

## 4. Doppel-Bestätigung

1. Wieder Aufgabe vorschlagen lassen und **Bestätigen**
2. Nochmals auf **Bestätigen** (falls Karte noch sichtbar) oder gleiche Aktion erneut anstoßen
3. **Erwartung:** Keine doppelte Aufgabe mit gleichem Vorschlag (Idempotenz)

## 5. Gedächtnis

1. Chat: `Merke dir, dass ich kurze Antworten bevorzuge.`
2. Bestätigen
3. **Gedächtnis** → Eintrag sichtbar mit Quelle
4. Suche „kurz“ → Treffer
5. Löschen → Suche erneut → **kein** Treffer
6. Chat: `Was habe ich mir zu kurzen Antworten gemerkt?` → **keine** gelöschte Erinnerung

## 6. Chat leeren

1. **Chat** mit ein paar Nachrichten füllen; optional offene Freigabe stehen lassen
2. **Chatverlauf leeren** → bestätigen
3. **Erwartung:** Keine Nachrichten mehr; **Aufgaben** und **Gedächtnis** unverändert
4. Offene Freigaben erscheinen nicht mehr als wartend

## 7. Tagesplan (mit Freigabe)

1. **Chat:** `Plane meinen Tag anhand meiner offenen Aufgaben.`
2. Vorschau in der Antwort + Aktionskarte **Tagesplan speichern**
3. **Bestätigen** → **Heute** → Abschnitt **Dein Tagesplan** (Badge „Vorschlag · nur in Nexo“)
4. **Erwartung:** Aufgaben-Status unverändert; kein Kalender-Hinweis

## 8. Zusammenfassung & Prioritäten

1. Chat: `Was ist heute wichtig?` / `Plane meinen Tag`
2. **Erwartung:** Bezug auf gespeicherte Aufgaben, Kennzeichnung als Vorschlag/Demo, kein E-Mail/Kalender

## 7b. Erinnerung bearbeiten & Konflikt

1. **Gedächtnis** → zwei **Präferenzen** mit ähnlichen Wörtern (z. B. „kurze Antworten“ und erneut „kurze Antworten ohne Floskeln“)
2. **Erwartung:** Hinweis auf mögliche Überschneidung → **Trotzdem speichern** oder Text anpassen
3. **Bearbeiten** einer Erinnerung → **Änderungen speichern** → nach Reload sichtbar

## 9. Aktivitäten

1. Chat-Aktion bestätigen → **Heute** scrollen zu **Aktivitäten & Freigaben** → Status „Erfolgreich“
2. Filter **Offen** / **Erfolgreich** durchklicken
3. Im **Chat** kompakte Liste + Link „Alle auf Heute“

## 10. Mobil (kurz)

1. Browser schmal ziehen oder DevTools Device Mode
2. **Chat** Eingabe + Bestätigungskarten bedienbar, Navigation erreichbar

## Auth (optional)

1. In `.env` setzen: `NEXO_AUTH_PASSWORD=…` und `NEXO_SESSION_SECRET=…` (lang, zufällig)
2. `npm run dev` neu starten → Redirect auf `/anmelden`
3. Falsches Passwort → Fehler; richtiges Passwort → **Heute**
4. **Einstellungen** → **Abmelden**
5. Ohne `NEXO_AUTH_PASSWORD` bleibt Auth aus (nur lokaler Dev)

## Live-Modus (optional)

Nur mit gesetztem `OPENAI_API_KEY` in `.env` (Nav-Badge **Live**).

1. Kurze Frage zu offenen Aufgaben stellen
2. Assistenten-Nachricht mit Badge **Live**
3. Bei API-Fehler: Badge **Demo-Fallback** und Fehlerhinweis im Text

## 9. Erinnerungen (Opt-in)

1. **Einstellungen** → „Hinweis auf Heute“ aktivieren → **Erinnerungen speichern**
2. Lege eine **heute fällige** oder **überfällige** Aufgabe an (Aufgaben-Formular)
3. **Heute** → gelber Hinweis-Banner mit Aufgaben — verschwindet nicht bei geschlossener App (weil kein Push)
4. Optional: „Browser-Benachrichtigung“ aktivieren → **Berechtigung anfragen** (nur nach Klick) → Heute neu laden → ein Browser-Popup pro Tab-Sitzung
5. **Erwartung:** Kein Banner ohne Opt-in; kein automatisches Permission-Popup beim App-Start

## 10. Kalender-Entwurf (Beta)

1. **Einstellungen** → „Kalender-Entwürfe erlauben“ → **Integration speichern**
2. **Chat:** `Kalender Termin: Team-Sync morgen 10 Uhr`
3. **Erwartung:** Aktionskarte „Kalender-Entwurf · nicht verbunden“, scope extern
4. **Bestätigen** → Erfolg; unter Einstellungen erscheint der Entwurf in der Liste
5. Mit deaktivierter Integration: Chat-Hinweis, keine Karte

5. **Einstellungen** → bei Entwurf **Als .ics laden** (funktioniert auch ohne Google)
6. Optional: Google verbunden, Export schlägt fehl → roter Fehlertext + **Export erneut versuchen**

Details: [INTEGRATIONS.md](./INTEGRATIONS.md)

## Nach Deploy (Hosting)

Siehe [HOSTING.md](./HOSTING.md). Kurz-Check auf der Live-URL:

1. `/anmelden` → Login (wenn `NEXO_AUTH_PASSWORD` gesetzt)
2. **Heute** / **Chat** laden ohne Fehler
3. Eine Test-Aufgabe anlegen → Reload → noch vorhanden
4. Optional: `./scripts/backup-db.sh` auf dem Server ausführen

## Automatisiert (E2E)

```bash
npm run test:e2e:chromium
```

Deckt u. a. Navigation, Aufgaben-Persistenz, Chat Bestätigen/Ablehnen, Tagesplan, Kalender-Entwurf, `.ics`-Download und Mock-Google-Export (nur mit `NEXO_E2E_CALENDAR_MOCK=1` in Playwright) ab.

## Demo-Daten (optional)

**Einstellungen** → „Demo-Daten laden“ → Einträge mit Präfix `[Demo]`

## Automatisierte Tests

```bash
npm test
npm run build
```
