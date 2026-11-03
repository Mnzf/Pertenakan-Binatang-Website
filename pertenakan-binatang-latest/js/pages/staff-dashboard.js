// pages/staff-dashboard.js - herd overview numbers + latest inquiries, calculated from the data
import { requireRole } from '../auth.js';
import { getAnimals } from '../data.js';
import { getAllInquiries } from '../inquiries.js';
import { getContactMessages } from '../messages.js';
import { CATEGORIES } from '../config.js';
import { $, escapeHtml, formatDate, rootUrl } from '../utils.js';

if (await requireRole('staff')) {
  try {
    const [animals, inquiries, contacts] = await Promise.all([
      getAnimals(),
      getAllInquiries().catch(() => []),
      getContactMessages().catch(() => []),
    ]);
    const count = (fn) => animals.filter(fn).length;
    const metric = (label, value, note) =>
      `<div class="metric"><span>${escapeHtml(label)}</span><strong>${value}</strong><small>${escapeHtml(note)}</small></div>`;

    $('#metric-grid').innerHTML = [
      metric('Total herd', animals.length, `Across ${new Set(animals.map((a) => a.species)).size} categories`),
      metric('Listed for sale', count((a) => a.forSale), 'Visible on the website'),
      metric('New inquiries', inquiries.filter((q) => q.status === 'Submitted').length, 'Waiting for a reply'),
      metric('New contact messages', contacts.filter((m) => !m.handled).length, 'Not handled yet'),
      metric('Reserved', count((a) => a.status === 'reserved'), 'Waiting for the owner'),
      metric('Sold', count((a) => a.status === 'sold'), 'Completed sales'),
    ].join('');

    const max = Math.max(1, ...CATEGORIES.map((c) => count((a) => a.species === c.slug)));
    $('#species-chart').innerHTML = CATEGORIES.map((c) => {
      const n = count((a) => a.species === c.slug);
      return `<li>${escapeHtml(c.label)} <progress value="${n}" max="${max}">${n}</progress></li>`;
    }).join('');

    const link = rootUrl('pages/staff-inquiries.html');
    $('#latest-inquiries').innerHTML = inquiries.length
      ? inquiries.slice(0, 5).map((q) => `<li><a href="${link}">${escapeHtml(q.ref)}</a> | ${escapeHtml(q.animalName)} | ${escapeHtml(q.buyerName)} | <strong>${escapeHtml(q.status)}</strong> <small>${escapeHtml(formatDate(q.createdAt))}</small></li>`).join('')
      : '<li>No inquiries yet.</li>';
  } catch (error) {
    console.error(error);
    $('#metric-grid').innerHTML = '<p class="error-state" role="alert">Could not load herd data.</p>';
  }
}
