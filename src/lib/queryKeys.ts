export const queryKeys = {
  clientList: "client-list",
  templateList: "template-list",
  vehicleByClientId: (clientId: number) => ["vehicle-by-client-id", clientId],
  estimatesByClientId: (clientId: number) => [
    "estimates-by-client-id",
    clientId,
  ],
  invoicesByClientId: (clientId: number) => ["invoices-by-client-id", clientId],
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
  servicePlaybooks: (params?: {
    companyId?: number;
    search?: string;
    categoryId?: number;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) => ["service-playbooks", params],
  conversationExamples: (params?: { companyId?: number }) => [
    "conversation-examples",
    params,
  ],
  knowledgeBaseDocuments: (params?: { companyId?: number }) => [
    "knowledge-base-documents",
    params,
  ],
  companyKnowledge: (params?: { companyId?: number }) => [
    "company-knowledge",
    params,
  ],
  overallFaqs: (params?: { companyId?: number }) => ["overall-faqs", params],
  aiPersonality: (params?: { companyId?: number }) => [
    "ai-personality",
    params,
  ],
  smsDelay: (params?: { companyId?: number }) => ["sms-delay", params],
};
