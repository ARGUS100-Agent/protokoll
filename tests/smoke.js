// Rauchtest: alle Bereiche öffnen, Konsolenfehler sammeln, Screenshots
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, timezoneId: 'Europe/Berlin', locale: 'de-DE' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:8766/', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); };
  await shot('01-heute');
  const areas = ['ern', 'supp', 'train', 'knie', 'licht', 'haut', 'koerper', 'blut', 'garmin', 'einkauf', 'woche', 'set', 'mehr'];
  for (const a of areas) {
    await page.evaluate((a) => { go(a, { scrollTop: true }); }, a);
    await page.waitForTimeout(250);
    await shot('area-' + a);
    // Unterbereiche durchklicken
    const subs = await page.$$eval('.subnav button', (bs) => bs.map((b) => b.dataset.v));
    for (const s of subs.slice(1)) {
      await page.click(`.subnav button[data-v="${s}"]`);
      await page.waitForTimeout(200);
      await shot(`area-${a}-${s}`);
    }
    if (subs.length) await page.click(`.subnav button[data-v="${subs[0]}"]`);
  }
  // Einstellungen: alle Abschnitte öffnen
  await page.evaluate(() => go('set', { scrollTop: true }));
  const secs = await page.$$eval('[data-a="set-open"]', (bs) => bs.map((b) => b.dataset.id));
  for (const s of secs) { await page.click(`[data-a="set-open"][data-id="${s}"]`); await page.waitForTimeout(150); if (['nav', 'training', 'knie', 'koffein', 'backup', 'todos'].includes(s)) await shot('set-' + s); }
  console.log('Sections:', secs.join(','));
  console.log(errors.length ? 'FEHLER:\n' + errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})();
