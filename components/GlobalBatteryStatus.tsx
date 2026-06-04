import * as Battery from 'expo-battery';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/contexts/AppThemeContext';
import { usePermissions } from '@/contexts/PermissionsContext';

function getBatteryIcon(percent: number | null) {
  if (percent === null) return '—';
  if (percent <= 10) return '🪫';
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
  const { batteryGranted } = usePermissions();

  // Live values from expo-battery hooks
  const liveBatteryLevel = Battery.useBatteryLevel();
  const liveBatteryState = Battery.useBatteryState();
  const liveLowPowerMode = Battery.useLowPowerMode();

  // Frozen snapshot — only updated when battery permission is ON
  const [frozenLevel, setFrozenLevel] = useState<number | null>(null);
  const [frozenState, setFrozenState] = useState<Battery.BatteryState | null>(
    null
  );
  const [frozenLowPower, setFrozenLowPower] = useState(false);

  // When permission is ON update the frozen snapshot with live values
  useEffect(() => {
    if (batteryGranted) {
      if (liveBatteryLevel !== null && liveBatteryLevel >= 0) {
        setFrozenLevel(liveBatteryLevel);
      }

      if (liveBatteryState !== null) {
        setFrozenState(liveBatteryState);
      }

      setFrozenLowPower(liveLowPowerMode ?? false);
    }
    // When batteryGranted is false we do NOT update frozen values
    // so they stay fixed at the last known value
  }, [batteryGranted, liveBatteryLevel, liveBatteryState, liveLowPowerMode]);

  // Use live values when permission is ON, frozen when OFF
  const displayLevel = batteryGranted ? liveBatteryLevel : frozenLevel;
  const displayState = batteryGranted ? liveBatteryState : frozenState;
  const displayLowPower = batteryGranted
    ? (liveLowPowerMode ?? false)
    : frozenLowPower;

  const batteryPercent =
    displayLevel === null || displayLevel < 0
      ? null
      : Math.round(displayLevel * 100);

  const isLowBattery = batteryPercent !== null && batteryPercent <= 20;

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <Pressable
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderColor: isLowBattery ? colors.danger : colors.border,
            opacity: batteryGranted ? 1 : 0.6,
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
            {!batteryGranted
              ? 'Paused'
              : displayLowPower
                ? 'Low Power'
                : getBatteryStateLabel(displayState)}
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
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  icon: { fontSize: 19, marginRight: 7 },
  percent: { fontSize: 13, fontWeight: '900' },
  status: { marginTop: 1, fontSize: 10, fontWeight: '700' },
});