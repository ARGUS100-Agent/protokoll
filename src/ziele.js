/* ============================================================
   WOCHENZIELE, WOCHENBERICHT FÜR FRANK & MUSTER
   Sonntags schickt die App Frank (Claude-Skill) einen Bericht über
   alle Bereiche. Frank gibt 3 messbare Wochenziele als Code zurück.
   Die App misst sie selbst, zeigt sie auf Heute und meldet, wenn ein
   Ziel geschafft, knapp oder verfehlt ist. „Muster“ vergleicht Tage
   mit und ohne eine Gewohnheit und lernt so aus den eigenen Daten.
   ============================================================ */
/*icons: circle-check circle-dashed circle-alert circle-x target send clipboard-paste lightbulb alarm-clock repeat*/
const GOAL_AREAS = {
  ern: { n: 'Ernährung', ic: 'salad' },
  training: { n: 'Training', ic: 'dumbbell' },
  sauna: { n: 'Sauna', ic: 'flame' },
  schlaf: { n: 'Schlaf', ic: 'moon' },
  koffein: { n: 'Koffein', ic: 'coffee' },
  haut: { n: 'Haut', ic: 'scan-face' },
  knie: { n: 'Knie', ic: 'footprints' },
};
const GOAL_NUT = ['kcal', 'p', 'f', 'fatPct', 'c', 'sf', 'fs', 'sug', 'fib', 'na', 'fluid', 'upf', 'alk', 'ferm', 'plants', 'pp', 'pre', 'vc', 'vd', 'vk', 'va', 've', 'b12', 'fol', 'b6', 'mg', 'zn', 'fe', 'se', 'i', 'ca', 'k', 'cu', 'cho', 'o3'];
const GOAL_HEALTH = { sleepScore: ['Sleep Score', '', 'num'], sleepDur: ['Schlafdauer', 'Std.', 'dur'], bedTime: ['Eingeschlafen', 'Uhr', 'bed'], wakeTime: ['Aufgewacht', 'Uhr', 'time'], hrv: ['HRV', 'ms', 'num'], rhr: ['Ruhepuls', 'bpm', 'num'], bbMorning: ['Body Battery morgens', '', 'num'], readiness: ['Trainingsbereitschaft', '', 'num'], stress: ['Stress-Ø', '', 'num'], steps: ['Schritte', '', 'num'] };
const GOAL_TAGS = ['whey', 'milbona', 'ag1', 'upf', 'alkohol'];

/* ---------- Messgrößen ---------- */
function dayTags(k) {
  const set = new Set();
  for (const ln of dayLines(k)) for (const t of (ln.food && ln.food.tags) || []) set.add(t);
  const d = peekDay(k);
  if (d && d.checks && d.checks.m_ag1) set.add('ag1');
  return set;
}
function timeVal(v, bed) { const m = typeof v === 'number' ? v : timeToMin(v); if (m == null) return null; return bed && m < 720 ? m + 1440 : m; }
function goalMetric(key) {
  key = String(key || '').trim();
  const D = (k) => peekDay(k);
  if (key === 'manual') return { key, n: 'Abgehakt', u: '', kind: 'bool', manual: true };
  if (GOAL_NUT.includes(key)) {
    const m = metaOf(key);
    return { key, n: m.n, u: m.u, kind: 'num', dec: m.d, conv: m.conv, area: 'ern', day: (k) => { if (!hasData(D(k))) return null; const ev = evaluate(k); return ev.metrics[key] ? ev.metrics[key].v : metricValue(key, ev.act.tot, ev.plantsWeek.size); } };
  }
  if (key === 'caf') return { key, n: 'Koffein', u: 'mg', kind: 'num', area: 'koffein', day: (k) => (D(k) ? cafInfo(k).total : null) };
  if (key === 'caf_last') return { key, n: 'Letztes Koffein', u: 'Uhr', kind: 'time', area: 'koffein', day: (k) => { if (!D(k)) return null; const c = cafInfo(k); return c.last == null ? 0 : c.last; } };
  if (key === 'caf_bed') return { key, n: 'Koffein zur Schlafenszeit', u: 'mg', kind: 'num', area: 'koffein', day: (k) => (D(k) ? cafInfo(k).bedLevel : null) };
  if (GOAL_HEALTH[key]) {
    const [n, u, kind] = GOAL_HEALTH[key];
    return { key, n, u, kind: kind === 'bed' ? 'time' : kind, bed: kind === 'bed', area: key === 'steps' ? 'training' : 'schlaf', day: (k) => { const d = D(k); const v = d && d.health ? d.health[key] : null; if (v == null || v === '') return null; return kind === 'num' ? Number(v) : kind === 'dur' ? Number(v) : timeVal(v, kind === 'bed'); } };
  }
  const dd = (k) => (D(k) ? dayDone(k) : null);
  const T = {
    train: ['Trainingseinheiten', '', 'training', (k) => ((D(k) || {}).trainings || []).filter((t) => !trainType(t).light).length],
    gym: ['Gym-Einheiten', '', 'training', (k) => ((D(k) || {}).trainings || []).filter((t) => trainType(t).gym || ['Gym (frei)', 'Push', 'Pull', 'Beine'].includes(trainType(t).id)).length],
    run: ['Läufe', '', 'training', (k) => ((D(k) || {}).trainings || []).filter((t) => trainType(t).run).length],
    run_km: ['Laufkilometer', 'km', 'training', (k) => ((D(k) || {}).trainings || []).filter((t) => trainType(t).run).reduce((a, t) => a + (Number(t.km) || 0), 0)],
    sauna: ['Sauna', 'Min.', 'sauna', (k) => saunaMin(D(k))],
    mob: ['Mobility-Routine', '', 'knie', (k) => { const x = dd(k); return x ? (x.mob ? 1 : 0) : 0; }],
    knee_str: ['Knie-Kraft', '', 'knie', (k) => { const x = dd(k); return x ? (x.kraft ? 1 : 0) : 0; }],
    lang: ['Lange Routine', '', 'knie', (k) => { const x = dd(k); return x ? (x.lang ? 1 : 0) : 0; }],
  };
  if (T[key]) { const [n, u, area, f] = T[key]; return { key, n, u, kind: ['mob', 'knee_str', 'lang'].includes(key) ? 'bool' : 'num', dec: key === 'run_km' ? 1 : 0, area, day: f }; }
  if (key === 'knee_am') return { key, n: 'Knieschmerz morgens', u: '/10', kind: 'num', dec: 1, area: 'knie', day: (k) => kneeAm(k) };
  if (key === 'skin') return { key, n: 'Hautscore', u: '/10', kind: 'num', dec: 1, area: 'haut', day: (k) => { const d = D(k); return d && d.skin && d.skin.score != null ? d.skin.score : null; } };
  if (key === 'spots') return { key, n: 'Neue Pickel', u: '', kind: 'num', dec: 1, area: 'haut', day: (k) => { const d = D(k); return d && d.skin && d.skin.spots != null ? d.skin.spots : null; } };
  if (key.startsWith('item:')) {
    const id = key.slice(5), f = findItem(id);
    if (!f) return null;
    return { key, n: itemLabel(f.it, null), u: '', kind: 'bool', area: 'ern', day: (k) => (D(k) ? (D(k).checks[id] ? 1 : 0) : null) };
  }
  if (key.startsWith('habit:')) {
    const id = key.slice(6), h = HABITS.find((x) => x.id === id);
    if (!h) return null;
    return { key, n: h.n, u: '', kind: 'bool', area: id === 'sauna' ? 'sauna' : id === 'gesicht' ? 'haut' : 'schlaf', day: (k) => (D(k) ? (D(k).habits && D(k).habits[id] ? 1 : 0) : null) };
  }
  if (key.startsWith('routine:')) {
    const id = key.slice(8), r = (S.settings.skin.routine || []).find((x) => x.id === id);
    if (!r) return null;
    return { key, n: r.n, u: '', kind: 'bool', area: 'haut', day: (k) => (D(k) ? (D(k).skin && D(k).skin[id] ? 1 : 0) : null) };
  }
  if (key.startsWith('tag:')) {
    const tag = key.slice(4);
    if (!GOAL_TAGS.includes(tag)) return null;
    const names = { whey: 'Whey/Milchprotein', milbona: 'Milbona-Shake', ag1: 'AG1', upf: 'Ultraverarbeitetes', alkohol: 'Alkohol' };
    return { key, n: names[tag], u: '', kind: 'bool', area: tag === 'ag1' || tag === 'upf' || tag === 'alkohol' ? 'ern' : 'haut', day: (k) => (hasData(D(k)) || (D(k) && D(k).checks && D(k).checks.m_ag1) ? (dayTags(k).has(tag) ? 1 : 0) : null) };
  }
  if (key === 'hd:lastMeal') return { key, n: 'Letzte große Mahlzeit', u: 'Uhr', kind: 'time', area: 'schlaf', day: (k) => { const d = D(k); return d && d.hd && d.hd.lastMeal ? timeVal(d.hd.lastMeal, true) : null; } };
  if (key === 'hd:screenFree') return { key, n: 'Bildschirmfrei vor dem Schlafen', u: 'Min.', kind: 'num', area: 'schlaf', day: (k) => { const d = D(k); return d && d.hd && d.hd.screenFree != null ? Number(d.hd.screenFree) : null; } };
  return null;
}
function goalFmt(m, v) {
  if (v == null) return '–';
  if (m.kind === 'time') return v === 0 && m.key === 'caf_last' ? 'kein Koffein' : minToTime(((v % 1440) + 1440) % 1440);
  if (m.kind === 'dur') return `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, '0')}`;
  if (m.kind === 'bool') return v ? 'ja' : 'nein';
  const x = m.conv ? v * m.conv : v;
  return fmt(x, m.dec != null ? m.dec : x % 1 ? 1 : 0);
}
function goalUnit(m) { return m.kind === 'time' ? 'Uhr' : m.kind === 'dur' ? 'Std.' : m.u || ''; }

/* ---------- Ziele lesen, prüfen, bewerten ---------- */
function weekGoals(ws) { return ((S.reviews && S.reviews[ws]) || {}).goals || []; }
function goalNorm(g, i) {
  if (!g || typeof g !== 'object') return null;
  let metric = String(g.metric || 'manual').trim();
  let m = goalMetric(metric);
  if (!m) { metric = 'manual'; m = goalMetric('manual'); }
  const cmp = ['<=', '≤', '<', 'max'].includes(String(g.cmp).trim()) ? '<=' : '>=';
  let value = m.kind === 'time' || m.kind === 'dur' ? (typeof g.value === 'number' ? g.value : timeToMin(String(g.value || ''))) : frankNum(g.value);
  if (m.kind === 'time' && m.bed && value != null && value < 720) value += 1440;
  if (m.kind === 'bool' && (value == null || value > 1)) value = cmp === '<=' ? 0 : 1;
  if (value == null) { metric = 'manual'; m = goalMetric('manual'); value = 1; }
  const agg = metric === 'manual' ? 'days' : ['days', 'sum', 'avg', 'max'].includes(g.agg) ? g.agg : 'days';
  const need = agg === 'days' ? Math.min(7, Math.max(1, Math.round(frankNum(g.need) || 7))) : null;
  const area = GOAL_AREAS[g.area] ? g.area : m.area || 'ern';
  const title = frankText(g.title, 70) || `${m.n} ${cmp === '<=' ? '≤' : '≥'} ${goalFmt(m, value)}`;
  const wt = String(g.when || g.remind || '').trim();
  const when = /^([01]?\d|2[0-3]):[0-5]\d$/.test(wt) ? wt.padStart(5, '0') : null;
  return { id: 'g' + (i + 1) + uid().slice(-5), area, title, metric, agg, cmp: metric === 'manual' ? '>=' : cmp, value: metric === 'manual' ? 1 : value, need, when, why: frankText(g.why, 400), tip: frankText(g.tip, 400), example: frankText(g.example, 400) };
}
function goalRule(g) {
  const m = goalMetric(g.metric) || goalMetric('manual');
  if (g.metric === 'manual') return `abhaken an ${g.need} von 7 Tagen`;
  const sym = g.cmp === '<=' ? '≤' : '≥';
  const val = `${goalFmt(m, g.value)}${goalUnit(m) && m.kind !== 'bool' ? ' ' + goalUnit(m) : ''}`;
  if (m.kind === 'bool') return `${m.n}: ${g.cmp === '<=' ? 'nein' : 'ja'} an ${g.need} von 7 Tagen`;
  if (g.agg === 'days') return `${m.n} ${sym} ${val} an ${g.need} von 7 Tagen`;
  if (g.agg === 'sum') return `${m.n} in der Woche ${sym} ${val}`;
  if (g.agg === 'max') return `${m.n} ${sym} ${val} bis Sonntag`;
  return `Ø ${m.n} ${sym} ${val}`;
}
function goalEval(g, ws) {
  const m = goalMetric(g.metric) || goalMetric('manual');
  const keys = weekKeys(ws), today = todayKey();
  const hasToday = keys.includes(today), ended = keys[6] < today;
  const upto = keys.filter((k) => k <= today), past = keys.filter((k) => k < today);
  const future = keys.filter((k) => k > today).length;
  const ticks = (((S.reviews || {})[ws] || {}).ticks || {})[g.id] || {};
  const val = (k) => (g.metric === 'manual' ? (ticks[k] ? 1 : 0) : m.day(k));
  const okv = (v) => v != null && (g.cmp === '<=' ? v <= g.value + 1e-9 : v >= g.value - 1e-9);
  const r = { status: 'open', todayState: null, todayText: '', progress: '', hasToday, ended };
  if (g.agg === 'days') {
    let reached = 0, failed = 0;
    for (const k of past) { if (okv(val(k))) reached++; else failed++; }
    let pendingToday = false;
    if (hasToday) {
      let tv = val(today);
      if (tv == null && GOAL_NUT.includes(g.metric)) tv = 0;
      if (g.cmp === '>=') {
        if (okv(tv)) { r.todayState = 'ok'; reached++; r.todayText = g.metric === 'manual' ? 'heute erledigt' : 'heute geschafft'; }
        else { r.todayState = 'open'; pendingToday = true; r.todayText = tv != null && m.kind === 'num' ? `heute noch ${goalFmt(m, g.value - tv)}${goalUnit(m) ? ' ' + goalUnit(m) : ''}` : 'heute noch offen'; }
      } else if (tv != null && !okv(tv)) { r.todayState = 'fail'; failed++; r.todayText = 'heute nicht geschafft'; }
      else {
        const secured = m.kind === 'time' && !m.bed && nowMin() > g.value;
        r.todayState = 'ok';
        if (secured) { reached++; r.todayText = 'heute geschafft'; } else { pendingToday = true; r.todayText = 'heute bisher eingehalten'; }
      }
    }
    const remaining = future + (pendingToday ? 1 : 0);
    if (reached >= g.need) r.status = 'done';
    else if (ended || reached + remaining < g.need) r.status = 'missed';
    else if (reached + remaining === g.need && failed > 0) r.status = 'risk';
    r.progress = `${reached}/${g.need} Tage`;
    r.reached = reached;
  } else if (g.agg === 'sum') {
    let total = 0;
    for (const k of upto) { const v = val(k); if (v != null) total += v; }
    if (g.cmp === '>=') r.status = total >= g.value - 1e-9 ? 'done' : ended ? 'missed' : 'open';
    else r.status = total > g.value + 1e-9 ? 'missed' : ended ? 'done' : 'open';
    r.progress = `${goalFmt(m, total)} von ${goalFmt(m, g.value)}${goalUnit(m) ? ' ' + goalUnit(m) : ''}`;
    r.total = total;
  } else {
    const vs = upto.map(val).filter((v) => v != null);
    const a = g.agg === 'max' ? (vs.length ? Math.max(...vs) : null) : mean(vs);
    if (a == null) r.status = ended ? 'missed' : 'open';
    else if (ended) r.status = okv(a) ? 'done' : 'missed';
    else r.status = okv(a) ? (g.agg === 'max' ? 'done' : 'open') : g.agg === 'max' ? 'open' : 'risk';
    r.progress = a == null ? 'noch keine Werte' : `${g.agg === 'max' ? '' : 'Ø '}${goalFmt(m, a)}${goalUnit(m) ? ' ' + goalUnit(m) : ''} · Ziel ${g.cmp === '<=' ? '≤' : '≥'} ${goalFmt(m, g.value)}`;
    r.avg = a;
  }
  return r;
}
const GOAL_ST = { done: ['st-ok', 'circle-check', 'geschafft'], open: ['st-none', 'circle-dashed', 'läuft'], risk: ['st-under', 'circle-alert', 'knapp'], missed: ['st-over', 'circle-x', 'verfehlt'] };

/* Hinweise, sobald sich etwas ändert (geschafft, knapp, verfehlt) */
let goalSnap = null, goalSnapV = -1;
function goalWatch() {
  if (goalSnapV === calcVersion) return;
  goalSnapV = calcVersion;
  const ws = weekStart(todayKey()), goals = weekGoals(ws), snap = {}, msgs = [];
  for (const g of goals) {
    const e = goalEval(g, ws);
    snap[g.id] = `${e.todayState}|${e.status}`;
    const prev = goalSnap && goalSnap[g.id];
    if (!prev || prev === snap[g.id]) continue;
    const [pt, ps] = prev.split('|');
    if (e.status === 'done' && ps !== 'done') msgs.push(`Wochenziel geschafft: ${g.title}`);
    else if (e.todayState === 'ok' && pt === 'open') msgs.push(`Heute geschafft: ${g.title}`);
    else if (e.todayState === 'fail' && pt !== 'fail') msgs.push(`Ziel heute verfehlt: ${g.title}`);
    else if (e.status === 'risk' && ps === 'open') msgs.push(`Wird knapp: ${g.title}`);
  }
  goalSnap = snap;
  if (msgs.length) { const t = $('#toast'); setTimeout(() => toast(msgs[0]), t && t.classList.contains('show') ? 2800 : 0); }
}

/* „Jetzt dran“: Ziele mit Uhrzeit melden sich ab dieser Zeit (bis 2 Std. danach), solange heute noch etwas zu tun ist */
function goalNow(g, e) {
  if (!g.when || !e.hasToday || e.status === 'done' || e.status === 'missed' || e.todayState === 'fail') return false;
  if (g.cmp === '>=' && e.todayState === 'ok') return false;
  const t = timeToMin(g.when), n = nowMin();
  return n >= t && n <= t + 120;
}
function goalNudges() {
  const ws = weekStart(todayKey());
  return weekGoals(ws).map((g) => ({ g, e: goalEval(g, ws) })).filter((x) => goalNow(x.g, x.e));
}
function goalNudgeCheck() {
  if (document.hidden) return;
  const k = todayKey();
  ui.nudged = ui.nudged || {};
  for (const { g } of goalNudges()) {
    const key = `${k}|${g.id}`;
    if (ui.nudged[key]) continue;
    ui.nudged[key] = true;
    const t = $('#toast');
    setTimeout(() => toast(`Jetzt dran: ${g.title}${g.tip ? ` – ${g.tip}` : ''}`), t && t.classList.contains('show') ? 2800 : 0);
    break;
  }
}

/* ---------- Anzeige ---------- */
function goalRow(g, ws, e, open) {
  const a = GOAL_AREAS[g.area] || GOAL_AREAS.ern, st = GOAL_ST[e.status] || GOAL_ST.open;
  const tick = g.metric === 'manual' && e.hasToday ? `<button class="goal-tick${e.todayState === 'ok' ? ' is-on' : ''}" data-a="goal-tick" data-id="${g.id}" data-ws="${ws}" aria-label="Heute abhaken">${icon('check')}</button>` : '';
  const det = open ? `<div class="goal-det">${g.why ? `<p><b>Warum:</b> ${esc(g.why)}</p>` : ''}${g.tip ? `<p><b>So geht's:</b> ${esc(g.tip)}</p>` : ''}${g.example ? `<p><b>Beispiel:</b> ${esc(g.example)}</p>` : ''}<p class="hint">Gemessen: ${esc(goalRule(g))}</p></div>` : '';
  const now = goalNow(g, e);
  return `<div class="goal ${st[0]}${now ? ' is-now' : ''}"><div class="goal-top"><button class="goal-hit" data-a="expand" data-key="goal:${g.id}">${icon(now ? 'alarm-clock' : a.ic)}<span class="goal-main">${now ? `<em class="goal-now">Jetzt dran${g.tip ? `: ${esc(g.tip)}` : ''}</em>` : ''}<b>${esc(g.title)}</b><small>${esc(e.progress)}${e.todayText ? ` · ${esc(e.todayText)}` : ''}${g.when && !now ? ` · Erinnerung ${esc(g.when)}` : ''}</small></span><span class="goal-st">${icon(st[1])}<small>${st[2]}</small></span></button>${tick}</div>${det}</div>`;
}
function goalsCard(k) {
  const ws = weekStart(k), goals = weekGoals(ws), wd = weekday(k);
  const eve = wd === 6 && new Date().getHours() >= 16;
  let h = '';
  if (goals.length) {
    const rows = goals.map((g) => ({ g, e: goalEval(g, ws) })).map((x) => ({ ...x, now: goalNow(x.g, x.e) }));
    rows.sort((x, y) => (y.now - x.now));
    const done = rows.filter((x) => x.e.status === 'done').length;
    h += `<section class="sec goals-card"><div class="sec-head"><h2>Wochenziele</h2><span class="count">${done ? `${done}/${rows.length} geschafft · ` : ''}KW ${isoWeek(ws)}</span></div><div class="goals">${rows.map((x) => goalRow(x.g, ws, x.e, ui.exp.has('goal:' + x.g.id))).join('')}</div></section>`;
  }
  if (!eve && !goals.length && wd <= 2) h += `<div class="banner goal-cta">${icon('target')}<div><b>Noch keine Wochenziele</b><span>Schick Frank den Bericht der letzten Woche, er gibt dir 3 Ziele für diese Woche zurück.</span></div><button class="pill-btn is-accent" data-a="report-open" data-ws="${addDays(ws, -7)}">Bericht</button></div>`;
  return h;
}
/* Ziel des Bereichs als Hinweis auf der jeweiligen Seite */
function goalNotes(areas) {
  const ws = weekStart(todayKey());
  const gs = weekGoals(ws).filter((g) => areas.includes(g.area));
  if (!gs.length) return '';
  return gs.map((g) => { const e = goalEval(g, ws), st = GOAL_ST[e.status]; return `<div class="banner goal-note ${st[0]}">${icon('target')}<div><b>Wochenziel: ${esc(g.title)}</b><span>${esc(e.progress)}${e.todayText ? ` · ${esc(e.todayText)}` : ''}</span></div></div>`; }).join('');
}
function weekGoalsHTML(ws) {
  const goals = weekGoals(ws);
  const rev = (S.reviews[ws] || {}).frank;
  let h = '';
  if (goals.length) h += `<section class="sec"><div class="sec-head"><h2>Wochenziele</h2><span class="count">von Frank</span></div><div class="goals">${goals.map((g) => goalRow(g, ws, goalEval(g, ws), ui.exp.has('goal:' + g.id))).join('')}</div></section>`;
  if (rev) h += frankReviewHTML(rev, 'Franks Rückblick');
  return h;
}
function frankReviewHTML(rev, title) {
  const part = (l, xs, ic) => (xs && xs.length ? `<h5>${l}</h5><ul class="${ic === 'check' ? 'wins' : ic === 'lightbulb' ? 'wins tips' : 'gaps'}">${xs.map((x) => `<li>${icon(ic)}<span>${esc(x)}</span></li>`).join('')}</ul>` : '');
  return `<section class="sec frank-rev"><div class="sec-head"><h2>${esc(title)}</h2></div>${part('Gut gemacht', rev.good, 'check')}${part('Daran arbeiten', rev.work, 'arrow-down')}${part('Zu viel', rev.more, 'trending-up')}${part('Zu wenig', rev.less, 'trending-down')}${part('Vorschläge', rev.tips, 'lightbulb')}</section>`;
}

/* ============================================================
   MUSTER: Was die App aus deinen Daten lernt
   Vergleich „Tage mit“ gegen „Tage ohne“ eine Gewohnheit und die
   Wirkung am Folgetag (Schlaf, Erholung, Haut, Knie).
   ============================================================ */
const MU_OUT = {
  sleep: { n: 'Sleep Score', phrase: 'dein Sleep Score in der Nacht danach', u: 'Punkte', d: 0, better: 'hi', min: 3, area: 'schlaf', at: (k) => muHealth(addDays(k, 1), 'sleepScore') },
  hrv: { n: 'HRV', phrase: 'deine HRV in der Nacht danach', u: 'ms', d: 0, better: 'hi', min: 3, area: 'schlaf', at: (k) => muHealth(addDays(k, 1), 'hrv') },
  bb: { n: 'Body Battery', phrase: 'deine Body Battery am nächsten Morgen', u: 'Punkte', d: 0, better: 'hi', min: 4, area: 'schlaf', at: (k) => muHealth(addDays(k, 1), 'bbMorning') },
  skin: { n: 'Hautscore', phrase: 'dein Hautscore in den 2 Tagen danach', u: 'Punkte', d: 1, better: 'hi', min: 0.4, area: 'haut', at: (k) => { const vs = [1, 2].map((i) => { const d = peekDay(addDays(k, i)); return d && d.skin && d.skin.score != null ? d.skin.score : null; }).filter((v) => v != null); return vs.length ? mean(vs) : null; } },
  knee: { n: 'Knieschmerz', phrase: 'dein Knieschmerz am nächsten Morgen', u: 'Punkte', d: 1, better: 'lo', min: 0.5, area: 'knie', at: (k) => kneeAm(addDays(k, 1)) },
};
function muHealth(k, f) { const d = peekDay(k); const v = d && d.health ? d.health[f] : null; return v == null || v === '' ? null : Number(v); }
function muTrain(k, f) { const d = peekDay(k); if (!d) return null; return (d.trainings || []).some((t) => !trainType(t).light && f(t)); }
const MU_FEAT = {
  cafLate: { n: () => `Koffein nach ${S.settings.caf.cutoff}`, bad: () => `Letzten Kaffee vor ${S.settings.caf.cutoff} trinken, danach entkoffeiniert oder Kräutertee.`, good: () => ``, f: (k) => (peekDay(k) ? cafInfo(k).late.length > 0 : null) },
  cafBed: { n: () => 'viel Koffein zur Schlafenszeit (über 50 mg)', bad: () => `Weniger Koffein am Nachmittag: der Rest im Körper zur Schlafenszeit stört den Tiefschlaf.`, good: () => ``, f: (k) => (peekDay(k) ? cafInfo(k).bedLevel >= 50 : null) },
  alk: { n: () => 'Alkohol', bad: () => `Alkohol weglassen oder früher am Abend, mindestens 8 Std. vor dem Schlafen.`, good: () => ``, f: (k) => (hasData(peekDay(k)) ? (computeTotals(k, false).tot.alk || 0) > 0 : null) },
  lateMeal: { n: () => 'später letzter Mahlzeit (ab 21 Uhr)', bad: () => `Letzte große Mahlzeit bis ca. 20:30, danach höchstens etwas Leichtes.`, good: () => ``, f: (k) => { const d = peekDay(k); const t = d && d.hd && d.hd.lastMeal ? timeVal(d.hd.lastMeal, true) : null; return t == null ? null : t >= 1260; } },
  screen: { n: () => 'bildschirmfreiem Abend', bad: () => ``, good: () => `Bildschirmfreie Abende beibehalten.`, f: (k) => { const d = peekDay(k); return d ? !!(d.habits && d.habits.bildschirm) : null; } },
  light: { n: () => 'Morgenlicht', bad: () => ``, good: () => `Morgenlicht beibehalten: 10–30 Min. raus nach dem Aufstehen.`, f: (k) => { const d = peekDay(k); return d ? !!(d.habits && d.habits.licht_morgen) : null; } },
  eveTrain: { n: () => 'Training am Abend (ab 18 Uhr)', bad: () => `Training lieber vor 18 Uhr legen oder danach länger runterfahren.`, good: () => ``, f: (k) => muTrain(k, (t) => (timeToMin(t.time) || 0) >= 1080) },
  train: { n: () => 'Training', bad: () => `An Trainingstagen auf Schlaf und Essen nach dem Training achten.`, good: () => `Training tut dir gut, Rhythmus halten.`, f: (k) => muTrain(k, () => true) },
  sauna: { n: () => 'Sauna', bad: () => `Sauna früher am Abend und danach gut trinken.`, good: () => `Sauna beibehalten, am besten direkt nach dem Training.`, f: (k) => (peekDay(k) ? saunaMin(peekDay(k)) > 0 : null) },
  mgSupp: { n: () => 'Magnesium am Abend', bad: () => ``, good: () => `Magnesium am Abend beibehalten.`, f: (k) => { const d = peekDay(k); return d ? !!(d.checks && d.checks.s_mg) : null; } },
  whey: { n: () => 'Whey oder Proteinshake', bad: () => `Whey testweise weglassen (Haut-Phase 2), Protein aus Skyr, Eiern, Fisch.`, good: () => ``, f: (k) => (hasData(peekDay(k)) ? dayTags(k).has('whey') : null) },
  milbona: { n: () => 'Milbona-Shake', bad: () => `Milbona-Shakes testweise weglassen (Haut-Phase 2).`, good: () => ``, f: (k) => (hasData(peekDay(k)) ? dayTags(k).has('milbona') : null) },
  ag1: { n: () => 'AG1', bad: () => `AG1 testweise pausieren (Haut-Phase 3).`, good: () => ``, f: (k) => (hasData(peekDay(k)) ? dayTags(k).has('ag1') : null) },
  sugar: { n: () => 'viel freiem Zucker (über 50 g)', bad: () => `Freien Zucker unter 50 g halten: Süßes und Säfte reduzieren.`, good: () => ``, f: (k) => (hasData(peekDay(k)) ? (computeTotals(k, false).tot.fs || 0) > 50 : null) },
  sleepLow: { n: () => 'schlechtem Schlaf (Sleep Score unter 70)', bad: () => `Schlaf zuerst verbessern: Koffein-Stopp, bildschirmfrei, feste Zeiten.`, good: () => ``, f: (k) => { const v = muHealth(k, 'sleepScore'); return v == null ? null : v < 70; } },
  shave: { n: () => 'Rasur', bad: () => `Rasur schonend: neue Klinge, mit dem Strich, danach Physiogel.`, good: () => ``, f: (k) => { const d = peekDay(k); return d ? !!(d.skin && d.skin.rasur) : null; } },
  carePm: { n: () => 'Pflege am Abend', bad: () => ``, good: () => `Pflege am Abend beibehalten.`, f: (k) => { const d = peekDay(k); return d && d.skin && d.skin.score != null ? !!d.skin.pflege_pm : null; } },
  run: { n: () => 'Lauf', bad: () => `Laufumfang langsamer steigern, vorher die Routine „Vor dem Lauf“.`, good: () => ``, f: (k) => muTrain(k, (t) => trainType(t).run) },
  longRun: { n: () => 'Lauf über 6 km', bad: () => `Lange Läufe kürzer halten, höchstens +10 % pro Woche.`, good: () => ``, f: (k) => muTrain(k, (t) => trainType(t).run && (Number(t.km) || 0) > 6) },
  legs: { n: () => 'Beintag', bad: () => `Am Beintag die Knie-Varianten nutzen (Hip Thrust, Beinpresse Füße hoch).`, good: () => ``, f: (k) => muTrain(k, (t) => trainType(t).legs) },
  mob: { n: () => 'Mobility-Routine', bad: () => ``, good: () => `Mobility täglich beibehalten.`, f: (k) => (peekDay(k) ? dayDone(k).mob : null) },
  kneeStr: { n: () => 'Knie-Kraft', bad: () => ``, good: () => `Knie-Kraft beibehalten.`, f: (k) => (peekDay(k) ? dayDone(k).kraft : null) },
};
const MU_HYPO = [
  ['cafLate', 'sleep'], ['cafBed', 'sleep'], ['alk', 'sleep'], ['lateMeal', 'sleep'], ['screen', 'sleep'], ['light', 'sleep'], ['eveTrain', 'sleep'], ['sauna', 'sleep'], ['mgSupp', 'sleep'],
  ['alk', 'hrv'], ['eveTrain', 'hrv'], ['sauna', 'hrv'], ['cafBed', 'hrv'], ['cafLate', 'bb'], ['alk', 'bb'], ['train', 'bb'],
  ['whey', 'skin'], ['milbona', 'skin'], ['ag1', 'skin'], ['sugar', 'skin'], ['alk', 'skin'], ['sleepLow', 'skin'], ['shave', 'skin'], ['carePm', 'skin'],
  ['run', 'knee'], ['longRun', 'knee'], ['legs', 'knee'], ['mob', 'knee'], ['kneeStr', 'knee'],
];
let muCache = { v: -1, day: '', res: null };
function muster(days = 56) {
  const today = todayKey();
  if (muCache.v === calcVersion && muCache.day === today && muCache.res) return muCache.res;
  const keys = [];
  for (let i = days; i >= 1; i--) keys.push(addDays(today, -i));
  const fcache = {}, ocache = {};
  const F = (id, k) => { const c = (fcache[id] = fcache[id] || {}); if (!(k in c)) { try { c[k] = MU_FEAT[id].f(k); } catch (e) { c[k] = null; } } return c[k]; };
  const O = (id, k) => { const c = (ocache[id] = ocache[id] || {}); if (!(k in c)) c[k] = MU_OUT[id].at(k); return c[k]; };
  const found = [];
  let outDays = 0;
  for (const id of Object.keys(MU_OUT)) outDays = Math.max(outDays, keys.filter((k) => O(id, k) != null).length);
  for (const [fid, oid] of MU_HYPO) {
    const A = [], B = [];
    for (const k of keys) {
      const f = F(fid, k), o = O(oid, k);
      if (f == null || o == null) continue;
      (f ? A : B).push(o);
    }
    if (A.length < 3 || B.length < 3 || A.length + B.length < 8) continue;
    const ma = mean(A), mb = mean(B), diff = ma - mb;
    const sd = Math.sqrt((A.reduce((s, x) => s + (x - ma) ** 2, 0) + B.reduce((s, x) => s + (x - mb) ** 2, 0)) / Math.max(1, A.length + B.length - 2));
    const eff = sd > 0 ? Math.abs(diff) / sd : Math.abs(diff) > 0 ? 9 : 0;
    const o = MU_OUT[oid];
    if (Math.abs(diff) < o.min || eff < 0.35) continue;
    const good = o.better === 'hi' ? diff > 0 : diff < 0;
    const strong = A.length >= 7 && B.length >= 7 && eff >= 0.6;
    found.push({ fid, oid, area: o.area, nA: A.length, nB: B.length, ma, mb, diff, eff, good, strong,
      text: `Nach Tagen mit ${MU_FEAT[fid].n()} war ${o.phrase} im Schnitt ${fmt(Math.abs(diff), o.d)} ${o.u} ${diff > 0 ? 'höher' : 'niedriger'} (${fmt(ma, o.d)} statt ${fmt(mb, o.d)}; ${A.length} gegenüber ${B.length} Tagen).` });
  }
  found.sort((x, y) => (y.strong - x.strong) || (y.eff - x.eff));
  const res = { found, days: outDays };
  muCache = { v: calcVersion, day: today, res };
  return res;
}
/* Gewohnheiten: was du regelmäßig auslässt, was am Wochenende anders läuft, wie sich Tagesarten unterscheiden */
let habCache = { v: -1, day: '', res: null };
function habitPatterns(days = 28) {
  const today = todayKey();
  if (habCache.v === calcVersion && habCache.day === today && habCache.res) return habCache.res;
  const keys = [];
  for (let i = days; i >= 1; i--) keys.push(addDays(today, -i));
  const logged = keys.filter((k) => hasData(peekDay(k)));
  const out = [];
  const pc = (x) => `${fmt(x * 100)} %`;
  if (logged.length >= 7) {
    /* Standardtag: oft ausgelassen, am Wochenende anders */
    const rare = [];
    for (const { it, block } of allPlanItems()) {
      if (!block || it.opt) continue;
      const wd = [0, 0], we = [0, 0];
      for (const k of logged) {
        if (!itemInVariant(it, dayVariant(k))) continue;
        const arr = weekday(k) >= 5 ? we : wd;
        arr[1]++;
        if (peekDay(k).checks[it.id]) arr[0]++;
      }
      const n = wd[1] + we[1];
      if (n < 7) continue;
      const name = itemLabel(it, null), rate = (wd[0] + we[0]) / n;
      if (we[1] >= 3 && wd[1] >= 5 && wd[0] / wd[1] - we[0] / we[1] >= 0.35) {
        out.push({ area: 'ern', w: wd[0] / wd[1] - we[0] / we[1], text: `Am Wochenende lässt du ${name} öfter aus (${pc(we[0] / we[1])} statt ${pc(wd[0] / wd[1])} an Werktagen).`, tip: 'Für das Wochenende einen festen Platz im Tag einplanen, z. B. direkt zum Frühstück.' });
      } else if (rate < 0.6) rare.push({ name, rate });
    }
    if (rare.length) {
      rare.sort((a, b) => a.rate - b.rate);
      const shown = rare.slice(0, 6);
      out.push({ area: 'ern', w: 0.6 - mean(shown.map((x) => x.rate)), text: `Selten abgehakt: ${shown.map((x) => `${x.name} ${pc(x.rate)}`).join(', ')}${rare.length > 6 ? ` und ${rare.length - 6} weitere` : ''}.`, tip: 'Mit einer festen Gewohnheit verknüpfen (z. B. direkt zum Frühstück). Was nicht mehr zu deinem Tag gehört, unter Einstellungen → Standardtag herausnehmen.' });
    }
    /* Ernährung nach Tagesart (Prepmymeal-, Döner-, Makrele-Tag) */
    const byVar = {};
    for (const k of logged) (byVar[dayVariant(k)] = byVar[dayVariant(k)] || []).push(k);
    const thr = { fib: 6, p: 25, kcal: 400 };
    for (const key of ['fib', 'p', 'kcal']) {
      for (const [v, ks] of Object.entries(byVar)) {
        const rest = logged.filter((k) => dayVariant(k) !== v);
        if (ks.length < 3 || rest.length < 3) continue;
        const a = mean(ks.map((k) => evaluate(k).metrics[key].v)), b = mean(rest.map((k) => evaluate(k).metrics[key].v));
        const t = targetFor(key);
        if (Math.abs(a - b) < thr[key]) continue;
        const worse = key === 'kcal' ? (t.max != null && a > b && a > (t.hi || t.lo)) || (a < b && a < (t.lo || 0)) : a < b;
        if (!worse) continue;
        out.push({ area: 'ern', w: Math.abs(a - b) / thr[key] / 3, text: `An ${VARIANTS[v] ? VARIANTS[v] + 'en' : v}: ${metaOf(key).n} Ø ${fmt(a)} ${metaOf(key).u} statt ${fmt(b)} ${metaOf(key).u} an den anderen Tagen.`, tip: key === 'fib' ? 'Dann Ballaststoffe gezielt ergänzen: Leinsamen, Beeren, Haferflocken.' : key === 'p' ? 'Dann eine Eiweißquelle ergänzen: Skyr, Eier oder Makrele.' : 'Portionen an diesen Tagen anpassen.' });
      }
    }
    /* Koffein an Trainingstagen */
    const sport = logged.filter((k) => isSportDay(k)), rest = logged.filter((k) => !isSportDay(k));
    if (sport.length >= 3 && rest.length >= 3) {
      const ls = sport.filter((k) => cafInfo(k).late.length).length / sport.length, lr = rest.filter((k) => cafInfo(k).late.length).length / rest.length;
      if (ls - lr >= 0.3) out.push({ area: 'koffein', w: ls - lr, text: `An Trainingstagen trinkst du öfter Koffein nach ${S.settings.caf.cutoff} (${pc(ls)} statt ${pc(lr)} der Tage).`, tip: 'Pre-Workout-Koffein nur bei Training vor 14 Uhr, sonst koffeinfrei.' });
    }
  }
  /* Einschlafzeit Werktage gegen Wochenende */
  const bed = (ks) => ks.map((k) => { const d = peekDay(k); return d && d.health && d.health.bedTime ? timeVal(d.health.bedTime, true) : null; }).filter((v) => v != null);
  const bW = bed(keys.filter((k) => weekday(k) <= 4)), bE = bed(keys.filter((k) => weekday(k) >= 5));
  if (bW.length >= 5 && bE.length >= 3) {
    const a = mean(bE), b = mean(bW);
    if (a - b >= 45) out.push({ area: 'schlaf', w: (a - b) / 90, text: `Am Wochenende schläfst du Ø ${fmt((a - b) / 60, 1)} Std. später ein (${minToTime(Math.round(a) % 1440)} statt ${minToTime(Math.round(b) % 1440)}).`, tip: 'Gleichmäßige Zeiten stabilisieren den Schlaf, höchstens 1 Std. Unterschied.' });
  }
  /* Gewohnheiten, die selten klappen */
  const hk = keys.filter((k) => peekDay(k));
  if (hk.length >= 7) {
    for (const hb of HABITS) {
      if (['sauna', 'gesicht', 'koffein'].includes(hb.id)) continue;
      const done = hk.filter((k) => { const d = peekDay(k); return d.habits && d.habits[hb.id]; }).length;
      const r = done / hk.length;
      if (done > 0 && r < 0.4) out.push({ area: 'schlaf', w: (0.4 - r) * 0.8, text: `${hb.n}: nur an ${pc(r)} der Tage.`, tip: hb.when ? `Zeitpunkt: ${hb.when}.` : '' });
    }
  }
  out.sort((x, y) => y.w - x.w);
  const res = out.slice(0, 10);
  habCache = { v: calcVersion, day: today, res };
  return res;
}
function habitPatternRows(list) {
  return `<div class="mu-list">${list.map((x) => `<div class="mu is-hab">${icon(GOAL_AREAS[x.area] ? GOAL_AREAS[x.area].ic : 'repeat')}<p>${esc(x.text)}${x.tip ? `<small class="mu-tip">${icon('lightbulb')}${esc(x.tip)}</small>` : ''}</p></div>`).join('')}</div>`;
}
function muTip(f) { const x = MU_FEAT[f.fid]; const t = x ? (f.good ? x.good() : x.bad()) : ''; return t || ''; }
function musterRows(list) {
  return `<div class="mu-list">${list.map((f) => { const t = muTip(f); return `<div class="mu ${f.good ? 'is-good' : 'is-bad'}">${icon(f.good ? 'trending-up' : 'trending-down')}<p>${esc(f.text)} <em class="mu-tag">${f.strong ? 'deutlich' : 'Hinweis'}</em>${t ? `<small class="mu-tip">${icon('lightbulb')}${esc(t)}</small>` : ''}</p></div>`; }).join('')}</div>`;
}
/* Kasten für die einzelnen Bereiche */
function musterBox(outs, title = 'Was die App gelernt hat') {
  const m = muster();
  const list = m.found.filter((f) => outs.includes(f.oid)).slice(0, 3);
  if (!list.length) return '';
  return `<section class="sec"><div class="sec-head"><h2>${esc(title)}</h2><span class="count">aus deinen Daten</span></div>${musterRows(list)}<p class="hint">Zusammenhang, kein Beweis. Mehr unter Wochenrückblick → Muster.</p></section>`;
}
function vMuster() {
  const m = muster(), hp = habitPatterns();
  let h = `<p class="sec-sub">Die App vergleicht die letzten 8 Wochen: Tage mit einer Gewohnheit gegen Tage ohne, und schaut, wie es dir danach ging. Je mehr du einträgst, desto verlässlicher wird es.</p>`;
  if (hp.length) h += `<section class="sec"><div class="sec-head"><h2>Deine Gewohnheiten</h2><span class="count">letzte 4 Wochen</span></div>${habitPatternRows(hp)}</section>`;
  if (!m.found.length) {
    h += emptyState(m.days < 10 ? `Noch zu wenig Daten (${m.days} Tage mit Schlaf, Haut oder Knie). Ab etwa zwei Wochen erscheinen erste Muster.` : 'Noch keine klaren Zusammenhänge. Die Unterschiede zwischen den Tagen sind bisher klein.');
    return h;
  }
  for (const [oid, o] of Object.entries(MU_OUT)) {
    const list = m.found.filter((f) => f.oid === oid);
    if (list.length) h += `<section class="sec"><div class="sec-head"><h2>${esc(o.n)}</h2></div>${musterRows(list)}</section>`;
  }
  h += `<p class="hint">„Deutlich“: mindestens je 7 Tage und ein großer Unterschied. „Hinweis“: noch wenige Tage, kann Zufall sein. Frank bekommt diese Muster mit dem Wochenbericht.</p>`;
  return h;
}

/* ============================================================
   WOCHENBERICHT FÜR FRANK
   ============================================================ */
function frankReportText(ws) {
  const r = weekReview(ws), we = addDays(ws, 6), gw = addDays(ws, 7);
  const L = [];
  const f0 = (v, d = 0) => (v == null ? '–' : fmt(v, d));
  const day = (k) => fmtDate(k, { day: 'numeric', month: 'short' });
  L.push(`Frank: Wochenbericht KW ${isoWeek(ws)} (${day(ws)}–${day(we)})`);
  L.push(`Bitte auswerten und 3 Wochenziele für KW ${isoWeek(gw)} (ab ${day(gw)}) als Code ausgeben.`);
  L.push('');
  L.push(`## Überblick`);
  L.push(`Tage mit Einträgen: ${r.daysWithData}/7 · Ernährung erfasst an ${r.nutriDays} Tagen · Ernährungs-Score Ø ${f0(r.nutriScore)} · Mikronährstoffe im Ziel Ø ${f0(r.coverage)} %`);
  // Ernährung
  const lk = r.past.filter((k) => hasData(peekDay(k)));
  if (lk.length) {
    const evs = lk.map((k) => evaluate(k));
    const av = (key) => mean(evs.map((e) => (e.metrics[key] ? e.metrics[key].v : metricValue(key, e.act.tot, e.plantsWeek.size))));
    const t = (key) => targetFor(key);
    const rng = (key) => { const x = t(key); return x.lo != null && x.hi != null ? `${fmt(disp(key, x.lo))}–${fmt(disp(key, x.hi))}` : x.lo != null ? `≥ ${fmt(disp(key, x.lo))}` : x.max != null ? `≤ ${fmt(disp(key, x.max))}` : ''; };
    const line = (key, d = 0) => `${metaOf(key).n} ${fmt(disp(key, av(key)), d)} ${metaOf(key).u}${rng(key) ? ` (Ziel ${rng(key)})` : ''}`;
    L.push('', `## Ernährung (Ø pro erfasstem Tag)`);
    L.push([line('kcal'), line('p'), line('fatPct'), line('c'), line('sf', 1), line('fs'), line('fib'), line('fluid'), line('ferm', 1), `Pflanzen diese Woche ${evs.length ? evs[evs.length - 1].plantsWeek.size : 0} (Ziel ≥ 30)`, line('upf')].join(' · '));
    const lows = MICRO_KEYS.concat(['fib', 'p']).map((key) => ({ key, pct: (av(key) || 0) / ((t(key).lo) || 1) })).filter((x) => t(x.key).lo && x.pct < 0.9).sort((a, b) => a.pct - b.pct);
    if (lows.length) L.push(`Unter Ziel: ${lows.slice(0, 6).map((x) => `${metaOf(x.key).n} ${fmt(x.pct * 100)} %`).join(', ')}`);
    const overs = [];
    for (const key of MICRO_KEYS.concat(['na', 'fs', 'sf', 'kcal', 'caf'])) { const x = t(key); if (x.maxKey) continue; const n = evs.filter((e) => e.metrics[key] && x.max != null && e.metrics[key].v > x.max).length; if (n) overs.push(`${metaOf(key).n} an ${n} ${n === 1 ? 'Tag' : 'Tagen'}`); }
    if (overs.length) L.push(`Über Maximum: ${overs.join(', ')}`);
    // Standardtag: was oft ausgelassen wurde
    const skip = {}, plan = {};
    for (const k of lk) { const d = peekDay(k), v = dayVariant(k); for (const { it, block } of allPlanItems()) { if (!block || it.opt || !itemInVariant(it, v)) continue; plan[it.id] = (plan[it.id] || 0) + 1; if (!d.checks[it.id]) skip[it.id] = (skip[it.id] || 0) + 1; } }
    const pTot = Object.values(plan).reduce((a, x) => a + x, 0), sTot = Object.values(skip).reduce((a, x) => a + x, 0);
    const sk = Object.entries(skip).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, n]) => { const f = findItem(id); return `${f ? itemLabel(f.it, null) : id} [item:${id}] ${n}×`; });
    L.push(`Standardtag: ${pTot ? fmt((1 - sTot / pTot) * 100) : '–'} % abgehakt${sk.length ? ` · oft ausgelassen: ${sk.join(', ')}` : ''}`);
    const extra = {};
    for (const k of lk) for (const e of peekDay(k).entries || []) { const f = FOOD[e.food]; const n = f ? f.n : e.food; extra[n] = (extra[n] || 0) + 1; }
    const ex = Object.entries(extra).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (ex.length) L.push(`Zusätzlich gegessen: ${ex.map(([n, c]) => `${n} ${c}×`).join(', ')}`);
    const alkDays = lk.filter((k) => (computeTotals(k, false).tot.alk || 0) > 0).length;
    const tagDays = (tag) => lk.filter((k) => dayTags(k).has(tag)).length;
    L.push(`Alkohol an ${alkDays} Tagen · Whey/Proteinshake an ${tagDays('whey')} Tagen · AG1 an ${tagDays('ag1')} Tagen`);
  }
  // Training
  L.push('', `## Training & Sauna`);
  L.push(`Einheiten ${r.trainings.length} (${fmt(r.trainMin)} Min.) · Gym ${r.gymDone}/${r.gymPlanned} geplant · Läufe ${r.q.runs} (${f0(r.km, 1)} km, Vorwoche ${f0(r.kmPrev, 1)} km) · Sauna ${fmt(r.sauna)}/${fmt(r.saunaGoal)} Min.`);
  const steps = mean(r.past.map((k) => muHealth(k, 'steps')).filter((v) => v != null));
  if (steps != null) L.push(`Schritte Ø ${fmt(steps)}`);
  // Schlaf
  const hav = (f) => mean(r.past.map((k) => muHealth(k, f)).filter((v) => v != null));
  const durs = r.past.map((k) => muHealth(k, 'sleepDur')).filter((v) => v != null);
  const beds = r.past.map((k) => { const d = peekDay(k); return d && d.health && d.health.bedTime ? timeVal(d.health.bedTime, true) : null; }).filter((v) => v != null);
  L.push('', `## Schlaf & Erholung`);
  L.push(`Sleep Score Ø ${f0(r.sleep)} (Vorwoche ${f0(r.sleepPrev)}) · Schlafdauer Ø ${durs.length ? goalFmt({ kind: 'dur' }, mean(durs)) : '–'} Std. · Eingeschlafen Ø ${beds.length ? minToTime(Math.round(mean(beds)) % 1440) : '–'} · HRV Ø ${f0(r.hrv)} ms · Ruhepuls Ø ${f0(r.rhr)} · Body Battery morgens Ø ${f0(hav('bbMorning'))} · Stress Ø ${f0(hav('stress'))}`);
  // Koffein
  const cafs = r.past.filter((k) => peekDay(k)).map((k) => cafInfo(k));
  const lasts = cafs.map((c) => c.last).filter((v) => v != null);
  L.push('', `## Koffein`);
  L.push(`Ø ${f0(r.cafAvg)} mg/Tag · letztes Koffein Ø ${lasts.length ? minToTime(Math.round(mean(lasts))) : '–'} · nach ${S.settings.caf.cutoff} an ${r.cafLateDays} Tagen · Rest zur Schlafenszeit Ø ${cafs.length ? fmt(mean(cafs.map((c) => c.bedLevel))) : '–'} mg`);
  // Haut
  const ph = skinPhase(we) || skinPhase(ws);
  const care = (id) => r.past.filter((k) => { const d = peekDay(k); return d && d.skin && d.skin[id]; }).length;
  const spots = mean(r.past.map((k) => { const d = peekDay(k); return d && d.skin && d.skin.spots != null ? d.skin.spots : null; }).filter((v) => v != null));
  L.push('', `## Haut`);
  L.push(`Hautscore Ø ${f0(r.skin, 1)} von 10 (Vorwoche ${f0(r.skinPrev, 1)}) · neue Pickel Ø ${f0(spots, 1)} · ${(S.settings.skin.routine || []).map((x) => `${x.n.split(' (')[0]} [routine:${x.id}] ${care(x.id)}/7`).join(' · ')}${ph ? ` · ${ph.n}: ${ph.rules.join(', ')}` : ''}`);
  // Knie
  L.push('', `## Knie`);
  L.push(`Morgenschmerz Ø ${f0(r.painAm, 1)}/10 · Laufschmerz Ø ${f0(r.painRun, 1)} · max. ${f0(r.painMax)} · Mobilität ${r.q.mob}/7 · Knie-Kraft ${r.q.kraft}/${r.q.kraftGoal} · lange Routine ${r.q.lang} · Warnzeichen: ${r.flags.length ? r.flags.join(', ') : 'keine'}`);
  // Gewohnheiten
  const hab = HABITS.map((h) => `${h.n.split(' (')[0]} [habit:${h.id}] ${r.past.filter((k) => { const d = peekDay(k); return d && d.habits && d.habits[h.id]; }).length}/7`);
  L.push('', `## Gewohnheiten`, hab.join(' · '));
  // Ziele dieser Woche
  const goals = weekGoals(ws);
  if (goals.length) { L.push('', `## Wochenziele dieser Woche`); goals.forEach((g, i) => { const e = goalEval(g, ws); L.push(`${i + 1}. ${g.title}: ${e.progress} → ${GOAL_ST[e.status][2]}`); }); }
  // Muster
  const mu = muster().found.slice(0, 6);
  if (mu.length) { L.push('', `## Muster aus den letzten 8 Wochen`); mu.forEach((f) => L.push(`- ${f.text}${f.strong ? '' : ' (Hinweis)'}`)); }
  const hp = habitPatterns().slice(0, 6);
  if (hp.length) { L.push('', `## Gewohnheiten der letzten 4 Wochen`); hp.forEach((x) => L.push(`- ${x.text}`)); }
  // Körper und App-Auswertung
  if (r.weight != null) L.push('', `## Körper`, `Gewicht ${fmt(r.weight, 1)} kg${r.weightPrev != null ? ` (Vorwoche ${fmt(r.weightPrev, 1)})` : ''}`);
  if (r.good.length || r.bad.length) L.push('', `## Auswertung der App`, `Lief gut: ${r.good.join('; ') || '–'}`, `Verbessern: ${r.bad.join('; ') || '–'}`);
  const note = (S.reviews[ws] || {}).note;
  if (note) L.push('', `## Meine Notiz`, note);
  return L.join('\n');
}
function sheetReport(ws) {
  ui.sheet = { type: 'frank', step: 'report', ws, report: frankReportText(ws), k: todayKey(), items: null, goals: null, more: new Set(), showReport: false };
  renderFrankSheet();
}
function renderReportStep() {
  const s = ui.sheet, gw = addDays(s.ws, 7);
  const url = 'https://claude.ai/new' + (s.report.length < 2500 ? '?q=' + encodeURIComponent(s.report) : '');
  openSheet(`<h3 class="sheet-title">Wochenbericht an Frank</h3>
    <p class="hint">KW ${isoWeek(s.ws)}: Ernährung, Training und Sauna, Schlaf, Koffein, Haut, Knie, Gewohnheiten und die Muster der letzten Wochen. Frank wertet ihn aus und gibt dir 3 Ziele für KW ${isoWeek(gw)} zurück.</p>
    <div class="frank-step"><span class="frank-n">1</span><div class="frank-body"><b>Bericht an Frank schicken</b>
      <a class="btn" id="frank-go" href="${esc(url)}" target="_blank" rel="noopener" data-copy="${esc(s.report)}">${icon('send')}Kopieren und Claude öffnen</a>
      <p class="hint">In Claude einfügen und abschicken. Geht Claude im Browser auf: Claude-App öffnen und einfügen.</p>
      <button class="link-btn" data-a="report-toggle">${s.showReport ? 'Bericht ausblenden' : 'Bericht ansehen'}</button>
      ${s.showReport ? `<pre class="report-pre">${esc(s.report)}</pre>` : ''}</div></div>
    <div class="frank-step"><span class="frank-n">2</span><div class="frank-body"><b>Code mit den Zielen einfügen</b>
      <textarea class="note frank-code" id="frank-code" rows="3" data-i="frank-code" placeholder="Code von Frank hier einfügen" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
      <button class="btn is-accent" data-a="frank-paste">${icon('clipboard-paste')}Code einfügen</button>
      <p class="frank-err" id="frank-err" hidden></p></div></div>`);
}

/* ---------- Ziele aus Franks Code ---------- */
function frankGoalsParse(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const raw = Array.isArray(o.goals) ? o.goals : Array.isArray(o.ziele) ? o.ziele : null;
  if (!raw) return null;
  const goals = raw.slice(0, 5).map(goalNorm).filter(Boolean);
  if (!goals.length) return null;
  const list = (x) => (Array.isArray(x) ? x.map((v) => frankText(v, 240)).filter(Boolean).slice(0, 6) : []);
  const rv = o.review && typeof o.review === 'object' ? o.review : {};
  const review = { good: list(rv.good), work: list(rv.work), more: list(rv.more), less: list(rv.less), tips: list(rv.tips) };
  const wk = /^\d{4}-\d{2}-\d{2}$/.test(String(o.week || '')) ? weekStart(o.week) : null;
  return { goals, review: Object.values(review).some((x) => x.length) ? review : null, week: wk };
}
function renderGoalsStep() {
  const s = ui.sheet, data = s.goals, today = todayKey(), cur = weekStart(today);
  const opts = [...new Set([cur, addDays(cur, 7), s.gw])].sort();
  const name = (w) => (w === cur ? 'Diese Woche' : w === addDays(cur, 7) ? 'Nächste Woche' : `KW ${isoWeek(w)}`);
  const old = weekGoals(s.gw).length;
  openSheet(`<h3 class="sheet-title">Ziele von Frank</h3>
    <div class="chips">${opts.map((w) => `<button class="chip chip-sm${w === s.gw ? ' is-on' : ''}" data-a="goals-week" data-v="${w}">${esc(name(w))} · KW ${isoWeek(w)}</button>`).join('')}</div>
    ${data.goals.map((g) => { const a = GOAL_AREAS[g.area] || GOAL_AREAS.ern; return `<div class="frank-card goal-prev"><div class="frank-head"><b>${icon(a.ic)} ${esc(g.title)}</b><small>${esc(a.n)} · gemessen: ${esc(goalRule(g))}</small></div>${g.why ? `<p class="hint"><b>Warum:</b> ${esc(g.why)}</p>` : ''}${g.tip ? `<p class="hint"><b>So geht's:</b> ${esc(g.tip)}</p>` : ''}${g.example ? `<p class="hint"><b>Beispiel:</b> ${esc(g.example)}</p>` : ''}</div>`; }).join('')}
    ${data.review ? frankReviewHTML(data.review, 'Franks Rückblick') : ''}
    ${old ? `<p class="hint warn-txt">Ersetzt die ${old} bisherigen Ziele dieser Woche.</p>` : ''}
    <div class="sheet-acts"><button class="btn is-accent" data-a="goals-save">${data.goals.length} ${data.goals.length === 1 ? 'Ziel' : 'Ziele'} übernehmen</button>
      <button class="btn is-ghost" data-a="frank-back">Anderen Code einfügen</button></div>`);
}
function goalsSave() {
  const s = ui.sheet;
  if (!s || !s.goals) return;
  const gw = s.gw, rw = addDays(gw, -7);
  S.reviews[gw] = { ...(S.reviews[gw] || {}), goals: s.goals.goals, goalsAt: new Date().toISOString(), ticks: {} };
  if (s.goals.review) S.reviews[rw] = { ...(S.reviews[rw] || {}), frank: s.goals.review };
  markDirty('reviews'); invalidate();
  goalSnap = null;
  closeSheet(); render();
  toast(`${s.goals.goals.length} Wochenziele für KW ${isoWeek(gw)} übernommen`);
}

/* ---------- Aktionen ---------- */
Object.assign(A, {
  'report-open': (el) => sheetReport(el.dataset.ws || weekStart(todayKey())),
  'report-toggle': () => { ui.sheet.showReport = !ui.sheet.showReport; frankRerender(); },
  'goals-week': (el) => { ui.sheet.gw = el.dataset.v; frankRerender(); },
  'goals-save': () => goalsSave(),
  'goal-tick': (el) => {
    const ws = el.dataset.ws, id = el.dataset.id, k = todayKey();
    const rv = (S.reviews[ws] = S.reviews[ws] || {});
    rv.ticks = rv.ticks || {};
    const t = (rv.ticks[id] = rv.ticks[id] || {});
    if (t[k]) delete t[k]; else t[k] = true;
    saveStore('reviews');
  },
});
