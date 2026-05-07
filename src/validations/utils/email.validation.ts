import { z } from "zod";

export const requiredEmailValidationSchema = z
  .string()
  .trim()
  .min(1, { message: "Email is required" })
  .email({ message: "Invalid email" });
