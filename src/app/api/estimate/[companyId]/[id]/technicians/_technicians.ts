import { db } from "@/lib/db";
import { addVehicleParts } from "@/actions/estimate/technician/addVehicleParts";
import { updateWorkOrderStatus } from "@/actions/estimate/technician/updateWorkOrderStatus";
import { getVehicleByInvoiceId } from "@/actions/vehicle/getVehicleByInvoiceId";
import { sendTechnicianAssignForWorkOrderNotify } from "@/lib/notification/workOrder-notify";
import { createTechnicianValidationSchema } from "@/validations/schemas/technicians/technician.validation";
import { Priority, VehicleParts } from "@prisma/client";

/**
 * Lists technicians for an invoice (optionally a single invoice item) and
 * flags hasPermission per the caller. Mirrors getTechniciansWithPermission,
 * but derives the current user from the JWT/session principal.
 */
export async function listTechnicians(
  invoiceId: string,
  invoiceItemId: number | undefined,
  userId: number,
) {
  const currentUser = await db.user.findUnique({ where: { id: userId } });

  const technicians = await db.technician.findMany({
    where: { invoiceId, invoiceItemId },
    include: { user: true, vehicleParts: true, images: true },
  });

  return technicians.map((tech) => ({
    ...tech,
    name: `${tech.user?.firstName || "Unknown"} ${tech.user?.lastName || ""}`,
    hasPermission:
      currentUser?.id === tech.userId ||
      currentUser?.employeeType === "Admin" ||
      currentUser?.employeeType === "Manager",
  }));
}

export type CreateTechnicianInput = {
  date: Date;
  due: Date;
  amount: number;
  priority: Priority;
  status: string;
  note: string;
  userId: number;
  serviceId: number | null;
  invoiceId: string;
  invoiceItemId: number;
  technicianNote?: string;
};

/**
 * Creates a technician assignment for the given company. Mirrors the
 * addTechnician server action, but takes companyId from the principal
 * instead of getUserFromSession.
 */
export async function createTechnician(
  payload: CreateTechnicianInput,
  vehicleParts: Partial<VehicleParts>[],
  companyId: number,
) {
  await createTechnicianValidationSchema.parseAsync(payload);

  const vehicleInfo = await getVehicleByInvoiceId(payload.invoiceId);
  const { make, model, year } = vehicleInfo || {};
  const vehicleName =
    make && model
      ? `${year ? year : ""} ${make} ${model}`
      : make || payload.invoiceId;

  // Ensure the date includes both date and time
  const dateWithTime = new Date(payload.date);
  const now = new Date();
  dateWithTime.setHours(
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );

  const newTechnician = await db.technician.create({
    data: {
      ...payload,
      date: dateWithTime,
      companyId,
      dateClosed: payload.status === "Complete" ? new Date() : null,
    },
  });

  await addVehicleParts(vehicleParts, newTechnician.id);

  const technicianUser = await db.user.findUnique({
    where: { id: newTechnician.userId },
  });

  await updateWorkOrderStatus(payload.invoiceId);

  if (technicianUser) {
    sendTechnicianAssignForWorkOrderNotify({
      technicianUserId: technicianUser.id,
      companyId,
      description: `You have been assigned a job on ${vehicleName}. View details in Autoworx.`,
      title: "Assigned to Work Order",
    });
  }

  return {
    ...newTechnician,
    name: `${technicianUser?.firstName} ${technicianUser?.lastName}`,
  };
}
