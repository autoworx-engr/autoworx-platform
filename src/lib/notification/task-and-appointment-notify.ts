import { sendNotification } from "@/actions/notification/sendNotification";
import sendNotificationByEmail from "@/actions/notification/sendNotificationByEmail";
import sendNotificationBySms from "@/actions/notification/sendNotificationBySms";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { EmployeeType } from "@prisma/client";
import moment from "moment";
import { getCompanyId } from "../companyId";
import getUser from "../getUser";
import { sendUserNotification } from "../sendUserNotification";
import { getNotificationSetting } from "./getNotificationSetting";

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
      const setting = await getNotificationSetting({
        userId: user.id,
        notificationType: "APPOINTMENT_CREATED",
      });
      // call actual send notification utility function
      if (setting?.push_enabled) {
        await sendNotification({
          ...sendNotiInfo,
          userId: user.id,
          description: sendNotiInfo.description,
        });
        sendUserNotification({
          userId: user.id,
          title: sendNotiInfo.title,
          body: sendNotiInfo.description,
          deepLink: sendNotiInfo.redirectUrl,
        });
      }

      // send email notification
      if (setting?.email_enabled && user.email) {
        sendNotificationByEmail({
          companyId: companyUniqueId,
          description: sendNotiInfo.description,
          userName: user.firstName + " " + user.lastName,
          subject: title,
          userEmail: user.email,
        });
      }

      // send sms notification
      if (setting?.text_enabled && user.phone) {
        sendNotificationBySms({
          userName: user.firstName + " " + user.lastName,
          companyId: companyUniqueId,
          description: sendNotiInfo.description,
          userPhoneNo: user.phone,
        });
      }
    }
    // new Desc
    const assignDescription = description;

    // send notification to assigned sales
    await Promise.all(
      assignSalesIds.map(async (salesId) => {
        const setting = await getNotificationSetting({
          userId: salesId,
          notificationType: "APPOINTMENT_CREATED",
        });

        const assignUser = await getUser(salesId);

        if (setting?.push_enabled) {
          await sendNotification({
            ...sendNotiInfo,
            userId: salesId,
            title: sendNotiInfo.title,
            description: assignDescription,
          });

          // send notification to browser
          sendUserNotification({
            userId: salesId,
            title: sendNotiInfo.title,
            body: assignDescription,
            deepLink: "/",
          });
        }

        // send email notification
        if (setting?.email_enabled && assignUser.email) {
          sendNotificationByEmail({
            companyId: companyUniqueId,
            description: assignDescription,
            userName: assignUser.firstName + " " + assignUser.lastName,
            subject: sendNotiInfo.title,
            userEmail: assignUser.email,
          });
        }

        // send sms notification
        if (setting?.text_enabled && assignUser.phone) {
          sendNotificationBySms({
            userName: assignUser.firstName + " " + assignUser.lastName,
            companyId: companyUniqueId,
            description: assignDescription,
            userPhoneNo: assignUser.phone,
          });
        }
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
      const setting = await getNotificationSetting({
        userId: user.id,
        notificationType: "APPOINTMENT_UPDATED",
      });
      // call actual send notification utility function
      if (setting?.push_enabled) {
        await sendNotification({
          ...sendNotiInfo,
          userId: user.id,
        });
        await sendUserNotification({
          userId: user.id,
          title: sendNotiInfo.title,
          body: sendNotiInfo.description,
          deepLink: sendNotiInfo.redirectUrl,
        });
      }

      // send email notification
      if (setting?.email_enabled && user.email) {
        sendNotificationByEmail({
          companyId,
          description: sendNotiInfo.description,
          userName: user.firstName + " " + user.lastName,
          subject: title,
          userEmail: user.email,
        });
      }

      // send sms notification
      if (setting?.text_enabled && user.phone) {
        sendNotificationBySms({
          userName: user.firstName + " " + user.lastName,
          companyId,
          description: sendNotiInfo.description,
          userPhoneNo: user.phone,
        });
      }
    }

    // send notification to assigned sales
    await Promise.all(
      assignSalesIds.map(async (salesId) => {
        const setting = await getNotificationSetting({
          userId: salesId,
          notificationType: "APPOINTMENT_UPDATED",
        });

        const salesUser = await getUser(salesId);

        if (setting?.push_enabled) {
          await sendNotification({
            ...sendNotiInfo,
            userId: salesId,
            title: "Update Appointment",
            description: clientName
              ? `Appointment with ${clientName} on ${formattedDate} at ${formattedTime} has been created. Check your Autoworx calendar.`
              : `Appointment ${title} on ${formattedDate} at ${formattedTime} has been created. Check your Autoworx calendar.`,
          });

          // send notification to browser
          sendUserNotification({
            userId: salesId,
            title: "Update Appointment",
            body: clientName
              ? `Appointment with ${clientName} on ${formattedDate} at ${formattedTime} has been created. Check your Autoworx calendar.`
              : `Appointment ${title} on ${formattedDate} at ${formattedTime} has been created. Check your Autoworx calendar.`,
            deepLink: sendNotiInfo.redirectUrl,
          });
        }
        // send email notification
        if (setting?.email_enabled && salesUser.email) {
          sendNotificationByEmail({
            companyId,
            description: sendNotiInfo.description,
            userName: salesUser.firstName + " " + salesUser.lastName,
            subject: title,
            userEmail: salesUser.email,
          });
        }

        // send sms notification
        if (setting?.text_enabled && salesUser.phone) {
          sendNotificationBySms({
            userName: salesUser.firstName + " " + salesUser.lastName,
            companyId,
            description: sendNotiInfo.description,
            userPhoneNo: salesUser.phone,
          });
        }
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

    const sessionUser = await getUser();

    if (!assignTaskUser.id) {
      return;
    }

    const userId = assignTaskUser.id;
    // const assignTaskUser = await getUser(userId);

    const setting = await getNotificationSetting({
      userId,
      notificationType: "TASK_ASSIGNED",
    });

    const title = "New Task Assigned";

    // new description

    const description = ` New Task ${taskTitle} assigned to you. View it in your Autoworx dashboard.`;

    // const description = `You have been assigned a new task titled "${taskTitle}". Assigned by ${userId === sessionUser.id ? "yourself" : assignTaskUser.firstName + " " + assignTaskUser.lastName}.`;

    if (setting?.push_enabled) {
      // call actual send notification utility function
      sendNotification({
        userId,
        title,
        description,
        type: "task",
        companyId: assignTaskUser.companyId,
        redirectUrl: `/dashboard/task/day?date=${formattedDate}`,
      });

      // send notification to browser
      sendUserNotification({
        userId,
        title,
        body: description,
        deepLink: "/",
      });
    }

    // send email notification
    if (setting?.email_enabled && assignTaskUser.email) {
      sendNotificationByEmail({
        companyId: assignTaskUser?.companyId,
        description,
        userName: assignTaskUser.firstName + " " + assignTaskUser.lastName,
        subject: title,
        userEmail: assignTaskUser.email,
      });
    }

    // send sms notification
    if (setting?.text_enabled && assignTaskUser.phone) {
      sendNotificationBySms({
        userName: assignTaskUser.firstName + " " + assignTaskUser.lastName,
        companyId: assignTaskUser.companyId,
        description,
        userPhoneNo: assignTaskUser.phone,
      });
    }
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
    const formattedDate = moment(taskDate).format("DD MMMM YYYY");

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
      const settings = await getNotificationSetting({
        userId: user.id,
        notificationType: "TASK_FINISHED",
      });

      if (settings?.push_enabled) {
        sendNotification({
          userId: user.id,
          title: "Task Completed",
          companyId,
          type: "task",
          description: roleDescription,
        });

        // send notification to browser
        sendUserNotification({
          userId: user.id,
          title: "Task Completed",
          body: roleDescription,
          deepLink: "/",
        });
      }

      if (settings?.email_enabled && user.email) {
        sendNotificationByEmail({
          companyId,
          description: roleDescription,
          userName: `${user.firstName} ${user.lastName}`,
          subject: "Task Completed",
          userEmail: user.email,
        });
      }

      if (settings?.text_enabled && user.phone) {
        sendNotificationBySms({
          userName: `${user.firstName} ${user.lastName}`,
          companyId,
          description: roleDescription,
          userPhoneNo: user.phone,
        });
      }
    }

    // Notify assigned task users
    const assignDescription = `Task "${taskTitle}" has been marked complete. Review it in your Autoworx dashboard.`;
    const assignTitle = "Assigned Task Completed";

    for (const userId of assignTaskUserId) {
      const assignUser = await getUser(userId);
      const settings = await getNotificationSetting({
        userId,
        notificationType: "TASK_FINISHED",
      });

      if (settings?.push_enabled) {
        sendNotification({
          userId,
          title: assignTitle,
          companyId,
          type: "task",
          description: assignDescription,
        });

        sendUserNotification({
          userId,
          title: assignTitle,
          body: assignDescription,
          deepLink: "/",
        });
      }

      if (settings?.email_enabled && assignUser.email) {
        sendNotificationByEmail({
          companyId,
          description: assignDescription,
          userName: `${assignUser.firstName} ${assignUser.lastName}`,
          subject: assignTitle,
          userEmail: assignUser.email,
        });
      }

      if (settings?.text_enabled && assignUser.phone) {
        sendNotificationBySms({
          userName: `${assignUser.firstName} ${assignUser.lastName}`,
          companyId,
          description: assignDescription,
          userPhoneNo: assignUser.phone,
        });
      }
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};
