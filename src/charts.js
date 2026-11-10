/* ============================================================
   DIAGRAMME (SVG, ohne Bibliothek)
   Linien 2px, Balken max. 24px mit 4px runden Enden, Haarlinien-Raster,
   Tooltips per Tippen (data-tip), Tabellen-Ansicht als Alternative.
   ============================================================ */
const CH = { W: 340, padL: 36, padR: 12, padT: 12, padB: 26 };
const SERIES = { p: '#3987e5', f: '#d95926', c: '#199e70', one: '#3987e5', two: '#8f9bb8' };

function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { lo, hi, ticks, step };
}
function tickFmt(v, step) {
  const a = Math.abs(v);
  if (a >= 10000) return fmt(v / 1000) + 'k';
  if (step != null) return fmt(v, step < 0.1 ? 2 : step < 1 ? 1 : 0);
  return fmt(v, a < 10 && v % 1 ? 1 : 0);
}
function shortDate(k) { const d = parseKey(k); return `${d.getDate()}.${d.getMonth() + 1}.`; }

/* ---------- Fortschrittsring ---------- */
function ringSVG({ pct = 0, ppct = null, state = 'none', size = 76, stroke = 7 }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, cx = size / 2;
  const p = clamp(pct, 0, 100) / 100;
  const pp = ppct != null ? clamp(ppct, 0, 100) / 100 : null;
  const col = `var(--st-${state})`;
  let proj = '';
  if (pp != null && pp > p + 0.01) {
    proj = `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${col}" stroke-opacity=".28" stroke-width="${stroke}" stroke-dasharray="${(pp - p) * c} ${c}" stroke-dashoffset="${-p * c}" transform="rotate(-90 ${cx} ${cx})" stroke-linecap="butt"/>`;
  }
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>
    ${proj}
    ${p > 0 ? `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${Math.max(0.001, p * c - (p < 1 ? 0 : 0))} ${c}" transform="rotate(-90 ${cx} ${cx})"/>` : ''}
  </svg>`;
}

/* ---------- Linien-Diagramm ---------- */
function lineChart({ keys, series, height = 190, band = null, fmtY = tickFmt, unit = '', yMin = null, yMax = null, domain = null }) {
  const W = CH.W, H = height, { padL, padR, padT, padB } = CH;
  const vals = series.flatMap((s) => s.vals.filter((v) => v != null));
  if (!vals.length) return emptyChart('Noch keine Werte im Zeitraum.');
  let mn = Math.min(...vals), mx = Math.max(...vals);
  if (band) { if (band.lo != null) mn = Math.min(mn, band.lo); if (band.hi != null) mx = Math.max(mx, band.hi); }
  if (yMin != null) mn = Math.min(mn, yMin);
  if (yMax != null) mx = Math.max(mx, yMax);
  const pad = (mx - mn) * 0.12 || 1;
  const nt = domain ? niceTicks(domain[0], domain[1], 5) : niceTicks(mn - pad, mx + pad, 4);
  const n = keys.length;
  const xs = (i) => padL + (n === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
  const ys = (v) => padT + (1 - (v - nt.lo) / (nt.hi - nt.lo)) * (H - padT - padB);
  let g = '';
  for (const t of nt.ticks) {
    const y = ys(t);
    g += `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" class="grid"/>`;
    g += `<text x="${padL - 6}" y="${y + 3.5}" class="tick" text-anchor="end">${tickFmt(t, nt.step)}</text>`;
  }
  if (band && band.lo != null) {
    const y1 = ys(band.hi != null ? band.hi : band.lo), y2 = ys(band.lo);
    g += `<rect x="${padL}" y="${Math.min(y1, y2)}" width="${W - padL - padR}" height="${Math.max(1, Math.abs(y2 - y1))}" class="band"/>`;
  }
  const lbl = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);
  for (const i of lbl) g += `<text x="${xs(i)}" y="${H - 8}" class="tick" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${shortDate(keys[i])}</text>`;
  let marks = '';
  series.forEach((s, si) => {
    let d = '', pen = false;
    s.vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`; pen = true; });
    marks += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (s.dots) s.vals.forEach((v, i) => { if (v != null) marks += `<circle cx="${xs(i)}" cy="${ys(v)}" r="2.5" fill="${s.color}"/>`; });
    const li = s.vals.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0).pop();
    if (li != null && si === 0) {
      marks += `<circle cx="${xs(li)}" cy="${ys(s.vals[li])}" r="4.5" fill="${s.color}" stroke="var(--bg-2)" stroke-width="2"/>`;
    }
  });
  let hits = '';
  const slot = (W - padL - padR) / Math.max(1, n - 1);
  keys.forEach((k, i) => {
    const parts = series.map((s) => (s.vals[i] != null ? `${s.name}: ${fmtY(s.vals[i])}${unit ? ' ' + unit : ''}` : null)).filter(Boolean);
    if (!parts.length) return;
    hits += `<rect x="${xs(i) - slot / 2}" y="${padT}" width="${Math.max(slot, 6)}" height="${H - padT - padB}" fill="transparent" data-tip="${esc(fmtDate(k, { weekday: 'short', day: 'numeric', month: 'short' }) + '\n' + parts.join('\n'))}" data-x="${xs(i)}"/>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${g}${marks}<line class="xhair" x1="0" x2="0" y1="${padT}" y2="${H - padB}"/>${hits}</svg>`;
}
function emptyChart(msg) { return `<div class="chart-empty">${esc(msg)}</div>`; }

/* ---------- Gestapelte Säulen (Kalorien aus Protein/Fett/KH) ---------- */
function stackedColumns({ keys, rows, series, height = 200, band = null, unit = 'kcal', empty = 'Noch keine Ernährungsdaten im Zeitraum.' }) {
  const W = CH.W, H = height, { padL, padR, padT, padB } = CH;
  if (!rows.some(Boolean)) return emptyChart(empty);
  const totals = rows.map((r) => (r ? series.reduce((a, s) => a + (r[s.key] || 0), 0) : 0));
  const mxv = Math.max(...totals, band && band.hi ? band.hi : 0);
  if (!mxv) return emptyChart('Noch keine Werte im Zeitraum.');
  const nt = niceTicks(0, mxv * 1.08, 4);
  const n = keys.length;
  const slot = (W - padL - padR) / n;
  const bw = Math.min(24, Math.max(3, slot * 0.62));
  const ys = (v) => padT + (1 - v / nt.hi) * (H - padT - padB);
  let g = '';
  for (const t of nt.ticks) { const y = ys(t); g += `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" class="grid"/><text x="${padL - 6}" y="${y + 3.5}" class="tick" text-anchor="end">${tickFmt(t)}</text>`; }
  if (band && band.lo != null) { const y1 = ys(band.hi), y2 = ys(band.lo); g += `<rect x="${padL}" y="${y1}" width="${W - padL - padR}" height="${Math.max(1, y2 - y1)}" class="band"/>`; }
  let marks = '';
  rows.forEach((r, i) => {
    if (!r) return;
    const x = padL + i * slot + (slot - bw) / 2;
    let acc = 0;
    const segs = series.map((s) => ({ s, v: r[s.key] || 0 })).filter((x) => x.v > 0);
    segs.forEach((sg, si) => {
      const y0 = ys(acc), y1 = ys(acc + sg.v);
      const top = si === segs.length - 1;
      const h = Math.max(0, y0 - y1 - (si > 0 ? 2 : 0));
      const yTop = y1, yBot = y1 + h;
      if (h <= 0) { acc += sg.v; return; }
      const rr = top ? Math.min(4, bw / 2, h) : 0;
      marks += `<path d="M${x},${yBot} V${yTop + rr} Q${x},${yTop} ${x + rr},${yTop} H${x + bw - rr} Q${x + bw},${yTop} ${x + bw},${yTop + rr} V${yBot} Z" fill="${sg.s.color}"/>`;
      acc += sg.v;
    });
    const tip = (unit === 'kcal' ? fmtDate(keys[i], { weekday: 'short', day: 'numeric', month: 'short' }) : 'Woche ab ' + fmtDate(keys[i], { day: 'numeric', month: 'short' })) + `\nGesamt: ${fmt(totals[i])} ${unit}\n` + series.map((s) => `${s.name}: ${fmt(r[s.key] || 0)} ${unit}`).join('\n');
    marks += `<rect x="${padL + i * slot}" y="${padT}" width="${slot}" height="${H - padT - padB}" fill="transparent" data-tip="${esc(tip)}"/>`;
  });
  const lbl = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);
  for (const i of lbl) g += `<text x="${padL + i * slot + slot / 2}" y="${H - 8}" class="tick" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${shortDate(keys[i])}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${g}${marks}</svg>`;
}

/* ---------- Streudiagramm (Zusammenhänge) ---------- */
function scatterChart({ pts, xType, yName, xName, height = 170 }) {
  const W = CH.W, H = height, { padL, padR, padT, padB } = CH;
  if (pts.length < 2) return '';
  const xsV = pts.map((p) => p.x), ysV = pts.map((p) => p.y);
  const xt = niceTicks(Math.min(...xsV), Math.max(...xsV), 4);
  const yt = niceTicks(Math.min(...ysV) - 2, Math.max(...ysV) + 2, 3);
  const X = (v) => padL + ((v - xt.lo) / (xt.hi - xt.lo || 1)) * (W - padL - padR);
  const Y = (v) => padT + (1 - (v - yt.lo) / (yt.hi - yt.lo || 1)) * (H - padT - padB);
  const xf = (v) => (xType === 'time' ? minToTime(v) : xType === 'bool' ? (v ? 'ja' : 'nein') : tickFmt(v));
  let g = '';
  for (const t of yt.ticks) g += `<line x1="${padL}" x2="${W - padR}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/><text x="${padL - 6}" y="${Y(t) + 3.5}" class="tick" text-anchor="end">${tickFmt(t)}</text>`;
  for (const t of xt.ticks) g += `<text x="${X(t)}" y="${H - 8}" class="tick" text-anchor="middle">${xf(t)}</text>`;
  const r = pearson(pts);
  if (r != null && xType !== 'bool') {
    const mx = mean(xsV), my = mean(ysV);
    let sxy = 0, sxx = 0; pts.forEach((p) => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; });
    const b = sxy / sxx, a = my - b * mx;
    g += `<line x1="${X(xt.lo)}" y1="${Y(a + b * xt.lo)}" x2="${X(xt.hi)}" y2="${Y(a + b * xt.hi)}" stroke="var(--ink-3)" stroke-width="1.5"/>`;
  }
  let m = '';
  for (const p of pts) {
    m += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="4.5" fill="${SERIES.one}" stroke="var(--bg-2)" stroke-width="2"/>`;
    m += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="12" fill="transparent" data-tip="${esc(`${fmtDate(p.k, { weekday: 'short', day: 'numeric', month: 'short' })}\n${xName}: ${xf(p.x)}\n${yName} danach: ${fmt(p.y)}`)}"/>`;
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${g}${m}</svg>`;
}

/* ---------- Tagesbogen (Hero auf „Heute“) ---------- */
function dayArcSVG(k) {
  const W = 360, H = 184, cx = 180, cy = 158, rx = 158, ry = 132;
  const r = rhythm(k), wake = r.wake, sleep = r.bed;
  const span = sleep - wake;
  const pos = (t) => { const p = clamp((t - wake) / span, 0, 1); const a = Math.PI * (1 - p); return [cx + rx * Math.cos(a), cy - ry * Math.sin(a)]; };
  const arc = (t1, t2) => { let d = ''; const steps = Math.max(4, Math.round(((t2 - t1) / span) * 60)); for (let i = 0; i <= steps; i++) { const [x, y] = pos(t1 + ((t2 - t1) * i) / steps); d += `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; } return d; };
  const now = nowMin();
  const isToday = k === todayKey();
  const [cafA, cafB] = cafWindow(k);
  let s = `<svg class="arc-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <defs><radialGradient id="sunglow"><stop offset="0" stop-color="var(--sun)" stop-opacity=".55"/><stop offset="1" stop-color="var(--sun)" stop-opacity="0"/></radialGradient></defs>
    <line x1="6" x2="${W - 6}" y1="${cy}" y2="${cy}" class="arc-horizon"/>
    <path d="${arc(wake, sleep)}" class="arc-track"/>
    <path d="${arc(cafA, cafB)}" class="arc-coffee"/>
    <path d="${arc(sleep - 60, sleep)}" class="arc-screens"/>`;
  if (isToday && now > wake) s += `<path d="${arc(wake, Math.min(now, sleep))}" class="arc-done"/>`;
  const d = getDay(k), variant = dayVariant(k);
  for (const b of S.settings.plan) {
    const t = resolveBlockTime(b, d);
    if (t == null) continue;
    const req = b.items.filter((it) => !it.opt && itemInVariant(it, variant));
    if (!req.length) continue;
    const done = req.filter((it) => d.checks[it.id]).length;
    const [x, y] = pos(t);
    const full = done === req.length, part = done > 0 && !full;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" class="arc-dot ${full ? 'is-full' : part ? 'is-part' : ''}"/>`;
    if (full) s += `<path d="M${x - 3},${y} l2,2.2 l4,-4.4" class="arc-tick"/>`;
  }
  if (isToday) {
    if (now >= wake && now <= sleep) {
      const [x, y] = pos(now);
      s += `<circle cx="${x}" cy="${y}" r="22" fill="url(#sunglow)"/><circle cx="${x}" cy="${y}" r="8" class="arc-sun"/>`;
    } else {
      const [x, y] = now > sleep ? pos(sleep) : pos(wake);
      s += `<circle cx="${x}" cy="${y}" r="7" class="arc-moon"/><circle cx="${x + 3.5}" cy="${y - 2.5}" r="6" fill="var(--bg)"/>`;
    }
  }
  s += `<text x="10" y="${cy + 22}" class="arc-end">${minToTime(wake)}</text><text x="${W - 10}" y="${cy + 22}" class="arc-end" text-anchor="end">${minToTime(sleep)}</text>`;
  s += '</svg>';
  return s;
}
