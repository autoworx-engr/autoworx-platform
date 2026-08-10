import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  subLabel?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  delay?: number;
}

export const KPICard = ({
  title,
  value,
  subLabel,
  icon: Icon,
  trend,
  trendValue,
  className,
  delay = 0,
}: KPICardProps) => {
  return (
    <div
      className={cn("kpi-card animate-slide-up", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {trend && trendValue && (
          <span
            className={cn(
              "text-[10px] sm:text-xs font-bold leading-none px-2.5 py-1.5 rounded-full inline-flex items-center",
              trend === "up" && "performance-badge-up",
              trend === "down" && "performance-badge-down",
              trend === "neutral" && "performance-badge-neutral",
            )}
          >
            {trend === "up" && "↑"} {trend === "down" && "↓"} {trendValue}
          </span>
        )}
      </div>
      <p className="metric-label mb-1">{title}</p>
      <p className="metric-value">{value}</p>
      {subLabel && (
        <p className="text-sm text-muted-foreground mt-1">{subLabel}</p>
      )}
    </div>
  );
};
