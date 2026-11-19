/* ============================================================
   BUNDESLEBENSMITTELSCHLÜSSEL 4.0 (seit 2.19)
   Quelle: Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe.
   Kostenfrei und ohne Lizenzbarrieren, ausdrücklich auch für App-Entwicklung (Dokumentation 9.3).
   bls40.json (tools/bls_build.py: rund 7.100 Lebensmittel, die ca. 30 Nährstoffe der App pro 100 g) lädt bei der
   ersten Suche und bleibt danach offline gespeichert (eigener Cache im Service Worker, übersteht Updates).
   - Suche (Ernährung → Lebensmittel, Posten hinzufügen): eigene Treffer zuerst, darunter der BLS.
     Antippen öffnet das Eintragen-Fenster; gespeichert (id bls_<Code>) wird das Lebensmittel erst beim Eintragen.
   - Bestehende Lebensmittel einzeln umstellen: Lebensmittel bearbeiten → „Mit BLS 4.0 abgleichen“ → Vergleich →
     übernehmen. Übernommen werden nur Werte, die der BLS hat; Selen, Cholin, Koffein, Pflanzen und Punkte bleiben.
   ============================================================ */
/*icons: database*/
const BLS_SRC = 'Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe.';
const BLS_FILE = './bls40.json';
const BLS_CAT = { B: 'Getreide & Brot', C: 'Getreide & Brot', D: 'Süßes & Snacks', F: 'Obst', G: 'Gemüse', K: 'Gemüse', M: 'Eier & Milch', N: 'Getränke', P: 'Getränke', Q: 'Öle & Fette', R: 'Kräuter & Gewürze', S: 'Süßes & Snacks', T: 'Fleisch & Fisch', U: 'Fleisch & Fisch', V: 'Fleisch & Fisch', W: 'Fleisch & Fisch', X: 'Fertiggerichte', Y: 'Fertiggerichte' };
const BLS_CMP = ['kcal', 'p', 'f', 'sf', 'c', 'sug', 'fib', 'na', 'k', 'ca', 'mg', 'fe', 'zn', 'i', 'cu', 'vc', 'vd', 'va', 've', 'vk', 'b12', 'fol', 'b6', 'epa', 'dha'];
let BLS = null, blsLoading = null, blsErr = null;

function blsFold(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss'); }
function blsLoad() {
  if (BLS) return Promise.resolve(BLS);
  if (!blsLoading) {
    blsLoading = fetch(BLS_FILE).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then((j) => {
      if (!j || !Array.isArray(j.k) || !Array.isArray(j.d)) throw new Error('Datei unvollständig');
      BLS = { k: j.k, src: j.src || BLS_SRC, rows: j.d, by: new Map(), idx: j.d.map((r) => blsFold(r[1])), ik: j.k.indexOf('kcal'), ip: j.k.indexOf('p') };
      j.d.forEach((r, i) => BLS.by.set(r[0], i));
      blsErr = null;
      return BLS;
    }).catch((e) => { blsLoading = null; blsErr = (e && e.message) || String(e); throw e; });
  }
  return blsLoading;
}
function blsExtra(r) { const x = r[2 + BLS.k.length]; return x && typeof x === 'object' ? x : {}; }
/* Treffer: alle Wörter im Namen; Namensanfang und „roh“ zuerst, Gerichte (X, Y) nach hinten */
function blsSearch(q, n = 60) {
  if (!BLS) return [];
  const words = blsFold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const w0 = words[0], hits = [];
  for (let i = 0; i < BLS.rows.length; i++) {
    const nm = BLS.idx[i];
    if (!words.every((w) => nm.includes(w))) continue;
    let sc = nm.length;
    if (nm.startsWith(w0)) sc -= /^[^ ,/(]+/.exec(nm)[0] === w0 ? 260 : 200; else if (nm.includes(' ' + w0) || nm.includes('/' + w0)) sc -= 80;
    if (/\broh\b/.test(nm)) sc -= 15;
    if ('XY'.includes(BLS.rows[i][0][0])) sc += 120;
    hits.push([sc, i]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  return hits.slice(0, n).map(([, i]) => BLS.rows[i]);
}
/* BLS-Zeile → Lebensmittel der App (Werte pro 100 g bzw. 100 ml) */
function blsFood(r) {
  const x = blsExtra(r), v = {};
  BLS.k.forEach((k, j) => { const val = r[2 + j]; if (val != null && val !== 0) v[k] = val; });
  if (x.fs) v.fs = x.fs;
  const code = r[0], L = code[0];
  let cat = BLS_CAT[L] || 'Eigene';
  if (L === 'E') cat = code[1] === '1' ? 'Eier & Milch' : 'Getreide & Brot';
  if (L === 'H') cat = '1234'.includes(code[1]) ? 'Nüsse & Samen' : '56'.includes(code[1]) ? 'Gemüse' : 'Hülsenfrüchte & Soja';
  const f = { id: 'bls_' + code, n: r[1], cat, u: [[x.fl ? 'ml' : 'g', 1]], v, bls: code };
  if (x.fl) f.fl = x.fl;
  if (x.pl) f.pl = x.pl;
  if (x.upf) f.tags = ['upf'];
  return f;
}
function blsRegister(code) {
  const i = BLS ? BLS.by.get(code) : null;
  if (i == null) return null;
  const id = 'bls_' + code;
  if (!FOOD[id]) { FOOD_RT[id] = blsFood(BLS.rows[i]); buildFoodIndex(); }
  return id;
}
/* Erst beim Eintragen bzw. Übernehmen in den Standardtag dauerhaft speichern */
function blsPersist(id) {
  if (!id || !/^bls_/.test(id) || S.foods.custom.some((f) => f.id === id) || !FOOD_RT[id]) return;
  S.foods.custom.push(clone(FOOD_RT[id]));
  delete FOOD_RT[id];
  markDirty('foods'); buildFoodIndex();
}
function blsRow(r, act) {
  const liquid = !!blsExtra(r).fl;
  return `<button class="row" data-a="${act}" data-code="${esc(r[0])}"><span class="row-main"><b>${esc(r[1])}</b><small>${fmt(r[2 + BLS.ik] || 0)} kcal, ${fmt(r[2 + BLS.ip] || 0, 1)} g Protein pro 100 ${liquid ? 'ml' : 'g'}</small></span>${icon(act === 'bls-pick' ? 'chevron-right' : 'plus', 'row-ic')}</button>`;
}
/* Treffer-Liste für die Suche (mode search), Posten hinzufügen (pick) oder den Abgleich (match) */
function blsResultsHTML(q, mode = 'search') {
  q = String(q || '').trim();
  if (q.length < 2) return '';
  if (!BLS) {
    blsLoad().then(() => blsRefresh(mode), () => blsRefresh(mode));
    return blsErr
      ? `<p class="hint bls-note">${icon('database')}Amtliche Nährwerte (BLS 4.0) gerade nicht erreichbar. Beim ersten Mal braucht die Suche Internet, danach geht sie offline.</p>`
      : `<p class="hint bls-note">${icon('database')}Lade amtliche Nährwerte (BLS 4.0) …</p>`;
  }
  const list = blsSearch(q, 60).filter((r) => mode === 'match' || !FOOD['bls_' + r[0]] || FOOD_RT['bls_' + r[0]]);
  if (!list.length) return mode === 'match' ? `<p class="hint">Im BLS nichts gefunden für „${esc(q)}“. Anders formulieren, z. B. nur das Hauptwort.</p>` : '';
  const show = list.slice(0, ui.exp.has('bls:' + mode) ? 60 : 12);
  const act = mode === 'pick' ? 'pe-pick-bls' : mode === 'match' ? 'bls-pick' : 'bls-open';
  return `<h4 class="meal-h bls-h">Bundeslebensmittelschlüssel (BLS 4.0) <small>Max Rubner-Institut</small></h4>
    <div class="list">${show.map((r) => blsRow(r, act)).join('')}</div>
    ${list.length > show.length ? `<button class="link-btn" data-a="bls-more" data-mode="${mode}">${list.length > 59 ? 'Mehr' : list.length - show.length + ' weitere'} anzeigen</button>` : ''}`;
}
function blsRefresh(mode) {
  if (mode === 'search') { const r = $('#results'); if (r && ui.q.trim().length >= 2) r.innerHTML = searchResults(); }
  else if (mode === 'pick') { const r = $('#pick-res'), inp = $('[data-i="pick-search"]'); if (r) r.innerHTML = pickResults(inp ? inp.value : ''); }
  else if (mode === 'match') { const r = $('#bls-res'); if (r && ui.sheet && ui.sheet.type === 'blsmatch') r.innerHTML = blsResultsHTML(ui.sheet.q, 'match'); }
}

/* ---------- Bestehendes Lebensmittel mit dem BLS abgleichen ---------- */
function blsGuess(n) {
  const w = String(n || '').split(/[(,]/)[0].replace(/\b(natur|frisch|gekocht|TK|Bio)\b/gi, ' ').trim().split(/\s+/).filter(Boolean);
  return w.slice(0, 2).join(' ');
}
function sheetBlsMatch(fid, q) {
  const f = FOOD[fid]; if (!f) return;
  const q0 = q != null ? q : blsGuess(f.n);
  ui.sheet = { type: 'blsmatch', fid, q: q0 };
  openSheet(`<h3 class="sheet-title">Mit BLS 4.0 abgleichen</h3>
    <p class="hint">${esc(f.n)}: passenden Eintrag aus dem Bundeslebensmittelschlüssel wählen. Danach siehst du den Vergleich und entscheidest.</p>
    <div class="search"><span>${icon('search')}</span><input type="search" data-i="bls-q" value="${esc(q0)}" autocomplete="off" enterkeyhint="search" placeholder="BLS durchsuchen"></div>
    <div id="bls-res">${blsResultsHTML(q0, 'match')}</div>
    <div class="sheet-acts"><button class="btn is-ghost" data-a="food-edit" data-id="${esc(fid)}">Zurück</button></div>`);
}
function blsVal(r, k) { const j = BLS.k.indexOf(k); return j >= 0 ? r[2 + j] : null; }
function sheetBlsCmp(fid, code) {
  const f = FOOD[fid], i = BLS ? BLS.by.get(code) : null;
  if (!f || i == null) return;
  const r = BLS.rows[i], q = ui.sheet && ui.sheet.q;
  ui.sheet = { type: 'blscmp', fid, code, q };
  const show = (k, v) => (v == null ? '–' : fmt(k === 'vd' ? v * 40 : v, NUTRIENTS[k].d));
  const rows = BLS_CMP.map((k) => {
    const a = f.v[k] || 0, b = blsVal(r, k), m = NUTRIENTS[k];
    const diff = b != null && Math.abs(a - b) > Math.max(Math.abs(a), Math.abs(b)) * 0.2 && Math.abs(a - b) * (k === 'vd' ? 40 : 1) >= Math.pow(10, -m.d);
    return `<tr${diff ? ' class="is-diff"' : ''}><td>${esc(m.n)} <small>${esc(m.u)}</small></td><td>${show(k, a)}</td><td>${show(k, b)}</td></tr>`;
  }).join('');
  openSheet(`<h3 class="sheet-title">${esc(f.n)}</h3>
    <p class="hint">Pro 100 ${isLiquid(f) ? 'ml' : 'g'}: deine bisherigen Werte und BLS 4.0 „${esc(r[1])}“ (${esc(r[0])}). Markiert: mehr als 20 % Unterschied.</p>
    <div class="table-wrap"><table class="bls-cmp"><thead><tr><th>Nährstoff</th><th>Bisher</th><th>BLS</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="hint">Übernommen werden nur Werte, die der BLS hat (– = kein BLS-Wert). Selen, Cholin, Koffein, Pflanzen und Punkte bleiben.${FOODS.some((x) => x.id === fid) ? ' Zurück geht es jederzeit über „Auf Originalwerte zurücksetzen“.' : ''}</p>
    <div class="sheet-acts"><button class="btn is-accent" data-a="bls-apply">BLS-Werte übernehmen</button><button class="btn is-ghost" data-a="bls-back">Anderen BLS-Eintrag wählen</button></div>`);
}
function blsApply(fid, code) {
  const f = FOOD[fid], i = BLS ? BLS.by.get(code) : null;
  if (!f || i == null) return false;
  const r = BLS.rows[i], nv = {};
  BLS.k.forEach((k, j) => { const val = r[2 + j]; if (val != null) nv[k] = val; });
  const x = blsExtra(r);
  if (x.fs != null) nv.fs = x.fs; // freier Zucker nur, wenn der BLS-Eintrag einen hat (Süßes, Gebäck, Getränke)
  const orig = FOODS.find((o) => o.id === fid);
  if (orig) {
    const over = clone(S.foods.over[fid] || {});
    over.v = { ...(over.v || {}) };
    for (const [k, val] of Object.entries(nv)) { if (Math.abs((orig.v[k] || 0) - val) > 1e-9) over.v[k] = val; else delete over.v[k]; }
    if (!Object.keys(over.v).length) delete over.v;
    over.bls = code;
    S.foods.over[fid] = over;
  } else {
    const c = S.foods.custom.find((o) => o.id === fid);
    if (!c) return false;
    c.v = { ...(c.v || {}), ...nv };
    for (const k of Object.keys(c.v)) if (!c.v[k]) delete c.v[k];
    c.bls = code;
  }
  markDirty('foods'); buildFoodIndex(); invalidate();
  return true;
}

Object.assign(A, {
  'bls-open': (el) => { const id = blsRegister(el.dataset.code); if (id) sheetFood(id, ui.date); },
  'bls-more': (el) => { ui.exp.add('bls:' + el.dataset.mode); blsRefresh(el.dataset.mode); },
  'pe-pick-bls': (el) => { const id = blsRegister(el.dataset.code); if (!id) return; blsPersist(id); A['pe-pick']({ dataset: { id } }); },
  'bls-match': (el) => sheetBlsMatch(el.dataset.id),
  'bls-pick': (el) => { if (ui.sheet && ui.sheet.fid) sheetBlsCmp(ui.sheet.fid, el.dataset.code); },
  'bls-back': () => { const s = ui.sheet; if (s && s.fid) sheetBlsMatch(s.fid, s.q); },
  'bls-apply': () => {
    const s = ui.sheet; if (!s || s.type !== 'blscmp') return;
    if (!blsApply(s.fid, s.code)) { toast('Übernehmen ging nicht'); return; }
    closeSheet(); render(); toast('BLS-Werte übernommen');
  },
});
I['bls-q'] = (el) => { if (!ui.sheet || ui.sheet.type !== 'blsmatch') return; ui.sheet.q = el.value; const r = $('#bls-res'); if (r) r.innerHTML = blsResultsHTML(el.value, 'match'); };
/* Eintragen eines BLS-Lebensmittels speichert es dauerhaft (nur bei gültiger Menge) */
const _blsEntrySave = A['entry-save'];
A['entry-save'] = (el) => {
  const s = ui.sheet;
  if (s && s.type === 'food' && /^bls_/.test(s.fid || '')) { const food = FOOD[s.fid]; if (food && s.amt * unitG(food, s.unit) > 0) blsPersist(s.fid); }
  return _blsEntrySave(el);
};
