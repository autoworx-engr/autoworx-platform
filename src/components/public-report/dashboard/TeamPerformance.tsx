import { Users, Eye, EyeOff } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const teamMembers = [
  {
    name: "John Martinez",
    type: "Employee",
    jobs: 45,
    revenue: 28500,
    pay: 4200,
  },
  { name: "Sarah Chen", type: "Employee", jobs: 52, revenue: 32100, pay: 4800 },
  {
    name: "Mike Johnson",
    type: "Contractor",
    jobs: 38,
    revenue: 22400,
    pay: 3360,
  },
  {
    name: "Emily Davis",
    type: "Employee",
    jobs: 41,
    revenue: 25600,
    pay: 3900,
  },
  {
    name: "Carlos Rivera",
    type: "Contractor",
    jobs: 29,
    revenue: 18900,
    pay: 2835,
  },
];

export const TeamPerformance = () => {
  const [includeInPdf, setIncludeInPdf] = useState(true);

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
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
            {teamMembers.map((member, index) => (
              <tr
                key={member.name}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">{member.name}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      member.type === "Employee"
                        ? "bg-primary/10 text-primary"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {member.type}
                  </span>
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
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td colSpan={2} className="py-4 px-4 font-semibold">
                Total
              </td>
              <td className="py-4 px-4 text-right font-bold">
                {teamMembers.reduce((acc, m) => acc + m.jobs, 0)}
              </td>
              <td className="py-4 px-4 text-right font-bold">
                $
                {teamMembers
                  .reduce((acc, m) => acc + m.revenue, 0)
                  .toLocaleString()}
              </td>
              <td className="py-4 px-4 text-right font-bold text-muted-foreground">
                $
                {teamMembers
                  .reduce((acc, m) => acc + m.pay, 0)
                  .toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
