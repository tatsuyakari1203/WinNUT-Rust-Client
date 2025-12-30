import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UpsState, UpsData } from '../types/ups';

export const useUpsStore = create<UpsState>()(
  persist(
    (set) => ({
      data: null,
      history: [],
      isConnected: false,
      lastUpdated: null,
      error: null,
      ratedPower: 0,
      fullLoadRuntime: 0,
      config: null,
      shutdownConfig: {
        enabled: false,
        batteryThreshold: 30,
        runtimeThreshold: 120,
        stopType: 'Shutdown',
        delaySeconds: 15,
      },
      supportedCommands: [],

      events: [],

      setUpsData: (data: UpsData) =>
        set((state) => {
          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          // 0. Detect status changes for Event Log
          const oldStatus = state.data?.status;
          const newStatus = data.status;
          let newEvents = state.events || [];

          if (oldStatus && oldStatus !== newStatus) {
            const isWarning = newStatus.includes('OB') || newStatus.includes('LB');
            newEvents = [
              {
                id: Math.random().toString(36).substring(2, 9),
                time: timeStr,
                message: `${oldStatus} → ${newStatus}`,
                type: (isWarning ? 'warning' : 'info') as 'warning' | 'info'
              },
              ...newEvents
            ].slice(0, 10); // Keep last 10 events for compactness
          }

          // 1. Calculate Power Watts if missing
          let watts = data.power_watts || 0;
          const nominalWatts = state.ratedPower || 1800;

          if ((!data.power_watts || data.power_watts === 0) && data.ups_load) {
            watts = Math.round(nominalWatts * (data.ups_load / 100));
            data.power_watts = watts;
            if (!data.ups_realpower_nominal) {
              data.ups_realpower_nominal = nominalWatts;
            }
          }

          // 2. Estimate Runtime if missing
          const estMins = state.fullLoadRuntime || 30;
          if (!data.battery_runtime && data.ups_load && data.ups_load > 0) {
            const chargeFactor = (data.battery_charge || 100) / 100;
            const loadFactor = 100 / data.ups_load;
            data.battery_runtime = Math.round((estMins * 60) * loadFactor * chargeFactor);
          }

          const newHistoryItem = {
            time: timeStr,
            load: data.ups_load || 0,
            watts: watts
          };

          const newHistory = [...state.history, newHistoryItem].slice(-60);

          return {
            data,
            history: newHistory,
            events: newEvents,
            lastUpdated: now.getTime(),
          };
        }),
      setError: (error) => set({ error }),
      setConnected: (isConnected) => set({ isConnected }),
      setRatedPower: (watts) => set({ ratedPower: watts }),
      setFullLoadRuntime: (minutes) => set({ fullLoadRuntime: minutes }),
      setConfig: (config) => set({ config }),
      setShutdownConfig: (shutdownConfig) => set({ shutdownConfig }),
      setSupportedCommands: (supportedCommands) => set({ supportedCommands }),
      clearEvents: () => set({ events: [] }),
    }),
    {
      name: 'ups-storage',
      partialize: (state) => ({
        ratedPower: state.ratedPower,
        fullLoadRuntime: state.fullLoadRuntime,
        config: state.config,
        shutdownConfig: state.shutdownConfig,
        events: state.events,
      }),
    }
  )
);
