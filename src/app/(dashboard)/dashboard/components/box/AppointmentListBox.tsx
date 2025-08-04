import getUser from "@/lib/getUser";
import AppointmentDetails from "./AppointmentDetails";
import BoxTitle from "./BoxTitle";
import moment from "moment";
import { db } from "@/lib/db";
import { combineDateTimeWithTimezone } from "@/lib/combineDateTimeWithTimezone";

const fetchWithAppointment = {
  include: {
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
  },
};

export default async function AppointmentListBox() {
  const user = await getUser();
  // let tasks;
  let appointments = [];
  // Get all appointments
  // Current date and time
  const currentDateTime = moment.utc();
  // Start of today
  const startOfToday = moment().utc().startOf("day");

  if (
    user.employeeType === "Admin" ||
    user.employeeType === "Manager" ||
    user.employeeType === "Sales"
  ) {
    appointments = await db.appointment.findMany({
      where: {
        companyId: user.companyId,
        date: {
          gte: startOfToday.toDate(),
        },
      },
      orderBy: {
        date: "asc",
      },
      ...fetchWithAppointment,
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
      },
      orderBy: {
        date: "asc",
      },
      ...fetchWithAppointment,
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
  return (
    <div className="flex-1 overflow-y-hidden p-6 shadow-md">
      <div className="h-full">
        <BoxTitle title="Appointments" redirectLink="/dashboard/task/day" />
        <div className="custom-scrollbar flex h-full flex-1 flex-col space-y-4 overflow-x-hidden pb-4">
          {appointments.map((appointment: any, idx: any) => (
            <AppointmentDetails appointment={appointment} key={idx} />
          ))}
          {appointments.length === 0 && (
            <span className="my-auto self-center text-center">
              You have no upcoming appointments
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
