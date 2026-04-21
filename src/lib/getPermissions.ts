"use server";
import { authOptions } from "@/authOptions";
import {
  Permission,
  PermissionForManager,
  PermissionForOther,
  PermissionForSales,
  PermissionForTechnician,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { db } from "./db";

export type PermissionsResult =
  | {
      role: "Admin";
      isSuperAdmin?: boolean;
      companyPermissions: null | undefined;
      userPermissions: Permission | null | undefined;
    }
  | {
      role: "Manager";
      isSuperAdmin?: boolean;
      companyPermissions: PermissionForManager | null;
      userPermissions: Permission | null;
    }
  | {
      role: "Sales";
      isSuperAdmin?: boolean;
      companyPermissions: PermissionForSales | null;
      userPermissions: Permission | null;
    }
  | {
      role: "Technician";
      isSuperAdmin?: boolean;
      companyPermissions: PermissionForTechnician | null;
      userPermissions: Permission | null;
    }
  | {
      role: "Other";
      isSuperAdmin?: boolean;
      companyPermissions: PermissionForOther | null;
      userPermissions: Permission | null;
    };

export default async function getPermissions(
  companyId?: number,
  userId?: number,
): Promise<PermissionsResult | null> {
  let cId = companyId;
  let uId = userId;

  if (!cId) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    cId = Number(session?.user?.companyId);
  }

  if (!uId) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    uId = Number(session?.user.id);
  }

  const user = await db.user.findFirst({
    where: { id: uId },
  });

  if (!user) return null;

  let companyPermissions = null;
  let userPermissions = await db.permission.findFirst({
    where: { userId: +user.id, companyId: cId },
  });
  switch (user.employeeType) {
    case "Manager":
      companyPermissions = await db.permissionForManager.findFirst({
        where: { companyId: cId },
      });
      return {
        role: "Manager",
        companyPermissions,
        isSuperAdmin: user.isSuperAdmin ?? false,
        userPermissions: userPermissions || null,
      } as const;

    case "Sales":
      companyPermissions = await db.permissionForSales.findFirst({
        where: { companyId: cId },
      });
      return {
        role: "Sales",
        companyPermissions,
        isSuperAdmin: user.isSuperAdmin ?? false,
        userPermissions: userPermissions || null,
      } as const;

    case "Technician":
      companyPermissions = await db.permissionForTechnician.findFirst({
        where: { companyId: cId },
      });
      return {
        role: "Technician",
        isSuperAdmin: user.isSuperAdmin ?? false,
        companyPermissions,
        userPermissions: userPermissions || null,
      } as const;

    case "Other":
      companyPermissions = await db.permissionForOther.findFirst({
        where: { companyId: cId },
      });
      return {
        role: "Other",
        companyPermissions,
        isSuperAdmin: user.isSuperAdmin ?? false,
        userPermissions: userPermissions || null,
      } as const;

    case "Admin":
      return {
        role: "Admin",
        isSuperAdmin: user.isSuperAdmin ?? false,
        companyPermissions: null,
        userPermissions: null,
      } as const;

    default:
      throw new Error(`Unknown role: ${user.employeeType}`);
  }
}
