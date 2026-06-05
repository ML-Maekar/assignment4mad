import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import {
    ActivityResultInput,
    saveActivityResult,
} from '../utils/activityResultsDb';
import { getCurrentLocationTag } from '../utils/locationService';
import { getLocalTeamProfile } from '../utils/teamProfileStorage';
import { auth, db } from './firebase';

export async function saveAttempt(input: ActivityResultInput) {
  // Step 1 — Always save to SQLite first (works offline)
  const localId = await saveActivityResult(input);

  // Step 2 — Get GPS location tag silently
  let locationTag = null;
  try {
    locationTag = await getCurrentLocationTag();
  } catch {
    // Location failed silently — don't block the save
  }

  // Step 3 — Get team profile silently
  let teamName: string | null = null;
  let teamDiscriminator: string | null = null;
  try {
    const teamProfile = await getLocalTeamProfile();
    if (teamProfile) {
      teamName = teamProfile.teamName;
      teamDiscriminator = teamProfile.teamDiscriminator;
    }
  } catch {
    // Team profile failed silently — don't block the save
  }

  // Step 4 — Try to save to Firestore with location + team name attached
  try {
    const currentUser = auth.currentUser;

    await addDoc(collection(db, 'activity_results'), {
      activityKey: input.activityKey,
      activityTitle: input.activityTitle,
      label: input.label,
      score: input.score,
      data: {
        ...(input.data ?? {}),
        // Inject team name and location into data so result summary
        // and leaderboard can read them from dataJson
        teamName,
        teamDiscriminator,
        location: locationTag
          ? {
              latitude: locationTag.latitude,
              longitude: locationTag.longitude,
              accuracy: locationTag.accuracy,
              address: locationTag.address,
            }
          : null,
      },
      userId: currentUser ? currentUser.uid : null,
      userEmail: currentUser ? currentUser.email : null,
      teamName,
      teamDiscriminator,
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
    console.log('Firestore save failed, result kept in SQLite:', error);
  }

  return localId;
}