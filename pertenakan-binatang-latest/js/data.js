// data.js - reads and writes ANIMALS in Firestore (collection "animals"). The only file that does.
// Pages never talk to Firestore for animals directly; they call these functions.

import {
  db, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp, arrayUnion,
} from './firebase.js';

function needDb() {
  if (!db) throw new Error('Firebase is not set up yet. Paste your settings into js/firebase-config.js.');
  return db;
}

// Turns a Firestore document into a plain animal object (adds its id, makes the date a string).
function toAnimal(snapshot) {
  const data = snapshot.data();
  const created = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt ?? '');
  return { ...data, id: snapshot.id, createdAt: created };
}

let publicList;

// PUBLIC website: only animals marked "For Sale". (The rules also enforce this.)
export function getPublicAnimals() {
  publicList ??= getDocs(query(collection(needDb(), 'animals'), where('forSale', '==', true)))
    .then((snap) => snap.docs.map(toAnimal))
    .catch((error) => { publicList = undefined; throw error; });
  return publicList;
}

// STAFF area: every animal. (Visitors get "permission-denied" from the rules.)
export async function getAnimals() {
  const snap = await getDocs(collection(needDb(), 'animals'));
  return snap.docs.map(toAnimal);
}

export async function getAnimalById(id) {
  if (!id) return null;
  try {
    const snap = await getDoc(doc(needDb(), 'animals', id));
    return snap.exists() ? toAnimal(snap) : null;
  } catch (error) {
    if (error.code === 'permission-denied') return null;   // a hidden animal looks "not found" to the public
    throw error;
  }
}

const NEW_ANIMAL_DEFAULTS = {
  health: { vaccinated: false, lastCheck: '', certification: '' },
  weightHistory: [], healthLog: [], breeding: [],
};

// Add (no id) or edit (with id). Returns the animal's id.
export async function saveAnimal(id, data) {
  if (id) {
    await setDoc(doc(needDb(), 'animals', id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    return id;
  }
  const ref = await addDoc(collection(needDb(), 'animals'), {
    ...NEW_ANIMAL_DEFAULTS, ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export const updateAnimal = (id, patch) => updateDoc(doc(needDb(), 'animals', id), { ...patch, updatedAt: serverTimestamp() });
export const deleteAnimal = (id) => deleteDoc(doc(needDb(), 'animals', id));

// Add a health / weight / breeding log entry to an animal (kind = 'health' | 'weight' | 'breeding').
const LOG_FIELDS = { health: 'healthLog', weight: 'weightHistory', breeding: 'breeding' };
export async function addLogEntry(animal, kind, entry) {
  const field = LOG_FIELDS[kind];
  if (!field) throw new Error('Unknown log entry type.');
  const patch = { [field]: arrayUnion(entry), updatedAt: serverTimestamp() };

  if (kind === 'weight') {
    // "current weight" follows the newest weigh-in
    const newest = [...(animal.weightHistory ?? []), entry].sort((a, b) => String(a.date).localeCompare(String(b.date))).at(-1);
    patch.weightKg = newest.kg;
  }
  if (kind === 'health' && entry.status === 'Done') {
    if (entry.type === 'Vaccination') patch['health.vaccinated'] = true;
    if (['Vaccination', 'Health check'].includes(entry.type) && String(entry.date) >= String(animal.health?.lastCheck ?? '')) {
      patch['health.lastCheck'] = entry.date;
    }
  }
  await updateDoc(doc(needDb(), 'animals', animal.id), patch);
}
