import { CheckCircle2, AlertTriangle, Battery, ZapOff } from "lucide-react";

interface PowerStatusProps {
  status: string;
}

export function PowerStatus({ status }: PowerStatusProps) {
  const isOnline = status.includes("OL");
  const isOnBattery = status.includes("OB");
  const isLowBattery = status.includes("LB");
  const isOverload = status.includes("OVER");

  const Indicator = ({ active, label, colorClass, icon: Icon }: { active: boolean; label: string; colorClass: string; icon: any }) => (
    <div className={`flex items-center justify-between py-1.5 ${active ? 'opacity-100' : 'opacity-30 grayscale'}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-3 w-3 ${active ? colorClass : 'text-zinc-500'}`} />
        <span className={`text-[11px] font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      </div>
      <div className={`h-1.5 w-1.5 rounded-full ${active ? colorClass.replace('text-', 'bg-') : 'bg-muted'}`}></div>
    </div>
  );

  return (
    <div className="flex flex-col">
      <h3 className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">State</h3>
      <div className="divide-y divide-border/50">
        <Indicator
          active={isOnline}
          label="Online"
          colorClass="text-green-600"
          icon={CheckCircle2}
        />
        <Indicator
          active={isOnBattery}
          label="On Battery"
          colorClass="text-orange-500"
          icon={Battery}
        />
        <Indicator
          active={isLowBattery}
          label="Low Battery"
          colorClass="text-red-500"
          icon={AlertTriangle}
        />
        <Indicator
          active={isOverload}
          label="Overload"
          colorClass="text-red-600"
          icon={ZapOff}
        />
      </div>
    </div>
  );
}
