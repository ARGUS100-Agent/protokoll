// Vorrat, der mitzählt: Einkauf, Abzug über Haken und Einträge, automatisch auf die Einkaufsliste
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
  // Sonntag, 8. Nov. 2026, 10:00
  await page.clock.install({ time: new Date('2026-11-08T10:00:00+01:00') });
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  for (let i = 0; i < 20; i++) { await page.clock.runFor(500); if (await ev(() => !!(S.meta && document.body.classList.contains('ready')))) break; }
  const item = (sid) => ev((s) => { const it = S.shop.items.find((x) => x.sid === s); const st = invState()[it.id]; return { id: it.id, list: it.list, auto: !!it.auto, inv: it.inv, stock: st ? Math.round(st.stock * 10) / 10 : null, days: st && st.days != null ? Math.round(st.days * 10) / 10 : null, rate: st ? Math.round(st.rate) : null }; }, sid);

  ok((await ev(() => S.meta.schema)) === 4, 'Neue Installation: Schema 4');
  // Zuhause: Vorrat sichtbar
  await ev(() => { ui.sub.einkauf = 'home'; go('einkauf'); });
  const hafer = await item('h:Haferflocken');
  ok(hafer.stock === 1000 && hafer.rate === 80 && hafer.days === 12.5, `Haferflocken: 1 kg, 80 g pro Tag laut Plan, reicht ${hafer.days} Tage`);
  ok((await page.textContent('#main')).includes('noch 1 kg · reicht noch 12 Tage'), 'Zuhause zeigt Bestand und Reichweite');
  ok((await item('h:Kreatin')).stock === null && (await item('h:Prepmymeal')).stock === 7000, 'Supplements zählen nicht, Prepmymeal schon');
  await page.screenshot({ path: `${OUT}/v1-zuhause.png`, fullPage: true });

  // Einkaufen: Standardmenge als Einkaufsmenge
  await ev(() => { ui.sub.einkauf = 'buy'; render(); });
  ok((await page.textContent('#main')).includes('21 Stück'), 'Eier mit Einkaufsmenge 21 Stück');
  const eier = await item('b:Eier');
  ok(eier.list === 'buy' && eier.stock === 0, 'Eier noch nicht gekauft: Vorrat 0');
  await page.click(`[data-a="shop-check"][data-id="${eier.id}"]`);
  let e = await item('b:Eier');
  ok(e.list === 'home' && e.stock === 1155, 'Eingekauft: 21 Eier im Vorrat');
  ok((await page.textContent('#toast')).includes('Vorrat 21 Stück'), 'Hinweis: Vorrat 21 Stück');

  // Abzug über den Standardtag
  await ev(() => toggleItem('f_eier', todayKey()));
  e = await item('b:Eier');
  ok(e.stock === 990 && e.rate === 165, 'Drei Eier abgehakt → 18 Stück übrig');
  await ev(() => toggleItem('f_eier', todayKey()));
  ok((await item('b:Eier')).stock === 1155, 'Haken entfernt → wieder 21');
  // Abzug über einen Eintrag
  const entryId = await ev(() => addEntry(todayKey(), 'ei', 110, 'snack'));
  ok((await item('b:Eier')).stock === 1045, 'Eintrag mit 2 Eiern → 19 übrig');
  await ev((id) => { mutDay(todayKey(), (d) => { d.entries = d.entries.filter((x) => x.id !== id); }); render(); }, entryId);
  ok((await item('b:Eier')).stock === 1155, 'Eintrag gelöscht → wieder 21');
  // Was vor dem Einkauf abgehakt war, zählt nicht
  await ev(() => { const it = S.shop.items.find((x) => x.sid === 'b:Skyr'); it.list = 'buy'; it.inv = { base: 0, since: Date.now() }; mutDay(todayKey(), (d) => { d.checks.a_skyr = 1; d.ct = { ...(d.ct || {}), a_skyr: '09:00' }; }); saveStore('shop'); });
  await page.click(`[data-a="shop-check"][data-id="${(await item('b:Skyr')).id}"]`);
  ok((await item('b:Skyr')).stock === 3500, 'Skyr vor dem Einkauf (9 Uhr) gegessen → zählt nicht');
  await page.clock.runFor(60000);
  await ev(() => { mutDay(todayKey(), (d) => { delete d.checks.a_skyr; }); render(); });
  await ev(() => toggleItem('a_skyr', todayKey()));
  ok((await item('b:Skyr')).stock === 3000, 'Skyr nach dem Einkauf abgehakt → 6 Becher');

  // Bestand ändern → reicht nur noch 2 Tage → automatisch auf die Liste
  await ev(() => { ui.sub.einkauf = 'home'; render(); });
  await page.click(`[data-a="shop-edit"][data-id="${e.id}"]`);
  ok((await page.inputValue('#si-stock')) === '21' && (await page.inputValue('#si-buy')) === '21', 'Sheet: 21 zuhause, 21 pro Einkauf');
  ok((await page.textContent('#sheet')).includes('Verbrauch ca. 3 Stück pro Tag'), 'Sheet zeigt Tagesverbrauch');
  await page.screenshot({ path: `${OUT}/v2-sheet.png` });
  await page.fill('#si-stock', '6');
  await page.click('[data-a="shop-save"]');
  await page.clock.runFor(200);
  e = await item('b:Eier');
  ok(e.stock === 330 && e.days === 2 && e.list === 'buy' && e.auto, 'Nur noch 6 Eier (2 Tage) → auf der Einkaufsliste');
  await page.clock.runFor(3500);
  ok((await page.textContent('#toast')).includes('Auf die Einkaufsliste: Eier'), 'Hinweis: Eier auf die Einkaufsliste');
  await ev(() => { ui.sub.einkauf = 'buy'; render(); });
  ok((await page.textContent('#main')).includes('Fast leer: noch 6 Stück, reicht noch 2 Tage'), 'Einkaufsliste: „Fast leer“ mit Bestand');
  const tile = await ev(() => areaStatus('einkauf', todayKey()));
  ok(tile.s === 'Fast leer: Eier' && tile.st === 'under', 'Kachel auf Heute: Fast leer: Eier');
  await page.screenshot({ path: `${OUT}/v3-einkaufen.png`, fullPage: true });
  // Korrektur nach oben → wieder Zuhause
  await page.click(`[data-a="shop-edit"][data-id="${e.id}"]`);
  await page.fill('#si-stock', '12');
  await page.click('[data-a="shop-save"]');
  e = await item('b:Eier');
  ok(e.list === 'home' && !e.auto && e.stock === 660, 'Bestand korrigiert (12) → zurück nach Zuhause');
  // Andere Einkaufsmenge
  await ev(() => { ui.sub.einkauf = 'home'; render(); });
  await page.click(`[data-a="shop-edit"][data-id="${e.id}"]`);
  await page.fill('#si-buy', '30');
  await page.click('[data-a="shop-save"]');
  ok((await item('b:Eier')).inv.buy === 30, 'Einkaufsmenge 30 gespeichert');
  await ev((id) => { const it = S.shop.items.find((x) => x.id === id); it.list = 'buy'; saveStore('shop'); }, e.id);
  await ev(() => { ui.sub.einkauf = 'buy'; render(); });
  ok((await page.textContent('#main')).includes('30 Stück'), 'Liste zeigt 30 Stück');
  await page.click(`[data-a="shop-check"][data-id="${e.id}"]`);
  ok((await item('b:Eier')).stock === 660 + 30 * 55, 'Eingekauft: 12 + 30 = 42 Eier');
  // Rückgängig
  await page.click('#toast [data-a="undo"]');
  e = await item('b:Eier');
  ok(e.list === 'buy' && e.stock === 660, 'Rückgängig stellt Liste und Vorrat wieder her');

  // Eigenen Artikel mit Lebensmittel verknüpfen
  await ev(() => { ui.sub.einkauf = 'home'; render(); });
  await page.fill('#shop-new', 'Proteinshake');
  await page.press('#shop-new', 'Enter');
  const own = await ev(() => S.shop.items.find((x) => x.n === 'Proteinshake').id);
  await page.click(`[data-a="shop-edit"][data-id="${own}"]`);
  await page.selectOption('#si-food', 'milbona_shake');
  await page.click('[data-a="shop-save"]');
  const o = await ev((id) => { const it = S.shop.items.find((x) => x.id === id); const st = invState()[id]; return { inv: it.inv, stock: st && st.stock, txt: document.querySelector('#main').textContent.includes('noch 1 Flasche (500 ml)') || document.querySelector('#main').textContent.includes('noch 1 Flasche') }; }, own);
  ok(o.inv && o.inv.f[0] === 'milbona_shake' && o.inv.u === 'Flasche (500 ml)' && o.stock === 500 && o.txt, 'Eigener Artikel zählt mit (1 Flasche)');
  await ev(() => addEntry(todayKey(), 'milbona_shake', 500, 'snack'));
  await ev(() => render());
  const o2 = await ev((id) => S.shop.items.find((x) => x.id === id).list, own);
  ok(o2 === 'buy', 'Flasche getrunken → aufgebraucht → auf die Einkaufsliste');

  // Zählen abschalten
  const salz = await item('b:Jodsalz');
  await ev(() => { ui.sub.einkauf = 'buy'; render(); });
  await page.click(`[data-a="shop-check"][data-id="${salz.id}"]`);
  ok((await item('b:Jodsalz')).stock === 500, 'Jodsalz eingekauft: 500 g');
  await ev((id) => sheetShopItem(id), salz.id);
  await page.click('[data-a="shop-inv"][data-v="off"]');
  ok((await item('b:Jodsalz')).stock === null, 'Jodsalz: Vorrat nicht zählen');
  await page.click('[data-a="shop-inv"][data-v="on"]');
  const js = await item('b:Jodsalz');
  ok(js.stock === 500, 'Wieder zählen: 500 g ' + JSON.stringify(js));
  await ev(() => closeSheet());

  // Backup enthält den Vorrat
  const bk = await ev(() => exportData());
  ok(bk.schema === 4 && bk.shop.items.find((x) => x.sid === 'b:Eier').inv.buy === 30, 'Backup enthält Vorrat und Einkaufsmengen');
  console.log(errors.length ? 'KONSOLENFEHLER:\n' + errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
