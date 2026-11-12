// pages/staff-inquiries.js - staff read buyer inquiries (and reply), and read contact-form messages
import { requireRole } from '../auth.js';
import { getAllInquiries, updateInquiryStatus } from '../inquiries.js';
import { getContactMessages, setMessageHandled, contactThread } from '../messages.js';
import { wireThreads } from '../threads.js';
import { profileUrl } from '../render.js';
import { INQUIRY_STATUSES } from '../config.js';
import { $, getParam, escapeHtml, formatDateTime } from '../utils.js';

const list = $('#inq-list');
const filter = $('#i-status');
const user = await requireRole('staff');

if (user) {
  // ---------- tabs ----------
  const tabs = { inq: [$('#tab-inq'), $('#panel-inq')], contact: [$('#tab-contact'), $('#panel-contact')] };
  const showTab = (name) => Object.entries(tabs).forEach(([key, [tab, panel]]) => {
    tab.setAttribute('aria-selected', String(key === name));
    panel.hidden = key !== name;
  });
  Object.entries(tabs).forEach(([key, [tab]]) => tab.addEventListener('click', () => showTab(key)));
  if (getParam('tab') === 'contact') showTab('contact');

  // ---------- buyer inquiries ----------
  let all = [];
  try {
    all = await getAllInquiries();

    const statusOptions = (current) => INQUIRY_STATUSES.map((s) => `<option${s === current ? ' selected' : ''}>${s}</option>`).join('');
    const card = (q) => `
      <article class="thread-card" id="inq-${escapeHtml(q.id)}">
        <div class="thread-head">
          <div><strong>${escapeHtml(q.ref)}</strong> | <a href="${profileUrl(q.animalId)}">${escapeHtml(q.animalName)} (${escapeHtml(q.animalTag)})</a><br>
            <small>${escapeHtml(formatDateTime(q.createdAt))}</small></div>
          <div><label for="st-${escapeHtml(q.id)}" class="visually-hidden">Status for ${escapeHtml(q.ref)}</label>
            <select id="st-${escapeHtml(q.id)}" data-inq="${escapeHtml(q.id)}">${statusOptions(q.status)}</select></div>
        </div>
        <p class="thread-contact">${escapeHtml(q.buyerName)} | <a href="mailto:${escapeHtml(q.buyerEmail)}">${escapeHtml(q.buyerEmail)}</a>${q.buyerPhone ? ` | <a href="tel:${escapeHtml(q.buyerPhone)}">${escapeHtml(q.buyerPhone)}</a>` : ''}
          | prefers ${escapeHtml(q.contactMethod)}${q.contactTime ? ` (${escapeHtml(q.contactTime)})` : ''}</p>
        <div class="bubble from-buyer"><small>${escapeHtml(q.buyerName)} | ${escapeHtml(formatDateTime(q.createdAt))}</small><p>${escapeHtml(q.message)}</p></div>
        <details class="thread" data-thread="${escapeHtml(q.id)}">
          <summary>Conversation${q.lastMessage ? ` | last message: ${escapeHtml(q.lastMessage)}` : ''}</summary>
          <div class="thread-messages"></div>
          <form class="reply-form" data-reply="${escapeHtml(q.id)}">
            <label for="rp-${escapeHtml(q.id)}">Reply to ${escapeHtml(q.buyerName)}</label>
            <textarea id="rp-${escapeHtml(q.id)}" name="text" rows="3" required></textarea>
            <p role="alert"></p>
            <button type="submit" class="btn">Send reply</button>
          </form>
        </details>
      </article>`;

    const render = () => {
      const rows = filter.value ? all.filter((q) => q.status === filter.value) : all;
      $('#inq-count').textContent = `${rows.length} of ${all.length} inquiries`;
      list.innerHTML = rows.length ? rows.map(card).join('') : '<p class="empty-state">No inquiries yet.</p>';
    };

    filter.insertAdjacentHTML('beforeend', INQUIRY_STATUSES.map((s) => `<option>${s}</option>`).join(''));
    filter.addEventListener('change', render);

    list.addEventListener('change', async (event) => {
      const select = event.target.closest('select[data-inq]');
      if (!select) return;
      const inquiry = all.find((q) => q.id === select.dataset.inq);
      const old = inquiry.status;
      try {
        await updateInquiryStatus(inquiry.id, select.value);
        inquiry.status = select.value;
        $('#inq-msg').textContent = `${inquiry.ref} marked ${select.value}.`;
      } catch (error) {
        console.error(error);
        select.value = old;
        $('#inq-msg').textContent = 'Could not update the status. Please try again.';
      }
    });

    wireThreads(list, {
      user,
      find: (id) => all.find((q) => q.id === id),
      onSent: (inquiry) => {
        const select = $(`select[data-inq="${inquiry.id}"]`, list);
        if (select) select.value = inquiry.status;   // the first reply marks it "Contacted"
        $('#inq-msg').textContent = `Reply sent for ${inquiry.ref}.`;
      },
    });

    render();
  } catch (error) {
    console.error(error);
    list.innerHTML = '<p class="error-state" role="alert">Could not load inquiries.</p>';
  }

  // ---------- contact-form messages (conversations, like the inquiries) ----------
  const contactList = $('#contact-list');
  const mFilter = $('#m-filter');
  try {
    const messages = await getContactMessages();
    const typeLabel = { animal: 'Animal inquiry', visit: 'Book a visit / tour' };

    const updateTabLabel = () => {
      const fresh = messages.filter((m) => !m.handled).length;
      $('#tab-contact').textContent = fresh ? `Contact messages (${fresh} new)` : 'Contact messages';
    };

    const messageCard = (m) => `
      <article class="thread-card" id="msg-${escapeHtml(m.id)}">
        <div class="thread-head">
          <div><strong>${escapeHtml(m.name)}</strong> | ${escapeHtml(typeLabel[m.type] ?? 'General')}<br>
            <small>${escapeHtml(formatDateTime(m.createdAt))}</small></div>
          <div><label for="ms-${escapeHtml(m.id)}" class="visually-hidden">Status for the message from ${escapeHtml(m.name)}</label>
            <select id="ms-${escapeHtml(m.id)}" data-msgstatus="${escapeHtml(m.id)}">
              <option value="new"${m.handled ? '' : ' selected'}>New</option><option value="handled"${m.handled ? ' selected' : ''}>Handled</option></select></div>
        </div>
        <p class="thread-contact"><a href="mailto:${escapeHtml(m.email)}">${escapeHtml(m.email)}</a>${m.phone ? ` | <a href="tel:${escapeHtml(m.phone)}">${escapeHtml(m.phone)}</a>` : ''}
          | ${m.userId ? 'has a buyer account' : 'visitor (no account)'}</p>
        <div class="bubble from-buyer"><small>${escapeHtml(m.name)} | ${escapeHtml(formatDateTime(m.createdAt))}</small><p>${escapeHtml(m.message)}</p></div>
        ${m.userId ? `
        <details class="thread" data-thread="${escapeHtml(m.id)}">
          <summary>Conversation${m.lastMessage ? ` | last message: ${escapeHtml(m.lastMessage)}` : ''}</summary>
          <div class="thread-messages"></div>
          <form class="reply-form" data-reply="${escapeHtml(m.id)}">
            <label for="rp-${escapeHtml(m.id)}">Reply to ${escapeHtml(m.name)}</label>
            <textarea id="rp-${escapeHtml(m.id)}" name="text" rows="3" required></textarea>
            <p role="alert"></p>
            <button type="submit" class="btn">Send reply</button>
          </form>
        </details>` : `
        <p class="fine">This visitor was not logged in, so they cannot read replies on the website. Reply by email or phone, then mark it as handled.</p>
        <p><a class="btn" href="mailto:${escapeHtml(m.email)}?subject=${encodeURIComponent('Re: your message to Kaznisah Farming')}">Reply by email</a></p>`}
      </article>`;

    const renderContacts = () => {
      const rows = messages.filter((m) => !mFilter.value || (mFilter.value === 'new' ? !m.handled : m.handled));
      updateTabLabel();
      contactList.innerHTML = rows.length ? rows.map(messageCard).join('') : '<p class="empty-state">No messages.</p>';
    };

    mFilter.addEventListener('change', renderContacts);
    contactList.addEventListener('change', async (event) => {
      const select = event.target.closest('select[data-msgstatus]');
      if (!select) return;
      const message = messages.find((m) => m.id === select.dataset.msgstatus);
      const old = message.handled;
      try {
        await setMessageHandled(message.id, select.value === 'handled');
        message.handled = select.value === 'handled';
        updateTabLabel();
        $('#contact-msg').textContent = message.handled ? 'Marked as handled.' : 'Marked as new.';
      } catch (error) {
        console.error(error);
        select.value = old ? 'handled' : 'new';
        $('#contact-msg').textContent = 'Could not update the message. Please try again.';
      }
    });

    wireThreads(contactList, {
      user,
      find: (id) => messages.find((m) => m.id === id),
      api: contactThread,
      onSent: (message) => {
        const select = $(`select[data-msgstatus="${message.id}"]`, contactList);
        if (select) select.value = 'handled';   // a reply counts as handled
        updateTabLabel();
        $('#contact-msg').textContent = 'Reply sent.';
      },
    });
    renderContacts();
  } catch (error) {
    console.error(error);
    contactList.innerHTML = '<p class="error-state" role="alert">Could not load the contact messages.</p>';
  }
}
