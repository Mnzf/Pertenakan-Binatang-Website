// config.js - settings shared by every page. Change them here, not in each file.

// How many animal cards to show before "Load more".
export const PAGE_SIZE = 6;

// Animal categories. These drive the header dropdown links, the filters and the
// category pages. Confirm the final list with the client, then edit it here
// (and in the header <ul class="dropdown"> in the HTML).
export const CATEGORIES = [
  { slug: 'cattle',  label: 'Cattle' },
  { slug: 'goats',   label: 'Goats' },
  { slug: 'sheep',   label: 'Sheep' },
  { slug: 'bulls',   label: 'Bulls' },
  { slug: 'poultry', label: 'Poultry' },
  { slug: 'horses',  label: 'Horses' },
];

export const categoryLabel = (slug) => CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

// Account roles stored in Firestore users/{uid}.role. These three can use the herd-management area.
export const STAFF_ROLES = ['owner', 'manager', 'staff'];

export const ANIMAL_STATUSES = ['available', 'reserved', 'sold'];
export const INQUIRY_STATUSES = ['Submitted', 'Contacted', 'Closed'];
export const UPLOAD_API = 'kaznisah-uploads.amnzf03.workers.dev';