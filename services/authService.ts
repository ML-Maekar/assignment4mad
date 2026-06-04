import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { secureDelete, secureGet, secureSet } from '../utils/secureStorage';
import { auth } from './firebase';

// Auth token stored securely — encrypted at rest using device keychain/keystore
const AUTH_EMAIL_KEY = 'stemm_auth_email';
const AUTH_UID_KEY = 'stemm_auth_uid';

export async function registerUser(email: string, password: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password);

  // Store user email securely after registration
  await secureSet(AUTH_EMAIL_KEY, email);
  await secureSet(AUTH_UID_KEY, result.user.uid);

  return result;
}

export async function loginUser(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);

  // Store user email securely after login
  await secureSet(AUTH_EMAIL_KEY, email);
  await secureSet(AUTH_UID_KEY, result.user.uid);

  return result;
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export async function logoutUser() {
  // Clear secure storage on logout
  await secureDelete(AUTH_EMAIL_KEY);
  await secureDelete(AUTH_UID_KEY);

  return signOut(auth);
}

// Get the securely stored user email
export async function getStoredUserEmail(): Promise<string | null> {
  return secureGet(AUTH_EMAIL_KEY);
}

// Get the securely stored user UID
export async function getStoredUserUid(): Promise<string | null> {
  return secureGet(AUTH_UID_KEY);
}