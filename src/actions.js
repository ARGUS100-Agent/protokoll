/* ============================================================
   AKTIONEN & EREIGNISSE
   ============================================================ */
function curDate(el) { return (el && el.dataset.date) || (ui.tab === 'heute' ? todayKey() : ui.date); }
function toast(msg, undo) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button data-a="undo">Rückgängig</button>' : ''}`;
  toast.undo = undo || null;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), undo ? 4500 : 2600);
}
function flashSaved(el) { if (!el) return; el.classList.remove('saved'); void el.offsetWidth; el.classList.add('saved'); }
function persistRotation(d, it) {
  if (it.choice && it.rotate) { const key = it.cg || it.id; if (!d.choice[key]) d.choice[key] = itemFoodId(it, d); }
}
function toggleItem(id, k) {
  const found = findItem(id);
  if (!found) return;
  const before = getDay(k);
  const on = !before.checks[id];
  const food = FOOD[itemFoodId(found.it, before)];
  mutDay(k, (d) => { if (on) { d.checks[id] = 1; persistRotation(d, found.it); if (k === todayKey()) { d.ct = d.ct || {}; d.ct[id] = minToTime(nowMin()); } } else { delete d.checks[id]; if (d.ct) delete d.ct[id]; } });
  if (food && food.v && food.v.caf) mutDay(k, () => syncCafHabit(k));
  if (on) { const ph = phaseBlocks(k, food); if (ph) toast(`${ph.n} im Haut-Protokoll: ${ph.rules.join(', ')}`); }
  render();
  if (on) { const btn = $(`[data-a="toggle-item"][data-id="${id}"]`); if (btn) { const row = btn.closest('.item, .tgl'); if (row) row.classList.add('just'); } }
}
/* Eintrag löschen, mit Rückgängig (stellt ihn an derselben Stelle wieder her) */
function delEntry(k, id) {
  const list = getDay(k).entries || [];
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return;
  const e = clone(list[i]), f = FOOD[e.food], caf = !!(f && f.v && f.v.caf);
  mutDay(k, (d) => { d.entries = d.entries.filter((x) => x.id !== id); if (caf) syncCafHabit(k); });
  render();
  toast(`${f ? f.n : 'Eintrag'} gelöscht`, () => {
    mutDay(k, (d) => { d.entries = d.entries || []; if (!d.entries.some((x) => x.id === id)) d.entries.splice(Math.min(i, d.entries.length), 0, e); if (caf) syncCafHabit(k); });
    render();
  });
}
function addEntry(k, food, g, meal) {
  const id = uid();
  mutDay(k, (d) => { d.entries.push({ id, food, g, meal, t: Date.now() }); });
  return id;
}
async function shareBackup() {
  await flush();
  const json = JSON.stringify(exportData());
  const name = `protokoll-backup-${todayKey()}.json`;
  let file = null;
  try { file = new File([json], name, { type: 'application/json' }); } catch (e) { file = null; }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Protokoll-Backup' }); markBackup(); toast('Backup erstellt'); render(); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  markBackup(); toast('Backup gespeichert'); render();
}
function planItem(bid, i) { const b = S.settings.plan.find((x) => x.id === bid); return b ? b.items[i] : null; }
function saveSettings(rerender = true) { markDirty('settings'); invalidate(); if (rerender) render(); }

const A = {
  'goto-eval': (el) => {
    const key = el.dataset.key;
    ui.exp.add('m:' + key);
    go('ern', { ernSub: 'eval', date: ui.tab === 'heute' ? todayKey() : ui.date, scrollTop: true });
    requestAnimationFrame(() => { const t = document.getElementById('m-' + key); if (t) t.scrollIntoView({ block: 'center' }); });
  },
  seg: (el) => {
    const s = el.dataset.seg, v = el.dataset.v;
    if (s === 'ern') ui.ernSub = v; else if (s === 'micro') ui.microMode = v; else if (s === 'range') ui.range = Number(v);
    render();
  },
  'date-prev': () => { ui.date = addDays(ui.date, -1); render(); },
  'date-next': () => { if (ui.date < todayKey()) { ui.date = addDays(ui.date, 1); render(); } },
  'date-today': () => { ui.date = todayKey(); render(); },
  'toggle-item': (el) => toggleItem(el.dataset.id, curDate(el)),
  'check-block': (el) => {
    const k = curDate(el), variant = dayVariant(k);
    const b = S.settings.plan.find((x) => x.id === el.dataset.id);
    if (!b) return;
    let blocked = null;
    mutDay(k, (d) => { for (const it of b.items) if (!it.opt && itemInVariant(it, variant)) { d.checks[it.id] = 1; persistRotation(d, it); blocked = blocked || phaseBlocks(k, FOOD[itemFoodId(it, d)]); } });
    if (blocked) toast(`${blocked.n} im Haut-Protokoll: ${blocked.rules.join(', ')}`);
    render();
  },
  'uncheck-block': (el) => {
    const k = curDate(el);
    const b = S.settings.plan.find((x) => x.id === el.dataset.id);
    if (!b) return;
    mutDay(k, (d) => { for (const it of b.items) delete d.checks[it.id]; });
    render();
  },
  'set-variant': (el) => { const k = curDate(el); mutDay(k, (d) => { d.variant = el.dataset.v; }); render(); },
  'set-training': (el) => { const k = curDate(el); mutDay(k, (d) => { d.training = d.training === el.dataset.v ? null : el.dataset.v; }); render(); },
  choice: (el) => { mutDay(el.dataset.date, (d) => { d.choice[el.dataset.key] = el.dataset.v; }); render(); },
  'open-item': (el) => sheetItem(el.dataset.id, curDate(el)),
  'add-water': (el) => {
    const k = curDate(el), ml = Number(el.dataset.ml);
    const id = addEntry(k, el.dataset.food, ml, 'getraenke');
    render();
    toast(`+ ${ml >= 1000 ? fmt(ml / 1000, 1) + ' l' : ml + ' ml'} eingetragen`, () => { mutDay(k, (d) => { d.entries = d.entries.filter((e) => e.id !== id); }); render(); });
  },
  undo: () => { if (toast.undo) { toast.undo(); toast.undo = null; $('#toast').classList.remove('show'); } },
  expand: (el) => { const key = el.dataset.key; if (ui.exp.has(key)) ui.exp.delete(key); else ui.exp.add(key); render(); },

  /* Sheets */
  'sheet-close': () => { const t = ui.sheet && ui.sheet.type; closeSheet(); if (t === 'plants') render(); },
  'sheet-step': (el) => {
    const s = ui.sheet; if (!s) return;
    const unit = s.type === 'item' ? findItem(s.id).it.u : s.unit;
    const dir = Number(el.dataset.d);
    const step = stepFor(unit, s.amt + (dir < 0 ? -0.0001 : 0));
    s.amt = Math.max(0, Math.round((s.amt + dir * step) / step) * step);
    const inp = $('#sh-amt'); if (inp) inp.value = numIn(s.amt, 2);
    updateSheetPreview();
  },
  'sheet-unit': (el) => {
    const s = ui.sheet, food = FOOD[s.fid];
    const g = s.amt * unitG(food, s.unit);
    s.unit = el.dataset.v;
    const ug = unitG(food, s.unit);
    s.amt = ug > 1 ? Math.max(1, Math.round((g / ug) * 4) / 4) : Math.round(g);
    renderFoodSheet();
  },
  'sheet-meal': (el) => { ui.sheet.meal = el.dataset.v; $$('[data-a="sheet-meal"]').forEach((b) => b.classList.toggle('is-on', b === el)); },
  'item-save': (el) => {
    const s = ui.sheet; if (!s) return;
    const found = findItem(s.id); if (!found) return;
    const { it } = found;
    const k = s.k, variant = dayVariant(k);
    const def = it.av && it.av[variant] != null ? it.av[variant] : it.a;
    const mode = el.dataset.mode;
    if (mode === 'default') {
      if (it.av && it.av[variant] != null) it.av[variant] = s.amt; else it.a = s.amt;
      mutDay(k, (d) => { delete d.amt[s.id]; });
      markDirty('settings');
      toast('Neue Standardmenge gespeichert');
    } else if (mode === 'reset') {
      mutDay(k, (d) => { delete d.amt[s.id]; });
    } else {
      mutDay(k, (d) => {
        if (Math.abs(s.amt - def) < 1e-9) delete d.amt[s.id]; else d.amt[s.id] = s.amt;
        if (mode === 'check') { d.checks[s.id] = 1; persistRotation(d, it); }
      });
    }
    closeSheet(); render();
  },
  'food-open': (el) => sheetFood(el.dataset.id, ui.date),
  'entry-edit': (el) => { const k = curDate(el); const e = getDay(k).entries.find((x) => x.id === el.dataset.id); if (e) sheetFood(e.food, k, e); },
  'entry-save': () => {
    const s = ui.sheet, food = FOOD[s.fid];
    const g = Math.round(s.amt * unitG(food, s.unit) * 100) / 100;
    if (!(g > 0)) { toast('Bitte eine Menge eingeben'); return; }
    let newId = null;
    const dup = s.entryId ? null : dupEntry(s.k, s.fid);
    const overBefore = overKeys(s.k);
    if (s.entryId) mutDay(s.k, (d) => { const e = d.entries.find((x) => x.id === s.entryId); if (e) { e.g = g; e.meal = s.meal; } });
    else newId = addEntry(s.k, s.fid, g, s.meal);
    const ph = phaseBlocks(s.k, food);
    const k = s.k;
    closeSheet(); render();
    const undoNew = () => { mutDay(k, (d) => { d.entries = d.entries.filter((e) => e.id !== newId); }); render(); };
    const overNew = overKeys(k).filter((x) => !overBefore.includes(x));
    if (dup && newId) toast(`${food.n} hattest du vor ${Math.max(1, Math.round((Date.now() - dup.t) / 60000))} Min. schon eingetragen – doppelt?`, undoNew);
    else if (ph) toast(`${ph.n} im Haut-Protokoll: ${ph.rules.join(', ')}`);
    else if (newId && overNew.length) toast(`${food.n} eingetragen · ${overText(k, overNew[0])}`, undoNew);
    else if (newId) toast(`${food.n} eingetragen`, undoNew);
  },
  'entry-del': () => { const s = ui.sheet; delEntry(s.k, s.entryId); closeSheet(); },
  'entry-del-now': (el) => delEntry(curDate(el), el.dataset.id),
  'water-type': () => { const ids = WATER_TYPES.map(([id]) => id); const i = ids.indexOf(S.settings.waterFood); S.settings.waterFood = ids[(i + 1) % ids.length]; saveSettings(); toast('Wasser-Knöpfe: ' + WATER_TYPES.find(([id]) => id === S.settings.waterFood)[1]); },
  'plant-pick': (el) => sheetPlants(curDate(el)),
  'plant-toggle': (el) => {
    const k = el.dataset.date, p = el.dataset.v;
    mutDay(k, (d) => { const i = d.plants.indexOf(p); if (i >= 0) d.plants.splice(i, 1); else d.plants.push(p); });
    el.classList.toggle('is-on');
  },
  'plant-add-custom': (el) => {
    const inp = $('#plant-new'); const p = inp ? inp.value.trim() : '';
    if (!p) return;
    mutDay(el.dataset.date, (d) => { if (!d.plants.includes(p)) d.plants.push(p); });
    toast(`${p} hinzugefügt`); inp.value = '';
  },
  'plant-del': (el) => { mutDay(el.dataset.date, (d) => { d.plants = d.plants.filter((x) => x !== el.dataset.v); }); render(); },

  /* Gewohnheiten */
  habit: (el) => {
    const k = curDate(el), id = el.dataset.id;
    mutDay(k, (d) => {
      d.habits[id] = !d.habits[id];
      if (d.habits[id]) return;
      delete d.habits[id];
      if (d.gh && d.gh[id]) { delete d.gh[id]; d.ghOff = [...new Set([...(d.ghOff || []), id])]; } // Garmin hakt es nicht wieder ab
    });
    render();
  },
  'habit-chip': (el) => {
    const k = curDate(el), v = Number(el.dataset.v), key = el.dataset.k;
    mutDay(k, (d) => {
      d.hd = d.hd || {};
      if (d.hd[key] === v) { delete d.hd[key]; return; }
      d.hd[key] = v;
      if (key === 'screenFree') { if (v >= 30) d.habits.bildschirm = true; else delete d.habits.bildschirm; }
    });
    render();
  },

  /* Garmin */
  'h-prev': (el) => { const k = el.dataset.date, y = peekDay(addDays(k, -1)); if (!y) return; mutDay(k, (d) => { d.health[el.dataset.k] = y.health[el.dataset.k]; }); render(); },
  'h-choice': (el) => { mutDay(el.dataset.date, (d) => { d.health[el.dataset.k] = d.health[el.dataset.k] === el.dataset.v ? undefined : el.dataset.v; if (d.health[el.dataset.k] === undefined) delete d.health[el.dataset.k]; }); render(); },
  'h-sign': (el) => { const k = el.dataset.date; const v = getDay(k).health[el.dataset.k]; if (v == null) return; mutDay(k, (d) => { d.health[el.dataset.k] = -v; }); render(); },
  mood: (el) => { const k = curDate(el), f = el.dataset.f, v = Number(el.dataset.v); mutDay(k, (d) => { d.mood = d.mood || {}; if (d.mood[f] === v) delete d.mood[f]; else d.mood[f] = v; }); render(); },

  /* Haut */
  'skin-score': (el) => { const k = curDate(el), v = Number(el.dataset.v); mutDay(k, (d) => { d.skin = d.skin || {}; if (d.skin.score === v) delete d.skin.score; else d.skin.score = v; }); render(); },
  'skin-spots': (el) => { const k = curDate(el), v = Number(el.dataset.v); mutDay(k, (d) => { d.skin = d.skin || {}; if (d.skin.spots === v) delete d.skin.spots; else d.skin.spots = v; }); render(); },
  'skin-check': (el) => { const k = curDate(el); mutDay(k, (d) => { d.skin = d.skin || {}; d.skin[el.dataset.id] = !d.skin[el.dataset.id]; if (!d.skin[el.dataset.id]) delete d.skin[el.dataset.id]; }); render(); },

  /* To-dos */
  todo: (el) => { const t = S.settings.todos.find((x) => x.id === el.dataset.id); if (!t) return; t.done = !t.done; saveSettings(); if (t.done) toast('Erledigt'); },
  'todo-add': () => { const inp = $('#todo-new'); const v = inp ? inp.value.trim() : ''; if (!v) return; S.settings.todos.push({ id: uid(), t: v, done: false }); saveSettings(); },
  'todo-del': (el) => { S.settings.todos = S.settings.todos.filter((x) => x.id !== el.dataset.id); saveSettings(); },

  /* Backup */
  'backup-export': () => shareBackup(),
  'backup-snooze': () => { S.meta.backupSnooze = todayKey(); markDirty('meta'); render(); },
  'backup-days': (el) => { S.settings.backupDays = Number(el.dataset.v); saveSettings(); },
  'import-do': async (el) => {
    const data = ui.sheet && ui.sheet.data; if (!data) return;
    const st = defaultStores();
    if (el.dataset.mode === 'replace') {
      S.days = data.days || {}; S.settings = mergeDefaults(defaultSettings(), data.settings || null); S.foods = data.foods || { custom: [], over: {} };
      S.shop = data.shop || shopDefault();
      upgradePlan3(); upgradeShop3(); invInit(Date.now());
      for (const key of ['blood', 'knee', 'reviews', 'wish']) S[key] = data[key] ? mergeDefaults(st[key], data[key]) : st[key];
    } else {
      Object.assign(S.days, data.days || {});
      if (data.foods) { const ids = new Set(S.foods.custom.map((f) => f.id)); for (const f of data.foods.custom || []) if (!ids.has(f.id)) S.foods.custom.push(f); S.foods.over = { ...(data.foods.over || {}), ...S.foods.over }; }
      const byId = (a = [], b = []) => { const m = new Map(a.map((x) => [x.id, x])); for (const x of b) m.set(x.id, x); return [...m.values()]; };
      if (data.blood) { S.blood.entries = byId(S.blood.entries, data.blood.entries); S.blood.custom = byId(S.blood.custom, data.blood.custom); S.blood.markers = { ...(data.blood.markers || {}), ...S.blood.markers }; }
      if (data.knee) { S.knee.tests = byId(S.knee.tests, data.knee.tests); if (!S.knee.befund && data.knee.befund) S.knee.befund = data.knee.befund; }
      if (data.reviews) S.reviews = { ...S.reviews, ...data.reviews };
      if (data.wish && Array.isArray(data.wish.items)) S.wish.items = byId(wishItems(), data.wish.items);
      if (data.settings && data.settings.todos) S.settings.todos = byId(S.settings.todos, data.settings.todos);
    }
    buildFoodIndex(); upgrade5(); // ältere Backups: Prepmymeal-Beutel, Monster Zero, Saskia
    await DB.clear();
    if (GAR) await garSave(); // Garmin-Verbindung gehört zum Gerät, nicht zum Backup
    if (PUSH) await pushSave(); // Mitteilungen ebenso
    markDirty('settings'); markDirty('meta'); markDirty('foods'); STORE_KEYS.forEach((k) => markDirty(k)); Object.keys(S.days).forEach((k) => markDirty('day:' + k));
    await flush();
    buildFoodIndex(); invalidate(); closeSheet(); render(); toast('Backup importiert');
  },
  'wipe-ask': () => {
    ui.sheet = { type: 'wipe' };
    openSheet(`<h3 class="sheet-title">Alle Daten löschen?</h3><p class="hint">Alle Tage, Einstellungen, eigenen Lebensmittel, Blutwerte, Knie-Daten und Wochenfotos werden von diesem Gerät gelöscht. Das lässt sich nicht rückgängig machen. Mach vorher ein Backup.</p>
      <label class="amount-in is-wide"><input type="text" id="wipe-in" placeholder="Zum Bestätigen LÖSCHEN eingeben" autocapitalize="characters"></label>
      <div class="sheet-acts"><button class="btn" data-a="backup-export">Vorher Backup erstellen</button><button class="btn is-danger" data-a="wipe-do">Endgültig löschen</button></div>`);
  },
  'wipe-do': async () => {
    const v = ($('#wipe-in') || {}).value || '';
    if (v.trim().toUpperCase() !== 'LÖSCHEN') { toast('Bitte LÖSCHEN eingeben'); return; }
    if (PUSH) { try { await pushCall('off', {}); } catch (e) { /* egal */ } PUSH = null; }
    await DB.clear();
    GAR = null;
    S.days = {}; S.settings = defaultSettings(); S.foods = { custom: [], over: {} }; S.meta = { schema: 5, createdAt: new Date().toISOString(), lastBackup: null, backupSnooze: null };
    Object.assign(S, defaultStores()); S.shop = shopDefault();
    try { await PhotoDB.clear(); photoUrls.forEach((u) => URL.revokeObjectURL(u)); photoUrls.clear(); photoIdx.keys = []; } catch (e) { /* egal */ }
    markDirty('settings'); markDirty('meta'); markDirty('foods'); STORE_KEYS.forEach((k) => markDirty(k)); await flush();
    buildFoodIndex(); invalidate(); closeSheet(); ui.tab = 'heute'; render(false); toast('Alle Daten gelöscht');
  },
  reload: () => {
    ui.reloadRequested = true;
    if (navigator.serviceWorker) navigator.serviceWorker.getRegistration().then((r) => { if (r && r.waiting) r.waiting.postMessage('skipWaiting'); else location.reload(); });
    else location.reload();
  },

  /* Fortschritt */
  table: (el) => { const id = el.dataset.id; if (ui.tables.has(id)) ui.tables.delete(id); else ui.tables.add(id); render(); },
  week: (el) => { const n = addDays(ui.weekOf, Number(el.dataset.d)); if (n <= weekStart(todayKey())) { ui.weekOf = n; render(); } },
  'heat-metric': (el) => { ui.heatMetric = el.dataset.v; render(); },
  'heat-month': (el) => { const [y, m] = ui.heatMonth.split('-').map(Number); const d = new Date(y, m - 1 + Number(el.dataset.d), 1); const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; if (key <= todayKey().slice(0, 7)) { ui.heatMonth = key; render(); } },
  'h-metric': (el) => { ui.hMetric = el.dataset.v; render(); },

  /* Einstellungen */
  'goto-profile': () => { ui.setOpen = 'profil'; go('set', { scrollTop: true }); },
  'set-open': (el) => { ui.setOpen = ui.setOpen === el.dataset.id ? null : el.dataset.id; render(); if (ui.setOpen) requestAnimationFrame(() => { const t = document.getElementById('set-' + ui.setOpen); if (t) t.scrollIntoView({ block: 'start' }); }); },
  'targets-reset': () => { if (!confirm('Alle Ziele auf die Standardwerte zurücksetzen?')) return; S.settings.targets = clone(DEFAULT_TARGETS); saveSettings(); },
  'plan-reset': () => { if (!confirm('Standardtag auf den Ausgangsplan zurücksetzen? Eigene Posten gehen verloren.')) return; S.settings.plan = clone(DEFAULT_PLAN); S.settings.extra = clone(EXTRA_ITEMS); saveSettings(); },
  'pe-move': (el) => { const b = S.settings.plan.find((x) => x.id === el.dataset.b); const i = Number(el.dataset.i), j = i + Number(el.dataset.d); if (!b || j < 0 || j >= b.items.length) return; [b.items[i], b.items[j]] = [b.items[j], b.items[i]]; saveSettings(); },
  'pe-del': (el) => { const b = S.settings.plan.find((x) => x.id === el.dataset.b); if (!b) return; const it = b.items[Number(el.dataset.i)]; if (!confirm(`„${it.label || (FOOD[it.food] ? FOOD[it.food].n : it.food)}“ aus dem Standardtag entfernen?`)) return; b.items.splice(Number(el.dataset.i), 1); saveSettings(); },
  'pe-var': (el) => {
    const it = planItem(el.dataset.b, Number(el.dataset.i)); if (!it) return;
    const all = ['prep', 'doener', 'makrele'];
    let cur = it.v && it.v.length ? [...it.v] : [...all];
    if (cur.includes(el.dataset.v)) { if (cur.length === 1) { toast('Mindestens eine Variante'); return; } cur = cur.filter((x) => x !== el.dataset.v); } else cur.push(el.dataset.v);
    if (cur.length === 3) delete it.v; else it.v = all.filter((x) => cur.includes(x));
    saveSettings();
  },
  'pe-opt': (el) => { const it = planItem(el.dataset.b, Number(el.dataset.i)); if (!it) return; it.opt = !it.opt; if (!it.opt) delete it.opt; saveSettings(); },
  'pe-add': (el) => sheetPickFood(el.dataset.b),
  'pe-pick': (el) => {
    const f = FOOD[el.dataset.id], b = S.settings.plan.find((x) => x.id === ui.sheet.blockId);
    if (!f || !b) return;
    const u = f.u[0][0];
    b.items.push({ id: 'u_' + uid(), food: f.id, a: u === 'g' || u === 'ml' ? 100 : 1, u });
    closeSheet(); saveSettings(); toast(`${f.n} hinzugefügt`);
  },
  'week-var': (el) => { S.settings.weekPlan[Number(el.dataset.i)] = el.dataset.v; saveSettings(); },
  'food-new': (el) => sheetFoodEdit(null, { name: el.dataset.name || '', supp: !!el.dataset.supp }),
  'food-edit': (el) => sheetFoodEdit(el.dataset.id),
  'fe-supp': (el) => { ui.sheet.f.supp = el.dataset.v; $$('[data-a="fe-supp"]').forEach((b) => b.classList.toggle('is-on', b === el)); },
  'fe-flag': (el) => {
    const f = ui.sheet.f;
    if (el.dataset.f === 'fl') { if (f.fl) delete f.fl; else f.fl = 100; el.classList.toggle('is-on', !!f.fl); }
    else { f.tags = f.tags || []; const i = f.tags.indexOf('upf'); if (i >= 0) f.tags.splice(i, 1); else f.tags.push('upf'); el.classList.toggle('is-on', f.tags.includes('upf')); }
  },
  'fe-save': () => {
    const s = ui.sheet, f = s.f;
    const name = $('#fe-n').value.trim();
    if (!name) { toast('Bitte einen Namen eingeben'); return; }
    f.n = name; f.cat = $('#fe-cat').value;
    const v = {};
    $$('[data-fe]').forEach((inp) => { const n = parseNum(inp.value); if (n != null && n !== 0) v[inp.dataset.fe] = n; });
    f.v = v;
    if (f.base === 1) { const un = ($('#fe-u').value || 'Einheit').trim(); f.u = [[un, 1]]; }
    else {
      const un = ($('#fe-u').value || '').trim(), ug = parseNum($('#fe-ug').value);
      const baseU = f.fl ? 'ml' : 'g';
      f.u = un && ug ? [[un, ug], [baseU, 1]] : [[baseU, 1]];
      const pl = ($('#fe-pl').value || '').split(',').map((x) => x.trim()).filter(Boolean);
      if (pl.length) f.pl = pl.length === 1 ? pl[0] : pl; else delete f.pl;
      const pp = parseNum($('#fe-pp').value), pre = parseNum($('#fe-pre').value), fe = parseNum($('#fe-ferm').value);
      if (pp) f.pp = pp; else delete f.pp;
      if (pre) f.pre = pre; else delete f.pre;
      if (fe) f.ferm = fe; else delete f.ferm;
    }
    if (s.isNew || FOOD[f.id].custom) {
      const clean = { ...f }; delete clean.custom; delete clean.edited;
      const i = S.foods.custom.findIndex((x) => x.id === f.id);
      if (i >= 0) S.foods.custom[i] = clean; else S.foods.custom.push(clean);
    } else {
      const orig = FOODS.find((x) => x.id === f.id);
      const over = { v: {} };
      for (const k of EDIT_KEYS) { const a = orig.v[k] || 0, b = f.v[k] || 0; if (Math.abs(a - b) > 1e-9) over.v[k] = b; }
      for (const k of ['n', 'cat', 'u', 'pl', 'pp', 'pre', 'ferm', 'fl', 'tags', 'supp']) if (JSON.stringify(orig[k]) !== JSON.stringify(f[k])) over[k] = f[k] === undefined ? null : f[k];
      if (!Object.keys(over.v).length) delete over.v;
      if (Object.keys(over).length) S.foods.over[f.id] = over; else delete S.foods.over[f.id];
    }
    markDirty('foods'); buildFoodIndex(); invalidate(); closeSheet(); render(); toast('Gespeichert');
  },
  'fe-reset': () => { delete S.foods.over[ui.sheet.f.id]; markDirty('foods'); buildFoodIndex(); invalidate(); closeSheet(); render(); toast('Originalwerte wiederhergestellt'); },
  'fe-del': () => { if (!confirm('Dieses Lebensmittel löschen? Bereits eingetragene Mengen bleiben ohne Nährwerte.')) return; S.foods.custom = S.foods.custom.filter((x) => x.id !== ui.sheet.f.id); markDirty('foods'); buildFoodIndex(); invalidate(); closeSheet(); render(); },
  'skin-routine-add': () => { S.settings.skin.routine.push({ id: 'r_' + uid(), n: 'Neuer Punkt' }); saveSettings(); },
  'skin-routine-del': (el) => { S.settings.skin.routine.splice(Number(el.dataset.i), 1); saveSettings(); },
  'habit-onoff': (el) => { const id = el.dataset.id, off = S.settings.habitsOff; const i = off.indexOf(id); if (i >= 0) off.splice(i, 1); else off.push(id); saveSettings(); },
  'habit-goal': (el) => { S.settings.habitGoal = Number(el.dataset.v); saveSettings(); },
};

/* Eingabe während des Tippens */
const I = {
  search: (el) => { ui.q = el.value; const r = $('#results'); if (r) r.innerHTML = searchResults(); },
  'set-search': (el) => { ui.setQ = el.value; const box = $('#set-foods'); if (box) { const tmp = document.createElement('div'); tmp.innerHTML = SET_VIEWS.foods(); const nl = tmp.querySelector('#set-foods'); if (nl) box.innerHTML = nl.innerHTML; } },
  'pick-search': (el) => { const r = $('#pick-res'); if (r) r.innerHTML = pickResults(el.value); },
  'sheet-amt': (el) => { const n = parseNum(el.value); if (n != null && ui.sheet) { ui.sheet.amt = n; updateSheetPreview(); } },
};
function updateSheetPreview() {
  const s = ui.sheet, box = $('#sh-prev');
  if (!s || !box) return;
  if (s.type === 'item') { const { it } = findItem(s.id); const d = getDay(s.k); const food = FOOD[itemFoodId(it, d)]; box.innerHTML = nutPreview(food, s.amt * unitG(food, it.u)); }
  else if (s.type === 'food') { const food = FOOD[s.fid]; box.innerHTML = nutPreview(food, s.amt * unitG(food, s.unit)); }
}

/* Änderungen (beim Verlassen eines Feldes) – ohne komplettes Neuzeichnen, damit der Fokus bleibt */
function fieldMeta(key) { for (const g of HEALTH_FIELDS) for (const f of g.fields) if (f.k === key) return f; return null; }
const C = {
  'date-pick': (el) => { if (!el.value) return; ui.date = el.value > todayKey() ? todayKey() : el.value; render(); },
  choice: (el) => { mutDay(el.dataset.date, (d) => { d.choice[el.dataset.key] = el.value; }); render(); },
  health: (el) => {
    const k = el.dataset.date, key = el.dataset.k, f = fieldMeta(key);
    let v = el.value.trim();
    if (f && f.type === 'num') {
      if (v === '') v = null;
      else { v = parseNum(v); if (v == null || (f.min != null && v < f.min) || (f.max != null && v > f.max)) { toast(`${f.n}: Wert prüfen (${f.min}–${f.max})`); el.classList.add('bad'); return; } }
    } else if (v === '') v = null;
    el.classList.remove('bad');
    mutDay(k, (d) => { if (v == null) delete d.health[key]; else d.health[key] = v; if (key === 'weight' && v != null && k === todayKey()) { S.settings.profile.weight = v; markDirty('settings'); } });
    flashSaved(el);
    if (el.closest('.quick-health')) { const allSet = $$('.quick-health input').every((i) => i.value.trim()); if (allSet) render(); }
    if (el.closest('.sunday')) render();
  },
  'health-dur': (el) => { const k = el.dataset.date, key = el.dataset.k; const v = timeToMin(el.value); mutDay(k, (d) => { if (v == null) delete d.health[key]; else d.health[key] = v; }); flashSaved(el); },
  'habit-detail': (el) => {
    const k = el.dataset.date, key = el.dataset.k, h = el.dataset.h, v = el.value || null;
    mutDay(k, (d) => {
      d.hd = d.hd || {};
      if (v == null) { delete d.hd[key]; return; }
      d.hd[key] = v;
      const m = timeToMin(v);
      if (h === 'koffein') { if (m <= cafWindow(k)[1]) d.habits.koffein = true; else delete d.habits.koffein; }
      if (h === 'mahlzeit') { if (m <= sleepMin(k) - 120) d.habits.mahlzeit = true; else delete d.habits.mahlzeit; }
    });
    render();
  },
  note: (el) => { mutDay(el.dataset.date, (d) => { d.note = el.value; }); flashSaved(el); },
  'skin-note': (el) => { mutDay(el.dataset.date, (d) => { d.skin = d.skin || {}; d.skin.note = el.value; }); flashSaved(el); },
  profile: (el) => {
    const k = el.dataset.k;
    let v = el.value.trim();
    if (['age', 'height', 'weight'].includes(k)) v = parseNum(v);
    if ((k === 'wake' || k === 'sleep') && !v) return;
    S.settings.profile[k] = v;
    saveSettings(false); flashSaved(el);
  },
  target: (el) => {
    const key = el.dataset.k, f = el.dataset.f;
    let v = parseNum(el.value);
    S.settings.targets[key] = S.settings.targets[key] || {};
    if (v == null) { if (f === 'lo' && ['kcal', 'p', 'fatPct'].includes(key)) { toast('Dieses Ziel braucht einen Wert'); el.value = numIn(key === 'vd' ? S.settings.targets[key][f] * 40 : S.settings.targets[key][f], 2); return; } delete S.settings.targets[key][f]; }
    else { if (key === 'vd') v = v / 40; S.settings.targets[key][f] = v; }
    saveSettings(false); flashSaved(el);
  },
  'plan-block': (el) => { const b = S.settings.plan.find((x) => x.id === el.dataset.id); if (!b) return; if (el.dataset.f === 'n') b.n = el.value.trim() || b.n; else b.time = el.value || null; saveSettings(false); flashSaved(el); },
  'pe-amt': (el) => { const it = planItem(el.dataset.b, Number(el.dataset.i)); const v = parseNum(el.value); if (!it || v == null || v < 0) { toast('Menge prüfen'); return; } it.a = v; saveSettings(false); flashSaved(el); },
  'pe-unit': (el) => { const it = planItem(el.dataset.b, Number(el.dataset.i)); if (!it) return; it.u = el.value; saveSettings(false); flashSaved(el); },
  'pe-av': (el) => { const it = planItem(el.dataset.b, Number(el.dataset.i)); const v = parseNum(el.value); if (!it || v == null) return; it.av[el.dataset.v] = v; saveSettings(false); flashSaved(el); },
  'skin-phase': (el) => {
    const p = S.settings.skin.phases[Number(el.dataset.i)], f = el.dataset.f;
    if (f === 'rules') p.rules = el.value.split('\n').map((x) => x.trim()).filter(Boolean);
    else if (f === 'block') p.block = el.value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    else if (el.value) p[f] = el.value;
    saveSettings(false); flashSaved(el);
  },
  'skin-routine': (el) => { const r = S.settings.skin.routine[Number(el.dataset.i)]; if (!r) return; r.n = el.value.trim() || r.n; saveSettings(false); flashSaved(el); },
  'backup-import': (el) => {
    const file = el.files && el.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (e) { toast('Datei ist kein gültiges Backup'); return; }
      if (!data || data.app !== 'protokoll' || typeof data.days !== 'object') { toast('Datei ist kein Protokoll-Backup'); return; }
      ui.sheet = { type: 'import', data };
      const n = Object.keys(data.days).length;
      openSheet(`<h3 class="sheet-title">Backup importieren</h3><p class="hint">Backup vom ${esc(data.exportedAt ? fmtDate(data.exportedAt.slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' }) : '?')} mit ${n} Tagen.</p>
        <div class="sheet-acts"><button class="btn is-accent" data-a="import-do" data-mode="merge">Zusammenführen</button><p class="hint">Fügt die Tage hinzu; gleiche Tage werden durch das Backup ersetzt. Deine Einstellungen bleiben.</p>
        <button class="btn is-danger" data-a="import-do" data-mode="replace">Alles ersetzen</button><p class="hint">Löscht alles auf diesem Gerät und übernimmt das Backup komplett.</p></div>`);
    };
    reader.readAsText(file);
    el.value = '';
  },
};

/* ---------- Tooltip für Diagramme ---------- */
function showTip(el) {
  const tip = $('#tip');
  const lines = el.dataset.tip.split('\n');
  tip.innerHTML = `<b>${esc(lines[0])}</b>${lines.slice(1).map((l) => `<span>${esc(l)}</span>`).join('')}`;
  tip.classList.add('show');
  const r = el.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = r.left + r.width / 2 - tw / 2;
  x = clamp(x, 8, window.innerWidth - tw - 8);
  let y = r.top - th - 10;
  if (y < 8) y = r.bottom + 10;
  tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  const svg = el.closest('svg');
  $$('.xhair').forEach((l) => l.classList.remove('show'));
  if (svg && el.dataset.x) { const xl = svg.querySelector('.xhair'); if (xl) { xl.setAttribute('x1', el.dataset.x); xl.setAttribute('x2', el.dataset.x); xl.classList.add('show'); } }
}
function hideTip() { $('#tip').classList.remove('show'); $$('.xhair').forEach((l) => l.classList.remove('show')); }

function setupEvents() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const fn = A[el.dataset.a];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('input', (e) => { const el = e.target.closest('[data-i]'); if (el && I[el.dataset.i]) I[el.dataset.i](el, e); });
  document.addEventListener('change', (e) => { const el = e.target.closest('[data-c]'); if (el && C[el.dataset.c]) C[el.dataset.c](el, e); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ui.sheet) closeSheet();
    if (e.key === 'Enter' && e.target.id === 'plant-new') { const b = $('[data-a="plant-add-custom"]'); if (b) b.click(); }
    if (e.key === 'Enter' && e.target.id === 'todo-new') A['todo-add']();
    if (e.key === 'Enter' && e.target.id === 'shop-new') { e.preventDefault(); A['shop-add'](); }
  });
  document.addEventListener('pointerdown', (e) => { const el = e.target.closest('[data-tip]'); if (el) showTip(el); else if (!e.target.closest('#tip')) hideTip(); }, { passive: true });
  document.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse') return; const el = e.target.closest('[data-tip]'); if (el) showTip(el); else hideTip(); }, { passive: true });
  window.addEventListener('scroll', hideTip, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { flush(); return; }
    if (ui.timer) { lockScreen(); timerTick(); return; }
    try { goalNudgeCheck(); } catch (e) { /* egal */ }
    try { garAuto(); } catch (e) { /* egal */ }
    try { if (navigator.serviceWorker) navigator.serviceWorker.getRegistration().then((r) => { if (r) r.update(); }).catch(() => {}); } catch (e) { /* egal */ }
    const t = todayKey();
    if (t !== ui.lastToday) { if (ui.date === ui.lastToday) ui.date = t; ui.weekOf = weekStart(t); ui.heatMonth = t.slice(0, 7); ui.trainWeek = weekStart(t); ui.reviewWeek = weekStart(t); ui.photoWeek = weekStart(t); ui.lastToday = t; invalidate(); if (!ui.sheet) render(); }
    else if (ui.tab === 'heute' && !ui.sheet) render();
  });
  window.addEventListener('pagehide', () => { flush(); });
}
