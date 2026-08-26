import { PaymentType } from "@prisma/client";

export type PaymentInfo = {
  id: number;
  paymentId: number;
  receivedCash?: string | null;
  creditCard?: string | null;
  cardType?: string | null;
  checkNumber?: string | null;
  depositMethod?: string | null;
  depositNotes?: string | null;
};

export type CheckInfo = {
  id: number;
  paymentId: number;
  checkNumber: string | null;
};

export type InvoiceWithFull = {
  invoiceItems: Array<Record<string, any>>;
  column: {
    title: string | null;
  } | null;
  grandTotal: number;
  due: number;
  deposit?: number;
  vehicleId: number | null;
  createdAt?: Date;
  customerNotes: string | null;
  id: string;
  vehicle: string;
  paymentMethod: PaymentType | string;
  amountPaid: number;
  refundedAmount: number;
  netAmount: number;
  paymentId: number;

  check: CheckInfo | null;
  notes: string | null;
  paymentMethodInfo: PaymentInfo | null;
  paymentDate?: Date;
};

export type TransactionEntry = {
  id: string;
  type: string;
  invoiceId: string;
  vehicle: string;
  amount: number;
  date: Date;
  method: string | null;
  notes: string | null;
  paymentId: number;
  refundId?: number;
  cashReceived: string | null;
};

export type MergedPayment = {
  id: number;
  invoiceId: string;
  paymentId: number;
  amount: number;
  date: Date;
  type: string;
  notes: string;
  card: { creditCard: string; cardType: string };
  checkNumber: string;
  cashReceived: string;
  deposit: number;
  depositMethod: string;
  depositNotes: string;
  paymentMethod?: PaymentType;
  paymentMethodDisplay: PaymentType | string;
};

export type TopService = { id: number; name: string; count: number };
