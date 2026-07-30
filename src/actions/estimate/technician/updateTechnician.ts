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
  technicianNote: string;
};

export const updateTechnician = async (
  technicianId: number,
  payload: TechnicianInput,
  vehicleParts: Partial<VehicleParts>[],
  imageUrls: string[],
): Promise<ServerAction | TErrorHandler> => {
  try {
    // if (!payload) {
    //   return { type: "error", message: "Invalid payload" };
    // }

    // Ensure the date includes both date and time

    // Normalize the assigned date to 00:00:00 like the due date
    const dateObj = payload.date ? new Date(payload.date) : null;
    const normalizedDate =
      dateObj && !isNaN(dateObj.getTime())
        ? new Date(
            Date.UTC(
              dateObj.getUTCFullYear(),
              dateObj.getUTCMonth(),
              dateObj.getUTCDate(),
              0,
              0,
              0,
              0,
            ),
          )
        : payload.date;

    await updateTechnicianValidationSchema.parseAsync({
      ...payload,
      date: normalizedDate,
    });

    const existingTechnician = await db.technician.findUnique({
      where: { id: technicianId },
      include: {
        images: true,
        user: true,
      },
    });

    if (!existingTechnician) {
      return { success: false, message: "Technician not exist in database" };
    }

    const existingUrls = existingTechnician.images.map((img) => img.fileUrl);

    const urlsToAdd = imageUrls.filter((url) => !existingUrls.includes(url));

    const urlsToRemove = existingUrls.filter((url) => !imageUrls.includes(url));

    const updatedTechnician = await db.technician.update({
      where: { id: technicianId },
      data: {
        ...payload,
        date: normalizedDate,
        dateClosed: payload.status === "Complete" ? new Date() : null,
        images: {
          deleteMany: {
            fileUrl: {
              in: urlsToRemove,
            },
          },
          create: urlsToAdd.map((url) => ({
            fileUrl: url,
            uploadedAt: new Date(),
          })),
        },
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
