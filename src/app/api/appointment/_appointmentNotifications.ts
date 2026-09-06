import { db } from "@/lib/db";
import { sendAppointmentUpdateNotification } from "@/lib/notification/task-and-appointment-notify";
import moment from "moment";

export async function notifyAppointmentUpdated(
  appointmentId: number,
  companyId: number,
): Promise<void> {
  try {
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        title: true,
        date: true,
        startTime: true,
        client: { select: { firstName: true, lastName: true } },
        appointmentUsers: { select: { userId: true } },
      },
    });

    if (!appointment?.date) return;

    await sendAppointmentUpdateNotification({
      companyId,
      title: appointment.title,
      appointmentDate: moment(appointment.date).format("YYYY-MM-DD"),
      startTime: appointment.startTime || "",
      assignSalesIds: appointment.appointmentUsers.map((row) => row.userId),
      clientName: appointment.client
        ? `${appointment.client.firstName} ${appointment.client.lastName ?? ""}`.trim()
        : "",
    });
  } catch (error) {
    console.error("notifyAppointmentUpdated failed", error);
  }
}
