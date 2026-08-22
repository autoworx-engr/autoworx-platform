import { Users} from "lucide-react";

interface LeadsSummaryProps {
  data?: Array<{ source: string; count: number }>;
}

export const LeadsSummary = ({ data = [] }: LeadsSummaryProps) => {
  const totalLeads = data.reduce((acc, curr) => acc + curr.count, 0);

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
            <p className="text-2xl font-bold">{totalLeads}</p>
          </div>
        </div>

        <div className="space-y-3">
          {data.map((item) => (
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
                    style={{
                      width: `${totalLeads > 0 ? (item.count / totalLeads) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">
                  {item.count}
                </span>
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No lead sources found</p>
          )}
        </div>
      </div>
    </div>
  );
};
