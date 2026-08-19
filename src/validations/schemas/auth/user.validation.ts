import { requiredEmailValidationSchema } from "@/validations/utils/email.validation";
import { z } from "zod";

const createUserValidation = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { message: "First name cannot be empty" }),
  lastName: z.string().optional(),
  email: requiredEmailValidationSchema,
  password: z
    .string({
      required_error: "Password is required",
      invalid_type_error: "Password must be string",
    })
    .min(6, { message: "Password must contain at least 6 characters" }),
  company: z
    .string()
    .trim()
    .min(1, { message: "Company name cannot be empty" }),
  accessCode: z.string().min(1, { message: "Access code cannot be empty" }),
});

export type TUserSchemaValidation = z.infer<typeof createUserValidation>;
export { createUserValidation };
