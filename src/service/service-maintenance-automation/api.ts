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
      "/communication-automation-rules",
      payload,
    );
    console.log(response.data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const AllServiceMaintenanceAutomationRules = async () => {
  try {
    const response = await axiosInstance.get(`/communication-automation-rules`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const findOneServiceMaintenanceAutomationRules = async (id: number) => {
  try {
    const response = await axiosInstance.get(
      `/communication-automation-rules/${id}`,
    );
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
      `/communication-automation-rules/${id}`,
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
      `/communication-automation-rules/${id}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
