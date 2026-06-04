import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import {
  CommentRating,
  getCommentsRatingsByActivity,
  saveCommentRating,
} from '@/services/commentsRatingsService';
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

function renderStars(
  rating: number,
  onPress: (star: number) => void,
  tintColor: string,
  borderColor: string
) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onPress(star)}
          style={starStyles.star}
        >
          <Text
            style={[
              starStyles.starText,
              { color: star <= rating ? tintColor : borderColor },
            ]}
          >
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  star: {
    padding: 4,
  },
  starText: {
    fontSize: 36,
    fontWeight: '900',
  },
});

export default function ResultSummaryScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams();

  const resultIdParam = Array.isArray(params.resultId)
    ? params.resultId[0]
    : params.resultId;

  const resultId = Number(resultIdParam);

  const [result, setResult] = useState<ActivityResultRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Comments and ratings state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);
  const [existingComments, setExistingComments] = useState<CommentRating[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

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

  // Load existing comments when result loads
  useEffect(() => {
    if (!result?.activityKey) {
      return;
    }

    async function loadComments() {
      try {
        setLoadingComments(true);
        const comments = await getCommentsRatingsByActivity(result!.activityKey);
        setExistingComments(comments);
      } catch (error) {
        console.log('Failed to load comments:', error);
      } finally {
        setLoadingComments(false);
      }
    }

    loadComments();
  }, [result]);

  const handleSaveComment = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please tap a star to give a rating.');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Comment Required', 'Please write a short comment.');
      return;
    }

    if (!result) {
      return;
    }

    try {
      setIsSavingComment(true);

      await saveCommentRating({
        activityKey: result.activityKey,
        activityTitle: result.activityTitle,
        rating,
        comment,
      });

      setCommentSaved(true);

      // Reload comments to show the new one
      const updated = await getCommentsRatingsByActivity(result.activityKey);
      setExistingComments(updated);

      Alert.alert('Comment Saved', 'Your rating and comment have been saved.');
    } catch (error) {
      console.log('Failed to save comment:', error);
      Alert.alert('Save Failed', 'Could not save your comment. Please try again.');
    } finally {
      setIsSavingComment(false);
    }
  };

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
          Your activity result has been saved.
        </Text>
      </View>

      {/* Score Card */}
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

      {/* Result Details */}
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

      {/* Comments and Ratings */}
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
          Rate This Activity
        </Text>

        {commentSaved ? (
          <Text style={[styles.savedText, { color: colors.success }]}>
            ✓ Your rating and comment have been saved.
          </Text>
        ) : (
          <>
            <Text style={[styles.detailLabel, { color: colors.subtitle }]}>
              Tap to rate
            </Text>

            {renderStars(rating, setRating, colors.tint, colors.border)}

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Write a short comment about this activity..."
              placeholderTextColor={colors.subtitle}
              multiline
              style={[
                styles.commentInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            />

            <Pressable
              onPress={handleSaveComment}
              disabled={isSavingComment}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: isSavingComment
                    ? colors.subtitle
                    : colors.tint,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.buttonText }]}>
                {isSavingComment ? 'Saving...' : 'Save Rating & Comment'}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Existing Comments from other teams */}
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
          What Other Teams Said
        </Text>

        {loadingComments ? (
          <ActivityIndicator size="small" color={colors.tint} />
        ) : existingComments.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.subtitle }]}>
            No comments yet. Be the first to rate this activity.
          </Text>
        ) : (
          existingComments.map((item) => (
            <View
              key={item.id}
              style={[styles.commentRow, { borderColor: colors.border }]}
            >
              <View style={styles.commentHeader}>
                <Text style={[styles.commentRating, { color: colors.tint }]}>
                  {'★'.repeat(item.rating)}
                  {'☆'.repeat(5 - item.rating)}
                </Text>

                <Text style={[styles.commentDate, { color: colors.subtitle }]}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>

              <Text style={[styles.commentText, { color: colors.text }]}>
                {item.comment}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Action Buttons */}
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
  commentInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  savedText: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  commentRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentRating: {
    fontSize: 18,
    fontWeight: '900',
  },
  commentDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
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