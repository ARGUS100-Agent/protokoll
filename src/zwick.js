/* ============================================================
   ZWICKT'S – Beschwerden an anderen Stellen (seit 2.12.0, Wunsch vom 12.11.2026)
   Der Fokus bleibt das Knie. Zwickt es woanders (z. B. nach dem BJJ), Stelle und Seite wählen,
   Schmerz 0–10 täglich, Warnzeichen. Übungen gestuft nach Schmerz:
   – akut (Schmerz ≥ 4): sanft im schmerzfreien Bereich bewegen und isometrisch anspannen, nicht dehnen
   – Aufbau (Schmerz ≤ 3): leicht dehnen (Zug 3–5/10, nie in den Schmerz) und vorsichtig kräftigen
   Grundlage: frühe, dosierte Bewegung statt Ruhigstellen (PEACE & LOVE, Dubois & Esculier, BJSM 2020);
   Schmerz bei Übungen bis 3/10 ist okay, am nächsten Tag darf es nicht schlimmer sein.
   Die App ersetzt keine Untersuchung: Warnzeichen → ärztlich oder physiotherapeutisch abklären.
   ============================================================ */
/*icons: hand triangle-alert octagon-alert play check shield-alert chevron-up chevron-down plus*/
const ZW_AREAS = {
  nacken: { n: 'Nacken', side: false, warn: 'Ausstrahlen in den Arm, Kribbeln oder Taubheit in der Hand, Schwindel → ärztlich abklären.' },
  schulter: { n: 'Schulter', side: true, warn: 'Arm lässt sich nicht mehr über Kopf heben, deutlicher Kraftverlust, Schmerz nachts beim Liegen auf der Seite oder ein „Herausspringen“ (z. B. in Kimura/Americana) → ärztlich oder physiotherapeutisch abklären.' },
  ellenbogen: { n: 'Ellenbogen', side: true, warn: 'Schwellung, Bluterguss, Knacken im Armhebel, Arm lässt sich nicht ganz strecken oder fühlt sich instabil an → ärztlich abklären, bis dahin nicht belasten.' },
  hand: { n: 'Handgelenk/Finger', side: true, warn: 'Schwellung, Druckschmerz in der Tabatière (Grube am Daumenansatz), Finger nicht ganz streckbar → ärztlich abklären (Bruch oder Bandverletzung ausschließen).' },
  bws: { n: 'Oberer Rücken', side: false, warn: 'Schmerz beim Atmen, Brustschmerz oder Atemnot → sofort ärztlich abklären.' },
  lws: { n: 'Unterer Rücken', side: false, warn: 'Ausstrahlen ins Bein bis unter das Knie, Taubheit, Schwäche im Bein → ärztlich abklären. Taubheit im Genitalbereich oder Probleme mit Blase/Darm → sofort Notaufnahme.' },
  huefte: { n: 'Hüfte/Leiste', side: true, warn: 'Hinken, Schmerz in der Leiste beim Gehen, Schwellung in der Leiste → ärztlich abklären.' },
  hinten: { n: 'Oberschenkel hinten', side: true, warn: 'Plötzlicher Stich beim Sprint oder Strecken, Bluterguss am Oberschenkel → ärztlich abklären (Muskelfaserriss).' },
  wade: { n: 'Wade/Achillessehne', side: true, warn: 'Gefühl wie ein Tritt in die Wade, Zehenstand geht nicht mehr, Schwellung der Wade → sofort ärztlich abklären.' },
  fuss: { n: 'Sprunggelenk/Fuß', side: true, warn: 'Kannst nach dem Umknicken nicht 4 Schritte gehen, Druckschmerz am Knöchel hinten → ärztlich abklären (Bruch ausschließen).' },
};
const ZW_FLAGS = ['Schwellung', 'Knacken/Ploppen beim Training', 'Kraftverlust', 'Taubheit/Kribbeln', 'Nachtschmerz', 'Instabil/blockiert'];
const ZW_EX = [
  /* Nacken */
  { id: 'z_chintuck', n: 'Kinn einziehen', en: 'Chin Tucks', cat: 'mob', area: 'nacken', st: 'akut', d: { t: 'reps', s: 1, reps: 10, noX: true }, dose: '10×, 3 Sek. halten', how: 'Aufrecht sitzen, Blick geradeaus. Kinn waagerecht nach hinten schieben (Doppelkinn), 3 Sek. halten, lösen.', safety: 'Nicht nicken, nur nach hinten gleiten.' },
  { id: 'z_nrot', n: 'Kopf drehen und neigen', en: 'Neck Range of Motion Exercises', cat: 'mob', area: 'nacken', st: 'akut', d: { t: 'reps', s: 1, reps: 8, alt: true, noX: true }, dose: '8× je Richtung', how: 'Langsam nach links und rechts drehen, dann Ohr Richtung Schulter neigen. Nur so weit, wie es schmerzfrei geht.', safety: 'Kein Kreisen, kein Ruck.' },
  { id: 'z_niso', n: 'Isometrisch: Hand gegen den Kopf', en: 'Isometric Neck Exercises', cat: 'iso', area: 'nacken', st: 'akut', d: { t: 'time', s: 1, sec: 40, noX: true }, dose: 'je Richtung 5 Sek., 2 Runden', how: 'Hand an Stirn, Hinterkopf, linke und rechte Kopfseite. Kopf leicht (30 %) gegen die Hand drücken, ohne dass er sich bewegt, je 5 Sek.', safety: 'Nur leichter Druck, gleichmäßig atmen.' },
  { id: 'z_trap', n: 'Nacken seitlich dehnen', en: 'Upper Trapezius Stretch', cat: 'stretch', area: 'nacken', st: 'aufbau', d: { t: 'time', s: 2, sec: 30, noX: true }, dose: '30 Sek. je Seite', how: 'Sitzen, eine Hand unter das Gesäß. Ohr zur anderen Schulter neigen, mit der freien Hand den Kopf ganz leicht mitnehmen.', safety: 'Zug 3–5 von 10, kein Kribbeln im Arm.' },
  { id: 'z_levator', n: 'Schulterblattheber dehnen', en: 'Levator Scapulae Stretch', cat: 'stretch', area: 'nacken', st: 'aufbau', d: { t: 'time', s: 2, sec: 30, noX: true }, dose: '30 Sek. je Seite', how: 'Kopf drehen, Blick schräg nach unten zur Achsel, Hand leicht auf den Hinterkopf legen.', safety: 'Sanft, nicht ziehen.' },
  { id: 'z_wallangel', n: 'Wall Angels', en: 'Wall Angels', cat: 'mob', area: 'nacken', st: 'aufbau', d: { t: 'reps', s: 1, reps: 10, noX: true }, dose: '10×', how: 'Rücken und Hinterkopf an die Wand, Arme im „W“ an der Wand, langsam nach oben in ein „Y“ schieben und zurück.', safety: 'Nur so hoch, wie Unterarme an der Wand bleiben.' },
  /* Schulter */
  { id: 'z_pendel', n: 'Pendeln', en: 'Codman Pendulum Exercise', cat: 'mob', area: 'schulter', st: 'akut', d: { t: 'time', s: 2, sec: 45, noX: true }, dose: '45 Sek.', how: 'Mit der gesunden Hand auf einen Tisch stützen, Oberkörper vorbeugen, betroffenen Arm locker hängen lassen und kleine Kreise und Pendelbewegungen aus dem Körper heraus machen.', safety: 'Arm hängt passiv, nicht aktiv schwingen.' },
  { id: 'z_tisch', n: 'Tisch-Gleiten nach vorn', en: 'Shoulder Table Slide', cat: 'mob', area: 'schulter', st: 'akut', d: { t: 'reps', s: 1, reps: 10, noX: true }, dose: '10×', how: 'Am Tisch sitzen, Hand auf ein Handtuch, mit dem Oberkörper nach vorn lehnen, sodass der Arm nach vorn gleitet. Zurück.', safety: 'Nur bis kurz vor den Schmerz.' },
  { id: 'z_siso_ar', n: 'Isometrische Außenrotation an der Wand', en: 'Isometric Shoulder External Rotation Wall', cat: 'iso', area: 'schulter', st: 'akut', d: { t: 'reps', s: 1, reps: 5, noX: true }, dose: '5× 10 Sek.', how: 'Seitlich an die Wand, Ellenbogen 90° am Körper, Handrücken gegen die Wand. 30–50 % nach außen drücken, 10 Sek. halten.', safety: 'Schmerz höchstens 3/10.' },
  { id: 'z_siso_abd', n: 'Isometrisches Abspreizen an der Wand', en: 'Isometric Shoulder Abduction Wall', cat: 'iso', area: 'schulter', st: 'akut', d: { t: 'reps', s: 1, reps: 5, noX: true }, dose: '5× 10 Sek.', how: 'Seitlich an die Wand, Ellenbogen gebeugt, Außenseite des Ellenbogens gegen die Wand. Leicht nach außen drücken, 10 Sek.', safety: 'Schulter nicht hochziehen.' },
  { id: 'z_scap', n: 'Schulterblätter zurück und runter', en: 'Scapular Retraction Exercise', cat: 'mob', area: 'schulter', st: 'akut', d: { t: 'reps', s: 1, reps: 12, noX: true }, dose: '12×, 3 Sek. halten', how: 'Aufrecht, Arme hängen. Schulterblätter sanft nach hinten unten in die Gesäßtaschen ziehen, halten, lösen.', safety: 'Keine Schmerzen erlaubt.' },
  { id: 'z_cross', n: 'Cross-Body-Dehnung', en: 'Cross Body Shoulder Stretch', cat: 'stretch', area: 'schulter', st: 'aufbau', d: { t: 'time', s: 2, sec: 30, noX: true }, dose: '30 Sek., 2×', how: 'Betroffenen Arm waagerecht vor die Brust führen, mit der anderen Hand am Oberarm (nicht am Ellenbogen) sanft heranziehen.', safety: 'Schulter unten lassen, Zug hinten, kein Stechen vorn.' },
  { id: 'z_band_ar', n: 'Außenrotation mit Band', en: 'Resistance Band External Rotation', cat: 'strength', area: 'schulter', st: 'aufbau', d: { t: 'reps', s: 2, reps: 12, sets: 2, noX: true }, dose: '2× 12, leichtes Band', how: 'Ellenbogen 90° am Körper (Handtuch dazwischen), Unterarm gegen das Band nach außen drehen, 3 Sek. zurück.', safety: 'Leichtes Band, Schmerz ≤ 3/10.' },
  { id: 'z_wallslide', n: 'Wandrutschen', en: 'Wall Slides Shoulder', cat: 'mob', area: 'schulter', st: 'aufbau', d: { t: 'reps', s: 1, reps: 10, noX: true }, dose: '10×', how: 'Gesicht zur Wand, Unterarme an der Wand, langsam nach oben schieben, Schulterblätter mitnehmen, zurück.', safety: 'Nur bis zur schmerzfreien Höhe.' },
  { id: 'd_brust', area: 'schulter', st: 'aufbau', reuse: true },
  /* Ellenbogen */
  { id: 'z_ebeug', n: 'Ellenbogen beugen und strecken', en: 'Elbow Flexion Extension Range of Motion', cat: 'mob', area: 'ellenbogen', st: 'akut', d: { t: 'reps', s: 2, reps: 15, noX: true }, dose: '15×', how: 'Ohne Gewicht langsam ganz beugen und so weit strecken, wie es schmerzfrei geht.', safety: 'Nicht ins Strecken drücken.' },
  { id: 'z_drehen', n: 'Unterarm drehen', en: 'Forearm Pronation Supination', cat: 'mob', area: 'ellenbogen', st: 'akut', d: { t: 'reps', s: 2, reps: 15, noX: true }, dose: '15×', how: 'Ellenbogen 90° am Körper, Handfläche langsam nach oben und nach unten drehen.', safety: 'Langsam, schmerzfrei.' },
  { id: 'z_greif', n: 'Isometrisch greifen', en: 'Isometric Grip Exercise', cat: 'iso', area: 'ellenbogen', st: 'akut', d: { t: 'reps', s: 2, reps: 5, noX: true }, dose: '5× 10 Sek.', how: 'Weichen Ball oder gerolltes Handtuch mit 30–50 % Kraft drücken, 10 Sek. halten, lösen.', safety: 'Schmerz ≤ 3/10.' },
  { id: 'z_beugerdehn', n: 'Unterarmbeuger dehnen', en: 'Wrist Flexor Stretch', cat: 'stretch', area: 'ellenbogen', st: 'aufbau', d: { t: 'time', s: 2, sec: 30, noX: true }, dose: '30 Sek., 2×', how: 'Arm gestreckt nach vorn, Handfläche nach oben, mit der anderen Hand die Finger sanft nach unten ziehen.', safety: 'Ellenbogen nicht überstrecken.' },
  { id: 'z_streckerdehn', n: 'Unterarmstrecker dehnen', en: 'Wrist Extensor Stretch', cat: 'stretch', area: 'ellenbogen', st: 'aufbau', d: { t: 'time', s: 2, sec: 30, noX: true }, dose: '30 Sek., 2×', how: 'Arm nach vorn, Handrücken nach oben, Hand nach unten beugen und mit der anderen Hand sanft heranziehen.', safety: 'Zug, kein Stechen am Ellenbogen.' },
  { id: 'z_exz', n: 'Handgelenk langsam absenken', en: 'Eccentric Wrist Extension Tennis Elbow', cat: 'strength', area: 'ellenbogen', st: 'aufbau', d: { t: 'reps', s: 2, reps: 15, sets: 2, noX: true }, dose: '2× 15, 1–2 kg', how: 'Unterarm auf dem Oberschenkel, Hand hängt über das Knie, leichte Kurzhantel. Mit der anderen Hand hochheben, dann 3–4 Sek. langsam absenken.', safety: 'Leicht anfangen, Schmerz ≤ 3/10.' },
  { id: 'z_hammer', n: 'Unterarm drehen mit Gewicht', en: 'Dumbbell Supination Pronation', cat: 'strength', area: 'ellenbogen', st: 'aufbau', d: { t: 'reps', s: 2, reps: 12, sets: 2, noX: true }, dose: '2× 12', how: 'Hammer oder Kurzhantel am Ende greifen, Ellenbogen 90°, langsam nach innen und außen drehen.', safety: 'Kürzer greifen = leichter.' },
  /* Handgelenk/Finger */
  { id: 'z_hkreis', n: 'Handgelenk kreisen', en: 'Wrist Circles', cat: 'mob', area: 'hand', st: 'akut', d: { t: 'reps', s: 2, reps: 10, noX: true }, dose: '10× je Richtung', how: 'Faust locker, langsame Kreise im schmerzfreien Bereich.', safety: 'Klein anfangen.' },
  { id: 'z_glide', n: 'Sehnengleiten', en: 'Tendon Gliding Exercises', cat: 'mob', area: 'hand', st: 'akut', d: { t: 'reps', s: 2, reps: 5, noX: true }, dose: '5 Runden', how: 'Finger gestreckt → Haken → Faust → flache Faust → gerade Faust, jede Position 3 Sek.', safety: 'Ohne Kraft.' },
  { id: 'z_hiso', n: 'Isometrisch Handgelenk', en: 'Isometric Wrist Exercises', cat: 'iso', area: 'hand', st: 'akut', d: { t: 'time', s: 2, sec: 40, noX: true }, dose: '4 Richtungen je 5–10 Sek.', how: 'Andere Hand als Widerstand: Handgelenk leicht nach oben, unten, links, rechts drücken, ohne Bewegung.', safety: '30 % Kraft.' },
  { id: 'z_gebet', n: 'Gebetsdehnung', en: 'Prayer Stretch Wrist', cat: 'stretch', area: 'hand', st: 'aufbau', d: { t: 'time', s: 1, sec: 30, noX: true }, dose: '30 Sek., 2×', how: 'Handflächen vor der Brust aneinander, Hände langsam nach unten führen, bis es zieht.', safety: 'Zug 3–5/10.' },
  { id: 'z_rgebet', n: 'Umgekehrte Gebetsdehnung', en: 'Reverse Prayer Stretch', cat: 'stretch', area: 'hand', st: 'aufbau', d: { t: 'time', s: 1, sec: 30, noX: true }, dose: '30 Sek., 2×', how: 'Handrücken vor dem Bauch aneinander, Finger nach unten, Hände sanft anheben.', safety: 'Sanft.' },
  { id: 'z_gummi', n: 'Finger gegen Gummiband spreizen', en: 'Finger Extension Rubber Band', cat: 'strength', area: 'hand', st: 'aufbau', d: { t: 'reps', s: 2, reps: 15, sets: 2, noX: true }, dose: '2× 15', how: 'Gummiband um die Fingerspitzen, Finger auseinanderspreizen, langsam zurück. Gut als Ausgleich zum Griffkampf im BJJ.', safety: 'Leichtes Band.' },
  /* Oberer Rücken */
  { id: 'm_katzekuh', area: 'bws', st: 'akut', reuse: true },
  { id: 'z_openbook', n: 'Offenes Buch', en: 'Open Book Thoracic Rotation', cat: 'mob', area: 'bws', st: 'akut', d: { t: 'reps', s: 2, reps: 8, noX: true }, dose: '8× je Seite', how: 'Seitlage, Knie 90° angewinkelt, Arme nach vorn. Oberen Arm wie eine Buchseite nach hinten öffnen, Blick folgt, zurück.', safety: 'Knie bleiben aufeinander.' },
  { id: 'd_kind', area: 'bws', st: 'akut', reuse: true },
  { id: 'r_bws', area: 'bws', st: 'aufbau', reuse: true },
  { id: 'm_faden', area: 'bws', st: 'aufbau', reuse: true },
  { id: 'z_ytw', n: 'Y-T-W in Bauchlage', en: 'Prone Y T W Exercise', cat: 'strength', area: 'bws', st: 'aufbau', d: { t: 'reps', s: 1, reps: 8, noX: true }, dose: '8× je Buchstabe', how: 'Bauchlage, Stirn auf einem Handtuch. Arme als Y, T und W leicht anheben, Daumen nach oben, 2 Sek. halten.', safety: 'Nacken lang, nicht den Kopf heben.' },
  /* Unterer Rücken */
  { id: 'z_kniebrust', n: 'Knie zur Brust', en: 'Single Knee to Chest Stretch', cat: 'mob', area: 'lws', st: 'akut', d: { t: 'reps', s: 1, reps: 10, alt: true, noX: true }, dose: '10× je Seite', how: 'Rückenlage, ein Knie mit beiden Händen sanft zur Brust ziehen, 3 Sek., abwechseln.', safety: 'Kopf bleibt liegen.' },
  { id: 'z_becken', n: 'Becken kippen', en: 'Pelvic Tilt Exercise', cat: 'mob', area: 'lws', st: 'akut', d: { t: 'reps', s: 1, reps: 12, noX: true }, dose: '12×', how: 'Rückenlage, Beine aufgestellt. Unteren Rücken sanft in den Boden drücken, dann ein leichtes Hohlkreuz. Langsam im Wechsel.', safety: 'Kleine Bewegung reicht.' },
  { id: 'z_bauchlage', n: 'Bauchlage auf den Ellenbogen', en: 'Prone on Elbows McKenzie', cat: 'mob', area: 'lws', st: 'akut', d: { t: 'time', s: 1, sec: 60, noX: true }, dose: '60 Sek.', how: 'Bauchlage, auf die Unterarme stützen, Bauch entspannt am Boden lassen, ruhig atmen.', safety: 'Stopp, wenn Schmerz ins Bein ausstrahlt.' },
  { id: 'k_birddog', area: 'lws', st: 'aufbau', reuse: true },
  { id: 'k_deadbug', area: 'lws', st: 'aufbau', reuse: true },
  { id: 'd_figur4', area: 'lws', st: 'aufbau', reuse: true },
  /* Hüfte/Leiste */
  { id: 'z_addiso', n: 'Isometrisch Adduktoren', en: 'Isometric Adductor Squeeze Ball', cat: 'iso', area: 'huefte', st: 'akut', d: { t: 'reps', s: 1, reps: 5, noX: true }, dose: '5× 10 Sek.', how: 'Rückenlage, Beine aufgestellt, Ball oder Kissen zwischen die Knie, mit 30–50 % zusammendrücken, 10 Sek.', safety: 'Leistenschmerz ≤ 3/10.' },
  { id: 'z_hkreisen', n: 'Hüftkreisen im Vierfüßler', en: 'Quadruped Hip Circles', cat: 'mob', area: 'huefte', st: 'akut', d: { t: 'reps', s: 2, reps: 8, noX: true }, dose: '8× je Richtung', how: 'Vierfüßlerstand, ein Knie langsam in großen Kreisen nach außen und hinten führen.', safety: 'Rücken bleibt ruhig.' },
  { id: 'k_bridge', area: 'huefte', st: 'akut', reuse: true },
  { id: 'd_hueftbeuger', area: 'huefte', st: 'aufbau', reuse: true },
  { id: 'm_9090wechsel', area: 'huefte', st: 'aufbau', reuse: true },
  { id: 'd_rockback', area: 'huefte', st: 'aufbau', reuse: true },
  /* Oberschenkel hinten */
  { id: 'z_hamiso', n: 'Isometrisch Beinbeuger', en: 'Isometric Hamstring Heel Dig', cat: 'iso', area: 'hinten', st: 'akut', d: { t: 'reps', s: 2, reps: 5, noX: true }, dose: '5× 10 Sek.', how: 'Rückenlage, Knie leicht gebeugt, Ferse mit 30–50 % in den Boden drücken, 10 Sek.', safety: 'Kein Krampf, kein Stechen.' },
  { id: 'k_bridge', area: 'hinten', st: 'akut', reuse: true },
  { id: 'z_heelslide', n: 'Ferse gleiten lassen', en: 'Heel Slides Exercise', cat: 'mob', area: 'hinten', st: 'akut', d: { t: 'reps', s: 2, reps: 12, noX: true }, dose: '12×', how: 'Rückenlage, Ferse auf einem Handtuch langsam Richtung Gesäß ziehen und wieder strecken.', safety: 'Ohne Zug hinten am Oberschenkel.' },
  { id: 'd_beinbeuger', area: 'hinten', st: 'aufbau', reuse: true },
  { id: 'k_hambridge', area: 'hinten', st: 'aufbau', reuse: true },
  { id: 'z_besen', n: 'Hüftbeuge mit Besenstiel', en: 'Hip Hinge Dowel', cat: 'strength', area: 'hinten', st: 'aufbau', d: { t: 'reps', s: 1, reps: 10, sets: 2, noX: true }, dose: '2× 10', how: 'Stock am Rücken (Hinterkopf, Brustwirbel, Kreuzbein), Knie leicht gebeugt, Hüfte nach hinten schieben, bis es hinten zieht, zurück.', safety: 'Langsam, nicht ins Stechen.' },
  /* Wade/Achillessehne */
  { id: 'z_wadeiso', n: 'Wadenheben halten', en: 'Isometric Calf Raise Hold', cat: 'iso', area: 'wade', st: 'akut', d: { t: 'time', s: 2, sec: 30, sets: 3, noX: true }, dose: '3× 30 Sek.', how: 'Auf beiden Füßen auf die Zehenspitzen (halbe Höhe) und halten; später auf dem betroffenen Bein.', safety: 'Schmerz ≤ 3/10.' },
  { id: 'm_fusskreisen', area: 'wade', st: 'akut', reuse: true },
  { id: 'z_pumpe', n: 'Fußpumpe', en: 'Ankle Pumps Exercise', cat: 'mob', area: 'wade', st: 'akut', d: { t: 'reps', s: 1, reps: 20, noX: true }, dose: '20×', how: 'Sitzen oder liegen, Fußspitzen langsam zu dir ziehen und wieder wegstrecken, beide Füße.', safety: 'Nur so weit, wie es nicht sticht.' },
  { id: 'd_wade', area: 'wade', st: 'aufbau', reuse: true },
  { id: 'k_wadeexz', area: 'wade', st: 'aufbau', reuse: true },
  { id: 'z_soleus', n: 'Wadenheben im Sitzen', en: 'Seated Calf Raise Soleus', cat: 'strength', area: 'wade', st: 'aufbau', d: { t: 'reps', s: 1, reps: 15, sets: 3, noX: true }, dose: '3× 15', how: 'Sitzen, Knie 90°, Gewicht oder Rucksack auf den Oberschenkeln. Fersen heben, 3 Sek. absenken. Gut für die Achillessehne.', safety: 'Schmerz ≤ 3/10, am nächsten Morgen nicht schlimmer.' },
  /* Sprunggelenk/Fuß */
  { id: 'z_alphabet', n: 'Fuß-Alphabet', en: 'Ankle Alphabet Exercise', cat: 'mob', area: 'fuss', st: 'akut', d: { t: 'time', s: 2, sec: 60, noX: true }, dose: '1× A–Z', how: 'Sitzen oder liegen, mit dem großen Zeh das Alphabet in die Luft schreiben.', safety: 'Kleine Buchstaben, wenn es zieht.' },
  { id: 'm_fusskreisen', area: 'fuss', st: 'akut', reuse: true },
  { id: 'z_fiso', n: 'Isometrisch Fuß', en: 'Isometric Ankle Inversion Eversion', cat: 'iso', area: 'fuss', st: 'akut', d: { t: 'time', s: 2, sec: 40, noX: true }, dose: 'je Richtung 5× 5 Sek.', how: 'Sitzen, Fußaußenseite gegen ein Tischbein drücken (30–50 %), dann die Innenseite. Der Fuß bewegt sich nicht.', safety: 'Schmerz ≤ 3/10.' },
  { id: 'm_kniewand', area: 'fuss', st: 'aufbau', reuse: true },
  { id: 'k_einbeinstand', area: 'fuss', st: 'aufbau', reuse: true },
  { id: 'z_band_ever', n: 'Fuß nach außen gegen Band', en: 'Resistance Band Ankle Eversion', cat: 'strength', area: 'fuss', st: 'aufbau', d: { t: 'reps', s: 2, reps: 15, sets: 2, noX: true }, dose: '2× 15', how: 'Sitzen, Band um den Vorfuß, Fuß langsam nach außen drehen und 3 Sek. zurück. Schützt vor erneutem Umknicken.', safety: 'Leichtes Band.' },
];
const ZW_OWN = ZW_EX.filter((x) => !x.reuse);
function zwEx(area, st) { return ZW_EX.filter((x) => x.area === area && x.st === st).map((x) => (x.reuse ? exById(x.id) : x)).filter(Boolean); }
function zwKey(area, side) { return side ? `${area}_${side}` : area; }
function zwName(a) { const A = ZW_AREAS[a.area]; return A ? `${A.n}${a.side ? (a.side === 'L' ? ' links' : ' rechts') : ''}` : a.area; }
function zwList(all = false) { return (S.settings.aches || []).filter((a) => all || !a.end); }
function zwPain(k, key) { const d = peekDay(k); const v = d && d.ache && d.ache[key]; return v && v.p != null ? v.p : null; }
function zwLastPain(a, k = todayKey()) { for (let i = 0; i < 21; i++) { const x = addDays(k, -i); if (x < a.since) break; const p = zwPain(x, a.key); if (p != null) return { k: x, p }; } return null; }
function zwStage(a, k = todayKey()) { const lp = zwLastPain(a, k); return lp && lp.p <= 3 ? 'aufbau' : 'akut'; }
function zwFlags(a, k = todayKey()) { const d = peekDay(k); return (d && d.ache && d.ache[a.key] && d.ache[a.key].flags) || []; }
/* Verlauf: Hinweis, wenn es nach 7–14 Tagen nicht besser wird */
function zwTrend(a, k = todayKey()) {
  const pts = []; for (let x = a.since; x <= k; x = addDays(x, 1)) { const p = zwPain(x, a.key); if (p != null) pts.push({ k: x, p }); }
  const days = daysBetween(a.since, k) + 1;
  const first = pts[0], last = pts[pts.length - 1];
  let note = null;
  if (days >= 14 && last && last.p >= 3) note = 'Seit 2 Wochen nicht deutlich besser – lass es ärztlich oder physiotherapeutisch abklären.';
  else if (days >= 7 && pts.length >= 2 && last.k > first.k && last.p >= first.p) note = 'Seit einer Woche keine Besserung – wenn es so bleibt, abklären lassen.';
  const free = pts.slice(-3).length === 3 && pts.slice(-3).every((x) => x.p === 0);
  return { pts, days, note, free };
}
/* Schritte für den Timer: bei einer Seite nur diese Seite, sonst beide */
function zwSteps(a, st) {
  const steps = [];
  zwEx(a.area, st).forEach((ex, idx) => {
    const d = ex.d; if (!d || d.t === 'info') return;
    const sides = d.s === 2 ? (a.side && !ex.sideNames ? [a.side] : ['L', 'R']) : [null];
    const sets = d.sets || 1, val = d.t === 'time' ? d.sec : d.reps;
    for (let s = 0; s < sets; s++) for (const side of sides) steps.push({ ex: ex.id, idx, grp: null, side, set: s + 1, sets, type: d.t, sec: d.t === 'time' ? val : null, reps: d.t === 'reps' ? val : null, label: ex.labels ? ex.labels[s] || null : null, alt: !!d.alt, sideName: side ? (ex.sideNames ? ex.sideNames[side === 'L' ? 0 : 1] : side === 'L' ? 'Links' : 'Rechts') : null });
  });
  return steps;
}
function zwStart(key) {
  const a = zwList().find((x) => x.key === key); if (!a) return;
  const st = zwStage(a), k = todayKey();
  timerStart(null, { steps: zwSteps(a, st), name: `${zwName(a)} (${st === 'akut' ? 'sanft' : 'Aufbau'})`, noSave: true, noExtra: true, onDone: () => { mutDay(k, (d) => { d.ache = d.ache || {}; d.ache[a.key] = { ...(d.ache[a.key] || {}), done: true }; }); } });
}
/* ---------- Oberfläche: Knie & Mobility → Zwickt's ---------- */
function vZwick() {
  const k = ui.date, list = zwList();
  let h = dateBar(k);
  h += '<p class="sec-sub">Das Knie bleibt der Schwerpunkt. Zwickt es woanders, wähl die Stelle: Die App schlägt sanfte Übungen passend zum Schmerz vor und verfolgt den Verlauf.</p>';
  for (const a of list) h += zwCard(a, k, true);
  h += `<button class="btn${list.length ? '' : ' is-accent'}" data-a="zw-new">${icon('plus')}Stelle hinzufügen</button>`;
  const old = zwList(true).filter((a) => a.end).slice(-5).reverse();
  if (old.length) h += `<h5>Abgeschlossen</h5><div class="list">${old.map((a) => `<div class="row is-static"><span class="row-main"><b>${esc(zwName(a))}</b><small>${esc(shortDate(a.since))} – ${esc(shortDate(a.end))}${a.cause ? ' · ' + esc(a.cause) : ''}</small></span></div>`).join('')}</div>`;
  h += `<section class="sec"><div class="sec-head"><h2>Regeln</h2></div><ul class="wish-list"><li>Schmerz bei den Übungen bis 3 von 10 ist okay. Am nächsten Morgen darf es nicht schlimmer sein – sonst eine Stufe zurück.</li><li>Akut (ab 4/10): bewegen im schmerzfreien Bereich und isometrisch anspannen, nicht dehnen.</li><li>Ab 3/10 und darunter: leicht dehnen (Zug 3–5 von 10) und vorsichtig kräftigen.</li><li>Beim BJJ die Stelle schonen: früh abklopfen, Partner Bescheid geben, keine Hebel auf die Stelle.</li><li>Warnzeichen oder keine Besserung nach 1–2 Wochen: ärztlich oder physiotherapeutisch abklären.</li></ul></section>`;
  return h;
}
function zwCard(a, k, full) {
  const p = zwPain(k, a.key), st = zwStage(a, k), fl = zwFlags(a, k), tr = zwTrend(a, k), ex = zwEx(a.area, st);
  const done = !!((peekDay(k) || {}).ache || {})[a.key] && !!peekDay(k).ache[a.key].done;
  const min = Math.max(3, Math.round(zwSteps(a, st).reduce((s, x) => s + stepSec(x), 0) / 60 + ex.length * 0.2));
  let h = `<section class="card zw-card"><div class="sec-head"><h2>${esc(zwName(a))}</h2><span class="count">seit ${esc(shortDate(a.since))}${a.cause ? ' · ' + esc(a.cause) : ''}</span></div>`;
  h += `<p class="flabel-s">Schmerz heute (0 = keiner, 10 = stärkster)</p>${scale0('zw-pain', p, k, ` data-key="${a.key}"`)}`;
  h += `<div class="chips chips-tight flag-chips"><span class="hint">Bemerkt:</span>${ZW_FLAGS.map((f) => `<button class="chip chip-xs${fl.includes(f) ? ' is-on is-red' : ''}" data-a="zw-flag" data-key="${a.key}" data-v="${esc(f)}" data-date="${k}">${esc(f)}</button>`).join('')}</div>`;
  if (fl.length) h += `<div class="banner is-red">${icon('octagon-alert')}<div><b>Warnzeichen: ${esc(fl.join(', '))}</b><span>${esc(ZW_AREAS[a.area].warn)} Bis dahin nur schmerzfrei bewegen, nicht dehnen und im Training schonen.</span></div></div>`;
  else if (p != null && p >= 7) h += `<div class="banner is-warn">${icon('triangle-alert')}<div><b>Starker Schmerz (${p}/10)</b><span>Heute nur ganz sanft bewegen und schonen. Bleibt es so stark oder kommt Schwellung dazu, ärztlich abklären lassen.</span></div></div>`;
  if (tr.note && !fl.length) h += `<div class="banner is-warn">${icon('triangle-alert')}<div><span>${esc(tr.note)}</span></div></div>`;
  h += `<div class="zw-stage st-${st}"><b>${st === 'akut' ? 'Stufe 1: sanft bewegen und anspannen' : 'Stufe 2: dehnen und aufbauen'}</b><small>${st === 'akut' ? 'Schmerz ab 4 oder noch kein Wert: kein Dehnen, nur schmerzfreie Bewegung und leichte Spannung (30–50 %).' : 'Schmerz höchstens 3: Zug beim Dehnen 3–5 von 10, beim Kräftigen leicht anfangen.'}</small></div>`;
  if (full) h += `<div class="list">${ex.map((e) => { const open = ui.exp.has('zw:' + a.key + e.id); return `<div class="zw-ex${open ? ' is-open' : ''}"><button class="row" data-a="expand" data-key="zw:${a.key}${e.id}"><span class="row-main"><b>${esc(e.n)}</b><small>${esc(e.dose)}</small></span>${icon(open ? 'chevron-up' : 'chevron-down', 'row-ic')}</button>${open ? `<div class="zw-how"><p>${esc(e.how)}</p>${e.safety ? `<p class="hint">${icon('shield-alert')} ${esc(e.safety)}</p>` : ''}<a class="link-btn" href="${esc(exVideo(e))}" target="_blank" rel="noopener">${icon('play')} Video suchen</a></div>` : ''}</div>`; }).join('')}</div>`;
  h += `<div class="row-btns"><button class="pill-btn is-accent" data-a="zw-start" data-key="${a.key}">${icon('play')}${done ? 'Nochmal' : 'Übungen starten'} (~${min} Min.)</button>${done ? `<span class="est is-ok">${icon('check')} heute gemacht</span>` : `<button class="pill-btn" data-a="zw-done" data-key="${a.key}" data-date="${k}">${icon('check')}Ohne Timer gemacht</button>`}${full ? `<button class="pill-btn is-ghost" data-a="zw-end" data-key="${a.key}">Wieder gut</button>` : ''}</div>`;
  if (tr.free) h += `<p class="hint">3 Tage schmerzfrei – „Wieder gut“ antippen, dann verschwindet die Stelle von Heute.</p>`;
  if (full && tr.pts.length >= 2) h += `<div class="zw-trend">${tr.pts.slice(-14).map((x) => `<i style="height:${Math.max(3, x.p * 4)}px" class="${x.p >= 4 ? 'hi' : x.p >= 1 ? 'mid' : 'lo'}" title="${esc(shortDate(x.k))}: ${x.p}"></i>`).join('')}<span>Verlauf (letzte ${Math.min(14, tr.pts.length)} Einträge)</span></div>`;
  return h + '</section>';
}
/* Heute: aktive Stellen kompakt, nach BJJ die Frage, ob etwas zwickt */
function zwTodayCard(k = todayKey()) {
  let h = '';
  const list = zwList();
  for (const a of list) {
    const p = zwPain(k, a.key);
    h += `<div class="banner zw-banner">${icon('hand')}<div><b>${esc(zwName(a))}${p != null ? `: ${p}/10` : ''}</b><span>${p == null ? 'Wie fühlt es sich heute an?' : zwStage(a, k) === 'akut' ? 'Sanft bewegen und anspannen, nicht dehnen.' : 'Leicht dehnen und aufbauen.'}</span></div><button class="pill-btn sm" data-a="zw-open" data-key="${a.key}">${p == null ? 'Eintragen' : 'Übungen'}</button></div>`;
  }
  const y = peekDay(addDays(k, -1)), d = peekDay(k) || {};
  if (y && (y.trainings || []).some((t) => t.type === 'BJJ') && !d.bjjOk && !list.some((a) => a.since === k)) h += `<div class="banner">${icon('hand')}<div><b>Gestern BJJ – zwickt etwas?</b><span>Schulter, Ellenbogen, Finger, Nacken … kurz eintragen, dann gibt es passende Übungen.</span></div><div class="row-btns"><button class="pill-btn sm" data-a="zw-bjj-ok" data-date="${k}">Alles gut</button><button class="pill-btn sm is-accent" data-a="zw-new" data-cause="BJJ">Ja</button></div></div>`;
  return h;
}
function sheetZwNew(cause) {
  ui.sheet = { type: 'zw-new', area: null, side: null, cause: cause || '' };
  renderZwNew();
}
function renderZwNew() {
  const s = ui.sheet;
  openSheet(`<h3 class="sheet-title">Wo zwickt es?</h3>
    <div class="chips">${Object.entries(ZW_AREAS).map(([id, A]) => `<button class="chip chip-sm${s.area === id ? ' is-on' : ''}" data-a="zw-area" data-v="${id}">${esc(A.n)}</button>`).join('')}</div>
    ${s.area && ZW_AREAS[s.area].side ? `<h5>Seite</h5><div class="chips">${[['L', 'Links'], ['R', 'Rechts']].map(([v, n]) => `<button class="chip chip-sm${s.side === v ? ' is-on' : ''}" data-a="zw-side" data-v="${v}">${n}</button>`).join('')}</div>` : ''}
    <h5>Wodurch? (optional)</h5><div class="chips">${['BJJ', 'Gym', 'Laufen', 'Schlaf/Haltung', 'Unklar'].map((c) => `<button class="chip chip-sm${s.cause === c ? ' is-on' : ''}" data-a="zw-cause" data-v="${c}">${c}</button>`).join('')}</div>
    <div class="sheet-acts"><button class="btn is-accent" data-a="zw-save" ${!s.area || (ZW_AREAS[s.area].side && !s.side) ? 'disabled' : ''}>Hinzufügen</button><button class="btn is-ghost" data-a="sheet-close">Abbrechen</button></div>`);
}
Object.assign(A, {
  'zw-new': (el) => sheetZwNew(el && el.dataset ? el.dataset.cause : ''),
  'zw-area': (el) => { ui.sheet.area = el.dataset.v; if (!ZW_AREAS[el.dataset.v].side) ui.sheet.side = null; renderZwNew(); },
  'zw-side': (el) => { ui.sheet.side = el.dataset.v; renderZwNew(); },
  'zw-cause': (el) => { ui.sheet.cause = ui.sheet.cause === el.dataset.v ? '' : el.dataset.v; renderZwNew(); },
  'zw-save': () => {
    const s = ui.sheet; if (!s || !s.area) return;
    const key = zwKey(s.area, ZW_AREAS[s.area].side ? s.side : null);
    const aches = S.settings.aches = (S.settings.aches || []).filter((a) => !(a.key === key && !a.end));
    aches.push({ key, area: s.area, side: ZW_AREAS[s.area].side ? s.side : null, since: todayKey(), cause: s.cause || '' });
    if (s.cause === 'BJJ') mutDay(todayKey(), (d) => { d.bjjOk = true; });
    saveSettings(false); closeSheet(); ui.sub.knie = 'zwick'; go('knie', { date: todayKey(), scrollTop: true }); toast(`${zwName(aches[aches.length - 1])} hinzugefügt – Schmerz eintragen`);
  },
  'zw-pain': (el) => { const k = curDate(el), key = el.dataset.key, v = Number(el.dataset.v); mutDay(k, (d) => { d.ache = d.ache || {}; const cur = d.ache[key] || {}; d.ache[key] = { ...cur, p: cur.p === v ? null : v }; }); render(); },
  'zw-flag': (el) => { const k = curDate(el), key = el.dataset.key, f = el.dataset.v; mutDay(k, (d) => { d.ache = d.ache || {}; const cur = d.ache[key] || {}; const fl = new Set(cur.flags || []); if (fl.has(f)) fl.delete(f); else fl.add(f); d.ache[key] = { ...cur, flags: [...fl] }; }); render(); },
  'zw-start': (el) => zwStart(el.dataset.key),
  'zw-done': (el) => { const k = curDate(el), key = el.dataset.key; mutDay(k, (d) => { d.ache = d.ache || {}; d.ache[key] = { ...(d.ache[key] || {}), done: true }; }); render(); toast('Abgehakt'); },
  'zw-end': (el) => { const a = (S.settings.aches || []).find((x) => x.key === el.dataset.key && !x.end); if (!a) return; a.end = todayKey(); saveSettings(); toast(`${zwName(a)}: wieder gut`); },
  'zw-open': () => { ui.sub.knie = 'zwick'; go('knie', { date: todayKey(), scrollTop: true }); },
  'zw-bjj-ok': (el) => { mutDay(curDate(el), (d) => { d.bjjOk = true; }); render(); toast('Gut so'); },
});
/* Mitteilungen (To-dos & Checks): Schmerz eintragen, Übungen, Frage nach dem BJJ */
function pushZw(k, r, d, add) {
  const list = zwList();
  const open = list.filter((a) => zwPain(k, a.key) == null);
  if (open.length) add('todo', r.wake + 40, 'zw-p', open.length === 1 ? `${zwName(open[0])}: wie ist es heute?` : `${open.length} Stellen: wie ist es heute?`, 'Schmerz 0–10 eintragen, dann passen die Übungen dazu.', '#zwick');
  const todo = list.filter((a) => !((d.ache || {})[a.key] || {}).done);
  if (todo.length) add('todo', Math.min(18 * 60, r.bed - 180), 'zw-u', `Übungen: ${todo.map(zwName).join(', ')}`, 'Ein paar Minuten, sanft und schmerzfrei – das hilft beim Heilen mehr als Schonen.', '#zwick');
  const y = peekDay(addDays(k, -1));
  if (y && (y.trainings || []).some((t) => t.type === 'BJJ') && !d.bjjOk) add('todo', r.wake + 30, 'zw-bjj', 'Gestern BJJ – zwickt etwas?', 'Antippen und kurz eintragen, dann gibt es passende Übungen.', '#zwick');
}
function zwReportLine(ws) {
  const keys = weekKeys(ws);
  const list = zwList(true).filter((a) => a.since <= keys[6] && (!a.end || a.end >= ws));
  if (!list.length) return '';
  return 'Beschwerden (Zwickt’s): ' + list.map((a) => { const ps = keys.map((x) => zwPain(x, a.key)).filter((v) => v != null); const ex = keys.filter((x) => ((peekDay(x) || {}).ache || {})[a.key] && peekDay(x).ache[a.key].done).length; return `${zwName(a)} seit ${shortDate(a.since)}${a.cause ? ` (${a.cause})` : ''}: Schmerz ${ps.length ? `${ps[0]} → ${ps[ps.length - 1]}` : '–'}, Übungen an ${ex} Tagen${a.end ? `, wieder gut seit ${shortDate(a.end)}` : ''}`; }).join(' · ');
}
/* Training: Hinweis, solange eine Stelle aktiv ist */
function zwTrainHint(k) {
  const list = zwList(); if (!list.length) return '';
  const parts = list.map((a) => { const lp = zwLastPain(a, k); return `${zwName(a)}${lp ? ` (${lp.p}/10)` : ''}`; });
  const hi = list.some((a) => { const lp = zwLastPain(a, k); return lp && lp.p >= 4; }) || list.some((a) => zwFlags(a, k).length);
  return `<div class="banner${hi ? ' is-warn' : ''}">${icon('hand')}<div><b>Zwickt: ${esc(parts.join(', '))}</b><span>${hi ? 'Übungen, die dort wehtun, heute weglassen oder deutlich leichter machen. Beim BJJ: Partner Bescheid geben, früh abklopfen, keine Hebel auf die Stelle.' : 'Trainieren ist okay, solange der Schmerz bei 3/10 oder darunter bleibt und am nächsten Morgen nicht schlimmer ist.'}</span></div><button class="pill-btn sm" data-a="zw-open">Übungen</button></div>`;
}
