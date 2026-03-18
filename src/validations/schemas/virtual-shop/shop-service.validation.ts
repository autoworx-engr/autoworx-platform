import { z } from "zod";
import { serviceModelDataValidationSchema } from "../estimate/service/service.model.validation";
import { materialModelSchemaValidation } from "../estimate/material/material.model.validation";
import { laborCreateValidationSchema } from "../estimate/labor/labor.validation";
import { tagModelValidationSchema } from "../estimate/tags/tags.model.validation";

const createItemValidationSchema = z.object({
  id: z.number().optional(),
  service: serviceModelDataValidationSchema.nullable(),
  materials: z
    .array(materialModelSchemaValidation.nullable().optional())
    .nullable()
    .optional(),
  labor: laborCreateValidationSchema.optional().nullable(),
  tags: z.array(tagModelValidationSchema.optional()),
});

const updateItemValidationSchema = z.object({
  id: z.number().optional(),
  service: serviceModelDataValidationSchema.nullable(),
  materials: z
    .array(materialModelSchemaValidation.nullable().optional())
    .nullable()
    .optional(),
  labor: laborCreateValidationSchema.nullable().optional(),
  tags: z.array(tagModelValidationSchema.optional()),
});

export const createShopServiceSchema = z.object({
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
  description: z
    .string({ invalid_type_error: "Description must be a string" })
    .optional(),
  items: z
    .array(createItemValidationSchema, {
      invalid_type_error: "Items must be an array",
    })
    .optional()
    .default([]),
  imageUrl: z
    .string({ invalid_type_error: "Image URL must be a string" })
    .optional(),
  modifierCoupe: z.union([z.string(), z.number()]).optional(),
  modifierSedan: z.union([z.string(), z.number()]).optional(),
  modifierSUV: z.union([z.string(), z.number()]).optional(),
  modifierTruck: z.union([z.string(), z.number()]).optional(),
  isActive: z
    .boolean({ invalid_type_error: "Active status must be a boolean value" })
    .optional(),
});

export const updateShopServiceSchema = z.object({
  id: z.number({
    required_error: "Shop Service ID is required",
    invalid_type_error: "Shop Service ID must be a number",
  }),
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
  description: z
    .string({ invalid_type_error: "Description must be a string" })
    .optional(),
  items: z
    .array(updateItemValidationSchema, {
      invalid_type_error: "Items must be an array",
    })
    .optional()
    .default([]),
  imageUrl: z
    .string({ invalid_type_error: "Image URL must be a string" })
    .optional(),
  modifierCoupe: z.union([z.string(), z.number()]).optional(),
  modifierSedan: z.union([z.string(), z.number()]).optional(),
  modifierSUV: z.union([z.string(), z.number()]).optional(),
  modifierTruck: z.union([z.string(), z.number()]).optional(),
  isActive: z
    .boolean({ invalid_type_error: "Active status must be a boolean value" })
    .optional(),
});

export type TCreateShopServiceRequest = z.infer<typeof createShopServiceSchema>;
export type TUpdateShopServiceRequest = z.infer<typeof updateShopServiceSchema>;
