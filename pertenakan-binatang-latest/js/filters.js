// filters.js - pure functions (no page code) so they are easy to test.

import { ageInMonths } from './utils.js';

// [min, max) ranges
export const AGE_BANDS = {
  under12: { label: 'Under 1 year',  range: [0, 12] },
  '12-36': { label: '1 to 3 years',  range: [12, 36] },
  over36:  { label: 'Over 3 years',  range: [36, Infinity] },
};
export const PRICE_BANDS = {
  under1000:  { label: 'Under B$1,000',     range: [0, 1000] },
  '1000-3000': { label: 'B$1,000 - B$3,000', range: [1000, 3000] },
  over3000:   { label: 'Over B$3,000',      range: [3000, Infinity] },
};

const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
const inRange = (value, [min, max]) => value >= min && value < max;

export function filterAnimals(animals, f = {}) {
  return animals.filter((a) => {
    if (f.category && !same(a.species, f.category)) return false;
    if (f.breed && !same(a.breed, f.breed)) return false;
    if (f.sex && !same(a.sex, f.sex)) return false;
    if (f.availability && !same(a.status, f.availability)) return false;
    if (f.status && !same(a.status, f.status)) return false;
    if (f.location && !same(a.location, f.location)) return false;
    if (f.age && AGE_BANDS[f.age]) {
      const months = ageInMonths(a.dob);
      if (months === null || !inRange(months, AGE_BANDS[f.age].range)) return false;
    }
    if (f.price && PRICE_BANDS[f.price]) {
      if (a.price === null || a.price === undefined || !inRange(a.price, PRICE_BANDS[f.price].range)) return false;
    }
    if (f.search) {
      const text = [a.id, a.tag, a.name, a.breed, a.species].join(' ').toLowerCase();
      if (!text.includes(f.search.trim().toLowerCase())) return false;
    }
    return true;
  });
}

export function sortAnimals(animals, key = 'newest') {
  const list = [...animals];
  const price = (a, fallback) => (a.price === null || a.price === undefined ? fallback : a.price);
  if (key === 'price-asc')  return list.sort((a, b) => price(a, Infinity) - price(b, Infinity));
  if (key === 'price-desc') return list.sort((a, b) => price(b, -Infinity) - price(a, -Infinity));
  return list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); // newest first
}
