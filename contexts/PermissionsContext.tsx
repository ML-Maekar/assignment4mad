import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';

import {
    isBatteryPermissionGranted,
    isCameraPermissionGranted,
    isMicPermissionGranted,
    isMotionPermissionGranted,
    requestCameraPermission,
    requestMicPermission,
    requestMotionPermission,
    revokeCameraPermission,
    revokeMicPermission,
    revokeMotionPermission,
    setBatteryPermissionGranted,
} from '@/utils/permissionService';

import {
    isLocationPermissionGranted,
    requestLocationPermission,
    revokeLocationPermission,
} from '@/utils/locationService';

type PermissionsState = {
  motionGranted: boolean;
  batteryGranted: boolean;
  cameraGranted: boolean;
  micGranted: boolean;
  locationGranted: boolean;
  loadingPermissions: boolean;
  askForMotion: () => Promise<boolean>;
  askForCamera: () => Promise<boolean>;
  askForMic: () => Promise<boolean>;
  askForLocation: () => Promise<boolean>;
  enableMotionFromSettings: () => Promise<boolean>;
  disableMotionFromSettings: () => Promise<void>;
  enableBattery: () => Promise<void>;
  disableBattery: () => Promise<void>;
  enableCameraFromSettings: () => Promise<boolean>;
  disableCameraFromSettings: () => Promise<void>;
  enableMicFromSettings: () => Promise<boolean>;
  disableMicFromSettings: () => Promise<void>;
  enableLocationFromSettings: () => Promise<boolean>;
  disableLocationFromSettings: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
};

const PermissionsContext = createContext<PermissionsState>({
  motionGranted: false,
  batteryGranted: true,
  cameraGranted: false,
  micGranted: false,
  locationGranted: false,
  loadingPermissions: true,
  askForMotion: async () => false,
  askForCamera: async () => false,
  askForMic: async () => false,
  askForLocation: async () => false,
  enableMotionFromSettings: async () => false,
  disableMotionFromSettings: async () => {},
  enableBattery: async () => {},
  disableBattery: async () => {},
  enableCameraFromSettings: async () => false,
  disableCameraFromSettings: async () => {},
  enableMicFromSettings: async () => false,
  disableMicFromSettings: async () => {},
  enableLocationFromSettings: async () => false,
  disableLocationFromSettings: async () => {},
  refreshPermissions: async () => {},
});

export function PermissionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [motionGranted, setMotionGranted] = useState(false);
  const [batteryGranted, setBatteryGranted] = useState(true);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  const refreshPermissions = useCallback(async () => {
    try {
      const [motion, battery, camera, mic, location] = await Promise.all([
        isMotionPermissionGranted(),
        isBatteryPermissionGranted(),
        isCameraPermissionGranted(),
        isMicPermissionGranted(),
        isLocationPermissionGranted(),
      ]);

      setMotionGranted(motion);
      setBatteryGranted(battery);
      setCameraGranted(camera);
      setMicGranted(mic);
      setLocationGranted(location);
    } catch (error) {
      console.log('Failed to refresh permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  // ─── Motion ───────────────────────────────────────────────────
  const askForMotion = useCallback(async () => {
    const granted = await requestMotionPermission();
    setMotionGranted(granted);
    return granted;
  }, []);

  const enableMotionFromSettings = useCallback(async () => {
    const granted = await requestMotionPermission();
    setMotionGranted(granted);
    return granted;
  }, []);

  const disableMotionFromSettings = useCallback(async () => {
    await revokeMotionPermission();
    setMotionGranted(false);
  }, []);

  // ─── Battery ──────────────────────────────────────────────────
  const enableBattery = useCallback(async () => {
    await setBatteryPermissionGranted(true);
    setBatteryGranted(true);
  }, []);

  const disableBattery = useCallback(async () => {
    await setBatteryPermissionGranted(false);
    setBatteryGranted(false);
  }, []);

  // ─── Camera ───────────────────────────────────────────────────
  const askForCamera = useCallback(async () => {
    const granted = await requestCameraPermission();
    setCameraGranted(granted);
    return granted;
  }, []);

  const enableCameraFromSettings = useCallback(async () => {
    const granted = await requestCameraPermission();
    setCameraGranted(granted);
    return granted;
  }, []);

  const disableCameraFromSettings = useCallback(async () => {
    await revokeCameraPermission();
    setCameraGranted(false);
  }, []);

  // ─── Microphone ───────────────────────────────────────────────
  const askForMic = useCallback(async () => {
    const granted = await requestMicPermission();
    setMicGranted(granted);
    return granted;
  }, []);

  const enableMicFromSettings = useCallback(async () => {
    const granted = await requestMicPermission();
    setMicGranted(granted);
    return granted;
  }, []);

  const disableMicFromSettings = useCallback(async () => {
    await revokeMicPermission();
    setMicGranted(false);
  }, []);

  // ─── Location ─────────────────────────────────────────────────
  const askForLocation = useCallback(async () => {
    const granted = await requestLocationPermission();
    setLocationGranted(granted);
    return granted;
  }, []);

  const enableLocationFromSettings = useCallback(async () => {
    const granted = await requestLocationPermission();
    setLocationGranted(granted);
    return granted;
  }, []);

  const disableLocationFromSettings = useCallback(async () => {
    await revokeLocationPermission();
    setLocationGranted(false);
  }, []);

  return (
    <PermissionsContext.Provider
      value={{
        motionGranted,
        batteryGranted,
        cameraGranted,
        micGranted,
        locationGranted,
        loadingPermissions,
        askForMotion,
        askForCamera,
        askForMic,
        askForLocation,
        enableMotionFromSettings,
        disableMotionFromSettings,
        enableBattery,
        disableBattery,
        enableCameraFromSettings,
        disableCameraFromSettings,
        enableMicFromSettings,
        disableMicFromSettings,
        enableLocationFromSettings,
        disableLocationFromSettings,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}