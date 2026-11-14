/* ============================================================
   KERN Teil 2: Koffein, Training, Knie, Einkauf, Blutwerte,
   Wochenrückblick, Fotos (eigene IndexedDB), ZIP
   ============================================================ */

/* ---------- Zusätzliche Einstellungen & Speicher ---------- */
function defaultSettings2() {
  return {
    nav: { tabs: DEFAULT_TABS.slice() },
    caf: { halfLife: 5, mode: 'dose', presets: clone(CAF_PRESETS) },
    sleep: { recMax: 90 }, // gapH (Koffein-Stopp vor dem Schlafen) fehlt absichtlich: Standard 8 Std., Migration rechnet alte Uhrzeit um
    waterFood: 'saskia',
    sauna: { goal: 60 },
    week: clone(DEFAULT_WEEK),
    gym: { anchor: '2026-11-02', first: 'A', kneeAlt: true },
    knee: { start: '2026-10-26', side: 'rechts', extraSec: 15, extraReps: 5, trans: 10, signal: 'voice', phase: 1, ext: 0, bands: clone(KNEE_BANDS), insoles: null, cadence: null, routines: null, video: {}, longShort: false },
  };
}
function defaultStores() {
  return { shop: null, blood: { markers: {}, custom: [], entries: [] }, knee: { tests: [], befund: '', appts: [] }, reviews: {}, wish: { items: null } };
}
/* Einmalige Umstellung auf Version 2 */
function migrate2() {
  if ((S.meta.schema || 1) >= 2) return;
  S.meta.schema = 2;
  markDirty('meta');
  markDirty('settings');
  const ph = S.settings.skin && S.settings.skin.phases && S.settings.skin.phases[0];
  if (ph && ph.rules && ph.rules[0] === 'Epilierer weg, Rasur schonend') ph.rules = clone(DEFAULT_SKIN.phases[0].rules);
  for (const r of (S.settings.skin && S.settings.skin.routine) || []) { const def = DEFAULT_SKIN.routine.find((x) => x.id === r.id); if (def && ['Pflege morgens', 'Pflege abends', 'Rasiert (schonend)'].includes(r.n)) r.n = def.n; }
  for (const t of S.settings.todos || []) if (!('date' in t)) t.date = null;
  if (!S.shop) { S.shop = shopDefault(); markDirty('shop'); }
}

/* Einmalige Umstellung auf Version 2.1: Läden & Hinweise im Einkauf, Einkaufsstand vom 07.11.2026,
   Auswahl bei Kiwi, Schokolade und Rote Bete (bisherige Tage behalten ihr Lebensmittel) */
const PLAN_UPD3 = [{ id: 'f_kiwi', old: 'kiwi' }, { id: 'n_schoko', old: 'schokolade85' }, { id: 'v_rotebete', old: 'rote_bete' }];
function upgradePlan3() {
  let changed = false;
  for (const u of PLAN_UPD3) {
    const def = DEFAULT_PLAN.flatMap((b) => b.items).find((x) => x.id === u.id);
    const hit = findItem(u.id);
    if (!def || !hit || hit.it.choice || hit.it.food !== u.old) continue;
    const it = hit.it, oldFood = FOOD[u.old];
    for (const [k, d] of Object.entries(S.days)) {
      if (!d.checks || !d.checks[u.id]) continue;
      d.choice = d.choice || {};
      if (!d.choice[u.id]) d.choice[u.id] = u.old;
      if (def.u !== it.u) {
        d.amt = d.amt || {};
        const g = (d.amt[u.id] != null ? d.amt[u.id] : it.a) * unitG(oldFood, it.u);
        d.amt[u.id] = Math.round(g / unitG(oldFood, def.u) * 10) / 10;
      }
      markDirty('day:' + k);
    }
    if (def.u !== it.u) { it.u = def.u; it.a = def.a; }
    it.food = def.food; it.choice = def.choice.slice();
    if (def.label) it.label = def.label;
    changed = true;
  }
  if (changed) markDirty('settings');
  return changed;
}
function upgradeShop3(opts = {}) {
  if (!S.shop || !Array.isArray(S.shop.items)) { S.shop = shopDefault(); markDirty('shop'); return; }
  for (const it of S.shop.items) {
    const d = shopDef(it.sid);
    if (d && d.old && it.n === d.old) it.n = d.n;
    if (d && it.sid === 'b:Kombucha' && it.q === '2 l') it.q = d.q;
    if (!it.store) it.store = d ? d.store : CAT_STORE[it.cat] || 'other';
    if (it.tip == null) it.tip = d ? d.tip : '';
  }
  /* neue Standardartikel ergänzen (gelöschte bleiben gelöscht) */
  for (const sid of opts.add || []) { const d = shopDef(sid); if (d && !S.shop.items.some((x) => x.sid === sid)) S.shop.items.push(shopNew(d)); }
  if (opts.sync) for (const it of S.shop.items) if (shopDef(it.sid)) it.list = SHOP_SYNC_BUY.includes(it.sid) ? 'buy' : 'home';
  markDirty('shop');
}
function migrate3() {
  if ((S.meta.schema || 1) >= 3) return;
  /* Einkaufsstand nur übernehmen, wenn die App schon genutzt wurde und der Stand noch aktuell ist */
  const used = Object.keys(S.days).length > 0;
  S.meta.schema = 3;
  markDirty('meta');
  upgradePlan3();
  upgradeShop3({ add: ['h:Magnesium-Threonat'], sync: used && todayKey() <= '2026-11-14' });
}

/* Einmalige Umstellung auf Version 2.3: Vorrat, der mitzählt.
   Bisherige Nutzer: Zuhause gilt die Standardmenge ab dem Einkauf vom 07.11.2026 (18 Uhr). */
function migrate4() {
  if ((S.meta.schema || 1) >= 4) return;
  S.meta.schema = 4;
  markDirty('meta');
  const used = Object.keys(S.days).length > 0;
  invInit(used && todayKey() <= '2026-11-21' ? invTs('2026-11-07', '18:00') : Date.now());
}

/* Version 2.7: Standardtag an den Alltag (ein Prepmymeal-Beutel, Saskia, Monster Zero), Prepmymeal nicht ultraverarbeitet.
   Läuft beim Start und nach einem Import; mehrfach aufrufbar. */
const PMM_OLD = { f_pmm: [200, 'fruehstueck'], l_pmm: [600, 'mittag'], n_pmm: [200, 'nachmittag'] };
function upgrade5Days(days) {
  for (const [k, d] of Object.entries(days || {})) {
    if (!d || !d.checks) continue;
    let changed = false;
    for (const [id, [a, meal]] of Object.entries(PMM_OLD)) {
      if (!d.checks[id]) continue;
      const key = d.choice && d.choice.pmm;
      const fid = key && FOOD[key] ? key : 'prepmymeal';
      const g = (d.amt && d.amt[id] != null ? d.amt[id] : a) * 1;
      /* Uhrzeit: abgehakt um …, sonst die Zeit des Mahlzeit-Blocks im Plan */
      const blk = ((S.settings && S.settings.plan) || DEFAULT_PLAN).find((b) => b.id === meal) || DEFAULT_PLAN.find((b) => b.id === meal);
      const hm = (d.ct && d.ct[id]) || (blk && /^\d{2}:\d{2}$/.test(blk.time || '') ? blk.time : null);
      let t = null;
      if (hm) { const [y, mo, da] = k.split('-').map(Number); const [hh, mm] = hm.split(':').map(Number); t = new Date(y, mo - 1, da, hh, mm).getTime(); }
      d.entries = d.entries || [];
      d.entries.push({ id: uid(), food: fid, g, meal, t: t || parseKey(k).getTime() });
      delete d.checks[id]; if (d.ct) delete d.ct[id]; if (d.amt) delete d.amt[id];
      changed = true;
    }
    for (const c of d.caf || []) {
      if (c.p !== 'monster' && c.p !== 'monster_ultra') continue;
      Object.assign(c, { p: 'monster_zero', n: 'Monster Energy Zero 500 ml', mg: 160, ml: 500, kcal: 15, sug: 0, na: 380 });
      changed = true;
    }
    if (changed && S.days === days) markDirty('day:' + k);
  }
  /* Garmin-Krafttraining dieser Woche dem geplanten Gym-Tag zuordnen (wie ab jetzt beim Abruf) */
  if (S.days !== days) return;
  const ws = weekStart(todayKey());
  for (const k of Object.keys(days).filter((x) => x >= ws && x <= todayKey()).sort()) {
    const d = days[k];
    let changed = false;
    for (const t of (d && d.trainings) || []) if (t.gid && garAssignGym(t, k)) changed = true;
    if (changed) markDirty('day:' + k);
  }
}
function upgrade5() {
  buildFoodIndex();
  let ch = false;
  const plan = S.settings.plan || [];
  const def = (id) => DEFAULT_PLAN.flatMap((b) => b.items).find((x) => x.id === id);
  /* Prepmymeal: drei Posten → ein Beutel im eigenen Block */
  for (const b of plan) { const n = b.items.length; b.items = b.items.filter((it) => !PMM_OLD[it.id]); if (b.items.length !== n) ch = true; }
  if (!plan.some((b) => b.items.some((it) => it.id === 'p_beutel'))) {
    const blk = clone(DEFAULT_PLAN.find((b) => b.id === 'pmm'));
    const i = plan.findIndex((b) => b.id === 'morgen');
    plan.splice(i >= 0 ? i + 1 : 0, 0, blk);
    ch = true;
  }
  /* optional, was im Alltag selten passt; Hinweise; Wasser = Saskia */
  for (const b of plan) for (const it of b.items) {
    if (['l_oel', 'l_tee', 'g_kokos', 'g_kombucha', 'g_mineral'].includes(it.id) && !it.opt) { it.opt = true; ch = true; }
    if (['m_wasser', 'm_wasser2'].includes(it.id) && it.food === 'wasser') { it.food = 'saskia'; ch = true; }
    const dd = def(it.id);
    if (dd && dd.hint && ['l_tee', 'g_mineral', 'n_kuerbis', 'n_mandeln', 'a_hafer'].includes(it.id) && it.hint !== dd.hint) { it.hint = dd.hint; ch = true; }
  }
  const abend = plan.find((b) => b.id === 'abend');
  if (abend && !abend.items.some((it) => it.id === 'a_kokos')) { abend.items.push(clone(def('a_kokos'))); ch = true; }
  /* Koffein: Monster Zero statt Monster mit Zucker und Ultra */
  const pr = S.settings.caf && S.settings.caf.presets;
  if (Array.isArray(pr) && pr.some((p) => p.id === 'monster' || p.id === 'monster_ultra')) {
    const at = pr.findIndex((p) => p.id === 'monster' || p.id === 'monster_ultra');
    S.settings.caf.presets = pr.filter((p) => p.id !== 'monster' && p.id !== 'monster_ultra');
    if (!S.settings.caf.presets.some((p) => p.id === 'monster_zero')) S.settings.caf.presets.splice(Math.max(0, at), 0, clone(CAF_PRESETS.find((p) => p.id === 'monster_zero')));
    ch = true;
  }
  if (!S.settings.waterFood) { S.settings.waterFood = 'saskia'; ch = true; }
  /* Koffein-Stopp: feste Uhrzeit → Abstand vor der (jetzt täglichen) Schlafenszeit */
  const caf = S.settings.caf;
  if (caf && caf.gapH == null) {
    const cut = timeToMin(caf.cutoff), bed = rhProfile().bed;
    caf.gapH = cut != null ? clamp(Math.round(((bed - cut) / 60) * 2) / 2, 4, 12) : 8;
    ch = true;
  }
  if (ch) markDirty('settings');
  /* Prepmymeal nie als ultraverarbeitet markiert */
  let fc = false;
  for (const f of (S.foods && S.foods.custom) || []) if (/^prepmymeal/i.test(f.n || '') && Array.isArray(f.tags) && f.tags.includes('upf')) { f.tags = f.tags.filter((t) => t !== 'upf'); fc = true; }
  if (fc) { markDirty('foods'); buildFoodIndex(); }
  upgrade5Days(S.days);
  invalidate();
}
function migrate5() {
  if ((S.meta.schema || 1) >= 5) return;
  upgrade5();
  S.meta.schema = 5;
  markDirty('meta');
}

/* ---------- Bereiche ---------- */
function areaById(id) { return AREAS.find((a) => a.id === id) || (id === 'mehr' ? MORE_TAB : null); }
function navTabs() {
  const t = (S.settings.nav && S.settings.nav.tabs || DEFAULT_TABS).filter((id) => areaById(id) && id !== 'mehr').slice(0, 4);
  return t.length ? t : DEFAULT_TABS.slice();
}

/* ============================================================
   KOFFEIN
   ============================================================ */
function hlMin() { return Math.max(1, Number(S.settings.caf.halfLife) || 5) * 60; }
/* Koffein-Stopp (seit 2.10.0 je Getränk nach Dosis): Meta-Analyse Gardiner 2023 – 107 mg mindestens
   8,8 Std., 217,5 mg mindestens 13,2 Std. vor dem Schlafen; dazwischen und darüber linear, 6–14 Std.
   Ohne Dosis gilt dein typisches Getränk (Median der letzten 14 Tage, sonst eine Tasse Kaffee).
   Modus „fest“: ein Abstand für alles (settings.caf.gapH). */
function cafMode() { return (S.settings.caf && S.settings.caf.mode) === 'fix' ? 'fix' : 'dose'; }
function cafDoseH(mg) { return clamp(8.8 + ((Number(mg) || 90) - 107) * (4.4 / 110.5), 6, 14); }
function cafTypMg(k = todayKey()) {
  const c = cafTypMg.c || (cafTypMg.c = { v: -1, m: new Map() });
  if (c.v !== calcVersion) { c.v = calcVersion; c.m.clear(); }
  if (c.m.has(k)) return c.m.get(k);
  const mgs = [];
  for (let i = 0; i < 14; i++) for (const x of cafSources(addDays(k, -i))) if (x.mg >= 15) mgs.push(x.mg);
  const v = mgs.length >= 3 ? Math.round(rhMedian(mgs)) : 90;
  c.m.set(k, v);
  return v;
}
function cafCutoff(k = todayKey(), mg) {
  if (cafMode() === 'fix') return sleepMin(k) - cafGap();
  return Math.round((sleepMin(k) - cafDoseH(mg ?? cafTypMg(k)) * 60) / 5) * 5;
}
function cafStart(k = todayKey()) { return rhythm(k).wake + 90; } // 90-Minuten-Regel (bleibt, Wunsch 11.11.2026)
/* Bis wann welches Getränk? (Getränke aus den Einstellungen) */
function cafStops(k = todayKey()) {
  return (S.settings.caf.presets || []).filter((p) => Number(p.mg) > 0).map((p) => ({ id: p.id, n: p.n, mg: Number(p.mg), stop: cafCutoff(k, p.mg) })).sort((a, b) => a.stop - b.stop);
}
function sleepAbs(k = todayKey()) { return sleepMin(k); }
function cafFood(c) { return { id: 'caf_' + (c.p || 'x'), n: c.n, base: 1, fl: c.ml || 0, u: [['Portion', 1]], cat: 'Getränke', v: { kcal: c.kcal || 0, c: c.sug || 0, sug: c.sug || 0, fs: c.sug || 0, na: c.na || 0, caf: c.mg || 0 } }; }
/* Alle Koffeinquellen eines Tages: Koffein-Rechner, abgehakte Standardposten, Einzel-Einträge */
function cafSources(k) {
  const d = peekDay(k);
  if (!d) return [];
  const out = [];
  for (const e of d.caf || []) { const t = timeToMin(e.t); if (t != null) out.push({ t, mg: e.mg || 0, n: e.n, src: 'caf', id: e.id }); }
  const variant = dayVariant(k);
  for (const { it, block } of allPlanItems()) {
    if (!d.checks[it.id]) continue;
    const f = FOOD[itemFoodId(it, d)];
    if (!f || !f.v || !f.v.caf) continue;
    const mg = (f.v.caf * itemGrams(it, d, variant)) / (f.base || 100);
    if (mg < 1) continue;
    let t = d.ct && d.ct[it.id] ? timeToMin(d.ct[it.id]) : block ? resolveBlockTime(block, d) : null;
    if (t == null) t = 12 * 60;
    out.push({ t, mg, n: itemLabel(it, d), src: 'plan', id: it.id });
  }
  for (const e of d.entries || []) {
    const f = FOOD[e.food];
    if (!f || !f.v || !f.v.caf) continue;
    const mg = (f.v.caf * e.g) / (f.base || 100);
    if (mg < 1) continue;
    let t = null;
    if (e.t) { const dt = new Date(e.t); if (dkey(dt) === k) t = dt.getHours() * 60 + dt.getMinutes(); }
    if (t == null) { const b = S.settings.plan.find((x) => x.id === e.meal); t = b ? resolveBlockTime(b, d) : null; }
    if (t == null) t = 12 * 60;
    out.push({ t, mg, n: f.n, src: 'entry', id: e.id });
  }
  return out.sort((a, b) => a.t - b.t);
}
function cafLevel(src, m) { const hl = hlMin(); let s = 0; for (const x of src) if (m >= x.t) s += x.mg * Math.pow(0.5, (m - x.t) / hl); return s; }
function cafInfo(k) {
  const src = cafSources(addDays(k, -1)).map((x) => ({ ...x, t: x.t - 1440 })).concat(cafSources(k));
  const today = src.filter((x) => x.t >= 0);
  const total = today.reduce((a, x) => a + x.mg, 0);
  const isT = k === todayKey();
  const now = isT ? nowMin() : null;
  const last = today.length ? today[today.length - 1].t : null;
  const lLast = last != null ? cafLevel(src, last) : 0;
  const below = (thr) => (last == null ? null : lLast <= thr ? last : last + hlMin() * Math.log2(lLast / thr));
  const cut = cafCutoff(k);
  const late = today.filter((x) => x.t > cafCutoff(k, x.mg) && (x.src === 'caf' || x.mg >= 15)).map((x) => ({ ...x, stop: cafCutoff(k, x.mg) }));
  const start = cafStart(k), early = today.filter((x) => x.t < start - 15 && (x.src === 'caf' || x.mg >= 15));
  const bed = sleepAbs(k);
  return { src, today, total, now, nowLevel: isT ? cafLevel(src, now) : null, last, below50: below(50), below25: below(25), late, bed, bedLevel: cafLevel(src, bed), cut, start, early };
}
function cafLateWarn(info) {
  const out = [];
  if (info.late.length) out.push(`Nach dem Koffein-Stopp: ${info.late.map((x) => `${x.n} um ${minToTime(x.t)} (Stopp für ${fmt(x.mg)} mg: ${minToTime(x.stop)})`).join(', ')}`);
  if (info.early && info.early.length) out.push(`Vor deinem Koffein-Start (${minToTime(info.start)}, 90 Min. nach dem Aufwachen): ${info.early.map((x) => `${x.n} um ${minToTime(x.t)}`).join(', ')}`);
  if (info.bedLevel >= 25) out.push(`Zur Schlafenszeit (${minToTime(info.bed)}) voraussichtlich noch ${fmt(info.bedLevel)} mg im Körper${info.bedLevel >= 50 ? ' – das stört den Tiefschlaf deutlich' : ''}`);
  return out;
}
/* Gewohnheit „Koffein nur im Fenster“ aus echten Einträgen ableiten */
function syncCafHabit(k) {
  const d = peekDay(k);
  if (!d) return;
  const src = cafSources(k);
  if (!src.length) return;
  const a = cafStart(k);
  const ok = src.every((x) => x.t >= a - 30 && x.t <= cafCutoff(k, x.mg));
  d.hd = d.hd || {};
  d.hd.caffeineEnd = minToTime(src[src.length - 1].t);
  if (ok) d.habits.koffein = true; else delete d.habits.koffein;
}

/* ============================================================
   TRAINING & SAUNA
   ============================================================ */
function trainType(t) {
  const id = !t ? 'Sonstiges' : t.type === 'Kraft / Gym' ? 'Gym (frei)' : t.type;
  return TRAIN_TYPES.find((x) => x.id === id) || { id: id || 'Sonstiges' };
}
function slotForTime(time) { const m = timeToMin(time); if (m == null) return null; return m < 660 ? 'morgens' : m < 1080 ? 'mittags' : 'abends'; }
function mainTraining(d) {
  return (d && d.trainings || []).filter((t) => t.time && !trainType(t).light).sort((a, b) => timeToMin(a.time) - timeToMin(b.time))[0] || null;
}
function saunaMin(d) { return (d && d.sauna || []).reduce((a, s) => a + (Number(s.min) || 0), 0); }
function gymDay(n) { return GYM_DAYS.find((x) => x.day === Number(n)) || null; }
function gymSched(k) {
  const g = S.settings.gym;
  const w = Math.round(daysBetween(g.anchor || weekStart(k), weekStart(k)) / 7);
  const flip = ((w % 2) + 2) % 2 === 1;
  return flip ? (g.first === 'A' ? 'B' : 'A') : g.first || 'A';
}
function gymTarget(ex, sched, alt) {
  const src = alt && ex.alt ? ex.alt : ex;
  const [sets, reps] = src[sched] || ex[sched];
  return { sets, reps, n: src.n, note: src.note };
}
/* Letzte Werte einer Übung (für „Letztes Mal“) */
function lastGymLog(exId, beforeKey, excludeId) {
  for (let i = 0; i < 150; i++) {
    const k = addDays(beforeKey, -i);
    const d = peekDay(k);
    if (!d) continue;
    const list = (d.trainings || []).filter((t) => t.gym && t.gym.ex && t.gym.ex[exId] && t.id !== excludeId).reverse();
    for (const t of list) {
      const e = t.gym.ex[exId];
      const sets = (e.s || []).filter((s) => s.w != null || s.r != null);
      if (sets.length) return { k, sets, alt: !!e.alt, sched: t.gym.sched };
    }
  }
  return null;
}
function baselineOf(field, k, n = 7) {
  const vals = [];
  for (let i = 1; i <= 21 && vals.length < n; i++) { const d = peekDay(addDays(k, -i)); if (d && d.health && d.health[field] != null) vals.push(d.health[field]); }
  return vals.length >= 3 ? mean(vals) : null;
}
/* Erholung aus Garmin-Werten: green / yellow / red / none */
function recovery(k) {
  const d = peekDay(k) || {};
  const h = d.health || {};
  const sig = [];
  if (h.sleepScore != null) sig.push({ n: 'Sleep Score', v: fmt(h.sleepScore), s: h.sleepScore >= 80 ? 1 : h.sleepScore >= 60 ? 0 : -1 });
  if (h.hrv != null || h.hrvStatus) {
    const b = baselineOf('hrv', k);
    let s = 0;
    if (h.hrv != null && b) s = h.hrv < b * 0.9 ? -1 : h.hrv >= b ? 1 : 0;
    if (h.hrvStatus === 'Niedrig' || h.hrvStatus === 'Schlecht') s = -1;
    if (h.hrvStatus === 'Ausgeglichen' && s === 0 && !b) s = 1;
    sig.push({ n: 'HRV', v: h.hrv != null ? `${fmt(h.hrv)} ms${b ? ` (Ø ${fmt(b)})` : ''}` : h.hrvStatus, s });
  }
  if (h.bbMorning != null) sig.push({ n: 'Body Battery', v: fmt(h.bbMorning), s: h.bbMorning >= 70 ? 1 : h.bbMorning >= 40 ? 0 : -1 });
  if (h.readiness != null) sig.push({ n: 'Trainingsbereitschaft', v: fmt(h.readiness), s: h.readiness >= 70 ? 1 : h.readiness >= 40 ? 0 : -1 });
  if (h.rhr != null) { const b = baselineOf('rhr', k); if (b) sig.push({ n: 'Ruhepuls', v: `${fmt(h.rhr)} (Ø ${fmt(b)})`, s: h.rhr > b + 5 ? -1 : h.rhr <= b ? 1 : 0 }); }
  const neg = sig.filter((x) => x.s < 0).length, sum = sig.reduce((a, x) => a + x.s, 0);
  let level = !sig.length ? 'none' : neg >= 2 || sum <= -2 ? 'red' : neg >= 1 || sum < 0 ? 'yellow' : 'green';
  let normal = level === 'green' && sum <= 0, sigOut = sig;
  const ready = readinessOf(k);
  if (ready) { // eigene Bereitschaft (oder dein Wert von der Uhr) entscheidet
    level = ready.score >= 50 ? 'green' : ready.score >= 25 ? 'yellow' : 'red';
    if (level === 'green' && ready.parts.some((p) => (p.id === 'hrv' || p.id === 'sleep') && p.s < 25)) level = 'yellow';
    normal = level === 'green' && ready.score < 75;
    if (ready.parts.length) sigOut = ready.parts.map((p) => ({ n: p.n, v: p.v, s: p.s >= 70 ? 1 : p.s >= 40 ? 0 : -1 }));
  }
  const prev = peekDay(addDays(k, -1));
  const prevHard = prev && (prev.trainings || []).some((t) => (t.int || 0) >= 9);
  const am = kneeAm(k);
  const text = {
    green: 'Gute Erholung – Training wie geplant.',
    yellow: 'Mittlere Erholung – Einheit etwas leichter: je Übung 1 Satz weniger und kein Satz bis Versagen. Lauf kürzer und ganz locker.',
    red: 'Schlechte Erholung – heute Ruhetag oder lockerer Spaziergang plus Mobilität. Die geplante Einheit auf den nächsten freien Tag schieben.',
    none: 'Trag morgens Sleep Score, HRV und Body Battery ein, dann passt die App die Empfehlung an deine Erholung an.',
  }[level];
  const notes = [];
  if (prevHard && level !== 'red') notes.push('Gestern sehr harte Einheit (Intensität ≥ 9) – heute nicht wieder bis ans Limit.');
  if (am != null && am > 3) notes.push(`Knie heute ${am}/10 – kein Lauf, Beintraining nur schmerzfrei.`);
  return { level, sig: sigOut, text: normal ? 'Normale Erholung – Training wie geplant.' : text, notes, normal, ready };
}
function weekTpl(i) { return (S.settings.week || DEFAULT_WEEK)[i] || {}; }
function weekKeys(ws) { return Array.from({ length: 7 }, (_, i) => addDays(ws, i)); }
function kneeSessions(d) { return (d && d.knee && d.knee.sess) || []; }
function dayDone(k) {
  const d = peekDay(k) || {};
  const tr = d.trainings || [];
  const sess = kneeSessions(d);
  return {
    gym: tr.map((t) => trainType(t).gym).filter(Boolean),
    gymAny: tr.some((t) => trainType(t).gym || ['Gym (frei)', 'Push', 'Pull', 'Beine'].includes(trainType(t).id)),
    legs: tr.some((t) => trainType(t).legs),
    run: tr.filter((t) => trainType(t).run).length,
    kraft: !!(d.knee && d.knee.str && d.knee.str.done) || sess.some((s) => (s.r === 'pflicht5' || s.r === 'kraft') && s.complete) || tr.some((t) => t.type === 'Knie-Kraft'),
    lang: sess.some((s) => s.r === 'lang' && s.complete),
    mob: sess.some((s) => ['taeglich', 'kurz', 'lang'].includes(s.r) && s.complete) || !!(d.knee && d.knee.mob),
    sauna: saunaMin(d),
    walk: tr.some((t) => t.type === 'Spaziergang') || ((d.health || {}).steps || 0) >= 8000,
    hard: tr.some((t) => !trainType(t).light),
  };
}
/* Wochenplan-Vorschlag inkl. Nachholen, Konflikten und Sauna */
function weekPlan(ws) {
  const today = todayKey();
  const days = weekKeys(ws).map((k, i) => {
    const tpl = weekTpl(i), done = dayDone(k);
    const items = [];
    if (tpl.gym && gymDay(tpl.gym)) items.push({ kind: 'gym', day: tpl.gym, n: gymDay(tpl.gym).n, done: done.gym.includes(Number(tpl.gym)) || (done.gymAny && !done.gym.length) });
    items.push({ kind: 'kraft', n: 'Knie-Athletik', done: done.kraft }); // seit 2.13 täglich zu Hause
    if (tpl.lauf) items.push({ kind: 'lauf', n: 'Lockerer Lauf', done: done.run > 0 });
    if (tpl.lang) items.push({ kind: 'lang', n: 'Lange Routine', done: done.lang });
    if (tpl.walk) items.push({ kind: 'walk', n: 'Spaziergang', done: done.walk });
    items.push({ kind: 'mob', n: 'Mobilität', done: done.mob });
    for (const g of done.gym) if (g !== Number(tpl.gym)) items.push({ kind: 'gym', day: g, n: gymDay(g).n, done: true, extra: true });
    if (done.run && !tpl.lauf) items.push({ kind: 'lauf', n: 'Lauf', done: true, extra: true });
    if (done.sauna) items.push({ kind: 'sauna', n: `Sauna ${done.sauna} Min.`, done: true });
    return { k, i, tpl, items, done, past: k < today, isToday: k === today };
  });
  /* vorgezogen: der geplante Gym-Tag wurde schon früher in der Woche trainiert */
  for (const d of days) for (const it of d.items) {
    if (it.kind !== 'gym' || it.done || it.extra) continue;
    if (days.some((x) => x.k < d.k && x.done.gym.includes(it.day) && Number(x.tpl.gym) !== it.day)) { it.done = true; it.n += ' (vorgezogen)'; }
  }
  const notes = [];
  const runNext = (idx) => (idx + 1 < 7 ? !!days[idx + 1].tpl.lauf : !!weekTpl(0).lauf);
  /* verpasste Gym-Tage nachholen – nur wenn du Trainings auch einträgst */
  const logs = rangeKeys(21, addDays(today, -1)).some((k) => ((peekDay(k) || {}).trainings || []).some((t) => !trainType(t).light));
  for (const d of days) {
    if (!d.past || !logs) continue;
    for (const it of d.items) {
      if (it.kind !== 'gym' || it.done || it.extra) continue;
      if (days.some((x) => x.k > d.k && (x.done.gym.includes(it.day) || (x.done.gymAny && !x.done.gym.length && !x.tpl.gym)))) continue;
      const legs = gymDay(it.day).legs;
      const target = days.find((x) => x.k >= today && !x.tpl.gym && !x.done.gymAny && !x.items.some((y) => y.moved) && !(legs && runNext(x.i)) && !(x.isToday && nowMin() > sleepMin() - 180));
      if (target) target.items.unshift({ kind: 'gym', day: it.day, n: 'Nachholen: ' + gymDay(it.day).n, moved: true, done: false });
      else notes.push(`${gymDay(it.day).n} ist diese Woche ausgefallen – nächste Woche einfach normal weiter.`);
    }
  }
  /* Konflikte */
  for (const d of days) {
    const legsHere = d.items.some((x) => x.kind === 'gym' && gymDay(x.day) && gymDay(x.day).legs && !x.done) || d.done.legs;
    if (legsHere && runNext(d.i)) d.warn = 'Kein schweres Beintraining am Tag vor einem Lauf: Beintag verschieben oder den Lauf morgen ganz locker und kürzer halten.';
    const prev = d.i > 0 ? days[d.i - 1] : null;
    if (d.tpl.lauf && prev && prev.done.legs && !d.past) d.warn = 'Gestern Beintag – heute nur sehr locker laufen oder den Lauf um einen Tag schieben.';
  }
  const km = kmWeek(ws), kmPrev = kmWeek(addDays(ws, -7));
  if (kmPrev > 0 && km > kmPrev * 1.1) notes.push(`Laufumfang ${fmt(km, 1)} km – mehr als 10 % über der Vorwoche (${fmt(kmPrev, 1)} km).`);
  return { days, notes, sauna: saunaWeek(ws, days) };
}
function saunaWeek(ws, days) {
  const goal = Number(S.settings.sauna.goal) || 60;
  const done = weekKeys(ws).reduce((a, k) => a + saunaMin(peekDay(k)), 0);
  const rest = Math.max(0, goal - done);
  const today = todayKey();
  const latest = sleepMin() - 150;
  const cand = (days || []).filter((d) => d.k >= today && !d.done.sauna && !(d.isToday && nowMin() > latest));
  const planned = cand.filter((d) => d.tpl.sauna);
  const train = cand.filter((d) => d.items.some((x) => (x.kind === 'gym' || x.kind === 'lauf') && (!x.extra || !x.done)));
  const per0 = (n) => clamp(Math.ceil(rest / Math.max(1, n) / 5) * 5, 15, 30);
  const pool = planned.length && per0(planned.length) * planned.length >= rest ? planned : planned.concat(train.filter((d) => !d.tpl.sauna)).length ? planned.concat(train.filter((d) => !d.tpl.sauna)) : cand;
  const sugg = [];
  let r = rest;
  if (r > 0 && pool.length) {
    const per = clamp(Math.ceil(r / pool.length / 5) * 5, 15, 30);
    for (const d of pool) {
      if (r <= 0) break;
      const m = Math.min(per, r);
      const after = d.items.find((x) => x.kind === 'gym' || x.kind === 'lauf');
      sugg.push({ k: d.k, min: m, after: after ? after.n.replace('Nachholen: ', '') : null });
      r -= m;
    }
  }
  sugg.sort((a, b) => a.k.localeCompare(b.k));
  return { goal, done, rest, sugg, latest, left: r };
}

/* ============================================================
   KNIE-RESET
   ============================================================ */
function kneeCfg() { return S.settings.knee; }
function kneeDay(d) { return (d && d.knee) || {}; }
function kneeAm(k) { const d = peekDay(k); return d && d.knee && d.knee.am != null ? d.knee.am : null; }
function kneeWeek(k = todayKey()) { const n = daysBetween(kneeCfg().start, k); return n < 0 ? 0 : Math.floor(n / 7) + 1; }
function plannedPhase(week) { return week >= 9 ? 3 : week >= 4 ? 2 : 1; }
function kneePhase() { return KNEE_PHASES.find((p) => p.id === (kneeCfg().phase || 1)) || KNEE_PHASES[0]; }
function exById(id) { return KNEE_EX.find((e) => e.id === id) || (typeof ZW_OWN !== 'undefined' && ZW_OWN.find((e) => e.id === id)) || null; }
function exVideo(ex) {
  const own = (kneeCfg().video || {})[ex.id];
  return own || `https://www.youtube.com/results?search_query=${ex.en.toLowerCase().replace(/[^a-z0-9]+/g, '+').replace(/^\+|\+$/g, '')}+tutorial`;
}
function routines() { return kneeCfg().routines || KNEE_ROUTINES; }
function routineById(id) { return routines().find((r) => r.id === id) || null; }
function extraSide() { return kneeCfg().side === 'links' ? 'L' : 'R'; }
function sideName(s) { return s === 'L' ? 'Links' : s === 'R' ? 'Rechts' : ''; }
/* Dosis einer Übung als Text (links/rechts getrennt) */
function doseText(ex, it = {}) {
  const d = ex.d;
  if (d.t === 'info') return ex.dose;
  const sets = it.sets || d.sets || 1;
  const val = d.t === 'time' ? it.sec || d.sec : it.reps || d.reps;
  const ut = d.t === 'time' ? ' Sek.' : '';
  const xs = extraSide();
  const extra = d.s === 2 && !d.noX ? (d.t === 'time' ? kneeCfg().extraSec : kneeCfg().extraReps) : 0;
  const pre = sets > 1 ? `${sets} × ` : '';
  const one = (v) => (d.t === 'reps' && !pre ? `${v}×` : d.t === 'time' && v >= 120 && v % 60 === 0 ? `${v / 60} Min.` : `${v}${ut}`);
  if (d.s === 2 && extra) {
    const l = xs === 'R' ? val : val + extra, r = xs === 'R' ? val + extra : val;
    return `${pre}${one(l)} links / ${one(r)} rechts`;
  }
  if (d.s === 2) return `${pre}${one(val)} je ${ex.sideNames ? 'Richtung' : 'Seite'}`;
  if (d.alt) return `${pre}${one(val)} je Seite (abwechselnd)`;
  return `${pre}${one(val)}`;
}
function buildSteps(rt, opts = {}) {
  const steps = [];
  const cfg = kneeCfg();
  rt.items.forEach((it, idx) => {
    if (opts.short && it.skipShort) return;
    if (it.opt && !opts.withOpt) return;
    const ex = exById(it.i);
    if (!ex || ex.d.t === 'info') return;
    const d = ex.d;
    const sides = d.s === 2 ? ['L', 'R'] : [null];
    const sets = it.sets || d.sets || 1;
    const base = d.t === 'time' ? (opts.short && it.short ? it.short : it.sec || d.sec) : it.reps || d.reps;
    for (let s = 0; s < sets; s++) {
      for (const side of sides) {
        const extra = side && !d.noX && side === extraSide();
        const val = d.t === 'time' ? base + (extra ? cfg.extraSec : 0) : base + (extra ? cfg.extraReps : 0);
        steps.push({ ex: ex.id, idx, grp: it.grp || null, side, set: s + 1, sets, type: d.t, sec: d.t === 'time' ? val : null, reps: d.t === 'reps' ? val : null, label: ex.labels ? ex.labels[s] || null : null, alt: !!d.alt, sideName: ex.sideNames ? ex.sideNames[side === 'L' ? 0 : 1] : null, rest: it.rest || d.rest || null });
      }
    }
  });
  return steps;
}
function stepGap(a, b) { return b.set !== a.set && b.rest ? b.rest : 5; } // Pause im Timer zwischen Sätzen derselben Übung
function stepSec(st) { return st.type === 'time' ? st.sec : Math.max(20, Math.round(st.reps * (st.alt ? 5 : 3.5))); }
function routineSec(rt, opts = {}) {
  const trans = kneeCfg().trans || 10;
  let s = 0, prev = null;
  for (const st of buildSteps(rt, opts)) { s += stepSec(st) + (prev == null ? 0 : prev.ex === st.ex ? stepGap(prev, st) : trans); prev = st; }
  return s;
}
function painValues(n, end = todayKey()) {
  const out = [];
  for (const k of rangeKeys(n, end)) {
    const d = peekDay(k);
    if (!d) continue;
    if (d.knee && d.knee.am != null) out.push({ k, v: d.knee.am, src: 'Morgen' });
    for (const t of d.trainings || []) if (trainType(t).run && t.pain != null) out.push({ k, v: t.pain, src: 'Lauf' });
    if (d.knee && d.knee.str && d.knee.str.pain != null) out.push({ k, v: d.knee.str.pain, src: 'Kraft' });
  }
  return out;
}
function kneeTests() { return (S.knee.tests || []).slice().sort((a, b) => a.date.localeCompare(b.date)); }
function lastTest() { const t = kneeTests(); return t.length ? t[t.length - 1] : null; }
function testDue() {
  const interval = (kneeCfg().phase || 1) >= 3 ? 7 : 14;
  const t = lastTest();
  if (!t) return { due: true, days: null, next: todayKey(), interval };
  const n = daysBetween(t.date, todayKey());
  return { due: n >= interval, days: n, next: addDays(t.date, interval), interval };
}
/* Phasenwechsel nur, wenn Step-down stabil und Schmerz ≤ 3 in den letzten 2 Wochen */
function phaseGate() {
  const cfg = kneeCfg();
  const cur = cfg.phase || 1;
  if (cur >= 3) return null;
  const w = kneeWeek();
  const plan = plannedPhase(w - (cfg.ext || 0));
  if (plan <= cur) return null;
  const reasons = [];
  let ready = true;
  const t = lastTest();
  const fresh = t && daysBetween(t.date, todayKey()) <= 14;
  if (!fresh) { ready = false; reasons.push('Step-down-Test der letzten 2 Wochen fehlt'); }
  else if (!(t.sdR === true && t.sdL === true)) { ready = false; reasons.push('Step-down: Knie bleibt noch nicht auf beiden Seiten stabil über dem Fuß'); }
  const pains = painValues(14);
  const maxP = pains.length ? Math.max(...pains.map((p) => p.v)) : null;
  if (!pains.length) { ready = false; reasons.push('Keine Schmerzwerte aus den letzten 2 Wochen'); }
  else if (maxP > 3) { ready = false; reasons.push(`Schmerz in den letzten 2 Wochen bis ${maxP}/10 (nötig: alle ≤ 3)`); }
  return { from: cur, to: cur + 1, ready, reasons, maxP };
}
function runsIn(keys) {
  const out = [];
  for (const k of keys) { const d = peekDay(k); if (!d) continue; for (const t of d.trainings || []) if (trainType(t).run) out.push({ k, t }); }
  return out;
}
function kmWeek(ws) { return runsIn(weekKeys(ws)).reduce((a, r) => a + (Number(r.t.km) || 0), 0); }
function runAdvice(k) {
  const runs = runsIn([addDays(k, -1)]);
  if (!runs.length) return null;
  const am = kneeAm(k);
  const rp = Math.max(...runs.map((r) => r.t.pain ?? 0));
  if (am == null) return { ask: true, rp };
  if (am > 3 || am > rp) return { warn: true, am, rp, text: `Knie heute ${am}/10${am > rp ? `, schlechter als beim Lauf (${rp}/10)` : ''} → nächsten Lauf kürzer und lockerer oder Pause.` };
  return { ok: true, am, rp, text: `Knie heute ${am}/10 und nicht schlechter als nach dem Lauf – der Umfang passt.` };
}
function redFlags(k) {
  const out = [];
  const kn = kneeDay(peekDay(k));
  if (kn.am != null && kn.am > 3) out.push(`Morgenschmerz ${kn.am}/10`);
  for (const r of runsIn([k, addDays(k, -1)])) if ((r.t.pain || 0) > 3) out.push(`Schmerz beim Lauf ${r.t.pain}/10`);
  for (const f of kn.flags || []) out.push(f);
  const vals = [];
  for (let i = 0; i < 6 && vals.length < 3; i++) { const v = kneeAm(addDays(k, -i)); if (v != null) vals.push(v); }
  if (vals.length >= 3 && vals[0] > vals[1] && vals[1] > vals[2] && vals[0] >= 3) out.push('zunehmende Schmerzen');
  return [...new Set(out)];
}
function insolesInfo(k) {
  const p = kneeCfg().insoles;
  if (!p) return null;
  const n = daysBetween(p, k);
  if (n < 0) return { before: true, p, inDays: -n };
  const target = Math.min(10, 1.5 + n);
  const worn = kneeDay(peekDay(k)).ins ?? null;
  return { n: n + 1, target, worn, runEarliest: addDays(p, 7), runFrom: addDays(p, 14), runOk: k >= addDays(p, 14), full: target >= 10 };
}
function kneeQuota(ws) {
  let kraft = 0, runs = 0, mob = 0, lang = 0;
  for (const k of weekKeys(ws)) { const dd = dayDone(k); if (dd.kraft) kraft++; runs += dd.run; if (dd.mob) mob++; if (dd.lang) lang++; }
  return { kraft, kraftGoal: kneePhase().perWeek, runs, runsGoal: 2, mob, mobGoal: 7, lang, langGoal: 2 };
}
function mobStreak() {
  let k = todayKey(), n = 0;
  if (!dayDone(k).mob) k = addDays(k, -1);
  while (dayDone(k).mob) { n++; k = addDays(k, -1); if (n > 400) break; }
  return n;
}
function strengthSessions(n = 30) {
  const out = [];
  for (const k of rangeKeys(n)) { const d = peekDay(k); if (d && d.knee && d.knee.str && d.knee.str.done) out.push({ k, s: d.knee.str }); }
  return out;
}
function strengthProg(exId, planSets) {
  const ses = strengthSessions(28).filter((x) => x.s.ex && x.s.ex[exId]).slice(-2);
  if (ses.length < 2) return null;
  const ok = ses.every((x) => { const e = x.s.ex[exId]; return e.sets && e.sets.length >= planSets && e.sets.every(Boolean) && (x.s.pain ?? 0) <= 2; });
  if (!ok) return null;
  const ex = exById(exId);
  return (ex && ex.prog) || 'Nächste Stufe: mehr Wiederholungen, stärkeres Band, einbeinig oder mit Gewicht.';
}
function stretchProg() {
  const rates = {};
  for (const k of rangeKeys(14)) for (const s of kneeSessions(peekDay(k))) for (const [ex, v] of Object.entries(s.rate || {})) (rates[ex] = rates[ex] || []).push({ k, v });
  return Object.entries(rates).filter(([, v]) => v.length >= 3 && v.every((x) => x.v < 5) && daysBetween(v[0].k, todayKey()) >= 10).map(([ex]) => ex);
}
function milestones() {
  const w = kneeWeek();
  const tests = kneeTests();
  return KNEE_MILESTONES.map((m) => {
    let done = false;
    if (m.id === 'sd') { const ok = tests.find((x) => x.sdR === true && x.sdL === true); done = !!ok; m = { ...m, doneDate: ok ? ok.date : null }; }
    if (m.id === 'run') { const rs = runsIn(rangeKeys(14)); done = rs.length >= 2 && rs.every((r) => (r.t.pain ?? 0) <= 2); }
    const due = m.week ? w >= m.week[0] : todayKey() >= addDays(m.date, -21);
    return { ...m, done, due };
  });
}
function kneePlanItemsToday(k) {
  const i = weekday(k), tpl = weekTpl(i);
  const out = [{ kind: 'mob', n: 'Täglich Mobilität', r: 'taeglich' }];
  out.push({ kind: 'kraft', n: `Knie-Athletik ${athType(k)} (${kneePhase().n})` });
  if (tpl.lauf) { out.push({ kind: 'vorlauf', n: 'Vor dem Lauf (5 Min.)', r: 'vorlauf' }); out.push({ kind: 'lauf', n: 'Lockerer Lauf' }); }
  if (tpl.lang) out.push({ kind: 'lang', n: 'Lange Routine (abends)', r: 'lang' });
  return out;
}

/* ============================================================
   KÖRPER, BLUTWERTE, EINKAUF, TERMINE
   ============================================================ */
function weightSeries(field = 'weight') {
  return Object.keys(S.days).sort().filter((k) => S.days[k].health && S.days[k].health[field] != null).map((k) => ({ k, v: S.days[k].health[field] }));
}
function bloodMarkers() {
  const ov = S.blood.markers || {};
  return BLOOD_MARKERS.map((m) => ({ ...m, ...(ov[m.id] || {}) })).concat((S.blood.custom || []).map((m) => ({ ...m, custom: true }))).filter((m) => !m.hidden);
}
function bloodStatus(m, v) { if (v == null) return 'none'; if (m.lo != null && v < m.lo) return 'low'; if (m.hi != null && v > m.hi) return 'high'; return 'ok'; }
function bloodSeries(id) { return (S.blood.entries || []).filter((e) => e.v && e.v[id] != null).sort((a, b) => a.date.localeCompare(b.date)).map((e) => ({ date: e.date, v: e.v[id] })); }
/* ---------- Einkauf ---------- */
function shopDefs() {
  const out = [];
  for (const list of ['buy', 'home']) for (const [cat, n, q, store, tip, old] of SHOP_DEFAULT[list]) out.push({ sid: (list === 'buy' ? 'b:' : 'h:') + (old || n), n, old: old || null, q: q || '', cat, store: store || CAT_STORE[cat] || 'other', tip: tip || '', list });
  return out;
}
let shopDefMap = null;
function shopDef(sid) {
  if (!shopDefMap) { shopDefMap = {}; for (const d of shopDefs()) shopDefMap[d.sid] = d; }
  return sid ? shopDefMap[sid] || null : null;
}
function shopNew(d, list) {
  const it = { id: uid(), n: d.n, q: d.q, cat: d.cat, store: d.store, tip: d.tip, list: list || d.list, sid: d.sid };
  const m = SHOP_INV[d.sid];
  if (m) it.inv = { base: it.list === 'home' ? m.buy * m.g : 0, since: Date.now() };
  return it;
}
function shopDefault() { return { items: shopDefs().map((d) => shopNew(d)) }; }
function shopReload() {
  for (const d of shopDefs()) {
    if (d.list !== 'buy') continue;
    const it = S.shop.items.find((x) => x.sid === d.sid);
    if (it) it.list = 'buy';
    else S.shop.items.push(shopNew(d, 'buy'));
  }
}
function storeById(id) { return SHOP_STORES.find((s) => s.id === id) || SHOP_STORES.find((s) => s.id === 'other'); }
function itemStore(it) {
  if (it.store && SHOP_STORES.some((s) => s.id === it.store)) return it.store;
  const d = shopDef(it.sid);
  return d ? d.store : CAT_STORE[it.cat] || 'other';
}
function itemTip(it) { if (it.tip != null) return it.tip; const d = shopDef(it.sid); return d ? d.tip : ''; }
/* Karte: sucht die nächste Filiale der Kette über den Standort des iPhones (keine Adresse in der App) */
function storeMapUrl(id) { const s = storeById(id); return s.q ? 'https://maps.apple.com/?q=' + encodeURIComponent(s.q) : null; }
/* Läden der offenen Einkaufsliste, sortiert nach Anzahl */
function shopStoreCounts(list = 'buy') {
  const c = {};
  for (const it of (S.shop && S.shop.items) || []) if (it.list === list) { const s = itemStore(it); c[s] = (c[s] || 0) + 1; }
  return SHOP_STORES.filter((s) => c[s.id]).map((s) => ({ ...s, count: c[s.id] })).sort((x, y) => y.count - x.count);
}
/* ============================================================
   VORRAT, DER MITZÄHLT (nur Lebensmittel)
   Bestand = Menge beim Einkauf (base, Zeitpunkt since) minus alles,
   was seitdem abgehakt oder eingetragen wurde. Wird immer neu
   berechnet, dadurch stimmen auch Rückgängig, Ändern und Löschen.
   ============================================================ */
function invMeta(it) {
  if (!it || (it.inv && it.inv.off)) return null;
  const own = it.inv && Array.isArray(it.inv.f) && it.inv.f.length ? it.inv : null;
  const src = own || SHOP_INV[it.sid];
  if (!src) return null;
  const foods = new Set(src.f);
  if (src.re) { const re = new RegExp(src.re, 'i'); for (const f of Object.values(FOOD)) if (re.test(f.n)) foods.add(f.id); }
  const buy = it.inv && it.inv.buy > 0 ? it.inv.buy : src.buy;
  return { foods, u: src.u, g: src.g, buy, defBuy: src.buy, own: !!own };
}
function invTs(k, hm) { const [h, m] = String(hm).split(':').map(Number); const d = parseKey(k); d.setHours(h || 0, m || 0, 0, 0); return d.getTime(); }
/* Verbrauch je Tag: abgehakte Standardposten und Einträge mit Zeitpunkt (falls bekannt) */
function invEvents(from, to) {
  const out = [];
  for (let k = from; k <= to; k = addDays(k, 1)) {
    const d = S.days[k];
    if (!d) continue;
    const variant = dayVariant(k);
    for (const { it } of allPlanItems()) {
      if (!d.checks || !d.checks[it.id]) continue;
      out.push({ k, fid: itemFoodId(it, d), g: itemGrams(it, d, variant), ts: d.ct && d.ct[it.id] ? invTs(k, d.ct[it.id]) : null });
    }
    for (const e of d.entries || []) out.push({ k, fid: e.food, g: e.g || 0, ts: e.t || null });
  }
  return out;
}
/* Geplanter Tagesverbrauch laut Standardtag (Durchschnitt über die Wochentage) */
function invPlanRate(foods) {
  let sum = 0;
  const plan = allPlanItems().filter((x) => x.block && !x.it.opt);
  for (let wd = 0; wd < 7; wd++) {
    const variant = (S.settings.weekPlan && S.settings.weekPlan[wd]) || 'prep';
    for (const { it } of plan) {
      if (!itemInVariant(it, variant)) continue;
      const fids = it.choice ? it.choice : [it.food];
      const hit = fids.filter((f) => foods.has(f));
      if (!hit.length) continue;
      const fid = foods.has(it.food) ? it.food : hit[0];
      sum += itemAmount(it, null, variant) * unitG(FOOD[fid], it.u) * (hit.length / fids.length);
    }
  }
  return sum / 7;
}
let invCache = { v: -1, map: null };
function invState() {
  if (invCache.v === calcVersion && invCache.map) return invCache.map;
  const map = {};
  const list = ((S.shop && S.shop.items) || []).map((it) => ({ it, m: invMeta(it) })).filter((x) => x.m);
  if (list.length) {
    const today = todayKey(), win = addDays(today, -14), now = Date.now();
    let from = win;
    for (const { it } of list) { const sk = dkey(new Date((it.inv && it.inv.since) || now)); if (sk < from) from = sk; }
    if (from < addDays(today, -400)) from = addDays(today, -400);
    const events = invEvents(from, today);
    let logged = 0;
    for (let k = win; k < today; k = addDays(k, 1)) if (hasData(S.days[k])) logged++;
    for (const { it, m } of list) {
      const since = (it.inv && it.inv.since) || now, sk = dkey(new Date(since)), sinceMin = Math.floor(since / 60000) * 60000;
      let used = 0, recent = 0;
      for (const e of events) {
        if (!m.foods.has(e.fid)) continue;
        if (e.k >= win && e.k < today) recent += e.g;
        if (e.k < sk || (e.k === sk && e.ts != null && e.ts < sinceMin)) continue;
        used += e.g;
      }
      const base = (it.inv && it.inv.base) || 0;
      const stock = Math.max(0, base - used);
      const rate = Math.max(invPlanRate(m.foods), logged >= 3 ? recent / logged : 0);
      map[it.id] = { m, base, used, stock, rate, days: rate > 0 ? stock / rate : null };
    }
  }
  invCache = { v: calcVersion, map };
  return map;
}
function invLow(s) { return !!s && ((s.days != null && s.days <= INV_DAYS) || (s.stock <= 0 && s.used > 0)); }
/* Menge in der Anzeige-Einheit, z. B. „18 Stück“, „1,5 kg“, „4 Becher (500 g)“ */
function invAmt(m, grams, paren = true) {
  if (m.u === 'g' || m.u === 'ml') {
    const big = m.u === 'g' ? 'kg' : 'l';
    return grams >= 1000 ? `${fmt(grams / 1000, grams % 1000 ? 1 : 0)} ${big}` : `${fmt(grams)} ${m.u}`;
  }
  const n = grams / m.g, r = n < 10 ? Math.round(n * 10) / 10 : Math.round(n);
  return amountLabel(r, m.u, !paren);
}
function invDaysText(s) {
  if (!s) return '';
  if (s.stock <= 0) return 'aufgebraucht';
  if (s.days == null) return '';
  if (s.days < 1) return 'reicht nur noch heute';
  const n = Math.floor(s.days);
  return n === 1 ? 'reicht noch 1 Tag' : `reicht noch ${n > 60 ? 'über 60' : n} Tage`;
}
/* Vorrat für Artikel ohne Angabe anlegen (Update, Import): zuhause = Standardmenge, sonst leer */
function invInit(since) {
  if (!S.shop || !Array.isArray(S.shop.items)) return;
  for (const it of S.shop.items) {
    if (it.inv && it.inv.since) continue;
    const m = SHOP_INV[it.sid];
    if (!m) continue;
    it.inv = { ...(it.inv || {}), base: it.list === 'home' ? m.buy * m.g : 0, since };
  }
  markDirty('shop');
}
/* Fast leer → auf die Einkaufsliste; wieder genug (z. B. Bestand korrigiert) → zurück nach Zuhause */
function invSync() {
  if (!S.shop || !Array.isArray(S.shop.items)) return;
  const st = invState();
  const moved = [];
  let changed = false;
  for (const it of S.shop.items) {
    const s = st[it.id];
    if (!s) continue;
    const low = invLow(s);
    if (it.list === 'home' && low) { it.list = 'buy'; it.auto = true; moved.push(it.n); changed = true; }
    else if (it.list === 'buy' && it.auto && !low) { it.list = 'home'; it.auto = false; changed = true; }
  }
  if (changed) markDirty('shop');
  if (moved.length) {
    const msg = `Auf die Einkaufsliste: ${moved.slice(0, 3).join(', ')}${moved.length > 3 ? ` und ${moved.length - 3} weitere` : ''}`;
    const t = $('#toast');
    setTimeout(() => toast(msg), t && t.classList.contains('show') ? 2800 : 0);
  }
}
function todosOpen() { return (S.settings.todos || []).filter((t) => !t.done); }
function todosDue(days = 7) {
  const today = todayKey();
  return todosOpen().filter((t) => t.date && daysBetween(today, t.date) <= days).sort((a, b) => a.date.localeCompare(b.date));
}
function suppQuota(keys) {
  let taken = 0, planned = 0;
  for (const k of keys) {
    const d = peekDay(k);
    if (!d || !Object.keys(d.checks || {}).length) continue;
    const variant = dayVariant(k);
    for (const { it } of dailySupps()) { if (!itemInVariant(it, variant)) continue; planned++; if (d.checks[it.id]) taken++; }
  }
  return planned ? { taken, planned, pct: (taken / planned) * 100 } : null;
}

/* ============================================================
   WOCHENRÜCKBLICK
   ============================================================ */
function weekReview(ws) {
  const today = todayKey();
  const keys = weekKeys(ws), past = keys.filter((k) => k <= today);
  const prev = weekKeys(addDays(ws, -7));
  const val = (ks, f) => ks.map((k) => { const d = peekDay(k); return d ? f(d) : null; }).filter((v) => v != null);
  const avg = (ks, f) => mean(val(ks, f));
  const r = { ws, keys, past, complete: addDays(ws, 6) < today || (addDays(ws, 6) === today && new Date().getHours() >= 17) };
  r.skin = avg(past, (d) => d.skin && d.skin.score); r.skinPrev = avg(prev, (d) => d.skin && d.skin.score);
  const wAll = weightSeries();
  const wWeek = wAll.filter((x) => x.k >= ws && x.k <= addDays(ws, 6));
  const wBefore = wAll.filter((x) => x.k < ws);
  r.weight = wWeek.length ? wWeek[wWeek.length - 1].v : null;
  r.weightPrev = wBefore.length ? wBefore[wBefore.length - 1].v : null;
  r.weightStart = wAll.length ? wAll[0].v : null;
  const trs = [];
  for (const k of past) for (const t of (peekDay(k) || {}).trainings || []) if (!trainType(t).light || t.type === 'Knie-Kraft') trs.push(t);
  r.trainings = trs.filter((t) => !trainType(t).light);
  r.trainMin = r.trainings.reduce((a, t) => a + (Number(t.dur) || 0), 0);
  r.gymPlanned = keys.filter((k, i) => weekTpl(i).gym).length;
  r.gymDone = r.trainings.filter((t) => trainType(t).gym || ['Gym (frei)', 'Push', 'Pull', 'Beine'].includes(trainType(t).id)).length; // auch Krafttraining von Garmin
  r.sauna = keys.reduce((a, k) => a + saunaMin(peekDay(k)), 0); r.saunaGoal = Number(S.settings.sauna.goal) || 60;
  const caf = past.filter((k) => peekDay(k)).map((k) => cafInfo(k));
  r.cafAvg = caf.length ? mean(caf.map((c) => c.total)) : null;
  r.cafLateDays = caf.filter((c) => c.late.length).length;
  r.lightDays = past.filter((k) => { const d = peekDay(k); return d && d.habits && d.habits.licht_morgen; }).length;
  r.daysWithData = past.filter((k) => peekDay(k)).length;
  r.supp = suppQuota(past);
  const hAvg = (ks, f) => avg(ks, (d) => (d.health ? d.health[f] : null));
  r.sleep = hAvg(past, 'sleepScore'); r.sleepPrev = hAvg(prev, 'sleepScore');
  r.hrv = hAvg(past, 'hrv'); r.hrvPrev = hAvg(prev, 'hrv');
  r.rhr = hAvg(past, 'rhr'); r.rhrPrev = hAvg(prev, 'rhr');
  const lk = past.filter((k) => hasData(peekDay(k)));
  const flags = lk.map((k) => dayFlags(k));
  r.nutriDays = lk.length;
  r.nutriScore = mean(flags.map((f) => f.score).filter((v) => v != null));
  r.nutriGoalDays = flags.filter((f) => f.nutri).length;
  r.coverage = lk.length ? mean(lk.map((k) => { const e = evaluate(k); return (MICRO_KEYS.filter((key) => ['ok', 'high'].includes(e.metrics[key].state)).length / MICRO_KEYS.length) * 100; })) : null;
  r.q = kneeQuota(ws);
  const pains = painValues(7, addDays(ws, 6)).filter((p) => p.k >= ws);
  r.painAm = mean(pains.filter((p) => p.src === 'Morgen').map((p) => p.v));
  r.painRun = mean(pains.filter((p) => p.src === 'Lauf').map((p) => p.v));
  r.painMax = pains.length ? Math.max(...pains.map((p) => p.v)) : null;
  r.km = kmWeek(ws); r.kmPrev = kmWeek(addDays(ws, -7));
  r.tests = kneeTests().filter((t) => t.date >= ws && t.date <= addDays(ws, 6));
  r.flags = [...new Set(past.flatMap((k) => redFlags(k)))];
  /* Lief gut / Verbessern */
  const good = [], bad = [];
  if (r.trainings.length) good.push(`${r.trainings.length} Trainingseinheiten (${fmt(r.trainMin)} Min.)`);
  if (r.gymPlanned && r.gymDone < r.gymPlanned && r.complete) bad.push(`Gym: ${r.gymDone} von ${r.gymPlanned} geplanten Einheiten`);
  if (r.sauna >= r.saunaGoal) good.push(`Sauna-Ziel erreicht: ${fmt(r.sauna)} Min.`);
  else if (r.complete || r.sauna > 0) bad.push(`Sauna: ${fmt(r.sauna)} von ${fmt(r.saunaGoal)} Min. – am besten direkt nach dem Training`);
  if (r.lightDays >= 5) good.push(`Morgenlicht an ${r.lightDays} Tagen`);
  else if (r.daysWithData >= 3) bad.push(`Morgenlicht nur an ${r.lightDays} von ${r.daysWithData} Tagen – 10–30 Min. raus nach dem Aufstehen`);
  if (r.cafAvg != null && r.cafAvg > 0 && !r.cafLateDays) good.push(`Kein Koffein nach dem Koffein-Stopp (${cafStopText()})`);
  if (r.cafLateDays) bad.push(`Koffein nach dem Koffein-Stopp (${cafStopText()}) an ${r.cafLateDays} ${r.cafLateDays === 1 ? 'Tag' : 'Tagen'}`);
  if (r.supp && r.supp.pct >= 90) good.push(`Supplements zu ${fmt(r.supp.pct)} % genommen`);
  else if (r.supp && r.supp.pct < 80) bad.push(`Supplement-Quote ${fmt(r.supp.pct)} %`);
  if (r.sleep != null && (r.sleep >= 80 || (r.sleepPrev != null && r.sleep - r.sleepPrev >= 3))) good.push(`Ø Sleep Score ${fmt(r.sleep)}${r.sleepPrev != null ? ` (${r.sleep - r.sleepPrev >= 0 ? '+' : ''}${fmt(r.sleep - r.sleepPrev)} zur Vorwoche)` : ''}`);
  else if (r.sleep != null && r.sleep < 70) bad.push(`Ø Sleep Score nur ${fmt(r.sleep)} – Koffein-Ende, Bildschirmzeit und letzte Mahlzeit prüfen`);
  if (r.skin != null && r.skinPrev != null) { const dd = r.skin - r.skinPrev; if (dd >= 0.5) good.push(`Hautbild besser: Ø ${fmt(r.skin, 1)} (+${fmt(dd, 1)})`); else if (dd <= -0.5) bad.push(`Hautbild schlechter: Ø ${fmt(r.skin, 1)} (${fmt(dd, 1)})`); }
  if (r.nutriDays) { if (r.nutriGoalDays >= Math.ceil(r.nutriDays * 0.7)) good.push(`Ernährungsziele an ${r.nutriGoalDays} von ${r.nutriDays} Tagen erreicht`); else bad.push(`Ernährungsziele nur an ${r.nutriGoalDays} von ${r.nutriDays} Tagen`); }
  if (r.q.mob >= 6) good.push(`Mobilität an ${r.q.mob} Tagen`);
  else if (r.daysWithData >= 3) bad.push(`Mobilität an ${r.q.mob} von 7 Tagen`);
  if (r.q.kraft >= r.q.kraftGoal) good.push(`Knie-Kraft ${r.q.kraft}/${r.q.kraftGoal}`);
  else if (r.complete) bad.push(`Knie-Kraft ${r.q.kraft}/${r.q.kraftGoal}`);
  if (r.q.runs >= 2 && (r.painRun == null || r.painRun <= 3)) good.push(`${r.q.runs} Läufe, ${fmt(r.km, 1)} km${r.painRun != null ? `, Ø Schmerz ${fmt(r.painRun, 1)}` : ''}`);
  if (r.kmPrev > 0 && r.km > r.kmPrev * 1.1) bad.push(`Laufumfang +${fmt((r.km / r.kmPrev - 1) * 100)} % zur Vorwoche – max. 10 %`);
  if (r.painMax != null && r.painMax > 3) bad.push(`Knieschmerz bis ${r.painMax}/10 – Schmerzregel beachten`);
  if (r.flags.length) bad.unshift(`Warnzeichen: ${r.flags.join(', ')}`);
  if (lk.length) {
    const evs = lk.map((k) => evaluate(k));
    const gaps = [];
    for (const key of MICRO_KEYS.concat(['fib', 'p'])) {
      const a = mean(evs.map((e) => e.metrics[key].v)), t = targetFor(key);
      if (t.lo && a < t.lo * 0.85) gaps.push({ key, pct: a / t.lo });
    }
    gaps.sort((x, y) => x.pct - y.pct).slice(0, 2).forEach((g) => { const s = suggestFood(g.key, targetFor(g.key).lo * (1 - g.pct)); bad.push(`${metaOf(g.key).n} im Schnitt ${fmt(g.pct * 100)} %${s ? ` – z. B. + ${friendlyTipAmount(s.food, s.g)} täglich` : ''}`); });
  }
  r.good = good; r.bad = bad;
  return r;
}
function reviewWeeks() {
  const ks = Object.keys(S.days).sort();
  const first = ks.length ? weekStart(ks[0]) : weekStart(todayKey());
  const out = [];
  for (let w = weekStart(todayKey()); w >= first; w = addDays(w, -7)) out.push(w);
  return out;
}

/* ============================================================
   FOTOS (eigene IndexedDB, damit große Bilder nicht beim Start geladen werden)
   ============================================================ */
const PhotoDB = {
  db: null, ok: true,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      if (!('indexedDB' in window)) { this.ok = false; return rej(new Error('kein IndexedDB')); }
      const r = indexedDB.open('protokoll-fotos', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('p');
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => { this.ok = false; rej(r.error); };
    });
  },
  async req(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const tx = db.transaction('p', mode);
      const rq = fn(tx.objectStore('p'));
      let out;
      if (rq) rq.onsuccess = () => { out = rq.result; };
      tx.oncomplete = () => res(out);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error || new Error('abgebrochen'));
    });
  },
  put(key, rec) { return this.req('readwrite', (st) => st.put(rec, key)); },
  get(key) { return this.req('readonly', (st) => st.get(key)); },
  del(key) { return this.req('readwrite', (st) => st.delete(key)); },
  keys() { return this.req('readonly', (st) => st.getAllKeys()); },
  clear() { return this.req('readwrite', (st) => st.clear()); },
};
const photoIdx = { keys: [], loaded: false };
const photoUrls = new Map();
async function loadPhotoIndex() {
  try { photoIdx.keys = (await PhotoDB.keys()) || []; } catch (e) { photoIdx.keys = []; }
  photoIdx.loaded = true;
}
function photoKey(ws, angle) { return `${ws}|${angle}`; }
function photosOfWeek(ws) { return PHOTO_ANGLES.filter((a) => photoIdx.keys.includes(photoKey(ws, a.id))).map((a) => a.id); }
function photoWeeks() { return [...new Set(photoIdx.keys.map((k) => k.split('|')[0]))].sort().reverse(); }
async function compressImage(file, maxEdge, q) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Bild nicht lesbar')); i.src = url; });
    const sc = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * sc)), h = Math.max(1, Math.round(img.naturalHeight * sc));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Komprimieren fehlgeschlagen'))), 'image/jpeg', q));
    return { blob, w, h };
  } finally { URL.revokeObjectURL(url); }
}
async function savePhoto(ws, angle, file, date) {
  const full = await compressImage(file, 1600, 0.85);
  const thumb = await compressImage(file, 420, 0.78);
  const rec = { week: ws, angle, date: date || todayKey(), w: full.w, h: full.h, type: 'image/jpeg', full: await full.blob.arrayBuffer(), thumb: await thumb.blob.arrayBuffer() };
  const key = photoKey(ws, angle);
  await PhotoDB.put(key, rec);
  dropPhotoUrl(key);
  if (!photoIdx.keys.includes(key)) photoIdx.keys.push(key);
  return rec;
}
function dropPhotoUrl(key) { for (const sfx of [':t', ':f']) { const u = photoUrls.get(key + sfx); if (u) { URL.revokeObjectURL(u); photoUrls.delete(key + sfx); } } }
async function photoUrl(key, full = false) {
  const ck = key + (full ? ':f' : ':t');
  if (photoUrls.has(ck)) return photoUrls.get(ck);
  const rec = await PhotoDB.get(key);
  if (!rec) return null;
  const u = URL.createObjectURL(new Blob([full ? rec.full : rec.thumb || rec.full], { type: rec.type || 'image/jpeg' }));
  photoUrls.set(ck, u);
  return u;
}
async function deletePhoto(key) { await PhotoDB.del(key); dropPhotoUrl(key); photoIdx.keys = photoIdx.keys.filter((k) => k !== key); }
/* Fotos in gerenderte Platzhalter laden */
function hydratePhotos(root = document) {
  for (const img of $$('img[data-photo]', root)) {
    if (img.dataset.done) continue;
    img.dataset.done = '1';
    photoUrl(img.dataset.photo, img.dataset.full === '1').then((u) => { if (u) img.src = u; else img.closest('.ph') && img.closest('.ph').classList.add('is-empty'); }).catch(() => {});
  }
}

/* ---------- ZIP (ohne Kompression) ---------- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function dosTime(d) { return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }; }
function zipStore(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), { time, date } = dosTime(f.date || new Date()), size = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true);
    ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + size;
  }
  const cd = central.reduce((a, p) => a + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cd, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}
async function zipRead(buf) {
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Keine ZIP-Datei');
  const n = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder(), out = [];
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nlen));
    const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
    let data = new Uint8Array(buf.slice(start, start + csize));
    p += 46 + nlen + xlen + clen;
    if (method === 8) {
      if (typeof DecompressionStream === 'undefined') throw new Error('Komprimierte ZIP-Dateien werden hier nicht unterstützt');
      const ds = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      data = new Uint8Array(await new Response(ds).arrayBuffer());
    } else if (method !== 0) continue;
    out.push({ name, data });
  }
  return out;
}
async function exportPhotosZip() {
  const keys = (await PhotoDB.keys()) || [];
  const files = [], manifest = [];
  for (const key of keys.sort()) {
    const rec = await PhotoDB.get(key);
    if (!rec) continue;
    const file = `fotos/${rec.date || rec.week}_${rec.angle}.jpg`;
    files.push({ name: file, data: new Uint8Array(rec.full), date: parseKey(rec.date || rec.week) });
    manifest.push({ file, week: rec.week, angle: rec.angle, date: rec.date, w: rec.w, h: rec.h });
  }
  files.push({ name: 'fotos.json', data: new TextEncoder().encode(JSON.stringify({ app: 'protokoll-fotos', v: 1, photos: manifest }, null, 1)) });
  return { blob: zipStore(files), n: manifest.length };
}
async function importPhotosZip(buf) {
  const entries = await zipRead(buf);
  const man = entries.find((e) => e.name === 'fotos.json');
  let list = [];
  if (man) { try { list = JSON.parse(new TextDecoder().decode(man.data)).photos || []; } catch (e) { list = []; } }
  if (!list.length) {
    for (const e of entries) { const m = e.name.match(/(\d{4}-\d{2}-\d{2})_([a-z]+)\.jpe?g$/i); if (m && PHOTO_ANGLES.some((a) => a.id === m[2])) list.push({ file: e.name, week: weekStart(m[1]), date: m[1], angle: m[2] }); }
  }
  let n = 0;
  for (const p of list) {
    const e = entries.find((x) => x.name === p.file);
    if (!e) continue;
    const blob = new Blob([e.data], { type: 'image/jpeg' });
    const thumb = await compressImage(blob, 420, 0.78);
    const key = photoKey(p.week, p.angle);
    await PhotoDB.put(key, { week: p.week, angle: p.angle, date: p.date, w: p.w || null, h: p.h || null, type: 'image/jpeg', full: e.data.buffer.slice(e.data.byteOffset, e.data.byteOffset + e.data.byteLength), thumb: await thumb.blob.arrayBuffer() });
    dropPhotoUrl(key);
    n++;
  }
  await loadPhotoIndex();
  return n;
}
async function shareFile(blob, name, title) {
  let file = null;
  try { file = new File([blob], name, { type: blob.type }); } catch (e) { file = null; }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'abort'; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
  return 'downloaded';
}
