// pages/inquire.js - "Send an inquiry to buy" form
import { getAnimalById } from '../data.js';
import { addInquiry } from '../storage.js';
import { handleForm } from '../forms.js';
import { DEMO_MODE } from '../config.js';
import { getCurrentUser } from '../auth.js';
import { imageUrl } from '../render.js';
import { $, getParam, escapeHtml, rootUrl, formatPrice } from '../utils.js';

const form = $('#inquiry-form');
const animalId = getParam('animal');
const draftKey = `kf_draft_${animalId}`;

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

  // Keep the draft if the buyer leaves to log in (sessionStorage = this tab only)
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey) ?? '{}');
    Object.entries(draft).forEach(([name, value]) => { if (form.elements[name] && form.elements[name].type !== 'checkbox') form.elements[name].value = value; });
  } catch { /* ignore a broken draft */ }
  form.addEventListener('input', () => {
    try { sessionStorage.setItem(draftKey, JSON.stringify({ contactMethod: form.elements.contactMethod.value, contactTime: form.elements.contactTime.value, message: form.elements.message.value })); } catch { /* storage blocked */ }
  });

  handleForm(
    form,
    async (data) => {
      // PHASE 4: if there is no logged-in buyer, send them to the login page with ?next=
      // and write the inquiry to Firestore (collection "inquiries") instead of storage.js.
      if (!DEMO_MODE && !getCurrentUser()) {
        location.href = `${rootUrl('pages/buyer-login.html')}?next=${encodeURIComponent(location.pathname + location.search)}`;
        return;
      }
      const ref = `REQ-${Date.now().toString(36).toUpperCase()}`;
      addInquiry({
        ref, animalId: animal.id, animalName: animal.name, requestType: data.requestType,
        contactMethod: data.contactMethod, contactTime: data.contactTime, message: data.message.trim(),
        status: 'Submitted', createdAt: new Date().toISOString(),
      });
      sessionStorage.removeItem(draftKey);
      $('#inquiry-ref').textContent = ref;
      form.hidden = true;
      const done = $('#inquiry-confirmation');
      done.hidden = false;
      done.querySelector('a')?.focus();
    },
    (data) => (data.message.trim().length < 10 ? { message: 'Please write at least a short message (10 characters or more).', field: 'message' } : undefined),
  );
}
