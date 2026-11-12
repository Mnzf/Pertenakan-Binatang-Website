// pages/home.js - featured animals on the home page
import { getPublicAnimals } from '../data.js';
import { authReady } from '../auth.js';
import { animalCard, emptyState, errorState } from '../render.js';
import { $ } from '../utils.js';

const list = $('#featured-list');
try {
  await authReady();   // so the Save buttons know what this buyer has saved
  const featured = (await getPublicAnimals()).filter((a) => a.featured).slice(0, 4);
  list.innerHTML = featured.length
    ? featured.map((a) => animalCard(a, { featured: true })).join('')
    : emptyState('New animals are coming soon.');
} catch (error) {
  console.error(error);
  list.innerHTML = errorState();
}
