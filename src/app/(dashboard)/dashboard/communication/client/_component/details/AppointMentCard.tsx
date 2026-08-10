import { Appointment } from "@prisma/client";
import { SquarePen } from "lucide-react";
import moment from "moment";

const AppointMentCard = ({
  appointment,
  openEditor,
  title,
}: {
  appointment: Appointment[];
  openEditor: (id: number) => void;
  title: string;
}) => {
  return (
    <div>
      <h4 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
        {title}
      </h4>
      <div className="flex flex-col gap-2">
        {appointment.map((appt) => (
          <div
            key={appt.id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div>
              <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {appt.title}
              </div>
              <div className="text-xs text-zinc-500">
                {moment.utc(appt.date).format("MMMM D, YYYY")} ·{" "}
                {moment(appt.startTime, "HH:mm").format("hh:mm A")} -{" "}
                {moment(appt.endTime, "HH:mm").format("hh:mm A")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openEditor(appt.id)}
                className="text-xs rounded-full bg-[#e8e8e8] px-3 py-1 font-medium hover:bg-[#e0e0e0]"
              >
                <SquarePen className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppointMentCard;
