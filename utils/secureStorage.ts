import * as SecureStore from 'expo-secure-store';

// Secure encrypted storage wrapper using expo-secure-store
// Data is encrypted at rest using device keychain/keystore
// Use this for sensitive data: team profiles, auth tokens, permission flags
// Keys must be alphanumeric + underscores only (no hyphens or spaces)

export async function secureSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.log(`[SecureStorage] Failed to save key "${key}":`, error);
  }
}

export async function secureGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.log(`[SecureStorage] Failed to read key "${key}":`, error);
    return null;
  }
}

export async function secureDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.log(`[SecureStorage] Failed to delete key "${key}":`, error);
  }
}

export async function secureGetObject<T>(key: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.log(`[SecureStorage] Failed to parse key "${key}":`, error);
    return null;
  }
}

export async function secureSetObject<T>(key: string, value: T): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  } catch (error) {
    console.log(`[SecureStorage] Failed to save object key "${key}":`, error);
  }
}