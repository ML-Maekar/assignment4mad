import {
    getFirestoreLeaderboardAll,
    getFirestoreLeaderboardByActivity,
} from '../../services/leaderboardService';
import * as activityResultsDb from '../../utils/activityResultsDb';

jest.mock('../../services/firebase', () => ({
  db: {},
  auth: { currentUser: null },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  where: jest.fn(),
}));

jest.mock('../../utils/activityResultsDb', () => ({
  getAllActivityResults: jest.fn(),
  getActivityResultsByActivity: jest.fn(),
  initActivityResultsDb: jest.fn(),
}));

const mockLocalResults = [
  {
    id: 1,
    activityKey: 'activity-one',
    activityTitle: 'Parachute Drop Challenge',
    label: 'Prototype 1',
    score: 90,
    dataJson: '{}',
    createdAt: new Date().toISOString(),
    synced: 1,
  },
];

describe('leaderboardService — integration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('falls back to SQLite when Firestore fails', async () => {
    const { getDocs } = require('firebase/firestore');
    (getDocs as jest.Mock).mockRejectedValue(new Error('offline'));
    (activityResultsDb.getAllActivityResults as jest.Mock).mockResolvedValue(mockLocalResults);

    const { results, source } = await getFirestoreLeaderboardAll();
    expect(source).toBe('sqlite');
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty array when SQLite has no results', async () => {
    const { getDocs } = require('firebase/firestore');
    (getDocs as jest.Mock).mockRejectedValue(new Error('offline'));
    (activityResultsDb.getAllActivityResults as jest.Mock).mockResolvedValue([]);

    const { results } = await getFirestoreLeaderboardAll();
    expect(results).toEqual([]);
  });

  it('filters by activity key from SQLite when Firestore fails', async () => {
    const { getDocs } = require('firebase/firestore');
    (getDocs as jest.Mock).mockRejectedValue(new Error('offline'));
    (activityResultsDb.getActivityResultsByActivity as jest.Mock).mockResolvedValue(mockLocalResults);

    const { results, source } = await getFirestoreLeaderboardByActivity('activity-one');
    expect(source).toBe('sqlite');
    expect(results.every((r) => r.activityKey === 'activity-one')).toBe(true);
  });
});