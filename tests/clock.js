// Tests mit simulierter Uhr: Timer-Automatik, Sonntag, Phasenwechsel
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, timezoneId: 'Europe/Berlin', locale: 'de-DE' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  // Sonntag, 8. Nov. 2026, 17:10
  await page.clock.install({ time: new Date('2026-11-08T17:10:00+01:00') });
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  await page.clock.runFor(1500);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  ok((await ev(() => todayKey())) === '2026-11-08', 'Simulierter Sonntag');
  ok(await page.isVisible('.sunday'), 'Sonntags-Check sichtbar');
  ok((await page.textContent('#main')).includes('Dein Wochenrückblick ist fertig'), 'Rückblick-Karte am Sonntagabend');
  await page.fill('.sunday [data-c="health"][data-k="weight"]', '82,1');
  await page.dispatchEvent('.sunday [data-c="health"][data-k="weight"]', 'change');
  await page.clock.runFor(300);
  ok((await ev(() => getDay(todayKey()).health.weight)) === 82.1, 'Gewicht im Sonntags-Check gespeichert');
  ok((await page.textContent('.sunday')).includes('82,1 kg eingetragen'), 'Sonntags-Check aktualisiert sich');
  await page.screenshot({ path: `${OUT}/c01-sonntag.png`, fullPage: true });

  // Timer mit echten Haltezeiten
  await ev(() => go('knie'));
  await page.click('[data-a="timer-start"][data-r="taeglich"]');
  const st = () => ev(() => ({ i: ui.timer.i, ph: ui.timer.phase, ex: timerCur().ex, side: timerCur().side, sec: timerCur().sec, clock: ($('#tm-clock') || {}).textContent }));
  ok((await st()).ph === 'prep', 'Start mit 5 Sek. Vorbereitung');
  await page.clock.runFor(5300);
  let s = await st();
  ok(s.ph === 'run' && s.ex === 'r_wade' && s.side === 'L' && s.sec === 60, 'Waden links 60 Sek. läuft');
  await page.clock.runFor(30000);
  s = await st();
  ok(s.ph === 'run' && Number(s.clock) <= 31 && Number(s.clock) >= 29, 'Nach 30 Sek. zeigt die Uhr ' + s.clock);
  await page.screenshot({ path: `${OUT}/c02-timer-run.png` });
  // Pause hält die Zeit an
  await page.click('[data-a="tm-pause"]');
  await page.clock.runFor(20000);
  s = await st();
  ok(s.ph === 'run' && Number(s.clock) >= 29, 'Pause hält die Zeit an (' + s.clock + ')');
  await page.click('[data-a="tm-pause"]');
  await page.clock.runFor(31000);
  s = await st();
  ok(s.ph === 'switch' && s.side === 'R', 'Automatischer Seitenwechsel nach rechts');
  await page.clock.runFor(5300);
  s = await st();
  ok(s.ph === 'run' && s.side === 'R' && s.sec === 75, 'Rechts 75 Sek. (15 Sek. länger)');
  await page.clock.runFor(76000);
  s = await st();
  ok(s.ph === 'trans' && s.ex === 'r_beinbeuger', 'Übergang zur nächsten Übung: ' + s.ex);
  await page.screenshot({ path: `${OUT}/c03-timer-trans.png` });
  // Hintergrund-Simulation: viel Zeit vergeht
  await page.clock.runFor(600000);
  s = await st();
  console.log('     nach 10 Min. ohne Eingriff: Schritt ' + s.i + ' ' + s.ph + ' ' + s.ex);
  ok(s.i >= 6, 'Timer läuft selbstständig weiter');
  // bis zum Ende tippen
  for (let n = 0; n < 40; n++) { if ((await ev(() => ui.timer.phase)) === 'done') break; await page.click('[data-a="tm-next"] >> nth=0'); }
  ok((await ev(() => ui.timer.phase)) === 'done', 'Routine beendet');
  await page.click('[data-a="tm-rate"][data-ex="d_hueftbeuger"][data-v="4"]');
  await page.click('[data-a="tm-save"]');
  const sess = await ev(() => getDay(todayKey()).knee.sess[0]);
  ok(sess.r === 'taeglich' && sess.complete && sess.rate.d_hueftbeuger === 4 && sess.act > 100, `Gespeichert: aktiv ${sess.act} Sek., Zug-Bewertung gespeichert`);
  ok((await ev(() => dayDone(todayKey()).mob)), 'Mobilität zählt als erledigt');

  // Phasenwechsel-Check: Woche 4
  await ev(() => { S.settings.knee.start = addDays(todayKey(), -22); S.settings.knee.phase = 1; markDirty('settings'); invalidate(); });
  let g = await ev(() => phaseGate());
  ok(g && !g.ready && g.reasons.length >= 1, 'Woche 4 ohne Test: noch nicht bereit (' + g.reasons.join('; ') + ')');
  await ev(() => { S.knee.tests.push({ id: 'x', date: todayKey(), sdL: true, sdR: true }); for (let i = 0; i < 10; i++) mutDay(addDays(todayKey(), -i), (d) => { d.knee = d.knee || {}; d.knee.am = 2; }); invalidate(); });
  g = await ev(() => phaseGate());
  ok(g && g.ready, 'Step-down stabil + Schmerz ≤ 3 → bereit für Phase 2');
  await ev(() => { mutDay(addDays(todayKey(), -3), (d) => { d.knee.am = 5; }); });
  g = await ev(() => phaseGate());
  ok(g && !g.ready && g.maxP === 5, 'Schmerz 5/10 in 2 Wochen → Phase verlängern');
  await ev(() => { ui.sub.knie = 'kraft'; go('knie'); });
  await page.screenshot({ path: `${OUT}/c04-gate.png`, fullPage: true });
  await page.click('[data-a="knee-phase-ext"]');
  g = await ev(() => phaseGate());
  ok(g === null, 'Nach Verlängerung kein Wechsel-Hinweis mehr in dieser Woche');
  // Rote Karte bei zunehmenden Schmerzen
  await ev(() => { mutDay(addDays(todayKey(), -2), (d) => { d.knee.am = 2; }); mutDay(addDays(todayKey(), -1), (d) => { d.knee.am = 3; }); mutDay(todayKey(), (d) => { d.knee.am = 4; }); });
  const rf = await ev(() => redFlags(todayKey()));
  ok(rf.includes('zunehmende Schmerzen') && rf.some((x) => x.startsWith('Morgenschmerz')), 'Warnzeichen: ' + rf.join(', '));

  // Einlagen-Zähler
  await ev(() => { S.settings.knee.insoles = addDays(todayKey(), -3); markDirty('settings'); });
  const ins = await ev(() => insolesInfo(todayKey()));
  ok(ins.n === 4 && ins.target === 4.5 && !ins.runOk, `Einlagen Tag ${ins.n}, Ziel ${ins.target} Std., Laufen ab ${ins.runFrom}`);

  // Sauna-Vorschlag in der Woche (Montag simulieren)
  await page.clock.setFixedTime(new Date('2026-11-09T09:00:00+01:00'));
  await ev(() => { ui.lastToday = todayKey(); invalidate(); });
  const sw = await ev(() => weekPlan(weekStart(todayKey())).sauna);
  ok(sw.sugg.length >= 2 && sw.sugg[0].after, 'Sauna-Vorschläge nach dem Training: ' + sw.sugg.map((x) => `${x.k} ${x.min} Min. nach ${x.after}`).join(' | '));
  const wp = await ev(() => weekPlan(weekStart(todayKey())).days.map((d) => d.items.map((x) => x.kind + (x.day || '')).join('+')).join(' / '));
  console.log('     Woche: ' + wp);
  const recs = await ev(() => { mutDay(todayKey(), (d) => { d.health.sleepScore = 55; d.health.bbMorning = 30; }); return recovery(todayKey()); });
  ok(recs.level === 'red', 'Schlechte Erholung (Sleep 55, Body Battery 30) → Ruhetag-Empfehlung');
  console.log(errors.length ? 'KONSOLENFEHLER:\n' + errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
