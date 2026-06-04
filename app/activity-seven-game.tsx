import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import {
  getMovementStrength,
  useSensorService,
} from '@/hooks/useSensorService';
import { saveAttempt } from '@/services/attemptService';
import { scheduleActivityCompleteNotification } from '@/utils/notifications';
import {
  getOfflineDraftByKey,
  parseOfflineDraftData,
  saveOfflineDraft,
} from '@/utils/offlineDraftsDb';

type BreathingMode = 'At Rest' | 'After Exercise 1' | 'After Exercise 2';

type Result = {
  id: number;
  mode: BreathingMode;
  breaths: number;
  breathsPerMinute: number;
  score: number;
};

type ActivitySevenDraftData = {
  mode?: BreathingMode;
};

const TEST_DURATION = 30;
const PEAK_THRESHOLD = 0.035;
const MIN_PEAK_GAP_MS = 1500;

const ACTIVITY_KEY = 'activity-seven';
const ACTIVITY_TITLE = 'Breathing Pace Trainer';
const DRAFT_KEY = 'activity-seven-breathing-draft';

function getBreathingTarget(mode: BreathingMode) {
  if (mode === 'At Rest') {
    return 12;
  }

  if (mode === 'After Exercise 1') {
    return 22;
  }

  return 28;
}

function calculateBreathingScore(mode: BreathingMode, breathsPerMinute: number) {
  const target = getBreathingTarget(mode);
  const difference = Math.abs(breathsPerMinute - target);
  const score = Math.round(100 - difference * 5);

  return Math.max(0, Math.min(100, score));
}

export default function ActivitySevenGame() {
  const { colors } = useAppTheme();
  const { startAccelerometer, stopAccelerometer, resetSensorData } =
    useSensorService();

  const [mode, setMode] = useState<BreathingMode>('At Rest');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [breaths, setBreaths] = useState(0);
  const [currentMotion, setCurrentMotion] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved' | 'error'>(
    'idle'
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousValueRef = useRef(0);
  const lastPeakTimeRef = useRef(0);
  const breathsRef = useRef(0);
  const modeRef = useRef<BreathingMode>('At Rest');
  const hasLoadedDraftRef = useRef(false);

  useEffect(() => {
    breathsRef.current = breaths;
  }, [breaths]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    async function loadDraft() {
      try {
        const draft = await getOfflineDraftByKey(DRAFT_KEY);
        const draftData = parseOfflineDraftData<ActivitySevenDraftData>(draft);

        if (
          draftData?.mode === 'At Rest' ||
          draftData?.mode === 'After Exercise 1' ||
          draftData?.mode === 'After Exercise 2'
        ) {
          setMode(draftData.mode);
          modeRef.current = draftData.mode;
          setDraftStatus('saved');
        }
      } catch (error) {
        console.log('Failed to load Activity 7 draft:', error);
        setDraftStatus('error');
      } finally {
        hasLoadedDraftRef.current = true;
      }
    }

    loadDraft();
  }, []);

  useEffect(() => {
    if (!hasLoadedDraftRef.current) {
      return;
    }

    async function saveModeDraft() {
      try {
        await saveOfflineDraft({
          draftKey: DRAFT_KEY,
          activityKey: ACTIVITY_KEY,
          activityTitle: ACTIVITY_TITLE,
          draftTitle: mode,
          data: {
            mode,
          },
        });

        setDraftStatus('saved');
      } catch (error) {
        console.log('Failed to save Activity 7 draft:', error);
        setDraftStatus('error');
      }
    }

    saveModeDraft();
  }, [mode]);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const finishTest = async () => {
    stopAccelerometer();
    stopTimer();
    setIsRunning(false);

    const finalBreaths = breathsRef.current;
    const selectedMode = modeRef.current;

    const breathsPerMinute = Math.round(finalBreaths * (60 / TEST_DURATION));
    const breathingScore = calculateBreathingScore(
      selectedMode,
      breathsPerMinute
    );

    const newResult: Result = {
      id: Date.now(),
      mode: selectedMode,
      breaths: finalBreaths,
      breathsPerMinute,
      score: breathingScore,
    };

    setResults((currentResults) => [newResult, ...currentResults]);

    try {
      const savedResultId = await saveAttempt({
        activityKey: ACTIVITY_KEY,
        activityTitle: ACTIVITY_TITLE,
        label: selectedMode,
        score: breathingScore,
        data: {
          mode: selectedMode,
          breaths: finalBreaths,
          breathsPerMinute,
          targetBreathsPerMinute: getBreathingTarget(selectedMode),
          breathingScore,
          testDurationSeconds: TEST_DURATION,
          sensorServiceUsed: true,
        },
      });

      void scheduleActivityCompleteNotification(
        ACTIVITY_TITLE,
        breathingScore
      );

      Alert.alert(
        'Breathing Test Complete',
        `${selectedMode}: ${breathsPerMinute} breaths per minute\nScore: ${breathingScore}/100`,
        [
          {
            text: 'View Summary',
            onPress: () => {
              router.push(`/result-summary?resultId=${savedResultId}` as never);
            },
          },
          {
            text: 'Stay Here',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.log('Failed to save breathing result:', error);

      Alert.alert(
        'Breathing Test Complete',
        `${selectedMode}: ${breathsPerMinute} breaths per minute\n\nThe result was shown on this screen, but it could not be saved to the local database.`
      );
    }
  };

  const startTest = () => {
    if (isRunning) {
      return;
    }

    Alert.alert(
      'Start Breathing Test?',
      'Place the phone gently on the chest or stomach. Stay still and breathe normally.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start',
          onPress: async () => {
            setTimeLeft(TEST_DURATION);
            setBreaths(0);
            setCurrentMotion(0);

            breathsRef.current = 0;
            previousValueRef.current = 0;
            lastPeakTimeRef.current = 0;
            resetSensorData();

            const started = await startAccelerometer({
              updateInterval: 200,
              onData: (data) => {
                const breathingMotion = getMovementStrength(data);
                setCurrentMotion(breathingMotion);

                const previousValue = previousValueRef.current;
                const now = Date.now();

                const crossedPeak =
                  previousValue < PEAK_THRESHOLD &&
                  breathingMotion >= PEAK_THRESHOLD;

                const enoughTimePassed =
                  now - lastPeakTimeRef.current > MIN_PEAK_GAP_MS;

                if (crossedPeak && enoughTimePassed) {
                  lastPeakTimeRef.current = now;

                  const updatedBreaths = breathsRef.current + 1;
                  breathsRef.current = updatedBreaths;
                  setBreaths(updatedBreaths);
                }

                previousValueRef.current = breathingMotion;
              },
            });

            if (!started) {
              Alert.alert(
                'Sensor Unavailable',
                'The accelerometer could not be started on this device.'
              );
              return;
            }

            setIsRunning(true);

            let remaining = TEST_DURATION;

            timerRef.current = setInterval(() => {
              remaining -= 1;
              setTimeLeft(remaining);

              if (remaining <= 0) {
                finishTest();
              }
            }, 1000);
          },
        },
      ]
    );
  };

  const resetResults = () => {
    Alert.alert(
      'Clear Breathing Results?',
      'This will remove the temporary breathing attempts from this screen. Saved SQLite leaderboard results will not be deleted here.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setResults([]),
        },
      ]
    );
  };

  const openLeaderboard = () => {
    router.push('/leaderboard?activityKey=activity-seven' as never);
  };

  useEffect(() => {
    return () => {
      stopAccelerometer();
      stopTimer();
    };
  }, []);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Breathing Trainer
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Compare breathing at rest and after exercise using phone movement.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Choose Test Type
        </Text>

        <View style={styles.modeColumn}>
          {(
            [
              'At Rest',
              'After Exercise 1',
              'After Exercise 2',
            ] as BreathingMode[]
          ).map((option) => (
            <Pressable
              key={option}
              onPress={() => setMode(option)}
              disabled={isRunning}
              style={[
                styles.modeButton,
                {
                  borderColor: mode === option ? colors.tint : colors.border,
                  backgroundColor:
                    mode === option ? `${colors.tint}20` : colors.background,
                },
              ]}
            >
              <Text style={[styles.modeText, { color: colors.text }]}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text
          style={[
            styles.draftStatus,
            {
              color:
                draftStatus === 'error'
                  ? colors.danger
                  : draftStatus === 'saved'
                    ? colors.success
                    : colors.subtitle,
            },
          ]}
        >
          {draftStatus === 'saved'
            ? 'Offline draft saved'
            : draftStatus === 'error'
              ? 'Draft save error'
              : 'Mode saves automatically'}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Breathing Measurement
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.subtitle }]}>
              Time Left
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {timeLeft}s
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.subtitle }]}>
              Breaths
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {breaths}
            </Text>
          </View>
        </View>

        <Text style={[styles.body, { color: colors.subtitle }]}>
          Current chest movement: {currentMotion.toFixed(3)}
        </Text>

        <Pressable
          onPress={startTest}
          disabled={isRunning}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: isRunning ? colors.subtitle : colors.tint },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            {isRunning ? 'Measuring...' : 'Start 30 Second Test'}
          </Text>
        </Pressable>

        <Pressable
          onPress={openLeaderboard}
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor: colors.tint },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>
            View Leaderboard
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Temporary Results
        </Text>

        {results.length === 0 ? (
          <Text style={[styles.body, { color: colors.subtitle }]}>
            No breathing results yet. Run a test at rest and after exercise.
          </Text>
        ) : (
          results.map((result) => (
            <View
              key={result.id}
              style={[styles.resultRow, { borderColor: colors.border }]}
            >
              <Text style={[styles.resultTitle, { color: colors.text }]}>
                {result.mode}
              </Text>
              <Text style={[styles.body, { color: colors.subtitle }]}>
                Breaths counted: {result.breaths}
              </Text>
              <Text style={[styles.score, { color: colors.success }]}>
                {result.breathsPerMinute} breaths/min
              </Text>
              <Text style={[styles.body, { color: colors.subtitle }]}>
                Score: {result.score}/100
              </Text>
            </View>
          ))
        )}

        {results.length > 0 && (
          <Pressable
            onPress={resetResults}
            style={({ pressed }) => [
              styles.clearButton,
              { borderColor: colors.danger },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.danger }]}>
              Clear Temporary Results
            </Text>
          </Pressable>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '900' },
  subtitle: { marginTop: 8, fontSize: 16, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 22 },
  modeColumn: { gap: 10 },
  modeButton: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  modeText: { fontSize: 15, fontWeight: '800' },
  draftStatus: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox: { flex: 1 },
  statLabel: { fontSize: 13, fontWeight: '700' },
  statValue: { marginTop: 4, fontSize: 28, fontWeight: '900' },
  button: {
    marginTop: 16,
    minHeight: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },
  buttonText: { fontSize: 16, fontWeight: '800' },
  resultRow: { borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  resultTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  score: { marginTop: 4, fontSize: 15, fontWeight: '900' },
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
  secondaryButtonText: { fontSize: 15, fontWeight: '800' },
});