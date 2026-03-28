import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface LeadsSourceChartProps {
  data?: Array<{ source: string; count: number }>;
}

const COLORS = [
  "hsl(200, 92%, 50%)",
  "hsl(222, 47%, 25%)",
  "hsl(142, 71%, 45%)",
  "hsl(215, 20%, 65%)",
  "hsl(280, 65%, 60%)",
  "hsl(20, 90%, 65%)",
];

export const LeadsSourceChart = ({ data = [] }: LeadsSourceChartProps) => {
  const chartData = data.map((item, index) => ({
    name: item.source,
    value: item.count,
    color: COLORS[index % COLORS.length],
  }));

  const displayData = chartData.length > 0 ? chartData : [
    { name: "No Data", value: 1, color: "hsl(215, 20%, 65%)" }
  ];

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50 h-full">
      <h3 className="metric-label mb-4">Leads by Source</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {displayData.map((entry, index) => (
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
