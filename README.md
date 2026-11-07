# Protokoll

Persönlicher Ernährungs- und Gesundheitstracker als installierbare Web-App (PWA) für das iPhone.
Alle eingetragenen Daten bleiben lokal auf dem Gerät (IndexedDB); dieses Repository enthält nur den Code.

- `src/` – Quellcode (Daten, Logik, Oberfläche, Styles, Service Worker)
- `docs/` – fertige App, wird von GitHub Pages ausgeliefert
- `build.py` – baut `src/` zu `docs/index.html` (alles in einer Datei) plus Manifest, Service Worker und Icons

Neu bauen: `npm install && python3 build.py` · Tests: siehe `tests/README.md`

## Bereiche (Version 2)

Tab-Leiste (anpassbar): Heute · Ernährung · Training · Knie · Mehr. Unter „Mehr“: Supplements, Licht & Koffein, Haut, Körper, Blutwerte, Garmin & Schlaf, Einkauf, Wochenrückblick, Einstellungen & Backup.

- **Heute**: Kurzinfos aus allen Bereichen, Knie-Morgencheck, Sonntags-Check (Fotos, Gewicht, Hautbild), fällige Termine
- **Training & Sauna**: Einheiten mit Uhrzeit, Dauer, Intensität; 3er-Split (Schedule A/B) mit Sätzen, Gewichten und Knie-Varianten; automatische Ernährungsvariante A/B/C; Wochenplan-Vorschlag mit Garmin-Erholung, Nachholen und Konflikt-Warnungen; Sauna-Wochenziel mit Vorschlägen
- **Knie & Mobility**: Übungsbibliothek mit Filtern und Video-Links, Routinen mit geführtem Timer (Ton + Sprachansage, Aufschlag für die betroffene Seite), 12-Wochen-Kraftplan mit Phasen-Check, Lauf-Tracking, Einlagen, Tests, Meilensteine, Termine
- **Licht & Koffein**: Licht-Checks, Koffein-Rechner mit Halbwertszeit, Tageskurve und Warnungen
- **Haut**: Hautscore, Stellen, Wochenfotos (eigene IndexedDB, Vergleich, ZIP-Export), Phasen-Countdown und -Diagramm
- **Körper, Blutwerte, Einkauf, Wochenrückblick**

Im Code stehen nur allgemeine Inhalte (Übungen, Regeln, Pläne). Persönliches wie Befund, Termine, Messwerte und Fotos liegt ausschließlich lokal auf dem Gerät und im eigenen Backup.
