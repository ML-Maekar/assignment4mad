jest.mock('../../utils/secureStorage', () => ({
  secureSetObject: jest.fn(),
  secureGetObject: jest.fn(),
  secureDelete: jest.fn(),
}));
 
import {
    getLocalTeamProfile,
    getStudentLevelFromGrade,
    saveLocalTeamProfile,
} from '../../utils/teamProfileStorage';
 
const mockProfile = {
  teamId: 'test-id-123',
  teamName: 'Team Alpha',
  memberCount: 2,
  memberNames: ['Alice', 'Bob'],
  gradeLevel: 'Year 7',
  teamDiscriminator: 'STEMM-1234',
};
 
describe('teamProfileStorage — unit', () => {
  beforeEach(() => jest.clearAllMocks());
 
  it('saves team profile using secure storage', async () => {
    const { secureSetObject } = require('../../utils/secureStorage');
    secureSetObject.mockResolvedValue(undefined);
    await saveLocalTeamProfile(mockProfile);
    expect(secureSetObject).toHaveBeenCalledWith(
      'stemm_lab_team_profile',
      mockProfile
    );
  });
 
  it('returns team profile from secure storage', async () => {
    const { secureGetObject } = require('../../utils/secureStorage');
    secureGetObject.mockResolvedValue(mockProfile);
    const result = await getLocalTeamProfile();
    expect(result).toEqual(mockProfile);
  });
 
  it('returns null when no profile is stored', async () => {
    const { secureGetObject } = require('../../utils/secureStorage');
    secureGetObject.mockResolvedValue(null);
    const result = await getLocalTeamProfile();
    expect(result).toBeNull();
  });
 
  it('returns null when stored data is invalid', async () => {
    const { secureGetObject } = require('../../utils/secureStorage');
    secureGetObject.mockResolvedValue(null);
    const result = await getLocalTeamProfile();
    expect(result).toBeNull();
  });
 
  it('returns primary for year 5 grade level', () => {
    expect(getStudentLevelFromGrade('Year 5')).toBe('primary');
  });
 
  it('returns high for year 9 grade level', () => {
    expect(getStudentLevelFromGrade('Year 9')).toBe('high');
  });
});