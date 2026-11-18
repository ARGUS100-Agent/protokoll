// 2.18 (Paket 3 der Ideen vom 18.11.): Bereitschaft 2.0, Infekt-Frühwarnung, Schlaf-Prognose, Eiweiß Phase 2,
// Eiweiß pro Mahlzeit, Natrium, Kosten, Meilensteine, Ziele mit Prognose, Monatsbericht (Claude nachgebaut),
// Rückblick des Jahres, Daten-Labor, CSV-Export, Fokus-Blöcke, Wissens-Karten. Nur ausgedachte Testdaten.
const fs = require('fs');
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, timezoneId: 'Europe/Berlin', locale: 'de-DE', serviceWorkers: 'block', acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.clock.install({ time: new Date('2026-12-21T18:30:00+01:00') }); // Montag
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  await page.clock.runFor(1200);
  const ev = (fn, a) => page.evaluate(fn, a);
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });

  await ev(() => {
    S.foods.custom.push({ id: 'c_whey', n: 'Test-Whey', cat: 'Eigene', base: 100, u: [['g', 1]], tags: ['whey'], v: { kcal: 380, p: 80 } });
    S.foods.custom.push({ id: 'c_huhn', n: 'Testhähnchen', cat: 'Eigene', base: 100, u: [['g', 1]], v: { kcal: 110, p: 23, na: 70 } });
    S.foods.custom.push({ id: 'c_reis', n: 'Testreis', cat: 'Eigene', base: 100, u: [['g', 1]], v: { kcal: 130, p: 3, c: 28, na: 5 } });
    S.foods.custom.push({ id: 'c_pmm', n: 'prepmymeal Testpizza', cat: 'Fertiggerichte', base: 100, u: [['g', 1]], v: { kcal: 180, p: 11, na: 640 } });
    buildFoodIndex();
    S.settings.skin.phases = S.settings.skin.phases.slice(0, 2).map((p, i) => ({ ...p, n: i ? 'Phase 2: kein Whey' : 'Phase 1', start: i ? '2026-12-01' : '2026-11-03', end: i ? '2026-12-28' : '2026-11-30', rules: (p.rules || []).length ? p.rules : ['Testregel'] }));
    for (let i = 30; i >= 1; i--) {
      const k = addDays('2026-12-21', -i);
      mutDay(k, (d) => {
        Object.assign(d.health, { sleepScore: 82, sleepDur: 470, hrv: 100, rhr: 48, steps: 9000, weight: Math.round((80 + (30 - i) * 0.02) * 10) / 10, waist: i === 28 ? 84 : i === 1 ? 83 : undefined });
        if (d.health.waist === undefined) delete d.health.waist;
        d.gx = { hrvBase: [90, 110] };
        d.entries = [{ id: 'h' + i, food: 'c_huhn', g: 200, meal: 'mittag', t: 1 }, { id: 'r' + i, food: 'c_reis', g: 300, meal: 'mittag', t: 2 }, { id: 'p' + i, food: 'c_pmm', g: 400, meal: 'abend', t: 3 }];
        if (i > 20) d.entries.push({ id: 'w' + i, food: 'c_whey', g: 40, meal: 'snack', t: 4 });
        if (i <= 8) d.mc = { warm_dusche: 1 };
        d.caf = [{ id: 'm' + i, p: 'monster_zero', n: 'Monster Energy Zero 500 ml', mg: 160, t: '10:00' }];
      });
    }
    // gestern und heute: Ruhepuls hoch, HRV tief → Frühwarnung und Bereitschaft gedeckelt
    for (const k of ['2026-12-20', '2026-12-21']) mutDay(k, (d) => { Object.assign(d.health, { rhr: 55, hrv: 70, hrvWeek: 80, sleepScore: 84, bbMorning: 70 }); d.gx = { hrvBase: [90, 110] }; });
    mutDay('2026-12-19', (d) => { Object.assign(d.health, { hrv: 95, hrvWeek: 80, sleepScore: 88, bbMorning: 80, rhr: 48 }); });
    const gym = (k, w) => mutDay(k, (d) => { d.trainings = [{ id: 'g' + k, type: 'Oberkörper A', time: '17:00', dur: 70, gym: { day: 1, sched: 'A', ex: { g_schraeg_lh: { s: [{ w, r: 6, rir: 2, d: true }] } } } }]; });
    gym('2026-11-25', 70); gym('2026-12-02', 72.5); gym('2026-12-09', 75); gym('2026-12-16', 77.5);
    invalidate(); render();
  });
  await page.clock.runFor(300);

  /* ---------- Erholung ---------- */
  const rd = await ev(() => { const r = readinessOf('2026-12-19'); return { s: r && r.score, cap: r && r.cap, own: _readinessCalcOrig('2026-12-19').score }; });
  ok(rd.s <= 70 && /höchstens 70/.test(rd.cap || '') && rd.own > 70, `Bereitschaft 2.0: ${rd.own} → ${rd.s}, weil der HRV-Wochenschnitt unter dem Normalbereich liegt`);
  const home = await page.textContent('#main');
  ok(/Dein Körper arbeitet an etwas/.test(home), 'Infekt-Frühwarnung: Ruhepuls hoch + HRV tief, zwei Tage');
  ok(await ev(() => { const f = sleepForecast(todayKey()); return !!f && f.avg > 80; }), 'Schlaf-Prognose rechnet aus den eigenen Nächten');
  ok(await ev(() => /höchstens 70/.test(recoveryCard('2026-12-19'))), 'Erholungs-Karte zeigt den Grund für die Deckelung');

  /* ---------- Ernährung → Auswertung ---------- */
  await ev(() => { ui.ernSub = 'eval'; go('ern', { date: '2026-12-20' }); }); await page.clock.runFor(300);
  const ern = await page.textContent('#main');
  ok(/Eiweiß in Haut-Phase 2/.test(ern) && /Testhähnchen/.test(ern), 'Haut-Phase 2: Eiweißlücke aus Shakes und Ersatz aus eigenen Lebensmitteln');
  ok(/Eiweiß pro Mahlzeit/.test(ern) && /Mittag 55 g/.test(ern), 'Eiweiß pro Mahlzeit: Mittag 55 g');
  ok(/Natrium/.test(ern) && /Testpizza/.test(ern) && /640 mg/.test(ern), 'Natrium mit Prepmymeal-Liste');
  await page.click('[data-a="prices-open"]'); await page.clock.runFor(150);
  await page.fill('#sheet input[data-c="price"][data-id="c_huhn"]', '9,90'); await page.dispatchEvent('#sheet input[data-c="price"][data-id="c_huhn"]', 'change');
  await page.click('#sheet [data-a="prices-done"]'); await page.clock.runFor(200);
  ok(/€ pro 100 g Eiweiß/.test(await page.textContent('#main')) && /4,30 €/.test(await page.textContent('#main')), 'Kosten: Hähnchen 9,90 €/kg = 4,30 € pro 100 g Eiweiß');
  await shot('v218-ern');

  /* ---------- Fortschritt ---------- */
  await ev(() => { ui.sub.fortschritt = 'meilen'; go('fortschritt'); }); await page.clock.runFor(300);
  ok(/7 Morgen-Checks am Stück/.test(await page.textContent('#main')), 'Meilenstein „7 Morgen-Checks am Stück“');
  await ev(() => { ui.sub.fortschritt = 'ziele'; render(); }); await page.clock.runFor(200);
  await page.fill('#goal-val', '81'); await page.click('[data-a="goal-add"]'); await page.clock.runFor(200);
  await page.click('[data-a="goal-type"][data-v="e1rm"]'); await page.clock.runFor(150);
  await page.fill('#goal-val', '100'); await page.click('[data-a="goal-add"]'); await page.clock.runFor(200);
  const goals = await ev(() => (S.settings.goals2 || []).map((g) => goalState(g).txt));
  ok(goals.length === 2 && goals.every((t) => /^etwa /.test(t)), `Ziele mit Prognose: ${goals.join(' | ')}`);
  await ev(() => { ui.sub.fortschritt = 'labor'; ui.labX = 'caf'; ui.labY = 'sleep'; render(); }); await page.clock.runFor(200);
  ok(!!(await page.$('.chart-box svg')) && /Tage, r =/.test(await page.textContent('#main')), 'Daten-Labor: Streudiagramm mit r');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('[data-a="csv-export"]')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  ok(/^﻿?datum;gewicht;trend;bauch;sleep/.test(csv) && csv.split('\n').length > 30 && /;80,/.test(csv), 'CSV-Export mit Semikolon und deutschem Komma');
  await ev(() => { window.aiOn = () => true; window.aiAsk = async () => 'Gute Konstanz beim Wiegen. Schwerpunkte: Beine, Schlaf.'; ui.sub.fortschritt = 'jahr'; ui.kMonth = '2026-12'; render(); });
  await page.clock.runFor(200);
  await page.click('[data-a="month-ai"]'); await page.clock.runFor(500);
  ok(await ev(() => /Gute Konstanz/.test((S.settings.monthAi || {})['2026-12'] || '') && /Gute Konstanz/.test(document.querySelector('#main').textContent)), 'Monatsbericht von Claude (nachgebaut) gespeichert und angezeigt');
  await ev(() => go('heute')); await page.clock.runFor(200);
  ok(/Rückblick 2026/.test(await page.textContent('#main')), 'Ab 20.12.: Rückblick-Banner');
  await page.click('[data-a="year-open"]'); await page.clock.runFor(200);
  const yr = await page.textContent('#sheet');
  ok(/Gym-Einheiten/.test(yr) && /Dosen Monster/.test(yr) && /30/.test(yr), 'Rückblick 2026: Gym, Monster-Dosen, …');
  await shot('v218-jahr');
  await page.click('#sheet .sheet-acts [data-a="sheet-close"]'); await page.clock.runFor(150);

  /* ---------- Lernen & Fokus ---------- */
  ok(!!(await page.$('.know-card')), 'Heute: Wissens-Karte fällig');
  await page.click('[data-a="card-show"]'); await page.clock.runFor(150);
  await page.click('[data-a="card-rate"][data-v="1"]'); await page.clock.runFor(150);
  ok(await ev(() => cardsList()[0].step === 1 && cardsList()[0].due === '2026-12-24' && !document.querySelector('.know-card')), '„Gewusst“ → in 3 Tagen wieder, heute keine weitere Karte auf Heute');
  await ev(() => go('lernen')); await page.clock.runFor(200);
  await page.click('[data-a="focus-start"][data-v="25"]'); await page.clock.runFor(1000);
  ok(/Fokus-Block 25 Min\./.test(await page.textContent('#focus')), 'Fokus-Block läuft');
  await page.clock.runFor(25 * 60 * 1000 + 1000);
  await page.fill('#focus-topic', 'Statistik'); await page.click('[data-a="focus-save"][data-v="4"]'); await page.clock.runFor(200);
  const fo = await ev(() => getDay(todayKey()).focus);
  ok(fo && fo[0].min === 25 && fo[0].rate === 4 && fo[0].topic === 'Statistik', 'Fokus-Block gespeichert: 25 Min., 4/5, Thema');
  await page.fill('#cards-in', 'Was ist NSDR? | Geführte Tiefenentspannung im Liegen\nkaputte Zeile'); await page.click('[data-a="cards-add"]'); await page.clock.runFor(200);
  ok(await ev(() => cardsList().some((c) => c.q === 'Was ist NSDR?')), 'Eigene Karten per „Frage | Antwort“');
  await shot('v218-lernen');
  ok(await ev(() => AREAS.some((a) => a.id === 'fortschritt') && AREAS.some((a) => a.id === 'lernen')), 'Neue Bereiche „Fortschritt“ und „Lernen & Fokus“ unter Mehr');

  // Regression: gleichnamige Funktionen dürfen sich nicht überschreiben (Haut-Phasenkarte, Knie-Meilensteine, letzte Lebensmittel)
  await ev(() => { ui.sub.haut = 'heute'; go('haut', { date: todayKey() }); }); await page.clock.runFor(200);
  ok(/Phase 2: kein Whey/.test(await page.textContent('#main')) && !/Zielrate|Recomp/.test(await page.textContent('#main')), 'Haut → Heute zeigt die Haut-Phase (nicht die Körper-Phase)');
  ok(await ev(() => typeof milestones === 'function' && Array.isArray(progMilestones()) && typeof recentFoods === 'function' && typeof recentFoodsP === 'function'), 'Knie-Meilensteine, Fortschritts-Meilensteine und Lebensmittelsuche getrennt');
  ok(errors.length === 0, 'Keine Fehler in der Konsole' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
})();
