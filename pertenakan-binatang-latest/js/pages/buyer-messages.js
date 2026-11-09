// pages/buyer-messages.js - a buyer reads the farm's replies (to inquiries and contact messages) and can answer
import { requireRole } from '../auth.js';
import { getMyInquiries } from '../inquiries.js';
import { getMyContactMessages, contactThread } from '../messages.js';
import { wireThreads } from '../threads.js';
import { detailUrl } from '../render.js';
import { $, getParam, escapeHtml, formatDateTime, rootUrl } from '../utils.js';

const list = $('#thread-list');
const contactList = $('#contact-thread-list');
const user = await requireRole('buyer');

if (user) {
  let inquiries = [];
  let contacts = [];
  const waiting = () => inquiries.filter((q) => q.lastMessageFrom === 'staff').length + contacts.filter((m) => m.lastMessageFrom === 'staff').length;
  const summary = () => {
    $('#msg-count').textContent = inquiries.length || contacts.length
      ? `${inquiries.length} inquiries | ${contacts.length} contact messages | ${waiting()} with a reply from the farm`
      : 'No messages yet';
  };

  const replyForm = (id, label) => `
    <details class="thread" data-thread="${escapeHtml(id)}">
      PLACEHOLDER_SUMMARY
      <div class="thread-messages"></div>
      <form class="reply-form" data-reply="${escapeHtml(id)}">
        <label for="rp-${escapeHtml(id)}">${label}</label>
        <textarea id="rp-${escapeHtml(id)}" name="text" rows="3" required></textarea>
        <p role="alert"></p>
        <button type="submit" class="btn">Send</button>
      </form>
    </details>`;
  const summaryLine = (item) => `<summary>Conversation${item.lastMessage ? ` | last message: ${escapeHtml(item.lastMessage)}` : ''}</summary>`;
  const replyBadge = (item) => (item.lastMessageFrom === 'staff' ? '<span class="status status-reply">Reply from the farm</span>' : '');

  const inquiryCard = (q) => `
    <article class="thread-card" id="inq-${escapeHtml(q.id)}">
      <div class="thread-head">
        <div><strong>${escapeHtml(q.ref)}</strong> | <a href="${detailUrl(q.animalId)}">${escapeHtml(q.animalName)} (${escapeHtml(q.animalTag)})</a><br>
          <small>Sent ${escapeHtml(formatDateTime(q.createdAt))}</small></div>
        <div><span class="status">${escapeHtml(q.status)}</span> ${replyBadge(q)}</div>
      </div>
      <div class="bubble from-buyer"><small>You | ${escapeHtml(formatDateTime(q.createdAt))}</small><p>${escapeHtml(q.message)}</p></div>
      ${replyForm(q.id, 'Write a message to the farm').replace('PLACEHOLDER_SUMMARY', summaryLine(q))}
    </article>`;

  const contactCard = (m) => `
    <article class="thread-card" id="msg-${escapeHtml(m.id)}">
      <div class="thread-head">
        <div><strong>Contact message</strong><br><small>Sent ${escapeHtml(formatDateTime(m.createdAt))}</small></div>
        <div>${replyBadge(m)}</div>
      </div>
      <div class="bubble from-buyer"><small>You | ${escapeHtml(formatDateTime(m.createdAt))}</small><p>${escapeHtml(m.message)}</p></div>
      ${replyForm(m.id, 'Write a message to the farm').replace('PLACEHOLDER_SUMMARY', summaryLine(m))}
    </article>`;

  try {
    inquiries = await getMyInquiries(user.uid);
    list.innerHTML = inquiries.length
      ? inquiries.map(inquiryCard).join('')
      : `<p class="empty-state">You have not sent any inquiries yet. <a href="${rootUrl('pages/animals.html')}">Browse the animals</a> and choose "Send an Inquiry to Buy".</p>`;
    wireThreads(list, { user, find: (id) => inquiries.find((q) => q.id === id), onSent: summary });
  } catch (error) {
    console.error(error);
    list.innerHTML = '<p class="error-state" role="alert">Could not load your inquiries. Please refresh.</p>';
  }

  try {
    contacts = await getMyContactMessages(user.uid);
    contactList.innerHTML = contacts.length
      ? contacts.map(contactCard).join('')
      : `<p class="empty-state">Messages you send from the <a href="${rootUrl('pages/contact.html')}">contact page</a> while logged in appear here, with the farm's reply.</p>`;
    wireThreads(contactList, { user, find: (id) => contacts.find((m) => m.id === id), onSent: summary, api: contactThread });
  } catch (error) {
    console.error(error);
    contactList.innerHTML = '<p class="error-state" role="alert">Could not load your contact messages. Please refresh.</p>';
  }
  summary();

  // Opened from the dashboard: ?inquiry=ID or ?message=ID
  const wanted = getParam('inquiry') ? `inq-${getParam('inquiry')}` : getParam('message') ? `msg-${getParam('message')}` : null;
  const target = wanted && document.getElementById(wanted);
  if (target) {
    target.querySelector('details').open = true;
    target.scrollIntoView({ block: 'start' });
  }
}
