// utils.js - small helper functions used all over the site.

export const $  = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// ALWAYS escape text before putting it inside innerHTML. This stops someone typing
// <script> into a form and having it run on another person's screen (XSS).
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export const getParam = (name) => new URLSearchParams(location.search).get(name);

// Builds a URL from the project root, so links work from index.html AND from /pages.
// (this file lives in /js, so one level up is the project root)
export const rootUrl = (path) => new URL(`../${path}`, import.meta.url).href;

export const capitalize = (text) => String(text ?? '').charAt(0).toUpperCase() + String(text ?? '').slice(1);

export function formatPrice(price) {
  return price === null || price === undefined ? 'Inquire' : `B$${Number(price).toLocaleString('en-US')}`;
}

// Age is calculated from the date of birth, so it never goes out of date.
export function ageInMonths(dob, now = new Date()) {
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  let months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());
  if (now.getDate() < born.getDate()) months -= 1;
  return Math.max(0, months);
}

export function formatAge(dob, now = new Date()) {
  const months = ageInMonths(dob, now);
  if (months === null) return '-';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} mo`;
  return rest ? `${years} yr ${rest} mo` : `${years} yr`;
}

export function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '-'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
