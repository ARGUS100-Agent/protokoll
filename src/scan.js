/* ============================================================
   BARCODE-SCAN mit Open Food Facts (seit 2.10.0)
   Kamera → Strichcode (ZXing, wird beim ersten Scan nachgeladen und dann offline gespeichert)
   → Nährwerte pro 100 g aus Open Food Facts → Vorschau wie bei Frank → eintragen.
   Fehlende Mikronährstoffe schätzt Frank (in der App, wenn die KI verbunden ist, sonst im Chat).
   ============================================================ */
/*icons: scan-barcode camera keyboard*/
const OFF_MAP = [
  ['energy-kcal_100g', 'kcal', 1], ['proteins_100g', 'p', 1], ['fat_100g', 'f', 1], ['saturated-fat_100g', 'sf', 1], ['carbohydrates_100g', 'c', 1],
  ['sugars_100g', 'sug', 1], ['fiber_100g', 'fib', 1], ['sodium_100g', 'na', 1000], ['potassium_100g', 'k', 1000], ['calcium_100g', 'ca', 1000],
  ['magnesium_100g', 'mg', 1000], ['iron_100g', 'fe', 1000], ['zinc_100g', 'zn', 1000], ['copper_100g', 'cu', 1000], ['selenium_100g', 'se', 1e6],
  ['iodine_100g', 'i', 1e6], ['vitamin-c_100g', 'vc', 1000], ['vitamin-d_100g', 'vd', 1e6], ['vitamin-a_100g', 'va', 1e6], ['vitamin-e_100g', 've', 1000],
  ['vitamin-k_100g', 'vk', 1e6], ['vitamin-b12_100g', 'b12', 1e6], ['vitamin-b9_100g', 'fol', 1e6], ['folates_100g', 'fol', 1e6], ['vitamin-b6_100g', 'b6', 1000],
  ['caffeine_100g', 'caf', 1000],
];
const OFF_MICRO = ['k', 'ca', 'mg', 'fe', 'zn', 'se', 'i', 'vc', 'vd', 'va', 've', 'b12', 'fol', 'b6'];
/* Open-Food-Facts-Produkt → Frank-Code (ein Eintrag) */
function offToFrank(p, code) {
  const n = p.nutriments || {};
  const v = {};
  for (const [key, k, f] of OFF_MAP) { const x = Number(n[key]); if (isFinite(x) && x > 0 && v[k] == null) v[k] = Math.round(x * f * 100) / 100; }
  if (v.na == null && Number(n.salt_100g) > 0) v.salt = Number(n.salt_100g);
  if (v.kcal == null && Number(n['energy_100g']) > 0) v.kcal = Math.round(Number(n['energy_100g']) / 4.184);
  if (Number(n.alcohol_100g) > 0) v.alk = Math.round(Number(n.alcohol_100g) * 0.789 * 10) / 10;
  const name = [p.product_name_de || p.product_name || p.generic_name_de || '', p.brands ? `(${String(p.brands).split(',')[0].trim()})` : ''].filter(Boolean).join(' ').trim() || `Produkt ${code}`;
  const qty = String(p.quantity || '').toLowerCase(), cats = (p.categories_tags || []).join(' ');
  const liquid = /\bml\b|\bl\b|liter/.test(qty) || /beverage|drink|getränk/.test(cats);
  const sq = Number(p.serving_quantity);
  const portion = sq > 0 && sq < 2000 ? { name: liquid ? 'Portion' : 'Portion', size: sq } : null;
  const pq = Number(p.product_quantity);
  return {
    app: 'protokoll-frank', v: 1,
    items: [{
      name, liquid, fluid: liquid ? 100 : 0, values: v, portion: portion || (pq > 0 && pq <= 1000 ? { name: liquid ? 'Flasche' : 'Packung', size: pq } : null),
      eaten: portion ? { amount: 1, unit: 'Portion' } : pq > 0 && pq <= 1000 ? { amount: 1, unit: liquid ? 'Flasche' : 'Packung' } : { amount: 100, unit: liquid ? 'ml' : 'g' },
      tags: Number(p.nova_group) === 4 ? ['upf'] : [], sources: [`https://world.openfoodfacts.org/product/${code}`],
      note: `Barcode ${code} · Open Food Facts${OFF_MICRO.filter((k) => v[k] != null).length < 3 ? ' · Mikronährstoffe fehlen' : ''}`,
    }],
  };
}
async function offLookup(code) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,product_name_de,generic_name_de,brands,nutriments,serving_quantity,quantity,product_quantity,nova_group,categories_tags`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok && r.status !== 404) throw new Error('Open Food Facts nicht erreichbar (' + r.status + ')');
  const j = await r.json().catch(() => ({}));
  if (!j || j.status === 0 || !j.product) return null;
  return j.product;
}
let zxLoad = null;
function zxReady() {
  if (window.ZXing) return Promise.resolve(window.ZXing);
  if (!zxLoad) zxLoad = new Promise((res, rej) => { const s = document.createElement('script'); s.src = './zxing.min.js'; s.onload = () => res(window.ZXing); s.onerror = () => { zxLoad = null; rej(new Error('Scanner konnte nicht geladen werden')); }; document.head.appendChild(s); });
  return zxLoad;
}
let zxReader = null;
function scanStop() { try { if (zxReader) zxReader.reset(); } catch (e) { /* egal */ } zxReader = null; }
function sheetScan(k = todayKey()) {
  ui.sheet = { type: 'scan', k };
  openSheet(`<h3 class="sheet-title">Barcode scannen</h3>
    <div class="scan-box"><video id="scan-video" playsinline muted></video><i class="scan-frame"></i></div>
    <p class="hint" id="scan-msg">Kamera wird gestartet … Strichcode in den Rahmen halten.</p>
    <div class="shop-add"><input type="text" id="scan-code" inputmode="numeric" placeholder="oder Nummer eintippen" autocomplete="off"><button class="icon-btn" data-a="scan-manual" aria-label="Suchen">${icon('search')}</button></div>
    <div class="sheet-acts"><button class="btn is-ghost" data-a="sheet-close">Abbrechen</button></div>`);
  const msg = (t) => { const el = $('#scan-msg'); if (el) el.textContent = t; };
  zxReady().then((ZX) => {
    if (!ui.sheet || ui.sheet.type !== 'scan') return;
    const hints = new Map();
    hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS, [ZX.BarcodeFormat.EAN_13, ZX.BarcodeFormat.EAN_8, ZX.BarcodeFormat.UPC_A, ZX.BarcodeFormat.UPC_E]);
    zxReader = new ZX.BrowserMultiFormatReader(hints, 300);
    return zxReader.decodeFromConstraints({ video: { facingMode: 'environment' } }, 'scan-video', (res) => {
      if (!res || !ui.sheet || ui.sheet.type !== 'scan' || ui.sheet.busy) return;
      try { navigator.vibrate && navigator.vibrate(30); } catch (e) { /* egal */ }
      scanFound(res.getText());
    }).then(() => msg('Strichcode in den Rahmen halten.'));
  }).catch((e) => msg(/Permission|NotAllowed/i.test(String(e && (e.name || e.message))) ? 'Kein Zugriff auf die Kamera. In den iPhone-Einstellungen erlauben oder die Nummer eintippen.' : `Kamera nicht verfügbar – Nummer unter dem Strichcode eintippen. (${e && e.message ? e.message : e})`));
}
async function scanFound(code) {
  const s = ui.sheet;
  if (!s || s.type !== 'scan' || s.busy) return;
  code = String(code || '').replace(/\D/g, '');
  if (code.length < 8) { toast('Bitte eine gültige Nummer (8–13 Ziffern)'); return; }
  s.busy = true; scanStop();
  const el = $('#scan-msg'); if (el) el.textContent = `Suche ${code} bei Open Food Facts …`;
  try {
    const p = await offLookup(code);
    if (!p) { s.busy = false; if (el) el.textContent = `${code} ist bei Open Food Facts nicht bekannt. Frank fragen oder selbst anlegen.`; toast('Produkt nicht gefunden'); return; }
    const k = s.k;
    sheetFrank('', k);
    frankTry(JSON.stringify(offToFrank(p, code)), true);
    ui.sheet.scan = code;
    const miss = OFF_MICRO.filter((x) => offToFrank(p, code).items[0].values[x] == null).length;
    if (miss >= OFF_MICRO.length - 2) toast(aiOn() ? 'Mikronährstoffe fehlen – unten „Mikros schätzen“ antippen' : 'Mikronährstoffe fehlen bei Open Food Facts – Frank kann sie schätzen');
  } catch (e) {
    s.busy = false; if (el) el.textContent = `Fehler: ${e.message}. Internet prüfen und erneut versuchen.`;
  }
}
Object.assign(A, {
  'scan-open': (el) => sheetScan(curDate(el)),
  'scan-manual': () => scanFound(($('#scan-code') || {}).value || ''),
});
