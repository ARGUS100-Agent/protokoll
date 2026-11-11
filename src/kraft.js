/* ============================================================
   KRAFT-AUTOPILOT (seit 2.10.0, Wunsch vom 11.11.2026)
   Doppelte Progression: Erst die Wiederholungen im Zielbereich steigern; schaffst du in allen
   Sätzen die Obergrenze, kommt mehr Gewicht. Optional pro Satz „Wdh. in Reserve“ (RIR):
   viel Reserve → größerer Schritt, zweimal unter der Untergrenze → etwas leichter.
   Dazu: Stillstand je Übung (geschätztes 1RM nach Epley), Sätze pro Muskel und Woche
   (Richtwert 12–20 für Trainierte, Baz-Valle 2022), leichtere Woche (Deload) nach 6 harten
   Wochen oder bei Stillstand plus niedriger Bereitschaft, Rückkehr nach Pausen und
   Motivation bei verpassten Einheiten.
   ============================================================ */
/*icons: trending-up trending-down minus sparkles flame triangle-alert dumbbell*/
const MUSCLES = {
  g_schraeg_lh: { Brust: 1, Schultern: 0.5, Trizeps: 0.5 }, g_klimmzug: { Rücken: 1, Bizeps: 0.5 }, g_brustpresse: { Brust: 1, Trizeps: 0.5 },
  g_rudern_brust: { Rücken: 1, Bizeps: 0.5 }, g_flys: { Brust: 1 }, g_seitheben: { Schultern: 1 }, g_preacher: { Bizeps: 1 }, g_trizeps_stange: { Trizeps: 1 },
  g_hacken: { Beine: 1, Gesäß: 0.5 }, g_rdl: { Beinbeuger: 1, Gesäß: 1 }, g_bss: { Beine: 1, Gesäß: 0.5 }, g_beinbeuger: { Beinbeuger: 1 }, g_beinstrecker: { Beine: 1 },
  g_waden: { Waden: 1 }, g_beinheben: { Bauch: 1 }, g_pallof: { Bauch: 1 },
  g_schulter: { Schultern: 1, Trizeps: 0.5 }, g_latzug: { Rücken: 1, Bizeps: 0.5 }, g_kabelrudern: { Rücken: 1, Bizeps: 0.5 }, g_schraeg_kh: { Brust: 1, Schultern: 0.5, Trizeps: 0.5 },
  g_seitheben2: { Schultern: 1 }, g_reverse_fly: { Schultern: 1 }, g_bayesian: { Bizeps: 1 }, g_trizeps_kopf: { Trizeps: 1 },
};
const MUSCLE_ORDER = ['Brust', 'Rücken', 'Schultern', 'Bizeps', 'Trizeps', 'Beine', 'Beinbeuger', 'Gesäß', 'Waden', 'Bauch'];
const RIR_STEPS = [null, 1, 2.5, 4];
const RIR_LABEL = { 1: '0–1', 2.5: '2–3', 4: '4+' };
function kxRange(reps) { const m = String(reps).match(/(\d+)(?:\s*[–-]\s*(\d+))?/); if (!m) return [8, 12]; const a = Number(m[1]), b = Number(m[2] || m[1]); return [a, b]; }
function kxEx(id) { for (const g of GYM_DAYS) { const e = g.ex.find((x) => x.id === id); if (e) return { ...e, day: g.day, legs: !!g.legs }; } return null; }
function kxStep(ex, alt) {
  const n = (alt && ex.alt ? ex.alt.n : ex.n) || '';
  if (/KH/.test(n)) return 2;
  if (ex.multi && (ex.legs || /Beinpresse|Hip Thrust|Kreuzheben|Kniebeuge/.test(n))) return 5;
  return 2.5;
}
const kxRound = (w, step) => Math.max(0, Math.round(w / step) * step);
const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + Math.min(r, 15) / 30) : null);
/* Verlauf einer Übung: Einheiten mit Sätzen (neueste zuerst) */
function kxHistory(exId, beforeKey, excludeId, days = 150) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const k = addDays(beforeKey, -i), d = peekDay(k);
    if (!d) continue;
    for (const t of (d.trainings || []).slice().reverse()) {
      if (!t.gym || !t.gym.ex || !t.gym.ex[exId] || t.id === excludeId) continue;
      const e = t.gym.ex[exId];
      const sets = (e.s || []).filter((s) => s.r != null && (s.d || s.w != null)).map((s) => ({ w: s.w != null ? Number(s.w) : null, r: Number(s.r), rir: s.rir ?? null }));
      if (sets.length) out.push({ k, sched: t.gym.sched, alt: !!e.alt, sets, best: Math.max(0, ...sets.map((s) => e1rm(s.w, s.r) || 0)) });
    }
  }
  return out;
}
function lastGymKey(beforeKey) {
  for (let i = 0; i < 120; i++) { const k = addDays(beforeKey, -i), d = peekDay(k); if (d && (d.trainings || []).some((t) => t.gym && Object.keys(t.gym.ex || {}).length)) return k; }
  return null;
}
function deloadOn(k) { const g = S.settings.gym || {}; return !!g.deload && g.deload === weekStart(k); }
/* Vorschlag für die nächste Einheit */
function kxSuggest(exId, sched, alt, k, excludeId) {
  const ex = kxEx(exId);
  if (!ex) return null;
  const tg = gymTarget(ex, sched, alt), [lo, hi] = kxRange(tg.reps), step = kxStep(ex, alt);
  let sets = tg.sets;
  const hist = kxHistory(exId, addDays(k, -1), excludeId).filter((h) => h.alt === !!alt);
  const lastAny = lastGymKey(addDays(k, -1)), gap = lastAny ? daysBetween(lastAny, k) : null;
  const factor = gap != null && gap >= 21 ? 0.8 : gap != null && gap >= 10 ? 0.9 : 1;
  const dl = deloadOn(k);
  const out = { sets, lo, hi, step, w: null, reps: [], tag: 'new', why: '', extra: [] };
  const same = hist.find((h) => h.sched === sched);
  if (!hist.length) { out.why = `Neu: Gewicht wählen, mit dem ${hi} saubere Wdh. gerade noch gehen (1–2 in Reserve).`; out.reps = Array(sets).fill(hi); }
  else if (!same) {
    const best = Math.max(...hist.slice(0, 3).map((h) => h.best));
    const bw = hist[0].sets.every((s) => s.w == null);
    if (bw) { out.reps = Array(sets).fill(lo); out.tag = 'same'; out.why = `Erste Einheit in Schedule ${sched}: Zielbereich ${lo}–${hi} Wdh.`; }
    else { out.w = kxRound((best / (1 + (lo + hi) / 2 / 30)) * 0.97, step); out.reps = Array(sets).fill(lo); out.tag = 'new'; out.why = `Aus deinen letzten Sätzen umgerechnet (geschätztes 1RM ${fmt(best, 1)} kg) für ${lo}–${hi} Wdh.`; }
  } else {
    const ws = same.sets.filter((s) => s.w != null), bw = !ws.length;
    if (bw) {
      const all = same.sets.every((s) => s.r >= hi);
      out.reps = same.sets.slice(0, sets).map((s) => Math.min(hi, s.r + 1));
      while (out.reps.length < sets) out.reps.push(lo);
      out.tag = all ? 'up' : 'same';
      out.why = all ? `Obergrenze ${hi} Wdh. in allen Sätzen: Zusatzgewicht oder schwerere Variante.` : 'Gleiche Ausführung, je Satz 1 Wdh. mehr.';
    } else {
      const top = Math.max(...ws.map((s) => s.w)), atTop = ws.filter((s) => s.w === top);
      const rirs = atTop.map((s) => s.rir).filter((v) => v != null), rir = rirs.length ? mean(rirs) : null;
      const allHi = atTop.length >= Math.min(sets, ws.length) && atTop.every((s) => s.r >= hi);
      const prev = hist.filter((h) => h.sched === sched)[1];
      const below = (h) => { const w2 = h.sets.filter((s) => s.w != null); const t2 = Math.max(...w2.map((s) => s.w)); return w2.filter((s) => s.w === t2).some((s) => s.r < lo) ? t2 : null; };
      if (allHi) {
        const n = rir != null && rir >= 3 ? 2 : 1;
        out.w = top + n * step; out.reps = Array(sets).fill(lo); out.tag = 'up';
        out.why = `Letztes Mal ${atTop.map((s) => s.r).join('/')} Wdh. mit ${fmt(top, 1)} kg – Obergrenze geschafft${n > 1 ? ' mit viel Reserve' : ''} → +${fmt(n * step, 1)} kg, Ziel ${lo}+ Wdh.`;
      } else if (below(same) != null && prev && below(prev) != null && (rir == null || rir <= 1)) {
        out.w = kxRound(top * 0.95, step); out.reps = Array(sets).fill(lo); out.tag = 'down';
        out.why = `Zweimal unter ${lo} Wdh. → ${fmt(out.w, 1)} kg, saubere Ausführung zuerst. Danach wieder hoch.`;
      } else {
        out.w = top; out.tag = 'same';
        out.reps = Array.from({ length: sets }, (_, i) => { const s = atTop[i] || atTop[atTop.length - 1]; return Math.min(hi, Math.max(lo, (s ? s.r : lo) + 1)); });
        out.why = `Gleiches Gewicht, je Satz 1 Wdh. mehr (${atTop.map((s) => s.r).join('/')} → ${out.reps.join('/')}). Bei ${hi} in allen Sätzen kommt mehr Gewicht.`;
      }
    }
  }
  if (factor < 1 && out.w != null) { out.w = kxRound(out.w * factor, step); out.extra.push(`Nach ${gap} Tagen Pause ${Math.round((1 - factor) * 100)} % leichter – in 1–2 Einheiten bist du wieder da.`); }
  if (dl) { if (out.w != null) out.w = kxRound(out.w * 0.9, step); out.sets = Math.max(1, sets - 1); out.reps = out.reps.slice(0, out.sets); out.extra.push('Leichtere Woche: ein Satz weniger, ~10 % leichter, 3–4 Wdh. in Reserve.'); }
  return out;
}
/* Stillstand: bestes geschätztes 1RM der letzten 3 Einheiten nicht höher als davor (±1 %) */
function kxStalls(k = todayKey()) {
  const out = [];
  for (const g of GYM_DAYS) for (const ex of g.ex) {
    if (!MUSCLES[ex.id]) continue;
    const h = kxHistory(ex.id, k, null, 90).filter((x) => x.best > 0);
    if (h.length < 5) continue;
    const recent = Math.max(...h.slice(0, 3).map((x) => x.best)), before = Math.max(...h.slice(3).map((x) => x.best));
    if (recent <= before * 1.01) out.push({ id: ex.id, n: ex.n, since: h[2].k });
  }
  return out;
}
/* Sätze pro Muskel in einer Woche (erledigte Sätze; Hilfsmuskeln zählen halb) */
function kxWeekSets(ws) {
  const m = {};
  for (const k of weekKeys(ws)) {
    const d = peekDay(k);
    for (const t of (d && d.trainings) || []) {
      if (!t.gym || !t.gym.ex) continue;
      for (const [id, e] of Object.entries(t.gym.ex)) {
        const n = (e.s || []).filter((s) => s.d || (s.r != null && s.w != null)).length;
        if (!n) continue;
        for (const [mu, f] of Object.entries(MUSCLES[id] || {})) m[mu] = (m[mu] || 0) + n * f;
      }
    }
  }
  return m;
}
/* Wie viele Wochen am Stück mit mindestens 2 Gym-Einheiten (bis letzte Woche) */
function kxHardWeeks(k = todayKey()) {
  const g = S.settings.gym || {}, last = (g.deloads || []).slice(-1)[0];
  let n = 0;
  for (let i = 1; i <= 16; i++) {
    const ws = addDays(weekStart(k), -7 * i);
    if (last && ws <= last) break;
    const cnt = weekKeys(ws).filter((x) => dayDone(x).gymAny).length;
    if (cnt >= 2) n++; else break;
  }
  return n;
}
function kxDeloadAdvice(k = todayKey()) {
  if (deloadOn(k)) return { on: true };
  const hw = kxHardWeeks(k), st = kxStalls(k);
  const rds = rangeKeys(7, k).map((x) => (readinessOf(x) || {}).score).filter((v) => v != null);
  const rd = rds.length >= 3 ? mean(rds) : null;
  if (hw >= 6) return { why: `${hw} harte Wochen am Stück. Eine leichtere Woche lässt Gelenke und Sehnen aufholen – danach geht es meist stärker weiter.` };
  if (st.length >= 3 && rd != null && rd < 55) return { why: `${st.length} Übungen stagnieren und deine Bereitschaft liegt bei Ø ${fmt(rd)}. Zeit für eine leichtere Woche.` };
  return null;
}
/* Verpasste Einheiten diese Woche, Tage seit dem letzten Gym */
function kxMissed(k = todayKey()) {
  const wp = weekPlan(weekStart(k));
  const missed = wp.days.filter((d) => d.past).flatMap((d) => d.items.filter((it) => it.kind === 'gym' && !it.done && !it.extra && !it.moved).map((it) => ({ k: d.k, n: it.n })));
  const today = wp.days.find((d) => d.isToday);
  const todayGym = today ? today.items.find((it) => it.kind === 'gym' && !it.done) : null;
  const last = lastGymKey(k), gap = last ? daysBetween(last, k) : null;
  return { missed, todayGym, gap };
}
function kxMotivation(k = todayKey()) {
  const m = kxMissed(k);
  const logs = rangeKeys(28, k).some((x) => dayDone(x).gymAny);
  if (!logs) return null;
  if (m.gap != null && m.gap >= 7) return { lvl: 2, t: `${m.gap} Tage ohne Gym.`, s: m.gap >= 10 ? 'Die Pause ist vorbei – heute zählt nur, dass du hingehst. Die App startet dich ~10 % leichter, nach 1–2 Einheiten bist du wieder auf Stand.' : 'Kein Drama, aber jetzt wieder rein: Heute die Grundübungen, 45 Minuten reichen.' };
  if (m.missed.length >= 2) return { lvl: 2, t: `${m.missed.length} Einheiten diese Woche ausgefallen.`, s: 'Muskeln wachsen nicht vom Planen. Heute eine Einheit – auch kurz ist besser als keine.' };
  if (m.missed.length === 1 && m.todayGym) return { lvl: 1, t: `${m.missed[0].n} ist ausgefallen – heute nachholen?`, s: 'Eine Einheit nachholen hält den Wochenrhythmus.' };
  if (m.todayGym) return { lvl: 0, t: `Heute: ${m.todayGym.n}.`, s: '' };
  return null;
}
/* ---------- Oberfläche ---------- */
function kxCard(k = todayKey()) {
  const ws = weekStart(k), sets = kxWeekSets(ws), last = kxWeekSets(addDays(ws, -7));
  const any = Object.keys(sets).length || Object.keys(last).length || kxHistory('g_latzug', k, null, 60).length || rangeKeys(42, k).some((x) => dayDone(x).gymAny);
  if (!any) return '';
  const dl = kxDeloadAdvice(k), st = kxStalls(k), mo = kxMotivation(k);
  let h = '<section class="sec kx-card" id="kraft"><div class="sec-head"><h2>Kraft-Autopilot</h2></div>';
  if (mo && mo.lvl >= 1) h += `<div class="banner is-warn">${icon('flame')}<div><b>${esc(mo.t)}</b>${mo.s ? `<span>${esc(mo.s)}</span>` : ''}</div></div>`;
  if (dl && dl.on) h += `<div class="banner">${icon('sparkles')}<div><b>Leichtere Woche läuft</b><span>Ein Satz weniger, ~10 % leichter, 3–4 Wdh. in Reserve. Die Vorschläge sind schon angepasst.</span></div><button class="pill-btn sm" data-a="kx-deload" data-v="off">Beenden</button></div>`;
  else if (dl) h += `<div class="banner">${icon('sparkles')}<div><b>Leichtere Woche empfohlen</b><span>${esc(dl.why)}</span></div><button class="pill-btn sm" data-a="kx-deload" data-v="on">Diese Woche</button></div>`;
  const rows = MUSCLE_ORDER.map((mu) => { const v = sets[mu] || 0, pv = last[mu] || 0; const st2 = v >= 12 ? (v > 22 ? 'over' : 'ok') : v >= 8 ? 'under' : 'none'; return `<div class="kx-row"><span>${mu}</span><div class="kx-bar"><i class="st-${st2}" style="width:${clamp((v / 20) * 100, 0, 100)}%"></i><b style="left:60%"></b></div><em>${fmt(v, v % 1 ? 1 : 0)}</em><small>${pv ? `Vorw. ${fmt(pv, pv % 1 ? 1 : 0)}` : ''}</small></div>`; }).join('');
  h += `<div class="kx-sets"><p class="flabel-s">Sätze pro Muskel diese Woche (Richtwert 12–20)</p>${rows}</div>`;
  if (st.length) h += `<p class="kx-st">${icon('minus')}<span><b>Stillstand:</b> ${esc(st.map((x) => x.n).join(', '))}. Tipps: Schlaf und Eiweiß prüfen, Wiederholungsbereich wechseln (Schedule A/B macht das schon), Technik filmen; bleibt es so, eine leichtere Woche.</span></p>`;
  return h + '<p class="hint">Vorschläge stehen in jeder Übung der Einheit. Doppelte Progression: erst Wiederholungen, dann Gewicht – saubere Ausführung geht vor. Optional pro Satz antippen, wie viele Wdh. noch drin waren (RIR).</p></section>';
}
function kxExHTML(ex, t, e, k) {
  const sg = kxSuggest(ex.id, t.gym.sched, !!e.alt, k, t.id);
  if (!sg) return '';
  const ic = { up: 'trending-up', down: 'trending-down', same: 'minus', new: 'sparkles' }[sg.tag];
  const plan = sg.w != null ? `${sg.sets} × ${fmt(sg.w, 1)} kg × ${sg.reps.join('/')}` : `${sg.sets} × ${sg.reps.join('/')} Wdh.`;
  return `<div class="kx-sug kx-${sg.tag}">${icon(ic)}<div><b>Vorschlag: ${esc(plan)}</b><small>${esc(sg.why)}${sg.extra.length ? ' ' + esc(sg.extra.join(' ')) : ''}</small></div>${sg.w != null || sg.reps.length ? `<button class="pill-btn sm" data-a="kx-apply" data-ex="${ex.id}">Übernehmen</button>` : ''}</div>`;
}
Object.assign(A, {
  'kx-apply': (el) => {
    const t0 = curTraining(); if (!t0) return;
    const exId = el.dataset.ex, e0 = t0.gym.ex[exId] || {};
    const sg = kxSuggest(exId, t0.gym.sched, !!e0.alt, ui.gymSess.k, t0.id);
    mutTraining((t) => { const e = t.gym.ex[exId] = t.gym.ex[exId] || { s: [] }; e.s = e.s || []; while (e.s.length < sg.sets) e.s.push({}); for (let i = 0; i < sg.sets; i++) { const s = e.s[i]; if (s.d) continue; if (sg.w != null) s.w = sg.w; s.r = sg.reps[i] ?? sg.reps[sg.reps.length - 1]; } });
    render(); toast('Vorschlag eingetragen – nach jedem Satz abhaken und Wdh. anpassen');
  },
  'gym-rir': (el) => {
    const ex = el.dataset.ex, i = Number(el.dataset.i);
    mutTraining((t) => { const e = t.gym.ex[ex] = t.gym.ex[ex] || { s: [] }; e.s = e.s || []; while (e.s.length <= i) e.s.push({}); const s = e.s[i]; const j = RIR_STEPS.indexOf(s.rir ?? null); s.rir = RIR_STEPS[(j + 1) % RIR_STEPS.length]; if (s.rir == null) delete s.rir; });
    render();
  },
  'kx-deload': (el) => {
    const g = S.settings.gym = S.settings.gym || {};
    if (el.dataset.v === 'on') { g.deload = weekStart(todayKey()); g.deloads = [...new Set([...(g.deloads || []), g.deload])]; toast('Leichtere Woche: Vorschläge sind angepasst'); }
    else { delete g.deload; toast('Leichtere Woche beendet'); }
    saveSettings();
  },
});
/* Mitteilungen: Gym heute, verpasste Einheit, lange Pause */
function pushTraining(k, r, d, add, isT) {
  const mo = kxMotivation(k);
  if (!mo) return;
  const t = Math.max(r.wake + 180, Math.min(17 * 60, r.bed - 300));
  if (isT && mo.lvl >= 1) add('training', t, 'gym', mo.t, mo.s || 'Antippen für die Einheit mit Vorschlägen.', '#train');
  else if (mo.lvl === 0 && !dayDone(k).gymAny) add('training', t, 'gym', mo.t, 'Die Vorschläge für Gewicht und Wiederholungen stehen in der Einheit.', '#train');
}
