// 2.11.0: Blutdruck – Messwoche (ESC 2024 / ESH 2021), Einordnung, Hinweise, Mitteilungen, Routine, Bericht. Nur erfundene Daten.
// Aufruf: Server auf Port 8766 (docs), dann: node tests/blutdruck.js <ausgabeordner>
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
  await page.clock.install({ time: new Date('2026-11-12T07:40:00+01:00') });
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  for (let i = 0; i < 20; i++) { await page.clock.runFor(500); if (await ev(() => !!(S.meta && document.body.classList.contains('ready')))) break; }

  /* Ohne Messwoche: fällig, Karte auf Heute */
  ok(await ev(() => bpNextDue() === todayKey() && bpTodayCard().includes('fällig')), 'Erste Messwoche ist fällig, Hinweis auf Heute');
  await ev(() => go('koerper')); await page.clock.runFor(200);
  await page.click('#blutdruck [data-a="bp-start"]'); await page.clock.runFor(200);
  ok(await ev(() => bpWeek().day === 1 && S.settings.bp.start === '2026-11-12'), 'Messwoche gestartet (Tag 1/7)');
  // Eintragen über die Oberfläche
  await page.fill('#bp-sys', '128'); await page.fill('#bp-dia', '82'); await page.fill('#bp-pul', '58');
  await page.click('[data-a="bp-add"]'); await page.clock.runFor(200);
  ok((await page.textContent('#toast')).includes('zweite Messung'), 'Erste Messung → Hinweis auf die zweite');
  const m1 = await ev(() => bpList(todayKey())[0]);
  ok(m1.sys === 128 && m1.dia === 82 && m1.pul === 58 && m1.slot === 'am' && m1.t === '07:40', 'Gespeichert: 128/82, Puls 58, morgens 07:40');
  await page.fill('#bp-sys', '80'); await page.fill('#bp-dia', '120');
  await page.click('[data-a="bp-add"]'); await page.clock.runFor(200);
  ok((await page.textContent('#toast')).includes('gültige Werte') && (await ev(() => bpList(todayKey()).length)) === 1, 'Unplausibel (diastolisch > systolisch) → abgelehnt');
  // Koffein kurz davor
  await ev(() => { mutDay(todayKey(), (d) => { d.caf = [{ id: 'c1', p: 'kaffee', n: 'Kaffee', mg: 90, t: '07:30' }]; }); invalidate(); });
  await page.fill('#bp-sys', '131'); await page.fill('#bp-dia', '84'); await page.click('[data-a="bp-add"]'); await page.clock.runFor(200);
  ok(await ev(() => bpList(todayKey())[1].note === 'Koffein in den letzten 30 Min.'), 'Koffein 10 Min. davor → als Störfaktor notiert');
  // Sehr hoher Wert
  await page.fill('#bp-sys', '184'); await page.fill('#bp-dia', '112'); await page.click('[data-a="bp-add"]'); await page.clock.runFor(200);
  ok((await page.textContent('#toast')).includes('112'), 'Sehr hoher Wert → Hinweis: wiederholen, ärztlich abklären, Notruf bei Beschwerden');
  await ev(() => { mutDay(todayKey(), (d) => { d.bp = d.bp.slice(0, 2); }); });
  // Routine und Mitteilungen am Messtag
  const rt = await ev(() => routineSteps('am', todayKey()).map((s) => s.id + ':' + s.done).join(','));
  ok(rt.startsWith('bp_am:true'), 'Routine: „Blutdruck messen“ steht morgens vorn, nach 2 Messungen erledigt');
  const pp = await ev(() => { S.settings.push = { ...(S.settings.push || {}), cats: {} }; return pushPlan().filter((x) => /Blutdruck/.test(x.title)).map((x) => `${new Date(x.at).toTimeString().slice(0, 5)} ${x.title} ${x.url}`); });
  ok(pp.some((x) => x.includes('Blutdruck abends (Tag 1/7) #blutdruck')) && !pp.some((x) => x.includes('Blutdruck messen (Tag 1/7)')) && pp.some((x) => x.includes('(Tag 2/7)')), 'Mitteilungen: heute nur noch abends, morgen morgens und abends');
  // 7 Tage erfundene Messungen: Tag 1 höher (aufgeregt), danach ~124/76
  await ev(() => {
    for (let i = 0; i < 7; i++) {
      const k = addDays('2026-11-12', i);
      mutDay(k, (d) => { d.bp = i === 0 ? [{ sys: 138, dia: 88, pul: 66, t: '07:40', slot: 'am' }, { sys: 136, dia: 86, pul: 64, t: '07:42', slot: 'am' }, { sys: 134, dia: 84, pul: 62, t: '21:30', slot: 'pm' }, { sys: 133, dia: 85, pul: 62, t: '21:32', slot: 'pm' }] : [{ sys: 126, dia: 78, pul: 58, t: '07:30', slot: 'am' }, { sys: 124, dia: 77, pul: 57, t: '07:32', slot: 'am' }, { sys: 122, dia: 75, pul: 60, t: '21:30', slot: 'pm' }, { sys: 124, dia: 74, pul: 59, t: '21:32', slot: 'pm' }]; });
    }
    invalidate();
  });
  const e = await ev(() => bpEval('2026-11-12'));
  ok(e.dropFirst && e.n === 24 && e.sys === 124 && e.dia === 76 && e.cat.id === 'erhoeht' && e.enough, 'Auswertung ohne Tag 1: Ø 124/76 aus 24 Messungen → „erhöht“ (ESC: 120/70 bis < 135/85)');
  ok(await ev(() => bpCat(119, 69).id === 'ok' && bpCat(134, 84).id === 'erhoeht' && bpCat(135, 70).id === 'hoch' && bpCat(118, 85).id === 'hoch'), 'Grenzen: < 120/70 nicht erhöht, ≥ 135 oder ≥ 85 Hypertonie-Bereich');
  ok(await ev(() => frankReportText(weekStart('2026-11-12')).includes('Blutdruck (Messwoche ab 12.11., Heimmessung): Ø')), 'Wochenbericht enthält die Messwoche');
  // Nach der Woche: nächste Messwoche in 90 Tagen
  await page.clock.setSystemTime(new Date('2026-11-20T09:00:00+01:00'));
  const nx = await ev(() => { invalidate(); return { w: bpWeek(), due: bpNextDue() }; });
  ok(nx.w === null && nx.due === '2027-02-16', 'Nach 7 Tagen vorbei; nächste Messwoche am 16.02.2027 (90 Tage)');
  await ev(() => { ui.date = todayKey(); go('koerper'); }); await page.clock.runFor(300);
  const txt = await page.textContent('#blutdruck');
  ok(txt.includes('124/76') && txt.includes('erhöht') && txt.includes('nächste Messwoche'), 'Körper: Ø, Einordnung und nächster Termin');
  await page.locator('#blutdruck').screenshot({ path: `${OUT}/bp.png` });
  ok(!errors.length, errors.length ? errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.log('ABBRUCH', e); process.exit(1); });
