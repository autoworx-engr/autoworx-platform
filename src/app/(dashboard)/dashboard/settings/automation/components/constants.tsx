export const conditions = [
  { id: "APPOINTMENT_SCHEDULED", title: "Appointment Scheduled" },
  { id: "ESTIMATE_CREATED", title: "Estimate Created" },
  { id: "TASK_CREATED", title: "Task Created" },
  { id: "MESSAGE_SENT_CLIENT", title: "Message Sent Client" },
  { id: "MESSAGE_RECEIVED_CLIENT", title: "Message Received Client" },
  { id: "TIME_DELAY", title: "Time Delay" },
];

export const invoiceTypeOptions = [
  { id: "Invoice", title: "Invoice" },
  { id: "Estimate", title: "Estimate" },
];

export const actionTypeOption = [
  { id: "MOVE_TO_STAGE", title: "Move to stage" },
  { id: "SEND_EMAIL", title: "Send email" },
  { id: "CREATE_TASK", title: "Create task" },
  { id: "ASSIGN_USER", title: "Assign user" },
];

export const timeDelays = [
  "30 seconds",
  "1 minute",
  "2 minutes",
  "5 minutes",
  "10 minutes",
  "15 minutes",
  "30 minutes",
  "45 minutes",
  "1 hour",
  "2 hours",
  "3 hours",
  "5 hours",
  "6 hours",
  "10 hours",
  "12 hours",
  "1 day",
  "2 days",
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "1 month",
  "2 months",
  "3 months",
  "6 months",
  "9 months",
  "1 year",
  "1.5 year",
  "2 year",
  "3 year",
];

export const invoiceTimeDelays = [
  "Instant",
  "30 seconds",
  "1 minute",
  "2 minutes",
  "5 minutes",
  "10 minutes",
  "15 minutes",
  "30 minutes",
  "45 minutes",
  "1 hour",
  "2 hours",
  "3 hours",
  "5 hours",
  "6 hours",
  "10 hours",
  "12 hours",
  "1 day",
  "2 days",
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "1 month",
  "2 months",
  "3 months",
  "6 months",
  "9 months",
  "1 year",
  "1.5 year",
  "2 year",
  "3 year",
];

export const targetOptions = [
  { id: "ALL_CLIENTS", title: "All clients" },
  { id: "WITH_ESTIMATE", title: "With an estimate" },
  { id: "WITH_INVOICE", title: "With an invoice" },
  { id: "WITHOUT_AN_ESTIMATE", title: "Without an estimate" },
  { id: "INVOICE", title: "Invoice" },
];

export const targetConditions = [
  { id: "ALL_CLIENTS_THIS_MONTH", title: "All clients this month" },
  { id: "ALL_CLIENTS_THIS_YEAR", title: "All clients this year" },
  { id: "ALL_CLIENTS_FROM_1_MONTH", title: "All clients from 1 month" },
  { id: "ALL_CLIENTS_FROM_2_MONTHS", title: "All clients from 2 months" },
  { id: "ALL_CLIENTS_FROM_3_MONTHS", title: "All clients from 3 months" },
  { id: "ALL_CLIENTS_FROM_6_MONTHS", title: "All clients from 6 months" },
  { id: "ALL_CLIENTS_FROM_LAST_YEAR", title: "All clients from last year" },
];
export type AutomationType =
  | "PIPELINE"
  | "COMMUNICATION"
  | "MARKETING"
  | "SERVICE_MAINTENANCE"
  | "INVOICE"
  | "INVENTORY"
  | "REPORTING";

export type CommunicationType = "SMS" | "EMAIL" | "BOTH";

export function getTitleById(
  id: string,
  targetOptions: any,
): string | undefined {
  return targetOptions.find((option: any) => option.id === id)?.title;
}

export const Frequency = [
  { id: "DAILY", title: "Daily" },
  { id: "WEEKLY", title: "Weekly" },
  { id: "MONTHLY", title: "Monthly" },
  { id: "EVERY_TWO_MONTHS", title: "Every Two Months" },
];
export const ReportingAutomationFrequency = [
  { id: "DAILY", title: "Daily" },
  { id: "WEEKLY", title: "Weekly" },
  { id: "MONTHLY", title: "Monthly" },
  { id: "YEARLY", title: "Yearly" },
];

export const DaysOfWeek = [
  { id: "MONDAY", title: "Monday" },
  { id: "TUESDAY", title: "Tuesday" },
  { id: "WEDNESDAY", title: "Wednesday" },
  { id: "THURSDAY", title: "Thursday" },
  { id: "FRIDAY", title: "Friday" },
  { id: "SATURDAY", title: "Saturday" },
  { id: "SUNDAY", title: "Sunday" },
];
export const InventoryConditions = [
  { id: "LOW_STOCK", title: "Low Stock" },
  { id: "OUT_OF_STOCK", title: "Out of Stock" },
  { id: "BOTH", title: "Both" },
];
export const InventoryActions = [
  { id: "EMAIL", title: "Send Re-order List by Email" },
  { id: "SMS", title: "Send Re-order List by SMS" },
  { id: "BOTH", title: "Send Re-order List by Both" },
];
export const ReportingActions = [
  { id: "EMAIL", title: "Send Report by Email" },
  { id: "SMS", title: "Send Report by SMS" },
  { id: "BOTH", title: "Send Report by Both" },
];

export const PipelineType = [
  { id: "SALES", title: "Sales Pipeline" },
  { id: "SHOP", title: "Shop Pipeline" },
];

export const Funnels = [
  { id: "all", title: "All Funnels" },
  { id: "lead", title: "Lead Funnels" },
  { id: "qualified", title: "Qualified" },
  { id: "proposal", title: "Proposal" },
  { id: "negotiation", title: "Negotiation" },
  { id: "closed", title: "Closed" },
];

export const Conditions = [
  { id: "pipeline", title: "Pipeline" },
  { id: "communication", title: "Communication" },
  { id: "post_tag", title: "Post-Tag" },
];
