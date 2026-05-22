import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import {
    ActivityResultRecord,
    getActivityResultById,
} from '@/utils/activityResultsDb';

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getGameRoute(activityKey: string) {
  const routes: Record<string, string> = {
    'activity-one': '/activity-one-game',
    'activity-two': '/activity-two-game',
    'activity-three': '/activity-three-game',
    'activity-four': '/activity-four-game',
    'activity-five': '/activity-five-game',
    'activity-six': '/activity-six-game',
    'activity-seven': '/activity-seven-game',
    parachute: '/activity-one-game',
    sound: '/activity-two-game',
    fan: '/activity-three-game',
    earthquake: '/activity-four-game',
    performance: '/activity-five-game',
    reaction: '/activity-six-game',
    breathing: '/activity-seven-game',
  };

  return routes[activityKey] ?? '/(tabs)/home';
}

export default function ResultSummaryScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams();

  const resultIdParam = Array.isArray(params.resultId)
    ? params.resultId[0]
    : params.resultId;

  const resultId = Number(resultIdParam);

  const [result, setResult] = useState<ActivityResultRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const extraData = useMemo(() => {
    if (!result?.dataJson) {
      return {};
    }

    try {
      return JSON.parse(result.dataJson) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [result]);

  useEffect(() => {
    async function loadResult() {
      try {
        if (!resultId || Number.isNaN(resultId)) {
          setResult(null);
          return;
        }

        const savedResult = await getActivityResultById(resultId);
        setResult(savedResult);
      } catch (error) {
        console.log('Failed to load result summary:', error);
        setResult(null);
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [resultId]);

  const openLeaderboard = () => {
    if (!result) {
      return;
    }

    router.push(`/leaderboard?activityKey=${result.activityKey}` as never);
  };

  const tryAgain = () => {
    if (!result) {
      router.replace('/(tabs)/home' as never);
      return;
    }

    router.replace(getGameRoute(result.activityKey) as never);
  };

  if (loading) {
    return (
      <AppScreen scroll={false} contentStyle={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.subtitle }]}>
          Loading result...
        </Text>
      </AppScreen>
    );
  }

  if (!result) {
    return (
      <AppScreen>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Result Not Found
          </Text>
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>
            This result could not be loaded. It may have been deleted or the
            result ID was missing.
          </Text>
        </View>

        <Pressable
          onPress={() => router.replace('/(tabs)/home' as never)}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.tint },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            Go Home
          </Text>
        </Pressable>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Result Summary
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Your activity result has been saved locally on this device.
        </Text>
      </View>

      <View
        style={[
          styles.scoreCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.activityTitle, { color: colors.text }]}>
          {result.activityTitle}
        </Text>

        <Text style={[styles.label, { color: colors.subtitle }]}>
          {result.label}
        </Text>

        <Text style={[styles.score, { color: colors.success }]}>
          {Math.round(result.score)}/100
        </Text>

        <Text style={[styles.scoreLabel, { color: colors.subtitle }]}>
          Final Score
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Result Details
        </Text>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.subtitle }]}>
            Activity Key
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {result.activityKey}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.subtitle }]}>
            Saved At
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {formatDate(result.createdAt)}
          </Text>
        </View>

        {Object.entries(extraData).map(([key, value]) => (
          <View key={key} style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.subtitle }]}>
              {key}
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {typeof value === 'number' ? value.toFixed(3) : String(value)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.buttonGroup}>
        <Pressable
          onPress={openLeaderboard}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.tint },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            View Leaderboard
          </Text>
        </Pressable>

        <Pressable
          onPress={tryAgain}
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor: colors.tint },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>
            Try Again
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/(tabs)/home' as never)}
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor: colors.border },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            Home
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
  },
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
  scoreCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 22,
    marginBottom: 16,
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  label: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  score: {
    marginTop: 20,
    fontSize: 56,
    fontWeight: '900',
  },
  scoreLabel: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 14,
  },
  detailRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  detailValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonGroup: {
    gap: 12,
  },
  button: {
    minHeight: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 18,
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
    fontWeight: '900',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '900',
  },
});