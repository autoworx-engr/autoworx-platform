import { EventContentArg } from "@fullcalendar/core";
import { CustomEventProps } from "./types";
import { getServiceColor, SERVICE_COLORS } from "./utils";
import HolidayDeleteConfirmation from "@/app/(dashboard)/dashboard/task/_component/calendar/HolidayDeleteConfirmation";
import { EmployeeType } from "@prisma/client";

export const EventContent = ({
  eventInfo,
  session,
}: {
  eventInfo: EventContentArg;
  session: any;
}) => {
  const { event, view } = eventInfo;
  const props = event.extendedProps as CustomEventProps;
  const serviceType = props.serviceType || "Appointment";
  const colors = getServiceColor(serviceType);
  const isAdmin = session?.user.employeeType === EmployeeType.Admin;

  // Styles for the container
  const containerStyle: React.CSSProperties = {
    background: `linear-gradient(to bottom, ${colors.gradient.join(", ")})`,
    border: `1px solid ${colors.borderColor}`,
    color: "#1f2937", // gray-800
    overflow: "hidden",
    borderRadius: "8px",
    padding: "4px 8px", // Increased padding from 2px 4px
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  };

  // Month view rendering (Horizontal single line style)
  if (view.type === "dayGridMonth") {
    if (serviceType === "Holiday")
      return (
        <div
          className="flex items-center justify-between gap-1 text-xs truncate w-full h-full cursor-pointer overflow-hidden rounded-r-sm pl-1"
          style={{
            background: `linear-gradient(to bottom, ${colors.gradient.join(", ")})`,
            // border: `1px solid ${colors.borderColor}`,
            borderRadius: "4px",
            color: "#1f2937",
          }}
        >
          <span
            className="font-bold whitespace-nowrap text-[12px] uppercase"
            style={{ color: colors.accentColor }}
          >
            {event.title}
          </span>
          {isAdmin && (
            <HolidayDeleteConfirmation
              holidayId={Number(event.id)}
              isMonthly={true}
            />
          )}
        </div>
      );
    return (
      <div
        className="flex items-center gap-1 text-xs truncate w-full h-full cursor-pointer overflow-hidden rounded-r-sm pl-1"
        style={{
          background: `linear-gradient(to bottom, ${colors.gradient.join(", ")})`,
          // border: `1px solid ${colors.borderColor}`,
          borderRadius: "4px",
          color: "#1f2937",
        }}
      >
        <span
          className="font-bold whitespace-nowrap text-[10px] uppercase"
          style={{ color: colors.accentColor }}
        >
          {event.title}
        </span>
        <span className="font-semibold text-gray-500 text-[10px] uppercase">
          {serviceType}
        </span>
        {props.carModel && (
          <>
            <span className="text-gray-400 mx-1">·</span>
            <span className="font-medium truncate">{props.carModel}</span>
          </>
        )}
        {props.price && (
          <>
            <span className="text-gray-400 mx-1">·</span>
            <span className="font-bold text-gray-900">{props.price}</span>
          </>
        )}
      </div>
    );
  }

  // Week and Day view rendering (Vertical block style)
  return (
    <div
      style={containerStyle}
      className="flex flex-col text-xs leading-tight h-full cursor-pointer hover:opacity-90 transition-opacity"
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-sm text-gray-900">{event.title}</span>
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm"
            style={{
              background: colors.borderColor + "20",
              color: colors.accentColor,
            }}
          >
            {serviceType}
          </span>
        </div>
        {props.carModel && (
          <div className="text-gray-600 font-medium truncate mt-0.5">
            {props.carModel}
          </div>
        )}
      </div>

      {props.price && (
        <div className="font-bold text-gray-900 mt-auto text-sm">
          {props.price}
        </div>
      )}
    </div>
  );
};
