import { router } from 'expo-router';
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';

const screens = [
  {
    title: 'Parachute Drop Challenge',
    description: 'Engineering + Physics',
    route: '/screen-one',
  },
  {
    title: 'Sound Pollution Hunter',
    description: 'Environmental Science',
    route: '/screen-two',
  },
  {
    title: 'Hand Fan Challenge',
    description: 'Physics – Air Movement',
    route: '/screen-three',
  },
  {
    title: 'Earthquake-Resistant Structure',
    description: 'Engineering + Earth Science',
    route: '/screen-four',
  },
  {
    title: 'Human Performance Lab',
    description: 'Medical Science + Biomechanics',
    route: '/screen-five',
  },
  {
    title: 'Reaction Board Challenge',
    description: 'Neuroscience + Mathematics',
    route: '/screen-six',
  },
  {
    title: 'Breathing Pace Trainer',
    description: 'Medical Science',
    route: '/screen-seven',
  },
];

// Lazy load AdMob only in native builds — not in Expo Go
// AdMob requires native binary which Expo Go does not include
let BannerAd: any = null;
let BannerAdSize: any = null;

try {
  const admob = require('react-native-google-mobile-ads');
  BannerAd = admob.BannerAd;
  BannerAdSize = admob.BannerAdSize;
} catch {
  // AdMob not available in Expo Go — silently skip
}

const BANNER_AD_UNIT_ID = 'ca-app-pub-2966645425515948/1766364031';

export default function HomeScreen() {
  const { colors } = useAppTheme();

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>STEMM Lab</Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Choose an activity to start your STEMM challenge.
        </Text>
      </View>

      <View style={styles.tabsContainer}>
        {screens.map((screen, index) => (
          <Pressable
            key={screen.title}
            style={({ pressed }) => [
              styles.tab,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && styles.tabPressed,
            ]}
            onPress={() => router.push(screen.route as never)}
          >
            <View style={[styles.numberCircle, { backgroundColor: colors.tint }]}>
              <Text style={[styles.numberText, { color: colors.buttonText }]}>
                {index + 1}
              </Text>
            </View>

            <View style={styles.tabTextContainer}>
              <Text style={[styles.tabTitle, { color: colors.text }]}>
                {screen.title}
              </Text>
              <Text style={[styles.tabDescription, { color: colors.subtitle }]}>
                {screen.description}
              </Text>
            </View>

            <Text style={[styles.arrow, { color: colors.subtitle }]}>›</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.resultsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Results</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.subtitle }]}>
          View saved activity attempts and compare scores across activities.
        </Text>

        <Pressable
          onPress={() => router.push('/result-history' as never)}
          style={({ pressed }) => [
            styles.resultOutlineButton,
            { backgroundColor: colors.card, borderColor: colors.tint },
            pressed && styles.tabPressed,
          ]}
        >
          <View style={styles.resultButtonTextContainer}>
            <Text style={[styles.resultButtonTitle, { color: colors.tint }]}>
              Result History
            </Text>
            <Text style={[styles.resultButtonDescription, { color: colors.subtitle }]}>
              View all saved attempts from newest to oldest
            </Text>
          </View>
          <Text style={[styles.resultArrow, { color: colors.tint }]}>›</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/leaderboard' as never)}
          style={({ pressed }) => [
            styles.resultOutlineButton,
            { backgroundColor: colors.card, borderColor: colors.tint },
            pressed && styles.tabPressed,
          ]}
        >
          <View style={styles.resultButtonTextContainer}>
            <Text style={[styles.resultButtonTitle, { color: colors.tint }]}>
              Leaderboard
            </Text>
            <Text style={[styles.resultButtonDescription, { color: colors.subtitle }]}>
              Rank results by highest score across all activities
            </Text>
          </View>
          <Text style={[styles.resultArrow, { color: colors.tint }]}>›</Text>
        </Pressable>
      </View>

      {/* AdMob Banner — only renders in native APK build, not Expo Go */}
      {BannerAd && BannerAdSize && Platform.OS !== 'web' && (
        <View style={styles.adContainer}>
          <BannerAd
            unitId={BANNER_AD_UNIT_ID}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            onAdFailedToLoad={(error: any) => console.log('Ad failed to load:', error)}
          />
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 28 },
  title: { fontSize: 34, fontWeight: '800' },
  subtitle: { marginTop: 8, fontSize: 16, lineHeight: 22 },
  tabsContainer: { gap: 14 },
  tab: {
    minHeight: 82,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  tabPressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },
  numberCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  numberText: { fontSize: 17, fontWeight: '700' },
  tabTextContainer: { flex: 1 },
  tabTitle: { fontSize: 17, fontWeight: '700' },
  tabDescription: { marginTop: 4, fontSize: 14 },
  arrow: { fontSize: 34, marginLeft: 12 },
  resultsSection: { marginTop: 30, gap: 14 },
  sectionTitle: { fontSize: 24, fontWeight: '900' },
  sectionSubtitle: { marginTop: -6, fontSize: 15, lineHeight: 21 },
  resultOutlineButton: {
    minHeight: 82,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  resultButtonTextContainer: { flex: 1 },
  resultButtonTitle: { fontSize: 17, fontWeight: '900' },
  resultButtonDescription: { marginTop: 4, fontSize: 14, fontWeight: '600' },
  resultArrow: { fontSize: 34, marginLeft: 12 },
  adContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
});