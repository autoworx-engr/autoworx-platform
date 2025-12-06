import { Appointment, Client, User } from "@prisma/client";
import { SquarePen, Clock, Mail, Phone, User as UserIcon, Users } from "lucide-react";
import moment from "moment";

type TAppointmentTooltipProps = {
  event: Appointment & {
    client?: Client;
    assignedUsers?: User[];
  };
  onModalOpen?: () => void;
};

// --- STYLES DEFINITION ---
const TRANSITION_UTILITY = "transition-all duration-300 ease-in-out";
const SLATE_TEXT_COLOR = "text-slate-600 dark:text-slate-300";
const INFO_TEXT_COLOR = "text-slate-500 dark:text-slate-400";
const LINK_BLUE = "text-blue-500 hover:text-blue-400";
const LINK_EMERALD = "text-emerald-500 hover:text-emerald-400"; // Using emerald for phone links
const ACTION_COLOR = "#6571FF"; // Special action color for the edit button
// --- END STYLES DEFINITION ---

// Helper component for structured detail rows
const TooltipDetail: React.FC<{ icon: any, children: React.ReactNode, label: string }> = ({
  icon: Icon,
  children,
  label
}) => (
  <p className={`flex items-start gap-2 text-sm ${SLATE_TEXT_COLOR}`}>
    <Icon size={16} className={`mt-0.5 min-w-[16px] ${INFO_TEXT_COLOR}`} />
    <span className="font-medium text-left">{label}:</span>
    <span className="flex-1 min-w-0 truncate font-normal">{children}</span>
  </p>
);


export default function AppointmentTooltip({
  event,
  onModalOpen,
}: TAppointmentTooltipProps) {
  return (
    // Outer div maintains click/drag isolation
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="space-y-3"
    >

      {/* 1. Title and Edit Button (Sleek Header) */}
      <div className="flex items-start justify-between pb-2 border-b border-slate-200 dark:border-slate-700">

        {/* Title: Professional, higher contrast typography */}
        <h3 className="text-xl font-extrabold text-slate-600 dark:text-white mr-4">
          {event.title}
        </h3>

        {/* Edit Button: Sleek, premium style with the action color */}
        <button
          type="button"
          className={`flex-shrink-0 rounded-md p-1 text-white bg-[${ACTION_COLOR}] 
                      shadow-md shadow-[${ACTION_COLOR}]/40 hover:shadow-lg 
                      hover:scale-[1.05] ${TRANSITION_UTILITY}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onModalOpen && onModalOpen();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <SquarePen className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>
      </div>

      {/* 2. Time and Core Details */}
      <div className="space-y-2">

        {/* Time Range */}
        <TooltipDetail icon={Clock} label="Time">
          <span className="font-semibold text-cyan-600 dark:text-cyan-400">
            {moment(event.startTime, "HH:mm").format("h:mm A")} to{" "}
            {moment(event.endTime, "HH:mm").format("h:mm A")}
          </span>
        </TooltipDetail>

        {/* Client Name */}
        {event.client && (
          <TooltipDetail icon={UserIcon} label="Client">
            <span className="font-semibold">{`${event.client.firstName} ${event.client.lastName || ""}`}</span>
          </TooltipDetail>
        )}

        {/* Email Link (Iconified) */}
        {event.client?.email && (
          <TooltipDetail icon={Mail} label="Email">
            <a
              href={`mailto:${event.client.email}`}
              className={`font-medium ${LINK_BLUE}`}
            >
              {event.client.email}
            </a>
          </TooltipDetail>
        )}

        {/* Phone Link (Iconified) */}
        {event.client?.mobile && (
          <TooltipDetail icon={Phone} label="Phone">
            <a
              href={`tel:${event.client.mobile}`}
              className={`cursor-pointer font-medium ${LINK_EMERALD}`}
            >
              {event.client.mobile}
            </a>
          </TooltipDetail>
        )}

        {/* Assigned To */}
        {event?.assignedUsers && event.assignedUsers.length > 0 && (
          <TooltipDetail icon={Users} label="Assigned">
            {event.assignedUsers
              .slice(0, 1)
              .map((user: User) => `${user.firstName} ${user.lastName}`)}
          </TooltipDetail>
        )}
      </div>

      {/* 3. Notes (Subtle Footer) */}
      {event?.notes && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
          <p className={`text-sm italic font-semibold ${INFO_TEXT_COLOR} mb-1`}>Notes:</p>
          <p className={`text-xs ${SLATE_TEXT_COLOR}`}>{event.notes}</p>
        </div>
      )}
    </div>
  );
}