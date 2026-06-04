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
import { db } from './firebase';

// Leaderboard fetches ALL teams results from Firestore
// unlike result history which only fetches the current user's results
// This is what makes it a real leaderboard across all devices and teams

function firestoreToRecord(
  docData: Record<string, unknown>
): ActivityResultRecord {
  let createdAt = '';

  if (
    docData.createdAt &&
    typeof (docData.createdAt as any).toDate === 'function'
  ) {
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

// Fetch ALL teams leaderboard for a specific activity
// sorted by highest score first
export async function getFirestoreLeaderboardByActivity(
  activityKey: string
): Promise<{
  results: ActivityResultRecord[];
  source: 'firestore' | 'sqlite';
}> {
  try {
    const q = query(
      collection(db, 'activity_results'),
      where('activityKey', '==', activityKey),
      orderBy('score', 'desc')
    );

    const snapshot = await getDocs(q);

    const results = snapshot.docs.map((doc) =>
      firestoreToRecord(doc.data() as Record<string, unknown>)
    );

    return { results, source: 'firestore' };
  } catch (error) {
    console.log('Firestore leaderboard fetch failed, using SQLite:', error);

    const sqliteResults = await getActivityResultsByActivity(activityKey);
    return { results: sqliteResults, source: 'sqlite' };
  }
}

// Fetch ALL teams leaderboard across all activities
// sorted by highest score first
export async function getFirestoreLeaderboardAll(): Promise<{
  results: ActivityResultRecord[];
  source: 'firestore' | 'sqlite';
}> {
  try {
    const q = query(
      collection(db, 'activity_results'),
      orderBy('score', 'desc')
    );

    const snapshot = await getDocs(q);

    const results = snapshot.docs.map((doc) =>
      firestoreToRecord(doc.data() as Record<string, unknown>)
    );

    return { results, source: 'firestore' };
  } catch (error) {
    console.log('Firestore leaderboard fetch failed, using SQLite:', error);

    const sqliteResults = await getAllActivityResults();
    const sorted = [...sqliteResults].sort((a, b) => b.score - a.score);
    return { results: sorted, source: 'sqlite' };
  }
}