// 2.20 (19.11.2026): Heim-Kraft – tägliches Krafttraining am Power Tower und mit den Kettlebells, A Ziehen + Core /
// B Drücken + Core im Wechsel, Test am ersten Tag, Steigerung nach Rückmeldung, Stufen, Griffwechsel, Gym-Oberkörper-Tag
// leicht, Rücksicht aufs Knie, eigener Timer, Routine, Mitteilung, Bericht, Kraft-Autopilot. Nur ausgedachte Testdaten.
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
  await page.clock.install({ time: new Date('2026-11-23T10:00:00+01:00') }); // Montag
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  await page.clock.runFor(1200);
  for (let i = 0; i < 50 && !(await page.evaluate(() => typeof S !== 'undefined' && !!S.settings && document.body.classList.contains('ready'))); i++) { await page.waitForTimeout(100); await page.clock.runFor(100); }
  const ev = (fn, a) => page.evaluate(fn, a);
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
  const day = async (iso) => { await page.clock.setSystemTime(new Date(iso)); await ev(() => { invalidate(); ui.sub.train = 'zuhause'; ui.gymSess = null; go('train', { date: todayKey(), scrollTop: true }); }); await page.clock.runFor(200); };
  const txt = () => page.textContent('#main');
  const fillC = async (sel, v) => { await page.fill(sel, String(v)); await page.dispatchEvent(sel, 'change'); await page.clock.runFor(50); };
  const blurRender = () => ev(() => { if (document.activeElement) document.activeElement.blur(); render(); });

  /* ---------- Neuinstallation: Zuhause-Tab, Test am ersten Tag ---------- */
  const fresh = await ev(() => ({ cfg: JSON.stringify(S.settings.home), day: rtCfg().day.join(','), v: rtCfg().v, type: hkType(todayKey()) }));
  ok(fresh.cfg === '{"tests":[],"adj":[]}' && fresh.type === 'T', 'Neu: noch kein Test → heute Test');
  ok(fresh.day.includes('knee:kraft,home:kraft') && fresh.v === 3, 'Routine „Heim-Kraft“ in Tagsüber nach der Knie-Athletik');
  await day('2026-11-23T10:00:00+01:00');
  ok(!!(await page.$('.subnav [data-v="zuhause"].is-on')), 'Training → Zuhause im Untermenü');
  ok((await txt()).includes('Heute Test') && !!(await page.$('[data-c="hk-test"][data-f="pull"]')), 'Testkarte mit Eingabefeldern');
  await shot('v220-test-leer');
  await fillC('[data-c="hk-test"][data-f="pull"]', 10);
  await fillC('[data-c="hk-test"][data-f="push"]', 30);
  await fillC('[data-c="hk-test"][data-f="legs"]', 8);
  await fillC('[data-c="hk-test"][data-f="dip"]', 12);
  await fillC('[data-c="hk-test"][data-f="lsit"]', 20);
  await blurRender(); await page.clock.runFor(100);
  const t1 = await ev(() => ({ tests: S.settings.home.tests.map((x) => [x.k, x.pull, x.push, x.legs, x.dip, x.lsit, x.legsV ?? null]), done: hkDone(todayKey()), home: S.days[todayKey()].home }));
  ok(t1.tests.length === 1 && t1.tests[0].join() === '2026-11-23,10,30,8,12,20,', 'Test gespeichert: ' + t1.tests[0].join(' '));
  ok(t1.done && t1.home.t === 'T', 'Testtag zählt als erledigt');
  const prev = await txt();
  ok(prev.includes('Ab morgen') && prev.includes('Standard · 3 × 7') && prev.includes('Füße erhöht · 2 × 15') && prev.includes('Beine gestreckt · 3 × 6') && prev.includes('Standard · 3 × 8') && prev.includes('angehockt · 3 × 14 Sek.'),
    'Vorschau ab morgen: Klimmzug 3 × 7, Liegestütze Füße erhöht 2 × 15, Beinheben 3 × 6, Dips 3 × 8, L-Sitz 3 × 14 Sek.');
  await shot('v220-test');
  ok(!prev.includes('Ohne Test') && prev.includes('Nächstes Mal: Aus dem Test (10 Wdh.)'), 'Stufen & Ziele zeigen am Testtag schon den Stand ab morgen');
  const ft = await ev(() => ['pull', 'push', 'legs', 'dip', 'lsit'].map((tr) => { const r = hkFromTest(tr, { pull: 3, push: 40, legs: 25, legsV: 1, dip: 0, lsit: 10, lsitV: 2 }); return `${tr}:${r.st}/${r.c}`; }).join(' '));
  ok(ft === 'pull:0/4 push:4/7 legs:2/10 dip:0/8 lsit:1/12', 'Stufen aus dem Test: 3 Klimmzüge → Negativ, 40 Liegestütze → Archer, 25× Knie → gestreckt, 0 Dips → Bank, 10 Sek. L-Sitz → ein Bein (' + ft + ')');

  /* ---------- Dienstag: A mit Timer ---------- */
  await day('2026-11-24T17:00:00+01:00');
  const a1 = await ev(() => { const p = hkDayPlan(todayKey()); return { t: p.t, light: !!p.light, items: p.items.map((it) => `${it.tr}:${it.i}:${it.sets}x${it.tgt}${it.g ? ':' + it.g : ''}`) }; });
  ok(a1.t === 'A' && !a1.light && a1.items.join(' ') === 'pull:h_pull:3x7:ober legs:h_legs:3x6 swing:h_swing:3x12', 'Nach dem Test: A – Klimmzug Obergriff 3 × 7, Beinheben 3 × 6, Swing 3 × 12 (' + a1.items.join(' ') + ')');
  ok((await txt()).includes('Heute A · Ziehen + Core'), 'Zuhause zeigt Einheit A');
  await shot('v220-a');
  await page.click('[data-a="hk-start"]'); await page.clock.runFor(200);
  const tm = await ev(() => ({ n: ui.timer.steps.length, names: [...new Set(ui.timer.steps.map((s) => s.ex))].join(','), pause: ui.timer.steps.filter((s) => s.pause).length, lbl: ui.timer.steps.find((s) => s.ex === 'h_pull').label, rest: ui.timer.steps.find((s) => s.ex === 'h_pull' && s.set === 2).rest }));
  ok(tm.n === 12 && tm.names === 'h_warm,h_pull,h_pause,h_legs,h_swing' && tm.pause === 2, 'Timer: Aufwärmen, 3 Sätze je Übung, Pausen zwischen den Übungen');
  ok(tm.lbl === 'Obergriff' && tm.rest === 75, 'Timer zeigt den Griff, 75 Sek. Satzpause bei Klimmzügen');
  ok((await page.textContent('#overlay')).includes('Übung 1 von 4'), 'Pausen zählen nicht als Übung');
  await ev(() => { for (let i = 0; i < 80 && ui.timer.phase !== 'done'; i++) A['tm-next'](); }); await page.clock.runFor(200);
  const dn = await ev(() => ({ ex: Object.values(S.days[todayKey()].home.ex).map((e) => `${e.tr}:${e.s.filter((s) => s.d).map((s) => s.r).join('/')}`).join(' '), done: hkDone(todayKey()) }));
  ok(dn.ex === 'pull:7/7/7 legs:6/6/6 swing:12/12/12' && dn.done, 'Nach dem Timer alle Sätze abgehakt (' + dn.ex + ')');
  ok((await page.textContent('#overlay')).includes('Wie war’s?'), 'Fertig-Bildschirm fragt nach der Rückmeldung');
  await page.click('#overlay [data-a="hk-fb"][data-tr="pull"][data-v="passt"]');
  await page.click('#overlay [data-a="hk-fb"][data-tr="legs"][data-v="leicht"]');
  await page.click('#overlay [data-a="hk-fb"][data-tr="swing"][data-v="schwer"]'); await page.clock.runFor(100);
  ok(!!(await page.$('#overlay [data-a="hk-fb"][data-tr="swing"][data-v="schwer"].is-on')), 'Rückmeldung im Timer markiert');
  await shot('v220-timer-fertig');
  await page.click('#overlay [data-a="tm-close"]'); await page.clock.runFor(200);
  ok(await ev(() => Object.values(S.days[todayKey()].home.ex).map((e) => e.fb).join() === 'passt,leicht,schwer'), 'Rückmeldung gespeichert');

  /* ---------- Mittwoch (Beintag): B, Sätze von Hand ---------- */
  await day('2026-11-25T17:00:00+01:00');
  const b1 = await ev(() => { const p = hkDayPlan(todayKey()); return { t: p.t, light: !!p.light, items: p.items.map((it) => `${it.tr}:${it.i}:${it.sets}x${it.tgt}`), kn: hkKnee(todayKey()).noSwing }; });
  ok(b1.t === 'B' && !b1.light && b1.items.join(' ') === 'dip:h_dip:3x8 cp:h_cp:2x5 push:h_push_decl:2x15 lsit:h_lsit_tuck:3x14', 'B: Dips 3 × 8, Clean & Press 2 × 5, Liegestütze Füße erhöht 2 × 15, L-Sitz 3 × 14 Sek. (' + b1.items.join(' ') + ')');
  ok(/Beintag/.test(b1.kn || ''), 'Beintag: kein Swing (' + b1.kn + ')');
  for (let i = 0; i < 3; i++) await fillC(`[data-c="hk-val"][data-tr="dip"][data-i="${i}"]`, i < 2 ? 8 : 7);
  ok(await ev(() => document.querySelectorAll('.set-row.is-done').length === 3), 'Wdh. eintragen hakt den Satz ab, ohne neu zu zeichnen');
  await blurRender();
  for (const tr of ['cp', 'push']) for (let i = 0; i < 2; i++) { await page.click(`[data-a="hk-set"][data-tr="${tr}"][data-i="${i}"]`); await page.clock.runFor(50); }
  for (let i = 0; i < 3; i++) { await page.click(`[data-a="hk-set"][data-tr="lsit"][data-i="${i}"]`); await page.clock.runFor(50); }
  await page.click('[data-a="hk-fb"][data-tr="cp"][data-v="leicht"]'); await page.clock.runFor(50);
  await page.click('[data-a="hk-fb"][data-tr="push"][data-v="passt"]'); await page.clock.runFor(50);
  await page.click('[data-a="hk-fb"][data-tr="lsit"][data-v="passt"]'); await page.clock.runFor(50);
  const b2 = await ev(() => Object.values(S.days[todayKey()].home.ex).map((e) => `${e.tr}:${e.s.filter((s) => s.d).map((s) => s.r ?? s.sec).join('/')}:${e.fb || '-'}`).join(' '));
  ok(b2 === 'dip:8/8/7:- cp:5/5:leicht push:15/15:passt lsit:14/14/14:passt', 'Mittwoch eingetragen: ' + b2);
  ok((await txt()).includes('erledigt'), 'Einheit erledigt');
  const sw = await ev(() => { const blocked = A['hk-type']({ dataset: { v: 'A' } }); return hkType(todayKey()); });
  ok(sw === 'B', 'Mit abgehakten Sätzen lässt sich die Einheit nicht mehr wechseln');
  await shot('v220-b');

  /* ---------- Donnerstag: A mit Steigerung und anderem Griff ---------- */
  await day('2026-11-26T17:00:00+01:00');
  const a2 = await ev(() => { const p = hkDayPlan(todayKey()); return p.items.map((it) => `${it.tr}:${it.sets}x${it.tgt}${it.g ? ':' + it.g : ''}:${it.tag}`).join(' '); });
  ok(a2 === 'pull:3x9:unter:up legs:3x8:up swing:3x12:same', 'Steigerung: Klimmzug +1 (Untergriff 8 × 1,15 → 9), Beinheben leicht +2, Swing schwer gleich (' + a2 + ')');
  const why = await ev(() => hkDayPlan(todayKey()).items.map((it) => it.why).join(' | '));
  ok(why.includes('Passt (7/7/7) – Ziel +1') && why.includes('Leicht (6/6/6) – Ziel +2') && why.includes('schwer – gleiches Ziel'), 'Begründung je Übung: ' + why);
  await ev(() => { const p = hkDayPlan(todayKey()); for (const it of p.items) for (let i = 0; i < it.sets; i++) A['hk-set']({ dataset: { tr: it.tr, i: String(i) } }); A['hk-fb']({ dataset: { tr: 'pull', v: 'passt' } }); });
  ok(await ev(() => hkDone(todayKey()) && S.days[todayKey()].home.ex.pull.s.map((x) => x.r).join() === '9,9,9'), 'Donnerstag abgehakt (Haken übernimmt das Ziel als Wdh.)');

  /* ---------- Freitag (Gym-Oberkörper): leicht, dann doch normal ---------- */
  await day('2026-11-27T07:30:00+01:00');
  const f1 = await ev(() => { const p = hkDayPlan(todayKey()); return { t: p.t, light: p.light && p.light.why, items: p.items.map((it) => `${it.tr}:${it.sets}x${it.tgt}${it.light ? ':locker' : ''}`).join(' '), skipped: p.skipped.map((s) => s.tr).join(',') }; });
  ok(f1.t === 'B' && /Oberkörper B im Gym geplant/.test(f1.light || ''), 'Freitag: Gym-Oberkörper geplant → leicht (' + f1.light + ')');
  ok(f1.items === 'dip:2x4:locker lsit:3x16' && f1.skipped === 'cp,push', 'Leicht: Dips 2 lockere Techniksätze, L-Sitz normal (+2 Sek.), Clean & Press und Liegestütze weg (' + f1.items + ')');
  await shot('v220-leicht');
  await page.click('[data-a="hk-light"][data-v="0"]'); await page.clock.runFor(150);
  const f2 = await ev(() => hkDayPlan(todayKey()).items.map((it) => `${it.tr}:${it.i}:${it.sets}x${it.tgt}:${it.tag}`).join(' '));
  ok(f2 === 'dip:h_dip:3x8:same cp:h_cp:2x7:up push:h_push_dia:2x10:stage lsit:h_lsit_tuck:3x16:up', 'Doch normal: Dips gleich (7 von 8 verfehlt), C&P leicht +2, Liegestütze über 15 → Diamant, L-Sitz +2 Sek. (' + f2 + ')');
  /* Timer vorzeitig beendet: nur fertige Sätze zählen */
  await page.click('[data-a="hk-start"]'); await page.clock.runFor(100);
  await ev(() => { for (let i = 0; i < 6; i++) A['tm-next'](); }); // Aufwärmen + 2 Sätze Dips (prep→run→fertig)
  await ev(() => { A['tm-end'](); A['tm-finish-now'](); }); await page.clock.runFor(100);
  const part = await ev(() => { const e = S.days[todayKey()].home.ex; return { dip: e.dip.s.filter((s) => s.d).length, cp: (e.cp.s || []).filter((s) => s.d).length }; });
  ok(part.dip === 2 && part.cp === 0, 'Timer vorzeitig beendet: 2 Sätze Dips abgehakt, der Rest offen');
  await ev(() => A['tm-close']()); await page.clock.runFor(100);

  /* ---------- Regeln der Steigerung ---------- */
  const rules = await ev(() => {
    const base = { tr: 'pull', i: 'h_pull', sets: 3, rest: 75, g: 'ober' };
    const done = (vals) => vals.map((r) => ({ d: true, r }));
    const up = hkNext('pull', { ...base, st: 1, c: 12, tgt: 12, s: done([12, 12, 12]), fb: 'passt' });
    const top = hkNext('legs', { tr: 'legs', i: 'h_legs_ttb', sets: 3, st: 3, c: 10, tgt: 10, s: done([10, 10, 10]), fb: 'leicht' });
    const miss2 = hkNext('pull', { ...base, st: 1, c: 8, tgt: 8, s: done([8, 7, 6]) }, { ...base, st: 1, c: 8, tgt: 8, s: done([8, 8, 6]) });
    const hard2 = hkNext('pull', { ...base, st: 1, c: 8, tgt: 8, s: done([8, 8, 8]), fb: 'schwer' }, { ...base, st: 1, c: 8, tgt: 8, s: done([8, 8, 8]), fb: 'schwer' });
    const more = hkNext('pull', { ...base, st: 1, c: 6, tgt: 6, s: done([9, 9, 8]), fb: 'passt' });
    const light = hkNext('dip', { tr: 'dip', i: 'h_dip', sets: 2, st: 1, c: 8, tgt: 4, light: true, s: done([4, 4]) });
    const low = hkNext('pull', { ...base, st: 1, c: 3, tgt: 3, s: done([3, 2, 2]) }, { ...base, st: 1, c: 3, tgt: 3, s: done([2, 2, 2]) });
    const skip = hkNext('pull', { ...base, st: 1, c: 8, tgt: 8, s: done([8, 8]) }, { ...base, st: 1, c: 8, tgt: 8, s: done([8, 8, 6]) });
    return [up, top, miss2, hard2, more, light, low, skip].map((x) => `${x.st}/${x.c}/${x.tag}`).join(' ');
  });
  ok(rules === '2/6/stage 3/10/up 1/7/down 1/7/down 1/8/up 1/8/same 0/5/down 1/8/same',
    'Regeln: über 12 → Tempo-Stufe, höchste Stufe bleibt, zweimal verfehlt −1, zweimal schwer −1, mehr geschafft zählt, leichter Tag gleich, unter der Untergrenze eine Stufe leichter, ausgelassener Satz kein Verfehlen (' + rules + ')');

  /* ---------- Eigene Anpassung ---------- */
  await day('2026-11-28T09:00:00+01:00'); // Samstag: Freitag nicht fertig → B, von Hand auf A
  ok(await ev(() => hkType(todayKey()) === 'B'), 'Freitag nicht fertig: Wechsel richtet sich nach der letzten erledigten Einheit');
  await page.click('[data-a="hk-type"][data-v="A"]'); await page.clock.runFor(100);
  await ev(() => { ui.exp.add('hka-pull'); render(); }); await page.clock.runFor(100);
  const pBefore = await ev(() => hkNow('pull').c);
  await page.click('[data-a="hk-adj"][data-tr="pull"][data-d="c+1"]'); await page.clock.runFor(100);
  const adj = await ev(() => ({ s: hkNow('pull'), plan: hkDayPlan(todayKey()).items.find((x) => x.tr === 'pull'), n: S.settings.home.adj.length }));
  ok(adj.s.c === pBefore + 1 && adj.s.tag === 'manual' && adj.plan.tgt === Math.round((pBefore + 1) * 0.85) && adj.n === 1, `Ziel +1 von Hand (${pBefore} → ${adj.s.c}, breiter Griff ${adj.plan.tgt})`);
  await page.click('[data-a="hk-adj"][data-tr="pull"][data-d="st+1"]'); await page.clock.runFor(100);
  const adj2 = await ev(() => ({ s: hkNow('pull'), n: S.settings.home.adj.length }));
  ok(adj2.s.st === 2 && adj2.s.c === 6 && adj2.n === 1, 'Stufe schwerer: 3 Sek. ablassen, Start 6 (Anpassung des Tages ersetzt)');
  /* angefangen nach der Anpassung → morgen zählt die Einheit, nicht die Anpassung */
  await page.click('[data-a="hk-set"][data-tr="pull"][data-i="0"]'); await page.clock.runFor(50);
  const pinned = await ev(() => { const e = S.days[todayKey()].home.ex.pull; return { i: e.i, st: e.st, c: e.c, tgt: e.tgt, after: e.ts0 > S.settings.home.adj[0].ts }; });
  ok(pinned.i === 'h_pull_tempo' && pinned.st === 2 && pinned.c === 6 && pinned.after, 'Heutige Einheit übernimmt die Anpassung');
  await ev(() => { for (let i = 1; i < 3; i++) A['hk-set']({ dataset: { tr: 'pull', i: String(i) } }); A['hk-fb']({ dataset: { tr: 'pull', v: 'passt' } }); });
  const nx = await ev(() => { const s = hkState('pull', addDays(todayKey(), 1)); return `${s.st}/${s.c}/${s.src}`; });
  ok(nx === '2/7/rec', 'Morgen: Steigerung aus der heutigen Einheit (' + nx + ')');
  await shot('v220-stufen');

  /* ---------- Lange Pause, Knie, Kraft-Autopilot ---------- */
  const brk = await ev(() => { const s = hkState('pull', '2026-12-20'); return `${s.c}/${s.tag}`; });
  ok(brk === '6/down', 'Über 2 Wochen Pause: Ziel 10 % runter (' + brk + ')');
  const knee = await ev(() => {
    const k = '2026-11-29';
    mutDay(k, (d) => { d.knee = { am: 7 }; });
    const kn = hkKnee(k);
    mutDay(k, (d) => { d.home = { t: 'B' }; });
    const p = hkPlan(k);
    const cp = p.items.find((x) => x.tr === 'cp');
    mutDay(k, (d) => { d.home = { t: 'A' }; });
    const pa = hkPlan(k);
    mutDay(k, (d) => { delete d.home; delete d.knee; });
    return { sw: kn.noSwing, cp: cp && `${cp.i}:${cp.light}`, a: pa.items.map((x) => x.tr).join(','), skip: pa.skipped.map((x) => x.why).join() };
  });
  ok(/Morgenschmerz 7/.test(knee.sw || '') && knee.cp === 'h_press:true', 'Knie leichter: Drücken ohne Umsetzen, ohne Steigerung (' + knee.cp + ')');
  ok(knee.a === 'pull,legs' && /Knie heute leichter/.test(knee.skip), 'Knie leichter: A ohne Swing');
  const gu = await ev(() => {
    const k = '2026-12-01'; // Dienstag, kein Gym geplant
    mutDay(k, (d) => { d.trainings = [{ id: 'x1', type: 'Gym (frei)', dur: 15 }]; });
    const short = hkGymUpper(k);
    mutDay(k, (d) => { d.trainings[0].dur = 70; });
    const long = hkGymUpper(k);
    mutDay(k, (d) => { d.trainings = []; });
    return [short, long];
  });
  ok(gu[0] === null && gu[1] === 'Heute Gym (frei) im Gym', 'Kurze Kraft-Aufzeichnung (z. B. die Heim-Einheit auf der Uhr) macht den Tag nicht leicht, eine Gym-Einheit schon');
  const kx = await ev(() => { const m = kxWeekSets(weekStart('2026-11-24')); return ['Rücken', 'Bauch', 'Gesäß', 'Brust', 'Trizeps', 'Schultern'].map((x) => `${x}:${m[x] || 0}`).join(' '); });
  ok(kx === 'Rücken:9 Bauch:6 Gesäß:6 Brust:7 Trizeps:4.5 Schultern:5.5', 'Kraft-Autopilot zählt Heim-Sätze mit, ohne L-Sitz (' + kx + ')');

  /* ---------- Routine, Mitteilung, Bericht, Ziel ---------- */
  const rt = await ev(() => { S.settings.routines = { am: [], day: ['atem', 'knee:kraft'], pm: [], v: 2 }; const R = rtCfg(); return { day: R.day.join(','), v: R.v, step: rtStep('home:kraft', '2026-11-30') }; });
  ok(rt.day === 'atem,knee:kraft,home:kraft' && rt.v === 3, 'Update: Routine „Heim-Kraft“ einmal ergänzt');
  ok(rt.step && rt.step.n === 'Heim-Kraft B' && rt.step.goSub === 'zuhause' && rt.step.go === 'train', 'Routine-Schritt öffnet Training → Zuhause (' + (rt.step && rt.step.sub) + ')');
  await page.clock.setSystemTime(new Date('2026-11-30T08:00:00+01:00'));
  const pp = await ev(() => { S.settings.push = { ...(S.settings.push || {}), cats: {} }; return pushPlan().filter((x) => x.url === '#zuhause' && dkey(new Date(x.at)) === todayKey()).map((x) => `${x.title} @ ${new Date(x.at).toTimeString().slice(0, 5)}`); });
  ok(pp.length === 1 && pp[0].startsWith('Heim-Kraft B: Drücken + Core'), 'Mitteilung: ' + pp.join(' | '));
  await ev(() => { go('heute'); pushNav('#zuhause'); }); await page.clock.runFor(150);
  ok(await ev(() => ui.tab === 'train' && ui.sub.train === 'zuhause'), 'Mitteilung öffnet Training → Zuhause');
  const rep = await ev(() => frankReportText(weekStart('2026-11-24')));
  const line = rep.split('\n').find((l) => l.startsWith('Heim-Kraft')) || '';
  ok(line.includes('[routine:home:kraft]: 4/7 Tage (T A B A)') && line.includes('Klimmzüge 3 Sek. ablassen 3 × 7'), 'Wochenbericht: ' + line.slice(0, 160));
  const gm = await ev(() => { const g = goalMetric('home'); return `${g.kind}:${g.day('2026-11-24')}:${g.day('2026-11-22')}`; });
  ok(gm === 'bool:1:0', 'Wochenziel-Messgröße „home“ (' + gm + ')');
  await ev(() => { ui.sub.train = 'heute'; go('train', { date: todayKey() }); }); await page.clock.runFor(150);
  ok((await txt()).includes('Heim-Kraft B · Drücken + Core'), 'Training → Heute: Karte Heim-Kraft');
  await ev(() => { ui.sub.train = 'zuhause'; ui.exp.add('hk-info'); render(); }); await page.clock.runFor(150);
  const info = await txt();
  ok(info.includes('Refalo 2024') && info.includes('Saric 2019') && info.includes('Kikuchi') && info.includes('Lake & Lauder 2012') && info.includes('Nie bis zum Versagen'), 'Erklärung mit Regeln und Quellen');
  ok(info.includes('Letzte Einheiten') && info.includes('Diese Woche'), 'Woche und letzte Einheiten');
  await shot('v220-zuhause');

  /* ---------- Neuer Test nach 4 Wochen, Test löschen ---------- */
  await day('2026-12-21T17:00:00+01:00');
  ok((await txt()).includes('Neuer Test fällig'), 'Nach 4 Wochen: neuer Test vorgeschlagen');
  await page.click('.hk-due [data-a="hk-type"][data-v="T"]'); await page.clock.runFor(100);
  await fillC('[data-c="hk-test"][data-f="pull"]', 14); await blurRender();
  const rt2 = await ev(() => ({ n: S.settings.home.tests.length, next: hkState('pull', '2026-12-22') }));
  ok(rt2.n === 2 && rt2.next.src === 'test' && rt2.next.st === 1 && rt2.next.c === 10, 'Neuer Test stellt das Ziel frisch ein (14 → 3 × 10)');
  await page.click('[data-a="hk-test-del"]'); await page.clock.runFor(100);
  ok(await ev(() => S.settings.home.tests.length === 1 && hkState('pull', '2026-12-22').src !== 'test'), 'Test gelöscht (mit Rückgängig)');

  ok(!errors.length, errors.length ? errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.log('ABBRUCH', e); process.exit(1); });
