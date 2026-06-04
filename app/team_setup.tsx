import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import {
  createTeamSetup,
  generateTeamDiscriminator,
  joinTeamByDiscriminator,
} from '@/services/teamService';
import { saveLocalTeamProfile } from '@/utils/teamProfileStorage';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type TeamMode = 'create' | 'join';

export default function TeamSetupScreen() {
  const { colors } = useAppTheme();

  const [mode, setMode] = useState<TeamMode>('create');

  const [teamName, setTeamName] = useState('');
  const [memberCount, setMemberCount] = useState('');
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [gradeLevel, setGradeLevel] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const teamDiscriminator = useMemo(() => generateTeamDiscriminator(), []);

  const handleMemberCountChange = (value: string) => {
    const cleanedValue = value.replace(/[^0-9]/g, '');
    setMemberCount(cleanedValue);

    const count = Number(cleanedValue);

    if (!cleanedValue || count <= 0) {
      setMemberNames([]);
      return;
    }

    if (count > 10) {
      Alert.alert('Too Many Members', 'A team can have a maximum of 10 members.');
      setMemberCount('10');

      setMemberNames((currentNames) => {
        const updatedNames = [...currentNames];

        while (updatedNames.length < 10) {
          updatedNames.push('');
        }

        return updatedNames.slice(0, 10);
      });

      return;
    }

    setMemberNames((currentNames) => {
      const updatedNames = [...currentNames];

      if (count > updatedNames.length) {
        while (updatedNames.length < count) {
          updatedNames.push('');
        }
      }

      if (count < updatedNames.length) {
        return updatedNames.slice(0, count);
      }

      return updatedNames;
    });
  };

  const handleMemberNameChange = (index: number, value: string) => {
    setMemberNames((currentNames) => {
      const updatedNames = [...currentNames];
      updatedNames[index] = value;
      return updatedNames;
    });
  };

  const handleCreateTeam = async () => {
    const count = Number(memberCount);

    if (!teamName.trim()) {
      Alert.alert('Missing Team Name', 'Please enter your team name.');
      return;
    }

    if (!Number.isInteger(count) || count <= 0) {
      Alert.alert('Invalid Team Size', 'Please enter the number of team members.');
      return;
    }

    if (count > 10) {
      Alert.alert('Too Many Members', 'A team can have a maximum of 10 members.');
      return;
    }

    if (memberNames.length !== count || memberNames.some((name) => !name.trim())) {
      Alert.alert(
        'Missing Member Names',
        'Please enter the first name of every team member.'
      );
      return;
    }

    if (!gradeLevel.trim()) {
      Alert.alert('Missing Grade/Year Level', 'Please enter your grade or year level.');
      return;
    }

    try {
      setIsSaving(true);

      const createdTeam = await createTeamSetup({
        teamName: teamName.trim(),
        memberCount: count,
        memberNames: memberNames.map((name) => name.trim()),
        gradeLevel: gradeLevel.trim(),
        teamDiscriminator,
      });

      await saveLocalTeamProfile(createdTeam);

      Alert.alert(
        'Team Saved',
        `Team saved to Firestore.\nTeam Code: ${createdTeam.teamDiscriminator}`
      );

      router.replace('/(tabs)/home');
    } catch (error) {
      console.log('Failed to create team:', error);
      Alert.alert(
        'Team Save Failed',
        error instanceof Error ? error.message : 'The team could not be saved.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Missing Team Code', 'Please enter your team code.');
      return;
    }

    try {
      setIsSaving(true);

      const joinedTeam = await joinTeamByDiscriminator(joinCode);

      await saveLocalTeamProfile(joinedTeam);

      Alert.alert(
        'Team Loaded',
        `You are now using team: ${joinedTeam.teamName}`
      );

      router.replace('/(tabs)/home');
    } catch (error) {
      console.log('Failed to join team:', error);
      Alert.alert(
        'Join Team Failed',
        error instanceof Error ? error.message : 'The team could not be found.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Team Setup</Text>

        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Create a new team or log back in using an existing team code.
        </Text>
      </View>

      <View style={styles.modeRow}>
        <Pressable
          onPress={() => setMode('create')}
          style={({ pressed }) => [
            styles.modeButton,
            {
              borderColor: mode === 'create' ? colors.tint : colors.border,
              backgroundColor:
                mode === 'create' ? `${colors.tint}20` : colors.card,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text
            style={[
              styles.modeButtonText,
              { color: mode === 'create' ? colors.tint : colors.text },
            ]}
          >
            Create Team
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode('join')}
          style={({ pressed }) => [
            styles.modeButton,
            {
              borderColor: mode === 'join' ? colors.tint : colors.border,
              backgroundColor:
                mode === 'join' ? `${colors.tint}20` : colors.card,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text
            style={[
              styles.modeButtonText,
              { color: mode === 'join' ? colors.tint : colors.text },
            ]}
          >
            Join Team
          </Text>
        </Pressable>
      </View>

      {mode === 'create' ? (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Create New Team
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="Team Name"
            placeholderTextColor={colors.subtitle}
            value={teamName}
            onChangeText={setTeamName}
          />

          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="How many team members? Max 10"
            placeholderTextColor={colors.subtitle}
            keyboardType="number-pad"
            value={memberCount}
            onChangeText={handleMemberCountChange}
          />

          {memberNames.map((name, index) => (
            <TextInput
              key={index}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder={`First Name of Team Member ${index + 1}`}
              placeholderTextColor={colors.subtitle}
              value={name}
              onChangeText={(value) => handleMemberNameChange(index, value)}
            />
          ))}

          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="Grade or Year Level, e.g. Year 8"
            placeholderTextColor={colors.subtitle}
            value={gradeLevel}
            onChangeText={setGradeLevel}
          />

          <View
            style={[
              styles.codeBox,
              { borderColor: colors.tint, backgroundColor: `${colors.tint}15` },
            ]}
          >
            <Text style={[styles.codeLabel, { color: colors.subtitle }]}>
              Team Code / Discriminator
            </Text>

            <Text style={[styles.codeValue, { color: colors.tint }]}>
              {teamDiscriminator}
            </Text>

            <Text style={[styles.codeHelp, { color: colors.subtitle }]}>
              Use this code later to log back into the same team.
            </Text>
          </View>

          <Pressable
            onPress={handleCreateTeam}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              {isSaving ? 'Saving Team...' : 'Save Team and Continue'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Join Existing Team
          </Text>

          <Text style={[styles.body, { color: colors.subtitle }]}>
            Enter the team code/discriminator to reload the same team on this
            device.
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="Team Code, e.g. STEMM-1234"
            placeholderTextColor={colors.subtitle}
            autoCapitalize="characters"
            value={joinCode}
            onChangeText={(value) => setJoinCode(value.toUpperCase())}
          />

          <Pressable
            onPress={handleJoinTeam}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              {isSaving ? 'Loading Team...' : 'Join Team and Continue'}
            </Text>
          </Pressable>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 14,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  codeBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  codeValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '900',
  },
  codeHelp: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    minHeight: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '900',
  },
});