import { z } from "zod";

export const materialModelSchemaValidation = z
  .object({
    id: z
      .number({ message: "material Id must be required" })
      .int()
      .positive()
      .optional(),
    name: z
      .string({
        required_error: "Name is required",
        invalid_type_error: "Name must be a string",
      })
      .nullable()
      .optional(),
    vendorId: z.number().int().positive().nullable().optional(),
    categoryId: z.number().int().positive().nullable().optional(),
    notes: z.string().nullable().optional(),
    quantity: z
      .number()
      .max(99999999, "Material Quantity must be less than 100,000,000")
      .refine(
        (val) => {
          return !isNaN(val) && val >= 0;
        },
        {
          message: "Material Quantity must be a positive number",
        },
      )
      .optional(),
    cost: z
      .number({ invalid_type_error: "Cost must be a valid number" })
      .nonnegative("Material cost must be a positive value")
      .max(99999999, "Material Cost must be less than 100,000,000")
      .optional()
      .default(0), // For Decimal
    sell: z
      .number({ invalid_type_error: "Sell price must be a valid number" })
      .nonnegative("Material sell price must be a positive value")
      .max(99999999, "Sell price must be less than 100,000,000")
      .optional()
      .default(0), // For Decimal
    discount: z
      .number({ invalid_type_error: "Discount must be a valid number" })
      .max(99999999, "Discount must be less than 100,000,000")
      .optional()
      .default(0), // For Decimal
    companyId: z
      .number({ message: "company Id must be required" })
      .int()
      .positive()
      .optional(),
    invoiceId: z.string().nullable().nullable().optional(),
    invoiceItemId: z.number().int().positive().nullable().optional(),
    productId: z.number().int().positive().nullable().optional(),
    createdAt: z.coerce
      .date()
      .default(() => new Date())
      .optional(),
    updatedAt: z.coerce
      .date()
      .default(() => new Date())
      .optional(),
  })
  // .refine(
  //   (data) => {
  //     // If sell price exists, it should be greater than or equal to cost (if cost exists)
  //     if (data.sell !== null && data.cost !== null) {
  //       return data.sell >= data.cost;
  //     }
  //     return true;
  //   },
  //   {
  //     message: "Material Sell price must be greater than or equal to cost",
  //     path: ["sell"],
  //   },
  // )
  // .refine(
  //   (data) => {
  //     // If discount exists, it should not exceed the sell price
  //     if (data.discount !== null && data.sell !== null) {
  //       return data.discount <= data.sell;
  //     }
  //     return true;
  //   },
  //   {
  //     message: "Discount cannot exceed sell price",
  //     path: ["discount"],
  //   },
  // )
  .refine(
    (data) => {
      if (data.quantity) {
        const num = Number(data.quantity);
        return !isNaN(num) && num >= 0;
      }
      return true; // quantity is optional
    },
    {
      message: "Quantity must be zero or positive",
      path: ["quantity"],
    },
  );

export type TMaterialModelSchemaValidation = z.infer<
  typeof materialModelSchemaValidation
>;
