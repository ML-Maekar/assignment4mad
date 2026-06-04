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

export function generateTeamDiscriminator() {
  const number = Math.floor(1000 + Math.random() * 9000);
  return `STEMM-${number}`;
}

export async function createTeamSetup(teamData: TeamSetupData): Promise<FirestoreTeam> {
  const currentUser = auth.currentUser;

  const existingTeamQuery = query(
    collection(db, 'teams'),
    where('teamDiscriminator', '==', teamData.teamDiscriminator),
    limit(1)
  );

  const existingTeamSnapshot = await getDocs(existingTeamQuery);

  if (!existingTeamSnapshot.empty) {
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

export async function joinTeamByDiscriminator(
  teamDiscriminator: string
): Promise<FirestoreTeam> {
  const currentUser = auth.currentUser;

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