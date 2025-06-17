"use client";
import { NewAppointmentPipeline } from "@/app/(dashboard)/dashboard/pipeline/components/NewAppointmentPipeline";
import { usePopupStore } from "@/stores/popup";

export default function CreateAppointment({ clientId }: { clientId: number }) {
  const { popup, open, close } = usePopupStore();
  return (
    <NewAppointmentPipeline
      clientId={clientId}
      popup={popup}
      open={open}
      close={close}
      showButton
      shouldRemoveClientId={false}
    />
  );
}
