/*
 * Protokoll – Garmin-Weiterleitung (Cloudflare Worker)
 *
 * Garmin lässt Web-Apps nicht direkt an die Personal API (CORS). Dieser kleine Worker
 * reicht die Anfragen der Protokoll-App an Garmin weiter und gibt die Antwort zurück.
 * Er speichert nichts und schreibt nichts mit. Der Garmin-Schlüssel bleibt in der App
 * auf deinem Gerät und läuft nur verschlüsselt (HTTPS) hier durch.
 *
 * Einrichten: Cloudflare → Workers & Pages → Worker „Hello World“ anlegen → Deploy →
 * Code bearbeiten → alles durch diesen Code ersetzen → Deploy. Die Adresse (…workers.dev)
 * in der App unter Garmin → Verbinden eintragen.
 */
const APP_ORIGIN = 'https://argus100-agent.github.io';
const GARMIN = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const DATA_PATH = /^\/[a-z][a-z0-9-]*-service\/[A-Za-z0-9/_.-]+$/; // nur Lesen (GET) von Garmin-Diensten
const VERSION = 2;

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': APP_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Accept',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    };
    const text = (status, msg) => new Response(msg, { status, headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' } });
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/') return text(200, `Protokoll-Weiterleitung läuft (v${VERSION})`);
    if (request.headers.get('Origin') !== APP_ORIGIN) return text(403, 'Weiterleitung: nur für die Protokoll-App');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const isToken = request.method === 'POST' && url.pathname === TOKEN_PATH;
    const isData = request.method === 'GET' && DATA_PATH.test(url.pathname) && !url.pathname.includes('..');
    if (!isToken && !isData) return text(403, 'Weiterleitung: Pfad nicht erlaubt');
    const auth = request.headers.get('Authorization') || '';
    if (!(isToken ? /^ApiKey \S+$/ : /^Bearer \S+$/).test(auth)) return text(401, 'Weiterleitung: Anmeldung fehlt');
    let res;
    try {
      res = await fetch(GARMIN + url.pathname + url.search, {
        method: request.method,
        headers: { Authorization: auth, Accept: isToken ? '*/*' : 'application/json', 'User-Agent': `protokoll-relay/${VERSION}` },
        redirect: 'manual',
      });
    } catch (e) {
      return text(502, 'Weiterleitung: Garmin nicht erreichbar');
    }
    const headers = new Headers(cors);
    headers.set('Content-Type', res.headers.get('Content-Type') || 'application/json');
    return new Response(res.body, { status: res.status, headers });
  },
};
