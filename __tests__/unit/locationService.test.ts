import * as Location from 'expo-location';
import { getCurrentLocationTag } from '../../utils/locationService';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Linking: { openSettings: jest.fn() },
  Platform: { OS: 'android' },
}));

describe('locationService — unit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when location permission is not granted', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockResolvedValue('false');
    const result = await getCurrentLocationTag();
    expect(result).toBeNull();
  });

  it('returns location object when permission is granted', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockResolvedValue('true');
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: -37.8136, longitude: 144.9631, accuracy: 10 },
    });
    (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      {
        name: 'Federation Square',
        street: 'Swanston St',
        city: 'Melbourne',
        region: 'Victoria',
        country: 'Australia',
      },
    ]);
    const result = await getCurrentLocationTag();
    expect(result).not.toBeNull();
    expect(result?.latitude).toBe(-37.8136);
    expect(result?.longitude).toBe(144.9631);
  });

  it('returns coordinates with null address if reverse geocode fails', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockResolvedValue('true');
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: -33.8688, longitude: 151.2093, accuracy: 20 },
    });
    (Location.reverseGeocodeAsync as jest.Mock).mockRejectedValue(
      new Error('geocode failed')
    );
    const result = await getCurrentLocationTag();
    expect(result).not.toBeNull();
    expect(result?.latitude).toBe(-33.8688);
    expect(result?.address).toBeNull();
  });

  it('returns null if getCurrentPositionAsync throws', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockResolvedValue('true');
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
      new Error('GPS error')
    );
    const result = await getCurrentLocationTag();
    expect(result).toBeNull();
  });
});