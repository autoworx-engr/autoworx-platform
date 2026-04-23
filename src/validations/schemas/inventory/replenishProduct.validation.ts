import { z } from "zod";
export const replenishProductValidationSchema = z.object({
  productId: z.number().int("Product ID must be an integer").positive(),
  date: z.date({
    required_error: "Date is required",
    invalid_type_error: "Date must be a valid date",
  }),
  quantity: z.string().refine(
    (val) => {
      const num = Number(val);
      return !isNaN(num) && num >= 0;
    },
    {
      message: "Quantity must be a positive number",
    },
  ),
  vendorId: z.number().int("Vendor ID must be an integer").optional(),
  price: z
    .number({
      required_error: "Price is required",
      invalid_type_error: "Price must be a number",
    })
    .nonnegative("Price must be non-negative")
    .finite("Price must be finite"),
  unit: z
    .string({
      invalid_type_error: "Unit must be a string",
      required_error: "Unit is required",
    })
    .max(5, "Unit must be less than 5 characters")
    .optional()
    .nullish(),
  lot: z
    .string()
    .trim()
    .max(50, "Lot number cannot exceed 50 characters")
    .optional()
    .nullish(),
  notes: z.string().trim().optional().nullish(),
});

export type TReplenishProductValidation = z.infer<
  typeof replenishProductValidationSchema
>;
