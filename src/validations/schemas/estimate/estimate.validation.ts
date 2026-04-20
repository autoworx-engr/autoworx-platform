import { InvoiceType } from "@prisma/client";
import { z } from "zod";
import { serviceModelDataValidationSchema } from "./service/service.model.validation";
import { materialModelSchemaValidation } from "./material/material.model.validation";
import { tagModelValidationSchema } from "./tags/tags.model.validation";
import { couponModelValidationSchema } from "./coupon/coupon.model.validation";
import { laborCreateValidationSchema } from "./labor/labor.validation";

// Assuming these are type imports that need to be converted to Zod schemas
const InvoiceTypeEnum = z.enum(["Estimate", "Invoice"] as [
  string,
  ...InvoiceType[],
]);

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

export const estimateCreateValidationSchema = z
  .object({
    invoiceId: z
      .string({ invalid_type_error: "Invoice ID must be a string" })
      .nonempty("generate Invoice Id must be required"),
    type: InvoiceTypeEnum,

    clientId: z
      .number({ invalid_type_error: "Client ID must be a number" })
      .optional(),
    vehicleId: z
      .number({ invalid_type_error: "Vehicle ID must be a number" })
      .optional(),

    subtotal: z
      .number({ invalid_type_error: "Subtotal must be a number" })
      .nonnegative(),
    discount: z
      .number({ invalid_type_error: "Discount must be a number" })
      .nonnegative(),
    vehicleExtraCost: z
      .number({ invalid_type_error: "vehicleExtraCost must be a number" })
      .nonnegative()
      .optional()
      .default(0),
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
    due: z.number({ invalid_type_error: "Due must be a number" }),

    internalNotes: z.string({
      invalid_type_error: "Internal notes must be a string",
    }),
    terms: z.string({ invalid_type_error: "Terms must be a string" }),
    policy: z.string({ invalid_type_error: "Policy must be a string" }),
    customerNotes: z.string({
      invalid_type_error: "Customer notes must be a string",
    }),
    customerComments: z.string({
      invalid_type_error: "Customer comments must be a string",
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

    coupon: couponModelValidationSchema.nullable().optional(),
    columnId: z
      .number({ invalid_type_error: "Column ID must be a number" })
      .optional(),

    inspections: z.array(inspectionValidationSchema),
    damageNotes: z.string({
      invalid_type_error: "Damage notes must be a string",
    }),
    isShopBooking: z
      .boolean({ invalid_type_error: "isShopBooking must be a boolean" })
      .optional()
      .default(false),
  })
  .refine(
    (data) => {
      // Validate that grandTotal is correctly calculated
      // const calculatedTotal =
      //   data.subtotal - data.discount + data.tax - data.deposit;
      // return Math.abs(data.grandTotal - calculatedTotal) < 0.01; // Allow for small floating point differences

      // TODO: Fix this validation
      return true;
    },
    {
      message: "Grand total must equal subtotal - discount + tax - deposit",
      path: ["grandTotal"],
    },
  )
  .refine(
    (data) => {
      // Validate that due amount is less than or equal to grand total
      return data.due <= data.grandTotal;
    },
    {
      message: "Due amount cannot exceed grand total",
      path: ["due"],
    },
  );

export const estimateEditValidationSchema = z
  .object({
    id: z.string({ invalid_type_error: "ID must be a string" }),

    clientId: z
      .number({ invalid_type_error: "Client ID must be a number" })
      .nonnegative("Column ID must be a positive number or undefined.")
      .optional()
      .nullable(),

    vehicleId: z
      .number({ invalid_type_error: "Vehicle ID must be a number" })
      .nonnegative("Column ID must be a positive number or undefined.")
      .optional()
      .nullable(),

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
    vehicleExtraCost: z
      .number({ invalid_type_error: "vehicleExtraCost must be a number" })
      .nonnegative()
      .optional()
      .default(0),
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
    due: z
      .number({ invalid_type_error: "Due must be a number" })
      .nonnegative("due must be positive value"),

    internalNotes: z
      .string({ invalid_type_error: "Internal notes must be a string" })
      .max(1000, "Internal notes must not exceed 1000 characters.")
      .optional(),
    terms: z
      .string({ invalid_type_error: "Terms must be a string" })
      .max(1000, "Terms must not exceed 1000 characters.")
      .optional(),
    policy: z
      .string({ invalid_type_error: "Policy must be a string" })
      .max(1000, "Policy must not exceed 1000 characters.")
      .optional(),
    customerNotes: z
      .string({ invalid_type_error: "Customer notes must be a string" })
      .max(1000, "Customer notes must not exceed 1000 characters.")
      .optional(),
    customerComments: z
      .string({ invalid_type_error: "Customer comments must be a string" })
      .max(1000, "Customer comments must not exceed 1000 characters.")
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

    type: InvoiceTypeEnum,
  })
  // TODO
  // .refine(
  //   (data) => {
  //     // Validate that grandTotal is correctly calculated
  //     const calculatedTotal =
  //       data.subtotal - data.discount + data.tax - data.deposit;
  //     return Math.abs(data.grandTotal - calculatedTotal) < 0.01; // Allow for small floating point differences
  //   },
  //   {
  //     message: "Grand total must equal subtotal - discount + tax - deposit",
  //     path: ["grandTotal"],
  //   },
  // )
  .refine(
    (data) => {
      // Validate that due amount is less than or equal to grand total
      return data.due <= data.grandTotal;
    },
    {
      message: "Due amount cannot exceed grand total",
      path: ["due"],
    },
  );

export type TEstimateCreateValidationSchema = z.infer<
  typeof estimateCreateValidationSchema
>;

export type TEstimateEditValidationSchema = z.infer<
  typeof estimateEditValidationSchema
>;
