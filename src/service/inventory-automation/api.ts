import axiosInstance from "@/helpers/axios";

interface IInventoryData {
  title: string;
  stageId: number[];
  conditionType: string;
  actionType: string;
  targetColumnId: number;
  timeDelay?: number;
  companyId: number;
  TTimeUnit?: string;
}

export const createInventoryAutomationRule = async (payload: any) => {
  try {
    const response = await axiosInstance.post(
      "/inventory-automation-rule",
      payload,
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const AllInventoryAutomationRules = async (companyId: number) => {
  try {
    const response = await axiosInstance.get(
      `/inventory-automation-rule?companyId=${companyId}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const findOneInventoryAutomationRules = async (id: number) => {
  try {
    const response = await axiosInstance.get(
      `/inventory-automation-rule/${id}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateInventoryAutomationRule = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.patch(
      `/inventory-automation-rule/${id}`,
      data,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteInventoryAutomationRule = async (id: string) => {
  try {
    const response = await axiosInstance.delete(
      `/inventory-automation-rule/${id}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
