import { Card, CardContent, CardHeader } from "@/components/ui/card";

type TProps = {
  title: string;
  statistic: number;
};

export default function ReportingStatisticsCard({ title, statistic }: TProps) {
  return (
    <Card className="rounded-xl border border-gray-200 bg-white text-[#66738C] shadow-sm xl:w-[400px]">
      <CardHeader className="pb-2">
        <h3 className="text-center text-xl font-semibold">{title}</h3>
      </CardHeader>
      <CardContent className="pb-6 pt-[14px]">
        <div className="text-center">
          <span className="text-5xl font-semibold md:text-6xl lg:text-7xl">
            {statistic}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
