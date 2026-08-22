"use server";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import {
  Technician,
  TechnicianImage,
  User,
  VehicleParts,
} from "@prisma/client";
import { getServerSession } from "next-auth";

export const getTechniciansWithPermission = async ({
  invoiceId,
  invoiceItemId,
}: {
  invoiceId?: string;
  invoiceItemId?: number;
}) => {
  try {
    // get the current user
    const session = await getServerSession(authOptions);
    const currentUser = await db.user.findUnique({
      where: {
        id: Number(session?.user?.id),
      },
    });

    const technicians = (await db.technician.findMany({
      where: {
        invoiceId,
        invoiceItemId,
      },
      include: {
        user: true,
        vehicleParts: true,
        images: true,
      },
    })) as (Technician & {
      user: User;
      name: string;
      hasPermission: boolean;
      vehicleParts: VehicleParts[];
      images: TechnicianImage[];
    })[];

    technicians.forEach((technician) => {
      // const user = users.find((user) => user.id === technician.userId);
      technician.name = `${technician.user?.firstName || "Unknown"} ${technician.user?.lastName || ""}`;
      // if the technician is not the current user, and if its role isn't "admin" or "manager", then set hasPermission to false
      technician.hasPermission =
        currentUser?.id === technician.userId ||
        currentUser?.employeeType === "Admin" ||
        currentUser?.employeeType === "Manager";
    });

    return JSON.parse(JSON.stringify(technicians));
  } catch (err) {
    throw err;
  }
};
