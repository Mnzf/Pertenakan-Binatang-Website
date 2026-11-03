// main.js - loaded on EVERY page. Keep it small.
import { authReady, getCurrentUser, isStaff, logout } from './auth.js';
import { toggleSaved } from './saved.js';
import { $, $$, rootUrl, capitalize } from './utils.js';

// 1. Mark the current page in the main navigation (styling + screen readers)
const normalise = (path) => path.replace(/index\.html$/, '');
$$('.main-nav a').forEach((link) => {
  if (normalise(new URL(link.href).pathname) === normalise(location.pathname)) link.setAttribute('aria-current', 'page');
});

// 1b. Mobile menu button (shown by the CSS on small screens)
const header = $('.site-header');
const nav = $('.main-nav');
if (header && nav) {
  nav.id ||= 'main-nav';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-toggle';
  toggle.textContent = 'Menu';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', nav.id);
  nav.before(toggle);
  const setOpen = (open) => { nav.classList.toggle('open', open); toggle.setAttribute('aria-expanded', String(open)); };
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });
}

// 2. Clicks: log out + "Save" buttons. One listener on the document also works for cards added later by JS.
document.addEventListener('click', async (event) => {
  const logoutLink = event.target.closest('#logout-btn, [data-logout]');
  if (logoutLink) {
    event.preventDefault();
    await logout();
    location.href = logoutLink.id === 'logout-btn' ? logoutLink.href : rootUrl('index.html');
    return;
  }

  const button = event.target.closest('[data-save]');
  if (!button) return;
  await authReady();
  const user = getCurrentUser();
  if (!user) {
    // Saving needs a buyer account
    location.href = `${rootUrl('pages/buyer-login.html')}?next=${encodeURIComponent(location.pathname + location.search)}`;
    return;
  }
  if (user.role !== 'buyer') return;
  try {
    const saved = await toggleSaved(button.dataset.save);
    button.setAttribute('aria-pressed', String(saved));
    button.textContent = saved ? 'Saved' : 'Save';
  } catch (error) {
    console.error(error);
  }
});

// 3. Show who is logged in (header buttons + portal sidebar)
const user = await authReady();
if (user) {
  const actions = $('.login-actions');
  if (actions) {
    const staff = isStaff(user);
    actions.innerHTML = `<a class="btn secondary" href="${rootUrl(staff ? 'pages/staff-dashboard.html' : 'pages/buyer-dashboard.html')}">${staff ? 'Herd Management' : 'My Account'}</a>
      <a class="btn" href="${rootUrl('index.html')}" data-logout>Log out</a>`;
  }
  const chipName = $('.user-chip span');
  if (chipName) chipName.textContent = user.name;
  const chipRole = $('.user-chip small');
  if (chipRole && user.role) chipRole.textContent = capitalize(user.role);
}
