/* ============================================================
   SCHLAFRHYTHMUS (seit 2.9.0)
   Ein Zielfenster für alle Tage aus deinen Garmin-Nächten: Einschlafen und Aufwachen
   je ±15 Min. um den Median der letzten 14 Nächte. Schläfst du im Schnitt kürzer als
   dein Schlafbedarf, zieht das Fenster das Einschlafen um bis zu 30 Min. vor (wandert
   so mit jeder Nacht ein Stück). Das Fenster steuert den Tagesrhythmus (Schlafenszeit,
   Koffein-Stopp, Bildschirm-Pause, Mitteilungen); ein eingestelltes „Morgen raus“ geht vor.
   Hintergrund: Regelmäßige Schlafzeiten hängen in großen Studien enger mit Gesundheit
   zusammen als die Schlafdauer allein (UK Biobank, Windred 2024).
   ============================================================ */
/*icons: moon sunrise bed clock waves brain dumbbell alarm-clock check*/
const RH_WIN = 15, RH_NIGHTS = 14, RH_MIN = 4, RH_PULL = 30;

/* Nacht, die am Morgen des Tages k endet (Garmin speichert sie beim Aufwach-Tag) */
function rhNight(k) {
  const d = peekDay(k);
  if (!d || !d.health || !d.health.bedTime) return null;
  const bed = timeVal(d.health.bedTime, true), wake = rhWakeOf(d);
  if (bed == null || wake == null || bed < 18 * 60 || bed > 28 * 60) return null; // 18:00 bis 04:00
  const dur = wake + 1440 - bed;
  if (dur < 180 || dur > 780) return null;
  return { k, bed, wake, dur };
}
const rh5 = (m) => Math.round(m / 5) * 5;
function rhWindow(k = todayKey()) {
  const c = rhWindow.c || (rhWindow.c = { v: -1, m: new Map() });
  if (c.v !== calcVersion) { c.v = calcVersion; c.m.clear(); }
  const end = k > todayKey() ? todayKey() : k;
  if (c.m.has(end)) return c.m.get(end);
  const nights = [];
  for (let i = 0; i < 28 && nights.length < RH_NIGHTS; i++) { const n = rhNight(addDays(end, -i)); if (n) nights.push(n); }
  let w = null;
  if (nights.length >= RH_MIN) {
    const medBed = rhMedian(nights.map((n) => n.bed)), medWake = rhMedian(nights.map((n) => n.wake));
    const needs = nights.map((n) => rhNeed((peekDay(n.k).health || {}).sleepNeed)).filter((v) => v != null);
    const need = needs.length ? Math.round(rhMedian(needs)) : 480;
    const want = medWake + 1440 - need; // so früh müsstest du einschlafen, um deinen Bedarf zu schaffen
    const pull = want < medBed - 5 ? Math.min(RH_PULL, medBed - want) : 0;
    const onset = rh5(medBed - pull), wake = rh5(medWake);
    const recent = nights.filter((n) => daysBetween(n.k, end) < 7);
    const dev = (a, m) => Math.round(mean(a.map((x) => Math.abs(x - m))));
    const inBed = (n) => Math.abs(n.bed - onset) <= RH_WIN, inWake = (n) => Math.abs(n.wake - wake) <= RH_WIN;
    w = {
      onset, wake, bed: onset - 15, need, pull, n: nights.length, nights,
      medBed: Math.round(medBed), medWake: Math.round(medWake), medDur: Math.round(rhMedian(nights.map((n) => n.dur))),
      mid: Math.round((medBed + medWake + 1440) / 2) % 1440,
      devBed: dev(nights.map((n) => n.bed), medBed), devWake: dev(nights.map((n) => n.wake), medWake),
      recent, hit: recent.filter((n) => inBed(n) && inWake(n)).length, inBed, inWake,
    };
  }
  c.m.set(end, w);
  return w;
}
/* Lag die Nacht nach Tag k im Fenster? (für Wochenziele: 1 = ja, 0 = nein) */
function rhNightIn(k) {
  const n = rhNight(addDays(k, 1)), w = rhWindow(k);
  if (!n || !w) return null;
  return w.inBed(n) && w.inWake(n) ? 1 : 0;
}
function rhRange(m) { return `${minToTime((m - RH_WIN + 2880) % 1440)}–${minToTime((m + RH_WIN) % 1440)}`; }
function rhDiff(v, t) { const x = Math.round(v - t); return Math.abs(x) <= RH_WIN ? '' : `${x > 0 ? '+' : '−'}${fmtDur(Math.abs(x))}`; }

/* Karte unter Garmin & Schlaf: Fenster, die letzten 7 Nächte als Balken, Regelmäßigkeit */
function rhCard(k = todayKey()) {
  const w = rhWindow(k);
  if (!w) {
    const n = Array.from({ length: 28 }, (_, i) => rhNight(addDays(k, -i))).filter(Boolean).length;
    return `<section class="sec rh-card"><div class="sec-head"><h2>Schlafrhythmus</h2></div><p class="sec-sub">Ab ${RH_MIN} Nächten mit Einschlaf- und Aufwachzeit (von Garmin oder selbst eingetragen) rechnet die App dein Zielfenster: einschlafen und aufstehen jeden Tag zur gleichen Zeit, je ±${RH_WIN} Min. Bisher ${n} ${n === 1 ? 'Nacht' : 'Nächte'}.</p></section>`;
  }
  /* Balken: Achse 20:00 bis 12:00 (16 Std.) */
  const A0 = 20 * 60, AL = 16 * 60, pos = (m) => clamp(((m - A0) / AL) * 100, 0, 100);
  const band = (m) => `<i class="rh-band" style="left:${pos(m - RH_WIN)}%;width:${pos(m + RH_WIN) - pos(m - RH_WIN)}%"></i>`;
  const rows = [];
  for (let i = 6; i >= 0; i--) {
    const x = addDays(k > todayKey() ? todayKey() : k, -i), n = rhNight(x);
    const lab = fmtDate(x, { weekday: 'short', day: 'numeric' }).replace('.,', '');
    if (!n) { rows.push(`<div class="rh-row is-empty"><span class="rh-d">${esc(lab)}</span><div class="rh-bar">${band(w.onset)}${band(w.wake + 1440)}</div><span class="rh-t">–</span></div>`); continue; }
    const ok = w.inBed(n) && w.inWake(n);
    const db = rhDiff(n.bed, w.onset), dw = rhDiff(n.wake, w.wake);
    rows.push(`<div class="rh-row${ok ? ' is-ok' : ''}"><span class="rh-d">${esc(lab)}</span><div class="rh-bar">${band(w.onset)}${band(w.wake + 1440)}<i class="rh-sleep" style="left:${pos(n.bed)}%;width:${pos(n.wake + 1440) - pos(n.bed)}%"></i></div><span class="rh-t">${minToTime(n.bed % 1440)}–${minToTime(n.wake)}${db || dw ? `<small>${[db ? 'ein ' + db : '', dw ? 'auf ' + dw : ''].filter(Boolean).join(' · ')}</small>` : `<small class="is-ok">${icon('check')}im Fenster</small>`}</span></div>`);
  }
  const reg = Math.max(w.devBed, w.devWake);
  const regTxt = reg <= 20 ? 'sehr regelmäßig' : reg <= 40 ? 'ziemlich regelmäßig' : reg <= 60 ? 'schwankt merklich' : 'schwankt stark';
  const tip = w.pull ? `Deine Nächte sind im Schnitt kürzer (${fmtDur(w.medDur)}) als dein Schlafbedarf (${fmtDur(w.need)}). Das Fenster zieht dein Einschlafen deshalb um ${w.pull} Min. vor und wandert mit jeder Nacht weiter, bis es passt.`
    : reg > 40 ? 'Am meisten bringt jetzt, das Aufstehen festzuhalten – auch nach einer späten Nacht. Morgenlicht direkt danach verankert die innere Uhr.'
      : 'Halte das Fenster auch an freien Tagen; höchstens eine Stunde Abweichung, dann bleibt die innere Uhr stabil.';
  return `<section class="sec rh-card" id="rhythmus-card"><div class="sec-head"><h2>Schlafrhythmus</h2><span class="count">${w.n} Nächte</span></div>
    <div class="rh-win"><div><span>${icon('moon')}Einschlafen</span><b>${minToTime(w.onset % 1440)}</b><small>${rhRange(w.onset)}</small></div><div><span>${icon('sunrise')}Aufstehen</span><b>${minToTime(w.wake)}</b><small>${rhRange(w.wake)}</small></div><div><span>${icon('bed')}Ins Bett</span><b>${minToTime(w.bed % 1440)}</b><small>15 Min. vorher</small></div></div>
    <div class="rh-chart"><div class="rh-axis"><span>20</span><span>24</span><span>4</span><span>8</span><span>12</span></div>${rows.join('')}</div>
    ${sleepAcctHTML(k)}
    <p class="rh-stat"><b>${w.hit} von ${w.recent.length}</b> Nächten der letzten 7 Tage im Fenster · Schwankung Einschlafen ±${w.devBed} Min., Aufwachen ±${w.devWake} Min. (${regTxt}) · Schlafmitte ${minToTime(w.mid)}</p>
    <p class="hint">${esc(tip)}</p>
    <p class="hint">Das Fenster kommt aus deinen letzten ${w.n} Nächten (Median) und passt sich langsam an. Danach richten sich Schlafenszeit, Koffein-Stopp, Bildschirm-Pause und die Abend-Mitteilungen. Musst du an einem Tag früher raus, stell es auf Heute unter „Ändern“ ein – das geht vor.</p></section>`;
}

/* ============================================================
   SCHLAFKONTO (seit 2.10.0)
   Schlaf minus Bedarf über die letzten 7 Nächte (Nickerchen zählen mit). Bedarf = Median des
   Garmin-Schlafbedarfs (14 Nächte), weil Garmin den Tagesbedarf nach kurzen Nächten selbst erhöht.
   Fehlt Schlaf, verschiebt die App die Schlafenszeit am Abend nach vorn (Aufstehen bleibt fest),
   höchstens settings.sleep.recMax (Standard 90 Min., bis 3 Std. einstellbar); der Rest wird über die
   nächsten Abende ausgeglichen. Dazu Vorschläge für den Tag: Nickerchen, NSDR, Meditation.
   ============================================================ */
function sleepBaseNeed(k) {
  const w = rhWindow(k);
  if (w) return w.need;
  const ns = [];
  for (let i = 0; i < 14; i++) { const v = rhNeed(((peekDay(addDays(k, -i)) || {}).health || {}).sleepNeed); if (v != null) ns.push(v); }
  return ns.length ? Math.round(rhMedian(ns)) : 480;
}
function sleepNap(d) { const n = Number(d && d.hd && d.hd.nap); return n > 0 ? n : 0; }
function sleepAcct(k = todayKey()) {
  const c = sleepAcct.c || (sleepAcct.c = { v: -1, m: new Map() });
  if (c.v !== calcVersion) { c.v = calcVersion; c.m.clear(); }
  const end = k > todayKey() ? todayKey() : k;
  if (c.m.has(end)) return c.m.get(end);
  const need = sleepBaseNeed(end), nights = [];
  for (let i = 0; i < 7; i++) {
    const x = addDays(end, -i), d = peekDay(x), dur = Number(d && d.health && d.health.sleepDur);
    if (!(dur > 60)) continue;
    const nap = sleepNap(peekDay(addDays(x, -1))); // Nickerchen am Vortag gehört zu dieser Bilanz
    nights.push({ k: x, dur, nap, diff: dur + nap - need });
  }
  const last = nights[0] && nights[0].k === end ? nights[0] : null;
  const napToday = sleepNap(peekDay(end));
  const acc = nights.length ? nights.reduce((a, n) => a + n.diff, 0) + napToday : null;
  const debt = acc != null ? Math.max(0, -acc) : 0;
  const rm = S.settings.sleep ? S.settings.sleep.recMax : null, cap = clamp(rm == null || !isFinite(Number(rm)) ? 90 : Number(rm), 0, 180);
  const rec = debt >= 20 ? Math.min(cap, rh5(debt)) : 0;
  const d0 = peekDay(end), score = d0 && d0.health ? Number(d0.health.sleepScore) : NaN;
  const bad = !!last && (last.diff <= -45 || (isFinite(score) && score < 60));
  const r = { need, nights, last, acc, debt, rec, cap, bad, score: isFinite(score) ? score : null, napToday };
  c.m.set(end, r);
  return r;
}
/* Nickerchen-Fenster: frühestens 6 Std. nach dem Aufwachen (nicht vor 12:30), spätestens 7½ Std. vor dem Schlafen */
function napWindow(k = todayKey()) {
  const r = rhythm(k);
  const a = Math.max(12 * 60 + 30, r.wake + 360), b = Math.min(15 * 60 + 30, r.bed - 450);
  return b - a >= 30 ? [rh5(a), rh5(b)] : null;
}
function sleepHelpTips(k = todayKey()) {
  const a = sleepAcct(k), r = rhythm(k), nw = napWindow(k), d = peekDay(k) || {};
  const rd = typeof readinessOf === 'function' ? readinessOf(k) : null;
  const tips = [];
  if (a.rec) tips.push({ id: 'bett', ic: 'bed', t: `Heute früher ins Bett: ${minToTime(r.bed)}`, s: `${fmtDur(a.rec)} früher als sonst, dein Aufstehen bleibt gleich.${a.debt > a.rec ? ` Den Rest (${fmtDur(a.debt - a.rec)}) gleichst du an den nächsten Abenden aus.` : ''}`, ev: 'Feste Aufstehzeit schützt die innere Uhr (Regelmäßigkeit, UK Biobank).' });
  if (nw) tips.push({ id: 'nap', ic: 'moon', t: `Nickerchen 10–20 Min. zwischen ${minToTime(nw[0])} und ${minToTime(nw[1])}`, s: 'Kurz halten (unter 30 Min.), sonst wachst du aus dem Tiefschlaf auf und bist träger. Wecker auf 20 Min. Wenn du Zeit hast, geht auch ein ganzer Zyklus (~90 Min.) früh im Fenster.', ev: 'Meta-Analyse: kurze Nickerchen verbessern Wachheit und Leistung (Dutheil 2021, mittel belegt).', nap: true });
  tips.push({ id: 'nsdr', ic: 'waves', t: 'NSDR oder Yoga Nidra 10–20 Min.', s: 'Wenn kein Nickerchen geht: liegen, Augen zu, geführte Aufnahme. Hilft gegen Müdigkeit, auch ohne einzuschlafen.', ev: 'Kleine Studien, Huberman-Protokoll 8 (schwach bis mittel belegt).', habit: 'nsdr' });
  tips.push({ id: 'med', ic: 'brain', t: 'Meditation 13 Min.', s: 'Hilft Fokus und Stimmung an müden Tagen.', ev: '13 Min. täglich über 8 Wochen verbesserten Aufmerksamkeit und Stimmung (Basso 2019, mittel belegt).', habit: 'meditation' });
  tips.push({ id: 'licht', ic: 'sunrise', t: 'Morgenlicht und Koffein wie gewohnt', s: `Raus ins Tageslicht, Koffein ab ${minToTime(cafStart(k))} (90-Minuten-Regel). Kein Extra-Koffein am Nachmittag – das kostet die Erholung heute Nacht.`, ev: 'Licht stellt die innere Uhr; spätes Koffein verkürzt den Schlaf (Gardiner 2023).' });
  if (rd && rd.score != null && rd.score < 50) tips.push({ id: 'train', ic: 'dumbbell', t: 'Training leichter halten', s: `Bereitschaft ${fmt(rd.score)}: Technik, weniger Sätze oder locker Cardio statt Rekordversuche.`, ev: 'Nach Schlafmangel sinken Kraft und Ausdauer messbar.' });
  tips.push({ id: 'morgen', ic: 'alarm-clock', t: 'Morgen nicht ausschlafen', s: `Steh zur gewohnten Zeit auf (${rhWindow(k) ? rhRange(rhWindow(k).wake) : minToTime(r.wakeNext ?? r.wake)}). Ausschlafen verschiebt die innere Uhr und macht die nächste Nacht schwerer.`, ev: 'Regelmäßige Zeiten sind wichtiger als einzelne lange Nächte.' });
  return tips.filter((t) => !(t.habit && d.habits && d.habits[t.habit]));
}
function sleepHelpCard(k = todayKey(), always = false) {
  const a = sleepAcct(k);
  if (!a.last && !always) return '';
  if (!a.bad && !a.rec && !always) return '';
  const d = peekDay(k) || {}, nap = sleepNap(d);
  const head = a.last ? `${fmtDur(a.last.dur)} geschlafen${a.last.diff < 0 ? ` (${fmtDur(-a.last.diff)} unter Bedarf)` : ''}` : 'Schlafkonto';
  const tips = sleepHelpTips(k);
  return `<section class="card sleep-help" id="schlaf-hilfe"><div class="sec-head"><h2>${a.bad ? 'Kurze Nacht – so gleichst du aus' : 'Schlafkonto'}</h2></div>
    <p class="sec-sub">${esc(head)} · Konto 7 Tage: ${a.acc == null ? '–' : `${a.acc < 0 ? '−' : '+'}${fmtDur(Math.abs(a.acc))}`}${a.score != null ? ` · Sleep Score ${fmt(a.score)}` : ''}</p>
    <div class="sh-list">${tips.map((t) => `<div class="sh-tip"><span class="sh-ic">${icon(t.ic)}</span><div><b>${esc(t.t)}</b><small>${esc(t.s)}</small><small class="sh-ev">${esc(t.ev)}</small>${t.nap ? `<div class="chips chips-tight">${[10, 20, 30, 90].map((m) => `<button class="chip chip-xs${nap === m ? ' is-on' : ''}" data-a="nap-log" data-v="${m}" data-date="${k}">${m} Min. geschlafen</button>`).join('')}</div>` : ''}${t.habit ? `<button class="pill-btn sm" data-a="habit" data-id="${t.habit}" data-date="${k}">${icon('check')}Gemacht</button>` : ''}</div></div>`).join('')}</div>
    <p class="hint">Ausgleich bis ${fmtDur(a.cap)} pro Abend (${goBtn('garmin', 'ändern', '', 'link-btn inline')} unter Garmin & Schlaf → Schlafrhythmus).</p></section>`;
}
function sleepAcctHTML(k) {
  const a = sleepAcct(k);
  if (!a.nights.length) return '';
  const bars = a.nights.slice().reverse().map((n) => { const h = clamp(Math.abs(n.diff) / 120, 0.05, 1) * 26; return `<i class="${n.diff < 0 ? 'neg' : 'pos'}" style="height:${h}px" title="${esc(shortDate(n.k))}: ${n.diff < 0 ? '−' : '+'}${fmtDur(Math.abs(n.diff))}"></i>`; }).join('');
  return `<div class="sacct"><div class="sacct-bars">${bars}</div><div><b>Schlafkonto 7 Tage: ${a.acc < 0 ? '−' : '+'}${fmtDur(Math.abs(a.acc))}</b><small>Bedarf ${fmtDur(a.need)} pro Nacht${a.rec ? ` · heute ${fmtDur(a.rec)} früher ins Bett` : ''}</small></div></div>
    <div class="chips chips-tight"><span class="hint">Ausgleich höchstens pro Abend:</span>${[0, 30, 60, 90, 120, 180].map((m) => `<button class="chip chip-xs${a.cap === m ? ' is-on' : ''}" data-a="sleep-recmax" data-v="${m}">${m ? fmtDur(m) : 'aus'}</button>`).join('')}</div>`;
}
Object.assign(A, {
  'nap-log': (el) => { const k = curDate(el), m = Number(el.dataset.v); mutDay(k, (d) => { d.hd = d.hd || {}; if (d.hd.nap === m) delete d.hd.nap; else d.hd.nap = m; }); render(); },
  'sleep-recmax': (el) => { S.settings.sleep = { ...(S.settings.sleep || {}), recMax: Number(el.dataset.v) }; saveSettings(); toast(Number(el.dataset.v) > 120 ? 'Hinweis: Mehr als 2 Std. früher fällt oft in die Zeit, in der der Körper besonders wach ist – dann liegst du wach.' : 'Gespeichert'); },
});
