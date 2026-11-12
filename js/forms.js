// forms.js - shared form validation so every form behaves the same way.
// Usage:  handleForm(formElement, async (data) => { ...save... }, (data) => 'error text or undefined');

import { $$ } from './utils.js';

function labelText(field) {
  const text = field.labels?.[0]?.textContent ?? field.name ?? 'This field';
  return text.replace('*', '').replace(/\s+/g, ' ').trim();
}

function messageFor(field) {
  const v = field.validity;
  const label = labelText(field);
  if (v.valueMissing) return field.type === 'checkbox' ? `Please confirm: ${label}` : `${label} is required.`;
  if (v.typeMismatch && field.type === 'email') return 'Enter a valid email address.';
  if (v.tooShort) return `${label} must be at least ${field.minLength} characters.`;
  if (v.patternMismatch) return field.title || `${label} is not in the right format.`;
  return field.validationMessage;
}

function alertBox(form) {
  let box = form.querySelector('[role="alert"]');
  if (!box) {
    box = document.createElement('p');
    box.setAttribute('role', 'alert');
    form.querySelector('[type="submit"]')?.before(box);
  }
  return box;
}

export function clearErrors(form) {
  $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
  const box = form.querySelector('[role="alert"]');
  if (box) box.textContent = '';
  form.querySelector('.form-success')?.remove();
}

export function showError(form, message, field) {
  clearErrors(form);
  alertBox(form).textContent = message;
  if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
}

export function showSuccess(form, message) {
  clearErrors(form);
  const p = document.createElement('p');
  p.className = 'form-success';
  p.setAttribute('role', 'status');
  p.textContent = message;
  form.querySelector('[type="submit"]')?.before(p);
}

export function handleForm(form, onValid, extraCheck) {
  form.noValidate = true; // we show our own messages instead of the browser's pop-ups
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);

    const invalid = [...form.elements].find((el) => el.willValidate && !el.validity.valid);
    if (invalid) return showError(form, messageFor(invalid), invalid);

    const data = Object.fromEntries(new FormData(form).entries());
    const problem = extraCheck?.(data, form);
    if (problem) {
      return showError(form, problem.message ?? problem, problem.field ? form.elements[problem.field] : undefined);
    }
    try {
      await onValid(data, form);
    } catch (error) {
      console.error(error);
      showError(form, error.message || 'Something went wrong. Please try again.');
    }
  });
}
