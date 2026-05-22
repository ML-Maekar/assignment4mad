import * as SQLite from 'expo-sqlite';

export type ActivityResultInput = {
  activityKey: string;
  activityTitle: string;
  label: string;
  score: number;
  data?: Record<string, unknown>;
};

export type ActivityResultRecord = {
  id: number;
  activityKey: string;
  activityTitle: string;
  label: string;
  score: number;
  dataJson: string;
  createdAt: string;
  synced: number;
};

const DATABASE_NAME = 'stemm_lab_results.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

export async function initActivityResultsDb() {
  const db = await getDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS activity_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_key TEXT NOT NULL,
      activity_title TEXT NOT NULL,
      label TEXT NOT NULL,
      score REAL NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_activity_results_activity_key
    ON activity_results(activity_key);
  `);
}

export async function saveActivityResult(input: ActivityResultInput) {
  await initActivityResultsDb();

  const db = await getDatabase();
  const createdAt = new Date().toISOString();

  const result = await db.runAsync(
    `
      INSERT INTO activity_results (
        activity_key,
        activity_title,
        label,
        score,
        data_json,
        created_at,
        synced
      )
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    [
      input.activityKey,
      input.activityTitle,
      input.label,
      input.score,
      JSON.stringify(input.data ?? {}),
      createdAt,
      0,
    ]
  );

  return result.lastInsertRowId;
}

export async function getActivityResultById(id: number) {
  await initActivityResultsDb();

  const db = await getDatabase();

  const result = await db.getFirstAsync<ActivityResultRecord>(
    `
      SELECT
        id,
        activity_key AS activityKey,
        activity_title AS activityTitle,
        label,
        score,
        data_json AS dataJson,
        created_at AS createdAt,
        synced
      FROM activity_results
      WHERE id = ?;
    `,
    [id]
  );

  return result ?? null;
}

export async function getActivityResultsByActivity(activityKey: string) {
  await initActivityResultsDb();

  const db = await getDatabase();

  return db.getAllAsync<ActivityResultRecord>(
    `
      SELECT
        id,
        activity_key AS activityKey,
        activity_title AS activityTitle,
        label,
        score,
        data_json AS dataJson,
        created_at AS createdAt,
        synced
      FROM activity_results
      WHERE activity_key = ?
      ORDER BY score DESC, created_at DESC;
    `,
    [activityKey]
  );
}

export async function getAllActivityResults() {
  await initActivityResultsDb();

  const db = await getDatabase();

  return db.getAllAsync<ActivityResultRecord>(
    `
      SELECT
        id,
        activity_key AS activityKey,
        activity_title AS activityTitle,
        label,
        score,
        data_json AS dataJson,
        created_at AS createdAt,
        synced
      FROM activity_results
      ORDER BY created_at DESC;
    `
  );
}

export async function deleteActivityResult(id: number) {
  await initActivityResultsDb();

  const db = await getDatabase();

  await db.runAsync(
    `
      DELETE FROM activity_results
      WHERE id = ?;
    `,
    [id]
  );
}

export async function clearActivityResultsByActivity(activityKey: string) {
  await initActivityResultsDb();

  const db = await getDatabase();

  await db.runAsync(
    `
      DELETE FROM activity_results
      WHERE activity_key = ?;
    `,
    [activityKey]
  );
}