import { z } from "zod";

export const serviceCreateValidationSchema = z.object({
  name: z
    .string({
      message: "name must be required",
      invalid_type_error: "name must be string value",
    })
    .nonempty("Service name is required"),
  categoryId: z
    .number({ message: "category must be required" })
    .nonnegative("Category is required")
    .nullable()
    .optional(),
  description: z
    .string({ invalid_type_error: "description must be string" })
    .nullable()
    .optional(),
  canned: z.boolean().optional(),
});

export type TServiceCreateValidationSchema = z.infer<
  typeof serviceCreateValidationSchema
>;
