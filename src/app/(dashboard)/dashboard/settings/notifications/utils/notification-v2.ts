import {
  EmployeeType,
  NotificationSection,
  NotificationType,
} from "@prisma/client";
const notificationTypes: { type: NotificationType; roles: EmployeeType[] }[] = [
  {
    type: "TASK_ASSIGNED",
    roles: ["Admin", "Manager", "Technician", "Sales", "Other"],
  },
  { type: "TASK_FINISHED", roles: ["Admin", "Manager", "Technician", "Sales"] },
  {
    type: "APPOINTMENT_CREATED",
    roles: ["Admin", "Manager", "Technician", "Sales"],
  },
  {
    type: "APPOINTMENT_UPDATED",
    roles: ["Admin", "Manager", "Technician", "Sales"],
  },
  {
    type: "APPOINTMENT_REMINDER",
    roles: ["Admin", "Manager", "Technician", "Sales"],
  },
  { type: "TASK_REMINDER", roles: ["Admin", "Manager", "Technician", "Sales"] },
  { type: "LEADS_GENERATED", roles: ["Admin", "Manager", "Sales"] },
  { type: "LEADS_CLOSED", roles: ["Admin", "Manager", "Sales"] },
  // { type: "FOLLOW_UP", roles: ["Admin", "Manager"] }, // temporarily removed
  { type: "LEADS_ASSIGNED", roles: ["Admin", "Manager", "Sales"] },
  { type: "STAGE", roles: ["Admin", "Manager", "Sales"] },
  { type: "ESTIMATE_CREATED", roles: ["Admin", "Manager"] },
  { type: "INVOICE_DELIVERY", roles: ["Admin", "Manager"] },
  // { type: "INVOICE_CREATED", roles: ["Admin", "Manager"] }, // temporarily removed
  { type: "INVOICE_CONVERTED", roles: ["Admin", "Manager"] },
  { type: "INVOICE_AUTHORIZED", roles: ["Admin", "Manager"] },
  { type: "PAYMENT_RECEIVED", roles: ["Admin", "Manager"] },
  // { type: "PAYMENT_DUE", roles: ["Admin", "Manager"] }, // temporarily removed
  // { type: "DEPOSIT", roles: ["Admin", "Manager"] }, // temporarily removed
  {
    type: "WORK_ORDER_CREATED",
    roles: ["Admin", "Manager"],
  },
  { type: "WORK_ORDER_COMPLETED", roles: ["Admin", "Manager"] },
  // { type: "DUE_DATE_PROXIMITY", roles: ["Admin", "Manager"] }, // temporarily removed
  {
    type: "INVENTORY_COMPLETELY_OUT",
    roles: ["Admin", "Manager", "Sales"],
  },
  { type: "INVENTORY_NEWLY_ADDED", roles: ["Admin", "Manager", "Sales"] },
  { type: "INVENTORY_LOW", roles: ["Admin", "Manager", "Sales"] },
  // { type: "LEAVE_REQUEST", roles: ["Admin", "Manager"] }, // temporarily removed
  // { type: "PERFORMANCE_CHANGES", roles: ["Admin", "Manager"] }, // temporarily removed
  // { type: "LATE_ARRIVALS", roles: ["Admin", "Manager"] }, // temporarily removed
  // { type: "EARLY_LEAVE", roles: ["Admin", "Manager"] }, // temporarily removed
  { type: "JOB_COMPLETED", roles: ["Admin", "Manager", "Technician"] },
  { type: "JOB_ASSIGNED", roles: ["Admin", "Manager", "Technician"] },
  {
    type: "INTERNAL_MESSAGE_ALERT",
    roles: ["Admin", "Manager", "Sales", "Technician", "Other"],
  },
  { type: "CLIENT_MESSAGE_ALERT", roles: ["Admin", "Manager", "Sales"] },
  { type: "CLIENT_CALL_ALERT", roles: ["Admin", "Manager", "Sales"] },
  { type: "CLIENT_EMAIL_ALERT", roles: ["Admin", "Manager", "Sales"] },
  { type: "COLLABORATION_MESSAGE_ALERT", roles: ["Admin", "Manager", "Sales"] },
  { type: "COLLABORATION_INVITATION", roles: ["Admin", "Manager", "Sales"] },
];

const sectionMapping: { [key: string]: string } = {
  TASK_ASSIGNED: "CALENDAR_AND_TASK",
  TASK_FINISHED: "CALENDAR_AND_TASK",
  TASK_REMINDER: "CALENDAR_AND_TASK",
  APPOINTMENT_CREATED: "CALENDAR_AND_TASK",
  APPOINTMENT_REMINDER: "CALENDAR_AND_TASK",
  APPOINTMENT_UPDATED: "CALENDAR_AND_TASK",

  LEADS_GENERATED: "LEAD_GENERATED_AND_SALES_PIPELINE",
  LEADS_CLOSED: "LEAD_GENERATED_AND_SALES_PIPELINE",
  // FOLLOW_UP: "LEAD_GENERATED_AND_SALES_PIPELINE", // temporarily removed
  LEADS_ASSIGNED: "LEAD_GENERATED_AND_SALES_PIPELINE",
  STAGE: "LEAD_GENERATED_AND_SALES_PIPELINE",

  ESTIMATE_CREATED: "ESTIMATE_AND_INVOICE",
  // INVOICE_CREATED: "ESTIMATE_AND_INVOICE", // temporarily removed
  INVOICE_CONVERTED: "ESTIMATE_AND_INVOICE",
  INVOICE_AUTHORIZED: "ESTIMATE_AND_INVOICE",
  INVOICE_DELIVERY: "ESTIMATE_AND_INVOICE",

  PAYMENT_RECEIVED: "PAYMENT",
  // PAYMENT_DUE: "PAYMENT", // temporarily removed
  // DEPOSIT: "PAYMENT", // temporarily removed

  WORK_ORDER_CREATED: "OPERATION_PIPELINE",
  WORK_ORDER_COMPLETED: "OPERATION_PIPELINE",
  // DUE_DATE_PROXIMITY: "OPERATION_PIPELINE", // temporarily removed

  INVENTORY_COMPLETELY_OUT: "INVENTORY",
  INVENTORY_NEWLY_ADDED: "INVENTORY",
  INVENTORY_LOW: "INVENTORY",

  // LEAVE_REQUEST: "WORK_FORCE", // Temporarily removed
  // PERFORMANCE_CHANGES: "WORK_FORCE",
  // LATE_ARRIVALS: "WORK_FORCE",
  // EARLY_LEAVE: "WORK_FORCE",
  JOB_COMPLETED: "WORK_FORCE",
  JOB_ASSIGNED: "WORK_FORCE",

  INTERNAL_MESSAGE_ALERT: "COMMUNICATIONS",
  CLIENT_MESSAGE_ALERT: "COMMUNICATIONS",
  CLIENT_CALL_ALERT: "COMMUNICATIONS",
  CLIENT_EMAIL_ALERT: "COMMUNICATIONS",
  COLLABORATION_MESSAGE_ALERT: "COMMUNICATIONS",
  COLLABORATION_INVITATION: "COMMUNICATIONS",
};

export const notificationCategories = [
  "CALENDAR_AND_TASK",
  "LEAD_GENERATED_AND_SALES_PIPELINE",
  "ESTIMATE_AND_INVOICE",
  "PAYMENT",
  "OPERATION_PIPELINE",
  "INVENTORY",
  "WORK_FORCE",
  "COMMUNICATIONS",
] as NotificationSection[];

export const getDefaultNotificationSettings = (role: EmployeeType) => {
  const notificationSettings = notificationTypes.filter((notification) => {
    return notification.roles.includes(role);
  });
  const notificationSettingsWithSection = notificationSettings.map(
    (notification) => {
      const { type } = notification;
      return {
        section: sectionMapping[type] as NotificationSection,
        notification_type: type,
        email_enabled: false,
        push_enabled: false,
        text_enabled: false,
      };
    },
  );
  return notificationSettingsWithSection;
};
