import { z } from "zod";

// remove product from inventory validation schema
export const lossProductValidationSchema = z.object({
  productId: z
    .number({
      required_error: "Product ID is required",
      invalid_type_error: "Product ID must be a number",
    })
    .int("Product ID must be an integer")
    .positive("Product ID must be positive"),

  invoiceId: z.string().nullish(),

  date: z.date({
    required_error: "Date is required",
    invalid_type_error: "Invalid date format",
  }),
  // .refine((date) => date <= new Date(), "Date cannot be in the future"),
  quantity: z
    .string()
    .max(7, "Quantity must be less than 8 characters")
    .refine(
      (val) => {
        const num = Number(val);
        return !isNaN(num) && num >= 0;
      },
      {
        message: "Quantity must be a positive number",
      },
    ),
  notes: z
    .string({
      required_error: "Notes are required",
      invalid_type_error: "Notes must be a string",
    })
    .trim()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
    .nullable(),
});

// update sales inventory history validation schema

export const updateSalesInventoryHistorySchema = z.object({
  productId: z
    .number()
    .int("Product ID must be an integer")
    .positive("Product ID must be positive"),

  invoiceId: z.string().nullish(),

  quantity: z
    .string()
    .max(7, "Quantity must be less than 8 characters")
    .refine(
      (val) => {
        const num = Number(val);
        return !isNaN(num) && num >= 0;
      },
      {
        message: "Quantity must be a positive number",
      },
    ),
  notes: z.string().trim().max(500, "Notes cannot exceed 500 characters"),

  inventoryProductHistoryId: z
    .number()
    .int("History ID must be an integer")
    .positive("History ID must be positive"),
});

// update purchase inventory history validation schema
export const updatePurchaseInventoryHistorySchema = z.object({
  historyId: z.number().int().positive(),

  productId: z.number().int().positive(),

  date: z.date().optional(),
  // .max(new Date(), "Date cannot be in the future"),

  vendorId: z.number().int().positive().optional(),

  price: z
    .number({
      required_error: "Price is required",
      invalid_type_error: "Price must be a number",
    })
    .nonnegative("Price must be non-negative")
    .finite("Price must be finite")
    .optional()
    .nullable(),

  quantity: z
    .string()
    .max(7, "Quantity must be less than 8 characters")
    .refine(
      (val) => {
        const num = Number(val);
        return !isNaN(num) && num >= 0;
      },
      {
        message: "Quantity must be a positive number",
      },
    ),

  unit: z
    .string({
      invalid_type_error: "Unit must be a string",
      required_error: "Unit is required",
    })
    .max(10, "Unit must be less than 10 characters")
    .optional()
    .nullish(),

  lot: z
    .string()
    .trim()
    .max(50, "Lot number cannot exceed 50 characters")
    .optional()
    .nullish(),

  notes: z
    .string()
    .trim()
    .max(500, "Notes cannot exceed 500 characters")
    .optional(),
});

export type TLossProductValidation = z.infer<
  typeof lossProductValidationSchema
>;
export type TUpdateSalesInventoryHistorySchema = z.infer<
  typeof updateSalesInventoryHistorySchema
>;

export type TUpdatePurchaseInventoryHistorySchema = z.infer<
  typeof updatePurchaseInventoryHistorySchema
>;
