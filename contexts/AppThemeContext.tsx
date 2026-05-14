import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';

import { AppColors, AppThemeName, Colors } from '@/constants/theme';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextType = {
  themePreference: ThemePreference;
  activeTheme: AppThemeName;
  colors: AppColors;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
};

const THEME_STORAGE_KEY = 'stemm-lab-theme-preference';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getActiveTheme(
  preference: ThemePreference,
  systemTheme: ColorSchemeName
): AppThemeName {
  if (preference === 'light') {
    return 'light';
  }

  if (preference === 'dark') {
    return 'dark';
  }

  return systemTheme === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemTheme = useColorScheme();

  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>('system');

  useEffect(() => {
    async function loadThemePreference() {
      try {
        const savedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);

        if (
          savedPreference === 'system' ||
          savedPreference === 'light' ||
          savedPreference === 'dark'
        ) {
          setThemePreferenceState(savedPreference);
        }
      } catch (error) {
        console.log('Failed to load theme preference:', error);
      }
    }

    loadThemePreference();
  }, []);

  const setThemePreference = async (preference: ThemePreference) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
      setThemePreferenceState(preference);
    } catch (error) {
      console.log('Failed to save theme preference:', error);
    }
  };

  const activeTheme = getActiveTheme(themePreference, systemTheme);
  const colors = Colors[activeTheme];

  const value = useMemo(
    () => ({
      themePreference,
      activeTheme,
      colors,
      setThemePreference,
    }),
    [themePreference, activeTheme, colors]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside ThemeProvider');
  }

  return context;
}