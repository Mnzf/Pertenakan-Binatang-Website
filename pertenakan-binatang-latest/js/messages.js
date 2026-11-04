// messages.js - messages from the public Contact form (Firestore collection "messages"),
// plus the conversation under each one (subcollection messages/{id}/replies).
// A visitor who was logged in when they wrote has a userId, so they can read the replies on the website.
// A visitor without an account gets the reply by email or phone.
import { db, collection, doc, addDoc, getDocs, updateDoc, query, where, serverTimestamp } from './firebase.js';
import { STAFF_ROLES } from './config.js';

const iso = (value) => (value?.toDate ? value.toDate().toISOString() : (value ?? ''));
const toMessage = (snap) => {
  const d = snap.data();
  return { ...d, id: snap.id, handled: !!d.handled, createdAt: iso(d.createdAt), lastMessageAt: iso(d.lastMessageAt) };
};
const byActivity = (list) => list.sort((a, b) => String(b.lastMessageAt || b.createdAt).localeCompare(String(a.lastMessageAt || a.createdAt)));

export async function sendMessage({ name, email, phone, type, message }, userId = null) {
  if (!db) throw new Error('Firebase is not set up yet. Paste your settings into js/firebase-config.js.');
  // Exactly these fields: the security rules reject anything else.
  const data = {
    name: name.trim(), email: email.trim(), phone: (phone || '').trim(), type: type || '',
    message: message.trim(), createdAt: serverTimestamp(),
  };
  if (userId) data.userId = userId;
  await addDoc(collection(db, 'messages'), data);
}

// Staff: every contact-form message, newest activity first.
export async function getContactMessages() {
  const snap = await getDocs(collection(db, 'messages'));
  return byActivity(snap.docs.map(toMessage));
}

// A logged-in buyer's own contact-form messages (the rules only allow reading your own).
export async function getMyContactMessages(uid) {
  const snap = await getDocs(query(collection(db, 'messages'), where('userId', '==', uid)));
  return byActivity(snap.docs.map(toMessage));
}

// Staff mark a message as handled (they replied by email / phone, or in the conversation).
export const setMessageHandled = (id, handled) => updateDoc(doc(db, 'messages', id), { handled });

// ---- conversation under one contact message ----
export async function getReplies(messageId) {
  const snap = await getDocs(collection(db, 'messages', messageId, 'replies'));
  return snap.docs
    .map((d) => ({ ...d.data(), id: d.id, createdAt: iso(d.data().createdAt) }))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export async function sendReply(message, user, text) {
  const from = STAFF_ROLES.includes(user.role) ? 'staff' : 'buyer';
  await addDoc(collection(db, 'messages', message.id, 'replies'), {
    text, from, authorId: user.uid, authorName: user.name, createdAt: serverTimestamp(),
  });
  const patch = { lastMessage: text.slice(0, 140), lastMessageFrom: from, lastMessageAt: serverTimestamp() };
  if (from === 'staff') patch.handled = true;   // a staff reply means it has been handled
  await updateDoc(doc(db, 'messages', message.id), patch);
  return { text, from, authorName: user.name, createdAt: new Date().toISOString(), patch };
}

// Same shape as inquiryThread in inquiries.js, so threads.js can show either one.
export const contactThread = { getMessages: getReplies, sendMessage: sendReply };
