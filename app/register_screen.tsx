import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppTheme } from '@/contexts/AppThemeContext';
import { registerUser } from '../services/authService';

function getRegisterErrorMessage(errorCode: string, fallbackMessage: string) {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please login instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password || !confirmPassword) {
      Alert.alert('Missing Details', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Please make sure both passwords are the same.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setIsLoading(true);
      await registerUser(cleanEmail, password);
      Alert.alert(
        'Account Created',
        'Your account has been created successfully.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/team_setup'),
          },
        ]
      );
    } catch (error: any) {
      const message = getRegisterErrorMessage(error.code, error.message);
      Alert.alert('Registration Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: colors.text }]}>STEMM Lab</Text>
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>
            Create your account
          </Text>
        </View>

        {/* Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Register
          </Text>

          <Text style={[styles.helperText, { color: colors.subtitle }]}>
            Create an account to save your team and activity results.
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
            placeholder="Email address"
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
            placeholder="Password (min 6 characters)"
            placeholderTextColor={colors.subtitle}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
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
            placeholder="Confirm password"
            placeholderTextColor={colors.subtitle}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Pressable
            onPress={handleRegister}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: isLoading ? colors.subtitle : colors.tint },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </Pressable>
        </View>

        {/* Login link */}
        <Pressable
          onPress={() => router.replace('/login_screen')}
          style={({ pressed }) => [pressed && styles.buttonPressed]}
        >
          <Text style={[styles.loginLink, { color: colors.subtitle }]}>
            Already have an account?{' '}
            <Text style={{ color: colors.tint, fontWeight: '900' }}>
              Sign In
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 6,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
  },
  button: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
    minHeight: 54,
    justifyContent: 'center',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '900',
  },
  loginLink: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
});