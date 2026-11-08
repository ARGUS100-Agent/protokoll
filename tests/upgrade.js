// Update-Test: Version 1.1.0 mit Daten → aktuelle Version auf derselben Adresse
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
  await page.goto('http://localhost:8768/', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  ok((await page.evaluate(() => APP_VERSION)) === '1.1.0', 'Version 1.1.0 läuft');
  // Daten in v1 anlegen
  await page.evaluate(async () => {
    const k = todayKey(), y = addDays(k, -1), y2 = addDays(k, -2);
    S.settings.profile.name = 'Test'; markDirty('settings');
    toggleItem('m_wasser', y); toggleItem('f_eier', y); toggleItem('l_tee', y); toggleItem('m_ag1', y);
    addEntry(y, 'kaffee', 200, 'fruehstueck');
    mutDay(y, (d) => { d.habits.licht_morgen = true; d.habits.sauna = true; d.hd.caffeineEnd = '13:00'; d.health.sleepScore = 78; d.health.hrv = 52; d.health.weight = 82.4; d.trainings.push({ id: 'tOld', type: 'Kraft / Gym', time: '18:30', dur: 70, load: 120 }); d.skin.score = 6; d.skin.spots = 1; d.training = 'abends'; });
    mutDay(y2, (d) => { d.health.sleepScore = 81; d.health.hrv = 55; d.health.weight = 82.9; d.checks.f_d3k2 = 1; });
    mutDay(k, (d) => { d.checks.m_kreatin = 1; });
    S.settings.todos.push({ id: 'x1', t: 'Altes To-do', done: false });
    markDirty('settings');
    await flush();
  });
  await page.waitForTimeout(300);
  const v1days = await page.evaluate(() => Object.keys(S.days).length);
  ok(v1days === 3, 'v1: 3 Tage angelegt');
  // Service Worker registriert?
  const swV1 = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && (r.active || r.installing || r.waiting)); });
  console.log('     Service Worker aktiv (v1): ' + swV1);
  // Server auf v2 umstellen
  fs.unlinkSync(`${T}/cur`);
  fs.symlinkSync(require('path').resolve(__dirname, '../docs'), `${T}/cur`);
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  let ver = await page.evaluate(() => APP_VERSION);
  if (ver === '1.1.0') { await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500); ver = await page.evaluate(() => APP_VERSION); }
  ok(ver !== '1.1.0', 'Nach dem Update läuft Version ' + ver);
  const st = await page.evaluate(() => {
    const y = addDays(todayKey(), -1);
    return {
      days: Object.keys(S.days).length, schema: S.meta.schema, name: S.settings.profile.name,
      tabs: navTabs(), knee: !!S.settings.knee, caf: S.settings.caf.presets.length, shop: S.shop && S.shop.items.length,
      rules: S.settings.skin.phases[0].rules, routine: S.settings.skin.routine.map((r) => r.n),
      todos: S.settings.todos.map((t) => t.t + '|' + ('date' in t)),
      oldTr: trainType(getDay(y).trainings[0]).id, sport: isSportDay(y), weight: weightSeries().map((x) => x.v),
      gymAnchor: S.settings.gym.anchor, cafY: cafInfo(y).total, toast: document.querySelector('#toast').textContent,
    };
  });
  console.log('     ' + JSON.stringify(st));
  ok(st.days === 3 && st.name === 'Test', 'Alle Tage und Profil erhalten');
  ok(st.schema === 4, 'Migration auf Schema 4');
  ok(st.tabs.join(',') === 'heute,ern,train,knie', 'Tab-Leiste: Heute · Ernährung · Training · Knie');
  ok(st.knee && st.caf === 6 && st.shop > 40, 'Neue Einstellungen und Einkaufsliste angelegt');
  ok(st.rules[0].includes('OneBlade') && st.rules.includes('Kein Clienzo'), 'Haut-Phase 1 auf neue Regeln aktualisiert');
  ok(st.routine.some((n) => n.includes('OneBlade')), 'Haut-Routine aktualisiert');
  ok(st.todos.length === 2 && st.todos.every((t) => t.endsWith('|true')), 'To-dos übernommen (mit Datumsfeld)');
  ok(st.oldTr === 'Gym (frei)' && st.sport, 'Altes Training „Kraft / Gym“ wird erkannt');
  ok(st.weight.length === 2, 'Gewichte im Bereich Körper sichtbar');
  ok(Math.round(st.cafY) === 140, 'Koffein von gestern (Kaffee + grüner Tee) erkannt: ' + Math.round(st.cafY) + ' mg');
  // Bereiche rendern
  for (const a of ['heute', 'ern', 'supp', 'train', 'knie', 'licht', 'haut', 'koerper', 'blut', 'garmin', 'einkauf', 'woche', 'set', 'mehr']) {
    await page.evaluate((a) => go(a, { scrollTop: true }), a);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => go('heute'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${T}/upgrade-heute.png`, fullPage: true });
  await page.evaluate(() => { ui.date = addDays(todayKey(), -1); go('train'); });
  await page.screenshot({ path: `${T}/upgrade-train.png`, fullPage: true });
  console.log(errors.length ? 'KONSOLENFEHLER:\n' + errors.join('\n') : 'Keine Konsolenfehler');
  await browser.close();
})().catch((e) => { console.error('ABBRUCH', e); process.exit(1); });
