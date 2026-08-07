import { optionalEmailValidationSchema } from "@/validations/utils/email.validation";
import { phoneValidationSchema } from "@/validations/utils/phone.validation";
import { z } from "zod";

export const updateBusinessAccountValidationSchema = z.object({
  companyId: z.number().int().optional(),
  name: z.string().min(1, "Name is required"), // Name is required and must be a string
  businessId: z.string().nullable().optional(), // Nullable string for businessId
  businessType: z.string().nullable().optional(), // Nullable string for businessType
  phone: phoneValidationSchema.nullable().optional(), // Optional phone with E.164 validation
  email: optionalEmailValidationSchema, // Optional nullable email with validation
  industry: z.string().nullable(), // Nullable string for industry
  website: z
    .string()
    .refine((val) => {
      if (!val) return true;
      const urlRegex =
        /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:\/?#[\]@!$&'()*+,;=]*)?$/;
      return urlRegex.test(val);
    })
    .nullable()
    .optional(), // Optional nullable URL
  image: z.string().nullable().optional(), // Nullable string for the uploaded business logo URL
  address: z.string().nullable().optional(), // Nullable string for address
  city: z.string().nullable().optional(), // Nullable string for city
  state: z.string().nullable().optional(), // Nullable string for state
  zip: z.string().nullable().optional(), // Optional nullable US ZIP code format
  about: z.string().nullable().optional(),
  teamSize: z.enum(["SMALL", "MEDIUM", "LARGE"]).nullable().optional(),
  timezone: z.string().nullable().optional(),
  countryCode: z.string().nullable().optional(),
});

export type TUpdateBusinessAccountValidationSchema = z.infer<
  typeof updateBusinessAccountValidationSchema
>;
