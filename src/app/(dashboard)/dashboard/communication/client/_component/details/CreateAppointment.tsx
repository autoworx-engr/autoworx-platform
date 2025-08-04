'use client';
import { updatePipelineAutomationTrigger } from '@/actions/automation/pipeline/triggerPipelineAutomation';
import { AppointmentCreateOrEdit } from '@/components/appointment/AppointmentCreateOrEdit';
import { errorHandler } from '@/error-boundary/globalErrorHandler';
import { Appointment, Lead } from '@prisma/client';

export default function CreateAppointment({ clientId }: { clientId: number }) {
  const handleAppointmentCreate = async (
    newAppointment: Appointment & { lead: Lead | null }
  ) => {
    try {
      if (newAppointment?.lead?.columnId && newAppointment?.lead?.companyId) {
        await updatePipelineAutomationTrigger({
          condition: 'APPOINTMENT_SCHEDULED',
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
        <button className="group relative mt-2 mb-2 rounded-md bg-background px-4 py-2 font-bold text-emerald-700 shadow-lg">
          Set Appointment +
        </button>
      }
      clientId={clientId}
      onAppointmentCreated={handleAppointmentCreate}
      fromLead
    />
  );
}
