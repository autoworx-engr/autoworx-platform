"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { permissionFieldsForRole } from "@/lib/permissionModule";
import { EmployeeType, Role } from "@prisma/client";

const prisma = db;

export const teamManagementUser = async (): Promise<
  {
    id: number;
    firstName: string;
    lastName: string | null;
    role: Role;
    image: string;
    employeeType: EmployeeType;
  }[]
> => {
  try {
    const companyId = await getCompanyId();

    // Fetch users from the database with the companyId filter
    const returnedUsers = await db.user.findMany({
      where: { companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        image: true,
        employeeType: true,
      },
    });

    return returnedUsers;
  } catch (error: any) {
    console.error("Error selecting data from user", error);
    throw error;
  }
};

export const getPermissionsForRole = async () => {
  try {
    const companyId = await getCompanyId();
    const [
      managerPermissions,
      salesPermissions,
      technicianPermissions,
      otherPermissions,
    ] = await Promise.all([
      db.permissionForManager.findFirst({ where: { companyId } }),
      db.permissionForSales.findFirst({ where: { companyId } }),
      db.permissionForTechnician.findFirst({ where: { companyId } }),
      db.permissionForOther.findFirst({ where: { companyId } }),
    ]);

    return {
      managerPermissions,
      salesPermissions,
      technicianPermissions,
      otherPermissions,
    };
  } catch (error) {
    console.log("Error fetching permissions", error);
    throw error;
  }
};

interface userRolePermission {
  role: string;
  moduleKey: string;
  value: boolean;
  isViewOnly?: boolean;
}

export const updatePermissionForRole = async ({
  role,
  moduleKey,
  value,
  isViewOnly,
}: userRolePermission) => {
  if (!role || !moduleKey || typeof value !== "boolean")
    throw new Error("Invalid arguments for permission update");

  const moduleField = isViewOnly ? `${moduleKey}ViewOnly` : moduleKey;

  // The field name is interpolated straight into the Prisma `data` object, so
  // only columns the module catalogue declares for this role may be written.
  if (!permissionFieldsForRole(role).has(moduleField)) {
    throw new Error(`Unknown module "${moduleField}" for role "${role}"`);
  }

  try {
    const companyId = await getCompanyId();

    switch (role) {
      case "Manager":
        const managerPermission = await db.permissionForManager.findFirst({
          where: { companyId },
        });
        if (managerPermission) {
          await db.permissionForManager.update({
            where: { id: managerPermission.id },
            data: { [moduleField]: value },
          });
        } else {
          throw new Error("Can't update the permission for this role");
        }
        break;

      case "Sales":
        const salesPermission = await db.permissionForSales.findFirst({
          where: { companyId },
        });
        if (salesPermission) {
          await db.permissionForSales.update({
            where: { id: salesPermission.id },
            data: { [moduleField]: value },
          });
        } else {
          throw new Error("Can't update the permission for this role");
        }
        break;

      case "Technician":
        const technicianPermission = await db.permissionForTechnician.findFirst(
          {
            where: { companyId },
          },
        );
        if (technicianPermission) {
          await db.permissionForTechnician.update({
            where: { id: technicianPermission.id },
            data: { [moduleField]: value },
          });
        } else {
          throw new Error("Can't update the permission for this role");
        }
        break;

      case "Other":
        const otherPermission = await db.permissionForOther.findFirst({
          where: { companyId },
        });
        if (otherPermission) {
          await db.permissionForOther.update({
            where: { id: otherPermission.id },
            data: { [moduleField]: value },
          });
        } else {
          throw new Error("Can't update the permission for this role");
        }
        break;

      default:
        throw new Error("Role not found: " + role);
    }
  } catch (error) {
    console.error("Error updating permission:", error);
    throw new Error("Error updating permission");
  }
};

//customization of users
interface PrismaClientWithIndex {
  [key: string]: any;
}
interface PermissionModelMap {
  Admin: string;
  Manager: string;
  Sales: string;
  Technician: string;
  Other: string;
}

const permissionModelMap: PermissionModelMap = {
  Admin: "permissionForManager", // Admin uses Manager permissions
  Manager: "permissionForManager",
  Sales: "permissionForSales",
  Technician: "permissionForTechnician",
  Other: "permissionForOther",
};

const getRoleModel = (role: string): string => {
  const roleModel = permissionModelMap[role as keyof PermissionModelMap];
  if (!roleModel) {
    throw new Error(`Unknown role: ${role}`);
  }
  return roleModel;
};

// FIXED: Fetch user permissions (role + user-specific overrides)
// Now accepts userId and optional companyId parameter
export const getUserPermissions = async (
  userId: number,
  role: string,
  userCompanyId?: number,
) => {
  const roleModel = getRoleModel(role);

  try {
    // CRITICAL FIX: Get the company ID of the USER being checked, not the current session user
    let companyId: number;

    if (userCompanyId) {
      // If companyId is provided, use it
      companyId = userCompanyId;
    } else {
      // Otherwise, fetch it from the user's record
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user) {
        console.error(`User not found: ${userId}`);
        return {};
      }

      companyId = user.companyId;
    }

    const rolePermission = await (prisma as PrismaClientWithIndex)[
      roleModel
    ].findFirst({
      where: { companyId },
    });

    if (!rolePermission) {
      console.error(`No role permissions found for companyId: ${companyId}`);
      return {};
    }

    const userPermissions = await prisma.permission.findFirst({
      where: { userId, companyId },
    });

    const mergedPermissions = { ...rolePermission, ...(userPermissions || {}) };

    return mergedPermissions;
  } catch (error) {
    console.error(
      `Error fetching permissions for userId: ${userId} and role: ${role}`,
      error,
    );
    return {};
  }
};

// Save user permissions
export const savePermissions = async (
  userId: number,
  newPermissions: object,
): Promise<boolean> => {
  try {
    const companyId = await getCompanyId();

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, companyId },
      select: { id: true, employeeType: true },
    });

    if (!targetUser) {
      throw new Error("User not found in your company");
    }

    // Drop anything the role's module catalogue does not declare — the caller
    // sends a merged permission object, which also carries id/userId/companyId.
    const allowedFields = permissionFieldsForRole(targetUser.employeeType);
    const data = Object.fromEntries(
      Object.entries(newPermissions).filter(
        ([field, value]) =>
          allowedFields.has(field) && typeof value === "boolean",
      ),
    );

    await prisma.permission.upsert({
      where: {
        userId_companyId: { userId, companyId },
      },
      create: { userId, companyId, ...data },
      update: data,
    });

    return true;
  } catch (error) {
    console.error("Error saving permissions:", error);
    throw error;
  }
};
