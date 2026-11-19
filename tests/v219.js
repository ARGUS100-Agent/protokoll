// 2.19 (19.11.2026): Gramm für jeden Posten (z. B. Banane statt „1 Stück“ genau 118 g), bisherige Tage behalten
// ihre Menge, ESN Super Omega-3 statt Algenöl (Umstellung mit Verlauf), ESN Ashwa+ abends, Bundeslebensmittelschlüssel
// 4.0 in der Suche und zum Abgleichen. Nur ausgedachte Testdaten.
const fs = require('fs');
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
  await page.clock.install({ time: new Date('2026-11-25T18:30:00+01:00') }); // Mittwoch
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  await page.clock.runFor(1200);
  for (let i = 0; i < 50 && !(await page.evaluate(() => typeof S !== 'undefined' && !!S.settings && document.body.classList.contains('ready'))); i++) { await page.waitForTimeout(100); await page.clock.runFor(100); }
  const ev = (fn, a) => page.evaluate(fn, a);
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
  const until = async (sel, n = 40) => { for (let i = 0; i < n; i++) { if (await page.$(sel)) return true; await page.clock.runFor(150); await page.waitForTimeout(60); } return false; };

  /* ---------- Neuinstallation: neuer Standardtag ---------- */
  const fresh = await ev(() => {
    const o = findItem('f_omega3').it, a = findItem('s_ashwa');
    return { food: o.food, a: o.a, u: o.u, av: o.av, ash: a && a.block.id, ashA: a && a.it.a, hi: T().o3.hi, mig: S.settings.mig };
  });
  ok(fresh.food === 's_omega3_esn' && fresh.a === 3 && fresh.u === 'Kapsel' && fresh.av.makrele === 2 && fresh.av.doener === 2, 'Neuer Standardtag: ESN Super Omega-3, 3 Kapseln, an Makrele- und Döner-Tagen 2');
  ok(fresh.ash === 'schlaf' && fresh.ashA === 2, 'ESN Ashwa+: 2 Kapseln im Block „Vor dem Schlafen“');
  ok(fresh.hi === 2.5 && fresh.mig >= 219, 'Omega-3-Ziel bis 2,5 g, Merker 219 gesetzt');

  /* ---------- Bestehende Daten: Umstellung mit Verlauf ---------- */
  const mig = await ev(() => {
    const it = findItem('f_omega3').it;
    Object.assign(it, { food: 's_omega3', a: 2, u: 'Tagesdosis', av: { doener: 1, makrele: 1 }, hint: 'an Makrele-Tagen 1' });
    const sch = S.settings.plan.find((b) => b.id === 'schlaf'); sch.items = sch.items.filter((x) => x.id !== 's_ashwa');
    S.settings.targets.o3 = { lo: 1, hi: 2, max: 5 };
    S.settings.mig = 216; delete S.settings.o3Old;
    S.shop.items = S.shop.items.filter((x) => x.sid !== 'h:Ashwagandha'); S.shop.items.find((x) => x.sid === 'h:Omega-3').tip = 'Algenöl';
    S.settings.weekPlan = ['prep', 'prep', 'prep', 'prep', 'prep', 'prep', 'prep'];
    mutDay('2026-11-20', (d) => { d.checks.f_omega3 = 1; });
    mutDay('2026-11-21', (d) => { d.checks.f_omega3 = 1; d.variant = 'makrele'; });
    mutDay('2026-11-22', (d) => { d.checks.f_omega3 = 1; d.amt.f_omega3 = 1.5; });
    mutDay('2026-11-25', (d) => { d.checks.f_omega3 = 1; });
    const epa = (k) => Math.round((computeTotals(k, false).tot.epa || 0) * 1000);
    const before = ['2026-11-20', '2026-11-21', '2026-11-22'].map(epa);
    migrate219();
    const after = ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-25'].map(epa);
    const d20 = S.days['2026-11-20'], d22 = S.days['2026-11-22'];
    const n = findItem('f_omega3').it;
    return { before, after, pin20: [d20.choice.f_omega3, d20.amt.f_omega3, d20.amtU.f_omega3], pin22: [d22.amt.f_omega3, d22.amtU.f_omega3], today: S.days['2026-11-25'].choice.f_omega3 || null,
      item: [n.food, n.a, n.u], ash: !!findItem('s_ashwa'), hi: S.settings.targets.o3.hi, o3Old: S.settings.o3Old,
      shop: S.shop.items.find((x) => x.sid === 'h:Omega-3').tip, shopAsh: (S.shop.items.find((x) => x.sid === 'h:Ashwagandha') || {}).list };
  });
  ok(JSON.stringify(mig.before) === JSON.stringify(mig.after.slice(0, 3)), `Frühere Tage rechnen weiter mit dem Algenöl: EPA ${mig.before.join(' / ')} mg vorher = ${mig.after.slice(0, 3).join(' / ')} mg nachher`);
  ok(mig.after[0] === 1152 && mig.after[1] === 576 && mig.after[2] === 864, 'Algenöl-Tage: 2 Tagesdosen, Makrele-Tag 1, eigene Menge 1,5');
  ok(mig.after[3] === 1200 && !mig.today, 'Heute zählt schon ESN: 3 Kapseln = 1.200 mg EPA');
  ok(mig.pin20[0] === 's_omega3' && mig.pin20[1] === 2 && mig.pin20[2] === 'Tagesdosis' && mig.pin22[0] === 1.5 && mig.pin22[1] === 'Tagesdosis', 'Verlauf festgehalten (Lebensmittel, Menge, Einheit)');
  ok(mig.item.join() === 's_omega3_esn,3,Kapsel' && mig.ash && mig.hi === 2.5, 'Plan umgestellt: ESN 3 Kapseln, Ashwa+ ergänzt, Ziel bis 2,5 g');
  ok(mig.o3Old && mig.o3Old.since === '2026-11-25' && mig.o3Old.a === 2, 'Alter Omega-3-Posten gemerkt (für Backup-Import)');
  ok(/ESN Super Omega-3/.test(mig.shop) && mig.shopAsh === 'home', 'Einkauf: Omega-3-Hinweis ESN, Ashwagandha als vorhanden');

  // Backup-Import eines älteren Stands (Ersetzen): Umstellung greift wieder
  const imp = await ev(async () => {
    const data = JSON.parse(JSON.stringify(exportData()));
    const it = data.settings.plan.flatMap((b) => b.items).find((x) => x.id === 'f_omega3');
    Object.assign(it, { food: 's_omega3', a: 2, u: 'Tagesdosis', av: { doener: 1, makrele: 1 } });
    for (const b of data.settings.plan) b.items = b.items.filter((x) => x.id !== 's_ashwa');
    data.settings.mig = 216; delete data.settings.o3Old;
    for (const d of Object.values(data.days)) { if (d.choice) delete d.choice.f_omega3; if (d.amtU) delete d.amtU.f_omega3; if (d.amt && d.date !== '2026-11-22') delete d.amt.f_omega3; }
    ui.sheet = { type: 'import', data }; await A['import-do']({ dataset: { mode: 'replace' } });
    return { epa20: Math.round(computeTotals('2026-11-20', false).tot.epa * 1000), food: findItem('f_omega3').it.food, ash: !!findItem('s_ashwa') };
  });
  await page.clock.runFor(800);
  ok(imp.epa20 === 1152 && imp.food === 's_omega3_esn' && imp.ash, 'Import eines älteren Backups: Umstellung und Verlauf wie beim Update');

  // Omega-3 an einem normalen Tag im Ziel, Ashwa+ zählt Magnesium aus Supplements
  const sup = await ev(() => {
    mutDay('2026-11-24', (d) => { d.checks.f_omega3 = 1; d.checks.s_ashwa = 1; d.checks.s_mg = 1; });
    const ev2 = evaluate('2026-11-24'), t = computeTotals('2026-11-24', false).tot;
    return { o3: Math.round(ev2.metrics.o3.v * 100) / 100, st: ev2.metrics.o3.state, mgSupp: Math.round(t.mgSupp), zn: Math.round((t.zn || 0) * 10) / 10 };
  });
  ok(sup.o3 === 2.1 && sup.st === 'ok', `Omega-3 mit 3 Kapseln: ${sup.o3} g, im Ziel`);
  ok(sup.mgSupp === 206, `Magnesium aus Supplements: Ashwa+ 62 mg + Threonat 144 mg = ${sup.mgSupp} mg`);
  await ev(() => go('supp')); await page.clock.runFor(300);
  let txt = await page.textContent('#main');
  ok(/Ashwagandha/.test(txt) && /Omega-3/.test(txt), 'Supplements-Ansicht zeigt Omega-3 und Ashwagandha');
  const info = await ev(() => infoHTML('s_ashwagandha'));
  ok(/BfR/.test(info) && /Leber/.test(info) && /Cheah 2021/.test(info), 'Ashwagandha-Erklärung mit BfR-Hinweisen und Studienlage');

  /* ---------- Gramm für jeden Posten ---------- */
  await ev(() => { mutDay('2026-11-23', (d) => { d.checks.t_banane = 1; }); ui.ernSub = 'plan'; go('ern', { date: '2026-11-25' }); });
  await page.clock.runFor(300);
  await page.click('[data-a="open-item"][data-id="t_banane"]'); await page.clock.runFor(200);
  const chips = await page.$$eval('.sheet [data-a="sheet-unit"]', (b) => b.map((x) => x.textContent.trim()));
  ok(chips.includes('Stück') && chips.includes('g'), `Mengen-Fenster der Banane: Einheiten ${chips.join(', ')}`);
  await page.click('.sheet [data-a="sheet-unit"][data-v="g"]'); await page.clock.runFor(150);
  ok((await page.inputValue('#sh-amt')) === '120', 'Umschalten auf g rechnet 1 Stück in 120 g um');
  await page.fill('#sh-amt', '118'); await page.clock.runFor(100);
  await shot('v219-banane-gramm');
  await page.click('.sheet [data-a="item-save"][data-mode="check"]'); await page.clock.runFor(300);
  const ban = await ev(() => { const d = S.days['2026-11-25']; const it = findItem('t_banane').it; return { amt: d.amt.t_banane, u: d.amtU.t_banane, g: itemGrams(it, d, dayVariant('2026-11-25')), on: !!d.checks.t_banane }; });
  ok(ban.amt === 118 && ban.u === 'g' && ban.g === 118 && ban.on, 'Banane mit 118 g abgehakt (Menge und Einheit am Tag gespeichert)');
  txt = await page.textContent('[data-a="open-item"][data-id="t_banane"]');
  ok(/118\s*g/.test(txt), `Standardtag zeigt „${txt.trim()}“`);
  // zurück auf Stück mit Standardmenge: Tageswert wird wieder gelöscht
  await page.click('[data-a="open-item"][data-id="t_banane"]'); await page.clock.runFor(200);
  await page.click('.sheet [data-a="sheet-unit"][data-v="Stück"]'); await page.clock.runFor(150);
  ok((await page.inputValue('#sh-amt')) === '1', 'Zurück auf Stück: 118 g → 1 Stück');
  await page.click('.sheet [data-a="item-save"][data-mode="amt"]'); await page.clock.runFor(200);
  ok(await ev(() => { const d = S.days['2026-11-25']; return d.amt.t_banane == null && !(d.amtU || {}).t_banane; }), 'Gleich wie Standard: keine Tagesmenge mehr gespeichert');
  // neue Standardmenge in Gramm: frühere Tage behalten 1 Stück (120 g)
  await page.click('[data-a="open-item"][data-id="t_banane"]'); await page.clock.runFor(200);
  await page.click('.sheet [data-a="sheet-unit"][data-v="g"]'); await page.clock.runFor(100);
  await page.fill('#sh-amt', '110'); await page.clock.runFor(100);
  await page.click('.sheet [data-a="item-save"][data-mode="default"]'); await page.clock.runFor(300);
  const def = await ev(() => { const it = findItem('t_banane').it, d23 = S.days['2026-11-23']; return { a: it.a, u: it.u, g23: itemGrams(it, d23, dayVariant('2026-11-23')), pin: [d23.amt.t_banane, d23.amtU.t_banane], g25: itemGrams(it, getDay('2026-11-25'), dayVariant('2026-11-25')) }; });
  ok(def.a === 110 && def.u === 'g' && def.g25 === 110, 'Neue Standardmenge: 110 g Banane');
  ok(def.g23 === 120 && def.pin[0] === 1 && def.pin[1] === 'Stück', 'Frühere Tage behalten 1 Stück (120 g)');
  // Einstellungen → Standardtag: Einheit des Apfels auf g – Menge wird umgerechnet, Verlauf bleibt
  const pe = await ev(() => {
    mutDay('2026-11-22', (d) => { d.checks.v_apfel = 1; });
    const b = S.settings.plan.find((x) => x.items.some((i) => i.id === 'v_apfel')), i = b.items.findIndex((x) => x.id === 'v_apfel');
    const el = document.createElement('select'); el.innerHTML = '<option>g</option>'; el.value = 'g'; el.dataset.b = b.id; el.dataset.i = String(i);
    C['pe-unit'](el);
    const it = findItem('v_apfel').it, d = S.days['2026-11-22'];
    return { a: it.a, u: it.u, g22: itemGrams(it, d, dayVariant('2026-11-22')) };
  });
  ok(pe.a === 150 && pe.u === 'g' && pe.g22 === 150, 'Standardtag-Editor: Apfel 1 Stück → 150 g, frühere Tage unverändert');

  /* ---------- Bundeslebensmittelschlüssel 4.0 ---------- */
  await ev(() => { ui.ernSub = 'detail'; ui.q = ''; go('ern', { date: '2026-11-25' }); }); await page.clock.runFor(300);
  await page.fill('[data-i="search"]', 'Banane');
  ok(await until('[data-a="bls-open"]'), 'Suche „Banane“: BLS-Treffer erscheinen (Datei lädt bei der ersten Suche)');
  txt = await page.textContent('#results');
  ok(/Bundeslebensmittelschlüssel/.test(txt) && /Banane roh/.test(txt) && /Banane/.test(txt), 'Eigene Banane oben, darunter „Banane roh“ aus dem BLS');
  await shot('v219-bls-suche');
  const first = await page.$eval('[data-a="bls-open"]', (b) => b.dataset.code);
  await page.click('[data-a="bls-open"][data-code="F503100"]'); await page.clock.runFor(200);
  txt = await page.textContent('.sheet');
  ok(/Banane roh/.test(txt) && /Bundeslebensmittelschlüssel 4\.0 \(F503100\)/.test(txt), `BLS-Banane öffnet das Eintragen-Fenster mit Quelle (erster Treffer ${first})`);
  ok(await ev(() => !S.foods.custom.some((f) => f.id === 'bls_F503100')), 'Nur geöffnet: noch nicht gespeichert');
  await page.fill('#sh-amt', '118'); await page.clock.runFor(100);
  await page.click('.sheet [data-a="entry-save"]'); await page.clock.runFor(300);
  const ent = await ev(() => {
    const d = S.days['2026-11-25'], e = d.entries.find((x) => x.food === 'bls_F503100'), f = S.foods.custom.find((x) => x.id === 'bls_F503100');
    return { g: e && e.g, saved: !!f, pl: f && f.pl, kcal: f && f.v.kcal, cat: f && f.cat, b6: f && f.v.b6, plants: [...weekPlants('2026-11-25', true)].includes('Banane') };
  });
  ok(ent.g === 118 && ent.saved && ent.kcal === 79 && ent.cat === 'Obst', 'Eingetragen: 118 g BLS-Banane (79 kcal/100 g), als Lebensmittel gespeichert');
  ok(ent.pl === 'Banane' && ent.b6 > 0.2 && ent.b6 < 0.3 && ent.plants, 'Pflanze „Banane“ zählt für die Vielfalt, B6 in mg umgerechnet');
  // Getränk aus dem BLS: ml und Flüssigkeit
  await page.fill('[data-i="search"]', 'Pilsner'); await until('[data-a="bls-open"]');
  const pils = await ev(() => { const code = [...document.querySelectorAll('[data-a="bls-open"]')].map((b) => b.dataset.code).find((c) => /^P/.test(c)); const id = blsRegister(code); const f = FOOD[id]; return { u: f.u[0][0], fl: f.fl, alk: f.v.alk, rt: !!f.rt }; });
  ok(pils.u === 'ml' && pils.fl > 85 && pils.alk > 3 && pils.rt, 'Bier aus dem BLS: in ml, zählt als Flüssigkeit, Alkohol erkannt');
  ok(await ev(() => !searchResults().includes('data-a="food-open" data-id="bls_P')), 'Nur geöffnete BLS-Einträge stehen nicht doppelt in den eigenen Treffern');
  // Abgleich: eigene Banane auf BLS-Werte umstellen und zurück
  await ev(() => sheetFoodEdit('banane')); await page.clock.runFor(200);
  await page.click('.sheet [data-a="bls-match"]'); await page.clock.runFor(200);
  ok((await page.inputValue('[data-i="bls-q"]')) === 'Banane', 'Abgleich startet mit der Suche „Banane“');
  await until('.sheet [data-a="bls-pick"][data-code="F503100"]');
  await page.click('.sheet [data-a="bls-pick"][data-code="F503100"]'); await page.clock.runFor(200);
  txt = await page.textContent('.sheet');
  ok(/Bisher/.test(txt) && /BLS/.test(txt) && /F503100/.test(txt), 'Vergleichstabelle bisher ↔ BLS');
  await shot('v219-bls-vergleich');
  const keep = await ev(() => ({ cho: FOOD.banane.v.cho || 0, kcal: FOOD.banane.v.kcal }));
  await page.click('.sheet [data-a="bls-apply"]'); await page.clock.runFor(300);
  const ap = await ev(() => ({ kcal: FOOD.banane.v.kcal, cho: FOOD.banane.v.cho || 0, bls: FOOD.banane.bls, edited: !!FOOD.banane.edited, over: S.foods.over.banane && S.foods.over.banane.bls }));
  ok(ap.kcal === 79 && ap.bls === 'F503100' && ap.edited && ap.over === 'F503100', `Banane übernimmt BLS-Werte (${keep.kcal} → ${ap.kcal} kcal)`);
  ok(ap.cho === keep.cho, 'Werte, die der BLS nicht hat (Cholin), bleiben');
  await ev(() => { sheetFoodEdit('banane'); }); await page.clock.runFor(150);
  ok(/Werte aus dem Bundeslebensmittelschlüssel 4\.0 \(F503100\)/.test(await page.textContent('.sheet')), 'Lebensmittel bearbeiten zeigt die BLS-Herkunft');
  await page.click('.sheet [data-a="fe-reset"]'); await page.clock.runFor(200);
  ok(await ev(() => FOOD.banane.v.kcal === FOODS.find((f) => f.id === 'banane').v.kcal && !FOOD.banane.bls), 'Auf Originalwerte zurücksetzen stellt die App-Werte wieder her');
  // Standardtag: Posten aus dem BLS hinzufügen
  await ev(() => sheetPickFood('nachmittag')); await page.clock.runFor(150);
  await page.fill('[data-i="pick-search"]', 'Linse reif'); await until('[data-a="pe-pick-bls"]');
  const code = await page.$eval('[data-a="pe-pick-bls"]', (b) => b.dataset.code);
  await page.click(`[data-a="pe-pick-bls"][data-code="${code}"]`); await page.clock.runFor(300);
  const pk = await ev((c) => { const b = S.settings.plan.find((x) => x.id === 'nachmittag'); const it = b.items[b.items.length - 1]; return { food: it.food, a: it.a, u: it.u, saved: S.foods.custom.some((f) => f.id === 'bls_' + c) }; }, code);
  ok(pk.food === 'bls_' + code && pk.a === 100 && pk.u === 'g' && pk.saved, `Posten hinzufügen: ${code} aus dem BLS, 100 g, dauerhaft gespeichert`);
  // Quelle in „Über“
  await ev(() => { go('set'); ui.setView = 'about'; render(); }); await page.clock.runFor(200);
  const about = await ev(() => SET_VIEWS.about());
  ok(/Max Rubner-Institut \(2025\): Bundeslebensmittelschlüssel \(BLS\), Version 4\.0/.test(about), 'Quellenangabe in „Über“');
  const sw = fs.readFileSync(require('path').join(__dirname, '..', 'docs', 'sw.js'), 'utf8');
  ok(/protokoll-bls40-1/.test(sw) && /bls40\.json/.test(sw), 'Service Worker: eigener Cache für die BLS-Datei');

  ok(errors.length === 0, 'keine Fehler' + (errors.length ? ':\n' + errors.join('\n') : ''));
  await browser.close();
})();
