import { deleteTemplate } from "@/actions/appointment/deleteTemplate";
import NewTemplate from "@/components/Lists/NewTemplate";
import Selector from "@/components/Selector";
import { Switch } from "@/components/Switch";
import { errorToast } from "@/lib/toast";
import { useListsStore } from "@/stores/lists";
import type { Client, EmailTemplate, Vehicle } from "@prisma/client";
import { Trash2, UserRoundX, X } from "lucide-react";
import moment from "moment";
import { useEffect, useState } from "react";
import UpdateTemplate from "./UpdateTemplateComponent";

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
}: {
  client: Client | null;
  vehicle: Vehicle | null;
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
}) {
  const [time, setTime] = useState<string>("");
  const [dateInput, setDateInput] = useState<string>("");
  const templates = useListsStore((x) => x.templates);

  // Add state for minimum date and time validation
  const [minDate, setMinDate] = useState<string>("");
  // const [minStartTime, setMinStartTime] = useState<string>("");

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

    // remove this template from the array
    useListsStore.setState(({ templates }) => ({
      templates: templates.filter((template) => template.id !== id),
    }));
  }

  const handleAddReminder = () => {
    // Validate that date is selected
    if (!dateInput) {
      errorToast("Please select a date for the reminder!");
      return;
    }

    // Validate that time is selected
    if (!time) {
      errorToast("Please select a time for the reminder!");
      return;
    }

    // Validate that reminder is not in the past
    // if (dateInput === minDate && time < minStartTime) {
    //   errorToast("Reminder time cannot be in the past!");
    //   return;
    // }

    // Check if reminder is before the appointment
    const appointmentDateTime = moment(
      `${date} ${startTime}`,
      "YYYY-MM-DD HH:mm",
    );
    const reminderDateTime = moment(`${dateInput} ${time}`, "YYYY-MM-DD HH:mm");

    if (reminderDateTime.isAfter(appointmentDateTime)) {
      errorToast("Reminder must be scheduled before the appointment!");
      return;
    }

    // Add the reminder
    setTimes([...times, { time, date: dateInput }]);

    // Optionally clear inputs after adding
    setTime("");
    setDateInput("");
  };

  return client === null ? (
    <div className="grid h-full place-content-center place-items-center gap-2 border-[1.5rem] border-solid border-white bg-neutral-300 text-center text-slate-500">
      <UserRoundX size={64} />
      <span>No Client Selected</span>
    </div>
  ) : (
    <>
      <div className="mx-auto w-[350px] space-y-4 p-2 md:w-full">
        <label className="flex items-center">
          <h2>Confirmation</h2>
          <Switch
            name="confirmation"
            className="ml-auto scale-75"
            checked={confirmationTemplateStatus}
            setChecked={setConfirmationTemplateStatus}
          />
        </label>

        <Selector
          border
          clickabled={false}
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
            <div className="flex">
              <button
                className="w-full text-left  text-sm font-bold"
                onClick={() => {
                  setConfirmationTemplate(template);
                  setOpenConfirmation(false);
                }}
                type="button"
              >
                {template.subject}
              </button>
              <div className="flex items-center gap-2">
                <UpdateTemplate
                  id={template.id}
                  subject={template.subject}
                  message={template.message || ""}
                />
                <button
                  type="button"
                  onClick={() =>
                    handleDelete({ id: template.id, type: "Confirmation" })
                  }
                >
                  <X strokeWidth={2} />
                </button>
              </div>
            </div>
          )}
          selectedItem={confirmationTemplate}
          setSelectedItem={setConfirmationTemplate}
          onSearch={(search: string) =>
            templates.filter((template) =>
              template.subject.toLowerCase().includes(search.toLowerCase()),
            )
          }
          openState={[openConfirmation, setOpenConfirmation]}
        />
      </div>
      <div className="mx-auto w-[350px] space-y-4 p-2 md:w-full">
        <label className="flex items-center">
          <h2>Reminder</h2>
          <Switch
            name="reminder"
            className="ml-auto scale-75"
            checked={reminderTemplateStatus}
            setChecked={setReminderTemplateStatus}
          />
        </label>

        <Selector
          border
          clickabled={false}
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
            <div className="flex">
              <button
                className="w-full text-left text-sm font-bold"
                onClick={() => {
                  setReminderTemplate(template);
                  setOpenReminder(false);
                }}
                type="button"
              >
                {template.subject}
              </button>
              <div className="flex items-center gap-2">
                <UpdateTemplate
                  id={template.id}
                  subject={template.subject}
                  message={template.message || ""}
                />
                <button
                  type="button"
                  onClick={() =>
                    handleDelete({ id: template.id, type: "Reminder" })
                  }
                >
                  <X strokeWidth={2} />
                </button>
              </div>
            </div>
          )}
          selectedItem={reminderTemplate}
          setSelectedItem={setReminderTemplate}
          onSearch={(search: string) =>
            templates.filter((template) =>
              template.subject.toLowerCase().includes(search.toLowerCase()),
            )
          }
          openState={[openReminder, setOpenReminder]}
        />
      </div>

      <div className="mx-auto my-2 w-[350px] rounded-md border-2 border-slate-400 md:w-[95%]">
        <div className="flex items-center justify-evenly gap-2 border-b p-3">
          {/* input time */}
          <input
            type="time"
            className="w-[120px] rounded-lg border-2 border-slate-400 px-2 md:w-full"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          {/* <TimeInput
            id="time"
            name="time"
            rootClassName="grow"
            value={time}
            minTime={dateInput === minDate ? minStartTime : undefined}
            onChange={(value) => setTime(value)}
            required
          /> */}
          <input
            type="date"
            className="w-[120px] rounded-md border border-slate-400 px-1 py-[1px] placeholder-slate-800 md:w-full"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            min={minDate}
          />
          <button
            type="button"
            className="rounded-lg bg-primary p-2 px-4 text-white"
            onClick={handleAddReminder}
          >
            Add
          </button>
        </div>

        <div className="h-[200px] overflow-scroll border-b border-slate-400 p-2 md:h-[300px]">
          {/* Calculate current time and dateInput with endTime and date */}
          {/* Like:  6 days 7 hours before appointment */}
          {/* also format date and times to use with moment */}

          {times.map((timeObj, index) => {
            // const appointmentTime = moment(
            //   `${date} ${startTime}`,
            //   "YYYY-MM-DD HH:mm",
            // ).utc();

            const timeObjMoment = moment(
              `${timeObj.date} ${timeObj.time}`,
              "YYYY-MM-DD HH:mm",
            );

            const formattedTime = moment(timeObjMoment).format(
              "MMMM Do YYYY, h:mm A",
            );

            // const diff = moment.duration(appointmentTime.diff(timeObjMoment));

            // const days = diff.days();
            // const hours = diff.hours();
            // const minutes = diff.minutes();

            return (
              <div key={index} className="flex justify-between px-5">
                <p>
                  Appointment Reminder:{" "}
                  <span className="text-green-600">{formattedTime}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setTimes(times.filter((_, i) => i !== index))}
                >
                  <Trash2 />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
