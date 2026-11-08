/* ============================================================
   KERN: Hilfsfunktionen, Speicher, Zustand, Berechnungen
   ============================================================ */

/* ---------- Hilfsfunktionen ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clone = (o) => JSON.parse(JSON.stringify(o));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function fmt(v, d = 0) {
  if (v == null || !isFinite(v)) return '–';
  const r = Math.round(v * 10 ** d) / 10 ** d;
  return (Object.is(r, -0) ? 0 : r).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function parseNum(s) {
  if (s == null) return null;
  const t = String(s).trim().replace(/\s/g, '').replace(',', '.');
  if (t === '' || t === '-' || t === '.') return null;
  const n = Number(t);
  return isFinite(n) ? n : null;
}
/* Dauer: "7:45", "7,5" (Std.), "465" (Min.) → Minuten */
function parseDur(s) {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})\s*[:h.]\s*(\d{1,2})\s*(min)?$/i);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = parseNum(t.replace(/h|std\.?/i, ''));
  if (n == null) return null;
  return n <= 16 ? Math.round(n * 60) : Math.round(n);
}
function fmtDur(min) {
  if (min == null || !isFinite(min)) return '–';
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? `${h}:${String(m).padStart(2, '0')} h` : `${m} min`;
}

/* ---------- Datum & Zeit ---------- */
const pad = (n) => String(n).padStart(2, '0');
const dkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const todayKey = () => dkey(new Date());
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); };
const weekday = (k) => (parseKey(k).getDay() + 6) % 7; // 0 = Montag
const weekStart = (k) => addDays(k, -weekday(k));
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
const fmtDate = (k, o = { weekday: 'long', day: 'numeric', month: 'long' }) => parseKey(k).toLocaleDateString('de-DE', o);
const timeToMin = (t) => { if (!t || typeof t !== 'string' || !t.includes(':')) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const minToTime = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(Math.round(m % 60))}`;
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const WD_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WD_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

/* ---------- Speicher (IndexedDB, Fallback localStorage) ---------- */
const DB = {
  db: null, mode: 'idb', prefix: 'protokoll:',
  open() {
    return new Promise((resolve) => {
      if (!('indexedDB' in window)) { this.mode = 'ls'; return resolve(); }
      let req;
      try { req = indexedDB.open('protokoll', 1); } catch (e) { this.mode = 'ls'; return resolve(); }
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onerror = () => { this.mode = 'ls'; resolve(); };
      req.onblocked = () => { this.mode = 'ls'; resolve(); };
    });
  },
  async getAll() {
    const out = {};
    if (this.mode === 'ls') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) { try { out[k.slice(this.prefix.length)] = JSON.parse(localStorage.getItem(k)); } catch (e) { /* defekt */ } }
      }
      return out;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('kv', 'readonly');
      const store = tx.objectStore('kv');
      const req = store.openCursor();
      req.onsuccess = () => { const c = req.result; if (c) { out[c.key] = c.value; c.continue(); } else resolve(out); };
      req.onerror = () => reject(req.error);
    });
  },
  putMany(entries) {
    if (this.mode === 'ls') {
      for (const [k, v] of entries) { try { if (v === undefined) localStorage.removeItem(this.prefix + k); else localStorage.setItem(this.prefix + k, JSON.stringify(v)); } catch (e) { toast('Speicher voll – bitte ein Backup machen'); } }
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const tx = this.db.transaction('kv', 'readwrite');
      const store = tx.objectStore('kv');
      for (const [k, v] of entries) { if (v === undefined) store.delete(k); else store.put(v, k); }
      tx.oncomplete = () => resolve();
      tx.onerror = () => { toast('Speichern fehlgeschlagen'); resolve(); };
    });
  },
  clear() {
    if (this.mode === 'ls') { Object.keys(localStorage).filter((k) => k.startsWith(this.prefix)).forEach((k) => localStorage.removeItem(k)); return Promise.resolve(); }
    return new Promise((resolve) => { const tx = this.db.transaction('kv', 'readwrite'); tx.objectStore('kv').clear(); tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); });
  },
};

/* ---------- Zustand ---------- */
const S = { settings: null, meta: null, foods: null, days: {}, shop: null, blood: null, knee: null, reviews: null };
const STORE_KEYS = ['shop', 'blood', 'knee', 'reviews'];
const dirty = new Set();
let saveTimer = null;
function markDirty(key) { dirty.add(key); clearTimeout(saveTimer); saveTimer = setTimeout(flush, key === 'settings' || key === 'meta' ? 0 : 100); }
function flush() {
  clearTimeout(saveTimer);
  if (!dirty.size) return Promise.resolve();
  const entries = [];
  for (const key of dirty) {
    if (key === 'settings') entries.push(['settings', S.settings]);
    else if (key === 'meta') entries.push(['meta', S.meta]);
    else if (key === 'foods') entries.push(['foods', S.foods]);
    else if (STORE_KEYS.includes(key)) entries.push([key, S[key]]);
    else if (key.startsWith('day:')) entries.push([key, S.days[key.slice(4)]]);
  }
  dirty.clear();
  return DB.putMany(entries);
}

function defaultSettings() {
  return {
    profile: { name: '', age: null, height: null, weight: null, wake: '08:30', sleep: '22:30' },
    targets: clone(DEFAULT_TARGETS),
    plan: clone(DEFAULT_PLAN),
    extra: clone(EXTRA_ITEMS),
    weekPlan: [null, null, null, null, null, null, null],
    skin: clone(DEFAULT_SKIN),
    habitsOff: [],
    habitGoal: 7,
    backupDays: 7,
    todos: [{ id: 'bluttest', t: 'Bluttest beim Hausarzt: 25-OH-Vitamin-D und Ferritin messen lassen, danach D3-Dosis anpassen', done: false }],
    ...defaultSettings2(),
  };
}
function mergeDefaults(def, cur) {
  if (cur == null || typeof def !== 'object' || Array.isArray(def)) return cur ?? def;
  const out = { ...def };
  for (const k of Object.keys(cur)) out[k] = (k in def && typeof def[k] === 'object' && !Array.isArray(def[k]) && def[k] !== null) ? mergeDefaults(def[k], cur[k]) : cur[k];
  return out;
}

async function loadState() {
  await DB.open();
  let all = {};
  try { all = await DB.getAll(); } catch (e) { all = {}; }
  S.settings = mergeDefaults(defaultSettings(), all.settings || null);
  S.meta = all.meta || { schema: 1, createdAt: new Date().toISOString(), lastBackup: null, backupSnooze: null };
  S.foods = all.foods || { custom: [], over: {} };
  S.days = {};
  for (const [k, v] of Object.entries(all)) if (k.startsWith('day:')) S.days[k.slice(4)] = v;
  const st = defaultStores();
  for (const key of STORE_KEYS) S[key] = all[key] ? mergeDefaults(st[key] || {}, all[key]) : st[key];
  if (!S.shop) { S.shop = shopDefault(); markDirty('shop'); }
  if (!all.meta) markDirty('meta');
  buildFoodIndex();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* egal */ }
}

/* ---------- Lebensmittel-Index ---------- */
let FOOD = {};
function buildFoodIndex() {
  FOOD = {};
  for (const f of FOODS) FOOD[f.id] = f;
  for (const f of S.foods.custom) FOOD[f.id] = { ...f, custom: true };
  for (const [id, o] of Object.entries(S.foods.over || {})) {
    if (FOOD[id]) FOOD[id] = { ...FOOD[id], ...o, v: { ...FOOD[id].v, ...(o.v || {}) }, edited: true };
  }
}
function unitG(food, u) {
  if (!food) return 1;
  if (u === 'g' || u === 'ml') return 1;
  const e = (food.u || []).find((x) => x[0] === u);
  return e ? e[1] : 1;
}
const isLiquid = (food) => !!food && !!food.fl;
const PLURAL = { Tafel: 'Tafeln', Tagesdosis: 'Tagesdosen', Dosis: 'Dosen', Portion: 'Portionen', Tablette: 'Tabletten', Dose: 'Dosen', Scheibe: 'Scheiben', Tasse: 'Tassen', Flasche: 'Flaschen', Rippe: 'Rippen', Zehe: 'Zehen', Knolle: 'Knollen', Gabel: 'Gabeln', Glas: 'Gläser', Filet: 'Filets', Packung: 'Packungen', Kugel: 'Kugeln', Stange: 'Stangen', Prise: 'Prisen', Shot: 'Shots', Schale: 'Schalen', Tüte: 'Tüten', Einheit: 'Einheiten', Steak: 'Steaks', Messlöffel: 'Messlöffel' };
function unitLabel(u, n) { if (n === 1 || u === 'g' || u === 'ml') return u; return String(u).replace(/^([A-Za-zÄÖÜäöüß]+)/, (w) => PLURAL[w] || w); }
function amountLabel(n, u, stripParen = false) { const d = n % 1 ? (Math.round(n * 100) % 10 ? 2 : 1) : 0; const ul = unitLabel(u, n); return `${fmt(n, d)} ${stripParen ? ul.replace(/\s*\(.*\)\s*/, '') : ul}`; }
function fmtAmount(food, g) {
  if (!food) return fmt(g) + ' g';
  if (food.base === 1) { const u = food.u[0]; return amountLabel(g / u[1], u[0]); }
  const unit = isLiquid(food) ? 'ml' : 'g';
  const first = food.u[0];
  if (first && first[0] !== 'g' && first[0] !== 'ml' && first[1] > 1) {
    const n = g / first[1];
    if (Math.abs(n - Math.round(n)) < 0.01 && n >= 1 && n <= 12) return `${amountLabel(Math.round(n), first[0])} (${fmt(g)} ${unit})`;
  }
  return `${fmt(g, g < 10 && g % 1 ? 1 : 0)} ${unit}`;
}

/* ---------- Tagesdaten ---------- */
function blankDay(k) {
  return { date: k, variant: null, training: null, checks: {}, amt: {}, choice: {}, entries: [], plants: [], habits: {}, hd: {}, health: {}, trainings: [], mood: {}, skin: {} };
}
function peekDay(k) { return S.days[k] || null; }
function getDay(k) { return S.days[k] || blankDay(k); }
function mutDay(k, fn) {
  if (!S.days[k]) S.days[k] = blankDay(k);
  fn(S.days[k]);
  markDirty('day:' + k);
  invalidate();
}
function dayVariant(k) {
  const d = peekDay(k);
  return (d && d.variant) || S.settings.weekPlan[weekday(k)] || 'prep';
}
function isSportDay(k) {
  const d = peekDay(k);
  if (!d) return false;
  return (d.training && d.training !== 'keins') || !!d.habits.sauna || saunaMin(d) > 0 || (d.trainings || []).some((t) => !trainType(t).light);
}
function hasData(d) {
  if (!d) return false;
  return Object.keys(d.checks || {}).length > 0 || (d.entries || []).length > 0;
}

/* ---------- Standardtag-Posten ---------- */
function allPlanItems() {
  const out = [];
  for (const b of S.settings.plan) for (const it of b.items) out.push({ it, block: b });
  for (const it of S.settings.extra || []) out.push({ it, block: null });
  return out;
}
function findItem(id) { return allPlanItems().find((x) => x.it.id === id) || null; }
function itemInVariant(it, variant) { return !it.v || it.v.length === 0 || it.v.includes(variant); }
function itemFoodId(it, day) {
  if (!it.choice) return it.food;
  const key = it.cg || it.id;
  const c = day && day.choice ? day.choice[key] : null;
  if (c && it.choice.includes(c)) return c;
  if (it.rotate && day) return rotateChoice(it, day.date);
  return it.food;
}
/* Beeren im Wechsel: die Sorte, die in den letzten Tagen am längsten nicht dran war */
function rotateChoice(it, k) {
  const key = it.cg || it.id;
  const last = {};
  for (let i = 1; i <= 6; i++) {
    const d = peekDay(addDays(k, -i));
    if (d && d.checks[it.id]) { const c = (d.choice && d.choice[key]) || it.food; if (!(c in last)) last[c] = i; }
  }
  let best = it.choice[0], bestAge = -1;
  for (const c of it.choice) { if (c === 'beerenmix') continue; const age = c in last ? last[c] : 99; if (age > bestAge) { bestAge = age; best = c; } }
  return best;
}
function itemAmount(it, day, variant) {
  if (day && day.amt && day.amt[it.id] != null) return day.amt[it.id];
  if (it.av && it.av[variant] != null) return it.av[variant];
  return it.a;
}
function itemGrams(it, day, variant) {
  const food = FOOD[itemFoodId(it, day)];
  return itemAmount(it, day, variant) * unitG(food, it.u);
}
/* Auswahl-Posten in g/ml: Einheit passend zum gewählten Lebensmittel (Saft in ml, Knolle in g) */
function itemUnit(it, food) { return it.choice && food && (it.u === 'g' || it.u === 'ml') ? (isLiquid(food) ? 'ml' : 'g') : it.u; }
function itemLabel(it, day) {
  const fid = itemFoodId(it, day);
  if (it.choice && it.label && it.cg !== 'pmm') return FOOD[fid] ? FOOD[fid].n : it.label;
  return it.label || (FOOD[fid] ? FOOD[fid].n : fid);
}
function resolveBlockTime(b, day) {
  if (b.time === 'training') {
    const mt = mainTraining(day);
    if (mt) return Math.max(0, timeToMin(mt.time) - 30);
    const t = day && day.training;
    return timeToMin((TRAINING[t] || TRAINING.keins).time);
  }
  return timeToMin(b.time);
}

/* ---------- Berechnung eines Tages ---------- */
const evalCache = new Map();
let calcVersion = 0;
function invalidate() { calcVersion++; evalCache.clear(); if (typeof totCache !== 'undefined') totCache.clear(); }

function newTotals() { return { pp: 0, pre: 0, fluid: 0, mgSupp: 0, upfKcal: 0, ferm: {} }; }
function addFood(tot, contrib, food, g, label) {
  if (!food || !(g > 0)) return;
  const base = food.base || 100, fct = g / base;
  for (const [k, val] of Object.entries(food.v || {})) {
    const add = val * fct;
    tot[k] = (tot[k] || 0) + add;
    if (contrib && add) { (contrib[k] = contrib[k] || {})[label] = (contrib[k][label] || 0) + add; }
  }
  if (food.pp) { tot.pp += food.pp * fct; if (contrib) (contrib.pp = contrib.pp || {})[label] = (contrib.pp[label] || 0) + food.pp * fct; }
  if (food.pre) { tot.pre += food.pre * fct; if (contrib) (contrib.pre = contrib.pre || {})[label] = (contrib.pre[label] || 0) + food.pre * fct; }
  if (food.fl) { tot.fluid += food.fl * fct; if (contrib) (contrib.fluid = contrib.fluid || {})[label] = (contrib.fluid[label] || 0) + food.fl * fct; }
  if (food.ferm) tot.ferm[food.id] = (tot.ferm[food.id] || 0) + g;
  if (food.supp && food.v && food.v.mg) tot.mgSupp += food.v.mg * fct;
  if (food.tags && food.tags.includes('upf') && food.v.kcal) tot.upfKcal += food.v.kcal * fct;
}
function fermPortions(tot) {
  let n = 0;
  for (const [id, g] of Object.entries(tot.ferm)) { const f = FOOD[id]; if (f && f.ferm) n += Math.min(1, g / f.ferm); }
  return n;
}
function foodPlants(food) { return food && food.pl ? [].concat(food.pl) : []; }

/* Alle Posten eines Tages: abgehakte Standardposten + Detail-Einträge (+ Prognose: offene Standardposten) */
function dayLines(k, withPlan = false) {
  const d = getDay(k), variant = dayVariant(k);
  const lines = [];
  for (const { it, block } of allPlanItems()) {
    const checked = !!d.checks[it.id];
    const inVar = itemInVariant(it, variant);
    if (!checked && (!withPlan || it.opt || !inVar)) continue;
    const fid = itemFoodId(it, d);
    lines.push({ food: FOOD[fid], g: itemGrams(it, d, variant), label: itemLabel(it, d), planned: !checked, src: 'plan', id: it.id, block: block && block.id });
  }
  for (const e of d.entries || []) lines.push({ food: FOOD[e.food], g: e.g, label: FOOD[e.food] ? FOOD[e.food].n : e.food, planned: false, src: 'entry', id: e.id, meal: e.meal });
  for (const c of d.caf || []) lines.push({ food: cafFood(c), g: 1, label: c.n, planned: false, src: 'caf', id: c.id });
  return lines;
}
const totCache = new Map();
function computeTotals(k, withPlan) {
  const ck = k + '|' + (withPlan ? 1 : 0) + '|' + calcVersion;
  if (totCache.has(ck)) return totCache.get(ck);
  const res = computeTotalsRaw(k, withPlan);
  totCache.set(ck, res);
  return res;
}
function computeTotalsRaw(k, withPlan) {
  const tot = newTotals(), contrib = {}, plants = new Set();
  for (const ln of dayLines(k, withPlan)) {
    addFood(tot, contrib, ln.food, ln.g, ln.label);
    foodPlants(ln.food).forEach((p) => plants.add(p));
  }
  for (const p of getDay(k).plants || []) plants.add(p);
  return { tot, contrib, plants };
}
function weekPlants(k, upTo = true) {
  const ws = weekStart(k), set = new Set();
  const end = upTo ? daysBetween(ws, k) : 6;
  for (let i = 0; i <= end; i++) {
    const dk = addDays(ws, i);
    if (!peekDay(dk)) continue;
    computeTotals(dk, false).plants.forEach((p) => set.add(p));
  }
  return set;
}

/* ---------- Ziele & Status ---------- */
function T() { return S.settings.targets; }
function carbTarget() {
  const t = T();
  const lo = (t.kcal.lo - t.p.hi * 4 - (t.fatPct.hi / 100) * t.kcal.lo) / 4;
  const hi = (t.kcal.hi - t.p.lo * 4 - (t.fatPct.lo / 100) * t.kcal.hi) / 4;
  return { lo: Math.round(Math.min(lo, hi) / 5) * 5, hi: Math.round(Math.max(lo, hi) / 5) * 5 };
}
function targetFor(key, k) {
  const t = T();
  if (key === 'c') return carbTarget();
  if (key === 'sf') return { max: Math.round((((t.sf.maxPct || 10) / 100) * ((t.kcal.lo + t.kcal.hi) / 2) / 9) * 10) / 10 };
  if (key === 'fluid') return k && isSportDay(k) ? t.fluidSport : t.fluid;
  return t[key] || {};
}
function stateOf(v, t) {
  if (v == null) return 'none';
  if (t.max != null && v > t.max) return 'over';
  if (t.min != null && v < t.min) return 'low';
  if (t.lo != null && v < t.lo) return 'under';
  if (t.hi != null && v > t.hi) return 'high';
  return 'ok';
}
const STATE_LABEL = { ok: 'im Ziel', under: 'unter Ziel', low: 'unter Minimum', high: 'über Ziel', over: 'über Maximum', none: 'keine Daten' };
const STATE_ICON = { ok: 'check', under: 'arrow-down', low: 'arrow-down', high: 'arrow-up', over: 'triangle-alert', none: 'minus' };

const METRIC_META = {
  kcal: { n: 'Kalorien', u: 'kcal', d: 0 }, p: { n: 'Protein', u: 'g', d: 0 }, fatPct: { n: 'Fett', u: '% kcal', d: 0 }, c: { n: 'Kohlenhydrate', u: 'g', d: 0 },
  sf: { n: 'Gesättigte Fettsäuren', u: 'g', d: 1 }, fs: { n: 'Freier Zucker', u: 'g', d: 0 }, fib: { n: 'Ballaststoffe', u: 'g', d: 0 },
  pre: { n: 'Präbiotika', u: 'Punkte', d: 1 }, pp: { n: 'Polyphenole', u: 'Punkte', d: 1 }, ferm: { n: 'Fermentiertes', u: 'Portionen', d: 1 },
  plants: { n: 'Pflanzenvielfalt', u: 'diese Woche', d: 0 }, fluid: { n: 'Flüssigkeit', u: 'ml', d: 0 }, o3: { n: 'Omega-3 (EPA+DHA)', u: 'g', d: 2 },
  caf: { n: 'Koffein', u: 'mg', d: 0 }, upf: { n: 'Ultraverarbeitet', u: '% kcal', d: 0 },
};
function metaOf(key) {
  if (METRIC_META[key]) return METRIC_META[key];
  const n = NUTRIENTS[key];
  return n ? { n: n.n, u: n.u, d: n.d, conv: n.conv } : { n: key, u: '', d: 0 };
}
/* Anzeige-Wert (z. B. Vitamin D in IE) */
function disp(key, v) { const m = metaOf(key); return m.conv ? v * m.conv : v; }

function metricValue(key, tot, plantsWeek) {
  switch (key) {
    case 'fatPct': return tot.kcal > 0 ? ((tot.f || 0) * 9 / tot.kcal) * 100 : 0;
    case 'o3': return (tot.epa || 0) + (tot.dha || 0);
    case 'ferm': return fermPortions(tot);
    case 'plants': return plantsWeek;
    case 'fluid': return tot.fluid;
    case 'pre': return tot.pre;
    case 'pp': return tot.pp;
    case 'upf': return tot.kcal > 0 ? (tot.upfKcal / tot.kcal) * 100 : 0;
    default: return tot[key] || 0;
  }
}
function metricState(key, v, t, tot) {
  let st = stateOf(v, t);
  if (key === 'va' && t.max != null) { st = stateOf(v, { ...t, max: undefined }); if ((tot.ret || 0) > t.max) st = 'over'; }
  if (key === 'mg' && t.suppMax != null && tot.mgSupp > t.suppMax) st = 'over';
  return st;
}
function pctOf(v, t) {
  const ref = t.lo != null ? t.lo : t.max;
  return ref ? (v / ref) * 100 : 0;
}

/* Vollständige Auswertung eines Tages (mit Prognose aus offenen Standardposten) */
function evaluate(k) {
  const ck = k + '|' + calcVersion;
  if (evalCache.has(ck)) return evalCache.get(ck);
  const act = computeTotals(k, false);
  const proj = computeTotals(k, true);
  const wp = weekPlants(k, true);
  const wpProj = new Set([...wp, ...proj.plants]);
  const metrics = {};
  const keys = new Set(EVAL_GROUPS.flatMap((g) => g.keys).concat(MICRO_KEYS));
  for (const key of keys) {
    const t = targetFor(key, k);
    const v = metricValue(key, act.tot, wp.size);
    const pv = metricValue(key, proj.tot, wpProj.size);
    metrics[key] = {
      key, v, pv, t,
      state: metricState(key, v, t, act.tot),
      pstate: metricState(key, pv, t, proj.tot),
      pct: pctOf(v, t), ppct: pctOf(pv, t),
    };
  }
  const res = { k, act, proj, metrics, plantsWeek: wp, logged: hasData(peekDay(k)) };
  evalCache.set(ck, res);
  return res;
}

/* Kalorienanteile */
function energySplit(tot) {
  const p = (tot.p || 0) * 4, f = (tot.f || 0) * 9, c = (tot.c || 0) * 4;
  const sum = p + f + c;
  if (!sum) return { p: 0, f: 0, c: 0 };
  return { p: (p / sum) * 100, f: (f / sum) * 100, c: (c / sum) * 100 };
}
function topContrib(contrib, key, n = 3) {
  const src = key === 'o3' ? mergeContrib(contrib.epa, contrib.dha) : contrib[key];
  if (!src) return [];
  return Object.entries(src).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, n);
}
function mergeContrib(a = {}, b = {}) { const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = (o[k] || 0) + v; return o; }

/* ---------- Tipps ---------- */
const TIP_ORDER = ['p', 'kcal', 'fib', 'o3', 'vd', 'i', 've', 'vc', 'mg', 'zn', 'fe', 'se', 'ca', 'k', 'va', 'vk', 'fol', 'b12', 'b6', 'cu', 'cho', 'fluid', 'ferm', 'pre', 'pp'];
function perGram(food, key) {
  const b = food.base || 100;
  if (key === 'o3') return ((food.v.epa || 0) + (food.v.dha || 0)) / b;
  if (key === 'fluid') return (food.fl || 0) / b;
  if (key === 'pre') return (food.pre || 0) / b;
  if (key === 'pp') return (food.pp || 0) / b;
  if (key === 'ferm') return food.ferm ? 1 / food.ferm : 0;
  return ((food.v && food.v[key]) || 0) / b;
}
/* Bis zu n Lebensmittel mit Menge, die eine Lücke schließen (bevorzugt aus deinem Vorrat) */
function foodOptions(key, gap, n = 3, exclude = null) {
  const out = [];
  for (const [fid, maxG, step] of TIP_FOODS[key] || []) {
    const food = FOOD[fid];
    if (!food || (exclude && exclude.has(fid))) continue;
    const per = perGram(food, key);
    if (!(per > 0)) continue;
    let g = key === 'ferm' ? Math.max(food.ferm || step, step) : Math.max(step, Math.ceil(gap / per / step) * step);
    const full = key === 'ferm' || g <= maxG;
    if (!full) g = maxG;
    out.push({ food, g, full, share: key === 'ferm' ? 1 : Math.min(1, (g * per) / gap) });
    if (out.length >= n) break;
  }
  return out;
}
function suggestFood(key, gap, exclude = null) { const o = foodOptions(key, gap, 6, exclude); return o.find((x) => x.full) || o[0] || null; }
function friendlyTipAmount(food, g) {
  if (food.base === 1) { const u = food.u[0]; return `${amountLabel(g / u[1], u[0], true)} ${shortName(food)}`; }
  const first = food.u[0];
  const name = food.n.split(' (')[0];
  if (first && first[0] === 'Stück' && g % first[1] === 0) { const n = g / first[1]; return n === 1 ? `1 ${name}` : `${n} Stück ${name}`; }
  if (first && first[0] === 'Dose' && g % first[1] === 0) { const n = g / first[1]; return `${amountLabel(n, 'Dose')} ${food.n}`; }
  return `${fmt(g, g < 10 && g % 1 ? 1 : 0)} ${isLiquid(food) ? 'ml' : 'g'} ${food.n}`;
}
function shortName(f) { return ({ s_d3k2: 'D3 + K2', s_omega3: 'Omega-3', s_kreatin: 'Kreatin', s_ag1: 'AG1', s_mg_threonat: 'Mg-Threonat', s_zink_lutsch: 'Zink-Lutschtablette' })[f.id] || f.n; }
function overTip(key, m, ev) {
  const top = topContrib(ev.act.contrib, key === 'va' ? 'ret' : key, 1)[0];
  const src = top ? `Größter Anteil: ${top[0]} (${fmt(disp(key, top[1]), metaOf(key).d)} ${metaOf(key).u})` : '';
  const T_ = {
    se: 'Paranuss heute weglassen oder an Tagen mit Makrele und AG1 pausieren.',
    zn: 'Gelegentlich unkritisch, dauerhaft nicht über 25 mg (verdrängt Kupfer). Nimm AG1 als halbe Portion oder halbiere an AG1-Tagen die Kürbiskerne.',
    va: 'Retinol über 3.000 µg: Leber und Retinol-Supplements reduzieren. Beta-Carotin aus Gemüse ist unbedenklich.',
    vd: 'Tropfen reduzieren: über 4.000 IE nur mit ärztlicher Begleitung.',
    ca: 'Dauerhaft nicht über 2.500 mg: Mineralwasser heute teilweise durch Leitungswasser ersetzen.',
    cu: 'Kupfer über 5 mg: Leber oder große Mengen Kakao/Nüsse reduzieren.',
    b6: 'B6 über 12 mg kommt fast nur aus Supplements: AG1 nicht täglich.',
    fe: 'Über 40 mg Eisen: Eisenreiche Supplements weglassen; Ferritin beim Arzt prüfen lassen.',
    mg: 'Magnesium aus Supplements über 250 mg: Threonat heute weglassen (wirkt sonst abführend).',
    na: 'Sehr viel Natrium: heute nicht zusätzlich salzen. Nach Sauna oder viel Schweiß ist mehr okay.',
    fatPct: 'Fett über 35 % der Kalorien: weniger Nüsse oder Öl, dafür Haferflocken oder Obst.',
    kcal: 'Über deinem Kalorien-Maximum: Datteln, O-Saft oder Nüsse sind die einfachsten Stellschrauben.',
    caf: 'Über 400 mg Koffein: heute keine weitere Tasse.',
    fs: 'Über 60 g freier Zucker: Saft und Süßes reduzieren.',
    sf: 'Gesättigte Fette über 10 % der Kalorien: Schokolade, Käse oder Butter etwas reduzieren, Prepmymeal mit Sahne- oder Buttersoße seltener.',
    upf: 'Mehr als 20 % der Kalorien aus Ultraverarbeitetem.',
    ve: 'Vitamin E über 300 mg kommt nur aus Supplements.',
    i: 'Jod über 600 µg: Algen meiden, weniger Jodsalz.',
    o3: 'Über 5 g EPA+DHA: Algenöl-Dosis reduzieren.',
    vc: 'Über 2.000 mg Vitamin C: Durchfall möglich, Supplement-Dosis senken.',
    fib: 'Sehr viele Ballaststoffe: Flohsamen heute reduzieren und viel trinken.',
    fluid: 'Sehr viel getrunken: über ca. 6 l ohne Salz drohen Natriumprobleme.',
  };
  let sub = key === 'mg' ? `Aus Supplements: ${fmt(ev.act.tot.mgSupp)} mg` : src;
  if (CHRONIC_UL.includes(key)) {
    const r = rollingAvg(key, ev.k, ev.k >= todayKey());
    if (r.n >= 3) sub = `${sub ? sub + '. ' : ''}${r.n}-Tage-Schnitt: ${fmt(disp(key, r.avg), metaOf(key).d)} ${metaOf(key).u}${r.avg <= m.t.max ? ', also noch unter der Obergrenze' : ''}`;
  }
  return { key, kind: 'over', title: `${metaOf(key).n} über Maximum`, text: T_[key] || 'Über dem sinnvollen Maximum.', sub };
}
function buildTips(k) {
  const ev = evaluate(k);
  const isToday = k === todayKey();
  const usePlan = isToday || k > todayKey();
  const out = [];
  const RATIO = ['fatPct', 'upf'];
  for (const key of Object.keys(ev.metrics)) {
    const m = ev.metrics[key];
    if (RATIO.includes(key) && usePlan) { if (ev.logged && m.pstate === 'over') out.push({ ...overTip(key, m, ev), sub: `Prognose mit Restplan: ${fmt(m.pv)} %` }); continue; }
    if (m.state === 'over') out.push(overTip(key, m, ev));
    else if (usePlan && ev.logged && m.pstate === 'over') { const t = overTip(key, m, ev); const simple = m.t.max != null && key !== 'va'; out.push({ ...t, title: `${metaOf(key).n}: mit Restplan über Maximum`, sub: simple ? `Prognose ${fmt(disp(key, m.pv), metaOf(key).d)} ${metaOf(key).u}, Maximum ${fmt(disp(key, m.t.max), metaOf(key).d)}` : t.sub }); }
  }
  for (const key of TIP_ORDER) {
    const m = ev.metrics[key];
    if (!m) continue;
    const v = usePlan ? m.pv : m.v;
    const st = usePlan ? m.pstate : m.state;
    if (st !== 'under' && st !== 'low') continue;
    const t = m.t;
    const goal = t.lo;
    const gap = goal - v;
    if (!(gap > 0)) continue;
    const meta = metaOf(key);
    const pct = Math.round((v / goal) * 100);
    let text = '';
    if (key === 'fluid') {
      text = `+ ${fmt(Math.ceil(gap / 250) * 250)} ml Wasser`;
    } else {
      const s = suggestFood(key, gap, key === 'ferm' ? new Set(Object.keys((usePlan ? ev.proj : ev.act).tot.ferm)) : null);
      if (!s) continue;
      text = `+ ${friendlyTipAmount(s.food, s.g)}`;
      if (!s.full) text += ` (deckt ca. ${Math.round(s.share * 100)} % der Lücke)`;
      if (key === 'mg' && !s.full) text += ' oder Magnesium-Threonat am Abend';
    }
    const label = key === 'ferm' ? 'Fermentiertes niedrig' : `${meta.n} niedrig`;
    out.push({ key, kind: 'gap', title: label, text, sub: usePlan ? `Prognose mit Restplan: ${pct} %` : `${pct} % des Ziels` });
  }
  return out;
}

/* ---------- Trends der letzten Tage ---------- */
const CHRONIC_UL = ['zn', 'se', 'ca', 'b6', 'cu', 'fe', 'va', 'vd', 'i', 've'];
const TREND_KEYS = ['p', 'kcal', 'fib', 'fluid', 'o3', 'vd', 'mg', 'zn', 'fe', 'se', 'i', 'ca', 'k', 'vc', 've', 'va', 'vk', 'b12', 'fol', 'b6', 'cu', 'cho', 'ferm', 'pre', 'pp', 'na', 'fatPct', 'sf'];
const TREND_SUPP = {
  mg: 'Oder an Tagen mit wenig Kürbiskernen, Hafer und Nüssen abends Magnesium-Threonat (laut deinem Plan; max. 250 mg aus Supplements).',
  vd: 'Die D3+K2-Tropfen täglich nehmen (4 Tropfen = 2.000 IE). Die passende Dosis zeigt der Bluttest.',
  o3: 'Omega-3-Algenöl täglich (2 Tagesdosen, an Makrele-Tagen 1).',
  zn: 'Kein Dauer-Supplement nötig. Eine AG1-Portion liefert 10 mg.',
  fe: 'Kein Eisen-Supplement ohne Bluttest (Ferritin).',
  se: 'Kein Supplement: 1 Paranuss am Tag reicht.',
  i: 'Kein Supplement: Jodsalz beim Würzen und 1–2 Mal pro Woche Seefisch.',
  ca: 'Kein Supplement: kalziumreiches Mineralwasser, Skyr, Kefir.',
  b12: 'Kein Supplement nötig, solange Skyr, Eier oder Fisch dabei sind. Eine AG1-Portion liefert 50 µg.',
  vc: 'Eine AG1-Portion liefert 420 mg.',
  fol: 'Eine AG1-Portion liefert 300 µg.',
  b6: 'Eine AG1-Portion liefert 5 mg.',
  k: 'Kein Kalium-Supplement (hochdosiert riskant fürs Herz).',
  va: 'Kein Supplement (Retinol reichert sich an).',
  ve: 'Kein hochdosiertes Supplement; eine AG1-Portion liefert 32 mg.',
  fib: 'Flohsamenschalen sind die einfachste Stellschraube, dazu mehr trinken.',
};
const TREND_OVER = {
  zn: 'AG1 nur jeden zweiten bis dritten Tag oder als halbe Portion nehmen; an AG1-Tagen die Kürbiskerne halbieren.',
  se: 'Die Paranuss an Tagen mit Makrele oder AG1 weglassen.',
  ca: 'Einen Teil des kalziumreichen Mineralwassers durch Leitungswasser ersetzen.',
  na: 'Weniger zusätzlich salzen; Prepmymeal und Döner sind schon salzig. Nach Sauna ist mehr okay.',
  kcal: 'Datteln, O-Saft oder Nüsse reduzieren. Ob es nötig ist, zeigt dein Gewichtstrend.',
  fe: 'Keine Eisen-Supplements; Ferritin beim Arzt prüfen lassen.',
  b6: 'B6 kommt vor allem aus AG1: AG1 seltener nehmen.',
  cu: 'Leber und große Mengen Kakao oder Nüsse reduzieren.',
  va: 'Retinol-Quellen (Leber, Supplements) reduzieren. Beta-Carotin aus Gemüse ist unbedenklich.',
  vd: 'Tropfen reduzieren; über 4.000 IE nur mit ärztlicher Begleitung.',
  i: 'Weniger Jodsalz, Algen meiden.',
  o3: 'Algenöl-Dosis reduzieren.',
  fatPct: 'Weniger Nüsse oder Öl, dafür Haferflocken oder Obst.',
  sf: 'Schokolade, Käse oder Butter etwas reduzieren; Prepmymeal mit Sahne- oder Buttersoße seltener.',
  ve: 'Vitamin E über 300 mg kommt nur aus Supplements.',
  fib: 'Bei Blähungen die Flohsamen reduzieren und viel trinken; fühlst du dich gut, ist das unproblematisch.',
};
function lastLoggedKeys(k, n = 7) {
  const out = [];
  for (let i = 1; i <= n; i++) { const dk = addDays(k, -i); if (hasData(peekDay(dk))) out.push(dk); }
  return out;
}
function ulValue(tot, key) { return key === 'va' ? tot.ret || 0 : tot[key] || 0; }
/* Schnitt aus bis zu 6 protokollierten Vortagen + diesem Tag (bei heute inkl. Restplan) */
function rollingAvg(key, k, withPlan = false) {
  const vals = lastLoggedKeys(k, 6).map((dk) => ulValue(computeTotals(dk, false).tot, key));
  vals.push(ulValue(computeTotals(k, withPlan).tot, key));
  return { avg: mean(vals), n: vals.length };
}
function trendRecs(k) {
  const keys = lastLoggedKeys(k, 7);
  if (keys.length < 3) return { n: keys.length, recs: [] };
  const evs = keys.map((dk) => evaluate(dk));
  const recs = [];
  for (const key of TREND_KEYS) {
    const t = targetFor(key, k);
    const avg = mean(evs.map((e) => e.metrics[key] ? e.metrics[key].v : e.act.tot[key] || 0));
    const maxVal = key === 'va' ? mean(evs.map((e) => e.act.tot.ret || 0)) : avg;
    if (t.max != null && maxVal > t.max) {
      const overDays = evs.filter((e) => (key === 'va' ? e.act.tot.ret || 0 : e.metrics[key] ? e.metrics[key].v : 0) > t.max).length;
      recs.push({ key, kind: 'over', avg: maxVal, max: t.max, pct: (maxVal / t.max) * 100, days: overDays, n: evs.length, text: TREND_OVER[key] || 'Über dem sinnvollen Maximum.' });
      continue;
    }
    if (key === 'mg' && t.suppMax) {
      const ms = mean(evs.map((e) => e.act.tot.mgSupp || 0));
      if (ms > t.suppMax) { recs.push({ key, kind: 'over', avg: ms, max: t.suppMax, pct: (ms / t.suppMax) * 100, days: 0, n: evs.length, text: 'Magnesium aus Supplements im Schnitt über 250 mg: Threonat nur an Tagen mit wenig magnesiumreichen Lebensmitteln.' }); continue; }
    }
    if (!t.lo || avg >= t.lo * 0.9 || key === 'fatPct' || key === 'sf') continue;
    const gap = t.lo - avg;
    const under = evs.filter((e) => e.metrics[key] && ['under', 'low'].includes(e.metrics[key].state)).length;
    recs.push({ key, kind: 'gap', avg, pct: (avg / t.lo) * 100, under, n: evs.length, opts: foodOptions(key, gap, 3), supp: TREND_SUPP[key] || '' });
  }
  recs.sort((a, b) => (a.kind === b.kind ? (a.kind === 'over' ? b.pct - a.pct : a.pct - b.pct) : a.kind === 'over' ? -1 : 1));
  return { n: keys.length, recs };
}
/* Wie viel AG1 heute passt, ohne dass ein Nährstoff im 7-Tage-Schnitt über seine Obergrenze steigt */
function ag1Budget(k) {
  const ag1 = FOOD.s_ag1, found = findItem('m_ag1');
  if (!ag1 || !found) return null;
  const d = getDay(k), variant = dayVariant(k);
  const taken = d.checks.m_ag1 ? itemAmount(found.it, d, variant) : 0;
  const proj = computeTotals(k, true).tot;
  const past = lastLoggedKeys(k, 6).map((dk) => computeTotals(dk, false).tot);
  let best = Infinity, lim = null;
  for (const key of ['zn', 'se', 'b6', 'ca', 've', 'cu', 'fe']) {
    const per = ag1.v[key], t = targetFor(key, k);
    if (!per || t.max == null) continue;
    const todayBase = (proj[key] || 0) - taken * per;
    const pastSum = past.reduce((a, tt) => a + (tt[key] || 0), 0);
    const p = (t.max * (past.length + 1) - pastSum - todayBase) / per;
    if (p < best) { best = p; lim = key; }
  }
  const tm = targetFor('mg', k);
  if (ag1.v.mg && tm.suppMax) { const p = (tm.suppMax - ((proj.mgSupp || 0) - taken * ag1.v.mg)) / ag1.v.mg; if (p < best) { best = p; lim = 'mg'; } }
  if (best === Infinity) return null;
  const max = Math.max(0, Math.floor(best * 4 + 1e-9) / 4);
  return { max, lim, taken, days: past.length + 1, over: taken > max + 1e-9 };
}
function ag1BudgetShort(b) {
  if (!b) return 'bei Bedarf';
  const ln = b.lim ? metaOf(b.lim).n : '';
  if (b.taken) return b.over ? `mehr als heute passt (${ln})` : 'im Rahmen';
  if (b.max >= 1) return 'heute passt 1 Portion';
  if (b.max > 0) return `heute bis ${amountLabel(b.max, 'Portion')} (${ln})`;
  return `heute lieber keins (${ln})`;
}
function ag1BudgetLong(b) {
  if (!b) return '';
  const ln = b.lim ? metaOf(b.lim).n : '';
  const win = b.days > 1 ? `im ${b.days}-Tage-Schnitt` : 'heute';
  const base = `Mit deinem Restplan${b.days > 1 ? ` und den letzten ${b.days - 1} protokollierten Tagen` : ''}`;
  if (b.max <= 0) return `${base} würde schon eine Viertel-Portion ${ln} ${win} über die Obergrenze bringen. Heute lieber auslassen.`;
  if (b.max >= 1) return `${base} passt heute eine ganze Portion, ohne dass ${ln} ${win} über die Obergrenze steigt.`;
  return `${base} passen heute höchstens ${amountLabel(b.max, 'Portion')}, bevor ${ln} ${win} über der Obergrenze liegt.`;
}

/* ---------- Erfolge & Serien ---------- */
function dailySupps() { return allPlanItems().filter(({ it }) => FOOD[it.food] && FOOD[it.food].supp === 'daily'); }
function dayFlags(k) {
  const d = peekDay(k);
  if (!d) return { nutri: false, supp: false, habits: false, logged: false, score: null, habitCount: 0, suppFrac: 0 };
  const ev = evaluate(k);
  const m = ev.metrics;
  const t = T();
  const micro = MICRO_KEYS.map((key) => m[key]).filter(Boolean);
  const microOk = micro.filter((x) => x.state === 'ok' || x.state === 'high').length / micro.length;
  const nutri = ev.logged && m.kcal.v >= t.kcal.lo * 0.9 && (t.kcal.max == null || m.kcal.v <= t.kcal.max) && m.p.v >= (t.p.min || t.p.lo) && m.fib.v >= t.fib.lo * 0.8 && microOk >= 0.8;
  const variant = dayVariant(k);
  const ds = dailySupps().filter(({ it }) => itemInVariant(it, variant));
  const taken = ds.filter(({ it }) => d.checks[it.id]).length;
  const habitsOn = HABITS.filter((h) => !S.settings.habitsOff.includes(h.id));
  const habitCount = habitsOn.filter((h) => d.habits[h.id]).length;
  return {
    nutri, logged: ev.logged || habitCount > 0 || Object.keys(d.health || {}).length > 0,
    supp: ds.length > 0 && taken === ds.length, suppFrac: ds.length ? taken / ds.length : 0,
    habits: habitCount >= Math.min(S.settings.habitGoal, habitsOn.length), habitCount, habitTotal: habitsOn.length,
    score: ev.logged ? nutritionScore(ev) : null,
  };
}
/* Ernährungs-Score 0–100 (Mittel aus gekappten Zielerreichungen) */
function nutritionScore(ev) {
  const m = ev.metrics;
  const parts = [];
  const cap = (x) => clamp(x, 0, 100);
  const range = (mm) => { const t = mm.t; if (mm.state === 'over') return 60; if (t.lo && mm.v < t.lo) return cap((mm.v / t.lo) * 100); return 100; };
  parts.push(range(m.kcal), range(m.p), range(m.fib), range(m.fluid), range(m.ferm), range(m.pp), range(m.pre));
  const micro = MICRO_KEYS.map((k) => m[k]).filter(Boolean).map((mm) => (mm.state === 'over' ? 60 : cap(mm.pct)));
  parts.push(micro.reduce((a, b) => a + b, 0) / micro.length);
  parts.push(m.fatPct.state === 'over' ? 60 : m.fatPct.state === 'under' ? 85 : 100);
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}
function streak(kind) {
  const keys = Object.keys(S.days).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) {
    const ok = dayFlags(k)[kind];
    run = ok ? (prev && run > 0 && daysBetween(prev, k) === 1 ? run + 1 : 1) : 0;
    best = Math.max(best, run);
    prev = k;
  }
  let cur = 0;
  let k = todayKey();
  if (!dayFlags(k)[kind]) k = addDays(k, -1);
  while (dayFlags(k)[kind]) { cur++; k = addDays(k, -1); }
  return { cur, best: Math.max(best, cur) };
}

/* ---------- Statistik / Zusammenhänge ---------- */
function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; }
function pearson(pts) {
  const n = pts.length;
  if (n < 3) return null;
  const mx = mean(pts.map((p) => p.x)), my = mean(pts.map((p) => p.y));
  let sxy = 0, sxx = 0, syy = 0;
  for (const p of pts) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; }
  if (!sxx || !syy) return null;
  return sxy / Math.sqrt(sxx * syy);
}
function strengthLabel(r) {
  const a = Math.abs(r);
  if (a < 0.2) return 'kaum ein Zusammenhang';
  if (a < 0.4) return 'schwacher Zusammenhang';
  if (a < 0.6) return 'mittlerer Zusammenhang';
  return 'starker Zusammenhang';
}
function rangeKeys(n, end = todayKey()) { const out = []; for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i)); return out; }

/* Zusammenhänge: Abendverhalten (Tag X) → Schlaf der folgenden Nacht (eingetragen an Tag X+1) */
const CORRELATIONS = [
  { id: 'screen', n: 'Bildschirmfrei vor dem Schlafen', y: 'sleepScore', type: 'num', unit: 'Min.', x: (d) => (d.hd && d.hd.screenFree != null ? d.hd.screenFree : null), split: (x) => x >= 60, la: '≥ 60 Min.', lb: '< 60 Min.' , ia: 'Nach Abenden mit mind. 60 Min. ohne Bildschirm', ib: 'bei weniger' },
  { id: 'caf', n: 'Letztes Koffein', y: 'sleepScore', type: 'time', x: (d) => timeToMin(d.hd && d.hd.caffeineEnd), split: (x) => x <= 14 * 60 + 30, la: 'bis 14:30', lb: 'nach 14:30' , ia: 'Mit letztem Koffein bis 14:30', ib: 'bei späterem Koffein' },
  { id: 'meal', n: 'Letzte große Mahlzeit', y: 'sleepScore', type: 'time', x: (d) => timeToMin(d.hd && d.hd.lastMeal), split: (x) => x <= sleepMin() - 120, la: '≥ 2 Std. vor dem Schlafen', lb: 'später' , ia: 'Mit der letzten großen Mahlzeit mind. 2 Std. vor dem Schlafen', ib: 'bei späterem Essen' },
  { id: 'train', n: 'Training abends (ab 18 Uhr)', y: 'sleepScore', type: 'bool', x: (d) => trainedEvening(d), split: (x) => x === 1, la: 'mit Abendtraining', lb: 'ohne' , ia: 'Nach Abendtraining (ab 18 Uhr)', ib: 'ohne Abendtraining' },
  { id: 'alk', n: 'Alkohol-Regel eingehalten', y: 'hrv', type: 'bool', x: (d) => (d.habits && 'alkohol' in d.habits ? (d.habits.alkohol ? 1 : 0) : null), split: (x) => x === 1, la: 'eingehalten', lb: 'nicht eingehalten' , ia: 'Mit eingehaltener Alkohol-Regel', ib: 'ohne' },
  { id: 'sauna', n: 'Sauna', y: 'sleepScore', type: 'bool', x: (d) => (hasAnyHabit(d) ? (d.habits.sauna ? 1 : 0) : null), split: (x) => x === 1, la: 'mit Sauna', lb: 'ohne' , ia: 'Nach Sauna-Tagen', ib: 'ohne Sauna' },
  { id: 'licht', n: 'Morgenlicht', y: 'sleepScore', type: 'bool', x: (d) => (hasAnyHabit(d) ? (d.habits.licht_morgen ? 1 : 0) : null), split: (x) => x === 1, la: 'mit Morgenlicht', lb: 'ohne' , ia: 'Nach Tagen mit Morgenlicht', ib: 'ohne' },
  { id: 'steps', n: 'Schritte', y: 'sleepScore', type: 'num', unit: '', x: (d) => (d.health && d.health.steps != null ? d.health.steps : null), split: (x) => x >= 10000, la: '≥ 10.000', lb: '< 10.000' , ia: 'Nach Tagen mit mind. 10.000 Schritten', ib: 'mit weniger' },
];
function sleepMin() { return timeToMin(S.settings.profile.sleep) || 22 * 60 + 30; }
function hasAnyHabit(d) { return d && d.habits && Object.keys(d.habits).length > 0; }
function trainedEvening(d) {
  if (!d) return null;
  const tr = d.trainings || [];
  if (tr.some((t) => timeToMin(t.time) >= 18 * 60)) return 1;
  if (d.training === 'abends') return 1;
  if (tr.length || d.training) return 0;
  return null;
}
function correlationData(c, days = 90) {
  const pts = [];
  for (const k of rangeKeys(days)) {
    const d = peekDay(k), next = peekDay(addDays(k, 1));
    if (!d || !next || !next.health) continue;
    const x = c.x(d), y = next.health[c.y];
    if (x == null || y == null) continue;
    pts.push({ x, y, k });
  }
  const a = pts.filter((p) => c.split(p.x)).map((p) => p.y), b = pts.filter((p) => !c.split(p.x)).map((p) => p.y);
  return { pts, r: c.type === 'bool' ? null : pearson(pts), ma: mean(a), mb: mean(b), na: a.length, nb: b.length };
}

/* ---------- Haut-Protokoll ---------- */
function skinPhase(k) {
  for (const p of S.settings.skin.phases) if (k >= p.start && k <= p.end) return { ...p, day: daysBetween(p.start, k) + 1, len: daysBetween(p.start, p.end) + 1 };
  return null;
}
function phaseBlocks(k, food) {
  const ph = skinPhase(k);
  if (!ph || !food || !food.tags) return null;
  const hit = food.tags.find((t) => (ph.block || []).includes(t));
  return hit ? ph : null;
}
function lastDone(routineId, k) {
  for (let i = 0; i < 60; i++) { const d = peekDay(addDays(k, -i)); if (d && d.skin && d.skin[routineId]) return i; }
  return null;
}

/* ---------- Backup ---------- */
function exportData() {
  return { app: 'protokoll', schema: 4, version: APP_VERSION, exportedAt: new Date().toISOString(), settings: S.settings, meta: S.meta, foods: S.foods, days: S.days, shop: S.shop, blood: S.blood, knee: S.knee, reviews: S.reviews, photos: 'Fotos werden getrennt als ZIP gesichert (Einstellungen → Backup & Daten)' };
}
function backupDue() {
  const n = S.settings.backupDays;
  if (!n) return false;
  const daysWithData = Object.keys(S.days).length;
  if (daysWithData < 2) return false;
  const last = S.meta.lastBackup ? S.meta.lastBackup.slice(0, 10) : null;
  const snooze = S.meta.backupSnooze;
  if (snooze && snooze >= todayKey()) return false;
  if (!last) return true;
  return daysBetween(last, todayKey()) >= n;
}
function markBackup() { S.meta.lastBackup = new Date().toISOString(); S.meta.backupSnooze = null; markDirty('meta'); }
