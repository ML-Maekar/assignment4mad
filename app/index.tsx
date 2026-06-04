import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Wait until Firebase has checked auth state
    if (isLoading) return;

    if (user) {
      // User is already logged in → go straight to tabs
      router.replace('/(tabs)/home');
    } else {
      // No user → go to register/login
      router.replace('/register_screen');
    }
  }, [user, isLoading]);

  // Show a spinner while Firebase checks login status
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});