import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { findTeamByDiscriminator, saveTeamSetup } from '@/services/teamService';
import { requestLocationPermission } from '@/utils/locationService';
import { saveLocalTeamProfile } from '@/utils/teamProfileStorage';

const MAX_TEAM_MEMBERS = 10;

type TabKey = 'create' | 'join';

function createTeamDiscriminator() {
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  return `STEMM-${randomNumber}`;
}

// Ask for GPS permission after team setup
// Silent if denied — location just won't be tagged on results
async function askForLocationAfterSetup() {
  await requestLocationPermission();
}

export default function TeamSetupScreen() {
  const { colors } = useAppTheme();

  const [activeTab, setActiveTab] = useState<TabKey>('create');

  const [teamName, setTeamName] = useState('');
  const [memberCount, setMemberCount] = useState('2');
  const [memberNames, setMemberNames] = useState(['', '']);
  const [gradeLevel, setGradeLevel] = useState('');
  const [teamDiscriminator] = useState(createTeamDiscriminator());
  const [isSaving, setIsSaving] = useState(false);

  const [joinCode, setJoinCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundTeam, setFoundTeam] = useState<{
    teamName: string;
    memberNames: string[];
    gradeLevel: string;
    teamDiscriminator: string;
  } | null>(null);

  const countValue = useMemo(() => {
    const parsedCount = Number(memberCount);
    if (Number.isNaN(parsedCount)) return 0;
    return parsedCount;
  }, [memberCount]);

  const updateMemberCount = (value: string) => {
    setMemberCount(value);
    const parsedCount = Number(value);

    if (Number.isNaN(parsedCount) || parsedCount < 1 || parsedCount > MAX_TEAM_MEMBERS) {
      return;
    }

    setMemberNames((currentNames) => {
      const updatedNames = [...currentNames];
      while (updatedNames.length < parsedCount) updatedNames.push('');
      if (parsedCount < updatedNames.length) updatedNames.length = parsedCount;
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
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (!cleanTeamName) {
      Alert.alert('Missing Team Name', 'Please enter your team name.');
      return;
    }

    if (Number.isNaN(countValue) || countValue < 1 || countValue > MAX_TEAM_MEMBERS) {
      Alert.alert('Invalid Team Size', `Please enter a team size between 1 and ${MAX_TEAM_MEMBERS}.`);
      return;
    }

    if (cleanMemberNames.length !== countValue) {
      Alert.alert('Missing Team Members', 'Please enter the first name of each team member.');
      return;
    }

    if (!cleanGradeLevel) {
      Alert.alert(
        'Missing Grade or Year Level',
        'Please enter your grade or year level, e.g. Primary, Year 5, Year 7, or High School.'
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

      Alert.alert(
        'Team Created',
        `Your team has been saved.\n\nYour team code is: ${teamDiscriminator}\n\nShare this code with your team so they can join later.`,
        [
          {
            text: 'Continue',
            onPress: async () => {
              // Ask for GPS permission after team is created
              // Silent if denied — results save fine without location
              await askForLocationAfterSetup();
              router.replace('/(tabs)/home' as never);
            },
          },
        ]
      );
    } catch (error) {
      console.log('Failed to save team setup:', error);
      Alert.alert('Save Failed', 'The team setup could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const searchForTeam = async () => {
    const cleanCode = joinCode.trim().toUpperCase();

    if (!cleanCode) {
      Alert.alert('Missing Code', 'Please enter your team discriminator code, e.g. STEMM-1234.');
      return;
    }

    if (!cleanCode.startsWith('STEMM-')) {
      Alert.alert('Invalid Code', 'Team codes start with STEMM- followed by 4 numbers, e.g. STEMM-1234.');
      return;
    }

    try {
      setIsSearching(true);
      setFoundTeam(null);

      const team = await findTeamByDiscriminator(cleanCode);

      if (!team) {
        Alert.alert(
          'Team Not Found',
          `No team found with code "${cleanCode}". Please check the code and try again.`
        );
        return;
      }

      setFoundTeam(team);
    } catch (error) {
      console.log('Failed to search for team:', error);
      Alert.alert('Search Failed', 'Could not search for team. Please check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const joinFoundTeam = async () => {
    if (!foundTeam) return;

    try {
      setIsSaving(true);

      await saveLocalTeamProfile({
        teamName: foundTeam.teamName,
        memberNames: foundTeam.memberNames,
        gradeLevel: foundTeam.gradeLevel,
        teamDiscriminator: foundTeam.teamDiscriminator,
      });

      Alert.alert(
        'Team Joined',
        `You have joined team "${foundTeam.teamName}".`,
        [
          {
            text: 'Continue',
            onPress: async () => {
              // Ask for GPS permission after joining team
              // Silent if denied — results save fine without location
              await askForLocationAfterSetup();
              router.replace('/(tabs)/home' as never);
            },
          },
        ]
      );
    } catch (error) {
      console.log('Failed to join team:', error);
      Alert.alert('Join Failed', 'Could not join the team. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTabs = () => (
    <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
      {([
        { key: 'create', label: 'Create Team' },
        { key: 'join', label: 'Join Team' },
      ] as { key: TabKey; label: string }[]).map((tab) => {
        const selected = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              setActiveTab(tab.key);
              setFoundTeam(null);
            }}
            style={[
              styles.tabButton,
              {
                borderBottomColor: selected ? colors.tint : 'transparent',
                borderBottomWidth: 2,
              },
            ]}
          >
            <Text style={[styles.tabText, { color: selected ? colors.tint : colors.subtitle }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderCreateTab = () => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Create Your Team</Text>

      <Text style={[styles.helperText, { color: colors.subtitle }]}>
        Enter your team details. A unique team code will be generated — share it so others can join.
      </Text>

      <TextInput
        value={teamName}
        onChangeText={setTeamName}
        placeholder="Team name"
        placeholderTextColor={colors.subtitle}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      />

      <TextInput
        value={memberCount}
        onChangeText={updateMemberCount}
        placeholder="Number of team members"
        placeholderTextColor={colors.subtitle}
        keyboardType="number-pad"
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      />

      {memberNames.map((memberName, index) => (
        <TextInput
          key={index}
          value={memberName}
          onChangeText={(value) => updateMemberName(index, value)}
          placeholder={`Team member ${index + 1} first name only`}
          placeholderTextColor={colors.subtitle}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        />
      ))}

      <TextInput
        value={gradeLevel}
        onChangeText={setGradeLevel}
        placeholder="Grade or year level, e.g. Primary, Year 5, Year 8, High School"
        placeholderTextColor={colors.subtitle}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      />

      <View style={[styles.discriminatorBox, { borderColor: colors.tint, backgroundColor: `${colors.tint}10` }]}>
        <Text style={[styles.discriminatorLabel, { color: colors.subtitle }]}>
          Your Team Code — share this with your team
        </Text>
        <Text style={[styles.discriminatorValue, { color: colors.tint }]}>
          {teamDiscriminator}
        </Text>
        <Text style={[styles.helperText, { color: colors.subtitle }]}>
          Others can use this code in the "Join Team" tab to join your team.
        </Text>
      </View>

      <Text style={[styles.helperText, { color: colors.subtitle }]}>
        ⚠️ First names only — no surnames. The grade level controls which calculations appear in each activity.
      </Text>

      <Pressable
        onPress={saveTeam}
        disabled={isSaving}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: isSaving ? colors.subtitle : colors.tint },
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.buttonText }]}>
          {isSaving ? 'Saving Team...' : 'Save Team and Continue'}
        </Text>
      </Pressable>
    </View>
  );

  const renderJoinTab = () => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Join Existing Team</Text>

      <Text style={[styles.helperText, { color: colors.subtitle }]}>
        Enter the team code given to you by your team leader to join their team.
      </Text>

      <View style={[styles.instructionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Team codes look like: STEMM-1234
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Ask the person who created the team for their code.
        </Text>
      </View>

      <TextInput
        value={joinCode}
        onChangeText={(v) => setJoinCode(v.toUpperCase())}
        placeholder="Enter team code, e.g. STEMM-1234"
        placeholderTextColor={colors.subtitle}
        autoCapitalize="characters"
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      />

      <Pressable
        onPress={searchForTeam}
        disabled={isSearching}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: isSearching ? colors.subtitle : colors.tint },
          pressed && styles.buttonPressed,
        ]}
      >
        {isSearching ? (
          <ActivityIndicator color={colors.buttonText} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>Find Team</Text>
        )}
      </Pressable>

      {foundTeam && (
        <View style={[styles.foundTeamBox, { borderColor: colors.success, backgroundColor: `${colors.success}10` }]}>
          <Text style={[styles.foundTeamTitle, { color: colors.success }]}>✓ Team Found</Text>
          <Text style={[styles.foundTeamName, { color: colors.text }]}>{foundTeam.teamName}</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>Grade: {foundTeam.gradeLevel}</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>Members: {foundTeam.memberNames.join(', ')}</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>Code: {foundTeam.teamDiscriminator}</Text>

          <Pressable
            onPress={joinFoundTeam}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.joinButton,
              { backgroundColor: isSaving ? colors.subtitle : colors.success },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              {isSaving ? 'Joining...' : 'Join This Team'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFoundTeam(null)}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: colors.border },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Search Again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Team Setup</Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Create a new team or join an existing one to start the STEMM Lab activities.
        </Text>
      </View>

      {renderTabs()}

      {activeTab === 'create' && renderCreateTab()}
      {activeTab === 'join' && renderJoinTab()}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900' },
  subtitle: { marginTop: 8, fontSize: 16, lineHeight: 22 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 20 },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 15, fontWeight: '800' },
  card: { borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: '900', marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22 },
  input: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 12 },
  instructionBox: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14, gap: 6 },
  discriminatorBox: { borderWidth: 2, borderRadius: 16, padding: 14, marginBottom: 14 },
  discriminatorLabel: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  discriminatorValue: { fontSize: 24, fontWeight: '900', marginBottom: 6 },
  helperText: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  button: { minHeight: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  joinButton: { minHeight: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  secondaryButton: { minHeight: 48, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },
  buttonText: { fontSize: 16, fontWeight: '900' },
  secondaryButtonText: { fontSize: 15, fontWeight: '900' },
  foundTeamBox: { borderWidth: 2, borderRadius: 18, padding: 16, marginTop: 16 },
  foundTeamTitle: { fontSize: 16, fontWeight: '900', marginBottom: 8 },
  foundTeamName: { fontSize: 22, fontWeight: '900', marginBottom: 6 },
});
