export const getCompanyDetails = async ({
  companyId,
  userId,
  currentCompanyId,
}: {
  companyId: number;
  userId: number;
  currentCompanyId?: number;
}) => {
  const params = new URLSearchParams({
    companyId: String(companyId),
    userId: String(userId),
    currentCompanyId: String(currentCompanyId ?? ""),
  });

  const res = await fetch(
    `/api/communication/collaboration/profile?${params.toString()}`,
  );

  if (!res.ok) {
    throw new Error("Failed to fetch company details");
  }

  return res.json();
};
