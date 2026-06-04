import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import {
    ActivityResultInput,
    saveActivityResult,
} from '../utils/activityResultsDb';
import { auth, db } from './firebase';

// This is the common attempt-saving function
// It saves to BOTH SQLite (local) AND Firestore (cloud) at the same time
// SQLite = works offline, fast, local history
// Firestore = syncs across devices, powers the leaderboard

export async function saveAttempt(input: ActivityResultInput) {
  // Step 1 — Always save to SQLite first (works offline)
  const localId = await saveActivityResult(input);

  // Step 2 — Try to save to Firestore (needs internet)
  // If it fails we don't crash the app — result is still saved locally
  try {
    const currentUser = auth.currentUser;

    await addDoc(collection(db, 'activity_results'), {
      activityKey: input.activityKey,
      activityTitle: input.activityTitle,
      label: input.label,
      score: input.score,
      data: input.data ?? {},
      userId: currentUser ? currentUser.uid : null,
      userEmail: currentUser ? currentUser.email : null,
      localId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Firestore failed (no internet etc) — SQLite result is still safe
    console.log('Firestore save failed, result kept in SQLite:', error);
  }

  // Always return the local SQLite id
  // so result-summary navigation still works
  return localId;
}