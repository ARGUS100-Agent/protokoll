// Interaktionstest der neuen Funktionen
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || '.';
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, timezoneId: 'Europe/Berlin', locale: 'de-DE', acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const today = await ev(() => todayKey());
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });

  // 1 Knie-Morgencheck auf Heute
  await page.click('.knee-am [data-a="knee-am"][data-v="2"]');
  ok((await ev((k) => getDay(k).knee.am, today)) === 2, 'Knie-Morgenwert gespeichert');
  await page.click('.knee-am [data-a="knee-flag"][data-v="Schwellung"]');
  ok((await ev((k) => redFlags(k).includes('Schwellung'), today)), 'Warnzeichen Schwellung erkannt');
  await shot('f01-heute-flag');
  await ev(() => go('knie'));
  await page.click('[data-a="knee-flag"][data-v="Schwellung"]');
  ok((await ev((k) => redFlags(k).length, today)) === 0, 'Warnzeichen wieder entfernt');

  // 2 Koffein
  await ev(() => go('licht', { date: todayKey() }));
  await page.click('[data-a="caf-add"][data-id="kaffee"]');
  await page.click('[data-a="caf-add"][data-id="monster_zero"]');
  const caf = await ev((k) => ({ n: getDay(k).caf.length, info: cafInfo(k), kcal: computeTotals(k, false).tot.kcal, fluid: computeTotals(k, false).tot.fluid }), today);
  ok(caf.n === 2, 'Zwei Koffein-Einträge');
  ok(Math.round(caf.info.total) === 250, 'Koffein gesamt 250 mg (' + Math.round(caf.info.total) + ')');
  ok(caf.kcal >= 15 && caf.kcal < 60, 'Monster Zero: Kalorien zählen in der Ernährung (' + Math.round(caf.kcal) + ' kcal)');
  ok(caf.fluid >= 700, 'Flüssigkeit aus Getränken (' + Math.round(caf.fluid) + ' ml)');
  ok(caf.info.bedLevel > 0 || caf.info.last >= caf.info.bed, 'Restkoffein zur Schlafenszeit berechnet: ' + Math.round(caf.info.bedLevel) + ' mg' + (caf.info.last >= caf.info.bed ? ' (Test läuft nach der Schlafenszeit, Getränke danach zählen erst für morgen)' : ''));
  await shot('f02-licht');
  // Uhrzeit ändern
  const cid = await ev((k) => getDay(k).caf[0].id, today);
  await page.fill(`[data-c="caf-time"][data-id="${cid}"]`, '09:30');
  await page.dispatchEvent(`[data-c="caf-time"][data-id="${cid}"]`, 'change');
  ok((await ev((k) => getDay(k).caf[0].t, today)) === '09:30', 'Koffein-Uhrzeit geändert');

  // 3 Sauna
  await ev(() => go('train', { date: todayKey() }));
  await page.click('[data-a="sauna-add"][data-v="10"]');
  ok((await ev((k) => saunaMin(getDay(k)), today)) === 10, 'Sauna 10 Min.');
  ok((await ev((k) => isSportDay(k), today)), 'Sauna/Training macht Sporttag (Flüssigkeitsziel)');

  // 4 Gym-Einheit
  await ev(() => { ui.sub.train = 'gym'; ui.gymDay = 2; render(); });
  await page.click('[data-a="gym-start"]');
  const sess = await ev(() => ui.gymSess);
  ok(!!sess, 'Gym-Einheit gestartet');
  const tr = await ev((k) => getDay(k).trainings[0], today);
  ok(tr.type === 'Unterkörper & Rumpf' && tr.gym.day === 2, 'Training Unterkörper angelegt');
  ok(tr.gym.ex.g_hacken && tr.gym.ex.g_hacken.alt === true, 'Knie-Variante am Beintag vorausgewählt');
  ok((await ev((k) => getDay(k).training, today)) != null, 'Ernährungsvariante automatisch gesetzt: ' + (await ev((k) => getDay(k).training, today)));
  await page.fill('[data-c="gym-val"][data-ex="g_rdl"][data-i="0"][data-f="w"]', '80');
  await page.dispatchEvent('[data-c="gym-val"][data-ex="g_rdl"][data-i="0"][data-f="w"]', 'change');
  await page.fill('[data-c="gym-val"][data-ex="g_rdl"][data-i="0"][data-f="r"]', '8');
  await page.dispatchEvent('[data-c="gym-val"][data-ex="g_rdl"][data-i="0"][data-f="r"]', 'change');
  await page.click('[data-a="gym-set"][data-ex="g_rdl"][data-i="0"]');
  const rdl = await ev((k) => getDay(k).trainings[0].gym.ex.g_rdl.s[0], today);
  ok(rdl.w === 80 && rdl.r === 8 && rdl.d === true, 'Satz mit 80 kg × 8 abgehakt');
  await shot('f03-gym-session');
  await page.click('[data-a="gym-int"][data-v="8"]');
  await page.click('[data-a="gym-finish"]');
  const tr2 = await ev((k) => getDay(k).trainings[0], today);
  ok(tr2.done && tr2.int === 8 && tr2.dur >= 1, 'Einheit abgeschlossen (Intensität 8, Dauer ' + tr2.dur + ')');

  // 5 Lauf
  await ev(() => { ui.sub.train = 'heute'; render(); });
  await page.click('[data-a="training-add"]');
  await page.click('[data-a="trs-type"][data-v="Laufen"]');
  await page.fill('#trs-time', '07:30');
  await page.fill('#trs-dur', '32');
  await page.fill('#trs-km', '5,2');
  await page.fill('#trs-cad', '162');
  await page.click('[data-a="trs-pain"][data-v="2"]');
  await page.click('[data-a="trs-ins"][data-v="0"]');
  await page.fill('#trs-shoe', 'Testschuh');
  await page.click('[data-a="trs-save"]');
  const run = await ev((k) => getDay(k).trainings.find((t) => t.type === 'Laufen'), today);
  ok(run && run.km === 5.2 && run.pain === 2 && run.cad === 162 && run.ins === false, 'Lauf mit km, Kadenz, Schmerz, Einlagen gespeichert');
  ok((await ev((k) => getDay(k).training, today)) === 'morgens', 'Lauf 07:30 → Variante A (morgens)');
  ok((await ev(() => kmWeek(weekStart(todayKey())))) === 5.2, 'km pro Woche');
  await shot('f04-train-today');

  // 6 Einkauf
  await ev(() => go('einkauf'));
  const firstBuy = await ev(() => S.shop.items.find((x) => x.list === 'buy').id);
  await page.click(`[data-a="shop-check"][data-id="${firstBuy}"]`);
  ok((await ev((id) => S.shop.items.find((x) => x.id === id).list, firstBuy)) === 'home', 'Artikel wandert nach Zuhause');
  await page.fill('#shop-new', 'Testartikel');
  await page.press('#shop-new', 'Enter');
  ok((await ev(() => S.shop.items.some((x) => x.n === 'Testartikel' && x.list === 'buy'))), 'Artikel per Enter hinzugefügt');
  await ev(() => { ui.sub.einkauf = 'home'; render(); });
  await page.click(`[data-a="shop-back"][data-id="${firstBuy}"]`);
  ok((await ev((id) => S.shop.items.find((x) => x.id === id).list, firstBuy)) === 'buy', 'Zurück auf die Liste');
  // Läden
  await ev(() => { ui.sub.einkauf = 'buy'; render(); });
  const heads = await page.$$eval('.shop-store-h .meal-h', (els) => els.map((e) => e.textContent.replace(/\s+\d+$/, '').trim()));
  ok(heads[0] === 'Lidl' && heads.includes('dm') && heads.includes('Rewe') && heads.includes('Sonstige') === false, 'Einkaufsliste nach Läden: ' + heads.join(', '));
  const maps = await page.$$eval('.shop-store-h a', (els) => els.map((e) => e.getAttribute('href')));
  ok(maps.length === heads.length && maps.every((h) => h.startsWith('https://maps.apple.com/?q=')) && maps.includes('https://maps.apple.com/?q=dm-drogerie%20markt'), 'Link „Nächste Filiale“ je Laden (Apple Karten)');
  ok((await page.textContent('#main')).includes('Gold-Kiwis: doppelt so viel Vitamin C'), 'Hinweis beim Artikel sichtbar');
  ok((await ev(() => S.shop.items.find((x) => x.n === 'Testartikel').store)) === 'lidl', 'Neuer Artikel (Gemüse) → Lidl');
  ok((await ev(() => areaStatus('einkauf', todayKey()).s)).startsWith('Lidl '), 'Kachel zeigt Läden: ' + (await ev(() => areaStatus('einkauf', todayKey()).s)));
  const skId = await ev(() => S.shop.items.find((x) => x.sid === "b:Sauerkraut").id);
  await page.click(`[data-a="shop-edit"][data-id="${skId}"]`);
  await page.click('#si-store [data-v="aldi"]');
  await page.fill('#si-tip', 'Bio, Kühlregal');
  await page.click('[data-a="shop-save"]');
  const skIt = await ev((id) => S.shop.items.find((x) => x.id === id), skId);
  ok(skIt.store === 'aldi' && skIt.tip === 'Bio, Kühlregal', 'Laden und Hinweis geändert');
  ok((await page.$$eval('.shop-store-h .meal-h', (els) => els.map((e) => e.textContent))).some((t) => t.startsWith('Aldi Süd')), 'Artikel steht jetzt unter Aldi Süd');
  await shot('f05-einkauf-laeden');
  await page.click('[data-a="shop-group"][data-v="cat"]');
  ok((await page.$$('.store-tag')).length > 30 && !(await page.$('.shop-store-h')), 'Ansicht nach Kategorie mit Laden-Etikett');
  await shot('f05-einkauf-kategorie');
  await page.click('[data-a="shop-group"][data-v="store"]');
  ok((await ev(() => ui.shopGroup.buy)) === 'store', 'Zurück zur Ansicht nach Laden');
  // Auswahl Rote Bete: Einheit passt zum Lebensmittel
  await ev(() => { ui.exp.add('blk:vielfalt'); ui.ernSub = 'plan'; go('ern', { date: todayKey() }); });
  const rb = () => page.textContent('#b-vielfalt .item:has([data-id="v_rotebete"]) .amt');
  ok((await rb()).trim() === '200 ml', 'Rote-Bete-Saft in ml: ' + (await rb()).trim());
  await page.click('#b-vielfalt [data-a="choice"][data-key="v_rotebete"][data-v="rote_bete"]');
  ok((await rb()).trim() === '200 g', 'Rote Bete (Knolle) in g: ' + (await rb()).trim());
  ok((await ev(() => getDay(todayKey()).checks.v_rotebete)) === undefined, 'Auswahl hakt nichts ab');

  // 7 Blutwerte
  await ev(() => go('blut'));
  await page.click('[data-a="blood-add"] >> nth=0');
  await page.fill('[data-bl="vitd"]', '24,5');
  await page.fill('[data-bl="ferritin"]', '85');
  await page.click('[data-a="blood-save"]');
  const bl = await ev(() => ({ n: S.blood.entries.length, st: bloodStatus(bloodMarkers().find((m) => m.id === 'vitd'), 24.5) }));
  ok(bl.n === 1 && bl.st === 'low', 'Blutwert gespeichert, Vitamin D als niedrig erkannt');
  await page.click('[data-a="blood-open"][data-id="vitd"]');
  await shot('f05-blut');

  // 8 Knie-Test
  await ev(() => { go('knie'); ui.sub.knie = 'tests'; render(); });
  await page.click('[data-a="test-new"]');
  await page.click('[data-a="test-sd"][data-side="L"][data-v="1"]');
  await page.click('[data-a="test-sd"][data-side="R"][data-v="0"]');
  await page.fill('[data-tf="k2wL"]', '11');
  await page.fill('[data-tf="k2wR"]', '9,5');
  await page.click('[data-a="test-save"]');
  const kt = await ev(() => S.knee.tests[0]);
  ok(kt && kt.sdL === true && kt.sdR === false && kt.k2wR === 9.5, 'Knie-Test gespeichert');
  ok((await ev(() => testDue().due)) === false, 'Test nicht mehr fällig');

  // 9 Timer komplett
  await ev(() => { ui.sub.knie = 'heute'; render(); });
  // „Vor dem Lauf“ steht nur an Lauftagen auf Heute, sonst unter Läufe
  if (!(await page.$('[data-a="timer-start"][data-r="vorlauf"]'))) await ev(() => { ui.sub.knie = 'laeufe'; render(); });
  await page.click('[data-a="timer-start"][data-r="vorlauf"]');
  ok(await page.isVisible('#overlay.open'), 'Timer-Overlay offen');
  const nSteps = await ev(() => ui.timer.steps.length);
  const stepInfo = await ev(() => ui.timer.steps.map((s) => `${s.ex}:${s.side || '-'}:${s.sec || s.reps}`).join(' '));
  console.log('     Schritte vor dem Lauf: ' + stepInfo);
  ok(stepInfo.includes('m_fusskreisen:R:25') && stepInfo.includes('m_fusskreisen:L:20'), 'Rechts automatisch +5 Wiederholungen');
  await shot('f06-timer');
  for (let i = 0; i < nSteps * 3 + 5; i++) {
    const ph = await ev(() => ui.timer && ui.timer.phase);
    if (ph === 'done') break;
    await page.click('[data-a="tm-next"] >> nth=0');
  }
  ok((await ev(() => ui.timer.phase)) === 'done', 'Timer bis zum Ende durchlaufen');
  await shot('f07-timer-done');
  await page.click('[data-a="tm-save"]');
  const ses = await ev((k) => getDay(k).knee.sess, today);
  ok(ses && ses.length === 1 && ses[0].r === 'vorlauf' && ses[0].complete, 'Routine gespeichert');
  // Lange Routine: Rechts +15 Sek.
  const lang = await ev(() => buildSteps(routineById('lang')).filter((s) => s.ex === 'r_wade').map((s) => s.side + s.sec).join(','));
  ok(lang === 'L60,R75', 'Lange Routine: Waden links 60 / rechts 75 Sek. (' + lang + ')');
  const langMin = await ev(() => Math.round(routineSec(routineById('lang')) / 60));
  const kurzMin = await ev(() => Math.round(routineSec(routineById('kurz')) / 60));
  const shortMin = await ev(() => Math.round(routineSec(routineById('lang'), { short: true }) / 60));
  console.log(`     Geplante Dauer: lang ${langMin} Min., 45-Min.-Version ${shortMin} Min., kurz ${kurzMin} Min.`);

  // 10 Knie-Kraft
  await ev(() => { ui.sub.knie = 'kraft'; render(); });
  await page.click('[data-a="ath-type"][data-v="B"]');
  await page.click('[data-a="kstr-set"][data-ex="k_clamshell"][data-i="0"]');
  await page.click('[data-a="kstr-load"][data-ex="k_clamshell"][data-v="Rot"]');
  await page.click('[data-a="kstr-done"]');
  const str = await ev((k) => getDay(k).knee.str, today);
  ok(str.done && str.t === 'B' && str.ex.k_clamshell.sets[0] === true && str.ex.k_clamshell.load === 'Rot', 'Knie-Kraft (Einheit B) Satz, Band und Abschluss gespeichert');
  await shot('f08-kraft');

  // 11 Foto
  const dataUrl = await ev(() => { const c = document.createElement('canvas'); c.width = 900; c.height = 1200; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 900, 1200); gr.addColorStop(0, '#d9a877'); gr.addColorStop(1, '#3b60a4'); g.fillStyle = gr; g.fillRect(0, 0, 900, 1200); g.fillStyle = '#fff'; g.font = '80px sans-serif'; g.fillText('Test', 300, 600); return c.toDataURL('image/jpeg', 0.9); });
  const img = `${OUT}/test.jpg`;
  fs.writeFileSync(img, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await ev(() => { go('haut'); ui.sub.haut = 'fotos'; render(); });
  await page.waitForTimeout(300);
  await page.setInputFiles('input[data-c="photo-up"][data-angle="frontal"]', img);
  for (let i = 0; i < 30 && !(await ev(() => photoIdx.keys.length)); i++) await page.waitForTimeout(200);
  const pk = await ev(() => photoIdx.keys.slice());
  ok(pk.length === 1, 'Foto gespeichert ' + JSON.stringify(pk));
  await page.setInputFiles('input[data-c="photo-up"][data-angle="links"]', img);
  for (let i = 0; i < 40 && (await ev(() => photoIdx.keys.length)) < 2; i++) await page.waitForTimeout(200);
  await shot('f09-fotos');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), ev(() => A['photos-export']())]);
  const zipPath = `${OUT}/fotos.zip`;
  await dl.saveAs(zipPath);
  ok(fs.statSync(zipPath).size > 1000, 'Foto-ZIP erzeugt (' + fs.statSync(zipPath).size + ' Bytes)');
  // Fotos löschen und ZIP wieder importieren
  await ev(async () => { await PhotoDB.clear(); await loadPhotoIndex(); });
  ok((await ev(() => photoIdx.keys.length)) === 0, 'Fotos gelöscht');
  await ev(() => { go('set'); ui.setOpen = 'backup'; render(); });
  await page.setInputFiles('input[data-c="photos-import"]', zipPath);
  for (let i = 0; i < 40 && (await ev(() => photoIdx.keys.length)) < 2; i++) await page.waitForTimeout(200);
  ok((await ev(() => photoIdx.keys.length)) === 2, 'Foto-ZIP importiert (2 Fotos)');

  // 12 Hautscore per Slider + Stellen
  await ev(() => { go('haut', { date: todayKey() }); ui.sub.haut = 'heute'; render(); });
  await page.click('[data-a="skin-score"][data-v="7"]');
  await page.click('[data-a="skin-area"][data-v="Kinn"]');
  const sk = await ev((k) => getDay(k).skin, today);
  ok(sk.score === 7 && sk.areas.includes('Kinn'), 'Hautscore 7 und Stelle Kinn');
  await ev(() => { const r = $('input[type=range][data-c="skin-range"]'); r.value = '8'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); });
  ok((await ev((k) => getDay(k).skin.score, today)) === 8, 'Slider setzt Hautscore 8');
  await shot('f10-haut');

  // 13 Termine
  await ev(() => { go('knie'); ui.sub.knie = 'infos'; render(); });
  await page.click('[data-a="todo-suggest"][data-v="Schuhkauf"]');
  await page.fill('#todo-date', await ev(() => addDays(todayKey(), 3)));
  await page.click('[data-a="todo-add"]');
  ok((await ev(() => todosDue(7).some((t) => t.t === 'Schuhkauf'))), 'Termin mit Datum erscheint als fällig');

  // 14 Wochenrückblick
  const rv = await ev(() => { const r = weekReview(weekStart(todayKey())); return { tr: r.trainings.length, sauna: r.sauna, good: r.good, bad: r.bad, km: r.km }; });
  ok(rv.tr === 2 && rv.sauna === 10 && rv.km === 5.2, 'Rückblick zählt Trainings, Sauna, km');
  console.log('     Lief gut: ' + rv.good.join(' | '));
  console.log('     Verbessern: ' + rv.bad.join(' | '));
  await ev(() => { go('woche'); render(); });
  await page.fill('[data-c="review-note"]', 'Notiz zur Woche');
  await page.dispatchEvent('[data-c="review-note"]', 'change');
  ok((await ev(() => S.reviews[weekStart(todayKey())].note)) === 'Notiz zur Woche', 'Rückblick-Notiz gespeichert');
  await shot('f11-woche');

  // 15 Backup Export/Import
  await ev(() => flush());
  const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), ev(() => shareBackup())]);
  const bPath = `${OUT}/backup.json`;
  await dl2.saveAs(bPath);
  const bk = JSON.parse(fs.readFileSync(bPath, 'utf8'));
  ok(bk.schema === 5 && bk.shop && bk.blood.entries.length === 1 && bk.knee.tests.length === 1 && bk.reviews && bk.settings.knee && bk.settings.caf, 'Backup enthält alle neuen Daten');
  // alles löschen, dann importieren
  await ev(() => { go('set'); ui.setOpen = 'backup'; render(); });
  await page.click('[data-a="wipe-ask"]');
  await page.fill('#wipe-in', 'LÖSCHEN');
  await page.click('[data-a="wipe-do"]');
  await page.waitForTimeout(500);
  ok((await ev(() => Object.keys(S.days).length + S.blood.entries.length + photoIdx.keys.length)) === 0, 'Alles gelöscht (inkl. Fotos)');
  await ev(() => { go('set'); ui.setOpen = 'backup'; render(); });
  await page.setInputFiles('input[data-c="backup-import"]', bPath);
  await page.waitForTimeout(400);
  await page.click('[data-a="import-do"][data-mode="replace"]');
  await page.waitForTimeout(500);
  const after = await ev((k) => ({ caf: getDay(k).caf.length, blood: S.blood.entries.length, tests: S.knee.tests.length, note: (S.reviews[weekStart(k)] || {}).note, sess: getDay(k).knee.sess.length }), today);
  ok(after.caf === 2 && after.blood === 1 && after.tests === 1 && after.note === 'Notiz zur Woche' && after.sess === 1, 'Import stellt alles wieder her');
  // Neu laden: Daten bleiben
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  const persisted = await ev((k) => ({ blood: S.blood.entries.length, train: getDay(k).trainings.length, schema: S.meta.schema }), today);
  ok(persisted.blood === 1 && persisted.train === 2 && persisted.schema === 5, 'Nach Neuladen alles noch da');
  await shot('f12-heute-nach-import');

  console.log(errors.length ? 'KONSOLENFEHLER:\n' + errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
