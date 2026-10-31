// pages/auth-forms.js - buyer login, buyer registration, staff login (validation only)
// PHASE 4: replace each "TODO" with the Firebase Auth call:
//   login    -> signInWithEmailAndPassword(auth, email, password)
//   register -> createUserWithEmailAndPassword(...) then save {name, phone, role:'buyer'} in Firestore users/{uid}
//   staff    -> signInWithEmailAndPassword(...) then check users/{uid}.role is 'owner' | 'manager' | 'staff'
import { handleForm, showSuccess } from '../forms.js';
import { $ } from '../utils.js';

const NOTE = 'Form is valid. Login will be connected to Firebase in Phase 4.';

const login = $('#buyer-login-form') ?? $('#staff-login-form');
if (login) {
  handleForm(login, async (data) => {
    // TODO(Phase 4): signInWithEmailAndPassword
    console.info('Login form valid for:', data.email);
    showSuccess(login, NOTE);
  });
}

const register = $('#buyer-register-form');
if (register) {
  handleForm(
    register,
    async (data) => {
      // TODO(Phase 4): createUserWithEmailAndPassword + save profile
      console.info('Registration form valid for:', data.email);
      showSuccess(register, NOTE);
    },
    (data) => {
      if (data.password.length < 8) return { message: 'Password must be at least 8 characters.', field: 'password' };
      if (data.phone && !/^[0-9+\s-]{7,15}$/.test(data.phone)) return { message: 'Enter a valid phone number (digits only, 7 to 15 characters).', field: 'phone' };
    },
  );
}
