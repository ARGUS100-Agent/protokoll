/* ============================================================
   MORGEN-CHECK (seit 2.14.0, Wunsch vom 16.11.2026)
   Abends musst du nichts mehr abhaken – im Dunkeln mit Bildschirm aus geht das ohnehin schlecht.
   Morgens fragt die App kurz ab, was gestern Abend geklappt hat (die Schritte der Abendroutine,
   Ja/Nein oder „Alles ja“), dazu Knie-Schmerz 0–10, Hautbild 1–10 und das Gewicht.
   Eine Mitteilung nach dem Aufwachen öffnet den Check. Abends kommt nur noch eine Erinnerung.
   ============================================================ */
/*icons: sunrise check x scale moon*/
function mcCfg() { return { on: true, weight: 'daily', ...(S.settings.mcheck || {}) }; }
function mcOn() { return mcCfg().on !== false; }
/* Kürzere, klare Fragen für die Schritte der Abendroutine */
const MC_ASK = {
  'skin:pflege_pm': 'Hautpflege (Zeniac + Physiogel)',
  bildschirm: 'Bildschirm mind. 30 Min. vor dem Schlafen aus',
  mahlzeit: 'Letzte große Mahlzeit mind. 2 Std. vorher',
  warm_dusche: 'Warm geduscht',
  dimmen: 'Licht gedimmt',
  todo_morgen: 'To-do-Liste für heute geschrieben',
  nsdr: 'NSDR / Yoga Nidra',
  alkohol: 'Kein Alkohol am Abend',
};
/* Abendschritte des Vortags, die sich als Ja/Nein abfragen lassen (Bildschirmzeit braucht Zahlen → bleibt in der Routine) */
function mcEve(k) {
  const y = addDays(k, -1), d = getDay(y), mc = d.mc || {};
  return (rtCfg().pm || []).filter((id) => id !== 'handy' && !id.startsWith('bp_')).map((id) => {
    const s = rtStep(id, y);
    if (!s || s.info) return null;
    const ans = id in mc ? !!mc[id] : s.done ? true : s.no ? false : null;
    // Plan-Blöcke: deren Posten nennen (z. B. „Magnesium vor dem Schlafen“)
    const n = MC_ASK[id] || (id.startsWith('block:') ? `${s.sub.replace(/\s*\(.*?\)/g, '')} (${s.n})` : s.n);
    return { id, n, ans };
  }).filter(Boolean);
}
function mcWeighDay(k) { return mcCfg().weight === 'daily' || [0, 2, 4].includes(weekday(k)); }
function mcState(k = todayKey()) {
  const d = getDay(k), skip = d.mcSkip || {};
  const eve = mcEve(k);
  const knee = !!(kneeCfg().start && kneeWeek(k) >= 1);
  const skin = !!skinPhase(k);
  const weigh = mcWeighDay(k);
  const caf = mcCafAsk(k), food = mcFoodAsk(k);
  const parts = {
    eve: eve.every((x) => x.ans != null),
    caf: !caf,
    food: !food,
    knee: !knee || kneeAm(k) != null,
    skin: !skin || (d.skin && d.skin.score != null),
    weight: !weigh || (d.health && d.health.weight != null) || !!skip.weight,
    mood: !!(d.mood && d.mood.wellbeing != null && d.mood.energy != null) || !!skip.mood,
  };
  return { eve, caf, food, knee, skin, weigh, parts, done: Object.values(parts).every(Boolean), open: Object.values(parts).filter((v) => !v).length };
}
/* Seit 2.15: Koffein von gestern, wenn nichts eingetragen ist (rettet das Experiment „1 statt 2 Monster“) */
function mcCafAsk(k) {
  const y = addDays(k, -1), yd = peekDay(y);
  if (!yd || (yd.caf || []).length || yd.cafMc != null) return null;
  const uses = rangeKeys(14, addDays(y, -1)).some((x) => ((peekDay(x) || {}).caf || []).length);
  const e = expCur();
  return uses || (e && e.id === 'caf_dose') ? { y, exp: !!(e && e.id === 'caf_dose') } : null;
}
/* Seit 2.15: Essen gestern auffällig wenig (unter 60 % des Medians) → nachtragen, „passt so“ oder „unvollständig“ */
function mcFoodAsk(k) {
  const y = addDays(k, -1), yd = peekDay(y);
  if (!yd || yd.foodOk || yd.incomplete) return null;
  const prev = rangeKeys(21, addDays(y, -1)).map((x) => dayIntake(x)).filter((v) => v != null && v > 0).sort((a, b) => a - b);
  if (prev.length < 5) return null;
  const med = prev[Math.floor(prev.length / 2)], v = dayIntake(y);
  if (v != null && v >= med * 0.6) return null;
  if (v == null && !rangeKeys(3, addDays(y, -1)).some((x) => dayIntake(x) != null)) return null;
  return { y, v: v || 0, med };
}
/* Seit 2.15: lernende Routine – wie oft zuletzt in Folge „Nein“ */
function mcNoStreak(id, k) {
  let n = 0;
  for (let i = 1; i <= 14; i++) {
    const d = peekDay(addDays(k, -i)), mc = d && d.mc;
    if (!mc || !(id in mc)) { if (i === 1) continue; break; }
    if (mc[id] === 0) n++; else break;
  }
  return n;
}
function mcLearnAsk(k, eve) {
  const sn = mcCfg().snooze || {};
  return eve.map((x) => ({ ...x, no: mcNoStreak(x.id, k) })).filter((x) => x.no >= 3 && !(sn[x.id] && sn[x.id] >= k));
}
const MC_MOOD = [[2, 'mies'], [4, 'mäßig'], [6, 'okay'], [8, 'gut'], [10, 'top']];
function mcVisible(k = todayKey()) {
  if (!mcOn() || k !== todayKey()) return false;
  const r = rhythm(k), now = nowMin();
  return now >= Math.min(r.wake, 300) - 60 && now < r.bed - 180 && !mcState(k).done;
}
/* Einen Abendschritt für gestern setzen (true = ja, false = nein) */
function mcSet(k, id, v) {
  const y = addDays(k, -1);
  if (id.startsWith('skin:')) { const x = id.slice(5); mutDay(y, (d) => { d.skin = d.skin || {}; if (v) d.skin[x] = true; else delete d.skin[x]; }); }
  else if (id.startsWith('block:')) {
    const b = S.settings.plan.find((x) => x.id === id.slice(6));
    if (b) {
      const its = rtBlockItems(b, dayVariant(y)), t = resolveBlockTime(b, getDay(y));
      mutDay(y, (d) => { for (const it of its) { if (v) { if (!d.checks[it.id]) { d.checks[it.id] = 1; persistRotation(d, it); if (t != null) { d.ct = d.ct || {}; d.ct[it.id] = minToTime(t % 1440); } } } else { delete d.checks[it.id]; if (d.ct) delete d.ct[it.id]; } } });
    }
  } else if ((rtCfg().custom || []).some((x) => x.id === id)) mutDay(y, (d) => { d.rt = d.rt || {}; if (v) d.rt[id] = true; else delete d.rt[id]; });
  else if (HABITS.some((h) => h.id === id)) setHabit(y, id, v);
  mutDay(y, (d) => { d.mc = { ...(d.mc || {}), [id]: v ? 1 : 0 }; });
}
function mcCard(k = todayKey()) {
  if (!mcVisible(k)) return '';
  const st = mcState(k), d = getDay(k), kn = kneeDay(peekDay(k)), am = kneeAm(k), sc = d.skin && d.skin.score;
  const yes = (on) => (on === true ? ' is-on' : ''), no = (on) => (on === false ? ' is-on is-no' : '');
  const openEve = st.eve.filter((x) => x.ans == null).length;
  let h = `<section class="card mcheck" id="mcheck"><div class="sec-head"><h2>${icon('sunrise')} Morgen-Check</h2><span class="count">noch ${st.open} ${st.open === 1 ? 'Punkt' : 'Punkte'}</span></div>`;
  if (st.eve.length) {
    h += `<div class="mc-part"><div class="mc-head"><b>${icon('moon')} Gestern Abend</b>${openEve ? `<button class="pill-btn sm is-accent" data-a="mc-all" data-date="${k}">${icon('check')}Alles ja</button>` : ''}</div>`;
    h += st.eve.map((x) => `<div class="mc-row"><span>${esc(x.n)}</span><div class="mc-yn"><button class="chip chip-sm${yes(x.ans)}" data-a="mc-eve" data-id="${esc(x.id)}" data-v="1" data-date="${k}" aria-pressed="${x.ans === true}">Ja</button><button class="chip chip-sm${no(x.ans)}" data-a="mc-eve" data-id="${esc(x.id)}" data-v="0" data-date="${k}" aria-pressed="${x.ans === false}">Nein</button></div></div>`).join('');
    for (const x of mcLearnAsk(k, st.eve)) h += `<div class="mc-learn">${icon('lightbulb')}<span><b>${esc(x.n)}</b>: ${x.no}× in Folge „Nein“. Was passt besser?</span><div class="chips chips-tight"><button class="chip chip-xs" data-a="mc-learn" data-v="drop" data-id="${esc(x.id)}">Nicht mehr abfragen</button><button class="chip chip-xs" data-a="mc-learn" data-v="remind" data-id="${esc(x.id)}">Abends erinnern</button><button class="chip chip-xs" data-a="mc-learn" data-v="keep" data-id="${esc(x.id)}">Weiter fragen</button></div></div>`;
    h += '</div>';
  }
  if (st.caf) h += `<div class="mc-part"><div class="mc-head"><b>${icon('coffee')} Koffein gestern</b></div><p class="hint">Für gestern ist kein Koffein eingetragen.${st.caf.exp ? ' Zählt fürs Experiment „1 statt 2 Monster“.' : ''}</p><div class="chips chips-tight">${[0, 1, 2, 3].map((n) => `<button class="chip chip-sm" data-a="mc-caf" data-v="${n}" data-date="${k}">${n === 0 ? 'nichts' : n === 3 ? '3 Monster' : n + ' Monster'}</button>`).join('')}<button class="chip chip-sm" data-a="mc-caf-other" data-date="${k}">Anderes …</button></div></div>`;
  if (st.food) h += `<div class="mc-part"><div class="mc-head"><b>${icon('salad')} Essen gestern</b></div><p class="hint">${st.food.v ? `Nur ${fmt(st.food.v)} kcal erfasst (sonst um ${fmt(st.food.med)})` : 'Nichts eingetragen'} – fehlt etwas? Unvollständige Tage verfälschen deine Erhaltungskalorien.</p><div class="chips chips-tight"><button class="chip chip-sm is-accent" data-a="mc-food-add" data-date="${k}">Nachtragen</button><button class="chip chip-sm" data-a="mc-food" data-v="ok" data-date="${k}">Passt so</button><button class="chip chip-sm" data-a="mc-food" data-v="inc" data-date="${k}">Unvollständig</button></div></div>`;
  if (st.knee) {
    h += `<div class="mc-part knee-am"><div class="mc-head"><b>Knie heute Morgen</b>${am != null ? `<span class="count">${am}/10</span>` : ''}</div><p class="hint">0 = kein Schmerz, 10 = stärkster</p>${scale0('knee-am', am, k)}
      <div class="chips chips-tight flag-chips"><span class="hint">Bemerkt:</span>${KNEE_FLAGS.map((f) => `<button class="chip chip-xs${(kn.flags || []).includes(f) ? ' is-on is-red' : ''}" data-a="knee-flag" data-v="${esc(f)}" data-date="${k}">${esc(f)}</button>`).join('')}</div></div>`;
  }
  if (st.skin) h += `<div class="mc-part"><div class="mc-head"><b>Hautbild</b>${sc != null ? `<span class="count">${sc}/10</span>` : ''}</div><p class="hint">1 = sehr schlecht, 10 = sehr gut</p>${scale10('skin-score', sc, k)}</div>`;
  if (st.weigh) {
    const w = d.health && d.health.weight;
    h += `<div class="mc-part"><div class="mc-head"><b>${icon('scale')} Gewicht</b></div><div class="mc-w"><label class="mini-in"><input type="text" inputmode="decimal" data-c="health" data-k="weight" data-date="${k}" value="${numIn(w, 1)}" placeholder="–" aria-label="Gewicht in kg"><span>kg</span></label>${w == null && !(d.mcSkip || {}).weight ? `<button class="link-btn" data-a="mc-skip" data-f="weight" data-date="${k}">heute nicht gewogen</button>` : ''}</div><p class="hint">Morgens nach dem Klo, vor dem Essen. Täglich gewogen ergibt den genauesten Trend – daraus rechnet die App deine Erhaltungskalorien.</p></div>`;
  }
  if (!st.parts.mood) h += `<div class="mc-part"><div class="mc-head"><b>Wie geht's dir heute?</b><button class="link-btn" data-a="mc-skip" data-f="mood" data-date="${k}">überspringen</button></div>${[['wellbeing', 'Befinden'], ['energy', 'Energie']].map(([f, n]) => `<div class="mc-row is-stack"><span>${n}</span><div class="chips chips-tight">${MC_MOOD.map(([v, l]) => `<button class="chip chip-xs${d.mood && d.mood[f] === v ? ' is-on' : ''}" data-a="mood" data-f="${f}" data-v="${v}" data-date="${k}">${l}</button>`).join('')}</div></div>`).join('')}<p class="hint">Fließt in die Muster ein: Was hebt deine Energie, was drückt sie?</p></div>`;
  return h + '</section>';
}
function mcScroll() {
  go('heute', { scrollTop: true });
  setTimeout(() => { const el = document.getElementById('mcheck'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); else toast('Morgen-Check ist für heute erledigt'); }, 60);
}
/* Abends: eine Erinnerung statt Haken (wird in pushHabits genutzt) */
function mcEveReminder(k) {
  const y = k, focus = mcCfg().focus || [];
  const ids = (rtCfg().pm || []).slice().sort((a, b) => (focus.includes(b) ? 1 : 0) - (focus.includes(a) ? 1 : 0));
  const steps = ids.map((id) => rtStep(id, y)).filter((s) => s && !s.info && !s.done).map((s) => (focus.includes(s.id) ? '❗' : '') + (MC_ASK[s.id] || (s.id.startsWith('block:') ? s.sub.replace(/\s*\(.*?\)/g, '') : s.n)));
  if (!steps.length) return null;
  return steps.slice(0, 4).join(' · ');
}
function mcSetHTML() {
  const c = mcCfg();
  return `<h5>Morgen-Check</h5><button class="row-check${c.on ? ' is-on' : ''}" data-a="mc-toggle"><span class="tgl-box">${icon('check')}</span><span>Morgens die Abendroutine von gestern abfragen, dazu Knie, Hautbild und Gewicht (abends nichts abhaken)</span></button>
    ${c.on ? `<div class="frow is-wide"><span class="flabel">Gewicht</span><div class="chips chips-tight">${[['daily', 'täglich'], ['mwf', 'Mo, Mi, Fr']].map(([v, l]) => `<button class="chip chip-xs${c.weight === v ? ' is-on' : ''}" data-a="mc-weight" data-v="${v}">${l}</button>`).join('')}</div></div>` : ''}
    <p class="hint">Welche Punkte abgefragt werden, bestimmt die Abendroutine unten.</p>`;
}
Object.assign(A, {
  'mc-eve': (el) => { mcSet(curDate(el), el.dataset.id, el.dataset.v === '1'); render(); },
  'mc-all': (el) => { const k = curDate(el); for (const x of mcEve(k)) if (x.ans == null) mcSet(k, x.id, true); render(); toast('Gestern Abend: alles erledigt'); },
  'mc-skip': (el) => { const k = curDate(el); mutDay(k, (d) => { d.mcSkip = { ...(d.mcSkip || {}), [el.dataset.f]: true }; }); render(); },
  'mc-open': () => mcScroll(),
  'mc-toggle': () => { const c = S.settings.mcheck = { ...mcCfg() }; c.on = !c.on; saveSettings(); },
  'mc-weight': (el) => { const c = S.settings.mcheck = { ...mcCfg() }; c.weight = el.dataset.v; saveSettings(); },
  'mc-caf': (el) => {
    const k = curDate(el), y = addDays(k, -1), n = Number(el.dataset.v);
    const p = (S.settings.caf.presets || []).find((x) => x.id === 'monster_zero') || CAF_PRESETS.find((x) => x.id === 'monster_zero');
    mutDay(y, (d) => { d.cafMc = n; d.caf = d.caf || []; for (let i = 0; i < n; i++) d.caf.push({ id: uid(), p: p.id, n: p.n, mg: p.mg, ml: p.ml, kcal: p.kcal, sug: p.sug, t: null, mc: 1 }); });
    render(); toast(n ? `${n} × ${p.n} für gestern eingetragen (ohne Uhrzeit)` : 'Gestern ohne Koffein');
  },
  'mc-caf-other': (el) => { const y = addDays(curDate(el), -1); go('licht', { date: y, scrollTop: true }); toast('Koffein für gestern eintragen'); },
  'mc-food': (el) => { const y = addDays(curDate(el), -1); mutDay(y, (d) => { if (el.dataset.v === 'ok') d.foodOk = 1; else d.incomplete = 1; }); invalidate(); render(); toast(el.dataset.v === 'ok' ? 'Gestern zählt wie eingetragen' : 'Gestern zählt nicht für die Erhaltungskalorien'); },
  'mc-food-add': (el) => { const y = addDays(curDate(el), -1); go('ern', { date: y, scrollTop: true }); toast('Essen von gestern nachtragen'); },
  'mc-learn': (el) => {
    const id = el.dataset.id, v = el.dataset.v, c = S.settings.mcheck = { ...mcCfg() };
    c.snooze = { ...(c.snooze || {}), [id]: addDays(todayKey(), 14) };
    if (v === 'drop') { const R = rtCfg(); R.pm = (R.pm || []).filter((x) => x !== id); toast('Wird nicht mehr abgefragt – zurückholen unter Gewohnheiten → Abendroutine'); }
    else if (v === 'remind') { c.focus = [...new Set([...(c.focus || []), id])]; toast('Kommt abends zuerst in der Erinnerung'); }
    else toast('Okay, ich frage weiter');
    saveSettings();
  },
});
