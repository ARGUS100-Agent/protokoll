// Wochenbericht an Frank, Wochenziele (Messung, Hinweise) und Muster
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, timezoneId: 'Europe/Berlin', locale: 'de-DE' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:8766' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  // Sonntag, 8. Nov. 2026, 17:00
  await page.clock.install({ time: new Date('2026-11-08T17:00:00+01:00') });
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  for (let i = 0; i < 20; i++) { await page.clock.runFor(500); if (await ev(() => !!(S.meta && document.body.classList.contains('ready')))) break; }

  // 6 Wochen Daten: jeder 3. Tag Koffein um 16 Uhr → in der Nacht danach schlechterer Schlaf; Whey → Haut schlechter
  await ev(async () => {
    const today = todayKey();
    for (let i = 42; i >= 0; i--) {
      const k = addDays(today, -i);
      const late = i % 3 === 0, whey = i % 4 === 0;
      mutDay(k, (d) => {
        for (const id of ['f_eier', 'f_spinat', 'a_skyr', 'a_hafer', 'l_tee', 'm_kreatin']) d.checks[id] = 1;
        d.caf = [{ id: 'c' + i, n: 'Espresso', mg: 60, t: late ? '16:00' : '10:30' }];
        if (whey) d.entries.push({ id: 'w' + i, food: 'whey', g: 30, meal: 'snack', t: parseKey(k).getTime() });
        d.health.sleepScore = 80; d.health.hrv = 55;
        d.skin = { score: 7 };
        d.knee = { am: 2 };
        if (i % 2 === 0) d.trainings.push({ id: 't' + i, type: 'Oberkörper A', time: '17:30', dur: 60, load: 7 });
      });
    }
    // Wirkung am Folgetag
    for (let i = 42; i >= 0; i--) {
      const k = addDays(today, -i), nx = addDays(k, 1);
      if (nx > today) continue;
      if (i % 3 === 0) mutDay(nx, (d) => { d.health.sleepScore = 68 + (i % 2); d.health.hrv = 48; });
      if (i % 4 === 0) mutDay(nx, (d) => { d.skin.score = 5; });
    }
    await flush();
  });
  const mu = await ev(() => muster().found.map((f) => `${f.fid}>${f.oid}:${Math.round(f.diff)}`));
  console.log('     Muster: ' + mu.join(' | '));
  ok(mu.some((x) => x.startsWith('cafLate>sleep:-')), 'Muster erkannt: Koffein nach 14:30 → schlechterer Schlaf');
  ok(mu.some((x) => x.startsWith('whey>skin:')), 'Muster erkannt: Whey → Haut');

  // Heute (Sonntag 17 Uhr): Rückblick-Karte mit „An Frank“
  await ev(() => go('heute'));
  ok(!!(await page.$('[data-a="report-open"]')), 'Sonntags: Knopf „An Frank“ auf Heute');
  await page.click('[data-a="report-open"]');
  const rep = await ev(() => ui.sheet.report);
  for (const s of ['## Ernährung', '## Training & Sauna', '## Schlaf & Erholung', '## Koffein', '## Haut', '## Knie', '## Gewohnheiten', '## Muster']) ok(rep.includes(s), 'Bericht enthält ' + s);
  ok(rep.startsWith('Frank: Wochenbericht KW 45') && rep.includes('3 Wochenziele für KW 46'), 'Bericht beginnt mit „Frank: Wochenbericht“');
  console.log('     Länge des Berichts: ' + rep.length + ' Zeichen');
  await ev(() => { const a = $('#frank-go'); a.addEventListener('click', (e) => e.preventDefault(), { once: true }); a.click(); });
  await page.clock.runFor(200);
  ok((await ev(() => navigator.clipboard.readText())) === rep, 'Bericht in die Zwischenablage kopiert');
  await page.click('[data-a="report-toggle"]');
  ok(await page.isVisible('.report-pre'), 'Bericht lässt sich ansehen');
  await page.screenshot({ path: `${OUT}/z1-bericht.png` });
  require('fs').writeFileSync(`${OUT}/bericht.txt`, rep);

  // Franks Antwort einfügen
  const code = { app: 'protokoll-frank', v: 1, type: 'ziele', week: '2026-11-09',
    review: { good: ['Protein fast jeden Tag im Ziel'], work: ['Koffein am Nachmittag'], more: ['Koffein nach 14:30'], less: ['Vitamin D'], tips: ['Den zweiten Espresso direkt nach dem Mittagessen trinken'] },
    goals: [
      { area: 'koffein', title: 'Kein Koffein nach 14:30', metric: 'caf_last', agg: 'days', cmp: '<=', value: '14:30', need: 7, when: '14:00', why: 'Nach Koffein am Nachmittag ist dein Schlaf schlechter.', tip: 'Ab 14:30 nur Wasser oder Kräutertee.', example: 'Den zweiten Espresso gleich nach dem Mittagessen trinken.' },
      { area: 'ern', title: 'Protein ab 180 g', metric: 'p', agg: 'days', cmp: '>=', value: 180, need: 6 },
      { area: 'knie', title: 'Mobility jeden Tag', metric: 'mob', agg: 'days', cmp: '>=', value: 1, need: 6 },
      { area: 'schlaf', title: '10 Min. lesen statt Handy', metric: 'manual', need: 5 },
    ] };
  const answer = `**Dein Rückblick** …\n\n\`\`\`json\n${JSON.stringify(code)}\n\`\`\`\n\nCode kopieren → Protokoll-App`;
  await ev((t) => navigator.clipboard.writeText(t), answer);
  await page.click('[data-a="frank-paste"]');
  await page.clock.runFor(200);
  await page.waitForSelector('.goal-prev', { timeout: 5000 });
  ok((await page.$$('.goal-prev')).length === 4, 'Vorschau mit 4 Zielen');
  ok((await page.textContent('#sheet')).includes('Letztes Koffein ≤ 14:30 Uhr an 7 von 7 Tagen'), 'Messregel verständlich angezeigt');
  ok((await ev(() => ui.sheet.gw)) === '2026-11-09', 'Ziele für KW 46 (ab 9. November)');
  ok((await page.textContent('#sheet')).includes('Vorschläge') && (await page.textContent('#sheet')).includes('direkt nach dem Mittagessen'), 'Franks Vorschläge in der Vorschau');
  await page.screenshot({ path: `${OUT}/z2-ziele-vorschau.png` });
  await page.click('[data-a="goals-save"]');
  const saved = await ev(() => ({ n: weekGoals('2026-11-09').length, rev: (S.reviews['2026-11-02'] || {}).frank }));
  ok(saved.n === 4 && saved.rev && saved.rev.more[0] === 'Koffein nach 14:30', 'Ziele und Franks Rückblick gespeichert');

  // Montag 9:00: Ziele auf Heute
  await page.clock.setFixedTime(new Date('2026-11-09T09:00:00+01:00'));
  await ev(() => { ui.lastToday = todayKey(); invalidate(); go('heute'); });
  ok((await page.$$('.goals-card .goal')).length === 4, 'Heute: Karte mit den Wochenzielen');
  const st = () => ev(() => weekGoals(weekStart(todayKey())).map((g) => { const e = goalEval(g, weekStart(todayKey())); return `${e.status}|${e.todayState}|${e.todayText}`; }));
  let s = await st();
  console.log('     ' + s.join(' / '));
  ok(s[0] === 'open|ok|heute bisher eingehalten' && s[1].startsWith('open|open|heute noch 180') && s[3] === 'open|open|heute noch offen', 'Montag früh: Koffein eingehalten, Protein offen, Häkchen offen');
  await page.screenshot({ path: `${OUT}/z3-heute.png`, fullPage: true });

  // Protein erreichen → Hinweis „Heute geschafft“
  await ev(() => { addEntry(todayKey(), 'skyr', 1000, 'abend'); addEntry(todayKey(), 'whey', 150, 'snack'); render(); });
  await page.clock.runFor(3500);
  ok((await page.textContent('#toast')).includes('Heute geschafft: Protein ab 180 g'), 'Hinweis: Heute geschafft (Protein)');
  // 14:05: Erinnerung „Jetzt dran“ für das Koffein-Ziel (Erinnerung 14:00)
  await page.clock.setFixedTime(new Date('2026-11-09T14:05:00+01:00'));
  await ev(() => { invalidate(); go('heute'); });
  await page.clock.runFor(3500);
  ok(!!(await page.$('.goals-card .goal.is-now')), 'Heute: Koffein-Ziel ist „Jetzt dran“');
  ok((await page.textContent('#toast')).includes('Jetzt dran: Kein Koffein nach 14:30'), 'Hinweis: Jetzt dran');
  ok((await ev(() => goalNudges().length)) === 1, 'Genau eine Erinnerung aktiv');
  // Koffein um 15 Uhr → Hinweis „verfehlt“
  await page.clock.setFixedTime(new Date('2026-11-09T15:05:00+01:00'));
  await ev(() => { mutDay(todayKey(), (d) => { d.caf = [{ id: 'x1', n: 'Espresso', mg: 60, t: '15:00' }]; }); render(); });
  await page.clock.runFor(3500);
  ok((await page.textContent('#toast')).includes('Ziel heute verfehlt: Kein Koffein nach 14:30'), 'Hinweis: Ziel heute verfehlt (Koffein)');
  s = await st();
  ok(s[0].startsWith('missed|fail'), 'Koffein-Ziel (7 von 7) ist damit verfehlt');
  // Häkchen-Ziel
  const gid = await ev(() => weekGoals(weekStart(todayKey()))[3].id);
  await page.click(`[data-a="goal-tick"][data-id="${gid}"]`);
  s = await st();
  ok(s[3] === 'open|ok|heute erledigt', 'Eigenes Ziel abgehakt');
  // Hinweis im Bereich
  await ev(() => go('licht', { date: todayKey() }));
  ok((await page.textContent('#main')).includes('Wochenziel: Kein Koffein nach 14:30'), 'Licht & Koffein zeigt das Wochenziel');
  ok((await page.textContent('#main')).includes('Was deinen Schlaf beeinflusst'), 'Licht & Koffein zeigt gelernte Muster');
  await ev(() => go('haut'));
  await ev(() => { ui.sub.haut = 'verlauf'; render(); });
  ok((await page.textContent('#main')).includes('Was deiner Haut schadet oder hilft'), 'Haut-Verlauf zeigt Muster');

  // Woche läuft bis Sonntag: Protein an 6 Tagen, Mobility an 4 Tagen
  await ev(() => {
    for (let i = 1; i <= 6; i++) { const k = addDays('2026-11-09', i); mutDay(k, (d) => { if (i <= 5) d.entries.push({ id: 'p' + i, food: 'whey', g: 300, meal: 'snack', t: parseKey(k).getTime() }); if (i <= 3) d.knee = { ...(d.knee || {}), mob: true }; }); }
  });
  await page.clock.setFixedTime(new Date('2026-11-16T09:00:00+01:00'));
  await ev(() => { ui.lastToday = todayKey(); invalidate(); render(); });
  const fin = await ev(() => weekGoals('2026-11-09').map((g) => goalEval(g, '2026-11-09')).map((e) => `${e.status} ${e.progress}`));
  console.log('     Woche 46: ' + fin.join(' / '));
  ok(fin[0].startsWith('missed') && fin[1] === 'done 6/6 Tage' && fin[2].startsWith('missed 3/6') && fin[3].startsWith('missed 1/5'), 'Wochenbilanz: Koffein verfehlt, Protein geschafft, Mobility und Lesen verfehlt');
  // Montag ohne neue Ziele: Hinweis auf den Bericht der letzten Woche
  await ev(() => go('heute'));
  ok((await page.textContent('#main')).includes('Noch keine Wochenziele'), 'Montag ohne Ziele: Hinweis auf den Wochenbericht');
  // Rückblick der Woche 46 enthält die Ziele, nächster Bericht die Bilanz
  await ev(() => { ui.reviewWeek = '2026-11-09'; ui.sub.woche = 'rueckblick'; go('woche'); });
  ok((await page.$$('#main .goal')).length === 4, 'Rückblick zeigt die Wochenziele');
  const rep2 = await ev(() => frankReportText('2026-11-09'));
  ok(rep2.includes('## Wochenziele dieser Woche') && rep2.includes('Protein ab 180 g: 6/6 Tage → geschafft'), 'Nächster Bericht enthält die Bilanz der Ziele');
  await ev(() => { ui.sub.woche = 'muster'; render(); });
  ok((await page.textContent('#main')).includes('Nach Tagen mit Koffein nach 14:30'), 'Reiter „Muster“ erklärt die Zusammenhänge');
  ok((await page.textContent('#main')).includes('Letzten Kaffee vor 14:30 trinken'), 'Muster mit konkretem Tipp');
  ok((await page.textContent('#main')).includes('Deine Gewohnheiten') && (await ev(() => habitPatterns().length)) > 0, 'Gewohnheiten erkannt: ' + (await ev(() => habitPatterns().slice(0, 2).map((x) => x.text).join(' | '))));
  ok(rep2.includes('## Gewohnheiten der letzten 4 Wochen'), 'Bericht enthält die Gewohnheiten');
  await page.screenshot({ path: `${OUT}/z4-muster.png`, fullPage: true });
  // Beispiel-Code aus Franks Skill wird verstanden
  const skillEx = {"app":"protokoll-frank","v":1,"type":"ziele","week":"2026-11-16","review":{"good":["Protein an 6 von 7 Tagen im Ziel (Ø 192 g)"],"work":["Koffein am Nachmittag"],"more":["Natrium Ø 5,1 g (Grenze 4 g)"],"less":["Ballaststoffe Ø 34 g (Ziel 40 g)"],"tips":["Den zweiten Espresso direkt nach dem Mittagessen trinken"]},"goals":[{"area":"koffein","title":"Kein Koffein nach 14:30","metric":"caf_last","agg":"days","cmp":"<=","value":"14:30","need":6,"when":"14:00","why":"x","tip":"Ab 14:30 nur Wasser oder Kräutertee.","example":"x"},{"area":"ern","title":"Ballaststoffe ab 40 g","metric":"fib","agg":"days","cmp":">=","value":40,"need":5,"when":"19:00"},{"area":"sauna","title":"60 Min. Sauna","metric":"sauna","agg":"sum","cmp":">=","value":60},{"area":"schlaf","title":"7:30 Std. Schlaf","metric":"sleepDur","agg":"avg","cmp":">=","value":"7:30"},{"area":"haut","title":"Kein Whey","metric":"tag:whey","agg":"days","cmp":"<=","value":0,"need":7}]};
  const pr = await ev((o) => { const r = frankGoalsParse(o); return { n: r.goals.length, week: r.week, rules: r.goals.map((g) => goalRule(g)), when: r.goals.map((g) => g.when), tips: r.review.tips.length }; }, skillEx);
  console.log('     ' + pr.rules.join(' | '));
  ok(pr.n === 5 && pr.week === '2026-11-16' && pr.tips === 1, 'Skill-Beispiel: 5 Ziele, Woche, Vorschläge');
  ok(pr.rules[0] === 'Letztes Koffein ≤ 14:30 Uhr an 6 von 7 Tagen' && pr.rules[1] === 'Ballaststoffe ≥ 40 g an 5 von 7 Tagen' && pr.rules[2] === 'Sauna in der Woche ≥ 60 Min.' && pr.rules[3] === 'Ø Schlafdauer ≥ 7:30 Std.' && pr.rules[4] === 'Whey/Milchprotein: nein an 7 von 7 Tagen', 'Messregeln aus dem Skill-Beispiel');
  ok(pr.when[0] === '14:00' && pr.when[1] === '19:00' && pr.when[2] === null, 'Erinnerungszeiten übernommen');
  // Ziele mitten in der Woche (Mittwoch) übernehmen: nur ab heute zählen
  await page.clock.setFixedTime(new Date('2026-11-18T10:00:00+01:00'));
  await ev(() => { ui.lastToday = todayKey(); invalidate(); sheetFrank('', todayKey()); });
  await page.fill('#frank-code', JSON.stringify({ app: 'protokoll-frank', v: 1, type: 'ziele', week: '2026-11-16', goals: [{ area: 'ern', title: 'Protein ab 180 g', metric: 'p', agg: 'days', cmp: '>=', value: 180, need: 6 }, { area: 'sauna', title: '60 Min. Sauna', metric: 'sauna', agg: 'sum', cmp: '>=', value: 60 }] }));
  await page.waitForSelector('.goal-prev', { timeout: 5000 });
  ok((await ev(() => ui.sheet.gw)) === '2026-11-16' && (await page.textContent('#sheet')).includes('Protein ≥ 180 g an 5 von 5 Tagen'), 'Mittwoch: Ziel zählt nur die restlichen 5 Tage');
  await page.click('[data-a="goals-save"]');
  const mid = await ev(() => weekGoals('2026-11-16').map((g) => ({ from: g.from, e: goalEval(g, '2026-11-16').progress })));
  ok(mid[0].from === '2026-11-18' && mid[0].e === '0/5 Tage' && mid[1].e.startsWith('0 von 60'), 'Start ab Mittwoch gespeichert: ' + mid.map((x) => x.e).join(', '));
  // Backup enthält Ziele
  const bk = await ev(() => exportData());
  ok(bk.reviews['2026-11-09'].goals.length === 4, 'Backup enthält die Wochenziele');
  console.log(errors.length ? 'KONSOLENFEHLER:\n' + errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
