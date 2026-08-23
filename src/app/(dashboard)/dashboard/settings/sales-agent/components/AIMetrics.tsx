"use client";

import { Calendar, Loader2, MessageCircleMore, Users } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { useQuery } from "@tanstack/react-query";

interface SMSStats {
  totalClients: number;
  totalTexts: number;
  appointmentsBooked: number;
}

async function fetchMetrics(companyId: number): Promise<SMSStats> {
  const res = await fetch(
    `/api/ai-train/sales-agent-metrics?companyId=${companyId}`,
  );

  const data = await res.json();
  if (!data.success) throw new Error("Failed to fetch");

  return data.data;
}

export default function AIMetrics({ companyId }: { companyId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sales-agent-metrics", companyId],
    queryFn: () => fetchMetrics(companyId),
  });

  return (
    <section className="min-w-0">
      <h2 className="my-4 text-lg font-semibold text-foreground">
        Performance Metrics
      </h2>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Clients Contacted"
            value={data?.totalClients ?? 0}
            icon={<Users className="h-5 w-5" />}
            subtitle="Unique phone numbers"
            variant="success"
          />
          <StatsCard
            title="Texts Exchanged"
            value={data?.totalTexts ?? 0}
            icon={<MessageCircleMore className="h-5 w-5" />}
            subtitle="Total messages sent & received"
            variant="success"
          />
          <StatsCard
            title="Task Created"
            value={data?.appointmentsBooked ?? 0}
            icon={<Calendar className="h-5 w-5" />}
            subtitle="Created by Sales Agent"
          />
        </div>
      )}
    </section>
  );
}
