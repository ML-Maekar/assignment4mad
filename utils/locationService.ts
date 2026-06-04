import * as Location from 'expo-location';

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
    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      return {
        latitude: null,
        longitude: null,
        accuracy: null,
        capturedAt,
        permissionGranted: false,
      };
    }

    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
      accuracy: currentLocation.coords.accuracy,
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