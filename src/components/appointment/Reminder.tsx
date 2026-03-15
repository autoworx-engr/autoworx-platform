import { deleteTemplate } from "@/actions/appointment/deleteTemplate";
import { emailTemplateQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import FormError from "@/components/FormError";
import NewTemplate from "@/components/Lists/NewTemplate";
import Selector from "@/components/Selector";
import { Switch } from "@/components/Switch";
import useTemplatesQuery from "@/hooks/query-hook/useTemplatesQuery";
import { useFormErrorStore } from "@/stores/form-error";
import type { Client, EmailTemplate, Vehicle } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useEffect, useState } from "react";
import UpdateTemplate from "./UpdateTemplate";
import {
  Bell,
  Calendar,
  CircleAlert,
  FileText,
  Trash2,
  UserRoundX,
  X,
} from "lucide-react";

type TReminderProps = {
  client: Partial<Client> | null;
  vehicle: Partial<Vehicle> | null;
  startTime: string;
  date: string;
  times: { time: string; date: string }[];
  setTimes: (times: { time: string; date: string }[]) => void;
  confirmationTemplate: EmailTemplate | null;
  setConfirmationTemplate: React.Dispatch<
    React.SetStateAction<EmailTemplate | null>
  >;
  reminderTemplate: EmailTemplate | null;
  setReminderTemplate: React.Dispatch<
    React.SetStateAction<EmailTemplate | null>
  >;
  confirmationTemplateStatus: boolean;
  setConfirmationTemplateStatus: (status: boolean) => void;
  reminderTemplateStatus: boolean;
  setReminderTemplateStatus: (status: boolean) => void;
  openConfirmation: boolean;
  openReminder: boolean;
  setOpenReminder: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenConfirmation: React.Dispatch<React.SetStateAction<boolean>>;
};

export function Reminder({
  client,
  vehicle,
  startTime,
  date,
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
  openReminder,
  setOpenReminder,
  setOpenConfirmation,
}: TReminderProps) {
  const [time, setTime] = useState<string>("");
  const [dateInput, setDateInput] = useState<string>("");

  const { data: templates = [] } = useTemplatesQuery();

  const queryClient = useQueryClient();
  const { showError, clearError, error } = useFormErrorStore();

  useEffect(() => {
    return () => clearError();
  }, []);

  // Add state for minimum date and time validation
  const [minDate, setMinDate] = useState<string>("");

  useEffect(() => {
    setOpenConfirmation(false);
  }, [openReminder]);

  useEffect(() => {
    setOpenReminder(false);
  }, [openConfirmation]);

  // Set minimum date to today
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setMinDate(`${year}-${month}-${day}`);
  }, []);

  // Update minimum start time when date changes
  useEffect(() => {
    if (dateInput === minDate) {
      // If selected date is today, set min time to current time
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentTime = `${hours}:${minutes}`;
      // setMinStartTime(currentTime);

      // If current time is before current time, reset it
      if (time && time < currentTime) {
        // setTime("");
      }
    } else {
      // For future dates, no min time restrictions
      // setMinStartTime("");
    }
  }, [dateInput, minDate, time]);

  async function handleDelete({ id, type }: { id: number; type: string }) {
    await deleteTemplate(id);

    if (type === "Confirmation") {
      // remove this template from the array
      setConfirmationTemplate(null);
    } else {
      // remove this template from the array
      setReminderTemplate(null);
    }

    queryClient.invalidateQueries({
      queryKey: [emailTemplateQueryKey.templates],
    });
  }

  const handleAddReminder = () => {
    // Validate that time is selected
    if (!time) {
      showError({
        message: "Please select a time for the reminder!",
        success: false,
      });
      return;
    }

    // Validate that date is selected
    if (!dateInput) {
      showError({
        message: "Please select a date for the reminder!",
        success: false,
      });
      return;
    }

    // Validate that reminder is not in the past
    // if (dateInput === minDate && time < minStartTime) {
    //   showError({ message: "Reminder time cannot be in the past!", success: false });
    //   return;
    // }

    // Check if reminder is before the appointment
    const appointmentDateTime = moment(
      `${date} ${startTime}`,
      "YYYY-MM-DD HH:mm",
    );
    const reminderDateTime = moment(`${dateInput} ${time}`, "YYYY-MM-DD HH:mm");

    if (reminderDateTime.isAfter(appointmentDateTime)) {
      showError({
        message: "Reminder must be scheduled before the appointment!",
        success: false,
      });
      return;
    }

    // Add the reminder
    setTimes([...times, { time, date: dateInput }]);
    clearError();

    // Optionally clear inputs after adding
    setTime("");
    setDateInput("");
  };

  if (!client) {
    return (
      <div className="flex lg:h-full h-full lg:min-h-[400px] w-full flex-col items-center justify-center gap-4 rounded-3xl bg-slate-50/50 p-8 text-center ring-1 ring-inset ring-slate-100 shadow-inner">
        {/* Elevated Icon Conzzzzztainer */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-100">
          <UserRoundX
            size={40}
            strokeWidth={1.5}
            className="text-slate-300 transition-transform duration-500 group-hover:scale-110"
          />

          {/* Subtle Decorative Pulsing Ring */}
          <div className="absolute inset-0 animate-ping rounded-full bg-slate-200/30 opacity-20" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight text-slate-700">
            No Client Selected
          </h3>
          <p className="mx-auto max-w-[240px] text-sm font-medium text-slate-400">
            Select a client from the list on the left to view their profile and
            activity.
          </p>
        </div>

        {/* Optional Call to Action to make it feel functional */}
        <div className="mt-2 h-1 w-12 rounded-full bg-[#6571FF]/20" />
      </div>
    );
  }

  return (
    <>
      <div className="min-w-[350px] mx-4 space-y-4 p-2 md:w-full">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-slate-600">Confirmation</h2>
          <Switch
            name="confirmation"
            className="ml-auto scale-75"
            checked={confirmationTemplateStatus}
            setChecked={setConfirmationTemplateStatus}
          />
        </div>

        <Selector
          className="min-w-full"
          border
          clickabled={true}
          label={(template: EmailTemplate | null) =>
            template ? template.subject : "Template"
          }
          newButton={
            <NewTemplate
              type="Confirmation"
              clientName={client?.firstName + " " + client?.lastName}
              vehicleModel={vehicle?.model!}
              setTemplate={setConfirmationTemplate}
              setOpenTemplate={setOpenConfirmation}
              date={date}
              startTime={startTime}
            />
          }
          items={templates.filter(
            (template: EmailTemplate) => template.type === "Confirmation",
          )}
          displayList={(template: EmailTemplate) => (
            <div className="group relative flex items-center justify-between">
              <div className="flex items-center gap-3 text-left outline-none">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200 group-hover:bg-[#6571FF]/10 group-hover:ring-[#6571FF]/20 transition-colors">
                  <FileText className="h-4 w-4 text-slate-400 group-hover:text-[#6571FF]" />
                </div>
                <span className="text-sm font-semibold text-slate-600 transition-colors group-hover:text-slate-900">
                  {template.subject}
                </span>
              </div>

              <div className="flex items-center gap-1 transition-opacity duration-200 group-hover:opacity-100">
                <div
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100/50 p-1 ring-1 ring-slate-200/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <UpdateTemplate
                    id={template.id}
                    subject={template.subject}
                    message={template.message || ""}
                  />

                  <div className="h-4 w-[1px] bg-slate-200" />

                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-all bg-rose-50 text-rose-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete({ id: template.id, type: "Confirmation" });
                    }}
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          )}
          selectedItem={confirmationTemplate}
          onSelect={(template) => {
            setConfirmationTemplate(template);
            setOpenConfirmation(false);
          }}
          onSearch={(search: string) =>
            templates.filter((template) =>
              template.subject.toLowerCase().includes(search.toLowerCase()),
            )
          }
        // openState={[openConfirmation, setOpenConfirmation]}
        />
      </div>
      <div className="min-w-[350px] mx-4 space-y-4 p-2 md:w-full">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-slate-600">Reminder</h2>
          <Switch
            name="reminder"
            className="ml-auto scale-75"
            checked={reminderTemplateStatus}
            setChecked={setReminderTemplateStatus}
          />
        </div>

        <Selector
          className="min-w-full"
          border
          clickabled={true}
          label={(template: EmailTemplate | null) =>
            template ? template.subject : "Template"
          }
          newButton={
            <NewTemplate
              type="Reminder"
              clientName={client?.firstName + " " + client?.lastName}
              vehicleModel={vehicle?.model!}
              setTemplate={setReminderTemplate}
              setOpenTemplate={setOpenReminder}
              date={date}
              startTime={startTime}
            />
          }
          items={templates.filter(
            (template: EmailTemplate) => template.type === "Reminder",
          )}
          displayList={(template: EmailTemplate) => (
            <div className="group relative flex items-center justify-between">
              <div className="flex items-center gap-3 text-left outline-none">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200 group-hover:bg-[#6571FF]/10 group-hover:ring-[#6571FF]/20 transition-colors">
                  <FileText className="h-4 w-4 text-slate-400 group-hover:text-[#6571FF]" />
                </div>
                <span className="text-sm font-semibold text-slate-600 transition-colors group-hover:text-slate-900">
                  {template.subject}
                </span>
              </div>

              <div className="flex items-center gap-1 transition-opacity duration-200 group-hover:opacity-100">
                <div
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100/50 p-1 ring-1 ring-slate-200/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <UpdateTemplate
                    id={template.id}
                    subject={template.subject}
                    message={template.message || ""}
                  />

                  <div className="h-4 w-[1px] bg-slate-200" />

                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-all bg-rose-50 text-rose-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete({ id: template.id, type: "Reminder" });
                    }}
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          )}
          selectedItem={reminderTemplate}
          onSelect={(template) => {
            setReminderTemplate(template);
            setOpenReminder(false);
          }}
          onSearch={(search: string) =>
            templates.filter((template) =>
              template.subject.toLowerCase().includes(search.toLowerCase()),
            )
          }
        // openState={[openReminder, setOpenReminder]}
        />
      </div>

      <div className="mx-auto my-4 w-full max-w-[500px] overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
        {/* Input Header Area */}
        <div className="flex flex-col gap-3 bg-slate-50/50 p-4 border-b border-slate-100 md:flex-row md:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-base font-medium text-slate-600 ml-1">
              Time <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              className="w-full h-10 min-h-[40px] appearance-none rounded-lg border-none bg-transparent px-3 text-sm text-slate-600 ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-[#6571FF]/30 outline-none"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div className="flex-1 space-y-1.5">
            <label className="text-base font-medium text-slate-600 ml-1">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              className="w-full h-10 min-h-[40px] appearance-none rounded-lg border-none bg-transparent px-3 text-sm text-slate-600 ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-[#6571FF]/30 outline-none"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              min={minDate}
            />
          </div>

          <button
            type="button"
            className="h-10 rounded-lg bg-[#6571FF] px-6 text-sm font-bold text-white shadow-md shadow-[#6571FF]/20 transition-all hover:scale-[1.02] active:scale-95"
            onClick={handleAddReminder}
          >
            Add
          </button>
        </div>

        {/* Reminders List Area */}
        <div className="no-visible-scrollbar h-[250px] overflow-y-auto bg-white md:h-[320px]">
          {times.length > 0 ? (
            <div className="space-y-1">
              {times.map((timeObj, index) => {
                const timeObjMoment = moment(
                  `${timeObj.date} ${timeObj.time}`,
                  "YYYY-MM-DD HH:mm",
                );
                const formattedTime = timeObjMoment.format("MMM Do, YYYY");
                const formattedHour = timeObjMoment.format("h:mm A");

                return (
                  <div
                    key={index}
                    className="group flex items-center justify-between rounded-xl p-3 transition-all duration-200 hover:bg-slate-50 animate-in fade-in slide-in-from-bottom-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Bell size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-tight">
                          Reminder
                        </p>
                        <p className="text-sm font-medium text-slate-700">
                          {formattedTime} at{" "}
                          <span className="font-bold text-slate-900">
                            {formattedHour}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                      onClick={() =>
                        setTimes(times.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
              <div className="mb-2 rounded-full bg-slate-50 p-3 text-slate-300">
                <Calendar size={24} />
              </div>
              <p className="text-sm font-medium text-slate-400">
                No reminders scheduled
              </p>
              <p className="text-[11px] text-slate-300">
                Add a time and date above to notify the user.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 p-2 text-sm text-yellow-800">
        <CircleAlert className="mt-1 h-5 w-5 flex-shrink-0 text-yellow-600" />
        <div className="flex-1 min-w-0">
          <p className="leading-relaxed break-words">
            Your client will receive automated reminders{" "}
            <strong>24 hours</strong> and <strong>2 hours</strong> prior to
            their scheduled appointment.
          </p>
        </div>
      </div>
    </>
  );
}
