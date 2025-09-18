"use client";

import { addAppointment } from "@/actions/appointment/addAppointment";
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import Selector from "@/components/Selector";
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import { cn } from "@/lib/cn";
import { useFormErrorStore } from "@/stores/form-error";
import AppointmentTitleSelectAndAdd from "./AppointmentTitleSelectAndAdd";

import type {
  Appointment,
  Client,
  EmailTemplate,
  Lead,
  User,
  Vehicle,
} from "@prisma/client";

import { deleteAppointment } from "@/actions/appointment/deleteAppointment";
import { editAppointment } from "@/actions/appointment/editAppointment";
import useSettingsQuery from "@/app/(dashboard)/dashboard/task/_hook/settings/query/useSettingsQuery";
import useAppointmentQueryById from "@/hooks/query-hook/useAppointmentQueryById";
import useEstimatesQueryByClient from "@/hooks/query-hook/useEstimatesQueryByClient";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { queryKeys } from "@/lib/queryKeys";
import { errorToast, successToast } from "@/lib/toast";
import { useCalendarStore } from "@/stores/calendarStore";
import { formatTime } from "@/utils/taskAndActivity";
import { addOneHour, formatDateToToday, getCurrentTime } from "@/utils/time";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment-timezone";
import { customAlphabet } from "nanoid";
import { useEffect, useRef, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { TbBell, TbCalendar } from "react-icons/tb";
import AssignUsers from "./AssignUsers";
import { Reminder } from "./Reminder";
import ScheduleTab from "./ScheduleTab";
import { SelectAppointmentClient } from "./SelectAppointmentClient";
import { SelectAppointmentVehicle } from "./SelectAppointmentVehicle";
import { formatTime12Hour } from "@/utils/formateTime12Hours";
import { Select } from "antd";
import { normalizeTime } from "@/utils/normalizeTime";
enum Tab {
  Schedule = 0,
  Reminder = 1,
}

type AppointmentModalBodyProps = {
  fromLead?: boolean;
  clientId?: number | null;
  vehicleId?: number | null;
  date?: Date | string;
  startTime?: string;
  fromEdit?: boolean;
  appointmentId?: number;
  onModalClose: () => void;
  setIsAppointmentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onAppointmentCreated?: (
    appointment: Appointment & { lead: Lead | null }
  ) => void;
  onAppointmentUpdated?: (
    appointment: Appointment & { lead: Lead | null }
  ) => void;
  onAppointmentDeleted?: (appointmentId?: number) => void;
};

export default function AppointmentModalBody({
  fromLead = false,
  clientId,
  vehicleId,
  date: selectedDate,
  startTime: selectedStartTime,
  onModalClose,
  fromEdit,
  appointmentId,
  onAppointmentCreated,
  onAppointmentUpdated,
  onAppointmentDeleted,
  setIsAppointmentModalOpen,
}: AppointmentModalBodyProps) {
  const { Option } = Select;
  const {
    data: appointment,
    isError,
    isFetched: appointmentIsFetch,
  } = useAppointmentQueryById(appointmentId!, {
    enabled: fromEdit && !!appointmentId,
  });
  const { data: settings, isFetched: settingsIsFetched } = useSettingsQuery();

  const queryClient = useQueryClient();
  const { showError } = useFormErrorStore();
  const { setUpdateVariable } = useCalendarStore();

  const [client, setClient] = useState<Partial<
    Client & {
      Lead: { id: number; companyId: number; columnId: number };
    }
  > | null>(null);

  const { data: estimates = [], isFetched: estimateIsFetched } =
    useEstimatesQueryByClient(
      client?.id!,
      { id: true, clientId: true },
      { enabled: !!client?.id }
    );

  const draftEstimates = estimates.map((estimate) => estimate.id);

  const timezone = useCompanyTimezone();
  const today = moment.tz(timezone).format("YYYY-MM-DD");

  const [tab, setTab] = useState(Tab.Reminder);

  const [date, setDate] = useState<string | undefined>(
    appointment?.date
      ? moment.utc(appointment?.date).format("YYYY-MM-DD")
      : today
  );
  const [title, setTitle] = useState<string>("");

  const [notes, setNotes] = useState("");

  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("00:00");
  const [allDay, setAllDay] = useState(false);
  const [vehicle, setVehicle] = useState<Partial<Vehicle> | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);

  const [times, setTimes] = useState<{ time: string; date: string }[]>([]);
  const [confirmationTemplate, setConfirmationTemplate] =
    useState<EmailTemplate | null>(null);
  const [reminderTemplate, setReminderTemplate] =
    useState<EmailTemplate | null>(null);

  const [confirmationTemplateStatus, setConfirmationTemplateStatus] =
    useState(false);
  const [reminderTemplateStatus, setReminderTemplateStatus] = useState(false);

  const [draftOpen, setDraftOpen] = useState(false);

  // dropdown states
  const [clientOpenDropdown, setClientOpenDropdown] = useState(false);
  const [vehicleOpenDropdown, setVehicleOpenDropdown] = useState(false);

  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [openReminder, setOpenReminder] = useState(false);

  useEffect(() => {
    if (fromEdit && appointment) {
      setTitle(appointment?.title || "");
      setDate(moment.utc(appointment?.date ?? "").format("YYYY-MM-DD"));

      if (appointment?.startTime) {
        const parsed = normalizeTime(appointment.startTime);
        if (parsed) {
          const roundedMinutes = Math.ceil(parsed.minute() / 15) * 15;
          parsed.minute(roundedMinutes).second(0).millisecond(0);
          setStartTime(parsed.format("HH:mm")); // always 24h
        }
      }

      if (appointment?.endTime) {
        const parsed = normalizeTime(appointment.endTime);
        if (parsed) {
          const roundedMinutes = Math.ceil(parsed.minute() / 15) * 15;
          parsed.minute(roundedMinutes).second(0).millisecond(0);
          setEndTime(parsed.format("HH:mm")); // always 24h
        }
      }

      setNotes(appointment?.notes ?? "");
      setClient(appointment?.client ?? null);
      setVehicle(appointment?.vehicle ?? null);
      setDraft(appointment?.draftEstimate ?? null);
      setAssignedUsers(appointment?.assignUsers ?? []);
      setTimes((appointment?.times as any) ?? []);
      setConfirmationTemplate(appointment?.confirmationEmailTemplate ?? null);
      setReminderTemplate(appointment?.reminderEmailTemplate ?? null);
      setConfirmationTemplateStatus(
        appointment?.confirmationEmailTemplateStatus ?? false
      );
      setReminderTemplateStatus(
        appointment?.reminderEmailTemplateStatus ?? false
      );

      // Update original values when appointment data is loaded
      setOriginalValues({
        title: appointment?.title || "",
        date: moment.utc(appointment?.date ?? "").format("YYYY-MM-DD"),
        startTime: appointment?.startTime ?? "",
        endTime: appointment?.endTime ?? "",
        assignedUsers: appointment?.assignUsers
          ? [...appointment.assignUsers]
          : [],
        client: appointment?.client ?? null,
        vehicle: appointment?.vehicle ?? null,
        draft: appointment?.draftEstimate ?? null,
        notes: appointment?.notes ?? "",
        confirmationTemplate: appointment?.confirmationEmailTemplate ?? null,
        reminderTemplate: appointment?.reminderEmailTemplate ?? null,
        confirmationTemplateStatus:
          appointment?.confirmationEmailTemplateStatus ?? false,
        reminderTemplateStatus:
          appointment?.reminderEmailTemplateStatus ?? false,
        times: (appointment?.times as any) ?? [],
      });
    }
  }, [fromEdit, appointment]);

  // Initialize original values for new appointments
  useEffect(() => {
    if (!fromEdit) {
      setOriginalValues({
        title: "",
        date: today,
        startTime: "",
        endTime: "",
        assignedUsers: [],
        client: null,
        vehicle: null,
        draft: null,
        notes: "",
        confirmationTemplate: null,
        reminderTemplate: null,
        confirmationTemplateStatus: false,
        reminderTemplateStatus: false,
        times: [],
      });
    }
  }, [fromEdit, today]);

  useEffect(() => {
    if (selectedStartTime) {
      if (
        typeof selectedStartTime === "string" &&
        selectedStartTime.includes(":")
      ) {
        setStartTime(selectedStartTime);
        setEndTime(addOneHour(selectedStartTime));
      } else {
        try {
          const dateObj = new Date(selectedStartTime);
          const formattedTime = `${dateObj.getHours().toString().padStart(2, "0")}:${dateObj.getMinutes().toString().padStart(2, "0")}`;
          setStartTime(formattedTime);
          setEndTime(addOneHour(formattedTime));
        } catch (e) {
          console.error("Failed to parse startTime:", e);
        }
      }
    }

    if (selectedDate) {
      if (typeof selectedDate === "string" && selectedDate.includes("-")) {
        setDate(selectedDate);
      } else {
        try {
          const selectedDateObj = moment(selectedDate);
          const formattedDate = selectedDateObj.format("YYYY-MM-DD");
          setDate(formattedDate);
        } catch (e) {
          console.error("Failed to parse date:", e);
        }
      }
    }
  }, [selectedDate, selectedStartTime]);

  // Update date whenever today changes (when timezone loads)
  useEffect(() => {
    // Only update date if we're not editing an appointment and don't have a selected date
    if (!fromEdit && !selectedDate) {
      setDate(today);
    }
  }, [today, fromEdit, selectedDate]);

  useEffect(() => {
    return () => {
      resetAll();
    };
  }, []);

  const handleDate = (operator: "+" | "-") => {
    const d = new Date();
    d.setDate(d.getDate() + (operator === "+" ? 1 : -1));
    setDate(d.toISOString().split("T")[0]);
  };

  // Change start and end time based on settings
  useEffect(() => {
    if (allDay && settings) {
      const isToday = date === formatDateToToday(date ?? new Date().toString());
      const currentTime = getCurrentTime();

      let startTime = settings.dayStart;
      let endTime = settings.dayEnd;

      if (isToday && startTime < currentTime) {
        startTime = currentTime;

        // Ensure endTime is at least 30-60 minutes after startTime
        if (endTime < startTime) {
          endTime = addOneHour(startTime); // Add 1 hour buffer
        }

        // Prevent exceeding settings.dayEnd
        if (endTime > settings.dayEnd) {
          endTime = settings.dayEnd;
        }
      }

      setStartTime(() => {
        const [hour, minute] = startTime.split(":").map(Number);
        return formatTime12Hour(hour, minute, timezone);
      });

      setEndTime(() => {
        const [hour, minute] = endTime.split(":").map(Number);
        return formatTime12Hour(hour, minute, timezone);
      });
    } else if (settings) {
      if (fromEdit && appointment) {
        setTitle(appointment?.title || "");

        if (appointment?.startTime) {
          const parsed = normalizeTime(appointment.startTime);
          if (parsed) {
            const roundedMinutes = Math.ceil(parsed.minute() / 15) * 15;
            parsed.minute(roundedMinutes).second(0).millisecond(0);
            setStartTime(parsed.format("HH:mm")); // always 24h
          }
        }

        if (appointment?.endTime) {
          const parsed = normalizeTime(appointment.endTime);
          if (parsed) {
            const roundedMinutes = Math.ceil(parsed.minute() / 15) * 15;
            parsed.minute(roundedMinutes).second(0).millisecond(0);
            setEndTime(parsed.format("HH:mm")); // always 24h
          }
        }
      } else {
        let now = moment.tz(timezone);

        const roundedMinutes = Math.ceil(now.minute() / 15) * 15;
        now.minute(roundedMinutes).second(0).millisecond(0);

        setStartTime(now.format("HH:mm"));

        const end = now.clone().add(1, "hours");
        setEndTime(end.format("HH:mm"));
      }
    }
  }, [allDay, settings?.dayStart, settings?.dayEnd, date]);

  const handleSubmit = async () => {
    // Add validation for date and time - title is always a string now
    if (!title || !title.trim()) {
      return errorToast("Appointment title is required!");
    }

    if (date && (!startTime || !endTime)) {
      return errorToast(
        "Start time and End time are required when a date is selected!"
      );
    }

    if (client && confirmationTemplateStatus && !confirmationTemplate) {
      return errorToast("No confirmation template is selected");
    } else if (client && reminderTemplateStatus && !reminderTemplate) {
      return errorToast("No reminder template is selected");
    }

    if (client && reminderTemplateStatus && reminderTemplate && !timezone) {
      return errorToast(
        "Set company timezone in Settings > Business Profile to send client reminders."
      );
    }

    let res;

    if (fromEdit && appointmentId) {
      res = await editAppointment({
        id: appointmentId,
        appointment: {
          title: title,
          date: date as string,
          startTime: startTime as string,
          endTime: endTime as string,
          assignedUsers: assignedUsers.map((user) => user.id),
          clientId: client ? client.id : undefined,
          vehicleId: vehicle ? vehicle.id : undefined,
          draftEstimate: draft,
          notes,
          confirmationEmailTemplateId: confirmationTemplate?.id,
          reminderEmailTemplateId: reminderTemplate?.id,
          confirmationEmailTemplateStatus: confirmationTemplateStatus,
          reminderEmailTemplateStatus: reminderTemplateStatus,
          times,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      if (res.type === "success") {
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointmentById(appointmentId),
        });
        onAppointmentUpdated && onAppointmentUpdated(res.data);
        successToast("Appointment updated successfully!");
      }
    } else {
      res = await addAppointment({
        title: title,
        date,
        startTime,
        endTime,
        assignedUsers: assignedUsers.map((user) => user.id),
        clientId: client ? client.id : undefined,
        vehicleId: vehicle ? vehicle.id : undefined,
        draftEstimate: draft,
        notes,
        confirmationEmailTemplateId: confirmationTemplate?.id,
        reminderEmailTemplateId: reminderTemplate?.id,
        confirmationEmailTemplateStatus: confirmationTemplateStatus,
        reminderEmailTemplateStatus: reminderTemplateStatus,
        times,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (res.type === "success") {
        onAppointmentCreated &&
          onAppointmentCreated({ ...res.data, lead: client?.Lead || null });
        successToast("Appointment created successfully!");
      }
    }

    if (res.type === "success") {
      onAppointmentCreated &&
        onAppointmentCreated({ ...res.data, lead: client?.Lead || null });
      resetAll();
      onModalClose();
      setUpdateVariable();
      return;
    }

    if (res.type === "globalError") {
      showError({
        field: res.field || "all",
        message:
          res.errorSource && res.errorSource.length > 0
            ? res.errorSource[0].message
            : res.message,
      });
      return;
    }
  };

  // Add state to track if form has changed
  const [formChanged, setFormChanged] = useState(false);

  // Store original values when component mounts
  const [originalValues, setOriginalValues] = useState({
    title,
    date,
    startTime,
    endTime,
    assignedUsers: assignedUsers ? [...assignedUsers] : [],
    client,
    vehicle,
    draft,
    notes,
    confirmationTemplate,
    reminderTemplate,
    confirmationTemplateStatus,
    reminderTemplateStatus,
    times,
  });

  // Create a function to check if any field has changed
  const checkFormChanged = () => {
    if (
      title !== originalValues.title ||
      date !== originalValues.date ||
      startTime !== originalValues.startTime ||
      endTime !== originalValues.endTime ||
      JSON.stringify(assignedUsers) !==
        JSON.stringify(originalValues.assignedUsers) ||
      client?.id !== originalValues.client?.id ||
      vehicle?.id !== originalValues.vehicle?.id ||
      draft !== originalValues.draft ||
      notes !== originalValues.notes ||
      confirmationTemplate?.id !== originalValues.confirmationTemplate?.id ||
      reminderTemplate?.id !== originalValues.reminderTemplate?.id ||
      confirmationTemplateStatus !==
        originalValues.confirmationTemplateStatus ||
      reminderTemplateStatus !== originalValues.reminderTemplateStatus ||
      JSON.stringify(times) !== JSON.stringify(originalValues.times)
    ) {
      setFormChanged(true);
    } else {
      setFormChanged(false);
    }
  };

  // Call checkFormChanged whenever a field changes
  useEffect(() => {
    checkFormChanged();
  }, [
    title,
    date,
    startTime,
    endTime,
    assignedUsers,
    client,
    vehicle,
    draft,
    notes,
    confirmationTemplate,
    reminderTemplate,
    confirmationTemplateStatus,
    reminderTemplateStatus,
    times,
  ]);

  function resetAll() {
    setTitle("");
    setDate(today);
    setStartTime("00:00");
    setEndTime("00:00");
    setClient(null);
    setVehicle(null);
    setDraft(null);
    setAssignedUsers([]);
    setConfirmationTemplate(null);
    setReminderTemplate(null);
    setConfirmationTemplateStatus(false);
    setReminderTemplateStatus(false);
    setTimes([]);
    setAllDay(false);
    // remove the clientId from the url
    // router.push(pathname);
  }

  useEffect(() => {
    if (
      clientOpenDropdown &&
      (vehicleOpenDropdown || draftOpen || openConfirmation || openReminder)
    ) {
      setVehicleOpenDropdown(false);
      setDraftOpen(false);
      setOpenConfirmation(false);
      setOpenReminder(false);
    } else if (
      vehicleOpenDropdown &&
      (clientOpenDropdown || draftOpen || openConfirmation || openReminder)
    ) {
      setClientOpenDropdown(false);
      setDraftOpen(false);
      setOpenConfirmation(false);
      setOpenReminder(false);
    } else if (
      draftOpen &&
      (clientOpenDropdown ||
        vehicleOpenDropdown ||
        openConfirmation ||
        openReminder)
    ) {
      setClientOpenDropdown(false);
      setVehicleOpenDropdown(false);
      setOpenConfirmation(false);
      setOpenReminder(false);
    } else if (
      openConfirmation &&
      (clientOpenDropdown || vehicleOpenDropdown || draftOpen || openReminder)
    ) {
      setClientOpenDropdown(false);
      setVehicleOpenDropdown(false);
      setDraftOpen(false);
      setOpenReminder(false);
    } else if (
      openReminder &&
      (clientOpenDropdown ||
        vehicleOpenDropdown ||
        draftOpen ||
        openConfirmation)
    ) {
      setClientOpenDropdown(false);
      setVehicleOpenDropdown(false);
      setDraftOpen(false);
      setOpenConfirmation(false);
    }
  }, [
    draftOpen,
    clientOpenDropdown,
    vehicleOpenDropdown,
    openConfirmation,
    openReminder,
  ]);

  useEffect(() => {
    let now = moment.tz(timezone);

    const roundedMinutes = Math.ceil(now.minute() / 15) * 15;
    now.minute(roundedMinutes).second(0).millisecond(0);

    setStartTime(now.format("HH:mm"));

    const end = now.clone().add(1, "hours");
    setEndTime(end.format("HH:mm"));
  }, [timezone]);

  // Add scroll to the side of the schedule sync with the calender settings
  const rows = Array.from({ length: 24 }, (_, i) => {
    return `${i % 12 || 12} ${i < 12 ? "A" : "P"}M`;
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Function to check if the selected date is today

  const handleTimeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "start" | "end"
  ) => {
    let timeValue = e.target.value;

    // Regex: HH:mm (00:00 - 23:59)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timeRegex.test(timeValue)) {
      errorToast("Invalid time format! Please enter time as HH:mm");
      return;
    }

    if (type === "start") {
      setStartTime(timeValue);

      // Auto set endTime = startTime + 1 hour
      setEndTime(addOneHour(timeValue));
    } else if (type === "end") {
      if (startTime && timeValue < startTime) {
        errorToast("End time cannot be before start time!");
        return;
      }
      setEndTime(timeValue);
    }
  };

  useEffect(() => {
    const scrollToStartTime = () => {
      if (containerRef.current) {
        const startTimeIndex = rows.findIndex((row) => {
          const rowTime = formatTime(row);
          return rowTime === settings?.dayStart;
        });

        if (startTimeIndex !== -1) {
          const scrollPosition = startTimeIndex * 63;
          containerRef.current.scrollTo({
            top: scrollPosition,
            behavior: "smooth",
          });
        }
      }
    };

    scrollToStartTime();
  }, [rows, settings?.dayStart]);

  if (fromEdit && isError) {
    errorToast("Failed to fetch appointment data");
  }

  // Generate options in 15-min intervals
  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const label = formatTime12Hour(hour, minute, timezone);
    return { value, label };
  });

  return (
    <DialogContent
      className="grid max-h-full max-w-5xl grid-rows-[auto,1fr,auto] sm:max-w-[60vw]"
      form
    >
      {/* Heading */}
      <DialogHeader className="grid items-center gap-4 sm:grid-cols-2">
        <DialogTitle>{fromEdit ? "Edit" : "New"} Appointment</DialogTitle>

        {/* Options */}
        <div className="flex items-center justify-self-center rounded-full bg-gray-300 p-1">
          <button
            type="button"
            className={cn(
              "rounded-full px-4 py-1 font-semibold",
              tab === Tab.Schedule && "bg-background"
            )}
            onClick={() => setTab(Tab.Schedule)}
          >
            <TbCalendar className="mr-2 inline" size={24} />
            Schedule
          </button>

          <button
            type="button"
            className={cn(
              "rounded-full px-4 py-1 font-semibold",
              tab === Tab.Reminder && "bg-background"
            )}
            onClick={() => setTab(Tab.Reminder)}
          >
            <TbBell className="mr-2 inline" size={24} />
            Reminder
          </button>
        </div>
      </DialogHeader>

      <div className="-mx-6 grid gap-px overflow-y-auto border-solid sm:grid-cols-2 md:border-y md:bg-border">
        <div className="space-y-4 bg-background p-6">
          <FormError />

          <AppointmentTitleSelectAndAdd
            value={title}
            onChange={(value) => setTitle(value)}
          />

          <div className="flex flex-wrap items-end gap-2 2xl:flex-nowrap">
            <SlimInput
              name="date"
              label="Date"
              rootClassName="grow"
              type="date"
              value={date ?? ""}
              // min={minDate}
              required
              onChange={(event) => {
                const newDate = moment(event.currentTarget.value).format(
                  "YYYY-MM-DD"
                );
                setDate(newDate);
              }}
            />

            <div className="flex items-end gap-2">
              <label className="flex flex-col items-start">
                <span className="mb-1 text-sm font-medium text-gray-700">
                  Start Time
                </span>
                <div>
                  <Select
                    value={startTime}
                    onChange={(value) =>
                      handleTimeChange({ target: { value } } as any, "start")
                    }
                    style={{ width: "100%", height: 34 }}
                    className="border-slate-400 border rounded-md"
                  >
                    {timeOptions.map((time) => (
                      <Option key={time.value} value={time.value}>
                        <p className="text-base text-gray-600"> {time.label}</p>
                      </Option>
                    ))}
                  </Select>
                </div>
              </label>

              <label className="flex flex-col items-start">
                <span className="mb-1 text-sm font-medium text-gray-700">
                  End Time
                </span>
                <Select
                  value={endTime}
                  onChange={(value) =>
                    handleTimeChange({ target: { value } } as any, "end")
                  }
                  style={{ width: "100%", height: 34 }}
                  className="border-slate-400 border rounded-md"
                >
                  {timeOptions.map((time) => (
                    <Option key={time.value} value={time.value}>
                      {time.label}
                    </Option>
                  ))}
                </Select>
              </label>
            </div>
          </div>

          <div className="flex items-center">
            <input
              checked={allDay}
              onChange={() => setAllDay(!allDay)}
              id="all-day"
              type="checkbox"
              value="true"
              className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
              name="all-day"
            />
            <label
              htmlFor="all-day"
              className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
            >
              All day
            </label>
          </div>
          {/* assign Sales */}
          <AssignUsers
            assignedUsers={assignedUsers.filter(
              (user) => user.employeeType === "Sales"
            )}
            title="+ Assign Sales Person"
            employeeType="Sales"
            onAssignUser={(user: User) => {
              setAssignedUsers((prev) => [...prev, user]);
            }}
            onRemoveAssignedUser={(user: User) => {
              setAssignedUsers((prev) =>
                prev.filter((assignedUser) => assignedUser.id !== user.id)
              );
            }}
          />
          <br />
          {/* assign technicians */}
          <AssignUsers
            assignedUsers={assignedUsers.filter(
              (user) => user.employeeType === "Technician"
            )}
            title="+ Assign Technician"
            employeeType="Technician"
            onAssignUser={(user: User) => {
              setAssignedUsers((prev) => [...prev, user]);
            }}
            onRemoveAssignedUser={(user: User) => {
              setAssignedUsers((prev) =>
                prev.filter((assignedUser) => assignedUser.id !== user.id)
              );
            }}
          />
        </div>

        <div className="row-start-2 space-y-4 bg-background p-6">
          <SelectAppointmentClient
            clientId={clientId}
            fromLead={fromLead}
            value={client}
            setValue={setClient}
            openDropdown={clientOpenDropdown}
            setOpenDropdown={setClientOpenDropdown}
            setIsAppointmentModalOpen={setIsAppointmentModalOpen}
          />

          <SelectAppointmentVehicle
            vehicleId={vehicleId}
            fromLead={fromLead}
            clientId={client?.id ?? clientId}
            value={vehicle}
            setValue={setVehicle}
            openDropdown={vehicleOpenDropdown}
            setOpenDropdown={setVehicleOpenDropdown}
            setIsAppointmentModalOpen={setIsAppointmentModalOpen}
          />

          <Selector
            label={(draft: string | null) =>
              draft ? draft : "Draft Estimates"
            }
            openState={[draftOpen, setDraftOpen]}
            newButton={
              <button
                className="text-[#6571FF] disabled:text-zinc-400"
                onClick={() => {
                  setDraft(customAlphabet("1234567890", 10)());
                  setDraftOpen(false);
                }}
                disabled={!client || !vehicle}
                type="button"
              >
                + New Draft Estimate
              </button>
            }
            items={draftEstimates}
            selectedItem={draft}
            setSelectedItem={setDraft}
            displayList={(item) => <p className="text-[#6571FF]">{item}</p>}
            onSearch={(search) => {
              return draftEstimates.filter((draft) =>
                draft.toLowerCase().includes(search.toLowerCase())
              );
            }}
          />

          <textarea
            name="notes"
            placeholder="Notes"
            className={cn(slimInputClassName, "border-2 border-slate-400")}
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
          />
        </div>

        <div className="relative row-span-2 min-h-36 divide-y bg-background">
          {tab === Tab.Schedule ? (
            <div
              ref={containerRef}
              className="absolute inset-0 divide-y overflow-y-auto"
            >
              <ScheduleTab
                rows={rows}
                date={date}
                startTime={startTime || ""}
                endTime={endTime}
                settings={settings}
                onDateUpDown={(direction: "+" | "-") => handleDate(direction)}
              />
            </div>
          ) : tab === Tab.Reminder ? (
            <>
              <Reminder
                client={client}
                vehicle={vehicle}
                startTime={startTime!}
                date={date!}
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
            </>
          ) : null}
        </div>
      </div>

      {
        <div
          className={cn(
            "flex gap-5 md:gap-0",
            fromEdit && appointmentId ? "justify-between" : "justify-end"
          )}
        >
          {fromEdit && appointmentId && (
            <button
              className="text-xl text-red-500 hover:text-red-700"
              type="button"
              onClick={async () => {
                try {
                  await deleteAppointment(appointmentId);
                  onAppointmentDeleted && onAppointmentDeleted(appointmentId);
                  onModalClose();
                } catch (error) {
                  errorToast("Failed to delete appointment");
                }
              }}
            >
              <FaTrash />
            </button>
          )}
          <DialogFooter className="justify-end">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-md border px-4 py-1"
                onClick={() => resetAll()}
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="button"
              className={`rounded-md border px-4 py-1 text-white ${
                formChanged
                  ? "bg-[#6571FF] cursor-pointer hover:bg-blue-600"
                  : "cursor-not-allowed bg-gray-400"
              }`}
              onClick={handleSubmit}
              disabled={
                !formChanged ||
                (fromEdit && !appointmentIsFetch) ||
                (fromEdit && !settingsIsFetched) ||
                (fromEdit && !!client?.id && !estimateIsFetched) // Only require estimates if client is selected
              }
            >
              Save
            </button>
          </DialogFooter>
        </div>
      }
    </DialogContent>
  );
}
