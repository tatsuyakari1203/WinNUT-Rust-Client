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
}

export interface UpsState {
  data: UpsData | null;
  history: { time: string; load: number; watts: number }[];
  error: string | null;
  isConnected: boolean;
  lastUpdated: number | null;
  ratedPower: number | null; // Manually configured rated power
  fullLoadRuntime: number | null; // Minutes at 100% load
  setUpsData: (data: UpsData) => void;
  setError: (error: string | null) => void;
  setConnected: (isConnected: boolean) => void;
  setRatedPower: (watts: number | null) => void;
  setFullLoadRuntime: (minutes: number | null) => void;
}
