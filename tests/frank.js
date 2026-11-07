// Frank: Code aus dem Claude-Chat einfügen, Vorschau, Eintragen, Ersetzen
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
const ITEM = {
  name: 'Milbona High Protein Drink Schoko', cat: 'Eier & Milch', liquid: true, fluid: 86,
  portion: { name: 'Flasche', size: 350 }, eaten: { amount: 1, unit: 'Flasche' }, meal: 'snack',
  values: { kcal: 62, p: 10, f: 0.5, sf: 0.1, c: 4.7, sug: 4.6, fs: 0, fib: 0.4, na: 43, k: 190, ca: 260, mg: 24, fe: 0.2, zn: 0.8, se: 2.5, i: 12, cu: 0.06, va: 2, ret: 2, b12: 1.1, fol: 6, b6: 0.05, cho: 16, caf: 2 },
  estimated: ['k', 'ca', 'mg', 'fe', 'zn', 'se', 'i', 'cu', 'va', 'ret', 'b12', 'fol', 'b6', 'cho', 'caf'],
  tags: ['milbona', 'whey', 'upf'], plants: [], pp: 0.5,
  sources: ['https://world.openfoodfacts.org/product/4056489246336/high-protein-drink-milbona', 'javascript:alert(1)'],
  note: 'Makros laut „Etikett“ (Open Food Facts), Mikronährstoffe geschätzt.',
};
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, timezoneId: 'Europe/Berlin', locale: 'de-DE' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:8766' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const today = await ev(() => todayKey());
  const code = JSON.stringify({ app: 'protokoll-frank', v: 1, items: [{ ...ITEM, date: today }] });
  const message = `**Milbona High Protein Drink Schoko**, 1 Flasche (350 g): 217 kcal · 35 g Eiweiß.\n\n\`\`\`json\n${code}\n\`\`\`\n\nCode kopieren → Protokoll-App → Ernährung → Frank → Einfügen.`;

  // Einstieg im Bereich Lebensmittel
  await ev(() => { ui.ernSub = 'detail'; go('ern', { date: todayKey() }); });
  ok(!!(await page.$('[data-a="frank-open"]')), 'Knopf „Frank fragen“ bei Lebensmittel');
  await page.fill('input[data-i="search"]', 'Proteinriegel xyz');
  ok(!!(await page.$('#results [data-a="frank-open"][data-q="Proteinriegel xyz"]')), 'Keine Treffer → „Frank fragen“ mit Suchbegriff');
  await page.click('#results [data-a="frank-open"]');
  ok((await page.inputValue('#frank-q')) === 'Proteinriegel xyz', 'Suchbegriff ist vorausgefüllt');
  await page.fill('#frank-q', 'Milbona Shake, 1 Flasche');
  const href = await page.getAttribute('#frank-go', 'href');
  ok(href === 'https://claude.ai/new?q=' + encodeURIComponent('Frank: Milbona Shake, 1 Flasche'), 'Link zu Claude mit Text: ' + href);
  await ev(() => { const a = $('#frank-go'); a.addEventListener('click', (e) => e.preventDefault(), { once: true }); a.click(); });
  await page.waitForTimeout(150);
  ok((await ev(() => navigator.clipboard.readText())) === 'Frank: Milbona Shake, 1 Flasche', 'Text für Claude kopiert');
  await page.screenshot({ path: `${OUT}/frank-1-fragen.png` });

  // Ungültiger Text
  await page.fill('#frank-code', 'Hallo Frank, das ist kein Code, nur ein langer Satz ohne JSON.');
  ok(await page.isVisible('#frank-err'), 'Fehlerhinweis bei Text ohne Code');

  // Ganze Antwort einfügen (über die Zwischenablage)
  await ev((t) => navigator.clipboard.writeText(t), message);
  await page.click('[data-a="frank-paste"]');
  await page.waitForTimeout(200);
  ok((await page.$$('.frank-card')).length === 1, 'Vorschau mit einem Lebensmittel');
  const prev = await page.$$eval('#frank-prev-0 .preview b', (els) => els.map((e) => e.textContent));
  ok(prev[0] === '217' && prev[1] === '35', 'Vorschau für 1 Flasche: ' + prev.join(' / '));
  ok((await page.inputValue('#frank-amt-0')) === '1' && (await page.textContent('[data-a="frank-unit"].is-on')) === 'Flasche (350 ml)', 'Menge 1 Flasche (350 ml)');
  const srcLinks = await page.$$eval('.frank-src a', (els) => els.map((e) => e.getAttribute('href')));
  ok(srcLinks.length === 1 && srcLinks[0].startsWith('https://world.openfoodfacts.org/'), 'Nur sichere Quellen-Links');
  ok((await page.textContent('.frank-card')).includes('„Etikett“'), 'Notiz mit deutschen Anführungszeichen');
  ok((await ev(() => ui.sheet.meal)) === 'snack', 'Mahlzeit aus dem Code: Snack');
  await page.click('[data-a="frank-unit"][data-v="ml"]');
  ok((await page.inputValue('#frank-amt-0')) === '350', 'Einheit ml → 350');
  await page.fill('#frank-amt-0', '700');
  ok((await page.$$eval('#frank-prev-0 .preview b', (els) => els[0].textContent)) === '434', 'Menge 700 ml → 434 kcal');
  await page.fill('#frank-amt-0', '350');
  await page.click('[data-a="frank-more"]');
  const rows = await page.$$('.frank-tr');
  ok(rows.length >= 20 && (await page.textContent('.frank-table')).includes('≈'), `Alle Nährwerte (${rows.length} Zeilen, geschätzte markiert)`);
  await page.screenshot({ path: `${OUT}/frank-2-vorschau.png`, fullPage: true });
  ok((await ev(() => getDay(todayKey()).entries.length)) === 0, 'Vor dem Tippen ist nichts eingetragen');
  await page.click('[data-a="frank-save"][data-mode="entry"]');
  await page.waitForTimeout(200);
  const st = await ev(() => {
    const f = S.foods.custom[0], e = getDay(todayKey()).entries[0];
    return { n: S.foods.custom.length, name: f.n, fl: f.fl, u: f.u, tags: f.tags, src: f.frank.src, est: f.est, entry: e && { food: e.food === f.id, g: e.g, meal: e.meal }, kcal: Math.round(computeTotals(todayKey()).tot ? computeTotals(todayKey()).tot.kcal : 0) };
  });
  console.log('     ' + JSON.stringify(st));
  ok(st.n === 1 && st.fl === 86 && st.u[0][0] === 'Flasche (350 ml)' && st.tags.includes('milbona') && st.src.length === 1 && !st.est, 'Lebensmittel mit Frank-Angaben gespeichert');
  ok(st.entry && st.entry.food && st.entry.g === 350 && st.entry.meal === 'snack', 'Eintrag: 350 ml als Snack');

  // Suche zeigt das neue Lebensmittel mit Etikett
  await page.fill('input[data-i="search"]', 'milbona high');
  ok((await page.textContent('#results')).includes('Frank'), 'Suche: Lebensmittel mit Etikett „Frank“');
  await page.click('#results [data-a="food-open"]');
  ok((await page.textContent('#sheet')).includes('Von Frank recherchiert'), 'Lebensmittel-Sheet zeigt Herkunft');
  await ev(() => closeSheet());

  // Gleicher Code nochmal → ersetzt, nur speichern
  await ev(() => sheetFrank('', todayKey()));
  await page.fill('#frank-code', code.replace('"kcal":62', '"kcal":64'));
  ok((await page.textContent('.frank-card')).includes('Ersetzt dein gespeichertes Lebensmittel'), 'Hinweis: ersetzt vorhandenes Lebensmittel');
  await page.click('[data-a="frank-save"][data-mode="food"]');
  const st2 = await ev(() => ({ n: S.foods.custom.length, kcal: S.foods.custom[0].v.kcal, entries: getDay(todayKey()).entries.length, id: FOOD[getDay(todayKey()).entries[0].food].v.kcal }));
  ok(st2.n === 1 && st2.kcal === 64 && st2.entries === 1 && st2.id === 64, 'Nur gespeichert: Werte aktualisiert, kein zweiter Eintrag');

  // Mehrere Lebensmittel, Aliasse, Salz, fehlende kcal, gestern
  const multi = { app: 'protokoll-frank', v: 1, date: 'gestern', items: [
    { name: 'Reiswaffeln Natur', cat: 'Getreide & Brot', portion: { name: 'Stück', size: 8 }, eaten: { amount: 3, unit: 'Stück' }, values: { protein: '7,5', fett: 2.8, kohlenhydrate: 80, ballaststoffe: 3.6, salz: 0.02 }, estimated: ['Kalium'], plants: ['Reis'], tags: ['UPF', 'quatsch'] },
    { name: 'Espresso doppio', liquid: true, eaten: { ml: 60 }, values: { caf: 212, kcal: 9 }, meal: 'Frühstück', time: '8:15' },
  ] };
  await ev(() => sheetFrank('', todayKey()));
  await page.fill('#frank-code', JSON.stringify(multi));
  ok((await page.$$('.frank-card')).length === 2, 'Zwei Lebensmittel in einem Code');
  const it = await ev(() => ui.sheet.items.map((x) => ({ kcal: x.values.kcal, na: x.values.na, p: x.values.p, unit: x.unit, amt: x.amt, plants: x.plants, tags: x.tags, est: x.est, time: x.time, meal: x.meal, base: x.base })));
  console.log('     ' + JSON.stringify(it));
  ok(it[0].p === 7.5 && it[0].kcal === Math.round(4 * 7.5 + 4 * 80 + 9 * 2.8 + 2 * 3.6) && it[0].na === 8 && it[0].unit === 'Stück (8 g)' && it[0].amt === 3, 'Aliasse, Komma, Salz → Natrium, kcal berechnet');
  ok(it[0].tags.join() === 'upf' && it[0].est.join() === 'k' && it[0].plants.join() === 'Reis', 'Nur bekannte Etiketten und Schlüssel');
  ok(it[1].base === 'ml' && it[1].amt === 60 && it[1].time === '08:15' && it[1].meal === 'fruehstueck', 'Getränk in ml, Uhrzeit, Mahlzeit');
  ok((await ev(() => ui.sheet.k)) === (await ev(() => addDays(todayKey(), -1))), 'Datum „gestern“ übernommen');
  await page.click('[data-a="frank-save"][data-mode="entry"]');
  const y = await ev(() => { const d = getDay(addDays(todayKey(), -1)); return { n: d.entries.length, meals: d.entries.map((e) => e.meal), caf: Math.round(cafInfo(addDays(todayKey(), -1)).total), foods: S.foods.custom.length }; });
  ok(y.n === 2 && y.foods === 3 && y.caf === 127, `Gestern 2 Einträge, Koffein ${y.caf} mg`);
  await ev(() => { ui.ernSub = 'detail'; ui.q = ''; go('ern', { date: addDays(todayKey(), -1) }); });
  await page.screenshot({ path: `${OUT}/frank-3-gestern.png`, fullPage: true });

  // Backup enthält die Frank-Lebensmittel
  const bk = await ev(() => exportData());
  ok(bk.foods.custom.length === 3 && bk.foods.custom.every((f) => f.frank), 'Backup enthält die Frank-Lebensmittel');
  console.log(errors.length ? 'KONSOLENFEHLER:\n' + errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
