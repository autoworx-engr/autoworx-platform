import axiosInstance from "@/helpers/axios";

interface IReportingAutomationData {
  title: string;
  stageId: number[];
  actionType: string;
  targetColumnId: number;
  timeDelay?: number;
  companyId: number;
  TTimeUnit?: string;
}

export const createReportingAutomationRule = async (payload: any) => {
  try {
    const response = await axiosInstance.post("/reporting-automation", payload);

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const AllReportingAutomationRules = async (companyId: number) => {
  try {
    const response = await axiosInstance.get(
      `/reporting-automation?companyId=${companyId}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const findOneReportingAutomationRules = async (id: number) => {
  try {
    const response = await axiosInstance.get(`/reporting-automation/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateReportingAutomationRule = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.patch(
      `/reporting-automation/${id}`,
      data,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteReportingAutomationRule = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`/reporting-automation/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
