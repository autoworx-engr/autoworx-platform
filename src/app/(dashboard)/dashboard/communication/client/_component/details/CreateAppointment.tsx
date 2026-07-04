"use client";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { cn } from "@/lib/cn";
import { Appointment, Lead } from "@prisma/client";
import { Plus } from "lucide-react";

export default function CreateAppointment({ clientId }: { clientId: number }) {
  const handleAppointmentCreate = async (
    newAppointment: Appointment & { lead: Lead | null },
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
            "inline-flex w-full items-center justify-center gap-1.5",
            "rounded-lg border border-white/40 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur",
            "transition hover:bg-white/20 active:scale-[0.98]",
            "focus:outline-none focus:ring-2 focus:ring-white/40 2xl:text-sm",
          )}
        >
          <Plus className="h-4 w-4" />
          <span>Appointment</span>
        </button>
      }
      clientId={clientId}
      onAppointmentCreated={handleAppointmentCreate}
      fromLead
    />
  );
}
