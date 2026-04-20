import { Prisma } from "@prisma/client";

type Numeric = Prisma.Decimal | number | string | null | undefined;

type InvoiceWithTotals = {
  grandTotal?: Numeric;
  totalPayment?: Numeric;
  due?: Numeric;
};

export function calcStatementTotals(invoices: InvoiceWithTotals[]) {
  const totalAmount = invoices.reduce(
    (sum, inv) => sum + Number(inv.grandTotal ?? 0),
    0,
  );
  const totalPaid = invoices.reduce(
    (sum, inv) => sum + Number(inv.totalPayment ?? 0),
    0,
  );
  const totalDue = invoices.reduce((sum, inv) => sum + Number(inv.due ?? 0), 0);
  return { totalAmount, totalPaid, totalDue };
}
