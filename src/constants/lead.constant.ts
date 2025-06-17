export type TActionType = {
  MORE_LEADS: "more-leads";
  DRAG_END: "drag-end";
  RELOAD_STATE: "reload-state";
  REMOVE_LEAD: "remove-lead";
  ADD_TAG: "add-tag";
  REMOVE_TAG: "remove-tag";
  ADD_SALES_USER: "add-sales-user";
  CREATE_INVOICE: "create-invoice";
  CREATE_LEAD_TASK: "update-lead-task";
  REMOVE_SALES_USER: "remove-sales-user";
  ADD_APPOINTMENT: "add-appointment";
  AUTOMATION_TRIGGER: "automation-trigger";
};

export const defaultTake = 10;
export const defaultSkip = 0;

export const actionTypes: TActionType = {
  MORE_LEADS: "more-leads",
  DRAG_END: "drag-end",
  RELOAD_STATE: "reload-state",
  REMOVE_LEAD: "remove-lead",
  ADD_TAG: "add-tag",
  REMOVE_TAG: "remove-tag",
  ADD_SALES_USER: "add-sales-user",
  CREATE_INVOICE: "create-invoice",
  CREATE_LEAD_TASK: "update-lead-task",
  REMOVE_SALES_USER: "remove-sales-user",
  ADD_APPOINTMENT: "add-appointment",
  AUTOMATION_TRIGGER: "automation-trigger",
};
