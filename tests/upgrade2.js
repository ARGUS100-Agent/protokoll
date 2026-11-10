// Update-Test: Version 2.0.0 mit Daten → aktuelle Version (Schema 3) auf derselben Adresse
// Aufruf wie upgrade.js: alte docs/ (2.0.0) in <ordner>/old, Symlink <ordner>/cur darauf,
// Server auf Port 8769 mit --directory <ordner>/cur, dann: node tests/upgrade2.js <ordner>
const { chromium, devices } = require('playwright');
const fs = require('fs');
const T = process.argv[2];
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
const IDS = ['f_kiwi', 'n_schoko', 'v_rotebete'];
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, timezoneId: 'Europe/Berlin', locale: 'de-DE' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:8769/', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  ok((await page.evaluate(() => APP_VERSION)) === '2.0.0', 'Version 2.0.0 läuft');
  const lines = (ids) => {
    const y = addDays(todayKey(), -1), y2 = addDays(todayKey(), -2);
    const pick = (k) => dayLines(k).filter((l) => ids.includes(l.id)).map((l) => ({ id: l.id, food: l.food.id, g: Math.round(l.g), kcal: Math.round(l.food.v.kcal * l.g / (l.food.base || 100)) }));
    return { y: pick(y), y2: pick(y2) };
  };
  // Daten in 2.0.0 anlegen
  const before = await page.evaluate(async (ids) => {
    const k = todayKey(), y = addDays(k, -1), y2 = addDays(k, -2);
    mutDay(y, (d) => { d.checks.f_kiwi = 1; d.checks.n_schoko = 1; d.checks.v_rotebete = 1; d.checks.f_eier = 1; });
    mutDay(y2, (d) => { d.checks.f_kiwi = 1; d.amt.f_kiwi = 2; d.checks.v_rotebete = 1; d.amt.v_rotebete = 150; });
    const sp = S.shop.items.find((x) => x.sid === 'b:Spinat'); sp.list = 'home';
    S.shop.items = S.shop.items.filter((x) => x.sid !== 'b:Gurke');
    S.shop.items.push({ id: 'own1', n: 'Haferdrink', q: '', cat: 'Getränke', list: 'buy' });
    markDirty('shop');
    await flush();
    const pick = (kk) => dayLines(kk).filter((l) => ids.includes(l.id)).map((l) => ({ id: l.id, food: l.food.id, g: Math.round(l.g), kcal: Math.round(l.food.v.kcal * l.g / (l.food.base || 100)) }));
    return { y: pick(y), y2: pick(y2), schema: S.meta.schema, shop: S.shop.items.length };
  }, IDS);
  console.log('     vorher: ' + JSON.stringify(before));
  ok(before.schema === 2 && before.y.length === 3 && before.y2.length === 2, '2.0.0: Tage mit Kiwi, Schokolade, Rote Bete angelegt');
  // Server auf die aktuelle Version umstellen
  fs.unlinkSync(`${T}/cur`);
  fs.symlinkSync(require('path').resolve(__dirname, '../docs'), `${T}/cur`);
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  let ver = await page.evaluate(() => APP_VERSION);
  if (ver === '2.0.0') { await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500); ver = await page.evaluate(() => APP_VERSION); }
  ok(ver !== '2.0.0', 'Nach dem Update läuft Version ' + ver);
  const after = await page.evaluate(lines, IDS);
  console.log('     nachher: ' + JSON.stringify(after));
  ok(JSON.stringify(after.y) === JSON.stringify(before.y), 'Gestern: gleiche Lebensmittel, Mengen und kcal wie vorher');
  ok(JSON.stringify(after.y2) === JSON.stringify(before.y2), 'Vorgestern (geänderte Mengen): unverändert');
  const st = await page.evaluate(() => {
    const k = todayKey(), it = (id) => findItem(id).it;
    const items = S.shop.items;
    return {
      schema: S.meta.schema, toast: document.querySelector('#toast').textContent,
      kiwi: [it('f_kiwi').food, it('f_kiwi').choice.join('/'), itemFoodId(it('f_kiwi'), getDay(k))],
      schoko: [it('n_schoko').food, it('n_schoko').choice.join('/'), itemLabel(it('n_schoko'), getDay(k))],
      rb: [it('v_rotebete').food, it('v_rotebete').u, it('v_rotebete').a, itemUnit(it('v_rotebete'), FOOD.rotebete_saft)],
      todayChecks: Object.keys(getDay(k).checks || {}),
      allStore: items.every((x) => x.store && SHOP_STORES.some((s) => s.id === x.store)),
      buy: items.filter((x) => x.list === 'buy').map((x) => x.n),
      home: items.filter((x) => x.list === 'home').length,
      spinat: (items.find((x) => x.sid === 'b:Spinat') || {}).list,
      gurke: items.some((x) => x.sid === 'b:Gurke'),
      own: (items.find((x) => x.id === 'own1') || {}),
      rbName: (items.find((x) => x.sid === 'b:Rote Bete') || {}).n,
      schokoName: (items.find((x) => x.sid === 'b:Dunkle Schokolade 85 %') || {}).n,
      kombu: (items.find((x) => x.sid === 'b:Kombucha') || {}),
      mg: (items.find((x) => x.sid === 'h:Magnesium-Threonat') || {}).list,
      tile: areaStatus('einkauf', k),
      eier: (() => { const it = items.find((x) => x.sid === 'b:Eier'); const s = invState()[it.id]; return { since: it.inv && it.inv.since, stock: s && Math.round(s.stock) }; })(),
      tracked: items.filter((x) => SHOP_INV[x.sid]).every((x) => x.inv && x.inv.since),
    };
  });
  console.log('     ' + JSON.stringify(st));
  ok(st.schema === 5, 'Migration auf Schema 5');
  ok(/aktualisiert/.test(st.toast), 'Hinweis „aktualisiert“ erscheint');
  ok(st.kiwi.join('|') === 'kiwi_gold|kiwi_gold/kiwi|kiwi_gold', 'Kiwi: ab jetzt Gold-Kiwi, grüne Kiwi wählbar');
  ok(st.schoko[0] === 'schokolade90' && st.schoko[1] === 'schokolade90/schokolade85' && st.schoko[2] === 'Dunkle Schokolade 90 %', 'Schokolade: ab jetzt 90 %, 85 % wählbar');
  ok(st.rb.join('|') === 'rotebete_saft|ml|200|ml', 'Rote Bete: ab jetzt Saft (200 ml), Knolle wählbar');
  ok(st.todayChecks.length === 0, 'Heute ist nichts vorab abgehakt');
  ok(st.allStore, 'Alle Einkaufsartikel haben einen Laden');
  ok(st.buy.length === 4 && ['Vollkornbrot', 'Philips OneBlade Klingen', 'Zahnbürstenkopf', 'Haferdrink'].every((n) => st.buy.includes(n)), 'Einkaufen: nur Vollkornbrot, OneBlade-Klingen, Zahnbürstenkopf (+ eigener Artikel)');
  ok(st.spinat === 'home' && !st.gurke && st.mg === 'home', 'Gekauftes unter Zuhause, gelöschte Artikel bleiben weg, Magnesium-Threonat ergänzt');
  ok(st.own.store === 'dm' && st.own.list === 'buy', 'Eigener Artikel behält Liste, Laden nach Kategorie');
  ok(st.rbName === 'Rote Bete oder Rote-Bete-Saft' && st.schokoName === 'Dunkle Schokolade (85–90 %)' && st.kombu.q === '6 × 0,33 l' && st.kombu.store === 'rewe', 'Artikel umbenannt, Kombucha-Menge und Laden angepasst');
  ok(st.tile.v === '4 offen' && st.tile.s === 'dm 3 · Lidl 1', 'Kachel: ' + st.tile.v + ' – ' + st.tile.s);
  ok(st.tracked && st.eier.since === new Date('2026-11-07T18:00:00+01:00').getTime(), 'Vorrat ab dem Einkauf am 07.11. (18 Uhr) angelegt');
  ok(st.eier.stock === 21 * 55 - (new Date().toISOString().slice(0, 10) >= '2026-11-08' ? 165 : 0), 'Eier: 21 minus 3 abgehakte = ' + st.eier.stock / 55);
  // Bereiche rendern
  for (const a of ['heute', 'ern', 'einkauf', 'set']) { await page.evaluate((a) => go(a, { scrollTop: true }), a); await page.waitForTimeout(150); }
  await page.evaluate(() => go('einkauf'));
  await page.screenshot({ path: `${T}/upgrade2-einkauf.png`, fullPage: true });
  await page.evaluate(() => { ui.sub.einkauf = 'home'; render(); });
  await page.screenshot({ path: `${T}/upgrade2-zuhause.png`, fullPage: true });
  // erneutes Laden ändert nichts mehr
  await page.evaluate(() => { const it = S.shop.items.find((x) => x.sid === 'b:Spinat'); it.list = 'buy'; saveStore('shop'); return flush(); });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1200);
  ok((await page.evaluate(() => S.shop.items.find((x) => x.sid === 'b:Spinat').list)) === 'buy', 'Migration läuft nur einmal (eigene Änderungen bleiben)');
  console.log(errors.length ? 'KONSOLENFEHLER:\n' + errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
