import { z } from "zod";

export const Priority = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
} as const;

export const createTaskValidationSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or fewer"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
  assignedUsers: z.array(z.number()),
  priority: z.enum([Priority.LOW, Priority.MEDIUM, Priority.HIGH]),
  invoiceId: z.string().optional(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  leadId: z
    .number({ invalid_type_error: "Task leadId must be number" })
    .int("LeadId must be integer")
    .nonnegative()
    .optional(),
  clientId: z.number().nullable().optional(),
  date: z
    .string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      return !isNaN(Date.parse(date));
    }, "Invalid date format"),
  timezone: z.string().optional(),
  createdBy: z.enum(["user", "sales_agent"]),
});

export const updateTaskValidationSchema = z.object({
  id: z.number().int("Id must be integer").nonnegative(),
  task: z.object({ ...createTaskValidationSchema.shape }),
});

export type TCreateTaskValidationSchema = z.infer<
  typeof createTaskValidationSchema
>;

export type TUpdateTaskValidationSchema = z.infer<
  typeof updateTaskValidationSchema
>;
