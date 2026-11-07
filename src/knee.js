/* ============================================================
   KNIE-RESET & MOBILITY – Ansichten und geführter Timer
   ============================================================ */
Object.assign(ui, { rtEdit: null, rtOpen: null, timer: null, exOpen: null, todoDone: false });
const KNEE_SUB = [['heute', 'Heute'], ['routinen', 'Routinen'], ['kraft', 'Kraftplan'], ['laeufe', 'Läufe'], ['tests', 'Tests'], ['uebungen', 'Übungen'], ['infos', 'Infos & Termine']];
function vKnie() {
  const sub = getSub('knie', 'heute');
  const w = kneeWeek();
  let h = areaHead('knie', `<span class="count">${w ? `Woche ${Math.min(w, 99)} von 12` : 'Start ' + fmtDate(kneeCfg().start, { day: 'numeric', month: 'short' })} · ${esc(kneePhase().n)}</span>`);
  h += subnav('knie', sub, KNEE_SUB);
  const views = { heute: vKnieToday, routinen: vKnieRoutines, kraft: vKnieKraft, laeufe: vKnieRuns, tests: vKnieTests, uebungen: vKnieEx, infos: vKnieInfos };
  return h + (views[sub] || vKnieToday)();
}

/* ---------- Heute ---------- */
function vKnieToday() {
  const k = ui.date;
  let h = dateBar(k);
  const flags = redFlags(k);
  if (flags.length) h += `<div class="banner is-red">${icon('octagon-alert')}<div><b>Warnzeichen: ${esc(flags.join(', '))}</b><span>${esc(KNEE_RED_FLAGS)}</span></div></div>`;
  if (k === todayKey()) h += phaseGateCard();
  h += kneeMorningCard(k, false);
  const dd = dayDone(k);
  const items = kneePlanItemsToday(k);
  const ins = insolesInfo(k);
  h += `<section class="sec"><div class="sec-head"><h2>Heute dran</h2><span class="count">${WD_LONG[weekday(k)]}</span></div><div class="list">`;
  for (const it of items) {
    const done = it.kind === 'mob' ? dd.mob : it.kind === 'kraft' ? dd.kraft : it.kind === 'lauf' ? dd.run > 0 : it.kind === 'lang' ? dd.lang : it.kind === 'vorlauf' ? kneeSessions(peekDay(k)).some((s) => s.r === 'vorlauf') : false;
    let act = '';
    if (it.r && !done) act = `<button class="pill-btn is-accent" data-a="timer-start" data-r="${it.r}">${icon('play')}Start</button>`;
    else if (it.kind === 'kraft' && !done) act = `<button class="pill-btn" data-a="sub" data-area="knie" data-v="kraft">Öffnen</button>`;
    else if (it.kind === 'lauf' && !done) act = `<button class="pill-btn" data-a="run-add" data-date="${k}">Eintragen</button>`;
    let sub = '';
    if (it.r) { const rt = routineById(it.r); if (rt) sub = `ca. ${Math.round(routineSec(rt, { short: it.r === 'lang' && kneeCfg().longShort }) / 60)} Min.`; }
    if (it.kind === 'kraft') sub = `${kneePhase().ex.length} Übungen · ${esc(kneePhase().goal)}`;
    if (it.kind === 'lauf') sub = `im Gesprächstempo, Kadenz ${kneeCfg().cadence ? `${Math.round(kneeCfg().cadence * 1.05)}–${Math.round(kneeCfg().cadence * 1.1)}` : '+5–10 %'}${ins && !ins.before && !ins.runOk ? ` · mit Einlagen erst ab ${fmtDate(ins.runFrom, { day: 'numeric', month: 'short' })}` : ''}`;
    if (it.kind === 'mob' && !done) sub = (sub ? sub + ' · ' : '') + 'oder ohne Timer abhaken';
    h += `<div class="plan-row${done ? ' is-done' : ''}"><button class="tgl-box-btn" ${it.kind === 'mob' ? `data-a="knee-mob" data-date="${k}"` : 'disabled'} aria-label="erledigt">${'<span class="tgl-box">' + icon('check') + '</span>'}</button><span class="row-main"><b>${esc(it.n)}</b>${sub ? `<small>${sub}</small>` : ''}</span>${act}</div>`;
  }
  h += `</div><div class="row-btns"><button class="pill-btn" data-a="timer-start" data-r="kurz">${icon('play')}Kurzroutine 30 Min.</button><button class="pill-btn" data-a="timer-start" data-r="pflicht5">${icon('play')}Pflicht-5</button></div></section>`;
  const q = kneeQuota(weekStart(k));
  const qt = (l, v, g, s = '') => `<div class="kv"><span>${l}</span><b>${v}/${g}</b>${progBar(v, typeof g === 'number' ? g : 2, v >= (typeof g === 'number' ? g : 2) ? 'ok' : '')}${s ? `<small>${s}</small>` : ''}</div>`;
  h += `<section class="sec"><div class="sec-head"><h2>Diese Woche</h2><span class="count">Serie Mobilität: ${mobStreak()} ${mobStreak() === 1 ? 'Tag' : 'Tage'}</span></div><div class="kv-grid">${qt('Knie-Kraft', q.kraft, q.kraftGoal)}${qt('Läufe', q.runs, q.runsGoal, `${fmt(kmWeek(weekStart(k)), 1)} km`)}${qt('Mobilität', q.mob, 7)}${qt('Lange Routine', q.lang, '2–3')}</div></section>`;
  if (ins) h += insolesCard(k, ins);
  const td = testDue();
  if (td.due) h += `<div class="banner">${icon('ruler')}<div><b>Test fällig</b><span>${td.days == null ? 'Noch kein Test gemacht.' : `Letzter Test vor ${td.days} Tagen.`} Step-down, Knie zur Wand, Einbeinstand, Sit-and-Reach, Couch-Stretch.</span></div><button class="pill-btn" data-a="sub" data-area="knie" data-v="tests">Testen</button></div>`;
  const sp = stretchProg();
  if (sp.length) h += `<div class="banner is-soft">${icon('trending-up')}<div><b>Dehnungen steigern</b><span>${esc(sp.map((id) => exById(id).n).join(', '))}: seit 2 Wochen unter 5/10 Zug → 45–60 Sek. halten oder die schwierigere Variante.</span></div></div>`;
  const ms = milestones().find((m) => !m.done);
  if (ms) h += `<p class="hint">${icon('flag')} Nächster Meilenstein: ${esc(ms.n)} (${ms.week ? `Woche ${ms.week[0]}${ms.week[1] !== ms.week[0] ? '–' + ms.week[1] : ''}` : esc(ms.sub)}).</p>`;
  return h;
}
function insolesCard(k, ins) {
  if (ins.before) return `<p class="hint">${icon('footprints')} Einlagen ab ${esc(fmtDate(kneeCfg().insoles, { day: 'numeric', month: 'long' }))} (in ${ins.inDays} Tagen).</p>`;
  return `<section class="card"><div class="sec-head"><h2>Einlagen</h2><span class="count">Tag ${ins.n}</span></div>
    <div class="form"><div class="frow"><span class="flabel">Heute getragen<small class="sub">Ziel ${ins.full ? 'ganzer Tag' : `ca. ${fmt(ins.target, 1)} Std.`}</small></span><div class="fin"><input type="text" inputmode="decimal" data-c="knee-ins" data-date="${k}" value="${numIn(ins.worn, 1)}" placeholder="–"><span class="unit">Std.</span></div></div></div>
    <p class="hint">${ins.runOk ? 'Laufen mit Einlagen ist freigegeben – anfangs kurze Läufe.' : `Langsam steigern (Start 1–2 Std./Tag). Laufen mit Einlagen frühestens ab ${esc(fmtDate(ins.runEarliest, { day: 'numeric', month: 'short' }))}, sicher ab ${esc(fmtDate(ins.runFrom, { day: 'numeric', month: 'short' }))}.`}</p></section>`;
}
function phaseGateCard() {
  const g = phaseGate();
  if (!g) return '';
  const to = KNEE_PHASES.find((p) => p.id === g.to);
  return `<section class="card gate${g.ready ? ' is-ok' : ''}"><div class="sec-head"><h2>Phasenwechsel?</h2><span class="count">laut Plan jetzt ${esc(to.n)}</span></div>
    ${g.ready ? `<p>${icon('badge-check')} Step-down stabil und alle Schmerzwerte der letzten 2 Wochen ≤ 3/10 – bereit für ${esc(to.n)}.</p>` : `<p>Noch nicht bereit – Empfehlung: aktuelle Phase um eine Woche verlängern.</p><ul class="gaps">${g.reasons.map((r) => `<li>${icon('arrow-down')}<span>${esc(r)}</span></li>`).join('')}</ul>`}
    <div class="row-btns">${g.ready ? `<button class="pill-btn is-accent" data-a="knee-phase-go" data-v="${g.to}">${esc(to.n)} starten</button>` : `<button class="pill-btn is-accent" data-a="knee-phase-ext">Phase verlängern</button><button class="pill-btn" data-a="sub" data-area="knie" data-v="tests">Test machen</button><button class="pill-btn is-ghost" data-a="knee-phase-go" data-v="${g.to}">Trotzdem wechseln</button>`}</div></section>`;
}

/* ---------- Routinen ---------- */
function lastSession(rid) {
  for (let i = 0; i < 120; i++) { const k = addDays(todayKey(), -i); const s = kneeSessions(peekDay(k)).filter((x) => x.r === rid); if (s.length) return { k, s: s[s.length - 1] }; }
  return null;
}
function avgReal(rid) {
  const vals = [];
  for (const k of rangeKeys(60)) for (const s of kneeSessions(peekDay(k))) if (s.r === rid && s.complete && s.act) vals.push(s.act);
  return vals.length ? mean(vals) : null;
}
function vKnieRoutines() {
  if (ui.rtEdit) return routineEditor(ui.rtEdit);
  let h = `<p class="sec-sub">Der Timer führt dich durch jede Übung, sagt Seitenwechsel an und gibt der Seite mit Aufschlag (${kneeCfg().side}) automatisch ${kneeCfg().extraSec} Sek. bzw. ${kneeCfg().extraReps} Wiederholungen mehr.</p>`;
  for (const rt of routines()) {
    const short = rt.id === 'lang' && kneeCfg().longShort;
    const sec = routineSec(rt, { short });
    const last = lastSession(rt.id), real = avgReal(rt.id);
    const open = ui.rtOpen === rt.id;
    h += `<section class="card rt-card"><div class="rt-top"><div><h3>${esc(rt.n)}</h3><small>geplant ca. ${Math.round(sec / 60)} Min.${real ? ` · gemessen Ø ${Math.round(real / 60)} Min.` : ''}${last ? ` · zuletzt ${last.k === todayKey() ? 'heute' : fmtDate(last.k, { day: 'numeric', month: 'short' })}` : ''}</small></div><button class="pill-btn is-accent" data-a="timer-start" data-r="${rt.id}">${icon('play')}Start</button></div>
      ${rt.id === 'lang' ? `<button class="chip chip-xs${short ? ' is-on' : ''}" data-a="knee-longshort">45-Min.-Version (Rollen 30 Sek./Seite, ohne Faden einfädeln)</button>` : ''}
      <div class="row-btns"><button class="link-btn" data-a="rt-open" data-id="${rt.id}">${open ? 'Übungen ausblenden' : `${rt.items.length} Übungen zeigen`}</button><button class="link-btn" data-a="rt-edit" data-id="${rt.id}">${icon('pencil')} Bearbeiten</button></div>
      ${open ? routineList(rt, short) : ''}</section>`;
  }
  return h;
}
function routineList(rt, short) {
  let h = '<ol class="rt-list">', grp = null;
  for (const it of rt.items) {
    if (short && it.skipShort) continue;
    const ex = exById(it.i);
    if (!ex) continue;
    if (it.grp && it.grp !== grp) { grp = it.grp; h += `<li class="rt-grp">${esc(grp)}</li>`; }
    const it2 = short && it.short ? { ...it, sec: it.short } : it;
    h += `<li><button class="link-row" data-a="ex-show" data-id="${ex.id}"><b>${esc(ex.n)}</b><small>${esc(doseText(ex, it2))}${it.opt ? ' · optional' : ''}</small></button></li>`;
  }
  return h + '</ol>';
}
function routineEditor(rid) {
  const rt = routineById(rid);
  if (!rt) { ui.rtEdit = null; return vKnieRoutines(); }
  let h = `<div class="sess-head"><button class="icon-btn" data-a="rt-edit-close" aria-label="Zurück">${icon('chevron-left')}</button><div><h3>${esc(rt.n)} bearbeiten</h3><small>Änderungen gelten sofort. Zeiten = linke Seite bzw. beidseitig.</small></div></div><div class="list">`;
  rt.items.forEach((it, i) => {
    const ex = exById(it.i);
    if (!ex) return;
    const d = ex.d;
    h += `<div class="rt-ed"><div class="pe-top"><b>${esc(ex.n)}</b><div class="pe-tools"><button class="icon-btn sm" data-a="rt-move" data-i="${i}" data-d="-1" aria-label="Nach oben">${icon('arrow-up')}</button><button class="icon-btn sm" data-a="rt-move" data-i="${i}" data-d="1" aria-label="Nach unten">${icon('arrow-down')}</button><button class="icon-btn sm" data-a="rt-del" data-i="${i}" aria-label="Entfernen">${icon('trash-2')}</button></div></div>
      <div class="pe-row">${d.t === 'time' ? `<label class="pe-av">Sek.<input type="text" inputmode="numeric" data-c="rt-item" data-i="${i}" data-f="sec" value="${it.sec || d.sec}"></label>` : d.t === 'reps' ? `<label class="pe-av">Wdh.<input type="text" inputmode="numeric" data-c="rt-item" data-i="${i}" data-f="reps" value="${it.reps || d.reps}"></label>` : ''}<label class="pe-av">Sätze<input type="text" inputmode="numeric" data-c="rt-item" data-i="${i}" data-f="sets" value="${it.sets || d.sets || 1}"></label>${it.opt ? '<span class="hint">optional</span>' : ''}</div></div>`;
  });
  h += `</div><div class="row-btns"><button class="pill-btn" data-a="rt-add">${icon('plus')}Übung hinzufügen</button><button class="pill-btn is-ghost" data-a="rt-reset">Diese Routine zurücksetzen</button></div>`;
  return h;
}
function sheetExPick() {
  ui.sheet = { type: 'expick' };
  openSheet(`<h3 class="sheet-title">Übung hinzufügen</h3>${Object.entries(KNEE_CATS).map(([c, n]) => `<h5>${esc(n)}</h5><div class="list">${KNEE_EX.filter((e) => e.cat === c && e.d.t !== 'info').map((e) => `<button class="row" data-a="rt-pick" data-id="${e.id}"><span class="row-main"><b>${esc(e.n)}</b><small>${esc(e.dose)}</small></span>${icon('plus', 'row-ic')}</button>`).join('')}</div>`).join('')}`);
}

/* ---------- Kraftplan ---------- */
function vKnieKraft() {
  const k = todayKey();
  const ph = kneePhase(), w = kneeWeek();
  const d = getDay(k), str = kneeDay(d).str || {};
  let h = phaseGateCard();
  h += `<div class="phase-bar knee-phases">${KNEE_PHASES.map((p) => `<div class="phase-seg${p.id === ph.id ? ' is-now' : ''}" style="flex:${p.weeks[1] - p.weeks[0] + 1};--pc:${PHASE_COLORS[p.id - 1]}"><i style="width:${p.id < ph.id ? 100 : p.id > ph.id ? 0 : clamp(((w - p.weeks[0] + 1) / (p.weeks[1] - p.weeks[0] + 1)) * 100, 4, 100)}%"></i><span>P${p.id} · W${p.weeks[0]}–${p.weeks[1]}</span></div>`).join('')}</div>`;
  h += `<p class="sec-sub">${esc(ph.goal)} ${ph.perWeek}× pro Woche (Standard: ${WD_LONG.filter((_, i) => weekTpl(i).kraft).join(', ')}).${(kneeCfg().ext || 0) ? ` Phase um ${kneeCfg().ext} Woche(n) verlängert.` : ''}</p>`;
  const tpl = weekTpl(weekday(k));
  if (tpl.gym && gymDay(tpl.gym) && gymDay(tpl.gym).legs) h += `<div class="banner is-soft">${icon('dumbbell')}<div><b>Heute Beintag</b><span>Clamshells, Monster Walks und Glute Bridge als Aufwärmen vor dem Gym. Wandsitzen und Wadenheben können entfallen – Wadenheben ist im Beintag.</span></div></div>`;
  else if (tpl.gym) h += `<p class="hint">${icon('dumbbell')} Heute ${esc(gymDay(tpl.gym).n)}: Knie-Kraft direkt nach dem Oberkörpertraining.</p>`;
  h += `<section class="sec"><div class="sec-head"><h2>Einheit heute</h2>${str.done ? `<span class="st st-ok">${icon('check')}erledigt</span>` : ''}</div>`;
  for (const pe of ph.ex) {
    const ex = exById(pe.i);
    if (!ex) continue;
    const it = { sets: pe.sets, reps: pe.reps, sec: pe.sec };
    const e = (str.ex || {})[ex.id] || {};
    const prog = strengthProg(ex.id, pe.sets);
    const sets = Array.from({ length: pe.sets }, (_, i) => `<button class="set-dot${(e.sets || [])[i] ? ' is-on' : ''}" data-a="kstr-set" data-ex="${ex.id}" data-i="${i}" data-n="${pe.sets}" aria-label="Satz ${i + 1}">${i + 1}</button>`).join('');
    const loads = ex.band ? `<div class="chips chips-tight load-chips">${kneeCfg().bands.map((b) => `<button class="chip chip-xs${e.load === b.n ? ' is-on' : ''}" data-a="kstr-load" data-ex="${ex.id}" data-v="${esc(b.n)}">${esc(b.n)} ${fmt(b.kg, 1)} kg</button>`).join('')}<button class="chip chip-xs${e.load === 'ohne' ? ' is-on' : ''}" data-a="kstr-load" data-ex="${ex.id}" data-v="ohne">ohne</button></div>`
      : ['k_bss', 'k_slrdl', 'k_wadeeinbein', 'k_wadeexz'].includes(ex.id) ? `<label class="mini-in kg-in"><input type="text" inputmode="decimal" data-c="kstr-kg" data-ex="${ex.id}" value="${esc(e.load && e.load !== 'ohne' ? e.load : '')}" placeholder="kg"><span>kg Zusatz</span></label>` : '';
    h += `<div class="kstr${(e.sets || []).filter(Boolean).length >= pe.sets ? ' is-done' : ''}"><div class="kstr-top"><button class="link-row" data-a="ex-show" data-id="${ex.id}"><b>${esc(ex.n)}</b><small>${esc(doseText(ex, it))}</small></button>${ex.d.t === 'time' ? `<button class="pill-btn sm" data-a="hold-timer" data-ex="${ex.id}" data-sets="1" data-sec="${pe.sec}">${icon('timer')}${pe.sec} s</button>` : ''}</div>
      <div class="kstr-sets">${sets}</div>${loads}${prog ? `<p class="hint prog">${icon('trending-up')} ${esc(prog)}</p>` : ''}</div>`;
  }
  h += `<p class="flabel-s">Knieschmerz während der Einheit (0–10)</p>${scale0('kstr-pain', str.pain ?? null, k)}
    <button class="btn ${str.done ? 'is-ghost' : 'is-accent'}" data-a="kstr-done">${str.done ? 'Als nicht erledigt markieren' : `${icon('check')}Einheit abschließen`}</button></section>`;
  if (ph.id === 3) h += `<p class="hint">${icon('activity')} Phase 3: Lauf-ABC 1×/Woche ca. 10 Min. (A-Skip, Hopserlauf, Wall Drill je 2 × 20 m) und Step-down-Test jede Woche.</p>`;
  h += `<p class="hint">Alle Sätze sauber und schmerzfrei in zwei Einheiten → die App schlägt die nächste Stufe vor (mehr Wiederholungen, stärkeres Band, einbeinig, Gewicht).</p>`;
  return h;
}

/* ---------- Läufe ---------- */
function vKnieRuns() {
  const ws = weekStart(todayKey());
  const km = kmWeek(ws), kmPrev = kmWeek(addDays(ws, -7));
  const runs = runsIn(rangeKeys(120)).reverse();
  const cad = kneeCfg().cadence || (runs.find((r) => r.t.cad) || {}).t?.cad || null;
  let h = `<div class="kv-grid is-3"><div class="kv"><span>Diese Woche</span><b>${fmt(km, 1)}</b><small>km · ${runsIn(weekKeys(ws)).length}/2 Läufe</small></div><div class="kv"><span>Vorwoche</span><b>${fmt(kmPrev, 1)}</b><small>km · max. +10 %: ${fmt(kmPrev * 1.1, 1)}</small></div><div class="kv"><span>Ziel-Kadenz</span><b>${cad ? `${Math.round(cad * 1.05)}–${Math.round(cad * 1.1)}` : '–'}</b><small>${cad ? `aktuell ${cad} spm` : 'Kadenz eintragen'}</small></div></div>`;
  if (kmPrev > 0 && km > kmPrev * 1.1) h += `<div class="banner is-warn">${icon('triangle-alert')}<div><b>Umfang steigt zu schnell</b><span>${fmt(km, 1)} km sind mehr als 10 % über der Vorwoche (${fmt(kmPrev, 1)} km).</span></div></div>`;
  h += `<p class="sec-sub">Vorerst 2 Läufe pro Woche im Gesprächstempo. Kürzere, schnellere Schritte, Fuß landet unter dem Körper. Schmerz bis 3/10 ist okay, wenn das Knie am nächsten Morgen nicht schlechter ist.</p>`;
  h += `<div class="row-btns"><button class="pill-btn is-accent" data-a="run-add" data-date="${todayKey()}">${icon('plus')}Lauf eintragen</button><button class="pill-btn" data-a="timer-start" data-r="vorlauf">${icon('play')}Aufwärmen 5 Min.</button></div>`;
  const ins = insolesInfo(todayKey());
  if (ins && !ins.before && !ins.runOk) h += `<p class="hint">${icon('footprints')} Mit Einlagen erst ab ${esc(fmtDate(ins.runFrom, { day: 'numeric', month: 'long' }))} laufen.</p>`;
  /* Diagramme */
  const metric = ui.runMetric;
  const chips = `<div class="chips chips-scroll">${[['pain', 'Schmerz beim Lauf'], ['am', 'Morgenschmerz'], ['km', 'km pro Woche'], ['cad', 'Kadenz']].map(([v, l]) => `<button class="chip chip-sm${metric === v ? ' is-on' : ''}" data-a="run-metric" data-v="${v}">${l}</button>`).join('')}</div>`;
  let body;
  if (metric === 'km') {
    const weeks = Array.from({ length: 8 }, (_, i) => addDays(ws, -7 * (7 - i)));
    body = stackedColumns({ keys: weeks, rows: weeks.map((w) => ({ km: kmWeek(w) })), series: [{ key: 'km', name: 'km', color: SERIES.c }], unit: 'km', empty: 'Noch keine Läufe.' });
  } else if (metric === 'am') {
    const keys = rangeKeys(30);
    body = lineChart({ keys, series: [{ name: 'Morgenschmerz', color: SERIES.f, vals: keys.map((x) => kneeAm(x)), dots: true }], domain: [0, 10], band: { lo: 0, hi: 3 } });
  } else {
    const rs = runs.slice().reverse();
    body = rs.length ? lineChart({ keys: rs.map((r) => r.k), series: [{ name: metric === 'cad' ? 'Kadenz' : 'Schmerz beim Lauf', color: metric === 'cad' ? SERIES.one : SERIES.f, vals: rs.map((r) => (metric === 'cad' ? r.t.cad ?? null : r.t.pain ?? null)), dots: true }], domain: metric === 'pain' ? [0, 10] : null, band: metric === 'pain' ? { lo: 0, hi: 3 } : cad ? { lo: Math.round(cad * 1.05), hi: Math.round(cad * 1.1) } : null, unit: metric === 'cad' ? 'spm' : '' }) : emptyChart('Noch keine Läufe eingetragen.');
  }
  h += chartCard('runs', 'Verlauf', chips, body, null);
  h += `<section class="sec"><div class="sec-head"><h2>Läufe</h2><span class="count">${runs.length}</span></div>${runs.length ? `<div class="list">${runs.slice(0, 30).map((r) => { const t = r.t; const pace = t.km && t.dur ? t.dur / t.km : null; const am = kneeAm(addDays(r.k, 1)); return `<button class="row" data-a="training-edit" data-id="${t.id}" data-date="${r.k}"><span class="row-main"><b>${esc(fmtDate(r.k, { weekday: 'short', day: 'numeric', month: 'short' }))} · ${t.km ? fmt(t.km, 1) + ' km' : 'Lauf'}${t.dur ? ` · ${t.dur} Min.` : ''}</b><small>${[pace ? `${Math.floor(pace)}:${pad(Math.round((pace % 1) * 60))} min/km` : '', t.cad ? `${t.cad} spm` : '', t.pain != null ? `Schmerz ${t.pain}/10` : '', am != null ? `Morgen danach ${am}/10` : '', t.ins ? 'mit Einlagen' : t.ins === false ? 'ohne Einlagen' : '', t.shoe || ''].filter(Boolean).join(' · ')}</small></span>${icon('pencil', 'row-ic')}</button>`; }).join('')}</div>` : '<p class="sec-sub">Noch keine Läufe.</p>'}</section>`;
  return h;
}

/* ---------- Tests ---------- */
function vKnieTests() {
  const td = testDue();
  const tests = kneeTests();
  let h = `<p class="sec-sub">Alle ${td.interval === 7 ? '7' : '14'} Tage, am besten zur gleichen Tageszeit und aufgewärmt. ${td.days == null ? 'Noch kein Test.' : td.due ? `Fällig – letzter Test vor ${td.days} Tagen.` : `Nächster Test am ${fmtDate(td.next, { weekday: 'short', day: 'numeric', month: 'short' })}.`}</p>
    <button class="btn is-accent" data-a="test-new">${icon('plus')}Test eintragen</button>`;
  h += `<div class="mlist">${KNEE_TESTS.map((t) => { const open = ui.exp.has('kt:' + t.id); return `<div class="mrow${open ? ' is-open' : ''}"><button class="mrow-hit" data-a="expand" data-key="kt:${t.id}"><div class="mrow-top"><span class="mname">${esc(t.n)}</span>${icon(open ? 'chevron-down' : 'chevron-right', 'mrow-chev')}</div></button>${open ? `<div class="mrow-detail"><p class="hint">${esc(t.how)}</p><a class="link-btn" href="https://www.youtube.com/results?search_query=${t.en.toLowerCase().replace(/[^a-z0-9]+/g, '+')}" target="_blank" rel="noopener">${icon('square-play')} Video-Anleitung</a></div>` : ''}</div>`; }).join('')}</div>`;
  if (tests.length) {
    const num = KNEE_TESTS.filter((t) => t.type === 'num');
    const sel = KNEE_TESTS.find((t) => t.id === ui.testMetric) || num[0];
    const chips = `<div class="chips chips-scroll">${num.map((t) => `<button class="chip chip-sm${t.id === sel.id ? ' is-on' : ''}" data-a="test-metric" data-v="${t.id}">${esc(t.n)}</button>`).join('')}</div>`;
    const series = sel.sides ? [{ name: 'Links', color: SERIES.one, vals: tests.map((x) => x[sel.id + 'L'] ?? null), dots: true }, { name: 'Rechts', color: SERIES.f, vals: tests.map((x) => x[sel.id + 'R'] ?? null), dots: true }] : [{ name: sel.n, color: SERIES.one, vals: tests.map((x) => x[sel.id] ?? null), dots: true }];
    const legend = sel.sides ? `<div class="legend"><span><i class="line-key" style="background:${SERIES.one}"></i>Links</span><span><i class="line-key" style="background:${SERIES.f}"></i>Rechts</span><span>${sel.better === 'lo' ? 'weniger ist besser' : 'mehr ist besser'}</span></div>` : '';
    h += chartCard('kt', 'Verlauf', chips, lineChart({ keys: tests.map((x) => x.date), series, unit: sel.unit }), null, legend);
    h += `<div class="table-wrap"><table><tr><th>Datum</th><th>Step-down L/R</th><th>Wand L/R</th><th>Stand L/R</th><th>S&R</th><th>Couch L/R</th></tr>${tests.slice().reverse().map((x) => `<tr data-a="test-edit" data-id="${x.id}"><td>${shortDate(x.date)}</td><td>${sdTxt(x.sdL)}/${sdTxt(x.sdR)}</td><td>${fmtN(x.k2wL)}/${fmtN(x.k2wR)}</td><td>${fmtN(x.balL)}/${fmtN(x.balR)}</td><td>${fmtN(x.sar)}</td><td>${fmtN(x.couchL)}/${fmtN(x.couchR)}</td></tr>`).join('')}</table></div><p class="hint">Zeile antippen zum Bearbeiten.</p>`;
  }
  return h;
}
function sdTxt(v) { return v === true ? '✓' : v === false ? '✗' : '–'; }
function fmtN(v) { return v == null ? '–' : fmt(v, v % 1 ? 1 : 0); }
function sheetTest(id) {
  const t = id ? clone(kneeTests().find((x) => x.id === id)) : { id: null, date: todayKey() };
  ui.sheet = { type: 'test', t };
  const sd = (side) => `<div class="chips chips-tight">${[['1', 'stabil'], ['0', 'knickt ein']].map(([v, l]) => `<button class="chip chip-xs${(t['sd' + side] === true && v === '1') || (t['sd' + side] === false && v === '0') ? ' is-on' : ''}" data-a="test-sd" data-side="${side}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const num = (f, unit) => `<input type="text" inputmode="decimal" data-tf="${f}" value="${numIn(t[f], 1)}" placeholder="–"><span class="unit">${unit}</span>`;
  openSheet(`<h3 class="sheet-title">${id ? 'Test bearbeiten' : 'Test eintragen'}</h3>
    <div class="form"><div class="frow"><span class="flabel">Datum</span><div class="fin"><input type="date" id="kt-date" value="${t.date}"></div></div></div>
    <h5>Step-down (Knie stabil über dem 2. Zeh?)</h5><div class="form"><div class="frow is-wide"><span class="flabel">Links</span>${sd('L')}</div><div class="frow is-wide"><span class="flabel">Rechts</span>${sd('R')}</div></div>
    <h5>Messwerte</h5><div class="form">
      <div class="frow"><span class="flabel">Knie zur Wand links</span><div class="fin">${num('k2wL', 'cm')}</div></div><div class="frow"><span class="flabel">Knie zur Wand rechts</span><div class="fin">${num('k2wR', 'cm')}</div></div>
      <div class="frow"><span class="flabel">Einbeinstand links</span><div class="fin">${num('balL', 'Sek.')}</div></div><div class="frow"><span class="flabel">Einbeinstand rechts</span><div class="fin">${num('balR', 'Sek.')}</div></div>
      <div class="frow"><span class="flabel">Sit-and-Reach (±)</span><div class="fin">${num('sar', 'cm')}</div></div>
      <div class="frow"><span class="flabel">Couch-Stretch links</span><div class="fin">${num('couchL', 'cm')}</div></div><div class="frow"><span class="flabel">Couch-Stretch rechts</span><div class="fin">${num('couchR', 'cm')}</div></div></div>
    <textarea class="note" id="kt-note" rows="2" placeholder="Notiz, z. B. Video vom Step-down gemacht">${esc(t.note || '')}</textarea>
    <div class="sheet-acts"><button class="btn is-accent" data-a="test-save">Speichern</button>${id ? '<button class="btn is-danger" data-a="test-del">Löschen</button>' : ''}</div>`);
}

/* ---------- Übungsbibliothek ---------- */
function exMatches(ex) {
  if (ui.exCat && ex.cat !== ui.exCat) return false;
  if (ui.exArea && !ex.areas.includes(ui.exArea)) return false;
  if (ui.exRoutine) { const rt = routineById(ui.exRoutine); if (!rt || !rt.items.some((it) => it.i === ex.id)) return false; }
  const q = ui.exQ.trim().toLowerCase();
  if (q && !(ex.n.toLowerCase().includes(q) || ex.en.toLowerCase().includes(q))) return false;
  return true;
}
function exCard(ex) {
  const open = ui.exOpen === ex.id;
  const video = exVideo(ex);
  const own = (kneeCfg().video || {})[ex.id];
  return `<div class="ex${open ? ' is-open' : ''}" id="ex-${ex.id}"><button class="ex-hit" data-a="ex-toggle" data-id="${ex.id}"><span class="ex-cat c-${ex.cat}">${esc(KNEE_CATS[ex.cat])}</span><span class="row-main"><b>${esc(ex.n)}</b><small>${esc(ex.en)} · ${esc(ex.dose)}</small></span>${icon(open ? 'chevron-down' : 'chevron-right', 'row-ic')}</button>
    ${open ? `<div class="ex-body"><dl class="info"><dt>Zielbereich</dt><dd>${esc(ex.areas.map((a) => KNEE_AREAS[a]).join(', '))}</dd><dt>Ausführung</dt><dd>${esc(ex.how)}</dd><dt>Nutzen fürs Knie</dt><dd>${esc(ex.benefit)}</dd><dt>Häufigster Fehler</dt><dd>${esc(ex.mistake)}</dd><dt>Sicherheit</dt><dd>${esc(ex.safety)}${ex.kneel ? ' Matte doppelt falten.' : ''}</dd><dt>Dosierung</dt><dd>${esc(doseText(ex))}${ex.d.t !== 'info' && doseText(ex) !== ex.dose ? ` <small>(Plan: ${esc(ex.dose)})</small>` : ''}</dd>${ex.prog ? `<dt>Steigerung</dt><dd>${esc(ex.prog)}</dd>` : ''}</dl>
      <div class="row-btns"><a class="pill-btn" href="${esc(video)}" target="_blank" rel="noopener">${icon('square-play')}Video${own ? ' (eigener Link)' : ''}</a>${ex.d.t !== 'info' ? `<button class="pill-btn" data-a="hold-timer" data-ex="${ex.id}" data-sets="${ex.d.sets || 1}" data-sec="${ex.d.sec || 0}">${icon('timer')}Einzeln starten</button>` : ''}</div>
      <label class="vid-in"><span>Eigener Video-Link</span><input type="url" inputmode="url" data-c="ex-video" data-id="${ex.id}" value="${esc(own || '')}" placeholder="https://… (leer = YouTube-Suche)"></label></div>` : ''}</div>`;
}
function vKnieEx() {
  const chip = (act, cur, v, l) => `<button class="chip chip-xs${cur === v ? ' is-on' : ''}" data-a="${act}" data-v="${v}">${esc(l)}</button>`;
  let h = `<div class="search"><span>${icon('search')}</span><input type="search" placeholder="Übung suchen (deutsch oder englisch)" data-i="ex-search" value="${esc(ui.exQ)}" autocomplete="off"></div>`;
  h += `<div class="chips chips-scroll">${chip('ex-cat', ui.exCat, '', 'Alle')}${Object.entries(KNEE_CATS).map(([v, l]) => chip('ex-cat', ui.exCat, v, l)).join('')}</div>`;
  h += `<div class="chips chips-scroll">${chip('ex-area', ui.exArea, '', 'Alle Bereiche')}${Object.entries(KNEE_AREAS).map(([v, l]) => chip('ex-area', ui.exArea, v, l)).join('')}</div>`;
  h += `<div class="chips chips-scroll">${chip('ex-routine', ui.exRoutine, '', 'Alle Routinen')}${routines().map((r) => chip('ex-routine', ui.exRoutine, r.id, r.n)).join('')}</div>`;
  h += `<div id="ex-list">${exListHTML()}</div>`;
  return h;
}
function exListHTML() {
  const list = KNEE_EX.filter(exMatches);
  return list.length ? `<p class="hint">${list.length} Übungen</p><div class="ex-list">${list.map(exCard).join('')}</div>` : emptyState('Keine Übung passt zu den Filtern.');
}

/* ---------- Infos & Termine ---------- */
function vKnieInfos() {
  let h = `<section class="card"><h3>${icon('shield-alert')} Grundregeln</h3><ul class="rules big">${KNEE_RULES.map((r) => `<li>${icon('check')}${esc(r)}</li>`).join('')}</ul></section>`;
  h += `<div class="banner is-red">${icon('octagon-alert')}<div><b>Warnzeichen</b><span>${esc(KNEE_RED_FLAGS)}</span></div></div>`;
  const cad = kneeCfg().cadence;
  h += `<section class="card"><h3>${icon('activity')} Laufstil</h3><p>Kadenz +5–10 %: kürzere, schnellere Schritte, Fuß landet unter dem Körper, Knie nicht durchstrecken.</p>
    <div class="form"><div class="frow"><span class="flabel">Aktuelle Kadenz (Garmin)</span><div class="fin"><input type="text" inputmode="numeric" data-c="knee-cfg" data-f="cadence" value="${cad ?? ''}" placeholder="–"><span class="unit">spm</span></div></div></div>
    ${cad ? `<p class="hint">Zielkadenz: ${Math.round(cad * 1.05)} (+5 %) bis ${Math.round(cad * 1.1)} (+10 %).</p>` : ''}<p class="hint">Lauf-ABC ab Phase 3: A-Skip, Hopserlauf, Wall Drill je 2 × 20 m, 1×/Woche ca. 10 Min.</p></section>`;
  const ins = kneeCfg().insoles;
  h += `<section class="card"><h3>${icon('footprints')} Einlagen</h3><div class="form"><div class="frow"><span class="flabel">Abgeholt am</span><div class="fin"><input type="date" data-c="knee-cfg" data-f="insoles" value="${ins || ''}"></div></div></div>
    <p class="hint">Eingewöhnung: Start mit 1–2 Std. pro Tag, langsam steigern. Laufen mit Einlagen erst nach 1–2 Wochen. Die App zeigt ab dem Abholtag einen Tageszähler unter „Heute“.</p></section>`;
  h += `<section class="sec"><div class="sec-head"><h2>Meilensteine</h2></div><ol class="timeline">${milestones().map((m) => `<li class="${m.done ? 'is-done' : m.due ? 'is-due' : ''}"><span class="tl-dot">${m.done ? icon('check') : ''}</span><div><b>${esc(m.n)}</b><small>${m.week ? `Woche ${m.week[0]}${m.week[1] !== m.week[0] ? '–' + m.week[1] : ''}` : esc(fmtDate(m.date, { month: 'long', year: 'numeric' }))} · ${esc(m.sub)}${m.done ? ' · erreicht' : ''}</small></div></li>`).join('')}</ol></section>`;
  h += todosSection2();
  h += `<section class="sec"><div class="sec-head"><h2>Mein Befund</h2><span class="count">nur auf diesem iPhone</span></div><textarea class="note" rows="5" data-c="knee-befund" placeholder="Befund, Diagnose, Hinweise vom Arzt oder der Physio – bleibt lokal und ist im Backup enthalten.">${esc(S.knee.befund || '')}</textarea></section>`;
  h += `<p class="hint">Diese Inhalte sind allgemeine Übungen und Regeln und ersetzen keine ärztliche oder physiotherapeutische Beratung.</p>`;
  return h;
}
function todosSection2() {
  const all = S.settings.todos || [];
  const open = all.filter((t) => !t.done).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const done = all.filter((t) => t.done);
  const today = todayKey();
  let h = `<section class="sec"><div class="sec-head"><h2>Termine & To-dos</h2><span class="count">nur lokal</span></div>`;
  h += open.length ? `<div class="list">${open.map((t) => { const n = t.date ? daysBetween(today, t.date) : null; return `<div class="todo-row${n != null && n < 0 ? ' is-over' : ''}"><button class="row-check" data-a="todo" data-id="${t.id}"><span class="tgl-box">${icon('check')}</span><span><b>${esc(t.t)}</b>${t.date ? `<small>${esc(fmtDate(t.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))}${n < 0 ? ' · überfällig' : n === 0 ? ' · heute' : ''}</small>` : ''}</span></button><input type="date" class="row-time" data-c="todo-date" data-id="${t.id}" value="${t.date || ''}" aria-label="Datum"><button class="icon-btn sm ghost" data-a="todo-del" data-id="${t.id}" aria-label="Löschen">${icon('trash-2')}</button></div>`; }).join('')}</div>` : '<p class="sec-sub">Keine offenen Einträge.</p>';
  h += `<div class="todo-add"><input type="text" id="todo-new" placeholder="Neuer Termin oder To-do" enterkeyhint="done"><input type="date" id="todo-date" aria-label="Datum (optional)"><button class="icon-btn" data-a="todo-add" aria-label="Hinzufügen">${icon('plus')}</button></div>
    <div class="chips chips-tight">${TODO_SUGGEST.map((s) => `<button class="chip chip-xs" data-a="todo-suggest" data-v="${esc(s)}">+ ${esc(s)}</button>`).join('')}</div>`;
  if (done.length) h += `<button class="link-btn more" data-a="todo-showdone">${ui.todoDone ? 'Erledigte ausblenden' : `${done.length} erledigte zeigen`}</button>${ui.todoDone ? `<div class="list">${done.map((t) => `<div class="todo-row is-done"><button class="row-check is-on" data-a="todo" data-id="${t.id}"><span class="tgl-box">${icon('check')}</span><span>${esc(t.t)}</span></button><button class="icon-btn sm ghost" data-a="todo-del" data-id="${t.id}" aria-label="Löschen">${icon('trash-2')}</button></div>`).join('')}</div>` : ''}`;
  return h + '</section>';
}

/* ============================================================
   GEFÜHRTER TIMER
   ============================================================ */
const Sound = {
  ctx: null,
  init() {
    try {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      if (navigator.audioSession) try { navigator.audioSession.type = 'transient'; } catch (e) { /* egal */ }
    } catch (e) { this.ctx = null; }
  },
  tone(freq, dur, when = 0, vol = 0.25) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  },
  tick() { this.tone(1046, 0.09, 0, 0.15); },
  gong() { this.tone(659, 0.7); this.tone(988, 0.9, 0.04, 0.12); },
  double() { this.gong(); this.tone(784, 0.8, 0.35); },
  end() { this.tone(523, 0.4); this.tone(659, 0.4, 0.18); this.tone(784, 0.8, 0.36); },
  say(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE'; u.rate = 1.02;
      const v = window.speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith('de'));
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch (e) { /* egal */ }
  },
};
function sig(kind, text) {
  const mode = kneeCfg().signal || 'voice';
  if (mode !== 'visual') { if (kind === 'tick') Sound.tick(); else if (kind === 'switch') Sound.gong(); else if (kind === 'next') Sound.double(); else if (kind === 'end') Sound.end(); }
  if (mode === 'voice' && text) setTimeout(() => Sound.say(text), kind === 'tick' ? 0 : 450);
  if (kind !== 'tick') { const o = $('#overlay'); if (o) { o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash'); } }
}
let wakeLock = null;
async function lockScreen() { try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { wakeLock = null; } }
function unlockScreen() { try { if (wakeLock) wakeLock.release(); } catch (e) { /* egal */ } wakeLock = null; }
function stepSpeech(st, withName) {
  const ex = exById(st.ex);
  const parts = [];
  if (withName) parts.push(ex.n);
  if (st.side) parts.push(st.sideName || (st.side === 'L' ? 'linke Seite' : 'rechte Seite'));
  if (st.label) parts.push(st.label);
  parts.push(st.type === 'time' ? `${st.sec} Sekunden` : `${st.reps} ${st.alt ? 'je Seite' : 'Wiederholungen'}`);
  return parts.join(', ');
}
function timerStart(rid, opts = {}) {
  const rt = opts.steps ? null : routineById(rid);
  const steps = opts.steps || (rt ? buildSteps(rt, { short: rid === 'lang' && kneeCfg().longShort }) : []);
  if (!steps.length) { toast('Diese Routine hat keine Übungen'); return; }
  Sound.init();
  if (kneeCfg().signal === 'voice') Sound.say(' ');
  ui.timer = { rid, name: opts.name || (rt ? rt.n : 'Übung'), steps, i: 0, phase: 'prep', endAt: Date.now() + 5000, remain: 5000, paused: false, startedAt: Date.now(), act: 0, resumedAt: Date.now(), plan: steps.reduce((a, s) => a + stepSec(s), 0), rate: {}, noSave: !!opts.noSave, lastBeep: null, confirmEnd: false };
  lockScreen();
  $('#overlay').classList.add('open');
  document.documentElement.classList.add('noscroll');
  sig('next', `${ui.timer.name}. Los geht's mit ${stepSpeech(steps[0], true)}`);
  timerRender();
  clearInterval(ui.timerInt);
  ui.timerInt = setInterval(timerTick, 250);
}
function timerCur() { const t = ui.timer; return t && t.steps[t.i]; }
function timerTick() {
  const t = ui.timer;
  if (!t || t.paused || t.phase === 'done') return;
  const st = timerCur();
  if (t.phase === 'run' && st.type !== 'time') { timerUpdateClock(); return; }
  const rem = t.endAt - Date.now();
  const s = Math.ceil(rem / 1000);
  if (rem > -1500 && s <= 3 && s >= 1 && t.lastBeep !== `${t.i}${t.phase}${s}`) { t.lastBeep = `${t.i}${t.phase}${s}`; if (t.phase === 'run' || t.phase === 'prep') sig('tick'); }
  if (rem <= 0) { timerAdvance(rem < -3000); return; }
  timerUpdateClock();
}
/* Phasen: prep → run → (switch | trans) → run … → done */
function timerAdvance(silent = false) {
  const t = ui.timer;
  const st = timerCur();
  if (t.phase === 'prep' || t.phase === 'switch' || t.phase === 'trans') {
    t.phase = 'run';
    if (st.type === 'time') { t.endAt = Date.now() + st.sec * 1000; }
    if (!silent && t.phaseFrom !== 'prep-silent') sig('switch', st.type === 'time' ? 'Los' : `${st.reps} ${st.alt ? 'je Seite' : 'Wiederholungen'}, dann tippe auf Fertig`);
    timerRender();
    return;
  }
  /* run beendet */
  if (t.i >= t.steps.length - 1) { timerFinish(); return; }
  const next = t.steps[t.i + 1];
  t.i++;
  if (next.ex === st.ex) {
    t.phase = 'switch'; t.endAt = Date.now() + 5000;
    if (!silent) sig('switch', next.side && next.side !== st.side ? `Seitenwechsel. ${stepSpeech(next, false)}` : `Satz ${next.set}. ${stepSpeech(next, false)}`);
  } else {
    t.phase = 'trans'; t.endAt = Date.now() + (kneeCfg().trans || 10) * 1000;
    if (!silent) sig('next', `Nächste Übung: ${stepSpeech(next, true)}`);
  }
  timerRender();
}
function timerFinish() {
  const t = ui.timer;
  if (!t.paused) t.act += Date.now() - t.resumedAt;
  t.phase = 'done'; t.endedAt = Date.now(); t.complete = true;
  sig('end', 'Geschafft. Gut gemacht.');
  timerRender();
}
function timerUpdateClock() {
  const t = ui.timer, el = $('#tm-clock');
  if (!t || !el) return;
  const st = timerCur();
  if (t.phase === 'run' && st.type !== 'time') return;
  const rem = Math.max(0, t.paused ? t.remain : t.endAt - Date.now());
  const s = Math.ceil(rem / 1000);
  el.textContent = s >= 60 ? `${Math.floor(s / 60)}:${pad(s % 60)}` : String(s);
  const ring = $('#tm-ring');
  if (ring) { const total = t.phase === 'run' ? st.sec * 1000 : t.phase === 'switch' ? 5000 : t.phase === 'prep' ? 5000 : (kneeCfg().trans || 10) * 1000; ring.style.setProperty('--p', String(clamp(1 - rem / total, 0, 1))); }
  const el2 = $('#tm-elapsed');
  if (el2) el2.textContent = fmtClock((t.act + (t.paused ? 0 : Date.now() - t.resumedAt)) / 1000);
}
function fmtClock(sec) { sec = Math.max(0, Math.round(sec)); return `${Math.floor(sec / 60)}:${pad(sec % 60)}`; }
function timerRender() {
  const t = ui.timer, o = $('#overlay');
  if (!t) { o.classList.remove('open'); o.innerHTML = ''; return; }
  if (t.phase === 'done') {
    const stretches = [...new Set(t.steps.map((s) => s.ex))].map(exById).filter((e) => e && e.cat === 'stretch');
    const real = Math.round(t.act / 1000);
    o.innerHTML = `<div class="tm"><div class="tm-done">${icon('badge-check')}<h2>${esc(t.name)} geschafft</h2>
      <div class="kv-grid"><div class="kv"><span>Geplant</span><b>${fmtClock(t.plan + Math.max(0, t.steps.length - 1) * 6)}</b><small>Min.</small></div><div class="kv"><span>Tatsächlich</span><b>${fmtClock(real)}</b><small>Min. ohne Pausen</small></div></div>
      ${stretches.length && !t.noSave ? `<h5>Wie stark war der Zug? (optional, 5–7 ist ideal)</h5><div class="rate-list">${stretches.map((e) => `<div class="rate-row"><span>${esc(e.n)}</span><div class="chips chips-tight">${[3, 4, 5, 6, 7, 8].map((n) => `<button class="chip chip-xs${t.rate[e.id] === n ? ' is-on' : ''}" data-a="tm-rate" data-ex="${e.id}" data-v="${n}">${n}</button>`).join('')}</div></div>`).join('')}</div>` : ''}
      <div class="sheet-acts">${t.noSave ? '' : '<button class="btn is-accent" data-a="tm-save">Speichern</button>'}<button class="btn is-ghost" data-a="tm-close">${t.noSave ? 'Schließen' : 'Ohne Speichern schließen'}</button></div></div></div>`;
    return;
  }
  const st = timerCur(), ex = exById(st.ex);
  const next = t.steps[t.i + 1];
  const nx = next ? exById(next.ex) : null;
  const isRun = t.phase === 'run';
  const head = t.phase === 'prep' ? 'Gleich geht’s los' : t.phase === 'switch' ? (st.side ? `Seitenwechsel → ${sideName(st.side)}` : `Satz ${st.set}`) : t.phase === 'trans' ? 'Nächste Übung' : st.grp || '';
  const reps = isRun && st.type !== 'time';
  const sideLbl = st.side ? `<span class="tm-side s-${st.side}">${st.sideName ? esc(st.sideName) : sideName(st.side)}${st.side === extraSide() && !ex.d.noX ? ' +' : ''}</span>` : '';
  o.innerHTML = `<div class="tm${isRun ? ' is-run' : ' is-pause'}">
    <div class="tm-top"><button class="icon-btn" data-a="tm-end" aria-label="Beenden">${icon('x')}</button><div class="tm-title"><b>${esc(t.name)}</b><small>Übung ${new Set(t.steps.slice(0, t.i + 1).map((s) => s.idx)).size} von ${new Set(t.steps.map((s) => s.idx)).size} · <span id="tm-elapsed">0:00</span></small></div><a class="icon-btn" href="${esc(exVideo(ex))}" target="_blank" rel="noopener" aria-label="Video">${icon('square-play')}</a></div>
    <div class="tm-prog"><i style="width:${(t.i / t.steps.length) * 100}%"></i></div>
    <p class="tm-phase">${esc(head)}</p>
    <h2 class="tm-ex">${esc(ex.n)}</h2>
    <div class="tm-meta">${sideLbl}${st.sets > 1 ? `<span class="tm-set">Satz ${st.set}/${st.sets}</span>` : ''}${st.label ? `<span class="tm-set">${esc(st.label)}</span>` : ''}</div>
    ${reps ? `<div class="tm-big"><b>${st.reps}</b><span>${st.alt ? 'je Seite' : 'Wiederholungen'}</span></div><button class="tm-done-btn" data-a="tm-next">${icon('check')}Fertig</button>`
      : `<div class="tm-ring" id="tm-ring"><b id="tm-clock">–</b><span>${isRun ? 'Sekunden' : st.type === 'time' ? `dann ${st.sec} Sek.` : `dann ${st.reps} ${st.alt ? 'je Seite' : 'Wdh.'}`}</span></div>`}
    <p class="tm-how">${esc(ex.how.split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.'))}</p>${!isRun && ex.safety && ex.safety !== 'Keine.' ? `<p class="tm-safe">${icon('shield-alert')} ${esc(ex.safety)}${ex.kneel ? ' Matte doppelt falten.' : ''}</p>` : ''}
    ${nx ? `<p class="tm-next">Danach: ${esc(nx.n)}${next.side ? ` · ${sideName(next.side)}` : ''}</p>` : '<p class="tm-next">Letzte Übung</p>'}
    <div class="tm-ctrl"><button class="icon-btn lg" data-a="tm-prev" aria-label="Zurück">${icon('skip-back')}</button><button class="icon-btn xl" data-a="tm-pause" aria-label="${t.paused ? 'Weiter' : 'Pause'}">${icon(t.paused ? 'play' : 'pause')}</button><button class="icon-btn lg" data-a="tm-next" aria-label="Überspringen">${icon('skip-forward')}</button></div>
    ${t.confirmEnd ? `<div class="tm-confirm"><p>Routine beenden?</p><div class="sheet-acts"><button class="btn is-accent" data-a="tm-finish-now">Beenden und speichern</button><button class="btn" data-a="tm-close">Verwerfen</button><button class="btn is-ghost" data-a="tm-resume">Weitermachen</button></div></div>` : ''}
  </div>`;
  timerUpdateClock();
}
function timerClose() {
  clearInterval(ui.timerInt);
  ui.timer = null;
  unlockScreen();
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* egal */ }
  $('#overlay').classList.remove('open');
  $('#overlay').innerHTML = '';
  document.documentElement.classList.remove('noscroll');
  render();
}
function timerSave() {
  const t = ui.timer;
  if (!t || t.noSave) { timerClose(); return; }
  const k = todayKey();
  const done = t.complete ? t.steps.length : t.i;
  mutDay(k, (d) => {
    d.knee = d.knee || {};
    d.knee.sess = d.knee.sess || [];
    d.knee.sess.push({ id: uid(), r: t.rid, start: t.startedAt, end: t.endedAt || Date.now(), act: Math.round(t.act / 1000), plan: t.plan, done, total: t.steps.length, complete: t.complete || done >= t.steps.length * 0.8, short: t.rid === 'lang' && !!kneeCfg().longShort, rate: t.rate });
  });
  toast(`${t.name} gespeichert`);
  timerClose();
}
