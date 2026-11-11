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
  ok(r.status === 200 && (await r.text()) === 'Protokoll-Weiterleitung läuft (v4)' && r.headers.get('Access-Control-Allow-Origin') === APP, 'Startseite: läuft (v4), mit CORS-Kopf');
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

  /* ---------- Mitteilungen (Version 3): KV-Speicher nachgebaut, Push-Dienst nachgebaut ---------- */
  const nodeCrypto = require('crypto');
  const ece = require('http_ece');
  const store = new Map();
  const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, String(v)); }, async delete(k) { store.delete(k); } };
  const env = { PUSH: KV };
  const preq = (op, body, key, e = env) => worker.fetch(new Request(W + '/push/' + op, { method: 'POST', headers: hdr({ 'Content-Type': 'application/json', ...(key ? { 'X-Push-Key': key } : {}) }), body: JSON.stringify(body || {}) }), e);
  const KEY = 'k' + 'A'.repeat(42), KEY2 = 'z' + 'B'.repeat(42);
  r = await worker.fetch(new Request(W + '/'), env);
  ok((await r.text()) === 'Protokoll-Weiterleitung läuft (v4) · Mitteilungen bereit', 'Startseite zeigt: Mitteilungen bereit (KV gebunden)');
  r = await preq('setup', {}, KEY, {});
  ok(r.status === 501 && (await r.json()).err === 'kv', 'Ohne KV-Speicher: 501 mit Hinweis');
  r = await worker.fetch(new Request(W + '/push/setup', { method: 'POST', headers: { Origin: 'https://fremd.example', 'X-Push-Key': KEY } }), env);
  ok(r.status === 403, 'Mitteilungen: fremder Ursprung abgelehnt');
  r = await preq('setup', {}, 'kurz');
  ok(r.status === 401, 'Ohne gültigen Geräte-Schlüssel: 401');
  r = await preq('setup', {}, KEY);
  const setup = await r.json();
  ok(r.status === 200 && /^[A-Za-z0-9_-]{87}$/.test(setup.pub) && setup.v === 4, 'Einrichten: VAPID-Schlüssel erzeugt, öffentlicher Teil (65 Byte) zurück');
  const cfg0 = JSON.parse(store.get('cfg'));
  ok(cfg0.jwk && cfg0.jwk.d && !store.get('cfg').includes(KEY), 'Im Speicher: privater Signier-Schlüssel, vom Geräte-Schlüssel nur der Prüfwert');
  r = await preq('setup', {}, KEY);
  ok((await r.json()).pub === setup.pub, 'Erneutes Einrichten mit demselben Gerät: gleicher Schlüssel');
  r = await preq('setup', {}, KEY2);
  ok(r.status === 403 && (await r.json()).err === 'fremd', 'Anderes Gerät: abgelehnt (Worker gehört schon zu einem Gerät)');
  r = await preq('schedule', { items: [] }, KEY2);
  ok(r.status === 403, 'Plan ändern nur mit dem Schlüssel des Geräts');
  // Abo des „iPhones“
  const ecdh = nodeCrypto.createECDH('prime256v1'); ecdh.generateKeys();
  const auth = nodeCrypto.randomBytes(16);
  const sub = { endpoint: 'https://web.push.apple.com/QGt-test-abo', keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } };
  r = await preq('subscribe', { sub: { ...sub, endpoint: 'https://evil.example/push' } }, KEY);
  ok(r.status === 400, 'Abo nur bei bekannten Push-Diensten (Apple, Google, Mozilla, Microsoft)');
  r = await preq('subscribe', { sub }, KEY);
  ok(r.status === 200 && JSON.parse(store.get('sub')).endpoint === sub.endpoint, 'Abo gespeichert');
  // Test-Mitteilung: Push-Dienst nachbauen, verschlüsselten Inhalt mit dem privaten Schlüssel des Abos öffnen
  const pushes = [];
  let pushStatus = 201;
  global.fetch = async (url, init) => { pushes.push({ url: String(url), init }); return new Response('', { status: pushStatus }); };
  const open = (p) => JSON.parse(ece.decrypt(Buffer.from(p.init.body), { version: 'aes128gcm', privateKey: ecdh, authSecret: auth }).toString('utf8'));
  r = await preq('test', { body: 'Hallo vom Test' }, KEY);
  ok(r.status === 200 && pushes.length === 1 && pushes[0].url === sub.endpoint, 'Test-Mitteilung an den Push-Dienst geschickt');
  const p0 = pushes[0];
  ok(p0.init.headers['Content-Encoding'] === 'aes128gcm' && p0.init.headers.TTL === '3600' && /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]{87}$/.test(p0.init.headers.Authorization), 'Kopfzeilen: aes128gcm, TTL, VAPID');
  const msg0 = open(p0);
  ok(msg0.title === 'Protokoll' && msg0.body === 'Hallo vom Test' && msg0.url === '#heute', 'Inhalt Ende-zu-Ende verschlüsselt und mit dem Abo-Schlüssel lesbar');
  const [h64, c64, s64] = p0.init.headers.Authorization.match(/t=([^,]+)/)[1].split('.');
  const claims = JSON.parse(Buffer.from(c64, 'base64url').toString());
  const pubRaw = Buffer.from(setup.pub, 'base64url');
  const pubKey = nodeCrypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: pubRaw.subarray(1, 33).toString('base64url'), y: pubRaw.subarray(33).toString('base64url') }, format: 'jwk' });
  const sigOk = nodeCrypto.verify('sha256', Buffer.from(h64 + '.' + c64), { key: pubKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s64, 'base64url'));
  ok(sigOk && claims.aud === 'https://web.push.apple.com' && claims.sub === 'https://argus100-agent.github.io/protokoll/' && claims.exp > Date.now() / 1000, 'VAPID-Token gültig signiert (aud = Push-Dienst, sub = App)');
  // Plan hochladen und Zeitplan laufen lassen
  const now = Date.now();
  const plan = [
    { at: now - 30 * 60000, title: 'Zu alt', body: 'nicht mehr schicken', tag: 'alt' },
    { at: now - 60000, title: 'Mittag: noch offen', body: 'Skyr, Leinsamen', tag: 'plan-mittag', url: '#ern' },
    { at: now + 10 * 60000, title: 'Koffein-Stopp um 14:15', body: 'Danach nur Wasser oder Tee.', tag: 'rh-stopp', url: '#licht' },
    { at: now + 5 * 86400000, title: 'Zu weit weg', tag: 'weit' },
    { at: now + 20 * 60000, title: '<b>' + 'x'.repeat(300), body: 'y'.repeat(900), tag: 'lang!!', url: 'javascript:alert(1)' },
  ];
  r = await preq('schedule', { items: plan }, KEY);
  const sj = await r.json();
  const sch = JSON.parse(store.get('sched'));
  ok(r.status === 200 && sj.n === 4 && sch.length === 4 && !sch.some((x) => x.title === 'Zu weit weg'), 'Plan gespeichert, mehr als 4 Tage voraus verworfen');
  const lang = sch.find((x) => x.tag === 'lang');
  ok(lang.title.length === 120 && lang.body.length === 600 && lang.url === '', 'Texte gekürzt, nur App-Links (#…) erlaubt');
  pushes.length = 0;
  await worker.scheduled({}, env, null);
  ok(pushes.length === 1 && open(pushes[0]).title === 'Mittag: noch offen' && pushes[0].init.headers.Topic === 'plan-mittag', 'Zeitplan: fällige Mitteilung verschickt, verpasste (über 20 Min.) übersprungen');
  await worker.scheduled({}, env, null);
  ok(pushes.length === 1, 'Nächster Lauf: nichts doppelt');
  r = await preq('status', {}, KEY);
  const st = await r.json();
  ok(st.sub && st.n === 2 && st.sent === 1 && !st.err && st.next > now, `Status: Abo da, ${st.n} geplant, ${st.sent} vom Zeitplan verschickt`);
  // Neuer Plan aus der App ersetzt den alten
  r = await preq('schedule', { items: [{ at: now - 1000, title: 'Jetzt', tag: 'neu' }] }, KEY);
  await worker.scheduled({}, env, null);
  ok(pushes.length === 2 && open(pushes[1]).title === 'Jetzt', 'Neuer Plan: wird beim nächsten Lauf verschickt');
  // Abo abgelaufen (410): wird gelöscht
  pushStatus = 410;
  r = await preq('schedule', { items: [{ at: now + 1000, title: 'Gleich', tag: 'gleich' }] }, KEY);
  await worker.scheduled({}, env, null);
  r = await preq('status', {}, KEY);
  const st2 = await r.json();
  ok(!st2.sub && st2.err === 'Abo abgelaufen' && !store.has('sub'), 'Abo abgelaufen (410): gelöscht, Status meldet es');
  r = await preq('test', {}, KEY);
  ok(r.status === 409, 'Test ohne Abo: 409');
  r = await preq('off', {}, KEY);
  ok(r.status === 200 && !store.has('sched'), 'Ausschalten löscht Abo und Plan');
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
