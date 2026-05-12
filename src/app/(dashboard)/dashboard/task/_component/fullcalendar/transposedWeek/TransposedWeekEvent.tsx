import { CSSProperties } from "react";
import { CustomEventProps } from "../../../_utils/calendar.types";
import { getServiceColor } from "../../../_utils/calendarColors";
import styles from "./transposedWeek.module.css";

export interface PositionedEvent {
  id: string;
  sliceKey: string;
  title: string;
  start: Date;
  end: Date;
  extendedProps: CustomEventProps;
  startMin: number;
  endMin: number;
  left: number;
  width: number;
  lane: number;
  totalLanes: number;
  isMultiDay: boolean;
}

interface Props {
  event: PositionedEvent;
  session: any;
  isDragging: boolean;
  isResizing: boolean;
  liveLeft?: number;
  liveWidth?: number;
  onMouseDownMove: (e: React.MouseEvent, ev: PositionedEvent) => void;
  onMouseDownResize: (e: React.MouseEvent, ev: PositionedEvent) => void;
  onClick: (ev: PositionedEvent) => void;
}

export function TransposedWeekEvent({
  event,
  isDragging,
  isResizing,
  liveLeft,
  liveWidth,
  onMouseDownMove,
  onMouseDownResize,
  onClick,
}: Props) {
  const props = event.extendedProps;
  const serviceType = props.serviceType || "Appointment";
  const originalData = props.originalData as any;
  const categoryColor =
    props.serviceCategoryColor || originalData?.serviceCategory?.color;
  const colors = getServiceColor(
    serviceType,
    serviceType === "Appointment" ? categoryColor : undefined,
  );

  const left = liveLeft ?? event.left;
  const width = liveWidth ?? event.width;
  const lanePct = 100 / Math.max(1, event.totalLanes);
  const topPct = event.lane * lanePct;

  const style: CSSProperties = {
    left: `${left}px`,
    width: `${Math.max(width, 24)}px`,
    top: `calc(${topPct}% + 1px)`,
    bottom: "auto",
    height: `calc(${lanePct}% - 2px)`,
    background: `linear-gradient(to bottom, ${colors.gradient.join(", ")})`,
    border: `1px solid ${colors.borderColor}`,
    color: "#1f2937",
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(event);
  };

  const clientName = originalData?.client
    ? `${originalData.client.firstName} ${originalData.client.lastName}`
    : event.title;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (event.isMultiDay) return;
    onMouseDownMove(e, event);
  };

  return (
    <div
      className={`${styles.eventCard} ${
        isDragging || isResizing ? styles.eventCardDragging : ""
      }`}
      style={{ ...style, cursor: event.isMultiDay ? "pointer" : "grab" }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      data-event-id={event.id}
    >
      <div className={`${styles.stickyInner} text-xs leading-tight`}>
        <span
          className="text-[8px] font-bold uppercase tracking-wide truncate"
          style={{ color: colors.accentColor }}
        >
          {serviceType}
        </span>
        <span className="font-bold text-[11px] text-gray-900 truncate">
          {clientName}
        </span>
        {originalData?.vehicle && (
          <span className="text-[10px] text-gray-600 truncate">
            {originalData.vehicle.year} {originalData.vehicle.make}{" "}
            {originalData.vehicle.model}
          </span>
        )}
      </div>
      {!event.isMultiDay && (
        <div
          className={styles.resizeHandle}
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDownResize(e, event);
          }}
        />
      )}
    </div>
  );
}
