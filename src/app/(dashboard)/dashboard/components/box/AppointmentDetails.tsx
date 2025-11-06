"use client";
import { useCalendarStore } from "@/stores/calendarStore";
import { Appointment, Client, User, Vehicle } from "@prisma/client";
import moment from "moment-timezone";
import { useRouter } from "next/navigation";
import { Clock, User as UserIcon, Calendar, Info, Car } from "lucide-react";

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
    (appointmentUser) => appointmentUser.user
  );

  const router = useRouter();

  const { setNavigating, setDate } = useCalendarStore();
  const handleTaskClick = () => {
    const dateString = moment.utc(appointment?.date).format("YYYY-MM-DD");

    // Set navigation flag to prevent reset, then set date and navigate
    setNavigating(true);
    setDate(dateString);
    router.push("/dashboard/task/day");
  };

  // --- Styling Enhancements ---
  return (
    <div
      onClick={handleTaskClick}
      className={`
        flex w-full items-start gap-4 p-4 cursor-pointer relative
        rounded-xl
        ring-1 ring-slate-900/5 dark:ring-white/10
        bg-white dark:bg-slate-800/80
        shadow-sm dark:shadow-xl dark:shadow-slate-900/10

        // Smooth Hover Effect: Lift and subtle shadow glow
        transition-all duration-300 ease-in-out
        hover:-translate-y-0.5
        hover:shadow-md hover:shadow-blue-500/10
        hover:bg-slate-50/50 dark:hover:bg-slate-700/80
      `}
    >
      {/* 1. Accent Bar (Visual Hierarchy & Status) */}
      <div
        className={`
          flex-shrink-0 w-1.5 h-full absolute left-0 top-0
          rounded-l-xl
          bg-gradient-to-b from-purple-500 to-indigo-600 // Purple Gradient for 'Special Action'
          shadow-lg shadow-purple-500/50
        `}
      />

      {/* 2. Content Area */}
      <div className="flex-1 pl-1">
        {" "}
        {/* Increased left padding to compensate for accent bar */}
        {/* Title (Primary Text) */}
        <h1 className="text-base font-bold text-slate-800 dark:text-white mb-2 leading-tight">
          {appointment.title.length > 35
            ? appointment.title.slice(0, 35) + "..."
            : appointment.title}
        </h1>
        {/* Details Section - Secondary Text Styling */}
        <div className="text-sm space-y-1.5 text-slate-600 dark:text-slate-300">
          {/* Date & Time (High Priority Details) */}
          <p className="font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Calendar className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            {date}
            <span className="font-normal ml-3 flex items-center gap-1">
              <Clock className="h-4 w-4 text-blue-500/80 dark:text-blue-400/80" />
              {`${start.format("h:mm A")} - ${end.format("h:mm A")}`}
            </span>
          </p>

          {/* Client Info */}
          {appointment.client && (
            <p className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
              Client:{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {appointment.client.firstName} {appointment.client.lastName}
              </span>
            </p>
          )}

          {/* Vehicle Info */}
          {appointment.vehicle && (
            <p className="flex items-center gap-2">
              <Car className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
              Vehicle:
              <span className="font-medium">
                {appointment.vehicle?.year || ""} {appointment.vehicle?.make}{" "}
                {appointment.vehicle?.model} {appointment.vehicle?.other}
              </span>
            </p>
          )}

          {/* Assigned Users */}
          {assignedUsers.length > 0 && (
            <p className="flex items-start gap-2 pt-1">
              <UserIcon className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
              Assigned to:{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {assignedUsers.map((assigned: any, idx: any) => (
                  <span key={idx}>
                    {assigned.firstName} {assigned.lastName}
                    {idx !== assignedUsers.length - 1 && ", "}
                  </span>
                ))}
              </span>
            </p>
          )}

          {/* Notes/Description */}
          {appointment?.notes && (
            <p className="flex items-start gap-2 pt-1 italic text-slate-500 dark:text-slate-400">
              <Info className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
              Note:{" "}
              {appointment.notes.length > 40
                ? appointment.notes.slice(0, 40) + "..."
                : appointment.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
