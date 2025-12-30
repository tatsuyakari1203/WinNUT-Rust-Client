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
  useUpsData();
  const { data, history } = useUpsStore();

  const status = data?.status || "UNKNOWN";
  const isOnBattery = status.includes("OB");
  const isOnline = status.includes("OL");

  return (
    <div className="h-screen bg-white dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-50 select-none overflow-hidden flex flex-col">
      {/* Header - Ultra Flush */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-yellow-500" />
          <h1 className="text-xs font-bold tracking-tight">Tauri UPS Monitor</h1>
          <div className="flex items-center gap-1.5 ml-2">
            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-green-500' : isOnBattery ? 'bg-orange-500' : 'bg-red-500'}`}></span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground mr-2 font-medium">{data?.ups_model || "--"}</span>
          <SettingsModal />
        </div>
      </header>

      {/* Main Content - Tight 3 Columns */}
      <main className="flex-1 flex min-h-0 divide-x divide-zinc-100 dark:divide-zinc-800/50">

        {/* LEFT: Battery (20%) */}
        <section className="w-[20%] p-4 flex flex-col gap-6 shrink-0 h-full overflow-y-auto">
          <BatteryGauge
            percentage={data?.battery_charge || 0}
            status={status}
            voltage={data?.battery_voltage}
            runtime={data?.battery_runtime}
          />
          <PowerStatus status={status} />
        </section>

        {/* CENTER: Real-time Stats & Chart (50%) */}
        <section className="flex-1 p-4 flex flex-col gap-6 h-full min-w-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
            <StatusCard title="Input" value={data?.input_voltage} unit="V" icon={Plug} />
            <StatusCard title="Output" value={data?.output_voltage} unit="V" icon={Waves} />
            <StatusCard title="Load" value={data?.ups_load} unit="%" icon={Cpu} />
            <StatusCard title="Power" value={data?.power_watts ? Math.round(data.power_watts) : "--"} unit="W" icon={Server} />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <h3 className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Usage Trend</h3>
              </div>
              <span className="text-[9px] font-bold text-green-500">LIVE</span>
            </div>
            <div className="flex-1 w-full min-h-0">
              <LoadChart data={history} />
            </div>
          </div>
        </section>

        {/* RIGHT: Detailed Info (30%) */}
        <section className="w-[30%] p-4 flex flex-col gap-4 shrink-0 h-full overflow-y-auto bg-zinc-50/30 dark:bg-zinc-900/10">
          <h3 className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase border-b border-zinc-100 dark:border-zinc-800 pb-1 mb-1">System Information</h3>

          <div className="space-y-4">
            <div>
              <h4 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 mb-1.5 uppercase">Identity</h4>
              <dl className="space-y-1 text-[11px]">
                <div className="flex justify-between gap-2 border-b border-zinc-50 dark:border-zinc-800 pb-0.5"><dt className="text-muted-foreground">Manufacturer</dt><dd className="font-medium text-right truncate">{data?.ups_mfr || "--"}</dd></div>
                <div className="flex justify-between gap-2 border-b border-zinc-50 dark:border-zinc-800 pb-0.5"><dt className="text-muted-foreground">Model</dt><dd className="font-medium text-right truncate">{data?.ups_model || "--"}</dd></div>
                <div className="flex justify-between gap-2 border-b border-zinc-50 dark:border-zinc-800 pb-0.5"><dt className="text-muted-foreground">Serial</dt><dd className="font-medium text-right truncate">{data?.ups_serial || "--"}</dd></div>
                <div className="flex justify-between gap-2 border-b border-zinc-50 dark:border-zinc-800 pb-0.5"><dt className="text-muted-foreground">Firmware</dt><dd className="font-medium text-right truncate">{data?.ups_firmware || "--"}</dd></div>
              </dl>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 mb-1.5 uppercase">Capability</h4>
              <dl className="space-y-1 text-[11px]">
                <div className="flex justify-between gap-2 border-b border-zinc-50 dark:border-zinc-800 pb-0.5"><dt className="text-muted-foreground">Type</dt><dd className="font-medium">{data?.ups_type || "--"}</dd></div>
                <div className="flex justify-between gap-2 border-b border-zinc-50 dark:border-zinc-800 pb-0.5"><dt className="text-muted-foreground">Nom. Power</dt><dd className="font-medium">{data?.ups_realpower_nominal ? `${data.ups_realpower_nominal}W` : "--"}</dd></div>
                <div className="flex justify-between gap-2 border-b border-zinc-50 dark:border-zinc-800 pb-0.5"><dt className="text-muted-foreground">Nom. Volt</dt><dd className="font-medium">{data?.output_voltage_nominal || "--"}V</dd></div>
                <div className="flex justify-between gap-2 border-b border-zinc-50 dark:border-zinc-800 pb-0.5"><dt className="text-muted-foreground">Nom. Freq</dt><dd className="font-medium">{data?.output_frequency_nominal || "--"}Hz</dd></div>
              </dl>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 mb-1.5 uppercase">Service</h4>
              <dl className="space-y-1 text-[11px]">
                <div className="flex justify-between gap-2 border-b border-zinc-50 dark:border-zinc-800 pb-0.5"><dt className="text-muted-foreground">Driver</dt><dd className="font-medium">{data?.driver_name || "--"}</dd></div>
                <div className="flex justify-between gap-2 border-b border-zinc-50 dark:border-zinc-800 pb-0.5"><dt className="text-muted-foreground">Version</dt><dd className="font-medium">{data?.driver_version || "--"}</dd></div>
                <div className="flex justify-between gap-2 border-b border-zinc-50 dark:border-zinc-800 pb-0.5"><dt className="text-muted-foreground">Beeper</dt><dd className="font-medium capitalize">{data?.ups_beeper_status || "--"}</dd></div>
              </dl>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
