// 2.14: Statistik ab dem ersten eigenen Eintrag, Prepmymeal-Gerichte decken den Beutel, Sauna/Kein Alkohol automatisch,
// Kraft-Autopilot mit gleichen Arbeitssätzen, flexible Woche (Gym/BJJ/Ergometer), Morgen-Check, Erhaltungskalorien
// aus Essen + Gewichtstrend, Schlaffenster ±30 Min., Experiment „1 statt 2 Monster“, Migration auch nach Backup-Import.
// Nur ausgedachte Testdaten (Repo ist öffentlich).
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
  await page.clock.install({ time: new Date('2026-11-16T09:05:00+01:00') }); // Montag
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  await page.clock.runFor(1200);
  const ev = (fn, a) => page.evaluate(fn, a);
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });

  /* ---------- Testdaten: 4 Wochen nur Garmin, ab 07.11. eigene Einträge ---------- */
  await ev(() => {
    S.foods.custom.push({ id: 'c_pmm1', n: 'prepmymeal Testbowl', cat: 'Fertiggerichte', base: 100, u: [['g', 1]], v: { kcal: 110, p: 9, f: 3, c: 11, na: 320 } });
    S.foods.custom.push({ id: 'c_essen', n: 'Testessen', cat: 'Eigene', base: 100, u: [['g', 1]], v: { kcal: 100, p: 8 } });
    buildFoodIndex();
    const night = (k, bed, wake, hrv) => mutDay(k, (d) => { Object.assign(d.health, { sleepScore: 85, sleepDur: 480, bedTime: bed, wakeTime: wake, hrv, rhr: 47, kcalTot: 2900, steps: 11000, sleepNeed: 480 }); });
    for (let i = 27; i >= 10; i--) night(addDays('2026-11-16', -i), '22:40', '07:10', 100); // vor der App: hohe HRV, nichts eingetragen
    mutDay('2026-10-21', (d) => { d.health.weight = 79.5; });
    for (let i = 9; i >= 1; i--) {
      const k = addDays('2026-11-16', -i);
      night(k, '22:45', '07:15', 85);
      mutDay(k, (d) => {
        d.entries = [{ id: 'p' + i, food: 'c_pmm1', g: 1000, meal: 'mittag', t: parseKey(k).getTime() + 13 * 3600000 }, { id: 'e' + i, food: 'c_essen', g: 2000, meal: 'abend', t: parseKey(k).getTime() + 19 * 3600000 }];
        d.checks = { n_schoko: 1 }; d.ct = { n_schoko: '16:00' }; // Schokolade am Nachmittag (wenig Koffein)
        d.caf = [{ id: 'm1' + i, p: 'monster_zero', n: 'Monster Energy Zero 500 ml', mg: 160, t: '09:30' }, { id: 'm2' + i, p: 'monster_zero', n: 'Monster Energy Zero 500 ml', mg: 160, t: '11:00' }];
      });
    }
    for (const k of ['2026-11-09', '2026-11-12', '2026-11-15']) mutDay(k, (d) => { d.sauna = [{ min: 20, t: '17:30' }]; });
    mutDay('2026-11-07', (d) => { d.health.weight = 80.2; }); mutDay('2026-11-08', (d) => { d.health.weight = 79.6; }); mutDay('2026-11-15', (d) => { d.health.weight = 78.7; });
    // Gym: Tag 3 (Oberkörper B) am 14.11. mit aufsteigenden Sätzen im Latzug
    mutDay('2026-11-14', (d) => { d.trainings = [{ id: 't14', type: 'Oberkörper B', time: '17:00', dur: 90, done: true, gym: { day: 3, sched: 'B', ex: { g_latzug: { s: [{ w: 50, r: 12, rir: 4, d: true }, { w: 60, r: 12, rir: 2.5, d: true }, { w: 70, r: 12, rir: 1, d: true }] } } } }]; });
    mutDay('2026-11-11', (d) => { d.trainings = [{ id: 't11', type: 'BJJ', time: '20:00', dur: 60, int: 9 }]; });
    // Ein älteres Backup kennt die 2.14-Entscheidungen noch nicht → Migration
    delete S.settings.mig; migrate214(); invalidate(); render();
  });
  await page.clock.runFor(300);

  /* ---------- 1. Migration (Entscheidungen vom 16.11.) ---------- */
  const mg = await ev(() => ({ mig: S.settings.mig, flex: weekFlex(), en: S.settings.energy, am: rtCfg().am.join(','), pm: rtCfg().pm.join(','), off: S.settings.habitsOff, offer: S.settings.expOffer, win: RH_WIN }));
  ok(mg.mig === 214 && mg.flex && mg.flex.gym === 3 && mg.flex.bjj === 2 && mg.flex.ergo === 1, 'Migration: flexible Woche mit Gym 3, BJJ 2, Ergometer 1');
  ok(mg.en.goal === 'halten' && mg.en.auto !== false, 'Migration: Kalorienziel „Halten“, automatisch');
  ok(mg.am.startsWith('mcheck,') && mg.pm === 'skin:pflege_pm,block:schlaf,bildschirm,mahlzeit,warm_dusche', 'Migration: Morgen-Check zuerst, Abendroutine auf 5 Punkte');
  ok(['dimmen', 'todo_morgen', 'handy'].every((x) => mg.off.includes(x)) && mg.offer === 'caf_dose', 'Migration: Selten Genutztes aus, Experiment angeboten');
  ok(mg.win === 30, 'Schlaffenster ±30 Min.');

  /* ---------- 2. Statistik ---------- */
  const st = await ev(() => {
    const it = findItem('p_beutel').it;
    const mu = muster().found;
    return { ts: trackStart(), cov: itemCovered(getDay('2026-11-12'), it), done: itemDone(getDay('2026-11-12'), it), rep: frankReportText('2026-11-09'), own: mu.filter((f) => MU_FEAT[f.fid].own).map((f) => f.nA + f.nB), habs: ['2026-11-12', '2026-11-13'].map((k) => ({ s: !!getDay(k).habits.sauna, a: !!getDay(k).habits.alkohol, ha: getDay(k).ha || {} })), today: !!getDay(todayKey()).habits.alkohol, last: cafInfo('2026-11-15').last, cafEnd: (getDay('2026-11-15').hd || {}).caffeineEnd };
  });
  ok(st.ts === '2026-11-07', 'Statistik beginnt mit dem ersten eigenen Eintrag (07.11.), Garmin-Tage davor zählen nicht');
  ok(st.own.every((n) => n <= 9), 'Muster vergleichen selbst erfasste Dinge (Koffein, Sauna …) nur innerhalb der erfassten Tage (' + st.own.join(', ') + ')');
  ok(st.cov && st.done && !st.rep.includes('[item:p_beutel]'), 'Prepmymeal-Gerichte decken den Beutel ab, Bericht nennt ihn nicht mehr als ausgelassen');
  ok(st.habs[0].s && st.habs[0].ha.sauna && st.habs[0].a && st.habs[1].a && !st.habs[1].s && !st.today, 'Sauna und „Kein Alkohol“ automatisch (vergangene Tage), heute noch nicht');
  ok(st.last === 660, 'Letztes Koffein 11:00 – Schokolade um 16:00 zählt nicht (' + minToTimeSafe(st.last) + ')');
  ok(st.rep.includes('Koffein ab') && !st.rep.includes('Koffein nur 10:00–14:30'), 'Wochenbericht: aktueller Name der Koffein-Gewohnheit');
  ok(!st.rep.includes('[habit:dimmen]') && st.rep.includes('[habit:sauna] 3/7'), 'Wochenbericht: ausgeblendete Gewohnheiten fehlen, Sauna 3/7');

  /* ---------- 3. Kraft-Autopilot ---------- */
  const kx = await ev(() => {
    const s = kxSuggest('g_latzug', 'B', false, '2026-11-18');
    const sets = kxWeekSets('2026-11-09');
    return { s, sets, card: kxCard('2026-11-16') };
  });
  ok(kx.s.tag === 'switch' && kx.s.w === 67.5 && kx.s.reps[0] === 12 && kx.s.reps.length === 3 && kx.s.why.includes('gleichen Gewicht'), `Rampe 50/60/70 kg → gleiche Arbeitssätze 3 × ${kx.s.w} kg (${kx.s.reps.join('/')})`);
  ok(kx.sets['Rücken'] === 2 && kx.sets['Bizeps'] === 1, 'Harte Sätze: Aufwärmsatz (4+ in Reserve) zählt nicht (' + kx.sets['Rücken'] + ' Rücken)');
  ok(kx.card.includes('Aufwärmsätze') && kx.card.includes('Robinson 2024'), 'Autopilot erklärt Aufwärmen und Nähe zum Versagen mit Quelle');
  await ev(() => mutDay('2026-11-18', (d) => { d.trainings = [{ id: 't18', type: 'Oberkörper B', time: '17:00', dur: 80, done: true, gym: { day: 3, sched: 'B', ex: { g_latzug: { s: [{ w: 67.5, r: 12, rir: 2.5, d: true }, { w: 67.5, r: 12, rir: 1, d: true }, { w: 67.5, r: 12, rir: 1, d: true }] } } } }]; }));
  const kx2 = await ev(() => kxSuggest('g_latzug', 'B', false, '2026-11-25'));
  ok(kx2.tag === 'up' && kx2.w === 70, `Danach doppelte Progression: 3 × 12 mit 67,5 kg → ${kx2.w} kg`);
  await ev(() => mutDay('2026-11-18', (d) => { d.trainings = []; }));

  /* ---------- 4. Flexible Woche ---------- */
  const fw = await ev(() => { const wp = weekPlan(weekStart(todayKey())); return { today: wp.days[0].items.map((x) => x.n), flex: wp.flex, gar: garGymDay(todayKey()), mot: kxMotivation(todayKey()), rep: frankReportText('2026-11-09'), ergo: isErgo({ type: 'Ergometer' }) && isErgo({ type: 'Rad' }), tile: tileHTML('train', todayKey()) }; });
  ok(fw.today[0] === 'Möglich: Oberkörper A' && fw.gar === 1, 'Nach Tag 3 ist heute Oberkörper A dran (Vorschlag und Garmin-Zuordnung)');
  ok(fw.flex.gym === 0 && fw.flex.left.gym === 3 && fw.flex.daysLeft === 7 && fw.mot === null, 'Wochenziel offen, aber keine Mahnung am Montag nach 2 Tagen Pause');
  ok(fw.rep.includes('flexible Woche ohne feste Tage: Gym 1/3 · BJJ 1/2 · Ergometer 0/1'), 'Wochenbericht: Gym, BJJ und Ergometer gegen die Wochenziele');
  ok(fw.ergo && fw.tile.includes('Oberkörper A') && fw.tile.includes('möglich'), 'Ergometer und Rad zählen, Kachel: „möglich“');
  await ev(() => mutDay('2026-11-17', (d) => { d.trainings = [{ id: 't17', type: 'Oberkörper A', time: '17:00', dur: 80, done: true, gym: { day: 1, sched: 'A', ex: {} } }]; }));
  await page.clock.setSystemTime(new Date('2026-11-21T10:00:00+01:00')); // Samstag: 1 von 3, noch 2 Tage
  const sat = await ev(() => { invalidate(); return { mot: kxMotivation(todayKey()), next: gymNext(todayKey()), notes: weekPlan(weekStart(todayKey())).notes }; });
  ok(sat.mot && sat.mot.lvl === 1 && sat.mot.t.includes('Noch 2 Gym-Einheiten') && sat.mot.s.includes('Unterkörper') && sat.next === 2 && !sat.notes.length, 'Samstag, 1 von 3: Erinnerung mit dem nächsten Gym-Tag (Unterkörper)');
  await page.clock.setSystemTime(new Date('2026-11-22T10:00:00+01:00')); // Sonntag: geht nicht mehr auf
  const sun = await ev(() => { invalidate(); return weekPlan(weekStart(todayKey())).notes; });
  ok(sun.some((n) => n.includes('nur noch 1 Tag')), 'Sonntag: Hinweis, lieber eine Einheit auszulassen als zwei an einem Tag');
  await ev(() => mutDay('2026-11-17', (d) => { d.trainings = []; }));
  await page.clock.setSystemTime(new Date('2026-11-16T09:05:00+01:00'));
  await ev(() => invalidate());

  /* ---------- 5. Morgen-Check ---------- */
  await ev(() => go('heute', { scrollTop: true })); await page.clock.runFor(300);
  ok(!!(await page.$('#mcheck')) && !(await page.$('.card.knee-am')), 'Heute: Morgen-Check sichtbar, die einzelne Knie-Karte entfällt');
  const pp0 = await ev(() => pushPlan().filter((x) => ['mcheck', 'abend', 'h-warmdusche', 'knie'].some((t) => x.tag.startsWith(t))).map((x) => `${x.tag}@${minToTime(new Date(x.at).getHours() * 60 + new Date(x.at).getMinutes())}|${x.url}`));
  ok(pp0.some((x) => x.startsWith('abend-11-16')) && pp0.some((x) => x.startsWith('mcheck-11-17') && x.endsWith('|#mcheck')) && !pp0.some((x) => x.startsWith('h-warmdusche') || x.startsWith('knie')), 'Mitteilungen: abends eine Erinnerung, morgens der Morgen-Check (' + pp0.join(', ') + ')');
  await shot('v214-01-heute');
  await page.click('#mcheck [data-a="mc-all"]'); await page.clock.runFor(200);
  const y = await ev(() => { const d = getDay('2026-11-15'); return { pm: !!d.skin.pflege_pm, mg: !!d.checks.s_mg, mgT: (d.ct || {}).s_mg, h: ['bildschirm', 'mahlzeit', 'warm_dusche'].every((x) => d.habits[x]), mc: d.mc }; });
  ok(y.pm && y.mg && /^\d\d:\d\d$/.test(y.mgT || '') && y.h && Object.values(y.mc).every((v) => v === 1), `„Alles ja“: Hautpflege, Magnesium (${y.mgT}), Bildschirm, Mahlzeit, Dusche für gestern eingetragen`);
  await page.click('#mcheck [data-a="knee-am"][data-v="2"]'); await page.clock.runFor(100);
  await page.click('#mcheck [data-a="skin-score"][data-v="6"]'); await page.clock.runFor(100);
  ok(!!(await page.$('#mcheck')), 'Ohne Gewicht noch offen');
  await page.fill('#mcheck input[data-k="weight"]', '78,9'); await page.dispatchEvent('#mcheck input[data-k="weight"]', 'change'); await page.clock.runFor(300);
  const after = await ev(() => ({ st: mcState(todayKey()), am: kneeAm(todayKey()), sc: getDay(todayKey()).skin.score, w: getDay(todayKey()).health.weight, card: !!document.getElementById('mcheck'), push: pushPlan().filter((x) => x.tag.startsWith('mcheck') && dkey(new Date(x.at)) === todayKey()).length, step: rtStep('mcheck', todayKey()).done }));
  ok(after.st.done && after.am === 2 && after.sc === 6 && after.w === 78.9 && !after.card && after.step, 'Knie 2, Haut 6, Gewicht 78,9 → Morgen-Check fertig, Karte weg, Routine-Schritt erledigt');
  await ev(() => mcSet('2026-11-17', 'warm_dusche', false));
  ok(await ev(() => !!getDay('2026-11-16').hno.warm_dusche && getDay('2026-11-16').mc.warm_dusche === 0), '„Nein“ wird als nicht gemacht gespeichert');
  const set = await ev(() => ({ r: SET_VIEWS.routinen(), t: SET_VIEWS.training(), card: routineCard(todayKey()) }));
  ok(set.r.includes('Morgen-Check') && set.t.includes('Flexible Woche') && set.t.includes('Ergometer pro Woche') && set.card.includes('Abhaken musst du hier nichts') === false, 'Einstellungen: Morgen-Check und flexible Woche; Abendroutine-Hinweis nur aufgeklappt');

  /* ---------- 6. Erhaltungskalorien ---------- */
  const en = await ev(() => { energyApply(); const s = energyStats(); return { src: s.src, me: s.me, target: s.target, offset: s.offset, why: s.why, kcal: S.settings.targets.kcal, card: energyCard(todayKey()) }; });
  ok(en.src === 'eigen' && en.me.n === 9 && en.me.intake > 2900 && en.me.corr > 0, `Erhaltungsbedarf aus Essen (${en.me.intake} kcal, ${en.me.n} Tage) + Gewichtstrend (${en.me.corr} kcal) = ${en.me.est}`);
  ok(en.target === Math.round((en.me.est + en.offset) / 50) * 50 && !en.why.some((w) => w.includes('Gewicht sinkt')) && en.kcal.lo === en.target - 100 && en.kcal.hi === en.target + 100, `Kalorienziel „Halten“ = ${en.target} kcal (${en.kcal.lo}–${en.kcal.hi}; ${en.why.join(', ')})`);
  ok(en.card.includes('Erhaltungsbedarf') && en.card.includes('20–30 %'), 'Energie-Karte erklärt die Rechnung');

  /* ---------- 7. Experiment ---------- */
  await ev(() => { go('heute', { scrollTop: true }); }); await page.clock.runFor(200);
  await page.click('[data-a="exp-start"][data-id="caf_dose"]'); await page.clock.runFor(200);
  const ex = await ev(() => ({ id: (S.settings.exp || {}).id, offer: S.settings.expOffer, a1: EXPS.caf_dose.comply('2026-11-15', 'A'), b1: EXPS.caf_dose.comply('2026-11-15', 'B') }));
  await ev(() => mutDay('2026-11-15', (d) => { d.caf = d.caf.slice(0, 1); }));
  const ex2 = await ev(() => ({ a: EXPS.caf_dose.comply('2026-11-15', 'A'), b: EXPS.caf_dose.comply('2026-11-15', 'B') }));
  ok(ex.id === 'caf_dose' && !ex.offer && !ex.a1 && ex.b1 && ex2.a && !ex2.b, 'Experiment „1 statt 2 Monster“ gestartet; 2 Dosen = B, 1 Dose = A');

  /* ---------- 8. Backup-Import eines älteren Stands ---------- */
  const imp = await ev(async () => {
    const data = JSON.parse(JSON.stringify(exportData()));
    delete data.settings.mig; delete data.settings.weekFlex; data.settings.energy = { goal: 'recomp' }; data.settings.routines.pm = ['mahlzeit', 'warm_dusche', 'block:schlaf', 'skin:pflege_pm', 'handy', 'todo_morgen', 'bildschirm', 'dimmen'];
    ui.sheet = { type: 'import', data }; await A['import-do']({ dataset: { mode: 'replace' } });
    return { mig: S.settings.mig, flex: !!weekFlex(), goal: S.settings.energy.goal, pm: rtCfg().pm.length };
  });
  ok(imp.mig === 214 && imp.flex && imp.goal === 'halten' && imp.pm === 5, 'Import eines älteren Backups: 2.14-Umstellung greift erneut');
  await shot('v214-02-nach-import');

  /* ---------- 9. Wochen-Agent: abgeschnittene Antwort retten ---------- */
  const ag = await ev(() => {
    const t = '```json\n{"goals":[{"area":"haut","title":"Abendpflege an 5 Tagen","metric":"routine:pflege_pm","agg":"days","cmp":">=","value":1,"need":5,"why":"Hautscore gefallen"},{"area":"knie","title';
    const j = aiJSON(t), okA = agentApply('2026-11-09', t, 'test-cut');
    return { cut: j && j._cut, n: j && j.goals.length, okA, a: S.reviews['2026-11-09'].agent, goals: weekGoals('2026-11-16').map((g) => g.title), card: agentCard('2026-11-09') };
  });
  ok(ag.cut && ag.n === 1 && ag.okA && ag.a.cut && ag.goals.includes('Abendpflege an 5 Tagen') && ag.card.includes('unvollständig'), 'Abgeschnittene Agenten-Antwort: vollständige Ziele übernommen, Hinweis mit „Neu auswerten“');

  ok(!errors.length, errors.length ? errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.log('ABBRUCH', e); process.exitCode = 1; });
function minToTimeSafe(m) { if (m == null) return '–'; const h = Math.floor(m / 60) % 24, mm = m % 60; return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; }
