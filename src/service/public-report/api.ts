import axiosInstance from "@/helpers/axios";
import { ReportData } from "@/types/report";

export const getPublicReportData = async (
  companyId: number,
  startDate: string,
  endDate: string,
): Promise<ReportData> => {
  try {
    const response = await axiosInstance.get(`/report-data/${companyId}`, {
      params: {
        startDate,
        endDate,
      },
    });
    return response.data.data;
  } catch (error) {
    throw error;
  }
};
