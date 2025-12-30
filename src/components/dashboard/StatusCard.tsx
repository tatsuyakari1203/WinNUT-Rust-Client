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
    <div className={`flex flex-col gap-1.5 p-2 -m-1 rounded-md transition-all duration-300 hover:bg-muted/30 hover:ring-1 hover:ring-border/40 group ${className}`}>
      <div className="flex items-center gap-2">
        <div className="p-1 rounded bg-muted/50 group-hover:bg-primary/10 transition-colors">
          <Icon className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">{title}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tracking-tight text-foreground/90">
          {value !== undefined ? value : "--"}
        </span>
        {unit && <span className="text-[10px] font-medium text-muted-foreground">{unit}</span>}
      </div>
      {subValue && (
        <span className="text-[9px] text-muted-foreground/60 block truncate font-medium">
          {subValue}
        </span>
      )}
    </div>
  );
}
