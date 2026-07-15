"use client";

import { addAppointment } from "@/actions/appointment/addAppointment";
import { editAppointment } from "@/actions/appointment/editAppointment";
import { getClientEstimate } from "@/app/(dashboard)/dashboard/communication/client/_actions/getClientEstimate";
import useSettingsQuery from "@/app/(dashboard)/dashboard/task/_hook/settings/query/useSettingsQuery";
import useAppointmentQueryById from "@/hooks/query-hook/useAppointmentQueryById";
import useEstimatesQueryByClient from "@/hooks/query-hook/useEstimatesQueryByClient";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { queryKeys } from "@/lib/queryKeys";
import { errorToast, successToast } from "@/lib/toast";
import { useCalendarStore } from "@/stores/calendarStore";
import { useFormErrorStore } from "@/stores/form-error";
import { formatTime12Hour } from "@/utils/formateTime12Hours";
import { normalizeTime } from "@/utils/normalizeTime";
import { formatTime } from "@/utils/taskAndActivity";
import { addOneHour } from "@/utils/time";
import type {
  Appointment,
  Client,
  EmailTemplate,
  Lead,
  User,
  Vehicle,
} from "@prisma/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

  const { data: invoices = [] } = useQuery({
    queryKey: queryKeys.invoicesByClientId(client?.id!),
    queryFn: () =>
      getClientEstimate(client?.id!, {
        where: { clientId: client?.id!, type: "Invoice" },
        select: { id: true, clientId: true, grandTotal: true, vehicle: true },
      }),
    enabled: !!client?.id,
  });

  const timezone = useCompanyTimezone();
  const today = moment().format("YYYY-MM-DD");

  const [tab, setTab] = useState(Tab.Reminder);
  const [date, setDate] = useState<string | undefined>(
    appointment?.date
      ? moment.utc(appointment?.date).format("YYYY-MM-DD")
      : today,
  );
  const [endDate, setEndDate] = useState<string | undefined>(
    (appointment as any)?.endDate
      ? moment.utc((appointment as any).endDate).format("YYYY-MM-DD")
      : undefined,
  );
  const [title, setTitle] = useState<string>("");

  // Clear the "title required" error as soon as the user picks a title
  useEffect(() => {
    if (title && title.trim()) {
      clearError();
    }
  }, [title]);
  const [notes, setNotes] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
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

  const [originalValues, setOriginalValues] = useState<{
    title: string;
    date: string | undefined;
    endDate: string | undefined;
    startTime: string;
    endTime: string;
    assignedUsers: User[];
    client: typeof client;
    vehicle: typeof vehicle;
    serviceCategoryId: number | null;
    draft: string | null;
    notes: string;
    confirmationTemplate: EmailTemplate | null;
    reminderTemplate: EmailTemplate | null;
    confirmationTemplateStatus: boolean;
    reminderTemplateStatus: boolean;
    times: { time: string; date: string }[];
  }>({
    title,
    date,
    endDate,
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
    setEndDate(undefined);
    setStartTime("");
    setEndTime("");
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

  const draftEstimateOptions = useMemo(() => {
    const toOption = (item: any, type: "Invoice" | "Estimate") => {
      const vehicleLabel =
        [item?.vehicle?.year, item?.vehicle?.make, item?.vehicle?.model]
          .filter(Boolean)
          .join(" ") ||
        item?.vehicle?.other ||
        "";
      return {
        id: String(item.id),
        price: Number(item?.grandTotal ?? 0),
        vehicle: vehicleLabel,
        type,
      };
    };
    return [
      ...invoices.map((inv) => toOption(inv, "Invoice")),
      ...estimates.map((est) => toOption(est, "Estimate")),
    ];
  }, [estimates, invoices]);

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

      const editEndDate = (appointment as any)?.endDate
        ? moment.utc((appointment as any).endDate).format("YYYY-MM-DD")
        : undefined;
      setEndDate(editEndDate);

      setOriginalValues({
        title: appointment?.title || "",
        date: moment.utc(appointment?.date ?? "").format("YYYY-MM-DD"),
        endDate: editEndDate,
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
        endDate: undefined,
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
    if (fromEdit) return;

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
  }, [selectedDate, selectedStartTime, fromEdit]);

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
    const calendarSettings = (settings as any)?.data ?? settings;
    if (allDay && calendarSettings?.dayStart && calendarSettings?.dayEnd) {
      const toHm = (t: string) => {
        const m = moment(t, ["HH:mm:ss", "HH:mm", "h:mm A"], true);
        return m.isValid() ? m.format("HH:mm") : t;
      };
      setStartTime(toHm(calendarSettings.dayStart));
      setEndTime(toHm(calendarSettings.dayEnd));
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
      }
      // On create (not edit, not all-day) leave the times empty so the user
      // picks them — mirrors the task form. No auto "now" default.
    }
  }, [allDay, settings, date, fromEdit, appointment]);

  useEffect(() => {
    setFormChanged(
      title !== originalValues.title ||
        date !== originalValues.date ||
        endDate !== originalValues.endDate ||
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
    endDate,
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
    const delta = operator === "+" ? 1 : -1;
    const base = date ? moment(date, "YYYY-MM-DD") : moment();
    setDate(base.clone().add(delta, "day").format("YYYY-MM-DD"));
    if (endDate) {
      setEndDate(
        moment(endDate, "YYYY-MM-DD").add(delta, "day").format("YYYY-MM-DD"),
      );
    }
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
      // For multi-day appointments end time lives on a later day, so it may
      // be numerically earlier than the start time. Only enforce ordering
      // when start and end fall on the same calendar day.
      const isMultiDay = !!(endDate && date && endDate > date);
      if (!isMultiDay && startTime && timeValue < startTime) {
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

      if (endDate && date && endDate < date) {
        setIsSubmitting(false);
        showError({
          field: "all",
          message: "End date cannot be before start date!",
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
            endDate: endDate ? endDate : null,
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
          endDate: endDate ? endDate : null,
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

  // Business hours can be off the 15-minute grid (e.g. "10:40"). Inject the exact
  // dayStart/dayEnd as options so the "all day" value matches one and renders with
  // a proper 12-hour label instead of falling back to the raw "HH:mm" string.
  const calendarSettings = (settings as any)?.data ?? settings;
  [calendarSettings?.dayStart, calendarSettings?.dayEnd].forEach((t) => {
    const m = t ? moment(t, ["HH:mm:ss", "HH:mm", "h:mm A"], true) : null;
    if (!m || !m.isValid()) return;
    const value = m.format("HH:mm");
    if (timeOptions.some((o) => o.value === value)) return;
    timeOptions.push({
      value,
      label: formatTime12Hour(m.hour(), m.minute(), timezone),
    });
  });
  timeOptions.sort((a, b) => a.value.localeCompare(b.value));

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
    endDate,
    setEndDate,
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
