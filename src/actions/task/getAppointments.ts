"use server";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { Appointment, EmployeeType, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

export default async function getAppointments(
  params?: Prisma.AppointmentFindManyArgs,
) {
  const session = await getServerSession(authOptions);
  try {
    const companyId = session?.user?.companyId;
    if (!companyId) {
      throw new Error("Company ID is required to fetch tasks.");
    }
    const employeeType = session?.user?.employeeType as EmployeeType;
    let appointments: Appointment[] = [];
    let totalAppointments = 0;
    const { where, ...restParams } = params || {};
    if (
      employeeType === "Admin" ||
      employeeType === "Manager" ||
      employeeType === "Sales"
    ) {
      // Admin, Manager, or Sales can see all appointments
      totalAppointments = await db.appointment.count({
        where: {
          companyId,
          ...(where ?? {}),
        },
      });
      appointments = await db.appointment.findMany({
        where: {
          companyId,
          ...(where ?? {}),
        },
        ...restParams,
      });
    } else {
      const userId = session?.user?.id;
      if (!userId) {
        throw new Error("User ID is required to fetch Appointment.");
      }

      const whereCondition = {
        companyId,
        OR: [
          {
            appointmentUsers: {
              some: {
                userId: +userId,
              },
            },
          },
          {
            userId: +userId,
          },
        ],
        ...(where ?? {}),
      };

      totalAppointments = await db.appointment.count({
        where: whereCondition,
      });
      appointments = await db.appointment.findMany({
        where: whereCondition,
        ...restParams,
      });
    }

    // Fetch associated invoice grand totals for matching draft estimates
    const draftEstimateIds = appointments
      .map((a) => a.draftEstimate)
      .filter(Boolean) as string[];

    let invoiceMap = new Map<string, number>();
    if (draftEstimateIds.length > 0) {
      const invoices = await db.invoice.findMany({
        where: { id: { in: draftEstimateIds } },
        select: { id: true, grandTotal: true },
      });
      invoiceMap = new Map(
        invoices.map((i) => [i.id, Number(i.grandTotal) || 0]),
      );
    }

    const enrichedAppointments = appointments.map((a) => ({
      ...a,
      invoiceGrandTotal: a.draftEstimate
        ? invoiceMap.get(a.draftEstimate) || 0
        : 0,
    }));

    return { data: enrichedAppointments as any, totalAppointments };
  } catch (error) {
    console.error(`Error fetching tasks`, error);
    throw new Error(`Failed to get tasks`);
  }
}
