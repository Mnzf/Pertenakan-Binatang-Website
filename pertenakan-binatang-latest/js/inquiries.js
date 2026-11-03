// inquiries.js - "Send an inquiry to buy" messages from buyers (Firestore collection "inquiries"),
// plus the conversation under each inquiry (subcollection inquiries/{id}/messages).
import { db, collection, doc, addDoc, getDocs, updateDoc, query, where, serverTimestamp } from './firebase.js';
import { STAFF_ROLES } from './config.js';

const iso = (value) => (value?.toDate ? value.toDate().toISOString() : (value ?? ''));
const toInquiry = (snap) => {
  const d = snap.data();
  return { ...d, id: snap.id, ref: refFor(snap.id), createdAt: iso(d.createdAt), lastMessageAt: iso(d.lastMessageAt) };
};
// Newest activity first (a new reply counts as activity)
const byActivity = (list) => list.sort((a, b) => String(b.lastMessageAt || b.createdAt).localeCompare(String(a.lastMessageAt || a.createdAt)));

export const refFor = (id) => `REQ-${String(id).slice(0, 6).toUpperCase()}`;

export async function createInquiry(buyer, animal, form) {
  const ref = await addDoc(collection(db, 'inquiries'), {
    buyerId: buyer.uid, buyerName: buyer.name, buyerEmail: buyer.email, buyerPhone: buyer.phone || '',
    animalId: animal.id, animalName: animal.name, animalTag: animal.tag,
    requestType: form.requestType, contactMethod: form.contactMethod, contactTime: form.contactTime || '',
    message: form.message.trim(), status: 'Submitted', createdAt: serverTimestamp(),
  });
  return ref.id;
}

// A buyer's own inquiries (the rules only allow reading your own).
export async function getMyInquiries(uid) {
  const snap = await getDocs(query(collection(db, 'inquiries'), where('buyerId', '==', uid)));
  return byActivity(snap.docs.map(toInquiry));
}

// Staff: all inquiries.
export async function getAllInquiries() {
  const snap = await getDocs(collection(db, 'inquiries'));
  return byActivity(snap.docs.map(toInquiry));
}

export const updateInquiryStatus = (id, status) => updateDoc(doc(db, 'inquiries', id), { status });

// ---- conversation under one inquiry ----
export async function getMessages(inquiryId) {
  const snap = await getDocs(collection(db, 'inquiries', inquiryId, 'messages'));
  return snap.docs
    .map((d) => ({ ...d.data(), id: d.id, createdAt: iso(d.data().createdAt) }))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

// Staff and the buyer both use this. Returns the new message (so the page can show it straight away).
export async function sendInquiryMessage(inquiry, user, text) {
  const from = STAFF_ROLES.includes(user.role) ? 'staff' : 'buyer';
  await addDoc(collection(db, 'inquiries', inquiry.id, 'messages'), {
    text, from, authorId: user.uid, authorName: user.name, createdAt: serverTimestamp(),
  });
  const patch = { lastMessage: text.slice(0, 140), lastMessageFrom: from, lastMessageAt: serverTimestamp() };
  if (from === 'staff' && inquiry.status === 'Submitted') patch.status = 'Contacted';   // first reply = contacted
  await updateDoc(doc(db, 'inquiries', inquiry.id), patch);
  return { text, from, authorName: user.name, createdAt: new Date().toISOString(), patch };
}
