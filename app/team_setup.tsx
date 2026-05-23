import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { saveTeamSetup } from '../services/teamService';

function generateTeamDiscriminator() {
  const number = Math.floor(1000 + Math.random() * 9000);
  return `STEMM-${number}`;
}

export default function TeamSetupScreen() {
  const [teamName, setTeamName] = useState('');
  const [memberCount, setMemberCount] = useState('');
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [gradeLevel, setGradeLevel] = useState('');
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
      Alert.alert(
        'Too many members',
        'Please enter 10 or fewer team members.'
      );

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

  const handleContinue = async () => {
    const count = Number(memberCount);

    if (!teamName.trim()) {
      Alert.alert('Missing team name', 'Please enter your team name.');
      return;
    }

    if (!Number.isInteger(count) || count <= 0) {
      Alert.alert(
        'Invalid team size',
        'Please enter a valid number of team members.'
      );
      return;
    }

    if (count > 10) {
      Alert.alert(
        'Too many members',
        'Please enter 10 or fewer team members.'
      );
      return;
    }

    const hasEmptyMemberName = memberNames.some((name) => !name.trim());

    if (memberNames.length !== count || hasEmptyMemberName) {
      Alert.alert(
        'Missing member names',
        'Please enter the first name of each team member.'
      );
      return;
    }

    if (!gradeLevel.trim()) {
      Alert.alert(
        'Missing grade/year level',
        'Please enter your grade or year level.'
      );
      return;
    }

    const teamData = {
      teamName: teamName.trim(),
      memberCount: count,
      memberNames: memberNames.map((name) => name.trim()),
      gradeLevel: gradeLevel.trim(),
      teamDiscriminator,
    };

    try {
      setIsSaving(true);

      await saveTeamSetup(teamData);

      Alert.alert('Team saved', 'Your team setup has been saved successfully.');
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert(
        'Save failed',
        error.message || 'Could not save team setup. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Team Setup</Text>

      <Text style={styles.subtitle}>
        Enter your team details before starting the STEMM activities.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Team Name"
        placeholderTextColor="#777"
        value={teamName}
        onChangeText={setTeamName}
      />

      <TextInput
        style={styles.input}
        placeholder="How many team members?"
        placeholderTextColor="#777"
        keyboardType="number-pad"
        value={memberCount}
        onChangeText={handleMemberCountChange}
      />

      {memberNames.map((name, index) => (
        <TextInput
          key={index}
          style={styles.input}
          placeholder={`First Name of Team Member ${index + 1}`}
          placeholderTextColor="#777"
          value={name}
          onChangeText={(value) => handleMemberNameChange(index, value)}
        />
      ))}

      <TextInput
        style={styles.input}
        placeholder="Grade or Year Level, e.g. Year 8"
        placeholderTextColor="#777"
        value={gradeLevel}
        onChangeText={setGradeLevel}
      />

      <View style={styles.discriminatorBox}>
        <Text style={styles.discriminatorLabel}>Team Discriminator</Text>
        <Text style={styles.discriminatorValue}>{teamDiscriminator}</Text>
      </View>

      <Pressable
        style={[
          styles.button,
          isSaving && styles.disabledButton,
        ]}
        onPress={handleContinue}
        disabled={isSaving}
      >
        <Text style={styles.buttonText}>
          {isSaving ? 'Saving Team...' : 'Continue to Activities'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  container: {
    padding: 24,
    paddingTop: 70,
    paddingBottom: 40,
  },

  title: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    color: '#000000',
  },

  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
    color: '#666666',
    lineHeight: 22,
  },

  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
    color: '#000000',
  },

  discriminatorBox: {
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },

  discriminatorLabel: {
    color: '#666666',
    fontSize: 14,
    marginBottom: 4,
  },

  discriminatorValue: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: '800',
  },

  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});