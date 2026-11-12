// pages/animal-profile.js - staff view of ONE animal (?id=...), including "Add log entry"
import { requireRole } from '../auth.js';
import { getAnimalById, updateAnimal, addLogEntry } from '../data.js';
import { handleForm } from '../forms.js';
import { imageUrl, statusBadge } from '../render.js';
import { categoryLabel } from '../config.js';
import { $, $$, getParam, escapeHtml, formatDate, formatAge, capitalize, rootUrl } from '../utils.js';

const root = $('#profile-root');
let user = null;

const byDate = (key, dir = 1) => (a, b) => dir * String(a[key]).localeCompare(String(b[key]));

function table(headers, rows, empty) {
  if (!rows.length) return `<p>${empty}</p>`;
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

// Simple line chart drawn as SVG (no chart library needed)
function weightChart(history) {
  if (history.length < 2) return '<p>Not enough weight records yet. Add at least two weigh-ins.</p>';
  const kgs = history.map((h) => h.kg);
  const min = Math.min(...kgs), max = Math.max(...kgs), span = max - min || 1;
  const points = history.map((h, i) => `${(i / (history.length - 1)) * 600},${160 - ((h.kg - min) / span) * 130}`).join(' ');
  return `<svg class="sparkline" viewBox="0 0 600 170" preserveAspectRatio="none" role="img" aria-label="Weight from ${kgs[0]} kg to ${kgs.at(-1)} kg"><polyline points="${points}"/></svg>
    <div class="sparkline-labels"><span>${escapeHtml(formatDate(history[0].date))}</span><span>${escapeHtml(formatDate(history.at(-1).date))}</span></div>`;
}

const LOG_DIALOG = `
  <dialog id="log-dialog" aria-labelledby="log-title">
    <form id="log-form">
      <h2 id="log-title">Add log entry</h2>
      <label for="log-kind">Entry type</label>
      <select id="log-kind" name="kind">
        <option value="health">Health / medical</option>
        <option value="weight">Weight</option>
        <option value="breeding">Breeding</option>
      </select>
      <label for="log-date">Date *</label>
      <input type="date" id="log-date" name="date" required>

      <fieldset data-kind="health">
        <legend>Health / medical</legend>
        <label for="log-type">Type</label>
        <select id="log-type" name="type"><option>Vaccination</option><option>Health check</option><option>Treatment</option><option>Other</option></select>
        <label for="log-treatment">Treatment / vaccine / notes *</label>
        <input type="text" id="log-treatment" name="treatment" required>
        <label for="log-by">Administered by *</label>
        <input type="text" id="log-by" name="by" required>
        <label for="log-status">Status</label>
        <select id="log-status" name="status"><option>Done</option><option>Scheduled</option></select>
      </fieldset>

      <fieldset data-kind="weight" hidden disabled>
        <legend>Weight</legend>
        <label for="log-kg">Weight (kg) *</label>
        <input type="number" id="log-kg" name="kg" min="0.1" step="any" required>
      </fieldset>

      <fieldset data-kind="breeding" hidden disabled>
        <legend>Breeding</legend>
        <label for="log-event">Event</label>
        <select id="log-event" name="event"><option>Mating</option><option>Pregnancy check</option><option>Birth</option><option>Other</option></select>
        <label for="log-paired">Paired with (tag ID)</label>
        <input type="text" id="log-paired" name="pairedWith">
        <label for="log-outcome">Outcome *</label>
        <input type="text" id="log-outcome" name="outcome" required>
      </fieldset>

      <p role="alert"></p>
      <button type="submit" class="btn">Save entry</button>
      <button type="button" class="btn secondary" id="log-cancel">Cancel</button>
    </form>
  </dialog>`;

function render(a) {
  const kv = (k, v) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`;
  root.innerHTML = `
    <div class="back-row">
      <a href="${rootUrl('pages/animal-records.html')}">Back to Animal Records</a>
      <div><a class="btn secondary" href="${rootUrl('pages/animal-form.html')}?id=${encodeURIComponent(a.id)}">Edit Record</a> <button type="button" class="btn" id="add-log-btn">+ Add Log Entry</button></div>
    </div>
    <section class="animal-profile-head">
      <img src="${imageUrl(a)}" alt="${escapeHtml(a.name)}">
      <div>${statusBadge(a.status)} <span>${escapeHtml(a.location)}</span>
        <h1>${escapeHtml(a.name)}</h1>
        <p>Tag ID: <strong>${escapeHtml(a.tag)}</strong> | ${escapeHtml(categoryLabel(a.species))} | ${escapeHtml(a.breed)}</p></div>
      <div class="visibility-box">
        <strong>Website visibility</strong>
        <label><input type="checkbox" id="toggle-sale" ${a.forSale ? 'checked' : ''}> Mark as For Sale</label>
        <label><input type="checkbox" id="toggle-featured" ${a.featured ? 'checked' : ''}> Feature on Website</label>
        <p id="visibility-msg" role="status" class="fine"></p>
      </div>
    </section>
    <nav class="profile-tabs" aria-label="Animal record sections"><ul>
      <li><a href="#overview" aria-current="true">Overview</a></li><li><a href="#health">Health + Medical</a></li>
      <li><a href="#weight">Weight History</a></li><li><a href="#breeding">Breeding</a></li>
      <li><a href="#lineage">Lineage</a></li><li><a href="#notes">Notes</a></li></ul></nav>
    <div class="dashboard-grid record-detail">
      <section class="panel" id="overview"><h2>Key information</h2><dl class="key-values">
        ${kv('Species', categoryLabel(a.species))}${kv('Breed', a.breed)}${kv('Sex', capitalize(a.sex))}
        ${kv('Date of birth', `${formatDate(a.dob)} (${formatAge(a.dob)})`)}${kv('Current weight', `${a.weightKg} kg`)}
        ${kv('Status', capitalize(a.status))}${kv('Location', a.location)}${kv('Registration', a.registration)}</dl></section>
      <section class="panel" id="weight"><h2>Weight history</h2>${weightChart([...(a.weightHistory ?? [])].sort(byDate('date')))}</section>
      <section class="panel" id="health"><h2>Vaccination + medical log</h2>
        ${table(['Date', 'Type', 'Treatment / Vaccine', 'Administered by', 'Status'], [...(a.healthLog ?? [])].sort(byDate('date', -1)).map((l) => [formatDate(l.date), l.type, l.treatment, l.by, l.status]), 'No medical records yet.')}</section>
      <section class="panel" id="lineage"><h2>Lineage</h2><p>Sire: <strong>${escapeHtml(a.sire)}</strong> &rarr; Animal: <strong>${escapeHtml(a.tag)}</strong> &larr; Dam: <strong>${escapeHtml(a.dam)}</strong></p></section>
      <section class="panel" id="breeding"><h2>Breeding history</h2>
        ${table(['Date', 'Event', 'Paired with', 'Outcome'], [...(a.breeding ?? [])].sort(byDate('date', -1)).map((b) => [formatDate(b.date), b.event, b.pairedWith, b.outcome]), 'No breeding records.')}</section>
      <section class="panel" id="notes"><h2>Notes</h2><p>${escapeHtml(a.notes)}</p></section>
    </div>
    ${LOG_DIALOG}`;

  // Saved straight to Firestore, so the public website changes immediately.
  const msg = $('#visibility-msg');
  const bind = (selector, field, onText, offText) => $(selector).addEventListener('change', async (e) => {
    const box = e.target;
    try {
      await updateAnimal(a.id, { [field]: box.checked });
      msg.textContent = box.checked ? onText : offText;
    } catch (error) {
      console.error(error);
      box.checked = !box.checked;
      msg.textContent = 'Could not save the change. Please try again.';
    }
  });
  bind('#toggle-sale', 'forSale', 'Now visible on the website.', 'Hidden from the website.');
  bind('#toggle-featured', 'featured', 'Now featured on the website.', 'No longer featured.');

  wireLogDialog(a);
}

function wireLogDialog(a) {
  const dialog = $('#log-dialog');
  const form = $('#log-form');

  // Only the fields for the chosen entry type are shown (and validated)
  const showKind = () => $$('fieldset[data-kind]', form).forEach((fs) => {
    const on = fs.dataset.kind === form.elements.kind.value;
    fs.hidden = !on;
    fs.disabled = !on;   // disabled fields are skipped by validation and by the form data
  });
  form.elements.kind.addEventListener('change', showKind);

  $('#add-log-btn').addEventListener('click', () => {
    form.reset();
    showKind();
    form.elements.date.value = new Date().toISOString().slice(0, 10);
    form.elements.by.value = user.name;
    form.querySelector('[role="alert"]').textContent = '';
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  });
  $('#log-cancel').addEventListener('click', () => (dialog.close ? dialog.close() : dialog.removeAttribute('open')));

  handleForm(
    form,
    async (data) => {
      const entry = { date: data.date };
      if (data.kind === 'health') Object.assign(entry, { type: data.type, treatment: data.treatment.trim(), by: data.by.trim(), status: data.status });
      if (data.kind === 'weight') entry.kg = Number(data.kg);
      if (data.kind === 'breeding') Object.assign(entry, { event: data.event, pairedWith: (data.pairedWith || '').trim(), outcome: data.outcome.trim() });
      try {
        await addLogEntry(a, data.kind, entry);
      } catch (error) {
        console.error(error);
        throw new Error('Could not save the entry. Check you are logged in as staff and try again.');
      }
      render(await getAnimalById(a.id));   // show the new entry
    },
    (data) => (new Date(data.date) > new Date() && data.kind !== 'health'
      ? { message: 'The date cannot be in the future.', field: 'date' } : undefined),
  );
}

user = await requireRole('staff');
if (user) {
  try {
    const animal = await getAnimalById(getParam('id'));
    if (animal) { document.title = `${animal.name} | Herd management`; render(animal); }
    else root.innerHTML = `<p class="empty-state">Animal not found. <a href="${rootUrl('pages/animal-records.html')}">Back to records</a></p>`;
  } catch (error) {
    console.error(error);
    root.innerHTML = '<p class="error-state" role="alert">Could not load this record.</p>';
  }
}
