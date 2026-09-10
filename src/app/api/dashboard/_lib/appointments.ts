import { db } from "@/lib/db";
import { EmployeeType, User } from "@prisma/client";
import moment from "moment-timezone";

const appointmentInclude = {
  appointmentUsers: {
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  vehicle: {
    select: {
      year: true,
      make: true,
      model: true,
    },
  },
  client: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
};

// Admins, managers and sales see every upcoming appointment; technicians and
// other roles only see the ones they are attached to.
const SEES_ALL_APPOINTMENTS: EmployeeType[] = [
  EmployeeType.Admin,
  EmployeeType.Manager,
  EmployeeType.Sales,
];

export async function getDashboardAppointments(user: User, timezone: string) {
  // Start of today in company timezone (converted to UTC for database query)
  const startOfToday = moment.tz(timezone).utc().startOf("day").toDate();

  const assignedToUser = SEES_ALL_APPOINTMENTS.includes(user.employeeType)
    ? {}
    : {
        OR: [
          { appointmentUsers: { some: { userId: user.id } } },
          { userId: user.id },
        ],
      };

  return db.appointment.findMany({
    where: {
      companyId: user.companyId,
      date: {
        gte: startOfToday,
      },
      ...assignedToUser,
    },
    orderBy: {
      date: "asc",
    },
    include: appointmentInclude,
    take: 20,
  });
}
