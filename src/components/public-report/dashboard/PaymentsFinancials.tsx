import {
  DollarSign,
  CreditCard,
  Wallet,
  RefreshCcw,
  Banknote,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const financialCards = [
  { title: "Total Invoiced", value: 125400, icon: DollarSign },
  { title: "Total Paid", value: 98750, icon: CreditCard },
  { title: "Outstanding", value: 26650, icon: Wallet },
  { title: "Refunds", value: 1250, icon: RefreshCcw },
];

const paymentMethods = [
  { method: "Card", amount: 64200, percentage: 65 },
  { method: "Zelle", amount: 19750, percentage: 20 },
  { method: "Cash", amount: 9875, percentage: 10 },
  { method: "Other", amount: 4925, percentage: 5 },
];

export const PaymentsFinancials = () => {
  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
      <SectionHeader title="Payments & Financials" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {financialCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {card.title}
              </p>
              <p className="text-xl font-bold">
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
          {paymentMethods.map((item) => (
            <div key={item.method} className="flex items-center gap-4">
              <div className="flex items-center gap-3 w-24">
                <Banknote className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{item.method}</span>
              </div>
              <div className="flex-1">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 w-32 justify-end">
                <span className="text-sm text-muted-foreground">
                  {item.percentage}%
                </span>
                <span className="text-sm font-semibold">
                  ${item.amount.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
