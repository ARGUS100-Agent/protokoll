/* ============================================================
   FRANK-KI IN DER APP, WOCHEN-AGENT, MORGEN-BRIEFING (seit 2.10.0)
   Läuft über die eigene Weiterleitung (Worker v4) mit deinem Claude-API-Schlüssel als Geheimnis
   in Cloudflare – die App und das Repo sehen den Schlüssel nie. Monatsbudget im Worker
   (AI_BUDGET_USD, Standard 1 $). Haiku 5.5 für Fotos und Fragen, Sonnet 5.5 für den Wochen-Agent.
   Der Wochen-Agent ändert Ziele und Einstellungen selbst (Wunsch vom 11.11.2026: „alles
   automatisch“), aber nur in festen Grenzen und mit Rückgängig je Änderung.
   ============================================================ */
/*icons: sparkles camera image message-circle receipt test-tube-diagonal bot undo-2 send wand-sparkles*/
let AIST = null;
function aiOn() { return pushOn() && !!(AIST && AIST.ai); }
async function aiFetch(op, body = {}) {
  if (!PUSH || !PUSH.url) throw garErr('setup', 'Erst die Mitteilungen (Weiterleitung) einrichten.');
  let res;
  try { res = await fetch(`${PUSH.url}/ai/${op}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Push-Key': PUSH.key }, body: JSON.stringify(body), cache: 'no-store', credentials: 'omit' }); }
  catch (e) { throw garErr('net', navigator.onLine === false ? 'Kein Internet.' : 'Weiterleitung nicht erreichbar.'); }
  let j = {};
  try { j = await res.json(); } catch (e) { j = {}; }
  if (res.ok) return j;
  if ((res.status === 404 || res.status === 403) && !j.err) throw garErr('old', 'Die Weiterleitung ist noch Version 3 – neuen Code (v4) in Cloudflare einfügen.');
  if (j.err === 'ai-key') throw garErr('ai-key', 'Im Worker fehlt das Geheimnis ANTHROPIC_API_KEY.');
  if (j.err === 'budget') throw garErr('budget', j.msg || 'Monatsbudget erreicht.');
  if (j.err === 'key') throw garErr('key', 'Weiterleitung kennt dieses Gerät nicht – Mitteilungen neu verbinden.');
  throw garErr('ai', j.msg || `Fehler ${res.status}`);
}
let aiChecked = 0;
function aiRefresh(force = false) {
  if (!pushOn() || (!force && Date.now() - aiChecked < 10 * 60000)) return Promise.resolve(AIST);
  aiChecked = Date.now();
  return aiFetch('status').then((j) => { const was = JSON.stringify(AIST); AIST = j; if (was !== JSON.stringify(j) && !ui.sheet) render(); agentCheck(); return j; }).catch((e) => { AIST = { err: e.message, code: e.code }; return AIST; });
}
async function aiAsk({ model = 'haiku', system, content, max = 1500 }) {
  const j = await aiFetch('ask', { model, system, max_tokens: max, messages: [{ role: 'user', content }] });
  if (AIST) AIST.usd = j.month_usd;
  return j.text || '';
}
/* Foto verkleinern (max. 1280 px, JPEG) → Bild-Baustein für Claude */
function aiImage(file, maxPx = 1280) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const f = Math.min(1, maxPx / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.82).split(',')[1] } });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Bild nicht lesbar')); };
    img.src = url;
  });
}
function aiJSON(text) { const t = String(text || ''); const f = t.match(/```(?:json)?\s*([\s\S]*?)```/i); const s = f ? f[1] : t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1); try { return JSON.parse(s); } catch (e) { return null; } }
function aiBusy(on, msg) { const el = $('#ai-busy'); if (el) { el.hidden = !on; el.textContent = msg || 'Frank denkt nach …'; } $$('[data-ai]').forEach((b) => { b.disabled = !!on; }); }

/* ---------- Frank: Essen aus Text, Sprache (Diktat) oder Foto ---------- */
const FRANK_SYS = `Du bist Frank, Ernährungs-Coach der Protokoll-App. Antworte NUR mit einem JSON-Codeblock (keine Erklärung davor oder danach):
{"app":"protokoll-frank","v":1,"items":[{"name":"…","cat":"…","liquid":false,"fluid":0,"portion":{"name":"Stück","size":120},"eaten":{"amount":1,"unit":"Stück"},"meal":"mittag","time":"12:30","values":{…},"estimated":["…"],"tags":[],"plants":[],"pp":0,"pre":0,"ferm":0,"sources":[],"note":"…"}]}
Regeln: values IMMER pro 100 g (bzw. 100 ml bei liquid=true). Schlüssel und Einheiten: kcal, p, f, sf, c, sug, fs (freier Zucker) , fib in g; na, k, ca, mg, fe, zn, cu, vc, ve, b6, cho, caf in mg; se, i, va, ret, vk, k2, b12, fol, vd in µg; epa, dha, ala, alk in g. Mikronährstoffe realistisch schätzen (deutsche Lebensmitteltabellen) und in "estimated" aufführen. Ein Eintrag je Lebensmittel; bei Fotos Mengen aus Tellergröße und Portion schätzen und in "note" kurz begründen. "eaten" = gegessene Menge in "unit" (Portionsname oder g/ml). tags nur aus: upf (stark verarbeitet), whey, milbona, alkohol. Prepmymeal ist nie upf. plants = Pflanzenarten (für 30 Pflanzen pro Woche). pp/pre = Polyphenol-/Präbiotika-Punkte 0–5, ferm = fermentierte Menge in g. meal aus: fruehstueck, mittag, nachmittag, abend, snack, getraenke (weglassen, wenn unklar). Namen auf Deutsch. sources nur echte https-Links, sonst leer.`;
async function frankAI(text, file) {
  const s = ui.sheet;
  aiBusy(true, file ? 'Frank schaut sich das Foto an …' : 'Frank rechnet …');
  try {
    const content = [];
    if (file) content.push(await aiImage(file));
    content.push({ type: 'text', text: (text ? text : 'Was ist auf dem Foto und wie viel davon?') + `\n(Datum heute: ${todayKey()}, Uhrzeit ${minToTime(nowMin())})` });
    const out = await aiAsk({ model: 'haiku', system: FRANK_SYS, content, max: 2500 });
    if (!ui.sheet || ui.sheet !== s) return;
    if (!frankTry(out, true)) frankErr('Frank hat keinen gültigen Code geliefert – bitte genauer beschreiben.');
  } catch (e) { frankErr(e.message); } finally { aiBusy(false); }
}
function frankAIBox() {
  if (!aiOn()) return '';
  return `<div class="ai-box"><b>${icon('sparkles')} Direkt in der App</b><p class="hint">Beschreiben (auch per Diktat: Mikrofon auf der Tastatur) oder Foto vom Teller oder Etikett.</p>
    <div class="row-btns"><button class="pill-btn is-accent" data-a="frank-ai" data-ai>${icon('send')}Fragen</button><label class="pill-btn" data-ai>${icon('camera')}Foto<input type="file" accept="image/*" capture="environment" data-c="frank-photo" hidden></label><label class="pill-btn" data-ai>${icon('image')}Aus Fotos<input type="file" accept="image/*" data-c="frank-photo" hidden></label></div>
    <p class="hint" id="ai-busy" hidden></p></div>`;
}
/* Mikronährstoffe für Einträge mit wenigen Werten schätzen (z. B. nach dem Barcode-Scan) */
function frankPreviewExtra(s) {
  if (!aiOn() || !s.items || !s.items.some((it) => OFF_MICRO.filter((k) => it.values[k] != null).length < 4)) return '';
  return `<div class="ai-box"><button class="pill-btn is-accent" data-a="frank-micros" data-ai>${icon('wand-sparkles')}Mikronährstoffe schätzen</button><p class="hint">Frank ergänzt fehlende Vitamine und Mineralstoffe (als geschätzt markiert). Makros vom Etikett bleiben.</p><p class="hint" id="ai-busy" hidden></p></div>`;
}
async function frankMicros() {
  const s = ui.sheet; if (!s || !s.items) return;
  aiBusy(true, 'Frank schätzt die Mikronährstoffe …');
  try {
    const list = s.items.map((it) => ({ name: it.name, liquid: it.liquid, values: it.values }));
    const out = await aiAsk({ model: 'haiku', system: 'Ergänze für jedes Lebensmittel realistische Mikronährstoffe pro 100 g/ml (deutsche Lebensmitteltabellen). Antworte NUR mit JSON: {"items":[{"name":"…","values":{…}}]} mit den Schlüsseln k, ca, mg, fe, zn, cu, vc, ve, b6, cho (mg); se, i, va, vk, b12, fol, vd (µg); epa, dha, ala (g). Gib nur Werte zurück, die du begründet schätzen kannst.', content: [{ type: 'text', text: JSON.stringify(list) }], max: 1500 });
    const j = aiJSON(out);
    if (!j || !Array.isArray(j.items)) throw new Error('Keine Schätzung erhalten');
    j.items.forEach((x, i) => { const it = s.items[i]; if (!it) return; const v = frankValues(x.values || {}); for (const [k, val] of Object.entries(v)) if (it.values[k] == null && !['kcal', 'p', 'f', 'c', 'sf', 'sug', 'fib', 'na'].includes(k)) { it.values[k] = val; it.est = [...new Set([...(it.est || []), k])]; } });
    if (ui.sheet === s) { renderFrankSheet(); toast('Mikronährstoffe ergänzt (geschätzt)'); }
  } catch (e) { toast(e.message); } finally { aiBusy(false); }
}

/* ---------- Laborbericht per Foto ---------- */
async function labPhoto(file) {
  ui.sheet = { type: 'lab' };
  openSheet(`<h3 class="sheet-title">Laborbericht</h3><p class="hint" id="ai-busy">Frank liest den Bericht …</p>`);
  try {
    const ms = bloodMarkers();
    const sys = `Lies den Laborbericht. Ordne Werte diesen Parametern zu (id: Name, Einheit der App): ${ms.map((m) => `${m.id}: ${m.n} (${m.unit || ''})`).join('; ')}. Rechne in die Einheit der App um, wenn das Labor eine andere nutzt. Antworte NUR mit JSON: {"date":"YYYY-MM-DD","values":{"id":Zahl},"other":[{"name":"…","value":Zahl,"unit":"…"}],"note":"…"}`;
    const out = await aiAsk({ model: 'haiku', system: sys, content: [await aiImage(file, 1800), { type: 'text', text: 'Laborbericht' }], max: 1500 });
    const j = aiJSON(out);
    if (!j || !j.values) throw new Error('Keine Werte erkannt – Foto schärfer oder näher aufnehmen.');
    const vals = {};
    for (const [id, v] of Object.entries(j.values)) { const n = frankNum(v); if (n != null && ms.some((m) => m.id === id)) vals[id] = n; }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(j.date || '') && j.date <= todayKey() ? j.date : todayKey();
    const note = [frankText(j.note, 200), ...(Array.isArray(j.other) ? j.other : []).slice(0, 8).map((o) => `${frankText(o.name, 40)} ${o.value} ${frankText(o.unit, 12)}`)].filter(Boolean).join(' · ');
    sheetBlood(null);
    Object.assign(ui.sheet.e, { date, note, v: vals });
    renderBloodPrefill(ui.sheet.e);
    toast(`${Object.keys(vals).length} Werte erkannt – bitte prüfen und speichern`);
  } catch (e) { const el = $('#ai-busy'); if (el) el.textContent = e.message; }
}
function renderBloodPrefill(e) {
  const d = $('#bl-date'); if (d) d.value = e.date;
  const n = $('#bl-note'); if (n) n.value = e.note || '';
  for (const [id, v] of Object.entries(e.v || {})) { const inp = $(`[data-bl="${id}"]`); if (inp) inp.value = numIn(v, 2); }
}

/* ---------- Kassenbon per Foto → Einkauf/Vorrat ---------- */
async function receiptPhoto(file) {
  ui.sheet = { type: 'receipt' };
  openSheet(`<h3 class="sheet-title">Kassenbon</h3><p class="hint" id="ai-busy">Frank liest den Kassenbon …</p>`);
  try {
    const items = S.shop.items.map((x) => `${x.id}: ${x.n}`).join('\n');
    const out = await aiAsk({ model: 'haiku', system: `Lies den Kassenbon und ordne die Positionen diesen Einkaufsartikeln zu (id: Name). Antworte NUR mit JSON: {"bought":[{"id":"…","line":"Text vom Bon"}],"other":["nicht zuordenbare Positionen"]}. Nur sichere Zuordnungen.\n${items}`, content: [await aiImage(file, 1800), { type: 'text', text: 'Kassenbon' }], max: 1500 });
    const j = aiJSON(out);
    if (!j || !Array.isArray(j.bought)) throw new Error('Kassenbon nicht lesbar – Foto gerade und scharf aufnehmen.');
    const hits = j.bought.filter((b) => S.shop.items.some((x) => x.id === b.id));
    ui.sheet = { type: 'receipt', hits: hits.map((b) => ({ id: b.id, line: frankText(b.line, 60), on: true })), other: (j.other || []).slice(0, 20).map((x) => frankText(x, 50)) };
    renderReceipt();
  } catch (e) { const el = $('#ai-busy'); if (el) el.textContent = e.message; }
}
function renderReceipt() {
  const s = ui.sheet;
  openSheet(`<h3 class="sheet-title">Gekauft laut Kassenbon</h3>
    ${s.hits.length ? `<div class="list">${s.hits.map((h, i) => { const it = S.shop.items.find((x) => x.id === h.id); return `<button class="row-check${h.on ? ' is-on' : ''}" data-a="rc-tgl" data-i="${i}"><span class="tgl-box">${icon('check')}</span><span><b>${esc(it ? it.n : h.id)}</b><small>${esc(h.line)}</small></span></button>`; }).join('')}</div>` : '<p class="hint">Keine Artikel deiner Liste erkannt.</p>'}
    ${s.other.length ? `<p class="hint">Nicht zugeordnet: ${esc(s.other.join(', '))}</p>` : ''}
    <div class="sheet-acts"><button class="btn is-accent" data-a="rc-save">${s.hits.filter((h) => h.on).length} als eingekauft übernehmen</button><button class="btn is-ghost" data-a="sheet-close">Abbrechen</button></div>`);
}

/* ---------- Frag Frank (mit deinen Daten) ---------- */
function sheetAsk() {
  ui.sheet = { type: 'ask', a: null };
  openSheet(`<h3 class="sheet-title">Frag Frank</h3><p class="hint">Frank kennt deinen Wochenbericht (Ernährung, Training, Schlaf, Koffein, Haut, Knie, Gewohnheiten).</p>
    <textarea class="note" id="ask-q" rows="3" placeholder="z. B. Warum war mein Schlaf diese Woche schlechter?"></textarea>
    <div class="sheet-acts"><button class="btn is-accent" data-a="ask-go" data-ai>${icon('send')}Fragen</button></div><p class="hint" id="ai-busy" hidden></p><div id="ask-a"></div>`);
}
async function askGo() {
  const q = (($('#ask-q') || {}).value || '').trim();
  if (!q) { toast('Bitte eine Frage eingeben'); return; }
  aiBusy(true);
  try {
    const rep = frankReportText(weekStart(todayKey()));
    const out = await aiAsk({ model: 'haiku', system: 'Du bist Frank, Ernährungs- und Gewohnheits-Coach. Antworte auf Deutsch, kurz und konkret (höchstens 8 Sätze), mit Bezug auf die Daten. Keine Diagnosen; bei Warnzeichen zum Arzt raten. Unterscheide belegte Empfehlungen von Vermutungen.', content: [{ type: 'text', text: `Meine Daten:\n${rep}\n\nFrage: ${q}` }], max: 900 });
    const el = $('#ask-a'); if (el) el.innerHTML = `<div class="card ask-a">${esc(out).replace(/\n/g, '<br>')}</div>`;
  } catch (e) { toast(e.message); } finally { aiBusy(false); }
}

/* ---------- Wochen-Agent ---------- */
const AGENT_KEYS = {
  'p.lo': { n: 'Eiweiß-Ziel ab', u: 'g', get: () => S.settings.targets.p.lo, set: (v) => { const t = S.settings.targets.p; t.lo = v; if (t.hi < v + 10) t.hi = v + 20; if (t.min > v) t.min = v - 20; }, lim: () => { const w = Number(S.settings.profile.weight) || 85; return [Math.round(w * 1.6), Math.round(w * 2.4)]; } },
  'fluid.lo': { n: 'Trinkziel ab', u: 'ml', get: () => S.settings.targets.fluid.lo, set: (v) => { const t = S.settings.targets.fluid; t.lo = v; if (t.hi < v + 300) t.hi = v + 500; }, lim: () => [2500, 5000] },
  'fib.lo': { n: 'Ballaststoffe ab', u: 'g', get: () => S.settings.targets.fib.lo, set: (v) => { const t = S.settings.targets.fib; t.lo = v; if (t.hi < v + 5) t.hi = v + 10; }, lim: () => [30, 60] },
  'sleep.recMax': { n: 'Schlaf-Ausgleich pro Abend höchstens', u: 'Min.', get: () => sleepAcct().cap, set: (v) => { S.settings.sleep = { ...(S.settings.sleep || {}), recMax: v }; }, lim: () => [0, 180] },
  'sauna.goal': { n: 'Sauna pro Woche', u: 'Min.', get: () => S.settings.sauna.goal, set: (v) => { S.settings.sauna.goal = v; }, lim: () => [30, 120] },
  steps: { n: 'Schrittziel', u: 'Schritte', get: () => stepsGoal(), set: (v) => { S.settings.stepsGoal = v; }, lim: () => [5000, 15000] },
  'phone.social': { n: 'Social Media pro Tag höchstens', u: 'Min.', get: () => phoneCfg().social, set: (v) => { S.settings.phone = { ...phoneCfg(), social: v }; }, lim: () => [0, 120] },
  'phone.total': { n: 'Bildschirmzeit pro Tag höchstens', u: 'Min.', get: () => phoneCfg().total, set: (v) => { S.settings.phone = { ...phoneCfg(), total: v }; }, lim: () => [60, 360] },
};
function agentParams() {
  const p = {};
  for (const [k, x] of Object.entries(AGENT_KEYS)) { const [lo, hi] = x.lim(); p[k] = { name: x.n, value: x.get(), unit: x.u, min: lo, max: hi }; }
  return { params: p, habits: HABITS.map((h) => ({ id: h.id, name: h.n, on: !(S.settings.habitsOff || []).includes(h.id) })), routines: { am: rtCfg().am, day: rtCfg().day, pm: rtCfg().pm }, experiments: Object.entries(EXPS).map(([id, x]) => ({ id, name: x.n })), experimentRunning: expCur() ? expCur().id : null, deloadAdvice: kxDeloadAdvice() ? kxDeloadAdvice().why || 'läuft' : null };
}
const AGENT_SYS = `Du bist Frank, der Wochen-Agent der Protokoll-App. Du bekommst den Wochenbericht und die einstellbaren Werte. Werte die Woche aus, setze 3–5 messbare Ziele für die neue Woche und passe Einstellungen an, wo die Daten es klar nahelegen (lieber wenige, begründete Änderungen; keine Änderung ohne Grund). Antworte NUR mit einem JSON-Codeblock:
{"review":{"good":[],"work":[],"more":[],"less":[],"tips":[]},"goals":[{"area":"…","title":"…","metric":"…","agg":"days|sum|avg|max","cmp":">=|<=","value":…,"need":5,"when":"HH:MM|wake+30|stop-30|bed-60","why":"…","tip":"…","example":"…"}],"changes":[{"key":"p.lo","value":190,"why":"…"},{"key":"habit.atem","value":"off","why":"…"},{"key":"routine.pm.nsdr","value":"add","why":"…"}],"experiment":null,"deload":false,"message":"2–3 Sätze an Dominik, direkt und motivierend"}
Messgrößen (metric): Nährstoffe kcal, p, fatPct, c, sf, fs, sug, fib, na, fluid, upf, alk, ferm, pp, pre, vc, vd, vk, va, ve, b12, fol, b6, mg, zn, fe, se, i, ca, k, cu, cho, o3, plants (agg max); item:<id>, habit:<id>, routine:<id> (IDs in eckigen Klammern im Bericht); tag:whey|milbona|ag1|upf|alkohol (<= 0); caf, caf_last, caf_bed, caf_stop (<= 0), bed_delay, rh_win (Nacht im Schlaffenster, >= 1 mit need); sleepScore, sleepDur, bedTime, wakeTime, hrv, rhr, bbMorning, readiness, stress, steps, hd:lastMeal, hd:screenFree; train, gym, run, run_km, sauna (sum); mob, knee_str, lang, knee_am (avg <=); skin (avg), spots; manual (mit need).
changes.key: einer der Parameter (Wert innerhalb min–max), "habit.<id>" mit "on"/"off", "routine.<am|day|pm>.<schritt-id>" mit "add"/"remove". experiment: null oder {"id":"…"} (nur wenn keins läuft). deload: true, wenn eine leichtere Trainingswoche jetzt sinnvoll ist. Keine Supplement-Dosen, keine medizinischen Ratschläge; Koffein-Regeln (90 Min. nach dem Aufwachen, Stopp je Dosis) bleiben.`;
function agentWeek() {
  const t = todayKey(), wd = weekday(t);
  if (wd === 6 && nowMin() >= 12 * 60) return weekStart(t);
  if (wd <= 1) return addDays(weekStart(t), -7);
  return null;
}
function agentPayload(force) {
  const ws = force || agentWeek();
  if (!ws || (S.reviews[ws] && S.reviews[ws].agent && !force)) return null;
  return { ws, system: AGENT_SYS, report: `${frankReportText(ws)}\n\n## Einstellbare Werte (JSON)\n${JSON.stringify(agentParams())}` };
}
function agentApply(ws, text, src) {
  const j = aiJSON(text);
  if (!j) return false;
  const changes = [];
  for (const c of Array.isArray(j.changes) ? j.changes.slice(0, 8) : []) {
    const key = String(c.key || ''), why = frankText(c.why, 200);
    if (AGENT_KEYS[key]) {
      const x = AGENT_KEYS[key], [lo, hi] = x.lim(), v = frankNum(c.value);
      if (v == null) continue;
      const nv = Math.round(clamp(v, lo, hi)), from = x.get();
      if (nv === from) continue;
      x.set(nv); changes.push({ key, n: x.n, from, to: nv, u: x.u, why });
    } else if (key.startsWith('habit.')) {
      const id = key.slice(6), hb = HABITS.find((h) => h.id === id), off = S.settings.habitsOff || [];
      if (!hb || id === 'koffein') continue;
      const want = String(c.value) === 'off';
      if (off.includes(id) === want) continue;
      S.settings.habitsOff = want ? [...off, id] : off.filter((x) => x !== id);
      changes.push({ key, n: `Gewohnheit „${hb.n}“`, from: want ? 'an' : 'aus', to: want ? 'aus' : 'an', why });
    } else if (key.startsWith('routine.')) {
      const [, part, ...rest] = key.split('.'), id = rest.join('.'), R = rtCfg();
      if (!R[part] || !rtStep(id, todayKey()) && !HABITS.some((h) => h.id === id)) continue;
      const add = String(c.value) === 'add', has = R[part].includes(id);
      if (add === has) continue;
      R[part] = add ? [...R[part], id] : R[part].filter((x) => x !== id);
      changes.push({ key, n: `${{ am: 'Morgenroutine', day: 'Tagsüber', pm: 'Abendroutine' }[part]}: ${(rtStep(id, todayKey()) || {}).n || id}`, from: has ? 'drin' : '–', to: add ? 'drin' : '–', why });
    }
  }
  if (j.experiment && j.experiment.id && !expCur() && expStart(j.experiment.id)) changes.push({ key: 'exp', n: `Experiment „${EXPS[j.experiment.id].n}“ gestartet`, from: '–', to: '14 Tage', why: frankText(j.experiment.why, 200) });
  if (j.deload === true && !deloadOn(todayKey())) { const g = S.settings.gym = S.settings.gym || {}; g.deload = weekStart(todayKey()); g.deloads = [...new Set([...(g.deloads || []), g.deload])]; changes.push({ key: 'deload', n: 'Leichtere Trainingswoche', from: 'normal', to: 'diese Woche', why: '' }); }
  const gl = frankGoalsParse(j), gw = addDays(ws, 7), today = todayKey();
  if (gl && gl.goals.length) { const from = gw === weekStart(today) && today > gw ? today : null; S.reviews[gw] = { ...(S.reviews[gw] || {}), goals: gl.goals.map((g) => (from ? { ...g, from } : g)), goalsAt: new Date().toISOString(), ticks: {}, byAgent: true }; }
  S.reviews[ws] = { ...(S.reviews[ws] || {}), frank: gl && gl.review ? gl.review : (S.reviews[ws] || {}).frank, agent: { at: new Date().toISOString(), src: src || null, changes, msg: frankText(j.message, 400), goals: gl ? gl.goals.length : 0 } };
  markDirty('settings'); markDirty('reviews'); invalidate(); goalSnap = null;
  return true;
}
/* Ergebnis vom Worker holen und anwenden */
let agentChecked = 0;
function agentCheck() {
  if (!aiOn() || Date.now() - agentChecked < 5 * 60000) return;
  agentChecked = Date.now();
  aiFetch('week').then((j) => {
    const w = j && j.week;
    if (!w || !w.ws || !w.text) return;
    const cur = S.reviews[w.ws] && S.reviews[w.ws].agent;
    if (cur && cur.src === w.at) return;
    if (agentApply(w.ws, w.text, w.at)) { const a = S.reviews[w.ws].agent; render(); toast(`Wochen-Agent: ${a.goals} Ziele, ${a.changes.length} Anpassungen`); }
  }).catch(() => {});
}
async function agentRunNow(ws) {
  const p = agentPayload(ws);
  if (!p) return;
  toast('Wochen-Agent wertet aus …');
  try { const text = await aiAsk({ model: 'sonnet', system: p.system, content: [{ type: 'text', text: p.report }], max: 3500 }); if (agentApply(p.ws, text, 'app:' + Date.now())) { render(); const a = S.reviews[p.ws].agent; toast(`Wochen-Agent: ${a.goals} Ziele, ${a.changes.length} Anpassungen`); } else toast('Antwort nicht lesbar – später nochmal'); } catch (e) { toast(e.message); }
}
function agentCard(ws) {
  const a = S.reviews[ws] && S.reviews[ws].agent;
  if (!a) return '';
  return `<section class="card agent-card"><div class="sec-head"><h2>${icon('bot')} Wochen-Agent</h2><span class="count">KW ${isoWeek(ws)}</span></div>${a.msg ? `<p>${esc(a.msg)}</p>` : ''}
    ${a.goals ? `<p class="hint">${a.goals} Wochenziele für KW ${isoWeek(addDays(ws, 7))} gesetzt (Karte „Wochenziele“).</p>` : ''}
    ${a.changes.length ? `<div class="list">${a.changes.map((c, i) => `<div class="ag-row${c.undone ? ' is-undone' : ''}"><span><b>${esc(c.n)}: ${esc(String(c.from))} → ${esc(String(c.to))}${c.u ? ' ' + esc(c.u) : ''}</b>${c.why ? `<small>${esc(c.why)}</small>` : ''}</span>${c.undone ? '<em>zurückgenommen</em>' : AGENT_KEYS[c.key] || c.key.startsWith('habit.') || c.key.startsWith('routine.') ? `<button class="icon-btn sm" data-a="agent-undo" data-ws="${ws}" data-i="${i}" aria-label="Rückgängig">${icon('undo-2')}</button>` : ''}</div>`).join('')}</div>` : '<p class="hint">Keine Einstellungen geändert.</p>'}</section>`;
}
function agentUndo(ws, i) {
  const a = S.reviews[ws] && S.reviews[ws].agent, c = a && a.changes[i];
  if (!c || c.undone) return;
  if (AGENT_KEYS[c.key]) AGENT_KEYS[c.key].set(c.from);
  else if (c.key.startsWith('habit.')) { const id = c.key.slice(6), off = S.settings.habitsOff || []; S.settings.habitsOff = c.from === 'aus' ? [...new Set([...off, id])] : off.filter((x) => x !== id); }
  else if (c.key.startsWith('routine.')) { const [, part, ...rest] = c.key.split('.'), id = rest.join('.'), R = rtCfg(); R[part] = c.from === 'drin' ? [...new Set([...R[part], id])] : R[part].filter((x) => x !== id); }
  c.undone = true;
  markDirty('settings'); markDirty('reviews'); invalidate(); render(); toast('Zurückgenommen');
}
/* Kontext fürs Morgen-Briefing (Worker) */
function briefCtx() {
  const days = {};
  for (const k of [todayKey(), addDays(todayKey(), 1)]) {
    const r = rhythm(k), wp = weekPlan(weekStart(k)).days[weekday(k)], g = wp && wp.items.find((x) => x.kind === 'gym' && !x.done);
    const used = cafUsedIds(), st = cafStops(k).filter((x) => !used.size || used.has(x.id)).slice(0, 3);
    const arm = expArm(k), e = expCur();
    days[k] = { need: sleepBaseNeed(k), hrvBase: hrvRange(k), gym: g ? g.n : null, stops: st.map((x) => ({ n: x.n.replace(/\s*\d+\s*ml$/i, ''), stop: x.stop })), bed: r.bed + (r.rec || 0), recMax: sleepAcct(k).cap, nap: napWindow(k), exp: arm && e ? `Experiment heute: ${arm === 'A' ? EXPS[e.id].a : EXPS[e.id].b}.` : null };
  }
  return { v: 1, days };
}
/* ---------- Einstellungen → KI & Hintergrund ---------- */
function setKiHTML() {
  if (!pushOn()) return '<p class="hint">Zuerst „Mitteilungen“ einrichten – Frank-KI und Garmin im Hintergrund laufen über dieselbe Weiterleitung.</p>';
  const s = AIST || {};
  const ok = (b) => (b ? `<em class="est is-ok">${icon('check')} aktiv</em>` : '<em class="est">fehlt</em>');
  return `<div class="list"><div class="row is-static"><span class="row-main"><b>Weiterleitung</b><small>${s.v ? `Version ${s.v}` : s.err ? esc(s.err) : 'wird geprüft …'}</small></span>${s.v >= 4 ? ok(true) : '<em class="est">v4 nötig</em>'}</div>
    <div class="row is-static"><span class="row-main"><b>Frank-KI (Claude)</b><small>${s.ai ? `diesen Monat ${fmt((s.usd || 0), 3)} $ von ${fmt(s.budget || 1, 2)} $` : 'Geheimnis ANTHROPIC_API_KEY'}</small></span>${ok(s.ai)}</div>
    <div class="row is-static"><span class="row-main"><b>Garmin im Hintergrund</b><small>${s.garmin ? (s.brief ? `Briefing zuletzt ${esc(s.brief.date)}` : 'Morgen-Briefing aktiv') : 'Geheimnis GARMIN_KEY'}</small></span>${ok(s.garmin)}</div></div>
    <h5>Einrichten (einmal, ca. 10 Min.)</h5><ol class="steps-ol">
      <li>Neuen Worker-Code kopieren (Version 4): Einstellungen → Garmin Connect → „Code kopieren“, in Cloudflare im Worker einfügen und „Deploy“.</li>
      <li>Claude-API-Schlüssel: auf console.anthropic.com anmelden, unter Billing ein kleines Guthaben aufladen und ein Ausgabenlimit setzen, unter API Keys einen Schlüssel erstellen.</li>
      <li>Cloudflare → dein Worker → Einstellungen → Variablen und Geheimnisse → Hinzufügen → Typ „Geheimnis“: Name ANTHROPIC_API_KEY, Wert = dein Schlüssel. Optional AI_BUDGET_USD (Standard 1).</li>
      <li>Für Garmin im Hintergrund genauso: Geheimnis GARMIN_KEY = derselbe Garmin-Schlüssel wie in der App.</li>
      <li>Zurück in der App „Status prüfen“ antippen.</li></ol>
    <p class="hint">Kosten: Fotos und Fragen mit Claude Haiku 5.5 (0,10 $ pro Million Eingabe-Token), der Wochen-Agent mit Sonnet 5.5. Bei normaler Nutzung deutlich unter 1 € im Monat; das Budget im Worker stoppt bei 1 $. Deine Daten gehen dafür an Anthropic (Bericht, Fotos), der Schlüssel bleibt in Cloudflare.</p>
    <div class="row-btns"><button class="pill-btn" data-a="ai-status">${icon('refresh-cw')}Status prüfen</button>${s.ai ? `<button class="pill-btn" data-a="agent-run">${icon('bot')}Woche jetzt auswerten</button><button class="pill-btn" data-a="ask-open">${icon('message-circle')}Frag Frank</button>` : ''}</div>`;
}
Object.assign(A, {
  'frank-ai': () => { const q = (($('#frank-q') || {}).value || '').trim(); if (!q) { toast('Kurz beschreiben, was du gegessen hast'); return; } frankAI(q, null); },
  'frank-micros': () => frankMicros(),
  'ask-open': () => sheetAsk(),
  'ask-go': () => askGo(),
  'ai-status': () => aiRefresh(true).then(() => { render(); const s = AIST || {}; toast(s.err ? s.err : `Frank-KI ${s.ai ? 'aktiv' : 'fehlt'} · Garmin im Hintergrund ${s.garmin ? 'aktiv' : 'fehlt'}`); }),
  'agent-run': () => { const ws = agentWeek() || addDays(weekStart(todayKey()), weekday(todayKey()) >= 4 ? 0 : -7); if (S.reviews[ws] && S.reviews[ws].agent) delete S.reviews[ws].agent; agentRunNow(ws); },
  'agent-undo': (el) => agentUndo(el.dataset.ws, Number(el.dataset.i)),
  'rc-tgl': (el) => { const h = ui.sheet.hits[Number(el.dataset.i)]; h.on = !h.on; renderReceipt(); },
  'rc-save': () => { const hs = ui.sheet.hits.filter((h) => h.on); closeSheet(); for (const h of hs) A['shop-check']({ dataset: { id: h.id } }); toast(`${hs.length} Artikel eingekauft`); },
});
Object.assign(C, {
  'frank-photo': (el) => { const f = el.files && el.files[0]; if (f) frankAI((($('#frank-q') || {}).value || '').trim(), f); el.value = ''; },
  'lab-photo': (el) => { const f = el.files && el.files[0]; if (f) labPhoto(f); el.value = ''; },
  'receipt-photo': (el) => { const f = el.files && el.files[0]; if (f) receiptPhoto(f); el.value = ''; },
});
