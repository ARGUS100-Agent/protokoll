/* ============================================================
   MITTEILUNGEN (Push) – Wunsch vom 10.11.2026
   Die App plant Mitteilungen für die nächsten Tage aus deinen Daten und lädt den Plan
   zu deiner eigenen Cloudflare-Weiterleitung (Worker v3 mit KV-Speicher und Zeitplan).
   Der Worker schickt jede Mitteilung zur geplanten Zeit als Web-Push (Ende-zu-Ende
   verschlüsselt). Geräte-Schlüssel und Adresse bleiben auf dem Gerät (IndexedDB „push“,
   nicht im Backup). Öffnest du die App, wird der Plan neu gerechnet.
   ============================================================ */
/*icons: bell bell-off bell-ring send list */

let PUSH = null; // { url, key, pub, on, last, hash, n, err, errAt }
let pushReg = null; // Service-Worker-Registrierung (für subscribe direkt im Tipp)
let pushTimer = null, pushBusy = null, pushAgain = false;
const PUSH_CATS = [
  ['todo', 'To-dos & Checks', 'Fällige To-dos, Knie-Morgencheck, Backup, Wochenrückblick am Sonntag'],
  ['plan', 'Offene Posten im Standardtag', 'Nach jeder Mahlzeit-Zeit, wenn noch etwas offen ist – auch Supplements'],
  ['rhythm', 'Tagesrhythmus', 'Morgenlicht, Koffein-Stopp, Bildschirm-Pause, Schlafenszeit aus deinem Schlaffenster („Wann musst du morgen raus?“, solange es noch kein Fenster gibt)'],
  ['goals', 'Wochenziele', 'Zur Erinnerungszeit deiner Ziele („Jetzt dran“)'],
  ['training', 'Training & Kraft', 'Gym heute, ausgefallene Einheiten, lange Pausen – mit einem kleinen Tritt'],
  ['habits', 'Gewohnheiten & Routinen', 'Warm duschen, Meditation, Atemübung, To-do-Liste, Bildschirmzeit, Sauna, Kältebad – antippen und Ja/Nein wählen'],
  ['nutri', 'Nährstoffe am Abend', 'Was heute noch fehlt oder schon zu viel ist – mit konkretem Tipp'],
  ['wins', 'Geschafft', 'Am Abend, was du heute erreicht hast'],
];
const PUSH_DAYS = 3; // heute + 2 Tage im Voraus
const PUSH_CAP = 16; // höchstens pro Tag
const PUSH_PRIO = { rhythm: 1, todo: 1, goals: 1, training: 2, habits: 2, plan: 3, nutri: 3, wins: 3 }; // 3 fällt zuerst weg
const PUSH_CF_KV = 'https://dash.cloudflare.com/?to=/:account/workers/kv/namespaces';
const PUSH_CF_WORKERS = 'https://dash.cloudflare.com/?to=/:account/workers-and-pages';

function pushLoad(all) { const p = all && all.push; PUSH = p && typeof p === 'object' && p.url && p.key ? p : null; }
function pushSave() { return DB.putMany([['push', PUSH ? { ...PUSH } : undefined]]); }
function pushOn() { return !!(PUSH && PUSH.on); }
function pushCats() { const c = (S.settings.push && S.settings.push.cats) || {}; const out = {}; for (const [id] of PUSH_CATS) out[id] = c[id] !== false; return out; }
function pushSupport() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent || '');
  if (!('serviceWorker' in navigator)) return { ok: false, why: 'Dieser Browser kann keine Mitteilungen empfangen.' };
  if (ios && !navigator.standalone) return { ok: false, why: 'Auf dem iPhone gehen Mitteilungen nur in der App vom Home-Bildschirm (Teilen → „Zum Home-Bildschirm“), nicht im Safari-Tab.' };
  if (!('PushManager' in window) || !('Notification' in window)) return { ok: false, why: 'Mitteilungen brauchen iOS 16.4 oder neuer.' };
  return { ok: true };
}
function pushB64u(buf) { const b = new Uint8Array(buf); let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function pushB64uDec(str) { const s = String(str).replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4)); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
function pushFirst(s) { const i = String(s).indexOf('. '); return i > 0 ? s.slice(0, i + 1) : String(s); }
function pushHash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ':' + str.length; }

/* ---------- Gespräch mit dem Worker ---------- */
async function pushCall(op, body = {}, opt = {}) {
  if (!PUSH || !PUSH.url) throw garErr('setup', 'Erst die Weiterleitung eintragen.');
  let res;
  try {
    res = await fetch(`${PUSH.url}/push/${op}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Push-Key': PUSH.key }, body: JSON.stringify(body), cache: 'no-store', credentials: 'omit', keepalive: !!opt.keepalive });
  } catch (e) {
    throw garErr('net', navigator.onLine === false ? 'Kein Internet.' : 'Weiterleitung nicht erreichbar. Adresse prüfen.');
  }
  let j = {};
  try { j = await res.json(); } catch (e) { j = {}; }
  if (res.ok) return j;
  if (res.status === 501 || j.err === 'kv') throw garErr('kv', 'Im Worker fehlt der Speicher: KV-Namespace anlegen und als „PUSH“ binden (Schritt 2).');
  if (res.status === 403 && j.err === 'fremd') throw garErr('fremd', 'Dieser Worker ist schon mit einem anderen Gerät verbunden. In Cloudflare den KV-Eintrag „cfg“ löschen, dann neu verbinden.');
  if (res.status === 403) throw garErr('key', 'Der Worker kennt dieses Gerät nicht (mehr). Neu verbinden.');
  if (res.status === 404 || res.status === 405 || (res.status === 403 && !j.err)) throw garErr('old', 'Der Worker ist noch nicht auf Version 3. Neuen Code einfügen und „Deploy“ (Schritt 1).');
  if (res.status === 409) throw garErr('sub', 'Mitteilungen sind auf diesem Gerät noch nicht erlaubt.');
  throw garErr('http', `Weiterleitung antwortet mit Fehler ${res.status}.`);
}

/* ---------- Plan: was wann gemeldet wird ---------- */
function pushAt(k, min) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 0, Math.round(min)).getTime(); }
function pushList(arr, n = 5) { const a = arr.filter(Boolean); return a.length > n ? `${a.slice(0, n).join(', ')} und ${a.length - n} weitere` : a.join(', '); }
/* Getränke, die du in den letzten 14 Tagen wirklich getrunken hast */
function cafUsedIds() { const s = new Set(); for (let i = 0; i < 14; i++) { const d = peekDay(addDays(todayKey(), -i)); for (const c of (d && d.caf) || []) if (c.p) s.add(c.p); } return s; }
function pushPlan(now = Date.now()) {
  const cats = pushCats(), out = [];
  const today = todayKey();
  const cafUser = rangeKeys(7).some((x) => cafSources(x).length > 0);
  for (let i = 0; i < PUSH_DAYS; i++) {
    const k = addDays(today, i), isT = i === 0;
    const d0 = peekDay(k) || blankDay(k), r = rhythm(k), variant = dayVariant(k);
    const d = { ...d0, habits: d0.habits || {}, checks: d0.checks || {}, hd: d0.hd || {}, health: d0.health || {} };
    const day = [];
    const add = (cat, min, tag, title, body, url) => {
      if (!cats[cat] || min == null || !isFinite(min)) return;
      if (min > r.bed + 15 || min < r.wake - 180) return; // nicht im Schlaf
      if (min < r.wake) min = r.wake + 10; // feste Uhrzeit vor dem Aufstehen: kurz danach
      day.push({ cat, min: Math.round(min), tag: `${tag}-${k.slice(5)}`, title, body: body || '', url: url || '#heute' });
    };
    const off = (id) => (S.settings.habitsOff || []).includes(id);
    /* To-dos & Checks */
    const todos = todosOpen().filter((t) => t.date && t.date <= k);
    if (todos.length) add('todo', r.wake + 60, 'todo', todos.length === 1 ? `To-do: ${todos[0].t.slice(0, 80)}` : `${todos.length} To-dos fällig`, todos.length === 1 ? (todos[0].date < k ? 'Überfällig – heute erledigen oder neu planen.' : 'Steht für heute an.') : pushList(todos.map((t) => t.t.slice(0, 50)), 4), '#todos');
    const kw = kneeWeek(k);
    if (kw >= 1 && kw <= 12 && kneeAm(k) == null) add('todo', r.wake + 20, 'knie', 'Knie heute Morgen?', 'Schmerz 0–10 eintragen – ein Tipp reicht, die App passt Training und Lauf daran an.', '#heute');
    if (isT && backupDue()) add('todo', r.wake + 90, 'backup', 'Backup fällig', 'Einstellungen → Backup & Daten: einmal sichern, dann sind deine Daten sicher.', '#set');
    if (weekday(k) === 6 && !weekGoals(addDays(weekStart(k), 7)).length) add('todo', Math.min(18 * 60, r.bed - 120), 'review', 'Wochenrückblick fertig', 'Schick ihn Frank – er gibt dir 3 Ziele für die neue Woche zurück.', '#woche');
    /* Offene Posten im Standardtag (Blöcke mit Uhrzeit, nah beieinander zusammengefasst) */
    const blocks = [];
    for (const b of S.settings.plan) {
      const t = resolveBlockTime(b, d);
      if (t == null) continue;
      const open = b.items.filter((it) => !it.opt && itemInVariant(it, variant) && !d.checks[it.id]);
      if (open.length) blocks.push({ t: t + 45, id: b.id, n: b.n, labels: open.map((it) => itemLabel(it, d)) });
    }
    blocks.sort((a, b) => a.t - b.t);
    for (let j = 0; j < blocks.length; j++) {
      let g = blocks[j];
      while (j + 1 < blocks.length && blocks[j + 1].t - g.t < 45) { const nx = blocks[++j]; g = { t: nx.t, id: nx.id, n: `${g.n} & ${nx.n}`, labels: g.labels.concat(nx.labels) }; }
      add('plan', g.t, `plan-${String(g.id).replace(/[^a-z0-9]/gi, '')}`, `Noch offen: ${g.n}`, pushList(g.labels, 6), '#ern');
    }
    /* Tagesrhythmus */
    if (!off('licht_morgen') && !d.habits.licht_morgen) add('rhythm', lightAt(k), 'licht', 'Morgenlicht', '10–30 Min. raus ins Tageslicht – das stellt deine innere Uhr und hilft beim Einschlafen heute Abend.', '#licht');
    if (!off('koffein') && cafUser) {
      if (cafMode() === 'dose') {
        const used = cafUsedIds(), stops = cafStops(k).filter((x) => !used.size || used.has(x.id));
        const st = cafStart(k);
        if (stops.length) add('rhythm', st, 'kstart', `Koffein ab jetzt okay`, `90 Minuten nach dem Aufwachen. ${stops.map((x) => `${x.n} bis ${minToTime(x.stop)}`).join(', ')}.`, '#licht');
        for (const x of stops.slice(0, 3)) if (x.stop > st + 30) add('rhythm', x.stop - 15, 'stopp-' + String(x.id).replace(/[^a-z0-9]/gi, '').slice(0, 12), `Koffein-Stopp für ${x.n} um ${minToTime(x.stop)}`, `${fmt(x.mg)} mg brauchen ~${fmt(cafDoseH(x.mg), 1)} Std. Abstand zum Schlafen (${minToTime(r.bed)}).${stops.filter((y) => y.stop > x.stop).length ? ' Danach noch: ' + stops.filter((y) => y.stop > x.stop).map((y) => `${y.n} bis ${minToTime(y.stop)}`).join(', ') + '.' : ' Danach kein Koffein mehr.'}`, '#licht');
      } else { const cut = cafCutoff(k); add('rhythm', cut - 15, 'stopp', `Koffein-Stopp um ${minToTime(cut)}`, `Danach kein Kaffee, Monster oder Cola mehr – Schlafenszeit heute ${minToTime(r.bed)}.`, '#licht'); }
    }
    if (!(d.hd && d.hd.wakeNext) && r.bedSrc !== 'fenster') add('rhythm', r.bed - 120, 'raus', 'Wann musst du morgen raus?', 'Antippen und Uhrzeit einstellen – dann passen Schlafenszeit und Koffein-Stopp.', '#rhythmus');
    if (isT) { // Schlafkonto: nach einer kurzen Nacht Vorschläge, Nickerchen-Fenster
      const sa = sleepAcct(k), nw = napWindow(k);
      if (sa.bad) add('rhythm', r.wake + 45, 'defizit', 'Kurze Nacht – so gleichst du aus', `${sa.last ? fmtDur(sa.last.dur) + ' geschlafen. ' : ''}${nw ? `Nickerchen 10–20 Min. zwischen ${minToTime(nw[0])} und ${minToTime(nw[1])}, ` : ''}sonst NSDR oder 13 Min. Meditation.${sa.rec ? ` Heute ${fmtDur(sa.rec)} früher ins Bett: ${minToTime(r.bed)}.` : ''}`, '#schlaf');
      if (sa.bad && nw && !sleepNap(d)) add('rhythm', nw[0], 'nap', 'Nickerchen-Fenster', `Jetzt bis ${minToTime(nw[1])}: 10–20 Min. hinlegen, Wecker stellen. Geht nicht? 10 Min. NSDR.`, '#schlaf');
    }
    if (!off('bildschirm')) add('rhythm', r.bed - 60, 'screen', 'Bildschirme weg', `Schlafenszeit ${minToTime(r.bed)} – jetzt Licht dimmen und runterfahren.`, '#licht');
    add('rhythm', r.bed - 10, 'bett', `Schlafenszeit ${minToTime(r.bed)}`, r.bedSrc === 'fenster' ? `Dein Fenster: einschlafen ${rhRange(r.win.onset)}, morgen raus ${rhRange(r.wakeNext)}.` : r.wakeNext != null ? `Morgen raus um ${minToTime(r.wakeNext)} – so kommst du auf ${fmtDur(r.need)} Schlaf.` : `So kommst du auf ${fmtDur(r.need)} Schlaf.`, '#heute');
    pushHabits(k, r, d, add, off, isT);
    pushTraining(k, r, d, add, isT);
    pushExp(k, r, add);
    pushBP(k, r, add);
    pushZw(k, r, d, add);
    pushAth(k, r, d, add);
    /* Wochenziele mit Erinnerung */
    const ws = weekStart(k);
    for (const g of weekGoals(ws)) {
      if (!g.when) continue;
      const e = goalEval(g, ws);
      if (e.status === 'done' || e.status === 'missed') continue;
      if (isT && (e.todayState === 'fail' || (g.cmp === '>=' && e.todayState === 'ok'))) continue;
      add('goals', goalWhenMin(g, k), `ziel${g.id}`, `Jetzt dran: ${g.title}`, g.tip || g.why || e.progress, '#heute');
    }
    /* Nährstoffe am Abend: vor der Abend-Mahlzeit, mit dem Rest deines Plans gerechnet */
    const ab = S.settings.plan.find((b) => b.id === 'abend');
    const tN = Math.max(r.wake + 360, (ab ? resolveBlockTime(ab, d) : null) ?? r.bed - 210) - 30;
    const ev = evaluate(k);
    if (!ev.logged) add('nutri', tN, 'nutri', 'Heute noch nichts eingetragen', 'Standardtag abhaken, dann rechnet die App Nährstoffe, Bilanz und Tipps.', '#ern');
    else if (isT) {
      const tips = buildTips(k);
      const gaps = tips.filter((t) => t.kind === 'gap').slice(0, 3), over = tips.filter((t) => t.kind === 'over').slice(0, 2);
      if (gaps.length || over.length) {
        const name = (t) => metaOf(t.key).n;
        const title = [gaps.length ? `${gaps.map(name).join(', ')} ${gaps.length === 1 ? 'fehlt' : 'fehlen'} noch` : '', over.length ? `${over.map(name).join(', ')} zu hoch` : ''].filter(Boolean).join(' · ');
        const fl = ev.metrics.fluid, flGap = fl ? fl.t.lo - fl.pv : 0;
        const parts = gaps.map((t) => (t.key === 'fluid' ? `Trinken: jetzt ein großes Glas Wasser, bis zum Schlafen noch ca. ${fmt(Math.min(1500, Math.max(250, flGap)) / 1000, 1)} l` : `${name(t)}: ${t.text.replace(/^\+\s*/, '')}`)).concat(over.map((t) => { const x = pushFirst(t.text); return x.toLowerCase().includes(name(t).toLowerCase().split(' ')[0]) ? x : `${name(t)}: ${x}`; }));
        add('nutri', tN, 'nutri', title, (gaps.length ? 'Auch mit dem Rest deines Plans. ' : '') + parts.join(' · '), '#ern');
      }
    }
    /* Geschafft (heute, abends) */
    if (isT && ev.logged) {
      const win = [];
      const m = ev.metrics;
      if (m.p && ['ok', 'high'].includes(m.p.state)) win.push(`Eiweiß ${fmt(m.p.v)} g`);
      if (m.kcal && m.kcal.state === 'ok') win.push('Kalorien im Ziel');
      if (m.fib && ['ok', 'high'].includes(m.fib.state)) win.push(`Ballaststoffe ${fmt(m.fib.v)} g`);
      const sup = areaStatus('supp', k);
      if (sup && sup.st === 'ok') win.push('alle Supplements');
      const tr = (d.trainings || []).filter((t) => !trainType(t).light);
      if (tr.length) win.push(tr.map((t) => t.type).join(' + '));
      if (saunaMin(d)) win.push(`Sauna ${fmt(saunaMin(d))} Min.`);
      if (d.health && d.health.steps >= 10000) win.push(`${fmt(d.health.steps)} Schritte`);
      const hs = HABITS.filter((h) => !off(h.id));
      const hd = hs.filter((h) => d.habits[h.id]).length;
      if (hd >= 3) win.push(`${hd}/${hs.length} Gewohnheiten`);
      const gok = weekGoals(ws).filter((g) => goalEval(g, ws).todayState === 'ok').length;
      if (gok) win.push(`${gok} ${gok === 1 ? 'Wochenziel' : 'Wochenziele'} heute erfüllt`);
      if (win.length >= 2) add('wins', r.bed - 30, 'wins', 'Heute geschafft', win.join(' · '), '#heute');
    }
    /* sortieren, Abstand mind. 5 Min., nur Kommendes; höchstens PUSH_CAP pro Tag – zu viele? Dann fallen
       zuerst „Noch offen“, Nährstoffe und „Geschafft“ weg, dann Gewohnheiten; Rhythmus und Checks bleiben */
    day.sort((a, b) => a.min - b.min);
    let last = -99;
    const fut = [];
    for (const x of day) {
      x.min = Math.max(x.min, last + 5);
      last = x.min;
      const at = pushAt(k, x.min);
      if (at > now + 60000) fut.push({ ...x, at });
    }
    while (fut.length > PUSH_CAP) {
      let wi = 0;
      fut.forEach((x, i) => { const a = PUSH_PRIO[x.cat] || 2, b = PUSH_PRIO[fut[wi].cat] || 2; if (a > b || (a === b && x.at >= fut[wi].at)) wi = i; });
      fut.splice(wi, 1);
    }
    for (const x of fut) out.push({ at: x.at, title: x.title, body: x.body.slice(0, 600), tag: x.tag, url: x.url, cat: x.cat });
  }
  return out.sort((a, b) => a.at - b.at).slice(0, 80);
}

/* ---------- Plan hochladen ---------- */
function pushSoon() {
  if (!pushOn()) return;
  clearTimeout(pushTimer);
  if (document.hidden) { pushSync(false, true); return; }
  pushTimer = setTimeout(() => pushSync(false), 20000);
}
function pushSync(force = false, keepalive = false) {
  if (!pushOn() || navigator.onLine === false) return Promise.resolve(null);
  if (pushBusy) { pushAgain = true; return pushBusy; }
  let items;
  try { items = pushPlan().map(({ at, title, body, tag, url }) => ({ at, title, body, tag, url })); } catch (e) { return Promise.resolve(null); }
  let ctx = null, week = null;
  try { ctx = briefCtx(); } catch (e) { ctx = null; }
  try { week = AIST && AIST.ai ? agentPayload() : null; } catch (e) { week = null; }
  const hash = pushHash(JSON.stringify([items, ctx, week]));
  if (!force && hash === PUSH.hash && PUSH.last && Date.now() - Date.parse(PUSH.last) < 6 * 3600000) return Promise.resolve(null);
  pushBusy = pushCall('schedule', { items, ctx, week }, { keepalive })
    .then((j) => { PUSH.hash = hash; PUSH.last = new Date().toISOString(); PUSH.n = j.n; PUSH.err = null; PUSH.errAt = null; return pushSave().then(() => j); })
    .catch((e) => { PUSH.err = e.message; PUSH.errAt = Date.now(); pushSave(); return null; })
    .finally(() => { pushBusy = null; if (pushAgain) { pushAgain = false; pushSoon(); } });
  return pushBusy;
}
/* Bei offener App: alle 30 Min. prüfen, ob sich der Plan geändert hat (z. B. nach Mitternacht) */
let pushChecked = 0;
function pushTick() { try { aiRefresh(); } catch (e) { /* egal */ } if (!pushOn() || Date.now() - pushChecked < 30 * 60000) return; pushChecked = Date.now(); pushSync(false); }
/* Klick auf eine Mitteilung: Bereich öffnen */
function pushNav(url) {
  const h = String(url || '').replace(/^#/, '');
  if (!h) return;
  closeSheet();
  if (h === 'rhythmus') { go('heute', { scrollTop: true }); sheetRhythm(todayKey()); return; }
  if (h.startsWith('hq-')) { const id = h.slice(3).replace(/-/g, '_'); go('heute', { scrollTop: true }); setTimeout(() => sheetHabitAsk(id, todayKey()), 50); return; }
  if (h === 'blutdruck') { A['bp-go'](); return; }
  if (h === 'zwick') { A['zw-open'](); return; }
  if (h === 'kraft') { ui.sub.knie = 'kraft'; go('knie', { scrollTop: true }); return; }
  if (h === 'schlaf') { go('heute', { scrollTop: true }); setTimeout(() => { const el = document.getElementById('schlaf-hilfe'); if (el) el.scrollIntoView({ block: 'start' }); }, 50); return; }
  if (h === 'todos') { ui.sub.knie = 'infos'; go('knie', { scrollTop: true }); return; }
  if (h === 'ern') { go('ern', { ernSub: 'uebersicht', date: todayKey(), scrollTop: true }); return; }
  if (areaById(h)) go(h, { date: todayKey(), scrollTop: true });
}
function pushInit() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'nav') pushNav(e.data.url); });
  navigator.serviceWorker.ready.then((r) => { pushReg = r; }).catch(() => {});
  if (location.hash && location.hash.length > 1) { const h = location.hash; history.replaceState(null, '', location.pathname + location.search); setTimeout(() => pushNav(h), 300); }
  setTimeout(() => { aiRefresh(true).finally(() => pushSync(false)); }, 2500);
}

/* ---------- Oberfläche ---------- */
function pushNext() { try { return pushPlan()[0] || null; } catch (e) { return null; } }
function pushCard() {
  const sup = pushSupport();
  if (!pushOn()) {
    return `<section class="card gar-card push-card"><div class="gar-head">${icon('bell')}<div><b>Mitteilungen einrichten</b><small>Erinnerungen an offene Posten, To-dos und deinen Tagesrhythmus, abends Nährstoff-Tipps und was du geschafft hast.</small></div></div>
      ${sup.ok ? '' : `<p class="hint">${icon('info')} ${esc(sup.why)}</p>`}
      <div class="sheet-acts"><button class="btn is-accent" data-a="push-setup">Einrichten</button></div></section>`;
  }
  const nx = pushNext();
  const info = PUSH.err ? '' : `${PUSH.last ? `Plan übertragen ${garWhen(PUSH.last)}` : 'Plan wird übertragen …'}${nx ? ` · nächste ${pushAtText(nx.at)}: ${nx.title}` : ''}`;
  return `<section class="card gar-card push-card${PUSH.err ? ' is-err' : ''}"><div class="gar-head">${icon('bell-ring')}<div><b>Mitteilungen an</b><small>${esc(info)}</small></div></div>
    ${PUSH.err ? `<p class="gar-err">${icon('triangle-alert')}<span>${esc(PUSH.err)}</span></p>` : ''}
    <div class="sheet-acts gar-acts"><button class="btn" data-a="push-test">${icon('send')}Test-Mitteilung</button><button class="btn is-ghost" data-a="push-setup">Einstellungen</button></div></section>`;
}
function pushAtText(at) { const d = new Date(at), k = dkey(d), t = minToTime(d.getHours() * 60 + d.getMinutes()); return k === todayKey() ? `um ${t}` : k === addDays(todayKey(), 1) ? `morgen ${t}` : `${fmtDate(k, { weekday: 'short' })} ${t}`; }
function pushCatsHTML() {
  const c = pushCats();
  return `<div class="list">${PUSH_CATS.map(([id, n, sub]) => `<button class="row-check${c[id] ? ' is-on' : ''}" data-a="push-cat" data-id="${id}" aria-pressed="${c[id]}"><span class="tgl-box">${icon('check')}</span><span><b>${esc(n)}</b><small>${esc(sub)}</small></span></button>`).join('')}</div>`;
}
function sheetPush() { ui.sheet = { type: 'push', err: null, busy: false, url: null, list: false, offAsk: false }; renderPushSheet(); }
function renderPushSheet() {
  const s = ui.sheet;
  if (!s || s.type !== 'push') return;
  const sup = pushSupport(), on = pushOn(), linked = !!(PUSH && PUSH.pub);
  const url = s.url != null ? s.url : PUSH ? PUSH.url : GAR && GAR.url ? GAR.url : '';
  let h = `<h3 class="sheet-title">Mitteilungen</h3>
    <p class="hint">Die App plant die Mitteilungen aus deinen Daten und gibt den Plan an deine eigene Weiterleitung bei Cloudflare. Die verschickt sie pünktlich – auch wenn die App zu ist. Öffnest du die App, rechnet sie den Plan neu.</p>`;
  if (!sup.ok) h += `<p class="gar-err">${icon('info')}<span>${esc(sup.why)}</span></p>`;
  if (!on) {
    h += `<ol class="steps gar-steps">
      <li><b>Weiterleitung auf Version 3</b> (dieselbe wie für Garmin): Cloudflare → „Workers &amp; Pages“ → dein Worker → „Edit code“, alles durch den neuen Protokoll-Code ersetzen → „Deploy“. Garmin läuft damit weiter wie bisher.
        <span class="gar-links"><button class="link-btn" data-a="gar-copy">${icon('copy')}Code kopieren</button><a class="link-btn" href="${PUSH_CF_WORKERS}" target="_blank" rel="noopener">${icon('external-link')}Cloudflare öffnen</a></span></li>
      <li><b>Speicher anlegen</b>: Cloudflare → „Storage &amp; Databases“ → „KV“ → „Create“, Name z. B. <code>protokoll-push</code>. Dann im Worker → „Settings“ → „Bindings“ → „Add“ → „KV namespace“: Variablenname <code>PUSH</code>, den Speicher wählen → „Deploy“. <a class="link-btn" href="${PUSH_CF_KV}" target="_blank" rel="noopener">${icon('external-link')}KV öffnen</a></li>
      <li><b>Zeitplan</b>: im Worker → „Settings“ → „Trigger Events“ → „Add“ → „Cron Triggers“ → „Every minute“ (<code>* * * * *</code>) → „Add“.</li>
      <li><b>Verbinden</b> tippen, danach <b>Erlauben</b> – das iPhone fragt, ob die App Mitteilungen schicken darf.</li>
    </ol>
    ${s.showCode ? `<textarea class="note gar-code" rows="6" readonly>${esc(GAR_RELAY_CODE)}</textarea>` : ''}
    <div class="form"><div class="frow is-wide"><span class="flabel">Adresse der Weiterleitung</span><div class="fin"><input type="url" id="push-url" value="${esc(url)}" placeholder="https://….workers.dev" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div></div>`;
  }
  if (s.err) h += `<p class="gar-err">${icon('triangle-alert')}<span>${esc(s.err)}</span></p>`;
  if (!on) {
    h += `<div class="sheet-acts"><button class="btn${linked ? '' : ' is-accent'}" data-a="push-connect"${s.busy ? ' disabled' : ''}>${s.busy === 'connect' ? 'Verbinde …' : linked ? 'Neu verbinden' : '1. Verbinden'}</button>
      <button class="btn${linked ? ' is-accent' : ''}" data-a="push-enable"${!linked || !sup.ok || s.busy ? ' disabled' : ''}>${s.busy === 'enable' ? 'Einen Moment …' : '2. Erlauben'}</button></div>
      ${linked ? `<p class="hint">${icon('check')} Weiterleitung verbunden. Jetzt „Erlauben“ tippen.</p>` : ''}`;
  }
  h += `<h5>Was gemeldet wird</h5>${pushCatsHTML()}`;
  if (on) {
    const list = s.list ? pushPlan().slice(0, 15) : [];
    h += `<div class="sheet-acts"><button class="btn" data-a="push-test">${icon('send')}Test-Mitteilung</button><button class="btn is-ghost" data-a="push-list">${icon('list')}${s.list ? 'Plan ausblenden' : 'Geplante ansehen'}</button><button class="btn is-danger" data-a="push-off">${icon('bell-off')}${s.offAsk ? 'Wirklich ausschalten?' : 'Ausschalten'}</button></div>`;
    if (s.list) h += list.length ? `<div class="list push-list">${list.map((x) => `<div class="row is-static"><span class="row-main"><b>${esc(x.title)}</b><small>${esc(pushAtText(x.at))}${x.body ? ' · ' + esc(x.body) : ''}</small></span></div>`).join('')}</div>` : '<p class="hint">Gerade nichts geplant.</p>';
  }
  h += `<p class="hint gar-hint">${icon('lock')} Adresse und Geräte-Schlüssel bleiben auf diesem Gerät, nicht im Backup. Die geplanten Texte liegen bis zum Verschicken in deinem Cloudflare-Speicher; unterwegs sind sie verschlüsselt, nur dein iPhone kann sie lesen. Stille Zeit: zwischen Schlafenszeit und Aufstehen kommt nichts.</p>`;
  openSheet(h);
}
function pushRerender() {
  const old = $('#sheet .sheet'), top = old ? old.scrollTop : 0;
  renderPushSheet();
  const n = $('#sheet .sheet'), b = $('#sheet .sheet-backdrop');
  if (b) b.style.animation = 'none';
  if (!n) return;
  n.classList.add('still');
  n.scrollTop = top;
  const e = n.querySelector('.gar-err, .gar-code');
  if (e) e.scrollIntoView({ block: 'nearest' });
}
function pushHintCard() {
  if (pushOn() || (S.settings.push && S.settings.push.hintOff) || !pushSupport().ok) return '';
  return `<div class="banner push-hint">${icon('bell')}<div><b>Neu: Mitteilungen</b><span>Erinnerungen an Offenes, deinen Tagesrhythmus und abends Nährstoff-Tipps – auch wenn die App zu ist.</span></div><div class="banner-acts"><button class="pill-btn is-accent" data-a="push-setup">Einrichten</button><button class="pill-btn" data-a="push-hint-off">Später</button></div></div>`;
}

Object.assign(SET_VIEWS, {
  push() { return pushCard() + `<h5>Was gemeldet wird</h5>${pushCatsHTML()}`; },
});
Object.assign(A, {
  'push-setup': () => sheetPush(),
  'push-hint-off': () => { S.settings.push = { ...(S.settings.push || {}), hintOff: true }; saveSettings(); },
  'push-cat': (el) => {
    const p = (S.settings.push = { ...(S.settings.push || {}) });
    p.cats = { ...pushCats(), [el.dataset.id]: !pushCats()[el.dataset.id] };
    markDirty('settings'); invalidate();
    if (ui.sheet && ui.sheet.type === 'push') pushRerender(); else render();
    pushSoon();
  },
  'push-connect': async () => {
    const s = ui.sheet;
    if (!s || s.type !== 'push' || s.busy) return;
    const u = $('#push-url');
    const url = ((u ? u.value : s.url) || '').trim().replace(/\/+$/, '');
    s.url = url;
    if (!/^https:\/\/[^\s/]+\.[^\s/]+$/.test(url)) { s.err = 'Bitte die Adresse der Weiterleitung eintragen (https://….workers.dev).'; pushRerender(); return; }
    s.busy = 'connect'; s.err = null; pushRerender();
    const old = PUSH;
    const key = old && old.url === url && old.key ? old.key : pushB64u(crypto.getRandomValues(new Uint8Array(32)));
    PUSH = { ...(old || {}), url, key, on: false };
    try {
      const j = await pushCall('setup', {});
      PUSH.pub = j.pub;
      await pushSave();
      s.busy = false; s.err = null;
    } catch (e) {
      PUSH = old;
      s.busy = false; s.err = e.message || 'Verbinden fehlgeschlagen';
    }
    pushRerender();
  },
  'push-enable': () => {
    const s = ui.sheet;
    if (!s || s.type !== 'push' || !PUSH || !PUSH.pub) return;
    const sup = pushSupport();
    if (!sup.ok) { s.err = sup.why; pushRerender(); return; }
    if (!pushReg) { s.err = 'Die App ist noch nicht fertig geladen. Gleich noch einmal tippen.'; pushRerender(); return; }
    let p;
    try { p = pushReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: pushB64uDec(PUSH.pub) }); } catch (e) { p = Promise.reject(e); } // direkt im Tipp, sonst fragt iOS nicht
    s.busy = 'enable'; s.err = null; pushRerender();
    p.then(async (sub) => {
      await pushCall('subscribe', { sub: sub.toJSON() });
      PUSH.on = true; PUSH.err = null; PUSH.hash = null;
      await pushSave();
      await pushSync(true);
      try { await pushCall('test', { body: 'Mitteilungen sind an. Die nächste kommt, wenn etwas ansteht.' }); } catch (e) { /* Test darf scheitern */ }
      if (ui.sheet === s) closeSheet();
      render();
      toast('Mitteilungen an');
    }).catch(async (e) => {
      let msg = e && e.message ? e.message : 'Einschalten fehlgeschlagen';
      if (e && (e.name === 'NotAllowedError' || (typeof Notification !== 'undefined' && Notification.permission === 'denied'))) msg = 'Mitteilungen sind für Protokoll nicht erlaubt. iPhone-Einstellungen → Mitteilungen → Protokoll → „Mitteilungen erlauben“, dann noch einmal tippen.';
      else if (e && e.name === 'InvalidStateError') { try { const old = await pushReg.pushManager.getSubscription(); if (old) await old.unsubscribe(); } catch (x) { /* egal */ } msg = 'Altes Abo entfernt – bitte noch einmal „Erlauben“ tippen.'; }
      if (ui.sheet === s) { s.busy = false; s.err = msg; pushRerender(); }
    });
  },
  'push-test': async () => {
    try { await pushSync(true); await pushCall('test', { body: 'Test: So sehen deine Mitteilungen aus.' }); toast('Test-Mitteilung geschickt'); } catch (e) { toast(e.message || 'Test fehlgeschlagen'); }
  },
  'push-list': () => { const s = ui.sheet; if (!s || s.type !== 'push') return; s.list = !s.list; pushRerender(); },
  'push-off': async () => {
    const s = ui.sheet;
    if (!s || s.type !== 'push') return;
    if (!s.offAsk) { s.offAsk = true; pushRerender(); return; }
    try { const sub = pushReg && (await pushReg.pushManager.getSubscription()); if (sub) await sub.unsubscribe(); } catch (e) { /* egal */ }
    try { await pushCall('off', {}); } catch (e) { /* Worker nicht erreichbar: Plan läuft höchstens noch aus */ }
    PUSH = PUSH ? { ...PUSH, on: false, hash: null, last: null, err: null } : null;
    await pushSave();
    closeSheet(); render();
    toast('Mitteilungen aus');
  },
});
