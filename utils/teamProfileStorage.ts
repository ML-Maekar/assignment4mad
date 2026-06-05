import { secureDelete, secureGetObject, secureSetObject } from './secureStorage';

const TEAM_PROFILE_KEY = 'stemm_lab_team_profile';

export type TeamProfile = {
  teamName: string;
  memberNames: string[];
  gradeLevel: string;
  teamDiscriminator: string;
};

export async function saveLocalTeamProfile(teamProfile: TeamProfile): Promise<void> {
  await secureSetObject<TeamProfile>(TEAM_PROFILE_KEY, teamProfile);
}

export async function getLocalTeamProfile(): Promise<TeamProfile | null> {
  return secureGetObject<TeamProfile>(TEAM_PROFILE_KEY);
}

export async function clearLocalTeamProfile(): Promise<void> {
  await secureDelete(TEAM_PROFILE_KEY);
}

export function getStudentLevelFromGrade(gradeLevel: string) {
  const grade = gradeLevel.toLowerCase();

  if (
    grade.includes('primary') ||
    grade.includes('grade 3') ||
    grade.includes('grade 4') ||
    grade.includes('grade 5') ||
    grade.includes('grade 6') ||
    grade.includes('year 3') ||
    grade.includes('year 4') ||
    grade.includes('year 5') ||
    grade.includes('year 6')
  ) {
    return 'primary';
  }

  return 'high';
}