# Protokoll

Persönlicher Ernährungs- und Gesundheitstracker als installierbare Web-App (PWA) für das iPhone.
Alle eingetragenen Daten bleiben lokal auf dem Gerät (IndexedDB); dieses Repository enthält nur den Code.

- `src/` – Quellcode (Daten, Logik, Oberfläche, Styles, Service Worker)
- `docs/` – fertige App, wird von GitHub Pages ausgeliefert
- `build.py` – baut `src/` zu `docs/index.html` (alles in einer Datei) plus Manifest, Service Worker und Icons

Neu bauen: `npm install && python3 build.py`
