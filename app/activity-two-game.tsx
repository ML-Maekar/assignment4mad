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
import { usePermissions } from '@/contexts/PermissionsContext';
import { saveAttempt } from '@/services/attemptService';
import { scheduleActivityCompleteNotification } from '@/utils/notifications';

type TabKey = 'activity' | 'writeup' | 'discussion';

type SoundResult = {
  id: number;
  actionName: string;
  locationName: string;
  maximumSoundDb: number;
  hearingRisk: string;
  hearingRiskMessage: string;
  prediction: string;
  wasCorrect: string;
};

type SoundRisk = {
  label: string;
  example: string;
  message: string;
};

const ACTIVITY_KEY = 'activity-two';
const ACTIVITY_TITLE = 'Sound Pollution Hunter';

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

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

export default function ActivityTwoGame() {
  const { colors } = useAppTheme();
  const { micGranted } = usePermissions();

  const recordingRef = useRef<Audio.Recording | null>(null);
  const actionNameRef = useRef('');
  const locationNameRef = useRef('');
  const predictionRef = useRef('');
  const wasCorrectRef = useRef('');
  const surprisesRef = useRef('');
  const earMuffAnswerRef = useRef('');
  const currentDbRef = useRef(0);
  const maxDbRef = useRef(0);

  const [activeTab, setActiveTab] = useState<TabKey>('activity');
  const [hasSystemPermission, setHasSystemPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [actionName, setActionName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [prediction, setPrediction] = useState('');
  const [wasCorrect, setWasCorrect] = useState('');
  const [surprises, setSurprises] = useState('');
  const [earMuffAnswer, setEarMuffAnswer] = useState('');

  const [currentDb, setCurrentDb] = useState(0);
  const [maxDb, setMaxDb] = useState(0);
  const [results, setResults] = useState<SoundResult[]>([]);
  const [savedResultId, setSavedResultId] = useState<number | null>(null);

  const displayedRisk = maxDb > 0 ? getSoundRisk(maxDb) : null;

  // Keep refs in sync with state for use inside callbacks
  useEffect(() => { actionNameRef.current = actionName; }, [actionName]);
  useEffect(() => { locationNameRef.current = locationName; }, [locationName]);
  useEffect(() => { predictionRef.current = prediction; }, [prediction]);
  useEffect(() => { wasCorrectRef.current = wasCorrect; }, [wasCorrect]);
  useEffect(() => { surprisesRef.current = surprises; }, [surprises]);
  useEffect(() => { earMuffAnswerRef.current = earMuffAnswer; }, [earMuffAnswer]);

  useEffect(() => {
    async function checkSystemPermission() {
      const permission = await Audio.requestPermissionsAsync();
      setHasSystemPermission(permission.granted);
    }
    checkSystemPermission();
  }, []);

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    if (!micGranted) {
      Alert.alert(
        'Microphone Disabled',
        'Microphone is turned off in Settings. Go to Settings → Permissions → Microphone to enable it.'
      );
      return;
    }

    if (!hasSystemPermission) {
      const permission = await Audio.requestPermissionsAsync();
      setHasSystemPermission(permission.granted);
      if (!permission.granted) {
        Alert.alert('Microphone Permission Needed', 'Please allow microphone access to record sound.');
        return;
      }
    }

    if (!actionName.trim()) {
      Alert.alert('Missing Action', 'Please enter the action or object tested.');
      return;
    }
    if (!locationName.trim()) {
      Alert.alert('Missing Location', 'Please enter where the sound was measured.');
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

      recording.setProgressUpdateInterval(250);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      console.log('Failed to start Activity 2 recording:', error);
      Alert.alert('Recording Failed', 'Could not start the sound recording.');
    }
  };

  const stopRecording = async () => {
    const recording = recordingRef.current;
    if (!recording) return;

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

      await scheduleActivityCompleteNotification(ACTIVITY_TITLE, finalDb);

      Alert.alert(
        'Sound Test Complete',
        `Maximum sound: ${finalDb.toFixed(1)} dB\nRisk: ${soundRisk.label}`,
        [
          {
            text: 'View Summary',
            onPress: () => router.push(`/result-summary?resultId=${savedId}` as never),
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

  const clearTest = () => {
    Alert.alert(
      'Clear Test?',
      'This will clear the current sound test from this screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setActionName('');
            setLocationName('');
            setPrediction('');
            setWasCorrect('');
            setSurprises('');
            setEarMuffAnswer('');
            setCurrentDb(0);
            setMaxDb(0);
            setSavedResultId(null);
            setResults([]);
            actionNameRef.current = '';
            locationNameRef.current = '';
            predictionRef.current = '';
            wasCorrectRef.current = '';
            surprisesRef.current = '';
            earMuffAnswerRef.current = '';
            currentDbRef.current = 0;
            maxDbRef.current = 0;
            setActiveTab('activity');
          },
        },
      ]
    );
  };

  const renderTabs = () => {
    const tabs: { key: TabKey; label: string }[] = [
      { key: 'activity', label: 'Activity' },
      { key: 'writeup', label: 'Write Up' },
      { key: 'discussion', label: 'Discussion' },
    ];

    return (
      <View style={[styles.bottomTabRow, { borderTopColor: colors.border }]}>
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [
                styles.bottomTabButton,
                { borderBottomColor: selected ? colors.tint : 'transparent' },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.bottomTabText, { color: selected ? colors.tint : colors.subtitle }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderActivityTab = () => (
    <View style={[styles.phoneLayoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

      {!micGranted && (
        <View style={[styles.warningBanner, { backgroundColor: `${colors.danger}15`, borderColor: colors.danger }]}>
          <Text style={[styles.warningText, { color: colors.danger }]}>
            ⚠️ Microphone is disabled. Go to Settings → Permissions → Microphone to enable recording.
          </Text>
        </View>
      )}

      <Text style={[styles.cardTitle, { color: colors.text }]}>Instructions</Text>

      <View style={[styles.instructionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.body, { color: colors.subtitle }]}>1. Position the phone about 30 cm from the sound source.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>2. Enter the action or object name and location below.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>3. Press Start Recording, make the sound, then press Stop.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>4. Try different actions: drop a pen, book, bottle, stamp feet, clap.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>5. Compare sounds — which was louder or softer than expected?</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>6. Rotate for each team member.</Text>
      </View>

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
            {
              backgroundColor: !micGranted
                ? colors.subtitle
                : isRecording
                  ? colors.danger
                  : colors.tint,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            {isSaving
              ? 'Saving...'
              : !micGranted
                ? 'Mic Disabled'
                : isRecording
                  ? 'Stop Recording'
                  : 'Start Recording'}
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

  const renderWriteUpTab = () => (
    <View style={[styles.phoneLayoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Write Up</Text>

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

      <Text style={[styles.label, { color: colors.text }]}>Results Table</Text>

      <View style={[styles.tableBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <View style={[styles.tableRow, { borderColor: colors.border }]}>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 2 }]}>Action / Object</Text>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>dB Level</Text>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>Risk</Text>
        </View>
        {results.length === 0 ? (
          <Text style={[styles.body, { color: colors.subtitle, padding: 10 }]}>
            Record sounds in the Activity tab to see results here.
          </Text>
        ) : (
          results.map((r) => (
            <View key={r.id} style={[styles.tableRow, { borderColor: colors.border }]}>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]} numberOfLines={2}>{r.actionName}</Text>
              <Text style={[styles.tableCell, { color: colors.success, flex: 1 }]}>{r.maximumSoundDb.toFixed(1)}</Text>
              <Text style={[styles.tableCell, { color: colors.subtitle, flex: 1 }]} numberOfLines={2}>{r.hearingRisk}</Text>
            </View>
          ))
        )}
      </View>

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

      {renderTabs()}
    </View>
  );

  const renderDiscussionTab = () => (
    <View style={[styles.phoneLayoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Discussion</Text>

      <View style={[styles.discussionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.discussionHeading, { color: colors.text }]}>What Is Sound Pollution?</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Sound pollution is unwanted or harmful sound. Loud sounds can affect hearing, concentration, communication, and comfort. Prolonged exposure to loud noise can permanently damage hearing.
        </Text>
      </View>

      <View style={[styles.discussionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.discussionHeading, { color: colors.text }]}>What the App Measures</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          The phone microphone estimates sound level in decibels (dB). The app records the maximum dB measured during the recording and compares it to known hearing risk thresholds.
        </Text>
        <View style={[styles.tableBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
          {[
            ['0–30 dB', 'Whisper, quiet library', 'No risk'],
            ['30–60 dB', 'Normal conversation, classroom noise', 'Safe for long periods'],
            ['60–85 dB', 'Busy traffic, vacuum cleaner', 'Generally safe, long exposure causes fatigue'],
            ['85–90 dB', 'Lawn mower, loud classroom', 'Hearing damage possible after long exposure'],
            ['90–100 dB', 'Motorbike, power tools, loud music', 'Hearing damage likely after short exposure'],
            ['100–110 dB', 'Nightclub, rock concert, chainsaw', 'Serious hearing damage in minutes'],
            ['110–120 dB', 'Siren close by, car horn at 1 m', 'Painful; immediate damage possible'],
            ['120–130 dB', 'Jet engine at close range', 'Immediate and severe hearing damage'],
            ['140+ dB', 'Explosion, gunshot', 'Instant, permanent hearing damage'],
          ].map(([range, example, risk]) => (
            <View key={range} style={[styles.tableRow, { borderColor: colors.border }]}>
              <Text style={[styles.tableRange, { color: colors.text }]}>{range}</Text>
              <Text style={[styles.tableText, { color: colors.subtitle }]}>
                {example} — {risk}
              </Text>
            </View>
          ))}
        </View>
      </View>

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
        style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.danger }, pressed && styles.buttonPressed]}
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
  phoneLayoutCard: { borderWidth: 2, borderRadius: 24, padding: 18, marginBottom: 16, minHeight: 620 },
  cardTitle: { fontSize: 20, fontWeight: '900', marginBottom: 12 },
  label: { fontSize: 15, fontWeight: '800', marginBottom: 8, marginTop: 4 },
  body: { fontSize: 15, lineHeight: 22 },
  warningBanner: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 14 },
  warningText: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  instructionBox: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 16, gap: 6 },
  bottomTabRow: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'center', borderTopWidth: 1, paddingTop: 12, gap: 4 },
  bottomTabButton: { paddingHorizontal: 6, paddingBottom: 4, borderBottomWidth: 2 },
  bottomTabText: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 12 },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  meterBox: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  meterLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  meterValue: { fontSize: 42, fontWeight: '900', marginBottom: 8 },
  tableBox: { borderWidth: 1, borderRadius: 14, marginBottom: 14, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 10, paddingVertical: 10 },
  tableHeader: { fontSize: 13, fontWeight: '900' },
  tableCell: { fontSize: 13, fontWeight: '600' },
  tableRange: { fontSize: 13, fontWeight: '900' },
  tableText: { marginTop: 3, fontSize: 13, lineHeight: 18 },
  button: { minHeight: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  secondaryButton: { minHeight: 48, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },
  buttonText: { fontSize: 16, fontWeight: '900' },
  secondaryButtonText: { fontSize: 15, fontWeight: '900' },
  savedText: { fontSize: 15, fontWeight: '900', textAlign: 'center', marginTop: 12 },
  resultsBox: { borderTopWidth: 1, paddingTop: 14, marginTop: 14 },
  resultBox: { borderTopWidth: 1, paddingTop: 12, marginTop: 14 },
  resultRow: { borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  resultTitle: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  score: { marginTop: 4, fontSize: 15, fontWeight: '900' },
  discussionBox: { borderWidth: 1, borderRadius: 16, padding:14, marginBottom: 12, gap: 6 },
  discussionHeading: { fontSize: 16, fontWeight: '900', marginBottom: 6 },
});