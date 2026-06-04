import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
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
  deleteActivityResult,
  getActivityResultsByActivity,
  getAllActivityResults,
} from '@/utils/activityResultsDb';

const ACTIVITY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'activity-one', label: 'Activity 1' },
  { key: 'activity-two', label: 'Activity 2' },
  { key: 'activity-three', label: 'Activity 3' },
  { key: 'activity-four', label: 'Activity 4' },
  { key: 'activity-five', label: 'Activity 5' },
  { key: 'activity-six', label: 'Activity 6' },
  { key: 'activity-seven', label: 'Activity 7' },
];

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function parseData(dataJson: string) {
  try {
    return JSON.parse(dataJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getResultSummary(record: ActivityResultRecord) {
  const data = parseData(record.dataJson);

  if (record.activityKey === 'activity-one') {
    const speed = data.finalSpeedMetresPerSecond;
    const gForce = data.gForce;
    const safety = data.safetyMessage;

    if (typeof gForce === 'number') {
      return `Speed: ${Number(speed).toFixed(2)} m/s | G-force: ${gForce.toFixed(
        2
      )} g`;
    }

    if (typeof speed === 'number') {
      return `Speed: ${speed.toFixed(2)} m/s`;
    }

    if (typeof safety === 'string') {
      return safety;
    }
  }

  if (record.activityKey === 'activity-two') {
    const db = data.maximumSoundDb;
    const risk = data.hearingRisk;

    if (typeof db === 'number') {
      return `Maximum sound: ${db.toFixed(1)} dB${
        typeof risk === 'string' ? ` | ${risk}` : ''
      }`;
    }
  }

  if (record.activityKey === 'activity-three') {
    const force = data.approximateForce;
    const material = data.targetMaterial;

    if (typeof force === 'number') {
      return `Approx. force: ${force.toFixed(3)} N${
        typeof material === 'string' ? ` | ${material}` : ''
      }`;
    }
  }

  return `Score: ${record.score.toFixed(2)}`;
}

export default function ResultHistoryScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ activityKey?: string }>();

  const initialFilter =
    typeof params.activityKey === 'string' ? params.activityKey : 'all';

  const [selectedFilter, setSelectedFilter] = useState(initialFilter);
  const [results, setResults] = useState<ActivityResultRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const selectedFilterLabel = useMemo(() => {
    return (
      ACTIVITY_FILTERS.find((filter) => filter.key === selectedFilter)?.label ||
      'All'
    );
  }, [selectedFilter]);

  const loadResults = useCallback(async () => {
    try {
      setIsLoading(true);

      const loadedResults =
        selectedFilter === 'all'
          ? await getAllActivityResults()
          : await getActivityResultsByActivity(selectedFilter);

      setResults(loadedResults);
    } catch (error) {
      console.log('Failed to load result history:', error);
      Alert.alert('Load Failed', 'Result history could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFilter]);

  useFocusEffect(
    useCallback(() => {
      loadResults();
    }, [loadResults])
  );

  const confirmDelete = (record: ActivityResultRecord) => {
    Alert.alert(
      'Delete Result',
      `Delete "${record.label}" from Result History?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteActivityResult(record.id);
            await loadResults();
          },
        },
      ]
    );
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Result History</Text>

        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          View saved overall results from the STEMM Lab activities.
        </Text>
      </View>

      <View style={styles.filterRow}>
        {ACTIVITY_FILTERS.map((filter) => {
          const selected = selectedFilter === filter.key;

          return (
            <Pressable
              key={filter.key}
              onPress={() => setSelectedFilter(filter.key)}
              style={({ pressed }) => [
                styles.filterButton,
                {
                  borderColor: selected ? colors.tint : colors.border,
                  backgroundColor: selected
                    ? `${colors.tint}20`
                    : colors.card,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: selected ? colors.tint : colors.text },
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          styles.summaryCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.summaryTitle, { color: colors.text }]}>
          {selectedFilterLabel}
        </Text>

        <Text style={[styles.summaryText, { color: colors.subtitle }]}>
          {isLoading
            ? 'Loading results...'
            : `${results.length} saved result${results.length === 1 ? '' : 's'}`}
        </Text>
      </View>

      {results.length === 0 && !isLoading ? (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Results Yet
          </Text>

          <Text style={[styles.emptyText, { color: colors.subtitle }]}>
            Save an overall result from Activity 1, 2, or 3 to see it here.
          </Text>
        </View>
      ) : null}

      <View style={styles.resultList}>
        {results.map((record) => (
          <View
            key={record.id}
            style={[
              styles.resultCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.resultHeader}>
              <View style={styles.resultTitleBox}>
                <Text style={[styles.activityTitle, { color: colors.text }]}>
                  {record.activityTitle}
                </Text>

                <Text style={[styles.resultLabel, { color: colors.subtitle }]}>
                  {record.label}
                </Text>
              </View>

              <Text style={[styles.score, { color: colors.success }]}>
                {record.score.toFixed(2)}
              </Text>
            </View>

            <Text style={[styles.resultSummary, { color: colors.subtitle }]}>
              {getResultSummary(record)}
            </Text>

            <Text style={[styles.dateText, { color: colors.subtitle }]}>
              {formatDate(record.createdAt)}
            </Text>

            <View style={styles.actionRow}>
              <Pressable
                onPress={() =>
                  router.push(`/result-summary?resultId=${record.id}` as never)
                }
                style={({ pressed }) => [
                  styles.smallButton,
                  { borderColor: colors.tint },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.smallButtonText, { color: colors.tint }]}>
                  View Summary
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push(
                    `/leaderboard?activityKey=${record.activityKey}` as never
                  )
                }
                style={({ pressed }) => [
                  styles.smallButton,
                  { borderColor: colors.tint },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.smallButtonText, { color: colors.tint }]}>
                  Leaderboard
                </Text>
              </Pressable>

              <Pressable
                onPress={() => confirmDelete(record)}
                style={({ pressed }) => [
                  styles.smallButton,
                  { borderColor: colors.danger },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.smallButtonText, { color: colors.danger }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  filterButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '900',
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  summaryText: {
    marginTop: 4,
    fontSize: 14,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
  },
  resultList: {
    gap: 14,
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  resultTitleBox: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  resultLabel: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
  },
  score: {
    fontSize: 18,
    fontWeight: '900',
  },
  resultSummary: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  dateText: {
    marginTop: 8,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  smallButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
});