import { getPaymentTabData } from "./payment/getPaymentTabData";
import InvoicePaymentsSection from "./payment/InvoicePaymentsSection";
import PaymentSummary from "./payment/PaymentSummary";
import TransactionHistorySection from "./payment/TransactionHistorySection";

export type { InvoiceWithFull } from "./payment/types";

const NoClient = () => (
  <div className="flex h-full items-center justify-center">
    No Client Selected
  </div>
);

export default async function PaymentTab({
  clientId,
}: {
  clientId: number | undefined;
}) {
  if (!clientId) return <NoClient />;

  const data = await getPaymentTabData(clientId);
  if (!data) return <NoClient />;

  return (
    <div className="mx-auto flex w-full flex-col gap-3">
      <PaymentSummary
        totalAmount={data.totalAmount}
        totalCustomerPaidAmount={data.totalCustomerPaidAmount}
        totalRefundedAmount={data.totalRefundedAmount}
        totalTransactions={data.allTransactionEntries.length}
        totalServices={data.totalServices}
      />

      <InvoicePaymentsSection
        invoicesWithFull={data.invoicesWithFull}
        mergedPaymentData={data.mergedPaymentData}
      />

      <TransactionHistorySection transactions={data.allTransactionEntries} />
    </div>
  );
}
