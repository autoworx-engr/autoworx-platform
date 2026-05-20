"use server";

import { serverAxios } from "@/helpers/server-axios";

export const allFeaturePermissions = async () => {
  try {
    const response = await serverAxios.get(`/admin/permissions/companies`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const allCompanyFeaturePermissions = async (companyId: number) => {
  try {
    const response = await serverAxios.get(
      `/admin/permissions/companies/${companyId}`,
    );

    return response.data;
  } catch (error) {
    console.error(
      `Failed to fetch feature permissions for company ${companyId}:`,
      error,
    );
    return null;
  }
};

export const updatePermission = async (
  companyId: number,
  permission_name: string,
  enabled: boolean,
) => {
  const payload = {
    [permission_name]: enabled,
  };

  try {
    const response = await serverAxios.put(
      `/admin/permissions/companies/${companyId}`,
      payload,
    );
    return response.data.data || response.data;
  } catch (error) {
    throw error;
  }
};

export const bulkUpdatePermissions = async (
  companyId: number,
  permissions: Array<{
    permission_name: string;
    enabled: boolean;
  }>,
) => {
  // Create payload with all permissions as key-value pairs
  const payload = permissions.reduce(
    (acc, perm) => {
      acc[perm.permission_name] = perm.enabled;
      return acc;
    },
    {} as Record<string, boolean>,
  );

  try {
    const response = await serverAxios.put(
      `/admin/permissions/companies/${companyId}`,
      payload,
    );
    return response.data.data || response.data;
  } catch (error) {
    throw error;
  }
};

export const createPermission = async (
  companyId: number,
  permission_name: string,
  title: string,
  enabled: boolean,
) => {
  const payload = {
    permissions: [
      {
        companyId,
        permissionName: permission_name,
        enabled,
        title,
      },
    ],
  };

  try {
    const response = await serverAxios.post(
      `/admin/permissions/companies/bulk`,
      payload,
    );

    console.log(response, "response");
    return response.data.data || response.data;
  } catch (error) {
    throw error;
  }
};
