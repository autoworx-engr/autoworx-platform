import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Checkbox, Switch } from "antd";
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
    <div className="">
      <div className="mb-4 flex items-center">
        <button onClick={onBack} className="mr-2 font-bold">
          {"<"} Customize User Roles
        </button>
      </div>
      <div className="ml-1 mr-4 flex h-[100px] w-[98%] items-center border-l border-r border-t border-black pl-2">
        <div className="w- overflow-hidden rounded-full">
          <Image
            src={user.image}
            alt={name}
            width={40}
            height={40}
            className="object-cover"
          />
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-medium">{name}</h3>
          <p className="text-sm text-gray-500">{user.employeeType}</p>
        </div>
      </div>
      <table className="mb-2 ml-1 mr-4 w-[98%] border border-t-0 border-black p-8">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="px-4 text-left">Modules</th>
            <th className="px-4 text-left">Full Access</th>
            {user.employeeType !== "Admin" &&
            user.employeeType !== "Manager" &&
            user.employeeType !== "Other" ? (
              <th className="px-4 text-left">Access</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {permissionModules.map((module, index) => (
            <tr key={index + 1} className="p-4">
              <td className="px-4 py-2">{module.label}</td>
              <td className="px-4 py-2.5 text-left">
                {!module.viewOnly && (
                  <Switch
                    checked={permissions[module.key] ?? false}
                    onChange={checked =>
                      handlePermissionChange(module.key, checked)
                    }
                    className="shadow-md"
                  />
                )}
              </td>
              <td className="px-4 py-2.5 text-left">
                {module.viewOnly && (
                  <div className="group">
                    <Checkbox
                      checked={permissions[module.viewOnly] ?? false}
                      onChange={e =>
                        handleViewOnlyChange(module.viewOnly!, e.target.checked)
                      }
                    ></Checkbox>
                    <div className="fixed z-50 hidden -translate-x-20 -translate-y-12 rounded-lg border bg-[#66738C] p-1 text-sm text-white group-hover:block">
                      View Only
                    </div>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomizeUserRole;
