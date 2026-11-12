// Kaznisah Farming - photo upload service (Cloudflare Worker + R2 bucket).
//
// What it does
//   POST /upload     staff only. Receives ONE image, stores it in R2, returns {"url": "..."}.
//   GET  /img/<name> public.     Serves a stored image (cached for a year).
//
// How it stays safe
//   1. The browser must send a Firebase login token (Authorization: Bearer <token>).
//   2. We check the token's signature with Google's public keys, plus its audience, issuer and expiry.
//   3. We read users/{uid} from Firestore WITH THAT TOKEN (so our security rules apply)
//      and only accept the roles owner / manager / staff.
//   4. Only JPEG, PNG and WebP up to 5 MB. We check the real file bytes, not just the label.
//   5. Browsers from other websites are refused (CORS allow-list in ALLOWED_ORIGINS).
//   6. File names are random, so nobody can overwrite or guess another file.
//
// Settings (Worker -> Settings -> Variables and Bindings)
//   BUCKET               R2 bucket binding
//   FIREBASE_PROJECT_ID  e.g. pertenakan-binatang-website
//   ALLOWED_ORIGINS      comma separated, e.g. https://yourname.github.io,http://127.0.0.1:5500

const STAFF_ROLES = ['owner', 'manager', 'staff'];
const MAX_BYTES = 5 * 1024 * 1024;
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ---------- small helpers ----------
const json = (data, status, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });

function corsHeaders(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const b64urlToBytes = (text) => {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};
const b64urlToJson = (text) => JSON.parse(new TextDecoder().decode(b64urlToBytes(text)));

// ---------- 1. verify the Firebase login token ----------
let jwksCache = { keys: null, expires: 0 };
async function getKeys() {
  if (jwksCache.keys && Date.now() < jwksCache.expires) return jwksCache.keys;
  const response = await fetch(JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!response.ok) throw new HttpError(503, 'Could not check your login right now. Try again in a minute.');
  const { keys } = await response.json();
  jwksCache = { keys, expires: Date.now() + 60 * 60 * 1000 };
  return keys;
}

async function verifyFirebaseToken(token, env) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new HttpError(401, 'Invalid login token.');
  let header, payload;
  try { header = b64urlToJson(parts[0]); payload = b64urlToJson(parts[1]); }
  catch { throw new HttpError(401, 'Invalid login token.'); }
  if (header.alg !== 'RS256' || !header.kid) throw new HttpError(401, 'Invalid login token.');

  const jwk = (await getKeys()).find((k) => k.kid === header.kid);
  if (!jwk) throw new HttpError(401, 'Invalid login token.');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!valid) throw new HttpError(401, 'Invalid login token.');

  const now = Math.floor(Date.now() / 1000);
  const project = env.FIREBASE_PROJECT_ID;
  if (!project || payload.aud !== project || payload.iss !== `https://securetoken.google.com/${project}`) throw new HttpError(401, 'Invalid login token.');
  if (!payload.sub || typeof payload.exp !== 'number' || payload.exp < now) throw new HttpError(401, 'Your login has expired. Please log in again.');
  if (typeof payload.iat === 'number' && payload.iat > now + 300) throw new HttpError(401, 'Invalid login token.');
  return payload;
}

// ---------- 2. is this person staff? (read their profile with THEIR token, so the security rules apply) ----------
async function requireStaff(token, uid, env) {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new HttpError(403, 'Only farm staff can upload photos.');
  const doc = await response.json();
  const role = doc.fields?.role?.stringValue;
  if (!STAFF_ROLES.includes(role)) throw new HttpError(403, 'Only farm staff can upload photos.');
}

// ---------- 3. check the real bytes of the file ----------
function sniffType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return 'image/png';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

// ---------- routes ----------
async function handleUpload(request, env, url, cors) {
  const auth = request.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) throw new HttpError(401, 'Please log in first.');
  const token = auth.slice(7).trim();
  const payload = await verifyFirebaseToken(token, env);
  await requireStaff(token, payload.sub, env);

  const declared = (request.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
  if (!TYPES[declared]) throw new HttpError(415, 'Only JPG, PNG or WebP images are allowed.');
  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (length > MAX_BYTES) throw new HttpError(413, 'The image is too large (5 MB maximum).');

  const body = new Uint8Array(await request.arrayBuffer());
  if (body.length === 0) throw new HttpError(400, 'No image received.');
  if (body.length > MAX_BYTES) throw new HttpError(413, 'The image is too large (5 MB maximum).');
  if (sniffType(body) !== declared) throw new HttpError(415, 'The file is not a real JPG, PNG or WebP image.');

  const name = `${crypto.randomUUID()}.${TYPES[declared]}`;
  await env.BUCKET.put(`animals/${name}`, body, {
    httpMetadata: { contentType: declared, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { uploadedBy: payload.sub },
  });
  return json({ url: `${url.origin}/img/${name}` }, 201, cors ?? {});
}

async function handleImage(request, env, ctx, url) {
  const name = url.pathname.slice('/img/'.length);
  if (!NAME_RE.test(name)) throw new HttpError(404, 'Not found.');

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(url.origin + url.pathname);
  const hit = cache ? await cache.match(cacheKey) : null;
  if (hit) return hit;

  const object = await env.BUCKET.get(`animals/${name}`);
  if (!object) throw new HttpError(404, 'Not found.');
  const response = new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  });
  if (cache) ctx?.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request.headers.get('Origin'), env);
    try {
      if (request.method === 'OPTIONS') {
        if (!cors) throw new HttpError(403, 'This website is not allowed to upload.');
        return new Response(null, { status: 204, headers: cors });
      }
      if (request.method === 'POST' && url.pathname === '/upload') {
        if (request.headers.get('Origin') && !cors) throw new HttpError(403, 'This website is not allowed to upload.');
        return await handleUpload(request, env, url, cors);
      }
      if (request.method === 'GET' && url.pathname.startsWith('/img/')) return await handleImage(request, env, ctx, url);
      throw new HttpError(404, 'Not found.');
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status, cors ?? {});
      console.error(error);
      return json({ error: 'Something went wrong. Please try again.' }, 500, cors ?? {});
    }
  },
};
