import { sendUserNotifications } from "@/actions/notification/sendUserNotification";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { EmployeeType } from "@prisma/client";
import moment from "moment";
import { getCompanyId } from "../companyId";
import getUser from "../getUser";

type TNewAppointmentNotification = {
  title: string;
  appointmentDate: string;
  startTime: string;
  assignSalesIds: number[];
  companyId?: number;
  clientName?: string;
  sendRoles?: EmployeeType[];
};
type TNewTaskNotification = {
  title: string;
  appointmentDate?: Date | null;
  startTime: string;
  companyId?: number;
  clientName?: string;
  sendRoles?: EmployeeType[];
};

// send notification for new Appointment create
export const sendNewAppointmentNotification = async ({
  companyId,
  title,
  clientName,
  appointmentDate,
  startTime,
  assignSalesIds,
  sendRoles = ["Admin", "Manager"],
}: TNewAppointmentNotification) => {
  try {
    const companyUniqueId = companyId || (await getCompanyId());
    // update technician status to complete
    // get all company admins and managers
    const getUsers = await getUsersByRole(companyUniqueId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    // Validate appointment date and time
    if (!moment(appointmentDate, "YYYY-MM-DD", true).isValid()) {
      throw new Error(
        "Invalid appointment date format. Expected format is YYYY-MM-DD.",
      );
    }

    const formattedDate = moment(appointmentDate).format("MM-DD-YYYY");
    const timeMoment = moment(startTime, "HH:mm");
    const timeText = timeMoment.isValid()
      ? ` at ${timeMoment.format("hh:mm A")}`
      : "";
    const description = clientName
      ? `Appointment with ${clientName} on ${formattedDate}${timeText} has been created. Check your Autoworx calendar.`
      : `Appointment ${title} on ${formattedDate}${timeText} has been created. Check your Autoworx calendar.`;

    const sendNotiInfo = {
      title: "New Appointment",
      companyId: companyUniqueId,
      type: "task",
      redirectUrl: `/dashboard/task/day?date=${formattedDate}`,
      description: description,
    };

    const uniqueUsersToNotify = new Map<number, any>();

    for (const user of getUsers) {
      uniqueUsersToNotify.set(user.id, user);
    }

    // Add assigned sales, checking for duplicates
    for (const salesId of assignSalesIds) {
      if (!uniqueUsersToNotify.has(salesId)) {
        const assignUser = await getUser(salesId);
        uniqueUsersToNotify.set(salesId, {
          id: salesId,
          firstName: assignUser.firstName,
          lastName: assignUser.lastName,
          email: assignUser.email,
          phone: assignUser.phone,
        });
      }
    }

    for (const user of uniqueUsersToNotify.values()) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId: companyUniqueId,
        iconType: sendNotiInfo.type as "task",
        title: sendNotiInfo.title,
        description,
        type: "APPOINTMENT_CREATED",
        redirectUrl: sendNotiInfo.redirectUrl,
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};
// send notification for new task create
export const sendNewTaskNotification = async ({
  companyId,
  title,
  clientName,
  appointmentDate,
  startTime,
  sendRoles = ["Admin", "Manager"],
}: TNewTaskNotification) => {
  try {
    const companyUniqueId = companyId || (await getCompanyId());
    // update technician status to complete
    // get all company admins and managers
    const getUsers = await getUsersByRole(companyUniqueId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    const date = moment(appointmentDate);
    const formattedDate = date.isValid()
      ? date.format("MM-DD-YYYY")
      : moment().format("MM-DD-YYYY");
    const timeMoment = moment(startTime, "HH:mm");
    const timeText = timeMoment.isValid()
      ? ` at ${timeMoment.format("hh:mm A")}`
      : "";
    const description = clientName
      ? `Task with ${clientName} on ${formattedDate}${timeText} has been created. Check your Autoworx calendar.`
      : `Task ${title} on ${formattedDate}${timeText} has been created. Check your Autoworx calendar.`;

    const sendNotiInfo = {
      title: "New Task",
      companyId: companyUniqueId,
      type: "task",
      redirectUrl: `/dashboard/task/day?date=${formattedDate}`,
      description: description,
    };

    for (const user of getUsers) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId: companyUniqueId,
        iconType: sendNotiInfo.type as "task",
        title: sendNotiInfo.title,
        description,
        type: "APPOINTMENT_CREATED",
        redirectUrl: sendNotiInfo.redirectUrl,
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// send notification for update Appointment
type TUpdateAppointmentNotification = {
  title: string;
  appointmentDate: string;
  startTime: string;
  assignSalesIds: number[];
  companyId: number;
  sendRoles?: EmployeeType[];
  clientName: string;
};

export const sendAppointmentUpdateNotification = async ({
  companyId,
  title,
  appointmentDate,
  startTime,
  assignSalesIds,
  sendRoles = ["Admin", "Manager"],
  clientName,
}: TUpdateAppointmentNotification) => {
  try {
    const getUsers = await getUsersByRole(companyId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });
    // Validate appointment date and time
    if (!moment(appointmentDate, "YYYY-MM-DD", true).isValid()) {
      throw new Error(
        "Invalid appointment date format. Expected format is YYYY-MM-DD.",
      );
    }

    const formattedDate = moment(appointmentDate).format("YYYY-MM-DD");
    const timeMoment = moment(startTime, "HH:mm");
    const timeText = timeMoment.isValid()
      ? ` at ${timeMoment.format("hh:mm A")}`
      : "";

    // new description
    const sendNotiInfo = {
      title: "Update Appointment",
      companyId: companyId,
      type: "task",
      redirectUrl: `/dashboard/task/day?date=${formattedDate}`,
      description: clientName
        ? `Appointment with ${clientName} on ${formattedDate}${timeText} has been created. Check your Autoworx calendar.`
        : `Appointment ${title} on ${formattedDate}${timeText} has been updated. Check your Autoworx calendar.`,
    };

    const uniqueUsersToNotify = new Map<number, any>();

    for (const user of getUsers) {
      uniqueUsersToNotify.set(user.id, user);
    }

    // Add assigned sales, checking for duplicates
    for (const salesId of assignSalesIds) {
      if (!uniqueUsersToNotify.has(salesId)) {
        const salesUser = await getUser(salesId);
        uniqueUsersToNotify.set(salesId, {
          id: salesId,
          firstName: salesUser.firstName,
          lastName: salesUser.lastName,
          email: salesUser.email,
          phone: salesUser.phone,
        });
      }
    }

    for (const user of uniqueUsersToNotify.values()) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        iconType: sendNotiInfo.type as "task",
        companyId,
        title: sendNotiInfo.title,
        description: sendNotiInfo.description,
        type: "APPOINTMENT_UPDATED",
        redirectUrl: sendNotiInfo.redirectUrl,
      });
    }
  } catch (err) {
    console.log("client email error", err);
    throw err;
  }
};

type TAssignTaskNotification = {
  taskTitle: string;
  taskDate?: string;
  companyId?: number;
  assignTaskUser: {
    id: number;
    companyId: number;
    firstName: string;
    lastName: string | null;
    email: string;
    phone: string | null;
  };
};

// this notification for new task assigned
export const sendNewTaskAssignNotification = async ({
  taskTitle,
  taskDate,
  assignTaskUser,
}: TAssignTaskNotification) => {
  try {
    // update technician status to complete
    // get all company admins and managers
    const formattedDate = moment(taskDate).format("DD MMMM YYYY");

    if (!assignTaskUser.id) {
      return;
    }

    const title = "New Task Assigned";

    // new description

    const description = ` New Task ${taskTitle} assigned to you. View it in your Autoworx dashboard.`;

    const redirectUrl = `/dashboard/task/day?date=${formattedDate}`;

    sendUserNotifications({
      userId: assignTaskUser.id,
      userName: `${assignTaskUser.firstName} ${assignTaskUser.lastName}`,
      userEmail: assignTaskUser.email || "",
      userPhoneNo: assignTaskUser.phone || "",
      iconType: "task",
      companyId: assignTaskUser.companyId,
      title,
      description,
      type: "TASK_ASSIGNED",
      redirectUrl,
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// send notification for when task completed
type TTaskCompleteNotification = {
  companyId: number;
  taskTitle: string;
  taskDate: Date | null;
  assignTaskUserId: number[];
  sendRoles?: EmployeeType[];
};

export const sendTaskCompleteNotification = async ({
  companyId,
  taskTitle,
  taskDate,
  assignTaskUserId,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TTaskCompleteNotification) => {
  try {
    // Notify users by roles
    const roleUsers = await getUsersByRole(companyId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    const description = `Task "${taskTitle}" has been marked complete. Review it in your Autoworx dashboard.`;

    const uniqueUsersToNotify = new Map<number, { user: any; title: string }>();

    for (const user of roleUsers) {
      uniqueUsersToNotify.set(user.id, { user, title: "Task Completed" });
    }

    // Notify assigned task users
    for (const userId of assignTaskUserId) {
      if (!uniqueUsersToNotify.has(userId)) {
        const assignUser = await getUser(userId);
        uniqueUsersToNotify.set(userId, {
          user: assignUser,
          title: "Assigned Task Completed",
        });
      }
    }

    for (const { user, title } of uniqueUsersToNotify.values()) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        iconType: "task",
        companyId: user.companyId || companyId,
        title,
        description,
        type: "TASK_FINISHED",
        redirectUrl: "/",
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};
