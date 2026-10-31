// pages/buyer-dashboard.js - saved animals + inquiry status
import { requireRole } from '../auth.js';
import { getAnimals } from '../data.js';
import { getSavedIds, getInquiries } from '../storage.js';
import { detailUrl, imageUrl } from '../render.js';
import { $, escapeHtml, capitalize, formatDate } from '../utils.js';

if (requireRole('buyer')) {
  try {
    const animals = await getAnimals();
    const saved = getSavedIds().map((id) => animals.find((a) => a.id === id)).filter(Boolean);
    const inquiries = getInquiries();

    $('#metric-saved').textContent = String(saved.length).padStart(2, '0');
    $('#metric-inquiries').textContent = String(inquiries.length).padStart(2, '0');

    $('#saved-list').innerHTML = saved.length
      ? saved.map((a) => `
        <li>
          <img src="${imageUrl(a)}" alt="">
          <span><strong>${escapeHtml(a.name)} (${escapeHtml(a.tag)})</strong><small>${escapeHtml(a.breed)} | ${escapeHtml(capitalize(a.status))}</small></span>
          <a href="${detailUrl(a.id)}">View</a>
        </li>`).join('')
      : '<li>You have not saved any animals yet.</li>';

    $('#inquiry-list').innerHTML = inquiries.length
      ? inquiries.map((q) => `<li>${escapeHtml(q.ref)} | ${escapeHtml(q.animalName)} | ${escapeHtml(q.status)} <small>${escapeHtml(formatDate(q.createdAt))}</small></li>`).join('')
      : '<li>No inquiries yet.</li>';
  } catch (error) {
    console.error(error);
    $('#saved-list').innerHTML = '<li class="error-state" role="alert">Could not load your saved animals.</li>';
  }
}
