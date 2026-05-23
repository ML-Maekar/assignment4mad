import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { auth, db } from './firebase';

export type TeamData = {
  teamName: string;
  memberCount: number;
  memberNames: string[];
  gradeLevel: string;
  teamDiscriminator: string;
};

export async function saveTeamSetup(teamData: TeamData) {
  const currentUser = auth.currentUser;

  return addDoc(collection(db, 'teams'), {
    ...teamData,
    userId: currentUser ? currentUser.uid : null,
    userEmail: currentUser ? currentUser.email : null,
    createdAt: serverTimestamp(),
  });
}
