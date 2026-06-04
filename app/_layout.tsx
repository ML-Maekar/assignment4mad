import GlobalBatteryStatus from '@/components/GlobalBatteryStatus';
import NotificationSetup from '@/components/NotificationSetup';
import {
  ThemeProvider as AppThemeProvider,
  useAppTheme,
} from '@/contexts/AppThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

function RootLayoutContent() {
  const { activeTheme, colors } = useAppTheme();

  return (
    <NavigationThemeProvider
      value={activeTheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <NotificationSetup />

      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '800',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="register_screen"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="login_screen"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="team_setup"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="result-summary"
          options={{
            title: 'Result Summary',
          }}
        />

        <Stack.Screen
          name="leaderboard"
          options={{
            title: 'Leaderboard',
          }}
        />

        <Stack.Screen
          name="result-history"
          options={{
            title: 'Result History',
          }}
        />

        <Stack.Screen
          name="activity-one-game"
          options={{
            title: 'Parachute Drop Test',
          }}
        />

        <Stack.Screen
          name="activity-two-game"
          options={{
            title: 'Sound Pollution Test',
          }}
        />

        <Stack.Screen
          name="activity-three-game"
          options={{
            title: 'Hand Fan Test',
          }}
        />

        <Stack.Screen
          name="activity-four-game"
          options={{
            title: 'Earthquake Test',
          }}
        />

        <Stack.Screen
          name="activity-five-game"
          options={{
            title: 'Human Performance Lab',
          }}
        />

        <Stack.Screen
          name="activity-six-game"
          options={{
            title: 'Reaction Board',
          }}
        />

        <Stack.Screen
          name="activity-seven-game"
          options={{
            title: 'Breathing Trainer',
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

      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
  <AuthProvider>
    <PermissionsProvider>
      <AppThemeProvider>
        <RootLayoutContent />
      </AppThemeProvider>
    </PermissionsProvider>
  </AuthProvider>
);
}