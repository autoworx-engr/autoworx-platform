import {
  DollarSign,
  Briefcase,
  CalendarCheck,
  Receipt,
  Users,
  TrendingUp,
  FileText,
  CreditCard,
  Clock,
  UserX,
} from "lucide-react";
import { KPICard } from "./KPICard";

interface KPIGridProps {
  kpis?: {
    totalPayments: number;
    paymentsCollected: number;
    totalJobs: number;
    appointments: number;
    averageTicket: number;
    totalLeads: number;
    conversionRate: number;
    estimatesSent: number;
    paymentsPending: number;
    unqualifiedLeads: number;
  };
}

export const KPIGrid = ({ kpis }: KPIGridProps) => {
  if (!kpis) return null;

  return (
    <section>
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Overview Summary
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={`$${(kpis.totalPayments ?? 0).toLocaleString()}`}
          icon={DollarSign}
          delay={0}
        />

        <KPICard
          title="Jobs Completed"
          value={(kpis.totalJobs ?? 0).toString()}
          icon={Briefcase}
          delay={50}
        />

        <KPICard
          title="Appointments"
          value={(kpis.appointments ?? 0).toString()}
          icon={CalendarCheck}
          delay={100}
        />

        <KPICard
          title="Average Ticket"
          value={`$${(kpis.averageTicket ?? 0).toLocaleString()}`}
          icon={Receipt}
          delay={150}
        />

        <KPICard
          title="Total Leads"
          value={(kpis.totalLeads ?? 0).toString()}
          icon={Users}
          delay={200}
        />

        <KPICard
          title="Conversion Rate"
          value={`${kpis.conversionRate ?? 0}%`}
          subLabel="Lead → Booked"
          icon={TrendingUp}
          delay={250}
        />

        {/* <KPICard
          title="Estimates Sent"
          value={(kpis.estimatesSent ?? 0).toString()}
          icon={FileText}
          delay={300}
        /> */}

        <KPICard
          title="Payments Collected"
          value={`$${(kpis.paymentsCollected ?? 0).toLocaleString()}`}
          subLabel="Payments + Deposits"
          icon={CreditCard}
          delay={350}
        />

        <KPICard
          title="Payments Pending"
          value={`$${(kpis.paymentsPending ?? 0).toLocaleString()}`}
          subLabel="Unpaid invoices"
          icon={Clock}
          delay={400}
        />

        <KPICard
          title="Unqualified Leads"
          value={(kpis.unqualifiedLeads ?? 0).toString()}
          icon={UserX}
          delay={450}
        />
      </div>
    </section>
  );
};
