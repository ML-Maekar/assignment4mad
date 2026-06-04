import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  getSensorMagnitude,
  useSensorService,
} from '@/hooks/useSensorService';
import { saveAttempt } from '@/services/attemptService';
import { scheduleActivityCompleteNotification } from '@/utils/notifications';
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

type TabKey = 'activity' | 'writeup' | 'discussion';

type MovementType = 'circular' | 'updown' | 'leftright';

type Result = {
  id: number;
  attemptName: string;
  movementType: MovementType;
  smoothnessScore: number;
  movementScore: number;
  averageChange: number;
};

const TEST_DURATION = 20;
const ACTIVITY_KEY = 'activity-five';
const ACTIVITY_TITLE = 'Human Performance Lab';

const MOVEMENT_OPTIONS: {
  key: MovementType;
  label: string;
  emoji: string;
  instruction: string;
  diagram: string;
} [] = [
  {
    key: 'circular',
    label: 'Movement 1 — Circular',
    emoji: '🔄',
    instruction:
      'Hold the phone firmly. Move your hand in slow, wide circles. ⚠️ DO NOT do this fast. Keep it smooth and controlled.',
    diagram: '← ↑ → ↓ (circular path)',
  },
  {
    key: 'updown',
    label: 'Movement 2 — Up & Down',
    emoji: '↕️',
    instruction:
      'Hold the phone firmly. Slowly raise your hand up, then lower it back down. ⚠️ DO NOT do this fast. Keep it smooth and steady.',
    diagram: '↑ then ↓ (vertical path)',
  },
  {
    key: 'leftright',
    label: 'Movement 3 — Left & Right',
    emoji: '↔️',
    instruction:
      'Hold the phone firmly. Slowly move your hand to the left, then back to the right. ⚠️ DO NOT do this fast. Stay in control.',
    diagram: '← then → (horizontal path)',
  },
];

export default function ActivityFiveGame() {
  const { colors } = useAppTheme();
  const { motionGranted, enableMotion } = usePermissions();
  const { startAccelerometer, stopAccelerometer, resetSensorData } =
    useSensorService();

  const [activeTab, setActiveTab] = useState<TabKey>('activity');
  const [selectedMovement, setSelectedMovement] =
    useState<MovementType>('circular');

  const [attemptNumber, setAttemptNumber] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [currentMotion, setCurrentMotion] = useState(0);
  const [motionChanges, setMotionChanges] = useState<number[]>([]);
  const [totalMovement, setTotalMovement] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  // Write-up state
  const [prediction, setPrediction] = useState('');
  const [hardestMovement, setHardestMovement] = useState('');
  const [wasCorrect, setWasCorrect] = useState('');
  const [surprises, setSurprises] = useState('');

  const previousMagnitudeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const motionChangesRef = useRef<number[]>([]);
  const totalMovementRef = useRef(0);
  const attemptNumberRef = useRef(1);
  const selectedMovementRef = useRef<MovementType>('circular');

  useEffect(() => {
    attemptNumberRef.current = attemptNumber;
  }, [attemptNumber]);

  useEffect(() => {
    motionChangesRef.current = motionChanges;
  }, [motionChanges]);

  useEffect(() => {
    totalMovementRef.current = totalMovement;
  }, [totalMovement]);

  useEffect(() => {
    selectedMovementRef.current = selectedMovement;
  }, [selectedMovement]);

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
    const finalMovement = selectedMovementRef.current;

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

    const movementLabel =
      MOVEMENT_OPTIONS.find((m) => m.key === finalMovement)?.label ??
      finalMovement;

    const attemptName = `Attempt ${attemptNumberRef.current} — ${movementLabel}`;

    const newResult: Result = {
      id: Date.now(),
      attemptName,
      movementType: finalMovement,
      smoothnessScore,
      movementScore,
      averageChange,
    };

    setResults((currentResults) => [newResult, ...currentResults]);
    setAttemptNumber((current) => current + 1);

    try {
      const savedResultId = await saveAttempt({
        activityKey: ACTIVITY_KEY,
        activityTitle: ACTIVITY_TITLE,
        label: attemptName,
        score: smoothnessScore,
        data: {
          movementType: finalMovement,
          smoothnessScore,
          movementScore,
          averageChange,
          totalMovement: finalTotalMovement,
          testDurationSeconds: TEST_DURATION,
          readingCount: finalChanges.length,
          prediction: prediction.trim(),
          hardestMovement: hardestMovement.trim(),
          wasCorrect: wasCorrect.trim(),
          surprises: surprises.trim(),
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
        `Smoothness score: ${smoothnessScore}/100\n\nThe result was shown but could not be saved.`
      );
    }
  };

  const startTest = () => {
    if (isRunning) {
      return;
    }

    const movementOption = MOVEMENT_OPTIONS.find(
      (m) => m.key === selectedMovement
    );

    Alert.alert(
      `Start ${movementOption?.label ?? 'Movement Test'}?`,
      `${movementOption?.instruction ?? ''}\n\nHold firmly and move slowly for 20 seconds.`,
      [
        { text: 'Cancel', style: 'cancel' },
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
      'Clear Results?',
      'This will remove temporary results from this screen.',
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
                {
                  borderBottomColor: selected ? colors.tint : 'transparent',
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.bottomTabText,
                  { color: selected ? colors.tint : colors.subtitle },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  // ─── Activity Tab ─────────────────────────────────────────────
  const renderActivityTab = () => (
    <View
      style={[
        styles.phoneLayoutCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Warning banner */}
      <View
        style={[
          styles.warningBox,
          { backgroundColor: `${colors.danger}18`, borderColor: colors.danger },
        ]}
      >
        <Text style={[styles.warningText, { color: colors.danger }]}>
          ⚠️ DO NOT do any movement fast. Always move slowly and smoothly.
          Fast movements can hurt your results and your wrist.
        </Text>
      </View>

      {/* Instructions */}
      <Text style={[styles.cardTitle, { color: colors.text }]}>
        Instructions
      </Text>

      <View
        style={[
          styles.instructionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.body, { color: colors.subtitle }]}>
          1. Hold the phone firmly in one hand.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          2. Choose a movement type below.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          3. Read the movement instruction carefully before starting.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          4. Press Start and perform the movement smoothly for 20 seconds.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          5. Lower vibration = better smoothness score.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          6. Rotate for each team member and try all 3 movement types.
        </Text>
      </View>

      {/* Movement selector */}
      <Text style={[styles.label, { color: colors.text }]}>
        Choose Movement Type
      </Text>

      <View style={styles.movementGrid}>
        {MOVEMENT_OPTIONS.map((option) => {
          const selected = selectedMovement === option.key;

          return (
            <Pressable
              key={option.key}
              onPress={() => setSelectedMovement(option.key)}
              disabled={isRunning}
              style={[
                styles.movementButton,
                {
                  borderColor: selected ? colors.tint : colors.border,
                  backgroundColor: selected
                    ? `${colors.tint}20`
                    : colors.background,
                },
              ]}
            >
              <Text style={styles.movementEmoji}>{option.emoji}</Text>
              <Text
                style={[
                  styles.movementLabel,
                  { color: selected ? colors.tint : colors.text },
                ]}
              >
                {option.label}
              </Text>
              <Text style={[styles.movementDiagram, { color: colors.subtitle }]}>
                {option.diagram}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Current movement instruction */}
      {(() => {
        const current = MOVEMENT_OPTIONS.find(
          (m) => m.key === selectedMovement
        );

        return current ? (
          <View
            style={[
              styles.instructionBox,
              {
                backgroundColor: `${colors.tint}10`,
                borderColor: colors.tint,
              },
            ]}
          >
            <Text style={[styles.body, { color: colors.text }]}>
              {current.instruction}
            </Text>
          </View>
        ) : null;
      })()}

      {/* Stats */}
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

      {/* Results */}
      {results.length > 0 && (
        <View style={[styles.resultsBox, { borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Session Results
          </Text>

          {results.map((result) => (
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
                Avg motion change: {result.averageChange.toFixed(3)}
              </Text>
            </View>
          ))}

          <Pressable
            onPress={resetResults}
            style={({ pressed }) => [
              styles.clearButton,
              { borderColor: colors.danger },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text
              style={[styles.secondaryButtonText, { color: colors.danger }]}
            >
              Clear Results
            </Text>
          </Pressable>
        </View>
      )}

      {renderTabs()}
    </View>
  );

  // ─── Write-up Tab ─────────────────────────────────────────────
  const renderWriteUpTab = () => (
    <View
      style={[
        styles.phoneLayoutCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>Write Up</Text>

      <Text style={[styles.body, { color: colors.subtitle }]}>
        Complete this on paper or use the fields below to record your results.
        Rotate for each team member.
      </Text>

      <Text style={[styles.label, { color: colors.text }]}>
        Predict the phone vibration for each movement
      </Text>

      <TextInput
        value={prediction}
        onChangeText={setPrediction}
        placeholder="e.g. Circular movement will have the highest vibration"
        placeholderTextColor={colors.subtitle}
        multiline
        style={[
          styles.input,
          styles.multilineInput,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      />

      {/* Results table */}
      <Text style={[styles.label, { color: colors.text }]}>
        Results Table
      </Text>

      <View
        style={[
          styles.tableBox,
          { borderColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <View style={[styles.tableRow, { borderColor: colors.border }]}>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 2 }]}>
            Attempt
          </Text>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>
            Vibration
          </Text>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>
            Score
          </Text>
        </View>

        {results.length === 0 ? (
          <Text style={[styles.body, { color: colors.subtitle, padding: 10 }]}>
            Run tests in the Activity tab to see results here.
          </Text>
        ) : (
          results.map((result) => (
            <View
              key={result.id}
              style={[styles.tableRow, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.tableCell, { color: colors.text, flex: 2 }]}
                numberOfLines={2}
              >
                {result.attemptName}
              </Text>
              <Text
                style={[styles.tableCell, { color: colors.subtitle, flex: 1 }]}
              >
                {result.averageChange.toFixed(3)}
              </Text>
              <Text
                style={[styles.tableCell, { color: colors.success, flex: 1 }]}
              >
                {result.smoothnessScore}/100
              </Text>
            </View>
          ))
        )}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>
        Which movement was hardest to keep vibration low?
      </Text>

      <TextInput
        value={hardestMovement}
        onChangeText={setHardestMovement}
        placeholder="e.g. Circular was the hardest to control"
        placeholderTextColor={colors.subtitle}
        multiline
        style={[
          styles.input,
          styles.multilineInput,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      />

      <Text style={[styles.label, { color: colors.text }]}>
        Were you right?
      </Text>

      <TextInput
        value={wasCorrect}
        onChangeText={setWasCorrect}
        placeholder="Did your prediction match the results?"
        placeholderTextColor={colors.subtitle}
        multiline
        style={[
          styles.input,
          styles.multilineInput,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      />

      <Text style={[styles.label, { color: colors.text }]}>
        Any surprises?
      </Text>

      <TextInput
        value={surprises}
        onChangeText={setSurprises}
        placeholder="e.g. Faster movements had the same vibration as slow ones"
        placeholderTextColor={colors.subtitle}
        multiline
        style={[
          styles.input,
          styles.multilineInput,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      />

      {renderTabs()}
    </View>
  );

  // ─── Discussion Tab ───────────────────────────────────────────
  const renderDiscussionTab = () => (
    <View
      style={[
        styles.phoneLayoutCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>
        Discussion
      </Text>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          How the Body Moves
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Muscles and joints work together to create smooth, controlled
          movement. When you move slowly and deliberately, your brain sends
          steady signals to your muscles, resulting in lower vibration.
        </Text>
      </View>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          Speed vs Control
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Faster movements often reduce control. When you rush, your muscles
          overcorrect, causing sudden changes in direction that the phone
          detects as vibration. Smoother movements show better coordination
          and neuromuscular control.
        </Text>
      </View>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          What the App Measures
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          The phone accelerometer measures changes in motion magnitude over
          time. A lower average change means fewer sudden jerks — which means
          a higher smoothness score. This is similar to how physiotherapists
          measure movement quality in patients.
        </Text>
      </View>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          Biomechanics and Fatigue
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          As muscles fatigue, movement becomes less controlled. Try comparing
          your first attempt to your last — do you notice a difference in the
          vibration score? This is biomechanics in action.
        </Text>
      </View>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          Think About This
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • Which movement type was smoothest for you?
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • Did your dominant hand perform better?
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • Did results improve with practice?
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • How does age or fitness affect smoothness?
        </Text>
      </View>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          Curriculum Links
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • ACPPS051 – Movement skills and coordination
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • ACPPS054 – Physical performance and fitness
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • ACSSU176 – Structure and function of body systems
        </Text>
      </View>

      {renderTabs()}
    </View>
  );

  // ─── Main render ──────────────────────────────────────────────
  // Sensor permission gate — show blocked screen if motion is off
if (!motionGranted) {
  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {ACTIVITY_TITLE}
        </Text>
      </View>

      <View
        style={[
          styles.phoneLayoutCard,  // use whichever card style exists in each file
          {
            backgroundColor: colors.card,
            borderColor: colors.danger,
          },
        ]}
      >
        <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>
          📵
        </Text>

        <Text
          style={{
            fontSize: 20,
            fontWeight: '900',
            color: colors.text,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Motion Sensors Blocked
        </Text>

        <Text
          style={{
            fontSize: 15,
            lineHeight: 22,
            color: colors.subtitle,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          This activity requires the accelerometer to measure movement. Please
          enable Motion Sensors in Settings to continue.
        </Text>

        <Pressable
          onPress={async () => {
            await enableMotion();
          }}
          style={{
            minHeight: 56,
            borderRadius: 18,
            backgroundColor: colors.tint,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text
            style={{ fontSize: 16, fontWeight: '900', color: colors.buttonText }}
          >
            Enable Motion Sensors
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/(tabs)/setting' as never)}
          style={{
            minHeight: 52,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.tint,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '900', color: colors.tint }}>
            Open Settings
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}
  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Human Performance Lab
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Measure movement smoothness and body control using the phone sensor.
          Always move slowly and with control.
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
  cardTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  label: { fontSize: 15, fontWeight: '800', marginBottom: 8, marginTop: 4 },
  body: { fontSize: 15, lineHeight: 22 },
  warningBox: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  instructionBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  movementGrid: {
    gap: 10,
    marginBottom: 14,
  },
  movementButton: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  movementEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  movementLabel: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  movementDiagram: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
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
  buttonText: { fontSize: 16, fontWeight: '800' },
  secondaryButtonText: { fontSize: 15, fontWeight: '800' },
  resultsBox: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 14,
  },
  resultRow: { borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  resultTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  score: { marginTop: 4, fontSize: 15, fontWeight: '900' },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    marginBottom: 8,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  tableBox: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tableHeader: {
    fontSize: 13,
    fontWeight: '900',
  },
  tableCell: {
    fontSize: 13,
    fontWeight: '600',
  },
  discussionBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  discussionHeading: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  bottomTabRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 4,
  },
  bottomTabButton: {
    paddingHorizontal: 6,
    paddingBottom: 4,
    borderBottomWidth: 2,
  },
  bottomTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
});