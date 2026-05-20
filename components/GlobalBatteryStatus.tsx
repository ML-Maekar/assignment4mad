import * as Battery from 'expo-battery';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/contexts/AppThemeContext';

function getBatteryIcon(percent: number | null) {
  if (percent === null) return '—';
  if (percent <= 10) return '🪫';
  if (percent <= 30) return '🔋';
  if (percent <= 80) return '🔋';
  return '🔋';
}

function getBatteryStateLabel(state: Battery.BatteryState | null) {
  if (state === Battery.BatteryState.CHARGING) return 'Charging';
  if (state === Battery.BatteryState.FULL) return 'Full';
  if (state === Battery.BatteryState.UNPLUGGED) return 'Unplugged';
  if (state === Battery.BatteryState.UNKNOWN) return 'Unknown';

  return 'Loading';
}

export default function GlobalBatteryStatus() {
  const { colors } = useAppTheme();

  const batteryLevel = Battery.useBatteryLevel();
  const batteryState = Battery.useBatteryState();
  const lowPowerMode = Battery.useLowPowerMode();

  const batteryPercent =
    batteryLevel === null || batteryLevel < 0
      ? null
      : Math.round(batteryLevel * 100);

  const isLowBattery = batteryPercent !== null && batteryPercent <= 20;

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <Pressable
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderColor: isLowBattery ? colors.danger : colors.border,
          },
        ]}
      >
        <Text style={styles.icon}>{getBatteryIcon(batteryPercent)}</Text>

        <View>
          <Text
            style={[
              styles.percent,
              {
                color: isLowBattery ? colors.danger : colors.text,
              },
            ]}
          >
            {batteryPercent === null ? 'N/A' : `${batteryPercent}%`}
          </Text>

          <Text style={[styles.status, { color: colors.subtitle }]}>
            {lowPowerMode ? 'Low Power' : getBatteryStateLabel(batteryState)}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 48,
    right: 14,
    zIndex: 998,
    elevation: 998,
  },
  container: {
    minWidth: 92,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 6,
  },
  icon: {
    fontSize: 19,
    marginRight: 7,
  },
  percent: {
    fontSize: 13,
    fontWeight: '900',
  },
  status: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '700',
  },
});