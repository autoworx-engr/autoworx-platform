"use client";

import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { getCalenderSettings } from "@/actions/task/getCalendarSettings";
import {
  appointmentQueryKey,
  calenderQueryKey,
} from "@/app/(dashboard)/dashboard/task/_constant";
import { useDate } from "@/app/(dashboard)/dashboard/task/_hook/lib/useDate";
import useMonth from "@/app/(dashboard)/dashboard/task/_hook/lib/useMonth";
import useWeekStartEndDays from "@/app/(dashboard)/dashboard/task/_hook/lib/useWeekStartEndDays";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { useCalendarStore } from "@/stores/calendarStore";
import { CalendarType } from "@/types/calendar";
import FullCalendar from "@fullcalendar/react";
import { Appointment, Lead } from "@prisma/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
} from "lucide-react";
import moment from "moment";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RefObject } from "react";
import { Button } from "../../../../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../../components/ui/select";
import { CalendarFilterDropdown } from "./CalendarFilterDropdown";
import CalendarSearch from "./CalendarSearch";
import DateSelector from "./DateSelector";
import DisplayDate from "./DisplayDate";
import MonthYearPicker from "./MonthYearPicker";
import Settings from "./Settings";

const ALLOWED_ROLES_FOR_NEW_APPOINTMENT = ["Admin", "Manager", "Sales"];

const VIEW_OPTIONS = [
  { value: "day", label: "Day", fcView: "timeGridDay" },
  { value: "week", label: "Week", fcView: "timeGridWeek" },
  { value: "month", label: "Month", fcView: "dayGridMonth" },
  { value: "list", label: "List", fcView: "listDay" },
] as const;

interface CalendarHeaderProps {
  calendarRef: RefObject<FullCalendar | null>;
  type: CalendarType;
  appointmentCount: number;
  taskCount: number;
  estRevenue: number;
  teamMates: { id: number; name: string }[];
  categories: { id: number; name: string }[];
  selectedTeamMateIds: number[];
  selectedCategoryIds: number[];
  onSelectedTeamMateIdsChange: (ids: number[]) => void;
  onSelectedCategoryIdsChange: (ids: number[]) => void;
}

export function CalendarHeader({
  calendarRef,
  type,
  appointmentCount,
  taskCount,
  estRevenue,
  teamMates,
  categories,
  selectedTeamMateIds,
  selectedCategoryIds,
  onSelectedTeamMateIdsChange,
  onSelectedCategoryIdsChange,
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
    queryFn: () => getCalenderSettings(),
  });
  const router = useRouter();
  const { setDate, setMonth, setWeek } = useCalendarStore();

  const handleTodayClick = () => {
    const today = moment();
    setDate(today.format("YYYY-MM-DD"));
    setMonth(today.format("YYYY-MM"));
    setWeek(today.format("YYYY-[W]WW"));
    calendarRef.current?.getApi().today();
  };

  const step = (delta: number) => {
    const unit: moment.unitOfTime.DurationConstructor =
      type === "week" ? "week" : type === "month" ? "month" : "day";
    const next = date.clone().add(delta, unit);
    setDate(next.format("YYYY-MM-DD"));
    setMonth(next.format("YYYY-MM"));
    setWeek(next.format("YYYY-[W]WW"));
  };
  const handlePrev = () => step(-1);
  const handleNext = () => step(1);

  const handleViewChange = (value: string) => {
    router.push(`/dashboard/task/${value}`);
    const fcView =
      VIEW_OPTIONS.find((v) => v.value === value)?.fcView ?? "timeGridDay";
    const targetDate = moment().format("YYYY-MM-DD");

    calendarRef.current?.getApi().changeView(fcView, targetDate);
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
          companyId: newAppointment.lead.companyId,
          leadId: newAppointment.lead.id,
          columnId: newAppointment.lead.columnId,
        });
      }
    } catch (error) {
      errorHandler(error);
    }
  };

  return (
    <div className="rounded-t-lg border-b bg-white">
      {/* ── Row 1: Controls ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        {/* Today */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleTodayClick}
          className="h-9 px-3 text-sm font-medium shrink-0"
        >
          Today
        </Button>

        {/* Prev / Next */}
        <div className="flex shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            className="h-9 w-9 rounded-r-none border-r-0"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="h-9 w-9 rounded-l-none"
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* Segmented view switcher — desktop */}
        <div className="hidden sm:flex overflow-hidden rounded-md border p-1 h-9">
          {VIEW_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleViewChange(value)}
              className={`px-3 py-1 text-sm font-medium capitalize rounded transition-colors ${
                type === value
                  ? "bg-gradient-to-r from-primary to-[#5a66ee] text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Select dropdown — mobile only */}
        <div className="sm:hidden shrink-0">
          <Select value={type} onValueChange={handleViewChange}>
            <SelectTrigger
              size="md"
              className="w-28 text-sm shadow-none border rounded-md"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEW_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <DateSelector type={type} weekStart={settings?.weekStart} />

          <CalendarFilterDropdown
            teamMates={teamMates}
            categories={categories}
            selectedTeamMateIds={selectedTeamMateIds}
            selectedCategoryIds={selectedCategoryIds}
            onSelectedTeamMateIdsChange={onSelectedTeamMateIdsChange}
            onSelectedCategoryIdsChange={onSelectedCategoryIdsChange}
          />

          <Settings />
        </div>

        {/* Push right */}
        <div className="flex-1" />

        {/* Search — hidden on mobile, shown md+ */}
        <div className="hidden md:block w-56 lg:w-80 xl:w-96">
          <CalendarSearch type={type} />
        </div>

        {/* New Appointment */}
        {ALLOWED_ROLES_FOR_NEW_APPOINTMENT.includes(
          user?.employeeType ?? "",
        ) && (
          <AppointmentCreateOrEdit
            onAppointmentCreated={handleAppointmentCreate}
          />
        )}
      </div>

      {/* ── Row 2: Date title + Stats ─────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-3 py-2 sm:px-4">
        {/* Date — month view gets clickable month + year pickers; other views
            keep the descriptive title (day/week selection is via DateSelector). */}
        <h2 className="mr-auto text-base font-semibold text-slate-900 sm:text-lg">
          {type === "month" ? <MonthYearPicker /> : <DisplayDate type={type} />}
        </h2>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={14} className="text-slate-400 shrink-0" />
            <span className="hidden sm:inline text-slate-500">
              Appointments
            </span>
            <span className="font-semibold text-slate-900">
              {appointmentCount}
            </span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-1.5">
            <DollarSign size={14} className="text-slate-400 shrink-0" />
            <span className="hidden sm:inline text-slate-500">
              Est. Revenue
            </span>
            <span className="font-semibold text-slate-900">
              $
              {estRevenue.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-1.5">
            <ClipboardList size={14} className="text-slate-400 shrink-0" />
            <span className="hidden sm:inline text-slate-500">Pending</span>
            <span className="font-semibold text-slate-900">{taskCount}</span>
          </div>
        </div>
      </div>

      {/* ── Row 3: Search on mobile ────────────────────── */}
      <div className="md:hidden px-3 pb-3 sm:px-4">
        <CalendarSearch type={type} />
      </div>
    </div>
  );
}
