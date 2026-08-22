import { requiredEmailValidationSchema } from "@/validations/utils/email.validation";
import { z } from "zod";
import { createUserValidation } from "./user.validation";

/**
 * The register form's schema: the shared user schema plus the confirmation
 * field, which only exists in the form. The mismatch error is attached to
 * `confirmPassword` so it renders against that input rather than as a
 * form-level message.
 */
export const registerFormValidation = createUserValidation
  .extend({
    email: requiredEmailValidationSchema.transform((value) =>
      value.trim().toLowerCase(),
    ),
    confirmPassword: z
      .string()
      .min(1, { message: "Please confirm your password" }),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export type TRegisterFormValidation = z.infer<typeof registerFormValidation>;
export type TRegisterField = keyof TRegisterFormValidation;
