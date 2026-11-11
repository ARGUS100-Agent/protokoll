/* ============================================================
   OBERFLÄCHE Teil 1: Grundgerüst, Heute, Ernährung, Sheets
   ============================================================ */
const ui = {
  tab: 'heute', date: todayKey(), lastToday: todayKey(), ernSub: 'uebersicht', exp: new Set(), q: '',
  range: 30, heatMetric: 'nutri', heatMonth: todayKey().slice(0, 7), weekOf: weekStart(todayKey()), hMetric: 'sleepScore',
  microMode: 'act', scroll: {}, tables: new Set(), sheet: null, updateReady: false, setOpen: null, setQ: '',
};
function icon(name, cls = '') { const s = ICONS[name] || ''; return s.replace('<svg', `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true"`); }
const numIn = (v, d = 1) => (v == null || v === '' ? '' : String(Math.round(v * 10 ** d) / 10 ** d).replace('.', ','));

/* ---------- Rahmen ---------- */
function renderTabbar() {
  const tabs = navTabs().map(areaById).concat([MORE_TAB]);
  const inBar = tabs.some((t) => t.id === ui.tab);
  $('#tabbar').innerHTML = tabs.map((t) => { const on = ui.tab === t.id || (t.id === 'mehr' && !inBar); return `<button class="tab${on ? ' is-on' : ''}" data-a="tab" data-tab="${t.id}" aria-current="${on ? 'page' : 'false'}">${icon(t.ic)}<span>${esc(t.short || t.n)}</span></button>`; }).join('');
}
const VIEWS = { heute: () => vHeute(), ern: () => vErn(), supp: () => vSupp(), train: () => vTrain(), knie: () => vKnie(), licht: () => vLicht(), haut: () => vHaut2(), koerper: () => vKoerper(), blut: () => vBlut(), garmin: () => vGarminArea(), einkauf: () => vShop(), woche: () => vWoche(), wunsch: () => vWunsch(), set: () => vSet(), mehr: () => vMehr() };
function render(keepScroll = true) {
  const y = window.scrollY;
  if (!VIEWS[ui.tab]) ui.tab = 'heute';
  try { invSync(); } catch (e) { /* egal */ }
  try { autoHabits(todayKey()); autoHabits(addDays(todayKey(), -1)); } catch (e) { /* egal */ }
  try { goalWatch(); goalNudgeCheck(); } catch (e) { /* egal */ }
  $('#main').innerHTML = VIEWS[ui.tab]();
  renderTabbar();
  if (keepScroll) window.scrollTo(0, y);
  hydratePhotos($('#main'));
}
function go(tab, opts = {}) {
  ui.scroll[ui.tab] = window.scrollY;
  ui.tab = tab;
  Object.assign(ui, opts);
  render(false);
  window.scrollTo(0, opts.scrollTop ? 0 : ui.scroll[tab] || 0);
}

/* ---------- Bausteine ---------- */
function stBadge(state, short = false) {
  if (state === 'none') return '';
  return `<span class="st st-${state}">${icon(STATE_ICON[state])}${short ? '' : STATE_LABEL[state]}</span>`;
}
function seg(name, val, opts) {
  return `<div class="seg" role="tablist">${opts.map(([v, l]) => `<button role="tab" class="${val === v ? 'is-on' : ''}" aria-selected="${val === v}" data-a="seg" data-seg="${name}" data-v="${v}">${l}</button>`).join('')}</div>`;
}
function dateBar(k) {
  const isT = k === todayKey();
  return `<div class="datebar">
    <button class="icon-btn" data-a="date-prev" aria-label="Vorheriger Tag">${icon('chevron-left')}</button>
    <label class="date-label"><span>${isT ? 'Heute, ' : ''}${esc(fmtDate(k, { weekday: isT ? undefined : 'short', day: 'numeric', month: 'long' }))}</span><input type="date" data-c="date-pick" value="${k}" aria-label="Datum wählen"></label>
    <button class="icon-btn" data-a="date-next" aria-label="Nächster Tag" ${k >= todayKey() ? 'disabled' : ''}>${icon('chevron-right')}</button>
    ${isT ? '' : '<button class="pill-btn" data-a="date-today">Heute</button>'}
  </div>`;
}
function valTxt(key, v) { const m = metaOf(key); return fmt(disp(key, v), m.d); }
function targetTxt(key, t) {
  const m = metaOf(key), d = (x) => fmt(disp(key, x), m.d);
  if (t.lo != null && t.hi != null) return `${d(t.lo)}–${d(t.hi)}`;
  if (t.lo != null) return `${d(t.lo)}`;
  if (t.max != null) return `max. ${d(t.max)}`;
  return '–';
}
function infoHTML(key) {
  const inf = INFO[key];
  if (!inf) return '';
  return `<dl class="info">${Object.entries(INFO_LABELS).filter(([k]) => inf[k]).map(([k, l]) => `<dt>${l}</dt><dd>${esc(inf[k])}</dd>`).join('')}</dl>`;
}
function emptyState(text, btn) { return `<div class="empty"><p>${esc(text)}</p>${btn || ''}</div>`; }

/* ============================================================
   HEUTE
   ============================================================ */
function greeting() {
  const h = new Date().getHours();
  const n = S.settings.profile.name ? `, ${esc(S.settings.profile.name)}` : '';
  if (h < 11) return `Guten Morgen${n}`;
  if (h < 17) return `Hallo${n}`;
  return `Guten Abend${n}`;
}
/* Koffein-Fenster: 90 Min. nach dem Aufstehen bis zum Koffein-Stopp */
function cafWindow(k = todayKey()) { return [cafStart(k), cafCutoff(k)]; }
function arcMessage() {
  const r = rhythm(), now = nowMin(), wake = r.wake, sleep = r.bed;
  const [c1, c2] = cafWindow();
  if (now < wake && (r.wakeSrc === 'garmin' || r.wakeSrc === 'eingetragen' || now < 4 * 60)) return ['Noch Schlafenszeit', ''];
  if (now < wake) return ['Guten Morgen', 'Morgenlicht: 10–30 Min. raus'];
  if (now < wake + 60) return ['Morgenlicht', '10–30 Min. raus, dann Frühstück'];
  if (now < c1) return ['Koffein ab ' + minToTime(c1), `noch ${c1 - now} Min.`];
  if (now <= c2) return ['Koffein-Fenster offen', `bis ${minToTime(c2)}`];
  if (now < sleep - 180) return ['Kein Koffein mehr', 'Nachmittagslicht mitnehmen'];
  if (now < sleep - 120) return ['Letzte große Mahlzeit', `bis ${minToTime(sleep - 120)}`];
  if (now < sleep - 60) return ['Licht dimmen', `ab ${minToTime(sleep - 60)} keine Bildschirme`];
  if (now < sleep) return ['Bildschirmfrei', `bis ${minToTime(sleep)} schlafen`];
  return ['Schlafenszeit', ''];
}
function arcInner() {
  const [a, b] = arcMessage();
  return `${dayArcSVG(todayKey())}<div class="arc-center"><div class="arc-time">${minToTime(nowMin())}</div><div class="arc-msg"><b>${esc(a)}</b>${b ? `<span>${esc(b)}</span>` : ''}</div></div>`;
}
function phaseChip(k) {
  const ph = skinPhase(k);
  if (!ph) return '';
  return `<button class="chip-info" data-a="goto" data-tab="haut" data-sub="heute">${icon('sparkles')}Haut ${esc(ph.n)}, Tag ${ph.day}/${ph.len}</button>`;
}
function banners(k) {
  let h = '';
  if (!S.settings.profile.name) h += `<div class="banner is-soft">${icon('info')}<div><b>Willkommen bei Protokoll</b><span>Trag einmal deinen Namen unter Einstellungen → Profil ein. Alles bleibt auf diesem iPhone.</span></div><button class="pill-btn" data-a="goto-profile">Profil</button></div>`;
  if (ui.updateReady) h += `<div class="banner">${icon('rotate-ccw')}<div><b>Neue Version bereit</b><span>Einmal neu laden, um sie zu nutzen.</span></div><button class="pill-btn" data-a="reload">Neu laden</button></div>`;
  if (backupDue()) {
    const last = S.meta.lastBackup ? `Letztes Backup vor ${daysBetween(S.meta.lastBackup.slice(0, 10), todayKey())} Tagen.` : 'Noch kein Backup gemacht.';
    h += `<div class="banner">${icon('download')}<div><b>Backup fällig</b><span>${last} Deine Daten liegen nur auf diesem iPhone.</span></div><div class="banner-acts"><button class="pill-btn is-accent" data-a="backup-export">Sichern</button><button class="link-btn" data-a="backup-snooze">Morgen</button></div></div>`;
  }
  const ph = skinPhase(k);
  if (ph && ph.day <= 2 && ph.rules.length) h += `<div class="banner">${icon('sparkles')}<div><b>${ph.day === 1 ? 'Ab heute' : 'Seit gestern'}: ${esc(ph.rules.slice(0, 3).map((r) => r.replace(/^(Kein|Keine|Nicht)\b/, (m) => m.toLowerCase())).join(', '))}</b><span>${esc(ph.n)} im Haut-Protokoll${ph.rules.length > 3 ? ` – dazu: ${esc(ph.rules.slice(3).join(', '))}` : ''}</span></div><button class="pill-btn" data-a="goto" data-tab="haut" data-sub="heute">Haut</button></div>`;
  return h;
}
/* Aktueller Block für „Als Nächstes“ */
function nowBlock(k) {
  const d = getDay(k), variant = dayVariant(k), now = nowMin();
  const blocks = S.settings.plan.map((b) => ({ b, t: resolveBlockTime(b, d), open: b.items.filter((it) => !it.opt && itemInVariant(it, variant) && !d.checks[it.id]) })).filter((x) => x.t != null);
  blocks.sort((a, b) => a.t - b.t);
  const due = blocks.filter((x) => x.t <= now + 30 && x.open.length);
  if (due.length) return due[due.length - 1].b;
  const next = blocks.find((x) => x.t > now && x.open.length);
  return next ? next.b : null;
}
function openBlocksLine(k, current) {
  const d = getDay(k), variant = dayVariant(k);
  const rest = S.settings.plan.filter((b) => b !== current && resolveBlockTime(b, d) != null).map((b) => ({ b, n: b.items.filter((it) => !it.opt && itemInVariant(it, variant) && !d.checks[it.id]).length })).filter((x) => x.n);
  if (!rest.length) return '';
  return `<p class="open-line">Noch offen: ${rest.map((x) => `<button class="link-btn" data-a="goto" data-tab="ern" data-sub="plan" data-anchor="b-${x.b.id}">${esc(x.b.n)} (${x.n})</button>`).join(', ')}</p>`;
}
function dayControls(k, compact = false) {
  const d = getDay(k), v = dayVariant(k);
  const tr = d.training;
  return `<div class="day-controls${compact ? ' is-compact' : ''}">
    <div class="chips${compact ? ' chips-scroll' : ''}" role="group" aria-label="Tagesvariante">${Object.entries(VARIANTS).map(([id, n]) => `<button class="chip${v === id ? ' is-on' : ''}" data-a="set-variant" data-v="${id}">${esc(n)}</button>`).join('')}</div>
    <div class="chips${compact ? ' chips-scroll' : ''}" role="group" aria-label="Training">${icon('dumbbell', 'ic-lead')}${Object.entries(TRAINING).map(([id, t]) => `<button class="chip chip-sm${tr === id ? ' is-on' : ''}" data-a="set-training" data-v="${id}">${esc(t.n)}</button>`).join('')}</div>
    ${tr ? `<p class="hint">${mainTraining(d) ? `Aus deinem Training um ${esc(mainTraining(d).time)} Uhr: ` : ''}${esc(TRAINING[tr].hint)}</p>` : compact ? '' : '<p class="hint">Trainingszeit wählen oder ein Training eintragen, dann passen Timing-Hinweise und Flüssigkeitsziel automatisch.</p>'}
  </div>`;
}
function ringsRow(k, ev) {
  const keys = ['kcal', 'p', 'fib', 'fluid'];
  const names = { kcal: 'Kalorien', p: 'Protein', fib: 'Ballaststoffe', fluid: 'Trinken' };
  return `<section class="rings">${keys.map((key) => {
    const m = ev.metrics[key];
    const st = ev.logged || key === 'fluid' ? m.state : 'none';
    const v = key === 'fluid' ? m.v / 1000 : m.v;
    const unit = key === 'fluid' ? 'l' : metaOf(key).u;
    return `<button class="ring-tile" data-a="goto-eval" data-key="${key}" aria-label="${names[key]}: ${fmt(v, key === 'fluid' ? 1 : 0)} ${unit}, ${STATE_LABEL[st] || ''}">
      <div class="ring-wrap">${ringSVG({ pct: m.pct, ppct: m.ppct, state: st })}<div class="ring-center"><b>${fmt(v, key === 'fluid' ? 1 : 0)}</b><small>${unit}</small></div></div>
      <span class="ring-name">${names[key]}</span><span class="ring-target">${key === 'fluid' ? fmt(m.t.lo / 1000, 1) + (m.t.hi ? '–' + fmt(m.t.hi / 1000, 1) : '') + ' l' : targetTxt(key, m.t)}</span>
    </button>`;
  }).join('')}</section>`;
}
function energyBar(tot) {
  const s = energySplit(tot);
  if (!tot.kcal) return '';
  const parts = [['p', 'Protein', s.p], ['f', 'Fett', s.f], ['c', 'Kohlenhydrate', s.c]];
  return `<section class="split" aria-label="Kalorienanteile">
    <div class="split-bar">${parts.map(([k, , v]) => (v > 0 ? `<span style="flex:${v};background:${SERIES[k]}"></span>` : '')).join('')}</div>
    <div class="legend">${parts.map(([k, n, v]) => `<span><i style="background:${SERIES[k]}"></i>${n} ${fmt(v)} %</span>`).join('')}</div>
  </section>`;
}
function microSection(k, ev) {
  const proj = ui.microMode === 'proj';
  const items = MICRO_KEYS.map((key) => { const m = ev.metrics[key]; return { key, st: proj ? m.pstate : ev.logged ? m.state : 'none', pct: proj ? m.ppct : m.pct }; });
  const order = { over: 0, low: 1, under: 2, high: 3, ok: 4, none: 5 };
  items.sort((a, b) => order[a.st] - order[b.st] || a.pct - b.pct);
  const cnt = (s) => items.filter((x) => s.includes(x.st)).length;
  const summary = !proj && !ev.logged ? 'Noch nichts eingetragen. „Prognose“ zeigt, wo dein Standardtag landen würde.' : `${cnt(['ok', 'high'])} im Ziel, ${cnt(['under', 'low'])} darunter${cnt(['over']) ? `, ${cnt(['over'])} über Maximum` : ''}${proj ? ' mit dem Rest deines Standardtags' : ''}`;
  return `<section class="sec">
    <div class="sec-head"><h2>Mikronährstoffe</h2>${seg('micro', ui.microMode, [['act', 'Jetzt'], ['proj', 'Prognose']])}</div>
    <p class="sec-sub">${summary}</p>
    <div class="micro-grid">${items.map((x) => `<button class="mchip st-${x.st}" data-a="goto-eval" data-key="${x.key}" aria-label="${MICRO_SHORT[x.key]}: ${fmt(x.pct)} %, ${STATE_LABEL[x.st]}"><span class="mchip-ic">${icon(STATE_ICON[x.st])}</span><span class="mchip-t"><span class="mchip-n">${MICRO_SHORT[x.key]}</span><b>${fmt(x.pct)} %</b></span></button>`).join('')}</div>
  </section>`;
}
function tipsSection(k, limit) {
  const tips = buildTips(k).concat(swapTips(k));
  if (!tips.length) return `<section class="sec"><div class="sec-head"><h2>Tipps</h2></div><p class="sec-sub">Keine Lücken oder Überschreitungen${k === todayKey() ? ', auch nicht mit dem Restplan' : ''}.</p></section>`;
  const shown = limit ? tips.slice(0, limit) : tips;
  return `<section class="sec">
    <div class="sec-head"><h2>Tipps</h2>${limit && tips.length > limit ? `<button class="link-btn" data-a="goto" data-tab="ern" data-sub="eval">Alle ${tips.length}</button>` : ''}</div>
    <ul class="tips">${shown.map((t) => `<li class="tip tip-${t.kind}"><span class="tip-ic">${icon(t.kind === 'over' ? 'triangle-alert' : t.kind === 'swap' ? 'repeat' : 'arrow-down')}</span><div><b>${esc(t.title)}</b><span class="tip-text">${esc(t.text)}</span>${t.sub ? `<small>${esc(t.sub)}</small>` : ''}</div></li>`).join('')}</ul>
  </section>`;
}
function trendSection(k, limit) {
  const tr = trendRecs(k);
  const head = (more) => `<div class="sec-head"><h2>Letzte 7 Tage</h2>${more || ''}</div>`;
  if (tr.n < 3) return limit ? '' : `<section class="sec" id="trends">${head()}<p class="sec-sub">Ab 3 protokollierten Tagen zeigt die App hier, was dir im Schnitt fehlt oder zu viel ist, mit konkreten Vorschlägen. Bisher: ${tr.n} ${tr.n === 1 ? 'Tag' : 'Tage'}.</p></section>`;
  const ins = sleepInsight();
  if (!tr.recs.length) return `<section class="sec" id="trends">${head()}<p class="sec-sub">Im Schnitt der letzten ${tr.n} protokollierten Tage ist alles im Zielbereich.</p>${ins}</section>`;
  const recs = limit ? tr.recs.slice(0, limit) : tr.recs;
  const more = limit && tr.recs.length > limit ? `<button class="link-btn" data-a="goto" data-tab="ern" data-sub="eval" data-anchor="trends">Alle ${tr.recs.length}</button>` : '';
  return `<section class="sec" id="trends">${head(more)}<p class="sec-sub">Schnitt aus ${tr.n} protokollierten Tagen vor ${k === todayKey() ? 'heute' : 'diesem Tag'}.</p>
    <ul class="recs">${recs.map(recHTML).join('')}</ul>${ins}</section>`;
}
function recHTML(r) {
  const m = metaOf(r.key);
  const unit = r.key === 'ferm' ? 'Portionen' : m.u;
  const v = (x) => `${fmt(disp(r.key, x), r.key === 'ferm' ? 1 : m.d)} ${unit}`;
  if (r.kind === 'over') return `<li class="rec rec-over"><div class="rec-head"><span class="tip-ic">${icon('triangle-alert')}</span><div><b>${esc(m.n)}: im Schnitt über dem Maximum</b><small>Ø ${esc(v(r.avg))}, Maximum ${esc(v(r.max))}${r.days ? `, an ${r.days} von ${r.n} Tagen darüber` : ''}</small></div></div><p class="rec-text">${esc(r.text)}</p></li>`;
  return `<li class="rec rec-gap"><div class="rec-head"><span class="tip-ic">${icon('arrow-down')}</span><div><b>${esc(m.n)}: im Schnitt ${fmt(r.pct)} %</b><small>Ø ${esc(v(r.avg))}, an ${r.under} von ${r.n} Tagen unter Ziel</small></div></div>
    ${r.opts.length ? `<p class="rec-lead">Ausgleichen, z. B. täglich eins davon:</p><div class="rec-opts">${r.opts.map((o) => `<span class="rec-opt">+ ${esc(friendlyTipAmount(o.food, o.g))}${o.full ? '' : ` <small>(ca. ${fmt(o.share * 100)} % der Lücke)</small>`}</span>`).join('')}</div>` : ''}
    ${r.supp ? `<p class="rec-supp">${icon('pill')}<span>${esc(r.supp)}</span></p>` : ''}</li>`;
}
function sleepInsight() {
  let best = null;
  for (const c of CORRELATIONS) {
    const r = correlationData(c, 30);
    if (r.na < 3 || r.nb < 3) continue;
    const diff = r.ma - r.mb;
    if (Math.abs(diff) >= 3 && (!best || Math.abs(diff) > Math.abs(best.diff))) best = { c, diff };
  }
  if (!best) return '';
  const hrv = best.c.y === 'hrv';
  return `<div class="insight">${icon('moon')}<div><b>Schlaf-Erkenntnis</b><span>${esc(best.c.ia)} war ${hrv ? 'deine HRV' : 'dein Sleep Score'} in der Nacht danach im Schnitt ${fmt(Math.abs(best.diff))} ${hrv ? 'ms' : 'Punkte'} ${best.diff > 0 ? 'höher' : 'niedriger'} als ${esc(best.c.ib)} (letzte 30 Tage).</span></div></div>`;
}
function suppItems() { return allPlanItems().filter(({ it }) => FOOD[it.food] && FOOD[it.food].supp); }
function suppSection(k) {
  const d = getDay(k), variant = dayVariant(k);
  const list = suppItems().filter(({ it }) => itemInVariant(it, variant));
  const daily = list.filter(({ it }) => FOOD[it.food].supp === 'daily');
  const done = daily.filter(({ it }) => d.checks[it.id]).length;
  return `<section class="sec">
    <div class="sec-head"><h2>Supplements</h2><span class="count">${done}/${daily.length} täglich</span></div>
    <div class="toggle-grid">${list.map(({ it }) => {
      const f = FOOD[it.food], on = !!d.checks[it.id];
      const blocked = phaseBlocks(k, f);
      const amt = itemAmount(it, d, variant);
      const budget = f.id === 's_ag1' ? ag1Budget(k) : null;
      const warn = blocked || (budget && (budget.over || (!on && budget.max <= 0)));
      const sub = blocked ? `${blocked.n}: pausiert` : budget ? ag1BudgetShort(budget) : f.supp === 'opt' ? 'bei Bedarf' : 'täglich';
      return `<div class="tgl-wrap">
        <button class="tgl${on ? ' is-on' : ''}${warn ? ' is-warn' : ''}" data-a="toggle-item" data-id="${it.id}" aria-pressed="${on}">
          <span class="tgl-box">${icon('check')}</span><span class="tgl-txt"><b>${esc(shortSupp(f))}</b><small>${esc(sub)}</small></span>
        </button>
        <button class="dose" data-a="open-item" data-id="${it.id}" data-date="${k}" aria-label="Menge ${esc(shortSupp(f))} ändern">${esc(amountLabel(amt, it.u, true))}${icon('pencil')}</button>
      </div>`;
    }).join('')}</div>
  </section>`;
}
function shortSupp(f) { return shortName(f); }
function habitName(h, k) { if (h.id === 'koffein') { const [a, b] = cafWindow(k); return cafMode() === 'dose' ? `Koffein ab ${minToTime(a)}, Stopp je Getränk` : `Koffein nur ${minToTime(a)}–${minToTime(b)}`; } return h.n; }
/* Zeitangaben der Abend-Gewohnheiten folgen der Schlafenszeit des Tages */
function habitWhen(h, k) {
  const bed = sleepMin(k);
  if (h.id === 'alkohol') return `ab ${minToTime(bed - 480)}`;
  if (h.id === 'mahlzeit') return `bis ca. ${minToTime(bed - 120)}`;
  if (h.id === 'bildschirm') return `ab ${minToTime(bed - 60)}, mindestens 30 Min.`;
  if (h.id === 'koffein') return cafMode() === 'dose' ? `90 Min. nach dem Aufwachen; Stopp je Getränk: ${cafStops(k).slice(0, 3).map((x) => `${x.n.replace(/\s*\d+\s*ml$/i, '').replace(/ \(Tasse\)/, '')} ${minToTime(x.stop)}`).join(', ')}` : `90 Min. nach dem Aufstehen bis ${cafStopText()}`;
  return h.when;
}
function scale10(action, val, k, field = '') {
  return `<div class="scale10" role="radiogroup">${Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `<button role="radio" aria-checked="${val === n}" class="${val === n ? 'is-on' : ''}" data-a="${action}" data-v="${n}" data-date="${k}" data-f="${field}">${n}</button>`).join('')}</div>`;
}
/* ============================================================
   STANDARDTAG-Block (Schnellmodus)
   ============================================================ */
function blockCard(b, k, opts = {}) {
  const d = getDay(k), variant = dayVariant(k);
  const items = b.items.filter((it) => itemInVariant(it, variant));
  if (!items.length) return '';
  const req = items.filter((it) => !it.opt);
  const done = req.filter((it) => d.checks[it.id]).length;
  const t = resolveBlockTime(b, d);
  const allOpt = req.length === 0;
  const collapsed = b.id === 'vielfalt' && !ui.exp.has('blk:vielfalt') && !opts.now;
  return `<div class="block${opts.now ? ' is-now' : ''}" id="b-${b.id}">
    <div class="block-head">
      <div><h3>${opts.now ? '<span class="now-tag">Als Nächstes</span>' : ''}${esc(b.n)}</h3><span class="block-meta">${t != null ? (b.time === 'training' && !d.training ? 'Training ' : '') + minToTime(t) + ' Uhr' : 'über den Tag'}${allOpt ? '' : `, ${done}/${req.length} erledigt`}</span></div>
      ${allOpt ? (b.id === 'vielfalt' ? `<button class="pill-btn" data-a="expand" data-key="blk:vielfalt">${collapsed ? 'Zeigen' : 'Ausblenden'}</button>` : '') : done < req.length ? `<button class="pill-btn" data-a="check-block" data-id="${b.id}">Alle abhaken</button>` : `<button class="pill-btn is-ghost" data-a="uncheck-block" data-id="${b.id}">Zurücksetzen</button>`}
    </div>
    ${collapsed ? '' : `<div class="items">${items.map((it) => itemRow(it, k, d, variant)).join('')}</div>`}
    ${b.id === 'getraenke' && !opts.now ? waterQuick(k) : ''}
  </div>`;
}
function itemRow(it, k, d, variant) {
  const on = !!d.checks[it.id];
  const fid = itemFoodId(it, d), f = FOOD[fid];
  const amt = itemAmount(it, d, variant);
  const changed = d.amt && d.amt[it.id] != null;
  const blocked = phaseBlocks(k, f);
  const amtTxt = amountLabel(amt, itemUnit(it, f));
  let choice = '';
  if (it.choice) {
    const key = it.cg || it.id;
    if (it.choice.length > 4) {
      choice = `<label class="choice-select">${icon('chevron-down')}<select data-c="choice" data-key="${key}" data-date="${k}" aria-label="Gericht wählen">${itemChoices(it).map((c) => `<option value="${c}" ${c === fid ? 'selected' : ''}>${esc(choiceName(c))}</option>`).join('')}</select></label>`;
    } else {
      choice = `<div class="chips chips-tight">${it.choice.map((c) => `<button class="chip chip-xs${c === fid ? ' is-on' : ''}" data-a="choice" data-key="${key}" data-v="${c}" data-date="${k}">${esc(FOOD[c] ? FOOD[c].n.split(' (')[0] : c)}</button>`).join('')}</div>`;
    }
  }
  return `<div class="item${on ? ' is-on' : ''}${it.opt ? ' is-opt' : ''}${blocked ? ' is-warn' : ''}">
    <button class="item-hit" data-a="toggle-item" data-id="${it.id}" data-date="${k}" aria-pressed="${on}">
      <span class="tgl-box">${icon('check')}</span>
      <span class="item-txt"><b>${esc(itemLabel(it, d))}</b>${blocked ? `<small class="warn-txt">${esc(blocked.n)}: ${esc(blocked.rules.join(', '))}</small>` : it.hint ? `<small>${esc(it.hint)}</small>` : ''}</span>
    </button>
    <button class="amt${changed ? ' is-changed' : ''}" data-a="open-item" data-id="${it.id}" data-date="${k}" aria-label="Menge ändern">${esc(amtTxt)}</button>
    ${choice ? `<div class="item-choice">${choice}</div>` : ''}
  </div>`;
}
function choiceName(id) {
  const f = FOOD[id];
  if (!f) return id;
  if (id === 'prepmymeal') return 'Gericht: Durchschnitt (Schätzung)';
  return 'Gericht: ' + f.n.replace(/^Prepmymeal\s*/i, '').replace(/\s*XL\b/, '');
}
const WATER_TYPES = [['saskia', 'Saskia'], ['wasser', 'Leitungswasser'], ['mineralwasser', 'kalziumreich']];
function waterQuick(k) {
  const wf = WATER_TYPES.some(([id]) => id === S.settings.waterFood) ? S.settings.waterFood : 'saskia';
  const wn = WATER_TYPES.find(([id]) => id === wf)[1];
  return `<div class="water-quick"><span>${icon('droplet')}Schnell eintragen</span><button class="link-btn water-type" data-a="water-type" aria-label="Wassersorte wechseln">${esc(wn)} ${icon('repeat')}</button>
    <button class="pill-btn" data-a="add-water" data-food="${wf}" data-ml="250" data-date="${k}">+ 250 ml</button>
    <button class="pill-btn" data-a="add-water" data-food="${wf}" data-ml="500" data-date="${k}">+ 500 ml</button>
    <button class="pill-btn" data-a="add-water" data-food="${wf}" data-ml="1500" data-date="${k}">+ 1,5 l</button></div>`;
}

/* ============================================================
   ERNÄHRUNG
   ============================================================ */
function vErn() {
  const k = ui.date;
  let h = `<header class="page-head is-tight"><h1>Ernährung</h1></header>${dateBar(k)}`;
  h += subnav('ern', ui.ernSub, [['uebersicht', 'Übersicht'], ['plan', 'Standardtag'], ['detail', 'Lebensmittel'], ['eval', 'Auswertung'], ['verlauf', 'Verlauf']]);
  if (ui.ernSub === 'uebersicht') h += vErnOverview(k);
  else if (ui.ernSub === 'plan') h += vPlan(k);
  else if (ui.ernSub === 'detail') h += vDetail(k);
  else if (ui.ernSub === 'verlauf') h += vErnVerlauf();
  else h += vEval(k);
  return h;
}
function vPlan(k) {
  const d = getDay(k);
  const ev = evaluate(k);
  let h = dayControls(k);
  h += `<div class="mini-sum">${['kcal', 'p', 'fib', 'fluid'].map((key) => { const m = ev.metrics[key]; return `<button class="mini st-${ev.logged || key === 'fluid' ? m.state : 'none'}" data-a="seg" data-seg="ern" data-v="eval"><b>${key === 'fluid' ? fmt(m.v / 1000, 1) : fmt(m.v)}</b><small>${key === 'fluid' ? 'l' : metaOf(key).u} ${({ kcal: 'Kalorien', p: 'Protein', fib: 'Ballastst.', fluid: 'Trinken' })[key]}</small></button>`; }).join('')}</div>`;
  const blocks = [...S.settings.plan].map((b, i) => ({ b, i, t: resolveBlockTime(b, d) }));
  blocks.sort((a, b) => (a.t ?? 9999) - (b.t ?? 9999) || a.i - b.i);
  h += blocks.map(({ b }) => blockCard(b, k)).join('');
  const extra = (S.settings.extra || []);
  if (extra.length) h += `<div class="block"><div class="block-head"><div><h3>Bei Bedarf</h3><span class="block-meta">kein fester Platz im Tag</span></div></div><div class="items">${extra.map((it) => itemRow(it, k, d, dayVariant(k))).join('')}</div></div>`;
  h += `<p class="hint center">Tippe auf eine Menge, um sie für diesen Tag zu ändern. Geänderte Mengen sind markiert.</p>`;
  return h;
}

/* ---------- Detailmodus ---------- */
const MEALS = [['fruehstueck', 'Frühstück'], ['mittag', 'Mittag'], ['nachmittag', 'Nachmittag'], ['abend', 'Abend'], ['snack', 'Snack'], ['getraenke', 'Getränke']];
function defaultMeal() { const n = nowMin(); return n < 660 ? 'fruehstueck' : n < 900 ? 'mittag' : n < 1110 ? 'nachmittag' : 'abend'; }
function vDetail(k) {
  const d = getDay(k);
  let h = `<div class="search"><span>${icon('search')}</span><input type="search" placeholder="Lebensmittel suchen" data-i="search" value="${esc(ui.q)}" autocomplete="off" enterkeyhint="search"></div>
  <div class="row-btns"><button class="pill-btn is-accent" data-a="frank-open" data-date="${k}">${icon('sparkles')}Frank fragen</button><button class="pill-btn" data-a="food-new">${icon('plus')}Eigenes Lebensmittel</button><button class="pill-btn" data-a="plant-pick" data-date="${k}">${icon('sprout')}Pflanze hinzufügen</button></div>
  <div id="results">${searchResults()}</div>`;
  h += snacksHTML(k);
  const entries = d.entries || [];
  h += `<section class="sec"><div class="sec-head"><h2>Eingetragen ${k === todayKey() ? 'heute' : 'an diesem Tag'}</h2><span class="count">${entries.length}</span></div>`;
  if (!entries.length) h += `<p class="sec-sub">Noch keine Einzel-Einträge. Suche oben ein Lebensmittel oder nutze den Standardtag.</p>`;
  else {
    for (const [mid, mn] of MEALS) {
      const es = entries.filter((e) => (e.meal || 'snack') === mid);
      if (!es.length) continue;
      h += `<h4 class="meal-h">${mn}</h4><div class="list">${es.map((e) => { const f = FOOD[e.food]; const kc = f ? (f.v.kcal || 0) * e.g / (f.base || 100) : 0; return `<div class="row-wrap"><button class="row" data-a="entry-edit" data-id="${e.id}" data-date="${k}"><span class="row-main"><b>${esc(f ? f.n : e.food)}</b><small>${esc(fmtAmount(f, e.g))}</small></span><span class="row-side">${fmt(kc)} kcal</span></button><button class="icon-btn sm ghost row-act" data-a="entry-del-now" data-id="${e.id}" data-date="${k}" aria-label="${esc(f ? f.n : e.food)} löschen">${icon('trash-2')}</button></div>`; }).join('')}</div>`;
    }
  }
  h += '</section>';
  const plants = d.plants || [];
  if (plants.length) h += `<section class="sec"><div class="sec-head"><h2>Zusätzliche Pflanzen</h2></div><div class="chips">${plants.map((p) => `<button class="chip is-on" data-a="plant-del" data-v="${esc(p)}" data-date="${k}">${esc(p)} ${icon('x')}</button>`).join('')}</div></section>`;
  return h;
}
function searchResults() {
  const q = ui.q.trim().toLowerCase();
  const all = Object.values(FOOD);
  if (!q) {
    const recent = recentFoods(8);
    let h = recent.length ? `<h4 class="meal-h">Zuletzt verwendet</h4><div class="list">${recent.map(foodRow).join('')}</div>` : '';
    const cats = [...new Set(all.map((f) => f.cat))];
    h += cats.map((c) => { const open = ui.exp.has('cat:' + c); const fs = all.filter((f) => f.cat === c); return `<button class="cat-row" data-a="expand" data-key="cat:${esc(c)}"><span>${esc(c)}</span><small>${fs.length}</small>${icon(open ? 'chevron-down' : 'chevron-right')}</button>${open ? `<div class="list">${fs.map(foodRow).join('')}</div>` : ''}`; }).join('');
    return h;
  }
  const words = q.split(/\s+/);
  const hits = all.filter((f) => words.every((w) => (f.n + ' ' + f.cat + ' ' + [].concat(f.pl || []).join(' ')).toLowerCase().includes(w)));
  hits.sort((a, b) => (a.n.toLowerCase().startsWith(q) ? -1 : 0) - (b.n.toLowerCase().startsWith(q) ? -1 : 0) || a.n.localeCompare(b.n, 'de'));
  if (!hits.length) return `<div class="empty"><p>Nichts gefunden für „${esc(ui.q)}“.</p><div class="row-btns center"><button class="pill-btn is-accent" data-a="frank-open" data-q="${esc(ui.q)}">${icon('sparkles')}Frank fragen</button><button class="pill-btn" data-a="food-new" data-name="${esc(ui.q)}">${icon('plus')}Selbst anlegen</button></div></div>`;
  return `<div class="list">${hits.slice(0, 40).map(foodRow).join('')}</div>`;
}
function foodRow(f) {
  const per = f.base === 1 ? `pro ${f.u[0][0]}` : isLiquid(f) ? 'pro 100 ml' : 'pro 100 g';
  return `<button class="row" data-a="food-open" data-id="${f.id}"><span class="row-main"><b>${esc(f.n)}${f.est ? ' <em class="est">Schätzung</em>' : ''}${f.custom ? ` <em class="est">${f.frank ? 'Frank' : 'eigenes'}</em>` : ''}</b><small>${fmt(f.v.kcal || 0)} kcal, ${fmt(f.v.p || 0, 1)} g Protein ${per}</small></span>${icon('plus', 'row-ic')}</button>`;
}
function recentFoods(n) {
  const seen = new Map();
  for (const k of Object.keys(S.days).sort().reverse().slice(0, 21)) for (const e of (S.days[k].entries || []).slice().reverse()) if (!seen.has(e.food) && FOOD[e.food]) seen.set(e.food, FOOD[e.food]);
  return [...seen.values()].slice(0, n);
}

/* ---------- Auswertung ---------- */
function vEval(k) {
  const ev = evaluate(k);
  const isT = k === todayKey();
  let h = '';
  if (!ev.logged) h += `<div class="banner is-soft">${icon('info')}<div><b>Noch nichts eingetragen</b><span>${isT ? 'Die Prognose zeigt, wo dein Standardtag landen würde.' : 'An diesem Tag gibt es keine Ernährungsdaten.'}</span></div></div>`;
  const sc = ev.logged ? nutritionScore(ev) : null;
  if (sc != null) h += `<div class="score-line"><b>${sc}</b><span>Ernährungs-Score (0–100), Mittel aus allen Zielen</span></div>`;
  h += energyBar(ev.act.tot);
  h += tipsSection(k, 0);
  h += trendSection(k, 0);
  for (const g of EVAL_GROUPS) {
    h += `<section class="sec"><div class="sec-head"><h2>${esc(g.n)}</h2></div><div class="mlist">${g.keys.map((key) => metricRow(key, ev, k)).join('')}</div></section>`;
  }
  h += suppEval(k);
  h += `<section class="sec"><div class="sec-head"><h2>Weitere Themen</h2></div><div class="mlist">
    ${topicRow('timing', 'Mahlzeiten-Timing')}${topicRow('upf', 'Ultraverarbeitete Lebensmittel')}${topicRow('alkohol', 'Alkohol')}</div></section>`;
  h += `<p class="hint center">Schätzwerte (Prepmymeal, Döner) kannst du unter Einstellungen → Lebensmittel anpassen.</p>`;
  return h;
}
function topicRow(key, title) {
  const open = ui.exp.has('t:' + key);
  return `<div class="mrow"><button class="mrow-hit" data-a="expand" data-key="t:${key}"><div class="mrow-top"><span class="mname">${esc(title)}</span>${icon(open ? 'chevron-down' : 'chevron-right', 'mrow-chev')}</div></button>${open ? `<div class="mrow-detail">${infoHTML(key)}</div>` : ''}</div>`;
}
function metricRow(key, ev, k) {
  const m = ev.metrics[key];
  const meta = metaOf(key);
  const open = ui.exp.has('m:' + key);
  const isT = k >= todayKey();
  const logged = ev.logged || key === 'fluid' || key === 'plants';
  const st = logged ? m.state : 'none';
  const ref = m.t.lo != null ? m.t.lo : m.t.max;
  const w = ref ? clamp((m.v / ref) * 100, 0, 100) : 0;
  const pw = ref ? clamp((m.pv / ref) * 100, 0, 100) : 0;
  const unit = key === 'plants' ? 'Pflanzen' : meta.u;
  let extra = '';
  if (key === 'va') extra = `<small class="mrow-note">davon Retinol ${fmt(ev.act.tot.ret || 0)} µg (max. ${fmt(m.t.max)})</small>`;
  if (key === 'vk') extra = `<small class="mrow-note">davon K2 ${fmt(ev.act.tot.k2 || 0)} µg</small>`;
  if (key === 'mg' && ev.act.tot.mgSupp) extra = `<small class="mrow-note">aus Supplements ${fmt(ev.act.tot.mgSupp)} mg (max. ${fmt(m.t.suppMax)})</small>`;
  if (key === 'o3') extra = `<small class="mrow-note">EPA ${fmt(ev.act.tot.epa || 0, 2)} g, DHA ${fmt(ev.act.tot.dha || 0, 2)} g</small>`;
  if (key === 'fatPct') extra = `<small class="mrow-note">${fmt(ev.act.tot.f || 0)} g Fett</small>`;
  if (key === 'fluid' && isSportDay(k)) extra = '<small class="mrow-note">Gym- oder Sauna-Tag: höheres Ziel</small>';
  const projTxt = isT && Math.abs(m.pv - m.v) > 0.01 * (ref || 1) ? `<span class="proj-txt">mit Restplan ${fmt(disp(key, m.pv), meta.d)}${ref ? ` (${fmt((m.pv / ref) * 100)} %)` : ''}</span>` : '';
  const contrib = open && key !== 'plants' && key !== 'ferm' ? topContrib(ev.act.contrib, key === 'fatPct' ? 'f' : key, 4) : [];
  return `<div class="mrow st-${st}${open ? ' is-open' : ''}" id="m-${key}">
    <button class="mrow-hit" data-a="expand" data-key="m:${key}" aria-expanded="${open}">
      <div class="mrow-top"><span class="mname">${esc(meta.n)}</span><span class="mval"><b>${valTxt(key, m.v)}</b> <small>/ ${targetTxt(key, m.t)} ${esc(unit)}</small></span></div>
      <div class="bar"><i class="bar-proj" style="width:${isT ? pw : 0}%"></i><i class="bar-fill" style="width:${w}%"></i></div>
      <div class="mrow-meta">${stBadge(st)}${projTxt}${icon(open ? 'chevron-down' : 'chevron-right', 'mrow-chev')}</div>
      ${extra}
    </button>
    ${open ? `<div class="mrow-detail">
      ${key === 'plants' ? plantsDetail(k, ev) : ''}
      ${key === 'ferm' ? fermDetail(ev) : ''}
      ${contrib.length ? `<h5>Größte Quellen heute</h5><ul class="contrib">${contrib.map(([n, v]) => `<li><span>${esc(n)}</span><b>${fmt(disp(key === 'fatPct' ? 'f' : key, v), metaOf(key === 'fatPct' ? 'f' : key).d)} ${esc(key === 'fatPct' ? 'g' : meta.u)}</b></li>`).join('')}</ul>` : ''}
      ${infoHTML(key)}
    </div>` : ''}
  </div>`;
}
function plantsDetail(k, ev) {
  const set = [...ev.plantsWeek].sort((a, b) => a.localeCompare(b, 'de'));
  const home = ['Brokkoli', 'Rote Bete', 'Apfel', 'Tomate', 'Zwiebel', 'Knoblauch', 'Hanf', 'Kakao', 'Sonnenblume', 'Dinkel', 'Himbeere', 'Brombeere', 'Heidelbeere', 'Chinakohl', 'Gurke', 'Roggen'];
  const missing = home.filter((p) => !ev.plantsWeek.has(p));
  return `<h5>Diese Woche (${set.length})</h5><div class="chips chips-tight">${set.map((p) => `<span class="chip chip-xs is-static">${esc(p)}</span>`).join('') || '<span class="hint">Noch keine.</span>'}</div>
    ${missing.length ? `<h5>Noch nicht diese Woche (aus deinem Vorrat)</h5><div class="chips chips-tight">${missing.map((p) => `<span class="chip chip-xs is-static is-muted">${esc(p)}</span>`).join('')}</div>` : ''}
    <button class="pill-btn" data-a="plant-pick" data-date="${k}">${icon('sprout')}Pflanze hinzufügen</button>`;
}
function fermDetail(ev) {
  const list = Object.entries(ev.act.tot.ferm).map(([id, g]) => { const f = FOOD[id]; return f ? `<li><span>${esc(f.n)}</span><b>${fmt(Math.min(1, g / f.ferm), 1)}</b></li>` : ''; }).join('');
  return list ? `<h5>Gezählte Portionen</h5><ul class="contrib">${list}</ul>` : '';
}
function suppEval(k) {
  const d = getDay(k), variant = dayVariant(k);
  const list = suppItems().filter(({ it }) => itemInVariant(it, variant));
  const open = ui.exp.has('m:supps');
  return `<section class="sec"><div class="sec-head"><h2>Supplements</h2></div><div class="mlist">
    ${list.map(({ it }) => { const f = FOOD[it.food], on = !!d.checks[it.id]; return `<div class="mrow st-${on ? 'ok' : f.supp === 'daily' ? 'under' : 'none'}"><div class="mrow-hit is-static"><div class="mrow-top"><span class="mname">${esc(f.n)}</span><span class="mval">${on ? `<b>${fmt(itemAmount(it, d, variant), 1)}</b> <small>${esc(it.u)}</small>` : '<small>nicht genommen</small>'}</span></div><div class="mrow-meta">${on ? stBadge('ok') : f.supp === 'daily' ? stBadge('under') : '<span class="hint">bei Bedarf</span>'}</div></div></div>`; }).join('')}
    <div class="mrow${open ? ' is-open' : ''}"><button class="mrow-hit" data-a="expand" data-key="m:supps"><div class="mrow-top"><span class="mname">Warum diese Supplements?</span>${icon(open ? 'chevron-down' : 'chevron-right', 'mrow-chev')}</div></button>${open ? `<div class="mrow-detail">${infoHTML('supps')}<h5>Kreatin</h5>${infoHTML('s_kreatin')}<h5>AG1</h5>${infoHTML('s_ag1')}</div>` : ''}</div>
  </div></section>`;
}

/* ============================================================
   SHEETS (Menge ändern, Lebensmittel hinzufügen, Pflanzen)
   ============================================================ */
function openSheet(html) {
  const t = $('#toast'); if (t) t.classList.remove('show');
  const el = $('#sheet');
  el.innerHTML = `<div class="sheet-backdrop" data-a="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-grab"></div>${html}</div>`;
  el.classList.add('open');
  document.documentElement.classList.add('noscroll');
}
function closeSheet() {
  const el = $('#sheet');
  el.classList.remove('open');
  el.innerHTML = '';
  document.documentElement.classList.remove('noscroll');
  ui.sheet = null;
}
function nutPreview(food, g) {
  if (!food || !(g > 0)) return '<p class="hint">Menge eingeben.</p>';
  const tot = newTotals();
  addFood(tot, null, food, g, '');
  const main = [['kcal', 'kcal'], ['p', 'g Protein'], ['f', 'g Fett'], ['c', 'g KH'], ['fib', 'g Ballastst.']];
  const micros = MICRO_KEYS.filter((k) => k !== 'o3').map((k) => [k, (tot[k] || 0) / (T()[k] && T()[k].lo ? T()[k].lo : 1)]).filter(([, r]) => r >= 0.08).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return `<div class="preview">${main.map(([k, u]) => `<span><b>${fmt(tot[k] || 0)}</b><small>${u}</small></span>`).join('')}</div>
    ${micros.length ? `<p class="preview-micro">${micros.map(([k, r]) => `${MICRO_SHORT[k]} ${fmt(r * 100)} %`).join(', ')}</p>` : ''}`;
}
function sheetItem(id, k) {
  const found = findItem(id);
  if (!found) return;
  const { it } = found;
  const d = getDay(k), variant = dayVariant(k);
  const fid = itemFoodId(it, d), food = FOOD[fid];
  const amt = itemAmount(it, d, variant);
  ui.sheet = { type: 'item', id, k, amt };
  const def = it.av && it.av[variant] != null ? it.av[variant] : it.a;
  openSheet(`<h3 class="sheet-title">${esc(itemLabel(it, d))}</h3>
    ${food && food.est ? '<p class="hint">Schätzwert, anpassbar unter Einstellungen → Lebensmittel.</p>' : ''}
    <div class="amount-row"><button class="step" data-a="sheet-step" data-d="-1" aria-label="Weniger">${icon('minus')}</button>
      <label class="amount-in"><input type="text" inputmode="decimal" id="sh-amt" value="${numIn(amt, 2)}" data-i="sheet-amt"><span>${esc(itemUnit(it, food))}</span></label>
      <button class="step" data-a="sheet-step" data-d="1" aria-label="Mehr">${icon('plus')}</button></div>
    <p class="hint center">Standardmenge: ${esc(amountLabel(def, itemUnit(it, food)))}${it.u === 'Portion' || it.u === 'Tagesdosis' || it.u === 'Tropfen' ? '. Auch halbe Mengen gehen, z. B. 0,5.' : ''}</p>
    ${food && food.id === 's_ag1' ? `<div class="banner is-soft">${icon('info')}<div><b>Wie viel AG1 heute passt</b><span>${esc(ag1BudgetLong(ag1Budget(k)))}</span></div></div>` : ''}
    <div id="sh-prev">${nutPreview(food, amt * unitG(food, it.u))}</div>
    <div class="sheet-acts">
      <button class="btn is-accent" data-a="item-save" data-mode="check">Übernehmen und abhaken</button>
      <button class="btn" data-a="item-save" data-mode="amt">Nur Menge ändern</button>
      <button class="btn is-ghost" data-a="item-save" data-mode="default">Als neue Standardmenge speichern</button>
      ${d.amt && d.amt[id] != null ? '<button class="btn is-ghost" data-a="item-save" data-mode="reset">Auf Standard zurücksetzen</button>' : ''}
    </div>`);
}
function stepFor(unit, cur) {
  if (unit === 'g' || unit === 'ml') return cur >= 200 ? 50 : cur >= 50 ? 10 : 5;
  return cur < 1 ? 0.25 : 1;
}
function sheetFood(fid, k, entry = null) {
  const food = FOOD[fid];
  if (!food) return;
  const unit = entry ? 'g' : food.u[0][0];
  const amount = entry ? entry.g : (food.base === 1 ? 1 : food.u[0][0] === 'g' || food.u[0][0] === 'ml' ? 100 : 1);
  ui.sheet = { type: 'food', fid, k, unit, amt: amount, meal: entry ? entry.meal : defaultMeal(), entryId: entry ? entry.id : null };
  renderFoodSheet();
}
function renderFoodSheet() {
  const s = ui.sheet, food = FOOD[s.fid];
  const g = s.amt * unitG(food, s.unit);
  const units = food.u.map((u) => u[0]).concat(food.base === 1 ? [] : [isLiquid(food) ? 'ml' : 'g']).filter((v, i, a) => a.indexOf(v) === i);
  const blocked = phaseBlocks(s.k, food);
  openSheet(`<h3 class="sheet-title">${esc(food.n)}</h3>
    ${food.est ? '<p class="hint">Schätzwert, anpassbar unter Einstellungen → Lebensmittel.</p>' : ''}
    ${food.frank ? `<p class="hint">Von Frank recherchiert${food.frank.est && food.frank.est.length ? ', ein Teil geschätzt' : ''}${food.frank.src && food.frank.src.length ? `. Quellen: ${frankSrcLinks(food.frank.src)}` : ''}</p>` : ''}
    ${blocked ? `<div class="banner is-warn">${icon('triangle-alert')}<div><b>${esc(blocked.n)} im Haut-Protokoll</b><span>${esc(blocked.rules.join(', '))}</span></div></div>` : ''}
    ${s.entryId ? '' : swapHTML(food)}
    <div class="amount-row"><button class="step" data-a="sheet-step" data-d="-1" aria-label="Weniger">${icon('minus')}</button>
      <label class="amount-in"><input type="text" inputmode="decimal" id="sh-amt" value="${numIn(s.amt, 2)}" data-i="sheet-amt"></label>
      <button class="step" data-a="sheet-step" data-d="1" aria-label="Mehr">${icon('plus')}</button></div>
    <div class="chips center">${units.map((u) => `<button class="chip chip-sm${u === s.unit ? ' is-on' : ''}" data-a="sheet-unit" data-v="${esc(u)}">${esc(u)}</button>`).join('')}</div>
    <div class="chips center">${MEALS.map(([id, n]) => `<button class="chip chip-sm${id === s.meal ? ' is-on' : ''}" data-a="sheet-meal" data-v="${id}">${n}</button>`).join('')}</div>
    <div id="sh-prev">${nutPreview(food, g)}</div>
    <div class="sheet-acts">
      <button class="btn is-accent" data-a="entry-save">${s.entryId ? 'Speichern' : 'Hinzufügen'}</button>
      ${s.entryId ? '<button class="btn is-danger" data-a="entry-del">Eintrag löschen</button>' : ''}
    </div>`);
}
function sheetPlants(k) {
  ui.sheet = { type: 'plants', k };
  const d = getDay(k);
  const have = weekPlants(k, true);
  const own = new Set(d.plants || []);
  const list = [...new Set(PLANT_PICKS)].sort((a, b) => a.localeCompare(b, 'de'));
  openSheet(`<h3 class="sheet-title">Pflanze hinzufügen</h3>
    <p class="hint">Für die Wochen-Vielfalt, ohne Nährwerte. Zum Beispiel die Zutaten deines Prepmymeal-Gerichts.</p>
    <div class="search"><span>${icon('plus')}</span><input type="text" placeholder="Eigene Pflanze eingeben" id="plant-new" enterkeyhint="done"><button class="pill-btn" data-a="plant-add-custom" data-date="${k}">Hinzufügen</button></div>
    <div class="chips plant-chips">${list.map((p) => `<button class="chip chip-sm${own.has(p) ? ' is-on' : have.has(p) ? ' is-had' : ''}" data-a="plant-toggle" data-v="${esc(p)}" data-date="${k}">${esc(p)}</button>`).join('')}</div>
    <div class="sheet-acts"><button class="btn is-accent" data-a="sheet-close">Fertig</button></div>`);
}
