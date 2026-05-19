import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function NotificationSetup() {
  useEffect(() => {
    async function setupNotifications() {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('stemm-reminders', {
          name: 'STEMM Lab Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2563EB',
        });
      }
    }

    setupNotifications();
  }, []);

  return null;
}