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
      ratedPower: 1800, // Default for 3000VA
      fullLoadRuntime: 30, // Default to match WinNut optimism
      config: null,
      shutdownConfig: {
        enabled: false,
        batteryThreshold: 30,
        runtimeThreshold: 120,
        stopType: 'Shutdown',
        delaySeconds: 15,
      },

      setUpsData: (data: UpsData) =>
        set((state) => {
          const now = new Date();
          const timeStr = now.toLocaleTimeString();

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
            lastUpdated: now.getTime(),
          };
        }),
      setError: (error) => set({ error }),
      setConnected: (isConnected) => set({ isConnected }),
      setRatedPower: (watts) => set({ ratedPower: watts }),
      setFullLoadRuntime: (minutes) => set({ fullLoadRuntime: minutes }),
      setConfig: (config) => set({ config }),
      setShutdownConfig: (shutdownConfig) => set({ shutdownConfig }),
    }),
    {
      name: 'ups-storage',
      partialize: (state) => ({
        ratedPower: state.ratedPower,
        fullLoadRuntime: state.fullLoadRuntime,
        config: state.config,
        shutdownConfig: state.shutdownConfig,
      }),
    }
  )
);
