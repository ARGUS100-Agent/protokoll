// 2.17 (Paket 2 der Ideen vom 18.11.): Bestwerte, Muskel-Karte, relative Kraft, Rechner, Pausen-Timer, Block/Deload,
// Technik-Notiz, Formcheck, Knie-Schmerzort/Auslöser, Sprung-Symmetrie, Alltagscheck, Garmin „Sonstiges“, BJJ-Journal
// mit Technik-Karten, Athletik-Profil, Ausdauer-Test, Ergometer-Programm. Nur ausgedachte Testdaten.
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, timezoneId: 'Europe/Berlin', locale: 'de-DE', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.clock.install({ time: new Date('2026-12-09T08:00:00+01:00') }); // Mittwoch
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  await page.clock.runFor(1200);
  const ev = (fn, a) => page.evaluate(fn, a);
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
  const toastTxt = () => ev(() => [...document.querySelectorAll('.toast, #toast')].map((e) => e.textContent).join(' '));

  await ev(() => {
    S.settings.profile.age = 30;
    for (let i = 0; i < 21; i++) mutDay(addDays('2026-12-08', -i), (d) => { d.health.weight = 80; d.health.rhr = 50; });
    const gym = (k, w) => mutDay(k, (d) => { d.trainings = [{ id: 't' + k, type: 'Oberkörper A', time: '17:00', dur: 70, done: true, gym: { day: 1, sched: 'A', ex: { g_schraeg_lh: { s: [{ w, r: 6, rir: 2, d: true }, { w, r: 6, rir: 2, d: true }] }, g_klimmzug: { s: [{ w: 10, r: 6, rir: 2, d: true }] } } } }]; });
    gym('2026-11-04', 80); gym('2026-11-18', 82.5); gym('2026-12-02', 85);
    mutDay('2026-12-08', (d) => { d.trainings = [{ id: 'sonst', type: 'Sonstiges', time: '20:05', dur: 60, gid: 'g1' }]; });
    invalidate(); render();
  });
  await page.clock.runFor(300);

  /* ---------- Garmin „Sonstiges“ → BJJ → Journal → Technik-Karten ---------- */
  ok(/Was war das\?/.test(await page.textContent('#main')), 'Heute fragt nach der unbekannten Garmin-Einheit');
  await page.click('[data-a="unk-type"][data-v="BJJ"]'); await page.clock.runFor(200);
  const t8 = await ev(() => getDay('2026-12-08').trainings[0]);
  ok(t8.type === 'BJJ' && t8.asked === 1, '„BJJ“ → Einheit als BJJ eingetragen');
  ok(!!(await page.$('[data-a="bjj-open"]')), 'Danach: BJJ-Notiz anbieten');
  await page.click('[data-a="bjj-open"]'); await page.clock.runFor(200);
  await page.fill('#sheet textarea[data-c="bjj-tech"]', 'Armbar aus der Guard, Hip Escape'); await page.dispatchEvent('#sheet textarea[data-c="bjj-tech"]', 'change');
  await page.click('#sheet [data-a="bjj-val"][data-f="rolls"][data-v="5"]'); await page.clock.runFor(100);
  await page.click('#sheet [data-a="bjj-knee"][data-v="2"]'); await page.clock.runFor(100);
  await page.click('#sheet [data-a="bjj-done"]'); await page.clock.runFor(200);
  const bj = await ev(() => ({ j: getDay('2026-12-08').trainings[0].bjj, cards: bjjCfg().cards.map((c) => c.n + '@' + c.due) }));
  ok(bj.j.rolls === 5 && bj.j.knee === 2 && bj.j.tech.length === 2 && bj.cards.length === 2 && bj.cards.every((c) => c.endsWith('@2026-12-10')), `BJJ-Journal gespeichert, 2 Technik-Karten fällig ab morgen (${bj.cards.join(', ')})`);

  /* ---------- Knie: Schmerzort und Auslöser ---------- */
  await ev(() => { kneeCfg().start = '2026-11-01'; render(); }); await page.clock.runFor(200);
  const kneeSel = (await page.$('#mcheck [data-a="knee-loc"]')) ? '#mcheck ' : '';
  await page.click(`${kneeSel}[data-a="knee-loc"][data-v="innen"]`); await page.clock.runFor(100);
  await page.click(`${kneeSel}[data-a="knee-flag"][data-v="Instabilität"]`); await page.clock.runFor(100);
  ok(!!(await page.$(`${kneeSel}[data-a="knee-trig"]`)), 'Bei „Instabilität“ fragt die App: wobei?');
  await page.click(`${kneeSel}[data-a="knee-trig"][data-v="BJJ"]`); await page.clock.runFor(100);
  await ev(() => mutDay('2026-12-01', (d) => { d.knee = { flags: ['Instabilität'], trig: ['Drehung'] }; }));
  const kp = await ev(() => kneePattern());
  ok(kp.loc[0][0] === 'innen' && kp.trig.length === 2 && kp.flags[0][1] === 2, 'Muster: Schmerzort innen, Instabilität 2× (BJJ, Drehung)');
  await ev(() => { ui.sub.knie = 'heute'; go('knie'); }); await page.clock.runFor(200);
  ok(/Instabilität 2× in 30 Tagen/.test(await page.textContent('#main')), 'Knie → Heute: Warnhinweis bei wiederholter Instabilität');

  /* ---------- Knie-Tests: Sprung-Symmetrie, Alltagscheck ---------- */
  await ev(() => { ui.sub.knie = 'tests'; render(); }); await page.clock.runFor(200);
  await page.click('[data-a="test-new"]'); await page.clock.runFor(200);
  await page.fill('#sheet [data-tf="hopL"]', '150'); await page.fill('#sheet [data-tf="hopR"]', '130');
  await page.click('#sheet [data-a="test-save"]'); await page.clock.runFor(300);
  const lsi = await ev(() => { const t = kneeTests().slice(-1)[0]; return hopLsi(t); });
  ok(Math.abs(lsi - 86.7) < 0.1 && !!(await page.$('.ampel.is-warn')), `Sprung-Symmetrie ${lsi.toFixed(1)} % (unter 90 % markiert)`);
  await page.click('[data-a="kcheck-open"]'); await page.clock.runFor(150);
  for (const [id, v] of [['treppe', 1], ['hocke', 2], ['drehen', 3], ['sprint', 2], ['vertrauen', 2]]) { await page.click(`#sheet [data-a="kcheck"][data-id="${id}"][data-v="${v}"]`); await page.clock.runFor(60); }
  await page.click('#sheet [data-a="kcheck-done"]'); await page.clock.runFor(150);
  ok(await ev(() => (S.settings.kneeCheck || [])[0].sum === 10), 'Alltagscheck: Summe 10/20');

  /* ---------- Bestwerte, Muskel-Karte, Block ---------- */
  await ev(() => { ui.sub.train = 'kraft'; go('train'); }); await page.clock.runFor(300);
  const kr = await page.textContent('#main');
  ok(/Bestwerte/.test(kr) && /Schrägbankdrücken LH/.test(kr) && /Körpergewicht/.test(kr), 'Bestwerte mit relativer Kraft');
  ok(!!(await page.$('.mu-map .mu')) && !!(await page.$('#pr svg, [id^="chart-pr"] svg, .chart')), 'Muskel-Karte und e1RM-Verlauf');
  await page.click('[data-a="block-start"]'); await page.clock.runFor(200);
  ok(await ev(() => blockInfo().n === 1 && blockInfo().len === 5), 'Block gestartet: Woche 1 von 5');
  await ev(() => { S.settings.gym.block.start = addDays(weekStart(todayKey()), -28); render(); }); await page.clock.runFor(200);
  await page.click('[data-a="block-deload"]'); await page.clock.runFor(200);
  ok(await ev(() => blockInfo().deload && deloadOn(todayKey())), 'Woche 5 von 5 → Deload-Woche gestartet');
  await shot('v217-bestwerte');

  /* ---------- Gym-Einheit: Rechner, Notiz, Formcheck, Bestwert, Pausen-Timer ---------- */
  await ev(() => { mutDay(todayKey(), (d) => { d.trainings = [{ id: 'heute', type: 'Oberkörper A', time: '08:00', gym: { day: 1, sched: 'A', ex: {} } }]; }); ui.gymSess = { k: todayKey(), id: 'heute' }; go('train'); });
  await page.clock.runFor(300);
  await page.click('[data-a="calc-open"][data-ex="g_schraeg_lh"]'); await page.clock.runFor(150);
  await page.fill('#sheet input[data-c="calc-w"]', '100'); await page.dispatchEvent('#sheet input[data-c="calc-w"]', 'change'); await page.clock.runFor(150);
  const calc = await page.textContent('#sheet');
  ok(/40 kg/.test(calc) && /90 kg/.test(calc) && /25 \+ 15/.test(calc), 'Rechner: Aufwärmen 40/60/80/90 kg, 100 kg = 25 + 15 pro Seite');
  await page.click('#sheet .sheet-acts [data-a="sheet-close"]'); await page.clock.runFor(150);
  await page.click('[data-a="ex-note"][data-ex="g_schraeg_lh"]'); await page.clock.runFor(150);
  await page.fill('#sheet textarea[data-c="ex-note"]', 'Bank Stufe 3, Griff 2 Finger breiter'); await page.dispatchEvent('#sheet textarea[data-c="ex-note"]', 'change');
  await page.click('#sheet .sheet-acts [data-a="sheet-close"]'); await page.clock.runFor(200);
  ok(/Bank Stufe 3/.test(await page.textContent('#main')), 'Technik-Notiz steht in der Übung');
  await page.setInputFiles('input[data-c="formcheck"][data-ex="g_schraeg_lh"]', { name: 'satz.mp4', mimeType: 'video/mp4', buffer: Buffer.from('00000020667479706d703432', 'hex') });
  await page.clock.runFor(200);
  ok(!!(await page.$('#sheet video.fc-video')) && !!(await page.$('#sheet [data-a="fc-rate"][data-v="0.25"]')), 'Formcheck: Video mit Zeitlupe');
  await page.click('#sheet .sheet-acts [data-a="sheet-close"]'); await page.clock.runFor(150);
  await page.fill('input[data-c="gym-val"][data-ex="g_schraeg_lh"][data-i="0"][data-f="w"]', '90'); await page.dispatchEvent('input[data-c="gym-val"][data-ex="g_schraeg_lh"][data-i="0"][data-f="w"]', 'change');
  await page.fill('input[data-c="gym-val"][data-ex="g_schraeg_lh"][data-i="0"][data-f="r"]', '6'); await page.dispatchEvent('input[data-c="gym-val"][data-ex="g_schraeg_lh"][data-i="0"][data-f="r"]', 'change');
  await page.clock.runFor(150);
  const was = await ev(() => { const e = curTraining().gym.ex.g_schraeg_lh; return !!(e && e.s[0] && e.s[0].d); });
  if (!was) { await page.click('[data-a="gym-set"][data-ex="g_schraeg_lh"][data-i="0"]'); await page.clock.runFor(200); }
  const pr = await ev(() => prCheck('g_schraeg_lh', 90, 6, null, 'heute'));
  ok(/Höchstgewicht/.test(pr || ''), `Bestwert erkannt: ${pr}`);
  ok(!!(await page.$('#rest')) && /Pause/.test(await page.textContent('#rest')), 'Pausen-Timer startet nach dem Satz');
  await page.clock.runFor(181000);
  ok(/Pause vorbei/.test(await page.textContent('#rest')), 'Nach 3 Min.: „Pause vorbei“');
  await page.click('#rest [data-a="rest-stop"]'); await page.clock.runFor(100);
  await shot('v217-gym');
  await ev(() => { ui.gymSess = null; render(); });

  /* ---------- Athletik: Profil, Ausdauer-Test, Ergometer-Programm ---------- */
  await ev(() => { S.settings.athTests = [{ date: '2026-09-01', v: { pull: 8, push: 30, plank: 90, jump: 210, grip: 48, ergo: 4.4, rhr: 52 } }]; S.settings.ergoTests = [{ date: '2026-11-09', w: 165, hr: 150 }]; ui.sub.train = 'athletik'; go('train'); });
  await page.clock.runFor(200);
  await page.click('[data-a="ath-open"]'); await page.clock.runFor(150);
  for (const [f, v] of [['pull', '10'], ['push', '35'], ['plank', '100'], ['jump', '215'], ['grip', '50'], ['ergo', '4,2']]) { await page.fill(`#sheet input[data-f="${f}"]`, v); await page.dispatchEvent(`#sheet input[data-f="${f}"]`, 'change'); }
  await page.click('#sheet [data-a="ath-done"]'); await page.clock.runFor(200);
  const at = await ev(() => athTests().slice(-1)[0]);
  ok(at.v.pull === 10 && at.v.ergo === 4.2 && at.v.rhr === 50 && !!(await page.$('.radar .rd-cur')) && !!(await page.$('.radar .rd-prev')), 'Athletik-Test gespeichert (Ruhepuls von Garmin), Netz mit alt und neu');
  await page.fill('input[data-c="ergo-test"][data-f="w"]', '180'); await page.dispatchEvent('input[data-c="ergo-test"][data-f="w"]', 'change');
  await page.fill('input[data-c="ergo-test"][data-f="hr"]', '150'); await page.dispatchEvent('input[data-c="ergo-test"][data-f="hr"]', 'change');
  await ev(() => render()); await page.clock.runFor(200);
  ok(await ev(() => ergoTests().length === 2 && ergoTests()[1].w === 180), 'Ausdauer-Test: 180 W bei Puls 150 (vorher 165 W)');
  await shot('v217-athletik');
  await page.click('[data-a="ergo-start"][data-v="4x4"]'); await page.clock.runFor(600);
  ok(/Einfahren/.test(await page.textContent('#ergo')) && /Puls 1\d\d–1\d\d/.test(await page.textContent('#ergo')), 'Ergo 4×4: Phase „Einfahren“ mit Pulsbereich');
  await page.click('[data-a="ergo-skip"]'); await page.clock.runFor(600);
  ok(/Intervall 1\/4/.test(await page.textContent('#ergo')), 'Nächste Phase: Intervall 1/4');
  await page.clock.runFor(6 * 60 * 1000);
  await page.click('[data-a="ergo-stop"]'); await page.clock.runFor(300);
  const er = await ev(() => getDay(todayKey()).trainings.find((t) => t.type === 'Ergometer'));
  ok(er && er.dur >= 5 && er.note === '4×4-Intervalle', `Ergometer-Einheit eingetragen (${er && er.dur} Min.)`);

  /* ---------- nächster Tag: Technik wiederholen ---------- */
  await page.clock.setSystemTime(new Date('2026-12-10T08:00:00+01:00'));
  await ev(() => go('heute')); await page.clock.runFor(300);
  ok(/Technik wiederholen/.test(await page.textContent('#main')), 'Nächster Tag: Technik-Karte fällig');
  await page.click('[data-a="bjj-rep"][data-v="1"]'); await page.clock.runFor(200);
  ok(await ev(() => bjjCfg().cards.some((c) => c.step === 1 && c.due === '2026-12-13')), '„Sitzt“ → wieder in 3 Tagen');

  ok(errors.length === 0, 'Keine Fehler in der Konsole' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
})();
