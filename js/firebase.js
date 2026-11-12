// firebase.js - starts Firebase ONCE and re-exports the functions the site uses.
// Every other file imports from HERE, never straight from the gstatic.com URLs.
// That keeps the SDK version in a single place: to upgrade, change 12.5.0 below (all lines).
//
// Needs Live Server (ES modules do not load from file://).

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';
import { firebaseConfig, isConfigured } from './firebase-config.js';

export { isConfigured };
export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence,
} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';

export {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, arrayUnion, arrayRemove,
} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';
