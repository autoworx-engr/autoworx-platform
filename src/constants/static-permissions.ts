export const staticPermissions = [
  {
    title: "Communication Hub: Internal",
    permission_name: "communicationHubInternal",
    status: false,
  },
  {
    title: "Communication Hub: Clients",
    permission_name: "communicationHubClients",
    status: false,
  },
  {
    title: "Communication Hub: Collaboration",
    permission_name: "communicationHubCollaboration",
    status: false,
  },
  {
    title: "Communication Hub",
    permission_name: "communicationHub",
    status: true,
  },
  { title: "Communication", permission_name: "communication", status: false },
  { title: "Calling Access", permission_name: "callingAccess", status: false },
  {
    title: "Estimates & Invoices",
    permission_name: "estimateInvoices",
    status: false,
  },
  { title: "Calendar & Task", permission_name: "calendar", status: false },
  { title: "Payments", permission_name: "payments", status: false },
  { title: "Directory", permission_name: "directory", status: false },
  {
    title: "Directory (Client)",
    permission_name: "clientDirectory",
    status: false,
  },
  {
    title: "Directory (Employee)",
    permission_name: "employeeDirectory",
    status: false,
  },
  {
    title: "Directory (Fleet)",
    permission_name: "fleetDirectory",
    status: false,
  },
  {
    title: "Reporting & Analytics",
    permission_name: "reporting",
    status: false,
  },
  { title: "Inventory", permission_name: "inventory", status: false },
  { title: "Integrations", permission_name: "integrations", status: false },
  { title: "All Automation", permission_name: "automation", status: false },
  { title: "Sales Pipeline", permission_name: "salesPipeline", status: false },
  { title: "Shop Pipeline", permission_name: "shopPipeline", status: false },
  { title: "Team Pipeline", permission_name: "teamPipeline", status: false },
  {
    title: "Business Settings",
    permission_name: "businessSettings",
    status: false,
  },
  {
    title: "Workforce Management",
    permission_name: "workforceManagement",
    status: false,
  },
  {
    title: "Service Estimator",
    permission_name: "serviceEstimator",
    status: false,
  },
  {
    title: "Pipeline Automation",
    permission_name: "pipelineAutomation",
    status: false,
  },
  {
    title: "Marketing Automation",
    permission_name: "marketingAutomation",
    status: false,
  },
  {
    title: "Communication Automation",
    permission_name: "communicationAutomation",
    status: false,
  },
  {
    title: "Invoice Automation",
    permission_name: "invoiceAutomation",
    status: false,
  },
  {
    title: "Inventory Automation",
    permission_name: "inventoryAutomation",
    status: false,
  },
  {
    title: "Tag Automation",
    permission_name: "tagAutomation",
    status: false,
  },
  {
    title: "Service Automation",
    permission_name: "serviceAutomation",
    status: false,
  },
  // {
  //   title: 'Reputation Management',
  //   permission_name: 'reputationManagement',
  //   status: false,
  // },
  {
    title: "AI Smart Replies",
    permission_name: "aiSmartReplies",
    status: false,
  },
  {
    title: "Visualization",
    permission_name: "visualization",
    status: false,
  },
  {
    title: "AI Sales Agent",
    permission_name: "sales-agent",
    status: false,
  },
  {
    title: "Virtual Shop",
    permission_name: "virtual-shop",
    status: false,
  },
  {
    title: "Reporting Automation",
    permission_name: "reportingAutomation",
    status: false,
  },
  {
    title: "Messenger",
    permission_name: "messenger",
    status: false,
  },
  {
    title: "Instagram",
    permission_name: "instagram",
    status: false,
  },
];

export const CHILD_PERMISSIONS = [
  "fleetDirectory",
  "clientDirectory",
  "employeeDirectory",
];
export const AUTOMATION_CHILD_PERMISSIONS = [
  "pipelineAutomation",
  "marketingAutomation",
  "communicationAutomation",
  "invoiceAutomation",
  "inventoryAutomation",
  "serviceAutomation",
  "tagAutomation",
  "reportingAutomation",
];
export const COMMUNICATION_HUB_CHILD_PERMISSIONS = [
  "communicationHubInternal",
  "communicationHubClients",
  "communicationHubCollaboration",
];
