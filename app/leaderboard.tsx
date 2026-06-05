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
  getFirestoreLeaderboardAll,
  getFirestoreLeaderboardByActivity,
} from '@/services/leaderboardService';
import {
  ActivityResultRecord,
  clearActivityResultsByActivity,
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function getFilterLabel(activityKey: string | null) {
  return (
    ACTIVITY_FILTERS.find((filter) => filter.key === activityKey)?.label ??
    'All Activities'
  );
}

function getLocationText(result: ActivityResultRecord): string | null {
  try {
    const data = JSON.parse(result.dataJson ?? '{}') as Record<string, any>;
    const location = data.location;
    if (!location) return null;
    if (location.address) return location.address;
    if (location.latitude && location.longitude) {
      return `${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}`;
    }
    return null;
  } catch {
    return null;
  }
}

function getTeamName(result: ActivityResultRecord): string | null {
  try {
    const data = JSON.parse(result.dataJson ?? '{}') as Record<string, any>;
    return data.teamName ?? null;
  } catch {
    return null;
  }
}

export default function LeaderboardScreen() {
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

  const title = useMemo(() => {
    const filterLabel = getFilterLabel(selectedActivityKey);
    if (selectedActivityKey && results.length > 0) return `${results[0].activityTitle} Leaderboard`;
    if (selectedActivityKey) return `${filterLabel} Leaderboard`;
    return 'All Activities Leaderboard';
  }, [selectedActivityKey, results]);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      if (selectedActivityKey) {
        const { results: fetchedResults, source } =
          await getFirestoreLeaderboardByActivity(selectedActivityKey);
        setResults(fetchedResults);
        setDataSource(source);
      } else {
        const { results: fetchedResults, source } =
          await getFirestoreLeaderboardAll();
        setResults(fetchedResults);
        setDataSource(source);
      }
    } catch (error) {
      console.log('Failed to load leaderboard:', error);
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

  const clearResults = () => {
    if (!selectedActivityKey) {
      Alert.alert('Clear unavailable', 'Choose a specific activity before clearing results.');
      return;
    }
    Alert.alert(
      'Clear Leaderboard?',
      'This will delete saved results for this activity from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearActivityResultsByActivity(selectedActivityKey);
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
        <Text style={[styles.loadingText, { color: colors.subtitle }]}>Loading leaderboard...</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Rankings from all teams across all devices.
        </Text>
        <Text style={[styles.sourceText, { color: dataSource === 'firestore' ? colors.success : colors.subtitle }]}>
          {dataSource === 'firestore' ? '● Live from cloud' : '● Showing local results'}
        </Text>
      </View>

      {/* Filter Card */}
      <View style={[styles.filterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Filter Results</Text>
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
                    backgroundColor: isSelected ? `${colors.tint}20` : colors.background,
                  },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.filterButtonText, { color: isSelected ? colors.tint : colors.text }]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Rankings Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Rankings</Text>

        {results.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.subtitle }]}>
            No saved results yet for {getFilterLabel(selectedActivityKey)}.
            Complete an activity to appear on the leaderboard.
          </Text>
        ) : (
          results.map((result, index) => {
            const locationText = getLocationText(result);
            const teamName = getTeamName(result);
            return (
              <View
                key={`${result.id}-${index}`}
                style={[styles.resultRow, { borderColor: colors.border }]}
              >
                <View
                  style={[
                    styles.rankBadge,
                    {
                      backgroundColor:
                        index === 0
                          ? colors.success
                          : index === 1
                            ? colors.tint
                            : index === 2
                              ? colors.warning ?? colors.subtitle
                              : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.rankText, { color: index <= 2 ? colors.buttonText : colors.text }]}>
                    #{index + 1}
                  </Text>
                </View>

                <View style={styles.resultInfo}>
                  <Text style={[styles.resultTitle, { color: colors.text }]}>
                    {result.label}
                  </Text>

                  {/* Team name */}
                  {teamName && (
                    <Text style={[styles.teamName, { color: colors.tint }]}>
                      🏷 {teamName}
                    </Text>
                  )}

                  {!selectedActivityKey && (
                    <Text style={[styles.resultMeta, { color: colors.subtitle }]}>
                      {result.activityTitle}
                    </Text>
                  )}

                  <Text style={[styles.resultMeta, { color: colors.subtitle }]}>
                    Saved: {formatDate(result.createdAt)}
                  </Text>

                  {/* GPS location — only shown if recorded */}
                  {locationText && (
                    <Text style={[styles.locationText, { color: colors.subtitle }]}>
                      📍 {locationText}
                    </Text>
                  )}
                </View>

                <Text style={[styles.score, { color: colors.success }]}>
                  {Math.round(result.score)}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* Buttons */}
      <View style={styles.buttonGroup}>
        <Pressable
          onPress={loadResults}
          style={({ pressed }) => [styles.button, { backgroundColor: colors.tint }, pressed && styles.buttonPressed]}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>Refresh Leaderboard</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/result-history' as never)}
          style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.tint }, pressed && styles.buttonPressed]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>View Result History</Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.tint }, pressed && styles.buttonPressed]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>Back</Text>
        </Pressable>

        {selectedActivityKey && results.length > 0 && (
          <Pressable
            onPress={clearResults}
            style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.danger }, pressed && styles.buttonPressed]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.danger }]}>Clear Activity Results</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.replace('/(tabs)/home' as never)}
          style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, pressed && styles.buttonPressed]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Home</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, fontWeight: '700' },
  header: { marginBottom: 24 },
  title: { fontSize: 30, fontWeight: '900' },
  subtitle: { marginTop: 8, fontSize: 16, lineHeight: 22 },
  sourceText: { marginTop: 6, fontSize: 13, fontWeight: '700' },
  filterCard: { borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 16 },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterButton: { borderWidth: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
  filterButtonText: { fontSize: 13, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: '900', marginBottom: 14 },
  emptyText: { fontSize: 15, lineHeight: 22 },
  resultRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 14, marginTop: 14, gap: 12 },
  rankBadge: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 14, fontWeight: '900' },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 16, fontWeight: '900' },
  teamName: { marginTop: 3, fontSize: 13, fontWeight: '800' },
  resultMeta: { marginTop: 3, fontSize: 13, fontWeight: '600' },
  locationText: { marginTop: 3, fontSize: 12, fontWeight: '600' },
  score: { fontSize: 24, fontWeight: '900' },
  buttonGroup: { gap: 12 },
  button: { minHeight: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  secondaryButton: { minHeight: 52, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },
  buttonText: { fontSize: 16, fontWeight: '900' },
  secondaryButtonText: { fontSize: 16, fontWeight: '900' },
});