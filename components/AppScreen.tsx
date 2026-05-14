import React, { ReactNode } from 'react';
import {
    ScrollView,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';

import { useAppTheme } from '@/contexts/AppThemeContext';

type AppScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
};

export default function AppScreen({
  children,
  scroll = true,
  contentStyle,
}: AppScreenProps) {
  const { colors } = useAppTheme();

  if (!scroll) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, contentStyle]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
});