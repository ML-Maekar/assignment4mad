import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/contexts/AppThemeContext';
import { useSensorService } from '@/hooks/useSensorService';

function formatSensorValue(value: number) {
  return value.toFixed(3);
}

function getAvailabilityText(value: boolean | null) {
  if (value === null) {
    return 'Not checked';
  }

  return value ? 'Available' : 'Unavailable';
}

export default function SensorServicePanel() {
  const { colors } = useAppTheme();

  const {
    accelerometer,
    gyroscope,
    movementStrength,
    rotationStrength,
    isAccelerometerRunning,
    isGyroscopeRunning,
    accelerometerAvailable,
    gyroscopeAvailable,
    errorMessage,
    startAccelerometer,
    stopAccelerometer,
    startGyroscope,
    stopGyroscope,
    stopAllSensors,
    resetSensorData,
  } = useSensorService();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Sensor Service
      </Text>

      <Text style={[styles.sectionDescription, { color: colors.subtitle }]}>
        Test accelerometer and gyroscope readings. These sensors will be reused
        in the earthquake, performance and breathing activities.
      </Text>

      {errorMessage && (
        <View
          style={[
            styles.warningBox,
            {
              borderColor: colors.danger,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Text style={[styles.warningText, { color: colors.danger }]}>
            {errorMessage}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.sensorBox,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.sensorHeader}>
          <View>
            <Text style={[styles.sensorTitle, { color: colors.text }]}>
              Accelerometer
            </Text>

            <Text style={[styles.sensorStatus, { color: colors.subtitle }]}>
              {getAvailabilityText(accelerometerAvailable)} •{' '}
              {isAccelerometerRunning ? 'Running' : 'Stopped'}
            </Text>
          </View>

          <Text
            style={[
              styles.liveBadge,
              {
                color: isAccelerometerRunning
                  ? colors.success
                  : colors.subtitle,
              },
            ]}
          >
            {isAccelerometerRunning ? 'LIVE' : 'OFF'}
          </Text>
        </View>

        <View style={styles.valueGrid}>
          <Text style={[styles.valueText, { color: colors.subtitle }]}>
            X: {formatSensorValue(accelerometer.x)}
          </Text>
          <Text style={[styles.valueText, { color: colors.subtitle }]}>
            Y: {formatSensorValue(accelerometer.y)}
          </Text>
          <Text style={[styles.valueText, { color: colors.subtitle }]}>
            Z: {formatSensorValue(accelerometer.z)}
          </Text>
        </View>

        <Text style={[styles.metricText, { color: colors.text }]}>
          Movement Strength: {formatSensorValue(movementStrength)}
        </Text>

        <Pressable
          onPress={
            isAccelerometerRunning ? stopAccelerometer : startAccelerometer
          }
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: isAccelerometerRunning
                ? colors.danger
                : colors.tint,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.actionButtonText, { color: colors.buttonText }]}>
            {isAccelerometerRunning
              ? 'Stop Accelerometer'
              : 'Start Accelerometer'}
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.sensorBox,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.sensorHeader}>
          <View>
            <Text style={[styles.sensorTitle, { color: colors.text }]}>
              Gyroscope
            </Text>

            <Text style={[styles.sensorStatus, { color: colors.subtitle }]}>
              {getAvailabilityText(gyroscopeAvailable)} •{' '}
              {isGyroscopeRunning ? 'Running' : 'Stopped'}
            </Text>
          </View>

          <Text
            style={[
              styles.liveBadge,
              {
                color: isGyroscopeRunning ? colors.success : colors.subtitle,
              },
            ]}
          >
            {isGyroscopeRunning ? 'LIVE' : 'OFF'}
          </Text>
        </View>

        <View style={styles.valueGrid}>
          <Text style={[styles.valueText, { color: colors.subtitle }]}>
            X: {formatSensorValue(gyroscope.x)}
          </Text>
          <Text style={[styles.valueText, { color: colors.subtitle }]}>
            Y: {formatSensorValue(gyroscope.y)}
          </Text>
          <Text style={[styles.valueText, { color: colors.subtitle }]}>
            Z: {formatSensorValue(gyroscope.z)}
          </Text>
        </View>

        <Text style={[styles.metricText, { color: colors.text }]}>
          Rotation Strength: {formatSensorValue(rotationStrength)}
        </Text>

        <Pressable
          onPress={isGyroscopeRunning ? stopGyroscope : startGyroscope}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: isGyroscopeRunning
                ? colors.danger
                : colors.tint,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.actionButtonText, { color: colors.buttonText }]}>
            {isGyroscopeRunning ? 'Stop Gyroscope' : 'Start Gyroscope'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.utilityRow}>
        <Pressable
          onPress={stopAllSensors}
          style={({ pressed }) => [
            styles.outlineButton,
            {
              borderColor: colors.danger,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.outlineButtonText, { color: colors.danger }]}>
            Stop All
          </Text>
        </Pressable>

        <Pressable
          onPress={resetSensorData}
          style={({ pressed }) => [
            styles.outlineButton,
            {
              borderColor: colors.tint,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.outlineButtonText, { color: colors.tint }]}>
            Reset
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  sectionDescription: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  warningBox: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  sensorBox: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  sensorTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sensorStatus: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  liveBadge: {
    fontSize: 13,
    fontWeight: '900',
  },
  valueGrid: {
    marginTop: 14,
    gap: 4,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '700',
  },
  metricText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '800',
  },
  actionButton: {
    marginTop: 14,
    minHeight: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  utilityRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  outlineButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
});