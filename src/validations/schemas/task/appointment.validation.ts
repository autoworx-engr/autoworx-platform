import { z } from "zod";

const baseAppointmentSchema = z.object({
  title: z
    .string({
      required_error: "Title is required",
      invalid_type_error: "Title must be a string",
    })
    .min(1, "Title is required"),
  date: z
    .string({
      invalid_type_error: "Date must be a string",
    })
    .refine((date) => {
      if (!date) return true;
      return !isNaN(Date.parse(date));
    }, "Invalid date format")
    .optional(),
  endDate: z
    .string({
      invalid_type_error: "End date must be a string",
    })
    .refine((date) => {
      if (!date) return true;
      return !isNaN(Date.parse(date));
    }, "Invalid end date format")
    .nullable()
    .optional(),
  startTime: z
    .string({
      invalid_type_error: "Start time must be a string",
    })
    .optional(),
  endTime: z
    .string({
      invalid_type_error: "End time must be a string",
    })
    .optional(),
  assignedUsers: z.array(
    z.number({
      invalid_type_error: "Assigned user ID must be a number",
    }),
    {
      required_error: "Assigned users are required",
      invalid_type_error: "Assigned users must be an array of numbers",
    },
  ),
  // .min(1, "At least one assigned user is required"),
  clientId: z
    .number({
      invalid_type_error: "Client ID must be a number",
    })
    .optional(),
  vehicleId: z
    .number({
      invalid_type_error: "Vehicle ID must be a number",
    })
    .optional(),
  serviceCategoryId: z
    .number({
      invalid_type_error: "Service category ID must be a number",
    })
    .optional(),
  draftEstimate: z
    .string({
      invalid_type_error: "Draft estimate must be a string",
    })
    .nullable(),
  notes: z
    .string({
      invalid_type_error: "Notes must be a string",
    })
    .optional(),
  confirmationEmailTemplateId: z
    .number({
      invalid_type_error: "Confirmation email template ID must be a number",
    })
    .optional(),
  reminderEmailTemplateId: z
    .number({
      invalid_type_error: "Reminder email template ID must be a number",
    })
    .optional(),
  confirmationEmailTemplateStatus: z
    .boolean({
      invalid_type_error:
        "Confirmation email template status must be a boolean",
    })
    .optional(),
  reminderEmailTemplateStatus: z
    .boolean({
      invalid_type_error: "Reminder email template status must be a boolean",
    })
    .optional(),
  times: z
    .array(
      z.object({
        date: z
          .string({
            required_error: "Date is required",
            invalid_type_error: "Date must be a string",
          })
          .refine((date) => !isNaN(Date.parse(date)), "Invalid date format"),
        time: z.string({
          required_error: "Time is required",
          invalid_type_error: "Time must be a string",
        }),
      }),
      {
        invalid_type_error: "Times must be an array of objects",
      },
    )
    .optional(),
  timezone: z
    .string({
      invalid_type_error: "Timezone must be a string",
    })
    .optional(),
  forceCompanyId: z
    .number({
      invalid_type_error: "Force company ID must be a number",
    })
    .optional(),
  forceUserId: z
    .number({
      invalid_type_error: "Force user ID must be a number",
    })
    .optional(),
});

const endDateAfterStart = (data: {
  date?: string;
  endDate?: string | null;
}) => {
  if (!data.date || !data.endDate) return true;
  return Date.parse(data.endDate) >= Date.parse(data.date);
};
const endDateRefineMessage = {
  message: "End date cannot be before start date",
  path: ["endDate"] as [string],
};

export const createAppointmentValidationSchema = baseAppointmentSchema.refine(
  endDateAfterStart,
  endDateRefineMessage,
);

export const updateAppointmentValidationSchema = z.object({
  id: z.number().int("Id must be integer").nonnegative(),
  appointment: baseAppointmentSchema.refine(
    endDateAfterStart,
    endDateRefineMessage,
  ),
});

export type TCreateAppointmentValidationSchema = z.infer<
  typeof createAppointmentValidationSchema
>;

export type TUpdateAppointmentValidationSchema = z.infer<
  typeof updateAppointmentValidationSchema
>;
