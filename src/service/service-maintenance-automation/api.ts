import axiosInstance from "@/helpers/axios";

interface IServiceMaintenanceData {
  title: string;
  stageId: number[];
  conditionType: string;
  actionType: string;
  targetColumnId: number;
  timeDelay?: number;
  companyId: number;
  TTimeUnit?: string;
}

export const createServiceMaintenanceAutomationRule = async (payload: any) => {
  try {
    const response = await axiosInstance.post(
      "/service-automation-rule",
      payload,
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const AllServiceMaintenanceAutomationRules = async (
  companyId: number,
) => {
  try {
    const response = await axiosInstance.get(
      `/service-automation-rule?companyId=${companyId}`,
    );
    return response.data.data;
  } catch (error) {
    throw error;
  }
};

export const findOneServiceMaintenanceAutomationRules = async (id: number) => {
  try {
    const response = await axiosInstance.get(`/service-automation-rule/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateServiceMaintenanceAutomationRule = async (
  id: string,
  data: any,
) => {
  try {
    const response = await axiosInstance.patch(
      `/service-automation-rule/${id}`,
      data,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteServiceMaintenanceAutomationRule = async (id: string) => {
  try {
    const response = await axiosInstance.delete(
      `/service-automation-rule/${id}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
