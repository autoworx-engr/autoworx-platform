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
import { SlimInput } from "@/components/SlimInput";
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
import { useEffect, useMemo, useRef, useState } from "react";
import AssignUsers from "./AssignUsers";
import { Reminder } from "./Reminder";
import ScheduleTab from "./ScheduleTab";
import { SelectAppointmentClient } from "./SelectAppointmentClient";
import { SelectAppointmentVehicle } from "./SelectAppointmentVehicle";
import { formatTime12Hour } from "@/utils/formateTime12Hours";
import { Popconfirm, Select } from "antd";
import { normalizeTime } from "@/utils/normalizeTime";
import {
  Bell,
  Calendar,
  Car,
  ChevronDown,
  Hash,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { getVehicleByInvoiceId } from "@/actions/vehicle/getVehicleByInvoiceId";
import { getVehicles } from "@/actions/vehicle/getVehicles";
import useVehicleByClientIdQuery from "@/hooks/query-hook/useVehicleByClientIdQuery";
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
    appointment: Appointment & { lead: Lead | null },
  ) => void;
  onAppointmentUpdated?: (
    appointment: Appointment & { lead: Lead | null },
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
  const { showError, clearError } = useFormErrorStore();
  const { setUpdateVariable } = useCalendarStore();

  const [client, setClient] = useState<Partial<
    Client & {
      Lead: { id: number; companyId: number; columnId: number };
    }
  > | null>(null);

  const { data: estimates = [], isFetched: estimateIsFetched } =
    useEstimatesQueryByClient(
      client?.id!,
      {
        id: true,
        clientId: true,
        grandTotal: true,
        vehicle: true,
      },
      { enabled: !!client?.id },
    );

  const timezone = useCompanyTimezone();
  const today = moment.tz(timezone).format("YYYY-MM-DD");

  const [tab, setTab] = useState(Tab.Reminder);

  const [date, setDate] = useState<string | undefined>(
    appointment?.date
      ? moment.utc(appointment?.date).format("YYYY-MM-DD")
      : today,
  );
  const [title, setTitle] = useState<string>("");

  const [notes, setNotes] = useState("");

  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("00:00");
  const [allDay, setAllDay] = useState(false);
  const [vehicle, setVehicle] = useState<Partial<Vehicle> | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [draftSearch, setDraftSearch] = useState("");
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);

  const [times, setTimes] = useState<{ time: string; date: string }[]>([]);
  const [confirmationTemplate, setConfirmationTemplate] =
    useState<EmailTemplate | null>(null);
  const [reminderTemplate, setReminderTemplate] =
    useState<EmailTemplate | null>(null);

  const [confirmationTemplateStatus, setConfirmationTemplateStatus] =
    useState(false);
  const [reminderTemplateStatus, setReminderTemplateStatus] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [draftOpen, setDraftOpen] = useState(false);

  // dropdown states
  const [clientOpenDropdown, setClientOpenDropdown] = useState(false);
  const [vehicleOpenDropdown, setVehicleOpenDropdown] = useState(false);

  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [openReminder, setOpenReminder] = useState(false);

  const draftEstimateOptions = useMemo(
    () =>
      estimates.map((estimate) => {
        const vehicleLabel =
          [
            (estimate as any)?.vehicle?.year,
            (estimate as any)?.vehicle?.make,
            (estimate as any)?.vehicle?.model,
          ]
            .filter(Boolean)
            .join(" ") || (estimate as any)?.vehicle?.other;

        console.log(estimate);

        return {
          id: String(estimate.id),
          price: Number((estimate as any)?.grandTotal ?? 0),
          vehicle: vehicleLabel,
        };
      }),
    [estimates],
  );

  const filteredDraftEstimateOptions = useMemo(() => {
    const term = draftSearch.toLowerCase();
    return draftEstimateOptions.filter(
      (item) =>
        item.id.includes(draftSearch) ||
        item.vehicle.toLowerCase().includes(term),
    );
  }, [draftSearch, draftEstimateOptions]);

  const selectedDraftOption = useMemo(() => {
    if (!draft) return null;

    const existing = draftEstimateOptions.find((item) => item.id === draft);
    if (existing) return existing;

    // Keep showing a freshly created draft ID even before it exists in options
    return {
      id: draft,
      price: 0,
      vehicle: "New Draft Estimate",
    };
  }, [draft, draftEstimateOptions]);

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
        appointment?.confirmationEmailTemplateStatus ?? false,
      );
      setReminderTemplateStatus(
        appointment?.reminderEmailTemplateStatus ?? false,
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
    if (isSubmitting) return; // Prevent multiple submissions

    try {
      setIsSubmitting(true);

      // Add validation for date and time - title is always a string now
      if (!title || !title.trim()) {
        setIsSubmitting(false);
        showError({
          field: "title",
          message: "Appointment title is required!",
        });
        return;
      }

      if (date && (!startTime || !endTime)) {
        setIsSubmitting(false);
        showError({
          field: "all",
          message:
            "Start time and End time are required when a date is selected!",
        });
        return;
      }

      if (client && confirmationTemplateStatus && !confirmationTemplate) {
        setIsSubmitting(false);
        showError({
          field: "all",
          message: "No confirmation template is selected",
        });
        return;
      } else if (client && reminderTemplateStatus && !reminderTemplate) {
        setIsSubmitting(false);
        showError({
          field: "all",
          message: "No reminder template is selected",
        });
        return;
      }

      if (client && reminderTemplateStatus && reminderTemplate && !timezone) {
        setIsSubmitting(false);
        showError({
          field: "all",
          message:
            "Set company timezone in Settings > Business Profile to send client reminders.",
        });
        return;
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
          try {
            successToast("Appointment updated successfully!");
          } catch (toastError) {
            console.error("Toast error:", toastError);
          }
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
          try {
            successToast("Appointment created successfully!");
          } catch (toastError) {
            console.error("Toast error:", toastError);
          }
        }
      }

      if (res.type === "success") {
        setIsSubmitting(false);
        resetAll();
        onModalClose();
        setUpdateVariable();
        return;
      }

      if (res.type === "globalError") {
        setIsSubmitting(false);
        showError({
          field: res.field || "all",
          message:
            res.errorSource && res.errorSource.length > 0
              ? res.errorSource[0].message
              : res.message,
        });
        return;
      }

      // Handle any other response types
      setIsSubmitting(false);
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error in handleSubmit:", error);
      errorToast("An unexpected error occurred. Please try again.");
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
    setIsSubmitting(false);
    clearError();
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
    if (!draftOpen) {
      setDraftSearch("");
    }
  }, [draftOpen]);

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
    type: "start" | "end",
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
     onOpenAutoFocus={(e)=>e.preventDefault()}
      className="grid max-w-5xl grid-rows-[auto,1fr,auto] sm:max-w-[80vw] lg:max-w-6xl"
      form
    >
      {/* Heading */}
      <DialogHeader className="grid items-center gap-4 sm:grid-cols-2">
        <DialogTitle>{fromEdit ? "Edit" : "New"} Appointment</DialogTitle>

        {/* Options */}
        <div className="hidden lg:flex items-center justify-self-center rounded-full bg-slate-100 p-1.5 shadow-inner ring-1 ring-slate-200/50">
          <button
            type="button"
            className={cn(
              "flex items-center justify-center rounded-full px-6 py-2 text-sm font-bold transition-all duration-300 ease-out",
              tab === Tab.Schedule
                ? "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50",
            )}
            onClick={() => setTab(Tab.Schedule)}
          >
            <Calendar
              className={cn(
                "mr-2 transition-colors",
                tab === Tab.Schedule ? "text-slate-600" : "text-slate-400",
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
                ? "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50",
            )}
            onClick={() => setTab(Tab.Reminder)}
          >
            <Bell
              className={cn(
                "mr-2 transition-colors",
                tab === Tab.Reminder ? "text-slate-600" : "text-slate-400",
              )}
              size={18}
              strokeWidth={2.5}
            />
            Reminder
          </button>
        </div>
      </DialogHeader>

      <div className="-mx-6 max-h-[66vh] lg:max-h-fit h-full lg:grid gap-px border-solid lg:grid-cols-2 md:border-y ">
        <div className="h-full sm:h-full overflow-y-auto thin-scrollbar ">
          <div className="space-y-4 p-6">
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
                    "YYYY-MM-DD",
                  );
                  setDate(newDate);
                }}
              />

              <div className="flex items-end gap-2">
                <label className="flex flex-col items-start">
                  <span className="mb-2 font-medium text-slate-600">
                    Start Time <span className="text-[#E9405F]">*</span>
                  </span>
                  <div>
                    <Select
                      value={startTime}
                      onChange={(value) =>
                        handleTimeChange({ target: { value } } as any, "start")
                      }
                      style={{ width: "100%" }}
                      className="
                        h-[38px] w-full 
                        rounded-lg border-none 
                        bg-slate-50/50 
                        ring-1 ring-slate-200 
                        transition-all duration-300 
                        hover:bg-white hover:ring-[#6571FF]/80 hover:scale-[1.01] hover:shadow-sm
                        focus-within:ring-2 focus-within:ring-[#6571FF]/40 focus:outline-none
                        text-slate-600 font-medium thin-scrollbar
                      "
                      dropdownClassName="rounded-xl border-none shadow-2xl backdrop-blur-md bg-white/90"
                    >
                      {timeOptions.map((time) => (
                        <Option
                          key={time.value}
                          value={time.value}
                          className="
                            py-2 px-3 
                            text-slate-600 
                            transition-colors 
                            hover:bg-[#6571FF]/10 
                            hover:text-[#6571FF]
                          "
                        >
                          <p className="text-base text-gray-600">
                            {" "}
                            {time.label}
                          </p>
                        </Option>
                      ))}
                    </Select>
                  </div>
                </label>

                <label className="flex flex-col items-start">
                  <span className="mb-2 font-medium text-slate-600">
                    End Time <span className="text-[#E9405F]">*</span>
                  </span>
                  <Select
                    value={endTime}
                    onChange={(value) =>
                      handleTimeChange({ target: { value } } as any, "end")
                    }
                    style={{ width: "100%" }}
                    className="
                        h-[38px] w-full 
                        rounded-lg border-none 
                        bg-slate-50/50 
                        ring-1 ring-slate-200 
                        transition-all duration-300 
                        hover:bg-white hover:ring-[#6571FF]/80 hover:scale-[1.01] hover:shadow-sm
                        focus-within:ring-2 focus-within:ring-[#6571FF]/40 focus:outline-none
                        text-slate-600 font-medium thin-scrollbar
                      "
                    dropdownClassName="rounded-xl border-none shadow-2xl backdrop-blur-md bg-white/90"
                  >
                    {timeOptions.map((time) => (
                      <Option
                        key={time.value}
                        value={time.value}
                        className="
                            py-2 px-3 
                            text-slate-600
                            transition-colors 
                            hover:bg-[#6571FF]/10 
                            hover:text-[#6571FF]
                          "
                      >
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
                (user) => user.employeeType === "Sales",
              )}
              title="+ Assign Sales Person"
              employeeType="Sales"
              onAssignUser={(user: User) => {
                setAssignedUsers((prev) => [...prev, user]);
              }}
              onRemoveAssignedUser={(user: User) => {
                setAssignedUsers((prev) =>
                  prev.filter((assignedUser) => assignedUser.id !== user.id),
                );
              }}
            />
            {/* assign technicians */}
            <AssignUsers
              assignedUsers={assignedUsers.filter(
                (user) => user.employeeType === "Technician",
              )}
              title="+ Assign Technician"
              employeeType="Technician"
              onAssignUser={(user: User) => {
                setAssignedUsers((prev) => [...prev, user]);
              }}
              onRemoveAssignedUser={(user: User) => {
                setAssignedUsers((prev) =>
                  prev.filter((assignedUser) => assignedUser.id !== user.id),
                );
              }}
            />
          </div>

          <div className="row-start-2 space-y-4 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="w-full">
                <DropdownMenu.Root open={draftOpen} onOpenChange={setDraftOpen}>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDraftOpen(!draftOpen);
                      }}
                      className={cn(
                        "flex h-11 w-full items-center justify-between rounded-xl px-4 py-2 text-sm transition-all",
                        "border border-slate-200 bg-white shadow-sm hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900",
                        "focus:outline-none focus:ring-2 focus:ring-[#6571FF]/40",
                        draftOpen &&
                        "ring-2 ring-[#6571FF]/40 border-[#6571FF]",
                      )}
                    >
                      <div className="flex flex-col items-start overflow-hidden text-left">
                        {selectedDraftOption ? (
                          <>
                            <span className="w-full text-sm truncate font-semibold text-slate-900 dark:text-white">
                              {selectedDraftOption.vehicle}
                            </span>
                            <span className="text-xs text-slate-500">
                              ID: {selectedDraftOption.id} • $
                              {selectedDraftOption.price.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500">
                            Select Draft Estimate
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        size={18}
                        className={cn(
                          "text-slate-400 transition-transform",
                          draftOpen && "rotate-180",
                        )}
                      />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      sideOffset={8}
                      className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-[300px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl animate-in fade-in zoom-in-95 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="relative mb-1 flex items-center p-2">
                        <Search className="absolute left-4 h-4 w-4 text-slate-400" />
                        <input
                          className="w-full rounded-lg bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none dark:bg-slate-800"
                          placeholder="Search ID or Vehicle..."
                          value={draftSearch}
                          onChange={(e) => setDraftSearch(e.target.value)}
                          autoFocus
                        />
                      </div>

                      <div className="max-h-72 overflow-y-auto overflow-x-hidden px-1">
                        {filteredDraftEstimateOptions.length > 0 ? (
                          filteredDraftEstimateOptions.map((item) => (
                            <DropdownMenu.Item
                              key={item.id}
                              onSelect={() => {
                                setDraft(item.id);
                                setDraftOpen(false);
                              }}
                              className="group flex cursor-pointer flex-col gap-1 rounded-lg px-3 py-2.5 outline-none hover:bg-slate-50 data-[highlighted]:bg-[#6571FF]/10 dark:hover:bg-slate-800"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                                  {item.vehicle}
                                </div>
                                <span className="text-sm font-bold text-[#6571FF]">
                                  ${item.price.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                <Hash size={10} />
                                {item.id}
                              </div>
                            </DropdownMenu.Item>
                          ))
                        ) : (
                          <div className="py-6 text-center text-xs text-slate-400">
                            No results found
                          </div>
                        )}
                      </div>

                      <div className="mt-1 border-t border-slate-100 p-2 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setDraft(customAlphabet("1234567890", 10)());
                            setDraftOpen(false);
                          }}
                          disabled={!client || !vehicle}
                          className={cn(
                            "flex w-full items-center justify-center gap-2 rounded-lg bg-[#6571FF] py-2.5 text-sm font-semibold text-white transition-opacity",
                            "hover:opacity-90 active:scale-[0.98]",
                            (!client || !vehicle) &&
                            "cursor-not-allowed opacity-60",
                          )}
                        >
                          <Plus size={16} />
                          New Draft Estimate
                        </button>
                      </div>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </div>

            <div className="relative w-full">
              <textarea
                name="notes"
                placeholder="Notes"
                className={cn(
                  "h-20 w-full rounded-md border border-slate-300 outline-none bg-background px-2 py-0.5 leading-6 transition-all duration-300 thin-scrollbar",
                  "bg-white/80 backdrop-blur-sm",
                  "text-slate-600 placeholder:text-slate-400",
                  "focus:border-[#6571FF]/60 focus:ring-2 focus:ring-[#6571FF]/40",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={(event) => setNotes(event.currentTarget.value)}
              />
              <span className="absolute -bottom-2 right-2 text-xs text-slate-400 pointer-events-none">
                {notes.length}/1000
              </span>
            </div>
          </div>

          {/* Options */}
          <div className="sticky top-0 z-40 bg-white w-full pb-2">
            <div className="flex lg:hidden items-center justify-self-center rounded-full bg-slate-100 p-1.5 shadow-inner ring-1 ring-slate-200/50 ">
              <button
                type="button"
                className={cn(
                  "flex items-center justify-center rounded-full px-6 py-2 text-sm font-bold transition-all duration-300 ease-out",
                  tab === Tab.Schedule
                    ? "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50",
                )}
                onClick={() => setTab(Tab.Schedule)}
              >
                <Calendar
                  className={cn(
                    "mr-2 transition-colors",
                    tab === Tab.Schedule ? "text-slate-600" : "text-slate-400",
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
                    ? "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50",
                )}
                onClick={() => setTab(Tab.Reminder)}
              >
                <Bell
                  className={cn(
                    "mr-2 transition-colors",
                    tab === Tab.Reminder ? "text-slate-600" : "text-slate-400",
                  )}
                  size={18}
                  strokeWidth={2.5}
                />
                Reminder
              </button>
            </div>
          </div>

          <div className="relative md:hidden h-full row-span-2 thin-scrollbar divide-y bg-background">
            {tab === Tab.Schedule ? (
              <div
                ref={containerRef}
                className="absolute inset-0 divide-y overflow-y-auto h-full"
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
            ) : null}
          </div>
        </div>

        <div className="hidden lg:block relative row-span-2 overflow-y-auto thin-scrollbar divide-y bg-background border-l">
          {tab === Tab.Schedule ? (
            <div
              ref={containerRef}
              className="absolute inset-0 divide-y overflow-y-auto thin-scrollbar"
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
            fromEdit && appointmentId ? "justify-between" : "justify-end",
          )}
        >
          {fromEdit && appointmentId && (
            <Popconfirm
              title="Delete the appointment"
              description="Are you sure to delete this appointment?"
              okText="Yes"
              cancelText="No"
              onConfirm={async () => {
                try {
                  await deleteAppointment(appointmentId);
                  onAppointmentDeleted && onAppointmentDeleted(appointmentId);
                  onModalClose();
                  successToast("Appointment deleted successfully");
                } catch (error) {
                  errorToast("Failed to delete appointment");
                }
              }}
            >
              <Trash2
                size={20}
                className="text-red-500 hover:text-red-600 cursor-pointer"
              />
            </Popconfirm>
          )}
          <DialogFooter className="justify-end">
            <DialogClose asChild>
              <button
                type="button"
                className="
                rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500 
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border
                "
                onClick={() => resetAll()}
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="button"
              className={`rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200 ${formChanged && !isSubmitting
                  ? "bg-gradient-to-r from-[#6571FF] to-[#5a66ee] cursor-pointer"
                  : "cursor-not-allowed bg-gray-400"
                }`}
              onClick={handleSubmit}
              disabled={
                !formChanged ||
                isSubmitting ||
                (fromEdit && !appointmentIsFetch) ||
                (fromEdit && !settingsIsFetched) ||
                (fromEdit && !!client?.id && !estimateIsFetched) // Only require estimates if client is selected
              }
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </DialogFooter>
        </div>
      }
    </DialogContent>
  );
}
