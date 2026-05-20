import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

import FloatingHomeButton from '@/components/FloatingHomeButton';
import GlobalBatteryStatus from '@/components/GlobalBatteryStatus';
import NotificationSetup from '@/components/NotificationSetup';
import {
  ThemeProvider as AppThemeProvider,
  useAppTheme,
} from '@/contexts/AppThemeContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const { activeTheme } = useAppTheme();

  return (
    <NavigationThemeProvider
      value={activeTheme === 'dark' ? DarkTheme : DefaultTheme}
    >

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="login" />
        <Stack.Screen name="team_setup" />
        <Stack.Screen name="(tabs)" />

      <NotificationSetup />

      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />


        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            title: 'Modal',
          }}
        />
      </Stack>

      <GlobalBatteryStatus />
      <FloatingHomeButton />

      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutContent />
    </AppThemeProvider>
  );
}