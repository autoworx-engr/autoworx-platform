import { z } from "zod";

// create coupon validation schema
export const createCouponValidationSchema = z
  .object({
    couponName: z
      .string()
      .min(1, "Coupon name is required.")
      .max(100, "Coupon name cannot exceed 100 characters."),
    couponCode: z
      .string()
      .min(1, "Coupon code is required.")
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Coupon code must be alphanumeric and may include dashes or underscores.",
      ),
    discountType: z
      .string()
      .refine((val) => ["Fixed", "Percentage"].includes(val), {
        message: "Discount type must be either 'percentage' or 'flat'.",
      }),
    discountValue: z
      .number()
      .positive("Discount value must be a positive number.")
      .refine((val) => val > 0, {
        message: "Discount value must be greater than 0.",
      }),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Start date must be a valid date.",
    }),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "End date must be a valid date.",
    }),
    couponType: z.string(),
    //   .refine((val) => ["single-use", "multi-use"].includes(val), {
    //     message: "Coupon type must be either 'single-use' or 'multi-use'.",
    //   }),
  })
  .refine((val) => {
    const { startDate, endDate } = val;
    if (new Date(endDate) >= new Date(startDate)) {
      return true;
    }
  }, "End date must be later than start date.");

// update coupon validation schema
export const updateCouponValidationSchema = z
  .object({
    id: z
      .number({
        required_error: "id must be required",
        invalid_type_error: "id must be a number",
      })
      .int("id must be integer")
      .nonnegative(),
    couponName: z
      .string()
      .min(1, "Coupon name is required.")
      .max(100, "Coupon name cannot exceed 100 characters."),
    couponCode: z
      .string()
      .min(1, "Coupon code is required.")
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Coupon code must be alphanumeric and may include dashes or underscores.",
      ),
    discountType: z
      .string()
      .refine((val) => ["Fixed", "Percentage"].includes(val), {
        message: "Discount type must be either 'percentage' or 'flat'.",
      }),
    discountValue: z
      .number()
      .positive("Discount value must be a positive number.")
      .refine((val) => val > 0, {
        message: "Discount value must be greater than 0.",
      }),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Start date must be a valid date.",
    }),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "End date must be a valid date.",
    }),
    couponType: z.string(),
    //   .refine((val) => ["single-use", "multi-use"].includes(val), {
    //     message: "Coupon type must be either 'single-use' or 'multi-use'.",
    //   }),
  })
  .refine((val) => {
    const { startDate, endDate } = val;
    if (new Date(endDate) >= new Date(startDate)) {
      return true;
    }
  }, "End date must be later than start date.");

export type TCreateCouponValidationSchema = z.infer<
  typeof createCouponValidationSchema
>;

export type TUpdateValidationSchema = z.infer<
  typeof updateCouponValidationSchema
>;
