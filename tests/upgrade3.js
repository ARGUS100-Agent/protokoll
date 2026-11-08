// Update-Test: Version 2.2.0 (Schema 3, Einkaufsstand vom 07.11.) → aktuelle Version mit Vorrat (Schema 4)
// Aufruf wie upgrade2.js, Server auf Port 8770 mit --directory <ordner>/cur, dann: node tests/upgrade3.js <ordner>
// Gilt bis 21.11.2026 (danach legt das Update den Vorrat ab „jetzt“ an).
const { chromium, devices } = require('playwright');
const fs = require('fs');
const T = process.argv[2];
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, timezoneId: 'Europe/Berlin', locale: 'de-DE' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:8770/', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  ok((await page.evaluate(() => APP_VERSION)) === '2.2.0', 'Version 2.2.0 läuft');
  await page.evaluate(async () => {
    const today = todayKey();
    // Einkaufsstand wie nach dem Abgleich vom 07.11.: alles zuhause außer drei Artikeln
    for (const it of S.shop.items) if (it.sid) it.list = SHOP_SYNC_BUY.includes(it.sid) ? 'buy' : 'home';
    markDirty('shop');
    mutDay('2026-11-07', (d) => { d.checks.f_eier = 1; d.ct = { f_eier: '08:00', a_skyr: '20:00' }; d.checks.a_skyr = 1; });
    if (today >= '2026-11-08') mutDay(today, (d) => { d.checks.f_eier = 1; d.ct = { f_eier: '09:30' }; });
    await flush();
  });
  fs.unlinkSync(`${T}/cur`);
  fs.symlinkSync(require('path').resolve(__dirname, '../docs'), `${T}/cur`);
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  let ver = await page.evaluate(() => APP_VERSION);
  if (ver === '2.2.0') { await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500); ver = await page.evaluate(() => APP_VERSION); }
  ok(ver !== '2.2.0', 'Nach dem Update läuft Version ' + ver);
  const st = await page.evaluate(() => {
    const inv = invState(), get = (sid) => { const it = S.shop.items.find((x) => x.sid === sid); const s = inv[it.id]; return { list: it.list, stock: s ? Math.round(s.stock) : null, txt: s ? invAmt(s.m, s.stock, false) : '', days: s && s.days != null ? Math.floor(s.days) : null }; };
    return { schema: S.meta.schema, eier: get('b:Eier'), skyr: get('b:Skyr'), brot: get('b:Vollkornbrot'), hafer: get('h:Haferflocken'), kreatin: get('h:Kreatin'), buy: S.shop.items.filter((x) => x.list === 'buy').map((x) => x.n), toast: document.querySelector('#toast').textContent };
  });
  console.log('     ' + JSON.stringify(st));
  ok(st.schema === 4, 'Migration auf Schema 4');
  ok(st.eier.list === 'home' && st.eier.txt === (new Date() >= new Date('2026-11-08T00:00:00+01:00') ? '18 Stück' : '21 Stück'), 'Eier: 21 vom Einkauf, Frühstück vor dem Einkauf zählt nicht, heute 3 abgezogen → ' + st.eier.txt);
  ok(st.skyr.txt === '6 Becher', 'Skyr am Abend nach dem Einkauf gegessen → 6 Becher');
  ok(st.brot.list === 'buy' && st.brot.stock === 0, 'Vollkornbrot steht noch auf der Liste (Vorrat 0)');
  ok(st.hafer.stock > 0 && st.kreatin.stock === null, 'Haferflocken zählen, Kreatin nicht');
  ok(st.buy.length === 3, 'Keine Lebensmittel fälschlich auf der Einkaufsliste: ' + st.buy.join(', '));
  ok(/2\.3\.0|aktualisiert/.test(st.toast), 'Hinweis auf das Update');
  await page.evaluate(() => { ui.sub.einkauf = 'home'; go('einkauf'); });
  await page.screenshot({ path: `${T}/upgrade3-zuhause.png`, fullPage: true });
  console.log(errors.length ? 'KONSOLENFEHLER:\n' + errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
