import { assignAppointmentDate } from "@/actions/appointment/assignAppointmentDate";
import { updateTask } from "@/actions/task/dragTask";
import { cn } from "@/lib/cn";
import moment from "moment";
import { useEffect, useRef, useState } from "react";

type TProps = {
  children: React.ReactNode;
  height?: number;
  width?: number;
  task: any;
  style?: React.CSSProperties;
  className?: string;
  rowsLength: number;
};

export default function ResizeTaskTooltip({
  children,
  height,
  width,
  task,
  rowsLength,
  ...props
}: TProps) {
  const [size, setSize] = useState({
    width: width || 300,
    height: height || 75,
  });
  const [hovered, setHovered] = useState(false);
  const [resizing, setResizing] = useState<"top" | "bottom" | null>(null);
  const [newStartTime, setNewStartTime] = useState(task.startTime);
  const [newEndTime, setNewEndTime] = useState(task.endTime);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs to store the latest time values during resizing
  const currentStartTimeRef = useRef(task.startTime);
  const currentEndTimeRef = useRef(task.endTime);

  useEffect(() => {
    if (height) {
      setSize((prev) => ({ ...prev, height }));
    }
  }, [height]);

  useEffect(() => {
    setNewStartTime(task.startTime);
    setNewEndTime(task.endTime);
    currentStartTimeRef.current = task.startTime;
    currentEndTimeRef.current = task.endTime;
  }, [task.startTime, task.endTime]);

  // Calculate minutes per pixel ratio
  const minutesPerPixel = 60 / 75; // 60 minutes = 75px

  const handleResizeTop = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setResizing("top");
    setHovered(true);

    const startY = e.clientY;
    const startHeight = containerRef.current.offsetHeight;
    const startTop = containerRef.current.offsetTop;
    const startTimeObj = moment(task.startTime, "HH:mm");

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;

      // Limit resizing - don't allow going before 00:00
      const maxUpwardDelta = startTop;
      const limitedDeltaY = Math.min(maxUpwardDelta, deltaY);

      // Calculate new height and top position
      const newHeight = Math.max(38, startHeight - limitedDeltaY);
      const newTop = startTop + (startHeight - newHeight);

      // Calculate new start time based on the position change
      const minutesChange = Math.round((newTop - startTop) * minutesPerPixel);
      const newStartTimeObj = moment(startTimeObj).add(
        minutesChange,
        "minutes",
      );
      const formattedStartTime = newStartTimeObj.format("HH:mm");

      // Update state and ref
      if (containerRef.current) {
        containerRef.current.style.height = `${newHeight}px`;
        containerRef.current.style.top = `${newTop}px`;
      }
      setNewStartTime(formattedStartTime);
      currentStartTimeRef.current = formattedStartTime;
    };

    const handleMouseUp = async () => {
      setResizing(null);
      setHovered(false);

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // Use the ref value to ensure we have the latest time
      const finalStartTime = currentStartTimeRef.current;

      // Save changes
      if (task.type === "appointment") {
        await assignAppointmentDate({
          id: task.id,
          date: new Date(task.date),
          startTime: finalStartTime,
          endTime: task.endTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } else {
        await updateTask({
          id: task.id,
          date: task.date,
          startTime: finalStartTime,
          endTime: task.endTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleResizeBottom = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setResizing("bottom");
    setHovered(true);

    const startY = e.clientY;
    const startHeight = containerRef.current.offsetHeight;
    const startTimeObj = moment(task.startTime, "HH:mm");

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;

      // Calculate new height with limits
      const newHeight = Math.max(38, startHeight + deltaY);

      // Calculate new end time based on the height change
      const totalMinutes = newHeight * minutesPerPixel;
      const newEndTimeObj = moment(startTimeObj).add(totalMinutes, "minutes");
      const formattedEndTime = newEndTimeObj.format("HH:mm");

      // Update state and ref
      if (containerRef.current) {
        containerRef.current.style.height = `${newHeight}px`;
      }
      setNewEndTime(formattedEndTime);
      currentEndTimeRef.current = formattedEndTime;
    };

    const handleMouseUp = async () => {
      setResizing(null);
      setHovered(false);

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // Use the ref value to ensure we have the latest time
      const finalEndTime = currentEndTimeRef.current;

      // Save changes
      if (task.type === "appointment") {
        await assignAppointmentDate({
          id: task.id,
          date: new Date(task.date),
          startTime: task.startTime,
          endTime: finalEndTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } else {
        await updateTask({
          id: task.id,
          date: task.date,
          startTime: task.startTime,
          endTime: finalEndTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Combine all props and styles
  const combinedStyle = {
    ...props.style,
    position: "absolute",
    height: `${size.height}px`,
  };

  return (
    <div
      ref={containerRef}
      className={cn("hover:z-10", hovered && "z-50", props.className)}
      style={combinedStyle as React.CSSProperties}
    >
      {/* Top resize handle */}
      <div
        className="absolute left-0 top-0 h-2 w-full cursor-n-resize rounded-tl-lg rounded-tr-lg bg-transparent hover:bg-gray-200 hover:bg-opacity-50"
        onMouseDown={handleResizeTop}
      >
        {resizing === "top" && (
          <div className="absolute left-1/2 top-0 flex min-w-40 max-w-44 -translate-x-[50%] -translate-y-full items-center justify-center space-x-2 rounded-md bg-stone-200 p-1 text-sm shadow-md">
            <span>{moment(newStartTime, "HH:mm").format("h:mm A")}</span>
            <span>-</span>
            <span>{moment(task.endTime, "HH:mm").format("h:mm A")}</span>
          </div>
        )}
      </div>

      {/* Content */}
      {children}

      {/* Bottom resize handle */}
      <div
        className="absolute bottom-0 left-0 h-2 w-full cursor-s-resize rounded-bl-lg rounded-br-lg bg-transparent hover:bg-gray-200 hover:bg-opacity-50"
        onMouseDown={handleResizeBottom}
      >
        {resizing === "bottom" && (
          <div className="absolute bottom-0 left-1/2 flex min-w-40 max-w-44 -translate-x-[50%] translate-y-full items-center justify-center space-x-2 rounded-md bg-stone-200 p-1 text-sm shadow-md">
            <span>{moment(task.startTime, "HH:mm").format("h:mm A")}</span>
            <span>-</span>
            <span>{moment(newEndTime, "HH:mm").format("h:mm A")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
