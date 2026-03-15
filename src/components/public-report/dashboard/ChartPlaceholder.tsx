import { cn } from "@/lib/utils";
import { BarChart3, PieChart } from "lucide-react";

interface ChartPlaceholderProps {
  title: string;
  type?: "bar" | "pie" | "donut";
  height?: string;
  className?: string;
}

export const ChartPlaceholder = ({
  title,
  type = "bar",
  height = "h-64",
  className,
}: ChartPlaceholderProps) => {
  const Icon = type === "bar" ? BarChart3 : PieChart;

  return (
    <div className={cn("section-card", className)}>
      <h3 className="section-title">{title}</h3>
      <div className={cn("chart-placeholder", height)}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Icon className="w-12 h-12 opacity-30" />
          <span className="text-sm">Chart visualization</span>
        </div>
      </div>
    </div>
  );
};
