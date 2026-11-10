/* ============================================================
   ENERGIEBILANZ: Aufnahme gegen Garmin-Verbrauch, Kalorienziel passt sich an
   Ziel-Aufschlag + Ø Verbrauch der letzten 14 vollständigen Tage, korrigiert über den Gewichtstrend.
   ============================================================ */
/*icons: scale flame */

const ENERGY_GOALS = [
  ['recomp', 'Muskeln auf, Fett runter', 150],
  ['aufbau', 'Aufbau', 300],
  ['halten', 'Halten', 0],
  ['defi', 'Fett verlieren', -400],
];
function energyCfg() {
  const e = S.settings.energy || {};
  const w = Number(S.settings.profile.weight) || null;
  return { auto: e.auto !== false, goal: e.goal || 'recomp', wLo: e.wLo ?? w, wHi: e.wHi ?? (w ? w + 5 : null) };
}
function dayIntake(k) {
  const d = peekDay(k);
  if (!d || !(Object.keys(d.checks || {}).length + (d.entries || []).length)) return null;
  return computeTotals(k, false).tot.kcal || 0;
}
function weightTrend(k, days = 28) {
  const pts = [];
  for (const x of rangeKeys(days, k)) { const d = peekDay(x); const w = d && d.health ? Number(d.health.weight) : NaN; if (w > 30) pts.push([daysBetween(k, x), w]); }
  if (pts.length < 2 || pts[pts.length - 1][0] - pts[0][0] < 7) return { n: pts.length, last: pts.length ? pts[pts.length - 1][1] : null, slope: null };
  const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
  const sxx = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0), sxy = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0);
  return { n, last: pts[n - 1][1], slope: sxx ? (sxy / sxx) * 7 : null }; // kg pro Woche
}
/* Kennzahlen bis einschließlich gestern (heute ist noch nicht fertig) */
function energyStats(k = todayKey()) {
  const cfg = energyCfg();
  const past = rangeKeys(14, addDays(k, -1));
  const rows = past.map((x) => { const d = peekDay(x); const burn = d && d.health ? Number(d.health.kcalTot) : NaN; return { k: x, burn: burn >= 1200 ? burn : null, intake: dayIntake(x) }; });
  const burns = rows.filter((r) => r.burn != null).map((r) => r.burn);
  const tdee = burns.length >= 4 ? Math.round(mean(burns)) : null;
  const full = rows.filter((r) => r.burn != null && r.intake != null && r.intake >= r.burn * 0.5);
  const last7 = full.filter((r) => r.k >= addDays(k, -7));
  const bal = last7.length ? Math.round(mean(last7.map((r) => r.intake - r.burn))) : null;
  const wt = weightTrend(addDays(k, -1));
  const g = ENERGY_GOALS.find((x) => x[0] === cfg.goal) || ENERGY_GOALS[0];
  let offset = g[2];
  const why = [`${g[2] >= 0 ? '+' : '−'}${Math.abs(g[2])} für „${g[1]}“`];
  if (wt.last != null && cfg.wHi && wt.last > cfg.wHi) { offset -= 150; why.push(`−150, weil du über ${fmt(cfg.wHi)} kg liegst`); } else if (wt.last != null && cfg.wLo && wt.last < cfg.wLo && cfg.goal !== 'defi') { offset += 100; why.push(`+100, weil du unter ${fmt(cfg.wLo)} kg liegst`); }
  if (wt.slope != null && cfg.goal !== 'defi') {
    if (wt.slope > 0.35) { offset -= 100; why.push(`−100, weil das Gewicht schneller steigt als 0,35 kg pro Woche`); } else if (wt.slope < -0.15 && cfg.goal !== 'halten') { offset += 100; why.push('+100, weil das Gewicht sinkt'); }
  }
  offset = clamp(offset, -600, 500);
  const target = tdee ? Math.round((tdee + offset) / 50) * 50 : null;
  return { cfg, rows, tdee, burns: burns.length, bal, full: last7.length, wt, offset, why, target };
}
/* Kalorienziel automatisch nachziehen (einmal am Tag, nur mit genug Garmin-Tagen) */
function energyApply() {
  const cfg = energyCfg();
  if (!cfg.auto) return false;
  const st = energyStats();
  if (!st.target) return false;
  const t = S.settings.targets.kcal || {};
  const want = { lo: st.target - 100, hi: st.target + 100, max: st.target + 400 };
  if (t.lo === want.lo && t.hi === want.hi && t.max === want.max) return false;
  S.settings.targets.kcal = { ...t, ...want };
  markDirty('settings'); invalidate();
  return true;
}
function energyCard(k) {
  const st = energyStats(k);
  const cfg = st.cfg;
  const y = st.rows[st.rows.length - 1];
  let h = `<section class="sec energy" id="energie"><div class="sec-head"><h2>Energiebilanz</h2>${cfg.auto && st.target ? '<span class="count">Ziel automatisch</span>' : ''}</div>`;
  if (!st.tdee) {
    return h + `<p class="sec-sub">Mit Garmin Connect vergleicht die App hier, was du isst, mit dem, was du laut Uhr verbrauchst, und passt dein Kalorienziel an. Dafür braucht sie mindestens 4 Tage mit Garmin-Verbrauch (bisher ${st.burns}).</p></section>`;
  }
  const kv = (a, b, c) => `<div class="kv"><span>${a}</span><b>${b}</b>${c ? `<small>${c}</small>` : ''}</div>`;
  const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + fmt(Math.abs(v));
  h += `<div class="kv-grid is-3">${kv('Gestern', y && y.burn != null && y.intake != null ? sign(Math.round(y.intake - y.burn)) : '–', y && y.burn != null ? `${y.intake != null ? fmt(y.intake) : '–'} gegessen · ${fmt(y.burn)} verbraucht` : 'noch kein Verbrauch')}
    ${kv('Ø 7 Tage', st.bal != null ? sign(st.bal) : '–', st.full ? `kcal/Tag aus ${st.full} vollständigen Tagen` : 'noch keine vollständigen Tage')}
    ${kv('Ø Verbrauch', fmt(st.tdee), `kcal/Tag (${st.burns} Tage, Garmin)`)}</div>`;
  h += `<p class="sec-sub">${cfg.auto ? `Dein Kalorienziel: <b>${fmt(st.target)} kcal</b> = Ø Verbrauch ${fmt(st.tdee)} ${st.why.join(', ')}.` : `Vorschlag: ${fmt(st.target)} kcal (Ø Verbrauch ${st.why.join(', ')}). Das Ziel stellst du gerade selbst ein.`}</p>`;
  const wt = st.wt;
  h += `<p class="sec-sub">${icon('scale')} ${wt.last != null ? `Gewicht ${fmt(wt.last, 1)} kg` : 'Noch kein Gewicht'}${wt.slope != null ? ` · Trend ${wt.slope >= 0 ? '+' : '−'}${fmt(Math.abs(wt.slope), 2)} kg pro Woche` : wt.n ? ' · Trend ab 2 Messungen über eine Woche' : ''} · Ziel ${cfg.wLo ? fmt(cfg.wLo) : '–'}–${cfg.wHi ? fmt(cfg.wHi) : '–'} kg</p>`;
  h += `<div class="chips chips-tight">${ENERGY_GOALS.map(([id, n]) => `<button class="chip chip-xs${cfg.goal === id ? ' is-on' : ''}" data-a="energy-goal" data-v="${id}">${esc(n)}</button>`).join('')}</div>
    <div class="form"><div class="frow"><span class="flabel">Gewichtsziel von</span><div class="fin"><input type="text" inputmode="decimal" data-c="energy-w" data-f="wLo" value="${numIn(cfg.wLo, 1)}"><span class="unit">kg</span></div></div>
    <div class="frow"><span class="flabel">bis</span><div class="fin"><input type="text" inputmode="decimal" data-c="energy-w" data-f="wHi" value="${numIn(cfg.wHi, 1)}"><span class="unit">kg</span></div></div></div>
    <div class="row-btns"><button class="pill-btn" data-a="energy-auto">${cfg.auto ? 'Ziel selbst einstellen' : 'Ziel wieder automatisch'}</button></div>
    <p class="hint">Garmin schätzt den Verbrauch, das kann 10–15 % daneben liegen. Deshalb korrigiert die App über deinen Gewichtstrend: am besten jeden Sonntag nüchtern wiegen.</p></section>`;
  return h;
}
/* Zeile für Wochenrückblick und Bericht an Frank */
function energyLine(ws) {
  const keys = weekKeys(ws).filter((k) => k < todayKey());
  const rows = keys.map((k) => { const d = peekDay(k); const burn = d && d.health ? Number(d.health.kcalTot) : NaN; return { burn: burn >= 1200 ? burn : null, intake: dayIntake(k) }; }).filter((r) => r.burn != null && r.intake != null && r.intake >= r.burn * 0.5);
  if (!rows.length) return '';
  const bi = mean(rows.map((r) => r.intake)), bb = mean(rows.map((r) => r.burn));
  return `Energiebilanz Ø ${bi - bb >= 0 ? '+' : '−'}${fmt(Math.abs(bi - bb))} kcal/Tag (gegessen Ø ${fmt(bi)}, verbraucht Ø ${fmt(bb)} laut Garmin, ${rows.length} Tage)`;
}

Object.assign(A, {
  'energy-goal': (el) => { S.settings.energy = { ...(S.settings.energy || {}), goal: el.dataset.v }; energyApply(); saveSettings(); },
  'energy-auto': () => { const e = S.settings.energy || {}; S.settings.energy = { ...e, auto: e.auto === false }; energyApply(); saveSettings(); toast(S.settings.energy.auto ? 'Kalorienziel wieder automatisch' : 'Kalorienziel stellst du unter Einstellungen → Tagesziele ein'); },
});
Object.assign(C, {
  'energy-w': (el) => {
    const v = parseNum(el.value);
    if (v != null && (v < 30 || v > 250)) { toast('Gewicht prüfen'); return; }
    S.settings.energy = { ...(S.settings.energy || {}), [el.dataset.f]: v };
    energyApply(); markDirty('settings'); invalidate(); flashSaved(el);
  },
});
