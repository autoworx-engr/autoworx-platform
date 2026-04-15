"use client";
import React, { useEffect, useState } from "react";
import { Switch, Checkbox } from "antd";
import { permissionModuleForAdminManager } from "@/lib/permissionModule";
import {
  getPermissionsForRole,
  updatePermissionForRole,
} from "@/actions/settings/teamManagement";
import { successToast, errorToast } from "@/lib/toast";
import { useTeamManagementStore } from "@/stores/teamManagementStore";

interface PermissionWithIndexSignature {
  [key: string]: boolean;
}

interface Permissions {
  managerPermissions: PermissionWithIndexSignature | null;
  salesPermissions: PermissionWithIndexSignature | null;
  technicianPermissions: PermissionWithIndexSignature | null;
  otherPermissions: PermissionWithIndexSignature | null;
}

export default function UserRolesTable() {
  const [permissions, setPermissions] = useState<Permissions | null>(null); // To trigger re-render when serviceStore changes
  const roles = ["Manager", "Sales", "Technician", "Other"];
  const viewOnlyModules = new Set([
    "Sales:workforceManagement",
    "Sales:reporting",
    "Sales:inventoryAll",
    "Technician:workforceManagement",
    "Technician:reporting",
  ]);

  const getModuleLabel = (moduleKey: string) =>
    permissionModuleForAdminManager.find(module => module.key === moduleKey)
      ?.label ?? moduleKey;

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const data = (await getPermissionsForRole()) as Permissions;

        if (data) {
          setPermissions(data);
        }
      } catch (_error) {
        errorToast("Failed to load permissions");
      }
    };

    fetchPermissions();
  }, []);

  // Handle toggle for both switch (permission) and checkbox (viewOnly)
  const handleToggle = async (
    role: string,
    moduleKey: string,
    value: boolean,
    isViewOnly = false
  ) => {
    if (!permissions) return;

    try {
      const updatedPermissions = { ...permissions };
      const roleKey =
        `${role.toLowerCase()}Permissions` as keyof typeof permissions;
      const fieldKey = isViewOnly ? `${moduleKey}ViewOnly` : moduleKey;

      if (updatedPermissions[roleKey]) {
        updatedPermissions[roleKey]![fieldKey] = value; // Update locally
        setPermissions(updatedPermissions);
        await updatePermissionForRole({ role, moduleKey, value, isViewOnly }); // Update the database
        const refetch = useTeamManagementStore.getState().refetch;
        useTeamManagementStore.setState({ refetch: !refetch });
        const moduleLabel = getModuleLabel(moduleKey);
        successToast(
          `Updated ${role} - ${moduleLabel}${isViewOnly ? " (view only)" : ""}`
        );
      }
    } catch (_error) {
      errorToast("Failed to update permission");
    }
  };

  const getPermissionForRole = (
    role: string,
    moduleKey: string
  ): boolean | null => {
    if (!permissions) return null;

    switch (role) {
      case "Manager":
        return permissions.managerPermissions?.[moduleKey] ?? null;

      case "Sales":
        return permissions.salesPermissions?.[moduleKey] ?? null;
      case "Technician":
        return permissions.technicianPermissions?.[moduleKey] ?? null;
      case "Other":
        return permissions.otherPermissions?.[moduleKey] ?? null;
      default:
        return null;
    }
  };

  const isViewOnlyForRole = (role: string, moduleKey: string): boolean => {
    if (!permissions) return false;

    const viewOnlyKey = `${moduleKey}ViewOnly`;

    switch (role) {
      case "Manager":
        return permissions.managerPermissions?.[viewOnlyKey] ?? false;
      case "Sales":
        return permissions.salesPermissions?.[viewOnlyKey] ?? false;
      case "Technician":
        return permissions.technicianPermissions?.[viewOnlyKey] ?? false;
      case "Other":
        return permissions.otherPermissions?.[viewOnlyKey] ?? false;
      default:
        return false;
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            User Roles (Default)
          </h2>
          <p className="text-sm text-slate-500">
            Set base permissions for each standard role.
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/90">
                  <th className="sticky left-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700">
                    Modules
                  </th>
                  {roles.map(role => (
                    <th
                      key={role}
                      className="border-b border-slate-200 px-5 py-3 text-center font-semibold text-slate-700"
                    >
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!permissions && (
                  Array.from({ length: 8 }).map((_, index) => (
                    <tr
                      key={`skeleton-${index + 1}`}
                      className="border-b border-slate-100 last:border-b-0 even:bg-slate-50/30"
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-3">
                        <div className="h-4 w-52 animate-pulse rounded bg-slate-200" />
                      </td>
                      {roles.map(role => (
                        <td key={role} className="px-5 py-3 text-center">
                          <div className="mx-auto h-6 w-11 animate-pulse rounded-full bg-slate-200" />
                        </td>
                      ))}
                    </tr>
                  ))
                )}

                {permissions && permissionModuleForAdminManager.map((module, index) => (
                  <tr
                    key={index + 1}
                    className="border-b border-slate-100 last:border-b-0 even:bg-slate-50/30"
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-3 font-medium text-slate-700">
                      {module.label}
                    </td>
                    {roles.map(role => {
                      const permission = getPermissionForRole(role, module.key);
                      const isViewOnly = isViewOnlyForRole(role, module.key);
                      const canViewOnly = viewOnlyModules.has(`${role}:${module.key}`);

                      return (
                        <td key={role} className="px-5 py-3 text-center">
                          {permission !== null && (
                            <div className="flex items-center justify-center">
                              <Switch
                                checked={permission}
                                className="max-w-2 shadow-sm [&.ant-switch-checked]:!bg-[#6571FF]"
                                onChange={checked =>
                                  handleToggle(role, module.key, checked)
                                }
                                aria-label={`${role} permission for ${module.label}`}
                              />
                            </div>
                          )}

                          {canViewOnly && (
                            <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-slate-500">
                              <Checkbox
                                className="[&_.ant-checkbox-checked_.ant-checkbox-inner]:!border-[#6571FF] [&_.ant-checkbox-checked_.ant-checkbox-inner]:!bg-[#6571FF]"
                                checked={isViewOnly}
                                onChange={e =>
                                  handleToggle(
                                    role,
                                    module.key,
                                    e.target.checked,
                                    true
                                  )
                                }
                                aria-label={`${role} view-only for ${module.label}`}
                              />
                            </div>
                          )}

                          {(permission === null && !canViewOnly) && (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="px-1 pt-2 text-xs text-slate-500">
          Tip: Scroll horizontally on smaller screens to review all role
          columns.
        </p>
      </div>
    </div>
  );
}
