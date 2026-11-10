/*
 * Protokoll – Weiterleitung für Garmin und Mitteilungen (Cloudflare Worker), Version 3
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
 * Einrichten: Cloudflare → Workers & Pages → Worker anlegen → Code durch diesen ersetzen →
 * Deploy. Für Mitteilungen zusätzlich: Speicher (KV) anlegen und als „PUSH“ binden,
 * unter Einstellungen → Trigger einen Cron-Trigger „* * * * *“ (jede Minute) hinzufügen.
 */
const APP_ORIGIN = 'https://argus100-agent.github.io';
const APP_URL = 'https://argus100-agent.github.io/protokoll/';
const GARMIN = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const DATA_PATH = /^\/[a-z][a-z0-9-]*-service\/[A-Za-z0-9/_.-]+$/; // nur Lesen (GET) von Garmin-Diensten
const PUSH_HOSTS = /(^|\.)push\.apple\.com$|^fcm\.googleapis\.com$|(^|\.)push\.services\.mozilla\.com$|(^|\.)notify\.windows\.com$/;
const PUSH_MAX = 80; // geplante Mitteilungen
const VERSION = 3;

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
  /* Zeitplan (Cron): fällige Mitteilungen verschicken */
  async scheduled(event, env, ctx) {
    const p = pushRun(env || {});
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
  if (raw.length > 120000) return json(413, { err: 'size' });
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
      .map((x) => ({ at: Math.round(x.at), title: str(x.title, 120), body: str(x.body, 600), tag: str(x.tag, 40).replace(/[^A-Za-z0-9_-]/g, ''), url: /^#[a-z0-9-]{0,30}$/.test(x.url || '') ? x.url : '' }))
      .sort((a, b) => a.at - b.at)
      .slice(0, PUSH_MAX);
    await env.PUSH.put('sched', JSON.stringify(items));
    return json(200, { ok: true, n: items.length });
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
