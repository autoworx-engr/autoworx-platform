import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const data = [
  { name: "Website", value: 42, color: "hsl(200, 92%, 50%)" },
  { name: "Google", value: 28, color: "hsl(222, 47%, 25%)" },
  { name: "Referral", value: 18, color: "hsl(142, 71%, 45%)" },
  { name: "Walk-in", value: 12, color: "hsl(215, 20%, 65%)" },
];

export const LeadsSourceChart = () => {
  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50 h-full">
      <h3 className="metric-label mb-4">Leads by Source</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(220, 13%, 91%)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
