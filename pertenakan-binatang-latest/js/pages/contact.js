// pages/contact.js - contact / visit form (saved in Firestore, collection "messages")
import { handleForm, showSuccess } from '../forms.js';
import { sendMessage } from '../messages.js';
import { authErrorMessage } from '../auth.js';
import { $, getParam } from '../utils.js';

const form = $('#contact-form');
const type = getParam('type');
if (type && [...form.elements.type.options].some((o) => o.value === type)) form.elements.type.value = type;

handleForm(
  form,
  async (data) => {
    try {
      await sendMessage(data);
    } catch (error) {
      console.error(error);
      throw new Error(authErrorMessage(error));
    }
    form.reset();
    showSuccess(form, 'Thank you. Your message has been received and the farm will reply to you.');
  },
  (data) => (data.message.trim().length < 5 ? { message: 'Please write a short message.', field: 'message' } : undefined),
);
