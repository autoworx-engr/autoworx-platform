"use server";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { AppointmentFull } from "@/types/db";
import getWeekendsOfMonth from "@/utils/getWeekendsOfMonth";
import { CalendarSettings, User } from "@prisma/client";
import moment from "moment";
import { getServerSession } from "next-auth";

export async function fetchTaskPageData(month: string) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;

  if (!companyId) {
    throw new Error("Company ID is required to create an email template.");
  }
  let user = (await db.user.findFirst({
    where: {
      id: +session.user.id,
    },
  })) as User;

  const calendarAppointments = [];
  let appointments;
  let tasks;

  // get selected month
  const getMonth = month
    ? moment(month, "YYYY-MM").format("MMMM")
    : moment().format("MMMM");

  // get selected year
  const getYear = month ? moment(month, "YYYY-MM").year() : moment().year();

  const holidays = await db.holiday.findMany({
    where: {
      companyId: companyId,
      month: getMonth,
      year: getYear,
    },
  });
  if (
    user.employeeType == "Admin" ||
    user.employeeType == "Manager" ||
    user.employeeType == "Sales"
  ) {
    appointments = await db.appointment.findMany({
      where: {
        companyId,
      },
    });

    tasks = await db.task.findMany({
      where: {
        companyId,
        status: "pending",
      },
    });
  } else {
    appointments = await db.appointment.findMany({
      where: {
        companyId,
        OR: [
          {
            appointmentUsers: {
              some: {
                userId: +user.id,
              },
            },
          },
          {
            userId: user.id,
          },
        ],
      },
    });

    tasks = await db.task.findMany({
      where: {
        companyId,
        status: "pending",
        OR: [
          {
            taskUser: {
              some: {
                userId: +user.id,
              },
            },
          },
          {
            userId: +user.id,
          },
        ],
      },
    });
  }

  // aggregating assigned users data
  for (const appointment of appointments) {
    const appointmentUsers = await db.appointmentUser.findMany({
      where: { appointmentId: appointment.id },
    });

    const users = await db.user.findMany({
      where: {
        id: {
          in: appointmentUsers.map((appointmentUser) => appointmentUser.userId),
        },
      },
    });

    const client = appointment.clientId
      ? await db.client.findUnique({
          where: { id: appointment.clientId },
        })
      : null;

    calendarAppointments.push({
      ...appointment,
      assignedUsers: users,
      client,
    });
  }

  // Tasks with assigned users
  // Here we will store both the task and the assigned users
  const taskWithAssignedUsers = [];

  // Loop through all the tasks
  for (const task of tasks) {
    let assignedUsers: User[] = [];

    // Get the assigned users for the task
    const taskUsers = (await db.taskUser.findMany({
      where: {
        taskId: task.id,
      },
    })) as any;

    // Get the user details for the assigned users
    for (const taskUser of taskUsers) {
      const user = (await db.user.findUnique({
        where: {
          id: taskUser.userId,
        },
      })) as User;

      // Add the user to the assigned users array
      assignedUsers.push(user);
    }

    // Add the task and the assigned users to the array
    taskWithAssignedUsers.push({
      ...task,
      assignedUsers,
    });
  }

  // Get all the users for the company
  const companyUsers = await db.user.findMany({
    where: {
      companyId,
    },
  });

  const usersWithTasks = [];

  let users = [];

  if (
    session.user.employeeType == "Admin" ||
    session.user.employeeType == "Manager"
  ) {
    users = await db.user.findMany({
      where: {
        companyId,
        role: "employee",
      },
    });
  } else {
    const findCurrentUser = await db.user.findFirst({
      where: {
        id: +session.user.id,
      },
    });
    users = findCurrentUser ? [] : [findCurrentUser];
  }

  for (const user of users) {
    const taskUsers = await db.taskUser.findMany({
      where: { userId: user?.id },
    });

    const tasks = await db.task.findMany({
      where: {
        id: {
          in: taskUsers.map((taskUser) => taskUser.taskId),
        },
        companyId,
        status: "pending",
      },
    });

    usersWithTasks.push({
      ...user,
      tasks,
    });
  }

  const customers = await db.client.findMany({
    where: { companyId },
  });

  const vehicles = await db.vehicle.findMany({
    where: { companyId },
  });

  const settings = (await db.calendarSettings.findFirst({
    where: {
      companyId,
    },
  })) as CalendarSettings;

  const emailTemplates = await db.emailTemplate.findMany({
    where: {
      companyId,
    },
  });

  let appointmentsFull: AppointmentFull[] = [];

  for (const appointment of appointments) {
    const client = appointment.clientId
      ? await db.client.findUnique({
          where: { id: appointment.clientId },
        })
      : null;

    const vehicle = appointment.vehicleId
      ? await db.vehicle.findUnique({
          where: { id: appointment.vehicleId },
        })
      : null;

    const confirmationEmailTemplate = appointment.confirmationEmailTemplateId
      ? await db.emailTemplate.findUnique({
          where: { id: appointment.confirmationEmailTemplateId },
        })
      : null;

    const reminderEmailTemplate = appointment.reminderEmailTemplateId
      ? await db.emailTemplate.findUnique({
          where: { id: appointment.reminderEmailTemplateId },
        })
      : null;

    const appointmentUsers = await db.appointmentUser.findMany({
      where: { appointmentId: appointment.id },
    });

    const assignedUsers = await db.user.findMany({
      where: {
        id: {
          in: appointmentUsers.map((appointmentUser) => appointmentUser.userId),
        },
      },
    });

    appointmentsFull.push({
      ...appointment,
      times: appointment.times as string[],
      client,
      vehicle,
      confirmationEmailTemplate: confirmationEmailTemplate as any,
      reminderEmailTemplate: reminderEmailTemplate as any,
      assignedUsers,
    });
  }
  const estimates = await db.invoice.findMany({
    where: {
      type: "Estimate",
    },
  });

  const categories = await db.category.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });

  // weekends add with holidays
  const calenderSettings = await db.calendarSettings.findFirst({
    where: {
      companyId,
    },
  });

  const weekendOne = getWeekendsOfMonth(
    calenderSettings?.weekend1!,
    getMonth,
    getYear,
  );
  const weekendTwo = getWeekendsOfMonth(
    calenderSettings?.weekend2!,
    getMonth,
    getYear,
  );

  const reduceDuplicatesWeekends =
    calenderSettings?.weekend1 === calenderSettings?.weekend2
      ? weekendOne
      : weekendOne.concat(weekendTwo);

  const weekends = reduceDuplicatesWeekends.map((weekend) => ({
    companyId,
    date: moment(weekend).toISOString(),
    month: getMonth,
    year: getYear,
  }));

  const totalOfWeekendsAndHolidays = holidays.concat(weekends as any[]);

  return {
    taskWithAssignedUsers,
    companyUsers,
    usersWithTasks,
    customers,
    vehicles,
    settings,
    holidays: totalOfWeekendsAndHolidays,
    appointments: calendarAppointments,
    templates: emailTemplates,
    appointmentsFull,
    user,
    categories,
  };
}
