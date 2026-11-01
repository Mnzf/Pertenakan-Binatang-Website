// pages/inquire.js - "Send an inquiry to buy" (saved in Firestore, collection "inquiries")
import { getAnimalById } from '../data.js';
import { authReady, getCurrentUser, authErrorMessage } from '../auth.js';
import { createInquiry, refFor } from '../inquiries.js';
import { handleForm } from '../forms.js';
import { imageUrl } from '../render.js';
import { $, getParam, rootUrl, formatPrice } from '../utils.js';

const form = $('#inquiry-form');
const animalId = getParam('animal');
const draftKey = `kf_draft_${animalId}`;

await authReady();
let animal = null;
try { animal = animalId ? await getAnimalById(animalId) : null; } catch (error) { console.error(error); }

if (!animal || !animal.forSale || animal.status === 'sold') {
  $('#inquiry-animal').innerHTML = `This animal is not available. <a href="${rootUrl('pages/animals.html')}">Choose an animal</a> first.`;
  [...form.elements].forEach((el) => { el.disabled = true; });
} else {
  $('#inquiry-animal').textContent = `${animal.name} (${animal.tag}) | ${animal.breed} | ${formatPrice(animal.price)} | Availability: ${animal.status}`;
  $('#inquiry-image').src = imageUrl(animal);
  $('#crumb-animal').textContent = animal.name;
  $('#crumb-animal').href = `${rootUrl('pages/animal-detail.html')}?id=${encodeURIComponent(animal.id)}`;
  $('#cancel-link').href = $('#crumb-animal').href;

  const loginUrl = `${rootUrl('pages/buyer-login.html')}?next=${encodeURIComponent(location.pathname + location.search)}`;
  if (!getCurrentUser()) {
    form.querySelector('[type="submit"]').textContent = 'Log in to send inquiry';
    $('.panel .eyebrow')?.after(Object.assign(document.createElement('p'), { textContent: 'You will be asked to log in (or create a buyer account) first. Your message is kept.' }));
  }

  // Keep the draft while the buyer goes to log in (sessionStorage = this browser tab only)
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey) ?? '{}');
    Object.entries(draft).forEach(([name, value]) => { if (form.elements[name]) form.elements[name].value = value; });
  } catch { /* ignore a broken draft */ }
  form.addEventListener('input', () => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({
        contactMethod: form.elements.contactMethod.value, contactTime: form.elements.contactTime.value, message: form.elements.message.value,
      }));
    } catch { /* storage blocked */ }
  });

  handleForm(
    form,
    async (data) => {
      const buyer = getCurrentUser();
      if (!buyer) { location.href = loginUrl; return; }
      if (buyer.role !== 'buyer') throw new Error('Only buyer accounts can send inquiries. Please log in with a buyer account.');
      try {
        const id = await createInquiry(buyer, animal, data);
        sessionStorage.removeItem(draftKey);
        $('#inquiry-ref').textContent = refFor(id);
        form.hidden = true;
        const done = $('#inquiry-confirmation');
        done.hidden = false;
        done.querySelector('a')?.focus();
      } catch (error) {
        console.error(error);
        throw new Error(authErrorMessage(error));
      }
    },
    (data) => (data.message.trim().length < 10 ? { message: 'Please write at least a short message (10 characters or more).', field: 'message' } : undefined),
  );
}
