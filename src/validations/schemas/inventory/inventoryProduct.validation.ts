import { InventoryProductType } from "@prisma/client";
import { z } from "zod";

// export const UNITS = [
//   "",
//   "piece",
//   "kg",
//   "lb",
//   "oz",
//   "g",
//   "l",
//   "ml",
//   "box",
//   "pack",
//   "ft",
//   "feet",
// ] as const;

// create product validation schema for inventory products
export const createProductValidationSchema = z
  .object({
    name: z
      .string({
        required_error: "Product name is required",
        invalid_type_error: "Product name must be a string",
      })
      .trim()
      .min(3, "Product name must be at least 3 characters")
      .max(100, "Product name cannot exceed 100 characters"),

    description: z
      .string()
      .trim()
      .max(1000, "Description cannot exceed 1000 characters")
      .optional()
      .nullish(),

    price: z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined || val === "0") {
          return 0; // Return as a number, not a string
        }
        return val;
      },
      z.coerce
        .number({
          required_error: "Price is required",
          invalid_type_error: "Price must be a number",
        })
        .nonnegative("Price must be non-negative")
        .finite("Price must be finite"),
    ),

    categoryId: z
      .number()
      .int("Category ID must be an integer")
      .positive("Category ID must be positive")
      .optional()
      .nullish(),

    categoryName: z.any().optional(),

    vendorId: z
      .number()
      .int("Vendor ID must be an integer")
      .positive("Vendor ID must be positive")
      .optional()
      .nullish(),
    quantity: z
      .string()
      .max(7, "Quantity must be less than 8 characters")
      .refine(
        (val) => {
          const num = Number(val);
          return !isNaN(num) && num >= 0;
        },
        {
          message: "Material Quantity must be a positive number",
        },
      ),
    unit: z
      .string({
        invalid_type_error: "Unit must be a string",
        required_error: "Unit is required",
      })
      .max(5, "Unit must be less than 5 characters")
      .optional()
      .nullish(),

    lot: z
      .string()
      .trim()
      .max(50, "Lot number cannot exceed 50 characters")
      .optional()
      .nullish(),

    type: z.enum([InventoryProductType.Product, InventoryProductType.Supply], {
      required_error: "Product type is required",
      invalid_type_error: "Invalid product type",
    }),

    isDatabase: z.boolean().optional().nullish(),

    receipt: z
      .string()
      .trim()
      //   .url("Receipt must be a valid URL")
      .optional()
      .nullish(),

    lowInventoryAlert: z
      .number()
      .int("Low inventory alert must be an integer")
      .nonnegative("Low inventory alert must be non-negative")
      .refine((num) => num <= 10000, "Alert threshold too high")
      .optional()
      .nullish(),
  })
  .refine(
    (data) => {
      const quantity = Number(data.quantity);
      if (!isNaN(quantity) && quantity < (data.lowInventoryAlert ?? 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Low inventory alert must be less than current quantity",
      path: ["lowInventoryAlert"],
    },
  );

// update product validation schema for inventory products
export const updateProductValidationSchema = z
  .object({
    id: z
      .number()
      .int("Product ID must be an integer")
      .positive("Product ID must be positive"),
    name: z
      .string({
        required_error: "Product name is required",
        invalid_type_error: "Product name must be a string",
      })
      .trim()
      .min(3, "Product name must be at least 3 characters")
      .max(100, "Product name cannot exceed 100 characters"),

    description: z
      .string()
      .trim()
      .max(250, "Description cannot exceed 250 characters")
      .optional()
      .nullish(),

    price: z
      .number({
        required_error: "Price is required",
        invalid_type_error: "Price must be a number",
      })
      .nonnegative("Price must be non-negative")
      .finite("Price must be finite")
      .optional()
      .nullable(),

    categoryId: z
      .number()
      .int("Category ID must be an integer")
      .positive("Category ID must be positive")
      .optional()
      .nullish(),

    vendorId: z
      .number()
      .int("Vendor ID must be an integer")
      .positive("Vendor ID must be positive")
      .optional()
      .nullish(),

    quantity: z
      .string()
      .max(7, "Quantity must be less than 8 characters")
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
      .nullable(),
    unit: z
      .string({
        invalid_type_error: "Unit must be a string",
        required_error: "Unit is required",
      })
      .max(5, "Unit must be less than 5 characters")
      .optional()
      .nullish(),

    lot: z
      .string()
      .trim()
      .max(50, "Lot number cannot exceed 50 characters")
      .optional()
      .nullish(),

    type: z.enum([InventoryProductType.Product, InventoryProductType.Supply], {
      required_error: "Product type is required",
      invalid_type_error: "Invalid product type",
    }),

    receipt: z
      .string()
      .trim()
      //   .url("Receipt must be a valid URL")
      .optional()
      .nullish(),

    lowInventoryAlert: z
      .number()
      .int("Low inventory alert must be an integer")
      .nonnegative("Low inventory alert must be non-negative")
      .refine((num) => num <= 10000, "Alert threshold too high")
      .optional()
      .nullish(),
  })
  .refine(
    (data) => {
      const quantity = Number(data.quantity);
      if (!isNaN(quantity) && quantity < (data.lowInventoryAlert ?? 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Low inventory alert must be less than current quantity",
      path: ["lowInventoryAlert"],
    },
  );

export type TCreateProductValidation = z.infer<
  typeof createProductValidationSchema
>;

export type TUpdateProductValidation = z.infer<
  typeof updateProductValidationSchema
>;
