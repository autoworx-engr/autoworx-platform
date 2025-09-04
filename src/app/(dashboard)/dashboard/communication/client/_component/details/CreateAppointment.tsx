"use client";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { cn } from "@/lib/cn";
import { Appointment, Lead } from "@prisma/client";

export default function CreateAppointment({ clientId }: { clientId: number }) {
  const handleAppointmentCreate = async (
    newAppointment: Appointment & { lead: Lead | null }
  ) => {
    try {
      if (newAppointment?.lead?.columnId && newAppointment?.lead?.companyId) {
        await updatePipelineAutomationTrigger({
          condition: "APPOINTMENT_SCHEDULED",
          companyId: newAppointment?.lead?.companyId,
          leadId: newAppointment?.lead?.id,
          columnId: newAppointment?.lead?.columnId,
        });
      }
    } catch (err) {
      // console.error("Error creating appointment:", err);
      errorHandler(err);
    }
  };

  return (
    <AppointmentCreateOrEdit
      triggerIcon={
        <button
          className={cn(
            "group relative mt-2 mb-2 inline-flex items-center justify-center gap-1.5",
            "rounded-full border border-zinc-300 bg-white/80 px-5 py-2 text-sm font-medium text-zinc-700 shadow-sm",
            "backdrop-blur transition-all duration-200 ease-in-out",
            "hover:border-emerald-500 hover:text-emerald-600 hover:shadow-md",
            "active:scale-[0.98]",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          )}
        >
          <span>Set Appointment</span>
          <span className="text-base leading-none">+</span>
        </button>
      }
      clientId={clientId}
      onAppointmentCreated={handleAppointmentCreate}
      fromLead
    />
  );
}
