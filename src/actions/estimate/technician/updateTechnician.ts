"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { sendTechnicianJobCompleteNotification } from "@/lib/notification/workOrder-notify";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { updateTechnicianValidationSchema } from "@/validations/schemas/technicians/technician.validation";
import { Priority, VehicleParts } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { addVehicleParts } from "./addVehicleParts";
import { updateWorkOrderStatus } from "./updateWorkOrderStatus";

type TechnicianInput = {
  date: Date;
  due: Date;
  amount: number;
  priority: Priority;
  status: string;
  note: string;
  userId: number;
  serviceId: number;
  invoiceId: string;
};

export const updateTechnician = async (
  technicianId: number,
  payload: TechnicianInput,
  vehicleParts: Partial<VehicleParts>[]
): Promise<ServerAction | TErrorHandler> => {
  try {
    // if (!payload) {
    //   return { type: "error", message: "Invalid payload" };
    // }
    await updateTechnicianValidationSchema.parseAsync(payload);
    // Ensure the date includes both date and time
    const dateWithTime = new Date(payload.date);
    const currentTime = new Date();
    dateWithTime.setHours(
      currentTime.getHours(),
      currentTime.getMinutes(),
      currentTime.getSeconds(),
      currentTime.getMilliseconds()
    );

    const updatedTechnician = await db.technician.update({
      where: { id: technicianId },
      data: {
        ...payload,
        date: dateWithTime,
        dateClosed: payload.status === "Complete" ? new Date() : null,
      },
    });

    await db.vehicleParts.deleteMany({
      where: {
        technicianId: updatedTechnician.id,
        invoiceId: updatedTechnician.invoiceId,
        serviceId: updatedTechnician.serviceId,
      },
    });

    await addVehicleParts(vehicleParts, updatedTechnician.id);

    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });
    //all technician jobs are completed then upadate the work order status to completed
    await updateWorkOrderStatus(payload.invoiceId);

    if (updatedTechnician.status === "Complete") {
      // send a notification when technician jobs are completed
      sendTechnicianJobCompleteNotification({
        invoiceId: updatedTechnician.invoiceId,
        technicianUserId: updatedTechnician.userId,
      });
    }
    revalidatePath("/dashboard/estimate/workorder");
    revalidatePath("/dashboard/employee");
    revalidatePath(`/dashboard/estimate/invoices/${payload.invoiceId}`);

    return {
      type: "success",
      data: {
        ...updatedTechnician,
        name: user?.firstName + " " + user?.lastName,
      },
    };
  } catch (err) {
    console.error("Error in updateTechnician:", err);
    return errorHandler(err);
  }
};
