/* ============================================================
   FRANK: Nährwerte aus dem Claude-Chat übernehmen
   Frank ist ein Claude-Skill. Er recherchiert ein Lebensmittel,
   schätzt fehlende Werte und gibt einen Code aus:
   {"app":"protokoll-frank","v":1,"items":[{name, values, …}]}
   Die App liest nur bekannte Felder; alles bleibt auf dem Gerät.
   ============================================================ */
const FRANK_TAGS = ['upf', 'whey', 'milbona', 'alkohol', 'ag1'];
const FRANK_MEALS = {
  fruehstueck: 'fruehstueck', 'frühstück': 'fruehstueck', breakfast: 'fruehstueck',
  mittag: 'mittag', mittagessen: 'mittag', lunch: 'mittag',
  nachmittag: 'nachmittag',
  abend: 'abend', abendessen: 'abend', dinner: 'abend',
  snack: 'snack', zwischenmahlzeit: 'snack',
  getraenke: 'getraenke', 'getränke': 'getraenke', getraenk: 'getraenke', 'getränk': 'getraenke', drink: 'getraenke',
};
const FRANK_ALIAS = {
  energie: 'kcal', energy: 'kcal', kalorien: 'kcal', calories: 'kcal', protein: 'p', eiweiss: 'p', 'eiweiß': 'p',
  fett: 'f', fat: 'f', saturated: 'sf', kohlenhydrate: 'c', carbs: 'c', carbohydrates: 'c', zucker: 'sug', sugar: 'sug', sugars: 'sug',
  ballaststoffe: 'fib', fiber: 'fib', fibre: 'fib', natrium: 'na', sodium: 'na', kalium: 'k', potassium: 'k', kalzium: 'ca', calcium: 'ca',
  magnesium: 'mg', eisen: 'fe', iron: 'fe', zink: 'zn', zinc: 'zn', selen: 'se', selenium: 'se', jod: 'i', iod: 'i', iodine: 'i',
  kupfer: 'cu', copper: 'cu', cholin: 'cho', choline: 'cho', folat: 'fol', folate: 'fol', koffein: 'caf', caffeine: 'caf', alkohol: 'alk', alcohol: 'alk',
};
const FRANK_MAX = { kcal: 950, p: 100, f: 100, sf: 100, c: 100, sug: 100, fs: 100, fib: 100, alk: 100, epa: 100, dha: 100, ala: 100 };

/* ---------- Code lesen ---------- */
function frankNum(x) {
  if (x == null || x === '') return null;
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  const m = String(x).replace(/\s/g, '').replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
function frankText(x, max) { return x == null ? '' : String(x).replace(/\s+/g, ' ').trim().slice(0, max); }
function frankNorm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim(); }
function frankKey(k) { const s = String(k || '').trim(); return EDIT_KEYS.includes(s) ? s : FRANK_ALIAS[s.toLowerCase()] || s.toLowerCase(); }
function frankDate(x) {
  const s = String(x || '').trim().toLowerCase(), today = todayKey();
  if (!s) return null;
  if (s === 'heute' || s === 'today') return today;
  if (s === 'gestern' || s === 'yesterday') return addDays(today, -1);
  if (s === 'vorgestern') return addDays(today, -2);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s) && s <= today && s >= addDays(today, -60)) return s;
  return null;
}
function frankValues(src) {
  const v = {};
  if (!src || typeof src !== 'object') return v;
  let salt = null;
  for (const [rk, rv] of Object.entries(src)) {
    const k = frankKey(rk);
    if (k === 'salz' || k === 'salt') { salt = frankNum(rv); continue; }
    if (!EDIT_KEYS.includes(k)) continue;
    const n = frankNum(rv);
    if (n == null || n < 0) continue;
    v[k] = Math.min(n, FRANK_MAX[k] || 100000);
  }
  if (v.na == null && salt != null && salt > 0) v.na = Math.round(salt * 400);
  if (v.kcal == null && (v.p || v.f || v.c)) v.kcal = Math.round(4 * (v.p || 0) + 4 * (v.c || 0) + 9 * (v.f || 0) + 2 * (v.fib || 0) + 7 * (v.alk || 0));
  for (const k of Object.keys(v)) if (!(v[k] > 0)) delete v[k];
  return v;
}
function frankItem(r, cats, parent) {
  if (!r || typeof r !== 'object') return null;
  const name = frankText(r.name || r.n || r.produkt, 80);
  const rawV = r.values || r.v || r.naehrwerte || r.nutrients;
  if (!name || !rawV || typeof rawV !== 'object') return null;
  const values = frankValues(rawV);
  const fluidN = frankNum(r.fluid);
  const liquid = r.liquid === true || String(r.liquid).toLowerCase() === 'true' || (fluidN != null && fluidN > 0);
  const base = liquid ? 'ml' : 'g';
  const fluid = liquid ? Math.min(100, Math.max(1, fluidN > 0 ? fluidN : 100)) : 0;
  let portion = null;
  const p = r.portion && typeof r.portion === 'object' ? r.portion : null;
  if (p) {
    const pn = frankText(p.name || p.n || p.einheit, 30), ps = frankNum(p.size ?? p.g ?? p.ml ?? p.menge);
    if (pn && ps > 0 && !/^(g|ml|gramm|milliliter)$/i.test(pn)) {
      const size = Math.round(ps * 10) / 10;
      portion = { name: pn, size, label: /\(/.test(pn) ? pn : `${pn} (${fmt(size, size % 1 ? 1 : 0)} ${base})` };
    }
  }
  const units = (portion ? [portion.label] : []).concat([base]);
  const e = r.eaten && typeof r.eaten === 'object' ? r.eaten : {};
  let amt = frankNum(e.amount ?? e.menge ?? e.anzahl), unit = frankText(e.unit || e.einheit, 30), guess = false;
  if (e.g != null || e.ml != null) { amt = frankNum(e.g ?? e.ml); unit = base; }
  const ul = unit.toLowerCase();
  if (/^(g|ml|gramm|milliliter)$/.test(ul)) unit = base;
  else if (portion && (!ul || ul === portion.label.toLowerCase() || ul.startsWith(portion.name.toLowerCase()) || portion.name.toLowerCase().startsWith(ul))) unit = portion.label;
  else if (portion) unit = portion.label;
  else { if (ul) guess = true; unit = base; if (guess) amt = 100; }
  if (!(amt > 0)) { amt = portion ? 1 : 100; unit = portion ? portion.label : base; }
  const catIn = frankText(r.cat || r.kategorie, 40);
  const list = (x) => (Array.isArray(x) ? x : []);
  const tm = String(r.time || parent.time || '').trim();
  return {
    name, base, liquid, fluid, portion, units, amt: Math.round(amt * 100) / 100, unit, guess, values,
    cat: cats.includes(catIn) ? catIn : liquid ? 'Getränke' : 'Eigene',
    est: [...new Set(list(r.estimated).map(frankKey).filter((k) => EDIT_KEYS.includes(k)))],
    tags: [...new Set(list(r.tags).map((x) => String(x).toLowerCase().trim()).filter((x) => FRANK_TAGS.includes(x)))],
    plants: list(r.plants).map((x) => frankText(x, 30)).filter(Boolean).slice(0, 12),
    sources: list(r.sources).map((x) => String(x).trim()).filter((x) => /^https?:\/\/[^\s"'<>]+$/i.test(x)).slice(0, 6),
    pp: Math.min(60, Math.max(0, frankNum(r.pp) || 0)),
    pre: Math.min(60, Math.max(0, frankNum(r.pre) || 0)),
    ferm: Math.min(1000, Math.max(0, frankNum(r.ferm) || 0)),
    meal: FRANK_MEALS[String(r.meal || parent.meal || '').toLowerCase().trim()] || null,
    date: frankDate(r.date || parent.date),
    time: /^([01]?\d|2[0-3]):[0-5]\d$/.test(tm) ? tm.padStart(5, '0') : null,
    note: frankText(r.note, 300),
  };
}
function frankNormalize(o) {
  if (!o || typeof o !== 'object') return [];
  const raw = Array.isArray(o) ? o : Array.isArray(o.items) ? o.items : [o];
  const parent = Array.isArray(o) ? {} : o;
  const cats = [...new Set(Object.values(FOOD).map((f) => f.cat))];
  return raw.slice(0, 12).map((r) => frankItem(r, cats, parent)).filter(Boolean);
}
/* Code aus dem eingefügten Text holen: Codeblock, ganze Antwort oder nur JSON.
   Ergebnis: Lebensmittel (kind foods) oder Wochenziele (kind goals) */
function frankParseAny(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  const cands = [];
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cands.push(fence[1]);
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) cands.push(t.slice(a, b + 1));
  const tries = cands.concat(cands.map((c) => c.replace(/[“”„]/g, '"')));
  for (const c of tries) {
    let o = null;
    try { o = JSON.parse(c); } catch (e) { o = null; }
    if (!o) continue;
    const gl = frankGoalsParse(o);
    if (gl) return { kind: 'goals', data: gl };
    const items = frankNormalize(o);
    if (items.length) return { kind: 'foods', items };
  }
  return null;
}
function frankParse(text) { const r = frankParseAny(text); return r && r.kind === 'foods' ? r.items : null; }

/* ---------- Lebensmittel bauen ---------- */
function frankTmpFood(it) {
  const f = { id: '_frank', n: it.name, cat: it.cat, v: it.values, u: it.portion ? [[it.portion.label, it.portion.size], [it.base, 1]] : [[it.base, 1]] };
  if (it.liquid) f.fl = it.fluid;
  if (it.tags.length) f.tags = it.tags.slice();
  if (it.plants.length) f.pl = it.plants.length === 1 ? it.plants[0] : it.plants.slice();
  if (it.pp > 0) f.pp = it.pp;
  if (it.pre > 0) f.pre = it.pre;
  if (it.ferm > 0) f.ferm = it.ferm;
  return f;
}
function frankFood(it, id) {
  const f = frankTmpFood(it);
  f.id = id || 'c_' + uid();
  f.v = { ...it.values };
  if (['kcal', 'p', 'f', 'c'].some((k) => it.est.includes(k))) f.est = true;
  f.frank = { at: todayKey(), est: it.est.slice(), src: it.sources.slice(), note: it.note };
  return f;
}
function frankGrams(it) { return it.amt * unitG(frankTmpFood(it), it.unit); }
function frankStamp(k, time) {
  if (time) { const [h, m] = time.split(':').map(Number); const d = new Date(k + 'T00:00:00'); d.setHours(h, m, 0, 0); return d.getTime(); }
  return k === todayKey() ? Date.now() : new Date(k + 'T12:00:00').getTime();
}
function frankMealAt(t) { const n = timeToMin(t); return n < 660 ? 'fruehstueck' : n < 900 ? 'mittag' : n < 1110 ? 'nachmittag' : 'abend'; }
function frankHost(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'Link'; } }
function frankSrcLinks(src) { return (src || []).map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(frankHost(u))}</a>`).join(', '); }

/* ---------- Sheet ---------- */
function frankAskText(q) { return ('Frank: ' + String(q || '').trim()).trim(); }
function frankClaudeUrl(q) { return 'https://claude.ai/new?q=' + encodeURIComponent(frankAskText(q)); }
function sheetFrank(q, k) {
  ui.sheet = { type: 'frank', step: 'ask', q: q || '', k: k > todayKey() ? todayKey() : k || todayKey(), items: null, meal: null, more: new Set() };
  renderFrankSheet();
}
function renderFrankSheet() {
  const s = ui.sheet;
  if (!s || s.type !== 'frank') return;
  if (s.step === 'preview') { renderFrankPreview(); return; }
  if (s.step === 'report') { renderReportStep(); return; }
  if (s.step === 'goals') { renderGoalsStep(); return; }
  openSheet(`<h3 class="sheet-title">Frank</h3>
    <p class="hint">Frank recherchiert im Claude-Chat die Nährwerte (Etikett, Hersteller, Datenbanken) und schätzt, was fehlt. Du bekommst einen Code, den du hier einfügst.</p>
    <div class="frank-step"><span class="frank-n">1</span><div class="frank-body"><b>Frank fragen</b>
      <input type="text" class="frank-in" id="frank-q" data-i="frank-q" value="${esc(s.q)}" placeholder="z. B. Milbona Protein Shake, 1 Flasche" autocomplete="off" enterkeyhint="done">
      <a class="btn" id="frank-go" href="${esc(frankClaudeUrl(s.q))}" target="_blank" rel="noopener" data-copy="${esc(frankAskText(s.q))}">${icon('message-circle')}Kopieren und Claude öffnen</a>
      <p class="hint">Geht Claude im Browser statt in der App auf: Claude-App öffnen und den kopierten Text einfügen.</p></div></div>
    <div class="frank-step"><span class="frank-n">2</span><div class="frank-body"><b>Code von Frank einfügen</b>
      <textarea class="note frank-code" id="frank-code" rows="3" data-i="frank-code" placeholder="Code hier einfügen" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
      <button class="btn is-accent" data-a="frank-paste">${icon('clipboard-paste')}Code einfügen</button>
      <p class="frank-err" id="frank-err" hidden></p></div></div>`);
}
function frankRerender() {
  const old = $('#sheet .sheet'), top = old ? old.scrollTop : 0;
  renderFrankSheet();
  const n = $('#sheet .sheet');
  if (n) { n.classList.add('still'); n.scrollTop = top; }
}
function frankErr(msg) { const el = $('#frank-err'); if (el) { el.textContent = msg; el.hidden = false; } else toast(msg); }
function frankTry(text, loud) {
  const s = ui.sheet;
  if (!s || s.type !== 'frank') return false;
  const res = frankParseAny(text);
  if (!res) {
    if (loud || String(text || '').trim().length > 30) frankErr('Kein Frank-Code erkannt. Kopiere in Claude den ganzen Codeblock (Kopieren-Symbol am Block).');
    return false;
  }
  if (res.kind === 'goals') {
    /* Ziele gelten für die Woche aus dem Code, sonst für die Woche nach dem Bericht (frühestens diese Woche) */
    const cur = weekStart(todayKey()), w = res.data.week;
    const after = s.ws ? addDays(s.ws, 7) : weekday(todayKey()) === 6 ? addDays(cur, 7) : cur;
    s.goals = res.data; s.step = 'goals';
    s.gw = w && w >= cur && w <= addDays(cur, 7) ? w : after < cur ? cur : after;
    renderFrankSheet();
    return true;
  }
  const items = res.items;
  for (const it of items) { const ex = S.foods.custom.find((x) => frankNorm(x.n) === frankNorm(it.name)); it.exId = ex ? ex.id : null; }
  s.items = items; s.step = 'preview'; s.more = new Set();
  const d0 = items.find((x) => x.date);
  if (d0) s.k = d0.date;
  const m0 = items.find((x) => x.meal), t0 = items.find((x) => x.time);
  s.meal = m0 ? m0.meal : t0 ? frankMealAt(t0.time) : s.k === todayKey() ? defaultMeal() : 'snack';
  renderFrankSheet();
  return true;
}
function frankCard(it, i) {
  const s = ui.sheet, f = frankTmpFood(it);
  const blocked = phaseBlocks(s.k, f);
  const estMain = ['kcal', 'p', 'f', 'c'].filter((k) => it.est.includes(k));
  const estOther = it.est.filter((k) => !estMain.includes(k));
  return `<div class="frank-card">
    <div class="frank-head"><b>${esc(it.name)}</b><small>${esc(it.cat)} · pro 100 ${it.base}: ${fmt(it.values.kcal || 0)} kcal, ${fmt(it.values.p || 0, 1)} g Protein</small>${it.exId ? '<small class="frank-upd">Ersetzt dein gespeichertes Lebensmittel mit diesem Namen.</small>' : ''}</div>
    ${blocked ? `<div class="banner is-warn">${icon('triangle-alert')}<div><b>${esc(blocked.n)} im Haut-Protokoll</b><span>${esc(blocked.rules.join(', '))}</span></div></div>` : ''}
    ${it.guess ? '<p class="hint warn-txt">Menge unklar, bitte prüfen.</p>' : ''}
    <div class="amount-row"><button class="step" data-a="frank-step" data-idx="${i}" data-d="-1" aria-label="Weniger">${icon('minus')}</button>
      <label class="amount-in"><input type="text" inputmode="decimal" id="frank-amt-${i}" value="${numIn(it.amt, 2)}" data-i="frank-amt" data-idx="${i}" aria-label="Menge"></label>
      <button class="step" data-a="frank-step" data-idx="${i}" data-d="1" aria-label="Mehr">${icon('plus')}</button></div>
    <div class="chips center">${it.units.map((u) => `<button class="chip chip-sm${u === it.unit ? ' is-on' : ''}" data-a="frank-unit" data-idx="${i}" data-v="${esc(u)}">${esc(u)}</button>`).join('')}</div>
    <div id="frank-prev-${i}">${nutPreview(f, frankGrams(it))}</div>
    ${it.est.length ? `<p class="hint">≈ geschätzt: ${estMain.length ? esc(estMain.map((k) => NUTRIENTS[k].n).join(', ')) + (estOther.length ? ' und ' : '') : ''}${estOther.length ? `${estOther.length} Mikronährstoffe` : ''}</p>` : '<p class="hint">Alle Werte laut Quelle.</p>'}
    <button class="link-btn" data-a="frank-more" data-idx="${i}">${s.more.has(i) ? 'Nährwerte ausblenden' : 'Alle Nährwerte ansehen'}</button>
    ${s.more.has(i) ? frankTable(it) : ''}
    ${it.note ? `<p class="hint">${esc(it.note)}</p>` : ''}
    ${it.sources.length ? `<p class="hint frank-src">Quellen: ${frankSrcLinks(it.sources)}</p>` : ''}
  </div>`;
}
function frankTable(it) {
  const fct = frankGrams(it) / 100;
  const rows = EDIT_KEYS.filter((k) => it.values[k] > 0).map((k) => {
    const n = NUTRIENTS[k], val = it.values[k] * fct * (n.conv || 1);
    return `<div class="frank-tr"><span>${esc(n.n)}${it.est.includes(k) ? ' <em class="est">≈</em>' : ''}</span><b>${fmt(val, val < 10 ? Math.max(n.d, 1) : n.d)} ${esc(n.u)}</b></div>`;
  }).join('');
  return `<div class="frank-table">${rows || '<p class="hint">Keine Nährwerte angegeben.</p>'}</div>`;
}
function renderFrankPreview() {
  const s = ui.sheet, today = todayKey(), yest = addDays(today, -1);
  const days = [...new Set([today, yest, s.k])].sort().reverse();
  const dayName = (k) => (k === today ? 'Heute' : k === yest ? 'Gestern' : fmtDate(k, { weekday: 'short', day: 'numeric', month: 'short' }));
  const n = s.items.length;
  openSheet(`<h3 class="sheet-title">Von Frank</h3>
    ${s.items.map((it, i) => frankCard(it, i)).join('')}
    <h5>Wann</h5>
    <div class="chips">${days.map((k) => `<button class="chip chip-sm${k === s.k ? ' is-on' : ''}" data-a="frank-day" data-v="${k}">${esc(dayName(k))}</button>`).join('')}</div>
    <div class="chips frank-meals">${MEALS.map(([id, nm]) => `<button class="chip chip-sm${id === s.meal ? ' is-on' : ''}" data-a="frank-meal" data-v="${id}">${nm}</button>`).join('')}</div>
    <div class="sheet-acts"><button class="btn is-accent" data-a="frank-save" data-mode="entry">${n > 1 ? `Alle ${n} eintragen` : 'Eintragen'}</button>
      <button class="btn" data-a="frank-save" data-mode="food">Nur als Lebensmittel speichern</button>
      <button class="btn is-ghost" data-a="frank-back">Anderen Code einfügen</button></div>`);
}
function frankIt(el) { const s = ui.sheet; return s && s.type === 'frank' && s.items ? s.items[Number(el.dataset.idx)] || null : null; }
function frankPrev(i) { const s = ui.sheet, it = s && s.items ? s.items[Number(i)] : null, box = $(`#frank-prev-${i}`); if (box && it) box.innerHTML = nutPreview(frankTmpFood(it), frankGrams(it)); }
function frankSave(withEntry) {
  const s = ui.sheet;
  if (!s || s.type !== 'frank' || !s.items) return;
  const k = s.k, meal = s.meal || defaultMeal();
  const saved = [];
  for (const it of s.items) {
    const i = S.foods.custom.findIndex((x) => frankNorm(x.n) === frankNorm(it.name));
    const f = frankFood(it, i >= 0 ? S.foods.custom[i].id : null);
    if (i >= 0) S.foods.custom[i] = f; else S.foods.custom.push(f);
    saved.push({ f, it });
  }
  markDirty('foods'); buildFoodIndex();
  const ids = [];
  let warn = null;
  if (withEntry) {
    for (const { f, it } of saved) {
      const g = Math.round(it.amt * unitG(FOOD[f.id], it.unit) * 10) / 10;
      if (!(g > 0)) continue;
      const id = uid();
      mutDay(k, (d) => { d.entries.push({ id, food: f.id, g, meal, t: frankStamp(k, it.time) }); });
      ids.push(id);
      warn = warn || phaseBlocks(k, FOOD[f.id]);
    }
  }
  invalidate(); closeSheet(); render();
  const one = saved[0].f.n;
  if (withEntry && ids.length) {
    if (warn) toast(`${warn.n} im Haut-Protokoll: ${warn.rules.join(', ')}`);
    else toast(ids.length > 1 ? `${ids.length} Lebensmittel eingetragen` : `${one} eingetragen`, () => { mutDay(k, (d) => { d.entries = d.entries.filter((e) => !ids.includes(e.id)); }); render(); });
  } else toast(saved.length > 1 ? `${saved.length} Lebensmittel gespeichert` : `${one} gespeichert`);
}

/* ---------- Aktionen ---------- */
Object.assign(A, {
  'frank-open': (el) => sheetFrank(el.dataset.q || '', curDate(el)),
  'frank-paste': async () => {
    const ta = $('#frank-code');
    try {
      const t = await navigator.clipboard.readText();
      if (ta) ta.value = t;
      if (!frankTry(t, true) && ta) ta.focus();
    } catch (e) {
      if (ta) ta.focus();
      frankErr('Einfügen aus der Zwischenablage nicht möglich: Tippe ins Feld und wähle „Einfügen“.');
    }
  },
  'frank-back': () => { const s = ui.sheet; if (!s) return; s.step = s.ws ? 'report' : 'ask'; s.items = null; s.goals = null; renderFrankSheet(); },
  'frank-day': (el) => { ui.sheet.k = el.dataset.v; frankRerender(); },
  'frank-meal': (el) => { ui.sheet.meal = el.dataset.v; $$('[data-a="frank-meal"]').forEach((b) => b.classList.toggle('is-on', b === el)); },
  'frank-step': (el) => {
    const it = frankIt(el); if (!it) return;
    const dir = Number(el.dataset.d), step = stepFor(it.unit, it.amt + (dir < 0 ? -0.0001 : 0));
    it.amt = Math.max(0, Math.round((it.amt + dir * step) / step) * step);
    const inp = $(`#frank-amt-${el.dataset.idx}`); if (inp) inp.value = numIn(it.amt, 2);
    frankPrev(el.dataset.idx);
  },
  'frank-unit': (el) => {
    const it = frankIt(el); if (!it) return;
    const f = frankTmpFood(it), g = it.amt * unitG(f, it.unit);
    it.unit = el.dataset.v;
    const ug = unitG(f, it.unit);
    it.amt = ug > 1 ? Math.max(0.25, Math.round((g / ug) * 4) / 4) : Math.round(g);
    frankRerender();
  },
  'frank-more': (el) => { const s = ui.sheet, i = Number(el.dataset.idx); if (s.more.has(i)) s.more.delete(i); else s.more.add(i); frankRerender(); },
  'frank-save': (el) => frankSave(el.dataset.mode === 'entry'),
});
Object.assign(I, {
  'frank-q': (el) => { const s = ui.sheet; if (!s) return; s.q = el.value; const a = $('#frank-go'); if (a) { a.href = frankClaudeUrl(s.q); a.dataset.copy = frankAskText(s.q); } },
  'frank-code': (el) => { frankTry(el.value, false); },
  'frank-amt': (el) => { const it = frankIt(el), n = parseNum(el.value); if (it && n != null && n >= 0) { it.amt = n; frankPrev(el.dataset.idx); } },
});
/* Text für Claude kopieren, ohne den Link zu blockieren */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-copy]');
  if (!a) return;
  try { if (navigator.clipboard) navigator.clipboard.writeText(a.dataset.copy).catch(() => {}); } catch (err) { /* egal */ }
}, true);
