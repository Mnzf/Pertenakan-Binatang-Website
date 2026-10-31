// main.js - loaded on EVERY page. Keep it small.
import { toggleSaved } from './storage.js';
import { $$ } from './utils.js';

// 1. Mark the current page in the main navigation (used for styling + screen readers)
const normalise = (path) => path.replace(/index\.html$/, '');
$$('.main-nav a').forEach((link) => {
  if (normalise(new URL(link.href).pathname) === normalise(location.pathname)) {
    link.setAttribute('aria-current', 'page');
  }
});

// 2. "Save" buttons. One listener on the document works for cards added later by JS.
//    Phase 4: saving will require a buyer login and be stored in Firestore.
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-save]');
  if (!button) return;
  const saved = toggleSaved(button.dataset.save);
  button.setAttribute('aria-pressed', String(saved));
  button.textContent = saved ? 'Saved' : 'Save';
});
