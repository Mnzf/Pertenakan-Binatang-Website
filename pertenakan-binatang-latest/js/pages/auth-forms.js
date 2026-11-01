// pages/auth-forms.js - buyer login, buyer registration, staff login (Firebase Auth)
import { handleForm, showError, showSuccess } from '../forms.js';
import {
  authReady, login, logout, registerBuyer, resetPassword, safeNext, authErrorMessage, isStaff,
} from '../auth.js';
import { rootUrl, getParam, $ } from '../utils.js';

const buyerLogin = $('#buyer-login-form');
const staffLogin = $('#staff-login-form');
const register = $('#buyer-register-form');

const buyerHome = rootUrl('pages/buyer-dashboard.html');
const staffHome = rootUrl('pages/staff-dashboard.html');
const afterLogin = (profile) => (isStaff(profile) ? staffHome : safeNext(getParam('next'), buyerHome));

// Already logged in? Skip the form.
const existing = await authReady();
if (existing && (buyerLogin || register)) location.replace(afterLogin(existing));
if (existing && staffLogin && isStaff(existing)) location.replace(staffHome);

// A Firebase error becomes a friendly message (handleForm shows it under the form)
const friendly = (fn) => async (...args) => {
  try { return await fn(...args); } catch (error) { console.error(error); throw new Error(authErrorMessage(error)); }
};

if (buyerLogin) {
  handleForm(buyerLogin, friendly(async (data, form) => {
    const profile = await login(data.email, data.password, { remember: form.elements.remember?.checked });
    location.href = afterLogin(profile);
  }));
}

if (staffLogin) {
  handleForm(staffLogin, friendly(async (data) => {
    const profile = await login(data.email, data.password, { createProfile: false });
    if (!isStaff(profile)) {
      await logout();
      throw new Error('This account does not have staff access.');
    }
    location.href = safeNext(getParam('next'), staffHome);
  }));
}

if (register) {
  handleForm(
    register,
    friendly(async (data) => {
      await registerBuyer({ name: data['full-name'], email: data.email, phone: data.phone, password: data.password });
      location.href = safeNext(getParam('next'), buyerHome);
    }),
    (data) => {
      if (data.password.length < 8) return { message: 'Password must be at least 8 characters.', field: 'password' };
      if (data.phone && !/^[0-9+\s-]{7,15}$/.test(data.phone)) return { message: 'Enter a valid phone number (digits only, 7 to 15 characters).', field: 'phone' };
    },
  );
}

// "Forgot password?" sends Firebase's reset email to the address typed in the form
const loginForm = buyerLogin ?? staffLogin;
$('#forgot-password')?.addEventListener('click', async (event) => {
  event.preventDefault();
  const email = loginForm.elements.email;
  if (!email.value.trim() || !email.validity.valid) {
    showError(loginForm, 'Type your email address in the form first, then click "Forgot password?" again.', email);
    return;
  }
  try {
    await resetPassword(email.value.trim());
    showSuccess(loginForm, 'If an account exists for that email, a password reset link has been sent.');
  } catch (error) {
    console.error(error);
    showError(loginForm, authErrorMessage(error));
  }
});
