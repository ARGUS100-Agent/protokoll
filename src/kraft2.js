/* ============================================================
   KRAFT 2 (seit 2.17.0, Ideen vom 18.11.2026)
   Bestwerte-Board mit e1RM-Kurve, Muskel-Karte (harte Sätze je Muskel als Silhouette), relative Kraft
   (e1RM ÷ Trendgewicht), Aufwärm- & Scheibenrechner, Pausen-Timer nach jedem Satz, Trainingsblöcke mit
   Deload-Woche, Technik-Notizen je Übung und Formcheck-Video (wird nicht gespeichert).
   ============================================================ */
/*icons: trophy timer notebook-pen video calculator*/
function gymSessions() { const out = []; for (const k of Object.keys(S.days).sort()) for (const t of S.days[k].trainings || []) if (t.gym && t.gym.ex) out.push({ k, t }); return out; }
function exHistory(id, excludeId = null) {
  const out = [];
  for (const { k, t } of gymSessions()) {
    if (t.id === excludeId) continue;
    const e = t.gym.ex[id];
    if (!e) continue;
    let best = null, maxW = 0;
    for (const s of e.s || []) { const w = Number(s.w), r = Number(s.r); if (!(w > 0 && r > 0)) continue; maxW = Math.max(maxW, w); const v = e1rm(w, r, s.rir); if (v && (!best || v > best.v)) best = { v, w, r }; }
    if (best) out.push({ k, best, maxW });
  }
  return out;
}
function exName(id) { const e = kxEx(id); return e ? e.n : id; }
function allGymExIds() { const ids = new Set(); for (const { t } of gymSessions()) for (const id of Object.keys(t.gym.ex)) ids.add(id); return [...ids].filter((id) => exHistory(id).length); }

/* ---------- Bestwerte & relative Kraft ---------- */
function prBoardHTML() {
  const ids = allGymExIds();
  if (!ids.length) return emptyState('Noch keine Gym-Sätze mit Gewicht und Wiederholungen. Nach der ersten Einheit siehst du hier deine Bestwerte.');
  const tw = trendInfo(todayKey()).trend || null;
  const rows = ids.map((id) => {
    const h = exHistory(id), be = h.reduce((a, x) => (x.best.v > a.best.v ? x : a)), bw = h.reduce((a, x) => (x.maxW > a.maxW ? x : a));
    const old = h.filter((x) => x.k <= addDays(todayKey(), -28)), prev = old.length ? Math.max(...old.map((x) => x.best.v)) : null;
    const ex = kxEx(id) || {};
    return { id, n: ex.n || id, multi: !!ex.multi, be, bw, d: prev ? (be.best.v / prev - 1) * 100 : null };
  }).sort((a, b) => (b.multi - a.multi) || b.be.best.v - a.be.best.v);
  const sel = rows.some((r) => r.id === ui.prEx) ? ui.prEx : rows[0].id;
  let h = `<section class="sec"><div class="sec-head"><h2>${icon('trophy')} Bestwerte</h2><span class="count">${rows.length} Übungen</span></div><div class="list pr-list">${rows.map((r) => `<button class="row pr-row${r.id === sel ? ' is-on' : ''}" data-a="pr-ex" data-v="${r.id}"><span class="row-main"><b>${esc(r.n)}</b><small>Bester Satz ${fmt(r.be.best.w, 1)} kg × ${r.be.best.r} · ${esc(dShort(r.be.k))}${r.multi && tw ? ` · ${fmt(r.be.best.v / tw, 2)} × Körpergewicht` : ''}</small></span><span class="pr-val"><b>${fmt(r.be.best.v, 1)}</b><small>${r.d != null ? `${sgn(r.d)} % in 4 Wo.` : 'kg e1RM'}</small></span></button>`).join('')}</div>
    <p class="hint">e1RM = geschätztes Maximalgewicht für eine Wiederholung aus Gewicht, Wiederholungen und Reserve. Relative Kraft (× Körpergewicht, mit dem Trendgewicht) zeigt, ob die Kraft mit dem Gewicht mitwächst.</p></section>`;
  const hist = exHistory(sel);
  const body = lineChart({ keys: hist.map((x) => x.k), series: [{ name: 'e1RM', color: SERIES.one, vals: hist.map((x) => Math.round(x.best.v * 10) / 10), dots: true }], unit: 'kg', fmtY: (v) => fmt(v, 0) });
  const table = '<tr><th>Datum</th><th>Bester Satz</th><th>e1RM</th></tr>' + hist.map((x) => `<tr><td>${shortDate(x.k)}</td><td>${fmt(x.best.w, 1)} × ${x.best.r}</td><td>${fmt(x.best.v, 1)}</td></tr>`).reverse().join('');
  return h + chartCard('pr', `Verlauf ${exName(sel)}`, '', body, table);
}
/* Bestwert-Hinweis direkt beim Abhaken eines Satzes */
function prCheck(exId, w, r, rir, tid) {
  const v = e1rm(Number(w), Number(r), rir);
  if (!v) return null;
  const h = exHistory(exId, tid);
  if (h.length < 1) return null;
  const bestE = Math.max(...h.map((x) => x.best.v)), bestW = Math.max(...h.map((x) => x.maxW));
  if (Number(w) > bestW) return `Neues Höchstgewicht: ${exName(exId)} ${fmt(Number(w), 1)} kg (vorher ${fmt(bestW, 1)})`;
  if (v > bestE * 1.005) return `Neuer Bestwert: ${exName(exId)} e1RM ${fmt(v, 1)} kg (${sgn(v - bestE)} kg)`;
  return null;
}

/* ---------- Muskel-Karte ---------- */
const MU_SHAPES = {
  Schultern: ['M22,44 a9,8 0 1,0 0.1,0', 'M78,44 a9,8 0 1,0 0.1,0', 'M142,44 a9,8 0 1,0 0.1,0', 'M198,44 a9,8 0 1,0 0.1,0'],
  Brust: ['M34,50 h14 v14 h-14 a4,4 0 0,1 -2,-7 z', 'M52,50 h14 a4,4 0 0,1 2,7 v7 h-16 z'],
  Bizeps: ['M14,60 a6,13 0 1,0 0.1,0', 'M86,60 a6,13 0 1,0 0.1,0'],
  Bauch: ['M41,68 h18 v30 a9,6 0 0,1 -18,0 z'],
  Beine: ['M33,112 a9,27 0 1,0 0.1,0', 'M67,112 a9,27 0 1,0 0.1,0'],
  Rücken: ['M150,40 h40 l-6,50 h-28 z'],
  Trizeps: ['M134,60 a6,13 0 1,0 0.1,0', 'M206,60 a6,13 0 1,0 0.1,0'],
  Gesäß: ['M152,100 a9,10 0 1,0 0.1,0', 'M188,100 a9,10 0 1,0 0.1,0'],
  Beinbeuger: ['M153,124 a8,22 0 1,0 0.1,0', 'M187,124 a8,22 0 1,0 0.1,0'],
  Waden: ['M154,172 a6,16 0 1,0 0.1,0', 'M186,172 a6,16 0 1,0 0.1,0'],
};
function muLevel(n) { return n <= 0 ? 0 : n < 6 ? 1 : n < 12 ? 2 : n <= 20 ? 3 : 4; }
function muscleMapHTML(ws) {
  const sets = kxWeekSets(ws);
  const outline = (x) => `<path class="mu-body" d="M${x + 50},6 a12,12 0 1,1 -0.1,0 M${x + 42},30 h16 l26,10 l8,40 l-6,2 l-8,-30 v50 l4,90 h-12 l-8,-80 l-8,80 h-12 l4,-90 v-50 l-8,30 l-6,-2 l8,-40 z"/>`;
  let svg = `<svg class="mu-map" viewBox="0 0 220 210" role="img" aria-label="Harte Sätze pro Muskel">${outline(0)}${outline(120)}`;
  for (const [mu, paths] of Object.entries(MU_SHAPES)) {
    const n = Math.round((sets[mu] || 0) * 10) / 10;
    for (const d of paths) svg += `<path class="mu mu-l${muLevel(n)}" d="${d}"><title>${esc(mu)}: ${fmt(n, 1)} Sätze</title></path>`;
  }
  svg += '<text class="tick" x="50" y="206" text-anchor="middle">vorne</text><text class="tick" x="170" y="206" text-anchor="middle">hinten</text></svg>';
  const chips = MUSCLE_ORDER.map((mu) => { const n = sets[mu] || 0; return `<span class="chip chip-xs is-static mu-chip mu-l${muLevel(n)}">${esc(mu)} ${fmt(n, n % 1 ? 1 : 0)}</span>`; }).join('');
  const low = MUSCLE_ORDER.filter((mu) => (sets[mu] || 0) < 10);
  const isCur = ws === weekStart(todayKey());
  return `<section class="sec"><div class="sec-head"><h2>Muskel-Karte</h2><span class="count">KW ${isoWeek(ws)}${isCur ? ' (läuft)' : ''}</span></div>
    <div class="week-nav is-mini"><button class="icon-btn" data-a="mu-week" data-d="-7" aria-label="Vorwoche">${icon('chevron-left')}</button><span>${esc(fmtDate(ws, { day: 'numeric', month: 'short' }))} – ${esc(fmtDate(addDays(ws, 6), { day: 'numeric', month: 'short' }))}</span><button class="icon-btn" data-a="mu-week" data-d="7" ${isCur ? 'disabled' : ''} aria-label="Nächste Woche">${icon('chevron-right')}</button></div>
    ${svg}<div class="chips chips-tight">${chips}</div>
    <div class="legend mu-legend"><span><i class="mu-key mu-l1"></i>1–5</span><span><i class="mu-key mu-l2"></i>6–11</span><span><i class="mu-key mu-l3"></i>12–20</span><span><i class="mu-key mu-l4"></i>über 20</span></div>
    <p class="hint">Harte Sätze = Arbeitssätze nah am Versagen, Hilfsmuskeln zählen halb, der Knie-Block zählt mit. Richtwert für Muskelaufbau: etwa 10–20 pro Muskel und Woche.${!isCur && low.length ? ` Unter 10: ${esc(low.join(', '))}.` : ''}</p></section>`;
}

/* ---------- Trainingsblöcke ---------- */
function blockCfg() { const b = (S.settings.gym || {}).block; return b && b.start ? { len: 5, ...b } : null; }
function blockInfo(k = todayKey()) {
  const b = blockCfg();
  if (!b) return null;
  const w = Math.floor(daysBetween(b.start, weekStart(k)) / 7);
  if (w < 0) return null;
  const n = (w % b.len) + 1;
  return { n, len: b.len, deload: n === b.len, cycle: Math.floor(w / b.len) + 1 };
}
function blockCardHTML(k = todayKey()) {
  const bi = blockInfo(k), b = blockCfg();
  if (!bi) return `<section class="sec"><div class="sec-head"><h2>Trainingsblock</h2></div><p class="sec-sub">Blöcke von 4–6 Wochen: Gewicht und Sätze steigen, in der letzten Woche kommt eine leichtere Deload-Woche. So bleibt die Erholung mit der Steigerung im Gleichgewicht (Expertenkonsens, Bell 2023).</p><div class="row-btns"><button class="pill-btn is-accent" data-a="block-start">Block starten (diese Woche = Woche 1)</button></div></section>`;
  const dl = deloadOn(k);
  return `<section class="sec"><div class="sec-head"><h2>Trainingsblock ${bi.cycle}</h2><span class="count">Woche ${bi.n} von ${bi.len}</span></div>${progBar(bi.n, bi.len, bi.deload ? 'ok' : '')}
    <p class="sec-sub">${bi.deload ? (dl ? 'Deload-Woche läuft: weniger Sätze und etwas leichter, dann startet der nächste Block.' : 'Letzte Woche im Block – Zeit für die Deload-Woche.') : `Noch ${bi.len - bi.n} ${bi.len - bi.n === 1 ? 'Woche' : 'Wochen'} bis zur Deload-Woche.`}</p>
    <div class="row-btns">${bi.deload && !dl ? '<button class="pill-btn is-accent" data-a="block-deload">Deload-Woche starten</button>' : ''}<button class="pill-btn" data-a="block-start">Neu starten</button></div>
    <div class="chips chips-tight"><span class="hint">Länge:</span>${[4, 5, 6].map((n) => `<button class="chip chip-xs${b.len === n ? ' is-on' : ''}" data-a="block-len" data-v="${n}">${n} Wochen</button>`).join('')}</div></section>`;
}

/* ---------- Aufwärm- & Scheibenrechner ---------- */
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
function isBarbell(ex) { return /LH|Langhantel/.test((ex && ex.n) || '') || /_lh$/.test((ex && ex.id) || ''); }
function platesFor(w, bar = 20) { let rest = (w - bar) / 2; if (rest < 0) return null; const out = []; for (const p of PLATES) while (rest >= p - 1e-9) { out.push(p); rest -= p; } return { out, rest: Math.round(rest * 100) / 100 }; }
function warmupSets(w, ex) {
  const step = ex ? kxStep(ex) : 2.5;
  if (!(w > 0)) return [];
  if (!ex || !ex.multi) return [{ w: kxRound(w * 0.5, step), r: 10 }];
  return [[0.4, 8], [0.6, 5], [0.8, 3]].concat(w >= 60 ? [[0.9, 1]] : []).map(([p, r]) => ({ w: kxRound(w * p, step), r })).filter((s, i, a) => s.w > 0 && (!i || s.w > a[i - 1].w));
}
function sheetCalc(exId, w) {
  const ex = exId ? kxEx(exId) : null;
  ui.sheet = { type: 'calc', ex: exId, w };
  const ws = warmupSets(w, ex), bb = !ex || isBarbell(ex);
  const pl = (x) => { const p = platesFor(x); return p ? (p.out.length ? p.out.map((v) => fmt(v, v % 1 ? 2 : 0)).join(' + ') : 'nur Stange') + (p.rest > 0 ? ` (+${fmt(p.rest, 2)} kg fehlen)` : '') : '–'; };
  openSheet(`<h3 class="sheet-title">${icon('calculator')} Aufwärmen${bb ? ' & Scheiben' : ''}</h3>${ex ? `<p class="hint">${esc(ex.n)}</p>` : ''}
    <div class="form"><div class="frow"><span class="flabel">Arbeitsgewicht</span><div class="fin"><input type="text" inputmode="decimal" data-c="calc-w" value="${numIn(w, 2)}" placeholder="kg"><span class="unit">kg</span></div></div></div>
    ${ws.length ? `<h5>Aufwärmsätze</h5><div class="table-wrap"><table class="grid-t"><tr><th>Satz</th><th>Gewicht</th><th>Wdh.</th>${bb ? '<th>pro Seite</th>' : ''}</tr>${ws.map((s, i) => `<tr><td>${i + 1}</td><td>${fmt(s.w, s.w % 1 ? 1 : 0)} kg</td><td>${s.r}</td>${bb ? `<td>${pl(s.w)}</td>` : ''}</tr>`).join('')}${bb ? `<tr><td><b>Arbeit</b></td><td><b>${fmt(w, w % 1 ? 1 : 0)} kg</b></td><td></td><td>${pl(w)}</td></tr>` : ''}</table></div>` : '<p class="hint">Arbeitsgewicht eintragen.</p>'}
    <p class="hint">Aufwärmsätze locker, weit weg vom Versagen – sie zählen nicht als harte Sätze. ${bb ? 'Scheiben pro Seite bei einer 20-kg-Stange.' : ''}</p>
    <div class="sheet-acts"><button class="btn is-accent" data-a="sheet-close">Fertig</button></div>`);
}

/* ---------- Pausen-Timer ---------- */
const REST = { end: 0, t: null, n: '', ctx: null };
function restSec(exId, sched) { const ex = kxEx(exId) || {}; return ex.multi ? (sched === 'A' ? 180 : 150) : 90; }
function restBeep() {
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* egal */ }
  try { const c = REST.ctx; if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.35); } catch (e) { /* egal */ }
}
function restStart(sec, name) {
  try { REST.ctx = REST.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (REST.ctx.state === 'suspended') REST.ctx.resume(); } catch (e) { REST.ctx = null; }
  REST.end = Date.now() + sec * 1000; REST.n = name;
  clearInterval(REST.t);
  REST.t = setInterval(restTick, 500);
  restTick();
}
function restStop() { clearInterval(REST.t); REST.t = null; REST.end = 0; const el = document.getElementById('rest'); if (el) el.remove(); }
function restTick() {
  if (!ui.gymSess) { restStop(); return; } // nur während einer Gym-Einheit
  const left = Math.ceil((REST.end - Date.now()) / 1000);
  let el = document.getElementById('rest');
  if (!el) { el = document.createElement('div'); el.id = 'rest'; el.className = 'rest-bar'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  if (left <= 0) { el.innerHTML = `<span>${icon('timer')}<b>Pause vorbei</b><small>${esc(REST.n)}</small></span><button class="pill-btn sm" data-a="rest-stop">OK</button>`; el.classList.add('is-done'); clearInterval(REST.t); REST.t = null; restBeep(); setTimeout(() => { if (!REST.t) { const x = document.getElementById('rest'); if (x) x.remove(); } }, 8000); return; }
  el.classList.remove('is-done');
  el.innerHTML = `<span>${icon('timer')}<b>Pause ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b><small>${esc(REST.n)}</small></span><button class="pill-btn sm" data-a="rest-plus">+30 s</button><button class="pill-btn sm" data-a="rest-stop">Stopp</button>`;
}

/* ---------- Technik-Notizen & Formcheck ---------- */
function exNote(id) { return ((S.settings.gym || {}).notes || {})[id] || ''; }
function exToolsHTML(ex, t, e) {
  const sg = kxSuggest(ex.id, t.gym.sched, !!e.alt, ui.gymSess.k, t.id), w = (e.s || []).map((s) => Number(s.w) || 0).reduce((a, b) => Math.max(a, b), 0) || (sg && sg.w) || '';
  const note = exNote(ex.id);
  return `${note ? `<p class="ex-note">${icon('notebook-pen')} ${esc(note)}</p>` : ''}<div class="ex-tools"><button class="link-btn" data-a="calc-open" data-ex="${ex.id}" data-w="${w}">${icon('calculator')}Aufwärmen</button><button class="link-btn" data-a="ex-note" data-ex="${ex.id}">${icon('notebook-pen')}${note ? 'Notiz' : 'Notiz'}</button><label class="link-btn">${icon('video')}Formcheck<input type="file" accept="video/*" capture="environment" data-c="formcheck" data-ex="${ex.id}" hidden></label></div>`;
}
function sheetExNote(id) {
  ui.sheet = { type: 'exnote', ex: id };
  openSheet(`<h3 class="sheet-title">${icon('notebook-pen')} ${esc(exName(id))}</h3><p class="hint">Was du dir merken willst: Sitzhöhe, Griff, Pin-Position, Technik-Hinweise.</p>
    <textarea class="note" rows="4" data-c="ex-note" data-ex="${id}" placeholder="z. B. Sitz Stufe 4, Griff etwas breiter als schulterbreit">${esc(exNote(id))}</textarea>
    <div class="sheet-acts"><button class="btn is-accent" data-a="sheet-close">Fertig</button></div>`);
}
let FC_URL = null;
function sheetFormcheck(file, id) {
  if (FC_URL) URL.revokeObjectURL(FC_URL);
  FC_URL = URL.createObjectURL(file);
  ui.sheet = { type: 'formcheck' };
  ui.fcFile = file;
  openSheet(`<h3 class="sheet-title">${icon('video')} Formcheck ${esc(exName(id))}</h3><video id="fc-v" class="fc-video" src="${FC_URL}" controls playsinline loop autoplay muted></video>
    <div class="chips chips-tight"><span class="hint">Tempo:</span>${[[1, '1×'], [0.5, '½×'], [0.25, '¼×']].map(([v, l]) => `<button class="chip chip-xs${v === 1 ? ' is-on' : ''}" data-a="fc-rate" data-v="${v}">${l}</button>`).join('')}</div>
    <p class="hint">Achte auf Tiefe, Kniebahn (Knie über den Zehen, nicht nach innen) und gleichmäßiges Tempo. Das Video bleibt nicht in der App gespeichert.</p>
    <div class="sheet-acts"><button class="btn" data-a="fc-save">${icon('share')}In Fotos sichern</button><button class="btn is-accent" data-a="sheet-close">Fertig</button></div>`);
}

/* ---------- Aktionen ---------- */
const _gymSetOrig = A['gym-set'];
A['gym-set'] = (el) => {
  _gymSetOrig(el);
  const s0 = ui.gymSess, t = curTraining();
  if (!s0 || !t) return;
  const e = t.gym.ex[el.dataset.ex], s = e && e.s && e.s[Number(el.dataset.i)];
  if (!s || !s.d) return;
  const pr = s.w != null && s.r != null ? prCheck(el.dataset.ex, s.w, s.r, s.rir, t.id) : null;
  if (pr) toast(`🏆 ${pr}`);
  if ((S.settings.gym || {}).rest !== false) restStart(restSec(el.dataset.ex, t.gym.sched), exName(el.dataset.ex));
};
Object.assign(A, {
  'pr-ex': (el) => { ui.prEx = el.dataset.v; render(); },
  'mu-week': (el) => { const cur = weekStart(todayKey()), w = addDays(ui.muWeek || cur, Number(el.dataset.d)); ui.muWeek = w > cur ? cur : w; render(); },
  'block-start': () => { S.settings.gym = { ...(S.settings.gym || {}), block: { start: weekStart(todayKey()), len: (blockCfg() || {}).len || 5 } }; saveSettings(); toast('Block gestartet: diese Woche ist Woche 1'); },
  'block-len': (el) => { const b = blockCfg(); if (!b) return; S.settings.gym.block = { ...b, len: Number(el.dataset.v) }; saveSettings(); },
  'block-deload': () => { S.settings.gym = { ...(S.settings.gym || {}), deload: weekStart(todayKey()) }; saveSettings(); toast('Deload-Woche: weniger Sätze, etwas leichter'); },
  'calc-open': (el) => sheetCalc(el.dataset.ex || null, parseNum(el.dataset.w || '') || null),
  'ex-note': (el) => sheetExNote(el.dataset.ex),
  'rest-stop': () => restStop(),
  'rest-plus': () => { REST.end += 30000; restTick(); },
  'rest-toggle': () => { S.settings.gym = { ...(S.settings.gym || {}), rest: (S.settings.gym || {}).rest === false }; saveSettings(); },
  'fc-rate': (el) => { const v = document.getElementById('fc-v'); if (v) v.playbackRate = Number(el.dataset.v); $$('[data-a="fc-rate"]').forEach((b) => b.classList.toggle('is-on', b === el)); },
  'fc-save': async () => { if (ui.fcFile) await shareFile(ui.fcFile, ui.fcFile.name || 'formcheck.mov', 'Formcheck'); },
});
Object.assign(C, {
  'calc-w': (el) => { const s = ui.sheet || {}; sheetCalc(s.ex || null, parseNum(el.value)); },
  'ex-note': (el) => { const g = S.settings.gym = { ...(S.settings.gym || {}) }; g.notes = { ...(g.notes || {}) }; const v = el.value.trim(); if (v) g.notes[el.dataset.ex] = v; else delete g.notes[el.dataset.ex]; markDirty('settings'); flashSaved(el); },
  formcheck: (el) => { const f = el.files && el.files[0]; if (f) sheetFormcheck(f, el.dataset.ex); el.value = ''; },
});
const _sheetCloseOrig = A['sheet-close'];
A['sheet-close'] = (el) => { const t = ui.sheet && ui.sheet.type; _sheetCloseOrig(el); if (['exnote', 'calc', 'formcheck'].includes(t)) render(); };
