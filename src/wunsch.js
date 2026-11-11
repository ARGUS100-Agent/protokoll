/* ============================================================
   WUNSCHLISTE (seit 2.9.0)
   Produkte für später: Preis, Abo, Link, Priorität, Summe; abhaken als „bestellt“,
   danach „angekommen“. Jedes Produkt hat eine ausführliche Erklärung (was es ist,
   was es bringt, Studienlage, Vor- und Nachteile, Alternativen, Tipps, Quellen),
   damit man in ein paar Monaten nicht neu recherchieren muss.
   Vorbefüllt mit drei recherchierten Schlaf-Produkten (Stand 11.11.2026).
   ============================================================ */
/*icons: gift package-check truck external-link pencil trash-2 send rotate-ccw plus*/
const WISH_CATS = ['Schlaf', 'Training', 'Ernährung', 'Haut', 'Gesundheit', 'Sonstiges'];
const WISH_PRIO = [[1, 'Zuerst'], [2, 'Später'], [3, 'Irgendwann']];
const WISH_AMPEL = { stark: 'gut belegt', mittel: 'teils belegt', schwach: 'kaum belegt' };
const WISH_DEFAULT = [
  {
    id: 'w_oura5', n: 'Oura Ring 5', cat: 'Schlaf', price: 429, subYear: 69.99, sub: 'Abo 5,99 €/Monat oder 69,99 €/Jahr (ohne Abo nur Grundwerte)', link: 'https://ouraring.com/', prio: 1, stand: '2026-11-11',
    info: {
      kurz: 'Schlaf- und Erholungstracker als Ring: misst nachts Puls, HRV, Hauttemperatur und Schlafphasen.',
      was: 'Ein Titanring (2,28 mm dünn, bis 100 m wasserdicht, bis zu 9 Tage Akku), seit Juni 2026 auf dem Markt. Er misst Puls, HRV, Hauttemperatur, Sauerstoffsättigung, Atmung und Schlafphasen und rechnet daraus Schlaf-, Erholungs- und Aktivitätswerte. Neu beim Ring 5 sind u. a. Hinweise aus nächtlichen Blutdruck-Signalen (nicht in jeder Region verfügbar).',
      nutzen: 'Am Finger ist das Pulssignal nachts oft sauberer als am Handgelenk, und ein Ring stört beim Schlafen weniger als eine Uhr. Er misst die Hauttemperatur, die deine Forerunner 265 nicht hat: Abweichungen zeigen früh einen Infekt, Übertraining oder schlechte Erholung. Und er ist ein zweiter Messwert, um Garmins Schlafphasen einzuordnen.',
      belege: 'Im Vergleich mit dem Schlaflabor gehört Oura (Gen 3) zu den genauesten Trackern für Schlafphasen (Übereinstimmung κ ≈ 0,65, Tiefschlaf zu rund 80 % erkannt), allerdings aus einer Studie mit Beteiligung des Herstellers. Ein älteres Garmin-Gerät schnitt in einer unabhängigen Studie deutlich schwächer ab (κ ≈ 0,2); für die Forerunner 265 und den Ring 5 gibt es noch keine unabhängige Prüfung. Für alle Tracker gilt: Gesamtschlaf ziemlich gut, Schlafphasen nur mäßig genau – gut für Trends, nicht für Diagnosen.',
      ampel: 'mittel', ampelTxt: 'Messgenauigkeit teils belegt, Ring 5 selbst noch nicht unabhängig geprüft',
      pro: ['Kaum spürbar, angenehmer im Bett als eine Uhr', 'Hauttemperatur-Verlauf (fehlt deiner Garmin)', 'Lange Akkulaufzeit, ausgereifte App', 'Unter den Wearables mit die besten Werte für Schlafphasen'],
      contra: ['429 € (Premiumfarben 529 €) plus Abo – ohne Abo zeigt er nur wenige Grundwerte', 'Kann beim Krafttraining stören (Griff an der Hantel): dann abnehmen oder an die andere Hand', 'Doppelte Daten neben Garmin; die Protokoll-App liest Oura bisher nicht', 'Kein Umtauschprogramm für Vorgängermodelle'],
      alt: 'RingConn Gen 3 (ca. 369 €, ohne Abo, in Tests sehr ähnliche Werte), Ultrahuman Ring Air (ca. 379 €, ohne Abo), Samsung Galaxy Ring (ca. 449 €), Oura Ring 4 (Vorgänger, deutlich günstiger).',
      tipps: ['Zuerst das Größen-Set bestellen (ca. 10 €); Oura empfiehlt den Zeigefinger', 'Mit dem Abo rechnen: über 3 Jahre rund 640 € gesamt', 'Nach dem Kauf: Anbindung an die Protokoll-App prüfen lassen, dann zählen Schlafzeiten und Temperatur vom Ring'],
      src: [['Oura Ring 5: Maße, Akku, Abo (Notebookcheck)', 'https://www.notebookcheck.com/Oura-Ring-5-startet-mit-40-kompakterem-Gehaeuse-und-bis-zu-9-Tagen-Akkulaufzeit.1308647.0.html'], ['Test Oura Ring 5 (netzwelt)', 'https://www.netzwelt.de/oura-ring-5/testbericht.html'], ['Oura Ring 5 gegen RingConn Gen 3 (netzwelt)', 'https://www.netzwelt.de/news/254969-oura-ring-5-ringconn-gen-3-habe-klaren-favoriten.html'], ['Preise und Konkurrenz (Wareable)', 'https://www.wareable.com/de/health-tech/oura-ring-5-test'], ['Genauigkeit der Tracker im Vergleich (Kygo)', 'https://www.kygo.app/post/most-accurate-sleep-tracker-oura-vs-apple-vs-fitbit-2026'], ['Unabhängige Studie Schyvens 2025, Garmin/Whoop/Apple (Gneta)', 'https://www.gneta.app/blog/whose-sleep-score-to-trust']],
    },
  },
  {
    id: 'w_muse', n: 'Schlaf-Stirnband Muse S Athena', cat: 'Schlaf', price: 450, subYear: 0, sub: 'Grundfunktionen ohne Abo, Abo optional', link: 'https://choosemuse.com/', prio: 2, stand: '2026-11-11',
    info: {
      kurz: 'Stirnband, das nachts die Hirnströme (EEG) misst – die genaueste Schlafphasen-Messung für zu Hause.',
      was: 'Ein weiches Stoff-Stirnband mit EEG-Sensoren (Hirnströme), fNIRS (Durchblutung im Stirnhirn), Pulssensor und Bewegungssensor. Im Schlaflabor werden Schlafphasen ebenfalls über Hirnströme bestimmt; Uhr und Ring schätzen sie nur über Puls und Bewegung. Dazu kommen Einschlafhilfen (Klänge, die auf deine Hirnwellen reagieren), eine Funktion für tieferen Schlaf und tagsüber Meditation mit Echtzeit-Rückmeldung (Neurofeedback).',
      nutzen: 'Du siehst, wie viel Tief- und REM-Schlaf du wirklich hast, und kannst ein paar Wochen lang prüfen, wie stark deine Garmin danebenliegt. Das Neurofeedback passt zu Meditation und NSDR in deinem Plan: Du hörst, wann du wirklich zur Ruhe kommst.',
      belege: 'Muse-S gegen Schlaflabor (SLEEP Advances 2026, 56 Erwachsene, eine Nacht): substanzielle Übereinstimmung Epoche für Epoche und gute Werte für die Schlafarchitektur. In einer unabhängigen Vergleichsstudie mit 6 Geräten (60 Personen) schnitt ein EEG-Stirnband (Dreem 3) am besten ab, vor Oura, Fitbit und Aktigrafie. Bei älteren Menschen mit Schlafproblemen war der Gesamtschlaf gut, Tief- und REM-Schlaf ungenauer. Einschlafhilfen und „Deep Sleep Boost“ sind kaum unabhängig geprüft.',
      ampel: 'mittel', ampelTxt: 'Messung gut belegt, Einschlafhilfen kaum geprüft',
      pro: ['Schlafphasen aus Hirnströmen – näher am Schlaflabor als Uhr oder Ring', 'Grundfunktionen ohne Pflicht-Abo', 'Meditation mit Neurofeedback für tagsüber', 'Gut für ein paar Wochen Vergleich mit deiner Garmin'],
      contra: ['Ein Band am Kopf ist gewöhnungsbedürftig, vor allem für Seitenschläfer', 'Muss regelmäßig geladen werden; kein Tracker für den Tag (keine Schritte, kein Training)', 'Daten nur in der Muse-App', 'Ca. 450 €, mit Abo mehr – für Rhythmus und Gesamtschlaf reicht die Garmin'],
      alt: 'Weitere Stirnbänder: Frenz Brainband, Somnee und Elemind (setzen eher auf Stimulation, noch weniger geprüft). Bei Verdacht auf eine Schlafstörung ist eine Untersuchung im Schlaflabor über den Arzt der richtige Weg, nicht ein Gerät.',
      tipps: ['Vorher klären, ob dich Schlafphasen wirklich interessieren – für Rhythmus und Dauer reicht die Garmin', 'Die ersten Nächte sind oft unruhiger: ein paar Nächte eingewöhnen, bevor du die Werte vergleichst', 'Rückgaberecht nutzen, falls das Band beim Schlafen stört', 'Preis in Euro vor dem Kauf prüfen (ca. 450 € laut Test, in den USA 474,99 $)'],
      src: [['Muse-S gegen Schlaflabor (SLEEP Advances 2026)', 'https://pure.etsmtl.ca/en/publications/assessing-the-performance-of-a-portable-electroencephalographic-s/'], ['Vergleich von 6 Schlaftrackern mit dem Schlaflabor (Sleep 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38087674/'], ['Test Muse S Athena mit Preisen (Tom’s Guide)', 'https://www.tomsguide.com/wellness/sleep-tech/the-muse-s-athena-headband-helps-me-fall-asleep-fast-even-when-im-wired-heres-why-its-the-best-sleep-aid-ive-tried-so-far-in-2026'], ['EEG-Stirnband gegen Schlaflabor bei Älteren (Miner 2026)', 'https://www.omnicuris.com/medshots/daily_updates/eeg-headband-vs-polysomnography-older-adults']],
    },
  },
  {
    id: 'w_pod6', n: 'Eight Sleep Pod 6 (Solo)', cat: 'Schlaf', price: 2199, subYear: 199, sub: 'Autopilot-Abo Pflicht: 199, 299 oder 399 €/Jahr', link: 'https://www.eightsleep.com/', prio: 3, stand: '2026-11-11',
    info: {
      kurz: 'Matratzenauflage, die dein Bett nachts automatisch kühlt und wärmt und dabei den Schlaf misst.',
      was: 'Ein Cover mit feinen Wasserkanälen über deiner Matratze und ein Hub unter dem Bett, der das Wasser kühlt oder heizt (ca. 12–43 °C). Der „Autopilot“ ändert die Temperatur während der Nacht nach deinen Schlafphasen. Im Cover stecken 18 Sensoren (9 pro Seite) für Puls, HRV, Atmung und Schlafphasen; geweckt wirst du mit Vibration und Wärme. Pod 6 gibt es seit September 2026: Hub halb so groß wie beim Pod 5, Temperatur bis zu 20 % schneller, erstmals als Solo-Größe für eine Person.',
      nutzen: 'Zum Einschlafen muss die Körperkerntemperatur sinken, gegen Morgen steigt sie wieder (Huberman-Protokolle 5 und 6). Der Pod macht das automatisch: kühl in der ersten Nachthälfte, wenn der meiste Tiefschlaf kommt, wärmer vor dem Aufwachen. Das kann Tiefschlaf und Erholung nach dem Training etwas verbessern, vor allem in warmen Sommernächten ohne Klimaanlage. Dazu kommen Schlafdaten, ohne etwas am Körper zu tragen.',
      belege: 'Herstellerstudie (Bioengineering 2024, 54 Personen, je 4 Nächte an und aus, Heim-Schlaftest): Männer hatten mit kühler erster Nachthälfte 14 Min. mehr Tiefschlaf, der Schlafpuls sank um 2 %, die HRV stieg um 7 %. Auswertung des Autopilot (SLEEP-Kongress 2025, Daten des Herstellers): +4,7 Min. Tiefschlaf (+10 %), HRV +13 %. Unabhängige Studien fehlen; die Effekte sind klein und bei Leuten, die schon gut schlafen, eher gering. Gut belegt ist der Mechanismus: kühle Umgebung und warm duschen vor dem Schlafen helfen beim Einschlafen.',
      ampel: 'schwach', ampelTxt: 'Mechanismus gut belegt, das Produkt nur in Studien des Herstellers',
      pro: ['Nichts am Körper – misst und regelt im Liegen', 'Temperatur passt sich die ganze Nacht automatisch an', 'Stiller Wecker mit Vibration und Wärme', 'Hilft besonders in warmen Sommernächten'],
      contra: ['Sehr teuer: ab 2.199 € plus Pflicht-Abo (199–399 € pro Jahr)', 'In Studien kleine Effekte (wenige Minuten mehr Tiefschlaf)', 'Wasser nachfüllen; der Hub braucht Strom und Platz unter dem Bett', 'Daten bleiben in der Eight-Sleep-App, nicht in Garmin oder der Protokoll-App'],
      alt: 'Fast kostenlos über denselben Mechanismus: Schlafzimmer kühl (ca. 17–19 °C), leichte Decke, warm duschen 1–2 Std. vor dem Schlafen (Meta-Analyse: schneller eingeschlafen). Wasser-Kühlmatten anderer Hersteller (z. B. Sleepme) sind günstiger, messen aber meist keinen Schlaf; Verfügbarkeit in Deutschland prüfen.',
      tipps: ['Solo-Größe für eine Person: 90 × 200 cm für 2.199 €; ganze Betten ab 2.899 €, 200 × 200 cm 3.399 €', 'Abo-Stufen 199, 299 oder 399 € pro Jahr (ab 17 € im Monat); über 3 Jahre mindestens rund 2.800 € gesamt', 'Erst kaufen, wenn Schlafrhythmus, Licht und Koffein sitzen – dann siehst du, was der Pod zusätzlich bringt', 'Probezeit und Rückgabe auf der Herstellerseite prüfen'],
      src: [['Pod 6 mit Preisen für Deutschland (ifun.de)', 'https://www.ifun.de/eight-sleep-pod-6-das-intelligente-bett-wird-kleiner-und-guenstiger-289505/'], ['Pod 6: technische Daten (BornCity)', 'https://borncity.com/news/eight-sleep-pod-6-18-sensoren-und-schnellere-temperatursteuerung/'], ['Studie: eine Woche auf dem temperierten Cover (Bioengineering 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38671774/'], ['Autopilot-Auswertung SLEEP 2025 (Hersteller)', 'https://www.eightsleep.com/blog/research-finds-the-pod-can-boost-sleep-and-cardiovascular-metrics-with-real-time-temperature-adjustments-based-on-your-sleep-stages/']],
    },
  },
];

function wishItems() {
  if (!S.wish) S.wish = { items: null };
  if (!Array.isArray(S.wish.items)) { S.wish.items = clone(WISH_DEFAULT).map((x) => ({ ...x, status: 'offen', at: { added: todayKey() } })); markDirty('wish'); }
  return S.wish.items;
}
function wishSave() { markDirty('wish'); render(); }
const wishEuro = (v, d = 0) => `${fmt(v, d)} €`;
function wishSum(list) {
  const once = list.reduce((a, x) => a + (Number(x.price) || 0), 0), year = list.reduce((a, x) => a + (Number(x.subYear) || 0), 0);
  return { once, year };
}
function wishPriceTxt(it) {
  const p = Number(it.price) > 0 ? wishEuro(it.price) : 'Preis offen';
  return Number(it.subYear) > 0 ? `${p} + ${wishEuro(it.subYear, it.subYear % 1 ? 2 : 0)}/Jahr` : p;
}
function wishStatus() {
  const all = wishItems(), open = all.filter((x) => x.status === 'offen'), ord = all.filter((x) => x.status === 'bestellt');
  const s = wishSum(open);
  return { v: `${open.length} offen`, s: open.length ? `${wishEuro(s.once)} einmalig${s.year ? ` + ${wishEuro(s.year)}/Jahr Abos` : ''}${ord.length ? ` · ${ord.length} bestellt` : ''}` : ord.length ? `${ord.length} bestellt, unterwegs` : 'Liste leer', st: ord.length ? 'under' : 'none' };
}

function vWunsch() {
  const sub = getSub('wunsch', 'offen');
  const all = wishItems();
  const open = all.filter((x) => x.status === 'offen').sort((a, b) => (a.prio || 2) - (b.prio || 2) || (a.price || 0) - (b.price || 0));
  const got = all.filter((x) => x.status !== 'offen').sort((a, b) => (a.status === 'bestellt' ? 0 : 1) - (b.status === 'bestellt' ? 0 : 1) || String((b.at || {}).ordered || '').localeCompare(String((a.at || {}).ordered || '')));
  let h = areaHead('wunsch') + subnav('wunsch', sub, [['offen', `Wunschliste (${open.length})`], ['bestellt', `Bestellt (${got.length})`]]);
  if (sub === 'offen') {
    const s = wishSum(open);
    if (open.length) h += `<div class="wish-sum"><div><span>Einmalig</span><b>${wishEuro(s.once)}</b></div><div><span>Abos pro Jahr</span><b>${wishEuro(s.year)}</b></div><div><span>3 Jahre gesamt</span><b>${wishEuro(s.once + 3 * s.year)}</b></div></div>`;
    for (const [p, lab] of WISH_PRIO) {
      const its = open.filter((x) => (x.prio || 2) === p);
      if (!its.length) continue;
      h += `<h4 class="meal-h">${esc(lab)} <small>${its.length}</small></h4><div class="list">${its.map((it) => wishRow(it)).join('')}</div>`;
    }
    if (!open.length) h += emptyState('Nichts auf der Wunschliste.');
    h += `<button class="btn" data-a="wish-new">${icon('plus')}Produkt hinzufügen</button><p class="hint">Antippen öffnet die Erklärung: was es ist, was es dir bringt, was die Forschung sagt, Vor- und Nachteile, Alternativen. Der Haken markiert es als bestellt.</p>`;
  } else {
    if (!got.length) return h + emptyState('Noch nichts bestellt.');
    h += `<div class="list">${got.map((it) => wishRow(it)).join('')}</div>`;
  }
  return h;
}
function wishRow(it) {
  const st = it.status, at = it.at || {};
  const meta = st === 'offen' ? [wishPriceTxt(it), it.info && it.info.kurz ? it.info.kurz : it.note || ''].filter(Boolean).join(' · ')
    : st === 'bestellt' ? `Bestellt am ${fmtDate(at.ordered || todayKey(), { day: 'numeric', month: 'short' })} · ${wishPriceTxt(it)}`
      : `Angekommen am ${fmtDate(at.arrived || todayKey(), { day: 'numeric', month: 'short' })}`;
  const main = `<button class="row-main wish-main" data-a="wish-open" data-id="${it.id}"><b>${esc(it.n)}${it.cat ? `<span class="store-tag">${esc(it.cat)}</span>` : ''}</b><small>${esc(meta)}</small></button>`;
  if (st === 'offen') return `<div class="shop-row wish-row"><button class="shop-chk wish-chk" data-a="wish-order" data-id="${it.id}" aria-label="${esc(it.n)} als bestellt markieren"><span class="tgl-box">${icon('check')}</span></button>${main}</div>`;
  if (st === 'bestellt') return `<div class="shop-row wish-row no-chk">${main}<button class="pill-btn" data-a="wish-arrived" data-id="${it.id}">${icon('package-check')}Angekommen</button></div>`;
  return `<div class="shop-row wish-row no-chk is-done">${main}${icon('check', 'row-ic')}</div>`;
}

function sheetWish(id) {
  const it = wishItems().find((x) => x.id === id);
  if (!it) return;
  ui.sheet = { type: 'wish', id };
  const f = it.info || {};
  const list = (a) => `<ul class="wish-list">${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const para = (t, x) => (x ? `<h5>${esc(t)}</h5><p class="wish-p">${esc(x)}</p>` : '');
  const amp = f.ampel ? `<p class="wish-amp amp-${f.ampel}"><i></i>${esc(WISH_AMPEL[f.ampel] || f.ampel)}${f.ampelTxt ? ` – ${esc(f.ampelTxt)}` : ''}</p>` : '';
  const sy = Number(it.subYear) || 0, pr = Number(it.price) || 0;
  const cost = `<div class="wish-cost"><div><span>Kaufpreis</span><b>${pr ? wishEuro(pr) : '–'}</b></div><div><span>Abo pro Jahr</span><b>${sy ? wishEuro(sy, sy % 1 ? 2 : 0) : '–'}</b></div><div><span>3 Jahre</span><b>${pr || sy ? wishEuro(pr + 3 * sy) : '–'}</b></div></div>${it.sub ? `<p class="hint">${esc(it.sub)}</p>` : ''}`;
  const src = (f.src || []).filter((x) => /^https?:\/\//.test(x[1]));
  const ask = `Ich habe ${it.n} auf meiner Wunschliste (Infos in meiner App vom ${fmtDate(it.stand || (it.at || {}).added || todayKey(), { day: 'numeric', month: 'long', year: 'numeric' })}). Prüfe bitte kurz auf Deutsch: aktueller Preis in Deutschland und Abo-Kosten, gibt es ein neueres Modell, was sagen unabhängige Studien und Tests, welche Alternativen gibt es, und lohnt es sich für jemanden, der Krafttraining und Laufen macht und schon eine Garmin Forerunner 265 trägt?`;
  const statusAct = it.status === 'offen' ? `<button class="btn is-accent" data-a="wish-order" data-id="${it.id}">${icon('truck')}Bestellt</button>`
    : it.status === 'bestellt' ? `<button class="btn is-accent" data-a="wish-arrived" data-id="${it.id}">${icon('package-check')}Angekommen</button><button class="btn" data-a="wish-back" data-id="${it.id}">${icon('rotate-ccw')}Zurück auf die Wunschliste</button>`
      : `<button class="btn" data-a="wish-back" data-id="${it.id}">${icon('rotate-ccw')}Zurück auf die Wunschliste</button>`;
  openSheet(`<h3 class="sheet-title">${esc(it.n)}</h3>
    ${f.kurz ? `<p class="wish-lead">${esc(f.kurz)}</p>` : ''}
    ${cost}
    ${para('Was es ist', f.was)}${para('Was es dir bringt', f.nutzen)}
    ${f.belege ? `<h5>Was die Forschung sagt</h5>${amp}<p class="wish-p">${esc(f.belege)}</p>` : ''}
    ${f.pro && f.pro.length ? `<h5>Vorteile</h5>${list(f.pro)}` : ''}${f.contra && f.contra.length ? `<h5>Nachteile</h5>${list(f.contra)}` : ''}
    ${para('Alternativen', f.alt)}${f.tipps && f.tipps.length ? `<h5>Vor dem Kauf</h5>${list(f.tipps)}` : ''}
    ${f.free ? `<h5>Erklärung</h5><p class="wish-p is-pre">${esc(f.free)}</p>` : ''}
    ${it.note ? `<h5>Meine Notiz</h5><p class="wish-p is-pre">${esc(it.note)}</p>` : ''}
    ${src.length ? `<h5>Quellen</h5><ul class="wish-src">${src.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ul>` : ''}
    <p class="hint">${it.stand ? `Stand der Infos: ${esc(fmtDate(it.stand, { day: 'numeric', month: 'long', year: 'numeric' }))}. ` : ''}Preise und Modelle ändern sich – vor dem Kauf kurz prüfen.</p>
    <div class="sheet-acts">${statusAct}
      ${it.link && /^https?:\/\//.test(it.link) ? `<a class="btn" href="${esc(it.link)}" target="_blank" rel="noopener">${icon('external-link')}Zum Shop</a>` : ''}
      <a class="btn" href="${esc('https://claude.ai/new?q=' + encodeURIComponent(ask))}" target="_blank" rel="noopener" data-copy="${esc(ask)}">${icon('send')}Mit Claude neu prüfen</a>
      <button class="btn is-ghost" data-a="wish-edit" data-id="${it.id}">${icon('pencil')}Bearbeiten</button></div>`);
}
function sheetWishEdit(id) {
  const it = id ? wishItems().find((x) => x.id === id) : null;
  ui.sheet = { type: 'wish-edit', id: it ? it.id : null, prio: it ? it.prio || 2 : 2 };
  const v = it || { n: '', cat: 'Schlaf', price: '', subYear: '', link: '', note: '', info: {} };
  const own = !it || !WISH_DEFAULT.some((x) => x.id === it.id);
  openSheet(`<h3 class="sheet-title">${it ? 'Produkt bearbeiten' : 'Produkt hinzufügen'}</h3><div class="form">
    <div class="frow is-wide"><span class="flabel">Name</span><div class="fin"><input type="text" id="wi-n" value="${esc(v.n)}" placeholder="z. B. Schlafmaske"></div></div>
    <div class="frow is-wide"><span class="flabel">Kategorie</span><div class="fin"><select id="wi-cat">${WISH_CATS.map((c) => `<option ${c === v.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div></div>
    <div class="frow is-wide"><span class="flabel">Preis</span><div class="fin inv-in"><input type="text" inputmode="decimal" id="wi-price" value="${numIn(v.price, 2)}" placeholder="–"><span>€</span></div></div>
    <div class="frow is-wide"><span class="flabel">Abo pro Jahr</span><div class="fin inv-in"><input type="text" inputmode="decimal" id="wi-sub" value="${numIn(v.subYear, 2)}" placeholder="0"><span>€</span></div></div>
    <div class="frow is-wide"><span class="flabel">Link</span><div class="fin"><input type="url" id="wi-link" value="${esc(v.link || '')}" placeholder="https://…" autocapitalize="off"></div></div></div>
    <h5>Priorität</h5><div class="chips chips-tight">${WISH_PRIO.map(([p, l]) => `<button class="chip chip-xs${ui.sheet.prio === p ? ' is-on' : ''}" data-a="wish-prio" data-v="${p}">${esc(l)}</button>`).join('')}</div>
    ${own ? `<h5>Erklärung</h5><textarea class="note" id="wi-free" rows="6" placeholder="Was es ist, was es bringt, Vor- und Nachteile … oder die Antwort von Claude hier einfügen">${esc((v.info && v.info.free) || '')}</textarea>
      ${it ? '' : `<p class="hint">Tipp: Erst speichern, dann im Produkt „Mit Claude neu prüfen“ antippen und die Antwort hier einfügen.</p>`}` : ''}
    <h5>Meine Notiz</h5><textarea class="note" id="wi-note" rows="2" placeholder="z. B. warten bis Black Friday">${esc(v.note || '')}</textarea>
    <div class="sheet-acts"><button class="btn is-accent" data-a="wish-save">${it ? 'Speichern' : 'Hinzufügen'}</button>${it ? `<button class="btn is-danger" data-a="wish-del" data-id="${it.id}">${icon('trash-2')}Löschen</button>` : '<button class="btn is-ghost" data-a="sheet-close">Abbrechen</button>'}</div>`);
}

Object.assign(A, {
  'wish-open': (el) => sheetWish(el.dataset.id),
  'wish-new': () => sheetWishEdit(null),
  'wish-edit': (el) => sheetWishEdit(el.dataset.id),
  'wish-prio': (el) => { const s = ui.sheet; if (!s) return; s.prio = Number(el.dataset.v); document.querySelectorAll('[data-a="wish-prio"]').forEach((b) => b.classList.toggle('is-on', Number(b.dataset.v) === s.prio)); },
  'wish-order': (el) => {
    const it = wishItems().find((x) => x.id === el.dataset.id); if (!it) return;
    const prev = { status: it.status, at: { ...(it.at || {}) } };
    it.status = 'bestellt'; it.at = { ...(it.at || {}), ordered: todayKey() };
    if (ui.sheet && ui.sheet.type === 'wish') closeSheet();
    wishSave();
    toast(`${it.n} als bestellt markiert`, () => { Object.assign(it, prev); wishSave(); });
  },
  'wish-arrived': (el) => {
    const it = wishItems().find((x) => x.id === el.dataset.id); if (!it) return;
    const prev = { status: it.status, at: { ...(it.at || {}) } };
    it.status = 'da'; it.at = { ...(it.at || {}), arrived: todayKey() };
    if (ui.sheet && ui.sheet.type === 'wish') closeSheet();
    wishSave();
    toast(`${it.n} ist angekommen`, () => { Object.assign(it, prev); wishSave(); });
  },
  'wish-back': (el) => {
    const it = wishItems().find((x) => x.id === el.dataset.id); if (!it) return;
    it.status = 'offen'; if (it.at) { delete it.at.ordered; delete it.at.arrived; }
    closeSheet(); wishSave(); toast('Wieder auf der Wunschliste');
  },
  'wish-save': () => {
    const s = ui.sheet; if (!s || s.type !== 'wish-edit') return;
    const val = (id) => (($('#' + id) || {}).value || '').trim();
    const n = val('wi-n');
    if (!n) { toast('Bitte einen Namen eingeben'); return; }
    const price = parseNum(val('wi-price')), sub = parseNum(val('wi-sub'));
    let link = val('wi-link');
    if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
    const items = wishItems();
    let it = s.id ? items.find((x) => x.id === s.id) : null;
    if (!it) { it = { id: uid(), status: 'offen', at: { added: todayKey() }, info: {} }; items.push(it); }
    Object.assign(it, { n, cat: val('wi-cat') || 'Sonstiges', price: price != null && price >= 0 ? price : null, subYear: sub != null && sub >= 0 ? sub : 0, link, prio: s.prio || 2, note: val('wi-note') });
    if ($('#wi-free')) it.info = { ...(it.info || {}), free: val('wi-free') };
    closeSheet(); wishSave(); toast(s.id ? 'Gespeichert' : `${n} auf der Wunschliste`);
  },
  'wish-del': (el) => {
    const items = wishItems(), i = items.findIndex((x) => x.id === el.dataset.id); if (i < 0) return;
    const [it] = items.splice(i, 1);
    closeSheet(); wishSave();
    toast(`${it.n} gelöscht`, () => { wishItems().splice(i, 0, it); wishSave(); });
  },
});
