export const queryKeys = {
  clientList: "client-list",
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
};
