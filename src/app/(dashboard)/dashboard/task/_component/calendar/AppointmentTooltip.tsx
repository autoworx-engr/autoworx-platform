import { Appointment, Client, User } from "@prisma/client";
import {
  MessageCircleMore,
  SquarePen,
  Clock,
  Mail,
  Phone,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import moment from "moment";
import Link from "next/link";
import { useEffect, useRef } from "react";

type TAppointmentTooltipProps = {
  event: Appointment & {
    client?: Client;
    assignedUsers?: User[];
  };
  onModalOpen?: () => void;
  onClose?: () => void;
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
const TooltipDetail: React.FC<{
  icon: any;
  children: React.ReactNode;
  label: string;
}> = ({ icon: Icon, children, label }) => (
  <p className={`flex items-start gap-2 text-sm ${SLATE_TEXT_COLOR}`}>
    <Icon size={16} className={`mt-0.5 min-w-[16px] ${INFO_TEXT_COLOR}`} />
    <span className="font-medium text-left">{label}:</span>
    <span className="flex-1 min-w-0 truncate font-normal">{children}</span>
  </p>
);

export default function AppointmentTooltip({
  event,
  onModalOpen,
  onClose,
}: TAppointmentTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Handle outside clicks
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        onClose?.();
      }
    };

    // Handle scroll events
    const handleScroll = () => {
      onClose?.();
    };

    // Add event listeners
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);

    // Cleanup
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  return (
    <div
      ref={tooltipRef}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Close (X) at top-right */}
      <button
        type="button"
        aria-label="Close"
        className="absolute right-0 top-0  p-1 text-slate-600"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClose && onClose();
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2 pr-2">
        <h3 className="font-semibold text-lg max-w-sm truncate">
          {event.title}
        </h3>
        {/* Chat Link */}
        <div className="flex gap-2">
          <Link
            href={`/dashboard/communication/client/${event.clientId}?chat=true`}
            className="rounded-full bg-[#6571FF] p-2 text-white"
            title="Open Chat"
          >
            <MessageCircleMore
              strokeWidth={2.5}
              className="h-4 w-4 cursor-pointer mx-auto"
            />
          </Link>
          <button
            type="button"
            className="rounded-full bg-[#6571FF] p-2 text-white"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onModalOpen && onModalOpen();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            <SquarePen className="w-4 h-4 cursor-pointer mx-auto" />
          </button>
        </div>
      </div>

      {/* 2. Time and Core Details */}
      <div className="space-y-2 py-2">
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
          <p className={`text-sm italic font-semibold ${INFO_TEXT_COLOR} mb-1`}>
            Notes:
          </p>
          <p className={`text-xs ${SLATE_TEXT_COLOR}`}>{event.notes}</p>
        </div>
      )}
    </div>
  );
}
