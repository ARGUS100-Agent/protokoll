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
/*icons: dumbbell play check triangle-alert octagon-alert info chevron-down chevron-up zap trending-up trending-down minus pencil sparkles footprints timer plus*/
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
  /* 2.15 (Wunsch vom 18.11.2026): ergänzt, nicht getauscht. lv: was sich je Stufe der Wochen-Steigerung ändert */
  { id: 'a_tke', n: 'Knie strecken gegen Band', en: 'Terminal Knee Extension Band', cat: 'strength', areas: ['vorn'], need: 'langes Band', d: { t: 'reps', s: 2, reps: 15, sets: 3 }, dose: '3 × 15 je Bein, oben 2 Sek. halten',
    how: 'Langes Band (ca. 1–2 m) am Power Tower auf Kniehöhe festmachen, die Schlaufe hinten um das Knie legen und so weit zurückgehen, bis das Band spannt. Aus leicht gebeugtem Knie (ca. 30°) das Knie gegen den Zug ganz strecken, Oberschenkel 2 Sek. fest anspannen, langsam nachgeben. Die Ferse bleibt am Boden. Ohne langes Band: im Sitzen eine Handtuchrolle unter das Knie, das Knie 5 Sek. fest nach unten drücken.',
    benefit: 'Übt die letzten Grad der Streckung. Wer das Bein wegen Schmerzen nicht mehr ganz streckt, verliert oft genau dort Kraft im Oberschenkel – die Übung holt sie mit wenig Last zurück.', mistake: 'Ins Hohlkreuz gehen oder das Knie nach hinten durchdrücken.', safety: 'Nur so weit strecken, wie es schmerzarm geht (bis 3/10), nicht überstrecken.', prog: 'Stärkeres Band, weiter weg stehen, 3 Sek. halten.',
    lv: ['', '3 Sek. oben halten', 'stärkeres Band', { t: 'stärkeres Band, 3 Sek. halten', reps: 3 }, { t: 'stärkeres Band, weiter weg stehen', reps: 5 }] },
  { id: 'a_spanish', n: 'Spanish Squat', en: 'Spanish Squat Isometric', cat: 'strength', areas: ['vorn'], need: 'langes Band', d: { t: 'time', s: 1, sec: 45, sets: 3, rest: 60, noX: true }, dose: '3 × 45 Sek., 1 Min. Pause',
    how: 'Ein langes, starkes Band oder einen festen Gurt um den Power Tower auf Kniehöhe, die Schlaufe hinter beide Knie. Zurücklehnen, bis das Band spannt – die Unterschenkel bleiben senkrecht. Wie auf einen Stuhl nach hinten setzen bis ca. 60–90° Kniebeugung, Oberkörper aufrecht, halten. Anstrengung etwa 7 von 10. Ohne Band: stattdessen einen weiteren Satz Wandsitzen.',
    benefit: 'Hält Oberschenkel und Patellasehne bei senkrechten Unterschenkeln unter hoher Spannung; je aufrechter der Oberkörper, desto mehr Last auf der Sehne. Wird bei Patellasehnen-Beschwerden oft eingesetzt, belegt ist das aber nur mit kleinen Mess-Studien.', mistake: 'Knie wandern nach vorn oder der Oberkörper kippt nach vorn.', safety: 'Bis 5/10 Schmerz ist okay, wenn er am nächsten Morgen wieder auf dem Ausgangswert ist.', prog: 'Tiefer, Kettlebell vor der Brust.',
    lv: ['', 'tiefer: Knie ca. 80–90°', '12 kg vor der Brust', '2 × 12 kg vor der Brust', { t: '2 × 12 kg, je Satz 10 Sek. länger', sec: 10 }] },
  { id: 'a_poliquin', n: 'Poliquin Step-up', en: 'Poliquin Step Up', cat: 'strength', areas: ['vorn'], d: { t: 'reps', s: 2, reps: 10, sets: 3 }, dose: '3 × 10 je Bein, 3 Sek. runter',
    how: 'Seitlich auf eine niedrige Stufe (10–15 cm) stellen, die Ferse des Standbeins steht erhöht (2–3 cm, z. B. auf einem Buch). Das freie Bein in 3 Sek. Richtung Boden absenken und nur antippen, dann mit dem Standbein wieder ganz strecken. Das Knie darf über die Zehen, das Becken bleibt gerade.',
    benefit: 'Kräftigt den vorderen Oberschenkel bis in die volle Streckung, im Stand und mit wenig Gewicht. Eigene Studien gibt es dazu nicht; das Prinzip – Oberschenkel im schmerzarmen Bereich kräftigen – ist gut belegt.', mistake: 'Mit dem unteren Bein abstoßen, Knie fällt nach innen.', safety: 'Bis 3/10; bei Druck unter der Kniescheibe eine niedrigere Stufe.', prog: 'Höhere Stufe, Kettlebell in der Hand, Schrägbrett.',
    lv: ['', 'Stufe etwas höher (15–20 cm)', '12 kg in der Hand', '2 × 12 kg', '2 × 12 kg, unten 1 Sek. Pause'] },
  /* Ersatz ohne langes Band (2.16.1): Dominik hat nur die kurzen Loop Bands */
  { id: 'a_quadset', n: 'Oberschenkel anspannen mit Handtuchrolle', en: 'Quad Set Towel Roll', cat: 'strength', areas: ['vorn'], d: { t: 'reps', s: 2, reps: 10, sets: 3 }, dose: '3 × 10 je Bein, je 5 Sek. halten',
    how: 'Langsitz oder Rückenlage, eine Handtuchrolle unter das Knie. Das Knie fest nach unten in die Rolle drücken, sodass sich der Oberschenkel anspannt und die Ferse leicht abhebt, 5 Sek. halten, lösen. Ersatz für das Knie-Strecken gegen Band, solange kein langes Band da ist.',
    benefit: 'Übt die volle Streckung und die Anspannung des vorderen Oberschenkels ohne Last – gerade wenn das Knie gerade nicht mehr ganz gestreckt wird.', mistake: 'Nur mit dem Po drücken oder die Luft anhalten.', safety: 'Nur bis zur schmerzarmen Streckung (bis 3/10).', prog: 'Länger halten, dann Knie strecken gegen ein langes Band.',
    lv: ['', '8 Sek. halten', '10 Sek. halten', { t: '10 Sek. halten', reps: 2 }, { t: '10 Sek. halten, Ferse höher anheben', reps: 2 }] },
  { id: 'a_wandtief', n: 'Wandsitzen tief, Unterschenkel senkrecht', en: 'Deep Wall Sit Vertical Shins', cat: 'strength', areas: ['vorn'], d: { t: 'time', s: 1, sec: 45, sets: 2, rest: 60, noX: true }, dose: '2 × 45 Sek., Knie ca. 80–90°',
    how: 'Rücken an die Wand, die Füße so weit vorn, dass die Unterschenkel senkrecht stehen. Tiefer als beim normalen Wandsitzen heruntergleiten (Knie ca. 80–90°) und halten, Anstrengung etwa 7 von 10. Ersatz für den Spanish Squat, solange kein langes Band oder Gurt da ist.',
    benefit: 'Hält den Oberschenkel in tieferer Beugung unter Spannung – wie der Spanish Squat, nur mit der Wand statt dem Band. Wandsitzen bei 90° stand auch im Sehnenprogramm von Breda 2021.', mistake: 'Füße zu nah an der Wand, dann wandern die Knie nach vorn.', safety: 'Bis 5/10 Schmerz, wenn er am nächsten Morgen wieder auf dem Ausgangswert ist; bei Druck unter der Kniescheibe weniger tief.', prog: 'Mit Kettlebell auf den Oberschenkeln, dann Spanish Squat mit langem Band.',
    lv: ['', '12 kg auf den Oberschenkeln', '2 × 12 kg auf den Oberschenkeln', { t: '2 × 12 kg, je Satz 10 Sek. länger', sec: 10 }, { t: '2 × 12 kg, je Satz 15 Sek. länger', sec: 15 }] },
  /* Knie-Block im Gym (2.15): Maschinen, je Phase siehe KB_PLAN */
  { id: 'b_iso', n: 'Beinstrecker isometrisch, einbeinig', en: 'Isometric Single Leg Extension', cat: 'gym', areas: ['vorn'], d: { t: 'time', s: 2, sec: 45, sets: 5, rest: 60 }, dose: '5 × 45 Sek. je Bein, Knie ca. 60°, ~70 % Kraft',
    how: 'Sitz so einstellen, dass das Knie auf Höhe der Drehachse liegt, Polster knapp über dem Knöchel. Ein Gewicht wählen, das du 45 Sek. halten kannst und danach noch etwa 2 weitere Sätze schaffen würdest (Anstrengung ca. 7 von 10). Mit einem Bein bis ca. 60° Kniebeugung anheben – der Unterschenkel zeigt schräg nach vorn unten – und dort halten. Beine abwechseln, das andere ruht.',
    benefit: 'Genau Stufe 1 aus der Patellasehnen-Studie: einbeinig, 60°, 5 × 45 Sek. bei ~70 % der Kraft, täglich möglich. Lindert bei vielen den Schmerz für eine Weile und baut Kraft auf, ohne dass sich das Gelenk bewegt.', mistake: 'Zu leicht (Anstrengung nur 3–4 von 10) oder mit dem ganzen Körper mitdrücken.', safety: 'Bis 3/10 Schmerz. Zieht es, den Winkel leicht ändern oder leichter.', prog: 'Mehr Gewicht, sobald die 45 Sek. sicher gehen – die App schlägt es vor.' },
  { id: 'b_hsr', n: 'Beinstrecker langsam, einbeinig', en: 'Heavy Slow Resistance Leg Extension', cat: 'gym', areas: ['vorn'], d: { t: 'reps', s: 2, reps: 12, sets: 3 }, dose: '3–4 Sätze je Bein, 3 Sek. hoch, 3 Sek. runter',
    how: 'Wie der normale Beinstrecker, aber einbeinig und langsam: 3 Sek. hoch, 3 Sek. runter, ohne Schwung. Bewegungsbereich so weit, wie es schmerzarm geht. Schwer: Die letzte Wiederholung geht gerade noch sauber.',
    benefit: 'Langsam und schwer (Heavy Slow Resistance): 3× pro Woche, Woche für Woche weniger Wiederholungen und mehr Gewicht (15 → 12 → 10 → 8 → 6). In einer Studie mit Patellasehnen-Beschwerden auch nach einem halben Jahr noch gut wirksam.', mistake: 'Zu schnell, Schwung am Ende.', safety: 'Bis 5/10 Schmerz, am nächsten Morgen nicht schlechter.', prog: 'Nächste Stufe: weniger Wiederholungen, mehr Gewicht.' },
  { id: 'b_press', n: 'Beinpresse einbeinig, langsam', en: 'Single Leg Press Slow Tempo', cat: 'gym', areas: ['vorn', 'huefte'], d: { t: 'reps', s: 2, reps: 12, sets: 3 }, dose: '3–4 Sätze je Bein, 3 Sek. runter, 3 Sek. hoch',
    how: 'Ein Fuß mittig auf die Platte, das Knie zeigt über den Fuß. In 3 Sek. bis ca. 90° Kniebeugung absenken, in 3 Sek. hochdrücken, oben nicht ganz durchstrecken. Das andere Bein steht neben der Platte.',
    benefit: 'Schwere, langsame Last für Oberschenkel und Sehne mit fester Führung – Teil des Programms von Kongsgaard 2009.', mistake: 'Knie fällt nach innen, Becken hebt sich vom Sitz.', safety: 'Bis 5/10; Tiefe nach Schmerz.', prog: 'Nächste Stufe: weniger Wiederholungen, mehr Gewicht.' },
  { id: 'b_curl', n: 'Beinbeuger liegend', en: 'Lying Leg Curl', cat: 'gym', areas: ['hinten'], d: { t: 'reps', s: 1, reps: 12, sets: 3 }, dose: '3 × 12–15, 2–3 Wdh. in Reserve',
    how: 'Polster knapp über der Ferse, die Hüfte bleibt auf der Bank. 1 Sek. hoch, 2–3 Sek. langsam runter.',
    benefit: 'Kräftigt die Beuger, die hinten innen und außen am Wadenbeinköpfchen ansetzen und das Knie von hinten stabilisieren.', mistake: 'Hüfte hebt ab, Schwung.', safety: 'Zieht es außen am Knie, weniger Gewicht oder einen kürzeren Bewegungsweg.', prog: 'Mehr Gewicht, wenn alle Sätze oben im Bereich sind.' },
  { id: 'b_calf', n: 'Wadenheben sitzend', en: 'Seated Calf Raise', cat: 'gym', areas: ['wade'], d: { t: 'reps', s: 1, reps: 15, sets: 3 }, dose: '3 × 12–15, unten 2 Sek. halten',
    how: 'Polster auf die Oberschenkel knapp über dem Knie, Fußballen auf die Kante. Ganz hochdrücken, langsam absenken, unten 2 Sek. in der Dehnung halten.',
    benefit: 'Kräftigt die Waden mit gebeugtem Knie – die Alternative, wenn stehendes Wadenheben mit gestrecktem Knie unter Last unangenehm ist.', mistake: 'Wippen ohne Pause unten.', safety: 'Keine.', prog: 'Mehr Gewicht, wenn alle Sätze oben im Bereich sind.' },
  { id: 'b_abd', n: 'Abduktoren-Maschine', en: 'Hip Abduction Machine', cat: 'gym', areas: ['huefte'], d: { t: 'reps', s: 1, reps: 15, sets: 3 }, dose: '3 × 12–15, außen 1 Sek. halten',
    how: 'Aufrecht sitzen, Rücken an der Lehne. Die Knie gegen die Polster nach außen drücken, 1 Sek. halten, in 2 Sek. zurück. Im Wechsel mit den Adduktoren ohne Pause dazwischen spart Zeit.',
    benefit: 'Kräftigt die seitliche Hüfte – in den Studien zu Schmerzen außen am Knie der häufigste wirksame Baustein.', mistake: 'Schwung, Oberkörper lehnt sich vor.', safety: 'Keine.', prog: 'Mehr Gewicht, wenn alle Sätze oben im Bereich sind.' },
  { id: 'b_add', n: 'Adduktoren-Maschine', en: 'Hip Adduction Machine', cat: 'gym', areas: ['add'], d: { t: 'reps', s: 1, reps: 15, sets: 3 }, dose: '3 × 12–15, innen 1 Sek. halten',
    how: 'Aufrecht sitzen, Polster an der Innenseite der Knie. Die Beine zusammendrücken, 1 Sek. halten, langsam öffnen – nur so weit, wie es in der Leiste angenehm ist.',
    benefit: 'Kräftigt die Innenseite, die das Knie von innen stabilisiert – im BJJ besonders wichtig.', mistake: 'Zu weit öffnen, Schwung.', safety: 'Bei Leistenschmerz kleinerer Bewegungsweg.', prog: 'Mehr Gewicht, wenn alle Sätze oben im Bereich sind.' },
];
KNEE_EX.push(...ATH_EX);
/* Stufen der Wochen-Steigerung für Übungen, bei denen mehr Last besser ist als mehr Zeit oder Wiederholungen */
const KP_LV = {
  a_wand60: ['', '12 kg auf den Oberschenkeln', '2 × 12 kg auf den Oberschenkeln', '2 × 12 kg, etwas tiefer (Knie ca. 70°)', { t: '2 × 12 kg, Knie ca. 70°, je Satz 10 Sek. länger', sec: 10 }],
  k_slrdl: ['', '12 kg in der Hand', { t: '12 kg in der Hand', reps: 2 }, '2 × 12 kg', '2 × 12 kg, 3 Sek. runter'],
  a_goblet: ['', '12 kg, unten 2 Sek. Pause', '2 × 12 kg (oder 16–20 kg)', { t: '2 × 12 kg (oder 16–20 kg)', reps: 2 }, { t: 'schwerer, Fersen höher', reps: 2 }],
  a_stepup: ['', { t: '2 × 12 kg', reps: 2 }, 'höhere Stufe', { t: 'höhere Stufe', reps: 2 }, 'höhere Stufe, 4 Sek. runter'],
};
for (const [id, lv] of Object.entries(KP_LV)) { const e = KNEE_EX.find((x) => x.id === id); if (e) e.lv = lv; }
const ATH_TYPES = { A: 'Sehne & Kraft', B: 'Hüfte & Seite', C: 'Athletik & Kontrolle' };
const ATH_NEXT = { A: 'B', B: 'C', C: 'A' };
function athStr(k) { return kneeDay(peekDay(k)).str || null; }
function athLegsDay(k) { const tpl = weekTpl(weekday(k)); return !!(tpl.gym && gymDay(tpl.gym) && gymDay(tpl.gym).legs) || dayDone(k).legs; }
/* Belastung steuern (2.15): Halteübungen gehen täglich (Breda 2021, Stufe 1), schwere Übungen ab Phase 2 nur jeden
   zweiten Tag – nach starker Belastung baut die Sehne 1–2 Tage lang erst Kollagen ab, danach bis zu 3 Tage mehr auf
   (Magnusson 2010). Deshalb zu Hause keine Einheit A am Beintag oder nach dem Gym-Knie-Block, ab Phase 2 auch nicht
   am Tag nach schwerer Belastung. */
function athHeavyWhy(k = todayKey()) {
  if (athLegsDay(k)) return { t: 'Heute Beintag', s: 'Zu Hause heute nicht Einheit A – die schwere Belastung bekommt das Knie schon im Gym.' };
  if (kbDone(k)) return { t: 'Knie-Block im Gym heute erledigt', s: 'Zu Hause heute B oder C, damit die Sehne nicht zweimal am Tag schwer belastet wird.' };
  if ((kneeCfg().phase || 1) >= 2) {
    const y = addDays(k, -1), ys = athStr(y);
    if (dayDone(y).legs || kbDone(y) || (ys && ys.done && ys.t === 'A')) return { t: 'Gestern schwere Belastung', s: 'Ab Phase 2 kommt schweres Training nur jeden zweiten Tag – heute B oder C.' };
  }
  return null;
}
/* Einheit des Tages: gewählt, sonst die nächste nach der letzten erledigten; nicht A, wenn das Knie heute schon schwer belastet wird */
function athType(k = todayKey()) {
  const s = athStr(k);
  if (s && s.t && ATH_TYPES[s.t]) return s.t;
  let last = null;
  for (let i = 1; i <= 14 && !last; i++) { const x = athStr(addDays(k, -i)); if (x && x.done && x.t) last = x.t; }
  let t = last ? ATH_NEXT[last] : 'A';
  if (t === 'A' && athHeavyWhy(k)) t = 'B';
  return t;
}
/* Leichter Tag nach dem Schmerz-Monitoring: Morgenschmerz deutlich höher oder letzte Einheit (auch Gym-Knie-Block) über 5/10 */
function athLight(k = todayKey()) {
  const kn = kneeDay(peekDay(k)), am = kneeAm(k);
  if ((kn.flags || []).length) return { stop: true, why: `Warnzeichen: ${kn.flags.join(', ')}` };
  let prev = null;
  for (let i = 1; i <= 3 && prev == null; i++) prev = kneeAm(addDays(k, -i));
  let sp = null;
  for (let i = 0; i <= 2 && sp == null; i++) {
    const kk = addDays(k, -i), x = i ? athStr(kk) : null, gp = kbPains(kk);
    const v = [x && x.pain != null ? x.pain : null, ...gp].filter((p) => p != null);
    if (v.length) sp = Math.max(...v);
  }
  if (am != null && am >= 7) return { why: `Morgenschmerz ${am}/10` };
  if (am != null && prev != null && am - prev >= 2) return { why: `Morgenschmerz ${am}/10 (vorher ${prev}/10)` };
  if (sp != null && sp > 5) return { why: `letzte Einheit ${sp}/10` };
  return null;
}
/* ---------- Steigerung von Woche zu Woche (2.15) ----------
   Jeden Montag prüft die App die Vorwoche: genug Einheiten, Schmerz in den Einheiten höchstens 5/10, Morgenschmerz nicht
   gestiegen, keine Warnzeichen → eine Stufe höher. Sonst halten, bei deutlich mehr Schmerz eine Stufe zurück
   (Schmerz-Monitoring nach Silbernagel). Neue Phase → wieder Stufe 0, weil die Übungen schwerer werden. */
const KP_MAX = { 1: 4, 2: 4, 3: 3 };
function kpLevel(k = todayKey()) {
  const c = kneeCfg(), p = c && c.prog;
  if (!p || p.phase !== (c.phase || 1)) return 0;
  return clamp(Number(p.lvl) || 0, 0, KP_MAX[p.phase] || 3);
}
function kpEval(ws) {
  let units = 0;
  const sp = [], am = [], flags = new Set();
  for (const k of weekKeys(ws)) {
    const d = peekDay(k);
    if (!d) continue;
    const s = d.knee && d.knee.str;
    if (s && s.done) { units++; if (s.pain != null) sp.push(s.pain); }
    for (const t of d.trainings || []) if (kbDoneT(t)) { units++; if (t.gym.knee.pain != null) sp.push(t.gym.knee.pain); }
    if (d.knee && d.knee.am != null) am.push(d.knee.am);
    for (const f of (d.knee && d.knee.flags) || []) flags.add(f);
  }
  const am0 = weekKeys(addDays(ws, -7)).map(kneeAm).filter((v) => v != null);
  const mA = am.length ? mean(am) : null, mA0 = am0.length ? mean(am0) : null;
  const rise = am.length >= 3 && am0.length >= 3 ? mA - mA0 : null;
  const maxS = sp.length ? Math.max(...sp) : null, maxA = am.length ? Math.max(...am) : null;
  const f = { units, maxS, maxA, mA, mA0, rise, flags: [...flags] };
  const r = (st, kind, why) => ({ st, kind, why, ...f });
  if (maxS != null && maxS >= 7) return r('down', 'pain', `Schmerz in den Einheiten bis ${maxS}/10 – eine Stufe zurück.`);
  if (maxA != null && maxA >= 7) return r('down', 'pain', `Morgenschmerz bis ${maxA}/10 – eine Stufe zurück.`);
  if (rise != null && rise >= 1.5) return r('down', 'pain', `Morgenschmerz deutlich gestiegen (Ø ${fmt(mA0, 1)} → ${fmt(mA, 1)}) – eine Stufe zurück.`);
  if (flags.size) return r('hold', 'flags', `Warnzeichen (${[...flags].join(', ')}) – Stufe gehalten. Erst ärztlich abklären lassen, dann weiter steigern.`);
  if (units < 3) return r('hold', 'units', `${units} ${units === 1 ? 'Einheit' : 'Einheiten'} – für eine Steigerung mindestens 3 pro Woche (zu Hause oder Gym-Knie-Block).`);
  if (!sp.length && !am.length) return r('hold', 'nodata', 'Keine Schmerzwerte – nach den Einheiten und im Morgen-Check eintragen, dann steigert die App.');
  if (maxS != null && maxS >= 6) return r('hold', 'pain', `Schmerz in den Einheiten bis ${maxS}/10 – für mehr höchstens 5/10.`);
  if (rise != null && rise >= 0.5) return r('hold', 'pain', `Morgenschmerz etwas gestiegen (Ø ${fmt(mA0, 1)} → ${fmt(mA, 1)}) – Stufe gehalten.`);
  return r('up', 'ok', `${units} Einheiten, Schmerz in den Einheiten ${maxS != null ? `höchstens ${maxS}/10` : 'nicht eingetragen'}${mA != null ? `, morgens Ø ${fmt(mA, 1)}/10` : ''} – das Knie verträgt mehr.`);
}
/* Einmal pro Woche auswerten (läuft beim Öffnen der App) */
function kpEnsure(k = todayKey()) {
  const c = kneeCfg();
  if (!c) return null;
  const ws = weekStart(k), ph = c.phase || 1;
  let p = c.prog, ch = false;
  if (!p || typeof p !== 'object') { p = c.prog = { phase: ph, lvl: 0, ws, since: ws, hist: [] }; ch = true; }
  if (p.phase !== ph) { p.hist = (p.hist || []).concat([{ ws, from: p.lvl || 0, to: 0, st: 'phase', why: `${(KNEE_PHASES.find((x) => x.id === ph) || {}).n || 'Neue Phase'} gestartet – die Übungen sind schwerer, deshalb wieder Stufe 0.` }]).slice(-30); p.phase = ph; p.lvl = 0; p.since = ws; p.ws = ws; ch = true; }
  if (!p.ws) { p.ws = ws; ch = true; }
  if (p.ws < ws) {
    const ev = addDays(ws, -7), r = kpEval(ev), from = clamp(Number(p.lvl) || 0, 0, KP_MAX[ph] || 3), max = KP_MAX[ph] || 3;
    const to = r.st === 'up' ? Math.min(max, from + 1) : r.st === 'down' ? Math.max(0, from - 1) : from;
    p.hist = (p.hist || []).concat([{ ws, ev, from, to, st: r.st, kind: r.kind, why: r.st === 'up' && from === max ? `${r.why} Höchste Stufe dieser Phase erreicht.` : r.why }]).slice(-30);
    p.lvl = to; p.ws = ws; ch = true;
  }
  if (ch) { markDirty('settings'); invalidate(); }
  return p;
}
/* Auswertung dieser Woche (vom Montag), falls vorhanden */
function kpLast(k = todayKey()) { const p = kneeCfg().prog; const h = p && (p.hist || []).slice(-1)[0]; return h && h.ws === weekStart(k) ? h : null; }
/* Dosis einer Übung auf der Stufe: mehr Last (lv), sonst länger halten bzw. mehr Wiederholungen; bei Band-Übungen ab
   Stufe 2 das stärkere Band. Keine zusätzlichen Sätze, damit die Einheit bei ca. 30 Min. bleibt. */
function kpItem(it, lvl) {
  const ex = exById(it.i);
  if (!ex || !lvl || ex.id === 'a_ergo') return it;
  const d = ex.d, o = { ...it }, L = Math.min(lvl, 4);
  if (ex.lv) {
    const raw = ex.lv[Math.min(L, ex.lv.length - 1)], x = typeof raw === 'string' ? { t: raw } : raw || {};
    if (x.t) o.lvT = x.t;
    if (x.sec && d.t === 'time') o.sec = (o.sec || d.sec) + x.sec;
    if (x.reps && d.t === 'reps') o.reps = (o.reps || d.reps) + x.reps;
  } else {
    if (d.t === 'time') o.sec = (o.sec || d.sec) + 5 * Math.min(L, 3);
    if (d.t === 'reps') o.reps = (o.reps || d.reps) + (ex.kg ? Math.min(L, 3) : ex.band ? 2 * Math.min(L, 2) : 2 * Math.min(L, 3));
    if (ex.band && L >= 2) o.lvT = 'stärkeres Band, wenn es leicht geht';
  }
  return o;
}
function kpChangeText(lvl) {
  if (!lvl) return 'Grundstufe der Phase.';
  const L = Math.min(lvl, 3);
  return `Halten +${5 * L} Sek., Wiederholungen +${2 * L} (mit Gewicht +${L}, mit Band +${2 * Math.min(L, 2)}${L >= 2 ? ' und stärkeres Band' : ''}).`;
}
const kgF = (w) => fmt(w, w % 1 ? 1 : 0);
/* Ohne langes Band (Einstellung Knie → Langes Band): Ersatzübungen statt Knie strecken gegen Band und Spanish Squat */
const ATH_SWAP = { a_tke: 'a_quadset', a_spanish: 'a_wandtief' };
function athSwap(it) {
  const to = ATH_SWAP[it.i], ex = to && exById(to);
  if (!ex || kneeCfg().longBand) return it;
  const o = { ...it, i: to, from: it.i };
  if (ex.d.t === 'reps') { o.reps = ex.d.reps; delete o.sec; } else { o.sec = it.sec || ex.d.sec; delete o.reps; }
  return o;
}
function athItems(k = todayKey(), t = athType(k)) {
  const L = athLight(k), lvl = Math.max(0, kpLevel(k) - (L ? 1 : 0)); // leichter Tag: eine Stufe zurück
  let items = clone((kneePhase().days || {})[t] || []).filter((it) => exById(it.i)).map(athSwap).map((it) => kpItem(it, lvl));
  if (L) items = items.filter((it) => !exById(it.i).plyo).map((it) => (it.sets > 1 ? { ...it, sets: it.sets - 1 } : it));
  return items;
}
/* ---------- Knie-Block im Gym (2.15, Wunsch vom 18.11.2026) ----------
   Optional unten in jeder Gym-Einheit, zählt nicht zur Vollständigkeit der Einheit. Phase 1 isometrisch wie Stufe 1
   bei Breda 2021 (einbeinig, 60°, 5 × 45 Sek., ~70 %); ab Phase 2 langsam und schwer nach Kongsgaard 2009 (3× pro Woche,
   15RM → 12RM → 10RM → 8RM → 6RM) – je Stufe der Wochen-Steigerung ein Schritt. dup: im Training schon enthalten;
   ss: im Wechsel ohne Pause dazwischen (Beinbeuger + Waden, Ab- + Adduktoren), spart Zeit. */
const KB_PLAN = {
  1: [{ i: 'b_iso', sets: 5, sec: 45, rest: 60 }, { i: 'b_curl', sets: 3, rr: '12–15', dup: 'g_beinbeuger', ss: 1 }, { i: 'b_calf', sets: 3, rr: '12–15', dup: 'g_waden', ss: 1 }, { i: 'b_abd', sets: 3, rr: '12–15', ss: 2 }, { i: 'b_add', sets: 3, rr: '12–15', ss: 2 }],
  2: [{ i: 'b_hsr', hsr: true, dup: 'g_beinstrecker' }, { i: 'b_press', hsr: true }, { i: 'b_curl', sets: 3, rr: '10–12', dup: 'g_beinbeuger', ss: 1 }, { i: 'b_calf', sets: 3, rr: '10–12', dup: 'g_waden', ss: 1 }, { i: 'b_abd', sets: 3, rr: '10–12', ss: 2 }, { i: 'b_add', sets: 3, rr: '10–12', ss: 2 }],
  3: [{ i: 'b_press', hsr: true }, { i: 'b_hsr', hsr: true, dup: 'g_beinstrecker' }, { i: 'b_curl', sets: 3, rr: '8–10', dup: 'g_beinbeuger', ss: 1 }, { i: 'b_calf', sets: 3, rr: '10–12', dup: 'g_waden', ss: 1 }, { i: 'b_abd', sets: 2, rr: '10–12', ss: 2 }, { i: 'b_add', sets: 2, rr: '10–12', ss: 2 }],
};
const KB_HSR = { 2: [[3, 15], [3, 12], [3, 12], [4, 10], [4, 10]], 3: [[4, 8], [4, 8], [4, 6], [4, 6]] };
function kbPlanItems(k = todayKey(), day = null) {
  const ph = kneeCfg().phase || 1, lvl = kpLevel(k), L = athLight(k), gd = day ? gymDay(day) : null;
  const own = new Set(gd ? gd.ex.map((e) => e.id) : []);
  const hs = athStr(k), homeA = !!(hs && hs.done && hs.t === 'A');
  const items = [], skipped = [];
  for (const p of KB_PLAN[ph] || KB_PLAN[1]) {
    const ex = exById(p.i);
    if (!ex) continue;
    if (p.dup && own.has(p.dup)) { skipped.push(p.i); continue; }
    if (p.hsr && homeA) { skipped.push(p.i); continue; } // ab Phase 2: heute schon die schwere Einheit A
    const it = { i: p.i, sets: p.sets || ex.d.sets || 3, side: ex.d.s === 2 };
    if (ex.d.t === 'time') { it.sec = p.sec || ex.d.sec; it.rest = p.rest || ex.d.rest || 60; }
    else if (p.hsr) { const lad = KB_HSR[ph] || KB_HSR[2], [s, r] = lad[Math.min(lvl, lad.length - 1)]; it.sets = s; it.rr = String(r); it.hsr = true; }
    else it.rr = p.rr || String(ex.d.reps);
    if (homeA && p.i === 'b_iso') { it.sets = 3; it.note = 'heute schon Einheit A: 3 statt 5 Sätze'; }
    if (L && it.sets > 1) it.sets -= 1;
    if (p.ss) it.ss = p.ss;
    items.push(it);
  }
  for (const it of items) { const o = it.ss && items.find((x) => x !== it && x.ss === it.ss); if (o) it.pair = o.i; else delete it.ss; }
  return { items, skipped, lvl, ph, light: !!L };
}
function kbDose(it) {
  if (it.sec) return `${it.sets} × ${it.sec} Sek.${it.side ? ' je Bein' : ''} · Knie ca. 60° · ~70 % Kraft${it.note ? ' · ' + it.note : ''}`;
  if (it.hsr) return `${it.sets} × ${it.rr}${it.side ? ' je Bein' : ''} · 3 Sek. hoch, 3 Sek. runter · schwer`;
  return `${it.sets} × ${it.rr}${it.side ? ' je Bein' : ''}${it.pair && exById(it.pair) ? ` · im Wechsel mit ${exById(it.pair).n.replace('-Maschine', '')}` : ''}`;
}
function kbMin(items) {
  const seen = new Set();
  const s = items.reduce((a, it) => {
    const work = it.sec ? it.sec * (it.side ? 2 : 1) + 5 : kxRange(it.rr)[1] * (it.hsr ? 6 : 3.5) * (it.side ? 2 : 1);
    const rest = it.sec ? it.rest || 60 : it.hsr ? 90 : it.pair && seen.has(it.pair) ? 10 : 60; // im Wechsel: nur kurz umsetzen
    seen.add(it.i);
    return a + it.sets * (work + rest);
  }, 0);
  return Math.max(5, Math.round(s / 60 / 5) * 5);
}
function kbDoneT(t) {
  const kb = t && t.gym && t.gym.knee;
  if (!kb || !kb.on) return false;
  const tot = (kb.items || []).reduce((a, x) => a + (x.sets || 0), 0);
  const done = (kb.items || []).reduce((a, x) => a + (((kb.ex || {})[x.i] || {}).s || []).filter((s) => s.d).length, 0);
  return tot > 0 && done >= tot * 0.5;
}
function kbDone(k) { const d = peekDay(k); return !!(d && (d.trainings || []).some(kbDoneT)); }
function kbPains(k) { const d = peekDay(k); return ((d && d.trainings) || []).filter(kbDoneT).map((t) => t.gym.knee.pain).filter((v) => v != null); }
/* Verlauf einer Block-Übung (neueste zuerst) */
function kbHistory(id, beforeKey, excludeId) {
  const out = [];
  for (let i = 0; i < 120; i++) {
    const k = addDays(beforeKey, -i), d = peekDay(k);
    if (!d) continue;
    for (const t of (d.trainings || []).slice().reverse()) {
      const kb = t.gym && t.gym.knee;
      if (!kb || !kb.on || t.id === excludeId || !(kb.ex || {})[id]) continue;
      const sets = (kb.ex[id].s || []).filter((s) => s.d || s.w != null).map((s) => ({ w: s.w != null ? Number(s.w) : null, r: s.r != null ? Number(s.r) : null, sec: s.sec != null ? Number(s.sec) : null, d: !!s.d }));
      const it = (kb.items || []).find((x) => x.i === id) || {};
      if (sets.length) out.push({ k, sets, rr: it.rr || null, sec: it.sec || null, pain: kb.pain ?? null });
    }
  }
  return out;
}
/* Gewichtsvorschlag je Übung: isometrisch +2,5 kg, wenn die Zeit sicher hielt und es kaum schmerzte (so bleibt es bei
   ~70 %); langsam-schwer: neue Stufe → aus dem letzten Satz umrechnen, sonst doppelte Progression; Gewichte nicht steigern
   an leichten Tagen oder wenn die Wochen-Auswertung wegen Schmerz/Warnzeichen gehalten hat. */
function kbSuggest(it, k, tid) {
  const ex = exById(it.i);
  if (!ex) return null;
  const step = it.i === 'b_press' ? 5 : 2.5, iso = !!it.sec;
  const [lo, hi] = iso ? [it.sec, it.sec] : kxRange(it.rr);
  const out = { w: null, reps: iso ? [] : Array(it.sets).fill(hi), tag: 'new', why: '' };
  const hist = kbHistory(it.i, addDays(k, -1), tid);
  if (!hist.length) { out.why = iso ? 'Neu: ein Gewicht wählen, das du 45 Sek. halten kannst und danach noch etwa 2 Sätze schaffen würdest (Anstrengung 7 von 10).' : `Neu: ein Gewicht wählen, mit dem ${hi} saubere Wdh. gehen und noch 2 drin wären.`; return out; }
  const last = hist[0], ws = last.sets.filter((s) => s.w != null);
  if (!ws.length) { out.tag = 'same'; out.why = 'Letztes Mal ohne Gewicht – heute das Gewicht mit eintragen, dann rechnet die App weiter.'; return out; }
  const top = Math.max(...ws.map((s) => s.w)), atTop = ws.filter((s) => s.w === top);
  const L = athLight(k), kp = kpLast(k), quad = iso || it.hsr;
  const noUp = L ? 'heute leichter' : quad && kp && kp.st !== 'up' && (kp.kind === 'pain' || kp.kind === 'flags') ? 'die Wochen-Auswertung hat gehalten' : null;
  const down = quad && kp && kp.st === 'down';
  let w = top;
  if (iso) {
    const held = atTop.length >= Math.min(it.sets, ws.length) && atTop.every((s) => s.sec == null || s.sec >= it.sec - 2);
    if (last.pain != null && last.pain >= 6) { w = kxRound(top * 0.9, step); out.tag = 'down'; out.why = `Letztes Mal ${last.pain}/10 Schmerz → ${kgF(w)} kg und den Winkel prüfen (ca. 60°).`; }
    else if (held && (last.pain == null || last.pain <= 3)) { w = top + step; out.tag = 'up'; out.why = `${kgF(top)} kg sicher gehalten${last.pain != null ? ` bei ${last.pain}/10` : ''} → +${kgF(step)} kg, damit es bei ~70 % deiner Kraft bleibt.`; }
    else { out.tag = 'same'; out.why = `Gleiches Gewicht wie letztes Mal (${kgF(top)} kg)${last.pain != null && last.pain > 3 ? ` – bei ${last.pain}/10 noch nicht steigern` : ''}.`; }
  } else {
    const lastHi = last.rr ? kxRange(last.rr)[1] : hi;
    const reps = atTop.map((s) => s.r).filter((v) => v != null), best = atTop.find((s) => s.r != null);
    if (it.hsr && lastHi !== hi && best) {
      w = kxRound((top * (1 + best.r / 30)) / (1 + hi / 30), step);
      out.tag = 'up'; out.why = `Neue Stufe: ${it.sets} × ${hi} statt ${lastHi} – aus ${kgF(top)} kg × ${best.r} umgerechnet: ${kgF(w)} kg.`;
    } else if (reps.length && reps.length >= Math.min(it.sets, ws.length) && reps.every((r) => r >= hi) && (last.pain == null || last.pain <= 5)) {
      w = top + step; out.tag = 'up'; out.reps = Array(it.sets).fill(lo); out.why = `Letztes Mal ${reps.join('/')} Wdh. mit ${kgF(top)} kg – Obergrenze geschafft → +${kgF(step)} kg, Ziel ${lo}+ Wdh.`;
    } else {
      out.tag = 'same'; out.reps = Array.from({ length: it.sets }, (_, i) => Math.min(hi, Math.max(lo, (reps[i] ?? reps[reps.length - 1] ?? lo) + 1)));
      out.why = `Gleiches Gewicht, je Satz 1 Wdh. mehr${reps.length ? ` (${reps.join('/')} → ${out.reps.join('/')})` : ''}. Bei ${hi} in allen Sätzen kommt mehr Gewicht.`;
    }
  }
  if (down) { w = kxRound(Math.min(w, top) * 0.9, step); out.tag = 'down'; out.why = `${kp.why} ${kgF(w)} kg (−10 %).`; }
  else if (noUp && w > top) { w = top; out.tag = 'same'; out.why = `Gleiches Gewicht (${kgF(top)} kg) – ${noUp}.`; }
  out.w = w;
  return out;
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
function athWeek(ws) { return weekKeys(ws).map((k) => { const s = athStr(k); return { k, t: s && s.done ? s.t || '✓' : null, g: kbDone(k) }; }); }
/* ---------- Oberfläche ---------- */
function athLightBanner(k) {
  const L = athLight(k);
  if (!L) return '';
  return `<div class="banner ${L.stop ? 'is-red' : 'is-warn'}">${icon(L.stop ? 'octagon-alert' : 'triangle-alert')}<div><b>Heute leichter</b><span>${esc(L.why)}: je Übung ein Satz weniger, keine Sprünge, beim Wandsitzen nur etwa halbe Kraft.${L.stop ? ' Schwellung, Instabilität, Blockade oder Nachtschmerz bitte ärztlich oder physiotherapeutisch abklären lassen.' : ' Wird es nicht besser, eine Stufe zurück.'}</span></div></div>`;
}
function athGymHTML(compact, day = null) {
  const ph = kneePhase(), pl = kbPlanItems(todayKey(), day);
  return `<section class="${compact ? 'card' : 'sec'} ath-gym"><div class="sec-head"><h2>Knie-Block im Gym</h2><span class="count">optional · ${esc(ph.n)} · ca. ${kbMin(pl.items)} Min.</span></div><div class="list">${pl.items.map((it) => `<div class="row is-static"><span class="row-main"><b>${esc(exById(it.i).n)}</b><small>${esc(kbDose(it))}</small></span></div>`).join('')}</div>${compact ? '<p class="hint">In der Gym-Einheit ganz unten zuschalten. Was schon im Training ist, lässt der Block weg.</p>' : '<p class="hint">In jeder Gym-Einheit ganz unten zuschaltbar – er zählt nicht zur Einheit, das Training bleibt auch ohne ihn vollständig. Das Gewicht schlägt die App je Übung vor. Schmerz bis 5/10 ist okay (beim isometrischen Beinstrecker bis 3/10), wenn das Knie am nächsten Morgen nicht schlechter ist.</p>'}</section>`;
}
function athTrainCard(k) {
  if (!athLegsDay(k)) return '';
  return athGymHTML(true, 2);
}
/* Stufe, Grund und was sich diese Woche ändert */
function kpCardHTML(k = todayKey()) {
  const ph = kneeCfg().phase || 1, max = KP_MAX[ph] || 3, lvl = kpLevel(k), last = kpLast(k), live = kpEval(weekStart(k));
  const st = last ? last.st : 'start';
  const ic = { up: 'trending-up', down: 'trending-down', hold: 'minus', manual: 'pencil', phase: 'sparkles', start: 'sparkles' }[st] || 'minus';
  const head = { up: 'Seit Montag eine Stufe höher', down: 'Seit Montag eine Stufe zurück', hold: 'Stufe gehalten', manual: 'Von dir angepasst', phase: 'Neue Phase', start: 'Steigerung läuft ab jetzt' }[st] || '';
  const why = last ? last.why : 'Jeden Montag schaut die App auf die Vorwoche und stellt die Stufe ein.';
  const lv = [...new Set(Object.values(kneePhase().days || {}).flat().map(athSwap).map((it) => kpItem(it, lvl)).filter((x) => x.lvT).map((x) => `${exById(x.i).n}: ${x.lvT}`))];
  const hsr = KB_HSR[ph] ? KB_HSR[ph][Math.min(lvl, KB_HSR[ph].length - 1)] : null;
  const liveT = live.st === 'up' ? 'auf Kurs für die nächste Stufe' : live.kind === 'units' ? `noch ${3 - live.units} ${3 - live.units === 1 ? 'Einheit' : 'Einheiten'} bis zur nächsten Stufe` : live.why;
  return `<section class="card kp-card" id="kp"><div class="sec-head"><h2>Steigerung</h2><span class="count">Stufe ${lvl} von ${max} · ${esc(kneePhase().n)}</span></div>
    <div class="kp-dots" aria-hidden="true">${Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'is-on' : ''}"></i>`).join('')}</div>
    <p class="kp-st is-${st}">${icon(ic)}<span><b>${esc(head)}</b> ${esc(why)}</span></p>
    <p class="hint">Diese Woche: ${esc(kpChangeText(lvl))}${lv.length ? ' ' + esc(lv.join(' · ')) + '.' : ''}${hsr ? ` Gym-Knie-Block langsam-schwer: ${hsr[0]} × ${hsr[1]}.` : ''}</p>
    <p class="hint">Stand jetzt: ${live.units} ${live.units === 1 ? 'Einheit' : 'Einheiten'}${live.maxS != null ? `, Schmerz bis ${live.maxS}/10` : ''}${live.mA != null ? `, morgens Ø ${fmt(live.mA, 1)}/10` : ''} – ${esc(liveT)}. Nächste Auswertung: ${esc(fmtDate(addDays(weekStart(k), 7), { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
    <div class="row-btns"><button class="pill-btn sm" data-a="kp-adj" data-v="-1"${lvl <= 0 ? ' disabled' : ''}>${icon('minus')}Stufe runter</button><button class="pill-btn sm" data-a="kp-adj" data-v="1"${lvl >= max ? ' disabled' : ''}>${icon('plus')}Stufe hoch</button></div></section>`;
}
/* Knie-Block unten in der Gym-Einheit */
function kbSessionHTML(t, k) {
  const kb = t.gym.knee;
  if (!kb || !kb.on) {
    const pl = kbPlanItems(k, t.gym.day);
    return `<section class="card kb-offer" id="kb"><div class="sec-head"><h2>${icon('footprints')}Knie-Block</h2><span class="count">optional · ca. ${kbMin(pl.items)} Min.</span></div>
      <p class="hint">${esc(pl.items.map((x) => exById(x.i).n).join(', '))}. Zählt nicht zur Einheit – lässt du ihn weg, bleibt das Training vollständig.</p>
      <button class="btn" data-a="kb-on">${icon('plus')}Knie-Block hinzufügen</button></section>`;
  }
  const items = kb.items || [], L = athLight(k);
  const tot = items.reduce((a, x) => a + x.sets, 0), done = items.reduce((a, x) => a + (((kb.ex || {})[x.i] || {}).s || []).filter((s) => s.d).length, 0);
  let h = `<section class="card kb" id="kb"><div class="sec-head"><h2>${icon('footprints')}Knie-Block</h2><span class="count">${esc((KNEE_PHASES.find((p) => p.id === kb.ph) || kneePhase()).n)} · Stufe ${kb.lvl || 0} · ${done}/${tot} Sätze</span></div>`;
  if (L) h += `<div class="banner ${L.stop ? 'is-red' : 'is-warn'}">${icon(L.stop ? 'octagon-alert' : 'triangle-alert')}<div><b>Heute leichter</b><span>${esc(L.why)}: je Übung ein Satz weniger, Gewichte nicht steigern.${L.stop ? ' Warnzeichen bitte ärztlich oder physiotherapeutisch abklären lassen; bei Wegknicken oder stechendem Schmerz aufhören.' : ''}</span></div></div>`;
  if ((kb.skipped || []).length) h += `<p class="hint">Weggelassen, weil schon im Training oder heute schon schwer belastet: ${esc(kb.skipped.map((id) => (exById(id) || {}).n).filter(Boolean).join(', '))}.</p>`;
  for (const it of items) {
    const ex = exById(it.i);
    if (!ex) continue;
    const e = (kb.ex || {})[it.i] || { s: [] }, sg = kbSuggest(it, k, t.id), iso = !!it.sec;
    const n = Math.max(it.sets, (e.s || []).length), open = ui.exp.has('kbh-' + it.i);
    const sic = { up: 'trending-up', down: 'trending-down', same: 'minus', new: 'sparkles' }[sg.tag] || 'minus';
    const plan = sg.w != null ? `${kgF(sg.w)} kg ·${iso ? `${it.sets} × ${it.sec} Sek.` : `${it.sets} × ${sg.reps.join('/')}`}` : iso ? `${it.sets} × ${it.sec} Sek.` : `${it.sets} × ${sg.reps.join('/')} Wdh.`;
    const rows = Array.from({ length: n }, (_, i) => {
      const s = (e.s || [])[i] || {}, pr = iso ? it.sec : sg.reps[i] ?? sg.reps[sg.reps.length - 1] ?? kxRange(it.rr)[1];
      return `<div class="set-row${s.d ? ' is-done' : ''}"><button class="set-chk" data-a="kb-set" data-ex="${it.i}" data-i="${i}" aria-pressed="${!!s.d}" aria-label="Satz ${i + 1} erledigt"><span class="tgl-box">${icon('check')}</span><span>${i + 1}</span></button>
        <label class="set-in"><input type="text" inputmode="decimal" data-c="kb-val" data-ex="${it.i}" data-i="${i}" data-f="w" value="${numIn(s.w, 2)}" placeholder="${sg.w != null ? numIn(sg.w, 2) : 'kg'}"><span>kg</span></label>
        <label class="set-in"><input type="text" inputmode="numeric" data-c="kb-val" data-ex="${it.i}" data-i="${i}" data-f="${iso ? 'sec' : 'r'}" value="${(iso ? s.sec : s.r) ?? ''}" placeholder="${pr}"><span>${iso ? 'Sek.' : 'Wdh.'}</span></label><span></span></div>`;
    }).join('');
    h += `<div class="kb-ex"><div class="gym-head"><div><h3>${esc(ex.n)}</h3><small>${esc(kbDose(it))}</small></div>${iso ? `<button class="pill-btn sm" data-a="kb-timer" data-ex="${it.i}">${icon('timer')}Timer</button>` : ''}</div>
      <button class="link-btn" data-a="expand" data-key="kbh-${it.i}">${open ? 'Ausführung ausblenden' : 'So geht’s'}</button>${open ? `<p class="kb-how">${esc(ex.how)}${ex.safety && ex.safety !== 'Keine.' ? ` ${esc(ex.safety)}` : ''}</p>` : ''}
      <div class="kx-sug kx-${sg.tag}">${icon(sic)}<div><b>Vorschlag: ${esc(plan)}</b><small>${esc(sg.why)}</small></div>${sg.w != null ? `<button class="pill-btn sm" data-a="kb-apply" data-ex="${it.i}">Übernehmen</button>` : ''}</div>
      ${rows}<button class="link-btn" data-a="kb-addset" data-ex="${it.i}">${icon('plus')} Satz</button></div>`;
  }
  h += `<p class="flabel-s">Knie während des Blocks (0–10) · bis 5 okay, beim isometrischen Beinstrecker bis 3</p>${scale0('kb-pain', kb.pain ?? null, k)}
    <button class="link-btn" data-a="kb-off">Knie-Block entfernen</button></section>`;
  return h;
}
function athInfoHTML() {
  const open = ui.exp.has('ath-info');
  let h = `<section class="sec"><button class="row" data-a="expand" data-key="ath-info"><span class="row-main"><b>So funktioniert der Plan</b><small>Regeln, Studien, Quellen</small></span>${icon(open ? 'chevron-up' : 'chevron-down', 'row-ic')}</button>`;
  if (!open) return h + '</section>';
  h += `<ul class="wish-list">
    <li><b>Schmerz-Regel:</b> Während und direkt nach den Übungen sind bis 5/10 okay, wenn der Schmerz bis zum nächsten Morgen wieder auf deinem Ausgangswert ist und nicht von Woche zu Woche steigt (Schmerz-Monitoring-Modell). Für den Wechsel in die nächste Phase müssen alle Werte 2 Wochen lang bei höchstens 3/10 liegen.</li>
    <li><b>Leichter Tag:</b> Morgenschmerz ab 7/10, 2 Punkte über dem Vortag oder die letzte Einheit (auch der Gym-Knie-Block) über 5/10 → die App nimmt je Übung einen Satz weg, geht eine Stufe zurück und lässt Sprünge weg.</li>
    <li><b>Steigerung von Woche zu Woche:</b> Jeden Montag schaut die App auf die Vorwoche. Mindestens 3 Einheiten (zu Hause oder Gym-Knie-Block), Schmerz in den Einheiten höchstens 5/10, Morgenschmerz nicht gestiegen und keine Warnzeichen → eine Stufe höher: länger halten, mehr Wiederholungen, mehr Gewicht, ab Stufe 3 ein Satz mehr. Schmerz 6/10, etwas mehr Morgenschmerz, zu wenige Einheiten oder Warnzeichen → Stufe halten. Schmerz ab 7/10 oder deutlich mehr Morgenschmerz → eine Stufe zurück. Mit jeder neuen Phase beginnt es bei Stufe 0, weil die Übungen schwerer werden.</li>
    <li><b>Wie oft:</b> Halteübungen (isometrisch) gehen täglich, so war es auch in der Studie. Schwere, langsame Übungen kommen ab Phase 2 nur jeden zweiten Tag: Nach starker Belastung baut die Sehne etwa 1–2 Tage lang erst Kollagen ab, danach bis zu 3 Tage mehr auf. Deshalb gibt es am Beintag und nach dem Gym-Knie-Block zu Hause keine Einheit A, ab Phase 2 auch nicht am Tag danach.</li>
    <li><b>Knie-Block im Gym:</b> Phase 1 der Beinstrecker isometrisch und einbeinig (5 × 45 Sek. bei 60°, ~70 % der Kraft – genau wie in der Studie), dazu Beinbeuger, Wadenheben sitzend, Ab- und Adduktoren. Ab Phase 2 langsam und schwer: Woche für Woche weniger Wiederholungen und mehr Gewicht (15 → 12 → 10 → 8 → 6), wie im Programm von Kongsgaard 2009, das auch nach einem halben Jahr noch gut wirkte.</li>
    <li><b>Beide Seiten gleich:</b> Links und rechts gleich viele Sätze und Wiederholungen, damit kein neues Ungleichgewicht entsteht.</li>
    <li><b>Unter der Kniescheibe (Patellasehne):</b> Stufenweise belasten – isometrisch (Wandsitzen, Beinstrecker), dann langsam und schwer (3 Sek. runter, 3 Sek. hoch), dann Sprungkraft, dann Sport. In einer randomisierten Studie (76 Sportler, meist seit Jahren Beschwerden) verbesserte das den VISA-P-Wert nach 24 Wochen um 28 statt 18 Punkte gegenüber klassischem exzentrischem Training. Isometrische Übungen lindern bei manchen kurzfristig, sind langfristig aber nicht besser als langsames Krafttraining – deshalb nur als Einstieg und an leichteren Tagen.</li>
    <li><b>Außenseite des Knies:</b> Häufig ist es der Tractus iliotibialis (Läuferknie). In den Studien war das Kräftigen der Hüftabduktoren der häufigste wirksame Baustein (Seitliches Beinheben, Clamshells, Monster Walks, Seitstütz, Hip Hike). Den Tractus selbst zu dehnen hilft kaum; rollen eher Po und Oberschenkel vorne.</li>
    <li><b>Athletik:</b> Programme aus Gleichgewicht, Kraft, Landen und Sprüngen senkten Knieverletzungen in einer Meta-Analyse um rund ein Viertel und Kreuzbandrisse um rund die Hälfte. Entscheidend ist Regelmäßigkeit.</li>
    <li><b>BJJ:</b> In einer Befragung betrafen knapp 30 % der Verletzungen das Knie, meist Innenband-Zerrungen. Deshalb Adduktoren (Copenhagen), Seitbewegung, tiefe Beugung und kontrolliertes Aufstehen.</li>
    <li><b>Abklären:</b> Halten die Beschwerden schon länger an, lass einmal von Physio oder Sportmedizin klären, was genau es ist (Patellasehne, Kniescheibe, Tractus, Außenband, Meniskus) – der Plan passt zu den häufigen Ursachen, ersetzt aber keine Untersuchung. Sofort abklären: Schwellung, Wegknicken, Blockade, Nachtschmerz.</li></ul>
    <h5>Quellen</h5><div class="list">${[
    ['Breda 2021: Stufenweises Sehnentraining bei Patellasehnen-Beschwerden (BJSM)', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8070614/'],
    ['Erasmus MC: Ablauf der vier Stufen (JUMPER-Studie)', 'https://www.erasmusmc.nl/en/research/project/jumper-project'],
    ['Kongsgaard 2009: Langsam-schweres Training bei Patellasehnen-Beschwerden (RCT)', 'https://research.regionh.dk/en/publications/corticosteroid-injections-eccentric-decline-squat-training-and-he/'],
    ['Magnusson 2010: Wie die Sehne auf Belastung reagiert (Erholung zwischen schweren Einheiten)', 'https://research.regionh.dk/en/publications/the-pathogenesis-of-tendinopathy-balancing-the-response-to-loadin/'],
    ['Needham 2022: Spanish Squat – Oberkörper-Neigung und Last an der Patellasehne', 'https://commons.nmu.edu/isbs/vol40/iss1/124'],
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
  const g = wk.filter((x) => x.g).length;
  return `<section class="sec"><div class="sec-head"><h2>Diese Woche</h2><span class="count">${n}/${goal} Einheiten${g ? ` · Gym-Knie-Block ${g}×` : ''}</span></div><div class="ath-week">${wk.map((x, i) => `<div class="ath-day${x.t || x.g ? ' is-done' : ''}${x.k === k ? ' is-today' : ''}"><small>${WD_SHORT[i]}</small><b>${x.t ? esc(x.t) : x.g ? '' : x.k < k ? '–' : '·'}</b>${x.g ? '<em>Gym</em>' : ''}</div>`).join('')}</div><p class="hint">Täglich möglich, ein Ruhetag pro Woche ist eingeplant. Gym-Knie-Block und Heim-Einheit am selben Tag sind okay – die App wählt dann zu Hause B oder C. Ausgefallen? Einfach mit der nächsten Einheit weitermachen.</p></section>`;
}
/* Routine-Schritt und Mitteilung */
function pushAth(k, r, d, add) {
  if (kneeWeek(k) < 1 || dayDone(k).kraft) return;
  const t = athType(k), L = athLight(k);
  add('training', Math.min(r.bed - 240, 19 * 60 + 30), 'ath', `Knie-Athletik ${t}: ${ATH_TYPES[t]}`, `ca. ${athMin(k, t)} Min. zu Hause${L ? ` – heute leichter (${L.why})` : ''}. Antippen öffnet die Einheit.`, '#kraft');
}
function athReportLine(ws) {
  const all = athWeek(ws), wk = all.filter((x) => x.t), g = all.filter((x) => x.g).length;
  if (!wk.length && !g) return '';
  const pains = weekKeys(ws).flatMap((k) => [(athStr(k) || {}).pain, ...kbPains(k)]).filter((v) => v != null);
  const p = kneeCfg().prog, h = p && (p.hist || []).find((x) => x.ws === addDays(ws, 7));
  return `Kraft & Athletik (${kneePhase().n}): ${wk.length}/${kneePhase().perWeek} Einheiten${wk.length ? ` (${wk.map((x) => x.t).join(' ')})` : ''}${g ? ` · Gym-Knie-Block ${g}×` : ''}${pains.length ? ` · Schmerz in den Einheiten Ø ${fmt(mean(pains), 1)}, max. ${Math.max(...pains)}` : ''} · Steigerung: Stufe ${kpLevel()}${h ? ` (${{ up: 'danach eine höher', down: 'danach eine zurück', hold: 'gehalten' }[h.st] || h.st})` : ''}`;
}
function kbMut(fn) { mutTraining((t) => { const kb = t.gym && t.gym.knee; if (kb) { kb.ex = kb.ex || {}; fn(kb, t); } }); }
function kbEx(kb, id) { const e = kb.ex[id] = kb.ex[id] || { s: [] }; e.s = e.s || []; return e; }
function kbItem(t, id) { return ((t.gym.knee || {}).items || []).find((x) => x.i === id) || null; }
Object.assign(A, {
  'ath-type': (el) => { const k = todayKey(), v = el.dataset.v; kneeMut(k, (kn) => { athEnsure(kn, k).t = v; }); render(); },
  'ath-start': () => athStart(todayKey()),
  'tm-pain': (el) => { const t = ui.timer; if (!t) return; const v = Number(el.dataset.v); t.pain = t.pain === v ? null : v; timerRender(); },
  'knee-longband': (el) => { kneeCfg().longBand = el.dataset.v === '1'; saveSettings(); toast(kneeCfg().longBand ? 'Langes Band: Knie strecken gegen Band und Spanish Squat sind wieder drin' : 'Ohne langes Band: die App nimmt Ersatzübungen'); },
  'kp-adj': (el) => {
    const c = kneeCfg(), p = kpEnsure(todayKey()), ph = c.phase || 1, from = kpLevel(), to = clamp(from + Number(el.dataset.v), 0, KP_MAX[ph] || 3);
    if (to === from) return;
    p.lvl = to; p.hist = (p.hist || []).concat([{ ws: weekStart(todayKey()), from, to, st: 'manual', why: `Von Stufe ${from} auf ${to} gestellt.` }]).slice(-30);
    saveSettings(); toast(`Stufe ${to}`);
  },
  'kb-on': () => {
    const t0 = curTraining(); if (!t0 || !t0.gym) return;
    const pl = kbPlanItems(ui.gymSess.k, t0.gym.day);
    mutTraining((t) => { const old = t.gym.knee; t.gym.knee = { ...(old || {}), on: true, ph: (old && old.items && old.ph) || pl.ph, lvl: (old && old.items) ? old.lvl : pl.lvl, items: (old && old.items) || pl.items, skipped: (old && old.skipped) || pl.skipped, ex: (old && old.ex) || {} }; });
    render();
    requestAnimationFrame(() => { const el = document.getElementById('kb'); if (el) el.scrollIntoView({ block: 'start' }); });
  },
  'kb-off': () => { kbMut((kb) => { kb.on = false; }); render(); toast('Knie-Block entfernt – die Einheit bleibt vollständig'); },
  'kb-set': (el) => {
    const id = el.dataset.ex, i = Number(el.dataset.i), t0 = curTraining();
    const it = t0 && kbItem(t0, id);
    if (!it) return;
    const sg = kbSuggest(it, ui.gymSess.k, t0.id);
    kbMut((kb) => {
      const e = kbEx(kb, id);
      while (e.s.length <= i) e.s.push({});
      const s = e.s[i];
      s.d = !s.d;
      if (s.d) {
        if (s.w == null && sg && sg.w != null) s.w = sg.w;
        if (it.sec) { if (s.sec == null) s.sec = it.sec; } else if (s.r == null) s.r = (sg && (sg.reps[i] ?? sg.reps[sg.reps.length - 1])) ?? kxRange(it.rr)[1];
      }
    });
    render();
  },
  'kb-apply': (el) => {
    const id = el.dataset.ex, t0 = curTraining(), it = t0 && kbItem(t0, id);
    if (!it) return;
    const sg = kbSuggest(it, ui.gymSess.k, t0.id);
    kbMut((kb) => { const e = kbEx(kb, id); while (e.s.length < it.sets) e.s.push({}); e.s.forEach((s, i) => { if (s.d) return; if (sg.w != null) s.w = sg.w; if (it.sec) s.sec = it.sec; else s.r = sg.reps[i] ?? sg.reps[sg.reps.length - 1]; }); });
    render(); toast('Vorschlag eingetragen – nach jedem Satz abhaken');
  },
  'kb-addset': (el) => { const id = el.dataset.ex, t0 = curTraining(), it = t0 && kbItem(t0, id); if (!it) return; kbMut((kb) => { const e = kbEx(kb, id); while (e.s.length < it.sets) e.s.push({}); e.s.push({}); }); render(); },
  'kb-pain': (el) => {
    const v = Number(el.dataset.v);
    kbMut((kb) => { kb.pain = kb.pain === v ? null : v; });
    render();
    if (v > 5) toast('Über 5/10: nächstes Mal leichter oder den Winkel ändern'); else if (v > 3) toast('Okay, wenn das Knie morgen früh wieder auf dem Ausgangswert ist');
  },
  'kb-timer': (el) => {
    const id = el.dataset.ex, t0 = curTraining(), it = t0 && kbItem(t0, id), ex = exById(id);
    if (!it || !ex) return;
    const sess = { ...ui.gymSess };
    timerStart(null, { steps: buildSteps({ items: [{ i: id, sets: it.sets, sec: it.sec, rest: it.rest }] }), name: ex.n, noSave: true, noExtra: true,
      onDone: () => { mutDay(sess.k, (d) => { const t = (d.trainings || []).find((x) => x.id === sess.id), kb = t && t.gym && t.gym.knee; if (!kb) return; kb.ex = kb.ex || {}; const e = kbEx(kb, id), sg = kbSuggest(it, sess.k, sess.id); while (e.s.length < it.sets) e.s.push({}); e.s.forEach((s) => { s.d = true; if (s.sec == null) s.sec = it.sec; if (s.w == null && sg && sg.w != null) s.w = sg.w; }); }); } });
  },
});
Object.assign(C, {
  'kb-val': (el) => {
    const f = el.dataset.f, v = parseNum(el.value), id = el.dataset.ex, i = Number(el.dataset.i);
    if (v != null && (v < 0 || v > (f === 'w' ? 600 : f === 'sec' ? 300 : 200))) { toast('Wert prüfen'); el.classList.add('bad'); return; }
    el.classList.remove('bad');
    kbMut((kb) => { const e = kbEx(kb, id); while (e.s.length <= i) e.s.push({}); if (v == null) delete e.s[i][f]; else e.s[i][f] = v; });
    flashSaved(el);
  },
});
