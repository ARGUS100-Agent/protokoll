/* ============================================================
   GEWOHNHEITEN & ROUTINEN (seit 2.10.0, Wunsch vom 11.11.2026)
   Neue Gewohnheiten: warm duschen, To-do-Liste für morgen, Meditation 13 Min., Atemübung 5 Min.,
   10 Min. gehen nach dem Essen, Schritte, kein Kältebad nach dem Krafttraining, Handy bewusst
   nutzen; dazu Sauna als Wochenziel. Morgen-, Tages- und Abendroutine als Häkchen-Listen mit
   Uhrzeiten aus deinem Tagesrhythmus. Mitteilung antippen → Ja/Nein-Abfrage in der App
   (iPhone-Web-Apps können keine Knöpfe in Mitteilungen zeigen).
   ============================================================ */
/*icons: shower-head list-checks brain wind footprints snowflake smartphone thermometer sun moon sunrise pill sparkles bed lamp utensils chevron-up chevron-down plus x check circle-dashed*/
HABITS.push(
  { id: 'warm_dusche', n: 'Warm duschen oder baden', when: '1–2 Std. vor dem Schlafen, 40–42 °C, mind. 10 Min.', ask: 'Warm geduscht?' },
  { id: 'todo_morgen', n: 'To-do-Liste für morgen', when: '5 Min. vor dem Schlafen aufschreiben', ask: 'To-do-Liste für morgen geschrieben?' },
  { id: 'meditation', n: 'Meditation 13 Min.', when: 'am besten morgens, Garmin hakt ab ab 12 Min.', ask: 'Heute 13 Min. meditiert?', timer: 13 },
  { id: 'atem', n: 'Atemübung 5 Min.', when: 'zyklisches Seufzen, z. B. am Nachmittag', ask: 'Atemübung gemacht?', timer: 5 },
  { id: 'gehen_essen', n: '10 Min. gehen nach dem Essen', when: 'nach Mittag- oder Abendessen, Garmin-Spaziergang zählt', ask: 'Nach dem Essen gegangen?' },
  { id: 'schritte', n: 'Schritte', when: 'laut Garmin, hakt sich selbst ab' },
  { id: 'kein_kalt', n: 'Kein Kältebad nach dem Krafttraining', when: 'frühestens 6 Std. danach – oder vorher' },
  { id: 'handy', n: 'Handy bewusst nutzen', when: 'Social Media und Bildschirmzeit unter deinem Limit' },
);
{ const n = HABITS.find((h) => h.id === 'nsdr'); if (n) { n.n = 'NSDR / Yoga Nidra'; n.when = '10–20 Min., auch zum Ausgleich nach kurzer Nacht'; n.ask = 'NSDR gemacht?'; } }
/* Garmin: Meditation ab 12 Min. → Meditation, Atemübung ab 5 Min. → Atemübung, Spaziergang nach dem Essen */
{
  const i = GAR_HABITS.findIndex((h) => h.id === 'nsdr');
  if (i >= 0) GAR_HABITS.splice(i, 1, { id: 'meditation', test: (a) => /meditation/.test(a.tk) && (a.dur || 0) >= 12 }, { id: 'atem', test: (a) => /breath/.test(a.tk) && (a.dur || 0) >= 5 });
}
Object.assign(INFO, {
  warm_dusche: { was: 'Warm duschen oder baden (40–42,5 °C, mindestens 10 Min.) 1–2 Std. vor dem Schlafen.', wofuer: 'Die Wärme weitet die Gefäße in Händen und Füßen; danach gibt der Körper Wärme ab und die Kerntemperatur sinkt schneller – das Signal zum Einschlafen.', studien: 'Meta-Analyse Haghayegh 2019 (17 Studien): schneller eingeschlafen und bessere Schlafqualität, am besten 1–2 Std. vor dem Schlafen (mittel bis stark belegt). Eine Sauna am Abend wirkt ähnlich.', huberman: 'Protokoll 5: Körperkerntemperatur nachts senken.' },
  todo_morgen: { was: '5 Min. vor dem Schlafen aufschreiben, was morgen ansteht.', wofuer: 'Offene Aufgaben halten den Kopf wach. Aufgeschrieben müssen sie nicht mehr „gehalten“ werden.', studien: 'Scullin 2018 (57 junge Erwachsene, Schlaflabor): Wer eine To-do-Liste schrieb, schlief rund 9 Min. schneller ein als mit einer Liste erledigter Aufgaben – je ausführlicher, desto schneller (mittel belegt, eine Studie).' },
  meditation: { was: '13 Min. geführte oder stille Meditation, am besten zur gleichen Zeit.', wofuer: 'Aufmerksamkeit, Stimmung, Stress.', studien: 'Basso 2019: 13 Min. täglich über 8 Wochen verbesserten Aufmerksamkeit, Arbeitsgedächtnis und Stimmung; nach 4 Wochen noch nicht (mittel belegt). Darum zählt die Regelmäßigkeit.', zaehlung: 'Eine Meditation auf der Garmin-Uhr ab 12 Min. hakt sich selbst ab.' },
  atem: { was: '„Zyklisches Seufzen“: zweimal durch die Nase einatmen (das zweite Mal kurz nachziehen), dann lang durch den Mund ausatmen. 5 Min.', wofuer: 'Beruhigt schnell, senkt die Atemfrequenz.', studien: 'Balban 2023 (RCT, rund 110 Personen, 1 Monat): besser für die Stimmung als Achtsamkeitsmeditation (mittel belegt).', zaehlung: 'Eine Atemübung auf der Garmin-Uhr ab 5 Min. hakt sich selbst ab.' },
  gehen_essen: { was: '10 Min. locker gehen direkt nach einer Mahlzeit.', wofuer: 'Die Muskeln nehmen Zucker auf, der Blutzucker steigt weniger stark an.', studien: 'Buffey 2022 (Meta-Analyse): leichtes Gehen nach dem Essen senkt den Blutzuckeranstieg deutlich stärker als Sitzen oder Stehen (mittel bis stark für den kurzfristigen Effekt).', zaehlung: 'Ein Garmin-Spaziergang ab 8 Min., der bis 90 Min. nach Mittag- oder Abendessen startet, zählt automatisch.' },
  schritte: { was: 'Tägliche Schritte laut Garmin.', studien: 'Paluch 2022 (15 Kohorten, Lancet Public Health): bei unter 60-Jährigen sinkt das Sterberisiko bis etwa 8.000–10.000 Schritte pro Tag, darüber kaum noch (stark belegt, Beobachtung).', zaehlung: 'Hakt sich ab, sobald Garmin dein Schrittziel meldet. Ziel unter Einstellungen → Gewohnheiten.' },
  kein_kalt: { was: 'Kein Kältebad oder Eisbad in den ersten 6 Std. nach dem Krafttraining. Vorher oder an Tagen ohne Krafttraining ist es okay.', wofuer: 'Kälte direkt nach dem Training dämpft die Entzündungs- und Anpassungssignale, die den Muskelaufbau anstoßen.', studien: 'Piñero 2024 (Meta-Analyse, 8 Studien): Kältebäder nach dem Krafttraining bremsen den Muskelzuwachs (mittel belegt). Einen genau belegten Mindestabstand gibt es nicht; 6 Std. sind eine vorsichtige Regel, Huberman nennt 4–6 Std.', zaehlung: 'Kältebad unter Training & Sauna eintragen. An Krafttagen hakt sich die Gewohnheit abends selbst ab, wenn kein Kältebad im Abstand lag.' },
  handy: { was: 'Social Media und Bildschirmzeit unter deinem Limit; das Handy nur bewusst und produktiv nutzen.', wofuer: 'Weniger Ablenkung, mehr Fokus, bessere Abende und besserer Schlaf.', zaehlung: 'Abends Bildschirmzeit und Social-Media-Minuten aus iPhone-Einstellungen → Bildschirmzeit eintragen (die App kann sie nicht selbst lesen). Tipp: Für Social-Media-Apps in iOS ein App-Limit setzen.' },
});
const ROUTINE_DEFAULT = {
  am: ['r_wasser', 'licht_morgen', 'block:morgen', 'skin:pflege_am', 'meditation', 'caf_start', 'knee:mob'],
  day: ['atem', 'gehen_essen', 'schritte', 'kein_kalt', 'sauna_woche', 'licht_nachmittag'],
  pm: ['mahlzeit', 'warm_dusche', 'block:schlaf', 'skin:pflege_pm', 'handy', 'todo_morgen', 'bildschirm', 'dimmen'],
  custom: [{ id: 'r_wasser', n: 'Großes Glas Wasser (Prise Salz)' }],
};
const ROUTINE_PARTS = [['am', 'Morgenroutine', 'sunrise'], ['day', 'Tagsüber', 'sun'], ['pm', 'Abendroutine', 'moon']];
function rtCfg() {
  const r = S.settings.routines;
  if (!r || !Array.isArray(r.am)) { S.settings.routines = clone(ROUTINE_DEFAULT); markDirty('settings'); }
  return S.settings.routines;
}
function phoneCfg() { return { social: 30, total: 180, ...(S.settings.phone || {}) }; }
function stepsGoal() { return Number(S.settings.stepsGoal) || 8000; }
function weekSauna(k) { return weekKeys(weekStart(k)).filter((x) => x <= k).reduce((a, x) => a + saunaMin(peekDay(x)), 0); }
/* Krafttraining und Kältebad */
function strengthEnd(d) {
  let end = null;
  for (const t of (d && d.trainings) || []) {
    const tt = trainType(t);
    if (!(tt.gym || ['Gym (frei)', 'Push', 'Pull', 'Beine'].includes(tt.id))) continue;
    const s = timeToMin(t.time);
    if (s == null) continue;
    const e = s + (Number(t.dur) || 60);
    if (end == null || e > end) end = e;
  }
  return end;
}
function coldFree(k) { const e = strengthEnd(peekDay(k)); return e == null ? null : e + 360; }
function coldViolations(k) {
  const d = peekDay(k), e = strengthEnd(d);
  if (e == null) return [];
  return ((d && d.cold) || []).filter((c) => { const t = timeToMin(c.t); return t != null && t >= e - 15 && t < e + 360; });
}
function coldUser() { for (let i = 0; i < 30; i++) { const d = peekDay(addDays(todayKey(), -i)); if (d && d.cold && d.cold.length) return true; } return false; }
/* Spaziergang nach dem Essen (Mittag/Abend, bis 90 Min. danach) */
function walkAfterMeal(k) {
  const d = peekDay(k);
  if (!d) return false;
  const meals = ['mittag', 'abend'].map((id) => S.settings.plan.find((b) => b.id === id)).filter(Boolean).map((b) => resolveBlockTime(b, d)).filter((t) => t != null);
  for (const e of d.entries || []) if (e.t && (e.meal === 'mittag' || e.meal === 'abend')) { const dt = new Date(e.t); if (dkey(dt) === k) meals.push(dt.getHours() * 60 + dt.getMinutes()); }
  return (d.trainings || []).some((t) => t.type === 'Spaziergang' && (Number(t.dur) || 0) >= 8 && t.time && meals.some((m) => { const s = timeToMin(t.time); return s >= m - 10 && s <= m + 90; }));
}
/* Automatisch abhaken (Schritte, Gehen nach dem Essen, Kältebad-Regel, Handy) – Abgewähltes bleibt abgewählt */
function autoHabits(k = todayKey()) {
  const d0 = peekDay(k);
  if (!d0) return;
  const off = S.settings.habitsOff || [], no = (d0.ghOff || []).concat(Object.keys(d0.hno || {}));
  const want = {};
  if (!off.includes('schritte') && d0.health && Number(d0.health.steps) >= stepsGoal()) want.schritte = true;
  if (!off.includes('gehen_essen') && walkAfterMeal(k)) want.gehen_essen = true;
  if (!off.includes('kein_kalt')) {
    const free = coldFree(k);
    if (free != null) { const v = coldViolations(k); if (v.length) want.kein_kalt = false; else if (k < todayKey() || nowMin() >= free) want.kein_kalt = true; }
  }
  if (!off.includes('handy') && d0.hd && d0.hd.screen != null) { const c = phoneCfg(); want.handy = Number(d0.hd.social || 0) <= c.social && Number(d0.hd.screen) <= c.total; }
  const ch = Object.entries(want).filter(([id, v]) => !(v && no.includes(id)) && !!d0.habits[id] !== v);
  if (!ch.length) return;
  mutDay(k, (d) => { for (const [id, v] of ch) { if (v) { d.habits[id] = true; d.ha = { ...(d.ha || {}), [id]: 1 }; } else { delete d.habits[id]; if (d.ha) delete d.ha[id]; } } });
}

/* ---------- Schritte einer Routine ---------- */
/* Posten eines Blocks für die Routine: die festen; hat der Block nur optionale (z. B. Magnesium), dann diese */
function rtBlockItems(b, variant) { const inV = b.items.filter((it) => itemInVariant(it, variant)); const fix = inV.filter((it) => !it.opt); return fix.length ? fix : inV; }
function rtStep(id, k) {
  const d = getDay(k), r = rhythm(k), variant = dayVariant(k);
  const hb = HABITS.find((h) => h.id === id);
  if (id === 'caf_start') { const st = cafStart(k); return { id, n: `Koffein frühestens ${minToTime(st)}`, sub: '90 Min. nach dem Aufwachen', t: st, info: true, done: k < todayKey() || (k === todayKey() && nowMin() >= st) }; }
  if (id === 'sauna_woche') { const g = S.settings.sauna.goal, v = weekSauna(k); return { id, n: `Sauna ${fmt(v)}/${fmt(g)} Min. diese Woche`, sub: 'Wochenziel, nach dem Training', go: 'train', done: v >= g, part: v > 0 && v < g }; }
  if (id === 'knee:mob') { const dd = dayDone(k); return { id, n: 'Mobility (tägliche Routine)', sub: 'Knie & Mobility', go: 'knie', done: !!dd.mob }; }
  if (id.startsWith('block:')) {
    const b = S.settings.plan.find((x) => x.id === id.slice(6));
    if (!b) return null;
    const its = rtBlockItems(b, variant);
    if (!its.length) return null;
    const done = its.filter((it) => d.checks[it.id]).length;
    return { id, n: b.n, sub: its.map((it) => itemLabel(it, d)).slice(0, 4).join(', ') + (its.length > 4 ? ' …' : ''), t: resolveBlockTime(b, d), done: done === its.length, part: done > 0 && done < its.length, cnt: `${done}/${its.length}` };
  }
  if (id.startsWith('skin:')) { const sr = (S.settings.skin.routine || []).find((x) => x.id === id.slice(5)); if (!sr) return null; return { id, n: sr.n, sub: 'Haut-Protokoll', done: !!(d.skin && d.skin[sr.id]) }; }
  const cu = (rtCfg().custom || []).find((x) => x.id === id);
  if (cu) return { id, n: cu.n, sub: '', done: !!(d.rt && d.rt[id]) };
  if (!hb || (S.settings.habitsOff || []).includes(id)) return null;
  const T = { licht_morgen: r.wake + 15, meditation: r.wake + 45, mahlzeit: r.bed - 150, warm_dusche: r.bed - 105, handy: r.bed - 75, dimmen: r.bed - 90, bildschirm: r.bed - 60, todo_morgen: r.bed - 30, atem: 16 * 60 };
  const s = { id, n: habitName(hb, k), sub: habitWhen(hb, k), t: T[id] ?? null, done: !!d.habits[id], no: !!(d.hno && d.hno[id]), auto: !!(d.ha && d.ha[id]) || !!(d.gh && d.gh[id]), timer: hb.timer };
  if (id === 'schritte') { const st = d.health && d.health.steps; s.n = `Schritte ${fmt(stepsGoal())}+`; s.sub = st != null ? `${fmt(st)} laut Garmin` : 'laut Garmin'; s.auto = true; }
  if (id === 'kein_kalt') { const free = coldFree(k); if (free == null) return null; const v = coldViolations(k); s.sub = v.length ? `Kältebad um ${v.map((c) => c.t).join(', ')} – zu früh nach dem Training` : `Kältebad frühestens ab ${minToTime(free % 1440)}`; s.no = v.length > 0; s.auto = true; }
  if (id === 'handy') { const c = phoneCfg(); s.sub = d.hd && d.hd.screen != null ? `Bildschirmzeit ${fmtDur(d.hd.screen)}, Social Media ${fmt(d.hd.social || 0)} Min. (Limit ${fmtDur(c.total)} / ${fmt(c.social)} Min.)` : `Abends eintragen · Limit Social Media ${fmt(c.social)} Min.`; s.ask = 'handy'; }
  if (id === 'warm_dusche') s.sub = `zwischen ${minToTime(r.bed - 120)} und ${minToTime(r.bed - 60)}, 40–42 °C, mind. 10 Min.`;
  return s;
}
function routineSteps(part, k) { return (rtCfg()[part] || []).map((id) => rtStep(id, k)).filter(Boolean); }
function routineCard(k = todayKey()) {
  const now = k === todayKey() ? nowMin() : 0, r = rhythm(k);
  const cur = now < r.wake + 240 ? 'am' : now < r.bed - 180 ? 'day' : 'pm';
  let h = '<section class="card routine-card" id="routinen"><div class="sec-head"><h2>Routinen</h2><button class="link-btn" data-a="goto-set" data-id="routinen">Anpassen</button></div>';
  for (const [part, n, ic] of ROUTINE_PARTS) {
    const steps = routineSteps(part, k);
    if (!steps.length) continue;
    const real = steps.filter((s) => !s.info), done = real.filter((s) => s.done).length;
    const open = ui.exp.has('rt:' + part) || (!ui.exp.has('rtc:' + part) && part === cur);
    h += `<div class="rt-part${open ? ' is-open' : ''}"><button class="rt-head" data-a="rt-toggle" data-part="${part}" aria-expanded="${open}">${icon(ic)}<b>${esc(n)}</b><span class="rt-cnt${done === real.length ? ' is-ok' : ''}">${done}/${real.length}</span>${icon(open ? 'chevron-up' : 'chevron-down')}</button>`;
    if (open) h += `<div class="rt-steps">${steps.map((s) => rtRow(s, k)).join('')}</div>`;
    h += '</div>';
  }
  return h + '</section>';
}
function rtRow(s, k) {
  const cls = s.done ? ' is-on' : s.no ? ' is-no' : s.part ? ' is-part' : '';
  const time = s.t != null ? `<span class="rt-t">${minToTime(((s.t % 1440) + 1440) % 1440)}</span>` : '';
  const side = s.cnt ? `<span class="rt-t">${s.cnt}</span>` : '';
  const extra = s.timer && !s.done ? `<button class="pill-btn sm" data-a="hab-timer" data-id="${s.id}" data-date="${k}">${icon('play')}${s.timer} Min.</button>` : '';
  if (s.info) return `<div class="rt-row is-info${s.done ? ' is-on' : ''}"><span class="rt-dot">${icon('clock')}</span><span class="rt-txt"><b>${esc(s.n)}</b><small>${esc(s.sub)}</small></span></div>`;
  return `<div class="rt-row${cls}"><button class="rt-hit" data-a="rt-step" data-id="${esc(s.id)}" data-date="${k}" aria-pressed="${!!s.done}"><span class="tgl-box">${icon(s.no ? 'x' : 'check')}</span><span class="rt-txt"><b>${esc(s.n)}${s.auto && s.done ? ` <span class="gar-mark" aria-label="automatisch">${icon('watch')}</span>` : ''}</b>${s.sub ? `<small>${esc(s.sub)}</small>` : ''}</span>${time}${side}</button>${extra}</div>`;
}
/* Ja/Nein-Abfrage (aus einer Mitteilung oder aus der Routine) */
function sheetHabitAsk(id, k = todayKey()) {
  if (id === 'handy') { sheetHandy(k); return; }
  const hb = HABITS.find((h) => h.id === id);
  if (!hb) return;
  ui.sheet = { type: 'habit-ask', id, k };
  openSheet(`<h3 class="sheet-title">${esc(hb.ask || hb.n + '?')}</h3><p class="hint">${esc(habitWhen(hb, k))}</p>
    <div class="sheet-acts"><button class="btn is-accent" data-a="hab-yes">${icon('check')}Gemacht</button><button class="btn" data-a="hab-no">${icon('x')}Nicht gemacht</button>${hb.timer ? `<button class="btn" data-a="hab-timer" data-id="${id}" data-date="${k}">${icon('play')}Jetzt starten (${hb.timer} Min.)</button>` : ''}<button class="btn is-ghost" data-a="sheet-close">Später</button></div>`);
}
function setHabit(k, id, v) {
  mutDay(k, (d) => {
    d.hno = d.hno || {};
    if (v === true) { d.habits[id] = true; delete d.hno[id]; }
    else if (v === false) { delete d.habits[id]; d.hno[id] = true; if (d.gh && d.gh[id]) { delete d.gh[id]; d.ghOff = [...new Set([...(d.ghOff || []), id])]; } }
    else { delete d.habits[id]; delete d.hno[id]; }
  });
}
function sheetHandy(k = todayKey()) {
  const d = getDay(k), c = phoneCfg();
  ui.sheet = { type: 'handy', k };
  openSheet(`<h3 class="sheet-title">Bildschirmzeit heute</h3>
    <p class="hint">iPhone: Einstellungen → Bildschirmzeit → „Alle Aktivitäten anzeigen“ → Tag. Social Media = Instagram, TikTok, YouTube & Co. zusammen.</p>
    <div class="form"><div class="frow is-wide"><span class="flabel">Bildschirmzeit</span><div class="fin"><input type="time" id="hd-screen" value="${durToTime(d.hd && d.hd.screen)}"><span class="unit">h:min</span></div></div>
    <div class="frow is-wide"><span class="flabel">Social Media</span><div class="fin inv-in"><input type="text" inputmode="numeric" id="hd-social" value="${d.hd && d.hd.social != null ? d.hd.social : ''}" placeholder="0"><span>Min.</span></div></div></div>
    <p class="hint">Limit: Bildschirmzeit ${fmtDur(c.total)}, Social Media ${fmt(c.social)} Min. (unter Einstellungen → Gewohnheiten). Tipp: In iOS unter Bildschirmzeit → App-Limits ein Limit für Social Media setzen – das bremst schon beim Öffnen.</p>
    <div class="sheet-acts"><button class="btn is-accent" data-a="handy-save">Speichern</button><button class="btn is-ghost" data-a="sheet-close">Später</button></div>`);
}
/* Einfacher Timer für Meditation und Atemübung (Gong am Anfang und Ende) */
function habTimer(id, k) {
  const hb = HABITS.find((h) => h.id === id);
  if (!hb || !hb.timer) return;
  const end = Date.now() + hb.timer * 60000;
  ui.sheet = { type: 'hab-timer', id, k, end };
  const tick = () => {
    const s = ui.sheet;
    if (!s || s.type !== 'hab-timer') return;
    const left = Math.max(0, Math.round((s.end - Date.now()) / 1000));
    const el = document.getElementById('ht-left');
    if (el) el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (left <= 0) { try { gong(); } catch (e) { /* egal */ } setHabit(s.k, s.id, true); closeSheet(); render(); toast(`${hb.n}: geschafft`); return; }
    setTimeout(tick, 500);
  };
  openSheet(`<h3 class="sheet-title">${esc(hb.n)}</h3>${id === 'atem' ? '<p class="hint">Zweimal durch die Nase einatmen (das zweite Mal kurz nachziehen), dann ganz lang durch den Mund ausatmen. Ruhig weiter so.</p>' : '<p class="hint">Aufrecht sitzen, Augen zu. Aufmerksamkeit auf den Atem; wenn die Gedanken wandern, freundlich zurückholen.</p>'}
    <div class="ht-clock" id="ht-left">${hb.timer}:00</div><div class="sheet-acts"><button class="btn is-ghost" data-a="sheet-close">Abbrechen</button></div>`);
  try { gong(); } catch (e) { /* egal */ }
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {}); } catch (e) { /* egal */ }
  setTimeout(tick, 500);
}
function gong() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ac = gong.ac || (gong.ac = new AC()), o = ac.createOscillator(), g = ac.createGain();
  o.frequency.value = 432; o.type = 'sine'; o.connect(g); g.connect(ac.destination);
  const t = ac.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
  o.start(t); o.stop(t + 2.6);
}
/* Mitteilungen für Gewohnheiten (in pushPlan eingehängt) */
function pushHabits(k, r, d, add, off, isT) {
  const ask = (id, min, title, body) => { if (!off(id) && !d.habits[id] && !(d.hno && d.hno[id])) add('habits', min, 'h-' + id.replace(/_/g, ''), title, body, '#hq-' + id.replace(/_/g, '-')); };
  const inR = (id, part) => (rtCfg()[part] || []).includes(id);
  if (inR('meditation', 'am')) ask('meditation', r.wake + 45, 'Meditation 13 Min.', 'Antippen, Timer starten oder abhaken. Regelmäßig zählt: 13 Min. täglich über 8 Wochen.');
  if (inR('atem', 'day')) ask('atem', 16 * 60, 'Atemübung 5 Min.', 'Zyklisches Seufzen: 2× durch die Nase ein, lang durch den Mund aus. Antippen startet den Timer.');
  ask('warm_dusche', r.bed - 120, 'Zeit für die warme Dusche', `In der nächsten Stunde, 40–42 °C, mind. 10 Min. – danach schläfst du schneller ein. Bett um ${minToTime(r.bed)}.`);
  if (!off('handy') && !(d.hd && d.hd.screen != null)) add('habits', r.bed - 75, 'handy', 'Bildschirmzeit heute?', `Kurz eintragen (Einstellungen → Bildschirmzeit). Limit Social Media ${fmt(phoneCfg().social)} Min.`, '#hq-handy');
  ask('todo_morgen', r.bed - 30, 'To-do-Liste für morgen', '5 Min. aufschreiben, was morgen ansteht – dann ist der Kopf frei zum Einschlafen.');
  const free = coldFree(k);
  if (free != null && !off('kein_kalt') && coldUser()) add('habits', free - 360 + 5, 'kalt', 'Kein Kältebad bis ' + minToTime(free % 1440), 'Kälte direkt nach dem Krafttraining bremst den Muskelaufbau. Sauna oder warm duschen ist okay.', '#train');
  const wd = weekday(k), g = S.settings.sauna.goal, sv = weekSauna(addDays(k, -1));
  if (inR('sauna_woche', 'day') && ((wd === 3 && sv < g / 2) || (wd === 5 && sv < g))) add('habits', 17 * 60, 'sauna', `Sauna: ${fmt(sv)}/${fmt(g)} Min. diese Woche`, wd === 5 ? `Heute oder morgen noch ${fmt(g - sv)} Min. – am besten nach dem Training.` : 'Halbzeit der Woche – plan die nächsten Gänge ein.', '#train');
}

Object.assign(A, {
  'rt-toggle': (el) => { const p = el.dataset.part, k1 = 'rt:' + p, k2 = 'rtc:' + p; const open = !!el.closest('.rt-part.is-open'); if (open) { ui.exp.delete(k1); ui.exp.add(k2); } else { ui.exp.add(k1); ui.exp.delete(k2); } render(); },
  'rt-step': (el) => {
    const id = el.dataset.id, k = curDate(el), s = rtStep(id, k);
    if (!s) return;
    if (s.go) { go(s.go, { date: k }); return; }
    if (s.ask === 'handy') { sheetHandy(k); return; }
    if (id.startsWith('block:')) {
      const b = S.settings.plan.find((x) => x.id === id.slice(6)), d = getDay(k), variant = dayVariant(k);
      const its = rtBlockItems(b, variant);
      const all = its.every((it) => d.checks[it.id]);
      mutDay(k, (dd) => { for (const it of its) { if (all) { delete dd.checks[it.id]; if (dd.ct) delete dd.ct[it.id]; } else if (!dd.checks[it.id]) { dd.checks[it.id] = 1; persistRotation(dd, it); if (k === todayKey()) { dd.ct = dd.ct || {}; dd.ct[it.id] = minToTime(nowMin()); } } } syncCafHabit(k); });
      render(); return;
    }
    if (id.startsWith('skin:')) { mutDay(k, (d) => { d.skin = d.skin || {}; const x = id.slice(5); if (d.skin[x]) delete d.skin[x]; else d.skin[x] = true; }); render(); return; }
    if ((rtCfg().custom || []).some((x) => x.id === id)) { mutDay(k, (d) => { d.rt = d.rt || {}; if (d.rt[id]) delete d.rt[id]; else d.rt[id] = true; }); render(); return; }
    if (id === 'kein_kalt' || id === 'schritte') { go(id === 'kein_kalt' ? 'train' : 'garmin', { date: k }); return; }
    setHabit(k, id, s.done ? null : true); render();
  },
  'hab-yes': () => { const s = ui.sheet; if (!s) return; setHabit(s.k, s.id, true); closeSheet(); render(); toast('Abgehakt'); },
  'hab-no': () => { const s = ui.sheet; if (!s) return; setHabit(s.k, s.id, false); closeSheet(); render(); toast('Notiert – morgen wieder'); },
  'hab-timer': (el) => { closeSheet(); habTimer(el.dataset.id, curDate(el)); },
  'handy-save': () => {
    const s = ui.sheet; if (!s) return;
    const scr = timeToMin(($('#hd-screen') || {}).value || ''), soc = parseNum(($('#hd-social') || {}).value || '');
    if (scr == null) { toast('Bitte die Bildschirmzeit eintragen'); return; }
    mutDay(s.k, (d) => { d.hd = d.hd || {}; d.hd.screen = scr; d.hd.social = soc != null && soc >= 0 ? Math.round(soc) : 0; });
    autoHabits(s.k); closeSheet(); render();
    const c = phoneCfg(), d = getDay(s.k);
    toast(d.habits.handy ? 'Unter deinem Limit – stark.' : `Über dem Limit (${fmt(c.social)} Min. Social Media / ${fmtDur(c.total)}). Morgen ein App-Limit setzen?`);
  },
  'cold-add': (el) => { const k = curDate(el), m = Number(el.dataset.v), t = k === todayKey() ? minToTime(nowMin()) : '12:00'; mutDay(k, (d) => { d.cold = d.cold || []; d.cold.push({ min: m, t }); }); autoHabits(k); render(); const v = coldViolations(k); toast(v.length ? `Kältebad notiert – zu kurz nach dem Krafttraining (frühestens ${minToTime(coldFree(k) % 1440)})` : `Kältebad ${m} Min. notiert`); },
  'cold-del': (el) => { const k = curDate(el); mutDay(k, (d) => { d.cold = (d.cold || []).filter((_, i) => i !== Number(el.dataset.i)); }); autoHabits(k); render(); },
  'rt-move': (el) => { const R = rtCfg(), p = el.dataset.part, i = Number(el.dataset.i), j = i + Number(el.dataset.d); const a = R[p]; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; saveSettings(); },
  'rt-del': (el) => { const R = rtCfg(), p = el.dataset.part; R[p].splice(Number(el.dataset.i), 1); saveSettings(); },
  'rt-add': (el) => {
    const R = rtCfg(), p = el.dataset.part, sel = $('#rt-add-' + p), txt = $('#rt-new-' + p);
    let id = sel && sel.value;
    const name = txt && txt.value.trim();
    if (name) { id = 'r_' + uid(); R.custom = R.custom || []; R.custom.push({ id, n: name }); }
    if (!id) { toast('Schritt wählen oder Text eingeben'); return; }
    if (R[p].includes(id)) { toast('Schon in der Routine'); return; }
    R[p].push(id); saveSettings();
  },
  'rt-reset': () => { S.settings.routines = clone(ROUTINE_DEFAULT); saveSettings(); toast('Routinen zurückgesetzt'); },
  'phone-cfg': (el) => { const v = parseNum(el.value); if (v == null || v < 0) return; S.settings.phone = { ...phoneCfg(), [el.dataset.f]: el.dataset.f === 'total' ? Math.round(v * 60) : Math.round(v) }; saveSettings(false); flashSaved(el); },
  'steps-goal': (el) => { const v = parseNum(el.value); if (v == null || v < 1000 || v > 40000) { toast('Schrittziel zwischen 1.000 und 40.000'); return; } S.settings.stepsGoal = Math.round(v); saveSettings(false); flashSaved(el); },
});
/* Einstellungen → Routinen & Gewohnheiten */
function setRoutinesHTML() {
  const R = rtCfg();
  const label = (id) => { const s = rtStep(id, todayKey()); if (s) return s.n; const hb = HABITS.find((h) => h.id === id); return hb ? hb.n : id; };
  const catalog = ['caf_start', 'knee:mob', 'sauna_woche', ...S.settings.plan.filter((b) => b.items.length).map((b) => 'block:' + b.id), ...(S.settings.skin.routine || []).map((x) => 'skin:' + x.id), ...HABITS.map((h) => h.id), ...(R.custom || []).map((x) => x.id)];
  let h = '';
  for (const [part, n] of ROUTINE_PARTS) {
    const ids = R[part] || [];
    h += `<h5>${esc(n)}</h5><div class="list rt-edit">${ids.map((id, i) => `<div class="rt-erow"><span>${esc(label(id))}</span><button class="icon-btn sm ghost" data-a="rt-move" data-part="${part}" data-i="${i}" data-d="-1" aria-label="Nach oben">${icon('chevron-up')}</button><button class="icon-btn sm ghost" data-a="rt-move" data-part="${part}" data-i="${i}" data-d="1" aria-label="Nach unten">${icon('chevron-down')}</button><button class="icon-btn sm ghost" data-a="rt-del" data-part="${part}" data-i="${i}" aria-label="Entfernen">${icon('x')}</button></div>`).join('')}</div>
      <div class="rt-addrow"><label class="choice-select sm">${icon('chevron-down')}<select id="rt-add-${part}"><option value="">Schritt hinzufügen …</option>${[...new Set(catalog)].filter((id) => !ids.includes(id)).map((id) => `<option value="${esc(id)}">${esc(label(id))}</option>`).join('')}</select></label><input type="text" id="rt-new-${part}" placeholder="oder eigener Schritt"><button class="icon-btn" data-a="rt-add" data-part="${part}" aria-label="Hinzufügen">${icon('plus')}</button></div>`;
  }
  const c = phoneCfg();
  h += `<h5>Limits</h5><div class="form"><div class="frow"><span class="flabel">Social Media pro Tag</span><div class="fin"><input type="text" inputmode="numeric" data-c="phone-cfg" data-f="social" value="${c.social}"><span class="unit">Min.</span></div></div>
    <div class="frow"><span class="flabel">Bildschirmzeit pro Tag</span><div class="fin"><input type="text" inputmode="decimal" data-c="phone-cfg" data-f="total" value="${numIn(c.total / 60, 1)}"><span class="unit">Std.</span></div></div>
    <div class="frow"><span class="flabel">Schrittziel</span><div class="fin"><input type="text" inputmode="numeric" data-c="steps-goal" value="${stepsGoal()}"><span class="unit">Schritte</span></div></div></div>
    <p class="hint">Gewohnheiten ganz ausblenden kannst du unter „Gewohnheiten“. Mitteilungen dazu unter Einstellungen → Mitteilungen → „Gewohnheiten & Routinen“.</p>
    <button class="btn is-ghost" data-a="rt-reset">Routinen auf Vorschlag zurücksetzen</button>`;
  return h;
}
Object.assign(C, { 'phone-cfg': (el) => A['phone-cfg'](el), 'steps-goal': (el) => A['steps-goal'](el) });
