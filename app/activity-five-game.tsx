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
  getSensorMagnitude,
  useSensorService,
} from '@/hooks/useSensorService';
import { saveActivityResult } from '@/utils/activityResultsDb';
import { scheduleActivityCompleteNotification } from '@/utils/notifications';

type Result = {
  id: number;
  attemptName: string;
  smoothnessScore: number;
  movementScore: number;
  averageChange: number;
};

const TEST_DURATION = 20;
const ACTIVITY_KEY = 'activity-five';
const ACTIVITY_TITLE = 'Human Performance Lab';

export default function ActivityFiveGame() {
  const { colors } = useAppTheme();
  const { startAccelerometer, stopAccelerometer, resetSensorData } =
    useSensorService();

  const [attemptNumber, setAttemptNumber] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [currentMotion, setCurrentMotion] = useState(0);
  const [motionChanges, setMotionChanges] = useState<number[]>([]);
  const [totalMovement, setTotalMovement] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  const previousMagnitudeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const motionChangesRef = useRef<number[]>([]);
  const totalMovementRef = useRef(0);
  const attemptNumberRef = useRef(1);

  useEffect(() => {
    attemptNumberRef.current = attemptNumber;
  }, [attemptNumber]);

  useEffect(() => {
    motionChangesRef.current = motionChanges;
  }, [motionChanges]);

  useEffect(() => {
    totalMovementRef.current = totalMovement;
  }, [totalMovement]);

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

    const finalChanges = motionChangesRef.current;
    const finalTotalMovement = totalMovementRef.current;

    const averageChange =
      finalChanges.length === 0
        ? 0
        : finalChanges.reduce((total, value) => total + value, 0) /
          finalChanges.length;

    const smoothnessScore = Math.max(
      0,
      Math.round(100 - averageChange * 350)
    );

    const movementScore = Math.min(100, Math.round(finalTotalMovement * 10));

    const attemptName = `Attempt ${attemptNumberRef.current}`;

    const newResult: Result = {
      id: Date.now(),
      attemptName,
      smoothnessScore,
      movementScore,
      averageChange,
    };

    setResults((currentResults) => [newResult, ...currentResults]);
    setAttemptNumber((current) => current + 1);

    try {
      const savedResultId = await saveActivityResult({
        activityKey: ACTIVITY_KEY,
        activityTitle: ACTIVITY_TITLE,
        label: attemptName,
        score: smoothnessScore,
        data: {
          smoothnessScore,
          movementScore,
          averageChange,
          totalMovement: finalTotalMovement,
          testDurationSeconds: TEST_DURATION,
          readingCount: finalChanges.length,
          sensorServiceUsed: true,
        },
      });

      void scheduleActivityCompleteNotification(
        ACTIVITY_TITLE,
        smoothnessScore
      );

      Alert.alert(
        'Performance Test Complete',
        `Smoothness score: ${smoothnessScore}/100`,
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
      console.log('Failed to save performance result:', error);

      Alert.alert(
        'Result Calculated',
        `Smoothness score: ${smoothnessScore}/100\n\nThe result was shown on this screen, but it could not be saved to the local database.`
      );
    }
  };

  const startTest = () => {
    if (isRunning) {
      return;
    }

    Alert.alert(
      'Start Performance Lab?',
      'Hold the phone firmly and perform the guided movement smoothly for 20 seconds.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start',
          onPress: async () => {
            setTimeLeft(TEST_DURATION);
            setMotionChanges([]);
            setTotalMovement(0);
            setCurrentMotion(0);

            motionChangesRef.current = [];
            totalMovementRef.current = 0;
            previousMagnitudeRef.current = null;
            resetSensorData();

            const started = await startAccelerometer({
              updateInterval: 120,
              onData: (data) => {
                const magnitude = getSensorMagnitude(data);
                const previous = previousMagnitudeRef.current;

                if (previous !== null) {
                  const change = Math.abs(magnitude - previous);

                  setCurrentMotion(change);

                  const updatedTotal = totalMovementRef.current + change;
                  totalMovementRef.current = updatedTotal;
                  setTotalMovement(updatedTotal);

                  const updatedChanges = [
                    ...motionChangesRef.current,
                    change,
                  ];
                  motionChangesRef.current = updatedChanges;
                  setMotionChanges(updatedChanges);
                }

                previousMagnitudeRef.current = magnitude;
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
      'Clear Performance Results?',
      'This will remove the temporary attempts from this screen. Saved SQLite leaderboard results will not be deleted here.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setResults([]);
            setAttemptNumber(1);
            attemptNumberRef.current = 1;
          },
        },
      ]
    );
  };

  const openLeaderboard = () => {
    router.push('/leaderboard?activityKey=activity-five' as never);
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
          Performance Lab
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Move smoothly while holding the phone. The app measures motion changes
          to estimate control and smoothness.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Movement Test
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
              Motion Change
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {currentMotion.toFixed(3)}
            </Text>
          </View>
        </View>

        <Text style={[styles.body, { color: colors.subtitle }]}>
          Goal: move with control. Smaller sudden changes create a better
          smoothness score.
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
            {isRunning ? 'Measuring...' : 'Start 20 Second Test'}
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
          Temporary Attempts
        </Text>

        {results.length === 0 ? (
          <Text style={[styles.body, { color: colors.subtitle }]}>
            No attempts yet. Start the movement test to record results.
          </Text>
        ) : (
          results.map((result) => (
            <View
              key={result.id}
              style={[styles.resultRow, { borderColor: colors.border }]}
            >
              <Text style={[styles.resultTitle, { color: colors.text }]}>
                {result.attemptName}
              </Text>
              <Text style={[styles.score, { color: colors.success }]}>
                Smoothness: {result.smoothnessScore}/100
              </Text>
              <Text style={[styles.body, { color: colors.subtitle }]}>
                Movement score: {result.movementScore}/100
              </Text>
              <Text style={[styles.body, { color: colors.subtitle }]}>
                Average motion change: {result.averageChange.toFixed(3)}
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
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox: { flex: 1 },
  statLabel: { fontSize: 13, fontWeight: '700' },
  statValue: { marginTop: 4, fontSize: 24, fontWeight: '900' },
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