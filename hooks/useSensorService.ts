import { Accelerometer, Gyroscope } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';

type SensorData = {
  x: number;
  y: number;
  z: number;
};

type StartSensorOptions = {
  updateInterval?: number;
  onData?: (data: SensorData) => void;
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
  checkAccelerometerAvailability: () => Promise<boolean>;
  checkGyroscopeAvailability: () => Promise<boolean>;
  startAccelerometer: (options?: StartSensorOptions) => Promise<boolean>;
  stopAccelerometer: () => void;
  startGyroscope: (options?: StartSensorOptions) => Promise<boolean>;
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

export function getSensorMagnitude(data: SensorData) {
  return getMagnitude(data);
}

export function getMovementStrength(data: SensorData) {
  return Math.abs(getMagnitude(data) - 1);
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

  const checkAccelerometerAvailability = async () => {
    try {
      const available = await Accelerometer.isAvailableAsync();
      setAccelerometerAvailable(available);

      if (!available) {
        setErrorMessage('Accelerometer is not available on this device.');
      }

      return available;
    } catch (error) {
      console.log('Could not check accelerometer availability:', error);
      setAccelerometerAvailable(false);
      setErrorMessage('Could not check accelerometer availability.');
      return false;
    }
  };

  const checkGyroscopeAvailability = async () => {
    try {
      const available = await Gyroscope.isAvailableAsync();
      setGyroscopeAvailable(available);

      if (!available) {
        setErrorMessage('Gyroscope is not available on this device.');
      }

      return available;
    } catch (error) {
      console.log('Could not check gyroscope availability:', error);
      setGyroscopeAvailable(false);
      setErrorMessage('Could not check gyroscope availability.');
      return false;
    }
  };

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

  const startAccelerometer = async (options?: StartSensorOptions) => {
    try {
      setErrorMessage(null);

      const available = await checkAccelerometerAvailability();

      if (!available) {
        return false;
      }

      stopAccelerometer();

      Accelerometer.setUpdateInterval(options?.updateInterval ?? 200);

      accelerometerSubscriptionRef.current = Accelerometer.addListener(
        (data) => {
          const sensorData: SensorData = {
            x: data.x,
            y: data.y,
            z: data.z,
          };

          setAccelerometer(sensorData);
          options?.onData?.(sensorData);
        }
      );

      setIsAccelerometerRunning(true);
      return true;
    } catch (error) {
      console.log('Could not start accelerometer:', error);
      setErrorMessage('Could not start the accelerometer sensor.');
      setIsAccelerometerRunning(false);
      return false;
    }
  };

  const startGyroscope = async (options?: StartSensorOptions) => {
    try {
      setErrorMessage(null);

      const available = await checkGyroscopeAvailability();

      if (!available) {
        return false;
      }

      stopGyroscope();

      Gyroscope.setUpdateInterval(options?.updateInterval ?? 200);

      gyroscopeSubscriptionRef.current = Gyroscope.addListener((data) => {
        const sensorData: SensorData = {
          x: data.x,
          y: data.y,
          z: data.z,
        };

        setGyroscope(sensorData);
        options?.onData?.(sensorData);
      });

      setIsGyroscopeRunning(true);
      return true;
    } catch (error) {
      console.log('Could not start gyroscope:', error);
      setErrorMessage('Could not start the gyroscope sensor.');
      setIsGyroscopeRunning(false);
      return false;
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
    checkAccelerometerAvailability,
    checkGyroscopeAvailability,
    startAccelerometer,
    stopAccelerometer,
    startGyroscope,
    stopGyroscope,
    stopAllSensors,
    resetSensorData,
  };
}