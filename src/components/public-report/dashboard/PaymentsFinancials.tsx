import {
  DollarSign,
  CreditCard,
  Wallet,
  RefreshCcw,
  Banknote,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

interface PaymentsFinancialsProps {
  data?: {
    totalInvoiced: number;
    totalPaid: number;
    outstanding: number;
    refunds: number;
    paymentMethods: Array<{ method: string; amount: number; count: number }>;
  };
}

export const PaymentsFinancials = ({ data }: PaymentsFinancialsProps) => {
  const financialCards = [
    {
      title: "Total Invoiced",
      value: data?.totalInvoiced || 0,
      icon: DollarSign,
    },
    { title: "Total Paid", value: data?.totalPaid || 0, icon: CreditCard },
    { title: "Outstanding", value: data?.outstanding || 0, icon: Wallet },
    { title: "Refunds", value: data?.refunds || 0, icon: RefreshCcw },
  ];

  const paymentMethods = data?.paymentMethods || [];
  const totalAmount = paymentMethods.reduce(
    (acc, curr) => acc + curr.amount,
    0,
  );

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
      <SectionHeader title="Payments & Financials" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {financialCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors flex flex-col"
            >
              <div className="flex items-center gap-2 mb-3 shrink-0">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 min-h-[1rem]">
                {card.title}
              </p>
              <p className="text-lg sm:text-xl font-bold mt-auto">
                ${card.value.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
          Payment Method Breakdown
        </h4>
        <div className="space-y-4">
          {paymentMethods.map((item) => {
            const percentage =
              totalAmount > 0
                ? Math.round((item.amount / totalAmount) * 100)
                : 0;
            return (
              <div
                key={item.method}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
              >
                <div className="flex items-center gap-3 w-32 shrink-0">
                  <Banknote className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">
                    {item.method}
                  </span>
                </div>
                <div className="flex-1 w-full">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 w-32 justify-end shrink-0">
                  <span className="text-sm text-muted-foreground w-10 text-right">
                    {percentage}%
                  </span>
                  <span className="text-sm font-semibold w-20 text-right">
                    ${item.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
          {paymentMethods.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No payment method data available
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
