import * as Notifications from 'expo-notifications';

export async function getNotificationPermissionStatus() {
  const permission = await Notifications.getPermissionsAsync();
  return permission.status;
}

export async function requestNotificationPermission() {
  const existingPermission = await Notifications.getPermissionsAsync();

  if (existingPermission.status === 'granted') {
    return true;
  }

  const requestedPermission = await Notifications.requestPermissionsAsync();

  return requestedPermission.status === 'granted';
}

export async function scheduleTestNotification() {
  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    return false;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'STEMM Lab Notification Test',
      body: 'Notifications are working correctly.',
      sound: true,
      data: {
        type: 'test-notification',
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });

  return true;
}

export async function scheduleChallengeReminder() {
  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    return false;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'STEMM Lab Challenge Reminder',
      body: 'Remember to record your activity results and team reflection.',
      sound: true,
      data: {
        type: 'challenge-reminder',
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 15,
    },
  });

  return true;
}

export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}