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

  const exactIndex = statusOrder.findIndex(
    (status) => status.toLowerCase() === normalizedTitle
  );
  if (exactIndex !== -1) return exactIndex;

  const partialIndex = statusOrder.findIndex(
    (status) =>
      normalizedTitle?.includes(status.toLowerCase()) ||
      status?.toLowerCase()?.includes(normalizedTitle)
  );
  if (partialIndex !== -1) return partialIndex;

  return statusOrder.length;
};
