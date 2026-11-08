// Garmin-Weiterleitung (Cloudflare Worker) mit nachgebautem Garmin testen: node tests/relay.js
const fs = require('fs');
const path = require('path');
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const code = fs.readFileSync(path.join(__dirname, '../relay/garmin-relay.js'), 'utf8');
  const worker = (await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))).default;
  const APP = 'https://argus100-agent.github.io';
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    if (String(url).includes('/token')) return new Response('eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.sig', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    if (String(url).includes('kaputt')) throw new Error('offline');
    return new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const W = 'https://protokoll-garmin.beispiel.workers.dev';
  const req = (p, opt = {}) => worker.fetch(new Request(W + p, opt));
  const hdr = (h) => ({ Origin: APP, ...h });

  let r = await req('/');
  ok(r.status === 200 && (await r.text()) === 'Protokoll-Weiterleitung läuft (v2)' && r.headers.get('Access-Control-Allow-Origin') === APP, 'Startseite: läuft (v2), mit CORS-Kopf');
  r = await req('/sleep-service/sleep/dailySleep?date=2026-11-07', { method: 'OPTIONS', headers: hdr({ 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' }) });
  ok(r.status === 204 && /Authorization/.test(r.headers.get('Access-Control-Allow-Headers')), 'Vorabanfrage (OPTIONS) erlaubt Authorization');
  r = await req('/sleep-service/sleep/dailySleep?date=2026-11-07', { headers: { Authorization: 'Bearer x' } });
  ok(r.status === 403 && calls.length === 0, 'Ohne Ursprung der App: abgelehnt, nichts weitergeleitet');
  r = await req('/sleep-service/sleep/dailySleep?date=2026-11-07', { headers: { Origin: 'https://fremd.example', Authorization: 'Bearer x' } });
  ok(r.status === 403 && calls.length === 0, 'Fremder Ursprung: abgelehnt');

  r = await req('/personalapitoken-service/personal-api/personal-api-key/token', { method: 'POST', headers: hdr({ Authorization: 'ApiKey testschluessel123', Accept: '*/*' }) });
  const c1 = calls[calls.length - 1];
  ok(r.status === 200 && (await r.text()).startsWith('eyJ') && c1.url === 'https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token' && c1.init.method === 'POST' && c1.init.headers.Authorization === 'ApiKey testschluessel123', 'Token-Tausch wird mit Schlüssel an Garmin weitergereicht');
  ok(r.headers.get('Access-Control-Allow-Origin') === APP && r.headers.get('Cache-Control') === 'no-store', 'Antwort mit CORS-Kopf und ohne Zwischenspeichern');

  r = await req('/usersummary-service/v2/dailysummaries?startDate=2026-11-01&endDate=2026-11-07', { headers: hdr({ Authorization: 'Bearer abc.def.ghi', Accept: 'application/json' }) });
  const c2 = calls[calls.length - 1];
  ok(r.status === 200 && c2.url === 'https://personal.connectapi.garmin.com/usersummary-service/v2/dailysummaries?startDate=2026-11-01&endDate=2026-11-07' && c2.init.headers.Authorization === 'Bearer abc.def.ghi' && c2.init.method === 'GET', 'Datenabruf mit Bearer und Suchparametern');

  const n = calls.length;
  r = await req('/activity-service/activity/9001', { headers: hdr({ Authorization: 'Bearer x' }) });
  ok(r.status === 200 && calls.length === n + 1 && calls[n].url.endsWith('/activity-service/activity/9001'), 'Lesen weiterer Garmin-Dienste (Aktivitätsdetails) erlaubt');
  r = await req('/irgendwas/geheim', { headers: hdr({ Authorization: 'Bearer x' }) });
  ok(r.status === 403 && calls.length === n + 1, 'Pfad außerhalb der Garmin-Dienste: abgelehnt');
  r = await req('/activity-service/activity/9001', { method: 'DELETE', headers: hdr({ Authorization: 'Bearer x' }) });
  ok(r.status === 403 && calls.length === n + 1, 'Löschen/Ändern (DELETE): abgelehnt');
  const n2 = calls.length;
  r = await req('/sleep-service/sleep/dailySleep', { method: 'POST', headers: hdr({ Authorization: 'Bearer x' }) });
  ok(r.status === 403 && calls.length === n2, 'POST auf Datenpfad: abgelehnt');
  r = await req('/personalapitoken-service/personal-api/personal-api-key/token', { method: 'GET', headers: hdr({ Authorization: 'ApiKey x' }) });
  ok(r.status === 401 && calls.length === n2, 'GET auf Token-Pfad nur mit Bearer, ApiKey wird nicht durchgereicht');
  r = await req('/sleep-service/../irgendwas/geheim', { headers: hdr({ Authorization: 'Bearer x' }) });
  ok(r.status === 403 && calls.length === n2, 'Pfad mit .. führt nicht aus der Freigabe heraus');
  r = await req('/sleep-service/sleep/dailySleep?date=2026-11-07', { headers: hdr({}) });
  ok(r.status === 401 && calls.length === n2, 'Ohne Anmeldung: 401, nichts weitergeleitet');
  r = await req('/personalapitoken-service/personal-api/personal-api-key/token', { method: 'POST', headers: hdr({ Authorization: 'Bearer x' }) });
  ok(r.status === 401 && calls.length === n2, 'Token-Tausch nur mit ApiKey');
  r = await req('/wellness-service/kaputt', { headers: hdr({ Authorization: 'Bearer x' }) });
  ok(r.status === 502 && r.headers.get('Access-Control-Allow-Origin') === APP, 'Garmin nicht erreichbar: 502 mit CORS-Kopf');
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
