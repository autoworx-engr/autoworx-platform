import { z } from "zod";

export const SERVICE_NAME_MIN_LENGTH = 2;
export const SERVICE_NAME_MAX_LENGTH = 100;
export const SERVICE_DESCRIPTION_MAX_LENGTH = 1500;

const serviceNameSchema = z
  .string({
    message: "name must be required",
    invalid_type_error: "name must be string value",
  })
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .nonempty("Service name is required")
      .min(
        SERVICE_NAME_MIN_LENGTH,
        `Service name must be at least ${SERVICE_NAME_MIN_LENGTH} characters`,
      )
      .max(
        SERVICE_NAME_MAX_LENGTH,
        `Service name must be less than ${SERVICE_NAME_MAX_LENGTH} characters`,
      ),
  );

const serviceDescriptionSchema = z
  .string({ invalid_type_error: "description must be string" })
  .max(
    SERVICE_DESCRIPTION_MAX_LENGTH,
    `Description must be less than ${SERVICE_DESCRIPTION_MAX_LENGTH} characters`,
  )
  .transform((value) => value.trim())
  .nullable()
  .optional();

export const serviceCreateValidationSchema = z.object({
  name: serviceNameSchema,
  categoryId: z
    .number({ message: "category must be required" })
    .nonnegative("Category is required")
    .nullable()
    .optional(),
  description: serviceDescriptionSchema,
  canned: z.boolean().optional(),
});

export const serviceUpdateValidationSchema = z.object({
  id: z.number({ message: "Service id is required" }).int().positive(),
  name: serviceNameSchema,
  categoryId: z
    .number({ message: "category must be required" })
    .nonnegative("Category is required")
    .nullable()
    .optional(),
  description: serviceDescriptionSchema,
  canned: z.boolean().optional(),
});

export type TServiceCreateValidationSchema = z.input<
  typeof serviceCreateValidationSchema
>;

export type TServiceUpdateValidationSchema = z.input<
  typeof serviceUpdateValidationSchema
>;
