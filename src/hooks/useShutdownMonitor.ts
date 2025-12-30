import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useUpsStore } from '../store/upsStore';

export function useShutdownMonitor() {
  const { data, shutdownConfig, isConnected } = useUpsStore();
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const nativeShutdownSent = useRef(false);

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
      if (shutdownConfig.stopType === 'Shutdown') {
        // Native Windows Shutdown (Scheduled)
        if (!nativeShutdownSent.current) {
          console.log(`Scheduling native shutdown in ${shutdownConfig.delaySeconds}s`);
          invoke('trigger_system_stop', {
            actionType: 'Shutdown',
            delaySec: shutdownConfig.delaySeconds
          }).catch(console.error);
          nativeShutdownSent.current = true;

          // Set visual countdown to mirror Windows timer
          if (countdown === null) setCountdown(shutdownConfig.delaySeconds);
        }
      } else {
        // Hibernate/Sleep (Software Countdown)
        if (countdown === null) {
          setCountdown(shutdownConfig.delaySeconds);
        }
      }
    } else {
      // Condition cleared
      if (nativeShutdownSent.current) {
        console.log("Condition cleared. Aborting native shutdown.");
        invoke('abort_system_stop').catch(console.error);
        nativeShutdownSent.current = false;
      }

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
      // Execute immediate action ONLY if not native shutdown (which is handled by OS)
      // Or if we strictly want to enforce Hibernate/Sleep
      if (shutdownConfig.stopType !== 'Shutdown') {
        executeImmediateAction();
      }
    }
  }, [countdown]);

  const executeImmediateAction = async () => {
    try {
      console.log(`Triggering system ${shutdownConfig.stopType} now...`);
      await invoke('trigger_system_stop', {
        actionType: shutdownConfig.stopType,
        delaySec: 0
      });
    } catch (e) {
      console.error('Failed to trigger action:', e);
    }
  };

  return { countdown };
}
