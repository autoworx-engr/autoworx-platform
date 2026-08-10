import { z } from "zod";

export const zipValidationSchema = z
  .string()
  .trim()
  .refine((val) => {
    return true;
    // if (!val) return true;
    // const zipRegex = /^\d{5}(-\d{4})?$/;
    // return zipRegex.test(val);
  }, "Invalid ZIP code format");
