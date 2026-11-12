// firebase-config.js - paste YOUR project's settings here.
// Firebase console -> Project settings (gear icon) -> General -> "Your apps" -> SDK setup and configuration -> Config.
//
// Is it safe to commit this file? Yes. These values only identify the project; they are not passwords.
// Your data is protected by the Security Rules (firestore.rules), not by hiding this config.
// (Never commit a "service account" JSON key. That one IS secret and is already in .gitignore.)

export const firebaseConfig = {
  apiKey: "AIzaSyC2kmFOa-pjzpJup5qq1NOk_5rsm3zlRDw",
  authDomain: "pertenakan-binatang-website.firebaseapp.com",
  projectId: "pertenakan-binatang-website",
  storageBucket: "pertenakan-binatang-website.firebasestorage.app",
  messagingSenderId: "26907766967",
  appId: "1:26907766967:web:b9f8fb36c155b116491d32",
  measurementId: "G-3BD0DKR1JT"
};

// True once the placeholders have been replaced. firebase.js imports this.
export const isConfigured = !Object.values(firebaseConfig).some((v) => String(v).includes("PASTE"));