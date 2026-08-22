import { z } from "zod";
import { estimateTagsValidationSchema } from "../tags/tags.validation";
export const laborCreateValidationSchema = z
  .object({
    name: z
      .string({
        required_error: "Labor name must be required",
        invalid_type_error: "Labor name must be string",
      })
      .nonempty("Labor name is required")
      .max(50, "Labor name must be at most 50 characters"),
    categoryId: z
      .number({
        required_error: "Category is required",
        invalid_type_error: "Category ID must be a number",
      })
      .int("Category Id must be integer")
      .nonnegative("Category is required")
      .nullable()
      .optional(),
    notes: z
      .string({ invalid_type_error: "Notes must be a string value" })
      .nullable()
      .optional(),
    tags: z
      .array(estimateTagsValidationSchema.optional())
      .nullable()
      .optional(),
    hours: z
      .number({ invalid_type_error: "Hours must be a number" })
      .nonnegative("Hours must be a positive value")
      .max(99999999, "Labor Hours must be less than 100,000,000")
      .optional()
      .default(0),
    charge: z
      .number({ invalid_type_error: "Charge must be a number" })
      .nonnegative("Charge must be a positive value")
      .max(99999999, "Labor Charge must be less than 100,000,000")
      .optional()
      .default(0),
    discount: z
      .number({ invalid_type_error: "Discount must be a number" })
      .nonnegative("Discount must be a positive value")
      .max(99999999, "Labor Discount must be less than 100,000,000")
      .optional()
      .default(0),
    cannedLabor: z.boolean().optional().default(false),
  })
  .refine(
    (data) => (data.discount ?? 0) <= (data.hours ?? 0) * (data.charge ?? 0),
    {
      message:
        "Discount cannot be greater than the subtotal (Hours x Rate/Hour)",
      path: ["discount"],
    },
  );

export type TLaborCreateValidationSchema = z.infer<
  typeof laborCreateValidationSchema
>;
