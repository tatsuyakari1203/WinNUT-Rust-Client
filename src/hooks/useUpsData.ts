import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useUpsStore } from '../store/upsStore';
import { UpsData } from '../types/ups';

export function useUpsData() {
  const setUpsData = useUpsStore((state) => state.setUpsData);

  useEffect(() => {
    const unlisten = listen<UpsData>('ups-update', (event) => {
      console.log('Received UPS update:', event.payload);
      setUpsData(event.payload);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, [setUpsData]);
}
