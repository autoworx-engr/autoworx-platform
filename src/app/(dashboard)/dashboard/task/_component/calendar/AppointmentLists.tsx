"use client";
import moment from "moment-timezone";
import useAppointmentQueryByDate from "../../_hook/appointment/query/useAppointmentQueryByDate";
import { useDate } from "../../_hook/lib/useDate";
import TaskError from "../ui/TaskError";
import TaskSpinner from "../ui/TaskSpinner";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { Calendar, CalendarX2, Clock, Mail, Phone, UserIcon, Users } from "lucide-react";

const SHADOW_COLOR = "shadow-md shadow-slate-900/10 dark:shadow-white/5";
const BASE_TEXT_COLOR = "text-slate-600 dark:text-white";
const INFO_TEXT_COLOR = "text-slate-500 dark:text-slate-400";
const LINK_BLUE = "text-blue-500 hover:text-blue-400";
const LINK_EMERALD = "text-emerald-500 hover:text-emerald-400";
const STATUS_COLOR = "#6571FF"; // Used for the left status border

export default function AppointmentLists() {
  const date = useDate();
  const timezone = useCompanyTimezone();
  const dateFormat = date.format("YYYY-MM-DD");

  // Get current date in company timezone
  const inputDate = moment.tz(timezone).startOf("day").toDate();

  const {
    data: appointments,
    isLoading,
    isError,
  } = useAppointmentQueryByDate(dateFormat);

  let content = null;
  if (isLoading && !isError) {
    content = <TaskSpinner />;
  } else if (!isLoading && isError) {
    content = <TaskError message="Failed to load task" />;
  } else if (
    !isLoading &&
    !isError &&
    appointments &&
    appointments?.length === 0
  ) {
    content = (
      <div className="mt-10 flex flex-col items-center justify-center text-center">
        <CalendarX2 className="mb-4 h-12 w-12 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-700">
          No appointments found
        </h3>
        <p className="text-sm text-gray-500">You're all caught up for today!</p>
      </div>
    );
  } else if (
    !isLoading &&
    !isError &&
    appointments &&
    appointments?.length > 0
  ) {
    content = appointments.map((appointment: any) => {
      const start = moment(appointment.startTime, "HH:mm");
      const end = moment(appointment.endTime, "HH:mm");
      const date = moment(appointment?.date, "YYYY-MM-DD").format(
        "Do MMMM YYYY"
      );

      return (
        <div
          key={appointment?.id}
          // Apply softer shadow, rounded corners, and elevated status border style
          className={`mb-4 rounded-xl border-l-4 p-4 ${SHADOW_COLOR} bg-white dark:bg-slate-800/80 transition-colors duration-200`}
          style={{ borderColor: STATUS_COLOR, borderRightWidth: 0 }} // Use border-l-4 for the left status bar, ensure no right border
        >
          {/* Left: Client Info */}
          <div className="pr-3 space-y-1">

            {/* Title */}
            <p className={`text-lg font-extrabold ${BASE_TEXT_COLOR} leading-snug`}>
              {appointment?.title}
            </p>

            {/* Time Range */}
            <p className={`flex items-center gap-1 text-sm font-medium ${BASE_TEXT_COLOR} pt-1`}>
              <Clock size={14} className="text-cyan-600 dark:text-cyan-400" />
              {/* Placeholder for Moment objects/formatted strings */}
              {start && end ? `${start.format("h:mm A")} - ${end.format("h:mm A")}` : "Time N/A"}
            </p>

            {/* Date */}
            {appointment?.date && (
              <div className={`flex items-center gap-1`}>
                <Calendar size={14} className="text-cyan-600 dark:text-cyan-400" />
                <p className={`text-sm font-medium ${BASE_TEXT_COLOR}`}>
                  {/* Placeholder for date string/Moment object */}
                  {date}
                </p>
              </div>
            )}

            {/* Client Name (Iconified) */}
            <p className={`flex items-center gap-1 text-sm ${INFO_TEXT_COLOR}`}>
              <UserIcon size={16} className="text-cyan-600 dark:text-cyan-400" />
              <span className={`font-semibold ${BASE_TEXT_COLOR}`}>Client:</span>
              {appointment?.client?.firstName && appointment?.client?.lastName
                ? <span className={`font-semibold`}>{appointment.client.firstName} {appointment.client.lastName}</span>
                : <span className="italic">N/A</span>}
            </p>

            {/* Email Link (Iconified) */}
            <p className="flex items-center gap-1 text-sm">
              <Mail size={16} strokeWidth={2.5} className="text-blue-500/80" />
              <span className={`font-semibold ${BASE_TEXT_COLOR}`}>Email:</span>
              <a
                href={`mailto:${appointment.client?.email}`}
                className={`w-full break-all text-sm font-medium ${LINK_BLUE}`}
              >
                {appointment.client?.email || <span className={`italic ${INFO_TEXT_COLOR}`}>N/A</span>}
              </a>
            </p>

            {/* Phone Link (Iconified) */}
            <p className="flex items-center gap-1 text-sm">
              <Phone size={14} className="text-emerald-500/80" />
              <span className={`font-semibold ${BASE_TEXT_COLOR}`}>Phone:</span>
              <a
                href={`tel:${appointment.client?.mobile}`}
                className={`cursor-pointer text-sm font-medium ${LINK_EMERALD}`}
              >
                {appointment.client?.mobile || <span className={`italic ${INFO_TEXT_COLOR}`}>N/A</span>}
              </a>
            </p>
          </div>

          {/* Assigned To (Iconified) */}
          <div className={`flex items-center gap-1 text-sm font-semibold ${BASE_TEXT_COLOR}`}>
            <Users size={14} className="text-[#6571FF] dark:text-[#6571FF]" />
            <span className={`font-semibold ${BASE_TEXT_COLOR}`}>Assigned To:</span>
            <span className="text-sm font-medium">
              {appointment.assignedUsers && appointment.assignedUsers.length > 0
                ? appointment.assignedUsers
                  .map(
                    (user: any) =>
                      `${user?.firstName ?? ""} ${user?.lastName ?? ""}`
                  )
                  .join(", ")
                : <span className="italic font-normal">N/A</span>}
            </span>
          </div>
        </div>
      );
    });
  }

  return (
    <div className="p-1">
      {/* Today's Real Date */}
      {/* <h1 className="mb-2 text-[16px] font-bold">
        {moment().format("dddd, MMMM Do, YYYY")}
      </h1> */}
      <h2 className="my-4 text-base font-semibold text-gray-900">
        Appointments for
      </h2>
      <div className="thin-scrollbar max-h-[500px] space-y-2 overflow-y-auto px-2">
        {content}
      </div>
    </div>
  );
}
