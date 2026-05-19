import { Accelerometer } from 'expo-sensors';
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

type BreathingMode = 'At Rest' | 'After Exercise 1' | 'After Exercise 2';

type Result = {
  id: number;
  mode: BreathingMode;
  breaths: number;
  breathsPerMinute: number;
};

const TEST_DURATION = 30;
const PEAK_THRESHOLD = 0.035;
const MIN_PEAK_GAP_MS = 1500;

export default function ActivitySevenGame() {
  const { colors } = useAppTheme();

  const [mode, setMode] = useState<BreathingMode>('At Rest');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [breaths, setBreaths] = useState(0);
  const [currentMotion, setCurrentMotion] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousValueRef = useRef(0);
  const lastPeakTimeRef = useRef(0);

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

  const finishTest = () => {
    stopSensor();
    stopTimer();
    setIsRunning(false);

    setBreaths((currentBreaths) => {
      const breathsPerMinute = Math.round(
        currentBreaths * (60 / TEST_DURATION)
      );

      const newResult: Result = {
        id: Date.now(),
        mode,
        breaths: currentBreaths,
        breathsPerMinute,
      };

      setResults((currentResults) => [newResult, ...currentResults]);

      Alert.alert(
        'Breathing Test Complete',
        `${mode}: ${breathsPerMinute} breaths per minute`
      );

      return currentBreaths;
    });
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
          onPress: () => {
            setIsRunning(true);
            setTimeLeft(TEST_DURATION);
            setBreaths(0);
            setCurrentMotion(0);
            previousValueRef.current = 0;
            lastPeakTimeRef.current = 0;

            Accelerometer.setUpdateInterval(200);

            subscriptionRef.current = Accelerometer.addListener((data) => {
              const magnitude = Math.sqrt(
                data.x * data.x + data.y * data.y + data.z * data.z
              );

              const breathingMotion = Math.abs(magnitude - 1);
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
                setBreaths((currentBreaths) => currentBreaths + 1);
              }

              previousValueRef.current = breathingMotion;
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
      'Clear Breathing Results?',
      'This will remove all breathing attempts from this screen.',
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
          {(['At Rest', 'After Exercise 1', 'After Exercise 2'] as BreathingMode[]).map(
            (option) => (
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
            )
          )}
        </View>
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
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Results
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
            </View>
          ))
        )}

        {results.length > 0 && (
          <Pressable
            onPress={resetResults}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: colors.danger },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.danger }]}>
              Clear Results
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
    marginTop: 14,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '800' },
});