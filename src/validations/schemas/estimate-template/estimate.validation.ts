import { z } from "zod";
import { serviceModelDataValidationSchema } from "../estimate/service/service.model.validation";
import { materialModelSchemaValidation } from "../estimate/material/material.model.validation";
import { laborCreateValidationSchema } from "../estimate/labor/labor.validation";
import { tagModelValidationSchema } from "../estimate/tags/tags.model.validation";

const createItemValidationSchema = z.object({
  service: serviceModelDataValidationSchema.nullable(),
  materials: z
    .array(materialModelSchemaValidation.nullable().optional())
    .nullable()
    .optional(),
  labor: laborCreateValidationSchema.optional().nullable(),
  tags: z.array(tagModelValidationSchema.optional()),
});

const updateItemValidationSchema = z.object({
  service: serviceModelDataValidationSchema.nullable(),
  materials: z
    .array(materialModelSchemaValidation.nullable().optional())
    .nullable()
    .optional(),
  labor: laborCreateValidationSchema.nullable().optional(),
  tags: z.array(tagModelValidationSchema.optional()),
});
const inspectionValidationSchema = z.object({
  title: z.string({ invalid_type_error: "Title must be a string" }),
  driver: z.boolean({ invalid_type_error: "Driver must be a boolean" }),
  passenger: z.boolean({ invalid_type_error: "Passenger must be a boolean" }),
  notes: z.string({ invalid_type_error: "Notes must be a string" }).optional(),
});

export const estimateTemplateCreateValidationSchema = z
  .object({
    templateId: z
      .string({ invalid_type_error: "Template ID must be a string" })
      .nonempty("generate template Id must be required"),
    title: z
      .string({ invalid_type_error: "Template title must be a string" })
      .nonempty("Title is required!"),
    subtotal: z
      .number({ invalid_type_error: "Subtotal must be a number" })
      .nonnegative(),
    discount: z
      .number({ invalid_type_error: "Discount must be a number" })
      .nonnegative(),
    tax: z
      .number({ invalid_type_error: "Tax must be a number" })
      .nonnegative("Tax must be a non-negative number.")
      .default(0),
    serviceFee: z
      .number({ invalid_type_error: "Service fee must be a number" })
      .nonnegative("Service fee must be a non-negative number.")
      .default(0),
    grandTotal: z
      .number({ invalid_type_error: "Grand total must be a number" })
      .nonnegative(),
    internalNotes: z.string({
      invalid_type_error: "Internal notes must be a string",
    }),
    customerNotes: z.string({
      invalid_type_error: "Customer notes must be a string",
    }),
    damageNotes: z.string({
      invalid_type_error: "Damage notes must be a string",
    }),

    photos: z.array(
      z.object({
        id: z
          .number({ invalid_type_error: "Photo ID must be a number" })
          .optional(),
        photo: z
          .string({ invalid_type_error: "Photo URL must be a string" })
          .url()
          .optional(),
      }),
    ),

    items: z.array(createItemValidationSchema.optional()),

    tasks: z.array(
      z.object({
        id: z
          .number({ invalid_type_error: "Task ID must be a number" })
          .optional(),
        task: z.string({ invalid_type_error: "Task must be a string" }),
      }),
    ),
    columnId: z
      .number({ invalid_type_error: "Column ID must be a number" })
      .optional(),
    inspections: z.array(inspectionValidationSchema),
  })
  .refine(
    (data) => {
      return true;
    },
    {
      message: "Grand total must equal subtotal - discount + tax",
      path: ["grandTotal"],
    },
  );

export const estimateTemplateEditValidationSchema = z.object({
  id: z.string({ invalid_type_error: "ID must be a string" }),
  title: z
    .string({ invalid_type_error: "Template title must be a string" })
    .nonempty("Title is required!"),
  columnId: z
    .number({ invalid_type_error: "Column ID must be a number" })
    .nonnegative("Column ID must be a positive number or undefined.")
    .optional()
    .nullable(),
  subtotal: z
    .number({ invalid_type_error: "Subtotal must be a number" })
    .nonnegative("Subtotal must be a non-negative number."),
  discount: z
    .number({ invalid_type_error: "Discount must be a number" })
    .nonnegative("Discount must be a non-negative number."),
  tax: z
    .number({ invalid_type_error: "Tax must be a number" })
    .nonnegative("Tax must be a non-negative number.")
    .default(0),
  serviceFee: z
    .number({ invalid_type_error: "Service fee must be a number" })
    .nonnegative("Service fee must be a non-negative number.")
    .default(0),
  grandTotal: z
    .number({ invalid_type_error: "Grand total must be a number" })
    .nonnegative("Grand total must be a non-negative number."),

  internalNotes: z
    .string({ invalid_type_error: "Internal notes must be a string" })
    .max(1000, "Internal notes must not exceed 1000 characters.")
    .optional(),
  damageNotes: z
    .string({ invalid_type_error: "Damage notes must be a string" })
    .max(1000, "Internal notes must not exceed 1000 characters.")
    .optional(),
  customerNotes: z
    .string({ invalid_type_error: "Customer notes must be a string" })
    .max(1000, "Internal notes must not exceed 1000 characters.")
    .optional(),

  photos: z
    .array(
      z.object({
        id: z
          .number({ invalid_type_error: "Photo ID must be a number" })
          .optional(),
        photo: z
          .string({ invalid_type_error: "Photo URL must be a string" })
          .url()
          .optional(),
      }),
    )
    .optional(),

  items: z.array(updateItemValidationSchema),

  tasks: z
    .array(
      z.object({
        id: z
          .number({ invalid_type_error: "Task ID must be a number" })
          .optional()
          .nullable(),
        task: z
          .string({ invalid_type_error: "Task must be a string" })
          .min(1, "Task description is required."),
      }),
    )
    .optional(),
});

export type TEstimateCreateValidationSchema = z.infer<
  typeof estimateTemplateCreateValidationSchema
>;

export type TEstimateEditValidationSchema = z.infer<
  typeof estimateTemplateEditValidationSchema
>;
