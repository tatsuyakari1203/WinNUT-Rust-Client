import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

export function useShutdownMonitor() {
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    let unlistenWarning: (() => void) | undefined;
    let unlistenCancelled: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenWarning = await listen<number>('shutdown-warning', (event) => {
        setCountdown(event.payload);
      });

      unlistenCancelled = await listen('shutdown-cancelled', () => {
        setCountdown(null);
      });
    };

    setupListeners();

    return () => {
      if (unlistenWarning) unlistenWarning();
      if (unlistenCancelled) unlistenCancelled();
    };
  }, []);

  return { countdown };
}
