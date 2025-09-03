import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import moment from "moment-timezone";
import AppointmentDetails from "./AppointmentDetails";
import BoxTitle from "./BoxTitle";

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
  const { timezone } = await getCompanyTimezone();

  // let tasks;
  let appointments = [];

  // Get all appointments
  // Start of today in company timezone
  const startOfToday = moment.tz(timezone).utc().startOf("day");

  // const startOfYesterday = moment
  //   .tz(timezone)
  //   .subtract(1, "day")
  //   .startOf("day");

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
    // Filter appointments by time
    // appointments = appointments.filter((appointment) => {
    //   // Convert appointment end time to moment with timezone
    //   const appointmentEndTime = combineDateTimeWithTimezone(
    //     appointment?.date!,
    //     appointment?.endTime!,
    //     timezone!
    //   );

    //   // Keep appointment if its end time is in the future
    //   return appointmentEndTime.utc().isAfter(currentDateTime);
    // });
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
    // Filter appointments by time
    // appointments = appointments.filter((appointment) => {
    //   // Convert appointment end time to moment with timezone
    //   const appointmentEndTime = combineDateTimeWithTimezone(
    //     appointment?.date!,
    //     appointment?.endTime!,
    //     timezone!
    //   );

    //   // Keep appointment if its end time is in the future
    //   return appointmentEndTime.utc().isAfter(currentDateTime);
    // });
  }
  return (
    <div className="overflow-y-hidden h-full p-6 md:pb-20 shadow-md">
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
