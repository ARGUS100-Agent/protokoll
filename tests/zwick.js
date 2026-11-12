// 2.12.0: Zwickt's – Stelle wählen, Schmerz 0–10, Stufen akut/Aufbau, Timer, Warnzeichen, Verlauf, BJJ. Nur erfundene Daten.
// Aufruf: Server auf Port 8766 (docs), dann: node tests/zwick.js <ausgabeordner>
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

  /* Übungsliste vollständig */
  const chk = await ev(() => {
    const bad = [];
    for (const a of Object.keys(ZW_AREAS)) for (const st of ['akut', 'aufbau']) { const l = zwEx(a, st); if (l.length < 3) bad.push(`${a}/${st}: ${l.length}`); for (const e of l) if (!e.how || !e.d || !e.en) bad.push(e.id); }
    for (const x of ZW_EX) if (x.reuse && !KNEE_EX.find((e) => e.id === x.id)) bad.push('fehlt ' + x.id);
    const akutStretch = Object.keys(ZW_AREAS).flatMap((a) => zwEx(a, 'akut')).filter((e) => e.cat === 'stretch').map((e) => e.id);
    return { bad, akutStretch, n: ZW_OWN.length };
  });
  ok(!chk.bad.length, `Jede Stelle hat je Stufe ≥ 3 Übungen mit Anleitung (${chk.n} neue) ${chk.bad.join(', ')}`);
  ok(chk.akutStretch.every((id) => id === 'd_kind'), `Akut-Stufe ohne echtes Dehnen (nur Kindhaltung als Entlastung): ${chk.akutStretch.join(', ') || '–'}`);
  ok(await ev(() => trainType({ type: 'BJJ' }).hard && garTypeOf('jiu_jitsu') === 'BJJ' && garTypeOf('mixed_martial_arts') === 'BJJ' && garTypeOf('boxing') === 'Sport'), 'BJJ: eigene harte Trainingsart, Garmin jiu_jitsu/MMA → BJJ, Boxen bleibt Sport');
  ok(await ev(() => garActs([{ activityId: 7, startTimeLocal: '2026-11-11 19:00:00', activityType: { typeKey: 'other' }, activityName: 'BJJ Open Mat', duration: 5400 }])[0].type === 'BJJ'), 'Garmin: Aktivität „BJJ Open Mat“ (Typ Sonstiges) → BJJ');

  /* Gestern BJJ → Frage auf Heute und als Mitteilung */
  await ev(() => { mutDay('2026-11-11', (d) => { d.trainings = [{ id: 't1', type: 'BJJ', time: '19:00', dur: 90, int: 8 }]; }); invalidate(); go('heute'); }); await page.clock.runFor(300);
  ok((await page.textContent('#main')).includes('Gestern BJJ – zwickt etwas?'), 'Heute: „Gestern BJJ – zwickt etwas?“');
  const pp0 = await ev(() => { S.settings.push = { ...(S.settings.push || {}), cats: {} }; return pushPlan().filter((x) => x.url === '#zwick').map((x) => x.title); });
  ok(pp0.includes('Gestern BJJ – zwickt etwas?'), 'Mitteilung am Morgen nach dem BJJ');

  /* Schulter rechts über die Oberfläche */
  await page.click('[data-a="zw-new"][data-cause="BJJ"]'); await page.clock.runFor(200);
  ok(await ev(() => ui.sheet.cause === 'BJJ' && !!document.querySelector('[data-a="zw-save"][disabled]')), 'Auswahl: Ursache BJJ vorbelegt, Speichern erst mit Stelle');
  await page.click('[data-a="zw-area"][data-v="schulter"]'); await page.clock.runFor(100);
  ok(await ev(() => !!document.querySelector('[data-a="zw-save"][disabled]') && !!document.querySelector('[data-a="zw-side"]')), 'Schulter → Seite muss gewählt werden');
  await page.click('[data-a="zw-side"][data-v="R"]'); await page.click('[data-a="zw-save"]'); await page.clock.runFor(300);
  ok(await ev(() => { const a = S.settings.aches[0]; return a.key === 'schulter_R' && a.since === '2026-11-12' && a.cause === 'BJJ' && ui.tab === 'knie' && ui.sub.knie === 'zwick'; }), 'Schulter rechts gespeichert (seit heute, BJJ), Zwickt’s geöffnet');
  // Ellenbogen links direkt
  await ev(() => { A['zw-new'](); A['zw-area']({ dataset: { v: 'ellenbogen' } }); A['zw-side']({ dataset: { v: 'L' } }); A['zw-save'](); }); await page.clock.runFor(300);
  ok(await ev(() => zwList().map(zwName).join(', ') === 'Schulter rechts, Ellenbogen links'), 'Zwei Stellen aktiv: Schulter rechts, Ellenbogen links');

  /* Schmerz → Stufe */
  await page.click('.zw-card:nth-of-type(1) [data-a="zw-pain"][data-v="5"]').catch(async () => { await ev(() => A['zw-pain']({ dataset: { key: 'schulter_R', v: '5', date: todayKey() } })); });
  await page.clock.runFor(200);
  await ev(() => A['zw-pain']({ dataset: { key: 'ellenbogen_L', v: '2', date: todayKey() } })); await page.clock.runFor(200);
  const st = await ev(() => { const [s, e] = zwList(); return { s: zwStage(s), e: zwStage(e), sp: zwPain(todayKey(), 'schulter_R'), sEx: zwEx('schulter', zwStage(s)).map((x) => x.n), eEx: zwEx('ellenbogen', zwStage(e)).map((x) => x.n) }; });
  ok(st.sp === 5 && st.s === 'akut' && st.sEx.includes('Pendeln') && !st.sEx.includes('Cross-Body-Dehnung'), `Schulter 5/10 → akut: ${st.sEx.join(', ')}`);
  ok(st.e === 'aufbau' && st.eEx.includes('Unterarmstrecker dehnen') && st.eEx.includes('Handgelenk langsam absenken'), `Ellenbogen 2/10 → Aufbau: ${st.eEx.join(', ')}`);
  const steps = await ev(() => { const s = zwSteps(zwList()[0], 'akut'); return { sides: [...new Set(s.map((x) => x.side).filter(Boolean))], n: s.length }; });
  ok(steps.sides.join() === 'R' && steps.n >= 5, `Timer nur für die betroffene Seite (${steps.sides.join()}), ${steps.n} Schritte`);

  /* Timer → heute erledigt */
  await page.click('.zw-card [data-a="zw-start"][data-key="schulter_R"]'); await page.clock.runFor(300);
  ok(await ev(() => ui.timer && ui.timer.name === 'Schulter rechts (sanft)' && ui.timer.noSave && ui.timer.noExtra), 'Timer startet: „Schulter rechts (sanft)“');
  ok(!(await page.textContent('#overlay')).includes('Rechts +'), 'Kein Knie-Zusatzsatz („+“) bei Zwickt’s');
  await ev(() => timerFinish()); await page.clock.runFor(200);
  ok(await ev(() => peekDay(todayKey()).ache.schulter_R.done === true), 'Nach dem Timer: heute erledigt');
  await page.click('[data-a="tm-close"]'); await page.clock.runFor(300);

  /* Warnzeichen */
  await page.click('.zw-card [data-a="zw-flag"][data-key="schulter_R"][data-v="Kraftverlust"]'); await page.clock.runFor(200);
  const card = await page.textContent('.zw-card');
  ok(card.includes('Warnzeichen: Kraftverlust') && card.includes('ärztlich'), 'Warnzeichen „Kraftverlust“ → roter Hinweis mit Abklären');
  await page.screenshot({ path: `${OUT}/zwick.png`, fullPage: true });

  /* Heute, Training, Mitteilungen */
  await ev(() => go('heute', { scrollTop: true })); await page.clock.runFor(300);
  const heute = await page.textContent('#main');
  ok(heute.includes('Schulter rechts: 5/10') && heute.includes('Ellenbogen links: 2/10') && !heute.includes('Gestern BJJ'), 'Heute: beide Stellen mit Wert, BJJ-Frage erledigt');
  await page.screenshot({ path: `${OUT}/zwick-heute.png` });
  const tr = await ev(() => zwTrainHint(todayKey()));
  ok(tr.includes('Zwickt: Schulter rechts (5/10), Ellenbogen links (2/10)') && tr.includes('keine Hebel'), 'Training: Hinweis mit Schonen beim BJJ');
  const pp1 = await ev(() => pushPlan().filter((x) => x.url === '#zwick' && dkey(new Date(x.at)) === todayKey()).map((x) => x.title));
  ok(pp1.length === 1 && pp1[0] === 'Übungen: Ellenbogen links', `Mitteilungen heute: ${pp1.join(' | ')}`);

  /* Verlauf: eine Woche ohne Besserung, dann zwei Wochen */
  await ev(() => { for (let i = 0; i < 9; i++) mutDay(addDays('2026-11-12', i), (d) => { d.ache = d.ache || {}; d.ache.schulter_R = { ...(d.ache.schulter_R || {}), p: 5, flags: [] }; }); invalidate(); });
  await page.clock.setSystemTime(new Date('2026-11-20T08:00:00+01:00'));
  ok(await ev(() => zwTrend(zwList()[0]).note.includes('Seit einer Woche keine Besserung')), 'Nach 9 Tagen gleich stark → Hinweis abklären');
  ok(await ev(() => pushPlan().some((x) => x.title === 'Ellenbogen links: wie ist es heute?')), 'Neuer Tag ohne Eintrag → Mitteilung „wie ist es heute?“');
  await ev(() => { for (let i = 9; i < 16; i++) mutDay(addDays('2026-11-12', i), (d) => { d.ache = { schulter_R: { p: 3 } }; }); invalidate(); });
  await page.clock.setSystemTime(new Date('2026-11-27T08:00:00+01:00'));
  ok(await ev(() => zwTrend(zwList()[0]).note.includes('Seit 2 Wochen')), 'Nach 2 Wochen noch 3/10 → Hinweis ärztlich/physiotherapeutisch');
  ok(await ev(() => zwStage(zwList()[0]) === 'aufbau'), 'Schmerz 3/10 → Stufe Aufbau');
  ok(await ev(() => frankReportText(weekStart('2026-11-12')).includes('Beschwerden (Zwickt’s): Schulter rechts seit 12.11. (BJJ): Schmerz 5 → 5')), 'Wochenbericht: Stelle, Ursache, Schmerzverlauf');

  /* Wieder gut */
  await ev(() => A['zw-end']({ dataset: { key: 'ellenbogen_L' } }));
  ok(await ev(() => zwList().length === 1 && zwList(true).find((a) => a.key === 'ellenbogen_L').end === todayKey() && !zwTodayCard(todayKey()).includes('Ellenbogen')), '„Wieder gut“ → Ellenbogen abgeschlossen, verschwindet von Heute');
  /* Bleibt nach dem Neuladen erhalten */
  await page.clock.runFor(3000);
  await page.reload({ waitUntil: 'load' });
  for (let i = 0; i < 20; i++) { await page.clock.runFor(500); if (await ev(() => !!(S.meta && document.body.classList.contains('ready')))) break; }
  ok(await ev(() => zwList().map((a) => a.key).join() === 'schulter_R' && zwList(true).length === 2 && zwPain('2026-11-12', 'schulter_R') === 5), 'Nach Neuladen: Stellen und Schmerzwerte gespeichert');
  ok(!errors.length, errors.length ? errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.log('ABBRUCH', e); process.exit(1); });
