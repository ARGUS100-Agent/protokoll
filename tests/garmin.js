// Garmin Connect über die eigene Weiterleitung: Verbinden, Abruf, Zuordnung, Trainings, Gewohnheiten, Fehler, Datenschutz
// Antworten im Format der Garmin Personal API (Tageswerte v2 verschachtelt, Schlaf direkt, Body Battery [Zeit, Wert]).
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
const state = { keyOk: true, relayV1: false, score8: 84, steps8: 2345, calls: [] };
function fixtures(path, q) {
  if (path === '/sleep-service/sleep/dailySleep') {
    const d = q.get('date');
    if (d === '2026-11-08') {
      return { calendarDate: d, sleepTimeSeconds: 27000, deepSleepSeconds: 5400, lightSleepSeconds: 14400, remSleepSeconds: 7200, awakeSleepSeconds: 900, awakeCount: 1,
        sleepStartTimestampGMT: G('2026-11-07', '21:40'), sleepEndTimestampGMT: G('2026-11-08', '06:10'), sleepStartTimestampLocal: L('2026-11-07', '22:40'), sleepEndTimestampLocal: L('2026-11-08', '07:10'),
        averageRespirationValue: 14.4, averageSpO2Value: 95.0, avgSleepStress: 12.0, sleepScores: { overall: { value: state.score8, qualifierKey: 'GOOD' }, remPercentage: { value: 26 } },
        sleepNeed: { baseline: 480, actual: 490, feedback: 'INCREASED' } };
    }
    if (d === '2026-11-07') {
      return { calendarDate: d, sleepTimeSeconds: 24000, deepSleepSeconds: 4200, lightSleepSeconds: 13800, remSleepSeconds: 6000, awakeSleepSeconds: 1200,
        sleepStartTimestampGMT: G('2026-11-06', '22:30'), sleepEndTimestampGMT: G('2026-11-07', '05:10'), sleepStartTimestampLocal: L('2026-11-06', '23:30'), sleepEndTimestampLocal: L('2026-11-07', '06:10'),
        averageRespirationValue: 15.1, sleepScores: { overall: { value: 72 } }, sleepNeed: { actual: 480 } };
    }
    return null; // keine Nacht aufgezeichnet → 404
  }
  if (path === '/wellness-service/wellness/daily/spo2acclimation/2026-11-07') return { calendarDate: '2026-11-07', averageSpO2: 94, lowestSpO2: 88 };
  if (path.startsWith('/hrv-service/hrv/daily/')) {
    const base = { lowUpper: 48, balancedLow: 52, balancedUpper: 68, markerValue: 0.4 };
    return { hrvSummaries: [{ calendarDate: '2026-11-07', weeklyAvg: 58, lastNightAvg: 55, status: 'BALANCED', baseline: base }, { calendarDate: '2026-11-08', weeklyAvg: 59, lastNightAvg: 63, status: 'UNBALANCED', baseline: base }], userProfilePk: 1 };
  }
  if (path === '/usersummary-service/v2/dailysummaries') {
    return { data: [
      { calendarDate: '2026-11-07', heartRate: { restingValue: 50, minValue: 46, maxValue: 168 }, stress: { avgLevel: 31, restProportion: 0.42 }, bodyBattery: { minValue: 22, maxValue: 81 },
        respiration: { avgValue: 13.2 }, movement: { steps: { value: 11234, distanceInMeters: 8100 }, floorsAscended: { distanceInMeters: 36.6 } }, intensityMinutes: { moderate: 20, vigorous: 15 }, calories: { burnedTotal: 2790, burnedActive: 812 } },
      { calendarDate: '2026-11-08', heartRate: { restingValue: 48 }, stress: { avgLevel: -1 }, movement: { steps: { value: state.steps8 } }, intensityMinutes: { moderate: 0, vigorous: 0 }, calories: { burnedTotal: 900, burnedActive: 120 } },
    ] };
  }
  if (path === '/wellness-service/wellness/bodyBattery/reports/daily') {
    return [
      { date: '2026-11-07', charged: 58, drained: 66, bodyBatteryValuesArray: [[G('2026-11-07', '05:12'), 81], [G('2026-11-07', '12:00'), 55], [G('2026-11-07', '21:38'), 22], [G('2026-11-07', '23:00'), 35]],
        bodyBatteryActivityEvent: [{ eventType: 'SLEEP', bodyBatteryImpact: 48 }] },
      { date: '2026-11-08', charged: 60, drained: 6, bodyBatteryValuesArray: [[G('2026-11-08', '03:00'), 70], [G('2026-11-08', '06:12'), 86], [G('2026-11-08', '09:00'), 80]],
        bodyBatteryActivityEvent: [{ eventType: 'SLEEP', bodyBatteryImpact: 55 }, { eventType: 'ACTIVITY', bodyBatteryImpact: -5 }] },
    ];
  }
  if (path.startsWith('/weight-service/weight/range/')) {
    return { dailyWeightSummaries: [{ summaryDate: '2026-11-08', numOfWeightEntries: 1, latestWeight: { calendarDate: '2026-11-08', weight: 78450.0, sourceType: 'CHANGE_LOG' },
      allWeightMetrics: [{ calendarDate: '2026-11-08', weight: 78450.0, bodyFat: 17.8, sourceType: 'INDEX_SCALE', timestampGMT: G('2026-11-08', '06:30') }, { calendarDate: '2026-11-08', weight: 78450.0, sourceType: 'CHANGE_LOG', timestampGMT: G('2026-11-08', '06:31') }] }] };
  }
  if (path === '/activitylist-service/activities/search/activities') {
    return [
      { activityId: 9001, activityName: 'Lauf', startTimeLocal: '2026-11-07 08:05:00', activityType: { typeKey: 'running' }, distance: 8012.4, duration: 2712.3, averageSpeed: 2.954, averageHR: 148.6, maxHR: 172,
        averageRunningCadenceInStepsPerMinute: 171.4, activityTrainingLoad: 112.7, aerobicTrainingEffect: 3.24, anaerobicTrainingEffect: 1.1, trainingEffectLabel: 'TEMPO', avgPower: 285.4, avgStrideLength: 104.2,
        elevationGain: 85, calories: 640, hrTimeInZone_1: 300, hrTimeInZone_2: 1080, hrTimeInZone_3: 900, hrTimeInZone_4: 360, hrTimeInZone_5: 60, differenceBodyBattery: -12, vO2MaxValue: 52.0 },
      { activityId: 9002, startTimeLocal: '2026-11-07 17:30:00', activityType: { typeKey: 'strength_training' }, duration: 3900, averageHR: 112, maxHR: 151, activityTrainingLoad: 64.2, aerobicTrainingEffect: 2.1, trainingEffectLabel: 'BASE', calories: 420 },
      { activityId: 9003, startTimeLocal: '2026-11-06 19:00:00', activityType: { typeKey: 'indoor_cycling' }, duration: 1800, distance: 15000, averageHR: 130 },
      { activityId: 9004, startTimeLocal: '2026-11-08 07:40:00', activityType: { typeKey: 'walking' }, duration: 1500, distance: 2100 },
      { activityId: 9005, startTimeLocal: '2026-11-06 07:00:00', activityType: { typeKey: 'meditation' }, duration: 720 },
      { activityId: 9006, startTimeLocal: '2026-11-07 09:00:00', activityType: { typeKey: 'walking' }, duration: 2100, distance: 2900, averageSpeed: 1.38 },
    ];
  }
  if (path === '/activity-service/activity/9001') return { activityId: 9001, summaryDTO: { directWorkoutRpe: 60, directWorkoutFeel: 75, beginPotentialStamina: 98 } };
  if (path === '/activity-service/activity/9002') return { activityId: 9002, summaryDTO: { directWorkoutRpe: 80 } };
  if (path === '/activity-service/activity/9003') return { activityId: 9003, summaryDTO: {} };
  if (path === '/activity-service/activity/9006') return { activityId: 9006, summaryDTO: { directWorkoutRpe: 20 } };
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
    if (m === 'GET' && u.pathname === '/') return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'text/plain' }, body: `Protokoll-Weiterleitung läuft (v${state.relayV1 ? 1 : 2})` });
    if (state.relayV1 && u.pathname.startsWith('/activity-service/')) return route.fulfill({ status: 403, headers: { ...cors, 'Content-Type': 'text/plain' }, body: 'Weiterleitung: Pfad nicht erlaubt' });
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
  const H = (k) => ev((key) => { const d = peekDay(key); return d ? { h: d.health, gar: d.gar || {}, gx: d.gx || {}, tr: d.trainings || [], skip: d.gskip || [], habits: d.habits || {}, gh: d.gh || {}, ghOff: d.ghOff || [], hd: d.hd || {} } : null; }, k);

  // Vorher selbst eingetragen: Ruhepuls am 07.11. und das Gym-Training um 17:15 (Intensität 8)
  await ev(() => {
    mutDay('2026-11-07', (d) => { d.health.rhr = 52; d.trainings.push({ id: 'gym1', type: 'Oberkörper A', time: '17:15', dur: null, int: 8, load: null, note: '', gym: { day: 1, sched: 'A', ex: {} } }); });
  });

  /* ---------- Ohne Verbindung ---------- */
  await ev(() => { ui.date = todayKey(); go('garmin'); });
  let main = await page.textContent('#main');
  ok(main.includes('Garmin Connect verbinden'), 'Bereich Garmin zeigt „Garmin Connect verbinden“');
  ok(!main.includes('Mehr von Garmin') && !main.includes('Schlafbedarf') && !main.includes('Stockwerke'), 'Reine Garmin-Werte erst nach dem Verbinden');
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
  ok(await ev(() => GAR_RELAY_CODE.includes('personal.connectapi.garmin.com') && GAR_RELAY_CODE.includes('VERSION = 3') && GAR_RELAY_CODE.includes('async scheduled(') && !/ApiKey [A-Za-z0-9]{8,}/.test(GAR_RELAY_CODE)), 'Eingebetteter Code: Version 3 (Garmin + Mitteilungen), Garmin-Adresse, kein Schlüssel');

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

  /* ---------- Verbinden + erster Abruf (14 Tage) über eine alte Weiterleitung (v1) ---------- */
  state.calls = [];
  state.relayV1 = true;
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
  ok(state.calls.filter((c) => c.path.startsWith('/wellness-service/wellness/daily/spo2acclimation/')).map((c) => c.path.slice(-10)).join() === '2026-11-07', 'SpO2 nur dort eigens geholt, wo der Schlaf keinen Wert hat');
  ok(await ev(() => GAR.relayOld === true && !GAR.err), 'Alte Weiterleitung (v1): Abruf klappt trotzdem, Hinweis auf Version 2');

  let d8 = await H('2026-11-08');
  ok(d8.h.sleepScore === 84 && d8.h.sleepDur === 450 && d8.h.deep === 90 && d8.h.rem === 120 && d8.h.light === 240 && d8.h.awake === 15, 'Schlaf 08.11.: Score 84, 7:30 h, Phasen');
  ok(d8.h.bedTime === '22:40' && d8.h.wakeTime === '07:10', 'Eingeschlafen 22:40, aufgewacht 07:10 (Ortszeit)');
  ok(d8.h.sleepNeed === 490 && d8.h.sleepStress === 12 && d8.h.bbSleep === 55, 'Schlafbedarf 8:10 h, Stress im Schlaf 12, Body Battery im Schlaf +55');
  ok(d8.h.hrv === 63 && d8.h.hrvWeek === 59 && d8.h.hrvStatus === 'Unausgeglichen' && String(d8.gx.hrvBase) === '52,68', 'HRV 63, 7-Tage-Ø 59, Unausgeglichen, Normalbereich 52–68');
  ok(d8.h.rhr === 48 && d8.h.resp === 14.4 && d8.h.spo2 === 95 && d8.h.skinTemp == null, 'Ruhepuls 48 (Tageswerte v2), Atmung 14,4, SpO2 95, keine Hauttemperatur');
  ok(d8.h.bbMorning === 86, 'Body Battery morgens: Messpunkt am Aufwachen (86)');
  ok(d8.h.stress == null && d8.h.steps === 2345 && d8.h.intensity === 0 && d8.h.kcalAct === 120 && d8.h.kcalTot === 900, 'Stress −1 ignoriert, Schritte, Intensität, Kalorien aus Tageswerten v2');
  ok(d8.h.weight === 78.5 && d8.h.fat === 17.8 && (await ev(() => S.settings.profile.weight)) === 78.5, 'Waage: 78,5 kg und 17,8 % Körperfett, Profilgewicht aktualisiert');
  ok(d8.h.fitAge === 26.4, 'Fitnessalter 26,4');
  let d7 = await H('2026-11-07');
  ok(d7.h.rhr === 52, 'Selbst eingetragener Ruhepuls (52) bleibt, Garmin sagt 50');
  ok(d7.h.bbMorning === 81 && d7.h.bbEvening === 22 && d7.h.bbSleep === 48 && d7.h.bbCharged === 58 && d7.h.bbDrained === 66, 'Body Battery 07.11.: morgens 81, abends 22, Schlaf +48, geladen 58, verbraucht 66');
  ok(d7.h.steps === 11234 && d7.h.stress === 31 && d7.h.intensity === 50 && d7.h.floors === 12 && d7.h.spo2 === 94 && d7.h.vo2 === 52, '07.11.: Schritte, Stress 31, Intensität 20 + 2×15, 12 Stockwerke (36,6 m), SpO2 94, VO2max 52');
  ok(d7.h.sleepScore === 72 && d7.h.bedTime === '23:30' && d7.h.hrv === 55 && d7.h.hrvStatus === 'Ausgeglichen' && d7.h.sleepNeed === 480, '07.11.: Schlaf 72, 23:30, HRV 55, Schlafbedarf 8 h');
  ok(d7.gar.rhr === undefined && d7.gar.steps === 11234, 'Herkunft: Garmin-Werte markiert, eigener nicht');

  // Trainings (ohne Aktivitätsdetails, weil die alte Weiterleitung sie sperrt)
  let run = d7.tr.find((t) => t.gid === '9001');
  ok(run && run.type === 'Laufen' && run.time === '08:05' && run.dur === 45 && run.km === 8.01 && run.cad === 171 && run.load === 113 && run.hr === 149 && run.int == null, 'Lauf übernommen: 08:05, 45 Min., 8,01 km, Kadenz 171, Belastung 113, Ø 149 bpm');
  ok(run.g && run.g.te === 3.2 && run.g.tan === 1.1 && run.g.tel === 'TEMPO' && run.g.pace === 339 && run.g.pw === 285 && run.g.sl === 104 && run.g.up === 85 && run.g.hrmax === 172 && run.g.kcal === 640 && run.g.bb === -12 && String(run.g.z) === '300,1080,900,360,60', 'Lauf-Details: Trainingseffekt, Pace 5:39, Leistung, Schrittlänge, Höhenmeter, Puls max., kcal, Body Battery, Zonen');
  const gym = d7.tr.find((t) => t.id === 'gym1');
  ok(gym && gym.gid === '9002' && gym.dur === 65 && gym.load === 64 && gym.hr === 112 && gym.int === 8 && gym.time === '17:15' && gym.g.tel === 'BASE', 'Krafttraining ergänzt das eigene Gym-Training (keine Doppelung, Intensität 8 bleibt)');
  const walk7 = d7.tr.find((t) => t.gid === '9006');
  ok(walk7 && walk7.type === 'Spaziergang' && walk7.dur === 35 && d7.tr.length === 3, 'Spaziergang am 07.11. als Training');
  const d6 = await H('2026-11-06');
  ok(d6.tr.length === 1 && d6.tr[0].type === 'Rad' && d6.tr[0].km === 15 && d6.tr[0].dur === 30, 'Indoor-Cycling als Rad, Meditation nicht als Training');
  ok(d8.tr.length === 1 && d8.tr[0].type === 'Spaziergang' && d8.tr[0].time === '07:40', 'Spaziergang heute übernommen');
  ok(await ev(() => !peekDay('2026-10-30')), 'Tage ohne Garmin-Daten werden nicht angelegt');

  // Gewohnheiten, die die Uhr belegt
  ok(d6.habits.nsdr === true && d6.gh.nsdr === '9005', 'Meditation (12 Min.) auf der Uhr → „Meditation / NSDR“ abgehakt');
  ok(d7.habits.licht_morgen === true && d7.gh.licht_morgen === '9006' && d7.hd.lightMin === 30, 'Spaziergang 35 Min. um 09:00 → Morgenlicht + Spaziergang, 30 Min. draußen');
  ok(!d8.habits.licht_morgen, 'Spaziergang unter 30 Min. hakt nichts ab');

  // Oberfläche
  await ev(() => { ui.date = todayKey(); go('garmin'); });
  main = await page.textContent('#main');
  ok(main.includes('Zuletzt heute 09:00') && /\d+ Werte, 5 Trainings, 2 Gewohnheiten übernommen/.test(main), 'Statuskarte: Werte, 5 Trainings, 2 Gewohnheiten');
  ok(main.includes('Version 2') && main.includes('Code kopieren'), 'Statuskarte: Hinweis auf die neue Weiterleitung');
  ok((await page.$$('#main .gar-mark')).length >= 20 && main.includes('Mehr von Garmin') && main.includes('Schlafbedarf') && main.includes('normal 52–68 ms') && main.includes('Körperfett'), 'Uhr-Markierungen, Schlafbedarf, HRV-Normalbereich, Körperfett');
  ok(main.includes('Trainingsbereitschaft gibt Garmins Schnittstelle nicht heraus'), 'Hinweis Trainingsbereitschaft');
  ok(!main.includes('Hauttemperatur'), 'Hauttemperatur ausgeblendet (misst die Forerunner 265 nicht)');
  await page.clock.runFor(3000);
  await page.screenshot({ path: `${OUT}/g2-garmin.png`, fullPage: true });
  await ev(() => { ui.date = '2026-11-07'; go('licht'); });
  ok((await page.$('#main .tgl.is-on .gar-mark')) !== null, 'Licht: Morgenlicht mit Uhr-Symbol abgehakt');

  /* ---------- Neue Weiterleitung (v2): Details kommen nach, Eigenes bleibt ---------- */
  state.relayV1 = false;
  await ev(() => { ui.date = todayKey(); go('garmin'); });
  await page.fill('input[data-k="sleepScore"][data-date="2026-11-08"]', '90');
  await page.dispatchEvent('input[data-k="sleepScore"][data-date="2026-11-08"]', 'change');
  state.score8 = 85; state.steps8 = 4000; state.calls = [];
  await page.click('[data-a="gar-sync"]');
  await syncDone();
  d8 = await H('2026-11-08');
  ok(d8.h.sleepScore === 90 && d8.h.steps === 4000, 'Selbst geänderter Sleep Score (90) bleibt, Schritte aktualisiert (4000)');
  ok(!state.calls.some((c) => c.path.endsWith('/token')) && state.calls.filter((c) => c.path === '/sleep-service/sleep/dailySleep').length === 2, 'Zweiter Abruf: kein neuer Token-Tausch, nur gestern und heute');
  const detCalls = state.calls.filter((c) => c.path.startsWith('/activity-service/activity/')).map((c) => c.path.split('/').pop()).sort().join();
  ok(detCalls === '9001,9003,9004,9006', 'Aktivitätsdetails nur für Trainings ohne Intensität: ' + detCalls);
  d7 = await H('2026-11-07');
  run = d7.tr.find((t) => t.gid === '9001');
  ok(run.int === 6 && run.g.rpe === 60 && run.g.feel === 75 && run.g.det === 1, 'Lauf: Anstrengung 6/10 von der Uhr als Intensität, Gefühl „stark“');
  ok(d7.tr.find((t) => t.gid === '9006').int === 2 && d7.tr.find((t) => t.id === 'gym1').int === 8, 'Spaziergang Intensität 2, Gym bleibt bei deiner 8');
  ok(d7.tr.length === 3 && (await ev(() => GAR.relayOld)) === false, 'Keine doppelten Trainings, Hinweis auf alte Weiterleitung weg');
  state.calls = [];
  await ev(() => garSync({ days: 3 }));
  ok(!state.calls.some((c) => c.path.startsWith('/activity-service/activity/')), 'Details werden nicht erneut geholt');

  // Training-Sheet und Liste
  await ev(() => { ui.date = '2026-11-07'; ui.sub.train = 'heute'; go('train'); });
  main = await page.textContent('#main');
  ok(main.includes('Garmin') && main.includes('8,0 km') && main.includes('5:39 /km') && main.includes('Ø 149 bpm') && main.includes('Tempo'), 'Trainingsliste: Garmin, km, Pace, Puls, Trainingseffekt');
  await page.click(`[data-a="training-edit"][data-id="${run.id}"]`);
  const sh = await page.textContent('#sheet');
  ok(sh.includes('Von Garmin übernommen') && sh.includes('3,2 aerob') && sh.includes('Pulszonen') && sh.includes('Z2 18′') && sh.includes('285 W') && sh.includes('stark') && sh.includes('6/10'), 'Training-Sheet: Trainingseffekt, Zonen, Leistung, Gefühl, Anstrengung');
  ok((await page.$('[data-a="trs-int"][data-v="6"].is-on')) !== null, 'Intensität 6 im Sheet ausgewählt');
  await sleepMs(400);
  await page.screenshot({ path: `${OUT}/g3-training.png` });
  await ev(() => closeSheet());

  // Gelöschtes Garmin-Training kommt nicht wieder
  await ev(() => { ui.date = '2026-11-06'; go('train'); });
  const rid = (await H('2026-11-06')).tr[0].id;
  await page.click(`[data-a="training-edit"][data-id="${rid}"]`);
  await page.click('[data-a="trs-del"]');
  // Abgewählte Garmin-Gewohnheit bleibt abgewählt
  await ev(() => { ui.date = '2026-11-07'; go('licht'); });
  await page.click('[data-a="habit"][data-id="licht_morgen"]');
  await ev(() => garSync({ days: 5 }));
  const d6b = await H('2026-11-06'), d7b = await H('2026-11-07');
  ok(d6b.tr.length === 0 && d6b.skip.includes('9003'), 'Gelöschtes Garmin-Training wird nicht wieder geholt');
  ok(!d7b.habits.licht_morgen && d7b.ghOff.includes('licht_morgen') && d6b.habits.nsdr === true, 'Abgewählte Gewohnheit bleibt abgewählt, andere bleiben');

  // Wochenbericht an Frank enthält die neuen Werte
  const rep = await ev(() => frankReportText(weekStart(todayKey())));
  ok(rep.includes('Intensitätsminuten 50') && rep.includes('Schlafbedarf laut Garmin') && rep.includes('Body Battery im Schlaf') && rep.includes('HRV 7-Tage-Ø'), 'Wochenbericht: Intensitätsminuten, Schlafbedarf, Body Battery im Schlaf, HRV-Wochenschnitt');

  // Klassisches Garmin-Connect-Format wird ebenfalls gelesen
  const classic = await ev(() => {
    const k = '2026-11-01';
    const p = garParse([k], { sleep: { [k]: { dailySleepDTO: { sleepTimeSeconds: 25200, sleepScores: { overall: { value: 77 } } }, avgOvernightHrv: 60, restingHeartRate: 51 } },
      sum: [{ calendarDate: k, totalSteps: 9000, restingHeartRate: 50, averageStressLevel: 25, moderateIntensityMinutes: 10, vigorousIntensityMinutes: 5, bodyBatteryAtWakeTime: 77, activeKilocalories: 500, floorsAscended: 8 }] });
    return p.vals[k];
  });
  ok(classic.steps === 9000 && classic.rhr === 50 && classic.stress === 25 && classic.intensity === 20 && classic.bbMorning === 77 && classic.floors === 8 && classic.sleepScore === 77 && classic.hrv === 60, 'Klassisches Format (flach, dailySleepDTO) wird ebenso gelesen');

  /* ---------- Automatik ---------- */
  state.calls = [];
  await ev(() => garAuto());
  await syncDone();
  ok(state.calls.length === 0, 'Automatik: nicht öfter als alle 30 Minuten');
  await page.clock.fastForward(31 * 60000);
  await ev(() => garAuto());
  await syncDone();
  ok(state.calls.some((c) => c.path === '/usersummary-service/v2/dailysummaries'), 'Automatik: nach 31 Minuten neuer Abruf');

  // Nach einem Update mit neuen Feldern: einmal 30 Tage neu holen, danach wieder normal
  state.calls = [];
  await ev(() => { delete GAR.full; });
  await ev(() => garAuto());
  await syncDone();
  ok(state.calls.filter((c) => c.path === '/sleep-service/sleep/dailySleep').length === 30 && (await ev(() => GAR.full)) === 2, 'Neue Auswertung: einmal 30 Tage nachgeholt');
  state.calls = [];
  await ev(() => garAuto());
  ok(state.calls.length === 0, 'Danach wieder höchstens alle 30 Minuten');
  // Wochenrückblick zählt auch Krafttraining von Garmin („Gym (frei)“)
  const gymWeek = await ev(() => { mutDay('2026-11-04', (d) => { d.trainings.push({ id: 'gfrei', type: 'Gym (frei)', time: '15:17', dur: 109, gid: 'x1' }); }); return weekReview('2026-11-02').gymDone; });
  ok(gymWeek === 2, 'Wochenrückblick: Gym (frei) von Garmin zählt als Gym-Einheit (' + gymWeek + ')');

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
