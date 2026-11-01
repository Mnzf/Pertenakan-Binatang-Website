// inquiries.js - "Send an inquiry to buy" messages from buyers (Firestore collection "inquiries").
import { db, collection, doc, addDoc, getDocs, updateDoc, query, where, serverTimestamp } from './firebase.js';

const toInquiry = (snap) => {
  const d = snap.data();
  return { ...d, id: snap.id, ref: refFor(snap.id), createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : (d.createdAt ?? '') };
};
const newestFirst = (list) => list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

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
  return newestFirst(snap.docs.map(toInquiry));
}

// Staff: all inquiries.
export async function getAllInquiries() {
  const snap = await getDocs(collection(db, 'inquiries'));
  return newestFirst(snap.docs.map(toInquiry));
}

export const updateInquiryStatus = (id, status) => updateDoc(doc(db, 'inquiries', id), { status });
