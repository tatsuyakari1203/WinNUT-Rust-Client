import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useUpsStore } from '../store/upsStore';

export function useShutdownMonitor() {
  const { data, shutdownConfig, isConnected } = useUpsStore();
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!shutdownConfig.enabled || !isConnected || !data) {
      if (countdown !== null) setCountdown(null);
      return;
    }

    const isOnBattery = data.status?.includes('OB');
    const batteryLevel = data.battery_charge || 100;
    const runtimeRemaining = data.battery_runtime || 9999;

    const shouldTrigger =
      isOnBattery &&
      (batteryLevel <= shutdownConfig.batteryThreshold ||
        runtimeRemaining <= shutdownConfig.runtimeThreshold);

    if (shouldTrigger) {
      if (countdown === null) {
        // Start countdown
        setCountdown(shutdownConfig.delaySeconds);
      }
    } else {
      // Condition cleared (power returned or thresholds reset)
      if (countdown !== null) {
        setCountdown(null);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }
  }, [data, shutdownConfig, isConnected]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = window.setInterval(() => {
        setCountdown(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
      timerRef.current = timer;
      return () => window.clearInterval(timer);
    } else if (countdown === 0) {
      // EXECUTE SHUTDOWN
      handleShutdown();
    }
  }, [countdown]);

  const handleShutdown = async () => {
    try {
      console.log(`Triggering system ${shutdownConfig.stopType}...`);
      await invoke('trigger_system_stop', { actionType: shutdownConfig.stopType });
    } catch (e) {
      console.error('Failed to trigger shutdown:', e);
    }
  };

  return { countdown };
}
