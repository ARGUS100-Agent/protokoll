// Mitteilungen (2.8.0): Einrichten, Plan, Hochladen, Versand über den echten Worker-Code (KV und Push-Dienst
// nachgebaut, Inhalt wird wie auf dem iPhone entschlüsselt), Service Worker, Klick, Kategorien, Ausschalten.
// Nur erfundene Daten. Aufruf: Server auf Port 8766 (docs), dann: node tests/push.js <ausgabeordner>
const fs = require('fs');
const path = require('path');
const nodeCrypto = require('crypto');
const ece = require('http_ece');
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
const APP = 'https://argus100-agent.github.io';
const WURL = 'https://protokoll-test.beispiel.workers.dev';
const T = (hm, d = '2026-11-10') => Date.parse(`${d}T${hm}:00+01:00`);

(async () => {
  /* ---------- Worker (echter Code) mit nachgebautem KV und Push-Dienst ---------- */
  const code = fs.readFileSync(path.join(__dirname, '../relay/garmin-relay.js'), 'utf8');
  const worker = (await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))).default;
  const store = new Map();
  const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, String(v)); }, async delete(k) { store.delete(k); } };
  const env = { PUSH: null }; // erst ohne Speicher
  const ecdh = nodeCrypto.createECDH('prime256v1'); ecdh.generateKeys();
  const auth = nodeCrypto.randomBytes(16);
  const pushes = [];
  global.fetch = async (url, init) => { pushes.push({ url: String(url), init }); return new Response('', { status: 201 }); };
  const open = (p) => JSON.parse(ece.decrypt(Buffer.from(p.init.body), { version: 'aes128gcm', privateKey: ecdh, authSecret: auth }).toString('utf8'));
  const sched = () => JSON.parse(store.get('sched') || '[]');
  const cron = async (at) => { const real = Date.now; Date.now = () => at; try { await worker.scheduled({}, env, null); } finally { Date.now = real; } };

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, timezoneId: 'Europe/Berlin', locale: 'de-DE' });
  await ctx.grantPermissions(['notifications'], { origin: 'http://localhost:8766' });
  await ctx.addInitScript(({ p256dh, authB64 }) => {
    Object.defineProperty(navigator, 'standalone', { get: () => true, configurable: true }); // wie die Home-Bildschirm-App
    const sub = { endpoint: 'https://web.push.apple.com/test-abo-1', toJSON() { return { endpoint: this.endpoint, keys: { p256dh, auth: authB64 } }; }, unsubscribe: async () => { window.__unsub = (window.__unsub || 0) + 1; return true; } };
    if (window.PushManager) {
      PushManager.prototype.subscribe = async function (o) { window.__keyLen = o && o.applicationServerKey ? new Uint8Array(o.applicationServerKey).length : 0; window.__subbed = true; return sub; };
      PushManager.prototype.getSubscription = async function () { return window.__subbed ? sub : null; };
    }
  }, { p256dh: ecdh.getPublicKey().toString('base64url'), authB64: auth.toString('base64url') });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 501/.test(m.text())) errors.push('console: ' + m.text()); }); // 501 = absichtlich ohne KV
  const calls = [];
  const cors = { 'Access-Control-Allow-Origin': 'http://localhost:8766', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Push-Key, Authorization, Accept', 'Cache-Control': 'no-store' };
  await page.route(`${WURL}/**`, async (route) => {
    const rq = route.request();
    if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const h = { ...rq.headers(), origin: APP };
    // Der Worker läuft in Node: „jetzt“ = die simulierte Uhr der Seite (sonst liegt der Testtag in der Vergangenheit)
    const pageNow = await page.evaluate(() => Date.now()).catch(() => Date.now());
    const real = Date.now; Date.now = () => pageNow;
    let res;
    try { res = await worker.fetch(new Request(rq.url(), { method: rq.method(), headers: h, body: rq.method() === 'POST' ? rq.postData() || '' : undefined }), env); } finally { Date.now = real; }
    calls.push(new URL(rq.url()).pathname);
    return route.fulfill({ status: res.status, headers: { ...cors, 'Content-Type': res.headers.get('Content-Type') || 'text/plain' }, body: Buffer.from(await res.arrayBuffer()) });
  });
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+01:00') });
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  for (let i = 0; i < 20; i++) { await page.clock.runFor(500); if (await ev(() => !!(S.meta && document.body.classList.contains('ready')))) break; }

  /* ---------- erfundene Daten: Rhythmus aus Garmin, Koffein, To-do, Wochenziel, Training ---------- */
  await ev(() => {
    for (let i = 1; i <= 21; i++) {
      const k = addDays('2026-11-10', -i), w = weekday(k) === 2 ? '06:30' : '07:30';
      mutDay(k, (d) => { d.health = { ...d.health, wakeTime: w, sleepNeed: 480 }; d.gar = { wakeTime: w, sleepNeed: 480 }; });
    }
    mutDay('2026-11-09', (d) => { d.caf = [{ id: 'c1', p: 'kaffee', n: 'Kaffee', mg: 90, t: '09:00' }]; });
    mutDay('2026-11-10', (d) => {
      d.health = { ...d.health, wakeTime: '07:05', sleepNeed: 480, steps: 12345 }; d.gar = { wakeTime: '07:05', sleepNeed: 480 };
      d.trainings = [{ id: 't1', type: 'Laufen', time: '08:00', dur: 40, int: 6 }];
      d.entries = [{ id: 'e1', food: 'banane', g: 120, meal: 'fruehstueck', t: Date.now() - 3600000 }];
    });
    S.settings.todos = [{ id: 'td1', t: 'Rezept abholen', date: '2026-11-10', done: false }];
    // 2.10: fester Koffein-Abstand und ohne die neuen Kategorien – die prüft tests/rhythmus.js
    S.settings.caf.mode = 'fix'; S.settings.push = { ...(S.settings.push || {}), cats: { habits: false, training: false } };
    for (const b of S.settings.plan) for (const it of b.items) if (it.id === 'n_paranuss') it.opt = true; // Selen-Lücke für den Tipp
    S.reviews['2026-11-09'] = { goals: [goalNorm({ area: 'koffein', title: 'Kein Koffein nach dem Stopp', metric: 'caf_stop', agg: 'days', cmp: '<=', value: 0, need: 6, when: 'stop-30', tip: 'Ab dem Stopp nur Wasser oder Tee.' }, 0)] };
    markDirty('settings'); markDirty('reviews'); invalidate(); go('heute');
  });
  await page.clock.runFor(500);

  /* ---------- Hinweis auf Heute, Einrichten ---------- */
  ok((await page.textContent('#main')).includes('Neu: Mitteilungen'), 'Heute: Hinweis „Neu: Mitteilungen“');
  await page.click('.push-hint [data-a="push-setup"]');
  ok((await page.textContent('#sheet')).includes('Speicher anlegen') && (await page.textContent('#sheet')).includes('* * * * *'), 'Anleitung: Worker v3, KV-Speicher „PUSH“, Cron jede Minute');
  await page.fill('#push-url', WURL + '/');
  await page.click('[data-a="push-connect"]');
  for (let i = 0; i < 30 && !(await page.$('#sheet .gar-err')); i++) { await page.clock.runFor(200); await page.waitForTimeout(30); }
  ok((await page.textContent('#sheet')).includes('Im Worker fehlt der Speicher'), 'Worker ohne KV: verständlicher Hinweis');
  env.PUSH = KV;
  await page.click('[data-a="push-connect"]');
  for (let i = 0; i < 20 && !(await page.textContent('#sheet')).includes('Weiterleitung verbunden'); i++) await page.clock.runFor(200);
  ok((await page.textContent('#sheet')).includes('Weiterleitung verbunden') && store.has('cfg'), 'Verbinden: Worker erzeugt Signier-Schlüssel, App merkt sich den öffentlichen Teil');
  const dev = await ev(() => ({ url: PUSH.url, keyLen: PUSH.key.length, pub: PUSH.pub, inBackup: JSON.stringify(exportData()).includes(PUSH.key) }));
  ok(dev.url === WURL && dev.keyLen === 43 && !dev.inBackup && JSON.parse(store.get('cfg')).pub === dev.pub, 'Geräte-Schlüssel zufällig (32 Byte), nur auf dem Gerät, nicht im Backup');
  for (let i = 0; i < 20 && !(await ev(() => !!pushReg)); i++) await page.waitForTimeout(200);
  await page.click('[data-a="push-enable"]');
  for (let i = 0; i < 40 && !(await ev(() => pushOn() && !!PUSH.last)); i++) { await page.clock.runFor(200); await page.waitForTimeout(50); }
  for (let i = 0; i < 20 && !pushes.length; i++) await page.waitForTimeout(100);
  ok((await ev(() => window.__keyLen)) === 65 && JSON.parse(store.get('sub')).endpoint === 'https://web.push.apple.com/test-abo-1', 'Erlauben: Abo mit dem VAPID-Schlüssel, beim Worker gespeichert');
  ok(pushes.length === 1 && open(pushes[0]).body.includes('Mitteilungen sind an'), 'Bestätigung als echte (verschlüsselte) Test-Mitteilung');
  await page.clock.runFor(500);
  ok((await page.textContent('#main')).includes('Neu: Mitteilungen') === false, 'Hinweis auf Heute verschwindet');

  /* ---------- Plan ---------- */
  let s = sched();
  const find = (re) => s.find((x) => re.test(x.title));
  const hm = (x) => (x ? new Date(x.at).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }) + (new Date(x.at).toISOString().slice(0, 10) === '2026-11-10' ? '' : ' +1') : '–');
  console.log('     Plan heute: ' + s.filter((x) => x.at < T('23:59')).map((x) => `${hm(x)} ${x.title}`).join(' | '));
  ok(s.length >= 10 && s.every((x) => x.at > T('10:00')), `${s.length} Mitteilungen geplant, keine in der Vergangenheit`);
  ok(hm(find(/^Noch offen: Mittag$/)) === '13:45' && find(/^Noch offen: Mittag$/).url === '#ern', 'Offene Posten: Mittag um 13:45 (45 Min. nach der Mahlzeit-Zeit)');
  ok(hm(find(/^Koffein-Stopp um 14:15$/)) === '14:00', 'Koffein-Stopp 14:15 (Schlafenszeit 22:15 − 8 Std.), Erinnerung 15 Min. vorher');
  ok(hm(find(/^Jetzt dran: Kein Koffein nach dem Stopp$/)) === '13:50', 'Wochenziel mit „stop-30“: 13:45, wegen Mittag-Erinnerung 5 Min. später');
  ok(hm(find(/^Wann musst du morgen raus\?$/)) === '20:15' && find(/^Wann musst du morgen raus/).url === '#rhythmus', 'Abends: „Wann musst du morgen raus?“ (2 Std. vor dem Schlafen)');
  ok(hm(find(/^Bildschirme weg$/)) === '21:15' && hm(find(/^Schlafenszeit 22:15$/)) === '22:05', 'Bildschirm-Pause 21:15, Schlafenszeit 22:15');
  const nutri = find(/(fehlt|fehlen) noch/);
  ok(nutri && hm(nutri) === '18:45' && /: \d/.test(nutri.body) && nutri.body.startsWith('Auch mit dem Rest deines Plans'), 'Nährstoffe vor dem Abendessen mit konkretem Tipp: ' + (nutri ? `${nutri.title} – ${nutri.body}` : '–'));
  const tips = await ev(() => buildTips('2026-11-10').filter((t) => t.kind === 'gap').map((t) => metaOf(t.key).n));
  ok(nutri && tips.slice(0, 3).every((n) => nutri.title.includes(n)), 'Gleiche Lücken wie unter Ernährung → Tipps: ' + tips.slice(0, 3).join(', '));
  const win = find(/^Heute geschafft$/);
  ok(win && hm(win) === '21:45' && win.body.includes('Laufen') && win.body.includes('12.345 Schritte'), 'Geschafft am Abend: ' + (win ? win.body : '–'));
  const tomorrow = s.filter((x) => x.at > T('00:00', '2026-11-11') && x.at < T('23:59', '2026-11-11'));
  ok(tomorrow.some((x) => x.title === 'To-do: Rezept abholen' && hm(x) === '07:30 +1' && x.body.startsWith('Überfällig')) && tomorrow.some((x) => x.title === 'Knie heute Morgen?' && hm(x) === '06:50 +1'), 'Morgen: überfälliges To-do und Knie-Morgencheck nach dem Aufstehen (Mittwoch wie meist 06:30)');
  ok(!s.some((x) => x.at > T('22:30') && x.at < T('06:30', '2026-11-11')), 'Stille Zeit zwischen Schlafenszeit und Aufstehen');

  /* ---------- Versand über den Zeitplan ---------- */
  pushes.length = 0;
  await cron(T('13:46'));
  ok(pushes.length === 1 && open(pushes[0]).title === 'Noch offen: Mittag', 'Zeitplan um 13:46: „Noch offen: Mittag“ verschickt');
  const m0 = open(pushes[0]);
  ok(m0.body.length > 5 && m0.url === '#ern' && pushes[0].init.headers.Topic === 'plan-mittag-11-10', 'Inhalt mit offenen Posten und Link in die Ernährung: ' + m0.body);
  await cron(T('13:47'));
  ok(pushes.length === 1, 'Kein zweites Mal');

  /* ---------- Service Worker zeigt die Mitteilung, Klick öffnet den Bereich ---------- */
  const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker'));
  const shown = await sw.evaluate(async () => {
    const got = []; // Headless-Chromium darf keine echten Mitteilungen zeigen: Aufruf mitschreiben
    self.registration.showNotification = (title, o) => { got.push([title, o.body, o.tag, o.data && o.data.url, o.icon]); return Promise.resolve(); };
    self.dispatchEvent(new PushEvent('push', { data: JSON.stringify({ title: 'Heute fehlt noch: Selen', body: 'Selen: 1 Paranuss', tag: 'nutri-11-10', url: '#ern' }) }));
    await new Promise((r) => setTimeout(r, 200));
    return got;
  });
  ok(shown.length === 1 && shown[0][0] === 'Heute fehlt noch: Selen' && shown[0][1] === 'Selen: 1 Paranuss' && shown[0][2] === 'nutri-11-10' && shown[0][3] === '#ern' && shown[0][4] === './icon-192.png', 'Service Worker zeigt die Mitteilung (Titel, Text, Tag, Link, Symbol)');
  await ev(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'nav', url: '#rhythmus' } })));
  await page.clock.runFor(300);
  ok((await page.textContent('#sheet')).includes('Wann musst du morgen raus?'), 'Klick auf „Wann musst du morgen raus?“ öffnet die Einstellung');
  await page.fill('#rh-wake', '08:00');
  await page.click('[data-a="rh-save"]');

  /* ---------- Änderungen in der App → neuer Plan ---------- */
  const tick = async (until) => { for (let i = 0; i < 40 && !until(); i++) { await page.clock.runFor(1000); await page.waitForTimeout(60); } };
  await ev(() => { const b = S.settings.plan.find((x) => x.id === 'mittag'); mutDay('2026-11-10', (d) => { for (const it of b.items) d.checks[it.id] = 1; }); render(); });
  await tick(() => !sched().some((x) => x.title === 'Noch offen: Mittag'));
  s = sched();
  if (process.env.DEBUG) console.log('     nach Änderung: ' + s.filter((x) => x.at < T('23:59')).map((x) => `${hm(x)} ${x.title}`).join(' | '));
  const heute = s.filter((x) => x.at < T('23:59'));
  ok(!heute.some((x) => x.title === 'Noch offen: Mittag') && !heute.some((x) => x.title === 'Wann musst du morgen raus?'), 'Mittag abgehakt, morgen 08:00 eingestellt → neuer Plan nach 20 Sek.');
  ok(hm(find(/^Schlafenszeit/)) === '23:35' && find(/^Schlafenszeit/).title === 'Schlafenszeit 23:45' && hm(find(/^Koffein-Stopp/)) === '15:30', 'Morgen 08:00 raus: Schlafenszeit 23:45 (Erinnerung 23:35), Koffein-Stopp 15:45');
  ok(hm(s.find((x) => x.title === 'Knie heute Morgen?')) === '08:20 +1', 'Morgen früh richtet sich nach „morgen raus 08:00“');
  // Kategorie aus
  await ev(() => { ui.setOpen = 'push'; go('set'); });
  await page.click('[data-a="push-cat"][data-id="rhythm"]');
  await tick(() => !sched().some((x) => /^Koffein-Stopp|^Bildschirme|^Schlafenszeit|^Morgenlicht/.test(x.title)));
  ok(!sched().some((x) => /^Koffein-Stopp|^Bildschirme|^Schlafenszeit|^Morgenlicht/.test(x.title)) && sched().some((x) => /^Noch offen/.test(x.title)), 'Tagesrhythmus abgewählt: diese Mitteilungen fallen weg, der Rest bleibt');
  ok((await page.textContent('#main')).includes('Mitteilungen an'), 'Einstellungen: Mitteilungen an, mit nächster Mitteilung');
  await page.screenshot({ path: `${OUT}/p1-einstellungen.png`, fullPage: true });
  // Plan ansehen, Test, Ausschalten
  await page.click('.push-card [data-a="push-setup"]');
  await page.click('[data-a="push-list"]');
  ok((await page.$$('#sheet .push-list .row')).length >= 5, 'Geplante Mitteilungen in der App ansehen');
  await page.screenshot({ path: `${OUT}/p2-sheet.png` });
  pushes.length = 0;
  await page.click('#sheet [data-a="push-test"]');
  for (let i = 0; i < 20 && !pushes.length; i++) { await page.clock.runFor(100); await page.waitForTimeout(50); }
  ok(pushes.length === 1 && open(pushes[0]).body.startsWith('Test'), 'Test-Mitteilung auf Knopfdruck');
  await page.click('[data-a="push-off"]');
  await page.click('[data-a="push-off"]');
  for (let i = 0; i < 40 && (store.has('sub') || (await ev(() => pushOn()))); i++) { await page.clock.runFor(100); await page.waitForTimeout(50); }
  ok(!store.has('sub') && !store.has('sched') && (await ev(() => !pushOn() && window.__unsub === 1)), 'Ausschalten: Abo beendet, Plan beim Worker gelöscht');

  /* ---------- fremdes Gerät ---------- */
  const r = await worker.fetch(new Request(WURL + '/push/setup', { method: 'POST', headers: { Origin: APP, 'X-Push-Key': 'x'.repeat(43) }, body: '{}' }), env);
  ok(r.status === 403, 'Ein zweites Gerät kann den Worker nicht übernehmen');
  console.log('     Aufrufe: ' + [...new Set(calls)].join(', '));
  console.log(errors.length ? 'KONSOLENFEHLER:\n' + errors.map((e) => JSON.stringify(e)).join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
