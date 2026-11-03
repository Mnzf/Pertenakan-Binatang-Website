// messages.js - messages from the public Contact form (Firestore collection "messages").
import { db, collection, doc, addDoc, getDocs, updateDoc, serverTimestamp } from './firebase.js';

export async function sendMessage({ name, email, phone, type, message }) {
  if (!db) throw new Error('Firebase is not set up yet. Paste your settings into js/firebase-config.js.');
  // Exactly these fields: the security rules reject anything else.
  await addDoc(collection(db, 'messages'), {
    name: name.trim(), email: email.trim(), phone: (phone || '').trim(), type: type || '',
    message: message.trim(), createdAt: serverTimestamp(),
  });
}

// Staff: every contact-form message, newest first.
export async function getContactMessages() {
  const snap = await getDocs(collection(db, 'messages'));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return { ...data, id: d.id, handled: !!data.handled, createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt ?? '') };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

// Staff tick a message as handled (they replied by email / phone).
export const setMessageHandled = (id, handled) => updateDoc(doc(db, 'messages', id), { handled });
