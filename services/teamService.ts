import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
 
import { auth, db } from './firebase';
 
export type TeamData = {
  teamId: string;
  teamName: string;
  memberCount: number;
  memberNames: string[];
  gradeLevel: string;
  teamDiscriminator: string;
};
 
// Save a new team to Firestore
export async function saveTeamSetup(teamData: TeamData) {
  const currentUser = auth.currentUser;
 
  return addDoc(collection(db, 'teams'), {
    ...teamData,
    userId: currentUser ? currentUser.uid : null,
    userEmail: currentUser ? currentUser.email : null,
    createdAt: serverTimestamp(),
  });
}
 
// Find an existing team by discriminator code
export async function findTeamByDiscriminator(
  discriminator: string
): Promise<TeamData | null> {
  try {
    const q = query(
      collection(db, 'teams'),
      where('teamDiscriminator', '==', discriminator.trim().toUpperCase())
    );
 
    const snapshot = await getDocs(q);
 
    if (snapshot.empty) {
      return null;
    }
 
    const doc = snapshot.docs[0];
    const data = doc.data();
 
    return {
      teamId: String(data.teamId ?? data.teamDiscriminator ?? ''),
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
 