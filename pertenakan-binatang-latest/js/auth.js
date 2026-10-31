// auth.js - PHASE 4 PLACEHOLDER. Right now nobody is "logged in".
// Phase 4: use Firebase Auth (onAuthStateChanged) and read the user's role
// ("buyer" or "staff") from the Firestore document users/{uid}.

import { DEMO_MODE } from './config.js';
import { rootUrl } from './utils.js';

export function getCurrentUser() {
  return null;
}

// Call at the top of a protected page. In DEMO_MODE it lets everyone in.
export function requireRole(role) {
  if (DEMO_MODE) return true;
  const user = getCurrentUser();
  if (user && user.role === role) return true;
  location.href = rootUrl(role === 'staff' ? 'pages/staff-login.html' : 'pages/buyer-login.html');
  return false;
}
