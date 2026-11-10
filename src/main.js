/* ============================================================
   START
   ============================================================ */
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (location.protocol !== 'https:' && !local) return;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) { ui.updateReady = true; if (ui.tab === 'heute') render(); }
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) { ui.updateReady = true; if (ui.tab === 'heute' && !ui.sheet) render(); }
      });
    });
  }).catch(() => { /* offline oder file:// */ });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (ui.reloadRequested) location.reload(); });
}

(async function init() {
  try {
    await loadState();
  } catch (e) {
    S.settings = defaultSettings();
    S.meta = { schema: 1, createdAt: new Date().toISOString(), lastBackup: null, backupSnooze: null };
    S.foods = { custom: [], over: {} };
    S.days = {};
    Object.assign(S, defaultStores()); S.shop = shopDefault();
    buildFoodIndex();
  }
  try { migrate2(); } catch (e) { /* egal */ }
  try { migrate3(); } catch (e) { /* egal */ }
  try { migrate4(); } catch (e) { /* egal */ }
  try { migrate5(); } catch (e) { /* egal */ }
  try { energyApply(); } catch (e) { /* egal */ }
  setupEvents();
  render(false);
  if (S.meta.version !== APP_VERSION) {
    if (S.meta.version) setTimeout(() => toast(`Protokoll wurde auf Version ${APP_VERSION} aktualisiert`), 600);
    S.meta.version = APP_VERSION; markDirty('meta');
  }
  document.body.classList.add('ready');
  loadPhotoIndex().then(() => { if (!ui.sheet && (ui.tab === 'heute' || ui.tab === 'haut')) render(); });
  registerSW();
  try { pushInit(); } catch (e) { /* egal */ }
  setTimeout(() => { try { garAuto(); } catch (e) { /* egal */ } }, 1200);
  setInterval(() => {
    if (document.hidden) return;
    try { goalNudgeCheck(); } catch (e) { /* egal */ }
    try { garAuto(); } catch (e) { /* egal */ }
    try { pushTick(); } catch (e) { /* egal */ }
    const t = todayKey();
    if (t !== ui.lastToday) {
      if (ui.date === ui.lastToday) ui.date = t;
      try { energyApply(); } catch (e) { /* egal */ }
      ui.lastToday = t; ui.weekOf = weekStart(t); ui.heatMonth = t.slice(0, 7); ui.trainWeek = weekStart(t); ui.reviewWeek = weekStart(t); ui.photoWeek = weekStart(t);
      invalidate();
      if (!ui.sheet) render();
      return;
    }
    if (ui.tab === 'heute' && !ui.sheet) { const a = $('#arc'); if (a) a.innerHTML = arcInner(); }
    if (ui.tab === 'licht' && !ui.sheet && ui.date === todayKey() && !document.activeElement.matches('input, textarea, select')) render();
  }, 30000);
})();
