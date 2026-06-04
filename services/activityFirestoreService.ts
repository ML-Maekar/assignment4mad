import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { getLocalTeamProfile } from '@/utils/teamProfileStorage';

import { auth, db } from './firebase';

type SaveActivityResultToFirestoreParams = {
  localResultId: number;
  activityKey: string;
  activityTitle: string;
  label: string;
  score: number;
  data: Record<string, unknown>;
};

export async function saveActivityResultToFirestore({
  localResultId,
  activityKey,
  activityTitle,
  label,
  score,
  data,
}: SaveActivityResultToFirestoreParams) {
  const currentUser = auth.currentUser;
  const teamProfile = await getLocalTeamProfile();

  const firestoreData = {
    localResultId,
    activityKey,
    activityTitle,
    label,
    score,
    data,

    teamId: teamProfile?.teamId ?? null,
    teamName: teamProfile?.teamName ?? null,
    teamDiscriminator: teamProfile?.teamDiscriminator ?? null,
    memberCount: teamProfile?.memberCount ?? null,
    memberNames: teamProfile?.memberNames ?? [],
    gradeLevel: teamProfile?.gradeLevel ?? null,

    userId: currentUser?.uid ?? null,
    userEmail: currentUser?.email ?? null,

    createdAt: serverTimestamp(),
  };

  const resultRef = await addDoc(collection(db, 'activityResults'), firestoreData);

  await addDoc(collection(db, 'leaderboardEntries'), {
    resultId: resultRef.id,
    localResultId,
    activityKey,
    activityTitle,
    label,
    score,

    teamId: teamProfile?.teamId ?? null,
    teamName: teamProfile?.teamName ?? null,
    teamDiscriminator: teamProfile?.teamDiscriminator ?? null,
    memberCount: teamProfile?.memberCount ?? null,
    gradeLevel: teamProfile?.gradeLevel ?? null,

    userId: currentUser?.uid ?? null,
    userEmail: currentUser?.email ?? null,

    createdAt: serverTimestamp(),
  });

  return resultRef.id;
}