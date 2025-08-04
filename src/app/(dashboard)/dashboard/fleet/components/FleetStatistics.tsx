import PayoutCard from "../../employee/components/PayoutCard";

type FleetStatisticsProps = {
  unpaid: number;
  paid: number;
  totalInvoice: number;
  totalValue: number;
};

export default function FleetStatistics({
  unpaid,
  paid,
  totalInvoice,
  totalValue,
}: FleetStatisticsProps) {
  const className = "h-16 lg:p-2 flex justify-between items-center";

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <PayoutCard
        title="No. of Jobs"
        amount={totalInvoice}
        customStyles={className}
        hideDollar
      />

      <PayoutCard
        title="Customer Lifetime Value"
        amount={totalValue}
        customStyles={className}
      />
      <PayoutCard
        title="No. of Paid Invoices"
        amount={paid}
        customStyles={className}
        hideDollar
      />
      <PayoutCard
        title="No. of Unpaid Invoices"
        amount={unpaid}
        customStyles={className}
        hideDollar
      />
    </div>
  );
}
