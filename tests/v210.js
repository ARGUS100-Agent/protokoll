// 2.10.0: Kraft-Autopilot, Gewohnheiten & Routinen, Kältebad, Handy, Barcode (Open Food Facts nachgebaut),
// Sonne/UV (Open-Meteo nachgebaut), Zahl am App-Symbol, Experimente, Frank-KI, Wochen-Agent und Morgen-Briefing
// über den echten Worker-Code (Claude und Garmin nachgebaut). Nur erfundene Daten.
// Aufruf: Server auf Port 8766 (docs), dann: node tests/v210.js <ausgabeordner>
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
const APP = 'https://argus100-agent.github.io';
const WURL = 'https://protokoll-test.beispiel.workers.dev';
(async () => {
  /* ---------- Worker mit KV, Claude, Garmin und Push-Dienst nachgebaut ---------- */
  const code = fs.readFileSync(path.join(__dirname, '../relay/garmin-relay.js'), 'utf8');
  const worker = (await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))).default;
  const store = new Map();
  const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, String(v)); }, async delete(k) { store.delete(k); } };
  const env = { PUSH: KV, ANTHROPIC_API_KEY: 'sk-test', GARMIN_KEY: 'garmin-test-key', AI_BUDGET_USD: '1' };
  const ai = { calls: [], next: [] }, pushes = [];
  global.fetch = async (url, init) => {
    const u = String(url);
    if (u.startsWith('https://api.anthropic.com/')) {
      const body = JSON.parse(init.body);
      ai.calls.push({ model: body.model, system: body.system || '', content: body.messages[0].content, key: init.headers['x-api-key'] });
      const text = ai.next.length ? ai.next.shift() : '{}';
      return new Response(JSON.stringify({ content: [{ type: 'text', text }], usage: { input_tokens: 2000, output_tokens: 800 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (u.includes('personal.connectapi.garmin.com')) {
      if (u.includes('/token')) return new Response(JSON.stringify({ access_token: 'eyJhbGciOiJub25lIn0.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url') + '.sig' }), { status: 200 });
      if (u.includes('dailySleep')) return new Response(JSON.stringify({ sleepTimeSeconds: 5 * 3600 + 40 * 60, sleepEndTimestampGMT: Date.now() - 3600000, sleepScores: { overall: { value: 58 } }, sleepNeed: { actual: 480 } }), { status: 200 });
      if (u.includes('hrv-service')) return new Response(JSON.stringify({ hrvSummaries: [{ lastNightAvg: 41 }] }), { status: 200 });
      return new Response('{}', { status: 200 });
    }
    pushes.push({ url: u, init });
    return new Response('', { status: 201 });
  };

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, timezoneId: 'Europe/Berlin', locale: 'de-DE' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  const cors = { 'Access-Control-Allow-Origin': 'http://localhost:8766', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Push-Key, Authorization, Accept' };
  await page.route(`${WURL}/**`, async (route) => {
    const rq = route.request();
    if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const pageNow = await page.evaluate(() => Date.now()).catch(() => Date.now());
    const real = Date.now; Date.now = () => pageNow;
    let res;
    try { res = await worker.fetch(new Request(rq.url(), { method: rq.method(), headers: { ...rq.headers(), origin: APP }, body: rq.method() === 'POST' ? rq.postData() || '' : undefined }), env); } finally { Date.now = real; }
    return route.fulfill({ status: res.status, headers: { ...cors, 'Content-Type': res.headers.get('Content-Type') || 'text/plain' }, body: Buffer.from(await res.arrayBuffer()) });
  });
  await page.route('https://world.openfoodfacts.org/**', (route) => {
    const u = route.request().url();
    if (u.includes('4000000000001')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 1, product: { product_name_de: 'Testriegel Kakao', brands: 'Testmarke', quantity: '45 g', product_quantity: 45, serving_quantity: 45, nova_group: 4, nutriments: { 'energy-kcal_100g': 410, proteins_100g: 30, fat_100g: 12, 'saturated-fat_100g': 5, carbohydrates_100g: 40, sugars_100g: 3, fiber_100g: 8, salt_100g: 0.5, calcium_100g: 0.2 } } }) });
    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ status: 0 }) });
  });
  await page.route('https://api.open-meteo.com/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ daily: { time: ['2026-11-11', '2026-11-12'], sunrise: ['2026-11-11T07:32', '2026-11-12T07:34'], sunset: ['2026-11-11T16:38', '2026-11-12T16:36'], uv_index_max: [1.2, 3.4] } }) }));
  // Mittwoch, 11. Nov. 2026, 15:00
  await page.clock.install({ time: new Date('2026-11-11T15:00:00+01:00') });
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const ready = async () => { for (let i = 0; i < 20; i++) { await page.clock.runFor(500); if (await ev(() => !!(S.meta && document.body.classList.contains('ready')))) break; } };
  await ready();
  const shot = (n) => page.screenshot({ path: `${OUT}/v210-${n}.png`, fullPage: true });

  /* ---------- 1. Kraft-Autopilot ---------- */
  const kx = await ev(() => {
    S.settings.gym.anchor = '2026-11-02'; S.settings.gym.first = 'A';
    const mk = (k, sched, sets) => mutDay(k, (d) => { d.trainings = d.trainings || []; d.trainings.push({ id: 't' + k, type: 'Oberkörper A', time: '17:00', dur: 70, done: true, gym: { day: 1, sched, ex: { g_schraeg_lh: { s: sets } } } }); });
    mk('2026-10-27', 'B', [{ w: 60, r: 10, d: 1 }, { w: 60, r: 10, d: 1 }, { w: 60, r: 9, d: 1 }]);
    mk('2026-11-02', 'A', [{ w: 70, r: 6, d: 1 }, { w: 70, r: 6, d: 1 }, { w: 70, r: 6, d: 1 }, { w: 70, r: 6, d: 1, rir: 1 }]);
    invalidate();
    const up = kxSuggest('g_schraeg_lh', 'A', false, '2026-11-09');
    const same = kxSuggest('g_schraeg_lh', 'B', false, '2026-11-09');
    mutDay('2026-11-09', (d) => { d.trainings = [{ id: 't9', type: 'Oberkörper A', time: '17:00', dur: 70, done: true, gym: { day: 1, sched: 'A', ex: { g_schraeg_lh: { s: [{ w: 72.5, r: 5, d: 1 }, { w: 72.5, r: 4, d: 1 }, { w: 72.5, r: 4, d: 1 }, { w: 72.5, r: 4, d: 1 }] } } } }]; });
    mutDay('2026-11-16', () => {});
    invalidate();
    const keep = kxSuggest('g_schraeg_lh', 'A', false, '2026-11-16');
    const sets = kxWeekSets('2026-11-09');
    return { up, same, keep, sets };
  });
  ok(kx.up.tag === 'up' && kx.up.w === 72.5 && kx.up.reps.join() === '5,5,5,5', 'Obergrenze 6 Wdh. in allen Sätzen → +2,5 kg (72,5 kg × 5)');
  ok(kx.same.w > 0 && kx.same.reps.join() === '10,10,10' && kx.same.tag === 'same', 'Schedule B: gleiches Gewicht, 1 Wdh. mehr im letzten Satz (60 kg × 10/10/10): ' + kx.same.why);
  ok(kx.keep.tag === 'same' && kx.keep.w === 72.5, 'Einmal unter der Untergrenze → Gewicht halten, nicht sofort runter');
  ok(kx.sets.Brust === 4 && kx.sets.Schultern === 2 && kx.sets.Trizeps === 2, 'Sätze pro Muskel: Brust 4, Hilfsmuskeln halb');
  const kx2 = await ev(() => {
    mutDay('2026-11-12', () => {});
    const t = getDay('2026-11-09').trainings[0]; t.gym.ex.g_schraeg_lh.s = t.gym.ex.g_schraeg_lh.s.map((s) => ({ ...s, r: 4 }));
    mutDay('2026-11-09', (d) => { d.trainings = [t]; });
    mutDay('2026-11-13', (d) => { d.trainings = [{ id: 't13', type: 'Oberkörper A', time: '17:00', dur: 70, done: true, gym: { day: 1, sched: 'A', ex: { g_schraeg_lh: { s: [{ w: 72.5, r: 4, d: 1 }, { w: 72.5, r: 4, d: 1 }, { w: 72.5, r: 3, d: 1 }, { w: 72.5, r: 4, d: 1 }] } } } }]; });
    invalidate();
    return kxSuggest('g_schraeg_lh', 'A', false, '2026-11-16');
  });
  ok(kx2.tag === 'down' && kx2.w === 70, 'Zweimal unter 5 Wdh. → 70 kg (−5 %, gerundet), saubere Ausführung');
  const kx3 = await ev(() => { mutDay('2026-11-13', (d) => { d.trainings = []; }); invalidate(); return kxSuggest('g_schraeg_lh', 'A', false, '2026-11-25'); });
  ok(kx3.w === 65 && kx3.extra.some((x) => x.includes('Pause')), 'Nach 16 Tagen Pause ~10 % leichter mit Hinweis');
  await ev(() => { S.settings.gym.deload = weekStart('2026-11-25'); });
  const kx4 = await ev(() => kxSuggest('g_schraeg_lh', 'A', false, '2026-11-25'));
  ok(kx4.sets === 3 && kx4.extra.some((x) => x.includes('Leichtere Woche')), 'Leichtere Woche: ein Satz weniger');
  await ev(() => { delete S.settings.gym.deload; });
  // Einheit mit Vorschlag und RIR
  await ev(() => { ui.date = todayKey(); A['gym-start']({ dataset: { day: '1', date: todayKey() } }); });
  await page.clock.runFor(300);
  ok((await page.textContent('#main')).includes('Vorschlag:') && !!(await page.$('[data-a="gym-rir"]')), 'Einheit: Vorschlag je Übung und RIR-Knopf je Satz');
  await page.click('[data-a="kx-apply"][data-ex="g_schraeg_lh"]'); await page.clock.runFor(200);
  await page.click('[data-a="gym-rir"][data-ex="g_schraeg_lh"][data-i="0"]'); await page.clock.runFor(200);
  const ses = await ev(() => { const t = curTraining(); return t.gym.ex.g_schraeg_lh.s; });
  ok(ses.length >= 3 && ses[0].w != null && ses[0].r != null && ses[0].rir === 1, 'Vorschlag übernommen, RIR 0–1 gesetzt');
  await shot('gym');
  await ev(() => { ui.gymSess = null; ui.sub.train = 'heute'; go('train'); });
  await page.clock.runFor(300);
  ok((await page.textContent('#main')).includes('Kraft-Autopilot') && (await page.textContent('#main')).includes('Sätze pro Muskel'), 'Training: Karte Kraft-Autopilot');

  /* ---------- 2. Gewohnheiten, Routinen, Kältebad, Handy ---------- */
  await ev(() => go('heute')); await page.clock.runFor(300);
  ok(!!(await page.$('#routinen')) && (await page.textContent('#routinen')).includes('Tagsüber'), 'Heute: Routinen-Karte');
  await ev(() => pushNav('#hq-warm-dusche')); await page.clock.runFor(200);
  ok((await page.textContent('#sheet')).includes('Warm geduscht?'), 'Mitteilung „#hq-warm-dusche“ öffnet die Ja/Nein-Abfrage');
  await page.click('[data-a="hab-yes"]'); await page.clock.runFor(200);
  ok(await ev(() => !!getDay(todayKey()).habits.warm_dusche), 'Gemacht → abgehakt');
  await ev(() => pushNav('#hq-todo-morgen')); await page.clock.runFor(200);
  await page.click('[data-a="hab-no"]'); await page.clock.runFor(200);
  ok(await ev(() => !getDay(todayKey()).habits.todo_morgen && getDay(todayKey()).hno.todo_morgen === true), 'Nicht gemacht → als „nein“ gespeichert');
  await ev(() => pushNav('#hq-handy')); await page.clock.runFor(200);
  await page.fill('#hd-screen', '02:10'); await page.fill('#hd-social', '25');
  await page.click('[data-a="handy-save"]'); await page.clock.runFor(200);
  ok(await ev(() => getDay(todayKey()).hd.screen === 130 && getDay(todayKey()).habits.handy === true), 'Bildschirmzeit 2:10 h, Social 25 Min. → unter dem Limit, abgehakt');
  const cold = await ev(() => {
    mutDay(todayKey(), (d) => { d.trainings = [{ id: 'tk', type: 'Oberkörper A', time: '12:00', dur: 60, done: true, gym: { day: 1, sched: 'A', ex: {} } }]; d.cold = [{ min: 3, t: '14:30' }]; });
    autoHabits(todayKey());
    return { free: coldFree(todayKey()), v: coldViolations(todayKey()).length, h: getDay(todayKey()).habits.kein_kalt };
  });
  ok(cold.free === 13 * 60 + 360 && cold.v === 1 && !cold.h, 'Kältebad 1,5 Std. nach dem Krafttraining → Regel verletzt (frei ab 19:00)');
  const st = await ev(() => { mutDay(todayKey(), (d) => { d.health = { ...d.health, steps: 9100 }; }); autoHabits(todayKey()); return getDay(todayKey()).habits.schritte; });
  ok(st === true, 'Schritte 9.100 ≥ 8.000 → hakt sich selbst ab');
  const rt = await ev(() => { const s = rtStep('block:schlaf', todayKey()); A['rt-step']({ dataset: { id: 'block:schlaf', date: todayKey() } }); return { before: s.done, after: rtStep('block:schlaf', todayKey()).done }; });
  ok(rt.before === false && rt.after === true, 'Routine-Schritt „Vor dem Schlafen“ hakt alle Posten des Blocks ab');
  await ev(() => { S.settings.push = { ...(S.settings.push || {}), cats: {} }; });
  const hp = await ev(() => pushPlan().filter((x) => new Date(x.at).getDate() === 11).map((x) => x.title + ' ' + x.url));
  ok(hp.some((x) => x.startsWith('Atemübung 5 Min.') && x.endsWith('#hq-atem')) && !hp.some((x) => x.startsWith('Zeit für die warme Dusche')), 'Mitteilungen: Atemübung mit Ja/Nein-Link, erledigte Dusche nicht mehr');
  await shot('heute');

  /* ---------- 3. Barcode (Open Food Facts) ---------- */
  await ev(() => sheetScan(todayKey())); await page.clock.runFor(200);
  await page.fill('#scan-code', '4000000000001');
  await page.click('[data-a="scan-manual"]');
  for (let i = 0; i < 20 && !(await ev(() => ui.sheet && ui.sheet.step === 'preview')); i++) { await page.clock.runFor(200); await page.waitForTimeout(50); }
  const sc = await ev(() => { const it = ui.sheet.items[0]; return { name: it.name, kcal: it.values.kcal, na: it.values.na, ca: it.values.ca, tags: it.tags, unit: it.unit, src: it.sources[0] }; });
  ok(sc.name === 'Testriegel Kakao (Testmarke)' && sc.kcal === 410 && sc.na === 200 && sc.ca === 200 && sc.tags.includes('upf') && /Portion/.test(sc.unit), 'Barcode → Open Food Facts → Vorschau (410 kcal, Natrium aus Salz, Kalzium in mg, NOVA 4 = upf, 1 Portion)');
  await page.click('[data-a="frank-save"][data-mode="entry"]'); await page.clock.runFor(200);
  ok(await ev(() => getDay(todayKey()).entries.some((e) => FOOD[e.food] && FOOD[e.food].n === 'Testriegel Kakao (Testmarke)' && Math.round(e.g) === 45)), 'Eingetragen: 45 g');
  await ev(() => sheetScan(todayKey())); await page.clock.runFor(100);
  await page.fill('#scan-code', '4000000000999'); await page.click('[data-a="scan-manual"]');
  for (let i = 0; i < 10; i++) { await page.clock.runFor(200); await page.waitForTimeout(30); }
  ok((await page.textContent('#scan-msg')).includes('nicht bekannt'), 'Unbekannter Barcode: Hinweis');
  await ev(() => closeSheet());

  /* ---------- 4. Sonne, UV, Zahl am App-Symbol ---------- */
  await ev(() => { S.settings.geo = { lat: 50.33, lon: 8.75 }; wxFetch(true); });
  for (let i = 0; i < 10 && !(await ev(() => !!wxDay('2026-11-11'))); i++) { await page.clock.runFor(200); await page.waitForTimeout(30); }
  const sun = await ev(() => ({ w: wxDay('2026-11-11'), light: lightAt('2026-11-11'), wake: rhythm('2026-11-11').wake, html: sunHTML('2026-11-12'), badge: badgeCount() }));
  ok(sun.w.sunrise === 452 && sun.light === Math.max(sun.wake + 30, 462), 'Sonnenaufgang 07:32 → Morgenlicht frühestens 07:42');
  ok(sun.html.includes('UV-Index 3,4') && sun.html.includes('Vitamin D'), 'UV ab 3 → Sonnenschutz-Hinweis; November → Vitamin-D-Hinweis');
  ok(Number.isInteger(sun.badge) && sun.badge > 0, 'Zahl am App-Symbol: ' + sun.badge + ' offene, fällige Dinge');

  /* ---------- 5. Experimente ---------- */
  const ex = await ev(() => {
    expStart('dusche', 14);
    const e = S.settings.exp;
    const ks = Object.keys(e.plan).sort();
    // erfundene Nächte: mit warmer Dusche besser
    for (const k of ks) { mutDay(k, (d) => { if (e.plan[k] === 'A') d.habits.warm_dusche = true; else delete d.habits.warm_dusche; }); mutDay(addDays(k, 1), (d) => { d.health = { ...d.health, sleepScore: e.plan[k] === 'A' ? 84 + (k.charCodeAt(9) % 3) : 74 + (k.charCodeAt(9) % 3), deep: 90, hrv: 60 }; }); }
    const pairs = ks.length / 2, balanced = [...Array(pairs).keys()].every((i) => e.plan[ks[2 * i]] !== e.plan[ks[2 * i + 1]]);
    invalidate();
    return { n: ks.length, balanced, start: e.start };
  });
  ok(ex.n === 14 && ex.balanced, 'Experiment: 14 Tage, paarweise zufällig A/B');
  const exr = await ev(async () => { const real = Date.now; const e = S.settings.exp; const end = addDays(e.start, 15); const r = expResult({ ...e, plan: e.plan }); return { r, end }; });
  // Ergebnis nach Ablauf (simulierte Uhr vorstellen)
  await page.clock.setSystemTime(new Date('2026-11-27T10:00:00+01:00'));
  const exr2 = await ev(() => { invalidate(); const r = expResult(S.settings.exp); const s = r.res.find((x) => x.m === 'sleepScore'); return { done: r.done, diff: s.diff, verdict: s.verdict, html: expHTML() }; });
  ok(exr2.done && Math.abs(exr2.diff - 10) <= 2 && exr2.verdict === 'besser' && exr2.html.includes('Sleep Score'), 'Auswertung: Sleep Score ~+10 mit warmer Dusche → „besser“ (' + JSON.stringify({ done: exr2.done, diff: exr2.diff, v: exr2.verdict }) + ')');
  await ev(() => A['exp-end']()); await page.clock.runFor(200);
  ok(await ev(() => !S.settings.exp && S.settings.expHist.length === 1), 'Experiment abgeschlossen und gespeichert');
  await page.clock.setSystemTime(new Date('2026-11-11T15:30:00+01:00'));

  /* ---------- 6. Frank-KI, Wochen-Agent, Briefing (Worker v4) ---------- */
  await ev(async (u) => {
    PUSH = { url: u, key: 'k'.repeat(43), on: true, pub: 'x' };
    await pushCall('setup', {});
  }, WURL);
  await ev(() => aiRefresh(true));
  ok(await ev(() => aiOn() && AIST.v === 4 && AIST.garmin === true), 'Worker v4: KI und Garmin im Hintergrund aktiv');
  ai.next.push('```json\n{"app":"protokoll-frank","v":1,"items":[{"name":"Rührei mit Brot","eaten":{"amount":250,"unit":"g"},"meal":"fruehstueck","values":{"kcal":180,"p":11,"f":11,"c":9,"vd":1.1,"se":18},"estimated":["vd","se"]}]}\n```');
  await ev(() => { sheetFrank('', todayKey()); }); await page.clock.runFor(100);
  ok(!!(await page.$('[data-a="frank-ai"]')), 'Frank-Sheet: „Direkt in der App“');
  await page.fill('#frank-q', '3 Eier Rührei mit einer Scheibe Brot');
  await page.click('[data-a="frank-ai"]');
  for (let i = 0; i < 20 && !(await ev(() => ui.sheet && ui.sheet.step === 'preview')); i++) { await page.clock.runFor(200); await page.waitForTimeout(50); }
  ok(await ev(() => ui.sheet.step === 'preview' && ui.sheet.items[0].name === 'Rührei mit Brot' && ui.sheet.items[0].amt === 250), 'Text → Claude (Haiku) → Vorschau Rührei 250 g');
  ok(ai.calls[0].model === 'claude-haiku-5-5' && ai.calls[0].key === 'sk-test' && ai.calls[0].system.includes('pro 100 g'), 'Aufruf über den Worker: Haiku 5.5, Schlüssel nur im Worker');
  ok(await ev(() => !JSON.stringify(localStorage).includes('sk-test') && !JSON.stringify(exportData()).includes('sk-test')), 'API-Schlüssel nirgends in der App');
  await ev(() => closeSheet());
  // Wochen-Agent über den Worker (Sonntag 19:10)
  await page.clock.setSystemTime(new Date('2026-11-15T19:00:00+01:00'));
  const wk = await ev(async () => { invalidate(); const p = agentPayload(); await pushSync(true); return { ws: p && p.ws, has: !!p && p.report.includes('Einstellbare Werte') }; });
  ok(wk.ws === '2026-11-09' && wk.has && JSON.parse(store.get('weekin')).ws === '2026-11-09', 'Sonntag: Wochenbericht + einstellbare Werte zum Worker hochgeladen');
  ai.next.push('```json\n' + JSON.stringify({ review: { good: ['Protein im Ziel'], work: ['Schlaf'], more: [], less: [], tips: ['Früher ins Bett'] }, goals: [{ area: 'schlaf', title: '5 Nächte im Schlaffenster', metric: 'rh_win', agg: 'days', cmp: '>=', value: 1, need: 5, why: 'Regelmäßigkeit', tip: 'Wecker für die Bettzeit' }, { area: 'ern', title: 'Ballaststoffe ab 40 g', metric: 'fib', agg: 'days', cmp: '>=', value: 40, need: 5 }, { area: 'training', title: '3 Gym-Einheiten', metric: 'gym', agg: 'sum', cmp: '>=', value: 3 }], changes: [{ key: 'p.lo', value: 500, why: 'zu hoch, wird begrenzt' }, { key: 'sauna.goal', value: 75, why: 'Sauna lief gut' }, { key: 'habit.atem', value: 'off', why: 'nie gemacht' }, { key: 'evil', value: 1 }], experiment: { id: 'mg_abend' }, deload: false, message: 'Starke Woche. Jetzt den Schlaf festziehen.' }) + '\n```');
  const real = Date.now; Date.now = () => Date.parse('2026-11-15T19:10:00+01:00');
  try { await worker.scheduled({}, env, null); } finally { Date.now = real; }
  ok(JSON.parse(store.get('weekout') || '{}').ws === '2026-11-09' && pushes.some((p) => p.url.includes('push.apple.com') || p.url.includes('test-abo')) !== undefined, 'Cron Sonntag 19:10: Wochen-Agent (Sonnet) ausgewertet und gespeichert');
  ok(ai.calls[ai.calls.length - 1].model === 'claude-sonnet-5-5', 'Wochen-Agent nutzt Sonnet 5.5');
  await ev(() => { agentChecked = 0; agentCheck(); });
  for (let i = 0; i < 20 && !(await ev(() => !!(S.reviews['2026-11-09'] && S.reviews['2026-11-09'].agent))); i++) { await page.clock.runFor(200); await page.waitForTimeout(50); }
  const ag = await ev(() => ({ a: S.reviews['2026-11-09'].agent, goals: (S.reviews['2026-11-16'] || {}).goals || [], p: S.settings.targets.p.lo, sauna: S.settings.sauna.goal, off: S.settings.habitsOff.includes('atem'), exp: S.settings.exp && S.settings.exp.id, w: Number(S.settings.profile.weight) || 85 }));
  ok(ag.goals.length === 3 && ag.goals[0].metric === 'rh_win', 'Agent: 3 Wochenziele für die neue Woche (u. a. Nächte im Schlaffenster)');
  ok(ag.p === Math.round(ag.w * 2.4) && ag.sauna === 75 && ag.off && ag.exp === 'mg_abend', 'Agent: Änderungen automatisch, aber begrenzt (Eiweiß auf 2,4 g/kg gedeckelt), unbekannte Schlüssel ignoriert, Experiment gestartet');
  ok(ag.a.changes.length === 4 && ag.a.msg.includes('Starke Woche'), 'Agent: 4 Änderungen protokolliert mit Nachricht');
  await ev(() => { ui.reviewWeek = '2026-11-09'; ui.sub.woche = 'rueckblick'; go('woche'); }); await page.clock.runFor(300);
  ok((await page.textContent('#main')).includes('Wochen-Agent') && (await page.textContent('#main')).includes('Sauna pro Woche: 60 → 75'), 'Rückblick zeigt die Änderungen');
  await shot('agent');
  const ui1 = await ev(() => { const i = S.reviews['2026-11-09'].agent.changes.findIndex((c) => c.key === 'sauna.goal'); agentUndo('2026-11-09', i); return S.settings.sauna.goal; });
  ok(ui1 === 60, 'Rückgängig: Sauna-Ziel wieder 60');
  // Morgen-Briefing: Montag 07:30, Garmin meldet 5:40 h
  await page.clock.setSystemTime(new Date('2026-11-16T07:00:00+01:00'));
  await ev(async () => { invalidate(); await pushSync(true); });
  const ctxs = JSON.parse(store.get('ctx') || '{}');
  ok(ctxs.days && ctxs.days['2026-11-16'] && Array.isArray(ctxs.days['2026-11-16'].stops), 'Kontext fürs Briefing hochgeladen (Koffein-Stopps, Schlafenszeit, Gym)');
  const ecdh = require('crypto').createECDH('prime256v1'); ecdh.generateKeys();
  store.set('sub', JSON.stringify({ endpoint: 'https://web.push.apple.com/test-abo-1', keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: require('crypto').randomBytes(16).toString('base64url') } }));
  const before = pushes.length;
  Date.now = () => Date.parse('2026-11-16T07:30:00+01:00');
  try { await worker.scheduled({}, env, null); } finally { Date.now = real; }
  const br = JSON.parse(store.get('brief') || '{}');
  ok(br.date === '2026-11-16' && br.slept === 340 && pushes.length > before, 'Morgen-Briefing 07:30: Schlaf 5:40 h von Garmin, Mitteilung verschickt');
  Date.now = () => Date.parse('2026-11-16T07:40:00+01:00');
  const n2 = pushes.length;
  try { await worker.scheduled({}, env, null); } finally { Date.now = real; }
  ok(pushes.length === n2, 'Briefing nur einmal pro Tag');
  // Budget
  store.set('ai', JSON.stringify({ m: '2026-11', usd: 1.2, n: 50 }));
  const bud = await ev(async () => { try { await aiAsk({ content: [{ type: 'text', text: 'Hallo' }] }); return 'ok'; } catch (e) { return e.message; } });
  ok(/Budget/i.test(bud), 'Monatsbudget erreicht → Worker lehnt ab: ' + bud);

  ok(!errors.length, errors.length ? errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.log('ABBRUCH', e); process.exit(1); });
