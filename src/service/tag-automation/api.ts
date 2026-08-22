import axiosInstance from "@/helpers/axios";

export const createTagAutomationRule = async (payload: any) => {
  try {
    const response = await axiosInstance.post("/tag-automation-rules", payload);

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const AllTagAutomationRules = async (companyId: number) => {
  try {
    const response = await axiosInstance.get(
      `/tag-automation-rules?companyId=${companyId}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const findOneTagAutomationRule = async (id: number) => {
  try {
    const response = await axiosInstance.get(`/tag-automation-rules/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateTagAutomationRule = async (
  id: string,
  companyId: string,
  data: any,
) => {
  try {
    const response = await axiosInstance.patch(
      `/tag-automation-rules/${id}?companyId=${companyId}`,
      data,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteTagAutomationRule = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`/tag-automation-rules/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
