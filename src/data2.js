/* ============================================================
   DATEN Teil 2: Bereiche, Training, Koffein, Einkauf, Blutwerte,
   Knie-Reset (nur allgemeine Inhalte – keine persönlichen Daten)
   ============================================================ */

/* Dynamisch verwendete Icons (für den Build): */
/*icons: pause play circle stretch-horizontal timer thermometer activity person-standing dumbbell footprints flame trending-up trending-down minus chevron-down chevron-right check triangle-alert arrow-down*/

/* ---------- Bereiche / Navigation ---------- */
const AREAS = [
  { id: 'heute', n: 'Heute', ic: 'sun' },
  { id: 'ern', n: 'Ernährung', ic: 'salad' },
  { id: 'supp', n: 'Supplements', ic: 'pill' },
  { id: 'train', n: 'Training & Sauna', short: 'Training', ic: 'dumbbell' },
  { id: 'knie', n: 'Knie & Mobility', short: 'Knie', ic: 'footprints' },
  { id: 'licht', n: 'Licht & Koffein', short: 'Licht', ic: 'sunrise' },
  { id: 'haut', n: 'Haut', ic: 'sparkles' },
  { id: 'koerper', n: 'Körper', ic: 'scale' },
  { id: 'blut', n: 'Blutwerte', ic: 'test-tube-diagonal' },
  { id: 'garmin', n: 'Garmin & Schlaf', short: 'Garmin', ic: 'watch' },
  { id: 'einkauf', n: 'Einkauf', ic: 'shopping-cart' },
  { id: 'woche', n: 'Wochenrückblick', short: 'Rückblick', ic: 'calendar-check' },
  { id: 'wunsch', n: 'Wunschliste', ic: 'gift' },
  { id: 'set', n: 'Einstellungen & Backup', short: 'Einstellungen', ic: 'settings' },
];
const MORE_TAB = { id: 'mehr', n: 'Mehr', ic: 'layout-grid' };
const DEFAULT_TABS = ['heute', 'ern', 'train', 'knie'];

/* ---------- Koffein ---------- */
const CAF_PRESETS = [
  { id: 'monster_zero', n: 'Monster Energy Zero 500 ml', ml: 500, mg: 160, kcal: 15, sug: 0, na: 380 },
  { id: 'kaffee', n: 'Kaffee (Tasse)', ml: 200, mg: 90, kcal: 2, sug: 0 },
  { id: 'espresso', n: 'Espresso', ml: 30, mg: 60, kcal: 1, sug: 0 },
  { id: 'gruentee', n: 'Grüner Tee (Tasse)', ml: 250, mg: 30, kcal: 1, sug: 0 },
  { id: 'cola', n: 'Cola 330 ml', ml: 330, mg: 32, kcal: 139, sug: 35 },
];

/* ---------- Training ---------- */
const TRAIN_TYPES = [
  { id: 'Oberkörper A', gym: 1, ic: 'dumbbell' }, { id: 'Unterkörper & Rumpf', gym: 2, legs: true, ic: 'dumbbell' }, { id: 'Oberkörper B', gym: 3, ic: 'dumbbell' },
  { id: 'Gym (frei)', hard: true }, { id: 'Push', hard: true }, { id: 'Pull', hard: true }, { id: 'Beine', hard: true, legs: true },
  { id: 'Laufen', run: true, hard: true }, { id: 'Cardio', hard: true }, { id: 'Rad', hard: true }, { id: 'Schwimmen', hard: true }, { id: 'HIIT', hard: true },
  { id: 'Knie-Kraft', light: true }, { id: 'Mobility', light: true }, { id: 'Spaziergang', light: true }, { id: 'Sport', hard: true }, { id: 'Sonstiges' },
];
/* Dein 3er-Split (Schedule A = schwer, wenige Wdh.; Schedule B = mehr Wdh.) */
const GYM_DAYS = [
  { day: 1, n: 'Oberkörper A', sub: 'Brust & Rücken', min: 75, ex: [
    { id: 'g_schraeg_lh', n: 'Schrägbankdrücken LH', A: [4, '5–6'], B: [3, '8–10'], note: '1–2 Wdh. vor Versagen, 2–3 s ablassen', multi: true },
    { id: 'g_klimmzug', n: 'Klimmzüge mit Gewicht', A: [4, '5–6'], B: [3, '8–10'], note: '1–2 Wdh. vor Versagen, unten ganz aushängen', multi: true },
    { id: 'g_brustpresse', n: 'Brustpresse Maschine', A: [3, '6–8'], B: [3, '8–12'], note: 'letzter Satz bis Versagen, tief in die Dehnung', multi: true },
    { id: 'g_rudern_brust', n: 'Brustgestütztes Rudern', A: [3, '6–8'], B: [3, '10–12'], note: '1–2 Wdh. vor Versagen', multi: true },
    { id: 'g_flys', n: 'Kabel-Flys sitzend', A: [2, '10–12'], B: [3, '12–15'], note: 'letzter Satz bis Versagen + Teilwdh. in der Dehnung' },
    { id: 'g_seitheben', n: 'Seitheben am Kabel', A: [3, '10–12'], B: [3, '12–15'], note: 'letzter Satz bis Versagen + Teilwdh. unten' },
    { id: 'g_preacher', n: 'Preacher Curl', A: [2, '8–10'], B: [3, '10–12'], note: 'letzter Satz bis Versagen' },
    { id: 'g_trizeps_stange', n: 'Trizepsdrücken Kabel (Stange)', A: [3, '8–10'], B: [3, '10–12'], note: 'letzter Satz bis Versagen' },
  ] },
  { day: 2, n: 'Unterkörper & Rumpf', sub: 'Beine, Rumpf', min: 75, legs: true, ex: [
    { id: 'g_hacken', n: 'Hackenschmidt-Kniebeuge', A: [3, '5–6'], B: [3, '8–12'], note: '1–2 Wdh. vor Versagen, tief, 2–3 s ablassen', multi: true,
      alt: { n: 'Hip Thrust', A: [3, '6–8'], B: [3, '8–12'], note: 'Knie-Variante: statt Hackenschmidt, oder Hackenschmidt nur so tief, wie es schmerzfrei geht' } },
    { id: 'g_rdl', n: 'Rumänisches Kreuzheben', A: [3, '6–8'], B: [3, '8–10'], note: '2 Wdh. vor Versagen, Rücken neutral', multi: true },
    { id: 'g_bss', n: 'Bulgarian Split Squat', A: [2, '6–8 je Seite'], B: [2, '10–12 je Seite'], note: '1–2 Wdh. vor Versagen', multi: true,
      alt: { n: 'Beinpresse, Füße hoch', A: [2, '6–8'], B: [2, '10–12'], note: 'Knie-Variante: hohe Fußposition belastet das Knie weniger' } },
    { id: 'g_beinbeuger', n: 'Beinbeuger sitzend', A: [3, '8–10'], B: [3, '10–15'], note: 'letzter Satz bis Versagen + Teilwdh. in der Dehnung' },
    { id: 'g_beinstrecker', n: 'Beinstrecker', A: [2, '8–10'], B: [3, '12–15'], note: 'letzter Satz bis Versagen',
      alt: { n: 'Beinstrecker (schmerzfreier Bereich)', A: [2, '8–10'], B: [3, '12–15'], note: 'Knie-Variante: nur im schmerzfreien Bewegungsbereich' } },
    { id: 'g_waden', n: 'Wadenheben', A: [3, '8–10'], B: [4, '12–15'], note: 'letzter Satz bis Versagen, 2 s Pause unten' },
    { id: 'g_tibialis', n: 'Tibialis Raises', A: [2, '15'], B: [2, '20–25'], note: 'kontrolliert' },
    { id: 'g_beinheben', n: 'Hängendes Beinheben', A: [3, '8–10'], B: [3, '12–15'], note: 'letzter Satz bis Versagen, ohne Schwung' },
    { id: 'g_pallof', n: 'Pallof Press', A: [3, '10 je Seite'], B: [3, '12 je Seite'], note: 'je Wdh. 2 s halten' },
  ] },
  { day: 3, n: 'Oberkörper B', sub: 'Schultern, Arme, V-Form', min: 80, ex: [
    { id: 'g_schulter', n: 'Schulterdrücken Maschine', A: [3, '6–8'], B: [3, '8–12'], note: '1–2 Wdh. vor Versagen', multi: true },
    { id: 'g_latzug', n: 'Latzug breit', A: [4, '6–8'], B: [3, '10–12'], note: '1–2 Wdh. vor Versagen, oben voll strecken', multi: true },
    { id: 'g_kabelrudern', n: 'Kabelrudern sitzend', A: [3, '6–8'], B: [3, '10–12'], note: '1–2 Wdh. vor Versagen, nach vorn in die Dehnung', multi: true },
    { id: 'g_schraeg_kh', n: 'Schrägbankdrücken KH', A: [3, '6–8'], B: [3, '10–12'], note: '1–2 Wdh. vor Versagen, tief absenken', multi: true },
    { id: 'g_seitheben2', n: 'Seitheben am Kabel', A: [4, '10–12'], B: [4, '12–15'], note: 'letzter Satz bis Versagen + Teilwdh. unten' },
    { id: 'g_reverse_fly', n: 'Reverse Butterfly', A: [3, '12'], B: [3, '15–20'], note: 'letzter Satz bis Versagen' },
    { id: 'g_bayesian', n: 'Bayesian Kabel-Curl', A: [3, '8–10'], B: [3, '10–15'], note: 'letzter Satz bis Versagen, Arm hinter dem Körper' },
    { id: 'g_trizeps_kopf', n: 'Trizeps Überkopf am Kabel', A: [3, '8–10'], B: [3, '10–15'], note: 'letzter Satz bis Versagen, tief in die Dehnung' },
    { id: 'g_nacken', n: 'Nacken (Scheibe)', A: [2, '15 je Richtung'], B: [2, '20 je Richtung'], note: 'kontrolliert, nicht bis Versagen' },
  ] },
];
const GYM_REST = 'Pausen: 2–4 Min. bei Mehrgelenksübungen. Bei Isolationsübungen 90 s, in Schedule B 90 s–2 Min.';
const GYM_KNEE_RULE = 'Fürs Knie ist Tag 2 die einzige Stelle mit Risiko. Solange es Probleme macht: Hackenschmidt nur schmerzfrei tief oder Hip Thrust, Bulgarian Split Squat durch Beinpresse mit hoher Fußposition ersetzen, Beinstrecker nur im schmerzfreien Bereich. Faustregel: Schmerz über 3 von 10 oder stechend heißt, die Übung tauschen.';

/* Wochenstruktur (Standard, in den Einstellungen änderbar)
   gym: Tag 1–3 deines Splits · kraft: Knie-Kraft · lauf: lockerer Lauf · lang: lange Routine · sauna · walk: Spaziergang */
const DEFAULT_WEEK = [
  { gym: 1, kraft: true, sauna: true },
  { lauf: true, lang: true },
  { gym: 2, kraft: true, sauna: true },
  { lang: true },
  { gym: 3, kraft: true, sauna: true },
  { lauf: true },
  { walk: true },
];

/* ---------- Haut ---------- */
const SKIN_AREAS = ['Mundwinkel', 'Kinn', 'Wangen', 'Kieferlinie', 'Hals', 'Stirn'];
const PHOTO_ANGLES = [
  { id: 'frontal', n: 'Frontal' }, { id: 'links', n: 'Links' }, { id: 'rechts', n: 'Rechts' }, { id: 'hals', n: 'Hals von unten' },
];

/* ---------- Einkauf ----------
   Läden nur als Ketten (keine Adressen im Code). Die Karte sucht die nächste Filiale über den Standort des iPhones. */
const SHOP_CATS = ['Gemüse', 'Obst', 'Kühlregal', 'Vorrat', 'Getränke', 'Drogerie/Haushalt'];
const SHOP_STORES = [
  { id: 'lidl', n: 'Lidl', q: 'Lidl' },
  { id: 'aldi', n: 'Aldi Süd', q: 'ALDI SÜD' },
  { id: 'dm', n: 'dm', q: 'dm-drogerie markt' },
  { id: 'edeka', n: 'Edeka', q: 'EDEKA' },
  { id: 'rewe', n: 'Rewe', q: 'REWE' },
  { id: 'tegut', n: 'tegut', q: 'tegut' },
  { id: 'online', n: 'Online', q: null },
  { id: 'other', n: 'Sonstige', q: null },
];
const CAT_STORE = { 'Gemüse': 'lidl', 'Obst': 'lidl', 'Kühlregal': 'lidl', 'Vorrat': 'lidl', 'Getränke': 'dm', 'Drogerie/Haushalt': 'dm' };
/* [Kategorie, Name, Menge, Laden, Hinweis, alter Name (für stabile IDs)] */
const SHOP_DEFAULT = {
  buy: [
    ['Gemüse', 'Spinat', '700 g', 'lidl', 'Bio-Babyspinat'], ['Gemüse', 'Paprika', '7', 'lidl', 'rot'], ['Gemüse', 'Karotten', '1 kg', 'lidl', ''], ['Gemüse', 'Brokkoli', '2', 'lidl', ''],
    ['Gemüse', 'Rote Bete oder Rote-Bete-Saft', '500 g / 1 l', 'dm', 'Saft milchsauer vergoren', 'Rote Bete'], ['Gemüse', 'Tomaten', '500 g', 'lidl', ''], ['Gemüse', 'Zwiebeln', '', 'lidl', ''], ['Gemüse', 'Knoblauch', '', 'lidl', ''], ['Gemüse', 'Gurke', '', 'lidl', ''],
    ['Obst', 'Kiwis', '7', 'lidl', 'Gold-Kiwis: doppelt so viel Vitamin C'], ['Obst', 'Bananen', '7', 'lidl', ''], ['Obst', 'Äpfel', '7', 'lidl', ''], ['Obst', 'TK-Beeren', '1 kg', 'lidl', 'ungezuckert'], ['Obst', 'Datteln', '500 g', 'lidl', 'Medjool'],
    ['Kühlregal', 'Eier', '21', 'lidl', ''], ['Kühlregal', 'Skyr', '7 × 500 g', 'lidl', 'natur'], ['Kühlregal', 'Kefir', '1 l', 'lidl', 'natur, ohne Zucker'], ['Kühlregal', 'Sauerkraut', '', 'rewe', 'frisch, nicht pasteurisiert (Kühlregal)'], ['Kühlregal', 'Kimchi', '', 'rewe', 'mit aktiven Kulturen (Kühlregal)'],
    ['Vorrat', 'Makrele', '5 Dosen', 'lidl', 'in eigenem Saft'], ['Vorrat', 'Paranüsse', '', 'dm', '1 pro Tag reicht (Selen)'], ['Vorrat', 'Dunkle Schokolade (85–90 %)', '2 Tafeln', 'dm', '', 'Dunkle Schokolade 85 %'], ['Vorrat', 'Jodsalz', '', 'lidl', ''], ['Vorrat', 'Vollkornbrot', '', 'lidl', '100 % Vollkorn'],
    ['Getränke', 'O-Saft', '2 l', 'dm', 'Direktsaft'], ['Getränke', 'Kokoswasser', '3 l', 'dm', ''], ['Getränke', 'Kombucha', '6 × 0,33 l', 'rewe', 'roh, unpasteurisiert (Kühlregal)'], ['Getränke', 'Mineralwasser', '6 × 1,5 l', 'lidl', 'calciumreich: über 150 mg Calcium pro Liter (Etikett)'],
    ['Drogerie/Haushalt', 'Feuchttücher', '', 'dm', ''], ['Drogerie/Haushalt', 'Küchenrolle', '', 'dm', ''], ['Drogerie/Haushalt', 'Philips OneBlade Klingen', '', 'dm', 'Ersatzklinge passend zum Gerät'], ['Drogerie/Haushalt', 'Shampoo (clean, ohne Sulfate/Silikone/Duftstoffe)', '', 'dm', ''], ['Drogerie/Haushalt', 'Zahnpasta (clean, ohne SLS/Titandioxid)', '', 'dm', ''], ['Drogerie/Haushalt', 'Zahnbürstenkopf', '', 'dm', ''], ['Drogerie/Haushalt', 'Müllsäcke', '', 'dm', ''],
  ],
  home: [
    ['Vorrat', 'Prepmymeal', '', 'online', 'rechtzeitig nachbestellen'], ['Vorrat', 'Flohsamenschalen', '', 'dm', ''], ['Vorrat', 'Kreatin', '', 'online', 'Monohydrat'], ['Vorrat', 'D3-K2', '', 'online', ''], ['Getränke', 'Grüner Tee', '', 'dm', ''], ['Vorrat', 'Olivenöl', '', 'lidl', 'nativ extra'], ['Vorrat', 'Leinsamen', '', 'dm', ''], ['Vorrat', 'Haferflocken', '', 'lidl', ''],
    ['Vorrat', 'Mandeln', '', 'lidl', ''], ['Vorrat', 'Kürbiskerne', '', 'lidl', ''], ['Vorrat', 'Hanfsamen', '', 'dm', 'geschält'], ['Vorrat', 'Kakaonibs', '', 'dm', ''], ['Vorrat', 'Sonnenblumenkerne', '', 'lidl', ''], ['Vorrat', 'Dinkelflocken', '', 'dm', ''], ['Vorrat', 'Omega-3', '', 'online', 'Algenöl'], ['Vorrat', 'Magnesium-Threonat', '', 'online', ''],
  ],
};
/* Vorrat, der mitzählt (nur Lebensmittel): welche Lebensmittel der Artikel liefert (f, re = Namensmuster für eigene),
   Anzeige-Einheit u mit g Gramm bzw. ml je Einheit und Standard-Einkaufsmenge buy in dieser Einheit */
const SHOP_INV = {
  'b:Spinat': { f: ['spinat'], u: 'g', g: 1, buy: 700 },
  'b:Paprika': { f: ['paprika_rot'], u: 'Stück', g: 150, buy: 7 },
  'b:Karotten': { f: ['karotten'], u: 'g', g: 1, buy: 1000 },
  'b:Brokkoli': { f: ['brokkoli'], u: 'Stück', g: 400, buy: 2 },
  'b:Rote Bete': { f: ['rotebete_saft', 'rote_bete'], u: 'ml', g: 1, buy: 1000 },
  'b:Tomaten': { f: ['tomate'], u: 'g', g: 1, buy: 500 },
  'b:Gurke': { f: ['gurke'], u: 'Stück', g: 400, buy: 1 },
  'b:Kiwis': { f: ['kiwi_gold', 'kiwi'], u: 'Stück', g: 90, buy: 7 },
  'b:Bananen': { f: ['banane'], u: 'Stück', g: 120, buy: 7 },
  'b:Äpfel': { f: ['apfel'], u: 'Stück', g: 150, buy: 7 },
  'b:TK-Beeren': { f: ['heidelbeeren', 'himbeeren', 'brombeeren', 'beerenmix'], u: 'g', g: 1, buy: 1000 },
  'b:Datteln': { f: ['datteln'], u: 'g', g: 1, buy: 500 },
  'b:Eier': { f: ['ei'], u: 'Stück', g: 55, buy: 21 },
  'b:Skyr': { f: ['skyr'], u: 'Becher (500 g)', g: 500, buy: 7 },
  'b:Kefir': { f: ['kefir'], u: 'ml', g: 1, buy: 1000 },
  'b:Sauerkraut': { f: ['sauerkraut'], u: 'g', g: 1, buy: 500 },
  'b:Kimchi': { f: ['kimchi'], u: 'g', g: 1, buy: 400 },
  'b:Makrele': { f: ['makrele'], u: 'Dose', g: 120, buy: 5 },
  'b:Paranüsse': { f: ['paranuss'], u: 'Stück', g: 5, buy: 40 },
  'b:Dunkle Schokolade 85 %': { f: ['schokolade90', 'schokolade85'], u: 'Tafel (100 g)', g: 100, buy: 2 },
  'b:Jodsalz': { f: ['jodsalz'], u: 'g', g: 1, buy: 500 },
  'b:Vollkornbrot': { f: ['vollkornbrot'], u: 'Scheibe', g: 50, buy: 10 },
  'b:O-Saft': { f: ['o_saft'], u: 'ml', g: 1, buy: 2000 },
  'b:Kokoswasser': { f: ['kokoswasser'], u: 'ml', g: 1, buy: 3000 },
  'b:Kombucha': { f: ['kombucha'], u: 'Flasche (330 ml)', g: 330, buy: 6 },
  'b:Mineralwasser': { f: ['mineralwasser'], u: 'Flasche (1,5 l)', g: 1500, buy: 6 },
  'h:Prepmymeal': { f: PMM_CHOICES, re: '^prepmymeal', u: 'Beutel (1 kg)', g: 1000, buy: 7 },
  'h:Flohsamenschalen': { f: ['flohsamen'], u: 'g', g: 1, buy: 300 },
  'h:Grüner Tee': { f: ['gruener_tee'], u: 'Beutel', g: 250, buy: 20 },
  'h:Olivenöl': { f: ['olivenoel'], u: 'Flasche (750 ml)', g: 690, buy: 1 },
  'h:Leinsamen': { f: ['leinsamen'], u: 'g', g: 1, buy: 500 },
  'h:Haferflocken': { f: ['haferflocken'], u: 'g', g: 1, buy: 1000 },
  'h:Mandeln': { f: ['mandeln'], u: 'g', g: 1, buy: 400 },
  'h:Kürbiskerne': { f: ['kuerbiskerne'], u: 'g', g: 1, buy: 200 },
  'h:Hanfsamen': { f: ['hanfsamen'], u: 'g', g: 1, buy: 250 },
  'h:Kakaonibs': { f: ['kakaonibs'], u: 'g', g: 1, buy: 250 },
  'h:Sonnenblumenkerne': { f: ['sonnenblumenkerne'], u: 'g', g: 1, buy: 250 },
  'h:Dinkelflocken': { f: ['dinkelflocken'], u: 'g', g: 1, buy: 500 },
};
const INV_DAYS = 2; // so viele Tage vorher kommt ein Lebensmittel automatisch auf die Einkaufsliste
/* Stand nach dem Einkauf vom 07.11.2026: nur diese Standardartikel fehlen noch (alles andere ist zuhause) */
const SHOP_SYNC_BUY = ['b:Vollkornbrot', 'b:Philips OneBlade Klingen', 'b:Zahnbürstenkopf'];

/* ---------- Blutwerte (übliche Referenzbereiche Erwachsene/Männer; Labore weichen ab) ---------- */
const BLOOD_MARKERS = [
  { id: 'vitd', n: 'Vitamin D (25-OH)', unit: 'ng/ml', lo: 30, hi: 100, hint: '1 ng/ml = 2,5 nmol/l' },
  { id: 'ferritin', n: 'Ferritin', unit: 'ng/ml', lo: 30, hi: 400 },
  { id: 'hb', n: 'Hämoglobin', unit: 'g/dl', lo: 13.5, hi: 17.5 },
  { id: 'b12', n: 'Vitamin B12', unit: 'pg/ml', lo: 200, hi: 900, hint: 'aussagekräftiger: Holo-TC' },
  { id: 'folat', n: 'Folsäure', unit: 'ng/ml', lo: 4, hi: 20 },
  { id: 'zink', n: 'Zink', unit: 'µg/dl', lo: 70, hi: 120 },
  { id: 'mg', n: 'Magnesium', unit: 'mmol/l', lo: 0.75, hi: 1.0 },
  { id: 'tsh', n: 'TSH', unit: 'mU/l', lo: 0.4, hi: 4.0 },
  { id: 'glucose', n: 'Blutzucker (nüchtern)', unit: 'mg/dl', lo: 70, hi: 99 },
  { id: 'hba1c', n: 'HbA1c', unit: '%', lo: 4.0, hi: 5.6 },
  { id: 'ldl', n: 'LDL-Cholesterin', unit: 'mg/dl', lo: null, hi: 115 },
  { id: 'hdl', n: 'HDL-Cholesterin', unit: 'mg/dl', lo: 40, hi: null },
  { id: 'trig', n: 'Triglyceride', unit: 'mg/dl', lo: null, hi: 150 },
  { id: 'testo', n: 'Testosteron (gesamt)', unit: 'ng/ml', lo: 2.8, hi: 8.0 },
];

/* ============================================================
   KNIE-RESET & MOBILITY
   ============================================================ */
const KNEE_CATS = { roll: 'Rollen', mob: 'Mobilisieren', stretch: 'Dehnen', strength: 'Kräftigen', run: 'Laufstil' };
const KNEE_AREAS = { huefte: 'Hüfte', vorn: 'Oberschenkel vorn', hinten: 'Oberschenkel hinten', add: 'Adduktoren', wade: 'Wade', fuss: 'Fuß/Sprunggelenk', rumpf: 'Rumpf', bws: 'Brustwirbelsäule' };
const KNEE_RULES = [
  'Dehnen bis deutlicher Zug (5–7 von 10), nie bis Schmerz. In den Bauch atmen, beim Ausatmen etwas tiefer. Nicht wippen.',
  'Rechtes Bein: bei seitigen Übungen 15 Sek. länger halten bzw. 5 Wiederholungen mehr – Timer und Zähler machen das automatisch.',
  'Nie auf Kniescheibe, die Sehne direkt unter der Kniescheibe oder das Wadenbeinköpfchen (außen unter dem Knie) rollen. Rolle nie unter den unteren Rücken.',
  'Rechts beim Beinbeuger-Rollen nur bis Oberschenkelmitte, Außenseite Richtung Knie auslassen. Beinbeuger-Dehnung rechts nur sanft.',
  'Beim Knien Matte doppelt falten; bei Druck unter der Kniescheibe die Variante im Stehen nehmen.',
  'Vor dem Laufen kein langes Dehnen, nur das 5-Minuten-Aufwärmen. Lange Routinen abends oder an lauffreien Tagen.',
  'Schmerzregel Laufen: bis 3 von 10 okay, wenn das Knie am nächsten Morgen nicht schlechter ist. Sonst nächsten Lauf kürzer/lockerer oder Pause.',
];
const KNEE_RED_FLAGS = 'Schmerz über 3/10 beim Laufen, Morgenschmerz über 3/10, zunehmende Schmerzen, Schwellung, Instabilität, Blockade oder Nachtschmerz → Lauf pausieren, bei anhaltenden oder zunehmenden Beschwerden zum Orthopäden.';
const KNEE_FLAGS = ['Schwellung', 'Instabilität', 'Blockade', 'Nachtschmerz'];

/* Übungsbibliothek
   d: Dosierung · t: 'time' (Sek.) | 'reps' · s: Seiten (2 = links/rechts) · sets · sec/reps = linke Seite bzw. beidseitig
   alt: wechselseitig in einem Durchgang · noX: kein Rechts-Aufschlag (z. B. Richtungen statt Beine) · labels: Satz-Bezeichnungen
   kneel: Übung im Knien · prog: nächste Stufe */
const KNEE_EX = [
  /* Rollen */
  { id: 'r_wade', n: 'Waden rollen', en: 'Foam Roller Calf Release', cat: 'roll', areas: ['wade'], d: { t: 'time', s: 2, sec: 60 }, dose: '40–90 Sek./Bein',
    how: 'Wade auf die Rolle legen, Gesäß anheben und langsam (ca. 1 cm pro Sekunde) von knapp unter der Kniekehle bis über die Achillessehne rollen. Fuß dabei nach innen und außen drehen, um alle Anteile zu erreichen. An empfindlichen Stellen 20 Sek. liegen bleiben.',
    benefit: 'Freieres Sprunggelenk und weniger Pronation – das Knie muss beim Laufen weniger nach innen ausweichen.', mistake: 'Über die Kniekehle oder direkt über die Achillessehne rollen.', safety: 'Nur Muskel rollen, nicht die Kniekehle.' },
  { id: 'r_beinbeuger', n: 'Beinbeuger rollen', en: 'Foam Roller Hamstring Release', cat: 'roll', areas: ['hinten'], d: { t: 'time', s: 2, sec: 50 }, dose: '40–60 Sek./Bein',
    how: 'Rückseite des Oberschenkels auf die Rolle legen, mit den Händen abstützen und langsam vom Gesäß Richtung Knie rollen. Mitte und Innenseite bearbeiten.',
    benefit: 'Weniger Zug am Becken und außen am Knie.', mistake: 'Zu schnell rollen oder bis in die Kniekehle.', safety: 'Rechts nur bis Oberschenkelmitte, Mitte und Innenseite; die Außenseite Richtung Knie auslassen.' },
  { id: 'r_adduktoren', n: 'Adduktoren rollen', en: 'Foam Roller Adductor Release', cat: 'roll', areas: ['add'], d: { t: 'time', s: 2, sec: 50 }, dose: '40–60 Sek./Bein',
    how: 'Bauchlage, ein Bein in Froschposition seitlich anwinkeln, die Rolle liegt längs unter der Oberschenkel-Innenseite. Langsam von der Leiste Richtung Knie und zurück rollen.',
    benefit: 'Weniger Zug, der das Knie nach innen zieht.', mistake: 'Bein gestreckt lassen statt in der Froschposition.', safety: 'Nicht bis auf die Innenseite des Kniegelenks rollen.' },
  { id: 'r_quad', n: 'Oberschenkel vorne rollen', en: 'Foam Roller Quad Release', cat: 'roll', areas: ['vorn'], d: { t: 'time', s: 2, sec: 45 }, dose: '45 Sek./Bein',
    how: 'Unterarmstütz, Vorderseite des Oberschenkels auf der Rolle. Langsam von der Hüfte bis eine Handbreit über dem Knie rollen, Bein dabei leicht nach innen und außen drehen.',
    benefit: 'Weniger Zug an der Patellasehne.', mistake: 'Bis auf die Kniescheibe oder die Sehne darunter rollen.', safety: 'Immer eine Handbreit Abstand zum Knie halten.' },
  { id: 'r_po', n: 'Po rollen', en: 'Foam Roller Glute Piriformis Release', cat: 'roll', areas: ['huefte'], d: { t: 'time', s: 2, sec: 45 }, dose: '45 Sek./Seite',
    how: 'Auf die Rolle setzen, einen Knöchel auf das andere Knie legen (Figur-4) und zur Seite des angewinkelten Beins kippen. Langsam über den Gesäßmuskel rollen.',
    benefit: 'Freie Hüftrotation, damit das Knie keine Drehung ausgleichen muss.', mistake: 'Auf dem Kreuzbein statt auf dem Muskel rollen.', safety: 'Bei ausstrahlendem Kribbeln ins Bein Position ändern.' },
  { id: 'r_bws', n: 'Brustwirbelsäule strecken', en: 'Foam Roller Thoracic Extension', cat: 'roll', areas: ['bws'], d: { t: 'reps', s: 1, reps: 8, sets: 3, noX: true }, dose: '2–3 Positionen, je 6–8×, 2 Sek. halten', labels: ['Position 1 (unten)', 'Position 2 (Mitte)', 'Position 3 (oben)'],
    how: 'Rolle quer unter die Brustwirbelsäule, Hände stützen den Kopf, Gesäß bleibt am Boden. Über die Rolle nach hinten strecken, 2 Sek. halten, zurück. Dann die Rolle eine Handbreit weiter nach oben setzen.',
    benefit: 'Gegen den Hohlrundrücken – eine aufgerichtete Haltung entlastet die Hüfte und damit das Knie.', mistake: 'Rolle unter den unteren Rücken legen.', safety: 'Nur Brustwirbelsäule, nie Lendenwirbelsäule.' },
  { id: 'r_aussen', n: 'Oberschenkelaußenseite (optional)', en: 'Foam Roller IT Band Release', cat: 'roll', areas: ['vorn'], d: { t: 'time', s: 2, sec: 30 }, dose: 'nur sanft, optional',
    how: 'Seitlich auf die Rolle legen, oberes Bein davor abstellen und so den Druck dosieren. Nur sanft zwischen Hüfte und Oberschenkelmitte rollen.',
    benefit: 'Kann die Spannung an der Außenseite etwas lösen.', mistake: 'Mit vollem Gewicht bis zum Knie rollen.', safety: 'Nur sanft, nicht bis zum Wadenbeinköpfchen außen unter dem Knie.' },
  /* Mobilisieren */
  { id: 'm_katzekuh', n: 'Katze-Kuh', en: 'Cat Cow', cat: 'mob', areas: ['rumpf', 'bws'], d: { t: 'reps', s: 1, reps: 10, noX: true }, dose: '8–10×', kneel: true,
    how: 'Vierfüßlerstand. Die Bewegung startet am Becken: Becken nach hinten kippen und Rücken rund machen (Katze), dann Becken nach vorn kippen und Brust öffnen (Kuh). Langsam mit der Atmung.',
    benefit: 'Beckenkontrolle und weniger Hohlkreuz.', mistake: 'Nur aus dem Nacken bewegen statt vom Becken aus.', safety: 'Matte doppelt falten.' },
  { id: 'm_faden', n: 'Faden einfädeln', en: 'Thread the Needle', cat: 'mob', areas: ['bws'], d: { t: 'time', s: 2, sec: 60 }, dose: '1 Min./Seite', kneel: true,
    how: 'Vierfüßlerstand, einen Arm unter dem Körper zur Gegenseite durchschieben, Schulter und Schläfe sinken zum Boden. Dann den Arm zur Decke aufdrehen. Langsam wechseln.',
    benefit: 'Rotation im oberen Rücken.', mistake: 'Becken dreht mit weg.', safety: 'Matte doppelt falten.' },
  { id: 'm_9090wechsel', n: '90/90-Hüftwechsel', en: '90 90 Hip Switches', cat: 'mob', areas: ['huefte'], d: { t: 'reps', s: 1, reps: 10, alt: true }, dose: '8–10×/Seite',
    how: 'Sitzen, beide Knie 90° gebeugt, Füße hüftbreit auseinander. Beide Knie gleichzeitig zur einen Seite ablegen, dann zur anderen. Oberkörper bleibt aufrecht, Hände bei Bedarf hinten abstützen.',
    benefit: 'Hüftrotation, damit das Knie nicht ausgleichen muss.', mistake: 'Oberkörper fällt nach hinten oder rund.', safety: 'Nur im schmerzfreien Bereich drehen.' },
  { id: 'm_kniewand', n: 'Knie zur Wand', en: 'Knee to Wall Ankle Mobility', cat: 'mob', areas: ['fuss', 'wade'], d: { t: 'reps', s: 2, reps: 12 }, dose: '12–15×/Seite',
    how: 'Vor einer Wand stehen, ein Fuß vorn. Knie Richtung Wand schieben, bis es sie berührt – Ferse bleibt am Boden. Das Knie zielt über den 2.–3. Zeh. Fuß schrittweise weiter weg setzen.',
    benefit: 'Mehr Beugung im Sprunggelenk und weniger Pronation.', mistake: 'Knie fällt nach innen oder Ferse hebt ab.', safety: 'Langsam, kein Federn.' },
  { id: 'm_fusskreisen', n: 'Fußkreisen', en: 'Ankle Circles', cat: 'mob', areas: ['fuss'], d: { t: 'reps', s: 2, reps: 20 }, dose: '20× pro Richtung und Fuß',
    how: 'Im Stehen mit Halt oder im Sitzen den Fuß langsam und groß kreisen lassen, erst in die eine, dann in die andere Richtung.',
    benefit: 'Beweglicheres, gut durchblutetes Sprunggelenk – ideal zum Aufwärmen.', mistake: 'Zu schnell und klein kreisen.', safety: 'Keine.' },
  { id: 'm_wgs', n: 'World’s Greatest Stretch', en: 'Worlds Greatest Stretch', cat: 'mob', areas: ['huefte', 'bws', 'hinten'], d: { t: 'reps', s: 2, reps: 5 }, dose: '5×/Seite',
    how: 'Ausfallschritt, gleiche Hand wie vorderes Bein innen neben den Fuß. Ellbogen Richtung Boden, dann den Arm zur Decke aufdrehen. Zum Schluss vorderes Bein strecken und Gesäß nach hinten schieben.',
    benefit: 'Hüfte, Oberschenkelrückseite und Brustwirbelsäule in einer Übung.', mistake: 'Vorderes Knie fällt nach innen.', safety: 'Hinteres Knie bei Bedarf auf gefaltete Matte ablegen.' },
  /* Dehnen */
  { id: 'd_hueftbeuger', n: 'Hüftbeuger im Halbkniestand', en: 'Half Kneeling Hip Flexor Stretch', cat: 'stretch', areas: ['huefte', 'vorn'], d: { t: 'time', s: 2, sec: 30, sets: 2 }, dose: '2 × 30–45 Sek./Seite', kneel: true,
    how: 'Halbkniestand. Erst das Becken nach hinten kippen und den Po des hinteren Beins anspannen, dann nur minimal nach vorn schieben, bis vorn an der Hüfte Zug entsteht.',
    benefit: 'Lockert den Hüftbeuger, der das Becken ins Hohlkreuz zieht.', mistake: 'Weit nach vorn ins Hohlkreuz schieben.', safety: 'Matte doppelt falten; bei Druck unter der Kniescheibe die Variante im Stehen.', prog: 'Arm der hinteren Seite über Kopf strecken oder länger halten.' },
  { id: 'd_quad', n: 'Quadrizeps in Seitenlage', en: 'Side Lying Quad Stretch', cat: 'stretch', areas: ['vorn'], d: { t: 'time', s: 2, sec: 45 }, dose: '45–60 Sek./Seite',
    how: 'Seitlich liegen, unteres Knie angewinkelt. Den oberen Fuß greifen und die Ferse Richtung Po ziehen, Knie bleibt hinter der Hüfte, Becken leicht nach hinten kippen. Variante im Stehen: 2 × 30 Sek.',
    benefit: 'Weniger Zug an Kniescheibe und Patellasehne.', mistake: 'Hohlkreuz oder Knie wandert nach vorn.', safety: 'Bei Druck im Knie Fuß mit einem Handtuch greifen.', prog: '60 Sek. halten.' },
  { id: 'd_beinbeuger', n: 'Beinbeuger mit Handtuch', en: 'Supine Hamstring Stretch with Strap', cat: 'stretch', areas: ['hinten'], d: { t: 'time', s: 2, sec: 45 }, dose: '45–60 Sek./Seite',
    how: 'Rückenlage, Handtuch um die Fußsohle, Bein gestreckt anheben, bis Zug in der Muskelmitte entsteht. Das andere Bein bleibt lang am Boden.',
    benefit: 'Weniger Zug an Becken und Kniekehle.', mistake: 'Zug außen am Knie statt in der Muskelmitte.', safety: 'Rechts nur mittlerer Zug. Der 32-cm-Loop ist zu kurz – Handtuch nehmen.', prog: '60 Sek. halten.' },
  { id: 'd_rockback', n: 'Adduktoren-Rockback', en: 'Adductor Rock Back', cat: 'stretch', areas: ['add', 'huefte'], d: { t: 'reps', s: 2, reps: 10 }, dose: '8–10×/Seite, 2 Sek. halten', kneel: true,
    how: 'Vierfüßlerstand, ein Bein gestreckt zur Seite. Gesäß langsam nach hinten Richtung Fersen schieben, 2 Sek. halten, zurück. Rücken bleibt gerade.',
    benefit: 'Dehnt die Adduktoren, die das Knie nach innen ziehen.', mistake: 'Runder Rücken.', safety: 'Matte doppelt falten.' },
  { id: 'd_figur4', n: 'Figur-4 liegend', en: 'Supine Figure 4 Stretch', cat: 'stretch', areas: ['huefte'], d: { t: 'time', s: 2, sec: 45 }, dose: '45–60 Sek./Seite',
    how: 'Rückenlage, einen Knöchel auf das andere Knie legen und den Oberschenkel des unteren Beins Richtung Brust ziehen, bis Zug im Gesäß entsteht.',
    benefit: 'Dehnt den Gesäßmuskel – knieschonender Ersatz für die Taube.', mistake: 'Kopf und Schultern heben ab.', safety: 'Keine Kraft auf das aufgelegte Knie.', prog: '60 Sek. halten.' },
  { id: 'd_9090', n: '90/90-Hüftdehnung', en: '90 90 Hip Stretch', cat: 'stretch', areas: ['huefte'], d: { t: 'time', s: 2, sec: 30, sets: 2 }, dose: '2 × 30–45 Sek.',
    how: 'In der 90/90-Position sitzen und den Oberkörper aufrecht über das vordere Schienbein neigen, bis Zug im Gesäß entsteht.',
    benefit: 'Hüft-Außenrotation.', mistake: 'Rücken rund machen.', safety: 'Bei Druck im Knie ein Kissen unterlegen.', prog: '45 Sek. halten.' },
  { id: 'd_wade', n: 'Wadendehnung an der Wand', en: 'Wall Calf Stretch Gastrocnemius Soleus', cat: 'stretch', areas: ['wade'], d: { t: 'time', s: 2, sec: 30, sets: 2 }, dose: 'gestreckt + gebeugt, je 30 Sek./Bein', labels: ['Knie gestreckt', 'Knie gebeugt'],
    how: 'Hände an der Wand, ein Bein hinten, Ferse am Boden, Fuß zeigt gerade nach vorn. Erst mit gestrecktem Knie, dann mit leicht gebeugtem Knie dehnen.',
    benefit: 'Gestreckt für die oberflächliche, gebeugt für die tiefe Wadenmuskulatur – beides entlastet Sprunggelenk und Knie.', mistake: 'Fuß nach außen gedreht.', safety: 'Ferse bleibt unten.' },
  { id: 'd_kind', n: 'Kindhaltung', en: 'Childs Pose', cat: 'stretch', areas: ['rumpf', 'huefte'], d: { t: 'time', s: 1, sec: 60, noX: true }, dose: '1 Min.', kneel: true,
    how: 'Knie breit, Gesäß Richtung Fersen, Arme lang nach vorn, Stirn ablegen und ruhig in den Rücken atmen.',
    benefit: 'Entspannt Rücken und Hüfte.', mistake: 'Gegen Druck im Knie ankämpfen.', safety: 'Bei Druck ein Kissen zwischen Po und Fersen.' },
  { id: 'd_drehdehnung', n: 'Drehdehnung im Liegen', en: 'Supine Spinal Twist', cat: 'stretch', areas: ['rumpf', 'bws'], d: { t: 'time', s: 2, sec: 45 }, dose: '45–60 Sek./Seite',
    how: 'Rückenlage, ein Knie anwinkeln und über das andere Bein zur Gegenseite ablegen, Schultern bleiben am Boden, Blick zur anderen Seite.',
    benefit: 'Entspannt Rücken und Hüfte am Ende der Routine.', mistake: 'Schulter hebt ab.', safety: 'Nur so weit drehen, wie es angenehm ist.' },
  { id: 'd_beinewand', n: 'Beine an die Wand', en: 'Legs Up the Wall', cat: 'stretch', areas: ['hinten'], d: { t: 'time', s: 1, sec: 120, noX: true }, dose: '1,5–2 Min.',
    how: 'Gesäß nah an die Wand, Beine an der Wand hochlegen, Arme locker. 4 Sek. einatmen, 6 Sek. ausatmen.',
    benefit: 'Beruhigt das Nervensystem, ruhiger Abschluss.', mistake: 'Gesäß zu weit weg.', safety: 'Keine.' },
  { id: 'd_brust', n: 'Brust im Türrahmen (optional)', en: 'Doorway Pec Stretch', cat: 'stretch', areas: ['bws'], d: { t: 'time', s: 2, sec: 30, noX: true }, dose: '30 Sek.',
    how: 'Unterarm im Türrahmen, Ellbogen auf Schulterhöhe, mit dem Körper langsam nach vorn drehen.', benefit: 'Öffnet die Brust gegen den Rundrücken.', mistake: 'Schulter zieht nach oben.', safety: 'Kein Kribbeln im Arm.' },
  { id: 'd_lat', n: 'Lat an der Bank (optional)', en: 'Bench Lat Stretch', cat: 'stretch', areas: ['bws'], d: { t: 'time', s: 1, sec: 30, noX: true }, dose: '30 Sek.',
    how: 'Kniend vor einer Bank, Ellbogen auflegen, Hände zusammen, Gesäß nach hinten schieben und die Brust Richtung Boden sinken lassen.', benefit: 'Dehnt den breiten Rückenmuskel.', mistake: 'Hohlkreuz.', safety: 'Matte doppelt falten.' },
  { id: 'd_nacken', n: 'Nacken seitlich (optional)', en: 'Neck Side Stretch', cat: 'stretch', areas: ['bws'], d: { t: 'time', s: 2, sec: 30, noX: true }, dose: '30 Sek./Seite',
    how: 'Aufrecht sitzen, Ohr Richtung Schulter neigen, die Gegenschulter sinkt nach unten.', benefit: 'Entspannt den Nacken.', mistake: 'Kopf nach vorn neigen.', safety: 'Sanft.' },
  /* Kräftigen */
  { id: 'k_clamshell', n: 'Clamshells mit Band', en: 'Banded Clamshell', cat: 'strength', areas: ['huefte'], d: { t: 'reps', s: 2, reps: 15, sets: 3 }, dose: '3 × 15 links / 20 rechts, 1 Sek. halten', band: true,
    how: 'Seitlage, Band über den Knien, Knie 45° gebeugt, Füße aufeinander. Oberes Knie öffnen, 1 Sek. halten, langsam schließen. Becken dreht nicht nach hinten weg.',
    benefit: 'Hauptübung gegen das Einknicken des Knies nach innen.', mistake: 'Becken dreht mit nach hinten.', safety: 'Keine.', prog: 'Stärkeres Band (Grün) oder mehr Wiederholungen.' },
  { id: 'k_abduktion', n: 'Seitliches Beinheben', en: 'Side Lying Hip Abduction', cat: 'strength', areas: ['huefte'], d: { t: 'reps', s: 2, reps: 12, sets: 3 }, dose: '3 × 12',
    how: 'Seitlage, unteres Bein angewinkelt. Oberes Bein gestreckt anheben, die Ferse führt leicht nach hinten, Zehen zeigen nach vorn. Langsam senken.',
    benefit: 'Kräftigt den mittleren Gesäßmuskel, der das Knie stabil hält.', mistake: 'Bein nach vorn schwingen oder Fuß nach oben drehen.', safety: 'Keine.', prog: 'Band um die Knöchel.' },
  { id: 'k_monster', n: 'Monster Walks', en: 'Lateral Band Walk', cat: 'strength', areas: ['huefte'], d: { t: 'reps', s: 2, reps: 10, sets: 3, noX: true }, dose: '3 × 10 Schritte/Richtung', band: true, sideNames: ['nach rechts', 'nach links'],
    how: 'Band über den Knien, leicht in die Hocke, Oberkörper aufrecht. Seitlich gehen, ohne dass die Füße zusammenkommen. Spannung im Band halten.',
    benefit: 'Hüftkraft unter Belastung – stabilisiert das Knie im Stand.', mistake: 'Hochkommen oder Knie fallen nach innen.', safety: 'Keine.', prog: 'Band an die Knöchel setzen oder stärkeres Band.' },
  { id: 'k_bridge', n: 'Glute Bridge mit Band', en: 'Banded Glute Bridge', cat: 'strength', areas: ['huefte', 'hinten'], d: { t: 'reps', s: 1, reps: 12, sets: 3 }, dose: '3 × 12–15, oben 2 Sek.', band: true,
    how: 'Rückenlage, Band über den Knien, Füße hüftbreit. Becken anheben, oben 2 Sek. halten und die Knie aktiv gegen das Band nach außen drücken.',
    benefit: 'Gesäßkraft und Kontrolle der Knieachse.', mistake: 'Hohlkreuz oben statt Hüftstreckung.', safety: 'Rippen unten lassen.', prog: 'Einbeinig ausführen.' },
  { id: 'k_seitstuetz', n: 'Seitstütz', en: 'Side Plank', cat: 'strength', areas: ['rumpf', 'huefte'], d: { t: 'time', s: 2, sec: 30, sets: 3 }, dose: '3 × 30 Sek. (Phase 2: 40 Sek.)',
    how: 'Seitlich auf den Unterarm, Ellbogen unter der Schulter, Körper in einer Linie anheben und halten.',
    benefit: 'Seitliche Rumpf- und Hüftkraft.', mistake: 'Becken sinkt ab.', safety: 'Bei Schulterbeschwerden Knie-Variante.', prog: '40 Sek. oder Seitstütz mit Beinheben (Side Plank Hip Abduction).' },
  { id: 'k_hiphike', n: 'Hip Hike an der Stufe', en: 'Hip Hike', cat: 'strength', areas: ['huefte'], d: { t: 'reps', s: 2, reps: 12, sets: 3 }, dose: '3 × 12',
    how: 'Seitlich auf einer Stufe stehen, das freie Bein hängt. Das Becken auf der freien Seite absenken und wieder anheben, das Standbein bleibt gestreckt.',
    benefit: 'Hüftstabilität im Einbeinstand.', mistake: 'Standbein beugen oder Oberkörper kippen.', safety: 'Mit Hand an der Wand.' },
  { id: 'k_wandsitzen', n: 'Wandsitzen', en: 'Wall Sit', cat: 'strength', areas: ['vorn'], d: { t: 'time', s: 1, sec: 30, sets: 4, noX: true }, dose: '4–5 × 30–45 Sek., Knie 60–90°',
    how: 'Rücken an der Wand, Füße hüftbreit vorn, langsam heruntergleiten bis 60–90° Kniebeugung und halten. Variante mit Band über den Knien.',
    benefit: 'Isometrische Kraft für den Oberschenkel – lindert oft Knieschmerz.', mistake: 'Knie fallen nach innen.', safety: 'Nur so tief wie schmerzfrei.', prog: '45 Sek. halten oder mit Band.' },
  { id: 'k_boxsquat', n: 'Langsame Kniebeuge zum Stuhl', en: 'Box Squat Tempo', cat: 'strength', areas: ['vorn', 'huefte'], d: { t: 'reps', s: 1, reps: 10, sets: 3 }, dose: '3 × 10, 3 Sek. abwärts',
    how: 'Vor einem Stuhl stehen, in 3 Sek. kontrolliert hinsetzen (nur antippen) und wieder aufstehen. Knie zeigen über die Zehen.',
    benefit: 'Kniebeuge-Muster mit kontrollierter Belastung.', mistake: 'Plumpsen lassen oder Knie nach innen.', safety: 'Nur schmerzfrei steigern.' },
  { id: 'k_kurzfuss', n: 'Kurzer Fuß', en: 'Short Foot Exercise', cat: 'strength', areas: ['fuss'], d: { t: 'reps', s: 2, reps: 10, sets: 3 }, dose: '3 × 10 à 5 Sek.',
    how: 'Barfuß, den Fuß verkürzen, indem du den Großzehenballen Richtung Ferse ziehst, ohne die Zehen zu krallen. Das Längsgewölbe hebt sich, 5 Sek. halten.',
    benefit: 'Stärkt das Fußgewölbe gegen Pronation.', mistake: 'Zehen krallen.', safety: 'Keine.', prog: 'Im Einbeinstand.' },
  { id: 'k_wadeexz', n: 'Wadenheben exzentrisch', en: 'Eccentric Calf Raise', cat: 'strength', areas: ['wade'], d: { t: 'reps', s: 1, reps: 15, sets: 3 }, dose: '3 × 15, 1 Sek. hoch, 3 Sek. runter',
    how: 'Auf beiden Beinen in 1 Sek. auf die Zehenspitzen, in 3 Sek. langsam absenken.',
    benefit: 'Kräftige Waden fangen beim Laufen Last ab, die sonst ins Knie geht.', mistake: 'Zu schnell absenken.', safety: 'Mit Halt an der Wand.', prog: 'Einbeinig an der Treppe.' },
  { id: 'k_wadegebeugt', n: 'Wadenheben gebeugt', en: 'Bent Knee Calf Raise', cat: 'strength', areas: ['wade'], d: { t: 'reps', s: 1, reps: 15, sets: 3 }, dose: '3 × 15',
    how: 'Knie leicht gebeugt halten und auf die Zehenspitzen drücken – trainiert die tiefe Wadenmuskulatur (Soleus).',
    benefit: 'Soleus-Kraft für das Laufen.', mistake: 'Knie strecken sich mit.', safety: 'Mit Halt.' },
  { id: 'k_wadeeinbein', n: 'Wadenheben einbeinig mit Gewicht', en: 'Single Leg Calf Raise Weighted', cat: 'strength', areas: ['wade'], d: { t: 'reps', s: 2, reps: 12, sets: 3 }, dose: '3 × 12/Seite',
    how: 'Auf einem Bein an einer Stufe, Kurzhantel in der Hand der gleichen Seite. Langsam absenken unter Stufenniveau und hochdrücken.',
    benefit: 'Belastbare Wade für Laufumfang.', mistake: 'Hüpfen statt kontrolliert.', safety: 'Mit Halt an der Wand.' },
  { id: 'k_einbeinstand', n: 'Einbeinstand barfuß', en: 'Single Leg Balance', cat: 'strength', areas: ['fuss'], d: { t: 'time', s: 2, sec: 30, sets: 3 }, dose: '3 × 30 Sek.',
    how: 'Barfuß auf einem Bein stehen, Knie leicht gebeugt, Becken gerade. Steigerung: Augen zu oder auf einem Kissen.',
    benefit: 'Gleichgewicht und Fußkontrolle.', mistake: 'Hüfte kippt zur Seite.', safety: 'Neben einer Wand üben.', prog: 'Augen zu oder auf einem Kissen.' },
  { id: 'k_deadbug', n: 'Toter Käfer', en: 'Dead Bug', cat: 'strength', areas: ['rumpf'], d: { t: 'reps', s: 1, reps: 8, sets: 3, alt: true }, dose: '3 × 8/Seite',
    how: 'Rückenlage, Arme zur Decke, Knie 90° über der Hüfte. Gegengleich Arm und Bein langsam strecken, der untere Rücken bleibt am Boden.',
    benefit: 'Rumpfkontrolle gegen das Hohlkreuz.', mistake: 'Unterer Rücken hebt ab.', safety: 'Langsam ausatmen beim Strecken.' },
  { id: 'k_birddog', n: 'Bird Dog', en: 'Bird Dog', cat: 'strength', areas: ['rumpf'], d: { t: 'reps', s: 1, reps: 8, sets: 3, alt: true }, dose: '3 × 8/Seite', kneel: true,
    how: 'Vierfüßlerstand, gegengleich Arm und Bein lang strecken, kurz halten, zurück. Becken bleibt waagerecht.',
    benefit: 'Rumpf- und Hüftstabilität.', mistake: 'Becken kippt oder Hohlkreuz.', safety: 'Matte doppelt falten.' },
  { id: 'k_hambridge', n: 'Beinbeuger exzentrisch', en: 'Hamstring Bridge Straight Leg', cat: 'strength', areas: ['hinten'], d: { t: 'reps', s: 1, reps: 8, sets: 3 }, dose: '3 × 8',
    how: 'Rückenlage, Fersen auf einer Bank oder einem Stuhl, Becken anheben. Langsam die Füße nach vorn wandern lassen, bis die Beine fast gestreckt sind, und kontrolliert zurück.',
    benefit: 'Kräftigt die Oberschenkelrückseite – gegen das Überstrecken des Knies.', mistake: 'Becken sackt ab.', safety: 'Knie nicht durchdrücken.' },
  { id: 'k_stepdown', n: 'Step-down', en: 'Lateral Step Down', cat: 'strength', areas: ['vorn', 'huefte'], d: { t: 'reps', s: 2, reps: 10, sets: 3 }, dose: '3 × 10 vor dem Spiegel',
    how: 'Seitlich auf einer Stufe stehen und das freie Bein langsam Richtung Boden absenken, bis die Ferse tippt. Vor dem Spiegel: Das Knie bleibt über dem 2. Zeh.',
    benefit: 'Zeigt und trainiert die Knieachse unter Last – auch als Test.', mistake: 'Knie fällt nach innen oder Becken kippt.', safety: 'Stufenhöhe nach Schmerz wählen.' },
  { id: 'k_star', n: 'Einbeinstand mit Band', en: 'Banded Star Excursion', cat: 'strength', areas: ['fuss', 'huefte'], d: { t: 'reps', s: 2, reps: 8, sets: 3 }, dose: '3 × 8 Runden', band: true,
    how: 'Auf einem Bein stehen, Band um die Knöchel. Mit dem freien Fuß nacheinander nach vorn, zur Seite und nach hinten tippen. Das Standknie bleibt über dem Fuß.',
    benefit: 'Dynamische Stabilität für Laufen und Richtungswechsel.', mistake: 'Standknie fällt nach innen.', safety: 'Zuerst ohne Band.' },
  { id: 'k_bss', n: 'Bulgarian Split Squat', en: 'Bulgarian Split Squat', cat: 'strength', areas: ['vorn', 'huefte'], d: { t: 'reps', s: 2, reps: 8, sets: 3 }, dose: '3 × 8–10/Seite',
    how: 'Hinterer Fuß auf einer Bank, vorderer Fuß weit genug vorn. Senkrecht nach unten absenken, das vordere Knie zeigt über den Fuß.',
    benefit: 'Einbeinige Kraft für Oberschenkel und Gesäß.', mistake: 'Knie fällt nach innen.', safety: 'Nur schmerzfrei; Tiefe anpassen.' },
  { id: 'k_slrdl', n: 'Einbeiniges Kreuzheben', en: 'Single Leg Romanian Deadlift', cat: 'strength', areas: ['hinten', 'huefte'], d: { t: 'reps', s: 2, reps: 8, sets: 3 }, dose: '3 × 8/Seite',
    how: 'Auf einem Bein, Knie leicht gebeugt. Oberkörper nach vorn neigen, das freie Bein geht gestreckt nach hinten, Becken bleibt gerade. Kontrolliert zurück.',
    benefit: 'Gesäß, Beinbeuger und Gleichgewicht.', mistake: 'Becken dreht auf.', safety: 'Mit Halt beginnen.' },
  { id: 'k_pogo', n: 'Sprünge auf der Stelle', en: 'Pogo Jumps', cat: 'strength', areas: ['wade', 'fuss'], d: { t: 'reps', s: 1, reps: 20, sets: 3 }, dose: '3 × 20 (Phase 3)',
    how: 'Kleine, federnde Sprünge aus den Sprunggelenken, Knie fast gestreckt, kurzer Bodenkontakt.',
    benefit: 'Bereitet Sehnen und Waden auf das Laufen vor.', mistake: 'Laut landen oder Knie fallen nach innen.', safety: 'Nur schmerzfrei, erst ab Phase 3.' },
  { id: 'k_lathops', n: 'Seitsprünge', en: 'Lateral Hops', cat: 'strength', areas: ['wade', 'huefte'], d: { t: 'reps', s: 2, reps: 10, sets: 3 }, dose: '3 × 10/Seite (Phase 3)',
    how: 'Auf einem Bein seitlich über eine Linie hüpfen und sicher landen, das Knie bleibt über dem Fuß.',
    benefit: 'Seitliche Stabilität unter Sprungbelastung.', mistake: 'Knie knickt bei der Landung ein.', safety: 'Nur schmerzfrei, erst ab Phase 3.' },
  /* Laufstil */
  { id: 'l_kadenz', n: 'Kadenz +5–10 %', en: 'Running Cadence Drill', cat: 'run', areas: ['fuss'], d: { t: 'info' }, dose: 'bei jedem Lauf',
    how: 'Kürzere, schnellere Schritte: Der Fuß landet unter dem Körper, das Knie wird nicht durchgestreckt. Ziel: aktuelle Kadenz aus Garmin plus 5 bis 10 %.',
    benefit: 'Weniger Belastung pro Schritt für das Knie.', mistake: 'Nur schneller laufen statt kürzer schreiten.', safety: 'Im Gesprächstempo bleiben.' },
  { id: 'l_askip', n: 'A-Skip', en: 'A Skip Drill', cat: 'run', areas: ['huefte', 'fuss'], d: { t: 'reps', s: 1, reps: 2, noX: true }, dose: '2 × 20 m (ab Phase 3)',
    how: 'Hüpfend vorwärts, abwechselnd ein Knie aktiv bis Hüfthöhe ziehen, Fuß landet unter dem Körper.', benefit: 'Lauf-Koordination.', mistake: 'Oberkörper lehnt nach hinten.', safety: 'Nur schmerzfrei.' },
  { id: 'l_hopser', n: 'Hopserlauf', en: 'Skipping Running Drill', cat: 'run', areas: ['wade', 'fuss'], d: { t: 'reps', s: 1, reps: 2, noX: true }, dose: '2 × 20 m (ab Phase 3)',
    how: 'Klassischer Hopserlauf mit aktivem Abdruck und Armeinsatz.', benefit: 'Abdruck und Rhythmus.', mistake: 'Hart auf der Ferse landen.', safety: 'Nur schmerzfrei.' },
  { id: 'l_wall', n: 'Wall Drill', en: 'Wall Drill Running', cat: 'run', areas: ['huefte'], d: { t: 'reps', s: 2, reps: 10, noX: true }, dose: '2 × 20 Wiederholungen (ab Phase 3)',
    how: 'Hände an der Wand, Körper schräg. Abwechselnd ein Knie nach vorn-oben ziehen und den Fuß unter der Hüfte aufsetzen.', benefit: 'Lernt die Landung unter dem Körper.', mistake: 'Hohlkreuz.', safety: 'Keine.' },
];

/* Routinen (bearbeitbare Kopie in den Einstellungen) · i: Übungs-ID · sec/reps/sets überschreiben die Standarddosis */
const KNEE_ROUTINES = [
  { id: 'taeglich', n: 'Täglich Mobilität', min: 10, items: [
    { i: 'r_wade', sec: 60 }, { i: 'r_beinbeuger', sec: 60 }, { i: 'r_adduktoren', sec: 60 }, { i: 'd_hueftbeuger', sec: 30, sets: 2 }, { i: 'm_fusskreisen', reps: 20 },
  ] },
  { id: 'vorlauf', n: 'Vor dem Lauf', min: 5, items: [
    { i: 'm_fusskreisen', reps: 20 }, { i: 'k_wandsitzen', sec: 30, sets: 2 }, { i: 'k_monster', reps: 10, sets: 1 },
  ] },
  { id: 'kurz', n: 'Kurzroutine', min: 30, items: [
    { i: 'r_wade', sec: 40, grp: 'Rollen' }, { i: 'r_beinbeuger', sec: 40 }, { i: 'r_adduktoren', sec: 40 }, { i: 'r_bws', reps: 6, sets: 2 },
    { i: 'm_katzekuh', reps: 10, grp: 'Mobilisieren' }, { i: 'm_9090wechsel', reps: 8 }, { i: 'm_kniewand', reps: 12 },
    { i: 'd_hueftbeuger', sec: 30, sets: 1, grp: 'Dehnen' }, { i: 'd_quad', sec: 45 }, { i: 'd_beinbeuger', sec: 45 }, { i: 'd_rockback', reps: 8 }, { i: 'd_figur4', sec: 45 }, { i: 'd_wade', sec: 30, sets: 2 },
    { i: 'k_bridge', reps: 15, sets: 1, grp: 'Hüfte aktivieren' }, { i: 'k_clamshell', reps: 15, sets: 1 },
    { i: 'd_drehdehnung', sec: 45, grp: 'Entspannen' }, { i: 'd_beinewand', sec: 90 },
  ] },
  { id: 'lang', n: 'Lange Routine', min: 55, items: [
    { i: 'r_wade', sec: 60, grp: 'Rollen', short: 30 }, { i: 'r_beinbeuger', sec: 60, short: 30 }, { i: 'r_adduktoren', sec: 60, short: 30 }, { i: 'r_quad', sec: 45, short: 30 }, { i: 'r_po', sec: 45, short: 30 }, { i: 'r_bws', reps: 8, sets: 3 }, { i: 'r_aussen', sec: 30, opt: true },
    { i: 'm_katzekuh', reps: 10, grp: 'Mobilisieren' }, { i: 'm_faden', sec: 60, skipShort: true }, { i: 'm_9090wechsel', reps: 10 }, { i: 'm_kniewand', reps: 15 }, { i: 'm_wgs', reps: 5 }, { i: 'm_fusskreisen', reps: 20 },
    { i: 'd_hueftbeuger', sec: 30, sets: 2, grp: 'Dehnen' }, { i: 'd_quad', sec: 45 }, { i: 'd_beinbeuger', sec: 45 }, { i: 'd_rockback', reps: 10 }, { i: 'd_figur4', sec: 45 }, { i: 'd_9090', sec: 30, sets: 2 }, { i: 'd_wade', sec: 30, sets: 2 }, { i: 'd_kind', sec: 60 },
    { i: 'k_clamshell', reps: 15, sets: 2, grp: 'Hüfte aktivieren' }, { i: 'k_bridge', reps: 12, sets: 2 }, { i: 'k_monster', reps: 10, sets: 2 },
    { i: 'd_drehdehnung', sec: 45, grp: 'Entspannen' }, { i: 'd_beinewand', sec: 120 }, { i: 'd_brust', sec: 30, opt: true }, { i: 'd_lat', sec: 30, opt: true }, { i: 'd_nacken', sec: 30, opt: true },
  ] },
  { id: 'pflicht5', n: 'Pflicht-5 (wenig Zeit)', min: 12, items: [
    { i: 'k_clamshell', reps: 15, sets: 2 }, { i: 'k_monster', reps: 10, sets: 2 }, { i: 'k_bridge', reps: 12, sets: 2 }, { i: 'k_seitstuetz', sec: 30, sets: 2 }, { i: 'k_wandsitzen', sec: 30, sets: 3 },
  ] },
];
const ROUTINE_KIND = { taeglich: 'mob', kurz: 'mob', lang: 'lang', vorlauf: 'vorlauf', pflicht5: 'kraft' };

/* 12-Wochen-Kraftplan */
const KNEE_PHASES = [
  { id: 1, n: 'Phase 1', weeks: [1, 3], perWeek: 3, ex: [
    { i: 'k_clamshell', sets: 3, reps: 15 }, { i: 'k_abduktion', sets: 3, reps: 12 }, { i: 'k_monster', sets: 3, reps: 10 }, { i: 'k_bridge', sets: 3, reps: 12 },
    { i: 'k_seitstuetz', sets: 3, sec: 30 }, { i: 'k_wandsitzen', sets: 4, sec: 30 }, { i: 'k_wadeexz', sets: 3, reps: 15 },
  ], goal: 'Hüft- und Gesäßkraft aufbauen, Knieachse stabilisieren.' },
  { id: 2, n: 'Phase 2', weeks: [4, 8], perWeek: 3, ex: [
    { i: 'k_stepdown', sets: 3, reps: 10 }, { i: 'k_bss', sets: 3, reps: 8 }, { i: 'k_slrdl', sets: 3, reps: 8 }, { i: 'k_wadeeinbein', sets: 3, reps: 12 },
    { i: 'k_monster', sets: 3, reps: 10 }, { i: 'k_seitstuetz', sets: 3, sec: 40 },
  ], goal: 'Einbeinige Kraft und Kontrolle unter Last.' },
  { id: 3, n: 'Phase 3', weeks: [9, 12], perWeek: 2, ex: [
    { i: 'k_stepdown', sets: 3, reps: 10 }, { i: 'k_bss', sets: 3, reps: 8 }, { i: 'k_slrdl', sets: 3, reps: 8 }, { i: 'k_wadeeinbein', sets: 3, reps: 12 },
    { i: 'k_monster', sets: 3, reps: 10 }, { i: 'k_seitstuetz', sets: 3, sec: 40 }, { i: 'k_pogo', sets: 3, reps: 20 }, { i: 'k_lathops', sets: 3, reps: 10 },
  ], goal: 'Nur schmerzfrei: Kraft 2×/Woche, Sprünge, Lauf-ABC 1×/Woche, Step-down-Test 1×/Woche.' },
];
const KNEE_BANDS = [{ n: 'Rot', kg: 4.0 }, { n: 'Grün', kg: 4.9 }];

/* Tests alle 2 Wochen */
const KNEE_TESTS = [
  { id: 'sd', n: 'Step-down', en: 'Lateral Step Down Test', type: 'bool', sides: true, unit: '', how: 'Seitlich auf einer Stufe, freies Bein langsam absenken, 5 Wiederholungen je Seite vor dem Spiegel (optional filmen). Bleibt das Knie stabil über dem 2. Zeh?' },
  { id: 'k2w', n: 'Knie zur Wand', en: 'Knee to Wall Test', type: 'num', sides: true, unit: 'cm', better: 'hi', how: 'Größter Abstand Zehen–Wand, bei dem das Knie die Wand noch berührt, ohne dass die Ferse abhebt.' },
  { id: 'bal', n: 'Einbeinstand', en: 'Single Leg Balance Test', type: 'num', sides: true, unit: 'Sek.', better: 'hi', how: 'Barfuß, Augen offen, Hände an der Hüfte. Zeit, bis du den Fuß absetzen musst (max. 60 Sek.).' },
  { id: 'sar', n: 'Sit-and-Reach', en: 'Sit and Reach Test', type: 'num', sides: false, unit: 'cm', better: 'hi', signed: true, how: 'Langsitz, Beine gestreckt. Wie weit kommen die Fingerspitzen über die Fußsohlen hinaus (+) oder fehlen bis dahin (−)?' },
  { id: 'couch', n: 'Couch-Stretch-Test', en: 'Couch Stretch Test', type: 'num', sides: true, unit: 'cm', better: 'lo', how: 'Knie an der Wand, Unterschenkel an der Wand hoch, Oberkörper aufrecht. Abstand Ferse–Po messen.' },
];
const KNEE_MILESTONES = [
  { id: 'sd', week: [4, 6], n: 'Step-down stabil', sub: 'beide Seiten im Test stabil' },
  { id: 'run', week: [8, 8], n: 'Schmerzfrei laufen und Umfang steigern', sub: 'Laufschmerz ≤ 2 in zwei Wochen' },
  { id: 'check', date: '2027-01-31', n: 'Kontrollanalyse oder Laufband-Video von hinten', sub: 'ca. Ende Januar 2027' },
];
const TODO_SUGGEST = ['Einlagen-Termin', 'Rezept-Frist', 'Schuhkauf', 'Kontrollanalyse', 'Physio klären', 'Fragen an den Arzt', 'Blutabnahme'];
