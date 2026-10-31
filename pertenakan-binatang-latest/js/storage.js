// storage.js - DEMO ONLY. Saves things in the browser (localStorage) so we can test
// the flows without a backend. In Phase 4 these functions are replaced by Firestore
// reads/writes, so keep every page calling THESE functions instead of localStorage.

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback; // storage blocked or corrupted: carry on with the default
  }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

// Saved (wishlist) animals
export const getSavedIds = () => read('kf_saved', []);
export const isSaved = (id) => getSavedIds().includes(id);
export function toggleSaved(id) {
  const ids = getSavedIds();
  const index = ids.indexOf(id);
  if (index >= 0) ids.splice(index, 1); else ids.push(id);
  write('kf_saved', ids);
  return index < 0; // true = now saved
}

// Buyer inquiries
export const getInquiries = () => read('kf_inquiries', []);
export function addInquiry(inquiry) {
  const list = getInquiries();
  list.unshift(inquiry);
  write('kf_inquiries', list);
}

// Staff changes to "for sale" / "featured" (so the staff and public pages agree in the demo)
export const getOverrides = () => read('kf_overrides', {});
export function setOverride(id, patch) {
  const all = getOverrides();
  all[id] = { ...all[id], ...patch };
  write('kf_overrides', all);
}
