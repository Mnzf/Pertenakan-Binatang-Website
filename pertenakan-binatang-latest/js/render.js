// render.js - builds HTML strings for things that appear on several pages.
// Every value that came from data goes through escapeHtml().

import { rootUrl, escapeHtml, formatPrice, formatAge, capitalize } from './utils.js';
import { isSaved } from './storage.js';
import { categoryLabel } from './config.js';

export const detailUrl  = (id) => `${rootUrl('pages/animal-detail.html')}?id=${encodeURIComponent(id)}`;
export const inquireUrl = (id) => `${rootUrl('pages/inquire.html')}?animal=${encodeURIComponent(id)}`;
export const profileUrl = (id) => `${rootUrl('pages/animal-profile.html')}?id=${encodeURIComponent(id)}`;
export const imageUrl   = (animal, index = 0) => rootUrl(animal.images?.[index] ?? 'assets/images/placeholder.svg');

export const statusBadge = (status) =>
  `<span class="status status-${escapeHtml(status)}">${escapeHtml(capitalize(status))}</span>`;

export function saveButton(animal) {
  const saved = isSaved(animal.id);
  return `<button type="button" class="save-btn" data-save="${escapeHtml(animal.id)}" aria-pressed="${saved}" aria-label="Save ${escapeHtml(animal.name)}">${saved ? 'Saved' : 'Save'}</button>`;
}

export function animalCard(animal, { featured = false } = {}) {
  return `
    <article class="card${featured ? ' featured' : ''}">
      ${featured ? '<span class="feature-flag">Featured</span>' : ''}
      <img src="${imageUrl(animal)}" alt="${escapeHtml(animal.name)}, ${escapeHtml(animal.breed)}">
      ${statusBadge(animal.status)}
      ${saveButton(animal)}
      <h3>${escapeHtml(animal.name)} <small>(${escapeHtml(animal.tag)})</small></h3>
      <p>${escapeHtml(animal.breed)} | ${escapeHtml(formatAge(animal.dob))} | ${escapeHtml(capitalize(animal.sex))}</p>
      <p><strong>${escapeHtml(formatPrice(animal.price))}${animal.price == null ? '' : ' / Inquire'}</strong></p>
      <a href="${detailUrl(animal.id)}">View details</a>
    </article>`;
}

export const categoryOf = (animal) => categoryLabel(animal.species);

export const emptyState = (message, linkHtml = '') =>
  `<p class="empty-state">${message} ${linkHtml}</p>`;

export const errorState = () =>
  '<p class="error-state" role="alert">Sorry, we could not load the animals. Please refresh the page. If it keeps happening, make sure you opened the site with Live Server.</p>';
