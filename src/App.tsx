import { Zap, Activity, Cpu, Server, Plug, Waves } from "lucide-react";
import "./App.css";
import { useUpsData } from "./hooks/useUpsData";
import { useUpsStore } from "./store/upsStore";
import { StatusCard } from "./components/dashboard/StatusCard";
import { BatteryGauge } from "./components/dashboard/BatteryGauge";
import { LoadChart } from "./components/dashboard/LoadChart";
import { SettingsModal } from "./components/settings/SettingsModal";
import { PowerStatus } from "./components/dashboard/PowerStatus";

function App() {
  // Initialize listener
  useUpsData();

  const { data, history } = useUpsStore();

  const status = data?.status || "UNKNOWN";
  const isOnBattery = status.includes("OB");
  const isOnline = status.includes("OL");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-50 select-none">

      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Header - Minimal & Clean */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <Zap className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Tauri NUT</h1>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-green-500' : isOnBattery ? 'bg-red-500' : 'bg-zinc-300'} animate-pulse`}></span>
                <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Monitoring Active</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{data?.ups_model || "No Device"}</span>
            </div>
            <SettingsModal />
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Battery Focus */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="flex-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <BatteryGauge
                percentage={data?.battery_charge || 0}
                status={status}
                voltage={data?.battery_voltage}
                runtime={data?.battery_runtime}
              />
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl p-6">
              <PowerStatus status={status} />
            </div>
          </div>

          {/* Right Column: Metrics & Chart */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <StatusCard
                title="Input Voltage"
                value={data?.input_voltage}
                unit="V"
                icon={Plug}
                className="rounded-xl border-zinc-100 bg-zinc-50/50"
              />
              <StatusCard
                title="Output Voltage"
                value={data?.output_voltage}
                unit="V"
                icon={Waves}
                className="rounded-xl border-zinc-100 bg-zinc-50/50"
              />
              <StatusCard
                title="Load Level"
                value={data?.ups_load}
                unit="%"
                icon={Cpu}
                className="rounded-xl border-zinc-100 bg-zinc-50/50"
                subValue="System Load"
              />
              <StatusCard
                title="Frequency"
                value={data?.output_frequency}
                unit="Hz"
                icon={Activity}
                className="rounded-xl border-zinc-100 bg-zinc-50/50"
              />
              <StatusCard
                title="Real Power"
                value={data?.power_watts ? Math.round(data.power_watts) : "--"}
                unit="W"
                icon={Server}
                className="col-span-2 md:col-span-2 rounded-xl border-zinc-900 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                subValue={data?.ups_realpower_nominal ? `Capacity: ${data.ups_realpower_nominal} W` : undefined}
              />
            </div>

            <div className="flex-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Power Usage Trend</h3>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-[10px] font-bold tracking-wider text-zinc-600 dark:text-zinc-400">LIVE</span>
                </div>
              </div>
              <div className="h-[240px] w-full">
                <LoadChart data={history} />
              </div>
            </div>

            {/* Detailed Information Section */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-8 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Device Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8 text-sm">
                <div className="space-y-4">
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 pb-2 border-b border-zinc-100 dark:border-zinc-800">System</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Manufacturer</span>
                      <span className="font-medium">{data?.ups_mfr || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-medium">{data?.ups_model || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Serial</span>
                      <span className="font-medium">{data?.ups_serial || "--"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Firmware</span>
                      <span className="font-medium">{data?.ups_firmware || "--"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 pb-2 border-b border-zinc-100 dark:border-zinc-800">Configuration</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium">{data?.ups_type || "--"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Beeper</span>
                      <span className="font-medium capitalize">{data?.ups_beeper_status || "--"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Driver</span>
                      <span className="font-medium">{data?.driver_version || "--"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Driver Name</span>
                      <span className="font-medium">{data?.driver_name || "--"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 pb-2 border-b border-zinc-100 dark:border-zinc-800">Rating</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nominal Power</span>
                      <span className="font-medium">{data?.ups_realpower_nominal ? `${data.ups_realpower_nominal} W` : "--"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nominal Voltage</span>
                      <span className="font-medium">{data?.output_voltage_nominal ? `${data.output_voltage_nominal} V` : "--"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nominal Freq</span>
                      <span className="font-medium">{data?.output_frequency_nominal ? `${data.output_frequency_nominal} Hz` : "--"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Battery Type</span>
                      <span className="font-medium">{data?.battery_type || "PbAc"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
