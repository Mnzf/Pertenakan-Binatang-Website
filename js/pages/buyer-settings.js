// pages/buyer-settings.js - a buyer updates their name / phone, or asks for a password reset email
import { requireRole, updateProfileInfo, resetPassword, authErrorMessage } from '../auth.js';
import { handleForm, showSuccess } from '../forms.js';
import { $ } from '../utils.js';

const form = $('#settings-form');
const user = await requireRole('buyer');

if (user) {
  form.elements.name.value = user.name;
  form.elements.email.value = user.email;
  form.elements.phone.value = user.phone;

  handleForm(
    form,
    async (data) => {
      try {
        await updateProfileInfo({ name: data.name, phone: data.phone });
      } catch (error) {
        console.error(error);
        throw new Error(authErrorMessage(error));
      }
      showSuccess(form, 'Your details have been saved.');
    },
    (data) => (data.phone && !/^[0-9+\s-]{7,15}$/.test(data.phone)
      ? { message: 'Enter a valid phone number (digits only, 7 to 15 characters).', field: 'phone' } : undefined),
  );

  $('#reset-pw').addEventListener('click', async () => {
    const msg = $('#pw-msg');
    try {
      await resetPassword(user.email);
      msg.textContent = `A password reset link has been sent to ${user.email}.`;
    } catch (error) {
      console.error(error);
      msg.textContent = authErrorMessage(error);
    }
  });
}
