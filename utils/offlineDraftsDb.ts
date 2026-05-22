import * as SQLite from 'expo-sqlite';

export type OfflineDraftInput = {
  draftKey: string;
  activityKey: string;
  activityTitle: string;
  draftTitle: string;
  data?: Record<string, unknown>;
};

export type OfflineDraftRecord = {
  id: number;
  draftKey: string;
  activityKey: string;
  activityTitle: string;
  draftTitle: string;
  dataJson: string;
  createdAt: string;
  updatedAt: string;
  synced: number;
};

const DATABASE_NAME = 'stemm_lab_drafts.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

export async function initOfflineDraftsDb() {
  const db = await getDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draft_key TEXT NOT NULL UNIQUE,
      activity_key TEXT NOT NULL,
      activity_title TEXT NOT NULL,
      draft_title TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_offline_drafts_activity_key
    ON offline_drafts(activity_key);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_offline_drafts_updated_at
    ON offline_drafts(updated_at);
  `);
}

export async function saveOfflineDraft(input: OfflineDraftInput) {
  await initOfflineDraftsDb();

  const db = await getDatabase();
  const now = new Date().toISOString();

  const existingDraft = await getOfflineDraftByKey(input.draftKey);

  if (existingDraft) {
    await db.runAsync(
      `
        UPDATE offline_drafts
        SET
          activity_key = ?,
          activity_title = ?,
          draft_title = ?,
          data_json = ?,
          updated_at = ?,
          synced = ?
        WHERE draft_key = ?;
      `,
      [
        input.activityKey,
        input.activityTitle,
        input.draftTitle,
        JSON.stringify(input.data ?? {}),
        now,
        0,
        input.draftKey,
      ]
    );

    return existingDraft.id;
  }

  const result = await db.runAsync(
    `
      INSERT INTO offline_drafts (
        draft_key,
        activity_key,
        activity_title,
        draft_title,
        data_json,
        created_at,
        updated_at,
        synced
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      input.draftKey,
      input.activityKey,
      input.activityTitle,
      input.draftTitle,
      JSON.stringify(input.data ?? {}),
      now,
      now,
      0,
    ]
  );

  return result.lastInsertRowId;
}

export async function getOfflineDraftByKey(draftKey: string) {
  await initOfflineDraftsDb();

  const db = await getDatabase();

  const draft = await db.getFirstAsync<OfflineDraftRecord>(
    `
      SELECT
        id,
        draft_key AS draftKey,
        activity_key AS activityKey,
        activity_title AS activityTitle,
        draft_title AS draftTitle,
        data_json AS dataJson,
        created_at AS createdAt,
        updated_at AS updatedAt,
        synced
      FROM offline_drafts
      WHERE draft_key = ?;
    `,
    [draftKey]
  );

  return draft ?? null;
}

export async function getOfflineDraftsByActivity(activityKey: string) {
  await initOfflineDraftsDb();

  const db = await getDatabase();

  return db.getAllAsync<OfflineDraftRecord>(
    `
      SELECT
        id,
        draft_key AS draftKey,
        activity_key AS activityKey,
        activity_title AS activityTitle,
        draft_title AS draftTitle,
        data_json AS dataJson,
        created_at AS createdAt,
        updated_at AS updatedAt,
        synced
      FROM offline_drafts
      WHERE activity_key = ?
      ORDER BY updated_at DESC;
    `,
    [activityKey]
  );
}

export async function getAllOfflineDrafts() {
  await initOfflineDraftsDb();

  const db = await getDatabase();

  return db.getAllAsync<OfflineDraftRecord>(
    `
      SELECT
        id,
        draft_key AS draftKey,
        activity_key AS activityKey,
        activity_title AS activityTitle,
        draft_title AS draftTitle,
        data_json AS dataJson,
        created_at AS createdAt,
        updated_at AS updatedAt,
        synced
      FROM offline_drafts
      ORDER BY updated_at DESC;
    `
  );
}

export async function deleteOfflineDraftByKey(draftKey: string) {
  await initOfflineDraftsDb();

  const db = await getDatabase();

  await db.runAsync(
    `
      DELETE FROM offline_drafts
      WHERE draft_key = ?;
    `,
    [draftKey]
  );
}

export async function deleteOfflineDraftById(id: number) {
  await initOfflineDraftsDb();

  const db = await getDatabase();

  await db.runAsync(
    `
      DELETE FROM offline_drafts
      WHERE id = ?;
    `,
    [id]
  );
}

export async function clearOfflineDraftsByActivity(activityKey: string) {
  await initOfflineDraftsDb();

  const db = await getDatabase();

  await db.runAsync(
    `
      DELETE FROM offline_drafts
      WHERE activity_key = ?;
    `,
    [activityKey]
  );
}

export function parseOfflineDraftData<T extends Record<string, unknown>>(
  draft: OfflineDraftRecord | null
): T | null {
  if (!draft?.dataJson) {
    return null;
  }

  try {
    return JSON.parse(draft.dataJson) as T;
  } catch {
    return null;
  }
}