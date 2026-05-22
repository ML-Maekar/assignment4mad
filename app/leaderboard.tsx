import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import {
    ActivityResultRecord,
    clearActivityResultsByActivity,
    getActivityResultsByActivity,
    getAllActivityResults,
} from '@/utils/activityResultsDb';

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

export default function LeaderboardScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams();

  const activityKey = Array.isArray(params.activityKey)
    ? params.activityKey[0]
    : params.activityKey;

  const [results, setResults] = useState<ActivityResultRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const title = useMemo(() => {
    if (results.length > 0 && activityKey) {
      return `${results[0].activityTitle} Leaderboard`;
    }

    if (activityKey) {
      return 'Activity Leaderboard';
    }

    return 'All Results Leaderboard';
  }, [activityKey, results]);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);

      if (activityKey) {
        const activityResults = await getActivityResultsByActivity(activityKey);
        setResults(activityResults);
      } else {
        const allResults = await getAllActivityResults();
        setResults(allResults);
      }
    } catch (error) {
      console.log('Failed to load leaderboard:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [activityKey]);

  useFocusEffect(
    useCallback(() => {
      loadResults();
    }, [loadResults])
  );

  const clearResults = () => {
    if (!activityKey) {
      Alert.alert(
        'Clear unavailable',
        'Open the leaderboard from a specific activity before clearing results.'
      );
      return;
    }

    Alert.alert(
      'Clear Leaderboard?',
      'This will delete saved results for this activity from this device.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearActivityResultsByActivity(activityKey);
            await loadResults();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <AppScreen scroll={false} contentStyle={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.subtitle }]}>
          Loading leaderboard...
        </Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Scores are saved locally using SQLite and ranked by highest score.
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
          Rankings
        </Text>

        {results.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.subtitle }]}>
            No saved results yet. Complete an activity to appear on the
            leaderboard.
          </Text>
        ) : (
          results.map((result, index) => (
            <View
              key={result.id}
              style={[
                styles.resultRow,
                {
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.rankBadge,
                  {
                    backgroundColor:
                      index === 0 ? colors.success : colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rankText,
                    {
                      color:
                        index === 0 ? colors.buttonText : colors.text,
                    },
                  ]}
                >
                  #{index + 1}
                </Text>
              </View>

              <View style={styles.resultInfo}>
                <Text style={[styles.resultTitle, { color: colors.text }]}>
                  {result.label}
                </Text>

                {!activityKey && (
                  <Text style={[styles.resultMeta, { color: colors.subtitle }]}>
                    {result.activityTitle}
                  </Text>
                )}

                <Text style={[styles.resultMeta, { color: colors.subtitle }]}>
                  Saved: {formatDate(result.createdAt)}
                </Text>
              </View>

              <Text style={[styles.score, { color: colors.success }]}>
                {Math.round(result.score)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.buttonGroup}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.tint },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            Back
          </Text>
        </Pressable>

        {activityKey && results.length > 0 && (
          <Pressable
            onPress={clearResults}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: colors.danger },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.danger }]}>
              Clear Activity Results
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.replace('/(tabs)/home')}
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
    fontSize: 30,
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
    fontWeight: '900',
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 14,
    gap: 12,
  },
  rankBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '900',
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  resultMeta: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '600',
  },
  score: {
    fontSize: 24,
    fontWeight: '900',
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