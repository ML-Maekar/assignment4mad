import { Audio } from 'expo-av';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { findTeamByDiscriminator, saveTeamSetup } from '@/services/teamService';
import { requestLocationPermission } from '@/utils/locationService';
import { saveLocalTeamProfile } from '@/utils/teamProfileStorage';

const MAX_TEAM_MEMBERS = 10;

function estimateDbFromMetering(metering: number | undefined, actionName: string) {
  const action = actionName.toLowerCase();
  let minimumDb = 35;
  let maximumDb = 80;

  if (action.includes('pen') || action.includes('pencil')) {
    minimumDb = 40; maximumDb = 65;
  } else if (action.includes('book') || action.includes('bottle') || action.includes('box')) {
    minimumDb = 55; maximumDb = 78;
  } else if (action.includes('stamp') || action.includes('feet') || action.includes('foot')) {
    minimumDb = 60; maximumDb = 85;
  } else if (action.includes('talk') || action.includes('speaking') || action.includes('voice')) {
    minimumDb = 45; maximumDb = 70;
  } else if (action.includes('clap')) {
    minimumDb = 60; maximumDb = 82;
  }

  if (typeof metering !== 'number') return minimumDb;

  const normalized = clamp((metering + 60) / 60, 0, 1);
  return minimumDb + normalized * (maximumDb - minimumDb);
}

function getSoundRisk(db: number): SoundRisk {
  if (db < 30) return { label: 'No risk', example: 'Whisper, quiet library', message: 'This sound level is very quiet and safe.' };
  if (db < 60) return { label: 'Safe for long periods', example: 'Normal conversation, classroom noise', message: 'This sound level is usually safe for long periods.' };
  if (db < 85) return { label: 'Generally safe', example: 'Busy traffic, vacuum cleaner', message: 'This is generally safe, but long exposure can cause fatigue.' };
  if (db < 90) return { label: 'Hearing damage possible', example: 'Lawn mower, loud classroom, heavy traffic', message: 'Hearing damage is possible after long exposure.' };
  if (db < 100) return { label: 'Hearing damage likely', example: 'Motorbike, power tools, loud music', message: 'Hearing damage may happen after short exposure.' };
  if (db < 110) return { label: 'Serious hearing damage risk', example: 'Nightclub, rock concert, chainsaw', message: 'Serious hearing damage can happen within minutes.' };
  if (db < 120) return { label: 'Immediate damage possible', example: 'Siren close by, car horn at 1 m', message: 'This level can be painful and immediate damage is possible.' };
  if (db < 140) return { label: 'Immediate severe damage', example: 'Jet engine close', message: 'Immediate and severe hearing damage is possible.' };
  return { label: 'Instant permanent damage risk', example: 'Explosion, gunshot', message: 'This sound level can cause instant permanent damage.' };
}

// Ask for GPS permission after team setup
// Silent if denied — location just won't be tagged on results
async function askForLocationAfterSetup() {
  await requestLocationPermission();
}

export default function TeamSetupScreen() {
  const { colors } = useAppTheme();
  const { micGranted, askForMic } = usePermissions();

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
    requestPermission();
  }, []);

  useEffect(() => {
    async function loadDraft() {
      try {
        const draft = await getOfflineDraftByKey(DRAFT_KEY);
        const draftData = parseOfflineDraftData<ActivityTwoDraftData>(draft);

        if (draftData?.actionName) { setActionName(draftData.actionName); actionNameRef.current = draftData.actionName; }
        if (draftData?.locationName) { setLocationName(draftData.locationName); locationNameRef.current = draftData.locationName; }
        if (draftData?.prediction) { setPrediction(draftData.prediction); predictionRef.current = draftData.prediction; }
        if (draftData?.wasCorrect) { setWasCorrect(draftData.wasCorrect); wasCorrectRef.current = draftData.wasCorrect; }
        if (draftData?.surprises) { setSurprises(draftData.surprises); surprisesRef.current = draftData.surprises; }
        if (draftData?.earMuffAnswer) { setEarMuffAnswer(draftData.earMuffAnswer); earMuffAnswerRef.current = draftData.earMuffAnswer; }
        if (draftData?.actionName || draftData?.prediction) setDraftStatus('saved');
      } catch (error) {
        console.log('Failed to load Activity 2 draft:', error);
        setDraftStatus('error');
      } finally {
        hasLoadedDraftRef.current = true;
      }
    }
    loadDraft();
  }, []);

  useEffect(() => {
    if (!hasLoadedDraftRef.current) return;

    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);

    draftSaveTimerRef.current = setTimeout(async () => {
      try {
        const trimmedActionName = actionName.trim();
        if (!trimmedActionName) {
          await deleteOfflineDraftByKey(DRAFT_KEY);
          setDraftStatus('idle');
          return;
        }
        await saveOfflineDraft({
          draftKey: DRAFT_KEY,
          activityKey: ACTIVITY_KEY,
          activityTitle: ACTIVITY_TITLE,
          draftTitle: trimmedActionName,
          data: {
            actionName: trimmedActionName,
            locationName: locationName.trim(),
            prediction: prediction.trim(),
            wasCorrect: wasCorrect.trim(),
            surprises: surprises.trim(),
            earMuffAnswer: earMuffAnswer.trim(),
          },
        });
        setDraftStatus('saved');
      } catch (error) {
        console.log('Failed to save Activity 2 draft:', error);
        setDraftStatus('error');
      }
    }, 600);

    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [actionName, locationName, prediction, wasCorrect, surprises, earMuffAnswer]);

  const displayedRisk = maxDb > 0 ? getSoundRisk(maxDb) : null;

  const clearDraft = () => {
    Alert.alert(
      'Clear Draft?',
      'This will remove the saved draft for this activity.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOfflineDraftByKey(DRAFT_KEY);
              setActionName(''); setLocationName(''); setPrediction('');
              setWasCorrect(''); setSurprises(''); setEarMuffAnswer('');
              actionNameRef.current = ''; locationNameRef.current = '';
              predictionRef.current = ''; wasCorrectRef.current = '';
              surprisesRef.current = ''; earMuffAnswerRef.current = '';
              setDraftStatus('idle');
            } catch (error) {
              console.log('Failed to clear Activity 2 draft:', error);
              setDraftStatus('error');
            }
          },
        },
      ]
    );
  };

  const saveTeam = async () => {
    const cleanTeamName = teamName.trim();
    const cleanGradeLevel = gradeLevel.trim();
    const cleanMemberNames = memberNames
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (savedResultId !== null) {
      Alert.alert('Result Already Saved', 'Press Clear Test to record a new sound.');
      return;
    }

    // Check app-level mic permission first
    if (!micGranted) {
      const granted = await askForMic();
      if (!granted) return;
    }

    if (!hasPermission) {
      const permission = await Audio.requestPermissionsAsync();
      setHasPermission(permission.granted);
      if (!permission.granted) {
        Alert.alert('Microphone Permission Needed', 'Please allow microphone access to measure sound.');
        return;
      }
    }

    if (!actionName.trim()) {
      Alert.alert('Missing Action', 'Please enter the sound action first.');
      return;
    }
    if (!locationName.trim()) {
      Alert.alert('Missing Location', 'Please enter where the sound happened.');
      return;
    }

    try {
      setCurrentDb(0);
      setMaxDb(0);
      currentDbRef.current = 0;
      maxDbRef.current = 0;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();

      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      } as any);

      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) return;
        const estimatedDb = estimateDbFromMetering(status.metering, actionNameRef.current.trim());
        currentDbRef.current = estimatedDb;
        setCurrentDb(estimatedDb);
        maxDbRef.current = Math.max(maxDbRef.current, estimatedDb);
        setMaxDb(maxDbRef.current);
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
      console.log('Failed to start Activity 2 recording:', error);
      Alert.alert('Recording Failed', 'Could not start the sound recording.');
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
      setIsRecording(false);
      setIsSaving(true);

      await recording.stopAndUnloadAsync();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const finalDb = maxDbRef.current > 0 ? maxDbRef.current : currentDbRef.current;
      const soundRisk = getSoundRisk(finalDb);

      const finalActionName = actionNameRef.current.trim();
      const finalLocationName = locationNameRef.current.trim();
      const finalPrediction = predictionRef.current.trim();
      const finalWasCorrect = wasCorrectRef.current.trim();

      const savedId = await saveAttempt({
        activityKey: ACTIVITY_KEY,
        activityTitle: ACTIVITY_TITLE,
        label: finalActionName,
        score: finalDb,
        data: {
          actionName: finalActionName,
          locationName: finalLocationName,
          prediction: finalPrediction,
          wasCorrect: finalWasCorrect,
          surprises: surprisesRef.current.trim(),
          earMuffAnswer: earMuffAnswerRef.current.trim(),
          maximumSoundDb: finalDb,
          hearingRisk: soundRisk.label,
          hearingRiskExample: soundRisk.example,
          hearingRiskMessage: soundRisk.message,
          phoneDistanceFromNoiseCm: 30,
        },
      });

      await deleteOfflineDraftByKey(DRAFT_KEY);
      setDraftStatus('idle');

      const newResult: SoundResult = {
        id: savedId,
        actionName: finalActionName,
        locationName: finalLocationName,
        maximumSoundDb: finalDb,
        hearingRisk: soundRisk.label,
        hearingRiskMessage: soundRisk.message,
        prediction: finalPrediction,
        wasCorrect: finalWasCorrect,
      };

      setResults((current) => [newResult, ...current]);
      setSavedResultId(savedId);

      void scheduleActivityCompleteNotification(ACTIVITY_TITLE, finalDb);

      Alert.alert(
        'Sound Test Complete',
        `Maximum sound: ${finalDb.toFixed(1)} dB\nRisk: ${soundRisk.label}`,
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
          { text: 'Stay Here', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.log('Failed to stop/save Activity 2 recording:', error);
      Alert.alert('Save Failed', 'The sound result could not be saved. Please try again.');
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

      <Text style={[styles.cardTitle, { color: colors.text }]}>Instructions</Text>

      <View style={[styles.instructionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          1. Choose a classroom sound action to test.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          2. Place the phone about 30 cm from the sound source.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          3. Press Start Recording and perform the sound action.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          4. Press Stop Recording and save your result.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          5. Compare the maximum dB with the hearing risk table in Discussion.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          6. Rotate for each team member.
        </Text>
      </View>

      {/* Microphone permission warning */}
      {!micGranted && (
        <View style={[styles.warningBox, { backgroundColor: `${colors.danger}18`, borderColor: colors.danger }]}>
          <Text style={[styles.warningText, { color: colors.danger }]}>
            ⚠️ Microphone permission is off. Enable it in Settings to record sound.
          </Text>
        </View>
      )}

      <Text style={[styles.label, { color: colors.text }]}>Sound Action</Text>

      <TextInput
        value={actionName}
        onChangeText={setActionName}
        placeholder="e.g. dropping a book"
        placeholderTextColor={colors.subtitle}
        editable={!isRecording && savedResultId === null}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      />

      <Text style={[styles.label, { color: colors.text }]}>Location</Text>

      <TextInput
        value={locationName}
        onChangeText={setLocationName}
        placeholder="e.g. classroom table"
        placeholderTextColor={colors.subtitle}
        editable={!isRecording && savedResultId === null}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      />

      <View style={[styles.discriminatorBox, { borderColor: colors.tint, backgroundColor: `${colors.tint}10` }]}>
        <Text style={[styles.discriminatorLabel, { color: colors.subtitle }]}>
          Your Team Code — share this with your team
        </Text>
        {actionName.trim().length > 0 && (
          <Pressable onPress={clearDraft}>
            <Text style={[styles.clearDraftText, { color: colors.danger }]}>Clear Draft</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.meterBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.meterLabel, { color: colors.subtitle }]}>Current Sound Level</Text>
        <Text style={[styles.meterValue, { color: colors.tint }]}>
          {currentDb > 0 ? currentDb.toFixed(1) : '0.0'} dB
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Maximum: {maxDb > 0 ? maxDb.toFixed(1) : '0.0'} dB
        </Text>
      </View>

      {savedResultId === null ? (
        <Pressable
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: isRecording ? colors.danger : micGranted ? colors.tint : colors.subtitle },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            {isSaving ? 'Saving...' : isRecording ? 'Stop Recording and Save' : 'Start Recording'}
          </Text>
        </Pressable>
      ) : (
        <Text style={[styles.savedText, { color: colors.success }]}>
          ✓ Sound result saved to Result History.
        </Text>
      )}

      <Pressable
        onPress={() => router.push('/leaderboard?activityKey=activity-two' as never)}
        style={({ pressed }) => [
          styles.secondaryButton,
          { borderColor: colors.tint },
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>View Leaderboard</Text>
      </Pressable>

      {displayedRisk && (
        <View style={[styles.resultBox, { borderColor: colors.border }]}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>Hearing Risk</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>{displayedRisk.label}</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>Example: {displayedRisk.example}</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>{displayedRisk.message}</Text>
        </View>
      )}

      {results.length > 0 && (
        <View style={[styles.resultsBox, { borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Session Results</Text>
          {results.map((result) => (
            <View key={result.id} style={[styles.resultRow, { borderColor: colors.border }]}>
              <Text style={[styles.resultTitle, { color: colors.text }]}>{result.actionName}</Text>
              <Text style={[styles.body, { color: colors.subtitle }]}>Location: {result.locationName}</Text>
              <Text style={[styles.score, { color: colors.success }]}>
                Maximum: {result.maximumSoundDb.toFixed(1)} dB
              </Text>
              <Text style={[styles.body, { color: colors.subtitle }]}>Risk: {result.hearingRisk}</Text>
            </View>
          ))}
        </View>
      )}

      {renderTabs()}
    </View>
  );

  const renderJoinTab = () => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Join Existing Team</Text>

      <Text style={[styles.body, { color: colors.subtitle }]}>
        Predict which action creates the loudest sound. Then compare your prediction with the measured maximum dB.
      </Text>

      <Text style={[styles.label, { color: colors.text }]}>Prediction</Text>

      <TextInput
        value={prediction}
        onChangeText={setPrediction}
        placeholder="e.g. Dropping a book will be loudest"
        placeholderTextColor={colors.subtitle}
        multiline
        style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      />

      {/* Results table */}
      {results.length > 0 && (
        <View style={[styles.tableBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <View style={[styles.tableRow, { borderColor: colors.border }]}>
            <Text style={[styles.tableHeader, { color: colors.text, flex: 2 }]}>Action</Text>
            <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>dB</Text>
            <Text style={[styles.tableHeader, { color: colors.text, flex: 2 }]}>Risk</Text>
          </View>
          {results.map((result) => (
            <View key={result.id} style={[styles.tableRow, { borderColor: colors.border }]}>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]} numberOfLines={2}>
                {result.actionName}
              </Text>
              <Text style={[styles.tableCell, { color: colors.subtitle, flex: 1 }]}>
                {result.maximumSoundDb.toFixed(1)}
              </Text>
              <Text style={[styles.tableCell, { color: colors.success, flex: 2 }]} numberOfLines={2}>
                {result.hearingRisk}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.label, { color: colors.text }]}>Were you right?</Text>

      <TextInput
        value={wasCorrect}
        onChangeText={setWasCorrect}
        placeholder="Was your prediction correct? Explain why."
        placeholderTextColor={colors.subtitle}
        multiline
        style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      />

      <Text style={[styles.label, { color: colors.text }]}>Any surprises?</Text>

      <TextInput
        value={surprises}
        onChangeText={setSurprises}
        placeholder="Did anything unexpected happen?"
        placeholderTextColor={colors.subtitle}
        multiline
        style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      />

      <Text style={[styles.label, { color: colors.text }]}>Should we wear ear muffs?</Text>

      <TextInput
        value={earMuffAnswer}
        onChangeText={setEarMuffAnswer}
        placeholder="Should ear muffs be worn in this place? Why?"
        placeholderTextColor={colors.subtitle}
        multiline
        style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      />

      <Text
        style={[
          styles.draftStatus,
          {
            color: draftStatus === 'saved' ? colors.success : colors.subtitle,
            marginBottom: 8,
          },
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

      <Text style={[styles.label, { color: colors.text }]}>Hearing Risk Table</Text>

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
      ))}

      <View style={[styles.discussionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.discussionHeading, { color: colors.text }]}>Think About This</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• Which action was loudest in your classroom?</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• Was anything louder than you expected?</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• Are any sounds at a harmful level?</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• What could you do to reduce harmful noise?</Text>
      </View>

      <View style={[styles.discussionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.discussionHeading, { color: colors.text }]}>Curriculum Links</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• ACSSU020 – Sound is produced by vibrating objects</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• ACSIS231 – Collecting and recording data</Text>
      </View>

      <Pressable
        onPress={() => router.push('/result-history?activityKey=activity-two' as never)}
        style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.tint }, pressed && styles.buttonPressed]}
      >
        <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>Open Result History</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/leaderboard?activityKey=activity-two' as never)}
        style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.tint }, pressed && styles.buttonPressed]}
      >
        <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>View Leaderboard</Text>
      </Pressable>

      <Pressable
        onPress={clearTest}
        style={({ pressed }) => [styles.clearButton, { borderColor: colors.danger }, pressed && styles.buttonPressed]}
      >
        <Text style={[styles.secondaryButtonText, { color: colors.danger }]}>Clear Test</Text>
      </Pressable>

      {renderTabs()}
    </View>
  );

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Sound Pollution Hunter</Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Measure classroom sounds, compare dB levels, and save your result.
        </Text>
      </View>

      {activeTab === 'activity' && renderActivityTab()}
      {activeTab === 'writeup' && renderWriteUpTab()}
      {activeTab === 'discussion' && renderDiscussionTab()}
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
