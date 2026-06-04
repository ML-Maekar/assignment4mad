import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sensors from 'expo-sensors';
import { Alert, Linking, Platform } from 'react-native';

// ─── Permission types we manage ───────────────────────────────
export type ManagedPermission = 'motion' | 'battery';

// AsyncStorage keys for deny count tracking
const DENY_COUNT_KEYS: Record<ManagedPermission, string> = {
  motion: 'stemm_permission_deny_motion',
  battery: 'stemm_permission_deny_battery',
};

// After this many denies we send them to phone settings
const MAX_DENIES_BEFORE_SETTINGS = 2;

// ─── Deny count helpers ───────────────────────────────────────
async function getDenyCount(permission: ManagedPermission): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(DENY_COUNT_KEYS[permission]);
    return value ? parseInt(value, 10) : 0;
  } catch {
    return 0;
  }
}

async function incrementDenyCount(permission: ManagedPermission): Promise<number> {
  try {
    const current = await getDenyCount(permission);
    const next = current + 1;
    await AsyncStorage.setItem(DENY_COUNT_KEYS[permission], String(next));
    return next;
  } catch {
    return 1;
  }
}

async function resetDenyCount(permission: ManagedPermission): Promise<void> {
  try {
    await AsyncStorage.removeItem(DENY_COUNT_KEYS[permission]);
  } catch {}
}

// ─── Open phone settings ──────────────────────────────────────
function openPhoneSettings(permissionLabel: string) {
  Alert.alert(
    `Enable ${permissionLabel} in Settings`,
    `You have declined ${permissionLabel} permission multiple times. Please open your phone settings and enable it manually for STEMM Lab.`,
    [
      { text: 'Not Now', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => Linking.openSettings(),
      },
    ]
  );
}

// ─── Motion sensor permission ─────────────────────────────────
// Android: accelerometer does NOT require system permission — it always works.
// We use an app-level soft block stored in AsyncStorage on Android.
// iOS: requires CoreMotion permission via expo-sensors.

const MOTION_SOFT_BLOCK_KEY = 'stemm_motion_soft_blocked';

export async function getMotionSoftBlocked(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(MOTION_SOFT_BLOCK_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setMotionSoftBlocked(blocked: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(MOTION_SOFT_BLOCK_KEY, blocked ? 'true' : 'false');
  } catch {}
}

// Returns true if motion sensors are allowed to be used
export async function isMotionPermissionGranted(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // On Android accelerometer needs no system permission
    // We only check our soft block
    const softBlocked = await getMotionSoftBlocked();
    return !softBlocked;
  }

  // iOS — check real system permission
  try {
    const { status } = await Sensors.Accelerometer.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return true; // If we can't check, assume granted
  }
}

// Smart request — handles retry and go-to-settings logic
export async function requestMotionPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android: just un-soft-block
    const softBlocked = await getMotionSoftBlocked();

    if (!softBlocked) {
      // Already allowed
      return true;
    }

    // Un-block it
    await setMotionSoftBlocked(false);
    await resetDenyCount('motion');
    return true;
  }

  // iOS: real permission flow
  try {
    const existing = await Sensors.Accelerometer.getPermissionsAsync();

    if (existing.status === 'granted') {
      await resetDenyCount('motion');
      return true;
    }

    const denyCount = await getDenyCount('motion');

    if (denyCount >= MAX_DENIES_BEFORE_SETTINGS) {
      openPhoneSettings('Motion Sensors');
      return false;
    }

    const result = await Sensors.Accelerometer.requestPermissionsAsync();

    if (result.status === 'granted') {
      await resetDenyCount('motion');
      return true;
    }

    await incrementDenyCount('motion');
    return false;
  } catch {
    return false;
  }
}

// Called when user turns OFF the motion toggle in settings
export async function revokeMotionPermission(): Promise<void> {
  if (Platform.OS === 'android') {
    await setMotionSoftBlocked(true);
  }
  // iOS: can't revoke system permission — user must go to Settings
  // We just track it as a soft block on iOS too for the UI
  await setMotionSoftBlocked(true);
}

// ─── Battery permission ───────────────────────────────────────
// expo-battery reads battery WITHOUT any system permission on both platforms.
// Our "permission" is purely an app-level toggle.
// When OFF: battery widget shows frozen last-known value, no live updates.
// When ON: battery widget shows live updating value.

const BATTERY_ENABLED_KEY = 'stemm_battery_enabled';

export async function isBatteryPermissionGranted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(BATTERY_ENABLED_KEY);
    // Default is true (enabled) if never set
    return value !== 'false';
  } catch {
    return true;
  }
}

export async function setBatteryPermissionGranted(granted: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(BATTERY_ENABLED_KEY, granted ? 'true' : 'false');
  } catch {}
}

// Smart request — same retry pattern
export async function requestBatteryPermission(): Promise<boolean> {
  const denyCount = await getDenyCount('battery');

  if (denyCount >= MAX_DENIES_BEFORE_SETTINGS) {
    openPhoneSettings('Battery Status');
    return false;
  }

  // Battery doesn't need a real system prompt — just enable it
  await setBatteryPermissionGranted(true);
  await resetDenyCount('battery');
  return true;
}

// Called when user turns OFF battery toggle
export async function revokeBatteryPermission(): Promise<void> {
  await setBatteryPermissionGranted(false);
  await incrementDenyCount('battery');
}