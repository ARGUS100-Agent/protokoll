/* ============================================================
   GARMIN CONNECT – Werte automatisch über die Garmin Personal API
   Garmin lässt Web-Apps nicht direkt an die Daten (CORS). Die Abfrage läuft
   deshalb über die eigene Weiterleitung (relay/garmin-relay.js, Cloudflare).
   Schlüssel, Zugang und Adresse liegen nur auf diesem Gerät (Eintrag „garmin“),
   nicht im Backup und nicht im Code.
   ============================================================ */
/*icons: watch refresh-cw unplug copy external-link lock history triangle-alert */

const GAR_RELAY_CODE = '__RELAY_CODE__'; // build.py setzt hier relay/garmin-relay.js ein
const GAR_KEY_URL = 'https://connect.garmin.com/app/settings/personalApiToken';
const GAR_CF_URL = 'https://dash.cloudflare.com/sign-up';
const GAR_CODE_URL = 'https://github.com/ARGUS100-Agent/protokoll/blob/main/relay/garmin-relay.js';
const GAR_TOKEN = '/personalapitoken-service/personal-api/personal-api-key/token';
const GAR_EVERY = 30 * 60000; // automatisch höchstens alle 30 Minuten
const GAR_RETRY = 10 * 60000; // nach einem Fehler frühestens nach 10 Minuten
const GAR_FIRST = 14; // beim ersten Abruf: 14 Tage
const GAR_MAX = 30; // höchstens 30 Tage auf einmal
const GAR_HRV = { BALANCED: 'Ausgeglichen', UNBALANCED: 'Unausgeglichen', LOW: 'Niedrig', POOR: 'Schlecht' };
/* Garmin-Aktivitätstyp → Trainingsart der App (null = nicht übernehmen) */
const GAR_TYPES = [
  [/meditation|breath/, null],
  [/run|jog/, 'Laufen'],
  [/cycl|bik|ride|spin/, 'Rad'],
  [/swim/, 'Schwimmen'],
  [/strength|weight_lift/, 'Gym (frei)'],
  [/hiit|interval|tabata|bootcamp/, 'HIIT'],
  [/yoga|pilates|mobility|stretch|flexib/, 'Mobility'],
  [/walk|hik/, 'Spaziergang'],
  [/jiu|bjj|grappl|wrestl|judo|mixed_martial|martial_art|mma/, 'BJJ'],
  [/indoor_climb|bouldering|rock_climb|mountaineer/, 'Sport'],
  [/cardio|elliptical|stair|row|ski_erg|jump_rope|fitness_equipment/, 'Cardio'],
  [/tennis|padel|squash|badminton|pickleball|soccer|football|basketball|volleyball|golf|boxing|martial|mma|ski|snowboard|skat|surf|paddl|kayak|climb|sport/, 'Sport'],
];

let GAR = null; // { url, key, token, exp, last, lastDay, err, errAt, warn, sum }
let garBusy = null;
function garOn() { return !!(GAR && GAR.url && GAR.key); }
function garLoad(all) { const g = all && all.garmin; GAR = g && typeof g === 'object' && g.url && g.key ? g : null; }
function garSave() { return DB.putMany([['garmin', GAR ? { ...GAR } : undefined]]); }

/* ---------- Verbindung ---------- */
function garErr(kind, msg, fatal = true) { const e = new Error(msg); e.kind = kind; e.fatal = fatal; return e; }
function garHttpErr(status, txt, isToken) {
  const t = String(txt || '');
  if (/^Weiterleitung: Pfad nicht erlaubt/.test(t) && !isToken) return garErr('relayPath', 'Weiterleitung veraltet', false);
  if (/^Weiterleitung:/.test(t)) return garErr('relay', t.replace(/^Weiterleitung:\s*/, 'Weiterleitung lehnt ab: ') + '. Ist dort der aktuelle Protokoll-Code gespeichert?');
  if (isToken && status >= 400 && status < 500) return garErr('key', 'Garmin lehnt den Schlüssel ab – abgelaufen oder gelöscht? Neuen Schlüssel in Garmin Connect erstellen und hier eintragen.');
  if (isToken) return garErr('garmin', `Garmin hat die Anmeldung nicht angenommen (Status ${status}). Schlüssel prüfen oder später noch einmal versuchen.`);
  if (status === 401 || status === 403) return garErr('key', `Garmin verweigert den Zugriff (Status ${status}). Schlüssel neu eintragen.`);
  if (status === 429) return garErr('garmin', 'Garmin bremst gerade (zu viele Abrufe). Später noch einmal.');
  return garErr('garmin', `Garmin antwortet nicht wie erwartet (Status ${status}).`, false);
}
async function garFetch(url, opt = {}) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const tm = setTimeout(() => { if (ctl) ctl.abort(); }, opt.timeout || 25000);
  try {
    return await fetch(url, { method: opt.method || 'GET', headers: opt.headers || {}, cache: 'no-store', credentials: 'omit', signal: ctl ? ctl.signal : undefined });
  } catch (e) {
    throw garErr('net', navigator.onLine === false ? 'Kein Internet – Garmin wird später abgerufen.' : 'Weiterleitung nicht erreichbar. Adresse prüfen – und ob dort der Protokoll-Code gespeichert ist (Deploy).');
  } finally { clearTimeout(tm); }
}
function garJwtExp(t) {
  try { const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return p && p.exp ? p.exp * 1000 : null; } catch (e) { return null; }
}
async function garToken(force) {
  if (!force && GAR.token && GAR.exp && GAR.exp - Date.now() > 3600000) return GAR.token;
  const res = await garFetch(GAR.url + GAR_TOKEN, { method: 'POST', headers: { Authorization: 'ApiKey ' + GAR.key, Accept: '*/*' } });
  const txt = (await res.text()).trim();
  if (!res.ok) throw garHttpErr(res.status, txt, true);
  let tok = txt;
  if (tok.startsWith('{')) { try { const j = JSON.parse(tok); tok = j.access_token || j.accessToken || j.token || ''; } catch (e) { tok = ''; } }
  tok = String(tok).replace(/^"+|"+$/g, '').trim();
  if (tok.length < 20 || /\s/.test(tok)) throw garErr('garmin', 'Garmin hat keinen gültigen Zugang geliefert.');
  GAR.token = tok;
  GAR.exp = garJwtExp(tok) || Date.now() + 23 * 3600000;
  await garSave();
  return tok;
}
async function garGet(path) {
  let tok = await garToken();
  let res = await garFetch(GAR.url + path, { headers: { Authorization: 'Bearer ' + tok, Accept: 'application/json' } });
  if (res.status === 401) { tok = await garToken(true); res = await garFetch(GAR.url + path, { headers: { Authorization: 'Bearer ' + tok, Accept: 'application/json' } }); }
  const txt = res.status === 204 ? '' : await res.text();
  if (res.status === 404 && !/^Weiterleitung:/.test(txt)) return null;
  if (!res.ok) throw garHttpErr(res.status, txt, false);
  if (!txt.trim()) return null;
  try { return JSON.parse(txt); } catch (e) { throw garErr('garmin', 'Garmin hat keine lesbaren Daten geschickt.', false); }
}
async function garCheckRelay(url) {
  let res;
  try { res = await fetch(url + '/', { cache: 'no-store', credentials: 'omit' }); } catch (e) {
    throw garErr('net', navigator.onLine === false ? 'Kein Internet.' : 'Weiterleitung nicht erreichbar. Adresse prüfen. Zeigt sie im Browser noch „Hello World!“? Dann den Protokoll-Code einfügen und auf Deploy tippen.');
  }
  const txt = await res.text();
  if (!res.ok || !/Protokoll-Weiterleitung/.test(txt)) throw garErr('relay', 'Unter dieser Adresse läuft nicht die Protokoll-Weiterleitung. Code einfügen und auf Deploy tippen.');
}

/* ---------- Antworten lesen (Garmin-Formate tolerant) ---------- */
function gNum(v) { const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v; return typeof n === 'number' && Number.isFinite(n) ? n : null; }
function gVal(o, keys, depth = 0) { // ersten Wert zu einem der Schlüssel suchen, auch verschachtelt (ohne Listen)
  if (!o || typeof o !== 'object' || Array.isArray(o) || depth > 5) return undefined;
  for (const k of keys) { const v = o[k]; if (v != null && typeof v !== 'object') return v; }
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) { const r = gVal(v, keys, depth + 1); if (r !== undefined) return r; }
  }
  return undefined;
}
function gObj(o, key, depth = 0) { // verschachteltes Objekt oder Liste zu einem Schlüssel suchen
  if (!o || typeof o !== 'object' || Array.isArray(o) || depth > 5) return null;
  if (o[key] && typeof o[key] === 'object') return o[key];
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) { const r = gObj(v, key, depth + 1); if (r) return r; }
  }
  return null;
}
function gList(o, depth = 0) { // Liste von Tagesobjekten: [...], {data: [...]}, {hrvSummaries: [...]} …
  const isRec = (x) => x && typeof x === 'object' && !Array.isArray(x);
  if (Array.isArray(o)) return o.filter(isRec);
  if (!isRec(o) || depth > 3) return [];
  for (const v of Object.values(o)) if (Array.isArray(v) && v.length && isRec(v[0])) return v.filter(isRec);
  for (const v of Object.values(o)) if (isRec(v)) { const r = gList(v, depth + 1); if (r.length) return r; }
  return [];
}
function gDate(o) {
  if (!o || typeof o !== 'object') return null;
  for (const k of ['calendarDate', 'summaryDate', 'date', 'day']) { const v = o[k]; if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10); }
  const v = gVal(o, ['calendarDate', 'summaryDate']);
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
}
/* Zeitpunkt → „HH:MM“. local = Garmin-„Local“-Wert (Ortszeit als UTC kodiert) */
function gClock(v, local) {
  if (v == null) return null;
  if (typeof v === 'string') { const m = v.match(/[T ](\d{2}):(\d{2})/); return m ? `${m[1]}:${m[2]}` : null; }
  const n = gNum(v);
  if (n == null || n <= 0) return null;
  const dt = new Date(n);
  return local ? `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}` : `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
function gMs(v) { // GMT-Zeitpunkt in Millisekunden
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string' || !v) return null;
  const t = Date.parse(/Z$|[+-]\d{2}:?\d{2}$/.test(v) ? v : v.replace(' ', 'T') + 'Z');
  return Number.isFinite(t) ? t : null;
}
function gAt(o, path) { let c = o; for (const p of path.split('.')) { if (!c || typeof c !== 'object') return undefined; c = c[p]; } return c; }
function gPick(o, paths) { for (const p of paths) { const v = gNum(gAt(o, p)); if (v != null) return v; } return null; } // erste Zahl aus mehreren Pfaden
function garSleep(o, k) {
  if (Array.isArray(o)) o = o.find((x) => gDate(x) === k) || o[0];
  if (!o || typeof o !== 'object') return null;
  const dto = gObj(o, 'dailySleepDTO') || o; // Personal API: Schlafwerte direkt, Garmin Connect: in dailySleepDTO
  const out = {};
  const min = (key) => { const v = gNum(gVal(dto, [key])); return v == null ? null : Math.round(v / 60); };
  const total = min('sleepTimeSeconds');
  if (total > 0) {
    Object.assign(out, { sleepDur: total, deep: min('deepSleepSeconds'), light: min('lightSleepSeconds'), rem: min('remSleepSeconds'), awake: min('awakeSleepSeconds') });
    const sc = gObj(dto, 'sleepScores');
    const ov = sc && sc.overall;
    out.sleepScore = gNum(ov && typeof ov === 'object' ? ov.value : ov) ?? gNum(gVal(dto, ['overallSleepScore', 'sleepScore']));
    out.bedTime = gClock(gVal(dto, ['sleepStartTimestampLocal']), true) || gClock(gVal(dto, ['sleepStartTimestampGMT']), false);
    out.wakeTime = gClock(gVal(dto, ['sleepEndTimestampLocal']), true) || gClock(gVal(dto, ['sleepEndTimestampGMT']), false);
    out.resp = gNum(gVal(dto, ['averageRespirationValue', 'avgSleepRespirationValue']));
    out.spo2 = gNum(gVal(dto, ['averageSpO2Value', 'averageSpo2Value']));
    out.sleepStress = gNum(gVal(dto, ['avgSleepStress']));
    const need = dto.sleepNeed;
    out.sleepNeed = gNum(need && typeof need === 'object' ? need.actual : need); // schon in Minuten
    const nn = dto.nextSleepNeed; // Schlafbedarf für die kommende Nacht (Schlaf-Coach)
    out._needNext = gNum(nn && typeof nn === 'object' ? nn.actual : nn);
    out._start = gMs(gVal(dto, ['sleepStartTimestampGMT']));
    out._end = gMs(gVal(dto, ['sleepEndTimestampGMT']));
  }
  out.hrv = gNum(gVal(o, ['avgOvernightHrv']));
  const hs = gVal(o, ['hrvStatus']);
  out.hrvStatus = typeof hs === 'string' ? GAR_HRV[hs.toUpperCase()] || null : null;
  out.rhr = gNum(gVal(o, ['restingHeartRate']));
  if (gVal(o, ['skinTempDataExists']) !== false) out.skinTemp = gNum(gVal(o, ['avgSkinTempDeviationC']));
  return out;
}
/* Body Battery: Verlauf [Zeit (GMT, ms), Wert] und je Tag Aufladung im Schlaf, geladen, verbraucht */
function garBB(raw) {
  const pts = [], days = {};
  for (const e of gList(raw)) {
    const arr = Array.isArray(e.bodyBatteryValuesArray) ? e.bodyBatteryValuesArray : gObj(e, 'bodyBatteryValuesArray');
    if (Array.isArray(arr)) {
      let ti = 0, li = null;
      const desc = e.bodyBatteryValueDescriptorDTOList || e.bodyBatteryValueDescriptorsDTOList;
      if (Array.isArray(desc)) {
        for (const dd of desc) {
          const key = String(dd.bodyBatteryValueDescriptorKey || dd.key || ''), idx = gNum(dd.bodyBatteryValueDescriptorIndex ?? dd.index);
          if (idx == null) continue;
          if (/timestamp/i.test(key)) ti = idx;
          else if (/level/i.test(key)) li = idx;
        }
      }
      for (const p of arr) {
        if (!Array.isArray(p)) continue;
        const t = gNum(p[ti]), v = gNum(li != null ? p[li] : p.length === 2 ? p[1] : p[2]);
        if (t != null && v != null && v >= 0 && v <= 100) pts.push([t, v]);
      }
    }
    const k = gDate(e);
    if (k) {
      const ev = (Array.isArray(e.bodyBatteryActivityEvent) ? e.bodyBatteryActivityEvent : []).filter((x) => x && /sleep/i.test(String(x.eventType || '')));
      const imp = ev.map((x) => gNum(x.bodyBatteryImpact)).filter((v) => v != null);
      days[k] = { sleep: imp.length ? Math.max(...imp) : null, charged: gNum(e.charged), drained: gNum(e.drained) };
    }
  }
  return { pts: pts.sort((a, b) => a[0] - b[0]), days };
}
function garBBAt(pts, t) { // Messpunkt am nächsten an t, höchstens 60 Min. entfernt (Garmin misst nur einige Male am Tag)
  if (t == null) return null;
  let best = null, gap = Infinity;
  for (const [pt, v] of pts) { const g = Math.abs(pt - t); if (g < gap) { gap = g; best = v; } }
  return gap <= 3600000 ? best : null;
}
function garTypeOf(tk) { for (const [re, t] of GAR_TYPES) if (re.test(tk)) return t; return 'Sonstiges'; }
function garActs(raw) {
  const out = [];
  for (const a of gList(raw)) {
    const id = gVal(a, ['activityId']), st = gVal(a, ['startTimeLocal']);
    if (id == null || typeof st !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(st)) continue;
    const at = a.activityType || {};
    const tk = String((typeof at === 'object' ? at.typeKey || at.key : at) || gVal(a, ['typeKey']) || '').toLowerCase();
    const sec = gNum(a.duration ?? a.movingDuration ?? a.elapsedDuration), dist = gNum(a.distance), spd = gNum(a.averageSpeed);
    const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10), r0 = (v) => (v == null ? null : Math.round(v));
    const zones = [1, 2, 3, 4, 5].map((i) => gNum(a['hrTimeInZone_' + i]));
    const g = { te: r1(gNum(a.aerobicTrainingEffect)), tan: r1(gNum(a.anaerobicTrainingEffect)), tel: typeof a.trainingEffectLabel === 'string' ? a.trainingEffectLabel : null,
      pace: spd > 0.3 && dist > 0 ? Math.round(1000 / spd) : null, pw: r0(gNum(a.avgPower)), sl: r0(gNum(a.avgStrideLength)), up: r0(gNum(a.elevationGain)),
      hrmax: r0(gNum(a.maxHR)), kcal: r0(gNum(a.calories)), bb: r0(gNum(a.differenceBodyBattery)), z: zones.some((v) => v != null) ? zones.map((v) => Math.round(v || 0)) : null };
    for (const key of Object.keys(g)) if (g[key] == null) delete g[key];
    const nm = String(gVal(a, ['activityName']) || '').toLowerCase();
    out.push({ gid: String(id), k: st.slice(0, 10), type: /\bbjj\b|jiu|grappl|no-?gi/.test(nm) ? 'BJJ' : garTypeOf(tk), tk, time: gClock(st, true), dur: sec > 0 ? Math.round(sec / 60) : null, km: dist > 0 ? Math.round(dist / 10) / 100 : null,
      cad: gNum(a.averageRunningCadenceInStepsPerMinute), load: gNum(a.activityTrainingLoad), hr: gNum(a.averageHR), vo2: gNum(a.vO2MaxValue), g });
  }
  return out;
}
/* Alle Antworten → Werte je Tag. Reihenfolge = Vorrang (erste Quelle gewinnt).
   Personal API (Tageswerte v2) ist verschachtelt (heartRate.restingValue …), Garmin Connect flach (restingHeartRate …). */
function garParse(keys, raw) {
  const vals = {}, ex = {};
  for (const k of keys) { vals[k] = {}; ex[k] = {}; }
  const set = (k, f, v) => { if (vals[k] && v != null && vals[k][f] == null) vals[k][f] = v; };
  const sleep = {};
  for (const k of keys) sleep[k] = raw.sleep && raw.sleep[k] ? garSleep(raw.sleep[k], k) : null;
  for (const e of gList(raw.hrv)) {
    const k = gDate(e);
    if (!vals[k]) continue;
    set(k, 'hrv', gNum(gVal(e, ['lastNightAvg', 'lastNightAverage'])));
    set(k, 'hrvWeek', gNum(gVal(e, ['weeklyAvg', 'weeklyAverage'])));
    const st = gVal(e, ['status']);
    if (typeof st === 'string') set(k, 'hrvStatus', GAR_HRV[st.toUpperCase()] || null);
    const lo = gNum(gAt(e, 'baseline.balancedLow')), hi = gNum(gAt(e, 'baseline.balancedUpper'));
    if (lo != null && hi != null) ex[k].hrvBase = [Math.round(lo), Math.round(hi)];
  }
  for (const e of gList(raw.sum)) {
    const k = gDate(e);
    if (!vals[k]) continue;
    set(k, 'steps', gPick(e, ['movement.steps.value', 'totalSteps']));
    set(k, 'rhr', gPick(e, ['heartRate.restingValue', 'restingHeartRate']));
    const st = gPick(e, ['stress.avgLevel', 'averageStressLevel']);
    if (st != null && st >= 0) set(k, 'stress', st);
    const mi = gPick(e, ['intensityMinutes.moderate', 'moderateIntensityMinutes']), vi = gPick(e, ['intensityMinutes.vigorous', 'vigorousIntensityMinutes']);
    if (mi != null || vi != null) set(k, 'intensity', (mi || 0) + 2 * (vi || 0));
    set(k, 'bbMorning', gPick(e, ['bodyBattery.atWakeValue', 'bodyBatteryAtWakeTime']));
    set(k, 'kcalAct', gPick(e, ['calories.burnedActive', 'activeKilocalories']));
    set(k, 'kcalTot', gPick(e, ['calories.burnedTotal', 'totalKilocalories']));
    set(k, 'bbCharged', gPick(e, ['bodyBattery.chargedValue', 'bodyBatteryChargedValue']));
    set(k, 'bbDrained', gPick(e, ['bodyBattery.drainedValue', 'bodyBatteryDrainedValue']));
    const fl = gPick(e, ['movement.floorsAscended.value', 'floorsAscended']), flm = gPick(e, ['movement.floorsAscended.distanceInMeters', 'floorsAscendedInMeters']);
    set(k, 'floors', fl != null ? fl : flm != null ? flm / 3.048 : null); // 1 Stockwerk = 3,05 m (10 Fuß)
    if (!(sleep[k] && sleep[k].spo2 != null)) set(k, 'spo2', gPick(e, ['spo2.avgValue', 'pulseOx.avgValue', 'averageSpo2', 'averageSpO2']));
  }
  for (const k of keys) {
    const s = sleep[k];
    if (!s) continue;
    for (const f of ['sleepScore', 'sleepDur', 'deep', 'rem', 'light', 'awake', 'bedTime', 'wakeTime', 'sleepNeed', 'sleepStress', 'hrv', 'hrvStatus', 'rhr', 'resp', 'spo2', 'skinTemp']) set(k, f, s[f]);
    if (s._needNext >= 300 && s._needNext <= 720) ex[k].needNext = Math.round(s._needNext);
  }
  for (const e of gList(raw.stress)) { const k = gDate(e); const v = gNum(gVal(e, ['overallStressLevel', 'averageStressLevel'])); if (vals[k] && v != null && v >= 0) set(k, 'stress', v); }
  for (const e of gList(raw.steps)) { const k = gDate(e); if (vals[k]) set(k, 'steps', gNum(gVal(e, ['totalSteps', 'steps']))); }
  for (const k of keys) if (raw.spo2 && raw.spo2[k]) set(k, 'spo2', gNum(gVal(raw.spo2[k], ['averageSpO2', 'averageSpo2', 'avgSpo2', 'averageSpO2Value', 'averageSPO2'])));
  /* Body Battery: morgens beim Aufwachen, abends beim Einschlafen (Nacht danach), Aufladung im Schlaf */
  const bb = garBB(raw.bb);
  for (const k of keys) {
    const day = bb.days[k];
    if (day) { set(k, 'bbSleep', day.sleep); set(k, 'bbCharged', day.charged); set(k, 'bbDrained', day.drained); }
    if (!bb.pts.length) continue;
    if (sleep[k] && sleep[k]._end) set(k, 'bbMorning', garBBAt(bb.pts, sleep[k]._end));
    const nx = sleep[addDays(k, 1)];
    if (nx && nx._start) set(k, 'bbEvening', garBBAt(bb.pts, nx._start));
  }
  /* Gewicht und Körperfett: letzte echte Messung des Tages (ohne Profil-Änderungen) */
  for (const e of gList(raw.weight)) {
    const k = gDate(e);
    if (!vals[k]) continue;
    const all = (Array.isArray(e.allWeightMetrics) ? e.allWeightMetrics : []).filter((m) => m && typeof m === 'object');
    const real = all.filter((m) => m.sourceType !== 'CHANGE_LOG');
    const ts = (m) => gNum(m.timestampGMT) ?? gMs(m.timestampGMT) ?? gNum(m.date) ?? 0;
    const m = (real.length ? real : all).sort((a, b) => ts(a) - ts(b)).pop() || (e.latestWeight && typeof e.latestWeight === 'object' ? e.latestWeight : e);
    const w = gNum(gVal(m, ['weight']));
    if (w) set(k, 'weight', w > 500 ? w / 1000 : w);
    const fat = gNum(gVal(m, ['bodyFat']));
    if (fat > 0) set(k, 'fat', fat);
  }
  const acts = garActs(raw.acts).sort((a, b) => String(b.time).localeCompare(String(a.time)));
  for (const a of acts) if (a.vo2 && vals[a.k]) set(a.k, 'vo2', a.vo2);
  const today = keys[keys.length - 1];
  if (raw.fit && vals[today]) set(today, 'fitAge', gNum(gVal(raw.fit, ['fitnessAge'])));
  return { vals, ex, sleep };
}

/* ---------- Übernehmen ---------- */
/* Garmin überschreibt nur, was leer ist oder schon von Garmin kam. Selbst Eingetragenes bleibt. */
function garPutDay(k, vals, ex) {
  const d0 = peekDay(k);
  const changes = {};
  let fresh = false;
  for (const [f, v0] of Object.entries(vals || {})) {
    const m = fieldMeta(f);
    if (!m || v0 == null) continue;
    let v = v0;
    if (m.type === 'num') {
      v = gNum(v);
      if (v == null) continue;
      v = m.dec ? Math.round(v * 10 ** m.dec) / 10 ** m.dec : Math.round(v);
      if ((m.min != null && v < m.min) || (m.max != null && v > m.max)) continue;
    } else if (m.type === 'dur') {
      v = gNum(v);
      if (v == null || v < 0 || v > 1440) continue;
      v = Math.round(v);
    } else if (m.type === 'time') { if (!/^\d{2}:\d{2}$/.test(v)) continue; } else if (m.type === 'choice') { if (!m.options.includes(v)) continue; }
    const cur = d0 && d0.health ? d0.health[f] : undefined;
    const prev = d0 && d0.gar ? d0.gar[f] : undefined;
    if (cur != null && cur !== prev) continue;
    if (cur === v) continue;
    if (cur == null && (f === 'sleepScore' || f === 'sleepDur')) fresh = true;
    changes[f] = v;
  }
  const gx0 = (d0 && d0.gx) || {}, exCh = {};
  if (ex && ex.hrvBase && String(gx0.hrvBase) !== String(ex.hrvBase)) exCh.hrvBase = ex.hrvBase;
  if (ex && ex.needNext && gx0.needNext !== ex.needNext) exCh.needNext = ex.needNext;
  const exNew = Object.keys(exCh).length > 0;
  const n = Object.keys(changes).length;
  if (!n && !exNew) return { n: 0, fresh: false };
  mutDay(k, (d) => {
    d.health = d.health || {};
    d.gar = d.gar || {};
    for (const [f, v] of Object.entries(changes)) { d.health[f] = v; d.gar[f] = v; }
    if (exNew) d.gx = { ...(d.gx || {}), ...exCh };
    if (changes.weight != null && k === todayKey()) { S.settings.profile.weight = changes.weight; markDirty('settings'); }
  });
  return { n, fresh };
}
function garCat(type) {
  const tt = trainType({ type });
  if (tt.run) return 'run';
  if (tt.gym || ['Gym (frei)', 'Push', 'Pull', 'Beine'].includes(tt.id)) return 'gym';
  return tt.id;
}
/* Garmin-Werte in ein Training: nur Leeres füllen; Details (t.g) kommen immer von Garmin */
function garFillTraining(t, a) {
  if (!t.time && a.time) t.time = a.time;
  if (t.dur == null && a.dur) t.dur = a.dur;
  if (t.load == null && a.load != null) t.load = Math.round(a.load);
  if (t.hr == null && a.hr) t.hr = Math.round(a.hr);
  if (t.km == null && a.km) t.km = a.km;
  if (garCat(t.type) === 'run' && t.cad == null && a.cad) t.cad = Math.round(a.cad);
  if (t.int == null && a.rpe != null) { const v = Math.round(a.rpe / 10); if (v >= 1 && v <= 10) t.int = v; } // Garmin speichert Anstrengung × 10
  const g = { ...(t.g || {}), ...(a.g || {}) };
  if (a.feel != null) g.feel = a.feel;
  if (a.rpe != null) g.rpe = a.rpe;
  if (a.det) g.det = 1;
  if (Object.keys(g).length) t.g = g;
}
function garTrainingIndex() {
  const have = new Map(), skip = new Set();
  for (const [k, d] of Object.entries(S.days)) {
    for (const t of d.trainings || []) if (t.gid) have.set(String(t.gid), { k, t });
    for (const g of d.gskip || []) skip.add(String(g));
  }
  return { have, skip };
}
/* Garmin-Krafttraining → geplanter Gym-Tag (Wunsch vom 10.11.2026): erst der Tag laut Wochenplan,
   sonst ein ausgefallener Gym-Tag davor, sonst der nächste geplante (vorgezogen) – jeweils in derselben Woche.
   Hast du selbst eine Einheit gestartet, gilt deine. */
function garGymDay(k) {
  const ws = weekStart(k), done = new Set();
  for (const x of weekKeys(ws)) for (const t of ((peekDay(x) || {}).trainings || [])) { const g = trainType(t).gym; if (g) done.add(Number(g)); }
  const own = Number(weekTpl(weekday(k)).gym);
  if (own && gymDay(own) && !done.has(own)) return own;
  for (const x of weekKeys(ws)) { if (x >= k) break; const g = Number(weekTpl(weekday(x)).gym); if (g && gymDay(g) && !done.has(g)) return g; }
  for (const x of weekKeys(ws)) { if (x <= k) continue; const g = Number(weekTpl(weekday(x)).gym); if (g && gymDay(g) && !done.has(g)) return g; }
  return null;
}
function garAssignGym(t, k) {
  if (t.gym || t.type !== 'Gym (frei)') return null;
  const day = garGymDay(k), gd = day ? gymDay(day) : null;
  if (!gd) return null;
  const ex = {};
  if (gd.legs && S.settings.gym.kneeAlt) for (const e of gd.ex) if (e.alt) ex[e.id] = { s: [], alt: true };
  t.type = gd.n;
  t.gym = { day, sched: gymSched(k), ex };
  t.gauto = 1;
  return gd.n;
}
/* Aktivitäten als Training: passt ein selbst eingetragenes Training (gleiche Art, ±90 Min.), wird es ergänzt */
function garApplyActs(acts, today) {
  const { have, skip } = garTrainingIndex();
  let n = 0, slot = null;
  const gym = [];
  for (const a of acts.slice().sort((x, y) => (x.k + (x.time || '')).localeCompare(y.k + (y.time || '')))) {
    if (!a.type || skip.has(a.gid) || a.k > today) continue;
    const old = have.get(a.gid);
    if (old) { // schon übernommen: fehlende Details und Anstrengung ergänzen
      const t0 = old.t;
      const need = (a.g && Object.keys(a.g).some((key) => !t0.g || t0.g[key] == null)) || (t0.int == null && a.rpe != null) || (a.feel != null && !(t0.g && t0.g.feel != null)) || (a.det && !(t0.g && t0.g.det));
      if (need) mutDay(old.k, (d) => { const t = (d.trainings || []).find((x) => String(x.gid) === a.gid); if (t) garFillTraining(t, a); });
      continue;
    }
    const cat = garCat(a.type), am = timeToMin(a.time);
    mutDay(a.k, (d) => {
      d.trainings = d.trainings || [];
      const m = d.trainings.find((t) => !t.gid && garCat(t.type) === cat && (!t.time || am == null || Math.abs(timeToMin(t.time) - am) <= 90));
      if (m) { m.gid = a.gid; garFillTraining(m, a); have.set(a.gid, { k: a.k, t: m }); return; }
      const t = { id: uid(), type: a.type, time: a.time || '', dur: a.dur, int: null, load: null, note: '', gid: a.gid };
      garFillTraining(t, a);
      const gn = garAssignGym(t, a.k);
      if (gn) gym.push(`${WD_SHORT[weekday(a.k)]} ${gn}`);
      d.trainings.push(t);
      have.set(a.gid, { k: a.k, t });
      if (a.k === today) slot = setSlotFromTraining(d, t) || slot;
    });
    n++;
  }
  return { n, slot, gym };
}
/* Gewohnheiten, die die Uhr belegt (Wunsch vom 08.11.2026): nur aufgezeichnete Aktivitäten, abwählbar */
const GAR_HABITS = [
  { id: 'nsdr', test: (a) => /meditation|breath/.test(a.tk) && (a.dur || 0) >= 10 },
  { id: 'licht_morgen', test: (a) => a.type === 'Spaziergang' && (a.dur || 0) >= 30 && !!a.time && a.time < '12:00', light: true },
];
function garApplyHabits(acts, keys) {
  let n = 0;
  for (const h of GAR_HABITS) {
    if ((S.settings.habitsOff || []).includes(h.id)) continue;
    for (const a of acts) {
      if (!keys.includes(a.k) || !h.test(a)) continue;
      const d0 = peekDay(a.k);
      if (d0 && (((d0.ghOff || []).includes(h.id)) || (d0.habits && d0.habits[h.id]))) continue;
      mutDay(a.k, (d) => {
        d.habits[h.id] = true;
        d.gh = { ...(d.gh || {}), [h.id]: a.gid };
        if (h.light && !(d.hd && d.hd.lightMin != null)) { d.hd = d.hd || {}; d.hd.lightMin = a.dur >= 45 ? 45 : 30; }
      });
      n++;
    }
  }
  return n;
}

/* ---------- Abruf ---------- */
function garKeys(from, to) { const out = []; for (let k = from; k <= to; k = addDays(k, 1)) out.push(k); return out; }
async function garRun(opt) {
  const today = todayKey(), minK = addDays(today, -(GAR_MAX - 1));
  let from = opt.days ? addDays(today, -(opt.days - 1)) : GAR.lastDay ? addDays(GAR.lastDay, -1) : addDays(today, -(GAR_FIRST - 1));
  if (from < minK) from = minK;
  if (from > today) from = today;
  const keys = garKeys(from, today);
  const warn = [];
  let relayOld = false;
  const step = async (name, fn, optional) => {
    try { return await fn(); } catch (e) {
      if (e.kind === 'relayPath') { relayOld = true; return null; }
      if (e.fatal) throw e;
      if (!optional && !warn.includes(name)) warn.push(name);
      return null;
    }
  };
  try {
    await garToken();
    const raw = { sleep: {}, spo2: {} };
    raw.sum = await step('Tageswerte', () => garGet(`/usersummary-service/v2/dailysummaries?startDate=${from}&endDate=${today}`));
    raw.hrv = await step('HRV', () => garGet(`/hrv-service/hrv/daily/${from}/${today}`));
    raw.bb = await step('Body Battery', () => garGet(`/wellness-service/wellness/bodyBattery/reports/daily?startDate=${from}&endDate=${today}`));
    raw.weight = await step('Gewicht', () => garGet(`/weight-service/weight/range/${from}/${today}?includeAll=true`));
    raw.acts = await step('Aktivitäten', () => garGet(`/activitylist-service/activities/search/activities?start=0&limit=100&startDate=${from}&endDate=${today}`));
    raw.fit = await step('Fitnessalter', () => garGet(`/fitnessage-service/fitnessage/v2/${today}`), true);
    const each = async (ks, name, path, into, optional) => {
      for (let i = 0; i < ks.length; i += 3) {
        const part = ks.slice(i, i + 3);
        const res = await Promise.all(part.map((k) => step(name, () => garGet(path(k)), optional)));
        part.forEach((k, j) => { into[k] = res[j]; });
      }
    };
    await each(keys, 'Schlaf', (k) => `/sleep-service/sleep/dailySleep?date=${k}`, raw.sleep);
    let p = garParse(keys, raw);
    if (!keys.some((k) => p.vals[k].steps != null)) {
      raw.steps = await step('Schritte', () => garGet(`/usersummary-service/stats/steps/daily/${from}/${today}`));
      raw.stress = await step('Stress', () => garGet(`/usersummary-service/stats/stress/daily/${from}/${today}`));
    }
    /* SpO2 eigens holen, wo der Schlaf keinen Wert hat (Pulsoximeter nachts an?) */
    const noSpo2 = keys.filter((k) => p.vals[k].sleepDur != null && p.vals[k].spo2 == null);
    if (noSpo2.length) await each(noSpo2, 'SpO2', (k) => `/wellness-service/wellness/daily/spo2acclimation/${k}`, raw.spo2, true);
    if (raw.steps || raw.stress || noSpo2.length) p = garParse(keys, raw);
    /* Anstrengung und Gefühl (nach dem Training auf der Uhr) aus den Aktivitätsdetails: nur neue oder noch ohne Intensität */
    const acts = garActs(raw.acts);
    const { have, skip } = garTrainingIndex();
    const needDet = acts.filter((a) => a.type && !skip.has(a.gid) && !(have.get(a.gid) && (have.get(a.gid).t.int != null || (have.get(a.gid).t.g || {}).det))).slice(0, 10);
    for (const a of needDet) {
      const det = await step('Aktivitätsdetails', () => garGet(`/activity-service/activity/${encodeURIComponent(a.gid)}`), true);
      if (relayOld) break;
      const s = det ? gObj(det, 'summaryDTO') || det : null;
      if (s) { a.rpe = gNum(gVal(s, ['directWorkoutRpe'])); a.feel = gNum(gVal(s, ['directWorkoutFeel'])); }
      a.det = 1;
    }
    if (!GAR) return null; // inzwischen getrennt
    let n = 0, fresh = false;
    for (const k of keys) { const r = garPutDay(k, p.vals[k], p.ex[k]); n += r.n; if (r.fresh && k === today) fresh = true; }
    const ta = garApplyActs(acts, today);
    const nh = garApplyHabits(acts, keys);
    GAR.last = new Date().toISOString();
    GAR.lastDay = today;
    GAR.err = null; GAR.errAt = null; GAR.warn = warn; GAR.relayOld = relayOld;
    if (keys.length >= GAR_FIRST) GAR.full = GAR_FULL;
    GAR.sum = { n, t: ta.n, h: nh };
    await garSave();
    return { n, t: ta.n, h: nh, slot: ta.slot, gym: ta.gym, fresh, warn };
  } catch (e) {
    if (GAR) { GAR.err = e.message || 'Abruf fehlgeschlagen'; GAR.errAt = Date.now(); await garSave(); }
    throw e;
  }
}
function garSync(opt = {}) {
  if (!garOn()) return Promise.resolve(null);
  if (garBusy) return garBusy;
  garBusy = garRun(opt).finally(() => { garBusy = null; });
  return garBusy;
}
function garSumText(r) {
  if (!r || (!r.n && !r.t && !r.h)) return 'nichts Neues';
  return [r.n ? `${r.n} ${r.n === 1 ? 'Wert' : 'Werte'}` : '', r.t ? `${r.t} ${r.t === 1 ? 'Training' : 'Trainings'}` : '', r.h ? `${r.h} ${r.h === 1 ? 'Gewohnheit' : 'Gewohnheiten'}` : ''].filter(Boolean).join(', ') + ' übernommen';
}
function garQuiet() { return !!ui.sheet || !!ui.timer || (document.activeElement && document.activeElement.matches('input, textarea, select')); }
function garRefresh() { if (!garQuiet()) render(); }
function garDone(res, manual) {
  invalidate();
  try { energyApply(); } catch (e) { /* egal */ }
  garRefresh();
  if (!res) return;
  if (res.gym && res.gym.length) toast(`Garmin-Krafttraining als ${res.gym.join(', ')} eingetragen${res.slot ? `, Ernährung auf ${TRAINING[res.slot].n}` : ''} – andere Einheit? Antippen und Art ändern.`);
  else if (res.slot) toast(`Garmin: ${res.t === 1 ? 'Training' : 'Trainings'} übernommen, Ernährung auf ${TRAINING[res.slot].n} umgestellt`);
  else if (manual || res.t || res.h || res.fresh) toast('Garmin: ' + garSumText(res) + (manual && res.warn && res.warn.length ? ` (ohne ${res.warn.join(', ')})` : ''));
}
function garFail(manual) { garRefresh(); if (manual && GAR && GAR.err) toast('Garmin: ' + GAR.err); }
function garManual(days) {
  if (!garOn()) { sheetGarmin(); return; }
  const p = garSync(days ? { days } : {});
  garRefresh();
  p.then((r) => garDone(r, true), () => garFail(true));
}
const GAR_FULL = 2; // Version der Auswertung: bei neuer Version einmal 30 Tage neu holen (füllt neue Felder nach)
function garAuto() {
  if (!garOn() || garBusy || document.hidden || navigator.onLine === false) return;
  const now = Date.now();
  if (GAR.errAt && now - GAR.errAt < GAR_RETRY) return;
  if (GAR.lastDay && (GAR.full || 0) < GAR_FULL) {
    garSync({ days: GAR_MAX }).then((r) => { if (r && GAR) { GAR.full = GAR_FULL; garSave(); } garDone(r, false); }, () => garFail(false));
    return;
  }
  if (GAR.last && now - Date.parse(GAR.last) < GAR_EVERY && GAR.lastDay === todayKey()) return;
  garSync().then((r) => garDone(r, false), () => garFail(false));
}

/* ---------- Oberfläche ---------- */
const GAR_TE = { RECOVERY: 'Erholung', BASE: 'Grundlage', AEROBIC_BASE: 'Grundlage', TEMPO: 'Tempo', LACTATE_THRESHOLD: 'Schwelle', THRESHOLD: 'Schwelle', VO2MAX: 'VO2max', ANAEROBIC_CAPACITY: 'Anaerob', ANAEROBIC: 'Anaerob', SPEED: 'Sprint', NO_BENEFIT: 'ohne Trainingseffekt' };
function garTE(l) { const k = String(l || '').toUpperCase(); return GAR_TE[k] || k.toLowerCase().replace(/_/g, ' '); }
function garPace(sec) { const s = Math.round(sec); return `${Math.floor(s / 60)}:${pad(s % 60)}`; }
function garFeel(v) { return ['sehr schwach', 'schwach', 'normal', 'stark', 'sehr stark'][Math.max(0, Math.min(4, Math.round(v / 25)))]; }
function garHabitMark(d, id) { return d && d.gh && d.gh[id] && d.habits && d.habits[id] ? ` <span class="gar-mark" title="laut Garmin erledigt" aria-label="laut Garmin erledigt">${icon('watch')}</span>` : ''; }
/* Garmin-Details im Trainings-Sheet */
function garTrainInfo(t, tt) {
  const g = t.g || {}, rows = [];
  if (g.te != null || g.tel) rows.push(['Trainingseffekt', [g.te != null ? fmt(g.te, 1) + ' aerob' : '', g.tan != null ? fmt(g.tan, 1) + ' anaerob' : '', g.tel ? garTE(g.tel) : ''].filter(Boolean).join(' · ')]);
  if (g.pace) rows.push(['Pace', garPace(g.pace) + ' /km']);
  if (g.pw) rows.push(['Leistung', fmt(g.pw) + ' W']);
  if (g.sl) rows.push(['Schrittlänge', fmt(g.sl) + ' cm']);
  if (g.up) rows.push(['Höhenmeter', fmt(g.up) + ' m']);
  if (t.hr || g.hrmax) rows.push(['Puls', [t.hr ? 'Ø ' + t.hr : '', g.hrmax ? 'max. ' + g.hrmax : ''].filter(Boolean).join(' · ') + ' bpm']);
  if (g.z) rows.push(['Pulszonen', g.z.map((sec, i) => `Z${i + 1} ${Math.round(sec / 60)}′`).join(' · ')]);
  if (g.kcal) rows.push(['Kalorien', fmt(g.kcal) + ' kcal']);
  if (g.bb != null) rows.push(['Body Battery', (g.bb > 0 ? '+' : '') + fmt(g.bb)]);
  if (g.rpe != null) rows.push(['Anstrengung (Uhr)', fmt(Math.round(g.rpe / 10)) + '/10']);
  if (g.feel != null) rows.push(['Gefühl (Uhr)', garFeel(g.feel)]);
  if (t.km && !tt.run) rows.push(['Distanz', fmt(t.km, 1) + ' km']);
  const tip = g.rpe == null && t.int == null ? ' Die Intensität kommt automatisch, wenn du nach dem Training auf der Uhr die Anstrengung angibst.' : '';
  return `<div class="gar-train"><p class="hint gar-hint">${icon('watch')} Von Garmin übernommen.${tt.run ? ' Knieschmerz trägst du selbst ein.' : ''}${tip}</p>${rows.length ? `<div class="kv-list">${rows.map(([a, b]) => `<div><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join('')}</div>` : ''}</div>`;
}
function garWhen(iso) {
  const dt = new Date(iso);
  if (!Number.isFinite(dt.getTime())) return '–';
  const k = dkey(dt), t = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  return k === todayKey() ? `heute ${t}` : k === addDays(todayKey(), -1) ? `gestern ${t}` : `${fmtDate(k, { day: 'numeric', month: 'short' })} ${t}`;
}
function garCard() {
  if (!garOn()) {
    return `<section class="card gar-card"><div class="gar-head">${icon('watch')}<div><b>Garmin Connect verbinden</b><small>Schlaf, HRV, Ruhepuls, Body Battery, Stress, Schritte, Gewicht und Trainings kommen dann automatisch in die App.</small></div></div>
      <div class="sheet-acts"><button class="btn is-accent" data-a="gar-setup">Einrichten</button></div></section>`;
  }
  const busy = !!garBusy;
  const info = busy ? 'Wird abgerufen …' : `Zuletzt ${garWhen(GAR.last || '')}${GAR.sum ? ' · ' + garSumText(GAR.sum) : ''}`;
  return `<section class="card gar-card${GAR.err ? ' is-err' : ''}"><div class="gar-head">${icon('watch')}<div><b>Garmin Connect</b><small>${esc(GAR.last || busy ? info : 'Noch nicht abgerufen')}</small></div></div>
    ${GAR.err && !busy ? `<p class="gar-err">${icon('triangle-alert')}<span>${esc(GAR.err)}</span></p>` : ''}
    ${!GAR.err && !busy && GAR.warn && GAR.warn.length ? `<p class="hint">Diesmal nicht geliefert: ${esc(GAR.warn.join(', '))}.</p>` : ''}
    ${!GAR.err && !busy && GAR.relayOld ? `<p class="hint">${icon('info')} Für Anstrengung und Gefühl aus den Trainings: den neuen Weiterleitungs-Code (Version 2) bei Cloudflare einfügen und „Deploy“ – unter Einstellungen → „Code kopieren“.</p>` : ''}
    <div class="sheet-acts gar-acts"><button class="btn" data-a="gar-sync"${busy ? ' disabled' : ''}>${icon('refresh-cw')}${busy ? 'Läuft …' : 'Jetzt abrufen'}</button><button class="btn is-ghost" data-a="gar-setup">Einstellungen</button></div></section>`;
}
function garMark(d, f) {
  const v = d.health ? d.health[f] : null;
  return v != null && d.gar && d.gar[f] === v ? `<span class="gar-mark" data-tip="Von Garmin übernommen" aria-label="von Garmin">${icon('watch')}</span>` : '';
}
function sheetGarmin() { ui.sheet = { type: 'garmin', err: null, busy: false, url: null, key: '' }; renderGarSheet(); }
function renderGarSheet() {
  const s = ui.sheet;
  if (!s || s.type !== 'garmin') return;
  const on = garOn();
  const url = s.url != null ? s.url : on ? GAR.url : '';
  openSheet(`<h3 class="sheet-title">${on ? 'Garmin Connect' : 'Garmin Connect verbinden'}</h3>
    <p class="hint">Garmin lässt Web-Apps nicht direkt an deine Daten. Darum läuft der Abruf über deine eigene, kostenlose Weiterleitung bei Cloudflare. Sie speichert nichts.</p>
    <ol class="steps gar-steps">
      <li><b>Weiterleitung anlegen</b> (am Computer bequemer): Gratis-Konto bei Cloudflare, dann „Workers &amp; Pages“ → „Create“ → Worker „Hello World“ → „Deploy“. Danach „Edit code“, alles löschen, den Protokoll-Code einfügen und wieder „Deploy“. Die Adresse (…workers.dev) unten eintragen. Beim ersten Worker fragt Cloudflare nach einem Namen für deine workers.dev-Adresse – frei wählbar.
        <span class="gar-links"><button class="link-btn" data-a="gar-copy">${icon('copy')}Code kopieren</button><a class="link-btn" href="${GAR_CF_URL}" target="_blank" rel="noopener">${icon('external-link')}Cloudflare öffnen</a><a class="link-btn" href="${GAR_CODE_URL}" target="_blank" rel="noopener">${icon('external-link')}Code auf GitHub</a></span></li>
      <li><b>Schlüssel bei Garmin erstellen</b> (erst jetzt, am besten hier auf dem iPhone): Link öffnen, anmelden, „Create Key“, Bedingungen annehmen, Laufzeit 1 Jahr, „Create“. Der Schlüssel erscheint nur einmal – kopieren und gleich unten einfügen. <a class="link-btn" href="${GAR_KEY_URL}" target="_blank" rel="noopener">${icon('external-link')}Garmin Connect öffnen</a></li>
      <li><b>Verbinden</b> tippen – die App prüft die Weiterleitung und den Schlüssel und holt die letzten 14 Tage.</li>
    </ol>
    ${s.showCode ? `<textarea class="note gar-code" rows="6" readonly>${esc(GAR_RELAY_CODE)}</textarea>` : ''}
    <div class="form">
      <div class="frow is-wide"><span class="flabel">Adresse der Weiterleitung</span><div class="fin"><input type="url" id="gar-url" value="${esc(url)}" placeholder="https://….workers.dev" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div>
      <div class="frow is-wide"><span class="flabel">Garmin-Schlüssel</span><div class="fin"><input type="password" id="gar-key" value="${esc(s.key || '')}" placeholder="${on ? 'gespeichert – leer lassen' : 'Personal API Key einfügen'}" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div>
    </div>
    ${s.err ? `<p class="gar-err">${icon('triangle-alert')}<span>${esc(s.err)}</span></p>` : ''}
    <p class="hint gar-hint">${icon('lock')} Schlüssel und Adresse bleiben nur auf diesem Gerät: nicht im Backup, nicht im Code. Garmin schickt vor Ablauf des Schlüssels eine E-Mail; dann einen neuen erstellen und hier eintragen.</p>
    ${on ? '<p class="hint">Trainingsbereitschaft gibt Garmins Schnittstelle nicht heraus – die App rechnet eine eigene aus Schlaf, HRV, Ruhepuls, Body Battery, Stress und Belastung.</p>' : ''}
    <div class="sheet-acts"><button class="btn is-accent" data-a="gar-connect"${s.busy ? ' disabled' : ''}>${s.busy ? 'Verbinde …' : on ? 'Speichern & testen' : 'Verbinden'}</button>
      ${on ? `<button class="btn" data-a="gar-more">${icon('history')}30 Tage nachladen</button><button class="btn is-danger" data-a="gar-off">${icon('unplug')}${s.offAsk ? 'Wirklich trennen?' : 'Trennen'}</button>` : ''}</div>
    ${s.offAsk ? '<p class="hint">Trennen löscht Schlüssel und Adresse von diesem Gerät. Übernommene Werte bleiben. Den Schlüssel kannst du zusätzlich in Garmin Connect löschen.</p>' : ''}`);
}
function garRerender() { // ohne erneute Einblend-Animation, Scrollstand bleibt, Fehler sichtbar
  const old = $('#sheet .sheet'), top = old ? old.scrollTop : 0;
  renderGarSheet();
  const n = $('#sheet .sheet'), b = $('#sheet .sheet-backdrop');
  if (b) b.style.animation = 'none';
  if (!n) return;
  n.classList.add('still');
  n.scrollTop = top;
  const e = n.querySelector('.gar-err, .gar-code');
  if (e) e.scrollIntoView({ block: 'nearest' });
}
function garSheetVals() {
  const s = ui.sheet;
  const u = $('#gar-url'), k = $('#gar-key');
  if (u) s.url = u.value.trim();
  if (k) s.key = k.value.trim();
}

Object.assign(SET_VIEWS, {
  garmin() {
    return garCard() + '<p class="hint">Die App holt die Werte beim Öffnen automatisch (höchstens alle 30 Minuten). Was du selbst einträgst oder änderst, überschreibt Garmin nicht.</p>';
  },
});

Object.assign(A, {
  'gar-setup': () => sheetGarmin(),
  'gar-sync': () => garManual(0),
  'gar-more': () => { closeSheet(); garManual(GAR_MAX); },
  'gar-copy': () => {
    const fail = () => { if (ui.sheet && ui.sheet.type === 'garmin') { garSheetVals(); ui.sheet.showCode = true; garRerender(); } else if (ui.sheet && ui.sheet.type === 'push') { const u = $('#push-url'); if (u) ui.sheet.url = u.value.trim(); ui.sheet.showCode = true; pushRerender(); } toast('Kopieren ging nicht – Code unten markieren und kopieren'); };
    try {
      if (!navigator.clipboard) { fail(); return; }
      navigator.clipboard.writeText(GAR_RELAY_CODE).then(() => toast('Code kopiert – bei Cloudflare einfügen'), fail);
    } catch (e) { fail(); }
  },
  'gar-connect': async () => {
    const s = ui.sheet;
    if (!s || s.type !== 'garmin' || s.busy) return;
    garSheetVals();
    let url = (s.url || '').replace(/\s/g, '').replace(/\/+$/, '');
    if (url && !/^[a-z]+:\/\//i.test(url)) url = 'https://' + url;
    const key = s.key || (garOn() ? GAR.key : '');
    if (!/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(\/[\w.~-]+)*$/i.test(url)) { s.err = 'Bitte die Adresse der Weiterleitung prüfen (https://….workers.dev).'; garRerender(); return; }
    if (key.length < 16 || /\s/.test(key)) { s.err = 'Bitte den Garmin-Schlüssel einfügen.'; garRerender(); return; }
    s.url = url; s.busy = true; s.err = null; s.offAsk = false;
    garRerender();
    const old = GAR;
    const same = !!(old && old.key === key && old.url === url);
    GAR = { ...(old || {}), url, key, token: same ? old.token : null, exp: same ? old.exp : null };
    try {
      await garCheckRelay(url);
      await garToken(!same);
      GAR.err = null; GAR.errAt = null;
      await garSave();
      if (ui.sheet === s) closeSheet();
      render();
      toast('Garmin verbunden – Werte werden geholt');
      garManual(0);
    } catch (e) {
      GAR = old;
      if (ui.sheet === s) { s.busy = false; s.err = e.message || 'Verbinden fehlgeschlagen'; garRerender(); }
    }
  },
  'gar-off': async () => {
    const s = ui.sheet;
    if (!s || s.type !== 'garmin') return;
    if (!s.offAsk) { garSheetVals(); s.offAsk = true; garRerender(); return; }
    GAR = null;
    await garSave();
    closeSheet(); render();
    toast('Garmin getrennt – Schlüssel auf diesem Gerät gelöscht');
  },
});
