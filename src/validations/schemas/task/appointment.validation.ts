import { z } from "zod";

export const createAppointmentValidationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z
    .string()
    .refine((date) => {
      if (!date) return true;
      return !isNaN(Date.parse(date));
    }, "Invalid date format")
    .optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  assignedUsers: z.array(z.number()),
  // .nonempty("At least one assigned user is required"),
  clientId: z.number().optional(),
  vehicleId: z.number().optional(),
  draftEstimate: z.string().nullable(),
  notes: z.string().optional(),
  confirmationEmailTemplateId: z.number().optional(),
  reminderEmailTemplateId: z.number().optional(),
  confirmationEmailTemplateStatus: z.boolean().optional(),
  reminderEmailTemplateStatus: z.boolean().optional(),
  times: z
    .array(
      z.object({
        date: z
          .string()
          .refine((date) => !isNaN(Date.parse(date)), "Invalid date format"),
        time: z.string(),
      }),
    )
    .optional(),
  timezone: z.string().optional(),
});

export const updateAppointmentValidationSchema = z.object({
  id: z.number().int("Id must be integer").nonnegative(),
  appointment: z.object({ ...createAppointmentValidationSchema.shape }),
});

export type TCreateAppointmentValidationSchema = z.infer<
  typeof createAppointmentValidationSchema
>;

export type TUpdateAppointmentValidationSchema = z.infer<
  typeof updateAppointmentValidationSchema
>;
