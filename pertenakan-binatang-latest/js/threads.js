// threads.js - shows and sends the messages under an inquiry. Used by the buyer AND the staff page.
import { inquiryThread } from './inquiries.js';
import { escapeHtml, formatDateTime } from './utils.js';

export function bubble(message) {
  const from = message.from === 'staff' ? 'staff' : 'buyer';
  return `<div class="bubble from-${from}"><small>${escapeHtml(message.authorName || from)} | ${escapeHtml(formatDateTime(message.createdAt))}</small><p>${escapeHtml(message.text)}</p></div>`;
}

// root: the element that holds the cards. user: the logged-in profile.
// find(id): returns the inquiry (or contact message) object. onSent(item, message): lets the page refresh its own bits.
// api: where the messages live (inquiryThread by default, contactThread for contact-form messages).
export function wireThreads(root, { user, find, onSent, api = inquiryThread }) {
  // Load the conversation the first time a card is opened ("toggle" does not bubble, so listen while capturing)
  root.addEventListener('toggle', async (event) => {
    const box = event.target;
    if (!box.matches?.('details[data-thread]') || !box.open || box.dataset.loaded) return;
    const holder = box.querySelector('.thread-messages');
    holder.innerHTML = '<p class="loading">Loading...</p>';
    try {
      const messages = await api.getMessages(box.dataset.thread);
      holder.innerHTML = messages.length ? messages.map(bubble).join('') : '<p class="fine no-replies">No replies yet.</p>';
      box.dataset.loaded = '1';
    } catch (error) {
      console.error(error);
      holder.innerHTML = '<p class="error-state" role="alert">Could not load the conversation. Please try again.</p>';
    }
  }, true);

  root.addEventListener('submit', async (event) => {
    const form = event.target.closest('form[data-reply]');
    if (!form) return;
    event.preventDefault();
    const alertBox = form.querySelector('[role="alert"]');
    const text = form.elements.text.value.trim();
    alertBox.textContent = '';
    if (!text) { alertBox.textContent = 'Please write a message first.'; return; }
    if (text.length > 2000) { alertBox.textContent = 'Please keep the message under 2000 characters.'; return; }

    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const inquiry = find(form.dataset.reply);
      const sent = await api.sendMessage(inquiry, user, text);
      const holder = form.closest('details').querySelector('.thread-messages');
      holder.querySelector('.no-replies')?.remove();
      holder.insertAdjacentHTML('beforeend', bubble(sent));
      form.reset();
      Object.assign(inquiry, { lastMessage: sent.patch.lastMessage, lastMessageFrom: sent.from, lastMessageAt: sent.createdAt });
      if (sent.patch.status) inquiry.status = sent.patch.status;
      if (sent.patch.handled) inquiry.handled = true;
      onSent?.(inquiry, sent);
    } catch (error) {
      console.error(error);
      alertBox.textContent = 'Could not send your message. Please try again.';
    } finally {
      button.disabled = false;
    }
  });
}
