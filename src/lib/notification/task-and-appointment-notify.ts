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
    const formattedTime = moment(startTime, "HH:mm").format("hh:mm A");
    const description = clientName
      ? `Appointment with ${clientName} on ${formattedDate} at ${formattedTime} has been created. Check your Autoworx calendar.`
      : `Appointment ${title} on ${formattedDate} at ${formattedTime} has been created. Check your Autoworx calendar.`;

    const sendNotiInfo = {
      title: "New Appointment",
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

    // send notification to assigned sales
    await Promise.all(
      assignSalesIds.map(async (salesId) => {
        const assignUser = await getUser(salesId);
        sendUserNotifications({
          userId: salesId,
          userName: `${assignUser.firstName} ${assignUser.lastName}`,
          userEmail: assignUser.email || "",
          iconType: sendNotiInfo.type as "task",
          userPhoneNo: assignUser.phone || "",
          companyId: companyUniqueId,
          title: sendNotiInfo.title,
          description,
          type: "APPOINTMENT_CREATED",
          redirectUrl: sendNotiInfo.redirectUrl,
        });
      }),
    );
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
    const formattedTime = moment(startTime, "HH:mm").format("hh:mm A");

    // new description
    const sendNotiInfo = {
      title: "Update Appointment",
      companyId: companyId,
      type: "task",
      redirectUrl: `/dashboard/task/day?date=${formattedDate}`,
      description: clientName
        ? `Appointment with ${clientName} on ${formattedDate} at ${formattedTime} has been created. Check your Autoworx calendar.`
        : `Appointment ${title} on ${formattedDate} at ${formattedTime} has been created. Check your Autoworx calendar.`,
    };

    for (const user of getUsers) {
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

    // send notification to assigned sales
    await Promise.all(
      assignSalesIds.map(async (salesId) => {
        const salesUser = await getUser(salesId);
        sendUserNotifications({
          userId: salesUser.id,
          userName: `${salesUser.firstName} ${salesUser.lastName}`,
          userEmail: salesUser.email || "",
          iconType: sendNotiInfo.type as "task",
          userPhoneNo: salesUser.phone || "",
          companyId,
          title: sendNotiInfo.title,
          description: sendNotiInfo.description,
          type: "APPOINTMENT_UPDATED",
          redirectUrl: sendNotiInfo.redirectUrl,
        });
      }),
    );
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
  sendRoles = [],
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

    // new description
    const roleDescription = `Task "${taskTitle}" has been marked complete. Review it in your Autoworx dashboard.`;

    // const roleDescription = `The task "${taskTitle}" scheduled for ${formattedDate} has been completed.`;

    for (const user of roleUsers) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        iconType: "task",
        companyId: user.companyId,
        title: "Task Completed",
        description: roleDescription,
        type: "TASK_FINISHED",
        redirectUrl: "/",
      });
    }

    // Notify assigned task users
    const assignDescription = `Task "${taskTitle}" has been marked complete. Review it in your Autoworx dashboard.`;
    const assignTitle = "Assigned Task Completed";

    for (const userId of assignTaskUserId) {
      const assignUser = await getUser(userId);
      sendUserNotifications({
        userId: assignUser.id,
        userName: `${assignUser.firstName} ${assignUser.lastName}`,
        userEmail: assignUser.email || "",
        userPhoneNo: assignUser.phone || "",
        iconType: "task",
        companyId: assignUser.companyId,
        title: assignTitle,
        description: assignDescription,
        type: "TASK_FINISHED",
        redirectUrl: "/",
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};
