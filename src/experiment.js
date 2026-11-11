/* ============================================================
   SELBST-EXPERIMENTE (n-of-1, seit 2.10.0)
   Eine Sache gezielt testen: Tage paarweise zufällig „mit“ (A) oder „ohne“ (B), die Nacht
   danach wird gemessen (Sleep Score, Tiefschlaf, HRV). Nach Ablauf: Unterschied, Spannweite
   und ob er größer ist als das normale Rauschen (Welch-t-Test, grob). Nur Tage zählen, an
   denen du dich an die Vorgabe gehalten hast.
   ============================================================ */
/*icons: flask-conical*/
function mgItemId() { const f = allPlanItems().find(({ it }) => FOOD[it.food] && /magnes/i.test(FOOD[it.food].n || '')); return f ? f.it.id : null; }
const EXPS = {
  mg_abend: { n: 'Magnesium abends', a: 'MIT Magnesium', b: 'OHNE Magnesium', hint: 'A-Tage: Magnesium im Block „Vor dem Schlafen“ abhaken. B-Tage: weglassen.', comply: (k, arm) => { const id = mgItemId(), d = peekDay(k); return !!id && !!d && !!(d.checks || {})[id] === (arm === 'A'); } },
  caf_frueh: { n: 'Koffein 2 Std. früher stoppen', a: 'Koffein-Stopp 2 Std. früher', b: 'normaler Koffein-Stopp', hint: 'A-Tage: letztes Koffein 2 Std. vor deinem üblichen Stopp.', comply: (k, arm) => { if (arm === 'B') return true; const c = cafInfo(k); return c.last == null || c.last <= cafCutoff(k) - 120; } },
  dusche: { n: 'Warm duschen vor dem Schlafen', a: 'MIT warmer Dusche', b: 'OHNE warme Dusche', hint: 'A-Tage: 1–2 Std. vor dem Schlafen 10 Min. warm duschen.', comply: (k, arm) => { const d = peekDay(k); return !!d && !!(d.habits || {}).warm_dusche === (arm === 'A'); } },
  screen90: { n: '90 Min. bildschirmfrei vor dem Schlafen', a: '90 Min. ohne Bildschirm', b: 'wie sonst', hint: 'A-Tage: ab 90 Min. vor dem Schlafen kein Handy, Laptop, TV.', comply: (k, arm) => { if (arm === 'B') return true; const d = peekDay(k); return !!d && Number((d.hd || {}).screenFree) >= 90; } },
};
const EXP_METRICS = [['sleepScore', 'Sleep Score', '', 3], ['deep', 'Tiefschlaf', 'Min.', 8], ['hrv', 'HRV', 'ms', 3]];
function expCur() { const e = S.settings.exp; return e && e.id && EXPS[e.id] ? e : null; }
function expArm(k) { const e = expCur(); return e && e.plan ? e.plan[k] || null : null; }
function expStart(id, days = 14) {
  if (!EXPS[id] || expCur()) return false;
  const start = addDays(todayKey(), nowMin() > 18 * 60 ? 1 : 0), plan = {};
  for (let i = 0; i < days; i += 2) { const a = Math.random() < 0.5; plan[addDays(start, i)] = a ? 'A' : 'B'; plan[addDays(start, i + 1)] = a ? 'B' : 'A'; }
  S.settings.exp = { id, start, days, plan };
  markDirty('settings'); invalidate();
  return true;
}
function tApprox(t, df) { const z = Math.abs(t) * (1 - 1 / (4 * df)) / Math.sqrt(1 + (t * t) / (2 * df)); const p = 0.5 * Math.exp(-0.717 * z - 0.416 * z * z); return Math.min(1, 2 * p); } // zweiseitiger p-Wert, Näherung
function expResult(e) {
  const x = EXPS[e.id], rows = [];
  for (const [k, arm] of Object.entries(e.plan)) {
    if (k >= todayKey()) continue;
    const ok = x.comply(k, arm), nx = peekDay(addDays(k, 1)), h = (nx && nx.health) || {};
    rows.push({ k, arm, ok, v: { sleepScore: h.sleepScore != null ? Number(h.sleepScore) : null, deep: h.deep != null ? Number(h.deep) : null, hrv: h.hrv != null ? Number(h.hrv) : null } });
  }
  const res = EXP_METRICS.map(([m, n, u, min]) => {
    const A = rows.filter((r) => r.ok && r.arm === 'A' && r.v[m] != null).map((r) => r.v[m]), B = rows.filter((r) => r.ok && r.arm === 'B' && r.v[m] != null).map((r) => r.v[m]);
    if (A.length < 3 || B.length < 3) return { m, n, u, nA: A.length, nB: B.length };
    const ma = mean(A), mb = mean(B), va = A.reduce((s, v) => s + (v - ma) ** 2, 0) / (A.length - 1), vb = B.reduce((s, v) => s + (v - mb) ** 2, 0) / (B.length - 1);
    const se = Math.sqrt(va / A.length + vb / B.length) || 1e-9, t = (ma - mb) / se;
    const df = Math.max(2, (va / A.length + vb / B.length) ** 2 / ((va / A.length) ** 2 / (A.length - 1) + (vb / B.length) ** 2 / (B.length - 1) || 1));
    const p = tApprox(t, df), diff = ma - mb;
    const verdict = p < 0.1 && Math.abs(diff) >= min ? (diff > 0 ? 'besser' : 'schlechter') : 'kein klarer Unterschied';
    return { m, n, u, nA: A.length, nB: B.length, ma, mb, diff, p, verdict };
  });
  const done = Object.keys(e.plan).every((k) => k < todayKey());
  return { rows, res, done, comply: rows.length ? rows.filter((r) => r.ok).length / rows.length : null };
}
function expTodayCard(k = todayKey()) {
  const e = expCur(); if (!e) return '';
  const arm = expArm(k), x = EXPS[e.id];
  const day = Object.keys(e.plan).sort().indexOf(k) + 1;
  if (!arm) return '';
  return `<div class="banner exp-banner">${icon('flask-conical')}<div><b>Experiment Tag ${day}/${e.days}: heute ${esc(arm === 'A' ? x.a : x.b)}</b><span>${esc(x.n)}. ${esc(x.hint)}</span></div><button class="pill-btn sm" data-a="goto" data-tab="woche" data-sub="experimente">Stand</button></div>`;
}
function expHTML() {
  const e = expCur();
  let h = '<section class="sec"><div class="sec-head"><h2>Selbst-Experimente</h2></div>';
  if (e) {
    const x = EXPS[e.id], r = expResult(e);
    h += `<div class="card"><b>${esc(x.n)}</b><p class="hint">Seit ${esc(fmtDate(e.start, { day: 'numeric', month: 'short' }))}, ${e.days} Tage. Eingehalten: ${r.comply != null ? fmt(r.comply * 100) + ' %' : '–'} der bisherigen Tage. Gemessen wird die Nacht danach.</p>
      <div class="exp-grid">${Object.keys(e.plan).sort().map((k) => { const row = r.rows.find((z) => z.k === k); return `<span class="exp-d arm-${e.plan[k]}${row ? (row.ok ? ' is-ok' : ' is-miss') : ''}${k === todayKey() ? ' is-today' : ''}" title="${esc(shortDate(k))}">${e.plan[k]}</span>`; }).join('')}</div>
      <p class="hint">A = ${esc(x.a)}, B = ${esc(x.b)}. Grün = eingehalten, rot = nicht eingehalten.</p>
      ${expResHTML(r)}${r.done ? '<button class="btn is-accent" data-a="exp-end">Abschließen und speichern</button>' : '<button class="btn is-ghost" data-a="exp-end">Abbrechen</button>'}</div>`;
  } else {
    h += `<p class="sec-sub">Teste eine Sache 14 Tage lang gezielt. Die App teilt die Tage zufällig in „mit“ und „ohne“ ein, erinnert dich morgens und wertet deine Garmin-Nächte aus.</p><div class="list">${Object.entries(EXPS).map(([id, x]) => `<div class="row-wrap"><div class="row is-static"><span class="row-main"><b>${esc(x.n)}</b><small>${esc(x.a)} gegen ${esc(x.b)}</small></span></div><button class="pill-btn row-act" data-a="exp-start" data-id="${id}">${icon('play')}Start</button></div>`).join('')}</div>`;
  }
  const hist = (S.settings.expHist || []).slice().reverse();
  if (hist.length) h += `<h5>Abgeschlossen</h5>${hist.map((hx) => `<div class="card"><b>${esc((EXPS[hx.id] || {}).n || hx.id)}</b> <small class="hint">${esc(fmtDate(hx.start, { day: 'numeric', month: 'short', year: 'numeric' }))}</small>${expResHTML({ res: hx.res, done: true })}</div>`).join('')}`;
  return h + '<p class="hint">Einzelne Nächte schwanken stark. „Kein klarer Unterschied“ heißt nicht „wirkt nicht“, sondern: in 14 Tagen nicht vom Zufall zu trennen – dann eher länger testen.</p></section>';
}
function expResHTML(r) {
  return `<div class="exp-res">${r.res.map((x) => x.ma == null ? `<div><span>${esc(x.n)}</span><small>noch zu wenige Nächte (A ${x.nA}, B ${x.nB}, je 3 nötig)</small></div>` : `<div><span>${esc(x.n)}</span><b>${x.diff >= 0 ? '+' : '−'}${fmt(Math.abs(x.diff), 1)} ${esc(x.u)}</b><small>A Ø ${fmt(x.ma, 1)} · B Ø ${fmt(x.mb, 1)} · ${esc(x.verdict)}${r.done ? '' : ' (vorläufig)'}</small></div>`).join('')}</div>`;
}
Object.assign(A, {
  'exp-start': (el) => { if (expStart(el.dataset.id)) { render(); toast(`Experiment gestartet: ${EXPS[el.dataset.id].n}`); } },
  'exp-end': () => { const e = expCur(); if (!e) return; const r = expResult(e); if (r.done) S.settings.expHist = [...(S.settings.expHist || []), { id: e.id, start: e.start, days: e.days, res: r.res.map((x) => ({ ...x })) }]; delete S.settings.exp; saveSettings(); toast(r.done ? 'Experiment gespeichert' : 'Experiment abgebrochen'); },
});
function pushExp(k, r, add) {
  const arm = expArm(k); if (!arm) return;
  const x = EXPS[S.settings.exp.id];
  add('habits', r.wake + 25, 'exp', `Experiment heute: ${arm === 'A' ? x.a : x.b}`, x.hint, '#heute');
}
