// 2.13.0: Knie Kraft & Athletik – Einheiten A/B/C, Timer mit Pausen, Schmerz-Monitoring, Beintag, Routine, Mitteilung, Bericht.
// Aufruf: Server auf Port 8766 (docs), dann: node tests/athletik.js <ausgabeordner>
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
  await page.clock.install({ time: new Date('2026-11-14T12:40:00+01:00') });
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  for (let i = 0; i < 20; i++) { await page.clock.runFor(500); if (await ev(() => !!(S.meta && document.body.classList.contains('ready')))) break; }

  /* Daten */
  const chk = await ev(() => {
    const bad = [];
    for (const ph of KNEE_PHASES) for (const t of ['A', 'B', 'C']) for (const it of ph.days[t]) if (!exById(it.i)) bad.push(`${ph.n} ${t}: ${it.i}`);
    const mins = KNEE_PHASES.map((ph) => ['A', 'B', 'C'].map((t) => Math.round(routineSec({ items: ph.days[t] }) / 60)));
    const plyoP1 = Object.values(KNEE_PHASES[0].days).flat().filter((it) => exById(it.i).plyo).length;
    return { bad, mins, plyoP1, cats: KNEE_EX.filter((e) => e.cat === 'athl').length };
  });
  ok(!chk.bad.length, 'Alle Übungen der Phasen gibt es ' + chk.bad.join(', '));
  ok(chk.mins.flat().every((m) => m >= 18 && m <= 25), `Dauer je Einheit 18–25 Min.: ${chk.mins.map((x) => x.join('/')).join(' · ')}`);
  ok(chk.plyoP1 === 0 && chk.cats >= 6, 'Phase 1 ohne Sprünge; neue Kategorie „Athletik & Sprünge“');

  /* Einheit A, Timer mit Pausen */
  const a = await ev(() => ({ t: athType(), items: athItems().map((x) => x.i), gap: (() => { const s = buildSteps(athRoutine()); const w = s.filter((x) => x.ex === 'a_wand60'); return [w.length, stepGap(w[0], w[1]), w[0].rest]; })() }));
  ok(a.t === 'A' && a.items[0] === 'a_ergo' && a.items[1] === 'a_wand60', 'Start mit Einheit A: Ergometer, dann Wandsitzen für die Sehne');
  ok(a.gap[0] === 5 && a.gap[1] === 60, 'Wandsitzen 5 Sätze mit 60 Sek. Pause im Timer');
  await ev(() => { ui.sub.knie = 'kraft'; go('knie', { scrollTop: true }); }); await page.clock.runFor(300);
  const view = await page.textContent('#main');
  ok(view.includes('Einheit A · Sehne & Kraft') && view.includes('Knie-Block im Gym') && view.includes('Diese Woche') && view.includes('5 Min.'), 'Ansicht: Einheit, Knie-Block, Woche, Ergometer in Minuten');
  await page.screenshot({ path: `${OUT}/ath-kraft.png`, fullPage: true });
  await page.click('[data-a="ath-start"]'); await page.clock.runFor(300);
  ok(await ev(() => ui.timer && ui.timer.rid === 'kraft' && ui.timer.athT === 'A'), 'Timer startet die Einheit');
  await ev(() => { const t = ui.timer; t.i = t.steps.length - 1; t.phase = 'run'; timerFinish(); }); await page.clock.runFor(200);
  ok((await page.textContent('#overlay')).includes('Knieschmerz während der Einheit'), 'Abschluss fragt nach dem Schmerz');
  await page.click('#overlay [data-a="tm-pain"][data-v="4"]'); await page.click('#overlay [data-a="tm-save"]'); await page.clock.runFor(300);
  const s1 = await ev(() => ({ str: getDay(todayKey()).knee.str, dd: dayDone(todayKey()).kraft, sess: kneeSessions(getDay(todayKey())).map((x) => x.r) }));
  ok(s1.str.done && s1.str.t === 'A' && s1.str.pain === 4 && s1.str.ex.a_wand60.sets.length === 5 && s1.dd && s1.sess.includes('kraft'), 'Gespeichert: A erledigt, Schmerz 4, alle Sätze');

  /* Rotation und Beintag */
  await page.clock.setSystemTime(new Date('2026-11-15T10:00:00+01:00'));
  ok(await ev(() => { invalidate(); return athType(todayKey()) === 'B'; }), 'Nächster Tag: Einheit B');
  await ev(() => { mutDay('2026-11-15', (d) => { d.knee = d.knee || {}; d.knee.str = { ex: {}, t: 'B', done: true }; }); mutDay('2026-11-16', (d) => { d.knee = d.knee || {}; d.knee.str = { ex: {}, t: 'C', done: true }; }); });
  await page.clock.setSystemTime(new Date('2026-11-18T10:00:00+01:00')); // Mittwoch = Beintag
  const legs = await ev(() => { invalidate(); return { legs: athLegsDay(todayKey()), t: athType(todayKey()), card: athTrainCard(todayKey()) }; });
  ok(legs.legs && legs.t === 'B' && legs.card.includes('Beinstrecker isometrisch'), 'Beintag: statt A die Einheit B, Knie-Block im Training');
  await ev(() => go('train', { date: todayKey() })); await page.clock.runFor(300);
  ok((await page.textContent('#main')).includes('Knie-Block im Gym'), 'Training heute zeigt den Knie-Block');

  /* Schmerz-Monitoring */
  await ev(() => { mutDay('2026-11-17', (d) => { d.knee = d.knee || {}; d.knee.am = 4; }); mutDay('2026-11-18', (d) => { d.knee = d.knee || {}; d.knee.am = 6; }); kneeCfg().phase = 2; mutDay('2026-11-18', (d) => { d.knee.str = { ex: {}, t: 'C' }; }); invalidate(); });
  const lt = await ev(() => ({ L: athLight(todayKey()), items: athItems(todayKey()).map((x) => `${x.i}:${x.sets || 1}`), full: kneePhase().days.C.map((x) => `${x.i}:${x.sets || 1}`) }));
  ok(lt.L && lt.L.why.includes('6/10'), 'Morgenschmerz 6 nach 4 → leichter Tag (' + (lt.L || {}).why + ')');
  ok(!lt.items.some((x) => x.startsWith('a_landen')) && lt.full.some((x) => x.startsWith('a_landen')) && lt.items.includes('k_stepdown:2'), 'Leichter Tag: ohne Landen/Sprünge, ein Satz weniger');
  await ev(() => { mutDay('2026-11-18', (d) => { d.knee.flags = ['Schwellung']; }); invalidate(); });
  ok(await ev(() => athLight(todayKey()).stop && athLightBanner(todayKey()).includes('abklären')), 'Warnzeichen → roter Hinweis mit Abklären');
  await ev(() => { mutDay('2026-11-18', (d) => { d.knee.flags = []; d.knee.am = 4; d.knee.str = {}; }); kneeCfg().phase = 1; invalidate(); });

  /* Routine, Mitteilung, Bericht */
  const rt = await ev(() => { S.settings.routines = { am: ['knee:mob'], day: ['atem'], pm: [] }; const R = rtCfg(); return { day: R.day.join(','), v: R.v, step: rtStep('knee:kraft', todayKey()) }; });
  ok(rt.day === 'atem,knee:kraft' && rt.v === 2 && rt.step.n === 'Knie-Athletik B' && rt.step.goSub === 'kraft', 'Routine: „Knie-Athletik“ einmal in Tagsüber ergänzt');
  const pp = await ev(() => { S.settings.push = { ...(S.settings.push || {}), cats: {} }; return pushPlan().filter((x) => x.url === '#kraft' && dkey(new Date(x.at)) === todayKey()).map((x) => x.title); });
  ok(pp.length === 1 && pp[0] === 'Knie-Athletik B: Hüfte & Seite', 'Mitteilung: ' + pp.join(' | '));
  ok(await ev(() => frankReportText(weekStart('2026-11-16')).includes('Kraft & Athletik (Phase 1): 1/6 Einheiten (C)')), 'Wochenbericht mit Einheiten');
  await ev(() => { ui.sub.knie = 'heute'; go('knie', { date: todayKey() }); }); await page.clock.runFor(300);
  ok((await page.textContent('#main')).includes('Knie-Athletik B'), 'Knie → Heute: Knie-Athletik B mit Start');
  await ev(() => { ui.sub.knie = 'kraft'; ui.exp.add('ath-info'); render(); }); await page.clock.runFor(200);
  ok((await page.textContent('#main')).includes('Breda 2021') && (await page.textContent('#main')).includes('Schmerz-Regel'), 'Erklärung mit Regeln und Quellen');
  ok(!errors.length, errors.length ? errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.log('ABBRUCH', e); process.exit(1); });
