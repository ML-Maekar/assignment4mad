import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Android Push notifications',
]);

export default function NotificationSetup() {
  useEffect(() => {
    async function setupNotifications() {
      try {
        const Notifications = require('expo-notifications');

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('stemm-reminders', {
            name: 'STEMM Lab Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2563EB',
          });
        }
      } catch (error) {
        console.log('Notification setup skipped:', error);
      }
    }

    setupNotifications();
  }, []);

  return null;
}