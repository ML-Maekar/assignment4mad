import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';

export default function ActivityThreeGame() {
  const { colors } = useAppTheme();

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Fan Challenge
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Working activity screen will be built here.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Coming Soon
        </Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Bend angle input, distance testing, material comparison and result
          saving will be added here.
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '900' },
  subtitle: { marginTop: 8, fontSize: 16, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: 22, padding: 18 },
  cardTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
});