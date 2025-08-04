export const moduleOptions = [
  {
    id: "1",
    label: "Dashboard",
    value: "dashboard",
  },
  {
    id: "2",
    label: "Communication Hub",
    value: "communication-hub",
    children: [
      { id: "2-1", label: "Client", value: "client" },
      { id: "2-2", label: "Internal", value: "internal" },
      { id: "2-3", label: "Collaboration", value: "collaboration" },
    ],
  },
  {
    id: "3",
    label: "Pipelines",
    value: "pipelines",
    children: [
      { id: "3-1", label: "Sales Pipelines", value: "sales-pipelines" },
      { id: "3-2", label: "Shop Pipelines", value: "shop-pipelines" },
    ],
  },
  {
    id: "4",
    label: "Task And Activity Management",
    value: "task-and-activity-management",
  },

  {
    id: "5",
    label: "Analytics And Reporting",
    value: "analytics-and-reporting",
    children: [
      { id: "5-1", label: "Revenue", value: "revenue" },
      { id: "5-2", label: "Inventory", value: "inventory" },
      { id: "5-3", label: "Leads", value: "leads" },
      { id: "5-4", label: "Payments", value: "payments" },
      { id: "5-5", label: "Teams", value: "teams" },
    ],
  },
  {
    id: "6",
    label: "Invoices",
    value: "invoices",
    children: [
      { id: "6-1", label: "Estimates", value: "estimates" },
      { id: "6-2", label: "Invoices", value: "invoices" },
      { id: "6-3", label: "Canned", value: "canned" },
    ],
  },
  {
    id: "7",
    label: "Payments",
    value: "payments",
    children: [
      { id: "7-1", label: "Transactions", value: "transactions" },
      { id: "7-2", label: "Coupons", value: "coupons" },
    ],
  },
  {
    id: "8",
    label: "Inventory",
    value: "inventory",
    children: [
      { id: "8-1", label: "Inventory List", value: "inventory-list" },
      { id: "8-2", label: "Vendor List", value: "vendor-list" },
      { id: "8-3", label: "Camera", value: "camera" },
    ],
  },
  {
    id: "9",
    label: "Directory",
    value: "directory",
    children: [
      { id: "9-1", label: "Employee", value: "employee" },
      { id: "9-2", label: "Client", value: "client" },
      { id: "9-3", label: "Fleet", value: "fleet" },
    ],
  },
  {
    id: "10",
    label: "Settings",
    value: "settings",
    children: [
      { id: "10-1", label: "My Account", value: "my-account" },
      { id: "10-2", label: "Notifications", value: "notifications" },
      { id: "10-3", label: "Business Profile", value: "business-profile" },
      { id: "10-4", label: "My Network", value: "my-network" },
      { id: "10-5", label: "Team Management", value: "team-management" },
      { id: "10-6", label: "Payments Settings", value: "payments-settings" },
      {
        id: "10-7",
        label: "Estimates & Invoices",
        value: "estimates-and-invoices",
      },
      {
        id: "10-8",
        label: "Communication Hub Settings",
        value: "communication-hub-settings",
      },
      { id: "10-9", label: "Lead Generation", value: "lead-generation" },
      {
        id: "10-10",
        label: "Pipeline Automation",
        value: "pipeline-automation",
      },
      {
        id: "10-11",
        label: "Communication Automation",
        value: "communication-automation",
      },
      {
        id: "10-12",
        label: "Marketing Automation",
        value: "marketing-automation",
      },
      {
        id: "10-13",
        label: "Service Maintenance Automation",
        value: "service-automation",
      },
      { id: "10-14", label: "Invoice Automation", value: "invoice-automation" },
      {
        id: "10-15",
        label: "Inventory Automation",
        value: "inventory-automation",
      },
    ],
  },
];
