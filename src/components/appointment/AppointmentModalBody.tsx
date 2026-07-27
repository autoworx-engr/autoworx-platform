"use client";

import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import { cn } from "@/lib/cn";
import { errorToast } from "@/lib/toast";
import { Bell, Calendar } from "lucide-react";
import AppointmentForm from "./AppointmentForm";
import { Reminder } from "./Reminder";
import ScheduleTab from "./ScheduleTab";
import {
  Tab,
  useAppointmentFormState,
  type AppointmentModalBodyProps,
} from "./useAppointmentFormState";

export default function AppointmentModalBody(props: AppointmentModalBodyProps) {
  const {
    fromEdit,
    appointmentId,
    setIsAppointmentModalOpen,
    fromLead,
    clientId,
    vehicleId,
  } = props;

  const state = useAppointmentFormState(props);

  const {
    tab,
    setTab,
    isError,
    appointmentIsFetch,
    settingsIsFetched,
    estimateIsFetched,
    client,
    formChanged,
    isSubmitting,
    resetAll,
    handleSubmit,
    containerRef,
    rows,
    title,
    date,
    endDate,
    startTime,
    endTime,
    times,
    setTimes,
    confirmationTemplate,
    setConfirmationTemplate,
    reminderTemplate,
    setReminderTemplate,
    confirmationTemplateStatus,
    setConfirmationTemplateStatus,
    reminderTemplateStatus,
    setReminderTemplateStatus,
    openConfirmation,
    setOpenConfirmation,
    openReminder,
    setOpenReminder,
    vehicle,
    settings,
    handleDate,
  } = state;

  if (fromEdit && isError) {
    errorToast("Failed to fetch appointment data");
  }

  return (
    <DialogContent
      onOpenAutoFocus={(e) => e.preventDefault()}
      className="grid max-w-5xl grid-rows-[auto,1fr,auto] sm:max-w-[80vw] lg:max-w-6xl"
      form
    >
      <DialogHeader className="grid items-center gap-4 sm:grid-cols-2">
        <DialogTitle>{fromEdit ? "Edit" : "New"} Appointment</DialogTitle>

        <div className="hidden lg:flex items-center justify-self-center rounded-full bg-slate-100 p-1.5 shadow-inner ring-1 ring-slate-200/50">
          <button
            type="button"
            className={cn(
              "flex items-center justify-center rounded-full px-6 py-2 text-sm font-bold transition-all duration-300 ease-out",
              tab === Tab.Schedule
                ? "bg-white text-primary shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:bg-slate-200/50 hover:text-slate-600",
            )}
            onClick={() => setTab(Tab.Schedule)}
          >
            <Calendar
              className={cn(
                "mr-2 transition-colors",
                tab === Tab.Schedule ? "text-primary" : "text-slate-400",
              )}
              size={18}
              strokeWidth={2.5}
            />
            Schedule
          </button>

          <button
            type="button"
            className={cn(
              "flex items-center justify-center rounded-full px-6 py-2 text-sm font-bold transition-all duration-300 ease-out",
              tab === Tab.Reminder
                ? "bg-white text-primary shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:bg-slate-200/50 hover:text-slate-600",
            )}
            onClick={() => setTab(Tab.Reminder)}
          >
            <Bell
              className={cn(
                "mr-2 transition-colors",
                tab === Tab.Reminder ? "text-primary" : "text-slate-400",
              )}
              size={18}
              strokeWidth={2.5}
            />
            Reminder
          </button>
        </div>
      </DialogHeader>

      <div className="-mx-6 min-h-0 max-h-[66vh] lg:max-h-none h-full lg:grid gap-px border-solid lg:grid-cols-2 md:border-y lg:overflow-hidden">
        <AppointmentForm
          {...state}
          fromLead={fromLead}
          fromEdit={fromEdit}
          clientId={clientId}
          vehicleId={vehicleId}
          setIsAppointmentModalOpen={setIsAppointmentModalOpen}
          appointmentId={appointmentId}
        />

        {/* Desktop right panel */}
        <div className="hidden lg:block relative row-span-2 overflow-y-auto thin-scrollbar divide-y bg-background border-l">
          {tab === Tab.Schedule ? (
            <div
              ref={containerRef}
              className="absolute inset-0 divide-y overflow-y-auto thin-scrollbar"
            >
              <ScheduleTab
                rows={rows}
                title={title}
                date={date}
                endDate={endDate}
                startTime={startTime || ""}
                endTime={endTime}
                settings={settings}
                onDateUpDown={(direction: "+" | "-") => handleDate(direction)}
              />
            </div>
          ) : tab === Tab.Reminder ? (
            <Reminder
              client={client}
              vehicle={vehicle}
              startTime={startTime!}
              date={date!}
              timezone={state.timezone}
              times={times}
              setTimes={setTimes}
              confirmationTemplate={confirmationTemplate}
              setConfirmationTemplate={setConfirmationTemplate}
              reminderTemplate={reminderTemplate}
              setReminderTemplate={setReminderTemplate}
              confirmationTemplateStatus={confirmationTemplateStatus}
              setConfirmationTemplateStatus={setConfirmationTemplateStatus}
              reminderTemplateStatus={reminderTemplateStatus}
              setReminderTemplateStatus={setReminderTemplateStatus}
              openConfirmation={openConfirmation}
              openReminder={openReminder}
              setOpenReminder={setOpenReminder}
              setOpenConfirmation={setOpenConfirmation}
            />
          ) : null}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <DialogFooter className="justify-end gap-2">
          <DialogClose asChild>
            <button
              type="button"
              className="rounded-md border px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => resetAll()}
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            className={cn(
              "rounded-md px-6 py-2 text-sm font-medium text-white shadow transition-all duration-200",
              formChanged && !isSubmitting
                ? "cursor-pointer bg-gradient-to-r from-primary to-[#5a66ee] hover:shadow-lg hover:shadow-indigo-500/30"
                : "cursor-not-allowed bg-gray-400",
            )}
            onClick={handleSubmit}
            disabled={
              !formChanged ||
              isSubmitting ||
              (fromEdit && !appointmentIsFetch) ||
              (fromEdit && !settingsIsFetched) ||
              (fromEdit && !!client?.id && !estimateIsFetched)
            }
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}
