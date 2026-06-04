import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

// ─── Keys ─────────────────────────────────────────────────────
const LOCATION_GRANTED_KEY = 'stemm_location_granted';
const LOCATION_DENY_COUNT_KEY = 'stemm_location_deny_count';

// ─── Deny count helpers ───────────────────────────────────────
async function getDenyCount(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(LOCATION_DENY_COUNT_KEY);
    return value ? parseInt(value, 10) : 0;
  } catch { return 0; }
}

async function incrementDenyCount(): Promise<void> {
  try {
    const current = await getDenyCount();
    await AsyncStorage.setItem(LOCATION_DENY_COUNT_KEY, String(current + 1));
  } catch {}
}

async function resetDenyCount(): Promise<void> {
  try { await AsyncStorage.removeItem(LOCATION_DENY_COUNT_KEY); } catch {}
}

// ─── Permission state ─────────────────────────────────────────
export async function isLocationPermissionGranted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(LOCATION_GRANTED_KEY);
    return value === 'true';
  } catch { return false; }
}

async function setLocationPermissionGranted(granted: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCATION_GRANTED_KEY, granted ? 'true' : 'false');
  } catch {}
}

// ─── Smart permission request ─────────────────────────────────
// 1st deny → ask again next time
// 2nd deny → ask again with stronger message
// 3rd deny → go to phone settings
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const alreadyGranted = await isLocationPermissionGranted();
    if (alreadyGranted) return true;

    const denyCount = await getDenyCount();

    if (denyCount >= 2) {
      Alert.alert(
        'Location Blocked',
        'You have declined location permission multiple times. Please open your phone settings and enable it for STEMM Lab.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Phone Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }

    const existing = await Location.getForegroundPermissionsAsync();

    if (existing.status === 'granted') {
      await setLocationPermissionGranted(true);
      await resetDenyCount();
      return true;
    }

    const result = await Location.requestForegroundPermissionsAsync();

    if (result.status === 'granted') {
      await setLocationPermissionGranted(true);
      await resetDenyCount();
      return true;
    }

    await incrementDenyCount();
    return false;
  } catch (error) {
    console.log('Location permission request failed:', error);
    return false;
  }
}

export async function revokeLocationPermission(): Promise<void> {
  try {
    await setLocationPermissionGranted(false);
    await resetDenyCount();
  } catch {}
}

// ─── LocationTag — used by attemptService ─────────────────────
export type LocationTag = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address: string | null;
};

// Call this when saving an activity result via saveAttempt
// Returns null silently if permission not granted
export async function getCurrentLocationTag(): Promise<LocationTag | null> {
  try {
    const granted = await isLocationPermissionGranted();
    if (!granted) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    let address: string | null = null;

    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const place = reverseGeocode[0];
        const parts = [
          place.name,
          place.street,
          place.city,
          place.region,
          place.country,
        ].filter(Boolean);
        address = parts.join(', ');
      }
    } catch {
      // Reverse geocoding failed — still return coordinates
    }

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      address,
    };
  } catch (error) {
    console.log('Failed to get location:', error);
    return null;
  }
}

// ─── ActivityLocation — used by teammate's activity screens ───
// Kept for backward compatibility with activity-two-game etc.
export type ActivityLocation = {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  capturedAt: string;
  permissionGranted: boolean;
};

export async function getActivityLocation(): Promise<ActivityLocation> {
  const capturedAt = new Date().toISOString();

  try {
    const granted = await isLocationPermissionGranted();

    if (!granted) {
      return {
        latitude: null,
        longitude: null,
        accuracy: null,
        capturedAt,
        permissionGranted: false,
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      capturedAt,
      permissionGranted: true,
    };
  } catch (error) {
    console.log('Failed to get activity location:', error);
    return {
      latitude: null,
      longitude: null,
      accuracy: null,
      capturedAt,
      permissionGranted: false,
    };
  }
}