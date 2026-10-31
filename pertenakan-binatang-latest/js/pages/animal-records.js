// pages/animal-records.js - staff table: search, filter, pagination
import { requireRole } from '../auth.js';
import { getAnimals } from '../data.js';
import { filterAnimals } from '../filters.js';
import { profileUrl } from '../render.js';
import { CATEGORIES, categoryLabel } from '../config.js';
import { $, escapeHtml, capitalize, formatDate } from '../utils.js';

const PER_PAGE = 10;
const form = $('#record-filters');
const holder = $('#records-table');
const pager = $('#records-pagination');

if (requireRole('staff')) {
  try {
    const animals = await getAnimals();
    let page = 1;

    const fill = (select, values) => select.insertAdjacentHTML('beforeend', values.map(([v, l]) => `<option value="${escapeHtml(v)}">${escapeHtml(l)}</option>`).join(''));
    const unique = (key) => [...new Set(animals.map((a) => a[key]))].sort().map((v) => [v, capitalize(v)]);
    fill(form.elements['r-species'], CATEGORIES.map((c) => [c.slug, c.label]));
    fill(form.elements['r-breed'], unique('breed'));
    fill(form.elements['r-status'], unique('status'));
    fill(form.elements['r-location'], unique('location'));

    const render = () => {
      const filters = {
        search: form.elements['r-search'].value, category: form.elements['r-species'].value,
        breed: form.elements['r-breed'].value, status: form.elements['r-status'].value, location: form.elements['r-location'].value,
      };
      const rows = filterAnimals(animals, filters);
      const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
      page = Math.min(page, pages);
      const slice = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

      holder.innerHTML = rows.length ? `
        <table>
          <thead><tr><th>ID / Tag</th><th>Name</th><th>Species</th><th>Breed</th><th>Sex</th><th>DOB</th><th>Status</th><th>Location</th></tr></thead>
          <tbody>${slice.map((a) => `
            <tr>
              <td><a href="${profileUrl(a.id)}">${escapeHtml(a.tag)}</a></td><td>${escapeHtml(a.name)}</td>
              <td>${escapeHtml(categoryLabel(a.species))}</td><td>${escapeHtml(a.breed)}</td><td>${escapeHtml(capitalize(a.sex))}</td>
              <td>${escapeHtml(formatDate(a.dob))}</td><td><span class="status status-${escapeHtml(a.status)}">${escapeHtml(capitalize(a.status))}</span></td>
              <td>${escapeHtml(a.location)}</td>
            </tr>`).join('')}</tbody>
        </table>` : '<p class="empty-state">No records match your search.</p>';

      $('#records-count').textContent = `${rows.length} of ${animals.length} records`;
      pager.innerHTML = `<span>Page ${page} of ${pages}</span>
        <span><button type="button" data-page="prev" ${page <= 1 ? 'disabled' : ''}>Prev</button>
        <button type="button" data-page="next" ${page >= pages ? 'disabled' : ''}>Next</button></span>`;
    };

    form.addEventListener('input', () => { page = 1; render(); });
    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('reset', () => setTimeout(() => { page = 1; render(); }));
    pager.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-page]');
      if (!btn) return;
      page += btn.dataset.page === 'next' ? 1 : -1;
      render();
    });
    render();
  } catch (error) {
    console.error(error);
    holder.innerHTML = '<p class="error-state" role="alert">Could not load the animal records.</p>';
  }
}
