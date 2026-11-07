# Tests (Playwright, iPhone-Format)

Vorher bauen (`npm install && python3 build.py`) und `docs/` lokal ausliefern:

```
python3 -m http.server 8766 --directory docs &
node tests/smoke.js /tmp/out     # alle Bereiche öffnen, Konsolenfehler, Screenshots
node tests/flow.js /tmp/out      # Abläufe: Koffein, Sauna, Gym-Sätze, Lauf, Einkauf, Blutwerte, Tests, Timer, Fotos, Backup
node tests/clock.js /tmp/out     # simulierte Uhr: Timer-Automatik, Sonntag, Phasenwechsel, Erholung
```

`upgrade.js` prüft das Update einer alten Version mit Daten auf die aktuelle (alte `docs/` per `git archive` in einen Ordner, Symlink `cur` darauf, Server auf Port 8768 mit `--directory <ordner>/cur`, dann `node tests/upgrade.js <ordner>`).
