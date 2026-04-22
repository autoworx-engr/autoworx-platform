import { requiredEmailValidationSchema } from "@/validations/utils/email.validation";
import { phoneValidationSchema } from "@/validations/utils/phone.validation";
import { zipValidationSchema } from "@/validations/utils/zip.validation";
import { z } from "zod";

export const createEmployeeValidationSchema = z.object({
  firstName: z
    .string({ invalid_type_error: "First name must be a string" })
    .trim()
    .min(1, { message: "FirstName cannot be empty" }),
  lastName: z
    .string({ invalid_type_error: "Last name must be a string" })
    .nullable(),
  email: requiredEmailValidationSchema,
  phone: phoneValidationSchema.optional(),
  password: z
    .string({ invalid_type_error: "Password must be a string" })
    .min(6, "Password length must be 6 character"),
  address: z
    .string({ invalid_type_error: "Address must be a string" })
    .trim()
    .nullable()
    .optional(),
  city: z
    .string({ invalid_type_error: "City must be a string" })
    .trim()
    .nullable()
    .optional(),
  state: z
    .string({ invalid_type_error: "State must be a string" })
    .trim()
    .nullable()
    .optional(),
  zip: zipValidationSchema.nullable().optional(),
  companyName: z
    .string({ invalid_type_error: "Company name must be a string" })
    .nullable()
    .optional(),
  commission: z
    .number({ invalid_type_error: "Commission must be a number" })
    .nonnegative()
    .default(0),
  employeeType: z.enum(["Admin", "Manager", "Sales", "Technician", "Other"], {
    invalid_type_error: "Employee type must be a string",
    required_error: "Employee type is required",
    message:
      "Employee type must be one of Admin, Manager, Sales, Technician, Other",
  }),
  joinDate: z.date({ invalid_type_error: "Join date must be a date" }),
  salaryType: z
    .enum(["HOURLY", "BI_WEEKLY", "WEEKLY", "MONTHLY"], {
      invalid_type_error: "Salary type must be a string",
      message: "Salary type must be one of HOURLY, BI_WEEKLY, WEEKLY, MONTHLY",
    })
    .nullable()
    .optional(),
  salaryAmount: z
    .number({ invalid_type_error: "Salary amount must be a number" })
    .nonnegative("Salary amount must be positive")
    .nullable()
    .optional(),
  salaryStartedAt: z
    .date({ invalid_type_error: "Salary start date must be a date" })
    .nullable()
    .optional(),
  image: z.string({ invalid_type_error: "Image must be a string" }).optional(),
});

export const updateEmployeeValidationSchema = z.object({
  id: z
    .number({ invalid_type_error: "ID must be a number" })
    .int("Id must be a Integer")
    .positive("Id must be a positive number"),
  firstName: z
    .string({ invalid_type_error: "First name must be a string" })
    .trim()
    .min(1, { message: "FirstName cannot be empty" }),
  lastName: z
    .string({ invalid_type_error: "Last name must be a string" })
    .nullable(),
  email: requiredEmailValidationSchema,
  mobileNumber: phoneValidationSchema.optional(),
  countryCode: z.string().optional(),
  address: z
    .string({ invalid_type_error: "Address must be a string" })
    .trim()
    .nullable()
    .optional(),
  changePassword: z
    .string({ invalid_type_error: "Password must be a string" })
    .trim()
    .min(6, "Password length must be 6 character")
    .nullable(),
  city: z
    .string({ invalid_type_error: "City must be a string" })
    .trim()
    .nullable()
    .optional(),
  state: z
    .string({ invalid_type_error: "State must be a string" })
    .trim()
    .nullable()
    .optional(),
  zip: zipValidationSchema.nullable().optional(),
  companyName: z
    .string({ invalid_type_error: "Company name must be a string" })
    .nullable()
    .optional(),
  commission: z
    .number({ invalid_type_error: "Commission must be a number" })
    .nonnegative()
    .default(0),
  type: z.enum(["Admin", "Manager", "Sales", "Technician", "Other"]),
  date: z.date({ invalid_type_error: "Date must be a date" }),
  salaryType: z
    .enum(["HOURLY", "BI_WEEKLY", "WEEKLY", "MONTHLY"], {
      invalid_type_error: "Salary type must be a string",
      message: "Salary type must be one of HOURLY, BI_WEEKLY, WEEKLY, MONTHLY",
    })
    .nullable()
    .optional(),
  salaryAmount: z
    .number({ invalid_type_error: "Salary amount must be a number" })
    .nonnegative("Salary amount must be positive")
    .nullable()
    .optional(),
  profilePicture: z
    .string({ invalid_type_error: "Profile picture must be a string" })
    .optional(),
});

export type TCreateEmployeeValidationSchema = z.infer<
  typeof createEmployeeValidationSchema
>;

export type TUpdateEmployeeValidationSchema = z.infer<
  typeof updateEmployeeValidationSchema
>;
