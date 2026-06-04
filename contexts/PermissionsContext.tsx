import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';

import {
    isBatteryPermissionGranted,
    isMotionPermissionGranted,
    requestMotionPermission,
    revokeMotionPermission,
    setBatteryPermissionGranted,
} from '@/utils/permissionService';

type PermissionsState = {
  motionGranted: boolean;
  batteryGranted: boolean;
  loadingPermissions: boolean;
  // Call this from activities — handles prompt + retry + settings
  askForMotion: () => Promise<boolean>;
  // Call this from settings toggle
  enableMotionFromSettings: () => Promise<boolean>;
  disableMotionFromSettings: () => Promise<void>;
  enableBattery: () => Promise<void>;
  disableBattery: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
};

const PermissionsContext = createContext<PermissionsState>({
  motionGranted: false,
  batteryGranted: true,
  loadingPermissions: true,
  askForMotion: async () => false,
  enableMotionFromSettings: async () => false,
  disableMotionFromSettings: async () => {},
  enableBattery: async () => {},
  disableBattery: async () => {},
  refreshPermissions: async () => {},
});

export function PermissionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [motionGranted, setMotionGranted] = useState(false);
  const [batteryGranted, setBatteryGranted] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  const refreshPermissions = useCallback(async () => {
    try {
      const [motion, battery] = await Promise.all([
        isMotionPermissionGranted(),
        isBatteryPermissionGranted(),
      ]);

      setMotionGranted(motion);
      setBatteryGranted(battery);
    } catch (error) {
      console.log('Failed to refresh permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  // Used by activities 4, 5, 7 — full smart retry flow
  const askForMotion = useCallback(async () => {
    const granted = await requestMotionPermission();
    setMotionGranted(granted);
    return granted;
  }, []);

  // Used by settings toggle ON
  const enableMotionFromSettings = useCallback(async () => {
    const granted = await requestMotionPermission();
    setMotionGranted(granted);
    return granted;
  }, []);

  // Used by settings toggle OFF
  const disableMotionFromSettings = useCallback(async () => {
    await revokeMotionPermission();
    setMotionGranted(false);
  }, []);

  const enableBattery = useCallback(async () => {
    await setBatteryPermissionGranted(true);
    setBatteryGranted(true);
  }, []);

  const disableBattery = useCallback(async () => {
    await setBatteryPermissionGranted(false);
    setBatteryGranted(false);
  }, []);

  return (
    <PermissionsContext.Provider
      value={{
        motionGranted,
        batteryGranted,
        loadingPermissions,
        askForMotion,
        enableMotionFromSettings,
        disableMotionFromSettings,
        enableBattery,
        disableBattery,
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