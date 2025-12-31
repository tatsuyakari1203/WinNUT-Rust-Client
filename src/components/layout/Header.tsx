import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import { Zap, Minus, X } from 'lucide-react';
import { SettingsModal } from '../settings/SettingsModal';
import { useUpsStore } from '../../store/upsStore';
import { useEffect, useState } from 'react';

const appWindow = getCurrentWindow();

interface HeaderProps {
  view: 'dashboard' | 'history';
  setView: (v: 'dashboard' | 'history') => void;
}

export function Header({ view, setView }: HeaderProps) {
  const { data } = useUpsStore();
  const status = data?.status || "UNKNOWN";

  const handleDrag = (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('button, input, .no-drag')) {
      appWindow.startDragging();
    }
  };

  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    getVersion().then(setAppVersion).catch(console.error);
  }, []);

  return (
    <header
      onMouseDown={handleDrag}
      className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0 cursor-default select-none group/header"
    >
      <div className="flex items-center gap-2 pointer-events-none">
        <Zap className="h-3.5 w-3.5 text-yellow-500" />
        <h1 className="text-xs font-bold tracking-tight">WinNUT Rust Client <span className="text-[9px] text-muted-foreground ml-1 px-1 py-0.5 rounded bg-muted/20 border border-border/20">v{appVersion}</span></h1>
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

      {/* View Switcher */}
      <div className="flex items-center gap-1 bg-muted/10 p-0.5 rounded-lg border border-border/10 no-drag">
        <button
          onClick={() => setView('dashboard')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${view === 'dashboard' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setView('history')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${view === 'history' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          History
        </button>
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
  );
}
