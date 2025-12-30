import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpsStore } from '@/store/upsStore';
import { Settings } from 'lucide-react';

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState("192.168.1.105");
  const [port, setPort] = useState(3493);
  const [username, setUsername] = useState("monuser");
  const [password, setPassword] = useState("secret");
  const [ratedPowerInput, setRatedPowerInput] = useState("");
  const [fullLoadRuntimeInput, setFullLoadRuntimeInput] = useState("");
  const [loading, setLoading] = useState(false);

  const { setRatedPower, ratedPower, fullLoadRuntime, setFullLoadRuntime } = useUpsStore();

  // Load initial value from store when modal opens or value changes
  useEffect(() => {
    if (ratedPower) {
      setRatedPowerInput(ratedPower.toString());
    }
    if (fullLoadRuntime) {
      setFullLoadRuntimeInput(fullLoadRuntime.toString());
    }
  }, [ratedPower, fullLoadRuntime]);

  const handleConnect = async () => {
    setLoading(true);

    // Save settings to store
    setRatedPower(ratedPowerInput ? Number(ratedPowerInput) : null);
    setFullLoadRuntime(fullLoadRuntimeInput ? Number(fullLoadRuntimeInput) : null);

    try {
      await invoke('connect_nut', {
        config: { host, port, username, password }
      });

      // Start polling immediately after connection
      await invoke('start_background_polling', {
        upsName: 'ups',
        intervalMs: 1000
      });

      setOpen(false);
    } catch (error) {
      console.error("Connection failed:", error);
      alert("Connection failed: " + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>UPS Connection Settings</DialogTitle>
        </DialogHeader>

        {/* Unified Grid Container for Perfect Alignment */}
        <div className="grid grid-cols-4 items-center gap-4 py-4">
          <Label htmlFor="host" className="text-right">Host</Label>
          <Input id="host" value={host} onChange={(e) => setHost(e.target.value)} className="col-span-3" />

          <Label htmlFor="port" className="text-right">Port</Label>
          <Input id="port" type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} className="col-span-3" />

          <Label htmlFor="username" className="text-right">User</Label>
          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="col-span-3" />

          <Label htmlFor="password" className="text-right">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="col-span-3" />

          {/* Divider */}
          <div className="col-span-4 border-t border-zinc-100 dark:border-zinc-800 my-2"></div>

          <Label htmlFor="ratedPower" className="text-right">Rated Power (W)</Label>
          <Input
            id="ratedPower"
            type="number"
            placeholder="e.g. 1800"
            value={ratedPowerInput}
            onChange={(e) => setRatedPowerInput(e.target.value)}
            className="col-span-3"
          />

          <Label htmlFor="runtime" className="text-right">Full Load (min)</Label>
          <Input
            id="runtime"
            type="number"
            placeholder="e.g. 30"
            value={fullLoadRuntimeInput}
            onChange={(e) => setFullLoadRuntimeInput(e.target.value)}
            className="col-span-3"
          />

          <div className="col-span-4 text-[10px] text-muted-foreground text-center">
            * Values used for Power & Runtime estimation if UPS doesn't report them.
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleConnect} disabled={loading}>
            {loading ? "Connecting..." : "Save & Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
