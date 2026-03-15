import { Wrench, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const services = [
  { name: "Oil Change", revenue: 12450, jobs: 156, category: "Maintenance" },
  { name: "Brake Service", revenue: 28900, jobs: 89, category: "Repair" },
  { name: "Tire Rotation", revenue: 8200, jobs: 205, category: "Maintenance" },
  {
    name: "Engine Diagnostic",
    revenue: 15600,
    jobs: 62,
    category: "Diagnostic",
  },
  { name: "AC Repair", revenue: 22400, jobs: 48, category: "Repair" },
];

const categories = [
  { name: "Repair", revenue: 51300 },
  { name: "Maintenance", revenue: 20650 },
  { name: "Diagnostic", revenue: 15600 },
];

export const ServicesPerformance = () => {
  const topService = services.reduce((a, b) => (a.revenue > b.revenue ? a : b));
  const lowestService = services.reduce((a, b) =>
    a.revenue < b.revenue ? a : b,
  );

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
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-success/5 border border-success/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-xs font-medium text-success uppercase tracking-wider">
                  Top Performer
                </span>
              </div>
              <p className="font-semibold">{topService.name}</p>
              <p className="text-lg font-bold text-success">
                ${topService.revenue.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-warning" />
                <span className="text-xs font-medium text-warning uppercase tracking-wider">
                  Needs Attention
                </span>
              </div>
              <p className="font-semibold">{lowestService.name}</p>
              <p className="text-lg font-bold text-warning">
                ${lowestService.revenue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
