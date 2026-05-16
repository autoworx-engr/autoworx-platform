"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getEssentials } from "@/lib/auth-utils";
import { ServerAction } from "@/types/action";
import { scheduleRemindersInNest } from "./appointmentReminderScheduler";
import { deleteRemindersInNest } from "./deleteAppointment";

const UpdateAppointmentSchema = z.object({
  appointmentId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  date: z.string().datetime({ offset: true }).nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  clientId: z.number().int().positive().nullable().optional(),
  vehicleId: z.number().int().positive().nullable().optional(),
  serviceCategoryId: z.number().int().positive().nullable().optional(),
  draftEstimate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  confirmationEmailTemplateId: z.number().int().nullable().optional(),
  confirmationEmailTemplateStatus: z.boolean().optional(),
  reminderEmailTemplateId: z.number().int().nullable().optional(),
  reminderEmailTemplateStatus: z.boolean().optional(),
  times: z
    .array(z.object({ date: z.string(), time: z.string() }))
    .nullable()
    .optional(),
  timezone: z.string().nullable().optional(),
  assignedUsers: z.array(z.number().int().positive()).optional(),
});

export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;

export async function updateAppointment(
  input: UpdateAppointmentInput,
  options?: { forceCompanyId?: number; forceUserId?: number },
): Promise<ServerAction> {
  try {
    const parsed = UpdateAppointmentSchema.parse(input);

    let companyId: number;
    if (options?.forceCompanyId) {
      companyId = options.forceCompanyId;
    } else {
      const essentials = await getEssentials();
      companyId = essentials.companyId;
    }

    const existing = await db.appointment.findFirst({
      where: { id: parsed.appointmentId, companyId },
      select: { id: true },
    });
    if (!existing) {
      return { type: "error", message: "Appointment not found" };
    }

    const { appointmentId, assignedUsers, date, ...rest } = parsed;

    const updated = await db.appointment.update({
      where: { id: appointmentId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        ...rest,
        date: date ? new Date(date) : undefined,
      } as any,
    });

    if (assignedUsers !== undefined) {
      await db.appointmentUser.deleteMany({ where: { appointmentId } });
      if (assignedUsers.length > 0) {
        await db.appointmentUser.createMany({
          data: assignedUsers.map((uid) => ({
            appointmentId,
            userId: uid,
            eventId: "",
          })),
        });
      }
    }

    try {
      await deleteRemindersInNest(String(appointmentId));
      if (updated.date && updated.startTime) {
        const company = await db.company.findFirst({
          where: { id: companyId },
          select: { timezone: true },
        });
        await scheduleRemindersInNest({
          id: String(appointmentId),
          date: updated.date,
          time: updated.startTime,
          timezone: company?.timezone || parsed.timezone || "Etc/UTC",
        });
      }
    } catch {
      // reminder scheduling is best-effort
    }

    return {
      type: "success",
      message: "Appointment updated",
      data: { appointmentId },
    };
  } catch (error) {
    console.error("[updateAppointment] error:", error);
    return {
      type: "error",
      message:
        error instanceof Error ? error.message : "Failed to update appointment",
    };
  }
}
