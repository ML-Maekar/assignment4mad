/**
 * videoStorageService.ts
 *
 * Handles two jobs after a video is recorded in Activities 1 & 3:
 *
 *   1. Save the video to the device's media library (Camera Roll / Gallery)
 *      so the student keeps a permanent copy even if the app is deleted.
 *      Requires expo-media-library (mediaLibraryGranted permission).
 *
 *   2. Upload the video to Firebase Storage so it is stored in the cloud
 *      and the download URL can be attached to the Firestore attempt record.
 *      Falls back gracefully if the upload fails — the local save is always
 *      attempted first so nothing is lost offline.
 *
 * Usage:
 *   import { saveVideoEvidence } from '@/services/videoStorageService';
 *
 *   const { localAssetId, firebaseUrl } = await saveVideoEvidence({
 *     localUri: videoUri,
 *     activityKey: 'activity-one',
 *     mediaLibraryGranted: true,
 *   });
 */

import * as MediaLibrary from 'expo-media-library';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

import { auth } from './firebase';

export type VideoEvidenceResult = {
  /** expo-media-library asset ID — present if save-to-gallery succeeded */
  localAssetId: string | null;
  /** Firebase Storage download URL — present if cloud upload succeeded */
  firebaseUrl: string | null;
};

/**
 * Save a recorded video to the device gallery and upload to Firebase Storage.
 *
 * @param localUri           The file:// URI from ImagePicker / CameraView
 * @param activityKey        e.g. 'activity-one' or 'activity-three'
 * @param mediaLibraryGranted  Whether the user has granted Media Library permission
 */
export async function saveVideoEvidence({
  localUri,
  activityKey,
  mediaLibraryGranted,
}: {
  localUri: string;
  activityKey: string;
  mediaLibraryGranted: boolean;
}): Promise<VideoEvidenceResult> {
  let localAssetId: string | null = null;
  let firebaseUrl: string | null = null;

  // ── Step 1: Save to device gallery ───────────────────────────
  if (mediaLibraryGranted) {
    try {
      const asset = await MediaLibrary.createAssetAsync(localUri);
      localAssetId = asset.id;

      // Optionally put the asset into a STEMM Lab album for easy access
      try {
        let album = await MediaLibrary.getAlbumAsync('STEMM Lab');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('STEMM Lab', asset, false);
        }
      } catch {
        // Album creation is best-effort — asset is already saved to gallery
      }
    } catch (error) {
      console.log('Failed to save video to media library:', error);
    }
  }

  // ── Step 2: Upload to Firebase Storage ───────────────────────
  // Build a path like: videos/activity-one/<uid>/<timestamp>.mp4
  try {
    const storage = getStorage();
    const uid = auth.currentUser?.uid ?? 'anonymous';
    const timestamp = Date.now();
    const extension = localUri.split('.').pop() ?? 'mp4';
    const storagePath = `videos/${activityKey}/${uid}/${timestamp}.${extension}`;

    const storageRef = ref(storage, storagePath);

    // Fetch the local file as a Blob so we can upload it
    const response = await fetch(localUri);
    const blob = await response.blob();

    await uploadBytes(storageRef, blob);
    firebaseUrl = await getDownloadURL(storageRef);
  } catch (error) {
    console.log('Firebase Storage upload failed — video kept locally:', error);
    // Not re-thrown: local save is the primary goal, cloud upload is bonus
  }

  return { localAssetId, firebaseUrl };
}

/**
 * Save a photo to the device gallery.
 * Used by Activity 3 (Hand Fan Challenge) photo evidence.
 */
export async function savePhotoEvidence({
  localUri,
  activityKey,
  mediaLibraryGranted,
}: {
  localUri: string;
  activityKey: string;
  mediaLibraryGranted: boolean;
}): Promise<VideoEvidenceResult> {
  let localAssetId: string | null = null;
  let firebaseUrl: string | null = null;

  // ── Step 1: Save to device gallery ───────────────────────────
  if (mediaLibraryGranted) {
    try {
      const asset = await MediaLibrary.createAssetAsync(localUri);
      localAssetId = asset.id;

      try {
        let album = await MediaLibrary.getAlbumAsync('STEMM Lab');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('STEMM Lab', asset, false);
        }
      } catch {
        // Best-effort album add
      }
    } catch (error) {
      console.log('Failed to save photo to media library:', error);
    }
  }

  // ── Step 2: Upload to Firebase Storage ───────────────────────
  try {
    const storage = getStorage();
    const uid = auth.currentUser?.uid ?? 'anonymous';
    const timestamp = Date.now();
    const extension = localUri.split('.').pop() ?? 'jpg';
    const storagePath = `photos/${activityKey}/${uid}/${timestamp}.${extension}`;

    const storageRef = ref(storage, storagePath);

    const response = await fetch(localUri);
    const blob = await response.blob();

    await uploadBytes(storageRef, blob);
    firebaseUrl = await getDownloadURL(storageRef);
  } catch (error) {
    console.log('Firebase Storage photo upload failed — photo kept locally:', error);
  }

  return { localAssetId, firebaseUrl };
}
