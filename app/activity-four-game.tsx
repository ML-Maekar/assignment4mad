import { router } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
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
import { saveActivityResult } from '@/utils/activityResultsDb';

type Result = {
  id: number;
  designName: string;
  maxMovement: number;
  averageMovement: number;
  stabilityScore: number;
};

const TEST_DURATION = 10;

export default function ActivityFourGame() {
  const { colors } = useAppTheme();

  const [designName, setDesignName] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [currentMovement, setCurrentMovement] = useState(0);
  const [readings, setReadings] = useState<number[]>([]);
  const [results, setResults] = useState<Result[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const readingsRef = useRef<number[]>([]);
  const resultsCountRef = useRef(0);
  const designNameRef = useRef('');

  useEffect(() => {
    readingsRef.current = readings;
  }, [readings]);

  useEffect(() => {
    resultsCountRef.current = results.length;
  }, [results]);

  useEffect(() => {
    designNameRef.current = designName;
  }, [designName]);

  const stopSensor = () => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const finishTest = async () => {
    stopSensor();
    stopTimer();
    setIsRunning(false);

    const finalReadings = readingsRef.current;

    if (finalReadings.length === 0) {
      Alert.alert(
        'No Movement Data',
        'No sensor readings were collected. Please try the test again.'
      );
      return;
    }

    const maxMovement = Math.max(...finalReadings);
    const averageMovement =
      finalReadings.reduce((total, value) => total + value, 0) /
      finalReadings.length;

    const stabilityScore = Math.max(
      0,
      Math.round(100 - averageMovement * 120)
    );

    const finalDesignName =
      designNameRef.current.trim() || `Design ${resultsCountRef.current + 1}`;

    const newResult: Result = {
      id: Date.now(),
      designName: finalDesignName,
      maxMovement,
      averageMovement,
      stabilityScore,
    };

    setResults((currentResults) => [newResult, ...currentResults]);

    try {
      const savedResultId = await saveActivityResult({
        activityKey: 'activity-four',
        activityTitle: 'Earthquake-Resistant Structure',
        label: finalDesignName,
        score: stabilityScore,
        data: {
          maxMovement,
          averageMovement,
          testDurationSeconds: TEST_DURATION,
          readingCount: finalReadings.length,
        },
      });

      Alert.alert(
        'Earthquake Test Complete',
        `Stability score: ${stabilityScore}/100`,
        [
          {
            text: 'View Summary',
            onPress: () => {
              router.push(
                `/result-summary?resultId=${savedResultId}` as never
              );
            },
          },
        ]
      );
    } catch (error) {
      console.log('Failed to save earthquake result:', error);

      Alert.alert(
        'Result Calculated',
        `Stability score: ${stabilityScore}/100\n\nThe result was shown on this screen, but it could not be saved to the local database.`
      );
    }
  };

  const startTest = () => {
    if (isRunning) {
      return;
    }

    Alert.alert(
      'Start Earthquake Test?',
      'Place the phone safely in the centre of your structure before starting.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start',
          onPress: () => {
            readingsRef.current = [];
            setReadings([]);
            setCurrentMovement(0);
            setTimeLeft(TEST_DURATION);
            setIsRunning(true);

            Accelerometer.setUpdateInterval(150);

            subscriptionRef.current = Accelerometer.addListener((data) => {
              const magnitude = Math.sqrt(
                data.x * data.x + data.y * data.y + data.z * data.z
              );

              const movement = Math.abs(magnitude - 1);

              setCurrentMovement(movement);

              readingsRef.current = [...readingsRef.current, movement];
              setReadings(readingsRef.current);
            });

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
      'Clear Results?',
      'This will remove the temporary earthquake test attempts from this screen. Saved SQLite leaderboard results will not be deleted here.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setResults([]);
          },
        },
      ]
    );
  };

  const openLeaderboard = () => {
    router.push('/leaderboard?activityKey=activity-four' as never);
  };

  useEffect(() => {
    return () => {
      stopSensor();
      stopTimer();
    };
  }, []);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Earthquake Test
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Build a structure, place the phone on top, then measure how much it
          moves during vibration.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Structure Design
        </Text>

        <TextInput
          value={designName}
          onChangeText={setDesignName}
          placeholder="Example: 10 folds + 4 pillars"
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
              Movement
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {currentMovement.toFixed(3)}g
            </Text>
          </View>
        </View>

        <Pressable
          onPress={startTest}
          disabled={isRunning}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: isRunning ? colors.subtitle : colors.tint,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            {isRunning ? 'Testing...' : 'Start 10 Second Test'}
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
            No attempts yet. Run a test to compare structure stability.
          </Text>
        ) : (
          results.map((result) => (
            <View
              key={result.id}
              style={[styles.resultRow, { borderColor: colors.border }]}
            >
              <Text style={[styles.resultTitle, { color: colors.text }]}>
                {result.designName}
              </Text>
              <Text style={[styles.body, { color: colors.subtitle }]}>
                Max movement: {result.maxMovement.toFixed(3)}g
              </Text>
              <Text style={[styles.body, { color: colors.subtitle }]}>
                Average movement: {result.averageMovement.toFixed(3)}g
              </Text>
              <Text style={[styles.score, { color: colors.success }]}>
                Stability score: {result.stabilityScore}/100
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
    fontWeight: '800',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  statValue: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '900',
  },
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
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  resultRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  score: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '900',
  },
});