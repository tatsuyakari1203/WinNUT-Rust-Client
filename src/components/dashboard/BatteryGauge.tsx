import { Progress } from "@/components/ui/progress";
import { Battery, BatteryCharging, BatteryWarning } from "lucide-react";

interface BatteryGaugeProps {
  percentage: number | undefined;
  status: string;
  voltage: number | undefined;
  runtime: number | undefined;
}

export function BatteryGauge({ percentage = 0, status, voltage, runtime }: BatteryGaugeProps) {
  const isCharging = status.includes("OL") && percentage < 100;
  const isOnBattery = status.includes("OB");

  let colorClass = "bg-green-500";
  let statusColor = "text-green-500";

  if (percentage < 20) {
    colorClass = "bg-red-500";
    statusColor = "text-red-500";
  } else if (percentage < 50) {
    colorClass = "bg-yellow-500";
    statusColor = "text-yellow-500";
  }

  const formatRuntime = (seconds: number | undefined) => {
    if (seconds === undefined || seconds <= 0) return "--:--:--";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex flex-col items-center mb-4">
        <div className="relative mb-1">
          {isCharging ? (
            <BatteryCharging className={`h-12 w-12 ${statusColor} animate-pulse`} />
          ) : isOnBattery ? (
            <BatteryWarning className={`h-12 w-12 text-red-500 animate-pulse`} />
          ) : (
            <Battery className={`h-12 w-12 ${statusColor}`} />
          )}
        </div>
        <div className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
          {percentage}%
        </div>
        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
          Charge
        </div>
      </div>

      <Progress value={percentage} className={`h-1 w-full ${colorClass} bg-zinc-100 dark:bg-zinc-800 mb-4`} />

      <div className="w-full grid grid-cols-2 gap-4 pt-2 border-t border-zinc-50 dark:border-zinc-800/50">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Voltage</span>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{voltage || "--"}</span>
            <span className="text-[10px] text-muted-foreground">V</span>
          </div>
        </div>
        <div className="flex flex-col border-l border-zinc-50 dark:border-zinc-800/50 pl-4">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Remaining</span>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 font-mono tracking-tight">{formatRuntime(runtime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
