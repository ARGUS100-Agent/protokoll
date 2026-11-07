/* ============================================================
   OBERFLÄCHE Teil 4: Haut, Körper, Blutwerte, Garmin, Einkauf,
   Wochenrückblick, neue Einstellungen
   ============================================================ */
const PHASE_COLORS = ['#3987e5', '#199e70', '#d95926', '#8f9bb8'];
function isoWeek(k) { const d = parseKey(k); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 86400000 + 1) / 7); }

/* ============================================================
   HAUT
   ============================================================ */
function vHaut2() {
  const sub = getSub('haut', 'heute');
  let h = areaHead('haut') + subnav('haut', sub, [['heute', 'Heute'], ['fotos', 'Wochenfotos'], ['verlauf', 'Verlauf']]);
  if (sub === 'heute') h += dateBar(ui.date) + vHautToday(ui.date);
  else if (sub === 'fotos') h += vHautFotos();
  else h += vHautVerlauf();
  return h;
}
function skinLabel(v) { return v == null ? 'noch nicht bewertet' : v <= 3 ? 'schlecht' : v <= 6 ? 'mittel' : v <= 8 ? 'gut' : 'sehr gut'; }
function phaseCard(k) {
  const phases = S.settings.skin.phases;
  const ph = skinPhase(k);
  const first = phases[0], last = phases[phases.length - 1];
  const next = phases.find((p) => p.start > k);
  let status;
  if (ph) status = `${esc(ph.n)}, Tag ${ph.day} von ${ph.len}`;
  else if (first && k < first.start) status = `Start am ${esc(fmtDate(first.start, { day: 'numeric', month: 'long' }))}`;
  else status = 'Protokoll abgeschlossen';
  let count = '';
  if (next) { const n = daysBetween(k, next.start); count = `<div class="countdown"><b>${n}</b><span>${n === 1 ? 'Tag' : 'Tage'} bis ${esc(next.n)} (${esc(fmtDate(next.start, { day: 'numeric', month: 'short' }))})<small>${esc(next.rules.join(', '))}</small></span></div>`; }
  else if (ph && last) { const n = daysBetween(k, last.end); count = `<div class="countdown"><b>${n}</b><span>${n === 1 ? 'Tag' : 'Tage'} bis zum Ende (${esc(fmtDate(last.end, { day: 'numeric', month: 'short' }))})</span></div>`; }
  return `<section class="phase-card">
    <div class="phase-top"><h2>Haut-Protokoll</h2><span class="count">${status}</span></div>
    <div class="phase-bar">${phases.map((p, i) => { const len = daysBetween(p.start, p.end) + 1; const done = k > p.end ? 1 : k < p.start ? 0 : (daysBetween(p.start, k) + 1) / len; return `<div class="phase-seg${ph && ph.id === p.id ? ' is-now' : ''}" style="flex:${len};--pc:${PHASE_COLORS[i % 4]}"><i style="width:${done * 100}%"></i><span>${esc(p.n)}</span></div>`; }).join('')}</div>
    ${ph ? `<ul class="rules">${ph.rules.map((r) => `<li>${icon('check')}${esc(r)}</li>`).join('')}</ul>` : ''}${count}</section>`;
}
function vHautToday(k) {
  const d = getDay(k), sk = d.skin || {};
  let h = phaseCard(k);
  const wd = weekday(k);
  if ((wd === 6 || wd === 0) && k === todayKey()) {
    const ws = wd === 6 ? weekStart(k) : weekStart(addDays(k, -1));
    const n = photosOfWeek(ws).length;
    if (n < 4) h += `<div class="banner">${icon('camera')}<div><b>Wochenfoto${wd === 0 ? ' nachholen' : ''}</b><span>${n}/4 Fotos für die Woche ab ${esc(fmtDate(ws, { day: 'numeric', month: 'short' }))}: frontal, links, rechts, Hals von unten.</span></div><button class="pill-btn" data-a="photo-week-go" data-ws="${ws}">Fotos</button></div>`;
  }
  const v = sk.score ?? null;
  h += `<section class="sec"><div class="sec-head"><h2>Hautscore</h2><span class="count">1 sehr schlecht, 10 sehr gut</span></div>
    <div class="slider-wrap${v == null ? ' is-unset' : ''}" id="skin-slider"><div class="slider-val"><b id="skin-val">${v ?? '–'}</b><small id="skin-lbl">${skinLabel(v)}</small></div>
    <input type="range" min="1" max="10" step="1" value="${v ?? 5}" data-i="skin-range" data-c="skin-range" data-date="${k}" aria-label="Hautscore von 1 bis 10">
    <div class="slider-ticks">${Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `<button class="${v === n ? 'is-on' : ''}" data-a="skin-score" data-v="${n}" data-date="${k}" aria-label="${n}">${n}</button>`).join('')}</div></div></section>`;
  h += `<section class="sec"><div class="sec-head"><h2>Stellen</h2><span class="count">neue Pickel oder Rötung</span></div><div class="chips">${SKIN_AREAS.map((a) => `<button class="chip${(sk.areas || []).includes(a) ? ' is-on' : ''}" data-a="skin-area" data-v="${esc(a)}" data-date="${k}">${esc(a)}</button>`).join('')}</div>
    <div class="chips chips-tight spots"><span class="hint">Neue Pickel:</span>${[0, 1, 2, 3, 4, 5].map((n) => `<button class="chip chip-xs${sk.spots === n ? ' is-on' : ''}" data-a="skin-spots" data-v="${n}" data-date="${k}">${n === 5 ? '5+' : n}</button>`).join('')}</div></section>`;
  h += `<section class="sec"><div class="sec-head"><h2>Notiz</h2></div><textarea class="note" rows="2" data-c="skin-note" data-date="${k}" placeholder="z. B. Rötung an der Kieferlinie nach der Rasur">${esc(sk.note || '')}</textarea></section>`;
  h += `<section class="sec"><div class="sec-head"><h2>Routine</h2></div><div class="toggle-grid">${S.settings.skin.routine.filter((r) => r.id !== 'foto').map((r) => {
    const on = !!sk[r.id], ld = lastDone(r.id, k);
    const due = r.every && (ld == null || ld >= r.every) && !on;
    const sub = r.every ? (on ? 'heute erledigt' : ld == null ? `alle ${r.every} Tage` : `zuletzt vor ${ld} ${ld === 1 ? 'Tag' : 'Tagen'}`) : '';
    return `<button class="tgl${on ? ' is-on' : ''}${due ? ' is-due' : ''}" data-a="skin-check" data-id="${r.id}" data-date="${k}" aria-pressed="${on}"><span class="tgl-box">${icon('check')}</span><span class="tgl-txt"><b>${esc(r.n)}</b>${sub ? `<small>${due ? 'fällig, ' : ''}${esc(sub)}</small>` : ''}</span></button>`;
  }).join('')}<button class="tgl${d.habits.gesicht ? ' is-on' : ''}" data-a="habit" data-id="gesicht" data-date="${k}" aria-pressed="${!!d.habits.gesicht}"><span class="tgl-box">${icon('check')}</span><span class="tgl-txt"><b>Gesicht nach dem Gym gewaschen</b></span></button></div></section>`;
  h += `<div class="mlist">${topicRow('skin', 'So funktioniert das Protokoll')}</div>`;
  return h;
}
function vHautFotos() {
  if (!photoIdx.loaded) { loadPhotoIndex().then(() => { if (ui.tab === 'haut') render(); }); return '<p class="hint">Fotos werden geladen …</p>'; }
  if (!PhotoDB.ok) return emptyState('Fotos können auf diesem Gerät nicht gespeichert werden (kein IndexedDB).');
  const ws = ui.photoWeek;
  const isCur = ws === weekStart(todayKey());
  let h = `<div class="week-nav"><button class="icon-btn" data-a="photo-week" data-d="-7" aria-label="Vorherige Woche">${icon('chevron-left')}</button><span>KW ${isoWeek(ws)} · ${esc(fmtDate(ws, { day: 'numeric', month: 'short' }))} – ${esc(fmtDate(addDays(ws, 6), { day: 'numeric', month: 'short' }))}</span><button class="icon-btn" data-a="photo-week" data-d="7" ${isCur ? 'disabled' : ''} aria-label="Nächste Woche">${icon('chevron-right')}</button></div>`;
  h += `<p class="sec-sub">Sonntagmorgens, gleiches Licht, gleicher Abstand. Die Bilder bleiben nur auf diesem iPhone.</p><div class="ph-grid">`;
  for (const a of PHOTO_ANGLES) {
    const key = photoKey(ws, a.id);
    const has = photoIdx.keys.includes(key);
    h += has ? `<div class="ph-slot"><button class="ph" data-a="photo-view" data-key="${key}" aria-label="${esc(a.n)} ansehen"><img data-photo="${key}" alt="${esc(a.n)}"></button><div class="ph-cap"><b>${esc(a.n)}</b><label class="link-btn">Ersetzen<input type="file" accept="image/*" data-c="photo-up" data-angle="${a.id}" data-ws="${ws}" hidden></label></div></div>`
      : `<div class="ph-slot"><label class="ph is-add">${icon('camera')}<span>${esc(a.n)}</span><input type="file" accept="image/*" data-c="photo-up" data-angle="${a.id}" data-ws="${ws}" hidden></label><div class="ph-cap"><b>${esc(a.n)}</b><small>fehlt</small></div></div>`;
  }
  h += '</div>';
  const weeks = photoWeeks();
  if (weeks.length >= 2) {
    const cmp = ui.photoCmp && weeks.includes(ui.photoCmp[0]) && weeks.includes(ui.photoCmp[1]) ? ui.photoCmp : [weeks[weeks.length - 1], weeks[0]];
    const opt = (sel, i) => `<label class="choice-select">${icon('chevron-down')}<select data-c="photo-cmp" data-i="${i}" aria-label="Woche ${i + 1}">${weeks.map((w) => `<option value="${w}" ${w === sel ? 'selected' : ''}>KW ${isoWeek(w)} (${fmtDate(w, { day: 'numeric', month: 'short' })})</option>`).join('')}</select></label>`;
    h += `<section class="sec"><div class="sec-head"><h2>Vergleich</h2></div><div class="cmp-sel">${opt(cmp[0], 0)}${opt(cmp[1], 1)}</div>
      ${PHOTO_ANGLES.map((a) => `<div class="cmp-row"><span class="cmp-l">${esc(a.n)}</span><div class="cmp-pair">${cmp.map((w) => { const key = photoKey(w, a.id); return photoIdx.keys.includes(key) ? `<button class="ph" data-a="photo-view" data-key="${key}"><img data-photo="${key}" alt=""></button>` : '<div class="ph is-empty"><span>–</span></div>'; }).join('')}</div></div>`).join('')}</section>`;
  }
  if (weeks.length) {
    h += `<section class="sec"><div class="sec-head"><h2>Galerie</h2><span class="count">${weeks.length} ${weeks.length === 1 ? 'Woche' : 'Wochen'}</span></div><div class="list">${weeks.map((w) => `<button class="row gal-row" data-a="photo-week-go" data-ws="${w}"><span class="row-main"><b>KW ${isoWeek(w)}</b><small>${esc(fmtDate(w, { day: 'numeric', month: 'short', year: 'numeric' }))} · ${photosOfWeek(w).length}/4</small></span><span class="gal-thumbs">${photosOfWeek(w).map((a) => `<img data-photo="${photoKey(w, a)}" alt="">`).join('')}</span></button>`).join('')}</div>
      <p class="hint">Fotos sind nicht im normalen Backup (zu groß). Unter Einstellungen → Backup & Daten kannst du sie als ZIP sichern.</p></section>`;
  }
  return h;
}
function sheetPhoto(key) {
  const [ws, angle] = key.split('|');
  const a = PHOTO_ANGLES.find((x) => x.id === angle);
  ui.sheet = { type: 'photo', key };
  openSheet(`<h3 class="sheet-title">${esc(a ? a.n : angle)}</h3><p class="hint">KW ${isoWeek(ws)}, Woche ab ${esc(fmtDate(ws, { day: 'numeric', month: 'long', year: 'numeric' }))}</p>
    <div class="ph-full"><img data-photo="${key}" data-full="1" alt=""></div>
    <div class="sheet-acts"><button class="btn is-danger" data-a="photo-del" data-key="${key}">Foto löschen</button></div>`);
  hydratePhotos($('#sheet'));
}
function skinChart() {
  const phases = S.settings.skin.phases;
  if (!phases.length) return emptyChart('Keine Phasen angelegt.');
  const start = phases[0].start, end = phases[phases.length - 1].end;
  const today = todayKey();
  const last = today < end ? today : end;
  if (last < start) return emptyChart(`Das Protokoll startet am ${fmtDate(start, { day: 'numeric', month: 'long' })}.`);
  const keys = [];
  for (let k = start; k <= last; k = addDays(k, 1)) keys.push(k);
  const W = CH.W, H = 190, { padL, padR, padT, padB } = CH;
  const n = Math.max(2, daysBetween(start, end) + 1);
  const X = (k) => padL + (daysBetween(start, k) / (n - 1)) * (W - padL - padR);
  const Y = (v) => padT + (1 - v / 10) * (H - padT - padB);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hautscore-Verlauf mit Phasen">`;
  phases.forEach((p, i) => { const x0 = X(p.start), x1 = X(p.end); s += `<rect x="${x0}" y="${padT}" width="${Math.max(1, x1 - x0)}" height="${H - padT - padB}" fill="${PHASE_COLORS[i % 4]}" opacity=".13"/><text class="tick" x="${(x0 + x1) / 2}" y="${padT + 11}" text-anchor="middle" fill="${PHASE_COLORS[i % 4]}">${esc(p.n)}</text>`; });
  for (const t of [0, 2, 4, 6, 8, 10]) s += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${Y(t)}" y2="${Y(t)}"/><text class="tick" x="${padL - 6}" y="${Y(t) + 3.5}" text-anchor="end">${t}</text>`;
  let d = '', pen = false;
  for (const k of keys) { const v = (peekDay(k) || {}).skin ? peekDay(k).skin.score : null; if (v == null) { pen = false; continue; } d += `${pen ? 'L' : 'M'}${X(k).toFixed(1)},${Y(v).toFixed(1)}`; pen = true; }
  s += `<path d="${d}" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>`;
  for (const k of keys) { const sk = (peekDay(k) || {}).skin; if (!sk || sk.score == null) continue; s += `<circle cx="${X(k)}" cy="${Y(sk.score)}" r="3" fill="var(--ink)"/><rect x="${X(k) - 4}" y="${padT}" width="8" height="${H - padT - padB}" fill="transparent" data-tip="${esc(`${fmtDate(k, { weekday: 'short', day: 'numeric', month: 'short' })}\nHautbild ${sk.score}${sk.spots != null ? `, ${sk.spots} neue Pickel` : ''}`)}"/>`; }
  s += `<text class="tick" x="${padL}" y="${H - 8}">${shortDate(start)}</text><text class="tick" x="${W - padR}" y="${H - 8}" text-anchor="end">${shortDate(end)}</text>`;
  return s + '</svg>';
}
function vHautVerlauf() {
  const phases = S.settings.skin.phases;
  const all = Object.keys(S.days).sort();
  const rows = phases.map((p, i) => {
    const ks = all.filter((k) => k >= p.start && k <= p.end);
    const sc = ks.map((k) => S.days[k].skin && S.days[k].skin.score).filter((v) => v != null);
    const sp = ks.map((k) => S.days[k].skin && S.days[k].skin.spots).filter((v) => v != null);
    return { p, i, n: sc.length, score: mean(sc), spots: mean(sp) };
  });
  let h = `<section class="sec chart-card"><div class="sec-head"><h2>Hautscore</h2></div><div class="chart-box">${skinChart()}</div>
    <div class="legend">${phases.map((p, i) => `<span><i style="background:${PHASE_COLORS[i % 4]}"></i>${esc(p.n)}: ${esc(p.rules.slice(0, 2).join(', '))}</span>`).join('')}</div></section>`;
  h += `<section class="sec"><div class="sec-head"><h2>Durchschnitt je Phase</h2></div><div class="phase-avg">${rows.map((r) => `<div class="pa-row"><span class="pa-n">${esc(r.p.n)}</span><span class="pa-bar"><i style="width:${r.score != null ? r.score * 10 : 0}%;background:${PHASE_COLORS[r.i % 4]}"></i></span><b>${r.score != null ? fmt(r.score, 1) : '–'}</b></div>`).join('')}</div>
    <div class="table-wrap"><table><tr><th>Phase</th><th>Ø Hautbild</th><th>Ø neue Pickel</th><th>Tage</th></tr>${rows.map((r) => `<tr><td>${esc(r.p.n)}</td><td>${r.score != null ? fmt(r.score, 1) : '–'}</td><td>${r.spots != null ? fmt(r.spots, 1) : '–'}</td><td>${r.n}</td></tr>`).join('')}</table></div></section>`;
  const after = [], noAg = [];
  for (const k of all) { const prev = peekDay(addDays(k, -1)), d = S.days[k]; if (!d.skin || d.skin.score == null || !prev) continue; (prev.checks && prev.checks.m_ag1 ? after : noAg).push(d.skin.score); }
  h += `<p class="sec-sub">${after.length >= 3 && noAg.length >= 3 ? `Hautbild am Tag nach AG1: Ø ${fmt(mean(after), 1)} (${after.length} Tage) gegenüber Ø ${fmt(mean(noAg), 1)} ohne AG1 am Vortag (${noAg.length}).` : 'Der Vergleich „Tag nach AG1“ erscheint ab je 3 bewerteten Tagen.'}</p>`;
  const areas = {};
  for (const k of all) for (const a of (S.days[k].skin || {}).areas || []) areas[a] = (areas[a] || 0) + 1;
  const ar = Object.entries(areas).sort((a, b) => b[1] - a[1]);
  if (ar.length) h += `<section class="sec"><div class="sec-head"><h2>Häufigste Stellen</h2></div><div class="chips">${ar.map(([a, n]) => `<span class="chip is-static">${esc(a)} · ${n}×</span>`).join('')}</div></section>`;
  return h;
}

/* ============================================================
   KÖRPER
   ============================================================ */
function vKoerper() {
  const k = ui.date, d = getDay(k);
  let h = areaHead('koerper') + dateBar(k);
  if (weekday(k) === 6) h += `<div class="banner is-soft">${icon('scale')}<div><b>Sonntagmorgen</b><span>Nüchtern, ohne Kleidung, nach dem Toilettengang – zusammen mit dem Hautcheck und den Wochenfotos.</span></div></div>`;
  const prev = (f) => { for (let i = 1; i < 60; i++) { const x = peekDay(addDays(k, -i)); if (x && x.health && x.health[f] != null) return x.health[f]; } return null; };
  const row = (f, n, unit, dec) => { const v = d.health[f]; const pv = prev(f); return `<div class="frow"><span class="flabel">${n}</span><div class="fin"><input type="text" inputmode="decimal" data-c="health" data-k="${f}" data-date="${k}" value="${numIn(v, dec)}" placeholder="${pv != null ? 'zuletzt ' + numIn(pv, dec) : '–'}" aria-label="${n}"><span class="unit">${unit}</span></div></div>`; };
  h += `<section class="sec"><div class="form">${row('weight', 'Gewicht', 'kg', 1)}${row('waist', 'Bauchumfang (optional)', 'cm', 1)}</div><p class="hint">Bauchumfang auf Nabelhöhe, entspannt ausatmen.</p></section>`;
  for (const [f, n, unit] of [['weight', 'Gewicht', 'kg'], ['waist', 'Bauchumfang', 'cm']]) {
    const ser = weightSeries(f);
    if (!ser.length) { if (f === 'weight') h += chartCard('kw', n, 'Trag dein Gewicht ein, dann siehst du hier Verlauf, gleitenden Schnitt und Veränderung.', emptyChart('Noch kein Eintrag.')); continue; }
    const lastE = ser[ser.length - 1];
    const weekAgo = [...ser].reverse().find((x) => daysBetween(x.k, lastE.k) >= 5) || (ser.length >= 2 ? ser[ser.length - 2] : null);
    const first = ser[0];
    const vals = ser.map((x) => x.v);
    const ma = vals.map((_, i) => { const w = vals.slice(Math.max(0, i - 3), i + 1); return w.length >= 2 ? mean(w) : null; });
    const kv = (l, v, s = '') => `<div class="kv"><span>${l}</span><b>${v}</b>${s ? `<small>${s}</small>` : ''}</div>`;
    const dl = (a, b) => (a == null || b == null ? '–' : `${a - b >= 0 ? '+' : ''}${fmt(a - b, 1)}`);
    h += `<div class="kv-grid is-3">${kv(`${n} aktuell`, `${fmt(lastE.v, 1)}`, `${unit} · ${fmtDate(lastE.k, { day: 'numeric', month: 'short' })}`)}${kv('zur Vorwoche', dl(lastE.v, weekAgo && weekAgo.v), weekAgo ? `${unit} seit ${fmtDate(weekAgo.k, { day: 'numeric', month: 'short' })}` : unit)}${kv('seit Start', dl(lastE.v, first.v), `${unit} seit ${fmtDate(first.k, { day: 'numeric', month: 'short' })}`)}</div>`;
    const legend = `<div class="legend"><span><i class="line-key" style="background:${SERIES.one}"></i>${n}</span><span><i class="line-key" style="background:${SERIES.two}"></i>Ø der letzten 4 Messungen</span></div>`;
    const body = lineChart({ keys: ser.map((x) => x.k), series: [{ name: n, color: SERIES.one, vals, dots: true }, { name: 'Gleitender Ø', color: SERIES.two, vals: ma }], unit, fmtY: (v) => fmt(v, 1) });
    const table = `<tr><th>Datum</th><th>${n}</th><th>Ø 4</th></tr>` + ser.map((x, i) => `<tr><td>${shortDate(x.k)}</td><td>${fmt(x.v, 1)} ${unit}</td><td>${ma[i] != null ? fmt(ma[i], 1) : '–'}</td></tr>`).reverse().join('');
    h += chartCard('k' + f, f === 'weight' ? 'Gewichtsverlauf' : 'Bauchumfang', '', body, table, legend);
  }
  return h;
}

/* ============================================================
   BLUTWERTE
   ============================================================ */
const BLOOD_ST = { low: 'niedrig', ok: 'normal', high: 'hoch', none: '–' };
function refTxt(m) { return m.lo != null && m.hi != null ? `${fmt(m.lo, 2)}–${fmt(m.hi, 2)}` : m.lo != null ? `≥ ${fmt(m.lo, 2)}` : m.hi != null ? `≤ ${fmt(m.hi, 2)}` : 'kein Bereich'; }
function vBlut() {
  let h = areaHead('blut', `<button class="pill-btn is-accent" data-a="blood-add">${icon('plus')}Werte</button>`);
  h += `<div class="banner is-soft">${icon('info')}<div><b>Hinweis</b><span>Referenzbereiche sind Richtwerte und ersetzen keine ärztliche Beurteilung. Labore nutzen unterschiedliche Einheiten und Bereiche – übernimm am besten die deines Labors (Wert antippen).</span></div></div>`;
  const entries = (S.blood.entries || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  if (!entries.length) h += emptyState('Noch keine Blutwerte eingetragen.', `<button class="btn is-accent" data-a="blood-add">${icon('plus')}Erste Werte eintragen</button>`);
  h += `<section class="sec"><div class="sec-head"><h2>Werte</h2><span class="count">${bloodMarkers().length} Parameter</span></div><div class="mlist">`;
  for (const m of bloodMarkers()) {
    const ser = bloodSeries(m.id);
    const last = ser[ser.length - 1], prev = ser[ser.length - 2];
    const st = last ? bloodStatus(m, last.v) : 'none';
    const open = ui.bloodOpen === m.id;
    const trend = last && prev ? (last.v > prev.v ? 'trending-up' : last.v < prev.v ? 'trending-down' : 'minus') : null;
    h += `<div class="mrow${open ? ' is-open' : ''}"><button class="mrow-hit" data-a="blood-open" data-id="${m.id}"><div class="mrow-top"><span class="mname">${esc(m.n)}</span><span class="mval">${last ? `<b>${fmt(last.v, last.v < 10 ? 2 : last.v < 100 ? 1 : 0)}</b><small>${esc(m.unit)}</small>` : '<small>–</small>'}</span></div>
      <div class="mrow-meta"><span class="bst bst-${st}">${BLOOD_ST[st]}</span><span class="hint-inline">Referenz ${esc(refTxt(m))} ${esc(m.unit)}${last ? ` · ${esc(fmtDate(last.date, { day: 'numeric', month: 'short', year: '2-digit' }))}` : ''}</span>${trend ? icon(trend, 'trend') : ''}</div></button>`;
    if (open) {
      const band = m.lo != null && m.hi != null ? { lo: m.lo, hi: m.hi } : m.lo != null ? { lo: m.lo, hi: m.lo } : m.hi != null ? { lo: m.hi, hi: m.hi } : null;
      h += `<div class="mrow-detail">${ser.length ? `<div class="chart-box">${lineChart({ keys: ser.map((x) => x.date), series: [{ name: m.n, color: SERIES.one, vals: ser.map((x) => x.v), dots: true }], band, unit: m.unit, fmtY: (v) => fmt(v, v < 10 ? 2 : 1) })}</div>
        <div class="list">${ser.slice().reverse().map((x) => `<div class="row"><span class="row-main"><b>${fmt(x.v, 2)} ${esc(m.unit)}</b><small>${esc(fmtDate(x.date, { day: 'numeric', month: 'long', year: 'numeric' }))}</small></span><span class="bst bst-${bloodStatus(m, x.v)}">${BLOOD_ST[bloodStatus(m, x.v)]}</span></div>`).join('')}</div>` : '<p class="hint">Noch kein Wert.</p>'}
        <div class="form bm-form"><div class="frow"><span class="flabel">Einheit</span><div class="fin"><input type="text" data-c="blood-marker" data-id="${m.id}" data-f="unit" value="${esc(m.unit)}"></div></div>
        <div class="frow"><span class="flabel">Referenz von</span><div class="fin"><input type="text" inputmode="decimal" data-c="blood-marker" data-id="${m.id}" data-f="lo" value="${numIn(m.lo, 3)}" placeholder="–"></div></div>
        <div class="frow"><span class="flabel">Referenz bis</span><div class="fin"><input type="text" inputmode="decimal" data-c="blood-marker" data-id="${m.id}" data-f="hi" value="${numIn(m.hi, 3)}" placeholder="–"></div></div></div>
        ${m.hint ? `<p class="hint">${esc(m.hint)}</p>` : ''}<button class="link-btn" data-a="blood-hide" data-id="${m.id}">${m.custom ? 'Parameter löschen' : 'Parameter ausblenden'}</button></div>`;
    }
    h += '</div>';
  }
  h += `</div><button class="pill-btn" data-a="blood-custom">${icon('plus')}Eigenen Parameter hinzufügen</button>${Object.values(S.blood.markers || {}).some((x) => x.hidden) ? `<button class="link-btn more" data-a="blood-unhide">Ausgeblendete Parameter wieder zeigen</button>` : ''}</section>`;
  if (entries.length) h += `<section class="sec"><div class="sec-head"><h2>Messungen</h2></div><div class="list">${entries.map((e) => `<button class="row" data-a="blood-edit" data-id="${e.id}"><span class="row-main"><b>${esc(fmtDate(e.date, { day: 'numeric', month: 'long', year: 'numeric' }))}</b><small>${Object.keys(e.v || {}).length} Werte${e.note ? ' · ' + esc(e.note) : ''}</small></span>${icon('pencil', 'row-ic')}</button>`).join('')}</div></section>`;
  return h;
}
function sheetBlood(id) {
  const e = id ? clone((S.blood.entries || []).find((x) => x.id === id)) : { id: null, date: todayKey(), note: '', v: {} };
  ui.sheet = { type: 'blood', e };
  openSheet(`<h3 class="sheet-title">${id ? 'Messung bearbeiten' : 'Blutwerte eintragen'}</h3>
    <div class="form"><div class="frow"><span class="flabel">Datum</span><div class="fin"><input type="date" id="bl-date" value="${e.date}"></div></div>
    <div class="frow is-wide"><span class="flabel">Notiz</span><div class="fin"><input type="text" id="bl-note" value="${esc(e.note || '')}" placeholder="z. B. nüchtern, morgens"></div></div></div>
    <p class="hint">Nur ausfüllen, was gemessen wurde. Komma oder Punkt gehen beide.</p>
    <div class="form">${bloodMarkers().map((m) => `<div class="frow"><span class="flabel">${esc(m.n)}<small class="sub">${esc(refTxt(m))}</small></span><div class="fin"><input type="text" inputmode="decimal" data-bl="${m.id}" value="${numIn(e.v[m.id], 3)}" placeholder="–"><span class="unit">${esc(m.unit)}</span></div></div>`).join('')}</div>
    <div class="sheet-acts"><button class="btn is-accent" data-a="blood-save">Speichern</button>${id ? '<button class="btn is-danger" data-a="blood-del">Messung löschen</button>' : ''}</div>`);
}
function sheetBloodCustom() {
  ui.sheet = { type: 'bloodcustom' };
  openSheet(`<h3 class="sheet-title">Eigener Parameter</h3><div class="form">
    <div class="frow is-wide"><span class="flabel">Name</span><div class="fin"><input type="text" id="bc-n" placeholder="z. B. CRP"></div></div>
    <div class="frow"><span class="flabel">Einheit</span><div class="fin"><input type="text" id="bc-u" placeholder="mg/l"></div></div>
    <div class="frow"><span class="flabel">Referenz von</span><div class="fin"><input type="text" inputmode="decimal" id="bc-lo" placeholder="–"></div></div>
    <div class="frow"><span class="flabel">Referenz bis</span><div class="fin"><input type="text" inputmode="decimal" id="bc-hi" placeholder="–"></div></div></div>
    <div class="sheet-acts"><button class="btn is-accent" data-a="blood-custom-save">Hinzufügen</button></div>`);
}

/* ============================================================
   GARMIN
   ============================================================ */
function vGarminArea() {
  const sub = getSub('garmin', 'eintragen');
  let h = areaHead('garmin') + subnav('garmin', sub, [['eintragen', 'Eintragen'], ['verlauf', 'Verlauf & Zusammenhänge']]);
  if (sub === 'eintragen') h += dateBar(ui.date) + vGarmin(ui.date);
  else {
    const keys = rangeKeys(ui.range);
    h += `<div class="range-row">${seg('range', String(ui.range), [['7', '7 Tage'], ['30', '30 Tage'], ['90', '90 Tage']])}</div>`;
    h += healthChartHTML(keys);
    h += sleepInsight();
    h += correlationsHTML();
  }
  return h;
}

/* ============================================================
   EINKAUF
   ============================================================ */
function vShop() {
  const sub = getSub('einkauf', 'buy');
  const items = S.shop.items;
  const buy = items.filter((x) => x.list === 'buy'), home = items.filter((x) => x.list === 'home');
  const grp = (ui.shopGroup && ui.shopGroup[sub]) || (sub === 'buy' ? 'store' : 'cat');
  let h = areaHead('einkauf');
  h += `<div class="seg"><button class="${sub === 'buy' ? 'is-on' : ''}" data-a="sub" data-area="einkauf" data-v="buy">Einkaufen (${buy.length})</button><button class="${sub === 'home' ? 'is-on' : ''}" data-a="sub" data-area="einkauf" data-v="home">Zuhause (${home.length})</button></div>`;
  h += `<div class="shop-add"><input type="text" id="shop-new" placeholder="Artikel hinzufügen" enterkeyhint="done" autocomplete="off"><label class="choice-select sm">${icon('chevron-down')}<select id="shop-cat" aria-label="Kategorie">${SHOP_CATS.map((c) => `<option ${c === (ui.shopCat || 'Gemüse') ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label><button class="icon-btn" data-a="shop-add" aria-label="Hinzufügen">${icon('plus')}</button></div>`;
  const list = sub === 'buy' ? buy : home;
  if (!list.length) return h + emptyState(sub === 'buy' ? 'Alles eingekauft.' : 'Nichts als vorrätig markiert.') + `<button class="btn is-ghost" data-a="shop-reload-ask">${icon('rotate-ccw')}Wocheneinkauf neu laden</button>`;
  h += `<div class="shop-tools"><div class="chips chips-tight"><button class="chip chip-xs${grp === 'store' ? ' is-on' : ''}" data-a="shop-group" data-v="store">${icon('store')}Nach Laden</button><button class="chip chip-xs${grp === 'cat' ? ' is-on' : ''}" data-a="shop-group" data-v="cat">${icon('layers')}Nach Kategorie</button></div></div>`;
  const catIdx = (c) => { const i = SHOP_CATS.indexOf(c); return i < 0 ? 99 : i; };
  const meta = (it) => { const p = [it.q, itemTip(it)].filter(Boolean); return p.length ? `<small>${esc(p.join(' · '))}</small>` : ''; };
  const tag = (it) => `<span class="store-tag">${esc(storeById(itemStore(it)).n)}</span>`;
  const row = (it, withStore) => {
    const name = sub === 'buy' ? `<b>${esc(it.n)}${withStore ? tag(it) : ''}</b>${meta(it)}` : `<b>${esc(it.n)}</b>`;
    const edit = `<button class="icon-btn sm ghost" data-a="shop-edit" data-id="${it.id}" aria-label="Bearbeiten">${icon('pencil')}</button>`;
    return sub === 'buy'
      ? `<div class="shop-row"><button class="shop-chk" data-a="shop-check" data-id="${it.id}"><span class="tgl-box">${icon('check')}</span><span class="row-main">${name}</span></button>${edit}</div>`
      : `<div class="shop-row is-home"><span class="row-main">${name}</span><button class="pill-btn" data-a="shop-back" data-id="${it.id}">${icon('shopping-cart')}Auf die Liste</button>${edit}</div>`;
  };
  if (grp === 'store') {
    for (const st of SHOP_STORES) {
      const its = list.filter((x) => itemStore(x) === st.id).sort((x, y) => catIdx(x.cat) - catIdx(y.cat));
      if (!its.length) continue;
      const url = sub === 'buy' ? storeMapUrl(st.id) : null;
      h += `<div class="shop-store-h"><h4 class="meal-h">${esc(st.n)} <small>${its.length}</small></h4>${url ? `<a class="pill-btn sm" href="${esc(url)}" target="_blank" rel="noopener">${icon('map-pin')}Nächste Filiale</a>` : ''}</div><div class="list">${its.map((it) => row(it, false)).join('')}</div>`;
    }
  } else {
    const cats = SHOP_CATS.concat([...new Set(list.map((x) => x.cat).filter((c) => !SHOP_CATS.includes(c)))]);
    for (const c of cats) {
      const its = list.filter((x) => x.cat === c);
      if (!its.length) continue;
      h += `<h4 class="meal-h">${esc(c)} <small>${its.length}</small></h4><div class="list">${its.map((it) => row(it, true)).join('')}</div>`;
    }
  }
  if (sub === 'buy' && grp === 'store') h += `<p class="hint">Der Laden ist ein Vorschlag pro Artikel und lässt sich über den Stift ändern. „Nächste Filiale“ öffnet Apple Karten mit der Suche in deiner Nähe.</p>`;
  h += `<button class="btn is-ghost" data-a="shop-reload-ask">${icon('rotate-ccw')}Wocheneinkauf neu laden</button>`;
  return h;
}
function sheetShopItem(id) {
  const it = S.shop.items.find((x) => x.id === id);
  if (!it) return;
  ui.sheet = { type: 'shop', id, store: itemStore(it) };
  openSheet(`<h3 class="sheet-title">Artikel</h3><div class="form">
    <div class="frow is-wide"><span class="flabel">Name</span><div class="fin"><input type="text" id="si-n" value="${esc(it.n)}"></div></div>
    <div class="frow is-wide"><span class="flabel">Menge</span><div class="fin"><input type="text" id="si-q" value="${esc(it.q || '')}" placeholder="z. B. 500 g"></div></div>
    <div class="frow is-wide"><span class="flabel">Hinweis</span><div class="fin"><input type="text" id="si-tip" value="${esc(itemTip(it))}" placeholder="z. B. Bio, ungezuckert"></div></div>
    <div class="frow is-wide"><span class="flabel">Kategorie</span><div class="fin"><select id="si-cat">${SHOP_CATS.map((c) => `<option ${c === it.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div></div>
    <div class="frow is-wide"><span class="flabel">Wo kaufen</span><div class="fin"><div class="chips chips-tight" id="si-store">${SHOP_STORES.map((s) => `<button class="chip chip-xs${s.id === ui.sheet.store ? ' is-on' : ''}" data-a="shop-store" data-v="${s.id}">${esc(s.n)}</button>`).join('')}</div></div></div></div>
    <div class="sheet-acts"><button class="btn is-accent" data-a="shop-save">Speichern</button><button class="btn is-danger" data-a="shop-del">Löschen</button></div>`);
}

/* ============================================================
   WOCHENRÜCKBLICK
   ============================================================ */
function vWoche() {
  const sub = getSub('woche', 'rueckblick');
  let h = areaHead('woche') + subnav('woche', sub, [['rueckblick', 'Rückblick'], ['kalender', 'Kalender & Serien'], ['archiv', 'Archiv']]);
  if (sub === 'rueckblick') h += reviewHTML(ui.reviewWeek);
  else if (sub === 'kalender') {
    const st = { nutri: streak('nutri'), supp: streak('supp'), habits: streak('habits') };
    h += `<section class="streaks">${[['nutri', 'Ernährung'], ['supp', 'Supplements'], ['habits', 'Gewohnheiten']].map(([k2, l]) => `<div class="streak${st[k2].cur ? ' is-live' : ''}"><span class="streak-ic">${icon('flame')}</span><b>${st[k2].cur}</b><span class="streak-l">${st[k2].cur === 1 ? 'Tag' : 'Tage'} ${l}</span><small>Rekord ${st[k2].best}</small></div>`).join('')}</section>`;
    const ms = mobStreak();
    h += `<p class="hint">Mobilität: ${ms} ${ms === 1 ? 'Tag' : 'Tage'} in Folge. Ernährung zählt, wenn Protein ≥ ${T().p.min || T().p.lo} g, Kalorien ≥ 90 % des Ziels, Ballaststoffe ≥ 80 % und mind. 80 % der Mikronährstoffe im Ziel sind. Supplements: alle täglichen genommen. Gewohnheiten: mind. ${S.settings.habitGoal} erledigt.</p>`;
    h += heatmapHTML();
  } else {
    h += `<div class="list">${reviewWeeks().map((ws) => { const r = weekReview(ws); return `<button class="row" data-a="review-open" data-ws="${ws}"><span class="row-main"><b>KW ${isoWeek(ws)} · ${esc(fmtDate(ws, { day: 'numeric', month: 'short' }))} – ${esc(fmtDate(addDays(ws, 6), { day: 'numeric', month: 'short' }))}${S.reviews[ws] && S.reviews[ws].note ? ' ' + icon('notebook-pen', 'inline-ic') : ''}</b><small>${[r.trainings.length ? `${r.trainings.length} Trainings` : '', `Sauna ${fmt(r.sauna)} Min.`, r.sleep != null ? `Sleep Ø ${fmt(r.sleep)}` : '', r.skin != null ? `Haut Ø ${fmt(r.skin, 1)}` : ''].filter(Boolean).join(' · ')}</small></span>${r.complete ? '' : '<em class="est is-blue">läuft</em>'}${icon('chevron-right', 'row-ic')}</button>`; }).join('')}</div>`;
  }
  return h;
}
function reviewHTML(ws) {
  const r = weekReview(ws);
  const kv = (l, v, s = '') => `<div class="kv"><span>${l}</span><b>${v}</b>${s ? `<small>${s}</small>` : ''}</div>`;
  const diff = (a, b, d = 0, inv = false) => (a == null || b == null || Math.abs(a - b) < 0.05 ? '' : `${a - b > 0 ? '+' : ''}${fmt(a - b, d)} zur Vorwoche`);
  let h = weekNav(ws, 'review-week');
  h += `<p class="sec-sub">KW ${isoWeek(ws)} · ${r.complete ? 'abgeschlossen' : 'läuft noch – wird sonntags komplett'} · ${r.daysWithData}/7 Tage mit Einträgen</p>`;
  h += `<div class="kv-grid">
    ${kv('Ø Hautscore', r.skin != null ? fmt(r.skin, 1) : '–', diff(r.skin, r.skinPrev, 1))}
    ${kv('Gewicht', r.weight != null ? fmt(r.weight, 1) + ' kg' : '–', r.weight != null && r.weightPrev != null ? `${r.weight - r.weightPrev >= 0 ? '+' : ''}${fmt(r.weight - r.weightPrev, 1)} kg · Start ${r.weightStart != null ? fmt(r.weightStart, 1) : '–'}` : '')}
    ${kv('Training', `${r.trainings.length}`, `${fmt(r.trainMin)} Min.${r.gymPlanned ? ` · Gym ${r.gymDone}/${r.gymPlanned}` : ''}`)}
    ${kv('Sauna', `${fmt(r.sauna)} Min.`, `Ziel ${fmt(r.saunaGoal)} Min.`)}
    ${kv('Ø Koffein', r.cafAvg != null ? fmt(r.cafAvg) + ' mg' : '–', `nach ${esc(S.settings.caf.cutoff)}: ${r.cafLateDays} ${r.cafLateDays === 1 ? 'Tag' : 'Tage'}`)}
    ${kv('Lichttage', `${r.lightDays}/7`, 'Morgenlicht')}
    ${kv('Supplements', r.supp ? fmt(r.supp.pct) + ' %' : '–', r.supp ? `${r.supp.taken} von ${r.supp.planned}` : '')}
    ${kv('Ernährungs-Abdeckung', r.coverage != null ? `${fmt(r.coverage)} %` : '–', r.nutriDays ? `Mikros im Ziel · Score ${fmt(r.nutriScore)} · Ziele an ${r.nutriGoalDays}/${r.nutriDays} Tagen` : 'keine Daten')}
    ${kv('Ø Sleep Score', r.sleep != null ? fmt(r.sleep) : '–', diff(r.sleep, r.sleepPrev))}
    ${kv('Ø HRV', r.hrv != null ? fmt(r.hrv) + ' ms' : '–', diff(r.hrv, r.hrvPrev))}
    ${kv('Ø Ruhepuls', r.rhr != null ? fmt(r.rhr) : '–', diff(r.rhr, r.rhrPrev))}
  </div>`;
  h += `<h5>Knie & Mobility</h5><div class="kv-grid is-4">
    ${kv('Kraft', `${r.q.kraft}/${r.q.kraftGoal}`)}${kv('Läufe', `${r.q.runs}/${r.q.runsGoal}`, `${fmt(r.km, 1)} km`)}${kv('Mobilität', `${r.q.mob}/7`)}${kv('Lange Routine', `${r.q.lang}/2–3`)}
  </div><p class="hint">Ø Morgenschmerz ${r.painAm != null ? fmt(r.painAm, 1) : '–'} · Ø Laufschmerz ${r.painRun != null ? fmt(r.painRun, 1) : '–'}${r.kmPrev ? ` · Vorwoche ${fmt(r.kmPrev, 1)} km` : ''}${r.tests.length ? ` · Test am ${r.tests.map((t) => fmtDate(t.date, { day: 'numeric', month: 'short' })).join(', ')}` : ''}</p>`;
  if (r.flags.length) h += `<div class="banner is-red">${icon('octagon-alert')}<div><b>Warnzeichen diese Woche: ${esc(r.flags.join(', '))}</b><span>${esc(KNEE_RED_FLAGS)}</span></div></div>`;
  h += `<section class="sec"><div class="sec-head"><h2>Lief gut</h2></div>${r.good.length ? `<ul class="wins">${r.good.map((x) => `<li>${icon('check')}${esc(x)}</li>`).join('')}</ul>` : '<p class="sec-sub">Noch zu wenig Daten für diese Woche.</p>'}</section>`;
  h += `<section class="sec"><div class="sec-head"><h2>Verbessern</h2></div>${r.bad.length ? `<ul class="gaps">${r.bad.map((x) => `<li>${icon('arrow-down')}<span>${esc(x)}</span></li>`).join('')}</ul>` : '<p class="sec-sub">Nichts Auffälliges.</p>'}</section>`;
  h += `<section class="sec"><div class="sec-head"><h2>Eigene Notizen</h2></div><textarea class="note" rows="4" data-c="review-note" data-ws="${ws}" placeholder="Was nimmst du dir für nächste Woche vor?">${esc((S.reviews[ws] || {}).note || '')}</textarea></section>`;
  return h;
}

/* ============================================================
   NEUE EINSTELLUNGEN
   ============================================================ */
Object.assign(SET_VIEWS, {
  nav() {
    const tabs = navTabs();
    return `<p class="hint">„Heute“ steht immer links. Wähle drei weitere Bereiche für die Tab-Leiste, alle anderen findest du unter „Mehr“.</p><div class="list">${AREAS.filter((a) => a.id !== 'heute').map((a) => { const on = tabs.includes(a.id); return `<button class="row-check${on ? ' is-on' : ''}" data-a="nav-tab" data-id="${a.id}"><span class="tgl-box">${icon('check')}</span><span>${esc(a.n)}</span></button>`; }).join('')}</div>`;
  },
  training() {
    const wk = S.settings.week;
    const g = S.settings.gym;
    const cur = gymSched(todayKey());
    return `<p class="hint">Standardwoche für den Wochenplan-Vorschlag. Täglich Mobilität ist immer dabei.</p>
      <div class="wk-edit">${WD_LONG.map((w, i) => { const t = wk[i] || {}; const chip = (key, l) => `<button class="chip chip-xs${t[key] ? ' is-on' : ''}" data-a="week-flag" data-i="${i}" data-k="${key}">${l}</button>`; return `<div class="wk-row"><b>${w}</b><div class="chips chips-tight"><button class="chip chip-xs${!t.gym ? ' is-on' : ''}" data-a="week-gym" data-i="${i}" data-v="0">kein Gym</button>${GYM_DAYS.map((gd) => `<button class="chip chip-xs${Number(t.gym) === gd.day ? ' is-on' : ''}" data-a="week-gym" data-i="${i}" data-v="${gd.day}">Tag ${gd.day}</button>`).join('')}</div><div class="chips chips-tight">${chip('kraft', 'Knie-Kraft')}${chip('lauf', 'Lauf')}${chip('lang', 'Lange Routine')}${chip('sauna', 'Sauna')}${chip('walk', 'Spaziergang')}</div></div>`; }).join('')}</div>
      <button class="link-btn" data-a="week-reset">Standardwoche wiederherstellen</button>
      <h5>Gym-Split</h5><div class="frow is-wide"><span class="flabel">Schedule diese Woche (wechselt wöchentlich)</span><div class="chips chips-tight">${['A', 'B'].map((s) => `<button class="chip chip-xs${cur === s ? ' is-on' : ''}" data-a="gym-sched" data-v="${s}">Schedule ${s}</button>`).join('')}</div></div>
      <button class="row-check${g.kneeAlt ? ' is-on' : ''}" data-a="gym-alt"><span class="tgl-box">${icon('check')}</span><span>Knie-Varianten am Beintag (Hip Thrust, Beinpresse Füße hoch, Beinstrecker schmerzfrei)</span></button>
      <h5>Sauna</h5><div class="form"><div class="frow"><span class="flabel">Wochenziel</span><div class="fin"><input type="text" inputmode="numeric" data-c="sauna-goal" value="${S.settings.sauna.goal}"><span class="unit">Min.</span></div></div></div>`;
  },
  knie() {
    const c = kneeCfg();
    const chips = (act, val, opts) => `<div class="chips chips-tight">${opts.map(([v, l]) => `<button class="chip chip-xs${String(val) === String(v) ? ' is-on' : ''}" data-a="${act}" data-v="${v}">${l}</button>`).join('')}</div>`;
    return `<div class="form">
      <div class="frow"><span class="flabel">Start 12-Wochen-Plan</span><div class="fin"><input type="date" data-c="knee-cfg" data-f="start" value="${c.start}"></div></div>
      <div class="frow is-wide"><span class="flabel">Seite mit Aufschlag</span>${chips('knee-side', c.side, [['rechts', 'Rechts'], ['links', 'Links']])}</div>
      <div class="frow"><span class="flabel">Aufschlag Haltezeit</span><div class="fin"><input type="text" inputmode="numeric" data-c="knee-cfg" data-f="extraSec" value="${c.extraSec}"><span class="unit">Sek.</span></div></div>
      <div class="frow"><span class="flabel">Aufschlag Wiederholungen</span><div class="fin"><input type="text" inputmode="numeric" data-c="knee-cfg" data-f="extraReps" value="${c.extraReps}"><span class="unit">Wdh.</span></div></div>
      <div class="frow"><span class="flabel">Pause zwischen Übungen</span><div class="fin"><input type="text" inputmode="numeric" data-c="knee-cfg" data-f="trans" value="${c.trans}"><span class="unit">Sek.</span></div></div>
      <div class="frow is-wide"><span class="flabel">Timer-Signal</span>${chips('knee-signal', c.signal, [['voice', 'Ton + Sprache'], ['tone', 'Nur Ton'], ['visual', 'Nur visuell']])}</div>
      <div class="frow is-wide"><span class="flabel">Aktuelle Phase</span>${chips('knee-phase', c.phase, [[1, 'Phase 1'], [2, 'Phase 2'], [3, 'Phase 3']])}</div>
      <div class="frow"><span class="flabel">Einlagen abgeholt am</span><div class="fin"><input type="date" data-c="knee-cfg" data-f="insoles" value="${c.insoles || ''}"></div></div>
      <div class="frow"><span class="flabel">Aktuelle Kadenz (Garmin)</span><div class="fin"><input type="text" inputmode="numeric" data-c="knee-cfg" data-f="cadence" value="${c.cadence ?? ''}" placeholder="–"><span class="unit">spm</span></div></div></div>
      <h5>Bänder</h5><div class="form">${c.bands.map((b, i) => `<div class="frow"><span class="flabel"><input class="pe-wide" type="text" data-c="knee-band" data-i="${i}" data-f="n" value="${esc(b.n)}" aria-label="Name"></span><div class="fin"><input type="text" inputmode="decimal" data-c="knee-band" data-i="${i}" data-f="kg" value="${numIn(b.kg, 1)}"><span class="unit">kg</span></div></div>`).join('')}</div>
      <button class="link-btn" data-a="knee-band-add">${icon('plus')} Band</button>
      <div class="sheet-acts"><button class="btn is-ghost" data-a="knee-routines-reset">Routinen auf Standard zurücksetzen</button><button class="btn is-ghost" data-a="knee-video-reset">Eigene Video-Links zurücksetzen</button></div>`;
  },
  koffein() {
    const c = S.settings.caf;
    return `<div class="form"><div class="frow"><span class="flabel">Halbwertszeit</span><div class="fin"><input type="text" inputmode="decimal" data-c="caf-cfg" data-f="halfLife" value="${numIn(c.halfLife, 1)}"><span class="unit">Std.</span></div></div>
      <div class="frow"><span class="flabel">Kein Koffein nach</span><div class="fin"><input type="time" data-c="caf-cfg" data-f="cutoff" value="${esc(c.cutoff)}"></div></div></div>
      <p class="hint">Die Halbwertszeit liegt meist bei 4–6 Stunden. Die Kurve nimmt an, dass das Koffein beim Trinken sofort im Körper ist.</p>
      <h5>Schnellbuttons</h5><div class="caf-edit">${c.presets.map((p, i) => `<div class="pe-block"><div class="pe-head"><input class="pe-name" type="text" data-c="caf-preset" data-i="${i}" data-f="n" value="${esc(p.n)}" aria-label="Name"><button class="icon-btn sm" data-a="caf-preset-del" data-i="${i}" aria-label="Löschen">${icon('trash-2')}</button></div>
        <div class="pe-row">${[['mg', 'mg Koffein'], ['ml', 'ml'], ['kcal', 'kcal'], ['sug', 'g Zucker']].map(([f, l]) => `<label class="pe-av">${l}<input type="text" inputmode="decimal" data-c="caf-preset" data-i="${i}" data-f="${f}" value="${numIn(p[f], 1)}"></label>`).join('')}</div></div>`).join('')}</div>
      <div class="row-btns"><button class="pill-btn" data-a="caf-custom">${icon('plus')}Getränk hinzufügen</button><button class="pill-btn is-ghost" data-a="caf-presets-reset">Standard wiederherstellen</button></div>`;
  },
});
