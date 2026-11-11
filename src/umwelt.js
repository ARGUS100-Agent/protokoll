/* ============================================================
   SONNE, UV, VITAMIN D und ZAHL AM APP-SYMBOL (seit 2.10.0)
   Open-Meteo (kostenlos, ohne Schlüssel): Sonnenaufgang, -untergang und UV-Index für 7 Tage.
   Dafür einmal der Ort (auf 2 Nachkommastellen gerundet, bleibt auf dem Gerät).
   Morgenlicht-Erinnerung erst ab Sonnenaufgang; Hinweise zu UV und Vitamin D im Winter.
   Zahl am App-Symbol: offene, fällige Dinge (Badging API, iOS 16.4+ mit erlaubten Mitteilungen).
   ============================================================ */
/*icons: map-pin sun sunrise sunset*/
function geoOn() { const g = S.settings.geo; return !!(g && isFinite(g.lat) && isFinite(g.lon)); }
function wxDay(k) { const w = S.settings.wx; return w && w.days ? w.days[k] || null : null; }
let wxBusy = null;
function wxFetch(force = false) {
  if (!geoOn() || wxBusy) return wxBusy;
  const w = S.settings.wx;
  if (!force && w && w.at && Date.now() - w.at < 6 * 3600000 && wxDay(todayKey())) return null;
  const g = S.settings.geo;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}&daily=sunrise,sunset,uv_index_max&timezone=Europe%2FBerlin&forecast_days=7`;
  wxBusy = fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error('Open-Meteo ' + r.status)))).then((j) => {
    const d = j.daily || {}, days = {};
    (d.time || []).forEach((k, i) => { days[k] = { sunrise: timeToMin(String(d.sunrise[i] || '').slice(11, 16)), sunset: timeToMin(String(d.sunset[i] || '').slice(11, 16)), uv: d.uv_index_max ? Number(d.uv_index_max[i]) : null }; });
    S.settings.wx = { at: Date.now(), days };
    markDirty('settings'); invalidate();
    if (!ui.sheet) render();
  }).catch(() => {}).finally(() => { wxBusy = null; });
  return wxBusy;
}
function geoSet() {
  if (!navigator.geolocation) { toast('Standort ist auf diesem Gerät nicht verfügbar'); return; }
  navigator.geolocation.getCurrentPosition((p) => {
    S.settings.geo = { lat: Math.round(p.coords.latitude * 100) / 100, lon: Math.round(p.coords.longitude * 100) / 100 };
    saveSettings(); wxFetch(true); toast('Ort gespeichert (gerundet, nur auf diesem Gerät)');
  }, () => toast('Kein Zugriff auf den Standort – in den iPhone-Einstellungen erlauben'), { enableHighAccuracy: false, timeout: 15000, maximumAge: 86400000 });
}
function winterD(k) { const m = Number(k.slice(5, 7)); return m >= 10 || m <= 3; }
/* Morgenlicht frühestens 10 Min. nach Sonnenaufgang */
function lightAt(k) { const r = rhythm(k), w = wxDay(k); return Math.max(r.wake + 30, w && w.sunrise != null ? w.sunrise + 10 : 0); }
function sunHTML(k) {
  if (!geoOn()) return `<div class="banner">${icon('map-pin')}<div><b>Sonnenaufgang und UV-Index</b><span>Mit deinem Ort (gerundet, bleibt auf dem Gerät) kommt die Morgenlicht-Erinnerung erst, wenn die Sonne aufgegangen ist, dazu UV- und Vitamin-D-Hinweise.</span></div><button class="pill-btn sm" data-a="geo-set">Ort festlegen</button></div>`;
  const w = wxDay(k), r = rhythm(k);
  if (!w) return '';
  const tips = [];
  if (w.sunrise != null && r.wake < w.sunrise) tips.push(`Du bist vor Sonnenaufgang wach: drinnen helles Licht an, raus ab ${minToTime(w.sunrise + 10)}. Bewölkt draußen ist immer noch heller als drinnen.`);
  if (w.uv != null && w.uv >= 3) tips.push(`UV-Index ${fmt(w.uv, 1)}: Gesicht mit Sonnenschutz (passt zum Haut-Protokoll), Morgenlicht trotzdem ohne Sonnenbrille.`);
  if (winterD(k)) tips.push('Oktober bis März bildet die Haut in Deutschland praktisch kein Vitamin D – D3 weiter nehmen; ein Bluttest (25-OH-D) zeigt, ob die Dosis passt.');
  return `<div class="sun-row"><span>${icon('sunrise')}${w.sunrise != null ? minToTime(w.sunrise) : '–'}</span><span>${icon('sunset')}${w.sunset != null ? minToTime(w.sunset) : '–'}</span><span>${icon('sun')}UV ${w.uv != null ? fmt(w.uv, 1) : '–'}</span></div>${tips.map((t) => `<p class="hint">${esc(t)}</p>`).join('')}`;
}
Object.assign(A, { 'geo-set': () => geoSet() });
/* Zahl am App-Symbol: fällige offene Routine-Schritte, Posten und To-dos */
function badgeCount(k = todayKey()) {
  const now = nowMin(), d = peekDay(k) || blankDay(k), variant = dayVariant(k);
  let n = 0;
  for (const p of ['am', 'day', 'pm']) for (const s of routineSteps(p, k)) if (!s.info && !s.done && !s.no && s.t != null && s.t <= now) n++;
  for (const b of S.settings.plan) { const t = resolveBlockTime(b, d); if (t != null && t + 45 <= now && b.items.some((it) => !it.opt && itemInVariant(it, variant) && !(d.checks || {})[it.id])) n++; }
  n += todosOpen().filter((t) => t.date && t.date <= k).length;
  return n;
}
let badgeLast = -1;
function badgeSync() {
  if (!('setAppBadge' in navigator)) return;
  let n = 0;
  try { n = badgeCount(); } catch (e) { return; }
  if (n === badgeLast) return;
  badgeLast = n;
  try { (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {}); } catch (e) { /* egal */ }
}
