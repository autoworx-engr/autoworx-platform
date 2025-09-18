import { Tooltip, TooltipContent } from "@/components/Tooltip";
import ResizeTaskTooltip from "./draggable/ResizeTaskTooltip";
import DraggableTaskTooltip from "./draggable/DraggableTaskTooltip";
import { AppointmentFull } from "@/types/db";
import moment from "moment";
import { useMediaQuery } from "react-responsive";
import { usePopupStore } from "@/stores/popup";
import {
  CalendarSettings,
  Client,
  EmailTemplate,
  User,
  Vehicle,
} from "@prisma/client";
import { TASK_COLOR } from "@/lib/consts";
import { useEffect, useState } from "react";
import { SquarePen } from "lucide-react";

type TProps = {
  event: any;
  isRefAvailable: boolean;
  calculateLeftPosition: string;
  appointmentsFull: AppointmentFull[];
  companyUsers: User[];
  customers: Client[];
  vehicles: Vehicle[];
  settings: CalendarSettings;
  templates: EmailTemplate[];
  totalTaskInRow: number;
  rowsLength: number;
};

export default function DayTask({
  event,
  isRefAvailable,
  calculateLeftPosition,
  appointmentsFull,
  companyUsers,
  customers,
  vehicles,
  templates,
  settings,
  totalTaskInRow,
  rowsLength,
}: TProps) {
  const { open } = usePopupStore();
  const [height, setHeight] = useState(0);
  const is1300 = useMediaQuery({ query: "(max-width: 1300px)" });
  const startRowTime = moment("00:00", "HH:mm");
  const startEventTime = moment(event.startTime, "HH:mm");
  const diffRowAndEventTime = startEventTime.diff(startRowTime, "minutes");

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

  return (
    <Tooltip key={event.id}>
      <ResizeTaskTooltip
        rowsLength={rowsLength}
        task={event}
        height={height}
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
          updateTaskData={{ event, companyUsers }}
          updateAppointmentData={{
            appointment: appointmentsFull.find(
              (appointment) => appointment.id === event.id
            ),
            employees: companyUsers,
            customers,
            vehicles,
            templates,
            settings,
          }}
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
                      {event.assignedUsers
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
        {event.type !== "appointment" && (
          <TooltipContent className="w-72 rounded-md border border-slate-400 bg-background p-3">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{event.title}</h3>
                <button
                  type="button"
                  className="text- rounded-full bg-[#6571FF] p-2 text-white"
                  onClick={() =>
                    open("UPDATE_TASK", {
                      task: event,
                      companyUsers,
                    })
                  }
                >
                  <SquarePen className="w-4 h-4 cursor-pointer mx-auto" />
                </button>
              </div>

              {/* @ts-ignore */}
              <p className="mt-3">{event.description}</p>

              {/* @ts-ignore */}
              <p className="mt-3">Task Priority: {event.priority}</p>
            </div>
          </TooltipContent>
        )}
      </ResizeTaskTooltip>
    </Tooltip>
  );
}
