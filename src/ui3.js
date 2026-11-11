/* ============================================================
   OBERFLÄCHE Teil 3: Dashboard, Mehr, Ernährung (Übersicht/Verlauf),
   Supplements, Training & Sauna, Licht & Koffein
   ============================================================ */
Object.assign(ui, {
  sub: { train: 'heute', knie: 'heute', haut: 'heute', garmin: 'eintragen', einkauf: 'buy', woche: 'rueckblick', wunsch: 'offen' },
  trainWeek: weekStart(todayKey()), gymDay: null, gymSess: null, reviewWeek: weekStart(todayKey()), bloodOpen: null,
  photoWeek: weekStart(todayKey()), photoCmp: null, exCat: null, exArea: null, exRoutine: null, exQ: '', trainMetric: null, testMetric: 'k2w', runMetric: 'pain',
});
function getSub(area, def) { return ui.sub[area] || def; }
function subnav(area, cur, items) {
  return `<div class="subnav" role="tablist">${items.map(([v, l]) => `<button role="tab" class="${cur === v ? 'is-on' : ''}" aria-selected="${cur === v}" data-a="sub" data-area="${area}" data-v="${v}">${l}</button>`).join('')}</div>`;
}
function areaHead(id, extra = '') { const a = areaById(id); return `<header class="page-head is-tight"><h1>${esc(a.n)}</h1>${extra}</header>`; }
function stDot(st) { return `<i class="dot st-${st}"></i>`; }
function goBtn(tab, label, sub = '', cls = 'link-btn') { return `<button class="${cls}" data-a="goto" data-tab="${tab}"${sub ? ` data-sub="${sub}"` : ''}>${esc(label)}</button>`; }
function weekNav(ws, action, maxWs = weekStart(todayKey())) {
  return `<div class="week-nav"><button class="icon-btn" data-a="${action}" data-d="-7" aria-label="Vorherige Woche">${icon('chevron-left')}</button><span>${esc(fmtDate(ws, { day: 'numeric', month: 'short' }))} – ${esc(fmtDate(addDays(ws, 6), { day: 'numeric', month: 'short' }))}</span><button class="icon-btn" data-a="${action}" data-d="7" ${ws >= maxWs ? 'disabled' : ''} aria-label="Nächste Woche">${icon('chevron-right')}</button></div>`;
}
function progBar(v, goal, st = '') { return `<div class="pbar${st ? ' st-' + st : ''}"><i style="width:${clamp(goal ? (v / goal) * 100 : 0, 0, 100)}%"></i></div>`; }
function scale0(action, val, k, extra = '') {
  return `<div class="scale11" role="radiogroup">${Array.from({ length: 11 }, (_, i) => i).map((n) => `<button role="radio" aria-checked="${val === n}" class="${val === n ? 'is-on' : ''}${n > 3 ? ' is-hi' : ''}" data-a="${action}" data-v="${n}" data-date="${k}"${extra}>${n}</button>`).join('')}</div>`;
}

/* ============================================================
   STATUS JE BEREICH (Dashboard-Kacheln und „Mehr“)
   ============================================================ */
function areaStatus(id, k = todayKey()) {
  const d = getDay(k);
  try {
    switch (id) {
      case 'ern': {
        const ev = evaluate(k), m = ev.metrics;
        const nb = k === todayKey() ? nowBlock(k) : null;
        return { v: `${fmt(m.kcal.v)} kcal`, s: `Protein ${fmt(m.p.v)} g · ${nb ? 'als Nächstes ' + esc(nb.n) : 'Standardtag erledigt'}`, st: ev.logged ? m.kcal.state : 'none', prog: m.kcal.t.lo ? m.kcal.v / m.kcal.t.lo : null };
      }
      case 'supp': {
        const variant = dayVariant(k);
        const daily = dailySupps().filter(({ it }) => itemInVariant(it, variant));
        const done = daily.filter(({ it }) => d.checks[it.id]).length;
        const open = daily.filter(({ it }) => !d.checks[it.id]).map(({ it }) => shortName(FOOD[it.food]));
        const b = ag1Budget(k);
        return { v: `${done}/${daily.length}`, s: open.length ? `offen: ${esc(open.join(', '))}` : `alle genommen · AG1: ${esc(ag1BudgetShort(b))}`, st: done === daily.length ? 'ok' : done ? 'under' : 'none', prog: daily.length ? done / daily.length : null };
      }
      case 'train': {
        const wp = weekPlan(weekStart(k)), day = wp.days[weekday(k)];
        const logged = (d.trainings || []).filter((t) => !trainType(t).light);
        const plan = day.items.filter((x) => ['gym', 'lauf'].includes(x.kind) && !x.done);
        const rec = recovery(k);
        const v = logged.length ? esc(logged.map((t) => t.type).join(', ')) : plan.length ? esc(plan.map((x) => x.n).join(' + ')) : 'Ruhetag';
        return { v, s: `${logged.length ? 'erledigt' : plan.length ? 'geplant' : 'heute frei'} · Sauna ${fmt(wp.sauna.done)}/${fmt(wp.sauna.goal)} Min.${rec.ready ? ` · Bereitschaft ${fmt(rec.ready.score)}` : rec.level !== 'none' ? ` · Erholung ${rec.normal ? 'normal' : ({ green: 'gut', yellow: 'mittel', red: 'schlecht' })[rec.level]}` : ''}`, st: logged.length ? 'ok' : rec.level === 'red' ? 'over' : rec.level === 'yellow' ? 'under' : 'none', small: true };
      }
      case 'knie': {
        const w = kneeWeek(k), dd = dayDone(k);
        const items = kneePlanItemsToday(k).filter((x) => x.kind !== 'vorlauf');
        const st = items.map((x) => `${x.n.split(' (')[0]} ${(x.kind === 'mob' ? dd.mob : x.kind === 'kraft' ? dd.kraft : x.kind === 'lauf' ? dd.run : x.kind === 'lang' ? dd.lang : false) ? '✓' : 'offen'}`);
        const flags = redFlags(k);
        return { v: w > 12 ? 'Plan abgeschlossen' : `Woche ${w} · ${esc(kneePhase().n)}`, s: flags.length ? `Warnzeichen: ${esc(flags.join(', '))}` : esc(st.join(' · ')), st: flags.length ? 'over' : dd.mob ? 'ok' : 'none', small: true };
      }
      case 'licht': {
        const ci = cafInfo(k);
        const lm = !!d.habits.licht_morgen;
        const lvl = ci.nowLevel != null ? ci.nowLevel : ci.total;
        return { v: `${fmt(lvl)} mg`, s: `${k === todayKey() ? 'Koffein im Körper' : 'Koffein gesamt'} · Morgenlicht ${lm ? '✓' : 'offen'}${ci.below25 != null && ci.below25 > (ci.now || 0) ? ` · < 25 mg ab ${minToTime(ci.below25)}${ci.below25 >= 1440 ? ' (nachts)' : ''}` : ''}`, st: cafLateWarn(ci).length ? 'under' : lm ? 'ok' : 'none' };
      }
      case 'haut': {
        const ph = skinPhase(k);
        const next = S.settings.skin.phases.find((p) => p.start > k);
        const sc = d.skin && d.skin.score;
        return { v: sc != null ? `Hautbild ${sc}` : 'Heute bewerten', s: ph ? `${esc(ph.n)}, Tag ${ph.day}/${ph.len}${next ? ` · ${daysBetween(k, next.start)} Tage bis ${esc(next.n)}` : ''}` : next ? `Start in ${daysBetween(k, next.start)} Tagen` : 'Protokoll abgeschlossen', st: sc != null ? (sc >= 7 ? 'ok' : sc >= 4 ? 'under' : 'over') : 'none' };
      }
      case 'koerper': {
        const ws = weightSeries();
        const last = ws[ws.length - 1], prev = ws[ws.length - 2];
        const sunday = weekday(k) === 6 && !(d.health && d.health.weight != null);
        return { v: last ? `${fmt(last.v, 1)} kg` : 'Kein Gewicht', s: sunday ? 'Heute Sonntag: nüchtern wiegen' : last && prev ? `${last.v - prev.v >= 0 ? '+' : ''}${fmt(last.v - prev.v, 1)} kg zur letzten Messung` : 'sonntags nüchtern wiegen', st: sunday ? 'under' : 'none' };
      }
      case 'garmin': {
        const h = d.health || {};
        if (garOn() && GAR.err && h.sleepScore == null) return { v: 'Abruf klappt nicht', s: 'Garmin öffnen und Verbindung prüfen', st: 'under' };
        return { v: h.sleepScore != null ? `Sleep ${fmt(h.sleepScore)}` : garOn() ? 'Noch keine Werte' : 'Werte eintragen', s: [h.hrv != null ? `HRV ${fmt(h.hrv)}` : '', h.rhr != null ? `Ruhepuls ${fmt(h.rhr)}` : '', h.bbMorning != null ? `Body Battery ${fmt(h.bbMorning)}` : ''].filter(Boolean).join(' · ') || 'Schlaf, HRV, Body Battery', st: h.sleepScore != null ? (h.sleepScore >= 80 ? 'ok' : h.sleepScore >= 60 ? 'under' : 'over') : 'none' };
      }
      case 'blut': {
        const es = (S.blood.entries || []).slice().sort((a, b) => a.date.localeCompare(b.date));
        const last = es[es.length - 1];
        const out = bloodMarkers().filter((m) => { const s = bloodSeries(m.id); return s.length && bloodStatus(m, s[s.length - 1].v) !== 'ok'; }).length;
        return { v: last ? esc(fmtDate(last.date, { day: 'numeric', month: 'short', year: 'numeric' })) : 'Noch keine Werte', s: last ? (out ? `${out} außerhalb des Referenzbereichs` : 'alle im Referenzbereich') : 'Laborwerte mit Verlauf', st: last ? (out ? 'under' : 'ok') : 'none' };
      }
      case 'einkauf': {
        const n = S.shop.items.filter((x) => x.list === 'buy').length;
        const low = S.shop.items.filter((x) => x.list === 'buy' && x.auto).map((x) => x.n);
        if (low.length) return { v: `${n} offen`, s: esc(`Fast leer: ${low.slice(0, 2).join(', ')}${low.length > 2 ? ` +${low.length - 2}` : ''}`), st: 'under' };
        return { v: `${n} offen`, s: n ? esc(shopStoreCounts('buy').slice(0, 3).map((x) => `${x.n} ${x.count}`).join(' · ')) : 'alles eingekauft', st: 'none' };
      }
      case 'wunsch': return wishStatus();
      case 'woche': {
        const ws = weekStart(k), r = weekday(k) === 6;
        const n = weekKeys(ws).filter((x) => x <= k && peekDay(x)).length;
        return { v: r ? 'Rückblick bereit' : 'Woche läuft', s: `${n}/7 Tage mit Einträgen`, st: r ? 'ok' : 'none' };
      }
      case 'set': {
        const last = S.meta.lastBackup ? `Backup ${fmtDate(S.meta.lastBackup.slice(0, 10), { day: 'numeric', month: 'short' })}` : 'noch kein Backup';
        return { v: '', s: esc(last), st: backupDue() ? 'under' : 'none' };
      }
      default: return { v: '', s: '', st: 'none' };
    }
  } catch (e) { return { v: '–', s: '', st: 'none' }; }
}

/* ============================================================
   HEUTE (Dashboard)
   ============================================================ */
const HOME_TILES = ['ern', 'supp', 'train', 'knie', 'licht', 'haut', 'garmin', 'koerper', 'einkauf', 'blut', 'woche'];
function tileHTML(id, k) {
  const a = areaById(id), st = areaStatus(id, k);
  return `<button class="tile st-${st.st || 'none'}${st.small ? ' is-small' : ''}" data-a="goto" data-tab="${id}">
    <span class="tile-top">${icon(a.ic)}<span>${esc(a.short || a.n)}</span>${stDot(st.st || 'none')}</span>
    <b class="tile-v">${st.v}</b><span class="tile-s">${st.s}</span>${st.prog != null ? progBar(st.prog, 1) : ''}</button>`;
}
function vHeute() {
  const k = todayKey();
  const [c1, c2] = cafWindow();
  let h = `<header class="page-head is-home">
    <div class="head-top"><p class="eyebrow-date">${esc(fmtDate(k))}</p>${phaseChip(k)}</div>
    <h1>${greeting()}</h1></header>`;
  h += banners(k);
  h += kneeAlertCards(k);
  h += goalsCard(k);
  h += `<section class="arc" id="arc" aria-label="Tagesbogen">${arcInner()}</section>
    <div class="arc-legend"><span><i class="lg-coffee"></i>Koffein ${minToTime(c1)}–${minToTime(c2)}</span><span><i class="lg-screens"></i>Bildschirmfrei ab ${minToTime(sleepMin(k) - 60)}</span><span><i class="lg-meal"></i>Mahlzeit erledigt</span></div>${rhythmLine(k)}`;
  h += kneeMorningCard(k, true);
  h += sundayCard(k);
  h += todoCard();
  h += reviewReadyCard(k);
  h += pushHintCard();
  h += `<div class="tiles">${HOME_TILES.map((id) => tileHTML(id, k)).join('')}</div>`;
  h += `<p class="hint center">Tippe auf eine Kachel, um in den Bereich zu wechseln.</p>`;
  return h;
}
function kneeAlertCards(k) {
  let h = '';
  const flags = redFlags(k);
  if (flags.length) h += `<div class="banner is-red">${icon('octagon-alert')}<div><b>Warnzeichen am Knie: ${esc(flags.join(', '))}</b><span>${esc(KNEE_RED_FLAGS)}</span></div></div>`;
  const adv = runAdvice(k);
  if (adv && adv.warn && !flags.length) h += `<div class="banner is-warn">${icon('triangle-alert')}<div><b>Nach dem gestrigen Lauf</b><span>${esc(adv.text)}</span></div></div>`;
  return h;
}
function kneeMorningCard(k, compact) {
  const am = kneeAm(k);
  const kn = kneeDay(peekDay(k));
  if (am != null && compact && ui.kneeAmOpen !== k) return '';
  const adv = runAdvice(k);
  const sub = adv && adv.ask ? `Gestern bist du gelaufen (Schmerz ${adv.rp}/10). Wie fühlt sich das Knie heute Morgen an?` : 'Schmerz heute Morgen: 0 = keiner, 10 = stärkster.';
  return `<section class="card knee-am"><div class="sec-head"><h2>Knie heute</h2>${am != null ? `<span class="count">${am}/10</span>` : ''}</div><p class="sec-sub">${esc(sub)}</p>
    ${scale0('knee-am', am, k)}
    <div class="chips chips-tight flag-chips"><span class="hint">Bemerkt:</span>${KNEE_FLAGS.map((f) => `<button class="chip chip-xs${(kn.flags || []).includes(f) ? ' is-on is-red' : ''}" data-a="knee-flag" data-v="${esc(f)}" data-date="${k}">${esc(f)}</button>`).join('')}</div>
    ${am != null && adv && !adv.ask ? `<p class="hint">${esc(adv.text)}</p>` : ''}</section>`;
}
function sundayCard(k) {
  const wd = weekday(k);
  if (wd !== 6 && wd !== 0) return '';
  const ws = wd === 6 ? weekStart(k) : weekStart(addDays(k, -1));
  const n = photosOfWeek(ws).length;
  const wDay = wd === 6 ? k : addDays(k, -1);
  const w = (getDay(k).health || {}).weight ?? (getDay(wDay).health || {}).weight;
  const sc = (getDay(k).skin || {}).score;
  if (wd === 0 && n >= 4 && w != null) return '';
  const row = (ok, title, sub, act) => `<div class="wc-row${ok ? ' is-ok' : ''}"><span class="tgl-box">${icon('check')}</span><div><b>${title}</b><small>${sub}</small></div>${act}</div>`;
  return `<section class="card sunday"><div class="sec-head"><h2>${wd === 6 ? 'Sonntags-Check' : 'Sonntags-Check nachholen'}</h2></div>
    <p class="sec-sub">Morgens nüchtern: Wochenfotos, Gewicht und Hautbild – immer gleiches Licht, gleicher Ort.</p>
    ${row(n >= 4, `Wochenfotos ${n}/4`, 'frontal, links, rechts, Hals von unten', `<button class="pill-btn" data-a="photo-week-go" data-ws="${ws}">${icon('camera')}Fotos</button>`)}
    ${row(w != null, 'Gewicht', w != null ? `${fmt(w, 1)} kg eingetragen` : 'nüchtern, ohne Kleidung', `<label class="mini-in"><input type="text" inputmode="decimal" data-c="health" data-k="weight" data-date="${k}" value="${numIn((getDay(k).health || {}).weight, 1)}" placeholder="kg" aria-label="Gewicht"></label>`)}
    ${row(sc != null, 'Hautbild', sc != null ? `heute ${sc}/10` : '1 = sehr schlecht, 10 = sehr gut', `<button class="pill-btn" data-a="goto" data-tab="haut" data-sub="heute">Bewerten</button>`)}
  </section>`;
}
function todoCard() {
  const due = todosDue(7);
  const undated = todosOpen().filter((t) => !t.date);
  if (!due.length && !undated.length) return '';
  const today = todayKey();
  const rows = due.slice(0, 4).map((t) => { const n = daysBetween(today, t.date); const when = n < 0 ? `überfällig seit ${-n} ${n === -1 ? 'Tag' : 'Tagen'}` : n === 0 ? 'heute' : n === 1 ? 'morgen' : `in ${n} Tagen (${fmtDate(t.date, { weekday: 'short', day: 'numeric', month: 'short' })})`; return `<button class="row-check${n < 0 ? ' is-over' : ''}" data-a="todo" data-id="${t.id}"><span class="tgl-box">${icon('check')}</span><span><b>${esc(t.t)}</b><small>${esc(when)}</small></span></button>`; }).join('');
  return `<section class="sec"><div class="sec-head"><h2>Termine & To-dos</h2>${goBtn('knie', 'Alle', 'infos')}</div>
    ${rows ? `<div class="list">${rows}</div>` : ''}${undated.length ? `<p class="hint">${undated.length} offene${undated.length === 1 ? 's' : ''} To-do${undated.length === 1 ? '' : 's'} ohne Datum.</p>` : ''}</section>`;
}
function reviewReadyCard(k) {
  if (weekday(k) !== 6 || new Date().getHours() < 16) return '';
  const ws = weekStart(k), next = weekGoals(addDays(ws, 7)).length;
  return `<div class="banner">${icon('calendar-check')}<div><b>Dein Wochenrückblick ist fertig</b><span>${next ? 'Die Ziele für die neue Woche stehen schon.' : 'Schick ihn Frank, er gibt dir 3 Ziele für die neue Woche zurück.'}</span></div><div class="banner-acts">${next ? '' : `<button class="pill-btn is-accent" data-a="report-open" data-ws="${ws}">An Frank</button>`}<button class="pill-btn" data-a="goto" data-tab="woche" data-sub="rueckblick">Ansehen</button></div></div>`;
}

/* ============================================================
   MEHR
   ============================================================ */
function vMehr() {
  const tabs = navTabs();
  let h = '<header class="page-head is-tight"><h1>Alle Bereiche</h1></header><div class="list area-list">';
  for (const a of AREAS) {
    if (a.id === 'heute') continue;
    const st = areaStatus(a.id);
    h += `<button class="row area-row" data-a="goto" data-tab="${a.id}"><span class="area-ic">${icon(a.ic)}</span><span class="row-main"><b>${esc(a.n)}${tabs.includes(a.id) ? ' <em class="est is-blue">Tab</em>' : ''}</b><small>${[st.v ? String(st.v).replace(/<[^>]+>/g, '') : '', String(st.s || '').replace(/<[^>]+>/g, '')].filter(Boolean).join(' · ')}</small></span>${stDot(st.st || 'none')}${icon('chevron-right', 'row-ic')}</button>`;
  }
  return h + `</div><button class="btn is-ghost" data-a="goto-set" data-id="nav">${icon('layout-grid')}Tab-Leiste anpassen</button>`;
}

/* ============================================================
   ERNÄHRUNG – Übersicht & Verlauf
   ============================================================ */
function vErnOverview(k) {
  const ev = evaluate(k);
  let h = (k === todayKey() ? goalNotes(['ern']) : '') + dayControls(k, true);
  if (k === todayKey()) {
    const nb = nowBlock(k);
    h += `<section class="block-now">${nb ? blockCard(nb, k, { now: true }) : `<div class="all-done">${icon('check')}<div><b>Standardtag erledigt</b><span>Trink weiter über den Tag verteilt.</span></div></div>`}${openBlocksLine(k, nb)}</section>`;
  }
  h += ringsRow(k, ev);
  h += energyBar(ev.act.tot);
  h += microSection(k, ev);
  h += tipsSection(k, 4);
  if (k === todayKey()) h += energyCard(k);
  h += trendSection(k, 3);
  const caf = getDay(k).caf || [];
  if (caf.length) h += `<p class="hint">Koffein-Getränke aus „Licht & Koffein“ zählen mit: ${esc(caf.map((c) => c.n).join(', '))}.</p>`;
  return h;
}
function vErnVerlauf() {
  const n = ui.range, keys = rangeKeys(n);
  const st = streak('nutri');
  let h = `<section class="streaks is-2"><div class="streak${st.cur ? ' is-live' : ''}"><span class="streak-ic">${icon('flame')}</span><b>${st.cur}</b><span class="streak-l">${st.cur === 1 ? 'Tag' : 'Tage'} Ernährungsziele</span><small>Rekord ${st.best}</small></div>
    <div class="streak"><span class="streak-ic">${icon('sprout')}</span><b>${weekPlants(todayKey()).size}</b><span class="streak-l">Pflanzen diese Woche</span><small>Ziel ${T().plants.lo}</small></div></section>`;
  h += `<div class="range-row">${seg('range', String(n), [['7', '7 Tage'], ['30', '30 Tage'], ['90', '90 Tage']])}</div>`;
  h += coverageHTML(keys);
  h += macrosHTML(keys);
  return h;
}

/* ============================================================
   SUPPLEMENTS
   ============================================================ */
function vSupp() {
  const k = ui.date, d = getDay(k), variant = dayVariant(k);
  let h = areaHead('supp') + dateBar(k);
  const daily = dailySupps().filter(({ it }) => itemInVariant(it, variant));
  const done = daily.filter(({ it }) => d.checks[it.id]).length;
  const q7 = suppQuota(rangeKeys(7, k));
  const st = streak('supp');
  h += `<div class="kv-grid is-3"><div class="kv"><span>Heute</span><b>${done}/${daily.length}</b><small>tägliche</small></div><div class="kv"><span>Quote 7 Tage</span><b>${q7 ? fmt(q7.pct) + ' %' : '–'}</b><small>${q7 ? `${q7.taken} von ${q7.planned}` : 'noch keine Daten'}</small></div><div class="kv"><span>Serie</span><b>${st.cur}</b><small>Rekord ${st.best}</small></div></div>`;
  h += suppSection(k);
  const ph = skinPhase(k);
  const b = ag1Budget(k);
  h += `<section class="sec"><div class="sec-head"><h2>AG1</h2></div><div class="card">${ph && (ph.block || []).includes('ag1') ? `<p class="warn-txt">${icon('triangle-alert')} ${esc(ph.n)} im Haut-Protokoll: AG1 pausieren.</p>` : ''}<p>${esc(ag1BudgetLong(b))}</p><p class="hint">Eine halbe Portion lässt sich über das Stift-Symbol eintragen. Die App rechnet nur, was du abhakst.</p></div></section>`;
  /* 7-Tage-Raster */
  const keys = rangeKeys(7, k);
  const list = suppItems().filter(({ it }) => FOOD[it.food].supp === 'daily' || keys.some((x) => (peekDay(x) || { checks: {} }).checks[it.id]));
  h += `<section class="sec"><div class="sec-head"><h2>Letzte 7 Tage</h2></div><div class="table-wrap"><table class="grid-t"><tr><th></th>${keys.map((x) => `<th>${WD_SHORT[weekday(x)]}</th>`).join('')}</tr>
    ${list.map(({ it }) => `<tr><td>${esc(shortName(FOOD[it.food]))}</td>${keys.map((x) => { const dd = peekDay(x); const on = dd && dd.checks[it.id]; return `<td class="${on ? 'is-on' : ''}">${on ? icon('check') : '·'}</td>`; }).join('')}</tr>`).join('')}</table></div></section>`;
  /* Infos je Supplement */
  h += `<section class="sec"><div class="sec-head"><h2>Einnahme & Wirkung</h2></div><div class="mlist">`;
  for (const { it, block } of suppItems()) {
    const f = FOOD[it.food], open = ui.exp.has('s:' + it.id);
    const top = Object.entries(f.v || {}).filter(([key, v]) => v && NUTRIENTS[key] && !['kcal', 'p', 'f', 'c', 'na', 'sf'].includes(key)).slice(0, 6).map(([key, v]) => `${NUTRIENTS[key].n} ${fmt(key === 'vd' ? v * 40 : v, v < 10 ? 1 : 0)} ${key === 'vd' ? 'IE' : NUTRIENTS[key].u}`);
    h += `<div class="mrow${open ? ' is-open' : ''}"><button class="mrow-hit" data-a="expand" data-key="s:${it.id}"><div class="mrow-top"><span class="mname">${esc(shortName(f))}</span><span class="mval"><small>${esc(amountLabel(it.a, it.u, true))}${block && block.time ? ` · ${block.time === 'training' ? 'Training' : block.time}` : ''}</small></span></div></button>
      ${open ? `<div class="mrow-detail"><p class="hint">${esc(it.hint || (f.supp === 'daily' ? 'täglich' : 'bei Bedarf'))}${block ? ` · ${esc(block.n)}` : ''}</p>${top.length ? `<p class="hint">Pro ${esc(f.u[0][0])}: ${esc(top.join(', '))}</p>` : ''}${infoHTML(f.id)}</div>` : ''}</div>`;
  }
  h += `</div><button class="link-btn more" data-a="goto-set" data-id="plan">Supplements im Standardtag bearbeiten</button></section>`;
  return h;
}

/* ============================================================
   TRAINING & SAUNA
   ============================================================ */
const PLAN_IC = { gym: 'dumbbell', kraft: 'footprints', lauf: 'activity', lang: 'stretch-horizontal', mob: 'person-standing', walk: 'footprints', sauna: 'thermometer', vorlauf: 'timer' };
function vTrain() {
  if (ui.gymSess) return vGymSession();
  const sub = getSub('train', 'heute');
  let h = areaHead('train');
  h += subnav('train', sub, [['heute', 'Heute'], ['woche', 'Woche'], ['gym', 'Gym-Plan'], ['verlauf', 'Verlauf']]);
  if (sub === 'heute' || sub === 'woche') h += goalNotes(['training', 'sauna']);
  if (sub === 'heute') h += vTrainToday(ui.date);
  else if (sub === 'woche') h += vTrainWeek();
  else if (sub === 'gym') h += vGymPlan();
  else h += vTrainHistory();
  return h;
}
function recoveryCard(k) {
  const r = recovery(k);
  const lbl = r.normal ? 'Erholung normal' : { green: 'Erholung gut', yellow: 'Erholung mittel', red: 'Erholung schlecht', none: 'Erholung unbekannt' }[r.level];
  const st = { green: 'ok', yellow: 'under', red: 'over', none: 'none' }[r.level];
  const rd = r.ready;
  const score = rd ? `<span class="rec-score"><b>${fmt(rd.score)}</b><small>Bereitschaft<br>${readinessLabel(rd.score)}</small></span>` : '';
  const how = !rd ? '' : rd.src === 'eigen' ? `Bereitschaft aus ${rd.parts.map((p) => p.n).join(', ')} – eigene Berechnung, weil Garmin sie nicht herausgibt.` : `Bereitschaft von dir eingetragen${rd.own != null ? ` (die App rechnet ${fmt(rd.own)})` : ''}.`;
  return `<section class="card rec-card st-${st}"><div class="rec-top">${stDot(st)}<b>${lbl}</b>${r.level === 'none' ? goBtn('garmin', 'Garmin eintragen') : score}</div>
    ${r.sig.length ? `<div class="chips chips-tight">${r.sig.map((x) => `<span class="chip chip-xs is-static sig-${x.s < 0 ? 'bad' : x.s > 0 ? 'good' : 'mid'}">${esc(x.n)} ${esc(x.v)}</span>`).join('')}</div>` : ''}
    <p>${esc(r.text)}</p>${r.notes.map((n) => `<p class="hint">${icon('info')} ${esc(n)}</p>`).join('')}${how ? `<p class="hint">${esc(how)}</p>` : ''}</section>`;
}
function trainRow(t, k) {
  const tt = trainType(t);
  const gs = t.gym ? gymProgress(t) : null;
  const parts = [t.time ? t.time + ' Uhr' : '', t.dur ? t.dur + ' Min.' : '', t.int ? 'Intensität ' + t.int : '', t.km ? fmt(t.km, 1) + ' km' : '', t.g && t.g.pace && (tt.run || tt.light) ? garPace(t.g.pace) + ' /km' : '', t.hr ? 'Ø ' + t.hr + ' bpm' : '', t.g && t.g.tel ? garTE(t.g.tel) : '', tt.run && t.pain != null ? 'Schmerz ' + t.pain + '/10' : '', gs && (gs.done || !t.gid) ? `${gs.done}/${gs.total} Sätze` : ''].filter(Boolean).join(' · ');
  return `<div class="row-wrap"><button class="row" data-a="training-edit" data-id="${t.id}" data-date="${k}"><span class="area-ic">${icon(tt.run ? 'activity' : tt.gym ? 'dumbbell' : tt.light ? 'person-standing' : 'flame')}</span><span class="row-main"><b>${esc(t.type)}${t.gym ? ` <em class="est is-blue">Schedule ${t.gym.sched}</em>` : ''}${t.gid ? ' <em class="est">Garmin</em>' : ''}</b><small>${esc(parts || 'ohne Details')}</small></span>${icon('pencil', 'row-ic')}</button>${t.gym ? `<button class="pill-btn row-act" data-a="gym-open" data-id="${t.id}" data-date="${k}">Sätze</button>` : ''}</div>`;
}
function vTrainToday(k) {
  const d = getDay(k);
  let h = dateBar(k);
  h += recoveryCard(k);
  const wp = weekPlan(weekStart(k)), day = wp.days[weekday(k)];
  h += `<section class="sec"><div class="sec-head"><h2>${k === todayKey() ? 'Heute geplant' : 'Geplant'}</h2>${goBtn('train', 'Woche', 'woche')}</div>${day.warn ? `<div class="banner is-warn">${icon('triangle-alert')}<div><span>${esc(day.warn)}</span></div></div>` : ''}<div class="list">`;
  for (const it of day.items) {
    let act = '';
    if (it.kind === 'gym' && !it.done) act = `<button class="pill-btn is-accent" data-a="gym-start" data-day="${it.day}" data-date="${k}">${k < todayKey() ? 'Nachtragen' : 'Starten'}</button>`;
    else if (it.kind === 'kraft' && !it.done) act = `<button class="pill-btn" data-a="goto" data-tab="knie" data-sub="kraft">Öffnen</button>`;
    else if (it.kind === 'lauf' && !it.done) act = `<button class="pill-btn" data-a="run-add" data-date="${k}">Eintragen</button>`;
    else if ((it.kind === 'lang' || it.kind === 'mob') && !it.done) act = `<button class="pill-btn" data-a="timer-start" data-r="${it.kind === 'lang' ? 'lang' : 'taeglich'}">${icon('play')}Start</button>`;
    h += `<div class="plan-row${it.done ? ' is-done' : ''}${it.moved ? ' is-moved' : ''}"><span class="tgl-box">${icon('check')}</span><span class="row-main"><b>${esc(it.n)}${it.kind === 'gym' && gymDay(it.day) ? ` <em class="est is-blue">Schedule ${gymSched(k)}</em>` : ''}</b>${it.kind === 'gym' && gymDay(it.day) ? `<small>${esc(gymDay(it.day).sub)}, ca. ${gymDay(it.day).min} Min.</small>` : ''}</span>${act}</div>`;
  }
  h += `</div></section>`;
  const tr = d.trainings || [];
  h += `<section class="sec"><div class="sec-head"><h2>Eingetragen</h2><button class="pill-btn" data-a="training-add" data-date="${k}">${icon('plus')}Training</button></div>
    ${tr.length ? `<div class="list">${tr.map((t) => trainRow(t, k)).join('')}</div>` : '<p class="sec-sub">Noch nichts eingetragen.</p>'}`;
  if (d.training) h += `<p class="hint">${icon('salad')} Ernährung: ${esc(TRAINING[d.training].n)} – ${esc(TRAINING[d.training].hint)}</p>`;
  h += '</section>';
  h += saunaSection(k, wp.sauna);
  return h;
}
function saunaSection(k, sw) {
  const d = getDay(k);
  const ses = d.sauna || [];
  const latest = minToTime(sw.latest);
  let h = `<section class="sec"><div class="sec-head"><h2>Sauna</h2><span class="count">Woche ${fmt(sw.done)}/${fmt(sw.goal)} Min.</span></div>${progBar(sw.done, sw.goal, sw.done >= sw.goal ? 'ok' : '')}`;
  h += `<div class="chips chips-tight sauna-add"><span class="hint">Gang hinzufügen:</span>${[8, 10, 12, 15, 20].map((m) => `<button class="chip chip-sm" data-a="sauna-add" data-v="${m}" data-date="${k}">+ ${m} Min.</button>`).join('')}</div>`;
  if (ses.length) h += `<div class="chips">${ses.map((s, i) => `<button class="chip is-on" data-a="sauna-del" data-i="${i}" data-date="${k}" aria-label="Gang löschen">${i + 1}. Gang ${s.min} Min.${s.t ? ' · ' + s.t : ''} ${icon('x')}</button>`).join('')}</div>`;
  if (sw.rest > 0) {
    h += sw.sugg.length ? `<p class="sec-sub">Noch ${fmt(sw.rest)} Min. bis zum Wochenziel. Vorschlag (nach dem Training, spätestens ${latest} Uhr):</p><ul class="wins">${sw.sugg.map((s) => `<li>${icon('thermometer')}<span><b>${esc(WD_LONG[weekday(s.k)])}</b>: ${s.min} Min.${s.after ? ` nach ${esc(s.after)}` : ''} (${s.min >= 20 ? `2 Gänge à ${Math.round(s.min / 2)} Min.` : '1 Gang'})</span></li>`).join('')}</ul>${sw.left > 0 ? `<p class="hint">Die restlichen ${fmt(sw.left)} Min. passen diese Woche nicht mehr sinnvoll rein.</p>` : ''}` : `<p class="sec-sub">Noch ${fmt(sw.rest)} Min. offen – diese Woche bleibt kein passender Tag mehr.</p>`;
  } else h += `<p class="sec-sub">${icon('check')} Wochenziel erreicht.</p>`;
  return h + `<p class="hint">Danach gut trinken (Elektrolyte). Nicht in den letzten 2–3 Stunden vor dem Schlafen.</p></section>`;
}
function vTrainWeek() {
  const ws = ui.trainWeek;
  const wp = weekPlan(ws);
  let h = weekNav(ws, 'train-week', addDays(weekStart(todayKey()), 7));
  h += `<p class="sec-sub">Schedule ${gymSched(ws)} diese Woche. Knie-Kraft nach dem Oberkörpertraining, kein schweres Beintraining am Tag vor einem Lauf.</p>`;
  for (const n of wp.notes) h += `<div class="banner is-warn">${icon('triangle-alert')}<div><span>${esc(n)}</span></div></div>`;
  for (const d of wp.days) {
    const rec = d.isToday ? recovery(d.k) : null;
    h += `<div class="day-card${d.isToday ? ' is-today' : ''}${d.past ? ' is-past' : ''}"><div class="day-top"><b>${WD_LONG[d.i]}</b><span>${esc(fmtDate(d.k, { day: 'numeric', month: 'short' }))}</span>${rec && rec.level !== 'none' ? stDot({ green: 'ok', yellow: 'under', red: 'over' }[rec.level]) : ''}</div>
      <div class="day-items">${d.items.map((it) => `<span class="pi${it.done ? ' is-done' : d.past ? ' is-miss' : ''}${it.moved ? ' is-moved' : ''}">${icon(it.done ? 'check' : PLAN_IC[it.kind] || 'circle')}${esc(it.n)}</span>`).join('')}</div>
      ${d.warn ? `<p class="warn-txt">${icon('triangle-alert')} ${esc(d.warn)}</p>` : ''}${rec && rec.level !== 'none' && rec.level !== 'green' ? `<p class="hint">${esc(rec.text)}</p>` : ''}</div>`;
  }
  const sw = wp.sauna;
  h += `<section class="sec"><div class="sec-head"><h2>Sauna</h2><span class="count">${fmt(sw.done)}/${fmt(sw.goal)} Min.</span></div>${progBar(sw.done, sw.goal, sw.done >= sw.goal ? 'ok' : '')}${sw.sugg.length ? `<p class="hint">Vorschlag: ${esc(sw.sugg.map((s) => `${WD_SHORT[weekday(s.k)]} ${s.min} Min.`).join(', '))}</p>` : ''}</section>`;
  h += `<button class="btn is-ghost" data-a="goto-set" data-id="training">${icon('pencil')}Wochenstruktur anpassen</button>`;
  return h;
}
function vGymPlan() {
  const k = todayKey();
  const tplDay = weekTpl(weekday(k)).gym;
  const dayN = ui.gymDay || tplDay || 1;
  const gd = gymDay(dayN), sched = gymSched(k);
  const alt = S.settings.gym.kneeAlt;
  let h = `<div class="seg">${GYM_DAYS.map((g) => `<button class="${g.day === dayN ? 'is-on' : ''}" data-a="gym-day" data-v="${g.day}">Tag ${g.day}</button>`).join('')}</div>`;
  h += `<section class="card"><div class="gym-head"><div><h3>${esc(gd.n)}</h3><small>${esc(gd.sub)} · ca. ${gd.min} Min.</small></div><div class="seg is-mini">${['A', 'B'].map((s) => `<button class="${s === sched ? 'is-on' : ''}" data-a="gym-sched" data-v="${s}">${s}</button>`).join('')}</div></div>
    <p class="hint">Diese Woche Schedule ${sched} (${sched === 'A' ? 'schwer, wenige Wiederholungen' : 'mehr Wiederholungen'}), wechselt wöchentlich. ${esc(GYM_REST)}</p>
    ${gd.legs ? `<button class="tgl${alt ? ' is-on' : ''} wide" data-a="gym-alt"><span class="tgl-box">${icon('check')}</span><span class="tgl-txt"><b>Knie-Varianten nutzen</b><small>solange das Knie Probleme macht</small></span></button>` : ''}</section>`;
  h += `<div class="list gym-list">${gd.ex.map((ex, i) => {
    const t = gymTarget(ex, sched, alt && gd.legs);
    const last = lastGymLog(ex.id, k);
    return `<div class="gym-ex"><span class="gym-n">${i + 1}</span><div class="row-main"><b>${esc(t.n)}</b><small>${t.sets} × ${esc(t.reps)} · ${esc(t.note)}</small>${last ? `<small class="last">Letztes Mal: ${esc(last.sets.map((s) => `${s.w != null ? fmt(s.w, 1) + ' kg' : ''}${s.r != null ? ' × ' + s.r : ''}`).join(', '))}</small>` : ''}</div></div>`;
  }).join('')}</div>`;
  if (gd.legs) h += `<p class="hint">${icon('footprints')} ${esc(GYM_KNEE_RULE)}</p>`;
  h += `<button class="btn is-accent" data-a="gym-start" data-day="${dayN}" data-date="${k}">${icon('play')}${esc(gd.n)} heute starten</button>`;
  return h;
}
function gymProgress(t) {
  const gd = gymDay(t.gym.day);
  let done = 0, total = 0;
  for (const ex of gd ? gd.ex : []) { const e = t.gym.ex[ex.id] || {}; const tg = gymTarget(ex, t.gym.sched, e.alt); total += tg.sets; done += (e.s || []).filter((s) => s.d).length; }
  return { done, total };
}
function vGymSession() {
  const { k, id } = ui.gymSess;
  const d = getDay(k);
  const t = (d.trainings || []).find((x) => x.id === id);
  if (!t || !t.gym) { ui.gymSess = null; return vTrain(); }
  const gd = gymDay(t.gym.day);
  const gs = gymProgress(t);
  let h = `<header class="page-head is-tight sess-head"><button class="icon-btn" data-a="gym-close" aria-label="Zurück">${icon('chevron-left')}</button><div><h1>${esc(gd.n)}</h1><p class="eyebrow-date">Schedule ${t.gym.sched} · ${esc(fmtDate(k, { weekday: 'short', day: 'numeric', month: 'short' }))}${t.time ? ' · ' + t.time + ' Uhr' : ''}</p></div></header>`;
  h += `<div class="sess-prog">${progBar(gs.done, gs.total, gs.done >= gs.total ? 'ok' : '')}<span>${gs.done}/${gs.total} Sätze</span></div>`;
  for (const ex of gd.ex) {
    const e = t.gym.ex[ex.id] || { s: [] };
    const tg = gymTarget(ex, t.gym.sched, e.alt);
    const last = lastGymLog(ex.id, addDays(k, -1), t.id);
    const rows = Array.from({ length: Math.max(tg.sets, (e.s || []).length) }, (_, i) => {
      const s = (e.s || [])[i] || {};
      const ls = last && last.sets[i];
      return `<div class="set-row${s.d ? ' is-done' : ''}"><button class="set-chk" data-a="gym-set" data-ex="${ex.id}" data-i="${i}" aria-pressed="${!!s.d}" aria-label="Satz ${i + 1} erledigt"><span class="tgl-box">${icon('check')}</span><span>${i + 1}</span></button>
        <label class="set-in"><input type="text" inputmode="decimal" data-c="gym-val" data-ex="${ex.id}" data-i="${i}" data-f="w" value="${numIn(s.w, 2)}" placeholder="${ls && ls.w != null ? numIn(ls.w, 2) : 'kg'}"><span>kg</span></label>
        <label class="set-in"><input type="text" inputmode="numeric" data-c="gym-val" data-ex="${ex.id}" data-i="${i}" data-f="r" value="${s.r ?? ''}" placeholder="${ls && ls.r != null ? ls.r : String(tg.reps).split(/[–\s]/)[0]}"><span>Wdh.</span></label></div>`;
    }).join('');
    h += `<section class="card gym-card"><div class="gym-head"><div><h3>${esc(tg.n)}</h3><small>${tg.sets} × ${esc(tg.reps)} · ${esc(tg.note)}</small></div>${ex.alt ? `<button class="chip chip-xs${e.alt ? ' is-on' : ''}" data-a="gym-exalt" data-ex="${ex.id}">${icon('footprints')}Knie-Variante</button>` : ''}</div>
      ${last ? `<p class="hint">Letztes Mal (${esc(fmtDate(last.k, { day: 'numeric', month: 'short' }))}${last.alt ? ', Knie-Variante' : ''}): ${esc(last.sets.map((s) => `${s.w != null ? fmt(s.w, 1) : '–'} × ${s.r ?? '–'}`).join(', '))}</p>` : ''}
      ${rows}<button class="link-btn" data-a="gym-addset" data-ex="${ex.id}">${icon('plus')} Satz</button></section>`;
  }
  h += `<section class="card"><h3>Abschluss</h3><div class="form"><div class="frow"><span class="flabel">Dauer</span><div class="fin"><input type="text" inputmode="numeric" data-c="gym-meta" data-f="dur" value="${t.dur ?? ''}" placeholder="${t.start ? Math.max(1, Math.round((Date.now() - t.start) / 60000)) : '–'}"><span class="unit">Min.</span></div></div></div>
    <p class="flabel-s">Intensität (1 = sehr leicht, 10 = maximal)</p>${scale10('gym-int', t.int ?? null, k)}
    <button class="btn is-accent" data-a="gym-finish">${icon('check')}Einheit abschließen</button></section>`;
  return h;
}
function vTrainHistory() {
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(weekStart(todayKey()), -7 * (7 - i)));
  const rows = weeks.map((ws) => {
    let gym = 0, run = 0, other = 0, sauna = 0, min = 0;
    for (const k of weekKeys(ws)) { const d = peekDay(k); if (!d) continue; sauna += saunaMin(d); for (const t of d.trainings || []) { const tt = trainType(t); if (tt.light) continue; min += Number(t.dur) || 0; if (tt.gym || ['Gym (frei)', 'Push', 'Pull', 'Beine'].includes(tt.id)) gym++; else if (tt.run) run++; else other++; } }
    return { ws, gym, run, other, sauna, min };
  });
  const series = [{ key: 'gym', name: 'Gym', color: SERIES.p }, { key: 'run', name: 'Laufen', color: SERIES.c }, { key: 'other', name: 'Sonstiges', color: SERIES.two }];
  const legend = `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}</div>`;
  const keys = weeks;
  const body = stackedColumns({ keys, rows: rows.map((r) => ({ gym: r.gym, run: r.run, other: r.other })), series, unit: 'Einheiten' });
  const table = `<tr><th>Woche</th><th>Gym</th><th>Lauf</th><th>Sonst.</th><th>Min.</th><th>Sauna</th></tr>` + rows.map((r) => `<tr><td>${shortDate(r.ws)}</td><td>${r.gym}</td><td>${r.run}</td><td>${r.other}</td><td>${fmt(r.min)}</td><td>${fmt(r.sauna)}</td></tr>`).join('');
  let h = chartCard('trw', 'Einheiten pro Woche', 'Letzte 8 Wochen, Wochen beginnen montags.', body, table, legend);
  const sv = rows.map((r) => r.sauna);
  h += chartCard('sau', 'Sauna-Minuten pro Woche', `Ziel ${fmt(S.settings.sauna.goal)} Min.`, lineChart({ keys, series: [{ name: 'Sauna', color: SERIES.f, vals: sv, dots: true }], band: { lo: S.settings.sauna.goal, hi: S.settings.sauna.goal * 1.5 }, unit: 'Min.' }), null);
  /* Übungsverlauf (bester Satz) */
  const exs = GYM_DAYS.flatMap((g) => g.ex.map((e) => ({ ...e, day: g.day })));
  const sel = ui.trainMetric || exs[0].id;
  const pts = [];
  for (const k of rangeKeys(120)) { const d = peekDay(k); if (!d) continue; for (const t of d.trainings || []) { const e = t.gym && t.gym.ex && t.gym.ex[sel]; if (!e) continue; const ws2 = (e.s || []).filter((s) => s.w != null); if (ws2.length) pts.push({ k, v: Math.max(...ws2.map((s) => s.w)), alt: e.alt }); } }
  const chips = `<label class="choice-select wide">${icon('chevron-down')}<select data-c="train-metric" aria-label="Übung wählen">${GYM_DAYS.map((g) => `<optgroup label="Tag ${g.day}: ${esc(g.n)}">${g.ex.map((e) => `<option value="${e.id}" ${e.id === sel ? 'selected' : ''}>${esc(e.n)}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
  const body2 = pts.length >= 1 ? lineChart({ keys: pts.map((p) => p.k), series: [{ name: 'Bester Satz', color: SERIES.one, vals: pts.map((p) => p.v), dots: true }], unit: 'kg', fmtY: (v) => fmt(v, 1) }) : emptyChart('Noch keine Sätze mit Gewicht für diese Übung.');
  h += chartCard('gx', 'Gewicht je Übung', chips, body2, pts.length ? `<tr><th>Tag</th><th>Bester Satz</th></tr>` + pts.map((p) => `<tr><td>${shortDate(p.k)}</td><td>${fmt(p.v, 1)} kg${p.alt ? ' (Knie-Variante)' : ''}</td></tr>`).join('') : null);
  return h;
}
/* Training eintragen/bearbeiten */
function sheetTrain(k, id, preset = {}) {
  const d = getDay(k);
  const t = id ? clone((d.trainings || []).find((x) => x.id === id)) : { id: null, type: preset.type || 'Oberkörper A', time: preset.time || (k === todayKey() ? minToTime(nowMin()) : ''), dur: null, int: null, load: null, note: '' };
  ui.sheet = { type: 'train', k, t };
  renderTrainSheet();
}
function renderTrainSheet() {
  const { t } = ui.sheet;
  const tt = trainType(t);
  const shoes = [...new Set(Object.values(S.days).flatMap((d) => (d.trainings || []).map((x) => x.shoe).filter(Boolean)))];
  openSheet(`<h3 class="sheet-title">${t.id ? 'Training bearbeiten' : 'Training eintragen'}</h3>
    <div class="chips">${TRAIN_TYPES.map((x) => `<button class="chip chip-sm${x.id === tt.id ? ' is-on' : ''}" data-a="trs-type" data-v="${esc(x.id)}">${esc(x.id)}</button>`).join('')}</div>
    <div class="form"><div class="frow"><span class="flabel">Datum</span><div class="fin"><input type="date" id="trs-date" value="${ui.sheet.nk || ui.sheet.k}" max="${todayKey()}"></div></div>
    <div class="frow"><span class="flabel">Uhrzeit</span><div class="fin"><input type="time" id="trs-time" value="${esc(t.time || '')}"></div></div>
    <div class="frow"><span class="flabel">Dauer</span><div class="fin"><input type="text" inputmode="numeric" id="trs-dur" value="${t.dur ?? ''}" placeholder="–"><span class="unit">Min.</span></div></div>
    ${tt.run ? `<div class="frow"><span class="flabel">Distanz</span><div class="fin"><input type="text" inputmode="decimal" id="trs-km" value="${numIn(t.km, 2)}" placeholder="–"><span class="unit">km</span></div></div>
    <div class="frow"><span class="flabel">Kadenz</span><div class="fin"><input type="text" inputmode="numeric" id="trs-cad" value="${t.cad ?? ''}" placeholder="Garmin"><span class="unit">spm</span></div></div>
    <div class="frow is-wide"><span class="flabel">Einlagen</span><div class="chips chips-tight">${[['1', 'Ja'], ['0', 'Nein']].map(([v, l]) => `<button class="chip chip-xs${(t.ins ? '1' : t.ins === false ? '0' : '') === v ? ' is-on' : ''}" data-a="trs-ins" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div class="frow is-wide"><span class="flabel">Schuh</span><div class="fin"><input type="text" id="trs-shoe" list="shoes" value="${esc(t.shoe || '')}" placeholder="z. B. Modell"><datalist id="shoes">${shoes.map((s) => `<option value="${esc(s)}">`).join('')}</datalist></div></div>` : ''}
    <div class="frow"><span class="flabel">Garmin-Belastung</span><div class="fin"><input type="text" inputmode="numeric" id="trs-load" value="${t.load ?? ''}" placeholder="optional"></div></div></div>
    ${t.gid ? garTrainInfo(t, tt) : ''}
    ${tt.run ? `<p class="flabel-s">Knieschmerz während des Laufs (0–10)</p>${scale0('trs-pain', t.pain ?? null, ui.sheet.k)}` : ''}
    <p class="flabel-s">Intensität (1–10)</p>${scale10('trs-int', t.int ?? null, ui.sheet.k)}
    <textarea class="note" id="trs-note" rows="2" placeholder="Notiz">${esc(t.note || '')}</textarea>
    <div class="sheet-acts"><button class="btn is-accent" data-a="trs-save">Speichern</button>${t.id ? '<button class="btn is-danger" data-a="trs-del">Löschen</button>' : ''}</div>`);
}

/* ============================================================
   LICHT & KOFFEIN
   ============================================================ */
function vLicht() {
  const k = ui.date, d = getDay(k);
  let h = areaHead('licht') + (k === todayKey() ? goalNotes(['koffein', 'schlaf']) : '') + dateBar(k);
  /* Licht */
  const lm = !!d.habits.licht_morgen, ln = !!d.habits.licht_nachmittag;
  const lmin = d.hd && d.hd.lightMin;
  h += `<section class="sec"><div class="sec-head"><h2>Licht</h2><span class="count">${{ garmin: 'aufgewacht', eingetragen: 'aufgestanden', eingestellt: 'aufstehen' }[rhythm(k).wakeSrc] || 'aufstehen ~'} ${minToTime(rhythm(k).wake)}</span></div><div class="toggle-grid">
    <button class="tgl${lm ? ' is-on' : ''}" data-a="habit" data-id="licht_morgen" data-date="${k}" aria-pressed="${lm}"><span class="tgl-box">${icon('check')}</span><span class="tgl-txt"><b>Morgenlicht${garHabitMark(d, 'licht_morgen')}</b><small>10–30 Min. draußen nach dem Aufstehen</small></span></button>
    <button class="tgl${ln ? ' is-on' : ''}" data-a="habit" data-id="licht_nachmittag" data-date="${k}" aria-pressed="${ln}"><span class="tgl-box">${icon('check')}</span><span class="tgl-txt"><b>Nachmittagslicht</b><small>ein paar Minuten im späten Licht</small></span></button></div>
    <div class="chips chips-tight light-min"><span class="hint">Morgens draußen:</span>${[10, 15, 20, 30, 45].map((m) => `<button class="chip chip-xs${lmin === m ? ' is-on' : ''}" data-a="light-min" data-v="${m}" data-date="${k}">${m} Min.</button>`).join('')}</div>
    <div class="mlist">${topicRow('licht_morgen', 'Warum Morgenlicht?')}</div></section>`;
  /* Koffein */
  const ci = cafInfo(k);
  const isT = k === todayKey();
  const tval = (m) => (m == null ? '–' : m >= 1440 ? minToTime(m - 1440) + ' (+1)' : minToTime(m));
  const warns = cafLateWarn(ci);
  h += `<section class="sec"><div class="sec-head"><h2>Koffein</h2><span class="count">Halbwertszeit ${fmt(S.settings.caf.halfLife, 1)} Std.</span></div>
    <div class="kv-grid is-4"><div class="kv"><span>Heute gesamt</span><b>${fmt(ci.total)}</b><small>mg</small></div><div class="kv"><span>${isT ? 'Jetzt im Körper' : 'Zur Schlafenszeit'}</span><b>${fmt(isT ? ci.nowLevel : ci.bedLevel)}</b><small>mg</small></div>
    <div class="kv"><span>Unter 50 mg</span><b>${ci.last == null ? '–' : ci.below50 <= (isT ? ci.now : 0) ? 'jetzt' : tval(ci.below50)}</b><small>${ci.last == null ? 'kein Koffein' : 'Uhr'}</small></div><div class="kv"><span>Unter 25 mg</span><b>${ci.last == null ? '–' : ci.below25 <= (isT ? ci.now : 0) ? 'jetzt' : tval(ci.below25)}</b><small>${ci.last == null ? '' : 'Uhr'}</small></div></div>
    ${warns.map((w) => `<div class="banner is-warn">${icon('triangle-alert')}<div><span>${esc(w)}</span></div></div>`).join('')}
    <div class="chart-box">${cafChart(k, ci)}</div>
    <div class="legend"><span><i class="line-key" style="background:var(--coffee)"></i>Koffein im Körper</span><span><i class="line-key dashed"></i>50 / 25 mg</span><span><i class="line-key" style="background:var(--screens)"></i>Schlafenszeit</span></div>
    <h5>Schnell eintragen${isT ? ' (jetzt)' : ''}</h5><div class="caf-grid">${S.settings.caf.presets.map((p) => `<button class="caf-btn" data-a="caf-add" data-id="${p.id}" data-date="${k}"><b>${esc(p.n)}</b><small>${fmt(p.mg)} mg</small></button>`).join('')}<button class="caf-btn is-new" data-a="caf-custom" data-date="${k}"><b>${icon('plus')} Eigenes Getränk</b><small>anlegen</small></button></div>`;
  const src = ci.today;
  if (src.length) h += `<div class="list caf-list">${src.map((x) => { const late = x.t > ci.cut; const sub = [x.src === 'caf' ? '' : 'aus Ernährung', late ? 'nach ' + minToTime(ci.cut) : ''].filter(Boolean).join(' · '); return `<div class="caf-row"><span class="row-main"><b>${esc(x.n)}</b>${sub ? `<small${late ? ' class="warn-txt"' : ''}>${sub}</small>` : ''}</span>${x.src === 'caf' ? `<input class="row-time" type="time" value="${minToTime(x.t)}" data-c="caf-time" data-id="${x.id}" data-date="${k}" aria-label="Uhrzeit">` : `<span class="row-side">${minToTime(x.t)}</span>`}<span class="row-side caf-mg">${fmt(x.mg)} mg</span>${x.src === 'caf' ? `<button class="icon-btn sm ghost" data-a="caf-del" data-id="${x.id}" data-date="${k}" aria-label="Löschen">${icon('trash-2')}</button>` : '<span></span>'}</div>`; }).join('')}</div>`;
  h += `<p class="hint">Koffein-Stopp ${minToTime(ci.cut)} Uhr (${cafStopText()}), Schlafenszeit ${minToTime(ci.bed)} Uhr. Mengen, Halbwertszeit und Getränke änderst du unter ${goBtn('set', 'Einstellungen → Koffein', '', 'link-btn inline')}.</p></section>`;
  /* Weitere Gewohnheiten */
  h += `<section class="sec"><div class="sec-head"><h2>Abend & Schlaf</h2></div>${habitRows(k, ['alkohol', 'mahlzeit', 'bildschirm', 'dimmen', 'nsdr'])}</section>`;
  h += musterBox(['sleep'], 'Was deinen Schlaf beeinflusst');
  return h;
}
function habitRows(k, ids) {
  const d = getDay(k);
  const hs = HABITS.filter((hb) => ids.includes(hb.id) && !S.settings.habitsOff.includes(hb.id));
  let h = '<div class="mlist">';
  for (const hb of hs) {
    const on = !!d.habits[hb.id], open = ui.exp.has('h:' + hb.id);
    let det = '';
    if (hb.detail) {
      const val = d.hd ? d.hd[hb.detail.key] : null;
      if (hb.detail.type === 'time') det = `<label class="hdet"><span>${esc(hb.detail.label)}</span><input type="time" data-c="habit-detail" data-k="${hb.detail.key}" data-h="${hb.id}" data-date="${k}" value="${esc(val || '')}"></label>`;
      else det = `<div class="hdet"><span>${esc(hb.detail.label)}</span><div class="chips chips-tight">${hb.detail.options.map((o) => `<button class="chip chip-xs${val === o ? ' is-on' : ''}" data-a="habit-chip" data-k="${hb.detail.key}" data-h="${hb.id}" data-v="${o}" data-date="${k}">${o === 90 ? '90+' : o} ${hb.detail.unit}</button>`).join('')}</div></div>`;
    }
    h += `<div class="hrow${on ? ' is-on' : ''}"><button class="item-hit" data-a="habit" data-id="${hb.id}" data-date="${k}" aria-pressed="${on}"><span class="tgl-box">${icon('check')}</span><span class="item-txt"><b>${esc(habitName(hb, k))}${garHabitMark(d, hb.id)}</b><small>${esc(habitWhen(hb, k))}</small></span></button>
      <button class="icon-btn" data-a="expand" data-key="h:${hb.id}" aria-label="Erklärung" aria-expanded="${open}">${icon('info')}</button>${det}${open ? `<div class="mrow-detail">${infoHTML(hb.id)}</div>` : ''}</div>`;
  }
  return h + '</div>';
}
/* Koffein-Kurve über den Tag */
function cafChart(k, ci) {
  const W = CH.W, H = 170, pl = 34, pr = 10, pt = 10, pb = 24;
  const wake = rhythm(k).wake;
  const x0 = Math.min(wake, ci.today.length ? ci.today[0].t : wake) - 30;
  const x1 = Math.max(ci.bed + 60, ci.last != null ? ci.last + 120 : 0);
  const step = 10;
  const pts = [];
  for (let m = x0; m <= x1; m += step) pts.push([m, cafLevel(ci.src, m)]);
  const maxV = Math.max(60, ...pts.map((p) => p[1]));
  const nt = niceTicks(0, maxV, 4);
  const yMax = nt.hi;
  const X = (m) => pl + ((m - x0) / (x1 - x0)) * (W - pl - pr);
  const Y = (v) => pt + (1 - v / yMax) * (H - pt - pb);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Koffein im Körper über den Tag">`;
  for (const t of nt.ticks) s += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}"/><text class="tick" x="${pl - 6}" y="${Y(t) + 3}" text-anchor="end">${tickFmt(t, nt.step)}</text>`;
  for (let hh = Math.ceil(x0 / 180) * 180; hh <= x1; hh += 180) s += `<text class="tick" x="${X(hh)}" y="${H - 6}" text-anchor="middle">${minToTime(hh % 1440).slice(0, 2)} Uhr</text>`;
  for (const thr of [50, 25]) if (thr < yMax) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(thr)}" y2="${Y(thr)}" stroke="var(--ink-3)" stroke-dasharray="3 4" stroke-width="1"/>`;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
  s += `<path d="${line} L${X(x1)},${Y(0)} L${X(x0)},${Y(0)} Z" fill="var(--coffee)" opacity=".16"/><path d="${line}" fill="none" stroke="var(--coffee)" stroke-width="2.2"/>`;
  s += `<line x1="${X(ci.bed)}" x2="${X(ci.bed)}" y1="${pt}" y2="${H - pb}" stroke="var(--screens)" stroke-width="1.5"/>`;
  if (ci.now != null && ci.now >= x0 && ci.now <= x1) s += `<line x1="${X(ci.now)}" x2="${X(ci.now)}" y1="${pt}" y2="${H - pb}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="2 3"/><circle cx="${X(ci.now)}" cy="${Y(ci.nowLevel)}" r="4" fill="var(--ink)"/>`;
  for (const x of ci.today) s += `<circle cx="${X(x.t)}" cy="${Y(cafLevel(ci.src, x.t))}" r="4.5" fill="var(--bg-2)" stroke="var(--coffee)" stroke-width="2" data-tip="${esc(`${x.n}\n${minToTime(x.t)} Uhr, ${fmt(x.mg)} mg`)}"/>`;
  s += `<line class="xhair" x1="0" x2="0" y1="${pt}" y2="${H - pb}"/>`;
  return s + '</svg>';
}
function sheetCafCustom(k) {
  ui.sheet = { type: 'cafcustom', k };
  openSheet(`<h3 class="sheet-title">Eigenes Getränk</h3><p class="hint">Wird als Schnellbutton gespeichert und zählt auch in der Ernährung (Kalorien, Zucker, Flüssigkeit).</p>
    <div class="form"><div class="frow is-wide"><span class="flabel">Name</span><div class="fin"><input type="text" id="cc-n" placeholder="z. B. Mate 500 ml"></div></div>
    <div class="frow"><span class="flabel">Koffein</span><div class="fin"><input type="text" inputmode="decimal" id="cc-mg" placeholder="mg"><span class="unit">mg</span></div></div>
    <div class="frow"><span class="flabel">Menge</span><div class="fin"><input type="text" inputmode="decimal" id="cc-ml" placeholder="ml"><span class="unit">ml</span></div></div>
    <div class="frow"><span class="flabel">Kalorien</span><div class="fin"><input type="text" inputmode="decimal" id="cc-kcal" placeholder="0"><span class="unit">kcal</span></div></div>
    <div class="frow"><span class="flabel">Zucker</span><div class="fin"><input type="text" inputmode="decimal" id="cc-sug" placeholder="0"><span class="unit">g</span></div></div></div>
    <div class="sheet-acts"><button class="btn is-accent" data-a="caf-custom-save">Speichern und jetzt eintragen</button><button class="btn" data-a="caf-custom-save" data-only="1">Nur speichern</button></div>`);
}
