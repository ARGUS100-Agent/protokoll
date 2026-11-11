/*
 * Protokoll – Weiterleitung für Garmin, Mitteilungen und Frank-KI (Cloudflare Worker), Version 4
 *
 * 1) Garmin: Garmin lässt Web-Apps nicht direkt an die Personal API (CORS). Der Worker
 *    reicht die Anfragen der Protokoll-App an Garmin weiter und gibt die Antwort zurück.
 *    Er speichert davon nichts. Der Garmin-Schlüssel bleibt in der App auf deinem Gerät.
 * 2) Mitteilungen (ab Version 3, optional): Die App lädt ihren Plan für die nächsten Tage
 *    hierher. Der Zeitplan (Cron) schickt jede Mitteilung zur geplanten Zeit als Web-Push,
 *    Ende-zu-Ende verschlüsselt an dein iPhone. Dafür braucht der Worker einen KV-Speicher
 *    mit dem Namen PUSH. Darin liegen: dein Mitteilungs-Abo, die geplanten Texte (bis sie
 *    verschickt sind), ein eigener Signier-Schlüssel (VAPID) und der Prüfwert deines
 *    Geräte-Schlüssels. Nur das Gerät, das die Mitteilungen zuerst eingerichtet hat, darf
 *    sie ändern.
 *
 * 3) Frank-KI (ab Version 4, optional): Mit dem Geheimnis ANTHROPIC_API_KEY ruft der Worker
 *    Claude für die App auf (Fotos von Essen, Laborberichten, Kassenbons; Fragen; Wochen-Agent).
 *    Monatsbudget über AI_BUDGET_USD (Standard 1 $); darüber lehnt der Worker ab.
 * 4) Garmin im Hintergrund (ab Version 4, optional): Mit dem Geheimnis GARMIN_KEY holt der Worker
 *    morgens deinen Schlaf und schickt ein Morgen-Briefing als Mitteilung. Er speichert davon nur,
 *    dass das Briefing für heute verschickt ist.
 *
 * Einrichten: Cloudflare → Workers & Pages → Worker anlegen → Code durch diesen ersetzen →
 * Deploy. Für Mitteilungen zusätzlich: Speicher (KV) anlegen und als „PUSH“ binden,
 * unter Einstellungen → Trigger einen Cron-Trigger „* * * * *“ (jede Minute) hinzufügen.
 * Für Frank-KI und Garmin im Hintergrund: Einstellungen → Variablen und Geheimnisse →
 * „Geheimnis“ ANTHROPIC_API_KEY bzw. GARMIN_KEY hinzufügen.
 */
const APP_ORIGIN = 'https://argus100-agent.github.io';
const APP_URL = 'https://argus100-agent.github.io/protokoll/';
const GARMIN = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const DATA_PATH = /^\/[a-z][a-z0-9-]*-service\/[A-Za-z0-9/_.-]+$/; // nur Lesen (GET) von Garmin-Diensten
const PUSH_HOSTS = /(^|\.)push\.apple\.com$|^fcm\.googleapis\.com$|(^|\.)push\.services\.mozilla\.com$|(^|\.)notify\.windows\.com$/;
const PUSH_MAX = 80; // geplante Mitteilungen
const VERSION = 4;
const AI_URL = 'https://api.anthropic.com/v1/messages';
const AI_MODELS = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5' };
const AI_PRICE = { haiku: [0.10, 0.50], sonnet: [2, 10] }; // $ pro Million Token (Eingabe, Ausgabe), Stand Okt./Nov. 2026

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': APP_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Accept, Content-Type, X-Push-Key',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    };
    const text = (status, msg) => new Response(msg, { status, headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' } });
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/') return text(200, `Protokoll-Weiterleitung läuft (v${VERSION})${env && env.PUSH ? ' · Mitteilungen bereit' : ''}`);
    if (request.headers.get('Origin') !== APP_ORIGIN) return text(403, 'Weiterleitung: nur für die Protokoll-App');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname.startsWith('/push/')) return pushApi(request, env || {}, url.pathname.slice(6), cors);
    if (url.pathname.startsWith('/ai/')) return aiApi(request, env || {}, url.pathname.slice(4), cors);
    const isToken = request.method === 'POST' && url.pathname === TOKEN_PATH;
    const isData = request.method === 'GET' && DATA_PATH.test(url.pathname) && !url.pathname.includes('..');
    if (!isToken && !isData) return text(403, 'Weiterleitung: Pfad nicht erlaubt');
    const auth = request.headers.get('Authorization') || '';
    if (!(isToken ? /^ApiKey \S+$/ : /^Bearer \S+$/).test(auth)) return text(401, 'Weiterleitung: Anmeldung fehlt');
    let res;
    try {
      res = await fetch(GARMIN + url.pathname + url.search, {
        method: request.method,
        headers: { Authorization: auth, Accept: isToken ? '*/*' : 'application/json', 'User-Agent': `protokoll-relay/${VERSION}` },
        redirect: 'manual',
      });
    } catch (e) {
      return text(502, 'Weiterleitung: Garmin nicht erreichbar');
    }
    const headers = new Headers(cors);
    headers.set('Content-Type', res.headers.get('Content-Type') || 'application/json');
    return new Response(res.body, { status: res.status, headers });
  },
  /* Zeitplan (Cron): fällige Mitteilungen verschicken, Morgen-Briefing, Wochen-Agent */
  async scheduled(event, env, ctx) {
    const p = Promise.all([pushRun(env || {}), briefRun(env || {}).catch(() => null), weekRun(env || {}).catch(() => null)]);
    if (ctx && ctx.waitUntil) ctx.waitUntil(p); else await p;
  },
};

/* ---------- Mitteilungen: Schnittstelle für die App ---------- */
async function pushApi(request, env, op, cors) {
  const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
  if (request.method !== 'POST') return json(405, { err: 'method' });
  if (!env.PUSH) return json(501, { err: 'kv', msg: 'Speicher fehlt: KV-Namespace als „PUSH“ an den Worker binden.' });
  const key = request.headers.get('X-Push-Key') || '';
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(key)) return json(401, { err: 'key' });
  const raw = await request.text();
  if (raw.length > 200000) return json(413, { err: 'size' });
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, { err: 'json' }); }
  const hash = b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)));
  const cfg = await env.PUSH.get('cfg', 'json');
  if (op === 'setup') {
    if (cfg && cfg.hash !== hash) return json(403, { err: 'fremd', msg: 'Dieser Worker ist schon mit einem anderen Gerät verbunden.' });
    let c = cfg;
    if (!c) {
      const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      c = { hash, jwk: await crypto.subtle.exportKey('jwk', kp.privateKey), pub: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)) };
      await env.PUSH.put('cfg', JSON.stringify(c));
    }
    return json(200, { pub: c.pub, v: VERSION });
  }
  if (!cfg || cfg.hash !== hash) return json(403, { err: 'key' });
  if (op === 'subscribe') {
    const s = body.sub || {};
    let host = '';
    try { const u = new URL(s.endpoint); host = u.protocol === 'https:' ? u.hostname : ''; } catch (e) { host = ''; }
    const k = s.keys || {};
    if (!PUSH_HOSTS.test(host) || !/^[A-Za-z0-9_-]{80,100}$/.test(k.p256dh || '') || !/^[A-Za-z0-9_-]{16,32}$/.test(k.auth || '')) return json(400, { err: 'sub' });
    await env.PUSH.put('sub', JSON.stringify({ endpoint: s.endpoint, keys: { p256dh: k.p256dh, auth: k.auth } }));
    return json(200, { ok: true });
  }
  if (op === 'schedule') {
    const now = Date.now();
    const str = (v, n) => String(v == null ? '' : v).slice(0, n);
    const items = (Array.isArray(body.items) ? body.items : [])
      .filter((x) => x && Number.isFinite(x.at) && x.at > now - 3600000 && x.at < now + 4 * 86400000 && x.title)
      .map((x) => ({ at: Math.round(x.at), title: str(x.title, 120), body: str(x.body, 600), tag: str(x.tag, 40).replace(/[^A-Za-z0-9_-]/g, ''), url: /^#[a-z0-9_-]{0,40}$/.test(x.url || '') ? x.url : '' }))
      .sort((a, b) => a.at - b.at)
      .slice(0, PUSH_MAX);
    await env.PUSH.put('sched', JSON.stringify(items));
    if (body.ctx && typeof body.ctx === 'object') await env.PUSH.put('ctx', JSON.stringify(body.ctx).slice(0, 20000));
    if (body.week && typeof body.week === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(body.week.ws || '')) await env.PUSH.put('weekin', JSON.stringify(body.week).slice(0, 60000));
    return json(200, { ok: true, n: items.length, v: VERSION });
  }
  if (op === 'test') {
    const sub = await env.PUSH.get('sub', 'json');
    if (!sub) return json(409, { err: 'sub' });
    const r = await pushSend(cfg, sub, { title: 'Protokoll', body: str2(body.body) || 'Mitteilungen funktionieren.', tag: 'test', url: '#heute' });
    if (r.gone) await env.PUSH.delete('sub');
    return json(r.ok ? 200 : 502, { ok: r.ok, status: r.status, gone: !!r.gone });
  }
  if (op === 'status') {
    const [sub, sched, state] = await Promise.all([env.PUSH.get('sub', 'json'), env.PUSH.get('sched', 'json'), env.PUSH.get('state', 'json')]);
    const st = state || {};
    const open = (sched || []).filter((x) => x.at > (st.upTo || 0));
    return json(200, { sub: !!sub, n: open.length, next: open[0] ? open[0].at : null, last: st.last || null, sent: st.sent || 0, err: st.err || null, v: VERSION });
  }
  if (op === 'off') {
    await Promise.all([env.PUSH.delete('sub'), env.PUSH.delete('sched')]);
    return json(200, { ok: true });
  }
  return json(404, { err: 'op' });
}
function str2(v) { return typeof v === 'string' ? v.slice(0, 300) : ''; }

/* ---------- Zeitplan: verschickt, was fällig ist (höchstens 20 Min. zu spät) ---------- */
async function pushRun(env) {
  if (!env.PUSH) return { sent: 0 };
  const sched = await env.PUSH.get('sched', 'json');
  if (!Array.isArray(sched) || !sched.length) return { sent: 0 };
  const now = Date.now();
  const state = (await env.PUSH.get('state', 'json')) || {};
  const upTo = state.upTo || 0;
  const due = sched.filter((x) => x.at > upTo && x.at <= now + 30000);
  if (!due.length) return { sent: 0 };
  const [cfg, sub] = await Promise.all([env.PUSH.get('cfg', 'json'), env.PUSH.get('sub', 'json')]);
  let sent = 0;
  if (cfg && sub) {
    const fresh = due.filter((x) => x.at > now - 20 * 60000).slice(-4);
    for (const m of fresh) {
      const r = await pushSend(cfg, sub, m);
      state.last = now;
      if (r.ok) { sent++; state.sent = (state.sent || 0) + 1; state.err = null; } else state.err = `HTTP ${r.status}`;
      if (r.gone) { await env.PUSH.delete('sub'); state.err = 'Abo abgelaufen'; break; }
    }
  }
  state.upTo = Math.max(upTo, ...due.map((x) => x.at));
  await env.PUSH.put('state', JSON.stringify(state));
  return { sent };
}

/* ---------- Web Push: VAPID (RFC 8292) und Verschlüsselung aes128gcm (RFC 8291) ---------- */
async function pushSend(cfg, sub, msg) {
  let endpoint;
  try { endpoint = new URL(sub.endpoint); } catch (e) { return { ok: false, status: 0, gone: true }; }
  if (endpoint.protocol !== 'https:' || !PUSH_HOSTS.test(endpoint.hostname)) return { ok: false, status: 0, gone: true };
  const payload = new TextEncoder().encode(JSON.stringify({ title: msg.title, body: msg.body || '', tag: msg.tag || '', url: msg.url || '' }));
  const jwt = await vapidJwt(cfg, endpoint.origin);
  const body = await pushEncrypt(sub.keys.p256dh, sub.keys.auth, payload);
  const headers = { Authorization: `vapid t=${jwt}, k=${cfg.pub}`, TTL: '3600', Urgency: 'normal', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream' };
  const topic = String(msg.tag || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  if (topic) headers.Topic = topic;
  let res;
  try { res = await fetch(endpoint.href, { method: 'POST', headers, body }); } catch (e) { return { ok: false, status: 0 }; }
  return { ok: res.status >= 200 && res.status < 300, status: res.status, gone: res.status === 404 || res.status === 410 };
}
async function vapidJwt(cfg, aud) {
  const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: APP_URL })}`;
  const key = await crypto.subtle.importKey('jwk', cfg.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${b64u(sig)}`;
}
async function pushEncrypt(p256dh, authSecret, plain) {
  const te = new TextEncoder();
  const ua = b64uDec(p256dh), auth = b64uDec(authSecret);
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const hkdf = async (salt, ikm, info, len) => {
    const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
  };
  const ikm = await hkdf(auth, secret, cat(te.encode('WebPush: info\u0000'), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\u0000'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\u0000'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(plain, new Uint8Array([2]))));
  const head = new Uint8Array(21 + asPub.length);
  head.set(salt, 0);
  new DataView(head.buffer).setUint32(16, 4096);
  head[20] = asPub.length;
  head.set(asPub, 21);
  return cat(head, ct);
}
function cat(...parts) { const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0)); let i = 0; for (const p of parts) { out.set(p, i); i += p.length; } return out; }
function b64u(buf) { const b = new Uint8Array(buf); let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64uDec(str) { const s = String(str).replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4)); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }

/* ---------- Gemeinsame Prüfung: nur das eingerichtete Gerät ---------- */
async function deviceOk(request, env) {
  if (!env.PUSH) return false;
  const key = request.headers.get('X-Push-Key') || '';
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(key)) return false;
  const cfg = await env.PUSH.get('cfg', 'json');
  const hash = b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)));
  return !!cfg && cfg.hash === hash;
}
function berlin(ts = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute), wd: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) };
}

/* ---------- Frank-KI: Claude für die App (Budget pro Monat) ---------- */
async function aiApi(request, env, op, cors) {
  const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
  if (request.method !== 'POST') return json(405, { err: 'method' });
  if (!env.PUSH) return json(501, { err: 'kv' });
  if (!(await deviceOk(request, env))) return json(403, { err: 'key' });
  const raw = await request.text();
  if (raw.length > 6000000) return json(413, { err: 'size' });
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, { err: 'json' }); }
  const month = berlin().date.slice(0, 7);
  const use = (await env.PUSH.get('ai', 'json')) || {};
  const usd = use.m === month ? use.usd || 0 : 0;
  const budget = Number(env.AI_BUDGET_USD) > 0 ? Number(env.AI_BUDGET_USD) : 1;
  if (op === 'status') {
    const [wo, br] = await Promise.all([env.PUSH.get('weekout', 'json'), env.PUSH.get('brief', 'json')]);
    return json(200, { v: VERSION, ai: !!env.ANTHROPIC_API_KEY, garmin: !!env.GARMIN_KEY, usd: Math.round(usd * 10000) / 10000, budget, month, week: wo ? { ws: wo.ws, at: wo.at } : null, brief: br || null });
  }
  if (op === 'week') { const wo = await env.PUSH.get('weekout', 'json'); return json(200, { v: VERSION, week: wo || null }); }
  if (op === 'week-run') { if (!env.ANTHROPIC_API_KEY) return json(501, { err: 'ai-key' }); const r = await weekRun(env, true); return json(r && r.ok ? 200 : 502, r || { ok: false }); }
  if (op !== 'ask') return json(404, { err: 'op' });
  if (!env.ANTHROPIC_API_KEY) return json(501, { err: 'ai-key', msg: 'Geheimnis ANTHROPIC_API_KEY im Worker fehlt.' });
  if (usd >= budget) return json(429, { err: 'budget', msg: `Monatsbudget von ${budget} $ erreicht.`, usd, budget });
  const r = await aiCall(env, body);
  return json(r.ok ? 200 : r.status || 502, r);
}
async function aiCall(env, body) {
  const model = AI_MODELS[body.model] ? body.model : 'haiku';
  const messages = Array.isArray(body.messages) ? body.messages.slice(-8) : [];
  if (!messages.length) return { ok: false, status: 400, err: 'messages' };
  const req = { model: AI_MODELS[model], max_tokens: Math.min(Math.max(Number(body.max_tokens) || 1500, 64), 4000), messages };
  if (typeof body.system === 'string') req.system = body.system.slice(0, 20000);
  let res, j;
  try {
    res = await fetch(AI_URL, { method: 'POST', headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(req) });
    j = await res.json().catch(() => ({}));
  } catch (e) { return { ok: false, status: 502, err: 'net', msg: 'Claude nicht erreichbar.' }; }
  if (!res.ok) return { ok: false, status: res.status, err: 'api', msg: (j && j.error && j.error.message) || `HTTP ${res.status}` };
  const u = j.usage || {}, [pi, po] = AI_PRICE[model];
  const cost = ((u.input_tokens || 0) * pi + (u.output_tokens || 0) * po) / 1e6;
  const month = berlin().date.slice(0, 7);
  const use = (await env.PUSH.get('ai', 'json')) || {};
  const next = use.m === month ? { m: month, usd: (use.usd || 0) + cost, n: (use.n || 0) + 1 } : { m: month, usd: cost, n: 1 };
  await env.PUSH.put('ai', JSON.stringify(next));
  const text = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  return { ok: true, text, usage: { in: u.input_tokens || 0, out: u.output_tokens || 0, usd: Math.round(cost * 1e6) / 1e6 }, month_usd: Math.round(next.usd * 10000) / 10000 };
}

/* ---------- Wochen-Agent: Sonntag ab 19 Uhr (bis Dienstag nachholen) ---------- */
async function weekRun(env, force = false) {
  if (!env.PUSH || !env.ANTHROPIC_API_KEY) return null;
  const wi = await env.PUSH.get('weekin', 'json');
  if (!wi || !wi.ws || !wi.system || !wi.report) return null;
  const b = berlin(), wo = await env.PUSH.get('weekout', 'json');
  if (wo && wo.ws === wi.ws && !force) return null;
  if (!force) {
    const end = new Date(wi.ws + 'T12:00:00Z'); end.setUTCDate(end.getUTCDate() + 6);
    const sunday = end.toISOString().slice(0, 10);
    const due = (b.date === sunday && b.min >= 19 * 60) || (b.date > sunday && b.date <= addIso(sunday, 2));
    if (!due) return null;
    const tr = (await env.PUSH.get('weektry', 'json')) || {};
    if (tr.ws === wi.ws && (tr.n >= 3 || Date.now() - tr.at < 30 * 60000)) return null;
    await env.PUSH.put('weektry', JSON.stringify({ ws: wi.ws, n: (tr.ws === wi.ws ? tr.n || 0 : 0) + 1, at: Date.now() }));
  }
  const use = (await env.PUSH.get('ai', 'json')) || {}, budget = Number(env.AI_BUDGET_USD) > 0 ? Number(env.AI_BUDGET_USD) : 1;
  if (use.m === b.date.slice(0, 7) && use.usd >= budget) return { ok: false, err: 'budget' };
  const r = await aiCall(env, { model: 'sonnet', system: wi.system, max_tokens: 3500, messages: [{ role: 'user', content: wi.report }] });
  if (!r.ok) return r;
  await env.PUSH.put('weekout', JSON.stringify({ ws: wi.ws, at: Date.now(), text: r.text }));
  const [cfg, sub] = await Promise.all([env.PUSH.get('cfg', 'json'), env.PUSH.get('sub', 'json')]);
  if (cfg && sub && !force) await pushSend(cfg, sub, { title: 'Deine Woche ist ausgewertet', body: 'Der Wochen-Agent hat neue Ziele und Anpassungen – sie gelten, sobald du die App öffnest.', tag: 'woche', url: '#woche' });
  return { ok: true, ws: wi.ws };
}
function addIso(d, n) { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }

/* ---------- Garmin im Hintergrund: Morgen-Briefing ---------- */
async function garminToken(env) {
  const c = await env.PUSH.get('gtok', 'json');
  if (c && c.t && c.exp - Date.now() > 3600000) return c.t;
  const res = await fetch(GARMIN + TOKEN_PATH, { method: 'POST', headers: { Authorization: 'ApiKey ' + env.GARMIN_KEY, Accept: '*/*', 'User-Agent': `protokoll-relay/${VERSION}` } });
  let t = (await res.text()).trim();
  if (!res.ok) throw new Error('garmin-token ' + res.status);
  if (t.startsWith('{')) { try { const j = JSON.parse(t); t = j.access_token || j.accessToken || j.token || ''; } catch (e) { t = ''; } }
  t = String(t).replace(/^"+|"+$/g, '').trim();
  if (t.length < 20) throw new Error('garmin-token');
  let exp = Date.now() + 23 * 3600000;
  try { const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); if (p.exp) exp = p.exp * 1000; } catch (e) { /* egal */ }
  await env.PUSH.put('gtok', JSON.stringify({ t, exp }));
  return t;
}
async function garminGet(env, path) {
  const t = await garminToken(env);
  const r = await fetch(GARMIN + path, { headers: { Authorization: 'Bearer ' + t, Accept: 'application/json', 'User-Agent': `protokoll-relay/${VERSION}` } });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}
function deepFind(o, key, depth = 0) {
  if (!o || typeof o !== 'object' || depth > 5) return undefined;
  if (Object.prototype.hasOwnProperty.call(o, key)) return o[key];
  for (const v of Object.values(o)) { const x = deepFind(v, key, depth + 1); if (x !== undefined) return x; }
  return undefined;
}
const num = (v) => { const n = typeof v === 'object' && v ? Number(v.value ?? v.actual) : Number(v); return Number.isFinite(n) ? n : null; };
const hm = (m) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(Math.round(((m % 60) + 60) % 60)).padStart(2, '0')}`;
const dur = (m) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')} h`;
async function briefRun(env) {
  if (!env.PUSH || !env.GARMIN_KEY) return null;
  const b = berlin();
  if (b.min < 4 * 60 + 30 || b.min > 12 * 60 || b.min % 10 !== 0) return null;
  const done = await env.PUSH.get('brief', 'json');
  if (done && done.date === b.date) return null;
  const ctxAll = (await env.PUSH.get('ctx', 'json')) || {};
  const ctx = (ctxAll.days || {})[b.date] || null;
  const sl = await garminGet(env, `/sleep-service/sleep/dailySleep?date=${b.date}`);
  if (!sl) return null;
  const secs = num(deepFind(sl, 'sleepTimeSeconds')), end = num(deepFind(sl, 'sleepEndTimestampGMT'));
  if (!(secs > 3600) || !(end > 0) || end > Date.now() - 10 * 60000) return null; // noch kein abgeschlossener Schlaf
  const score = num(deepFind(deepFind(sl, 'sleepScores') || {}, 'overall')) ?? num(deepFind(sl, 'overallSleepScore'));
  const need = num(deepFind(sl, 'sleepNeed'));
  const hrvRaw = await garminGet(env, `/hrv-service/hrv/daily/${b.date}/${b.date}`).catch(() => null);
  const hrv = num(deepFind(hrvRaw || {}, 'lastNightAvg')) ?? num(deepFind(sl, 'avgOvernightHrv'));
  const rhr = num(deepFind(sl, 'restingHeartRate'));
  const slept = Math.round(secs / 60), base = ctx && ctx.need ? ctx.need : need || 480, diff = slept - base;
  const lines = [];
  lines.push(`${dur(slept)} geschlafen${score != null ? `, Score ${Math.round(score)}` : ''}${diff <= -30 ? ` (${dur(-diff)} unter Bedarf)` : ''}.`);
  if (hrv != null) { const hb = ctx && ctx.hrvBase; lines.push(`HRV ${Math.round(hrv)} ms${hb ? (hrv < hb[0] ? ' – unter deinem Normalbereich' : hrv > hb[1] ? ' – über dem Normalbereich' : ' – im Normalbereich') : ''}${rhr ? `, Ruhepuls ${Math.round(rhr)}` : ''}.`); }
  let ready = null;
  if (score != null) { ready = score; if (hrv != null && ctx && ctx.hrvBase && hrv < ctx.hrvBase[0]) ready -= 15; if (diff < -60) ready -= 10; }
  if (ctx) {
    if (ctx.gym) lines.push(ready != null && ready < 50 ? `${ctx.gym}: heute leichter (Technik, ein Satz weniger).` : `Heute: ${ctx.gym}.`);
    const woke = b.min - Math.round((Date.now() - end) / 60000); // tatsächlich aufgewacht (Ortszeit)
    if (ctx.stops && ctx.stops.length) lines.push(`Koffein ab ${hm(woke + 90)}; ${ctx.stops.map((x) => `${x.n} bis ${hm(x.stop)}`).join(', ')}.`);
    if (diff <= -45 && ctx.nap) lines.push(`Kurze Nacht: Nickerchen 10–20 Min. zwischen ${hm(ctx.nap[0])} und ${hm(ctx.nap[1])} oder NSDR.`);
    if (ctx.bed != null) lines.push(`Schlafenszeit ${hm(ctx.bed - (diff <= -45 ? Math.min(ctx.recMax || 90, -diff) : 0))}.`);
    if (ctx.exp) lines.push(ctx.exp);
  }
  const [cfg, sub] = await Promise.all([env.PUSH.get('cfg', 'json'), env.PUSH.get('sub', 'json')]);
  let ok = false;
  if (cfg && sub) ok = (await pushSend(cfg, sub, { title: diff <= -45 ? 'Guten Morgen – kurze Nacht' : 'Guten Morgen', body: lines.join(' ').slice(0, 600), tag: 'briefing', url: '#heute' })).ok;
  await env.PUSH.put('brief', JSON.stringify({ date: b.date, at: Date.now(), ok, slept, score, hrv }));
  return { ok };
}
