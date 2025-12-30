import { useEffect } from 'react';
import { useUpsStore } from './store/upsStore';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  Zap,
  Activity,
  Server,
  AlertTriangle,
  X,
  Minus,
  Plug,
  Waves,
  Cpu,
  History as HistoryIcon
} from 'lucide-react';
import { StatusCard } from './components/dashboard/StatusCard';
import { LoadChart } from './components/dashboard/LoadChart';
import { BatteryGauge } from './components/dashboard/BatteryGauge';
import { PowerStatus } from './components/dashboard/PowerStatus';
import { SettingsModal } from './components/settings/SettingsModal';
import { useShutdownMonitor } from './hooks/useShutdownMonitor';
import { useUpsData } from './hooks/useUpsData';
import { useNotifications } from './hooks/useNotifications';

const appWindow = getCurrentWindow();

export default function App() {
  useUpsData();
  useNotifications();
  const { data, history, setConnected, config, shutdownConfig, events } = useUpsStore();
  const { countdown } = useShutdownMonitor();

  const status = data?.status || "UNKNOWN";
  const isOnBattery = status.includes("OB");
  const isOnline = status.includes("OL");

  // Auto-connect and start polling on mount if config exists
  useEffect(() => {
    const autoConnect = async () => {
      if (config && hostIsValid(config.host)) {
        try {
          console.log("Attempting auto-connect to:", config.host);
          await invoke('connect_nut', { config });
          await invoke('start_background_polling', {
            upsName: 'ups',
            intervalMs: 1000
          });
          setConnected(true);
        } catch (err) {
          console.error("Auto-connect failed:", err);
        }
      }
    };

    autoConnect();
  }, [config]);

  const hostIsValid = (h: string) => h && h.trim().length > 0;

  const handleDrag = (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('button, input, .no-drag')) {
      appWindow.startDragging();
    }
  };

  return (
    <div className="h-screen bg-background font-sans text-foreground select-none overflow-hidden flex flex-col border border-border rounded-[2px]">
      {/* Header - Ultra Flush */}
      <header
        onMouseDown={handleDrag}
        className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0 cursor-default select-none group/header"
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <Zap className="h-3.5 w-3.5 text-yellow-500" />
          <h1 className="text-xs font-bold tracking-tight">WinNUT Rust Client</h1>
          <div className="flex items-center gap-1.5 ml-2">
            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-green-500' : isOnBattery ? 'bg-orange-500' : 'bg-red-500'}`}></span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground mr-2 font-medium pointer-events-none">{data?.ups_model || "--"}</span>
          <div className="no-drag">
            <SettingsModal />
          </div>

          {/* Window Controls */}
          <div className="flex items-center ml-2 border-l border-border pl-2 gap-1 no-drag">
            <button
              onClick={() => appWindow.minimize()}
              className="p-1.5 hover:bg-muted rounded transition-colors"
              title="Minimize"
            >
              <Minus className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              onClick={() => appWindow.close()}
              className="p-1.5 hover:bg-destructive hover:text-white rounded transition-colors group"
              title="Close"
            >
              <X className="h-3 w-3 text-muted-foreground group-hover:text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Tight 3 Columns */}
      <main className="flex-1 flex min-h-0 divide-x divide-border/50">

        {/* LEFT: Battery (20%) */}
        <section className="w-[20%] p-4 flex flex-col gap-6 shrink-0 h-full overflow-y-auto scrollbar-hide border-r border-border/10">
          <BatteryGauge
            percentage={data?.battery_charge || 0}
            status={status}
            voltage={data?.battery_voltage}
            runtime={data?.battery_runtime}
          />
          <div className="flex flex-col gap-6">
            <PowerStatus status={status} />

            <div className="pt-4 border-t border-border/20">
              <h3 className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-3 flex items-center justify-between">
                Event Log
                <HistoryIcon className="h-3 w-3 opacity-40" />
              </h3>
              <div className="space-y-2 max-h-[180px] overflow-y-auto scrollbar-hide">
                {events && events.length > 0 ? (
                  events.map((evt: any) => (
                    <div key={evt.id} className="flex flex-col gap-0.5 group">
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-tighter">
                        <span className={evt.type === 'warning' ? 'text-orange-500' : 'text-primary/40'}>{evt.type}</span>
                        <span className="text-muted-foreground opacity-40">{evt.time}</span>
                      </div>
                      <p className="text-[10px] leading-tight text-foreground/70 group-hover:text-foreground transition-colors">{evt.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] italic text-muted-foreground/40 text-center py-4">No events recorded</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CENTER: Real-time Stats & Chart (50%) */}
        <section className="flex-1 p-4 flex flex-col gap-6 h-full min-w-0">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 shrink-0">
            <StatusCard
              title="Input Volt"
              value={data?.input_voltage}
              unit="V"
              icon={Plug}
            />
            <StatusCard
              title="Output Volt"
              value={data?.output_voltage}
              unit="V"
              icon={Waves}
            />
            <StatusCard title="Load" value={data?.ups_load} unit="%" icon={Cpu} />

            <StatusCard
              title="Input Freq"
              value={data?.input_frequency}
              unit="Hz"
              icon={Activity}
            />
            <StatusCard
              title="Output Freq"
              value={data?.output_frequency}
              unit="Hz"
              icon={Activity}
            />
            <StatusCard title="Power" value={data?.power_watts ? Math.round(data.power_watts) : "--"} unit="W" icon={Server} />
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-muted/5 rounded-lg p-2 border border-border/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-primary/60" />
                <h3 className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">Usage Trend</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                <span className="text-[9px] font-bold text-green-500/80 tracking-widest">LIVE</span>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
              <LoadChart data={history} />
            </div>
          </div>
        </section>

        {/* RIGHT: Detailed Info (30%) */}
        <section className="w-[30%] p-4 flex flex-col gap-4 shrink-0 h-full overflow-y-auto bg-muted/10 premium-gradient scrollbar-hide">
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase border-b border-border/40 pb-2 mb-2">System Information</h3>

          <div className="space-y-6">
            <div>
              <h4 className="text-[10px] font-bold text-primary/40 mb-3 uppercase tracking-wider">Identity</h4>
              <dl className="space-y-2 text-[11px]">
                <div className="flex justify-between gap-4 border-b border-border/20 pb-1.5 hover:border-border/60 transition-colors group"><dt className="text-muted-foreground group-hover:text-foreground/80 transition-colors">Manufacturer</dt><dd className="font-semibold text-right truncate text-foreground/90">{data?.ups_mfr || "--"}</dd></div>
                <div className="flex justify-between gap-4 border-b border-border/20 pb-1.5 hover:border-border/60 transition-colors group"><dt className="text-muted-foreground group-hover:text-foreground/80 transition-colors">Model</dt><dd className="font-semibold text-right truncate text-foreground/90">{data?.ups_model || "--"}</dd></div>
                <div className="flex justify-between gap-4 border-b border-border/20 pb-1.5 hover:border-border/60 transition-colors group"><dt className="text-muted-foreground group-hover:text-foreground/80 transition-colors">Serial</dt><dd className="font-semibold text-right truncate text-foreground/90">{data?.ups_serial || "--"}</dd></div>
                <div className="flex justify-between gap-4 border-b border-border/20 pb-1.5 hover:border-border/60 transition-colors group"><dt className="text-muted-foreground group-hover:text-foreground/80 transition-colors">Firmware</dt><dd className="font-semibold text-right truncate text-foreground/90">{data?.ups_firmware || "--"}</dd></div>
              </dl>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-muted-foreground mb-1.5 uppercase">Capability</h4>
              <dl className="space-y-1 text-[11px]">
                <div className="flex justify-between gap-2 border-b border-border pb-0.5"><dt className="text-muted-foreground">Type</dt><dd className="font-medium">{data?.ups_type || "--"}</dd></div>
                <div className="flex justify-between gap-2 border-b border-border pb-0.5"><dt className="text-muted-foreground">Nom. Power</dt><dd className="font-medium">{data?.ups_realpower_nominal ? `${data.ups_realpower_nominal}W` : "--"}</dd></div>
                <div className="flex justify-between gap-2 border-b border-border pb-0.5"><dt className="text-muted-foreground">Nom. Volt</dt><dd className="font-medium">{data?.output_voltage_nominal || "--"}V</dd></div>
                <div className="flex justify-between gap-2 border-b border-border pb-0.5"><dt className="text-muted-foreground">Nom. Freq</dt><dd className="font-medium">{data?.output_frequency_nominal || "--"}Hz</dd></div>
              </dl>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-muted-foreground mb-1.5 uppercase">Service</h4>
              <dl className="space-y-1 text-[11px]">
                <div className="flex justify-between gap-2 border-b border-border pb-0.5"><dt className="text-muted-foreground">Driver</dt><dd className="font-medium">{data?.driver_name || "--"}</dd></div>
                <div className="flex justify-between gap-2 border-b border-border pb-0.5"><dt className="text-muted-foreground">Version</dt><dd className="font-medium">{data?.driver_version || "--"}</dd></div>
                <div className="flex justify-between gap-2 border-b border-border pb-0.5"><dt className="text-muted-foreground">Beeper</dt><dd className="font-medium capitalize">{data?.ups_beeper_status || "--"}</dd></div>
              </dl>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-muted-foreground mb-1.5 uppercase flex items-center justify-between">
                Automation
                {shutdownConfig.enabled ? (
                  <span className="text-[9px] bg-primary/20 text-primary px-1.5 rounded-full">ACTIVE</span>
                ) : (
                  <span className="text-[9px] bg-muted text-muted-foreground px-1.5 rounded-full">OFF</span>
                )}
              </h4>
              <dl className="space-y-1 text-[11px]">
                <div className="flex justify-between gap-2 border-b border-border pb-0.5">
                  <dt className="text-muted-foreground">Action</dt>
                  <dd className="font-medium text-primary">{shutdownConfig.stopType}</dd>
                </div>
                <div className="flex justify-between gap-2 border-b border-border pb-0.5">
                  <dt className="text-muted-foreground">Threshold</dt>
                  <dd className="font-medium">{shutdownConfig.batteryThreshold}% / {shutdownConfig.runtimeThreshold}s</dd>
                </div>
                {countdown !== null && (
                  <div className="flex justify-between gap-2 pt-1 border-b border-destructive/20">
                    <dt className="text-destructive font-bold animate-pulse">COUNTDOWN</dt>
                    <dd className="font-black text-destructive text-sm">{countdown}s</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </section>
      </main>

      {/* Shutdown Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-destructive text-destructive-foreground p-8 rounded-xl shadow-2xl flex flex-col items-center gap-6 max-w-sm border-4 border-white/20 animate-in zoom-in duration-300">
            <div className="p-4 bg-white/10 rounded-full animate-bounce">
              <AlertTriangle className="h-12 w-12 text-white" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter">System {shutdownConfig.stopType} Imminent</h2>
              <p className="text-sm font-medium opacity-90">UPS battery is critical. Closing applications...</p>
            </div>
            <div className="text-7xl font-black font-mono tracking-tighter bg-white/10 px-8 py-4 rounded-lg">
              {countdown}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-60">Restore power to cancel</p>
          </div>
        </div>
      )}
    </div>
  );
}
