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
import { saveActivityResult } from '@/utils/activityResultsDb';
import {
  getOfflineDraftByKey,
  parseOfflineDraftData,
  saveOfflineDraft,
} from '@/utils/offlineDraftsDb';

type Mode = 'Dominant Hand' | 'Non-Dominant Hand';

type Result = {
  id: number;
  mode: Mode;
  reactionTime: number;
  score: number;
};

type GameState = 'idle' | 'waiting' | 'ready' | 'complete';

type ActivitySixDraftData = {
  mode?: Mode;
};

const ACTIVITY_KEY = 'activity-six';
const ACTIVITY_TITLE = 'Reaction Board Challenge';
const DRAFT_KEY = 'activity-six-reaction-draft';

function calculateReactionScore(reactionTime: number) {
  const score = Math.round(100 - Math.max(0, reactionTime - 200) * 0.08);
  return Math.max(0, Math.min(100, score));
}

export default function ActivitySixGame() {
  const { colors } = useAppTheme();

  const [mode, setMode] = useState<Mode>('Dominant Hand');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [message, setMessage] = useState('Press start when ready.');
  const [results, setResults] = useState<Result[]>([]);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved' | 'error'>(
    'idle'
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyTimeRef = useRef<number | null>(null);
  const modeRef = useRef<Mode>('Dominant Hand');
  const hasLoadedDraftRef = useRef(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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
        console.log('Failed to save Activity 6 draft:', error);
        setDraftStatus('error');
      }
    }

    saveModeDraft();
  }, [mode]);

  const clearGameTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

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

      if (!readyTime) {
        return;
      }

      const reactionTime = Date.now() - readyTime;
      const score = calculateReactionScore(reactionTime);
      const selectedMode = modeRef.current;
      const attemptLabel = `${selectedMode} - ${reactionTime} ms`;

      const newResult: Result = {
        id: Date.now(),
        mode: selectedMode,
        reactionTime,
        score,
      };

      setResults((currentResults) => [newResult, ...currentResults]);
      setGameState('complete');
      setMessage(`Reaction time: ${reactionTime} ms`);

      try {
        const savedResultId = await saveActivityResult({
          activityKey: ACTIVITY_KEY,
          activityTitle: ACTIVITY_TITLE,
          label: attemptLabel,
          score,
          data: {
            mode: selectedMode,
            reactionTimeMs: reactionTime,
            reactionScore: score,
          },
        });

        Alert.alert(
          'Round Complete',
          `Your reaction time was ${reactionTime} ms.\nScore: ${score}/100`,
          [
            {
              text: 'View Summary',
              onPress: () => {
                router.push(
                  `/result-summary?resultId=${savedResultId}` as never
                );
              },
            },
            {
              text: 'Stay Here',
              style: 'cancel',
            },
          ]
        );
      } catch (error) {
        console.log('Failed to save reaction result:', error);

        Alert.alert(
          'Round Complete',
          `Your reaction time was ${reactionTime} ms.\n\nThe result was shown on this screen, but it could not be saved to the local database.`
        );
      }
    }
  };

  const resetResults = () => {
    Alert.alert(
      'Clear Reaction Results?',
      'This will remove the temporary reaction attempts from this screen. Saved SQLite leaderboard results will not be deleted here.',
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
    if (gameState === 'waiting') {
      return colors.warning;
    }

    if (gameState === 'ready') {
      return colors.success;
    }

    return colors.tint;
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Reaction Challenge
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Test how quickly each team member reacts when the signal appears.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Choose Hand
        </Text>

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode('Dominant Hand')}
            disabled={gameState === 'waiting' || gameState === 'ready'}
            style={[
              styles.modeButton,
              {
                borderColor:
                  mode === 'Dominant Hand' ? colors.tint : colors.border,
                backgroundColor:
                  mode === 'Dominant Hand'
                    ? `${colors.tint}20`
                    : colors.background,
              },
            ]}
          >
            <Text style={[styles.modeText, { color: colors.text }]}>
              Dominant
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode('Non-Dominant Hand')}
            disabled={gameState === 'waiting' || gameState === 'ready'}
            style={[
              styles.modeButton,
              {
                borderColor:
                  mode === 'Non-Dominant Hand' ? colors.tint : colors.border,
                backgroundColor:
                  mode === 'Non-Dominant Hand'
                    ? `${colors.tint}20`
                    : colors.background,
              },
            ]}
          >
            <Text style={[styles.modeText, { color: colors.text }]}>
              Non-Dominant
            </Text>
          </Pressable>
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
          styles.gameCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
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
          <Text style={[styles.reactionButtonText, { color: colors.buttonText }]}>
            {gameState === 'idle' || gameState === 'complete'
              ? 'Start Round'
              : gameState === 'waiting'
                ? 'Wait...'
                : 'Tap!'}
          </Text>
        </Pressable>

        {results.length > 0 && (
          <Text style={[styles.averageText, { color: colors.subtitle }]}>
            Average reaction time: {averageReaction} ms
          </Text>
        )}

        <Pressable
          onPress={openLeaderboard}
          style={({ pressed }) => [
            styles.leaderboardButton,
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
            No attempts yet. Start a round to record reaction time.
          </Text>
        ) : (
          results.map((result, index) => (
            <View
              key={result.id}
              style={[styles.resultRow, { borderColor: colors.border }]}
            >
              <Text style={[styles.resultTitle, { color: colors.text }]}>
                Attempt {results.length - index}
              </Text>
              <Text style={[styles.body, { color: colors.subtitle }]}>
                Mode: {result.mode}
              </Text>
              <Text style={[styles.score, { color: colors.success }]}>
                Reaction: {result.reactionTime} ms
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
              styles.secondaryButton,
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
  gameCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
  },
  cardTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 22 },
  modeRow: { flexDirection: 'row', gap: 12 },
  modeButton: {
    flex: 1,
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
  message: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
  },
  reactionButton: {
    width: 190,
    height: 190,
    borderRadius: 95,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionButtonText: { fontSize: 28, fontWeight: '900' },
  averageText: { marginTop: 18, fontSize: 15, fontWeight: '700' },
  leaderboardButton: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },
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