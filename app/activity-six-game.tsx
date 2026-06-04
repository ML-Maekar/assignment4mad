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
import { saveAttempt } from '@/services/attemptService';
import { scheduleActivityCompleteNotification } from '@/utils/notifications';
import {
  getOfflineDraftByKey,
  parseOfflineDraftData,
  saveOfflineDraft,
} from '@/utils/offlineDraftsDb';

type TabKey = 'activity' | 'writeup' | 'discussion';
type Phase = 1 | 2 | 3;
type Mode = 'Dominant Hand' | 'Non-Dominant Hand';
type GameState = 'idle' | 'waiting' | 'ready' | 'complete';

// Phase 3 tracing — a dot moves around 9 positions on a grid
type TracePosition = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type Result = {
  id: number;
  phase: Phase;
  mode: Mode;
  reactionTime: number;
  score: number;
};

type ActivitySixDraftData = {
  mode?: Mode;
  phase?: Phase;
};

const ACTIVITY_KEY = 'activity-six';
const ACTIVITY_TITLE = 'Reaction Board Challenge';
const DRAFT_KEY = 'activity-six-reaction-draft';

function calculateReactionScore(reactionTime: number) {
  const score = Math.round(100 - Math.max(0, reactionTime - 200) * 0.08);
  return Math.max(0, Math.min(100, score));
}

// 9 positions on a 3x3 grid for tracing phase
const TRACE_POSITIONS: { row: number; col: number }[] = [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: 2 },
  { row: 2, col: 0 },
  { row: 2, col: 1 },
  { row: 2, col: 2 },
];

export default function ActivitySixGame() {
  const { colors } = useAppTheme();

  const [activeTab, setActiveTab] = useState<TabKey>('activity');
  const [phase, setPhase] = useState<Phase>(1);
  const [mode, setMode] = useState<Mode>('Dominant Hand');

  // Phase 1 & 2 state
  const [gameState, setGameState] = useState<GameState>('idle');
  const [message, setMessage] = useState('Press start when ready.');
  const [results, setResults] = useState<Result[]>([]);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved' | 'error'>(
    'idle'
  );

  // Phase 3 tracing state
  const [tracePosition, setTracePosition] = useState<TracePosition>(4);
  const [traceActive, setTraceActive] = useState(false);
  const [traceStartTime, setTraceStartTime] = useState<number | null>(null);
  const [traceScore, setTraceScore] = useState<number | null>(null);
  const [traceTimes, setTraceTimes] = useState<number[]>([]);

  // Write-up state
  const [prediction, setPrediction] = useState('');
  const [wasCorrect, setWasCorrect] = useState('');
  const [surprises, setSurprises] = useState('');

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyTimeRef = useRef<number | null>(null);
  const modeRef = useRef<Mode>('Dominant Hand');
  const phaseRef = useRef<Phase>(1);
  const hasLoadedDraftRef = useRef(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    async function loadDraft() {
      try {
        const draft = await getOfflineDraftByKey(DRAFT_KEY);
        const draftData = parseOfflineDraftData<ActivitySixDraftData>(draft);

        if (
          draftData?.mode === 'Dominant Hand' ||
          draftData?.mode === 'Non-Dominant Hand'
        ) {
          setMode(draftData.mode);
          modeRef.current = draftData.mode;
        }

        if (draftData?.phase === 1 || draftData?.phase === 2 || draftData?.phase === 3) {
          setPhase(draftData.phase);
          phaseRef.current = draftData.phase;
        }

        if (draftData?.mode || draftData?.phase) {
          setDraftStatus('saved');
        }
      } catch (error) {
        console.log('Failed to load Activity 6 draft:', error);
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

    async function saveDraft() {
      try {
        await saveOfflineDraft({
          draftKey: DRAFT_KEY,
          activityKey: ACTIVITY_KEY,
          activityTitle: ACTIVITY_TITLE,
          draftTitle: `Phase ${phase} - ${mode}`,
          data: { mode, phase },
        });

        setDraftStatus('saved');
      } catch (error) {
        console.log('Failed to save Activity 6 draft:', error);
        setDraftStatus('error');
      }
    }

    saveDraft();
  }, [mode, phase]);

  const clearGameTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // ─── Phase 1 & 2 logic ────────────────────────────────────────
  const startRound = () => {
    clearGameTimer();
    setGameState('waiting');
    setMessage('Wait for the button to turn green...');

    const delay = Math.floor(Math.random() * 3500) + 1500;

    timeoutRef.current = setTimeout(() => {
      readyTimeRef.current = Date.now();
      setGameState('ready');
      setMessage('TAP NOW!');
    }, delay);
  };

  const handleMainButtonPress = async () => {
    if (gameState === 'idle' || gameState === 'complete') {
      startRound();
      return;
    }

    if (gameState === 'waiting') {
      clearGameTimer();
      setGameState('idle');
      setMessage('Too early! Wait until the button turns green.');
      Alert.alert('Too Early', 'You tapped before the signal appeared.');
      return;
    }

    if (gameState === 'ready') {
      const readyTime = readyTimeRef.current;

      if (!readyTime) return;

      const reactionTime = Date.now() - readyTime;
      const score = calculateReactionScore(reactionTime);
      const selectedMode = modeRef.current;
      const currentPhase = phaseRef.current;
      const attemptLabel = `Phase ${currentPhase} ${selectedMode} — ${reactionTime} ms`;

      const newResult: Result = {
        id: Date.now(),
        phase: currentPhase,
        mode: selectedMode,
        reactionTime,
        score,
      };

      setResults((currentResults) => [newResult, ...currentResults]);
      setGameState('complete');
      setMessage(`Reaction time: ${reactionTime} ms`);

      try {
        const savedResultId = await saveAttempt({
          activityKey: ACTIVITY_KEY,
          activityTitle: ACTIVITY_TITLE,
          label: attemptLabel,
          score,
          data: {
            phase: currentPhase,
            mode: selectedMode,
            reactionTimeMs: reactionTime,
            reactionScore: score,
            prediction: prediction.trim(),
            wasCorrect: wasCorrect.trim(),
            surprises: surprises.trim(),
          },
        });

        void scheduleActivityCompleteNotification(ACTIVITY_TITLE, score);

        Alert.alert(
          'Round Complete',
          `Reaction time: ${reactionTime} ms\nScore: ${score}/100\n\nRotate to the next team member!`,
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
        console.log('Failed to save reaction result:', error);
        Alert.alert(
          'Round Complete',
          `Reaction time: ${reactionTime} ms\n\nResult could not be saved.`
        );
      }
    }
  };

  // ─── Phase 3 tracing logic ─────────────────────────────────────
  const startTracing = () => {
    const randomPos = Math.floor(Math.random() * 9) as TracePosition;
    setTracePosition(randomPos);
    setTraceActive(true);
    setTraceStartTime(Date.now());
    setTraceScore(null);
    setTraceTimes([]);
    setMessage('Tap the highlighted dot as fast as you can!');
  };

  const handleTraceTap = async (position: TracePosition) => {
    if (!traceActive) return;

    const now = Date.now();
    const tapTime = traceStartTime ? now - traceStartTime : 999;

    const newTraceTimes = [...traceTimes, tapTime];
    setTraceTimes(newTraceTimes);

    // Move dot to a new random position
    let nextPos: TracePosition;

    do {
      nextPos = Math.floor(Math.random() * 9) as TracePosition;
    } while (nextPos === position);

    setTracePosition(nextPos);
    setTraceStartTime(now);

    // After 5 taps finish the tracing round
    if (newTraceTimes.length >= 5) {
      setTraceActive(false);

      const avgTime = Math.round(
        newTraceTimes.reduce((a, b) => a + b, 0) / newTraceTimes.length
      );
      const score = calculateReactionScore(avgTime);
      setTraceScore(score);
      setMessage(`Tracing complete! Average: ${avgTime} ms`);

      const attemptLabel = `Phase 3 Tracing — ${modeRef.current} — avg ${avgTime} ms`;

      const newResult: Result = {
        id: Date.now(),
        phase: 3,
        mode: modeRef.current,
        reactionTime: avgTime,
        score,
      };

      setResults((currentResults) => [newResult, ...currentResults]);

      try {
        const savedResultId = await saveAttempt({
          activityKey: ACTIVITY_KEY,
          activityTitle: ACTIVITY_TITLE,
          label: attemptLabel,
          score,
          data: {
            phase: 3,
            mode: modeRef.current,
            averageTraceTimeMs: avgTime,
            traceTimesMs: newTraceTimes,
            traceScore: score,
            prediction: prediction.trim(),
            wasCorrect: wasCorrect.trim(),
            surprises: surprises.trim(),
          },
        });

        void scheduleActivityCompleteNotification(ACTIVITY_TITLE, score);

        Alert.alert(
          'Tracing Complete',
          `Average reaction: ${avgTime} ms\nScore: ${score}/100\n\nRotate to the next team member!`,
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
        console.log('Failed to save tracing result:', error);
        Alert.alert('Tracing Complete', `Average: ${avgTime} ms`);
      }
    }
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
            setTraceScore(null);
            setTraceTimes([]);
            setMessage('Press start when ready.');
            setGameState('idle');
          },
        },
      ]
    );
  };

  const averageReaction =
    results.length === 0
      ? 0
      : Math.round(
          results.reduce((total, result) => total + result.reactionTime, 0) /
            results.length
        );

  const openLeaderboard = () => {
    router.push('/leaderboard?activityKey=activity-six' as never);
  };

  useEffect(() => {
    return () => {
      clearGameTimer();
    };
  }, []);

  const getButtonColor = () => {
    if (gameState === 'waiting') return colors.warning ?? '#f59e0b';
    if (gameState === 'ready') return colors.success;
    return colors.tint;
  };

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
          Phase 1 — Tap the button as soon as it turns green.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Phase 2 — Repeat using your non-dominant hand.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Phase 3 — Trace the moving dot across the grid as fast as you can.
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Rotate through each team member between phases.
        </Text>
      </View>

      {/* Phase selector */}
      <Text style={[styles.label, { color: colors.text }]}>Select Phase</Text>

      <View style={styles.phaseRow}>
        {([1, 2, 3] as Phase[]).map((p) => (
          <Pressable
            key={p}
            onPress={() => {
              setPhase(p);
              setGameState('idle');
              setMessage('Press start when ready.');
              setTraceActive(false);
              setTraceScore(null);
              setTraceTimes([]);
            }}
            style={[
              styles.phaseButton,
              {
                borderColor: phase === p ? colors.tint : colors.border,
                backgroundColor:
                  phase === p ? `${colors.tint}20` : colors.background,
              },
            ]}
          >
            <Text
              style={[
                styles.phaseText,
                { color: phase === p ? colors.tint : colors.text },
              ]}
            >
              Phase {p}
            </Text>
            <Text style={[styles.phaseSubtext, { color: colors.subtitle }]}>
              {p === 1
                ? 'Dominant Hand'
                : p === 2
                  ? 'Non-Dominant Hand'
                  : 'Tracing'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Hand selector for phase 1 & 2 */}
      {(phase === 1 || phase === 2) && (
        <>
          <Text style={[styles.label, { color: colors.text }]}>
            Choose Hand
          </Text>

          <View style={styles.modeRow}>
            {(['Dominant Hand', 'Non-Dominant Hand'] as Mode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                disabled={gameState === 'waiting' || gameState === 'ready'}
                style={[
                  styles.modeButton,
                  {
                    borderColor: mode === m ? colors.tint : colors.border,
                    backgroundColor:
                      mode === m ? `${colors.tint}20` : colors.background,
                  },
                ]}
              >
                <Text style={[styles.modeText, { color: colors.text }]}>
                  {m}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Reaction button */}
          <View style={styles.gameCenter}>
            <Text style={[styles.message, { color: colors.text }]}>
              {message}
            </Text>

            <Pressable
              onPress={handleMainButtonPress}
              style={({ pressed }) => [
                styles.reactionButton,
                { backgroundColor: getButtonColor() },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[styles.reactionButtonText, { color: colors.buttonText }]}
              >
                {gameState === 'idle' || gameState === 'complete'
                  ? 'Start'
                  : gameState === 'waiting'
                    ? 'Wait...'
                    : 'Tap!'}
              </Text>
            </Pressable>

            {results.filter((r) => r.phase === phase).length > 0 && (
              <Text style={[styles.averageText, { color: colors.subtitle }]}>
                Average:{' '}
                {Math.round(
                  results
                    .filter((r) => r.phase === phase)
                    .reduce((sum, r) => sum + r.reactionTime, 0) /
                    results.filter((r) => r.phase === phase).length
                )}{' '}
                ms
              </Text>
            )}
          </View>
        </>
      )}

      {/* Phase 3 — Tracing grid */}
      {phase === 3 && (
        <>
          <Text style={[styles.label, { color: colors.text }]}>
            Tracing Challenge — Tap the highlighted dot
          </Text>

          <Text style={[styles.body, { color: colors.subtitle }]}>
            A dot will appear at random positions on the grid. Tap it as fast
            as you can. Complete 5 taps to finish.
          </Text>

          {traceScore !== null && (
            <View
              style={[
                styles.traceScoreBox,
                {
                  backgroundColor: `${colors.success}18`,
                  borderColor: colors.success,
                },
              ]}
            >
              <Text style={[styles.traceScoreText, { color: colors.success }]}>
                Score: {traceScore}/100
              </Text>
              <Text style={[styles.body, { color: colors.subtitle }]}>
                {message}
              </Text>
            </View>
          )}

          {/* 3x3 grid */}
          <View style={styles.traceGrid}>
            {[0, 1, 2].map((row) => (
              <View key={row} style={styles.traceGridRow}>
                {[0, 1, 2].map((col) => {
                  const posIndex = (row * 3 + col) as TracePosition;
                  const isActive =
                    traceActive && tracePosition === posIndex;

                  return (
                    <Pressable
                      key={col}
                      onPress={() =>
                        traceActive && handleTraceTap(posIndex)
                      }
                      style={[
                        styles.traceDot,
                        {
                          backgroundColor: isActive
                            ? colors.success
                            : colors.border,
                          transform: [{ scale: isActive ? 1.2 : 1 }],
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>

          <Text style={[styles.traceProgress, { color: colors.subtitle }]}>
            Taps: {traceTimes.length} / 5
          </Text>

          {!traceActive && (
            <Pressable
              onPress={startTracing}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.tint },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.buttonText }]}>
                {traceScore !== null ? 'Try Again' : 'Start Tracing'}
              </Text>
            </Pressable>
          )}
        </>
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

          {results.map((result, index) => (
            <View
              key={result.id}
              style={[styles.resultRow, { borderColor: colors.border }]}
            >
              <Text style={[styles.resultTitle, { color: colors.text }]}>
                Attempt {results.length - index} — Phase {result.phase}
              </Text>
              <Text style={[styles.body, { color: colors.subtitle }]}>
                {result.mode}
              </Text>
              <Text style={[styles.score, { color: colors.success }]}>
                {result.reactionTime} ms — Score: {result.score}/100
              </Text>
            </View>
          ))}

          {results.length > 0 && (
            <Text style={[styles.averageText, { color: colors.subtitle }]}>
              Overall average: {averageReaction} ms
            </Text>
          )}

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
        Predict your reaction time
      </Text>

      <TextInput
        value={prediction}
        onChangeText={setPrediction}
        placeholder="e.g. I think I will react in about 300 ms"
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
            Attempt
          </Text>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>
            Time (ms)
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
          results.map((result, index) => (
            <View
              key={result.id}
              style={[styles.tableRow, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.tableCell, { color: colors.text, flex: 2 }]}
                numberOfLines={2}
              >
                P{result.phase} {result.mode}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  { color: colors.subtitle, flex: 1 },
                ]}
              >
                {result.reactionTime}
              </Text>
              <Text
                style={[styles.tableCell, { color: colors.success, flex: 1 }]}
              >
                {result.score}/100
              </Text>
            </View>
          ))
        )}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Were you right?</Text>

      <TextInput
        value={wasCorrect}
        onChangeText={setWasCorrect}
        placeholder="Was your prediction close to your actual reaction time?"
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
        placeholder="e.g. My non-dominant hand was faster than expected"
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
      <Text style={[styles.cardTitle, { color: colors.text }]}>Discussion</Text>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          How Reaction Time Works
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Reaction time measures how quickly your brain processes information
          and sends signals to your muscles. When you see the green button,
          your eyes send a signal to your brain, which decides to tap, then
          sends a signal to your hand. This whole process takes milliseconds.
        </Text>
      </View>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          Dominant vs Non-Dominant Hand
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Your dominant hand is usually faster because your brain has more
          practice sending signals to those muscles. The difference in
          reaction time between hands shows how much practice affects
          neuromuscular coordination.
        </Text>
      </View>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          Tracing and Coordination
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Phase 3 (tracing) adds an extra challenge — your brain must also
          predict where to move, not just react to a fixed spot. This tests
          coordination and visual tracking ability on top of pure reaction speed.
        </Text>
      </View>

      <View
        style={[
          styles.discussionBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          Practice and Improvement
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Reaction time can improve with practice. Athletes and gamers often
          train specifically to reduce reaction time. Compare your first attempt
          to your last — did you get faster?
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
          • Was your dominant hand faster? By how much?
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • Did reaction time improve with practice?
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • Was tracing harder than a fixed button? Why?
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • How does tiredness or stress affect reaction time?
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
          • ACSIS130 – Collecting and analysing data
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • ACMSP147 – Averages and variation
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          • ACPPS057 – Understanding physical performance
        </Text>
      </View>

      {renderTabs()}
    </View>
  );

  // ─── Main render ──────────────────────────────────────────────
  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Reaction Board Challenge
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Test reaction speed across 3 phases. Rotate for each team member.
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
  phaseRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  phaseButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  phaseText: { fontSize: 14, fontWeight: '900' },
  phaseSubtext: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  modeRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  modeText: { fontSize: 15, fontWeight: '800' },
  gameCenter: {
    alignItems: 'center',
    marginVertical: 10,
  },
  message: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
  },
  reactionButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionButtonText: { fontSize: 24, fontWeight: '900' },
  averageText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  traceScoreBox: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  traceScoreText: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  traceGrid: {
    alignSelf: 'center',
    gap: 14,
    marginVertical: 16,
  },
  traceGridRow: {
    flexDirection: 'row',
    gap: 14,
  },
  traceDot: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  traceProgress: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  draftStatus: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
  },
  button: {
    minHeight: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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