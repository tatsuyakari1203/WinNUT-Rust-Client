import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatusCardProps {
  title: string;
  value: string | number | undefined;
  unit?: string;
  icon: LucideIcon;
  subValue?: string;
  className?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatusCard({ title, value, unit, icon: Icon, subValue, className }: StatusCardProps) {
  return (
    <Card className={`overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-none bg-white dark:bg-zinc-900 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">{title}</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-bold tracking-tight">
                {value !== undefined ? value : "--"}
              </span>
              {unit && <span className="text-sm font-medium opacity-70">{unit}</span>}
            </div>
            {subValue && (
              <span className="text-xs opacity-60 mt-0.5 block">
                {subValue}
              </span>
            )}
          </div>
          <div className="relative h-10 w-10 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 bg-current opacity-10 rounded-full" />
            <Icon className="relative h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
