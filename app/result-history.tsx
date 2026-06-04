import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
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
  getFirestoreResultHistory,
  getFirestoreResultsByActivity,
} from '@/services/resultHistoryService';
import {
  ActivityResultRecord,
  deleteActivityResult,
} from '@/utils/activityResultsDb';

type ActivityFilter = {
  label: string;
  key: string | null;
};

const ACTIVITY_FILTERS: ActivityFilter[] = [
  { label: 'All Activities', key: null },
  { label: 'Activity 1', key: 'activity-one' },
  { label: 'Activity 2', key: 'activity-two' },
  { label: 'Activity 3', key: 'activity-three' },
  { label: 'Activity 4', key: 'activity-four' },
  { label: 'Activity 5', key: 'activity-five' },
  { label: 'Activity 6', key: 'activity-six' },
  { label: 'Activity 7', key: 'activity-seven' },
];

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getFilterLabel(activityKey: string | null) {
  return (
    ACTIVITY_FILTERS.find((filter) => filter.key === activityKey)?.label ??
    'All Activities'
  );
}

export default function ResultHistoryScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams();

  const activityKeyParam = Array.isArray(params.activityKey)
    ? params.activityKey[0]
    : params.activityKey;

  const [selectedActivityKey, setSelectedActivityKey] = useState<string | null>(
    activityKeyParam ?? null
  );
  const [results, setResults] = useState<ActivityResultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'firestore' | 'sqlite'>('sqlite');

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);

      if (selectedActivityKey) {
        const { results: fetchedResults, source } =
          await getFirestoreResultsByActivity(selectedActivityKey);
        setResults(fetchedResults);
        setDataSource(source);
      } else {
        const { results: fetchedResults, source } =
          await getFirestoreResultHistory();
        setResults(fetchedResults);
        setDataSource(source);
      }
    } catch (error) {
      console.log('Failed to load result history:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [selectedActivityKey]);

  useFocusEffect(
    useCallback(() => {
      loadResults();
    }, [loadResults])
  );

  const selectFilter = (activityKey: string | null) => {
    setSelectedActivityKey(activityKey);
  };

  const openResultSummary = (resultId: number) => {
    router.push(`/result-summary?resultId=${resultId}` as never);
  };

  const openLeaderboard = (activityKey: string) => {
    router.push(`/leaderboard?activityKey=${activityKey}` as never);
  };

  const deleteResult = (result: ActivityResultRecord) => {
    Alert.alert(
      'Delete Result?',
      `This will delete "${result.label}" from your saved history.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteActivityResult(result.id);
              await loadResults();
            } catch (error) {
              console.log('Failed to delete result:', error);
              Alert.alert(
                'Delete Failed',
                'The result could not be deleted. Please try again.'
              );
            }
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
          Loading result history...
        </Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Result History
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          View saved attempts from newest to oldest.
        </Text>
        <Text
          style={[
            styles.sourceText,
            {
              color:
                dataSource === 'firestore' ? colors.success : colors.subtitle,
            },
          ]}
        >
          {dataSource === 'firestore'
            ? '● Synced from cloud'
            : '● Showing local results'}
        </Text>
      </View>

      <View
        style={[
          styles.filterCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Filter Results
        </Text>

        <View style={styles.filterGrid}>
          {ACTIVITY_FILTERS.map((filter) => {
            const isSelected = selectedActivityKey === filter.key;

            return (
              <Pressable
                key={filter.label}
                onPress={() => selectFilter(filter.key)}
                style={({ pressed }) => [
                  styles.filterButton,
                  {
                    borderColor: isSelected ? colors.tint : colors.border,
                    backgroundColor: isSelected
                      ? `${colors.tint}20`
                      : colors.background,
                  },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    {
                      color: isSelected ? colors.tint : colors.text,
                    },
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
          {getFilterLabel(selectedActivityKey)} Attempts
        </Text>

        {results.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.subtitle }]}>
            No saved results yet for {getFilterLabel(selectedActivityKey)}.
            Complete an activity to save your first attempt.
          </Text>
        ) : (
          results.map((result) => (
            <View
              key={result.id}
              style={[
                styles.resultRow,
                {
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.resultTopRow}>
                <View style={styles.resultTextArea}>
                  <Text style={[styles.resultTitle, { color: colors.text }]}>
                    {result.label}
                  </Text>

                  <Text style={[styles.resultMeta, { color: colors.subtitle }]}>
                    {result.activityTitle}
                  </Text>

                  <Text style={[styles.resultMeta, { color: colors.subtitle }]}>
                    Saved: {formatDateTime(result.createdAt)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.scoreBadge,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.scoreText, { color: colors.success }]}>
                    {Math.round(result.score)}
                  </Text>
                  <Text style={[styles.scoreLabel, { color: colors.subtitle }]}>
                    score
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => openResultSummary(result.id)}
                  style={({ pressed }) => [
                    styles.smallButton,
                    { backgroundColor: colors.tint },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.smallButtonText,
                      { color: colors.buttonText },
                    ]}
                  >
                    Summary
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => openLeaderboard(result.activityKey)}
                  style={({ pressed }) => [
                    styles.smallOutlineButton,
                    { borderColor: colors.tint },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={[styles.smallButtonText, { color: colors.tint }]}>
                    Leaderboard
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => deleteResult(result)}
                  style={({ pressed }) => [
                    styles.smallOutlineButton,
                    { borderColor: colors.danger },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[styles.smallButtonText, { color: colors.danger }]}
                  >
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.buttonGroup}>
        <Pressable
          onPress={() => router.push('/leaderboard' as never)}
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
          onPress={loadResults}
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor: colors.tint },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>
            Refresh History
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
  sourceText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  filterCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '900',
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
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 14,
  },
  resultTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultTextArea: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  resultMeta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  scoreBadge: {
    width: 74,
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '900',
  },
  scoreLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  smallButton: {
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallOutlineButton: {
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButtonText: {
    fontSize: 13,
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