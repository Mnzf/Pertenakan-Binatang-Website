// pages/buyer-messages.js - a buyer reads the farm's replies to their inquiries and can answer
import { requireRole } from '../auth.js';
import { getMyInquiries } from '../inquiries.js';
import { wireThreads } from '../threads.js';
import { detailUrl } from '../render.js';
import { $, getParam, escapeHtml, formatDateTime, rootUrl } from '../utils.js';

const list = $('#thread-list');
const user = await requireRole('buyer');

if (user) {
  try {
    const inquiries = await getMyInquiries(user.uid);
    const waiting = () => inquiries.filter((q) => q.lastMessageFrom === 'staff').length;

    const card = (q) => `
      <article class="thread-card" id="inq-${escapeHtml(q.id)}">
        <div class="thread-head">
          <div><strong>${escapeHtml(q.ref)}</strong> | <a href="${detailUrl(q.animalId)}">${escapeHtml(q.animalName)} (${escapeHtml(q.animalTag)})</a><br>
            <small>Sent ${escapeHtml(formatDateTime(q.createdAt))}</small></div>
          <div><span class="status">${escapeHtml(q.status)}</span>
            ${q.lastMessageFrom === 'staff' ? '<span class="status status-reply">Reply from the farm</span>' : ''}</div>
        </div>
        <div class="bubble from-buyer"><small>You | ${escapeHtml(formatDateTime(q.createdAt))}</small><p>${escapeHtml(q.message)}</p></div>
        <details class="thread" data-thread="${escapeHtml(q.id)}">
          <summary>Conversation${q.lastMessage ? ` | last message: ${escapeHtml(q.lastMessage)}` : ''}</summary>
          <div class="thread-messages"></div>
          <form class="reply-form" data-reply="${escapeHtml(q.id)}">
            <label for="rp-${escapeHtml(q.id)}">Write a message to the farm</label>
            <textarea id="rp-${escapeHtml(q.id)}" name="text" rows="3" required></textarea>
            <p role="alert"></p>
            <button type="submit" class="btn">Send</button>
          </form>
        </details>
      </article>`;

    $('#msg-count').textContent = inquiries.length ? `${inquiries.length} inquiries | ${waiting()} with a reply from the farm` : 'No inquiries yet';
    list.innerHTML = inquiries.length
      ? inquiries.map(card).join('')
      : `<p class="empty-state">You have not sent any inquiries yet. <a href="${rootUrl('pages/animals.html')}">Browse the animals</a> and choose "Send an Inquiry to Buy".</p>`;

    wireThreads(list, {
      user,
      find: (id) => inquiries.find((q) => q.id === id),
      onSent: () => { $('#msg-count').textContent = `${inquiries.length} inquiries | ${waiting()} with a reply from the farm`; },
    });

    // Opened from the dashboard: ?inquiry=ID
    const wanted = getParam('inquiry');
    const target = wanted && document.getElementById(`inq-${wanted}`);
    if (target) {
      target.querySelector('details').open = true;
      target.scrollIntoView({ block: 'start' });
    }
  } catch (error) {
    console.error(error);
    list.innerHTML = '<p class="error-state" role="alert">Could not load your messages. Please refresh.</p>';
  }
}
