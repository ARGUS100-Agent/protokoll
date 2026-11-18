// 2.16 (Paket 1 der Ideen vom 18.11.): Trendgewicht, Gewichts-Erklärer, Körpermaße (Seitenvergleich, Taille-zu-Größe, Körperfett/FFMI),
// Phase, Recomp-Ampel, Monatskarte, Physique-Fotos mit Schablone (Kamera), Vergleich, Zeitraffer, Fotos im Backup,
// Morgen-Check mit Koffein, Essen, Stimmung und lernender Routine.
// Nur ausgedachte Testdaten (Repo ist öffentlich).
const fs = require('fs');
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, timezoneId: 'Europe/Berlin', locale: 'de-DE', serviceWorkers: 'block', acceptDownloads: true });
  await ctx.grantPermissions(['camera']);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.clock.install({ time: new Date('2026-12-02T07:30:00+01:00') }); // Mittwoch
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  await page.clock.runFor(1200);
  const ev = (fn, a) => page.evaluate(fn, a);
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });

  /* ---------- Testdaten ---------- */
  await ev(async () => {
    S.settings.profile.height = 180;
    S.foods.custom.push({ id: 'c_essen', n: 'Testessen', cat: 'Eigene', base: 100, u: [['g', 1]], v: { kcal: 100, p: 8, c: 10, na: 200 } });
    S.foods.custom.push({ id: 'c_salz', n: 'Salzige Testpizza', cat: 'Eigene', base: 100, u: [['g', 1]], v: { kcal: 250, p: 10, c: 80, na: 2000 } });
    buildFoodIndex();
    let i = 0;
    for (let k = '2026-11-03'; k <= '2026-12-01'; k = addDays(k, 1), i++) {
      const noise = [0.3, -0.2, 0.1, -0.3, 0.2, 0, -0.1][i % 7];
      mutDay(k, (d) => {
        d.health.weight = Math.round((75 + 0.015 * i + noise) * 10) / 10;
        d.health.sleepScore = 80;
        d.entries = [{ id: 'e' + i, food: 'c_essen', g: 2000, meal: 'mittag', t: parseKey(k).getTime() + 13 * 3600000 }];
        if (k >= '2026-11-20' && k <= '2026-11-30') d.caf = [{ id: 'm' + i, p: 'monster_zero', n: 'Monster Energy Zero 500 ml', mg: 160, t: '10:00' }];
      });
    }
    // gestern: salzig und viele Kohlenhydrate
    mutDay('2026-12-01', (d) => { d.entries.push({ id: 'salz', food: 'c_salz', g: 300, meal: 'abend', t: parseKey('2026-12-01').getTime() + 19 * 3600000 }); });
    // Abendschritt „warm duschen“ zweimal „Nein“ im Morgen-Check
    for (const k of ['2026-11-29', '2026-11-30']) mutDay(k, (d) => { d.mc = { warm_dusche: 0 }; });
    // Maße: 30.10. und 27.11.
    mutDay('2026-10-30', (d) => { d.health.waist = 82; d.meas = { hals: 38, schulter: 119, brust: 101, armL: 36, armR: 36.4, ohsL: 55.5, ohsR: 58.6, wadeL: 38, wadeR: 38.1, huefte: 98 }; });
    mutDay('2026-11-27', (d) => { d.health.waist = 81; d.meas = { hals: 38, schulter: 120, brust: 102, armL: 36.5, armR: 37, ohsL: 56, ohsR: 58.5, wadeL: 38, wadeR: 38.2, huefte: 98 }; });
    // Kraft: Oktober leichter, November schwerer (≈ +5 %)
    const gym = (k, w1, w2) => mutDay(k, (d) => { d.trainings = [{ id: 't' + k, type: 'Oberkörper A', time: '17:00', dur: 75, done: true, gym: { day: 1, sched: 'A', ex: { g_schraeg_lh: { s: [{ w: w1, r: 6, rir: 2 }, { w: w1, r: 6, rir: 2 }] }, g_klimmzug: { s: [{ w: w2, r: 6, rir: 2 }, { w: w2, r: 5, rir: 2 }] } } } }]; });
    gym('2026-10-20', 70, 10); gym('2026-10-27', 70, 10); gym('2026-11-20', 73.5, 12.5); gym('2026-11-27', 74, 12.5);
    // Fotos: Physique KW 44 und KW 48, Haut KW 48
    const jpg = (color, txt) => new Promise((res) => { const c = document.createElement('canvas'); c.width = 600; c.height = 800; const g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, 600, 800); g.fillStyle = '#fff'; g.font = '60px sans-serif'; g.fillText(txt, 60, 400); c.toBlob(res, 'image/jpeg', 0.9); });
    await savePhoto('2026-10-26', 'p_front', await jpg('#345', 'Okt vorne'), '2026-10-27');
    await savePhoto('2026-10-26', 'p_side', await jpg('#354', 'Okt Seite'), '2026-10-27');
    await savePhoto('2026-11-23', 'p_front', await jpg('#534', 'Nov vorne'), '2026-11-27');
    await savePhoto('2026-11-23', 'p_side', await jpg('#543', 'Nov Seite'), '2026-11-27');
    await savePhoto('2026-11-23', 'frontal', await jpg('#455', 'Haut'), '2026-11-29');
    await loadPhotoIndex();
    invalidate(); render();
  });
  await page.clock.runFor(300);

  /* ---------- 1. Trendgewicht ---------- */
  const tr = await ev(() => { const ti = trendInfo('2026-12-01'); const me = maintEstimate('2026-12-02'); return { rate: ti.rate, pct: ti.ratePct, trend: ti.trend, n14: ti.n14, src: me && me.wt && me.wt.src }; });
  ok(tr.rate > 0.05 && tr.rate < 0.16, `Trendrate ${tr.rate && tr.rate.toFixed(3)} kg/Woche (angelegt 0,105) aus ${tr.n14} Wiegungen in 14 Tagen`);
  ok(tr.src === 'trend', 'Erhaltungskalorien rechnen mit der Rate aus dem Trendgewicht');

  /* ---------- 2. Morgen-Check: Koffein, Gewicht + Erklärer, Stimmung, lernende Routine ---------- */
  const st0 = await ev(() => { const s = mcState(todayKey()); return { caf: !!s.caf, food: !!s.food, mood: s.parts.mood, eve: s.eve.map((x) => x.id) }; });
  ok(st0.caf && !st0.food && !st0.mood, 'Morgen-Check fragt Koffein (gestern leer) und Stimmung, Essen nicht (gestern vollständig)');
  await page.click('#mcheck [data-a="mc-caf"][data-v="2"]'); await page.clock.runFor(200);
  const caf = await ev(() => { const d = getDay('2026-12-01'); return { n: d.caf.length, mg: d.caf.reduce((a, x) => a + x.mg, 0), t: d.caf.every((x) => x.t == null), mc: d.cafMc, b: EXPS.caf_dose.comply('2026-12-01', 'B') }; });
  ok(caf.n === 2 && caf.mg === 320 && caf.t && caf.mc === 2 && caf.b, '„2 Monster“ → gestern 2 Einträge ohne Uhrzeit, 320 mg, zählt als B-Tag im Experiment');
  await page.fill('#mcheck input[data-k="weight"]', '77,6'); await page.dispatchEvent('#mcheck input[data-k="weight"]', 'change'); await page.clock.runFor(300);
  const why = await ev(() => { const r = weightWhy(todayKey()); return { big: r && r.big, n: r ? r.why.length : 0, txt: r ? r.why.join(' | ') : '', banner: !!document.querySelector('.wwhy') }; });
  ok(why.big && why.n >= 2 && /Salz/.test(why.txt) && /Kohlenhydrate/.test(why.txt) && why.banner, `Gewichts-Erklärer: ${why.txt}`);
  await page.click('#mcheck [data-a="mood"][data-f="wellbeing"][data-v="8"]'); await page.clock.runFor(100);
  await page.click('#mcheck [data-a="mood"][data-f="energy"][data-v="6"]'); await page.clock.runFor(100);
  const mood = await ev(() => getDay(todayKey()).mood);
  ok(mood.wellbeing === 8 && mood.energy === 6, 'Stimmung und Energie mit je einem Tipp');
  const hasDusche = st0.eve.includes('warm_dusche');
  ok(hasDusche, 'Abendschritt „warm duschen“ wird abgefragt');
  await page.click('#mcheck [data-a="mc-eve"][data-id="warm_dusche"][data-v="0"]'); await page.clock.runFor(200);
  ok(!!(await page.$('#mcheck .mc-learn')), 'Nach 3× „Nein“ fragt die App: weglassen, erinnern oder weiter');
  await shot('v215-morgen');
  await page.click('#mcheck .mc-learn [data-v="remind"]'); await page.clock.runFor(200);
  const learn = await ev(() => ({ focus: mcCfg().focus, rem: mcEveReminder(todayKey()), prompt: !!document.querySelector('#mcheck .mc-learn') }));
  ok((learn.focus || []).includes('warm_dusche') && /^❗/.test(learn.rem || '') && !learn.prompt, `„Abends erinnern“: steht in der Abend-Erinnerung vorn (${learn.rem})`);
  for (const sel of ['#mcheck [data-a="knee-am"][data-v="2"]', '#mcheck [data-a="skin-score"][data-v="6"]']) { const b = await page.$(sel); if (b) { await b.click(); await page.clock.runFor(100); } }
  await page.click('#mcheck [data-a="mc-all"]'); await page.clock.runFor(300);
  ok(!(await page.$('#mcheck')), 'Morgen-Check fertig → Karte weg');
  // Koffein ohne Uhrzeit in „Licht & Koffein“
  await ev(() => go('licht', { date: '2026-12-01' })); await page.clock.runFor(200);
  ok(/Ohne Uhrzeit/.test(await page.textContent('#main')), 'Licht & Koffein zeigt die Einträge ohne Uhrzeit');

  /* ---------- 3. Körper-Ansichten ---------- */
  await ev(() => { ui.sub.koerper = 'heute'; go('koerper', { date: todayKey() }); }); await page.clock.runFor(300);
  ok(!!(await page.$('.trend-card')) && /Trendgewicht/.test(await page.textContent('#main')), 'Körper → Heute: Trendgewicht-Karte');
  await shot('v215-koerper-heute');
  await ev(() => { ui.sub.koerper = 'masse'; render(); }); await page.clock.runFor(300);
  const masse = await page.textContent('#main');
  ok(/Taille zu Größe/.test(masse) && /0,45/.test(masse), 'Taille zu Größe 81/180 = 0,45');
  ok(!!(await page.$('.side-row.is-flag')) && /Oberschenkel/.test(masse), 'Seitenvergleich markiert den dünneren Oberschenkel');
  ok(/12,9 %/.test(masse) && /FFMI/.test(masse), 'Körperfett nach Maßband-Formel 12,9 % und FFMI');
  await page.click('[data-a="meas-open"]'); await page.clock.runFor(200);
  await page.fill('#sheet input[data-f="armL"]', '36,8'); await page.dispatchEvent('#sheet input[data-f="armL"]', 'change');
  await page.fill('#sheet input[data-f="waist"]', '80,5'); await page.dispatchEvent('#sheet input[data-f="waist"]', 'change');
  await page.fill('#sheet input[data-f="ohsR"]', '999'); await page.dispatchEvent('#sheet input[data-f="ohsR"]', 'change');
  await page.click('#sheet [data-a="meas-kfam"][data-v="caliper"]'); await page.clock.runFor(100);
  const ms = await ev(() => { const d = getDay(todayKey()); return { arm: d.meas && d.meas.armL, w: d.health.waist, bad: d.meas && d.meas.ohsR, m: d.meas && d.meas.kfaM }; });
  ok(ms.arm === 36.8 && ms.w === 80.5 && ms.bad == null && ms.m === 'caliper', 'Maße eintragen: Oberarm und Bauch gespeichert, 999 abgelehnt, Methode gewählt');
  await page.click('#sheet [data-a="meas-done"]'); await page.clock.runFor(200);
  await shot('v215-koerper-masse');

  /* ---------- 4. Auswertung: Phase, Recomp, Monatskarte ---------- */
  await ev(() => { ui.sub.koerper = 'analyse'; ui.kMonth = '2026-11'; render(); }); await page.clock.runFor(300);
  const rc = await ev(() => recompStatus(todayKey()));
  ok(rc.st === 'ok' && rc.dK > 3 && rc.dB < 0 && rc.wOk, `Recomp-Ampel grün: Kraft ${rc.dK.toFixed(1)} %, Bauch ${rc.dB}, Gewicht ${rc.dW.toFixed(2)} kg`);
  const ms2 = await ev(() => monthStats('2026-11'));
  ok(ms2.prs.length === 2 && ms2.gym === 2 && ms2.meas.length >= 5, `Monatskarte November: ${ms2.prs.length} Bestwerte, ${ms2.gym}× Gym, ${ms2.meas.length} Maße`);
  ok(!!(await page.$('.month-ph img[data-photo]')), 'Monatskarte zeigt das Fotopaar');
  await page.click('[data-a="energy-goal"][data-v="aufbau"]'); await page.clock.runFor(200);
  const ph = await ev(() => { const p = phaseStatus('2026-12-01'); return { mode: p.mode, st: p.st, lo: p.lo, r: p.r }; });
  ok(ph.mode === 'aufbau' && ph.lo === 0.25 && ph.st !== 'ok', `Phase Aufbau: Ziel ab 0,25 %/Woche, Ampel ${ph.st}`);
  await page.click('[data-a="energy-goal"][data-v="halten"]'); await page.clock.runFor(200);
  ok(await ev(() => phaseStatus('2026-12-01').st === 'ok'), 'Zurück auf Halten: Ampel grün (Stand gestern, vor dem Ausreißer)');
  await shot('v215-koerper-analyse');

  /* ---------- 5. Fotos: Vergleich, Zeitraffer, Kamera mit Schablone ---------- */
  await ev(() => { ui.sub.koerper = 'fotos'; render(); }); await page.clock.runFor(400);
  ok(!!(await page.$('.cmp-slide')) && !!(await page.$('#tl-img')), 'Vergleich mit Schieber und Zeitraffer da');
  await page.fill('.cmp-slide input[type=range]', '30'); await page.clock.runFor(50);
  ok((await page.$eval('.cmp-slide', (e) => e.style.getPropertyValue('--x'))) === '30%', 'Schieber verschiebt den Vergleich');
  ok(await ev(() => !photoWeeks().includes('2026-10-26') && photoWeeks().includes('2026-11-23')), 'Haut-Wochen ohne reine Physique-Wochen');
  await page.click('[data-a="cam-open"][data-angle="p_back"]');
  await page.waitForFunction(() => { const v = document.getElementById('cam-v'); return v && v.videoWidth > 0; }, null, { timeout: 8000 }).catch(() => {});
  await page.clock.runFor(300);
  ok(await ev(() => /Erstes Foto/.test(document.getElementById('cam-hint').textContent)), 'Kamera: „Hinten“ hat noch keine Schablone');
  await shot('v215-kamera');
  await page.click('[data-a="cam-shot"]');
  await page.waitForFunction(() => photoIdx.keys.includes('2026-11-30|p_back'), null, { timeout: 8000 }).catch(() => {});
  const cam = await ev(() => ({ saved: photoIdx.keys.includes('2026-11-30|p_back'), next: (document.getElementById('cam-t') || {}).textContent, ghost: !!(document.getElementById('cam-g') || {}).src }));
  ok(cam.saved && cam.next === 'Vorne', `Foto gespeichert, weiter mit „${cam.next}“`);
  await page.waitForFunction(() => /Schablone: KW/.test((document.getElementById('cam-hint') || {}).textContent || ''), null, { timeout: 5000 }).catch(() => {});
  ok(await ev(() => /Schablone: KW 48/.test(document.getElementById('cam-hint').textContent) && !!document.getElementById('cam-g').src), 'Vorne: Schablone vom letzten Check (KW 48)');
  await page.click('[data-a="cam-close"]'); await page.clock.runFor(200);
  ok(!(await page.$('#cam')), 'Kamera schließen');
  await ev(() => { ui.sub.haut = 'fotos'; go('haut'); }); await page.clock.runFor(300);
  ok(!!(await page.$('[data-a="cam-open"][data-angle="frontal"]')), 'Haut-Fotos: Kamera mit Schablone');

  /* ---------- 6. Fotos im Backup (für die KI) ---------- */
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), ev(() => shareBackup())]);
  const bk = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  const kinds = [...new Set((bk.photos || []).map((p) => p.kind))].sort().join(',');
  ok(Array.isArray(bk.photos) && bk.photos.length === 6 && kinds === 'haut,koerper' && bk.photos.every((p) => p.jpg && p.jpg.length > 500) && /1080/.test(bk.photoInfo || ''), `Backup enthält ${bk.photos.length} Fotos (${kinds}) mit Hinweis`);
  await ev(async () => { await PhotoDB.clear(); await loadPhotoIndex(); });
  await ev((data) => { ui.sheet = { type: 'import', data }; return A['import-do']({ dataset: { mode: 'replace' } }); }, bk);
  await page.clock.runFor(500);
  const back = await ev(async () => { await loadPhotoIndex(); return { n: photoIdx.keys.length, t: await PhotoDB.get('2026-11-23|p_front').then((r) => !!(r && r.thumb && r.full)) }; });
  ok(back.n === 6 && back.t, 'Import stellt alle 6 Fotos wieder her (mit Vorschaubild)');
  const n12 = await ev(async () => { S.settings.backupPhotos = '12w'; const a = (await photosForBackup()).length; S.settings.backupPhotos = 'keine'; const b = (await photosForBackup()).length; S.settings.backupPhotos = 'alle'; return [a, b]; });
  ok(n12[0] === 6 && n12[1] === 0, `Einstellung: letzte 12 Wochen + erste Fotos (${n12[0]}), keine (${n12[1]})`);

  /* ---------- 7. Heute: Körper-Check fällig, Monatskarte, nächster Tag: Essen unvollständig ---------- */
  await ev(() => { S.settings.koerper = { every: 3 }; go('heute'); }); await page.clock.runFor(300);
  const heute = await page.textContent('#main');
  ok(/Körper-Check fällig/.test(heute), 'Heute: Körper-Check fällig (Testintervall 3 Tage)');
  ok(/Monatskarte November/.test(heute), 'Heute (2. des Monats): Monatskarte November ist fertig');
  await page.click('[data-a="koerper-snooze"]'); await page.clock.runFor(200);
  ok(!/Körper-Check fällig/.test(await page.textContent('#main')), '„Morgen“ blendet den Check für heute aus');
  await page.click('[data-a="kmonth-open"]'); await page.clock.runFor(300);
  ok(await ev(() => ui.tab === 'koerper' && ui.sub.koerper === 'analyse' && /Monatskarte November/.test(document.querySelector('#main').textContent)), '„Ansehen“ öffnet die Monatskarte');
  await ev(() => { S.settings.koerper = { every: 28 }; mutDay('2026-12-02', (d) => { d.entries = [{ id: 'klein', food: 'c_essen', g: 300, meal: 'mittag', t: Date.now() }]; }); });
  await page.clock.setSystemTime(new Date('2026-12-03T07:30:00+01:00'));
  await ev(() => { go('heute'); }); await page.clock.runFor(300);
  const f0 = await ev(() => ({ ask: !!mcState(todayKey()).food, n: maintEstimate(todayKey()).n }));
  ok(f0.ask && !!(await page.$('#mcheck [data-a="mc-food"]')), 'Nächster Tag: „Nur 300 kcal erfasst – fehlt etwas?“');
  await page.click('#mcheck [data-a="mc-food"][data-v="ok"]'); await page.clock.runFor(200);
  const f1 = await ev(() => ({ ask: !!mcState(todayKey()).food, n: maintEstimate(todayKey()).n, ok: getDay('2026-12-02').foodOk }));
  ok(!f1.ask && f1.ok && f1.n === f0.n + 1, `„Passt so“ → der Tag zählt für die Erhaltungskalorien (${f0.n} → ${f1.n} Tage)`);
  await shot('v215-heute2');

  ok(errors.length === 0, 'Keine Fehler in der Konsole' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
})();
