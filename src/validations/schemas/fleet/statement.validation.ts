import { z } from "zod";

// Create fleet statement validation schema
export const createFleetStatementValidationSchema = z.object({
  fleetId: z.number({
    required_error: "Fleet ID is required",
    invalid_type_error: "Fleet ID must be a number",
  }),
  invoiceIds: z
    .array(z.string(), {
      required_error: "Invoice IDs are required",
      invalid_type_error: "Invoice IDs must be an array of strings",
    })
    .min(1, "At least one invoice must be selected"),
});

// Make payment for fleet statement validation schema
export const makeFleetStatementPaymentValidationSchema = z
  .object({
    statementId: z.string({
      required_error: "Statement ID is required",
      invalid_type_error: "Statement ID must be a string",
    }),
    amount: z
      .number({
        required_error: "Payment amount is required",
        invalid_type_error: "Payment amount must be a number",
      })
      .positive("Payment amount must be positive"),
    paymentMethod: z.enum(["CASH", "CARD", "CHECK", "OTHER", "DEPOSIT"], {
      required_error: "Payment method is required",
    }),
    notes: z.string().optional(),
    date: z.date().optional(),
    // Additional payment data based on method
    checkNumber: z.string().optional(),
    creditCard: z.string().optional(),
    cardType: z.enum(["VISA", "MASTERCARD", "AMEX", "DISCOVER"]).optional(),
    paymentMethodId: z.number().optional(),
    receivedCash: z.string().optional(),
    depositMethod: z.string().optional(),
    depositNotes: z.string().optional(),
  })
  .refine(
    (data) => data.paymentMethod !== "DEPOSIT" || !!data.depositMethod?.trim(),
    {
      message: "Deposit method is required",
      path: ["depositMethod"],
    },
  );

export type CreateFleetStatementInput = z.infer<
  typeof createFleetStatementValidationSchema
>;
export type MakeFleetStatementPaymentInput = z.infer<
  typeof makeFleetStatementPaymentValidationSchema
>;
