/* ============================================================
   HEIM-KRAFT (seit 2.20.0, Wunsch vom 19.11.2026)
   Tägliches Krafttraining zu Hause am Power Tower und mit den Kettlebells (2 × 12 kg), 10–15 Min., eigene Einheit
   mit eigenem Timer und Haken – getrennt von der Knie-Athletik.
   – Täglich im Wechsel: A Ziehen + Core (Klimmzüge in vier Griffen, hängendes Beinheben, Swing),
     B Drücken + Core (Dips, Clean & Press, Liegestütze, L-Sitz).
   – Nie bis zum Muskelversagen: Ziel ≈ 70 % des Tests, jeder Satz endet mit Wdh. in Reserve. 1–2 Wdh. Reserve
     brachten gleich viel Muskel wie Versagen, mit weniger Ermüdung (Refalo 2024) – wichtig bei täglichem Training.
   – Wochenmenge zählt, nicht die Häufigkeit (Schoenfeld 2019, Saric 2019) – deshalb kurze Einheiten jeden Tag.
   – Gym-Oberkörper-Tag: nur Core und 2 lockere Techniksätze (Wunsch). Leichte Tage und Deload steigern nicht.
   – Start mit einem Test; danach steigert jede Einheit nach Rückmeldung (leicht +2, passt +1, schwer gleich,
     zweimal verfehlt bzw. zweimal schwer −1). Über der Obergrenze kommt die nächste Stufe.
   – Kettlebells hüftbetont (Swing, Clean & Press); richtet sich nach der Knie-Phase: an leichten Knie-Tagen kein
     Swing und Drücken ohne Umsetzen, am Beintag und wenn die Knie-Einheit schon Swings hat, kein Swing.
   Der Stand jeder Übung wird aus dem Verlauf berechnet (letzter Test, letzte Einheit, eigene Anpassung – das
   Neueste zählt); jede Einheit speichert ihr Ziel, deshalb ändert sich die Vergangenheit nie.
   ============================================================ */
/*icons: house dumbbell play check info chevron-down chevron-up chevron-right trending-up trending-down minus plus sparkles timer pencil triangle-alert flag clipboard-check rotate-ccw*/
const HK_EX = [
  { id: 'h_warm', n: 'Aufwärmen', en: 'Upper Body Warm Up', d: { t: 'time', s: 1, sec: 60, noX: true },
    how: 'Arme kreisen, 10 × im Hang nur die Schulterblätter nach unten ziehen, 10 lockere Liegestütze an der Stufe.', safety: 'Keine.' },
  { id: 'h_pause', n: 'Pause', en: 'Rest', d: { t: 'time', s: 1, sec: 40, noX: true }, how: 'Durchatmen und die nächste Übung vorbereiten.', safety: 'Keine.' },
  /* Klimmzüge */
  { id: 'h_pull_neg', tr: 'pull', n: 'Negativ-Klimmzug', en: 'Negative Pull Up', d: { t: 'reps', s: 1, reps: 4, sets: 3, noX: true },
    how: 'Über die Stufe oder mit einem kleinen Sprung oben ankommen (Kinn über der Stange). Dann in 4 Sek. kontrolliert bis in den gestreckten Hang ablassen, absteigen und neu ansetzen.',
    safety: 'Unten nicht durchfallen lassen. Zieht es in Ellbogen oder Schulter, den Griff wechseln.' },
  { id: 'h_pull', tr: 'pull', n: 'Klimmzug', en: 'Pull Up', d: { t: 'reps', s: 1, reps: 6, sets: 3, noX: true },
    how: 'Aus dem ganz gestreckten Hang zuerst die Schulterblätter nach unten ziehen, dann hoch, bis das Kinn über der Stange ist. Kontrolliert ganz ablassen, kein Schwung, Beine ruhig.',
    safety: 'Zieht es in Ellbogen oder Schulter, den Griff wechseln oder weniger Wdh.' },
  { id: 'h_pull_tempo', tr: 'pull', n: 'Klimmzug, 3 Sek. ablassen', en: 'Tempo Pull Up', d: { t: 'reps', s: 1, reps: 6, sets: 3, noX: true },
    how: 'Normal hochziehen, dann in 3 Sek. ganz ablassen. Die längere Zeit unter Spannung macht ihn schwerer – ohne Zusatzgewicht.',
    safety: 'Zieht es in Ellbogen oder Schulter, den Griff wechseln oder weniger Wdh.' },
  { id: 'h_pull_pause', tr: 'pull', n: 'Klimmzug mit Pause oben', en: 'Pause Pull Up', d: { t: 'reps', s: 1, reps: 6, sets: 3, noX: true },
    how: 'Hochziehen, oben (Kinn über der Stange) 2 Sek. halten, dann in 3 Sek. ablassen.',
    safety: 'Zieht es in Ellbogen oder Schulter, den Griff wechseln oder weniger Wdh.' },
  { id: 'h_pull_l', tr: 'pull', n: 'L-Sitz-Klimmzug', en: 'L Sit Pull Up', d: { t: 'reps', s: 1, reps: 5, sets: 3, noX: true },
    how: 'Die Beine gestreckt waagerecht nach vorn halten (L) und so die Klimmzüge machen. Kräftigt zusätzlich den Bauch.',
    safety: 'Sinken die Beine, lieber eine Wdh. weniger.' },
  /* Hängendes Beinheben */
  { id: 'h_legs_vkr', tr: 'legs', n: 'Knieheben im Armstütz', en: 'Captains Chair Knee Raise', d: { t: 'reps', s: 1, reps: 10, sets: 3, noX: true },
    how: 'Im Armstütz des Power Towers (Unterarme auf den Polstern, Rücken am Polster) die Knie zur Brust ziehen und langsam absenken.',
    safety: 'Rücken bleibt am Polster.' },
  { id: 'h_legs_knee', tr: 'legs', n: 'Hängendes Knieheben', en: 'Hanging Knee Raise', d: { t: 'reps', s: 1, reps: 10, sets: 3, noX: true },
    how: 'An der Stange hängen, Schultern aktiv. Die Knie zur Brust ziehen und dabei das Becken leicht einrollen, langsam absenken – ohne Schwung.',
    safety: 'Drückt es im unteren Rücken, kleiner bewegen.' },
  { id: 'h_legs', tr: 'legs', n: 'Hängendes Beinheben', en: 'Hanging Leg Raise', d: { t: 'reps', s: 1, reps: 8, sets: 3, noX: true },
    how: 'An der Stange hängen, die Beine gestreckt mindestens bis waagerecht heben und langsam absenken. Nicht schwingen.',
    safety: 'Drückt es im unteren Rücken, die Knie leicht beugen.' },
  { id: 'h_legs_ttb', tr: 'legs', n: 'Zehen zur Stange', en: 'Toes To Bar', d: { t: 'reps', s: 1, reps: 5, sets: 3, noX: true },
    how: 'Die gestreckten Beine heben, bis die Zehen die Stange berühren, kontrolliert absenken. Langsam statt mit Schwung.',
    safety: 'Drückt es im unteren Rücken, zurück zum Beinheben bis waagerecht.' },
  /* L-Sitz */
  { id: 'h_lsit_tuck', tr: 'lsit', n: 'L-Sitz angehockt', en: 'Tuck L Sit Parallel Bars', d: { t: 'time', s: 1, sec: 12, sets: 3, noX: true },
    how: 'Am Dip-Barren (oder auf zwei Stühlen) stützen, Arme gestreckt, Schultern weg von den Ohren. Die Knie zur Brust ziehen und halten.',
    safety: 'Zieht es im Handgelenk, auf die Fäuste oder an die Griffe.' },
  { id: 'h_lsit_one', tr: 'lsit', n: 'L-Sitz, ein Bein gestreckt', en: 'One Leg L Sit', d: { t: 'time', s: 1, sec: 12, sets: 3, noX: true },
    how: 'Wie angehockt, aber ein Bein waagerecht gestreckt. Je Satz das Bein wechseln.',
    safety: 'Zieht es im Handgelenk, auf die Fäuste oder an die Griffe.' },
  { id: 'h_lsit', tr: 'lsit', n: 'L-Sitz', en: 'L Sit Parallel Bars', d: { t: 'time', s: 1, sec: 10, sets: 3, noX: true },
    how: 'Beide Beine gestreckt waagerecht halten, Arme gestreckt, Schultern runter, Blick nach vorn.',
    safety: 'Zieht es im Handgelenk, auf die Fäuste oder an die Griffe.' },
  /* Dips */
  { id: 'h_dip_bank', tr: 'dip', n: 'Bank-Dips', en: 'Bench Dips', d: { t: 'reps', s: 1, reps: 10, sets: 3, noX: true },
    how: 'Hände hinter dir schulterbreit auf die Stufe oder einen stabilen Stuhl, Beine angewinkelt, Füße am Boden. Die Ellbogen nach hinten beugen, bis die Oberarme etwa waagerecht sind, und hochdrücken.',
    safety: 'Nicht tiefer als bis die Oberarme waagerecht sind – sonst zieht es vorn in der Schulter.' },
  { id: 'h_dip', tr: 'dip', n: 'Dips', en: 'Parallel Bar Dips', d: { t: 'reps', s: 1, reps: 6, sets: 3, noX: true },
    how: 'Am Dip-Barren stützen, Schultern weg von den Ohren. Die Ellbogen nach hinten beugen, bis die Oberarme etwa waagerecht sind, Oberkörper leicht nach vorn, dann ganz hochdrücken.',
    safety: 'Nur bis die Oberarme waagerecht sind; zieht es vorn in der Schulter, weniger tief.' },
  { id: 'h_dip_tempo', tr: 'dip', n: 'Dips, 3 Sek. ablassen', en: 'Tempo Dips', d: { t: 'reps', s: 1, reps: 8, sets: 3, noX: true },
    how: 'In 3 Sek. ablassen, bis die Oberarme etwa waagerecht sind, dann zügig hochdrücken.',
    safety: 'Nur bis die Oberarme waagerecht sind; zieht es vorn in der Schulter, weniger tief.' },
  { id: 'h_dip_pause', tr: 'dip', n: 'Dips mit Pause unten', en: 'Pause Dips', d: { t: 'reps', s: 1, reps: 8, sets: 3, noX: true },
    how: 'In 3 Sek. ablassen, unten 1 Sek. halten, dann hochdrücken.',
    safety: 'Nur bis die Oberarme waagerecht sind; zieht es vorn in der Schulter, weniger tief.' },
  /* Liegestütze */
  { id: 'h_push_inc', tr: 'push', n: 'Liegestütze, Hände erhöht', en: 'Incline Push Up', d: { t: 'reps', s: 1, reps: 12, sets: 2, noX: true },
    how: 'Hände auf die Stufe oder das Sofa, der Körper gerade wie ein Brett. Die Brust zur Kante absenken und ganz hochdrücken.', safety: 'Keine.' },
  { id: 'h_push', tr: 'push', n: 'Liegestütze', en: 'Push Up', d: { t: 'reps', s: 1, reps: 12, sets: 2, noX: true },
    how: 'Hände etwas breiter als schulterbreit, Ellbogen etwa 45° zum Körper, Körper gerade. Die Brust bis knapp über den Boden, dann ganz hochdrücken.', safety: 'Hüfte nicht durchhängen lassen.' },
  { id: 'h_push_decl', tr: 'push', n: 'Liegestütze, Füße erhöht', en: 'Decline Push Up', d: { t: 'reps', s: 1, reps: 10, sets: 2, noX: true },
    how: 'Füße auf die Stufe oder einen Stuhl, sonst wie normale Liegestütze – mehr Last auf Schultern und obere Brust.', safety: 'Hüfte nicht durchhängen lassen.' },
  { id: 'h_push_dia', tr: 'push', n: 'Diamant-Liegestütze', en: 'Diamond Push Up', d: { t: 'reps', s: 1, reps: 10, sets: 2, noX: true },
    how: 'Daumen und Zeigefinger bilden unter der Brust eine Raute, die Ellbogen bleiben eng am Körper – mehr Trizeps.', safety: 'Zieht es im Ellbogen, Hände etwas weiter auseinander.' },
  { id: 'h_push_arch', tr: 'push', n: 'Archer-Liegestütze', en: 'Archer Push Up', d: { t: 'reps', s: 2, reps: 5, sets: 2, noX: true },
    how: 'Hände sehr breit. Zu einer Seite absenken, während der andere Arm fast gestreckt bleibt; alle Wdh. einer Seite, dann die andere. Vorstufe zum einarmigen Liegestütz.', safety: 'Hüfte bleibt gerade.' },
  /* Kettlebells (2 × 12 kg) – hüftbetont */
  { id: 'h_swing', tr: 'swing', n: 'Kettlebell-Swing', en: 'Kettlebell Swing', d: { t: 'reps', s: 1, reps: 12, sets: 3, noX: true },
    how: 'Kettlebell zwischen den Beinen nach hinten schwingen (Hüfte nach hinten, Rücken gerade), dann explosiv die Hüfte strecken – die Kugel schwingt bis Brusthöhe. Die Kraft kommt aus der Hüfte, nicht aus Knien oder Armen.',
    safety: 'Hüftbetont: die Knie beugen nur leicht, der Rücken bleibt gerade.' },
  { id: 'h_swing1', tr: 'swing', n: 'Kettlebell-Swing einarmig', en: 'Single Arm Kettlebell Swing', d: { t: 'reps', s: 2, reps: 10, sets: 3, noX: true },
    how: 'Wie der beidhändige Swing, aber mit einer Hand; der freie Arm schwingt mit. Schultern bleiben gerade.',
    safety: 'Hüftbetont: die Knie beugen nur leicht, der Rücken bleibt gerade.' },
  { id: 'h_swing2', tr: 'swing', n: 'Doppel-Swing', en: 'Double Kettlebell Swing', d: { t: 'reps', s: 1, reps: 10, sets: 3, noX: true },
    how: 'Mit beiden Kettlebells, Füße etwas breiter als beim normalen Swing, die Kugeln schwingen zwischen den Oberschenkeln durch.',
    safety: 'Hüftbetont: die Knie beugen nur leicht, der Rücken bleibt gerade.' },
  { id: 'h_cp', tr: 'cp', n: 'Clean & Press einarmig', en: 'Kettlebell Clean And Press', d: { t: 'reps', s: 2, reps: 5, sets: 2, noX: true },
    how: 'Die Kettlebell aus dem Hüftschwung vor die Schulter umsetzen (Rack), dann über Kopf drücken, Arm gestreckt, Rippen unten. Zurück vor die Schulter und runter.',
    safety: 'Die Kugel beim Umsetzen eng am Körper führen, damit sie nicht aufs Handgelenk schlägt.' },
  { id: 'h_cp2', tr: 'cp', n: 'Doppel-Clean & Press', en: 'Double Kettlebell Clean And Press', d: { t: 'reps', s: 1, reps: 5, sets: 2, noX: true },
    how: 'Beide Kettlebells gleichzeitig aus dem Hüftschwung vor die Schultern umsetzen und über Kopf drücken.',
    safety: 'Kein Hohlkreuz beim Drücken – Po und Bauch fest.' },
  { id: 'h_press', tr: 'cp', n: 'Kettlebell-Drücken ohne Umsetzen', en: 'Kettlebell Strict Press', d: { t: 'reps', s: 2, reps: 5, sets: 2, noX: true },
    how: 'Die Kettlebell vor die Schulter nehmen (ohne Schwung) und über Kopf drücken – heute ohne Hüftschwung, weil das Knie geschont wird.',
    safety: 'Kein Hohlkreuz beim Drücken.' },
];
const HK_EX_MAP = new Map(HK_EX.map((e) => [e.id, e]));
{ const exById0 = exById; exById = function (id) { return exById0(id) || HK_EX_MAP.get(id) || null; }; } // nicht in KNEE_EX: sonst stünden sie in der Knie-Bibliothek
/* Übungsreihen mit Stufen. f: Faktor zur getesteten Variante (wie viel du hier im Vergleich schaffst – Schätzwerte,
   die Rückmeldung korrigiert sie), lo/hi: Ziel je Satz – über hi kommt die nächste Stufe, start: Ziel beim Aufstieg. */
const HK_TR = {
  pull: { n: 'Klimmzüge', sets: 3, rest: 75, base: 1, mu: { Rücken: 1, Bizeps: 0.5 }, st: [
    { i: 'h_pull_neg', s: 'Negativ', f: 2, lo: 3, hi: 6, start: 3 },
    { i: 'h_pull', s: 'Standard', f: 1, lo: 3, hi: 12, start: 4 },
    { i: 'h_pull_tempo', s: '3 Sek. ablassen', f: 0.75, lo: 5, hi: 10, start: 6 },
    { i: 'h_pull_pause', s: 'Pause oben', f: 0.6, lo: 5, hi: 10, start: 6 },
    { i: 'h_pull_l', s: 'L-Sitz-Klimmzug', f: 0.45, lo: 4, hi: 10, start: 5 },
  ] },
  legs: { n: 'Hängendes Beinheben', sets: 3, rest: 45, base: 2, core: true, vars: [[1, 'Knie angezogen'], [2, 'Beine gestreckt']], mu: { Bauch: 1 }, st: [
    { i: 'h_legs_vkr', s: 'im Armstütz', f: 2.5, lo: 8, hi: 15, start: 10 },
    { i: 'h_legs_knee', s: 'Knie angezogen', f: 1.8, lo: 6, hi: 15, start: 8 },
    { i: 'h_legs', s: 'Beine gestreckt', f: 1, lo: 5, hi: 12, start: 6 },
    { i: 'h_legs_ttb', s: 'Zehen zur Stange', f: 0.45, lo: 4, hi: 10, start: 5 },
  ] },
  swing: { n: 'Kettlebell-Swing', sets: 3, rest: 45, kb: true, mu: { Gesäß: 1, Beinbeuger: 0.5 }, st: [
    { i: 'h_swing', s: 'beidhändig, 12 kg', lo: 10, hi: 20, start: 12 },
    { i: 'h_swing1', s: 'einarmig', lo: 8, hi: 15, start: 10 },
    { i: 'h_swing2', s: 'zwei Kettlebells', lo: 8, hi: 15, start: 10 },
  ] },
  dip: { n: 'Dips', sets: 3, rest: 75, base: 1, mu: { Brust: 1, Trizeps: 0.5, Schultern: 0.5 }, st: [
    { i: 'h_dip_bank', s: 'an der Bank', f: 2, lo: 8, hi: 15, start: 10 },
    { i: 'h_dip', s: 'Standard', f: 1, lo: 4, hi: 15, start: 5 },
    { i: 'h_dip_tempo', s: '3 Sek. ablassen', f: 0.75, lo: 6, hi: 12, start: 8 },
    { i: 'h_dip_pause', s: 'Pause unten', f: 0.6, lo: 6, hi: 12, start: 8 },
  ] },
  cp: { n: 'Clean & Press', sets: 2, rest: 45, kb: true, mu: { Schultern: 1, Trizeps: 0.5 }, st: [
    { i: 'h_cp', s: 'einarmig, 12 kg', lo: 5, hi: 10, start: 5 },
    { i: 'h_cp2', s: 'zwei Kettlebells', lo: 5, hi: 10, start: 5 },
  ] },
  push: { n: 'Liegestütze', sets: 2, rest: 60, base: 1, mu: { Brust: 1, Trizeps: 0.5, Schultern: 0.5 }, st: [
    { i: 'h_push_inc', s: 'Hände erhöht', f: 1.5, lo: 8, hi: 20, start: 12 },
    { i: 'h_push', s: 'Standard', f: 1, lo: 8, hi: 20, start: 10 },
    { i: 'h_push_decl', s: 'Füße erhöht', f: 0.7, lo: 8, hi: 15, start: 10 },
    { i: 'h_push_dia', s: 'Diamant', f: 0.6, lo: 8, hi: 15, start: 10 },
    { i: 'h_push_arch', s: 'Archer', f: 0.25, lo: 4, hi: 10, start: 5 },
  ] },
  lsit: { n: 'L-Sitz', sets: 3, rest: 40, base: 0, core: true, time: true, vars: [[0, 'angehockt'], [2, 'Beine gestreckt']], st: [
    { i: 'h_lsit_tuck', s: 'angehockt', f: 1, lo: 10, hi: 30, start: 12 },
    { i: 'h_lsit_one', s: 'ein Bein gestreckt', f: 0.6, lo: 10, hi: 30, start: 12 },
    { i: 'h_lsit', s: 'Beine gestreckt', f: 0.36, lo: 8, hi: 30, start: 10 },
  ] },
};
const HK_ORDER = ['pull', 'legs', 'swing', 'dip', 'cp', 'push', 'lsit'];
const HK_DAY = { A: ['pull', 'legs', 'swing'], B: ['dip', 'cp', 'push', 'lsit'] };
const HK_TYPES = { A: 'Ziehen + Core', B: 'Drücken + Core', T: 'Test' };
/* Klimmzug-Griffe im Wechsel; f: wie viele Wdh. im Vergleich zum Obergriff (Schätzwert) */
const HK_GRIPS = [
  { id: 'ober', n: 'Obergriff', f: 1, how: 'Handrücken zu dir, schulterbreit.' },
  { id: 'unter', n: 'Untergriff', f: 1.15, how: 'Handflächen zu dir (Chin-up), schulterbreit – mehr Bizeps.' },
  { id: 'breit', n: 'Breiter Griff', f: 0.85, how: 'Obergriff, Hände etwa 1,5-mal schulterbreit – mehr breiter Rücken, etwas schwerer.' },
  { id: 'eng', n: 'Enger Griff', f: 1.05, how: 'Hände etwa eine Handbreit auseinander; hat dein Turm parallele Griffe, nimm den Hammergriff.' },
];
/* Test am ersten Tag (Reihenfolge mit Pausen dazwischen) */
const HK_TESTS = [
  ['pull', 'Klimmzüge im Obergriff', 'Wdh.', 'Schulterbreit, aus dem ganz gestreckten Hang, Kinn über die Stange, kein Schwung. Zählen, bis eine Wdh. nicht mehr sauber geht.'],
  ['push', 'Liegestütze', 'Wdh.', 'Körper gerade, Brust bis knapp über den Boden, ganz hochdrücken. Stopp, sobald die Hüfte durchhängt.'],
  ['legs', 'Hängendes Beinheben', 'Wdh.', 'An der Stange und ohne Schwung. Wähle unten, ob mit gestreckten Beinen (bis waagerecht) oder angezogenen Knien.'],
  ['dip', 'Dips', 'Wdh.', 'Am Dip-Barren, Oberarme bis etwa waagerecht, ganz hochdrücken.'],
  ['lsit', 'L-Sitz halten', 'Sek.', 'Am Dip-Barren, Arme gestreckt, Schultern runter. Sekunden zählen, bis die Haltung kippt; wähle unten die Variante.'],
];
const HK_P = 0.7; // Ziel je Satz aus dem Test: ~70 % der sauberen Wdh. – so bleiben auch im letzten Satz Wdh. in Reserve
const HK_RETEST = 28;
const hkFb = { leicht: 'leicht', passt: 'passt', schwer: 'schwer' };

/* ---------- Daten ---------- */
function hkCfg() {
  let h = S.settings.home;
  if (!h || typeof h !== 'object') h = S.settings.home = {};
  if (!Array.isArray(h.tests)) h.tests = [];
  if (!Array.isArray(h.adj)) h.adj = [];
  return h;
}
const hkEvKey = (k, ts) => `${k}|${String(Math.max(0, Number(ts) || 0)).padStart(15, '0')}`;
function hkTests() { return hkCfg().tests.slice().sort((a, b) => hkEvKey(a.k, a.ts).localeCompare(hkEvKey(b.k, b.ts))); }
function hkTestOn(k) { return hkCfg().tests.find((x) => x.k === k) || null; }
function hkHasVal(x) { return !!x && HK_TESTS.some(([f]) => x[f] != null); }
function hkGrip(id) { return HK_GRIPS.find((g) => g.id === id) || HK_GRIPS[0]; }
function hkDoneSets(e) { return ((e && e.s) || []).slice(0, (e && e.sets) || 0).filter((s) => s && s.d).length; }
function hkRecDone(e) { return !!e && (e.s || []).some((s) => s && s.d); }
/* Letzte Einheiten einer Übungsreihe vor dem Tag k (neueste zuerst) */
function hkRecs(tr, k, n = 2, days = 400) {
  const out = [];
  for (let i = 1; i <= days && out.length < n; i++) {
    const x = addDays(k, -i), d = peekDay(x), e = d && d.home && d.home.ex && d.home.ex[tr];
    if (hkRecDone(e)) out.push({ k: x, rec: e });
  }
  return out;
}
function hkVal(tr, e, s) { const v = Number(HK_TR[tr].time ? s.sec : s.r); return Number.isFinite(v) && (HK_TR[tr].time ? s.sec : s.r) != null ? v : e.tgt; }
/* Ergebnis einer Einheit: all = alle geplanten Sätze mit Ziel, miss = ein Satz unter dem Ziel; nur ausgelassene
   Sätze (z. B. Timer vorzeitig beendet) sind kein Verfehlen */
function hkResult(tr, e) {
  const n = e.sets || 1, done = (e.s || []).slice(0, n).filter((s) => s && s.d), vals = done.map((s) => hkVal(tr, e, s));
  const miss = vals.some((v) => v < e.tgt);
  return { all: done.length >= n && !miss, miss, n: done.length, min: vals.length ? Math.min(...vals) : 0, vals };
}
function hkTgt(tr, st, c, g) {
  let v = Number(c) || 0;
  if (tr === 'pull' && st > 0 && g) v *= hkGrip(g).f;
  return Math.max(1, Math.round(v));
}
/* Stufe und Ziel aus einem Test */
function hkFromTest(tr, x) {
  const T = HK_TR[tr], L = T.st.length - 1, M = Math.max(0, Number(x[tr]) || 0);
  const base = T.vars ? clamp(Number(x[tr + 'V'] ?? T.base), 0, L) : T.base;
  const t = HK_P * M, at = (s) => Math.round((t * T.st[s].f) / T.st[base].f);
  let s = base;
  while (s < L && at(s) > T.st[s].hi) s++;
  while (s > 0 && at(s) < T.st[s].lo) s--;
  return { st: s, c: clamp(at(s), T.st[s].lo, T.st[s].hi), M, base };
}
/* Nächster Stand nach einer Einheit (prev: die Einheit davor, für „zweimal hintereinander“) */
function hkNext(tr, e, prev) {
  const T = HK_TR[tr], L = T.st.length - 1;
  let st = clamp(Number(e.st) || 0, 0, L), c = Number(e.c) || T.st[st].start;
  const S0 = T.st[st], step = T.time ? 2 : 1, unit = T.time ? ' Sek.' : '';
  if (e.light) return { st, c, tag: 'same', why: 'Letztes Mal leichter Tag – Ziel gleich.' };
  const r = hkResult(tr, e), pr = prev && !prev.light && Number(prev.st) === st ? hkResult(tr, prev) : null;
  let tag, why;
  if (r.miss) {
    if (pr && pr.miss) { c -= step; tag = 'down'; why = `Zweimal nicht ganz geschafft – Ziel ${step}${unit} runter.`; }
    else { tag = 'same'; why = `Letztes Mal ${r.vals.join('/')} von ${e.tgt}${unit} – gleiches Ziel.`; }
  } else if (!r.all) {
    tag = 'same'; why = `Letztes Mal ${r.n} von ${e.sets} Sätzen – gleiches Ziel.`;
  } else if (e.fb === 'schwer') {
    if (pr && prev.fb === 'schwer') { c -= step; tag = 'down'; why = `Zweimal schwer – Ziel ${step}${unit} runter.`; }
    else { tag = 'same'; why = 'Letztes Mal schwer – gleiches Ziel.'; }
  } else {
    const inc = (e.fb === 'leicht' ? 2 : 1) * step;
    const perf = tr === 'pull' && st > 0 && e.g ? r.min / hkGrip(e.g).f : r.min; // mehr geschafft als geplant: zählt mit
    const nc = Math.max(c + inc, Math.floor(perf + (e.fb === 'leicht' ? step : 0) + 1e-9));
    tag = 'up'; why = `${e.fb === 'leicht' ? 'Leicht' : e.fb === 'passt' ? 'Passt' : 'Geschafft'} (${r.vals.join('/')}) – Ziel +${nc - c}${T.time ? ' Sek.' : '.'}`;
    c = nc;
  }
  if (c > S0.hi) {
    if (st < L) { st++; c = T.st[st].start; tag = 'stage'; why = `${S0.hi}${unit} je Satz geschafft – nächste Stufe: ${T.st[st].s}.`; }
    else { c = S0.hi; why += ' Höchste Stufe – Ziel bleibt.'; }
  } else if (c < S0.lo) {
    if (st > 0) { st--; c = Math.max(T.st[st].lo, Math.round(T.st[st].hi * 0.8)); tag = 'down'; why = `${why} Eine Stufe leichter: ${T.st[st].s}.`; }
    else c = S0.lo;
  }
  return { st, c, tag, why };
}
/* Stand einer Übungsreihe für den Tag k: das Neueste aus Test, Einheit oder eigener Anpassung zählt */
function hkState(tr, k = todayKey()) {
  const T = HK_TR[tr], H = hkCfg(), L = T.st.length - 1;
  let best = null;
  const test = hkTests().filter((x) => x.k < k && x[tr] != null).pop();
  if (test) best = { key: hkEvKey(test.k, test.ts), kind: 'test', test };
  const adj = H.adj.filter((x) => x.tr === tr && x.k <= k).sort((a, b) => hkEvKey(a.k, a.ts).localeCompare(hkEvKey(b.k, b.ts))).pop();
  if (adj && (!best || hkEvKey(adj.k, adj.ts) > best.key)) best = { key: hkEvKey(adj.k, adj.ts), kind: 'adj', adj };
  const recs = hkRecs(tr, k, 2), rk = (x) => hkEvKey(x.k, x.rec.ts0);
  if (recs[0] && (!best || rk(recs[0]) > best.key)) best = { key: rk(recs[0]), kind: 'rec', r: recs[0], prev: recs[1] && (!best || rk(recs[1]) > best.key) ? recs[1] : null };
  let o;
  if (!best) {
    const st = T.base != null ? T.base : 0;
    o = { st, c: T.base != null ? T.st[st].lo : T.st[st].start, tag: 'new', why: T.base != null ? 'Ohne Test: vorsichtige Grundstufe. Mach den Test, dann passt das Ziel.' : `Start: ${T.st[st].s}.`, src: 'start' };
  } else if (best.kind === 'test') {
    const r = hkFromTest(tr, best.test);
    o = { st: r.st, c: r.c, tag: 'new', why: `Aus dem Test (${r.M} ${T.time ? 'Sek.' : 'Wdh.'}${T.vars ? `, ${(T.vars.find((v) => v[0] === r.base) || [0, ''])[1]}` : ''}): ~70 % davon${r.st !== r.base ? `, Stufe ${T.st[r.st].s}` : ''}.`, src: 'test', k: best.test.k };
  } else if (best.kind === 'adj') {
    const st = clamp(Number(best.adj.st) || 0, 0, L);
    o = { st, c: Math.max(1, Number(best.adj.c) || T.st[st].start), tag: 'manual', why: 'Von dir angepasst.', src: 'adj', k: best.adj.k };
  } else {
    o = { ...hkNext(tr, best.r.rec, best.prev && best.prev.rec), src: 'rec', k: best.r.k, last: best.r.rec };
    if (daysBetween(best.r.k, k) > 14) { o.c = Math.max(T.st[o.st].lo, Math.floor(o.c * 0.9)); o.tag = 'down'; o.why = `Über 2 Wochen Pause – Ziel 10 % runter.`; }
  }
  return o;
}
/* Griff für Klimmzüge: im Wechsel nach dem letzten */
function hkGripNext(k) {
  const r = hkRecs('pull', k, 1)[0], i = r ? HK_GRIPS.findIndex((g) => g.id === r.rec.g) : -1;
  return HK_GRIPS[(i + 1) % HK_GRIPS.length].id;
}
/* Heutige Einheit: festgelegt, sonst Test (ohne Test) bzw. im Wechsel nach der letzten erledigten */
function hkType(k = todayKey()) {
  const d = peekDay(k), h = d && d.home;
  if (h && HK_TYPES[h.t]) return h.t;
  if (!hkCfg().tests.some((x) => x.k <= k && hkHasVal(x))) return 'T';
  for (let i = 1; i <= 14; i++) {
    const x = addDays(k, -i), dd = peekDay(x), hh = dd && dd.home;
    if (hh && hkDoneD(hh, x)) return hh.t === 'A' ? 'B' : 'A';
  }
  return 'A';
}
function hkDoneD(h, k) {
  if (!h) return false;
  if (h.t === 'T') return hkHasVal(hkTestOn(k));
  const ex = Object.values(h.ex || {}), tot = ex.reduce((a, e) => a + (e.sets || 0), 0);
  return tot > 0 && ex.reduce((a, e) => a + hkDoneSets(e), 0) >= tot * 0.5;
}
function hkDone(k) { const d = peekDay(k); return hkDoneD(d && d.home, k); }
function hkSetsDone(k) { const d = peekDay(k), h = d && d.home; return h ? Object.values(h.ex || {}).reduce((a, e) => a + hkDoneSets(e), 0) : 0; }
/* Gym-Oberkörper heute (erledigt oder fest geplant) → leichter Tag */
function hkGymUpper(k) {
  const tr = ((peekDay(k) || {}).trainings || []).filter((t) => !(Number(t.dur) > 0 && Number(t.dur) <= 20)); // kurze Kraft-Aufzeichnung (Uhr) = eher die Heim-Einheit selbst
  const up = tr.find((t) => { const tt = trainType(t); return (tt.gym && !tt.legs) || ['Push', 'Pull', 'Gym (frei)'].includes(tt.id); });
  if (up) return `Heute ${trainType(up).id} im Gym`;
  if (tr.some((t) => trainType(t).gym || trainType(t).id === 'Beine')) return null;
  if (!weekFlex()) { const gd = gymDay(Number(weekTpl(weekday(k)).gym) || 0); if (gd && !gd.legs) return `Heute ${gd.n} im Gym geplant`; }
  return null;
}
function hkLight(k = todayKey()) {
  const d = peekDay(k), h = d && d.home;
  if (h && h.light === false) return null;
  if (h && h.light === true) return { src: 'manual', why: 'Von dir auf leicht gestellt' };
  const g = hkGymUpper(k);
  return g ? { src: 'gym', why: g } : null;
}
/* Rücksicht aufs Knie: richtet sich nach der Knie-Phase */
function hkKnee(k = todayKey()) {
  const o = { noSwing: null, press: null };
  let on = false;
  try { on = kneeWeek(k) >= 1; } catch (e) { on = false; }
  const L = on ? athLight(k) : null;
  if (L) { o.noSwing = `Knie heute leichter (${L.why})`; o.press = 'Knie heute leichter: ohne Hüftschwung drücken'; return o; }
  if (athLegsDay(k)) { o.noSwing = 'Heute Beintag – die Hüfte bekommt genug'; return o; }
  if (on && athItems(k, athType(k)).some((it) => it.i === 'a_swing')) o.noSwing = 'Die Knie-Einheit heute hat schon Swings';
  return o;
}
function hkItem(tr, k, o) {
  const T = HK_TR[tr], s = hkState(tr, k), S0 = T.st[s.st];
  const it = { tr, i: S0.i, st: s.st, c: s.c, sets: T.sets, rest: T.rest, tag: s.tag, why: s.why };
  if (tr === 'pull') it.g = hkGripNext(k);
  it.tgt = hkTgt(tr, it.st, it.c, it.g);
  if (o.L && !T.core) { it.light = true; it.sets = 2; it.tgt = Math.max(1, Math.round(it.tgt * 0.5)); it.note = 'Lockere Techniksätze, etwa die Hälfte der Wdh.'; }
  if (o.dl) { it.light = true; it.sets = Math.max(1, it.sets - 1); it.note = 'Deload-Woche: ein Satz weniger, keine Steigerung.'; }
  if (tr === 'cp' && o.kn.press) { it.i = 'h_press'; it.light = true; it.note = o.kn.press + ' (keine Steigerung).'; }
  return it;
}
function hkPlan(k = todayKey()) {
  const t = hkType(k);
  if (t === 'T') return { t, items: [], light: null, dl: false, kn: { noSwing: null, press: null }, skipped: [] };
  const L = hkLight(k), dl = deloadOn(k), kn = hkKnee(k), items = [], skipped = [];
  for (const tr of HK_DAY[t]) {
    if (L && !HK_TR[tr].core && tr !== 'pull' && tr !== 'dip') { skipped.push({ tr, why: 'heute nur Core und Techniksätze' }); continue; }
    if (tr === 'swing' && kn.noSwing) { skipped.push({ tr, why: kn.noSwing }); continue; }
    items.push(hkItem(tr, k, { L, dl, kn }));
  }
  return { t, items, light: L, dl, kn, skipped };
}
/* Plan des Tages: festgehalten (sobald du anfängst), sonst frisch berechnet */
function hkDayPlan(k = todayKey()) {
  const live = hkPlan(k), d = peekDay(k), h = d && d.home;
  if (!h || !h.ex || !Object.keys(h.ex).length) return { ...live, pinned: false };
  const ord = (tr) => { const i = HK_ORDER.indexOf(tr); return i < 0 ? 99 : i; };
  const day = HK_DAY[h.t] || [];
  const items = Object.values(h.ex).sort((a, b) => (day.includes(a.tr) ? day.indexOf(a.tr) : 50 + ord(a.tr)) - (day.includes(b.tr) ? day.indexOf(b.tr) : 50 + ord(b.tr)));
  return { ...live, items, pinned: true };
}
/* Plan festhalten; force: neu planen, abgehakte Übungen bleiben */
function hkPin(k, force = false) {
  const d0 = peekDay(k), h0 = d0 && d0.home;
  if (h0 && h0.ex && Object.keys(h0.ex).length && !force) return;
  const p = hkPlan(k), now = Date.now();
  mutDay(k, (d) => {
    const h = d.home = d.home || {}, keep = {};
    for (const [tr, e] of Object.entries(h.ex || {})) if (hkRecDone(e)) keep[tr] = e;
    h.t = p.t;
    h.ex = {};
    for (const it of p.items) h.ex[it.tr] = keep[it.tr] || { ...it, ts0: now, s: [] };
    for (const [tr, e] of Object.entries(keep)) if (!h.ex[tr]) h.ex[tr] = e;
  });
}
function hkLabel(it) { return [it.tr === 'pull' && it.g ? hkGrip(it.g).n : '', it.i === 'h_lsit_one' ? 'Bein je Satz wechseln' : '', it.light ? 'locker' : ''].filter(Boolean).join(' · '); }
function hkTimerItems(items) {
  const out = [{ i: 'h_warm' }];
  items.forEach((it, n) => {
    if (n) out.push({ i: 'h_pause', sec: 40 });
    out.push({ i: it.i, sets: it.sets, rest: it.rest, [HK_TR[it.tr].time ? 'sec' : 'reps']: it.tgt, lvT: hkLabel(it) || null });
  });
  return out;
}
function hkMin(p) { return p.t === 'T' ? 15 : p.items.length ? Math.max(5, Math.round(routineSec({ items: hkTimerItems(p.items) }) / 60)) : 0; }
function hkDose(it) {
  const T = HK_TR[it.tr], ex = exById(it.i);
  return `${it.sets} × ${it.tgt}${T.time ? ' Sek.' : ''}${ex && ex.d.s === 2 ? ' je Seite' : ''} · ${it.rest} Sek. Pause`;
}
function hkWeek(ws) { return weekKeys(ws).map((k) => { const d = peekDay(k), h = d && d.home; return { k, t: h && hkDoneD(h, k) ? h.t : null, light: !!(h && Object.values(h.ex || {}).some((e) => e.light && hkRecDone(e))) }; }); }
/* Nächstes Ziel einer Reihe (nach der heutigen Einheit, falls schon trainiert) */
function hkNow(tr, k = todayKey()) {
  const d = peekDay(k), e = d && d.home && d.home.ex && d.home.ex[tr], x = hkTestOn(k);
  return hkRecDone(e) || (x && x[tr] != null) ? { ...hkState(tr, addDays(k, 1)), after: true } : hkState(tr, k);
}
function hkTgtTxt(tr, st, c) { const T = HK_TR[tr]; return `${T.sets} × ${Math.max(1, Math.round(c))}${T.time ? ' Sek.' : ''}${exById(T.st[st].i).d.s === 2 ? ' je Seite' : ''}`; }

/* ---------- Oberfläche ---------- */
function vHome() {
  const k = todayKey(), p = hkDayPlan(k), t = p.t, done = hkDone(k), anyDone = hkSetsDone(k) > 0;
  let h = `<p class="sec-sub">Täglich 10–15 Min. am Power Tower und mit den Kettlebells, im Wechsel Ziehen und Drücken, jeweils mit Core. Nie bis zum Versagen – die App steigert nach deiner Rückmeldung.</p>`;
  h += `<section class="sec hk-today"><div class="sec-head"><h2>Heute ${t === 'T' ? 'Test' : `${t} · ${esc(HK_TYPES[t])}`}</h2>${done ? `<span class="st st-ok">${icon('check')}erledigt</span>` : `<span class="count">ca. ${hkMin(p)} Min.</span>`}</div>
    <div class="chips chips-tight">${Object.entries(HK_TYPES).map(([v, n]) => `<button class="chip chip-xs${v === t ? ' is-on' : ''}" data-a="hk-type" data-v="${v}"${anyDone && v !== t ? ' disabled' : ''}>${v === 'T' ? 'Test' : `${v} · ${esc(n)}`}</button>`).join('')}</div>`;
  if (t === 'T') return h + hkTestHTML(k) + '</section>' + hkProgHTML(k) + hkInfoHTML();
  if (p.light) h += `<div class="banner is-soft">${icon('feather')}<div><b>Heute leicht</b><span>${esc(p.light.why)}: nur Core und 2 lockere Techniksätze, keine Steigerung bei den Techniksätzen.</span></div><button class="pill-btn sm" data-a="hk-light" data-v="0">Doch normal</button></div>`;
  else h += `<p class="hint">${icon('feather')} Gym-Oberkörper heute? Dann stellt die App automatisch auf leicht. <button class="link-btn inline" data-a="hk-light" data-v="1">Heute leicht</button></p>`;
  if (p.dl) h += `<div class="banner">${icon('sparkles')}<div><b>Deload-Woche</b><span>Je Übung ein Satz weniger, keine Steigerung.</span></div></div>`;
  for (const s of p.skipped) h += `<p class="hint">${icon('info')} ${esc(HK_TR[s.tr].n)} heute weggelassen: ${esc(s.why)}.</p>`;
  if (!p.items.length) return h + '</section>' + hkProgHTML(k) + hkWeekHTML(k) + hkInfoHTML();
  if (!done) h += `<button class="btn is-accent" data-a="hk-start">${icon('play')}Mit Timer starten</button>`;
  for (const it of p.items) h += hkExHTML(it, k);
  h += `<p class="hint">Jeden Satz mit 2–3 Wdh. in Reserve beenden. Weniger geschafft? Zahl eintragen – die App passt das nächste Ziel an.</p></section>`;
  const last = hkTests().filter((x) => hkHasVal(x)).pop();
  if (last && daysBetween(last.k, k) >= HK_RETEST) h += `<section class="card hk-due"><div class="sec-head"><h2>${icon('flag')}Neuer Test fällig</h2></div><p class="hint">Letzter Test vor ${daysBetween(last.k, k)} Tagen. Ein neuer Test stellt alle Ziele frisch ein – nimm dafür einen Tag statt A oder B.</p><button class="btn" data-a="hk-type" data-v="T"${anyDone ? ' disabled' : ''}>Heute testen</button></section>`;
  return h + hkProgHTML(k) + hkWeekHTML(k) + hkHistHTML(k) + hkInfoHTML();
}
function hkExHTML(it, k) {
  const T = HK_TR[it.tr], ex = exById(it.i);
  if (!ex) return '';
  const d = peekDay(k), e = (d && d.home && d.home.ex && d.home.ex[it.tr]) || { s: [] }, open = ui.exp.has('hkh-' + it.tr);
  const ic = { up: 'trending-up', stage: 'trending-up', down: 'trending-down', same: 'minus', new: 'sparkles', manual: 'pencil' }[it.tag] || 'minus';
  const grip = it.tr === 'pull' && it.g ? hkGrip(it.g) : null;
  const rows = Array.from({ length: it.sets }, (_, i) => {
    const s = (e.s || [])[i] || {}, v = T.time ? s.sec : s.r;
    return `<div class="set-row hk-set${s.d ? ' is-done' : ''}"><button class="set-chk" data-a="hk-set" data-tr="${it.tr}" data-i="${i}" aria-pressed="${!!s.d}" aria-label="Satz ${i + 1} erledigt"><span class="tgl-box">${icon('check')}</span><span>${i + 1}</span></button>
      <label class="set-in"><input type="text" inputmode="numeric" data-c="hk-val" data-tr="${it.tr}" data-i="${i}" value="${v ?? ''}" placeholder="${it.tgt}"><span>${T.time ? 'Sek.' : 'Wdh.'}</span></label><small>Ziel ${it.tgt}</small></div>`;
  }).join('');
  const fb = it.light ? '' : `<div class="hk-fb"><span>Wie war’s?</span><div class="chips chips-tight">${Object.keys(hkFb).map((v) => `<button class="chip chip-xs${e.fb === v ? ' is-on' : ''}" data-a="hk-fb" data-tr="${it.tr}" data-v="${v}">${v}</button>`).join('')}</div></div>`;
  return `<div class="kb-ex hk-ex"><div class="gym-head"><div><h3>${esc(ex.n)}${grip ? ` · ${esc(grip.n)}` : ''}</h3><small>${esc(hkDose(it))} · Stufe ${it.st + 1}/${T.st.length}</small></div></div>
    <button class="link-btn" data-a="expand" data-key="hkh-${it.tr}">${open ? 'Ausführung ausblenden' : 'So geht’s'}</button>${open ? `<p class="kb-how">${esc(ex.how)}${grip ? ` ${esc(grip.how)}` : ''}${ex.safety && ex.safety !== 'Keine.' ? ` ${esc(ex.safety)}` : ''}</p>` : ''}
    <div class="kx-sug kx-${it.tag === 'stage' ? 'up' : it.tag}">${icon(ic)}<div><b>${it.light ? 'Heute locker' : 'Ziel'}: ${esc(`${it.sets} × ${it.tgt}${T.time ? ' Sek.' : ''}`)}</b><small>${esc(it.note || it.why || '')}</small></div></div>
    ${rows}${fb}</div>`;
}
function hkTestHTML(k) {
  const x = hkTestOn(k) || {};
  let h = `<p class="hint">Einmal testen, dann rechnet die App Stufe und Ziel je Übung aus (etwa 70 % davon). Zwischen den Tests 2–3 Min. Pause, nur saubere Wiederholungen zählen. Was du auslässt, startet auf einer vorsichtigen Grundstufe.</p><div class="hk-tests">`;
  for (const [f, n, u, how] of HK_TESTS) {
    const T = HK_TR[f];
    h += `<div class="hk-test"><div class="hk-test-top"><b>${esc(n)}</b><label class="set-in"><input type="text" inputmode="numeric" data-c="hk-test" data-f="${f}" value="${x[f] ?? ''}" placeholder="–"><span>${u}</span></label></div><small>${esc(how)}</small>`;
    if (T.vars) h += `<div class="chips chips-tight">${T.vars.map(([v, l]) => `<button class="chip chip-xs${Number(x[f + 'V'] ?? T.base) === v ? ' is-on' : ''}" data-a="hk-testv" data-f="${f}" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
    h += '</div>';
  }
  h += '</div>';
  if (hkHasVal(x)) {
    h += `<h5>Ab morgen</h5><div class="list">${HK_TESTS.filter(([f]) => x[f] != null).map(([f]) => { const r = hkFromTest(f, x), T = HK_TR[f]; return `<div class="row is-static"><span class="row-main"><b>${esc(T.n)}</b><small>${esc(T.st[r.st].s)} · ${esc(hkTgtTxt(f, r.st, r.c))}</small></span></div>`; }).join('')}</div>
      <p class="hint">${icon('check')} Gespeichert. Ab morgen geht es mit A los.</p><button class="link-btn" data-a="hk-test-del">Test löschen</button>`;
  }
  return h;
}
function hkProgHTML(k) {
  const tests = hkTests().filter((x) => hkHasVal(x)), first = tests[0];
  let h = `<section class="sec"><div class="sec-head"><h2>Stufen & Ziele</h2><span class="count">${first ? `Test seit ${esc(fmtDate(first.k, { day: 'numeric', month: 'short' }))}` : 'noch kein Test'}</span></div><div class="hk-prog">`;
  for (const tr of HK_ORDER) {
    const T = HK_TR[tr], s = hkNow(tr, k), open = ui.exp.has('hka-' + tr);
    const ft = first && first[tr] != null ? hkFromTest(tr, first) : null;
    const since = ft && (ft.st !== s.st || ft.c !== s.c) ? ` · Start: ${T.st[ft.st].s} ${hkTgtTxt(tr, ft.st, ft.c)}` : '';
    h += `<div class="hk-tr"><button class="hk-tr-top" data-a="expand" data-key="hka-${tr}"><b>${esc(T.n)}</b><span>${esc(T.st[s.st].s)} · ${esc(hkTgtTxt(tr, s.st, s.c))}${tr === 'pull' && s.st > 0 ? ' (Obergriff)' : ''}</span>${icon(open ? 'chevron-up' : 'chevron-down', 'row-ic')}</button>
      <div class="kp-dots" aria-label="Stufe ${s.st + 1} von ${T.st.length}">${T.st.map((_, i) => `<i class="${i <= s.st ? 'is-on' : ''}"></i>`).join('')}</div>
      <small>${s.after ? 'Nächstes Mal' : 'Heute'}: ${esc(s.why || '')}${esc(since)}</small>`;
    if (open) h += `<div class="row-btns"><button class="pill-btn sm" data-a="hk-adj" data-tr="${tr}" data-d="c-1">${icon('minus')}Ziel</button><button class="pill-btn sm" data-a="hk-adj" data-tr="${tr}" data-d="c+1">${icon('plus')}Ziel</button><button class="pill-btn sm" data-a="hk-adj" data-tr="${tr}" data-d="st-1"${s.st <= 0 ? ' disabled' : ''}>Stufe leichter</button><button class="pill-btn sm" data-a="hk-adj" data-tr="${tr}" data-d="st+1"${s.st >= T.st.length - 1 ? ' disabled' : ''}>Stufe schwerer</button></div>
      <p class="hint">Stufen: ${esc(T.st.map((x, i) => `${i + 1} ${x.s} (bis ${x.hi}${T.time ? ' Sek.' : ''})`).join(' → '))}</p>`;
    h += '</div>';
  }
  return h + '</div></section>';
}
function hkWeekHTML(k) {
  const ws = weekStart(k), wk = hkWeek(ws), n = wk.filter((x) => x.t).length;
  return `<section class="sec"><div class="sec-head"><h2>Diese Woche</h2><span class="count">${n}/7 Tage</span></div><div class="ath-week">${wk.map((x, i) => `<div class="ath-day${x.t ? ' is-done' : ''}${x.k === k ? ' is-today' : ''}"><small>${WD_SHORT[i]}</small><b>${x.t ? esc(x.t) : '·'}</b>${x.light ? '<em>leicht</em>' : ''}</div>`).join('')}</div></section>`;
}
function hkHistHTML(k) {
  const rows = [];
  for (let i = 1; i <= 60 && rows.length < 6; i++) {
    const x = addDays(k, -i), d = peekDay(x), h = d && d.home;
    if (!h || !hkDoneD(h, x) || h.t === 'T') continue;
    const parts = Object.values(h.ex || {}).filter(hkRecDone).map((e) => { const ex = exById(e.i), r = hkResult(e.tr, e); return `${ex ? ex.n : e.tr}${e.g ? ` (${hkGrip(e.g).n})` : ''} ${r.vals.join('/')}${HK_TR[e.tr].time ? ' Sek.' : ''}${e.fb ? `, ${e.fb}` : ''}`; });
    rows.push(`<div class="row is-static"><span class="row-main"><b>${esc(fmtDate(x, { weekday: 'short', day: 'numeric', month: 'short' }))} · ${esc(h.t)}</b><small>${esc(parts.join(' · '))}</small></span></div>`);
  }
  return rows.length ? `<section class="sec"><div class="sec-head"><h2>Letzte Einheiten</h2></div><div class="list">${rows.join('')}</div></section>` : '';
}
function hkInfoHTML() {
  const open = ui.exp.has('hk-info');
  let h = `<section class="sec"><button class="row" data-a="expand" data-key="hk-info"><span class="row-main"><b>So funktioniert der Plan</b><small>Regeln, Studien, Quellen</small></span>${icon(open ? 'chevron-up' : 'chevron-down', 'row-ic')}</button>`;
  if (!open) return h + '</section>';
  h += `<ul class="wish-list">
    <li><b>Täglich im Wechsel:</b> A Ziehen + Core (Klimmzüge, hängendes Beinheben, Swing), B Drücken + Core (Dips, Clean & Press, Liegestütze, L-Sitz). So hat jede Muskelgruppe einen Tag Pause. Ob die Wochenmenge auf 3 oder 6 Tage verteilt ist, machte in Studien kaum einen Unterschied – entscheidend ist die Menge pro Woche.</li>
    <li><b>Nie bis zum Versagen:</b> Hör auf, wenn noch 2–3 saubere Wdh. gingen. Mit 1–2 Wdh. Reserve wuchsen die Muskeln in einer Studie genauso wie beim Training bis zum Versagen, bei weniger Ermüdung – wichtig, weil du am nächsten Tag wieder trainierst.</li>
    <li><b>Start:</b> Ein Test mit sauberen Wdh. (beim L-Sitz Sekunden). Das Ziel je Satz ist etwa 70 % davon. Wäre das für eine Stufe zu viel oder zu wenig, nimmt die App die schwerere oder leichtere Variante. Die Umrechnung zwischen den Stufen ist geschätzt – deine Rückmeldung korrigiert sie.</li>
    <li><b>Steigerung:</b> Nach jeder Übung „leicht“ (+2), „passt“ (+1) oder „schwer“ (gleich). Mehr geschafft als geplant zählt mit. Ziel in einem Satz nicht geschafft → gleiches Ziel, zweimal hintereinander → eins runter; nur ausgelassene Sätze zählen nicht als verfehlt. Über der Obergrenze kommt die nächste Stufe (z. B. Klimmzug → 3 Sek. ablassen → Pause oben → L-Sitz-Klimmzug). Alle 4 Wochen ein neuer Test; über 2 Wochen Pause → 10 % runter.</li>
    <li><b>Klimmzug-Griffe:</b> Jede Einheit ein anderer Griff (Ober-, Unter-, breiter, enger Griff). Das Ziel rechnet die App um: im Untergriff etwas mehr, breit etwas weniger.</li>
    <li><b>Gym-Oberkörper-Tag:</b> Nur Core und 2 lockere Techniksätze – die schwere Arbeit hat das Gym schon gemacht. Leichte Tage und die Deload-Woche steigern nicht.</li>
    <li><b>Kettlebells hüftbetont:</b> Swing und Clean & Press kommen aus der Hüfte, die Knie beugen nur leicht. Ein Swing-Programm (2× pro Woche, 6 Wochen) verbesserte Maximal- und Sprungkraft ähnlich wie Sprungkniebeugen. An leichten Knie-Tagen kein Swing und Drücken ohne Umsetzen, am Beintag und wenn die Knie-Einheit schon Swings hat, kein Swing.</li>
    <li><b>Liegestütze wirken:</b> Bei vergleichbarer Last bauten Liegestütze in 8 Wochen ähnlich viel Kraft und Muskel auf wie leichtes Bankdrücken.</li>
    <li><b>Zählt im Kraft-Autopilot:</b> Die Sätze (ohne L-Sitz und lockere Techniksätze) zählen bei den Sätzen pro Muskel mit.</li></ul>
    <h5>Quellen</h5><div class="list">${[
    ['Refalo 2024: 1–2 Wdh. Reserve vs. Muskelversagen (J Sports Sci)', 'https://pubmed.ncbi.nlm.nih.gov/38393985/'],
    ['Schoenfeld, Grgic & Krieger 2019: Trainingshäufigkeit und Muskelaufbau (Meta-Analyse)', 'https://lida.sport-iat.de/ta/Record/4052540?lng=en'],
    ['Saric 2019: 3 vs. 6 Einheiten pro Woche bei gleicher Menge', 'https://pubmed.ncbi.nlm.nih.gov/30363041/'],
    ['Lake & Lauder 2012: Kettlebell-Swing und Maximal-/Sprungkraft', 'http://journals.lww.com/nsca-jscr/Abstract/2012/08000/Kettlebell_Swing_Training_Improves_Maximal_and.28.aspx'],
    ['Kikuchi & Nakazato 2017: Liegestütze vs. Bankdrücken', 'https://pubmed.ncbi.nlm.nih.gov/29541130/'],
  ].map(([n, u]) => `<a class="row" href="${u}" target="_blank" rel="noopener"><span class="row-main"><b>${esc(n)}</b></span>${icon('chevron-right', 'row-ic')}</a>`).join('')}</div>`;
  return h + '</section>';
}
/* Kurzkarte unter Training → Heute */
function hkTrainCard(k) {
  if (k !== todayKey()) return '';
  const p = hkDayPlan(k), done = hkDone(k), n = hkSetsDone(k);
  const tot = p.items.reduce((a, it) => a + it.sets, 0);
  const sub = p.t === 'T' ? 'Einmal saubere Wdh. zählen – danach rechnet die App Stufen und Ziele aus.' : `${p.items.map((it) => (exById(it.i) || {}).n).filter(Boolean).join(', ')}${p.light ? ' · heute leicht' : ''}`;
  return `<section class="card hk-card"><div class="sec-head"><h2>${icon('house')}Heim-Kraft ${p.t === 'T' ? 'Test' : `${p.t} · ${esc(HK_TYPES[p.t])}`}</h2>${done ? `<span class="st st-ok">${icon('check')}erledigt</span>` : `<span class="count">${n && tot ? `${n}/${tot} Sätze` : `ca. ${hkMin(p)} Min.`}</span>`}</div>
    <p class="hint">${esc(sub)}</p>${goBtn('train', done ? 'Ansehen' : 'Öffnen', 'zuhause', 'pill-btn sm')}</section>`;
}
/* Fertig-Bildschirm des Timers: Rückmeldung je Übung */
function hkFbHTML(k) {
  const d = peekDay(k), h = d && d.home;
  const ex = Object.values((h && h.ex) || {}).filter((e) => !e.light);
  if (!ex.length) return '';
  return `<h5>Wie war’s? (für die Steigerung)</h5><div class="rate-list">${ex.map((e) => `<div class="rate-row"><span>${esc((exById(e.i) || {}).n || e.tr)}</span><div class="chips chips-tight">${Object.keys(hkFb).map((v) => `<button class="chip chip-xs${e.fb === v ? ' is-on' : ''}" data-a="hk-fb" data-tr="${e.tr}" data-v="${v}">${v}</button>`).join('')}</div></div>`).join('')}</div>
    <p class="hint">Weniger geschafft als geplant? Unter Training → Zuhause die Zahl eintragen.</p>`;
}
/* Nach dem Timer: fertige Sätze abhaken (auch beim vorzeitigen Beenden) */
function hkTimerDone(k) {
  const t = ui.timer;
  if (!t) return;
  const n = t.finished ? t.steps.length : t.i, sets = {}; // vorzeitig beendet: nur bis zum aktuellen Schritt
  t.steps.forEach((st, i) => {
    const ex = HK_EX_MAP.get(st.ex);
    if (!ex || !ex.tr) return;
    const key = `${ex.tr}:${st.set}`, o = sets[key] = sets[key] || { tr: ex.tr, set: st.set, tot: 0, done: 0 };
    o.tot++; if (i < n) o.done++;
  });
  mutDay(k, (d) => {
    const h = d.home;
    if (!h || !h.ex) return;
    for (const o of Object.values(sets)) {
      const e = h.ex[o.tr];
      if (!e || o.done < o.tot || o.set > e.sets) continue;
      e.s = e.s || [];
      while (e.s.length < o.set) e.s.push({});
      const s = e.s[o.set - 1], f = HK_TR[o.tr].time ? 'sec' : 'r';
      if (!s.d) { s.d = true; if (s[f] == null) s[f] = e.tgt; }
    }
  });
}
function hkStart() {
  const k = todayKey();
  hkPin(k);
  const p = hkDayPlan(k);
  if (!p.items.length) { toast('Heute steht keine Übung an'); return; }
  const steps = buildSteps({ items: hkTimerItems(p.items) });
  steps.forEach((s) => { if (s.ex === 'h_pause') s.pause = true; });
  timerStart(null, { steps, name: `Heim-Kraft ${p.t} · ${HK_TYPES[p.t]}`, noSave: true, noExtra: true, partialOk: true, onDone: () => hkTimerDone(k), doneHTML: () => hkFbHTML(k) });
}
/* ---------- Routine, Mitteilung, Bericht, Kraft-Autopilot ---------- */
function hkRtStep(k) {
  const id = 'home:kraft', t = hkType(k), done = hkDone(k);
  if (t === 'T') return { id, n: 'Heim-Kraft: Test', sub: 'Saubere Wdh. zählen · ca. 15 Min.', go: 'train', goSub: 'zuhause', done };
  const p = hkDayPlan(k);
  return { id, n: `Heim-Kraft ${t}`, sub: `${HK_TYPES[t]}${p.light ? ' · leicht' : ''} · ca. ${hkMin(p)} Min.`, go: 'train', goSub: 'zuhause', done, part: !done && hkSetsDone(k) > 0 };
}
function pushHome(k, r, d, add) {
  if (hkDone(k)) return;
  const t = hkType(k), at = Math.min(r.bed - 300, 18 * 60 + 30);
  if (t === 'T') { add('training', at, 'home', 'Heim-Kraft: Test', 'Einmal saubere Wdh. zählen (ca. 15 Min.) – danach rechnet die App Stufen und Ziele aus.', '#zuhause'); return; }
  const p = hkDayPlan(k);
  if (!p.items.length) return;
  add('training', at, 'home', `Heim-Kraft ${t}: ${HK_TYPES[t]}`, `ca. ${hkMin(p)} Min. am Power Tower${p.light ? ` – heute leicht (${p.light.why})` : ''}. Antippen öffnet die Einheit.`, '#zuhause');
}
function homeReportLine(ws) {
  const wk = hkWeek(ws), done = wk.filter((x) => x.t);
  if (!done.length && !hkTests().length) return '';
  const end = addDays(ws, 7);
  const st = HK_ORDER.map((tr) => { const s = hkState(tr, end), T = HK_TR[tr]; return `${T.n} ${T.st[s.st].s} ${hkTgtTxt(tr, s.st, s.c)}`; });
  const fb = weekKeys(ws).flatMap((k) => Object.values(((peekDay(k) || {}).home || {}).ex || {}).map((e) => e.fb).filter(Boolean));
  const cnt = (v) => fb.filter((x) => x === v).length;
  return `Heim-Kraft [routine:home:kraft]: ${done.length}/7 Tage${done.length ? ` (${done.map((x) => x.t).join(' ')})` : ''}${fb.length ? ` · Rückmeldung leicht ${cnt('leicht')}, passt ${cnt('passt')}, schwer ${cnt('schwer')}` : ''} · Stand: ${st.join(' · ')}`;
}
{ // Heim-Kraft zählt bei den harten Sätzen pro Muskel mit (ohne L-Sitz und lockere Techniksätze)
  const kxWeekSets0 = kxWeekSets;
  kxWeekSets = function (ws) {
    const m = kxWeekSets0(ws);
    for (const k of weekKeys(ws)) {
      const h = (peekDay(k) || {}).home;
      for (const e of Object.values((h && h.ex) || {})) {
        const T = HK_TR[e.tr];
        if (!T || !T.mu || e.light) continue;
        const n = hkDoneSets(e);
        if (n) for (const [mu, f] of Object.entries(T.mu)) m[mu] = (m[mu] || 0) + n * f;
      }
    }
    return m;
  };
}
/* ---------- Aktionen ---------- */
function hkMut(k, fn) { mutDay(k, (d) => { d.home = d.home || {}; fn(d.home, d); }); }
function hkEx(h, tr) { const e = h.ex && h.ex[tr]; if (!e) return null; e.s = e.s || []; return e; }
/* Neu zeichnen erst, wenn kein Eingabefeld mehr den Fokus hat */
function hkSoftRender() { setTimeout(() => { const a = document.activeElement; if (!a || !a.matches('input, textarea, select')) render(); }, 0); }
function hkRerender() { if (ui.timer && ui.timer.phase === 'done') timerRender(); else render(); }
Object.assign(A, {
  'hk-type': (el) => {
    const k = todayKey(), v = el.dataset.v;
    if (!HK_TYPES[v] || v === hkType(k)) return;
    if (hkSetsDone(k) > 0) { toast('Erst die abgehakten Sätze zurücknehmen'); return; }
    hkMut(k, (h) => { h.t = v; delete h.ex; });
    render();
  },
  'hk-light': (el) => {
    const k = todayKey(), v = el.dataset.v;
    hkMut(k, (h) => { if (v === '1') h.light = true; else if (v === '0') h.light = false; else delete h.light; });
    const d = peekDay(k);
    if (d.home.ex && Object.keys(d.home.ex).length) hkPin(k, true);
    render();
    toast(v === '1' ? 'Heute leicht: nur Core und Techniksätze' : 'Heute normal');
  },
  'hk-start': () => hkStart(),
  'hk-set': (el) => {
    const k = todayKey(), tr = el.dataset.tr, i = Number(el.dataset.i);
    hkPin(k);
    hkMut(k, (h) => {
      const e = hkEx(h, tr);
      if (!e) return;
      while (e.s.length <= i) e.s.push({});
      const s = e.s[i], f = HK_TR[tr].time ? 'sec' : 'r';
      s.d = !s.d;
      if (s.d && s[f] == null) s[f] = e.tgt;
    });
    render();
  },
  'hk-fb': (el) => {
    const k = todayKey(), tr = el.dataset.tr, v = el.dataset.v;
    if (!hkFb[v]) return;
    hkPin(k);
    hkMut(k, (h) => { const e = hkEx(h, tr); if (e) { if (e.fb === v) delete e.fb; else e.fb = v; } });
    hkRerender();
  },
  'hk-adj': (el) => {
    const k = todayKey(), tr = el.dataset.tr, T = HK_TR[tr], dd = el.dataset.d, s = hkNow(tr, k), L = T.st.length - 1, step = T.time ? 2 : 1;
    let st = s.st, c = s.c;
    if (dd === 'c-1') c = Math.max(1, c - step);
    else if (dd === 'c+1') c += step;
    else if (dd === 'st-1' && st > 0) { st--; c = Math.max(T.st[st].lo, Math.round(T.st[st].hi * 0.8)); }
    else if (dd === 'st+1' && st < L) { st++; c = T.st[st].start; }
    else return;
    const H = hkCfg(), ts = Date.now();
    H.adj = H.adj.filter((x) => !(x.tr === tr && x.k === k)).concat([{ k, ts, tr, st, c }]).slice(-200);
    const d = peekDay(k), e = d && d.home && d.home.ex && d.home.ex[tr];
    if (e && !hkRecDone(e)) {
      mutDay(k, (dx) => {
        const x = dx.home.ex[tr], it = { st, c, i: T.st[st].i, tgt: hkTgt(tr, st, c, x.g), tag: 'manual', why: 'Von dir angepasst.', ts0: ts + 1 };
        if (x.light && !T.core) it.tgt = Math.max(1, Math.round(it.tgt * 0.5));
        if (x.i === 'h_press') delete it.i;
        Object.assign(x, it);
      });
    }
    saveSettings();
    toast(`${T.n}: ${T.st[st].s}, ${hkTgtTxt(tr, st, c)}`);
  },
  'hk-testv': (el) => {
    const k = todayKey(), f = el.dataset.f, v = Number(el.dataset.v);
    hkTestSet(k, f + 'V', v);
    render();
  },
  'hk-test-del': () => {
    const k = todayKey(), H = hkCfg(), old = H.tests.find((x) => x.k === k);
    if (!old) return;
    H.tests = H.tests.filter((x) => x !== old);
    saveSettings();
    toast('Test gelöscht', () => { hkCfg().tests.push(old); saveSettings(); });
  },
});
function hkTestSet(k, f, v) {
  const H = hkCfg();
  let x = H.tests.find((t) => t.k === k);
  if (!x) { x = { k }; H.tests.push(x); }
  if (v == null) delete x[f]; else x[f] = v;
  x.ts = Date.now();
  if (!hkHasVal(x) && !Object.keys(x).some((key) => key.endsWith('V'))) H.tests = H.tests.filter((t) => t !== x);
  const d = peekDay(k);
  if (!(d && d.home && d.home.t === 'T')) hkMut(k, (h) => { h.t = 'T'; delete h.ex; });
  markDirty('settings'); invalidate();
}
Object.assign(C, {
  'hk-val': (el) => {
    const k = todayKey(), tr = el.dataset.tr, i = Number(el.dataset.i), f = HK_TR[tr].time ? 'sec' : 'r', v = parseNum(el.value);
    if (v != null && (v < 0 || v > (f === 'sec' ? 600 : 200))) { toast('Wert prüfen'); el.classList.add('bad'); return; }
    el.classList.remove('bad');
    hkPin(k);
    let on = null;
    hkMut(k, (h) => {
      const e = hkEx(h, tr);
      if (!e) return;
      while (e.s.length <= i) e.s.push({});
      if (v == null) delete e.s[i][f]; else { e.s[i][f] = Math.round(v); e.s[i].d = true; }
      on = !!e.s[i].d;
    });
    const row = el.closest('.set-row'); // ohne neu zu zeichnen, damit das nächste Feld den Fokus behält
    if (row && on != null) { row.classList.toggle('is-done', on); const b = row.querySelector('.set-chk'); if (b) b.setAttribute('aria-pressed', String(on)); }
    flashSaved(el);
    hkSoftRender();
  },
  'hk-test': (el) => {
    const k = todayKey(), f = el.dataset.f, v = parseNum(el.value), max = HK_TR[f].time ? 600 : 200;
    if (v != null && (v < 0 || v > max)) { toast('Wert prüfen'); el.classList.add('bad'); return; }
    el.classList.remove('bad');
    hkTestSet(k, f, v == null ? null : Math.round(v));
    flashSaved(el);
    hkSoftRender();
  },
});
