import {
    getFirestoreResultHistory,
    getFirestoreResultsByActivity,
} from '../../services/resultHistoryService';
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

const mockResults = [
  {
    id: 1,
    activityKey: 'activity-two',
    activityTitle: 'Sound Pollution Hunter',
    label: 'Pen drop',
    score: 65,
    dataJson: '{"teamName":"Team Alpha"}',
    createdAt: new Date().toISOString(),
    synced: 1,
  },
];

describe('resultHistoryService — integration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('falls back to SQLite when user is not logged in', async () => {
    (activityResultsDb.getAllActivityResults as jest.Mock).mockResolvedValue(mockResults);

    const { results, source } = await getFirestoreResultHistory();
    expect(source).toBe('sqlite');
    expect(results).toHaveLength(1);
  });

  it('filters results by activity key from SQLite when not logged in', async () => {
    (activityResultsDb.getActivityResultsByActivity as jest.Mock).mockResolvedValue(mockResults);

    const { results } = await getFirestoreResultsByActivity('activity-two');
    expect(results.every((r) => r.activityKey === 'activity-two')).toBe(true);
  });

  it('returns empty array when no results exist', async () => {
    (activityResultsDb.getAllActivityResults as jest.Mock).mockResolvedValue([]);

    const { results } = await getFirestoreResultHistory();
    expect(results).toEqual([]);
  });
});