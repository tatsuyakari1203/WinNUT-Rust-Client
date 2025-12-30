import { CheckCircle2, AlertTriangle, Battery, ZapOff } from "lucide-react";

interface PowerStatusProps {
  status: string;
}

export function PowerStatus({ status }: PowerStatusProps) {
  // NUT status flags:
  // OL = On Line (Green)
  // OB = On Battery (Yellow/Red)
  // LB = Low Battery (Red)
  // OVER = Overload (Red)
  // TRIM = Trimming voltage (Blue)
  // BOOST = Boosting voltage (Blue)

  const isOnline = status.includes("OL");
  const isOnBattery = status.includes("OB");
  const isLowBattery = status.includes("LB");
  const isOverload = status.includes("OVER"); // Some drivers use "OL" for overload? No, OL is online. OVER is overload.
  // Note: some drivers might use different flags, but standard NUT is OL/OB/LB.

  const Indicator = ({ active, label, colorClass, icon: Icon }: { active: boolean; label: string; colorClass: string; icon: any }) => (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${active ? 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm' : 'border-transparent opacity-50'}`}>
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${active ? colorClass.replace('text-', 'bg-').replace('600', '100').replace('500', '100') : 'bg-zinc-100 dark:bg-zinc-800'}`}>
          <Icon className={`h-4 w-4 ${active ? colorClass : 'text-zinc-400'}`} />
        </div>
        <span className={`text-sm font-medium ${active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>{label}</span>
      </div>
      <div className={`h-2.5 w-2.5 rounded-full ${active ? colorClass.replace('text-', 'bg-') : 'bg-zinc-200 dark:bg-zinc-700'}`}></div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2">Power State</h3>
      <Indicator
        active={isOnline}
        label="UPS On Line"
        colorClass="text-green-600"
        icon={CheckCircle2}
      />
      <Indicator
        active={isOnBattery}
        label="UPS On Battery"
        colorClass="text-yellow-600"
        icon={Battery}
      />
      <Indicator
        active={isLowBattery}
        label="Battery Low"
        colorClass="text-red-500"
        icon={AlertTriangle}
      />
      <Indicator
        active={isOverload}
        label="UPS Overload"
        colorClass="text-red-600"
        icon={ZapOff}
      />
    </div>
  );
}
