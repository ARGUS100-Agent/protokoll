// Garmin Connect über die eigene Weiterleitung: Verbinden, Abruf, Zuordnung, Trainings, Fehler, Datenschutz
// Aufruf: Server auf Port 8766 (docs), dann: node tests/garmin.js <ausgabeordner>
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY = 'test-schluessel-1234567890abcdef';
const RELAY = 'https://relay.test';
const G = (d, hm) => Date.parse(`${d}T${hm}:00Z`); // GMT-Zeitpunkt
const L = (d, hm) => Date.parse(`${d}T${hm}:00Z`); // Garmin-„Local“ (Ortszeit als UTC kodiert)
const EXP = Math.floor(Date.parse('2026-11-09T09:00:00+01:00') / 1000);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const JWT = `${b64({ alg: 'HS256' })}.${b64({ exp: EXP, sub: 'x' })}.signatur`;

/* ---------- nachgebautes Garmin hinter der Weiterleitung ---------- */
const state = { keyOk: true, score8: 84, steps8: 2345, calls: [] };
function fixtures(path, q) {
  if (path === '/sleep-service/sleep/dailySleep') {
    const d = q.get('date');
    if (d === '2026-11-08') {
      return { dailySleepDTO: { calendarDate: d, sleepTimeSeconds: 27000, deepSleepSeconds: 5400, lightSleepSeconds: 14400, remSleepSeconds: 7200, awakeSleepSeconds: 900,
        sleepStartTimestampGMT: G('2026-11-07', '21:40'), sleepEndTimestampGMT: G('2026-11-08', '06:10'), sleepStartTimestampLocal: L('2026-11-07', '22:40'), sleepEndTimestampLocal: L('2026-11-08', '07:10'),
        averageRespirationValue: 14.4, averageSpO2Value: 95.0, avgSleepStress: 12.0, sleepScores: { overall: { value: state.score8, qualifierKey: 'GOOD' }, remPercentage: { value: 26 } } },
      avgOvernightHrv: 61.0, hrvStatus: 'BALANCED', restingHeartRate: 49, avgSkinTempDeviationC: -0.34, skinTempDataExists: true, sleepHeartRate: [{ value: 50, startGMT: 1 }] };
    }
    if (d === '2026-11-07') {
      return { dailySleepDTO: { calendarDate: d, sleepTimeSeconds: 24000, deepSleepSeconds: 4200, lightSleepSeconds: 13800, remSleepSeconds: 6000, awakeSleepSeconds: 1200,
        sleepStartTimestampGMT: G('2026-11-06', '22:30'), sleepEndTimestampGMT: G('2026-11-07', '05:10'), sleepStartTimestampLocal: L('2026-11-06', '23:30'), sleepEndTimestampLocal: L('2026-11-07', '06:10'),
        averageRespirationValue: 15.1, sleepScores: { overall: { value: 72 } } }, restingHeartRate: 51 };
    }
    return { dailySleepDTO: { calendarDate: d, sleepTimeSeconds: null } };
  }
  if (path.startsWith('/hrv-service/hrv/daily/')) return { hrvSummaries: [{ calendarDate: '2026-11-07', weeklyAvg: 58, lastNightAvg: 55, status: 'BALANCED' }, { calendarDate: '2026-11-08', weeklyAvg: 59, lastNightAvg: 63, status: 'UNBALANCED' }], userProfilePk: 1 };
  if (path === '/usersummary-service/v2/dailysummaries') {
    return { data: [
      { calendarDate: '2026-11-07', totalSteps: 11234, restingHeartRate: 50, averageStressLevel: 31, moderateIntensityMinutes: 20, vigorousIntensityMinutes: 15, bodyBatteryAtWakeTime: 81, activeKilocalories: 812, totalKilocalories: 2790, bodyBatteryChargedValue: 58, bodyBatteryDrainedValue: 66, averageSpo2: 94 },
      { calendarDate: '2026-11-08', totalSteps: state.steps8, restingHeartRate: 48, averageStressLevel: -1, moderateIntensityMinutes: 0, vigorousIntensityMinutes: 0, bodyBatteryAtWakeTime: null, activeKilocalories: 120, totalKilocalories: 900 },
    ] };
  }
  if (path === '/wellness-service/wellness/bodyBattery/reports/daily') {
    const desc = [{ bodyBatteryValueDescriptorIndex: 0, bodyBatteryValueDescriptorKey: 'timestamp' }, { bodyBatteryValueDescriptorIndex: 1, bodyBatteryValueDescriptorKey: 'bodyBatteryStatus' }, { bodyBatteryValueDescriptorIndex: 2, bodyBatteryValueDescriptorKey: 'bodyBatteryLevel' }, { bodyBatteryValueDescriptorIndex: 3, bodyBatteryValueDescriptorKey: 'bodyBatteryVersion' }];
    const p = (d, hm, v) => [G(d, hm), 'MEASURED', v, 2.0];
    return [
      { date: '2026-11-07', charged: 58, drained: 66, bodyBatteryValueDescriptorDTOList: desc, bodyBatteryValuesArray: [p('2026-11-07', '05:00', 79), p('2026-11-07', '05:15', 80), p('2026-11-07', '12:00', 55), p('2026-11-07', '21:30', 22), p('2026-11-07', '21:45', 23), p('2026-11-07', '23:00', 35)] },
      { date: '2026-11-08', charged: 60, drained: 6, bodyBatteryValueDescriptorDTOList: desc, bodyBatteryValuesArray: [p('2026-11-08', '03:00', 70), p('2026-11-08', '06:00', 86), p('2026-11-08', '06:15', 85), p('2026-11-08', '07:30', 80)] },
    ];
  }
  if (path.startsWith('/weight-service/weight/range/')) return { dailyWeightSummaries: [{ summaryDate: '2026-11-08', numOfWeightEntries: 1, latestWeight: { calendarDate: '2026-11-08', weight: 78450.0, sourceType: 'INDEX_SCALE' } }], totalAverage: { weight: 78450.0 } };
  if (path === '/activitylist-service/activities/search/activities') {
    return [
      { activityId: 9001, activityName: 'Lauf', startTimeLocal: '2026-11-07 08:05:00', activityType: { typeKey: 'running' }, distance: 8012.4, duration: 2712.3, averageHR: 148.6, averageRunningCadenceInStepsPerMinute: 171.4, activityTrainingLoad: 112.7, vO2MaxValue: 52.0 },
      { activityId: 9002, startTimeLocal: '2026-11-07 17:30:00', activityType: { typeKey: 'strength_training' }, duration: 3900, averageHR: 112, activityTrainingLoad: 64.2 },
      { activityId: 9003, startTimeLocal: '2026-11-06 19:00:00', activityType: { typeKey: 'indoor_cycling' }, duration: 1800, distance: 15000, averageHR: 130 },
      { activityId: 9004, startTimeLocal: '2026-11-08 07:40:00', activityType: { typeKey: 'walking' }, duration: 1500, distance: 2100 },
      { activityId: 9005, startTimeLocal: '2026-11-06 07:00:00', activityType: { typeKey: 'meditation' }, duration: 600 },
    ];
  }
  if (path.startsWith('/fitnessage-service/fitnessage/v2/')) return { chronologicalAge: 30, fitnessAge: 26.4, achievableFitnessAge: 25 };
  return null;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, timezoneId: 'Europe/Berlin', locale: 'de-DE' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/relay\.test|falsch\.test|Failed to load resource|ERR_FAILED|CORS/.test(m.text())) errors.push('console: ' + m.text()); });
  const cors = { 'Access-Control-Allow-Origin': 'http://localhost:8766', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Accept', 'Cache-Control': 'no-store' };
  await page.route('https://falsch.test/**', (r) => r.abort('failed'));
  await page.route(`${RELAY}/**`, async (route) => {
    const req = route.request(), u = new URL(req.url()), m = req.method();
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const auth = req.headers().authorization || '';
    state.calls.push({ m, path: u.pathname, q: u.search, auth });
    if (m === 'GET' && u.pathname === '/') return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'text/plain' }, body: 'Protokoll-Weiterleitung läuft (v1)' });
    if (m === 'POST' && u.pathname.endsWith('/personal-api-key/token')) {
      if (auth !== 'ApiKey ' + KEY || !state.keyOk) return route.fulfill({ status: 401, headers: cors, body: 'Unauthorized' });
      return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'text/plain' }, body: JWT });
    }
    if (auth !== 'Bearer ' + JWT) return route.fulfill({ status: 401, headers: cors, body: 'Unauthorized' });
    const body = fixtures(u.pathname, u.searchParams);
    if (body == null) return route.fulfill({ status: 404, headers: cors, body: '' });
    return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  });

  // Sonntag, 8. Nov. 2026, 09:00
  await page.clock.install({ time: new Date('2026-11-08T09:00:00+01:00') });
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  for (let i = 0; i < 20; i++) { await page.clock.runFor(500); if (await ev(() => !!(S.meta && document.body.classList.contains('ready')))) break; }
  const until = async (fn, msg) => { for (let i = 0; i < 100; i++) { if (await ev(fn)) return true; await sleepMs(100); } ok(false, 'Zeitüberschreitung: ' + msg); return false; };
  const syncDone = () => ev(async () => { if (garBusy) await garBusy.catch(() => {}); });
  const H = (k) => ev((key) => { const d = peekDay(key); return d ? { h: d.health, gar: d.gar || {}, tr: d.trainings || [], skip: d.gskip || [], training: d.training } : null; }, k);

  // Vorher selbst eingetragen: Ruhepuls am 07.11. und das Gym-Training um 17:15
  await ev(() => {
    mutDay('2026-11-07', (d) => { d.health.rhr = 52; d.trainings.push({ id: 'gym1', type: 'Oberkörper A', time: '17:15', dur: null, int: 8, load: null, note: '', gym: { day: 1, sched: 'A', ex: {} } }); });
  });

  /* ---------- Ohne Verbindung ---------- */
  await ev(() => { ui.date = todayKey(); go('garmin'); });
  ok((await page.textContent('#main')).includes('Garmin Connect verbinden'), 'Bereich Garmin zeigt „Garmin Connect verbinden“');
  ok(!(await page.textContent('#main')).includes('Mehr von Garmin'), 'Zusatzwerte erst nach dem Verbinden');
  await page.click('[data-a="gar-setup"]');
  ok((await page.textContent('#sheet')).includes('erscheint nur einmal') && (await page.$('a[href="https://connect.garmin.com/app/settings/personalApiToken"]')) !== null, 'Anleitung mit Link zu Garmin');
  await sleepMs(500);
  await page.screenshot({ path: `${OUT}/g1-einrichten.png` });

  // Code kopieren (Zwischenablage in der Testumgebung nicht erlaubt → Code wird angezeigt)
  await page.click('[data-a="gar-copy"]');
  await sleepMs(300);
  const shown = await ev(() => { const t = document.querySelector('.gar-code'); return t ? t.value : null; });
  const copied = await ev(() => document.querySelector('#toast').textContent);
  ok((shown && shown.includes("APP_ORIGIN = 'https://argus100-agent.github.io'") && shown.includes('export default')) || copied.includes('Code kopiert'), 'Code der Weiterleitung kopierbar oder sichtbar');
  ok(await ev(() => GAR_RELAY_CODE.includes('personal.connectapi.garmin.com') && !/ApiKey [A-Za-z0-9]{8,}/.test(GAR_RELAY_CODE)), 'Eingebetteter Code: Garmin-Adresse, kein Schlüssel');

  // Falsche Adresse
  await page.fill('#gar-url', 'https://falsch.test');
  await page.fill('#gar-key', KEY);
  await page.click('[data-a="gar-connect"]');
  await until(() => !!document.querySelector('#sheet .gar-err'), 'Fehlermeldung falsche Adresse');
  ok((await page.textContent('#sheet .gar-err')).includes('Weiterleitung nicht erreichbar'), 'Falsche Adresse: „Weiterleitung nicht erreichbar“');
  ok(await ev(() => GAR === null), 'Nichts gespeichert, solange es nicht klappt');
  ok((await page.inputValue('#gar-key')) === KEY, 'Eingaben bleiben im Formular');

  // Falscher Schlüssel
  await page.fill('#gar-url', 'relay.test/');
  await page.fill('#gar-key', 'falscher-schluessel-1234567890');
  await page.click('[data-a="gar-connect"]');
  await until(() => { const e = document.querySelector('#sheet .gar-err'); return e && e.textContent.includes('Schlüssel'); }, 'Fehlermeldung Schlüssel');
  ok((await page.textContent('#sheet .gar-err')).includes('Garmin lehnt den Schlüssel ab'), 'Falscher Schlüssel: verständliche Meldung');
  ok(await ev(() => GAR === null), 'Falscher Schlüssel wird nicht gespeichert');

  /* ---------- Verbinden + erster Abruf (14 Tage) ---------- */
  state.calls = [];
  await page.fill('#gar-key', KEY);
  await page.click('[data-a="gar-connect"]');
  await until(() => !!(GAR && GAR.last), 'erster Abruf');
  await syncDone();
  ok(await ev(() => GAR.url === 'https://relay.test' && GAR.key.length > 10 && !!GAR.token), 'Adresse ergänzt (https://), Schlüssel und Zugang gespeichert');
  const tokenCalls = state.calls.filter((c) => c.path.endsWith('/token'));
  ok(tokenCalls.length === 1 && tokenCalls[0].auth === 'ApiKey ' + KEY, 'Genau ein Token-Tausch mit dem Schlüssel');
  const sleepCalls = state.calls.filter((c) => c.path === '/sleep-service/sleep/dailySleep');
  ok(sleepCalls.length === 14 && state.calls.some((c) => c.q.includes('startDate=2026-10-26&endDate=2026-11-08')), 'Erster Abruf: 14 Tage (26.10.–08.11.)');
  ok(state.calls.filter((c) => !c.path.endsWith('/token') && c.path !== '/').every((c) => c.auth === 'Bearer ' + JWT), 'Datenabrufe mit Bearer-Zugang');

  let d8 = await H('2026-11-08');
  ok(d8.h.sleepScore === 84 && d8.h.sleepDur === 450 && d8.h.deep === 90 && d8.h.rem === 120 && d8.h.light === 240 && d8.h.awake === 15, 'Schlaf 08.11.: Score 84, 7:30 h, Phasen');
  ok(d8.h.bedTime === '22:40' && d8.h.wakeTime === '07:10', 'Eingeschlafen 22:40, aufgewacht 07:10 (Ortszeit)');
  ok(d8.h.hrv === 63 && d8.h.hrvStatus === 'Unausgeglichen', 'HRV aus der HRV-Übersicht (63, Unausgeglichen)');
  ok(d8.h.rhr === 48 && d8.h.resp === 14.4 && d8.h.spo2 === 95 && d8.h.skinTemp === -0.3, 'Ruhepuls 48, Atmung 14,4, SpO2 95, Hauttemperatur −0,3');
  ok(d8.h.bbMorning === 86, 'Body Battery morgens aus dem Verlauf beim Aufwachen (86)');
  ok(d8.h.stress == null && d8.h.steps === 2345 && d8.h.intensity === 0, 'Stress −1 ignoriert, Schritte 2345');
  ok(d8.h.weight === 78.5 && (await ev(() => S.settings.profile.weight)) === 78.5, 'Gewicht 78,45 kg → 78,5, Profilgewicht aktualisiert');
  ok(d8.h.fitAge === 26.4 && d8.h.kcalAct === 120, 'Fitnessalter 26,4 und aktive Kalorien');
  let d7 = await H('2026-11-07');
  ok(d7.h.rhr === 52, 'Selbst eingetragener Ruhepuls (52) bleibt, Garmin sagt 50');
  ok(d7.h.bbMorning === 81 && d7.h.bbEvening === 22, 'Body Battery 07.11.: morgens 81 (Tageswert), abends 22 (beim Einschlafen)');
  ok(d7.h.steps === 11234 && d7.h.stress === 31 && d7.h.intensity === 50 && d7.h.spo2 === 94 && d7.h.vo2 === 52, '07.11.: Schritte, Stress 31, Intensität 20 + 2×15 = 50, SpO2 aus Tageswerten, VO2max 52');
  ok(d7.h.sleepScore === 72 && d7.h.bedTime === '23:30' && d7.h.hrv === 55 && d7.h.hrvStatus === 'Ausgeglichen', '07.11.: Schlaf 72, 23:30, HRV 55');
  ok(d7.gar.rhr === undefined && d7.gar.steps === 11234, 'Herkunft: Garmin-Werte markiert, eigener nicht');

  // Trainings
  const run = d7.tr.find((t) => t.gid === '9001');
  ok(run && run.type === 'Laufen' && run.time === '08:05' && run.dur === 45 && run.km === 8.01 && run.cad === 171 && run.load === 113 && run.hr === 149 && run.int == null, 'Lauf übernommen: 08:05, 45 Min., 8,01 km, Kadenz 171, Belastung 113, Ø 149 bpm');
  const gym = d7.tr.find((t) => t.id === 'gym1');
  ok(gym && gym.gid === '9002' && gym.dur === 65 && gym.load === 64 && gym.hr === 112 && gym.int === 8 && gym.time === '17:15' && d7.tr.length === 2, 'Krafttraining ergänzt das eigene Gym-Training (keine Doppelung)');
  const d6 = await H('2026-11-06');
  ok(d6.tr.length === 1 && d6.tr[0].type === 'Rad' && d6.tr[0].km === 15 && d6.tr[0].dur === 30, 'Indoor-Cycling als Rad, Meditation nicht übernommen');
  ok(d8.tr.length === 1 && d8.tr[0].type === 'Spaziergang' && d8.tr[0].time === '07:40', 'Spaziergang heute übernommen');
  ok(await ev(() => !peekDay('2026-10-30')), 'Tage ohne Garmin-Daten werden nicht angelegt');

  // Oberfläche
  await ev(() => { ui.date = todayKey(); go('garmin'); });
  let main = await page.textContent('#main');
  ok(main.includes('Zuletzt heute 09:00') && /\d+ Werte, 4 Trainings übernommen/.test(main), 'Statuskarte: zuletzt heute 09:00, Werte und 4 Trainings');
  ok((await page.$$('#main .gar-mark')).length >= 15 && main.includes('Mehr von Garmin') && main.includes('Trainingsbereitschaft gibt Garmins Schnittstelle nicht heraus'), 'Uhr-Markierungen, Zusatzwerte, Hinweis Trainingsbereitschaft');
  await page.clock.runFor(3000);
  await page.screenshot({ path: `${OUT}/g2-garmin.png`, fullPage: true });
  await ev(() => { ui.date = '2026-11-07'; ui.sub.train = 'heute'; go('train'); });
  main = await page.textContent('#main');
  ok(main.includes('Garmin') && main.includes('8,0 km') && main.includes('Ø 149 bpm'), 'Trainingsliste: Garmin-Kennzeichen, km und Puls');
  await page.screenshot({ path: `${OUT}/g3-training.png`, fullPage: true });

  /* ---------- Zweiter Abruf: nur ab gestern, Zugang wiederverwendet, Eigenes bleibt ---------- */
  await ev(() => { ui.date = todayKey(); go('garmin'); });
  await page.fill('input[data-k="sleepScore"][data-date="2026-11-08"]', '90');
  await page.dispatchEvent('input[data-k="sleepScore"][data-date="2026-11-08"]', 'change');
  state.score8 = 85; state.steps8 = 4000; state.calls = [];
  await page.click('[data-a="gar-sync"]');
  await syncDone();
  d8 = await H('2026-11-08');
  ok(d8.h.sleepScore === 90 && d8.h.steps === 4000, 'Selbst geänderter Sleep Score (90) bleibt, Schritte aktualisiert (4000)');
  ok(!state.calls.some((c) => c.path.endsWith('/token')) && state.calls.filter((c) => c.path === '/sleep-service/sleep/dailySleep').length === 2, 'Zweiter Abruf: kein neuer Token-Tausch, nur gestern und heute');
  ok((await ev(() => S.days['2026-11-07'].trainings.length)) === 2, 'Keine doppelten Trainings beim zweiten Abruf');

  // Gelöschtes Garmin-Training kommt nicht wieder
  await ev(() => { ui.date = '2026-11-06'; go('train'); });
  const rid = (await H('2026-11-06')).tr[0].id;
  await page.click(`[data-a="training-edit"][data-id="${rid}"]`);
  ok((await page.textContent('#sheet')).includes('Von Garmin übernommen'), 'Training-Sheet: „Von Garmin übernommen“');
  await page.click('[data-a="trs-del"]');
  await ev(() => garSync({ days: 5 }));
  const d6b = await H('2026-11-06');
  ok(d6b.tr.length === 0 && d6b.skip.includes('9003'), 'Gelöschtes Garmin-Training wird nicht wieder geholt');

  /* ---------- Automatik ---------- */
  state.calls = [];
  await ev(() => garAuto());
  await syncDone();
  ok(state.calls.length === 0, 'Automatik: nicht öfter als alle 30 Minuten');
  await page.clock.fastForward(31 * 60000);
  await ev(() => garAuto());
  await syncDone();
  ok(state.calls.some((c) => c.path === '/usersummary-service/v2/dailysummaries'), 'Automatik: nach 31 Minuten neuer Abruf');

  /* ---------- Schlüssel abgelaufen ---------- */
  state.keyOk = false;
  await ev(() => { GAR.token = null; GAR.exp = null; ui.date = todayKey(); go('garmin'); });
  await page.click('[data-a="gar-sync"]');
  await syncDone();
  await ev(() => render());
  ok((await page.textContent('#main .gar-card')).includes('Garmin lehnt den Schlüssel ab'), 'Abgelaufener Schlüssel: Meldung in der Statuskarte');
  ok((await page.textContent('#toast')).includes('Schlüssel'), 'Abgelaufener Schlüssel: Hinweis beim manuellen Abruf');
  state.calls = [];
  await ev(() => garAuto());
  ok(state.calls.length === 0, 'Nach Fehler: 10 Minuten Pause für die Automatik');
  await page.screenshot({ path: `${OUT}/g4-fehler.png` });
  state.keyOk = true;

  /* ---------- Datenschutz: Schlüssel nicht im Backup, aber auf dem Gerät gespeichert ---------- */
  const bk = await ev(() => JSON.stringify(exportData()));
  ok(!bk.includes(KEY) && !bk.includes(JWT) && !bk.includes('relay.test') && bk.includes('"gar"'), 'Backup ohne Schlüssel, Zugang und Adresse (Herkunft der Werte schon)');
  ok(await ev(async () => { const all = await DB.getAll(); return !!(all.garmin && all.garmin.key && all.garmin.url); }), 'Schlüssel liegt nur im Gerätespeicher');
  ok(!(await page.content()).includes(KEY), 'Schlüssel steht nirgends im Seiteninhalt');

  /* ---------- Einstellungen + Trennen ---------- */
  await ev(() => { ui.setOpen = 'garmin'; go('set'); });
  ok((await page.textContent('#set-garmin')).includes('Garmin Connect') && (await page.$('#set-garmin [data-a="gar-sync"]')) !== null, 'Einstellungen: Abschnitt Garmin Connect');
  await page.click('#set-garmin [data-a="gar-setup"]');
  ok((await page.getAttribute('#gar-key', 'placeholder')).includes('gespeichert') && (await page.inputValue('#gar-key')) === '', 'Gespeicherter Schlüssel wird nicht angezeigt');
  await page.click('[data-a="gar-off"]');
  ok((await page.textContent('#sheet')).includes('Wirklich trennen?'), 'Trennen fragt nach');
  await page.click('[data-a="gar-off"]');
  ok(await ev(async () => { const all = await DB.getAll(); return GAR === null && !all.garmin; }), 'Getrennt: Schlüssel vom Gerät gelöscht');
  ok((await H('2026-11-08')).h.sleepScore === 90, 'Übernommene Werte bleiben nach dem Trennen');

  console.log(errors.length ? 'KONSOLENFEHLER:\n' + errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
