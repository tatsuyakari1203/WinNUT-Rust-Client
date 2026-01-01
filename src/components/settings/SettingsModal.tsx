import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpsStore } from '@/store/upsStore';
import { Settings, Server, Shield, LayoutGrid, HardDrive } from 'lucide-react';
import { ShutdownType } from "../../types/ups";
import { toast } from 'sonner';
import { useUpdater } from '../../hooks/useUpdater';
import { Download, RefreshCw, RotateCw } from 'lucide-react';
import { MdPalette } from "react-icons/md";
import { FaMoon, FaSun, FaDesktop, FaCat, FaSnowflake, FaGhost, FaCode, FaGithub } from "react-icons/fa";
import { getVersion } from '@tauri-apps/api/app';
import { enable, isEnabled, disable } from '@tauri-apps/plugin-autostart';

export function SettingsModal() {
  const { config, setConfig, setConnected, ratedPower, setRatedPower, fullLoadRuntime, setFullLoadRuntime, shutdownConfig, setShutdownConfig, setSupportedCommands, theme, setTheme } = useUpsStore();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'connection' | 'shutdown' | 'update' | 'appearance' | 'data'>('general');
  const [appVersion, setAppVersion] = useState("...");

  // Updater
  const { status: updateStatus, error: updateError, progress: updateProgress, newVersion, checkUpdate, installUpdate, restartApp } = useUpdater();

  // Autostart State
  const [autostartProxy, setAutostartProxy] = useState(false);

  useEffect(() => {
    getVersion().then(setAppVersion);
    isEnabled().then(setAutostartProxy).catch(console.error);
  }, []);

  // Sync autostart status when modal opens
  useEffect(() => {
    if (open) {
      isEnabled().then(setAutostartProxy).catch(console.error);
    }
  }, [open]);

  const toggleAutostart = async (checked: boolean) => {
    // Optimistic update
    setAutostartProxy(checked);

    try {
      if (checked) {
        await enable();
        toast.success("Start with Windows enabled");
      } else {
        await disable();
        toast.info("Start with Windows disabled");
      }
    } catch (e) {
      console.error("Autostart toggle failed:", e);
      toast.error(`Autostart Error: ${e instanceof Error ? e.message : String(e)}`);
      // Revert UI if failed
      setAutostartProxy(!checked);
    }
  };

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

    // For non-Shutdown types (Hibernate/Sleep) or if we want manual countdown
    if (stopType !== 'Shutdown' && testCountdown !== null && testCountdown > 0) {
      timer = window.setInterval(() => {
        setTestCountdown(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (testCountdown === 0 && stopType !== 'Shutdown') {
      // Hibernate/Sleep trigger at 0
      invoke('trigger_system_stop', { actionType: stopType, delaySec: 0 })
        .catch(err => toast.error(`Error: ${err}`));
      setTestCountdown(null);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [testCountdown, stopType]);

  // Handle Shutdown Test Start (Native Timer)
  useEffect(() => {
    if (testCountdown === 15 && stopType === 'Shutdown') {
      // Trigger native Windows shutdown with 15s delay immediately
      invoke('trigger_system_stop', { actionType: 'Shutdown', delaySec: 15 })
        .then(() => toast.success("System Shutdown scheduled in 15s"))
        .catch(err => toast.error(`Error: ${err}`));

      // Optimization: We don't need to block UI, but we can set countdown to null effectively
      // or keep it to show a "Cancel" button?
      // Let's keep a visual countdown for the cancel button utility, but not trigger again at 0.
      const timer = window.setInterval(() => {
        setTestCountdown(prev => {
          if (prev === null || prev <= 0) return null;
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
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

    toast.success("Settings saved successfully");
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

      try {
        const cmds = await invoke<string[]>("list_ups_commands", { upsName: newConfig.ups_name });
        setSupportedCommands(cmds);
      } catch (e) {
        console.warn("Fetch commands failed:", e);
      }

      await invoke("start_background_polling", {
        upsName: newConfig.ups_name,
        intervalMs: 1000,
        shutdownConfig: {
          enabled: shutdownEnabled,
          batteryThreshold: parseInt(batteryThreshold) || 30,
          runtimeThreshold: parseInt(runtimeThreshold) || 120,
          stopType,
          delaySeconds: parseInt(delaySeconds) || 15,
        }
      });

      toast.success(`Connected to ${newConfig.ups_name} successfully`);
      setOpen(false);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleScanNetwork = async () => {
    setIsScanning(true);
    setDiscoveredIps([]);
    try {
      const prefix = host.split('.').slice(0, 3).join('.') || "192.168.1";
      const ips = await invoke<string[]>("scan_nut_network", { subnetPrefix: prefix });
      setDiscoveredIps(ips);
      if (ips.length === 0) {
        toast.info("No NUT servers found in " + prefix + ".0/24");
      } else {
        toast.success(`Found ${ips.length} NUT server(s)`);
      }
    } catch (e) {
      toast.error("Scan failed: " + e);
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
      if (names.length > 0) {
        setUpsName(names[0]);
        toast.success(`Listed ${names.length} UPS device(s)`);
      } else {
        toast.info("No UPS devices found on this server");
      }
    } catch (e) {
      toast.error("Failed to fetch UPS names: " + e);
    } finally {
      setIsFetchingUps(false);
    }
  };

  const handleCleanup = async () => {
    try {
      const deleted = await invoke<number>('clean_history_data');
      toast.success(`Cleanup complete. Removed ${deleted} redundant entries.`);
    } catch (e) {
      toast.error(`Cleanup failed: ${e}`);
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
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold transition-all ${activeTab === 'general' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              General
            </button>
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
            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold transition-all ${activeTab === 'appearance' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <MdPalette className="h-3.5 w-3.5" />
              Appearance
            </button>
            <button
              onClick={() => setActiveTab('update')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold transition-all ${activeTab === 'update' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Update
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold transition-all ${activeTab === 'data' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <HardDrive className="h-3.5 w-3.5" />
              Data
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
            {activeTab === 'general' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold uppercase tracking-wider">Start with Windows</Label>
                    <p className="text-[10px] text-muted-foreground">Automatically launch the application when you log in.</p>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center">
                      {/* Reliable Div-based Toggle */}
                      <div
                        onClick={() => toggleAutostart(!autostartProxy)}
                        className={`w-9 h-5 rounded-full cursor-pointer transition-colors relative ${autostartProxy ? 'bg-primary' : 'bg-muted dark:bg-zinc-700'}`}
                      >
                        <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-4 w-4 transition-transform duration-200 ${autostartProxy ? 'translate-x-full border-white' : ''}`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'appearance' ? (
              <div className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Theme</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setTheme('system')}
                        className={`flex items-center gap-2 p-3 rounded-md border text-xs font-bold transition-all ${theme === 'system' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}
                      >
                        <FaDesktop className="h-4 w-4" />
                        System
                      </button>
                      <button
                        onClick={() => setTheme('light')}
                        className={`flex items-center gap-2 p-3 rounded-md border text-xs font-bold transition-all ${theme === 'light' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}
                      >
                        <FaSun className="h-4 w-4" />
                        Light
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`flex items-center gap-2 p-3 rounded-md border text-xs font-bold transition-all ${theme === 'dark' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}
                      >
                        <FaMoon className="h-4 w-4" />
                        Dark
                      </button>
                      <button
                        onClick={() => setTheme('catppuccin')}
                        className={`flex items-center gap-2 p-3 rounded-md border text-xs font-bold transition-all ${theme === 'catppuccin' ? 'border-purple-500 bg-purple-500/10 text-purple-500' : 'border-border hover:bg-muted'} group`}
                      >
                        <FaCat className="h-4 w-4 text-purple-500 group-hover:animate-bounce" />
                        Catppuccin
                      </button>
                      <button
                        onClick={() => setTheme('dracula')}
                        className={`flex items-center gap-2 p-3 rounded-md border text-xs font-bold transition-all ${theme === 'dracula' ? 'border-pink-500 bg-pink-500/10 text-pink-500' : 'border-border hover:bg-muted'} group`}
                      >
                        <FaGhost className="h-4 w-4 text-pink-500 group-hover:animate-pulse" />
                        Dracula
                      </button>
                      <button
                        onClick={() => setTheme('nord')}
                        className={`flex items-center gap-2 p-3 rounded-md border text-xs font-bold transition-all ${theme === 'nord' ? 'border-sky-400 bg-sky-400/10 text-sky-400' : 'border-border hover:bg-muted'} group`}
                      >
                        <FaSnowflake className="h-4 w-4 text-sky-400 group-hover:animate-spin" />
                        Nord
                      </button>
                      <button
                        onClick={() => setTheme('monokai')}
                        className={`flex items-center gap-2 p-3 rounded-md border text-xs font-bold transition-all ${theme === 'monokai' ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' : 'border-border hover:bg-muted'} group`}
                      >
                        <FaCode className="h-4 w-4 text-yellow-500 group-hover:rotate-12 transition-transform" />
                        Monokai
                      </button>
                      <button
                        onClick={() => setTheme('github-dark')}
                        className={`flex items-center gap-2 p-3 rounded-md border text-xs font-bold transition-all ${theme === 'github-dark' ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-border hover:bg-muted'} group`}
                      >
                        <FaGithub className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        GitHub Dark
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'update' ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center py-6 border border-dashed border-border/50 rounded-lg bg-muted/5">
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <RotateCw className={`h-6 w-6 text-primary ${updateStatus === 'checking' || updateStatus === 'downloading' ? 'animate-spin' : ''}`} />
                  </div>
                  <h3 className="text-sm font-bold">WinNUT Client v{appVersion}</h3>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">
                    {updateStatus === 'idle' && "Check for updates"}
                    {updateStatus === 'checking' && "Checking..."}
                    {updateStatus === 'uptodate' && "You are up to date"}
                    {updateStatus === 'available' && `New version ${newVersion} available`}
                    {updateStatus === 'downloading' && `Downloading... ${updateProgress}%`}
                    {updateStatus === 'ready' && "Ready to restart"}
                    {updateStatus === 'error' && "Update failed"}
                  </p>
                </div>

                {updateError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-[11px] text-destructive font-bold">
                    Error: {updateError}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {updateStatus === 'idle' || updateStatus === 'uptodate' || updateStatus === 'error' ? (
                    <Button onClick={checkUpdate} className="w-full text-xs font-bold uppercase tracking-widest h-9">
                      Check for Updates
                    </Button>
                  ) : null}

                  {updateStatus === 'available' && (
                    <Button onClick={installUpdate} className="w-full text-xs font-bold uppercase tracking-widest h-9 shadow-lg shadow-primary/20">
                      <Download className="mr-2 h-3.5 w-3.5" />
                      Download & Install v{newVersion}
                    </Button>
                  )}

                  {updateStatus === 'ready' && (
                    <Button onClick={restartApp} className="w-full text-xs font-bold uppercase tracking-widest h-9 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20">
                      Restart Now
                    </Button>
                  )}
                </div>
              </div>
            ) : activeTab === 'connection' ? (
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
            ) : activeTab === 'data' ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-muted/10 border border-border rounded-lg space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <HardDrive className="h-4 w-4 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase">Database Optimization</h4>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Clean up redundant historical data to reduce database size. This will:
                          <ul className="list-disc list-inside mt-1 ml-1 opacity-80 text-[10px]">
                            <li>Keep detailed data for the last 30 days.</li>
                            <li>Delete "Normal" (Online) records older than 30 days.</li>
                            <li><b>Always preserve</b> outages, errors, and significant events.</li>
                          </ul>
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={handleCleanup}
                      variant="outline"
                      className="w-full h-8 text-[11px] font-bold uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive border-dashed border-muted-foreground/30"
                    >
                      Process Cleanup Now
                    </Button>
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
                        toast(`Initiate ${stopType} Test?`, {
                          description: "This will start a 15-second countdown. Save your work!",
                          action: {
                            label: "Proceed",
                            onClick: () => setTestCountdown(15),
                          },
                          cancel: {
                            label: "Cancel",
                            onClick: () => console.log("Cancelled"),
                          },
                          duration: 8000,
                        });
                      }}
                    >
                      Test {stopType} Now
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-[10px] font-bold uppercase tracking-widest border-destructive text-destructive hover:bg-destructive hover:text-white animate-pulse"
                      onClick={() => {
                        setTestCountdown(null);
                        invoke('abort_system_stop').catch(console.error);
                      }}
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
