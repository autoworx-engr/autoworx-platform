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
      errorHandler(err);
    }
  };

  return (
    <AppointmentCreateOrEdit
      triggerIcon={
        <button
          className={cn(
            "inline-flex w-full items-center justify-center gap-1.5",
            "rounded-lg bg-[#006D77] px-3 py-2 text-xs font-medium text-white shadow-sm",
            "transition-all hover:bg-[#005a63] active:scale-[0.98]",
            "focus:outline-none focus:ring-2 focus:ring-[#006D77]/40",
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Appointment</span>
        </button>
      }
      clientId={clientId}
      onAppointmentCreated={handleAppointmentCreate}
      fromLead
    />
  );
}
