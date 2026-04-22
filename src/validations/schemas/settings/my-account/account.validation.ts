import { requiredEmailValidationSchema } from "@/validations/utils/email.validation";
import { phoneValidationSchema } from "@/validations/utils/phone.validation";
import { z } from "zod";
export const updateUserValidationSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: requiredEmailValidationSchema,
  image: z.string().url().optional(),
  phone: phoneValidationSchema.optional(),
  countryCode: z.string().optional(),
  address: z.string().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z
    .string()
    .refine((val) => {
      return true;
      // if (!val) return true;
      // const zipRegex = /^\d{5}(-\d{4})?$/;
      // return zipRegex.test(val);
    }, "Invalid ZIP code format")
    .nullable()
    .optional(),
});

export type TUpdateUserValidationSchema = z.infer<
  typeof updateUserValidationSchema
>;
