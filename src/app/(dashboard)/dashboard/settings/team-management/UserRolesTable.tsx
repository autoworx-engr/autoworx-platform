"use client";
import {
  getPermissionsForRole,
  updatePermissionForRole,
} from "@/actions/settings/teamManagement";
import {
  getModuleLabel,
  getRoleModule,
  permissionModuleRows,
} from "@/lib/permissionModule";
import { errorToast, successToast } from "@/lib/toast";
import { useTeamManagementStore } from "@/stores/teamManagementStore";
import { Switch } from "antd";
import { useEffect, useState } from "react";

interface PermissionWithIndexSignature {
  [key: string]: boolean;
}

interface Permissions {
  managerPermissions: PermissionWithIndexSignature | null;
  salesPermissions: PermissionWithIndexSignature | null;
  technicianPermissions: PermissionWithIndexSignature | null;
  otherPermissions: PermissionWithIndexSignature | null;
}

const roles = ["Manager", "Sales", "Technician", "Other"];

const rolePermissionsKey = (role: string) =>
  `${role.toLowerCase()}Permissions` as keyof Permissions;

export default function UserRolesTable() {
  const [permissions, setPermissions] = useState<Permissions | null>(null);

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

  const handleToggle = async (
    role: string,
    moduleKey: string,
    value: boolean,
    isViewOnly: boolean,
  ) => {
    if (!permissions) return;

    try {
      const updatedPermissions = { ...permissions };
      const roleKey = rolePermissionsKey(role);
      const fieldKey = isViewOnly ? `${moduleKey}ViewOnly` : moduleKey;

      if (updatedPermissions[roleKey]) {
        updatedPermissions[roleKey]![fieldKey] = value; // Update locally
        setPermissions(updatedPermissions);
        await updatePermissionForRole({ role, moduleKey, value, isViewOnly }); // Update the database
        const refetch = useTeamManagementStore.getState().refetch;
        useTeamManagementStore.setState({ refetch: !refetch });
        successToast(
          `Updated ${role} - ${getModuleLabel(moduleKey)}${
            isViewOnly ? " (view only)" : ""
          }`,
        );
      }
    } catch (_error) {
      errorToast("Failed to update permission");
    }
  };

  /**
   * A module only applies to a role when that role's Prisma model has the
   * column — `getRoleModule` resolves which column (full access or the
   * view-only variant), and `null` means "not applicable to this role".
   */
  const resolveCell = (role: string, moduleKey: string) => {
    const roleModule = getRoleModule(role, moduleKey);
    const rolePermissions = permissions?.[rolePermissionsKey(role)];
    if (!roleModule || !rolePermissions) return null;

    const isViewOnly = Boolean(roleModule.viewOnly);
    const field = roleModule.viewOnly ?? roleModule.key;

    return { isViewOnly, checked: rolePermissions[field] ?? false };
  };

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6">
        <div>
          <h2 className="text-xl font-bold text-slate-600 sm:text-2xl">
            User Roles (Default)
          </h2>
          <p className="text-sm text-slate-500">
            Set base permissions for each standard role.
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="h-full overflow-auto 2xl:max-h-[calc(100vh-450px)]">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/90">
                  <th className="sticky left-0 top-0 z-30 w-[200px] min-w-[200px] max-w-[200px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-600">
                    Modules
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role}
                      className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-5 py-3 text-center font-semibold text-slate-600"
                    >
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!permissions &&
                  Array.from({ length: 8 }).map((_, index) => (
                    <tr
                      key={`skeleton-${index + 1}`}
                      className="border-b border-slate-100 bg-white last:border-b-0 even:bg-slate-50"
                    >
                      <td className="sticky left-0 z-10 w-[200px] min-w-[200px] max-w-[200px] bg-inherit px-4 py-3">
                        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                      </td>
                      {roles.map((role) => (
                        <td key={role} className="px-5 py-3 text-center">
                          <div className="mx-auto h-6 w-11 animate-pulse rounded-full bg-slate-200" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {permissions &&
                  permissionModuleRows.map((module) => (
                    <tr
                      key={module.key}
                      className="border-b border-slate-100 bg-white last:border-b-0 even:bg-slate-50"
                    >
                      <td className="sticky left-0 z-10 w-[200px] min-w-[200px] max-w-[200px] whitespace-normal break-words bg-inherit px-4 py-3 font-medium text-slate-600">
                        {module.label}
                      </td>
                      {roles.map((role) => {
                        const cell = resolveCell(role, module.key);

                        if (!cell) {
                          return (
                            <td
                              key={role}
                              className="px-5 py-3 text-center text-slate-400"
                            >
                              -
                            </td>
                          );
                        }

                        return (
                          <td key={role} className="px-5 py-3 text-center">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <Switch
                                checked={cell.checked}
                                className="max-w-2 !bg-slate-200 shadow-sm [&.ant-switch-checked]:!bg-primary/80 [&.ant-switch-checked]:!border-primary"
                                onChange={(checked) =>
                                  handleToggle(
                                    role,
                                    module.key,
                                    checked,
                                    cell.isViewOnly,
                                  )
                                }
                                aria-label={`${role} ${
                                  cell.isViewOnly ? "view-only " : ""
                                }permission for ${module.label}`}
                              />
                              {cell.isViewOnly && (
                                <span className="text-[11px] text-slate-500">
                                  View only
                                </span>
                              )}
                            </div>
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
          columns. A dash means the module does not apply to that role.
        </p>
      </div>
    </div>
  );
}
