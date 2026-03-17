import axiosInstance from "@/helpers/axios";

export const getCompanyList = async () => {
  try {
    const res = await axiosInstance.get(
      `/api/communication/collaboration/company/companylist`,
    );

    return res.data;
  } catch (error) {
    throw error;
  }
};
