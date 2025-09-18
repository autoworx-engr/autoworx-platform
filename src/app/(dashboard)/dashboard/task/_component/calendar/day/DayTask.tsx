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

  const { weekStartDate, weekEndDate } = useWeekStartEndDays();

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
      TASK_COLOR[event.priority]
    : "rgb(255, 255, 255)";

  // If there are more than one task in the same row, adjust width
  if (totalTaskInRow > 2) {
    width = `${90 / totalTaskInRow}%`;
  }

  if (!isRefAvailable) return null;

  console.log("Rendering Task: ", event);
  return (
    <Tooltip key={event.id}>
      <ResizeTaskTooltip
        rowsLength={rowsLength}
        task={event}
        height={height}
        className={cn(isDragOver && "z-20 opacity-50")}
        style={{
          left: calculateLeftPosition,
          top,
          backgroundColor,
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
        >
          {
            <>
              {event.type === "appointment" ? (
                <div className="flex h-full flex-col items-start text-xs">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{event.title}</h3>
                    </div>
                    <p className="text-left">
                      Client:{" "}
                      {event.client &&
                        `${event.client.firstName} ${event.client.lastName || ""}`}
                    </p>
                    <p className="text-left">
                      Email:
                      <a
                        href={`mailto:${event.client?.email}`}
                        className="text-blue-500"
                      >
                        {event.client?.email}
                      </a>
                    </p>
                    <p className="text-left">
                      Phone:
                      <a
                        href={`tel:${event.client?.mobile}`}
                        className="text-blue-500"
                      >
                        {event.client?.mobile}
                      </a>
                    </p>
                    <p className="text-left">
                      Assigned To:{" "}
                      {event?.assignedUsers
                        .slice(0, 1)
                        .map(
                          (user: User) => `${user.firstName} ${user.lastName}`
                        )}
                    </p>
                    <p className="text-left">
                      {moment(event.startTime, "HH:mm").format("hh:mm A")} To{" "}
                      {moment(event.endTime, "HH:mm").format("hh:mm A")}
                    </p>
                    <p className="text-left">
                      Draft Estimate: {event.draftEstimate}
                    </p>
                    <p className="text-left">
                      Notes: {event?.notes}
                    </p>
                  </div>
                  <div className="absolute inset-y-1 right-0 h-[calc(100%-0.5rem)] w-1.5 rounded-lg border bg-[#6571FF]"></div>
                </div>
              ) : (
                <div className="flex h-full justify-start">
                  <h3 className="font-semibold">{event.title}</h3>
                </div>
              )}
            </>
          }
        </DraggableTaskTooltip>
        {event.type !== "appointment" ? (
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
        )}
      </ResizeTaskTooltip>
    </Tooltip>
  );
}
