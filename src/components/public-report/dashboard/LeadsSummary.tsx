import { Users, UserX, TrendingUp, Phone } from "lucide-react";

const leadSources = [
  { source: "Website", count: 42, percentage: 42 },
  { source: "Google Ads", count: 28, percentage: 28 },
  { source: "Referral", count: 18, percentage: 18 },
  { source: "Walk-in", count: 12, percentage: 12 },
];

export const LeadsSummary = () => {
  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50 h-full">
      <h3 className="metric-label mb-4">Lead Summary</h3>

      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Total Leads</p>
            <p className="text-2xl font-bold">100</p>
          </div>
        </div>

        <div className="space-y-3">
          {leadSources.map((item) => (
            <div
              key={item.source}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-muted-foreground">
                {item.source}
              </span>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">
                  {item.count}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-3 p-3 bg-destructive/5 rounded-lg">
            <div className="p-2 rounded-lg bg-destructive/10">
              <UserX className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-destructive">
                Unqualified Leads
              </p>
              <p className="text-xl font-bold text-destructive">23</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
