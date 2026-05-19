import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import React from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from '@/contexts/AppThemeContext';

export default function FloatingHomeButton() {
  const pathname = usePathname();
  const { colors } = useAppTheme();

  const shouldHideButton =
    pathname === '/' ||
    pathname === '/home' ||
    pathname === '/setting' ||
    pathname === '/(tabs)/home' ||
    pathname === '/(tabs)/setting';

  if (shouldHideButton) {
    return null;
  }

  const handleGoHome = () => {
    Alert.alert(
      'Return to Home?',
      'Any unsaved progress on this screen may be lost. Do you want to continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Go Home',
          style: 'destructive',
          onPress: () => {
            router.replace('/home' as never);
          },
        },
      ]
    );
  };

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <Pressable
        onPress={handleGoHome}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.tint,
            borderColor: colors.border,
          },
          pressed && styles.buttonPressed,
        ]}
      >
        <Ionicons name="home" size={24} color={colors.buttonText} />
        <Text style={[styles.accessibleText, { color: colors.buttonText }]}>
          Home
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    zIndex: 999,
    elevation: 999,
  },
  button: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 8,
  },
  buttonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },
  accessibleText: {
    position: 'absolute',
    opacity: 0,
    fontSize: 1,
  },
});