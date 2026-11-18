/* ============================================================
   KNIE, BJJ, ATHLETIK (seit 2.17.0, Ideen vom 18.11.2026)
   - Knie genauer: Schmerzort und Auslöser bei Instabilität → Muster der letzten 30 Tage.
   - Knie-Tests: Einbein-Sprung mit Symmetrie-Index (Richtwert ≥ 90 %, erst nach Freigabe) und ein kurzer
     Alltagscheck (eigene Fragen, kein validierter Score).
   - BJJ-Journal nach jeder Einheit, Technik-Karten mit Wiederholung in wachsenden Abständen.
   - Garmin-Einheiten „Sonstiges“ per Rückfrage zuordnen (BJJ, Ergometer, Mobility, Kraft).
   - Athletik-Profil alle 3 Monate als Netzdiagramm, Ergometer-Programme mit Phasen-Timer (4×4 nach Helgerud 2007,
     Zone 2), eigener Ausdauer-Test (Watt bei Puls 150), weil die VO2max der Uhr ohne Läufe stehen bleibt.
   ============================================================ */
/*icons: swords radar bike lightbulb heart-pulse play x*/
const KNEE_LOC = ['vorne', 'Kniescheibe', 'innen', 'außen', 'hinten'];
const KNEE_TRIG = ['BJJ', 'Treppe', 'Drehung', 'Landung', 'Aufstehen', 'Gym'];
function kneeMoreHTML(k) {
  const kn = kneeDay(peekDay(k)), on = (arr, v) => (arr || []).includes(v);
  let h = `<div class="chips chips-tight"><span class="hint">Wo?</span>${KNEE_LOC.map((v) => `<button class="chip chip-xs${on(kn.loc, v) ? ' is-on' : ''}" data-a="knee-loc" data-v="${esc(v)}" data-date="${k}">${esc(v)}</button>`).join('')}</div>`;
  if ((kn.flags || []).includes('Instabilität')) h += `<div class="chips chips-tight"><span class="hint">Wobei?</span>${KNEE_TRIG.map((v) => `<button class="chip chip-xs${on(kn.trig, v) ? ' is-on is-red' : ''}" data-a="knee-trig" data-v="${esc(v)}" data-date="${k}">${esc(v)}</button>`).join('')}</div>`;
  return h;
}
function kneePattern(k = todayKey(), days = 30) {
  const loc = {}, trig = {}, flags = {};
  for (const x of rangeKeys(days, k)) { const kn = kneeDay(peekDay(x)); for (const v of kn.loc || []) loc[v] = (loc[v] || 0) + 1; for (const v of kn.trig || []) trig[v] = (trig[v] || 0) + 1; for (const v of kn.flags || []) flags[v] = (flags[v] || 0) + 1; }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
  return { loc: top(loc), trig: top(trig), flags: top(flags) };
}
function kneePatternHTML(k = todayKey()) {
  const p = kneePattern(k);
  if (!p.loc.length && !p.trig.length && !p.flags.length) return '';
  const f = (a) => a.map(([n, c]) => `${esc(n)} ${c}×`).join(', ');
  const inst = (p.flags.find((x) => x[0] === 'Instabilität') || [])[1] || 0;
  return `<section class="sec"><div class="sec-head"><h2>Muster (30 Tage)</h2></div>
    ${p.flags.length ? `<p class="sec-sub">Bemerkt: ${f(p.flags)}</p>` : ''}${p.loc.length ? `<p class="sec-sub">Schmerzort: ${f(p.loc)}</p>` : ''}${p.trig.length ? `<p class="sec-sub">Instabilität bei: ${f(p.trig)}</p>` : ''}
    ${inst >= 2 ? `<div class="banner is-warn">${icon('triangle-alert')}<div><b>Instabilität ${inst}× in 30 Tagen</b><span>Das Knie gibt wiederholt nach – lass das bitte ärztlich oder physiotherapeutisch abklären, bevor Sprünge und BJJ-Drehungen wieder voll dazukommen.</span></div></div>` : ''}</section>`;
}

/* ---------- Knie-Tests: Sprung-Symmetrie, Alltagscheck ---------- */
const KNEE_DAILY = [['treppe', 'Treppe hoch und runter'], ['hocke', 'Tiefe Hocke'], ['drehen', 'Auf dem Bein drehen'], ['sprint', 'Antritt, Sprint, Richtungswechsel'], ['vertrauen', 'Vertrauen ins Knie']];
function hopLsi(t) { const L = Number(t.hopL), R = Number(t.hopR); return L > 0 && R > 0 ? (Math.min(L, R) / Math.max(L, R)) * 100 : null; }
function kneeTestExtraHTML() {
  const tests = kneeTests(), hop = tests.filter((t) => hopLsi(t) != null), last = hop[hop.length - 1];
  const chk = (S.settings.kneeCheck || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1)), lc = chk[chk.length - 1];
  const inst = ((kneePattern().flags.find((x) => x[0] === 'Instabilität')) || [])[1] || 0;
  let h = `<section class="sec"><div class="sec-head"><h2>Sprung-Symmetrie</h2>${last ? `<span class="ampel ${hopLsi(last) >= 90 ? 'is-ok' : 'is-warn'}">${fmt(hopLsi(last))} %</span>` : ''}</div>
    <p class="sec-sub">Einbein-Weitsprung, je Seite 3 Versuche, der beste zählt. Symmetrie = schwächere ÷ stärkere Seite. Als Mindestrichtwert gilt meist 90 % – gleiche Weite heißt aber noch nicht gleiche Kontrolle.</p>
    ${inst ? `<p class="hint">${icon('triangle-alert')} Instabilität in den letzten 30 Tagen: Sprungtests erst nach Freigabe durch Arzt oder Physio.</p>` : '<p class="hint">Nur schmerzfrei und mit stabilem Knie – im Zweifel erst nach Freigabe durch Arzt oder Physio.</p>'}
    ${last ? `<p class="sec-sub">Zuletzt ${esc(dShort(last.date))}: links ${fmt(last.hopL)} cm, rechts ${fmt(last.hopR)} cm.</p>` : ''}</section>`;
  h += `<section class="sec"><div class="sec-head"><h2>Alltagscheck</h2>${lc ? `<span class="count">${lc.sum}/20 · ${esc(dShort(lc.date))}</span>` : ''}</div>
    <p class="sec-sub">Einmal im Monat: Wie viel Probleme macht das Knie bei … (0 = keine, 4 = extrem)? Eigene Kurzabfrage zum Verlauf, kein validierter Score – für den Fragebogen KOOS frag deinen Physio.</p>
    <div class="row-btns"><button class="pill-btn is-accent" data-a="kcheck-open">Alltagscheck ausfüllen</button></div>`;
  if (chk.length >= 2) h += lineChart({ keys: chk.map((x) => x.date), series: [{ name: 'Alltagscheck', color: SERIES.one, vals: chk.map((x) => x.sum), dots: true }], unit: 'Punkte', yMin: 0 });
  return h + '</section>';
}
function sheetKneeCheck() {
  const k = todayKey(), cur = (S.settings.kneeCheck || []).find((x) => x.date === k) || { date: k, a: {} };
  ui.sheet = { type: 'kcheck' };
  openSheet(`<h3 class="sheet-title">Knie-Alltagscheck</h3><p class="hint">0 = keine Probleme, 4 = extreme Probleme. Bezogen auf die letzte Woche.</p>
    ${KNEE_DAILY.map(([id, n]) => `<div class="mc-row is-stack"><span>${esc(n)}</span><div class="chips chips-tight">${[0, 1, 2, 3, 4].map((v) => `<button class="chip chip-sm${cur.a[id] === v ? ' is-on' : ''}" data-a="kcheck" data-id="${id}" data-v="${v}">${v}</button>`).join('')}</div></div>`).join('')}
    <div class="sheet-acts"><button class="btn is-accent" data-a="kcheck-done">Fertig</button></div>`);
}

/* ---------- Garmin „Sonstiges“ zuordnen ---------- */
const UNK_TYPES = [['BJJ', 'BJJ'], ['Ergometer', 'Ergometer'], ['Mobility', 'Mobility'], ['Gym (frei)', 'Kraft']];
function unknownTrainings(k = todayKey()) {
  const out = [];
  for (const x of rangeKeys(14, k)) for (const t of ((peekDay(x) || {}).trainings || [])) if (t.type === 'Sonstiges' && !t.asked) out.push({ k: x, t });
  return out;
}
function unknownCard(k = todayKey()) {
  const u = unknownTrainings(k);
  if (!u.length) return '';
  const { k: x, t } = u[0];
  return `<div class="banner">${icon('watch')}<div><b>Was war das? ${esc(fmtDate(x, { weekday: 'short', day: 'numeric', month: 'short' }))}${t.time ? ', ' + t.time : ''}${t.dur ? ` · ${t.dur} Min.` : ''}</b><span>Die Uhr kennt die Einheit nur als „Sonstiges“. Richtig zugeordnet zählt sie für Wochenziel, Muster und Knie.${u.length > 1 ? ` Noch ${u.length - 1} weitere.` : ''}</span>
    <div class="chips chips-tight">${UNK_TYPES.map(([v, l]) => `<button class="chip chip-sm" data-a="unk-type" data-v="${esc(v)}" data-id="${t.id}" data-date="${x}">${l}</button>`).join('')}<button class="chip chip-sm" data-a="unk-type" data-v="" data-id="${t.id}" data-date="${x}">passt so</button></div></div></div>`;
}

/* ---------- BJJ-Journal & Technik-Karten ---------- */
const BJJ_STEPS = [1, 3, 7, 14, 30, 60];
function bjjCfg() { return { belt: 'Weiß', stripes: 0, cards: [], ...(S.settings.bjj || {}) }; }
function bjjOpen(k = todayKey()) { const out = []; for (const x of rangeKeys(3, k)) for (const t of ((peekDay(x) || {}).trainings || [])) if (isBjj(t) && !t.bjj && !t.bjjSkip) out.push({ k: x, t }); return out; }
function bjjDue(k = todayKey()) { return bjjCfg().cards.filter((c) => c.due <= k).sort((a, b) => (a.due < b.due ? -1 : 1)); }
function bjjCard(k = todayKey()) {
  let h = '';
  const o = bjjOpen(k)[0];
  if (o) h += `<div class="banner">${icon('swords')}<div><b>BJJ ${esc(fmtDate(o.k, { weekday: 'short', day: 'numeric', month: 'short' }))}: Was hast du gelernt?</b><span>30 Sekunden: Techniken, Rolls, Knie. Die Techniken kommen als Karten zum Wiederholen zurück.</span></div><div class="banner-acts"><button class="pill-btn is-accent" data-a="bjj-open" data-id="${o.t.id}" data-date="${o.k}">Notieren</button><button class="link-btn" data-a="bjj-skip" data-id="${o.t.id}" data-date="${o.k}">Nein</button></div></div>`;
  const due = bjjDue(k);
  if (due.length) {
    const c = due[0];
    h += `<section class="card bjj-rep"><div class="sec-head"><h2>${icon('lightbulb')} Technik wiederholen</h2><span class="count">${due.length} fällig</span></div><p class="bjj-tech">${esc(c.n)}</p><p class="hint">Geh die Technik im Kopf Schritt für Schritt durch (Griffe, Gewicht, Ausgang). Sitzt sie?</p>
      <div class="row-btns"><button class="pill-btn is-accent" data-a="bjj-rep" data-id="${c.id}" data-v="1">Sitzt</button><button class="pill-btn" data-a="bjj-rep" data-id="${c.id}" data-v="0">Nochmal</button></div></section>`;
  }
  return h;
}
function sheetBjj(k, id) {
  const t = ((peekDay(k) || {}).trainings || []).find((x) => x.id === id);
  if (!t) return;
  const j = t.bjj || {};
  ui.sheet = { type: 'bjj', k, id };
  const chipsN = (f, max) => `<div class="chips chips-tight">${Array.from({ length: max + 1 }, (_, i) => i).map((v) => `<button class="chip chip-xs${j[f] === v ? ' is-on' : ''}" data-a="bjj-val" data-f="${f}" data-v="${v}">${v === max ? max + '+' : v}</button>`).join('')}</div>`;
  openSheet(`<h3 class="sheet-title">${icon('swords')} BJJ · ${esc(fmtDate(k, { weekday: 'short', day: 'numeric', month: 'short' }))}</h3>
    <h5>Techniken</h5><textarea class="note" rows="2" data-c="bjj-tech" placeholder="z. B. Armbar aus der Guard, Hip Escape">${esc((j.tech || []).join(', '))}</textarea><p class="hint">Mit Komma trennen – jede Technik wird eine Wiederholungskarte.</p>
    <h5>Rolls</h5>${chipsN('rolls', 8)}<h5>Abgeklopft (du)</h5>${chipsN('tapped', 6)}<h5>Submissions (du)</h5>${chipsN('subs', 6)}
    <h5>Knie danach</h5><p class="hint">0 = kein Schmerz, 10 = stärkster</p>${scale0('bjj-knee', j.knee ?? null, k)}
    <h5>Notiz</h5><textarea class="note" rows="2" data-c="bjj-note" placeholder="Was lief gut, woran arbeiten?">${esc(j.note || '')}</textarea>
    <div class="sheet-acts"><button class="btn is-accent" data-a="bjj-done">Fertig</button></div>`);
}
function bjjMut(fn) { const s = ui.sheet; if (!s || s.type !== 'bjj') return; mutDay(s.k, (d) => { const t = (d.trainings || []).find((x) => x.id === s.id); if (t) { t.bjj = t.bjj || {}; fn(t.bjj); } }); }
function bjjSectionHTML() {
  const c = bjjCfg(), tr = [];
  for (const k of Object.keys(S.days).sort().reverse()) for (const t of S.days[k].trainings || []) if (isBjj(t) && t.bjj) tr.push({ k, t });
  let h = `<section class="sec"><div class="sec-head"><h2>${icon('swords')} BJJ</h2><span class="count">${c.cards.length} Technik-Karten</span></div>
    <div class="chips chips-tight"><span class="hint">Gürtel:</span>${['Weiß', 'Blau', 'Lila', 'Braun', 'Schwarz'].map((b) => `<button class="chip chip-xs${c.belt === b ? ' is-on' : ''}" data-a="bjj-belt" data-v="${b}">${b}</button>`).join('')}</div>
    <div class="chips chips-tight"><span class="hint">Streifen:</span>${[0, 1, 2, 3, 4].map((n) => `<button class="chip chip-xs${c.stripes === n ? ' is-on' : ''}" data-a="bjj-stripes" data-v="${n}">${n}</button>`).join('')}</div>`;
  if (tr.length) h += `<div class="list">${tr.slice(0, 6).map(({ k, t }) => `<button class="row" data-a="bjj-open" data-id="${t.id}" data-date="${k}"><span class="row-main"><b>${esc(fmtDate(k, { weekday: 'short', day: 'numeric', month: 'short' }))}${t.bjj.rolls != null ? ` · ${t.bjj.rolls} Rolls` : ''}</b><small>${esc((t.bjj.tech || []).join(', ') || t.bjj.note || 'ohne Notiz')}</small></span>${icon('chevron-right')}</button>`).join('')}</div>`;
  else h += '<p class="hint">Nach jeder BJJ-Einheit fragt die App kurz nach Techniken und Rolls.</p>';
  return h + '</section>';
}

/* ---------- Athletik-Profil ---------- */
const ATH_TESTS = [
  { id: 'pull', n: 'Klimmzüge', unit: 'Wdh.', hi: true, how: 'Sauber aus dem Hang, Kinn über die Stange.' },
  { id: 'push', n: 'Liegestütze', unit: 'Wdh.', hi: true, how: 'Brust bis eine Faust über dem Boden, ohne Pause.' },
  { id: 'plank', n: 'Unterarmstütz', unit: 'Sek.', hi: true, how: 'Bis die Hüfte absinkt.' },
  { id: 'jump', n: 'Sprung', unit: 'cm', hi: true, how: 'Standweitsprung beidbeinig, bester von 3 – nur mit stabilem Knie.' },
  { id: 'grip', n: 'Griffkraft', unit: 'kg', hi: true, how: 'Handdynamometer, bessere Hand, bester von 3.' },
  { id: 'ergo', n: '2 km Ergo', unit: 'Min.', hi: false, how: '2 km so schnell wie möglich auf dem Ergometer.' },
  { id: 'rhr', n: 'Ruhepuls', unit: 'bpm', hi: false, how: 'Ø der letzten 7 Nächte (kommt von Garmin, wenn leer).' },
];
function athTests() { return (S.settings.athTests || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1)); }
function rhr7(k = todayKey()) { const v = rangeKeys(7, k).map((x) => Number(((peekDay(x) || {}).health || {}).rhr)).filter((x) => x > 25); return v.length >= 3 ? Math.round(mean(v)) : null; }
function radarSVG(tests) {
  const n = ATH_TESTS.length, cx = 110, cy = 105, R = 78;
  const best = {}; for (const a of ATH_TESTS) { const v = tests.map((t) => Number(t.v[a.id])).filter((x) => x > 0); if (v.length) best[a.id] = a.hi ? Math.max(...v) : Math.min(...v); }
  const pt = (i, f) => { const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(ang) * R * f, cy + Math.sin(ang) * R * f]; };
  let s = `<svg class="radar" viewBox="-34 -6 288 228" role="img" aria-label="Athletik-Profil">`;
  for (const f of [0.25, 0.5, 0.75, 1]) s += `<polygon class="grid" points="${ATH_TESTS.map((_, i) => pt(i, f).join(',')).join(' ')}"/>`;
  ATH_TESTS.forEach((a, i) => { const [x, y] = pt(i, 1.17); s += `<text class="tick" x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle">${esc(a.n)}</text>`; });
  const poly = (t, cls) => { const p = ATH_TESTS.map((a, i) => { const v = Number(t.v[a.id]), b = best[a.id]; const f = v > 0 && b ? (a.hi ? v / b : b / v) : 0; return pt(i, clamp(f, 0.05, 1)).map((z) => z.toFixed(1)).join(','); }).join(' '); return `<polygon class="${cls}" points="${p}"/>`; };
  if (tests.length >= 2) s += poly(tests[tests.length - 2], 'rd-prev');
  if (tests.length) s += poly(tests[tests.length - 1], 'rd-cur');
  return s + '</svg>';
}
function athProfileHTML() {
  const tests = athTests(), last = tests[tests.length - 1], due = !last || daysBetween(last.date, todayKey()) >= 90;
  let h = `<section class="sec"><div class="sec-head"><h2>${icon('radar')} Athletik-Profil</h2><span class="count">${last ? `zuletzt ${esc(dShort(last.date))}` : 'noch kein Test'}</span></div>
    <p class="sec-sub">Alle 3 Monate dieselben Tests – das Netz zeigt, wo du stärker wirst (außen = dein bester Wert).${due ? ' <b>Test fällig.</b>' : ''}</p>
    <div class="row-btns"><button class="pill-btn${due ? ' is-accent' : ''}" data-a="ath-open">Test eintragen</button></div>`;
  if (tests.length) {
    h += radarSVG(tests) + `<div class="legend"><span><i class="line-key" style="background:var(--accent)"></i>${esc(dShort(last.date))}</span>${tests.length >= 2 ? `<span><i class="line-key" style="background:${SERIES.two}"></i>${esc(dShort(tests[tests.length - 2].date))}</span>` : ''}</div>`;
    h += `<div class="table-wrap"><table class="grid-t"><tr><th></th>${tests.slice(-3).map((t) => `<th>${shortDate(t.date)}</th>`).join('')}</tr>${ATH_TESTS.map((a) => `<tr><td>${esc(a.n)}</td>${tests.slice(-3).map((t) => `<td>${t.v[a.id] != null ? fmt(t.v[a.id], a.id === 'ergo' ? 1 : 0) : '–'}</td>`).join('')}</tr>`).join('')}</table></div>`;
  }
  return h + '</section>';
}
function sheetAth() {
  const k = todayKey(), t = (S.settings.athTests || []).find((x) => x.date === k) || { date: k, v: { rhr: rhr7(k) } };
  ui.sheet = { type: 'ath' };
  openSheet(`<h3 class="sheet-title">${icon('radar')} Athletik-Test · ${esc(fmtDate(k, { day: 'numeric', month: 'long' }))}</h3><p class="hint">Ausgeruht, gut aufgewärmt, immer in derselben Reihenfolge. Leere Felder sind okay.</p>
    <div class="form">${ATH_TESTS.map((a) => `<div class="frow"><span class="flabel">${esc(a.n)}<small>${esc(a.how)}</small></span><div class="fin"><input type="text" inputmode="decimal" data-c="ath-val" data-f="${a.id}" value="${numIn(t.v[a.id], a.id === 'ergo' ? 1 : 0)}" placeholder="–"><span class="unit">${a.unit}</span></div></div>`).join('')}</div>
    <div class="sheet-acts"><button class="btn is-accent" data-a="ath-done">Fertig</button></div>`);
}

/* ---------- Ausdauer: eigener Ergo-Test & Programme ---------- */
function ergoTests() { return (S.settings.ergoTests || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1)); }
function ergoTestHTML() {
  const t = ergoTests(), last = t[t.length - 1];
  let h = `<section class="sec"><div class="sec-head"><h2>${icon('heart-pulse')} Ausdauer-Test</h2><span class="count">${last ? `zuletzt ${esc(dShort(last.date))}` : 'monatlich'}</span></div>
    <p class="sec-sub">Die VO2max-Schätzung deiner Uhr braucht Läufe draußen mit GPS oder Radfahren mit Leistungsmesser – ohne Läufe bleibt sie stehen. Deshalb ein eigener Test: 10 Min. einrollen, dann 20 Min. so fahren, dass der Puls bei etwa 150 liegt. Steigen die Watt bei gleichem Puls, wird dein Herz-Kreislauf-System fitter.</p>
    <div class="form"><div class="frow"><span class="flabel">Ø Watt (20 Min.)</span><div class="fin"><input type="text" inputmode="numeric" data-c="ergo-test" data-f="w" value="${last && last.date === todayKey() ? last.w ?? '' : ''}" placeholder="${last ? 'zuletzt ' + last.w : '–'}"><span class="unit">W</span></div></div>
    <div class="frow"><span class="flabel">Ø Puls</span><div class="fin"><input type="text" inputmode="numeric" data-c="ergo-test" data-f="hr" value="${last && last.date === todayKey() ? last.hr ?? '' : ''}" placeholder="150"><span class="unit">bpm</span></div></div></div>`;
  if (t.length >= 2) h += lineChart({ keys: t.map((x) => x.date), series: [{ name: 'Watt je Herzschlag', color: SERIES.one, vals: t.map((x) => (x.w && x.hr ? Math.round((x.w / x.hr) * 100) / 100 : null)), dots: true }], unit: 'W/bpm', fmtY: (v) => fmt(v, 2) });
  return h + '</section>';
}
const ERGO_PROGS = {
  '4x4': { n: '4×4-Intervalle', sub: 'hebt die VO2max stärker als lockeres Training (Helgerud 2007)', ph: [['Einfahren', 600, 0.6, 0.7], ...[1, 2, 3, 4].flatMap((i) => [[`Intervall ${i}/4 – hart`, 240, 0.9, 0.95], ...(i < 4 ? [[`Pause ${i}/3 – locker`, 180, 0.6, 0.7]] : [])]), ['Ausfahren', 300, 0.5, 0.6]] },
  z2: { n: 'Zone 2 (40 Min.)', sub: 'locker, du kannst noch ganze Sätze sprechen', ph: [['Einfahren', 300, 0.55, 0.65], ['Zone 2', 2100, 0.6, 0.7], ['Ausfahren', 0, 0.5, 0.6]].filter((p) => p[1] > 0) },
};
function hrMaxEst() { const p = S.settings.profile || {}; if (Number(p.hrMax) > 120) return Number(p.hrMax); const a = Number(p.age); return a > 10 && a < 90 ? Math.round(208 - 0.7 * a) : null; }
function ergoProgHTML() {
  const hm = hrMaxEst();
  return `<section class="sec"><div class="sec-head"><h2>${icon('bike')} Ergometer-Programme</h2></div>
    <div class="list">${Object.entries(ERGO_PROGS).map(([id, p]) => `<button class="row" data-a="ergo-start" data-v="${id}"><span class="row-main"><b>${esc(p.n)}</b><small>${esc(p.sub)} · ${Math.round(p.ph.reduce((a, x) => a + x[1], 0) / 60)} Min.</small></span>${icon('play')}</button>`).join('')}</div>
    <p class="hint">Der Timer sagt dir die Phase und den Pulsbereich${hm ? ` (HFmax geschätzt ${hm})` : ' (für Pulszahlen dein Alter im Profil eintragen)'}. Danach wird die Einheit als Ergometer eingetragen.</p></section>`;
}
const ERGO = { prog: null, i: 0, end: 0, t: null, start: 0 };
function ergoStart(id) {
  const p = ERGO_PROGS[id];
  if (!p) return;
  try { REST.ctx = REST.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (REST.ctx.state === 'suspended') REST.ctx.resume(); } catch (e) { /* ohne Ton */ }
  Object.assign(ERGO, { prog: id, i: 0, start: Date.now(), end: Date.now() + p.ph[0][1] * 1000 });
  let el = document.getElementById('ergo');
  if (!el) { el = document.createElement('div'); el.id = 'ergo'; el.className = 'cam ergo'; document.body.appendChild(el); }
  document.documentElement.classList.add('noscroll');
  clearInterval(ERGO.t); ERGO.t = setInterval(ergoTick, 500); ergoTick();
}
function ergoTick() {
  const p = ERGO_PROGS[ERGO.prog], el = document.getElementById('ergo');
  if (!p || !el) { clearInterval(ERGO.t); return; }
  let left = Math.ceil((ERGO.end - Date.now()) / 1000);
  if (left <= 0) {
    ERGO.i++;
    if (ERGO.i >= p.ph.length) { ergoStop(true); return; }
    ERGO.end = Date.now() + p.ph[ERGO.i][1] * 1000; left = p.ph[ERGO.i][1];
    restBeep();
  }
  const [n, , lo, hi] = p.ph[ERGO.i], hm = hrMaxEst(), next = p.ph[ERGO.i + 1];
  el.innerHTML = `<div class="ergo-box"><small>${esc(p.n)} · Phase ${ERGO.i + 1}/${p.ph.length}</small><b class="ergo-ph">${esc(n)}</b><div class="ergo-time">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</div>
    <p>${hm ? `Puls ${Math.round(hm * lo)}–${Math.round(hm * hi)}` : `${Math.round(lo * 100)}–${Math.round(hi * 100)} % HFmax`}</p>${next ? `<small>danach: ${esc(next[0])}</small>` : ''}
    <div class="row-btns"><button class="pill-btn" data-a="ergo-skip">Phase überspringen</button><button class="pill-btn" data-a="ergo-stop">Beenden</button></div></div>`;
}
function ergoStop(done) {
  clearInterval(ERGO.t);
  const p = ERGO_PROGS[ERGO.prog], min = Math.round((Date.now() - ERGO.start) / 60000);
  const el = document.getElementById('ergo'); if (el) el.remove();
  document.documentElement.classList.remove('noscroll');
  if (p && min >= 5) {
    const k = todayKey();
    mutDay(k, (d) => { d.trainings = d.trainings || []; d.trainings.push({ id: uid(), type: 'Ergometer', time: minToTime(Math.max(0, nowMin() - min)), dur: min, note: p.n, int: ERGO.prog === '4x4' ? 8 : 4 }); });
    toast(`${p.n} eingetragen (${min} Min.)${done ? ' – stark!' : ''}`);
  }
  ERGO.prog = null;
  render();
}

/* ---------- Ansicht „Athletik“ im Training ---------- */
function vTrainAthletik() { return athProfileHTML() + ergoTestHTML() + ergoProgHTML() + bjjSectionHTML(); }

Object.assign(A, {
  'knee-loc': (el) => { const k = curDate(el), v = el.dataset.v; kneeMut(k, (kn) => { kn.loc = kn.loc || []; kn.loc = kn.loc.includes(v) ? kn.loc.filter((x) => x !== v) : [...kn.loc, v]; if (!kn.loc.length) delete kn.loc; }); render(); },
  'knee-trig': (el) => { const k = curDate(el), v = el.dataset.v; kneeMut(k, (kn) => { kn.trig = kn.trig || []; kn.trig = kn.trig.includes(v) ? kn.trig.filter((x) => x !== v) : [...kn.trig, v]; if (!kn.trig.length) delete kn.trig; }); render(); },
  'kcheck-open': () => sheetKneeCheck(),
  kcheck: (el) => {
    const k = todayKey(), list = S.settings.kneeCheck = (S.settings.kneeCheck || []).slice();
    let e = list.find((x) => x.date === k); if (!e) { e = { date: k, a: {} }; list.push(e); }
    e.a = { ...e.a, [el.dataset.id]: Number(el.dataset.v) }; e.sum = Object.values(e.a).reduce((a, b) => a + b, 0);
    markDirty('settings'); sheetKneeCheck();
  },
  'kcheck-done': () => { closeSheet(); render(); },
  'unk-type': (el) => { const v = el.dataset.v; mutDay(el.dataset.date, (d) => { const t = (d.trainings || []).find((x) => x.id === el.dataset.id); if (t) { if (v) t.type = v; t.asked = 1; } }); invalidate(); render(); toast(v ? `Als ${v} eingetragen` : 'Bleibt „Sonstiges“'); },
  'bjj-open': (el) => sheetBjj(el.dataset.date, el.dataset.id),
  'bjj-skip': (el) => { mutDay(el.dataset.date, (d) => { const t = (d.trainings || []).find((x) => x.id === el.dataset.id); if (t) t.bjjSkip = 1; }); render(); },
  'bjj-val': (el) => { const f = el.dataset.f, v = Number(el.dataset.v); bjjMut((j) => { if (j[f] === v) delete j[f]; else j[f] = v; }); const s = ui.sheet; sheetBjj(s.k, s.id); },
  'bjj-knee': (el) => { const v = Number(el.dataset.v); bjjMut((j) => { j.knee = j.knee === v ? undefined : v; }); const s = ui.sheet; sheetBjj(s.k, s.id); },
  'bjj-done': () => { closeSheet(); render(); },
  'bjj-rep': (el) => {
    const c = S.settings.bjj = bjjCfg(), card = c.cards.find((x) => x.id === el.dataset.id);
    if (!card) return;
    card.step = el.dataset.v === '1' ? Math.min((card.step || 0) + 1, BJJ_STEPS.length - 1) : 0;
    card.due = addDays(todayKey(), BJJ_STEPS[card.step]);
    saveSettings(); toast(el.dataset.v === '1' ? `Wieder in ${BJJ_STEPS[card.step]} Tagen` : 'Morgen nochmal');
  },
  'bjj-belt': (el) => { S.settings.bjj = { ...bjjCfg(), belt: el.dataset.v }; saveSettings(); },
  'bjj-stripes': (el) => { S.settings.bjj = { ...bjjCfg(), stripes: Number(el.dataset.v) }; saveSettings(); },
  'ath-open': () => sheetAth(),
  'ath-done': () => { closeSheet(); render(); },
  'ergo-start': (el) => ergoStart(el.dataset.v),
  'ergo-skip': () => { ERGO.end = Date.now(); ergoTick(); },
  'ergo-stop': () => ergoStop(false),
});
Object.assign(C, {
  'bjj-tech': (el) => {
    const tech = el.value.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 12);
    bjjMut((j) => { j.tech = tech; });
    const c = S.settings.bjj = bjjCfg();
    for (const n of tech) if (!c.cards.some((x) => x.n.toLowerCase() === n.toLowerCase())) c.cards.push({ id: uid(), n, step: 0, due: addDays(todayKey(), 1), from: ui.sheet && ui.sheet.k });
    markDirty('settings'); flashSaved(el);
  },
  'bjj-note': (el) => { const v = el.value.trim(); bjjMut((j) => { if (v) j.note = v; else delete j.note; }); flashSaved(el); },
  'ath-val': (el) => {
    const k = todayKey(), v = el.value.trim() === '' ? null : parseNum(el.value);
    if (el.value.trim() !== '' && (v == null || v < 0 || v > 10000)) { toast('Wert prüfen'); el.classList.add('bad'); return; }
    el.classList.remove('bad');
    const list = S.settings.athTests = (S.settings.athTests || []).slice();
    let t = list.find((x) => x.date === k); if (!t) { t = { date: k, v: {} }; const r = rhr7(k); if (r) t.v.rhr = r; list.push(t); }
    t.v = { ...t.v }; if (v == null) delete t.v[el.dataset.f]; else t.v[el.dataset.f] = v;
    markDirty('settings'); flashSaved(el);
  },
  'ergo-test': (el) => {
    const k = todayKey(), v = el.value.trim() === '' ? null : parseNum(el.value), f = el.dataset.f;
    if (v != null && (v < (f === 'hr' ? 60 : 20) || v > (f === 'hr' ? 220 : 800))) { toast('Wert prüfen'); el.classList.add('bad'); return; }
    el.classList.remove('bad');
    const list = S.settings.ergoTests = (S.settings.ergoTests || []).slice();
    let t = list.find((x) => x.date === k); if (!t) { t = { date: k }; list.push(t); }
    if (v == null) delete t[f]; else t[f] = v;
    markDirty('settings'); flashSaved(el);
  },
});
