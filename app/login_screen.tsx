import { useAppTheme } from '@/contexts/AppThemeContext';
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
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      Alert.alert('Missing Details', 'Please enter your email and password.');
      return;
    }

    try {
      setIsLoading(true);
      await loginUser(cleanEmail, password);
      router.replace('/team_setup');
    } catch (error: any) {
      const message = getLoginErrorMessage(error.code, error.message);
      Alert.alert('Login Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      Alert.alert(
        'Email Required',
        'Please enter your email address first, then tap Forgot Password.'
      );
      return;
    }

    try {
      await resetPassword(cleanEmail);
      Alert.alert(
        'Password Reset Email Sent',
        'Please check your email inbox, spam, or junk folder.'
      );
    } catch (error: any) {
      const message = getLoginErrorMessage(error.code, error.message);
      Alert.alert('Reset Password Failed', message);
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
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: colors.text }]}>STEMM Lab</Text>
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>
            Sign in to continue
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Welcome Back
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
            placeholder="Password"
            placeholderTextColor={colors.subtitle}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: isLoading ? colors.subtitle : colors.tint },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleForgotPassword}
            style={({ pressed }) => [pressed && styles.buttonPressed]}
          >
            <Text style={[styles.forgotLink, { color: colors.danger }]}>
              Forgot Password?
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.replace('/register_screen')}
          style={({ pressed }) => [pressed && styles.buttonPressed]}
        >
          <Text style={[styles.registerLink, { color: colors.subtitle }]}>
            Don't have an account?{' '}
            <Text style={{ color: colors.tint, fontWeight: '900' }}>
              Register
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
  forgotLink: {
    textAlign: 'center',
    fontWeight: '800',
    marginTop: 16,
    fontSize: 14,
  },
  registerLink: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
});
