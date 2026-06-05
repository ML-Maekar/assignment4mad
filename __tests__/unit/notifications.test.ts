import * as Notifications from 'expo-notifications';
import {
  cancelAllScheduledNotifications,
  getNotificationPermissionStatus,
  isNotificationPermissionGranted,
} from '../../utils/notifications';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
}));

describe('notifications — unit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns granted status when permission is granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    const status = await getNotificationPermissionStatus();
    expect(status).toBe('granted');
  });

  it('isNotificationPermissionGranted returns true when granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    const result = await isNotificationPermissionGranted();
    expect(result).toBe(true);
  });

  it('isNotificationPermissionGranted returns false when denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });
    const result = await isNotificationPermissionGranted();
    expect(result).toBe(false);
  });

  it('cancelAllScheduledNotifications does not throw', async () => {
    (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue(undefined);
    await expect(cancelAllScheduledNotifications()).resolves.not.toThrow();
  });
});