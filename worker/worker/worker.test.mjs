// Tests for the upload Worker. Run from the project folder:  node --test worker/
// They use a fake R2 bucket and a fake Google/Firestore, so they need no accounts and no internet.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

const PROJECT = 'test-project';
const ORIGIN = 'https://team.github.io';
const env = (bucket) => ({ BUCKET: bucket, FIREBASE_PROJECT_ID: PROJECT, ALLOWED_ORIGINS: `${ORIGIN},http://127.0.0.1:5500` });

const b64url = (data) => Buffer.from(data).toString('base64url');
const gen = () => crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const goodKeys = await gen();
const otherKeys = await gen();
const goodJwk = { ...(await crypto.subtle.exportKey('jwk', goodKeys.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };

async function makeToken({ keys = goodKeys, kid = 'k1', claims = {} } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: 'staffUid', iat: now - 10, exp: now + 3600, ...claims }));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(new Uint8Array(sig))}`;
}

// fake internet: Google's keys + Firestore profile documents
const roles = { staffUid: 'manager', buyerUid: 'buyer' };
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  if (url.includes('securetoken@system.gserviceaccount.com')) return new Response(JSON.stringify({ keys: [goodJwk] }), { status: 200 });
  const match = url.match(/documents\/users\/(.+)$/);
  if (match) {
    assert.ok(String(init.headers?.Authorization).startsWith('Bearer '), 'profile lookup must use the user token');
    const uid = decodeURIComponent(match[1]);
    return roles[uid] ? new Response(JSON.stringify({ fields: { role: { stringValue: roles[uid] } } }), { status: 200 }) : new Response('{}', { status: 404 });
  }
  throw new Error('unexpected fetch ' + url);
};

class FakeBucket {
  constructor() { this.store = new Map(); }
  async put(key, body, options) { this.store.set(key, { body, ...options }); }
  async get(key) { const o = this.store.get(key); return o ? { body: o.body, httpMetadata: o.httpMetadata } : null; }
}

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
const WEBP = new Uint8Array([...Buffer.from('RIFF'), 1, 2, 3, 4, ...Buffer.from('WEBP'), 9]);

const upload = async (bucket, { token, type = 'image/jpeg', body = JPEG, origin = ORIGIN, headers = {} } = {}) =>
  worker.fetch(new Request('https://up.example.workers.dev/upload', {
    method: 'POST', body,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': type, ...(origin ? { Origin: origin } : {}), ...headers },
  }), env(bucket), { waitUntil() {} });

test('CORS: preflight allowed for our site, refused for others', async () => {
  const ok = await worker.fetch(new Request('https://up.example.workers.dev/upload', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), env(new FakeBucket()));
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const bad = await worker.fetch(new Request('https://up.example.workers.dev/upload', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), env(new FakeBucket()));
  assert.equal(bad.status, 403);
  assert.equal(bad.headers.get('Access-Control-Allow-Origin'), null);
});

test('upload from another website is refused even with a valid token', async () => {
  const res = await upload(new FakeBucket(), { token: await makeToken(), origin: 'https://evil.example' });
  assert.equal(res.status, 403);
});

test('no token -> 401', async () => assert.equal((await upload(new FakeBucket())).status, 401));
test('garbage token -> 401', async () => assert.equal((await upload(new FakeBucket(), { token: 'a.b.c' })).status, 401));
test('token signed with the wrong key -> 401', async () => assert.equal((await upload(new FakeBucket(), { token: await makeToken({ keys: otherKeys }) })).status, 401));
test('unknown key id -> 401', async () => assert.equal((await upload(new FakeBucket(), { token: await makeToken({ kid: 'nope' }) })).status, 401));
test('wrong project (audience) -> 401', async () => assert.equal((await upload(new FakeBucket(), { token: await makeToken({ claims: { aud: 'other-project' } }) })).status, 401));
test('wrong issuer -> 401', async () => assert.equal((await upload(new FakeBucket(), { token: await makeToken({ claims: { iss: 'https://evil.example' } }) })).status, 401));
test('expired token -> 401', async () => assert.equal((await upload(new FakeBucket(), { token: await makeToken({ claims: { exp: Math.floor(Date.now() / 1000) - 5 } }) })).status, 401));

test('a buyer account is refused (403) and nothing is stored', async () => {
  const bucket = new FakeBucket();
  const res = await upload(bucket, { token: await makeToken({ claims: { sub: 'buyerUid' } }) });
  assert.equal(res.status, 403);
  assert.equal(bucket.store.size, 0);
});
test('a logged-in user with no profile is refused (403)', async () => {
  assert.equal((await upload(new FakeBucket(), { token: await makeToken({ claims: { sub: 'ghost' } }) })).status, 403);
});

test('staff can upload JPEG, PNG and WebP; random names; metadata recorded', async () => {
  const bucket = new FakeBucket();
  for (const [type, body, ext] of [['image/jpeg', JPEG, 'jpg'], ['image/png', PNG, 'png'], ['image/webp', WEBP, 'webp']]) {
    const res = await upload(bucket, { token: await makeToken(), type, body });
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
    const { url } = await res.json();
    assert.match(url, new RegExp(`^https://up\\.example\\.workers\\.dev/img/[0-9a-f-]{36}\\.${ext}$`));
  }
  assert.equal(bucket.store.size, 3);
  const [key, value] = [...bucket.store.entries()][0];
  assert.ok(key.startsWith('animals/'));
  assert.equal(value.customMetadata.uploadedBy, 'staffUid');
  assert.match(value.httpMetadata.cacheControl, /immutable/);
});

test('rejects wrong types, fake images, empty and oversized files', async () => {
  const token = await makeToken();
  assert.equal((await upload(new FakeBucket(), { token, type: 'text/html', body: new TextEncoder().encode('<script>') })).status, 415);
  assert.equal((await upload(new FakeBucket(), { token, type: 'image/jpeg', body: PNG })).status, 415, 'label says jpeg but bytes are png');
  assert.equal((await upload(new FakeBucket(), { token, type: 'image/png', body: new TextEncoder().encode('<script>alert(1)</script>') })).status, 415);
  assert.equal((await upload(new FakeBucket(), { token, body: new Uint8Array(0) })).status, 400);
  assert.equal((await upload(new FakeBucket(), { token, headers: { 'Content-Length': String(6 * 1024 * 1024) } })).status, 413);
  const big = new Uint8Array(5 * 1024 * 1024 + 1); big.set(JPEG);
  assert.equal((await upload(new FakeBucket(), { token, body: big })).status, 413);
});

test('images are public, served with safe headers; bad names and missing files give 404', async () => {
  const bucket = new FakeBucket();
  const { url } = await (await upload(bucket, { token: await makeToken() })).json();
  const path = new URL(url).pathname;
  const res = await worker.fetch(new Request(`https://up.example.workers.dev${path}`), env(bucket), { waitUntil() {} });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'image/jpeg');
  assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.match(res.headers.get('Cache-Control'), /immutable/);
  for (const bad of ['/img/../secret', '/img/abc.jpg', '/img/00000000-0000-0000-0000-000000000000.jpg', '/img/' + 'x'.repeat(60)]) {
    assert.equal((await worker.fetch(new Request(`https://up.example.workers.dev${bad}`), env(bucket), { waitUntil() {} })).status, 404, bad);
  }
});

test('unknown routes give 404, GET /upload is not allowed', async () => {
  assert.equal((await worker.fetch(new Request('https://up.example.workers.dev/'), env(new FakeBucket()))).status, 404);
  assert.equal((await worker.fetch(new Request('https://up.example.workers.dev/upload'), env(new FakeBucket()))).status, 404);
});
