import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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

type PermissionKey =
  | 'camera'
  | 'microphone'
  | 'location'
  | 'motion'
  | 'notifications'
  | 'media'
  | 'battery'
  | 'backgroundTasks'
  | 'ads';

type PermissionOption = {
  key: PermissionKey;
  title: string;
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

const permissionOptions: PermissionOption[] = [
  {
    key: 'camera',
    title: 'Camera',
    description: 'Used to record experiment videos and upload activity evidence.',
  },
  {
    key: 'microphone',
    title: 'Microphone',
    description: 'Used for the Sound Pollution Hunter activity.',
  },
  {
    key: 'location',
    title: 'Location / GPS',
    description: 'Used to tag activity results with location data.',
  },
  {
    key: 'motion',
    title: 'Motion Sensors',
    description: 'Used for accelerometer, gyroscope, vibration and movement activities.',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description: 'Used for challenge reminders, timers and activity alerts.',
  },
  {
    key: 'media',
    title: 'Media Storage',
    description: 'Used to save or select videos, images and activity files.',
  },
  {
    key: 'battery',
    title: 'Battery Status',
    description: 'Used to show device battery information during activities.',
  },
  {
    key: 'backgroundTasks',
    title: 'Background Tasks',
    description: 'Used for future task manager and work manager features.',
  },
  {
    key: 'ads',
    title: 'AdMob / Ads',
    description: 'Used later for test ads and AdMob integration.',
  },
];

const initialPermissions: Record<PermissionKey, boolean> = {
  camera: false,
  microphone: false,
  location: false,
  motion: false,
  notifications: false,
  media: false,
  battery: false,
  backgroundTasks: false,
  ads: false,
};

export default function SettingScreen() {
  const { colors, themePreference, activeTheme, setThemePreference } =
    useAppTheme();

  const [permissions, setPermissions] =
    useState<Record<PermissionKey, boolean>>(initialPermissions);

  const handlePermissionToggle = (permission: PermissionOption) => {
    const isEnabled = permissions[permission.key];

    if (isEnabled) {
      Alert.alert(
        `Remove ${permission.title} Permission?`,
        `STEMM Lab may not be able to use ${permission.title.toLowerCase()} features if this is turned off. Do you want to continue?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Turn Off',
            style: 'destructive',
            onPress: () => {
              setPermissions((currentPermissions) => ({
                ...currentPermissions,
                [permission.key]: false,
              }));
            },
          },
        ]
      );

      return;
    }

    Alert.alert(
      `Allow ${permission.title}?`,
      `STEMM Lab would like to use ${permission.title.toLowerCase()} for app activities. Do you want to turn this on?`,
      [
        {
          text: 'Not Now',
          style: 'cancel',
        },
        {
          text: 'Allow',
          onPress: () => {
            setPermissions((currentPermissions) => ({
              ...currentPermissions,
              [permission.key]: true,
            }));
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Manage app appearance, permissions and future STEMM Lab features.
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
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Permissions
        </Text>

        <Text style={[styles.sectionDescription, { color: colors.subtitle }]}>
          Turn planned app permissions on or off. Real device permission requests
          will be connected during implementation.
        </Text>

        <View style={styles.permissionContainer}>
          {permissionOptions.map((permission) => {
            const enabled = permissions[permission.key];

            return (
              <View
                key={permission.key}
                style={[
                  styles.permissionRow,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <View style={styles.permissionTextContainer}>
                  <Text
                    style={[
                      styles.permissionTitle,
                      {
                        color: colors.text,
                      },
                    ]}
                  >
                    {permission.title}
                  </Text>

                  <Text
                    style={[
                      styles.permissionDescription,
                      {
                        color: colors.subtitle,
                      },
                    ]}
                  >
                    {permission.description}
                  </Text>

                  <Text
                    style={[
                      styles.permissionStatus,
                      {
                        color: enabled ? colors.success : colors.warning,
                      },
                    ]}
                  >
                    {enabled ? 'Enabled' : 'Off'}
                  </Text>
                </View>

                <Switch
                  value={enabled}
                  onValueChange={() => handlePermissionToggle(permission)}
                  trackColor={{
                    false: colors.border,
                    true: `${colors.tint}80`,
                  }}
                  thumbColor={enabled ? colors.tint : colors.subtitle}
                />
              </View>
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
          Permission note
        </Text>

        <Text style={[styles.infoText, { color: colors.subtitle }]}>
          These switches currently prepare the UI only. Later, each switch will
          connect to the real phone permission system for camera, microphone,
          location, motion sensors, notifications and storage.
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
    marginBottom: 18,
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
  permissionContainer: {
    marginTop: 18,
    gap: 12,
  },
  permissionRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionTextContainer: {
    flex: 1,
    paddingRight: 14,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  permissionDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  permissionStatus: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  infoCard: {
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