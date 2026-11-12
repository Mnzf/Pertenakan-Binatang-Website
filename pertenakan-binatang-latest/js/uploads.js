// uploads.js - sends animal photos to our upload service (Cloudflare Worker + R2). Staff only.
// The photo is shrunk in the browser first (max 1600 px wide/tall, JPEG) so uploads are small and fast.
import { UPLOAD_API } from './config.js';
import { getIdToken } from './auth.js';

const MAX_SIDE = 1600;
const QUALITY = 0.85;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

// True once someone has pasted the Worker address into js/config.js
export const uploadsEnabled = () => /^https:\/\/\S+$/.test(UPLOAD_API);

export async function prepareImage(file) {
  if (!ALLOWED.includes(file.type)) throw new Error('only JPG, PNG or WebP images are allowed.');
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;   // very old browser: send as is
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';                     // PNGs with transparent areas become white, not black
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  return blob ?? file;
}

// Returns the public https:// address of the stored photo.
export async function uploadImage(file) {
  if (!uploadsEnabled()) throw new Error('photo upload is not set up yet.');
  const blob = await prepareImage(file);
  if (blob.size > MAX_BYTES) throw new Error('the photo is larger than 5 MB.');
  const token = await getIdToken();
  const response = await fetch(`${UPLOAD_API.replace(/\/$/, '')}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': blob.type },
    body: blob,
  });
  let data = {};
  try { data = await response.json(); } catch { /* not JSON */ }
  if (!response.ok) throw new Error(data.error || `upload failed (${response.status}).`);
  return data.url;
}
