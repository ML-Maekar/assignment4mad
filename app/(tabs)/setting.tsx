import SensorServicePanel from '@/components/SensorServicePanel';
import {
  ThemePreference,
  useAppTheme,
} from '@/contexts/AppThemeContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  cancelAllScheduledNotifications,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  scheduleChallengeReminder,
  scheduleTestNotification,
} from '@/utils/notifications';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

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
    description: 'Required for Activities 1 and 3 — record video and take photos of experiments.',
  },
  {
    key: 'microphone',
    title: 'Microphone',
    description: 'Required for Activity 2 — record and measure classroom sound levels.',
  },
  {
    key: 'location',
    title: 'Location / GPS',
    description: 'Used to tag activity results with location data.',
  },
  {
    key: 'motion',
    title: 'Motion Sensors',
    description: 'Required for Activities 4, 5, and 7 — accelerometer, vibration and breathing.',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description: 'Used for challenge reminders, timers and activity alerts.',
  },
  {
    key: 'media',
    title: 'Media Storage',
    description: 'Required for Activities 1 and 3 — saves recorded videos and photos to your device gallery and enables picking existing media.',
  },
  {
    key: 'battery',
    title: 'Battery Status',
    description: 'Shows live battery level and charging status across the app.',
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
  battery: true,
  backgroundTasks: false,
  ads: false,
};

// Permissions that are fully wired to the real permission system
const CONNECTED_PERMISSIONS: PermissionKey[] = [
  'camera',
  'microphone',
  'motion',
  'battery',
  'notifications',
  'media',
];

export default function SettingScreen() {
  const { colors, themePreference, activeTheme, setThemePreference } =
    useAppTheme();

  const {
    motionGranted,
    batteryGranted,
    cameraGranted,
    micGranted,
    mediaLibraryGranted,
    enableMotionFromSettings,
    disableMotionFromSettings,
    enableBattery,
    disableBattery,
    enableCameraFromSettings,
    disableCameraFromSettings,
    enableMicFromSettings,
    disableMicFromSettings,
    enableMediaLibraryFromSettings,
    disableMediaLibraryFromSettings,
  } = usePermissions();

  const [permissions, setPermissions] =
    useState<Record<PermissionKey, boolean>>(initialPermissions);

  useEffect(() => {
    async function loadPermissionStatuses() {
      const status = await getNotificationPermissionStatus();

      setPermissions((current) => ({
        ...current,
        notifications: status === 'granted',
        motion: motionGranted,
        battery: batteryGranted,
        camera: cameraGranted,
        microphone: micGranted,
        media: mediaLibraryGranted,
      }));
    }

    loadPermissionStatuses();
  }, [motionGranted, batteryGranted, cameraGranted, micGranted, mediaLibraryGranted]);

  const updatePermission = (key: PermissionKey, value: boolean) => {
    setPermissions((currentPermissions) => ({
      ...currentPermissions,
      [key]: value,
    }));
  };

  const handleNotificationToggle = () => {
    const isEnabled = permissions.notifications;

    if (isEnabled) {
      Alert.alert(
        'Turn Off Notifications?',
        'This will turn off notification reminders inside the app settings. To fully block notifications, you may also need to disable them in your phone settings.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Turn Off',
            style: 'destructive',
            onPress: async () => {
              await cancelAllScheduledNotifications();
              updatePermission('notifications', false);
            },
          },
        ]
      );

      return;
    }

    Alert.alert(
      'Allow Notifications?',
      'STEMM Lab would like to send challenge reminders, timer alerts and activity notifications.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
        },
        {
          text: 'Allow',
          onPress: async () => {
            const granted = await requestNotificationPermission();

            if (granted) {
              updatePermission('notifications', true);
              Alert.alert(
                'Notifications Enabled',
                'STEMM Lab can now schedule local notifications.'
              );
            } else {
              updatePermission('notifications', false);
              Alert.alert(
                'Permission Not Granted',
                'Notifications were not enabled. You can allow them later from your phone settings.'
              );
            }
          },
        },
      ]
    );
  };

  const handlePermissionToggle = (permission: PermissionOption) => {
    if (permission.key === 'notifications') {
      handleNotificationToggle();
      return;
    }

    // Motion sensors — connected to real permissionService
    if (permission.key === 'motion') {
      if (permissions.motion) {
        Alert.alert(
          'Turn Off Motion Sensors?',
          'Activities 4, 5, and 7 require motion sensors to work. Turning this off will block those activities.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Turn Off',
              style: 'destructive',
              onPress: async () => {
                await disableMotionFromSettings();
                updatePermission('motion', false);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Allow Motion Sensors?',
          'STEMM Lab needs motion sensors for the Earthquake, Performance Lab, and Breathing activities.',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Allow',
              onPress: async () => {
                const granted = await enableMotionFromSettings();
                updatePermission('motion', granted);
              },
            },
          ]
        );
      }
      return;
    }

    // Battery status — connected to real permissionService
    if (permission.key === 'battery') {
      if (permissions.battery) {
        Alert.alert(
          'Turn Off Battery Status?',
          'The battery widget will stop updating and show a frozen reading.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Turn Off',
              style: 'destructive',
              onPress: async () => {
                await disableBattery();
                updatePermission('battery', false);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Allow Battery Status?',
          'STEMM Lab will show live battery level and charging status.',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Allow',
              onPress: async () => {
                await enableBattery();
                updatePermission('battery', true);
              },
            },
          ]
        );
      }
      return;
    }

    // Camera — connected to real permissionService
    if (permission.key === 'camera') {
      if (permissions.camera) {
        Alert.alert(
          'Turn Off Camera?',
          'Activities 1 and 3 will not be able to record video or take photos until you turn this back on.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Turn Off',
              style: 'destructive',
              onPress: async () => {
                await disableCameraFromSettings();
                updatePermission('camera', false);
              },
            },
          ]
        );
      } else {
        enableCameraFromSettings().then((granted) => {
          updatePermission('camera', granted);
          if (granted) {
            Alert.alert(
              'Camera Enabled',
              'Activities 1 and 3 can now record video and take photos.'
            );
          }
        });
      }
      return;
    }

    // Microphone — connected to real permissionService
    if (permission.key === 'microphone') {
      if (permissions.microphone) {
        Alert.alert(
          'Turn Off Microphone?',
          'Activity 2 (Sound Pollution Hunter) will not be able to record sound until you turn this back on.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Turn Off',
              style: 'destructive',
              onPress: async () => {
                await disableMicFromSettings()
                updatePermission('microphone', false);
              },
            },
          ]
        );
      } else {
        enableMicFromSettings().then((granted) => {
          updatePermission('microphone', granted);
          if (granted) {
            Alert.alert(
              'Microphone Enabled',
              'Activity 2 can now record and measure sound.'
            );
          }
        });
      }
      return;
    }

    // Media Storage — connected to real permissionService
    // Controls: picking from gallery (Activities 1 & 3) and saving recorded
    // videos/photos to the device Camera Roll / STEMM Lab album.
    if (permission.key === 'media') {
      if (permissions.media) {
        Alert.alert(
          'Turn Off Media Storage?',
          'Activities 1 and 3 will no longer be able to choose existing videos or photos, and recorded videos will not be saved to your gallery.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Turn Off',
              style: 'destructive',
              onPress: async () => {
                await disableMediaLibraryFromSettings();
                updatePermission('media', false);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Allow Media Storage?',
          'STEMM Lab will save recorded videos and photos from Activities 1 and 3 to your device gallery, and let you choose existing media from your library.',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Allow',
              onPress: async () => {
                const granted = await enableMediaLibraryFromSettings();
                updatePermission('media', granted);
                if (granted) {
                  Alert.alert(
                    'Media Storage Enabled',
                    'Videos and photos from Activities 1 and 3 will now be saved to your gallery.'
                  );
                }
              },
            },
          ]
        );
      }
      return;
    }

    // All other permissions — UI placeholder for now
    const isEnabled = permissions[permission.key];

    if (isEnabled) {
      Alert.alert(
        `Remove ${permission.title} Permission?`,
        `STEMM Lab may not be able to use ${permission.title.toLowerCase()} features if this is turned off.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Turn Off',
            style: 'destructive',
            onPress: () => updatePermission(permission.key, false),
          },
        ]
      );
      return;
    }

    Alert.alert(
      `Allow ${permission.title}?`,
      `STEMM Lab would like to use ${permission.title.toLowerCase()} for app activities.`,
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Allow',
          onPress: () => updatePermission(permission.key, true),
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    const scheduled = await scheduleTestNotification();

    if (scheduled) {
      updatePermission('notifications', true);
      Alert.alert(
        'Test Scheduled',
        'A test notification should appear in about 5 seconds.'
      );
    } else {
      updatePermission('notifications', false);
      Alert.alert(
        'Notifications Disabled',
        'Notification permission was not granted.'
      );
    }
  };

  const handleChallengeReminder = async () => {
    const scheduled = await scheduleChallengeReminder();

    if (scheduled) {
      updatePermission('notifications', true);
      Alert.alert(
        'Reminder Scheduled',
        'A STEMM Lab challenge reminder should appear in about 15 seconds.'
      );
    } else {
      updatePermission('notifications', false);
      Alert.alert(
        'Notifications Disabled',
        'Notification permission was not granted.'
      );
    }
  };

  const handleCancelNotifications = () => {
    Alert.alert(
      'Cancel Scheduled Notifications?',
      'This will cancel all currently scheduled STEMM Lab notifications.',
      [
        {
          text: 'Keep',
          style: 'cancel',
        },
        {
          text: 'Cancel All',
          style: 'destructive',
          onPress: async () => {
            await cancelAllScheduledNotifications();
            Alert.alert(
              'Notifications Cancelled',
              'All scheduled notifications have been cancelled.'
            );
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
          Manage app appearance, permissions, notifications and device sensors.
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
          Camera, Microphone, Motion Sensors, Battery, Notifications, and Media
          Storage are connected to the real permission system. Toggling them
          here affects the whole app.
        </Text>

        <View style={styles.permissionContainer}>
          {permissionOptions.map((permission) => {
            const enabled = permissions[permission.key];
            const isConnected = CONNECTED_PERMISSIONS.includes(permission.key);

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
                        color: enabled
                          ? colors.success
                          : isConnected
                            ? colors.danger
                            : colors.subtitle,
                      },
                    ]}
                  >
                    {enabled
                      ? isConnected
                        ? '● Connected'
                        : 'Enabled'
                      : isConnected
                        ? '● Blocked'
                        : 'Off'}
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

      <SensorServicePanel />

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
          Notification Tools
        </Text>

        <Text style={[styles.sectionDescription, { color: colors.subtitle }]}>
          Use these buttons to test local notifications and challenge reminders.
        </Text>

        <Pressable
          onPress={handleTestNotification}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.tint },
            pressed && styles.optionPressed,
          ]}
        >
          <Text style={[styles.actionButtonText, { color: colors.buttonText }]}>
            Send Test Notification
          </Text>
        </Pressable>

        <Pressable
          onPress={handleChallengeReminder}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.tint },
            pressed && styles.optionPressed,
          ]}
        >
          <Text style={[styles.actionButtonText, { color: colors.buttonText }]}>
            Schedule Challenge Reminder
          </Text>
        </Pressable>

        <Pressable
          onPress={handleCancelNotifications}
          style={({ pressed }) => [
            styles.outlineButton,
            { borderColor: colors.danger },
            pressed && styles.optionPressed,
          ]}
        >
          <Text style={[styles.outlineButtonText, { color: colors.danger }]}>
            Cancel Scheduled Notifications
          </Text>
        </Pressable>
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
          Development Note
        </Text>

        <Text style={[styles.infoText, { color: colors.subtitle }]}>
          Camera, Microphone, Motion Sensors, Battery, Notifications, and Media
          Storage are now fully connected to real phone permissions. Location,
          Background Tasks, and Ads will be connected in a later update.
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
    paddingBottom: 120,
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
  actionButton: {
    marginTop: 14,
    minHeight: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  outlineButton: {
    marginTop: 14,
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
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
