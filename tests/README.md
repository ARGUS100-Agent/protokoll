# Tests (Playwright, iPhone-Format)

Vorher bauen (`npm install && python3 build.py`) und `docs/` lokal ausliefern:

```
python3 -m http.server 8766 --directory docs &
node tests/smoke.js /tmp/out     # alle Bereiche öffnen, Konsolenfehler, Screenshots
node tests/flow.js /tmp/out      # Abläufe: Koffein, Sauna, Gym-Sätze, Lauf, Einkauf, Blutwerte, Tests, Timer, Fotos, Backup
node tests/clock.js /tmp/out     # simulierte Uhr: Timer-Automatik, Sonntag, Phasenwechsel, Erholung
node tests/frank.js /tmp/out     # Frank: Code aus dem Claude-Chat einfügen, Vorschau, Eintragen, Ersetzen
node tests/vorrat.js /tmp/out    # Vorrat: Einkauf, Abzug über Haken und Einträge, automatisch auf die Einkaufsliste
node tests/ziele.js /tmp/out     # Wochenbericht an Frank, Wochenziele (Messung, „Jetzt dran“, Hinweise), Muster und Gewohnheiten
node tests/garmin.js /tmp/out    # Garmin über eine nachgebaute Weiterleitung: Verbinden, Abruf, Zuordnung, Trainings, Fehler, Datenschutz
node tests/relay.js              # Weiterleitung (Cloudflare Worker) ohne Browser: Garmin nachgebaut; Mitteilungen mit nachgebautem KV und Push-Dienst (Inhalt mit http_ece entschlüsselt, VAPID geprüft)
node tests/push.js /tmp/out      # 2.8: Mitteilungen einrichten, Plan, Versand über den echten Worker-Code, Service Worker, Klick, Kategorien, Ausschalten
node tests/alltag.js /tmp/out    # 2.7: Update auf Schema 5, Tagesrhythmus, Bereitschaft, Gym-Zuordnung, Alternativen, Snacks, Energiebilanz
node tests/rhythmus.js /tmp/out  # 2.9: Schlaffenster aus den Garmin-Nächten (steuert Schlafenszeit, Koffein, Mitteilungen), Wunschliste, Backup
node tests/v210.js /tmp/out      # 2.10: Kraft-Autopilot, Gewohnheiten & Routinen, Kältebad, Handy, Barcode, Sonne/UV, App-Symbol, Experimente, Frank-KI, Wochen-Agent, Morgen-Briefing (Worker v4 mit nachgebautem Claude und Garmin)
node tests/blutdruck.js /tmp/out # 2.11: Blutdruck-Messwoche (ESC 2024), Einordnung, Störfaktoren, Mitteilungen, Routine, Bericht
node tests/zwick.js /tmp/out     # 2.12: Zwickt’s – Stelle und Seite wählen, Schmerz 0–10, Stufen akut/Aufbau, Timer, Warnzeichen, Verlauf, BJJ (Garmin, Frage am Morgen), Bericht
```

`upgrade.js` prüft das Update einer alten Version mit Daten auf die aktuelle (alte `docs/` per `git archive` in einen Ordner, Symlink `cur` darauf, Server auf Port 8768 mit `--directory <ordner>/cur`, dann `node tests/upgrade.js <ordner>`).

`upgrade2.js` prüft genauso das Update von 2.0.0 (Schema 2) auf die aktuelle Version: Kiwi/Schokolade/Rote Bete behalten an alten Tagen ihr Lebensmittel, Einkaufsliste bekommt Läden und den Einkaufsstand (Server auf Port 8769).

`upgrade3.js` prüft das Update von 2.2.0 auf die aktuelle Version mit dem Vorrat (Server auf Port 8770).
