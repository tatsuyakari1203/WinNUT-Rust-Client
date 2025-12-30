import { LucideIcon } from "lucide-react";

interface StatusCardProps {
  title: string;
  value: string | number | undefined;
  unit?: string;
  icon: LucideIcon;
  subValue?: string;
  className?: string;
}

export function StatusCard({ title, value, unit, icon: Icon, subValue, className }: StatusCardProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{title}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tracking-tight">
          {value !== undefined ? value : "--"}
        </span>
        {unit && <span className="text-xs font-medium opacity-60">{unit}</span>}
      </div>
      {subValue && (
        <span className="text-[9px] text-muted-foreground block truncate">
          {subValue}
        </span>
      )}
    </div>
  );
}
