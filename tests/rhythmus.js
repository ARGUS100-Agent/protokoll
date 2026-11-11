// 2.9.0: Schlaffenster aus den Garmin-Nächten und Wunschliste – nur erfundene Daten.
// Aufruf: Server auf Port 8766 (docs), dann: node tests/rhythmus.js <ausgabeordner>
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
  // Mittwoch, 11. Nov. 2026, 15:00
  await page.clock.install({ time: new Date('2026-11-11T15:00:00+01:00') });
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const ready = async () => { for (let i = 0; i < 20; i++) { await page.clock.runFor(500); if (await ev(() => !!(S.meta && document.body.classList.contains('ready')))) break; } };
  await ready();
  const shot = (n) => page.screenshot({ path: `${OUT}/rh-${n}.png`, fullPage: true });

  /* ---------- 1. Ohne Nächte: kein Fenster, alter Rhythmus ---------- */
  const r0 = await ev(() => ({ win: rhWindow(), src: rhythm(todayKey()).bedSrc }));
  ok(r0.win === null && r0.src !== 'fenster', 'Ohne Nächte kein Fenster, bisheriger Rhythmus');

  /* ---------- 2. 14 Nächte um 23:00–07:00, Bedarf 8 Std. ---------- */
  await ev(() => {
    const beds = ['22:50', '23:05', '23:00', '23:20', '22:55', '23:00', '23:40', '22:45', '23:10', '23:00', '00:30', '23:00', '22:58', '23:02'];
    const wakes = ['06:55', '07:00', '07:05', '07:00', '06:50', '07:10', '07:00', '06:45', '07:00', '07:20', '08:40', '07:00', '07:05', '06:58'];
    for (let i = 0; i < 14; i++) {
      const k = addDays('2026-11-11', -i);
      mutDay(k, (d) => { d.health = { ...d.health, bedTime: beds[i], wakeTime: wakes[i], sleepNeed: 480 }; d.gar = { bedTime: beds[i], wakeTime: wakes[i], sleepNeed: 480 }; });
    }
    invalidate();
  });
  const cafDoseFor90 = await ev(() => cafDoseH(90) * 60);
  const r1 = await ev(() => { const w = rhWindow(), r = rhythm(todayKey()); return { onset: w.onset, wake: w.wake, n: w.n, pull: w.pull, hit: w.hit, recent: w.recent.length, bed: r.bed, src: r.bedSrc, next: r.wakeNext, caf: cafCutoff(todayKey()), tomorrowWake: rhythm(addDays(todayKey(), 1)).wake, tomorrowSrc: rhythm(addDays(todayKey(), 1)).wakeSrc }; });
  console.log('     ' + JSON.stringify(r1));
  ok(r1.n === 14 && r1.onset === 1380 && r1.wake === 420 && r1.pull === 0, 'Fenster aus 14 Nächten: einschlafen 23:00, aufstehen 07:00 (Median, Ausreißer 00:30 zählt kaum)');
  ok(r1.src === 'fenster' && r1.bed === 1365 && r1.next === 420, 'Fenster steuert die Schlafenszeit: ins Bett 22:45, morgen raus 07:00');
  ok(r1.caf === Math.round((1365 - cafDoseFor90) / 5) * 5, 'Koffein-Stopp folgt dem Fenster (Kaffee 90 mg: ~8,1 Std. vor 22:45 → 14:40)');
  ok(r1.tomorrowWake === 420 && r1.tomorrowSrc === 'fenster', 'Morgen: Aufstehen laut Fenster');
  ok(r1.recent === 7 && r1.hit === 5, 'Letzte 7 Nächte: 5 im Fenster (23:40 und 23:20 zu spät)');

  /* ---------- 3. Heute-Zeile, Karte unter Garmin ---------- */
  await ev(() => go('heute')); await page.clock.runFor(300);
  const line = await page.textContent('.rhythm');
  ok(line.includes('Schlafenszeit 22:45') && line.includes('Einschlafen 22:45–23:15') && line.includes('dein Fenster 06:45–07:15'), 'Heute: Schlafenszeit mit Fenster');
  await ev(() => { ui.sub.garmin = 'eintragen'; go('garmin'); }); await page.clock.runFor(300);
  const card = await page.textContent('#rhythmus-card');
  ok(card.includes('23:00') && card.includes('07:00') && card.includes('5 von 7') && (await page.$$('#rhythmus-card .rh-row')).length === 7, 'Garmin & Schlaf: Karte mit Fenster, 7 Nächten und Regelmäßigkeit');
  await shot('karte');

  /* ---------- 4. „Morgen raus“ geht vor ---------- */
  const r2 = await ev(() => { mutDay(todayKey(), (d) => { d.hd = { ...(d.hd || {}), wakeNext: '06:00' }; }); invalidate(); const r = rhythm(todayKey()); return { bed: r.bed, src: r.bedSrc }; });
  ok(r2.src === 'eingestellt' && r2.bed === 360 + 1440 - 480 - 15, 'Eingestelltes „Morgen raus 06:00“ geht vor: Schlafenszeit 21:45');
  await ev(() => { mutDay(todayKey(), (d) => { delete d.hd.wakeNext; }); invalidate(); });

  /* ---------- 5. Zu kurze Nächte: Fenster zieht das Einschlafen vor ---------- */
  const r3 = await ev(() => {
    for (let i = 0; i < 14; i++) { const k = addDays('2026-11-11', -i); mutDay(k, (d) => { d.health = { ...d.health, bedTime: '00:15', wakeTime: '07:00', sleepNeed: 480 }; }); }
    invalidate(); const w = rhWindow(); return { onset: w.onset, pull: w.pull, txt: rhCard() };
  });
  ok(r3.onset === 1440 + 15 - 30 && r3.pull === 30 && r3.txt.includes('um 30 Min. vor'), 'Nächte zu kurz: Einschlafen 30 Min. vorgezogen (23:45 statt 00:15), mit Hinweis');

  /* ---------- 6. Wochenziel und Bericht ---------- */
  const r4 = await ev(() => {
    for (let i = 0; i < 14; i++) { const k = addDays('2026-11-11', -i); mutDay(k, (d) => { d.health = { ...d.health, bedTime: i === 2 ? '23:50' : '23:00', wakeTime: '07:00', sleepNeed: 480 }; }); }
    invalidate();
    const m = goalMetric('rh_win');
    return { a: m.day(addDays('2026-11-11', -1)), b: m.day(addDays('2026-11-11', -3)), none: m.day('2026-11-11'), rep: frankReportText(weekStart('2026-11-11')) };
  });
  ok(r4.a === 1 && r4.b === 0 && r4.none === null, 'Messgröße rh_win: Nacht im Fenster 1, daneben 0, ohne Folgenacht leer');
  ok(r4.rep.includes('Schlaffenster') && r4.rep.includes('[rh_win]'), 'Wochenbericht enthält das Schlaffenster');

  /* ---------- 7. Mitteilungen folgen dem Fenster ---------- */
  const r5 = await ev(() => { S.settings.push = { ...(S.settings.push || {}), cats: {} }; const p = pushPlan(); return p.filter((x) => new Date(x.at).getDate() === 11).map((x) => `${new Date(x.at).toTimeString().slice(0, 5)} ${x.title} | ${x.body}`); });
  console.log('     ' + r5.filter((x) => /Schlafenszeit|Bildschirm|raus/.test(x)).join('\n     '));
  ok(!r5.some((x) => x.includes('Wann musst du morgen raus')), 'Mit Fenster keine Frage „Wann musst du morgen raus?“');
  ok(r5.some((x) => x.startsWith('22:35 Schlafenszeit 22:45') && x.includes('Dein Fenster')) && r5.some((x) => x.startsWith('21:45 Bildschirme weg')), 'Abend-Mitteilungen nach dem Fenster (Bildschirme 21:45, Schlafenszeit 22:45)');

  /* ---------- 8. Wunschliste ---------- */
  await ev(() => go('mehr')); await page.clock.runFor(300);
  ok((await page.textContent('#main')).includes('Wunschliste') && (await page.textContent('#main')).includes('3 offen'), 'Mehr: Bereich Wunschliste mit 3 offenen Produkten');
  await ev(() => go('wunsch')); await page.clock.runFor(300);
  let main = await page.textContent('#main');
  ok(main.includes('Oura Ring 5') && main.includes('Muse S Athena') && main.includes('Pod 6') && main.includes('3.078 €') && main.includes('268,99 €') !== undefined, 'Vorbefüllt: Oura, Stirnband, Pod 6 mit Summe');
  console.log('     Summe: ' + (await page.textContent('.wish-sum')).replace(/\s+/g, ' '));
  await shot('wunsch');
  await page.click('[data-a="wish-open"][data-id="w_pod6"]'); await page.clock.runFor(300);
  const sh = await page.textContent('#sheet');
  ok(['Was es ist', 'Was es dir bringt', 'Was die Forschung sagt', 'Vorteile', 'Nachteile', 'Alternativen', 'Vor dem Kauf', 'Quellen', '2.199 €', '199 €', '2.796 €'].every((t) => sh.includes(t)), 'Erklärung mit allen Abschnitten und 3-Jahres-Kosten');
  ok(await page.$('#sheet a[href^="https://claude.ai/new?q="][data-copy]'), '„Mit Claude neu prüfen“ öffnet Claude mit Frage');
  await page.screenshot({ path: `${OUT}/rh-wunsch-sheet.png` });
  await page.click('#sheet [data-a="wish-order"]'); await page.clock.runFor(300);
  let w = await ev(() => wishItems().find((x) => x.id === 'w_pod6'));
  ok(w.status === 'bestellt' && w.at.ordered === '2026-11-11', 'Bestellt abgehakt');
  await page.click('#toast [data-a="undo"]'); await page.clock.runFor(300);
  w = await ev(() => wishItems().find((x) => x.id === 'w_pod6'));
  ok(w.status === 'offen' && !w.at.ordered, 'Rückgängig');
  await page.click('[data-a="wish-order"][data-id="w_oura5"]'); await page.clock.runFor(300);
  await ev(() => { ui.sub.wunsch = 'bestellt'; render(); }); await page.clock.runFor(300);
  main = await page.textContent('#main');
  ok(main.includes('Oura Ring 5') && main.includes('Bestellt am') && main.includes('Bestellt (1)'), 'Reiter „Bestellt“ zeigt Oura');
  await page.click('[data-a="wish-arrived"][data-id="w_oura5"]'); await page.clock.runFor(300);
  ok((await page.textContent('#main')).includes('Angekommen am'), 'Angekommen');
  await ev(() => { ui.sub.wunsch = 'offen'; render(); }); await page.clock.runFor(300);
  await page.click('[data-a="wish-new"]'); await page.clock.runFor(300);
  await page.fill('#wi-n', 'Schlafmaske'); await page.fill('#wi-price', '24,90'); await page.fill('#wi-link', 'beispiel.de/maske');
  await page.click('[data-a="wish-prio"][data-v="1"]');
  await page.fill('#wi-free', 'Blockiert Licht.\nHilft beim Einschlafen.');
  await page.click('[data-a="wish-save"]'); await page.clock.runFor(300);
  w = await ev(() => wishItems().find((x) => x.n === 'Schlafmaske'));
  ok(w && w.price === 24.9 && w.prio === 1 && w.link === 'https://beispiel.de/maske' && w.info.free.includes('\n'), 'Eigenes Produkt mit Preis, Link, Priorität und Erklärung');
  await page.click(`[data-a="wish-open"][data-id="${w.id}"]`); await page.clock.runFor(300);
  ok((await page.textContent('#sheet')).includes('Hilft beim Einschlafen'), 'Eigene Erklärung im Produkt');
  await page.click('#sheet [data-a="wish-edit"]'); await page.clock.runFor(300);
  await page.click('[data-a="wish-del"]'); await page.clock.runFor(300);
  ok(!(await ev(() => wishItems().some((x) => x.n === 'Schlafmaske'))), 'Löschen');

  /* ---------- 9. Speichern, Backup ---------- */
  await ev(() => flush());
  await page.reload({ waitUntil: 'load' }); await ready();
  const per = await ev(() => wishItems().map((x) => `${x.id}:${x.status}`).join(','));
  ok(per.includes('w_oura5:da') && per.includes('w_pod6:offen'), 'Nach Neuladen gespeichert: ' + per);
  const bk = await ev(() => JSON.parse(JSON.stringify(exportData())));
  ok(bk.wish && bk.wish.items.length === 3, 'Backup enthält die Wunschliste');
  const imp = await ev(async () => {
    const old = clone(exportData()); delete old.wish; // Backup aus 2.8
    ui.sheet = { type: 'import', data: old }; await A['import-do']({ dataset: { mode: 'replace' } });
    const a = wishItems().map((x) => x.status).join(',');
    const withW = clone(exportData()); withW.wish.items[0].status = 'bestellt'; withW.wish.items.push({ id: 'w_x', n: 'Test', status: 'offen' });
    ui.sheet = { type: 'import', data: withW }; await A['import-do']({ dataset: { mode: 'merge' } });
    return { a, b: wishItems().length, c: wishItems()[0].status };
  });
  ok(imp.a === 'offen,offen,offen' && imp.b === 4 && imp.c === 'bestellt', 'Import: altes Backup ohne Liste → Vorschläge; Zusammenführen übernimmt Stand und neue Produkte');

  /* ---------- 10. Alle Bereiche ohne Fehler ---------- */
  for (const t of ['heute', 'garmin', 'licht', 'wunsch', 'woche', 'set']) { await ev((x) => go(x), t); await page.clock.runFor(200); }
  ok(!errors.length, errors.length ? errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.log('ABBRUCH', e); process.exit(1); });
