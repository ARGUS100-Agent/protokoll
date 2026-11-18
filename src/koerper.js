/* ============================================================
   KÖRPER & PHYSIQUE (seit 2.15.0, Wunsch vom 18.11.2026: mehr Fortschritt sehen, auch an der Physique)
   - Trendgewicht: geglätteter Wert statt Tageszahl (jeder Tag zählt 10 %, wie „The Hacker's Diet“), dazu die
     Wochenrate in kg und %. Iraki 2019: Wochenmittel aus täglichem Wiegen gleichen die Tagesschwankungen aus.
   - Gewichts-Erklärer: Weicht die Waage deutlich vom Trend ab, nennt die App wahrscheinliche Gründe vom Vortag.
   - Körpermaße alle 4 Wochen, links/rechts getrennt (Oberschenkel fürs Knie). Taille-zu-Größe (NICE: unter 0,5),
     Schulter-Bauch-Verhältnis. Körperfett und FFMI nur als Verlauf derselben Methode: Maßband-Formeln erfassen
     Veränderungen schlecht (Foulis 2023), Waagen schätzen Körperfett ungenau; FFMI nach Kouri 1995.
   - Phasen-Planer mit Zielrate und Ampel, Recomp-Ampel (Gewicht, Bauch, Kraft), Monatskarte.
   Fotos mit Schablone: fotos.js
   ============================================================ */
/*icons: ruler camera trending-up trending-down target images scale*/
const TREND_A = 0.1;
/* Zielrate in % Körpergewicht pro Woche (Aufbau: Iraki 2019) */
const PHASE_BANDS = { halten: [-0.15, 0.15], recomp: [0, 0.25], aufbau: [0.25, 0.5], defi: [-1, -0.5] };
const PHASE_TXT = {
  halten: 'Gewicht halten: Der Trend soll sich kaum bewegen.',
  recomp: 'Muskeln auf, Fett runter: höchstens minimal zunehmen, Bauch gleich oder kleiner, Kraft steigt.',
  aufbau: 'Aufbau: 0,25–0,5 % des Körpergewichts pro Woche (Iraki 2019) – schneller wird es vor allem Fett.',
  defi: 'Fett verlieren: 0,5–1 % pro Woche, Eiweiß hoch lassen und weiter schwer trainieren.',
};
const MEAS = [
  { k: 'hals', n: 'Hals', how: 'Unterhalb des Kehlkopfs, Kopf gerade.' },
  { k: 'schulter', n: 'Schultern', how: 'Breiteste Stelle, Arme hängen locker.' },
  { k: 'brust', n: 'Brust', how: 'Auf Höhe der Brustwarzen, normal ausgeatmet.' },
  { k: 'waist', n: 'Bauch', how: 'Auf Nabelhöhe, entspannt ausgeatmet.' },
  { k: 'huefte', n: 'Hüfte', how: 'Breiteste Stelle des Gesäßes.' },
  { k: 'armL', n: 'Oberarm links', how: 'Dickste Stelle, Arm hängt entspannt.' },
  { k: 'armR', n: 'Oberarm rechts', how: 'Wie links.' },
  { k: 'ohsL', n: 'Oberschenkel links', how: '15 cm über der Kniescheibe, Bein entspannt.' },
  { k: 'ohsR', n: 'Oberschenkel rechts', how: 'Wie links.' },
  { k: 'wadeL', n: 'Wade links', how: 'Dickste Stelle, im Stehen.' },
  { k: 'wadeR', n: 'Wade rechts', how: 'Wie links.' },
];
const MEAS_PAIRS = [['armL', 'armR', 'Oberarm'], ['ohsL', 'ohsR', 'Oberschenkel'], ['wadeL', 'wadeR', 'Wade']];
const KFA_M = { navy: 'Maßband-Formel', caliper: 'Caliper', waage: 'Waage', dexa: 'DEXA' };
const KOERPER_SUB = [['heute', 'Heute'], ['masse', 'Maße'], ['fotos', 'Fotos'], ['analyse', 'Auswertung']];
function koerperCfg() { return { every: 28, ...(S.settings.koerper || {}) }; }
function dShort(k) { return fmtDate(k, { day: 'numeric', month: 'short' }); }
function sgn(v, dec = 1) { return v == null ? '–' : `${v > 0 ? '+' : v < 0 ? '−' : '±'}${fmt(Math.abs(v), dec)}`; }

/* ---------- Trendgewicht ---------- */
function trendCalc(end = todayKey()) {
  const ser = weightSeries('weight').filter((x) => x.k <= end && Number(x.v) > 30);
  if (!ser.length) return null;
  // Startwert: Ø der ersten Woche (höchstens 5 Wiegungen), damit ein Ausreißer am Anfang den Trend nicht verzerrt
  const head = ser.filter((x) => daysBetween(ser[0].k, x.k) <= 6).slice(0, 5).map((x) => Number(x.v));
  let t = head.length >= 2 ? mean(head) : Number(ser[0].v), last = ser[0].k;
  const pts = [{ k: ser[0].k, v: Number(ser[0].v), t, prev: null }];
  for (let i = 1; i < ser.length; i++) {
    const v = Number(ser[i].v), g = Math.max(1, daysBetween(last, ser[i].k)), a = 1 - Math.pow(1 - TREND_A, g), prev = t;
    t += a * (v - t);
    pts.push({ k: ser[i].k, v, t, prev });
    last = ser[i].k;
  }
  return pts;
}
function trendAt(pts, k) { let v = null; for (const p of pts || []) { if (p.k > k) break; v = p.t; } return v; }
function trendInfo(end = todayKey()) {
  const pts = trendCalc(end);
  if (!pts) return { n: 0, pts: [], rate: null };
  const lp = pts[pts.length - 1], first = pts[0].k, span = daysBetween(first, end);
  const n14 = pts.filter((p) => p.k > addDays(end, -14)).length, n28 = pts.filter((p) => p.k > addDays(end, -28)).length;
  let rate = null, win = 0;
  if (span >= 13 && n14 >= 4) { const a = trendAt(pts, addDays(end, -14)); if (a != null) { rate = (lp.t - a) / 2; win = 14; } }
  if (rate == null && span >= 20 && n28 >= 3) { const d = Math.min(28, span), a = trendAt(pts, addDays(end, -d)) ?? pts[0].t; rate = (lp.t - a) / (d / 7); win = d; }
  return { n: pts.length, pts, trend: lp.t, last: lp.v, lastK: lp.k, rate, ratePct: rate != null ? (rate / lp.t) * 100 : null, win, n14, n28 };
}

/* ---------- Gewichts-Erklärer ---------- */
function weightWhy(k = todayKey()) {
  const d = peekDay(k), w = d && d.health ? Number(d.health.weight) : NaN;
  if (!(w > 30)) return null;
  const pts = trendCalc(k);
  if (!pts || pts.length < 4) return null;
  const p = pts[pts.length - 1];
  if (p.k !== k || p.prev == null) return null;
  const diff = w - p.prev, thr = Math.max(0.6, p.prev * 0.007);
  if (Math.abs(diff) < thr) return { diff, big: false, trend: p.prev, why: [] };
  const y = addDays(k, -1), why = [];
  const base = rangeKeys(14, addDays(k, -2)).filter((x) => dayIntake(x) != null && dayIntake(x) > 800);
  const tot = (x) => computeTotals(x, false).tot;
  const avg = (f) => (base.length >= 4 ? mean(base.map((x) => Number(tot(x)[f]) || 0)) : null);
  if (dayIntake(y) != null && dayIntake(y) > 0) {
    const yt = tot(y), na = avg('na'), c = avg('c'), kc = avg('kcal');
    const g = (v) => fmt(v / 1000, 1);
    if (na && yt.na > na * 1.3 && diff > 0) why.push(`viel Salz: ${g(yt.na)} g Natrium (sonst Ø ${g(na)} g) – Salz bindet Wasser`);
    if (na && yt.na < na * 0.7 && diff < 0) why.push(`wenig Salz: ${g(yt.na)} g Natrium (sonst Ø ${g(na)} g)`);
    if (c && yt.c > c * 1.25 && diff > 0) why.push(`mehr Kohlenhydrate: ${fmt(yt.c)} g (sonst Ø ${fmt(c)} g) – die Speicher binden Wasser`);
    if (c && yt.c < c * 0.75 && diff < 0) why.push(`weniger Kohlenhydrate: ${fmt(yt.c)} g (sonst Ø ${fmt(c)} g) – Speicher und Wasser sinken`);
    if (kc && yt.kcal > kc * 1.2 && diff > 0) why.push(`mehr gegessen: ${fmt(yt.kcal)} kcal (sonst Ø ${fmt(kc)}) – mehr Inhalt im Darm`);
    if (kc && yt.kcal < kc * 0.75 && diff < 0) why.push(`weniger gegessen: ${fmt(yt.kcal)} kcal (sonst Ø ${fmt(kc)})`);
  }
  const yd = peekDay(y);
  if (yd) {
    const hard = (yd.trainings || []).some((t) => trainType(t).hard || isGymT(t));
    if (hard && diff > 0) why.push('hartes Training gestern – beanspruchte Muskeln lagern ein paar Tage Wasser ein');
    if ((yd.sauna || []).length && diff < 0) why.push('Sauna gestern – das ausgeschwitzte Wasser kommt zurück');
  }
  return { diff, big: true, trend: p.prev, why };
}
function weightWhyHTML(k, card = false) {
  const r = weightWhy(k);
  if (!r || !r.big) return '';
  const up = r.diff > 0;
  const txt = r.why.length ? `Wahrscheinlich Wasser: ${r.why.join('; ')}.` : 'In deinen Daten von gestern steckt keine klare Ursache. Schwankungen um rund ein Kilo sind normal (Wasser, Darminhalt).';
  const inner = `${icon(up ? 'trending-up' : 'trending-down')}<div><b>Waage ${sgn(r.diff)} kg gegenüber deinem Trend (${fmt(r.trend, 1)} kg)</b><span>${esc(txt)} Zählen tut der Trend, nicht der Tageswert.</span></div>`;
  return card ? `<div class="banner is-soft wwhy">${inner}</div>` : `<div class="banner is-soft wwhy">${inner}</div>`;
}

/* ---------- Phase ---------- */
function phaseMode() { const g = energyCfg().goal; return PHASE_BANDS[g] ? g : 'halten'; }
function phaseStatus(k = todayKey()) {
  const ti = trendInfo(k), mode = phaseMode(), [lo, hi] = PHASE_BANDS[mode];
  if (ti.rate == null) return { mode, lo, hi, ti, st: 'none' };
  const r = ti.ratePct, w = hi - lo;
  const st = r >= lo && r <= hi ? 'ok' : r >= lo - w * 0.6 - 0.05 && r <= hi + w * 0.6 + 0.05 ? 'near' : 'off';
  return { mode, lo, hi, ti, st, r };
}
const AMPEL = { ok: ['is-ok', 'passt'], near: ['is-warn', 'knapp daneben'], off: ['is-bad', 'daneben'], none: ['', 'zu wenig Daten'] };
function trendCard(k) {
  const ti = trendInfo(k), ps = phaseStatus(k);
  if (!ti.n) return '';
  const kv = (a, b, c) => `<div class="kv"><span>${a}</span><b>${b}</b>${c ? `<small>${c}</small>` : ''}</div>`;
  const [cls, lab] = AMPEL[ps.st];
  const band = ti.trend ? `${sgn((ps.lo * ti.trend) / 100, 2)} bis ${sgn((ps.hi * ti.trend) / 100, 2)} kg/Woche` : '';
  let h = `<section class="sec trend-card"><div class="sec-head"><h2>${icon('scale')} Trendgewicht</h2><span class="ampel ${cls}">${esc(lab)}</span></div>
    <div class="kv-grid is-3">${kv('Trend', fmt(ti.trend, 1), 'kg geglättet')}${kv('Pro Woche', ti.rate != null ? sgn(ti.rate, 2) : '–', ti.rate != null ? `kg · ${sgn(ti.ratePct, 2)} %` : 'ab 4 Wiegungen in 2 Wochen')}${kv('Waage', fmt(ti.last, 1), `kg · ${dShort(ti.lastK)}`)}</div>
    <p class="sec-sub">Phase <b>${esc((ENERGY_GOALS.find((g) => g[0] === ps.mode) || [])[1] || 'Halten')}</b>: Ziel ${esc(band)}. ${ps.st === 'ok' ? 'Du liegst im Ziel.' : ps.st === 'none' ? 'Für die Rate braucht die App mindestens 4 Wiegungen in 2 Wochen.' : ps.r > ps.hi ? 'Du nimmst schneller zu als geplant.' : 'Du nimmst ab, obwohl das nicht geplant ist.'}${ps.st !== 'ok' && ps.st !== 'none' && energyCfg().auto ? ' Das Kalorienziel passt sich über die Erhaltungsrechnung von selbst an.' : ''}</p></section>`;
  return h;
}
function weightChartCard(k) {
  const pts = (trendCalc(k) || []).slice(-60);
  if (!pts.length) return chartCard('kw', 'Gewicht', 'Trag dein Gewicht ein, dann siehst du hier Waage und Trend.', emptyChart('Noch kein Eintrag.'));
  const legend = `<div class="legend"><span><i class="line-key" style="background:${SERIES.two}"></i>Waage</span><span><i class="line-key" style="background:${SERIES.one}"></i>Trend</span></div>`;
  const body = lineChart({ keys: pts.map((p) => p.k), series: [{ name: 'Waage', color: SERIES.two, vals: pts.map((p) => p.v), dots: true }, { name: 'Trend', color: SERIES.one, vals: pts.map((p) => p.t) }], unit: 'kg', fmtY: (v) => fmt(v, 1) });
  const table = '<tr><th>Datum</th><th>Waage</th><th>Trend</th></tr>' + pts.map((p) => `<tr><td>${shortDate(p.k)}</td><td>${fmt(p.v, 1)} kg</td><td>${fmt(p.t, 1)} kg</td></tr>`).reverse().join('');
  return chartCard('kw', 'Gewicht und Trend', '', body, table, legend);
}

/* ---------- Maße ---------- */
function measVal(d, f) { if (!d) return null; const v = f === 'waist' ? d.health && d.health.waist : d.meas && d.meas[f]; return v == null || v === '' ? null : Number(v); }
function measDays() { return Object.keys(S.days).sort().filter((k) => { const m = S.days[k].meas; return m && MEAS.some((x) => x.k !== 'waist' && m[x.k] != null); }); }
function measSeries(f) { return Object.keys(S.days).sort().map((k) => ({ k, v: measVal(S.days[k], f) })).filter((x) => x.v != null); }
function measLast(f, before = null) { const s = measSeries(f).filter((x) => !before || x.k < before); return s.length ? s[s.length - 1] : null; }
function heightM() { const h = Number(S.settings.profile && S.settings.profile.height); return h > 100 && h < 250 ? h / 100 : null; }
function navyBf(waist, neck, hM) { if (!(waist > neck) || !hM) return null; const v = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(hM * 100)) - 450; return v > 2 && v < 60 ? v : null; }
/* Körperfett-Verlauf: gemessene Werte (gleiche Methode) oder die Maßband-Formel */
function kfaSeries() {
  const out = [], hM = heightM();
  for (const k of Object.keys(S.days).sort()) {
    const d = S.days[k], m = d.meas || {};
    if (m.kfa != null) { out.push({ k, v: Number(m.kfa), m: m.kfaM || 'waage' }); continue; }
    const w = measVal(d, 'waist'), n = m.hals != null ? Number(m.hals) : (measLast('hals', addDays(k, 1)) || {}).v;
    if (w != null && n != null && m.hals != null) { const v = navyBf(w, n, hM); if (v != null) out.push({ k, v, m: 'navy' }); }
  }
  return out;
}
function ffmiOf(weight, bf, hM) { if (!(weight > 30) || bf == null || !hM) return null; const ffm = weight * (1 - bf / 100), f = ffm / (hM * hM); return { ffm, ffmi: f, norm: f + 6.1 * (1.8 - hM) }; }
function physLastDate() { const ks = photoIdx.keys.filter((x) => (x.split('|')[1] || '').startsWith('p_')).map((x) => x.split('|')[0]).sort(); return ks.length ? ks[ks.length - 1] : null; }
function koerperDue(k = todayKey()) {
  const c = koerperCfg(), md = measDays(), lastM = md.length ? md[md.length - 1] : null, lastP = physLastDate();
  const due = (x) => !x || daysBetween(x, k) >= c.every - 1;
  return { meas: due(lastM), foto: due(lastP), lastM, lastP, every: c.every };
}
function koerperDueCard(k) {
  const c = koerperCfg();
  if (k !== todayKey() || c.off || c.snooze === k || nowMin() >= 12 * 60 || !photoIdx.loaded) return '';
  const st = koerperDue(k);
  if (!st.meas && !st.foto) return '';
  const what = [st.meas ? 'Maße' : '', st.foto ? 'Fotos' : ''].filter(Boolean).join(' und ');
  return `<div class="banner">${icon('ruler')}<div><b>Körper-Check fällig: ${what}</b><span>Alle ${st.every} Tage, morgens nüchtern vor dem Frühstück. Dauert etwa 5 Minuten.</span></div><div class="banner-acts"><button class="pill-btn is-accent" data-a="koerper-go" data-sub="${st.meas ? 'masse' : 'fotos'}">Los</button><button class="link-btn" data-a="koerper-snooze">Morgen</button></div></div>`;
}
function sheetMeas(k) {
  ui.sheet = { type: 'meas', k };
  const d = getDay(k), m = d.meas || {};
  const rows = MEAS.map((x) => { const v = measVal(d, x.k), pv = measLast(x.k, k); return `<div class="frow"><span class="flabel">${esc(x.n)}<small>${esc(x.how)}</small></span><div class="fin"><input type="text" inputmode="decimal" data-c="meas" data-f="${x.k}" data-date="${k}" value="${numIn(v, 1)}" placeholder="${pv ? 'zuletzt ' + numIn(pv.v, 1) : '–'}" aria-label="${esc(x.n)}"><span class="unit">cm</span></div></div>`; }).join('');
  openSheet(`<h3 class="sheet-title">${icon('ruler')} Körpermaße · ${esc(fmtDate(k, { day: 'numeric', month: 'long' }))}</h3>
    <p class="hint">Morgens nüchtern, immer an denselben Stellen, Maßband anliegend ohne einzuschneiden. Jede Stelle zweimal messen und den Mittelwert eintragen. Leere Felder sind okay.</p>
    <div class="form meas-form">${rows}</div>
    <h5>Körperfett (nur falls gemessen)</h5>
    <div class="form"><div class="frow"><span class="flabel">Körperfett<small>Caliper, Waage oder DEXA – immer dieselbe Methode</small></span><div class="fin"><input type="text" inputmode="decimal" data-c="meas" data-f="kfa" data-date="${k}" value="${numIn(m.kfa, 1)}" placeholder="–" aria-label="Körperfett in Prozent"><span class="unit">%</span></div></div></div>
    <div class="chips chips-tight">${['caliper', 'waage', 'dexa'].map((id) => `<button class="chip chip-xs${m.kfaM === id ? ' is-on' : ''}" data-a="meas-kfam" data-v="${id}" data-date="${k}">${KFA_M[id]}</button>`).join('')}</div>
    <div class="sheet-acts"><button class="btn is-accent" data-a="meas-done">Fertig</button></div>`);
}
function measTableHTML() {
  const rows = MEAS.map((x) => {
    const s = measSeries(x.k);
    if (!s.length) return '';
    const last = s[s.length - 1], prev = s.length >= 2 ? s[s.length - 2] : null, first = s[0];
    return `<tr><td>${esc(x.n)}</td><td><b>${fmt(last.v, 1)}</b></td><td>${prev ? sgn(last.v - prev.v) : '–'}</td><td>${s.length >= 2 ? sgn(last.v - first.v) : '–'}</td></tr>`;
  }).join('');
  if (!rows) return '';
  return `<section class="sec"><div class="sec-head"><h2>Aktuell</h2><span class="count">cm</span></div><div class="table-wrap"><table class="grid-t meas-tbl"><tr><th></th><th>zuletzt</th><th>zur Messung davor</th><th>seit Start</th></tr>${rows}</table></div></section>`;
}
function measDerivedHTML(k) {
  const hM = heightM(), w = measLast('waist'), sch = measLast('schulter');
  const kv = (a, b, c, cls = '') => `<div class="kv ${cls}"><span>${a}</span><b>${b}</b>${c ? `<small>${c}</small>` : ''}</div>`;
  let h = '<section class="sec"><div class="sec-head"><h2>Kennzahlen</h2></div><div class="kv-grid">';
  if (w && hM) { const r = w.v / (hM * 100); h += kv('Taille zu Größe', fmt(r, 2), r < 0.5 ? 'unter 0,5 – gut (NICE)' : 'über 0,5 – NICE rät, darunter zu bleiben', r < 0.5 ? 'is-ok' : 'is-warn'); }
  else h += kv('Taille zu Größe', '–', hM ? 'Bauchumfang eintragen' : 'Größe im Profil eintragen');
  if (w && sch) h += kv('Schultern zu Bauch', fmt(sch.v / w.v, 2), 'V-Form: steigt, wenn Schultern wachsen oder der Bauch schrumpft');
  h += '</div>';
  const side = MEAS_PAIRS.map(([a, b, n]) => { const L = measLast(a), R = measLast(b); if (!L || !R) return ''; const dlt = L.v - R.v, pct = (Math.abs(dlt) / Math.max(L.v, R.v)) * 100; const flag = pct >= 3 || Math.abs(dlt) >= 1.5; return `<div class="side-row${flag ? ' is-flag' : ''}"><span>${n}</span><b>L ${fmt(L.v, 1)} · R ${fmt(R.v, 1)} cm</b><small>${Math.abs(dlt) < 0.3 ? 'gleich' : `${dlt > 0 ? 'rechts' : 'links'} ${fmt(Math.abs(dlt), 1)} cm dünner (${fmt(pct, 1)} %)`}</small></div>`; }).join('');
  if (side) {
    const kneeSide = (kneeCfg() || {}).side;
    h += `<h5>Seitenvergleich</h5><div class="side-list">${side}</div><p class="hint">Bis etwa 1 cm Unterschied ist normal. Ein dünnerer Oberschenkel am ${kneeSide === 'links' ? 'linken' : kneeSide === 'rechts' ? 'rechten' : 'betroffenen'} Knie-Bein zeigt, ob der Knie-Block dort Muskel aufbaut – wichtig für die Stabilität.</p>`;
  }
  const ks = kfaSeries();
  if (ks.length) {
    const last = ks[ks.length - 1], same = ks.filter((x) => x.m === last.m), prev = same.length >= 2 ? same[same.length - 2] : null;
    const ti = trendInfo(last.k), wt = ti.n ? trendAt(ti.pts, last.k) : null, ff = ffmiOf(wt, last.v, hM);
    h += `<h5>Körperfett & FFMI (grob)</h5><div class="kv-grid">${kv('Körperfett', `${fmt(last.v, 1)} %`, `${KFA_M[last.m] || last.m}, ${dShort(last.k)}${prev ? ` · ${sgn(last.v - prev.v)} %-Punkte` : ''}`)}${ff ? kv('FFMI', fmt(ff.norm, 1), `fettfreie Masse ${fmt(ff.ffm, 1)} kg`) : kv('FFMI', '–', 'Gewicht und Größe nötig')}</div>
      <p class="hint">Nur den Verlauf mit derselben Methode vergleichen: Maßband-Formeln erfassen Veränderungen beim Körperfett nicht genau (Foulis 2023), Waagen liegen beim Körperfett oft deutlich daneben. Zur Einordnung des FFMI: Ohne Steroide lagen die Sportler in der Studie von Kouri (1995) meist bei 21–23, nach oben bis etwa 25.</p>`;
  }
  return h + '</section>';
}
function measChartCard() {
  const avail = MEAS.filter((x) => measSeries(x.k).length >= 1);
  if (!avail.length) return '';
  const f = avail.some((x) => x.k === ui.measF) ? ui.measF : avail[0].k, m = MEAS.find((x) => x.k === f), s = measSeries(f);
  const pair = MEAS_PAIRS.find((p) => p.includes(f));
  const series = [{ name: m.n, color: SERIES.one, vals: s.map((x) => x.v), dots: true }];
  let keys = s.map((x) => x.k);
  if (pair) { const o = pair[0] === f ? pair[1] : pair[0], os = measSeries(o); keys = [...new Set([...keys, ...os.map((x) => x.k)])].sort(); series[0].vals = keys.map((kk) => (s.find((x) => x.k === kk) || {}).v ?? null); series.push({ name: MEAS.find((x) => x.k === o).n, color: SERIES.two, vals: keys.map((kk) => (os.find((x) => x.k === kk) || {}).v ?? null), dots: true }); }
  const chips = `<div class="chips chips-tight">${avail.map((x) => `<button class="chip chip-xs${x.k === f ? ' is-on' : ''}" data-a="meas-chart" data-v="${x.k}">${esc(x.n)}</button>`).join('')}</div>`;
  const body = chips + lineChart({ keys, series, unit: 'cm', fmtY: (v) => fmt(v, 1) });
  const legend = series.length > 1 ? `<div class="legend">${series.map((x) => `<span><i class="line-key" style="background:${x.color}"></i>${esc(x.name)}</span>`).join('')}</div>` : '';
  return chartCard('kmeas', 'Verlauf', '', body, '', legend);
}

/* ---------- Kraft-Vergleich (für Recomp-Ampel und Monatskarte) ---------- */
function bestE1rm(from, to) {
  const m = {};
  for (let k = from; k <= to; k = addDays(k, 1)) {
    const d = peekDay(k);
    if (!d) continue;
    for (const t of d.trainings || []) { const ex = t.gym && t.gym.ex; if (!ex) continue; for (const [id, e] of Object.entries(ex)) for (const s of e.s || []) { const v = e1rm(Number(s.w), Number(s.r), s.rir); if (v) m[id] = Math.max(m[id] || 0, v); } }
  }
  return m;
}
function strengthDelta(a, b) { const ids = Object.keys(a).filter((id) => b[id]); return ids.length >= 2 ? { pct: mean(ids.map((id) => a[id] / b[id] - 1)) * 100, n: ids.length } : null; }
function recompStatus(k = todayKey()) {
  const pts = trendCalc(k) || [];
  const t0 = trendAt(pts, addDays(k, -28)), t1 = trendAt(pts, k);
  const dW = t0 != null && t1 != null ? t1 - t0 : null;
  const ws = measSeries('waist'), wNow = ws.length ? ws[ws.length - 1] : null, wPrev = wNow ? ws.filter((x) => x.k <= addDays(wNow.k, -21)).pop() : null;
  const dB = wNow && wPrev && daysBetween(wNow.k, k) <= 35 ? wNow.v - wPrev.v : null;
  const sd = strengthDelta(bestE1rm(addDays(k, -27), k), bestE1rm(addDays(k, -55), addDays(k, -28)));
  const dK = sd ? sd.pct : null;
  const band = PHASE_BANDS[phaseMode()], wt = t1 || 80;
  const wOk = dW == null ? null : dW >= ((band[0] * wt) / 100) * 4 - 0.4 && dW <= ((band[1] * wt) / 100) * 4 + 0.4;
  const bOk = dB == null ? null : dB <= 0.3 ? true : dB >= 1 ? false : null;
  const kOk = dK == null ? null : dK >= 1 ? true : dK <= -3 ? false : null;
  const v = [wOk, bOk, kOk], yes = v.filter((x) => x === true).length, no = v.filter((x) => x === false).length, na = [dW, dB, dK].filter((x) => x == null).length;
  const st = na >= 2 ? 'none' : no >= 2 ? 'off' : no === 0 && yes >= 2 ? 'ok' : 'near';
  return { dW, dB, dK, nK: sd ? sd.n : 0, wOk, bOk, kOk, st };
}
function recompCard(k) {
  const r = recompStatus(k), [cls, lab] = AMPEL[r.st];
  const tile = (n, val, ok, sub) => `<div class="kv ${ok === true ? 'is-ok' : ok === false ? 'is-bad' : ''}"><span>${n}</span><b>${val}</b><small>${sub}</small></div>`;
  return `<section class="sec"><div class="sec-head"><h2>${icon('target')} Recomp-Ampel</h2><span class="ampel ${cls}">${r.st === 'ok' ? 'Muskeln auf, Fett runter' : esc(lab)}</span></div>
    <div class="kv-grid is-3">${tile('Gewicht 4 Wo.', r.dW != null ? sgn(r.dW) : '–', r.wOk, r.dW != null ? 'kg Trend' : 'mehr wiegen')}${tile('Bauch', r.dB != null ? sgn(r.dB) : '–', r.bOk, r.dB != null ? 'cm zur Messung davor' : 'alle 4 Wochen messen')}${tile('Kraft', r.dK != null ? `${sgn(r.dK)} %` : '–', r.kOk, r.dK != null ? `e1RM, ${r.nK} Übungen` : 'ab 2 Übungen in beiden Zeiträumen')}</div>
    <p class="hint">Grün heißt: Gewicht passt zur Phase, Bauch gleich oder kleiner, Kraft steigt. Das ist Fortschritt, auch wenn die Waage stillsteht. Kraft = Ø Veränderung des besten geschätzten 1RM je Übung, letzte 4 Wochen gegen die 4 davor.</p></section>`;
}
function phaseBodyCard(k) {
  const ps = phaseStatus(k), [cls, lab] = AMPEL[ps.st], ti = ps.ti, wt = ti.trend || null;
  const kg = (p) => (wt ? sgn((p * wt) / 100, 2) : sgn(p, 2) + ' %');
  return `<section class="sec"><div class="sec-head"><h2>${icon('trending-up')} Phase</h2><span class="ampel ${cls}">${esc(lab)}</span></div>
    <div class="chips chips-tight">${ENERGY_GOALS.map(([id, n]) => `<button class="chip chip-xs${ps.mode === id ? ' is-on' : ''}" data-a="energy-goal" data-v="${id}">${esc(n)}</button>`).join('')}</div>
    <p class="sec-sub">${esc(PHASE_TXT[ps.mode])} Ziel: ${kg(ps.lo)} bis ${kg(ps.hi)}${wt ? ' kg' : ''} pro Woche (${sgn(ps.lo, 2)} bis ${sgn(ps.hi, 2)} %). Aktuell: ${ti.rate != null ? `${sgn(ti.rate, 2)} kg pro Woche (${sgn(ti.ratePct, 2)} %)` : 'noch zu wenige Wiegungen'}.</p>
    <p class="hint">Die Phase stellt auch das Kalorienziel ein (Ernährung → Energiebilanz). Beim Aufbau lieber am unteren Rand bleiben, das hält den Fettanteil klein.</p></section>`;
}

/* ---------- Monatskarte ---------- */
function monthKeysOf(ym) { const out = []; let k = ym + '-01'; while (k.slice(0, 7) === ym) { out.push(k); k = addDays(k, 1); } return out; }
function monthStats(ym) {
  const all = monthKeysOf(ym), today = todayKey(), keys = all.filter((k) => k <= today);
  if (!keys.length) return null;
  const first = keys[0], last = keys[keys.length - 1], pts = trendCalc(last) || [];
  const tA = trendAt(pts, addDays(first, -1)) ?? (pts.find((p) => p.k >= first) || {}).t, tB = trendAt(pts, last);
  const days = keys.map((k) => ({ k, d: peekDay(k) })).filter((x) => x.d);
  const avgOf = (fn) => { const v = days.map((x) => fn(x.d, x.k)).filter((x) => x != null && !Number.isNaN(x)); return v.length ? mean(v) : null; };
  const tr = days.flatMap((x) => x.d.trainings || []);
  const before = bestE1rm(addDays(first, -365), addDays(first, -1)), inM = bestE1rm(first, last);
  const prs = Object.keys(inM).filter((id) => before[id] && inM[id] > before[id] * 1.005).map((id) => ({ id, pct: (inM[id] / before[id] - 1) * 100 })).sort((a, b) => b.pct - a.pct);
  const meas = MEAS.map((m) => { const s = measSeries(m.k), a = s.filter((x) => x.k < first).pop(), b = s.filter((x) => x.k >= first && x.k <= last).pop(); return a && b ? { n: m.n, d: b.v - a.v } : null; }).filter(Boolean);
  const protein = avgOf((d, k) => (dayIntake(k) != null && dayIntake(k) > 800 ? computeTotals(k, false).tot.p : null));
  return {
    ym, first, last, tA, tB, dW: tA != null && tB != null ? tB - tA : null,
    gym: tr.filter(isGymT).length, bjj: tr.filter(isBjj).length, ergo: tr.filter(isErgo).length,
    sleep: avgOf((d) => (d.health && d.health.sleepScore != null ? Number(d.health.sleepScore) : null)),
    skin: avgOf((d) => (d.skin && d.skin.score != null ? Number(d.skin.score) : null)),
    protein, prs, meas,
  };
}
function monthCard(ym) {
  const m = monthStats(ym);
  const prevYm = addDays(ym + '-01', -1).slice(0, 7), nextYm = addDays(monthKeysOf(ym).pop(), 1).slice(0, 7), cur = todayKey().slice(0, 7);
  const name = fmtDate(ym + '-01', { month: 'long', year: 'numeric' });
  let h = `<section class="sec month-card"><div class="week-nav"><button class="icon-btn" data-a="kmonth" data-v="${prevYm}" aria-label="Vormonat">${icon('chevron-left')}</button><span>Monatskarte ${esc(name)}</span><button class="icon-btn" data-a="kmonth" data-v="${nextYm}" ${ym >= cur ? 'disabled' : ''} aria-label="Nächster Monat">${icon('chevron-right')}</button></div>`;
  if (!m) return h + emptyState('Für diesen Monat gibt es noch keine Daten.') + '</section>';
  const kv = (a, b, c) => `<div class="kv"><span>${a}</span><b>${b}</b>${c ? `<small>${c}</small>` : ''}</div>`;
  h += `<div class="kv-grid is-3">${kv('Trendgewicht', m.dW != null ? sgn(m.dW) : '–', m.tB != null ? `kg · jetzt ${fmt(m.tB, 1)}` : 'kg')}${kv('Training', `${m.gym}×`, `Gym · BJJ ${m.bjj}× · Ergo ${m.ergo}×`)}${kv('Bestwerte', m.prs.length, m.prs.length === 1 ? 'Übung stärker' : 'Übungen stärker')}${kv('Schlaf', m.sleep != null ? fmt(m.sleep) : '–', 'Ø Sleep Score')}${kv('Eiweiß', m.protein != null ? fmt(m.protein) : '–', 'g Ø pro erfasstem Tag')}${kv('Haut', m.skin != null ? fmt(m.skin, 1) : '–', 'Ø Hautbild')}</div>`;
  if (m.prs.length) h += `<p class="sec-sub">${icon('trending-up')} Stärker geworden: ${m.prs.slice(0, 4).map((p) => `${esc((kxEx(p.id) || {}).n || p.id)} ${sgn(p.pct)} %`).join(' · ')}</p>`;
  if (m.meas.length) h += `<p class="sec-sub">${icon('ruler')} Maße zum Vormonat: ${m.meas.map((x) => `${esc(x.n)} ${sgn(x.d)} cm`).join(' · ')}</p>`;
  h += physMonthPair(m.first, m.last);
  h += monthAiHTML(ym);
  return h + '</section>';
}
function monthBanner(k) {
  const d = Number(k.slice(8, 10));
  if (k !== todayKey() || d > 3 || (S.settings.koerper || {}).monthSeen === k.slice(0, 7)) return '';
  const ym = addDays(k.slice(0, 8) + '01', -1).slice(0, 7);
  if (!monthStats(ym)) return '';
  return `<div class="banner is-soft">${icon('calendar-range')}<div><b>Deine Monatskarte ${esc(fmtDate(ym + '-01', { month: 'long' }))} ist fertig</b><span>Gewicht, Maße, Fotos, Bestwerte und Schlaf im Rückblick.</span></div><div class="banner-acts"><button class="pill-btn" data-a="kmonth-open" data-v="${ym}">Ansehen</button></div></div>`;
}

/* ---------- Ansichten ---------- */
function vKoerper() {
  const sub = getSub('koerper', 'heute');
  let h = areaHead('koerper') + subnav('koerper', sub, KOERPER_SUB);
  const views = { heute: vKoerperHeute, masse: vKoerperMasse, fotos: vKoerperFotos, analyse: vKoerperAnalyse };
  return h + (views[sub] || vKoerperHeute)();
}
function vKoerperHeute() {
  const k = ui.date, d = getDay(k);
  let h = dateBar(k);
  const prev = (f) => { for (let i = 1; i < 60; i++) { const x = peekDay(addDays(k, -i)); if (x && x.health && x.health[f] != null) return x.health[f]; } return null; };
  const row = (f, n, unit, dec) => { const v = d.health[f], pv = prev(f); return `<div class="frow"><span class="flabel">${n}</span><div class="fin"><input type="text" inputmode="decimal" data-c="health" data-k="${f}" data-date="${k}" value="${numIn(v, dec)}" placeholder="${pv != null ? 'zuletzt ' + numIn(pv, dec) : '–'}" aria-label="${n}"><span class="unit">${unit}</span></div></div>`; };
  h += `<section class="sec"><div class="form">${row('weight', 'Gewicht', 'kg', 1)}${row('waist', 'Bauchumfang (optional)', 'cm', 1)}</div><p class="hint">Morgens nach dem Klo, vor dem Essen. Bauchumfang auf Nabelhöhe, entspannt ausatmen.</p></section>`;
  h += weightWhyHTML(k);
  h += trendCard(k);
  h += weightChartCard(k);
  h += bpSection(k);
  const ws = measSeries('waist');
  if (ws.length) {
    const body = lineChart({ keys: ws.map((x) => x.k), series: [{ name: 'Bauchumfang', color: SERIES.one, vals: ws.map((x) => x.v), dots: true }], unit: 'cm', fmtY: (v) => fmt(v, 1) });
    const table = '<tr><th>Datum</th><th>Bauch</th></tr>' + ws.map((x) => `<tr><td>${shortDate(x.k)}</td><td>${fmt(x.v, 1)} cm</td></tr>`).reverse().join('');
    h += chartCard('kwaist', 'Bauchumfang', '', body, table);
  }
  return h;
}
function vKoerperMasse() {
  const k = todayKey(), st = koerperDue(k), md = measDays();
  let h = `<section class="sec"><div class="sec-head"><h2>${icon('ruler')} Körpermaße</h2><span class="count">${st.lastM ? `zuletzt ${esc(dShort(st.lastM))}` : 'noch keine'}</span></div>
    <p class="sec-sub">Alle ${st.every} Tage morgens nüchtern messen, am besten zusammen mit den Fotos. Links und rechts getrennt: So siehst du, ob das Knie-Bein Muskel verliert oder aufholt.</p>
    <div class="row-btns"><button class="pill-btn is-accent" data-a="meas-open" data-date="${k}">${icon('ruler')}${md.includes(k) ? 'Heutige Maße bearbeiten' : 'Maße eintragen'}</button>${md.length ? `<button class="pill-btn" data-a="meas-open" data-date="${md[md.length - 1]}">Letzte Messung bearbeiten</button>` : ''}</div></section>`;
  if (!md.length && !measSeries('waist').length) return h + emptyState('Noch keine Maße. Ein Maßband reicht.');
  return h + measTableHTML() + measDerivedHTML(k) + measChartCard();
}
function vKoerperAnalyse() {
  const k = todayKey();
  let h = phaseBodyCard(k) + recompCard(k) + monthCard(ui.kMonth || k.slice(0, 7));
  h += `<section class="sec"><div class="sec-head"><h2>Zweite Meinung</h2></div><p class="sec-sub">Das Backup enthält Gewicht, Maße und deine Fotos (verkleinert). Lade es bei Claude hoch und frag nach einer Einschätzung deines Fortschritts – zum Beispiel „Vergleiche meine Fotos von Anfang und Ende des Monats“.</p><div class="row-btns"><button class="pill-btn" data-a="backup-export">${icon('share')}Backup erstellen</button></div></section>`;
  return h;
}

Object.assign(A, {
  'koerper-go': (el) => { ui.sub.koerper = el.dataset.sub || 'heute'; go('koerper', { date: todayKey(), scrollTop: true }); },
  'koerper-snooze': () => { S.settings.koerper = { ...koerperCfg(), snooze: todayKey() }; saveSettings(); },
  'meas-open': (el) => sheetMeas(el.dataset.date || todayKey()),
  'meas-done': () => { closeSheet(); render(); },
  'meas-kfam': (el) => { const k = el.dataset.date; mutDay(k, (d) => { d.meas = d.meas || {}; d.meas.kfaM = d.meas.kfaM === el.dataset.v ? undefined : el.dataset.v; if (!d.meas.kfaM) delete d.meas.kfaM; }); sheetMeas(k); },
  'meas-chart': (el) => { ui.measF = el.dataset.v; render(); },
  kmonth: (el) => { ui.kMonth = el.dataset.v; render(); },
  'kmonth-open': (el) => { S.settings.koerper = { ...koerperCfg(), monthSeen: todayKey().slice(0, 7) }; markDirty('settings'); ui.kMonth = el.dataset.v; ui.sub.koerper = 'analyse'; go('koerper', { scrollTop: true }); },
});
Object.assign(C, {
  meas: (el) => {
    const k = el.dataset.date, f = el.dataset.f, raw = el.value.trim();
    const v = raw === '' ? null : parseNum(raw), lim = f === 'kfa' ? [2, 60] : [10, 250];
    if (raw !== '' && (v == null || v < lim[0] || v > lim[1])) { toast(`Wert prüfen (${lim[0]}–${lim[1]})`); el.classList.add('bad'); return; }
    el.classList.remove('bad');
    mutDay(k, (d) => {
      if (f === 'waist') { if (v == null) delete d.health.waist; else d.health.waist = v; return; }
      d.meas = d.meas || {};
      if (v == null) delete d.meas[f]; else d.meas[f] = v;
      if (!Object.keys(d.meas).length) delete d.meas;
    });
    flashSaved(el);
  },
});
