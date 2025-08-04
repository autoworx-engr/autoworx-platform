'use server';

import { serverAxios } from '@/helpers/server-axios';

export const allFeaturePermissions = async () => {
  try {
    const response = await serverAxios.get(`/admin/permissions/companies`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const allCompanyFeaturePermissions = async (companyId: number) => {
  console.log("companyId", companyId)
  try {
    const response = await serverAxios.get(
      `/admin/permissions/companies/${companyId}`
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updatePermission = async (
  companyId: number,
  permission_name: string,
  enabled: boolean
) => {
  const payload = {
    [permission_name]: enabled,
  };

  try {
    const response = await serverAxios.put(
      `/admin/permissions/companies/${companyId}`,
      payload
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
  enabled: boolean
) => {
  const payload = {
    permissions : [
      {
    companyId,
   permissionName: permission_name,
    enabled,
    title
  }
    ]
  }

  try {
    const response = await serverAxios.post(
      `/admin/permissions/companies/bulk`,
     payload
    );

    console.log(response, "response")
    return response.data.data || response.data;
  } catch (error) {
    throw error;
  }
};
