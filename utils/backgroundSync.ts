/**
 * backgroundSync.ts
 *
 * Registers a background fetch task called STEMM_BACKGROUND_SYNC.
 * Every 15 minutes (when the OS allows), it:
 *   1. Opens the local SQLite database
 *   2. Fetches all rows where synced = 0
 *   3. Attempts to write each one to Firestore
 *   4. Marks successfully synced rows with synced = 1
 *
 * This ensures results saved while offline (e.g. in a school with no Wi-Fi)
 * eventually reach Firestore once connectivity is restored.
 *
 * Registration happens once at app startup from app/_layout.tsx.
 * The OS controls when the task actually runs — 15 minutes is the minimum
 * interval on both Android and iOS, and the OS may defer it further.
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { auth, db } from '@/services/firebase';
import {
    ActivityResultRecord,
    initActivityResultsDb,
} from '@/utils/activityResultsDb';
import { getLocalTeamProfile } from '@/utils/teamProfileStorage';
import * as SQLite from 'expo-sqlite';

export const BACKGROUND_SYNC_TASK = 'STEMM_BACKGROUND_SYNC';

// ─── Internal helpers ─────────────────────────────────────────

const DATABASE_NAME = 'stemm_lab_results.db';

/** Fetch all rows where synced = 0 directly from SQLite. */
async function getUnsyncedResults(): Promise<ActivityResultRecord[]> {
  await initActivityResultsDb();
  const db_sqlite = await SQLite.openDatabaseAsync(DATABASE_NAME);

  return db_sqlite.getAllAsync<ActivityResultRecord>(
    `
      SELECT
        id,
        activity_key   AS activityKey,
        activity_title AS activityTitle,
        label,
        score,
        data_json      AS dataJson,
        created_at     AS createdAt,
        synced
      FROM activity_results
      WHERE synced = 0
      ORDER BY created_at ASC;
    `
  );
}

/** Mark a row as synced so it is not retried next time. */
async function markAsSynced(id: number): Promise<void> {
  const db_sqlite = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db_sqlite.runAsync(
    'UPDATE activity_results SET synced = 1 WHERE id = ?;',
    [id]
  );
}

/** Push a single SQLite row to Firestore. */
async function pushToFirestore(row: ActivityResultRecord): Promise<void> {
  let teamName: string | null = null;
  let teamDiscriminator: string | null = null;

  try {
    const teamProfile = await getLocalTeamProfile();
    if (teamProfile) {
      teamName = teamProfile.teamName;
      teamDiscriminator = teamProfile.teamDiscriminator;
    }
  } catch {
    // Team profile unavailable — push without it
  }

  let parsedData: Record<string, unknown> = {};
  try {
    parsedData = JSON.parse(row.dataJson);
  } catch {
    // dataJson malformed — push raw string under a key
    parsedData = { rawDataJson: row.dataJson };
  }

  const currentUser = auth.currentUser;

  await addDoc(collection(db, 'activity_results'), {
    activityKey: row.activityKey,
    activityTitle: row.activityTitle,
    label: row.label,
    score: row.score,
    data: {
      ...parsedData,
      teamName: parsedData.teamName ?? teamName,
      teamDiscriminator: parsedData.teamDiscriminator ?? teamDiscriminator,
    },
    userId: currentUser ? currentUser.uid : null,
    userEmail: currentUser ? currentUser.email : null,
    teamName,
    teamDiscriminator,
    localId: row.id,
    createdAt: serverTimestamp(),
    syncedAt: serverTimestamp(),
    syncSource: 'background-sync',
  });
}

// ─── Task definition ──────────────────────────────────────────

/**
 * Define the task with TaskManager BEFORE the app renders.
 * This call must happen at module-import time (top level), not inside
 * a component or useEffect, so TaskManager can find it when the OS
 * wakes the app in the background.
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const unsynced = await getUnsyncedResults();

    if (unsynced.length === 0) {
      // Nothing to do — tell the OS we had no new data
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    let successCount = 0;

    for (const row of unsynced) {
      try {
        await pushToFirestore(row);
        await markAsSynced(row.id);
        successCount++;
      } catch {
        // This row failed (likely still offline) — leave synced = 0
        // so it is retried on the next background wake
      }
    }

    console.log(
      `[BackgroundSync] Synced ${successCount}/${unsynced.length} results to Firestore.`
    );

    return successCount > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.Failed;
  } catch (error) {
    console.log('[BackgroundSync] Task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── Registration helper ──────────────────────────────────────

/**
 * Call this once from app/_layout.tsx on app startup.
 * Safe to call multiple times — checks if already registered first.
 */
export async function registerBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_SYNC_TASK
    );

    if (isRegistered) {
      console.log('[BackgroundSync] Task already registered — skipping.');
      return;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes in seconds
      stopOnTerminate: false,   // keep running after app is closed (Android)
      startOnBoot: true,        // restart after device reboot (Android)
    });

    console.log('[BackgroundSync] Task registered successfully.');
  } catch (error) {
    // Background fetch is unavailable on some simulators and restricted
    // devices — log and continue, do not crash the app
    console.log('[BackgroundSync] Registration failed (non-fatal):', error);
  }
}

/**
 * Manually trigger a foreground sync — same logic as the background task
 * but called from within the app (e.g. when connectivity is restored).
 * Returns the number of rows successfully synced.
 */
export async function runForegroundSync(): Promise<number> {
  try {
    const unsynced = await getUnsyncedResults();

    if (unsynced.length === 0) return 0;

    let successCount = 0;

    for (const row of unsynced) {
      try {
        await pushToFirestore(row);
        await markAsSynced(row.id);
        successCount++;
      } catch {
        // Row still offline — will be retried
      }
    }

    console.log(
      `[ForegroundSync] Synced ${successCount}/${unsynced.length} results.`
    );

    return successCount;
  } catch (error) {
    console.log('[ForegroundSync] Error:', error);
    return 0;
  }
}