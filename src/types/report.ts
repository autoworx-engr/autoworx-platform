export interface ReportData {
  kpis: {
    totalLeads: number;
    conversionRate: number;
    estimatesSent: number;
    totalPayments: number;
    paymentsCollected: number;
    paymentsPending: number;
    unqualifiedLeads: number;
    averageTicket: number;
    totalJobs: number;
    appointments: number;
  };
  leadSources: Array<{ source: string; count: number }>;
  paymentsFinancials: {
    totalInvoiced: number;
    totalPaid: number;
    outstanding: number;
    refunds: number;
    paymentMethods: Array<{ method: string; amount: number; count: number }>;
  };
  servicesPerformance: Array<{
    serviceId: number;
    serviceName: string;
    categoryName: string;
    revenue: number;
    jobCount: number;
  }>;
  teamPerformance: Array<{
    userId: number;
    name: string;
    jobsCompleted: number;
    revenue: number;
  }>;
}
