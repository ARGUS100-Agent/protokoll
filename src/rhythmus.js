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
/*icons: moon sunrise bed clock*/
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
    <p class="rh-stat"><b>${w.hit} von ${w.recent.length}</b> Nächten der letzten 7 Tage im Fenster · Schwankung Einschlafen ±${w.devBed} Min., Aufwachen ±${w.devWake} Min. (${regTxt}) · Schlafmitte ${minToTime(w.mid)}</p>
    <p class="hint">${esc(tip)}</p>
    <p class="hint">Das Fenster kommt aus deinen letzten ${w.n} Nächten (Median) und passt sich langsam an. Danach richten sich Schlafenszeit, Koffein-Stopp, Bildschirm-Pause und die Abend-Mitteilungen. Musst du an einem Tag früher raus, stell es auf Heute unter „Ändern“ ein – das geht vor.</p></section>`;
}
