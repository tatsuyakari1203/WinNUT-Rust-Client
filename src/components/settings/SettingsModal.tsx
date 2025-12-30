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
  const [host, setHost] = useState(config?.host || "");
  const [port, setPort] = useState(config?.port?.toString() || "3493");
  const [username, setUsername] = useState(config?.username || "");
  const [password, setPassword] = useState(config?.password || "");
  const [upsName, setUpsName] = useState(config?.ups_name || "ups");
  const [ratedPowerInput, setRatedPowerInput] = useState(ratedPower?.toString() || "");
  const [fullLoadRuntimeInput, setFullLoadRuntimeInput] = useState(fullLoadRuntime?.toString() || "");

  // Discovery State
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredIps, setDiscoveredIps] = useState<string[]>([]);
  const [upsNames, setUpsNames] = useState<string[]>([]);
  const [isFetchingUps, setIsFetchingUps] = useState(false);

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
      setUpsName(config.ups_name || "ups");
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
    const newConfig = {
      host,
      port: parseInt(port) || 3493,
      username,
      password,
      ups_name: upsName
    };
    setConfig(newConfig);
    setRatedPower(parseInt(ratedPowerInput) || 0);
    setFullLoadRuntime(parseInt(fullLoadRuntimeInput) || 0);

    setShutdownConfig({
      enabled: shutdownEnabled,
      batteryThreshold: parseInt(batteryThreshold) || 30,
      runtimeThreshold: parseInt(runtimeThreshold) || 120,
      stopType,
      delaySeconds: parseInt(delaySeconds) || 15,
    });

    setOpen(false);
  };

  const handleConnect = async () => {
    try {
      const newConfig = {
        host,
        port: parseInt(port) || 3493,
        username,
        password,
        ups_name: upsName
      };

      await invoke("connect_nut", { config: newConfig });
      setConfig(newConfig);
      setConnected(true);

      await invoke("start_background_polling", {
        upsName: newConfig.ups_name,
        intervalMs: 1000
      });

      setOpen(false);
    } catch (e) {
      alert(e);
    }
  };

  const handleScanNetwork = async () => {
    setIsScanning(true);
    setDiscoveredIps([]);
    try {
      const prefix = host.split('.').slice(0, 3).join('.') || "192.168.1";
      const ips = await invoke<string[]>("scan_nut_network", { subnetPrefix: prefix });
      setDiscoveredIps(ips);
      if (ips.length === 0) alert("No NUT servers found in " + prefix + ".0/24");
    } catch (e) {
      alert("Scan failed: " + e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFetchUps = async (selectedHost: string) => {
    setHost(selectedHost);
    setIsFetchingUps(true);
    try {
      const names = await invoke<string[]>("list_ups_on_server", {
        host: selectedHost,
        port: parseInt(port) || 3493
      });
      setUpsNames(names);
      if (names.length > 0) setUpsName(names[0]);
    } catch (e) {
      alert("Failed to fetch UPS names: " + e);
    } finally {
      setIsFetchingUps(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] bg-background border-border p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 border-b border-border bg-muted/20">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Application Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[400px]">
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

          <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
            {activeTab === 'connection' ? (
              <div className="grid gap-5">
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="host" className="text-right text-[11px] font-bold text-muted-foreground uppercase pt-2">Host</Label>
                  <div className="col-span-3 space-y-2">
                    <div className="flex gap-2">
                      <Input id="host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="e.g. 192.168.1.10" className="h-8 text-[11px] bg-muted/20 border-border/50 focus:bg-background transition-all" />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleScanNetwork}
                        disabled={isScanning}
                        className="h-8 text-[10px] font-bold px-3 shrink-0"
                      >
                        {isScanning ? "..." : "Scan"}
                      </Button>
                    </div>
                    {discoveredIps.length > 0 && (
                      <div className="flex flex-wrap gap-1 p-1 bg-muted/10 rounded-md border border-border/20">
                        {discoveredIps.map(ip => (
                          <button
                            key={ip}
                            onClick={() => handleFetchUps(ip)}
                            className="px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-[9px] font-bold text-primary transition-colors"
                          >
                            {ip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="upsname" className="text-right text-[11px] font-bold text-muted-foreground uppercase">UPS Name</Label>
                  <div className="col-span-3 flex gap-2">
                    {upsNames.length > 0 ? (
                      <select
                        id="upsname"
                        value={upsName}
                        onChange={(e) => setUpsName(e.target.value)}
                        className="flex-1 h-8 bg-muted/20 border border-border/50 rounded-md px-2 text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {upsNames.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    ) : (
                      <Input
                        id="upsname"
                        value={upsName}
                        onChange={(e) => setUpsName(e.target.value)}
                        placeholder="e.g. ups"
                        className="flex-1 h-8 text-[11px] bg-muted/20 border-border/50 focus:bg-background transition-all"
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFetchUps(host)}
                      disabled={isFetchingUps || !host}
                      className="h-8 px-2 text-primary hover:bg-primary/10"
                    >
                      {isFetchingUps ? "..." : <Server className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="port" className="text-right text-[11px] font-bold text-muted-foreground uppercase">Port</Label>
                  <Input id="port" value={port} onChange={(e) => setPort(e.target.value)} placeholder="3493" className="col-span-3 h-8 text-[11px] bg-muted/20 border-border/50 focus:bg-background transition-all" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right text-[11px] font-bold text-muted-foreground uppercase">User</Label>
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="monuser" className="col-span-3 h-8 text-[11px] bg-muted/20 border-border/50 focus:bg-background transition-all" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right text-[11px] font-bold text-muted-foreground uppercase">Pass</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="col-span-3 h-8 text-[11px] bg-muted/20 border-border/50 focus:bg-background transition-all" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="rated" className="text-right text-[11px] font-bold text-muted-foreground uppercase">Power</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input id="rated" value={ratedPowerInput} onChange={(e) => setRatedPowerInput(e.target.value)} placeholder="e.g. 1500" className="h-8 text-[11px] bg-muted/20 border-border/50 focus:bg-background transition-all" />
                    <span className="text-[10px] text-muted-foreground font-bold italic">W</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="runtime" className="text-right text-[11px] font-bold text-muted-foreground uppercase">Runtime</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input id="runtime" value={fullLoadRuntimeInput} onChange={(e) => setFullLoadRuntimeInput(e.target.value)} placeholder="e.g. 10" className="h-8 text-[11px] bg-muted/20 border-border/50 focus:bg-background transition-all" />
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
