// utils/api.ts or any location
export const fetchLeadInfo = async ({
  timezone,
  startDate,
  endDate,
}: {
  timezone: string;
  startDate?: string;
  endDate?: string;
}) => {
  const params = new URLSearchParams();
  params.append("timezone", timezone);
  if (startDate) params.append("startDate", decodeURIComponent(startDate));
  if (endDate) params.append("endDate", decodeURIComponent(endDate));

  const res = await fetch(`/api/lead-info?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch lead info");
  return res.json();
};
