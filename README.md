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
- **Garmin & Schlaf**: Werte aus Garmin Connect (siehe unten) oder von Hand; Verlauf und Zusammenhänge
- **Körper, Blutwerte, Einkauf, Wochenrückblick**

## Garmin Connect (ab 2.5.0)

Die App holt Schlaf (Score, Dauer, Phasen, Zeiten), HRV und HRV-Status, Ruhepuls, Body Battery morgens/abends, Stress, Atemfrequenz, SpO2, Hauttemperatur, Schritte, Intensitätsminuten, VO2max, Gewicht, Kalorien, Fitnessalter und Aktivitäten (als Training) über die [Garmin Personal API](https://developer.garmin.com/gc-developer-program/personal/personal-api). Garmin erlaubt Web-Apps keinen direkten Zugriff (CORS), deshalb läuft der Abruf über eine eigene, kostenlose Weiterleitung:

1. In Garmin Connect (Web) einen Personal API Key erstellen: <https://connect.garmin.com/app/settings/personalApiToken> – er wird nur einmal angezeigt.
2. Bei Cloudflare einen Worker anlegen und den Inhalt von [`relay/garmin-relay.js`](relay/garmin-relay.js) einfügen (Deploy). Der Worker reicht nur Anfragen der App an Garmin durch, speichert nichts und lässt nur die nötigen Garmin-Pfade zu.
3. In der App unter Garmin & Schlaf → Einrichten (oder Einstellungen → Garmin Connect) die Worker-Adresse und den Schlüssel eintragen.

Schlüssel, Zugang und Worker-Adresse liegen nur auf dem Gerät – nicht im Backup und nicht im Code. Selbst eingetragene oder geänderte Werte überschreibt Garmin nicht; gelöschte Garmin-Trainings werden nicht wieder geholt. Trainingsbereitschaft liefert die Personal API nicht.

Im Code stehen nur allgemeine Inhalte (Übungen, Regeln, Pläne). Persönliches wie Befund, Termine, Messwerte und Fotos liegt ausschließlich lokal auf dem Gerät und im eigenen Backup.
