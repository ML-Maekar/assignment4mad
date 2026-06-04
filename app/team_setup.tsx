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
import {
  deleteOfflineDraftByKey,
  getOfflineDraftByKey,
  parseOfflineDraftData,
  saveOfflineDraft,
} from '@/utils/offlineDraftsDb';

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

type ActivityTwoDraftData = {
  actionName?: string;
  locationName?: string;
  prediction?: string;
  wasCorrect?: string;
  surprises?: string;
  earMuffAnswer?: string;
};

type SoundRisk = {
  label: string;
  example: string;
  message: string;
};

const ACTIVITY_KEY = 'activity-two';
const ACTIVITY_TITLE = 'Sound Pollution Hunter';
const DRAFT_KEY = 'activity-two-sound-draft';

const RISK_TABLE = [
  { range: '0–30 dB', example: 'Whisper, quiet library', risk: 'No risk' },
  { range: '30–60 dB', example: 'Normal conversation, classroom noise', risk: 'Safe for long periods' },
  { range: '60–85 dB', example: 'Busy traffic, vacuum cleaner', risk: 'Generally safe, but long exposure can cause fatigue' },
  { range: '85–90 dB', example: 'Lawn mower, loud classroom, heavy traffic', risk: 'Hearing damage possible after long exposure' },
  { range: '90–100 dB', example: 'Motorbike, power tools, loud music', risk: 'Hearing damage likely after short exposure' },
  { range: '100–110 dB', example: 'Nightclub, rock concert, chainsaw', risk: 'Serious hearing damage in minutes' },
  { range: '110–120 dB', example: 'Siren close by, car horn at 1 m', risk: 'Painful; immediate damage possible' },
  { range: '120–130 dB', example: 'Jet engine close', risk: 'Immediate and severe hearing damage' },
  { range: '140+ dB', example: 'Explosion, gunshot', risk: 'Instant, permanent hearing damage' },
];

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
  const { micGranted, askForMic } = usePermissions();

  const [activeTab, setActiveTab] = useState<TabKey>('activity');
  const [hasPermission, setHasPermission] = useState(false);
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
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const recordingRef = useRef<Audio.Recording | null>(null);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedDraftRef = useRef(false);
  const actionNameRef = useRef('');
  const locationNameRef = useRef('');
  const predictionRef = useRef('');
  const wasCorrectRef = useRef('');
  const surprisesRef = useRef('');
  const earMuffAnswerRef = useRef('');
  const maxDbRef = useRef(0);
  const currentDbRef = useRef(0);

  useEffect(() => { actionNameRef.current = actionName; }, [actionName]);
  useEffect(() => { locationNameRef.current = locationName; }, [locationName]);
  useEffect(() => { predictionRef.current = prediction; }, [prediction]);
  useEffect(() => { wasCorrectRef.current = wasCorrect; }, [wasCorrect]);
  useEffect(() => { surprisesRef.current = surprises; }, [surprises]);
  useEffect(() => { earMuffAnswerRef.current = earMuffAnswer; }, [earMuffAnswer]);
  useEffect(() => { maxDbRef.current = maxDb; }, [maxDb]);
  useEffect(() => { currentDbRef.current = currentDb; }, [currentDb]);

  useEffect(() => {
    async function requestPermission() {
      const permission = await Audio.requestPermissionsAsync();
      setHasPermission(permission.granted);
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

  const startRecording = async () => {
    if (isRecording || isSaving) return;

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
            setActionName(''); setLocationName(''); setPrediction('');
            setWasCorrect(''); setSurprises(''); setEarMuffAnswer('');
            setCurrentDb(0); setMaxDb(0);
            setSavedResultId(null); setResults([]);
            actionNameRef.current = ''; locationNameRef.current = '';
            predictionRef.current = ''; wasCorrectRef.current = '';
            surprisesRef.current = ''; earMuffAnswerRef.current = '';
            currentDbRef.current = 0; maxDbRef.current = 0;
            setActiveTab('activity');
          },
        },
      ]
    );
  };

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, []);

  // ─── Tab renderer ─────────────────────────────────────────────
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

  // ─── Activity Tab ──────────────────────────────────────────────
  const renderActivityTab = () => (
    <View style={[styles.phoneLayoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

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

      <View style={styles.draftRow}>
        <Text
          style={[
            styles.draftStatus,
            {
              color: draftStatus === 'error'
                ? colors.danger
                : draftStatus === 'saved'
                  ? colors.success
                  : colors.subtitle,
            },
          ]}
        >
          {draftStatus === 'saved' ? 'Offline draft saved' : draftStatus === 'error' ? 'Draft save error' : 'Draft saves automatically'}
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

  // ─── Write-up Tab ──────────────────────────────────────────────
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
        {draftStatus === 'saved' ? '✓ Write-up draft saved automatically' : 'Write-up saves automatically'}
      </Text>

      {renderTabs()}
    </View>
  );

  // ─── Discussion Tab ────────────────────────────────────────────
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
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Hearing Risk Table</Text>

      {RISK_TABLE.map((row) => (
        <View
          key={row.range}
          style={[styles.riskRow, { backgroundColor: colors.background, borderColor: colors.border }]}
        >
          <Text style={[styles.riskRange, { color: colors.text }]}>{row.range}</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>{row.example}</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>{row.risk}</Text>
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
  phoneLayoutCard: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    minHeight: 620,
  },
  cardTitle: { fontSize: 20, fontWeight: '900', marginBottom: 12 },
  label: { fontSize: 15, fontWeight: '800', marginBottom: 8, marginTop: 4 },
  body: { fontSize: 15, lineHeight: 22 },
  warningBox: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  warningText: { fontSize: 14, fontWeight: '800', lineHeight: 20 },
  instructionBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    marginBottom: 8,
  },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  draftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  draftStatus: { flex: 1, fontSize: 13, fontWeight: '700' },
  clearDraftText: { fontSize: 13, fontWeight: '900' },
  meterBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  meterLabel: { fontSize: 14, fontWeight: '700' },
  meterValue: { marginTop: 6, fontSize: 42, fontWeight: '900' },
  button: {
    minHeight: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },
  buttonText: { fontSize: 16, fontWeight: '900' },
  secondaryButtonText: { fontSize: 15, fontWeight: '900' },
  savedText: { fontSize: 15, fontWeight: '900', textAlign: 'center', marginTop: 12 },
  resultsBox: { borderTopWidth: 1, paddingTop: 14, marginTop: 14 },
  resultBox: { borderTopWidth: 1, paddingTop: 12, marginTop: 14 },
  resultRow: { borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  resultTitle: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  score: { marginTop: 4, fontSize: 15, fontWeight: '900' },
  tableBox: {
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tableHeader: { fontSize: 13, fontWeight: '900' },
  tableCell: { fontSize: 13, fontWeight: '600' },
  discussionBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  discussionHeading: { fontSize: 16, fontWeight: '900', marginBottom: 6 },
  riskRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  riskRange: { fontSize: 15, fontWeight: '900', marginBottom: 4 },
  bottomTabRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 4,
  },
  bottomTabButton: { paddingHorizontal: 6, paddingBottom: 4, borderBottomWidth: 2 },
  bottomTabText: { fontSize: 13, fontWeight: '700' },
});