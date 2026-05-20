import axiosInstance from "@/helpers/axios";

export const getCompanyDetails = async ({
  companyId,
  userId,
  currentCompanyId,
}: {
  companyId: number;
  userId: number;
  currentCompanyId?: number;
}) => {
  const res = await axiosInstance.get(
    `/api/communication/collaboration/profile`,
    {
      params: {
        companyId,
        userId,
        currentCompanyId: currentCompanyId ?? "",
      },
    },
  );
  return res.data;
};
