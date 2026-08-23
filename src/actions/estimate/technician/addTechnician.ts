"use server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getUserFromSession } from "@/lib/getCurrentUser";
import { sendTechnicianAssignForWorkOrderNotify } from "@/lib/notification/workOrder-notify";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { createTechnicianValidationSchema } from "@/validations/schemas/technicians/technician.validation";
import { Priority, VehicleParts } from "@prisma/client";
import moment from "moment";
import { revalidatePath } from "next/cache";
import { addVehicleParts } from "./addVehicleParts";
import { updateWorkOrderStatus } from "./updateWorkOrderStatus";
import { getVehicleByInvoiceId } from "@/actions/vehicle/getVehicleByInvoiceId";

type TechnicianInput = {
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
};

export async function addTechnician(
  payload: TechnicianInput,
  vehicleParts: Partial<VehicleParts>[],
): Promise<ServerAction | TErrorHandler> {
  const sessionUser = await getUserFromSession();
  const companyId = sessionUser.companyId;

  const vehicleInfo = await getVehicleByInvoiceId(payload.invoiceId);
  const { make, model, year } = vehicleInfo || {};

  const vehicleName =
    make && model
      ? `${year ? year : ""} ${make} ${model}`
      : make || payload.invoiceId;

  try {
    // if (!payload) {
    //   return { type: "error", message: "Invalid payload" };
    // }
    await createTechnicianValidationSchema.parseAsync(payload);

    // Ensure the date includes both date and time
    const dateWithTime = new Date(payload.date);
    const currentTime = new Date();
    dateWithTime.setHours(
      currentTime.getHours(),
      currentTime.getMinutes(),
      currentTime.getSeconds(),
      currentTime.getMilliseconds(),
    );

    const { imageUrls, ...restPayload } = payload as any;

    const newTechnician = await db.technician.create({
      data: {
        ...restPayload,
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
        technicianUserId: technicianUser?.id as number,
        companyId,
        description: `You have been assigned a job on ${vehicleName}. View details in Autoworx.`,
        title: "Assigned to Work Order",
      });
    }

    revalidatePath("/estimate/workorder");
    revalidatePath("/estimate/view");
    revalidatePath("/employee");

    return {
      type: "success",
      data: {
        ...newTechnician,
        name: technicianUser?.firstName + " " + technicianUser?.lastName,
      },
    };
  } catch (error) {
    return errorHandler(error);
  }
}
