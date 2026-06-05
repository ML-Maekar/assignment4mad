import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { auth, db } from './firebase';

export type TeamSetupData = {
  teamName: string;
  memberCount: number;
  memberNames: string[];
  gradeLevel: string;
  teamDiscriminator: string;
};

export type FirestoreTeam = TeamSetupData & {
  teamId: string;
};

// Keep backward compat alias so existing code still works
export type TeamData = TeamSetupData;

// Used by team_setup.tsx Create tab
export function generateTeamDiscriminator() {
  const number = Math.floor(1000 + Math.random() * 9000);
  return `STEMM-${number}`;
}

// Save a new team to Firestore
// Throws if the discriminator already exists
export async function saveTeamSetup(teamData: TeamSetupData): Promise<void> {
  const currentUser = auth.currentUser;

  const existingQuery = query(
    collection(db, 'teams'),
    where('teamDiscriminator', '==', teamData.teamDiscriminator),
    limit(1)
  );

  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    throw new Error('This team code already exists. Please generate a new code.');
  }

  await addDoc(collection(db, 'teams'), {
    teamName: teamData.teamName,
    memberCount: teamData.memberCount,
    memberNames: teamData.memberNames,
    gradeLevel: teamData.gradeLevel,
    teamDiscriminator: teamData.teamDiscriminator,
    ownerUserId: currentUser?.uid ?? null,
    ownerEmail: currentUser?.email ?? null,
    memberUserIds: currentUser?.uid ? [currentUser.uid] : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Also available as createTeamSetup for teammate's screens
export async function createTeamSetup(teamData: TeamSetupData): Promise<FirestoreTeam> {
  const currentUser = auth.currentUser;

  const existingQuery = query(
    collection(db, 'teams'),
    where('teamDiscriminator', '==', teamData.teamDiscriminator),
    limit(1)
  );

  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    throw new Error('This team code already exists. Please generate a new code.');
  }

  const teamRef = await addDoc(collection(db, 'teams'), {
    teamName: teamData.teamName,
    memberCount: teamData.memberCount,
    memberNames: teamData.memberNames,
    gradeLevel: teamData.gradeLevel,
    teamDiscriminator: teamData.teamDiscriminator,
    ownerUserId: currentUser?.uid ?? null,
    ownerEmail: currentUser?.email ?? null,
    memberUserIds: currentUser?.uid ? [currentUser.uid] : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    teamId: teamRef.id,
    ...teamData,
  };
}

// Find an existing team by discriminator code — returns null if not found
export async function findTeamByDiscriminator(
  discriminator: string
): Promise<TeamData | null> {
  try {
    const q = query(
      collection(db, 'teams'),
      where('teamDiscriminator', '==', discriminator.trim().toUpperCase()),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      teamName: String(data.teamName ?? ''),
      memberCount: Number(data.memberCount ?? 0),
      memberNames: Array.isArray(data.memberNames) ? data.memberNames : [],
      gradeLevel: String(data.gradeLevel ?? ''),
      teamDiscriminator: String(data.teamDiscriminator ?? ''),
    };
  } catch (error) {
    console.log('Failed to find team by discriminator:', error);
    return null;
  }
}

// Join a team by discriminator — throws if not found
export async function joinTeamByDiscriminator(
  teamDiscriminator: string
): Promise<FirestoreTeam> {
  const teamQuery = query(
    collection(db, 'teams'),
    where('teamDiscriminator', '==', teamDiscriminator.trim().toUpperCase()),
    limit(1)
  );

  const teamSnapshot = await getDocs(teamQuery);

  if (teamSnapshot.empty) {
    throw new Error('No team found with that team code.');
  }

  const teamDoc = teamSnapshot.docs[0];
  const data = teamDoc.data();

  return {
    teamId: teamDoc.id,
    teamName: String(data.teamName ?? ''),
    memberCount: Number(data.memberCount ?? 0),
    memberNames: Array.isArray(data.memberNames) ? data.memberNames : [],
    gradeLevel: String(data.gradeLevel ?? ''),
    teamDiscriminator: String(data.teamDiscriminator ?? teamDiscriminator),
  };
}
