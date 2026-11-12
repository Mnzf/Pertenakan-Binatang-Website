// dev/import-animals.js - reads a CSV of real animals, checks every row, and writes them to Firestore.
// The functions here are plain (no page code) so they can be tested.

export const COLUMNS = ['tag', 'name', 'species', 'breed', 'sex', 'dob', 'price', 'status', 'location', 'weightKg',
  'registration', 'sire', 'dam', 'description', 'notes', 'images', 'forSale', 'featured'];
const REQUIRED = ['tag', 'name', 'species', 'breed', 'sex', 'dob', 'status', 'location', 'weightKg'];
const SEXES = ['female', 'male', 'mixed'];
const IMAGE_OK = /^(assets\/[\w\-./]+|https:\/\/\S+)$/;

// Small CSV reader: commas, "quoted, fields", "" for a quote inside quotes, line breaks inside quotes.
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  const input = String(text).replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

export const slugify = (tag) => String(tag).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const yes = (value, fallback) => (String(value ?? '').trim() === '' ? fallback : /^(yes|y|true|1)$/i.test(String(value).trim()));

// Returns { animals: [{ id, data, line }], errors: [{ line, message }] }
export function validateRows(rows, { categories, statuses, today = new Date() }) {
  const errors = [];
  const animals = [];
  if (!rows.length) return { animals, errors: [{ line: 1, message: 'The file is empty.' }] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const index = Object.fromEntries(COLUMNS.map((c) => [c, header.indexOf(c.toLowerCase())]));
  const missing = REQUIRED.filter((c) => index[c] === -1);
  if (missing.length) return { animals, errors: [{ line: 1, message: `Missing column(s): ${missing.join(', ')}. Use the template header exactly.` }] };

  const seen = new Set();
  rows.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (c) => (index[c] === -1 ? '' : String(cells[index[c]] ?? '').trim());
    const problems = [];

    for (const c of REQUIRED) if (get(c) === '') problems.push(`${c} is empty`);

    const species = categories.find((cat) => cat.slug === get('species').toLowerCase() || cat.label.toLowerCase() === get('species').toLowerCase());
    if (get('species') && !species) problems.push(`species "${get('species')}" is not one of: ${categories.map((c) => c.slug).join(', ')}`);

    const sex = get('sex').toLowerCase();
    if (sex && !SEXES.includes(sex)) problems.push(`sex must be ${SEXES.join(', ')}`);

    const status = get('status').toLowerCase();
    if (status && !statuses.includes(status)) problems.push(`status must be ${statuses.join(', ')}`);

    const dob = get('dob');
    if (dob && (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(new Date(dob).getTime()))) problems.push('dob must look like 2024-03-15');
    else if (dob && new Date(dob) > today) problems.push('dob cannot be in the future');

    const price = get('price');
    if (price !== '' && !(Number(price) >= 0)) problems.push('price must be a number (or empty for "Inquire")');
    const weight = get('weightKg');
    if (weight !== '' && !(Number(weight) >= 0)) problems.push('weightKg must be a number');

    const images = get('images').split(';').map((s) => s.trim()).filter(Boolean);
    const badImage = images.find((u) => !IMAGE_OK.test(u));
    if (badImage) problems.push(`image "${badImage}" must start with assets/ or https://`);

    const id = slugify(get('tag'));
    if (get('tag') && !id) problems.push('tag has no letters or numbers');
    if (id && seen.has(id)) problems.push(`tag "${get('tag')}" appears twice in the file`);
    seen.add(id);

    if (problems.length) { errors.push({ line, message: problems.join('; ') }); return; }

    animals.push({
      id, line,
      data: {
        tag: get('tag'), name: get('name'), species: species.slug, breed: get('breed'), sex, dob,
        price: price === '' ? null : Number(price), status, location: get('location'), weightKg: Number(weight),
        registration: get('registration'), sire: get('sire'), dam: get('dam'), description: get('description'), notes: get('notes'),
        images: images.length ? images : ['assets/images/placeholder.svg'],
        forSale: yes(get('forSale'), true), featured: yes(get('featured'), false),
      },
    });
  });
  return { animals, errors };
}

const NEW_ANIMAL_DEFAULTS = () => ({
  health: { vaccinated: false, lastCheck: '', certification: '' },
  weightHistory: [], healthLog: [], breeding: [],
});

// Writes the animals. An animal with the same tag is UPDATED (its health/weight/breeding logs are kept).
export async function importAnimals(animals, { db, doc, getDoc, setDoc, serverTimestamp }) {
  let created = 0, updated = 0;
  for (const { id, data } of animals) {
    const ref = doc(db, 'animals', id);
    const exists = (await getDoc(ref)).exists();
    if (exists) {
      await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
      updated++;
    } else {
      await setDoc(ref, { ...NEW_ANIMAL_DEFAULTS(), ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      created++;
    }
  }
  return { created, updated };
}
