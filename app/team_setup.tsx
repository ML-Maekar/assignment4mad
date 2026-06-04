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

import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { saveTeamSetup } from '@/services/teamService';
import { saveLocalTeamProfile } from '@/utils/teamProfileStorage';

const MAX_TEAM_MEMBERS = 10;

function createTeamDiscriminator() {
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  return `STEMM-${randomNumber}`;
}

export default function TeamSetupScreen() {
  const { colors } = useAppTheme();

  const [teamName, setTeamName] = useState('');
  const [memberCount, setMemberCount] = useState('2');
  const [memberNames, setMemberNames] = useState(['', '']);
  const [gradeLevel, setGradeLevel] = useState('');
  const [teamDiscriminator] = useState(createTeamDiscriminator());
  const [isSaving, setIsSaving] = useState(false);

  const countValue = useMemo(() => {
    const parsedCount = Number(memberCount);

    if (Number.isNaN(parsedCount)) {
      return 0;
    }

    return parsedCount;
  }, [memberCount]);

  const updateMemberCount = (value: string) => {
    setMemberCount(value);

    const parsedCount = Number(value);

    if (
      Number.isNaN(parsedCount) ||
      parsedCount < 1 ||
      parsedCount > MAX_TEAM_MEMBERS
    ) {
      return;
    }

    setMemberNames((currentNames) => {
      const updatedNames = [...currentNames];

      if (parsedCount > updatedNames.length) {
        while (updatedNames.length < parsedCount) {
          updatedNames.push('');
        }
      }

      if (parsedCount < updatedNames.length) {
        updatedNames.length = parsedCount;
      }

      return updatedNames;
    });
  };

  const updateMemberName = (index: number, value: string) => {
    setMemberNames((currentNames) => {
      const updatedNames = [...currentNames];
      updatedNames[index] = value;
      return updatedNames;
    });
  };

  const saveTeam = async () => {
    const cleanTeamName = teamName.trim();
    const cleanGradeLevel = gradeLevel.trim();
    const cleanMemberNames = memberNames
      .map((memberName) => memberName.trim())
      .filter((memberName) => memberName.length > 0);

    if (!cleanTeamName) {
      Alert.alert('Missing Team Name', 'Please enter your team name.');
      return;
    }

    if (
      Number.isNaN(countValue) ||
      countValue < 1 ||
      countValue > MAX_TEAM_MEMBERS
    ) {
      Alert.alert(
        'Invalid Team Size',
        `Please enter a team size between 1 and ${MAX_TEAM_MEMBERS}.`
      );
      return;
    }

    if (cleanMemberNames.length !== countValue) {
      Alert.alert(
        'Missing Team Members',
        'Please enter the first name of each team member.'
      );
      return;
    }

    if (!cleanGradeLevel) {
      Alert.alert(
        'Missing Grade or Year Level',
        'Please enter your grade or year level, for example Primary, Year 5, Year 7, or High School.'
      );
      return;
    }

    try {
      setIsSaving(true);

      await saveTeamSetup({
        teamName: cleanTeamName,
        memberCount: cleanMemberNames.length,
        memberNames: cleanMemberNames,
        gradeLevel: cleanGradeLevel,
        teamDiscriminator,
      });

      await saveLocalTeamProfile({
        teamName: cleanTeamName,
        memberNames: cleanMemberNames,
        gradeLevel: cleanGradeLevel,
        teamDiscriminator,
      });

      Alert.alert('Team Saved', 'Your team setup has been saved.', [
        {
          text: 'Continue',
          onPress: () => router.replace('/(tabs)/home' as never),
        },
      ]);
    } catch (error) {
      console.log('Failed to save team setup:', error);
      Alert.alert(
        'Save Failed',
        'The team setup could not be saved. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Team Setup
        </Text>

        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Enter your team details before starting the STEMM Lab activities.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Team Information
        </Text>

        <TextInput
          value={teamName}
          onChangeText={setTeamName}
          placeholder="Team name"
          placeholderTextColor={colors.subtitle}
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        />

        <TextInput
          value={memberCount}
          onChangeText={updateMemberCount}
          placeholder="Number of team members"
          placeholderTextColor={colors.subtitle}
          keyboardType="number-pad"
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        />

        {memberNames.map((memberName, index) => (
          <TextInput
            key={index}
            value={memberName}
            onChangeText={(value) => updateMemberName(index, value)}
            placeholder={`Team member ${index + 1} first name`}
            placeholderTextColor={colors.subtitle}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />
        ))}

        <TextInput
          value={gradeLevel}
          onChangeText={setGradeLevel}
          placeholder="Grade or year level, e.g. Primary, Year 5, Year 8, High School"
          placeholderTextColor={colors.subtitle}
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        />

        <View
          style={[
            styles.discriminatorBox,
            {
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Text style={[styles.discriminatorLabel, { color: colors.subtitle }]}>
            Team Discriminator
          </Text>

          <Text style={[styles.discriminatorValue, { color: colors.text }]}>
            {teamDiscriminator}
          </Text>
        </View>

        <Text style={[styles.helperText, { color: colors.subtitle }]}>
          The grade/year level will be used by activities such as Parachute Drop
          Challenge to show Primary or High School calculations.
        </Text>

        <Pressable
          onPress={saveTeam}
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
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
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
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  discriminatorBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  discriminatorLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  discriminatorValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  button: {
    minHeight: 56,
    borderRadius: 18,
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