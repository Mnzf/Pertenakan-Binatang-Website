// saved.js - a buyer's saved (wishlist) animals, stored on their Firestore profile (users/{uid}.saved).
import { getCurrentUser } from './auth.js';
import { db, doc, setDoc, arrayUnion, arrayRemove } from './firebase.js';

export const isSaved = (id) => !!getCurrentUser()?.saved?.includes(id);

// Returns true if the animal is now saved, false if it was removed.
export async function toggleSaved(id) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not logged in');
  const before = user.saved;
  const nowSaved = !before.includes(id);
  user.saved = nowSaved ? [...before, id] : before.filter((x) => x !== id);   // update the screen straight away
  try {
    await setDoc(doc(db, 'users', user.uid), { saved: nowSaved ? arrayUnion(id) : arrayRemove(id) }, { merge: true });
  } catch (error) {
    user.saved = before;   // put it back if saving failed
    throw error;
  }
  return nowSaved;
}
