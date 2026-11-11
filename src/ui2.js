/* ============================================================
   OBERFLÄCHE Teil 2: Gesundheit, Fortschritt, Einstellungen
   ============================================================ */

/* ============================================================
   GESUNDHEIT
   ============================================================ */
function healthVal(f, v) {
  if (v == null) return '';
  if (f.type === 'dur') return fmtDur(v);
  if (f.type === 'time') return v;
  if (f.type === 'choice') return v;
  return (f.signed && v > 0 ? '+' : '') + fmt(v, f.dec || 0) + (f.unit ? ' ' + f.unit : '');
}
function durToTime(min) { return min == null ? '' : `${pad(Math.floor(min / 60))}:${pad(min % 60)}`; }
function vGarmin(k) {
  const d = getDay(k), y = peekDay(addDays(k, -1));
  const gon = garOn();
  let h = garCard() + (gon ? `<p class="sec-sub gar-sub">Werte mit ${icon('watch')} kommen automatisch aus Garmin Connect. Was du selbst einträgst oder änderst, bleibt so.</p>` : '<p class="sec-sub">Werte aus Garmin Connect übertragen. Der Vortag steht als Vorschlag daneben; ein Tipp darauf übernimmt ihn.</p>');
  for (const grp of HEALTH_FIELDS) {
    if (grp.group === 'Körper') continue;
    if (grp.garmin && !gon && !grp.fields.some((f) => d.health[f.k] != null)) continue;
    h += `<section class="sec"><div class="sec-head"><h2>${esc(grp.group)}</h2></div><div class="form">`;
    for (const f of grp.fields) {
      const v = d.health[f.k];
      if (f.g && !gon && v == null) continue; // nur aus Garmin
      if (f.opt && gon && v == null && !rangeKeys(14, k).some((x) => { const dd = peekDay(x); return dd && dd.health && dd.health[f.k] != null; })) continue; // misst die Uhr nicht
      const pv = y && y.health ? y.health[f.k] : null;
      const prev = pv != null && v == null ? `<button class="prev-chip" data-a="h-prev" data-k="${f.k}" data-date="${k}" aria-label="Vortag übernehmen: ${esc(healthVal(f, pv))}">${icon('history')}${esc(healthVal(f, pv))}</button>` : '';
      let input = '';
      const ph = f.k === 'readiness' && v == null && readinessOf(k) ? fmt(readinessOf(k).own) : '–';
      if (f.type === 'num') input = `<input type="text" inputmode="decimal" data-c="health" data-k="${f.k}" data-date="${k}" value="${numIn(v, f.dec || 0)}" placeholder="${ph}" aria-label="${esc(f.n)}">${f.signed ? `<button class="sign-btn" data-a="h-sign" data-k="${f.k}" data-date="${k}" aria-label="Vorzeichen wechseln">±</button>` : ''}${f.unit ? `<span class="unit">${esc(f.unit)}</span>` : ''}`;
      else if (f.type === 'dur') input = `<input type="time" data-c="health-dur" data-k="${f.k}" data-date="${k}" value="${durToTime(v)}" aria-label="${esc(f.n)} in Stunden und Minuten"><span class="unit">h:min</span>`;
      else if (f.type === 'time') input = `<input type="time" data-c="health" data-k="${f.k}" data-date="${k}" value="${esc(v || '')}" aria-label="${esc(f.n)}">`;
      else if (f.type === 'choice') input = `<div class="chips chips-tight">${f.options.map((o) => `<button class="chip chip-xs${v === o ? ' is-on' : ''}" data-a="h-choice" data-k="${f.k}" data-v="${esc(o)}" data-date="${k}">${esc(o)}</button>`).join('')}</div>`;
      const base = f.k === 'hrv' && d.gx && d.gx.hrvBase ? `<small class="gar-base">normal ${d.gx.hrvBase[0]}–${d.gx.hrvBase[1]} ms</small>` : '';
      h += `<div class="frow${f.type === 'choice' ? ' is-wide' : ''}"><span class="flabel">${esc(f.n)}${base}</span><div class="fin">${input}${garMark(d, f.k)}</div>${prev}</div>`;
    }
    h += '</div>';
    if (grp.fields.some((f) => f.k === 'readiness')) { const rd = readinessOf(k); h += `<p class="hint">Trainingsbereitschaft gibt Garmins Schnittstelle nicht heraus. Die App rechnet deshalb eine eigene aus Schlaf, HRV, Ruhepuls, Body Battery, Stress und Belastung${rd && rd.own != null ? ` – heute ${fmt(rd.own)} (${readinessLabel(rd.own)})` : ''}. Zeigt deine Uhr einen anderen Wert, trag ihn ein: dann gilt deiner.</p>`; }
    h += '</section>';
  }
  const tr = d.trainings || [];
  h += `<section class="sec"><div class="sec-head"><h2>Training</h2><button class="link-btn" data-a="goto" data-tab="train" data-sub="heute">Training & Sauna</button></div>
    <p class="sec-sub">${tr.length ? esc(tr.map((t) => `${t.type}${t.time ? ' ' + t.time : ''}${t.dur ? ', ' + t.dur + ' Min.' : ''}`).join(' · ')) : 'Trainings trägst du unter „Training & Sauna“ ein, das Gewicht unter „Körper“.'}</p></section>`;
  h += `<section class="sec"><div class="sec-head"><h2>Befinden</h2></div>${MOOD_FIELDS.map((m) => `<div class="mood"><span class="flabel">${m.n}</span>${scale10('mood', d.mood ? d.mood[m.k] : null, k, m.k)}</div>`).join('')}</section>`;
  h += `<section class="sec"><div class="sec-head"><h2>Notizen</h2></div><textarea class="note" rows="3" data-c="note" data-date="${k}" placeholder="Wie war der Tag?">${esc(d.note || '')}</textarea></section>`;
  return h;
}
function vHabits(k) {
  const d = getDay(k);
  const hs = HABITS.filter((h) => !S.settings.habitsOff.includes(h.id));
  const n = hs.filter((h) => d.habits[h.id]).length;
  let h = `<p class="sec-sub">${n} von ${hs.length} erledigt. Ab ${S.settings.habitGoal} zählt der Tag für deine Serie.</p><div class="mlist">`;
  for (const hb of hs) {
    const on = !!d.habits[hb.id];
    const open = ui.exp.has('h:' + hb.id);
    let det = '';
    if (hb.detail) {
      const val = d.hd ? d.hd[hb.detail.key] : null;
      if (hb.detail.type === 'time') det = `<label class="hdet"><span>${esc(hb.detail.label)}</span><input type="time" data-c="habit-detail" data-k="${hb.detail.key}" data-h="${hb.id}" data-date="${k}" value="${esc(val || '')}"></label>`;
      else det = `<div class="hdet"><span>${esc(hb.detail.label)}</span><div class="chips chips-tight">${hb.detail.options.map((o) => `<button class="chip chip-xs${val === o ? ' is-on' : ''}" data-a="habit-chip" data-k="${hb.detail.key}" data-h="${hb.id}" data-v="${o}" data-date="${k}">${o === 90 ? '90+' : o} ${hb.detail.unit}</button>`).join('')}</div></div>`;
    }
    h += `<div class="hrow${on ? ' is-on' : ''}">
      <button class="item-hit" data-a="habit" data-id="${hb.id}" data-date="${k}" aria-pressed="${on}"><span class="tgl-box">${icon('check')}</span><span class="item-txt"><b>${esc(habitName(hb, k))}${garHabitMark(d, hb.id)}</b><small>${esc(habitWhen(hb, k))}</small></span></button>
      <button class="icon-btn" data-a="expand" data-key="h:${hb.id}" aria-label="Erklärung" aria-expanded="${open}">${icon('info')}</button>
      ${det}
      ${open ? `<div class="mrow-detail">${infoHTML(hb.id)}</div>` : ''}
    </div>`;
  }
  return h + '</div>';
}
/* ============================================================
   FORTSCHRITT
   ============================================================ */
function chartCard(id, title, sub, body, tableRows, legend = '') {
  const showT = ui.tables.has(id);
  return `<section class="sec chart-card"><div class="sec-head"><h2>${esc(title)}</h2>${tableRows ? `<button class="link-btn" data-a="table" data-id="${id}">${showT ? 'Diagramm' : 'Tabelle'}</button>` : ''}</div>
    ${sub ? `<p class="sec-sub">${sub}</p>` : ''}${legend}
    ${showT && tableRows ? `<div class="table-wrap"><table>${tableRows}</table></div>` : `<div class="chart-box">${body}</div>`}</section>`;
}
function loggedKeys(keys) { return keys.filter((k) => peekDay(k) && hasData(peekDay(k))); }

/* Wochenbericht */
function weekReportHTML(ws) {
  const keys = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const isCur = ws === weekStart(todayKey());
  const nav = `<div class="week-nav"><button class="icon-btn" data-a="week" data-d="-7" aria-label="Vorherige Woche">${icon('chevron-left')}</button><span>${esc(fmtDate(ws, { day: 'numeric', month: 'short' }))} – ${esc(fmtDate(addDays(ws, 6), { day: 'numeric', month: 'short' }))}</span><button class="icon-btn" data-a="week" data-d="7" ${isCur ? 'disabled' : ''} aria-label="Nächste Woche">${icon('chevron-right')}</button></div>`;
  const past = keys.filter((k) => k <= todayKey());
  const lk = loggedKeys(past);
  if (!lk.length && !past.some((k) => peekDay(k))) return `<section class="sec report"><div class="sec-head"><h2>Wochenbericht</h2></div>${nav}<p class="sec-sub">Für diese Woche gibt es noch keine Einträge.</p></section>`;
  const t = T();
  const flags = past.map((k) => dayFlags(k));
  const cnt = (f) => flags.filter(f).length;
  const evs = lk.map((k) => evaluate(k));
  const avg = (key) => mean(evs.map((e) => e.metrics[key].v));
  const wins = [], gaps = [];
  const pDays = evs.filter((e) => e.metrics.p.v >= (t.p.min || t.p.lo)).length;
  if (lk.length) {
    wins.push(`Protein-Minimum an ${pDays} von ${lk.length} Tagen`);
    const fibDays = evs.filter((e) => e.metrics.fib.v >= t.fib.lo).length; if (fibDays) wins.push(`Ballaststoffe ≥ ${t.fib.lo} g an ${fibDays} Tagen`);
    const fermDays = evs.filter((e) => e.metrics.ferm.v >= t.ferm.lo).length; if (fermDays) wins.push(`Fermentiertes ≥ ${t.ferm.lo} Portionen an ${fermDays} Tagen`);
  }
  const sDays = cnt((f) => f.supp); if (sDays) wins.push(`Supplements komplett an ${sDays} Tagen`);
  const hDays = cnt((f) => f.habits); if (hDays) wins.push(`Gewohnheiten-Ziel an ${hDays} Tagen`);
  const plants = weekPlants(addDays(ws, 6), false).size;
  if (plants >= t.plants.lo) wins.push(`${plants} verschiedene Pflanzen (Ziel ${t.plants.lo})`);
  else gaps.push({ t: `Pflanzenvielfalt: ${plants} von ${t.plants.lo}`, tip: 'Beeren im Wechsel, Vielfalt-Posten und Kräuter einplanen' });
  if (lk.length) {
    for (const key of MICRO_KEYS.concat(['fib', 'p', 'kcal'])) {
      const a = avg(key), mt = targetFor(key);
      if (mt.lo && a < mt.lo * 0.9) {
        const s = suggestFood(key, mt.lo - a);
        gaps.push({ t: `${metaOf(key).n} im Schnitt ${fmt((a / mt.lo) * 100)} %`, tip: s ? `+ ${friendlyTipAmount(s.food, s.g)} pro Tag` : '' });
      }
      const maxV = key === 'va' ? mean(evs.map((e) => e.act.tot.ret || 0)) : a;
      if (mt.max && maxV > mt.max) gaps.push({ t: `${metaOf(key).n} im Schnitt über dem Maximum (${fmt(disp(key, maxV), metaOf(key).d)} ${metaOf(key).u})`, tip: 'Obergrenzen gelten für die dauerhafte Zufuhr' });
    }
  }
  const hk = (f) => mean(past.map((k) => (peekDay(k) && peekDay(k).health ? peekDay(k).health[f] : null)).filter((v) => v != null));
  const prevKeys = Array.from({ length: 7 }, (_, i) => addDays(ws, i - 7));
  const hkPrev = (f) => mean(prevKeys.map((k) => (peekDay(k) && peekDay(k).health ? peekDay(k).health[f] : null)).filter((v) => v != null));
  const stat = (f, n, d = 0, u = '') => { const a = hk(f); if (a == null) return ''; const b = hkPrev(f); const diff = b != null ? a - b : null; return `<div class="kv"><span>${n}</span><b>${fmt(a, d)}${u}</b>${diff != null && Math.abs(diff) >= 0.05 ? `<small>${diff > 0 ? '+' : ''}${fmt(diff, d)} vs. Vorwoche</small>` : ''}</div>`; };
  const skinA = mean(past.map((k) => (peekDay(k) && peekDay(k).skin ? peekDay(k).skin.score : null)).filter((v) => v != null));
  return `<section class="sec report"><div class="sec-head"><h2>Wochenbericht</h2><span class="count">${lk.length}/7 Tage mit Ernährung</span></div>${nav}
    <div class="kv-grid">${lk.length ? `<div class="kv"><span>Ø Kalorien</span><b>${fmt(avg('kcal'))}</b></div><div class="kv"><span>Ø Protein</span><b>${fmt(avg('p'))} g</b></div>` : ''}${stat('sleepScore', 'Ø Sleep Score')}${stat('hrv', 'Ø HRV', 0, ' ms')}${stat('rhr', 'Ø Ruhepuls')}${stat('steps', 'Ø Schritte')}${skinA != null ? `<div class="kv"><span>Ø Hautbild</span><b>${fmt(skinA, 1)}</b></div>` : ''}</div>
    ${wins.length ? `<h5>Erfolge</h5><ul class="wins">${wins.map((w) => `<li>${icon('check')}${esc(w)}</li>`).join('')}</ul>` : ''}
    ${gaps.length ? `<h5>Lücken</h5><ul class="gaps">${gaps.slice(0, 6).map((g) => `<li>${icon('arrow-down')}<span>${esc(g.t)}${g.tip ? `<small>${esc(g.tip)}</small>` : ''}</span></li>`).join('')}</ul>` : '<p class="sec-sub">Keine Lücken im Wochenschnitt.</p>'}
  </section>`;
}

/* Kalender-Heatmap */
const HEAT_RAMP = ['#24304C', '#2E4677', '#3B60A4', '#5A84D8', '#9DB2FF'];
const HEAT_METRICS = { nutri: 'Ernährung', supp: 'Supplements', habits: 'Gewohnheiten', sleep: 'Sleep Score', skin: 'Hautbild' };
function heatValue(k, metric) {
  const d = peekDay(k);
  if (!d) return null;
  if (metric === 'sleep') return d.health.sleepScore != null ? d.health.sleepScore / 100 : null;
  if (metric === 'skin') return d.skin && d.skin.score != null ? d.skin.score / 10 : null;
  const f = dayFlags(k);
  if (metric === 'nutri') return f.score != null ? f.score / 100 : null;
  if (metric === 'supp') return hasData(d) ? f.suppFrac : null;
  if (metric === 'habits') return f.habitCount ? f.habitCount / f.habitTotal : null;
  return null;
}
function heatLabel(k, metric, v) {
  if (v == null) return 'keine Daten';
  if (metric === 'sleep') return `Sleep Score ${fmt(v * 100)}`;
  if (metric === 'skin') return `Hautbild ${fmt(v * 10)}`;
  if (metric === 'nutri') return `Score ${fmt(v * 100)}`;
  return `${fmt(v * 100)} %`;
}
function heatmapHTML() {
  const [y, m] = ui.heatMonth.split('-').map(Number);
  const first = `${y}-${pad(m)}-01`;
  const days = new Date(y, m, 0).getDate();
  const off = weekday(first);
  const metric = ui.heatMetric;
  let cells = WD_SHORT.map((w) => `<span class="hm-h">${w}</span>`).join('');
  for (let i = 0; i < off; i++) cells += '<span class="hm-x"></span>';
  for (let dd = 1; dd <= days; dd++) {
    const k = `${y}-${pad(m)}-${pad(dd)}`;
    const v = k > todayKey() ? null : heatValue(k, metric);
    const step = v == null ? -1 : Math.min(4, Math.floor(v * 5 - 1e-9));
    const bg = step < 0 ? '' : `background:${HEAT_RAMP[Math.max(0, step)]}`;
    cells += `<button class="hm-c${step < 0 ? ' is-empty' : ''}${k === todayKey() ? ' is-today' : ''}${step >= 3 ? ' is-hi' : ''}" style="${bg}" data-a="heat-day" data-date="${k}" data-tip="${esc(fmtDate(k, { weekday: 'short', day: 'numeric', month: 'short' }) + '\n' + heatLabel(k, metric, v))}">${dd}</button>`;
  }
  const monthName = new Date(y, m - 1, 15).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const isCur = ui.heatMonth >= todayKey().slice(0, 7);
  return `<section class="sec"><div class="sec-head"><h2>Kalender</h2></div>
    <div class="chips chips-scroll">${Object.entries(HEAT_METRICS).map(([id, n]) => `<button class="chip chip-sm${metric === id ? ' is-on' : ''}" data-a="heat-metric" data-v="${id}">${n}</button>`).join('')}</div>
    <div class="week-nav"><button class="icon-btn" data-a="heat-month" data-d="-1" aria-label="Vorheriger Monat">${icon('chevron-left')}</button><span>${esc(monthName)}</span><button class="icon-btn" data-a="heat-month" data-d="1" ${isCur ? 'disabled' : ''} aria-label="Nächster Monat">${icon('chevron-right')}</button></div>
    <div class="heatmap">${cells}</div>
    <div class="hm-legend"><span>niedrig</span>${HEAT_RAMP.map((c) => `<i style="background:${c}"></i>`).join('')}<span>hoch</span></div>
    ${monthSummary(y, m, days)}
  </section>`;
}

function monthSummary(y, m, days) {
  const keys = Array.from({ length: days }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`).filter((k) => k <= todayKey() && peekDay(k));
  if (!keys.length) return '<p class="hint">In diesem Monat gibt es noch keine Einträge.</p>';
  const flags = keys.map((k) => dayFlags(k));
  const logged = keys.filter((k) => hasData(peekDay(k)));
  const score = mean(flags.map((f) => f.score).filter((v) => v != null));
  const sleep = mean(keys.map((k) => peekDay(k).health.sleepScore).filter((v) => v != null));
  const w = keys.map((k) => peekDay(k).health.weight).filter((v) => v != null);
  const kv = (l, v, s = '') => `<div class="kv"><span>${l}</span><b>${v}</b>${s ? `<small>${s}</small>` : ''}</div>`;
  return `<h5>Monatsübersicht</h5><div class="kv-grid">
    ${kv('Tage mit Ernährung', logged.length, `Ziele erreicht an ${flags.filter((f) => f.nutri).length}`)}
    ${kv('Ø Ernährungs-Score', score != null ? fmt(score) : '–')}
    ${kv('Supplements komplett', `${flags.filter((f) => f.supp).length} Tage`)}
    ${kv('Gewohnheiten-Ziel', `${flags.filter((f) => f.habits).length} Tage`)}
    ${sleep != null ? kv('Ø Sleep Score', fmt(sleep)) : ''}
    ${w.length >= 2 ? kv('Gewicht', `${w[w.length - 1] - w[0] > 0 ? '+' : ''}${fmt(w[w.length - 1] - w[0], 1)} kg`, `${fmt(w[0], 1)} → ${fmt(w[w.length - 1], 1)} kg`) : ''}
  </div>`;
}

/* Nährstoffabdeckung (Durchschnitt) */
function coverageHTML(keys) {
  const lk = loggedKeys(keys);
  if (!lk.length) return chartCard('cov', 'Nährstoffabdeckung', 'Durchschnitt der Tage mit Ernährungsdaten.', emptyChart('Noch keine Ernährungsdaten im Zeitraum.'));
  const evs = lk.map((k) => evaluate(k));
  const rows = MICRO_KEYS.concat(['fib', 'pre', 'pp', 'ferm']).map((key) => {
    const a = mean(evs.map((e) => e.metrics[key].v));
    const t = targetFor(key);
    const ret = key === 'va' ? mean(evs.map((e) => e.act.tot.ret || 0)) : null;
    let stt = stateOf(a, key === 'va' ? { ...t, max: undefined } : t);
    if (key === 'va' && ret > t.max) stt = 'over';
    return { key, a, pct: t.lo ? (a / t.lo) * 100 : 0, st: stt };
  }).sort((x, y) => x.pct - y.pct);
  const body = `<div class="cov">${rows.map((r) => `<div class="cov-row st-${r.st}" data-tip="${esc(`${metaOf(r.key).n}\nØ ${fmt(disp(r.key, r.a), metaOf(r.key).d)} ${metaOf(r.key).u} (${fmt(r.pct)} %)\n${STATE_LABEL[r.st]}`)}"><span class="cov-n">${esc(MICRO_SHORT[r.key] || metaOf(r.key).n)}</span><span class="cov-bar"><i style="width:${clamp(r.pct / 2, 0, 100)}%"></i><em style="left:50%"></em></span><span class="cov-v">${icon(STATE_ICON[r.st])}${fmt(r.pct)} %</span></div>`).join('')}</div><p class="hint">Linie = 100 % des Ziels, Balken reichen bis 200 %.</p>`;
  const table = `<tr><th>Nährstoff</th><th>Ø</th><th>% Ziel</th><th>Status</th></tr>` + rows.map((r) => `<tr><td>${esc(metaOf(r.key).n)}</td><td>${fmt(disp(r.key, r.a), metaOf(r.key).d)} ${esc(metaOf(r.key).u)}</td><td>${fmt(r.pct)} %</td><td>${STATE_LABEL[r.st]}</td></tr>`).join('');
  return chartCard('cov', 'Nährstoffabdeckung', `Durchschnitt aus ${lk.length} ${lk.length === 1 ? 'Tag' : 'Tagen'} mit Ernährungsdaten.`, body, table);
}
function macrosHTML(keys) {
  const rows = keys.map((k) => { const d = peekDay(k); if (!d || !hasData(d)) return null; const tot = computeTotals(k, false).tot; return { p: (tot.p || 0) * 4, f: (tot.f || 0) * 9, c: (tot.c || 0) * 4 }; });
  const series = [{ key: 'p', name: 'Protein', color: SERIES.p }, { key: 'f', name: 'Fett', color: SERIES.f }, { key: 'c', name: 'Kohlenhydrate', color: SERIES.c }];
  const legend = `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}<span><i class="band-key"></i>Zielbereich</span></div>`;
  const t = T();
  const body = stackedColumns({ keys, rows, series, band: { lo: t.kcal.lo, hi: t.kcal.hi } });
  const table = `<tr><th>Tag</th><th>kcal</th><th>Protein</th><th>Fett</th><th>KH</th></tr>` + keys.map((k, i) => (rows[i] ? `<tr><td>${shortDate(k)}</td><td>${fmt(rows[i].p + rows[i].f + rows[i].c)}</td><td>${fmt(rows[i].p / 4)} g</td><td>${fmt(rows[i].f / 9)} g</td><td>${fmt(rows[i].c / 4)} g</td></tr>` : '')).join('');
  return chartCard('mac', 'Kalorien & Makros', 'Kalorien pro Tag, aufgeteilt nach Herkunft.', body, table, legend);
}
function movingAvg(vals, win = 7) {
  return vals.map((_, i) => { const w = vals.slice(Math.max(0, i - win + 1), i + 1).filter((v) => v != null); return w.length >= 2 ? mean(w) : null; });
}
function weightHTML(keys) {
  const vals = keys.map((k) => { const d = peekDay(k); return d && d.health.weight != null ? d.health.weight : null; });
  const avg = movingAvg(vals);
  const has = vals.some((v) => v != null);
  const legend = has ? `<div class="legend"><span><i class="line-key" style="background:${SERIES.one}"></i>Gewicht</span><span><i class="line-key" style="background:${SERIES.two}"></i>7-Tage-Schnitt</span></div>` : '';
  const body = lineChart({ keys, series: [{ name: 'Gewicht', color: SERIES.one, vals, dots: true }, { name: '7-Tage-Schnitt', color: SERIES.two, vals: avg }], unit: 'kg', fmtY: (v) => fmt(v, 1) });
  const table = `<tr><th>Tag</th><th>Gewicht</th><th>7-Tage-Schnitt</th></tr>` + keys.map((k, i) => (vals[i] != null ? `<tr><td>${shortDate(k)}</td><td>${fmt(vals[i], 1)} kg</td><td>${avg[i] != null ? fmt(avg[i], 1) + ' kg' : '–'}</td></tr>` : '')).join('');
  return chartCard('wt', 'Gewicht', 'Eintrag unter Gesundheit → Garmin → Körper.', body, has ? table : null, legend);
}
function healthChartHTML(keys) {
  const hm = HEALTH_METRICS.find((x) => x.k === ui.hMetric) || HEALTH_METRICS[0];
  const vals = keys.map((k) => { const d = peekDay(k); if (!d) return null; if (['wellbeing', 'energy', 'focus'].includes(hm.k)) return d.mood ? d.mood[hm.k] ?? null : null; if (hm.k === 'readiness') { const r = readinessOf(k); return r ? r.score : null; } return d.health[hm.k] ?? null; });
  const isDur = hm.fmt === 'dur';
  const body = lineChart({ keys, series: [{ name: hm.n, color: SERIES.one, vals, dots: true }], unit: isDur ? '' : hm.u || '', fmtY: isDur ? (v) => fmtDur(v) : (v) => fmt(v, ['resp', 'skinTemp', 'fitAge'].includes(hm.k) ? 1 : 0) });
  const chips = `<div class="chips chips-scroll">${HEALTH_METRICS.map((x) => `<button class="chip chip-sm${x.k === hm.k ? ' is-on' : ''}" data-a="h-metric" data-v="${x.k}">${esc(x.n)}</button>`).join('')}</div>`;
  const table = `<tr><th>Tag</th><th>${esc(hm.n)}</th></tr>` + keys.map((k, i) => (vals[i] != null ? `<tr><td>${shortDate(k)}</td><td>${isDur ? fmtDur(vals[i]) : fmt(vals[i], 1)}</td></tr>` : '')).join('');
  return chartCard('hm', 'Garmin-Werte', chips, body, vals.some((v) => v != null) ? table : null);
}
function correlationsHTML() {
  let h = `<section class="sec"><div class="sec-head"><h2>Zusammenhänge</h2><span class="count">letzte 90 Tage</span></div>
    <p class="sec-sub">Dein Verhalten am Abend im Vergleich mit dem Schlaf der folgenden Nacht (am nächsten Morgen eingetragen). Ein Zusammenhang heißt nicht, dass das eine das andere verursacht.</p><div class="corr-list">`;
  for (const c of CORRELATIONS) {
    const r = correlationData(c, 90);
    const yName = c.y === 'hrv' ? 'HRV' : 'Sleep Score';
    const enough = r.na >= 3 && r.nb >= 3;
    const open = ui.exp.has('c:' + c.id);
    let txt;
    if (!enough) txt = `<p class="corr-wait">Noch zu wenig Daten: ${r.na} Nächte ${esc(c.la)}, ${r.nb} ${esc(c.lb)} (mind. 3 je Gruppe).</p>`;
    else {
      const diff = r.ma - r.mb;
      txt = `<div class="corr-cmp"><div><b>${fmt(r.ma)}</b><small>Ø ${yName}, ${esc(c.la)} (${r.na})</small></div><div><b>${fmt(r.mb)}</b><small>Ø ${yName}, ${esc(c.lb)} (${r.nb})</small></div></div>
        <p class="corr-sum">${Math.abs(diff) < 1 ? 'Kaum Unterschied zwischen den Gruppen.' : `${esc(c.la)}: im Schnitt ${diff > 0 ? '+' : ''}${fmt(diff)} Punkte.`}${r.r != null ? ` Korrelation r = ${fmt(r.r, 2)}, ${strengthLabel(r.r)}.` : ''}</p>`;
    }
    h += `<div class="corr${open ? ' is-open' : ''}"><button class="corr-hit" data-a="expand" data-key="c:${c.id}"><span><b>${esc(c.n)}</b><small>→ ${yName} der Nacht danach</small></span>${icon(open ? 'chevron-down' : 'chevron-right', 'mrow-chev')}</button>${txt}
      ${open && r.pts.length >= 2 && c.type !== 'bool' ? `<div class="chart-box">${scatterChart({ pts: r.pts, xType: c.type, yName, xName: c.n })}</div>` : ''}</div>`;
  }
  return h + '</div></section>';
}
function skinProgressHTML(keys) {
  const phases = S.settings.skin.phases;
  const all = Object.keys(S.days).sort();
  const rows = phases.map((p) => {
    const ks = all.filter((k) => k >= p.start && k <= p.end);
    const sc = ks.map((k) => S.days[k].skin && S.days[k].skin.score).filter((v) => v != null);
    const sp = ks.map((k) => S.days[k].skin && S.days[k].skin.spots).filter((v) => v != null);
    return { p, n: sc.length, score: mean(sc), spots: mean(sp) };
  });
  const after = [], noAg = [];
  for (const k of all) {
    const prev = peekDay(addDays(k, -1)), d = S.days[k];
    if (!d.skin || d.skin.score == null || !prev) continue;
    (prev.checks && prev.checks.m_ag1 ? after : noAg).push(d.skin.score);
  }
  const vals = keys.map((k) => { const d = peekDay(k); return d && d.skin && d.skin.score != null ? d.skin.score : null; });
  if (!rows.some((r) => r.n) && !vals.some((v) => v != null)) return chartCard('skin', 'Haut-Protokoll', 'Bewerte dein Hautbild unter Gesundheit → Haut, dann siehst du hier den Verlauf je Phase.', emptyChart('Noch keine Hautbewertungen.'));
  const body = lineChart({ keys, series: [{ name: 'Hautbild', color: SERIES.one, vals, dots: true }], domain: [0, 10], fmtY: (v) => fmt(v, 1) });
  const tbl = `<div class="table-wrap"><table><tr><th>Phase</th><th>Ø Hautbild</th><th>Ø neue Pickel</th><th>Tage</th></tr>${rows.map((r) => `<tr><td>${esc(r.p.n)}</td><td>${r.score != null ? fmt(r.score, 1) : '–'}</td><td>${r.spots != null ? fmt(r.spots, 1) : '–'}</td><td>${r.n}</td></tr>`).join('')}</table></div>`;
  const ag = after.length >= 3 && noAg.length >= 3 ? `<p class="sec-sub">Hautbild am Tag nach AG1: Ø ${fmt(mean(after), 1)} (${after.length}) gegenüber Ø ${fmt(mean(noAg), 1)} ohne AG1 am Vortag (${noAg.length}).</p>` : '<p class="sec-sub">Vergleich „Tag nach AG1“ ab je 3 bewerteten Tagen.</p>';
  return `<section class="sec chart-card"><div class="sec-head"><h2>Haut-Protokoll</h2></div><div class="chart-box">${body}</div>${tbl}${ag}</section>`;
}

/* ============================================================
   EINSTELLUNGEN
   ============================================================ */
const SET_SECTIONS = [
  ['profil', 'Profil & Schlafzeiten'], ['nav', 'Tab-Leiste'], ['backup', 'Backup & Daten'], ['garmin', 'Garmin Connect'], ['push', 'Mitteilungen'], ['ziele', 'Tagesziele'], ['plan', 'Standardtag bearbeiten'], ['woche', 'Tagesvarianten pro Wochentag'],
  ['training', 'Training, Wochenstruktur & Sauna'], ['knie', 'Knie-Programm'], ['koffein', 'Koffein'],
  ['foods', 'Lebensmittel & Supplements'], ['haut', 'Haut-Protokoll'], ['habits', 'Gewohnheiten'], ['routinen', 'Routinen & Limits'], ['todos', 'Termine & To-dos'],
  ['about', 'Installation & Hinweise'],
];
function vSet() {
  let h = '<header class="page-head is-tight"><h1>Einstellungen</h1></header><div class="acc">';
  if (backupDue()) h += `<div class="banner">${icon('download')}<div><b>Backup fällig</b><span>Unter „Backup & Daten“ sichern.</span></div></div>`;
  for (const [id, n] of SET_SECTIONS) {
    const open = ui.setOpen === id;
    h += `<section class="acc-sec${open ? ' is-open' : ''}" id="set-${id}"><button class="acc-head" data-a="set-open" data-id="${id}" aria-expanded="${open}"><span>${esc(n)}</span>${icon(open ? 'chevron-down' : 'chevron-right')}</button>${open ? `<div class="acc-body">${SET_VIEWS[id]()}</div>` : ''}</section>`;
  }
  return h + `</div><p class="hint center">Protokoll ${APP_VERSION}. Alle Daten bleiben auf diesem Gerät.</p>`;
}
const SET_VIEWS = {
  routinen() { return setRoutinesHTML(); },
  profil() {
    const p = S.settings.profile;
    const f = (k, l, type = 'text', mode = '') => `<div class="frow"><span class="flabel">${l}</span><div class="fin"><input type="${type}" ${mode ? `inputmode="${mode}"` : ''} data-c="profile" data-k="${k}" value="${esc(p[k] ?? '')}"></div></div>`;
    return `<div class="form">${f('name', 'Name')}${f('age', 'Alter', 'text', 'numeric')}${f('height', 'Größe (cm)', 'text', 'numeric')}${f('weight', 'Gewicht (kg)', 'text', 'decimal')}${f('wake', 'Aufstehen', 'time')}${f('sleep', 'Schlafen', 'time')}</div>
      <p class="hint">Aufstehen und Schlafen gelten nur, bis Garmin deine Schlafdaten liefert. Danach nimmt die App jeden Tag dein echtes Aufstehen und rechnet die Schlafenszeit aus dem Aufstehen am nächsten Morgen und deinem Schlafbedarf. Wann du morgen raus musst, stellst du auf „Heute“ unter dem Tagesbogen ein.</p>`;
  },
  ziele() {
    const rows = [
      ['kcal', ['lo', 'hi', 'max']], ['p', ['min', 'lo', 'hi']], ['fatPct', ['lo', 'hi', 'max']], ['fib', ['lo', 'hi', 'max']],
      ['fluid', ['lo', 'hi', 'max'], 'Flüssigkeit (Ruhetag)'], ['fluidSport', ['lo', 'hi', 'max'], 'Flüssigkeit (Gym/Sauna)'],
      ['vc', ['lo', 'hi', 'max']], ['vd', ['lo', 'max']], ['vk', ['lo']], ['va', ['lo', 'max'], 'Vitamin A (Max. = Retinol)'], ['ve', ['lo', 'max']], ['b12', ['lo']], ['fol', ['lo']], ['b6', ['lo', 'max']],
      ['mg', ['lo', 'hi', 'suppMax']], ['zn', ['lo', 'max']], ['fe', ['lo', 'hi', 'max']], ['se', ['lo', 'max']], ['i', ['min', 'lo', 'max']], ['ca', ['lo', 'max']], ['k', ['lo']], ['cu', ['lo', 'max']], ['cho', ['lo', 'hi']], ['na', ['lo', 'hi', 'max']], ['o3', ['lo', 'hi', 'max']],
      ['pre', ['lo']], ['pp', ['lo']], ['ferm', ['lo', 'hi']], ['plants', ['lo']], ['caf', ['max']], ['fs', ['max']], ['upf', ['max']],
    ];
    const L = { min: 'Minimum', lo: 'Ziel ab', hi: 'Ziel bis', max: 'Maximum', suppMax: 'Max. Supplement' };
    const t = T();
    return `<p class="hint">Unter „Ziel ab“ zeigt die Ampel Gelb, über „Ziel bis“ Blau, über „Maximum“ Rot. Kohlenhydrate ergeben sich aus dem Rest.</p><div class="tgt-list">${rows.map(([key, fields, label]) => {
      const m = metaOf(key);
      const unit = key === 'fluid' || key === 'fluidSport' ? 'ml' : key === 'plants' ? 'pro Woche' : m.u;
      return `<div class="tgt"><b>${esc(label || m.n)} <small>${esc(unit)}</small></b><div class="tgt-in">${fields.map((f) => { const raw = (t[key] || {})[f]; const v = raw == null ? '' : key === 'vd' ? raw * 40 : raw; return `<label><span>${L[f]}</span><input type="text" inputmode="decimal" data-c="target" data-k="${key}" data-f="${f}" value="${numIn(v, 2)}" placeholder="–"></label>`; }).join('')}</div></div>`;
    }).join('')}</div><button class="btn is-ghost" data-a="targets-reset">Ziele auf Standard zurücksetzen</button>`;
  },
  plan() {
    let h = '<p class="hint">Mengen gelten als Standard für jeden Tag. Die Kürzel legen fest, an welchen Tagesvarianten ein Posten erscheint: P = Prepmymeal-Tag, D = Döner-Tag, M = Makrele-Tag.</p>';
    for (const b of S.settings.plan) {
      h += `<div class="pe-block"><div class="pe-head"><input class="pe-name" type="text" data-c="plan-block" data-id="${b.id}" data-f="n" value="${esc(b.n)}" aria-label="Name des Blocks">${b.time === 'training' ? '<span class="hint">Trainingszeit</span>' : `<input type="time" data-c="plan-block" data-id="${b.id}" data-f="time" value="${esc(b.time || '')}" aria-label="Uhrzeit">`}</div>`;
      b.items.forEach((it, i) => {
        const f = FOOD[it.food];
        const units = f ? f.u.map((u) => u[0]).concat(f.base === 1 ? [] : [isLiquid(f) ? 'ml' : 'g']).filter((v, j, a) => a.indexOf(v) === j) : [it.u];
        h += `<div class="pe-item"><div class="pe-top"><b>${esc(it.label || (f ? f.n : it.food))}</b><div class="pe-tools"><button class="icon-btn sm" data-a="pe-move" data-b="${b.id}" data-i="${i}" data-d="-1" aria-label="Nach oben">${icon('arrow-up')}</button><button class="icon-btn sm" data-a="pe-move" data-b="${b.id}" data-i="${i}" data-d="1" aria-label="Nach unten">${icon('arrow-down')}</button><button class="icon-btn sm" data-a="pe-del" data-b="${b.id}" data-i="${i}" aria-label="Entfernen">${icon('trash-2')}</button></div></div>
          <div class="pe-row"><input type="text" inputmode="decimal" class="pe-amt" data-c="pe-amt" data-b="${b.id}" data-i="${i}" value="${numIn(it.a, 2)}" aria-label="Menge"><select data-c="pe-unit" data-b="${b.id}" data-i="${i}" aria-label="Einheit">${units.map((u) => `<option ${u === it.u ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>
            <div class="chips chips-tight">${['prep', 'doener', 'makrele'].map((v) => `<button class="chip chip-xs${itemInVariant(it, v) ? ' is-on' : ''}" data-a="pe-var" data-b="${b.id}" data-i="${i}" data-v="${v}" aria-label="${VARIANTS[v]}">${v === 'prep' ? 'P' : v === 'doener' ? 'D' : 'M'}</button>`).join('')}<button class="chip chip-xs${it.opt ? ' is-on' : ''}" data-a="pe-opt" data-b="${b.id}" data-i="${i}">optional</button></div></div>
          ${it.av ? `<div class="pe-row"><span class="hint">Abweichend:</span>${Object.entries(it.av).map(([v, a]) => `<label class="pe-av">${VARIANTS[v]} <input type="text" inputmode="decimal" data-c="pe-av" data-b="${b.id}" data-i="${i}" data-v="${v}" value="${numIn(a, 2)}"></label>`).join('')}</div>` : ''}
        </div>`;
      });
      h += `<button class="pill-btn" data-a="pe-add" data-b="${b.id}">${icon('plus')}Posten hinzufügen</button></div>`;
    }
    return h + '<button class="btn is-ghost" data-a="plan-reset">Standardtag auf Ausgangsplan zurücksetzen</button>';
  },
  woche() {
    return `<p class="hint">Welche Variante ein Tag automatisch hat. Am Tag selbst kannst du sie jederzeit umstellen.</p><div class="form">${WD_LONG.map((w, i) => `<div class="frow is-wide"><span class="flabel">${w}</span><div class="chips chips-tight">${Object.entries(VARIANTS).map(([id, n]) => `<button class="chip chip-xs${(S.settings.weekPlan[i] || 'prep') === id ? ' is-on' : ''}" data-a="week-var" data-i="${i}" data-v="${id}">${esc(n.replace('-Tag', ''))}</button>`).join('')}</div></div>`).join('')}</div>`;
  },
  foods() {
    const q = ui.setQ.trim().toLowerCase();
    const list = Object.values(FOOD).filter((f) => !q || f.n.toLowerCase().includes(q)).sort((a, b) => (b.est ? 1 : 0) - (a.est ? 1 : 0) || a.cat.localeCompare(b.cat, 'de') || a.n.localeCompare(b.n, 'de'));
    return `<p class="hint">Alle Werte pro 100 g bzw. 100 ml, bei Supplements pro Einheit. Schätzwerte (Prepmymeal, Döner) stehen oben. Geänderte Werte sind markiert und lassen sich zurücksetzen.</p>
      <div class="row-btns"><button class="pill-btn is-accent" data-a="food-new">${icon('plus')}Neues Lebensmittel</button><button class="pill-btn" data-a="food-new" data-supp="1">${icon('pill')}Neues Supplement</button></div>
      <div class="search"><span>${icon('search')}</span><input type="search" placeholder="Lebensmittel suchen" data-i="set-search" value="${esc(ui.setQ)}"></div>
      <div class="list" id="set-foods">${list.slice(0, 60).map((f) => `<button class="row" data-a="food-edit" data-id="${f.id}"><span class="row-main"><b>${esc(f.n)}${f.est ? ' <em class="est">Schätzung</em>' : ''}${f.edited ? ' <em class="est">geändert</em>' : ''}${f.custom ? ' <em class="est">eigenes</em>' : ''}</b><small>${esc(f.cat)}, ${fmt(f.v.kcal || 0)} kcal</small></span>${icon('pencil', 'row-ic')}</button>`).join('')}</div>`;
  },
  haut() {
    const sk = S.settings.skin;
    return `<p class="hint">Daten und Regeln deiner Phasen. „Sperrt“ markiert Lebensmittel mit diesen Merkmalen in der Phase (whey, milbona, ag1).</p>
      ${sk.phases.map((p, i) => `<div class="pe-block"><div class="pe-head"><input class="pe-name" type="text" data-c="skin-phase" data-i="${i}" data-f="n" value="${esc(p.n)}"></div>
        <div class="form"><div class="frow"><span class="flabel">Start</span><div class="fin"><input type="date" data-c="skin-phase" data-i="${i}" data-f="start" value="${p.start}"></div></div><div class="frow"><span class="flabel">Ende</span><div class="fin"><input type="date" data-c="skin-phase" data-i="${i}" data-f="end" value="${p.end}"></div></div></div>
        <label class="flabel" for="rules-${i}">Regeln (eine pro Zeile)</label><textarea id="rules-${i}" class="note" rows="3" data-c="skin-phase" data-i="${i}" data-f="rules">${esc(p.rules.join('\n'))}</textarea>
        <label class="flabel" for="block-${i}">Sperrt (Merkmale, mit Komma)</label><input id="block-${i}" class="pe-wide" type="text" data-c="skin-phase" data-i="${i}" data-f="block" value="${esc((p.block || []).join(', '))}"></div>`).join('')}
      <h5>Routine</h5><div class="list">${sk.routine.map((r, i) => `<div class="pe-row"><input class="pe-wide" type="text" data-c="skin-routine" data-i="${i}" value="${esc(r.n)}" aria-label="Routine-Punkt"><button class="icon-btn sm" data-a="skin-routine-del" data-i="${i}" aria-label="Entfernen">${icon('trash-2')}</button></div>`).join('')}</div>
      <button class="pill-btn" data-a="skin-routine-add">${icon('plus')}Routine-Punkt</button>`;
  },
  habits() {
    return `<div class="list">${HABITS.map((h) => { const on = !S.settings.habitsOff.includes(h.id); return `<button class="row-check${on ? ' is-on' : ''}" data-a="habit-onoff" data-id="${h.id}"><span class="tgl-box">${icon('check')}</span><span>${esc(habitName(h))}</span></button>`; }).join('')}</div>
      <div class="frow is-wide"><span class="flabel">Serie zählt ab</span><div class="chips chips-tight">${[5, 6, 7, 8, 9, 10].map((n) => `<button class="chip chip-xs${S.settings.habitGoal === n ? ' is-on' : ''}" data-a="habit-goal" data-v="${n}">${n}</button>`).join('')}</div></div>`;
  },
  todos() { return todosSection2(); },
  backup() {
    const last = S.meta.lastBackup ? fmtDate(S.meta.lastBackup.slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' }) : 'noch nie';
    const n = Object.keys(S.days).length;
    return `<p class="hint">Deine Daten liegen nur auf diesem iPhone. Ein Backup ist eine JSON-Datei, die du z. B. in iCloud Drive („In Dateien sichern“) ablegst und hier wieder importieren kannst.</p>
      <div class="kv-grid"><div class="kv"><span>Letztes Backup</span><b>${esc(last)}</b></div><div class="kv"><span>Tage gespeichert</span><b>${n}</b></div></div>
      <div class="sheet-acts"><button class="btn is-accent" data-a="backup-export">${icon('share')}Backup erstellen</button>
      <label class="btn">${icon('upload')}Backup importieren<input type="file" accept="application/json,.json" data-c="backup-import" hidden></label></div>
      <div class="frow is-wide"><span class="flabel">Erinnerung</span><div class="chips chips-tight">${[[0, 'Aus'], [7, 'Wöchentlich'], [14, 'Alle 2 Wochen'], [30, 'Monatlich']].map(([v, l]) => `<button class="chip chip-xs${S.settings.backupDays === v ? ' is-on' : ''}" data-a="backup-days" data-v="${v}">${l}</button>`).join('')}</div></div>
      <p class="hint">Speicher: ${DB.mode === 'idb' ? 'IndexedDB' : 'localStorage'} auf diesem Gerät. Das Backup enthält alle Bereiche (Ernährung, Training, Knie, Haut-Tagebuch, Blutwerte, Einkauf, Rückblicke) – nur die Fotos nicht.</p>
      <h5>Wochenfotos</h5><p class="hint">${photoIdx.loaded ? `${photoIdx.keys.length} Fotos gespeichert.` : ''} Fotos sind groß und werden deshalb getrennt als ZIP gesichert (JPEG-Dateien, auch am Mac lesbar).</p>
      <div class="sheet-acts"><button class="btn" data-a="photos-export">${icon('images')}Fotos als ZIP sichern</button><label class="btn">${icon('upload')}Fotos-ZIP importieren<input type="file" accept="application/zip,.zip" data-c="photos-import" hidden></label></div>
      <button class="btn is-danger" data-a="wipe-ask">Alle Daten löschen</button>`;
  },
  about() {
    return `<h5>Auf dem iPhone installieren</h5><ol class="steps"><li>Die Web-Adresse der App in Safari öffnen.</li><li>Unten auf „Teilen“ tippen (Quadrat mit Pfeil).</li><li>„Zum Home-Bildschirm“ wählen, „Als Web-App öffnen“ aktiviert lassen, dann „Hinzufügen“.</li><li>Ab jetzt die App über das Icon öffnen: Vollbild und offline nutzbar.</li></ol>
      <h5>Updates</h5><p class="hint">Neue Versionen kommen automatisch: Beim nächsten Öffnen mit Internet holt sich die App die neueste Version, deine Daten bleiben dabei erhalten. Läuft die App gerade im Hintergrund, erscheint auf „Heute“ der Knopf „Neu laden“.</p>
      <h5>Wichtig</h5><p class="hint">Diese App ersetzt keine ärztliche Beratung. Nährwerte stammen aus USDA FoodData Central, dem Bundeslebensmittelschlüssel und Herstellerangaben (AG1 EU-Rezeptur, Prepmymeal) und sind gerundete Durchschnittswerte. Prepmymeal und Döner sind Schätzungen. Präbiotika- und Polyphenol-Punkte sind grobe Orientierungswerte.</p>
      <h5>Datenschutz</h5><p class="hint">Keine Konten, keine Server, keine Analyse. Alles bleibt im Speicher dieses Browsers auf deinem iPhone. Wenn du die App vom Home-Bildschirm löschst, sind auch die Daten weg; deshalb Backups.</p>`;
  },
};

/* Lebensmittel-Editor */
const EDIT_KEYS = ['kcal', 'p', 'f', 'sf', 'c', 'sug', 'fs', 'fib', 'na', 'k', 'ca', 'mg', 'fe', 'zn', 'se', 'i', 'cu', 'vc', 'vd', 'va', 'ret', 've', 'vk', 'k2', 'b12', 'fol', 'b6', 'cho', 'epa', 'dha', 'ala', 'caf', 'alk'];
function sheetFoodEdit(fid, opts = {}) {
  const isNew = !fid;
  const f = isNew ? { id: 'c_' + uid(), n: opts.name || '', cat: opts.supp ? 'Supplements' : 'Eigene', u: opts.supp ? [['Einheit', 1]] : [['g', 1]], base: opts.supp ? 1 : undefined, supp: opts.supp ? 'opt' : undefined, v: {} } : clone(FOOD[fid]);
  ui.sheet = { type: 'foodedit', isNew, f };
  const cats = [...new Set(Object.values(FOOD).map((x) => x.cat).concat(['Eigene']))];
  const per = f.base === 1 ? `pro ${f.u[0][0]}` : 'pro 100 g/ml';
  const u0 = f.u[0];
  openSheet(`<h3 class="sheet-title">${isNew ? (opts.supp ? 'Neues Supplement' : 'Neues Lebensmittel') : 'Lebensmittel bearbeiten'}</h3>
    <div class="form fe">
      <div class="frow is-wide"><span class="flabel">Name</span><div class="fin"><input type="text" id="fe-n" value="${esc(f.n)}"></div></div>
      <div class="frow is-wide"><span class="flabel">Kategorie</span><div class="fin"><select id="fe-cat">${cats.map((c) => `<option ${c === f.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div></div>
      ${f.base === 1 ? `<div class="frow is-wide"><span class="flabel">Einheit</span><div class="fin"><input type="text" id="fe-u" value="${esc(u0[0])}"></div></div>
        <div class="frow is-wide"><span class="flabel">Täglich?</span><div class="chips chips-tight"><button class="chip chip-xs${f.supp === 'daily' ? ' is-on' : ''}" data-a="fe-supp" data-v="daily">täglich</button><button class="chip chip-xs${f.supp !== 'daily' ? ' is-on' : ''}" data-a="fe-supp" data-v="opt">bei Bedarf</button></div></div>`
      : `<div class="frow is-wide"><span class="flabel">Portion</span><div class="fin fe-portion"><input type="text" id="fe-u" value="${esc(u0[0] === 'g' || u0[0] === 'ml' ? '' : u0[0])}" placeholder="z. B. Stück"><input type="text" inputmode="decimal" id="fe-ug" value="${u0[0] === 'g' || u0[0] === 'ml' ? '' : numIn(u0[1], 1)}" placeholder="Gramm"></div></div>
        <div class="frow is-wide"><span class="flabel">Getränk?</span><div class="chips chips-tight"><button class="chip chip-xs${f.fl ? ' is-on' : ''}" data-a="fe-flag" data-f="fl">zählt als Flüssigkeit</button><button class="chip chip-xs${(f.tags || []).includes('upf') ? ' is-on' : ''}" data-a="fe-flag" data-f="upf">ultraverarbeitet</button></div></div>
        <div class="frow is-wide"><span class="flabel">Pflanzen</span><div class="fin"><input type="text" id="fe-pl" value="${esc([].concat(f.pl || []).join(', '))}" placeholder="z. B. Tomate, Basilikum"></div></div>
        <div class="frow"><span class="flabel">Polyphenol-Punkte /100 g</span><div class="fin"><input type="text" inputmode="decimal" id="fe-pp" value="${numIn(f.pp, 2)}"></div></div>
        <div class="frow"><span class="flabel">Präbiotika-Punkte /100 g</span><div class="fin"><input type="text" inputmode="decimal" id="fe-pre" value="${numIn(f.pre, 2)}"></div></div>
        <div class="frow"><span class="flabel">Fermentiert: Portion (g)</span><div class="fin"><input type="text" inputmode="decimal" id="fe-ferm" value="${numIn(f.ferm, 0)}" placeholder="nein"></div></div>`}
    </div>
    <h5>Nährwerte ${per}</h5>
    <div class="fe-grid">${EDIT_KEYS.map((k) => { const n = NUTRIENTS[k]; const unit = k === 'vd' ? 'µg' : n.u; return `<label><span>${esc(n.n)} <small>${esc(unit)}</small></span><input type="text" inputmode="decimal" data-fe="${k}" value="${numIn(f.v[k], 3)}" placeholder="0"></label>`; }).join('')}</div>
    <p class="hint">Vitamin D in µg (1 µg = 40 IE).</p>
    <div class="sheet-acts"><button class="btn is-accent" data-a="fe-save">Speichern</button>
      ${!isNew && FOOD[fid].edited ? '<button class="btn is-ghost" data-a="fe-reset">Auf Originalwerte zurücksetzen</button>' : ''}
      ${!isNew && FOOD[fid].custom ? '<button class="btn is-danger" data-a="fe-del">Löschen</button>' : ''}</div>`);
}
function sheetPickFood(blockId) {
  ui.sheet = { type: 'pick', blockId, q: '' };
  openSheet(`<h3 class="sheet-title">Posten hinzufügen</h3><div class="search"><span>${icon('search')}</span><input type="search" placeholder="Lebensmittel suchen" data-i="pick-search" autocomplete="off"></div><div class="list" id="pick-res">${pickResults('')}</div>`);
}
function pickResults(q) {
  q = q.trim().toLowerCase();
  const list = Object.values(FOOD).filter((f) => !q || f.n.toLowerCase().includes(q)).slice(0, 40);
  return list.map((f) => `<button class="row" data-a="pe-pick" data-id="${f.id}"><span class="row-main"><b>${esc(f.n)}</b><small>${esc(f.cat)}</small></span>${icon('plus', 'row-ic')}</button>`).join('');
}
