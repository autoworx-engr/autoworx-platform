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
      message: "category must be required",
      invalid_type_error: "category name must be string",
    })
    .int("Category Id must be integer")
    .nonnegative("Category is required")
    .nullable()
    .optional(),
  notes: z
    .string({ invalid_type_error: "notes must be string value" })
    .nullable()
    .optional(),
  tags: z.array(estimateTagsValidationSchema.optional()).nullable().optional(),
  hours: z
    .number({ invalid_type_error: "hours must be number" })
    .nonnegative("Hours must be positive value")
    .optional()
    .default(0),
  charge: z
    .number({ invalid_type_error: "charge must be string value" })
    .nonnegative("Charge must be positive value")
    .optional()
    .default(0),
  discount: z
    .number({ invalid_type_error: "discount must be string value" })
    .nonnegative("Discount must be positive value")
    .optional()
    .default(0),
  cannedLabor: z.boolean().optional().default(false),
});

export type TLaborCreateValidationSchema = z.infer<
  typeof laborCreateValidationSchema
>;
