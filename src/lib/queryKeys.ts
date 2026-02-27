export const queryKeys = {
  clientList: "client-list",
  templateList: "template-list",
  vehicleByClientId: (clientId: number) => ["vehicle-by-client-id", clientId],
  estimatesByClientId: (clientId: number) => [
    "estimates-by-client-id",
    clientId,
  ],
  appointmentById: (appointmentId: number) => [
    "appointment-by-id",
    appointmentId,
  ],
  company: "company",
  dashboardTask: ["tasks", "dashboard"],
  getInvoiceModalDataKey: (invoiceId: string) => [
    "invoice-modal-data",
    invoiceId,
  ],
  getWorkOrderDataKey: (invoiceId: string) => ["work-order-data", invoiceId],
  getNotifications: (userId: number) => ["notifications", userId],
};
