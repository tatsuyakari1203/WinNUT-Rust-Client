import { useEffect, useState } from 'react';
import { useUpsStore } from './store/upsStore';
import { invoke } from '@tauri-apps/api/core';
import { DashboardView } from './components/dashboard/DashboardView';
import { HistoryCharts } from './components/history/HistoryCharts'; // Review: Create HistoryView wrapper? HistoryCharts is fine for now as it is the view.
import { Header } from './components/layout/Header';
import { useShutdownMonitor } from './hooks/useShutdownMonitor';
import { useUpsData } from './hooks/useUpsData';
import { useNotifications } from './hooks/useNotifications';
import { Toaster, toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export default function App() {
  useUpsData();
  useNotifications();
  const { config, setConnected, setSupportedCommands, shutdownConfig } = useUpsStore();
  const { countdown } = useShutdownMonitor();
  const [view, setView] = useState<'dashboard' | 'history'>('dashboard');

  // Auto-connect and start polling on mount if config exists
  // Re-run if config or shutdownConfig changes?
  // BEWARE: calling start_background_polling multiple times spawns multiple threads if not careful.
  // Ideally, backend should be robust.
  // For now, we only run if we think we are disconnected or init.
  // But React.useEffect runs on dep change.
  // We'll stick to original logic: run once on mount/config change.
  // Warning: If shutdownConfig changes, this effect runs again. user might get double polling.
  // We need to implement disconnect() before connect() if we want to be safe, but disconnect is async.

  useEffect(() => {
    const autoConnect = async () => {
      if (config && config.host && config.host.length > 0) {
        try {
          console.log("Auto-connecting to:", config.host);
          await invoke('connect_nut', { config });

          // Pass shutdownConfig to backend
          await invoke('start_background_polling', {
            upsName: config.ups_name || 'ups',
            intervalMs: 1000,
            shutdownConfig: shutdownConfig // Pass the full config object
          });

          try {
            const cmds = await invoke<string[]>("list_ups_commands", { upsName: config.ups_name || "ups" });
            setSupportedCommands(cmds);
          } catch (e) {
            console.warn("Command fetch failed:", e);
          }

          setConnected(true);
        } catch (err) {
          console.error("Auto-connect failed:", err);
          // Don't toast here to avoid spam on startup
        }
      }
    };

    // Simple debounce or check?
    // useUpsStore initializes config from localStorage.
    autoConnect();

    // Cleanup? invoke('disconnect_nut')?
    // Effect cleanup runs on unmount or before re-run.
    return () => {
      // We usually don't want to disconnect on hot reload, but for production it's fine.
    };
  }, [config, shutdownConfig]); // Dependencies

  // Theme Management
  const { theme } = useUpsStore();
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark", "theme-catppuccin", "theme-dracula", "theme-nord", "theme-monokai", "theme-github-dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else if (theme === "catppuccin") {
      root.classList.add("dark", "theme-catppuccin");
    } else if (theme === "dracula") {
      root.classList.add("dark", "theme-dracula");
    } else if (theme === "nord") {
      root.classList.add("dark", "theme-nord");
    } else if (theme === "monokai") {
      root.classList.add("dark", "theme-monokai");
    } else if (theme === "github-dark") {
      root.classList.add("dark", "theme-github-dark");
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <div className="h-screen bg-background font-sans text-foreground select-none overflow-hidden flex flex-col border border-border rounded-[2px]">
      <Header view={view} setView={setView} />

      {/* Main Content */}
      <main className="flex-1 flex min-h-0 divide-x divide-border/50 overflow-hidden">
        {view === 'history' ? (
          <div className="flex-1 p-6 overflow-y-auto w-full">
            <HistoryCharts />
          </div>
        ) : (
          <DashboardView />
        )}
      </main>

      {/* Shutdown Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-destructive text-destructive-foreground p-8 rounded-xl shadow-2xl flex flex-col items-center gap-6 max-w-sm border-4 border-white/20 animate-in zoom-in duration-300">
            <div className="p-4 bg-white/10 rounded-full animate-bounce">
              <AlertTriangle className="h-12 w-12 text-white" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter">System Shutdown Imminent</h2>
              <p className="text-sm font-medium opacity-90">UPS battery is critical. Closing applications...</p>
            </div>
            <div className="text-7xl font-black font-mono tracking-tighter bg-white/10 px-8 py-4 rounded-lg">
              {countdown}
            </div>
            <button
              onClick={() => {
                invoke('abort_system_stop')
                  .then(() => toast.info("Shutdown aborted"))
                  .catch(e => toast.error(`Failed to abort: ${e}`));
              }}
              className="px-4 py-2 bg-white text-destructive font-bold rounded hover:bg-white/90 transition-colors uppercase tracking-widest text-xs"
            >
              Cancel Shutdown
            </button>
          </div>
        </div>
      )}
      <Toaster richColors position="top-right" theme="dark" />
    </div>
  );
}
