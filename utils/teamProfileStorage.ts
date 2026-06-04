import AsyncStorage from '@react-native-async-storage/async-storage';

const TEAM_PROFILE_KEY = 'stemm_lab_team_profile';

export type TeamProfile = {
  teamId: string;
  teamName: string;
  memberCount: number;
  memberNames: string[];
  gradeLevel: string;
  teamDiscriminator: string;
};

export async function saveLocalTeamProfile(teamProfile: TeamProfile) {
  await AsyncStorage.setItem(TEAM_PROFILE_KEY, JSON.stringify(teamProfile));
}

export async function getLocalTeamProfile() {
  const savedProfile = await AsyncStorage.getItem(TEAM_PROFILE_KEY);

  if (!savedProfile) {
    return null;
  }

  return JSON.parse(savedProfile) as TeamProfile;
}

export async function clearLocalTeamProfile() {
  await AsyncStorage.removeItem(TEAM_PROFILE_KEY);
}

export function getStudentLevelFromGrade(gradeLevel: string) {
  const grade = gradeLevel.toLowerCase();

  if (
    grade.includes('primary') ||
    grade.includes('grade 1') ||
    grade.includes('grade 2') ||
    grade.includes('grade 3') ||
    grade.includes('grade 4') ||
    grade.includes('grade 5') ||
    grade.includes('grade 6') ||
    grade.includes('year 1') ||
    grade.includes('year 2') ||
    grade.includes('year 3') ||
    grade.includes('year 4') ||
    grade.includes('year 5') ||
    grade.includes('year 6')
  ) {
    return 'primary';
  }

  return 'high';
}
