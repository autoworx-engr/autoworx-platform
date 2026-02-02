import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Checkbox, Switch, Tooltip } from "antd";
import { Role, EmployeeType } from "@prisma/client";
import {
  permissionModuleForAdminManager,
  permissionModuleForSales,
  permissionModuleForTechnician,
  permissionModuleForOther,
} from "@/lib/permissionModule";
import {
  getUserPermissions,
  savePermissions,
  getPermissionsForRole,
} from "@/actions/settings/teamManagement";
import { errorToast } from "@/lib/toast";
import { useTeamManagementStore } from "@/stores/teamManagementStore";
import { ArrowLeft } from "lucide-react";

interface CustomizeUserRolesProps {
  user: {
    id: number;
    firstName: string;
    lastName: string | null;
    role: Role;
    image: string;
    employeeType: EmployeeType;
  };
  onBack: () => void;
}
interface PermissionModule {
  label: string;
  key: string;
  viewOnly?: string;
}
interface PermissionType {
  [key: string]: boolean;
}

const CustomizeUserRole = ({ user, onBack }: CustomizeUserRolesProps) => {
  const refetch = useTeamManagementStore().refetch;
  const name = `${user.firstName} ${user.lastName}`;

  const [permissions, setPermissions] = useState<PermissionType>({});
  const [rolePermissions, setRolePermissions] = useState<any>(null);

  useEffect(() => {
    // Fetch default and user-specific permissions
    getUserPermissions(user.id, user.employeeType).then(data => {
      setPermissions(data || {});
    });
  }, [user.id, user.employeeType, refetch]);

  useEffect(() => {
    // Fetch role-based permissions from UserRolesTable
    const fetchRolePermissions = async () => {
      try {
        const data = await getPermissionsForRole();
        setRolePermissions(data);
      } catch (error) {
        console.error("Error fetching role permissions:", error);
      }
    };

    fetchRolePermissions();
  }, []);

  // Helper function to check if permission is allowed for user's role
  const isPermissionAllowedForRole = (key: string): boolean => {
    if (!rolePermissions) return true; // Allow if role permissions not loaded yet

    const roleKey = `${user.employeeType.toLowerCase()}Permissions`;
    const rolePermission = rolePermissions[roleKey];

    if (!rolePermission) return true; // Allow if role not found

    return rolePermission[key] !== false; // Allow if permission is not explicitly false
  };

  const handlePermissionChange = async (key: string, checked: boolean) => {
    // Check if user is trying to enable a permission that's disabled at role level
    if (checked && !isPermissionAllowedForRole(key)) {
      errorToast(
        "Cannot enable this permission because it is disabled for this role in the User Roles table"
      );
      return;
    }

    setPermissions(prev => {
      const { id, ...prevWithoutId } = prev;
      const updatedPermissions = { ...prevWithoutId, [key]: checked };
      // Upsert the entire permissions object
      savePermissions(user.id, updatedPermissions).catch(error => {
        console.error("Failed to update permission:", error);
      });
      return updatedPermissions;
    });
  };

  const handleViewOnlyChange = async (
    viewOnlyKey: string,
    checked: boolean
  ) => {
    // Check if user is trying to enable a view-only permission that's disabled at role level
    // if (checked && !isPermissionAllowedForRole(viewOnlyKey)) {
    //   errorToast(
    //     "Cannot enable this permission because it is disabled for this role in the User Roles table"
    //   );
    //   return;
    // }

    setPermissions(prev => {
      const updatedPermissions = { ...prev, [viewOnlyKey]: checked };
      // Upsert the entire permissions object
      savePermissions(user.id, updatedPermissions).catch(error => {
        console.error("Failed to update view-only permission:", error);
      });
      return updatedPermissions;
    });
  };
  const getUserType = () => {
    switch (user.employeeType) {
      case "Admin":
      case "Manager":
        return permissionModuleForAdminManager;

      case "Sales":
        return permissionModuleForSales;

      case "Technician":
        return permissionModuleForTechnician;
      case "Other":
      default:
        return permissionModuleForOther;
    }
  };
  const permissionModules: PermissionModule[] = getUserType();
  return (
   <div className="p-0">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-indigo-600 hover:text-indigo-800 font-semibold transition duration-150"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to User List
        </button>
      </div>

      {/* User Info Header */}
      <div className="mb-6 flex items-center border border-gray-300 rounded-lg p-4 bg-indigo-50 shadow-sm">
        <div className="w-16 h-16 overflow-hidden rounded-full shrink-0 border-2 border-white shadow">
          <Image
            src={user.image}
            alt={name}
            width={64}
            height={64}
            className="object-cover h-full w-full"
          />
        </div>
        <div className="ml-4">
          <h3 className="text-xl font-bold ">{name}</h3>
          <p className="text-sm font-medium text-indigo-700">
            {user.employeeType} Role
          </p>
        </div>
      </div>

      {/* Permissions Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ">
                Modules
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ">
                Full Access
              </th>
              {/* Conditional header - logic preserved */}
              {(user.employeeType === "Sales" ||
                user.employeeType === "Technician") && (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ">
                    View Only Access
                  </th>
                )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {permissionModules.map((module, index) => (
              <tr key={index + 1} className="hover:bg-gray-50 transition duration-150">
                <td className="px-4 py-3   whitespace-nowrap">
                  {module.label}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    {!module.viewOnly && (
                      <Switch
                        checked={permissions[module.key] ?? false}
                        onChange={(checked) =>
                          handlePermissionChange(module.key, checked)
                        }
                        className="shadow-sm"
                      />
                    )}
                  </div>
                </td>
                {/* View Only Checkbox Column */}
                {(user.employeeType === "Sales" ||
                  user.employeeType === "Technician") && (
                    <td className="px-4 py-3">
                      {module.viewOnly && (
                        <Tooltip title="View Only">
                          <Checkbox
                            checked={permissions[module.viewOnly] ?? false}
                            onChange={(e) =>
                              handleViewOnlyChange(
                                module.viewOnly!,
                                e.target.checked
                              )
                            }
                          />
                        </Tooltip>
                      )}
                    </td>
                  )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomizeUserRole;
