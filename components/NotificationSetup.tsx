import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';

// Suppress known Expo Go SDK 53+ remote notification warning
// Local notifications still work fine — this only affects push/remote
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Android Push notifications (remote',
  'remote notifications) functionality',
]);

export default function NotificationSetup() {
  useEffect(() => {
    async function setupNotifications() {
      try {
        // Set how notifications appear when app is in foreground
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        // Android MUST have a channel created before any notification works
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('stemm-default', {
            name: 'STEMM Lab Notifications',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2563EB',
            sound: 'default',
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