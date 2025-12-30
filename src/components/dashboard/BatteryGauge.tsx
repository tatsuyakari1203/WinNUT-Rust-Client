import { Progress } from "@/components/ui/progress";
import { Battery, BatteryCharging, BatteryWarning, Zap } from "lucide-react";

interface BatteryGaugeProps {
  percentage: number | undefined;
  status: string; // "OL", "OB", etc.
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center justify-center py-6 space-y-4">
        <div className="relative">
          {isCharging ? (
            <BatteryCharging className={`h-20 w-20 ${statusColor} animate-pulse`} />
          ) : isOnBattery ? (
            <BatteryWarning className={`h-20 w-20 text-red-500 animate-pulse`} />
          ) : (
            <Battery className={`h-20 w-20 ${statusColor}`} />
          )}
        </div>

        <div className="text-center">
          <div className="text-5xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-50">
            {percentage}%
          </div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Battery Charge
          </div>
        </div>
      </div>

      <div className="space-y-2 px-2">
        <Progress value={percentage} className={`h-1.5 ${colorClass} bg-zinc-100 dark:bg-zinc-800`} />
      </div>

      <div className="grid grid-cols-2 gap-8 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col items-center justify-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Voltage</span>
          <div className="flex items-center space-x-1">
            <Zap className="h-3 w-3 text-yellow-500" />
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{voltage || "--"}</span>
            <span className="text-xs font-medium text-muted-foreground">V</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center space-y-1 border-l border-zinc-100 dark:border-zinc-800">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Runtime</span>
          <div className="flex items-center space-x-1">
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{runtime ? Math.floor(runtime / 60) : "--"}</span>
            <span className="text-xs font-medium text-muted-foreground">min</span>
          </div>
        </div>
      </div>
    </div>
  );
}
