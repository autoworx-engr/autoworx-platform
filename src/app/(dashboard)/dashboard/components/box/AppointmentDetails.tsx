"use client";

import { useCalendarStore } from "@/stores/calendarStore";
import { Appointment, Client, User, Vehicle } from "@prisma/client";
import { Calendar, Car, Clock, Info, User as UserIcon } from "lucide-react";
import moment from "moment-timezone";
import { useRouter } from "next/navigation";

type TAppointmentDetailsProps = {
  appointment: Appointment & {
    client?: Client;
    appointmentUsers: { user: User[] }[];
    vehicle?: Vehicle;
  };
};

export default function AppointmentDetails({
  appointment,
}: TAppointmentDetailsProps) {
  const start = moment(appointment.startTime, "HH:mm");
  const end = moment(appointment.endTime, "HH:mm");
  const date = moment.utc(appointment?.date).format("Do MMMM YYYY");

  const assignedUsers = appointment.appointmentUsers.flatMap(
    (appointmentUser) => appointmentUser.user,
  );

  const router = useRouter();
  const { setNavigating, setDate } = useCalendarStore();

  const handleTaskClick = () => {
    const dateString = moment.utc(appointment?.date).format("YYYY-MM-DD");
    setNavigating(true);
    setDate(dateString);
    router.push("/dashboard/task/day");
  };

  return (
    <div
      onClick={handleTaskClick}
      className="group relative flex flex-col gap-2 w-full p-4 cursor-pointer rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900 hover:ring-blue-300/40 hover:shadow-md transition-all duration-300 ease-in-out"
    >
      {/* Accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-gradient-to-r from-[#00b8b0] to-[#0098da]" />

      {/* Title and time */}
      <div className="flex items-start justify-between w-full">
        <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 truncate pr-2">
          {appointment.title}
        </h2>
        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          <Clock className="h-4 w-4 text-blue-500/80" />
          {`${start.format("h:mm A")} — ${end.format("h:mm A")}`}
        </div>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <Calendar className="h-4 w-4 text-blue-500/90" />
        {date}
      </div>

      {/* Client Info */}
      {appointment.client && (
        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <UserIcon className="h-4 w-4 text-slate-400" />
          <span>
            Client:{" "}
            <span className="font-medium">
              {appointment.client.firstName} {appointment.client.lastName}
            </span>
          </span>
        </div>
      )}

      {/* Vehicle Info */}
      {appointment.vehicle && (
        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <Car className="h-4 w-4 text-slate-400" />
          <span className="font-medium">
            {appointment.vehicle?.year || ""} {appointment.vehicle?.make}{" "}
            {appointment.vehicle?.model}
          </span>
        </div>
      )}

      {/* Assigned Users */}
      {assignedUsers.length > 0 && (
        <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
          <UserIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span
            className="line-clamp-3 min-w-0 flex-1"
            title={assignedUsers
              .map((assigned) =>
                `${assigned.firstName ?? ""} ${assigned.lastName ?? ""}`.trim(),
              )
              .filter(Boolean)
              .join(", ")}
          >
            {assignedUsers.map((assigned, idx) => (
              <span key={idx}>
                {assigned.firstName} {assigned.lastName}
                {idx !== assignedUsers.length - 1 && ", "}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* Notes */}
      {appointment?.notes && (
        <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 italic">
          <Info className="h-4 w-4 text-slate-400" />
          <span className="line-clamp-2">{appointment.notes}</span>
        </div>
      )}

      {/* Status Badge */}
      {/* <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xs font-medium ring-1 ring-blue-100 dark:ring-blue-800">
        Scheduled
      </div> */}
    </div>
  );
}
