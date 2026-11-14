/* ============================================================
   KNIE: KRAFT & ATHLETIK (seit 2.13.0, Wunsch vom 14.11.2026)
   Der 12-Wochen-Kraftplan ist jetzt ein tägliches Programm für zu Hause (20–25 Min., Einheiten A/B/C im Wechsel)
   plus Knie-Block am Beintag im Gym. Ausstattung: Ergometer (Rad), Kettlebells 2 × 12 kg, Miniband, Stufe,
   Power Tower, Matte, Blackroll.
   – Sehne (Schmerz unter der Kniescheibe): Breda 2021 – isometrisch → langsam schwer → Sprungkraft → Sport, im
     akzeptablen Schmerzbereich; besser als exzentrisches Training.
   – Außenseite des Knies: Hüftabduktoren kräftigen (häufigster wirksamer Baustein bei ITBS-Studien).
   – Athletik: Gleichgewicht, Landen, Seitbewegung, Sprünge – neuromuskuläres Training senkt Knieverletzungen.
   – Schmerz-Monitoring: bis 5/10 während/nach der Übung ok, am nächsten Morgen zurück auf dem Ausgangswert.
   ============================================================ */
/*icons: dumbbell play check triangle-alert octagon-alert info chevron-down chevron-up zap*/
const ATH_EX = [
  { id: 'a_ergo', n: 'Ergometer locker', en: 'Stationary Bike Warm Up', cat: 'athl', areas: ['vorn'], d: { t: 'time', s: 1, sec: 300, noX: true }, dose: '5 Min. locker',
    how: 'Sattel so hoch einstellen, dass das Knie am tiefsten Punkt fast gestreckt ist. 80–90 Umdrehungen pro Minute, wenig Widerstand – du kannst dich dabei unterhalten.',
    benefit: 'Wärmt Muskeln und Sehnen ohne Stoßbelastung auf; Radfahren belastet die Kniescheibe wenig.', mistake: 'Sattel zu tief – dann drückt es mehr auf die Kniescheibe.', safety: 'Keine.', prog: 'An freien Tagen auch 20–40 Min. Zone 2 statt Joggen, solange Laufen noch schmerzt.' },
  { id: 'a_wand60', n: 'Wandsitzen für die Sehne', en: 'Isometric Wall Sit Patellar Tendon', cat: 'strength', areas: ['vorn'], d: { t: 'time', s: 1, sec: 45, sets: 5, rest: 60, noX: true }, dose: '5 × 45 Sek., 1 Min. Pause, Knie ca. 60°',
    how: 'Rücken an die Wand, Füße hüftbreit etwa eine Fußlänge vor der Wand. Nur bis etwa 60° Kniebeugung heruntergleiten (Oberschenkel noch schräg, nicht waagerecht) und halten. Anstrengung etwa 7 von 10, Knie zeigen über die 2. Zehe.',
    benefit: 'Gleichmäßig hohe Spannung für Oberschenkel und Patellasehne – Stufe 1 des Sehnen-Programms. Lindert bei vielen kurzfristig den Schmerz.', mistake: 'Zu tief einsteigen oder die Knie nach innen fallen lassen.', safety: 'Bis 5/10 Schmerz ist okay, wenn er morgen früh wieder auf dem Ausgangswert ist. Sonst weniger tief.', prog: 'Tiefer (bis 90°), mit Kettlebell auf den Oberschenkeln oder einbeinig.' },
  { id: 'a_wand1b', n: 'Einbeiniges Wandsitzen', en: 'Single Leg Wall Sit', cat: 'strength', areas: ['vorn'], d: { t: 'time', s: 2, sec: 30, sets: 3, rest: 45 }, dose: '3 × 30 Sek. je Bein',
    how: 'Wie Wandsitzen, dann einen Fuß wenige Zentimeter anheben, sodass ein Bein das Gewicht trägt. Becken bleibt gerade.',
    benefit: 'Mehr Last pro Sehne, ohne Gewichte – zeigt auch Unterschiede zwischen links und rechts.', mistake: 'Hüfte kippt zur Seite.', safety: 'Bis 5/10 Schmerz.', prog: 'Länger halten oder tiefer.' },
  { id: 'a_goblet', n: 'Goblet-Kniebeuge langsam, Fersen erhöht', en: 'Heel Elevated Goblet Squat Tempo', cat: 'strength', areas: ['vorn', 'huefte'], kg: true, d: { t: 'reps', s: 1, reps: 8, sets: 4, rest: 90, noX: true }, dose: '4 × 8, 3 Sek. runter, 3 Sek. hoch, 12 kg',
    how: 'Kettlebell vor der Brust, Fersen auf ein flaches Brett oder zwei Bücher (2–3 cm). In 3 Sek. so tief wie angenehm runter, 3 Sek. hoch. Die Knie dürfen über die Zehen.',
    benefit: 'Langsam und schwer (Stufe 2): kräftigt Quadrizeps und Patellasehne; die erhöhten Fersen legen den Fokus auf den vorderen Oberschenkel.', mistake: 'Zu schnell, Schwung aus der Hocke.', safety: 'Bis 5/10 Schmerz, am nächsten Morgen nicht schlechter. Sonst weniger tief.', prog: 'Zwei Kettlebells (24 kg) oder 4 × 6 mit 2 Sek. Pause unten.' },
  { id: 'a_stepup', n: 'Step-up langsam', en: 'Slow Step Up Kettlebell', cat: 'strength', areas: ['vorn', 'huefte'], kg: true, d: { t: 'reps', s: 2, reps: 8, sets: 3 }, dose: '3 × 8 je Bein, 2 × 12 kg',
    how: 'Ein Fuß auf die Stufe, mit diesem Bein hochdrücken (das hintere hilft kaum), oben kurz stehen, in 3 Sek. absenken. Knie über dem 2. Zeh.',
    benefit: 'Einbeinige Kraft wie beim Treppensteigen, Laufen und Aufstehen aus dem Kniestand.', mistake: 'Mit dem unteren Bein abstoßen.', safety: 'Bis 5/10 Schmerz.', prog: 'Höhere Stufe oder schwerer.' },
  { id: 'a_tibialis', n: 'Schienbein-Heben an der Wand', en: 'Tibialis Raise Wall', cat: 'strength', areas: ['wade', 'fuss'], d: { t: 'reps', s: 1, reps: 15, sets: 2, noX: true }, dose: '2 × 15',
    how: 'Mit dem Rücken an die Wand lehnen, Fersen etwa 30 cm vor der Wand. Fußspitzen so hoch wie möglich ziehen, kurz halten, langsam absenken.',
    benefit: 'Kräftigt den vorderen Unterschenkel, der beim Abbremsen und Laufen mitarbeitet.', mistake: 'Hohlkreuz, Schwung.', safety: 'Keine.', prog: 'Weiter weg von der Wand oder einbeinig.' },
  { id: 'a_kbdl', n: 'Kettlebell-Kreuzheben', en: 'Kettlebell Deadlift', cat: 'strength', areas: ['hinten', 'huefte'], kg: true, d: { t: 'reps', s: 1, reps: 10, sets: 3, noX: true }, dose: '3 × 10 mit 2 × 12 kg',
    how: 'Kettlebells neben den Füßen. Hüfte nach hinten schieben, Rücken gerade, Knie leicht gebeugt, greifen und aus der Hüfte aufrichten. Oben Po anspannen.',
    benefit: 'Hüftstrecker und Beinbeuger stark machen – sie nehmen dem Knie bei Landungen und im BJJ Arbeit ab, bei wenig Druck auf die Kniescheibe.', mistake: 'Runder Rücken, aus den Knien statt aus der Hüfte.', safety: 'Rücken neutral halten.', prog: 'Einbeinig (siehe Einbeiniges Kreuzheben) oder langsamer ablassen.' },
  { id: 'a_swing', n: 'Kettlebell-Swing', en: 'Kettlebell Swing', cat: 'athl', areas: ['hinten', 'huefte'], kg: true, d: { t: 'reps', s: 1, reps: 15, sets: 3, noX: true }, dose: '3 × 15 mit 12 kg',
    how: 'Kettlebell zwischen den Beinen nach hinten schwingen (Hüfte nach hinten), dann explosiv die Hüfte strecken – die Kugel schwingt bis Brusthöhe. Die Kraft kommt aus der Hüfte, nicht aus den Armen.',
    benefit: 'Explosive Hüftstreckung ohne Stoß fürs Knie – Athletik und Kondition.', mistake: 'Kniebeuge statt Hüftbeuge, Arme ziehen.', safety: 'Erst die Technik, dann das Tempo.', prog: '3 × 20 oder einarmig.' },
  { id: 'a_tiefhocke', n: 'Tiefe Hocke halten', en: 'Assisted Deep Squat Hold', cat: 'mob', areas: ['vorn', 'huefte'], d: { t: 'time', s: 1, sec: 30, sets: 3, noX: true }, dose: '3 × 30 Sek. am Power Tower',
    how: 'Am Power Tower festhalten und so tief in die Hocke gehen, wie es angenehm ist, Fersen am Boden (sonst etwas unter die Fersen legen). Ruhig atmen, Gewicht leicht vor und zurück verlagern.',
    benefit: 'Gewöhnt die Knie an tiefe Beugung, wie sie im BJJ (Guard, Kniestand, Scramble) ständig vorkommt.', mistake: 'Ohne Halt erzwingen.', safety: 'Nur bis 3/10 Schmerz; bei Druck unter der Kniescheibe weniger tief.', prog: 'Weniger festhalten, länger halten.' },
  { id: 'a_copen', n: 'Copenhagen-Seitstütz', en: 'Copenhagen Plank Short Lever', cat: 'strength', areas: ['add', 'rumpf'], d: { t: 'time', s: 2, sec: 20, sets: 3 }, dose: '3 × 20 Sek. je Seite, Knie aufgelegt',
    how: 'Seitstütz auf dem Unterarm, das obere Knie liegt auf der Stufe oder dem Sofa, das untere Bein hängt frei. Becken anheben, Körper gerade, halten.',
    benefit: 'Kräftigt die Adduktoren (Innenseite) – sie stabilisieren das Knie von innen; Innenband-Verletzungen sind im BJJ die häufigsten Knieverletzungen.', mistake: 'Becken sackt ab.', safety: 'Bei Leistenschmerz kürzer halten.', prog: 'Fuß statt Knie auflegen (langer Hebel), unteres Bein anheben.' },
  { id: 'a_seitausfall', n: 'Seitlicher Ausfallschritt', en: 'Lateral Lunge Goblet', cat: 'strength', areas: ['add', 'huefte', 'vorn'], kg: true, d: { t: 'reps', s: 2, reps: 8, sets: 3 }, dose: '3 × 8 je Seite, 12 kg',
    how: 'Breit stehen, Kettlebell vor der Brust. Gewicht auf ein Bein verlagern und die Hüfte nach hinten schieben, das andere Bein bleibt gestreckt. Knie über dem Fuß, zurück zur Mitte.',
    benefit: 'Kraft in der Seitbewegung – fürs Ausweichen, Passieren und Scrambles.', mistake: 'Knie fällt nach innen, Ferse hebt ab.', safety: 'Bis 5/10 Schmerz.', prog: 'Tiefer oder Cossack Squat.' },
  { id: 'a_cossack', n: 'Cossack Squat', en: 'Cossack Squat', cat: 'strength', areas: ['add', 'huefte', 'vorn'], kg: true, d: { t: 'reps', s: 2, reps: 6, sets: 3 }, dose: '3 × 6 je Seite',
    how: 'Sehr breit stehen, tief zu einer Seite in die Hocke, das andere Bein gestreckt mit der Fußspitze nach oben. Mit Halt am Power Tower beginnen.',
    benefit: 'Kraft in tiefer Beugung und Spreizung – genau die Positionen aus der Guard und beim Passieren.', mistake: 'Ferse hebt ab, Rücken rund.', safety: 'Nur so tief wie kontrolliert möglich.', prog: 'Ohne Halt, dann mit Kettlebell.' },
  { id: 'a_pistol', n: 'Einbeinig aufstehen mit Halt', en: 'Assisted Single Leg Box Squat', cat: 'strength', areas: ['vorn', 'huefte'], d: { t: 'reps', s: 2, reps: 6, sets: 3 }, dose: '3 × 6 je Bein',
    how: 'Vor dem Power Tower auf einem Bein stehen, an den Griffen festhalten, langsam auf einen Stuhl absetzen und mit einem Bein wieder aufstehen. Nur so viel ziehen wie nötig.',
    benefit: 'Volle einbeinige Kraft für Knie und Sehne – Vorstufe zur Pistol-Kniebeuge.', mistake: 'Knie fällt nach innen, Schwung.', safety: 'Bis 5/10 Schmerz.', prog: 'Niedrigerer Sitz, weniger Halt.' },
  { id: 'a_landen', n: 'Landen üben', en: 'Drop Landing Snap Down', cat: 'athl', plyo: true, areas: ['vorn', 'huefte'], d: { t: 'reps', s: 1, reps: 6, sets: 3, noX: true }, dose: '3 × 6',
    how: 'Von der Stufe heruntersteigen (nicht springen) und auf beiden Füßen weich landen: Knie über den Füßen, Hüfte nach hinten, möglichst leise. 2 Sek. halten.',
    benefit: 'Kontrolliertes Abbremsen – Kern der Programme gegen Knieverletzungen.', mistake: 'Laut und steif landen, Knie nach innen.', safety: 'Nur an Tagen ohne erhöhten Schmerz.', prog: 'Einbeinig landen, dann seitlich.' },
  { id: 'a_skater', n: 'Skater-Sprünge', en: 'Skater Jumps', cat: 'athl', plyo: true, areas: ['huefte', 'wade'], d: { t: 'reps', s: 2, reps: 6, sets: 3 }, dose: '3 × 6 je Seite',
    how: 'Seitlich von einem Bein aufs andere springen und weich einbeinig landen, 1 Sek. halten. Erst klein, dann weiter.',
    benefit: 'Seitliche Sprungkraft und Landung auf einem Bein – wie beim Ausweichen und schnellen Positionswechsel.', mistake: 'Knie fällt bei der Landung nach innen.', safety: 'Nur schmerzarm (bis 3/10).', prog: 'Weiter springen, schneller wechseln.' },
  { id: 'a_stufensprung', n: 'Sprung auf die Stufe', en: 'Box Jump Low Step', cat: 'athl', plyo: true, areas: ['vorn', 'wade'], d: { t: 'reps', s: 1, reps: 6, sets: 3, noX: true }, dose: '3 × 6',
    how: 'Beidbeinig auf eine stabile, niedrige Stufe springen, weich landen, dann heruntersteigen (nicht herunterspringen).',
    benefit: 'Sprungkraft mit wenig Landestoß – Stufe 3 des Sehnen-Programms.', mistake: 'Herunterspringen, harte Landung.', safety: 'Nur schmerzarm (bis 3/10).', prog: 'Höhere Stufe, dann einbeinig.' },
  { id: 'a_standup', n: 'Technisches Aufstehen', en: 'Technical Stand Up BJJ', cat: 'athl', areas: ['huefte', 'vorn'], d: { t: 'reps', s: 2, reps: 5, sets: 2 }, dose: '2 × 5 je Seite',
    how: 'Aus dem Sitzen: eine Hand hinten aufsetzen, den gegenüberliegenden Fuß fest aufstellen, Hüfte anheben, das freie Bein nach hinten durchziehen und in eine stabile Basis aufstehen. Langsam und kontrolliert.',
    benefit: 'BJJ-typischer Ablauf unter Kontrolle – Knie in Beugung und Drehung belastbar machen.', mistake: 'Knie knickt beim Durchziehen nach innen.', safety: 'Langsam beginnen.', prog: 'Schneller, mit Richtungswechsel.' },
];
KNEE_EX.push(...ATH_EX);
const ATH_TYPES = { A: 'Sehne & Kraft', B: 'Hüfte & Seite', C: 'Athletik & Kontrolle' };
const ATH_NEXT = { A: 'B', B: 'C', C: 'A' };
function athStr(k) { return kneeDay(peekDay(k)).str || null; }
function athLegsDay(k) { const tpl = weekTpl(weekday(k)); return !!(tpl.gym && gymDay(tpl.gym) && gymDay(tpl.gym).legs) || dayDone(k).legs; }
/* Einheit des Tages: gewählt, sonst die nächste nach der letzten erledigten; am Beintag nicht A (schwerer Quadrizeps) */
function athType(k = todayKey()) {
  const s = athStr(k);
  if (s && s.t && ATH_TYPES[s.t]) return s.t;
  let last = null;
  for (let i = 1; i <= 14 && !last; i++) { const x = athStr(addDays(k, -i)); if (x && x.done && x.t) last = x.t; }
  let t = last ? ATH_NEXT[last] : 'A';
  if (t === 'A' && athLegsDay(k)) t = 'B';
  return t;
}
/* Leichter Tag nach dem Schmerz-Monitoring: Morgenschmerz deutlich höher oder letzte Einheit über 5/10 */
function athLight(k = todayKey()) {
  const kn = kneeDay(peekDay(k)), am = kneeAm(k);
  if ((kn.flags || []).length) return { stop: true, why: `Warnzeichen: ${kn.flags.join(', ')}` };
  let prev = null;
  for (let i = 1; i <= 3 && prev == null; i++) prev = kneeAm(addDays(k, -i));
  let sp = null;
  for (let i = 1; i <= 2 && sp == null; i++) { const x = athStr(addDays(k, -i)); if (x && x.pain != null) sp = x.pain; }
  if (am != null && am >= 7) return { why: `Morgenschmerz ${am}/10` };
  if (am != null && prev != null && am - prev >= 2) return { why: `Morgenschmerz ${am}/10 (vorher ${prev}/10)` };
  if (sp != null && sp > 5) return { why: `letzte Einheit ${sp}/10` };
  return null;
}
function athItems(k = todayKey(), t = athType(k)) {
  const L = athLight(k);
  let items = clone((kneePhase().days || {})[t] || []).filter((it) => exById(it.i));
  if (L) items = items.filter((it) => !exById(it.i).plyo).map((it) => (it.sets > 1 ? { ...it, sets: it.sets - 1 } : it));
  return items;
}
function athRoutine(k = todayKey(), t = athType(k)) { return { id: 'kraft', n: `Knie-Athletik ${t}`, items: athItems(k, t) }; }
function athMin(k = todayKey(), t = athType(k)) { return Math.max(1, Math.round(routineSec(athRoutine(k, t)) / 60)); }
function athStart(k = todayKey()) {
  const t = athType(k), rt = athRoutine(k, t);
  timerStart('kraft', { steps: buildSteps(rt), name: `${rt.n} · ${ATH_TYPES[t]}` });
  if (ui.timer) ui.timer.athT = t;
}
/* Nach dem Timer: Einheit als erledigt speichern (alle Sätze, Schmerz vom Abschluss-Bildschirm) */
function athSaveTimer(t) {
  const k = todayKey(), items = athItems(k, t.athT || athType(k));
  kneeMut(k, (kn) => {
    kn.str = kn.str || { ex: {} };
    kn.str.ex = kn.str.ex || {};
    kn.str.t = t.athT || kn.str.t || athType(k);
    kn.str.phase = kneeCfg().phase || 1;
    if (t.complete) for (const it of items) { const e = kn.str.ex[it.i] = kn.str.ex[it.i] || { sets: [] }; e.sets = Array.from({ length: it.sets || exById(it.i).d.sets || 1 }, () => true); }
    if (t.pain != null) kn.str.pain = t.pain;
    if (t.complete || (t.i >= t.steps.length * 0.8)) kn.str.done = true;
  });
}
function athEnsure(kn, k) { kn.str = kn.str || { ex: {}, phase: kneeCfg().phase || 1 }; kn.str.ex = kn.str.ex || {}; if (!kn.str.t) kn.str.t = athType(k); return kn.str; }
function athWeek(ws) { return weekKeys(ws).map((k) => { const s = athStr(k); return { k, t: s && s.done ? s.t || '✓' : null }; }); }
/* ---------- Oberfläche ---------- */
function athLightBanner(k) {
  const L = athLight(k);
  if (!L) return '';
  return `<div class="banner ${L.stop ? 'is-red' : 'is-warn'}">${icon(L.stop ? 'octagon-alert' : 'triangle-alert')}<div><b>Heute leichter</b><span>${esc(L.why)}: je Übung ein Satz weniger, keine Sprünge, beim Wandsitzen nur etwa halbe Kraft.${L.stop ? ' Schwellung, Instabilität, Blockade oder Nachtschmerz bitte ärztlich oder physiotherapeutisch abklären lassen.' : ' Wird es nicht besser, eine Stufe zurück.'}</span></div></div>`;
}
function athGymHTML(compact) {
  const ph = kneePhase();
  return `<section class="${compact ? 'card' : 'sec'} ath-gym"><div class="sec-head"><h2>Knie-Block im Gym</h2><span class="count">am Beintag · ${esc(ph.n)}</span></div><div class="list">${(ph.gym || []).map(([n, dose]) => `<div class="row is-static"><span class="row-main"><b>${esc(n)}</b><small>${esc(dose)}</small></span></div>`).join('')}</div>${compact ? '' : '<p class="hint">Vor dem Beintag 5 Min. Ergometer. Schmerz bis 5/10 ist okay, wenn das Knie am nächsten Morgen nicht schlechter ist.</p>'}</section>`;
}
function athTrainCard(k) {
  if (!athLegsDay(k)) return '';
  return athGymHTML(true);
}
function athInfoHTML() {
  const open = ui.exp.has('ath-info');
  let h = `<section class="sec"><button class="row" data-a="expand" data-key="ath-info"><span class="row-main"><b>So funktioniert der Plan</b><small>Regeln, Studien, Quellen</small></span>${icon(open ? 'chevron-up' : 'chevron-down', 'row-ic')}</button>`;
  if (!open) return h + '</section>';
  h += `<ul class="wish-list">
    <li><b>Schmerz-Regel:</b> Während und direkt nach den Übungen sind bis 5/10 okay, wenn der Schmerz bis zum nächsten Morgen wieder auf deinem Ausgangswert ist und nicht von Woche zu Woche steigt (Schmerz-Monitoring-Modell). Für den Wechsel in die nächste Phase müssen alle Werte 2 Wochen lang bei höchstens 3/10 liegen.</li>
    <li><b>Leichter Tag:</b> Morgenschmerz ab 7/10, 2 Punkte über dem Vortag oder die letzte Einheit über 5/10 → die App nimmt je Übung einen Satz weg und lässt Sprünge weg.</li>
    <li><b>Unter der Kniescheibe (Patellasehne):</b> Stufenweise belasten – isometrisch (Wandsitzen, Beinstrecker), dann langsam und schwer (3 Sek. runter, 3 Sek. hoch), dann Sprungkraft, dann Sport. In einer randomisierten Studie (76 Sportler, meist seit Jahren Beschwerden) verbesserte das den VISA-P-Wert nach 24 Wochen um 28 statt 18 Punkte gegenüber klassischem exzentrischem Training. Isometrische Übungen lindern bei manchen kurzfristig, sind langfristig aber nicht besser als langsames Krafttraining – deshalb nur als Einstieg und an leichteren Tagen.</li>
    <li><b>Außenseite des Knies:</b> Häufig ist es der Tractus iliotibialis (Läuferknie). In den Studien war das Kräftigen der Hüftabduktoren der häufigste wirksame Baustein (Seitliches Beinheben, Clamshells, Monster Walks, Seitstütz, Hip Hike). Den Tractus selbst zu dehnen hilft kaum; rollen eher Po und Oberschenkel vorne.</li>
    <li><b>Athletik:</b> Programme aus Gleichgewicht, Kraft, Landen und Sprüngen senkten Knieverletzungen in einer Meta-Analyse um rund ein Viertel und Kreuzbandrisse um rund die Hälfte. Entscheidend ist Regelmäßigkeit.</li>
    <li><b>BJJ:</b> In einer Befragung betrafen knapp 30 % der Verletzungen das Knie, meist Innenband-Zerrungen. Deshalb Adduktoren (Copenhagen), Seitbewegung, tiefe Beugung und kontrolliertes Aufstehen.</li>
    <li><b>Abklären:</b> Halten die Beschwerden schon länger an, lass einmal von Physio oder Sportmedizin klären, was genau es ist (Patellasehne, Kniescheibe, Tractus, Außenband, Meniskus) – der Plan passt zu den häufigen Ursachen, ersetzt aber keine Untersuchung. Sofort abklären: Schwellung, Wegknicken, Blockade, Nachtschmerz.</li></ul>
    <h5>Quellen</h5><div class="list">${[
    ['Breda 2021: Stufenweises Sehnentraining bei Patellasehnen-Beschwerden (BJSM)', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8070614/'],
    ['Erasmus MC: Ablauf der vier Stufen (JUMPER-Studie)', 'https://www.erasmusmc.nl/en/research/project/jumper-project'],
    ['Clifford 2020: Isometrisch vs. isotonisch bei Tendinopathie (Meta-Analyse)', 'https://pubmed.ncbi.nlm.nih.gov/32818059/'],
    ['Sprague 2021: Schmerz-Monitoring bei Patellasehnen-Beschwerden', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7905015'],
    ['Sanchez-Alvarado 2024: Behandlung des Läuferknies (systematische Übersicht)', 'https://pubmed.ncbi.nlm.nih.gov/39247485/'],
    ['Donnell-Fink 2015: Neuromuskuläres Training gegen Knieverletzungen (Meta-Analyse)', 'https://pubmed.ncbi.nlm.nih.gov/26637173/'],
    ['Eustaquio 2021: Knieverletzungen im BJJ', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8601382'],
  ].map(([n, u]) => `<a class="row" href="${u}" target="_blank" rel="noopener"><span class="row-main"><b>${esc(n)}</b></span>${icon('chevron-right', 'row-ic')}</a>`).join('')}</div>`;
  return h + '</section>';
}
function athWeekHTML(k) {
  const ws = weekStart(k), wk = athWeek(ws), n = wk.filter((x) => x.t).length, goal = kneePhase().perWeek;
  return `<section class="sec"><div class="sec-head"><h2>Diese Woche</h2><span class="count">${n}/${goal} Einheiten</span></div><div class="ath-week">${wk.map((x, i) => `<div class="ath-day${x.t ? ' is-done' : ''}${x.k === k ? ' is-today' : ''}"><small>${WD_SHORT[i]}</small><b>${x.t ? esc(x.t) : x.k < k ? '–' : '·'}</b></div>`).join('')}</div><p class="hint">Ein Tag Pause pro Woche ist eingeplant. Ausgefallen? Einfach mit der nächsten Einheit weitermachen.</p></section>`;
}
/* Routine-Schritt und Mitteilung */
function pushAth(k, r, d, add) {
  if (kneeWeek(k) < 1 || dayDone(k).kraft) return;
  const t = athType(k), L = athLight(k);
  add('training', Math.min(r.bed - 240, 19 * 60 + 30), 'ath', `Knie-Athletik ${t}: ${ATH_TYPES[t]}`, `ca. ${athMin(k, t)} Min. zu Hause${L ? ` – heute leichter (${L.why})` : ''}. Antippen öffnet die Einheit.`, '#kraft');
}
function athReportLine(ws) {
  const wk = athWeek(ws).filter((x) => x.t);
  if (!wk.length) return '';
  const pains = weekKeys(ws).map((k) => (athStr(k) || {}).pain).filter((v) => v != null);
  return `Kraft & Athletik (${kneePhase().n}): ${wk.length}/${kneePhase().perWeek} Einheiten (${wk.map((x) => x.t).join(' ')})${pains.length ? ` · Schmerz in den Einheiten Ø ${fmt(mean(pains), 1)}, max. ${Math.max(...pains)}` : ''}`;
}
Object.assign(A, {
  'ath-type': (el) => { const k = todayKey(), v = el.dataset.v; kneeMut(k, (kn) => { athEnsure(kn, k).t = v; }); render(); },
  'ath-start': () => athStart(todayKey()),
  'tm-pain': (el) => { const t = ui.timer; if (!t) return; const v = Number(el.dataset.v); t.pain = t.pain === v ? null : v; timerRender(); },
});
