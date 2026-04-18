import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { Tooltip, TooltipContent } from "@/components/Tooltip";
import { cn } from "@/lib/cn";
import { TASK_COLOR } from "@/lib/consts";
import { Task, User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { appointmentQueryKey, taskQueryKey } from "../../../_constant";
import { useDate } from "../../../_hook/lib/useDate";
import DraggableTaskTooltip from "../DraggableTaskTooltip";
import ResizeTaskTooltip from "./ResizeTaskTooltip";
import TaskTooltip from "../TaskTooltip";
import useWeekStartEndDays from "../../../_hook/lib/useWeekStartEndDays";
import AppointmentTooltip from "../AppointmentTooltip";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import { Clock, Mail, Phone, User as UserIcon, Users } from "lucide-react";
import CalendarTooltip from "../CalendarTooltip";

// Gradient priority classes for tasks
const priorityClasses = {
  Low: "bg-gradient-to-r from-blue-500 to-indigo-600 shadow-indigo-600/50",
  Medium: "bg-gradient-to-r from-cyan-600 to-blue-500 shadow-cyan-600/50",
  High: "bg-gradient-to-r from-teal-700 to-green-700 shadow-teal-700/50",
};

type TProps = {
  event: any;
  isRefAvailable: boolean;
  isDragOver?: boolean;
  calculateLeftPosition: string;
  totalTaskInRow: number;
  rowsLength: number;
};

export default function DayTask({
  event,
  isDragOver,
  isRefAvailable,
  calculateLeftPosition,
  totalTaskInRow,
  rowsLength,
}: TProps) {
  const date = useDate();
  const dateFormat = date.format("YYYY-MM-DD");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentOpen] = useState(false);
  const queryClient = useQueryClient();
  const [height, setHeight] = useState(0);
  const is1300 = useMediaQuery({ query: "(max-width: 1300px)" });
  const startRowTime = moment("00:00", "HH:mm");
  const startEventTime = moment(event.startTime, "HH:mm");
  const diffRowAndEventTime = startEventTime.diff(startRowTime, "minutes");
  const [openTooltipId, setOpenTooltipId] = useState<string | number | null>(
    null,
  );
  const { weekStartDate, weekEndDate } = useWeekStartEndDays();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const revalidateTaskQueries = () => {
    queryClient.invalidateQueries({
      queryKey: [taskQueryKey.allTasks, dateFormat],
    });

    queryClient.invalidateQueries({
      queryKey: [taskQueryKey.allTasks, weekStartDate, weekEndDate],
    });
  };

  const revalidateAppointmentQueries = () => {
    queryClient.invalidateQueries({
      queryKey: [
        appointmentQueryKey.allAppointments,
        weekStartDate,
        weekEndDate,
      ],
    });

    queryClient.invalidateQueries({
      queryKey: [appointmentQueryKey.allAppointments, dateFormat],
    });
  };

  useEffect(() => {
    // Calculate how many tasks are in the same row
    const eventStartTime = moment(event.startTime, "HH:mm");
    const eventEndTime = moment(event.endTime, "HH:mm");

    const diffByMinutes = eventEndTime.diff(eventStartTime, "minutes");
    let height = Math.round((diffByMinutes / 60) * 75); // 75 is the height of one task
    if (event.rowStartIndex > event.rowEndIndex) {
      height = Math.round((rowsLength - event.rowStartIndex) * 75);
    }
    setHeight(height);
  }, [event, rowsLength]);

  const top = `${Math.round((diffRowAndEventTime / 60) * 75)}px`;
  const widthNumber = is1300 ? 300 : 300;
  let width = `${widthNumber}px`;

  // @ts-ignore
  const backgroundColor = event.priority
    ? //@ts-ignore
      priorityClasses[event.priority]
    : "rgb(255, 255, 255)";

  const APPOINTMENT_TEXT_COLOR = "text-slate-600 dark:text-slate-300";
  const APPOINTMENT_STATUS_COLOR = "bg-[#6571FF]";
  const BASE_TEXT_COLOR = "text-slate-600 dark:text-white";
  const INFO_TEXT_COLOR = "text-slate-500 dark:text-slate-400";

  // If there are more than one task in the same row, adjust width
  if (totalTaskInRow > 2) {
    width = `${90 / totalTaskInRow}%`;
  }

  if (!isRefAvailable) return null;

  console.log("Rendering Task: ", event);
  const isTooltipOpen = openTooltipId === event.id;
  return (
    <Tooltip key={event.id} open={isTooltipOpen} onOpenChange={() => {}}>
      <ResizeTaskTooltip
        rowsLength={rowsLength}
        task={event}
        height={height}
        className={cn(
          isDragOver && "z-20 opacity-50",
          `bg-white ${backgroundColor}`,
        )}
        style={{
          left: calculateLeftPosition,
          top,
          borderRadius: "10px",
          maxWidth: width,
          minWidth: width,
        }}
      >
        <DraggableTaskTooltip
          //@ts-ignore
          className={`rounded-md px-2 py-1 text-[17px] ${event.type === "appointment" ? "overflow-y-auto text-gray-600" : "text-white"} w-full border-2`}
          style={{
            height: "100%",
          }}
          task={event}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            setOpenTooltipId(isTooltipOpen ? null : event.id);
          }}
        >
          {
            <>
              {event.type === "appointment" ? (
                <div className="relative flex h-full flex-col items-start pr-3">
                  {/* Content Area */}
                  <div className="flex-1 overflow-auto thin-scrollbar w-full space-y-0.5">
                    {/* Title */}
                    <h3
                      className={`text-md font-extrabold text-start ${BASE_TEXT_COLOR} mb-1`}
                    >
                      {event.title}
                    </h3>

                    {/* Time Range (Top Priority Detail) */}
                    <p
                      className={`flex items-center gap-1 text-xs font-semibold ${APPOINTMENT_TEXT_COLOR}`}
                    >
                      <Clock
                        size={14}
                        className="text-cyan-600 dark:text-cyan-400"
                      />
                      {moment(event.startTime, "HH:mm").format("h:mm A")} –{" "}
                      {moment(event.endTime, "HH:mm").format("h:mm A")}
                    </p>

                    {/* Client Name */}
                    {event.client && (
                      <div className="flex items-center gap-1 text-sm truncate">
                        <UserIcon size={14} />
                        <p
                          className={`text-start text-sm ${APPOINTMENT_TEXT_COLOR} truncate`}
                        >
                          Client:{" "}
                          <span className="font-semibold">{`${event.client.firstName} ${event.client.lastName || ""}`}</span>
                        </p>
                      </div>
                    )}

                    {/* Email Link (Iconified) */}
                    {event.client?.email && (
                      <p className="flex items-center gap-1 text-sm truncate">
                        <Mail size={14} className="text-blue-500/80" />
                        <a
                          href={`mailto:${event.client.email}`}
                          className="text-blue-500 hover:text-blue-400 font-medium underline-offset-2 hover:underline"
                          onClick={(e) => e.stopPropagation()} // Prevent dragging when clicking link
                        >
                          {event.client.email}
                        </a>
                      </p>
                    )}

                    {/* Phone Link (Iconified - Using the specified Emerald/Teal success tone for distinction) */}
                    {event.client?.mobile && (
                      <p className="flex items-center gap-1 text-sm truncate">
                        <Phone size={14} className="text-emerald-500/80" />
                        <a
                          href={`tel:${event.client.mobile}`}
                          className="text-emerald-500 hover:text-emerald-400 font-medium underline-offset-2 hover:underline"
                          onClick={(e) => e.stopPropagation()} // Prevent dragging when clicking link
                        >
                          {event.client.mobile}
                        </a>
                      </p>
                    )}

                    {/* Assigned To (Iconified) */}
                    {event?.assignedUsers?.length > 0 && (
                      <p
                        className={`flex items-center gap-1 text-sm ${INFO_TEXT_COLOR} truncate`}
                      >
                        <Users size={14} />
                        {event.assignedUsers
                          .slice(0, 1)
                          .map(
                            (user: User) =>
                              `${user.firstName} ${user.lastName}`,
                          )}
                      </p>
                    )}

                    {/* Draft Estimate / Notes Preview (Subtle, less space-consuming) */}
                    {(event.draftEstimate || event.notes) && (
                      <p
                        className={`text-xs italic pt-1 ${INFO_TEXT_COLOR} truncate`}
                      >
                        {event.draftEstimate &&
                          `Estimate: ${event.draftEstimate} | `}
                        {event.notes && `Notes: ${event.notes}`}
                      </p>
                    )}
                  </div>

                  {/* Status Indicator Bar (Applied to the container, slightly thicker, full height) */}
                  {/* The parent container provides the background color (near white/dark slate) */}
                  <div
                    className={`absolute inset-y-0 right-0 h-full w-1 rounded-r-lg ${APPOINTMENT_STATUS_COLOR}`}
                    style={{ right: "-2px" }} // Nudge slightly for visual effect outside the padding
                  ></div>
                </div>
              ) : (
                <div className="flex h-full justify-start">
                  <h3 className="font-semibold">{event.title}</h3>
                </div>
              )}
            </>
          }
        </DraggableTaskTooltip>
        {/* {event.type !== "appointment"  ? (
          <>
            <TooltipContent className="w-72 rounded-md border border-slate-400 bg-background p-3">
              <TaskTooltip
                event={event as Task}
                onModalOpen={() => setIsTaskModalOpen(true)}
              />
            </TooltipContent>
            <TaskCreateOrEdit
              fromEdit
              taskId={event.id}
              onTaskUpdated={revalidateTaskQueries}
              isModalOpen={isTaskModalOpen}
              setIsModalOpen={setIsTaskModalOpen}
              onTaskDelete={revalidateTaskQueries}
            />
          </>
        ) : (
          <>
            <TooltipContent className="w-72 rounded-md border border-slate-400 bg-background p-3">
              <AppointmentTooltip
                event={event}
                onModalOpen={() => setIsAppointmentOpen(true)}
              />
            </TooltipContent>
            <AppointmentCreateOrEdit
              fromEdit
              appointmentId={event.id}
              isModalOpen={isAppointmentModalOpen}
              setIsModalOpen={setIsAppointmentOpen}
              onAppointmentUpdated={revalidateAppointmentQueries}
              onAppointmentDeleted={revalidateAppointmentQueries}
            />
          </>
        )} */}

        {isTooltipOpen && (
          <CalendarTooltip
            event={event}
            onClose={() => setOpenTooltipId(null)}
            onEditOpen={() => {
              setOpenTooltipId(null);
              setIsEditModalOpen(true);
            }}
          />
        )}
      </ResizeTaskTooltip>

      {isEditModalOpen && (
        <>
          {event.type === "appointment" ? (
            <AppointmentCreateOrEdit
              fromEdit
              appointmentId={event.id}
              isModalOpen={isEditModalOpen}
              setIsModalOpen={setIsEditModalOpen}
              onAppointmentUpdated={revalidateAppointmentQueries}
              onAppointmentDeleted={revalidateAppointmentQueries}
            />
          ) : (
            <TaskCreateOrEdit
              fromEdit
              taskId={event.id}
              isModalOpen={isEditModalOpen}
              setIsModalOpen={setIsEditModalOpen}
              onTaskUpdated={revalidateTaskQueries}
              onTaskDelete={revalidateTaskQueries}
            />
          )}
        </>
      )}
    </Tooltip>
  );
}
