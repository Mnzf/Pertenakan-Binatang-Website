// auth.js - login, registration, logout and role checks, using Firebase Auth + Firestore.
//
// A signed-in person is described by a "profile" object:
//   { uid, email, name, phone, role, saved }      role = 'buyer' | 'staff' | 'manager' | 'owner'
// The role lives in Firestore (users/{uid}), NOT in the browser, and the security rules enforce it.

import {
  auth, db, isConfigured, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence,
  doc, getDoc, setDoc, serverTimestamp,
} from './firebase.js';
import { STAFF_ROLES } from './config.js';
import { rootUrl } from './utils.js';

let current = null;   // the signed-in profile, or null
let ready;            // resolves once we know whether someone is signed in
let seq = 0;          // ignores out-of-date profile loads (see register/login)

const NOT_CONFIGURED = 'Firebase is not set up yet. Paste your settings into js/firebase-config.js.';
function needFirebase() { if (!isConfigured) throw new Error(NOT_CONFIGURED); }

async function loadProfile(user) {
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    const d = snap.exists() ? snap.data() : {};
    return {
      uid: user.uid, email: user.email, name: d.name || user.email, phone: d.phone || '',
      role: d.role || null, saved: Array.isArray(d.saved) ? d.saved : [],
    };
  } catch (error) {
    console.error('Could not load profile', error);
    return { uid: user.uid, email: user.email, name: user.email, phone: '', role: null, saved: [] };
  }
}

// Wait for this before checking who is logged in (the browser needs a moment to restore the session).
export function authReady() {
  ready ??= new Promise((resolve) => {
    if (!isConfigured) { resolve(null); return; }
    onAuthStateChanged(auth, async (user) => {
      const mine = ++seq;
      const profile = user ? await loadProfile(user) : null;
      if (mine === seq) current = profile;
      resolve(current);
    });
  });
  return ready;
}

export const getCurrentUser = () => current;
export const isStaff = (user = current) => !!user && STAFF_ROLES.includes(user.role);

export async function registerBuyer({ name, email, phone, password }) {
  needFirebase();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // The security rules only allow a self-registered account to be a "buyer".
  await setDoc(doc(db, 'users', cred.user.uid), {
    name: name.trim(), email, phone: (phone || '').trim(), role: 'buyer', createdAt: serverTimestamp(),
  });
  seq++;
  current = await loadProfile(cred.user);
  return current;
}

// createProfile: a buyer who has an Auth account but no profile yet gets one. Staff login passes false.
export async function login(email, password, { remember = false, createProfile = true } = {}) {
  needFirebase();
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  seq++;
  let profile = await loadProfile(cred.user);
  if (!profile.role && createProfile) {
    try {
      await setDoc(doc(db, 'users', cred.user.uid), { name: profile.name, email, phone: '', role: 'buyer', createdAt: serverTimestamp() });
      profile = await loadProfile(cred.user);
    } catch (error) { console.error(error); }
  }
  current = profile;
  return profile;
}

export async function logout() {
  if (auth) await signOut(auth);
  seq++;
  current = null;
}

// A buyer changes their own name / phone (the rules only allow these two fields).
export async function updateProfileInfo({ name, phone }) {
  needFirebase();
  if (!current) throw new Error('Not logged in');
  const clean = { name: name.trim(), phone: (phone || '').trim() };
  await setDoc(doc(db, 'users', current.uid), clean, { merge: true });
  Object.assign(current, clean);
  return current;
}

export function resetPassword(email) {
  needFirebase();
  return sendPasswordResetEmail(auth, email);
}

// Only follow ?next= links that stay on this website.
export function safeNext(next, fallback) {
  try {
    const url = new URL(next ?? '', location.origin);
    if (next && url.origin === location.origin) return url.pathname + url.search;
  } catch { /* ignore */ }
  return fallback;
}

const MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
  'auth/weak-password': 'That password is too weak. Use at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network problem. Check your connection and try again.',
  'permission-denied': 'You do not have permission to do that.',
  'auth/password-does-not-meet-requirements': 'That password does not meet the password rules. Use at least 8 characters with letters and numbers.'
};
export function authErrorMessage(error) {
  if (MESSAGES[error?.code]) return MESSAGES[error.code];
  if (String(error?.code).startsWith('auth/')) return 'Something went wrong signing in. Please try again.';
  return error?.message || 'Something went wrong. Please try again.';
}

// Put at the top of a protected page:   const user = await requireRole('staff');  if (user) { ... }
export async function requireRole(role) {
  if (!isConfigured) { blockPage(NOT_CONFIGURED); return null; }
  const user = await authReady();
  if (!user) {
    location.href = `${rootUrl(role === 'staff' ? 'pages/staff-login.html' : 'pages/buyer-login.html')}?next=${encodeURIComponent(location.pathname + location.search)}`;
    return null;
  }
  const allowed = role === 'staff' ? isStaff(user) : user.role === role;
  if (!allowed) {
    blockPage('Your account does not have access to this page.');
    return null;
  }
  return user;
}

function blockPage(message) {
  document.body.innerHTML = `<main><p class="error-state" role="alert">${message}</p><p><a class="btn" href="${rootUrl('index.html')}">Back to the website</a></p></main>`;
}

export async function getIdToken() {
  if (!auth?.currentUser) throw new Error('Not logged in');
  return auth.currentUser.getIdToken();
}