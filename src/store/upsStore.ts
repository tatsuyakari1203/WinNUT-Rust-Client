import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UpsState } from '../types/ups';

export const useUpsStore = create<UpsState>()(
  persist(
    (set) => ({
      data: null,
      history: [],
      isConnected: false,
      lastUpdated: null,
      error: null,
      ratedPower: null,
      setUpsData: (data) =>
        set((state) => {
          const now = new Date();
          const timeStr = now.toLocaleTimeString();

          // Calculate watts if missing from backend but we have manual rated power
          let watts = data.power_watts || 0;

          // Logic: If backend provides 0 or undefined watts, AND we have load %, AND we have ratedPower
          // Then calculate it.
          // Note: Some UPS report 0 watts when load is very low, but usually load > 0 means watts > 0.
          if ((!data.power_watts || data.power_watts === 0) && state.ratedPower && data.ups_load) {
            watts = Math.round(state.ratedPower * (data.ups_load / 100));
            // Update the data object locally so UI components see it too
            data.power_watts = watts;

            // If backend didn't report nominal, fill it with ours for display
            if (!data.ups_realpower_nominal) {
              data.ups_realpower_nominal = state.ratedPower;
            }
          }

          const newHistoryItem = {
            time: timeStr,
            load: data.ups_load || 0,
            watts: watts
          };

          // Keep last 60 points
          const newHistory = [...state.history, newHistoryItem].slice(-60);

          return {
            data,
            history: newHistory,
            lastUpdated: now.getTime(), // Store as timestamp number
          };
        }),
      setIsConnected: (connected) => set({ isConnected: connected }),
      setError: (error) => set({ error }),
      setConnected: (isConnected) => set({ isConnected }),
      setRatedPower: (watts) => set({ ratedPower: watts }),
    }),
    {
      name: 'ups-storage',
      partialize: (state) => ({ ratedPower: state.ratedPower }), // Only persist ratedPower
    }
  )
);
