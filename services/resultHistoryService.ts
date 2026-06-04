import {
    collection,
    getDocs,
    orderBy,
    query,
    where,
} from 'firebase/firestore';

import {
    ActivityResultRecord,
    getActivityResultsByActivity,
    getAllActivityResults,
} from '../utils/activityResultsDb';
import { auth, db } from './firebase';

// Firestore result shape coming back from the cloud
export type FirestoreResult = {
  id: string;
  activityKey: string;
  activityTitle: string;
  label: string;
  score: number;
  data: Record<string, unknown>;
  userId: string | null;
  userEmail: string | null;
  localId: number;
  createdAt: string;
};

// Convert Firestore document to the same shape as SQLite record
// so the UI doesn't need to know which source it came from
function firestoreToRecord(
  docId: string,
  docData: Record<string, unknown>
): ActivityResultRecord {
  // Handle Firestore Timestamp or plain string for createdAt
  let createdAt = '';

  if (docData.createdAt && typeof (docData.createdAt as any).toDate === 'function') {
    createdAt = (docData.createdAt as any).toDate().toISOString();
  } else if (typeof docData.createdAt === 'string') {
    createdAt = docData.createdAt;
  } else {
    createdAt = new Date().toISOString();
  }

  return {
    id: Number(docData.localId) || 0,
    activityKey: String(docData.activityKey ?? ''),
    activityTitle: String(docData.activityTitle ?? ''),
    label: String(docData.label ?? ''),
    score: Number(docData.score ?? 0),
    dataJson: JSON.stringify(docData.data ?? {}),
    createdAt,
    synced: 1,
  };
}

// Fetch ALL results for the current logged-in user from Firestore
export async function getFirestoreResultHistory(): Promise<{
  results: ActivityResultRecord[];
  source: 'firestore' | 'sqlite';
}> {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      // Not logged in — fall back to SQLite
      const sqliteResults = await getAllActivityResults();
      return { results: sqliteResults, source: 'sqlite' };
    }

    const q = query(
      collection(db, 'activity_results'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    const firestoreResults = snapshot.docs.map((doc) =>
      firestoreToRecord(doc.id, doc.data() as Record<string, unknown>)
    );

    return { results: firestoreResults, source: 'firestore' };
  } catch (error) {
    console.log('Firestore fetch failed, falling back to SQLite:', error);

    // Firestore failed (offline etc) — use SQLite
    const sqliteResults = await getAllActivityResults();
    return { results: sqliteResults, source: 'sqlite' };
  }
}

// Fetch results filtered by activity for the current user from Firestore
export async function getFirestoreResultsByActivity(
  activityKey: string
): Promise<{
  results: ActivityResultRecord[];
  source: 'firestore' | 'sqlite';
}> {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      const sqliteResults = await getActivityResultsByActivity(activityKey);
      return { results: sqliteResults, source: 'sqlite' };
    }

    const q = query(
      collection(db, 'activity_results'),
      where('userId', '==', currentUser.uid),
      where('activityKey', '==', activityKey),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    const firestoreResults = snapshot.docs.map((doc) =>
      firestoreToRecord(doc.id, doc.data() as Record<string, unknown>)
    );

    return { results: firestoreResults, source: 'firestore' };
  } catch (error) {
    console.log('Firestore fetch failed, falling back to SQLite:', error);

    const sqliteResults = await getActivityResultsByActivity(activityKey);
    return { results: sqliteResults, source: 'sqlite' };
  }
}