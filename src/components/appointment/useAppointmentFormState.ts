"use client";

import { addAppointment } from "@/actions/appointment/addAppointment";
import { editAppointment } from "@/actions/appointment/editAppointment";
import useSettingsQuery from "@/app/(dashboard)/dashboard/task/_hook/settings/query/useSettingsQuery";
import useAppointmentQueryById from "@/hooks/query-hook/useAppointmentQueryById";
import useEstimatesQueryByClient from "@/hooks/query-hook/useEstimatesQueryByClient";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { queryKeys } from "@/lib/queryKeys";
import { errorToast, successToast } from "@/lib/toast";
import { useFormErrorStore } from "@/stores/form-error";
import { useCalendarStore } from "@/stores/calendarStore";
import { formatTime12Hour } from "@/utils/formateTime12Hours";
import { normalizeTime } from "@/utils/normalizeTime";
import { formatTime } from "@/utils/taskAndActivity";
import { addOneHour } from "@/utils/time";
import { useQueryClient } from "@tanstack/react-query";
import type {
  Appointment,
  Client,
  EmailTemplate,
  Lead,
  User,
  Vehicle,
} from "@prisma/client";
import moment from "moment-timezone";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export enum Tab {
  Schedule = 0,
  Reminder = 1,
}

export type AppointmentModalBodyProps = {
  fromLead?: boolean;
  clientId?: number | null;
  vehicleId?: number | null;
  draftEstimateId?: string | null;
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

export function useAppointmentFormState({
  fromLead = false,
  clientId,
  vehicleId,
  draftEstimateId,
  date: selectedDate,
  startTime: selectedStartTime,
  onModalClose,
  fromEdit,
  appointmentId,
  onAppointmentCreated,
  onAppointmentUpdated,
}: AppointmentModalBodyProps) {
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
      { id: true, clientId: true, grandTotal: true, vehicle: true },
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
  const [serviceCategoryId, setServiceCategoryId] = useState<number | null>(
    null,
  );
  const [draft, setDraft] = useState<string | null>(draftEstimateId || null);
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
  const [clientOpenDropdown, setClientOpenDropdown] = useState(false);
  const [vehicleOpenDropdown, setVehicleOpenDropdown] = useState(false);
  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [openReminder, setOpenReminder] = useState(false);
  const [formChanged, setFormChanged] = useState(false);

  const [originalValues, setOriginalValues] = useState({
    title,
    date,
    startTime,
    endTime,
    assignedUsers: assignedUsers ? [...assignedUsers] : [],
    client,
    vehicle,
    serviceCategoryId,
    draft,
    notes,
    confirmationTemplate,
    reminderTemplate,
    confirmationTemplateStatus,
    reminderTemplateStatus,
    times,
  });

  const resetAll = useCallback(() => {
    setTitle("");
    setDate(today);
    setStartTime("00:00");
    setEndTime("00:00");
    setClient(null);
    setVehicle(null);
    setServiceCategoryId(null);
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
  }, [clearError, today]);

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
    return { id: draft, price: 0, vehicle: "New Draft Estimate" };
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
          setStartTime(parsed.format("HH:mm"));
        }
      }

      if (appointment?.endTime) {
        const parsed = normalizeTime(appointment.endTime);
        if (parsed) {
          const roundedMinutes = Math.ceil(parsed.minute() / 15) * 15;
          parsed.minute(roundedMinutes).second(0).millisecond(0);
          setEndTime(parsed.format("HH:mm"));
        }
      }

      setNotes(appointment?.notes ?? "");
      setClient(appointment?.client ?? null);
      setVehicle(appointment?.vehicle ?? null);
      setServiceCategoryId((appointment as any)?.serviceCategoryId ?? null);
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
        serviceCategoryId: (appointment as any)?.serviceCategoryId ?? null,
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
        serviceCategoryId: null,
        draft: draftEstimateId || null,
        notes: "",
        confirmationTemplate: null,
        reminderTemplate: null,
        confirmationTemplateStatus: false,
        reminderTemplateStatus: false,
        times: [],
      });
    }
  }, [fromEdit, today, draftEstimateId]);

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
          void e;
        }
      }
    }

    if (selectedDate) {
      if (typeof selectedDate === "string" && selectedDate.includes("-")) {
        setDate(selectedDate);
      } else {
        try {
          const selectedDateObj = moment(selectedDate);
          setDate(selectedDateObj.format("YYYY-MM-DD"));
        } catch (e) {
          void e;
        }
      }
    }
  }, [selectedDate, selectedStartTime]);

  useEffect(() => {
    if (!fromEdit && !selectedDate) {
      setDate(today);
    }
  }, [today, fromEdit, selectedDate]);

  useEffect(() => {
    return () => {
      resetAll();
    };
  }, [resetAll]);

  useEffect(() => {
    if (allDay && settings) {
      setStartTime(settings.dayStart);
      setEndTime(settings.dayEnd);
    } else if (settings) {
      if (fromEdit && appointment) {
        setTitle(appointment?.title || "");

        if (appointment?.startTime) {
          const parsed = normalizeTime(appointment.startTime);
          if (parsed) {
            const roundedMinutes = Math.ceil(parsed.minute() / 15) * 15;
            parsed.minute(roundedMinutes).second(0).millisecond(0);
            setStartTime(parsed.format("HH:mm"));
          }
        }

        if (appointment?.endTime) {
          const parsed = normalizeTime(appointment.endTime);
          if (parsed) {
            const roundedMinutes = Math.ceil(parsed.minute() / 15) * 15;
            parsed.minute(roundedMinutes).second(0).millisecond(0);
            setEndTime(parsed.format("HH:mm"));
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
  }, [allDay, settings, date, fromEdit, appointment, timezone]);

  useEffect(() => {
    let now = moment.tz(timezone);
    const roundedMinutes = Math.ceil(now.minute() / 15) * 15;
    now.minute(roundedMinutes).second(0).millisecond(0);
    setStartTime(now.format("HH:mm"));
    const end = now.clone().add(1, "hours");
    setEndTime(end.format("HH:mm"));
  }, [timezone]);

  useEffect(() => {
    setFormChanged(
      title !== originalValues.title ||
        date !== originalValues.date ||
        startTime !== originalValues.startTime ||
        endTime !== originalValues.endTime ||
        JSON.stringify(assignedUsers) !==
          JSON.stringify(originalValues.assignedUsers) ||
        client?.id !== originalValues.client?.id ||
        vehicle?.id !== originalValues.vehicle?.id ||
        serviceCategoryId !== originalValues.serviceCategoryId ||
        draft !== originalValues.draft ||
        notes !== originalValues.notes ||
        confirmationTemplate?.id !== originalValues.confirmationTemplate?.id ||
        reminderTemplate?.id !== originalValues.reminderTemplate?.id ||
        confirmationTemplateStatus !==
          originalValues.confirmationTemplateStatus ||
        reminderTemplateStatus !== originalValues.reminderTemplateStatus ||
        JSON.stringify(times) !== JSON.stringify(originalValues.times),
    );
  }, [
    title,
    date,
    startTime,
    endTime,
    assignedUsers,
    client,
    vehicle,
    serviceCategoryId,
    draft,
    notes,
    confirmationTemplate,
    reminderTemplate,
    confirmationTemplateStatus,
    reminderTemplateStatus,
    times,
    originalValues,
  ]);

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
    if (!draftOpen) setDraftSearch("");
  }, [draftOpen]);

  const handleDate = (operator: "+" | "-") => {
    const d = new Date();
    d.setDate(d.getDate() + (operator === "+" ? 1 : -1));
    setDate(d.toISOString().split("T")[0]);
  };

  const handleTimeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "start" | "end",
  ) => {
    const timeValue = e.target.value;
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(timeValue)) {
      errorToast("Invalid time format! Please enter time as HH:mm");
      return;
    }
    if (type === "start") {
      setStartTime(timeValue);
      setEndTime(addOneHour(timeValue));
    } else {
      if (startTime && timeValue < startTime) {
        errorToast("End time cannot be before start time!");
        return;
      }
      setEndTime(timeValue);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

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
      const selectedClientId = client?.id ?? undefined;
      const selectedVehicleId = vehicle?.id ?? undefined;
      const selectedServiceCategoryId =
        serviceCategoryId === null ? undefined : serviceCategoryId;

      if (fromEdit && appointmentId) {
        res = await editAppointment({
          id: appointmentId,
          appointment: {
            title,
            date: date as string,
            startTime: startTime as string,
            endTime: endTime as string,
            assignedUsers: assignedUsers.map((user) => user.id),
            clientId: selectedClientId,
            vehicleId: selectedVehicleId,
            serviceCategoryId: selectedServiceCategoryId,
            draftEstimate: draft,
            notes,
            confirmationEmailTemplateId: confirmationTemplate?.id,
            reminderEmailTemplateId: reminderTemplate?.id,
            confirmationEmailTemplateStatus: confirmationTemplateStatus,
            reminderEmailTemplateStatus: reminderTemplateStatus,
            times,
            timezone:
              timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
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
            void toastError;
          }
        }
      } else {
        res = await addAppointment({
          title,
          date,
          startTime,
          endTime,
          assignedUsers: assignedUsers.map((user) => user.id),
          clientId: selectedClientId,
          vehicleId: selectedVehicleId,
          serviceCategoryId: selectedServiceCategoryId,
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
            void toastError;
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

      setIsSubmitting(false);
    } catch (error) {
      setIsSubmitting(false);
      void error;
      errorToast("An unexpected error occurred. Please try again.");
    }
  };

  const rows = Array.from({ length: 24 }, (_, i) => {
    return `${i % 12 || 12} ${i < 12 ? "A" : "P"}M`;
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const label = formatTime12Hour(hour, minute, timezone);
    return { value, label };
  });

  // Scroll schedule to settings day start
  useEffect(() => {
    const scrollToStartTime = () => {
      if (containerRef.current) {
        const startTimeIndex = rows.findIndex((row) => {
          const rowTime = formatTime(row);
          return rowTime === settings?.dayStart;
        });
        if (startTimeIndex !== -1) {
          containerRef.current.scrollTo({
            top: startTimeIndex * 63,
            behavior: "smooth",
          });
        }
      }
    };
    scrollToStartTime();
  }, [rows, settings?.dayStart]);

  return {
    // query state
    appointment,
    isError,
    appointmentIsFetch,
    settings,
    settingsIsFetched,
    estimateIsFetched,
    // tab
    tab,
    setTab,
    // form fields
    title,
    setTitle,
    date,
    setDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    allDay,
    setAllDay,
    notes,
    setNotes,
    client,
    setClient,
    vehicle,
    setVehicle,
    serviceCategoryId,
    setServiceCategoryId,
    draft,
    setDraft,
    assignedUsers,
    setAssignedUsers,
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
    // dropdown ui state
    draftOpen,
    setDraftOpen,
    draftSearch,
    setDraftSearch,
    clientOpenDropdown,
    setClientOpenDropdown,
    vehicleOpenDropdown,
    setVehicleOpenDropdown,
    openConfirmation,
    setOpenConfirmation,
    openReminder,
    setOpenReminder,
    // computed
    filteredDraftEstimateOptions,
    selectedDraftOption,
    timeOptions,
    rows,
    // refs
    containerRef,
    // derived
    formChanged,
    isSubmitting,
    timezone,
    // handlers
    resetAll,
    handleDate,
    handleTimeChange,
    handleSubmit,
  };
}

export type AppointmentFormState = ReturnType<typeof useAppointmentFormState>;
