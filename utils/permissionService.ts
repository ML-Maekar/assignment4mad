import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Sensors from 'expo-sensors';
import { Alert, Linking, Platform } from 'react-native';

// ─── Motion sensor permission ─────────────────────────────────
const MOTION_SOFT_BLOCK_KEY = 'stemm_motion_soft_blocked';
const MOTION_DENY_KEY = 'stemm_motion_deny_count';

export async function getMotionSoftBlocked(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(MOTION_SOFT_BLOCK_KEY);
    return value === 'true';
  } catch { return false; }
}

export async function setMotionSoftBlocked(blocked: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(MOTION_SOFT_BLOCK_KEY, blocked ? 'true' : 'false');
  } catch {}
}

async function getMotionDenyCount(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(MOTION_DENY_KEY);
    return value ? parseInt(value, 10) : 0;
  } catch { return 0; }
}

async function incrementMotionDenyCount(): Promise<void> {
  try {
    const current = await getMotionDenyCount();
    await AsyncStorage.setItem(MOTION_DENY_KEY, String(current + 1));
  } catch {}
}

async function resetMotionDenyCount(): Promise<void> {
  try { await AsyncStorage.removeItem(MOTION_DENY_KEY); } catch {}
}

export async function isMotionPermissionGranted(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const softBlocked = await getMotionSoftBlocked();
    return !softBlocked;
  }
  try {
    const { status } = await Sensors.Accelerometer.requestPermissionsAsync();
    return status === 'granted';
  } catch { return true; }
}

export async function requestMotionPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const softBlocked = await getMotionSoftBlocked();
    if (!softBlocked) return true;
    await setMotionSoftBlocked(false);
    await resetMotionDenyCount();
    return true;
  }

  try {
    const existing = await Sensors.Accelerometer.getPermissionsAsync();
    if (existing.status === 'granted') {
      await resetMotionDenyCount();
      return true;
    }

    const denyCount = await getMotionDenyCount();
    if (denyCount >= 2) {
      Alert.alert(
        'Enable Motion Sensors in Settings',
        'You have declined motion sensor permission multiple times. Please open your phone settings and enable it manually for STEMM Lab.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }

    const result = await Sensors.Accelerometer.requestPermissionsAsync();
    if (result.status === 'granted') {
      await resetMotionDenyCount();
      return true;
    }

    await incrementMotionDenyCount();
    return false;
  } catch { return false; }
}

export async function revokeMotionPermission(): Promise<void> {
  await setMotionSoftBlocked(true);
}

// ─── Battery permission ───────────────────────────────────────
const BATTERY_ENABLED_KEY = 'stemm_battery_enabled';

export async function isBatteryPermissionGranted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(BATTERY_ENABLED_KEY);
    return value !== 'false';
  } catch { return true; }
}

export async function setBatteryPermissionGranted(granted: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(BATTERY_ENABLED_KEY, granted ? 'true' : 'false');
  } catch {}
}

export async function revokeBatteryPermission(): Promise<void> {
  await setBatteryPermissionGranted(false);
}

// ─── Camera permission ────────────────────────────────────────
const CAMERA_DENY_COUNT_KEY = 'stemm_camera_deny_count';
const CAMERA_GRANTED_KEY = 'stemm_camera_granted';

async function getCameraDenyCount(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(CAMERA_DENY_COUNT_KEY);
    return value ? parseInt(value, 10) : 0;
  } catch { return 0; }
}

async function incrementCameraDenyCount(): Promise<void> {
  try {
    const current = await getCameraDenyCount();
    await AsyncStorage.setItem(CAMERA_DENY_COUNT_KEY, String(current + 1));
  } catch {}
}

async function resetCameraDenyCount(): Promise<void> {
  try { await AsyncStorage.removeItem(CAMERA_DENY_COUNT_KEY); } catch {}
}

export async function isCameraPermissionGranted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(CAMERA_GRANTED_KEY);
    return value === 'true';
  } catch { return false; }
}

async function setCameraPermissionGranted(granted: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CAMERA_GRANTED_KEY, granted ? 'true' : 'false');
  } catch {}
}

export async function requestCameraPermission(): Promise<boolean> {
  try {
    const alreadyGranted = await isCameraPermissionGranted();
    if (alreadyGranted) return true;

    const denyCount = await getCameraDenyCount();

    if (denyCount >= 2) {
      Alert.alert(
        'Camera Blocked',
        'You have declined camera permission multiple times. Please open your phone settings and enable it for STEMM Lab.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Phone Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }

    const result = await ImagePicker.requestCameraPermissionsAsync();

    if (result.granted) {
      await setCameraPermissionGranted(true);
      await resetCameraDenyCount();
      return true;
    }

    await incrementCameraDenyCount();

    const newCount = await getCameraDenyCount();
    if (newCount >= 2) {
      Alert.alert(
        'Camera Permission Denied',
        'Camera access was not granted. One more denial will redirect you to phone settings.',
        [{ text: 'OK' }]
      );
    }

    return false;
  } catch { return false; }
}

export async function revokeCameraPermission(): Promise<void> {
  try {
    await setCameraPermissionGranted(false);
    await resetCameraDenyCount();
  } catch {}
}

// ─── Microphone permission ────────────────────────────────────
const MIC_DENY_COUNT_KEY = 'stemm_mic_deny_count';
const MIC_GRANTED_KEY = 'stemm_mic_granted';

async function getMicDenyCount(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(MIC_DENY_COUNT_KEY);
    return value ? parseInt(value, 10) : 0;
  } catch { return 0; }
}

async function incrementMicDenyCount(): Promise<void> {
  try {
    const current = await getMicDenyCount();
    await AsyncStorage.setItem(MIC_DENY_COUNT_KEY, String(current + 1));
  } catch {}
}

async function resetMicDenyCount(): Promise<void> {
  try { await AsyncStorage.removeItem(MIC_DENY_COUNT_KEY); } catch {}
}

export async function isMicPermissionGranted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(MIC_GRANTED_KEY);
    return value === 'true';
  } catch { return false; }
}

async function setMicPermissionGranted(granted: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(MIC_GRANTED_KEY, granted ? 'true' : 'false');
  } catch {}
}

export async function requestMicPermission(): Promise<boolean> {
  try {
    const alreadyGranted = await isMicPermissionGranted();
    if (alreadyGranted) return true;

    const denyCount = await getMicDenyCount();

    if (denyCount >= 2) {
      Alert.alert(
        'Microphone Blocked',
        'You have declined microphone permission multiple times. Please open your phone settings and enable it for STEMM Lab.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Phone Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }

    const result = await Audio.requestPermissionsAsync();

    if (result.granted) {
      await setMicPermissionGranted(true);
      await resetMicDenyCount();
      return true;
    }

    await incrementMicDenyCount();
    return false;
  } catch { return false; }
}

export async function revokeMicPermission(): Promise<void> {
  try {
    await setMicPermissionGranted(false);
    await resetMicDenyCount();
  } catch {}
}