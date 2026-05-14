/**
 * Below are the colors that are used in the app.
 * The app supports light mode, dark mode, and system/device theme preference.
 */

import { Platform } from 'react-native';

const tintColorLight = '#2563EB';
const tintColorDark = '#60A5FA';

export const Colors = {
  light: {
    text: '#111827',
    background: '#F6F7FB',
    card: '#FFFFFF',
    border: '#E5E7EB',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    subtitle: '#6B7280',
    buttonText: '#FFFFFF',
    danger: '#DC2626',
    success: '#16A34A',
    warning: '#F59E0B',
  },
  dark: {
    text: '#F9FAFB',
    background: '#111827',
    card: '#1F2937',
    border: '#374151',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorDark,
    subtitle: '#D1D5DB',
    buttonText: '#FFFFFF',
    danger: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
};

export type AppThemeName = keyof typeof Colors;
export type AppColors = typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
