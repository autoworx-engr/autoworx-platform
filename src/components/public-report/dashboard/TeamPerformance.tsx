import { Users, Eye, EyeOff } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

interface TeamPerformanceProps {
  data?: Array<{
    name: string;
    type: string;
    jobs: number;
    revenue: number;
    pay: number;
  }>;
}

export const TeamPerformance = ({ data = [] }: TeamPerformanceProps) => {
  const [includeInPdf, setIncludeInPdf] = useState(true);

  return (
    <div
      className={`bg-card rounded-xl p-6 shadow-sm border border-border/50 team-performance-section ${!includeInPdf ? "opacity-60 grayscale" : ""}`}
    >
      <SectionHeader
        title="Team Performance"
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {includeInPdf ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              <span>Include in PDF</span>
            </div>
            <Switch
              checked={includeInPdf}
              onCheckedChange={setIncludeInPdf}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Name
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Jobs
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Revenue
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Pay
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((member) => (
              <tr
                key={member.name}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium truncate max-w-[120px]">
                      {member.name}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm text-muted-foreground">
                  {member.type}
                </td>
                <td className="py-4 px-4 text-right font-medium">
                  {member.jobs}
                </td>
                <td className="py-4 px-4 text-right font-semibold">
                  ${member.revenue.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-right text-muted-foreground">
                  ${member.pay.toLocaleString()}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-sm text-muted-foreground italic"
                >
                  No team performance data available
                </td>
              </tr>
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="bg-muted/30">
                <td colSpan={2} className="py-4 px-4 font-semibold">
                  Total
                </td>
                <td className="py-4 px-4 text-right font-bold">
                  {data.reduce((acc, m) => acc + m.jobs, 0)}
                </td>
                <td className="py-4 px-4 text-right font-bold">
                  $
                  {data.reduce((acc, m) => acc + m.revenue, 0).toLocaleString()}
                </td>
                <td className="py-4 px-4 text-right font-bold text-muted-foreground">
                  ${data.reduce((acc, m) => acc + m.pay, 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
