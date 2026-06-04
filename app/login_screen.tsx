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

import { loginUser, resetPassword } from '../services/authService';

function getLoginErrorMessage(errorCode: string, fallbackMessage: string) {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please register first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again or reset your password.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your details.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return fallbackMessage || 'Login failed. Please try again.';
  }
}

export default function LoginScreen() {
  const { colors } = useAppTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      Alert.alert('Missing details', 'Please enter email and password.');
      return;
    }

    try {
      await loginUser(cleanEmail, password);

      router.replace('/team_setup');
    } catch (error: any) {
      const message = getLoginErrorMessage(error.code, error.message);
      Alert.alert('Login failed', message);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      Alert.alert(
        'Email required',
        'Please enter your email address first, then tap Forgot Password.'
      );
      return;
    }

    try {
      await resetPassword(cleanEmail);

      Alert.alert(
        'Password reset email sent',
        'Please check your email inbox, spam, or junk folder.'
      );
    } catch (error: any) {
      const message = getLoginErrorMessage(error.code, error.message);
      Alert.alert('Reset password failed', message);
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
          Login to continue
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

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.tint },
            pressed && styles.buttonPressed,
          ]}
          onPress={handleLogin}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            Login
          </Text>
        </Pressable>

        <Pressable onPress={handleForgotPassword}>
          <Text style={[styles.forgotLink, { color: '#DC2626' }]}>
            Forgot Password?
          </Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/register_screen')}>
          <Text style={[styles.link, { color: colors.tint }]}>
            Back to Register
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
  forgotLink: {
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 16,
  },
  link: {
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 18,
  },
});