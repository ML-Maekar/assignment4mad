import { router } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const screens = [
  {
    title: 'Screen 1',
    description: 'Open the first section',
    route: '/screen-one',
  },
  {
    title: 'Screen 2',
    description: 'Open the second section',
    route: '/screen-two',
  },
  {
    title: 'Screen 3',
    description: 'Open the third section',
    route: '/screen-three',
  },
  {
    title: 'Screen 4',
    description: 'Open the fourth section',
    route: '/screen-four',
  },
  {
    title: 'Screen 5',
    description: 'Open the fifth section',
    route: '/screen-five',
  },
  {
    title: 'Screen 6',
    description: 'Open the sixth section',
    route: '/screen-six',
  },
  {
    title: 'Screen 7',
    description: 'Open the seventh section',
    route: '/screen-seven',
  },
];

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>Choose a section to continue</Text>
      </View>

      <View style={styles.tabsContainer}>
        {screens.map((screen, index) => (
          <Pressable
            key={screen.title}
            style={({ pressed }) => [
              styles.tab,
              pressed && styles.tabPressed,
            ]}
            onPress={() => router.push(screen.route as any)}
          >
            <View style={styles.numberCircle}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>

            <View style={styles.tabTextContainer}>
              <Text style={styles.tabTitle}>{screen.title}</Text>
              <Text style={styles.tabDescription}>{screen.description}</Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#6B7280',
  },
  tabsContainer: {
    gap: 14,
  },
  tab: {
    minHeight: 82,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 4,
  },
  tabPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  numberCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  tabTextContainer: {
    flex: 1,
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  tabDescription: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  arrow: {
    fontSize: 34,
    color: '#9CA3AF',
    marginLeft: 12,
  },
});