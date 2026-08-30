import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import moment from "moment-timezone";
import AppointmentDetails from "./AppointmentDetails";
import BoxTitle from "./BoxTitle";
import { cn } from "@/lib/cn"; // Ensure cn utility is imported
import { CalendarCheck } from "lucide-react"; // Icon for the empty state
import { hasRouteAccess } from "@/lib/serverRouteGuard";
import BoxRestricted from "./BoxRestricted";

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
  if (!(await hasRouteAccess("/dashboard/task/day"))) {
    return (
      <div className="h-full flex-1 rounded-xl shadow-lg transition-all duration-300">
        <BoxRestricted
          title="Appointments"
          what="calendar & task"
          className="h-full"
        />
      </div>
    );
  }

  const user = await getUser();
  const { timezone } = await getCompanyTimezone();

  let appointments = [];

  // Start of today in company timezone (converted to UTC for database query)
  const startOfToday = moment.tz(timezone).utc().startOf("day");

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
  } else {
    // Logic for Technician or Other role
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
  }

  return (
    // Outer Container: Apply full Glassmorphism style and ensure flex-1 stretching
    <div className="flex min-h-0 flex-1 flex-col rounded-xl shadow-lg transition-all duration-300 lg:h-full">
      <div
        className={cn(
          `
          flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl p-4 transition-all duration-300 md:p-6 lg:h-full
          bg-white/50 dark:bg-slate-900/50
          backdrop-blur-md
          ring-1 ring-slate-900/5 dark:ring-white/10
          shadow-lg dark:shadow-2xl dark:shadow-blue-900/20
          hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-indigo-500/10
        `,
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <BoxTitle
            title="Appointments"
            redirectLink="/dashboard/task/day"
            className="mb-4 md:mb-6 flex-shrink-0"
          />

          {/* Scrollable Appointment List Container  */}
          <div className="custom-scrollbar flex flex-1 flex-col space-y-4 overflow-y-auto w-full pr-1 pb-4 min-h-0 max-h-[60vh] md:max-h-none">
            {appointments.map((appointment: any, idx: any) => (
              // Note: AppointmentDetails needs its own premium styling update
              <AppointmentDetails appointment={appointment} key={idx} />
            ))}

            {/* Redesigned Empty State */}
            {appointments.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center my-auto">
                <CalendarCheck className="w-8 h-8 text-indigo-500 mb-3" />
                <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                  Schedule Clear
                </span>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  You have no upcoming appointments for today.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
