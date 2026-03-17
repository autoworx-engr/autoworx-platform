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
  shopId: z.string().min(1, "Shop ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  items: z.array(createItemValidationSchema).optional().default([]),
  imageUrl: z.string().optional(),
  modifierCoupe: z.union([z.string(), z.number()]).optional(),
  modifierSedan: z.union([z.string(), z.number()]).optional(),
  modifierSUV: z.union([z.string(), z.number()]).optional(),
  modifierTruck: z.union([z.string(), z.number()]).optional(),
  isActive: z.boolean().optional(),
});

export const updateShopServiceSchema = z.object({
  id: z.number({ required_error: "Shop Service ID is required" }),
  shopId: z.string().min(1, "Shop ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  items: z.array(updateItemValidationSchema).optional().default([]),
  imageUrl: z.string().optional(),
  modifierCoupe: z.union([z.string(), z.number()]).optional(),
  modifierSedan: z.union([z.string(), z.number()]).optional(),
  modifierSUV: z.union([z.string(), z.number()]).optional(),
  modifierTruck: z.union([z.string(), z.number()]).optional(),
  isActive: z.boolean().optional(),
});

export type TCreateShopServiceRequest = z.infer<typeof createShopServiceSchema>;
export type TUpdateShopServiceRequest = z.infer<typeof updateShopServiceSchema>;
