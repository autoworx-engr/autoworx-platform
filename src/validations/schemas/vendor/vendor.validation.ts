import { optionalEmailValidationSchema } from "@/validations/utils/email.validation";
import { phoneValidationSchema } from "@/validations/utils/phone.validation";
import { z } from "zod";

export const createVendorValidationSchema = z.object({
  name: z.string().optional(),
  website: z.string().optional(),
  email: optionalEmailValidationSchema,
  phone: phoneValidationSchema.optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  companyName: z.string().nonempty("Company name is required"),
  notes: z.string().optional(),
});
