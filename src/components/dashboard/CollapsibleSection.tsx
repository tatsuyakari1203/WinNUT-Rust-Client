import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronRight, DivideIcon as LucideIcon } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ElementType;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  className = "",
  headerClassName = ""
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border border-border/40 rounded-md bg-muted/5 overflow-hidden transition-all duration-300 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-2 hover:bg-muted/10 transition-colors group select-none ${headerClassName}`}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" />}
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
            {title}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
        )}
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
      >
        <div className="overflow-hidden">
          <div className="p-2 pt-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
