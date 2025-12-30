import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpsStore } from '@/store/upsStore';
import { Settings, Server, Shield } from 'lucide-react';
import { ShutdownType } from "../../types/ups";

export function SettingsModal() {
  const { config, setConfig, setConnected, ratedPower, setRatedPower, fullLoadRuntime, setFullLoadRuntime, shutdownConfig, setShutdownConfig } = useUpsStore();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'connection' | 'shutdown'>('connection');

  // Connection State
  const [host, setHost] = useState(config?.host || "192.168.1.105");
  const [port, setPort] = useState(config?.port?.toString() || "3493");
  const [username, setUsername] = useState(config?.username || "monuser");
  const [password, setPassword] = useState(config?.password || "secret");
  const [ratedPowerInput, setRatedPowerInput] = useState(ratedPower?.toString() || "1800");
  const [fullLoadRuntimeInput, setFullLoadRuntimeInput] = useState(fullLoadRuntime?.toString() || "30");

  // Shutdown State
  const [shutdownEnabled, setShutdownEnabled] = useState(shutdownConfig.enabled);
  const [batteryThreshold, setBatteryThreshold] = useState(shutdownConfig.batteryThreshold.toString());
  const [runtimeThreshold, setRuntimeThreshold] = useState(shutdownConfig.runtimeThreshold.toString());
  const [stopType, setStopType] = useState<ShutdownType>(shutdownConfig.stopType);
  const [delaySeconds, setDelaySeconds] = useState(shutdownConfig.delaySeconds.toString());

  // Test Countdown State
  const [testCountdown, setTestCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (config) {
      setHost(config.host);
      setPort(config.port.toString());
      setUsername(config.username || "");
      setPassword(config.password || "");
    }
  }, [config]);

  useEffect(() => {
    let timer: number | null = null;
    if (testCountdown !== null && testCountdown > 0) {
      timer = window.setInterval(() => {
        setTestCountdown(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (testCountdown === 0) {
      invoke('trigger_system_stop', { actionType: stopType })
        .catch(err => alert(`Error: ${err}`));
      setTestCountdown(null);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [testCountdown, stopType]);

  const handleSave = async () => {
    // 1. Save connection settings (even if not connecting now)
    const newConfig = {
      host,
      port: parseInt(port),
      username,
      password
    };
    setConfig(newConfig);
    setRatedPower(parseInt(ratedPowerInput));
    setFullLoadRuntime(parseInt(fullLoadRuntimeInput));

    // 2. Save shutdown config
    setShutdownConfig({
      enabled: shutdownEnabled,
      batteryThreshold: parseInt(batteryThreshold),
      runtimeThreshold: parseInt(runtimeThreshold),
      stopType,
      delaySeconds: parseInt(delaySeconds),
    });

    setOpen(false);
  };

  const handleConnect = async () => {
    try {
      const newConfig = {
        host,
        port: parseInt(port),
        username,
        password
      };

      await invoke("connect_nut", { config: newConfig });
      setConfig(newConfig);
      setConnected(true);

      // Auto-start polling on manual connect
      await invoke("start_background_polling", {
        upsName: "ups",
        intervalMs: 2000
      });

      setOpen(false);
    } catch (e) {
      alert(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] bg-background border-border p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 border-b border-border bg-muted/20">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Application Settings
          </DialogTitle>
        </DialogHeader>

        {/* Tabs Content */}
        <div className="flex h-[320px]">
          {/* Sidebar Tabs */}
          <div className="w-[140px] border-r border-border bg-muted/10 p-2 flex flex-col gap-1">
            <button
              onClick={() => setActiveTab('connection')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold transition-all ${activeTab === 'connection' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Server className="h-3.5 w-3.5" />
              Connection
            </button>
            <button
              onClick={() => setActiveTab('shutdown')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold transition-all ${activeTab === 'shutdown' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Shield className="h-3.5 w-3.5" />
              Shutdown
            </button>
          </div>

          {/* Main Form */}
          <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
            {activeTab === 'connection' ? (
              <div className="grid gap-5">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="host" className="text-right text-[11px] font-bold text-muted-foreground uppercase">Host</Label>
                  <Input id="host" value={host} onChange={(e) => setHost(e.target.value)} className="col-span-3 h-8 text-[11px] bg-muted/20 border-border/50 focus:bg-background transition-all" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="port" className="text-right text-[11px] font-bold text-muted-foreground uppercase">Port</Label>
                  <Input id="port" value={port} onChange={(e) => setPort(e.target.value)} className="col-span-3 h-8 text-[11px] bg-muted/20 border-border/50 focus:bg-background transition-all" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right text-[11px] font-bold text-muted-foreground uppercase">User</Label>
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="col-span-3 h-8 text-[11px] bg-muted/20 border-border/50 focus:bg-background transition-all" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right text-[11px] font-bold text-muted-foreground uppercase">Pass</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="col-span-3 h-8 text-[11px] bg-muted/20 border-border/50 focus:bg-background transition-all" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="rated" className="text-right text-[11px] font-bold text-muted-foreground uppercase">Power</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input id="rated" value={ratedPowerInput} onChange={(e) => setRatedPowerInput(e.target.value)} className="h-8 text-[11px] bg-muted/20 border-border/50 focus:bg-background transition-all" />
                    <span className="text-[10px] text-muted-foreground font-bold italic">W</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="runtime" className="text-right text-[11px] font-bold text-muted-foreground uppercase">Runtime</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input id="runtime" value={fullLoadRuntimeInput} onChange={(e) => setFullLoadRuntimeInput(e.target.value)} className="h-8 text-[11px] bg-muted/20 border-border/50 focus:bg-background transition-all" />
                    <span className="text-[10px] text-muted-foreground font-bold italic">MIN</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-5">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={shutdownEnabled}
                    onChange={(e) => setShutdownEnabled(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border bg-muted checked:bg-primary"
                  />
                  <Label htmlFor="enabled" className="text-[11px] font-bold uppercase tracking-wider cursor-pointer">Enable Automation</Label>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-[10px] font-bold text-muted-foreground leading-tight uppercase">Battery <br />Level</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input value={batteryThreshold} onChange={(e) => setBatteryThreshold(e.target.value)} className="h-8 text-[11px] bg-muted/20 border-border/50" />
                    <span className="text-[10px] text-muted-foreground font-bold">%</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-[10px] font-bold text-muted-foreground leading-tight uppercase">Runtime <br />Min</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input value={runtimeThreshold} onChange={(e) => setRuntimeThreshold(e.target.value)} className="h-8 text-[11px] bg-muted/20 border-border/50" />
                    <span className="text-[10px] text-muted-foreground font-bold">SEC</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-[10px] font-bold text-muted-foreground leading-tight uppercase">Action</Label>
                  <select
                    value={stopType}
                    onChange={(e) => setStopType(e.target.value as ShutdownType)}
                    className="col-span-3 h-8 bg-muted/20 border border-border/50 rounded-md px-2 text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Shutdown">Shutdown</option>
                    <option value="Hibernate">Hibernate</option>
                    <option value="Sleep">Sleep</option>
                  </select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-[10px] font-bold text-muted-foreground leading-tight uppercase">Delay</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input value={delaySeconds} onChange={(e) => setDelaySeconds(e.target.value)} className="h-8 text-[11px] bg-muted/20 border-border/50" />
                    <span className="text-[10px] text-muted-foreground font-bold">SEC</span>
                  </div>
                </div>

                <div className="pt-2">
                  {testCountdown === null ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full h-8 text-[10px] font-bold uppercase tracking-widest bg-destructive/80 hover:bg-destructive shadow-lg shadow-destructive/20"
                      onClick={() => {
                        if (confirm(`CAUTION: This will initiate a 15-second countdown to ${stopType}. Save all work first. Proceed?`)) {
                          setTestCountdown(15);
                        }
                      }}
                    >
                      Test {stopType} Now
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-[10px] font-bold uppercase tracking-widest border-destructive text-destructive hover:bg-destructive hover:text-white animate-pulse"
                      onClick={() => setTestCountdown(null)}
                    >
                      CANCEL TEST ({testCountdown}s)
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/5 gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="h-8 text-[11px] font-bold border-border/60 hover:bg-muted">Cancel</Button>
          {activeTab === 'connection' && (
            <Button size="sm" onClick={handleConnect} className="h-8 text-[11px] font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90">Test & Connect</Button>
          )}
          <Button size="sm" onClick={handleSave} className="h-8 text-[11px] font-bold shadow-lg shadow-primary/20">Apply Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
