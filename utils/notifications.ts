import { Alert, Linking, LogBox, Platform } from 'react-native';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Android Push notifications',
]);

function getNotificationsModule() {
  return require('expo-notifications');
}

export async function getNotificationPermissionStatus() {
  try {
    const Notifications = getNotificationsModule();
    const permission = await Notifications.getPermissionsAsync();

    return permission.status;
  } catch (error) {
    console.log('Could not read notification permission:', error);
    return 'undetermined';
  }
}

export async function requestNotificationPermission() {
  try {
    const Notifications = getNotificationsModule();

    const existingPermission = await Notifications.getPermissionsAsync();

    if (existingPermission.status === 'granted') {
      return true;
    }

    const requestedPermission = await Notifications.requestPermissionsAsync();

    if (requestedPermission.status === 'granted') {
      return true;
    }

    Alert.alert(
      'Notification Permission Needed',
      'Notifications were not allowed. You can tap the notification switch again to ask, or enable notifications from phone settings if the system stops showing the permission popup.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings();
          },
        },
      ]
    );

    return false;
  } catch (error) {
    console.log('Could not request notification permission:', error);

    Alert.alert(
      'Notification Error',
      Platform.OS === 'android'
        ? 'Notification permission could not be requested in this environment. Try again, or use a development build later for full push notification support.'
        : 'Notification permission could not be requested.'
    );

    return false;
  }
}

export async function scheduleTestNotification() {
  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    return false;
  }

  const Notifications = getNotificationsModule();

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

  const Notifications = getNotificationsModule();

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
      seconds: 15,
    },
  });

  return true;
}

export async function cancelAllScheduledNotifications() {
  try {
    const Notifications = getNotificationsModule();
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.log('Could not cancel notifications:', error);
  }
}