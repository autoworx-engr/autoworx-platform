export const taskQueryKey = {
  allTasks: "all-tasks",
  allTaskByScroll: ["all-tasks", "scroll"],
  taskById: (taskId: string) => ["task", taskId],
  userTasks: "user-tasks",
  taskByUserId: (userId: string) => ["user-tasks", userId],
};

export const userQueryKey = {
  users: "users",
  companyUsers: "companyUsers",
  employees: "employees",
};

export const appointmentQueryKey = {
  allAppointments: "all-appointments",
  allAppointmentsByScroll: ["all-appointments", "scroll"],
  appointmentByUserId: (userId: string) => ["user-appointments", userId],
};

export const calenderQueryKey = {
  calendarSettings: "calendarSettings",
  holidays: "holidays",
  weekStartEndDaysSettings: "weekStartEndDaysSettings",
};

export const emailTemplateQueryKey = {
  templates: "email-templates",
};
