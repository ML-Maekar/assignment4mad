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
    requestBatteryPermission,
    requestMotionPermission,
    revokeBatteryPermission,
    revokeMotionPermission,
} from '@/utils/permissionService';

type PermissionsState = {
  motionGranted: boolean;
  batteryGranted: boolean;
  loadingPermissions: boolean;
  enableMotion: () => Promise<boolean>;
  disableMotion: () => Promise<void>;
  enableBattery: () => Promise<boolean>;
  disableBattery: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
};

const PermissionsContext = createContext<PermissionsState>({
  motionGranted: false,
  batteryGranted: true,
  loadingPermissions: true,
  enableMotion: async () => false,
  disableMotion: async () => {},
  enableBattery: async () => false,
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

  const enableMotion = useCallback(async () => {
    const granted = await requestMotionPermission();
    setMotionGranted(granted);
    return granted;
  }, []);

  const disableMotion = useCallback(async () => {
    await revokeMotionPermission();
    setMotionGranted(false);
  }, []);

  const enableBattery = useCallback(async () => {
    const granted = await requestBatteryPermission();
    setBatteryGranted(granted);
    return granted;
  }, []);

  const disableBattery = useCallback(async () => {
    await revokeBatteryPermission();
    setBatteryGranted(false);
  }, []);

  return (
    <PermissionsContext.Provider
      value={{
        motionGranted,
        batteryGranted,
        loadingPermissions,
        enableMotion,
        disableMotion,
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