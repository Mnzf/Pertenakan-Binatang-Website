// pages/staff-inquiries.js - staff see buyer inquiries and update their status
import { requireRole } from '../auth.js';
import { getAllInquiries, updateInquiryStatus } from '../inquiries.js';
import { profileUrl } from '../render.js';
import { INQUIRY_STATUSES } from '../config.js';
import { $, escapeHtml, formatDate } from '../utils.js';

const holder = $('#inq-table');
const filter = $('#i-status');

if (await requireRole('staff')) {
  try {
    const all = await getAllInquiries();

    const render = () => {
      const rows = filter.value ? all.filter((q) => q.status === filter.value) : all;
      $('#inq-count').textContent = `${rows.length} of ${all.length} inquiries`;
      holder.innerHTML = rows.length ? `
        <table>
          <thead><tr><th>Ref</th><th>Date</th><th>Animal</th><th>Buyer</th><th>Contact via</th><th>Message</th><th>Status</th></tr></thead>
          <tbody>${rows.map((q) => `
            <tr>
              <td>${escapeHtml(q.ref)}</td>
              <td>${escapeHtml(formatDate(q.createdAt))}</td>
              <td><a href="${profileUrl(q.animalId)}">${escapeHtml(q.animalName)} (${escapeHtml(q.animalTag)})</a></td>
              <td>${escapeHtml(q.buyerName)}<br><a href="mailto:${escapeHtml(q.buyerEmail)}">${escapeHtml(q.buyerEmail)}</a>${q.buyerPhone ? `<br><a href="tel:${escapeHtml(q.buyerPhone)}">${escapeHtml(q.buyerPhone)}</a>` : ''}</td>
              <td>${escapeHtml(q.contactMethod)}${q.contactTime ? `<br><small>${escapeHtml(q.contactTime)}</small>` : ''}</td>
              <td class="wrap">${escapeHtml(q.message)}</td>
              <td><select data-inq="${escapeHtml(q.id)}" aria-label="Status for ${escapeHtml(q.ref)}">
                ${INQUIRY_STATUSES.map((s) => `<option${s === q.status ? ' selected' : ''}>${s}</option>`).join('')}</select></td>
            </tr>`).join('')}</tbody>
        </table>` : '<p class="empty-state">No inquiries yet.</p>';
    };

    filter.insertAdjacentHTML('beforeend', INQUIRY_STATUSES.map((s) => `<option>${s}</option>`).join(''));
    filter.addEventListener('change', render);

    holder.addEventListener('change', async (event) => {
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

    render();
  } catch (error) {
    console.error(error);
    holder.innerHTML = '<p class="error-state" role="alert">Could not load inquiries.</p>';
  }
}
