import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

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

        <Stack.Screen
          name="screen-one"
          options={{
            title: 'Parachute Drop',
          }}
        />

        <Stack.Screen
          name="screen-two"
          options={{
            title: 'Sound Pollution',
          }}
        />

        <Stack.Screen
          name="screen-three"
          options={{
            title: 'Hand Fan',
          }}
        />

        <Stack.Screen
          name="screen-four"
          options={{
            title: 'Earthquake Structure',
          }}
        />

        <Stack.Screen
          name="screen-five"
          options={{
            title: 'Human Performance',
          }}
        />

        <Stack.Screen
          name="screen-six"
          options={{
            title: 'Reaction Board',
          }}
        />

        <Stack.Screen
          name="screen-seven"
          options={{
            title: 'Breathing Trainer',
          }}
        />
      </Stack>

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