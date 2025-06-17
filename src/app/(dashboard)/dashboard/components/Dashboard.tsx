import { getLastClockInOutForUser } from "@/actions/dashboard/clockIn";
import { fetchRecentMessages } from "@/actions/dashboard/technician/recentMessages";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { planObject } from "@/utils/planObject";
import { User } from "@prisma/client";
import moment from "moment-timezone"; // Add this import
import DashboardAdmin from "./DashboardAdmin";
import DashboardManager from "./DashboardManager";
import DashboardOther from "./DashboardOther";
import DashboardSales from "./DashboardSales";
import DashboardTechnician from "./DashboardTechnician";

// First, define your helper function properly
function combineDateTimeWithTimezone(
  date: Date,
  timeString: string | null | undefined,
  timezone: string | null | undefined,
) {
  // Create a moment object with the date
  const momentDate = moment(date);

  // Default values if timeString is undefined or null
  let hours = 0;
  let minutes = 0;

  // Only try to parse if timeString exists
  if (timeString) {
    const timeParts = timeString.split(":");
    hours = parseInt(timeParts[0] || "0", 10);
    minutes = parseInt(timeParts[1] || "0", 10);
  }

  // Set hours and minutes
  momentDate.hours(hours).minutes(minutes).seconds(0);

  // Apply the timezone with a fallback
  return moment.tz(
    momentDate.format("YYYY-MM-DD HH:mm:ss"),
    timezone || "Etc/UTC",
  );
}
export default async function Dashboard() {
  const user = await getUser();
  // let tasks;
  let appointments;
  // Get all appointments
  // Current date and time
  const currentDateTime = moment.utc();
  // Start of today
  const startOfToday = moment().utc().startOf("day");
  if (
    user.employeeType == "Admin" ||
    user.employeeType == "Manager" ||
    user.employeeType == "Sales"
  ) {
    // TODO: Add logic to get tasks for Admin and Manager
    // tasks = await db.task.findMany({
    //   where: {
    //     companyId: user.companyId,
    // OR: [
    //   {
    //     taskUser: {
    //       some: {
    //         userId: +user.id,
    //       },
    //     },
    //   },
    //   { userId: +user.id },
    // ],
    //   },
    // });

    appointments = await db.appointment.findMany({
      where: {
        companyId: user.companyId,
        date: {
          gte: startOfToday.toDate(),
        },

        // OR: [
        //   {
        //     date: {
        //       gt: currentDateTime.toDate(),
        //     },
        //   },
        //   {
        //     date: {
        //       equals: startOfToday.toDate(),
        //     },
        //     endTime: {
        //       gt: currentDateTime.format("HH:mm"), // Adjust the format as per your endTime field
        //     },
        //   },
        // ],
      },
      orderBy: {
        date: "asc",
      },
    });
    // Filter appointments
    appointments = appointments.filter((appointment) => {
      // Convert appointment end time to moment with timezone
      const appointmentEndTime = combineDateTimeWithTimezone(
        appointment?.date!,
        appointment?.endTime!,
        appointment?.timezone!,
      );

      // Keep appointment if its end time is in the future
      return appointmentEndTime.utc().isAfter(currentDateTime);
    });
  } else {
    appointments = await db.appointment.findMany({
      where: {
        companyId: user.companyId,
        date: {
          gte: startOfToday.toDate(),
        },
        OR: [
          {
            appointmentUsers: {
              some: {
                userId: user.id,
              },
            },
          },
          {
            userId: user.id,
          },
        ],
        // AND: [
        //   {
        //     OR: [
        //       {
        //         date: {
        //           gt: currentDateTime.toDate(),
        //         },
        //       },
        //       {
        //         date: {
        //           equals: startOfToday.toDate(),
        //         },
        //         endTime: {
        //           gt: currentDateTime.format("HH:mm"), // Adjust the format as per your endTime field
        //         },
        //       },
        //     ],
        //   },
        //   {
        //     OR: [
        //       {
        //         appointmentUsers: {
        //           some: {
        //             userId: user.id,
        //           },
        //         },
        //       },
        //       {
        //         userId: user.id,
        //       },
        //     ],
        //   },
        // ],
      },
      orderBy: {
        date: "asc",
      },
    });
    // Filter appointments
    appointments = appointments.filter((appointment) => {
      // Convert appointment end time to moment with timezone
      const appointmentEndTime = combineDateTimeWithTimezone(
        appointment?.date!,
        appointment?.endTime!,
        appointment?.timezone!,
      );

      // Keep appointment if its end time is in the future
      return appointmentEndTime.utc().isAfter(currentDateTime);
    });
  }

  const tasks = await db.task.findMany({
    where: {
      companyId: user.companyId,
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

  const companyUsers = await db.user.findMany({
    where: {
      companyId: user.companyId,
    },
  });

  // fetching all the leave requests
  let pendingLeaveRequests = await db.leaveRequest.findMany({
    where: {
      companyId: user.companyId,
      status: "Pending",
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let filteredLeaveRequests = [];

  // if current user is Manager, then he should not be shown leave requests of other Managers
  // only Admin can approve Manager's leave requests
  if (user.employeeType === "Manager") {
    for (const leaveRequest of pendingLeaveRequests) {
      if (leaveRequest.user.employeeType !== "Manager") {
        filteredLeaveRequests.push(leaveRequest);
      }
    }
  } else {
    filteredLeaveRequests = pendingLeaveRequests;
  }

  // await insertPreloadedData(user.companyId);

  const calendarAppointments = [];

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
    const vehicle = appointment.vehicleId
      ? await db.vehicle.findUnique({
          where: { id: appointment.vehicleId },
          select: {
            year: true,
            make: true,
            model: true,
          },
        })
      : null;

    calendarAppointments.push({
      ...appointment,
      assignedUsers: users,
      client,
      vehicle,
    });
  }

  // should be ms (milliseconds)
  let refreshTime = 5000;

  if (user.employeeType === "Admin") {
    return (
      <DashboardAdmin
        refreshTime={refreshTime}
        tasks={taskWithAssignedUsers}
        companyUsers={planObject(companyUsers)}
        appointments={calendarAppointments}
        pendingLeaveRequests={filteredLeaveRequests}
      />
    );
  } else if (user.employeeType === "Manager") {
    return (
      <DashboardManager
        refreshTime={refreshTime}
        tasks={taskWithAssignedUsers}
        companyUsers={planObject(companyUsers)}
        appointments={calendarAppointments}
        pendingLeaveRequests={filteredLeaveRequests}
      />
    );
  } else if (user.employeeType === "Sales") {
    const clients = await db.client.findMany({
      where: { companyId: user.companyId },
      include: {
        MailgunEmail: {
          orderBy: {
            createdAt: "desc", // Assuming createdAt is the timestamp for the email
          },
          take: 1,
          include: {
            client: true,
          }, // Get only the latest email for each client
        },
      },
    });

    // Now, sort clients manually based on the latest MailgunEmail
    const sortedClients = clients.sort((a, b) => {
      const aLastEmailDate =
        a.MailgunEmail.length > 0
          ? new Date(
              a.MailgunEmail[a.MailgunEmail.length - 1].createdAt,
            ).getTime()
          : new Date("1970-01-01").getTime();

      const bLastEmailDate =
        b.MailgunEmail.length > 0
          ? new Date(
              b.MailgunEmail[b.MailgunEmail.length - 1].createdAt,
            ).getTime()
          : new Date("1970-01-01").getTime();

      return bLastEmailDate - aLastEmailDate;
    });

    const internalMessages = await fetchRecentMessages();
    return (
      <DashboardSales
        refreshTime={refreshTime}
        tasks={taskWithAssignedUsers}
        companyUsers={planObject(companyUsers)}
        appointments={calendarAppointments}
        clientMessages={sortedClients}
        internalMessages={internalMessages}
        user={user}
      />
    );
  } else if (user.employeeType === "Technician") {
    let lastClockInOut = await getLastClockInOutForUser({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    return (
      <DashboardTechnician
        refreshTime={refreshTime}
        tasks={taskWithAssignedUsers}
        companyUsers={planObject(companyUsers)}
        appointments={calendarAppointments}
        lastClockInOut={lastClockInOut}
      />
    );
  } else if (user.employeeType === "Other") {
    let lastClockInOut = await getLastClockInOutForUser({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    return (
      <DashboardOther
        refreshTime={refreshTime}
        tasks={taskWithAssignedUsers}
        companyUsers={planObject(companyUsers)}
        appointments={calendarAppointments}
        lastClockInOut={lastClockInOut}
      />
    );
  }
}
