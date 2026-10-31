// data.js - the ONE place that knows where animal data comes from.
// Phase 3: reads data/animals.json.   Phase 4: swap these functions for Firestore.
// The rest of the site only calls getAnimals / getPublicAnimals / getAnimalById,
// so nothing else has to change when we move to Firebase.

import { rootUrl } from './utils.js';
import { getOverrides } from './storage.js';

let cache;

async function load() {
  const response = await fetch(rootUrl('data/animals.json'));
  if (!response.ok) throw new Error(`Could not load animals (HTTP ${response.status})`);
  return response.json();
}

export async function getAnimals() {
  cache ??= load().catch((error) => { cache = undefined; throw error; });
  const animals = await cache;
  const overrides = getOverrides();
  return animals.map((animal) => ({ ...animal, ...(overrides[animal.id] ?? {}) }));
}

// Only animals the staff marked "For Sale" appear on the public website.
export async function getPublicAnimals() {
  return (await getAnimals()).filter((animal) => animal.forSale);
}

export async function getAnimalById(id) {
  return (await getAnimals()).find((animal) => animal.id === id) ?? null;
}
