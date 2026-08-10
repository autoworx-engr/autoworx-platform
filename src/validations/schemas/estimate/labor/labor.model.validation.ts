import { z } from "zod";

export const laborModelSchemaValidation = z
  .object({
    id: z
      .number({ required_error: "labor id must be required" })
      .int()
      .positive()
      .optional(),
    name: z.string().min(1),
    categoryId: z.number().int().positive().nullable().optional(),
    notes: z.string().nullable(),
    hours: z
      .number({ invalid_type_error: "labor hours must be number type" })
      .nonnegative("Charge must be a positive number")
      .optional()
      .nullable(),
    charge: z
      .number({ invalid_type_error: "labor change must be number type" })
      .nonnegative("Charge must be a positive number")
      .optional()
      .nullable(),
    discount: z
      .number({ invalid_type_error: "discount hours must be number type" })
      .nonnegative("Discount must be a positive number")
      .optional()
      .nullable(),
    companyId: z
      .number({ required_error: "company id must be required" })
      .int()
      .positive()
      .optional()
      .nullable(),
    cannedLabor: z.boolean().nullable().default(false),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date()),
  })
  .refine(
    (data) => {
      // Ensure updatedAt is not before createdAt
      return data.updatedAt >= data.createdAt;
    },
    {
      message: "updatedAt cannot be before createdAt",
      path: ["updatedAt"],
    },
  )
  .refine(
    (data) => {
      // If discount exists, it should not exceed the charge
      if (data.discount && data.charge) {
        return data.discount <= data.charge;
      }
      return true;
    },
    {
      message: "Discount cannot exceed charge amount",
      path: ["discount"],
    },
  )
  .refine(
    (data) => {
      // Hours should be limited to 3 decimal places to match DB schema
      if (data.hours) {
        const decimalPlaces = (data.hours.toString().split(".")[1] || "")
          .length;
        return decimalPlaces <= 3;
      }
      return true;
    },
    {
      message: "Hours cannot have more than 3 decimal places",
      path: ["hours"],
    },
  );
