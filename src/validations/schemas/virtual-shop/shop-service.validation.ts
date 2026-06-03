import { z } from "zod";
import { serviceModelDataValidationSchema } from "../estimate/service/service.model.validation";
import { materialModelSchemaValidation } from "../estimate/material/material.model.validation";
import { laborCreateValidationSchema } from "../estimate/labor/labor.validation";
import { tagModelValidationSchema } from "../estimate/tags/tags.model.validation";

// Shared item schema for both create and update
const itemValidationSchema = z
  .object({
    id: z
      .number({
        invalid_type_error: "Item ID must be a number",
      })
      .optional(),
    service: serviceModelDataValidationSchema.nullable(),
    materials: z
      .array(
        z
          .intersection(
            materialModelSchemaValidation,
            z.object({
              tags: z.array(tagModelValidationSchema.optional()).optional(),
            }),
          )
          .nullable()
          .optional(),
        {
          invalid_type_error: "Materials must be an array",
        },
      )
      .nullable()
      .optional(),
    labor: laborCreateValidationSchema.optional().nullable(),
    tags: z.array(tagModelValidationSchema.optional(), {
      invalid_type_error: "Tags must be an array",
    }),
  })
  .refine(
    (data) => {
      const hasLabor = !!data.labor;
      const hasMaterials =
        Array.isArray(data.materials) && data.materials.length > 0;
      return hasLabor || hasMaterials;
    },
    {
      message: "Each service item must have either labor or materials",
    },
  );

// Base shop service schema with common fields
const baseShopServiceSchema = z.object({
  shopId: z
    .number({
      required_error: "Shop ID is required",
      invalid_type_error: "Shop ID must be a number",
    })
    .min(1, "Shop ID is required"),
  title: z
    .string({
      required_error: "Title is required",
      invalid_type_error: "Title must be a string",
    })
    .min(1, "Title is required"),
  shortDescription: z
    .string({
      required_error: "Short description is required",
      invalid_type_error: "Short description must be a string",
    })
    .min(1, "Short description is required")
    .max(500, "Short description must be 500 characters or less"),
  description: z
    .string({ invalid_type_error: "Description must be a string" })
    .optional(),
  items: z
    .array(itemValidationSchema, {
      invalid_type_error: "Items must be an array",
      required_error: "Items are required",
    })
    .min(1, "At least one service item is required"),
  imageUrl: z
    .string({ invalid_type_error: "Image URL must be a string" })
    .optional(),
  modifierCoupe: z
    .union([z.string(), z.number()], {
      invalid_type_error: "Modifier for Coupe must be a string or number",
    })
    .refine(
      (val) => {
        if (val === null || val === undefined) return true;
        const numVal = Number(val);
        return !isNaN(numVal) && numVal >= 0;
      },
      {
        message: "Modifier for Coupe must be a non-negative number",
      },
    )
    .optional(),
  modifierSedan: z
    .union([z.string(), z.number()], {
      invalid_type_error: "Modifier for Sedan must be a string or number",
    })
    .refine(
      (val) => {
        if (val === null || val === undefined) return true;
        const numVal = Number(val);
        return !isNaN(numVal) && numVal >= 0;
      },
      {
        message: "Modifier for Sedan must be a non-negative number",
      },
    )
    .optional(),
  modifierSUV: z
    .union([z.string(), z.number()], {
      invalid_type_error: "Modifier for SUV must be a string or number",
    })
    .refine(
      (val) => {
        if (val === null || val === undefined) return true;
        const numVal = Number(val);
        return !isNaN(numVal) && numVal >= 0;
      },
      {
        message: "Modifier for SUV must be a non-negative number",
      },
    )
    .optional(),
  modifierTruck: z
    .union([z.string(), z.number()], {
      invalid_type_error: "Modifier for Truck must be a string or number",
    })
    .refine(
      (val) => {
        if (val === null || val === undefined) return true;
        const numVal = Number(val);
        return !isNaN(numVal) && numVal >= 0;
      },
      {
        message: "Modifier for Truck must be a non-negative number",
      },
    )
    .optional(),
  isActive: z
    .boolean({ invalid_type_error: "Active status must be a boolean value" })
    .optional(),
  customDuration: z
    .union([z.string(), z.number()], {
      invalid_type_error: "Custom duration must be a string or number",
    })
    .refine(
      (val) => {
        if (val === null || val === undefined) return true;
        const numVal = Number(val);
        return !isNaN(numVal) && numVal >= 0;
      },
      {
        message: "Custom duration must be a non-negative number",
      },
    )
    .optional(),
  category: z
    .union([z.string(), z.array(z.string())], {
      invalid_type_error: "Category must be a string or an array of strings",
    })
    .optional(),
});

export const createShopServiceSchema = baseShopServiceSchema;

export const updateShopServiceSchema = baseShopServiceSchema.extend({
  id: z.number({
    required_error: "Shop Service ID is required",
    invalid_type_error: "Shop Service ID must be a number",
  }),
});

export type TCreateShopServiceRequest = z.infer<typeof createShopServiceSchema>;
export type TUpdateShopServiceRequest = z.infer<typeof updateShopServiceSchema>;
