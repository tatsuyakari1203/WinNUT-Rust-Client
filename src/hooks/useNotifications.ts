import { useEffect, useRef } from 'react';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { useUpsStore } from '../store/upsStore';

export function useNotifications() {
  const events = useUpsStore((state) => state.events);
  const lastEventId = useRef<string | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
    };
    checkPermission();
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[0];

      // Only notify if it's a new event and not the one we just handled
      if (latestEvent.id !== lastEventId.current) {
        lastEventId.current = latestEvent.id;

        // Map common status transitions to human-friendly messages
        let detail = latestEvent.message;
        if (latestEvent.message.includes('OL → OB')) detail = '⚠️ Power Lost! UPS is now running on Battery.';
        if (latestEvent.message.includes('OB → OL')) detail = '✅ Power Restored! System is back on AC power.';
        if (latestEvent.message.includes('LB')) detail = '🚨 CRITICAL: Battery is Low!';

        sendNotification({
          title: latestEvent.type === 'warning' ? 'WinNUT Alert' : 'WinNUT StatusUpdate',
          body: detail,
        });
      }
    }
  }, [events]);
}
