const statusOrder = [
  "Pending",
  "In Progress",
  "Completed",
  "Ongoing",
  "Opportunity",
  "Converted",
  "Cancelled",
  "Re-Dos",
  "Follow Up",
  "Lead Lost",
  "Delivered",
];

export const getStatusPriority = (statusTitle: string): number => {
  const normalizedTitle = statusTitle?.toLowerCase().trim();
  console.log("normalizedTitle", normalizedTitle);
  // Find exact match first
  const exactIndex = statusOrder.findIndex(
    (status) => status.toLowerCase() === normalizedTitle
  );
  if (exactIndex !== -1) return exactIndex;

  // Find partial match
  const partialIndex = statusOrder.findIndex(
    (status) =>
      normalizedTitle?.includes(status.toLowerCase()) ||
      status?.toLowerCase()?.includes(normalizedTitle)
  );
  if (partialIndex !== -1) return partialIndex;

  // Unknown statuses go to the end
  return statusOrder.length;
};
