// config.js - settings shared by every page. Change them here, not in each file.

// Phase 3 runs without a backend. Phase 4: set this to false once Firebase Auth works.
export const DEMO_MODE = true;

// How many animal cards to show before "Load more".
export const PAGE_SIZE = 6;

// Animal categories. These drive the header dropdown links, the filters and the
// category pages. Confirm the final list with the client, then edit it here
// (and in the header <ul class="dropdown"> in the HTML).
export const CATEGORIES = [
  { slug: 'cattle',  label: 'Cattle',  description: '[Category description to be confirmed with the client.]' },
  { slug: 'goats',   label: 'Goats',   description: '[Category description to be confirmed with the client.]' },
  { slug: 'sheep',   label: 'Sheep',   description: '[Category description to be confirmed with the client.]' },
  { slug: 'bulls',   label: 'Bulls',   description: '[Category description to be confirmed with the client.]' },
  { slug: 'poultry', label: 'Poultry', description: '[Category description to be confirmed with the client.]' },
  { slug: 'horses',  label: 'Horses',  description: '[Category description to be confirmed with the client.]' },
];

export const categoryLabel = (slug) => CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
