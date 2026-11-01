// messages.js - messages from the public Contact form (Firestore collection "messages").
import { db, collection, addDoc, serverTimestamp } from './firebase.js';

export async function sendMessage({ name, email, phone, type, message }) {
  if (!db) throw new Error('Firebase is not set up yet. Paste your settings into js/firebase-config.js.');
  // Exactly these fields: the security rules reject anything else.
  await addDoc(collection(db, 'messages'), {
    name: name.trim(), email: email.trim(), phone: (phone || '').trim(), type: type || '',
    message: message.trim(), createdAt: serverTimestamp(),
  });
}
