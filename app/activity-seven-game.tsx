import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { usePermissions } from '@/contexts/PermissionsContext';
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
  prediction?: string;
  wasCorrect?: string;
  surprises?: string;
};

const TEST_DURATION = 30;
const PEAK_THRESHOLD = 0.035;
const MIN_PEAK_GAP_MS = 1500;

const ACTIVITY_KEY = 'activity-seven';
const ACTIVITY_TITLE = 'Breathing Pace Trainer';
const DRAFT_KEY = 'activity-seven-breathing-draft';

function getBreathingTarget(mode: BreathingMode) {
  if (mode === 'At Rest') return 12;
  if (mode === 'After Exercise 1') return 22;
  return 28;
}

function calculateBreathingScore(
  mode: BreathingMode,
  breathsPerMinute: number
) {
  const target = getBreathingTarget(mode);
  const difference = Math.abs(breathsPerMinute - target);
  const score = Math.round(100 - difference * 5);
  return Math.max(0, Math.min(100, score));
}

// Exercise instructions shown before Exercise 1 and 2
const EXERCISE_INSTRUCTIONS: Record<string, string> = {
  'After Exercise 1':
    '🏃 Before recording: Jog on the spot for 1 full minute, then immediately lie down and place the phone gently on your chest.',
  'After Exercise 2':
    '⭐ Before recording: Do 100 star jumps, then immediately lie down and place the phone gently on your chest.',
};

export default function ActivitySevenGame() {
  const { colors } = useAppTheme();
  const { motionGranted, askForMotion } = usePermissions();
  const { startAccelerometer, stopAccelerometer, resetSensorData } =
    useSensorService();

  const [activeTab, setActiveTab] = useState<TabKey>('activity');
  const [mode, setMode] = useState<BreathingMode>('At Rest');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [breaths, setBreaths] = useState(0);
  const [currentMotion, setCurrentMotion] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved' | 'error'>(
    'idle'
  );

  // Write-up state
  const [prediction, setPrediction] = useState('');
  const [wasCorrect, setWasCorrect] = useState('');
  const [surprises, setSurprises] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousValueRef = useRef(0);
  const lastPeakTimeRef = useRef(0);
  const breathsRef = useRef(0);
  const modeRef = useRef<BreathingMode>('At Rest');
  const hasLoadedDraftRef = useRef(false);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        }

        if (draftData?.prediction) setPrediction(draftData.prediction);
        if (draftData?.wasCorrect) setWasCorrect(draftData.wasCorrect);
        if (draftData?.surprises) setSurprises(draftData.surprises);

        if (draftData?.mode) setDraftStatus('saved');
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
    if (!hasLoadedDraftRef.current) return;

    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
    }

    draftSaveTimerRef.current = setTimeout(async () => {
      try {
        await saveOfflineDraft({
          draftKey: DRAFT_KEY,
          activityKey: ACTIVITY_KEY,
          activityTitle: ACTIVITY_TITLE,
          draftTitle: mode,
          data: {
            mode,
            prediction: prediction.trim(),
            wasCorrect: wasCorrect.trim(),
            surprises: surprises.trim(),
          },
        });
        setDraftStatus('saved');
      } catch (error) {
        console.log('Failed to save Activity 7 draft:', error);
        setDraftStatus('error');
      }
    }, 600);

    return () => {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
      }
    };
  }, [mode, prediction, wasCorrect, surprises]);

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
          prediction: prediction.trim(),
          wasCorrect: wasCorrect.trim(),
          surprises: surprises.trim(),
          sensorServiceUsed: true,
        },
      });

      void scheduleActivityCompleteNotification(
        ACTIVITY_TITLE,
        breathingScore
      );

      Alert.alert(
        'Breathing Test Complete',
        `${selectedMode}: ${breathsPerMinute} breaths/min\nScore: ${breathingScore}/100\n\nRotate to the next team member!`,
        [
          {
            text: 'View Summary',
            onPress: () => {
              router.push(
                `/result-summary?resultId=${savedResultId}` as never
              );
            },
          },
          { text: 'Stay Here', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.log('Failed to save breathing result:', error);

      Alert.alert(
        'Breathing Test Complete',
        `${selectedMode}: ${breathsPerMinute} breaths/min\n\nResult could not be saved.`
      );
    }
  };

  const startTest = () => {
    if (isRunning) return;

    const exerciseInstruction = EXERCISE_INSTRUCTIONS[mode];

    const message = exerciseInstruction
      ? `${exerciseInstruction}\n\nWhen ready, press Start and place the phone gently on your chest.`
      : 'Lie down or sit still. Place the phone gently on your chest or stomach. Breathe normally.';

    Alert.alert('Start Breathing Test?', message, [
      { text: 'Cancel', style: 'cancel' },
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
    ]);
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
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
      }
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
          1. Select a test type below — At Rest, After Exercise 1, or After
          Exercise 2.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          2. For exercise tests, complete the exercise first before pressing
          Start.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          3. Place the phone gently and flat on your chest or stomach.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          4. Stay still and breathe normally for 30 seconds.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          5. The app detects each breath using the phone accelerometer.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          6. Rotate for each team member after each test.
        </Text>
      </View>

      {/* Phone on chest diagram */}
      <View
        style={[
          styles.diagramBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.diagramTitle, { color: colors.text }]}>
          Setup Diagram
        </Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>
          👤 Person lying down
        </Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>
          📱 Phone flat on chest (face up)
        </Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>
          ↑↓ Chest rises and falls with each breath
        </Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>
          📊 App detects peaks = counts breaths
        </Text>
      </View>

      {/* Mode selector */}
      <Text style={[styles.label, { color: colors.text }]}>
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
                borderColor:
                  mode === option ? colors.tint : colors.border,
                backgroundColor:
                  mode === option
                    ? `${colors.tint}20`
                    : colors.background,
              },
            ]}
          >
            <Text
              style={[
                styles.modeText,
                { color: mode === option ? colors.tint : colors.text },
              ]}
            >
              {option}
            </Text>
            {option !== 'At Rest' && (
              <Text
                style={[styles.modeSubtext, { color: colors.subtitle }]}
              >
                {option === 'After Exercise 1'
                  ? 'Jog on spot for 1 minute first'
                  : 'Do 100 star jumps first'}
              </Text>
            )}
          </Pressable>
        ))}
      </View>

      {/* Exercise instruction banner for exercise modes */}
      {mode !== 'At Rest' && (
        <View
          style={[
            styles.exerciseBox,
            {
              backgroundColor: `${colors.tint}12`,
              borderColor: colors.tint,
            },
          ]}
        >
          <Text style={[styles.exerciseText, { color: colors.text }]}>
            {EXERCISE_INSTRUCTIONS[mode]}
          </Text>
          <Text
            style={[
              styles.exerciseSubtext,
              { color: colors.subtitle },
            ]}
          >
            Complete this BEFORE pressing Start below.
          </Text>
        </View>
      )}

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
          ? '✓ Draft saved'
          : draftStatus === 'error'
            ? 'Draft save error'
            : 'Saves automatically'}
      </Text>

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
            Breaths
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {breaths}
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.subtitle }]}>
            Movement
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {currentMotion.toFixed(2)}
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

      {/* Session results */}
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
                {result.mode}
              </Text>
              <Text style={[styles.body, { color: colors.subtitle }]}>
                Breaths counted: {result.breaths} in {TEST_DURATION}s
              </Text>
              <Text style={[styles.score, { color: colors.success }]}>
                {result.breathsPerMinute} breaths/min
              </Text>
              <Text style={[styles.body, { color: colors.subtitle }]}>
                Score: {result.score}/100
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
        Complete on paper or use the fields below. Rotate for each team member.
      </Text>

      <Text style={[styles.label, { color: colors.text }]}>
        Predict breaths per minute for each test
      </Text>

      <TextInput
        value={prediction}
        onChangeText={setPrediction}
        placeholder="e.g. At Rest: 14/min, After Exercise 1: 25/min"
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
      <Text style={[styles.label, { color: colors.text }]}>Results Table</Text>

      <View
        style={[
          styles.tableBox,
          { borderColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <View style={[styles.tableRow, { borderColor: colors.border }]}>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 2 }]}>
            Test
          </Text>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>
            Breaths/min
          </Text>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>
            Score
          </Text>
        </View>

        {results.length === 0 ? (
          <Text
            style={[styles.body, { color: colors.subtitle, padding: 10 }]}
          >
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
                {result.mode}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  { color: colors.subtitle, flex: 1 },
                ]}
              >
                {result.breathsPerMinute}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  { color: colors.success, flex: 1 },
                ]}
              >
                {result.score}/100
              </Text>
            </View>
          ))
        )}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>
        Were you right?
      </Text>

      <TextInput
        value={wasCorrect}
        onChangeText={setWasCorrect}
        placeholder="Did your prediction match the results? Explain why."
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

      <Text style={[styles.label, { color: colors.text }]}>Any surprises?</Text>

      <TextInput
        value={surprises}
        onChangeText={setSurprises}
        placeholder="e.g. Breathing rate was higher than expected after star jumps"
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

      <Text
        style={[
          styles.draftStatus,
          {
            color:
              draftStatus === 'saved' ? colors.success : colors.subtitle,
          },
        ]}
      >
        {draftStatus === 'saved'
          ? '✓ Write-up draft saved automatically'
          : 'Write-up saves automatically'}
      </Text>

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
      <Text style={[styles.cardTitle, { color: colors.text }]}>Discussion</Text>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          Why Does Breathing Rate Change?
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          When you exercise, your muscles need more oxygen to produce energy.
          Your brain signals your breathing muscles to work faster, increasing
          your breathing rate. This is your body's way of getting more oxygen
          in and pushing carbon dioxide out quickly.
        </Text>
      </View>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          Normal Breathing Rates
        </Text>
        <View
          style={[
            styles.tableBox,
            {
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          {[
            ['At Rest', '12–20 breaths/min'],
            ['Light Exercise', '20–30 breaths/min'],
            ['Intense Exercise', '30–60 breaths/min'],
          ].map(([label, value]) => (
            <View
              key={label}
              style={[styles.tableRow, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.tableCell, { color: colors.text, flex: 1 }]}
              >
                {label}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  { color: colors.subtitle, flex: 1 },
                ]}
              >
                {value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          How the App Detects Breathing
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          When the phone rests on your chest, it rises and falls with each
          breath. The accelerometer detects this tiny up-and-down movement.
          The app counts each time the movement crosses a threshold value,
          which it treats as one breath.
        </Text>
      </View>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          Jogging vs Star Jumps
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Jogging is continuous, steady exercise — it raises your heart rate
          gradually. Star jumps are explosive and involve your whole body —
          they spike your heart rate faster. Compare your breathing rate after
          each to see which exercise increased it more.
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
          • How much faster was your breathing after exercise?
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • Did jogging or star jumps raise it more?
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • How long did it take to return to normal?
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • Did fitter team members recover faster?
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
          • ACSSU176 – Structure and function of body systems
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • ACPPS054 – Physical activity and health
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
            await askForMotion();
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
          Breathing Pace Trainer
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Compare breathing at rest and after exercise. Place phone on chest
          and stay still.
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
  instructionBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  diagramBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 4,
  },
  diagramTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  diagramText: {
    fontSize: 14,
    lineHeight: 22,
  },
  modeColumn: { gap: 10, marginBottom: 14 },
  modeButton: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  modeText: { fontSize: 15, fontWeight: '800' },
  modeSubtext: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  exerciseBox: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 6,
  },
  exerciseText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  exerciseSubtext: {
    fontSize: 13,
    fontWeight: '600',
  },
  draftStatus: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1 },
  statLabel: { fontSize: 12, fontWeight: '700' },
  statValue: { marginTop: 4, fontSize: 22, fontWeight: '900' },
  button: {
    marginTop: 4,
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
  resultTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
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
  tableHeader: { fontSize: 13, fontWeight: '900' },
  tableCell: { fontSize: 13, fontWeight: '600' },
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
  bottomTabText: { fontSize: 13, fontWeight: '700' },
});