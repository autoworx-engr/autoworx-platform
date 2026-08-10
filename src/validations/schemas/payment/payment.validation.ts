import { CardType, PaymentType } from "@prisma/client";
import { z } from "zod";

export const cardPaymentValidation = z.object({
  creditCard: z.string().nonempty("credit card number must be required"),
  cardType: z.enum(["AMEX", "MASTERCARD", "VISA", "DISCOVER", "OTHER"] as [
    string,
    ...CardType[],
  ]),
});

export const checkPaymentValidation = z.object({
  checkNumber: z.string().nonempty("check number must be required"),
});

export const cashPaymentValidation = z.object({
  receivedCash: z.string({ message: "receive cash must be required" }),
});

export const otherPaymentValidation = z.object({
  paymentMethodId: z.number(),
  amount: z.number().nonnegative("amount must be positive value"),
});

export const depositPaymentValidation = z.object({
  depositMethod: z.string().nonempty("deposit method must be required"),
  depositNotes: z.string().optional(),
});

export const additionalDataValidation = z.union([
  cardPaymentValidation,
  checkPaymentValidation,
  cashPaymentValidation,
  otherPaymentValidation,
  depositPaymentValidation,
]);
export const createPaymentValidationSchema = z.object({
  invoiceId: z.string().nonempty("invoice must be required"),
  type: z.enum(["CARD", "CASH", "CHECK", "OTHER", "DEPOSIT"] as [
    string,
    ...PaymentType[],
  ]),
  date: z.date({ message: "Date must be required" }),
  notes: z.string().optional(),
  amount: z.number().nonnegative("number must be positive value"),
  additionalData: additionalDataValidation,
});
