import { z } from "zod";
import { estimateTagsValidationSchema } from "../tags/tags.validation";
export const laborCreateValidationSchema = z.object({
  name: z
    .string({
      required_error: "Labor name must be required",
      invalid_type_error: "Labor name must be string",
    })
    .nonempty("Labor name is required"),
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
  tags: z.array(estimateTagsValidationSchema.optional()).nullable().optional(),
  hours: z
    .number({ invalid_type_error: "Hours must be a number" })
    .nonnegative("Hours must be a positive value")
    .optional()
    .default(0),
  charge: z
    .number({ invalid_type_error: "Charge must be a number" })
    .nonnegative("Charge must be a positive value")
    .optional()
    .default(0),
  discount: z
    .number({ invalid_type_error: "Discount must be a number" })
    .nonnegative("Discount must be a positive value")
    .optional()
    .default(0),
  cannedLabor: z.boolean().optional().default(false),
});

export type TLaborCreateValidationSchema = z.infer<
  typeof laborCreateValidationSchema
>;
