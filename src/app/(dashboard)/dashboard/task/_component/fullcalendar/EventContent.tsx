import { EventContentArg } from "@fullcalendar/core";
import { CustomEventProps } from "../../_utils/calendar.types";
import { getServiceColor } from "../../_utils/calendarColors";
import HolidayDeleteConfirmation from "./HolidayDeleteConfirmation";
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
  const originalData = props.originalData;
  const categoryColor =
    props.serviceCategoryColor || originalData?.serviceCategory?.color;
  const colors = getServiceColor(
    serviceType,
    serviceType === "Appointment" ? categoryColor : undefined,
  );
  const isAdmin = session?.user?.employeeType === EmployeeType.Admin;
  // console.log("Rendering event:", {
  //   event: event.extendedProps.originalData,
  // });

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
    if (serviceType === "Weekend")
      return (
        <div
          className="flex items-center text-xs truncate w-full h-full overflow-hidden rounded-r-sm pl-1 cursor-default"
          style={{
            background: `linear-gradient(to bottom, ${colors.gradient.join(", ")})`,
            borderRadius: "4px",
            color: "#1f2937",
          }}
        >
          <span
            className="font-bold whitespace-nowrap text-[8px] sm:text-[12px] uppercase"
            style={{ color: colors.accentColor }}
          >
            Weekend
          </span>
        </div>
      );
    if (serviceType === "Holiday")
      return (
        <div
          className="flex items-center justify-between text-xs truncate w-full h-full cursor-pointer overflow-hidden rounded-r-sm pl-1"
          style={{
            background: `linear-gradient(to bottom, ${colors.gradient.join(", ")})`,
            // border: `1px solid ${colors.borderColor}`,
            borderRadius: "4px",
            color: "#1f2937",
          }}
        >
          <span
            className="font-bold whitespace-nowrap text-[8px] sm:text-[12px] uppercase"
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
      </div>
    );
  }

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
          className="font-bold whitespace-nowrap text-[8px] sm:text-[10px] uppercase"
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
  const isListView = view.type.startsWith("list");

  const eventBody = (
    <div className="flex flex-col gap-0.5">
      <div className="items-center flex-wrap">
        <p
          className="text-[8px] font-bold uppercase tracking-wide"
          style={{
            background: colors.borderColor + "20",
            color: colors.accentColor,
          }}
        >
          {serviceType}
        </p>
        {originalData.client ? (
          <p className="font-bold text-sm text-gray-900">
            {originalData.client.firstName} {originalData.client.lastName}
          </p>
        ) : (
          <p className="font-bold text-sm text-gray-900">{event.title}</p>
        )}
        {originalData.vehicle && (
          <p className="text-xs text-gray-600">
            {originalData.vehicle.year} {originalData.vehicle.make}{" "}
            {originalData.vehicle.model}
          </p>
        )}
        {originalData.title && props.serviceType?.includes("Appointment") && (
          <p className="text-xs text-gray-600 mt-0.5">{originalData.title}</p>
        )}
        {originalData.invoiceGrandTotal !== undefined &&
          originalData.invoiceGrandTotal > 0 && (
            <p className="text-xs font-semibold text-gray-700 mt-0.5">
              $
              {Number(originalData.invoiceGrandTotal).toLocaleString(
                undefined,
                { minimumFractionDigits: 0, maximumFractionDigits: 2 },
              )}
            </p>
          )}
      </div>

      {originalData?.taskUser && originalData.taskUser.length > 0 && (
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <span className="text-gray-500 text-[10px]">Assigned to:</span>
          <span className="text-gray-700 text-[10px]">
            {originalData.taskUser
              .map((tu) =>
                tu?.user ? `${tu.user.firstName} ${tu.user.lastName}` : null,
              )
              .filter(Boolean)
              .join(", ")}
          </span>
        </div>
      )}
    </div>
  );

  // List view — flat card, full width, no fixed height
  if (isListView) {
    return (
      <div
        style={{
          background: `linear-gradient(to bottom, ${colors.gradient.join(", ")})`,
          border: `1px solid ${colors.borderColor}`,
          borderRadius: "8px",
          padding: "6px 10px",
          width: "100%",
          color: "#1f2937",
        }}
        className="cursor-pointer hover:opacity-90 transition-opacity text-xs leading-snug"
      >
        {eventBody}
      </div>
    );
  }

  // Week and Day view rendering (Vertical block style)
  return (
    <div
      style={containerStyle}
      className="flex flex-col text-xs leading-tight h-full cursor-pointer hover:opacity-90 transition-opacity"
    >
      {eventBody}
    </div>
  );
};
