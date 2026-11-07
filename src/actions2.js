/* ============================================================
   AKTIONEN Teil 2: neue Bereiche
   ============================================================ */
function saveStore(key, rerender = true) { markDirty(key); invalidate(); if (rerender) render(); }
function kneeMut(k, fn) { mutDay(k, (d) => { d.knee = d.knee || {}; fn(d.knee, d); }); }
function ensureRoutines() { const c = kneeCfg(); if (!c.routines) c.routines = clone(KNEE_ROUTINES); return c.routines; }
function curTraining() { const s = ui.gymSess; if (!s) return null; const d = getDay(s.k); return (d.trainings || []).find((x) => x.id === s.id) || null; }
function mutTraining(fn) { const s = ui.gymSess; mutDay(s.k, (d) => { const t = (d.trainings || []).find((x) => x.id === s.id); if (t) fn(t, d); }); }
function setSlotFromTraining(d, t) {
  if (!t.time || trainType(t).light) return null;
  const mt = mainTraining(d) || t;
  const slot = slotForTime(mt.time);
  if (slot && d.training !== slot) { d.training = slot; return slot; }
  return null;
}
function holdSteps(ex, sets, sec) {
  const rt = { items: [{ i: ex.id, sets: sets || ex.d.sets || 1, sec: sec || ex.d.sec, reps: ex.d.reps }] };
  return buildSteps(rt);
}

Object.assign(A, {
  /* Navigation */
  tab: (el) => {
    const t = el.dataset.tab;
    if (t === ui.tab) { if (t === 'train' && ui.gymSess) { ui.gymSess = null; render(); } window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (t === 'heute' || t === 'mehr') ui.date = todayKey();
    go(t);
  },
  goto: (el) => {
    const tab = el.dataset.tab, opts = {};
    if (el.dataset.sub) { if (tab === 'ern') opts.ernSub = el.dataset.sub; else ui.sub[tab] = el.dataset.sub; }
    if (ui.tab === 'heute' || ui.tab === 'mehr') opts.date = todayKey();
    if (tab === 'train') ui.gymSess = null;
    go(tab, { ...opts, scrollTop: true });
    if (el.dataset.anchor) requestAnimationFrame(() => { const t = document.getElementById(el.dataset.anchor); if (t) t.scrollIntoView({ block: 'start' }); });
  },
  'goto-set': (el) => { ui.setOpen = el.dataset.id; go('set', { scrollTop: true }); requestAnimationFrame(() => { const s = document.getElementById('set-' + el.dataset.id); if (s) s.scrollIntoView({ block: 'start' }); }); },
  sub: (el) => { if (el.dataset.area === 'ern') ui.ernSub = el.dataset.v; else ui.sub[el.dataset.area] = el.dataset.v; if (el.dataset.area === 'knie') ui.rtEdit = null; render(false); window.scrollTo(0, 0); },
  'heat-day': (el) => {
    if (el.dataset.date > todayKey()) return;
    const m = ui.heatMetric; ui.date = el.dataset.date;
    if (m === 'sleep') { ui.sub.garmin = 'eintragen'; go('garmin', { scrollTop: true }); }
    else if (m === 'skin') { ui.sub.haut = 'heute'; go('haut', { scrollTop: true }); }
    else if (m === 'habits') go('licht', { scrollTop: true });
    else if (m === 'supp') go('supp', { scrollTop: true });
    else go('ern', { ernSub: 'eval', scrollTop: true });
  },

  /* Knie-Morgen-Check */
  'knee-am': (el) => {
    const k = curDate(el), v = Number(el.dataset.v);
    kneeMut(k, (kn) => { if (kn.am === v) delete kn.am; else kn.am = v; });
    ui.kneeAmOpen = k;
    render();
    const am = kneeAm(k);
    if (am != null && am > 3) toast('Über 3/10: heute kein Lauf, Beintraining nur schmerzfrei');
  },
  'knee-flag': (el) => {
    const k = curDate(el), f = el.dataset.v;
    kneeMut(k, (kn) => { kn.flags = kn.flags || []; if (kn.flags.includes(f)) kn.flags = kn.flags.filter((x) => x !== f); else kn.flags.push(f); });
    render();
  },
  'knee-mob': (el) => { const k = curDate(el); kneeMut(k, (kn) => { kn.mob = !kn.mob; if (!kn.mob) delete kn.mob; }); render(); },
  'knee-phase-go': (el) => { kneeCfg().phase = Number(el.dataset.v); saveSettings(); toast(`${kneePhase().n} gestartet`); },
  'knee-phase-ext': () => { const c = kneeCfg(); c.ext = (c.ext || 0) + 1; saveSettings(); toast('Phase um eine Woche verlängert'); },
  'knee-longshort': () => { const c = kneeCfg(); c.longShort = !c.longShort; saveSettings(); },
  'knee-side': (el) => { kneeCfg().side = el.dataset.v; saveSettings(); },
  'knee-signal': (el) => { kneeCfg().signal = el.dataset.v; saveSettings(); if (el.dataset.v !== 'visual') { Sound.init(); sig('switch', el.dataset.v === 'voice' ? 'So klingt die Ansage' : ''); } },
  'knee-phase': (el) => { kneeCfg().phase = Number(el.dataset.v); saveSettings(); },
  'knee-band-add': () => { kneeCfg().bands.push({ n: 'Band', kg: null }); saveSettings(); },
  'knee-routines-reset': () => { kneeCfg().routines = null; saveSettings(); toast('Routinen zurückgesetzt'); },
  'knee-video-reset': () => { kneeCfg().video = {}; saveSettings(); toast('Video-Links zurückgesetzt'); },

  /* Routinen */
  'rt-open': (el) => { ui.rtOpen = ui.rtOpen === el.dataset.id ? null : el.dataset.id; render(); },
  'rt-edit': (el) => { ensureRoutines(); ui.rtEdit = el.dataset.id; render(false); window.scrollTo(0, 0); },
  'rt-edit-close': () => { ui.rtEdit = null; render(); },
  'rt-move': (el) => { const rt = ensureRoutines().find((r) => r.id === ui.rtEdit); const i = Number(el.dataset.i), j = i + Number(el.dataset.d); if (!rt || j < 0 || j >= rt.items.length) return; [rt.items[i], rt.items[j]] = [rt.items[j], rt.items[i]]; saveSettings(); },
  'rt-del': (el) => { const rt = ensureRoutines().find((r) => r.id === ui.rtEdit); if (!rt) return; rt.items.splice(Number(el.dataset.i), 1); saveSettings(); },
  'rt-add': () => sheetExPick(),
  'rt-pick': (el) => { const rt = ensureRoutines().find((r) => r.id === ui.rtEdit); if (!rt) return; rt.items.push({ i: el.dataset.id }); closeSheet(); saveSettings(); toast('Übung hinzugefügt'); },
  'rt-reset': () => { const def = KNEE_ROUTINES.find((r) => r.id === ui.rtEdit); const list = ensureRoutines(); const i = list.findIndex((r) => r.id === ui.rtEdit); if (def && i >= 0) list[i] = clone(def); saveSettings(); toast('Routine zurückgesetzt'); },
  'ex-show': (el) => { ui.exOpen = el.dataset.id; ui.exCat = ui.exArea = ui.exRoutine = null; ui.exQ = ''; ui.sub.knie = 'uebungen'; closeSheet(); go('knie', { scrollTop: true }); requestAnimationFrame(() => { const t = document.getElementById('ex-' + el.dataset.id); if (t) t.scrollIntoView({ block: 'start' }); }); },
  'ex-toggle': (el) => { ui.exOpen = ui.exOpen === el.dataset.id ? null : el.dataset.id; render(); },
  'ex-cat': (el) => { ui.exCat = el.dataset.v || null; render(); },
  'ex-area': (el) => { ui.exArea = el.dataset.v || null; render(); },
  'ex-routine': (el) => { ui.exRoutine = el.dataset.v || null; render(); },

  /* Timer */
  'timer-start': (el) => timerStart(el.dataset.r),
  'hold-timer': (el) => { const ex = exById(el.dataset.ex); if (!ex) return; timerStart(null, { steps: holdSteps(ex, Number(el.dataset.sets) || 1, Number(el.dataset.sec) || null), name: ex.n, noSave: true }); },
  'tm-pause': () => {
    const t = ui.timer; if (!t || t.phase === 'done') return;
    const now = Date.now();
    if (t.paused) { t.paused = false; t.endAt = now + t.remain; t.resumedAt = now; }
    else { t.paused = true; t.remain = Math.max(0, t.endAt - now); t.act += now - t.resumedAt; }
    timerRender();
  },
  'tm-next': () => { const t = ui.timer; if (!t || t.phase === 'done') return; if (t.paused) A['tm-pause'](); timerAdvance(); },
  'tm-prev': () => {
    const t = ui.timer; if (!t || t.phase === 'done') return;
    if (t.paused) A['tm-pause']();
    if (t.phase === 'run' && t.i > 0 && timerCur().type === 'time' && t.endAt - Date.now() < timerCur().sec * 1000 - 3000) { t.phase = 'switch'; t.endAt = Date.now() + 3000; }
    else { t.i = Math.max(0, t.i - 1); t.phase = 'switch'; t.endAt = Date.now() + 3000; }
    timerRender();
  },
  'tm-end': () => { const t = ui.timer; if (!t) return; if (!t.paused) A['tm-pause'](); t.confirmEnd = true; timerRender(); },
  'tm-resume': () => { const t = ui.timer; if (!t) return; t.confirmEnd = false; if (t.paused) A['tm-pause'](); else timerRender(); },
  'tm-finish-now': () => { const t = ui.timer; if (!t) return; t.confirmEnd = false; t.phase = 'done'; t.endedAt = Date.now(); t.complete = t.i >= t.steps.length * 0.8; timerRender(); },
  'tm-rate': (el) => { const t = ui.timer; if (!t) return; const v = Number(el.dataset.v); if (t.rate[el.dataset.ex] === v) delete t.rate[el.dataset.ex]; else t.rate[el.dataset.ex] = v; timerRender(); },
  'tm-save': () => timerSave(),
  'tm-close': () => timerClose(),

  /* Knie-Kraft */
  'kstr-set': (el) => {
    const k = todayKey(), ex = el.dataset.ex, i = Number(el.dataset.i), n = Number(el.dataset.n);
    kneeMut(k, (kn) => {
      kn.str = kn.str || { ex: {}, phase: kneeCfg().phase || 1 };
      const e = kn.str.ex[ex] = kn.str.ex[ex] || { sets: [] };
      while (e.sets.length < n) e.sets.push(false);
      e.sets[i] = !e.sets[i];
    });
    render();
  },
  'kstr-load': (el) => { kneeMut(todayKey(), (kn) => { kn.str = kn.str || { ex: {}, phase: kneeCfg().phase || 1 }; const e = kn.str.ex[el.dataset.ex] = kn.str.ex[el.dataset.ex] || { sets: [] }; e.load = e.load === el.dataset.v ? null : el.dataset.v; }); render(); },
  'kstr-pain': (el) => { const v = Number(el.dataset.v); kneeMut(todayKey(), (kn) => { kn.str = kn.str || { ex: {}, phase: kneeCfg().phase || 1 }; kn.str.pain = kn.str.pain === v ? null : v; }); render(); if (v > 3) toast('Über 3/10: Übung leichter machen oder tauschen'); },
  'kstr-done': () => { let on = false; kneeMut(todayKey(), (kn) => { kn.str = kn.str || { ex: {}, phase: kneeCfg().phase || 1 }; kn.str.done = !kn.str.done; on = kn.str.done; kn.str.phase = kneeCfg().phase || 1; }); render(); if (on) toast('Knie-Kraft erledigt'); },

  /* Läufe & Tests */
  'run-add': (el) => sheetTrain(curDate(el), null, { type: 'Laufen' }),
  'run-metric': (el) => { ui.runMetric = el.dataset.v; render(); },
  'test-new': () => sheetTest(null),
  'test-edit': (el) => sheetTest(el.dataset.id),
  'test-metric': (el) => { ui.testMetric = el.dataset.v; render(); },
  'test-sd': (el) => {
    const t = ui.sheet && ui.sheet.t; if (!t) return;
    const f = 'sd' + el.dataset.side, v = el.dataset.v === '1';
    t[f] = t[f] === v ? null : v;
    $$(`[data-a="test-sd"][data-side="${el.dataset.side}"]`).forEach((b) => b.classList.toggle('is-on', t[f] != null && (b.dataset.v === '1') === t[f]));
  },
  'test-save': () => {
    const s = ui.sheet; if (!s) return;
    const t = s.t;
    t.date = $('#kt-date').value || todayKey();
    $$('[data-tf]').forEach((inp) => { const v = parseNum(inp.value); if (v == null) delete t[inp.dataset.tf]; else t[inp.dataset.tf] = v; });
    t.note = $('#kt-note').value.trim();
    S.knee.tests = S.knee.tests || [];
    if (t.id) { const i = S.knee.tests.findIndex((x) => x.id === t.id); if (i >= 0) S.knee.tests[i] = t; } else { t.id = uid(); S.knee.tests.push(t); }
    closeSheet(); saveStore('knee'); toast('Test gespeichert');
  },
  'test-del': () => { const s = ui.sheet; S.knee.tests = (S.knee.tests || []).filter((x) => x.id !== s.t.id); closeSheet(); saveStore('knee'); },

  /* Training */
  'training-add': (el) => sheetTrain(curDate(el), null),
  'training-edit': (el) => sheetTrain(curDate(el), el.dataset.id),
  'trs-type': (el) => {
    const s = ui.sheet, v = (sel) => ($(sel) ? $(sel).value : null);
    s.t.type = el.dataset.v;
    if (v('#trs-time') != null) s.t.time = v('#trs-time');
    if (v('#trs-dur') != null) s.t.dur = parseNum(v('#trs-dur'));
    if (v('#trs-load') != null) s.t.load = parseNum(v('#trs-load'));
    if (v('#trs-note') != null) s.t.note = v('#trs-note');
    if (v('#trs-date')) s.nk = v('#trs-date');
    renderTrainSheet();
  },
  'trs-ins': (el) => { const s = ui.sheet; const v = el.dataset.v === '1'; s.t.ins = s.t.ins === v ? null : v; $$('[data-a="trs-ins"]').forEach((b) => b.classList.toggle('is-on', s.t.ins != null && (b.dataset.v === '1') === s.t.ins)); },
  'trs-pain': (el) => { const s = ui.sheet; const v = Number(el.dataset.v); s.t.pain = s.t.pain === v ? null : v; $$('[data-a="trs-pain"]').forEach((b) => { const on = Number(b.dataset.v) === s.t.pain; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); }); },
  'trs-int': (el) => { const s = ui.sheet; const v = Number(el.dataset.v); s.t.int = s.t.int === v ? null : v; $$('[data-a="trs-int"]').forEach((b) => { const on = Number(b.dataset.v) === s.t.int; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); }); },
  'trs-save': () => {
    const s = ui.sheet; if (!s) return;
    const t = s.t, tt = trainType(t);
    t.time = $('#trs-time').value || '';
    t.dur = parseNum($('#trs-dur').value);
    t.load = parseNum($('#trs-load').value);
    t.note = $('#trs-note').value.trim();
    if (tt.run) { t.km = parseNum($('#trs-km').value); t.cad = parseNum($('#trs-cad').value); t.shoe = $('#trs-shoe').value.trim(); }
    const nk = ($('#trs-date') && $('#trs-date').value) || s.k;
    if (nk > todayKey()) { toast('Datum liegt in der Zukunft'); return; }
    if (tt.gym && !t.gym) t.gym = { day: tt.gym, sched: gymSched(nk), ex: {} };
    let slot = null;
    if (t.id && nk !== s.k) mutDay(s.k, (d) => { d.trainings = (d.trainings || []).filter((x) => x.id !== t.id); });
    mutDay(nk, (d) => {
      d.trainings = d.trainings || [];
      const i = t.id ? d.trainings.findIndex((x) => x.id === t.id) : -1;
      if (i >= 0) d.trainings[i] = t; else { t.id = t.id || uid(); d.trainings.push(t); }
      slot = setSlotFromTraining(d, t);
    });
    if (nk !== s.k) ui.date = nk;
    closeSheet(); render();
    if (tt.run && t.pain != null && t.pain > 3) toast('Schmerz über 3/10 – nächster Lauf kürzer/lockerer oder Pause');
    else if (slot) toast(`Ernährung auf ${TRAINING[slot].n} umgestellt (${TRAINING[slot].hint.split(':')[0]})`);
    else toast('Training gespeichert');
  },
  'trs-del': () => { const s = ui.sheet; mutDay(s.k, (d) => { d.trainings = (d.trainings || []).filter((x) => x.id !== s.t.id); }); closeSheet(); render(); },
  'train-week': (el) => { const n = addDays(ui.trainWeek, Number(el.dataset.d)); if (n <= addDays(weekStart(todayKey()), 7)) { ui.trainWeek = n; render(); } },
  'gym-day': (el) => { ui.gymDay = Number(el.dataset.v); render(); },
  'gym-sched': (el) => { const g = S.settings.gym; g.anchor = weekStart(todayKey()); g.first = el.dataset.v; saveSettings(); },
  'gym-alt': () => { S.settings.gym.kneeAlt = !S.settings.gym.kneeAlt; saveSettings(); },
  'gym-start': (el) => {
    const k = curDate(el), day = Number(el.dataset.day), gd = gymDay(day);
    if (!gd) return;
    const existing = (getDay(k).trainings || []).find((t) => t.gym && t.gym.day === day && !t.done);
    let id = existing ? existing.id : null, slot = null;
    if (!existing) {
      id = uid();
      const ex = {};
      if (gd.legs && S.settings.gym.kneeAlt) for (const e of gd.ex) if (e.alt) ex[e.id] = { s: [], alt: true };
      const t = { id, type: gd.n, time: k === todayKey() ? minToTime(nowMin()) : '', dur: null, int: null, start: k === todayKey() ? Date.now() : null, gym: { day, sched: gymSched(k), ex } };
      mutDay(k, (d) => { d.trainings = d.trainings || []; d.trainings.push(t); slot = setSlotFromTraining(d, t); });
    }
    ui.gymSess = { k, id };
    ui.sub.train = 'heute';
    go('train', { scrollTop: true });
    if (slot) toast(`Ernährung auf ${TRAINING[slot].n} umgestellt`);
  },
  'gym-open': (el) => { ui.gymSess = { k: curDate(el), id: el.dataset.id }; render(false); window.scrollTo(0, 0); },
  'gym-close': () => { ui.gymSess = null; render(false); window.scrollTo(0, 0); },
  'gym-set': (el) => {
    const ex = el.dataset.ex, i = Number(el.dataset.i);
    const t0 = curTraining();
    const last = t0 ? lastGymLog(ex, addDays(ui.gymSess.k, -1), t0.id) : null;
    mutTraining((t) => {
      const e = t.gym.ex[ex] = t.gym.ex[ex] || { s: [] };
      e.s = e.s || [];
      while (e.s.length <= i) e.s.push({});
      const s = e.s[i];
      s.d = !s.d;
      if (s.d && last && last.sets[i] && last.alt === !!e.alt) { if (s.w == null && last.sets[i].w != null) s.w = last.sets[i].w; if (s.r == null && last.sets[i].r != null) s.r = last.sets[i].r; }
    });
    render();
  },
  'gym-exalt': (el) => { mutTraining((t) => { const e = t.gym.ex[el.dataset.ex] = t.gym.ex[el.dataset.ex] || { s: [] }; e.alt = !e.alt; }); render(); },
  'gym-addset': (el) => { mutTraining((t) => { const e = t.gym.ex[el.dataset.ex] = t.gym.ex[el.dataset.ex] || { s: [] }; const gd = gymDay(t.gym.day); const exd = gd.ex.find((x) => x.id === el.dataset.ex); const n = Math.max(gymTarget(exd, t.gym.sched, e.alt).sets, e.s.length); while (e.s.length < n) e.s.push({}); e.s.push({}); }); render(); },
  'gym-int': (el) => { const v = Number(el.dataset.v); mutTraining((t) => { t.int = t.int === v ? null : v; }); render(); },
  'gym-finish': () => {
    const t0 = curTraining(); if (!t0) return;
    const inp = $('[data-c="gym-meta"][data-f="dur"]');
    const typed = inp ? parseNum(inp.value) : null;
    mutTraining((t) => { t.dur = typed ?? t.dur ?? (t.start ? Math.max(1, Math.round((Date.now() - t.start) / 60000)) : null); t.done = true; });
    ui.gymSess = null; render(false); window.scrollTo(0, 0);
    const gs = gymProgress(t0);
    toast(`Einheit gespeichert: ${gs.done}/${gs.total} Sätze`);
  },

  /* Sauna */
  'sauna-add': (el) => {
    const k = curDate(el), m = Number(el.dataset.v);
    mutDay(k, (d) => { d.sauna = d.sauna || []; d.sauna.push({ min: m, t: k === todayKey() ? minToTime(nowMin()) : null }); });
    render();
    const late = k === todayKey() && nowMin() > sleepMin() - 150;
    toast(late ? `+ ${m} Min. Sauna – so spät kann das den Schlaf stören` : `+ ${m} Min. Sauna`, () => { mutDay(k, (d) => { d.sauna.pop(); }); render(); });
  },
  'sauna-del': (el) => { const k = curDate(el), i = Number(el.dataset.i); mutDay(k, (d) => { (d.sauna || []).splice(i, 1); }); render(); },

  /* Licht & Koffein */
  'light-min': (el) => { const k = curDate(el), v = Number(el.dataset.v); mutDay(k, (d) => { d.hd = d.hd || {}; if (d.hd.lightMin === v) delete d.hd.lightMin; else { d.hd.lightMin = v; d.habits.licht_morgen = true; } }); render(); },
  'caf-add': (el) => {
    const k = curDate(el), p = S.settings.caf.presets.find((x) => x.id === el.dataset.id);
    if (!p) return;
    const id = uid();
    const t = k === todayKey() ? minToTime(nowMin()) : '12:00';
    mutDay(k, (d) => { d.caf = d.caf || []; d.caf.push({ id, p: p.id, n: p.n, mg: p.mg, ml: p.ml, kcal: p.kcal || 0, sug: p.sug || 0, t }); syncCafHabit(k); });
    render();
    const ci = cafInfo(k);
    const undo = () => { mutDay(k, (d) => { d.caf = (d.caf || []).filter((x) => x.id !== id); syncCafHabit(k); }); render(); };
    if (timeToMin(t) > ci.cut) toast(`Nach ${S.settings.caf.cutoff}: ${p.n} – noch ${fmt(ci.bedLevel)} mg zur Schlafenszeit`, undo);
    else if (ci.bedLevel >= 25) toast(`${p.n} eingetragen – zur Schlafenszeit noch ${fmt(ci.bedLevel)} mg`, undo);
    else toast(`${p.n} eingetragen (${fmt(p.mg)} mg)${k === todayKey() ? '' : ' – Uhrzeit unten anpassen'}`, undo);
  },
  'caf-del': (el) => { const k = curDate(el); mutDay(k, (d) => { d.caf = (d.caf || []).filter((x) => x.id !== el.dataset.id); syncCafHabit(k); }); render(); },
  'caf-custom': (el) => sheetCafCustom(curDate(el)),
  'caf-custom-save': (el) => {
    const n = $('#cc-n').value.trim(), mg = parseNum($('#cc-mg').value);
    if (!n || mg == null) { toast('Name und Koffein angeben'); return; }
    const p = { id: 'c_' + uid(), n, mg, ml: parseNum($('#cc-ml').value) || 0, kcal: parseNum($('#cc-kcal').value) || 0, sug: parseNum($('#cc-sug').value) || 0 };
    S.settings.caf.presets.push(p);
    markDirty('settings');
    const k = ui.sheet.k || todayKey();
    closeSheet();
    if (el.dataset.only) { render(); toast('Getränk gespeichert'); return; }
    A['caf-add']({ dataset: { id: p.id, date: k } });
  },
  'caf-preset-del': (el) => { S.settings.caf.presets.splice(Number(el.dataset.i), 1); saveSettings(); },
  'caf-presets-reset': () => { S.settings.caf.presets = clone(CAF_PRESETS); saveSettings(); toast('Getränke zurückgesetzt'); },

  /* Haut & Fotos */
  'skin-area': (el) => { const k = curDate(el), a = el.dataset.v; mutDay(k, (d) => { d.skin = d.skin || {}; d.skin.areas = d.skin.areas || []; if (d.skin.areas.includes(a)) d.skin.areas = d.skin.areas.filter((x) => x !== a); else d.skin.areas.push(a); }); render(); },
  'photo-week': (el) => { const n = addDays(ui.photoWeek, Number(el.dataset.d)); if (n <= weekStart(todayKey())) { ui.photoWeek = n; render(); } },
  'photo-week-go': (el) => { ui.photoWeek = el.dataset.ws; ui.sub.haut = 'fotos'; go('haut', { scrollTop: true }); },
  'photo-view': (el) => sheetPhoto(el.dataset.key),
  'photo-del': async (el) => { await deletePhoto(el.dataset.key); closeSheet(); render(); toast('Foto gelöscht'); },
  'photos-export': async () => {
    toast('Fotos werden gepackt …');
    try {
      const { blob, n } = await exportPhotosZip();
      if (!n) { toast('Noch keine Fotos gespeichert'); return; }
      const r = await shareFile(blob, `protokoll-fotos-${todayKey()}.zip`, 'Protokoll-Fotos');
      if (r !== 'abort') toast(`${n} Fotos gesichert`);
    } catch (e) { toast('Export fehlgeschlagen: ' + (e.message || e)); }
  },

  /* Blutwerte */
  'blood-add': () => sheetBlood(null),
  'blood-edit': (el) => sheetBlood(el.dataset.id),
  'blood-open': (el) => { ui.bloodOpen = ui.bloodOpen === el.dataset.id ? null : el.dataset.id; render(); },
  'blood-save': () => {
    const e = ui.sheet.e;
    e.date = $('#bl-date').value || todayKey();
    e.note = $('#bl-note').value.trim();
    const keep = {};
    for (const [id, v] of Object.entries(e.v || {})) if (!$(`[data-bl="${id}"]`)) keep[id] = v;
    e.v = keep;
    $$('[data-bl]').forEach((inp) => { const v = parseNum(inp.value); if (v != null) e.v[inp.dataset.bl] = v; });
    if (!Object.keys(e.v).length) { toast('Mindestens einen Wert eintragen'); return; }
    S.blood.entries = S.blood.entries || [];
    if (e.id) { const i = S.blood.entries.findIndex((x) => x.id === e.id); if (i >= 0) S.blood.entries[i] = e; } else { e.id = uid(); S.blood.entries.push(e); }
    closeSheet(); saveStore('blood');
    const out = Object.entries(e.v).map(([id, v]) => { const m = bloodMarkers().find((x) => x.id === id); return m && bloodStatus(m, v) !== 'ok' ? m.n : null; }).filter(Boolean);
    toast(out.length ? `Gespeichert – außerhalb des Bereichs: ${out.join(', ')}` : 'Blutwerte gespeichert');
  },
  'blood-del': () => { S.blood.entries = (S.blood.entries || []).filter((x) => x.id !== ui.sheet.e.id); closeSheet(); saveStore('blood'); },
  'blood-custom': () => sheetBloodCustom(),
  'blood-custom-save': () => {
    const n = $('#bc-n').value.trim();
    if (!n) { toast('Name angeben'); return; }
    S.blood.custom = S.blood.custom || [];
    S.blood.custom.push({ id: 'c_' + uid(), n, unit: $('#bc-u').value.trim(), lo: parseNum($('#bc-lo').value), hi: parseNum($('#bc-hi').value) });
    closeSheet(); saveStore('blood');
  },
  'blood-hide': (el) => {
    const id = el.dataset.id;
    const c = (S.blood.custom || []).find((x) => x.id === id);
    if (c) S.blood.custom = S.blood.custom.filter((x) => x.id !== id);
    else { S.blood.markers[id] = { ...(S.blood.markers[id] || {}), hidden: true }; }
    ui.bloodOpen = null; saveStore('blood');
  },
  'blood-unhide': () => { for (const m of Object.values(S.blood.markers || {})) delete m.hidden; saveStore('blood'); },

  /* Einkauf */
  'shop-add': () => {
    const inp = $('#shop-new'), v = inp ? inp.value.trim() : '';
    if (!v) { if (inp) inp.focus(); return; }
    const cat = $('#shop-cat') ? $('#shop-cat').value : 'Vorrat';
    ui.shopCat = cat;
    S.shop.items.push({ id: uid(), n: v, q: '', cat, list: getSub('einkauf', 'buy') });
    saveStore('shop');
    requestAnimationFrame(() => { const i = $('#shop-new'); if (i) i.focus(); });
  },
  'shop-check': (el) => {
    const it = S.shop.items.find((x) => x.id === el.dataset.id); if (!it) return;
    it.list = 'home'; saveStore('shop');
    toast(`${it.n} → Zuhause`, () => { it.list = 'buy'; saveStore('shop'); });
  },
  'shop-back': (el) => { const it = S.shop.items.find((x) => x.id === el.dataset.id); if (!it) return; it.list = 'buy'; saveStore('shop'); toast(`${it.n} steht wieder auf der Liste`); },
  'shop-edit': (el) => sheetShopItem(el.dataset.id),
  'shop-save': () => { const it = S.shop.items.find((x) => x.id === ui.sheet.id); if (!it) return; it.n = $('#si-n').value.trim() || it.n; it.q = $('#si-q').value.trim(); it.cat = $('#si-cat').value; closeSheet(); saveStore('shop'); },
  'shop-del': () => { S.shop.items = S.shop.items.filter((x) => x.id !== ui.sheet.id); closeSheet(); saveStore('shop'); },
  'shop-reload-ask': () => {
    ui.sheet = { type: 'shopreload' };
    openSheet(`<h3 class="sheet-title">Wocheneinkauf neu laden?</h3><p class="hint">Alle Artikel der Standardliste kommen wieder auf „Einkaufen“. Eigene Artikel und dein Vorrat bleiben, wie sie sind.</p><div class="sheet-acts"><button class="btn is-accent" data-a="shop-reload-do">Neu laden</button><button class="btn is-ghost" data-a="sheet-close">Abbrechen</button></div>`);
  },
  'shop-reload-do': () => { shopReload(); ui.sub.einkauf = 'buy'; closeSheet(); saveStore('shop'); toast('Wocheneinkauf neu geladen'); },

  /* Wochenrückblick */
  'review-week': (el) => { const n = addDays(ui.reviewWeek, Number(el.dataset.d)); if (n <= weekStart(todayKey())) { ui.reviewWeek = n; render(); } },
  'review-open': (el) => { ui.reviewWeek = el.dataset.ws; ui.sub.woche = 'rueckblick'; render(false); window.scrollTo(0, 0); },

  /* Einstellungen */
  'nav-tab': (el) => {
    const id = el.dataset.id;
    let tabs = navTabs().filter((x) => x !== 'heute');
    if (tabs.includes(id)) tabs = tabs.filter((x) => x !== id);
    else { if (tabs.length >= 3) { toast('Maximal drei – erst einen abwählen'); return; } tabs.push(id); }
    const order = AREAS.map((a) => a.id);
    S.settings.nav.tabs = ['heute'].concat(tabs.sort((a, b) => order.indexOf(a) - order.indexOf(b)));
    saveSettings();
  },
  'week-flag': (el) => { const w = S.settings.week[Number(el.dataset.i)]; const key = el.dataset.k; if (w[key]) delete w[key]; else w[key] = true; saveSettings(); },
  'week-gym': (el) => { const w = S.settings.week[Number(el.dataset.i)]; const v = Number(el.dataset.v); if (!v) delete w.gym; else w.gym = v; saveSettings(); },
  'week-reset': () => { S.settings.week = clone(DEFAULT_WEEK); saveSettings(); toast('Standardwoche wiederhergestellt'); },

  /* Termine */
  'todo-suggest': (el) => { const i = $('#todo-new'); if (i) { i.value = el.dataset.v; i.focus(); } },
  'todo-showdone': () => { ui.todoDone = !ui.todoDone; render(); },
  'todo-add': () => {
    const inp = $('#todo-new'), v = inp ? inp.value.trim() : '';
    if (!v) return;
    const dt = $('#todo-date') ? $('#todo-date').value : '';
    S.settings.todos.push({ id: uid(), t: v, done: false, date: dt || null });
    saveSettings();
    toast('Eingetragen');
  },
});

Object.assign(C, {
  'gym-val': (el) => {
    const f = el.dataset.f, v = parseNum(el.value), ex = el.dataset.ex, i = Number(el.dataset.i);
    if (v != null && (v < 0 || v > (f === 'w' ? 600 : 200))) { toast('Wert prüfen'); el.classList.add('bad'); return; }
    el.classList.remove('bad');
    mutTraining((t) => { const e = t.gym.ex[ex] = t.gym.ex[ex] || { s: [] }; e.s = e.s || []; while (e.s.length <= i) e.s.push({}); if (v == null) delete e.s[i][f]; else e.s[i][f] = v; });
    flashSaved(el);
  },
  'gym-meta': (el) => { const v = parseNum(el.value); mutTraining((t) => { t.dur = v; }); flashSaved(el); },
  'train-metric': (el) => { ui.trainMetric = el.value; render(); },
  'caf-time': (el) => { const k = el.dataset.date; if (!el.value) return; mutDay(k, (d) => { const c = (d.caf || []).find((x) => x.id === el.dataset.id); if (c) c.t = el.value; syncCafHabit(k); }); render(); },
  'skin-range': (el) => { const k = el.dataset.date, v = Number(el.value); mutDay(k, (d) => { d.skin = d.skin || {}; d.skin.score = v; }); render(); },
  'photo-up': async (el) => {
    const file = el.files && el.files[0];
    if (!file) return;
    toast('Foto wird gespeichert …');
    try { await savePhoto(el.dataset.ws, el.dataset.angle, file, todayKey()); toast('Foto gespeichert'); }
    catch (e) { toast('Foto konnte nicht gespeichert werden: ' + (e.message || e)); }
    el.value = '';
    render();
  },
  'photo-cmp': (el) => { const weeks = photoWeeks(); const cur = ui.photoCmp && ui.photoCmp.length === 2 ? ui.photoCmp.slice() : [weeks[weeks.length - 1], weeks[0]]; cur[Number(el.dataset.i)] = el.value; ui.photoCmp = cur; render(); },
  'photos-import': async (el) => {
    const file = el.files && el.files[0];
    if (!file) return;
    toast('Fotos werden importiert …');
    try { const n = await importPhotosZip(await file.arrayBuffer()); toast(`${n} Fotos importiert`); }
    catch (e) { toast('Import fehlgeschlagen: ' + (e.message || e)); }
    el.value = '';
    render();
  },
  'blood-marker': (el) => {
    const id = el.dataset.id, f = el.dataset.f;
    const v = f === 'unit' ? el.value.trim() : parseNum(el.value);
    const c = (S.blood.custom || []).find((x) => x.id === id);
    if (c) c[f] = v; else S.blood.markers[id] = { ...(S.blood.markers[id] || {}), [f]: v };
    markDirty('blood'); invalidate(); flashSaved(el);
  },
  'review-note': (el) => { const ws = el.dataset.ws; S.reviews[ws] = { ...(S.reviews[ws] || {}), note: el.value }; markDirty('reviews'); flashSaved(el); },
  'sauna-goal': (el) => { const v = parseNum(el.value); if (v == null || v < 0) return; S.settings.sauna.goal = v; saveSettings(false); flashSaved(el); },
  'knee-cfg': (el) => {
    const c = kneeCfg(), f = el.dataset.f;
    if (f === 'start') { if (!el.value) return; c.start = el.value; }
    else if (f === 'insoles') c.insoles = el.value || null;
    else { const v = parseNum(el.value); if (f === 'cadence') c.cadence = v; else if (v != null && v >= 0) c[f] = v; else return; }
    saveSettings(false); flashSaved(el);
    if (f === 'cadence' || f === 'insoles' || f === 'start') render();
  },
  'knee-band': (el) => { const b = kneeCfg().bands[Number(el.dataset.i)]; if (!b) return; if (el.dataset.f === 'n') b.n = el.value.trim() || b.n; else b.kg = parseNum(el.value); saveSettings(false); flashSaved(el); },
  'knee-ins': (el) => { const v = parseNum(el.value); kneeMut(el.dataset.date, (kn) => { if (v == null) delete kn.ins; else kn.ins = v; }); flashSaved(el); },
  'knee-befund': (el) => { S.knee.befund = el.value; markDirty('knee'); flashSaved(el); },
  'kstr-kg': (el) => { const v = el.value.trim(); kneeMut(todayKey(), (kn) => { kn.str = kn.str || { ex: {}, phase: kneeCfg().phase || 1 }; const e = kn.str.ex[el.dataset.ex] = kn.str.ex[el.dataset.ex] || { sets: [] }; e.load = v || null; }); flashSaved(el); },
  'rt-item': (el) => { const rt = ensureRoutines().find((r) => r.id === ui.rtEdit); const it = rt && rt.items[Number(el.dataset.i)]; const v = parseNum(el.value); if (!it || v == null || v <= 0) { toast('Wert prüfen'); return; } it[el.dataset.f] = Math.round(v); saveSettings(false); flashSaved(el); },
  'ex-video': (el) => { const c = kneeCfg(); c.video = c.video || {}; const v = el.value.trim(); if (v && !/^https?:\/\//i.test(v)) { toast('Link muss mit https:// beginnen'); return; } if (v) c.video[el.dataset.id] = v; else delete c.video[el.dataset.id]; saveSettings(false); flashSaved(el); },
  'todo-date': (el) => { const t = S.settings.todos.find((x) => x.id === el.dataset.id); if (!t) return; t.date = el.value || null; saveSettings(); },
  'caf-cfg': (el) => { const c = S.settings.caf, f = el.dataset.f; if (f === 'halfLife') { const v = parseNum(el.value); if (v == null || v < 1 || v > 12) { toast('Halbwertszeit zwischen 1 und 12 Std.'); return; } c.halfLife = v; } else if (el.value) c.cutoff = el.value; saveSettings(false); flashSaved(el); },
  'caf-preset': (el) => { const p = S.settings.caf.presets[Number(el.dataset.i)]; if (!p) return; const f = el.dataset.f; if (f === 'n') p.n = el.value.trim() || p.n; else { const v = parseNum(el.value); if (v == null || v < 0) return; p[f] = v; } saveSettings(false); flashSaved(el); },
});

Object.assign(I, {
  'skin-range': (el) => { const v = Number(el.value); const b = $('#skin-val'), l = $('#skin-lbl'); if (b) b.textContent = v; if (l) l.textContent = skinLabel(v); const w = $('#skin-slider'); if (w) w.classList.remove('is-unset'); },
  'ex-search': (el) => { ui.exQ = el.value; const box = $('#ex-list'); if (box) box.innerHTML = exListHTML(); },
});
