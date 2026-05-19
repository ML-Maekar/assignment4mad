import { Accelerometer, Gyroscope } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';

type SensorData = {
  x: number;
  y: number;
  z: number;
};

type SensorServiceState = {
  accelerometer: SensorData;
  gyroscope: SensorData;
  accelerometerMagnitude: number;
  gyroscopeMagnitude: number;
  movementStrength: number;
  rotationStrength: number;
  isAccelerometerRunning: boolean;
  isGyroscopeRunning: boolean;
  accelerometerAvailable: boolean | null;
  gyroscopeAvailable: boolean | null;
  errorMessage: string | null;
  startAccelerometer: () => Promise<void>;
  stopAccelerometer: () => void;
  startGyroscope: () => Promise<void>;
  stopGyroscope: () => void;
  stopAllSensors: () => void;
  resetSensorData: () => void;
};

const EMPTY_SENSOR_DATA: SensorData = {
  x: 0,
  y: 0,
  z: 0,
};

function getMagnitude(data: SensorData) {
  return Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
}

export function useSensorService(): SensorServiceState {
  const [accelerometer, setAccelerometer] =
    useState<SensorData>(EMPTY_SENSOR_DATA);
  const [gyroscope, setGyroscope] = useState<SensorData>(EMPTY_SENSOR_DATA);

  const [isAccelerometerRunning, setIsAccelerometerRunning] = useState(false);
  const [isGyroscopeRunning, setIsGyroscopeRunning] = useState(false);

  const [accelerometerAvailable, setAccelerometerAvailable] =
    useState<boolean | null>(null);
  const [gyroscopeAvailable, setGyroscopeAvailable] =
    useState<boolean | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const accelerometerSubscriptionRef = useRef<{ remove: () => void } | null>(
    null
  );
  const gyroscopeSubscriptionRef = useRef<{ remove: () => void } | null>(null);

  const accelerometerMagnitude = getMagnitude(accelerometer);
  const gyroscopeMagnitude = getMagnitude(gyroscope);

  const movementStrength = Math.abs(accelerometerMagnitude - 1);
  const rotationStrength = gyroscopeMagnitude;

  const stopAccelerometer = () => {
    accelerometerSubscriptionRef.current?.remove();
    accelerometerSubscriptionRef.current = null;
    setIsAccelerometerRunning(false);
  };

  const stopGyroscope = () => {
    gyroscopeSubscriptionRef.current?.remove();
    gyroscopeSubscriptionRef.current = null;
    setIsGyroscopeRunning(false);
  };

  const stopAllSensors = () => {
    stopAccelerometer();
    stopGyroscope();
  };

  const resetSensorData = () => {
    setAccelerometer(EMPTY_SENSOR_DATA);
    setGyroscope(EMPTY_SENSOR_DATA);
    setErrorMessage(null);
  };

  const startAccelerometer = async () => {
    try {
      setErrorMessage(null);

      const available = await Accelerometer.isAvailableAsync();
      setAccelerometerAvailable(available);

      if (!available) {
        setErrorMessage('Accelerometer is not available on this device.');
        return;
      }

      stopAccelerometer();

      Accelerometer.setUpdateInterval(200);

      accelerometerSubscriptionRef.current = Accelerometer.addListener(
        (data) => {
          setAccelerometer({
            x: data.x,
            y: data.y,
            z: data.z,
          });
        }
      );

      setIsAccelerometerRunning(true);
    } catch (error) {
      setErrorMessage('Could not start the accelerometer sensor.');
      setIsAccelerometerRunning(false);
    }
  };

  const startGyroscope = async () => {
    try {
      setErrorMessage(null);

      const available = await Gyroscope.isAvailableAsync();
      setGyroscopeAvailable(available);

      if (!available) {
        setErrorMessage('Gyroscope is not available on this device.');
        return;
      }

      stopGyroscope();

      Gyroscope.setUpdateInterval(200);

      gyroscopeSubscriptionRef.current = Gyroscope.addListener((data) => {
        setGyroscope({
          x: data.x,
          y: data.y,
          z: data.z,
        });
      });

      setIsGyroscopeRunning(true);
    } catch (error) {
      setErrorMessage('Could not start the gyroscope sensor.');
      setIsGyroscopeRunning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopAllSensors();
    };
  }, []);

  return {
    accelerometer,
    gyroscope,
    accelerometerMagnitude,
    gyroscopeMagnitude,
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
  };
}