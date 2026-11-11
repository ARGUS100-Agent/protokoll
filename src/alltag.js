/* ============================================================
   ALLTAG: bessere Alternativen, Snacks für unterwegs, Plausibilität
   ============================================================ */
/*icons: repeat moon sunrise bed */

/* Tausch-Hinweise: passt ein Lebensmittel, zeigt die App eine bessere Wahl (Wunsch vom 10.11.2026) */
const SWAPS = [
  { id: 'suess', test: (f) => /waffel|keks|cookie|kuchen|croissant|donut|muffin|gummi|fruchtgummi|bonbon/i.test(f.n) || (f.cat === 'Süßes & Snacks' && (f.v.sug || 0) >= 25 && !/schokolade 8|schokolade 9/i.test(f.n)),
    title: 'Süß, aber besser', tip: '3 Datteln mit 20 g Mandeln oder 20 g Schokolade 90 % mit Beeren: ähnlich süß, viel weniger Zucker, dafür Ballaststoffe und Magnesium.', snack: 'datteln_mandeln' },
  { id: 'jerky', test: (f) => /jerky/i.test(f.n) && (f.v.sug || 0) >= 10,
    title: 'Jerky ohne Honig', tip: 'Beef Jerky „Original“ ohne Honig oder BBQ-Soße, oder ein Skyr-Becher: gleich viel Eiweiß, deutlich weniger Zucker und Salz.', snack: 'skyr_beeren' },
  { id: 'riegel', test: (f) => /riegel|\bbar\b/i.test(f.n),
    title: 'Statt Riegel', tip: 'Skyr- oder Quarkbecher mit Banane, oder Nüsse mit Obst: mehr Eiweiß bzw. weniger Zusatzstoffe und satter.', snack: 'banane_mandeln' },
  { id: 'baecker', test: (f) => /pizza|salami|leberk|bockwurst|wiener|currywurst|hot ?dog/i.test(f.n),
    title: 'Beim Bäcker besser', tip: 'Vollkornbrötchen mit Hähnchen, Käse oder Ei und etwas Rohkost – oder eine Portion von deinem Prepmymeal in der Box mitnehmen.', snack: 'eier_paprika' },
  { id: 'getraenk', test: (f) => isLiquid(f) && (f.v.sug || 0) >= 6 && !/saft|kefir|milch|kokos|skyr|shake|smoothie/i.test(f.n),
    title: 'Zucker zum Trinken', tip: 'Lieber Wasser, Monster Zero oder Tee: flüssiger Zucker macht kaum satt.' },
];
function swapFor(food) {
  if (!food || !food.v) return null;
  return SWAPS.find((s) => { try { return s.test(food); } catch (e) { return false; } }) || null;
}
function swapHTML(food) {
  const s = swapFor(food);
  if (!s) return '';
  return `<div class="banner is-soft swap">${icon('repeat')}<div><b>${esc(s.title)}</b><span>${esc(s.tip)}</span>${s.snack ? `<button class="link-btn" data-a="snack-show">Snack-Ideen für unterwegs</button>` : ''}</div></div>`;
}
/* Tipps des Tages: was heute eingetragen ist und eine bessere Wahl hat */
function swapTips(k) {
  const seen = new Set(), out = [];
  for (const e of getDay(k).entries || []) {
    const f = FOOD[e.food], s = swapFor(f);
    if (!s || seen.has(s.id)) continue;
    seen.add(s.id);
    out.push({ kind: 'swap', title: `${f.n}: ${s.title.toLowerCase()}`, text: s.tip });
  }
  return out;
}

/* Snacks für Arbeit und Uni: mit einem Tipp eintragen */
const SNACKS = [
  { id: 'skyr_beeren', n: 'Skyr-Becher mit Beeren', w: 'Lidl, Rewe', items: [['skyr', 250], ['heidelbeeren', 100]] },
  { id: 'banane_mandeln', n: 'Banane und Mandeln', w: 'Lidl, dm', items: [['banane', 120], ['mandeln', 25]] },
  { id: 'apfel_nuesse', n: 'Apfel und Kürbiskerne', w: 'Lidl, dm', items: [['apfel', 150], ['kuerbiskerne', 20]] },
  { id: 'kefir', n: 'Kefir-Flasche (500 ml)', w: 'Lidl, Rewe', items: [['kefir', 500]] },
  { id: 'eier_paprika', n: '2 gekochte Eier und Paprika', w: 'vorbereitet', items: [['ei', 110], ['paprika_rot', 100]] },
  { id: 'datteln_mandeln', n: 'Datteln und Mandeln', w: 'dm', items: [['datteln', 30], ['mandeln', 20]] },
  { id: 'schoko_beeren', n: 'Schokolade 90 % und Beeren', w: 'Lidl', items: [['schokolade90', 20], ['heidelbeeren', 100]] },
];
function snackNut(sn) {
  const t = newTotals();
  for (const [fid, g] of sn.items) addFood(t, null, FOOD[fid], g);
  return t;
}
function snacksHTML(k) {
  const open = ui.exp.has('snacks');
  let h = `<section class="sec" id="snacks"><div class="sec-head"><h2>Snacks für unterwegs</h2><button class="link-btn" data-a="expand" data-key="snacks" aria-expanded="${open}">${open ? 'Weniger' : 'Zeigen'}</button></div>`;
  if (!open) return h + '<p class="sec-sub">Für Arbeit oder Uni: Ideen mit viel Eiweiß und wenig Zucker, mit einem Tipp eingetragen.</p></section>';
  h += '<div class="list">';
  for (const sn of SNACKS) {
    if (sn.items.some(([fid]) => !FOOD[fid])) continue;
    const t = snackNut(sn);
    h += `<div class="row-wrap"><div class="row is-static"><span class="row-main"><b>${esc(sn.n)}</b><small>${fmt(t.kcal)} kcal · ${fmt(t.p)} g Eiweiß · ${fmt(t.sug || 0)} g Zucker · ${esc(sn.w)}</small></span></div><button class="pill-btn row-act" data-a="snack-add" data-id="${sn.id}" data-date="${k}">${icon('plus')}Eintragen</button></div>`;
  }
  return h + '</div><p class="hint">Am Abend vorher einpacken: Becher, Obst und eine kleine Dose Nüsse halten einen Arbeitstag ohne Kühlschrank (Skyr und Kefir mit Kühlakku).</p></section>';
}

/* ---------- Zu viel: sofort sagen, wenn ein Eintrag etwas über das Maximum hebt ---------- */
function overKeys(k) {
  try {
    const ev = evaluate(k), plan = k >= todayKey();
    return Object.keys(ev.metrics).filter((x) => ev.metrics[x].state === 'over' || (plan && ev.metrics[x].pstate === 'over'));
  } catch (e) { return []; }
}
function overText(k, key) {
  const ev = evaluate(k), m = ev.metrics[key], meta = metaOf(key);
  const t = overTip(key, m, ev).text, i = t.indexOf('. ');
  const now = m.state === 'over', v = now ? m.v : m.pv;
  const val = m.t && m.t.max != null && !['fatPct', 'upf'].includes(key) ? ` (${now ? '' : 'Prognose '}${fmt(disp(key, v), meta.d)} von max. ${fmt(disp(key, m.t.max), meta.d)} ${meta.u})` : '';
  return `${meta.n} ${now ? 'jetzt' : 'mit deinem Plan heute'} über dem Maximum${val}: ${i > 0 ? t.slice(0, i + 1) : t}`;
}

/* ---------- Plausibilität ---------- */
function dupEntry(k, fid, minutes = 3) {
  const now = Date.now();
  return (getDay(k).entries || []).find((e) => e.food === fid && e.t && now - e.t < minutes * 60000) || null;
}

Object.assign(A, {
  'snack-show': () => { closeSheet(); ui.exp.add('snacks'); ui.ernSub = 'detail'; go('ern'); requestAnimationFrame(() => { const el = document.getElementById('snacks'); if (el) el.scrollIntoView({ block: 'start' }); }); },
  'snack-add': (el) => {
    const k = curDate(el), sn = SNACKS.find((x) => x.id === el.dataset.id);
    if (!sn) return;
    const ids = sn.items.map(([fid, g]) => addEntry(k, fid, g, 'snack'));
    render();
    toast(`${sn.n} eingetragen`, () => { mutDay(k, (d) => { d.entries = d.entries.filter((e) => !ids.includes(e.id)); }); render(); });
  },
});

/* ---------- Tagesrhythmus aus Garmin ----------
   Aufstehen: Garmin-Wert des Tages, sonst typischer Wert für diesen Wochentag, sonst Profil.
   Schlafenszeit: morgiges Aufstehen (selbst eingestellt, Garmin oder Wochentags-Muster)
   minus Schlafbedarf (Garmin) minus 15 Min. zum Einschlafen. */
function rhMedian(a) { const s = a.slice().sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; }
function rhWakeOf(d) { const t = d && d.health && d.health.wakeTime; const m = typeof t === 'string' ? timeToMin(t) : null; return m != null && m >= 180 && m <= 780 ? m : null; }
function rhNeed(v) { const n = Number(v); return v != null && n >= 300 && n <= 720 ? Math.round(n) : null; }
function rhPredWake(k) {
  const wd = weekday(k), same = [], all = [];
  for (let i = 1; i <= 42; i++) { const x = addDays(k, -i), w = rhWakeOf(peekDay(x)); if (w == null) continue; all.push(w); if (weekday(x) === wd) same.push(w); }
  if (same.length >= 2) return { m: Math.round(rhMedian(same)), src: 'wochentag' };
  if (all.length >= 3) return { m: Math.round(rhMedian(all)), src: 'schnitt' };
  return null;
}
function rhProfile() { const p = S.settings.profile; const w = timeToMin(p.wake) ?? 510, b = timeToMin(p.sleep) ?? 1350; return { wake: w, bed: b < 720 ? b + 1440 : b }; }
function rhythm(k = todayKey()) {
  const c = rhythm.c || (rhythm.c = { v: -1, m: new Map() });
  if (c.v !== calcVersion) { c.v = calcVersion; c.m.clear(); }
  if (c.m.has(k)) return c.m.get(k);
  const pr = rhProfile(), d = peekDay(k), nx = peekDay(addDays(k, 1));
  let wake = rhWakeOf(d), wakeSrc = wake == null ? null : d.gar && d.gar.wakeTime === d.health.wakeTime ? 'garmin' : 'eingetragen';
  if (wake == null) { const pv = peekDay(addDays(k, -1)), w = pv && pv.hd && pv.hd.wakeNext ? timeToMin(pv.hd.wakeNext) : null; if (w != null) { wake = w; wakeSrc = 'eingestellt'; } } // am Vortag „morgen raus um …“
  const win = rhWindow(k);
  if (wake == null && win) { wake = win.wake; wakeSrc = 'fenster'; } // Schlaffenster (2.9.0)
  if (wake == null) { const p = rhPredWake(k); if (p) { wake = p.m; wakeSrc = p.src; } }
  if (wake == null) { wake = pr.wake; wakeSrc = 'profil'; }
  /* Schlafbedarf für die kommende Nacht: Garmin (Nacht danach bzw. „nächster Schlafbedarf“), sonst letzte Nacht, sonst Schnitt */
  const needOf = (dd) => (dd && dd.health ? rhNeed(dd.health.sleepNeed) : null);
  let need = needOf(nx) ?? rhNeed(d && d.gx && d.gx.needNext) ?? needOf(d), needSrc = 'garmin';
  if (need == null) { const hist = rangeKeys(7, k).map((x) => needOf(peekDay(x))).filter((v) => v != null); if (hist.length) { need = Math.round(rhMedian(hist)); needSrc = 'schnitt'; } }
  if (need == null) { need = 480; needSrc = 'standard'; }
  let wakeNext = d && d.hd && d.hd.wakeNext ? timeToMin(d.hd.wakeNext) : null, nextSrc = 'eingestellt';
  if (wakeNext == null) { wakeNext = rhWakeOf(nx); nextSrc = 'garmin'; }
  if (wakeNext == null && win) { wakeNext = win.wake; nextSrc = 'fenster'; }
  if (wakeNext == null) { const p = rhPredWake(addDays(k, 1)); if (p) { wakeNext = p.m; nextSrc = p.src; } }
  let bed = pr.bed, bedSrc = 'profil';
  const rec = sleepAcct(k).rec; // Schlafkonto im Minus: früher ins Bett, Aufstehen bleibt (2.10.0)
  if (nextSrc === 'fenster') { bed = clamp(win.bed - rec, 20 * 60, 25 * 60); bedSrc = 'fenster'; } // Fenster: gleiche Zeit jeden Abend
  else if (wakeNext != null) { bed = clamp(wakeNext + 1440 - need - 15 - (nextSrc === 'eingestellt' ? rec : 0), 20 * 60, 25 * 60); bedSrc = nextSrc; }
  const r = { wake, wakeSrc, bed, bedSrc, need, needSrc, wakeNext, win, rec, live: wakeSrc !== 'profil' || bedSrc !== 'profil' };
  c.m.set(k, r);
  return r;
}
/* Planzeiten wandern mit: Morgen-Blöcke mit dem Aufstehen, Abend-Blöcke mit der Schlafenszeit, der Rest bleibt */
function rhShift(t, k) {
  if (t == null) return null;
  const r = rhythm(k || todayKey());
  if (!r.live) return t;
  const pr = rhProfile();
  if (t - pr.wake >= -60 && t - pr.wake <= 120) return clamp(r.wake + (t - pr.wake), 0, 1439);
  if (pr.bed - t >= 0 && pr.bed - t <= 210) return clamp(r.bed - (pr.bed - t), 0, 1439);
  return t;
}
function cafGap() { return clamp(Number(S.settings.caf.gapH) || 8, 4, 12) * 60; }
function cafStopText() { if (cafMode() === 'dose') return 'je nach Dosis: Kaffee ~8 Std., Monster Zero ~11 Std. vor dem Schlafen'; const h = cafGap() / 60; return `${fmt(h, h % 1 ? 1 : 0)} Std. vor dem Schlafen`; }
function rhythmLine(k) {
  const r = rhythm(k), nxt = addDays(k, 1);
  const nw = (t) => `<span class="nw">${esc(t)}</span>`;
  const wakeTxt = { garmin: `Aufgewacht ${minToTime(r.wake)}`, eingetragen: `Aufgestanden ${minToTime(r.wake)}`, eingestellt: `Aufstehen ${minToTime(r.wake)} (eingestellt)` }[r.wakeSrc] || `Aufstehen ~${minToTime(r.wake)}`;
  const src = { eingestellt: '', garmin: '', fenster: `dein Fenster ${rhRange(r.wakeNext ?? 0)}`, wochentag: `wie meist am ${WD_LONG[weekday(nxt)]}`, schnitt: 'dein Schnitt', profil: 'aus dem Profil' }[r.bedSrc];
  const next = `${k === todayKey() ? 'Morgen' : 'Am nächsten Tag'} raus ${minToTime(r.wakeNext ?? rhProfile().wake)}${src ? ` (${src})` : ''}`;
  const third = (r.rec ? `${nw(`${fmtDur(r.rec)} früher (Schlafkonto)`)} · ` : '') + (r.bedSrc === 'fenster' ? `${nw(`Einschlafen ${rhRange(r.win.onset - r.rec)}`)} · ${nw(wakeTxt)}` : `${nw(wakeTxt)} · ${nw('Schlafbedarf ' + fmtDur(r.need))}`);
  return `<div class="rhythm"><span class="rh-ic">${icon('moon')}</span><span class="rh-txt"><b>Schlafenszeit ${minToTime(r.bed)}</b><small>${esc(next)}</small><small>${third}</small></span><button class="pill-btn" data-a="rh-edit" data-date="${k}">Ändern</button></div>`;
}
function sheetRhythm(k) {
  const r = rhythm(k), d = peekDay(k);
  ui.sheet = { type: 'rhythm', k };
  const needTxt = { garmin: 'laut Garmin', schnitt: 'dein Garmin-Schnitt', standard: 'Standard, bis Garmin ihn kennt' }[r.needSrc];
  openSheet(`<h3 class="sheet-title">Wann musst du ${k === todayKey() ? 'morgen' : 'am nächsten Tag'} raus?</h3>
    <p class="hint">${r.win ? `Ohne Eingabe gilt dein Schlaffenster: einschlafen ${rhRange(r.win.onset)}, aufstehen ${rhRange(r.win.wake)}. Musst du früher raus, stell es hier ein: dann rechnet die App mit deinem Schlafbedarf (${fmtDur(r.need)}, ${needTxt}) plus 15 Min. zum Einschlafen.` : `Aus deinem Aufstehen und deinem Schlafbedarf (${fmtDur(r.need)}, ${needTxt}) plus 15 Min. zum Einschlafen rechnet die App deine Schlafenszeit.`} Danach richten sich Koffein-Stopp, letzte Mahlzeit, Bildschirm-Pause und die Abend-Blöcke im Plan.</p>
    <div class="form"><div class="frow"><span class="flabel">Raus um</span><div class="fin"><input type="time" id="rh-wake" value="${r.wakeNext != null ? minToTime(r.wakeNext) : ''}"></div></div></div>
    <div class="sheet-acts"><button class="btn is-accent" data-a="rh-save">Übernehmen</button>${d && d.hd && d.hd.wakeNext ? '<button class="btn" data-a="rh-reset">Wieder automatisch</button>' : '<button class="btn is-ghost" data-a="sheet-close">Abbrechen</button>'}</div>`);
}
Object.assign(A, {
  'rh-edit': (el) => sheetRhythm(el.dataset.date || todayKey()),
  'rh-save': () => {
    const s = ui.sheet; if (!s) return;
    const v = ($('#rh-wake') || {}).value;
    const m = timeToMin(v);
    if (m == null) { toast('Bitte eine Uhrzeit wählen'); return; }
    if (m < 180 || m > 780) { toast('Bitte eine Uhrzeit zwischen 03:00 und 13:00'); return; }
    mutDay(s.k, (d) => { d.hd = d.hd || {}; d.hd.wakeNext = v; });
    closeSheet(); render();
    const r = rhythm(s.k);
    toast(`Schlafenszeit ${minToTime(r.bed)} · Koffein bis ${minToTime(cafCutoff(s.k))}`);
  },
  'rh-reset': () => { const s = ui.sheet; if (!s) return; mutDay(s.k, (d) => { if (d.hd) delete d.hd.wakeNext; }); closeSheet(); render(); },
});

/* ---------- Eigene Trainingsbereitschaft (0–100) ----------
   Garmins Schnittstelle gibt die Trainingsbereitschaft nicht heraus. Die App rechnet sie aus denselben
   Bausteinen wie die Uhr: Schlaf letzte Nacht, Schlaf der letzten Nächte gegen den Bedarf, HRV gegen
   deinen Normalbereich, Ruhepuls, Body Battery am Morgen, Stress gestern und Belastung der letzten Tage
   (Dauer × Anstrengung, „Session-RPE“). Ein selbst eingetragener Wert von der Uhr hat Vorrang. */
function trainLoad(k) { const d = peekDay(k); return ((d && d.trainings) || []).filter((t) => !trainType(t).light).reduce((a, t) => a + (Number(t.dur) || 45) * (Number(t.int) || 5), 0); }
function hrvRange(k) {
  for (let i = 0; i < 7; i++) { const d = peekDay(addDays(k, -i)); if (d && d.gx && Array.isArray(d.gx.hrvBase)) return d.gx.hrvBase; }
  const b = baselineOf('hrv', k, 14);
  return b ? [Math.round(b * 0.9), Math.round(b * 1.1)] : null;
}
function readinessCalc(k) {
  const d = peekDay(k), h = (d && d.health) || {};
  const y = peekDay(addDays(k, -1)), yh = (y && y.health) || {};
  const parts = [];
  const add = (id, n, w, s, v) => { if (s != null && isFinite(s)) parts.push({ id, n, w, s: clamp(Math.round(s), 0, 100), v }); };
  if (h.sleepScore != null) add('sleep', 'Schlaf', 25, Number(h.sleepScore), `Score ${fmt(h.sleepScore)}`);
  const ratios = [0, 1, 2].map((i) => { const hh = (peekDay(addDays(k, -i)) || {}).health || {}; const dur = Number(hh.sleepDur); return dur > 0 ? dur / (rhNeed(hh.sleepNeed) || 480) : null; }).filter((v) => v != null);
  if (ratios.length >= 2) { const r = mean(ratios); add('hist', 'Schlaf 3 Nächte', 10, ((r - 0.7) / 0.3) * 100, `${fmt(r * 100)} % vom Bedarf`); }
  if (h.hrv != null) {
    const rg = hrvRange(k), v = Number(h.hrv);
    if (rg) { const [lo, hi] = rg; add('hrv', 'HRV', 25, v >= lo ? (v <= hi ? 75 + (25 * (v - lo)) / Math.max(1, hi - lo) : 90) : 75 - ((lo - v) / lo) * 300, `${fmt(v)} ms (normal ${lo}–${hi})`); }
  }
  if (!parts.some((p) => p.id === 'hrv') && h.hrvStatus) add('hrv', 'HRV', 25, { Ausgeglichen: 85, Unausgeglichen: 50, Niedrig: 25, Schlecht: 10 }[h.hrvStatus], h.hrvStatus);
  if (h.rhr != null) { const b = baselineOf('rhr', k); if (b) add('rhr', 'Ruhepuls', 10, 100 - Math.max(0, Number(h.rhr) - b) * 12, `${fmt(h.rhr)} (Ø ${fmt(b)})`); }
  if (h.bbMorning != null) add('bb', 'Body Battery', 15, Number(h.bbMorning), fmt(h.bbMorning));
  if (yh.stress != null) add('stress', 'Stress gestern', 10, 100 - Math.max(0, Number(yh.stress) - 25) * 2, `Ø ${fmt(yh.stress)}`);
  /* Belastung: gestern + halber Vortag gegen deinen Schnitt (nur Tage, seit du die App nutzt).
     Bei Training jeden zweiten Tag ist das Doppelte vom Tagesschnitt „normal“. */
  const first = Object.keys(S.days).sort()[0] || k;
  const win = rangeKeys(28, addDays(k, -1)).filter((x) => x >= first);
  const loads = win.map(trainLoad);
  if (win.length >= 7 && loads.filter((v) => v > 0).length >= 3) {
    const chronic = Math.max(150, mean(loads)), acute = trainLoad(addDays(k, -1)) + 0.5 * trainLoad(addDays(k, -2));
    const ratio = acute / (2 * chronic);
    add('load', 'Belastung', 15, ratio <= 1 ? 100 : 100 - (ratio - 1) * 60, acute ? `${fmt(ratio * 100)} % von normal` : 'zuletzt frei');
  }
  if (parts.length < 3 || !parts.some((p) => p.id === 'sleep' || p.id === 'hrv')) return null;
  const W = parts.reduce((a, p) => a + p.w, 0);
  return { score: Math.round(parts.reduce((a, p) => a + p.w * p.s, 0) / W), parts };
}
function readinessOf(k) {
  const c = readinessOf.c || (readinessOf.c = { v: -1, m: new Map() });
  if (c.v !== calcVersion) { c.v = calcVersion; c.m.clear(); }
  if (c.m.has(k)) return c.m.get(k);
  const d = peekDay(k), own = readinessCalc(k);
  const raw = d && d.health ? d.health.readiness : null;
  const man = raw != null && raw !== '' && isFinite(Number(raw)) ? Number(raw) : null;
  const r = man != null ? { score: man, src: 'eingetragen', parts: own ? own.parts : [], own: own ? own.score : null } : own ? { ...own, src: 'eigen', own: own.score } : null;
  c.m.set(k, r);
  return r;
}
function readinessLabel(s) { return s >= 75 ? 'hoch' : s >= 50 ? 'mittel' : s >= 25 ? 'niedrig' : 'sehr niedrig'; }
