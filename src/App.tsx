// Release Trigger
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
import { toast, Toaster } from 'sonner';
import {
  Info,
  Sliders,
  Settings,
  Database
} from 'lucide-react';

const appWindow = getCurrentWindow();

export default function App() {
  useUpsData();
  useNotifications();
  const { data, history, setConnected, config, shutdownConfig, events, supportedCommands, setSupportedCommands } = useUpsStore();
  const { countdown } = useShutdownMonitor();

  const status = data?.status || "UNKNOWN";


  // Auto-connect and start polling on mount if config exists
  useEffect(() => {
    const autoConnect = async () => {
      if (config && hostIsValid(config.host)) {
        try {
          console.log("Attempting auto-connect to:", config.host);
          await invoke('connect_nut', { config });

          await invoke('start_background_polling', {
            upsName: config.ups_name || 'ups',
            intervalMs: 1000
          });

          try {
            const cmds = await invoke<string[]>("list_ups_commands", { upsName: config.ups_name || "ups" });
            setSupportedCommands(cmds);
          } catch (e) {
            console.warn("Auto-connect command fetch failed:", e);
          }

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
            {status === "UNKNOWN" ? (
              <span className="text-[10px] font-bold text-muted-foreground uppercase">--</span>
            ) : (
              status.split(' ').map(s => {
                const colorMap: Record<string, string> = {
                  'OL': 'bg-green-500/20 text-green-500 border-green-500/30',
                  'OB': 'bg-orange-500/20 text-orange-500 border-orange-500/30',
                  'LB': 'bg-red-500/20 text-red-500 border-red-500/30 animate-pulse',
                  'CHRG': 'bg-blue-500/20 text-blue-500 border-blue-500/30',
                  'BYPASS': 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
                  'OVER': 'bg-red-500 text-white border-red-500 animate-bounce',
                  'TRIM': 'bg-purple-500/20 text-purple-500 border-purple-500/30',
                  'BOOST': 'bg-purple-500/20 text-purple-500 border-purple-500/30',
                };
                return (
                  <span key={s} className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${colorMap[s] || 'bg-muted/50 text-muted-foreground border-border'} uppercase tracking-tighter`}>
                    {s}
                  </span>
                );
              })
            )}
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
              onClick={() => appWindow.hide()}
              className="p-1.5 hover:bg-muted rounded transition-colors group"
              title="Hide to Tray"
            >
              <X className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
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
        <section className="w-[30%] p-4 flex flex-col gap-3 shrink-0 h-full overflow-y-auto bg-muted/10 premium-gradient">
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase border-b border-border/40 pb-2 mb-1">System Information</h3>

          {/* 1. Automation Status */}
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-muted-foreground mb-1 uppercase flex items-center gap-2">
              <Sliders className="h-3 w-3 text-primary/40" />
              Automation
            </h4>

            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-medium text-muted-foreground">Status</span>
              {shutdownConfig.enabled ? (
                <span className="text-[9px] bg-primary/20 text-primary px-1.5 rounded-full font-bold">ACTIVE</span>
              ) : (
                <span className="text-[9px] bg-muted text-muted-foreground px-1.5 rounded-full font-bold">OFF</span>
              )}
            </div>
            <div className="space-y-1 bg-muted/5 p-2 rounded border border-border/10">
              <div className="flex justify-between gap-2 border-b border-border pb-0.5 border-dashed border-border/20">
                <span className="text-[10px] text-muted-foreground">Action</span>
                <span className="text-[10px] font-bold text-primary">{shutdownConfig.stopType}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-0.5 border-dashed border-border/20">
                <span className="text-[10px] text-muted-foreground">Threshold</span>
                <span className="text-[10px] font-bold">{shutdownConfig.batteryThreshold}% / {shutdownConfig.runtimeThreshold}s</span>
              </div>
              {countdown !== null && (
                <div className="flex justify-between gap-2 pt-1 border-b border-destructive/20">
                  <span className="text-[10px] text-destructive font-bold animate-pulse">COUNTDOWN</span>
                  <span className="text-[11px] font-black text-destructive">{countdown}s</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-border/20 my-1" />

          {/* 2. Sensors (Realtime) */}
          {(data?.ambient_temp || data?.output_current || data?.ups_realpower) && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold text-muted-foreground mb-1 uppercase flex items-center gap-2">
                <Activity className="h-3 w-3 text-primary/40" />
                Sensors
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {data?.ambient_temp && (
                  <div className="bg-muted/10 p-2 rounded border border-border/20 flex flex-col items-center">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold text-center w-full border-b border-border/10 mb-1 pb-1">Temp</span>
                    <span className="text-sm font-bold text-foreground">{data.ambient_temp}°C</span>
                  </div>
                )}
                {data?.output_current && (
                  <div className="bg-muted/10 p-2 rounded border border-border/20 flex flex-col items-center">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold text-center w-full border-b border-border/10 mb-1 pb-1">Current</span>
                    <span className="text-sm font-bold text-foreground">{data.output_current}A</span>
                  </div>
                )}
                {data?.ups_realpower && (
                  <div className="bg-muted/10 p-2 rounded border border-border/20 flex flex-col items-center">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold text-center w-full border-b border-border/10 mb-1 pb-1">Real Pwr</span>
                    <span className="text-sm font-bold text-foreground">{data.ups_realpower}W</span>
                  </div>
                )}
              </div>
              <div className="h-px bg-border/20 my-1" />
            </div>
          )}

          {/* 3. Identity */}
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-muted-foreground mb-1 uppercase flex items-center gap-2">
              <Info className="h-3 w-3 text-primary/40" />
              Identity
            </h4>
            <dl className="space-y-1 px-1">
              <div className="flex justify-between gap-2 border-b border-border/10 pb-1 hover:bg-muted/5 px-1 rounded"><dt className="text-[10px] text-muted-foreground">Manufacturer</dt><dd className="text-[10px] font-semibold text-right truncate text-foreground/90">{data?.ups_mfr || "--"}</dd></div>
              <div className="flex justify-between gap-2 border-b border-border/10 pb-1 hover:bg-muted/5 px-1 rounded"><dt className="text-[10px] text-muted-foreground">Model</dt><dd className="text-[10px] font-semibold text-right truncate text-foreground/90">{data?.ups_model || "--"}</dd></div>
              <div className="flex justify-between gap-2 border-b border-border/10 pb-1 hover:bg-muted/5 px-1 rounded"><dt className="text-[10px] text-muted-foreground">Serial</dt><dd className="text-[10px] font-semibold text-right truncate text-foreground/90">{data?.ups_serial || "--"}</dd></div>
              <div className="flex justify-between gap-2 border-b border-border/10 pb-1 hover:bg-muted/5 px-1 rounded"><dt className="text-[10px] text-muted-foreground">Firmware</dt><dd className="text-[10px] font-semibold text-right truncate text-foreground/90">{data?.ups_firmware || "--"}</dd></div>
            </dl>
          </div>

          <div className="h-px bg-border/20 my-1" />

          {/* 4. Service */}
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-muted-foreground mb-1 uppercase flex items-center gap-2">
              <Settings className="h-3 w-3 text-primary/40" />
              Service
            </h4>
            <dl className="space-y-1 px-1">
              <div className="flex justify-between gap-2 border-b border-border/10 pb-1 px-1"><dt className="text-[10px] text-muted-foreground">Driver</dt><dd className="text-[10px] font-medium">{data?.driver_name || "--"}</dd></div>
              <div className="flex justify-between gap-2 border-b border-border/10 pb-1 px-1"><dt className="text-[10px] text-muted-foreground">Version</dt><dd className="text-[10px] font-medium">{data?.driver_version || "--"}</dd></div>
              <div className="flex justify-between gap-2 border-b border-border/10 pb-1 px-1"><dt className="text-[10px] text-muted-foreground">Beeper</dt><dd className="text-[10px] font-medium capitalize">{data?.ups_beeper_status || "--"}</dd></div>
            </dl>
          </div>

          <div className="h-px bg-border/20 my-1" />

          {/* 5. Extended Info (Detailed) */}
          {data?.extended_vars && Object.keys(data.extended_vars).length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold text-muted-foreground mb-1 uppercase flex items-center gap-2">
                <Database className="h-3 w-3 text-primary/40" />
                Extended Info
              </h4>
              <div className="space-y-3 px-1">
                {/* Group variables by prefix for cleaner display */}
                {(() => {
                  const groups: Record<string, [string, string][]> = {};
                  Object.entries(data.extended_vars).sort().forEach(([key, value]) => {
                    const prefix = key.includes('.') ? key.split('.')[0] : 'other';
                    if (!groups[prefix]) groups[prefix] = [];
                    groups[prefix].push([key, value]);
                  });

                  return Object.entries(groups).map(([prefix, vars]) => (
                    <div key={prefix} className="space-y-1">
                      <h5 className="text-[9px] font-black text-primary/60 uppercase tracking-widest border-b border-white/5 pb-0.5 mb-1">{prefix}</h5>
                      {vars.map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between gap-2 group hover:bg-white/5 rounded px-1 -mx-1 transition-colors">
                          <dt className="text-[9px] text-muted-foreground font-mono truncate opacity-70 group-hover:opacity-100 transition-opacity" title={key}>
                            {key.split('.').slice(1).join('.')}
                          </dt>
                          <dd className="text-[10px] font-bold text-foreground text-right truncate" title={value}>{value}</dd>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
              <div className="h-px bg-border/20 my-1" />
            </div>
          )}

          {/* 6. Remote Control (Dangerous - Bottom) */}
          {supportedCommands.length > 0 && (
            <div className="space-y-1 pb-4">
              <h4 className="text-[10px] font-bold text-muted-foreground mb-1 uppercase flex items-center gap-2">
                <Cpu className="h-3 w-3 text-primary/40" />
                Remote Control
              </h4>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {supportedCommands.filter(c => c.includes('beeper') || c.includes('test') || c.includes('shutdown') || c.includes('load')).map(cmd => {
                  const getFriendlyName = (c: string) => {
                    const mappings: Record<string, string> = {
                      'beeper.toggle': 'Toggle Alarm',
                      'beeper.mute': 'Mute Beeper',
                      'beeper.off': 'Disable Beeper',
                      'beeper.on': 'Enable Beeper',
                      'test.battery.start': 'Start Deep Test',
                      'test.battery.start.quick': 'Quick Battery Test',
                      'test.battery.stop': 'Stop Test',
                      'shutdown.return': 'UPS: Reboot Load',
                      'shutdown.stayoff': 'UPS: Cut Power',
                      'shutdown.stop': 'Cancel Shutdown',
                      'load.off': 'UPS: Emergency Stop',
                      'load.on': 'UPS: Restore Power',
                    };
                    return mappings[c] || c.split('.').pop()?.toUpperCase() || c;
                  };

                  const getDescription = (c: string) => {
                    const desc: Record<string, string> = {
                      'beeper.toggle': 'Toggle the UPS internal alarm/beeper',
                      'beeper.mute': 'Mute the beeper for the current power event',
                      'beeper.off': 'Permanently disable the UPS beeper',
                      'beeper.on': 'Re-enable the UPS beeper',
                      'test.battery.start': 'Start a deep battery discharge test',
                      'test.battery.start.quick': 'Perform a quick battery health check',
                      'test.battery.stop': 'Stop the currently running battery test',
                      'shutdown.return': 'Turn off load immediately and restart when power returns',
                      'shutdown.stayoff': 'Turn off load and stay off until manual restart',
                      'shutdown.stop': 'Cancel a pending system shutdown',
                      'load.off': 'IMMEDIATELY cut power to all connected devices',
                      'load.on': 'Restore power to the UPS output outlets',
                    };
                    return desc[c] || `Execute system command: ${c}`;
                  };

                  const isDangerous = cmd.startsWith('shutdown') || cmd.includes('load.off');

                  return (
                    <button
                      key={cmd}
                      title={getDescription(cmd)}
                      onClick={async () => {
                        if (isDangerous) {
                          const confirmed = confirm(`CAUTION: Sending "${cmd}" may cut power to your devices. Are you sure you want to proceed?`);
                          if (!confirmed) return;
                        }
                        try {
                          await invoke("run_ups_command", {
                            upsName: config?.ups_name || "ups",
                            command: cmd
                          });
                          toast.success(`Command sent: ${getFriendlyName(cmd)}`);
                        } catch (e) {
                          toast.error(`Failed to run command: ${e}`);
                        }
                      }}
                      className={`px-2 py-1.5 rounded-md border text-[9px] font-bold transition-all text-center uppercase tracking-tighter ${isDangerous
                        ? 'bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 shadow-sm'
                        : 'bg-zinc-900/5 dark:bg-white/5 border-border hover:bg-primary/10 hover:border-primary/40 text-foreground/70 hover:text-primary shadow-sm'
                        }`}
                    >
                      {getFriendlyName(cmd)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
      <Toaster richColors position="top-right" theme="dark" />
    </div>
  );
}
