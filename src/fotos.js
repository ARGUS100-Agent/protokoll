/* ============================================================
   FOTOS MIT SCHABLONE, PHYSIQUE-FOTOS, FOTOS IM BACKUP (seit 2.15.0)
   - Kamera in der App: blendet das letzte Foto derselben Pose halbtransparent ein (gleiche Haltung, gleicher Abstand),
     Timer 3 oder 10 s, Front-/Rückkamera. Gilt für Physique-Fotos (Vorne, Seite, Hinten) und die Haut-Wochenfotos.
   - Vergleich mit Schieber, Zeitraffer je Pose, Monatspaar in der Monatskarte.
   - Wunsch vom 18.11.2026: Fotos gehören ins normale Backup, damit Claude sie auswerten kann (zweite Meinung).
     Im Backup verkleinert (1080 px, JPEG 75 %), damit die Datei handlich bleibt; volle Größe weiter als ZIP.
   ============================================================ */
/*icons: camera images play switch-camera timer x share*/
const PHYS_ANGLES = [{ id: 'p_front', n: 'Vorne' }, { id: 'p_side', n: 'Seite' }, { id: 'p_back', n: 'Hinten' }];
function isPhys(angle) { return String(angle || '').startsWith('p_'); }
function angleName(a) { const x = PHOTO_ANGLES.concat(PHYS_ANGLES).find((y) => y.id === a); return x ? x.n : a; }
function physWeeks() { return [...new Set(photoIdx.keys.filter((k) => isPhys(k.split('|')[1])).map((k) => k.split('|')[0]))].sort().reverse(); }
function physKeysOf(angle) { return photoIdx.keys.filter((k) => k.split('|')[1] === angle).sort(); }

/* ---------- Physique-Ansicht ---------- */
function vKoerperFotos() {
  if (!photoIdx.loaded) { loadPhotoIndex().then(() => { if (ui.tab === 'koerper') render(); }); return '<p class="hint">Fotos werden geladen …</p>'; }
  if (!PhotoDB.ok) return emptyState('Fotos können auf diesem Gerät nicht gespeichert werden (kein IndexedDB).');
  const cur = weekStart(todayKey()), ws = ui.physWeek || cur, st = koerperDue();
  let h = `<section class="sec"><div class="sec-head"><h2>${icon('camera')} Physique-Fotos</h2><span class="count">${st.lastP ? `zuletzt KW ${isoWeek(st.lastP)}` : 'noch keine'}</span></div>
    <p class="sec-sub">Alle ${st.every} Tage morgens nüchtern, gleiches Licht, Handy auf Hüfthöhe etwa 2 m entfernt, Timer an, entspannt stehen. Die Kamera blendet dein letztes Foto als Schablone ein – so stimmen Pose und Abstand.</p>
    <div class="week-nav"><button class="icon-btn" data-a="phys-week" data-d="-7" aria-label="Vorherige Woche">${icon('chevron-left')}</button><span>KW ${isoWeek(ws)} · ab ${esc(fmtDate(ws, { day: 'numeric', month: 'short' }))}</span><button class="icon-btn" data-a="phys-week" data-d="7" ${ws >= cur ? 'disabled' : ''} aria-label="Nächste Woche">${icon('chevron-right')}</button></div>
    <div class="ph-grid is-3">`;
  for (const a of PHYS_ANGLES) {
    const key = photoKey(ws, a.id), has = photoIdx.keys.includes(key);
    h += has
      ? `<div class="ph-slot"><button class="ph" data-a="photo-view" data-key="${key}" aria-label="${esc(a.n)} ansehen"><img data-photo="${key}" alt="${esc(a.n)}"></button><div class="ph-cap"><b>${esc(a.n)}</b><button class="link-btn" data-a="cam-open" data-ws="${ws}" data-angle="${a.id}">Neu</button></div></div>`
      : `<div class="ph-slot"><button class="ph is-add" data-a="cam-open" data-ws="${ws}" data-angle="${a.id}">${icon('camera')}<span>${esc(a.n)}</span></button><div class="ph-cap"><b>${esc(a.n)}</b><label class="link-btn">aus Fotos<input type="file" accept="image/*" data-c="photo-up" data-angle="${a.id}" data-ws="${ws}" hidden></label></div></div>`;
  }
  h += '</div></section>';
  h += physCompareHTML() + physTimelapseHTML();
  const weeks = physWeeks();
  if (weeks.length) h += `<section class="sec"><div class="sec-head"><h2>Galerie</h2><span class="count">${weeks.length} ${weeks.length === 1 ? 'Check' : 'Checks'}</span></div><div class="list">${weeks.map((w) => `<button class="row gal-row" data-a="phys-week-go" data-ws="${w}"><span class="row-main"><b>KW ${isoWeek(w)}</b><small>${esc(fmtDate(w, { day: 'numeric', month: 'short', year: 'numeric' }))} · ${PHYS_ANGLES.filter((a) => photoIdx.keys.includes(photoKey(w, a.id))).length}/3 Fotos</small></span>${icon('chevron-right')}</button>`).join('')}</div>
    <p class="hint">Die Fotos sind im Backup enthalten (verkleinert). So kann Claude sie mit auswerten.</p></section>`;
  return h;
}
function physAng() { return PHYS_ANGLES.some((a) => a.id === ui.physAng) ? ui.physAng : 'p_front'; }
function angChips(cur) { return `<div class="chips chips-tight">${PHYS_ANGLES.map((a) => `<button class="chip chip-xs${a.id === cur ? ' is-on' : ''}" data-a="phys-ang" data-v="${a.id}">${esc(a.n)}</button>`).join('')}</div>`; }
function physCompareHTML() {
  const weeks = physWeeks();
  if (weeks.length < 2) return '';
  const ang = physAng();
  const cmp = ui.physCmp && weeks.includes(ui.physCmp[0]) && weeks.includes(ui.physCmp[1]) ? ui.physCmp : [weeks[weeks.length - 1], weeks[0]];
  const opt = (sel, i) => `<label class="choice-select">${icon('chevron-down')}<select data-c="phys-cmp" data-n="${i}" aria-label="Check ${i + 1}">${weeks.map((w) => `<option value="${w}" ${w === sel ? 'selected' : ''}>KW ${isoWeek(w)} (${fmtDate(w, { day: 'numeric', month: 'short' })})</option>`).join('')}</select></label>`;
  const ka = photoKey(cmp[0], ang), kb = photoKey(cmp[1], ang), both = photoIdx.keys.includes(ka) && photoIdx.keys.includes(kb);
  return `<section class="sec"><div class="sec-head"><h2>Vergleich</h2></div>${angChips(ang)}<div class="cmp-sel">${opt(cmp[0], 0)}${opt(cmp[1], 1)}</div>
    ${both ? `<div class="cmp-slide" style="--x:50%"><img data-photo="${ka}" data-full="1" alt="Vorher"><img class="cmp-top" data-photo="${kb}" data-full="1" alt="Nachher"><i class="cmp-bar"></i><input type="range" min="0" max="100" value="50" data-i="cmp-x" aria-label="Vergleich verschieben"></div><div class="cmp-cap"><span>KW ${isoWeek(cmp[0])}</span><span>KW ${isoWeek(cmp[1])}</span></div>` : `<p class="hint">Für ${esc(angleName(ang))} fehlt in einem der beiden Checks das Foto.</p>`}</section>`;
}
function physTimelapseHTML() {
  const ang = physAng(), keys = physKeysOf(ang);
  if (keys.length < 2) return '';
  const k0 = keys[keys.length - 1];
  return `<section class="sec"><div class="sec-head"><h2>${icon('play')} Zeitraffer</h2><span class="count">${keys.length} Fotos · ${esc(angleName(ang))}</span></div>
    <div class="tl-box"><img id="tl-img" data-photo="${k0}" data-full="1" alt=""><span class="tl-date" id="tl-date">KW ${isoWeek(k0.split('|')[0])}</span></div>
    <div class="row-btns"><button class="pill-btn is-accent" data-a="tl-play" data-ang="${ang}">${icon('play')}Abspielen</button></div></section>`;
}
function physMonthPair(first, last) {
  const keys = physKeysOf('p_front');
  if (!keys.length || !photoIdx.loaded) return '';
  const wk = (x) => x.split('|')[0];
  const b = keys.filter((x) => wk(x) <= last && wk(x) >= addDays(first, -6)).pop();
  if (!b) return '';
  const a = keys.filter((x) => wk(x) < wk(b) && wk(x) < weekStart(first)).pop();
  const fig = (x) => `<figure><button class="ph" data-a="photo-view" data-key="${x}"><img data-photo="${x}" alt=""></button><figcaption>KW ${isoWeek(wk(x))}</figcaption></figure>`;
  return `<div class="month-ph">${a ? fig(a) : ''}${fig(b)}</div>`;
}

/* ---------- Kamera mit Schablone ---------- */
const CAM = { stream: null, facing: 'user', timer: 0, ghost: 40, ws: null, angle: null, busy: false, tick: null };
function camSet() { return isPhys(CAM.angle) ? PHYS_ANGLES : PHOTO_ANGLES; }
async function camOpen(ws, angle) {
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { toast('Kamera nicht verfügbar – nimm das Foto über „aus Fotos“'); return; }
  CAM.ws = ws; CAM.angle = angle;
  let el = document.getElementById('cam');
  if (!el) { el = document.createElement('div'); el.id = 'cam'; el.className = 'cam'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Kamera'); document.body.appendChild(el); }
  document.documentElement.classList.add('noscroll');
  const mir = CAM.facing === 'user' ? ' is-mirror' : '';
  el.innerHTML = `<video id="cam-v" class="cam-v${mir}" playsinline muted autoplay></video><img id="cam-g" class="cam-g${mir}" alt="" style="opacity:${CAM.ghost / 100}"><div class="cam-guide"></div>
    <div class="cam-top"><div><b id="cam-t">${esc(angleName(angle))}</b><small id="cam-hint">Schablone wird geladen …</small></div><button class="icon-btn" data-a="cam-close" aria-label="Kamera schließen">${icon('x')}</button></div>
    <div class="cam-count" id="cam-count"></div>
    <div class="cam-bot"><label class="cam-op"><span>Schablone</span><input type="range" min="0" max="80" value="${CAM.ghost}" data-i="cam-ghost" aria-label="Deckkraft der Schablone"></label>
      <div class="cam-row"><button class="cam-btn" data-a="cam-timer">${icon('timer')}<span id="cam-tm">${CAM.timer ? CAM.timer + ' s' : 'Timer aus'}</span></button><button class="cam-shutter" data-a="cam-shot" aria-label="Foto aufnehmen"></button><button class="cam-btn" data-a="cam-flip">${icon('switch-camera')}<span>Wechseln</span></button></div></div>`;
  await camStart();
  camGhost();
}
async function camStart() {
  camStop();
  try {
    CAM.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: CAM.facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
    const v = document.getElementById('cam-v');
    if (!v) { camStop(); return; }
    v.srcObject = CAM.stream;
    await v.play().catch(() => {});
  } catch (e) {
    camClose(false);
    toast('Kein Kamerazugriff – erlaube ihn in den Einstellungen oder nimm das Foto über „aus Fotos“');
  }
}
function camStop() { if (CAM.stream) { CAM.stream.getTracks().forEach((t) => t.stop()); CAM.stream = null; } }
function camClose(rerender = true) {
  camStop(); clearTimeout(CAM.tick);
  const el = document.getElementById('cam');
  if (el) el.remove();
  document.documentElement.classList.remove('noscroll');
  if (rerender) render();
}
async function camGhost() {
  const own = photoKey(CAM.ws, CAM.angle), all = photoIdx.keys.filter((k) => k.split('|')[1] === CAM.angle && k !== own).sort();
  const prev = all.filter((k) => k.split('|')[0] < CAM.ws).pop() || all.pop();
  const g = document.getElementById('cam-g'), hint = document.getElementById('cam-hint');
  if (!prev) { if (g) g.removeAttribute('src'); if (hint) hint.textContent = 'Erstes Foto dieser Pose – ab dem nächsten Mal mit Schablone'; return; }
  const u = await photoUrl(prev, true).catch(() => null);
  if (g && u) g.src = u;
  if (hint) hint.textContent = `Schablone: KW ${isoWeek(prev.split('|')[0])} – stell dich so hin, dass ihr euch deckt`;
}
function camCountdown(s) {
  return new Promise((res) => {
    const el = document.getElementById('cam-count');
    let n = s;
    const step = () => { if (el) el.textContent = n > 0 ? String(n) : ''; if (n <= 0) { res(); return; } n--; CAM.tick = setTimeout(step, 1000); };
    step();
  });
}
async function camShot() {
  if (CAM.busy) return;
  const v = document.getElementById('cam-v');
  if (!v || !v.videoWidth) { toast('Kamera ist noch nicht bereit'); return; }
  CAM.busy = true;
  try {
    if (CAM.timer) await camCountdown(CAM.timer);
    if (!document.getElementById('cam')) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    const blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Aufnahme fehlgeschlagen'))), 'image/jpeg', 0.92));
    await savePhoto(CAM.ws, CAM.angle, blob, todayKey());
    toast(`${angleName(CAM.angle)} gespeichert`);
    const next = camSet().find((a) => !photoIdx.keys.includes(photoKey(CAM.ws, a.id)));
    if (next) { CAM.angle = next.id; const t = document.getElementById('cam-t'); if (t) t.textContent = next.n; camGhost(); }
    else camClose();
  } catch (e) { toast('Foto konnte nicht gespeichert werden: ' + (e.message || e)); }
  finally { CAM.busy = false; }
}
function camFlip() {
  CAM.facing = CAM.facing === 'user' ? 'environment' : 'user';
  for (const id of ['cam-v', 'cam-g']) { const el = document.getElementById(id); if (el) el.classList.toggle('is-mirror', CAM.facing === 'user'); }
  camStart();
}

/* ---------- Zeitraffer ---------- */
const TL = { on: false, t: null };
async function tlPlay(ang, btn) {
  if (TL.on) { TL.on = false; clearTimeout(TL.t); if (btn) btn.innerHTML = `${icon('play')}Abspielen`; return; }
  const keys = physKeysOf(ang);
  if (keys.length < 2) return;
  TL.on = true;
  if (btn) btn.innerHTML = `${icon('x')}Stopp`;
  let i = 0;
  const step = async () => {
    const img = document.getElementById('tl-img'), lab = document.getElementById('tl-date');
    if (!TL.on || !img) { TL.on = false; return; }
    const u = await photoUrl(keys[i], true).catch(() => null);
    if (u) img.src = u;
    if (lab) lab.textContent = `KW ${isoWeek(keys[i].split('|')[0])} · ${i + 1}/${keys.length}`;
    i++;
    if (i < keys.length) TL.t = setTimeout(step, 750);
    else { TL.on = false; if (btn) btn.innerHTML = `${icon('play')}Nochmal`; }
  };
  step();
}

/* ---------- Fotos im Backup ---------- */
function backupPhotoMode() { return ['alle', '12w', 'keine'].includes(S.settings.backupPhotos) ? S.settings.backupPhotos : 'alle'; }
function blobB64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(blob); }); }
function b64Bytes(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
async function photosForBackup(mode = backupPhotoMode()) {
  if (mode === 'keine' || !PhotoDB.ok) return [];
  let keys = [];
  try { keys = ((await PhotoDB.keys()) || []).slice().sort(); } catch (e) { return []; }
  const cut = addDays(todayKey(), -84), firstOf = {};
  for (const k of keys) { const a = k.split('|')[1]; if (!firstOf[a]) firstOf[a] = k; }
  const out = [];
  for (const key of keys) {
    const [ws, angle] = key.split('|');
    if (mode === '12w' && ws < cut && firstOf[angle] !== key) continue;
    const rec = await PhotoDB.get(key);
    if (!rec || !rec.full) continue;
    let blob = new Blob([rec.full], { type: rec.type || 'image/jpeg' });
    try { blob = (await compressImage(blob, 1080, 0.75)).blob; } catch (e) { /* Original nehmen */ }
    out.push({ key, kind: isPhys(angle) ? 'koerper' : 'haut', angle, n: angleName(angle), week: ws, date: rec.date || ws, jpg: await blobB64(blob) });
  }
  return out;
}
async function importBackupPhotos(list) {
  if (!Array.isArray(list) || !list.length || !PhotoDB.ok) return 0;
  let have = [];
  try { have = (await PhotoDB.keys()) || []; } catch (e) { return 0; }
  let n = 0;
  for (const p of list) {
    if (!p || typeof p.key !== 'string' || !p.jpg || have.includes(p.key)) continue;
    const [ws, angle] = p.key.split('|');
    if (!ws || !angle) continue;
    try {
      const u = b64Bytes(p.jpg), blob = new Blob([u], { type: 'image/jpeg' }), th = await compressImage(blob, 420, 0.78);
      await PhotoDB.put(p.key, { week: p.week || ws, angle, date: p.date || ws, w: null, h: null, type: 'image/jpeg', full: u.buffer, thumb: await th.blob.arrayBuffer() });
      n++;
    } catch (e) { /* einzelnes Foto überspringen */ }
  }
  await loadPhotoIndex();
  return n;
}
function backupPhotoHTML() {
  const m = backupPhotoMode(), n = photoIdx.loaded ? photoIdx.keys.length : null;
  return `<h5>Fotos im Backup</h5><div class="chips chips-tight">${[['alle', 'alle'], ['12w', 'letzte 12 Wochen + erste Fotos'], ['keine', 'keine']].map(([v, l]) => `<button class="chip chip-xs${m === v ? ' is-on' : ''}" data-a="backup-photos" data-v="${v}">${l}</button>`).join('')}</div>
    <p class="hint">${n != null ? `${n} Fotos gespeichert (Haut und Körper), im Backup etwa ${fmt(Math.max(0.1, n * 0.2), 1)} MB. ` : ''}Im Backup stecken sie verkleinert (1080 px) – genug, damit Claude sie auswerten kann. Volle Größe sicherst du als ZIP.</p>`;
}

Object.assign(A, {
  'cam-open': (el) => camOpen(el.dataset.ws, el.dataset.angle),
  'cam-close': () => camClose(),
  'cam-shot': () => camShot(),
  'cam-flip': () => camFlip(),
  'cam-timer': () => { CAM.timer = CAM.timer === 0 ? 3 : CAM.timer === 3 ? 10 : 0; const t = document.getElementById('cam-tm'); if (t) t.textContent = CAM.timer ? CAM.timer + ' s' : 'Timer aus'; },
  'phys-week': (el) => { const cur = weekStart(todayKey()); const w = addDays(ui.physWeek || cur, Number(el.dataset.d)); ui.physWeek = w > cur ? cur : w; render(); },
  'phys-week-go': (el) => { ui.physWeek = el.dataset.ws; render(); window.scrollTo(0, 0); },
  'phys-ang': (el) => { ui.physAng = el.dataset.v; TL.on = false; render(); },
  'tl-play': (el) => tlPlay(el.dataset.ang, el),
  'backup-photos': (el) => { S.settings.backupPhotos = el.dataset.v; saveSettings(); },
  'photo-share': async (el) => {
    const rec = await PhotoDB.get(el.dataset.key).catch(() => null);
    if (!rec) return;
    const [ws, angle] = el.dataset.key.split('|');
    await shareFile(new Blob([rec.full], { type: rec.type || 'image/jpeg' }), `${rec.date || ws}_${angle}.jpg`, angleName(angle));
  },
});
Object.assign(I, {
  'cam-ghost': (el) => { CAM.ghost = Number(el.value); const g = document.getElementById('cam-g'); if (g) g.style.opacity = String(CAM.ghost / 100); },
  'cmp-x': (el) => { const box = el.closest('.cmp-slide'); if (box) box.style.setProperty('--x', el.value + '%'); },
});
Object.assign(C, {
  'phys-cmp': (el) => { const weeks = physWeeks(); const cur = ui.physCmp && ui.physCmp.length === 2 ? ui.physCmp.slice() : [weeks[weeks.length - 1], weeks[0]]; cur[Number(el.dataset.n)] = el.value; ui.physCmp = cur; render(); },
});
