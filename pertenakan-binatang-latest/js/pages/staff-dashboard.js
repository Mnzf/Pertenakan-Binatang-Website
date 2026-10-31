// pages/staff-dashboard.js - herd overview numbers calculated from the data
import { requireRole } from '../auth.js';
import { getAnimals } from '../data.js';
import { CATEGORIES } from '../config.js';
import { $, escapeHtml } from '../utils.js';

if (requireRole('staff')) {
  try {
    const animals = await getAnimals();
    const count = (fn) => animals.filter(fn).length;
    const metric = (label, value, note) =>
      `<div class="metric"><span>${escapeHtml(label)}</span><strong>${value}</strong><small>${escapeHtml(note)}</small></div>`;

    $('#metric-grid').innerHTML = [
      metric('Total herd', animals.length, `Across ${new Set(animals.map((a) => a.species)).size} categories`),
      metric('Listed for sale', count((a) => a.forSale), 'Visible on the website'),
      metric('Reserved', count((a) => a.status === 'reserved'), 'Waiting for the owner'),
      metric('Sold', count((a) => a.status === 'sold'), 'Completed sales'),
    ].join('');

    const max = Math.max(1, ...CATEGORIES.map((c) => count((a) => a.species === c.slug)));
    $('#species-chart').innerHTML = CATEGORIES.map((c) => {
      const n = count((a) => a.species === c.slug);
      return `<li>${escapeHtml(c.label)} <progress value="${n}" max="${max}">${n}</progress></li>`;
    }).join('');
  } catch (error) {
    console.error(error);
    $('#metric-grid').innerHTML = '<p class="error-state" role="alert">Could not load herd data.</p>';
  }
}
