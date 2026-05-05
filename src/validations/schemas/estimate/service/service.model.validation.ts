import { z } from "zod";
export const serviceModelDataValidationSchema = z
  .object({
    id: z.number().int().positive(),
    name: z
      .string({
        required_error: "Name is required",
        invalid_type_error: "Name must be a string",
      })
      .min(1, "Name is required"),
    categoryId: z
      .number({ invalid_type_error: "Category ID must be a number" })
      .int()
      .positive()
      .nullable()
      .optional(),
    description: z
      .string({ invalid_type_error: "Description must be a string" })
      .nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    fromRequest: z.boolean().nullable().optional(),
    fromRequestedCompanyId: z.number().int().positive().nullable().optional(),
    companyId: z.number().int().positive(),
  })
  .refine(
    (data) => {
      // If fromRequest is true, fromRequestedCompanyId should be non-null
      if (data.fromRequest === true) {
        return data.fromRequestedCompanyId !== null;
      }
      return true;
    },
    {
      message:
        "fromRequestedCompanyId must be provided when fromRequest is true",
      path: ["fromRequestedCompanyId"],
    },
  )
  .refine(
    (data) => {
      // Ensure updatedAt is not before createdAt
      return data.updatedAt >= data.createdAt;
    },
    {
      message: "updatedAt cannot be before createdAt",
      path: ["updatedAt"],
    },
  );
