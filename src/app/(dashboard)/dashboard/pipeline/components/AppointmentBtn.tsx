"use client";
import { Appointment } from "@prisma/client";
import { LuCalendar, LuCalendarCheck } from "react-icons/lu";

type TProps = {
  onOpenAppointment: () => void;
  appointment?: Partial<Appointment>;
};

export default function AppointmentBtn({
  onOpenAppointment,
  appointment,
}: TProps) {
  return (
    <button onClick={onOpenAppointment} className="group relative">
      {!!appointment ? (
        <LuCalendarCheck size={18} color="#6571FF" />
      ) : (
        <LuCalendar size={18} color="#66738C" />
      )}

      <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
        New Appointment
      </span>
    </button>
  );
}
