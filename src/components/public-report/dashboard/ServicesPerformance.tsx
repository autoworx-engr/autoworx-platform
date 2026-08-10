import { Wrench, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

interface ServicesPerformanceProps {
  data?: {
    services: Array<{
      name: string;
      revenue: number;
      jobs: number;
      category: string;
    }>;
    categories: Array<{
      name: string;
      revenue: number;
    }>;
  };
}

export const ServicesPerformance = ({ data }: ServicesPerformanceProps) => {
  const services = data?.services || [];
  const categories = data?.categories || [];

  const topService =
    services.length > 0
      ? services.reduce((a, b) => (a.revenue > b.revenue ? a : b))
      : { name: "N/A", revenue: 0 };

  const lowestService =
    services.length > 0
      ? services.reduce((a, b) => (a.revenue < b.revenue ? a : b))
      : { name: "N/A", revenue: 0 };

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
      <SectionHeader title="Services Performance" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Service */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
            Revenue by Service
          </h4>
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wrench className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {service.jobs} jobs
                    </p>
                  </div>
                </div>
                <span className="font-semibold">
                  ${service.revenue.toLocaleString()}
                </span>
              </div>
            ))}
            {services.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No service data available
              </p>
            )}
          </div>
        </div>

        {/* Revenue by Category + Top/Lowest */}
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
              Revenue by Category
            </h4>
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.name}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BarChart3 className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-sm">{category.name}</span>
                  </div>
                  <span className="font-semibold">
                    ${category.revenue.toLocaleString()}
                  </span>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No category data available
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                  Top Performer
                </span>
              </div>
              <p className="text-lg font-bold text-gray-900 mb-1">
                {topService.name}
              </p>
              <p className="text-sm text-emerald-700 font-medium">
                ${topService.revenue.toLocaleString()}
              </p>
            </div>

            <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                  Lowest Revenue
                </span>
              </div>
              <p className="text-lg font-bold text-gray-900 mb-1">
                {lowestService.name}
              </p>
              <p className="text-sm text-rose-700 font-medium">
                ${lowestService.revenue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
