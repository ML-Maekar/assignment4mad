import {
    addDoc,
    collection,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    where,
} from 'firebase/firestore';

import { auth, db } from './firebase';

export type CommentRating = {
  id: string;
  activityKey: string;
  activityTitle: string;
  rating: number;
  comment: string;
  userId: string | null;
  userEmail: string | null;
  createdAt: string;
};

// Save a comment and rating for an activity to Firestore
export async function saveCommentRating(input: {
  activityKey: string;
  activityTitle: string;
  rating: number;
  comment: string;
}) {
  const currentUser = auth.currentUser;

  await addDoc(collection(db, 'comments_ratings'), {
    activityKey: input.activityKey,
    activityTitle: input.activityTitle,
    rating: input.rating,
    comment: input.comment.trim(),
    userId: currentUser ? currentUser.uid : null,
    userEmail: currentUser ? currentUser.email : null,
    createdAt: serverTimestamp(),
  });
}

// Fetch all comments and ratings for a specific activity
// so teams can see what others thought
export async function getCommentsRatingsByActivity(
  activityKey: string
): Promise<CommentRating[]> {
  try {
    const q = query(
      collection(db, 'comments_ratings'),
      where('activityKey', '==', activityKey),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();

      let createdAt = '';

      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        createdAt = data.createdAt.toDate().toISOString();
      } else if (typeof data.createdAt === 'string') {
        createdAt = data.createdAt;
      } else {
        createdAt = new Date().toISOString();
      }

      return {
        id: doc.id,
        activityKey: String(data.activityKey ?? ''),
        activityTitle: String(data.activityTitle ?? ''),
        rating: Number(data.rating ?? 0),
        comment: String(data.comment ?? ''),
        userId: data.userId ?? null,
        userEmail: data.userEmail ?? null,
        createdAt,
      };
    });
  } catch (error) {
    console.log('Failed to fetch comments and ratings:', error);
    return [];
  }
}