import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { registerUser } from '../services/authService';

function validatePassword(password: string) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one capital letter.';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number.';
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must include at least one special character.';
  }

  return '';
}

function getRegisterErrorMessage(errorCode: string, fallbackMessage: string) {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please login instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use a stronger password.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return fallbackMessage || 'Registration failed. Please try again.';
  }
}

export default function RegisterScreen() {
  const { colors } = useAppTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      Alert.alert('Missing details', 'Please enter email and password.');
      return;
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      Alert.alert('Weak password', passwordError);
      return;
    }

    try {
      await registerUser(cleanEmail, password);

      Alert.alert('Success', 'Account created successfully.');
      router.replace('/team_setup');
    } catch (error: any) {
      const message = getRegisterErrorMessage(error.code, error.message);
      Alert.alert('Registration failed', message);
    }
  };

  return (
    <AppScreen>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>STEMM Lab</Text>

        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Create an account to continue
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
          placeholder="Email"
          placeholderTextColor={colors.subtitle}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
          placeholder="Password"
          placeholderTextColor={colors.subtitle}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Text style={[styles.passwordHint, { color: colors.subtitle }]}>
          Password must include 8+ characters, one capital letter, one lowercase
          letter, one number, and one special character.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.tint },
            pressed && styles.buttonPressed,
          ]}
          onPress={handleRegister}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            Register
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push('/login_screen')}>
          <Text style={[styles.link, { color: colors.tint }]}>
            Already have an account? Login
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    marginTop: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
  },
  passwordHint: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  link: {
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 18,
  },
});