// firebase-config.js - paste project's settings here.
// Firebase console -> Project settings (gear icon) -> General -> "Your apps" -> SDK setup and configuration -> Config.

export const firebaseConfig = {
  apiKey: "AIzaSyC2kmFOa-pjzpJup5qq1NOk_5rsm3zlRDw",
  authDomain: "pertenakan-binatang-website.firebaseapp.com",
  projectId: "pertenakan-binatang-website",
  storageBucket: "pertenakan-binatang-website.firebasestorage.app",
  messagingSenderId: "26907766967",
  appId: "1:26907766967:web:b9f8fb36c155b116491d32",
  measurementId: "G-3BD0DKR1JT"
};

export const isConfigured = !Object.values(firebaseConfig).some((v) => String(v).includes("PASTE"));