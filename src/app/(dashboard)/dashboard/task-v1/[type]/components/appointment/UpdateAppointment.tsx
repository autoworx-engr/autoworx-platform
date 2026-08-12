"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import { SelectClient } from "@/components/Lists/SelectClient";
import { SelectVehicle } from "@/components/Lists/SelectVehicle";
import Selector from "@/components/Selector";
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { cn } from "@/lib/cn";
import { useListsStore } from "@/stores/lists";
import { usePopupStore } from "@/stores/popup";
import { AppointmentFull } from "@/types/db";
import type {
  CalendarSettings,
  Client,
  EmailTemplate,
  User,
  Vehicle,
} from "@prisma/client";
// @ts-ignore
import { deleteAppointment } from "@/actions/appointment/deleteAppointment";
import { editAppointment } from "@/actions/appointment/editAppointment";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import Avatar from "@/components/Avatar";
import { useServerGet } from "@/hooks/useServerGet";
import { errorToast } from "@/lib/toast";
import { useFormErrorStore } from "@/stores/form-error";
import { formatTime } from "@/utils/taskAndActivity";
import { addOneHour, formatDateToToday, getCurrentTime } from "@/utils/time";
import {
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  X,
} from "lucide-react";
import moment from "moment";
import { customAlphabet } from "nanoid";
import { useEffect, useRef, useState } from "react";
import { Reminder } from "./Reminder";

enum Tab {
  Schedule = 0,
  Reminder = 1,
}

export function UpdateAppointment() {
  const { popup, data, close } = usePopupStore();
  const { appointment, settings, employees, templates } = data as {
    appointment: AppointmentFull;
    customers: Client[];
    vehicles: Vehicle[];
    settings: CalendarSettings;
    employees: User[];
    templates: EmailTemplate[];
  };

  const { showError, clearError } = useFormErrorStore();
  const { estimates } = useListsStore();

  const [tab, setTab] = useState(Tab.Reminder);

  const [title, setTitle] = useState(appointment?.title);
  const [notes, setNotes] = useState(appointment?.notes || "");
  const [date, setDate] = useState<string | null>(
    moment.utc(appointment?.date).format("YYYY-MM-DD"),
  );
  const [startTime, setStartTime] = useState<string | null>(
    appointment?.startTime,
  );

  const [endTime, setEndTime] = useState<string | null>(appointment?.endTime);
  const [draft, setDraft] = useState<string | null>(appointment?.draftEstimate);
  const [draftEstimates, setDraftEstimates] = useState<string[]>([]);
  const [allDay, setAllDay] = useState(false);

  // Add state for minimum date and time validation
  const [minDate, setMinDate] = useState<string>("");

  const [client, setClient] = useState<Client | null>(appointment?.client);
  const [vehicle, setVehicle] = useState<Vehicle | null>(appointment?.vehicle);
  const [assignedUsers, setAssignedUsers] = useState<User[]>(
    appointment?.assignedUsers,
  );

  const [employeesToDisplay, setEmployeesToDisplay] =
    useState<User[]>(employees);

  const [times, setTimes] = useState<{ time: string; date: string }[]>(
    appointment?.times as any,
  );
  const [confirmationTemplate, setConfirmationTemplate] =
    useState<EmailTemplate | null>(appointment?.confirmationEmailTemplate);
  const [reminderTemplate, setReminderTemplate] =
    useState<EmailTemplate | null>(appointment?.reminderEmailTemplate);
  const [confirmationTemplateStatus, setConfirmationTemplateStatus] =
    useState(false);
  const [reminderTemplateStatus, setReminderTemplateStatus] = useState(false);

  const [draftOpen, setDraftOpen] = useState(false);
  const { data: company } = useServerGet(getCompanyTimezone);

  //dropdown states
  const [clientOpenDropdown, setClientOpenDropdown] = useState(false);
  const [vehicleOpenDropdown, setVehicleOpenDropdown] = useState(false);

  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [openReminder, setOpenReminder] = useState(false);
  // When confirmation is OFF, saving is gated behind a prompt — the toggle
  // always opens OFF, so skipping the client email would otherwise be a silent
  // side effect of editing something unrelated.
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addSalesPersonOpen, setAddSalesPersonOpen] = useState(false);
  const [addTechnicianOpen, setAddTechnicianOpen] = useState(false);

  const [assignedSalesSearch, setAssignedSalesSearch] = useState("");
  const [assignedTechnicianSearch, setAssignedTechnicianSearch] = useState("");
  const [filteredSales, setFilteredSales] = useState<User[]>([]);
  const [filteredTechnicians, setFilteredTechnicians] = useState<User[]>([]);

  const handleDate = (operator: "+" | "-") => {
    const d = new Date();
    d.setDate(d.getDate() + (operator === "+" ? 1 : -1));
    setDate(d.toISOString().split("T")[0]);
  };

  // Change start and end time based on settings
  // Change start and end time based on settings
  useEffect(() => {
    if (allDay && settings) {
      const isToday =
        date === formatDateToToday(date ?? new Date().toISOString());
      const currentTime = getCurrentTime(); // Current time in HH:mm format

      let startTime = settings.dayStart;
      let endTime = settings.dayEnd;

      if (isToday && startTime < currentTime) {
        startTime = currentTime;

        // Ensure endTime is valid
        if (endTime < startTime || endTime > settings.dayEnd) {
          endTime = startTime;
        }
      }

      setStartTime(startTime);
      setEndTime(endTime);
    }
  }, [allDay, settings, date]);

  useEffect(() => {
    if (templates) {
      useListsStore.setState({ templates });
    }
  }, [templates]);

  useEffect(() => {
    if (estimates) {
      // filter all estimates where clientId is client.id
      const filteredEstimates = estimates.filter(
        (estimate) => estimate.clientId === client?.id,
      );
      // map the filtered estimates to get the id
      const estimateIds = filteredEstimates.map((estimate) => estimate.id);
      // set the draft estimates
      setDraftEstimates(estimateIds);
    }
  }, [estimates, client]);

  // Set minimum date to today
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setMinDate(`${year}-${month}-${day}`);
  }, []);

  // Add function to generate a reasonable default end time based on start time
  const getDefaultEndTime = (start: string) => {
    if (!start) return "";

    const [hours, minutes] = start.split(":").map(Number);
    let endHours = hours + 1;
    let endMinutes = minutes;

    // Handle midnight crossing
    if (endHours === 24) {
      endHours = 0;
    }

    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  };

  // Runs before the save prompt so the user is never asked to confirm an edit
  // that is going to be rejected anyway. Returns false once it has toasted.
  const validateForm = () => {
    // Add validation for date and time
    if (!title.trim()) {
      errorToast("Appointment title is required!");
      return false;
    }

    if (date && (!startTime || !endTime)) {
      errorToast(
        "Start time and End time are required when a date is selected!",
      );
      return false;
    }

    if (client && confirmationTemplateStatus && !confirmationTemplate) {
      errorToast("No confirmation template is selected");
      return false;
    } else if (client && reminderTemplateStatus && !reminderTemplate) {
      errorToast("No reminder template is selected");
      return false;
    }

    // An enabled reminder with no scheduled times would silently send nothing,
    // so require at least one time/date pair to be added.
    if (
      client &&
      reminderTemplateStatus &&
      reminderTemplate &&
      !times?.length
    ) {
      errorToast(
        "Add at least one reminder time and date, or turn the reminder off.",
      );
      return false;
    }

    if (
      client &&
      reminderTemplateStatus &&
      reminderTemplate &&
      !company?.timezone
    ) {
      errorToast(
        "Set company timezone in Settings > Business Profile to send client reminders.",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const res = await editAppointment({
        id: appointment.id,
        appointment: {
          title,
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

      if (res.type === "globalError") {
        // Keep the prompt closed but the edit modal open so the error is
        // actionable and the user's input isn't lost.
        setSaveConfirmOpen(false);
        showError({
          field: res.field,
          message:
            res.errorSource && res.errorSource.length > 0
              ? res.errorSource[0].message
              : res.message,
        });
        return;
      }

      setSaveConfirmOpen(false);
      close();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (!validateForm()) return;
    // Only warn when confirmation is OFF — turning it on needs no prompt, since
    // sending the email is the expected outcome.
    if (confirmationTemplateStatus) {
      handleSubmit();
      return;
    }
    setSaveConfirmOpen(true);
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

  // Add scroll to the side of the schedule sync with the calender settings
  const rows = Array.from({ length: 24 }, (_, i) => {
    return `${i % 12 || 12} ${i < 12 ? "A" : "P"}M`;
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Function to check if the selected date is today
  const isToday = date
    ? new Date(date).toDateString() === new Date().toDateString()
    : false;

  const handleTimeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "start" | "end",
  ) => {
    let timeValue = e.target.value;

    // Check if date exists and is today
    // const isToday =
    //   date === formatDateToToday(date ?? new Date().toISOString());
    // const currentTime = getCurrentTime(); // Always in 24-hour HH:mm format

    if (type === "start") {
      // ✅ Allow past times for updating, no restriction
      setStartTime(timeValue);

      // ✅ Set `endTime` to 1 hour after `startTime`, but don't override if updating
      if (!endTime || endTime < timeValue) {
        setEndTime(addOneHour(timeValue));
      }
    } else if (type === "end") {
      // ❌ Prevent selecting an end time before `startTime`
      // if (timeValue < startTime!) {
      //   errorToast("End time cannot be before start time!");
      //   return;
      // }

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

  useEffect(() => {
    if (appointment?.client) {
      setClient(appointment.client);
    }
  }, [appointment]);
  useEffect(() => {
    if (appointment?.assignedUsers?.length > 0) {
      setAssignedUsers(appointment.assignedUsers);
    }
  }, [appointment]);
  useEffect(() => {
    if (addSalesPersonOpen && addTechnicianOpen) {
      setAddTechnicianOpen(false);
      // setAddSalesPersonOpen(true);
    }
  }, [addSalesPersonOpen]);
  useEffect(() => {
    if (addTechnicianOpen && addSalesPersonOpen) {
      setAddSalesPersonOpen(false);
    }
  }, [addTechnicianOpen]);

  useEffect(() => {
    if (assignedTechnicianSearch) {
      let val = employees.filter((employee) => {
        return (
          employee.employeeType === "Technician" &&
          !assignedUsers.find((user) => user.id === employee.id) &&
          (employee?.firstName
            ?.toLowerCase()
            .includes(assignedTechnicianSearch.toLowerCase()) ||
            employee?.lastName
              ?.toLowerCase()
              .includes(assignedTechnicianSearch.toLowerCase()))
        );
      });
      setFilteredTechnicians(val);
    } else {
      let val = employees?.filter((employee) => {
        return (
          employee.employeeType === "Technician" &&
          !assignedUsers.find((user) => user.id === employee.id)
        );
      });
      setFilteredTechnicians(val);
    }
  }, [assignedTechnicianSearch]);

  useEffect(() => {
    if (assignedSalesSearch) {
      let val = employees.filter((employee) => {
        return (
          employee.employeeType === "Sales" &&
          !assignedUsers.find((user) => user.id === employee.id) &&
          (employee?.firstName
            ?.toLowerCase()
            .includes(assignedSalesSearch.toLowerCase()) ||
            employee?.lastName
              ?.toLowerCase()
              .includes(assignedSalesSearch.toLowerCase()))
        );
      });
      setFilteredSales(val);
    } else {
      let val = employees?.filter((employee) => {
        return (
          employee.employeeType === "Sales" &&
          !assignedUsers.find((user) => user.id === employee.id)
        );
      });
      setFilteredSales(val);
    }
  }, [assignedSalesSearch]);

  useEffect(() => {
    const filteredSalesPersons = employees?.filter((employee) => {
      return (
        employee.employeeType === "Sales" &&
        !assignedUsers.find((user) => user.id === employee.id)
      );
    });
    setFilteredSales(filteredSalesPersons);

    const filteredTechniciansPersons = employees?.filter((employee) => {
      return (
        employee.employeeType === "Technician" &&
        !assignedUsers.find((user) => user.id === employee.id)
      );
    });
    setFilteredTechnicians(filteredTechniciansPersons);
  }, [employees, assignedUsers, appointment]);

  return (
    <Dialog open={popup === "UPDATE_APPOINTMENT"} onOpenChange={close}>
      <DialogContent
        className="max-h-full max-w-5xl grid-rows-[auto,1fr,auto] sm:max-w-[60vw]"
        form
      >
        {/* Heading */}
        <DialogHeader className="grid items-center gap-4 sm:grid-cols-2">
          <DialogTitle>Edit Appointment</DialogTitle>

          {/* Options */}
          <div className="flex items-center justify-self-center rounded-full bg-gray-200 p-1">
            <button
              type="button"
              className={cn(
                "rounded-full px-4 py-1 font-semibold",
                tab === Tab.Schedule && "bg-background",
              )}
              onClick={() => setTab(Tab.Schedule)}
            >
              <Calendar className="mr-2 inline" size={24} />
              Schedule
            </button>

            <button
              type="button"
              className={cn(
                "rounded-full px-4 py-1 font-semibold",
                tab === Tab.Reminder && "bg-background",
              )}
              onClick={() => setTab(Tab.Reminder)}
            >
              <Bell className="mr-2 inline" size={24} />
              Reminder
            </button>
          </div>
        </DialogHeader>

        <div className="-mx-6 grid gap-px overflow-y-auto border-solid sm:grid-cols-2 md:border-y md:bg-border">
          <div className="space-y-4 bg-background p-6">
            <FormError />

            <SlimInput
              name="title"
              label="Appointment Title"
              required
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
            />

            <div className="flex flex-wrap items-end gap-2 2xl:flex-nowrap">
              <SlimInput
                name="date"
                label="Date"
                rootClassName="grow"
                type="date"
                value={date ?? ""}
                required
                onChange={(event) => setDate(event.currentTarget.value)}
              />

              <div className="flex items-end gap-2">
                <label className="flex flex-col items-start">
                  <span className="mb-1 text-sm font-medium text-gray-700">
                    Start Time
                  </span>
                  <input
                    type="time"
                    value={startTime!}
                    onChange={(e) => handleTimeChange(e, "start")}
                    className={cn(slimInputClassName, "h-[34px] px-3")}
                    // Only disable the time input if the selected date is today, but restrict future time
                    // min={isToday ? getCurrentTime() : undefined} // Restrict time to future if today
                  />
                </label>

                <label className="flex flex-col items-start">
                  <span className="mb-1 text-sm font-medium text-gray-700">
                    End Time
                  </span>
                  <input
                    type="time"
                    value={endTime!}
                    onChange={(e) => handleTimeChange(e, "end")}
                    className={cn(slimInputClassName, "h-[34px] px-3")}
                  />
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

            <button
              type="button"
              className="text-indigo-500"
              onClick={() => setAddSalesPersonOpen(true)}
            >
              + Assign Sales Person
            </button>

            {// Assigned users
            assignedUsers?.map((user) => {
              if (user.employeeType === "Sales") {
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-x-4 rounded-md border border-gray-300 px-4 py-2"
                  >
                    <div className="flex items-center gap-x-4">
                      <Avatar photo={user.image} width={30} height={30} />
                      <p>
                        {user.firstName} {user.lastName}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        let filteredAssignedUser = assignedUsers.filter(
                          (assignedUser) => user.id != assignedUser.id,
                        );
                        setAssignedUsers(filteredAssignedUser);
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              }
            })}

            {addSalesPersonOpen && (
              <div className="#w-[200px] relative space-y-4 rounded-lg border-2 border-slate-400">
                {/* Search */}
                <div className="%mx-auto relative mx-2 my-3 h-[35px] w-[85%] rounded-lg border-2 border-slate-400">
                  <Search
                    size={18}
                    className="absolute left-2 top-1/2 -translate-y-1/2 transform text-slate-400"
                  />
                  <input
                    name="search"
                    className="h-full w-full rounded-lg pl-7 pr-2 focus:outline-none"
                    type="text"
                    placeholder="Search"
                    value={assignedSalesSearch}
                    onChange={(e) => {
                      setAssignedSalesSearch(e.target.value);
                    }}
                  />
                </div>
                <X
                  className="absolute right-3 top-3 -translate-y-1/2 transform cursor-pointer text-xl text-red-400"
                  onClick={() => setAddSalesPersonOpen(false)}
                />
                <div className="max-h-[220px] overflow-y-auto">
                  {filteredSales.map((employee) => (
                    <button
                      key={employee.id}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-gray-100"
                      onClick={() => {
                        setAssignedUsers([...assignedUsers, employee]);
                        setAssignedSalesSearch("");
                        setAddSalesPersonOpen(false);
                      }}
                      type="button"
                    >
                      <Avatar photo={employee.image} width={50} height={50} />

                      <p className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <br />
            {/* assign technicians */}
            <button
              type="button"
              className="text-indigo-500"
              onClick={() => setAddTechnicianOpen(true)}
            >
              + Assign Technician
            </button>

            {// Assigned users
            assignedUsers?.map((user) => {
              if (user.employeeType === "Technician") {
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-x-4 rounded-md border border-gray-300 px-4 py-2"
                  >
                    <div className="flex items-center gap-x-4">
                      <Avatar photo={user.image} width={30} height={30} />
                      <p>
                        {user.firstName} {user.lastName}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        let filteredAssignedUser = assignedUsers.filter(
                          (assignedUser) => user.id != assignedUser.id,
                        );
                        setAssignedUsers(filteredAssignedUser);
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              }
            })}

            {addTechnicianOpen && (
              <div className="#w-[200px] relative space-y-4 rounded-lg border-2 border-slate-400">
                {/* Search */}
                <div className="%mx-auto relative mx-2 my-3 h-[35px] w-[85%] rounded-lg border-2 border-slate-400">
                  <Search
                    size={18}
                    className="absolute left-2 top-1/2 -translate-y-1/2 transform text-slate-400"
                  />
                  <input
                    name="search"
                    className="h-full w-full rounded-lg pl-7 pr-2 focus:outline-none"
                    type="text"
                    placeholder="Search"
                    value={assignedTechnicianSearch}
                    onChange={(e) => {
                      setAssignedTechnicianSearch(e.target.value);
                    }}
                  />
                </div>
                <X
                  className="absolute right-3 top-3 -translate-y-1/2 transform cursor-pointer text-xl text-red-400"
                  onClick={() => setAddTechnicianOpen(false)}
                />
                <div className="max-h-[220px] overflow-y-auto">
                  {filteredTechnicians.map((employee) => (
                    <button
                      key={employee.id}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-gray-100"
                      onClick={() => {
                        setAssignedUsers([...assignedUsers, employee]);
                        setAssignedTechnicianSearch("");
                        setAddTechnicianOpen(false);
                      }}
                      type="button"
                    >
                      <Avatar photo={employee.image} width={50} height={50} />

                      <p className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="row-start-2 space-y-4 bg-background p-6">
            <SelectClient
              value={client}
              setValue={setClient}
              openDropdown={clientOpenDropdown}
              setOpenDropdown={setClientOpenDropdown}
            />

            <SelectVehicle
              value={vehicle}
              setValue={setVehicle}
              openDropdown={vehicleOpenDropdown}
              setOpenDropdown={setVehicleOpenDropdown}
            />

            <Selector
              label={(draft: string | null) =>
                draft ? draft : "Draft Estimates"
              }
              openState={[draftOpen, setDraftOpen]}
              newButton={
                <button
                  className="text-primary disabled:text-zinc-400"
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
              displayList={(item) => <p className="text-primary">{item}</p>}
              onSearch={(search) => {
                return draftEstimates.filter((draft) =>
                  draft.toLowerCase().includes(search.toLowerCase()),
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
                <div className="sticky top-0 z-10 flex items-center gap-4 bg-background px-8 py-2">
                  <button type="button" onClick={() => handleDate("-")}>
                    <ChevronLeft />
                  </button>
                  <div className="mx-auto text-center text-gray-500">
                    {moment(date).format("dddd, MMMM YYYY")}
                  </div>
                  <button type="button" onClick={() => handleDate("+")}>
                    <ChevronRight />
                  </button>
                </div>

                <div className="relative divide-y">
                  {rows.map((row, i) => {
                    const rowTime = formatTime(row);
                    const dateRangeForBgChanger =
                      rowTime >= settings?.dayStart &&
                      rowTime <= settings?.dayEnd;
                    return (
                      <div
                        key={i}
                        className="ml-16 flex h-16 items-start border-l border-solid"
                        style={{
                          backgroundColor: dateRangeForBgChanger
                            ? "white"
                            : "#F2F2F2",
                        }}
                      >
                        {!!i && (
                          <div className="-ml-2 w-full -translate-x-full -translate-y-1/2 text-end text-gray-600">
                            {row}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {startTime && endTime && (
                    <div
                      className="absolute left-16 right-0 rounded border border-solid border-indigo-500 bg-indigo-500/30"
                      style={{
                        top: `${getHours(startTime) * 4}rem`,
                        bottom: `${(24 - getHours(endTime)) * 4}rem`,
                      }}
                    />
                  )}
                </div>
              </div>
            ) : tab === Tab.Reminder ? (
              <Reminder
                client={client}
                vehicle={vehicle}
                startTime={startTime!}
                date={date!}
                times={times || []}
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

        <div className="flex gap-5 md:gap-0">
          <button
            className="text-xl text-red-500 hover:text-red-700"
            type="button"
            onClick={async () => {
              await deleteAppointment(appointment.id);
              close();
            }}
          >
            <Trash2 />
          </button>

          <DialogFooter className="w-full">
            <DialogClose className="mt-2 rounded-md border px-4 py-1 md:mt-0">
              Cancel
            </DialogClose>
            <button
              type="button"
              className={`rounded-md border px-4 py-1 text-white ${
                formChanged ? "bg-primary" : "cursor-not-allowed bg-gray-400"
              }`}
              onClick={handleSaveClick}
              disabled={!formChanged || isSaving}
            >
              Save
            </button>
          </DialogFooter>
        </div>
      </DialogContent>

      {/* The confirmation switch always opens OFF on edit, so warn before a
          save silently skips the client's confirmation email. */}
      <ConfirmModal
        open={saveConfirmOpen}
        onOpenChange={setSaveConfirmOpen}
        title="Save without confirmation?"
        description="Appointment Confirmation is OFF, so no confirmation will be sent to the client or team. Turn it on before saving if you want the client notified."
        confirmText="Save"
        cancelText="Go back"
        loading={isSaving}
        onConfirm={handleSubmit}
      />
    </Dialog>
  );
}

function getHours(time: string) {
  if (!time) return 0;
  const [h, m] = time.split(":").map((x) => +x);
  return h + m / 60;
}
