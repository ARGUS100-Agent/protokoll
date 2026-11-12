/* ============================================================
   BLUTDRUCK (seit 2.11.0, Wunsch vom 12.11.2026)
   Selbst eintragen (systolisch, diastolisch, Puls). Messwoche alle 3 Monate nach der
   ESC-Leitlinie 2024 / ESH 2021: 7 Tage morgens und abends je 2 Messungen im Abstand von
   1–2 Min., nach 5 Min. Ruhe im Sitzen, Arm und Rücken gestützt; der erste Tag zählt nicht.
   Einordnung Heimmessung (ESC 2024): nicht erhöht < 120/70, erhöht 120/70 bis < 135/85,
   Hypertonie-Bereich ≥ 135/85. Die App ersetzt keine ärztliche Beurteilung.
   ============================================================ */
/*icons: heart-pulse activity triangle-alert*/
const BP_DAYS = 7;
function bpCfg() { return { every: 90, start: null, hist: [], ...(S.settings.bp || {}) }; }
function bpSave(c) { S.settings.bp = c; markDirty('settings'); invalidate(); }
function bpList(k) { const d = peekDay(k); return (d && Array.isArray(d.bp)) ? d.bp : []; }
function bpSlot(t) { const m = typeof t === 'number' ? t : timeToMin(t); return m != null && m < 14 * 60 ? 'am' : 'pm'; }
function bpCat(sys, dia) {
  if (sys >= 135 || dia >= 85) return { id: 'hoch', n: 'Hypertonie-Bereich', st: 'over' };
  if (sys >= 120 || dia >= 70) return { id: 'erhoeht', n: 'erhöht', st: 'under' };
  return { id: 'ok', n: 'nicht erhöht', st: 'ok' };
}
/* Laufende Messwoche: Tag 1–7 */
function bpWeek(k = todayKey()) {
  const c = bpCfg();
  if (!c.start) return null;
  const day = daysBetween(c.start, k) + 1;
  return day >= 1 && day <= BP_DAYS ? { start: c.start, day, end: addDays(c.start, BP_DAYS - 1) } : null;
}
function bpNextDue(k = todayKey()) {
  const c = bpCfg(), last = (c.hist || []).slice(-1)[0];
  if (bpWeek(k)) return null;
  if (!last && !c.start) return k;
  const from = last ? last.end : addDays(c.start, BP_DAYS - 1);
  return addDays(from, c.every);
}
/* Auswertung einer Messwoche (ohne Tag 1, wenn danach genug Messungen da sind) */
function bpEval(start) {
  const keys = Array.from({ length: BP_DAYS }, (_, i) => addDays(start, i));
  const all = keys.flatMap((k, i) => bpList(k).map((x) => ({ ...x, k, i })));
  const later = all.filter((x) => x.i > 0), use = later.length >= 6 ? later : all;
  if (!use.length) return null;
  const sys = mean(use.map((x) => x.sys)), dia = mean(use.map((x) => x.dia)), pul = use.filter((x) => x.pul).length ? mean(use.filter((x) => x.pul).map((x) => x.pul)) : null;
  const am = use.filter((x) => x.slot === 'am'), pm = use.filter((x) => x.slot === 'pm');
  const days = new Set(use.map((x) => x.k)).size;
  return { sys: Math.round(sys), dia: Math.round(dia), pul: pul != null ? Math.round(pul) : null, n: use.length, days, cat: bpCat(sys, dia), enough: days >= 3 && use.length >= 12, am: am.length ? [Math.round(mean(am.map((x) => x.sys))), Math.round(mean(am.map((x) => x.dia)))] : null, pm: pm.length ? [Math.round(mean(pm.map((x) => x.sys))), Math.round(mean(pm.map((x) => x.dia)))] : null, dropFirst: use === later };
}
function bpTodayState(k = todayKey()) { const l = bpList(k); return { am: l.filter((x) => x.slot === 'am').length, pm: l.filter((x) => x.slot === 'pm').length }; }
/* Was kurz vor der Messung den Wert verfälschen kann */
function bpConfounders(k, t) {
  const out = [], m = timeToMin(t);
  if (m == null) return out;
  try { const c = cafInfo(k); if (c.today.some((x) => x.t <= m && m - x.t < 30)) out.push('Koffein in den letzten 30 Min.'); } catch (e) { /* egal */ }
  const tr = ((peekDay(k) || {}).trainings || []).find((x) => { const s = timeToMin(x.time); return s != null && m >= s && m - (s + (Number(x.dur) || 45)) < 30; });
  if (tr) out.push('Training kurz davor');
  if ((peekDay(k) || {}).sauna && (peekDay(k).sauna || []).some((s) => { const st = timeToMin(s.t); return st != null && m >= st && m - st < 60; })) out.push('Sauna kurz davor');
  return out;
}
function bpAlarm(x) {
  if (x.sys >= 180 || x.dia >= 110) return 'Sehr hoher Wert. 5 Min. ruhig sitzen und nochmal messen. Bleibt er so hoch, heute noch ärztlich abklären lassen – bei Brustschmerz, Atemnot, Sehstörung, Lähmung oder Sprachproblemen sofort 112.';
  if (x.sys < 90 || x.dia < 55) return 'Niedriger Wert. Ohne Beschwerden meist harmlos (bei Sportlern häufig). Bei Schwindel oder Ohnmacht ärztlich abklären lassen.';
  return null;
}
/* ---------- Oberfläche (unter Körper) ---------- */
function bpSection(k) {
  const c = bpCfg(), w = bpWeek(k), due = bpNextDue(k), list = bpList(k), st = bpTodayState(k);
  let h = '<section class="sec bp-sec" id="blutdruck"><div class="sec-head"><h2>Blutdruck</h2>';
  h += w ? `<span class="count">Messwoche Tag ${w.day}/${BP_DAYS}</span>` : due ? `<span class="count">${due <= k ? 'Messwoche fällig' : 'nächste Messwoche ' + esc(fmtDate(due, { day: 'numeric', month: 'short' }))}</span>` : '';
  h += '</div>';
  if (w) h += `<div class="bp-today"><span class="${st.am >= 2 ? 'is-ok' : ''}">${icon(st.am >= 2 ? 'check' : 'sunrise')}Morgens ${st.am}/2</span><span class="${st.pm >= 2 ? 'is-ok' : ''}">${icon(st.pm >= 2 ? 'check' : 'moon')}Abends ${st.pm}/2</span></div>`;
  else if (due && due <= k) h += `<div class="banner">${icon('heart-pulse')}<div><b>Blutdruck-Messwoche starten</b><span>7 Tage morgens und abends je 2 Messungen. Die App erinnert dich und rechnet den Mittelwert.</span></div><button class="pill-btn sm" data-a="bp-start">Starten</button></div>`;
  h += `<div class="bp-form"><label><span>Systolisch</span><input type="text" inputmode="numeric" id="bp-sys" placeholder="120"></label><label><span>Diastolisch</span><input type="text" inputmode="numeric" id="bp-dia" placeholder="80"></label><label><span>Puls</span><input type="text" inputmode="numeric" id="bp-pul" placeholder="60"></label><button class="btn is-accent" data-a="bp-add" data-date="${k}">${icon('plus')}Eintragen</button></div>`;
  if (list.length) h += `<div class="list">${list.map((x, i) => { const cat = bpCat(x.sys, x.dia); return `<div class="bp-row"><span class="bp-v st-${cat.st}"><b>${x.sys}/${x.dia}</b>${x.pul ? `<small>Puls ${x.pul}</small>` : ''}</span><span class="bp-m">${esc(x.t)} · ${x.slot === 'am' ? 'morgens' : 'abends'}${x.note ? `<small>${esc(x.note)}</small>` : ''}</span><button class="icon-btn sm ghost" data-a="bp-del" data-i="${i}" data-date="${k}" aria-label="Löschen">${icon('trash-2')}</button></div>`; }).join('')}</div>`;
  h += '<p class="hint">So misst du richtig: 5 Min. ruhig sitzen, Rücken angelehnt, Füße auf dem Boden, Manschette am nackten Oberarm auf Herzhöhe, nicht sprechen. Zweimal messen, 1–2 Min. Pause. Morgens vor Frühstück, Koffein und Training, abends vor dem Schlafen.</p>';
  /* Auswertung */
  const weeks = [...(c.hist || [])];
  if (c.start && !weeks.some((x) => x.start === c.start)) weeks.push({ start: c.start, end: addDays(c.start, BP_DAYS - 1), cur: true });
  const ev = weeks.map((x) => ({ ...x, e: bpEval(x.start) })).filter((x) => x.e).reverse();
  if (ev.length) {
    const e0 = ev[0].e;
    h += `<div class="kv-grid is-3"><div class="kv"><span>${ev[0].cur && w ? 'Ø bisher' : 'Ø Messwoche'}</span><b>${e0.sys}/${e0.dia}</b><small>mmHg · ${e0.n} Messungen</small></div><div class="kv"><span>Einordnung</span><b class="bp-cat st-${e0.cat.st}">${esc(e0.cat.n)}</b><small>Heimmessung, ESC 2024</small></div><div class="kv"><span>Puls Ø</span><b>${e0.pul ?? '–'}</b><small>Schläge/Min.</small></div></div>`;
    h += `<p class="hint">${e0.enough ? '' : 'Für eine verlässliche Einordnung mindestens 3 Tage und 12 Messungen. '}${e0.dropFirst ? 'Der erste Tag zählt nicht (man ist anfangs oft aufgeregter). ' : ''}${e0.am && e0.pm ? `Morgens Ø ${e0.am[0]}/${e0.am[1]}, abends Ø ${e0.pm[0]}/${e0.pm[1]}. ` : ''}${e0.cat.id === 'hoch' ? 'Im Hypertonie-Bereich: Werte bitte mit dem Hausarzt besprechen.' : e0.cat.id === 'erhoeht' ? 'Erhöht heißt nicht krank: Bewegung, wenig Salz, Schlaf und wenig Alkohol senken den Druck. Beim Arzt ansprechen, wenn es so bleibt.' : 'Gut so.'}</p>`;
    const pts = [];
    for (const x of weeks) for (let i = 0; i < BP_DAYS; i++) { const k2 = addDays(x.start, i); const l = bpList(k2); if (l.length) pts.push({ k: k2, sys: mean(l.map((y) => y.sys)), dia: mean(l.map((y) => y.dia)) }); }
    if (pts.length >= 2) {
      const body = lineChart({ keys: pts.map((p) => p.k), series: [{ name: 'Systolisch', color: SERIES.one, vals: pts.map((p) => p.sys), dots: true }, { name: 'Diastolisch', color: SERIES.two, vals: pts.map((p) => p.dia), dots: true }], unit: 'mmHg', fmtY: (v) => fmt(v) });
      h += chartCard('bp', 'Blutdruck-Verlauf', 'Tagesmittel der Messwochen. Hypertonie-Bereich bei Heimmessung ab 135/85, nicht erhöht unter 120/70.', body, `<tr><th>Messwoche</th><th>Ø</th><th>Puls</th><th>Einordnung</th></tr>` + ev.map((x) => `<tr><td>${shortDate(x.start)}</td><td>${x.e.sys}/${x.e.dia}</td><td>${x.e.pul ?? '–'}</td><td>${esc(x.e.cat.n)}</td></tr>`).join(''), `<div class="legend"><span><i class="line-key" style="background:${SERIES.one}"></i>Systolisch</span><span><i class="line-key" style="background:${SERIES.two}"></i>Diastolisch</span></div>`);
    }
  }
  h += `<div class="chips chips-tight"><span class="hint">Messwoche alle</span>${[30, 60, 90, 180].map((n) => `<button class="chip chip-xs${c.every === n ? ' is-on' : ''}" data-a="bp-every" data-v="${n}">${n === 30 ? '1 Monat' : n === 180 ? '6 Monate' : n / 30 + ' Monate'}</button>`).join('')}${w ? '<button class="chip chip-xs" data-a="bp-stop">Messwoche beenden</button>' : !due || due > k ? '<button class="chip chip-xs" data-a="bp-start">Jetzt Messwoche</button>' : ''}</div>`;
  return h + '</section>';
}
function bpTodayCard(k = todayKey()) {
  const w = bpWeek(k), due = bpNextDue(k);
  if (w) { const st = bpTodayState(k), now = nowMin(), r = rhythm(k); const open = (st.am < 2 && now < 14 * 60) || (st.pm < 2 && now >= r.bed - 120); if (!open && st.am >= 2 && st.pm >= 2) return ''; return `<div class="banner bp-banner">${icon('heart-pulse')}<div><b>Blutdruck-Messwoche Tag ${w.day}/${BP_DAYS}</b><span>Morgens ${st.am}/2 · abends ${st.pm}/2</span></div><button class="pill-btn sm" data-a="bp-go">Messen</button></div>`; }
  if (due && due <= k) return `<div class="banner bp-banner">${icon('heart-pulse')}<div><b>Blutdruck-Messwoche fällig</b><span>7 Tage, morgens und abends je 2 Messungen.</span></div><button class="pill-btn sm" data-a="bp-start">Starten</button></div>`;
  return '';
}
Object.assign(A, {
  'bp-go': () => { go('koerper', { date: todayKey() }); setTimeout(() => { const el = document.getElementById('blutdruck'); if (el) el.scrollIntoView({ block: 'start' }); const i = $('#bp-sys'); if (i) i.focus(); }, 50); },
  'bp-start': () => { const c = bpCfg(); if (c.start && !bpWeek(todayKey()) && !(c.hist || []).some((x) => x.start === c.start)) { const e = bpEval(c.start); if (e) c.hist = [...(c.hist || []), { start: c.start, end: addDays(c.start, BP_DAYS - 1), sys: e.sys, dia: e.dia, pul: e.pul }]; } c.start = todayKey(); bpSave(c); render(); toast('Messwoche gestartet: 7 Tage, morgens und abends je 2 Messungen'); },
  'bp-stop': () => { const c = bpCfg(); if (!c.start) return; const e = bpEval(c.start); if (e) c.hist = [...(c.hist || []).filter((x) => x.start !== c.start), { start: c.start, end: todayKey(), sys: e.sys, dia: e.dia, pul: e.pul }]; c.start = null; bpSave(c); render(); toast('Messwoche beendet'); },
  'bp-every': (el) => { const c = bpCfg(); c.every = Number(el.dataset.v); bpSave(c); render(); },
  'bp-add': (el) => {
    const k = curDate(el), sys = parseNum(($('#bp-sys') || {}).value || ''), dia = parseNum(($('#bp-dia') || {}).value || ''), pul = parseNum(($('#bp-pul') || {}).value || '');
    if (sys == null || dia == null || sys < 60 || sys > 260 || dia < 30 || dia > 160 || dia >= sys) { toast('Bitte gültige Werte eintragen (z. B. 122 / 78)'); return; }
    const t = k === todayKey() ? minToTime(nowMin()) : '08:00';
    const note = bpConfounders(k, t).join(', ');
    const x = { sys: Math.round(sys), dia: Math.round(dia), pul: pul != null && pul >= 30 && pul <= 220 ? Math.round(pul) : null, t, slot: bpSlot(t), ...(note ? { note } : {}) };
    mutDay(k, (d) => { d.bp = d.bp || []; d.bp.push(x); });
    render();
    const al = bpAlarm(x), st = bpTodayState(k);
    if (al) toast(al);
    else if (note) toast(`Notiert – ${note} kann den Wert erhöhen`);
    else toast(st[x.slot] === 1 ? 'Notiert – in 1–2 Min. die zweite Messung' : `${x.sys}/${x.dia} notiert (${bpCat(x.sys, x.dia).n})`);
  },
  'bp-del': (el) => { const k = curDate(el), i = Number(el.dataset.i); const old = bpList(k)[i]; mutDay(k, (d) => { d.bp = (d.bp || []).filter((_, j) => j !== i); }); render(); toast('Messung gelöscht', () => { mutDay(k, (d) => { d.bp = d.bp || []; d.bp.splice(i, 0, old); }); render(); }); },
});
/* Mitteilungen (Kategorie To-dos & Checks): an Messtagen morgens und abends, Start einer fälligen Messwoche */
function pushBP(k, r, add) {
  const w = bpWeek(k), st = bpTodayState(k);
  if (w) {
    if (st.am < 2) add('todo', r.wake + 15, 'bp-am', `Blutdruck messen (Tag ${w.day}/${BP_DAYS})`, 'Vor Frühstück und Koffein: 5 Min. sitzen, dann zweimal messen, 1–2 Min. Pause.', '#blutdruck');
    if (st.pm < 2) add('todo', r.bed - 45, 'bp-pm', `Blutdruck abends (Tag ${w.day}/${BP_DAYS})`, '5 Min. ruhig sitzen, zweimal messen, 1–2 Min. Pause.', '#blutdruck');
  } else { const due = bpNextDue(k); if (due && due === k) add('todo', r.wake + 60, 'bp-due', 'Blutdruck-Messwoche fällig', 'Antippen und starten: 7 Tage morgens und abends je 2 Messungen.', '#blutdruck'); }
}
/* Zeile im Wochenbericht */
function bpReportLine(ws) {
  const c = bpCfg();
  const wk = [...(c.hist || []), ...(c.start ? [{ start: c.start }] : [])].filter((x) => x.start <= addDays(ws, 6) && addDays(x.start, BP_DAYS - 1) >= ws).pop();
  if (!wk) return '';
  const e = bpEval(wk.start);
  return e ? `Blutdruck (Messwoche ab ${shortDate(wk.start)}, Heimmessung): Ø ${e.sys}/${e.dia} mmHg, Puls ${e.pul ?? '–'}, ${e.n} Messungen → ${e.cat.n} (ESC 2024: < 120/70 nicht erhöht, ≥ 135/85 Hypertonie-Bereich)` : '';
}
