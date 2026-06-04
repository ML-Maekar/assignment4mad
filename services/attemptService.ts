import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import {
    ActivityResultInput,
    saveActivityResult,
} from '../utils/activityResultsDb';
import { getCurrentLocationTag } from '../utils/locationService';
import { auth, db } from './firebase';

export async function saveAttempt(input: ActivityResultInput) {
  // Step 1 — Always save to SQLite first (works offline)
  const localId = await saveActivityResult(input);

  // Step 2 — Get GPS location tag silently
  // Returns null if location permission is not granted — result still saves
  let locationTag = null;

  try {
    locationTag = await getCurrentLocationTag();
  } catch {
    // Location failed silently — don't block the save
  }

  // Step 3 — Try to save to Firestore with location attached
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
      location: locationTag
        ? {
            latitude: locationTag.latitude,
            longitude: locationTag.longitude,
            accuracy: locationTag.accuracy,
            address: locationTag.address,
          }
        : null,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Firestore failed (offline etc) — SQLite result is still safe
    console.log('Firestore save failed, result kept in SQLite:', error);
  }

  return localId;
}