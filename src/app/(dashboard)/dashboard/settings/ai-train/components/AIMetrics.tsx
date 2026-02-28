"use client";
import { Calendar, Loader2, MessageSquare, Users } from "lucide-react";
import React, { useState } from "react";
import { StatsCard } from "./StatsCard";

interface SMSStats {
  totalClients: number;
  totalTexts: number;
  appointmentsBooked: number;
}

export default function AIMetrics() {
  const [stats, setStats] = useState<SMSStats>({
    totalClients: 0,
    totalTexts: 0,
    appointmentsBooked: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  return (
    <section>
      <h2 className="my-4 text-lg font-semibold text-foreground">
        Performance Metrics
      </h2>
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Clients Contacted"
            value={stats.totalClients}
            icon={<Users className="h-5 w-5" />}
            subtitle="Unique phone numbers"
            variant="primary"
          />
          <StatsCard
            title="Texts Exchanged"
            value={stats.totalTexts}
            icon={<MessageSquare className="h-5 w-5" />}
            subtitle="Total messages sent & received"
            variant="success"
          />
          <StatsCard
            title="Task Created"
            value={stats.appointmentsBooked}
            icon={<Calendar className="h-5 w-5" />}
            subtitle="Confirmed bookings via SMS"
          />
        </div>
      )}
    </section>
  );
}
