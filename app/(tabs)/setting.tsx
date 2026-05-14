import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  ThemePreference,
  useAppTheme,
} from '@/contexts/AppThemeContext';

type ThemeOption = {
  label: string;
  value: ThemePreference;
  description: string;
};

const themeOptions: ThemeOption[] = [
  {
    label: 'Use Device Theme',
    value: 'system',
    description: 'Automatically follows your phone light or dark mode setting.',
  },
  {
    label: 'Light Mode',
    value: 'light',
    description: 'Always use the light theme.',
  },
  {
    label: 'Dark Mode',
    value: 'dark',
    description: 'Always use the dark theme.',
  },
];

export default function SettingScreen() {
  const { colors, themePreference, activeTheme, setThemePreference } =
    useAppTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Choose how STEMM Lab should appear on this device.
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
          App Theme
        </Text>

        <Text style={[styles.sectionDescription, { color: colors.subtitle }]}>
          Active theme: {activeTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
        </Text>

        <View style={styles.optionsContainer}>
          {themeOptions.map((option) => {
            const selected = themePreference === option.value;

            return (
              <Pressable
                key={option.value}
                onPress={() => setThemePreference(option.value)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderColor: selected ? colors.tint : colors.border,
                    backgroundColor: selected
                      ? `${colors.tint}20`
                      : colors.background,
                  },
                  pressed && styles.optionPressed,
                ]}
              >
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    {option.label}
                  </Text>

                  <Text
                    style={[
                      styles.optionDescription,
                      { color: colors.subtitle },
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    {
                      borderColor: selected ? colors.tint : colors.subtitle,
                    },
                  ]}
                >
                  {selected && (
                    <View
                      style={[
                        styles.radioInner,
                        {
                          backgroundColor: colors.tint,
                        },
                      ]}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.infoTitle, { color: colors.text }]}>
          How this works
        </Text>

        <Text style={[styles.infoText, { color: colors.subtitle }]}>
          Device theme follows your phone settings. Light Mode and Dark Mode
          override the phone setting and stay saved when you close the app.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
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
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  sectionDescription: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  optionsContainer: {
    marginTop: 18,
    gap: 12,
  },
  option: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  optionTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  optionDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoCard: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  infoText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
});