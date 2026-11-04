// pages/contact.js - contact / visit form (saved in Firestore, collection "messages")
import { handleForm, showSuccess } from '../forms.js';
import { sendMessage } from '../messages.js';
import { authReady, getCurrentUser, authErrorMessage } from '../auth.js';
import { $, getParam } from '../utils.js';

const form = $('#contact-form');
const type = getParam('type');
if (type && [...form.elements.type.options].some((o) => o.value === type)) form.elements.type.value = type;

// A logged-in buyer does not have to type their details again
await authReady();
const user = getCurrentUser();
if (user) {
  if (!form.elements.name.value) form.elements.name.value = user.name;
  if (!form.elements.email.value) form.elements.email.value = user.email;
  if (!form.elements.phone.value) form.elements.phone.value = user.phone;
}

// Tell the sender where the reply will come
form.querySelector('[type="submit"]').before(Object.assign(document.createElement('p'), {
  className: 'fine',
  textContent: user
    ? "You are logged in, so the farm's reply will also appear under Messages in your account."
    : 'Not logged in? The farm will reply by email or phone.',
}));

handleForm(
  form,
  async (data) => {
    try {
      await sendMessage(data, user?.uid);
    } catch (error) {
      console.error(error);
      throw new Error(authErrorMessage(error));
    }
    form.reset();
    showSuccess(form, 'Thank you. Your message has been received and the farm will reply to you.');
  },
  (data) => (data.message.trim().length < 5 ? { message: 'Please write a short message.', field: 'message' } : undefined),
);
