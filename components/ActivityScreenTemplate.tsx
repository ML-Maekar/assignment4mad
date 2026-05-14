import React from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';

import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';

type ActivityScreenTemplateProps = {
  activityNumber: number;
  title: string;
  category: string;
  overview: string;
  equipment: string[];
  instructions: string[];
};

export default function ActivityScreenTemplate({
  activityNumber,
  title,
  category,
  overview,
  equipment,
  instructions,
}: ActivityScreenTemplateProps) {
  const { colors } = useAppTheme();

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.badge, { color: colors.tint }]}>
          Activity {activityNumber}
        </Text>

        <Text style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>

        <Text style={[styles.category, { color: colors.subtitle }]}>
          {category}
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Overview
        </Text>

        <Text style={[styles.bodyText, { color: colors.subtitle }]}>
          {overview}
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Equipment
        </Text>

        {equipment.map((item) => (
          <Text
            key={item}
            style={[styles.listText, { color: colors.subtitle }]}
          >
            • {item}
          </Text>
        ))}
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Instructions
        </Text>

        {instructions.map((item, index) => (
          <Text
            key={item}
            style={[styles.listText, { color: colors.subtitle }]}
          >
            {index + 1}. {item}
          </Text>
        ))}
      </View>

      <View
        style={[
          styles.placeholderCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Data Collection
        </Text>

        <Text style={[styles.bodyText, { color: colors.subtitle }]}>
          Inputs, timers, sensor readings, uploads and results will be added in
          the implementation phase.
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  badge: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  category: {
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
  placeholderCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  listText: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 6,
  },
});
