import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, doc, Unsubscribe, DocumentData } from 'firebase/firestore';
import type { QuerySnapshot } from 'firebase/firestore';
import app, { auth, db } from '../firebase';

export { app, auth, db };

export type Bag = {
  id: string;
  bagId: string;
  label: string;
  lastSeenMeters: number;
  ownerUid: string;
  createdAt?: any;
};

export function listenBags(uid: string, cb: (bags: Bag[]) => void): Unsubscribe {
  const bagsCol = collection(db, 'bags');
  const q = query(
    bagsCol,
    where('ownerUid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const items: Bag[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Bag, 'id'>) }));
    cb(items);
  });
}

export async function addBag(uid: string, bagId: string, label: string) {
  const bagsCol = collection(db, 'bags');
  const ref = await addDoc(bagsCol, {
    ownerUid: uid,
    bagId,
    label,
    lastSeenMeters: 3,
    createdAt: serverTimestamp(),
  });
  try {
    const analyticsMod = await import('firebase/analytics');
    if (await analyticsMod.isSupported?.()) {
      const analytics = analyticsMod.getAnalytics(app);
      analyticsMod.logEvent(analytics, 'bag_paired');
    }
  } catch {}
  return ref;
}

export async function updateBagDistance(docId: string, meters: number) {
  const ref = doc(db, 'bags', docId);
  await updateDoc(ref, { lastSeenMeters: meters });
}

export async function removeBag(docId: string) {
  const ref = doc(db, 'bags', docId);
  await deleteDoc(ref);
}


