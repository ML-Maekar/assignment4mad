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
    <View style={styles.container}>
      <Text style={styles.title}>STEMM Lab</Text>

      <Text style={styles.subtitle}>Login to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#777"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#777"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </Pressable>

      <Pressable onPress={handleForgotPassword}>
        <Text style={styles.forgotLink}>Forgot Password?</Text>
      </Pressable>

      <Pressable onPress={() => router.replace('/register_screen')}>
        <Text style={styles.link}>Back to Register</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    color: '#000000',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
    color: '#666666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
    color: '#000000',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  forgotLink: {
    textAlign: 'center',
    color: '#dc2626',
    fontWeight: '700',
    marginTop: 16,
  },
  link: {
    textAlign: 'center',
    color: '#2563eb',
    fontWeight: '700',
    marginTop: 18,
  },
});