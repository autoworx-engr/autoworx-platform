import {
  optionalEmailValidationSchema,
  requiredEmailValidationSchema,
} from "@/validations/utils/email.validation";
import { phoneValidationSchema } from "@/validations/utils/phone.validation";
import { z } from "zod";

// Reusable postal code validation schema
export const PostalCodeSchema = z.string().trim();
// .regex(
//   /^\d{5}(-\d{4})?$/,
//   "Invalid ZIP code format (must be 12345 or 12345-6789)",
// );

// create a fleet validation schema
export const createFleetValidationSchema = z
  .object({
    fleetName: z
      .string({
        required_error: "Fleet name is required",
        invalid_type_error: "Fleet name must be a string",
      })
      .trim()
      .min(1, "Fleet name is required")
      .max(50, "Fleet name cannot exceed 50 characters"),
    // .regex(
    //   /^[A-Za-z\s-']+$/,
    //   "Fleet name can only contain letters, spaces, hyphens, and apostrophes",
    // ),

    contactName: z
      .string({
        invalid_type_error: "Contact name must be a string",
      })
      .trim()
      .max(50, "Contact name cannot exceed 50 characters")
      // .regex(
      //   /^[A-Za-z\s-']+$/,
      //   "Contact name can only contain letters, spaces, hyphens, and apostrophes",
      // )
      .optional()
      .nullish(),

    email: optionalEmailValidationSchema,

    mobile: phoneValidationSchema.optional().nullish(),

    address: z
      .string()
      .trim()
      .max(200, "Address cannot exceed 200 characters")
      .optional()
      .nullish(),

    city: z
      .string()
      .trim()
      .max(100, "City name cannot exceed 100 characters")
      // .regex(
      //   /^[A-Za-z\s-']+$/,
      //   "City can only contain letters, spaces, hyphens, and apostrophes",
      // )
      .optional()
      .nullish(),

    state: z
      .string()
      .trim()
      // .length(2, "State must be a 2-letter code")
      // .regex(/^[A-Z]{2}$/, "State must be a valid 2-letter state code")
      .optional()
      .nullish(),

    zip: PostalCodeSchema.optional().nullish(),

    preferredPaymentTerm: z
      .string()
      .trim()
      .max(100, "Company name cannot exceed 100 characters")
      .optional()
      .nullish(),

    // sourceId: z
    //   .number()
    //   .int("Source ID must be an integer")
    //   .nonnegative("Source ID must be non-negative")
    //   .optional()
    //   .nullish(),

    tagId: z
      .number()
      .int("Tag ID must be an integer")
      .nonnegative("Tag ID must be non-negative")
      .optional()
      .nullish(),

    photo: z
      .string()
      .trim()
      .url("Photo must be a valid URL")
      .optional()
      .nullish(),
  })
  .refine(
    (data) => {
      // If any address field is filled, require city and state
      if (data.address && (!data.city || !data.state)) {
        return false;
      }
      return true;
    },
    {
      message: "City and state are required when address is provided",
      path: ["address"],
    },
  );

// update a fleet validation schema
export const updateFleetValidationSchema = z
  .object({
    id: z.number().int("Fleet ID must be an integer").nonnegative(),
    clientId: z.number().int("Client ID must be an integer").nonnegative(),
    fleetName: z
      .string({
        required_error: "Fleet name is required",
        invalid_type_error: "Fleet name must be a string",
      })
      .trim()
      .min(1, "Fleet name is required")
      .max(50, "Fleet name cannot exceed 50 characters"),
    // .regex(
    //   /^[A-Za-z\s-']+$/,
    //   "Fleet name can only contain letters, spaces, hyphens, and apostrophes",
    // ),

    contactName: z
      .string({
        invalid_type_error: "Contact name must be a string",
      })
      .trim()
      .max(50, "Contact name cannot exceed 50 characters")
      // .regex(
      //   /^[A-Za-z\s-']+$/,
      //   "ContactLast name can only contain letters, spaces, hyphens, and apostrophes",
      // )
      .optional()
      .nullish(),

    email: optionalEmailValidationSchema,

    mobile: phoneValidationSchema.optional().nullish(),

    address: z
      .string()
      .trim()
      .max(200, "Address cannot exceed 200 characters")
      .optional()
      .nullish(),

    city: z
      .string()
      .trim()
      .max(100, "City name cannot exceed 100 characters")
      // .regex(
      //   /^[A-Za-z\s-']+$/,
      //   "City can only contain letters, spaces, hyphens, and apostrophes",
      // )
      .optional()
      .nullish(),

    state: z
      .string()
      .trim()
      // .length(2, "State must be a 2-letter code")
      // .regex(/^[A-Z]{2}$/, "State must be a valid 2-letter state code")
      .optional()
      .nullish(),

    zip: PostalCodeSchema.optional().nullish(),

    preferredPaymentTerm: z
      .string()
      .trim()
      .max(100, "Company name cannot exceed 100 characters")
      .optional()
      .nullish(),

    // sourceId: z
    //   .number()
    //   .int("Source ID must be an integer")
    //   .nonnegative("Source ID must be non-negative")
    //   .optional()
    //   .nullish(),

    tagId: z
      .number()
      .int("Tag ID must be an integer")
      .nonnegative("Tag ID must be non-negative")
      .optional()
      .nullish(),

    photo: z
      .string()
      .trim()
      .url("Photo must be a valid URL")
      .optional()
      .nullish(),
  })
  .refine(
    (data) => {
      // If any address field is filled, require city and state
      if (data.address && (!data.city || !data.state)) {
        return false;
      }
      return true;
    },
    {
      message: "City and state are required when address is provided",
      path: ["address"],
    },
  );

// Type inference
export type TCreateFleetValidation = z.infer<
  typeof createFleetValidationSchema
>;
export type TUpdateFleetValidation = z.infer<
  typeof updateFleetValidationSchema
>;

// Helper function to transform phone numbers to E.164 format
export const formatPhoneToE164 = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
};

// Helper function to format names
export const formatName = (name: string): string => {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
};
