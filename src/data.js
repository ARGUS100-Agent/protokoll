/* ============================================================
   DATEN: Nährstoffe, Ziele, Lebensmittel, Standardtag, Gewohnheiten
   Werte pro 100 g bzw. 100 ml (USDA FoodData Central / BLS-Größenordnung,
   gerundet; Jod/Selen an deutsche Verhältnisse angepasst).
   Supplements: base = 1 → Werte pro Einheit.
   ============================================================ */

const APP_VERSION = '2.2.0';

/* ---------- Nährstoff-Metadaten ---------- */
// k: Schlüssel, n: Name, u: Einheit, d: Nachkommastellen, conv: Anzeige-Umrechnung
const NUTRIENTS = {
  kcal: { n: 'Kalorien', u: 'kcal', d: 0 },
  p:    { n: 'Protein', u: 'g', d: 0 },
  f:    { n: 'Fett', u: 'g', d: 0 },
  sf:   { n: 'Gesättigte Fettsäuren', u: 'g', d: 0 },
  c:    { n: 'Kohlenhydrate', u: 'g', d: 0 },
  sug:  { n: 'Zucker', u: 'g', d: 0 },
  fs:   { n: 'Freier Zucker', u: 'g', d: 0 },
  fib:  { n: 'Ballaststoffe', u: 'g', d: 0 },
  na:   { n: 'Natrium', u: 'mg', d: 0 },
  k:    { n: 'Kalium', u: 'mg', d: 0 },
  ca:   { n: 'Kalzium', u: 'mg', d: 0 },
  mg:   { n: 'Magnesium', u: 'mg', d: 0 },
  fe:   { n: 'Eisen', u: 'mg', d: 1 },
  zn:   { n: 'Zink', u: 'mg', d: 1 },
  se:   { n: 'Selen', u: 'µg', d: 0 },
  i:    { n: 'Jod', u: 'µg', d: 0 },
  cu:   { n: 'Kupfer', u: 'mg', d: 1 },
  vc:   { n: 'Vitamin C', u: 'mg', d: 0 },
  vd:   { n: 'Vitamin D', u: 'IE', d: 0, conv: 40 }, // gespeichert in µg, angezeigt in IE
  va:   { n: 'Vitamin A', u: 'µg', d: 0 },
  ret:  { n: 'davon Retinol', u: 'µg', d: 0 },
  ve:   { n: 'Vitamin E', u: 'mg', d: 1 },
  vk:   { n: 'Vitamin K', u: 'µg', d: 0 },
  k2:   { n: 'davon K2', u: 'µg', d: 0 },
  b12:  { n: 'Vitamin B12', u: 'µg', d: 1 },
  fol:  { n: 'Folat', u: 'µg', d: 0 },
  b6:   { n: 'Vitamin B6', u: 'mg', d: 1 },
  cho:  { n: 'Cholin', u: 'mg', d: 0 },
  epa:  { n: 'EPA', u: 'g', d: 2 },
  dha:  { n: 'DHA', u: 'g', d: 2 },
  ala:  { n: 'ALA (pflanzlich)', u: 'g', d: 1 },
  caf:  { n: 'Koffein', u: 'mg', d: 0 },
  alk:  { n: 'Alkohol', u: 'g', d: 0 },
};

/* ---------- Ziele (alle in den Einstellungen änderbar) ----------
   min: Minimum (darunter kritisch) · lo/hi: Zielbereich · max: Maximum (darüber rot)
   Für Vitamin D in µg (Anzeige in IE ×40). */
const DEFAULT_TARGETS = {
  kcal:   { lo: 3000, hi: 3200, max: 3500 },
  p:      { min: 160, lo: 180, hi: 200 },
  fatPct: { lo: 30, hi: 33, max: 35 },
  sf:     { maxPct: 10 },             // max. 10 % der Zielkalorien
  fs:     { max: 60 },
  fib:    { lo: 40, hi: 50, max: 80 },
  vc:     { lo: 110, hi: 500, max: 2000 },
  vd:     { lo: 50, max: 100 },        // 2.000 IE / 4.000 IE
  vk:     { lo: 80 },
  va:     { lo: 850, max: 3000, maxKey: 'ret' }, // Obergrenze gilt nur für Retinol
  ve:     { lo: 14, max: 300 },
  b12:    { lo: 4 },
  fol:    { lo: 300 },
  b6:     { lo: 1.6, max: 12 },
  mg:     { lo: 350, hi: 400, suppMax: 250 },
  zn:     { lo: 14, max: 25 },
  fe:     { lo: 10, hi: 15, max: 40 },
  se:     { lo: 70, max: 255 },
  i:      { min: 150, lo: 200, max: 600 },
  ca:     { lo: 1000, max: 2500 },
  k:      { lo: 4000 },
  cu:     { lo: 1.5, max: 5 },
  cho:    { lo: 400, hi: 550 },
  na:     { lo: 1500, hi: 4000, max: 6000 },
  o3:     { lo: 1, hi: 2, max: 5 },
  caf:    { max: 400 },
  pre:    { lo: 5 },
  pp:     { lo: 10 },
  ferm:   { lo: 2, hi: 4 },
  plants: { lo: 30 },
  fluid:  { lo: 3000, hi: 3500, max: 6000 },
  fluidSport: { lo: 3500, hi: 4500, max: 6000 },
  upf:    { max: 20 },
};

/* Gruppen der Tagesauswertung */
const EVAL_GROUPS = [
  { id: 'energie', n: 'Energie & Makros', keys: ['kcal', 'p', 'fatPct', 'c', 'sf', 'fs'] },
  { id: 'vitamine', n: 'Vitamine', keys: ['vc', 'vd', 'vk', 'va', 've', 'b12', 'fol', 'b6'] },
  { id: 'mineral', n: 'Mineralstoffe', keys: ['mg', 'zn', 'fe', 'se', 'i', 'ca', 'k', 'cu', 'na'] },
  { id: 'fett', n: 'Omega-3 & Cholin', keys: ['o3', 'cho'] },
  { id: 'darm', n: 'Darm & Vielfalt', keys: ['fib', 'pre', 'ferm', 'pp', 'plants'] },
  { id: 'trinken', n: 'Flüssigkeit', keys: ['fluid'] },
  { id: 'weitere', n: 'Weitere Werte', keys: ['caf', 'upf'] },
];

/* Mikronährstoffe für die Ampel auf „Heute“ */
const MICRO_KEYS = ['vc', 'vd', 'vk', 'va', 've', 'b12', 'fol', 'b6', 'mg', 'zn', 'fe', 'se', 'i', 'ca', 'k', 'cu', 'cho', 'o3'];
const MICRO_SHORT = { vc: 'Vit. C', vd: 'Vit. D', vk: 'Vit. K', va: 'Vit. A', ve: 'Vit. E', b12: 'B12', fol: 'Folat', b6: 'B6', mg: 'Magnesium', zn: 'Zink', fe: 'Eisen', se: 'Selen', i: 'Jod', ca: 'Kalzium', k: 'Kalium', cu: 'Kupfer', cho: 'Cholin', o3: 'Omega-3' };

/* ---------- Lebensmittel ----------
   u: Einheiten [[Name, Gramm]] – erste = Standard
   pl: Pflanze(n) für die Vielfalt · pp: Polyphenol-Punkte/100 g · pre: Präbiotika-Punkte/100 g
   ferm: Portionsgröße fermentiert (g) · fl: Flüssigkeit ml/100 g · tags */
const FOODS = [
  /* Getränke */
  { id: 'wasser', n: 'Wasser (Leitung)', cat: 'Getränke', u: [['Glas (250 ml)', 250], ['ml', 1]], fl: 100, v: { ca: 5, mg: 1, na: 1 } },
  { id: 'mineralwasser', n: 'Mineralwasser, kalziumreich', cat: 'Getränke', u: [['Glas (250 ml)', 250], ['Flasche (1,5 l)', 1500], ['ml', 1]], fl: 100, v: { ca: 35, mg: 10, na: 12, k: 1 } },
  { id: 'gruener_tee', n: 'Grüner Tee', cat: 'Getränke', u: [['Tasse (250 ml)', 250], ['ml', 1]], fl: 100, pl: 'Tee', pp: 0.9, v: { kcal: 1, p: 0.2, k: 8, mg: 1, caf: 12 } },
  { id: 'kaffee', n: 'Kaffee (Filter, schwarz)', cat: 'Getränke', u: [['Tasse (200 ml)', 200], ['ml', 1]], fl: 100, pl: 'Kaffee', pp: 2.1, v: { kcal: 1, p: 0.1, k: 49, mg: 3, na: 2, caf: 40 } },
  { id: 'espresso', n: 'Espresso', cat: 'Getränke', u: [['Shot (30 ml)', 30], ['ml', 1]], fl: 100, pl: 'Kaffee', pp: 4, v: { kcal: 9, p: 0.1, k: 115, mg: 80, na: 14, caf: 212 } },
  { id: 'o_saft', n: 'Orangensaft (100 %)', cat: 'Getränke', u: [['Glas (250 ml)', 250], ['ml', 1]], fl: 100, pl: 'Orange', pp: 0.4, v: { kcal: 45, p: 0.7, f: 0.2, sf: 0.02, c: 10.4, sug: 8.4, fs: 8.4, fib: 0.2, na: 1, k: 200, ca: 11, mg: 11, fe: 0.2, zn: 0.05, se: 0.1, i: 1, cu: 0.04, vc: 40, va: 10, ve: 0.04, vk: 0.1, fol: 30, b6: 0.04, cho: 6.2 } },
  { id: 'kokoswasser', n: 'Kokoswasser', cat: 'Getränke', u: [['Flasche (330 ml)', 330], ['ml', 1]], fl: 100, pl: 'Kokos', v: { kcal: 19, p: 0.7, f: 0.2, sf: 0.18, c: 3.7, sug: 2.6, na: 25, k: 200, ca: 24, mg: 25, fe: 0.29, zn: 0.1, se: 1, cu: 0.04, vc: 2.4, fol: 3, b6: 0.03, cho: 1.1 } },
  { id: 'kombucha', n: 'Kombucha', cat: 'Getränke', u: [['Flasche (330 ml)', 330], ['Flasche (250 ml)', 250], ['ml', 1]], fl: 100, pl: 'Tee', pp: 0.3, ferm: 150, v: { kcal: 18, p: 0.2, f: 0.1, c: 4.6, sug: 4.6, fs: 4.6, na: 3, k: 10, caf: 3 } },
  { id: 'rotebete_saft', n: 'Rote-Bete-Saft (milchsauer vergoren)', cat: 'Getränke', est: true, u: [['Glas (200 ml)', 200], ['ml', 1]], fl: 100, pl: 'Rote Bete', pp: 0.5, v: { kcal: 38, p: 1, f: 0.1, c: 7.8, sug: 7, fs: 7, fib: 0.3, na: 40, k: 280, ca: 15, mg: 18, fe: 0.5, zn: 0.2, cu: 0.05, vc: 2, fol: 25, b6: 0.05 } },
  { id: 'kuhmilch', n: 'Milch 1,5 %', cat: 'Eier & Milch', u: [['Glas (250 ml)', 250], ['ml', 1]], fl: 90, v: { kcal: 47, p: 3.4, f: 1.5, sf: 0.9, c: 4.8, sug: 4.8, na: 45, k: 155, ca: 120, mg: 12, fe: 0.03, zn: 0.4, se: 1.5, i: 10, cu: 0.01, vc: 1, vd: 0.03, va: 18, ret: 18, ve: 0.03, vk: 0.3, b12: 0.45, fol: 5, b6: 0.04, cho: 15 } },
  { id: 'haferdrink', n: 'Haferdrink, mit Kalzium', cat: 'Getränke', u: [['Glas (250 ml)', 250], ['ml', 1]], fl: 90, pl: 'Hafer', pre: 0.4, v: { kcal: 46, p: 1, f: 1.5, sf: 0.2, c: 6.7, sug: 4, fs: 4, fib: 0.8, na: 40, k: 40, ca: 120, mg: 5, fe: 0.2, zn: 0.1, se: 1, cu: 0.02, vd: 0.75, ve: 0.2, b12: 0.38, fol: 2, b6: 0.01, cho: 2 } },
  { id: 'bier', n: 'Bier', cat: 'Getränke', u: [['Flasche (0,5 l)', 500], ['ml', 1]], tags: ['alkohol'], v: { kcal: 43, p: 0.5, c: 3.6, sug: 0.1, na: 4, k: 27, mg: 6, fol: 6, b6: 0.05, alk: 3.9 } },
  { id: 'wein', n: 'Wein (rot)', cat: 'Getränke', u: [['Glas (0,2 l)', 200], ['ml', 1]], tags: ['alkohol'], v: { kcal: 85, p: 0.1, c: 2.6, sug: 0.6, na: 4, k: 127, mg: 12, fe: 0.5, alk: 10.6 } },

  /* Supplements (Werte pro Einheit) */
  { id: 's_d3k2', n: 'D3 + K2 Tropfen (AG1)', cat: 'Supplements', base: 1, supp: 'daily', u: [['Tropfen', 1]], v: { vd: 12.5, vk: 50, k2: 50 } },
  { id: 's_omega3', n: 'Omega-3 Algenöl (Sunday Natural)', cat: 'Supplements', base: 1, supp: 'daily', u: [['Tagesdosis', 1]], v: { kcal: 13, f: 1.44, sf: 0.1, epa: 0.576, dha: 0.324 } },
  { id: 's_kreatin', n: 'Kreatin (Monohydrat)', cat: 'Supplements', base: 1, supp: 'daily', u: [['g', 1]], v: {} },
  { id: 's_ag1', n: 'AG1 (EU-Rezeptur, 13 g)', cat: 'Supplements', base: 1, supp: 'opt', tags: ['ag1'], pp: 1, pre: 1, u: [['Portion', 1]], v: { kcal: 41, p: 2.6, f: 0.9, sf: 0.3, c: 4.4, sug: 1.2, fib: 2.5, na: 40, ca: 120, mg: 57, se: 22, zn: 10, cu: 0.2, vc: 420, va: 250, ve: 32, b12: 50, fol: 300, b6: 5, cho: 20 } },
  { id: 's_mg_threonat', n: 'Magnesium-L-Threonat', cat: 'Supplements', base: 1, supp: 'opt', u: [['Dosis (144 mg Mg)', 1]], v: { mg: 144 } },
  { id: 's_zink_lutsch', n: 'Zink-Lutschtablette', cat: 'Supplements', base: 1, supp: 'opt', u: [['Tablette', 1]], v: { zn: 10 } },

  /* Eier & Milch */
  { id: 'ei', n: 'Ei (Größe M)', cat: 'Eier & Milch', u: [['Stück', 55], ['g', 1]], v: { kcal: 143, p: 12.6, f: 9.5, sf: 3.1, c: 0.7, sug: 0.4, na: 142, k: 138, ca: 56, mg: 12, fe: 1.75, zn: 1.29, se: 25, i: 18, cu: 0.07, vd: 2, va: 160, ret: 155, ve: 1.05, vk: 0.3, b12: 1.1, fol: 47, b6: 0.17, cho: 294, epa: 0.004, dha: 0.058, ala: 0.05 } },
  { id: 'skyr', n: 'Skyr natur', cat: 'Eier & Milch', u: [['Becher (500 g)', 500], ['Becher (450 g)', 450], ['g', 1]], ferm: 150, v: { kcal: 63, p: 11, f: 0.2, sf: 0.1, c: 4, sug: 4, na: 40, k: 150, ca: 150, mg: 12, fe: 0.05, zn: 0.5, se: 6, i: 13, cu: 0.01, va: 2, ret: 2, ve: 0.01, b12: 0.5, fol: 10, b6: 0.06, cho: 15 } },
  { id: 'kefir', n: 'Kefir 1,5 %', cat: 'Eier & Milch', u: [['Glas (150 ml)', 150], ['ml', 1]], fl: 90, ferm: 150, v: { kcal: 50, p: 3.4, f: 1.5, sf: 0.9, c: 4.1, sug: 4.1, na: 45, k: 150, ca: 120, mg: 12, fe: 0.05, zn: 0.4, se: 2, i: 10, cu: 0.01, vc: 1, vd: 0.03, va: 15, ret: 15, ve: 0.04, vk: 0.5, k2: 0.5, b12: 0.4, fol: 7, b6: 0.05, cho: 15 } },
  { id: 'joghurt', n: 'Naturjoghurt 3,5 %', cat: 'Eier & Milch', u: [['Becher (150 g)', 150], ['g', 1]], ferm: 150, v: { kcal: 66, p: 3.8, f: 3.5, sf: 2.2, c: 4.6, sug: 4.6, na: 50, k: 165, ca: 120, mg: 12, fe: 0.05, zn: 0.5, se: 2, i: 10, cu: 0.01, vd: 0.05, va: 30, ret: 30, ve: 0.08, vk: 0.2, k2: 1, b12: 0.4, fol: 10, b6: 0.05, cho: 15 } },
  { id: 'magerquark', n: 'Magerquark', cat: 'Eier & Milch', u: [['Becher (500 g)', 500], ['g', 1]], v: { kcal: 67, p: 12, f: 0.3, sf: 0.2, c: 4, sug: 4, na: 40, k: 130, ca: 90, mg: 11, fe: 0.1, zn: 0.5, se: 5, i: 10, cu: 0.01, va: 2, ret: 2, b12: 0.8, fol: 15, b6: 0.08, cho: 15 } },
  { id: 'huettenkaese', n: 'Hüttenkäse', cat: 'Eier & Milch', u: [['Becher (200 g)', 200], ['g', 1]], v: { kcal: 98, p: 11.1, f: 4.3, sf: 1.7, c: 3.4, sug: 2.7, na: 364, k: 104, ca: 83, mg: 8, fe: 0.07, zn: 0.4, se: 9.7, i: 15, cu: 0.03, vd: 0.1, va: 37, ret: 37, ve: 0.08, b12: 0.43, fol: 12, b6: 0.05, cho: 18.4 } },
  { id: 'gouda', n: 'Gouda (45 %)', cat: 'Eier & Milch', u: [['Scheibe', 25], ['g', 1]], v: { kcal: 356, p: 25, f: 27.4, sf: 17.6, c: 2.2, sug: 2.2, na: 819, k: 121, ca: 700, mg: 29, fe: 0.24, zn: 3.9, se: 14.5, i: 30, cu: 0.04, vd: 0.5, va: 165, ret: 165, ve: 0.24, vk: 2.3, k2: 50, b12: 1.54, fol: 21, b6: 0.08, cho: 15.4, ala: 0.3 } },
  { id: 'mozzarella', n: 'Mozzarella', cat: 'Eier & Milch', u: [['Kugel (125 g)', 125], ['g', 1]], v: { kcal: 250, p: 18, f: 19, sf: 12, c: 1, sug: 1, na: 400, k: 76, ca: 500, mg: 20, fe: 0.4, zn: 2.9, se: 17, i: 20, cu: 0.01, vd: 0.4, va: 180, ret: 174, ve: 0.2, vk: 2.3, k2: 5, b12: 1.6, fol: 7, b6: 0.04, cho: 15 } },
  { id: 'butter', n: 'Butter', cat: 'Öle & Fette', u: [['TL', 5], ['g', 1]], v: { kcal: 717, p: 0.9, f: 81, sf: 51, c: 0.1, na: 11, k: 24, ca: 24, va: 684, ret: 671, vd: 1.5, ve: 2.3, vk: 7, k2: 15, cho: 19 } },
  { id: 'whey', n: 'Whey Protein (Pulver)', cat: 'Eier & Milch', u: [['Messlöffel (30 g)', 30], ['g', 1]], tags: ['whey', 'upf'], v: { kcal: 380, p: 78, f: 5, sf: 3, c: 7, sug: 5, fs: 5, na: 250, k: 500, ca: 450, mg: 100, fe: 1, zn: 3, se: 10, i: 30, b12: 2, cho: 50 } },
  { id: 'milbona_shake', n: 'Milbona Protein-Shake (Schätzung)', cat: 'Eier & Milch', u: [['Flasche (500 ml)', 500], ['ml', 1]], fl: 85, tags: ['milbona', 'upf'], v: { kcal: 58, p: 8, f: 0.3, sf: 0.2, c: 5.5, sug: 5.5, fs: 3, na: 50, k: 180, ca: 250, mg: 20, i: 10, b12: 0.4, cho: 15 } },

  /* Gemüse */
  { id: 'spinat', n: 'Spinat (frisch)', cat: 'Gemüse', u: [['Handvoll', 30], ['g', 1]], pl: 'Spinat', pp: 1.2, v: { kcal: 23, p: 2.9, f: 0.4, sf: 0.06, c: 1.4, sug: 0.4, fib: 2.2, na: 79, k: 558, ca: 99, mg: 79, fe: 2.7, zn: 0.53, se: 1, i: 12, cu: 0.13, vc: 28, va: 469, ve: 2, vk: 483, fol: 194, b6: 0.2, cho: 19.3, ala: 0.14 } },
  { id: 'paprika_rot', n: 'Paprika rot', cat: 'Gemüse', u: [['Stück', 150], ['g', 1]], pl: 'Paprika', pp: 0.3, v: { kcal: 31, p: 1, f: 0.3, sf: 0.03, c: 3.9, sug: 4.2, fib: 2.1, na: 4, k: 211, ca: 7, mg: 12, fe: 0.43, zn: 0.25, se: 0.1, i: 1, cu: 0.02, vc: 128, va: 157, ve: 1.58, vk: 4.9, fol: 46, b6: 0.29, cho: 5.6 } },
  { id: 'karotten', n: 'Karotten', cat: 'Gemüse', u: [['Stück', 80], ['g', 1]], pl: 'Karotte', pp: 0.1, pre: 0.3, v: { kcal: 38, p: 0.9, f: 0.2, sf: 0.04, c: 6.8, sug: 4.7, fib: 2.8, na: 69, k: 320, ca: 33, mg: 12, fe: 0.3, zn: 0.24, se: 0.1, i: 2, cu: 0.05, vc: 5.9, va: 835, ve: 0.66, vk: 13.2, fol: 19, b6: 0.14, cho: 8.8 } },
  { id: 'gurke', n: 'Gurke', cat: 'Gemüse', u: [['Portion', 100], ['g', 1]], pl: 'Gurke', v: { kcal: 12, p: 0.6, f: 0.1, sf: 0.01, c: 1.8, sug: 1.7, fib: 0.5, na: 2, k: 147, ca: 16, mg: 13, fe: 0.28, zn: 0.2, se: 0.3, i: 1, cu: 0.04, vc: 2.8, va: 5, ve: 0.03, vk: 16.4, fol: 7, b6: 0.04, cho: 6 } },
  { id: 'brokkoli', n: 'Brokkoli', cat: 'Gemüse', u: [['Portion', 150], ['g', 1]], pl: 'Brokkoli', pp: 0.4, pre: 0.5, v: { kcal: 32, p: 2.8, f: 0.4, sf: 0.04, c: 3, sug: 1.7, fib: 3, na: 33, k: 316, ca: 47, mg: 21, fe: 0.73, zn: 0.41, se: 2.5, i: 1, cu: 0.05, vc: 89, va: 31, ve: 0.78, vk: 102, fol: 63, b6: 0.18, cho: 18.7 } },
  { id: 'rote_bete', n: 'Rote Bete (vorgegart)', cat: 'Gemüse', u: [['Knolle', 100], ['g', 1]], pl: 'Rote Bete', pp: 1, pre: 0.5, v: { kcal: 44, p: 1.7, f: 0.2, sf: 0.03, c: 8, sug: 8, fib: 2, na: 77, k: 305, ca: 16, mg: 23, fe: 0.8, zn: 0.35, se: 0.7, i: 1, cu: 0.07, vc: 3.6, va: 2, ve: 0.04, vk: 0.2, fol: 80, b6: 0.07, cho: 6.3 } },
  { id: 'tomate', n: 'Tomate', cat: 'Gemüse', u: [['Stück', 100], ['g', 1]], pl: 'Tomate', pp: 0.3, v: { kcal: 18, p: 0.9, f: 0.2, sf: 0.03, c: 2.6, sug: 2.6, fib: 1.2, na: 5, k: 237, ca: 10, mg: 11, fe: 0.27, zn: 0.17, i: 1, cu: 0.06, vc: 14, va: 42, ve: 0.54, vk: 7.9, fol: 15, b6: 0.08, cho: 6.7 } },
  { id: 'zwiebel', n: 'Zwiebel', cat: 'Gemüse', u: [['Stück', 80], ['g', 1]], pl: 'Zwiebel', pp: 1, pre: 3, v: { kcal: 38, p: 1.1, f: 0.1, sf: 0.04, c: 7.6, sug: 4.2, fib: 1.7, na: 4, k: 146, ca: 23, mg: 10, fe: 0.21, zn: 0.17, se: 0.5, i: 1, cu: 0.04, vc: 7.4, ve: 0.02, vk: 0.4, fol: 19, b6: 0.12, cho: 6.1 } },
  { id: 'knoblauch', n: 'Knoblauch', cat: 'Gemüse', u: [['Zehe', 4], ['g', 1]], pl: 'Knoblauch', pp: 1, pre: 12, v: { kcal: 145, p: 6.4, f: 0.5, sf: 0.09, c: 31, sug: 1, fib: 2.1, na: 17, k: 401, ca: 181, mg: 25, fe: 1.7, zn: 1.16, se: 14.2, i: 2, cu: 0.3, vc: 31, ve: 0.08, vk: 1.7, fol: 3, b6: 1.24, cho: 23.2 } },
  { id: 'gruenkohl', n: 'Grünkohl', cat: 'Gemüse', u: [['Portion', 150], ['g', 1]], pl: 'Grünkohl', pp: 1, pre: 0.5, v: { kcal: 45, p: 4.3, f: 0.9, sf: 0.1, c: 3, sug: 1, fib: 4.1, na: 38, k: 450, ca: 210, mg: 33, fe: 1.6, zn: 0.4, se: 0.9, i: 2, cu: 0.05, vc: 105, va: 241, ve: 1.5, vk: 390, fol: 141, b6: 0.15, cho: 0.4, ala: 0.18 } },
  { id: 'rosenkohl', n: 'Rosenkohl', cat: 'Gemüse', u: [['Portion', 150], ['g', 1]], pl: 'Rosenkohl', pp: 0.7, pre: 0.5, v: { kcal: 45, p: 3.4, f: 0.3, sf: 0.06, c: 5.2, sug: 2.2, fib: 3.8, na: 25, k: 389, ca: 42, mg: 23, fe: 1.4, zn: 0.42, se: 1.6, i: 1, cu: 0.07, vc: 85, va: 38, ve: 0.88, vk: 177, fol: 61, b6: 0.22, cho: 19.1, ala: 0.1 } },
  { id: 'feldsalat', n: 'Feldsalat', cat: 'Gemüse', u: [['Portion', 50], ['g', 1]], pl: 'Feldsalat', pp: 0.7, v: { kcal: 16, p: 1.8, f: 0.4, sf: 0.05, c: 1, sug: 0.6, fib: 1.5, na: 4, k: 420, ca: 38, mg: 13, fe: 2, zn: 0.5, se: 0.9, i: 1, cu: 0.13, vc: 35, va: 660, ve: 0.6, vk: 150, fol: 145, b6: 0.27, cho: 15, ala: 0.1 } },
  { id: 'salat', n: 'Blattsalat (Kopf/Eisberg)', cat: 'Gemüse', u: [['Portion', 50], ['g', 1]], pl: 'Salat', v: { kcal: 14, p: 0.9, f: 0.1, c: 1.8, sug: 1.2, fib: 1.2, na: 10, k: 141, ca: 18, mg: 7, fe: 0.41, zn: 0.15, cu: 0.03, vc: 3, va: 25, ve: 0.18, vk: 24, fol: 29, b6: 0.04, cho: 6.7 } },
  { id: 'rotkohl', n: 'Rotkohl (roh)', cat: 'Gemüse', u: [['Portion', 100], ['g', 1]], pl: 'Rotkohl', pp: 2, pre: 0.5, v: { kcal: 31, p: 1.4, f: 0.2, c: 5.3, sug: 3.8, fib: 2.1, na: 27, k: 243, ca: 45, mg: 16, fe: 0.8, zn: 0.22, se: 0.6, cu: 0.02, vc: 57, va: 56, ve: 0.11, vk: 38, fol: 18, b6: 0.21, cho: 17 } },
  { id: 'lauch', n: 'Lauch', cat: 'Gemüse', u: [['Stange', 150], ['g', 1]], pl: 'Lauch', pp: 0.3, pre: 3, v: { kcal: 31, p: 1.5, f: 0.3, c: 3.3, sug: 3.9, fib: 2.3, na: 20, k: 180, ca: 59, mg: 28, fe: 2.1, zn: 0.12, se: 1, cu: 0.12, vc: 12, va: 83, ve: 0.92, vk: 47, fol: 64, b6: 0.23, cho: 9.5 } },
  { id: 'spargel', n: 'Spargel', cat: 'Gemüse', u: [['Portion', 200], ['g', 1]], pl: 'Spargel', pp: 0.3, pre: 2, v: { kcal: 20, p: 2.2, f: 0.1, c: 1.9, sug: 1.9, fib: 1.5, na: 2, k: 202, ca: 24, mg: 14, fe: 2.1, zn: 0.54, se: 2.3, cu: 0.19, vc: 5.6, va: 38, ve: 1.1, vk: 41.6, fol: 52, b6: 0.09, cho: 16 } },
  { id: 'champignons', n: 'Champignons', cat: 'Gemüse', u: [['Portion', 150], ['g', 1]], pl: 'Champignon', pre: 1, v: { kcal: 22, p: 3.1, f: 0.3, c: 1.3, sug: 2, fib: 1, na: 5, k: 318, ca: 3, mg: 9, fe: 0.5, zn: 0.52, se: 9.3, cu: 0.32, vc: 2.1, vd: 0.2, b12: 0.04, fol: 17, b6: 0.1, cho: 17.3 } },
  { id: 'kuerbis', n: 'Kürbis (Hokkaido)', cat: 'Gemüse', u: [['Portion', 200], ['g', 1]], pl: 'Kürbis', pre: 0.5, v: { kcal: 30, p: 1.1, f: 0.1, c: 5.5, sug: 2.8, fib: 2.5, na: 1, k: 340, ca: 21, mg: 15, fe: 0.8, zn: 0.32, se: 0.3, cu: 0.13, vc: 13, va: 300, ve: 1.06, vk: 1.1, fol: 16, b6: 0.06, cho: 8.2 } },
  { id: 'kartoffeln', n: 'Kartoffeln (gekocht)', cat: 'Gemüse', u: [['Stück', 100], ['g', 1]], pl: 'Kartoffel', pp: 0.2, pre: 1, v: { kcal: 74, p: 2, f: 0.1, sf: 0.03, c: 15.5, sug: 0.8, fib: 1.8, na: 4, k: 380, ca: 8, mg: 21, fe: 0.4, zn: 0.3, se: 0.3, i: 2, cu: 0.1, vc: 12, ve: 0.05, vk: 2, fol: 15, b6: 0.27, cho: 13 } },
  { id: 'suesskartoffel', n: 'Süßkartoffel (gegart)', cat: 'Gemüse', u: [['Stück', 200], ['g', 1]], pl: 'Süßkartoffel', pp: 0.5, pre: 1, v: { kcal: 86, p: 2, f: 0.15, sf: 0.05, c: 17.4, sug: 6.5, fib: 3.3, na: 36, k: 475, ca: 38, mg: 27, fe: 0.69, zn: 0.32, se: 0.2, i: 1, cu: 0.16, vc: 19.6, va: 961, ve: 0.71, vk: 2.3, fol: 6, b6: 0.29, cho: 13 } },
  { id: 'avocado', n: 'Avocado', cat: 'Gemüse', u: [['halbe', 70], ['Stück', 140], ['g', 1]], pl: 'Avocado', pp: 0.3, pre: 1, v: { kcal: 160, p: 2, f: 14.7, sf: 2.1, c: 1.8, sug: 0.7, fib: 6.7, na: 7, k: 485, ca: 12, mg: 29, fe: 0.55, zn: 0.64, se: 0.4, i: 1, cu: 0.19, vc: 10, va: 7, ve: 2.07, vk: 21, fol: 81, b6: 0.26, cho: 14.2, ala: 0.11 } },
  { id: 'sauerkraut', n: 'Sauerkraut (Kühlregal)', cat: 'Gemüse', u: [['Gabel', 40], ['g', 1]], pl: 'Weißkohl', pp: 0.2, pre: 0.5, ferm: 30, v: { kcal: 19, p: 0.9, f: 0.1, sf: 0.03, c: 1.4, sug: 1.8, fib: 2.9, na: 500, k: 170, ca: 30, mg: 13, fe: 1.47, zn: 0.19, se: 0.6, i: 1, cu: 0.1, vc: 15, va: 1, ve: 0.14, vk: 13, fol: 24, b6: 0.13, cho: 10.4 } },
  { id: 'kimchi', n: 'Kimchi (Kühlregal)', cat: 'Gemüse', u: [['Gabel', 40], ['g', 1]], pl: ['Chinakohl', 'Chili', 'Knoblauch', 'Ingwer'], pp: 0.3, pre: 0.5, ferm: 30, v: { kcal: 23, p: 1.6, f: 0.5, sf: 0.07, c: 2.1, sug: 1.1, fib: 1.6, na: 500, k: 150, ca: 33, mg: 14, fe: 1, zn: 0.22, se: 0.5, i: 1, cu: 0.04, vc: 10, va: 30, ve: 0.3, vk: 43, fol: 52, b6: 0.17, cho: 10 } },
  { id: 'miso', n: 'Miso', cat: 'Hülsenfrüchte & Soja', u: [['EL', 18], ['g', 1]], pl: 'Soja', ferm: 15, v: { kcal: 198, p: 12, f: 6, sf: 1, c: 21, sug: 6, fib: 5.4, na: 3700, k: 210, ca: 57, mg: 48, fe: 2.5, zn: 2.6, se: 7, i: 1, cu: 0.42, vk: 29, fol: 19, b6: 0.2, cho: 72, ala: 0.5 } },

  /* Obst */
  { id: 'kiwi_gold', n: 'Kiwi Gold', cat: 'Obst', u: [['Stück', 90], ['g', 1]], pl: 'Kiwi', pp: 0.3, pre: 0.5, v: { kcal: 63, p: 1, f: 0.3, sf: 0.05, c: 15.8, sug: 12.3, fib: 1.4, na: 3, k: 315, ca: 17, mg: 12, fe: 0.21, zn: 0.08, se: 0.4, i: 1, cu: 0.15, vc: 161, va: 1, ve: 1.49, vk: 6.1, fol: 31, b6: 0.08, cho: 7.8 } },
  { id: 'kiwi', n: 'Kiwi', cat: 'Obst', u: [['Stück', 75], ['g', 1]], pl: 'Kiwi', pp: 0.3, pre: 0.5, v: { kcal: 61, p: 1.1, f: 0.5, sf: 0.03, c: 11.7, sug: 9, fib: 3, na: 3, k: 312, ca: 34, mg: 17, fe: 0.31, zn: 0.14, se: 0.2, i: 1, cu: 0.13, vc: 93, va: 4, ve: 1.46, vk: 40.3, fol: 25, b6: 0.06, cho: 7.8, ala: 0.04 } },
  { id: 'banane', n: 'Banane', cat: 'Obst', u: [['Stück', 120], ['g', 1]], pl: 'Banane', pp: 0.1, pre: 0.6, v: { kcal: 91, p: 1.1, f: 0.3, sf: 0.1, c: 20, sug: 17, fib: 2, na: 1, k: 358, ca: 5, mg: 27, fe: 0.26, zn: 0.15, se: 1, i: 1, cu: 0.08, vc: 8.7, va: 3, ve: 0.1, vk: 0.5, fol: 20, b6: 0.37, cho: 9.8 } },
  { id: 'datteln', n: 'Datteln (getrocknet)', cat: 'Obst', u: [['g', 1], ['Stück (Deglet)', 8], ['Stück (Medjool)', 24]], pl: 'Dattel', pp: 0.5, pre: 0.5, v: { kcal: 286, p: 2.5, f: 0.4, sf: 0.03, c: 64, sug: 63, fib: 8, na: 2, k: 656, ca: 39, mg: 43, fe: 1, zn: 0.29, se: 3, i: 1, cu: 0.21, vc: 0.4, va: 1, ve: 0.05, vk: 2.7, fol: 19, b6: 0.17, cho: 6.3 } },
  { id: 'heidelbeeren', n: 'Heidelbeeren (TK)', cat: 'Obst', u: [['Portion', 150], ['g', 1]], pl: 'Heidelbeere', pp: 5.6, pre: 0.5, v: { kcal: 55, p: 0.7, f: 0.3, sf: 0.03, c: 11.5, sug: 10, fib: 2.4, na: 1, k: 77, ca: 6, mg: 6, fe: 0.28, zn: 0.16, se: 0.1, i: 1, cu: 0.06, vc: 9.7, va: 3, ve: 0.57, vk: 19.3, fol: 6, b6: 0.05, cho: 6, ala: 0.06 } },
  { id: 'himbeeren', n: 'Himbeeren (TK)', cat: 'Obst', u: [['Portion', 150], ['g', 1]], pl: 'Himbeere', pp: 2.2, pre: 1, v: { kcal: 45, p: 1.2, f: 0.65, sf: 0.02, c: 5.4, sug: 4.4, fib: 6.5, na: 1, k: 151, ca: 25, mg: 22, fe: 0.69, zn: 0.42, se: 0.2, i: 1, cu: 0.09, vc: 26, va: 2, ve: 0.87, vk: 7.8, fol: 21, b6: 0.06, cho: 12.3, ala: 0.13 } },
  { id: 'brombeeren', n: 'Brombeeren (TK)', cat: 'Obst', u: [['Portion', 150], ['g', 1]], pl: 'Brombeere', pp: 2.6, pre: 1, v: { kcal: 40, p: 1.4, f: 0.5, sf: 0.01, c: 4.9, sug: 4.9, fib: 5.3, na: 1, k: 162, ca: 29, mg: 20, fe: 0.62, zn: 0.53, se: 0.4, i: 1, cu: 0.17, vc: 21, va: 11, ve: 1.17, vk: 19.8, fol: 25, b6: 0.03, cho: 8.5, ala: 0.09 } },
  { id: 'beerenmix', n: 'Beerenmischung (TK)', cat: 'Obst', u: [['Portion', 150], ['g', 1]], pl: ['Heidelbeere', 'Himbeere', 'Brombeere'], pp: 3.5, pre: 0.8, v: { kcal: 47, p: 1.1, f: 0.5, sf: 0.02, c: 7.3, sug: 6.4, fib: 4.7, na: 1, k: 130, ca: 20, mg: 16, fe: 0.53, zn: 0.37, se: 0.2, i: 1, cu: 0.11, vc: 19, va: 5, ve: 0.87, vk: 15.6, fol: 17, b6: 0.05, cho: 9, ala: 0.09 } },
  { id: 'apfel', n: 'Apfel', cat: 'Obst', u: [['Stück', 150], ['g', 1]], pl: 'Apfel', pp: 1.4, pre: 0.8, v: { kcal: 53, p: 0.3, f: 0.2, sf: 0.03, c: 11.4, sug: 10.4, fib: 2.4, na: 1, k: 107, ca: 6, mg: 5, fe: 0.12, zn: 0.04, i: 1, cu: 0.03, vc: 8, va: 3, ve: 0.18, vk: 2.2, fol: 3, b6: 0.04, cho: 3.4 } },
  { id: 'orange', n: 'Orange', cat: 'Obst', u: [['Stück', 150], ['g', 1]], pl: 'Orange', pp: 0.5, pre: 0.5, v: { kcal: 47, p: 0.9, f: 0.1, sf: 0.02, c: 9.4, sug: 9.4, fib: 2.4, k: 181, ca: 40, mg: 10, fe: 0.1, zn: 0.07, se: 0.5, i: 1, cu: 0.05, vc: 53, va: 11, ve: 0.18, fol: 30, b6: 0.06, cho: 8.4 } },
  { id: 'erdbeeren', n: 'Erdbeeren', cat: 'Obst', u: [['Schale (250 g)', 250], ['g', 1]], pl: 'Erdbeere', pp: 2.35, pre: 0.5, v: { kcal: 32, p: 0.7, f: 0.3, sf: 0.02, c: 5.7, sug: 4.9, fib: 2, na: 1, k: 153, ca: 16, mg: 13, fe: 0.41, zn: 0.14, se: 0.4, i: 1, cu: 0.05, vc: 59, va: 1, ve: 0.29, vk: 2.2, fol: 24, b6: 0.05, cho: 5.7, ala: 0.07 } },
  { id: 'johannisbeeren', n: 'Schwarze Johannisbeeren', cat: 'Obst', u: [['Portion', 100], ['g', 1]], pl: 'Johannisbeere', pp: 7.6, pre: 1, v: { kcal: 45, p: 1.3, f: 0.2, c: 6.5, sug: 6.1, fib: 6.8, na: 1, k: 310, ca: 46, mg: 17, fe: 1.3, zn: 0.25, se: 0.5, i: 1, cu: 0.09, vc: 177, va: 12, ve: 1, vk: 10, fol: 8, b6: 0.07, cho: 8 } },
  { id: 'mango', n: 'Mango', cat: 'Obst', u: [['halbe', 150], ['g', 1]], pl: 'Mango', pp: 0.3, v: { kcal: 64, p: 0.8, f: 0.4, sf: 0.09, c: 13.4, sug: 13.7, fib: 1.6, na: 1, k: 168, ca: 11, mg: 10, fe: 0.16, zn: 0.09, se: 0.6, cu: 0.11, vc: 36, va: 54, ve: 0.9, vk: 4.2, fol: 43, b6: 0.12, cho: 7.6 } },
  { id: 'zitrone', n: 'Zitronensaft', cat: 'Obst', u: [['EL', 15], ['g', 1]], pl: 'Zitrone', pp: 0.5, v: { kcal: 24, p: 0.4, f: 0.2, c: 5, sug: 2.5, fib: 0.3, na: 1, k: 103, ca: 6, mg: 6, fe: 0.08, vc: 39, fol: 20, b6: 0.05, cho: 5.1 } },

  /* Nüsse & Samen */
  { id: 'kuerbiskerne', n: 'Kürbiskerne', cat: 'Nüsse & Samen', u: [['EL', 10], ['Handvoll', 30], ['g', 1]], pl: 'Kürbis', pp: 0.2, pre: 0.3, v: { kcal: 575, p: 30, f: 49, sf: 8.7, c: 5, sug: 1.4, fib: 6, na: 7, k: 809, ca: 46, mg: 592, fe: 8.8, zn: 7.8, se: 9.4, i: 1, cu: 1.34, vc: 1.9, va: 1, ve: 2.2, vk: 7.3, fol: 58, b6: 0.14, cho: 63, ala: 0.12 } },
  { id: 'mandeln', n: 'Mandeln', cat: 'Nüsse & Samen', u: [['Handvoll', 30], ['Stück', 1.2], ['g', 1]], pl: 'Mandel', pp: 1.9, pre: 1, v: { kcal: 587, p: 21.2, f: 49.9, sf: 3.8, c: 7, sug: 4.4, fib: 12.5, na: 1, k: 733, ca: 269, mg: 270, fe: 3.7, zn: 3.1, se: 4.1, i: 2, cu: 1.03, ve: 25.6, fol: 44, b6: 0.14, cho: 52 } },
  { id: 'paranuss', n: 'Paranuss', cat: 'Nüsse & Samen', u: [['Stück', 5], ['g', 1]], pl: 'Paranuss', pp: 0.5, v: { kcal: 690, p: 14.3, f: 67.1, sf: 15.1, c: 4.2, sug: 2.3, fib: 7.5, na: 3, k: 659, ca: 160, mg: 376, fe: 2.43, zn: 4.06, se: 1400, i: 1, cu: 1.74, vc: 0.7, ve: 5.65, fol: 22, b6: 0.1, cho: 28.8 } },
  { id: 'walnuesse', n: 'Walnüsse', cat: 'Nüsse & Samen', u: [['Handvoll', 30], ['g', 1]], pl: 'Walnuss', pp: 2, pre: 1, v: { kcal: 689, p: 15.2, f: 65.2, sf: 6.1, c: 7, sug: 2.6, fib: 6.7, na: 2, k: 441, ca: 98, mg: 158, fe: 2.91, zn: 3.09, se: 4.9, i: 3, cu: 1.59, vc: 1.3, va: 1, ve: 0.7, vk: 2.7, fol: 98, b6: 0.54, cho: 39, ala: 9.1 } },
  { id: 'haselnuesse', n: 'Haselnüsse', cat: 'Nüsse & Samen', u: [['Handvoll', 30], ['g', 1]], pl: 'Haselnuss', pp: 5, pre: 1, v: { kcal: 654, p: 15, f: 60.8, sf: 4.5, c: 7, sug: 4.3, fib: 9.7, k: 680, ca: 114, mg: 163, fe: 4.7, zn: 2.45, se: 2.4, i: 1, cu: 1.73, vc: 6.3, va: 1, ve: 15, vk: 14.2, fol: 113, b6: 0.56, cho: 45.6, ala: 0.09 } },
  { id: 'cashews', n: 'Cashews', cat: 'Nüsse & Samen', u: [['Handvoll', 30], ['g', 1]], pl: 'Cashew', pp: 0.5, v: { kcal: 583, p: 18.2, f: 43.9, sf: 7.8, c: 27, sug: 5.9, fib: 3.3, na: 12, k: 660, ca: 37, mg: 292, fe: 6.68, zn: 5.78, se: 19.9, i: 1, cu: 2.2, vc: 0.5, ve: 0.9, vk: 34.1, fol: 25, b6: 0.42, cho: 61, ala: 0.06 } },
  { id: 'leinsamen', n: 'Leinsamen (geschrotet)', cat: 'Nüsse & Samen', u: [['EL', 8], ['g', 1]], pl: 'Lein', pp: 15, pre: 4, v: { kcal: 515, p: 18.3, f: 42.2, sf: 3.7, c: 1.6, sug: 1.6, fib: 27.3, na: 30, k: 813, ca: 255, mg: 392, fe: 5.7, zn: 4.3, se: 25, i: 1, cu: 1.22, vc: 0.6, ve: 0.31, vk: 4.3, fol: 87, b6: 0.47, cho: 78.7, ala: 22.8 } },
  { id: 'chiasamen', n: 'Chiasamen', cat: 'Nüsse & Samen', u: [['EL', 10], ['g', 1]], pl: 'Chia', pp: 1, pre: 3, v: { kcal: 442, p: 16.5, f: 30.7, sf: 3.3, c: 7.7, fib: 34.4, na: 16, k: 407, ca: 631, mg: 335, fe: 7.7, zn: 4.6, se: 55.2, i: 1, cu: 0.92, vc: 1.6, va: 3, ve: 0.5, fol: 49, b6: 0.1, ala: 17.8 } },
  { id: 'hanfsamen', n: 'Hanfsamen (geschält)', cat: 'Nüsse & Samen', u: [['EL', 10], ['g', 1]], pl: 'Hanf', pp: 0.3, v: { kcal: 585, p: 31.6, f: 48.8, sf: 4.6, c: 4.7, sug: 1.5, fib: 4, na: 5, k: 1200, ca: 70, mg: 700, fe: 7.95, zn: 9.9, i: 1, cu: 1.6, vc: 0.5, va: 1, ve: 0.8, fol: 110, b6: 0.6, ala: 8.7 } },
  { id: 'sonnenblumenkerne', n: 'Sonnenblumenkerne', cat: 'Nüsse & Samen', u: [['EL', 10], ['g', 1]], pl: 'Sonnenblume', pp: 1, v: { kcal: 600, p: 20.8, f: 51.5, sf: 4.5, c: 11.4, sug: 2.6, fib: 8.6, na: 9, k: 645, ca: 78, mg: 325, fe: 5.25, zn: 5, se: 53, i: 1, cu: 1.8, vc: 1.4, va: 3, ve: 35.2, fol: 227, b6: 1.35, cho: 55, ala: 0.06 } },
  { id: 'sesam', n: 'Sesam (ungeschält)', cat: 'Nüsse & Samen', u: [['EL', 10], ['g', 1]], pl: 'Sesam', pp: 0.5, v: { kcal: 589, p: 17.7, f: 49.7, sf: 7, c: 11.7, sug: 0.3, fib: 11.8, na: 11, k: 468, ca: 975, mg: 351, fe: 14.6, zn: 7.75, se: 34.4, i: 1, cu: 4.08, fol: 97, b6: 0.79, cho: 25.6, ala: 0.38 } },
  { id: 'erdnussbutter', n: 'Erdnussmus (100 %)', cat: 'Nüsse & Samen', u: [['EL', 16], ['g', 1]], pl: 'Erdnuss', pp: 0.5, v: { kcal: 600, p: 25, f: 50, sf: 8, c: 13, sug: 6, fib: 6, na: 10, k: 560, ca: 45, mg: 170, fe: 1.9, zn: 2.8, se: 4, i: 1, cu: 0.5, ve: 9, vk: 0.3, fol: 90, b6: 0.4, cho: 63 } },
  { id: 'kakaonibs', n: 'Kakaonibs', cat: 'Nüsse & Samen', u: [['EL', 8], ['g', 1]], pl: 'Kakao', pp: 30, pre: 2, v: { kcal: 590, p: 14, f: 50, sf: 30, c: 9, sug: 1, fib: 30, na: 10, k: 830, ca: 70, mg: 300, fe: 4.5, zn: 6.5, se: 5, i: 1, cu: 2.5, ve: 0.4, vk: 3, fol: 15, b6: 0.06, cho: 12, caf: 200 } },

  /* Getreide & Brot */
  { id: 'flohsamen', n: 'Flohsamenschalen', cat: 'Getreide & Brot', u: [['g', 1], ['TL', 5]], pl: 'Flohsamen', pre: 5, v: { kcal: 200, p: 2.1, f: 0.6, sf: 0.1, c: 4, sug: 0.5, fib: 82, na: 40, k: 300, ca: 100, mg: 30, fe: 2, zn: 0.3 } },
  { id: 'haferflocken', n: 'Haferflocken', cat: 'Getreide & Brot', u: [['Portion', 80], ['EL', 10], ['g', 1]], pl: 'Hafer', pp: 0.3, pre: 4.5, v: { kcal: 372, p: 13.5, f: 7, sf: 1.3, c: 58.7, sug: 0.7, fib: 10, na: 3, k: 360, ca: 50, mg: 130, fe: 4.5, zn: 3.6, se: 5, i: 1, cu: 0.4, ve: 0.7, vk: 2, fol: 30, b6: 0.12, cho: 40, ala: 0.1 } },
  { id: 'dinkelflocken', n: 'Dinkelflocken', cat: 'Getreide & Brot', u: [['Portion', 40], ['EL', 8], ['g', 1]], pl: 'Dinkel', pp: 1, pre: 2, v: { kcal: 350, p: 13, f: 2.5, sf: 0.4, c: 64, sug: 1, fib: 9, na: 8, k: 390, ca: 27, mg: 136, fe: 4.4, zn: 3.3, se: 4, i: 1, cu: 0.5, ve: 0.8, vk: 2, fol: 45, b6: 0.23, cho: 30, ala: 0.07 } },
  { id: 'vollkornbrot', n: 'Roggenvollkornbrot', cat: 'Getreide & Brot', u: [['Scheibe', 50], ['g', 1]], pl: 'Roggen', pp: 1.4, pre: 1.5, v: { kcal: 200, p: 6.5, f: 1.2, sf: 0.2, c: 38, sug: 3, fib: 8.5, na: 420, k: 290, ca: 25, mg: 60, fe: 2, zn: 1.6, se: 2, i: 5, cu: 0.3, ve: 0.6, vk: 2, fol: 25, b6: 0.2, cho: 15, ala: 0.05 } },
  { id: 'broetchen', n: 'Weizenbrötchen', cat: 'Getreide & Brot', u: [['Stück', 60], ['g', 1]], pl: 'Weizen', tags: ['upf'], v: { kcal: 270, p: 9, f: 2, sf: 0.4, c: 52, sug: 3, fib: 3, na: 500, k: 120, ca: 25, mg: 25, fe: 1.2, zn: 0.8, se: 4, i: 5, cu: 0.15, fol: 30, b6: 0.08, cho: 12 } },
  { id: 'vollkornreis', n: 'Vollkornreis (gekocht)', cat: 'Getreide & Brot', u: [['Portion', 200], ['g', 1]], pl: 'Reis', pp: 0.2, pre: 0.8, v: { kcal: 119, p: 2.7, f: 1, sf: 0.2, c: 24, sug: 0.2, fib: 1.6, na: 4, k: 86, ca: 3, mg: 39, fe: 0.56, zn: 0.71, se: 5, i: 1, cu: 0.11, ve: 0.17, vk: 0.6, fol: 9, b6: 0.12, cho: 9 } },
  { id: 'reis', n: 'Reis weiß (gekocht)', cat: 'Getreide & Brot', u: [['Portion', 200], ['g', 1]], pl: 'Reis', pre: 0.5, v: { kcal: 130, p: 2.7, f: 0.3, sf: 0.08, c: 28, fib: 0.4, na: 1, k: 35, ca: 10, mg: 12, fe: 0.2, zn: 0.49, se: 7.5, i: 1, cu: 0.07, fol: 3, b6: 0.09, cho: 2 } },
  { id: 'vollkornnudeln', n: 'Vollkornnudeln (gekocht)', cat: 'Getreide & Brot', u: [['Portion', 250], ['g', 1]], pl: 'Weizen', pp: 1, pre: 1, v: { kcal: 150, p: 6, f: 1.4, sf: 0.3, c: 26, sug: 0.8, fib: 4.5, na: 4, k: 96, ca: 18, mg: 54, fe: 1.5, zn: 1.1, se: 10, i: 1, cu: 0.2, ve: 0.3, fol: 7, b6: 0.1, cho: 15 } },
  { id: 'nudeln', n: 'Nudeln (gekocht)', cat: 'Getreide & Brot', u: [['Portion', 250], ['g', 1]], pl: 'Weizen', pre: 0.3, v: { kcal: 158, p: 5.8, f: 0.9, sf: 0.17, c: 30.9, sug: 0.6, fib: 1.8, na: 1, k: 44, ca: 7, mg: 18, fe: 0.5, zn: 0.51, se: 10, i: 1, cu: 0.1, fol: 7, b6: 0.05, cho: 6.4 } },
  { id: 'quinoa', n: 'Quinoa (gekocht)', cat: 'Getreide & Brot', u: [['Portion', 200], ['g', 1]], pl: 'Quinoa', pp: 0.5, pre: 0.5, v: { kcal: 120, p: 4.4, f: 1.9, sf: 0.23, c: 18.5, sug: 0.9, fib: 2.8, na: 7, k: 172, ca: 17, mg: 64, fe: 1.5, zn: 1.1, se: 2.8, cu: 0.19, ve: 0.63, fol: 42, b6: 0.12, cho: 23 } },

  /* Hülsenfrüchte & Soja */
  { id: 'linsen', n: 'Linsen (gekocht)', cat: 'Hülsenfrüchte & Soja', u: [['Portion', 150], ['g', 1]], pl: 'Linse', pp: 0.5, pre: 2.5, v: { kcal: 106, p: 9, f: 0.4, sf: 0.05, c: 12.2, sug: 1.8, fib: 7.9, na: 2, k: 369, ca: 19, mg: 36, fe: 3.33, zn: 1.27, se: 2.8, i: 1, cu: 0.25, vc: 1.5, ve: 0.11, vk: 1.7, fol: 181, b6: 0.18, cho: 32.7 } },
  { id: 'kichererbsen', n: 'Kichererbsen (Dose)', cat: 'Hülsenfrüchte & Soja', u: [['Portion', 120], ['Dose (abgetropft)', 240], ['g', 1]], pl: 'Kichererbse', pp: 0.5, pre: 2.5, v: { kcal: 140, p: 7.5, f: 2.5, sf: 0.27, c: 17, sug: 3.5, fib: 7, na: 240, k: 172, ca: 45, mg: 30, fe: 1.9, zn: 1.1, se: 3, i: 1, cu: 0.3, vc: 1, va: 1, ve: 0.35, vk: 4, fol: 140, b6: 0.13, cho: 38 } },
  { id: 'kidneybohnen', n: 'Kidneybohnen (Dose)', cat: 'Hülsenfrüchte & Soja', u: [['Portion', 125], ['Dose (abgetropft)', 250], ['g', 1]], pl: 'Bohne', pp: 0.6, pre: 2.5, v: { kcal: 110, p: 7.5, f: 0.5, sf: 0.07, c: 15, sug: 2.5, fib: 6.5, na: 250, k: 340, ca: 35, mg: 35, fe: 2, zn: 0.8, se: 1, i: 1, cu: 0.2, vc: 1, vk: 8, fol: 90, b6: 0.1, cho: 30, ala: 0.1 } },
  { id: 'tofu', n: 'Tofu natur', cat: 'Hülsenfrüchte & Soja', u: [['Packung (200 g)', 200], ['g', 1]], pl: 'Soja', pp: 0.4, pre: 0.3, v: { kcal: 130, p: 13, f: 7.5, sf: 1.1, c: 1.5, sug: 0.5, fib: 1, na: 10, k: 150, ca: 200, mg: 50, fe: 2.5, zn: 1.5, se: 10, i: 1, cu: 0.3, vk: 2, fol: 20, b6: 0.07, cho: 28, ala: 0.5 } },
  { id: 'edamame', n: 'Edamame', cat: 'Hülsenfrüchte & Soja', u: [['Portion', 100], ['g', 1]], pl: 'Soja', pp: 0.5, pre: 1.5, v: { kcal: 121, p: 11.9, f: 5.2, sf: 0.6, c: 4, sug: 2.2, fib: 5.2, na: 6, k: 436, ca: 63, mg: 64, fe: 2.27, zn: 1.37, se: 0.8, i: 1, cu: 0.34, vc: 6.1, va: 8, ve: 0.68, vk: 26.7, fol: 311, b6: 0.1, cho: 56, ala: 0.36 } },

  /* Fleisch & Fisch */
  { id: 'makrele', n: 'Makrele im eigenen Saft', cat: 'Fleisch & Fisch', u: [['Dose', 120], ['g', 1]], v: { kcal: 190, p: 20, f: 12.5, sf: 3, na: 360, k: 300, ca: 25, mg: 30, fe: 1.4, zn: 0.7, se: 45, i: 45, cu: 0.1, vd: 8, va: 40, ret: 40, ve: 1.5, vk: 5, b12: 9, fol: 5, b6: 0.35, cho: 80, epa: 0.7, dha: 1.1, ala: 0.15 } },
  { id: 'sardinen', n: 'Sardinen (Dose, mit Gräten)', cat: 'Fleisch & Fisch', u: [['Dose (abgetropft)', 90], ['g', 1]], v: { kcal: 208, p: 24.6, f: 11.5, sf: 1.5, na: 400, k: 397, ca: 382, mg: 39, fe: 2.9, zn: 1.3, se: 52.7, i: 30, cu: 0.19, vd: 4.8, va: 32, ret: 32, ve: 2, vk: 2.6, b12: 8.9, fol: 10, b6: 0.17, cho: 75, epa: 0.47, dha: 0.51 } },
  { id: 'lachs', n: 'Lachs (gegart)', cat: 'Fleisch & Fisch', u: [['Filet', 125], ['g', 1]], v: { kcal: 206, p: 22, f: 12.4, sf: 2.5, na: 61, k: 384, ca: 15, mg: 30, fe: 0.34, zn: 0.43, se: 41.4, i: 15, cu: 0.05, vd: 8, va: 69, ret: 69, ve: 2, vk: 0.5, b12: 2.8, fol: 34, b6: 0.65, cho: 90, epa: 0.69, dha: 1.46, ala: 0.1 } },
  { id: 'seelachs', n: 'Seelachs (gegart)', cat: 'Fleisch & Fisch', u: [['Filet', 125], ['g', 1]], v: { kcal: 111, p: 23, f: 1.2, sf: 0.2, na: 110, k: 380, ca: 70, mg: 70, fe: 0.5, zn: 0.6, se: 40, i: 170, cu: 0.05, vd: 1, va: 15, ret: 15, ve: 0.3, vk: 0.1, b12: 3.7, fol: 4, b6: 0.3, cho: 85, epa: 0.1, dha: 0.35 } },
  { id: 'kabeljau', n: 'Kabeljau (gegart)', cat: 'Fleisch & Fisch', u: [['Filet', 125], ['g', 1]], v: { kcal: 105, p: 23, f: 0.9, sf: 0.2, na: 78, k: 440, ca: 14, mg: 42, fe: 0.49, zn: 0.58, se: 37.6, i: 120, cu: 0.04, vd: 1, va: 14, ret: 14, ve: 0.8, vk: 0.1, b12: 1.05, fol: 8, b6: 0.28, cho: 83, epa: 0.004, dha: 0.15 } },
  { id: 'thunfisch', n: 'Thunfisch (Dose, Saft)', cat: 'Fleisch & Fisch', u: [['Dose (abgetropft)', 140], ['g', 1]], v: { kcal: 116, p: 26, f: 1, sf: 0.3, na: 300, k: 240, ca: 12, mg: 27, fe: 1.5, zn: 0.8, se: 80, i: 15, cu: 0.05, vd: 1.7, va: 17, ret: 17, ve: 0.3, vk: 0.1, b12: 2.5, fol: 4, b6: 0.35, cho: 30, epa: 0.05, dha: 0.2 } },
  { id: 'haehnchen', n: 'Hähnchenbrust (gegart)', cat: 'Fleisch & Fisch', u: [['Filet', 150], ['g', 1]], v: { kcal: 150, p: 31, f: 3.6, sf: 1, na: 74, k: 256, ca: 15, mg: 29, fe: 1.04, zn: 1, se: 15, i: 2, cu: 0.05, vd: 0.1, va: 9, ret: 9, ve: 0.27, vk: 0.3, b12: 0.34, fol: 4, b6: 0.6, cho: 85, epa: 0.01, dha: 0.02 } },
  { id: 'rinderhack', n: 'Rinderhack (gebraten)', cat: 'Fleisch & Fisch', u: [['Portion', 150], ['g', 1]], v: { kcal: 250, p: 26, f: 16, sf: 6.3, na: 75, k: 330, ca: 18, mg: 21, fe: 2.6, zn: 6.3, se: 21, i: 2, cu: 0.08, vd: 0.1, ve: 0.4, vk: 1.2, b12: 2.6, fol: 9, b6: 0.35, cho: 85, epa: 0.01, ala: 0.05 } },
  { id: 'rindersteak', n: 'Rindersteak (mager)', cat: 'Fleisch & Fisch', u: [['Steak', 200], ['g', 1]], v: { kcal: 180, p: 30, f: 6.5, sf: 2.6, na: 60, k: 370, ca: 20, mg: 26, fe: 2.8, zn: 5.5, se: 30, i: 2, cu: 0.1, vd: 0.1, ve: 0.4, vk: 1.5, b12: 2, fol: 8, b6: 0.6, cho: 100 } },
  { id: 'rinderleber', n: 'Rinderleber (gebraten)', cat: 'Fleisch & Fisch', u: [['Portion', 100], ['g', 1]], v: { kcal: 175, p: 26.5, f: 4.7, sf: 1.6, c: 5.1, na: 79, k: 351, ca: 6, mg: 22, fe: 6.5, zn: 5.3, se: 36, i: 3, cu: 14.6, vc: 1.9, vd: 1.2, va: 9440, ret: 9440, ve: 0.5, vk: 3.1, b12: 70.6, fol: 253, b6: 1, cho: 426, epa: 0.01, dha: 0.01 } },
  { id: 'beef_jerky', n: 'Beef Jerky', cat: 'Fleisch & Fisch', u: [['Packung (25 g)', 25], ['g', 1]], tags: ['upf'], v: { kcal: 280, p: 33, f: 7, sf: 3, c: 11, sug: 9, fs: 8, fib: 1, na: 1800, k: 600, ca: 20, mg: 50, fe: 5, zn: 8, se: 20, i: 5, cu: 0.3, b12: 1, fol: 30, b6: 0.2, cho: 50 } },

  /* Fertiggerichte (Schätzwerte, anpassbar) */
  { id: 'prepmymeal', n: 'Prepmymeal XL (Durchschnitt)', cat: 'Fertiggerichte', est: true, u: [['Beutel (1.000 g)', 1000], ['g', 1]], pp: 0.2, pre: 0.2, v: { kcal: 106, p: 8.9, f: 3, sf: 1.2, c: 10, sug: 1.6, fib: 1.5, na: 330, k: 210, ca: 25, mg: 20, fe: 0.7, zn: 0.8, se: 4, i: 2, cu: 0.08, vc: 6, vd: 0.05, va: 40, ret: 5, ve: 0.4, vk: 15, b12: 0.25, fol: 15, b6: 0.2, cho: 26, dha: 0.005, ala: 0.05 } },
  { id: 'pmm_hrb', n: 'Prepmymeal Hähnchen, Reis, Brokkoli XL', cat: 'Fertiggerichte', est: true, u: [['Beutel (1.000 g)', 1000], ['g', 1]], pl: ['Reis', 'Brokkoli'], pp: 0.2, pre: 0.2, v: { kcal: 91, p: 8.3, f: 1, sf: 0.3, c: 11.8, sug: 0.8, fib: 1, na: 300, k: 230, ca: 20, mg: 22, fe: 0.5, zn: 0.6, se: 6, i: 2, cu: 0.06, vc: 15, va: 15, ret: 3, ve: 0.4, vk: 30, b12: 0.1, fol: 20, b6: 0.25, cho: 30 } },
  { id: 'pmm_fajita', n: 'Prepmymeal Hähnchen Fajita Bowl XL', cat: 'Fertiggerichte', est: true, u: [['Beutel (1.000 g)', 1000], ['g', 1]], pl: ['Reis', 'Paprika', 'Zwiebel'], pp: 0.3, pre: 0.3, v: { kcal: 110, p: 10.9, f: 2.1, sf: 0.6, c: 11.5, sug: 1.5, fib: 1.5, na: 330, k: 250, ca: 20, mg: 22, fe: 0.8, zn: 0.7, se: 7, i: 2, cu: 0.08, vc: 20, va: 40, ret: 3, ve: 0.5, vk: 10, b12: 0.15, fol: 20, b6: 0.3, cho: 32 } },
  { id: 'pmm_butter', n: 'Prepmymeal Butter Chicken XL', cat: 'Fertiggerichte', est: true, u: [['Beutel (1.000 g)', 1000], ['g', 1]], pl: ['Reis', 'Tomate'], pp: 0.3, pre: 0.1, v: { kcal: 111, p: 8.6, f: 4.2, sf: 2.2, c: 9.4, sug: 1.8, fib: 0.8, na: 340, k: 200, ca: 30, mg: 18, fe: 0.6, zn: 0.7, se: 6, i: 3, cu: 0.06, vc: 4, va: 50, ret: 25, ve: 0.5, vk: 5, b12: 0.15, fol: 10, b6: 0.25, cho: 30 } },
  { id: 'pmm_bolo', n: 'Prepmymeal Protein Pasta Bolognese XL', cat: 'Fertiggerichte', est: true, u: [['Beutel (1.000 g)', 1000], ['g', 1]], pl: ['Tomate', 'Zwiebel'], pp: 0.3, pre: 0.3, v: { kcal: 126, p: 8.6, f: 3.3, sf: 1.3, c: 15, sug: 2, fib: 1.2, na: 330, k: 230, ca: 25, mg: 25, fe: 1, zn: 1.3, se: 6, i: 2, cu: 0.1, vc: 5, va: 30, ret: 2, ve: 0.5, vk: 8, b12: 0.4, fol: 15, b6: 0.15, cho: 25 } },
  { id: 'pmm_chili', n: 'Prepmymeal Chili con Carne XL', cat: 'Fertiggerichte', est: true, u: [['Beutel (1.000 g)', 1000], ['g', 1]], pl: ['Bohne', 'Mais', 'Tomate', 'Paprika', 'Zwiebel'], pp: 0.5, pre: 0.5, v: { kcal: 120, p: 7.1, f: 4.6, sf: 2, c: 11, sug: 1.8, fib: 2.5, na: 332, k: 300, ca: 30, mg: 28, fe: 1.3, zn: 1.3, se: 4, i: 2, cu: 0.12, vc: 8, va: 40, ret: 2, ve: 0.6, vk: 6, b12: 0.4, fol: 30, b6: 0.18, cho: 25 } },
  { id: 'pmm_pasta', n: 'Prepmymeal Protein Pasta Frischkäse XL', cat: 'Fertiggerichte', est: true, u: [['Beutel (1.000 g)', 1000], ['g', 1]], pl: ['Paprika', 'Spinat'], pp: 0.2, pre: 0.3, v: { kcal: 118, p: 6.3, f: 3.8, sf: 2, c: 14, sug: 1.9, fib: 1.53, na: 340, k: 180, ca: 50, mg: 20, fe: 0.6, zn: 0.6, se: 4, i: 3, cu: 0.07, vc: 6, va: 60, ret: 20, ve: 0.5, vk: 40, b12: 0.2, fol: 30, b6: 0.12, cho: 20 } },
  { id: 'doener', n: 'Döner im Brot (Schätzung)', cat: 'Fertiggerichte', est: true, u: [['Stück', 400], ['g', 1]], pl: ['Weizen', 'Salat', 'Tomate', 'Zwiebel', 'Rotkohl'], pp: 0.2, pre: 0.2, v: { kcal: 190, p: 10, f: 8, sf: 3, c: 18.5, sug: 2.5, fib: 1.3, na: 380, k: 220, ca: 40, mg: 20, fe: 1, zn: 1.4, se: 5, i: 3, cu: 0.08, vc: 4, vd: 0.1, va: 15, ret: 5, ve: 0.5, vk: 10, b12: 0.4, fol: 15, b6: 0.15, cho: 30 } },

  /* Öle, Süßes, Gewürze */
  { id: 'olivenoel', n: 'Olivenöl extra vergine', cat: 'Öle & Fette', u: [['EL', 10], ['TL', 4], ['g', 1]], pl: 'Olive', pp: 10, v: { kcal: 884, f: 100, sf: 14, na: 2, k: 1, ca: 1, fe: 0.56, ve: 14.4, vk: 60, ala: 0.76 } },
  { id: 'schokolade85', n: 'Dunkle Schokolade 85 %', cat: 'Süßes & Snacks', u: [['Rippe', 10], ['g', 1]], pl: 'Kakao', pp: 16.6, pre: 1, v: { kcal: 590, p: 12, f: 47, sf: 28, c: 19, sug: 11, fs: 11, fib: 13, na: 10, k: 715, ca: 73, mg: 228, fe: 11.9, zn: 3.3, se: 6.8, i: 2, cu: 1.77, va: 2, ve: 0.6, vk: 7.3, b6: 0.04, cho: 12, caf: 80 } },
  { id: 'schokolade90', n: 'Dunkle Schokolade 90 %', cat: 'Süßes & Snacks', est: true, u: [['Rippe', 10], ['g', 1]], pl: 'Kakao', pp: 18, pre: 1, v: { kcal: 596, p: 12, f: 51, sf: 31, c: 14, sug: 7, fs: 7, fib: 12, na: 10, k: 750, ca: 70, mg: 240, fe: 12.5, zn: 3.5, se: 7, i: 2, cu: 1.9, va: 2, ve: 0.6, vk: 7.5, b6: 0.04, cho: 12, caf: 90 } },
  { id: 'gummibaerchen', n: 'Gummibärchen', cat: 'Süßes & Snacks', u: [['Handvoll', 30], ['Tüte (200 g)', 200], ['g', 1]], tags: ['upf'], v: { kcal: 343, p: 6.9, f: 0.1, c: 77, sug: 46, fs: 46, na: 20 } },
  { id: 'honig', n: 'Honig', cat: 'Süßes & Snacks', u: [['TL', 8], ['g', 1]], v: { kcal: 320, p: 0.3, c: 80, sug: 80, fs: 80, na: 4, k: 52, ca: 6, mg: 2, fe: 0.42, zn: 0.22, cu: 0.04, vc: 0.5, fol: 2, b6: 0.02 } },
  { id: 'jodsalz', n: 'Jodsalz', cat: 'Kräuter & Gewürze', u: [['g', 1], ['Prise', 0.5], ['TL', 5]], v: { na: 38758, i: 2000 } },
  { id: 'kurkuma', n: 'Kurkuma', cat: 'Kräuter & Gewürze', u: [['TL', 3], ['g', 1]], pl: 'Kurkuma', pp: 20, v: { kcal: 312, p: 9.7, f: 3.3, c: 44, fib: 22.7, na: 27, k: 2080, ca: 168, mg: 208, fe: 55, zn: 4.5, cu: 1.3, vc: 0.7, ve: 4.4, vk: 13.4, fol: 20, b6: 0.1 } },
  { id: 'zimt', n: 'Zimt', cat: 'Kräuter & Gewürze', u: [['TL', 2.6], ['g', 1]], pl: 'Zimt', pp: 30, v: { kcal: 247, p: 4, f: 1.2, c: 27.5, fib: 53, na: 10, k: 431, ca: 1002, mg: 60, fe: 8.3, zn: 1.8, cu: 0.34, vc: 3.8, va: 15, ve: 2.3, vk: 31, fol: 6 } },
  { id: 'oregano', n: 'Oregano (getrocknet)', cat: 'Kräuter & Gewürze', u: [['TL', 1], ['g', 1]], pl: 'Oregano', pp: 23, v: { kcal: 265, p: 9, f: 4.3, c: 26, fib: 42.5, na: 25, k: 1260, ca: 1597, mg: 270, fe: 36.8, zn: 2.7, cu: 0.63, vc: 2.3, va: 85, ve: 18.3, vk: 622, fol: 237, b6: 1.04 } },
  { id: 'pfeffer', n: 'Schwarzer Pfeffer', cat: 'Kräuter & Gewürze', u: [['Prise', 0.3], ['g', 1]], pl: 'Pfeffer', pp: 1, v: { kcal: 251, p: 10.4, f: 3.3, c: 38.7, fib: 25.3, k: 1329, ca: 443, mg: 171, fe: 9.7, zn: 1.2, cu: 1.33, vk: 163.7 } },
  { id: 'ingwer', n: 'Ingwer (frisch)', cat: 'Kräuter & Gewürze', u: [['Scheibe', 3], ['g', 1]], pl: 'Ingwer', pp: 2, v: { kcal: 80, p: 1.8, f: 0.8, c: 15.8, sug: 1.7, fib: 2, na: 13, k: 415, ca: 16, mg: 43, fe: 0.6, zn: 0.34, cu: 0.23, vc: 5, fol: 11, b6: 0.16 } },
  { id: 'petersilie', n: 'Petersilie (frisch)', cat: 'Kräuter & Gewürze', u: [['EL', 4], ['g', 1]], pl: 'Petersilie', pp: 1, v: { kcal: 36, p: 3, f: 0.8, c: 3, fib: 3.3, na: 56, k: 554, ca: 138, mg: 50, fe: 6.2, zn: 1.07, cu: 0.15, vc: 133, va: 421, ve: 0.75, vk: 1640, fol: 152, b6: 0.09 } },
  { id: 'basilikum', n: 'Basilikum (frisch)', cat: 'Kräuter & Gewürze', u: [['Handvoll', 5], ['g', 1]], pl: 'Basilikum', pp: 1, v: { kcal: 23, p: 3.2, f: 0.6, c: 1, fib: 1.6, na: 4, k: 295, ca: 177, mg: 64, fe: 3.2, zn: 0.81, cu: 0.39, vc: 18, va: 264, ve: 0.8, vk: 415, fol: 68, b6: 0.16 } },
];

/* ---------- Standardtag (Schnellmodus) ----------
   v: in welchen Tagesvarianten enthalten (fehlt = alle) · av: Menge je Variante
   opt: optional (nicht in Prognose / „Alle“) · choice: auswählbare Lebensmittel
   cg: gemeinsame Auswahlgruppe (z. B. derselbe Prepmymeal-Beutel) */
const VARIANTS = { prep: 'Prepmymeal-Tag', doener: 'Döner-Tag', makrele: 'Makrele-Tag' };
const TRAINING = {
  morgens: { n: 'Morgens', time: '08:40', hint: 'Variante A, früh morgens: vorher ein Glas Wasser mit Salz und ein paar Datteln, direkt danach Frühstück mit Eiern (und Prepmymeal).' },
  mittags: { n: 'Mittags', time: '15:00', hint: 'Variante B, mittags oder nachmittags: ca. 2 Std. vorher normale Mahlzeit, danach die nächste Mahlzeit proteinreich. Der einfachste Fall.' },
  abends:  { n: 'Abends', time: '18:30', hint: 'Variante C, 19–20 Uhr: gegen 17 Uhr eine richtige Mahlzeit, nach dem Training nur die Skyr-Bowl mit Haferflocken (leicht verdaulich, passt auch spät).' },
  keins:   { n: 'Ruhetag', time: '16:00', hint: 'Ruhetag: Banane und Datteln einfach am Nachmittag. Protein- und Kalorienziel bleiben gleich, die Regeneration läuft.' },
};
const PMM_CHOICES = ['prepmymeal', 'pmm_hrb', 'pmm_fajita', 'pmm_butter', 'pmm_bolo', 'pmm_chili', 'pmm_pasta'];

const DEFAULT_PLAN = [
  { id: 'morgen', n: 'Direkt nach dem Aufstehen', time: '08:30', items: [
    { id: 'm_wasser', food: 'wasser', a: 400, u: 'ml', label: 'Wasser', hint: 'gern mit einer Prise Salz' },
    { id: 'm_flohsamen', food: 'flohsamen', a: 10, u: 'g' },
    { id: 'm_kreatin', food: 's_kreatin', a: 5, u: 'g' },
    { id: 'm_wasser2', food: 'wasser', a: 250, u: 'ml', label: 'Noch ein Glas Wasser' },
    { id: 'm_ag1', food: 's_ag1', a: 1, u: 'Portion', opt: true, hint: 'alle paar Tage' },
  ] },
  { id: 'fruehstueck', n: 'Frühstück', time: '09:00', items: [
    { id: 'f_eier', food: 'ei', a: 3, u: 'Stück', label: 'Eier' },
    { id: 'f_spinat', food: 'spinat', a: 100, u: 'g' },
    { id: 'f_paprika', food: 'paprika_rot', a: 150, u: 'g', hint: 'roh' },
    { id: 'f_oel', food: 'olivenoel', a: 1, u: 'EL' },
    { id: 'f_kiwi', food: 'kiwi_gold', choice: ['kiwi_gold', 'kiwi'], a: 1, u: 'Stück', label: 'Kiwi' },
    { id: 'f_ferm', food: 'sauerkraut', choice: ['sauerkraut', 'kimchi'], a: 40, u: 'g', label: 'Sauerkraut oder Kimchi' },
    { id: 'f_pmm', food: 'prepmymeal', choice: PMM_CHOICES, cg: 'pmm', a: 200, u: 'g', label: '20 % Prepmymeal XL', v: ['prep'] },
    { id: 'f_d3k2', food: 's_d3k2', a: 4, u: 'Tropfen', hint: 'zu den Eiern (fettlöslich)' },
    { id: 'f_omega3', food: 's_omega3', a: 2, u: 'Tagesdosis', av: { doener: 1, makrele: 1 }, hint: 'an Makrele-Tagen 1' },
  ] },
  { id: 'mittag', n: 'Mittag', time: '13:00', items: [
    { id: 'l_pmm', food: 'prepmymeal', choice: PMM_CHOICES, cg: 'pmm', a: 600, u: 'g', label: '60 % Prepmymeal XL', v: ['prep', 'makrele'] },
    { id: 'l_doener', food: 'doener', a: 1, u: 'Stück', label: 'Döner', v: ['doener'], hint: 'Uni-Tag' },
    { id: 'l_oel', food: 'olivenoel', a: 1, u: 'EL', v: ['prep', 'makrele'], hint: 'über das Prepmymeal' },
    { id: 'l_karotten', food: 'karotten', a: 150, u: 'g', hint: 'mit etwas Fett (Nüsse/Öl)' },
    { id: 'l_tee', food: 'gruener_tee', a: 2, u: 'Tasse (250 ml)', label: 'Grüner Tee', hint: 'ca. 1 Std. Abstand zum Essen, bis 14:30' },
  ] },
  { id: 'nachmittag', n: 'Nachmittag', time: '16:00', items: [
    { id: 'n_pmm', food: 'prepmymeal', choice: PMM_CHOICES, cg: 'pmm', a: 200, u: 'g', label: '20 % Prepmymeal XL', v: ['prep'] },
    { id: 'n_makrele', food: 'makrele', a: 1, u: 'Dose', v: ['doener', 'makrele'] },
    { id: 'n_brot', food: 'vollkornbrot', a: 1, u: 'Scheibe', v: ['doener', 'makrele'] },
    { id: 'n_gurke', food: 'gurke', a: 100, u: 'g', v: ['doener', 'makrele'] },
    { id: 'n_kuerbis', food: 'kuerbiskerne', a: 20, u: 'g' },
    { id: 'n_mandeln', food: 'mandeln', a: 30, u: 'g' },
    { id: 'n_paranuss', food: 'paranuss', a: 1, u: 'Stück' },
    { id: 'n_schoko', food: 'schokolade90', choice: ['schokolade90', 'schokolade85'], a: 20, u: 'g', label: 'Dunkle Schokolade (85–90 %)' },
    { id: 'n_kefir', food: 'kefir', a: 150, u: 'ml' },
  ] },
  { id: 'training', n: 'Rund ums Training', time: 'training', items: [
    { id: 't_banane', food: 'banane', a: 1, u: 'Stück' },
    { id: 't_datteln', food: 'datteln', a: 60, u: 'g' },
  ] },
  { id: 'abend', n: 'Abend', time: '19:30', items: [
    { id: 'a_skyr', food: 'skyr', a: 500, u: 'g' },
    { id: 'a_hafer', food: 'haferflocken', a: 80, u: 'g', hint: 'als Overnight Oats im Skyr einweichen' },
    { id: 'a_beeren', food: 'heidelbeeren', choice: ['heidelbeeren', 'himbeeren', 'brombeeren', 'beerenmix'], rotate: true, a: 150, u: 'g', label: 'TK-Beeren' },
    { id: 'a_lein', food: 'leinsamen', a: 15, u: 'g' },
  ] },
  { id: 'schlaf', n: 'Vor dem Schlafen', time: '21:45', items: [
    { id: 's_mg', food: 's_mg_threonat', a: 1, u: 'Dosis (144 mg Mg)', opt: true, hint: 'nur an Tagen mit wenig Magnesium aus Lebensmitteln' },
  ] },
  { id: 'getraenke', n: 'Getränke über den Tag', time: null, items: [
    { id: 'g_osaft', food: 'o_saft', a: 250, u: 'ml', hint: 'am besten zum Frühstück (Eisenaufnahme)' },
    { id: 'g_kokos', food: 'kokoswasser', a: 330, u: 'ml' },
    { id: 'g_kombucha', food: 'kombucha', a: 250, u: 'ml' },
    { id: 'g_mineral', food: 'mineralwasser', a: 1000, u: 'ml' },
    { id: 'g_jodsalz', food: 'jodsalz', a: 2, u: 'g', label: 'Jodsalz beim Würzen', hint: 'z. B. die Eier' },
  ] },
  { id: 'vielfalt', n: 'Für Vielfalt (optional)', time: null, items: [
    { id: 'v_brokkoli', food: 'brokkoli', a: 150, u: 'g', opt: true },
    { id: 'v_rotebete', food: 'rotebete_saft', choice: ['rotebete_saft', 'rote_bete'], a: 200, u: 'ml', opt: true, label: 'Rote Bete' },
    { id: 'v_apfel', food: 'apfel', a: 1, u: 'Stück', opt: true },
    { id: 'v_tomate', food: 'tomate', a: 100, u: 'g', opt: true },
    { id: 'v_zwiebel', food: 'zwiebel', a: 50, u: 'g', opt: true },
    { id: 'v_knoblauch', food: 'knoblauch', a: 1, u: 'Zehe', opt: true },
    { id: 'v_hanf', food: 'hanfsamen', a: 10, u: 'g', opt: true },
    { id: 'v_nibs', food: 'kakaonibs', a: 10, u: 'g', opt: true },
    { id: 'v_sonnenblume', food: 'sonnenblumenkerne', a: 10, u: 'g', opt: true },
    { id: 'v_dinkel', food: 'dinkelflocken', a: 30, u: 'g', opt: true },
  ] },
];
/* Supplement ohne festen Platz im Tagesablauf */
const EXTRA_ITEMS = [
  { id: 'x_zink', food: 's_zink_lutsch', a: 1, u: 'Tablette', opt: true, hint: 'nur bei ersten Erkältungszeichen, kurzzeitig' },
];

/* ---------- Huberman-Gewohnheiten ---------- */
const HABITS = [
  { id: 'licht_morgen', n: 'Morgenlicht + 30 Min. Spaziergang', when: 'nach dem Aufstehen' },
  { id: 'licht_nachmittag', n: 'Nachmittagslicht', when: 'später Nachmittag, ein paar Minuten draußen' },
  { id: 'koffein', n: 'Koffein nur 10:00–14:30', when: '90–120 Min. nach dem Aufwachen bis 8 Std. vor dem Schlafen', detail: { type: 'time', key: 'caffeineEnd', label: 'Letztes Koffein um' } },
  { id: 'alkohol', n: 'Kein Alkohol 8 Std. vor dem Schlafen', when: 'ab 14:30' },
  { id: 'mahlzeit', n: 'Letzte große Mahlzeit 2–3 Std. vor dem Schlafen', when: 'bis ca. 20:30', detail: { type: 'time', key: 'lastMeal', label: 'Letzte große Mahlzeit um' } },
  { id: 'bildschirm', n: '60 Min. vor dem Schlafen keine Bildschirme', when: 'mindestens 30 Min.', detail: { type: 'chips', key: 'screenFree', label: 'Bildschirmfrei vor dem Schlafen', options: [0, 15, 30, 45, 60, 90], unit: 'Min.' } },
  { id: 'dimmen', n: 'Gedimmtes Licht abends', when: 'warmes Licht unterhalb der Augenhöhe' },
  { id: 'nsdr', n: 'Meditation / NSDR', when: '10–30 Min.' },
  { id: 'sauna', n: 'Sauna', when: 'danach trinken + Elektrolyte' },
  { id: 'gesicht', n: 'Gesicht nach dem Gym waschen', when: 'Haut-Protokoll' },
];

/* ---------- Pflanzen-Auswahl für „+ Pflanze“ (ohne Nährwerte) ---------- */
const PLANT_PICKS = ['Bohne', 'Mais', 'Erbse', 'Linse', 'Kichererbse', 'Reis', 'Weizen', 'Roggen', 'Gerste', 'Buchweizen', 'Hirse', 'Quinoa', 'Kartoffel', 'Süßkartoffel', 'Zucchini', 'Aubergine', 'Paprika', 'Tomate', 'Gurke', 'Zwiebel', 'Lauch', 'Frühlingszwiebel', 'Knoblauch', 'Karotte', 'Sellerie', 'Pastinake', 'Rote Bete', 'Radieschen', 'Rettich', 'Brokkoli', 'Blumenkohl', 'Weißkohl', 'Rotkohl', 'Chinakohl', 'Grünkohl', 'Rosenkohl', 'Kohlrabi', 'Spinat', 'Mangold', 'Rucola', 'Feldsalat', 'Salat', 'Champignon', 'Kürbis', 'Spargel', 'Fenchel', 'Avocado', 'Olive', 'Apfel', 'Birne', 'Banane', 'Orange', 'Mandarine', 'Zitrone', 'Limette', 'Grapefruit', 'Kiwi', 'Mango', 'Ananas', 'Weintraube', 'Kirsche', 'Pflaume', 'Aprikose', 'Pfirsich', 'Erdbeere', 'Himbeere', 'Heidelbeere', 'Brombeere', 'Johannisbeere', 'Granatapfel', 'Dattel', 'Feige', 'Rosine', 'Kokos', 'Mandel', 'Walnuss', 'Haselnuss', 'Cashew', 'Pistazie', 'Erdnuss', 'Paranuss', 'Macadamia', 'Kürbis', 'Sonnenblume', 'Lein', 'Chia', 'Hanf', 'Sesam', 'Hafer', 'Dinkel', 'Soja', 'Kakao', 'Kaffee', 'Tee', 'Ingwer', 'Kurkuma', 'Zimt', 'Pfeffer', 'Chili', 'Oregano', 'Basilikum', 'Petersilie', 'Schnittlauch', 'Dill', 'Koriander', 'Minze', 'Rosmarin', 'Thymian', 'Kreuzkümmel', 'Paprikapulver', 'Muskat', 'Vanille'];

/* ---------- Haut-Protokoll (Daten in den Einstellungen änderbar) ---------- */
const DEFAULT_SKIN = {
  phases: [
    { id: 1, n: 'Phase 1', start: '2026-11-03', end: '2026-11-30', rules: ['Epilierer weg, Rasur mit OneBlade', 'Pflege: Zeniac + Physiogel', 'Kein Clienzo', 'Gesicht nach dem Gym waschen', 'Kissenbezug alle 3 Tage wechseln'], block: [] },
    { id: 2, n: 'Phase 2', start: '2026-12-01', end: '2026-12-28', rules: ['Kein Whey', 'Keine Milbona-Shakes'], block: ['whey', 'milbona'] },
    { id: 3, n: 'Phase 3', start: '2026-12-29', end: '2027-01-25', rules: ['AG1 pausieren'], block: ['ag1'] },
  ],
  routine: [
    { id: 'pflege_am', n: 'Pflege morgens (Zeniac + Physiogel)' },
    { id: 'pflege_pm', n: 'Pflege abends (Zeniac + Physiogel)' },
    { id: 'rasur', n: 'Rasiert mit OneBlade' },
    { id: 'kissen', n: 'Kissenbezug gewechselt', every: 3 },
    { id: 'polster', n: 'Kopfhörer-Polster gereinigt', every: 7 },
    { id: 'foto', n: 'Wöchentliches Foto (gleiches Licht)', every: 7 },
  ],
};

/* ---------- Garmin-Felder ---------- */
const HEALTH_FIELDS = [
  { group: 'Schlaf (Nacht auf heute)', fields: [
    { k: 'sleepScore', n: 'Sleep Score', type: 'num', min: 0, max: 100 },
    { k: 'sleepDur', n: 'Schlafdauer', type: 'dur' },
    { k: 'deep', n: 'Tiefschlaf', type: 'dur' },
    { k: 'rem', n: 'REM', type: 'dur' },
    { k: 'light', n: 'Leichtschlaf', type: 'dur' },
    { k: 'awake', n: 'Wach', type: 'dur' },
    { k: 'bedTime', n: 'Eingeschlafen', type: 'time' },
    { k: 'wakeTime', n: 'Aufgewacht', type: 'time' },
  ] },
  { group: 'Herz & Erholung', fields: [
    { k: 'hrv', n: 'HRV (Nacht-Ø)', type: 'num', unit: 'ms', min: 0, max: 300 },
    { k: 'hrvStatus', n: 'HRV-Status', type: 'choice', options: ['Ausgeglichen', 'Unausgeglichen', 'Niedrig', 'Schlecht'] },
    { k: 'rhr', n: 'Ruhepuls', type: 'num', unit: 'bpm', min: 25, max: 120 },
    { k: 'bbMorning', n: 'Body Battery morgens', type: 'num', min: 0, max: 100 },
    { k: 'bbEvening', n: 'Body Battery abends', type: 'num', min: 0, max: 100 },
    { k: 'stress', n: 'Stress-Ø', type: 'num', min: 0, max: 100 },
    { k: 'readiness', n: 'Trainingsbereitschaft', type: 'num', min: 0, max: 100 },
    { k: 'resp', n: 'Atemfrequenz', type: 'num', unit: '/min', min: 5, max: 40, dec: 1 },
    { k: 'spo2', n: 'SpO2', type: 'num', unit: '%', min: 70, max: 100 },
    { k: 'skinTemp', n: 'Hauttemperatur-Abw.', type: 'num', unit: '°C', min: -5, max: 5, dec: 1, signed: true },
  ] },
  { group: 'Aktivität', fields: [
    { k: 'steps', n: 'Schritte', type: 'num', min: 0, max: 100000 },
    { k: 'intensity', n: 'Intensitätsminuten', type: 'num', unit: 'Min.', min: 0, max: 1500 },
    { k: 'vo2', n: 'VO2max', type: 'num', min: 20, max: 90 },
  ] },
  { group: 'Körper', fields: [
    { k: 'weight', n: 'Körpergewicht', type: 'num', unit: 'kg', min: 30, max: 250, dec: 1 },
    { k: 'waist', n: 'Bauchumfang', type: 'num', unit: 'cm', min: 40, max: 200, dec: 1 },
  ] },
];
const TRAINING_TYPES = ['Kraft / Gym', 'Laufen', 'Rad', 'Schwimmen', 'HIIT', 'Spaziergang', 'Mobility', 'Sport', 'Sonstiges'];
const MOOD_FIELDS = [
  { k: 'wellbeing', n: 'Wohlbefinden' },
  { k: 'energy', n: 'Energie' },
  { k: 'focus', n: 'Fokus' },
];
/* Kennzahlen für Diagramme (Gesundheit) */
const HEALTH_METRICS = [
  { k: 'sleepScore', n: 'Sleep Score' }, { k: 'sleepDur', n: 'Schlafdauer', fmt: 'dur' }, { k: 'deep', n: 'Tiefschlaf', fmt: 'dur' }, { k: 'rem', n: 'REM', fmt: 'dur' },
  { k: 'hrv', n: 'HRV', u: 'ms' }, { k: 'rhr', n: 'Ruhepuls', u: 'bpm' }, { k: 'bbMorning', n: 'Body Battery morgens' }, { k: 'stress', n: 'Stress' },
  { k: 'readiness', n: 'Trainingsbereitschaft' }, { k: 'steps', n: 'Schritte' }, { k: 'intensity', n: 'Intensitätsminuten' }, { k: 'vo2', n: 'VO2max' },
  { k: 'resp', n: 'Atemfrequenz' }, { k: 'spo2', n: 'SpO2', u: '%' }, { k: 'skinTemp', n: 'Hauttemperatur' },
  { k: 'wellbeing', n: 'Wohlbefinden' }, { k: 'energy', n: 'Energie' }, { k: 'focus', n: 'Fokus' },
];

/* ---------- Tipp-Lebensmittel je Nährstoff (bevorzugt aus deinem Vorrat) ---------- */
const TIP_FOODS = {
  kcal: [['haferflocken', 80, 10], ['datteln', 60, 10], ['banane', 240, 120], ['mandeln', 40, 10]],
  p: [['skyr', 300, 50], ['ei', 110, 55], ['makrele', 120, 120], ['kefir', 300, 150]],
  c: [['haferflocken', 80, 10], ['datteln', 60, 10], ['banane', 240, 120]],
  fib: [['flohsamen', 10, 5], ['leinsamen', 20, 5], ['himbeeren', 150, 50], ['haferflocken', 40, 10]],
  vc: [['paprika_rot', 150, 50], ['kiwi_gold', 180, 90], ['o_saft', 250, 50], ['brokkoli', 150, 50]],
  vd: [['s_d3k2', 4, 2], ['makrele', 120, 120], ['ei', 110, 55]],
  vk: [['spinat', 50, 25], ['brokkoli', 150, 50], ['gruenkohl', 100, 50]],
  va: [['karotten', 150, 50], ['suesskartoffel', 150, 50], ['spinat', 50, 25]],
  ve: [['mandeln', 40, 5], ['sonnenblumenkerne', 20, 5], ['olivenoel', 10, 5]],
  b12: [['skyr', 300, 50], ['ei', 110, 55], ['kefir', 300, 150], ['makrele', 120, 120]],
  fol: [['spinat', 100, 25], ['feldsalat', 100, 25], ['brokkoli', 150, 50], ['linsen', 150, 50]],
  b6: [['banane', 240, 120], ['kartoffeln', 200, 100], ['sonnenblumenkerne', 20, 10]],
  mg: [['kuerbiskerne', 30, 5], ['haferflocken', 60, 10], ['mandeln', 40, 10], ['hanfsamen', 20, 10]],
  zn: [['kuerbiskerne', 30, 5], ['haferflocken', 60, 10], ['hanfsamen', 20, 10]],
  fe: [['kuerbiskerne', 30, 5], ['haferflocken', 60, 10], ['linsen', 150, 50]],
  se: [['paranuss', 5, 5], ['ei', 110, 55], ['makrele', 120, 120]],
  i: [['jodsalz', 3, 0.5], ['skyr', 300, 50], ['seelachs', 125, 125]],
  ca: [['mineralwasser', 1000, 250], ['skyr', 300, 50], ['kefir', 300, 150], ['mandeln', 40, 10]],
  k: [['banane', 240, 120], ['kokoswasser', 330, 330], ['datteln', 60, 10], ['kartoffeln', 300, 100]],
  cu: [['kuerbiskerne', 30, 5], ['cashews', 30, 10], ['kakaonibs', 15, 5]],
  cho: [['ei', 110, 55], ['skyr', 300, 50]],
  o3: [['s_omega3', 2, 1], ['makrele', 120, 120]],
  pre: [['haferflocken', 60, 10], ['zwiebel', 80, 40], ['knoblauch', 8, 4], ['banane', 120, 120]],
  pp: [['heidelbeeren', 150, 50], ['schokolade90', 20, 10], ['gruener_tee', 500, 250]],
  ferm: [['sauerkraut', 40, 40], ['kimchi', 40, 40], ['kefir', 150, 150], ['kombucha', 250, 250], ['joghurt', 150, 150]],
  fluid: [['wasser', 1000, 250], ['mineralwasser', 1000, 250]],
};
