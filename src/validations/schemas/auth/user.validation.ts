import { requiredEmailValidationSchema } from "@/validations/utils/email.validation";
import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 72;

const createUserValidation = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { message: "First name cannot be empty" })
    .max(50, { message: "First name cannot exceed 50 characters" }),
  lastName: z
    .string()
    .trim()
    .max(50, { message: "Last name cannot exceed 50 characters" })
    .optional(),
  email: requiredEmailValidationSchema.transform((value) => value.trim()),
  password: z
    .string({
      required_error: "Password is required",
      invalid_type_error: "Password must be string",
    })
    .min(PASSWORD_MIN_LENGTH, {
      message: `Password must contain at least ${PASSWORD_MIN_LENGTH} characters`,
    })
    .max(PASSWORD_MAX_LENGTH, {
      message: `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`,
    }),
  company: z
    .string()
    .trim()
    .min(1, { message: "Company name cannot be empty" })
    .max(100, { message: "Company name cannot exceed 100 characters" }),
  accessCode: z
    .string()
    .trim()
    .min(1, { message: "Access code cannot be empty" }),
});

export type TUserSchemaValidation = z.infer<typeof createUserValidation>;
export { createUserValidation };
