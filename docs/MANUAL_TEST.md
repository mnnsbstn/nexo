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

## 7. Zusammenfassung & Prioritäten

1. Chat: `Was ist heute wichtig?` / `Plane meinen Tag`
2. **Erwartung:** Bezug auf gespeicherte Aufgaben, Kennzeichnung als Vorschlag/Demo, kein E-Mail/Kalender

## 8. Mobil (kurz)

1. Browser schmal ziehen oder DevTools Device Mode
2. **Chat** Eingabe + Bestätigungskarten bedienbar, Navigation erreichbar

## Demo-Daten (optional)

**Einstellungen** → „Demo-Daten laden“ → Einträge mit Präfix `[Demo]`

## Automatisierte Tests

```bash
npm test
npm run build
```
