"use client";

import FullCalendar from "@fullcalendar/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RefObject } from "react";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { getCalenderSettings } from "@/actions/task/getCalendarSettings";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { useCalendarStore } from "@/stores/calendarStore";
import { CalendarType } from "@/types/calendar";
import { Appointment, Lead } from "@prisma/client";
import CalendarSearch from "@/app/(dashboard)/dashboard/task/_component/calendar/CalendarSearch";
import DateSelector from "@/app/(dashboard)/dashboard/task/_component/calendar/DateSelector";
import DisplayDate from "@/app/(dashboard)/dashboard/task/_component/calendar/DisplayDate";
import Settings from "@/app/(dashboard)/dashboard/task/_component/calendar/Settings";
import {
  appointmentQueryKey,
  calenderQueryKey,
} from "@/app/(dashboard)/dashboard/task/_constant";
import { useDate } from "@/app/(dashboard)/dashboard/task/_hook/lib/useDate";
import useMonth from "@/app/(dashboard)/dashboard/task/_hook/lib/useMonth";
import useWeekStartEndDays from "@/app/(dashboard)/dashboard/task/_hook/lib/useWeekStartEndDays";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarDays, ClipboardList } from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { CalendarFilterDropdown } from "./CalendarFilterDropdown";

const days = ["SUN", "MON", "TUE", "WED", "THUS", "FRI", "SAT"];

const ALLOWED_ROLES_FOR_NEW_APPOINTMENT = ["Admin", "Manager", "Sales"];

interface CalendarHeaderProps {
  calendarRef: RefObject<FullCalendar | null>;
  type: CalendarType;
  appointmentCount: number;
  taskCount: number;
  users: { id: number; name: string }[];
  technicians: { id: number; name: string }[];
  selectedUserIds: number[];
  selectedTechnicianIds: number[];
  onSelectedUserIdsChange: (ids: number[]) => void;
  onSelectedTechnicianIdsChange: (ids: number[]) => void;
}

export function CalendarHeader({
  calendarRef,
  type,
  appointmentCount,
  taskCount,
  users,
  technicians,
  selectedUserIds,
  selectedTechnicianIds,
  onSelectedUserIdsChange,
  onSelectedTechnicianIdsChange,
}: CalendarHeaderProps) {
  const date = useDate();
  const dateFormat = date.format("YYYY-MM-DD");
  const month = useMonth();
  const formattedMonth = month
    ? moment(month, "YYYY-MM").format("MMMM")
    : moment().format("MMMM");

  const formattedYear = month
    ? moment(month, "YYYY-MM").year()
    : moment().year();

  const { weekStartDate, weekEndDate } = useWeekStartEndDays();
  const queryClient = useQueryClient();
  const session = useSession();
  const user = session?.data?.user;
  const { data: settings } = useQuery({
    queryKey: [calenderQueryKey.calendarSettings],
    queryFn: () => {
      return getCalenderSettings();
    },
  });
  const router = useRouter();
  const calenderQueryType = type === "day" ? "date" : type;
  const {
    setDate,
    setMonth,
    setWeek,
    setNavigating,
    date: currentDate,
  } = useCalendarStore();

  const currentDayIndex = moment(currentDate).day();

  const handleTodayClick = () => {
    const today = moment();
    setDate(today.format("YYYY-MM-DD"));
    setMonth(today.format("YYYY-MM"));
    setWeek(today.format("YYYY-[W]WW"));
    calendarRef.current?.getApi().today(); // Navigate calendar to today");
    // calendarRef.current?.getApi().changeView("timeGridDay");
  };

  const syncDateStore = () => {
    const api = calendarRef.current?.getApi();
    if (!api) return;

    const newDateObj = moment(api.getDate());
    setDate(newDateObj.format("YYYY-MM-DD"));

    if (type === "month") {
      setMonth(newDateObj.format("YYYY-MM"));
    } else if (type === "week") {
      setWeek(newDateObj.format("YYYY-[W]WW"));
    }
  };

  const handleAppointmentCreate = async (
    newAppointment: Appointment & { lead: Lead | null },
  ) => {
    try {
      queryClient.invalidateQueries({
        queryKey: [
          appointmentQueryKey.allAppointments,
          formattedMonth,
          formattedYear,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          appointmentQueryKey.allAppointments,
          weekStartDate,
          weekEndDate,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [appointmentQueryKey.allAppointments, dateFormat],
      });

      if (newAppointment?.lead?.columnId && newAppointment?.lead?.companyId) {
        await updatePipelineAutomationTrigger({
          condition: "APPOINTMENT_SCHEDULED",
          companyId: newAppointment?.lead?.companyId,
          leadId: newAppointment?.lead?.id,
          columnId: newAppointment?.lead?.columnId,
        });
      }
    } catch (error) {
      errorHandler(error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between md:flex-row p-4 border-b bg-background rounded-t-lg">
      <h2 className="font-medium text-black max-[1300px]:text-[20px] md:ml-2 md:text-base lg:text-[26px]">
        <DisplayDate type={type} />
      </h2>

      {/* <div className="mt-2 md:mt-0 md:mx-4 flex w-full md:w-auto flex-wrap items-center gap-2"></div> */}

      <div className="flex flex-wrap items-center gap-1 text-left lg:justify-end xl:gap-3 w-full md:w-auto">
        <div className="flex flex-1 lg:flex-none items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm text-slate-700">
          <CalendarDays size={14} className="text-slate-500" />
          <span>Appointments</span>
          <span className="font-semibold text-slate-900">
            {appointmentCount}
          </span>
        </div>
        <div className="flex flex-1 lg:flex-none items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm text-slate-700">
          <ClipboardList size={14} className="text-slate-500" />
          <span>Tasks</span>
          <span className="font-semibold text-slate-900">{taskCount}</span>
        </div>
        {/* Desktop Search */}
        <div className="mb-2 hidden w-full md:mb-0 lg:block lg:w-64 xl:w-80">
          <CalendarSearch type={type} />
        </div>

        {/* Custom Date Selector */}
        <DateSelector type={type} weekStart={settings?.weekStart} />

        {/* Today Button */}
        <Button variant="outline" onClick={handleTodayClick}>
          Today
        </Button>

        {/* Arrow Buttons */}

        <Button
          variant="outline"
          size="icon-lg"
          onClick={() => {
            calendarRef.current?.getApi().prev();
            syncDateStore();
          }}
        >
          <ChevronLeft size={20} />
        </Button>
        <Button
          variant="outline"
          size="icon-lg"
          onClick={() => {
            calendarRef.current?.getApi().next();
            syncDateStore();
          }}
        >
          <ChevronRight size={20} />
        </Button>

        <div>
          <Select
            value={type}
            onValueChange={(value) => {
              router.push(`/dashboard/task/${value}`);
              calendarRef.current
                ?.getApi()
                .changeView(
                  value === "day"
                    ? "timeGridDay"
                    : value === "week"
                      ? "timeGridWeek"
                      : value === "month"
                        ? "dayGridMonth"
                        : "timeGridWeek",
                );
            }}
          >
            <SelectTrigger className="data-[size=default]:h-10">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              {/* <SelectItem value="list">List</SelectItem> */}
            </SelectContent>
          </Select>
        </div>

        {/* New Appointment Button */}
        {ALLOWED_ROLES_FOR_NEW_APPOINTMENT.includes(
          user?.employeeType ?? "",
        ) && (
            <AppointmentCreateOrEdit
              onAppointmentCreated={handleAppointmentCreate}
            />
          )}

        <CalendarFilterDropdown
          users={users}
          technicians={technicians}
          selectedUserIds={selectedUserIds}
          selectedTechnicianIds={selectedTechnicianIds}
          onSelectedUserIdsChange={onSelectedUserIdsChange}
          onSelectedTechnicianIdsChange={onSelectedTechnicianIdsChange}
        />

        {/* Settings Button */}
        <Settings />

        {/* Mobile Search */}
        <div className="my-2 block w-full md:mb-0 lg:hidden">
          <CalendarSearch type={type} />
        </div>
      </div>
    </div>
  );
}
