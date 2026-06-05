import { saveAttempt } from '../../services/attemptService';
import * as activityResultsDb from '../../utils/activityResultsDb';
import * as locationService from '../../utils/locationService';
import * as teamProfileStorage from '../../utils/teamProfileStorage';

jest.mock('../../utils/activityResultsDb', () => ({
  saveActivityResult: jest.fn(),
}));

jest.mock('../../utils/locationService', () => ({
  getCurrentLocationTag: jest.fn(),
}));

jest.mock('../../utils/teamProfileStorage', () => ({
  getLocalTeamProfile: jest.fn(),
}));

jest.mock('../../services/firebase', () => ({
  db: {},
  auth: { currentUser: null },
}));

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(),
}));

describe('saveAttempt — integration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves to SQLite and returns local ID', async () => {
    (activityResultsDb.saveActivityResult as jest.Mock).mockResolvedValue(42);
    (locationService.getCurrentLocationTag as jest.Mock).mockResolvedValue(null);
    (teamProfileStorage.getLocalTeamProfile as jest.Mock).mockResolvedValue(null);

    const id = await saveAttempt({
      activityKey: 'activity-one',
      activityTitle: 'Parachute Drop Challenge',
      label: 'Prototype 1',
      score: 85,
      data: {},
    });

    expect(id).toBe(42);
    expect(activityResultsDb.saveActivityResult).toHaveBeenCalledTimes(1);
  });

  it('attaches team name when team profile exists', async () => {
    (activityResultsDb.saveActivityResult as jest.Mock).mockResolvedValue(1);
    (locationService.getCurrentLocationTag as jest.Mock).mockResolvedValue(null);
    (teamProfileStorage.getLocalTeamProfile as jest.Mock).mockResolvedValue({
      teamName: 'Team Alpha',
      teamDiscriminator: 'STEMM-1234',
      memberNames: ['Alice'],
      gradeLevel: 'Year 7',
    });

    const { addDoc } = require('firebase/firestore');
    (addDoc as jest.Mock).mockResolvedValue({});

    await saveAttempt({
      activityKey: 'activity-one',
      activityTitle: 'Parachute Drop Challenge',
      label: 'Prototype 1',
      score: 85,
      data: {},
    });

    expect(addDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ teamName: 'Team Alpha' })
    );
  });

  it('still saves to SQLite even if Firestore fails', async () => {
    (activityResultsDb.saveActivityResult as jest.Mock).mockResolvedValue(7);
    (locationService.getCurrentLocationTag as jest.Mock).mockResolvedValue(null);
    (teamProfileStorage.getLocalTeamProfile as jest.Mock).mockResolvedValue(null);

    const { addDoc } = require('firebase/firestore');
    (addDoc as jest.Mock).mockRejectedValue(new Error('network error'));

    const id = await saveAttempt({
      activityKey: 'activity-two',
      activityTitle: 'Sound Pollution Hunter',
      label: 'Pen drop',
      score: 60,
      data: {},
    });

    expect(id).toBe(7);
  });
});