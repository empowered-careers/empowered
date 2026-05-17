import { cn } from "@/lib/utils";

export interface DimensionRow {
  key: string;
  label: string;
  value: number;
}

interface DimensionListProps {
  items: DimensionRow[];
  className?: string;
}

function barColor(value: number): string {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

export function DimensionList({ items, className }: DimensionListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => (
        <div key={item.key} className="space-y-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-foreground">{item.label}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {item.value}
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted">
            <div
              className={cn("h-full transition-all", barColor(item.value))}
              style={{ width: `${Math.max(0, Math.min(100, item.value))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
