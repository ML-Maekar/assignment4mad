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
  deleteOfflineDraftByKey,
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

type Result = {
  id: number;
  designName: string;
  prediction: string;
  maxMovement: number;
  averageMovement: number;
  stabilityScore: number;
  wasCorrect: string;
};

type ActivityFourDraftData = {
  designName?: string;
  prediction?: string;
  wasCorrect?: string;
  surprises?: string;
};

const TEST_DURATION = 10;
const ACTIVITY_KEY = 'activity-four';
const ACTIVITY_TITLE = 'Earthquake-Resistant Structure';
const DRAFT_KEY = 'activity-four-earthquake-draft';

export default function ActivityFourGame() {
  const { colors } = useAppTheme();
  const { motionGranted, askForMotion } = usePermissions();
  const { startAccelerometer, stopAccelerometer, resetSensorData } =
    useSensorService();

  const [activeTab, setActiveTab] = useState<TabKey>('activity');

  // Activity tab state
  const [designName, setDesignName] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [currentMovement, setCurrentMovement] = useState(0);
  const [readings, setReadings] = useState<number[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved' | 'error'>(
    'idle'
  );

  // Write-up tab state
  const [prediction, setPrediction] = useState('');
  const [wasCorrect, setWasCorrect] = useState('');
  const [surprises, setSurprises] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readingsRef = useRef<number[]>([]);
  const resultsCountRef = useRef(0);
  const designNameRef = useRef('');
  const predictionRef = useRef('');
  const wasCorrectRef = useRef('');
  const hasLoadedDraftRef = useRef(false);

  useEffect(() => {
    readingsRef.current = readings;
  }, [readings]);

  useEffect(() => {
    resultsCountRef.current = results.length;
  }, [results]);

  useEffect(() => {
    designNameRef.current = designName;
  }, [designName]);

  useEffect(() => {
    predictionRef.current = prediction;
  }, [prediction]);

  useEffect(() => {
    wasCorrectRef.current = wasCorrect;
  }, [wasCorrect]);

  useEffect(() => {
    async function loadDraft() {
      try {
        const draft = await getOfflineDraftByKey(DRAFT_KEY);
        const draftData = parseOfflineDraftData<ActivityFourDraftData>(draft);

        if (draftData?.designName) {
          setDesignName(draftData.designName);
          designNameRef.current = draftData.designName;
        }

        if (draftData?.prediction) {
          setPrediction(draftData.prediction);
          predictionRef.current = draftData.prediction;
        }

        if (draftData?.wasCorrect) {
          setWasCorrect(draftData.wasCorrect);
          wasCorrectRef.current = draftData.wasCorrect;
        }

        if (draftData?.surprises) {
          setSurprises(draftData.surprises);
        }

        if (draftData?.designName || draftData?.prediction) {
          setDraftStatus('saved');
        }
      } catch (error) {
        console.log('Failed to load Activity 4 draft:', error);
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

    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
    }

    draftSaveTimerRef.current = setTimeout(async () => {
      try {
        const trimmedDesignName = designName.trim();

        if (!trimmedDesignName) {
          await deleteOfflineDraftByKey(DRAFT_KEY);
          setDraftStatus('idle');
          return;
        }

        await saveOfflineDraft({
          draftKey: DRAFT_KEY,
          activityKey: ACTIVITY_KEY,
          activityTitle: ACTIVITY_TITLE,
          draftTitle: trimmedDesignName,
          data: {
            designName: trimmedDesignName,
            prediction: prediction.trim(),
            wasCorrect: wasCorrect.trim(),
            surprises: surprises.trim(),
          },
        });

        setDraftStatus('saved');
      } catch (error) {
        console.log('Failed to save Activity 4 draft:', error);
        setDraftStatus('error');
      }
    }, 600);

    return () => {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
      }
    };
  }, [designName, prediction, wasCorrect, surprises]);

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
      prediction: predictionRef.current.trim(),
      maxMovement,
      averageMovement,
      stabilityScore,
      wasCorrect: wasCorrectRef.current.trim(),
    };

    setResults((currentResults) => [newResult, ...currentResults]);

    try {
      const savedResultId = await saveAttempt({
        activityKey: ACTIVITY_KEY,
        activityTitle: ACTIVITY_TITLE,
        label: finalDesignName,
        score: stabilityScore,
        data: {
          maxMovement,
          averageMovement,
          testDurationSeconds: TEST_DURATION,
          readingCount: finalReadings.length,
          prediction: predictionRef.current.trim(),
          wasCorrect: wasCorrectRef.current.trim(),
          surprises: surprises.trim(),
          sensorServiceUsed: true,
        },
      });

      await deleteOfflineDraftByKey(DRAFT_KEY);
      setDraftStatus('idle');

      void scheduleActivityCompleteNotification(
        ACTIVITY_TITLE,
        stabilityScore
      );

      Alert.alert(
        'Earthquake Test Complete',
        `Stability score: ${stabilityScore}/100`,
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
      console.log('Failed to save earthquake result:', error);

      Alert.alert(
        'Result Calculated',
        `Stability score: ${stabilityScore}/100\n\nThe result was shown on this screen, but it could not be saved.`
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
          onPress: async () => {
            readingsRef.current = [];
            setReadings([]);
            setCurrentMovement(0);
            setTimeLeft(TEST_DURATION);
            resetSensorData();

            const started = await startAccelerometer({
              updateInterval: 150,
              onData: (data) => {
                const movement = getMovementStrength(data);

                setCurrentMovement(movement);

                readingsRef.current = [...readingsRef.current, movement];
                setReadings(readingsRef.current);
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
          onPress: () => setResults([]),
        },
      ]
    );
  };

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
              setDesignName('');
              setPrediction('');
              setWasCorrect('');
              setSurprises('');
              designNameRef.current = '';
              predictionRef.current = '';
              wasCorrectRef.current = '';
              setDraftStatus('idle');
            } catch (error) {
              console.log('Failed to clear Activity 4 draft:', error);
              setDraftStatus('error');
            }
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
      stopAccelerometer();
      stopTimer();

      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
      }
    };
  }, []);

  // ─── Tab renderer ────────────────────────────────────────────
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
          1. Build an anti-vibration layer by folding paper or cardboard.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          2. Place a flat cardboard platform on top of the layer.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          3. Place paper cups as pillars between layers if needed.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          4. Place the phone flat in the centre of your structure.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          5. Press Start — the phone will measure movement for 10 seconds.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          6. A lower movement score means a better structure.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          7. Redesign and test up to 3 designs. Rotate for each team member.
        </Text>
      </View>

      {/* Structure diagram description */}
      <View
        style={[
          styles.diagramBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.diagramTitle, { color: colors.text }]}>
          Structure Diagram
        </Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>
          📱 Phone (flat on top)
        </Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>
          ▬▬▬ Top cardboard platform
        </Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>
          〰〰〰 Folded paper/cardboard (anti-vibration layer)
        </Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>
          ▬▬▬ Bottom cardboard platform
        </Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>
          🥤🥤🥤 Paper cups as pillars (optional)
        </Text>
      </View>

      {/* Design input */}
      <Text style={[styles.label, { color: colors.text }]}>
        Structure Design Name
      </Text>

      <TextInput
        value={designName}
        onChangeText={setDesignName}
        placeholder="e.g. 4 folds + 4 pillars"
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

      <View style={styles.draftRow}>
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
              : 'Draft saves automatically'}
        </Text>

        {designName.trim().length > 0 && (
          <Pressable onPress={clearDraft}>
            <Text style={[styles.clearDraftText, { color: colors.danger }]}>
              Clear Draft
            </Text>
          </Pressable>
        )}
      </View>

      {/* Live stats */}
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
      </Text>

      {/* Prediction */}
      <Text style={[styles.label, { color: colors.text }]}>
        Predict which design makes the phone move the least
      </Text>

      <TextInput
        value={prediction}
        onChangeText={setPrediction}
        placeholder="e.g. Design 2 with 10 folds will be most stable"
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
        {/* Header */}
        <View style={[styles.tableRow, { borderColor: colors.border }]}>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 2 }]}>
            Design
          </Text>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>
            Movement
          </Text>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>
            Score
          </Text>
        </View>

        {results.length === 0 ? (
          <Text style={[styles.body, { color: colors.subtitle, padding: 10 }]}>
            Run tests in the Activity tab to populate results here.
          </Text>
        ) : (
          results.map((result, index) => (
            <View
              key={result.id}
              style={[styles.tableRow, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.tableCell, { color: colors.text, flex: 2 }]}
              >
                {result.designName}
              </Text>
              <Text
                style={[styles.tableCell, { color: colors.subtitle, flex: 1 }]}
              >
                {result.averageMovement.toFixed(3)}g
              </Text>
              <Text
                style={[styles.tableCell, { color: colors.success, flex: 1 }]}
              >
                {result.stabilityScore}/100
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Were you right */}
      <Text style={[styles.label, { color: colors.text }]}>
        Were you right?
      </Text>

      <TextInput
        value={wasCorrect}
        onChangeText={setWasCorrect}
        placeholder="Was your prediction correct? Explain why."
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

      {/* Surprises */}
      <Text style={[styles.label, { color: colors.text }]}>
        Any surprises?
      </Text>

      <TextInput
        value={surprises}
        onChangeText={setSurprises}
        placeholder="Did anything unexpected happen during testing?"
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
          Why Do Buildings Fall in Earthquakes?
        </Text>

        <Text style={[styles.body, { color: colors.subtitle }]}>
          Earthquakes cause ground vibrations that travel through buildings.
          Poorly designed structures absorb too much energy and collapse.
          Engineers design buildings with special materials and shapes to
          absorb and distribute energy safely.
        </Text>
      </View>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          How Does Your Structure Work?
        </Text>

        <Text style={[styles.body, { color: colors.subtitle }]}>
          The folded paper layer between your cardboard platforms acts as a
          shock absorber. More folds create more air gaps and surface area,
          which helps absorb vibration energy before it reaches the top platform.
        </Text>

        <Text style={[styles.body, { color: colors.subtitle }]}>
          Pillars (paper cups) provide vertical support but can also transmit
          vibration directly. Finding the right balance between pillars and
          folded layers is the key engineering challenge.
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
          The phone accelerometer measures movement in 3 directions (x, y, z).
          Movement strength = how far the sensor reading deviates from still.
          A stability score of 100 means almost no movement detected.
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
          • Which design moved the phone the least?
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • Did more folds always mean less movement?
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • How did adding or removing pillars change the result?
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • What would you change if you had more time?
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
          • ACSSU096 – Earth processes cause changes to Earth's surface
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • ACTDEP036 – Testing and improving design solutions
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
          Earthquake-Resistant Structure
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Build a structure, place the phone on top, and test how much it
          moves. Lower movement = better design.
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
    fontFamily: 'monospace',
  },
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
  draftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  draftStatus: { flex: 1, fontSize: 13, fontWeight: '700' },
  clearDraftText: { fontSize: 13, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox: { flex: 1 },
  statLabel: { fontSize: 13, fontWeight: '700' },
  statValue: { marginTop: 4, fontSize: 24, fontWeight: '900' },
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