"use client";

import AppointmentTitleSelectAndAdd from "@/components/appointment/AppointmentTitleSelectAndAdd";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import { formatTime } from "@/utils/taskAndActivity";

import { SelectClient } from "@/components/Lists/SelectClient";
import { SelectVehicle } from "@/components/Lists/SelectVehicle";
import Selector from "@/components/Selector";
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import { cn } from "@/lib/cn";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import type {
  Appointment,
  Client,
  EmailTemplate,
  User,
  Vehicle,
} from "@prisma/client";
import { Select } from "antd";
import moment from "moment-timezone";
import { customAlphabet } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";

// @ts-ignore
import { addAppointment } from "@/actions/appointment/addAppointment";
import getDataForNewAppointment from "@/actions/pipelines/getDataForNewAppointment";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { Reminder } from "@/app/(dashboard)/dashboard/task-v1/[type]/components/appointment/Reminder";
import Avatar from "@/components/Avatar";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { useServerGet } from "@/hooks/useServerGet";
import { errorToast } from "@/lib/toast";
import { formatTime12Hour } from "@/utils/formateTime12Hours";
import { addOneHour, formatDateToToday, getCurrentTime } from "@/utils/time";
import { Calendar1, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

enum Tab {
  Schedule = 0,
  Reminder = 1,
}

export function NewAppointmentPipeline({
  clientId,
  vehicleId,
  popup,
  open,
  close,
  showButton = false,
  shouldRemoveClientId = true,
  onAutomationTrigger,
  onUpdateAppointmentInLead,
  // settings,
  // employees,
  // templates,
}: {
  clientId: number | undefined;
  vehicleId?: number | undefined | null;
  popup: string | null;
  open: any;
  close: any;
  showButton?: boolean;
  shouldRemoveClientId?: boolean;
  onAutomationTrigger?: (columnData: {
    leadId: number;
    columnId: number;
  }) => void;
  onUpdateAppointmentInLead?: (
    appointment: Appointment,
    columnInfo: { leadId: number; columnId: number },
  ) => void;
  // settings: CalendarSettings;
  // employees: User[];
  // templates: EmailTemplate[];
}) {
  const { Option } = Select;
  const timezone = useCompanyTimezone();

  // fetching necessary data to implement New Appointment
  const { data: newAppointmentData } = useServerGet(
    getDataForNewAppointment,
    clientId,
    vehicleId,
  );

  const { showError } = useFormErrorStore();
  const setOpen = useCallback(
    (value: boolean) => {
      value ? open("ADD_TASK") : close();
    },
    [open, close],
  );
  const { estimates } = useListsStore();

  const [tab, setTab] = useState(Tab.Reminder);
  const [title, setTitle] = useState<string>("");

  const [date, setDate] = useState<string | undefined>(
    moment().toISOString().split("T")[0],
  );
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("00:00");

  const [minDate, setMinDate] = useState<string>("");
  const [allDay, setAllDay] = useState(false);

  const [client, setClient] = useState<Client | null>(
    newAppointmentData?.client ? newAppointmentData.client : null,
  );
  const [vehicle, setVehicle] = useState<Vehicle | null>(
    newAppointmentData?.vehicle ? newAppointmentData.vehicle : null,
  );
  const [draft, setDraft] = useState<string | null>(null);
  const [draftEstimates, setDraftEstimates] = useState<string[]>([]);
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

  const { data: company } = useServerGet(getCompanyTimezone);

  // dropdown states
  const [clientOpenDropdown, setClientOpenDropdown] = useState(false);
  const [vehicleOpenDropdown, setVehicleOpenDropdown] = useState(false);

  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [openReminder, setOpenReminder] = useState(false);
  const [addSalesPersonOpen, setAddSalesPersonOpen] = useState(false);
  const [addTechnicianOpen, setAddTechnicianOpen] = useState(false);
  const [assignedSalesSearch, setAssignedSalesSearch] = useState("");
  const [assignedTechnicianSearch, setAssignedTechnicianSearch] = useState("");
  const [filteredSales, setFilteredSales] = useState<User[]>([]);
  const [filteredTechnicians, setFilteredTechnicians] = useState<User[]>([]);
  const searchParams = useSearchParams() || "";

  const params = new URLSearchParams(searchParams);

  const clientParamId = params.get("clientId");

  const today = moment.tz(timezone).format("YYYY-MM-DD");
  // const { reset } = useEstimateCreateStore();
  let data = useListsStore();

  useEffect(() => {
    useListsStore.setState({
      ...data,
      customers: newAppointmentData?.customers,
      vehicles: newAppointmentData?.vehicles,
      employees: newAppointmentData?.employees,
      templates: newAppointmentData?.templates,
      estimates: newAppointmentData?.estimates,
    });
    // newAppointmentData?.employees &&
    //   setEmployeesToDisplay(newAppointmentData?.employees);
  }, [newAppointmentData, clientParamId]);

  useEffect(() => {
    if (newAppointmentData?.client) {
      setClient(newAppointmentData?.client);
    }
    if (newAppointmentData?.vehicle) {
      setVehicle(newAppointmentData?.vehicle);
    }
  }, [newAppointmentData]);

  useEffect(() => {
    if (popup !== "ADD_TASK") {
      resetAll();
      shouldRemoveClientId && removeClientIdFromParams();
    }
  }, [popup]);

  const handleDate = (operator: "+" | "-") => {
    const d = moment().toDate();
    d.setDate(d.getDate() + (operator === "+" ? 1 : -1));
    setDate(d.toISOString().split("T")[0]);
  };

  // Change start and end time based on settings
  useEffect(() => {
    if (allDay && newAppointmentData?.settings) {
      const isToday =
        date === formatDateToToday(date ?? moment().toISOString());
      const currentTime = getCurrentTime(); // Current time in HH:mm format

      let startTime = newAppointmentData?.settings.dayStart;
      let endTime = newAppointmentData?.settings.dayEnd;

      if (isToday && startTime < currentTime) {
        startTime = currentTime;

        // Ensure endTime is valid
        if (
          endTime < startTime ||
          endTime > newAppointmentData?.settings.dayEnd
        ) {
          endTime = startTime;
        }
      }

      setStartTime(startTime);
      setEndTime(endTime);
    }
  }, [allDay, newAppointmentData?.settings, date]);

  useEffect(() => {
    if (newAppointmentData?.templates)
      useListsStore.setState({ templates: newAppointmentData?.templates });
  }, [newAppointmentData?.templates]);

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

  const handleSubmit = async (data: FormData) => {
    try {
      const notes = data.get("notes") as string;

      if (!title || !title.trim()) {
        return errorToast("Appointment title is required!");
      }

      if (date && (!startTime || !endTime)) {
        return errorToast(
          "Start time and End time are required when a date is selected!",
        );
      }

      if (client && confirmationTemplateStatus && !confirmationTemplate) {
        return errorToast("No confirmation template is selected");
      } else if (client && reminderTemplateStatus && !reminderTemplate) {
        return errorToast("No reminder template is selected");
      }

      // An enabled reminder with no scheduled times would silently send
      // nothing, so require at least one time/date pair to be added.
      if (
        client &&
        reminderTemplateStatus &&
        reminderTemplate &&
        times.length === 0
      ) {
        return errorToast(
          "Add at least one reminder time and date, or turn the reminder off.",
        );
      }

      if (
        client &&
        reminderTemplateStatus &&
        reminderTemplate &&
        !company?.timezone
      ) {
        return errorToast(
          "Set company timezone in Settings > Business Profile to send client reminders.",
        );
      }

      const res = await addAppointment({
        title,
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
      console.log("appointment create response", res);

      if (res.type === "globalError") {
        showError({
          field: res.field || "all",
          message:
            res.errorSource && res.errorSource.length > 0
              ? res.errorSource[0].message
              : res.message,
        });
        return;
      } else if (res.type === "success") {
        if (
          onAutomationTrigger &&
          newAppointmentData?.client &&
          newAppointmentData.client.Lead &&
          newAppointmentData.client.Lead.column
        ) {
          // Type assertion is safe here due to the above checks
          onAutomationTrigger({
            leadId: newAppointmentData?.client?.Lead?.id,
            columnId: newAppointmentData?.client?.Lead?.column?.id,
          });
        }

        if (
          onUpdateAppointmentInLead &&
          newAppointmentData?.client?.Lead &&
          newAppointmentData?.client?.Lead?.column
        ) {
          // Type assertion is safe here due to the above checks
          onUpdateAppointmentInLead &&
            onUpdateAppointmentInLead(res.data as Appointment, {
              leadId: newAppointmentData?.client?.Lead?.id,
              columnId: newAppointmentData?.client?.Lead?.column?.id,
            });
        }
      }

      // reset all the fields
      resetAll();
      close();
    } catch (err) {
      console.log("appointment create error", err);
      errorToast("Appointment Create fail");
    }
  };

  const router = useRouter();
  const pathname = usePathname();

  const removeClientIdFromParams = () => {
    const params = new URLSearchParams(searchParams!);
    if (params.has("clientId")) {
      params.delete("clientId");
      router.push(`${pathname}?${params.toString()}`);
    }
  };

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
    shouldRemoveClientId && removeClientIdFromParams();
    // remove the clientId from the url
    // router.push(pathname);
  }

  // useEffect(() => {
  //   removeClientIdFromParams();
  // }, []);

  useEffect(() => {
    const today = moment().toDate();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setMinDate(`${year}-${month}-${day}`);
  }, []);

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

  const handleAppointmentOpen = () => {
    // data.reset();
    setTimeout(() => {
      router.push(
        `${pathname}?view=pipelines&clientId=${clientId}${params.get("details") ? "&chat=true&details=true" : ""} `,
      );
    }, 500);
  };

  // Add scroll to the side of the schedule sync with the calender settings
  const rows = Array.from({ length: 24 }, (_, i) => {
    return `${i % 12 || 12} ${i < 12 ? "A" : "P"}M`;
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Function to check if the selected date is today
  const isToday = date
    ? moment(date).toDate().toDateString() === moment().toDate().toDateString()
    : false;

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
          return rowTime === newAppointmentData?.settings?.dayStart;
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
  }, [rows, newAppointmentData?.settings?.dayStart]);
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
      let val = (newAppointmentData?.employees || [])?.filter((employee) => {
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
      let val = (newAppointmentData?.employees || [])?.filter((employee) => {
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
      let val = (newAppointmentData?.employees || [])?.filter((employee) => {
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
      let val = (newAppointmentData?.employees || [])?.filter((employee) => {
        return (
          employee.employeeType === "Sales" &&
          !assignedUsers.find((user) => user.id === employee.id)
        );
      });
      setFilteredSales(val);
    }
  }, [assignedSalesSearch]);

  useEffect(() => {
    const filteredSalesPersons = (newAppointmentData?.employees || [])?.filter(
      (employee) => {
        return (
          employee.employeeType === "Sales" &&
          !assignedUsers.find((user) => user.id === employee.id)
        );
      },
    );
    setFilteredSales(filteredSalesPersons);

    const filteredTechnicians = (newAppointmentData?.employees || [])?.filter(
      (employee) => {
        return (
          employee.employeeType === "Technician" &&
          !assignedUsers.find((user) => user.id === employee.id)
        );
      },
    );
    setFilteredTechnicians(filteredTechnicians);
  }, [newAppointmentData, assignedUsers]);

  useEffect(() => {
    let now = moment.tz(timezone);

    const roundedMinutes = Math.ceil(now.minute() / 15) * 15;
    now.minute(roundedMinutes).second(0).millisecond(0);

    setStartTime(now.format("HH:mm"));

    const end = now.clone().add(1, "hours");
    setEndTime(end.format("HH:mm"));
  }, [timezone]);

  // Generate options in 15-min intervals
  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const label = formatTime12Hour(hour, minute, timezone);
    return { value, label };
  });

  return (
    <Dialog open={popup === "ADD_TASK"} onOpenChange={setOpen}>
      {showButton && (
        <DialogTrigger asChild>
          <button
            onClick={handleAppointmentOpen}
            className="group relative mt-4 rounded-md bg-background px-4 py-2 font-bold text-emerald-700 shadow-lg"
          >
            {/* <CiCalendar size={18} />
            <span className="invisible absolute bottom-full left-16 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
              Create Appointment
            </span> */}
            Set Appointment +
          </button>
        </DialogTrigger>
      )}
      <DialogContent
        className="grid max-h-full max-w-5xl grid-rows-[auto,1fr,auto] bg-background sm:max-w-[60vw]"
        form
      >
        {/* Heading */}
        <DialogHeader className="grid items-center gap-4 sm:grid-cols-2">
          <DialogTitle>New Appointment</DialogTitle>

          {/* Options */}
          <div className="flex items-center justify-self-center rounded-full bg-gray-300 p-1">
            <button
              type="button"
              className={cn(
                "rounded-full px-4 py-1 font-semibold",
                tab === Tab.Schedule && "bg-background",
              )}
              onClick={() => setTab(Tab.Schedule)}
            >
              <Calendar1 className="mr-2 inline" size={24} />
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
              <svg
                viewBox="-1.28 -1.28 18.56 18.56"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                className="h-6 w-6 inline mr-2"
                stroke="currentColor"
                strokeWidth="0.41600000000000004"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {" "}
                  <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"></path>{" "}
                </g>
              </svg>
              Reminder
            </button>
          </div>
        </DialogHeader>

        <div className="-mx-6 grid gap-px overflow-y-auto border-y border-solid bg-border sm:grid-cols-2">
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
                onChange={(event) => setDate(event.currentTarget.value)}
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

            <button
              type="button"
              className="text-indigo-500"
              onClick={() => setAddSalesPersonOpen(true)}
            >
              + Assign Sales Person
            </button>

            {
              // Assigned users
              assignedUsers.map((user) => {
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
                        <X size={16} strokeWidth={3} />
                      </button>
                    </div>
                  );
                }
              })
            }

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
                  size={18}
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

            {
              // Assigned users
              assignedUsers.map((user) => {
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
                        <X size={16} strokeWidth={3} />
                      </button>
                    </div>
                  );
                }
              })
            }

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
                  size={18}
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
                    <ChevronLeft size={18} />
                  </button>
                  <div className="mx-auto text-center">
                    {moment(date).format("dddd, MMMM YYYY")}
                  </div>
                  <button type="button" onClick={() => handleDate("+")}>
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="relative divide-y">
                  {rows.map((row, i) => {
                    const rowTime = formatTime(row);
                    const dateRangeForBgChanger =
                      rowTime >= newAppointmentData?.settings?.dayStart! &&
                      rowTime <= newAppointmentData?.settings?.dayEnd!;
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
                // @ts-ignore
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
          <Submit
            className="rounded-md border bg-primary px-4 py-1 text-white"
            formAction={handleSubmit}
          >
            Save
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getHours(time: string) {
  if (!time) return 0;
  const [h, m] = time.split(":").map((x) => +x);
  return h + m / 60;
}
