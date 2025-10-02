import { Appointment, Client, User } from "@prisma/client";
import { SquarePen } from "lucide-react";
import moment from "moment";

type TAppointmentTooltipProps = {
  event: Appointment & {
    client?: Client;
    assignedUsers?: User[];
  };
  onModalOpen?: () => void;
};
export default function AppointmentTooltip({
  event,
  onModalOpen,
}: TAppointmentTooltipProps) {
  return (
    <>
      <div 
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{event.title}</h3>
          <button
            type="button"
            className="text- rounded-full bg-[#6571FF] p-2 text-white"
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

        <p>
          Client:
          {event.client && `${event.client.firstName} ${event.client.lastName}`}
        </p>
        <p>
          Email:
          <a href={`mailto:${event.client?.email}`} className="text-blue-500">
            {event.client?.email}
          </a>
        </p>
        <p>
          Phone:
          <a
            href={`tel:${event.client?.mobile}`}
            className="cursor-pointer text-blue-500"
          >
            {event.client?.mobile}
          </a>
        </p>

        <p>
          Assigned To:{" "}
          {event?.assignedUsers
            ?.slice(0, 1)
            ?.map((user: User) => `${user.firstName} ${user.lastName}`)}
        </p>

        <p>
          {moment(event.startTime, "HH:mm").format("hh:mm A")} To{" "}
          {moment(event.endTime, "HH:mm").format("hh:mm A")}
        </p>
        <p>Notes: {event?.notes}</p>
      </div>
    </>
  );
}
