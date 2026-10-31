// pages/contact.js - contact / visit form
import { handleForm, showSuccess } from '../forms.js';
import { $, getParam } from '../utils.js';

const form = $('#contact-form');
const type = getParam('type');
if (type && [...form.elements.type.options].some((o) => o.value === type)) form.elements.type.value = type;

handleForm(
  form,
  async (data) => {
    // PHASE 4: save to Firestore (collection "messages") so the owner can read it in the staff area.
    console.info('Contact message (not saved yet):', data);
    form.reset();
    showSuccess(form, 'Thank you. Your message has been received and the farm will reply to you.');
  },
  (data) => (data.message.trim().length < 5 ? { message: 'Please write a short message.', field: 'message' } : undefined),
);
