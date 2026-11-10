// 2.7.0: Migration (Prepmymeal-Beutel, Monster Zero, Koffein-Stopp), Tagesrhythmus, Bereitschaft,
// Gym-Zuordnung, Alternativen & Snacks, Energiebilanz, Ziele im Rhythmus – nur erfundene Daten
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
  // Dienstag, 10. Nov. 2026, 19:40
  await page.clock.install({ time: new Date('2026-11-10T19:40:00+01:00') });
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const ready = async () => { for (let i = 0; i < 20; i++) { await page.clock.runFor(500); if (await ev(() => !!(S.meta && document.body.classList.contains('ready')))) break; } };
  await ready();

  /* ---------- 1. Bestehende Installation (Schema 4) mit erfundenen Daten ---------- */
  await ev(async () => {
    const set = clone(S.settings);
    const plan = clone(DEFAULT_PLAN).filter((b) => b.id !== 'pmm');
    const blk = (id) => plan.find((b) => b.id === id);
    blk('fruehstueck').items.push({ id: 'f_pmm', food: 'prepmymeal', choice: PMM_CHOICES, cg: 'pmm', a: 200, u: 'g', label: 'Prepmymeal' });
    blk('mittag').items.push({ id: 'l_pmm', food: 'prepmymeal', choice: PMM_CHOICES, cg: 'pmm', a: 600, u: 'g', label: 'Prepmymeal' });
    blk('nachmittag').items.push({ id: 'n_pmm', food: 'prepmymeal', choice: PMM_CHOICES, cg: 'pmm', a: 200, u: 'g', label: 'Prepmymeal' });
    for (const b of plan) { b.items = b.items.filter((it) => it.id !== 'a_kokos'); for (const it of b.items) { if (['m_wasser', 'm_wasser2'].includes(it.id)) it.food = 'wasser'; if (it.id === 'l_oel') it.opt = false; } }
    set.plan = plan;
    set.caf = { halfLife: 5, cutoff: '15:00', presets: [{ id: 'kaffee', n: 'Kaffee', ml: 200, mg: 90 }, { id: 'monster', n: 'Monster Energy 500 ml', ml: 500, mg: 160, kcal: 235, sug: 55 }, { id: 'monster_ultra', n: 'Monster Ultra 500 ml', ml: 500, mg: 150, kcal: 10, sug: 0 }] };
    set.profile = { ...set.profile, name: 'Test', weight: 80, wake: '08:30', sleep: '22:30' };
    delete set.waterFood;
    const foods = { custom: [{ id: 'c_curry', n: 'Prepmymeal Test-Curry', cat: 'Fertiggerichte', base: 100, u: [['g', 1]], v: { kcal: 120, p: 9, f: 4, c: 11, na: 400 }, tags: ['upf'] }], over: {} };
    const days = {
      '2026-11-03': { ...blankDay('2026-11-03'), checks: { f_pmm: 1, l_pmm: 1 }, choice: { pmm: 'c_curry' }, ct: { l_pmm: '12:30' }, caf: [{ id: 'c1', p: 'monster', n: 'Monster Energy 500 ml', mg: 160, ml: 500, kcal: 235, sug: 55, t: '10:00' }] },
      '2026-11-09': { ...blankDay('2026-11-09'), trainings: [{ id: 't1', type: 'Gym (frei)', time: '17:00', dur: 70, int: null, gid: 'g-test-1' }] },
    };
    const entries = [['settings', set], ['meta', { ...S.meta, schema: 4 }], ['foods', foods]];
    for (const [k, v] of Object.entries(days)) entries.push(['day:' + k, v]);
    await DB.clear(); await DB.putMany(entries);
  });
  await page.reload({ waitUntil: 'load' });
  await ready();
  const mig = await ev(() => {
    const d3 = getDay('2026-11-03'), mon = getDay('2026-11-09').trainings[0];
    return {
      schema: S.meta.schema, gap: S.settings.caf.gapH, water: S.settings.waterFood,
      presets: S.settings.caf.presets.map((p) => p.id).join(','),
      beutel: S.settings.plan.some((b) => b.id === 'pmm' && b.items.some((it) => it.id === 'p_beutel')),
      oldItems: S.settings.plan.some((b) => b.items.some((it) => ['f_pmm', 'l_pmm', 'n_pmm'].includes(it.id))),
      kokos: S.settings.plan.some((b) => b.items.some((it) => it.id === 'a_kokos')),
      wasser: S.settings.plan.flatMap((b) => b.items).filter((it) => ['m_wasser', 'm_wasser2'].includes(it.id)).map((it) => it.food).join(','),
      oel: (S.settings.plan.flatMap((b) => b.items).find((it) => it.id === 'l_oel') || {}).opt,
      entries: d3.entries.map((e) => `${e.food} ${e.g} ${e.meal} ${new Date(e.t).toTimeString().slice(0, 5)}`),
      checks: Object.keys(d3.checks), caf: d3.caf.map((c) => `${c.p} ${c.kcal} ${c.sug}`),
      upfTag: (S.foods.custom[0].tags || []).includes('upf'), upf: Math.round(metricValue('upf', computeTotals('2026-11-03', false).tot, 0)),
      gym: mon.type + ' ' + (mon.gym ? mon.gym.day + mon.gym.sched : '-'), plannedMon: weekTpl(0).gym,
    };
  });
  ok(mig.schema === 5, 'Migration auf Schema 5');
  ok(mig.beutel && !mig.oldItems, 'Prepmymeal: ein Beutel im eigenen Block statt drei Posten');
  ok(mig.entries.length === 2 && mig.entries.includes('c_curry 200 fruehstueck 09:00') && mig.entries.includes('c_curry 600 mittag 12:30') && !mig.checks.length, 'Alte Prepmymeal-Haken werden Einträge mit Gericht, Menge und Uhrzeit: ' + mig.entries.join(' / '));
  ok(mig.caf[0] === 'monster_zero 15 0' && mig.presets === 'kaffee,monster_zero', 'Monster mit Zucker und Ultra → Monster Zero (Eintrag und Knöpfe)');
  ok(mig.water === 'saskia' && mig.wasser === 'saskia,saskia' && mig.kokos && mig.oel === true, 'Wasser = Saskia, Kokoswasser zum Shake, Öl zum Mittag optional');
  ok(!mig.upfTag && mig.upf === 0, 'Prepmymeal zählt nicht als ultraverarbeitet');
  ok(mig.gap === 7.5, 'Koffein-Stopp 15:00 bei Schlafenszeit 22:30 → 7,5 Std. vor dem Schlafen');
  ok(mig.gym === 'Oberkörper A 1' + (await ev(() => gymSched('2026-11-09'))) && mig.plannedMon === 1, 'Garmin-Krafttraining dieser Woche → geplanter Gym-Tag (Montag: Oberkörper A)');

  /* ---------- 2. Tagesrhythmus aus Garmin ---------- */
  await ev(() => {
    for (let i = 1; i <= 21; i++) {
      const k = addDays('2026-11-10', -i);
      const w = weekday(k) === 2 ? '06:30' : '07:30'; // mittwochs früh raus
      mutDay(k, (d) => { d.health = { ...d.health, wakeTime: w, sleepNeed: 480, sleepDur: 450, sleepScore: 80, rhr: 50, stress: 30 }; d.gar = { ...(d.gar || {}), wakeTime: w, sleepNeed: 480 }; });
    }
    mutDay('2026-11-10', (d) => { d.health = { ...d.health, wakeTime: '07:05', sleepNeed: 480 }; d.gar = { ...(d.gar || {}), wakeTime: '07:05', sleepNeed: 480 }; });
  });
  const rh = await ev(() => {
    const r = rhythm('2026-11-10'), d = getDay('2026-11-10');
    const bt = (id) => minToTime(resolveBlockTime(S.settings.plan.find((b) => b.id === id), d));
    return { wake: minToTime(r.wake), src: r.wakeSrc, next: minToTime(r.wakeNext), nextSrc: r.bedSrc, bed: minToTime(r.bed), cut: minToTime(cafCutoff('2026-11-10')), win: cafWindow('2026-11-10').map(minToTime).join('–'),
      morgen: bt('morgen'), fr: bt('fruehstueck'), mittag: bt('mittag'), abend: bt('abend'), schlaf: bt('schlaf') };
  });
  ok(rh.wake === '07:05' && rh.src === 'garmin', 'Aufgewacht laut Garmin: 07:05');
  ok(rh.next === '06:30' && rh.nextSrc === 'wochentag', 'Morgen (Mittwoch) wie meist um 06:30 raus');
  ok(rh.bed === '22:15', 'Schlafenszeit 06:30 − 8 Std. Schlafbedarf − 15 Min. = 22:15 (' + rh.bed + ')');
  ok(rh.cut === '14:45' && rh.win === '08:35–14:45', 'Koffein 90 Min. nach dem Aufstehen bis 7,5 Std. vor dem Schlafen: ' + rh.win);
  ok(rh.morgen === '07:05' && rh.fr === '07:35' && rh.mittag === '13:00' && rh.abend === '19:15' && rh.schlaf === '21:30', `Plan-Blöcke wandern mit: ${rh.morgen} / ${rh.fr} / ${rh.mittag} / ${rh.abend} / ${rh.schlaf}`);
  await ev(() => go('heute'));
  await page.clock.runFor(300);
  let line = await page.textContent('.rhythm');
  ok(line.includes('Schlafenszeit 22:15') && line.includes('Morgen raus 06:30 (wie meist am Mittwoch)') && line.includes('Aufgewacht 07:05') && line.includes('Schlafbedarf 8:00 h'), 'Heute: Zeile mit Schlafenszeit, Aufstehen morgen und Schlafbedarf');
  ok((await page.textContent('.arc-legend')).includes('Koffein 08:35–14:45') && (await page.textContent('.arc-legend')).includes('Bildschirmfrei ab 21:15'), 'Tagesbogen-Legende folgt dem Rhythmus');
  await page.locator('.rhythm').screenshot({ path: `${OUT}/a1-rhythmus.png` });
  // Morgen später raus (Uni erst mittags)
  await page.click('.rhythm [data-a="rh-edit"]');
  await page.fill('#rh-wake', '09:00');
  await page.click('[data-a="rh-save"]');
  await page.clock.runFor(300);
  line = await page.textContent('.rhythm');
  ok(line.includes('Schlafenszeit 00:45') && line.includes('Morgen raus 09:00') && !line.includes('wie meist'), 'Morgen 09:00 raus → Schlafenszeit 00:45');
  ok((await page.textContent('#toast')).includes('Koffein bis 17:15'), 'Hinweis: Koffein heute bis 17:15');
  await page.click('.rhythm [data-a="rh-edit"]');
  await page.click('[data-a="rh-reset"]');
  ok((await ev(() => minToTime(rhythm('2026-11-10').bed))) === '22:15', 'Wieder automatisch: 22:15');
  // Gewohnheiten zeigen die Uhrzeiten des Tages
  await ev(() => go('licht', { date: '2026-11-10' }));
  const licht = await page.textContent('#main');
  ok(licht.includes('aufgewacht 07:05') && licht.includes('Koffein-Stopp 14:45 Uhr (7,5 Std. vor dem Schlafen), Schlafenszeit 22:15 Uhr'), 'Licht & Koffein: Aufstehen, Koffein-Stopp und Schlafenszeit des Tages');
  const kn = await ev(() => habitName(HABITS.find((h) => h.id === 'koffein'), '2026-11-10'));
  ok(licht.includes('bis ca. 20:15') && licht.includes('ab 21:15, mindestens 30 Min.') && licht.includes('ab 14:15') && kn === 'Koffein nur 08:35–14:45', 'Abend-Gewohnheiten mit Uhrzeiten aus dem Rhythmus (' + kn + ')');
  // Koffein-Stopp in Stunden einstellbar
  await ev(() => { S.settings.caf.gapH = 9; saveSettings(false); });
  ok((await ev(() => minToTime(cafCutoff('2026-11-10')))) === '13:15', 'Koffein-Stopp 9 Std. vor dem Schlafen → 13:15');
  await ev(() => { S.settings.caf.gapH = 8; saveSettings(false); });
  // Ohne Garmin-Daten: Profil
  const prof = await ev(() => { const r = rhythm('2026-08-01'); return [r.wakeSrc, r.bedSrc, minToTime(r.wake), minToTime(r.bed), r.live]; });
  ok(prof.join(' ') === 'profil profil 08:30 22:30 false', 'Ohne Garmin-Werte gilt das Profil: ' + prof.join(' '));

  /* ---------- 3. Eigene Trainingsbereitschaft ---------- */
  await ev(() => {
    for (const [k, min, int] of [['2026-11-02', 60, 7], ['2026-11-04', 70, 7], ['2026-11-06', 45, 6], ['2026-11-09', null, 8]]) mutDay(k, (d) => { if (min) d.trainings = [...(d.trainings || []), { id: 'x' + k, type: 'Laufen', time: '18:00', dur: min, int }]; else d.trainings[0].int = int; });
    mutDay('2026-11-10', (d) => { Object.assign(d.health, { sleepScore: 85, sleepDur: 465, hrv: 60, rhr: 50, bbMorning: 80 }); d.gx = { hrvBase: [50, 70] }; });
  });
  const rd = await ev(() => { const r = readinessOf('2026-11-10'); const rec = recovery('2026-11-10'); return { score: r.score, src: r.src, ids: r.parts.map((p) => p.id).join(','), level: rec.level, hrv: r.parts.find((p) => p.id === 'hrv').s }; });
  ok(rd.src === 'eigen' && rd.ids === 'sleep,hist,hrv,rhr,bb,stress,load', 'Bereitschaft aus Schlaf, Schlafhistorie, HRV, Ruhepuls, Body Battery, Stress und Belastung');
  ok(rd.score >= 70 && rd.score <= 95 && rd.hrv === 88 && rd.level === 'green', `Bereitschaft ${rd.score}, HRV 60 im Bereich 50–70 → 88 Punkte, Erholung gut`);
  await ev(() => mutDay('2026-11-10', (d) => { d.health.hrv = 40; d.health.sleepScore = 45; d.health.bbMorning = 25; }));
  const low = await ev(() => { const r = readinessOf('2026-11-10'); return { score: r.score, level: recovery('2026-11-10').level }; });
  ok(low.score < 50 && low.level !== 'green', `Schlechte Nacht, HRV unter dem Normalbereich: Bereitschaft ${low.score}, Erholung ${low.level}`);
  await ev(() => mutDay('2026-11-10', (d) => { d.health.readiness = 30; }));
  const man = await ev(() => { const r = readinessOf('2026-11-10'); return { score: r.score, src: r.src, own: r.own, level: recovery('2026-11-10').level }; });
  ok(man.score === 30 && man.src === 'eingetragen' && man.own === low.score && man.level === 'yellow', 'Wert von der Uhr eingetragen: der gilt (30 → leichter trainieren), eigene Berechnung daneben');
  await ev(() => mutDay('2026-11-10', (d) => { delete d.health.readiness; Object.assign(d.health, { hrv: 60, sleepScore: 85, bbMorning: 80 }); }));
  await ev(() => { ui.sub.train = 'heute'; go('train', { date: '2026-11-10' }); });
  const card = await page.textContent('.rec-card');
  ok(card.includes('Bereitschaft') && card.includes('eigene Berechnung'), 'Training: Erholungs-Karte mit Bereitschaft und Herkunft');
  await page.locator('.rec-card').screenshot({ path: `${OUT}/a2-bereitschaft.png` });

  /* ---------- 4. Gym-Zuordnung beim Garmin-Abruf ---------- */
  const g = await ev(() => {
    const acts = [{ gid: 'g-test-2', k: '2026-11-10', type: 'Gym (frei)', tk: 'strength_training', time: '18:30', dur: 65, g: {} }, { gid: 'g-test-3', k: '2026-11-10', type: 'Laufen', tk: 'running', time: '07:30', dur: 30, km: 5, g: {} }];
    const res = garApplyActs(acts, '2026-11-10');
    const t = getDay('2026-11-10').trainings.find((x) => x.gid === 'g-test-2');
    return { gym: res.gym.join(','), type: t.type, day: t.gym && t.gym.day, n: res.n };
  });
  ok(g.n === 2 && g.type === 'Unterkörper & Rumpf' && g.day === 2 && g.gym === 'Di Unterkörper & Rumpf', 'Dienstag ohne Gym im Plan: Krafttraining zählt für den nächsten geplanten Gym-Tag (Mittwoch: ' + g.type + ')');
  const wed = await ev(() => weekPlan('2026-11-09').days[2].items.find((x) => x.kind === 'gym'));
  ok(wed.done && wed.n === 'Unterkörper & Rumpf (vorgezogen)', 'Wochenplan: Mittwoch als vorgezogen erledigt');

  /* ---------- 5. Alternativen und Snacks ---------- */
  await ev(() => { S.foods.custom.push({ id: 'c_waffel', n: 'Test Honigwaffeln', cat: 'Süßes & Snacks', base: 100, u: [['g', 1]], v: { kcal: 470, p: 6, f: 20, c: 65, sug: 34 } }, { id: 'c_jerky', n: 'Test Beef Jerky Honey BBQ', cat: 'Fleisch & Fisch', base: 100, u: [['g', 1]], v: { kcal: 300, p: 35, f: 4, c: 30, sug: 30, na: 1900 } }); markDirty('foods'); buildFoodIndex(); invalidate(); });
  await ev(() => sheetFood('c_waffel', '2026-11-10'));
  ok((await page.textContent('#sheet')).includes('Süß, aber besser'), 'Waffeln: App zeigt eine bessere Wahl');
  await page.click('[data-a="entry-save"]');
  await ev(() => sheetFood('c_waffel', '2026-11-10'));
  await page.click('[data-a="entry-save"]');
  ok((await page.textContent('#toast')).includes('doppelt?'), 'Gleiches Lebensmittel zweimal in 3 Min.: Nachfrage „doppelt?“');
  await page.click('#toast [data-a="undo"]');
  await ev(() => sheetFood('c_jerky', '2026-11-10'));
  ok((await page.textContent('#sheet')).includes('Jerky ohne Honig'), 'Jerky mit Honig: Tipp für Jerky ohne Honig');
  await ev(() => closeSheet());
  await ev(() => { S.foods.custom.push({ id: 'c_salz', n: 'Test Salzbrezeln', cat: 'Süßes & Snacks', base: 100, u: [['g', 1]], v: { kcal: 380, p: 10, c: 75, na: 7000 } }); buildFoodIndex(); invalidate(); sheetFood('c_salz', '2026-11-10'); });
  await page.click('[data-a="entry-save"]');
  ok(/Test Salzbrezeln eingetragen · Natrium jetzt über dem Maximum \(.+\): Sehr viel Natrium/.test(await page.textContent('#toast')), 'Eintrag hebt Natrium über das Maximum: sofort Hinweis mit Tipp – ' + (await page.textContent('#toast')));
  await page.click('#toast [data-a="undo"]');
  await ev(() => { ui.ernSub = 'detail'; ui.exp.add('snacks'); go('ern', { date: '2026-11-10' }); });
  const sn = await page.textContent('#snacks');
  ok(sn.includes('Skyr-Becher mit Beeren') && sn.includes('Banane und Mandeln'), 'Snacks für unterwegs mit Nährwerten');
  const n0 = await ev(() => getDay('2026-11-10').entries.length);
  await page.click('#snacks [data-a="snack-add"][data-id="skyr_beeren"]');
  ok((await ev(() => getDay('2026-11-10').entries.length)) === n0 + 2, 'Snack mit einem Tipp eingetragen (Skyr + Beeren)');

  /* ---------- 6. Energiebilanz ---------- */
  await ev(() => {
    S.foods.custom.push({ id: 'c_essen', n: 'Testessen', cat: 'Eigene', base: 100, u: [['g', 1]], v: { kcal: 100, p: 8 } }); buildFoodIndex();
    for (let i = 1; i <= 14; i++) {
      const k = addDays('2026-11-10', -i);
      mutDay(k, (d) => { d.health.kcalTot = 2800; d.caf = []; d.checks = {}; d.entries = [{ id: 'e' + i, food: 'c_essen', g: 2900, meal: 'mittag', t: parseKey(k).getTime() + 12 * 3600000 }]; if (i % 7 === 0 || i === 1) d.health.weight = i === 14 ? 79.6 : i === 7 ? 79.8 : 80.0; });
    }
    energyApply();
  });
  const en = await ev(() => { const s = energyStats('2026-11-10'); return { tdee: s.tdee, bal: s.bal, target: s.target, kcal: S.settings.targets.kcal }; });
  ok(en.tdee === 2800 && en.bal === 100, `Verbrauch Ø ${en.tdee} kcal laut Garmin, Bilanz Ø +${en.bal} kcal`);
  ok(en.target === 2950 && en.kcal.lo === 2850 && en.kcal.hi === 3050, `Kalorienziel automatisch: 2800 + 150 (Muskeln auf, Fett runter) = ${en.target}`);
  await ev(() => { ui.ernSub = 'uebersicht'; go('ern', { date: '2026-11-10' }); });
  ok((await page.textContent('#energie')).includes('Energiebilanz'), 'Ernährung: Karte Energiebilanz');
  await ev(() => { S.settings.energy = { ...(S.settings.energy || {}), wHi: 79.5 }; energyApply(); });
  ok((await ev(() => energyStats('2026-11-10').target)) === 2800, 'Über dem Gewichtsziel: Ziel 150 kcal niedriger');

  /* ---------- 7. Ziele im Rhythmus ---------- */
  const gl = await ev(() => {
    const a = goalNorm({ area: 'koffein', title: 'Kein Koffein nach dem Stopp', metric: 'caf_stop', agg: 'days', cmp: '<=', value: 0, need: 6, when: 'stop-30' }, 0);
    const b = goalNorm({ area: 'schlaf', title: 'Pünktlich schlafen', metric: 'bed_delay', agg: 'days', cmp: '<=', value: 15, need: 5, when: 'bed-60' }, 1);
    mutDay('2026-11-09', (d) => { d.caf = [{ id: 'c9', p: 'kaffee', n: 'Kaffee', mg: 90, t: '17:00' }]; });
    mutDay('2026-11-10', (d) => { d.health.bedTime = '23:45'; });
    return { a: [a.when, minToTime(goalWhenMin(a, '2026-11-10'))], b: [b.when, minToTime(goalWhenMin(b, '2026-11-10'))], late9: goalMetric('caf_stop').day('2026-11-09'), delay9: goalMetric('bed_delay').day('2026-11-09'), bed9: minToTime(sleepMin('2026-11-09')) };
  });
  ok(gl.a.join(' ') === 'stop-30 13:45' && gl.b.join(' ') === 'bed-60 21:15', 'Erinnerungen relativ zum Rhythmus: 30 Min. vor dem Koffein-Stopp, 60 Min. vor dem Schlafen');
  ok(gl.late9 === 1, 'Ziel „Kein Koffein nach dem Stopp“ misst späten Kaffee');
  ok(gl.delay9 === 55 && gl.bed9 === '22:50', `Ziel „Pünktlich schlafen“: geplant ${gl.bed9} (am 10. um 07:05 raus), eingeschlafen 23:45 → ${gl.delay9} Min. später`);
  const rep = await ev(() => frankReportText('2026-11-09'));
  ok(rep.includes('Tagesrhythmus') && rep.includes('[bed_delay]') && rep.includes('[caf_stop]'), 'Wochenbericht für Frank: Tagesrhythmus und neue Messgrößen');

  console.log(errors.length ? 'KONSOLENFEHLER:\n' + errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
