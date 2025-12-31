import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, Zap } from "lucide-react";

interface HistoryEntry {
  timestamp: number;
  input_voltage: number | null;
  output_voltage: number | null;
  load_percent: number | null;
  battery_charge: number | null;
  status: string;
}

export function HistoryCharts() {
  const [data, setData] = useState<HistoryEntry[]>([]);
  const [range, setRange] = useState<string>("24h");
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await invoke<HistoryEntry[]>("get_chart_data", {
        timeRange: range,
      });
      // Convert timestamp to readable time string for chart
      const formatted = result.map((item) => ({
        ...item,
        timeStr: new Date(item.timestamp * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
      setData(formatted);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      {/* Header Controls */}
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Historical Data</h2>
          <span className="text-[10px] text-muted-foreground/50 font-mono">({data.length} datapoints)</span>
        </div>

        <div className="flex items-center gap-1.5 bg-muted/10 p-1 rounded-lg border border-border/10">
          {["1h", "6h", "12h", "24h"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${range === r
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
            >
              {r}
            </button>
          ))}
          <div className="w-px h-3 bg-border/20 mx-0.5" />
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-rows-2 gap-4 min-h-0">
        {/* Voltage Chart Container */}
        <div className="flex flex-col min-h-0 bg-muted/5 rounded-lg p-3 border border-border/5 hover:border-border/10 transition-colors">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <Zap className="h-3 w-3 text-blue-400" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Voltage Profile</h3>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-0.5 bg-blue-500 rounded-full"></div>
                <span className="text-[9px] font-medium text-muted-foreground">Input</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-0.5 bg-green-500 rounded-full"></div>
                <span className="text-[9px] font-medium text-muted-foreground">Output</span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="timeStr"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                  tick={{ fill: '#64748b' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  unit="V"
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ padding: 0 }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                <Area
                  type="monotone"
                  dataKey="input_voltage"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#colorInput)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="output_voltage"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#colorOutput)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Load/Battery Chart Container */}
        <div className="flex flex-col min-h-0 bg-muted/5 rounded-lg p-3 border border-border/5 hover:border-border/10 transition-colors">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <Activity className="h-3 w-3 text-orange-400" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Load & Battery Capacity</h3>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-0.5 bg-orange-500 rounded-full"></div>
                <span className="text-[9px] font-medium text-muted-foreground">Load</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-0.5 bg-emerald-500 rounded-full"></div>
                <span className="text-[9px] font-medium text-muted-foreground">Battery</span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBatt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="timeStr"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                  tick={{ fill: '#64748b' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ padding: 0 }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                <Area
                  type="monotone"
                  dataKey="load_percent"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#colorLoad)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="battery_charge"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#colorBatt)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
