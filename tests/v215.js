// 2.15: Knie – neue Heim-Übungen ergänzt (Knie strecken gegen Band, Spanish Squat, Poliquin Step-up), optionaler
// Knie-Block in jeder Gym-Einheit (je Phase, Gewichtsvorschlag, zählt nicht zur Vollständigkeit), Wochen-Steigerung mit
// Schmerz-Ampel, Belastungsregeln (nicht zweimal am Tag schwer), beide Seiten gleich, Wadenheben sitzend am Beintag.
// Aufruf: Server auf Port 8766 (docs), dann: node tests/v215.js <ausgabeordner>. Nur ausgedachte Testdaten.
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
  await page.clock.install({ time: new Date('2026-11-17T17:30:00+01:00') }); // Dienstag
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  const ev = (fn, a) => page.evaluate(fn, a);
  for (let i = 0; i < 20; i++) { await page.clock.runFor(500); if (await ev(() => !!(S.meta && document.body.classList.contains('ready')))) break; }
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
  const setDay = async (iso) => { await page.clock.setSystemTime(new Date(iso)); await ev(() => { invalidate(); render(); }); await page.clock.runFor(200); };

  /* ---------- 1. Übungen ergänzt, nicht getauscht ---------- */
  const d1 = await ev(() => {
    const old = { A: ['a_ergo', 'a_wand60', 'k_bridge', 'k_wadeexz', 'a_tibialis'], B: ['a_ergo', 'a_wand60', 'k_clamshell', 'k_abduktion', 'k_seitstuetz', 'k_monster'], C: ['a_ergo', 'a_wand60', 'a_kbdl', 'k_einbeinstand', 'k_hiphike', 'k_deadbug', 'a_tiefhocke'] };
    const p1 = KNEE_PHASES[0].days;
    const kept = Object.entries(old).every(([t, ids]) => ids.every((id) => p1[t].some((x) => x.i === id)));
    const added = ['a_tke', 'a_spanish', 'a_poliquin', 'a_copen', 'k_slrdl'].every((id) => Object.values(p1).flat().some((x) => x.i === id));
    const all = KNEE_PHASES.flatMap((ph) => Object.values(ph.days).flat()).every((x) => exById(x.i));
    const kb = Object.values(KB_PLAN).flat().every((x) => exById(x.i) && exById(x.i).cat === 'gym');
    const mins = (lvl) => KNEE_PHASES.map((ph) => ['A', 'B', 'C'].map((t) => Math.round(routineSec({ items: ph.days[t].map((it) => kpItem(it, lvl)) }) / 60)).join('/')).join(' · ');
    sheetExPick();
    const picker = document.querySelector('#sheet') ? document.querySelector('#sheet').textContent : document.body.textContent;
    closeSheet();
    return { kept, added, all, kb, m0: mins(0), m4: mins(4), noGymInPicker: !picker.includes('Beinstrecker isometrisch') && picker.includes('Knie strecken gegen Band'), cat: KNEE_CATS.gym };
  });
  ok(d1.kept && d1.added && d1.all, 'Phase 1: alle bisherigen Übungen bleiben, TKE, Spanish Squat, Poliquin, Copenhagen, einbeiniges Kreuzheben ergänzt');
  ok(d1.kb && d1.cat === 'Im Gym (Maschinen)', 'Knie-Block: alle Übungen in der Bibliothek, Kategorie „Im Gym“');
  ok(d1.noGymInPicker, 'Routinen-Editor bietet keine Gym-Maschinen für zu Hause an');
  console.log('     Dauer Stufe 0: ' + d1.m0 + ' | Stufe 4: ' + d1.m4);

  /* ---------- 2. Beide Seiten gleich ---------- */
  const sd = await ev(() => { const st = buildSteps({ items: [{ i: 'k_clamshell', sets: 1, reps: 15 }] }); return { side: kneeCfg().side, xs: extraSide(), steps: st.map((s) => `${s.side}${s.reps}`).join(','), dose: doseText(exById('k_clamshell'), { sets: 3 }) }; });
  ok(sd.side === 'keine' && sd.xs === null && sd.steps === 'L15,R15' && sd.dose === '3 × 15 je Seite', `Beide Seiten gleich: ${sd.steps}, „${sd.dose}“`);
  const mg = await ev(() => { kneeCfg().side = 'rechts'; S.settings.mig = 214; mutDay('2026-11-10', (d) => { d.knee = { am: 2 }; }); migrate215(); return { side: kneeCfg().side, mig: S.settings.mig }; });
  ok(mg.side === 'keine' && mg.mig === 215, 'Migration: bestehende Daten mit Aufschlag rechts → beide gleich');

  /* ---------- 2b. Loop Bands, ohne langes Band Ersatzübungen (2.16.1) ---------- */
  const lb = await ev(() => {
    kneeCfg().bands = [{ n: 'Rot', kg: 4 }, { n: 'Grün', kg: 4.9 }]; delete kneeCfg().longBand; S.settings.mig = 215; migrate216();
    const a = athItems(todayKey(), 'A');
    return { bands: kneeCfg().bands.map((b) => `${b.n} ${b.kg}`).join(', '), lb: kneeCfg().longBand, mig: S.settings.mig, ids: a.map((x) => x.i).join(','), from: a.filter((x) => x.from).map((x) => `${x.from}>${x.i}:${x.sets}x${x.reps || x.sec}`).join(',') };
  });
  ok(lb.bands === 'Orange 2.9, Blau 6.7' && lb.lb === false && lb.mig === 216, `Migration: Loop Bands (${lb.bands}), langes Band nicht vorhanden`);
  ok(lb.from === 'a_tke>a_quadset:3x10,a_spanish>a_wandtief:2x45' && !lb.ids.includes('a_tke'), 'Ohne langes Band: Handtuchrolle statt Knie strecken gegen Band, tiefes Wandsitzen statt Spanish Squat: ' + lb.from);
  await ev(() => { ui.sub.knie = 'kraft'; go('knie', { scrollTop: true }); }); await page.clock.runFor(300);
  const lbt = await page.textContent('#main');
  ok(lbt.includes('statt Knie strecken gegen Band (kein langes Band)') && lbt.includes('Rot') === false && lbt.includes('Orange 2,9 kg'), 'Kraft & Athletik: Ersatz mit Hinweis, Bänder Orange/Blau');
  await page.click('[data-a="knee-longband"][data-v="1"]'); await page.clock.runFor(200);
  ok(await ev(() => kneeCfg().longBand === true && athItems(todayKey(), 'A').some((x) => x.i === 'a_tke' && !x.from)), 'Umschalten: mit langem Band wieder Knie strecken gegen Band');
  await ev(() => { ui.tab = 'mehr'; render(); });

  /* ---------- 3. Knie-Block in der Gym-Einheit (Tag 1) ---------- */
  await ev(() => { ui.sub.train = 'gym'; ui.gymDay = 1; go('train', { scrollTop: true }); }); await page.clock.runFor(300);
  ok((await page.textContent('#main')).includes('Optional danach: Knie-Block'), 'Gym-Plan nennt den optionalen Knie-Block');
  await page.click('[data-a="gym-start"][data-day="1"]'); await page.clock.runFor(300);
  const s0 = await ev(() => { const t = curTraining(); return { offer: !!document.querySelector('#kb [data-a="kb-on"]'), prog: gymProgress(t), legsTop: document.querySelector('#main').textContent.indexOf('Knie-Block') > document.querySelector('#main').textContent.indexOf('Schrägbankdrücken') }; });
  ok(s0.offer && s0.legsTop, 'Einheit: Knie-Block als Angebot unten (nach den Übungen)');
  await page.click('[data-a="kb-on"]'); await page.clock.runFor(300);
  const s1 = await ev(() => { const t = curTraining(); return { items: t.gym.knee.items.map((x) => `${x.i}:${x.sets}`).join(','), prog: gymProgress(t), lvl: t.gym.knee.lvl, text: document.querySelector('#kb').textContent }; });
  ok(s1.items === 'b_iso:5,b_curl:3,b_calf:3,b_abd:3,b_add:3', 'Phase 1: Beinstrecker isometrisch 5 Sätze, Beinbeuger, Waden sitzend, Ab- und Adduktoren: ' + s1.items);
  ok(s1.prog.total === s0.prog.total && s1.text.includes('5 × 45 Sek. je Bein') && s1.text.includes('Neu: ein Gewicht wählen'), 'Block zählt nicht zur Einheit; Dosis je Bein; Vorschlag ohne Verlauf');
  const mn = await ev(() => ({ t1: kbMin(kbPlanItems(todayKey(), 1).items), t2: kbMin(kbPlanItems(todayKey(), 2).items), pair: kbDose(kbPlanItems(todayKey(), 1).items.find((x) => x.i === 'b_abd')) }));
  ok(mn.t1 <= 30 && mn.t2 <= 25 && mn.pair.includes('im Wechsel mit Adduktoren'), `Dauer Block: Oberkörpertag ca. ${mn.t1} Min., Beintag ca. ${mn.t2} Min.; ${mn.pair}`);
  await page.clock.runFor(6000);
  await page.locator('#kb').screenshot({ path: `${OUT}/v215-kb.png` });
  // Timer für die Halteübung
  await page.click('[data-a="kb-timer"][data-ex="b_iso"]'); await page.clock.runFor(200);
  const tm = await ev(() => ({ n: ui.timer.steps.length, sides: ui.timer.steps.slice(0, 2).map((s) => s.side).join(''), sec: ui.timer.steps[0].sec, plus: ui.timer.steps.some((s) => s.side === extraSide()) }));
  ok(tm.n === 10 && tm.sides === 'LR' && tm.sec === 45 && !tm.plus, 'Timer: 5 × 45 Sek. je Bein im Wechsel, ohne Aufschlag');
  await ev(() => { const t = ui.timer; t.i = t.steps.length - 1; t.phase = 'run'; timerFinish(); }); await page.clock.runFor(100);
  await ev(() => A['tm-close']()); await page.clock.runFor(200);
  await page.fill('[data-c="kb-val"][data-ex="b_iso"][data-i="0"][data-f="w"]', '40'); await page.dispatchEvent('[data-c="kb-val"][data-ex="b_iso"][data-i="0"][data-f="w"]', 'change');
  for (let i = 1; i < 5; i++) await ev((i) => mutTraining((t) => { t.gym.knee.ex.b_iso.s[i].w = 40; }), i);
  for (let i = 0; i < 3; i++) { await page.fill(`[data-c="kb-val"][data-ex="b_curl"][data-i="${i}"][data-f="w"]`, '35'); await page.dispatchEvent(`[data-c="kb-val"][data-ex="b_curl"][data-i="${i}"][data-f="w"]`, 'change'); await page.click(`[data-a="kb-set"][data-ex="b_curl"][data-i="${i}"]`); }
  await page.click('[data-a="kb-pain"][data-v="2"]'); await page.clock.runFor(100);
  const s2 = await ev(() => { const t = curTraining(), kb = t.gym.knee; return { iso: kb.ex.b_iso.s.map((s) => `${s.d ? 'x' : '-'}${s.sec}`).join(','), curl: kb.ex.b_curl.s.map((s) => `${s.w}x${s.r}`).join(','), pain: kb.pain, done: kbDoneT(t), sets: kxWeekSets(weekStart(todayKey())).Beinbeuger }; });
  ok(s2.iso === 'x45,x45,x45,x45,x45' && s2.curl === '35x15,35x15,35x15' && s2.pain === 2, `Gespeichert: Halten ${s2.iso}, Beinbeuger ${s2.curl}, Schmerz ${s2.pain}`);
  ok(s2.done === false && s2.sets === 3, 'Block noch nicht zur Hälfte fertig; Beinbeuger-Sätze zählen bei den harten Sätzen');
  for (const id of ['b_calf', 'b_abd']) for (let i = 0; i < 3; i++) await page.click(`[data-a="kb-set"][data-ex="${id}"][data-i="${i}"]`);
  ok(await ev(() => kbDoneT(curTraining()) && kbDone(todayKey())), 'Block erledigt ab der Hälfte der Sätze');
  // Heim-Einheit am selben Tag: nicht A
  ok(await ev(() => { invalidate(); return athType(todayKey()) === 'B' && athHeavyWhy(todayKey()).t.includes('Knie-Block'); }), 'Nach dem Gym-Knie-Block zu Hause B statt A');
  await page.click('[data-a="gym-finish"]'); await page.clock.runFor(300);
  ok(await ev(() => { const t = getDay(todayKey()).trainings.find((x) => x.gym); return t.done && gymProgress(t).done === 0; }), 'Einheit abgeschlossen, Hauptteil unverändert');

  /* ---------- 4. Nächste Einheit: Gewichtsvorschlag, Beintag ohne Doppelte ---------- */
  await setDay('2026-11-19T17:00:00+01:00'); // Donnerstag
  const sg = await ev(() => {
    const it = { i: 'b_iso', sets: 5, sec: 45, rest: 60, side: true }, it2 = { i: 'b_curl', sets: 3, rr: '12–15' };
    const pl = kbPlanItems(todayKey(), 2);
    return { iso: kbSuggest(it, todayKey(), null), curl: kbSuggest(it2, todayKey(), null), legs: pl.items.map((x) => x.i).join(','), skip: pl.skipped.join(','), alt: gymTarget(GYM_DAYS[1].ex.find((e) => e.id === 'g_waden'), 'A', true).n };
  });
  ok(sg.iso.w === 42.5 && sg.iso.tag === 'up', `Isometrisch gehalten, 2/10 → +2,5 kg (${sg.iso.w} kg): ${sg.iso.why}`);
  ok(sg.curl.w === 37.5 && sg.curl.tag === 'up', `Beinbeuger 3 × 15 geschafft → ${sg.curl.w} kg`);
  ok(sg.legs === 'b_iso,b_abd,b_add' && sg.skip === 'b_curl,b_calf', 'Beintag: Beinbeuger und Waden schon im Training → im Block weggelassen');
  ok(sg.alt === 'Wadenheben sitzend', 'Beintag: Knie-Variante Wadenheben sitzend');
  const sg2 = await ev(() => { mutDay('2026-11-17', (d) => { d.trainings.find((x) => x.gym).gym.knee.pain = 6; }); return kbSuggest({ i: 'b_iso', sets: 5, sec: 45, rest: 60, side: true }, todayKey(), null); });
  ok(sg2.w === 35 && sg2.tag === 'down', `Schmerz 6/10 → −10 % (${sg2.w} kg)`);
  await ev(() => { mutDay('2026-11-17', (d) => { d.trainings.find((x) => x.gym).gym.knee.pain = 2; }); invalidate(); });

  /* ---------- 5. Wochen-Steigerung ---------- */
  await ev(() => {
    for (const [k, t, p] of [['2026-11-18', 'A', 3], ['2026-11-20', 'C', 4], ['2026-11-21', 'A', 3]]) mutDay(k, (d) => { d.knee = { ...(d.knee || {}), str: { ex: {}, t, done: true, pain: p } }; });
    for (const [k, v] of [['2026-11-17', 3], ['2026-11-18', 3], ['2026-11-19', 2], ['2026-11-20', 3], ['2026-11-21', 2], ['2026-11-10', 3], ['2026-11-11', 3], ['2026-11-12', 3]]) mutDay(k, (d) => { d.knee = { ...(d.knee || {}), am: v }; });
  });
  const live = await ev(() => kpEval(weekStart('2026-11-21')));
  ok(live.st === 'up' && live.units === 4, `Woche 16.–22.11.: ${live.units} Einheiten, Schmerz max. ${live.maxS} → ${live.st}`);
  await setDay('2026-11-23T08:00:00+01:00'); // Montag
  const up = await ev(() => { const it = (id, t = 'A') => athItems(todayKey(), t).find((x) => x.i === id); return { lvl: kpLevel(), last: kpLast(), wand: it('a_wand60'), tke: it('a_tke'), bridge: it('k_bridge'), side: athItems(todayKey(), 'B').find((x) => x.i === 'k_seitstuetz'), label: buildSteps(athRoutine(todayKey(), 'A')).find((s) => s.ex === 'a_wand60').label }; });
  ok(up.lvl === 1 && up.last && up.last.st === 'up', 'Montag: Stufe 1 (' + (up.last || {}).why + ')');
  ok(up.wand.lvT === '12 kg auf den Oberschenkeln' && up.label === '12 kg auf den Oberschenkeln' && up.tke.lvT === '3 Sek. oben halten', 'Stufe 1: Wandsitzen mit 12 kg (auch im Timer), TKE 3 Sek. halten');
  ok(up.bridge.reps === 14 && up.side.sec === 35, `Stufe 1: Bridge ${up.bridge.reps} Wdh., Seitstütz ${up.side.sec} Sek.`);
  await ev(() => { ui.sub.knie = 'kraft'; go('knie', { scrollTop: true }); }); await page.clock.runFor(300);
  const kt = await page.textContent('#main');
  ok(kt.includes('Steigerung') && kt.includes('Stufe 1 von 4') && kt.includes('Seit Montag eine Stufe höher') && kt.includes('12 kg auf den Oberschenkeln') && !kt.includes('Nov..'), 'Kraft & Athletik zeigt Stufe, Grund und was sich ändert');
  await page.clock.runFor(6000);
  await page.locator('#kp').screenshot({ path: `${OUT}/v215-kp.png` });
  await shot('v215-kraft');
  // Woche mit Warnzeichen → halten; Woche mit 7/10 → zurück
  await ev(() => { for (const k of ['2026-11-23', '2026-11-24', '2026-11-25']) mutDay(k, (d) => { d.knee = { am: 3, str: { ex: {}, t: 'B', done: true, pain: 3 } }; }); mutDay('2026-11-24', (d) => { d.knee.flags = ['Instabilität']; }); });
  await setDay('2026-11-30T08:00:00+01:00');
  const hold = await ev(() => ({ lvl: kpLevel(), last: kpLast() }));
  ok(hold.lvl === 1 && hold.last.st === 'hold' && hold.last.kind === 'flags', 'Warnzeichen → Stufe gehalten: ' + hold.last.why);
  ok(await ev(() => kbSuggest({ i: 'b_iso', sets: 5, sec: 45, rest: 60, side: true }, todayKey(), null).w === 40), 'Warnzeichen in der Vorwoche: Gym-Gewicht nicht steigern');
  await ev(() => { for (const k of ['2026-11-30', '2026-12-01', '2026-12-02']) mutDay(k, (d) => { d.knee = { am: 3, str: { ex: {}, t: 'C', done: true, pain: 7 } }; }); });
  await setDay('2026-12-07T08:00:00+01:00');
  ok(await ev(() => kpLevel() === 0 && kpLast().st === 'down'), 'Schmerz 7/10 in den Einheiten → eine Stufe zurück');
  await ev(() => A['kp-adj']({ dataset: { v: '1' } })); await page.clock.runFor(100);
  ok(await ev(() => kpLevel() === 1 && kpLast().st === 'manual'), 'Stufe von Hand anpassen');
  ok(await ev(() => frankReportText(weekStart('2026-11-16')).includes('Gym-Knie-Block 1×') && frankReportText(weekStart('2026-11-16')).includes('Steigerung: Stufe')), 'Wochenbericht: Gym-Knie-Block und Stufe');

  /* ---------- 6. Phase 2: langsam und schwer, Stufe je Woche ---------- */
  await ev(() => { kneeCfg().phase = 2; saveSettings(false); kpEnsure(todayKey()); });
  const p2 = await ev(() => {
    const a = kbPlanItems(todayKey(), 1).items.find((x) => x.i === 'b_hsr');
    kneeCfg().prog.lvl = 1;
    const b = kbPlanItems(todayKey(), 1).items.find((x) => x.i === 'b_hsr');
    mutDay('2026-12-04', (d) => { d.trainings = [{ id: 'tp2', type: 'Oberkörper A', done: true, gym: { day: 1, sched: 'A', ex: {}, knee: { on: true, ph: 2, lvl: 0, items: [{ i: 'b_hsr', sets: 3, rr: '15', hsr: true, side: true }], ex: { b_hsr: { s: [{ w: 30, r: 15, d: true }, { w: 30, r: 15, d: true }, { w: 30, r: 15, d: true }] } }, pain: 3 } } }]; });
    const s = kbSuggest(b, todayKey(), null);
    return { reset: kneeCfg().prog.hist.slice(-1)[0].st, a: `${a.sets}x${a.rr}`, b: `${b.sets}x${b.rr}`, w: s.w, why: s.why };
  });
  ok(p2.reset === 'phase' && p2.a === '3x15' && p2.b === '3x12', `Phase 2: Stufe 0 → 3 × 15, Stufe 1 → 3 × 12 (${p2.a} → ${p2.b})`);
  ok(p2.w === 32.5, `Neue Stufe: Gewicht aus 30 kg × 15 umgerechnet → ${p2.w} kg`);
  ok(await ev(() => { mutDay(todayKey(), (d) => { d.knee = { str: { ex: {}, t: 'A', done: true } }; }); invalidate(); const pl = kbPlanItems(todayKey(), 1); return pl.skipped.includes('b_hsr') && pl.skipped.includes('b_press'); }), 'Phase 2: Heim-Einheit A schon gemacht → langsam-schwere Übungen im Gym weg');
  ok(await ev(() => { mutDay('2026-12-08', (d) => { d.knee = {}; }); return athHeavyWhy('2026-12-08') && athType('2026-12-08') !== 'A'; }), 'Phase 2: am Tag nach schwerer Belastung keine Einheit A');
  await ev(() => { kneeCfg().phase = 1; saveSettings(false); });

  /* ---------- 7. Leichter Tag, Einstellungen, Backup ---------- */
  ok(await ev(() => { mutDay(todayKey(), (d) => { d.knee = { am: 3, flags: ['Schwellung'] }; }); invalidate(); const pl = kbPlanItems(todayKey(), 1); return pl.light && pl.items.find((x) => x.i === 'b_iso').sets === 4; }), 'Warnzeichen heute: Block je Übung ein Satz weniger');
  const bk = await ev(() => { const j = JSON.parse(JSON.stringify(exportData())); const t = Object.values(j.days || {}).flatMap((d) => d.trainings || []).find((x) => x.gym && x.gym.knee && x.gym.knee.ex.b_iso); return { kb: !!t, prog: !!(j.settings.knee.prog && j.settings.knee.prog.hist.length), side: j.settings.knee.side }; });
  ok(bk.kb && bk.prog && bk.side === 'keine', 'Backup enthält Knie-Block, Steigerungs-Verlauf und „beide gleich“');
  await ev(() => { ui.tab = 'mehr'; render(); }); await page.clock.runFor(100);
  ok(!errors.length, errors.length ? errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.log('ABBRUCH', e); process.exit(1); });
