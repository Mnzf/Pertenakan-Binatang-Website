// pages/buyer-dashboard.js - saved animals + inquiry status
import { requireRole } from '../auth.js';
import { getPublicAnimals } from '../data.js';
import { getMyInquiries } from '../inquiries.js';
import { detailUrl, imageUrl } from '../render.js';
import { $, escapeHtml, capitalize, formatDate } from '../utils.js';

const user = await requireRole('buyer');
if (user) {
  $('#welcome-name').textContent = user.name.split(' ')[0];
  try {
    const [animals, inquiries] = await Promise.all([getPublicAnimals(), getMyInquiries(user.uid)]);
    const saved = user.saved.map((id) => animals.find((a) => a.id === id)).filter(Boolean);

    $('#metric-saved').textContent = String(saved.length).padStart(2, '0');
    $('#metric-inquiries').textContent = String(inquiries.filter((q) => q.status !== 'Closed').length).padStart(2, '0');

    $('#saved-list').innerHTML = saved.length
      ? saved.map((a) => `
        <li>
          <img src="${imageUrl(a)}" alt="">
          <span><strong>${escapeHtml(a.name)} (${escapeHtml(a.tag)})</strong><small>${escapeHtml(a.breed)} | ${escapeHtml(capitalize(a.status))}</small></span>
          <a href="${detailUrl(a.id)}">View</a>
        </li>`).join('')
      : '<li>You have not saved any animals yet.</li>';

    $('#inquiry-list').innerHTML = inquiries.length
      ? inquiries.map((q) => `<li>${escapeHtml(q.ref)} | ${escapeHtml(q.animalName)} | <strong>${escapeHtml(q.status)}</strong> <small>${escapeHtml(formatDate(q.createdAt))}</small></li>`).join('')
      : '<li>No inquiries yet. Open an animal and choose "Send an Inquiry to Buy".</li>';
  } catch (error) {
    console.error(error);
    $('#saved-list').innerHTML = '<li class="error-state" role="alert">Could not load your account data. Please refresh.</li>';
  }
}
