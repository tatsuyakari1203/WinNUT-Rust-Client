export interface UpsData {
  status: string;
  battery_charge?: number;
  battery_runtime?: number;
  battery_voltage?: number;
  battery_type?: string;
  input_voltage?: number;
  input_frequency?: number;
  input_voltage_fault?: number;
  output_voltage?: number;
  output_frequency?: number;
  output_voltage_nominal?: number;
  output_frequency_nominal?: number;
  ups_load?: number;
  ups_realpower_nominal?: number;
  ups_power_nominal?: number; // VA
  power_watts?: number;
  ups_mfr?: string;
  ups_model?: string;
  ups_serial?: string;
  ups_firmware?: string;
  ups_type?: string;
  ups_beeper_status?: string;
  driver_version?: string;
  driver_name?: string;

  // Standardization Extensions
  ambient_temp?: number;
  output_current?: number;
  battery_current?: number;
  ups_realpower?: number;
  extended_vars?: Record<string, string>;
}

export interface NutConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  ups_name: string;
}

export type ShutdownType = 'Shutdown' | 'Hibernate' | 'Sleep';

export interface ShutdownConfig {
  enabled: boolean;
  batteryThreshold: number; // %
  runtimeThreshold: number; // seconds
  stopType: ShutdownType;
  delaySeconds: number;
}

export interface EventLog {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'warning' | 'error';
}

export interface UpsState {
  data: UpsData | null;
  history: { time: string; load: number; watts: number }[];
  events: EventLog[];
  error: string | null;
  isConnected: boolean;
  lastUpdated: number | null;
  ratedPower: number | null; // Manually configured rated power
  fullLoadRuntime: number | null; // Minutes at 100% load
  config: NutConfig | null; // Persisted connection settings
  shutdownConfig: ShutdownConfig; // Persistence for shutdown logic
  supportedCommands: string[]; // List of commands the UPS supports
  theme: 'system' | 'light' | 'dark' | 'catppuccin' | 'dracula' | 'nord' | 'monokai' | 'github-dark';
  setUpsData: (data: UpsData) => void;
  setError: (error: string | null) => void;
  setConnected: (isConnected: boolean) => void;
  setRatedPower: (watts: number | null) => void;
  setFullLoadRuntime: (minutes: number | null) => void;
  setConfig: (config: NutConfig | null) => void;
  setShutdownConfig: (config: ShutdownConfig) => void;
  setSupportedCommands: (commands: string[]) => void;
  setTheme: (theme: 'system' | 'light' | 'dark' | 'catppuccin' | 'dracula' | 'nord' | 'monokai' | 'github-dark') => void;
  clearEvents: () => void;
}
