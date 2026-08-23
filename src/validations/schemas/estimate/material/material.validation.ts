import { z } from "zod";
import { estimateTagsValidationSchema } from "../tags/tags.validation";

// create material zod validation schema
export const materialCreateValidationSchema = z.object({
  name: z
    .string({ invalid_type_error: "Material name must be a string" })
    .nonempty("Material name is required"),
  categoryId: z
    .number({ invalid_type_error: "Category ID must be a number" })
    .nonnegative({ message: "Category ID must be positive" })
    .nullable()
    .optional(),
  vendorId: z
    .number({ invalid_type_error: "Vendor ID must be a number" })
    .nonnegative({ message: "Vendor ID must be positive" })
    .nullable()
    .optional(),
  notes: z
    .string({ invalid_type_error: "Notes must be a string" })
    .max(500, { message: "Notes must be at most 500 characters" })
    .nullable()
    .optional(),
  tags: z.array(estimateTagsValidationSchema).nullable().optional(),
  cost: z
    .number({ invalid_type_error: "Cost must be a number" })
    .nonnegative({ message: "Cost must be a positive value" })
    .max(99999999, { message: "Cost must be less than 100,000,000" })
    .optional()
    .default(0),
  quantity: z
    .number()
    .refine(
      (val) => {
        const num = Number(val);
        return !isNaN(num) && num >= 0;
      },
      {
        message: "Material Quantity must be a positive number",
      },
    )
    .optional()
    .default(1),
  sell: z
    .number({ invalid_type_error: "Sell price must be a number" })
    .nonnegative({ message: "Sell price must be a positive value" })
    .min(1, { message: "You must put a sell price" })
    .max(99999999, { message: "Sell price must be less than 100,000,000" }),
  discount: z
    .number({ invalid_type_error: "Discount must be a number" })
    .nonnegative({ message: "Discount must be a positive value" })
    .max(99999999, { message: "Discount must be less than 100,000,000" })
    .optional()
    .default(0),
  addToInventory: z.boolean().optional().default(false),
});

// updated material zod validation schema
export const updateMaterialValidationSchema = z.object({
  id: z
    .number({ invalid_type_error: "Material ID must be a number" })
    .nonnegative({ message: "Material ID must be positive" }),
  name: z
    .string({ invalid_type_error: "Material name must be a string" })
    .nonempty("Material name is required"),
  categoryId: z
    .number({ invalid_type_error: "Category ID must be a number" })
    .nonnegative({ message: "Category ID must be positive" })
    .nullable()
    .optional(),
  vendorId: z
    .number({ invalid_type_error: "Vendor ID must be a number" })
    .nonnegative({ message: "Vendor ID must be positive" })
    .nullable()
    .optional(),
  notes: z
    .string({ invalid_type_error: "Notes must be a string" })
    .max(500, { message: "Notes must be at most 500 characters" })
    .nullable()
    .optional(),
  tags: z.array(estimateTagsValidationSchema).nullable().optional(),
  cost: z
    .number({ invalid_type_error: "Cost must be a number" })
    .nonnegative({ message: "Cost must be a positive value" })
    .max(99999999, { message: "Cost must be less than 100,000,000" })
    .optional()
    .default(0),
  quantity: z
    .string()
    .refine(
      (val) => {
        const num = Number(val);
        return !isNaN(num) && num >= 0;
      },
      {
        message: "Material Quantity must be a positive number",
      },
    )
    .optional()
    .default("1"),
  sell: z
    .number({ invalid_type_error: "Sell price must be a number" })
    .nonnegative({ message: "Sell price must be a positive value" })
    .min(1, { message: "You must put a sell price" })
    .max(99999999, { message: "Sell price must be less than 100,000,000" }),
  discount: z
    .number({ invalid_type_error: "Discount must be a number" })
    .nonnegative({ message: "Discount must be a positive value" })
    .max(99999999, { message: "Discount must be less than 100,000,000" })
    .optional()
    .default(0),
});
