import * as Notifications from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';

async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('stemm-default', {
      name: 'STEMM Lab Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
      sound: 'default',
    });
  }
}

export async function getNotificationPermissionStatus() {
  try {
    const permission = await Notifications.getPermissionsAsync();
    return permission.status;
  } catch (error) {
    console.log('Could not read notification permission:', error);
    return 'undetermined';
  }
}

export async function requestNotificationPermission() {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;

    const requested = await Notifications.requestPermissionsAsync();
    if (requested.status === 'granted') return true;

    Alert.alert(
      'Notification Permission Needed',
      'Notifications were not allowed. You can enable them from phone settings.',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );

    return false;
  } catch (error) {
    console.log('Could not request notification permission:', error);
    return false;
  }
}

// ─── Check permission silently — used by activities ──────────────
// Does NOT prompt the user — just returns true/false
// This respects the Settings toggle — if user turned off notifications
// in Settings, this returns false and we skip scheduling silently
export async function isNotificationPermissionGranted(): Promise<boolean> {
  try {
    const permission = await Notifications.getPermissionsAsync();
    return permission.status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleTestNotification() {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return false;

  await ensureAndroidChannel();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'STEMM Lab Notification Test',
      body: 'Notifications are working correctly.',
      sound: 'default',
      data: { type: 'test-notification' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: 'stemm-default',
    },
  });

  return true;
}

export async function scheduleChallengeReminder() {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return false;

  await ensureAndroidChannel();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'STEMM Lab Challenge Reminder',
      body: 'Remember to record your activity results and team reflection.',
      sound: 'default',
      data: { type: 'challenge-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 15,
      channelId: 'stemm-default',
    },
  });

  return true;
}

// Used by all 7 activities after saving a result
// Silently skips if notification permission is not granted
// Respects the Settings toggle — no popup if turned off
export async function scheduleActivityCompleteNotification(
  activityTitle: string,
  score?: number
) {
  const hasPermission = await isNotificationPermissionGranted();
  if (!hasPermission) return false;

  await ensureAndroidChannel();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Activity Complete',
      body:
        typeof score === 'number'
          ? `${activityTitle} finished. Your score was ${Math.round(score)}/100.`
          : `${activityTitle} finished. Your result has been saved.`,
      sound: 'default',
      data: { type: 'activity-complete', activityTitle, score },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: 'stemm-default',
    },
  });

  return true;
}

export async function scheduleActivityReminderNotification(
  activityTitle: string,
  seconds = 15
) {
  const hasPermission = await isNotificationPermissionGranted();
  if (!hasPermission) return false;

  await ensureAndroidChannel();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'STEMM Lab Reminder',
      body: `Remember to complete or save your ${activityTitle} activity.`,
      sound: 'default',
      data: { type: 'activity-reminder', activityTitle },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: 'stemm-default',
    },
  });

  return true;
}

export async function cancelAllScheduledNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.log('Could not cancel notifications:', error);
  }
}