// pages/animal-profile.js - staff view of ONE animal (?id=...)
import { requireRole } from '../auth.js';
import { getAnimalById } from '../data.js';
import { setOverride } from '../storage.js';
import { imageUrl, statusBadge } from '../render.js';
import { categoryLabel } from '../config.js';
import { $, getParam, escapeHtml, formatDate, formatAge, capitalize, rootUrl } from '../utils.js';

const root = $('#profile-root');

function table(headers, rows, empty) {
  if (!rows.length) return `<p>${empty}</p>`;
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

// Simple line chart drawn as SVG (no chart library needed)
function weightChart(history) {
  if (history.length < 2) return '<p>Not enough weight records yet.</p>';
  const kgs = history.map((h) => h.kg);
  const min = Math.min(...kgs), max = Math.max(...kgs), span = max - min || 1;
  const points = history.map((h, i) => `${(i / (history.length - 1)) * 600},${160 - ((h.kg - min) / span) * 130}`).join(' ');
  return `<svg class="sparkline" viewBox="0 0 600 170" preserveAspectRatio="none" role="img" aria-label="Weight from ${kgs[0]} kg to ${kgs.at(-1)} kg"><polyline points="${points}"/></svg>
    <div class="sparkline-labels"><span>${escapeHtml(formatDate(history[0].date))}</span><span>${escapeHtml(formatDate(history.at(-1).date))}</span></div>`;
}

function render(a) {
  const kv = (k, v) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`;
  root.innerHTML = `
    <div class="back-row">
      <a href="${rootUrl('pages/animal-records.html')}">Back to Animal Records</a>
      <div><button type="button" class="btn secondary" disabled>Edit Record</button> <button type="button" class="btn" disabled>+ Add Log Entry</button></div>
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
      <section class="panel" id="weight"><h2>Weight history</h2>${weightChart(a.weightHistory ?? [])}</section>
      <section class="panel" id="health"><h2>Vaccination + medical log</h2>
        ${table(['Date', 'Type', 'Treatment / Vaccine', 'Administered by', 'Status'], (a.healthLog ?? []).map((l) => [formatDate(l.date), l.type, l.treatment, l.by, l.status]), 'No medical records yet.')}</section>
      <section class="panel" id="lineage"><h2>Lineage</h2><p>Sire: <strong>${escapeHtml(a.sire)}</strong> &rarr; Animal: <strong>${escapeHtml(a.tag)}</strong> &larr; Dam: <strong>${escapeHtml(a.dam)}</strong></p></section>
      <section class="panel" id="breeding"><h2>Breeding history</h2>
        ${table(['Date', 'Event', 'Paired with', 'Outcome'], (a.breeding ?? []).map((b) => [formatDate(b.date), b.event, b.pairedWith, b.outcome]), 'No breeding records.')}</section>
      <section class="panel" id="notes"><h2>Notes</h2><p>${escapeHtml(a.notes)}</p></section>
    </div>`;

  // DEMO: stored in the browser so the public pages react. Phase 4: update the Firestore document.
  const msg = $('#visibility-msg');
  $('#toggle-sale').addEventListener('change', (e) => { setOverride(a.id, { forSale: e.target.checked }); msg.textContent = e.target.checked ? 'Now visible on the website.' : 'Hidden from the website.'; });
  $('#toggle-featured').addEventListener('change', (e) => { setOverride(a.id, { featured: e.target.checked }); msg.textContent = e.target.checked ? 'Now featured on the website.' : 'No longer featured.'; });
}

if (requireRole('staff')) {
  try {
    const animal = await getAnimalById(getParam('id'));
    if (animal) { document.title = `${animal.name} | Herd management`; render(animal); }
    else root.innerHTML = `<p class="empty-state">Animal not found. <a href="${rootUrl('pages/animal-records.html')}">Back to records</a></p>`;
  } catch (error) {
    console.error(error);
    root.innerHTML = '<p class="error-state" role="alert">Could not load this record.</p>';
  }
}
