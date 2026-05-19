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

type Mode = 'Dominant Hand' | 'Non-Dominant Hand';

type Result = {
  id: number;
  mode: Mode;
  reactionTime: number;
};

type GameState = 'idle' | 'waiting' | 'ready' | 'complete';

export default function ActivitySixGame() {
  const { colors } = useAppTheme();

  const [mode, setMode] = useState<Mode>('Dominant Hand');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [message, setMessage] = useState('Press start when ready.');
  const [results, setResults] = useState<Result[]>([]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyTimeRef = useRef<number | null>(null);

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

  const handleMainButtonPress = () => {
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

      const newResult: Result = {
        id: Date.now(),
        mode,
        reactionTime,
      };

      setResults((currentResults) => [newResult, ...currentResults]);
      setGameState('complete');
      setMessage(`Reaction time: ${reactionTime} ms`);

      Alert.alert('Round Complete', `Your reaction time was ${reactionTime} ms.`);
    }
  };

  const resetResults = () => {
    Alert.alert(
      'Clear Reaction Results?',
      'This will remove all reaction attempts from this screen.',
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