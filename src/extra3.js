/* ============================================================
   PAKET 3 (seit 2.18.0, Ideen vom 18.11.2026): Erholung, Ernährung, Fortschritt, Lernen
   - Bereitschaft 2.0: HRV-7-Tage-Schnitt gegen den Normalbereich (Plews/Buchheit); liegt er darunter oder meldet
     Garmin „Niedrig“, gibt es höchstens 70 („mittel“).
   - Infekt-Frühwarnung: Ruhepuls über normal plus HRV tief oder Schlaf auffällig, zwei Tage in Folge
     (Mishra 2020: 81 % der Infizierten zeigten Veränderungen bei Puls, Schritten oder Schlaf).
   - Schlaf-Prognose am Abend aus den eigenen Mustern.
   - Ernährung: Eiweiß-Plan für Haut-Phase 2, Eiweiß pro Mahlzeit (0,40–0,55 g/kg, Iraki 2019), Natrium mit
     Blutdruck, Kosten pro 100 g Eiweiß.
   - Fortschritt: Meilensteine, Ziele mit Prognose, Monatsbericht von Claude, Rückblick 2026, Daten-Labor, CSV-Export.
   - Lernen & Fokus: Fokus-Blöcke mit Bewertung und Mustern, Wissens-Karten mit verteiltem Wiederholen (Cepeda 2006).
   ============================================================ */
/*icons: trophy brain flask-conical download thermometer moon sparkles target timer*/

/* ---------- Bereitschaft 2.0 ---------- */
function hrv7(k) {
  const h = ((peekDay(k) || {}).health) || {}, rg = hrvRange(k);
  if (!rg) return null;
  let avg = Number(h.hrvWeek) > 0 ? Number(h.hrvWeek) : null;
  if (avg == null) { const v = rangeKeys(7, k).map((x) => Number(((peekDay(x) || {}).health || {}).hrv)).filter((x) => x > 0); if (v.length >= 4) avg = mean(v); }
  return avg ? { avg, lo: rg[0], hi: rg[1] } : null;
}
const _readinessCalcOrig = readinessCalc;
readinessCalc = function (k) {
  const r = _readinessCalcOrig(k);
  if (!r) return r;
  const w = hrv7(k), st = (((peekDay(k) || {}).health) || {}).hrvStatus;
  if (!w && st !== 'Niedrig') return r;
  const parts = r.parts.slice();
  if (w) parts.push({ id: 'hrv7', n: 'HRV 7 Tage', w: 15, s: clamp(Math.round(w.avg >= w.lo ? (w.avg <= w.hi ? 80 : 90) : 75 - ((w.lo - w.avg) / w.lo) * 300), 0, 100), v: `Ø ${fmt(w.avg)} ms (normal ${w.lo}–${w.hi})` });
  const W = parts.reduce((a, p) => a + p.w, 0);
  let score = Math.round(parts.reduce((a, p) => a + p.w * p.s, 0) / W);
  const low = (w && w.avg < w.lo) || st === 'Niedrig';
  let cap = null;
  if (low && score > 70) { score = 70; cap = 'HRV-Wochenschnitt unter deinem Normalbereich: Bereitschaft höchstens 70 („mittel“), bis er sich erholt. Einzelne Tage zählen weniger als der 7-Tage-Trend.'; }
  return { score, parts, cap };
};

/* ---------- Infekt-Frühwarnung ---------- */
function illnessSignal(k = todayKey()) {
  const day = (x) => { const h = ((peekDay(x) || {}).health) || {}, b = baselineOf('rhr', x, 14), rg = hrvRange(x); return { rhr: h.rhr != null && b ? Number(h.rhr) - b : null, hrvLow: h.hrv != null && rg ? Number(h.hrv) < rg[0] : null, sleepBad: h.sleepScore != null ? Number(h.sleepScore) < 60 : null }; };
  const a = day(k), b = day(addDays(k, -1));
  const rhrUp = a.rhr != null && b.rhr != null && a.rhr >= 5 && b.rhr >= 4;
  const other = (a.hrvLow && b.hrvLow) || (a.sleepBad && b.sleepBad);
  if (!(rhrUp && other)) return null;
  return { rhr: a.rhr, hrvLow: a.hrvLow && b.hrvLow, sleepBad: a.sleepBad && b.sleepBad };
}
function illnessCard(k) {
  const s = k === todayKey() ? illnessSignal(k) : null;
  if (!s) return '';
  const why = [`Ruhepuls ${fmt(s.rhr)} Schläge über normal`, s.hrvLow ? 'HRV unter deinem Bereich' : '', s.sleepBad ? 'Schlaf auffällig schlecht' : ''].filter(Boolean).join(', ');
  return `<div class="banner is-warn">${icon('thermometer')}<div><b>Dein Körper arbeitet an etwas</b><span>${esc(why)} – zwei Tage in Folge. So kündigen sich Infekte oft an, bevor man etwas merkt. Heute lieber locker, viel trinken, früh ins Bett. Bei Fieber oder Halsschmerzen: Trainingspause.</span></div></div>`;
}

/* ---------- Schlaf-Prognose ---------- */
function sleepForecast(k = todayKey()) {
  const base = rangeKeys(14, k).map((x) => Number(((peekDay(x) || {}).health || {}).sleepScore)).filter((v) => v > 0);
  if (base.length < 5) return null;
  const avg = mean(base);
  let adj = 0;
  const used = [], levers = [];
  for (const p of (muster().found || []).filter((x) => x.oid === 'sleep')) {
    let f = null;
    try { f = MU_FEAT[p.fid].f(k); } catch (e) { f = null; }
    const share = p.nA / (p.nA + p.nB), mid = p.ma * share + p.mb * (1 - share);
    if (f == null) { if (p.good) levers.push(p); continue; }
    const d = ((f ? p.ma : p.mb) - mid) * 0.6;
    adj += d; used.push({ n: MU_FEAT[p.fid].n(), d, f });
    if (!f && p.good) levers.push(p);
  }
  return { avg, est: clamp(Math.round(avg + adj), 0, 100), used, levers: levers.slice(0, 2) };
}
function sleepForecastCard(k) {
  if (k !== todayKey() || nowMin() < 17 * 60) return '';
  const f = sleepForecast(k);
  if (!f || !f.used.length) return '';
  return `<section class="card"><div class="sec-head"><h2>${icon('moon')} Prognose für heute Nacht</h2><span class="count">Ø ${fmt(f.avg)}</span></div><p class="sec-sub">Sleep Score etwa <b>${fmt(f.est)}</b> – ${f.used.map((u) => `${esc(u.n)} ${u.d >= 0 ? '+' : '−'}${fmt(Math.abs(u.d))}`).join(', ')}.</p>${f.levers.length ? `<p class="hint">${icon('sparkles')} Hebel für heute: ${f.levers.map((p) => esc(MU_FEAT[p.fid].n())).join(', ')} (in deinen Daten ${fmt(Math.abs(p0(f.levers).diff))} Punkte).</p>` : ''}<p class="hint">Aus deinen eigenen Mustern der letzten 8 Wochen – eine Schätzung, kein Versprechen.</p></section>`;
}
function p0(a) { return a[0]; }

/* ---------- Ernährung ---------- */
function wheyFood(f) { return !!(f && ((f.tags || []).some((t) => /whey|milbona/i.test(t)) || /whey|milbona/i.test(f.n || ''))); }
function skinPhase2() { return ((S.settings.skin || {}).phases || []).find((p) => /whey/i.test(JSON.stringify(p))) || null; }
function lineP(ln) { const f = ln.food; return f && f.v && ln.g > 0 ? ((Number(f.v.p) || 0) * ln.g) / (f.base || 100) : 0; }
function proteinPhaseHTML(k) {
  const ph = skinPhase2();
  if (!ph || !ph.start || k < addDays(ph.start, -14) || (ph.end && k > ph.end)) return '';
  const days = rangeKeys(30, addDays(k, -1)).map((x) => ({ x, p: dayLines(x).filter((l) => wheyFood(l.food)).reduce((a, l) => a + lineP(l), 0) })).filter((r) => r.p > 0);
  const freq = {};
  for (const x of rangeKeys(30, k)) for (const l of dayLines(x)) { const f = l.food; if (!f || !f.v || wheyFood(f) || !(Number(f.v.p) >= 10) || !(Number(f.v.kcal) > 0)) continue; const id = f.id || f.n; freq[id] = freq[id] || { f, n: 0 }; freq[id].n++; }
  const alt = Object.values(freq).sort((a, b) => b.f.v.p / b.f.v.kcal - a.f.v.p / a.f.v.kcal).slice(0, 5);
  const gap = days.length ? mean(days.map((r) => r.p)) : 0;
  const active = k >= ph.start;
  return `<section class="sec"><div class="sec-head"><h2>Eiweiß in Haut-Phase 2</h2><span class="count">${active ? 'läuft' : `ab ${esc(dShort(ph.start))}`}</span></div>
    <p class="sec-sub">${days.length ? `An ${days.length} der letzten 30 Tage kamen im Schnitt ${fmt(gap)} g Eiweiß aus Whey oder Milbona-Shakes.` : 'Zuletzt keine Shakes eingetragen.'} ${gap ? `Diese Lücke füllst du ohne Shakes zum Beispiel mit:` : ''}</p>
    ${alt.length && gap ? `<div class="list">${alt.map((a) => `<div class="row is-static"><span class="row-main"><b>${esc(a.f.n)}</b><small>${fmt(a.f.v.p, 1)} g Eiweiß pro ${a.f.base || 100} g · ${fmt((a.f.v.p / a.f.v.kcal) * 100, 1)} g je 100 kcal</small></span><span class="count">${fmt(Math.ceil((gap / a.f.v.p) * (a.f.base || 100) / 10) * 10)} g</span></div>`).join('')}</div><p class="hint">Rechts: Menge für die ganze Lücke. Aus Lebensmitteln, die du in den letzten 30 Tagen gegessen hast.</p>` : ''}</section>`;
}
const MEAL_N = { fruehstueck: 'Frühstück', mittag: 'Mittag', abend: 'Abend', snack: 'Snack', nacht: 'Spät' };
function mealProtein(k) {
  const g = {};
  const blocks = Object.fromEntries((S.settings.plan || []).map((b) => [b.id, b]));
  for (const l of dayLines(k)) {
    if (l.src === 'caf') continue;
    const key = l.src === 'plan' ? (blocks[l.block] ? blocks[l.block].n : 'Plan') : MEAL_N[l.meal] || 'Weitere';
    g[key] = (g[key] || 0) + lineP(l);
  }
  return Object.entries(g).filter(([, p]) => p >= 3);
}
function mealProteinHTML(k) {
  const m = mealProtein(k);
  if (!m.length) return '';
  const w = trendInfo(k).trend || Number((S.settings.profile || {}).weight) || 80, min = Math.round(w * 0.4);
  return `<section class="sec"><div class="sec-head"><h2>Eiweiß pro Mahlzeit</h2><span class="count">Ziel ab ${min} g</span></div><div class="chips chips-tight">${m.map(([n, p]) => `<span class="chip chip-sm is-static${p >= min ? ' is-on' : ''}">${esc(n)} ${fmt(p)} g${p >= min ? ' ✓' : ''}</span>`).join('')}</div>
    <p class="hint">Etwa 0,4–0,55 g Eiweiß je kg Körpergewicht pro Mahlzeit, verteilt auf 3–6 Mahlzeiten (Iraki 2019) – bei dir ab etwa ${min} g. Kleine Snacks müssen das nicht schaffen.</p></section>`;
}
function sodiumHTML(k) {
  const days = rangeKeys(7, k).map((x) => ({ x, na: dayIntake(x) != null && dayIntake(x) > 800 ? computeTotals(x, false).tot.na || 0 : null }));
  const vals = days.filter((d) => d.na != null);
  if (!vals.length) return '';
  const avg = mean(vals.map((d) => d.na)), bp = typeof bpWeek === 'function' ? bpWeek(k) : null;
  const pmm = (S.foods.custom || []).filter((f) => /prepmymeal/i.test(f.n) && f.v && f.v.na != null).sort((a, b) => b.v.na - a.v.na);
  const bar = (v) => `<i style="height:${Math.max(3, Math.min(60, (v / 8000) * 60))}px" class="${v > 4000 ? 'hi' : v > 2300 ? 'mid' : 'lo'}"></i>`;
  return `<section class="sec"><div class="sec-head"><h2>Natrium</h2><span class="count">Ø ${fmt(avg / 1000, 1)} g/Tag</span></div>
    <div class="na-bars">${days.map((d) => (d.na != null ? bar(d.na) : '<i class="none"></i>')).join('')}</div>
    <p class="sec-sub">${bp && bp.sys ? `Blutdruck Ø ${fmt(bp.sys)}/${fmt(bp.dia)}. ` : ''}Der WHO-Richtwert für die Allgemeinheit liegt unter 2 g Natrium am Tag; wer viel schwitzt, braucht mehr. Viel Salz bindet Wasser – das sieht man oft am nächsten Morgen auf der Waage.</p>
    ${pmm.length ? `<h5>Prepmymeal nach Natrium</h5><div class="list">${pmm.slice(0, 8).map((f) => `<div class="row is-static"><span class="row-main"><b>${esc(f.n.replace(/^prepmymeal\s*/i, ''))}</b></span><span class="count${f.v.na >= 500 ? ' is-warn' : ''}">${fmt(f.v.na)} mg/100 g</span></div>`).join('')}</div>` : ''}</section>`;
}
function foodPrice(id) { const v = Number((S.settings.prices || {})[id]); return v > 0 ? v : null; }
function recentFoodsP(k = todayKey(), days = 30) {
  const m = {};
  for (const x of rangeKeys(days, k)) for (const l of dayLines(x)) { const f = l.food; if (!f || l.src === 'caf') continue; const id = f.id; if (!id) continue; m[id] = m[id] || { f, n: 0, g: 0 }; m[id].n++; m[id].g += Number(l.g) || 0; }
  return Object.values(m).sort((a, b) => b.n - a.n);
}
function costHTML(k) {
  const r = recentFoodsP(k), priced = r.filter((x) => foodPrice(x.f.id));
  const eur = priced.reduce((a, x) => a + (x.g / 1000) * foodPrice(x.f.id), 0);
  const per = priced.filter((x) => Number(x.f.v && x.f.v.p) >= 5).map((x) => ({ n: x.f.n, c: (foodPrice(x.f.id) * 10) / (x.f.v.p * (100 / (x.f.base || 100))) })).sort((a, b) => a.c - b.c);
  return `<section class="sec"><div class="sec-head"><h2>Kosten</h2><span class="count">${priced.length ? `${fmt(eur)} € in 30 Tagen` : 'noch keine Preise'}</span></div>
    ${per.length ? `<h5>€ pro 100 g Eiweiß</h5><div class="list">${per.slice(0, 8).map((x) => `<div class="row is-static"><span class="row-main"><b>${esc(x.n)}</b></span><span class="count">${fmt(x.c, 2)} €</span></div>`).join('')}</div>` : ''}
    <p class="hint">${priced.length ? `Preise für ${priced.length} von ${r.length} Lebensmitteln der letzten 30 Tage.` : 'Trag Preise pro kg ein (zum Beispiel vom Kassenbon), dann rechnet die App dein Essensbudget und die günstigsten Eiweißquellen.'}</p>
    <div class="row-btns"><button class="pill-btn" data-a="prices-open">Preise eintragen</button></div></section>`;
}
function sheetPrices() {
  ui.sheet = { type: 'prices' };
  const r = recentFoodsP().slice(0, 25);
  openSheet(`<h3 class="sheet-title">Preise pro kg</h3><p class="hint">Die Lebensmittel der letzten 30 Tage, die häufigsten zuerst. Bei Stückware den Preis auf 1 kg umrechnen (Packungspreis ÷ Gewicht × 1000).</p>
    <div class="form">${r.map((x) => `<div class="frow"><span class="flabel">${esc(x.f.n)}</span><div class="fin"><input type="text" inputmode="decimal" data-c="price" data-id="${esc(x.f.id)}" value="${numIn(foodPrice(x.f.id), 2)}" placeholder="–"><span class="unit">€/kg</span></div></div>`).join('')}</div>
    <div class="sheet-acts"><button class="btn is-accent" data-a="prices-done">Fertig</button></div>`);
}
if (typeof vEval === 'function') {
  const _vEvalOrig = vEval;
  vEval = function (k) { return _vEvalOrig(k) + proteinPhaseHTML(k) + mealProteinHTML(k) + sodiumHTML(k) + costHTML(k); };
}

/* ---------- Fortschritt: Meilensteine ---------- */
function streakDates(keys, ok, n) { let run = 0; for (const k of keys) { if (ok(k)) { run++; if (run >= n) return k; } else run = 0; } return null; }
function progMilestones() {
  const keys = Object.keys(S.days).sort(), out = [];
  const add = (id, n, k, ic = 'trophy') => { if (k) out.push({ id, n, k, ic }); };
  const mcOk = (k) => { const d = peekDay(k); return !!(d && d.mc && Object.keys(d.mc).length); };
  add('mc7', '7 Morgen-Checks am Stück', streakDates(keys, mcOk, 7), 'sunrise'); add('mc30', '30 Morgen-Checks am Stück', streakDates(keys, mcOk, 30), 'sunrise');
  const sl = (k) => Number(((peekDay(k) || {}).health || {}).sleepScore) >= 80;
  add('sleep7', '7 Nächte in Folge Sleep Score ab 80', streakDates(keys, sl, 7), 'moon');
  const sk = keys.filter((k) => (peekDay(k).skin || {}).score != null);
  add('skin7', 'Hautbild 7 Einträge in Folge ab 7', streakDates(sk, (k) => peekDay(k).skin.score >= 7, 7), 'sparkles');
  const pmin = ((S.settings.targets || {}).p || {}).min || 160;
  add('p14', `14 Tage in Folge mindestens ${pmin} g Eiweiß`, streakDates(keys, (k) => dayIntake(k) != null && computeTotals(k, false).tot.p >= pmin, 14), 'salad');
  let gym = 0, bjj = 0;
  const gymAt = {}, bjjAt = {};
  for (const k of keys) for (const t of peekDay(k).trainings || []) { if (isGymT(t)) { gym++; if ([10, 25, 50, 100].includes(gym)) gymAt[gym] = k; } if (isBjj(t)) { bjj++; if ([10, 25, 50].includes(bjj)) bjjAt[bjj] = k; } }
  for (const [n, k] of Object.entries(gymAt)) add('gym' + n, `${n} Gym-Einheiten`, k, 'dumbbell');
  for (const [n, k] of Object.entries(bjjAt)) add('bjj' + n, `${n}× BJJ`, k, 'swords');
  const w = weightSeries('weight'); if (w.length >= 30) add('w30', '30 Wiegungen', w[29].k, 'scale');
  const md = measDays(); if (md.length) add('meas1', 'Erste Körpermaße', md[0], 'ruler');
  // e1RM-Marken: erst ab der zweiten Einheit (die erste ist der Ausgangswert), je Einheit nur die höchste neue Marke
  for (const id of allGymExIds()) { const ex = kxEx(id) || {}; if (!ex.multi) continue; let best = 0; for (const h of exHistory(id)) { if (best > 0) { const m = [60, 80, 100, 120, 140, 160].filter((x) => best < x && h.best.v >= x).pop(); if (m) add(`e1rm_${id}_${m}`, `${ex.n}: e1RM ${m} kg`, h.k, 'trophy'); } best = Math.max(best, h.best.v); } }
  return out.sort((a, b) => (a.k < b.k ? 1 : -1));
}
function msBanner(k) {
  if (k !== todayKey()) return '';
  const seen = new Set(S.settings.msSeen || []), m = progMilestones().find((x) => x.k >= addDays(k, -2) && !seen.has(x.id));
  return m ? `<div class="banner is-soft">${icon(m.ic)}<div><b>Meilenstein: ${esc(m.n)}</b><span>Erreicht am ${esc(dShort(m.k))}. Alle Meilensteine unter Fortschritt.</span></div><div class="banner-acts"><button class="link-btn" data-a="ms-seen" data-id="${esc(m.id)}">Super</button></div></div>` : '';
}
function vMeilensteine() {
  const m = progMilestones();
  if (!m.length) return emptyState('Noch keine Meilensteine – die ersten kommen schnell: 7 Morgen-Checks am Stück, 10 Gym-Einheiten, 30 Wiegungen …');
  return `<div class="list ms-list">${m.map((x) => `<div class="row is-static"><span class="area-ic">${icon(x.ic)}</span><span class="row-main"><b>${esc(x.n)}</b><small>${esc(fmtDate(x.k, { day: 'numeric', month: 'long', year: 'numeric' }))}</small></span></div>`).join('')}</div>`;
}

/* ---------- Ziele mit Prognose ---------- */
function slopeOf(pts) { if (pts.length < 2) return null; const n = pts.length, mx = mean(pts.map((p) => p[0])), my = mean(pts.map((p) => p[1])); const sxx = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0); return sxx ? pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / sxx : null; }
function goalState(g, k = todayKey()) {
  let cur = null, rate = null;
  if (g.type === 'gewicht') { const t = trendInfo(k); cur = t.trend || null; rate = t.rate; }
  else if (g.type === 'bauch') { const s = measSeries('waist').filter((x) => x.k >= addDays(k, -84)); cur = s.length ? s[s.length - 1].v : null; const sl = slopeOf(s.map((x) => [daysBetween(k, x.k), x.v])); rate = sl != null ? sl * 7 : null; }
  else if (g.type === 'e1rm') { const h = exHistory(g.ex).filter((x) => x.k >= addDays(k, -70)); cur = h.length ? Math.max(...h.slice(-2).map((x) => x.best.v)) : null; const sl = slopeOf(h.map((x) => [daysBetween(k, x.k), x.best.v])); rate = sl != null && h.length >= 3 ? sl * 7 : null; }
  if (cur == null) return { cur, rate, eta: null, txt: 'noch zu wenige Daten' };
  const d = g.target - cur;
  if (Math.abs(d) < (g.type === 'e1rm' ? 0.5 : 0.1)) return { cur, rate, eta: k, txt: 'erreicht 🎉' };
  if (rate == null || Math.abs(rate) < 1e-3 || Math.sign(rate) !== Math.sign(d)) return { cur, rate, eta: null, txt: rate == null ? 'Tempo noch unklar' : 'beim jetzigen Tempo nicht – Richtung stimmt nicht' };
  const weeks = d / rate, eta = addDays(k, Math.round(weeks * 7));
  return { cur, rate, eta, txt: weeks > 104 ? 'in über 2 Jahren' : `etwa ${fmtDate(eta, { month: 'long', year: 'numeric' })}` };
}
const GOAL_T = { gewicht: ['Trendgewicht', 'kg'], bauch: ['Bauchumfang', 'cm'], e1rm: ['e1RM', 'kg'] };
function vZiele() {
  const goals = S.settings.goals2 || [];
  let h = `<p class="sec-sub">Ziel eintragen – die App rechnet aus deinem Trend, wann du es erreichst, und sagt dir, wenn das Tempo nicht passt.</p>`;
  h += goals.length ? `<div class="list">${goals.map((g) => { const s = goalState(g), [n, u] = GOAL_T[g.type]; return `<div class="row is-static goal-row"><span class="area-ic">${icon('target')}</span><span class="row-main"><b>${esc(g.type === 'e1rm' ? exName(g.ex) : n)}: ${fmt(g.target, 1)} ${u}</b><small>jetzt ${s.cur != null ? fmt(s.cur, 1) + ' ' + u : '–'}${s.rate != null ? ` · ${sgn(s.rate, 2)} ${u}/Woche` : ''} · ${esc(s.txt)}</small></span><button class="icon-btn" data-a="goal-del" data-id="${g.id}" aria-label="Ziel löschen">${icon('x')}</button></div>`; }).join('')}</div>` : emptyState('Noch keine Ziele.');
  const t = ui.goalType || 'gewicht', ids = allGymExIds();
  h += `<section class="sec"><div class="sec-head"><h2>Neues Ziel</h2></div><div class="chips chips-tight">${Object.entries(GOAL_T).map(([id, [n]]) => `<button class="chip chip-xs${t === id ? ' is-on' : ''}" data-a="goal-type" data-v="${id}">${n}</button>`).join('')}</div>
    ${t === 'e1rm' ? `<label class="choice-select">${icon('chevron-down')}<select id="goal-ex">${ids.map((id) => `<option value="${id}">${esc(exName(id))}</option>`).join('')}</select></label>` : ''}
    <div class="form"><div class="frow"><span class="flabel">Zielwert</span><div class="fin"><input type="text" inputmode="decimal" id="goal-val" placeholder="${t === 'gewicht' ? '88' : t === 'bauch' ? '80' : '100'}"><span class="unit">${GOAL_T[t][1]}</span></div></div></div>
    <div class="row-btns"><button class="pill-btn is-accent" data-a="goal-add">Ziel anlegen</button></div></section>`;
  return h;
}

/* ---------- Monatsbericht von Claude ---------- */
function monthAiHTML(ym) {
  const txt = ((S.settings.monthAi || {})[ym]) || '';
  if (!aiOn()) return txt ? `<div class="ai-text">${esc(txt).replace(/\n/g, '<br>')}</div>` : '';
  return `<div class="month-ai">${txt ? `<div class="ai-text">${esc(txt).replace(/\n/g, '<br>')}</div>` : ''}<button class="pill-btn" data-a="month-ai" data-v="${ym}">${icon('sparkles')}${txt ? 'Neu schreiben lassen' : 'Bericht von Claude'}</button></div>`;
}
async function monthAiRun(ym, btn) {
  const m = monthStats(ym);
  if (!m) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Claude schreibt …'; }
  const rc = recompStatus(m.last), ph = phaseStatus(m.last);
  const facts = { monat: ym, trendgewicht_kg: m.tB && Math.round(m.tB * 10) / 10, gewicht_veraenderung_kg: m.dW && Math.round(m.dW * 100) / 100, phase: ph.mode, gym: m.gym, bjj: m.bjj, ergometer: m.ergo, staerker_geworden: m.prs.map((p) => `${exName(p.id)} ${Math.round(p.pct * 10) / 10} %`), masse_cm: m.meas.map((x) => `${x.n} ${Math.round(x.d * 10) / 10}`), schlaf_score: m.sleep && Math.round(m.sleep), eiweiss_g: m.protein && Math.round(m.protein), haut: m.skin && Math.round(m.skin * 10) / 10, recomp: rc.st, muster: (muster().found || []).slice(0, 5).map((x) => x.text) };
  try {
    const txt = await aiAsk({ model: 'sonnet', max: 1500, effort: 'low', system: 'Du bist ein knapper, ehrlicher Coach. Schreib auf Deutsch, ohne Markdown-Überschriften, höchstens 120 Wörter: 1) was im Monat gut lief, 2) was nicht, 3) genau zwei konkrete Schwerpunkte für den nächsten Monat. Nur aus den Daten, nichts erfinden, keine Diagnosen.', content: JSON.stringify(facts) });
    S.settings.monthAi = { ...(S.settings.monthAi || {}), [ym]: txt.trim() };
    saveSettings();
  } catch (e) { toast('Claude ist gerade nicht erreichbar: ' + (e.message || e)); if (btn) { btn.disabled = false; btn.textContent = 'Bericht von Claude'; } }
}

/* ---------- Rückblick des Jahres ---------- */
function yearStats(y) {
  const keys = Object.keys(S.days).filter((k) => k.startsWith(String(y))).sort();
  if (!keys.length) return null;
  let monster = 0, caf = 0, gym = 0, bjj = 0, sauna = 0, saunaMin = 0, ton = 0, steps = 0, ergo = 0;
  const sleepM = {};
  for (const k of keys) {
    const d = S.days[k];
    for (const c of d.caf || []) { caf += Number(c.mg) || 0; if (c.p === 'monster_zero' || /monster/i.test(c.n || '')) monster++; }
    for (const t of d.trainings || []) { if (isGymT(t)) gym++; if (isBjj(t)) bjj++; if (isErgo(t)) ergo++; if (t.gym && t.gym.ex) for (const e of Object.values(t.gym.ex)) for (const s of e.s || []) ton += (Number(s.w) || 0) * (Number(s.r) || 0); }
    for (const s of d.sauna || []) { sauna++; saunaMin += Number(s.min) || 0; }
    const h = d.health || {};
    if (Number(h.steps) > 0) steps += Number(h.steps);
    if (Number(h.sleepScore) > 0) { const m = k.slice(0, 7); (sleepM[m] = sleepM[m] || []).push(Number(h.sleepScore)); }
  }
  const sm = Object.entries(sleepM).filter(([, v]) => v.length >= 7).map(([m, v]) => [m, mean(v)]).sort((a, b) => b[1] - a[1]);
  const mcKeys = keys.filter((k) => S.days[k].mc && Object.keys(S.days[k].mc).length);
  let best = 0, run = 0, prev = null;
  for (const k of mcKeys) { run = prev && addDays(prev, 1) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; }
  const pts = trendCalc(keys[keys.length - 1]) || [], t0 = pts.find((p) => p.k >= keys[0]), t1 = pts.length ? pts[pts.length - 1] : null;
  return { y, days: keys.length, from: keys[0], monster, caf, gym, bjj, ergo, sauna, saunaMin, ton, steps, bestSleep: sm[0] || null, mcRun: best, dW: t0 && t1 ? t1.t - t0.t : null, prs: progMilestones().filter((m) => m.k.startsWith(String(y)) && m.id.startsWith('e1rm_')).length };
}
function sheetYear(y) {
  const s = yearStats(y);
  if (!s) { toast('Für dieses Jahr gibt es noch keine Daten'); return; }
  ui.sheet = { type: 'year' };
  const card = (big, small) => `<div class="yr-card"><b>${big}</b><span>${small}</span></div>`;
  openSheet(`<h3 class="sheet-title">${icon('sparkles')} Dein Protokoll ${s.y}</h3><p class="hint">${s.days} Tage seit ${esc(fmtDate(s.from, { day: 'numeric', month: 'long' }))}.</p><div class="yr-grid">
    ${card(fmt(s.gym), 'Gym-Einheiten')}${card(fmt(s.ton / 1000, 1) + ' t', 'bewegt (Gewicht × Wiederholungen)')}${card(fmt(s.prs), 'e1RM-Marken geknackt')}${card(fmt(s.bjj), 'BJJ-Einheiten')}${card(fmt(s.ergo), 'Ergometer-Einheiten')}
    ${card(fmt(s.monster), 'Dosen Monster')}${card(fmt(s.caf / 1000, 1) + ' g', 'Koffein insgesamt')}${card(fmt(s.sauna), `Saunagänge (${fmt(s.saunaMin)} Min.)`)}${card(fmt(s.steps / 1000) + 'k', 'Schritte')}
    ${s.bestSleep ? card(fmt(s.bestSleep[1]), `Ø Sleep Score im ${esc(fmtDate(s.bestSleep[0] + '-01', { month: 'long' }))} – dein bester Schlafmonat`) : ''}${card(fmt(s.mcRun), 'Morgen-Checks am Stück (Rekord)')}${s.dW != null ? card(sgn(s.dW) + ' kg', 'Trendgewicht') : ''}</div>
    <div class="sheet-acts"><button class="btn is-accent" data-a="sheet-close">Schließen</button></div>`);
}
function yearBanner(k) {
  const md = k.slice(5);
  if (k !== todayKey() || md < '12-20' || (S.settings.yearSeen || '') === k.slice(0, 4)) return '';
  return `<div class="banner is-soft">${icon('sparkles')}<div><b>Dein Protokoll-Rückblick ${k.slice(0, 4)}</b><span>Gym-Einheiten, bewegte Tonnen, Monster-Dosen, bester Schlafmonat …</span></div><div class="banner-acts"><button class="pill-btn is-accent" data-a="year-open" data-v="${k.slice(0, 4)}">Ansehen</button></div></div>`;
}

/* ---------- Daten-Labor & Export ---------- */
const LAB_VARS = [
  ['sleep', 'Sleep Score', (k) => muHealth(k, 'sleepScore')], ['hrv', 'HRV', (k) => muHealth(k, 'hrv')], ['rhr', 'Ruhepuls', (k) => muHealth(k, 'rhr')],
  ['bb', 'Body Battery morgens', (k) => muHealth(k, 'bbMorning')], ['steps', 'Schritte', (k) => muHealth(k, 'steps')],
  ['kcal', 'Kalorien', (k) => dayIntake(k)], ['p', 'Eiweiß (g)', (k) => (dayIntake(k) != null ? computeTotals(k, false).tot.p : null)], ['na', 'Natrium (mg)', (k) => (dayIntake(k) != null ? computeTotals(k, false).tot.na : null)],
  ['caf', 'Koffein (mg)', (k) => { const d = peekDay(k); return d && d.caf ? d.caf.reduce((a, c) => a + (Number(c.mg) || 0), 0) : null; }],
  ['load', 'Trainingsbelastung', (k) => trainLoad(k)], ['energy', 'Energie (Stimmung)', (k) => { const d = peekDay(k); return d && d.mood && d.mood.energy != null ? d.mood.energy : null; }],
  ['skin', 'Hautbild', (k) => { const d = peekDay(k); return d && d.skin && d.skin.score != null ? d.skin.score : null; }], ['weight', 'Gewicht', (k) => muHealth(k, 'weight')],
  ['knee', 'Knie morgens', (k) => kneeAm(k)],
];
function labPairs(xId, yId, lag, days = 90) {
  const X = LAB_VARS.find((v) => v[0] === xId), Y = LAB_VARS.find((v) => v[0] === yId), out = [];
  for (const k of rangeKeys(days, addDays(todayKey(), -lag))) { let x, y; try { x = X[2](k); y = Y[2](addDays(k, lag)); } catch (e) { continue; } if (x != null && y != null && isFinite(x) && isFinite(y)) out.push({ x: Number(x), y: Number(y), k }); }
  return out;
}
function vLabor() {
  const x = ui.labX || 'caf', y = ui.labY || 'sleep', lag = ui.labLag ?? 1;
  const sel = (id, cur) => `<label class="choice-select">${icon('chevron-down')}<select data-c="lab" data-f="${id}">${LAB_VARS.map((v) => `<option value="${v[0]}" ${v[0] === cur ? 'selected' : ''}>${esc(v[1])}</option>`).join('')}</select></label>`;
  const pts = labPairs(x, y, lag), r = pts.length >= 5 ? pearson(pts) : null;
  const word = r == null ? '' : Math.abs(r) < 0.2 ? 'kaum ein' : Math.abs(r) < 0.4 ? 'ein schwacher' : Math.abs(r) < 0.6 ? 'ein mittlerer' : 'ein starker';
  let h = `<p class="sec-sub">Zwei beliebige Werte gegeneinander – zum Beispiel Koffein gegen den Schlaf der Nacht danach.</p><div class="cmp-sel">${sel('x', x)}${sel('y', y)}</div>
    <div class="chips chips-tight"><span class="hint">Zweiter Wert:</span>${[[0, 'gleicher Tag'], [1, 'Tag danach']].map(([v, l]) => `<button class="chip chip-xs${lag === v ? ' is-on' : ''}" data-a="lab-lag" data-v="${v}">${l}</button>`).join('')}</div>`;
  h += pts.length >= 5 ? `<div class="chart-box">${scatterChart({ pts, xType: 'num', xName: (LAB_VARS.find((v) => v[0] === x) || [])[1], yName: (LAB_VARS.find((v) => v[0] === y) || [])[1] })}</div><p class="sec-sub">${pts.length} Tage, r = ${fmt(r, 2)}: ${word} ${r >= 0 ? 'gleichläufiger' : 'gegenläufiger'} Zusammenhang. Zusammenhang heißt nicht Ursache – für echte Antworten gibt es die Experimente.</p>` : emptyState('Für diese Kombination gibt es noch zu wenige Tage (mindestens 5).');
  h += `<section class="sec"><div class="sec-head"><h2>${icon('download')} Export</h2></div><p class="sec-sub">Alle Tageswerte als CSV für Excel (Semikolon, deutsches Komma).</p><div class="row-btns"><button class="pill-btn" data-a="csv-export">CSV erstellen</button></div></section>`;
  return h;
}
function csvExport() {
  const cols = [['datum', (k) => k], ['gewicht', (k) => muHealth(k, 'weight')], ['trend', (k) => { const p = trendCalc(k); return p && p.length && p[p.length - 1].k === k ? Math.round(p[p.length - 1].t * 100) / 100 : null; }], ['bauch', (k) => muHealth(k, 'waist')],
    ...LAB_VARS.filter((v) => v[0] !== 'weight').map((v) => [v[0], v[2]]), ['schlafdauer_min', (k) => muHealth(k, 'sleepDur')], ['bereitschaft', (k) => { const r = readinessOf(k); return r ? r.score : null; }]];
  const keys = Object.keys(S.days).sort();
  const num = (v) => (v == null || v === '' || !isFinite(v) ? '' : String(Math.round(Number(v) * 100) / 100).replace('.', ','));
  const rows = [cols.map((c) => c[0]).join(';')].concat(keys.map((k) => cols.map(([n, f], i) => { let v; try { v = f(k); } catch (e) { v = null; } return i === 0 ? v : num(v); }).join(';')));
  return shareFile(new Blob(['﻿' + rows.join('\n')], { type: 'text/csv' }), `protokoll-daten-${todayKey()}.csv`, 'Protokoll-Daten');
}

/* ---------- Bereich „Fortschritt“ ---------- */
function vFortschritt() {
  const sub = getSub('fortschritt', 'meilen');
  let h = areaHead('fortschritt') + subnav('fortschritt', sub, [['meilen', 'Meilensteine'], ['ziele', 'Ziele'], ['labor', 'Daten-Labor'], ['jahr', 'Rückblick']]);
  if (sub === 'ziele') return h + vZiele();
  if (sub === 'labor') return h + vLabor();
  if (sub === 'jahr') { const y = todayKey().slice(0, 4); return h + `<p class="sec-sub">Dein Jahr in Zahlen – ab dem 20. Dezember erinnert dich die App daran.</p><div class="row-btns"><button class="pill-btn is-accent" data-a="year-open" data-v="${y}">${icon('sparkles')}Rückblick ${y}</button></div>${monthCard(ui.kMonth || todayKey().slice(0, 7))}`; }
  return h + vMeilensteine();
}

/* ---------- Lernen & Fokus ---------- */
const CARDS_START = [
  ['Wie lange vor dem Schlafen sollte das letzte Koffein sein?', 'Kaffee (~107 mg) mindestens 8,8 Std., Pre-Workout (~217 mg) mindestens 13,2 Std. vorher (Meta-Analyse Gardiner 2023).'],
  ['Was sagte in der UK Biobank das Sterberisiko besser voraus: Schlafdauer oder Regelmäßigkeit?', 'Die Regelmäßigkeit (Windred 2024).'],
  ['Ab wie viel Eiweiß pro Tag bringt mehr kaum noch Muskelzuwachs?', 'Ab etwa 1,6 g pro kg Körpergewicht (Meta-Analyse Morton 2018).'],
  ['Wie viele harte Sätze pro Muskel und Woche sind ein guter Richtwert?', 'Etwa 10–20, für Trainierte eher 12–20 (Baz-Valle 2022).'],
  ['Was ist ein harter Satz?', 'Ein Arbeitssatz nah am Versagen, etwa 0–3 Wiederholungen in Reserve. Aufwärmsätze zählen nicht.'],
  ['Wie schnell sollte man im Aufbau zunehmen?', 'Etwa 0,25–0,5 % des Körpergewichts pro Woche (Iraki 2019).'],
  ['Warum täglich wiegen statt einmal pro Woche?', 'Wochenmittel aus täglichem Wiegen gleichen Wasser- und Salzschwankungen aus (Iraki 2019).'],
  ['Was bringt warmes Duschen 1–2 Stunden vor dem Schlafen?', 'Schneller einschlafen und besser schlafen (Meta-Analyse Haghayegh 2019, 40–42,5 °C ab 10 Min.).'],
  ['Kältebad direkt nach dem Krafttraining – gut oder schlecht?', 'Bremst wahrscheinlich den Muskelaufbau (Meta-Analyse Piñero 2024).'],
  ['Was hilft direkt nach dem Lernen beim Behalten?', '10 Minuten ruhig sitzen, ohne Handy (Dewar 2012).'],
  ['Pauken oder verteilt wiederholen?', 'Verteilt wiederholen – das behält man deutlich besser (Meta-Analyse Cepeda 2006).'],
  ['Taille-zu-Größe: Welcher Wert gilt als gut?', 'Unter 0,5 – die Taille kleiner als die halbe Körpergröße (NICE).'],
];
const CARD_STEPS = [1, 3, 7, 14, 30, 60, 120];
function cardsList() { if (!Array.isArray(S.settings.cards)) { S.settings.cards = CARDS_START.map(([q, a], i) => ({ id: 'c' + i, q, a, step: 0, due: todayKey() })); markDirty('settings'); } return S.settings.cards; }
function cardsDue(k = todayKey()) { return cardsList().filter((c) => c.due <= k); }
function cardHTML(c, compact) {
  const open = ui.cardOpen === c.id;
  return `<section class="card know-card"><div class="sec-head"><h2>${icon('brain')} Wissens-Karte</h2>${compact ? `<span class="count">${cardsDue().length} fällig</span>` : ''}</div><p class="know-q">${esc(c.q)}</p>
    ${open ? `<p class="know-a">${esc(c.a)}</p><div class="row-btns"><button class="pill-btn is-accent" data-a="card-rate" data-id="${c.id}" data-v="1">Gewusst</button><button class="pill-btn" data-a="card-rate" data-id="${c.id}" data-v="0">Nochmal</button></div>` : `<div class="row-btns"><button class="pill-btn" data-a="card-show" data-id="${c.id}">Antwort zeigen</button></div>`}</section>`;
}
function knowCard(k) {
  if (k !== todayKey() || (S.settings.cardsHome === false)) return '';
  const lt = (S.settings.cardsLast || '');
  if (lt === k && ui.cardOpen == null) return '';
  const due = cardsDue(k);
  return due.length ? cardHTML(due[0], true) : '';
}
function focusList(k) { return ((peekDay(k) || {}).focus) || []; }
const FOCUS = { end: 0, min: 0, t: null, start: 0 };
function focusStart(min) {
  try { REST.ctx = REST.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (REST.ctx.state === 'suspended') REST.ctx.resume(); } catch (e) { /* ohne Ton */ }
  Object.assign(FOCUS, { min, start: Date.now(), end: Date.now() + min * 60000 });
  let el = document.getElementById('focus');
  if (!el) { el = document.createElement('div'); el.id = 'focus'; el.className = 'cam ergo'; document.body.appendChild(el); }
  document.documentElement.classList.add('noscroll');
  clearInterval(FOCUS.t); FOCUS.t = setInterval(focusTick, 500); focusTick();
}
function focusTick() {
  const el = document.getElementById('focus');
  if (!el) { clearInterval(FOCUS.t); return; }
  const left = Math.ceil((FOCUS.end - Date.now()) / 1000);
  if (left <= 0) { clearInterval(FOCUS.t); restBeep(); focusRate(); return; }
  el.innerHTML = `<div class="ergo-box"><small>Fokus-Block ${FOCUS.min} Min.</small><b class="ergo-ph">Handy weg, eine Sache</b><div class="ergo-time">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</div><div class="row-btns"><button class="pill-btn" data-a="focus-end">Fertig</button><button class="pill-btn" data-a="focus-cancel">Abbrechen</button></div></div>`;
}
function focusRate() {
  const el = document.getElementById('focus');
  if (!el) return;
  clearInterval(FOCUS.t);
  const min = Math.max(1, Math.round((Math.min(Date.now(), FOCUS.end) - FOCUS.start) / 60000));
  FOCUS.done = min;
  el.innerHTML = `<div class="ergo-box"><b class="ergo-ph">${min} Min. geschafft</b><p>Wie gut war dein Fokus?</p><div class="chips">${[1, 2, 3, 4, 5].map((v) => `<button class="chip" data-a="focus-save" data-v="${v}">${v}</button>`).join('')}</div><input type="text" id="focus-topic" class="note" placeholder="Thema (optional), z. B. Marketingforschung"><p class="hint">Danach 10 Minuten ruhig sitzen ohne Handy hilft beim Behalten (Dewar 2012).</p></div>`;
}
function focusStop() { clearInterval(FOCUS.t); const el = document.getElementById('focus'); if (el) el.remove(); document.documentElement.classList.remove('noscroll'); render(); }
function focusPatterns() {
  const blocks = [];
  for (const k of rangeKeys(60)) for (const f of focusList(k)) blocks.push({ k, ...f });
  if (blocks.length < 6) return null;
  const cmp = (n, fn) => { const A = blocks.filter((b) => fn(b.k) === true).map((b) => b.rate), B = blocks.filter((b) => fn(b.k) === false).map((b) => b.rate); return A.length >= 3 && B.length >= 3 ? { n, a: mean(A), b: mean(B), nA: A.length, nB: B.length } : null; };
  return [
    cmp('Morgenlicht', (k) => { const d = peekDay(k); return d ? !!(d.habits || {}).licht_morgen : null; }),
    cmp('Sleep Score ab 80', (k) => { const v = muHealth(k, 'sleepScore'); return v == null ? null : v >= 80; }),
    cmp('Koffein am Tag', (k) => { const d = peekDay(k); return d ? (d.caf || []).length > 0 : null; }),
  ].filter(Boolean);
}
function vLernen() {
  const k = todayKey(), today = focusList(k), pats = focusPatterns();
  let h = areaHead('lernen');
  h += `<section class="sec"><div class="sec-head"><h2>${icon('timer')} Fokus-Block</h2><span class="count">heute ${today.reduce((a, f) => a + f.min, 0)} Min.</span></div><p class="sec-sub">Ein Block, eine Aufgabe, Handy weg. Danach kurz bewerten – so findest du heraus, was deinen Fokus trägt (Morgenlicht, Schlaf, Koffein).</p>
    <div class="row-btns">${[25, 50, 90].map((m) => `<button class="pill-btn${m === 50 ? ' is-accent' : ''}" data-a="focus-start" data-v="${m}">${m} Min.</button>`).join('')}</div>
    ${today.length ? `<div class="chips chips-tight">${today.map((f) => `<span class="chip chip-xs is-static">${f.t} · ${f.min} Min. · ${f.rate}/5${f.topic ? ' · ' + esc(f.topic) : ''}</span>`).join('')}</div>` : ''}</section>`;
  if (pats && pats.length) h += `<section class="sec"><div class="sec-head"><h2>Was deinen Fokus trägt</h2></div>${pats.map((p) => `<p class="sec-sub">${esc(p.n)}: Fokus ${fmt(p.a, 1)} statt ${fmt(p.b, 1)} von 5 (${p.nA} gegen ${p.nB} Blöcke)</p>`).join('')}<p class="hint">Zusammenhang aus deinen Blöcken der letzten 60 Tage, keine Ursache.</p></section>`;
  else h += `<p class="hint">Ab 6 bewerteten Blöcken zeigt die App, ob Morgenlicht, guter Schlaf oder Koffein deinen Fokus verbessern – passend zu deinem Thema „Sonnenlicht & Fokus“.</p>`;
  const due = cardsDue(k), all = cardsList();
  h += due.length ? cardHTML(due[0], false) : `<section class="sec"><p class="sec-sub">${icon('brain')} Heute keine Wissens-Karte fällig. Nächste am ${esc(dShort(all.map((c) => c.due).sort()[0] || k))}.</p></section>`;
  h += `<section class="sec"><div class="sec-head"><h2>Karten</h2><span class="count">${all.length} Karten · ${due.length} fällig</span></div><p class="sec-sub">Eigene Karten aus deinen Lern-Notizen: eine pro Zeile, Frage und Antwort mit „|“ getrennt. Tipp: Lass Claude aus einer Notiz Karten in diesem Format schreiben.</p>
    <textarea class="note" rows="3" id="cards-in" placeholder="Was ist NSDR? | Non-Sleep Deep Rest: geführte Tiefenentspannung im Liegen"></textarea>
    <div class="row-btns"><button class="pill-btn" data-a="cards-add">Karten hinzufügen</button><button class="pill-btn is-ghost" data-a="cards-home">${S.settings.cardsHome === false ? 'Auf Heute zeigen' : 'Nicht auf Heute zeigen'}</button></div></section>`;
  return h;
}

/* ---------- Registrieren: Bereiche und Heute ---------- */
(() => {
  const i = AREAS.findIndex((a) => a.id === 'woche');
  AREAS.splice(i >= 0 ? i : AREAS.length - 1, 0, { id: 'fortschritt', n: 'Fortschritt', ic: 'trophy' }, { id: 'lernen', n: 'Lernen & Fokus', short: 'Lernen', ic: 'brain' });
  VIEWS.fortschritt = () => vFortschritt();
  VIEWS.lernen = () => vLernen();
})();

Object.assign(A, {
  'ms-seen': (el) => { S.settings.msSeen = [...new Set([...(S.settings.msSeen || []), el.dataset.id])]; saveSettings(); },
  'goal-type': (el) => { ui.goalType = el.dataset.v; render(); },
  'goal-add': () => {
    const t = ui.goalType || 'gewicht', v = parseNum(($('#goal-val') || {}).value || '');
    if (v == null || v <= 0 || v > 500) { toast('Zielwert eintragen'); return; }
    const g = { id: uid(), type: t, target: v };
    if (t === 'e1rm') { g.ex = ($('#goal-ex') || {}).value; if (!g.ex) { toast('Erst eine Übung mit Sätzen trainieren'); return; } }
    S.settings.goals2 = [...(S.settings.goals2 || []), g]; saveSettings();
  },
  'goal-del': (el) => { S.settings.goals2 = (S.settings.goals2 || []).filter((g) => g.id !== el.dataset.id); saveSettings(); },
  'month-ai': (el) => monthAiRun(el.dataset.v, el),
  'year-open': (el) => { S.settings.yearSeen = el.dataset.v; markDirty('settings'); sheetYear(el.dataset.v); },
  'lab-lag': (el) => { ui.labLag = Number(el.dataset.v); render(); },
  'csv-export': () => csvExport(),
  'prices-open': () => sheetPrices(),
  'prices-done': () => { closeSheet(); render(); },
  'focus-start': (el) => focusStart(Number(el.dataset.v)),
  'focus-end': () => focusRate(),
  'focus-cancel': () => focusStop(),
  'focus-save': (el) => {
    const k = todayKey(), topic = (($('#focus-topic') || {}).value || '').trim().slice(0, 60);
    const start = new Date(FOCUS.start);
    mutDay(k, (d) => { d.focus = d.focus || []; d.focus.push({ t: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`, min: FOCUS.done || FOCUS.min, rate: Number(el.dataset.v), ...(topic ? { topic } : {}) }); });
    focusStop(); toast('Fokus-Block gespeichert');
  },
  'card-show': (el) => { ui.cardOpen = el.dataset.id; render(); },
  'card-rate': (el) => {
    const c = cardsList().find((x) => x.id === el.dataset.id);
    if (!c) return;
    c.step = el.dataset.v === '1' ? Math.min((c.step || 0) + 1, CARD_STEPS.length - 1) : 0;
    c.due = addDays(todayKey(), CARD_STEPS[c.step]);
    S.settings.cardsLast = todayKey(); ui.cardOpen = null;
    saveSettings(); toast(el.dataset.v === '1' ? `Wieder in ${CARD_STEPS[c.step]} Tagen` : 'Morgen nochmal');
  },
  'cards-add': () => {
    const lines = (($('#cards-in') || {}).value || '').split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((p) => p.length >= 2 && p[0] && p[1]);
    if (!lines.length) { toast('Format: Frage | Antwort'); return; }
    const list = cardsList();
    for (const [q, a] of lines) if (!list.some((c) => c.q === q)) list.push({ id: uid(), q, a, step: 0, due: todayKey() });
    saveSettings(); toast(`${lines.length} ${lines.length === 1 ? 'Karte' : 'Karten'} hinzugefügt`);
  },
  'cards-home': () => { S.settings.cardsHome = S.settings.cardsHome === false; saveSettings(); },
});
Object.assign(C, {
  lab: (el) => { if (el.dataset.f === 'x') ui.labX = el.value; else ui.labY = el.value; render(); },
  price: (el) => {
    const v = el.value.trim() === '' ? null : parseNum(el.value);
    if (el.value.trim() !== '' && (v == null || v <= 0 || v > 500)) { toast('Preis prüfen (€/kg)'); el.classList.add('bad'); return; }
    el.classList.remove('bad');
    const p = S.settings.prices = { ...(S.settings.prices || {}) };
    if (v == null) delete p[el.dataset.id]; else p[el.dataset.id] = v;
    markDirty('settings'); flashSaved(el);
  },
});
