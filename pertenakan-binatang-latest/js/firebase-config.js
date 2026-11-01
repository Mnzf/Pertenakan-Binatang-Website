// firebase-config.js - paste YOUR project's settings here.
// Firebase console -> Project settings (gear icon) -> General -> "Your apps" -> SDK setup and configuration -> Config.
//
// Is it safe to commit this file? Yes. These values only identify the project; they are not passwords.
// Your data is protected by the Security Rules (firestore.rules), not by hiding this config.
// (Never commit a "service account" JSON key. That one IS secret and is already in .gitignore.)

export const firebaseConfig = {
  apiKey: 'PASTE_API_KEY',
  authDomain: 'PASTE_PROJECT_ID.firebaseapp.com',
  projectId: 'PASTE_PROJECT_ID',
  storageBucket: 'PASTE_PROJECT_ID.firebasestorage.app', // only needed if the team uses Firebase Storage
  messagingSenderId: 'PASTE_SENDER_ID',
  appId: 'PASTE_APP_ID',
};

// True once someone has replaced the placeholders above.
export const isConfigured = !Object.values(firebaseConfig).some((v) => String(v).includes('PASTE'));
